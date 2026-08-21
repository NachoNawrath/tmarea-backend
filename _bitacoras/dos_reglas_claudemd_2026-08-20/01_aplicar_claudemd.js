// Aplica el inserto de §4.6 (cierre), §4.7 y §4.8 a CLAUDE.md.
// Shell de ejecucion: Git Bash. Reproducible en PowerShell: node <ruta>
// Escribe LF, sin BOM, NFC. Verifica tokens DESPUES de escribir (no tamano).
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const OBJETIVO = path.join(RAIZ, 'CLAUDE.md');
const SP = process.argv[2] || __dirname;
// Sin argumento, los bloques se leen de este mismo directorio (§3.4: reproducible).

const CR = String.fromCharCode(13);

const bloques = ['b1.txt', 'b2.txt', 'b3.txt', 'b4.txt']
  .map(f => fs.readFileSync(path.join(SP, f), 'utf8').split(CR).join('').normalize('NFC'));
const inserto = bloques.join('');

const ANCLA = 'fallar no prueba nada. Un auditor que pierde capacidad no avisa por si mismo.'
  .replace('si mismo', 's' + String.fromCharCode(0xED) + ' mismo');

let txt = fs.readFileSync(OBJETIVO, 'utf8');
if (txt.charCodeAt(0) === 0xFEFF) { console.error('ABORTA: CLAUDE.md ya trae BOM'); process.exit(3); }
if (txt.indexOf(CR) !== -1) { console.error('ABORTA: CLAUDE.md trae CR'); process.exit(3); }
if (txt !== txt.normalize('NFC')) { console.error('ABORTA: CLAUDE.md no esta en NFC'); process.exit(3); }

const n = txt.split(ANCLA).length - 1;
if (n !== 1) { console.error('ABORTA: el ancla aparece ' + n + ' veces, se esperaba 1'); process.exit(3); }
if (txt.indexOf('### 4.7') !== -1 || txt.indexOf('### 4.8') !== -1) {
  console.error('ABORTA: 4.7 o 4.8 ya existen'); process.exit(3);
}

const i = txt.indexOf(ANCLA) + ANCLA.length;
const salida = (txt.slice(0, i) + inserto + txt.slice(i)).normalize('NFC');
fs.writeFileSync(OBJETIVO, salida, { encoding: 'utf8' });

// --- verificacion contra el fichero en disco, no contra la variable ---
const rel = fs.readFileSync(OBJETIVO, 'utf8');
const TOKENS = [
  '### 4.7 ' + String.fromCharCode(0x2014) + ' Simplicidad primero',
  '### 4.8 ' + String.fromCharCode(0x2014) + ' Cambios quir' + String.fromCharCode(0xFA) + 'rgicos',
  'no era imposible.',
  'el test que lo reproduce',
  'te enrut' + String.fromCharCode(0xF3) + ' a vos',
  'Redactar no es aplicar',
  '## 5. RITMO Y L' + String.fromCharCode(0xCD) + 'MITES'
];
let fallos = 0;
for (const t of TOKENS) {
  const c = rel.split(t).length - 1;
  const ok = c >= 1;
  if (!ok) fallos++;
  console.log((ok ? 'OK  ' : 'FALLA ') + c + '  ' + t);
}
if (rel.charCodeAt(0) === 0xFEFF) { console.log('FALLA  BOM'); fallos++; } else console.log('OK    sin BOM');
if (rel.indexOf(CR) !== -1) { console.log('FALLA  CR'); fallos++; } else console.log('OK    sin CR');
if (rel !== rel.normalize('NFC')) { console.log('FALLA  no NFC'); fallos++; } else console.log('OK    NFC');
console.log('bytes ' + Buffer.byteLength(rel, 'utf8') + '  lineas ' + rel.split(String.fromCharCode(10)).length);
process.exit(fallos === 0 ? 0 : 1);
