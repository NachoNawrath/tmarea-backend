// LO QUE HACE REVISABLE LA PARADA 2. El control de re-busqueda NO DETECTA UN TRUNCADO:
// un fragmento correcto pero incompleto se re-encuentra igual. Lo unico que caza un corte
// es que alguien lea con que EMPIEZA y con que TERMINA cada articulo, y a que REMITE.
// Esto lo publica; leerlo es del owner.
// AMBITO: data/decreto/rrdn_articulos.json, los once articulos.
const fs = require('fs');
const insumo = JSON.parse(fs.readFileSync('data/decreto/rrdn_articulos.json', 'utf8'));

// Remisiones. Cada patron declara que busca; los que dan cero tambien se publican.
const PATRONES = [
  ['articulo de este mismo Reglamento', /art[ií]culo\s+\d+°(\s+de\s+este\s+Reglamento)?/gi],
  ['otro reglamento nombrado',          /Reglamento de [A-ZÁÉÍÓÚ][a-záéíóúñ]+(?: (?:de )?[A-ZÁÉÍÓÚ][a-záéíóúñ]+)*/g],
  ['Codigo de Comercio',                /C[oó]digo de Comercio/g],
  ['libro/titulo/parrafo',              /Libro [IVXL]+, t[ií]tulo [IVXL]+, p[aá]rrafo \d+/g],
  ['otro decreto por numero',           /D\.S\.\s*\(M\)\s*N°\s*[\d.]+\s*de\s*\d{4}/g],
  ['capitulos derogados',               /Cap[ií]tulos? [IVXL]+( y [IVXL]+)?/g],
  ['letra de clasificacion',            /letras? "[A-E]"/g],
  ['CONTROL NEGATIVO — remision inventada', /Reglamento de Faros y Balizas/g],
];

console.log('AMBITO: data/decreto/rrdn_articulos.json — ' + insumo.articulos.length + ' articulos, ' +
  insumo.articulos.reduce((s, a) => s + a.texto_decreto.length, 0) + ' fragmentos.');
console.log('');
console.log('*** ESTO ES LO QUE CUBRE EL TRUNCADO. El control de re-busqueda no lo cubre.');
console.log('');
for (const a of insumo.articulos) {
  const todo = a.texto_decreto.join(' ');
  const ultimo = a.texto_decreto[a.texto_decreto.length - 1];
  console.log('================================================================================');
  console.log(a.id.toUpperCase() + ' — ' + a.titulo);
  console.log('  fuente ......... ' + (a.procedencia.extraido_de.endsWith('raw.txt') ? '-raw' : '-layout') +
    (a.procedencia.columna_marginal_aislada ? '   (columna marginal aislada: ' +
      a.procedencia.columna_marginal_aislada.palabras + ' palabras excluidas)' : ''));
  console.log('  fragmentos ..... ' + a.texto_decreto.length +
    (a.procedencia.corte_por_salto_de_pagina ? '   PARTIDO POR SALTO DE PAGINA' : '') +
    '   ·   ' + todo.length + ' caracteres   ·   linea en -layout: ' + JSON.stringify(a.procedencia.linea_en_el_documento));
  console.log('  EMPIEZA CON .... ' + JSON.stringify(a.texto_decreto[0].slice(0, 72) + '...'));
  console.log('  TERMINA CON .... ' + JSON.stringify('...' + ultimo.slice(-90)));
  const rem = [];
  for (const [nombre, re] of PATRONES) {
    const hits = [...new Set(todo.match(re) || [])];
    if (hits.length) rem.push('    ' + nombre + ': ' + hits.map((h) => JSON.stringify(h)).join(', '));
  }
  console.log('  REMITE A ....... ' + (rem.length ? '' : 'no remite a nada'));
  rem.forEach((r) => console.log(r));
}
console.log('================================================================================');
console.log('');
console.log('CONTROL NEGATIVO de los patrones de remision, sobre los once juntos:');
const todos = insumo.articulos.map((a) => a.texto_decreto.join(' ')).join(' ');
for (const [nombre, re] of PATRONES) {
  const n = (todos.match(re) || []).length;
  console.log('  ' + nombre.padEnd(42) + n + ' ocurrencias');
}
