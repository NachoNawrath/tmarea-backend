'use strict';
/**
 * Geometria real de canal por nombre -- usada por cotejo-vertical.js y por
 * el adjunto de advertencias de peligros (Fase 3 redefinida, ver
 * docs/handoff-fase2.md).
 *
 * Cobertura: SOLO 3 canales tienen geometria real en el proyecto hoy.
 *   - "Canal Tenglo"  -> tmarea_nodos_nauticos_v1.json, edge E-01 (el paso
 *     angosto en si; E-02 son 18 mn de Golfo de Ancud general y NO
 *     representa Tenglo -- usarlo sobrestimaria donde "cruza Tenglo").
 *   - "Canal Chacao"  -> red_nautica_chile_completa.geojson, feature
 *     "Canal de Chacao" (alias: pasos_full.csv usa "Canal Chacao", el
 *     geojson usa "Canal de Chacao" -- mismo canal, dos pipelines de
 *     extraccion distintos).
 *   - "Canal Moraleda" -> red_nautica_chile_completa.geojson, feature
 *     "Canal Moraleda".
 *
 * Los otros 4 canales de src/config/pasos-sonda-canal.json (Cruces,
 * Galvarino, Pilcomayo, Vidts) NO tienen geometria en ningun dataset del
 * proyecto. canalesQueCruzaRuta() nunca los va a devolver -- no se inventa
 * geometria para taparlo. Ver spec-router-raster-v1.md Fase 3 y el hallazgo
 * documentado en handoff-fase2.md.
 */
const fs = require('fs');
const path = require('path');

const GEOJSON_PATH = path.join(__dirname, '..', 'data', 'red_nautica_chile_completa.geojson');
const NODOS_PATH = path.join(__dirname, '..', 'data', 'tmarea_nodos_nauticos_v1.json');

const ALIAS_GEOJSON = { 'Canal Chacao': 'Canal de Chacao' };

let CACHE = null;

function cargarGeometrias() {
  if (CACHE) return CACHE;

  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
  const nodos = JSON.parse(fs.readFileSync(NODOS_PATH, 'utf8'));

  const mapa = new Map();

  for (const canal of ['Canal Chacao', 'Canal Moraleda']) {
    const nombreGeojson = ALIAS_GEOJSON[canal] || canal;
    const feature = geojson.features.find((f) => f.properties && f.properties.name === nombreGeojson);
    if (feature && feature.geometry && feature.geometry.type === 'LineString') {
      mapa.set(canal, feature.geometry.coordinates); // [[lon,lat], ...]
    }
  }

  const tengloEdge = (nodos.edges || []).find((e) => e.id === 'E-01');
  if (tengloEdge && tengloEdge.path) {
    mapa.set('Canal Tenglo', tengloEdge.path); // [[lon,lat], ...]
  }

  CACHE = mapa;
  return mapa;
}

// ---- distancia punto-a-segmento en plano local (equirectangular) --------
// Suficiente a esta escala (canales de unos pocos km); no hace falta
// geodesia exacta para una advertencia de proximidad.

function proyectarLocal(lon, lat, lon0, lat0) {
  const mPorGradoLat = 111320;
  const mPorGradoLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return { x: (lon - lon0) * mPorGradoLon, y: (lat - lat0) * mPorGradoLat };
}

function distPuntoSegmentoM(lon, lat, [lonA, latA], [lonB, latB]) {
  const p = proyectarLocal(lon, lat, lonA, latA);
  const a = { x: 0, y: 0 };
  const b = proyectarLocal(lonB, latB, lonA, latA);
  const abx = b.x - a.x, aby = b.y - a.y;
  const apx = p.x - a.x, apy = p.y - a.y;
  const lenSq = abx * abx + aby * aby;
  let t = lenSq > 0 ? (apx * abx + apy * aby) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * abx, cy = a.y + t * aby;
  return Math.hypot(p.x - cx, p.y - cy);
}

function distPuntoALineaM(lon, lat, lineCoords) {
  let min = Infinity;
  for (let i = 1; i < lineCoords.length; i++) {
    const d = distPuntoSegmentoM(lon, lat, lineCoords[i - 1], lineCoords[i]);
    if (d < min) min = d;
  }
  return min;
}

const BUFFER_DEFAULT_M = 500;

/**
 * @param {Array<[number,number]>} waypointsLonLat - ruta ya trazada, [lon,lat]
 * @param {number} bufferM
 * @returns {string[]} nombres de canal (de los que tienen geometria) que la ruta cruza
 */
function canalesQueCruzaRuta(waypointsLonLat, bufferM = BUFFER_DEFAULT_M) {
  const geometrias = cargarGeometrias();
  const encontrados = new Set();
  for (const [canal, linea] of geometrias) {
    for (const [lon, lat] of waypointsLonLat) {
      if (distPuntoALineaM(lon, lat, linea) <= bufferM) {
        encontrados.add(canal);
        break;
      }
    }
  }
  return [...encontrados];
}

module.exports = { canalesQueCruzaRuta, cargarGeometrias };
