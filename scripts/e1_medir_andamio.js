#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e1_medir_andamio.js — mide lo que decide entre los caminos de la propuesta E1.
//
// Dos preguntas, y las dos se contestan midiendo, no argumentando (CLAUDE.md §1.2):
//
//   A. ¿Sirve el andamio para atribuir Capitanía, o los 60 pares traslapados lo
//      inutilizan? Se prueba contra las 163 bahías del catálogo: cada punto cae
//      en 0, 1 o N jurisdicciones de la capa.
//   B. ¿Hay que regenerarla desde el insumo v2 antes de usarla? La capa salió del
//      insumo v1. Se compara v1 contra v2, jurisdicción por jurisdicción.
//
// Y la que rompería mi propio fundamento: si el andamio contradijera al join que
// E0.3 acaba de dejar, medir sobre él mediría otra cosa. Se cruza.
//
// No modifica nada.
//
// Uso:  node scripts/e1_medir_andamio.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const RAIZ = path.join(__dirname, '..');
const leer = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const H = t => { console.log(''); console.log('─'.repeat(78)); console.log(t); console.log('─'.repeat(78)); };
const CAPA = 'jurisdicciones_decreto';

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  const q = async (sql, params) => (await pool.query(sql, params)).rows;

  console.log('='.repeat(78));
  console.log('E1 — MEDICIÓN QUE DECIDE ENTRE LOS CAMINOS DE LA PROPUESTA');
  console.log(`fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(78));

  // Coordenadas desde la FUENTE.
  const coords = new Map();
  {
    const txt = fs.readFileSync(path.join(RAIZ, 'src', 'routes', 'sitport-routes.js'), 'utf8');
    const bloque = txt.slice(txt.indexOf('const BAHIA_COORDS = {'));
    const re = /^\s*(\d+):\s*\{\s*lat:\s*(-?\d+(?:\.\d+)?),\s*lng:\s*(-?\d+(?:\.\d+)?)/gm;
    let m; while ((m = re.exec(bloque)) !== null) coords.set(Number(m[1]), { lat: Number(m[2]), lon: Number(m[3]) });
    if (coords.size < 160) throw new Error('BAHIA_COORDS: el parser no lee la fuente.');
  }
  const join = leer(path.join(RAIZ, 'data', 'decreto', 'join_bahia_jurisdiccion.json'));
  const joinPorId = new Map(join.entradas.map(e => [e.bahia_id, e]));

  // ── A. ¿Resuelve? ─────────────────────────────────────────────────────────
  H('A. ¿EL ANDAMIO ATRIBUYE CAPITANÍA, O LOS TRASLAPES LO INUTILIZAN?');
  console.log(`Se prueba con los ${coords.size} puntos de bahía del catálogo, uno por uno.`);
  console.log('');
  const filas = [];
  for (const [id, p] of coords) {
    const r = await q(
      `SELECT id FROM ${CAPA} WHERE geom IS NOT NULL AND ST_Contains(geom, ST_SetSRID(ST_MakePoint($1,$2),4326)) ORDER BY id`,
      [p.lon, p.lat]);
    filas.push({ bahia: id, jurs: r.map(x => x.id) });
  }
  const cero = filas.filter(f => f.jurs.length === 0);
  const una  = filas.filter(f => f.jurs.length === 1);
  const varias = filas.filter(f => f.jurs.length > 1);
  console.log(`  no cae en ninguna jurisdicción : ${cero.length}`);
  console.log(`  cae en exactamente una         : ${una.length}`);
  console.log(`  cae en dos o más (traslape)    : ${varias.length}`);
  console.log('');
  console.log('  CÓMO NO LEER ESTE NÚMERO. Los 110 que no caen en ninguna NO dicen que el');
  console.log('  andamio sea inservible. Los puntos de bahía son puntos de ORILLA, no de');
  console.log('  agua —35 de 43 testigos caen en tierra, medido en fase5E/F/G— y este');
  console.log('  repositorio ya pagó una vez el error de juzgar una capa por cuántos');
  console.log('  testigos deja afuera: el defecto estaba en los testigos. Este conteo mide');
  console.log('  lo mismo que aquel, no la capa.');
  console.log('');
  console.log('  Lo que SÍ se puede leer acá es el traslape: 10 puntos caen dentro de dos');
  console.log('  jurisdicciones a la vez, y eso es un defecto de la capa, no del punto —');
  console.log('  un punto no puede estar en dos jurisdicciones del decreto.');
  console.log('');
  console.log('  EL INSTRUMENTO CORRECTO para juzgar si el andamio sirve es la cobertura');
  console.log('  sobre RUTAS reales, no sobre puntos: cuántos km de ruta resuelven a una');
  console.log('  jurisdicción y cuántos caen en dos. NO está medido acá y no se afirma.');
  console.log('');
  if (varias.length) {
    console.log('  Las que caen en varias, con cuáles:');
    for (const f of varias) console.log(`    ${String(f.bahia).padStart(3)} → ${f.jurs.join(' + ')}`);
  }

  // ── La prueba que rompería el fundamento ─────────────────────────────────
  H('A-bis. ¿EL ANDAMIO DICE LO MISMO QUE EL JOIN QUE E0.3 DEJÓ?');
  console.log('Si midiera sobre una capa que atribuye distinto que el join, E2 mediría otra');
  console.log('cosa. Se comparan sólo las bahías que el andamio resuelve a UNA jurisdicción');
  console.log('y que el join tiene resueltas: es donde las dos fuentes se pueden contradecir.');
  console.log('');
  let acuerdo = 0; const desacuerdo = [];
  for (const f of una) {
    const e = joinPorId.get(f.bahia);
    if (!e || e.estado !== 'resuelta') continue;
    const destinos = [e.jurisdiccion_id, ...(e.jurisdicciones_adicionales || [])];
    if (destinos.includes(f.jurs[0])) acuerdo++;
    else desacuerdo.push({ bahia: f.bahia, andamio: f.jurs[0], join: destinos.join('+'), respaldo: e.respaldo });
  }
  console.log(`  comparables            : ${acuerdo + desacuerdo.length}`);
  console.log(`  coinciden              : ${acuerdo}`);
  console.log(`  NO coinciden           : ${desacuerdo.length}`);
  if (desacuerdo.length) {
    console.log('');
    console.log('  Dónde discrepan (el join manda: sale del decreto, el andamio de una capa vieja):');
    const porRespaldo = {};
    for (const d of desacuerdo) porRespaldo[d.respaldo] = (porRespaldo[d.respaldo] || 0) + 1;
    console.log(`    por respaldo del join: ${JSON.stringify(porRespaldo)}`);
    for (const d of desacuerdo.slice(0, 25)) {
      console.log(`    ${String(d.bahia).padStart(3)}  andamio=${String(d.andamio).padEnd(20)} join=${String(d.join).padEnd(20)} (${d.respaldo})`);
    }
    if (desacuerdo.length > 25) console.log(`    ... y ${desacuerdo.length - 25} más`);
  }

  // ── B. ¿Hay que regenerarla desde v2? ────────────────────────────────────
  H('B. ¿HAY QUE REGENERARLA DESDE EL INSUMO v2?');
  const v1 = leer(path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_capitanias.json'));
  const v2 = leer(path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json'));
  const listaV1 = v1.capitanias || [];
  console.log(`  v1: ${listaV1.length} jurisdicciones · v2: ${v2.jurisdicciones.length}`);
  console.log('');
  console.log('  LOS DOS ESQUEMAS NO SON EL MISMO, y compararlos campo a campo mide el');
  console.log('  renombre, no el contenido: v1 usa `limite_norte_dec` plano y `vertices`;');
  console.log('  v2 usa `limite_norte.dec` y `contorno`. Acá se comparan los campos');
  console.log('  equivalentes, no los homónimos.');
  console.log('');
  const v1PorId = new Map(listaV1.map(j => [j.id, j]));
  // v1 cierra el anillo repitiendo el primer vertice; v2 no. Se comparan
  // conjuntos de puntos distintos, que es lo que define la figura.
  const puntosDe = arr => {
    const vistos = new Set();
    for (const p of arr || []) vistos.add(`${Number(p.lat).toFixed(6)},${Number(p.lon).toFixed(6)}`);
    return vistos;
  };
  const dif = [];
  for (const j of v2.jurisdicciones) {
    const a = v1PorId.get(j.id);
    if (!a) { dif.push({ id: j.id, que: 'no está en v1' }); continue; }
    const cambios = [];
    const n1 = a.limite_norte_dec ?? null, n2 = (j.limite_norte && j.limite_norte.dec) ?? null;
    const s1 = a.limite_sur_dec ?? null, s2 = (j.limite_sur && j.limite_sur.dec) ?? null;
    if (n1 !== n2) cambios.push(`límite norte ${n1} → ${n2}`);
    if (s1 !== s2) cambios.push(`límite sur ${s1} → ${s2}`);
    const p1 = puntosDe(a.vertices), p2 = puntosDe(j.contorno);
    const soloV1 = [...p1].filter(x => !p2.has(x));
    const soloV2 = [...p2].filter(x => !p1.has(x));
    if (soloV1.length || soloV2.length) {
      cambios.push(`vértices: ${p1.size} en v1 y ${p2.size} en v2 · ${soloV1.length} sólo en v1, ${soloV2.length} sólo en v2`);
    }
    if (cambios.length) dif.push({ id: j.id, que: cambios.join(' · '), soloV1, soloV2 });
  }
  console.log(`  jurisdicciones con diferencia real entre v1 y v2: ${dif.length} de ${v2.jurisdicciones.length}`);
  for (const d of dif) {
    console.log(`    ${d.id.padEnd(24)} ${d.que}`);
    for (const p of (d.soloV1 || [])) console.log(`        sólo v1: (${p})`);
    for (const p of (d.soloV2 || [])) console.log(`        sólo v2: (${p})`);
  }
  console.log('');
  console.log('  El comentario de la capa cita dos correcciones (hornopiren y castro). Lo de');
  console.log('  arriba es la lista completa medida, que es lo que decide si regenerar es un');
  console.log('  arreglo de dos casos o una reconstrucción.');

  await pool.end();
  console.log('');
  console.log('='.repeat(78));
  console.log('FIN DE LA MEDICIÓN — no se modificó nada.');
  console.log('='.repeat(78));
})().catch(e => { console.error('ABORTADO: ' + e.message); process.exit(1); });
