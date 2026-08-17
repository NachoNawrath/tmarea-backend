// _bitacoras/alcance_no_legible_2026-08-17/01_medir_alcance.js
//
// Sesión ALCANCE-NO-LEGIBLE-RECONOCIMIENTO, 2026-08-17.
//
// QUÉ MIDE: parte la bolsa `no_legible` de `alcance.tipo` en (a) el texto no
// dice el alcance y (b) el texto lo dice de una forma que el extractor no lee.
// Y mide, sobre los 444, cuánto alcance-en-palabras se está perdiendo FUERA de
// esa bolsa.
//
// QUÉ NO HACE: no modifica el derivador, no propone patrones de extracción, no
// recomienda regex. Mide y clasifica. Qué ve el patrón lo decide el owner (§0.4).
//
// EL DERIVADOR SE IMPORTA DE src/, NO SE COPIA. Lo que se mide es el código que
// corre en el backend. Misma regla que 01_verificar_derivacion.js del 16-08.
//
// EL GUARD NO ES TAUTOLÓGICO: el universo son los seis .json del sondaje, que
// este archivo no escribe ni deriva de sí mismo.
//
// SALIDAS DE ERROR:
//   exit 3  un conteo no cierra, o la partición 217/5/94/19 no se reproduce
//   exit 4  un literal declarado no se encontró en el dato (§ regla de instrumento:
//           si un literal no se encuentra es FALLA, no "no aplicable")
//   exit 5  cero comparaciones efectivas
//   exit 6  un sha256 de insumo cambió entre el arranque y el cierre
//
// SHELL: se corrió con `node` desde bash. Los comandos para el owner van en
// PowerShell al pie (§7.3).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const SONDAJE = path.join(RAIZ, 'sondaje-sitport');
const SALIDA = path.join(__dirname, '01_medir_alcance.txt');

// ── LO QUE SE IMPORTA EN VEZ DE REESCRIBIR ──────────────────────────────────
const { derivarCierre, normalizarParaCriterio } =
  require(path.join(RAIZ, 'src', 'services', 'cierre-derivador'));
const { normalizarTexto } = require(path.join(RAIZ, 'src', 'services', 'sitport-parser'));

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
say('ALCANCE NO LEGIBLE — RECONOCIMIENTO. Sesion 2026-08-17, sobre 8382a80.');
say('Parte la bolsa no_legible en (a) el dato falta y (b) el dato esta y lo perdemos.');
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
say('    Ningun insumo se abre en escritura. Se recomprueban al cierre.');
say('');

// ── (1) DENOMINADOR ─────────────────────────────────────────────────────────
hr('-');
say('(1) DENOMINADOR — 444 FILAS / N RESTRICCIONES');
hr('-');
const filas = [];
for (const f of CAPTURAS) {
  const j = JSON.parse(fs.readFileSync(path.join(SONDAJE, f), 'utf8'));
  const rs = j.recordsets[0];
  if (rs.length !== j.rowsAffected[0]) morir(3, `rowsAffected no coincide en ${f}`);
  for (const r of rs) filas.push({ captura: f, r });
  say(`    ${pad(f, 38)} ${rp(rs.length, 3)} registros  (rowsAffected coincide)`);
}
say(`    ${pad('TOTAL', 38)} ${rp(filas.length, 3)} filas`);
if (filas.length !== 444) morir(3, `el denominador no es 444 sino ${filas.length}`);
const idsTodos = new Set(filas.map((x) => String(x.r.IDRestriccion)));
say(`    ${pad('RESTRICCIONES DISTINTAS (IDRestriccion)', 38)} ${rp(idsTodos.size, 3)}`);
say('');
say('    "Fila" = captura x registro. Toda cifra de aca abajo dice cual de las dos es.');
say('');

// ── (2) REPRODUCIR LA PARTICION ANTES DE MEDIR NADA NUEVO ───────────────────
hr('-');
say('(2) CONTROL DE ARRANQUE — REPRODUCIR 217 / 5 / 94 / 19');
hr('-');
const der = filas.map((x) => ({ ...x, c: derivarCierre(x.r) }));
COMPARACIONES += der.length;
const cerrados = der.filter((x) => x.c.estado === 'cerrado');
const T = { umbral: 0, total: 0, menores_sin_umbral: 0, no_legible: 0 };
for (const x of cerrados) T[x.c.alcance.tipo]++;
const ESPERADO = { umbral: 217, total: 5, menores_sin_umbral: 94, no_legible: 19 };
say(`    cerrados (Opcion D) : ${cerrados.length} / 444   (esperado 335)`);
if (cerrados.length !== 335) morir(3, `los cerrados no son 335 sino ${cerrados.length}`);
for (const k of Object.keys(ESPERADO)) {
  const ok = T[k] === ESPERADO[k];
  if (!ok) FALLAS++;
  say(`    ${pad(k, 24)} ${rp(T[k], 4)}   esperado ${rp(ESPERADO[k], 4)}   ${ok ? 'OK' : '*** NO'}`);
  if (!ok) morir(3, `la particion no se reproduce en ${k}: ${T[k]} != ${ESPERADO[k]}`);
}
say('    ' + cierra('alcance', Object.values(T), 335));
say('');
say('    Reproducida. Recien aca se mide lo nuevo.');
say('');

// ── NORMALIZACION DECLARADA (INV-0.3) ───────────────────────────────────────
hr('-');
say('(3) QUE SE NORMALIZO PARA COMPARAR — DECLARADO');
hr('-');
say('    N3 = normalizarParaCriterio (cierre-derivador.js:55), importada verbatim.');
say('         entidades &LT; &GT; &AMP; &QUOT;  ->  el dato las trae sin decodificar');
say('         normalizarTexto (parser:8): doble-encoding CP1252, NFD sin acentos, MAYUS');
say('         + toda puntuacion a espacio + \\s+ colapsado');
say('    Eso desarma, medido en este material: las comillas escapadas (ID 95185 y los');
say('    \\" de 95201/95202/95327), el doble espacio de 94985, los \\r\\n de 95346, el');
say('    N°232 de Quintero, los puntos de "EE.MM." -> "EE MM", y la barra de "A/B.".');
say('    LO QUE NO ARREGLA, y se declara: "CONDICIONDE" pegado (ID 95171), "BARAR"');
say('    por BARRA (95220), "TODA TIPO EMBARCACIONES" sin concordancia (95219/95220).');
say('    No se aplica caza por aproximacion en ninguna parte de este archivo.');
say('');
const n3De = (r) => normalizarParaCriterio(r.Observacion);

// ── (4) LOS NO_LEGIBLE, CITADOS ─────────────────────────────────────────────
hr('-');
say('(4) PUNTO 1 — LOS no_legible, LITERALES');
hr('-');
const nl = cerrados.filter((x) => x.c.alcance.tipo === 'no_legible');
const porId = new Map();
for (const x of nl) {
  const k = String(x.r.IDRestriccion);
  if (!porId.has(k)) porId.set(k, { r: x.r, caps: [] });
  porId.get(k).caps.push(x.captura);
}
say(`    FILAS no_legible          : ${nl.length}`);
say(`    RESTRICCIONES distintas   : ${porId.size}`);
say('    Son DOS cifras distintas y las dos van: 19 filas son 14 restricciones.');
say('');
for (const [id, o] of porId) {
  say(`  ID ${id} · ${o.r.GLBahia} · ${o.caps.length} fila(s)`);
  for (const c of o.caps) say(`      captura: ${c}`);
  say('      Observacion (sin normalizar, JSON-escapada para que se vea todo):');
  say('      ' + JSON.stringify(o.r.Observacion));
  say('');
}

// ── (5) PARTICION (a) / (b) ─────────────────────────────────────────────────
hr('-');
say('(5) PUNTO 2 — PARTICION EN (a) Y (b)');
hr('-');
say('    CRITERIO DECLARADO, aplicado por LECTURA de los 14 textos (no hay regex de');
say('    por medio: la sesion no propone patrones):');
say('');
say('    (b)  el texto contiene al menos una expresion que DELIMITA a quien o a que');
say('         territorio alcanza el cierre, y esa expresion NO es un numero de');
say('         tonelaje NI ninguna de las tres ramas del parser (:69, :92, :95).');
say('    (a)  el texto no contiene ninguna. El cierre se declara y no se acota.');
say('');
say('    Cada asignacion a (b) va con la expresion literal que la sostiene. El');
say('    instrumento CONTROLA que ese literal exista en el N3 del registro: si no');
say('    esta, es exit 4. No hay asignacion sin evidencia en el dato.');
say('');
// TABLA DECLARADA — id -> { bolsa, literal (en N3), eje }
// eje: NAVES = acota el universo de naves · TERRITORIO = acota el territorio
const TABLA = {
  '94978': { bolsa: 'a', literal: null, eje: null },
  '95327': { bolsa: 'a', literal: null, eje: null },
  '95328': { bolsa: 'a', literal: null, eje: null },
  '95329': { bolsa: 'a', literal: null, eje: null },
  '95330': { bolsa: 'a', literal: null, eje: null },
  '95331': { bolsa: 'a', literal: null, eje: null },
  '95332': { bolsa: 'a', literal: null, eje: null },
  '94985': { bolsa: 'b', literal: 'EMBARCACIONES MAYORES Y MENORES DENTRO Y FUERA DE LA BAHIA', eje: 'NAVES+TERRITORIO' },
  '95169': { bolsa: 'b', literal: 'CERRADO PARA EE MM', eje: 'NAVES' },
  '95171': { bolsa: 'b', literal: 'TODA LA JURISDICCION DE JUAN FERNANDEZ', eje: 'TERRITORIO' },
  '95186': { bolsa: 'b', literal: 'EN LA JURISDICCION DE PUERTO DE LIRQUEN', eje: 'TERRITORIO' },
  '95201': { bolsa: 'b', literal: 'PARA NAVES Y EMBARCACIONES DENTRO Y FUERA DE LA BAHIA DE SAN VICENTE', eje: 'NAVES+TERRITORIO' },
  '95202': { bolsa: 'b', literal: 'PARA NAVES Y EMBARCACIONES DENTRO Y FUERA DE LA BAHIA DE SAN VICENTE', eje: 'NAVES+TERRITORIO' },
  '95346': { bolsa: 'b', literal: 'PARA NAVES QUE NO CUENTEN CON RADAR DENTRO Y FUERA DE LOS LIMITES DEL PUERTO', eje: 'NAVES+TERRITORIO' },
};
// Control 1: la tabla cubre exactamente los IDs medidos, sin sobrantes.
const idsTabla = new Set(Object.keys(TABLA));
const idsMedidos = new Set(porId.keys());
for (const k of idsMedidos) if (!idsTabla.has(k)) morir(4, `ID ${k} medido como no_legible y ausente de la tabla declarada`);
for (const k of idsTabla) if (!idsMedidos.has(k)) morir(4, `ID ${k} declarado en la tabla y NO medido como no_legible`);
say(`    control: la tabla declarada cubre los ${idsTabla.size} IDs medidos, sin sobrantes — OK`);
// Control 2: todo literal de (b) existe en el N3 de su registro.
let litOk = 0;
for (const [id, d] of Object.entries(TABLA)) {
  if (d.bolsa !== 'b') continue;
  const t = n3De(porId.get(id).r);
  COMPARACIONES++;
  if (!t.includes(d.literal)) morir(4, `literal declarado NO encontrado en ID ${id}: "${d.literal}"`);
  litOk++;
}
say(`    control: ${litOk} literales de (b) encontrados en el N3 de su registro — OK`);
// Control 3: bolsas disjuntas y suman.
const bolsaA = Object.entries(TABLA).filter(([, d]) => d.bolsa === 'a').map(([k]) => k);
const bolsaB = Object.entries(TABLA).filter(([, d]) => d.bolsa === 'b').map(([k]) => k);
const solape = bolsaA.filter((k) => bolsaB.includes(k));
if (solape.length) morir(3, `las bolsas se solapan en ${solape.join(',')}`);
const filasDe = (ids) => ids.reduce((a, k) => a + porId.get(k).caps.length, 0);
say(`    control: solape entre bolsas = ${solape.length} — OK (disjuntas)`);
say('');
say(`    (a) el texto NO dice el alcance : ${bolsaA.length} restricciones · ${filasDe(bolsaA)} filas`);
say(`    (b) lo dice y no se lee        : ${bolsaB.length} restricciones · ${filasDe(bolsaB)} filas`);
say('    ' + cierra('bolsas / restricciones', [bolsaA.length, bolsaB.length], porId.size));
say('    ' + cierra('bolsas / filas', [filasDe(bolsaA), filasDe(bolsaB)], nl.length));
say('    tercera bolsa: NO hizo falta. Los 14 caen claros con el criterio de arriba.');
say('');
say('  (a) — EL DATO FALTA EN EL ORIGEN. El generico es la respuesta correcta.');
for (const id of bolsaA) {
  say(`      ID ${id} · ${porId.get(id).r.GLBahia} · ${porId.get(id).caps.length} fila(s)`);
}
say('');
say('  (b) — EL DATO ESTA Y LO PERDEMOS NOSOTROS.');
for (const id of bolsaB) {
  const d = TABLA[id];
  say(`      ID ${id} · ${porId.get(id).r.GLBahia} · ${porId.get(id).caps.length} fila(s) · eje ${d.eje}`);
  say(`          "${d.literal}"`);
}
say('');

// ── (6) LAS FORMAS DE (b) ───────────────────────────────────────────────────
hr('-');
say('(6) PUNTO 3 — LAS FORMAS DE (b), AGRUPADAS. Sin proponer como leerlas.');
hr('-');
// Agrupacion por FORMA declarada, con su(s) ID(s). La forma es la estructura del
// sintagma, no un patron de extraccion.
const FORMAS = [
  { f: 'F1 · cuantificador universal + sustantivo territorial',
    ej: '"TODA LA JURISDICCION DE JUAN FERNANDEZ"', ids: ['95171'] },
  { f: 'F2 · sustantivo territorial SIN cuantificador, gobernado por preposicion',
    ej: '"EN LA JURISDICCION DE PUERTO DE LIRQUEN"', ids: ['95186'] },
  { f: 'F3 · par DENTRO Y FUERA + sustantivo territorial nombrado',
    ej: '"DENTRO Y FUERA DE LA BAHIA" / "DENTRO Y FUERA DE LA BAHIA DE SAN VICENTE" / "DENTRO Y FUERA DE LOS LIMITES DEL PUERTO"',
    ids: ['94985', '95201', '95202', '95346'] },
  { f: 'F4 · universo de naves enumerado por CLASE, sin numero',
    ej: '"EMBARCACIONES MAYORES Y MENORES" / "NAVES Y EMBARCACIONES"', ids: ['94985', '95201', '95202'] },
  { f: 'F5 · universo de naves por ABREVIATURA, sin numero',
    ej: '"EE MM"  (en el crudo: "EE.MM.")', ids: ['95169'] },
  { f: 'F6 · universo de naves por EQUIPAMIENTO, no por tamano',
    ej: '"NAVES QUE NO CUENTEN CON RADAR"', ids: ['95346'] },
];
say('    SON SEIS FORMAS, no dos ni quince. Un mismo registro puede traer mas de una:');
say('    los conteos por forma NO son una particion y no suman 7.');
say('');
for (const F of FORMAS) {
  say(`    ${F.f}`);
  say(`        ${F.ej}`);
  say(`        restricciones: ${F.ids.length}  ->  ${F.ids.join(', ')}`);
  say('');
}
// Control: toda forma cita IDs que estan en (b)
for (const F of FORMAS) {
  for (const id of F.ids) {
    COMPARACIONES++;
    if (!bolsaB.includes(id)) morir(4, `la forma ${F.f} cita ID ${id} que no esta en (b)`);
  }
}
say(`    control: los ${FORMAS.length} grupos citan solo IDs de (b) — OK`);
const cubiertos = new Set(FORMAS.flatMap((F) => F.ids));
for (const id of bolsaB) {
  if (!cubiertos.has(id)) morir(4, `el ID ${id} esta en (b) y ninguna forma lo cubre`);
}
say(`    control: las formas cubren los ${bolsaB.length} IDs de (b), sin huerfanos — OK`);
say('');

// ── (7) EL ALCANCE-EN-PALABRAS SOBRE LOS 444 ────────────────────────────────
hr('-');
say('(7) PUNTO 4 — ALCANCE DECLARADO CON PALABRAS, SOBRE LOS 444');
hr('-');
say('    RED DE OBSERVACION, no regla de extraccion. Se declara como se armo:');
say('    el vocabulario salio del dato en dos barridos previos sobre las 444 filas —');
say('    (i) todo n-grama que arranca en cuantificador universal (17 formas distintas)');
say('    (ii) todo sustantivo que sigue a preposicion+articulo (21 distintos; los mas');
say('         frecuentes: BAHIA 257, JURISDICCION 46, LIMITES 10, CALETA(S) 11,');
say('         BARRA 14, LAGO 4, BAHIAS 4).');
say('    De ahi se fijaron las familias de abajo. La red es DELIBERADAMENTE ancha:');
say('    su falso positivo se cuenta, no se esconde.');
say('');
const FAMILIAS = [
  { k: 'W1 TERRITORIO · jurisdiccion', re: /\bJURISDICCION\b/ },
  { k: 'W2 TERRITORIO · bahia/bahias nombrada', re: /\b(?:DENTRO|FUERA|EN)\s+(?:Y\s+FUERA\s+)?(?:DE\s+)?(?:LA|LAS)\s+BAHIAS?\b/ },
  { k: 'W3 TERRITORIO · limites del puerto', re: /\bLIMITES\s+DEL?\s+PUERTO\b/ },
  { k: 'W4 TERRITORIO · caletas / lagos / barra / sector', re: /\b(?:CALETAS?|LAGOS?|BARRA|BARAR|SECTOR)\b/ },
  { k: 'W5 CUANTIFICADOR · toda/todo/todos/todas', re: /\bTODAS?\b|\bTODOS?\b/ },
  { k: 'W6 CUANTIFICADOR · totalidad', re: /\bTOTALIDAD\b/ },
  { k: 'W7 NAVES · clases enumeradas sin numero', re: /\bMAYORES\s+Y\s+(?:NAVES\s+|EMBARCACIONES\s+)?MENORES\b|\bNAVES\s+Y\s+EMBARCACIONES\b/ },
  { k: 'W8 NAVES · abreviatura EE MM', re: /\bEE\s*MM\b/ },
  { k: 'W9 NAVES · por equipamiento', re: /\bQUE\s+NO\s+CUENTEN\s+CON\s+RADAR\b/ },
];
const marca = new Map(); // idRestriccion -> Set(familias)
for (const x of der) {
  const t = n3De(x.r);
  if (!t) continue;
  const id = String(x.r.IDRestriccion);
  for (const F of FAMILIAS) {
    COMPARACIONES++;
    if (F.re.test(t)) {
      if (!marca.has(id)) marca.set(id, new Set());
      marca.get(id).add(F.k);
    }
  }
}
say('    VOCABULARIO EMERGIDO — familias, con su conteo en RESTRICCIONES distintas');
say('    (un registro puede caer en varias; no es una particion):');
say('');
for (const F of FAMILIAS) {
  let n = 0;
  for (const [, s] of marca) if (s.has(F.k)) n++;
  say(`      ${pad(F.k, 46)} ${rp(n, 4)} restricciones`);
}
say('');
// Cruce con la clasificacion actual — sobre CERRADOS, que es donde alcance.tipo existe
const porIdCerrado = new Map();
for (const x of cerrados) {
  const id = String(x.r.IDRestriccion);
  if (!porIdCerrado.has(id)) porIdCerrado.set(id, { tipo: x.c.alcance.tipo, filas: 0, r: x.r });
  porIdCerrado.get(id).filas++;
}
say(`    DENOMINADOR DECLARADO para el cruce: los cerrados. ${cerrados.length} filas /`);
say(`    ${porIdCerrado.size} restricciones. Solo ahi existe alcance.tipo.`);
say('');
const cruce = { umbral: 0, total: 0, menores_sin_umbral: 0, no_legible: 0 };
const cruceFilas = { umbral: 0, total: 0, menores_sin_umbral: 0, no_legible: 0 };
let conPalabras = 0, conPalabrasFilas = 0;
for (const [id, o] of porIdCerrado) {
  if (!marca.has(id)) continue;
  conPalabras++; conPalabrasFilas += o.filas;
  cruce[o.tipo]++; cruceFilas[o.tipo] += o.filas;
}
say(`    CERRADOS QUE DECLARAN ALCANCE CON PALABRAS : ${conPalabras} restricciones · ${conPalabrasFilas} filas`);
say('');
say('      por clasificacion actual:');
for (const k of ['umbral', 'total', 'menores_sin_umbral', 'no_legible']) {
  say(`        ${pad(k, 22)} ${rp(cruce[k], 4)} restricciones · ${rp(cruceFilas[k], 4)} filas`);
}
say('    ' + cierra('cruce / restricciones', Object.values(cruce), conPalabras));
say('    ' + cierra('cruce / filas', Object.values(cruceFilas), conPalabrasFilas));
const fueraDeNoLegible = conPalabras - cruce.no_legible;
const fueraDeNoLegibleFilas = conPalabrasFilas - cruceFilas.no_legible;
say('');
say(`    >>> LO QUE PIDE EL PUNTO 4: declaran alcance con palabras y NO son no_legible`);
say(`        ${fueraDeNoLegible} restricciones · ${fueraDeNoLegibleFilas} filas.`);
say(`        Se clasifican bien por otro lado y su alcance en palabras se pierde igual.`);
say('');

// ── (8) CONTRADICCION AFIRMATIVA ────────────────────────────────────────────
hr('-');
say('(8) PUNTO 5 — ALGUNA FORMA DE (b) CONTRADICE UNA CLASIFICACION VIGENTE?');
hr('-');
say('    CRITERIO DECLARADO. Contradiccion = el alcance.tipo asignado afirma un');
say('    universo de naves MAS ANGOSTO que el que el texto declara literalmente.');
say('    El alcance TERRITORIAL solo NO cuenta como contradiccion: es otro eje, y su');
say('    perdida ya la mide (7). Lo que cuenta es afirmar de menos sobre QUE NAVES.');
say('');
say('    Se prueban las dos formas de (b) que hablan del universo de naves:');
say('      C1  tipo=menores_sin_umbral y el texto nombra tambien a las MAYORES');
say('      C2  tipo=umbral N y el texto abre una zona sin tope de tonelaje');
say('');
const C1 = [], C2 = [];
for (const [id, o] of porIdCerrado) {
  const t = n3De(o.r);
  COMPARACIONES += 2;
  if (o.tipo === 'menores_sin_umbral' && /\bMAYORES\b/.test(t)) C1.push({ id, o, t });
  if (o.tipo === 'umbral' && /\bTODA\s+TIPO\s+EMBARCACIONES\b|\bTODO\s+TIPO\s+DE\s+EMBARCACIONES\b/.test(t)) C2.push({ id, o, t });
}
say(`  C1 — menores_sin_umbral con MAYORES en el texto : ${C1.length} restricciones`);
for (const x of C1) {
  say(`      ID ${x.id} · ${x.o.r.GLBahia} · ${x.o.filas} fila(s) · rama parser:92`);
  say('      ' + JSON.stringify(x.o.r.Observacion));
  say('');
}
say(`  C2 — umbral N con "TODO/TODA TIPO EMBARCACIONES" en otra zona : ${C2.length} restricciones`);
for (const x of C2) {
  say(`      ID ${x.id} · ${x.o.r.GLBahia} · ${x.o.filas} fila(s) · umbral asignado ${derivarCierre(x.o.r).alcance.umbral}`);
  say('      ' + JSON.stringify(x.o.r.Observacion));
  say('');
}
say(`    TOTAL contradicciones afirmativas: ${C1.length + C2.length} restricciones · ` +
    `${[...C1, ...C2].reduce((a, x) => a + x.o.filas, 0)} filas.`);
say('');
// El contraste que la hace medida y no anecdotica
say('    EL CONTRASTE QUE LA VUELVE MEDIDA — el mismo contenido en dos bolsas:');
const parAB = ['94985', '95099'];
for (const id of parAB) {
  const o = porIdCerrado.get(id);
  COMPARACIONES++;
  if (!o) morir(4, `el ID ${id} del contraste no esta entre los cerrados`);
  say(`      ID ${id} -> alcance.tipo = ${pad(o.tipo, 20)} rama = ${derivarCierre(o.r).alcance.rama_parser}`);
}
say('      Los dos dicen "mayores y menores". Uno cae en no_legible y el otro en');
say('      menores_sin_umbral. Lo unico que los separa es si el sustantivo se repite:');
say('      "NAVES MAYORES Y NAVES MENORES" contiene "NAVES MENORES" contiguo y');
say('      "EMBARCACIONES MAYORES Y MENORES" no contiene "EMBARCACIONES MENORES".');
say('      La rama parser:92 (/EMBARCACIONES\\s+MENORES|NAVES\\s+MENORES/) es literal.');
say('');

// ── (9) CIERRE — SHA256 Y COMPARACIONES ─────────────────────────────────────
hr('-');
say('(9) CIERRE DEL INSTRUMENTO');
hr('-');
for (const f of CAPTURAS) {
  const ahora = shaDe(path.join(SONDAJE, f));
  if (ahora !== shaAntes[f]) morir(6, `el sha256 de ${f} cambio durante la corrida`);
}
say(`    los ${CAPTURAS.length} sha256 de insumo son identicos al arranque — OK`);
say(`    comparaciones efectivas : ${COMPARACIONES}`);
if (COMPARACIONES === 0) morir(5, 'cero comparaciones efectivas — el instrumento no midio nada');
say(`    controles fallidos      : ${FALLAS}`);
say('');
hr();
say(FALLAS === 0 ? 'SIN FALLAS.' : `*** ${FALLAS} CONTROL(ES) FALLIDO(S).`);
hr();
fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
process.exit(FALLAS === 0 ? 0 : 3);
