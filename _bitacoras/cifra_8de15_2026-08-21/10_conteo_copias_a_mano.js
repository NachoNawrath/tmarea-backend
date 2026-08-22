'use strict';
// REMEDICION DE LA FILA D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia.
// Instruccion del owner: numero fresco, sin tocar el texto de la fila.
//
// QUE MIDE: cuantas veces la cifra aparece escrita A MANO en ficheros
// TRACKEADOS de los dos repos. La fila existe porque el emisor es la unica
// salida legal y NADA impide que alguien escriba el numero a mano en otro lado;
// cada vez que la cifra se mueve, todas esas copias quedan falsas de golpe.
//
// LO QUE ESTE INSTRUMENTO NO HACE, Y ES LA MITAD DEL PROBLEMA: no separa CITA
// HISTORICA de AFIRMACION VIVA. La mayoria de estas apariciones DEBE seguir
// diciendo el numero viejo —viven en bitacoras y son el registro de lo que era
// cierto cuando se escribieron—. Distinguirlas es trabajo de la fila, no de este
// conteo, y por eso el numero se reporta como COTA SUPERIOR del barrido pendiente.
//
// Se cuenta sobre `git ls-files` y no sobre el disco: node_modules y lo no
// trackeado no son deuda de nadie.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPOS = [
  ['tmarea-backend', path.join(__dirname, '..', '..')],
  ['tmarea-pwa', path.join(__dirname, '..', '..', '..', 'tmarea-pwa')],
];

// Las formas que hay que buscar. La "vieja" es la que esta pieza acaba de
// invalidar; las anteriores siguen contadas porque el problema es acumulativo.
const FORMAS = [
  ['4 de 15', /4 de 15/g],
  ['5 de 15', /5 de 15/g],
  ['4 de 17', /4 de 17/g],
  ['8 de 15', /8 de 15/g],
];

// EL CORPUS SE DECLARA, Y ESTE INSTRUMENTO SE EXCLUYE A SI MISMO.
// Medido el 2026-08-21: este script ESCRIBE su salida DENTRO del arbol que
// cuenta. Lee `14_conteo_FINAL.txt`, lo cuenta, y despues lo pisa — asi que dos
// corridas seguidas dan numeros distintos y un grep externo no lo reproduce. La
// primera vez la diferencia fue de 2 apariciones y 1 fichero, y se descubrio
// justamente porque un segundo instrumento no reprodujo al primero.
//
// NO SE PERSIGUE UN PUNTO FIJO: se declara el corpus. El numero de titular es el
// del RESTO DEL ARBOL, y lo que esta pieza aporta se informa aparte, porque son
// citas por construccion — la evidencia de un movimiento de la cifra cita la
// cifra vieja, y no puede no hacerlo.
const DIR_DE_ESTA_PIEZA = '_bitacoras/cifra_8de15_2026-08-21/';

const totales = {};
FORMAS.forEach(([r]) => (totales[r] = { apariciones: 0, ficheros: new Set(), propias: 0, propiasFicheros: new Set() }));

for (const [nombre, raiz] of REPOS) {
  let lista;
  try {
    lista = execFileSync('git', ['-C', raiz, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch (e) {
    console.log(`${nombre}: no se pudo listar (${e.message})`);
    continue;
  }
  for (const rel of lista) {
    const abs = path.join(raiz, rel);
    let txt;
    try {
      const st = fs.statSync(abs);
      if (!st.isFile() || st.size > 4 * 1024 * 1024) continue;
      txt = fs.readFileSync(abs, 'utf8');
    } catch { continue; }
    if (txt.includes('\0')) continue; // binario
    for (const [rot, re] of FORMAS) {
      const n = (txt.match(re) || []).length;
      if (n) {
        if (rel.startsWith(DIR_DE_ESTA_PIEZA)) {
          totales[rot].propias += n;
          totales[rot].propiasFicheros.add(`${nombre}/${rel}`);
        } else {
          totales[rot].apariciones += n;
          totales[rot].ficheros.add(`${nombre}/${rel}`);
        }
      }
    }
  }
}

console.log('CONTEO DE LA CIFRA ESCRITA A MANO — ficheros trackeados de los dos repos');
console.log('Medido el 2026-08-21, despues de mover la cifra a 8 de 15.');
console.log('');
console.log('CORPUS: todo lo trackeado de los dos repos MENOS ' + DIR_DE_ESTA_PIEZA + ',');
console.log('que es la evidencia de esta misma pieza y se informa aparte.');
console.log('');
for (const [rot] of FORMAS) {
  const t = totales[rot];
  console.log(`  "${rot}" ....... ${String(t.apariciones).padStart(3)} apariciones en ${String(t.ficheros.size).padStart(2)} ficheros`
    + `   [+ ${String(t.propias).padStart(2)} en ${String(t.propiasFicheros.size).padStart(2)} de esta pieza]`);
}
console.log('');
const vieja = totales['5 de 15'];
const porRepo = {};
for (const f of vieja.ficheros) {
  const r = f.split('/')[0];
  porRepo[r] = (porRepo[r] || 0) + 1;
}
console.log('LA CADENA QUE ESTA PIEZA ACABA DE INVALIDAR — "5 de 15":');
console.log(`  ${vieja.apariciones} apariciones en ${vieja.ficheros.size} ficheros`);
console.log(`  por repo: ${Object.entries(porRepo).map(([k, v]) => `${k} ${v}`).join(' · ') || 'ninguno'}`);
console.log('');
console.log('  Los ficheros:');
[...vieja.ficheros].sort().forEach(f => console.log('    ' + f));
console.log('');
console.log('COTA, NO MEDIDA EXACTA: este conteo NO separa cita historica de afirmacion');
console.log('viva. Ese es el barrido que la fila declara pendiente.');
