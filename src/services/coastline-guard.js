'use strict';
/**
 * coastline-guard.js
 * Índice espacial (Flatbush/R-Tree) de la línea de costa (OSM natural=coastline,
 * X/XI/XII regiones) para validar que un segmento de ruta (feeder) no cruce tierra.
 *
 * No reconstruye polígonos (costoso y frágil con miles de islas) — usa test de
 * intersección de segmentos contra las líneas de costa: si un feeder que parte
 * y llega en agua cruza la costa, necesariamente pisó tierra en el medio.
 *
 * Carga en cascada, una sola vez por proceso (singleton in-memory):
 *   1. coastline_compact.json  — formato liviano ya preprocesado (rápido de parsear)
 *   2. coastline_raw.json      — export crudo de Overpass; si se usa, además
 *                                 escribe compact+fallback a disco para el próximo boot
 *   3. coastline_fallback.json — respaldo decimado, bundleado en el repo
 *   4. sin datos               — modo permisivo explícito (nunca lanza error / 500)
 */

const fs = require('fs');
const path = require('path');
const Flatbush = require('flatbush').default;

const DATA_DIR = path.join(__dirname, 'data', 'coastline');
const COMPACT_PATH = path.join(DATA_DIR, 'coastline_compact.json');
const RAW_PATH = path.join(DATA_DIR, 'coastline_raw.json');
const FALLBACK_PATH = path.join(DATA_DIR, 'coastline_fallback.json');
const FALLBACK_DECIMATION = 6; // conserva 1 de cada N vértices para el respaldo liviano

let _segAX, _segAY, _segBX, _segBY; // Float64Array — coordenadas de cada segmento
let _segWay, _segLocalIdx;          // Int32Array — a qué way/índice local pertenece cada segmento
let _ways = null;     // ways originales, para poder recorrer vecinos (detour)
let _index = null;   // Flatbush
let _ready = false;
let _loadError = null;
let _attempted = false;
let _source = null;  // 'compact' | 'raw' | 'fallback'

// ── Geometría de intersección de segmentos (sin overhead de objetos GeoJSON) ─
function orient(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}
function segmentsIntersect(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
  const d1 = orient(p3x, p3y, p4x, p4y, p1x, p1y);
  const d2 = orient(p3x, p3y, p4x, p4y, p2x, p2y);
  const d3 = orient(p1x, p1y, p2x, p2y, p3x, p3y);
  const d4 = orient(p1x, p1y, p2x, p2y, p4x, p4y);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// ── Extracción de ways [[lon,lat],...] desde cada formato de archivo ─────────
function waysFromCompact(json) {
  // formato compacto: [ [lon,lat,lon,lat,...], ... ] (flat arrays, sin metadata)
  return json.map(flat => {
    const way = [];
    for (let i = 0; i < flat.length; i += 2) way.push([flat[i], flat[i + 1]]);
    return way;
  });
}
function waysFromRaw(json) {
  const elements = json.elements || [];
  const ways = [];
  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    ways.push(el.geometry.map(g => [g.lon, g.lat]));
  }
  return ways;
}

function decimateWay(way, n) {
  if (way.length <= 2) return way;
  const out = [way[0]];
  for (let i = n; i < way.length - 1; i += n) out.push(way[i]);
  out.push(way[way.length - 1]);
  return out;
}

function writeCompactAndFallback(ways) {
  try {
    const compact = ways.map(w => {
      const flat = new Array(w.length * 2);
      for (let i = 0; i < w.length; i++) { flat[i * 2] = w[i][0]; flat[i * 2 + 1] = w[i][1]; }
      return flat;
    });
    fs.writeFile(COMPACT_PATH, JSON.stringify(compact), (err) => {
      if (err) console.warn('[CoastlineGuard] No se pudo escribir coastline_compact.json:', err.message);
      else console.log('[CoastlineGuard] coastline_compact.json escrito para arranques futuros.');
    });

    const fallback = ways.map(w => decimateWay(w, FALLBACK_DECIMATION).map(([lon, lat]) => [
      Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4,
    ]));
    fs.writeFile(FALLBACK_PATH, JSON.stringify(fallback), (err) => {
      if (err) console.warn('[CoastlineGuard] No se pudo escribir coastline_fallback.json:', err.message);
      else console.log('[CoastlineGuard] coastline_fallback.json (respaldo decimado) escrito.');
    });
  } catch (e) {
    console.warn('[CoastlineGuard] Error generando compact/fallback:', e.message);
  }
}

function loadWays() {
  if (fs.existsSync(COMPACT_PATH)) {
    try {
      const ways = waysFromCompact(JSON.parse(fs.readFileSync(COMPACT_PATH, 'utf-8')));
      return { ways, source: 'compact' };
    } catch (e) {
      console.warn('[CoastlineGuard] coastline_compact.json corrupto, se intenta el siguiente en cascada:', e.message);
    }
  }
  if (fs.existsSync(RAW_PATH)) {
    try {
      const ways = waysFromRaw(JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8')));
      writeCompactAndFallback(ways); // async, no bloquea el arranque
      return { ways, source: 'raw' };
    } catch (e) {
      console.warn('[CoastlineGuard] coastline_raw.json inválido o incompleto, se intenta el respaldo:', e.message);
    }
  }
  if (fs.existsSync(FALLBACK_PATH)) {
    try {
      const ways = waysFromCompact(JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf-8')));
      return { ways, source: 'fallback' };
    } catch (e) {
      console.warn('[CoastlineGuard] coastline_fallback.json también inválido:', e.message);
    }
  }
  return null;
}

function buildIndex() {
  const t0 = Date.now();
  const loaded = loadWays();
  if (!loaded) {
    _loadError = 'Sin ningún archivo de costa disponible (compact/raw/fallback) — modo permisivo';
    console.warn(`[CoastlineGuard] ${_loadError}`);
    return;
  }

  const { ways, source } = loaded;
  let nSegs = 0;
  for (const w of ways) nSegs += Math.max(0, w.length - 1);

  _segAX = new Float64Array(nSegs);
  _segAY = new Float64Array(nSegs);
  _segBX = new Float64Array(nSegs);
  _segBY = new Float64Array(nSegs);
  _segWay = new Int32Array(nSegs);
  _segLocalIdx = new Int32Array(nSegs);
  _index = new Flatbush(Math.max(nSegs, 1));

  let k = 0;
  for (let wayIdx = 0; wayIdx < ways.length; wayIdx++) {
    const w = ways[wayIdx];
    for (let i = 0; i < w.length - 1; i++) {
      const [ax, ay] = w[i], [bx, by] = w[i + 1];
      _segAX[k] = ax; _segAY[k] = ay; _segBX[k] = bx; _segBY[k] = by;
      _segWay[k] = wayIdx; _segLocalIdx[k] = i;
      _index.add(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by));
      k++;
    }
  }
  if (nSegs > 0) _index.finish();

  _ways = ways;
  _ready = true;
  _source = source;
  if (source === 'fallback') {
    _loadError = 'Usando respaldo decimado (coastline_fallback.json) — el dataset de alta resolución no estaba disponible';
    console.warn(`[CoastlineGuard] ${_loadError}`);
  }
  console.log(`[CoastlineGuard] Índice listo (fuente: ${source}): ${ways.length} ways, ${nSegs} segmentos (${Date.now() - t0}ms)`);
}

function ensureReady() {
  if (!_attempted) {
    _attempted = true;
    buildIndex();
  }
}

// Fuerza un nuevo intento de carga (p.ej. una vez terminada una descarga en curso).
function reload() {
  _attempted = false;
  _ready = false;
  _loadError = null;
  _index = null;
  _ways = null;
  ensureReady();
}

function candidatesForLine(lineCoords) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of lineCoords) {
    if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  }
  return _index.search(minLon, minLat, maxLon, maxLat);
}

/**
 * Verifica si una línea (array de [lon,lat], típicamente 2 puntos: un feeder)
 * cruza la costa. Devuelve { crossesLand: bool, motivo: string|null }
 */
function crossesCoastline(lineCoords) {
  ensureReady();
  if (!_ready) {
    return { crossesLand: false, motivo: null, sinDatos: true };
  }

  const candidateIds = candidatesForLine(lineCoords);
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const [p1x, p1y] = lineCoords[i], [p2x, p2y] = lineCoords[i + 1];
    for (const id of candidateIds) {
      if (segmentsIntersect(p1x, p1y, p2x, p2y, _segAX[id], _segAY[id], _segBX[id], _segBY[id])) {
        return { crossesLand: true, motivo: `Cruce con línea de costa cerca de [${_segAY[id].toFixed(3)},${_segAX[id].toFixed(3)}]` };
      }
    }
  }
  return { crossesLand: false, motivo: null };
}

// ── API en bloque, para construir grafos de visibilidad sin repetir búsquedas
// en el R-tree por cada par de puntos (evita miles de flatbush.search()) ──────
function segmentIdsInBbox(minLon, minLat, maxLon, maxLat) {
  ensureReady();
  if (!_ready) return [];
  return _index.search(minLon, minLat, maxLon, maxLat);
}
function crossesAnyOf(candidateIds, p1x, p1y, p2x, p2y) {
  for (const id of candidateIds) {
    if (segmentsIntersect(p1x, p1y, p2x, p2y, _segAX[id], _segAY[id], _segBX[id], _segBY[id])) return true;
  }
  return false;
}

/**
 * Igual que crossesCoastline pero además identifica QUÉ segmento de costa
 * fue tocado primero (way + índice local), para poder rodearlo (detour).
 * Devuelve { crossesLand, wayIdx, localIdx } o { crossesLand: false }.
 */
function findFirstCrossing(p1x, p1y, p2x, p2y) {
  ensureReady();
  if (!_ready) return { crossesLand: false, sinDatos: true };

  const candidateIds = candidatesForLine([[p1x, p1y], [p2x, p2y]]);
  for (const id of candidateIds) {
    if (segmentsIntersect(p1x, p1y, p2x, p2y, _segAX[id], _segAY[id], _segBX[id], _segBY[id])) {
      return { crossesLand: true, wayIdx: _segWay[id], localIdx: _segLocalIdx[id] };
    }
  }
  return { crossesLand: false };
}

// Vértice `i` (con wrap-around/clamp) del way `wayIdx` — para generar candidatos de rodeo.
function wayVertex(wayIdx, i) {
  const w = _ways[wayIdx];
  const idx = Math.max(0, Math.min(w.length - 1, i));
  return w[idx];
}
function wayLength(wayIdx) {
  return _ways[wayIdx].length;
}

// Vértices únicos de costa cuyos segmentos caen dentro del bbox dado —
// candidatos para un grafo de visibilidad local (rodeo de archipiélagos).
function verticesInBbox(minLon, minLat, maxLon, maxLat) {
  ensureReady();
  if (!_ready) return [];
  const ids = _index.search(minLon, minLat, maxLon, maxLat);
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    const wayIdx = _segWay[id];
    const way = _ways[wayIdx];
    for (const li of [_segLocalIdx[id], _segLocalIdx[id] + 1]) {
      const key = `${wayIdx}.${li}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(way[li]);
    }
  }
  return out;
}

module.exports = {
  crossesCoastline,
  findFirstCrossing,
  wayVertex,
  wayLength,
  verticesInBbox,
  segmentIdsInBbox,
  crossesAnyOf,
  ensureReady,
  reload,
  get ready() { return _ready; },
  get loadError() { return _loadError; },
  get source() { return _source; },
};
