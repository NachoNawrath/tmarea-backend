// _bitacoras/alcance_no_legible_2026-08-17/02_mordida.js
//
// §4.6 — UN CONTROL TIENE QUE PODER FALLAR.
//
// 01_medir_alcance.js sale exit 0. Este archivo prueba que ese 0 significa algo:
// inyecta un defecto por vez en una COPIA del instrumento, la corre como proceso
// hijo, y exige que el instrumento MUERDA con el exit code que declaro.
//
// Si alguna mordida NO muerde, el control correspondiente es decorativo y este
// archivo sale distinto de 0.
//
// El original NO se toca: se copia, se muta la copia, se corre, se borra. El
// sha256 del original se comprueba antes y despues.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ORIGINAL = path.join(__dirname, '01_medir_alcance.js');
const SALIDA = path.join(__dirname, '02_mordida.txt');

const lineas = [];
const say = (s = '') => { lineas.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
let FALLAS = 0;
let MORDIDAS = 0;

const shaDe = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const shaAntes = shaDe(ORIGINAL);

hr();
say('MORDIDA DEL INSTRUMENTO (§4.6) — los controles de 01_medir_alcance.js');
say('Sesion ALCANCE-NO-LEGIBLE-RECONOCIMIENTO, 2026-08-17.');
hr();
say('');
say(`  original      : 01_medir_alcance.js`);
say(`  sha256 antes  : ${shaAntes}`);
say('');
say('  El original NO se modifica. Cada mordida corre sobre una copia temporal');
say('  en este mismo directorio, que se borra al terminar.');
say('');

const src = fs.readFileSync(ORIGINAL, 'utf8');

// Cada mordida: qué defecto se inyecta, y con qué exit code tiene que morder.
const MORDIDAS_DEF = [
  {
    rotulo: 'M1 · un literal declarado de (b) que el dato NO contiene',
    porque: 'prueba el control "si un literal no se encuentra es FALLA, no no-aplicable"',
    de: "literal: 'TODA LA JURISDICCION DE JUAN FERNANDEZ'",
    a: "literal: 'TODA LA JURISDICCION DE ISLA DE PASCUA'",
    exit: 4,
  },
  {
    rotulo: 'M2 · la tabla (a)/(b) pierde uno de los 14 IDs medidos',
    porque: 'prueba que la tabla no puede quedar corta sin que nadie lo note',
    de: "'95332': { bolsa: 'a', literal: null, eje: null },",
    a: '',
    exit: 4,
  },
  {
    rotulo: 'M3 · la tabla declara un ID que NO es no_legible',
    porque: 'prueba el sentido inverso: sobrantes tampoco pasan',
    de: "'94978': { bolsa: 'a', literal: null, eje: null },",
    a: "'94978': { bolsa: 'a', literal: null, eje: null },\n  '95099': { bolsa: 'a', literal: null, eje: null },",
    exit: 4,
  },
  {
    rotulo: 'M4 · una forma de (6) cita un ID que no esta en (b)',
    porque: 'prueba que las formas no pueden inventar cobertura',
    de: "ids: ['95171'] },",
    a: "ids: ['95171', '95327'] },",
    exit: 4,
  },
  {
    rotulo: 'M5 · la particion esperada se corrompe (19 -> 20)',
    porque: 'prueba el control de arranque: si el derivador cambia, esto aborta',
    de: 'no_legible: 19 }',
    a: 'no_legible: 20 }',
    exit: 3,
  },
];

for (const m of MORDIDAS_DEF) {
  const tmp = path.join(__dirname, `.mordida_tmp_${MORDIDAS}.js`);
  say(`  ${m.rotulo}`);
  say(`      por que: ${m.porque}`);
  if (!src.includes(m.de)) {
    FALLAS++;
    say(`      *** NO SE PUDO INYECTAR: el literal a mutar no esta en el original.`);
    say(`          buscado: ${JSON.stringify(m.de)}`);
    say('');
    continue;
  }
  // Se muta SOLO la primera ocurrencia, y la copia escribe su .txt aparte.
  let mut = src.replace(m.de, m.a);
  mut = mut.replace("'01_medir_alcance.txt'", `'.mordida_tmp_${MORDIDAS}.txt'`);
  fs.writeFileSync(tmp, mut, { encoding: 'utf8' });

  let code = 0;
  try {
    execFileSync(process.execPath, [tmp], { stdio: 'pipe' });
    code = 0;
  } catch (e) {
    code = typeof e.status === 'number' ? e.status : -1;
  }
  const ok = code === m.exit;
  if (!ok) FALLAS++;
  say(`      exit esperado ${m.exit} · exit obtenido ${code}  ->  ${ok ? 'MUERDE' : '*** NO MUERDE'}`);
  say('');

  fs.unlinkSync(tmp);
  const tmpTxt = path.join(__dirname, `.mordida_tmp_${MORDIDAS}.txt`);
  if (fs.existsSync(tmpTxt)) fs.unlinkSync(tmpTxt);
  MORDIDAS++;
}

// El original quedo intacto
const shaDespues = shaDe(ORIGINAL);
say(`  sha256 despues: ${shaDespues}`);
if (shaAntes !== shaDespues) { FALLAS++; say('  *** EL ORIGINAL CAMBIO'); }
else say('  el original es identico byte a byte — OK');

// No quedan temporales
const sobras = fs.readdirSync(__dirname).filter((f) => f.startsWith('.mordida_tmp_'));
if (sobras.length) { FALLAS++; say(`  *** quedaron temporales: ${sobras.join(', ')}`); }
else say('  no quedaron temporales — OK');

say('');
say(`  mordidas corridas : ${MORDIDAS}`);
if (MORDIDAS === 0) { FALLAS++; say('  *** CERO MORDIDAS EFECTIVAS'); }
say(`  fallas            : ${FALLAS}`);
say('');
hr();
say(FALLAS === 0
  ? 'LOS CINCO CONTROLES MUERDEN. El exit 0 de 01_medir_alcance.js significa algo.'
  : `*** ${FALLAS} FALLA(S) — hay al menos un control decorativo.`);
hr();

fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
process.exit(FALLAS === 0 ? 0 : 1);
