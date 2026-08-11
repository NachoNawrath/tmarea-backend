#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// fase5_inventario_insumos.js — INVENTARIO MEDIDO de todo lo que alimenta la
// resolucion de jurisdiccion. No supone nada: cuenta, mide y reporta.
//
// Existe para que el PLAN_JURISDICCION.md se pueda refrescar corriendo un
// comando, en vez de quedar congelado el dia que se escribio.
//
// Uso:  node scripts/fase5_inventario_insumos.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const RAIZ = path.join(__dirname, '..');
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const kb = n => (n / 1024).toFixed(0) + ' KB';

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log('='.repeat(78));
  console.log('INVENTARIO DE INSUMOS — MEDIDO');
  console.log(`fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(78));

  // ── 1. BASE DE DATOS ───────────────────────────────────────────────────────
  console.log('');
  console.log('## 1. BASE DE DATOS');
  const { rows: version } = await pool.query('SELECT version() v, postgis_version() p');
  console.log(`   postgres: ${version[0].v.split(',')[0]}`);
  console.log(`   postgis : ${version[0].p}`);

  const { rows: relaciones } = await pool.query(`
    SELECT c.relname AS nombre,
           CASE c.relkind WHEN 'r' THEN 'tabla' WHEN 'm' THEN 'matview' WHEN 'v' THEN 'vista' END AS tipo
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r','m','v')
     ORDER BY 2, 1`);

  console.log('');
  console.log('   relacion                        tipo     filas  geom  srid   nulas vacias area0   km2_total');
  console.log('   ' + '-'.repeat(97));
  for (const r of relaciones) {
    const { rows: cols } = await pool.query(`
      SELECT a.attname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped
         AND format_type(a.atttypid,null) IN ('geometry','geography')`, [r.nombre]);
    const g = cols.length ? cols[0].attname : null;
    let n = '?', srid = '-', nulas = '-', vacias = '-', area0 = '-', km2 = '-';
    try {
      if (g) {
        const q = await pool.query(`
          SELECT COUNT(*) n,
                 COALESCE(MAX(ST_SRID("${g}")),0) srid,
                 COUNT(*) FILTER (WHERE "${g}" IS NULL) nulas,
                 COUNT(*) FILTER (WHERE "${g}" IS NOT NULL AND ST_IsEmpty("${g}")) vacias,
                 COUNT(*) FILTER (WHERE "${g}" IS NOT NULL AND NOT ST_IsEmpty("${g}")
                                    AND ST_Area("${g}"::geography)=0) area0,
                 COALESCE(SUM(ST_Area("${g}"::geography))/1e6,0) km2
            FROM "${r.nombre}"`);
        ({ n, srid, nulas, vacias, area0 } = q.rows[0]);
        km2 = Number(q.rows[0].km2).toFixed(0);
      } else {
        n = (await pool.query(`SELECT COUNT(*) n FROM "${r.nombre}"`)).rows[0].n;
      }
    } catch (e) { n = 'ERR'; }
    console.log(`   ${r.nombre.padEnd(31)} ${String(r.tipo).padEnd(8)} ${String(n).padStart(6)} ` +
      `${String(g || '-').padEnd(5)} ${String(srid).padStart(5)} ${String(nulas).padStart(6)} ` +
      `${String(vacias).padStart(6)} ${String(area0).padStart(5)} ${String(km2).padStart(11)}`);
  }

  // Indices GIST: sin ellos el matching por ruta no escala.
  const { rows: idx } = await pool.query(`
    SELECT tablename AS t, indexname AS i FROM pg_indexes
     WHERE schemaname='public' AND indexdef ILIKE '%USING gist%' ORDER BY 1`);
  console.log('');
  console.log(`   indices GIST: ${idx.length ? idx.map(x => x.t).join(', ') : 'NINGUNO'}`);

  // ── 2. INSUMO DEL DECRETO ──────────────────────────────────────────────────
  console.log('');
  console.log('## 2. INSUMO DEL DECRETO');
  const insumo = require(path.join(RAIZ, 'data/decreto/jurisdicciones_v2.json'));
  const J = insumo.jurisdicciones;
  const por = (f) => J.filter(f).length;
  console.log(`   archivo            : data/decreto/jurisdicciones_v2.json (${kb(fs.statSync(path.join(RAIZ,'data/decreto/jurisdicciones_v2.json')).size)})`);
  console.log(`   version / generado : ${insumo.version} / ${insumo.generado}`);
  console.log(`   jurisdicciones     : ${J.length}`);
  console.log(`   por ambito         : ` + Object.entries(J.reduce((a, j) => (a[j.ambito] = (a[j.ambito] || 0) + 1, a), {}))
    .map(([k, v]) => `${k}=${v}`).join('  '));
  console.log(`   participa_matching : si=${por(j => j.participa_matching)}  no=${por(j => !j.participa_matching)}`);
  console.log(`   estado_geometria   : ` + Object.entries(J.reduce((a, j) => (a[j.estado_geometria] = (a[j.estado_geometria] || 0) + 1, a), {}))
    .map(([k, v]) => `${k}=${v}`).join('  '));
  console.log(`   con punto_representativo : ${por(j => j.punto_representativo)}   sin, con causa: ${por(j => !j.punto_representativo && j.causa_sin_punto_representativo)}   sin y sin causa: ${por(j => !j.punto_representativo && !j.causa_sin_punto_representativo)}`);
  console.log(`   con contorno       : ${por(j => (j.contorno || []).length > 0)}   con tramos: ${por(j => (j.tramos || []).length > 0)}`);
  console.log(`   con sectores       : ${por(j => (j.sectores || []).length > 0)}`);
  console.log(`   con cuerpos_lacustres: ${por(j => j.cuerpos_lacustres)}`);
  console.log(`   fronteras declaradas : ${(insumo.fronteras || []).length}`);
  console.log(`   puntos_notables      : ${(insumo.puntos_notables || []).length}`);
  console.log(`   convenciones         : ${(insumo.convenciones || []).length}`);
  console.log(`   recetas              : ` + Object.entries(J.reduce((a, j) => (a[j.receta] = (a[j.receta] || 0) + 1, a), {}))
    .map(([k, v]) => `${k}=${v}`).join('  '));

  const otros = ['adjudicacion_tramos.json', 'cotejo_lacustre_adjudicado.json',
                 'jurisdicciones_capitanias.json', 'zonas_aviso.json', 'capa_consultada.json'];
  console.log('');
  for (const f of otros) {
    const p = path.join(RAIZ, 'data/decreto', f);
    if (!fs.existsSync(p)) { console.log(`   ${f.padEnd(36)} NO EXISTE`); continue; }
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const claves = Array.isArray(j) ? `array[${j.length}]` : Object.keys(j).slice(0, 6).join(',');
    console.log(`   ${f.padEnd(36)} ${kb(fs.statSync(p).size).padStart(8)}  ${claves}`);
  }

  // ── 3. MAPA OPERATIVO ──────────────────────────────────────────────────────
  console.log('');
  console.log('## 3. MAPA OPERATIVO bahia-capitania-map.json');
  const mapa = require(path.join(RAIZ, 'src/data/bahia-capitania-map.json'));
  const ent = Object.entries(mapa);
  const jurNom = new Set(J.map(j => norm(j.nombre)));
  const caps = [...new Set(ent.map(([, v]) => v.capitania).filter(Boolean))];
  const huerf = caps.filter(c => !jurNom.has(norm(c)));
  console.log(`   bahias                 : ${ent.length}`);
  console.log(`   sin capitania atribuida: ${ent.filter(([, v]) => v.capitania == null).length}`);
  console.log(`   sin telefono           : ${ent.filter(([, v]) => !v.telefono).length}`);
  console.log(`   nombres de Capitania   : ${caps.length}`);
  console.log(`   nombres que NO calzan con el insumo: ${huerf.length}  -> ${huerf.join(', ') || '(ninguno)'}`);
  for (const h of huerf) {
    const cand = J.map(j => j.nombre).filter(n => norm(n).includes(norm(h)) || norm(h).includes(norm(n)));
    const bahias = ent.filter(([, v]) => v.capitania === h).map(([k]) => k);
    console.log(`      '${h}': ${bahias.length} bahia(s) [${bahias.join(',')}] -> candidato en insumo: ${cand.join(' | ') || 'NINGUNO'}`);
  }
  const jurSinBahia = J.filter(j => !ent.some(([, v]) => norm(v.capitania) === norm(j.nombre)));
  console.log(`   jurisdicciones del decreto SIN ninguna bahia atribuida: ${jurSinBahia.length}`);
  console.log(`      ${jurSinBahia.map(j => j.id).join(', ')}`);

  // ── 4. COBERTURA CRUZADA bahias_sitport <-> mapa <-> BAHIA_COORDS ──────────
  console.log('');
  console.log('## 4. COBERTURA CRUZADA DE IDENTIFICADORES DE BAHIA');
  const { rows: bs } = await pool.query('SELECT bahia_id, nombre FROM bahias_sitport ORDER BY bahia_id');
  const idsDB = new Set(bs.map(r => r.bahia_id));
  const idsMapa = new Set(ent.map(([k]) => Number(k)));
  const rutas = fs.readFileSync(path.join(RAIZ, 'src/routes/sitport-routes.js'), 'utf8');
  const idsCoords = new Set([...rutas.matchAll(/^\s{2}(\d+):\s*\{\s*lat:/gm)].map(m => Number(m[1])));
  const dif = (a, b) => [...a].filter(x => !b.has(x));
  console.log(`   bahias_sitport (tabla)            : ${idsDB.size}`);
  console.log(`   bahia-capitania-map.json          : ${idsMapa.size}`);
  console.log(`   BAHIA_COORDS (en sitport-routes.js): ${idsCoords.size}`);
  console.log(`   en la tabla y NO en el mapa       : ${dif(idsDB, idsMapa).join(',') || 'ninguna'}`);
  console.log(`   en el mapa y NO en la tabla       : ${dif(idsMapa, idsDB).join(',') || 'ninguna'}`);
  console.log(`   en la tabla y NO en BAHIA_COORDS  : ${dif(idsDB, idsCoords).join(',') || 'ninguna'}`);
  console.log(`   en BAHIA_COORDS y NO en la tabla  : ${dif(idsCoords, idsDB).join(',') || 'ninguna'}`);

  // ── 5. SITPORT, EN VIVO ────────────────────────────────────────────────────
  console.log('');
  console.log('## 5. SITPORT (consultado en vivo)');
  try {
    const sitport = require(path.join(RAIZ, 'src/services/sitport-service'));
    const restr = await sitport.consultaRestricciones();
    const tipos = restr.reduce((a, r) => (a[String(r.tipo).trim()] = (a[String(r.tipo).trim()] || 0) + 1, a), {});
    const idsRestr = [...new Set(restr.map(r => r.bahia))];
    console.log(`   consultaRestricciones : ${restr.length} registros`);
    console.log(`   por tipo              : ` + Object.entries(tipos).map(([k, v]) => `${k}=${v}`).join('  '));
    console.log(`   bahias distintas      : ${idsRestr.length}`);
    console.log(`   con id que NO esta en bahias_sitport : ${idsRestr.filter(i => !idsDB.has(i)).join(',') || 'ninguna'}`);
    console.log(`   campos del registro   : ${Object.keys(restr[0] || {}).join(', ')}`);
    const pron = await sitport.totalPronostico();
    console.log(`   totalPronostico       : ${pron.length} registros`);
    const bah = await sitport.consultaBahias();
    console.log(`   consultaBahias        : ${bah.length} registros`);
  } catch (e) {
    console.log(`   NO RESPONDE: ${e.message}`);
  }

  // ── 6. CAPAS EN DISCO ──────────────────────────────────────────────────────
  console.log('');
  console.log('## 6. CAPAS EN DISCO (geodata/)');
  const listar = (dir) => {
    const p = path.join(RAIZ, 'geodata', dir);
    if (!fs.existsSync(p)) return console.log(`   ${dir}: NO EXISTE`);
    for (const f of fs.readdirSync(p)) {
      const st = fs.statSync(path.join(p, f));
      if (st.isFile()) console.log(`   geodata/${dir}/${f.padEnd(34)} ${kb(st.size).padStart(10)}`);
    }
  };
  listar('costa'); listar('lagos');
  for (const f of fs.readdirSync(path.join(RAIZ, 'geodata'))) {
    const st = fs.statSync(path.join(RAIZ, 'geodata', f));
    if (st.isFile()) console.log(`   geodata/${f.padEnd(40)} ${kb(st.size).padStart(10)}`);
  }
  const cc = path.join(RAIZ, 'geodata/costa/capas_costa.json');
  if (fs.existsSync(cc)) {
    const j = JSON.parse(fs.readFileSync(cc, 'utf8'));
    const capas = j.capas || j;
    console.log(`   capas_costa.json declara roles: ` +
      (Array.isArray(capas) ? capas.map(c => `${c.rol}->${c.tabla || c.id}`).join('  ')
                            : Object.keys(capas).join(', ')));
  }

  await pool.end();
  console.log('');
  console.log('='.repeat(78));
  console.log('FIN DEL INVENTARIO');
})().catch(e => { console.error('FALLA:', e.message); process.exit(1); });
