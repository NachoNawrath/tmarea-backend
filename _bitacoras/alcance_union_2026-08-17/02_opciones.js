// _bitacoras/alcance_union_2026-08-17/02_opciones.js
//
// Sesión ALCANCE-UNION, 2026-08-17. Fase 1, punto 0 del plan.
//
// QUÉ MIDE: el COSTO de las dos fuentes posibles de los alcances que D-C6 manda
// sumar, sobre los 20 múltiples y con la unión verdadera (la de la tabla de
// lectura) como referencia.
//
//   FUENTE A — la salida del parser, usando las dos ranuras que YA devuelve
//              (`umbral_ab_dentro` y `umbral_ab_fuera`) más `bloqueo_total`.
//              NO toca el motor: son campos que `normalizarRestriccion` ya
//              retorna y que el derivador hoy ignora a medias.
//   FUENTE B — el texto (`texto_original`), con léxico de extracción propio del
//              derivador. Acá se mide su TECHO, no una implementación: se usa la
//              unión de la tabla de lectura como si un lector perfecto la
//              hubiera extraído del texto.
//
// La comparación es: para cada uno de los 20, ¿la fuente reproduce la unión
// verdadera? Se cuenta acierto, sub-alcance (deja naves afuera, que es el
// defecto que D-C6 viene a cerrar) y sobre-alcance.
//
// NO escribe nada de src/. No abre insumos en escritura. sha256 al arranque y
// al cierre. Importa el derivador y el parser de src/, y la TABLA del
// instrumento versionado de alcance_multiple.
//
// exit 3 conteo que no cierra · exit 4 extracción fallida · exit 5 cero
// comparaciones · exit 6 insumo cambiado.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const SONDAJE = path.join(RAIZ, 'sondaje-sitport');
const SALIDA = path.join(__dirname, '02_opciones.txt');

const { derivarCierre } = require(path.join(RAIZ, 'src', 'services', 'cierre-derivador'));
const { normalizarRestriccion } = require(path.join(RAIZ, 'src', 'services', 'sitport-parser'));

const lineas = [];
const say = (s = '') => { lineas.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
let COMPARACIONES = 0, FALLAS = 0;
function morir(code, msg) {
  say(''); say('*** ABORTA — ' + msg);
  fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
  process.exit(code);
}
function cierra(rot, partes, total) {
  const s = partes.reduce((a, b) => a + b, 0);
  if (s !== total) FALLAS++;
  return `suma ${s} / ${total} — ${s === total ? 'CIERRA' : '*** NO CIERRA'}  (${rot})`;
}
const pad = (s, n) => String(s).padEnd(n);
const rp = (v, n) => String(v).padStart(n);

hr();
say('ALCANCE-UNION — FASE 1, PUNTO 0. DE DONDE SE LEEN LOS ALCANCES QUE SE SUMAN.');
say('Costo medido de las dos fuentes, contra la union verdadera de la tabla de lectura.');
hr();
say('');

const CAPTURAS = ['restricciones_2026-07-30_19-42.json', 'restricciones_2026-07-31_16-32.json',
  'restricciones_2026-07-31_20-32.json', 'restricciones_2026-07-31_21-01.json',
  'restricciones_2026-08-01_13-14.json', 'check_ahora.json'];
const shaDe = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const shaAntes = {};
for (const f of CAPTURAS) shaAntes[f] = shaDe(path.join(SONDAJE, f));

function extraerTabla(archivo, marca) {
  const t = fs.readFileSync(archivo, 'utf8');
  const i = t.indexOf('const ' + marca + ' = {');
  if (i < 0) morir(4, `no se pudo ubicar ${marca}`);
  let j = t.indexOf('{', i), prof = 0, fin = -1;
  for (let k = j; k < t.length; k++) {
    if (t[k] === '{') prof++; else if (t[k] === '}') { prof--; if (!prof) { fin = k; break; } }
  }
  if (fin < 0) morir(4, `no se pudo cerrar ${marca}`);
  return eval('(' + t.slice(j, fin + 1) + ')');   // eslint-disable-line no-eval
}
const TABLA = extraerTabla(path.join(RAIZ, '_bitacoras', 'alcance_multiple_2026-08-17', '01_medir_multiple.js'), 'TABLA');
COMPARACIONES++;

const filas = [];
for (const f of CAPTURAS) {
  const j = JSON.parse(fs.readFileSync(path.join(SONDAJE, f), 'utf8'));
  for (const r of j.recordsets[0]) filas.push({ captura: f, r });
}
if (filas.length !== 444) morir(3, `no son 444 filas sino ${filas.length}`);
const porId = new Map();
for (const x of filas) {
  const c = derivarCierre(x.r);
  COMPARACIONES++;
  if (c.estado !== 'cerrado') continue;
  const id = String(x.r.IDRestriccion);
  if (!porId.has(id)) porId.set(id, { c, filas: 0, r: x.r });
  porId.get(id).filas++;
}
if (porId.size !== 167) morir(3, `las cerradas no son 167 sino ${porId.size}`);
const multi = Object.entries(TABLA).filter(([, d]) => d.multi).map(([k]) => k);
if (multi.length !== 20) morir(3, `los multiples no son 20 sino ${multi.length}`);
const filasDe = (ids) => ids.reduce((a, k) => a + porId.get(k).filas, 0);

// ── la union verdadera, de la tabla de lectura ──────────────────────────────
function unir(a, b) {
  if (a == null) return b;
  if (a.k === 'todas' || b.k === 'todas') return { k: 'todas' };
  if (a.k === 'num' && b.k === 'num') return { k: 'num', v: Math.max(a.v, b.v) };
  if (a.k === b.k) return { k: a.k, v: a.v };
  return { k: 'SIN_VALOR', pares: [a.k, b.k].sort() };
}
const VERDAD = new Map();
for (const id of multi) {
  let u = null;
  for (const a of TABLA[id].alcances) { u = unir(u, a.den); COMPARACIONES++; }
  VERDAD.set(id, u);
}

// ── las dos fuentes ─────────────────────────────────────────────────────────
// FUENTE A: las dos ranuras del parser + bloqueo_total. Nada mas: es lo que el
// parser YA devuelve hoy, sin tocarlo.
function fuenteA(r) {
  const n = normalizarRestriccion(r);
  if (n.bloqueo_total === true) return { k: 'todas' };
  const vs = [n.umbral_ab_dentro, n.umbral_ab_fuera].filter((v) => v != null);
  if (vs.length === 0) return { k: 'NADA' };
  return { k: 'num', v: Math.max(...vs) };
}
// FUENTE B: el techo de leer del texto — la union verdadera misma.
const fuenteB = (id) => VERDAD.get(id);

const eq = (a, b) => a.k === b.k && (a.v == null ? b.v == null : a.v === b.v);
// ¿la fuente deja naves afuera respecto de la verdad? Solo se puede afirmar
// entre conjuntos comparables; si la verdad es SIN_VALOR, se marca aparte.
function veredicto(f, v) {
  if (v.k === 'SIN_VALOR') return 'verdad_sin_valor';
  if (f.k === 'NADA') return 'sub';
  if (eq(f, v)) return 'exacto';
  if (v.k === 'todas' && f.k !== 'todas') return 'sub';
  if (f.k === 'todas' && v.k !== 'todas') return 'sobre';
  if (f.k === 'num' && v.k === 'num') return f.v < v.v ? 'sub' : 'sobre';
  return 'no_comparable';
}

hr('-');
say('(1) LOS 20, UNO POR UNO — VERDAD, FUENTE A Y FUENTE B');
hr('-');
say('    verdad  = union de los alcances que la tabla de lectura declara');
say('    fuente A = max(umbral_ab_dentro, umbral_ab_fuera) del parser, o `todas`');
say('               si bloqueo_total. Campos que el parser YA devuelve.');
say('    fuente B = leer del texto. Se mide su TECHO: la verdad misma.');
say('');
say(`    ${pad('ID', 8)} ${pad('bahia', 26)} ${pad('emite hoy', 22)} ${pad('verdad', 12)} ${pad('fuente A', 12)} ${pad('veredicto A', 16)}`);
const V = { exacto: [], sub: [], sobre: [], verdad_sin_valor: [], no_comparable: [] };
for (const id of multi) {
  const o = porId.get(id);
  const v = VERDAD.get(id);
  const a = fuenteA(o.r);
  const ver = veredicto(a, v);
  COMPARACIONES++;
  V[ver].push(id);
  const s = (x) => x.k + (x.v != null ? ' ' + x.v : '');
  say(`    ${pad(id, 8)} ${pad(o.r.GLBahia, 26)} ${pad(o.c.alcance.tipo + (o.c.alcance.umbral != null ? ' ' + o.c.alcance.umbral : ''), 22)} ${pad(s(v), 12)} ${pad(s(a), 12)} ${pad(ver, 16)}`);
}
say('');
for (const k of Object.keys(V)) {
  say(`    fuente A · ${pad(k, 20)} ${rp(V[k].length, 3)} restricciones · ${rp(filasDe(V[k]), 3)} filas   ->  ${V[k].join(', ') || '—'}`);
}
say('    ' + cierra('fuente A / restricciones', Object.values(V).map((x) => x.length), multi.length));
say('    ' + cierra('fuente A / filas', Object.values(V).map((x) => filasDe(x)), filasDe(multi)));
say('');

// fuente B por construccion es exacta salvo SIN_VALOR
const B = { exacto: [], verdad_sin_valor: [] };
for (const id of multi) {
  const ver = veredicto(fuenteB(id), VERDAD.get(id));
  COMPARACIONES++;
  if (ver === 'verdad_sin_valor') B.verdad_sin_valor.push(id); else B.exacto.push(id);
}
say(`    fuente B · ${pad('exacto', 20)} ${rp(B.exacto.length, 3)} restricciones · ${rp(filasDe(B.exacto), 3)} filas`);
say(`    fuente B · ${pad('verdad_sin_valor', 20)} ${rp(B.verdad_sin_valor.length, 3)} restricciones · ${rp(filasDe(B.verdad_sin_valor), 3)} filas   ->  ${B.verdad_sin_valor.join(', ')}`);
say('    ' + cierra('fuente B / restricciones', [B.exacto.length, B.verdad_sin_valor.length], multi.length));
say('');
say('    LO QUE LA FUENTE B NO PRUEBA, y hay que decirlo (§1.2, §2): es un TECHO.');
say('    Mide "si un lector del texto leyera tan bien como leyo la sesion');
say('    ALCANCE-MULTIPLE, cuanto de los 20 quedaria exacto". NO prueba que una');
say('    implementacion concreta lo alcance: eso hay que medirlo con el lexico');
say('    escrito, y esta sesion todavia no lo escribio.');
say('');

hr('-');
say('(2) LOS 9 QUE HOY DEJAN NAVES AFUERA — CUANTOS ARREGLA CADA FUENTE');
hr('-');
function emitidoDe(c) {
  if (c.alcance.tipo === 'umbral') return { k: 'num', v: c.alcance.umbral };
  if (c.alcance.tipo === 'total') return { k: 'todas' };
  if (c.alcance.tipo === 'menores_sin_umbral') return { k: 'menores' };
  return { k: 'generico' };
}
function cubre(emi, den) {
  if (emi.k === 'generico' || emi.k === 'todas') return true;
  if (emi.k === 'num') return den.k === 'num' ? emi.v >= den.v : false;
  if (emi.k === 'menores') { if (den.k === 'menores') return true; if (den.k === 'mayores') return false; return null; }
  return null;
}
const NUEVE = multi.filter((id) => {
  const emi = emitidoDe(porId.get(id).c);
  COMPARACIONES++;
  return TABLA[id].alcances.some((a) => cubre(emi, a.den) === false);
});
if (NUEVE.length !== 9) morir(3, `los que dejan afuera no son 9 sino ${NUEVE.length}`);
if (filasDe(NUEVE) !== 22) morir(3, `no son 22 filas sino ${filasDe(NUEVE)}`);
say(`    los que dejan naves afuera: ${NUEVE.length} restricciones · ${filasDe(NUEVE)} filas — reproduce`);
say('');
say(`    ${pad('ID', 8)} ${pad('emite hoy', 20)} ${pad('fuente A da', 14)} ${pad('arregla A?', 12)} ${pad('fuente B da', 14)} ${pad('arregla B?', 12)}`);
const arrA = [], noArrA = [], arrB = [], noArrB = [];
for (const id of NUEVE) {
  const v = VERDAD.get(id), a = fuenteA(porId.get(id).r), b = fuenteB(id);
  const okA = veredicto(a, v) === 'exacto';
  const okB = veredicto(b, v) === 'exacto';
  COMPARACIONES += 2;
  (okA ? arrA : noArrA).push(id);
  (okB ? arrB : noArrB).push(id);
  const s = (x) => x.k + (x.v != null ? ' ' + x.v : '');
  const c = porId.get(id).c;
  say(`    ${pad(id, 8)} ${pad(c.alcance.tipo + (c.alcance.umbral != null ? ' ' + c.alcance.umbral : ''), 20)} ${pad(s(a), 14)} ${pad(okA ? 'SI' : 'no', 12)} ${pad(s(b), 14)} ${pad(okB ? 'SI' : 'no', 12)}`);
}
say('');
say(`    FUENTE A arregla ${arrA.length} de 9 (${filasDe(arrA)} de 22 filas). No arregla: ${noArrA.join(', ')}`);
say(`    FUENTE B arregla ${arrB.length} de 9 (${filasDe(arrB)} de 22 filas). No arregla: ${noArrB.join(', ')}`);
say('    ' + cierra('fuente A sobre los 9', [arrA.length, noArrA.length], 9));
say('    ' + cierra('fuente B sobre los 9', [arrB.length, noArrB.length], 9));
say('');

hr('-');
say('(3) EL RIESGO DE LA FUENTE A, MEDIDO Y NO ARGUMENTADO');
hr('-');
say('    Las dos ranuras del parser estan ROTULADAS por zona (dentro / fuera) y');
say('    ese rotulo puede ser falso: se compara el rotulo del parser contra la');
say('    zona que la tabla de lectura le asigna a ese mismo numero.');
say('');
let rotOk = 0, rotMal = 0;
const malRot = [];
for (const id of multi) {
  const n = normalizarRestriccion(porId.get(id).r);
  if (n.umbral_ab_dentro == null && n.umbral_ab_fuera == null) continue;
  for (const [ranura, val] of [['dentro', n.umbral_ab_dentro], ['fuera', n.umbral_ab_fuera]]) {
    if (val == null) continue;
    const decl = TABLA[id].alcances.filter((a) => a.den.k === 'num' && a.den.v === val);
    COMPARACIONES++;
    if (!decl.length) { rotMal++; malRot.push(`${id} ranura ${ranura}=${val} — ese numero NO es un alcance declarado`); continue; }
    const zonas = decl.map((a) => a.zona);
    const coincide = zonas.some((z) => z === ranura || z.startsWith(ranura + '-') || z.includes(ranura));
    if (coincide) rotOk++;
    else { rotMal++; malRot.push(`${id} ranura ${ranura}=${val} — la lectura lo ubica en "${zonas.join('/')}"`); }
  }
}
say(`    rotulos de ranura que COINCIDEN con la lectura : ${rotOk}`);
say(`    rotulos de ranura FALSOS                       : ${rotMal}`);
for (const m of malRot) say(`      ${m}`);
say('');
say('    POR QUE IMPORTA PARA D-C6 Y NO PARA HOY: la union no usa el rotulo —');
say('    suma los conjuntos sin preguntar de que zona vino cada uno. Un rotulo');
say('    falso no la ensucia. Lo que SI la ensucia es una ranura que perdio un');
say('    alcance, y eso es lo que mide (1).');
say('');

for (const f of CAPTURAS) if (shaDe(path.join(SONDAJE, f)) !== shaAntes[f]) morir(6, `sha256 de ${f} cambio`);
say(`    los ${CAPTURAS.length} sha256 de insumo identicos al arranque — OK`);
say(`    comparaciones efectivas : ${COMPARACIONES}`);
if (COMPARACIONES === 0) morir(5, 'cero comparaciones efectivas');
say(`    controles fallidos      : ${FALLAS}`);
hr();
say(FALLAS === 0 ? 'SIN FALLAS.' : `*** ${FALLAS} CONTROL(ES) FALLIDO(S).`);
hr();
fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
process.exit(FALLAS === 0 ? 0 : 3);
