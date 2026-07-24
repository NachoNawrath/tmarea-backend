// src/services/nodos-service.js
// Tmarea — Motor de rutas náuticas basado en grafo de nodos
// Fuente: tmarea_nodos_nauticos_v1.json
// Análisis de densidad: 4,124 concesiones acuícolas activas (SUBPESCA)
// Normativa: TM-008 Art.45 DIRECTEMAR

const fs   = require('fs');
const path = require('path');

let _cache = null;

function loadGrafo() {
  if (_cache) return _cache;
  const filePath = path.join(__dirname, 'data', 'tmarea_nodos_nauticos_v1.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  _cache = JSON.parse(raw);
  return _cache;
}

// Distancia Haversine en millas náuticas
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Encontrar nodo más cercano a coordenadas dadas
function nodoCercano(lat, lon, nodos, radioMaxMn = 300) {
  let mejor = null;
  let mejorDist = Infinity;
  for (const n of nodos) {
    const d = haversine(lat, lon, n.lat, n.lon);
    if (d < mejorDist && d <= radioMaxMn) {
      mejorDist = d;
      mejor = n;
    }
  }
  return { nodo: mejor, distancia: mejorDist };
}

// BFS sobre el grafo para encontrar camino entre dos nodos
function bfsRuta(idOrigen, idDestino, nodos, edges) {
  if (idOrigen === idDestino) return [idOrigen];

  const visitado = new Set();
  const cola = [[idOrigen, [idOrigen]]];

  const adj = {};
  for (const n of nodos) adj[n.id] = [];
  for (const e of edges) {
    if (adj[e.from]) adj[e.from].push({ to: e.to, edge: e });
    if (adj[e.to])   adj[e.to].push({ to: e.from, edge: e });
  }

  while (cola.length > 0) {
    const [actual, camino] = cola.shift();
    if (visitado.has(actual)) continue;
    visitado.add(actual);

    for (const { to } of (adj[actual] || [])) {
      if (to === idDestino) return [...camino, to];
      if (!visitado.has(to)) cola.push([to, [...camino, to]]);
    }
  }
  return null;
}

// Función principal: calcular ruta entre dos puntos
function calcularRuta(latOrigen, lonOrigen, latDestino, lonDestino) {
  const grafo = loadGrafo();
  const { nodos, edges } = grafo;

  const { nodo: nOrigen, distancia: dOrigen } = nodoCercano(latOrigen, lonOrigen, nodos);
  const { nodo: nDestino, distancia: dDestino } = nodoCercano(latDestino, lonDestino, nodos);

  if (!nOrigen || !nDestino) {
    return {
      ok: false,
      error: 'No se encontró nodo náutico cercano al origen o destino',
      advertencias: ['Zona fuera del corredor náutico de Tmarea']
    };
  }

  if (nOrigen.id === nDestino.id) {
    return {
      ok: true,
      tramos: [{
        desde: nOrigen.nombre,
        hasta: nDestino.nombre,
        confianza: nOrigen.confianza,
        coords: [[lonOrigen, latOrigen], [lonDestino, latDestino]],
        distancia_mn: haversine(latOrigen, lonOrigen, latDestino, lonDestino),
        advertencia: null
      }],
      distancia_total_mn: haversine(latOrigen, lonOrigen, latDestino, lonDestino),
      advertencias: [grafo.meta.nota_uso]
    };
  }

  const caminoIds = bfsRuta(nOrigen.id, nDestino.id, nodos, edges);

  if (!caminoIds) {
    return {
      ok: true,
      tramos: [{
        desde: nOrigen.nombre,
        hasta: nDestino.nombre,
        confianza: 'ROJO',
        coords: [[lonOrigen, latOrigen], [lonDestino, latDestino]],
        distancia_mn: haversine(latOrigen, lonOrigen, latDestino, lonDestino),
        advertencia: 'Sin ruta náutica definida — navegue con carta SHOA y criterio propio'
      }],
      distancia_total_mn: haversine(latOrigen, lonOrigen, latDestino, lonDestino),
      advertencias: [
        'Ruta sin cobertura en el grafo náutico de Tmarea',
        grafo.meta.nota_uso
      ]
    };
  }

  const nodoMap = {};
  for (const n of nodos) nodoMap[n.id] = n;

  const edgeMap = {};
  for (const e of edges) {
    edgeMap[`${e.from}-${e.to}`] = e;
    edgeMap[`${e.to}-${e.from}`] = e;
  }

  const tramos = [];
  let distanciaTotal = 0;

  // Tramo inicial: origen real → primer nodo del grafo
  if (dOrigen > 0.5) {
    const primerNodo = nodoMap[caminoIds[0]];
    const d = haversine(latOrigen, lonOrigen, primerNodo.lat, primerNodo.lon);
    tramos.push({
      desde: 'Origen',
      hasta: primerNodo.nombre,
      confianza: 'AMARILLO',
      coords: [[lonOrigen, latOrigen], [primerNodo.lon, primerNodo.lat]],
      distancia_mn: Math.round(d * 10) / 10,
      advertencia: 'Acceso al corredor náutico — navegue con precaución'
    });
    distanciaTotal += d;
  }

  // Tramos del grafo — usando path del edge si existe
  for (let i = 0; i < caminoIds.length - 1; i++) {
    const idA = caminoIds[i];
    const idB = caminoIds[i + 1];
    const nA = nodoMap[idA];
    const nB = nodoMap[idB];
    const edge = edgeMap[`${idA}-${idB}`];

    const confianza = edge
      ? edge.confianza
      : (nA.confianza === 'VERDE' && nB.confianza === 'VERDE' ? 'VERDE' : 'AMARILLO');

    const advertencia = confianza === 'ROJO'
      ? 'Tramo sin ruta validada — navegue con carta SHOA y criterio propio'
      : confianza === 'AMARILLO'
        ? 'Corredor de referencia Tmarea — línea segmentada informativa'
        : null;

    // ── CLAVE: usar path del edge si existe, sino línea directa entre nodos ──
    let coords;
    if (edge && edge.path && edge.path.length >= 2) {
      // El path puede estar en orden normal o inverso según dirección del viaje
      const pathNormal   = edge.path;
      const pathInverso  = [...edge.path].reverse();
      // Determinar dirección: comparar primer punto del path con nodo A
      const distNormal  = haversine(nA.lat, nA.lon, pathNormal[0][1], pathNormal[0][0]);
      const distInverso = haversine(nA.lat, nA.lon, pathInverso[0][1], pathInverso[0][0]);
      coords = distNormal <= distInverso ? pathNormal : pathInverso;
    } else {
      coords = [[nA.lon, nA.lat], [nB.lon, nB.lat]];
    }

    const d = edge?.distancia_mn || haversine(nA.lat, nA.lon, nB.lat, nB.lon);
    distanciaTotal += d;

    tramos.push({
      desde: nA.nombre,
      hasta: nB.nombre,
      confianza,
      coords,
      distancia_mn: Math.round(d * 10) / 10,
      advertencia,
      ref_normativa: edge?.descripcion || null
    });
  }

  // Tramo final: último nodo → destino real
  if (dDestino > 0.5) {
    const ultimoNodo = nodoMap[caminoIds[caminoIds.length - 1]];
    const d = haversine(ultimoNodo.lat, ultimoNodo.lon, latDestino, lonDestino);
    tramos.push({
      desde: ultimoNodo.nombre,
      hasta: 'Destino',
      confianza: 'AMARILLO',
      coords: [[ultimoNodo.lon, ultimoNodo.lat], [lonDestino, latDestino]],
      distancia_mn: Math.round(d * 10) / 10,
      advertencia: 'Acceso al destino desde corredor náutico — navegue con precaución'
    });
    distanciaTotal += d;
  }

  return {
    ok: true,
    nodo_origen: nOrigen.nombre,
    nodo_destino: nDestino.nombre,
    tramos,
    distancia_total_mn: Math.round(distanciaTotal * 10) / 10,
    advertencias: [grafo.meta.nota_uso]
  };
}

module.exports = { calcularRuta, loadGrafo };
