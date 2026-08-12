#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e1_prueba_mordida_andamio.js — ¿muerden los dos guards del andamio?
//
// CLAUDE.md §4.6: a un control se le inyecta el defecto que debe cazar y se
// comprueba que lo caza. Acá hay tres controles distintos y los tres se ejercen:
//
//   1. La validación de la declaración (en memoria, sin tocar nada).
//   2. El guard del comentario de la base — incluido el caso que el owner pidió
//      explícitamente: EL COMENTARIO EDITADO A MANO. Se escribe un comentario
//      distinto, se comprueba que el control se detiene, y se restaura.
//   3. El guard de ARRANQUE, de verdad: se deforma el archivo, se levanta
//      `node src/index.js` como proceso y se comprueba que NO arranca. Es la
//      aceptación literal de E1 y no se simula.
//
// Todo lo que se toca se restaura en `finally`, comprobando sha256 y el texto
// del comentario. Si la restauración fallara, el proceso termina en error
// diciendo dónde quedó el respaldo.
//
// Uso:  node scripts/e1_prueba_mordida_andamio.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { Pool } = require('pg');
const { validarDeclaracion, verificarComentarioEnLaBase, ErrorAndamio } = require('../src/services/andamio-medicion');

const RAIZ = path.join(__dirname, '..');
const RUTA = path.join(RAIZ, 'data', 'decreto', 'capa_consultada.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const clonar = o => JSON.parse(JSON.stringify(o));

const BUF_ORIGINAL = fs.readFileSync(RUTA);
const SHA_ORIGINAL = sha(BUF_ORIGINAL);
const DECL = JSON.parse(BUF_ORIGINAL.toString('utf8'));

let ok = 0, fallos = 0;
const caso = (nombre, cazado, detalle) => {
  if (cazado) { ok++; console.log(`  ✔ ${nombre}`); }
  else { fallos++; console.log(`  ✘ ${nombre}\n      ${detalle}`); }
};

// ── 1. La declaración, en memoria ───────────────────────────────────────────
const EN_MEMORIA = [
  ['la capa del motor ES el andamio — el guard central', /MISMA/i,
    d => { d.capa_jurisdicciones = d.andamio.capa; }],
  ['sin bloque "andamio"', /no trae el bloque "andamio"/i,
    d => { delete d.andamio; }],
  ['es_andamio no es true', /es_andamio/i,
    d => { d.andamio.es_andamio = 'sí'; }],
  ['el andamio no nombra la capa', /no nombra la capa/i,
    d => { d.andamio.capa = ''; }],
  ['el nombre de capa no es un identificador', /identificador/i,
    d => { d.andamio.capa = 'tabla; DROP TABLE x'; }],
  ['sin "para_que"', /para_que/i,
    d => { d.andamio.para_que = '   '; }],
  ['sin motivos para no promoverse', /no_se_promueve_porque/i,
    d => { d.andamio.no_se_promueve_porque = []; }],
  ['sin el texto del comentario de la base', /comentario_en_la_base/i,
    d => { d.andamio.comentario_en_la_base = ''; }],
];

(async () => {
  console.log('='.repeat(78));
  console.log('PRUEBA DE MORDIDA — LOS GUARDS DEL ANDAMIO DE MEDICIÓN (E1)');
  console.log(`fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(78));
  console.log('');

  // Control negativo primero: si la declaración real no validara, todos los
  // casos de abajo cazarían por el motivo equivocado.
  try {
    const a = validarDeclaracion(clonar(DECL));
    console.log(`CONTROL NEGATIVO: la declaración real valida. andamio='${a.capa}', ` +
      `capa del motor='${DECL.capa_jurisdicciones}', ${a.no_se_promueve_porque.length} motivos para no promoverla.`);
    ok++;
  } catch (e) { fallos++; console.log(`CONTROL NEGATIVO FALLIDO: ${e.message}`); }
  console.log('');

  console.log('1. LA DECLARACIÓN (en memoria, no se toca nada)');
  for (const [nombre, patron, deformar] of EN_MEMORIA) {
    const d = clonar(DECL);
    deformar(d);
    let cazado = false, detalle = 'no se detuvo';
    try { validarDeclaracion(d); }
    catch (e) { detalle = e.message; cazado = e instanceof ErrorAndamio && patron.test(e.message); if (!cazado) detalle = `se detuvo por otro motivo: ${e.message}`; }
    caso(nombre, cazado, detalle);
  }

  // ── 2. El comentario de la base ───────────────────────────────────────────
  console.log('');
  console.log('2. EL COMENTARIO DE LA BASE — INCLUIDO EL EDITADO A MANO');
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  const capa = DECL.andamio.capa;
  const literal = s => `'${String(s).replace(/'/g, "''")}'`;
  const leerComentario = async () => (await pool.query(
    `SELECT obj_description(c.oid) AS c FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=$1`, [capa])).rows[0].c;
  const comentarioOriginal = await leerComentario();

  try {
    // 2.a — el comentario coincide hoy
    try { await verificarComentarioEnLaBase(pool); caso('el comentario de la base coincide con el declarado (control negativo)', true); }
    catch (e) { caso('el comentario de la base coincide con el declarado (control negativo)', false, e.message); }

    // 2.b — EDITADO A MANO
    await pool.query(`COMMENT ON TABLE "${capa}" IS ${literal(comentarioOriginal + ' Ademas se puede usar en produccion si hace falta.')}`);
    let cazado = false, detalle = 'no se detuvo';
    try { await verificarComentarioEnLaBase(pool); }
    catch (e) { detalle = e.message; cazado = e instanceof ErrorAndamio && /dejaron de decir lo mismo/i.test(e.message); }
    caso('EL COMENTARIO DE LA BASE EDITADO A MANO', cazado, detalle);

    // 2.c — borrado
    await pool.query(`COMMENT ON TABLE "${capa}" IS NULL`);
    cazado = false; detalle = 'no se detuvo';
    try { await verificarComentarioEnLaBase(pool); }
    catch (e) { detalle = e.message; cazado = e instanceof ErrorAndamio && /no tiene comentario/i.test(e.message); }
    caso('el comentario de la base borrado', cazado, detalle);
  } finally {
    await pool.query(`COMMENT ON TABLE "${capa}" IS ${literal(comentarioOriginal)}`);
    const vuelto = await leerComentario();
    if (vuelto !== comentarioOriginal) {
      console.error(`!!! NO SE RESTAURÓ EL COMENTARIO DE '${capa}'. Correr scripts/e1_aplicar_andamio.js.`);
      process.exitCode = 2;
    } else {
      console.log(`     (comentario de '${capa}' restaurado, idéntico al original)`);
    }
    await pool.end();
  }

  // ── 3. El arranque, de verdad ─────────────────────────────────────────────
  console.log('');
  console.log('3. EL GUARD DE ARRANQUE — LEVANTANDO EL PROCESO DE VERDAD');
  // Levantar el backend dispara el hook de drift de E0.1, que ESCRIBE el estado
  // publicado `data/catalogo/estado_drift.json`. Una corrida de prueba no puede
  // dejar huella en un archivo publicado — es el modo de falla que E0.3 arregló
  // y que este test reintroduciría por la puerta de atrás, porque aquella guarda
  // protege al control de drift y no al arranque entero. Se respalda y se
  // restaura por sha256.
  const RUTA_DRIFT = path.join(RAIZ, 'data', 'catalogo', 'estado_drift.json');
  const BUF_DRIFT = fs.existsSync(RUTA_DRIFT) ? fs.readFileSync(RUTA_DRIFT) : null;
  const SHA_DRIFT = BUF_DRIFT ? sha(BUF_DRIFT) : null;
  const levantar = () => {
    try {
      const salida = execFileSync(process.execPath, ['-e',
        `process.env.PORT='0'; require('${path.join(RAIZ, 'src', 'index.js').replace(/\\/g, '\\\\')}'); setTimeout(()=>process.exit(0), 1500);`],
        { cwd: RAIZ, encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'pipe'] });
      return { code: 0, salida };
    } catch (e) { return { code: e.status, salida: `${e.stdout || ''}${e.stderr || ''}` }; }
  };

  try {
    const d = clonar(DECL);
    d.capa_jurisdicciones = d.andamio.capa;   // el defecto que E1 existe para cazar
    fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', 'utf8');
    const r = levantar();
    const cazado = r.code !== 0 && /ARRANQUE DETENIDO/.test(r.salida);
    caso('el arranque FALLA si la capa del motor es el andamio', cazado,
      `exit=${r.code} · salida: ${String(r.salida).replace(/\s+/g, ' ').slice(0, 260)}`);
    if (cazado) {
      const linea = (r.salida.match(/ARRANQUE DETENIDO[^\n]*/) || [''])[0];
      console.log(`      dijo: ${linea.slice(0, 200)}`);
    }
  } finally {
    fs.writeFileSync(RUTA, BUF_ORIGINAL);
    const vuelto = sha(fs.readFileSync(RUTA));
    if (vuelto !== SHA_ORIGINAL) {
      console.error(`!!! ${path.relative(RAIZ, RUTA)} NO volvió a su sha256 original (${SHA_ORIGINAL}).`);
      process.exitCode = 2;
    } else {
      console.log(`     (${path.relative(RAIZ, RUTA)} restaurado, sha256 ${SHA_ORIGINAL.slice(0, 16)})`);
    }
  }

  // 3.b — y con el archivo sano, el arranque tiene que pasar el guard.
  const sano = levantar();
  caso('con la declaración sana, el arranque pasa el guard (control negativo)',
    /\[andamio\] OK/.test(sano.salida), `exit=${sano.code} · ${String(sano.salida).replace(/\s+/g, ' ').slice(0, 200)}`);

  // Restauración del estado publicado que el arranque escribió al pasar.
  if (BUF_DRIFT) {
    fs.writeFileSync(RUTA_DRIFT, BUF_DRIFT);
    const v = sha(fs.readFileSync(RUTA_DRIFT));
    if (v !== SHA_DRIFT) { console.error('!!! data/catalogo/estado_drift.json NO volvió a su sha original.'); process.exitCode = 2; }
    else console.log(`     (data/catalogo/estado_drift.json restaurado, sha256 ${SHA_DRIFT.slice(0, 16)})`);
  }

  console.log('');
  console.log('='.repeat(78));
  console.log(`MORDIDA: ${ok}/${ok + fallos}${fallos ? '  — HAY CONTROLES QUE NO MUERDEN' : ''}`);
  console.log('='.repeat(78));
  if (fallos) process.exitCode = 1;
})().catch(e => { console.error('ABORTADO: ' + e.message); process.exit(1); });
