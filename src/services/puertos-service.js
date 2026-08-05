const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'mapa_navegacion',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Convierte una fila de nodos_maritimos al shape que espera el frontend
function rowToPort(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    fuente: row.fuente,
    provincia: row.provincia || row.region || null,
    region: row.region || null,
    autoridad_maritima: row.autoridad_maritima || null,
    bahia_sitport_id: row.bahia_sitport_id || null,
    ubicacion: { lat: parseFloat(row.lat), lng: parseFloat(row.lng) },
    // Fallbacks planos para compatibilidad con código que use p.lat / p.lng
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
  };
}

async function getPuertos() {
  const { rows } = await pool.query(
    `SELECT id, nombre, tipo, fuente, provincia, region, autoridad_maritima, bahia_sitport_id,
            ST_Y(geom) AS lat, ST_X(geom) AS lng
     FROM nodos_maritimos
     ORDER BY nombre
     LIMIT 2000`
  );
  return rows.map(rowToPort);
}

async function searchPuertos(query, limit = 8) {
  const { rows } = await pool.query(
    `SELECT id, nombre, tipo, fuente, provincia, region, autoridad_maritima, bahia_sitport_id,
            ST_Y(geom) AS lat, ST_X(geom) AS lng
     FROM nodos_maritimos
     WHERE nombre_normalizado ILIKE $1
        OR nombre ILIKE $2
     ORDER BY
       CASE WHEN nombre_normalizado ILIKE $3 THEN 0 ELSE 1 END,
       nombre
     LIMIT $4`,
    [`%${query}%`, `%${query}%`, `${query}%`, limit]
  );
  return rows.map(rowToPort);
}

async function getPuertosByProvincia(provincia) {
  const { rows } = await pool.query(
    `SELECT id, nombre, tipo, fuente, provincia, region, autoridad_maritima, bahia_sitport_id,
            ST_Y(geom) AS lat, ST_X(geom) AS lng
     FROM nodos_maritimos
     WHERE LOWER(provincia) = LOWER($1)
        OR LOWER(region) = LOWER($1)
     ORDER BY nombre`,
    [provincia]
  );
  return rows.map(rowToPort);
}

async function getPuertosByProximidad(lat, lng, radiusKm = 50) {
  const radiusDeg = radiusKm / 111.0;
  const { rows } = await pool.query(
    `SELECT id, nombre, tipo, fuente, provincia, region, autoridad_maritima, bahia_sitport_id,
            ST_Y(geom) AS lat, ST_X(geom) AS lng,
            ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000 AS distancia_km
     FROM nodos_maritimos
     WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint($2, $1), 4326), $3)
     ORDER BY distancia_km
     LIMIT 50`,
    [lat, lng, radiusDeg]
  );
  return rows.map(r => ({ ...rowToPort(r), distancia_km: parseFloat(r.distancia_km) }));
}

module.exports = {
  getPuertos,
  searchPuertos,
  getPuertosByProvincia,
  getPuertosByProximidad,
};
