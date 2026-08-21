// Aplica el bullet de §7.1 y la seccion §5.6 a CLAUDE.md.
// Shell de ejecucion: Git Bash. Reproducible: node <ruta>
// Los bloques se leen de este mismo directorio (§3.4). LF, sin BOM, NFC.
const fs = require('fs');
const path = require('path');
const CR = String.fromCharCode(13);
const RAIZ = path.resolve(__dirname, '..', '..');
const OBJETIVO = process.argv[2] || path.join(RAIZ, 'CLAUDE.md');
const DIR = process.argv[3] || __dirname;

const leer = f => fs.readFileSync(path.join(DIR, f), 'utf8').split(CR).join('').normalize('NFC');

const PIEZAS = [
  { ancla: '- **Nunca** matar node por nombre: mata Vite al mismo tiempo. Se mata por PID.',
    bloque: leer('a1_bullet_71.txt') },
  { ancla: 'Sesiones cortas y de un solo objetivo. Si el trabajo se abre en frentes, se reporta y se'
      + String.fromCharCode(10) + 'elige uno.',
    bloque: leer('a2_seccion_56.txt') }
];

let txt = fs.readFileSync(OBJETIVO, 'utf8');
if (txt.charCodeAt(0) === 0xFEFF) { console.error('ABORTA: el objetivo trae BOM'); process.exit(3); }
if (txt.indexOf(CR) !== -1) { console.error('ABORTA: el objetivo trae CR'); process.exit(3); }
if (txt.indexOf('### 5.6') !== -1) { console.error('ABORTA: 5.6 ya existe'); process.exit(3); }
if (txt.indexOf('git status` miente') !== -1) { console.error('ABORTA: el bullet de 7.1 ya existe'); process.exit(3); }

for (const p of PIEZAS) {
  const n = txt.split(p.ancla).length - 1;
  if (n !== 1) { console.error('ABORTA: ancla ' + n + ' veces: ' + p.ancla.slice(0, 40)); process.exit(3); }
  const i = txt.indexOf(p.ancla) + p.ancla.length;
  txt = txt.slice(0, i) + p.bloque + txt.slice(i);
}
fs.writeFileSync(OBJETIVO, txt.normalize('NFC'), { encoding: 'utf8' });

const rel = fs.readFileSync(OBJETIVO, 'utf8');
const S = String.fromCharCode(0xA7);
const TOKENS = ['### 5.6 ' + String.fromCharCode(0x2014) + ' Se abre con un gate',
  'git status` miente', 'core.autocrlf=true', 'se pide por pieza y no por regla',
  'invalida la cach' + String.fromCharCode(0xE9) + ' de `stat`', S + '5.2 dice',
  '## 6. L' + String.fromCharCode(0xCD) + 'MITES DUROS', '### 7.2 ' + String.fromCharCode(0x2014)];
let fallos = 0;
for (const t of TOKENS) { const c = rel.split(t).length - 1; if (c < 1) fallos++; console.log((c >= 1 ? 'OK  ' : 'FALLA ') + c + '  ' + t); }
if (rel.charCodeAt(0) === 0xFEFF) { console.log('FALLA BOM'); fallos++; } else console.log('OK    sin BOM');
if (rel.indexOf(CR) !== -1) { console.log('FALLA CR'); fallos++; } else console.log('OK    sin CR');
if (rel !== rel.normalize('NFC')) { console.log('FALLA no NFC'); fallos++; } else console.log('OK    NFC');
console.log('bytes ' + Buffer.byteLength(rel, 'utf8'));
process.exit(fallos === 0 ? 0 : 1);
