'use strict';
// CONTROL DE CARACTERES — criterio H-T2: se recorre por PUNTOS DE CODIGO, no por
// bytes. U+0091 en UTF-8 son dos bytes (0xC2 0x91) y ninguno es < 0x20, asi que
// un control que mire bytes no lo caza.
//
// EL CARACTER DE PRUEBA SE CONSTRUYE POR PUNTO DE CODIGO: si fuera literal, este
// fichero se marcaria a si mismo y saldria en rojo sobre una bitacora limpia. Es
// el defecto que la version anterior de este control ya dejo fichado.
//
// 05_sitport_vivo.json va APARTE Y NO DECIDE EL EXIT: es evidencia cruda de la
// fuente. Corregirle un caracter seria falsificarla — la misma regla con la que
// el bucket C deja el texto de SITPORT sin tocar. Se mide y se informa.
const fs = require('fs'), path = require('path');
const D = __dirname;
// EVIDENCIA CRUDA Y DERIVADA — no decide el exit, y cada una con su motivo
// TRAZADO, no supuesto:
//   05 / 14 / 15  : respuesta viva de SITPORT. Corregirle un caracter seria
//                   falsificarla — la misma regla del bucket C.
//   03_fragmentos : extraccion literal del corpus. Trae C1 (U+0089, U+008D,
//                   U+0091, U+0093, U+009A) en 5 fragmentos, y los CINCO salen
//                   del mismo sitio: src/services/sitport-parser.js, que lleva
//                   la tabla de reparacion de mojibake de SITPORT y por eso
//                   tiene esas secuencias como literales. El extractor las
//                   copio bien; marcarlas seria pedirle que mienta sobre el
//                   arbol. Se informa y se deja.
const CRUDA = new Set(['05_sitport_vivo.json', '14_sitport_vivo_pantalla.json',
  '15_sitport_al_capturar.json', '03_fragmentos.json']);

const sospechoso = (c) =>
  (c < 0x20 && c !== 0x0A && c !== 0x0D && c !== 0x09) || c === 0x7F || (c >= 0x80 && c <= 0x9F);

const L = [];
const say = (s) => L.push(s === undefined ? '' : s);
say('CONTROL DE CARACTERES — voseo_al_patron_2026-08-20');
say('CRITERIO (H-T2): puntos de codigo. Se marca < 0x20 salvo LF/CR/TAB, 0x7F,');
say('y el bloque C1 0x80-0x9F.');
say('');

let total = 0, malos = 0, ficheros = 0;
const cruda = [];
for (const f of fs.readdirSync(D).sort()) {
  const p = path.join(D, f);
  if (!fs.statSync(p).isFile()) continue;
  const t = fs.readFileSync(p, 'utf8');
  const hits = [];
  for (const ch of t) { const c = ch.codePointAt(0); total++; if (sospechoso(c)) hits.push('U+' + c.toString(16).toUpperCase().padStart(4, '0')); }
  ficheros++;
  const marca = [...new Set(hits)].join(', ');
  if (CRUDA.has(f)) { cruda.push(f + (hits.length ? '  -> ' + marca : '  -> ninguno')); continue; }
  if (hits.length) { malos++; say('  !!  ' + f + '  -> ' + marca); }
  else say('  OK  ' + f);
}
say('');
say('EVIDENCIA CRUDA Y DERIVADA (se informa, no decide el exit — motivo trazado');
say('arriba del fichero, no supuesto):');
for (const c of cruda) say('  ..  ' + c);
say('');
const bom = [];
for (const f of fs.readdirSync(D)) {
  const p = path.join(D, f);
  if (!fs.statSync(p).isFile()) continue;
  const b = fs.readFileSync(p).slice(0, 3);
  if (b.length === 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) bom.push(f);
}
say('  ficheros revisados        : ' + ficheros);
say('  puntos de codigo          : ' + total);
say('  ficheros con sospechosos  : ' + malos);
say('  BOM UTF-8 al principio    : ' + (bom.length ? bom.join(', ') : 'ninguno') + '  -> ' + (bom.length ? 'FALLA' : 'OK'));
say('');
say('CONTROL POSITIVO DEL PROPIO CONTROL: se construye U+0091 por punto de codigo');
say('y el criterio tiene que cazarlo.');
const prueba = 'texto con ' + String.fromCodePoint(0x91) + ' adentro';
let cazado = false;
for (const ch of prueba) if (sospechoso(ch.codePointAt(0))) cazado = true;
say('  -> ' + (cazado ? 'OK — el criterio caza U+0091' : 'FALLA — el control no sirve'));
say('');
say('CONTROL NEGATIVO: una letra con tilde NO debe marcarse. U+00E1 es 0xC3 0xA1');
say('en UTF-8 y un control por bytes la confundiria con el bloque C1.');
const tilde = String.fromCodePoint(0xE1);
const falsoPositivo = sospechoso(tilde.codePointAt(0));
say('  -> ' + (falsoPositivo ? 'FALLA — marca una tilde' : 'OK — no marca la tilde'));
say('');
const exit = (malos || bom.length || !cazado || falsoPositivo) ? 1 : 0;
say('EXIT ' + exit + (exit ? '  — ROJO' : '  — VERDE'));
fs.writeFileSync(path.join(D, '08_control_caracteres.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
process.exit(exit);
