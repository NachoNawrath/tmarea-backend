// src/services/map-service.js
// Conecta PostGIS y sirve GeoJSON para MapLibre GL JS
// Tablas: batimetria, mapa_base_multipoligonos, seamarks_puntos

const { Pool } = require('pg');

// ─────────────────────────────────────────────────────────────────────────────
// CONEXIÓN POSTGIS
// La contraseña se inyecta desde .env (DB_PASSWORD)
// ─────────────────────────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'mapa_local',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,                    // máximo 10 conexiones simultáneas
  idleTimeoutMillis: 30000,   // liberar conexiones inactivas tras 30s
  connectionTimeoutMillis: 5000, // timeout de conexión 5s
});

// Test de conexión al arrancar
pool.connect()
  .then(client => {
    console.log('[map-service] ✅ Conectado a PostGIS (mapa_local)');
    client.release();
  })
  .catch(err => {
    console.error('[map-service] ❌ Error conectando a PostGIS:', err.message);
  });

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: calcular BBOX con buffer en grados (~buffer_mn millas náuticas)
// 1 mn ≈ 0.01667 grados
// ─────────────────────────────────────────────────────────────────────────────
function calcularBBox(lat1, lng1, lat2, lng2, buffer_mn = 10) {
  const buffer = buffer_mn * 0.01667;
  return {
    minLng: Math.min(lng1, lng2) - buffer,
    maxLng: Math.max(lng1, lng2) + buffer,
    minLat: Math.min(lat1, lat2) - buffer,
    maxLat: Math.max(lat1, lat2) + buffer,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: query con timeout y manejo de errores
// ─────────────────────────────────────────────────────────────────────────────
async function queryPostGIS(sql, params = []) {
  const client = await pool.connect();
  try {
    // Timeout de 15s por consulta espacial
    await client.query('SET statement_timeout = 15000');
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BATIMETRÍA — líneas de profundidad dentro del BBOX
// Retorna GeoJSON FeatureCollection
// ─────────────────────────────────────────────────────────────────────────────
async function getBatimetria(bbox) {
  const { minLng, maxLng, minLat, maxLat } = bbox;

  const sql = `
    SELECT elev, ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Transform(geom, 4326), 0.001))::json AS geometry FROM batimetria WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326) AND elev IN (0, -10, -20, -50, -100, -200, -500) LIMIT 100
  `;

  const rows = await queryPostGIS(sql, [minLng, minLat, maxLng, maxLat]);

  return {
    type: 'FeatureCollection',
    features: rows.map(r => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: {
        elev: r.elev,
        id:   r.id,
      },
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COSTA Y POLÍGONOS BASE — multipolígonos dentro del BBOX
// Filtrado por natural/landuse para excluir ruido OSM
// ─────────────────────────────────────────────────────────────────────────────
async function getMapaBase(bbox) {
  const { minLng, maxLng, minLat, maxLat } = bbox;

  const sql = `
    SELECT
      id,
      name,
      natural,
      landuse,
      land_area,
      "type",
      ST_AsGeoJSON(
        ST_SimplifyPreserveTopology(
          ST_Transform(geom, 4326),
          0.0001  -- simplificación para reducir peso al móvil
        )
      )::json AS geometry
    FROM mapa_base_multipoligonos
    WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      AND (
        natural IS NOT NULL OR
        landuse IS NOT NULL OR
        land_area IS NOT NULL OR
        "type" IS NOT NULL
      )
    LIMIT 500
  `;

  const rows = await queryPostGIS(sql, [minLng, minLat, maxLng, maxLat]);

  return {
    type: 'FeatureCollection',
    features: rows.map(r => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: {
        id:        r.id,
        name:      r.name,
        natural:   r.natural,
        landuse:   r.landuse,
        land_area: r.land_area,
        type:      r.type,
      },
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SEAMARKS — balizas, faros y señalización marítima dentro del BBOX
// ─────────────────────────────────────────────────────────────────────────────
async function getSeamarks(bbox) {
  const { minLng, maxLng, minLat, maxLat } = bbox;

  const sql = `
    SELECT
      id,
      name,
      man_made,
      ref,
      "is_in",
      ST_AsGeoJSON(
        ST_Transform(geom, 4326)
      )::json AS geometry
    FROM seamarks_puntos
    WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    LIMIT 500
  `;

  const rows = await queryPostGIS(sql, [minLng, minLat, maxLng, maxLat]);

  return {
    type: 'FeatureCollection',
    features: rows.map(r => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: {
        id:       r.id,
        name:     r.name,
        man_made: r.man_made,
        ref:      r.ref,
        is_in:    r.is_in,
      },
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FUNCIÓN PRINCIPAL — todas las capas para un tramo de ruta
// Recibe: { lat1, lng1, lat2, lng2, buffer_mn }
// Retorna: { bbox, batimetria, mapa_base, seamarks }
// ─────────────────────────────────────────────────────────────────────────────
async function getCapasRuta({ lat1, lng1, lat2, lng2, buffer_mn = 10 }) {
  const bbox = calcularBBox(lat1, lng1, lat2, lng2, buffer_mn);

  // Todas las capas en paralelo — si una falla, las otras siguen
  const [batimetriaResult, mapaBaseResult, searmarksResult] = await Promise.allSettled([
    getBatimetria(bbox),
    getMapaBase(bbox),
    getSeamarks(bbox),
  ]);

  return {
    bbox,
    batimetria: batimetriaResult.status === 'fulfilled'
      ? batimetriaResult.value
      : { type: 'FeatureCollection', features: [], error: batimetriaResult.reason?.message },
    mapa_base: mapaBaseResult.status === 'fulfilled'
      ? mapaBaseResult.value
      : { type: 'FeatureCollection', features: [], error: mapaBaseResult.reason?.message },
    seamarks: searmarksResult.status === 'fulfilled'
      ? searmarksResult.value
      : { type: 'FeatureCollection', features: [], error: searmarksResult.reason?.message },
  };
}

module.exports = { getCapasRuta, calcularBBox };


