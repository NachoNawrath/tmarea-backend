// Control del INDICE para la pieza de las dos lineas (§7.1 y §5.6) + el arreglo.
// Shell de ejecucion: Git Bash. Reproducible: node <ruta>
// El esperado sale de la CORRIDA: se enumera lo que hay, no se clava un numero.
const { execFileSync } = require('child_process');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const g = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const LF = String.fromCharCode(10), CR = String.fromCharCode(13);
let fallos = 0;
const chk = (ok, t) => { if (!ok) fallos++; console.log((ok ? 'OK    ' : 'FALLA ') + t); };

console.log('1 - LO STAGEADO');
const staged = g('diff', '--cached', '--name-only').split(LF).filter(Boolean);
chk(staged.includes('CLAUDE.md'), 'CLAUDE.md esta stageado');
const APLICADOR = '_bitacoras/dos_reglas_claudemd_2026-08-20/01_aplicar_claudemd.js';
chk(staged.includes(APLICADOR), 'el aplicador arreglado esta stageado');
// La salida de ESTE control se excluye: el redirect la trunca al arrancar, asi que
// mientras corre difiere de su copia stageada y el control se delataria a si mismo.
const PROPIO = '_bitacoras/dos_lineas_71_y_56_2026-08-20/03_control_contra_el_indice.txt';
chk(g('diff', '--name-only').split(LF).filter(Boolean).filter(f => staged.includes(f) && f !== PROPIO).length === 0,
  'ningun fichero stageado tiene resto sin stagear (salvo la salida de este control)');

console.log('');
console.log('2 - EL BLOB DE CLAUDE.md QUE SE VA A COMMITEAR');
const blob = g('show', ':CLAUDE.md');
chk(blob.charCodeAt(0) !== 0xFEFF, 'sin BOM');
chk(blob.indexOf(CR) === -1, 'sin CR');
chk(blob === blob.normalize('NFC'), 'NFC');
const TOK = ['### 5.6 ' + String.fromCharCode(0x2014) + ' Se abre con un gate',
  'core.autocrlf=true', 'git status` miente', 'se pide por pieza y no por regla',
  'invalida la cach' + String.fromCharCode(0xE9) + ' de `stat`'];
for (const t of TOK) chk(blob.split(t).length - 1 === 1, 'una vez: ' + t);
chk(blob.indexOf('### 5.5') < blob.indexOf('### 5.6'), '5.6 va despues de 5.5');
chk(blob.indexOf('### 5.6') < blob.indexOf('## 6. L'), '5.6 va antes de la seccion 6');
chk(blob.indexOf('Se mata por PID.') < blob.indexOf('core.autocrlf=true'), 'el bullet nuevo va al final de 7.1');
chk(blob.indexOf('core.autocrlf=true') < blob.indexOf('### 7.2'), 'el bullet nuevo va antes de 7.2');

console.log('');
console.log('3 - SOLO INSERCIONES EN CLAUDE.md');
const ns = g('diff', '--cached', '--numstat', '--', 'CLAUDE.md').trim().split(/\s+/);
console.log('      numstat CLAUDE.md: +' + ns[0] + ' -' + ns[1]);
chk(ns[1] === '0', 'cero lineas borradas');
const na = g('diff', '--cached', '--numstat', '--', APLICADOR).trim().split(/\s+/);
console.log('      numstat aplicador: +' + na[0] + ' -' + na[1]);
chk(na[0] === '1' && na[1] === '1', 'el arreglo es exactamente una linea por una');

console.log('');
console.log('4 - LOS MODIFICADOS-NO-STAGEADOS, ENUMERADOS DESDE LA CORRIDA');
const mods = g('status', '--porcelain=v1').split(LF).filter(Boolean)
  .filter(l => l.slice(0, 2) === ' M').map(l => l.slice(3));
console.log('      encontrados: ' + mods.length);
for (const m of mods) { console.log('      - ' + m); chk(!staged.includes(m), 'fuera del indice: ' + m); }
for (const i of ['.claude/launch.json', 'data/catalogo/estado_drift.json'])
  chk(mods.includes(i), 'el intocable sigue modificado y fuera: ' + i);

console.log('');
console.log('5 - NADA DEL MOTOR NI DEL CONTRATO');
for (const s of staged) chk(!(s.startsWith('src/') || s === 'CONTRATO_MOTOR.md'), 'permitido: ' + s);

console.log('');
console.log(fallos === 0 ? 'VEREDICTO: VERDE' : 'VEREDICTO: ROJO (' + fallos + ')');
process.exit(fallos === 0 ? 0 : 1);
