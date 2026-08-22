'use strict';
// MORDIDA del emisor de la cifra de §2.  `npm run cifra:mordida`
//
// Un instrumento nuevo no publica su primer resultado sin control positivo. Este
// muerde el dato de varias formas distintas y exige que el emisor se DETENGA en
// todas; y despues corre el control negativo, que es la copia intacta.
//
// LA CANTIDAD NO SE ESCRIBE ACA, Y ES POR LA LECCION (1) DE MAS ABAJO: esta
// cabecera ya dijo «cinco» cuando la lista tenia seis, y el 2026-08-21 habria
// dicho «once» cuando paso a tener quince. El total sale de contar la lista, que
// es la unica cuenta que no puede desincronizarse.
//
// El modo de falla que se prueba es el que importa: que el emisor imprima una
// forma legal —«N de M, con K anuladas»— que NO describa el dato que tiene al
// lado. Un instrumento asi corre perfecto y publica una mentira bien formada,
// que es exactamente el genero de defecto que este proyecto ya tiene fichado
// ocho veces.
//
// DOS COSAS QUE ESTA CABECERA TENIA MAL Y SE ARREGLAN EL 2026-08-21, PORQUE
// SON DEL MISMO GENERO QUE LO QUE EL SCRIPT PERSIGUE:
//
//  (1) DECIA «cinco formas» CUANDO LA LISTA TENIA SEIS. Nadie lo cazo porque el
//      total que el script imprime sale de contar la lista, no de esta linea:
//      el numero publicado era correcto y la prosa de al lado, escrita a mano,
//      no. La prosa pegada a un instrumento envejece sola y nada la mira.
//
//  (2) UNA MORDIDA DEJO DE MORDER SIN QUE NADIE SE ENTERARA, Y ES PEOR. La
//      primera mutaba `no_cumple` a 10 para romper la suma. Cuando la cifra
//      paso a 5 de 15, `no_cumple` PASO A VALER 10 — o sea que la mutacion se
//      volvio una copia identica del dato y la mordida habria salido en verde
//      sin morder nada. Una mordida con un literal adentro caduca cuando el
//      dato la alcanza. Se cambio por un valor derivado del dato vivo, que no
//      puede coincidir con el.
//
//  (3) MEDIDO EL 2026-08-21, Y ES DE LA SUITE ENTERA, NO DE UNA MORDIDA:
//      SI EL DATO BASE YA ES INVALIDO, LAS MORDIDAS PASAN TODAS AL VACIO. Se
//      corrio esta suite con el dato ya movido a 8 de 15 y el emisor todavia sin
//      corregir: las ONCE dijeron `ok`, porque el emisor se detenia por el dato
//      base y mutarlo no cambiaba nada. Ninguna probo lo que dice probar.
//      LO CAZO EL CONTROL NEGATIVO, y solo el: «copia intacta -> exit 1 · FALLA».
//      De ahi se sigue algo que vale para cualquier suite de mordidas de este
//      repo: el control negativo no es el cierre cortés de la lista, es lo unico
//      que distingue «once guardas muerden» de «el emisor esta roto». Se lee
//      SIEMPRE, y un `MORDIDA: n/n` con el negativo en rojo no es un 100 %: es
//      una medicion que no se hizo. Crudo en
//      _bitacoras/cifra_8de15_2026-08-21/05_mordida_vieja_dato_nuevo.txt.

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
  // Derivada del dato vivo, no literal: `no_cumple - 1` no puede coincidir
  // nunca con `no_cumple`, valga lo que valga la cifra el dia que se corra.
  ['cumple + no_cumple != vigente', (j) => { j.denominador_fino.no_cumple = j.denominador_fino.no_cumple - 1; }],
  ['vigente + anuladas != original', (j) => { j.denominador_fino.original = 20; }],
  ['el bloque anuladas pierde una entrada pero la cifra sigue diciendo 2', (j) => { j.anuladas.pop(); }],
  // La forma PROHIBIDA del dia, sea cual sea: la cifra pelada nunca describe el
  // dato, porque le falta la salvedad. Tambien derivada y no literal.
  ['forma_legal declarada que NO describe el dato', (j) => { j.politica_de_publicacion.forma_legal = j.politica_de_publicacion.forma_prohibida; }],
  ['la vista por punto pierde su nota obligatoria de derogacion', (j) => { j.denominador_por_punto.nota_obligatoria = 'sin cambio'; }],
  ['por punto: divididos incoherente con unanimes', (j) => { j.denominador_por_punto.divididos = 3; }],

  // ── LAS TRES DEL 2026-08-21 ────────────────────────────────────────────────
  // La primera es la que le faltaba a este fichero desde el primer dia: la
  // guarda de la suma por punto NUNCA se habia ejercido contra un punto
  // dividido, porque `divididos` era 0. Con el invariante viejo esta mordida
  // pasaba —el emisor se detenia— pero por el motivo equivocado, y con datos
  // legitimos el emisor tambien se detenia. Es el control positivo de la
  // correccion: la suma tiene que cerrar CON el dividido adentro.
  ['por punto: un punto se pierde entre cumple, no_cumple y divididos', (j) => {
    j.denominador_por_punto.divididos = j.denominador_por_punto.divididos + 1;
    j.denominador_por_punto.unanimes = j.denominador_por_punto.unanimes - 1;
    // unanimes y divididos siguen coherentes entre si; lo que se rompe es que
    // ahora falta un punto en la suma. Sin la correccion, esto pasa inadvertido.
    j.denominador_por_punto.no_cumple = j.denominador_por_punto.no_cumple + 1;
  }],
  ['la vista por punto pierde su nota obligatoria de S3 por trabajo', (j) => { j.denominador_por_punto.nota_obligatoria_s3_por_trabajo = 'sin cambio'; }],
  // La cruzada, y existe por un motivo concreto: dos notas en dos campos se
  // pueden tapar una a la otra si alguien copia el texto de una en la otra.
  // Aca se borra la de derogacion DEJANDO la de S3 intacta, y el emisor tiene
  // que seguir deteniendose. Si alguna vez las dos guardas colapsaran en una
  // sola, esta mordida sale roja.
  ['la de derogacion se tapa con la de S3: la guarda de derogacion no se deja', (j) => {
    j.denominador_por_punto.nota_obligatoria = j.denominador_por_punto.nota_obligatoria_s3_por_trabajo;
  }],
  // LA SIMETRICA, AGREGADA EL 2026-08-21. La de arriba prueba que la nota de S3
  // no puede hacerse pasar por la de derogacion. Esta prueba lo contrario, que no
  // es lo mismo ni se sigue de aquella: que la de derogacion no puede hacerse
  // pasar por la de S3. Exclusion mutua son DOS afirmaciones y se miden las dos.
  ['la de S3 se tapa con la de derogacion: la guarda de S3 no se deja', (j) => {
    j.denominador_por_punto.nota_obligatoria_s3_por_trabajo = j.denominador_por_punto.nota_obligatoria;
  }],

  // ── LAS DOS ESTRUCTURAS NUEVAS, MORDIDAS (owner, 2026-08-21) ───────────────
  // Se agregaron porque el criterio de la pieza que las creo dice que sin la
  // guarda no es un control. Una estructura nueva sin mordida es una guarda que
  // nadie vio morder, y una guarda que nadie vio morder no prueba nada.
  // DERIVADA DESDE EL 2026-08-21, Y ES LA TERCERA VEZ QUE ESTE FICHERO PAGA LO
  // MISMO. Mutaba a `[]`, que era un valor imposible mientras `divididos` valiera
  // 1. Con S3 entero `divididos` paso a 0 y `[]` se volvio EL VALOR LEGITIMO: la
  // mutacion dejaba el dato intacto y esta mordida pasaba a no probar nada. Es
  // exactamente (2) de la cabecera —`no_cumple = 10` cuando la cifra valio 10—,
  // con una vuelta de tuerca: alla el literal estaba en la mutacion, aca en su
  // RESULTADO. Empujar una entrada de mas no puede coincidir con `divididos`
  // valga lo que valga.
  ['divididos_cuales no concuerda con divididos', (j) => { const p = j.denominador_por_punto; p.divididos_cuales = [...p.divididos_cuales, 'ZZ-SOBRANTE']; }],
  // Las dos copias del mismo numero se desalinean, y se mueve la que NO se
  // imprime: la serie. Sin esta mordida, el emisor seguiria imprimiendo `antes`
  // en verde mientras la foto que lo respalda dice otra cosa.
  ['la ultima foto de la serie deja de coincidir con `antes`', (j) => {
    const s = j.denominador_por_punto.serie;
    s[s.length - 1].cumple = s[s.length - 1].cumple + 1;
  }],

  // ── LAS TRES DEL 2026-08-21, SEGUNDA TANDA ────────────────────────────────
  // Las dos primeras muerden guardas que NO EXISTIAN hasta hoy: el emisor
  // imprimia `CUMPLE 4 -> S2, S5, S9` —el numero y su lista contradiciendose— sin
  // que nada lo viera. Las mutaciones son derivadas y no literales, por la misma
  // razon que la de divididos_cuales: sacar un elemento no puede coincidir nunca
  // con el largo que la guarda espera.
  ['por punto: cumple_cuales pierde una entrada y cumple sigue diciendo lo mismo', (j) => {
    j.denominador_por_punto.cumple_cuales = j.denominador_por_punto.cumple_cuales.slice(1);
  }],
  ['por punto: no_cumple_cuales pierde una entrada y no_cumple sigue diciendo lo mismo', (j) => {
    j.denominador_por_punto.no_cumple_cuales = j.denominador_por_punto.no_cumple_cuales.slice(1);
  }],
  // Y la del campo que esta pieza creo para sacarle el literal a la ultima linea
  // de la serie. Sin mordida, la guarda que lo protege es una guarda que nadie
  // vio morder.
  ['la foto viva se queda sin decir que la movio', (j) => {
    j.denominador_por_punto.que_movio_la_de_hoy = '';
  }],
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
