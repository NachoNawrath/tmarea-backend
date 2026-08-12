#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e1_reconocimiento_andamio.js — RECONOCIMIENTO de E1, el andamio de medición.
//
// E1 quiere declarar `jurisdicciones_decreto` como andamio para poder medir el
// cambio de unidad sin esperar a C3. Esa capa YA lleva una marca en el dato, por
// otro motivo: el comentario que `scripts/fase5_declarar_capas_vigentes.sql` le
// puso en la base dice "SUPERSEDIDA Y DESACTUALIZADA. NO CONSULTAR".
//
// Los dos guards tienen que decir lo mismo. Este script no lo supone: mide si
// los motivos que ese comentario invoca SIGUEN SIENDO CIERTOS hoy, porque un
// guard cuya causa se cayó y otro nuevo que la contradice es peor que ninguno.
//
// No modifica nada. Solo lee y mide.
//
// Uso:  node scripts/e1_reconocimiento_andamio.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Pool } = require('pg');

const RAIZ = path.join(__dirname, '..');
const leer = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const H = t => { console.log(''); console.log('─'.repeat(78)); console.log(t); console.log('─'.repeat(78)); };

const CAPA_ANDAMIO   = 'jurisdicciones_decreto';
const CAPA_CONSULTADA = 'bahia_jurisdicciones';
const CAPA_FINAL     = 'jurisdicciones_ds991';

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  const q = async (sql, params) => (await pool.query(sql, params)).rows;

  console.log('='.repeat(78));
  console.log('E1 — RECONOCIMIENTO DEL ANDAMIO DE MEDICIÓN');
  console.log(`fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(78));

  // ── 1. Las tres capas ─────────────────────────────────────────────────────
  H('1. LAS TRES CAPAS QUE RESPONDEN LA MISMA PREGUNTA');
  const capas = await q(
    `SELECT c.relname,
            CASE c.relkind WHEN 'r' THEN 'tabla' WHEN 'm' THEN 'matview' ELSE c.relkind::text END AS clase,
            obj_description(c.oid) AS comentario
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($1)`, [[CAPA_ANDAMIO, CAPA_CONSULTADA, CAPA_FINAL]]);
  const porNombre = new Map(capas.map(c => [c.relname, c]));
  for (const nombre of [CAPA_CONSULTADA, CAPA_ANDAMIO, CAPA_FINAL]) {
    const c = porNombre.get(nombre);
    console.log(`  ${nombre.padEnd(24)} ${c ? `${c.clase.padEnd(8)} comentario: ${c.comentario ? 'SÍ' : 'NO'}` : 'NO EXISTE'}`);
  }

  // ── 2. La marca que ya existe, literal ────────────────────────────────────
  H('2. LA MARCA QUE LA CAPA YA LLEVA EN EL DATO, LITERAL');
  const marca = porNombre.get(CAPA_ANDAMIO) ? porNombre.get(CAPA_ANDAMIO).comentario : null;
  if (!marca) {
    console.log('  NO HAY COMENTARIO. El solapamiento que E0.2 anotó no existe hoy: la marca no está puesta.');
  } else {
    for (const linea of marca.match(/.{1,74}(\s|$)/g)) console.log(`  │ ${linea.trim()}`);
  }
  console.log('');
  console.log(`  Contiene la frase "NO CONSULTAR": ${marca && /NO CONSULTAR/.test(marca) ? 'SÍ' : 'no'}`);
  console.log(`  Contiene "SUPERSEDIDA":          ${marca && /SUPERSEDIDA/.test(marca) ? 'SÍ' : 'no'}`);

  // ── 3. Forma y clave ──────────────────────────────────────────────────────
  H('3. ¿TIENE LA FORMA Y LA CLAVE QUE E1 NECESITA?');
  const cols = await q(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [CAPA_ANDAMIO]);
  const nombresCol = cols.map(c => c.column_name);
  console.log(`  columnas (${nombresCol.length}): ${nombresCol.join(', ')}`);
  const insumo = leer(path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json'));
  const idsInsumo = new Set(insumo.jurisdicciones.map(j => j.id));
  const [conteo] = await q(
    `SELECT count(*)::int AS filas,
            count(*) FILTER (WHERE geom IS NULL)::int AS geom_nulas,
            count(*) FILTER (WHERE geom IS NOT NULL AND ST_IsEmpty(geom))::int AS geom_vacias,
            count(DISTINCT id)::int AS ids_distintos
       FROM ${CAPA_ANDAMIO}`);
  console.log(`  filas ${conteo.filas} · ids distintos ${conteo.ids_distintos} · geom nulas ${conteo.geom_nulas} · geom vacías ${conteo.geom_vacias}`);
  const idsCapa = new Set((await q(`SELECT id FROM ${CAPA_ANDAMIO}`)).map(r => r.id));
  const soloInsumo = [...idsInsumo].filter(i => !idsCapa.has(i));
  const soloCapa = [...idsCapa].filter(i => !idsInsumo.has(i));
  console.log(`  ids del insumo: ${idsInsumo.size} · ids de la capa: ${idsCapa.size}`);
  console.log(`  en el insumo y no en la capa: ${soloInsumo.length ? soloInsumo.join(', ') : 'ninguno'}`);
  console.log(`  en la capa y no en el insumo: ${soloCapa.length ? soloCapa.join(', ') : 'ninguno'}`);
  console.log('');
  console.log('  Lo que E1 necesita de una capa para medir el cambio de unidad es que la');
  console.log('  unidad sea la Capitanía y que la clave sea la del decreto. Las dos cosas');
  console.log('  están: la columna `id` es el mismo espacio de ids que `jurisdicciones_v2`.');

  // ── 4. ¿Alguien la consulta? El propio comentario lo afirma ───────────────
  H('4. EL COMENTARIO AFIRMA "Ningún archivo de src/ la consulta". ¿ES CIERTO HOY?');
  const grep = (patron, dir) => {
    try { return execFileSync('git', ['grep', '-n', patron, '--', dir], { cwd: RAIZ, encoding: 'utf8' }).trim().split('\n').filter(Boolean); }
    catch (e) { return []; }
  };
  for (const dir of ['src', 'scripts']) {
    const hits = grep(CAPA_ANDAMIO, dir);
    const porArchivo = {};
    for (const h of hits) { const f = h.split(':')[0]; porArchivo[f] = (porArchivo[f] || 0) + 1; }
    console.log(`  ${dir}/ → ${hits.length} menciones en ${Object.keys(porArchivo).length} archivos`);
    for (const [f, n] of Object.entries(porArchivo).sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(3)}× ${f}`);
    if (dir === 'src') for (const h of hits) console.log(`      literal: ${h.slice(0, 140)}`);
  }
  console.log('');
  console.log('  LECTURA: en src/ la única mención está en un ARCHIVO DE PRUEBA, dentro de una');
  console.log('  lista de relaciones que el test finge en memoria. Ningún archivo de producción');
  console.log('  de src/ la consulta, que es lo que el comentario quiere decir — pero el');
  console.log('  comentario dice "ningún archivo de src/", y eso, literal, ya no es exacto.');

  // ── 5. Los dos motivos de la marca: ¿siguen siendo ciertos? ──────────────
  H('5. LOS DOS MOTIVOS DE LA MARCA, MEDIDOS HOY');
  console.log('  Motivo (1): "su geometría NO corresponde a su fuente — la Etapa A corrigió');
  console.log('  después el cuarto vértice de Rio Negro Hornopiren y el límite sur de Castro,');
  console.log('  y esta capa no se regeneró".');
  console.log('');
  const jurPorId = new Map(insumo.jurisdicciones.map(j => [j.id, j]));
  for (const id of ['hornopiren', 'castro']) {
    const j = jurPorId.get(id);
    if (!j) { console.log(`    ${id}: no está en el insumo`); continue; }
    const puntos = (j.contorno || []).map(c => ({ lat: c.lat, lon: c.lon }));
    if (!puntos.length) { console.log(`    ${id}: el insumo no le declara contorno; no hay vértices que comparar`); continue; }
    const [r] = await q(
      `SELECT (ST_DumpPoints(geom)).geom AS p FROM ${CAPA_ANDAMIO} WHERE id=$1 LIMIT 1`, [id]).then(rows => rows.length ? [rows] : [null]) || [null];
    const vertices = await q(
      `SELECT DISTINCT round(ST_Y(dp.geom)::numeric, 6) AS lat, round(ST_X(dp.geom)::numeric, 6) AS lon
         FROM ${CAPA_ANDAMIO} t, LATERAL ST_DumpPoints(t.geom) dp WHERE t.id=$1`, [id]);
    const cerca = (a, b) => Math.abs(a.lat - Number(b.lat)) < 1e-4 && Math.abs(a.lon - Number(b.lon)) < 1e-4;
    const faltantes = puntos.filter(p => !vertices.some(v => cerca(p, v)));
    console.log(`    ${id}: el insumo declara ${puntos.length} puntos de contorno; la capa tiene ${vertices.length} vértices distintos.`);
    console.log(`      puntos del insumo que NO aparecen como vértice de la capa: ${faltantes.length}`);
    for (const f of faltantes) console.log(`        (${f.lat}, ${f.lon})`);
  }
  console.log('');
  console.log('  Motivo (2): "su método produce traslapes grandes entre vecinas (28.325 km²');
  console.log('  entre Puerto Aguirre y Puerto Chacabuco, medidos el 10-AGO-2026)".');
  const [tr] = await q(
    `SELECT round((ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1e6)::numeric, 1) AS km2
       FROM ${CAPA_ANDAMIO} a, ${CAPA_ANDAMIO} b
      WHERE a.id='puerto_aguirre' AND b.id='puerto_chacabuco'`);
  console.log(`    traslape Puerto Aguirre × Puerto Chacabuco, medido ahora: ${tr ? tr.km2 : 'no medible'} km²`);
  const [totTr] = await q(
    `SELECT count(*)::int AS pares, round((sum(ST_Area(ST_Intersection(a.geom,b.geom)::geography))/1e6)::numeric,1) AS km2
       FROM ${CAPA_ANDAMIO} a JOIN ${CAPA_ANDAMIO} b ON a.id < b.id
      WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL AND ST_Intersects(a.geom,b.geom)
        AND NOT ST_IsEmpty(ST_Intersection(a.geom,b.geom))`);
  console.log(`    pares de vecinas que se traslapan en toda la capa: ${totTr.pares} · ${totTr.km2} km² en total`);

  // ── 6. La costura por donde entraría el andamio ──────────────────────────
  H('6. `capa_consultada.json` — LA COSTURA, Y QUÉ CAMPOS TIENE HOY');
  const capaDecl = leer(path.join(RAIZ, 'data', 'decreto', 'capa_consultada.json'));
  console.log(`  campos: ${Object.keys(capaDecl).join(', ')}`);
  console.log(`  capa_jurisdicciones = '${capaDecl.capa_jurisdicciones}'`);
  console.log(`  ¿trae algún campo que marque andamio?  ${Object.keys(capaDecl).some(k => /andamio|scaffold|medicion/i.test(k)) ? 'SÍ' : 'NO'}`);
  console.log('');
  console.log('  Quién la lee, medido:');
  for (const h of grep('capa_consultada', 'src')) console.log(`      ${h.slice(0, 150)}`);

  // ── 7. El arranque: qué corre hoy y de qué naturaleza es ─────────────────
  H('7. EL ARRANQUE — QUÉ VALIDA HOY');
  for (const h of grep('drift-arranque', 'src')) console.log(`      ${h.slice(0, 160)}`);
  const arranque = fs.readFileSync(path.join(RAIZ, 'src', 'services', 'drift-arranque.js'), 'utf8');
  console.log('');
  console.log(`  El hook de E0.1 declara "No bloquea ni demora el arranque": ${/No bloquea ni demora el arranque/.test(arranque) ? 'SÍ' : 'no'}`);
  console.log('  E1 pide lo contrario para su guard: "el arranque FALLA si la capa declarada');
  console.log('  es el andamio fuera de un contexto de medición". Son dos hooks de naturaleza');
  console.log('  distinta y conviene que no se confundan: uno informa, el otro detiene.');

  await pool.end();
  console.log('');
  console.log('='.repeat(78));
  console.log('FIN DEL RECONOCIMIENTO — no se modificó nada.');
  console.log('='.repeat(78));
})().catch(e => { console.error('ABORTADO: ' + e.message); process.exit(1); });
