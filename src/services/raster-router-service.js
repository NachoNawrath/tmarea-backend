'use strict';
/**
 * Router raster nacional (TMAREA_SPEC_Router_Raster_v1.md §7) — MOTOR ÚNICO.
 *
 * Fase 2: SIN capa KML (kml_bit siempre 0 en los datos de Fase 1, LUT
 * uniforme) y SIN waypoints forzados. Los 6 KML de "decision topologica"
 * de §7.6 son hipotesis: el router se construye libre y se verifica caso
 * por caso si el A* elige la via correcta por costo de resguardo.
 *
 * COBERTURA MULTI-TILE (cobertura costa completa de Chile):
 *   Los tiles cubren bandas de latitud y se cargan on-demand (getTile). El
 *   router selecciona automaticamente el tile segun las coordenadas de
 *   origen/destino (selectTile). Si origen y destino caen en tiles distintos,
 *   la ruta se ENCADENA: se trocea en tramos banda-a-banda con puntos de
 *   traspaso ("handoff") sobre la costura compartida y se corre el A* en cada
 *   tile por separado, concatenando el resultado.
 *
 *   Los 5 tiles de costa (NORTE, CENTRO, SUR, AUSTRAL_N, AUSTRAL_S) estan
 *   construidos y cubren de Arica a Punta Arenas. Una ruta que entrara en un
 *   tile aun no generado devuelve un error explicito nombrando el tile faltante
 *   (nunca un crash). Ver docs/RUNBOOK_tiles_costa_completa.md para generarlos.
 */
const proj4 = require('proj4');

const { loadTile, TILES_DIR } = require('./raster/tile-loader');
const { buildCostLUT, buildCoarseCostLUT } = require('./raster/cost-lut');
const { astarBBox } = require('./raster/astar-bbox');
const { dilatar, bboxANivelFino, corridorABitmap, makeCorridorPredicate, RADIOS_DILATACION_M } = require('./raster/multi-level');
const { snapToNavigable } = require('./raster/snap');
const { stringPull } = require('./raster/string-pull');
const { advertenciasCotejoVertical } = require('./raster/cotejo-vertical');
const { advertenciasPeligrosPorCanal } = require('./raster/peligros-canal');
const { MAX_EXPANSIONES_ASTAR } = require('../config/perfiles-costo');

const EARTH_RADIUS_NM = 3440.065;
const FALLBACK_EPSILON = 1.5; // spec §7.2 v1.5: weighted epsilon del fallback sin restriccion

// ---- registry de tiles (cobertura costa completa) -------------------------
//
// Bandas de latitud de norte a sur. lonW/lonE acotan a la costa de cada zona.
// Estos bbox son los EXTENTS REALES de cada tile, derivados proyectando las
// esquinas del raster (origin_x/y, res_m, cols, rows del .meta.json) de tmerc
// (crs_proj4) a EPSG:4326. Los tiles reales se solapan en latitud en los
// bordes (0.075°–0.24° entre vecinos) para que el punto de traspaso caiga
// sobre agua cubierta por AMBOS tiles adyacentes (seamLat toma el midpoint del
// solape). Los 5 tiles de costa de Chile estan construidos. Al regenerar un
// tile, recomputar su entrada desde el .meta con tools (ver runbook).
const TILE_REGISTRY = [
  { id: 'NORTE',     latN: -18.2821, latS: -30.1260, lonW: -71.9092, lonE: -69.1481 },
  { id: 'CENTRO',    latN: -29.8848, latS: -37.6173, lonW: -74.1879, lonE: -70.7962 },
  { id: 'SUR',       latN: -37.3796, latS: -39.6207, lonW: -74.2682, lonE: -72.2909 },
  { id: 'AUSTRAL_N', latN: -39.4442, latS: -47.0570, lonW: -76.0714, lonE: -71.8868 },
  { id: 'AUSTRAL_S', latN: -46.7822, latS: -56.6093, lonW: -77.5689, lonE: -65.5709 },
];

// Cache de tiles cargados (lazy). Un tile pesa 100+MB en RAM; solo se cargan
// los que la operacion realmente toca.
const TILES = new Map();

function getTile(tileId) {
  if (TILES.has(tileId)) return TILES.get(tileId);
  const tile = loadTile(tileId); // lanza si faltan los binarios del tile
  TILES.set(tileId, tile);
  return tile;
}

function warmup(tileId = 'AUSTRAL_N') {
  const t0 = Date.now();
  const tile = getTile(tileId);
  return { tileId, ms: Date.now() - t0, cols: tile.meta.cols, rows: tile.meta.rows };
}

// ---- seleccion de tile por coordenada -------------------------------------

/** Entrada del registry cuyo bbox contiene (lon,lat). En una costura entre
 *  bandas devuelve la mas interior en latitud (mayor margen al borde). */
function selectTile(lon, lat) {
  const candidatos = TILE_REGISTRY.filter(
    (t) => lat <= t.latN && lat >= t.latS && lon >= t.lonW && lon <= t.lonE
  );
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];
  // Empate (punto sobre una costura): el de mayor distancia al borde de banda.
  return candidatos.reduce((mejor, t) => {
    const margen = Math.min(t.latN - lat, lat - t.latS);
    const margenMejor = Math.min(mejor.latN - lat, lat - mejor.latS);
    return margen > margenMejor ? t : mejor;
  });
}

/** Secuencia de tiles del registry entre dos tiles (inclusive), en orden de
 *  viaje. El registry va norte->sur; se recorre por indices adyacentes. */
function orderedTilesBetween(tileA, tileB) {
  const iA = TILE_REGISTRY.indexOf(tileA);
  const iB = TILE_REGISTRY.indexOf(tileB);
  const paso = iA <= iB ? 1 : -1;
  const seq = [];
  for (let i = iA; paso > 0 ? i <= iB : i >= iB; i += paso) seq.push(TILE_REGISTRY[i]);
  return seq;
}

/** Latitud de la costura (nominal) entre dos bandas adyacentes del registry. */
function seamLat(a, b) {
  // a y b comparten un borde; el borde nominal es latS del mas al norte
  // (== latN del mas al sur si son contiguos).
  const norte = a.latN >= b.latN ? a : b;
  const sur = norte === a ? b : a;
  return (norte.latS + sur.latN) / 2;
}

/** Lon sobre la recta origen->destino a una latitud dada (interp lineal). */
function lonAtLat(origen, destino, lat) {
  const denom = destino.lat - origen.lat;
  if (Math.abs(denom) < 1e-9) return (origen.lon + destino.lon) / 2;
  const t = (lat - origen.lat) / denom;
  return origen.lon + t * (destino.lon - origen.lon);
}

/** ¿La celda (lon,lat) de este tile es agua navegable con el MISMO criterio que
 *  el snap (cost-lut.js / snap.js), incluida la relajacion del bit 15 (KML)?
 *  Se usa para posar el punto de traspaso sobre agua real. */
function celdaNavegable(tile, lon, lat, dMinM) {
  const { rows, cols, unit_m } = tile.meta;
  const { fila, col } = lonLatToRowCol(tile, lon, lat);
  if (fila < 0 || fila >= rows || col < 0 || col >= cols) return false;
  const raw = tile.packed[fila * cols + col];
  const confianza = (raw >> 13) & 0b11;
  if (confianza === 0) return false;
  const kml = (raw >> 15) & 0b1;
  const d = (raw & 0x1fff) * unit_m;
  const dMinEfectivo = kml ? Math.min(dMinM, 50) : dMinM;
  return d >= dMinEfectivo;
}

/** Longitud del punto de traspaso sobre la costura entre dos tiles adyacentes.
 *
 *  La lon "nominal" es la de la recta origen->destino a la latitud de la
 *  costura (`lonRecta`), pero esa recta cruza TIERRA donde la costa se curva
 *  (p.ej. entre Valparaiso y Puerto Montt cae ~75 km tierra adentro). Un
 *  traspaso ahi es irruteable. Esto reancla la lon al agua navegable presente
 *  en AMBOS tiles adyacentes (para que el tramo norte pueda cerrar ahi su
 *  destino y el tramo sur arrancar su origen) mas cercana a `lonRecta`,
 *  restringida al solape de longitudes de los dos tiles. Devuelve null si no
 *  hay agua comun en la costura (ruta imposible por esa via -> error explicito,
 *  nunca un tramo colgando en tierra). */
function seamHandoffLon(regN, regS, tileN, tileS, seamLat_, lonRecta, dMinM) {
  const lonW = Math.max(regN.lonW, regS.lonW);
  const lonE = Math.min(regN.lonE, regS.lonE);
  if (lonW > lonE) return null; // los tiles no comparten longitudes
  const nav = (lon) =>
    celdaNavegable(tileN, lon, seamLat_, dMinM) && celdaNavegable(tileS, lon, seamLat_, dMinM);
  return scanNavLon(nav, lonW, lonE, lonRecta);
}

/** Barrido simetrico de longitudes desde `lonRecta` (clampeada a [lonW,lonE])
 *  buscando la primera que satisface `nav`; ~50 m/paso. Devuelve esa lon o null
 *  si no hay agua navegable en todo el rango. Compartido por el traspaso de
 *  costura (nav en dos tiles) y la sub-segmentacion intra-tile (nav en uno). */
function scanNavLon(nav, lonW, lonE, lonRecta) {
  const centro = Math.min(Math.max(lonRecta, lonW), lonE);
  if (nav(centro)) return centro;
  const paso = 0.0005;
  const maxPasos = Math.ceil((lonE - lonW) / paso);
  for (let k = 1; k <= maxPasos; k++) {
    const dl = k * paso;
    const oeste = centro - dl;
    if (oeste >= lonW && nav(oeste)) return oeste;
    const este = centro + dl;
    if (este <= lonE && nav(este)) return este;
  }
  return null;
}

/** Longitud de agua navegable en UN tile a la latitud `lat`, la mas cercana a
 *  `lonRecta` (la recta origen->destino a esa latitud). Usada para posar los
 *  waypoints intermedios de la sub-segmentacion de legs largos sobre agua. */
function navLonAtLat(tile, reg, lat, lonRecta, dMinM) {
  return scanNavLon((lon) => celdaNavegable(tile, lon, lat, dMinM), reg.lonW, reg.lonE, lonRecta);
}

// ---- sub-segmentacion de legs largos intra-tile (convergencia A*) ----------
//
// El A* jerarquico (grueso->medio->fino) restringe el fino a un corredor
// dilatado del camino medio. En legs muy largos (o de canales angostos y
// sinuosos) ese corredor puede no tener un camino fino conectado con ninguno
// de los radios 3/6/12 km, y cae al fino SIN restriccion sobre el tile entero
// -> agota el tope de expansiones (ruta_no_convergente). Trocear el leg en
// sub-tramos mas cortos mantiene cada corredor jerarquico viable. Misma idea
// que el encadenado entre tiles, pero DENTRO de un tile: los waypoints
// intermedios se posan sobre agua navegable (navLonAtLat) cerca de la recta.
// Umbrales calibrados con dato (ver pruebas de convergencia, 2026-07-31): con
// 400 mn / 5° los sub-tramos de los canales patagonicos (Golfo de Penas, senos
// de Aysen) todavia colapsaban el corredor jerarquico. 150 mn / 2° mantiene
// cada sub-tramo -- costa abierta del norte incluida -- dentro de lo que el A*
// jerarquico resuelve sin caer al fallback global.
const MAX_LEG_NM = 150;       // umbral de distancia por sub-tramo
const MAX_LEG_LAT_DEG = 2;    // umbral de span de latitud por sub-tramo

/** Devuelve la secuencia de puntos [pA, ...waypoints, pB] que trocea el leg
 *  pA->pB (ambos en `tile`) en sub-tramos bajo los umbrales. Si el leg ya es
 *  corto, devuelve [pA, pB] (comportamiento previo intacto). */
function subsegmentarLeg(tile, reg, pA, pB, dMinM) {
  const distNM = haversineNM(pA.lon, pA.lat, pB.lon, pB.lat);
  const latSpan = Math.abs(pB.lat - pA.lat);
  const nSeg = Math.max(1, Math.ceil(distNM / MAX_LEG_NM), Math.ceil(latSpan / MAX_LEG_LAT_DEG));
  if (nSeg === 1) return [pA, pB];
  const puntos = [pA];
  // Continuidad costera: cada waypoint se ancla a la lon del waypoint ANTERIOR,
  // no a la recta origen->destino. En la Patagonia esa recta cruza el continente
  // al este de los canales, y "el agua mas cercana a la recta" salta entre
  // cuerpos de agua desconectados (p.ej. de un canal a otro separados por
  // Chiloe) -> sub-tramos irruteables. Anclando al punto previo, los waypoints
  // siguen el mismo corredor navegable de una latitud a la siguiente.
  let anchorLon = pA.lon;
  for (let k = 1; k < nSeg; k++) {
    const lat = pA.lat + (pB.lat - pA.lat) * (k / nSeg);
    const lon = navLonAtLat(tile, reg, lat, anchorLon, dMinM);
    // Si a esa latitud no hay agua en el tile (raro en la costa), se omite el
    // waypoint y el sub-tramo contiguo queda algo mas largo -- nunca partimos
    // en un punto irruteable.
    if (lon != null) {
      puntos.push({ lat, lon });
      anchorLon = lon;
    }
  }
  puntos.push(pB);
  return puntos;
}

// ---- proyeccion / indexado (por tile) -------------------------------------

function lonLatToRowCol(tile, lon, lat) {
  const [x, y] = proj4('EPSG:4326', tile.meta.crs_proj4, [lon, lat]);
  const col = Math.floor((x - tile.meta.origin_x) / tile.meta.res_m);
  const fila = Math.floor((tile.meta.origin_y - y) / tile.meta.res_m);
  return { fila, col };
}

function idxToLonLat(tile, idx) {
  const cols = tile.meta.cols;
  const fila = (idx / cols) | 0;
  const col = idx % cols;
  const x = tile.meta.origin_x + (col + 0.5) * tile.meta.res_m;
  const y = tile.meta.origin_y - (fila + 0.5) * tile.meta.res_m;
  const [lon, lat] = proj4(tile.meta.crs_proj4, 'EPSG:4326', [x, y]);
  return [lon, lat];
}

function cellConfianza(tile, idx) {
  return (tile.packed[idx] >> 13) & 0b11;
}
function cellDistM(tile, idx) {
  return (tile.packed[idx] & 0x1fff) * tile.meta.unit_m;
}

// ---- geodesia local (evita depender de exports internos de otros servicios)

function toRad(d) {
  return (d * Math.PI) / 180;
}
function toDeg(r) {
  return (r * 180) / Math.PI;
}
function haversineNM(lon1, lat1, lon2, lat2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function rumboVerdadero(lon1, lat1, lon2, lat2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ---- A* jerarquico de 3 niveles (spec §7.2 v1.5), por tile ----------------
//
// grueso (factor 32, ~1600m) -> medio (factor 8, ~400m) -> fino (factor 1,
// 50m). Cada transicion de nivel prueba dilatacion iterativa 3/6/12 km
// antes de darse por vencida; solo si TODAS fallan se cae al fino sin
// restriccion (bbox = tile completo) con epsilon=1.5 y tope duro de
// expansiones -- nunca un OOM, siempre un error explicito.

function idxToRowCol(idx, cols) {
  return { row: (idx / cols) | 0, col: idx % cols };
}
function fineIdxToNivelIdx(fineIdx, cols, factor, nivelCols) {
  const { row, col } = idxToRowCol(fineIdx, cols);
  return ((row / factor) | 0) * nivelCols + ((col / factor) | 0);
}

function runHierarchicalAstar(tile, startIdx, goalIdx, perfilCosto) {
  const meta = tile.meta;
  const fineLUT = buildCostLUT(perfilCosto);
  const medioLUT = buildCoarseCostLUT(perfilCosto); // solo distancia, misma semantica en medio y grueso
  const gruesoLUT = medioLUT;

  const gruesoResM = meta.res_m * tile.gruesoFactor;
  const medioResM = meta.res_m * tile.medioFactor;
  const factorGruesoAMedio = tile.gruesoFactor / tile.medioFactor;

  // Nivel grueso: A* sin restriccion sobre el grid completo (~104K celdas, instantaneo).
  const gruesoStart = fineIdxToNivelIdx(startIdx, meta.cols, tile.gruesoFactor, tile.gruesoCols);
  const gruesoGoal = fineIdxToNivelIdx(goalIdx, meta.cols, tile.gruesoFactor, tile.gruesoCols);
  const gruesoResult = astarBBox({
    cols: tile.gruesoCols,
    cellValues: tile.grueso,
    costLUT: gruesoLUT,
    resM: gruesoResM,
    startIdxGlobal: gruesoStart,
    goalIdxGlobal: gruesoGoal,
    bbox: { rowMin: 0, rowMax: tile.gruesoRows, colMin: 0, colMax: tile.gruesoCols },
  });

  let medioPath = null;
  if (gruesoResult.path) {
    for (const radioM of RADIOS_DILATACION_M) {
      const radioCeldas = Math.ceil(radioM / gruesoResM);
      const corridorGrueso = dilatar(gruesoResult.path, tile.gruesoRows, tile.gruesoCols, radioCeldas);
      const bboxMedio = bboxANivelFino(corridorGrueso, tile.gruesoCols, factorGruesoAMedio, tile.medioRows, tile.medioCols);
      const bitmapGrueso = corridorABitmap(corridorGrueso, tile.gruesoRows * tile.gruesoCols);
      const isAllowedMedio = makeCorridorPredicate(bitmapGrueso, tile.medioCols, factorGruesoAMedio, tile.gruesoCols);

      const medioStart = fineIdxToNivelIdx(startIdx, meta.cols, tile.medioFactor, tile.medioCols);
      const medioGoal = fineIdxToNivelIdx(goalIdx, meta.cols, tile.medioFactor, tile.medioCols);
      const res = astarBBox({
        cols: tile.medioCols,
        cellValues: tile.medio,
        costLUT: medioLUT,
        resM: medioResM,
        startIdxGlobal: medioStart,
        goalIdxGlobal: medioGoal,
        bbox: bboxMedio,
        isAllowed: isAllowedMedio,
      });
      if (res.path) {
        medioPath = res.path;
        break;
      }
    }
  }

  let finoResult = null;
  if (medioPath) {
    for (const radioM of RADIOS_DILATACION_M) {
      const radioCeldas = Math.ceil(radioM / medioResM);
      const corridorMedio = dilatar(medioPath, tile.medioRows, tile.medioCols, radioCeldas);
      const bboxFino = bboxANivelFino(corridorMedio, tile.medioCols, tile.medioFactor, meta.rows, meta.cols);
      const bitmapMedio = corridorABitmap(corridorMedio, tile.medioRows * tile.medioCols);
      const isAllowedFino = makeCorridorPredicate(bitmapMedio, meta.cols, tile.medioFactor, tile.medioCols);

      const res = astarBBox({
        cols: meta.cols,
        cellValues: tile.packed,
        costLUT: fineLUT,
        resM: meta.res_m,
        startIdxGlobal: startIdx,
        goalIdxGlobal: goalIdx,
        bbox: bboxFino,
        isAllowed: isAllowedFino,
      });
      if (res.path) {
        finoResult = { ...res, restringido: true };
        break;
      }
      // spec §7.2 v1.9: nunca saltar la dilatacion iterativa. Dilatar el
      // corredor no solo ensancha un paso -- puede incorporar una ruta
      // alternativa completa que el corredor previo no contenia. Se agotan
      // las tres iteraciones sea cual sea el motivo del fallo del fino.
    }
  }
  if (finoResult) return finoResult;

  // Ningun radio conecto: A* fino SIN restriccion, epsilon=1.5, tope duro
  // de expansiones. Un OOM nunca es un modo de falla aceptable -- si se
  // supera el tope, se devuelve el error explicito, no se sigue insistiendo.
  const fallback = astarBBox({
    cols: meta.cols,
    cellValues: tile.packed,
    costLUT: fineLUT,
    resM: meta.res_m,
    startIdxGlobal: startIdx,
    goalIdxGlobal: goalIdx,
    bbox: { rowMin: 0, rowMax: meta.rows, colMin: 0, colMax: meta.cols },
    epsilon: FALLBACK_EPSILON,
    maxExpansions: MAX_EXPANSIONES_ASTAR,
  });
  return { ...fallback, restringido: false };
}

// ---- tramos / respuesta (spec §7.5) ---------------------------------------

const NIVEL_NOMBRE = { 1: 'ROJO', 2: 'AMARILLO', 3: 'VERDE' };
const NOTA_ROJO = 'Sin datos de profundidad en este tramo. Navegue con sonda.';

/** Corta la secuencia de waypoints en tramos donde cambia confianza_batimetrica. */
function cortarTramos(tile, waypointIdxs) {
  const tramos = [];
  let actual = null;

  for (const idx of waypointIdxs) {
    const nivel = NIVEL_NOMBRE[cellConfianza(tile, idx)] || 'ROJO';
    if (!actual || actual.nivel !== nivel) {
      if (actual) tramos.push(actual);
      actual = { nivel, idxs: [idx] };
    } else {
      actual.idxs.push(idx);
    }
  }
  if (actual) tramos.push(actual);

  // Cada tramo comparte el punto de quiebre con el siguiente (para que la
  // polilinea quede continua, sin huecos entre tramos consecutivos).
  for (let i = 1; i < tramos.length; i++) {
    tramos[i].idxs.unshift(tramos[i - 1].idxs[tramos[i - 1].idxs.length - 1]);
  }
  return tramos;
}

function construirTramoRespuesta(tile, tramoRaw, tipo) {
  const coords = tramoRaw.idxs.map((idx) => idxToLonLat(tile, idx));
  let distanciaMn = 0;
  for (let i = 1; i < coords.length; i++) {
    distanciaMn += haversineNM(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
  }
  const [lon0, lat0] = coords[0];
  const [lon1, lat1] = coords[coords.length - 1];
  const rumbo = coords.length > 1 ? rumboVerdadero(lon0, lat0, lon1, lat1) : 0;

  const tramo = {
    tipo,
    confianza_batimetrica: tramoRaw.nivel,
    coords,
    rumbo_verdadero: Math.round(rumbo * 10) / 10,
    distancia_mn: Math.round(distanciaMn * 100) / 100,
  };
  if (tramoRaw.nivel === 'ROJO') tramo.nota = NOTA_ROJO;
  return tramo;
}

// ---- ruta dentro de UN tile -----------------------------------------------
//
// Devuelve { ok, error?, tramos?, advertencias, agg? }. `agg` son los
// acumuladores crudos de celdas (para combinar entre tiles al encadenar);
// nunca sale al cliente en el camino de un solo tile.

function _routeInTile(tile, perfilCosto, origen, destino) {
  const meta = tile.meta;
  const dMinM = perfilCosto.costo.dMinM;

  const origenRC = lonLatToRowCol(tile, origen.lon, origen.lat);
  const destinoRC = lonLatToRowCol(tile, destino.lon, destino.lat);

  if (
    origenRC.fila < 0 || origenRC.fila >= meta.rows || origenRC.col < 0 || origenRC.col >= meta.cols ||
    destinoRC.fila < 0 || destinoRC.fila >= meta.rows || destinoRC.col < 0 || destinoRC.col >= meta.cols
  ) {
    return { ok: false, error: `Origen o destino fuera del tile ${meta.tile_id}` };
  }

  const snapOrigen = snapToNavigable(origenRC.fila, origenRC.col, meta, tile.packed, perfilCosto);
  const snapDestino = snapToNavigable(destinoRC.fila, destinoRC.col, meta, tile.packed, perfilCosto);
  if (!snapOrigen || !snapDestino) {
    return { ok: false, error: `No se encontró agua navegable cerca de origen o destino en ${meta.tile_id}` };
  }

  const resultado = runHierarchicalAstar(tile, snapOrigen.idx, snapDestino.idx, perfilCosto);
  if (!resultado.path) {
    return { ok: false, error: 'No se encontró ruta navegable entre origen y destino', motivo: resultado.motivo || 'sin_camino' };
  }

  const waypointIdxs = stringPull(resultado.path, meta, tile.packed, dMinM);
  const tramosRaw = cortarTramos(tile, waypointIdxs);
  const tramos = tramosRaw.map((t) => construirTramoRespuesta(tile, t, 'ruta'));

  // Fase 3 redefinida (docs/handoff-fase2.md): post-proceso sobre la ruta ya
  // trazada, no toca el raster ni el A*. Cotejo vertical y peligros por canal
  // como advertencias, limitados a los canales con geometría real verificable.
  const waypointsLonLat = waypointIdxs.map((idx) => idxToLonLat(tile, idx));
  const advertencias = [];
  advertencias.push(...advertenciasCotejoVertical(waypointsLonLat, perfilCosto.calado_m));
  advertencias.push(...advertenciasPeligrosPorCanal(waypointsLonLat));

  if (snapOrigen.distSnapM > 0) {
    const [olon, olat] = [origen.lon, origen.lat];
    const [slon, slat] = idxToLonLat(tile, snapOrigen.idx);
    tramos.unshift({
      tipo: 'aproximacion_final',
      confianza_batimetrica: NIVEL_NOMBRE[cellConfianza(tile, snapOrigen.idx)] || 'ROJO',
      coords: [[olon, olat], [slon, slat]],
      rumbo_verdadero: Math.round(rumboVerdadero(olon, olat, slon, slat) * 10) / 10,
      distancia_mn: Math.round(haversineNM(olon, olat, slon, slat) * 100) / 100,
    });
  }
  if (snapDestino.distSnapM > 0) {
    const [dlon, dlat] = [destino.lon, destino.lat];
    const [slon, slat] = idxToLonLat(tile, snapDestino.idx);
    tramos.push({
      tipo: 'aproximacion_final',
      confianza_batimetrica: NIVEL_NOMBRE[cellConfianza(tile, snapDestino.idx)] || 'ROJO',
      coords: [[slon, slat], [dlon, dlat]],
      rumbo_verdadero: Math.round(rumboVerdadero(slon, slat, dlon, dlat) * 10) / 10,
      distancia_mn: Math.round(haversineNM(slon, slat, dlon, dlat) * 100) / 100,
    });
  }

  // Acumuladores crudos de celdas del camino completo (para métricas).
  let maxDistCostaM = 0;
  let celdasEnResguardo = 0;
  const conteoNivel = { ROJO: 0, AMARILLO: 0, VERDE: 0 };
  for (const idx of resultado.path) {
    const d = cellDistM(tile, idx);
    if (d > maxDistCostaM) maxDistCostaM = d;
    if (d >= perfilCosto.costo.bandaMinM && d <= perfilCosto.costo.bandaMaxM) celdasEnResguardo++;
    conteoNivel[NIVEL_NOMBRE[cellConfianza(tile, idx)] || 'ROJO']++;
  }

  if (waypointIdxs.length === resultado.path.length && resultado.path.length > 500) {
    advertencias.push('El string-pulling no pudo simplificar la ruta (línea de vista obstruida en todo el trayecto).');
  }

  return {
    ok: true,
    tramos,
    advertencias,
    agg: { conteoNivel, celdasEnResguardo, totalCeldas: resultado.path.length, maxDistCostaM },
    _debug: {
      tile: meta.tile_id,
      restringido: resultado.restringido,
      expansions: resultado.expansions,
      celdasCaminoCompleto: resultado.path.length,
      celdasWaypoints: waypointIdxs.length,
      snapOrigenM: snapOrigen.distSnapM,
      snapDestinoM: snapDestino.distSnapM,
    },
  };
}

// ---- respuesta pública -----------------------------------------------------

const ADVERTENCIAS_BASE = [
  'Corredor de Referencia Tmarea — línea segmentada informativa.',
  'No reemplaza carta náutica SHOA. El patrón mantiene responsabilidad absoluta de la derrota.',
];

function respuestaError(error, extra = {}) {
  return { ok: false, motor: 'raster-v1', advertencias: ADVERTENCIAS_BASE, error, ...extra };
}

function metricasDesdeAgg(tramos, aggs) {
  const total = aggs.reduce((s, a) => s + a.totalCeldas, 0) || 1;
  const enResguardo = aggs.reduce((s, a) => s + a.celdasEnResguardo, 0);
  const maxDistCostaM = aggs.reduce((m, a) => Math.max(m, a.maxDistCostaM), 0);
  const conteo = aggs.reduce(
    (c, a) => ({ ROJO: c.ROJO + a.conteoNivel.ROJO, AMARILLO: c.AMARILLO + a.conteoNivel.AMARILLO, VERDE: c.VERDE + a.conteoNivel.VERDE }),
    { ROJO: 0, AMARILLO: 0, VERDE: 0 }
  );
  const distanciaMn = tramos.reduce((s, t) => s + t.distancia_mn, 0);
  return {
    distancia_mn: Math.round(distanciaMn * 100) / 100,
    max_dist_costa_mn: Math.round((maxDistCostaM / 1852) * 100) / 100,
    pct_en_resguardo: Math.round((enResguardo / total) * 1000) / 1000,
    pct_batimetria: {
      verde: Math.round((conteo.VERDE / total) * 1000) / 1000,
      amarillo: Math.round((conteo.AMARILLO / total) * 1000) / 1000,
      rojo: Math.round((conteo.ROJO / total) * 1000) / 1000,
    },
  };
}

/**
 * @param {{costo: object, limites?: object}} perfilCosto - ver src/config/perfiles-costo.js
 * @param {{lat:number, lon:number}} origen
 * @param {{lat:number, lon:number}} destino
 */
function calcularRuta(perfilCosto, origen, destino) {
  const tileO = selectTile(origen.lon, origen.lat);
  const tileD = selectTile(destino.lon, destino.lat);

  if (!tileO || !tileD) {
    return respuestaError('Origen o destino fuera de la cobertura de tiles de Chile');
  }

  // Secuencia de tiles a atravesar (uno solo si origen y destino coinciden).
  const seq = orderedTilesBetween(tileO, tileD);

  // Pre-chequeo: todos los tiles de la secuencia deben estar construidos. Si
  // la ruta cruza a un tile aún no generado, se corta acá con un error
  // explícito (nunca un crash a mitad de encadenado).
  const tilesCargados = [];
  for (const s of seq) {
    try {
      tilesCargados.push(getTile(s.id));
    } catch (err) {
      return respuestaError(
        `La ruta cruza el tile "${s.id}" que aún no está generado. Ver docs/RUNBOOK_tiles_costa_completa.md.`,
        { tile_faltante: s.id, tiles_ruta: seq.map((x) => x.id) }
      );
    }
  }

  // Pasada secuencial norte->sur con un ANCHOR de longitud que arrastra la
  // continuidad costera por toda la ruta: origen -> costuras -> sub-tramos ->
  // destino. Cada punto de traspaso (costura entre tiles) y cada waypoint de
  // sub-segmentacion se posan sobre el agua navegable mas cercana al anchor del
  // punto previo, NO a la recta origen->destino (que en la Patagonia cruza el
  // continente al este de los canales). Asi la polilinea sigue un corredor
  // navegable conexo en vez de saltar entre cuerpos de agua desconectados.
  const dMinM = perfilCosto.costo.dMinM;
  const tramos = [];
  const aggs = [];
  const advertencias = [...ADVERTENCIAS_BASE];
  const debugLegs = [];
  let anchorLon = origen.lon;
  let legStart = origen;

  for (let i = 0; i < seq.length; i++) {
    // Fin del leg: costura hacia el siguiente tile (anclada a la continuidad) o
    // el destino final en el ultimo tile.
    let legEnd;
    if (i < seq.length - 1) {
      const lat = seamLat(seq[i], seq[i + 1]);
      const lon = seamHandoffLon(
        seq[i], seq[i + 1], tilesCargados[i], tilesCargados[i + 1], lat, anchorLon, dMinM
      );
      if (lon == null) {
        return respuestaError(
          `No se encontró agua navegable común en la costura entre "${seq[i].id}" y "${seq[i + 1].id}".`,
          { tiles_ruta: seq.map((x) => x.id) }
        );
      }
      legEnd = { lat, lon };
    } else {
      legEnd = destino;
    }

    // Cada leg intra-tile se trocea en sub-tramos bajo los umbrales de longitud
    // para que el A* jerarquico converja (ver subsegmentarLeg). Un leg corto
    // devuelve [pA, pB] -> un solo sub-tramo, comportamiento previo intacto.
    const subPuntos = subsegmentarLeg(tilesCargados[i], seq[i], legStart, legEnd, dMinM);
    for (let j = 0; j < subPuntos.length - 1; j++) {
      const leg = _routeInTile(tilesCargados[i], perfilCosto, subPuntos[j], subPuntos[j + 1]);
      if (!leg.ok) {
        return respuestaError(leg.error, {
          motivo: leg.motivo,
          tile: seq[i].id,
          tramo_ruta: seq.length > 1 ? `${i + 1}/${seq.length}` : undefined,
          sub_tramo: subPuntos.length > 2 ? `${j + 1}/${subPuntos.length - 1}` : undefined,
        });
      }
      tramos.push(...leg.tramos);
      aggs.push(leg.agg);
      for (const a of leg.advertencias) if (!advertencias.includes(a)) advertencias.push(a);
      debugLegs.push(leg._debug);
    }
    anchorLon = legEnd.lon;
    legStart = legEnd;
  }

  const metricas = metricasDesdeAgg(tramos, aggs);

  return {
    ok: true,
    motor: 'raster-v1',
    tiles_ruta: seq.map((s) => s.id),
    tramos,
    ...metricas,
    advertencias,
    _debug: debugLegs.length === 1 ? debugLegs[0] : { legs: debugLegs },
  };
}

module.exports = {
  warmup,
  calcularRuta,
  selectTile,
  TILE_REGISTRY,
  TILES_DIR,
};
