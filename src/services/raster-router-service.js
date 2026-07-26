'use strict';
/**
 * Router raster nacional (TMAREA_SPEC_Router_Raster_v1.md §7).
 *
 * Fase 2: SIN capa KML (kml_bit siempre 0 en los datos de Fase 1, LUT
 * uniforme) y SIN waypoints forzados. Los 6 KML de "decision topologica"
 * de §7.6 son hipotesis: el router se construye libre y se verifica caso
 * por caso si el A* elige la via correcta por costo de resguardo.
 */
const proj4 = require('proj4');

const { loadTile } = require('./raster/tile-loader');
const { buildCostLUT, buildCoarseCostLUT } = require('./raster/cost-lut');
const { astarBBox } = require('./raster/astar-bbox');
const { dilatar, bboxANivelFino, corridorABitmap, makeCorridorPredicate, RADIOS_DILATACION_M } = require('./raster/multi-level');
const { snapToNavigable } = require('./raster/snap');
const { stringPull } = require('./raster/string-pull');
const { MAX_EXPANSIONES_ASTAR } = require('../config/perfiles-costo');

const EARTH_RADIUS_NM = 3440.065;
const FALLBACK_EPSILON = 1.5; // spec §7.2 v1.5: weighted epsilon del fallback sin restriccion

let TILE = null;

function warmup(tileId = 'AUSTRAL_N') {
  const t0 = Date.now();
  TILE = loadTile(tileId);
  return { tileId, ms: Date.now() - t0, cols: TILE.meta.cols, rows: TILE.meta.rows };
}

function assertWarm() {
  if (!TILE) throw new Error('raster-router-service: llamar warmup() antes de calcularRuta()');
}

// ---- proyeccion / indexado ------------------------------------------------

function lonLatToRowCol(lon, lat) {
  const [x, y] = proj4('EPSG:4326', TILE.meta.crs_proj4, [lon, lat]);
  const col = Math.floor((x - TILE.meta.origin_x) / TILE.meta.res_m);
  const fila = Math.floor((TILE.meta.origin_y - y) / TILE.meta.res_m);
  return { fila, col };
}

function idxToLonLat(idx) {
  const cols = TILE.meta.cols;
  const fila = (idx / cols) | 0;
  const col = idx % cols;
  const x = TILE.meta.origin_x + (col + 0.5) * TILE.meta.res_m;
  const y = TILE.meta.origin_y - (fila + 0.5) * TILE.meta.res_m;
  const [lon, lat] = proj4(TILE.meta.crs_proj4, 'EPSG:4326', [x, y]);
  return [lon, lat];
}

function cellConfianza(idx) {
  return (TILE.packed[idx] >> 13) & 0b11;
}
function cellDistM(idx) {
  return (TILE.packed[idx] & 0x1fff) * TILE.meta.unit_m;
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

// ---- A* jerarquico de 3 niveles (spec §7.2 v1.5) --------------------------
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

function runHierarchicalAstar(startIdx, goalIdx, perfilCosto) {
  const meta = TILE.meta;
  const fineLUT = buildCostLUT(perfilCosto);
  const medioLUT = buildCoarseCostLUT(perfilCosto); // solo distancia, misma semantica en medio y grueso
  const gruesoLUT = medioLUT;

  const gruesoResM = meta.res_m * TILE.gruesoFactor;
  const medioResM = meta.res_m * TILE.medioFactor;
  const factorGruesoAMedio = TILE.gruesoFactor / TILE.medioFactor;

  // Nivel grueso: A* sin restriccion sobre el grid completo (~104K celdas, instantaneo).
  const gruesoStart = fineIdxToNivelIdx(startIdx, meta.cols, TILE.gruesoFactor, TILE.gruesoCols);
  const gruesoGoal = fineIdxToNivelIdx(goalIdx, meta.cols, TILE.gruesoFactor, TILE.gruesoCols);
  const gruesoResult = astarBBox({
    cols: TILE.gruesoCols,
    cellValues: TILE.grueso,
    costLUT: gruesoLUT,
    resM: gruesoResM,
    startIdxGlobal: gruesoStart,
    goalIdxGlobal: gruesoGoal,
    bbox: { rowMin: 0, rowMax: TILE.gruesoRows, colMin: 0, colMax: TILE.gruesoCols },
  });

  let medioPath = null;
  if (gruesoResult.path) {
    for (const radioM of RADIOS_DILATACION_M) {
      const radioCeldas = Math.ceil(radioM / gruesoResM);
      const corridorGrueso = dilatar(gruesoResult.path, TILE.gruesoRows, TILE.gruesoCols, radioCeldas);
      const bboxMedio = bboxANivelFino(corridorGrueso, TILE.gruesoCols, factorGruesoAMedio, TILE.medioRows, TILE.medioCols);
      const bitmapGrueso = corridorABitmap(corridorGrueso, TILE.gruesoRows * TILE.gruesoCols);
      const isAllowedMedio = makeCorridorPredicate(bitmapGrueso, TILE.medioCols, factorGruesoAMedio, TILE.gruesoCols);

      const medioStart = fineIdxToNivelIdx(startIdx, meta.cols, TILE.medioFactor, TILE.medioCols);
      const medioGoal = fineIdxToNivelIdx(goalIdx, meta.cols, TILE.medioFactor, TILE.medioCols);
      const res = astarBBox({
        cols: TILE.medioCols,
        cellValues: TILE.medio,
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
      const corridorMedio = dilatar(medioPath, TILE.medioRows, TILE.medioCols, radioCeldas);
      const bboxFino = bboxANivelFino(corridorMedio, TILE.medioCols, TILE.medioFactor, meta.rows, meta.cols);
      const bitmapMedio = corridorABitmap(corridorMedio, TILE.medioRows * TILE.medioCols);
      const isAllowedFino = makeCorridorPredicate(bitmapMedio, meta.cols, TILE.medioFactor, TILE.medioCols);

      const res = astarBBox({
        cols: meta.cols,
        cellValues: TILE.packed,
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
      // spec §7.2: si el fino falla por 'sin_camino' (agoto el corredor,
      // no el tope de expansiones), el paso no existe a esa resolucion --
      // dilatar el corredor medio no va a crear conectividad fina que no
      // esta ahi. Saltar directo al fallback en vez de gastar las
      // iteraciones restantes de la escalera.
      if (res.motivo === 'sin_camino') break;
    }
  }
  if (finoResult) return finoResult;

  // Ningun radio conecto: A* fino SIN restriccion, epsilon=1.5, tope duro
  // de expansiones. Un OOM nunca es un modo de falla aceptable -- si se
  // supera el tope, se devuelve el error explicito, no se sigue insistiendo.
  const fallback = astarBBox({
    cols: meta.cols,
    cellValues: TILE.packed,
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
function cortarTramos(waypointIdxs) {
  const tramos = [];
  let actual = null;

  for (const idx of waypointIdxs) {
    const nivel = NIVEL_NOMBRE[cellConfianza(idx)] || 'ROJO';
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

function construirTramoRespuesta(tramoRaw, tipo) {
  const coords = tramoRaw.idxs.map((idx) => idxToLonLat(idx));
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

/**
 * @param {{costo: object, limites?: object}} perfilCosto - ver src/config/perfiles-costo.js
 * @param {{lat:number, lon:number}} origen
 * @param {{lat:number, lon:number}} destino
 */
function calcularRuta(perfilCosto, origen, destino) {
  assertWarm();
  const meta = TILE.meta;
  const dMinM = perfilCosto.costo.dMinM;

  const advertencias = [
    'Corredor de Referencia Tmarea — línea segmentada informativa.',
    'No reemplaza carta náutica SHOA. El patrón mantiene responsabilidad absoluta de la derrota.',
  ];

  const origenRC = lonLatToRowCol(origen.lon, origen.lat);
  const destinoRC = lonLatToRowCol(destino.lon, destino.lat);

  if (
    origenRC.fila < 0 || origenRC.fila >= meta.rows || origenRC.col < 0 || origenRC.col >= meta.cols ||
    destinoRC.fila < 0 || destinoRC.fila >= meta.rows || destinoRC.col < 0 || destinoRC.col >= meta.cols
  ) {
    return { ok: false, motor: 'raster-v1', advertencias, error: 'Origen o destino fuera del tile cargado' };
  }

  const snapOrigen = snapToNavigable(origenRC.fila, origenRC.col, meta, TILE.packed, perfilCosto);
  const snapDestino = snapToNavigable(destinoRC.fila, destinoRC.col, meta, TILE.packed, perfilCosto);

  if (!snapOrigen || !snapDestino) {
    return { ok: false, motor: 'raster-v1', advertencias, error: 'No se encontró agua navegable cerca de origen o destino' };
  }

  const resultado = runHierarchicalAstar(snapOrigen.idx, snapDestino.idx, perfilCosto);
  if (!resultado.path) {
    // spec §7.2: un OOM nunca es un modo de falla aceptable -- si se supera
    // el tope de expansiones del fallback sin restriccion, se devuelve el
    // motivo explicito en vez de intentar de nuevo o colgar el proceso.
    return {
      ok: false,
      motor: 'raster-v1',
      advertencias,
      error: 'No se encontró ruta navegable entre origen y destino',
      motivo: resultado.motivo || 'sin_camino',
    };
  }

  const waypointIdxs = stringPull(resultado.path, meta, TILE.packed, dMinM);
  const tramosRaw = cortarTramos(waypointIdxs);
  const tramos = tramosRaw.map((t) => construirTramoRespuesta(t, 'ruta'));

  if (snapOrigen.distSnapM > 0) {
    const [olon, olat] = [origen.lon, origen.lat];
    const [slon, slat] = idxToLonLat(snapOrigen.idx);
    tramos.unshift({
      tipo: 'aproximacion_final',
      confianza_batimetrica: NIVEL_NOMBRE[cellConfianza(snapOrigen.idx)] || 'ROJO',
      coords: [[olon, olat], [slon, slat]],
      rumbo_verdadero: Math.round(rumboVerdadero(olon, olat, slon, slat) * 10) / 10,
      distancia_mn: Math.round(haversineNM(olon, olat, slon, slat) * 100) / 100,
    });
  }
  if (snapDestino.distSnapM > 0) {
    const [dlon, dlat] = [destino.lon, destino.lat];
    const [slon, slat] = idxToLonLat(snapDestino.idx);
    tramos.push({
      tipo: 'aproximacion_final',
      confianza_batimetrica: NIVEL_NOMBRE[cellConfianza(snapDestino.idx)] || 'ROJO',
      coords: [[slon, slat], [dlon, dlat]],
      rumbo_verdadero: Math.round(rumboVerdadero(slon, slat, dlon, dlat) * 10) / 10,
      distancia_mn: Math.round(haversineNM(slon, slat, dlon, dlat) * 100) / 100,
    });
  }

  const distanciaMn = tramos.reduce((s, t) => s + t.distancia_mn, 0);

  let maxDistCostaM = 0;
  let celdasEnResguardo = 0;
  const conteoNivel = { ROJO: 0, AMARILLO: 0, VERDE: 0 };
  for (const idx of resultado.path) {
    const d = cellDistM(idx);
    if (d > maxDistCostaM) maxDistCostaM = d;
    if (d >= perfilCosto.costo.bandaMinM && d <= perfilCosto.costo.bandaMaxM) celdasEnResguardo++;
    conteoNivel[NIVEL_NOMBRE[cellConfianza(idx)] || 'ROJO']++;
  }
  const totalCeldas = resultado.path.length || 1;

  if (waypointIdxs.length === resultado.path.length && resultado.path.length > 500) {
    advertencias.push('El string-pulling no pudo simplificar la ruta (línea de vista obstruida en todo el trayecto).');
  }

  return {
    ok: true,
    motor: 'raster-v1',
    tramos,
    distancia_mn: Math.round(distanciaMn * 100) / 100,
    max_dist_costa_mn: Math.round((maxDistCostaM / 1852) * 100) / 100,
    pct_en_resguardo: Math.round((celdasEnResguardo / totalCeldas) * 1000) / 1000,
    pct_batimetria: {
      verde: Math.round((conteoNivel.VERDE / totalCeldas) * 1000) / 1000,
      amarillo: Math.round((conteoNivel.AMARILLO / totalCeldas) * 1000) / 1000,
      rojo: Math.round((conteoNivel.ROJO / totalCeldas) * 1000) / 1000,
    },
    advertencias,
    _debug: {
      restringido: resultado.restringido,
      expansions: resultado.expansions,
      celdasCaminoCompleto: resultado.path.length,
      celdasWaypoints: waypointIdxs.length,
      snapOrigenM: snapOrigen.distSnapM,
      snapDestinoM: snapDestino.distSnapM,
    },
  };
}

module.exports = { warmup, calcularRuta, lonLatToRowCol, idxToLonLat };
