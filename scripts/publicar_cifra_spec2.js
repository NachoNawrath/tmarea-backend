'use strict';
// EL UNICO EMISOR DE LA CIFRA DE §2.  `npm run cifra`
//
// Regla del owner (2026-08-20): la cifra NO se publica pelada. La forma legal
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
// a si mismo: el que lo lee no sabe cual de los dos manda.
//
// POR QUE ESTO EXISTE Y NO ALCANZABA CON ESCRIBIRLO EN EL PLAN: el ratio SUBE
// cuando se derogan criterios. 4 de 17 y 4 de 15 tenian el mismo numerador y la
// misma pantalla detras, y el segundo se leia mejor. Una regla que vive solo en
// prosa la respeta el que la leyo; este script la hace la unica salida posible.
//
// Y DESDE EL 2026-08-21 EL RATIO TAMBIEN SUBE POR TRABAJO, dos veces el mismo
// dia: S3(d) por las capas A+C, que hicieron que el veredicto escale por
// cobertura; y S3(a)(b)(c) por la capa B, que le dio bloque propio al aviso. Las
// dos las firmo el owner mirando la pantalla. Las causas —derogacion y trabajo—
// se ven IGUALES en el ratio y no valen lo mismo. Por eso este emisor no publica
// el numero solo: publica que se movio, cuando, y por que.
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
// LA FECHA ENTRA A LA FORMA LEGAL EL 2026-08-21, firma del owner. Sale de
// `medido_el` y NO de un literal: una fecha escrita a mano aca seria la misma
// prosa pegada al instrumento que este script arrastraba en su ultima linea y
// que esta pieza vino a sacar. El motivo de la fecha no es de estilo — el
// denominador esta por subir por ESCRITURA (S10 y el punto de P4, firmados y sin
// escribir), y cuando suba la cifra baja en ratio sin que nada haya empeorado.
const forma = `${f.cumple} de ${f.vigente} al ${f.medido_el}, con ${f.anuladas} anuladas por decision del owner`;

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
//
// ── LA SEGUNDA MITAD, DEL 2026-08-21 ───────────────────────────────────────
// LO DE ARRIBA CUBRE SOLO LAS GUARDAS POSITIVAS, Y ES LA MITAD BUENA. El mismo
// literal se comporta al reves segun la forma de la guarda:
//
//   · GUARDA POSITIVA — «el texto tiene que decir X». El literal escrito a mano
//     caduca en ROJO: si el dato cambia, la guarda se detiene y alguien mira.
//     Es lo que hacen las dos de aca abajo.
//   · GUARDA DE PROHIBICION — «el texto no puede decir X». El mismo literal
//     caduca en VERDE Y EN SILENCIO: basta escribir lo prohibido de otra manera
//     para que la guarda no lo vea, y nadie se entera nunca.
//
// CASO MEDIDO, y por eso esto no es teoria: zonas-aviso.js prohibia la MARCA
// {telefono} para hacer cumplir INV-10.1, que prohibe EL TELEFONO. El texto
// «Confirme con la Capitania {nombre} al +56 61 220 1234 antes de zarpar»
// pasaba la guarda y viola el contrato en la cara.
//
// CONSECUENCIA PRACTICA: una guarda de PROHIBICION se ancla en LA COSA
// PROHIBIDA y no en su ortografia habitual.
//
// EL TEXTO CANONICO DE ESTA REGLA VIVE EN EL DECLARATIVO, no aca:
// METODO::una-guarda-de-texto-comprueba-que-lo-mencione-no-que-lo-afirme, con
// el barrido —SIETE guardas de texto vivas, CINCO sin revisar, las cinco con el
// hueco, 9 de 9 contraejemplos corridos— y con las cuatro correcciones y la que
// se declara y no se arregla. Esto de aca es la copia que le queda a mano al que
// escriba la proxima guarda: si las dos dejan de decir lo mismo, manda la fila.
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
// REANCLADA EL 2026-08-21, Y ES EL SEGUNDO ACTO DE ESTA GUARDA EN UN DIA. Nacio
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
}
// LAS DOS ESTRUCTURAS QUE ESTA PIEZA AGREGO, CON SU GUARDA. Se pusieron por el
// criterio de la propia pieza: SIN LA GUARDA NO ES UN CONTROL, y una estructura
// nueva sin guarda es dato que puede desalinearse en silencio. Decision del
// owner, 2026-08-21.
if (!Array.isArray(p.divididos_cuales) || p.divididos_cuales.length !== p.divididos) {
  fallos.push(`divididos_cuales tiene ${Array.isArray(p.divididos_cuales) ? p.divididos_cuales.length : 'nada'} y divididos dice ${p.divididos}`);
}
// LAS DOS DE LA VISTA POR PUNTO, AGREGADAS EL 2026-08-21. NO ESTABAN, y el
// emisor imprime cada una de las dos listas PEGADA A SU NUMERO en las lineas de
// abajo. El fino tenia la suya desde el primer dia (cumple_cuales, mas arriba);
// las dos de la vista por punto no, asi que `CUMPLE 4 -> S2, S5, S9` se publicaba
// en silencio. Se ponen en la pieza que MUEVE cumple_cuales de 3 a 4 entradas:
// mover un campo sin guarda justo en la corrida en que cambia es donde el
// desalineo tiene su unica oportunidad de nacer.
if (!Array.isArray(p.cumple_cuales) || p.cumple_cuales.length !== p.cumple) {
  fallos.push(`por punto: cumple_cuales tiene ${Array.isArray(p.cumple_cuales) ? p.cumple_cuales.length : 'nada'} y cumple dice ${p.cumple}`);
}
if (!Array.isArray(p.no_cumple_cuales) || p.no_cumple_cuales.length !== p.no_cumple) {
  fallos.push(`por punto: no_cumple_cuales tiene ${Array.isArray(p.no_cumple_cuales) ? p.no_cumple_cuales.length : 'nada'} y no_cumple dice ${p.no_cumple}`);
}
// Y LA DEL CAMPO QUE ESTA PIEZA CREO. Sin guarda no es un control, y sin este
// campo la ultima linea de la serie vuelve a ser un literal escrito a mano.
if (!p.que_movio_la_de_hoy) {
  fallos.push('falta que_movio_la_de_hoy: la foto viva quedaria sin decir que la movio, que es lo que la serie exige de todas las demas');
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
console.log('  ** ' + p.nota_obligatoria_s3_por_trabajo);
if (Array.isArray(p.serie) && p.serie.length) {
  console.log('');
  console.log('  LA SERIE — cada foto con de cuando es y que la movio. No se poda.');
  for (const s of p.serie) {
    console.log(`    ${s.de_cuando}`);
    console.log(`      unanimes ${s.unanimes} de ${s.denominador}  ·  divididos ${s.divididos}  ·  cumple ${s.cumple}  ·  no cumple ${s.no_cumple}   [unidad: ${s.unidad}]`);
    console.log(`      que la movio: ${s.que_la_movio}`);
  }
  console.log(`    ${f.medido_el} — la de hoy, arriba. que la movio: ${p.que_movio_la_de_hoy}`);
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
console.log('Y ESA CARENCIA MUERDE CADA VEZ QUE LA CIFRA SE MUEVE: toda copia escrita a mano');
console.log('queda falsa de golpe, y el 2026-08-21 la cifra se movio DOS VECES. Remedido ese');
console.log('dia sobre los ficheros trackeados de los DOS repos, tras el segundo movimiento:');
console.log('  "5 de 15" — la que este movimiento invalido ... 37 apariciones en 17 ficheros');
console.log('  "4 de 15" — la que invalido el movimiento anterior . 47 en 20 ficheros');
console.log('Ninguna en la PWA, las dos veces. La MAYORIA tiene que seguir diciendo la cadena');
console.log('vieja —viven en bitacoras y son el registro de lo que era cierto cuando se');
console.log('escribieron—, asi que el barrido que falta no es un buscar-y-reemplazar: tiene');
console.log('que separar CITA HISTORICA de AFIRMACION VIVA. Los tres restos de "5 de 15" que');
console.log('quedan en este script y en su mordida se revisaron uno por uno y los tres son');
console.log('cita historica. Fila D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia; conteo');
console.log('crudo en _bitacoras/cifra_8de15_2026-08-21/10_conteo_copias_a_mano.txt.');
console.log('');
console.log('ESTE PARRAFO LLEVA NUMEROS A MANO Y VA A ENVEJECER, como envejecio el que');
console.log('reemplaza. No se deriva porque derivarlo obligaria a `npm run cifra` a recorrer');
console.log('los dos repos en cada corrida. Lleva su fecha y su crudo al lado, que es lo unico');
console.log('que permite saber al leerlo si todavia describe algo.');
console.log('');
console.log('EL CORPUS DE ESE CONTEO SE DECLARA: todo lo trackeado de los dos repos MENOS el');
console.log('directorio de evidencia de la pieza que lo midio. Esa evidencia aporta 27');
console.log('apariciones mas en 9 ficheros, y son CITAS por construccion — la bitacora de un');
console.log('movimiento de la cifra cita la cifra vieja, y no puede no hacerlo.');
console.log('');
console.log('Y LA MEDICION SE CONTAMINA AL REPORTARSE, medido tres veces el mismo dia:');
console.log('  · el barrido saco 5 apariciones vivas de PLAN_JURISDICCION.md, y este parrafo');
console.log('    mas la fila del declarativo metieron 5 citas nuevas: el total quedo CLAVADO');
console.log('    y solo bajaron los ficheros, de 18 a 17.');
console.log('  · al stagear la evidencia, el mismo conteo salto a 66 en 27 sin que nadie');
console.log('    escribiera una copia nueva: la evidencia paso a estar trackeada.');
console.log('  · el instrumento ESCRIBIA SU SALIDA dentro del arbol que contaba, asi que dos');
console.log('    corridas seguidas daban numeros distintos. Lo destapo un segundo instrumento');
console.log('    que no reprodujo al primero: 2 apariciones y 1 fichero de diferencia.');
console.log('UN CONTEO QUE MEZCLA AFIRMACION VIVA CON CITA HISTORICA PUEDE NO MOVERSE AUNQUE');
console.log('EL BARRIDO AVANCE, y puede moverse sin que nadie barra nada. Por eso el numero');
console.log('pelado no mide progreso — el mismo defecto que la cifra de §2, un piso mas abajo.');
