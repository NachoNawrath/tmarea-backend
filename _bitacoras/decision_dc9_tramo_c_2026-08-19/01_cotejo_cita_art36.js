// COTEJO CARACTER POR CARACTER — la cita del owner contra art_36 de rrdn_articulos.json
// No corrige nada. Mide y publica.
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const INSUMO = path.join(RAIZ, 'data', 'decreto', 'rrdn_articulos.json');
const CITA = path.join(__dirname, 'cita_owner_art36.txt');

const bufInsumo = fs.readFileSync(INSUMO);
const bufCita = fs.readFileSync(CITA);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

console.log('=== HUELLAS (clase: fichero en disco, sha256 sobre los bytes del fichero) ===');
console.log('rrdn_articulos.json      :', sha(bufInsumo));
console.log('cita_owner_art36.txt     :', sha(bufCita));

const j = JSON.parse(bufInsumo.toString('utf8'));
const art36 = j.articulos.find((a) => a.id === 'art_36');
const literal = art36.texto_decreto.join(' ');
const cita = bufCita.toString('utf8').replace(/\r?\n$/, '');

console.log('');
console.log('=== LONGITUDES (unidades: codepoints UTF-16 de JS) ===');
console.log('literal art_36 : ' + literal.length);
console.log('cita del owner : ' + cita.length);

console.log('');
console.log('=== SUBCADENA EXACTA ===');
const idx = literal.indexOf(cita);
console.log('indexOf(cita) en el literal =', idx);
if (idx >= 0) {
  console.log('VEREDICTO: LA CITA ES SUBCADENA EXACTA DEL LITERAL. 0 caracteres divergentes.');
  const antes = literal.slice(0, idx);
  const despues = literal.slice(idx + cita.length);
  console.log('lo que el literal trae ANTES de la cita  (' + antes.length + ' chars): ' + JSON.stringify(antes));
  console.log('lo que el literal trae DESPUES de la cita (' + despues.length + ' chars): ' + JSON.stringify(despues));
} else {
  console.log('VEREDICTO: NO ES SUBCADENA. Se localiza la primera divergencia.');
  // alineacion por prefijo comun contra la mejor ventana
  let mejor = { pos: -1, comun: -1 };
  for (let p = 0; p <= literal.length - 1; p++) {
    let c = 0;
    while (c < cita.length && p + c < literal.length && literal[p + c] === cita[c]) c++;
    if (c > mejor.comun) mejor = { pos: p, comun: c };
  }
  console.log('mejor alineacion: arranca en ' + mejor.pos + ', prefijo comun de ' + mejor.comun + ' chars');
  const i = mejor.comun;
  const cl = literal[mejor.pos + i];
  const cc = cita[i];
  const cp = (ch) => (ch === undefined ? '(fin)' : 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ' ' + JSON.stringify(ch));
  console.log('divergencia en el char ' + i + ' de la cita');
  console.log('  literal: ' + cp(cl));
  console.log('  cita   : ' + cp(cc));
  console.log('  contexto literal: ' + JSON.stringify(literal.slice(Math.max(0, mejor.pos + i - 40), mejor.pos + i + 40)));
  console.log('  contexto cita   : ' + JSON.stringify(cita.slice(Math.max(0, i - 40), i + 40)));
}

console.log('');
console.log('=== CONTROL POSITIVO del instrumento (una cadena que SI tiene que estar) ===');
const ctrlPos = 'a la gira';
console.log('indexOf(' + JSON.stringify(ctrlPos) + ') =', literal.indexOf(ctrlPos), '(esperado >= 0)');

console.log('');
console.log('=== CONTROL NEGATIVO del instrumento (la misma cita con UN acento quitado) ===');
const ctrlNeg = cita.replace('Marítima', 'Maritima');
console.log('la variante difiere de la cita en:', ctrlNeg === cita ? 'NADA — el control no se construyo' : '1 caracter (i con tilde -> i sin tilde)');
console.log('indexOf(variante) =', literal.indexOf(ctrlNeg), '(esperado -1)');

console.log('');
console.log('=== CARACTERES DE CONTROL fuera de LF/CR en los dos textos ===');
const ctl = (s, n) => {
  const malos = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.codePointAt(i);
    if (c < 0x20 && c !== 0x0a && c !== 0x0d) malos.push(i + ':U+' + c.toString(16));
    if (c === 0x7f) malos.push(i + ':U+7F');
  }
  console.log(n + ': ' + (malos.length ? malos.join(' ') : '0 — limpio'));
};
ctl(literal, 'literal art_36');
ctl(bufCita.toString('utf8'), 'cita_owner_art36.txt');
