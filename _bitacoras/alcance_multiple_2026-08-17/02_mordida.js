// _bitacoras/alcance_multiple_2026-08-17/02_mordida.js
//
// §4.6 — UN CONTROL TIENE QUE PODER FALLAR.
//
// 01_medir_multiple.js sale exit 0. Este archivo prueba que ese 0 significa algo:
// inyecta un defecto por vez en una COPIA del instrumento, la corre como proceso
// hijo, y exige que el instrumento MUERDA con el exit code que declaro.
//
// La mordida importante es la SEXTA: angosta la red de candidatos y exige que el
// instrumento se ponga rojo. Sin ella, "la tabla cubre a los candidatos" seria
// tautologico — la tabla y la red se estarian validando entre si con el mismo
// universo. Angostando la red, la tabla queda con sobrantes y tiene que gritar.
//
// El original NO se toca: se copia, se muta la copia, se corre, se borra. El
// sha256 del original se comprueba antes y despues.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ORIGINAL = path.join(__dirname, '01_medir_multiple.js');
const SALIDA = path.join(__dirname, '02_mordida.txt');

const lineas = [];
const say = (s = '') => { lineas.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
let FALLAS = 0;
let MORDIDAS = 0;

const shaDe = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const shaAntes = shaDe(ORIGINAL);

hr();
say('MORDIDA DEL INSTRUMENTO (§4.6) — los controles de 01_medir_multiple.js');
say('Sesion ALCANCE-MULTIPLE-RECONOCIMIENTO, 2026-08-17.');
hr();
say('');
say(`  original      : 01_medir_multiple.js`);
say(`  sha256 antes  : ${shaAntes}`);
say('');
say('  El original NO se modifica. Cada mordida corre sobre una copia temporal');
say('  en este mismo directorio, que se borra al terminar.');
say('');

const src = fs.readFileSync(ORIGINAL, 'utf8');

const MORDIDAS_DEF = [
  {
    rotulo: 'M1 · un literal declarado que el dato NO contiene',
    porque: 'prueba "si un literal no se encuentra es FALLA, no no-aplicable"',
    de: "lit: 'CERRADO PARA TODA TIPO EMBARCACIONES FUERA DE LA BAHIA DE CORRAL'",
    a: "lit: 'CERRADO PARA TODA TIPO EMBARCACIONES FUERA DE LA BAHIA DE ANCUD'",
    exit: 4,
  },
  {
    rotulo: 'M2 · la tabla pierde un candidato que la red SI captura',
    porque: 'prueba que la tabla no puede quedar corta sin que nadie lo note',
    de: "  '95156': { multi: false, motivo: 'remision a los limites de operacion de las mayores, no un cierre para ellas',\n    lit: 'DE NAVES MAYORES EN PUERTOS Y TERMINALES MARITIMOS OBRARAN EN CONSECUENCIA A LOS LIMITES DE OPERACION' },\n",
    a: '',
    exit: 4,
  },
  {
    rotulo: 'M3 · la tabla declara un ID que la red NO captura',
    porque: 'prueba el sentido inverso: los sobrantes tampoco pasan',
    de: "  '94977': { multi: false,",
    a: "  '95201': { multi: false, motivo: 'inyectado', lit: 'PARA NAVES Y EMBARCACIONES' },\n  '94977': { multi: false,",
    exit: 4,
  },
  {
    rotulo: 'M4 · un caso heredado (C2, 95219) deja de leerse como multiple',
    porque: 'prueba que lo que la sesion anterior midio no se puede perder en silencio',
    de: "  '95219': { multi: true, forma: 'G2', alcances: [",
    a: "  '95219': { multi: false, motivo: 'inyectado', lit: 'CERRADO PARA TODA TIPO EMBARCACIONES FUERA DE LA BAHIA DE CORRAL' },\n  '95219x': { multi: true, forma: 'G2', alcances: [",
    exit: 4,
  },
  {
    rotulo: 'M5 · la particion de arranque se corrompe (19 -> 20)',
    porque: 'prueba el control de arranque: si el derivador cambia, esto aborta',
    de: 'no_legible: 19 }',
    a: 'no_legible: 20 }',
    exit: 3,
  },
  {
    rotulo: 'M6 · LA RED SE ANGOSTA — se le saca la rama (c), sin numeros',
    porque: 'prueba que la red y la tabla NO se validan entre si: si la red deja de ver\n               94985/95099/95100, la tabla queda con sobrantes y el control grita',
    de: '  if (s.nums.length === 0 && clases >= 2) return true;',
    a: '  if (false) return true;',
    exit: 4,
  },
  {
    rotulo: 'M7 · una forma sale del vocabulario declarado (G1 -> G4)',
    porque: 'prueba que el conteo por forma tiene que CERRAR contra el total de multiples',
    de: "  '95347': { multi: true, forma: 'G1',",
    a: "  '95347': { multi: true, forma: 'G4',",
    exit: 3,
  },
  {
    rotulo: 'M8 · el denominador de restricciones cerradas se corrompe (167 -> 168)',
    porque: 'prueba que el denominador que se publica es el que se midio',
    de: 'if (porId.size !== 167)',
    a: 'if (porId.size !== 168)',
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
    MORDIDAS++;
    continue;
  }
  let mut = src.replace(m.de, m.a);
  mut = mut.replace("'01_medir_multiple.txt'", `'.mordida_tmp_${MORDIDAS}.txt'`);
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

const shaDespues = shaDe(ORIGINAL);
say(`  sha256 despues: ${shaDespues}`);
if (shaAntes !== shaDespues) { FALLAS++; say('  *** EL ORIGINAL CAMBIO'); }
else say('  el original es identico byte a byte — OK');

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
  ? `LAS ${MORDIDAS} MORDIDAS MUERDEN. El exit 0 de 01_medir_multiple.js significa algo.`
  : `*** ${FALLAS} FALLA(S) — hay al menos un control decorativo.`);
hr();

fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
process.exit(FALLAS === 0 ? 0 : 1);
