'use strict';
// Control de caracteres con el criterio H-T2: se recorre por PUNTOS DE CODIGO y
// no por bytes. U+0091 en UTF-8 son dos bytes (0xC2 0x91) y ninguno es < 0x20,
// asi que un control que mire bytes NO lo caza. Mismo instrumento que
// _bitacoras/tres_de_d4_2026-08-20/17_control_caracteres.js, con otro alcance.
const fs = require('fs'), path = require('path');
const D = '_bitacoras/cobertura_arearestriccion_2026-08-20';
const EXTRA = ['data/deudas/deudas_declaradas.json'];

const sospechoso = c =>
  (c < 0x20 && c !== 0x0A && c !== 0x0D && c !== 0x09) || c === 0x7F || (c >= 0x80 && c <= 0x9F);

console.log('CRITERIO (H-T2): puntos de codigo. Se marca < 0x20 salvo LF/CR/TAB, 0x7F, y C1 0x80-0x9F.');
console.log('ALCANCE: todo lo que esta sesion escribio o toco. La captura cruda ENTRA:');
console.log('viene de la red y es justo el sitio por donde un caracter raro se cuela.');
console.log('');
let total = 0, malos = 0;
for (const f of [...fs.readdirSync(D).sort().map(x => path.join(D, x)), ...EXTRA]) {
  const t = fs.readFileSync(f, 'utf8');
  const hits = [];
  for (const ch of t) {
    const c = ch.codePointAt(0);
    total++;
    if (sospechoso(c)) hits.push('U+' + c.toString(16).toUpperCase().padStart(4, '0'));
  }
  malos += hits.length;
  console.log((hits.length ? '!! ' : 'ok ') + f.replace(/\\/g, '/') +
    '  puntos_de_codigo=' + [...t].length +
    '  sospechosos=' + hits.length +
    (hits.length ? '  -> ' + [...new Set(hits)].join(',') : ''));
}
console.log('');
console.log('TOTAL puntos de codigo recorridos: ' + total + '   sospechosos: ' + malos);

console.log('');
console.log('CONTROL POSITIVO — cadena fabricada con un U+0091 adentro:');
const s = 'ab' + String.fromCodePoint(0x91) + 'cd';
const h = [...s].filter(ch => sospechoso(ch.codePointAt(0)));
console.log('   puntos de codigo: ' + [...s].length + '   bytes UTF-8: ' + Buffer.byteLength(s, 'utf8'));
console.log('   detectados por este control: ' + h.length + '  (esperado 1)');
const bytes = [...Buffer.from(String.fromCodePoint(0x91), 'utf8')].map(b => '0x' + b.toString(16).toUpperCase());
console.log('   los bytes de U+0091 en UTF-8 son ' + bytes.join(' ') + ' y ninguno es < 0x20:');
console.log('   por eso un control que mirara BYTES devolveria 0 aca, que es el defecto que H-T2 corrigio.');
const porBytes = [...Buffer.from(s, 'utf8')].filter(b => b < 0x20 && b !== 0x0A && b !== 0x0D && b !== 0x09).length;
console.log('   control por bytes sobre la misma cadena: ' + porBytes + '  (falso negativo, como se esperaba)');

console.log('');
console.log('BOM: ningun fichero escrito por esta sesion debe arrancar con U+FEFF.');
let bom = 0;
for (const f of [...fs.readdirSync(D).sort().map(x => path.join(D, x)), ...EXTRA]) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.charCodeAt(0) === 0xFEFF) { bom++; console.log('   !! BOM en ' + f); }
}
console.log('   ficheros con BOM: ' + bom + '  (esperado 0)');
process.exit(malos === 0 && bom === 0 ? 0 : 1);
