'use strict';
/**
 * corridor-router-service.js
 * Motor de ruteo jerárquico para Tmarea
 * Arquitectura: Red Troncal (canales KML) + Feeders (snap origen/destino)
 * OSM eliminado como motor — queda solo como capa visual
 */

const path = require('path');
const fs   = require('fs');

// ── Haversine en millas náuticas ─────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // NM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Proyección de un punto sobre un segmento (devuelve punto más cercano) ────
function projectPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return { x: ax, y: ay, t: 0 };
  let t = ((px - ax)*dx + (py - ay)*dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t*dx, y: ay + t*dy, t };
}

// ── Snap de un punto lon/lat al segmento más cercano de la red troncal ───────
function snapToNetwork(lon, lat, trunkNodes) {
  let bestDist = Infinity;
  let bestIdx  = 0;
  let bestPt   = null;

  for (let i = 0; i < trunkNodes.length - 1; i++) {
    const [ax, ay] = trunkNodes[i];
    const [bx, by] = trunkNodes[i+1];
    const proj = projectPointOnSegment(lon, lat, ax, ay, bx, by);
    const d = haversine(lat, lon, proj.y, proj.x);
    if (d < bestDist) {
      bestDist = d;
      bestIdx  = i;
      bestPt   = proj;
    }
  }
  return { idx: bestIdx, pt: bestPt, distNM: bestDist };
}

// ── Construir red troncal desde red_nautica_chile_completa.geojson ───────────
function buildTrunkNetwork(geojsonPath) {
  const raw  = fs.readFileSync(geojsonPath, 'utf-8');
  const data = JSON.parse(raw);

  // Usar SOLO features tmarea_custom como red troncal
  const trunkFeatures = data.features.filter(f =>
    f.properties && f.properties.source === 'tmarea_custom'
  );

  if (trunkFeatures.length === 0) {
    throw new Error('No se encontraron features tmarea_custom en el GeoJSON');
  }

  // Concatenar todas las líneas en una sola cadena de nodos
  // con tolerancia de empalme de 0.5 NM entre extremos
  const SNAP_TOLERANCE_NM = 0.5;
  let chain = [];

  // Ordenar features por proximidad geométrica para formar cadena continua
  const used = new Array(trunkFeatures.length).fill(false);
  
  // Empezar con la primera feature (Canal Chacao - más al norte)
  let current = trunkFeatures.reduce((best, f, i) => {
    const firstLat = f.geometry.coordinates[0][1];
    return firstLat > best.lat ? { lat: firstLat, idx: i } : best;
  }, { lat: -90, idx: 0 });

  used[current.idx] = true;
  chain = [...trunkFeatures[current.idx].geometry.coordinates];

  // Encadenar el resto por proximidad de extremos
  for (let iter = 0; iter < trunkFeatures.length - 1; iter++) {
    const lastPt = chain[chain.length - 1];
    let bestDist = Infinity, bestIdx = -1, bestReverse = false;

    for (let i = 0; i < trunkFeatures.length; i++) {
      if (used[i]) continue;
      const coords = trunkFeatures[i].geometry.coordinates;
      const dStart = haversine(lastPt[1], lastPt[0], coords[0][1], coords[0][0]);
      const dEnd   = haversine(lastPt[1], lastPt[0], coords[coords.length-1][1], coords[coords.length-1][0]);
      if (dStart < bestDist) { bestDist = dStart; bestIdx = i; bestReverse = false; }
      if (dEnd   < bestDist) { bestDist = dEnd;   bestIdx = i; bestReverse = true;  }
    }

    if (bestIdx === -1) break;
    used[bestIdx] = true;
    let coords = [...trunkFeatures[bestIdx].geometry.coordinates];
    if (bestReverse) coords.reverse();

    // Si el gap es < tolerancia, empalmar; si no, igual conectar
    if (bestDist < SNAP_TOLERANCE_NM * 20) { // 20NM máximo gap aceptable
      chain = [...chain, ...coords];
    }
  }

  console.log(`[Corridor] Red troncal: ${chain.length} nodos, ${trunkFeatures.length} segmentos`);
  return chain; // Array de [lon, lat]
}

// ── Dijkstra sobre índices de nodos de la cadena troncal ────────────────────
function dijkstraOnChain(chain, startIdx, endIdx) {
  const n = chain.length;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  dist[startIdx] = 0;

  // MinHeap simple con array (suficiente para cadenas de ~200 nodos)
  const queue = [{ idx: startIdx, d: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const { idx, d } = queue.shift();
    if (d > dist[idx]) continue;

    // Vecinos: anterior y siguiente en la cadena
    for (const ni of [idx - 1, idx + 1]) {
      if (ni < 0 || ni >= n) continue;
      const w = haversine(chain[idx][1], chain[idx][0], chain[ni][1], chain[ni][0]);
      const nd = dist[idx] + w;
      if (nd < dist[ni]) {
        dist[ni] = nd;
        prev[ni] = idx;
        queue.push({ idx: ni, d: nd });
      }
    }
  }

  // Reconstruir camino
  const path = [];
  let cur = endIdx;
  while (cur !== -1) { path.unshift(cur); cur = prev[cur]; }
  return { path, totalDist: dist[endIdx] };
}

// ── Estado del módulo ────────────────────────────────────────────────────────
let _trunkChain = null;

function buildGraph() {
  const t0 = Date.now();
  const geojsonPath = path.join(__dirname, 'data', 'red_nautica_chile_completa.geojson');
  _trunkChain = buildTrunkNetwork(geojsonPath);
  console.log(`[Corridor] Grafo listo: ${_trunkChain.length} nodos troncales (${Date.now()-t0}ms)`);
  return { nodeCoords: null, adjacency: null }; // compatibilidad con index.js
}

// ── Función principal de ruteo ───────────────────────────────────────────────
function calcularRutaOSM(latOrigen, lonOrigen, latDestino, lonDestino) {
  if (!_trunkChain) buildGraph();

  const chain = _trunkChain;

  // 1. Snap origen y destino a la red troncal
  const snapO = snapToNetwork(lonOrigen, latOrigen, chain);
  const snapD = snapToNetwork(lonDestino, latDestino, chain);

  // Insertar puntos de snap en la cadena (entre idx e idx+1)
  // Trabajamos con índices: usamos idx+1 como nodo de entrada al corredor
  const startIdx = snapO.idx;
const endIdx   = snapD.idx + 1;

  // 2. Ruta sobre la cadena troncal
  const { path: trunkPath, totalDist: trunkDist } = dijkstraOnChain(chain, startIdx, endIdx);

  // 3. Construir geometría final:
  //    [Origen] → [punto snap origen en troncal] → [tramo troncal] → [punto snap destino] → [Destino]
  const snapOPt  = [snapO.pt.x, snapO.pt.y];
  const snapDPt  = [snapD.pt.x, snapD.pt.y];
  const trunkCoords = trunkPath.map(i => chain[i]);

  const fullPath = [
    [lonOrigen, latOrigen],
    snapOPt,
    ...trunkCoords,
    snapDPt,
    [lonDestino, latDestino]
  ];

  // 4. Calcular distancia total
  let totalNM = 0;
  for (let i = 0; i < fullPath.length - 1; i++) {
    totalNM += haversine(fullPath[i][1], fullPath[i][0], fullPath[i+1][1], fullPath[i+1][0]);
  }

  // 5. Segmentos para respuesta
  const segmentos = [];
  for (let i = 0; i < fullPath.length - 1; i++) {
    const d = haversine(fullPath[i][1], fullPath[i][0], fullPath[i+1][1], fullPath[i+1][0]);
    segmentos.push({
      desde: { lon: fullPath[i][0], lat: fullPath[i][1] },
      hasta: { lon: fullPath[i+1][0], lat: fullPath[i+1][1] },
      distancia_mn: Math.round(d * 10) / 10
    });
  }

const distFeeder = snapO.distNM + snapD.distNM;

  return {
    ok: true,
    distancia_mn: Math.round(totalNM * 10) / 10,
    distancia_troncal_mn: Math.round(trunkDist * 10) / 10,
    distancia_feeder_mn: Math.round(distFeeder * 10) / 10,
    nodos_troncales: trunkPath.length,
    motor: 'corridor-v1',
    tramos: [{
      confianza: 'VERDE',
      coords: fullPath
    }]
  };
}

module.exports = { buildGraph, calcularRutaOSM };
