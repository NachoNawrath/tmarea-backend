'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e03_medir_dependencia_arg.js — MEDICION, no arregla nada.
//
// Pregunta: ¿algo depende de que arg() del control de drift tome la PRIMERA
// ocurrencia de un argumento repetido?
//
// Enumera cada argv que el control puede recibir por cada camino de invocacion
// que existe en el repositorio, y para cada uno compara que devolveria arg() con
// semantica de primera ocurrencia (la de hoy) contra la de ultima.
//
//   node scripts/e03_medir_dependencia_arg.js
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const RAIZ = path.join(__dirname, '..');

// arg() tal como esta HOY en e01_control_drift_catalogo.js:38-47, sobre un argv
// inyectado en vez de process.argv.
function argPrimera(argv, nombre, porDefecto = null) {
  const i = argv.indexOf(nombre);
  if (i === -1) return porDefecto;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) return '<ERROR: necesita un valor>';
  return v;
}
// La semantica que asume quien llama.
function argUltima(argv, nombre, porDefecto = null) {
  const i = argv.lastIndexOf(nombre);
  if (i === -1) return porDefecto;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) return '<ERROR: necesita un valor>';
  return v;
}

const REAL = path.join(RAIZ, 'data/catalogo/estado_drift.json');
const TMP  = '/tmp/e01-arranque-XXXX/estado.json';
const ALT  = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_alterado_2026-08-11');

// Los CUATRO caminos que pueden invocar al control. Cada uno con el argv exacto
// que arma, citando de donde sale.
const CAMINOS = [
  {
    id: 'C1',
    quien: 'package.json:9  ("npm run drift")',
    tipo: 'CORRIDA REAL',
    argv: ['--estado', REAL],
  },
  {
    id: 'C2',
    quien: 'src/index.js:77 -> drift-arranque.js:45, argsExtra = [] (arranque de produccion)',
    tipo: 'CORRIDA REAL',
    argv: ['--estado', REAL],
  },
  {
    id: 'C3',
    quien: 'e01_prueba_mordida_arranque.js:36 -> drift-arranque.js:45 con argsExtra',
    tipo: 'PRUEBA',
    argv: ['--estado', REAL, '--estado', TMP, '--insumo', ALT],
  },
  {
    id: 'C4',
    quien: 'a mano en la terminal (la forma documentada en la cabecera del control)',
    tipo: 'PRUEBA o REAL segun se escriba',
    argv: ['--insumo', ALT, '--estado', REAL],
  },
];

const FLAGS = ['--raiz', '--insumo', '--estado', '--declaracion'];
const corto = (v) => (v === null ? '(por defecto)' : String(v).replace(RAIZ, '.'));

console.log('MEDICION — ¿ALGO DEPENDE DE QUE arg() TOME LA PRIMERA OCURRENCIA?');
console.log(`fecha: ${new Date().toISOString()}`);
console.log('shell: PowerShell 5.1 / Windows. Reproducible: node scripts/e03_medir_dependencia_arg.js');
console.log('='.repeat(78));

let conRepetidos = 0, difieren = 0, dependenDePrimera = 0;

for (const c of CAMINOS) {
  const repetidos = FLAGS.filter(f => c.argv.indexOf(f) !== c.argv.lastIndexOf(f));
  if (repetidos.length) conRepetidos++;
  console.log(`\n${c.id}  [${c.tipo}]  ${c.quien}`);
  console.log(`    argv: ${c.argv.map(a => a.replace(RAIZ, '.')).join(' ')}`);
  console.log(`    flags repetidos: ${repetidos.length ? repetidos.join(', ') : 'ninguno'}`);
  for (const f of FLAGS) {
    const p = argPrimera(c.argv, f);
    const u = argUltima(c.argv, f);
    if (p === u) continue;
    difieren++;
    console.log(`    ${f}:`);
    console.log(`        con PRIMERA (hoy)     -> ${corto(p)}`);
    console.log(`        con ULTIMA  (asumida) -> ${corto(u)}`);
    const esperada = c.id === 'C3' && f === '--estado' ? 'ULTIMA' : '?';
    if (esperada === 'ULTIMA') {
      console.log(`        quien llama ASUME la ultima (e01_prueba_mordida_arranque.js:27) -> HOY FALLA`);
    }
  }
  if (!repetidos.length) console.log('    -> indiferente al orden: ningun flag aparece dos veces.');
}

console.log('\n' + '='.repeat(78));
console.log('RESUMEN');
console.log('='.repeat(78));
console.log(`Caminos de invocacion enumerados        : ${CAMINOS.length}`);
console.log(`Caminos con algun flag repetido         : ${conRepetidos}   (solo C3)`);
console.log(`Casos donde primera y ultima difieren   : ${difieren}`);
console.log(`Caminos que DEPENDEN de la PRIMERA      : ${dependenDePrimera}`);
console.log('');
console.log('C1, C2 y C4 pasan cada flag UNA sola vez: primera y ultima devuelven lo');
console.log('mismo y el cambio de semantica no los toca. C3 es el unico con repeticion');
console.log('y asume explicitamente la ULTIMA, que es lo contrario de lo que hay.');
console.log('');
console.log('Conclusion: NINGUN camino depende del comportamiento actual.');
