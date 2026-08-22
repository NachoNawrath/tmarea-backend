'use strict';
// APLICA AL INSTRUMENTO lo que el dato nuevo exige: el emisor y su mordida.
// Mismo diseño que 03: reemplazo exacto, aguja unica, se juntan TODOS los
// fallos y no se escribe nada si hay uno solo.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const EMISOR = path.join(RAIZ, 'scripts', 'publicar_cifra_spec2.js');
const MORDIDA = path.join(RAIZ, 'scripts', 'prueba_mordida_cifra.js');

const ficheros = new Map([[EMISOR, fs.readFileSync(EMISOR, 'utf8')], [MORDIDA, fs.readFileSync(MORDIDA, 'utf8')]]);
const ANTES = new Map([...ficheros].map(([k, v]) => [k, v]));
const aplicados = [], fallidos = [];

function rep(f, rotulo, aguja, nueva) {
  const txt = ficheros.get(f);
  const n = txt.split(aguja).length - 1;
  if (n !== 1) {
    fallidos.push(`[${path.basename(f)} · ${rotulo}] aparece ${n} veces, se esperaba 1\n      aguja: ${aguja.slice(0, 100).replace(/\n/g, '\\n')}`);
    return;
  }
  ficheros.set(f, txt.replace(aguja, nueva));
  aplicados.push(`${path.basename(f)} · ${rotulo}`);
}

// ═══ EL EMISOR ═══════════════════════════════════════════════════════════════

// (D) LA FECHA SALE DEL DATO, NO DE UN LITERAL.
rep(EMISOR, 'forma compuesta gana la fecha',
  'const forma = `${f.cumple} de ${f.vigente}, con ${f.anuladas} anuladas por decision del owner`;',
  `// LA FECHA ENTRA A LA FORMA LEGAL EL 2026-08-21, firma del owner. Sale de
// \`medido_el\` y NO de un literal: una fecha escrita a mano aca seria la misma
// prosa pegada al instrumento que este script arrastraba en su ultima linea y
// que esta pieza vino a sacar. El motivo de la fecha no es de estilo — el
// denominador esta por subir por ESCRITURA (S10 y el punto de P4, firmados y sin
// escribir), y cuando suba la cifra baja en ratio sin que nada haya empeorado.
const forma = \`\${f.cumple} de \${f.vigente} al \${f.medido_el}, con \${f.anuladas} anuladas por decision del owner\`;`);

// (A) LA GUARDA DE LA NOTA DE S3: NUEVA CLAVE, NUEVA AFIRMACION.
rep(EMISOR, 'guarda de la nota de S3 reanclada',
  `if (!p.nota_obligatoria_s3_dividido || !/DIVIDIDO por TRABAJO/i.test(p.nota_obligatoria_s3_dividido)) {
  fallos.push('falta la nota obligatoria de S3 dividido, o no afirma que el punto quedo DIVIDIDO por TRABAJO');
}`,
  `// REANCLADA EL 2026-08-21, Y ES EL SEGUNDO ACTO DE ESTA GUARDA EN UN DIA. Nacio
// exigiendo «DIVIDIDO por TRABAJO» y S3 dejo de estar dividido tres horas
// despues, cuando entro la capa B. La guarda hizo lo que una guarda POSITIVA
// tiene que hacer: caduco en ROJO y detuvo al emisor. Pero caduco EXIGIENDO la
// mentira —para correr, habia que dejar escrita una nota que ya era falsa—, que
// es el limite de la forma positiva y queda dicho acá porque no lo arregla el
// reanclaje: lo unico que lo arregla es que alguien mire el rojo.
//
// EL ANCLA NUEVA ES «CUMPLE ENTERO por TRABAJO», y es MUTUAMENTE EXCLUYENTE con
// la de derogacion, no solo distinta (§4.9): la nota de derogacion dice «CUMPLE
// por DEROGACION, no por trabajo» y NO contiene esta cadena; esta nota dice
// «CUMPLE ENTERO por TRABAJO, ... por anulacion» y NO contiene la de aquella.
// Ninguna de las dos satisface a la guarda ajena, y eso se prueba EN LAS DOS
// DIRECCIONES con las dos mordidas cruzadas — no alcanza con probarlo en una.
if (!p.nota_obligatoria_s3_por_trabajo || !/CUMPLE ENTERO por TRABAJO/i.test(p.nota_obligatoria_s3_por_trabajo)) {
  fallos.push('falta la nota obligatoria de S3 por trabajo, o no afirma que el punto llego a CUMPLE ENTERO por TRABAJO');
}`);

// (C) LAS DOS GUARDAS QUE FALTABAN, Y LA PIEZA QUE LAS PIDE ES LA QUE MUEVE EL CAMPO.
rep(EMISOR, 'guardas de cumple_cuales y no_cumple_cuales por punto',
  `if (!Array.isArray(p.divididos_cuales) || p.divididos_cuales.length !== p.divididos) {
  fallos.push(\`divididos_cuales tiene \${Array.isArray(p.divididos_cuales) ? p.divididos_cuales.length : 'nada'} y divididos dice \${p.divididos}\`);
}`,
  `if (!Array.isArray(p.divididos_cuales) || p.divididos_cuales.length !== p.divididos) {
  fallos.push(\`divididos_cuales tiene \${Array.isArray(p.divididos_cuales) ? p.divididos_cuales.length : 'nada'} y divididos dice \${p.divididos}\`);
}
// LAS DOS DE LA VISTA POR PUNTO, AGREGADAS EL 2026-08-21. NO ESTABAN, y el
// emisor imprime cada una de las dos listas PEGADA A SU NUMERO en las lineas de
// abajo. El fino tenia la suya desde el primer dia (cumple_cuales, mas arriba);
// las dos de la vista por punto no, asi que \`CUMPLE 4 -> S2, S5, S9\` se publicaba
// en silencio. Se ponen en la pieza que MUEVE cumple_cuales de 3 a 4 entradas:
// mover un campo sin guarda justo en la corrida en que cambia es donde el
// desalineo tiene su unica oportunidad de nacer.
if (!Array.isArray(p.cumple_cuales) || p.cumple_cuales.length !== p.cumple) {
  fallos.push(\`por punto: cumple_cuales tiene \${Array.isArray(p.cumple_cuales) ? p.cumple_cuales.length : 'nada'} y cumple dice \${p.cumple}\`);
}
if (!Array.isArray(p.no_cumple_cuales) || p.no_cumple_cuales.length !== p.no_cumple) {
  fallos.push(\`por punto: no_cumple_cuales tiene \${Array.isArray(p.no_cumple_cuales) ? p.no_cumple_cuales.length : 'nada'} y no_cumple dice \${p.no_cumple}\`);
}
// Y LA DEL CAMPO QUE ESTA PIEZA CREO. Sin guarda no es un control, y sin este
// campo la ultima linea de la serie vuelve a ser un literal escrito a mano.
if (!p.que_movio_la_de_hoy) {
  fallos.push('falta que_movio_la_de_hoy: la foto viva quedaria sin decir que la movio, que es lo que la serie exige de todas las demas');
}`);

// (D) LA ULTIMA LINEA DE LA SERIE SALE DEL DATO.
rep(EMISOR, 'linea 204 derivada del dato',
  'console.log(`    ${f.medido_el} — la de hoy, arriba. que la movio: la firma de S3(d) sobre la pantalla. TRABAJO, no derogacion.`);',
  'console.log(`    ${f.medido_el} — la de hoy, arriba. que la movio: ${p.que_movio_la_de_hoy}`);');

rep(EMISOR, 'imprime la nota con su clave nueva',
  "console.log('  ** ' + p.nota_obligatoria_s3_dividido);",
  "console.log('  ** ' + p.nota_obligatoria_s3_por_trabajo);");

// LA CABECERA: la prosa que el movimiento vuelve falsa.
rep(EMISOR, 'cabecera sin cifra literal',
  `// Regla del owner (2026-08-20): la cifra NO se publica pelada. La forma legal
// NO SE ESCRIBE ACA — se compone desde el dato y se contrasta contra la que el
// fichero declara. Al 2026-08-21 es «5 de 15, con 2 anuladas por decision del
// owner», y la vista por punto lleva DOS notas obligatorias, no una: la de
// derogacion (S2 y S5) y la de S3 dividido.`,
  `// Regla del owner (2026-08-20): la cifra NO se publica pelada. La forma legal
// NO SE ESCRIBE ACA — se compone desde el dato y se contrasta contra la que el
// fichero declara. Y DESDE EL 2026-08-21 LLEVA SU FECHA, tambien compuesta desde
// el dato: el denominador esta por subir por escritura y sin fecha no se
// distingue «el numerador no se movio» de «el denominador se movio debajo».
// La vista por punto lleva DOS notas obligatorias, no una: la de derogacion
// (S2 y S5) y la de S3 por trabajo.
//
// ESTA CABECERA YA NO LLEVA LA CIFRA, Y ES A PROPOSITO. Llevaba «5 de 15» escrito
// a mano y quedo falsa el mismo dia. Un numero en la prosa de un instrumento que
// publica ese numero es la forma mas tonta de que el instrumento se contradiga
// a si mismo: el que lo lee no sabe cual de los dos manda.`);

rep(EMISOR, 'cabecera: dos movimientos, no uno',
  `// Y DESDE EL 2026-08-21 EL RATIO TAMBIEN SUBE POR TRABAJO: S3(d) paso a CUMPLE
// porque las capas A+C hicieron que el veredicto escale por cobertura, y el
// owner lo firmo mirando la pantalla. Las dos causas se ven IGUALES en el
// ratio y no valen lo mismo. Por eso este emisor no publica el numero solo:
// publica que se movio, cuando, y por que.`,
  `// Y DESDE EL 2026-08-21 EL RATIO TAMBIEN SUBE POR TRABAJO, dos veces el mismo
// dia: S3(d) por las capas A+C, que hicieron que el veredicto escale por
// cobertura; y S3(a)(b)(c) por la capa B, que le dio bloque propio al aviso. Las
// dos las firmo el owner mirando la pantalla. Las causas —derogacion y trabajo—
// se ven IGUALES en el ratio y no valen lo mismo. Por eso este emisor no publica
// el numero solo: publica que se movio, cuando, y por que.`);

// ═══ LA MORDIDA ══════════════════════════════════════════════════════════════

// (B) LA MUTACION DERIVADA DEL DATO VIVO — la leccion escrita en esta cabecera.
rep(MORDIDA, 'divididos_cuales: mutacion derivada',
  "['divididos_cuales no concuerda con divididos', (j) => { j.denominador_por_punto.divididos_cuales = []; }],",
  `// DERIVADA DESDE EL 2026-08-21, Y ES LA TERCERA VEZ QUE ESTE FICHERO PAGA LO
  // MISMO. Mutaba a \`[]\`, que era un valor imposible mientras \`divididos\` valiera
  // 1. Con S3 entero \`divididos\` paso a 0 y \`[]\` se volvio EL VALOR LEGITIMO: la
  // mutacion dejaba el dato intacto y esta mordida pasaba a no probar nada. Es
  // exactamente (2) de la cabecera —\`no_cumple = 10\` cuando la cifra valio 10—,
  // con una vuelta de tuerca: alla el literal estaba en la mutacion, aca en su
  // RESULTADO. Empujar una entrada de mas no puede coincidir con \`divididos\`
  // valga lo que valga.
  ['divididos_cuales no concuerda con divididos', (j) => { const p = j.denominador_por_punto; p.divididos_cuales = [...p.divididos_cuales, 'ZZ-SOBRANTE']; }],`);

rep(MORDIDA, 'mordida de la nota de S3: clave nueva',
  "['la vista por punto pierde su nota obligatoria de S3 dividido', (j) => { j.denominador_por_punto.nota_obligatoria_s3_dividido = 'sin cambio'; }],",
  "['la vista por punto pierde su nota obligatoria de S3 por trabajo', (j) => { j.denominador_por_punto.nota_obligatoria_s3_por_trabajo = 'sin cambio'; }],");

// LA CRUZADA, EN LAS DOS DIRECCIONES. La que habia probaba una sola, y con una
// sola no se prueba exclusion mutua: se prueba que UNA de las dos guardas no se
// deja tapar. Sin la simetrica, el dia que la nota de derogacion pudiera pasar
// por la de S3 nadie se enteraria.
rep(MORDIDA, 'cruzada simetrica',
  `  ['la de derogacion se borra pero la de S3 dividido queda: igual se detiene', (j) => {
    j.denominador_por_punto.nota_obligatoria = j.denominador_por_punto.nota_obligatoria_s3_dividido;
  }],`,
  `  ['la de derogacion se tapa con la de S3: la guarda de derogacion no se deja', (j) => {
    j.denominador_por_punto.nota_obligatoria = j.denominador_por_punto.nota_obligatoria_s3_por_trabajo;
  }],
  // LA SIMETRICA, AGREGADA EL 2026-08-21. La de arriba prueba que la nota de S3
  // no puede hacerse pasar por la de derogacion. Esta prueba lo contrario, que no
  // es lo mismo ni se sigue de aquella: que la de derogacion no puede hacerse
  // pasar por la de S3. Exclusion mutua son DOS afirmaciones y se miden las dos.
  ['la de S3 se tapa con la de derogacion: la guarda de S3 no se deja', (j) => {
    j.denominador_por_punto.nota_obligatoria_s3_por_trabajo = j.denominador_por_punto.nota_obligatoria;
  }],`);

// (C) y (D) — LAS MORDIDAS DE LAS TRES GUARDAS NUEVAS.
rep(MORDIDA, 'mordidas de las tres guardas nuevas',
  `  ['la ultima foto de la serie deja de coincidir con \`antes\`', (j) => {
    const s = j.denominador_por_punto.serie;
    s[s.length - 1].cumple = s[s.length - 1].cumple + 1;
  }],
];`,
  `  ['la ultima foto de la serie deja de coincidir con \`antes\`', (j) => {
    const s = j.denominador_por_punto.serie;
    s[s.length - 1].cumple = s[s.length - 1].cumple + 1;
  }],

  // ── LAS TRES DEL 2026-08-21, SEGUNDA TANDA ────────────────────────────────
  // Las dos primeras muerden guardas que NO EXISTIAN hasta hoy: el emisor
  // imprimia \`CUMPLE 4 -> S2, S5, S9\` —el numero y su lista contradiciendose— sin
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
];`);

// LA CABECERA DE LA MORDIDA: le sacamos el numero, por su propia leccion (1).
rep(MORDIDA, 'cabecera sin conteo literal',
  `// Un instrumento nuevo no publica su primer resultado sin control positivo. Este
// muerde el dato de ONCE formas distintas y exige que el emisor se DETENGA en
// las once; y despues corre el control negativo, que es la copia intacta.`,
  `// Un instrumento nuevo no publica su primer resultado sin control positivo. Este
// muerde el dato de varias formas distintas y exige que el emisor se DETENGA en
// todas; y despues corre el control negativo, que es la copia intacta.
//
// LA CANTIDAD NO SE ESCRIBE ACA, Y ES POR LA LECCION (1) DE MAS ABAJO: esta
// cabecera ya dijo «cinco» cuando la lista tenia seis, y el 2026-08-21 habria
// dicho «once» cuando paso a tener quince. El total sale de contar la lista, que
// es la unica cuenta que no puede desincronizarse.`);

// EL HALLAZGO DE ESTA CORRIDA, QUE VA EN LA CABECERA PORQUE ES DE LA SUITE ENTERA.
rep(MORDIDA, 'hallazgo: las mordidas son vacuas si el dato base es invalido',
  `//      volvio una copia identica del dato y la mordida habria salido en verde
//      sin morder nada. Una mordida con un literal adentro caduca cuando el
//      dato la alcanza. Se cambio por un valor derivado del dato vivo, que no
//      puede coincidir con el.`,
  `//      volvio una copia identica del dato y la mordida habria salido en verde
//      sin morder nada. Una mordida con un literal adentro caduca cuando el
//      dato la alcanza. Se cambio por un valor derivado del dato vivo, que no
//      puede coincidir con el.
//
//  (3) MEDIDO EL 2026-08-21, Y ES DE LA SUITE ENTERA, NO DE UNA MORDIDA:
//      SI EL DATO BASE YA ES INVALIDO, LAS MORDIDAS PASAN TODAS AL VACIO. Se
//      corrio esta suite con el dato ya movido a 8 de 15 y el emisor todavia sin
//      corregir: las ONCE dijeron \`ok\`, porque el emisor se detenia por el dato
//      base y mutarlo no cambiaba nada. Ninguna probo lo que dice probar.
//      LO CAZO EL CONTROL NEGATIVO, y solo el: «copia intacta -> exit 1 · FALLA».
//      De ahi se sigue algo que vale para cualquier suite de mordidas de este
//      repo: el control negativo no es el cierre cortés de la lista, es lo unico
//      que distingue «once guardas muerden» de «el emisor esta roto». Se lee
//      SIEMPRE, y un \`MORDIDA: n/n\` con el negativo en rojo no es un 100 %: es
//      una medicion que no se hizo. Crudo en
//      _bitacoras/cifra_8de15_2026-08-21/05_mordida_vieja_dato_nuevo.txt.`);

// ─── ESCRITURA, Y NO ANTES ───────────────────────────────────────────────────
if (fallidos.length) {
  console.error(`NO SE ESCRIBE — ${fallidos.length} aguja(s) no calzaron:`);
  fallidos.forEach(x => console.error('  !! ' + x));
  console.error(`\nSe aplicaron ${aplicados.length} en memoria y se descartan todas.`);
  process.exit(1);
}
for (const [f, txt] of ficheros) {
  if (txt === ANTES.get(f)) throw new Error(`${path.basename(f)} no cambio`);
  fs.writeFileSync(f, txt, { encoding: 'utf8' });
}
console.log(`INSTRUMENTO APLICADO — ${aplicados.length} reemplazos, todos con aguja unica:`);
aplicados.forEach((a, i) => console.log(`  ${String(i + 1).padStart(2)}. ${a}`));
