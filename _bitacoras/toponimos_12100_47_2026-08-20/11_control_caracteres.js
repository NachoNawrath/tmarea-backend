// P11 - CONTROL DE CARACTERES
//
// DOS CRITERIOS, y el segundo existe por un defecto de ESTA sesion:
//
//   H-T2 (heredado): puntos de codigo de CONTROL. Se marca < 0x20 salvo
//   LF/CR/TAB, 0x7F, y C1 0x80-0x9F.
//
//   ALFABETO (nuevo): puntos de codigo FUERA del latino que aparecen DENTRO
//   de una palabra. H-T2 no los ve y no puede verlos: solo mira caracteres de
//   control, y una letra de otro alfabeto no es un caracter de control -- es
//   una letra, perfectamente valida, que se dibuja igual que la latina.
//   EL DEFECTO QUE LO MOTIVA: al escribir 02_extraer_toponimos.js se colo una
//   "a" CIRILICA (U+0430) dentro de la palabra "coteja". El fichero compilaba,
//   corria, y H-T2 lo habria dado por bueno. Lo cazo un barrido de puntos de
//   codigo fuera del latin que se corrio aparte, y por eso ahora es control.
//   ESTO ES UN HUECO DE H-T2, NO DE ESTA SESION: queda dicho para que quien
//   herede H-T2 sepa que su cobertura termina en los caracteres de control.

const fs = require('fs'), path = require('path');
const DIR = __dirname;

const sospechoso = cp => (cp < 0x20 && cp !== 0x0A && cp !== 0x0D && cp !== 0x09) || cp === 0x7F || (cp >= 0x80 && cp <= 0x9F);
// latino + signos que el proyecto usa a proposito
const PERMITIDO = cp => cp <= 0x24F || cp === 0x2013 || cp === 0x2014 || cp === 0x2018 || cp === 0x2019
  || cp === 0x201C || cp === 0x201D || cp === 0x2026 || cp === 0x2192 || cp === 0x00B7 || cp === 0x20AC
  || (cp >= 0x0300 && cp <= 0x036F);

const L = []; const say = s => { L.push(s); console.log(s); };
say('CONTROL DE CARACTERES - toponimos_12100_47_2026-08-20');
say('CRITERIO 1 (H-T2)     : puntos de codigo de control.');
say('CRITERIO 2 (ALFABETO) : puntos de codigo fuera del latino, que H-T2 no ve.');
say('');

const bin = new Set(['.zip', '.pdf', '.png']);
const files = fs.readdirSync(DIR).filter(f => fs.statSync(path.join(DIR, f)).isFile());
let tot = 0, malH = 0, malA = 0, bom = 0;
for (const f of files.sort()) {
  if (bin.has(path.extname(f))) { say(`  SALTADO (binario)  ${f}`); continue; }
  const buf = fs.readFileSync(path.join(DIR, f));
  const tieneBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  if (tieneBom) bom++;
  const s = buf.toString('utf8');
  const hs = [], as = [];
  for (const ch of s) { const cp = ch.codePointAt(0); tot++;
    if (sospechoso(cp)) hs.push(cp);
    else if (!PERMITIDO(cp)) as.push(cp); }
  if (hs.length) malH++;
  if (as.length) malA++;
  const est = hs.length || as.length || tieneBom ? 'MARCA' : 'OK   ';
  say(`  ${est}  ${f}${hs.length ? '  H-T2:' + hs.length : ''}${as.length ? '  ALFABETO:' + [...new Set(as)].map(c => 'U+' + c.toString(16).toUpperCase()) : ''}${tieneBom ? '  BOM' : ''}`);
}
say('');
say(`  ficheros revisados       : ${files.length}`);
say(`  puntos de codigo         : ${tot.toLocaleString('es-CL')}`);
say(`  con sospechosos H-T2     : ${malH}`);
say(`  con sospechosos ALFABETO : ${malA}`);
say(`  con BOM UTF-8            : ${bom}`);
say('');
// CONTROLES POSITIVOS: los dos criterios tienen que morder
const cebo1 = String.fromCodePoint(0x91), cebo2 = 'cotej' + String.fromCodePoint(0x430);
const m1 = [...cebo1].some(c => sospechoso(c.codePointAt(0)));
const m2 = [...cebo2].some(c => !sospechoso(c.codePointAt(0)) && !PERMITIDO(c.codePointAt(0)));
say('CONTROLES POSITIVOS - los dos criterios tienen que morder');
say(`  H-T2 contra U+0091 fabricado          : ${m1 ? 'CAZA  OK' : 'NO CAZA  ROJO'}`);
say(`  ALFABETO contra "coteja" con a cirilica: ${m2 ? 'CAZA  OK' : 'NO CAZA  ROJO'}`);
say('  Y EL CONTROL CRUZADO QUE IMPORTA:');
const cruzado = ![...cebo2].some(c => sospechoso(c.codePointAt(0)));
say(`  H-T2 contra la a cirilica              : ${cruzado ? 'NO LA VE  -- confirmado que es un hueco de H-T2' : 'la ve'}`);
say('');
const verde = malH === 0 && malA === 0 && bom === 0 && m1 && m2 && cruzado;
say(`EXIT ${verde ? 0 : 1}  -- ${verde ? 'VERDE' : 'ROJO'}`);
fs.writeFileSync(path.join(DIR, '11_control_caracteres.txt'), L.join('\n') + '\n', 'utf8');
process.exit(verde ? 0 : 1);
