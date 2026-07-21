// src/services/routes-service.js
// Tmarea — Rutas náuticas del Corredor Austral
// Fuente: tmarea_rutas_australes.json (Art. 45, TM-008, DS 397/1985)

const fs = require('fs');
const path = require('path');

let _cache = null;

function loadData() {
  if (_cache) return _cache;
  const filePath = path.join(__dirname, 'data', 'tmarea_rutas_australes.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  _cache = JSON.parse(raw);
  return _cache;
}

// Construye un mapa id → estación para lookup rápido
function buildEstacionMap(data) {
  return data.estaciones_practicos.reduce((acc, e) => {
    acc[e.id] = e;
    return acc;
  }, {});
}

// Devuelve todas las rutas con sus waypoints ensamblados
function getAllRoutes() {
  const data = loadData();
  const estMap = buildEstacionMap(data);

  return data.rutas.map(ruta => {
    const estEntrada = estMap[ruta.estacion_entrada] || null;
    const estSalida  = ruta.estacion_salida ? (estMap[ruta.estacion_salida] || null) : null;

    // Waypoints de la ruta: entrada → (salida si existe)
    // Usamos los waypoints de cada estación para trazar la línea
    const waypointsEntrada = estEntrada ? estEntrada.waypoints : [];
    const waypointsSalida  = estSalida  ? estSalida.waypoints  : [];

    // Línea completa: waypoints entrada + waypoints salida (sin duplicar la estación)
    const lineaCoords = [
      ...waypointsEntrada.map(w => ({ nombre: w.nombre, lat: w.lat, lon: w.lon })),
      ...waypointsSalida.map(w => ({ nombre: w.nombre, lat: w.lat, lon: w.lon })),
    ];

    return {
      id:                    ruta.id,
      art45:                 ruta.art45,
      nombre:                ruta.nombre,
      area:                  ruta.area,
      pilotaje_obligatorio:  ruta.pilotaje_obligatorio,
      notas:                 ruta.notas,
      estacion_entrada: estEntrada ? {
        id:     estEntrada.id,
        nombre: estEntrada.nombre,
        lat:    estEntrada.lat,
        lon:    estEntrada.lon,
        ref:    estEntrada.ref,
      } : null,
      estacion_salida: estSalida ? {
        id:     estSalida.id,
        nombre: estSalida.nombre,
        lat:    estSalida.lat,
        lon:    estSalida.lon,
        ref:    estSalida.ref,
      } : null,
      waypoints: lineaCoords,
    };
  });
}

// Devuelve todas las estaciones con sus waypoints (para capa de marcadores)
function getAllEstaciones() {
  const data = loadData();
  return data.estaciones_practicos.map(e => ({
    id:        e.id,
    nombre:    e.nombre,
    lat:       e.lat,
    lon:       e.lon,
    ref:       e.ref,
    grupo:     e.grupo,
    waypoints: e.waypoints,
  }));
}

// Devuelve las reglas del motor (para uso futuro en el Decision Engine)
function getReglas() {
  return loadData().reglas_motor;
}

// Devuelve las áreas geográficas
function getAreas() {
  return loadData().areas_geograficas;
}

// Encuentra rutas relevantes dado un bbox (lat1,lon1 → lat2,lon2)
// Una ruta es relevante si alguno de sus waypoints cae dentro del bbox
function getRoutesInBbox(lat1, lon1, lat2, lon2) {
  const minLat = Math.min(lat1, lat2);
  const maxLat = Math.max(lat1, lat2);
  const minLon = Math.min(lon1, lon2);
  const maxLon = Math.max(lon1, lon2);

  return getAllRoutes().filter(ruta => {
    // Incluir si la estación de entrada está en bbox
    if (ruta.estacion_entrada) {
      const { lat, lon } = ruta.estacion_entrada;
      if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) return true;
    }
    // O si algún waypoint está en bbox
    return ruta.waypoints.some(w =>
      w.lat >= minLat && w.lat <= maxLat && w.lon >= minLon && w.lon <= maxLon
    );
  });
}

module.exports = {
  getAllRoutes,
  getAllEstaciones,
  getReglas,
  getAreas,
  getRoutesInBbox,
};
