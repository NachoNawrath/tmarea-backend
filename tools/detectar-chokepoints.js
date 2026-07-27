'use strict';
/**
 * Detector de chokepoints (TMAREA_SPEC_Router_Raster_v1.md §7.1/§7.2).
 *
 * Para cualquier ruta que no converge a un dMinM objetivo pero sí converge
 * a dMinM=50 (el margen mas laxo posible), esta herramienta ubica POR QUE:
 * corre el A* jerarquico a dMinM=50, recorre esa ruta de referencia sobre
 * el .bin fino, y lista los tramos donde el margen real (d = distancia a
 * costa) queda por debajo del dMinM objetivo. Esos tramos son el corredor
 * angosto que el modelo cierra a ese margen.
 *
 * No agrega zonas ni corrige nada -- es solo diagnostico. Ver
 * docs/handoff-fase2.md para cuando usarla.
 *
 * Uso:
 *   node tools/detectar-chokepoints.js --origen=LAT,LON --destino=LAT,LON --dmin=150 [--tile=AUSTRAL_N]
 *
 * Ejemplo (Puerto Montt -> Chacabuco, dMinM objetivo 150):
 *   node tools/detectar-chokepoints.js --origen=-41.46985,-72.91716 --destino=-45.462,-72.807 --dmin=150
 */
const proj4 = require('proj4');
const path = require('path');

const { loadTile } = require('../src/services/raster/tile-loader');
const { buildCostLUT, buildCoarseCostLUT } = require('../src/services/raster/cost-lut');
const { astarBBox } = require('../src/services/raster/astar-bbox');
const {
  dilatar,
  bboxANivelFino,
  corridorABitmap,
  makeCorridorPredicate,
  RADIOS_DILATACION_M,
} = require('../src/services/raster/multi-level');
const { snapToNavigable } = require('../src/services/raster/snap');
const { construirPerfilCosto, MAX_EXPANSIONES_ASTAR } = require('../src/config/perfiles-costo');
const zonasDragadas = require('../src/config/zonas-dragadas.json');

const FALLBACK_EPSILON = 1.5; // mismo valor que raster-router-service.js, spec §7.2

// dMinM=50 es el margen de referencia: por definicion converge (es el
// minimo absoluto de la tabla de perfiles-costo.js), asi que sirve como
// ruta base para diagnosticar por que un dMinM mayor no converge.
const PERFIL_REFERENCIA = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (!m) continue;
    args[m[1]] = m[2];
  }
  return args;
}

function parseLatLon(s, flagName) {
  if (!s) throw new Error(`Falta --${flagName}=LAT,LON`);
  const [lat, lon] = s.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`--${flagName} invalido: "${s}" (esperado "LAT,LON")`);
  }
  return { lat, lon };
}

// ---- proyeccion (misma logica que raster-router-service.js) --------------

function makeProjector(meta) {
  const lonLatToRowCol = (lon, lat) => {
    const [x, y] = proj4('EPSG:4326', meta.crs_proj4, [lon, lat]);
    const col = Math.floor((x - meta.origin_x) / meta.res_m);
    const fila = Math.floor((meta.origin_y - y) / meta.res_m);
    return { fila, col };
  };
  const idxToLonLat = (idx) => {
    const cols = meta.cols;
    const fila = (idx / cols) | 0;
    const col = idx % cols;
    const x = meta.origin_x + (col + 0.5) * meta.res_m;
    const y = meta.origin_y - (fila + 0.5) * meta.res_m;
    return proj4(meta.crs_proj4, 'EPSG:4326', [x, y]);
  };
  const lonLatToXY = (lon, lat) => proj4('EPSG:4326', meta.crs_proj4, [lon, lat]);
  const idxToXY = (idx) => {
    const cols = meta.cols;
    const fila = (idx / cols) | 0;
    const col = idx % cols;
    return [meta.origin_x + (col + 0.5) * meta.res_m, meta.origin_y - (fila + 0.5) * meta.res_m];
  };
  return { lonLatToRowCol, idxToLonLat, lonLatToXY, idxToXY };
}

// ---- A* jerarquico de 3 niveles, identico al de raster-router-service.js -
// (duplicado a proposito: esta herramienta debe seguir funcionando aunque
// el router cambie de forma, y solo necesita EL CAMINO, no la respuesta
// completa de calcularRuta()).

function idxToRowCol(idx, cols) {
  return { row: (idx / cols) | 0, col: idx % cols };
}
function fineIdxToNivelIdx(fineIdx, cols, factor, nivelCols) {
  const { row, col } = idxToRowCol(fineIdx, cols);
  return ((row / factor) | 0) * nivelCols + ((col / factor) | 0);
}

function runHierarchicalAstar(TILE, startIdx, goalIdx, perfilCosto) {
  const meta = TILE.meta;
  const fineLUT = buildCostLUT(perfilCosto);
  const medioLUT = buildCoarseCostLUT(perfilCosto);
  const gruesoLUT = medioLUT;

  const gruesoResM = meta.res_m * TILE.gruesoFactor;
  const medioResM = meta.res_m * TILE.medioFactor;
  const factorGruesoAMedio = TILE.gruesoFactor / TILE.medioFactor;

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
        finoResult = res;
        break;
      }
    }
  }
  if (finoResult) return finoResult;

  return astarBBox({
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
}

// ---- geometria de zonas-dragadas.json --------------------------------------

function distanciaPuntoM(x0, y0, x1, y1) {
  return Math.hypot(x1 - x0, y1 - y0);
}

function distanciaPuntoASegmentoM(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distanciaPuntoM(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return distanciaPuntoM(px, py, ax + t * dx, ay + t * dy);
}

/** Zonas de zonas-dragadas.json cuyo buffer alcanza (x,y) [coords proyectadas]. */
function zonasQueAlcanzan(x, y, zonas, lonLatToXY) {
  const candidatas = [];
  for (const zona of zonas) {
    const geo = zona.geometria_wgs84;
    let distM;
    if (typeof geo[0] === 'number') {
      // punto [lon, lat]
      const [zx, zy] = lonLatToXY(geo[0], geo[1]);
      distM = distanciaPuntoM(x, y, zx, zy);
    } else {
      // linea [[lon,lat], ...]
      distM = Infinity;
      const proyectados = geo.map(([lon, lat]) => lonLatToXY(lon, lat));
      for (let i = 1; i < proyectados.length; i++) {
        const [ax, ay] = proyectados[i - 1];
        const [bx, by] = proyectados[i];
        const d = distanciaPuntoASegmentoM(x, y, ax, ay, bx, by);
        if (d < distM) distM = d;
      }
    }
    if (distM <= zona.buffer_m) {
      candidatas.push({ nombre: zona.nombre, tipo: zona.tipo, distancia_m: Math.round(distM) });
    }
  }
  return candidatas.sort((a, b) => a.distancia_m - b.distancia_m);
}

// ---- deteccion de chokepoints ----------------------------------------------

function detectarChokepoints(TILE, path, dMinObjetivo, proj) {
  const { meta } = TILE;
  const puntos = path.map((idx) => {
    const raw = TILE.packed[idx];
    const d = (raw & 0x1fff) * meta.unit_m;
    const kml = (raw >> 15) & 0b1;
    const [x, y] = proj.idxToXY(idx);
    return { idx, d, kml, x, y };
  });

  const chokepoints = [];
  let actual = null;
  for (const p of puntos) {
    if (p.d < dMinObjetivo) {
      if (!actual) actual = [];
      actual.push(p);
    } else if (actual) {
      chokepoints.push(actual);
      actual = null;
    }
  }
  if (actual) chokepoints.push(actual);

  return chokepoints.map((tramo) => {
    let largoM = 0;
    for (let i = 1; i < tramo.length; i++) {
      largoM += distanciaPuntoM(tramo[i - 1].x, tramo[i - 1].y, tramo[i].x, tramo[i].y);
    }
    const masAngosto = tramo.reduce((min, p) => (p.d < min.d ? p : min), tramo[0]);
    const centroIdx = tramo[Math.floor(tramo.length / 2)].idx;
    const [lon, lat] = proj.idxToLonLat(centroIdx);
    const anguloKml = tramo.some((p) => p.kml);

    return {
      centro: { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 },
      largo_tramo_m: Math.round(largoM),
      margen_minimo_m: Math.round(masAngosto.d),
      ancho_estimado_m: Math.round(masAngosto.d * 2), // estimacion: 2x margen a la orilla en el punto mas angosto, asume ruta centrada en el canal
      celdas: tramo.length,
      dentro_zona_relajada: anguloKml, // bit 15 del .bin, ground truth de zonas-dragadas.json rasterizadas
      zonas_dragadas_cercanas: zonasQueAlcanzan(masAngosto.x, masAngosto.y, zonasDragadas, proj.lonLatToXY),
    };
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const origen = parseLatLon(args.origen, 'origen');
  const destino = parseLatLon(args.destino, 'destino');
  const dMinObjetivo = Number(args.dmin);
  const tileId = args.tile || 'AUSTRAL_N';

  if (!Number.isFinite(dMinObjetivo)) throw new Error('Falta --dmin=<metros>');

  console.log(`Cargando tile ${tileId}...`);
  const TILE = loadTile(tileId);
  const proj = makeProjector(TILE.meta);

  const origenRC = proj.lonLatToRowCol(origen.lon, origen.lat);
  const destinoRC = proj.lonLatToRowCol(destino.lon, destino.lat);

  const snapOrigen = snapToNavigable(origenRC.fila, origenRC.col, TILE.meta, TILE.packed, PERFIL_REFERENCIA);
  const snapDestino = snapToNavigable(destinoRC.fila, destinoRC.col, TILE.meta, TILE.packed, PERFIL_REFERENCIA);
  if (!snapOrigen || !snapDestino) {
    console.error('No se encontro agua navegable cerca de origen o destino (ni a dMinM=50).');
    process.exit(1);
  }

  console.log(`Ruta de referencia a dMinM=50 (${PERFIL_REFERENCIA.costo.dMinM}m)...`);
  const t0 = Date.now();
  const resultado = runHierarchicalAstar(TILE, snapOrigen.idx, snapDestino.idx, PERFIL_REFERENCIA);
  const ms = Date.now() - t0;

  if (!resultado.path) {
    console.error(`La ruta de referencia a dMinM=50 tampoco converge (motivo=${resultado.motivo}, ${ms}ms).`);
    console.error('Esta herramienta asume que dMinM=50 converge -- si no converge, el problema no es un chokepoint puntual.');
    process.exit(1);
  }
  console.log(`  ok | ${ms}ms | ${resultado.path.length} celdas\n`);

  const chokepoints = detectarChokepoints(TILE, resultado.path, dMinObjetivo, proj);

  console.log(`dMinM objetivo: ${dMinObjetivo}m`);
  console.log(`Chokepoints encontrados (tramos con margen < ${dMinObjetivo}m en la ruta de referencia): ${chokepoints.length}\n`);

  chokepoints.forEach((c, i) => {
    console.log(`--- Chokepoint ${i + 1} ---`);
    console.log(`  centro: lat=${c.centro.lat}, lon=${c.centro.lon}`);
    console.log(`  largo del tramo: ${c.largo_tramo_m}m (${c.celdas} celdas)`);
    console.log(`  margen minimo a la orilla: ${c.margen_minimo_m}m`);
    console.log(`  ancho estimado (2x margen minimo, asume ruta centrada): ${c.ancho_estimado_m}m`);
    console.log(`  dentro de zona relajada (bit 15 del .bin): ${c.dentro_zona_relajada}`);
    if (c.zonas_dragadas_cercanas.length) {
      console.log(`  zonas_dragadas.json cercanas: ${c.zonas_dragadas_cercanas.map((z) => `${z.nombre} (${z.tipo}, ${z.distancia_m}m)`).join(', ')}`);
    } else {
      console.log(`  zonas_dragadas.json cercanas: ninguna`);
    }
    console.log();
  });

  if (chokepoints.length === 0) {
    console.log('Sin chokepoints -- la ruta de referencia no tiene tramos por debajo del dMinM objetivo. El fallo de convergencia no es un estrechamiento puntual (revisar corredor/expansiones).');
  }
}

main();
