// _bitacoras/frente_contacto_fallback_2026-08-14/medir_fallback.js
//
// Instrumento de la sesion del 2026-08-14 — Fase 1 y Fase 1b del frente de
// contacto. Reproduce las mediciones que las enmiendas de PLAN_JURISDICCION.md
// citan. SOLO LEE: no escribe ningun archivo.
//
// Uso, desde la raiz del repositorio:
//     node _bitacoras/frente_contacto_fallback_2026-08-14/medir_fallback.js
//
// Que mide, en orden:
//   M1  la tabla GOBERNACIONES de los dos capitanias.js, byte a byte
//   M3  cuantas entradas alimentan los 3 numeros de baja, por las dos lecturas
//   A   universo de consultaBahias contra las claves del mapa, en los dos sentidos
//   A2  alcance de resolverBahiaIdPorNombre sobre su propio universo
//   B   columnas del CSV y cobertura de las 15 franjas
//   C   getCapitania(lat,lng) contra el campo gobernacion del mapa
//
// La copia de la PWA se lee por ruta relativa al repositorio hermano; si no
// esta, M1 lo declara y sigue. No se asume que exista.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..', '..');
const PWA = path.resolve(REPO, '..', 'tmarea-pwa');

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function h(t) { console.log('\n=== ' + t + ' ==='); }

// ── insumos ──────────────────────────────────────────────────────────────────
const MAPA = path.join(REPO, 'src/data/bahia-capitania-map.json');
const CAP_BE = path.join(REPO, 'src/utils/capitanias.js');
const CAP_PWA = path.join(PWA, 'src/utils/capitanias.js');
const RUTAS = path.join(REPO, 'src/routes/sitport-routes.js');
const BAHIAS = path.join(REPO, '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json');
const CSV = path.join(REPO, '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv');

const map = JSON.parse(fs.readFileSync(MAPA, 'utf8'));
const { getCapitania } = require(CAP_BE);

// BAHIA_COORDS vive embebido en sitport-routes.js; se extrae por delimitadores
// literales, no por regex sobre el contenido.
const src = fs.readFileSync(RUTAS, 'utf8');
const ini = src.indexOf('const BAHIA_COORDS');
const fin = src.indexOf('};', ini);
const COORDS = eval('(' + src.slice(src.indexOf('{', ini), fin + 1) + ')');

const MUERTOS = ['+56 58 220 6402', '+56 41 226 6100', '+56 65 256 1100'];
const GOBS_MUERTAS = ['Arica', 'Talcahuano', 'Puerto Montt'];

// ── M1 ───────────────────────────────────────────────────────────────────────
h('M1 — la tabla GOBERNACIONES en las dos copias');
function bloque(f) {
  const t = fs.readFileSync(f, 'utf8');
  const i = t.indexOf('const GOBERNACIONES = [');
  const j = t.indexOf('];', i);
  return t.slice(i, j + 2).replace(/\r/g, '');
}
console.log('  backend : ' + CAP_BE);
console.log('            ' + fs.statSync(CAP_BE).size + ' bytes  sha256 ' + sha(CAP_BE));
if (!fs.existsSync(CAP_PWA)) {
  console.log('  pwa     : NO ENCONTRADA en ' + CAP_PWA + ' — M1 no se puede completar');
} else {
  console.log('  pwa     : ' + CAP_PWA);
  console.log('            ' + fs.statSync(CAP_PWA).size + ' bytes  sha256 ' + sha(CAP_PWA));
  const a = bloque(CAP_BE), b = bloque(CAP_PWA);
  console.log('  identicos a nivel ARCHIVO : ' + (sha(CAP_BE) === sha(CAP_PWA)));
  console.log('  largo del bloque backend  : ' + a.length);
  console.log('  largo del bloque pwa      : ' + b.length);
  console.log('  identicos a nivel TABLA   : ' + (a === b));
}

// ── M3 ───────────────────────────────────────────────────────────────────────
h('M3 — los 3 numeros de baja contados sobre bahia-capitania-map.json');
let porTel = 0;
for (const t of MUERTOS) {
  const n = Object.values(map).filter(e => e.telefono === t).length;
  porTel += n;
  console.log('  ' + t.padEnd(18) + ' -> ' + String(n).padStart(3) + ' entradas');
}
console.log('  TOTAL por telefono: ' + porTel + '   (el plan declaraba 41)');
let porGob = 0;
for (const g of GOBS_MUERTAS) {
  const n = Object.values(map).filter(e => e.gobernacion === g).length;
  porGob += n;
  console.log('  gobernacion ' + g.padEnd(14) + ' -> ' + String(n).padStart(3) + ' entradas');
}
console.log('  TOTAL por gobernacion: ' + porGob);

// ── A ────────────────────────────────────────────────────────────────────────
h('A — universo de consultaBahias contra las claves del mapa');
const bah = JSON.parse(fs.readFileSync(BAHIAS, 'utf8'));
const idsSrc = [...new Set(bah.map(b => Number(b.IDBahia)))];
const idsMap = Object.keys(map).map(Number);
console.log('  consultaBahias : ' + bah.length + ' registros, ' + idsSrc.length + ' ids distintos');
console.log('  mapa           : ' + idsMap.length + ' claves');
const soloSrc = idsSrc.filter(x => !idsMap.includes(x));
const soloMap = idsMap.filter(x => !idsSrc.includes(x));
console.log('  EN LA FUENTE Y NO EN EL MAPA (caso del par mezclado): ' + (soloSrc.length || 'NINGUNA'));
soloSrc.forEach(i => console.log('      ' + i + '  "' + bah.find(b => Number(b.IDBahia) === i).NMBahia + '"'));
console.log('  EN EL MAPA Y NO EN LA FUENTE: ' + (soloMap.length || 'NINGUNA'));
soloMap.forEach(i => console.log('      ' + i + '  capitania="' + map[i].capitania + '"'));
console.log('  BAHIA_COORDS   : ' + Object.keys(COORDS).length + ' ids');
console.log('  en BAHIA_COORDS y NO en el mapa: ' +
  (Object.keys(COORDS).map(Number).filter(x => !idsMap.includes(x)).join(', ') || 'ninguna'));
console.log('  en el mapa y NO en BAHIA_COORDS: ' +
  (idsMap.filter(x => !Object.keys(COORDS).map(Number).includes(x)).join(', ') || 'ninguna'));

// ── A2 ───────────────────────────────────────────────────────────────────────
h('A2 — resolverBahiaIdPorNombre corrido sobre sus propios 163 nombres');
function resolver(nombre) {
  if (!nombre) return null;
  const skip = new Set(['caleta','bahia','puerto','ensenada','canal','punta','seno','rada','isla','lago','golfo']);
  const palabras = norm(nombre).split(/\s+/).filter(w => w.length > 3 && !skip.has(w));
  if (palabras.length === 0) return null;
  for (const [id, c] of Object.entries(COORDS)) {
    if (palabras.some(p => norm(c.nombre).includes(p))) return Number(id);
  }
  return null;
}
const nulos = [], otros = [];
for (const id of Object.keys(COORDS)) {
  const n = COORDS[id].nombre, r = resolver(n);
  if (r === null) nulos.push(id + ' "' + n + '"');
  else if (String(r) !== String(id)) otros.push(id + ' "' + n + '" -> ' + r + ' "' + COORDS[r].nombre + '"');
}
console.log('  total            : ' + Object.keys(COORDS).length);
console.log('  devuelve null    : ' + nulos.length);
nulos.forEach(x => console.log('      ' + x));
console.log('  devuelve OTRO id : ' + otros.length);
otros.forEach(x => console.log('      ' + x));
h('A2 bis — nombres de destino no portuario');
['Marina del Sur','Centro de cultivo 103421','Fondeadero Quicavi','Caladero 42S','-41.47, -72.94']
  .forEach(n => console.log('      ' + JSON.stringify(n) + ' -> ' + resolver(n)));

// ── B ────────────────────────────────────────────────────────────────────────
h('B — columnas del CSV y cobertura de las 15 franjas');
const rawCsv = fs.readFileSync(CSV, 'utf8').replace(/^﻿/, '');
const lineas = rawCsv.trim().split(/\r?\n/);
const parse = l => { const o = []; let c = '', q = false;
  for (const ch of l) { if (ch === '"') { q = !q; continue; } if (ch === ',' && !q) { o.push(c); c = ''; continue; } c += ch; }
  o.push(c); return o; };
const head = parse(lineas[0]);
const filas = lineas.slice(1).map(parse).map(r => Object.fromEntries(head.map((x, i) => [x, r[i]])));
console.log('  columnas: ' + head.join(' | '));
console.log('  filas de datos: ' + filas.length);
console.log('  columnas cuyo nombre contiene "tel": ' + head.filter(x => /tel/i.test(x)).join(', '));
console.log('  valores distintos de la columna Gobernacion:');
console.log('      ' + [...new Set(filas.map(r => r.Gobernacion))].join(' | '));
const FRANJAS = ['Arica','Iquique','Antofagasta','Caldera','Coquimbo','Valparaíso','San Antonio',
  'Talcahuano','Valdivia','Puerto Montt','Castro','Aysén','Punta Arenas','Puerto Williams','Hanga Roa'];
for (const f of FRANJAS) {
  const hit = filas.find(r => norm(r.Capitania) === norm(f));
  console.log('  ' + f.padEnd(17) + ' -> ' + (hit ? 'CdRep ' + hit.CdRep + '  tel="' + hit.Telefono + '"' : 'SIN FILA de Capitania con ese nombre'));
}

// ── C ────────────────────────────────────────────────────────────────────────
h('C — getCapitania(lat,lng) contra el campo gobernacion del mapa');
let ok = 0; const dif = [], sinRes = [];
for (const [id, c] of Object.entries(COORDS)) {
  const m = map[id]; if (!m) continue;
  const g = getCapitania(c.lat, c.lng);
  if (!g) { sinRes.push(id + ' "' + c.nombre + '" lat=' + c.lat + ' mapa="' + m.gobernacion + '"'); continue; }
  if (g.nombre === m.gobernacion) ok++;
  else dif.push('  ' + String(id).padEnd(4) + ' ' + String(c.nombre).slice(0, 34).padEnd(36) +
    ' lat=' + String(c.lat).padEnd(9) + ' franja="' + g.nombre + '" vs mapa="' + m.gobernacion + '"');
}
console.log('  coinciden      : ' + ok);
console.log('  DIFIEREN       : ' + dif.length);
console.log('  franja da null : ' + sinRes.length);
dif.forEach(x => console.log(x));
console.log('  --- las que la franja no resuelve ---');
sinRes.forEach(x => console.log('  ' + x));

h('C bis — poblacion expuesta a los 3 numeros, por las dos vias');
const porFranja = [], porMapa = [];
for (const [id, c] of Object.entries(COORDS)) {
  const m = map[id]; if (!m) continue;
  const g = getCapitania(c.lat, c.lng);
  if (g && MUERTOS.includes(g.telefono)) porFranja.push(id);
  if (GOBS_MUERTAS.includes(m.gobernacion)) porMapa.push(id);
}
const setF = new Set(porFranja), setM = new Set(porMapa);
console.log('  por gobernacion del MAPA  (el 41, sobre las 163 con coordenada): ' + porMapa.length);
console.log('  por getCapitania FRANJA   (la via real del fallback)          : ' + porFranja.length);
console.log('  en las dos                  : ' + porFranja.filter(x => setM.has(x)).length);
console.log('  solo por MAPA, no por franja: ' + (porMapa.filter(x => !setF.has(x)).join(', ') || 'ninguna'));
console.log('  solo por FRANJA, no por mapa: ' + (porFranja.filter(x => !setM.has(x)).join(', ') || 'ninguna'));
console.log('  257 en BAHIA_COORDS: ' + !!COORDS['257'] + '  | gobernacion en el mapa: ' + map['257'].gobernacion);
console.log('  getCapitania(-64.8167,-63.0) = ' + JSON.stringify(getCapitania(-64.8167, -63.0)));
