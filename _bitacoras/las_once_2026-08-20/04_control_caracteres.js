'use strict';
// Control de caracteres con el criterio corregido por H-T2: se recorre por
// PUNTOS DE CODIGO, no por bytes. U+0091 en UTF-8 son dos bytes (0xC2 0x91) y
// NINGUNO de los dos es < 0x20, asi que un control que mire bytes no lo caza.
//
// DEFECTO DE INSTRUMENTO CAZADO EN LA PRIMERA CORRIDA, y por eso queda escrito:
// la version anterior traia el U+0091 del control positivo COMO LITERAL en su
// propio fichero, asi que se marcaba a si misma y salia en rojo sobre un arbol
// limpio. Aca el caracter se CONSTRUYE por punto de codigo: el fichero no lo
// contiene. Es el mismo genero que los otros doce ya fichados — corre perfecto
// y mide otra cosa.
const fs = require('fs'), path = require('path');
const D = '_bitacoras/las_once_2026-08-20';
const EXTRA = ['data/deudas/deudas_declaradas.json'];

const sospechoso = c =>
  (c < 0x20 && c !== 0x0A && c !== 0x0D && c !== 0x09) || c === 0x7F || (c >= 0x80 && c <= 0x9F);

console.log('CONTROL DE CARACTERES — las_once_2026-08-20');
console.log('CRITERIO (H-T2): puntos de codigo. Se marca < 0x20 salvo LF/CR/TAB, 0x7F, y C1 0x80-0x9F.');
console.log('');
let total = 0, malos = 0, ficheros = 0;
for (const f of [...fs.readdirSync(D).sort().map(x => path.join(D, x)), ...EXTRA]) {
  const t = fs.readFileSync(f, 'utf8');
  const hits = [];
  for (const ch of t) {
    const c = ch.codePointAt(0);
    total++;
    if (sospechoso(c)) hits.push('U+' + c.toString(16).toUpperCase().padStart(4, '0'));
  }
  ficheros++;
  if (hits.length) { malos++; console.log('  !!  ' + f + '  -> ' + [...new Set(hits)].join(', ')); }
  else console.log('  OK  ' + f);
}
const bom = [];
for (const f of EXTRA) if (fs.readFileSync(f).slice(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF]))) bom.push(f);
console.log('');
console.log('  ficheros revisados : ' + ficheros);
console.log('  puntos de codigo   : ' + total);
console.log('  ficheros con sospechosos : ' + malos);
console.log('  BOM UTF-8 al principio    : ' + (bom.length ? bom.join(', ') : 'ninguno') + '  -> ' + (bom.length ? 'FALLA' : 'OK'));
console.log('');
console.log('CONTROL POSITIVO del propio control: se construye U+0091 por punto de codigo y tiene que cazarlo.');
const prueba = 'texto con ' + String.fromCodePoint(0x91) + ' adentro';
let cazado = false;
for (const ch of prueba) if (sospechoso(ch.codePointAt(0))) cazado = true;
console.log('  -> ' + (cazado ? 'OK — el criterio caza U+0091' : 'FALLA — el control no sirve'));
const exit = (malos || bom.length || !cazado) ? 1 : 0;
console.log('');
console.log('EXIT ' + exit + (exit ? '  — ROJO' : '  — VERDE'));
process.exit(exit);
