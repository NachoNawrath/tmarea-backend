'use strict';
// SOLO LECTURA. No regenera nada, no escribe en la base ni en el repo.
// Pregunta: de los 2.076,06 km de las 8 rutas, cuántos pasan por 'ancud' y
// 'chonchi' en el ANDAMIO TAL COMO ESTÁ HOY, y si alguna de las 26 restricciones
// que el patrón ve hoy cae en esas dos jurisdicciones.
//
// Es una cota de EXPOSICIÓN, no una predicción: mide cuánto territorio de ruta
// está en juego si esas dos figuras cambian al regenerar. Cuánto se moverían los
// números exige regenerar y volver a medir; eso NO se hace acá.
process.chdir('C:/Users/katia/tmarea-backend');
require('C:/Users/katia/tmarea-backend/node_modules/dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('C:/Users/katia/tmarea-backend/node_modules/pg');
const { warmup, calcularRuta } = require('C:/Users/katia/tmarea-backend/src/services/raster-router-service');
const { construirPerfilCosto } = require('C:/Users/katia/tmarea-backend/src/config/perfiles-costo');
const { capaDeMedicion } = require('C:/Users/katia/tmarea-backend/src/services/andamio-medicion');
const { cargarJoin } = require('C:/Users/katia/tmarea-backend/src/services/join-bahia-jurisdiccion');

const declCapa = require('C:/Users/katia/tmarea-backend/data/decreto/capa_consultada.json');
const CAPTURA = path.join('_bitacoras', 'e01_drift_catalogo_2026-08-11', 'sitport_consultaRestricciones.json');

const PUNTOS = {
  ANAHUAC:{lat:-41.48607231899996,lon:-72.97656408099994}, MELINKA:{lat:-43.89816864699998,lon:-73.74786402599995},
  CHACABUCO:{lat:-45.462,lon:-72.807}, QUELLON:{lat:-43.12075347399997,lon:-73.62317869399999},
  CHONCHI:{lat:-42.61872181399997,lon:-73.76883021899994}, CASTRO:{lat:-42.4808,lon:-73.7591},
  ANCUD:{lat:-41.8665,lon:-73.8313}, CHAITEN:{lat:-42.9112,lon:-72.7187},
  ARICA:{lat:-18.4746,lon:-70.3126}, IQUIQUE:{lat:-20.2133,lon:-70.1503},
  PUNTA_ARENAS:{lat:-53.1358,lon:-70.8625}, PTO_WILLIAMS:{lat:-54.9324,lon:-67.5968},
  VALPARAISO:{lat:-33.0333,lon:-71.6333}, SAN_ANTONIO:{lat:-33.5833,lon:-71.6167},
};
const RUTAS = [
  ['Anahuac -> Melinka','ANAHUAC','MELINKA'], ['Anahuac -> Quellon','ANAHUAC','QUELLON'],
  ['Anahuac -> Chacabuco','ANAHUAC','CHACABUCO'], ['Ancud -> Castro (mar interior)','ANCUD','CASTRO'],
  ['Chonchi -> Chaiten (Corcovado)','CHONCHI','CHAITEN'], ['Arica -> Iquique (norte)','ARICA','IQUIQUE'],
  ['Valparaiso -> San Antonio','VALPARAISO','SAN_ANTONIO'], ['Punta Arenas -> Pto Williams','PUNTA_ARENAS','PTO_WILLIAMS'],
];
const OBJETIVO = ['ancud', 'chonchi'];

const SQL = capa => `
WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) AS g),
     dos  AS (SELECT ST_Union(geom) AS g FROM ${capa} WHERE id = ANY($2) AND geom IS NOT NULL)
SELECT ST_Length((SELECT g FROM ruta)::geography) AS total_m,
       ST_Length(ST_Intersection((SELECT g FROM ruta),(SELECT g FROM dos))::geography) AS en_dos_m`;
const SQL_UNA = capa => `
WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) AS g)
SELECT id, ST_Length(ST_Intersection((SELECT g FROM ruta), geom)::geography) AS m
  FROM ${capa} WHERE id = ANY($2) AND geom IS NOT NULL`;

(async () => {
  const pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
  const CAPA = capaDeMedicion();
  const CAPA_HOY = declCapa.capa_jurisdicciones;
  const join = cargarJoin();
  const L = console.log;

  L('='.repeat(78));
  L('EXPOSICIÓN DE ancud Y chonchi — solo lectura, sin regenerar');
  L(`capa medida: ${CAPA} (por capaDeMedicion()) · TAL COMO ESTÁ HOY`);
  L('='.repeat(78));
  L('');

  await warmup();
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });
  let total = 0, enDos = 0;
  const porJur = { ancud: 0, chonchi: 0 };
  const rutasGeo = new Map();

  L('  ruta                                 total km    en ancud+chonchi');
  L('  ' + '-'.repeat(70));
  for (const [nombre, a, b] of RUTAS) {
    const r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b]);
    if (!r.ok) { L(`  ${nombre}: RUTEO FALLIDO`); continue; }
    const wps = r.tramos.filter(t => t.tipo !== 'aproximacion_final').flatMap(t => t.coords);
    const geojson = JSON.stringify({ type: 'LineString', coordinates: wps });
    rutasGeo.set(nombre, geojson);
    const { rows: [m] } = await pool.query(SQL(CAPA), [geojson, OBJETIVO]);
    const t = Number(m.total_m) / 1000, d = Number(m.en_dos_m) / 1000;
    total += t; enDos += d;
    const { rows: unas } = await pool.query(SQL_UNA(CAPA), [geojson, OBJETIVO]);
    for (const u of unas) porJur[u.id] += Number(u.m) / 1000;
    L(`  ${nombre.padEnd(34)} ${t.toFixed(2).padStart(9)} ${d.toFixed(2).padStart(16)}${d > 0 ? '  ←' : ''}`);
  }
  L('  ' + '-'.repeat(70));
  L(`  ${'TOTAL'.padEnd(34)} ${total.toFixed(2).padStart(9)} ${enDos.toFixed(2).padStart(16)}`);
  L('');
  L(`  km en ancud   : ${porJur.ancud.toFixed(2)}`);
  L(`  km en chonchi : ${porJur.chonchi.toFixed(2)}`);
  L(`  (la suma puede superar el total conjunto si las dos se traslapan entre sí)`);
  L(`  PORCENTAJE DEL TOTAL MEDIDO: ${(enDos / total * 100).toFixed(1)} %`);
  L('');

  // ── las 26 restricciones de hoy ────────────────────────────────────────────
  L('─'.repeat(78));
  L('LAS RESTRICCIONES QUE EL PATRÓN VE HOY: ¿alguna cae en ancud o chonchi?');
  L('─'.repeat(78));
  const crudo = JSON.parse(fs.readFileSync(CAPTURA, 'utf8'));
  const restr = (Array.isArray(crudo) ? crudo : crudo.recordset || crudo.recordsets[0])
    .map(r => ({ bahia: Number(r.bahia), nombre: r.GLBahia || null }));
  const SQL_B = `SELECT bahia_id FROM "${CAPA_HOY}" WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1),4326))`;
  const mostradasHoy = [];
  for (const [nombre, geojson] of rutasGeo) {
    const set = new Set((await pool.query(SQL_B, [geojson])).rows.map(r => Number(r.bahia_id)));
    for (const r of restr) if (set.has(r.bahia)) mostradasHoy.push({ ...r, ruta: nombre });
  }
  L(`  restricciones mostradas hoy (unidad bahía), sobre las 8 rutas: ${mostradasHoy.length}`);
  const jurDe = id => join.jurisdiccionDe(id) || null;
  const enObjetivo = mostradasHoy.filter(r => OBJETIVO.includes(jurDe(r.bahia)));
  L(`  de ésas, cuya Capitanía (join E0.3) es ancud o chonchi: ${enObjetivo.length}`);
  for (const r of enObjetivo) L(`     bahía ${r.bahia} ${r.nombre} -> ${jurDe(r.bahia)}   (${r.ruta})`);
  if (!enObjetivo.length) L('     (ninguna)');
  L('');
  // y del lado de la unidad nueva: restricciones que APARECERÍAN por ancud/chonchi
  const SQL_J = `SELECT id FROM "${CAPA}" WHERE geom IS NOT NULL AND ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1),4326))`;
  const apar = [];
  for (const [nombre, geojson] of rutasGeo) {
    const jset = new Set((await pool.query(SQL_J, [geojson])).rows.map(r => r.id));
    for (const r of restr) { const j = jurDe(r.bahia); if (j && OBJETIVO.includes(j) && jset.has(j)) apar.push({ ...r, j, ruta: nombre }); }
  }
  L(`  con unidad Capitanía, restricciones que entran POR ancud o chonchi: ${apar.length}`);
  for (const r of apar) L(`     bahía ${r.bahia} ${r.nombre} -> ${r.j}   (${r.ruta})`);
  if (!apar.length) L('     (ninguna)');

  await pool.end();
  L('');
  L('='.repeat(78));
  L('FIN — medición sobre la capa vigente. No se regeneró ni se modificó nada.');
  L('='.repeat(78));
})();
