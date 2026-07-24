'use strict';
/**
 * nautical-graph-router.js
 * Motor de ruteo definitivo para Tmarea.
 * Red troncal = grafo real (nodos + edges con path denso) de tmarea_nodos_nauticos_v1.json.
 * Dijkstra genuino multi-vecino (no cadena forzada) + feeders con validación
 * de tierra (coastline-guard / turf) para conectar cualquier origen/destino
 * arbitrario (puerto, centro de cultivo) al edge troncal más cercano.
 */

const fs = require('fs');
const path = require('path');
const { LRUCache } = require('lru-cache');
const coastlineGuard = require('./coastline-guard');

const MAX_SNAP_CANDIDATES = 6; // nº de segmentos candidatos a probar si el más cercano cruza tierra
const ROUTE_CACHE_PRECISION = 3; // decimales de redondeo para la clave de caché (~111m)
const routeCache = new LRUCache({ max: 5000, ttl: 1000 * 60 * 60 }); // 1h, hasta 5000 rutas
const MAX_SNAP_RADIUS_NM = 60;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function projectPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay, t: 0 };
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy, t };
}

// ── MinHeap ──────────────────────────────────────────────────────────────
class MinHeap {
  constructor() { this.data = []; }
  push(item) { this.data.push(item); this._up(this.data.length - 1); }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) { this.data[0] = last; this._down(0); }
    return top;
  }
  get size() { return this.data.length; }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].d <= this.data[i].d) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]]; i = p;
    }
  }
  _down(i) {
    const n = this.data.length;
    while (true) {
      let s = i, l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].d < this.data[s].d) s = l;
      if (r < n && this.data[r].d < this.data[s].d) s = r;
      if (s === i) break;
      [this.data[s], this.data[i]] = [this.data[i], this.data[s]]; i = s;
    }
  }
}

// ── Estado del módulo ────────────────────────────────────────────────────
let _graph = null; // { nodesById, edges, adjacency, segments }

function cumulativeDistances(path_) {
  const cum = [0];
  for (let i = 1; i < path_.length; i++) {
    const [lonA, latA] = path_[i - 1];
    const [lonB, latB] = path_[i];
    cum.push(cum[i - 1] + haversine(latA, lonA, latB, lonB));
  }
  return cum;
}

function buildGraph() {
  if (_graph) return _graph;
  const t0 = Date.now();

  const dataPath = path.join(__dirname, 'data', 'tmarea_nodos_nauticos_v1.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const nodesById = new Map();
  for (const n of data.nodos) nodesById.set(n.id, n);

  const adjacency = new Map(); // nodeId -> [{ to, edgeId, dist, confianza }]
  for (const n of data.nodos) adjacency.set(n.id, []);

  const edges = new Map(); // edgeId -> { ...edge, cum, length }
  const segments = []; // { edgeId, i, a, b, cumA }

  let nCuspsFixed = 0;
  for (const e of data.edges) {
    const smoothedPath = smoothCusps(e.path);
    if (smoothedPath.length !== e.path.length) nCuspsFixed++;
    const cum = cumulativeDistances(smoothedPath);
    const length = cum[cum.length - 1];
    edges.set(e.id, { ...e, path: smoothedPath, cum, length });

    if (!adjacency.has(e.from) || !adjacency.has(e.to)) {
      console.warn(`[NauticalGraph] Edge ${e.id} referencia nodo inexistente (${e.from} -> ${e.to})`);
      continue;
    }
    adjacency.get(e.from).push({ to: e.to, edgeId: e.id, dist: length, confianza: e.confianza });
    adjacency.get(e.to).push({ to: e.from, edgeId: e.id, dist: length, confianza: e.confianza });

    for (let i = 0; i < smoothedPath.length - 1; i++) {
      segments.push({ edgeId: e.id, i, a: smoothedPath[i], b: smoothedPath[i + 1], cumA: cum[i] });
    }
  }
  if (nCuspsFixed > 0) console.log(`[NauticalGraph] Cúspides suavizadas en ${nCuspsFixed} edge(s)`);

  _graph = { nodesById, edges, adjacency, segments };
  console.log(`[NauticalGraph] Grafo listo: ${nodesById.size} nodos, ${edges.size} edges, ${segments.length} segmentos (${Date.now() - t0}ms)`);
  return _graph;
}

// ── Snap: punto más cercano sobre CUALQUIER edge del grafo ──────────────
// Devuelve una lista ordenada de candidatos (para poder descartar los que
// crucen tierra y probar el siguiente).
function findSnapCandidates(lon, lat, graph) {
  const results = [];
  for (const seg of graph.segments) {
    const [ax, ay] = seg.a, [bx, by] = seg.b;
    const proj = projectPointOnSegment(lon, lat, ax, ay, bx, by);
    const d = haversine(lat, lon, proj.y, proj.x);
    if (d > MAX_SNAP_RADIUS_NM) continue;
    const edge = graph.edges.get(seg.edgeId);
    const segLen = haversine(ay, ax, by, bx);
    const cumAtProj = seg.cumA + segLen * proj.t;
    results.push({
      distNM: d,
      pt: [proj.x, proj.y],
      edgeId: seg.edgeId,
      cumAtProj,
      edgeLength: edge.length,
      fromNode: edge.from,
      toNode: edge.to,
      confianza: edge.confianza,
    });
  }
  results.sort((a, b) => a.distNM - b.distNM);
  return results.slice(0, 40); // suficientes candidatos para probar land-mask
}

// Intenta conectar dos puntos en línea recta; si la línea cruza la costa,
// prueba rodear el obstáculo usando los propios vértices del polígono de
// costa cercanos al punto de cruce (geometría real, no dato normativo
// inventado) antes de rendirse.
const DETOUR_MAX_STEPS = 14;
const DETOUR_STEP_SIZE = 2;
function simpleDetour(pointA, pointB) {
  const [ax, ay] = pointA, [bx, by] = pointB;
  const hit = coastlineGuard.findFirstCrossing(ax, ay, bx, by);
  if (!hit.crossesLand) return { coords: [pointA, pointB], ok: true, detoured: false };

  const { wayIdx, localIdx } = hit;
  const wLen = coastlineGuard.wayLength(wayIdx);
  for (let k = 1; k <= DETOUR_MAX_STEPS; k++) {
    for (const dir of [1, -1]) {
      const idx = localIdx + dir * k * DETOUR_STEP_SIZE;
      if (idx < 0 || idx >= wLen) continue;
      const via = coastlineGuard.wayVertex(wayIdx, idx);
      const c1 = coastlineGuard.crossesCoastline([pointA, via]);
      const c2 = coastlineGuard.crossesCoastline([via, pointB]);
      if (!c1.crossesLand && !c2.crossesLand) {
        return { coords: [pointA, via, pointB], ok: true, detoured: true };
      }
    }
  }
  return null; // no resuelto con un rodeo simple de un solo anillo
}

// Rodeo por grafo de visibilidad: cuando el obstáculo es un archipiélago
// (varias islas), caminar un solo anillo de costa no alcanza. Se arma un
// grafo con A, B y los vértices reales de costa cercanos al hueco, se unen
// los pares que "se ven" en línea recta sin tocar tierra, y se corre
// Dijkstra — un rodeo geométrico genuino, no una ruta inventada.
const VISIBILITY_MARGIN_DEG = 0.15;
const VISIBILITY_MAX_VERTS = 100;
function distPointToSegment(px, py, ax, ay, bx, by) {
  const proj = projectPointOnSegment(px, py, ax, ay, bx, by);
  return haversine(py, px, proj.y, proj.x);
}
function visibilityDetour(pointA, pointB) {
  const [ax, ay] = pointA, [bx, by] = pointB;
  const minLon = Math.min(ax, bx) - VISIBILITY_MARGIN_DEG, maxLon = Math.max(ax, bx) + VISIBILITY_MARGIN_DEG;
  const minLat = Math.min(ay, by) - VISIBILITY_MARGIN_DEG, maxLat = Math.max(ay, by) + VISIBILITY_MARGIN_DEG;

  let verts = coastlineGuard.verticesInBbox(minLon, minLat, maxLon, maxLat);
  if (verts.length > VISIBILITY_MAX_VERTS) {
    verts = verts
      .map(v => ({ v, d: distPointToSegment(v[0], v[1], ax, ay, bx, by) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, VISIBILITY_MAX_VERTS)
      .map(x => x.v);
  }
  if (verts.length === 0) return null;

  const nodes = [pointA, pointB, ...verts];
  const n = nodes.length;

  // Una sola búsqueda en el R-tree para todo el grafo de visibilidad, en vez
  // de una por cada uno de los O(n²) pares — evita miles de flatbush.search().
  const candIds = coastlineGuard.segmentIdsInBbox(minLon, minLat, maxLon, maxLat);

  const adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const [ix, iy] = nodes[i];
    for (let j = i + 1; j < n; j++) {
      const [jx, jy] = nodes[j];
      if (!coastlineGuard.crossesAnyOf(candIds, ix, iy, jx, jy)) {
        const d = haversine(iy, ix, jy, jx);
        adj[i].push({ to: j, d });
        adj[j].push({ to: i, d });
      }
    }
  }

  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  dist[0] = 0;
  const heap = new MinHeap();
  heap.push({ key: 0, d: 0 });
  while (heap.size > 0) {
    const { key: u, d: du } = heap.pop();
    if (visited[u]) continue;
    visited[u] = true;
    if (u === 1) break;
    for (const { to, d } of adj[u]) {
      const nd = du + d;
      if (nd < dist[to]) { dist[to] = nd; prev[to] = u; heap.push({ key: to, d: nd }); }
    }
  }
  if (dist[1] === Infinity) return null;

  const path = [];
  let cur = 1;
  while (cur !== -1) { path.unshift(nodes[cur]); cur = prev[cur]; }
  return { coords: path, ok: true, detoured: path.length > 2 };
}

// Los huecos/zigzags que esto resuelve son propiedades fijas del grafo
// troncal (mismos dos puntos, mismo obstáculo), no dependen del usuario —
// se memoiza para no recalcular el grafo de visibilidad en cada petición.
const _detourCache = new Map();
function detourCacheKey(pointA, pointB) {
  const r = 6;
  return `${pointA[0].toFixed(r)},${pointA[1].toFixed(r)}|${pointB[0].toFixed(r)},${pointB[1].toFixed(r)}`;
}
function connectAvoidingLand(pointA, pointB) {
  const key = detourCacheKey(pointA, pointB);
  const cached = _detourCache.get(key);
  if (cached) return cached;

  const hit = coastlineGuard.findFirstCrossing(pointA[0], pointA[1], pointB[0], pointB[1]);
  let result;
  if (!hit.crossesLand) {
    result = { coords: [pointA, pointB], ok: true, detoured: false };
  } else {
    result = simpleDetour(pointA, pointB) || visibilityDetour(pointA, pointB) ||
      { coords: [pointA, pointB], ok: false, detoured: false };
  }
  _detourCache.set(key, result);
  return result;
}

// ── Suavizado de cúspides (giros casi en U) ──────────────────────────────
// Algunos edges troncales traen, en su digitalización original, un vértice
// donde el rumbo gira más de ~120° y casi vuelve sobre sí mismo (ej. E-07
// cerca de Apiao/Quinchao) — se ve como una "M" o espiral en el mapa. No es
// un problema de Dijkstra (los pesos ya son distancia real, y ese tramo del
// grafo es una cadena lineal sin rutas alternativas) sino del propio trazado.
// Para cada cúspide se intenta: (a) saltarla en línea recta si no cruza
// tierra (glitch puro de digitalización), o (b) si el punto SÍ evita una
// obstrucción real, reemplazarlo por el mejor rodeo del grafo de visibilidad
// (más suave que el vértice original) — nunca se elimina a ciegas.
const CUSP_ANGLE_THRESHOLD_DEG = 120;
const CUSP_MAX_ITER = 15;

function bearingDeg(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function angleDiffDeg(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
function turnAngle(pA, pB, pC) {
  const b1 = bearingDeg(pA[1], pA[0], pB[1], pB[0]);
  const b2 = bearingDeg(pB[1], pB[0], pC[1], pC[0]);
  return angleDiffDeg(b1, b2);
}

function smoothCusps(coords) {
  if (coords.length < 3) return coords;
  let pts = coords.slice();
  for (let iter = 0; iter < CUSP_MAX_ITER; iter++) {
    let fixedAny = false;
    for (let i = 1; i < pts.length - 1; i++) {
      const turn = turnAngle(pts[i - 1], pts[i], pts[i + 1]);
      if (turn < CUSP_ANGLE_THRESHOLD_DEG) continue;
      const fix = connectAvoidingLand(pts[i - 1], pts[i + 1]);
      // Solo se elimina el vértice si conectar directo YA queda limpio (ruido
      // puro de digitalización). Si hace falta un rodeo (fix.detoured), el
      // giro es geométricamente necesario para pasar una punta de tierra real
      // — se conserva tal cual. Intentar "reemplazarlo" por otro rodeo fue lo
      // que producía una oscilación infinita (insertaba una vía y esa vía
      // volvía a marcarse como cúspide contra su propio vecino, sin converger).
      if (!fix.ok || fix.detoured) continue;
      pts.splice(i, 1);
      fixedAny = true;
      break; // el índice cambió, reiniciar el escaneo
    }
    if (!fixedAny) break;
  }
  return pts;
}

// Elige el mejor snap que no cruce tierra en el feeder [origen -> snap]
function snapWithLandMask(lon, lat, graph) {
  const candidates = findSnapCandidates(lon, lat, graph);
  if (candidates.length === 0) return null;

  let tried = 0;
  for (const c of candidates) {
    if (tried >= MAX_SNAP_CANDIDATES) break;
    tried++;
    const feederLine = [[lon, lat], c.pt];
    const check = coastlineGuard.crossesCoastline(feederLine);
    if (!check.crossesLand) {
      return { ...c, feederCrossesLand: false, sinDatosCosta: !!check.sinDatos };
    }
  }
  // Ninguno de los candidatos directos evita tierra: probar rodear el
  // obstáculo geométricamente sobre el candidato más cercano antes de rendirse.
  const best = candidates[0];
  const detour = connectAvoidingLand([lon, lat], best.pt);
  if (detour.ok) {
    return { ...best, feederCrossesLand: false, feederDetour: detour.detoured ? detour.coords : null };
  }
  return { ...candidates[0], feederCrossesLand: true };
}

// ── Dijkstra con nodos virtuales de origen/destino ───────────────────────
function dijkstraVirtual(graph, snapO, snapD) {
  // Si ambos snaps caen en el mismo edge: camino directo por ese edge, sin Dijkstra.
  if (snapO.edgeId === snapD.edgeId) {
    return { sameEdge: true };
  }

  const dist = new Map();
  const prev = new Map(); // nodeId -> { from, edgeId }
  const heap = new MinHeap();

  // Origen virtual: entra a la red por los dos extremos del edge donde cayó snapO
  const startOptions = [
    { node: snapO.fromNode, cost: snapO.cumAtProj },
    { node: snapO.toNode, cost: snapO.edgeLength - snapO.cumAtProj },
  ];
  for (const opt of startOptions) {
    if (!dist.has(opt.node) || opt.cost < dist.get(opt.node)) {
      dist.set(opt.node, opt.cost);
      prev.set(opt.node, { from: null, edgeId: snapO.edgeId, viaStart: true });
      heap.push({ key: opt.node, d: opt.cost });
    }
  }

  const visited = new Set();
  while (heap.size > 0) {
    const { key: cur, d: curDist } = heap.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);

    for (const { to, edgeId, dist: edgeDist } of (graph.adjacency.get(cur) || [])) {
      const nd = curDist + edgeDist;
      if (!dist.has(to) || nd < dist.get(to)) {
        dist.set(to, nd);
        prev.set(to, { from: cur, edgeId });
        heap.push({ key: to, d: nd });
      }
    }
  }

  // Destino virtual: sale de la red por los dos extremos del edge donde cayó snapD
  const endOptions = [
    { node: snapD.fromNode, cost: snapD.cumAtProj },
    { node: snapD.toNode, cost: snapD.edgeLength - snapD.cumAtProj },
  ];
  let best = null;
  for (const opt of endOptions) {
    if (!dist.has(opt.node)) continue;
    const total = dist.get(opt.node) + opt.cost;
    if (!best || total < best.total) best = { node: opt.node, total };
  }

  if (!best) return null;

  // Reconstruir secuencia de nodos
  const nodeSeq = [];
  let cur = best.node;
  while (cur !== null && cur !== undefined) {
    nodeSeq.unshift(cur);
    const p = prev.get(cur);
    if (!p || p.from === null) break;
    cur = p.from;
  }

  return { sameEdge: false, nodeSeq, prev, totalDist: best.total, endNode: best.node };
}

// Interpola el punto sobre edge.path correspondiente a una distancia acumulada `d`
function interpolateAtCum(edge, d) {
  const { cum, path: pts } = edge;
  if (d <= 0) return pts[0];
  if (d >= cum[cum.length - 1]) return pts[pts.length - 1];
  for (let i = 0; i < cum.length - 1; i++) {
    if (d >= cum[i] && d <= cum[i + 1]) {
      const span = cum[i + 1] - cum[i];
      const t = span === 0 ? 0 : (d - cum[i]) / span;
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
  }
  return pts[pts.length - 1];
}

// Extrae el sub-tramo de un edge entre dos distancias acumuladas [d1, d2],
// incluyendo los extremos exactos interpolados (no solo vértices existentes).
function extractSubpath(edge, d1, d2) {
  const reverse = d1 > d2;
  const lo = Math.min(d1, d2), hi = Math.max(d1, d2);
  const pts = [interpolateAtCum(edge, lo)];
  for (let i = 0; i < edge.path.length; i++) {
    if (edge.cum[i] > lo && edge.cum[i] < hi) pts.push(edge.path[i]);
  }
  pts.push(interpolateAtCum(edge, hi));
  return reverse ? pts.reverse() : pts;
}

function confianzaRank(c) {
  return { VERDE: 0, AMARILLO: 1, ROJO: 2 }[c] ?? 1;
}

function pathLength(coords) {
  let d = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    d += haversine(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return d;
}

function pointsMatch(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

// Repara cruces de tierra DENTRO del propio trazado de un tramo (no en sus
// uniones con otros tramos, eso ya lo resuelve bridgeGaps). Ocurre cuando un
// edge ya oficial del grafo troncal tiene, en algún punto de su digitalización,
// un pequeño zigzag que corta una punta de tierra. Se repara con el mismo
// rodeo geométrico; si no se puede, se marca ROJO en vez de ocultarlo.
function repairTramoInternal(tramo) {
  if (tramo.coords.length < 3) return tramo;
  const out = [tramo.coords[0]];
  let allResolved = true;
  for (let i = 0; i < tramo.coords.length - 1; i++) {
    const a = tramo.coords[i], b = tramo.coords[i + 1];
    const check = coastlineGuard.crossesCoastline([a, b]);
    if (!check.crossesLand) { out.push(b); continue; }
    const fix = connectAvoidingLand(a, b);
    for (let k = 1; k < fix.coords.length; k++) out.push(fix.coords[k]);
    if (!fix.ok) allResolved = false;
  }
  if (out.length === tramo.coords.length && allResolved) return tramo; // sin cambios
  return {
    ...tramo,
    coords: out,
    distancia_mn: Math.round(pathLength(out) * 10) / 10,
    confianza: allResolved ? tramo.confianza : 'ROJO',
    advertencia: allResolved
      ? (tramo.advertencia || 'Corregido: rodeo geométrico automático dentro del eje')
      : `${tramo.advertencia || ''} — cruce de costa interno no resuelto en la digitalización de este eje, verifique con carta SHOA`.trim(),
  };
}

// Suaviza codos agudos dentro de un tramo ya ensamblado (feeders y conectores
// entre edges son los más propensos, ya que insertan un único vértice de
// rodeo elegido solo por validez geométrica, no por prolijidad del ángulo).
// Usa el mismo smoothCusps validado contra costa — nunca reintroduce un cruce.
function smoothTramoAngles(tramo) {
  if (tramo.coords.length < 3) return tramo;
  const smoothed = smoothCusps(tramo.coords);
  if (smoothed.length === tramo.coords.length) return tramo;
  return { ...tramo, coords: smoothed, distancia_mn: Math.round(pathLength(smoothed) * 10) / 10 };
}

// smoothTramoAngles solo mira DENTRO de cada tramo — un giro brusco puede
// caer justo en la COSTURA entre dos tramos consecutivos (ej. el punto donde
// termina un conector y empieza el tramo de mar abierto siguiente). Esta
// pasada revisa esos empalmes y, igual que smoothCusps, solo elimina el
// punto de unión si conectar directo ya queda limpio — nunca lo reemplaza
// por un rodeo (eso ya lo intentó bridgeGaps al armar el conector).
function smoothJunctions(tramos) {
  const out = tramos.map(t => ({ ...t, coords: t.coords.slice() }));
  for (let iter = 0; iter < CUSP_MAX_ITER; iter++) {
    let fixedAny = false;
    for (let i = 0; i < out.length - 1; i++) {
      const curr = out[i], next = out[i + 1];
      if (curr.coords.length < 2 || next.coords.length < 2) continue;
      const joint = curr.coords[curr.coords.length - 1];
      if (!pointsMatch(joint, next.coords[0])) continue; // no están realmente empalmados
      if (next.coords.length < 2) continue;
      const prevPt = curr.coords[curr.coords.length - 2];
      const afterPt = next.coords[1];
      const turn = turnAngle(prevPt, joint, afterPt);
      if (turn < CUSP_ANGLE_THRESHOLD_DEG) continue;
      const fix = connectAvoidingLand(prevPt, afterPt);
      if (!fix.ok || fix.detoured) continue; // solo si saltar el empalme queda limpio directo
      curr.coords = [...curr.coords.slice(0, -1), afterPt];
      next.coords = next.coords.slice(1);
      curr.distancia_mn = Math.round(pathLength(curr.coords) * 10) / 10;
      next.distancia_mn = Math.round(pathLength(next.coords) * 10) / 10;
      fixedAny = true;
    }
    if (!fixedAny) break;
  }
  return out.filter(t => t.coords.length >= 2);
}

// Inserta un tramo conector explícito entre tramos consecutivos cuyas
// coordenadas no calzan exactamente (p.ej. dos edges del grafo troncal que
// nominalmente comparten un nodo pero cuyos paths digitalizados no llegan al
// mismo punto). Sin esto, la unión era una línea recta implícita, sin
// distancia contabilizada y sin validar contra tierra — la causa real de
// varios de los cruces detectados en la costa de Chiloé/Calbuco.
function bridgeGaps(tramos, advertencias) {
  const out = [];
  for (const t of tramos) {
    if (out.length > 0) {
      const prevLast = out[out.length - 1].coords[out[out.length - 1].coords.length - 1];
      const curFirst = t.coords[0];
      if (!pointsMatch(prevLast, curFirst)) {
        const detour = connectAvoidingLand(prevLast, curFirst);
        const gapDist = pathLength(detour.coords);
        out.push({
          confianza: detour.ok ? 'AMARILLO' : 'ROJO',
          coords: detour.coords,
          distancia_mn: Math.round(gapDist * 10) / 10,
          advertencia: detour.ok
            ? (detour.detoured ? 'Conector entre tramos (rodeo geométrico automático)' : 'Conector entre tramos')
            : 'Discontinuidad en datos de origen del grafo troncal — posible cruce de costa, verifique con carta SHOA',
        });
        if (!detour.ok) {
          advertencias.push(`Hueco no resuelto entre tramos cerca de [${prevLast[1].toFixed(3)},${prevLast[0].toFixed(3)}] — revisar con carta SHOA`);
        }
      }
    }
    out.push(t);
  }
  return out;
}

function routeCacheKey(latOrigen, lonOrigen, latDestino, lonDestino) {
  const r = ROUTE_CACHE_PRECISION;
  return [latOrigen, lonOrigen, latDestino, lonDestino].map(v => v.toFixed(r)).join(',');
}

function calcularRuta(latOrigen, lonOrigen, latDestino, lonDestino) {
  const key = routeCacheKey(latOrigen, lonOrigen, latDestino, lonDestino);
  const cached = routeCache.get(key);
  if (cached) {
    return { ...cached, cache: true };
  }
  const resultado = calcularRutaSinCache(latOrigen, lonOrigen, latDestino, lonDestino);
  routeCache.set(key, resultado);
  return resultado;
}

function calcularRutaSinCache(latOrigen, lonOrigen, latDestino, lonDestino) {
  const t0 = Date.now();
  const graph = buildGraph();
  coastlineGuard.ensureReady();

  const snapO = snapWithLandMask(lonOrigen, latOrigen, graph);
  const snapD = snapWithLandMask(lonDestino, latDestino, graph);

  if (!snapO || !snapD) {
    return {
      ok: true,
      motor: 'nautical-graph-v1',
      tramos: [{
        confianza: 'ROJO',
        coords: [[lonOrigen, latOrigen], [lonDestino, latDestino]],
        distancia_mn: Math.round(haversine(latOrigen, lonOrigen, latDestino, lonDestino) * 10) / 10,
        advertencia: 'Sin red náutica cercana (radio 60mn) — navegue con carta SHOA',
      }],
      distancia_mn: Math.round(haversine(latOrigen, lonOrigen, latDestino, lonDestino) * 10) / 10,
      advertencias: ['Origen o destino fuera de cobertura del grafo troncal'],
    };
  }

  const advertencias = [];
  const tramos = [];
  function pushTramo(coords, confianza, advertencia, distNM) {
    tramos.push({
      confianza,
      coords,
      distancia_mn: Math.round(distNM * 10) / 10,
      advertencia: advertencia || null,
    });
  }

  // Feeder origen
  const feederOConf = snapO.feederCrossesLand ? 'ROJO' : 'AMARILLO';
  if (snapO.feederCrossesLand) advertencias.push('El acceso al origen no pudo validarse libre de tierra — revise carta SHOA');
  const feederOCoords = snapO.feederDetour || [[lonOrigen, latOrigen], snapO.pt];
  pushTramo(feederOCoords, feederOConf,
    snapO.feederCrossesLand ? 'Acceso sin validar (posible cruce de costa)'
      : (snapO.feederDetour ? 'Acceso validado rodeando la costa' : 'Acceso validado contra línea de costa'),
    pathLength(feederOCoords));

  let trunkPathCoords = [];

  if (snapO.edgeId === snapD.edgeId) {
    const edge = graph.edges.get(snapO.edgeId);
    trunkPathCoords = extractSubpath(edge, snapO.cumAtProj, snapD.cumAtProj);
    const distNM = Math.abs(snapD.cumAtProj - snapO.cumAtProj);
    pushTramo(trunkPathCoords, edge.confianza, `Eje: ${edge.descripcion}`, distNM);
  } else {
    const result = dijkstraVirtual(graph, snapO, snapD);
    if (!result || !result.nodeSeq || result.nodeSeq.length === 0) {
      advertencias.push('No se encontró conexión en el grafo troncal entre origen y destino');
      pushTramo([snapO.pt, snapD.pt], 'ROJO', 'Sin ruta troncal — línea directa no validada', haversine(snapO.pt[1], snapO.pt[0], snapD.pt[1], snapD.pt[0]));
    } else {
      // Tramo inicial: desde snapO hasta el primer nodo de la secuencia
      const firstNode = result.nodeSeq[0];
      const startEdge = graph.edges.get(snapO.edgeId);
      const firstNodeCum = firstNode === startEdge.from ? 0 : startEdge.length;
      const initSeg = extractSubpath(startEdge, snapO.cumAtProj, firstNodeCum);
      if (initSeg.length > 1) {
        pushTramo(initSeg, startEdge.confianza, `Eje: ${startEdge.descripcion}`, Math.abs(firstNodeCum - snapO.cumAtProj));
      }

      // Tramos intermedios: nodo a nodo siguiendo prev[]
      for (let i = 0; i < result.nodeSeq.length - 1; i++) {
        const a = result.nodeSeq[i], b = result.nodeSeq[i + 1];
        const p = result.prev.get(b);
        const edge = graph.edges.get(p.edgeId);
        const coords = edge.from === a ? edge.path : [...edge.path].reverse();
        pushTramo(coords, edge.confianza, `Eje: ${edge.descripcion}`, edge.length);
      }

      // Tramo final: desde el último nodo hasta snapD
      const lastNode = result.endNode;
      const endEdge = graph.edges.get(snapD.edgeId);
      const lastNodeCum = lastNode === endEdge.from ? 0 : endEdge.length;
      const finalSeg = extractSubpath(endEdge, lastNodeCum, snapD.cumAtProj);
      if (finalSeg.length > 1) {
        pushTramo(finalSeg, endEdge.confianza, `Eje: ${endEdge.descripcion}`, Math.abs(snapD.cumAtProj - lastNodeCum));
      }
    }
  }

  // Feeder destino
  const feederDConf = snapD.feederCrossesLand ? 'ROJO' : 'AMARILLO';
  if (snapD.feederCrossesLand) advertencias.push('El acceso al destino no pudo validarse libre de tierra — revise carta SHOA');
  // snapD.feederDetour viene en orden [destino -> via -> snapD.pt]; invertir a [snapD.pt -> via -> destino]
  const feederDCoords = snapD.feederDetour ? [...snapD.feederDetour].reverse() : [snapD.pt, [lonDestino, latDestino]];
  pushTramo(feederDCoords, feederDConf,
    snapD.feederCrossesLand ? 'Acceso sin validar (posible cruce de costa)'
      : (snapD.feederDetour ? 'Acceso validado rodeando la costa' : 'Acceso validado contra línea de costa'),
    pathLength(feederDCoords));

  if (coastlineGuard.loadError) {
    advertencias.push(`Sin datos de costa para validar cruces: ${coastlineGuard.loadError}`);
  }

  const tramosConGaps = bridgeGaps(tramos, advertencias);
  const tramosSuavizados = tramosConGaps.map(repairTramoInternal).map(smoothTramoAngles);
  const tramosFinales = smoothJunctions(tramosSuavizados);
  for (const t of tramosFinales) {
    if (t.confianza === 'ROJO' && /no resuelto/.test(t.advertencia || '')) {
      advertencias.push(`Cruce de costa interno no resuelto en un eje del grafo troncal (${t.distancia_mn}mn) — verifique con carta SHOA`);
    }
  }
  const totalNMFinal = tramosFinales.reduce((s, t) => s + t.distancia_mn, 0);

  const fullCoords = tramosFinales.reduce((acc, t) => {
    for (const c of t.coords) {
      if (acc.length === 0 || acc[acc.length - 1][0] !== c[0] || acc[acc.length - 1][1] !== c[1]) acc.push(c);
    }
    return acc;
  }, []);

  const confianzaMinima = tramosFinales.reduce(
    (peor, t) => (confianzaRank(t.confianza) > confianzaRank(peor) ? t.confianza : peor),
    'VERDE'
  );

  console.log(`[NauticalGraph] Ruta calculada en ${Date.now() - t0}ms — ${tramosFinales.length} tramos, ${Math.round(totalNMFinal * 10) / 10}mn`);

  return {
    ok: true,
    motor: 'nautical-graph-v1',
    distancia_mn: Math.round(totalNMFinal * 10) / 10,
    confianza_minima: confianzaMinima,
    tramos: tramosFinales,
    coords: fullCoords,
    advertencias: [
      'Corredor de Referencia Tmarea — línea segmentada informativa.',
      'No reemplaza carta náutica SHOA. El patrón mantiene responsabilidad absoluta de la derrota.',
      ...advertencias,
    ],
  };
}

// Fuerza la carga e indexación del grafo troncal y de la costa al arrancar el
// servidor, para que ninguna petición pague ese costo de I/O/parseo.
// Los cruces de tierra dentro del grafo troncal (zigzags de digitalización,
// gaps entre edges que comparten nodo) son propiedades FIJAS del grafo, no
// dependen de qué usuario pida qué ruta. Resolverlos una sola vez aquí evita
// que la primera petición real de cada tramo pague el costo del grafo de
// visibilidad — con esto, ninguna petición debería tardar por esta causa.
function prewarmDetours() {
  const t0 = Date.now();
  const graph = buildGraph();
  let nGaps = 0;

  for (const edge of graph.edges.values()) {
    repairTramoInternal({ coords: edge.path, confianza: edge.confianza, advertencia: null, distancia_mn: 0 });
  }

  for (const [nodeId, neighbors] of graph.adjacency) {
    const endpoints = neighbors.map(({ edgeId }) => {
      const edge = graph.edges.get(edgeId);
      return edge.from === nodeId ? edge.path[0] : edge.path[edge.path.length - 1];
    });
    for (let i = 0; i < endpoints.length; i++) {
      for (let j = i + 1; j < endpoints.length; j++) {
        if (!pointsMatch(endpoints[i], endpoints[j])) {
          connectAvoidingLand(endpoints[i], endpoints[j]);
          nGaps++;
        }
      }
    }
  }

  console.log(`[NauticalGraph] Pre-calentado de costa: ${graph.edges.size} edges, ${nGaps} conectores entre edges resueltos (${Date.now() - t0}ms)`);
}

function warmup() {
  const t0 = Date.now();
  buildGraph();
  coastlineGuard.ensureReady();
  prewarmDetours();
  console.log(`[NauticalGraph] Warm-up completo (${Date.now() - t0}ms) — fuente costa: ${coastlineGuard.source || 'sin datos'}`);
}

module.exports = { buildGraph, calcularRuta, warmup, routeCache };
