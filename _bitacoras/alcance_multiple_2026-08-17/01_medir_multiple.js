// _bitacoras/alcance_multiple_2026-08-17/01_medir_multiple.js
//
// Sesión ALCANCE-MÚLTIPLE-RECONOCIMIENTO, 2026-08-17. Sobre 8382a806.
//
// QUÉ MIDE: cuántos registros CERRADOS declaran en su texto MÁS DE UN ALCANCE
// (más de un universo de naves alcanzado por el cierre) y el extractor emite uno
// solo; de ésos, cuántos emiten el MÁS ANGOSTO —los que dejan naves sin aviso—;
// a qué rango de tonelaje dejan afuera; y el costo medido de los dos caminos que
// el owner tiene sobre la mesa.
//
// QUÉ NO HACE: no modifica `cierre-derivador.js`, no propone la regla de arreglo,
// no recomienda camino, no decide qué ve el patrón (§0.4). No sale a la API.
//
// EL DERIVADOR SE IMPORTA DE src/, NO SE COPIA (regla de instrumento: no
// reescribir un criterio que ya tiene implementación versionada). La partición
// 217/5/94/19 se reproduce ANTES de medir nada nuevo; si no reproduce, exit 3.
//
// EL GUARD NO ES TAUTOLÓGICO: el universo son los seis .json de sondaje-sitport/,
// que este archivo no escribe ni deriva de sí mismo. sha256 al arranque y al cierre.
//
// SALIDAS DE ERROR:
//   exit 3  un conteo no cierra, o la partición / los denominadores no reproducen
//   exit 4  un literal declarado no se encontró en el dato, o la tabla declarada
//           no cubre exactamente los candidatos de la red (huérfano o sobrante)
//   exit 5  cero comparaciones efectivas
//   exit 6  un sha256 de insumo cambió entre el arranque y el cierre
//
// SHELL: se corrió con `node` desde bash. Los comandos del owner van en
// PowerShell al pie de la bitácora (§7.3).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const SONDAJE = path.join(RAIZ, 'sondaje-sitport');
const SALIDA = path.join(__dirname, '01_medir_multiple.txt');

// ── LO QUE SE IMPORTA EN VEZ DE REESCRIBIR ──────────────────────────────────
const { derivarCierre, normalizarParaCriterio } =
  require(path.join(RAIZ, 'src', 'services', 'cierre-derivador'));

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
say('ALCANCE MULTIPLE — RECONOCIMIENTO. Sesion 2026-08-17, sobre 8382a806.');
say('Cuantos registros declaran mas de un alcance y el extractor se queda con uno.');
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
say('(1) DENOMINADOR — LAS DOS CIFRAS, FILAS Y RESTRICCIONES');
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
if (idsTodos.size !== 213) morir(3, `las restricciones del material no son 213 sino ${idsTodos.size}`);
say('');

// ── (2) CONTROL DE ARRANQUE — REPRODUCIR LA PARTICION ───────────────────────
hr('-');
say('(2) CONTROL DE ARRANQUE — REPRODUCIR 217 / 5 / 94 / 19 ANTES DE MEDIR NADA');
hr('-');
const der = filas.map((x) => ({ ...x, c: derivarCierre(x.r) }));
COMPARACIONES += der.length;
const cerrados = der.filter((x) => x.c.estado === 'cerrado');
if (cerrados.length !== 335) morir(3, `los cerrados no son 335 sino ${cerrados.length}`);
const T = { umbral: 0, total: 0, menores_sin_umbral: 0, no_legible: 0 };
for (const x of cerrados) T[x.c.alcance.tipo]++;
const ESPERADO = { umbral: 217, total: 5, menores_sin_umbral: 94, no_legible: 19 };
for (const k of Object.keys(ESPERADO)) {
  const ok = T[k] === ESPERADO[k];
  say(`    ${pad(k, 24)} ${rp(T[k], 4)} filas   esperado ${rp(ESPERADO[k], 4)}   ${ok ? 'OK' : '*** NO'}`);
  if (!ok) morir(3, `la particion en filas no se reproduce en ${k}: ${T[k]} != ${ESPERADO[k]}`);
}
say('    ' + cierra('alcance / filas', Object.values(T), 335));

// La misma particion en RESTRICCIONES. La sesion anterior no la publico y las dos
// cifras dicen cosas distintas: se mide aca y se declara.
const porId = new Map();
for (const x of cerrados) {
  const id = String(x.r.IDRestriccion);
  if (!porId.has(id)) porId.set(id, { tipo: x.c.alcance.tipo, umbral: x.c.alcance.umbral, rama: x.c.alcance.rama_parser, filas: 0, r: x.r, caps: [] });
  const o = porId.get(id);
  o.filas++; o.caps.push(x.captura);
  if (o.tipo !== x.c.alcance.tipo) morir(3, `el ID ${id} deriva dos tipos distintos entre capturas`);
}
if (porId.size !== 167) morir(3, `las restricciones cerradas no son 167 sino ${porId.size}`);
const TR = { umbral: 0, total: 0, menores_sin_umbral: 0, no_legible: 0 };
for (const [, o] of porId) TR[o.tipo]++;
say('');
say(`    CERRADOS : ${cerrados.length} filas / ${porId.size} restricciones distintas.`);
say('    la misma particion, en RESTRICCIONES:');
for (const k of Object.keys(TR)) say(`      ${pad(k, 22)} ${rp(TR[k], 4)} restricciones · ${rp(T[k], 4)} filas`);
say('    ' + cierra('alcance / restricciones', Object.values(TR), 167));
say('');
say('    Reproducida. Recien aca se mide lo nuevo.');
say('');

// ── (3) NORMALIZACION DECLARADA (INV-0.3) ───────────────────────────────────
hr('-');
say('(3) QUE SE NORMALIZO PARA COMPARAR — DECLARADO');
hr('-');
say('    N3 = normalizarParaCriterio (cierre-derivador.js:55), IMPORTADA verbatim.');
say('         decodifica &LT; &GT; &AMP; &QUOT;  ->  el dato las trae sin decodificar');
say('         normalizarTexto (parser:8): doble-encoding CP1252, NFD sin acentos, MAYUS');
say('         + toda puntuacion a espacio + \\s+ colapsado (TAB incluido)');
say('    Eso desarma, medido en ESTE material: los parentesis de "25 (AB)" (95072),');
say('    la barra de "50 A/B." (95208), los puntos de "EE.MM." -> "EE MM", las comillas');
say('    escapadas (95185), el doble espacio (94985), los \\r\\n (95346), el N°232.');
say('    LO QUE NO ARREGLA, y se declara: "PURTO" (95208), "BARAR"/"CHIAHUIN" (95220),');
say('    "TODA TIPO EMBARCACIONES" sin concordancia (95219/95220), "CONDICIONDE" (95171).');
say('    No se aplica caza por aproximacion en ninguna parte de este archivo.');
say('');
const n3De = (r) => normalizarParaCriterio(r.Observacion);

// ── (4) QUE CUENTA COMO "UN ALCANCE" — CRITERIO DECLARADO ───────────────────
hr('-');
say('(4) QUE CUENTA COMO UN ALCANCE — CRITERIO DECLARADO');
hr('-');
say('    EXPRESION DE ALCANCE = sintagma del texto que dice A QUE NAVES alcanza un');
say('    cierre declarado EN ESE MISMO TEXTO. Denota un conjunto de naves.');
say('');
say('    EL EJE ES NAVES, NO TERRITORIO, y se declara por que: el alcance territorial');
say('    ya lo midio la sesion anterior (punto 4 de alcance_no_legible: 149 restricciones');
say('    lo declaran en palabras y no hay ranura donde ponerlo). Contarlo aca como');
say('    "segundo alcance" haria multiple a casi todo el material —W2 sola son 114');
say('    restricciones— y ahogaria la senal que esta sesion mide. El territorio entra');
say('    igual, pero como INDICE: es lo que separa dos alcances de naves entre si');
say('    ("100 fuera / 25 dentro"), no como alcance por derecho propio.');
say('');
say('    CLASES DE EXPRESION EMERGIDAS DEL DATO (no de la lista del prompt):');
say('      num(N,u)  "MENORES DE N AB" · "MENOR A N AB" · "EE MM DE N TRG" ·');
say('                "EMBARCACION N AB" · "N AB" tras predicado   ->  { ab < N }');
say('      menores   "EMBARCACIONES/NAVES MENORES" · "EE MM" sin numero  ->  { menores }');
say('      mayores   "NAVES MAYORES" · "SUPERIORES A N"            ->  { mayores }');
say('      todas     "TODO TIPO DE NAVES" · "TODA TIPO EMBARCACIONES" ·');
say('                "NAVES Y EMBARCACIONES"                        ->  { todas }');
say('      equip     "NAVES QUE NO CUENTEN CON RADAR"   ->  corte por equipamiento');
say('');
say('    DOS EXPRESIONES SON LA MISMA si denotan el mismo conjunto. "EE MM DE 25 AB"');
say('    es UNA expresion, no dos (la clase y el numero dicen lo mismo).');
say('');
say('    LA EXPRESION TIENE QUE ESTAR GOBERNADA POR UN PREDICADO DE CIERRE.');
say('    Nombrar una clase de nave no alcanza. Medido en este material, tres roles');
say('    que NO son alcance de un cierre y que un lector ingenuo se lleva puestos:');
say('      · remision  "MANIOBRAS ... DE NAVES MAYORES ... OBRARAN EN CONSECUENCIA A');
say('                   LOS LIMITES DE OPERACION QUE DISPONEN SUS ..."   (95156-95159)');
say('      · condicion de faena  "TRASLADO PERSONAS ... CON NAVES SUPERIORES A 25 AB"');
say('                            (95072)');
say('      · excepcion sobre faenas  "EXCEPTO AQUELLOS QUE CUENTEN CON RESOLUCION"');
say('                                (95027, 95028, 95029, 95193)');
say('    Esos cinco casos son la evidencia del punto 6 y se cuentan, no se esconden.');
say('');

// ── (5) LA RED — MECANICA, ANCHA, DECLARADA ─────────────────────────────────
hr('-');
say('(5) LA RED DE CANDIDATOS — MECANICA Y DELIBERADAMENTE ANCHA');
hr('-');
const RE_NUM = /(\d+)\s*(?:A\s*B|AB|ARQUEO|TRG)\b/g;
const RE_MENORES = /\bMENOR(?:ES)?\b|\bEE\s*MM\b/;
const RE_MAYORES = /\bMAYOR(?:ES)?\b|\bSUPERIOR(?:ES)?\b/;
const RE_UNIV = /\bTODO\s+TIPOS?\s+DE\s+NAVES\b|\bTODO\s+TIPOS?\s+DE\s+EMBARCACIONES\b|\bTODA\s+TIPO\s+EMBARCACIONES\b|\bNAVES\s+Y\s+EMBARCACIONES\b/;
const RE_EQUIP = /\bQUE\s+(?:NO\s+)?CUENTEN\s+CON\b/;

function senales(t) {
  RE_NUM.lastIndex = 0;
  const nums = [...t.matchAll(RE_NUM)].map((m) => parseInt(m[1], 10));
  const uniq = [...new Set(nums)].sort((a, b) => a - b);
  return {
    nums: uniq,
    menores: RE_MENORES.test(t),
    mayores: RE_MAYORES.test(t),
    univ: RE_UNIV.test(t),
    equip: RE_EQUIP.test(t),
  };
}
function esCandidato(s) {
  const clases = [s.menores, s.mayores, s.univ, s.equip].filter(Boolean).length;
  if (s.nums.length >= 2) return true;
  if (s.nums.length >= 1 && (s.mayores || s.univ || s.equip)) return true;
  if (s.nums.length === 0 && clases >= 2) return true;
  return false;
}
say('    CONDICION, tal como esta implementada arriba (no es la regla de arreglo: es');
say('    la red que junta a quien hay que LEER):');
say('      (a) dos o mas valores numericos DISTINTOS con unidad, o');
say('      (b) al menos un numero Y (mayores | universal | equipamiento), o');
say('      (c) sin numeros y dos o mas clases de nave nombradas.');
say('    Falsos positivos INCLUIDOS a proposito: la red no sabe de funcion sintactica.');
say('    Cada candidato se resuelve por lectura en la tabla de (6), con su literal.');
say('');
const candidatos = [];
for (const [id, o] of porId) {
  const s = senales(n3De(o.r));
  COMPARACIONES++;
  if (esCandidato(s)) candidatos.push({ id, o, s });
}
const filasDeIds = (ids) => ids.reduce((a, k) => a + porId.get(k).filas, 0);
say(`    CANDIDATOS : ${candidatos.length} restricciones · ${filasDeIds(candidatos.map((c) => c.id))} filas`);
say(`    sobre el denominador de cerrados: ${porId.size} restricciones · ${cerrados.length} filas`);
say('');

// ── (6) TABLA DECLARADA — POR LECTURA, CON LITERAL ──────────────────────────
hr('-');
say('(6) PUNTO 1 — LA TABLA DECLARADA. CADA CANDIDATO, LEIDO, CON SU LITERAL');
hr('-');
// multi:true  -> `alcances` lista las expresiones gobernadas por cierre, con el
//                literal EXACTO en N3 (el instrumento exige que exista) y el
//                conjunto que denota. `forma` es la estructura, no un patron.
// multi:false -> `motivo` + `literal` de la expresion que la red confundio.
const TABLA = {
  // ── dos numeros, zonas distintas ──────────────────────────────────────────
  '95060': { multi: true, forma: 'G1', alcances: [
    { lit: 'EMBARCACIONES MENORES DE 100 ARQUEO BRUTO FUERA DE LA BAHIA DE CORRAL', den: { k: 'num', v: 100 }, zona: 'fuera' },
    { lit: 'DENTRO DE LA BAHIA CERRADO PARA EMBARCACIONES MENORES DE 25 ARQUEO BRUTO', den: { k: 'num', v: 25 }, zona: 'dentro' } ] },
  '95061': { multi: true, forma: 'G1', alcances: [
    { lit: 'EMBARCACIONES MENORES DE 100 ARQUEO BRUTO FUERA DE LA BARRA DEL RIO CHAIHUIN', den: { k: 'num', v: 100 }, zona: 'fuera' },
    { lit: 'DENTRO DE LA BARRA CERRADO PARA EMBARCACIONES MENORES DE 25 ARQUEO BRUTO', den: { k: 'num', v: 25 }, zona: 'dentro' } ] },
  '95062': { multi: true, forma: 'G1', alcances: [
    { lit: 'CERRADO PARA EE MM DE 100 AB ENTRE PUNTA NIEBLA HASTA PUNTA RONCA MEHUIN', den: { k: 'num', v: 100 }, zona: 'sector Niebla-Ronca' },
    { lit: 'DENTRO DE LA BAHIA NIEBLA CERRADO PARA EMBARCACIONES MENORES DE 25 AB', den: { k: 'num', v: 25 }, zona: 'dentro' } ] },
  '95071': { multi: true, forma: 'G1', alcances: [
    { lit: 'NAVEGACION FUERA DE BAHIA SECTOR NORTE CERRADO 50 AB', den: { k: 'num', v: 50 }, zona: 'fuera-norte' },
    { lit: 'NAVEGACION FUERA DE BAHIA SECTOR SUR CERRADO PARA EMBARCACION 100 AB', den: { k: 'num', v: 100 }, zona: 'fuera-sur' } ] },
  '95075': { multi: true, forma: 'G1', alcances: [
    { lit: 'NAVEGACION DENTRO DE LA BAHIA Y CANAL QUEILEN CERRADO PARA NAVES MENORES DE 25 AB', den: { k: 'num', v: 25 }, zona: 'dentro' },
    { lit: 'NAVEGACION HACIA NORTE SUR Y CRUCE GOLFO CORCOVADO CERRADO PARA NAVES MENORES DE 50 A B', den: { k: 'num', v: 50 }, zona: 'cruce golfo' } ] },
  '95116': { multi: true, forma: 'G1', alcances: [
    { lit: 'CERRADO PARA EMBARCACIONES MENORES DE 50 ARQUEO BRUTO FUERA DE LA BAHIA', den: { k: 'num', v: 50 }, zona: 'fuera' },
    { lit: 'CERRADO PARA EMBARCACIONES MENORES DE 25 ARQUEO BRUTO DENTRO DE LA BAHIA', den: { k: 'num', v: 25 }, zona: 'dentro' } ] },
  '95117': { multi: true, forma: 'G1', alcances: [
    { lit: 'CERRADO PARA EMBARCACIONES MENORES DE 50 ARQUEO BRUTO FUERA DE LA BAHIA', den: { k: 'num', v: 50 }, zona: 'fuera' },
    { lit: 'CERRADO PARA EMBARCACIONES MENORES DE 25 ARQUEO BRUTO DENTRO DE LA BAHIA DE ESTAQUILLA', den: { k: 'num', v: 25 }, zona: 'dentro' } ] },
  '95155': { multi: true, forma: 'G1', alcances: [
    { lit: 'FUERA DE LA BAHIA SECTOR NORTE PARA EMBARCACIONES MENORES A 50 A B', den: { k: 'num', v: 50 }, zona: 'fuera-norte' },
    { lit: 'FUERA DE LA BAHIA SECTOR SUR PARA EMBARCACIONES MENORES A 100 A B', den: { k: 'num', v: 100 }, zona: 'fuera-sur' },
    { lit: 'DENTRO DE LA BAHIA PARA EMBARCACIONES MENORES A 25 A B', den: { k: 'num', v: 25 }, zona: 'dentro' } ] },
  '95184': { multi: true, forma: 'G1', alcances: [
    { lit: 'CERRADO PARA EMBARCACIONES MENOR A 25 AB DENTRO DE LA BAHIA', den: { k: 'num', v: 25 }, zona: 'dentro' },
    { lit: 'Y 50 AB FUERA DE LA BAHIA', den: { k: 'num', v: 50 }, zona: 'fuera' } ] },
  '95185': { multi: true, forma: 'G1', alcances: [
    { lit: 'PUERTO CERRADO PARA EMBARCACIONES MENOR A 25 AB DENTRO DE LA BAHIA', den: { k: 'num', v: 25 }, zona: 'dentro' },
    { lit: 'Y 50 AB FUERA DE LA BAHIA', den: { k: 'num', v: 50 }, zona: 'fuera' } ] },
  '95205': { multi: true, forma: 'G1', alcances: [
    { lit: 'SE RESTRINGE NAVEGACION A EMBARCACIONES MENORES A 25 AB DENTRO DE LA BAHIA', den: { k: 'num', v: 25 }, zona: 'dentro' },
    { lit: 'Y MENORES A 50 AB FUERA DE LA BAHIA', den: { k: 'num', v: 50 }, zona: 'fuera' } ] },
  '95213': { multi: true, forma: 'G1', alcances: [
    { lit: 'EMBARCACIONES MENORES DE 100 ARQUEO BRUTO FUERA DE LA BAHIA DESDE PUNTA DE NIEBLA HASTA BAHIA DE MEHUIN', den: { k: 'num', v: 100 }, zona: 'fuera' },
    { lit: 'DENTRO DE LA BAHIA CERRADO PARA EMBARCACIONES MENORES DE 50 ARQUEO BRUTO', den: { k: 'num', v: 50 }, zona: 'dentro' } ] },
  '95214': { multi: true, forma: 'G1', alcances: [
    { lit: 'EMBARCACIONES MENORES DE 100 ARQUEO BRUTO FUERA DE LA BAHIA', den: { k: 'num', v: 100 }, zona: 'fuera' },
    { lit: 'DENTRO DE LA BAHIA CERRADO PARA EMBARCACIONES MENORES DE 50 ARQUEO BRUTO', den: { k: 'num', v: 50 }, zona: 'dentro' } ] },
  '95347': { multi: true, forma: 'G1', alcances: [
    { lit: 'CERRADO PARA EE MM DE 50 TRG', den: { k: 'num', v: 50 }, zona: 'Corcovado/Moraleda/Jacaf' },
    { lit: 'CANAL PUYUHUAPI CERRADO PARA EE MM DE 25 TRG', den: { k: 'num', v: 25 }, zona: 'Puyuhuapi' } ] },
  '95352': { multi: true, forma: 'G1', alcances: [
    { lit: 'NAVEGACION FUERA DE LA BAHIA SECTOR NORTE CERRADO PARA NAVES MENORES A 50 AB', den: { k: 'num', v: 50 }, zona: 'fuera-norte' },
    { lit: 'NAVEGACION FUERA DE LA BAHIA SECTOR SUR CERRADO PARA NAVES MENORES A 100 A B', den: { k: 'num', v: 100 }, zona: 'fuera-sur' } ] },
  // ── un numero de un lado, expresion universal del otro ────────────────────
  '95219': { multi: true, forma: 'G2', alcances: [
    { lit: 'CERRADO PARA TODA TIPO EMBARCACIONES FUERA DE LA BAHIA DE CORRAL', den: { k: 'todas' }, zona: 'fuera' },
    { lit: 'DENTRO DE LA BAHIA DE CORRAL CERRADO PARA EMBARCACIONES MENORES DE 50 ARQUEO BRUTO', den: { k: 'num', v: 50 }, zona: 'dentro' } ] },
  '95220': { multi: true, forma: 'G2', alcances: [
    { lit: 'CERRADO PARA TODA TIPO EMBARCACIONES FUERA DE LA BARAR DEL RIO CHIAHUIN', den: { k: 'todas' }, zona: 'fuera' },
    { lit: 'DENTRO DE LA BARRA DEL RIO CHAIHUIN CERRADO PARA EMBARCACIONES MENORES DE 50 ARQUEO BRUTO', den: { k: 'num', v: 50 }, zona: 'dentro' } ] },
  // ── dos clases de nave enumeradas, sin numero ─────────────────────────────
  '94985': { multi: true, forma: 'G3', alcances: [
    { lit: 'EMBARCACIONES MAYORES Y MENORES', den: { k: 'mayores' }, zona: 'dentro y fuera' },
    { lit: 'EMBARCACIONES MAYORES Y MENORES', den: { k: 'menores' }, zona: 'dentro y fuera' } ] },
  '95099': { multi: true, forma: 'G3', alcances: [
    { lit: 'PARA NAVES MAYORES Y NAVES MENORES', den: { k: 'mayores' }, zona: 'bahia de Conchali' },
    { lit: 'PARA NAVES MAYORES Y NAVES MENORES', den: { k: 'menores' }, zona: 'bahia de Conchali' } ] },
  '95100': { multi: true, forma: 'G3', alcances: [
    { lit: 'PARA NAVES MAYORES Y NAVES MENORES', den: { k: 'mayores' }, zona: 'bahia de Pichidangui' },
    { lit: 'PARA NAVES MAYORES Y NAVES MENORES', den: { k: 'menores' }, zona: 'bahia de Pichidangui' } ] },
  // ── candidatos que la LECTURA descarta: la segunda mencion no es un alcance ─
  '94977': { multi: false, motivo: 'universal MODIFICADO por MENORES: un solo conjunto, no dos',
    lit: 'PUERTO CERRADO PARA TODO TIPO DE EMBARCACIONES MENORES' },
  '95027': { multi: false, motivo: 'la excepcion gobierna FAENAS (buceo, extractivas), no naves',
    lit: 'EXCEPTO AQUELLOS QUE CUENTEN CON RESOLUCION QUE LOS AUTORIZA A TRABAJAR' },
  '95028': { multi: false, motivo: 'la excepcion gobierna FAENAS (buceo, extractivas), no naves',
    lit: 'EXCEPTO AQUELLOS QUE CUENTEN CON RESOLUCION QUE LOS AUTORIZA A TRABAJAR' },
  '95029': { multi: false, motivo: 'la excepcion gobierna FAENAS (buceo, extractivas), no naves',
    lit: 'EXCEPTO AQUELLOS QUE CUENTEN CON RESOLUCION QUE LOS AUTORIZA A TRABAJAR' },
  '95193': { multi: false, motivo: 'la excepcion gobierna FAENAS (buceo, extractivas), no naves',
    lit: 'EXCEPTO AQUELLOS QUE CUENTEN CON RESOLUCION QUE LOS AUTORIZA A TRABAJAR' },
  '95072': { multi: false, motivo: 'condicion de una faena (traslado de personas), no un cierre',
    lit: 'TRASLADO PERSONAS HACIA Y DESDE CENTROS DE CULTIVOS CON NAVES SUPERIORES A 25 AB' },
  '95156': { multi: false, motivo: 'remision a los limites de operacion de las mayores, no un cierre para ellas',
    lit: 'DE NAVES MAYORES EN PUERTOS Y TERMINALES MARITIMOS OBRARAN EN CONSECUENCIA A LOS LIMITES DE OPERACION' },
  '95157': { multi: false, motivo: 'remision a los limites de operacion de las mayores, no un cierre para ellas',
    lit: 'DE NAVES MAYORES EN PUERTOS Y TERMINALES MARITIMOS OBRARAN EN CONSECUENCIA A LOS LIMITES DE OPERACION' },
  '95158': { multi: false, motivo: 'remision a los limites de operacion de las mayores, no un cierre para ellas',
    lit: 'DE NAVES MAYORES EN PUERTOS Y TERMINALES MARITIMOS OBRARAN EN CONSECUENCIA A LOS LIMITES DE OPERACION' },
  '95159': { multi: false, motivo: 'remision a los limites de operacion de las mayores, no un cierre para ellas',
    lit: 'DE NAVES MAYORES EN PUERTOS Y TERMINALES MARITIMOS OBRARAN EN CONSECUENCIA A LOS LIMITES DE OPERACION' },
};

// Control 1 — la tabla cubre EXACTAMENTE los candidatos de la red.
const idsCand = new Set(candidatos.map((c) => c.id));
const idsTabla = new Set(Object.keys(TABLA));
for (const k of idsCand) if (!idsTabla.has(k)) morir(4, `candidato ${k} de la red y ausente de la tabla declarada`);
for (const k of idsTabla) if (!idsCand.has(k)) morir(4, `ID ${k} declarado en la tabla y NO capturado por la red`);
say(`    control: la tabla cubre los ${idsCand.size} candidatos de la red, sin sobrantes — OK`);

// Control 2 — todo literal declarado existe en el N3 de su registro. Si no, FALLA.
let litOk = 0;
for (const [id, d] of Object.entries(TABLA)) {
  const t = n3De(porId.get(id).r);
  const lits = d.multi ? [...new Set(d.alcances.map((a) => a.lit))] : [d.lit];
  for (const L of lits) {
    COMPARACIONES++;
    if (!t.includes(L)) morir(4, `literal declarado NO encontrado en ID ${id}: "${L}"`);
    litOk++;
  }
}
say(`    control: ${litOk} literales declarados encontrados en el N3 de su registro — OK`);

// Control 3 — los casos que la sesion anterior midio tienen que seguir estando.
const HEREDADOS = { '95099': 'C1', '95100': 'C1', '95219': 'C2', '95220': 'C2' };
for (const [id, rot] of Object.entries(HEREDADOS)) {
  COMPARACIONES++;
  if (!TABLA[id] || TABLA[id].multi !== true) morir(4, `el caso ${rot} (${id}) de alcance_no_legible no reproduce como multiple`);
}
say(`    control: los 4 casos heredados (C1 95099/95100 · C2 95219/95220) reproducen — OK`);

const multi = Object.entries(TABLA).filter(([, d]) => d.multi).map(([k]) => k);
const noMulti = Object.entries(TABLA).filter(([, d]) => !d.multi).map(([k]) => k);
say('    ' + cierra('tabla / restricciones', [multi.length, noMulti.length], idsCand.size));
say('    ' + cierra('tabla / filas', [filasDeIds(multi), filasDeIds(noMulti)], filasDeIds([...idsCand])));
say('');
say(`  >>> DECLARAN MAS DE UN ALCANCE : ${multi.length} restricciones · ${filasDeIds(multi)} filas`);
say(`      sobre el denominador de cerrados: ${porId.size} restricciones · ${cerrados.length} filas`);
say(`      candidato de la red y DESCARTADO por lectura : ${noMulti.length} restricciones · ${filasDeIds(noMulti)} filas`);
say('');

// ── (6b) CONTEO POR FORMA, CON CASO CITADO LITERAL ──────────────────────────
const FORMAS = {
  G1: 'dos o mas NUMEROS distintos, uno por zona o sector',
  G2: 'un NUMERO de un lado y una expresion UNIVERSAL sin tope del otro',
  G3: 'dos CLASES de nave enumeradas, sin numero',
};
say('  CONTEO POR FORMA — no es una particion por construccion? SI lo es: cada');
say('  restriccion multiple cae en una sola forma en este material. Se controla.');
say('');
const porForma = {};
for (const id of multi) {
  const f = TABLA[id].forma;
  (porForma[f] = porForma[f] || []).push(id);
}
for (const f of Object.keys(FORMAS)) {
  const ids = porForma[f] || [];
  say(`    ${f} · ${FORMAS[f]}`);
  say(`        ${ids.length} restricciones · ${filasDeIds(ids)} filas   ->  ${ids.join(', ')}`);
  const ej = ids[0];
  if (ej) {
    say(`        CASO CITADO — ID ${ej} · ${porId.get(ej).r.GLBahia}, literal sin normalizar:`);
    say(`        ${JSON.stringify(porId.get(ej).r.Observacion)}`);
    say(`        alcances leidos: ` + TABLA[ej].alcances.map((a) => `${a.den.k}${a.den.v != null ? ' ' + a.den.v : ''} [${a.zona}]`).join('  ·  '));
  }
  say('');
}
say('    ' + cierra('formas / restricciones', Object.keys(FORMAS).map((f) => (porForma[f] || []).length), multi.length));
say('    ' + cierra('formas / filas', Object.keys(FORMAS).map((f) => filasDeIds(porForma[f] || [])), filasDeIds(multi)));
say('');

// ── (7) PUNTO 2 — QUIEN SE QUEDA CON EL MAS ANGOSTO ─────────────────────────
hr('-');
say('(7) PUNTO 2 — DE LOS MULTIPLES, QUIEN EMITE UN ALCANCE QUE DEJA NAVES AFUERA');
hr('-');
say('    EL VEREDICTO NO SE DECLARA: SE CALCULA. La tabla declara los conjuntos');
say('    denotados; el instrumento computa si el emitido los CUBRE a todos.');
say('');
say('    BORDE DEL MOTOR, medido y no supuesto: restriction-rules-engine.js:73-80');
say('    compara `nave_ab lessThan umbral_ab_fuera` — ESTRICTO. Una nave de AB');
say('    exactamente igual al umbral YA queda fuera del aviso. Los rangos de abajo');
say('    usan esa convencion: emitido U alcanza { ab < U }.');
say('');
// cubre(emitido, denotado) — declarado y explicito. `null` = no se puede afirmar.
function cubre(emi, den) {
  if (emi.k === 'generico') return true;      // el piso: el aviso sale para todos
  if (emi.k === 'todas') return true;
  if (emi.k === 'num') {
    if (den.k === 'num') return emi.v >= den.v;
    return false;                              // no cubre menores/mayores/todas
  }
  if (emi.k === 'menores') {
    if (den.k === 'menores') return true;
    if (den.k === 'mayores') return false;
    return null;                               // frontera menor/mayor: no la fija esta sesion
  }
  return null;
}
function emitidoDe(o) {
  if (o.tipo === 'umbral') return { k: 'num', v: o.umbral };
  if (o.tipo === 'total') return { k: 'todas' };
  if (o.tipo === 'menores_sin_umbral') return { k: 'menores' };
  return { k: 'generico' };
}
const DEJA_AFUERA = [], CUBRE_TODO = [], INDETERMINADO = [];
for (const id of multi) {
  const o = porId.get(id);
  const emi = emitidoDe(o);
  let deja = false, indet = false;
  const faltantes = [];
  for (const a of TABLA[id].alcances) {
    COMPARACIONES++;
    const c = cubre(emi, a.den);
    if (c === null) indet = true;
    else if (c === false) { deja = true; faltantes.push(a); }
  }
  const reg = { id, o, emi, faltantes };
  if (deja) DEJA_AFUERA.push(reg);
  else if (indet) INDETERMINADO.push(reg);
  else CUBRE_TODO.push(reg);
}
say(`  (I)  EMITE UN ALCANCE MAS ANGOSTO QUE EL TEXTO — DEJA NAVES SIN AVISO`);
say(`       ${DEJA_AFUERA.length} restricciones · ${filasDeIds(DEJA_AFUERA.map((x) => x.id))} filas`);
say('');
say(`  (II) DECLARA MAS DE UNO PERO EL EMITIDO YA ES EL MAS AMPLIO — NO ES DEFECTO`);
say(`       ${CUBRE_TODO.length} restricciones · ${filasDeIds(CUBRE_TODO.map((x) => x.id))} filas`);
say('');
if (INDETERMINADO.length) {
  say(`  (III) INDETERMINADO — el instrumento no puede afirmar la cobertura`);
  say(`       ${INDETERMINADO.length} restricciones · ${filasDeIds(INDETERMINADO.map((x) => x.id))} filas`);
  say('');
}
say('    ' + cierra('bolsas del punto 2 / restricciones', [DEJA_AFUERA.length, CUBRE_TODO.length, INDETERMINADO.length], multi.length));
say('    ' + cierra('bolsas del punto 2 / filas',
  [filasDeIds(DEJA_AFUERA.map((x) => x.id)), filasDeIds(CUBRE_TODO.map((x) => x.id)), filasDeIds(INDETERMINADO.map((x) => x.id))],
  filasDeIds(multi)));
say('');
say('  DETALLE DE (I) — los que dejan gente sin aviso:');
for (const x of DEJA_AFUERA) {
  say(`      ID ${x.id} · ${x.o.r.GLBahia} · ${x.o.filas} fila(s) · emite ${x.o.tipo}${x.emi.v != null ? ' ' + x.emi.v : ''} · aviso_modo=detalle`);
  for (const a of x.faltantes) say(`          NO cubre: ${a.den.k}${a.den.v != null ? ' ' + a.den.v : ''} [${a.zona}]  <-  "${a.lit}"`);
}
say('');
say('  DETALLE DE (II) — declaran mas de uno y el emitido ya alcanza a todos:');
for (const x of CUBRE_TODO) {
  const declarados = TABLA[x.id].alcances.map((a) => `${a.den.k}${a.den.v != null ? ' ' + a.den.v : ''}`).join(' · ');
  say(`      ID ${x.id} · ${pad(x.o.r.GLBahia, 30)} · ${x.o.filas} fila(s) · emite ${pad(x.o.tipo + (x.emi.v != null ? ' ' + x.emi.v : ''), 12)} · declara ${declarados}`);
}
say('');

// ── (8) PUNTO 3 — A CUANTAS NAVES DEJA AFUERA CADA UNO ──────────────────────
hr('-');
say('(8) PUNTO 3 — QUE RANGO DE TONELAJE QUEDA SIN AVISO, UNO POR UNO');
hr('-');
say('    Con el borde estricto del motor (ab < umbral). Cuando el alcance real NO');
say('    tiene tope, se dice asi: no se inventa un techo.');
say('');
for (const x of DEJA_AFUERA) {
  const emi = x.emi;
  say(`    ID ${x.id} · ${x.o.r.GLBahia} · ${x.o.filas} fila(s)`);
  for (const a of x.faltantes) {
    let rango;
    if (a.den.k === 'num' && emi.k === 'num') rango = `AB de ${emi.v} (inclusive) a ${a.den.v} (exclusive) — ${a.den.v - emi.v} AB de ancho`;
    else if (a.den.k === 'todas' && emi.k === 'num') rango = `TODA nave de AB >= ${emi.v} — SIN TECHO: el texto no pone tope`;
    else if (a.den.k === 'mayores' && emi.k === 'menores') rango = `las NAVES MAYORES enteras — la frontera menor/mayor es normativa y esta sesion NO la fija`;
    else rango = `no determinado`;
    say(`        zona "${a.zona}" : queda sin aviso  ${rango}`);
  }
}
say('');

// ── (9) PUNTO 4 — COSTO DEL CAMINO "AL GENERICO" ────────────────────────────
hr('-');
say('(9) PUNTO 4 — COSTO DEL CAMINO "AL GENERICO"');
hr('-');
say('    REGLA HIPOTETICA MEDIDA (no propuesta, no recomendada): declara mas de un');
say('    alcance y no coinciden -> generico.');
say('');
const hoyDetalle = [...porId.entries()].filter(([, o]) => o.tipo !== 'no_legible').map(([k]) => k);
const hoyGenerico = [...porId.entries()].filter(([, o]) => o.tipo === 'no_legible').map(([k]) => k);
say(`    DENOMINADOR: hoy salen con detalle ${hoyDetalle.length} restricciones · ${filasDeIds(hoyDetalle)} filas`);
say(`                 hoy salen con generico ${hoyGenerico.length} restricciones · ${filasDeIds(hoyGenerico)} filas`);
say('    ' + cierra('detalle+generico / restricciones', [hoyDetalle.length, hoyGenerico.length], porId.size));
say('    ' + cierra('detalle+generico / filas', [filasDeIds(hoyDetalle), filasDeIds(hoyGenerico)], cerrados.length));
say('');
const pasarian = multi.filter((id) => porId.get(id).tipo !== 'no_legible');
const yaGenerico = multi.filter((id) => porId.get(id).tipo === 'no_legible');
say(`    PASARIAN DE detalle A generico : ${pasarian.length} restricciones · ${filasDeIds(pasarian)} filas`);
say(`      = ${(100 * pasarian.length / hoyDetalle.length).toFixed(1)}% de las restricciones que hoy salen con detalle`);
say(`      = ${(100 * filasDeIds(pasarian) / filasDeIds(hoyDetalle)).toFixed(1)}% de sus filas`);
say(`    YA salen genericas hoy (no se mueven) : ${yaGenerico.length} restricciones · ${filasDeIds(yaGenerico)} filas`);
say('    ' + cierra('pasarian+ya generico / restricciones', [pasarian.length, yaGenerico.length], multi.length));
say('');
const perderianDetalleBueno = CUBRE_TODO.filter((x) => x.o.tipo !== 'no_legible').map((x) => x.id);
say(`    DE ESOS, HOY EMITEN UN DETALLE QUE NO DEJA A NADIE AFUERA — se perderia:`);
say(`      ${perderianDetalleBueno.length} restricciones · ${filasDeIds(perderianDetalleBueno)} filas`);
for (const id of perderianDetalleBueno) {
  const o = porId.get(id);
  say(`        ID ${id} · ${pad(o.r.GLBahia, 30)} · emite ${o.tipo} ${o.umbral != null ? o.umbral : ''}`);
}
say('');
say('    LO QUE ESTA CIFRA NO DICE, y hay que decirlo (§1.2, §2): "no deja a nadie');
say('    afuera" NO es "correcto en toda zona". Los que emiten el mas amplio SOBRE-');
say('    alcanzan en la zona angosta —95060 emite 100 y dentro de la bahia rige 25—,');
say('    porque el modelo tiene UNA ranura de alcance y no una por zona. Lo que se');
say('    perderia con el generico es un detalle que alcanza a todos los alcanzados,');
say('    no un detalle exacto por zona. Se mide cuantos son, no se juzga.');
const sobreAlcanzan = CUBRE_TODO.filter((x) => {
  const ns = TABLA[x.id].alcances.filter((a) => a.den.k === 'num').map((a) => a.den.v);
  return x.emi.k === 'num' && ns.length >= 2 && Math.min(...ns) < x.emi.v;
}).map((x) => x.id);
say(`    SOBRE-ALCANZAN EN LA ZONA ANGOSTA, medido: ${sobreAlcanzan.length} restricciones · ${filasDeIds(sobreAlcanzan)} filas`);
say(`      -> ${sobreAlcanzan.join(', ')}`);
say('');

// ── (10) PUNTO 5 — COSTO DEL CAMINO "EL MAS AMPLIO" ─────────────────────────
hr('-');
say('(10) PUNTO 5 — COSTO DEL CAMINO "QUEDARSE CON EL MAS AMPLIO"');
hr('-');
say('    CRITERIO: se resuelve si entre los alcances DECLARADOS hay uno que CONTIENE');
say('    a todos los demas. Si no lo hay, el camino no tiene que elegir — y ahi esta');
say('    su limite. La union no cuenta: la union no es uno de los declarados.');
say('');
function contiene(a, b) {
  if (a.k === 'todas') return true;
  if (a.k === 'num' && b.k === 'num') return a.v >= b.v;
  if (a.k === b.k) return true;
  return false;   // menores no contiene mayores, ni al reves, ni a un numero
}
const RESUELVE = [], NO_COMPARABLE = [];
for (const id of multi) {
  const dens = TABLA[id].alcances.map((a) => a.den);
  let mayorQueTodos = null;
  for (const d of dens) {
    COMPARACIONES++;
    if (dens.every((e) => contiene(d, e))) { mayorQueTodos = d; break; }
  }
  if (mayorQueTodos) RESUELVE.push({ id, d: mayorQueTodos });
  else NO_COMPARABLE.push({ id, dens });
}
say(`    SE RESUELVEN con el mas amplio : ${RESUELVE.length} restricciones · ${filasDeIds(RESUELVE.map((x) => x.id))} filas`);
say(`    NO se resuelven                : ${NO_COMPARABLE.length} restricciones · ${filasDeIds(NO_COMPARABLE.map((x) => x.id))} filas`);
say('    ' + cierra('punto 5 / restricciones', [RESUELVE.length, NO_COMPARABLE.length], multi.length));
say('    ' + cierra('punto 5 / filas', [filasDeIds(RESUELVE.map((x) => x.id)), filasDeIds(NO_COMPARABLE.map((x) => x.id))], filasDeIds(multi)));
say('');
say('  LOS NO COMPARABLES, UNO POR UNO — son el limite de ese camino:');
for (const x of NO_COMPARABLE) {
  const o = porId.get(x.id);
  say(`      ID ${x.id} · ${o.r.GLBahia} · ${o.filas} fila(s) · hoy emite ${o.tipo}`);
  say(`          declara: ${x.dens.map((d) => d.k + (d.v != null ? ' ' + d.v : '')).join('  y  ')}`);
  say(`          "${TABLA[x.id].alcances[0].lit}"`);
  say(`          ninguno CONTIENE al otro: {mayores} y {menores} son disjuntos. El mas`);
  say(`          amplio no existe entre los declarados; lo que alcanzaria a todos es la`);
  say(`          UNION, que el texto no nombra como tal.`);
}
say('');
say('  CUANTOS CAMBIARIAN DE VALOR EMITIDO SI SE TOMA EL MAS AMPLIO:');
let cambian = 0, cambianFilas = 0;
for (const x of RESUELVE) {
  const o = porId.get(x.id);
  const emi = emitidoDe(o);
  const distinto = !(emi.k === x.d.k && emi.v === x.d.v);
  COMPARACIONES++;
  if (distinto) {
    cambian++; cambianFilas += o.filas;
    say(`      ID ${x.id} · ${pad(o.r.GLBahia, 30)} · ${o.tipo}${emi.v != null ? ' ' + emi.v : ''}  ->  ${x.d.k}${x.d.v != null ? ' ' + x.d.v : ''}`);
  }
}
say(`      TOTAL que cambia de valor : ${cambian} restricciones · ${cambianFilas} filas`);
say(`      El resto (${RESUELVE.length - cambian}) ya emite el mas amplio: el camino no los toca.`);
say('');

// ── (11) PUNTO 6 — SE PUEDE DETECTAR DE FORMA GENERAL? ──────────────────────
hr('-');
say('(11) PUNTO 6 — QUE TAN ESTABLE ES LA SENAL. MEDIDO CONTRA LAS 167.');
hr('-');
say('    Cada marca candidata se corre sobre las 167 cerradas y se cuenta contra la');
say('    tabla leida. No se propone implementacion: se mide si la senal existe.');
say('');
const MARCAS = [
  { k: 'M1 · dos o mas NUMEROS distintos con unidad', f: (s) => s.nums.length >= 2 },
  { k: 'M2 · un numero + expresion UNIVERSAL', f: (s) => s.nums.length >= 1 && s.univ },
  { k: 'M3 · dos CLASES de nave nombradas (mayores y menores)', f: (s) => s.mayores && s.menores },
  { k: 'M4 · el par DENTRO / FUERA presente', f: (s, t) => /\bDENTRO\b/.test(t) && /\bFUERA\b/.test(t) },
  { k: 'M5 · la conjuncion Y presente', f: (s, t) => /\sY\s/.test(t) },
];
const esMulti = (id) => TABLA[id] && TABLA[id].multi === true;
say(`    ${pad('marca', 52)} ${'dispara'} ${'  TP'} ${'  FP'} ${'  FN'}`);
for (const M of MARCAS) {
  let disp = 0, tp = 0, fp = 0, fn = 0;
  for (const [id, o] of porId) {
    const t = n3De(o.r);
    const s = senales(t);
    COMPARACIONES++;
    const d = M.f(s, t);
    if (d) { disp++; if (esMulti(id)) tp++; else fp++; }
    else if (esMulti(id)) fn++;
  }
  say(`    ${pad(M.k, 52)} ${rp(disp, 7)} ${rp(tp, 4)} ${rp(fp, 4)} ${rp(fn, 4)}`);
}
say('');
say('    TP = dispara y la lectura dice multiple · FP = dispara y NO lo es ·');
say('    FN = es multiple y no dispara.  Universo: las 167 restricciones cerradas.');
say('');
say('    LOS FALSOS POSITIVOS DE M3, NOMBRADOS (son el punto):');
for (const id of noMulti) {
  const s = senales(n3De(porId.get(id).r));
  if (s.mayores && s.menores) say(`      ID ${id} · ${pad(porId.get(id).r.GLBahia, 30)} · ${TABLA[id].motivo}`);
}
say('');

// ── (11b) QUE INDICE SEPARA LAS ZONAS, CRUZADO CON EL ACIERTO ───────────────
hr('-');
say('(11b) EL CRUCE QUE EL DATO PIDE — QUE SEPARA LAS ZONAS vs SI EL EXTRACTOR ACIERTA');
hr('-');
say('    Sobre la forma G1 (dos o mas numeros). Se parte por el INDICE que separa las');
say('    zonas del registro, tal como la tabla lo declara:');
say('      par plano  : las zonas son exactamente {dentro, fuera}');
say('      otro indice: hay al menos una zona que no es dentro ni fuera (sector norte /');
say('                   sector sur, un canal nombrado, un tramo entre dos puntas)');
say('');
const g1 = porForma.G1 || [];
const dejaSet = new Set(DEJA_AFUERA.map((x) => x.id));
const cruce = { plano_ok: [], plano_deja: [], otro_ok: [], otro_deja: [] };
for (const id of g1) {
  const zonas = new Set(TABLA[id].alcances.map((a) => a.zona));
  const plano = zonas.size === 2 && zonas.has('dentro') && zonas.has('fuera');
  COMPARACIONES++;
  cruce[(plano ? 'plano_' : 'otro_') + (dejaSet.has(id) ? 'deja' : 'ok')].push(id);
}
say(`    ${pad('', 26)} ${'emite el mas amplio'}   ${'DEJA NAVES AFUERA'}`);
say(`    ${pad('par plano dentro/fuera', 26)} ${rp(cruce.plano_ok.length, 19)}   ${rp(cruce.plano_deja.length, 17)}`);
say(`    ${pad('otro indice de zona', 26)} ${rp(cruce.otro_ok.length, 19)}   ${rp(cruce.otro_deja.length, 17)}`);
say('    ' + cierra('cruce G1 / restricciones',
  [cruce.plano_ok.length, cruce.plano_deja.length, cruce.otro_ok.length, cruce.otro_deja.length], g1.length));
say('');
say(`      par plano · acierta   : ${cruce.plano_ok.join(', ') || '—'}`);
say(`      par plano · deja      : ${cruce.plano_deja.join(', ') || '—'}`);
say(`      otro indice · acierta : ${cruce.otro_ok.join(', ') || '—'}`);
say(`      otro indice · deja    : ${cruce.otro_deja.join(', ') || '—'}`);
say('');
say('    EL MECANISMO, que esto MIDE y no supone: sitport-parser.js:74-85 solo conoce');
say('    DENTRO y FUERA. Cuando las dos zonas son ese par, `fueraMatch` toma el numero');
say('    del lado de fuera y ese lado es el ancho. Cuando las zonas son "sector norte" y');
say('    "sector sur" —los dos FUERA— o canales nombrados, los dos numeros compiten por');
say('    la misma ranura y gana el PRIMERO del texto, que no tiene por que ser el ancho.');
say('    Se declara como lectura del cruce, no como propuesta de arreglo.');
say('');

// ── (11c) UNA OBSERVACION DEL DATO, MEDIDA ──────────────────────────────────
hr('-');
say('(11c) OBSERVACION MEDIDA — ZONAS DECLARADAS NORMAL DENTRO DE UN REGISTRO CERRADO');
hr('-');
say('    No es alcance de naves y no entra en ningun conteo de arriba. Se mide porque');
say('    aparecio leyendo los multiples y porque nadie lo tiene anotado: hay registros');
say('    que declaran CERRADO una zona y NORMAL otra, y el registro entero sale cerrado.');
say('');
const conNormal = [];
for (const [id, o] of porId) {
  const t = n3De(o.r);
  COMPARACIONES++;
  if (/\bNORMAL\b/.test(t)) conNormal.push(id);
}
say(`    cerradas cuyo texto contiene la palabra NORMAL : ${conNormal.length} restricciones · ${filasDeIds(conNormal)} filas`);
say(`      -> ${conNormal.join(', ')}`);
say('    La red es ancha a proposito (NORMAL tambien aparece fuera de una clausula de');
say('    zona). No se afina: es una observacion, no una medicion de defecto.');
say('');

// ── (12) CIERRE ─────────────────────────────────────────────────────────────
hr('-');
say('(12) CIERRE DEL INSTRUMENTO');
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
