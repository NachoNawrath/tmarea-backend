'use strict';
/**
 * Deriva 'canal_conocido' (Tenglo) y 'canal_acceso_derivado' (spec
 * TMAREA_SPEC_Router_Raster_v1.md §7.1) a src/config/zonas-dragadas.json.
 *
 * CORRECCION v2: la v1 derivaba el camino a nivel MEDIO (400m) usando el
 * CENTRO de cada celda media como vertice -- invalido, 69/176 puntos del
 * camino de Puyuhuapi caian en TIERRA a resolucion fina (el max-pooling
 * que hace "navegable" una celda media puede estar en una esquina del
 * bloque de 8x8, no en su centro). v2 deriva a resolucion FINA (el mismo
 * .bin que usa el A*, arrays tipados en vez de Map -- Map ya demostro no
 * escalar en este proyecto).
 *
 * Candidatos: los 10 puertos identificados en la corrida NO circular
 * anterior (con solo area_portuaria activo, antes de que existiera
 * ningun canal_acceso_derivado que pudiera sesgar la clasificacion).
 */
const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');
const tileLoader = require('./src/services/raster/tile-loader');
const { snapToNavigable } = require('./src/services/raster/snap');

const UMBRAL_MAR_ABIERTO_M = 5000;
const CANAL_ACCESO_BUFFER_M = 300;

const CANDIDATOS = [
  'Rampa de Fleteros de Angelmo', 'Rampa Las Papas - Sector Angelmo',
  'Embarcadero Rampa Añihue', 'Embarcadero Rampa Isla Apiao Sector Ostricultura',
  'Embarcadero Muelle de Puyuhuapi', 'Embarcadero Muelle Fiscal de Puyuhuapi',
  'Embarcadero Conectividad Rio Exploradores', 'Rampa Hoffman',
  'Borde Costero de Ichuac', 'Embarcadero Rampa De Puyuhuapi',
];

const tile = tileLoader.loadTile('AUSTRAL_N');
const meta = tile.meta;
const N = meta.rows * meta.cols;

function fineIdxToLonLat(idx) {
  const row = Math.floor(idx / meta.cols);
  const col = idx % meta.cols;
  const x = meta.origin_x + (col + 0.5) * meta.res_m;
  const y = meta.origin_y - (row + 0.5) * meta.res_m;
  const [lon, lat] = proj4(meta.crs_proj4, 'EPSG:4326', [x, y]);
  return [lon, lat];
}
function cellInfo(idx) {
  const raw = tile.packed[idx];
  return { confianza: (raw >> 13) & 0b11, kml: (raw >> 15) & 0b1, d: (raw & 0x1fff) * meta.unit_m };
}

const NEIGHBORS8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// Buffers reusados entre llamadas (evita reasignar ~530MB por puerto).
const visitedBuf = new Uint8Array(N);
const cameFromBuf = new Int32Array(N);

function bfsFino(startIdx, dMinM, maxCeldas) {
  const { confianza: c0, d: d0 } = cellInfo(startIdx);
  if (c0 === 0) return null;
  if (d0 >= UMBRAL_MAR_ABIERTO_M) return [startIdx];

  const tocadas = [startIdx];
  visitedBuf[startIdx] = 1;
  cameFromBuf[startIdx] = -1;
  const queue = [startIdx];
  let qi = 0;
  let resultado = null;
  while (qi < queue.length) {
    if (queue.length > maxCeldas) break;
    const idx = queue[qi++];
    const row = (idx / meta.cols) | 0;
    const col = idx % meta.cols;
    for (const [dr, dc] of NEIGHBORS8) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= meta.rows || nc < 0 || nc >= meta.cols) continue;
      const nIdx = nr * meta.cols + nc;
      if (visitedBuf[nIdx]) continue;
      const { confianza, kml, d } = cellInfo(nIdx);
      if (confianza === 0) continue;
      const dMinEfectivo = kml ? Math.min(dMinM, 50) : dMinM;
      if (d < dMinEfectivo) continue;
      visitedBuf[nIdx] = 1;
      cameFromBuf[nIdx] = idx;
      tocadas.push(nIdx);
      if (d >= UMBRAL_MAR_ABIERTO_M) {
        const p = [nIdx];
        let cur = nIdx;
        while (cameFromBuf[cur] !== -1) { cur = cameFromBuf[cur]; p.push(cur); }
        p.reverse();
        resultado = p;
        break;
      }
      queue.push(nIdx);
    }
    if (resultado) break;
  }
  for (const idx of tocadas) visitedBuf[idx] = 0; // limpiar solo lo tocado, no todo el buffer
  return resultado;
}

const puertosData = JSON.parse(fs.readFileSync('src/services/data/puertos_chile_nacional.json', 'utf8'));
const derivados = [];

for (const nombre of CANDIDATOS) {
  const feat = puertosData.features.find((f) => f.attributes.NOMBRE === nombre);
  if (!feat) { console.log(`AVISO: "${nombre}" no encontrado en puertos_chile_nacional.json`); continue; }
  const lon = feat.geometry.x, lat = feat.geometry.y;
  const [x, y] = proj4('EPSG:4326', meta.crs_proj4, [lon, lat]);
  const fila = Math.floor((meta.origin_y - y) / meta.res_m);
  const col = Math.floor((x - meta.origin_x) / meta.res_m);

  const perfilDerivacion = { costo: { dMinM: 50 }, limites: {} };
  const snap = snapToNavigable(fila, col, meta, tile.packed, perfilDerivacion);
  if (!snap) { console.log(`${nombre}: sin snap a dMinM=50 -- no derivable`); continue; }

  const t0 = Date.now();
  const camino = bfsFino(snap.idx, 50, 3_000_000);
  const ms = Date.now() - t0;
  if (!camino) { console.log(`${nombre}: BFS fino no convergio (>3M celdas o sin salida) -- no derivable`); continue; }

  // verificacion honesta: ningun punto del camino real puede ser tierra
  const huecos = camino.filter((idx) => cellInfo(idx).confianza === 0).length;
  console.log(`${nombre}: ${camino.length} celdas finas (~${(camino.length * meta.res_m / 1000).toFixed(1)}km), ${ms}ms, huecos_en_tierra=${huecos}`);

  derivados.push({ nombre, camino });
}

const TENGLO_PATH_LONLAT = [
  [-72.9387607, -41.4776306], [-72.9391973, -41.4775993], [-72.9396349, -41.4775771],
  [-72.9400732, -41.477564], [-72.9405118, -41.4775602], [-72.9409504, -41.4775654],
  [-72.9413886, -41.4775798], [-72.9418262, -41.4776034], [-72.9422625, -41.4776361],
  [-72.9426973, -41.4776781], [-72.943131, -41.4777287], [-72.9435624, -41.4777888],
  [-72.9439911, -41.4778574], [-72.9444175, -41.4779354], [-72.9448404, -41.4780218],
  [-72.9452602, -41.4781176], [-72.9456762, -41.4782214], [-72.9460881, -41.4783343],
  [-72.9464958, -41.4784556], [-72.9468988, -41.4785855], [-72.9472967, -41.4787236],
  [-72.9476893, -41.4788701], [-72.9480764, -41.4790246], [-72.9484574, -41.4791873],
  [-72.9488326, -41.4793577], [-72.9519, -41.4814], [-72.9550928, -41.4836097],
  [-72.9567531, -41.4845179], [-72.9584134, -41.4854262], [-72.9584939, -41.4854399],
  [-72.9585744, -41.4854537], [-72.958657, -41.4854555], [-72.9587396, -41.4854531],
  [-72.9588243, -41.4854403], [-72.9589091, -41.485422], [-72.9589902, -41.4853934],
  [-72.9590714, -41.4853571], [-72.9593207, -41.4852378], [-72.9595701, -41.4851186],
];

const zonasPath = path.join(__dirname, 'src/config/zonas-dragadas.json');
const zonasExistentes = JSON.parse(fs.readFileSync(zonasPath, 'utf8'));
const zonasNuevas = zonasExistentes.filter((z) => z.tipo === 'area_portuaria');

zonasNuevas.push({
  nombre: 'Canal Tenglo',
  tipo: 'canal_conocido',
  geometria_wgs84: TENGLO_PATH_LONLAT,
  buffer_m: 300,
  dMinM_max: 50,
  fuente: 'tmarea_nodos_nauticos_v1.json, edge N-PM-01->N-PM-02, 39 puntos (motor anterior, verificado)',
});

for (const { nombre, camino } of derivados) {
  zonasNuevas.push({
    nombre: `Canal de acceso derivado: ${nombre}`,
    tipo: 'canal_acceso_derivado',
    geometria_wgs84: camino.map(fineIdxToLonLat),
    buffer_m: CANAL_ACCESO_BUFFER_M,
    dMinM_max: 50,
    fuente: 'Derivado automaticamente: BFS a resolucion fina (50m, el mismo .bin que usa el A*) desde el '
      + `puerto hasta mar abierto (d>=${UMBRAL_MAR_ABIERTO_M}m) con dMinM=50. Forzado a confianza ROJO `
      + '(spec Sec 7.1, condicion de honestidad) -- se permite el paso por geometria, no se afirma profundidad.',
    forzar_rojo: true,
  });
}

fs.writeFileSync(zonasPath, JSON.stringify(zonasNuevas, null, 2), 'utf8');
console.log(`\n${zonasNuevas.length} zonas totales (${zonasNuevas.filter(z => z.tipo === 'area_portuaria').length} area_portuaria, `
  + `${zonasNuevas.filter(z => z.tipo === 'canal_conocido').length} canal_conocido, `
  + `${zonasNuevas.filter(z => z.tipo === 'canal_acceso_derivado').length} canal_acceso_derivado) escritas en ${zonasPath}`);
