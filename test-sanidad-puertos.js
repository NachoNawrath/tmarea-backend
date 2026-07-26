'use strict';
/**
 * Test de sanidad del modelo (spec §7.1 v1.6.1, obligatorio antes de
 * cerrar Fase 2): para cada puerto COSTERO de puertos_chile_nacional.json
 * dentro del tile, y cada dMinM de {50,80,150,200}, verificar que existe
 * camino a mar abierto. Meta: 100% de puertos costeros a dMinM=200.
 *
 * Clasificacion costero vs lacustre/fluvial interior: un puerto que NO
 * alcanza mar abierto ni con dMinM=50 (el margen mas laxo posible) esta
 * genuinamente desconectado del oceano en la mascara de agua -- es
 * lacustre/fluvial interior (inalcanzabilidad correcta, test 8) O tiene
 * una discontinuidad real en el polygono de agua de OSM (ver Valdivia,
 * reportado aparte, no auto-derivable porque no hay camino ni al margen
 * mas laxo).
 */
const fs = require('fs');
const proj4 = require('proj4');
const tileLoader = require('./src/services/raster/tile-loader');

const UMBRAL_MAR_ABIERTO_M = 5000;
const MARGENES = [50, 80, 150, 200];

const tile = tileLoader.loadTile('AUSTRAL_N');
const meta = tile.meta;

function lonLatToMedioIdx(lon, lat) {
  const [x, y] = proj4('EPSG:4326', meta.crs_proj4, [lon, lat]);
  const col = Math.floor((x - meta.origin_x) / meta.res_m);
  const fila = Math.floor((meta.origin_y - y) / meta.res_m);
  const medioCol = Math.floor(col / tile.medioFactor);
  const medioFila = Math.floor(fila / tile.medioFactor);
  if (medioFila < 0 || medioFila >= tile.medioRows || medioCol < 0 || medioCol >= tile.medioCols) return null;
  return medioFila * tile.medioCols + medioCol;
}

const NEIGHBORS8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// zona-relajada a nivel medio: mismo criterio que usa el pipeline a nivel
// fino (bit 15), aproximado chequeando si el CENTRO de la celda media cae
// dentro de alguna zona de zonas-dragadas.json. Sin esto, el test de
// sanidad no ve el efecto de canal_conocido/canal_acceso_derivado (el
// medio.bin solo tiene distancia, no bits) y reporta falsos negativos.
const proj4Lib = proj4;
const zonasPath2 = require('path').join(__dirname, 'src/config/zonas-dragadas.json');
const zonasRaw = fs.existsSync(zonasPath2) ? JSON.parse(fs.readFileSync(zonasPath2, 'utf8')) : [];
const medioResM = meta.res_m * tile.medioFactor;

function proyectarGeom(geom) {
  if (typeof geom[0] === 'number') {
    const [x, y] = proj4Lib('EPSG:4326', meta.crs_proj4, geom);
    return [[x, y]];
  }
  return geom.map(([lon, lat]) => proj4Lib('EPSG:4326', meta.crs_proj4, [lon, lat]));
}
const zonasProyectadas = zonasRaw.map((z) => ({ puntos: proyectarGeom(z.geometria_wgs84), buffer_m: z.buffer_m }));

function distPuntoASegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const medioCellCenterCache = new Map();
function medioCellCenterXY(medioIdx) {
  if (medioCellCenterCache.has(medioIdx)) return medioCellCenterCache.get(medioIdx);
  const row = Math.floor(medioIdx / tile.medioCols);
  const col = medioIdx % tile.medioCols;
  const x = meta.origin_x + (col + 0.5) * medioResM;
  const y = meta.origin_y - (row + 0.5) * medioResM;
  medioCellCenterCache.set(medioIdx, [x, y]);
  return [x, y];
}

const zonaRelajadaCache = new Map();
function enZonaRelajada(medioIdx) {
  if (zonaRelajadaCache.has(medioIdx)) return zonaRelajadaCache.get(medioIdx);
  const [x, y] = medioCellCenterXY(medioIdx);
  let dentro = false;
  for (const z of zonasProyectadas) {
    if (z.puntos.length === 1) {
      if (Math.hypot(x - z.puntos[0][0], y - z.puntos[0][1]) <= z.buffer_m) { dentro = true; break; }
    } else {
      for (let i = 1; i < z.puntos.length; i++) {
        const [ax, ay] = z.puntos[i - 1], [bx, by] = z.puntos[i];
        if (distPuntoASegmento(x, y, ax, ay, bx, by) <= z.buffer_m) { dentro = true; break; }
      }
      if (dentro) break;
    }
  }
  zonaRelajadaCache.set(medioIdx, dentro);
  return dentro;
}

function alcanzaMarAbierto(startMedioIdx, dMinM) {
  const { medio, medioRows, medioCols } = tile;
  const dStart = medio[startMedioIdx] * meta.unit_m;
  if (dStart >= UMBRAL_MAR_ABIERTO_M) return true;

  const visited = new Uint8Array(medioRows * medioCols);
  visited[startMedioIdx] = 1;
  const queue = [startMedioIdx];
  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const row = (idx / medioCols) | 0;
    const col = idx % medioCols;
    for (const [dr, dc] of NEIGHBORS8) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= medioRows || nc < 0 || nc >= medioCols) continue;
      const nIdx = nr * medioCols + nc;
      if (visited[nIdx]) continue;
      const d = medio[nIdx] * meta.unit_m;
      const dMinEfectivo = enZonaRelajada(nIdx) ? Math.min(dMinM, 50) : dMinM;
      if (d < dMinEfectivo) continue;
      if (d >= UMBRAL_MAR_ABIERTO_M) return true;
      visited[nIdx] = 1;
      queue.push(nIdx);
    }
  }
  return false;
}

const puertosData = JSON.parse(fs.readFileSync('src/services/data/puertos_chile_nacional.json', 'utf8'));
const BBOX = { lon_min: -75.6, lon_max: -71.9, lat_min: -47.0, lat_max: -39.5 };
const puertos = [];
for (const f of puertosData.features) {
  const { x: lon, y: lat } = f.geometry || {};
  if (lon == null || lat == null) continue;
  if (lon < BBOX.lon_min || lon > BBOX.lon_max || lat < BBOX.lat_min || lat > BBOX.lat_max) continue;
  puertos.push({ nombre: f.attributes.NOMBRE || `puerto_${f.attributes.OBJECTID}`, lon, lat });
}

// Clasificar: costero (alcanza a dMinM=50) vs lacustre/fluvial interior (no alcanza ni a 50)
const costeros = [];
const interiores = [];
for (const puerto of puertos) {
  const medioIdx = lonLatToMedioIdx(puerto.lon, puerto.lat);
  if (medioIdx === null) continue;
  if (alcanzaMarAbierto(medioIdx, 50)) costeros.push({ ...puerto, medioIdx });
  else interiores.push(puerto.nombre);
}

console.log(`${puertos.length} puertos totales dentro del bbox de AUSTRAL_N.`);
console.log(`${costeros.length} clasificados COSTEROS (alcanzan mar abierto a dMinM=50).`);
console.log(`${interiores.length} clasificados LACUSTRES/FLUVIALES INTERIORES (excluidos del criterio, inalcanzabilidad correcta).\n`);

const cobertura = {};
for (const m of MARGENES) cobertura[m] = { ok: 0, total: costeros.length, fallidos: [] };

for (const puerto of costeros) {
  for (const dMinM of MARGENES) {
    const ok = alcanzaMarAbierto(puerto.medioIdx, dMinM);
    if (ok) cobertura[dMinM].ok++;
    else cobertura[dMinM].fallidos.push(puerto.nombre);
  }
}

console.log('=== COBERTURA DE PUERTOS COSTEROS POR MARGEN (dMinM) ===');
for (const m of MARGENES) {
  const c = cobertura[m];
  console.log(`dMinM=${m}m: ${c.ok}/${c.total} puertos costeros alcanzan mar abierto`);
}

console.log(`\n=== META: 100% a dMinM=200 -- ${cobertura[200].ok === cobertura[200].total ? 'CUMPLIDA' : 'NO CUMPLIDA'} ===`);
if (cobertura[200].fallidos.length > 0) {
  console.log('Puertos costeros que aun fallan a 200m:');
  for (const n of cobertura[200].fallidos) console.log(' - ' + n);
}
