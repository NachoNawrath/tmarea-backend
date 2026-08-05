/**
 * Seed script: tabla nodos_maritimos
 * Fuentes: MOP (644), SERNAPESCA (569), manual (19), SITPORT (163)
 * Deduplicación por proximidad geográfica (ST_DWithin)
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'mapa_navegacion',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

const DATA_DIR = path.join(__dirname, '../src/services/data');
const ROOT_DIR = path.join(__dirname, '..');

const stats = { MOP: 0, SERNAPESCA: 0, MANUAL: 0, SITPORT: 0 };
const skipped = { SERNAPESCA: 0, MANUAL: 0, SITPORT: 0 };

// Inferir tipo desde el nombre MOP
function inferirTipoMOP(nombre) {
  const n = nombre.toLowerCase();
  if (n.startsWith('caleta')) return 'Caleta';
  if (n.startsWith('terminal')) return 'Terminal';
  if (n.startsWith('muelle')) return 'Muelle';
  if (n.startsWith('rampa')) return 'Rampa';
  if (n.startsWith('puerto')) return 'Puerto';
  if (n.startsWith('defensa costera') || n.startsWith('borde costero')) return 'Defensa Costera';
  if (n.startsWith('embarcadero')) return 'Embarcadero';
  return 'Infraestructura Portuaria';
}

// Verificar si ya existe un nodo dentro de dist_deg grados
async function existeNodoCercano(client, lng, lat, distDeg) {
  const res = await client.query(
    `SELECT 1 FROM nodos_maritimos
     WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
     LIMIT 1`,
    [lng, lat, distDeg]
  );
  return res.rowCount > 0;
}

async function insertarNodo(client, { nombre, tipo, fuente, fuente_id, region, provincia, comuna, lng, lat }) {
  await client.query(
    `INSERT INTO nodos_maritimos
       (nombre, nombre_normalizado, tipo, fuente, fuente_id, region, provincia, comuna, geom)
     VALUES
       ($1, normalizar_nombre($2), $3, $4, $5, $6, $7, $8,
        ST_SetSRID(ST_MakePoint($9, $10), 4326))`,
    [nombre, nombre, tipo, fuente, fuente_id || null, region || null, provincia || null, comuna || null, lng, lat]
  );
}

async function seedMOP(client) {
  console.log('\n--- MOP (puertos_chile_nacional.json) ---');
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'puertos_chile_nacional.json'), 'utf8'));
  const features = raw.features || [];

  let ok = 0, bad = 0;
  for (const f of features) {
    const { NOMBRE, LOCATION, PROVINCIA, COMUNA, COD_REG } = f.attributes || {};
    const { x, y } = f.geometry || {};
    if (!NOMBRE || x == null || y == null || isNaN(x) || isNaN(y)) { bad++; continue; }
    if (Math.abs(x) > 180 || Math.abs(y) > 90) { bad++; continue; }
    await insertarNodo(client, {
      nombre: NOMBRE,
      tipo: inferirTipoMOP(NOMBRE),
      fuente: 'MOP',
      fuente_id: LOCATION || null,
      region: COD_REG || null,
      provincia: PROVINCIA || null,
      comuna: COMUNA || null,
      lng: x,
      lat: y,
    });
    ok++;
  }
  stats.MOP = ok;
  console.log(`  Insertados: ${ok} | Omitidos (sin coords): ${bad}`);
}

async function seedSERNAPESCA(client) {
  console.log('\n--- SERNAPESCA (caletas_chile.json) ---');
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'caletas_chile.json'), 'utf8'));
  const caletas = Array.isArray(raw) ? raw : raw.features || [];

  const DIST_DEG = 0.005; // ~500m
  let ok = 0, skip = 0;
  for (const c of caletas) {
    const lat = c.latitud ?? c.lat;
    const lng = c.longitud ?? c.lng;
    if (lat == null || lng == null) { skip++; continue; }
    const cercano = await existeNodoCercano(client, lng, lat, DIST_DEG);
    if (cercano) { skip++; continue; }
    await insertarNodo(client, {
      nombre: c.nombre,
      tipo: 'Caleta',
      fuente: 'SERNAPESCA',
      fuente_id: c.id || null,
      region: c.region || null,
      provincia: c.provincia || null,
      comuna: c.comuna || null,
      lng, lat,
    });
    ok++;
  }
  stats.SERNAPESCA = ok;
  skipped.SERNAPESCA = skip;
  console.log(`  Insertados: ${ok} | Omitidos (dupe/sin coords): ${skip}`);
}

async function seedManuales(client) {
  console.log('\n--- MANUAL (puertos_adicionales.json) ---');
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'puertos_adicionales.json'), 'utf8'));
  const puertos = Array.isArray(raw) ? raw : [];

  const DIST_DEG = 0.005;
  let ok = 0, skip = 0;
  for (const p of puertos) {
    const { nombre, lat, lng, region } = p;
    if (lat == null || lng == null) { skip++; continue; }
    const cercano = await existeNodoCercano(client, lng, lat, DIST_DEG);
    if (cercano) { skip++; continue; }
    await insertarNodo(client, {
      nombre,
      tipo: inferirTipoMOP(nombre),
      fuente: 'MANUAL',
      fuente_id: null,
      region: region || null,
      lng, lat,
    });
    ok++;
  }
  stats.MANUAL = ok;
  skipped.MANUAL = skip;
  console.log(`  Insertados: ${ok} | Omitidos (dupe): ${skip}`);
}

async function seedSITPORT(client) {
  console.log('\n--- SITPORT (bahias_sitport) ---');
  const { rows: bahias } = await client.query(
    'SELECT bahia_id, nombre, lat, lng FROM bahias_sitport ORDER BY bahia_id'
  );

  const DIST_DEG = 0.018; // ~2km
  let ok = 0, skip = 0;
  for (const b of bahias) {
    const cercano = await existeNodoCercano(client, b.lng, b.lat, DIST_DEG);
    if (cercano) { skip++; continue; }
    await insertarNodo(client, {
      nombre: b.nombre,
      tipo: 'Bahía',
      fuente: 'SITPORT',
      fuente_id: String(b.bahia_id),
      lng: b.lng,
      lat: b.lat,
    });
    ok++;
  }
  stats.SITPORT = ok;
  skipped.SITPORT = skip;
  console.log(`  Insertados: ${ok} | Omitidos (infra cercana dentro 2km): ${skip}`);
}

async function resumen(client) {
  console.log('\n=== RESUMEN ===');
  const total = stats.MOP + stats.SERNAPESCA + stats.MANUAL + stats.SITPORT;
  console.log(`Total insertados: ${total}`);
  console.log(`  MOP:       ${stats.MOP}`);
  console.log(`  SERNAPESCA: ${stats.SERNAPESCA} (omitidos: ${skipped.SERNAPESCA})`);
  console.log(`  MANUAL:    ${stats.MANUAL} (omitidos: ${skipped.MANUAL})`);
  console.log(`  SITPORT:   ${stats.SITPORT} (omitidos: ${skipped.SITPORT})`);

  const { rows } = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE bahia_sitport_id IS NOT NULL) AS con_jurisdiccion,
       COUNT(*) FILTER (WHERE bahia_sitport_id IS NULL) AS sin_jurisdiccion
     FROM nodos_maritimos`
  );
  console.log(`\nJurisdicción SITPORT:`);
  console.log(`  Con bahia_sitport_id: ${rows[0].con_jurisdiccion}`);
  console.log(`  Sin bahia_sitport_id: ${rows[0].sin_jurisdiccion}`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await seedMOP(client);
    await seedSERNAPESCA(client);
    await seedManuales(client);
    await seedSITPORT(client);

    await client.query('COMMIT');

    await resumen(client);
    console.log('\nSeed completado OK.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en seed — ROLLBACK:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
