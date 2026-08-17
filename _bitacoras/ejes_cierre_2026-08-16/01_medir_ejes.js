// _bitacoras/ejes_cierre_2026-08-16/01_medir_ejes.js
//
// EJES-DEL-CIERRE — primera pasada. Reproduce la particion 254/190 con el
// criterio VERBATIM de la sesion anterior y mide los ejes "A QUIEN" y "DONDE".
// Ademas VUELCA el vocabulario crudo de la bolsa A para que el eje "QUE QUEDA
// SUSPENDIDO" (instrumento 02) saque su lista de actividades DEL DATO y no de
// una lista traida de afuera.
//
// NO propone regla. NO toca el motor. NO sale a la API. Cuenta.
//
// Controles que ABORTAN:
//   exit 3  la particion no reproduce 254/190, o las bolsas se solapan
//   exit 4  AB_PATTERNS no se pudo extraer del parser, o no son 11 regex
//   exit 5  cero comparaciones efectivas en alguna medicion

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const DIR = path.join(RAIZ, 'sondaje-sitport');
const PARSER = path.join(RAIZ, 'src', 'services', 'sitport-parser.js');
const SALIDA = path.resolve(__dirname, '01_medir_ejes.txt');

const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
const volcar = () => fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
const abortar = (code, msg) => { say(); say(`*** CONTROL FALLIDO — ${msg}`); say(`*** exit ${code}`); volcar(); process.exit(code); };

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR: se IMPORTA, no se reescribe.
// ─────────────────────────────────────────────────────────────────────────────
const { normalizarRestriccion, normalizarTexto } = require(PARSER);

// AB_PATTERNS no esta exportado. Se EXTRAE COMO TEXTO del archivo versionado y
// se evalua ese mismo texto — misma tecnica que la sesion anterior uso con
// `derivarCondicion`. No se transcribe a mano.
const srcParser = fs.readFileSync(PARSER, 'utf8');
const mPat = srcParser.match(/const AB_PATTERNS = \[([\s\S]*?)\r?\n\];/);
if (!mPat) abortar(4, 'no se encontro el literal `const AB_PATTERNS = [` ... `];` en sitport-parser.js');
let AB_PATTERNS;
try { AB_PATTERNS = eval('[' + mPat[1] + ']'); } catch (e) { abortar(4, 'AB_PATTERNS no evaluo: ' + e.message); }
if (!Array.isArray(AB_PATTERNS) || AB_PATTERNS.length !== 11 || !AB_PATTERNS.every(p => p instanceof RegExp)) {
  abortar(4, `AB_PATTERNS extraidos = ${Array.isArray(AB_PATTERNS) ? AB_PATTERNS.length : 'no-array'}, se esperaban 11 RegExp`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL — mismo barrido y misma exclusion que 03_contraste_texto.js
// ─────────────────────────────────────────────────────────────────────────────
const EXCLUIDOS = ['bahias_sitport.json'];
const capturas = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.json') && !EXCLUIDOS.includes(f))
  .map(f => {
    const full = path.join(DIR, f);
    return { f, mtime: fs.statSync(full).mtime, recs: JSON.parse(fs.readFileSync(full, 'utf8')).recordsets[0] || [] };
  })
  .sort((a, b) => a.mtime - b.mtime);

const filas = [];
for (const c of capturas) for (const r of c.recs) filas.push({ cap: c.f, r });
const TOTAL = filas.length;

// NORMALIZADOR DEL CRITERIO — copiado VERBATIM de
// _bitacoras/sondaje_cierre_2026-08-16/03_contraste_texto.js:37-39.
// OJO: NO es el mismo que normalizarTexto del motor — este colapsa espacios y
// el del motor no. Se conserva tal cual porque es el que produjo el 254.
const norm = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase();

// N1 declarado: norm + entities HTML decodificadas.
const deEntities = (s) => String(s == null ? '' : s)
  .replace(/&LT;/gi, '<').replace(/&GT;/gi, '>')
  .replace(/&AMP;/gi, '&').replace(/&QUOT;/gi, '"').replace(/&#39;/g, "'");
const n1 = (s) => norm(deEntities(s));
// N3 declarado: N1 + toda puntuacion a espacio, recolapsado.
const n3 = (s) => n1(s).replace(/[^A-Z0-9Ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

const tally = (arr) => { const m = new Map(); for (const v of arr) m.set(v, (m.get(v) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); };
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

// clasificacion de valor SIN colapsar 0 / "0" / null / "" / AUSENTE
const claseValor = (obj, campo) => {
  if (!(campo in obj)) return 'AUSENTE';
  const v = obj[campo];
  if (v === null) return 'null';
  if (v === '') return '"" (vacio)';
  if (v === 0) return '0 (number)';
  if (v === '0') return '"0" (string)';
  if (typeof v === 'string' && v.trim() === '') return '"   " (solo espacios)';
  return 'valor';
};

hr();
say('EJES DEL CIERRE — PASADA 1: PARTICION, EJE "A QUIEN", EJE "DONDE", VOCABULARIO');
say('Instrumento: _bitacoras/ejes_cierre_2026-08-16/01_medir_ejes.js');
say(`Corrida: ${new Date().toISOString()} · sin salir a la API`);
hr();
say();

// ─────────────────────────────────────────────────────────────────────────────
// (0) MATERIAL Y SHA256 — se declara lo que se midio
// ─────────────────────────────────────────────────────────────────────────────
hr('-');
say('(0) MATERIAL');
hr('-');
const crypto = require('crypto');
for (const c of capturas) {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, c.f))).digest('hex');
  say(`    ${pad(c.f, 36)} ${rpad(c.recs.length, 4)} registros  sha256 ${sha.slice(0, 16)}`);
}
say(`    capturas: ${capturas.length} · DENOMINADOR GLOBAL: ${TOTAL}`);
if (capturas.length !== 6) abortar(3, `capturas = ${capturas.length}, se esperaban 6`);
if (TOTAL !== 444) abortar(3, `TOTAL = ${TOTAL}, se esperaban 444`);
say();
say('    NORMALIZACIONES DECLARADAS:');
say('      norm  = NFD sin diacriticos + espacios colapsados + trim + MAYUSCULAS');
say('              (VERBATIM de 03_contraste_texto.js:37-39 — es el que produjo el 254)');
say('      N1    = norm + entities HTML decodificadas (&LT; &GT; &AMP; &QUOT;)');
say('      N3    = N1 + toda puntuacion a espacio, recolapsado');
say('      El normalizador del MOTOR (normalizarTexto) NO colapsa espacios y NO');
say('      decodifica entities. Se usa el del motor solo donde corre el motor.');
say();

// ─────────────────────────────────────────────────────────────────────────────
// (1) PARTICION 254/190 — CRITERIO VERBATIM, ABORTA SI NO REPRODUCE
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(1) PARTICION — CRITERIO VERBATIM DE 03_contraste_texto.js:84');
hr();
say('    /PUERTO CERRADO|CONDICION\\s*DE\\s*PUERTO/.test(norm(r.Observacion))');
say();
const CRITERIO = /PUERTO CERRADO|CONDICION\s*DE\s*PUERTO/;
const A = filas.filter(({ r }) => CRITERIO.test(norm(r.Observacion)));
const B = filas.filter(({ r }) => !CRITERIO.test(norm(r.Observacion)));
say(`    bolsa A (declaran cierre) : ${A.length}`);
say(`    bolsa B (no lo declaran)  : ${B.length}`);
say(`    suma                      : ${A.length + B.length}`);
const claveDe = ({ cap, r }) => `${cap}#${r.IDRestriccion}`;
const setA = new Set(A.map(claveDe));
const solape = B.filter(f => setA.has(claveDe(f))).length;
say(`    solape (captura+IDRestriccion) : ${solape}`);
if (A.length !== 254 || B.length !== 190 || solape !== 0) {
  abortar(3, `particion NO reproducida: A=${A.length} B=${B.length} solape=${solape}`);
}
say();
say('    >>> PARTICION REPRODUCIDA: 254 / 190, suma 444, solape 0.');
say();
say('    DESGLOSE DEL CRITERIO (las dos ramas se solapan y se declara):');
const soloPC = A.filter(({ r }) => /PUERTO CERRADO/.test(norm(r.Observacion))).length;
const soloCDP = A.filter(({ r }) => /CONDICION\s*DE\s*PUERTO/.test(norm(r.Observacion))).length;
const ambasRamas = A.filter(({ r }) => /PUERTO CERRADO/.test(norm(r.Observacion)) && /CONDICION\s*DE\s*PUERTO/.test(norm(r.Observacion))).length;
say(`      contiene "PUERTO CERRADO"        : ${soloPC} / 254`);
say(`      contiene "CONDICION DE PUERTO"   : ${soloCDP} / 254`);
say(`      contiene LAS DOS                 : ${ambasRamas} / 254`);
say(`      solo "PUERTO CERRADO"            : ${soloPC - ambasRamas} / 254`);
say(`      solo "CONDICION DE PUERTO"       : ${soloCDP - ambasRamas} / 254`);
say(`      suma de los disjuntos            : ${(soloPC - ambasRamas) + (soloCDP - ambasRamas) + ambasRamas} / 254`);
say();

// El motor, corrido sobre los 444 una sola vez y cacheado.
const NORM = new Map();
for (const f of filas) NORM.set(claveDe(f), normalizarRestriccion(f.r));
if (NORM.size !== TOTAL) abortar(5, `normalizados ${NORM.size} de ${TOTAL} — hay claves duplicadas`);
say(`    MOTOR CORRIDO sobre los ${TOTAL} registros: ${NORM.size} objetos normalizados, claves unicas.`);
say();

// ═════════════════════════════════════════════════════════════════════════════
// EJE 1 — "A QUIEN"
// ═════════════════════════════════════════════════════════════════════════════
hr();
say('(2) EJE "A QUIEN" — DENOMINADOR 254 (bolsa A)');
hr();
say();

say('  2.1 — `NaveRecibe` CRUDO (sin decodificar, tal como viene). Clases de valor:');
const clasesNR = tally(A.map(({ r }) => claseValor(r, 'NaveRecibe')));
for (const [k, v] of clasesNR) say(`        ${pad(k, 24)} ${rpad(v, 4)} / 254`);
say();
say('       valores distintos, CRUDOS:');
for (const [k, v] of tally(A.map(({ r }) => JSON.stringify(r.NaveRecibe)))) say(`        ${rpad(v, 4)} / 254   ${k}`);
say();
const conEntity = A.filter(({ r }) => /&(LT|GT|AMP|QUOT);/i.test(String(r.NaveRecibe ?? ''))).length;
say(`       con entities HTML sin decodificar en NaveRecibe : ${conEntity} / 254`);
if (conEntity === 0) say('        *** cero — es FALLA de la medicion, la bitacora anterior midio 254/254');
say();
say('       valores distintos, N1 (entities decodificadas):');
for (const [k, v] of tally(A.map(({ r }) => JSON.stringify(n1(r.NaveRecibe))))) say(`        ${rpad(v, 4)} / 254   ${k}`);
say();

say('  2.2 — LO QUE EL MOTOR DERIVA DE AHI (afecta_menores / afecta_mayores):');
const comboAfecta = tally(A.map(f => { const n = NORM.get(claveDe(f)); return `menores=${n.afecta_menores} mayores=${n.afecta_mayores}`; }));
let sumaAfecta = 0;
for (const [k, v] of comboAfecta) { say(`        ${pad(k, 34)} ${rpad(v, 4)} / 254`); sumaAfecta += v; }
say(`        ${pad('suma', 34)} ${rpad(sumaAfecta, 4)} / 254   ${sumaAfecta === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  2.3 — UMBRAL NUMERICO, POR LA IMPLEMENTACION VERSIONADA (normalizarRestriccion):');
const conUmbral = A.filter(f => { const n = NORM.get(claveDe(f)); return n.umbral_ab_dentro != null || n.umbral_ab_fuera != null; });
const sinUmbral = A.filter(f => { const n = NORM.get(claveDe(f)); return n.umbral_ab_dentro == null && n.umbral_ab_fuera == null; });
say(`        con algun umbral extraido : ${conUmbral.length} / 254`);
say(`        sin ningun umbral         : ${sinUmbral.length} / 254`);
say(`        suma                      : ${conUmbral.length + sinUmbral.length} / 254 ${conUmbral.length + sinUmbral.length === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();
say('       NUMEROS QUE APARECEN — umbral_ab_fuera (el unico que alguna regla consulta):');
let sf = 0;
for (const [k, v] of tally(A.map(f => String(NORM.get(claveDe(f)).umbral_ab_fuera)))) { say(`        ${pad(k, 10)} ${rpad(v, 4)} / 254`); sf += v; }
say(`        ${pad('suma', 10)} ${rpad(sf, 4)} / 254 ${sf === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();
say('       NUMEROS QUE APARECEN — umbral_ab_dentro (hecho muerto: ninguna regla lo consulta):');
let sd = 0;
for (const [k, v] of tally(A.map(f => String(NORM.get(claveDe(f)).umbral_ab_dentro)))) { say(`        ${pad(k, 10)} ${rpad(v, 4)} / 254`); sd += v; }
say(`        ${pad('suma', 10)} ${rpad(sd, 4)} / 254 ${sd === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();
const distintos = A.filter(f => { const n = NORM.get(claveDe(f)); return n.umbral_ab_dentro !== n.umbral_ab_fuera; });
say(`       registros donde DENTRO != FUERA : ${distintos.length} / 254`);
for (const f of distintos) {
  const n = NORM.get(claveDe(f));
  say(`         ID ${f.r.IDRestriccion} · ${f.r.GLBahia} · dentro=${n.umbral_ab_dentro} fuera=${n.umbral_ab_fuera}`);
}
say();

say('  2.4 — LOS ONCE PATRONES DEL PARSER: COBERTURA SOBRE LOS 254');
say('       (AB_PATTERNS extraidos como texto de sitport-parser.js:46-58 y evaluados;');
say('        se aplican sobre normalizarTexto(Observacion), que es lo que el parser usa)');
say();
const cobertura = new Array(11).fill(0);
let ningunPatron = 0;
const primerPatron = new Map();
for (const f of A) {
  const t = normalizarTexto(f.r.Observacion);
  let idx = -1;
  for (let i = 0; i < AB_PATTERNS.length; i++) { if (AB_PATTERNS[i].test(t)) { idx = i; break; } }
  if (idx === -1) ningunPatron++; else cobertura[idx]++;
  primerPatron.set(claveDe(f), idx);
}
for (let i = 0; i < 11; i++) say(`        patron ${rpad(i + 1, 2)}  ${rpad(cobertura[i], 4)} / 254   ${AB_PATTERNS[i].source.slice(0, 52)}`);
say(`        ${pad('NINGUNO', 10)} ${rpad(ningunPatron, 4)} / 254`);
const sumaCob = cobertura.reduce((a, b) => a + b, 0) + ningunPatron;
say(`        ${pad('suma', 10)} ${rpad(sumaCob, 4)} / 254 ${sumaCob === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();
say('       >>> "cobertura" = cual de los once es el PRIMERO que matchea. Es la');
say('           semantica de extraerUmbralDeTexto (:61-65), que devuelve el primero.');
say();
const cubiertoNoExtraido = A.filter(f => primerPatron.get(claveDe(f)) !== -1 && NORM.get(claveDe(f)).umbral_ab_fuera == null);
const noCubiertoSiExtraido = A.filter(f => primerPatron.get(claveDe(f)) === -1 && NORM.get(claveDe(f)).umbral_ab_fuera != null);
say(`       algun patron matchea PERO el parser no deja umbral_fuera : ${cubiertoNoExtraido.length} / 254`);
say(`       ningun patron matchea PERO el parser SI deja umbral      : ${noCubiertoSiExtraido.length} / 254`);
say('       (la diferencia la produce extraerUmbrales :68-101, que antepone');
say('        TODO TIPO DE NAVES y la rama separada DENTRO/FUERA)');
say();

say('  2.5 — LOS QUE NO PERMITEN EXTRAER UN NUMERO, Y POR QUE. Causa primaria, disjunta.');
const sinNumero = A.filter(f => NORM.get(claveDe(f)).umbral_ab_fuera == null && NORM.get(claveDe(f)).umbral_ab_dentro == null);
const causas = new Map();
const ejemplos = new Map();
for (const f of sinNumero) {
  const t = normalizarTexto(f.r.Observacion);
  const n = NORM.get(claveDe(f));
  let c;
  if (n.bloqueo_total) c = 'C1 bloqueo_total (TODO TIPO DE NAVES) — no hay numero porque no hace falta';
  else if (/TODO\s+TIPO\s+DE\s+EMBARCACIONES/.test(t)) c = 'C2 "TODO TIPO DE EMBARCACIONES" — rama :95, devuelve null a proposito';
  else if (/EMBARCACIONES\s+MENORES|NAVES\s+MENORES/.test(t)) c = 'C3 "MENORES" sin numero — rama :92, null = TODAS las menores';
  else if (!/\d/.test(t)) c = 'C4 el texto no tiene NINGUN digito';
  else c = 'C5 hay digitos pero ninguno junto a una unidad que los once patrones reconozcan';
  causas.set(c, (causas.get(c) || 0) + 1);
  if (!ejemplos.has(c)) ejemplos.set(c, f);
}
let sumaCausas = 0;
for (const [k, v] of tally([...causas.entries()].flatMap(([k, v]) => Array(v).fill(k)))) {
  say(`        ${rpad(v, 4)} / ${sinNumero.length}   ${k}`);
  sumaCausas += v;
  const ej = ejemplos.get(k);
  say(`               ej. ID ${ej.r.IDRestriccion} · ${ej.r.GLBahia}`);
  say(`                   ${JSON.stringify(String(ej.r.Observacion).slice(0, 150))}`);
}
say(`        ${rpad(sumaCausas, 4)} / ${sinNumero.length}   suma ${sumaCausas === sinNumero.length ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  2.6 — UNIDADES QUE APARECEN. Se saca DEL DATO: el token que sigue a un numero.');
say('        NO se convierte ninguna. Se cuenta y se conserva tal como vino.');
say();
const unidades = [];
for (const f of A) {
  const t = n1(f.r.Observacion);
  const re = /(\d+)\s*([A-Z][A-Z.\/]{0,12})/g;
  let m;
  while ((m = re.exec(t)) !== null) unidades.push(m[2]);
}
say(`        ocurrencias totales de "numero + token" en la bolsa A: ${unidades.length}`);
say('        tokens, por frecuencia (los que aparecen 2+ veces):');
for (const [k, v] of tally(unidades)) if (v >= 2) say(`        ${rpad(v, 5)}  ${k}`);
say();
say('        tokens que aparecen UNA sola vez:');
say('        ' + tally(unidades).filter(([, v]) => v === 1).map(([k]) => k).join(' · '));
say();
say('        LO MISMO SOBRE NaveRecibe (N1):');
const unidNR = [];
for (const f of A) { const t = n1(f.r.NaveRecibe); const re = /(\d+)\s*([A-Z][A-Z.\/]{0,12})/g; let m; while ((m = re.exec(t)) !== null) unidNR.push(m[2]); }
for (const [k, v] of tally(unidNR)) say(`        ${rpad(v, 5)}  ${k}`);
say();

// ═════════════════════════════════════════════════════════════════════════════
// EJE 2 — "DONDE"
// ═════════════════════════════════════════════════════════════════════════════
hr();
say('(3) EJE "DONDE" — DENOMINADOR 254 (bolsa A)');
hr();
say();

say('  3.1 — `AreaRestriccion` CRUDO. Clases de valor, sin colapsar:');
let sc = 0;
for (const [k, v] of tally(A.map(({ r }) => claseValor(r, 'AreaRestriccion')))) { say(`        ${pad(k, 24)} ${rpad(v, 4)} / 254`); sc += v; }
say(`        ${pad('suma', 24)} ${rpad(sc, 4)} / 254 ${sc === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();
say('       valores distintos, CRUDOS:');
let sv = 0;
for (const [k, v] of tally(A.map(({ r }) => JSON.stringify(r.AreaRestriccion)))) { say(`        ${rpad(v, 4)} / 254   ${k}`); sv += v; }
say(`        ${rpad(sv, 4)} / 254   suma ${sv === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  3.2 — DENTRO / FUERA / AMBOS / NULO, LEIDO DEL CAMPO:');
const claseCampo = (f) => {
  const v = f.r.AreaRestriccion;
  if (v === null || v === undefined || String(v).trim() === '') return 'NULO o vacio';
  const a = n1(v);
  const d = a.includes('DENTRO'), fu = a.includes('FUERA');
  if (d && fu) return 'AMBOS (dice DENTRO y FUERA)';
  if (d) return 'solo DENTRO';
  if (fu) return 'solo FUERA';
  return 'con valor, pero no dice ni DENTRO ni FUERA';
};
let s32 = 0;
for (const [k, v] of tally(A.map(claseCampo))) { say(`        ${pad(k, 44)} ${rpad(v, 4)} / 254`); s32 += v; }
say(`        ${pad('suma', 44)} ${rpad(s32, 4)} / 254 ${s32 === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  3.3 — LO QUE EL MOTOR DEJA EN `area` (detectarArea :106-114, defecto DENTRO_Y_FUERA):');
let s33 = 0;
for (const [k, v] of tally(A.map(f => NORM.get(claveDe(f)).area))) { say(`        ${pad(k, 20)} ${rpad(v, 4)} / 254`); s33 += v; }
say(`        ${pad('suma', 20)} ${rpad(s33, 4)} / 254 ${s33 === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  3.4 — LO QUE DICE EL TEXTO (Observacion, N1):');
const claseTexto = (f) => {
  const t = n1(f.r.Observacion);
  const d = /\bDENTRO\b/.test(t), fu = /\bFUERA\b/.test(t);
  if (d && fu) return 'texto dice DENTRO y FUERA';
  if (d) return 'texto dice solo DENTRO';
  if (fu) return 'texto dice solo FUERA';
  return 'texto no dice ni DENTRO ni FUERA';
};
let s34 = 0;
for (const [k, v] of tally(A.map(claseTexto))) { say(`        ${pad(k, 34)} ${rpad(v, 4)} / 254`); s34 += v; }
say(`        ${pad('suma', 34)} ${rpad(s34, 4)} / 254 ${s34 === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  3.5 — CRUCE CAMPO x TEXTO. Los 254, sin solape:');
const cruce = tally(A.map(f => `${pad(claseCampo(f), 44)} | ${claseTexto(f)}`));
let s35 = 0;
for (const [k, v] of cruce) { say(`        ${rpad(v, 4)}  ${k}`); s35 += v; }
say(`        ${rpad(s35, 4)}  suma ${s35 === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  3.6 — ZONA EN EL TEXTO Y NO EN EL CAMPO (campo nulo, texto habla):');
const zonaSoloTexto = A.filter(f => claseCampo(f) === 'NULO o vacio' && claseTexto(f) !== 'texto no dice ni DENTRO ni FUERA');
say(`        ${zonaSoloTexto.length} / 254`);
for (const f of zonaSoloTexto) {
  say(`         ID ${f.r.IDRestriccion} · ${f.r.GLBahia} · texto=${claseTexto(f)} · motor area=${NORM.get(claveDe(f)).area}`);
  say(`            ${JSON.stringify(String(f.r.Observacion).slice(0, 170))}`);
}
say();

say('  3.7 — CONTRADICCIONES CAMPO vs TEXTO. Criterio declarado: el campo nombra');
say('        exactamente una de las dos y el texto nombra exactamente la OTRA.');
const contradicen = A.filter(f => {
  const c = claseCampo(f), t = claseTexto(f);
  return (c === 'solo DENTRO' && t === 'texto dice solo FUERA') || (c === 'solo FUERA' && t === 'texto dice solo DENTRO');
});
say(`        ${contradicen.length} / 254`);
for (const f of contradicen) {
  say(`         ID ${f.r.IDRestriccion} · ${f.r.GLBahia} · campo=${JSON.stringify(f.r.AreaRestriccion)} · ${claseTexto(f)} · motor area=${NORM.get(claveDe(f)).area}`);
  say(`            ${JSON.stringify(String(f.r.Observacion).slice(0, 200))}`);
}
say();
say('  3.8 — ESTRECHAMIENTO: el campo dice AMBOS y el texto nombra una sola.');
const estrecha = A.filter(f => claseCampo(f) === 'AMBOS (dice DENTRO y FUERA)' && (claseTexto(f) === 'texto dice solo DENTRO' || claseTexto(f) === 'texto dice solo FUERA'));
say(`        ${estrecha.length} / 254`);
for (const f of estrecha.slice(0, 12)) {
  say(`         ID ${f.r.IDRestriccion} · ${f.r.GLBahia} · ${claseTexto(f)}`);
  say(`            ${JSON.stringify(String(f.r.Observacion).slice(0, 170))}`);
}
if (estrecha.length > 12) say(`         ... y ${estrecha.length - 12} mas`);
say();

say('  3.9 — LUGARES NOMBRADOS EN EL TEXTO DISTINTOS DE "BAHIA". Se saca del dato:');
say('        token que sigue a DENTRO DE / FUERA DE / DENTRO Y FUERA DE.');
const lugares = [];
for (const f of A) {
  const t = n3(f.r.Observacion);
  const re = /(?:DENTRO Y FUERA DE|DENTRO DE|FUERA DE)\s+(?:LA |EL |LOS |LAS )?([A-ZÑ]+(?:\s+[A-ZÑ]+)?)/g;
  let m; while ((m = re.exec(t)) !== null) lugares.push(m[1]);
}
for (const [k, v] of tally(lugares)) if (v >= 1) say(`        ${rpad(v, 5)}  ${k}`);
say();

// ═════════════════════════════════════════════════════════════════════════════
// VOLCADO PARA EL EJE 3 — el vocabulario sale del dato, no de una lista traida
// ═════════════════════════════════════════════════════════════════════════════
hr();
say('(4) VOLCADO DE VOCABULARIO — INSUMO DEL INSTRUMENTO 02, NO ES MEDICION DEL EJE 3');
hr();
say();
say('  4.1 — FRECUENCIA DE PALABRAS EN LA BOLSA A (N3). Todas las de 3+ apariciones:');
const palabras = [];
for (const f of A) for (const w of n3(f.r.Observacion).split(' ')) if (w.length > 2 && !/^\d+$/.test(w)) palabras.push(w);
const tp = tally(palabras);
say(`        tokens totales ${palabras.length} · distintos ${tp.length}`);
say();
let linea = '        ';
for (const [k, v] of tp) {
  if (v < 3) break;
  const celda = `${k}:${v}`.padEnd(26);
  if (linea.length + celda.length > 100) { say(linea); linea = '        '; }
  linea += celda;
}
if (linea.trim()) say(linea);
say();
say('  4.2 — CLAUSULAS QUE SIGUEN A UN MARCADOR DE SUSPENSION/PROHIBICION.');
say('        Marcadores buscados (si uno no aparece, se declara como FALLA):');
const MARCADORES = [
  ['SUSPEND', /SUSPEND/],
  ['PROHIB', /PROHIB/],
  ['RESTRING', /RESTRING/],
  ['PARALIZ', /PARALIZ/],
  ['NO SE AUTORIZA', /NO SE AUTORIZA/],
  ['NO SE PERMITE', /NO SE PERMITE/],
  ['CERRAD', /CERRAD/],
  ['CANCEL', /CANCEL/],
  ['IMPEDID', /IMPEDID/],
];
for (const [nom, re] of MARCADORES) {
  const hits = A.filter(f => re.test(n3(f.r.Observacion)));
  say(`        ${pad(nom, 18)} ${rpad(hits.length, 4)} / 254${hits.length === 0 ? '   *** NO ENCONTRADO — FALLA, no "no aplica"' : ''}`);
}
say();
say('        FRAGMENTOS DISTINTOS que siguen a SUSPEND|PROHIB (90 chars, N3), con conteo:');
const frags = [];
for (const f of A) {
  const t = n3(f.r.Observacion);
  const re = /(SUSPEND|PROHIB)/g;
  let m; while ((m = re.exec(t)) !== null) frags.push(t.slice(m.index, m.index + 90));
}
for (const [k, v] of tally(frags)) say(`        ${rpad(v, 4)}  ${k}`);
say();

hr();
say('CONTROLES: particion reproducida (254/190/solape 0) · AB_PATTERNS extraidos = 11');
say(`comparaciones efectivas: ${TOTAL} registros normalizados por el motor, ${A.length} en bolsa A`);
say('exit 0');
hr();
volcar();
