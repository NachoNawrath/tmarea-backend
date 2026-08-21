// Control del INDICE para la pieza de las dos reglas de CLAUDE.md.
// Shell de ejecucion: Git Bash. Reproducible: node <ruta>
// El esperado sale de la CORRIDA (se enumera lo que hay), no de una premisa.
const { execFileSync } = require('child_process');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const g = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const LF = String.fromCharCode(10), CR = String.fromCharCode(13);

let fallos = 0;
const chk = (ok, txt) => { if (!ok) fallos++; console.log((ok ? 'OK    ' : 'FALLA ') + txt); };

console.log('1 - CLAUDE.md EN EL INDICE');
const staged = g('diff', '--cached', '--name-only').split(LF).filter(Boolean);
chk(staged.includes('CLAUDE.md'), 'CLAUDE.md esta stageado');
const sucio = g('diff', '--name-only', '--', 'CLAUDE.md').split(LF).filter(Boolean);
chk(sucio.length === 0, 'CLAUDE.md no tiene resto sin stagear (indice == arbol)');

console.log('');
console.log('2 - EL BLOB QUE SE VA A COMMITEAR');
const blob = g('show', ':CLAUDE.md');
chk(blob.charCodeAt(0) !== 0xFEFF, 'el blob no arranca con BOM');
chk(blob.indexOf(CR) === -1, 'el blob no trae CR');
chk(blob === blob.normalize('NFC'), 'el blob esta en NFC');
const TOK = [
  '### 4.7 ' + String.fromCharCode(0x2014) + ' Simplicidad primero',
  '### 4.8 ' + String.fromCharCode(0x2014) + ' Cambios quir' + String.fromCharCode(0xFA) + 'rgicos',
  'el test que lo reproduce',
  'no era imposible.',
  'te enrut' + String.fromCharCode(0xF3) + ' a vos',
  'en c' + String.fromCharCode(0xF3) + 'digo en vez de en prosa'
];
for (const t of TOK) chk(blob.split(t).length - 1 === 1, 'el blob trae 1 vez: ' + t);
const RNA = 'Redactar no es aplicar';
chk(blob.split(RNA).length - 1 === 2, 'el blob trae 2 veces (4.8 y 6.1): ' + RNA);

console.log('');
console.log('3 - SOLO INSERCIONES (no se reescribio nada existente)');
const ns = g('diff', '--cached', '--numstat', '--', 'CLAUDE.md').trim().split(/\s+/);
console.log('      numstat CLAUDE.md: +' + ns[0] + ' -' + ns[1]);
chk(ns[1] === '0', 'cero lineas borradas en CLAUDE.md');

console.log('');
console.log('4 - LOS MODIFICADOS-NO-STAGEADOS, ENUMERADOS DESDE LA CORRIDA');
const porc = g('status', '--porcelain=v1').split(LF).filter(Boolean);
const mods = porc.filter(l => l.slice(0, 2) === ' M').map(l => l.slice(3));
console.log('      encontrados: ' + mods.length);
for (const m of mods) {
  const enIndice = staged.includes(m);
  console.log('      - ' + m + (enIndice ? '   <-- EN EL INDICE' : ''));
  chk(!enIndice, 'fuera del indice: ' + m);
}
const INTOCABLES = ['.claude/launch.json', 'data/catalogo/estado_drift.json'];
for (const i of INTOCABLES) chk(mods.includes(i), 'el intocable sigue modificado y fuera: ' + i);

console.log('');
console.log('5 - NADA DEL MOTOR NI DEL CONTRATO EN EL INDICE');
for (const s of staged) {
  const prohibido = s.startsWith('src/') || s === 'CONTRATO_MOTOR.md';
  chk(!prohibido, 'permitido en el indice: ' + s);
}

console.log('');
console.log(fallos === 0 ? 'VEREDICTO: VERDE' : 'VEREDICTO: ROJO (' + fallos + ')');
process.exit(fallos === 0 ? 0 : 1);
