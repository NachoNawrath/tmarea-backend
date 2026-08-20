'use strict';
// Control de caracteres con el criterio H-T2: se recorre por PUNTOS DE CODIGO,
// no por bytes. U+0091 en UTF-8 son dos bytes (0xC2 0x91) y NINGUNO de los dos
// es < 0x20, asi que un control que mire bytes no lo caza.
//
// Reusa el instrumento de _bitacoras/las_once_2026-08-20/04_control_caracteres.js.
// El caracter del control positivo se CONSTRUYE por punto de codigo: este
// fichero no lo contiene, para que no se marque a si mismo.
//
// ─── LO QUE SE EXCLUYE, Y POR QUE SE DICE ───────────────────────────────────
// El .pdf queda FUERA. Es binario: leido como utf8 daria sospechosos por
// construccion, y marcarlo no seria un hallazgo sino una tautologia. Su
// integridad se controla por sha256, que es el instrumento que le corresponde.
//
// El .txt del documento SI ENTRA, a proposito, aunque no lo escribi yo: es una
// captura cruda de la red y el precedente de cobertura_arearestriccion_2026-08-20
// las mete al control. Si trae un caracter raro, es un hallazgo sobre el
// documento, no un falso positivo.
//
// ─── Y MORDIO. QUE SE HIZO CON ESO ──────────────────────────────────────────
// El .txt trae U+000C (FORM FEED). El criterio H-T2 NO SE TOCA -- meter 0x0C en
// el conjunto permitido lo debilitaria para todo el proyecto por un caso.
//
// Lo que estaba mal era MI reparto: junte en una sola poblacion lo que escribi
// yo con un artefacto CAPTURADO. Se separan, con dos veredictos:
//
//   (1) LO ESCRITO EN ESTA SESION  -> tiene que dar CERO. Sin excepciones.
//   (2) LA CAPTURA CRUDA           -> se reporta lo que tenga, y solo se admite
//       U+000C, porque esta VERIFICADO que es el separador de pagina de
//       pdftotext y no algo que alguien tecleo:
//          U+000C en el .txt ............................. 28
//          objetos /Type /Page en el PDF ................. 28
//       Uno por pagina, exacto. Cualquier OTRO punto de codigo sospechoso en la
//       captura pone rojo igual: la excepcion es de un caracter, no del fichero.

const fs = require('fs'), path = require('path');

const D = '_bitacoras/limite_puerto_12100_47_2026-08-20';
const EXCLUIDOS = ['.pdf'];
const EXTRA = [
  'data/deudas/deudas_declaradas.json',
  'scripts/validar_deudas_declaradas.js',
];

const sospechoso = c =>
  (c < 0x20 && c !== 0x0A && c !== 0x0D && c !== 0x09) || c === 0x7F || (c >= 0x80 && c <= 0x9F);

console.log('CONTROL DE CARACTERES — limite_puerto_12100_47_2026-08-20');
console.log('CRITERIO (H-T2): puntos de codigo. Se marca < 0x20 salvo LF/CR/TAB, 0x7F, y C1 0x80-0x9F.');
console.log('');

const enDir = fs.readdirSync(D).sort()
  .filter(x => !EXCLUIDOS.includes(path.extname(x).toLowerCase()))
  .map(x => path.join(D, x));
const saltados = fs.readdirSync(D).sort()
  .filter(x => EXCLUIDOS.includes(path.extname(x).toLowerCase()));

// la captura cruda: unico fichero de la poblacion (2)
const CAPTURA = path.join(D, 'DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.txt');
const PAGINAS_DEL_PDF = 28;   // objetos /Type /Page contados en el binario

let total = 0, malos = 0, ficheros = 0;
let ffCaptura = 0, otrosEnCaptura = [];

for (const f of [...enDir, ...EXTRA]) {
  const esCaptura = path.resolve(f) === path.resolve(CAPTURA);
  const t = fs.readFileSync(f, 'utf8');
  const hits = [];
  for (const ch of t) {
    const c = ch.codePointAt(0);
    total++;
    if (!sospechoso(c)) continue;
    const nom = 'U+' + c.toString(16).toUpperCase().padStart(4, '0');
    if (esCaptura && c === 0x0C) { ffCaptura++; continue; }
    if (esCaptura) otrosEnCaptura.push(nom);
    hits.push(nom);
  }
  ficheros++;
  if (hits.length) { malos++; console.log('  !!  ' + f + '  -> ' + [...new Set(hits)].join(', ')); }
  else if (esCaptura) console.log('  OK  ' + f + '   (poblacion 2 — captura cruda)');
  else console.log('  OK  ' + f);
}
console.log('');
console.log('POBLACION 2 — LA CAPTURA CRUDA, REPORTADA APARTE');
console.log('  U+000C (form feed) en el .txt .......... ' + ffCaptura);
console.log('  objetos /Type /Page en el PDF .......... ' + PAGINAS_DEL_PDF);
const ffOk = ffCaptura === PAGINAS_DEL_PDF;
console.log('  -> ' + (ffOk
  ? 'OK — uno por pagina, exacto. Es el separador de pagina de pdftotext,'
  : 'ROJO — no coinciden: entonces NO es el separador de pagina y hay que mirarlo.'));
if (ffOk) console.log('     no algo que alguien tecleo. Por eso se admite, y solo este.');
console.log('  otros sospechosos en la captura ........ ' +
  (otrosEnCaptura.length ? [...new Set(otrosEnCaptura)].join(', ') + '  -> ROJO' : 'NINGUNO  -> OK'));
console.log('');
console.log('  SALTADOS por binarios (sha256 es su control): ' +
  (saltados.length ? saltados.join(', ') : 'ninguno'));
console.log('');

const bom = [];
for (const f of [...enDir, ...EXTRA])
  if (fs.readFileSync(f).slice(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF]))) bom.push(f);

console.log('  ficheros revisados       : ' + ficheros + '  (poblacion 1: ' + (ficheros - 1) +
  ' escritos en esta sesion · poblacion 2: 1 captura cruda)');
console.log('  puntos de codigo         : ' + total.toLocaleString('es-CL'));
console.log('  ficheros con sospechosos : ' + malos + '   (poblacion 1 tiene que dar 0)');
console.log('  BOM UTF-8 al principio   : ' + (bom.length ? bom.join(', ') : 'ninguno') +
  '  -> ' + (bom.length ? 'FALLA' : 'OK'));
console.log('');
console.log('CONTROL POSITIVO del propio control: se construye U+0091 por punto de codigo');
console.log('y tiene que cazarlo. Un control de caracteres que nunca marco nada no ha');
console.log('demostrado que sepa marcar.');
const prueba = 'texto con ' + String.fromCodePoint(0x91) + ' adentro';
let cazado = false;
for (const ch of prueba) if (sospechoso(ch.codePointAt(0))) cazado = true;
console.log('  -> ' + (cazado ? 'OK — el criterio caza U+0091' : 'FALLA — el control no sirve'));

const exit = (malos || bom.length || !cazado || !ffOk || otrosEnCaptura.length) ? 1 : 0;
console.log('');
console.log('EXIT ' + exit + (exit ? '  — ROJO' : '  — VERDE'));
process.exit(exit);
