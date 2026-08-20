'use strict';
// Control de caracteres con el criterio H-T2: se recorre por PUNTOS DE CODIGO,
// no por bytes. U+0091 en UTF-8 son dos bytes (0xC2 0x91) y NINGUNO de los dos
// es < 0x20, asi que un control que mire bytes no lo caza.
// Ademas mira BOM, que es el otro modo de falla fichado de este repositorio.
const fs = require('fs'), path = require('path');

const D = '_bitacoras/s7a_pantalla_2026-08-20';
const SUELTOS = [
  'data/deudas/deudas_declaradas.json',
  '_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt',
  '_bitacoras/spec2_pantalla_2026-08-20/spec2_pantalla_2026-08-20.txt',
];

const sospechoso = c =>
  (c < 0x20 && c !== 0x0A && c !== 0x0D && c !== 0x09) || c === 0x7F || (c >= 0x80 && c <= 0x9F);

console.log('CRITERIO (H-T2): puntos de codigo. Se marca < 0x20 salvo LF/CR/TAB, 0x7F, y C1 0x80-0x9F.');
console.log('Y BOM (U+FEFF) al inicio, que es el otro defecto fichado.');
console.log('');

const ficheros = fs.readdirSync(D).sort()
  .filter(f => fs.statSync(path.join(D, f)).isFile())
  .map(f => path.join(D, f))
  .concat(SUELTOS);

let total = 0, malos = 0, boms = 0;
for (const p of ficheros) {
  const t = fs.readFileSync(p, 'utf8');
  const bom = t.charCodeAt(0) === 0xFEFF;
  if (bom) boms++;
  const hits = [];
  for (const ch of t) {
    const c = ch.codePointAt(0);
    total++;
    if (sospechoso(c)) hits.push('U+' + c.toString(16).toUpperCase().padStart(4, '0'));
  }
  malos += hits.length;
  console.log(((hits.length || bom) ? '!! ' : 'ok ') + p +
    '  puntos_de_codigo=' + [...t].length +
    '  sospechosos=' + hits.length +
    '  BOM=' + (bom ? 'SI' : 'no') +
    (hits.length ? '  -> ' + [...new Set(hits)].join(',') : ''));
}
console.log('');
console.log('TOTAL puntos de codigo recorridos: ' + total + '   sospechosos: ' + malos + '   con BOM: ' + boms);

console.log('');
console.log('CONTROL POSITIVO — cadena fabricada con un U+0091 adentro:');
const s = 'ab' + String.fromCodePoint(0x91) + 'cd';
const h = [...s].filter(ch => sospechoso(ch.codePointAt(0)));
console.log('   detectados por este control: ' + h.length + '  (esperado 1)');
const porBytes = [...Buffer.from(s, 'utf8')].filter(b => b < 0x20 && b !== 0x0A && b !== 0x0D && b !== 0x09).length;
console.log('   un control que mirara BYTES habria devuelto: ' + porBytes + '  (por eso H-T2 mira puntos de codigo)');
console.log('');
console.log('CONTROL POSITIVO 2 — BOM fabricado:');
console.log('   detectado: ' + (('﻿abc').charCodeAt(0) === 0xFEFF ? 'SI' : 'NO') + '  (esperado SI)');
console.log('');
console.log((malos === 0 && boms === 0 && h.length === 1) ? 'VERDE' : 'ROJO');
