'use strict';
// MORDIDA del emisor de la cifra de §2.  `npm run cifra:mordida`
//
// Un instrumento nuevo no publica su primer resultado sin control positivo. Este
// muerde el dato de ONCE formas distintas y exige que el emisor se DETENGA en
// las once; y despues corre el control negativo, que es la copia intacta.
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
  ['la vista por punto pierde su nota obligatoria de S3 dividido', (j) => { j.denominador_por_punto.nota_obligatoria_s3_dividido = 'sin cambio'; }],
  // La cruzada, y existe por un motivo concreto: dos notas en dos campos se
  // pueden tapar una a la otra si alguien copia el texto de una en la otra.
  // Aca se borra la de derogacion DEJANDO la de S3 intacta, y el emisor tiene
  // que seguir deteniendose. Si alguna vez las dos guardas colapsaran en una
  // sola, esta mordida sale roja.
  ['la de derogacion se borra pero la de S3 dividido queda: igual se detiene', (j) => {
    j.denominador_por_punto.nota_obligatoria = j.denominador_por_punto.nota_obligatoria_s3_dividido;
  }],

  // ── LAS DOS ESTRUCTURAS NUEVAS, MORDIDAS (owner, 2026-08-21) ───────────────
  // Se agregaron porque el criterio de la pieza que las creo dice que sin la
  // guarda no es un control. Una estructura nueva sin mordida es una guarda que
  // nadie vio morder, y una guarda que nadie vio morder no prueba nada.
  ['divididos_cuales no concuerda con divididos', (j) => { j.denominador_por_punto.divididos_cuales = []; }],
  // Las dos copias del mismo numero se desalinean, y se mueve la que NO se
  // imprime: la serie. Sin esta mordida, el emisor seguiria imprimiendo `antes`
  // en verde mientras la foto que lo respalda dice otra cosa.
  ['la ultima foto de la serie deja de coincidir con `antes`', (j) => {
    const s = j.denominador_por_punto.serie;
    s[s.length - 1].cumple = s[s.length - 1].cumple + 1;
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
