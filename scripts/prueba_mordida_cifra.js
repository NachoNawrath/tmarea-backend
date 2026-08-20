'use strict';
// MORDIDA del emisor de la cifra de §2.  `npm run cifra:mordida`
//
// Un instrumento nuevo no publica su primer resultado sin control positivo. Este
// muerde el dato de cinco formas distintas y exige que el emisor se DETENGA en
// las cinco; y despues corre el control negativo, que es la copia intacta.
//
// El modo de falla que se prueba es el que importa: que el emisor imprima una
// forma legal —«N de M, con K anuladas»— que NO describa el dato que tiene al
// lado. Un instrumento asi corre perfecto y publica una mentira bien formada,
// que es exactamente el genero de defecto que este proyecto ya tiene fichado
// ocho veces.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const RUTA = path.join(__dirname, '..', 'data', 'spec2', 'cifra_spec2.json');
const EMISOR = path.join(__dirname, 'publicar_cifra_spec2.js');
const ORIGINAL = fs.readFileSync(RUTA, 'utf8');

// Corre el emisor con el fichero mutado y devuelve el exit code.
function correrCon(json) {
  const respaldo = fs.readFileSync(RUTA, 'utf8');
  try {
    fs.writeFileSync(RUTA, JSON.stringify(json, null, 2) + '\n', { encoding: 'utf8' });
    try {
      execFileSync('node', [EMISOR], { encoding: 'utf8', stdio: 'pipe' });
      return 0;
    } catch (e) {
      return e.status == null ? -1 : e.status;
    }
  } finally {
    fs.writeFileSync(RUTA, respaldo, { encoding: 'utf8' });
  }
}

const MORDIDAS = [
  ['cumple + no_cumple != vigente', (j) => { j.denominador_fino.no_cumple = 10; }],
  ['vigente + anuladas != original', (j) => { j.denominador_fino.original = 20; }],
  ['el bloque anuladas pierde una entrada pero la cifra sigue diciendo 2', (j) => { j.anuladas.pop(); }],
  ['forma_legal declarada que NO describe el dato', (j) => { j.politica_de_publicacion.forma_legal = '4 de 15'; }],
  ['la vista por punto pierde su nota obligatoria', (j) => { j.denominador_por_punto.nota_obligatoria = 'sin cambio'; }],
  ['por punto: divididos incoherente con unanimes', (j) => { j.denominador_por_punto.divididos = 3; }],
];

let ok = 0, total = 0;
console.log('MORDIDA — el emisor de la cifra de §2 tiene que DETENERSE con el dato mutado');
console.log('');
for (const [rot, mutar] of MORDIDAS) {
  total++;
  const j = JSON.parse(ORIGINAL);
  mutar(j);
  const exit = correrCon(j);
  const paso = exit !== 0;
  if (paso) ok++;
  console.log(`  ${paso ? 'ok   ' : 'FALLA'} ${rot}  ->  exit ${exit}${paso ? '' : '  (publico igual — el guard no muerde)'}`);
}

console.log('');
console.log('CONTROL NEGATIVO — la copia SIN mutar tiene que publicar en verde:');
const exitLimpio = correrCon(JSON.parse(ORIGINAL));
total++;
if (exitLimpio === 0) { ok++; console.log('  ok    copia intacta -> exit 0'); }
else console.log(`  FALLA copia intacta -> exit ${exitLimpio}  (el guard muerde lo que no debe)`);

// El fichero tiene que haber quedado como estaba.
const final = fs.readFileSync(RUTA, 'utf8');
total++;
if (final === ORIGINAL) { ok++; console.log('  ok    el dato quedo byte a byte como estaba'); }
else console.log('  FALLA el dato NO quedo como estaba — la mordida ensucio el arbol');

console.log('');
console.log(`MORDIDA: ${ok}/${total}`);
process.exit(ok === total ? 0 : 1);
