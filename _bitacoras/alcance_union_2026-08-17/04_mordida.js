// _bitacoras/alcance_union_2026-08-17/04_mordida.js
//
// Sesión ALCANCE-UNION, FASE 2. §4.6 — UN CONTROL TIENE QUE PODER FALLAR.
//
// Que los 71 tests pasen no prueba nada por sí solo. Acá se le inyecta al
// derivador el defecto que cada control debe cazar, se corre la suite, y se
// exige que se ponga ROJO en los tests nombrados. Después se restaura y se
// comprueba el sha256 de ida y vuelta.
//
// LAS TRES MORDIDAS, con lo que cada una tiene que poner en rojo:
//   M1 · la unión toma el MÍNIMO en vez del máximo   -> los 9 que emitían el
//        más angosto vuelven a emitirlo
//   M2 · el léxico deja de leer el componente `todas` -> 95219 y 95220 pierden
//        la cola abierta y vuelven a umbral 50
//   M3 · la ventana deja de cortarse en el TERMINADOR -> los cuatro de la
//        remisión (95156-95159) se ensanchan. Es el riesgo real de la fuente B.
//        M3 apuntaba originalmente al guard de precedencia y NO mordió; el
//        porqué está medido y declarado en el bloque de MORDIDAS más abajo.
//
// EL ARCHIVO SE MODIFICA Y SE RESTAURA. Si la restauración no devuelve el mismo
// sha256, exit 6 y se dice — un instrumento que deja el árbol sucio es peor que
// no haber medido. La restauración corre también si el proceso muere.
//
// exit 3 una mordida NO mordió · exit 4 el patrón de inyección no se encontró ·
// exit 5 cero comparaciones · exit 6 la restauración no reprodujo el sha256.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const OBJETIVO = path.join(RAIZ, 'src', 'services', 'cierre-derivador.js');
const SUITE = path.join(RAIZ, 'src', 'services', '__tests__', 'cierre-derivador.test.js');
const SALIDA = path.join(__dirname, '04_mordida.txt');

const lineas = [];
const say = (s = '') => { lineas.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
let COMPARACIONES = 0, FALLAS = 0;

const ORIGINAL = fs.readFileSync(OBJETIVO, 'utf8');
const SHA_ANTES = crypto.createHash('sha256').update(ORIGINAL).digest('hex');
function restaurar() {
  try { fs.writeFileSync(OBJETIVO, ORIGINAL, { encoding: 'utf8' }); } catch (e) { /* nada que hacer */ }
}
process.on('exit', restaurar);
process.on('SIGINT', () => { restaurar(); process.exit(130); });

function morir(code, msg) {
  say(''); say('*** ABORTA — ' + msg);
  restaurar();
  const shaAhora = crypto.createHash('sha256').update(fs.readFileSync(OBJETIVO, 'utf8')).digest('hex');
  say(`    restaurado al abortar; sha256 ${shaAhora === SHA_ANTES ? 'IDENTICO' : '*** DISTINTO'}`);
  fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
  process.exit(code);
}
const pad = (s, n) => String(s).padEnd(n);

hr();
say('ALCANCE-UNION — FASE 2. MORDIDA (§4.6).');
say('Tres defectos inyectados, uno por vez. Cada uno tiene que poner la suite en rojo.');
hr();
say('');
say(`    objetivo : src/services/cierre-derivador.js`);
say(`    sha256 ANTES  ${SHA_ANTES}`);
say('');

// Corre la suite y devuelve { tests, pass, fail, rojos:[nombres] }.
function correrSuite() {
  let salida;
  try {
    salida = execFileSync('node', ['--test', SUITE], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 32 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    salida = String(e.stdout || '') + String(e.stderr || '');
  }
  const num = (k) => { const m = salida.match(new RegExp('^\\u2139 ' + k + ' (\\d+)$', 'm')); return m ? parseInt(m[1], 10) : null; };
  const rojos = [];
  const re = /^ *✖ (.+?) \(\d+\.\d+ms\)$/gm;
  let m;
  while ((m = re.exec(salida)) !== null) if (!rojos.includes(m[1])) rojos.push(m[1]);
  return { tests: num('tests'), pass: num('pass'), fail: num('fail'), rojos };
}

// ── LINEA BASE: en verde ANTES de inyectar nada ─────────────────────────────
hr('-'); say('(0) LINEA BASE — LA SUITE EN VERDE ANTES DE INYECTAR'); hr('-');
const base = correrSuite();
COMPARACIONES++;
say(`    tests ${base.tests} · pass ${base.pass} · fail ${base.fail}`);
if (base.fail !== 0) morir(3, `la linea base no esta en verde: fail ${base.fail}. No tiene sentido morder sobre rojo.`);
say('    OK — se muerde sobre verde, que es lo unico que prueba algo.');
say('');

// ── LAS TRES MORDIDAS ───────────────────────────────────────────────────────
// `busca` tiene que aparecer EXACTAMENTE una vez: si aparece cero o dos, la
// inyeccion no es la que se declara y es exit 4, no "no aplicable".
const MORDIDAS = [
  {
    rot: 'M1 · la union toma el MINIMO en vez del maximo',
    busca: 'return a.umbral >= b.umbral ? a : b;',
    pone: 'return a.umbral <= b.umbral ? a : b;',
    exige: ['95062', '95071', '95075', '95155', '95352'],
    espera: 'los 9 que emitian el mas angosto vuelven a emitirlo',
  },
  {
    rot: 'M2 · el lexico deja de leer el componente `todas`',
    busca: "    ...marcas(UNIVERSAL, resto).map((m) => ({ ...m, k: 'todas' })),\n",
    pone: '',
    exige: ['95219', '95220'],
    espera: '95219 y 95220 pierden la cola abierta y vuelven a umbral 50',
  },
  {
    // LA PRIMERA VERSION DE M3 ATACABA EL GUARD DE PRECEDENCIA
    // (`entraPorPredicado(antes)`) Y NO MORDIO: la suite quedo 71/71 en verde.
    // Se midio por que, en vez de aflojar el control (§0.3): el guard rechaza 63
    // de 402 ventanas y cambia el numero de componentes en 36 filas, pero mueve
    // CERO alcances emitidos sobre los 444. Lo que mantiene afuera al conjunto
    // negativo es la VENTANA, no la precedencia. La mordida se reapunta al
    // mecanismo que de verdad lo sostiene. El guard se conserva —es la definicion
    // de "gobierno", §4.5— y su inercia medida quedo declarada en el encabezado
    // del derivador; no se le reclama una mordida que no le corresponde.
    rot: 'M3 · la ventana deja de cortarse en el TERMINADOR',
    busca: '  const t = seg.match(TERMINADOR);\n    if (t) seg = seg.slice(0, t.index);',
    pone: '  const t = null;\n    if (t) seg = seg.slice(0, t.index);',
    exige: ['95156', '95157', '95158', '95159'],
    espera: 'la ventana se come el resto del texto y los cuatro de la remision se ensanchan',
    nota: '95072 NO se mueve con esta inyeccion y se dice por que: su segunda mencion '
        + '("NAVES SUPERIORES A 25 AB") absorbe un numero IGUAL al de la primera, '
        + 'asi que la union no cambia. Es un limite del conjunto negativo, medido.',
  },
];

for (const M of MORDIDAS) {
  hr('-'); say(`(${MORDIDAS.indexOf(M) + 1}) ${M.rot}`); hr('-');
  say(`    esperado: ${M.espera}`);
  if (M.nota) say(`    NOTA: ${M.nota}`);
  const veces = ORIGINAL.split(M.busca).length - 1;
  COMPARACIONES++;
  if (veces !== 1) morir(4, `el patron de ${M.rot} aparece ${veces} veces, no 1`);
  fs.writeFileSync(OBJETIVO, ORIGINAL.replace(M.busca, M.pone), { encoding: 'utf8' });
  const r = correrSuite();
  COMPARACIONES++;
  say(`    -> tests ${r.tests} · pass ${r.pass} · FAIL ${r.fail}`);
  if (r.fail === 0) { FALLAS++; say('    *** MORDIDA FALLIDA: se inyecto el defecto y la suite quedo en verde.'); }
  for (const n of r.rojos.slice(0, 14)) say(`       ✖ ${n}`);
  if (r.rojos.length > 14) say(`       ... y ${r.rojos.length - 14} mas`);
  // el control que importa: los IDs nombrados tienen que estar entre los rojos
  const texto = r.rojos.join(' | ');
  const faltan = M.exige.filter((id) => !texto.includes(id));
  COMPARACIONES += M.exige.length;
  if (faltan.length) { FALLAS++; say(`    *** NO se pusieron rojos los IDs: ${faltan.join(', ')}`); }
  else say(`    OK — los IDs exigidos estan todos en rojo: ${M.exige.join(', ')}`);
  fs.writeFileSync(OBJETIVO, ORIGINAL, { encoding: 'utf8' });
  say('');
}

// ── CIERRE Y RESTAURACION ───────────────────────────────────────────────────
hr('-'); say('(4) RESTAURACION'); hr('-');
const SHA_DESPUES = crypto.createHash('sha256').update(fs.readFileSync(OBJETIVO, 'utf8')).digest('hex');
say(`    sha256 DESPUES ${SHA_DESPUES}`);
say(`    ${SHA_DESPUES === SHA_ANTES ? 'IDENTICO al de antes — el archivo quedo como estaba.' : '*** DISTINTO'}`);
if (SHA_DESPUES !== SHA_ANTES) morir(6, 'la restauracion no reprodujo el sha256');
const fin = correrSuite();
COMPARACIONES++;
say(`    suite tras restaurar : tests ${fin.tests} · pass ${fin.pass} · fail ${fin.fail}`);
if (fin.fail !== 0) { FALLAS++; say('    *** la suite no volvio al verde'); }
say('');
say(`    comparaciones efectivas : ${COMPARACIONES}`);
if (COMPARACIONES === 0) morir(5, 'cero comparaciones efectivas');
say(`    controles fallidos      : ${FALLAS}`);
hr();
say(FALLAS === 0 ? 'LAS TRES MORDIERON.' : `*** ${FALLAS} CONTROL(ES) FALLIDO(S).`);
hr();
fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
process.exit(FALLAS === 0 ? 0 : 3);
