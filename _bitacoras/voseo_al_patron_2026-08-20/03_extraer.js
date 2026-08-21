'use strict';
// EXTRACTOR DE TEXTO RENDERIZABLE. El paso 02 deja 975 ambiguas en ROL P y casi
// todas son codigo: `usa`, `carga`, `marca`, `muestra` como identificador o como
// sustantivo. Este paso mira SOLO dentro de literales de texto y de texto JSX,
// con los comentarios quitados.
//
// ES APROXIMADO Y SE DECLARA: el troceo de literales es por linea, asi que una
// plantilla que abarque varias lineas se ve por partes, y un // adentro de una
// cadena se trata como comentario. Los dos controles del final miden justamente
// eso: que el caso conocido sobreviva y que un comentario no.
const fs = require('fs');
const path = require('path');
const D = __dirname;
const BACK = path.resolve(D, '..', '..');
const PWA = path.resolve(BACK, '..', 'tmarea-pwa');
const hits = JSON.parse(fs.readFileSync(path.join(D, '02_clasificacion.json'), 'utf8'));

const ficherosP = [...new Set(hits.filter((h) => h.rol === 'P').map((h) => h.clave))].sort();
const absDe = (clave) => (clave.indexOf('pwa/') === 0
  ? path.join(PWA, clave.slice(4)) : path.join(BACK, clave.slice(8)));

// ── fragmentos de un fichero de codigo ──────────────────────────────────────
function fragmentosCodigo(texto) {
  const out = [];
  const lineas = texto.split(/\r?\n/);
  let enBloque = false;
  for (let i = 0; i < lineas.length; i++) {
    let l = lineas[i];
    if (enBloque) { const c = l.indexOf('*/'); if (c < 0) continue; l = l.slice(c + 2); enBloque = false; }
    for (;;) {
      const a = l.indexOf('/*');
      if (a < 0) break;
      const b = l.indexOf('*/', a + 2);
      if (b < 0) { l = l.slice(0, a); enBloque = true; break; }
      l = l.slice(0, a) + ' ' + l.slice(b + 2);
    }
    const s = l.indexOf('//');
    if (s >= 0) l = l.slice(0, s);
    if (!l.trim()) continue;
    const frags = [];
    const RE_CAD = /'([^']*)'|"([^"]*)"|`([^`]*)`/g;
    let m;
    while ((m = RE_CAD.exec(l))) { const v = m[1] || m[2] || m[3]; if (v && v.trim()) frags.push(v); }
    const sinCad = l.replace(RE_CAD, ' ');
    const jsx = sinCad.replace(/<[^>]*>/g, ' ').replace(/\{[^}]*\}/g, ' ');
    if (jsx.trim()) frags.push(jsx);
    for (const f of frags) out.push({ linea: i + 1, frag: f.trim() });
  }
  return out;
}

// ── fragmentos de un .json: SOLO valores de cadena, nunca claves ─────────────
function fragmentosJson(texto) {
  const out = [];
  // Se cita por RUTA DE CLAVE, no por numero de linea: la busqueda por linea
  // devolvia siempre la primera coincidencia, asi que una cadena repetida en
  // 60 bahias salia 60 veces apuntando al mismo sitio. La ruta de clave es
  // ademas la cita correcta para un JSON — es su seccion.
  const anda = (n, ruta) => {
    if (typeof n === 'string') { if (n.trim()) out.push({ linea: 0, ruta, frag: n }); return; }
    if (Array.isArray(n)) { n.forEach((x, i) => anda(x, ruta + '[' + i + ']')); return; }
    if (n && typeof n === 'object') { for (const k of Object.keys(n)) anda(n[k], ruta ? ruta + '.' + k : k); }
  };
  anda(JSON.parse(texto), '');
  anda(JSON.parse(texto));
  return out;
}

// ── vocabulario: se relee del propio 01 para no tener dos verdades ───────────
const src01 = fs.readFileSync(path.join(D, '01_barrido.js'), 'utf8');
const V = [];
const add = (formas, registro, ambiguo, nota) => { for (const f of formas) V.push({ forma: f.normalize('NFC'), registro, ambiguo, nota }); };
const bloque = src01.slice(src01.indexOf('const V = [];'), src01.indexOf('// ── MOTOR'));
new Function('add', bloque.replace('const V = [];', '').replace(/const add =[\s\S]*?};/, ''))(add);
const BS = String.fromCharCode(92);
const FA = '(?<![' + BS + 'p{L}' + BS + 'p{N}])';
const FD = '(?![' + BS + 'p{L}' + BS + 'p{N}])';
for (const v of V) v.re = new RegExp(FA + v.forma + FD, 'giu');

const L = [];
const say = (s) => L.push(s === undefined ? '' : s);
say('TEXTO RENDERIZABLE DE ROL P — voseo_al_patron_2026-08-20');
say('');
say('QUE MIRA: solo literales de cadena y texto JSX, con comentarios quitados.');
say('QUE NO MIRA: comentarios, nombres de variable, claves de JSON.');
say('APROXIMACION DECLARADA: el troceo es por linea; una plantilla de varias');
say('  lineas se ve por partes y un // dentro de una cadena se toma por comentario.');
say('');
say('ficheros de ROL P con al menos un hit en el paso 02 : ' + ficherosP.length);
say('');

const encontrados = [];
const vistos = new Set();  // dedupe: una cadena distinta por fichero y por forma
const todos = [];  // fragmentos crudos de ROL P, para el paso 09
let nFrag = 0;
for (const clave of ficherosP) {
  const abs = absDe(clave);
  let t;
  try { t = fs.readFileSync(abs, 'utf8'); } catch { continue; }
  let frags;
  try { frags = clave.endsWith('.json') ? fragmentosJson(t) : fragmentosCodigo(t); }
  catch (e) { say('  !! no pude trocear ' + clave + ' : ' + e.message); continue; }
  nFrag += frags.length;
  for (const f of frags) todos.push({ clave, linea: f.linea, ruta: f.ruta === undefined ? null : f.ruta, frag: f.frag });
  for (const f of frags) {
    const nf = f.frag.normalize('NFC');
    for (const v of V) {
      if (v.registro === 'no_usted_indistinto') continue;
      v.re.lastIndex = 0;
      if (!v.re.test(nf)) continue;
      const cl = clave + '|' + v.forma + '|' + f.frag;
      if (vistos.has(cl)) continue;
      vistos.add(cl);
      encontrados.push({ clave, linea: f.linea, ruta: f.ruta === undefined ? null : f.ruta,
        forma: v.forma, registro: v.registro, ambiguo: v.ambiguo, frag: f.frag.slice(0, 200) });
    }
  }
}
say('fragmentos de texto extraidos : ' + nFrag);
say('');
for (const reg of ['voseo', 'tuteo']) {
  for (const amb of [false, true]) {
    const h = encontrados.filter((x) => x.registro === reg && x.ambiguo === amb)
      .sort((a, b) => a.clave.localeCompare(b.clave) || a.linea - b.linea);
    say('════ ' + reg.toUpperCase() + ' · ' + (amb ? 'AMBIGUAS (homografo — las resuelve la lectura)' : 'INEQUIVOCAS') + ' ════');
    say('  ' + h.length + ' cadenas DISTINTAS en texto renderizable de ROL P');
    say('');
    let ultima = '';
    for (const x of h) {
      if (x.clave !== ultima) { say('  ── ' + x.clave + ' ──'); ultima = x.clave; }
      const sitio = x.ruta ? x.ruta : 'L' + x.linea;
      say('     ' + sitio.padEnd(10) + '  [' + x.forma + ']  ' + x.frag);
    }
    say('');
  }
}

say('════ CONTROLES DEL EXTRACTOR ════');
let mal = 0;
// CONTROL (1), REESCRITO POR EL MISMO MOTIVO QUE EL ANCLA DEL PASO 01: pedia
// la forma voseante, o sea que se ponia en rojo cuando la correccion salia
// bien. Lo que tiene que valer es que la frase del escalon 3 SOBREVIVA AL
// TROCEO, este en el registro que este.
const frasePwa = fs.readFileSync(absDe('pwa/src/screens/P3_VoyageVerification.jsx'), 'utf8').normalize('NFC');
const c1n = fragmentosCodigo(frasePwa).filter((f) => f.frag.indexOf('por VHF Canal 16 antes de recalar') >= 0);
say('  (1) la frase del escalon 3 sobrevive al troceo: ' + c1n.length + ' fragmentos (esperado 2)');
for (const x of c1n) say('        L' + x.linea + '  ' + x.frag);
if (c1n.length !== 2) mal++;

const pruebaCom = ['const x = 1; // contactá a la Capitanía', 'let y = 2; /* verificá esto */', "const z = 'Contactá a la Capitanía';"];
const fr = fragmentosCodigo(pruebaCom.join('\n')).map((f) => f.frag);
const hayCom = fr.some((f) => f.indexOf('contactá a la') >= 0 || f.indexOf('verificá esto') >= 0);
const hayCad = fr.some((f) => f.indexOf('Contactá a la Capitanía') >= 0);
say('  (2) un comentario NO sobrevive : ' + (hayCom ? 'FALLA — sobrevivio' : 'OK'));
say('  (3) una cadena SI sobrevive    : ' + (hayCad ? 'OK' : 'FALLA — se perdio'));
if (hayCom || !hayCad) mal++;

const clavesJson = ficherosP.filter((c) => c.endsWith('.json'));
say('  (4) en .json solo se leen VALORES, nunca claves. Ficheros .json en ROL P: ' + clavesJson.length);
say('');
say('EXIT ' + (mal ? 1 : 0) + (mal ? '  — ROJO' : '  — VERDE'));

// Los fragmentos crudos se vuelcan para que el paso 09 pueda DERIVAR el
// vocabulario del corpus en vez de recordarlo de memoria.
fs.writeFileSync(path.join(D, '03_fragmentos.json'), JSON.stringify(todos), 'utf8');
fs.writeFileSync(path.join(D, '03_texto_renderizable.json'), JSON.stringify(encontrados, null, 1), 'utf8');
fs.writeFileSync(path.join(D, '03_texto_renderizable.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
process.exit(mal ? 1 : 0);
