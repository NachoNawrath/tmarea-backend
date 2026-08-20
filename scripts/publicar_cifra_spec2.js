'use strict';
// EL UNICO EMISOR DE LA CIFRA DE §2.  `npm run cifra`
//
// Regla del owner (2026-08-20): la cifra NO se publica pelada. La forma legal es
// «4 de 15, con 2 anuladas por decision del owner», y la vista por punto lleva
// SIEMPRE la nota de que S2 y S5 llegaron a CUMPLE por derogacion y no por
// trabajo.
//
// POR QUE ESTO EXISTE Y NO ALCANZABA CON ESCRIBIRLO EN EL PLAN: el ratio SUBE
// cuando se derogan criterios. 4 de 17 y 4 de 15 tienen el mismo numerador y la
// misma pantalla detras, y el segundo se lee mejor. Una regla que vive solo en
// prosa la respeta el que la leyo; este script la hace la unica salida posible.
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
if (p.cumple + p.no_cumple !== p.total) {
  fallos.push(`por punto: cumple + no_cumple != total`);
}
if (p.divididos !== p.total - p.unanimes) {
  fallos.push(`por punto: divididos != total - unanimes`);
}
if (!p.nota_obligatoria || !/DEROGACION/i.test(p.nota_obligatoria)) {
  fallos.push('falta la nota obligatoria de la vista por punto, o no dice DEROGACION');
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
console.log('VISTA POR PUNTO — no se publica sin su nota');
console.log(`  UNANIMES ${p.unanimes} de ${p.total} (antes ${p.antes.unanimes})  ·  DIVIDIDOS ${p.divididos} (antes ${p.antes.divididos})`);
console.log(`  CUMPLE ${p.cumple} (antes ${p.antes.cumple})  ->  ${p.cumple_cuales.join(', ')}`);
console.log(`  NO CUMPLE ${p.no_cumple} (antes ${p.antes.no_cumple})  ->  ${p.no_cumple_cuales.join(', ')}`);
console.log('  ** ' + p.nota_obligatoria);
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
console.log('gancho que impida a una persona escribir "4 de 15" a mano en otro documento. Lo');
console.log('que hace es que exista UNA salida correcta y que su procedencia sea citable. Es');
console.log('la misma carencia que el declarativo de deudas tiene declarada sobre si mismo.');
