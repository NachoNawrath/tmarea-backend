// _bitacoras/alcance_union_2026-08-17/01_denominador.js
//
// Sesión ALCANCE-UNION, 2026-08-17. Sobre 0e385858.
//
// QUÉ MIDE — Fase 1, antes de escribir una sola línea de src/:
//   (1) LOS DOS DENOMINADORES del frente, 213 y 254, con su definición operativa
//       y su criterio de unicidad. Son la precondición de todo lo demás.
//   (2) La partición vigente 217/5/94/19 (filas) y 112/5/36/14 (restricciones).
//       Si no reproduce, exit 3 y la sesión para.
//   (3) PUNTO 0 del plan — QUÉ RECIBE HOY EL DERIVADOR. Se vuelca la salida
//       CRUDA de `normalizarRestriccion` para 95155 y para un caso de cada
//       forma G1/G2/G3, y se cuenta sobre los 20 múltiples cuántos llegan al
//       derivador con DOS alcances distinguibles y cuántos con uno solo.
//   (4) PUNTO 3 — la unión con un componente que no se lee: cuántos son.
//   (5) PUNTO 4 — qué PARES de clases de alcance hay que saber sumar.
//
// QUÉ NO HACE: no modifica nada de src/, no propone la regla, no toca el motor,
// no sale a la API, no abre la PWA. No escribe ningún insumo.
//
// LO QUE SE IMPORTA EN VEZ DE REESCRIBIR (regla de instrumento):
//   · `derivarCierre` y `normalizarParaCriterio`  <- src/services/cierre-derivador
//   · `normalizarRestriccion`, `normalizarTexto`  <- src/services/sitport-parser
//   · CRITERIO del 254  <- EXTRAÍDO DEL TEXTO de
//     _bitacoras/ejes_cierre_2026-08-16/01_medir_ejes.js:134. No se transcribe:
//     esa transcripción ya se pagó dos veces (derivacion_cierre §1).
//   · TABLA de lectura de los 20 múltiples <- EXTRAÍDA DEL TEXTO de
//     _bitacoras/alcance_multiple_2026-08-17/01_medir_multiple.js. Es una tabla
//     declarada por lectura y versionada; copiarla la dejaría derivar.
//
// EL GUARD NO ES TAUTOLÓGICO: el universo son los seis .json de sondaje-sitport/,
// que este archivo no escribe ni deriva de sí mismo. sha256 al arranque y al cierre.
//
// SALIDAS DE ERROR:
//   exit 3  un conteo no cierra, o la partición / los denominadores no reproducen
//   exit 4  un criterio o una tabla no se pudo EXTRAER de su archivo versionado,
//           o un literal declarado no se encontró en el dato
//   exit 5  cero comparaciones efectivas
//   exit 6  un sha256 de insumo cambió entre el arranque y el cierre

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const SONDAJE = path.join(RAIZ, 'sondaje-sitport');
const SALIDA = path.join(__dirname, '01_denominador.txt');

const { derivarCierre, normalizarParaCriterio } =
  require(path.join(RAIZ, 'src', 'services', 'cierre-derivador'));
const { normalizarRestriccion, normalizarTexto } =
  require(path.join(RAIZ, 'src', 'services', 'sitport-parser'));

const lineas = [];
const say = (s = '') => { lineas.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
let COMPARACIONES = 0;
let FALLAS = 0;

function morir(code, msg) {
  say('');
  say('*** ABORTA — ' + msg);
  fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
  process.exit(code);
}
function cierra(rotulo, partes, total) {
  const s = partes.reduce((a, b) => a + b, 0);
  const ok = s === total;
  if (!ok) FALLAS++;
  return `suma ${s} / ${total} — ${ok ? 'CIERRA' : '*** NO CIERRA'}  (${rotulo})`;
}
const rp = (v, n) => String(v).padStart(n);
const pad = (s, n) => String(s).padEnd(n);

hr();
say('ALCANCE-UNION — FASE 1. Sesion 2026-08-17, sobre 0e385858.');
say('Los DOS denominadores, la particion vigente, y de donde salen los alcances.');
hr();
say('');

// ── (0) INSUMOS Y SHA256 AL ARRANQUE ────────────────────────────────────────
hr('-');
say('(0) INSUMOS — SHA256 AL ARRANQUE');
hr('-');
const CAPTURAS = [
  'restricciones_2026-07-30_19-42.json',
  'restricciones_2026-07-31_16-32.json',
  'restricciones_2026-07-31_20-32.json',
  'restricciones_2026-07-31_21-01.json',
  'restricciones_2026-08-01_13-14.json',
  'check_ahora.json',
];
const shaDe = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const shaAntes = {};
for (const f of CAPTURAS) {
  const p = path.join(SONDAJE, f);
  if (!fs.existsSync(p)) morir(4, `falta el insumo ${f}`);
  shaAntes[f] = shaDe(p);
  say(`    ${pad(f, 38)} ${shaAntes[f].slice(0, 32)}`);
}
say('');
say('    SEIS ficheros. CINCO se llaman restricciones_*.json y el sexto es');
say('    check_ahora.json. Se declara porque "seis capturas" se lee como seis');
say('    restricciones_*.json y en el directorio hay cinco.');
say('');

// ── (0b) EXTRACCION DE CRITERIOS VERSIONADOS ────────────────────────────────
hr('-');
say('(0b) CRITERIOS EXTRAIDOS DE SU ARCHIVO VERSIONADO — NO TRANSCRITOS');
hr('-');

function extraerLinea(archivo, marca) {
  const t = fs.readFileSync(archivo, 'utf8');
  const re = new RegExp('^const\\s+' + marca + '\\s*=\\s*(/.*/);\\s*$', 'm');
  const m = t.match(re);
  if (!m) morir(4, `no se pudo extraer ${marca} de ${path.basename(archivo)}`);
  return { fuente: m[1], re: eval(m[1]) };   // eslint-disable-line no-eval
}

const F_EJES = path.join(RAIZ, '_bitacoras', 'ejes_cierre_2026-08-16', '01_medir_ejes.js');
const CRIT = extraerLinea(F_EJES, 'CRITERIO');
say(`    CRITERIO (el del 254), extraido de ejes_cierre_2026-08-16/01_medir_ejes.js:`);
say(`        ${CRIT.fuente}`);
COMPARACIONES++;

// La TABLA de lectura de los 20, extraida por conteo de llaves desde su archivo.
function extraerTabla(archivo, marca) {
  const t = fs.readFileSync(archivo, 'utf8');
  const i = t.indexOf('const ' + marca + ' = {');
  if (i < 0) morir(4, `no se pudo ubicar ${marca} en ${path.basename(archivo)}`);
  let j = t.indexOf('{', i), prof = 0, fin = -1;
  for (let k = j; k < t.length; k++) {
    if (t[k] === '{') prof++;
    else if (t[k] === '}') { prof--; if (prof === 0) { fin = k; break; } }
  }
  if (fin < 0) morir(4, `no se pudo cerrar el literal de ${marca}`);
  const cuerpo = t.slice(j, fin + 1);
  return { fuente: cuerpo, obj: eval('(' + cuerpo + ')') };   // eslint-disable-line no-eval
}
const F_MULT = path.join(RAIZ, '_bitacoras', 'alcance_multiple_2026-08-17', '01_medir_multiple.js');
const TAB = extraerTabla(F_MULT, 'TABLA');
const TABLA = TAB.obj;
say(`    TABLA de lectura de los multiples, extraida de`);
say(`        alcance_multiple_2026-08-17/01_medir_multiple.js  —  ${Object.keys(TABLA).length} IDs, ${TAB.fuente.length} bytes`);
COMPARACIONES++;
say('');

// ── (1) LOS DOS DENOMINADORES ───────────────────────────────────────────────
hr('-');
say('(1) LOS DOS DENOMINADORES — 213 Y 254. QUE CUENTA CADA UNO.');
hr('-');
const filas = [];
for (const f of CAPTURAS) {
  const j = JSON.parse(fs.readFileSync(path.join(SONDAJE, f), 'utf8'));
  const rs = j.recordsets[0];
  if (rs.length !== j.rowsAffected[0]) morir(3, `rowsAffected no coincide en ${f}`);
  for (const r of rs) filas.push({ captura: f, r });
  say(`    ${pad(f, 38)} ${rp(rs.length, 3)} filas  (rowsAffected coincide)`);
}
say(`    ${pad('TOTAL', 38)} ${rp(filas.length, 3)} filas`);
if (filas.length !== 444) morir(3, `el material no son 444 filas sino ${filas.length}`);
say('');

// D-213
const idsTodos = new Set(filas.map((x) => String(x.r.IDRestriccion)));
say('  DENOMINADOR A — "213"');
say('    UNIDAD           : la RESTRICCION.');
say('    UNIVERSO         : las 444 filas del material, cerradas y no cerradas.');
say('    CRITERIO DE UNICIDAD : valor distinto de `IDRestriccion`, comparado como');
say('                       cadena. No interviene la captura: un mismo ID en seis');
say('                       capturas cuenta UNA vez.');
say(`    MEDIDO           : ${idsTodos.size} restricciones distintas sobre 444 filas`);
COMPARACIONES += filas.length;
if (idsTodos.size !== 213) morir(3, `las restricciones distintas no son 213 sino ${idsTodos.size}`);
say('    ESPERADO 213 — OK');
say('');

// D-254
const decl = filas.filter((x) => { COMPARACIONES++; return CRIT.re.test(normalizarTexto(x.r.Observacion)); });
const idsDecl = new Set(decl.map((x) => String(x.r.IDRestriccion)));
say('  DENOMINADOR B — "254"');
say('    UNIDAD           : la FILA (registro-captura), no la restriccion.');
say('    UNIVERSO         : las mismas 444 filas.');
say('    CRITERIO         : el literal de cierre, con la expresion IMPORTADA de');
say(`                       ejes_cierre/01_medir_ejes.js:  ${CRIT.fuente}`);
say('                       evaluada sobre `normalizarTexto(Observacion)`.');
say('    CRITERIO DE UNICIDAD : NINGUNO. No deduplica. Cada fila cuenta.');
say(`    MEDIDO           : ${decl.length} filas sobre 444`);
if (decl.length !== 254) morir(3, `la bolsa del literal no son 254 filas sino ${decl.length}`);
say('    ESPERADO 254 — OK');
say(`    Y SUS RESTRICCIONES DISTINTAS : ${idsDecl.size} sobre las 213 del material`);
say('');

say('  >>> POR QUE 254 NO CABE EN 213: NO SON LA MISMA UNIDAD.');
say(`      213 son RESTRICCIONES (IDs distintos) sobre las 444 filas.`);
say(`      254 son FILAS que traen el literal de cierre, sin deduplicar.`);
say(`      Esas 254 filas son ${idsDecl.size} restricciones distintas, y ${idsDecl.size} <= 213.`);
say(`      No hay contradiccion y ninguno de los dos viene de un resumen: los dos`);
say(`      reproducen exactos contra el material.`);
say('    ' + cierra('bolsa del literal / filas', [decl.length, 444 - decl.length], 444));
if (idsDecl.size > idsTodos.size) morir(3, 'las restricciones de la bolsa del literal exceden las del material');
say('');

// Control: las cuatro mediciones que citan 254 usan la FILA. Se reproducen dos.
say('  CONTROL — LAS MEDICIONES QUE CITAN 254 CUENTAN FILAS. SE REPRODUCEN DOS:');
const F_ACT = path.join(RAIZ, '_bitacoras', 'ejes_cierre_2026-08-16', '02_medir_actividades.js');
const CAUSA = extraerLinea(F_ACT, 'RE_CAUSA');
const n3 = (r) => normalizarParaCriterio(r.Observacion);
const conCausa = decl.filter((x) => { COMPARACIONES++; return CAUSA.re.test(n3(x.r)); });
say(`    249/254 (D-C1, estado y causa conviven)   medido: ${conCausa.length} / ${decl.length}`);
if (conCausa.length !== 249) FALLAS++;
const RE_ENT = /&(?:LT|GT|AMP|QUOT);/i;
const conEnt = decl.filter((x) => { COMPARACIONES++; return RE_ENT.test(String(x.r.NaveRecibe == null ? '' : x.r.NaveRecibe)); });
say(`    254/254 (entities HTML en NaveRecibe)     medido: ${conEnt.length} / ${decl.length}`);
if (conEnt.length !== 254) FALLAS++;
say('    Las dos cuentan FILAS. Confirma la unidad del denominador B.');
say('');

// ── (2) LA PARTICION VIGENTE ────────────────────────────────────────────────
hr('-');
say('(2) LA PARTICION VIGENTE — 217/5/94/19 EN FILAS · 112/5/36/14 EN RESTRICCIONES');
hr('-');
const der = filas.map((x) => ({ ...x, c: derivarCierre(x.r) }));
COMPARACIONES += der.length;
const cerrados = der.filter((x) => x.c.estado === 'cerrado');
if (cerrados.length !== 335) morir(3, `los cerrados no son 335 sino ${cerrados.length}`);
const T = { umbral: 0, total: 0, menores_sin_umbral: 0, no_legible: 0 };
for (const x of cerrados) T[x.c.alcance.tipo]++;
const ESP_F = { umbral: 217, total: 5, menores_sin_umbral: 94, no_legible: 19 };
for (const k of Object.keys(ESP_F)) {
  const ok = T[k] === ESP_F[k];
  say(`    ${pad(k, 22)} ${rp(T[k], 4)} filas   esperado ${rp(ESP_F[k], 4)}   ${ok ? 'OK' : '*** NO'}`);
  if (!ok) morir(3, `la particion en filas no reproduce en ${k}`);
}
say('    ' + cierra('alcance / filas', Object.values(T), 335));

const porId = new Map();
for (const x of cerrados) {
  const id = String(x.r.IDRestriccion);
  if (!porId.has(id)) porId.set(id, { tipo: x.c.alcance.tipo, umbral: x.c.alcance.umbral, filas: 0, r: x.r });
  const o = porId.get(id);
  o.filas++;
  if (o.tipo !== x.c.alcance.tipo) morir(3, `el ID ${id} deriva dos tipos distintos entre capturas`);
}
if (porId.size !== 167) morir(3, `las restricciones cerradas no son 167 sino ${porId.size}`);
const TR = { umbral: 0, total: 0, menores_sin_umbral: 0, no_legible: 0 };
for (const [, o] of porId) TR[o.tipo]++;
const ESP_R = { umbral: 112, total: 5, menores_sin_umbral: 36, no_legible: 14 };
say('');
for (const k of Object.keys(ESP_R)) {
  const ok = TR[k] === ESP_R[k];
  say(`    ${pad(k, 22)} ${rp(TR[k], 4)} restr.  esperado ${rp(ESP_R[k], 4)}   ${ok ? 'OK' : '*** NO'}`);
  if (!ok) morir(3, `la particion en restricciones no reproduce en ${k}`);
}
say('    ' + cierra('alcance / restricciones', Object.values(TR), 167));
say('');
say(`    CERRADOS: ${cerrados.length} filas / ${porId.size} restricciones.`);
say(`    Y el complemento: ${444 - cerrados.length} filas / ${idsTodos.size - porId.size} restricciones sin cierre declarado.`);
say('');

// ── (3) PUNTO 0 — QUE RECIBE HOY EL DERIVADOR ───────────────────────────────
hr('-');
say('(3) PUNTO 0 — DE DONDE PODRIAN SALIR LOS ALCANCES QUE SE SUMAN');
hr('-');
say('    Se vuelca la salida CRUDA de `normalizarRestriccion` (sitport-parser.js:119)');
say('    para 95155 y para un caso de cada forma. Es LO UNICO que el derivador ve');
say('    del parser: `derivarAlcance` lee `umbral_ab_fuera` y `bloqueo_total`.');
say('');
const multi = Object.entries(TABLA).filter(([, d]) => d.multi).map(([k]) => k);
const noMulti = Object.entries(TABLA).filter(([, d]) => !d.multi).map(([k]) => k);
const filasDeIds = (ids) => ids.reduce((a, k) => a + porId.get(k).filas, 0);
if (multi.length !== 20) morir(3, `la tabla no declara 20 multiples sino ${multi.length}`);
if (filasDeIds(multi) !== 36) morir(3, `los multiples no son 36 filas sino ${filasDeIds(multi)}`);
say(`    control: la tabla extraida declara ${multi.length} multiples · ${filasDeIds(multi)} filas — OK`);
say(`             y ${noMulti.length} candidatos descartados por lectura · ${filasDeIds(noMulti)} filas`);
say('');

const MUESTRA = ['95155', '95060', '95219', '95099'];
for (const id of MUESTRA) {
  if (!porId.has(id)) morir(4, `el ID de muestra ${id} no esta entre los cerrados`);
  const o = porId.get(id);
  const norm = normalizarRestriccion(o.r);
  const c = derivarCierre(o.r);
  COMPARACIONES++;
  say(`    ── ID ${id} · ${o.r.GLBahia} · forma ${TABLA[id] ? TABLA[id].forma : '—'} · ${o.filas} fila(s)`);
  say(`       declara por lectura : ` + TABLA[id].alcances.map((a) => `${a.den.k}${a.den.v != null ? ' ' + a.den.v : ''} [${a.zona}]`).join('  ·  '));
  say(`       parser devuelve     : umbral_ab_dentro=${JSON.stringify(norm.umbral_ab_dentro)}  umbral_ab_fuera=${JSON.stringify(norm.umbral_ab_fuera)}  bloqueo_total=${JSON.stringify(norm.bloqueo_total)}`);
  say(`                             area=${JSON.stringify(norm.area)}  afecta_menores=${norm.afecta_menores}  afecta_mayores=${norm.afecta_mayores}`);
  say(`       derivador emite     : tipo=${c.alcance.tipo} umbral=${JSON.stringify(c.alcance.umbral)} unidad=${JSON.stringify(c.alcance.unidad)} aviso_modo=${c.aviso_modo}`);
  say('');
}

say('  AGREGADO SOBRE LOS 20 MULTIPLES — CUANTOS ALCANCES LE LLEGAN AL DERIVADOR');
say('    "el parser expone DOS" = umbral_ab_dentro y umbral_ab_fuera son los dos');
say('    no-nulos Y distintos entre si. Es el unico caso en que el parser conserva');
say('    mas de un alcance; en cualquier otro devuelve una sola ranura util.');
say('');
const clas = { dos_distintos: [], dos_iguales: [], uno_solo: [], ninguno: [] };
for (const id of multi) {
  const norm = normalizarRestriccion(porId.get(id).r);
  COMPARACIONES++;
  const d = norm.umbral_ab_dentro, f = norm.umbral_ab_fuera;
  if (d != null && f != null && d !== f) clas.dos_distintos.push(id);
  else if (d != null && f != null) clas.dos_iguales.push(id);
  else if (d != null || f != null || norm.bloqueo_total === true) clas.uno_solo.push(id);
  else clas.ninguno.push(id);
}
for (const k of Object.keys(clas)) {
  say(`    ${pad(k, 16)} ${rp(clas[k].length, 3)} restricciones · ${rp(filasDeIds(clas[k]), 3)} filas   ->  ${clas[k].join(', ') || '—'}`);
}
say('    ' + cierra('parser expone / restricciones', Object.values(clas).map((v) => v.length), multi.length));
say('    ' + cierra('parser expone / filas', Object.values(clas).map((v) => filasDeIds(v)), filasDeIds(multi)));
say('');
say('  CUANTOS ALCANCES DECLARA EL TEXTO vs CUANTOS SOBREVIVEN AL PARSER:');
let declTot = 0, sobrevTot = 0;
for (const id of multi) {
  const norm = normalizarRestriccion(porId.get(id).r);
  const nDecl = new Set(TABLA[id].alcances.map((a) => a.den.k + ':' + (a.den.v != null ? a.den.v : ''))).size;
  const ranuras = new Set();
  if (norm.umbral_ab_dentro != null) ranuras.add('num:' + norm.umbral_ab_dentro);
  if (norm.umbral_ab_fuera != null) ranuras.add('num:' + norm.umbral_ab_fuera);
  if (norm.bloqueo_total === true) ranuras.add('todas:');
  declTot += nDecl; sobrevTot += ranuras.size;
  COMPARACIONES++;
}
say(`    alcances DISTINTOS declarados por los 20 textos   : ${declTot}`);
say(`    ranuras DISTINTAS que el parser conserva de ellos : ${sobrevTot}`);
say(`    perdidos dentro del parser                        : ${declTot - sobrevTot}`);
say('');

// ── (4) PUNTO 3 — UNION CON UN COMPONENTE QUE NO SE LEE ─────────────────────
hr('-');
say('(4) PUNTO 3 — CUANTOS DECLARAN UN ALCANCE LEGIBLE Y OTRO QUE NO SE LEE');
hr('-');
say('    CRITERIO: un registro esta en esa situacion si la tabla de lectura le');
say('    declara al menos DOS alcances y al menos UNO de ellos no se reduce a un');
say('    conjunto de naves acotable. Las clases que la tabla usa son:');
const clases = {};
for (const id of multi) for (const a of TABLA[id].alcances) clases[a.den.k] = (clases[a.den.k] || 0) + 1;
for (const k of Object.keys(clases).sort()) say(`      ${pad(k, 10)} ${rp(clases[k], 3)} apariciones entre los 20`);
say('');
const ACOTABLES = new Set(['num', 'todas', 'menores', 'mayores']);
const conIlegible = multi.filter((id) => {
  COMPARACIONES++;
  return TABLA[id].alcances.some((a) => !ACOTABLES.has(a.den.k));
});
say(`    >>> REGISTROS CON UN COMPONENTE NO ACOTABLE : ${conIlegible.length} restricciones · ${filasDeIds(conIlegible)} filas`);
say(`        sobre los 20 multiples · 36 filas.  ->  ${conIlegible.join(', ') || 'NINGUNO'}`);
say('');
say('    EL LIMITE DE ESTE CERO, declarado: la tabla es una LECTURA, y una lectura');
say('    solo anota lo que pudo resolver. Lo que este conteo afirma es que ninguno');
say('    de los 20 quedo con un alcance sin resolver, NO que no exista texto');
say('    ilegible en el material. El contraste que lo sostiene va abajo.');
say('');
say('  CONTRASTE — LOS CERRADOS QUE HOY SALEN no_legible, Y SI ADEMAS SON MULTIPLES:');
const nl = [...porId.entries()].filter(([, o]) => o.tipo === 'no_legible').map(([k]) => k);
say(`    no_legible : ${nl.length} restricciones · ${filasDeIds(nl)} filas`);
const nlMulti = nl.filter((id) => multi.includes(id));
say(`    de esos, la tabla los declara MULTIPLES : ${nlMulti.length} -> ${nlMulti.join(', ') || '—'}`);
say(`    de esos, la tabla NO los declara multiples : ${nl.length - nlMulti.length}`);
say('    ' + cierra('no_legible / restricciones', [nlMulti.length, nl.length - nlMulti.length], nl.length));
say('');

// ── (5) PUNTO 4 — QUE PARES HAY QUE SABER SUMAR ─────────────────────────────
hr('-');
say('(5) PUNTO 4 — LOS PARES DE CLASES QUE LA UNION TIENE QUE RESOLVER');
hr('-');
say('    Se enumera, sobre los 20, cada par NO ORDENADO de clases declaradas en un');
say('    mismo registro. Es lo que la suma tiene que saber hacer, medido y no supuesto.');
say('');
const pares = new Map();
for (const id of multi) {
  const ks = TABLA[id].alcances.map((a) => a.den.k);
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const p = [ks[i], ks[j]].sort().join(' + ');
      if (!pares.has(p)) pares.set(p, new Set());
      pares.get(p).add(id);
      COMPARACIONES++;
    }
  }
}
for (const [p, ids] of [...pares.entries()].sort()) {
  say(`    ${pad(p, 20)} ${rp(ids.size, 3)} restricciones · ${rp(filasDeIds([...ids]), 3)} filas   ->  ${[...ids].join(', ')}`);
}
say('');
say('    NOTA: `num + num` incluye 95155, que declara TRES numeros y por eso aporta');
say('    tres pares. El conteo de arriba es de PARES, no de registros, y por eso un');
say('    mismo ID puede aparecer en mas de una fila si declarara clases distintas.');
say('');

// ── (6) LA UNION APLICADA — CUANTOS CAMBIAN ─────────────────────────────────
hr('-');
say('(6) LA UNION DE D-C6 APLICADA A LOS 20 — CUANTOS CAMBIAN Y CUANTOS NO');
hr('-');
say('    RETICULA DECLARADA, y es lo unico que este instrumento asume:');
say('      num(N) u num(M) = num(max(N,M))     el mayor contiene al menor');
say('      X u todas       = todas             `todas` es el tope');
say('      menores u mayores = SIN VALOR EN EL VOCABULARIO ACTUAL  <- se marca');
say('      cualquier otro par no medido = SIN VALOR                <- se marca');
say('    El caso `menores u mayores` NO se resuelve aca: si esa union vale `total`');
say('    es una pregunta del vocabulario y va al owner (punto 2 del plan).');
say('');
function unir(a, b) {
  if (a == null) return b;
  if (a.k === 'todas' || b.k === 'todas') return { k: 'todas' };
  if (a.k === 'num' && b.k === 'num') return { k: 'num', v: Math.max(a.v, b.v) };
  if (a.k === b.k) return { k: a.k, v: a.v };
  return { k: 'SIN_VALOR', pares: [a.k, b.k] };
}
function emitidoDe(o) {
  if (o.tipo === 'umbral') return { k: 'num', v: o.umbral };
  if (o.tipo === 'total') return { k: 'todas' };
  if (o.tipo === 'menores_sin_umbral') return { k: 'menores' };
  return { k: 'generico' };
}
const CAMBIAN = [], IGUALES = [], SINVALOR = [];
for (const id of multi) {
  const o = porId.get(id);
  let u = null;
  for (const a of TABLA[id].alcances) { u = unir(u, a.den); COMPARACIONES++; }
  const emi = emitidoDe(o);
  const reg = { id, o, emi, u };
  if (u.k === 'SIN_VALOR') SINVALOR.push(reg);
  else if (emi.k === u.k && emi.v === u.v) IGUALES.push(reg);
  else CAMBIAN.push(reg);
}
say(`    CAMBIAN de valor emitido : ${CAMBIAN.length} restricciones · ${filasDeIds(CAMBIAN.map((x) => x.id))} filas`);
for (const x of CAMBIAN) {
  say(`      ID ${x.id} · ${pad(x.o.r.GLBahia, 32)} · ${pad(x.o.tipo + (x.emi.v != null ? ' ' + x.emi.v : ''), 22)} ->  ${x.u.k}${x.u.v != null ? ' ' + x.u.v : ''}   (${x.o.filas} fila/s)`);
}
say('');
say(`    NO cambian (la union ya es lo emitido) : ${IGUALES.length} restricciones · ${filasDeIds(IGUALES.map((x) => x.id))} filas`);
say(`      -> ${IGUALES.map((x) => x.id).join(', ') || '—'}`);
say('');
say(`    SIN VALOR EN EL VOCABULARIO : ${SINVALOR.length} restricciones · ${filasDeIds(SINVALOR.map((x) => x.id))} filas`);
for (const x of SINVALOR) {
  say(`      ID ${x.id} · ${pad(x.o.r.GLBahia, 32)} · hoy emite ${pad(x.o.tipo, 20)} · union de {${x.u.pares.join(', ')}}   (${x.o.filas} fila/s)`);
}
say('    ' + cierra('union / restricciones', [CAMBIAN.length, IGUALES.length, SINVALOR.length], multi.length));
say('    ' + cierra('union / filas', [filasDeIds(CAMBIAN.map((x) => x.id)), filasDeIds(IGUALES.map((x) => x.id)), filasDeIds(SINVALOR.map((x) => x.id))], filasDeIds(multi)));
say('');

say('  LOS 9 QUE HOY EMITEN EL MAS ANGOSTO — SE RECALCULAN, NO SE HEREDAN:');
function cubre(emi, den) {
  if (emi.k === 'generico' || emi.k === 'todas') return true;
  if (emi.k === 'num') return den.k === 'num' ? emi.v >= den.v : false;
  if (emi.k === 'menores') { if (den.k === 'menores') return true; if (den.k === 'mayores') return false; return null; }
  return null;
}
const DEJA = [];
for (const id of multi) {
  const emi = emitidoDe(porId.get(id));
  const falt = TABLA[id].alcances.filter((a) => { COMPARACIONES++; return cubre(emi, a.den) === false; });
  if (falt.length) DEJA.push({ id, falt });
}
say(`    DEJAN NAVES SIN AVISO : ${DEJA.length} restricciones · ${filasDeIds(DEJA.map((x) => x.id))} filas`);
say(`      -> ${DEJA.map((x) => x.id).join(', ')}`);
if (DEJA.length !== 9) FALLAS++;
if (filasDeIds(DEJA.map((x) => x.id)) !== 22) FALLAS++;
say(`    ESPERADO 9 restricciones · 22 filas   ${DEJA.length === 9 && filasDeIds(DEJA.map((x) => x.id)) === 22 ? 'OK' : '*** NO'}`);
say('');
const COLA = ['95219', '95220', '95099', '95100'];
say('    LOS 4 DE COLA ABIERTA, verificados uno por uno:');
for (const id of COLA) {
  const enDeja = DEJA.some((x) => x.id === id);
  COMPARACIONES++;
  if (!enDeja) FALLAS++;
  const u = CAMBIAN.concat(IGUALES, SINVALOR).find((x) => x.id === id);
  say(`      ID ${id} · ${pad(porId.get(id).r.GLBahia, 24)} · en la bolsa que deja afuera: ${enDeja ? 'SI' : '*** NO'} · union -> ${u.u.k}${u.u.v != null ? ' ' + u.u.v : ''}`);
}
say('');

// ── (7) CIERRE ──────────────────────────────────────────────────────────────
hr('-');
say('(7) CIERRE DEL INSTRUMENTO');
hr('-');
for (const f of CAPTURAS) {
  if (shaDe(path.join(SONDAJE, f)) !== shaAntes[f]) morir(6, `el sha256 de ${f} cambio durante la corrida`);
}
say(`    los ${CAPTURAS.length} sha256 de insumo son identicos al arranque — OK`);
say(`    comparaciones efectivas : ${COMPARACIONES}`);
if (COMPARACIONES === 0) morir(5, 'cero comparaciones efectivas');
say(`    controles fallidos      : ${FALLAS}`);
say('');
hr();
say(FALLAS === 0 ? 'SIN FALLAS.' : `*** ${FALLAS} CONTROL(ES) FALLIDO(S).`);
hr();
fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
process.exit(FALLAS === 0 ? 0 : 3);
