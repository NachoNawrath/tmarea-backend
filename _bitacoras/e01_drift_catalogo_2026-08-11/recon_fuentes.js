'use strict';
// RECONOCIMIENTO E0.1 — no modifica nada. Solo mide y vuelca crudo.
// Uso: node _bitacoras/e01_drift_catalogo_2026-08-11/recon_fuentes.js
//
// Qué mide:
//   1. Las tres fuentes internas de catálogo de bahías (dónde viven, cuántas, qué claves).
//   2. Lo que SITPORT publica hoy: consultaBahias, consultaRestricciones, Totalpronostico.
//   3. La divergencia en las dos direcciones, por cada punto del flujo donde hay descarte.

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const RAIZ = path.join(__dirname, '../..');
const CRUDO = __dirname;

function extraerBahiaCoords(file) {
  const src = fs.readFileSync(path.join(RAIZ, file), 'utf8');
  const ini = src.indexOf('const BAHIA_COORDS = {');
  const fin = src.indexOf('\n};', ini);
  const bloque = src.slice(ini, fin);
  const out = {};
  for (const m of bloque.matchAll(/^\s*(\d+):\s*\{\s*lat:\s*(-?[\d.]+),\s*lng:\s*(-?[\d.]+),\s*nombre:\s*(?:'([^']*)'|"([^"]*)")/gm)) {
    out[m[1]] = { lat: +m[2], lng: +m[3], nombre: m[4] !== undefined ? m[4] : m[5] };
  }
  return out;
}

(async () => {
  const linea = (t) => console.log(t);
  linea('='.repeat(78));
  linea('RECONOCIMIENTO E0.1 — CATÁLOGO DE BAHÍAS: FUENTES, COMPARACIÓN Y DESCARTE');
  linea(`fecha de ejecución: ${new Date().toISOString()}`);
  linea('='.repeat(78));

  // ── 1. FUENTES INTERNAS ────────────────────────────────────────────────────
  linea('');
  linea('## 1. FUENTES INTERNAS DE CATÁLOGO');

  const coordsRuntime = extraerBahiaCoords('src/routes/sitport-routes.js');
  const coordsSeed = extraerBahiaCoords('scripts/seed-bahias-sitport.js');
  const mapaCap = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/bahia-capitania-map.json'), 'utf8'));

  linea(`   F1 src/routes/sitport-routes.js  BAHIA_COORDS      : ${Object.keys(coordsRuntime).length} ids`);
  linea(`   F2 scripts/seed-bahias-sitport.js BAHIA_COORDS     : ${Object.keys(coordsSeed).length} ids (copia literal, siembra la tabla)`);
  linea(`   F3 src/data/bahia-capitania-map.json                : ${Object.keys(mapaCap).length} ids`);

  const difCopias = [];
  for (const k of new Set([...Object.keys(coordsRuntime), ...Object.keys(coordsSeed)])) {
    const a = coordsRuntime[k], s = coordsSeed[k];
    if (!a || !s) { difCopias.push(`${k}: solo en ${a ? 'F1' : 'F2'}`); continue; }
    if (a.lat !== s.lat || a.lng !== s.lng || a.nombre !== s.nombre) difCopias.push(`${k}: F1=${JSON.stringify(a)} F2=${JSON.stringify(s)}`);
  }
  linea(`   F1 vs F2 (duplicado literal)                        : ${difCopias.length === 0 ? 'idénticas' : difCopias.join(' | ')}`);

  const idsF1 = new Set(Object.keys(coordsRuntime));
  const idsF3 = new Set(Object.keys(mapaCap));
  const dif = (x, y) => [...x].filter(v => !y.has(v));
  linea(`   F1 \\ F3                                            : ${dif(idsF1, idsF3).join(',') || 'vacío'}`);
  linea(`   F3 \\ F1                                            : ${dif(idsF3, idsF1).join(',') || 'vacío'}`);

  // Tabla en base de datos
  let idsDB = new Set();
  let dbOk = false;
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'mapa_navegacion',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });
  try {
    const r = await pool.query('SELECT bahia_id FROM bahias_sitport ORDER BY bahia_id');
    idsDB = new Set(r.rows.map(x => String(x.bahia_id)));
    dbOk = true;
    linea(`   F4 postgres bahias_sitport (derivada de F2)         : ${idsDB.size} ids`);
    linea(`   F4 \\ F1                                            : ${dif(idsDB, idsF1).join(',') || 'vacío'}`);
    linea(`   F1 \\ F4                                            : ${dif(idsF1, idsDB).join(',') || 'vacío'}`);
    const mv = await pool.query('SELECT count(*)::int n, count(*) FILTER (WHERE ST_IsEmpty(geom))::int vacias FROM bahia_jurisdicciones');
    linea(`   F5 bahia_jurisdicciones (celdas que consulta el motor): ${mv.rows[0].n} filas, ${mv.rows[0].vacias} con geometría vacía`);
  } catch (e) {
    linea(`   F4/F5 base de datos: NO CONSULTABLE — ${e.message}`);
  }

  // ── 2. LO QUE SITPORT PUBLICA HOY ──────────────────────────────────────────
  linea('');
  linea('## 2. LO QUE SITPORT PUBLICA HOY (consulta en vivo)');

  const sitport = require(path.join(RAIZ, 'src/services/sitport-service'));
  let bahias = null, restricciones = null, pronostico = null;

  try {
    bahias = await sitport.consultaBahias();
    fs.writeFileSync(path.join(CRUDO, 'sitport_consultaBahias.json'), JSON.stringify(bahias, null, 2));
    linea(`   consultaBahias        : ${bahias.length} registros  → sitport_consultaBahias.json`);
    linea(`   campos del registro   : ${Object.keys(bahias[0] || {}).join(', ')}`);
  } catch (e) { linea(`   consultaBahias        : NO RESPONDE — ${e.message}`); }

  try {
    restricciones = await sitport.consultaRestricciones();
    fs.writeFileSync(path.join(CRUDO, 'sitport_consultaRestricciones.json'), JSON.stringify(restricciones, null, 2));
    linea(`   consultaRestricciones : ${restricciones.length} registros  → sitport_consultaRestricciones.json`);
  } catch (e) { linea(`   consultaRestricciones : NO RESPONDE — ${e.message}`); }

  try {
    pronostico = await sitport.totalPronostico();
    fs.writeFileSync(path.join(CRUDO, 'sitport_totalPronostico.json'), JSON.stringify(pronostico, null, 2));
    linea(`   Totalpronostico       : ${pronostico.length} registros  → sitport_totalPronostico.json`);
    linea(`   campos del registro   : ${Object.keys(pronostico[0] || {}).join(', ')}`);
  } catch (e) { linea(`   Totalpronostico       : NO RESPONDE — ${e.message}`); }

  // ── 3. DIVERGENCIA, EN LAS DOS DIRECCIONES ─────────────────────────────────
  linea('');
  linea('## 3. DIVERGENCIA MEDIDA');

  const campoId = (r) => r.idbahia ?? r.idBahia ?? r.IDBahia ?? r.id ?? r.bahia;
  const campoNombre = (r) => r.glnombre ?? r.GLBahia ?? r.nombre ?? r.glbahia ?? r.nombreBahia;

  if (bahias) {
    const idsSit = bahias.map(campoId).filter(v => v != null).map(String);
    const setSit = new Set(idsSit);
    linea(`   catálogo SITPORT      : ${setSit.size} ids distintos (de ${bahias.length} registros)`);
    const sobranSit = dif(setSit, idsF1);
    const sobranNos = dif(idsF1, setSit);
    linea(`   EN SITPORT Y NO EN F1 (falso negativo estructural) : ${sobranSit.join(',') || 'ninguno'}`);
    for (const id of sobranSit) {
      const reg = bahias.find(b => String(campoId(b)) === id);
      linea(`        id=${id}  ${JSON.stringify(reg)}`);
    }
    linea(`   EN F1 Y NO EN SITPORT (fila nuestra sin respaldo)  : ${sobranNos.join(',') || 'ninguno'}`);
    for (const id of sobranNos) linea(`        id=${id}  ${coordsRuntime[id].nombre}`);
  }

  if (restricciones) {
    const idsRestr = [...new Set(restricciones.map(r => String(r.bahia)))];
    const huerfanas = idsRestr.filter(i => !idsF1.has(i));
    linea('');
    linea(`   restricciones publicadas hoy sobre ${idsRestr.length} bahías distintas`);
    linea(`   con bahía que F1 no conoce (se descartan en silencio): ${huerfanas.join(',') || 'ninguna'}`);
    for (const id of huerfanas) {
      const rs = restricciones.filter(r => String(r.bahia) === id);
      linea(`        id=${id} ${campoNombre(rs[0])} — ${rs.length} restricción(es), tipos: ${[...new Set(rs.map(r => (r.tipo || '').trim()))].join('/')}`);
    }
    if (dbOk) {
      const huerfanasDB = idsRestr.filter(i => !idsDB.has(i));
      linea(`   con bahía que la tabla bahias_sitport no conoce     : ${huerfanasDB.join(',') || 'ninguna'}`);
    }
  }

  if (pronostico) {
    const idsPron = [...new Set(pronostico.map(p => String(p.idBahia ?? p.idbahia)))];
    const huerfanas = idsPron.filter(i => !idsF1.has(i));
    linea('');
    linea(`   pronóstico publicado sobre ${idsPron.length} bahías distintas`);
    linea(`   con bahía que F1 no conoce (se descartan en silencio): ${huerfanas.join(',') || 'ninguna'}`);
    for (const id of huerfanas) {
      const p = pronostico.find(x => String(x.idBahia ?? x.idbahia) === id);
      linea(`        id=${id} ${campoNombre(p)}`);
    }
  }

  await pool.end();
  linea('');
  linea('FIN DEL RECONOCIMIENTO');
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
