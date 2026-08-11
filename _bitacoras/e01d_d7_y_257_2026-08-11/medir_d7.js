'use strict';
// D7 — ¿cuántas rutas del corredor de día 0 tocarían hoy una bahía en drift?
// Medición, no construcción. No modifica nada.
// Uso: node _bitacoras/e01d_d7_y_257_2026-08-11/medir_d7.js
//
// Las rutas y los puntos son los mismos que usa scripts/fase5_medir_cobertura_ruta.js,
// que a su vez los toma de los tests del router. No se inventa un corredor nuevo.

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const { Pool } = require('pg');
const RAIZ = path.join(__dirname, '../..');
const { warmup, calcularRuta } = require(path.join(RAIZ, 'src/services/raster-router-service'));
const { construirPerfilCosto } = require(path.join(RAIZ, 'src/config/perfiles-costo'));
const MAPA = require(path.join(RAIZ, 'src/data/bahia-capitania-map.json'));
const { leerBahiaCoords } = require(path.join(RAIZ, 'src/services/catalogo-bahias'));

const PUNTOS = {
  ANAHUAC: { lat: -41.48607231899996, lon: -72.97656408099994 },
  MELINKA: { lat: -43.89816864699998, lon: -73.74786402599995 },
  CHACABUCO: { lat: -45.462, lon: -72.807 },
  QUELLON: { lat: -43.12075347399997, lon: -73.62317869399999 },
  CHONCHI: { lat: -42.61872181399997, lon: -73.76883021899994 },
  CASTRO: { lat: -42.4808, lon: -73.7591 },
  ANCUD: { lat: -41.8665, lon: -73.8313 },
  CHAITEN: { lat: -42.9112, lon: -72.7187 },
  ARICA: { lat: -18.4746, lon: -70.3126 },
  IQUIQUE: { lat: -20.2133, lon: -70.1503 },
  PUNTA_ARENAS: { lat: -53.1358, lon: -70.8625 },
  PTO_WILLIAMS: { lat: -54.9324, lon: -67.5968 },
  VALPARAISO: { lat: -33.0333, lon: -71.6333 },
  SAN_ANTONIO: { lat: -33.5833, lon: -71.6167 },
};
const RUTAS = [
  ['corredor dia 0', 'Anahuac -> Melinka', 'ANAHUAC', 'MELINKA'],
  ['corredor dia 0', 'Anahuac -> Quellon', 'ANAHUAC', 'QUELLON'],
  ['corredor dia 0', 'Anahuac -> Chacabuco', 'ANAHUAC', 'CHACABUCO'],
  ['corredor dia 0', 'Ancud -> Castro', 'ANCUD', 'CASTRO'],
  ['corredor dia 0', 'Chonchi -> Chaiten', 'CHONCHI', 'CHAITEN'],
  ['fuera corredor', 'Arica -> Iquique', 'ARICA', 'IQUIQUE'],
  ['fuera corredor', 'Valparaiso -> San Antonio', 'VALPARAISO', 'SAN_ANTONIO'],
  ['fuera corredor', 'Punta Arenas -> Pto Williams', 'PUNTA_ARENAS', 'PTO_WILLIAMS'],
];

// Las dos bahías en drift, con la Capitanía que SITPORT les atribuye (medido el
// 2026-08-11 contra consultaCapuertoRestriccion + Totalgeneral).
const EN_DRIFT = [
  { id: 257, nombre: 'RÍO COCHRANE', capitania_sitport: 'CAPITANÍA DE PUERTO LAGO GRAL.CARRERA', reparticion: 235 },
  { id: 108, nombre: '(sin nombre publicado)', capitania_sitport: 'CAPITANÍA DE PUERTO CARAHUE', reparticion: 190 },
];
// Cómo se llaman esas Capitanías en nuestro mapa operativo, para poder cruzar.
const ALIAS = { 235: ['lago gral.carrera', 'general carrera', 'lago general carrera'], 190: ['carahue'] };

const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  const F1 = leerBahiaCoords(path.join(RAIZ, 'src/routes/sitport-routes.js'));

  const L = console.log;
  L('='.repeat(78));
  L('D7 — RUTAS DEL CORREDOR DE DÍA 0 CONTRA LAS BAHÍAS EN DRIFT');
  L(`fecha: ${new Date().toISOString()}`);
  L('motor de ruteo: raster-router-service (el de producción)');
  L('matching      : la misma consulta que usa restricciones-ruta (ST_Intersects');
  L('                contra bahia_jurisdicciones)');
  L('='.repeat(78));
  L('');
  L('BAHÍAS EN DRIFT Y SU CAPITANÍA SEGÚN SITPORT');
  for (const d of EN_DRIFT) L(`  id ${d.id}  ${d.nombre.padEnd(24)} rep ${d.reparticion} → ${d.capitania_sitport}`);
  L('  Ninguna de las dos tiene coordenada en ninguna fuente. Ninguna tiene celda');
  L('  en bahia_jurisdicciones: ST_Intersects NO PUEDE devolverlas, por construcción.');

  const w = warmup('AUSTRAL_N');
  L('');
  L(`warmup tile AUSTRAL_N: ${w.ms}ms`);
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

  const filas = [];
  for (const [grupo, nombre, a, b] of RUTAS) {
    let r;
    try { r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b], {}); }
    catch (e) { L(`\n---- ${nombre} [${grupo}] ---- RUTEO LANZA: ${e.message}`); filas.push({ grupo, nombre, estado: 'ruteo_excepcion' }); continue; }
    if (!r || !r.ok) { L(`\n---- ${nombre} [${grupo}] ---- RUTEO NO OK: ${r && r.error}`); filas.push({ grupo, nombre, estado: 'ruteo_fallido' }); continue; }

    const wps = r.tramos
      .filter(t => t.tipo !== 'aproximacion_final' && (t.coords || []).length >= 2)
      .flatMap(t => t.coords).map(([lng, lat]) => ({ lat, lng }));

    const geo = JSON.stringify({ type: 'LineString', coordinates: wps.map(p => [p.lng, p.lat]) });
    const { rows } = await pool.query(
      `SELECT bahia_id FROM bahia_jurisdicciones
       WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))`, [geo]);
    const ids = rows.map(x => Number(x.bahia_id)).sort((x, y) => x - y);

    const caps = new Set();
    for (const id of ids) { const c = MAPA[String(id)]; if (c && c.capitania) caps.add(c.capitania); }

    const tocaDrift = EN_DRIFT.filter(d => ids.includes(d.id));
    const tocaCapDrift = EN_DRIFT.filter(d =>
      [...caps].some(c => ALIAS[d.reparticion].some(al => norm(c).includes(al))));

    L('');
    L(`---- ${nombre}  [${grupo}] ----`);
    L(`  ${r.distancia_mn} mn · ${wps.length} waypoints`);
    L(`  bahías matcheadas: ${ids.length}  → ${ids.join(',') || '(ninguna)'}`);
    L(`  Capitanías distintas en la ruta: ${caps.size}  → ${[...caps].join(', ') || '(ninguna atribuida)'}`);
    L(`  toca una bahía EN DRIFT por celda      : ${tocaDrift.length ? tocaDrift.map(d => d.id).join(',') : 'NO'}`);
    L(`  toca la CAPITANÍA de una bahía en drift: ${tocaCapDrift.length ? tocaCapDrift.map(d => d.capitania_sitport).join(', ') : 'NO'}`);
    filas.push({ grupo, nombre, estado: 'ok', nBahias: ids.length, nCaps: caps.size, drift: tocaDrift.length, driftCap: tocaCapDrift.length });
  }

  const ok = filas.filter(f => f.estado === 'ok');
  const corr = ok.filter(f => f.grupo === 'corredor dia 0');
  L('');
  L('='.repeat(78));
  L('RESUMEN');
  L('='.repeat(78));
  L(`rutas medidas: ${ok.length} de ${RUTAS.length} (${corr.length} del corredor de día 0)`);
  L('');
  L(`  del corredor que tocan una bahía en drift POR CELDA        : ${corr.filter(f => f.drift > 0).length} de ${corr.length}`);
  L(`  del corredor que tocan la CAPITANÍA de una bahía en drift   : ${corr.filter(f => f.driftCap > 0).length} de ${corr.length}`);
  L(`  fuera del corredor, por Capitanía                           : ${ok.filter(f => f.grupo === 'fuera corredor' && f.driftCap > 0).length} de ${ok.filter(f => f.grupo === 'fuera corredor').length}`);
  L('');
  L('DENOMINADOR DE RUIDO — cuánto muestra hoy cada ruta del corredor');
  for (const f of corr) L(`  ${f.nombre.padEnd(24)} ${String(f.nBahias).padStart(3)} bahías · ${f.nCaps} Capitanías`);
  const media = corr.reduce((s, f) => s + f.nBahias, 0) / (corr.length || 1);
  L(`  promedio: ${media.toFixed(1)} bahías por ruta del corredor`);

  await pool.end();
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
