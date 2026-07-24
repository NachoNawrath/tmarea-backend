// src/services/osm-router-service.js
// Tmarea — Motor de routing náutico sobre red OSM
// Pre-build del grafo global en startup + Dijkstra con MinHeap

const fs   = require('fs');
const path = require('path');

let _graph = null; // grafo global pre-buildeado

// ── MinHeap ───────────────────────────────────────────────────────────────
class MinHeap {
  constructor() { this.data = []; }
  push(item) { this.data.push(item); this._up(this.data.length-1); }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) { this.data[0] = last; this._down(0); }
    return top;
  }
  get size() { return this.data.length; }
  _up(i) {
    while (i > 0) {
      const p = (i-1)>>1;
      if (this.data[p].d <= this.data[i].d) break;
      [this.data[p],this.data[i]] = [this.data[i],this.data[p]]; i=p;
    }
  }
  _down(i) {
    const n = this.data.length;
    while (true) {
      let s=i, l=2*i+1, r=2*i+2;
      if (l<n && this.data[l].d<this.data[s].d) s=l;
      if (r<n && this.data[r].d<this.data[s].d) s=r;
      if (s===i) break;
      [this.data[s],this.data[i]]=[this.data[i],this.data[s]]; i=s;
    }
  }
}

function haversine(lat1,lon1,lat2,lon2) {
  const R=3440.065, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function coordKey(lon, lat) {
  return `${lon.toFixed(4)},${lat.toFixed(4)}`;
}

// ── Build grafo global ────────────────────────────────────────────────────
function buildGraph() {
  if (_graph) return _graph;

  const t0 = Date.now();
  const filePath = path.join(__dirname, 'data', 'red_nautica_chile_completa.geojson');
  const geojson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const nodeCoords = new Map(); // key -> {lon, lat}
  const adjacency  = new Map(); // key -> [{to, dist}]

  function addNode(lon, lat) {
    const k = coordKey(lon, lat);
    if (!nodeCoords.has(k)) {
      nodeCoords.set(k, [lon, lat]);
      adjacency.set(k, []);
    }
    return k;
  }

function ferryPenalty(feat) {
    const props = feat.properties || {};
    // Rutas custom tmarea: costo base sin penalización
    if (props.source === 'tmarea_custom') return 1.0;
    // Ferries OSM: penalizar para que el algoritmo prefiera canales directos
    if (props.route === 'ferry') return 1.5;
    if (props.ferry === 'trunk') return 2.0;
    if (props.ferry === 'primary') return 4.0;
    return 1.0;
}

  function addEdge(kA, kB, la, loa, lb, lob, penalty) {
    const d = haversine(la, loa, lb, lob) * (penalty || 1.0);
    if (d < 0.001) return;
    adjacency.get(kA).push({ to: kB, dist: d });
    adjacency.get(kB).push({ to: kA, dist: d });
  } 

// 1. Agregar todos los segmentos con penalización por tipo de vía
  for (const feat of geojson.features) {
    const coords = feat.geometry.coordinates;
    if (coords.length < 2) continue;
    const penalty = ferryPenalty(feat);
    const keys = coords.map(([lon,lat]) => addNode(lon, lat));
    for (let i = 0; i < keys.length-1; i++) {
      const [lonA, latA] = coords[i];
      const [lonB, latB] = coords[i+1];
      addEdge(keys[i], keys[i+1], latA, lonA, latB, lonB, penalty);
    }
  }

  // 2. Conectar endpoints cercanos (tolerancia 3mn)
  const TOLERANCE = 3.0;
  const endpoints = [];
  for (const feat of geojson.features) {
    const c = feat.geometry.coordinates;
    if (c.length >= 2) {
      endpoints.push(coordKey(c[0][0], c[0][1]));
      endpoints.push(coordKey(c[c.length-1][0], c[c.length-1][1]));
    }
  }
  const uniqEndpoints = [...new Set(endpoints)];

  for (let i = 0; i < uniqEndpoints.length; i++) {
    const kA = uniqEndpoints[i];
    const cA = nodeCoords.get(kA);
    if (!cA) continue;
    for (let j = i+1; j < uniqEndpoints.length; j++) {
      const kB = uniqEndpoints[j];
      const cB = nodeCoords.get(kB);
      if (!cB) continue;
      const d = haversine(cA[1], cA[0], cB[1], cB[0]);
      if (d > 0.001 && d < TOLERANCE) {
        const exists = adjacency.get(kA)?.some(e => e.to === kB);
        if (!exists) {
          adjacency.get(kA).push({ to: kB, dist: d });
          adjacency.get(kB).push({ to: kA, dist: d });
        }
      }
    }
  }

  const nAristas = Array.from(adjacency.values()).reduce((s,a)=>s+a.length,0)/2;
  console.log(`[OSM-Router] Grafo: ${nodeCoords.size} nodos, ${nAristas} aristas (${Date.now()-t0}ms)`);

  _graph = { nodeCoords, adjacency };
  return _graph;
}

// Pre-build al iniciar el módulo
setTimeout(() => { try { buildGraph(); } catch(e) { console.error('[OSM-Router] Error build:', e.message); }}, 100);

// ── Snap al nodo más cercano ──────────────────────────────────────────────
function snapToGraph(lon, lat, nodeCoords, maxMn=100) {
  let bestKey=null, bestDist=Infinity;
  for (const [k, [nlon,nlat]] of nodeCoords) {
    const d = haversine(lat, lon, nlat, nlon);
    if (d < bestDist && d <= maxMn) { bestDist=d; bestKey=k; }
  }
  return { key: bestKey, dist: bestDist };
}

// ── Dijkstra con bbox filter para velocidad ───────────────────────────────
function dijkstra(startKey, endKey, adjacency, nodeCoords, latO, lonO, latD, lonD) {
  // Bbox expandido para guiar la búsqueda
  const marginDeg = 2.5;
  const minLat = Math.min(latO,latD) - marginDeg;
  const maxLat = Math.max(latO,latD) + marginDeg;
  const minLon = Math.min(lonO,lonD) - marginDeg;
  const maxLon = Math.max(lonO,lonD) + marginDeg;

  function inBbox(k) {
    const c = nodeCoords.get(k);
    if (!c) return false;
    return c[1]>=minLat && c[1]<=maxLat && c[0]>=minLon && c[0]<=maxLon;
  }

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const heap = new MinHeap();

  dist.set(startKey, 0);
  heap.push({ key: startKey, d: 0 });

  while (heap.size > 0) {
    const { key: cur, d: curDist } = heap.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (cur === endKey) break;

    for (const { to, dist: edgeDist } of (adjacency.get(cur) || [])) {
      if (visited.has(to)) continue;
      if (!inBbox(to) && to !== endKey) continue; // skip fuera del bbox
      const newDist = curDist + edgeDist;
      if (!dist.has(to) || newDist < dist.get(to)) {
        dist.set(to, newDist);
        prev.set(to, cur);
        heap.push({ key: to, d: newDist });
      }
    }
  }

  if (!dist.has(endKey)) return null;

  const path = [];
  let cur = endKey;
  while (cur) { path.unshift(cur); cur = prev.get(cur); }
  return { path, totalDist: dist.get(endKey) };
}

// ── Función principal ─────────────────────────────────────────────────────
function calcularRutaOSM(latOrigen, lonOrigen, latDestino, lonDestino) {
  const t0 = Date.now();
  const { nodeCoords, adjacency } = buildGraph();

  const snapO = snapToGraph(lonOrigen, latOrigen, nodeCoords);
  const snapD = snapToGraph(lonDestino, latDestino, nodeCoords);

  if (!snapO.key || !snapD.key) {
    return { ok: false, error: 'Sin red náutica cercana al origen o destino' };
  }

  const resultado = dijkstra(
    snapO.key, snapD.key, adjacency, nodeCoords,
    latOrigen, lonOrigen, latDestino, lonDestino
  );

  console.log(`[OSM-Router] Ruta calculada en ${Date.now()-t0}ms`);

  if (!resultado) {
    return {
      ok: true,
      tramos: [{
        desde: 'Origen', hasta: 'Destino', confianza: 'ROJO',
        coords: [[lonOrigen,latOrigen],[lonDestino,latDestino]],
        distancia_mn: haversine(latOrigen,lonOrigen,latDestino,lonDestino),
        advertencia: 'Sin ruta náutica — navegue con carta SHOA'
      }],
      distancia_total_mn: haversine(latOrigen,lonOrigen,latDestino,lonDestino),
      advertencias: ['Ruta no encontrada en red OSM']
    };
  }

  const routeCoords = resultado.path.map(k => nodeCoords.get(k));
  const tramos = [];
  let distTotal = 0;

  const coordO = nodeCoords.get(snapO.key);
  const coordD = nodeCoords.get(snapD.key);

  if (snapO.dist > 0.1) {
    tramos.push({ desde:'Origen', hasta:'Red náutica', confianza:'AMARILLO',
      coords:[[lonOrigen,latOrigen], coordO],
      distancia_mn: Math.round(snapO.dist*10)/10,
      advertencia:'Acceso al corredor náutico' });
    distTotal += snapO.dist;
  }

  tramos.push({ desde:'Red náutica inicio', hasta:'Red náutica fin', confianza:'AMARILLO',
    coords: routeCoords,
    distancia_mn: Math.round(resultado.totalDist*10)/10,
    advertencia:'Corredor de Referencia Tmarea — vías náuticas OSM' });
  distTotal += resultado.totalDist;

  if (snapD.dist > 0.1) {
    tramos.push({ desde:'Red náutica', hasta:'Destino', confianza:'AMARILLO',
      coords:[coordD, [lonDestino,latDestino]],
      distancia_mn: Math.round(snapD.dist*10)/10,
      advertencia:'Acceso al destino' });
    distTotal += snapD.dist;
  }

  return {
    ok: true, tramos,
    distancia_total_mn: Math.round(distTotal*10)/10,
    advertencias: [
      'Corredor de Referencia Tmarea — línea segmentada informativa.',
      'No reemplaza carta náutica SHOA. El patrón mantiene responsabilidad absoluta de la derrota.'
    ]
  };
}

module.exports = { calcularRutaOSM, buildGraph };
