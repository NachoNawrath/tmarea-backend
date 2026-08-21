'use strict';
// EL UNICO EMISOR DE LA CIFRA DE §2.  `npm run cifra`
//
// Regla del owner (2026-08-20): la cifra NO se publica pelada. La forma legal
// NO SE ESCRIBE ACA — se compone desde el dato y se contrasta contra la que el
// fichero declara. Al 2026-08-21 es «5 de 15, con 2 anuladas por decision del
// owner», y la vista por punto lleva DOS notas obligatorias, no una: la de
// derogacion (S2 y S5) y la de S3 dividido.
//
// POR QUE ESTO EXISTE Y NO ALCANZABA CON ESCRIBIRLO EN EL PLAN: el ratio SUBE
// cuando se derogan criterios. 4 de 17 y 4 de 15 tenian el mismo numerador y la
// misma pantalla detras, y el segundo se leia mejor. Una regla que vive solo en
// prosa la respeta el que la leyo; este script la hace la unica salida posible.
//
// Y DESDE EL 2026-08-21 EL RATIO TAMBIEN SUBE POR TRABAJO: S3(d) paso a CUMPLE
// porque las capas A+C hicieron que el veredicto escale por cobertura, y el
// owner lo firmo mirando la pantalla. Las dos causas se ven IGUALES en el
// ratio y no valen lo mismo. Por eso este emisor no publica el numero solo:
// publica que se movio, cuando, y por que.
//
// EL SCRIPT NO INVENTA NINGUN NUMERO: los lee de data/spec2/cifra_spec2.json,
// que es la autoridad. Si el dato y la forma legal declarada no concuerdan, se
// DETIENE — no publica una forma legal que no describa el dato que tiene al
// lado. Ese es el modo de falla que este instrumento existe para impedir.

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, '..', 'data', 'spec2', 'cifra_spec2.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));

const f = d.denominador_fino;
const p = d.denominador_por_punto;
const pol = d.politica_de_publicacion;

// ── LA FORMA LEGAL, COMPUESTA DESDE EL DATO ──────────────────────────────────
const forma = `${f.cumple} de ${f.vigente}, con ${f.anuladas} anuladas por decision del owner`;

// ── GUARDAS. Si alguna salta, NO se publica. ─────────────────────────────────
const fallos = [];
if (f.cumple + f.no_cumple !== f.vigente) {
  fallos.push(`cumple + no_cumple != vigente (${f.cumple} + ${f.no_cumple} != ${f.vigente})`);
}
if (f.vigente + f.anuladas !== f.original) {
  fallos.push(`vigente + anuladas != original (${f.vigente} + ${f.anuladas} != ${f.original})`);
}
if (d.anuladas.length !== f.anuladas) {
  fallos.push(`el bloque anuladas tiene ${d.anuladas.length} entradas y la cifra dice ${f.anuladas}`);
}
if (f.cumple_cuales.length !== f.cumple) {
  fallos.push(`cumple_cuales tiene ${f.cumple_cuales.length} y cumple dice ${f.cumple}`);
}
if (forma !== pol.forma_legal.replace('decisión', 'decision')) {
  fallos.push(`la forma compuesta desde el dato ("${forma}") no coincide con forma_legal declarada ("${pol.forma_legal}")`);
}
// CORREGIDA EL 2026-08-21, Y NO ERA UNA GUARDA QUE PASABA: ERA UNA QUE NO SE
// EJERCIA. Decia `cumple + no_cumple !== total`, que solo vale mientras NINGUN
// punto este dividido — un punto dividido no cuenta ni en cumple ni en
// no_cumple. Con `divididos: 0` pasaba por accidente. El contraejemplo estaba
// dentro del propio fichero: la foto de partida de la serie, {unanimes 7,
// divididos 2, cumple 1, no_cumple 6}, da 1 + 6 = 7 != 9 — o sea que la version
// vieja REPROBABA un dato que el fichero guardaba al lado. La primera vez que
// se ejercio de verdad fue la pieza que movio la cifra a 5, que crea el primer
// punto dividido, y salio roja.
if (p.cumple + p.no_cumple + p.divididos !== p.total) {
  fallos.push(`por punto: cumple + no_cumple + divididos != total (${p.cumple} + ${p.no_cumple} + ${p.divididos} != ${p.total})`);
}
if (p.divididos !== p.total - p.unanimes) {
  fallos.push(`por punto: divididos != total - unanimes`);
}
// ═══════════════════════════════════════════════════════════════════════════
// REGLA PARA TODA GUARDA DE TEXTO DE ESTE REPOSITORIO, NO SOLO PARA ESTAS DOS.
// Decision del owner, 2026-08-21, sobre el hallazgo de esta pieza:
//
//     UNA GUARDA QUE BUSCA UNA PALABRA NO COMPRUEBA QUE EL TEXTO AFIRME ALGO:
//     COMPRUEBA QUE LO MENCIONE. Y UN TEXTO QUE CONTRASTA CON OTRO LO MENCIONA
//     POR DEFINICION.
//
// COMO SE CAZO, porque el caso concreto vale mas que el enunciado: esta guarda
// decia /DEROGACION/i, o sea que le bastaba con que la palabra apareciera en
// cualquier parte. La nota nueva de S3 dice «DIVIDIDO por TRABAJO, NO POR
// DEROGACION» — nombra la derogacion justamente para contrastar con ella —, asi
// que copiada en este campo PASABA esta guarda y borraba la nota de derogacion
// sin que nadie se enterara. Una nota podia hacerse pasar por la otra, y los dos
// campos separados no alcanzaban: las guardas tambien tenian que serlo.
//
// LO CAZO LA MORDIDA CRUZADA, que salio FALLA en su primera corrida. Se aplico
// la regla del repo —un control positivo que falla se sospecha a si mismo antes
// de acusar al dato—: se reviso, el control tenia razon y el diseno estaba mal.
//
// EL ARREGLO GENERICO: anclar cada guarda en la AFIRMACION de su propio texto y
// no en una palabra suelta. «CUMPLE por DEROGACION» solo esta en esta nota,
// «DIVIDIDO por TRABAJO» solo en la otra, y ninguna de las dos satisface a la
// ajena. Quien escriba la proxima guarda de texto en este repo — sobre una nota,
// una cadena al patron, una cita del contrato — tiene que preguntarse si su
// patron distingue AFIRMAR de MENCIONAR, y probarlo con el texto que contrasta.
// ═══════════════════════════════════════════════════════════════════════════
if (!p.nota_obligatoria || !/CUMPLE por DEROGACION/i.test(p.nota_obligatoria)) {
  fallos.push('falta la nota obligatoria de derogacion, o no afirma que un punto llego a CUMPLE por DEROGACION');
}
// LA SEGUNDA NOTA OBLIGATORIA, DESDE EL 2026-08-21. Va en un campo SEPARADO de
// la de derogacion a proposito: las dos dicen cosas de signo opuesto sobre la
// misma vista —una, que un punto llego a CUMPLE sin que nadie trabajara; la
// otra, que un punto se partio PORQUE alguien trabajo— y con una sola ranura
// habria que elegir cual de las dos se queda sin decir. Dos campos con dos
// guardas es lo que las hace borrables por separado, o sea DETECTABLES por
// separado.
if (!p.nota_obligatoria_s3_dividido || !/DIVIDIDO por TRABAJO/i.test(p.nota_obligatoria_s3_dividido)) {
  fallos.push('falta la nota obligatoria de S3 dividido, o no afirma que el punto quedo DIVIDIDO por TRABAJO');
}
// LAS DOS ESTRUCTURAS QUE ESTA PIEZA AGREGO, CON SU GUARDA. Se pusieron por el
// criterio de la propia pieza: SIN LA GUARDA NO ES UN CONTROL, y una estructura
// nueva sin guarda es dato que puede desalinearse en silencio. Decision del
// owner, 2026-08-21.
if (!Array.isArray(p.divididos_cuales) || p.divididos_cuales.length !== p.divididos) {
  fallos.push(`divididos_cuales tiene ${Array.isArray(p.divididos_cuales) ? p.divididos_cuales.length : 'nada'} y divididos dice ${p.divididos}`);
}
// La serie y `antes` guardan el mismo numero en dos lugares: `antes` esta
// duplicado para que las tres lineas de comparacion del emisor lo lean directo.
// Dos copias del mismo dato se desalinean solas si nadie las mira, y el que se
// mueve es siempre el que no se imprime.
if (!Array.isArray(p.serie) || p.serie.length === 0) {
  fallos.push('la vista por punto no trae serie, o esta vacia');
} else {
  const ultima = p.serie[p.serie.length - 1];
  const campos = ['unanimes', 'divididos', 'cumple', 'no_cumple'];
  const desalineados = campos.filter(c => ultima[c] !== p.antes[c]);
  if (desalineados.length) {
    fallos.push(`\`antes\` no coincide con la ultima foto de la serie en: ${desalineados.join(', ')}`);
  }
  const sinRotulo = p.serie.filter(s => !s.de_cuando || !s.que_la_movio);
  if (sinRotulo.length) {
    fallos.push(`${sinRotulo.length} foto(s) de la serie sin de_cuando o sin que_la_movio: cuatro numeros pelados no son una cifra`);
  }
}

if (fallos.length) {
  console.error('NO SE PUBLICA — el dato y la politica no concuerdan:');
  fallos.forEach(x => console.error('  !! ' + x));
  console.error('');
  console.error('Un instrumento que publicara igual estaria emitiendo una forma legal que no');
  console.error('describe el dato que tiene al lado. Corregir data/spec2/cifra_spec2.json.');
  process.exit(1);
}

// ── LA PUBLICACION ───────────────────────────────────────────────────────────
console.log('CIFRA DE §2 — cumplimiento de la especificacion medido contra la PANTALLA');
console.log('Fuente: data/spec2/cifra_spec2.json  ·  medido el ' + f.medido_el);
console.log('');
console.log('  >>  ' + forma + '  <<');
console.log('');
console.log('  unidad: ' + f.unidad);
console.log('  definicion: ' + f.definicion);
console.log('  ambito: ' + f.ambito);
console.log('');
console.log(`  CUMPLE ....... ${f.cumple} de ${f.vigente}   (${f.cumple_cuales.join(', ')})`);
console.log(`  NO CUMPLE .... ${f.no_cumple} de ${f.vigente}`);
console.log(`  ANULADAS ..... ${f.anuladas}   (denominador original ${f.original})`);
for (const a of d.anuladas) {
  console.log(`     ${a.afirmacion}  anulada por ${a.anulada_por} el ${a.anulada_el} — tenia ${a.veredicto_que_tenia}`);
  console.log(`        ${a.por_que_no_pasa_a_CUMPLE}`);
}
console.log('');
console.log('VISTA POR PUNTO — no se publica sin sus DOS notas');
console.log(`  UNANIMES ${p.unanimes} de ${p.total} (antes ${p.antes.unanimes})  ·  DIVIDIDOS ${p.divididos} (antes ${p.antes.divididos})${p.divididos_cuales && p.divididos_cuales.length ? '  ->  ' + p.divididos_cuales.join(', ') : ''}`);
console.log(`  CUMPLE ${p.cumple} (antes ${p.antes.cumple})  ->  ${p.cumple_cuales.join(', ')}`);
console.log(`  NO CUMPLE ${p.no_cumple} (antes ${p.antes.no_cumple})  ->  ${p.no_cumple_cuales.join(', ')}`);
console.log('  ** ' + p.nota_obligatoria);
console.log('  ** ' + p.nota_obligatoria_s3_dividido);
if (Array.isArray(p.serie) && p.serie.length) {
  console.log('');
  console.log('  LA SERIE — cada foto con de cuando es y que la movio. No se poda.');
  for (const s of p.serie) {
    console.log(`    ${s.de_cuando}`);
    console.log(`      unanimes ${s.unanimes} de ${s.denominador}  ·  divididos ${s.divididos}  ·  cumple ${s.cumple}  ·  no cumple ${s.no_cumple}   [unidad: ${s.unidad}]`);
    console.log(`      que la movio: ${s.que_la_movio}`);
  }
  console.log(`    ${f.medido_el} — la de hoy, arriba. que la movio: la firma de S3(d) sobre la pantalla. TRABAJO, no derogacion.`);
}
console.log('');
console.log('POLITICA (owner, 2026-08-20)');
console.log('  ' + pol.regla);
console.log('  forma legal ....... "' + pol.forma_legal + '"');
console.log('  forma PROHIBIDA ... "' + pol.forma_prohibida + '"');
console.log('  motivo ............ ' + pol.por_que);
console.log('');
console.log(d.advertencia_sobre_el_hueco);
console.log('');
console.log('LO QUE ESTE INSTRUMENTO NO HACE, y hay que saberlo: nada lo corre solo. No hay');
console.log(`gancho que impida a una persona escribir "${pol.forma_prohibida}" a mano en otro documento. Lo`);
console.log('que hace es que exista UNA salida correcta y que su procedencia sea citable. Es');
console.log('la misma carencia que el declarativo de deudas tiene declarada sobre si mismo.');
console.log('');
console.log('Y HOY ESA CARENCIA MUERDE MAS QUE AYER: al moverse la cifra, toda copia escrita');
console.log('a mano quedo falsa de golpe. Medido el 2026-08-21 sobre los ficheros trackeados');
console.log('de este repo: 54 apariciones de la cadena vieja en 21 ficheros, ninguna en la');
console.log('PWA. La MAYORIA tiene que seguir diciendo la cadena vieja —viven en bitacoras y');
console.log('son el registro de lo que era cierto cuando se escribieron—, asi que el barrido');
console.log('que falta no es un buscar-y-reemplazar: tiene que separar CITA HISTORICA de');
console.log('AFIRMACION VIVA. Fila D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia.');
