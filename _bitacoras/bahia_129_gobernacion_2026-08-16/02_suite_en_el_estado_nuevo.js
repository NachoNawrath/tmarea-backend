'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 02_suite_en_el_estado_nuevo.js — ¿EN QUE QUEDA `npm test` CON LA PIEZA PUESTA?
//
// El plan tiene que contestar si la suite queda en verde ANTES de escribir, y
// eso no se contesta razonando: se corre. Este instrumento pone el estado nuevo
// —`gobernacion: "Punta Arenas"` en la 129 y la declaracion de `puerto_eden`
// retirada—, corre `npm test`, y REPONE los dos archivos comprobando sha256.
//
// Corre TRES veces la suite y no una, porque un numero solo no distingue "la
// pieza deja verde" de "ya estaba verde" ni de "la pieza sola alcanza":
//   base    : el arbol como esta hoy
//   parcial : SOLO la Gobernacion escrita, la declaracion sin retirar
//   entero  : la Gobernacion escrita Y la declaracion retirada
//
// NO deja ningun cambio: el bloque `finally` repone siempre, y el sha256 se
// comprueba al final. Si algo quedo mal repuesto, sale 3.
//
// Corrida:  node _bitacoras/bahia_129_gobernacion_2026-08-16/02_suite_en_el_estado_nuevo.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const shaBuf = b => crypto.createHash('sha256').update(b).digest('hex');
const shaDe = p => shaBuf(fs.readFileSync(abs(p)));

const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_ZA   = 'data/decreto/zonas_aviso.json';
const BAHIA  = '129';
const GOB_NUEVA = 'Punta Arenas';

const FALLA_LECTURA = [];
const RESPALDO = new Map();
for (const p of [P_MAPA, P_ZA]) RESPALDO.set(p, fs.readFileSync(abs(p)));
const reponer = () => { for (const [p, b] of RESPALDO) fs.writeFileSync(abs(p), b); };

function ponerGobernacion(valor) {
  const txt = fs.readFileSync(abs(P_MAPA), 'utf8');
  const re = new RegExp(`^(\\s*"${BAHIA}":\\s*\\{ "capitania": "[^"]*",\\s*"gobernacion": )"[^"]*"`, 'm');
  if (!re.test(txt)) throw new Error(`la linea de la bahia ${BAHIA} no calza el patron`);
  fs.writeFileSync(abs(P_MAPA), txt.replace(re, `$1"${valor}"`), 'utf8');
}
function retirarDeclaracion() {
  const z = JSON.parse(fs.readFileSync(abs(P_ZA), 'utf8'));
  const pe = z.zonas.find(x => x.jurisdiccion_id === 'puerto_eden');
  delete pe.contacto.discrepancias_declaradas;
  fs.writeFileSync(abs(P_ZA), JSON.stringify(z, null, 2), 'utf8');
}

// Se invoca el runner de `npm test` DIRECTAMENTE —`node --test`— y no `npm`:
// la primera version llamaba a `npm.cmd` y el spawn fallaba en silencio, con lo
// que las tres corridas devolvieron `null` y el instrumento igual imprimio
// "MEDICION COMPLETA". Es un control que sale en verde sin haber medido, que es
// la forma que este repositorio persigue. Se corrige el instrumento —no el
// control— en dos lugares: se llama al runner directo, y CADA cifra que no se
// pueda leer aborta.
// `package.json` declara `node --test src/services/__tests__/*.test.js`: el glob
// lo expande la shell. Se expande aca, con `fs`, en vez de pasar el directorio —
// pasar el directorio hizo que el runner viera UN solo "test" fallido y las
// cifras salieran leibles pero falsas, que es peor que ilegibles.
const DIR_TESTS = 'src/services/__tests__';
const ARCHIVOS_TEST = fs.readdirSync(abs(DIR_TESTS)).filter(f => f.endsWith('.test.js')).map(f => `${DIR_TESTS}/${f}`);
const CMD_SUITE = ['--test', ...ARCHIVOS_TEST];
function correrSuite(etq) {
  const r = spawnSync(process.execPath, CMD_SUITE, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 });
  const s = (r.stdout || '') + (r.stderr || '');
  const num = re => { const m = s.match(re); return m ? Number(m[1]) : null; };
  const out = { tests: num(/^ℹ tests (\d+)/m), pass: num(/^ℹ pass (\d+)/m), fail: num(/^ℹ fail (\d+)/m), code: r.status };
  if (r.error) FALLA_LECTURA.push(`${etq}: el proceso no arranco — ${r.error.message}`);
  for (const k of ['tests', 'pass', 'fail']) {
    if (out[k] === null) FALLA_LECTURA.push(`${etq}: no se pudo leer '${k}' de la salida de la suite`);
  }
  if (out.tests !== null && out.tests === 0) FALLA_LECTURA.push(`${etq}: la suite reporto 0 tests`);
  return out;
}


L('================================================================================');
L('LA SUITE EN LOS TRES ESTADOS — corrida, no razonada');
L('================================================================================');
L('');
L('  RESPALDO, con sha256 de partida:');
for (const [p, b] of RESPALDO) L(`      ${p.padEnd(45)} ${shaBuf(b)}`);

const R = {};
let corridas = 0;
try {
  L('');
  L('  (1) BASE — el arbol como esta hoy');
  R.base = correrSuite('base'); corridas++;
  L(`      tests ${R.base.tests} · pass ${R.base.pass} · fail ${R.base.fail} · exit ${R.base.code}`);

  L('');
  L(`  (2) PARCIAL — SOLO "${GOB_NUEVA}" escrita, la declaracion SIN retirar`);
  ponerGobernacion(GOB_NUEVA);
  R.parcial = correrSuite('parcial'); corridas++;
  L(`      tests ${R.parcial.tests} · pass ${R.parcial.pass} · fail ${R.parcial.fail} · exit ${R.parcial.code}`);

  L('');
  L(`  (3) ENTERO — "${GOB_NUEVA}" escrita Y la declaracion RETIRADA`);
  retirarDeclaracion();
  R.entero = correrSuite('entero'); corridas++;
  L(`      tests ${R.entero.tests} · pass ${R.entero.pass} · fail ${R.entero.fail} · exit ${R.entero.code}`);
} finally {
  reponer();
}

L('');
L('  RESTAURACION, comprobada por sha256:');
let mal = 0;
for (const [p, b] of RESPALDO) {
  const ok = shaDe(p) === shaBuf(b);
  if (!ok) mal++;
  L(`      ${p.padEnd(45)} ${ok ? 'OK' : 'MAL REPUESTO'}`);
}

L('');
L(`  COMPARACIONES EFECTIVAS (corridas de la suite) : ${corridas}`);
L('');
L('  QUE DICE LA COMPARACION DE LAS TRES:');
L(`      base ${R.base.pass}/${R.base.tests} -> parcial ${R.parcial.pass}/${R.parcial.tests} -> entero ${R.entero.pass}/${R.entero.tests}`);
if (R.base.fail === 0 && R.parcial.fail > 0 && R.entero.fail === 0) {
  L('      La pieza A MEDIAS deja la suite EN ROJO y la pieza ENTERA la deja en verde.');
  L('      O sea que las dos mitades son UNA sola pieza: escribir la Gobernacion sin');
  L('      retirar la declaracion no es un estado intermedio valido, es un arbol roto.');
} else if (R.base.fail === 0 && R.parcial.fail === 0) {
  L('      LA MITAD PARCIAL NO ROMPE NADA: el control no distingue los dos estados.');
} else {
  L('      NO SE PUEDE CONCLUIR: la base no esta en verde.');
}

L('');
L('================================================================================');
if (corridas !== 3) { L(`ABORTA — se corrieron ${corridas} estados y tenian que ser 3.`); process.exit(3); }
if (FALLA_LECTURA.length) { L('ABORTA — no se pudo MEDIR: ' + FALLA_LECTURA.join(' · ')); L('Un instrumento que no lee sus cifras no distingue verde de no haber corrido.'); process.exit(3); }
// LA LINEA BASE ES PARTE DE LA MEDICION, no un dato de contexto: si el arbol de
// hoy no esta en verde, ninguna de las otras dos corridas significa nada y este
// instrumento NO puede concluir. Salir 0 aca seria imprimir un veredicto sin
// haberlo medido — que es lo que este mismo archivo ya hizo una vez.
if (R.base.fail !== 0) {
  L(`ABORTA — la linea base no esta en verde (fail ${R.base.fail} de ${R.base.tests}).`);
  L('Sin linea base conocida, "parcial" y "entero" no se distinguen de un arbol roto.');
  process.exit(3);
}
if (ARCHIVOS_TEST.length === 0) { L('ABORTA — cero archivos de test encontrados.'); process.exit(3); }
if (mal) { L(`ABORTA — ${mal} archivo(s) quedaron mal repuestos.`); process.exit(3); }
L('MEDICION COMPLETA. Los dos archivos quedaron repuestos y comprobados.');
L('================================================================================');
process.exit(0);
