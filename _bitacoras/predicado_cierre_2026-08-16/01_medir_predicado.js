// _bitacoras/predicado_cierre_2026-08-16/01_medir_predicado.js
//
// PREDICADO-DE-CIERRE — instrumenta la decision "que cuenta como cierre".
// NO decide, NO recomienda opcion, NO propone regla, NO toca el motor.
// Denominador de TODA la medicion: las 444 filas. No los 254.
//
// NADA DE FUZZY MATCHING: no hay distancia de edicion, ni Levenshtein, ni
// aproximacion de ningun tipo. Todo match es literal o regex declarada.
//
// CRITERIOS IMPORTADOS (no reescritos) — se EXTRAEN COMO TEXTO del archivo
// versionado y se evalua ese texto. Si alguno no se extrae, exit 4:
//   AB_PATTERNS      src/services/sitport-parser.js:46-58
//   CRITERIO 254/190 _bitacoras/sondaje_cierre_2026-08-16/03_contraste_texto.js:84
//   RE_PRED          _bitacoras/ejes_cierre_2026-08-16/03_medir_porosidad.js:86
//   ACTIVIDADES      _bitacoras/ejes_cierre_2026-08-16/02_medir_actividades.js:94
//   TODAS            idem :120
//   MARCADOR_SUSP    idem :119
// Y `normalizarRestriccion` se hace require() del motor (lectura, no cambio).
//
// exit 3 si la particion 254/190 no reproduce · exit 4 si falla una extraccion
// exit 5 si una bolsa no cierra contra su denominador · exit 6 si 0 comparaciones

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const DIR = path.join(RAIZ, 'sondaje-sitport');
const PARSER = path.join(RAIZ, 'src', 'services', 'sitport-parser.js');
const F_CRIT = path.join(RAIZ, '_bitacoras', 'sondaje_cierre_2026-08-16', '03_contraste_texto.js');
const F_PORO = path.join(RAIZ, '_bitacoras', 'ejes_cierre_2026-08-16', '03_medir_porosidad.js');
const F_ACTS = path.join(RAIZ, '_bitacoras', 'ejes_cierre_2026-08-16', '02_medir_actividades.js');
const SALIDA = path.resolve(__dirname, '01_medir_predicado.txt');

const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
const volcar = () => fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
const morir = (code, msg) => { say(); say(`*** ${msg}`); say(`*** exit ${code}`); volcar(); process.exit(code); };
const pad = (s, n) => String(s).padEnd(n);
const rp = (s, n) => String(s).padStart(n);
const tally = (a) => { const m = new Map(); for (const v of a) m.set(v, (m.get(v) || 0) + 1); return [...m.entries()].sort((x, y) => y[1] - x[1] || String(x[0]).localeCompare(String(y[0]))); };

// controles de cierre aritmetico
const FALLOS = [];
const cierra = (rot, partes, total) => {
  const s = partes.reduce((a, b) => a + b, 0);
  const ok = s === total;
  if (!ok) FALLOS.push(`${rot}: suma ${s} != ${total}`);
  return ok ? `suma ${s} — CIERRA` : `suma ${s} != ${total} *** NO CIERRA`;
};

let COMPARACIONES = 0;

// ─────────────────────────────────────────────────────────────────────────────
// (0) MATERIAL — inventario con sha256. No se toca ningun insumo.
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('PREDICADO-DE-CIERRE — QUE CUENTA COMO CIERRE, LAS CUATRO FORMAS MEDIDAS');
say('Instrumento: _bitacoras/predicado_cierre_2026-08-16/01_medir_predicado.js');
say(`Corrida: ${new Date().toISOString()} · sin salir a la API de SITPORT`);
hr();
say();

hr('-');
say('(0) MATERIAL — seis capturas, sha256. Ningun insumo se abre en escritura.');
hr('-');
const EXCLUIDOS = ['bahias_sitport.json'];
const capturas = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.json') && !EXCLUIDOS.includes(f))
  .map(f => {
    const full = path.join(DIR, f);
    const buf = fs.readFileSync(full);
    return {
      f, mtime: fs.statSync(full).mtime,
      sha: crypto.createHash('sha256').update(buf).digest('hex'),
      recs: JSON.parse(buf.toString('utf8')).recordsets[0] || [],
    };
  })
  .sort((a, b) => a.mtime - b.mtime);

for (const c of capturas) say(`    ${pad(c.f, 38)} n=${rp(c.recs.length, 3)}  ${c.sha.slice(0, 16)}`);
say(`    excluido (otra consulta): ${EXCLUIDOS.join(', ')}`);

const filas = [];
for (const c of capturas) for (const r of c.recs) filas.push({ cap: c.f, r });
const TOTAL = filas.length;
say();
say(`    DENOMINADOR GLOBAL DE ESTA SESION: ${TOTAL} filas`);
say('    "fila" = captura x registro. Una misma restriccion vista en dos capturas');
say('    cuenta dos veces. Es el mismo denominador de las tres bitacoras previas.');
if (TOTAL !== 444) morir(5, `el material no da 444 filas sino ${TOTAL}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (0.b) NORMALIZACIONES DECLARADAS (INV-0.3)
// ─────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase();
const ent = (s) => String(s == null ? '' : s)
  .replace(/&LT;/gi, '<').replace(/&GT;/gi, '>')
  .replace(/&AMP;/gi, '&').replace(/&QUOT;/gi, '"');
const N1 = (s) => norm(ent(s));
const n3 = (s) => N1(s).replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

hr('-');
say('(0.b) NORMALIZACIONES DECLARADAS — INV-0.3, y que arregla cada una');
hr('-');
say('    norm  NFD sin diacriticos + \\s+ colapsado (TAB incluido) + trim + MAYUS.');
say('          <- ES EL DEL CRITERIO 254/190, verbatim. No es el del motor.');
say('    N1    norm + entities HTML decodificadas (&LT; &GT; &AMP; &QUOT;)');
say('    n3    N1 + toda puntuacion a espacio, recolapsado');
say('          <- desarma comillas escapadas (ID 95185) y "CONDICIONDE" NO: pegado');
say('             queda pegado, la puntuacion no lo separa. Se declara el limite.');
say('    normalizarTexto  el DEL MOTOR (sitport-parser.js:8). NO colapsa espacios,');
say('          NO decodifica entities. Donde corre el motor se usa el del motor.');
say('    Lo que ninguna normaliza: palabras pegadas ("CONDICIONDE",');
say('          "RESTRICCIONESDE") y tipeos ("PURTO", "ESTABLCE", "RESTRINGUE").');
say('          NO SE APLICA NINGUNA APROXIMACION para cazarlos (prohibido por prompt).');
say();

// ─────────────────────────────────────────────────────────────────────────────
// (0.c) EXTRACCION DE CRITERIOS VERSIONADOS
// ─────────────────────────────────────────────────────────────────────────────
hr('-');
say('(0.c) CRITERIOS IMPORTADOS POR EXTRACCION DE TEXTO — no reescritos');
hr('-');

const srcParser = fs.readFileSync(PARSER, 'utf8');
const mAB = srcParser.match(/const AB_PATTERNS = \[([\s\S]*?)\n\];/);
if (!mAB) morir(4, 'no se pudo extraer AB_PATTERNS de sitport-parser.js');
let AB_PATTERNS;
try { AB_PATTERNS = eval('[' + mAB[1] + '\n]'); } catch (e) { morir(4, 'AB_PATTERNS no evalua: ' + e.message); }
if (!Array.isArray(AB_PATTERNS) || AB_PATTERNS.length !== 11 || !AB_PATTERNS.every(p => p instanceof RegExp)) {
  morir(4, `AB_PATTERNS: se esperaban 11 RegExp, se extrajeron ${AB_PATTERNS && AB_PATTERNS.length}`);
}
say(`    AB_PATTERNS      ${AB_PATTERNS.length} RegExp  <- src/services/sitport-parser.js:46-58`);

const srcCrit = fs.readFileSync(F_CRIT, 'utf8');
const mCrit = srcCrit.match(/const dicenCerrado = filas\.filter\(\(\{ r \}\) => (\/[^\n]*?\/)\.test\(norm\(r\.Observacion\)\)\)/);
if (!mCrit) morir(4, 'no se pudo extraer el CRITERIO 254/190 de 03_contraste_texto.js:84');
let CRITERIO;
try { CRITERIO = eval(mCrit[1]); } catch (e) { morir(4, 'CRITERIO no evalua: ' + e.message); }
if (!(CRITERIO instanceof RegExp)) morir(4, 'CRITERIO no es RegExp');
say(`    CRITERIO 254/190 ${CRITERIO}  <- 03_contraste_texto.js:84 (VERBATIM)`);

const srcPoro = fs.readFileSync(F_PORO, 'utf8');
const mPred = srcPoro.match(/const RE_PRED = (\/[^\n]*?\/);/);
if (!mPred) morir(4, 'no se pudo extraer RE_PRED de 03_medir_porosidad.js:86');
let RE_PRED;
try { RE_PRED = eval(mPred[1]); } catch (e) { morir(4, 'RE_PRED no evalua: ' + e.message); }
if (!(RE_PRED instanceof RegExp)) morir(4, 'RE_PRED no es RegExp');
say(`    RE_PRED          <- 03_medir_porosidad.js:86 (cinco predicados)`);
say(`                     ${RE_PRED}`);

const srcActs = fs.readFileSync(F_ACTS, 'utf8');
const mActs = srcActs.match(/const ACTIVIDADES = \[([\s\S]*?)\n\];/);
if (!mActs) morir(4, 'no se pudo extraer ACTIVIDADES de 02_medir_actividades.js:94');
let ACTIVIDADES;
try { ACTIVIDADES = eval('[' + mActs[1] + '\n]'); } catch (e) { morir(4, 'ACTIVIDADES no evalua: ' + e.message); }
// 22 terminos en la tabla versionada; 4 de ellos dan cero en el dato
// (TRANSFERENCIA, PESCA ARTESANAL, TURISTICAS, ACT. MARITIMAS PORT.), de ahi
// las "18 actividades" de la bitacora de ejes_cierre.
if (!Array.isArray(ACTIVIDADES) || ACTIVIDADES.length !== 22) {
  morir(4, `ACTIVIDADES: se esperaban 22 entradas, se extrajeron ${ACTIVIDADES && ACTIVIDADES.length}`);
}
say(`    ACTIVIDADES      ${ACTIVIDADES.length} terminos <- 02_medir_actividades.js:94-117`);

const mTodas = srcActs.match(/const TODAS = (\/[^\n]*?\/);/);
if (!mTodas) morir(4, 'no se pudo extraer TODAS de 02_medir_actividades.js');
let TODAS; try { TODAS = eval(mTodas[1]); } catch (e) { morir(4, 'TODAS no evalua: ' + e.message); }
say(`    TODAS            ${TODAS}`);

const mMarc = srcActs.match(/const MARCADOR_SUSP = (\/[^\n]*?\/);/);
if (!mMarc) morir(4, 'no se pudo extraer MARCADOR_SUSP de 02_medir_actividades.js');
let MARCADOR_SUSP; try { MARCADOR_SUSP = eval(mMarc[1]); } catch (e) { morir(4, 'MARCADOR_SUSP no evalua: ' + e.message); }
say(`    MARCADOR_SUSP    ${MARCADOR_SUSP}`);

const { normalizarRestriccion, normalizarTexto } = require(PARSER);
if (typeof normalizarRestriccion !== 'function' || typeof normalizarTexto !== 'function') {
  morir(4, 'el motor no exporta normalizarRestriccion / normalizarTexto');
}
say('    normalizarRestriccion / normalizarTexto  <- require() del motor. NO se modifica.');
say();

// ─────────────────────────────────────────────────────────────────────────────
// (1) REPRODUCIR LA PARTICION 254/190 ANTES DE MEDIR NADA NUEVO
// ─────────────────────────────────────────────────────────────────────────────
hr('-');
say('(1) LA PARTICION 254/190, REPRODUCIDA CON EL CRITERIO VERBATIM');
hr('-');
const esA = (f) => CRITERIO.test(norm(f.r.Observacion));
const A = filas.filter(esA);
const B = filas.filter(f => !esA(f));
COMPARACIONES += filas.length;
say(`    bolsa A (matchea el criterio) : ${A.length}`);
say(`    bolsa B (no lo matchea)       : ${B.length}`);
say(`    ${cierra('particion', [A.length, B.length], TOTAL)}`);
if (A.length !== 254 || B.length !== 190) morir(3, `la particion no reproduce: ${A.length}/${B.length}`);
say('    >>> REPRODUCE. Se usa como REFERENCIA, no como universo.');
say();

// precomputo por fila
const K = (f) => `${f.cap}#${f.r.IDRestriccion}`;
const OBS_N3 = new Map(), OBS_NORM = new Map(), OBS_MOTOR = new Map(), NORMREC = new Map();
for (const f of filas) {
  OBS_N3.set(K(f), n3(f.r.Observacion));
  OBS_NORM.set(K(f), norm(f.r.Observacion));
  OBS_MOTOR.set(K(f), normalizarTexto(f.r.Observacion));
  NORMREC.set(K(f), normalizarRestriccion(f.r));
}
const t3 = (f) => OBS_N3.get(K(f));

// ─────────────────────────────────────────────────────────────────────────────
// (2) LAS PREMISAS DEL PROMPT, VERIFICADAS
// ─────────────────────────────────────────────────────────────────────────────
hr('-');
say('(2) LAS PREMISAS DEL PROMPT, VERIFICADAS UNA POR UNA');
hr('-');
const p89 = B.filter(f => /\bCERRAD[OA]S?\s+PARA\b/.test(t3(f)));
const soloCDP = A.filter(f => !/PUERTO CERRADO/.test(OBS_NORM.get(K(f))));
const p34 = soloCDP.filter(f => !RE_PRED.test(t3(f)) && !/\bCERRAD[OA]S?\b/.test(t3(f)));
const p132 = A.filter(f => !ACTIVIDADES.some(([, re]) => re.test(t3(f))));
say(`    444 filas en seis capturas ................. ${TOTAL === 444 ? 'SI' : 'NO'}`);
say(`    particion 254 / 190 disjunta ............... SI (reproducida arriba)`);
say(`    once patrones de tonelaje .................. ${AB_PATTERNS.length === 11 ? 'SI' : 'NO'}`);
say(`    89 de los 190 dicen "CERRADO PARA" ......... ${p89.length} / 190  ${p89.length === 89 ? 'SI' : '*** NO'}`);
say(`    34 de los 254 no cierran nada .............. ${p34.length} / 254  ${p34.length === 34 ? 'SI' : '*** NO'}`);
say(`    132 de los 254 no nombran actividad ........ ${p132.length} / 254  ${p132.length === 132 ? 'SI' : '*** NO'}`);
say();
say('    LA PREMISA QUE NO SE SOSTIENE — y no es de las bitacoras, es de la');
say('    compresion del prompt:');
const p89tresEjes = [];  // se llena en (5); aca solo se anuncia
say('      "89 de los 190 dicen CERRADO PARA CON LOS TRES EJES COMPLETOS"');
say('      La bitacora ejes_cierre mide 89/190 con "CERRADO PARA" y NO afirma que');
say('      esos 89 tengan los tres ejes: el "tres ejes completos" sale del UNICO');
say('      caso citado (ID 95025). El numero real esta medido en (5.4).');
say();

// ─────────────────────────────────────────────────────────────────────────────
// (3) PUNTO 1 — QUE FORMAS TOMA "CERRADO" EN LAS 444
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(3) PUNTO 1 — TODAS LAS FORMAS DE CIERRE EN LAS 444, POR FORMA Y POR CAMPO');
hr();
say();

const CAMPOS_TEXTO = ['Observacion', 'Detalle', 'MotivoRestriccion', 'tiporestriccion',
  'NombreInstalacion', 'AreaRestriccion', 'NaveRecibe', 'GLBahia', 'glnombre',
  'tipo', 'SitioAtraque', 'FrenteAtraque'];

// familia lexica del CIERRE propiamente dicho + vecinos que NO son cierre
const LEXEMAS = [
  ['CERRADO / CERRADA / -OS / -AS', /\bCERRAD[OA]S?\b/g, 'cierre'],
  ['CIERRE / CIERRES', /\bCIERRES?\b/g, 'cierre'],
  ['CERRAR / CERRARA / CERRARSE', /\bCERRAR\w*\b/g, 'cierre'],
  ['CIERRA / CIERRAN', /\bCIERRAN?\b/g, 'cierre'],
  ['CLAUSURA / CLAUSURAD*', /\bCLAUSUR\w*\b/g, 'cierre'],
  ['SUSPENSION TOTAL', /\bSUSPENSION\s+TOTAL\b/g, 'cierre'],
  ['SUSPEND* (suspendido/se suspende)', /\bSUSPEND\w*\b/g, 'suspension'],
  ['PROHIB*', /\bPROHIB\w*\b/g, 'suspension'],
  ['PARALIZ*', /\bPARALIZ\w*\b/g, 'suspension'],
  ['CANCELA*', /\bCANCEL\w*\b/g, 'suspension'],
  ['RESTRING* / RESTRICCION*', /\bRESTRIN\w*\b|\bRESTRICCION\w*\b/g, 'suspension'],
  ['CERRAZON  (NIEBLA — NO es cierre)', /\bCERRAZON\w*\b/g, 'vecino-lexico'],
];

say('  3.1 — OCURRENCIAS POR FORMA Y POR CAMPO. Denominador de "registros": 444.');
say('        "ocurr." = ocurrencias totales (un registro puede traer varias).');
say('        Texto normalizado n3. Campos con 0 en todas las formas se omiten y');
say('        se declaran al pie.');
say();
const camposConAlgo = new Set();
const faltantes = [];
say(`        ${pad('forma', 36)} ${rp('reg.', 5)} ${rp('ocurr.', 7)}   campos donde aparece`);
for (const [rot, re, clase] of LEXEMAS) {
  let regs = 0, oc = 0; const porCampo = new Map();
  for (const f of filas) {
    let enEsteReg = 0;
    for (const c of CAMPOS_TEXTO) {
      const t = n3(f.r[c]);
      if (!t) continue;
      const m = t.match(new RegExp(re.source, 'g'));
      if (m) { enEsteReg += m.length; porCampo.set(c, (porCampo.get(c) || 0) + m.length); camposConAlgo.add(c); }
    }
    if (enEsteReg) { regs++; oc += enEsteReg; }
    COMPARACIONES++;
  }
  const det = [...porCampo.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join(' · ');
  say(`        ${pad(rot, 36)} ${rp(regs, 5)} ${rp(oc, 7)}   ${det || '(ninguno)'}`);
  if (regs === 0) faltantes.push(rot);
}
say();
if (faltantes.length) {
  say('        *** FORMAS CON CERO APARICIONES EN LOS 444 — es FALLA declarada, no');
  say('            "no aplicable" (regla de instrumento):');
  for (const t of faltantes) say(`              ${t}   0 / 444 en los doce campos de texto`);
} else {
  say('        Todas las formas buscadas aparecen al menos una vez.');
}
say();
say(`        campos de texto sin ninguna forma de cierre: ${CAMPOS_TEXTO.filter(c => !camposConAlgo.has(c)).join(', ') || '(ninguno)'}`);
say();

// 3.2 — donde vive la señal
say('  3.2 — LA FAMILIA DEL CIERRE (CERRAD*/CIERRE*/CERRAR*/CLAUSUR*), POR CAMPO,');
say('        contada en REGISTROS. Es la que decide si el predicado sirve.');
const RE_FAM = /\bCERRAD[OA]S?\b|\bCIERRES?\b|\bCERRAR\w*\b|\bCIERRAN?\b|\bCLAUSUR\w*\b/;
say();
for (const c of CAMPOS_TEXTO) {
  const n = filas.filter(f => RE_FAM.test(n3(f.r[c]))).length;
  COMPARACIONES += filas.length;
  say(`        ${pad(c, 20)} ${rp(n, 4)} / 444`);
}
const famObs = filas.filter(f => RE_FAM.test(t3(f)));
const famFuera = filas.filter(f => !RE_FAM.test(t3(f)) && CAMPOS_TEXTO.filter(c => c !== 'Observacion').some(c => RE_FAM.test(n3(f.r[c]))));
say();
say(`        registros con la familia en Observacion            : ${famObs.length} / 444`);
say(`        registros con la familia SOLO fuera de Observacion : ${famFuera.length} / 444`);
say(`        registros sin la familia en ningun campo           : ${444 - famObs.length - famFuera.length} / 444`);
say(`        ${cierra('familia por campo', [famObs.length, famFuera.length, 444 - famObs.length - famFuera.length], TOTAL)}`);
say();

// 3.3 — DECLARACION vs NO-DECLARACION
say('  3.3 — DECLARACION vs NO-DECLARACION. Clasificacion por OCURRENCIA, sobre');
say('        `Observacion` (n3), con ventana de 4 palabras antes y 4 despues.');
say();
const RE_OCUR = /((?:\S+\s+){0,4})\b(CERRAD[OA]S?|CIERRES?|CERRAR\w*|CIERRAN?|CLAUSUR\w*)\b((?:\s+\S+){0,4})/g;

const CLASES = [
  ['NEGACION', /\bNO\s+SE\s+(?:CIERRA|CERRARA|CERRO|CIERRAN)\b|\bNO\s+(?:ESTA|ESTARA|ESTAN)\s+CERRAD|\bSIN\s+CIERRE\b|\bNO\s+CERRAD[OA]/],
  ['CONDICIONAL / FUTURO', /\bPODRA\w*\s+(?:SER\s+)?CERRAR|\bSE\s+CERRARA\b|\bCERRARA\b|\bEN\s+CASO\s+DE\s+CIERRE\b|\bDE\s+CERRARSE\b|\bEVENTUAL\w*\s+CIERRE\b|\bCERRARIA\b/],
  ['SUBORDINADA TEMPORAL ("una vez cerrado")', /\bUNA\s+VEZ\s+CERRAD/],
  ['DECLARACION CON TERMINO ("cerrado hasta")', /\bCERRAD[OA]S?\s+HASTA\b|\bSE\s+MANTEN\w+\s+CERRAD/],
];

const ocurrencias = [];
for (const f of filas) {
  const t = t3(f);
  if (!t) continue;
  let m; RE_OCUR.lastIndex = 0;
  while ((m = RE_OCUR.exec(t)) !== null) {
    ocurrencias.push({ f, ctx: (m[1] + m[2] + m[3]).replace(/\s+/g, ' ').trim(), lex: m[2], antes: m[1].trim(), despues: m[3].trim() });
    COMPARACIONES++;
    if (m.index === RE_OCUR.lastIndex) RE_OCUR.lastIndex++;
  }
}
say(`        ocurrencias de la familia en Observacion : ${ocurrencias.length}`);
say(`        en ${famObs.length} registros distintos de 444`);
say();
const claseDe = (o) => {
  for (const [rot, re] of CLASES) if (re.test(o.ctx)) return rot;
  return 'DECLARACION SIMPLE';
};
const porClase = tally(ocurrencias.map(claseDe));
say(`        ${pad('clase', 44)} ${rp('ocurr.', 7)}`);
for (const [k, v] of porClase) say(`        ${pad(k, 44)} ${rp(v, 7)}`);
say(`        ${cierra('clases de ocurrencia', porClase.map(([, v]) => v), ocurrencias.length)}`);
say();
for (const [rot] of CLASES) {
  const hits = ocurrencias.filter(o => claseDe(o) === rot);
  say(`        ${rot} — ${hits.length} ocurrencia(s)`);
  if (hits.length === 0) {
    say('            *** CERO. Se declara como falla de busqueda, no como "no aplica":');
    say('                la forma se busco con regex declarada y el dato no la trae.');
  } else {
    const vistos = new Set();
    for (const o of hits) {
      if (vistos.has(o.ctx)) continue; vistos.add(o.ctx);
      say(`            ID ${o.f.r.IDRestriccion} · ${String(o.f.r.GLBahia).replace(/\s+/g, ' ')}`);
      say(`               ctx: "${o.ctx}"`);
      say(`               lit: ${JSON.stringify(String(o.f.r.Observacion).slice(0, 200))}`);
      if (vistos.size >= 6) break;
    }
    say(`            (contextos distintos mostrados: ${vistos.size} de ${new Set(hits.map(h => h.ctx)).size})`);
  }
  say();
}

// 3.4 — QUE se cierra: el sujeto
say('  3.4 — QUE ES LO QUE SE DECLARA CERRADO. Token(s) alrededor de la ocurrencia.');
say('        Sirve para la pregunta "el cierre referido a otra cosa que no sea el');
say('        puerto o la bahia".');
say();
const SUJETOS = [
  ['PUERTO (o su tipeo)', /\b(PUERTO|PURTO|PEURTO)\s*$/],
  ['BAHIA / RADA / CALETA', /\b(BAHIA|RADA|CALETA)\s*$/],
  ['SECTOR / ZONA / AREA / JURISDICCION', /\b(SECTOR|ZONA|AREA|JURISDICCION|LIMITE|LIMITES)\s*(?:\w+\s*)?$/],
  ['CANAL / ESTERO / GOLFO / LAGO / RIO / BARRA', /\b(CANAL|CANALES|ESTERO|GOLFO|LAGO|RIO|BARRA)\s*(?:\w+\s*)?$/],
  ['CONDICION DE PUERTO', /\bCONDICION\s+DE\s+PUERTO\s*$/],
];
const sujetoDe = (o) => {
  for (const [rot, re] of SUJETOS) if (re.test(o.antes)) return rot;
  return null;
};
const ACT_TOKENS = /\b(NAVEGACION|TRAFICO|ATRAQUE|ZARPE|FONDEO|BUCEO|REMOLQUES?|TRABAJOS?|PESCA|DEPORTES?|DEPORTIV\w+|NAUTICOS?|CARGA|DESCARGA|FAENAS?|ACTIVIDADES?|MOVIMIENTOS?|RECALADA)\b/;
const clasifSujeto = (o) => {
  const s = sujetoDe(o);
  if (s) return `antes: ${s}`;
  if (ACT_TOKENS.test(o.despues)) return 'despues: ACTIVIDAD (cerrado <actividad>)';
  if (ACT_TOKENS.test(o.antes)) return 'antes: ACTIVIDAD (<actividad> cerrada)';
  if (/^PARA\b/.test(o.despues)) return 'despues: PARA <flota> (sujeto elidido)';
  return 'SIN SUJETO IDENTIFICADO por el clasificador';
};
const tSuj = tally(ocurrencias.map(clasifSujeto));
say(`        ${pad('sujeto del cierre', 46)} ${rp('ocurr.', 7)}`);
for (const [k, v] of tSuj) say(`        ${pad(k, 46)} ${rp(v, 7)}`);
say(`        ${cierra('sujetos', tSuj.map(([, v]) => v), ocurrencias.length)}`);
say();
const residuo = ocurrencias.filter(o => clasifSujeto(o) === 'SIN SUJETO IDENTIFICADO por el clasificador');
say(`        RESIDUO DEL CLASIFICADOR: ${residuo.length} ocurrencias. Se listan enteras`);
say('        para que el residuo no se lea como cero:');
{
  const v = new Set();
  for (const o of residuo) { if (v.has(o.ctx)) continue; v.add(o.ctx); say(`            "${o.ctx}"  (ID ${o.f.r.IDRestriccion})`); if (v.size >= 25) break; }
  say(`            (contextos distintos: ${new Set(residuo.map(o => o.ctx)).size}; mostrados ${v.size})`);
}
say();
const actCerrada = ocurrencias.filter(o => /ACTIVIDAD/.test(clasifSujeto(o)));
say(`        >>> CIERRE REFERIDO A UNA ACTIVIDAD Y NO AL PUERTO/BAHIA: ${actCerrada.length} ocurrencias`);
if (actCerrada.length) {
  const o = actCerrada[0];
  say(`            caso citado literal · ID ${o.f.r.IDRestriccion} · ${String(o.f.r.GLBahia).replace(/\s+/g, ' ')}`);
  say(`            ${JSON.stringify(String(o.f.r.Observacion).slice(0, 230))}`);
}
say();

// 3.5 — usos no geograficos de FUERA (el falso positivo ya cazado)
say('  3.5 — USOS NO GEOGRAFICOS. El falso positivo "FUERA DE PARAMETROS", medido');
say('        sobre las 444 y no heredado de la bolsa A:');
const fueraParam = filas.filter(f => /\bFUERA\s+DE\s+PARAMETROS\b/.test(t3(f)));
const fueraCualq = filas.filter(f => /\bFUERA\b/.test(t3(f)));
COMPARACIONES += filas.length * 2;
say(`        registros con "FUERA" en Observacion            : ${fueraCualq.length} / 444`);
say(`        de esos, "FUERA DE PARAMETROS" (NO geografico)  : ${fueraParam.length} / 444`);
if (fueraParam.length) {
  const f = fueraParam[0];
  say(`        caso citado · ID ${f.r.IDRestriccion} · ${String(f.r.GLBahia).replace(/\s+/g, ' ')}`);
  say(`        ${JSON.stringify(String(f.r.Observacion).slice(0, 200))}`);
}
say();
say('  3.6 — VECINO LEXICO QUE NO ES CIERRE: CERRAZON (niebla).');
const cerrazon = filas.filter(f => /\bCERRAZON\w*\b/.test(t3(f)));
say(`        registros con CERRAZON en Observacion : ${cerrazon.length} / 444`);
say(`        de esos, que ADEMAS traen la familia del cierre : ${cerrazon.filter(f => RE_FAM.test(t3(f))).length}`);
say('        >>> /CERRAD[OA]/ NO lo atrapa (no comparte sufijo). Un predicado');
say('            escrito como /CERR/ SI lo atraparia. Se declara el borde.');
if (cerrazon.length) {
  const f = cerrazon[0];
  say(`        caso citado · ID ${f.r.IDRestriccion} · ${JSON.stringify(String(f.r.Observacion).slice(0, 190))}`);
}
say();
say('  3.7 — EL TIPEO, SIN APROXIMACION. Barrido literal de la forma');
say('        /\\b(P[A-Z]{2,6})\\s+CERRAD[OA]S?\\b/ sobre las 444 (mismo de la sesion');
say('        anterior, re-corrido con denominador 444):');
{
  const tipos = [];
  for (const f of filas) {
    const re = /\b(P[A-Z]{2,6})\s+CERRAD[OA]S?\b/g;
    let m; while ((m = re.exec(t3(f))) !== null) tipos.push(m[1]);
    COMPARACIONES++;
  }
  for (const [k, v] of tally(tipos)) say(`        ${rp(v, 4)}  "${k} CERRADO"   ${k === 'PUERTO' ? '<- el criterio SI lo atrapa' : '<- el criterio NO lo atrapa'}`);
  say('        >>> Esto NO es fuzzy matching: es una clase de caracteres explicita.');
  say('            Atrapa cualquier token P?? seguido de CERRADO, y por eso mismo');
  say('            atraparia tambien un token que no sea "puerto". Se declara.');
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (4) LOS TRES EJES, MATERIALMENTE — definiciones declaradas
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(4) LOS TRES EJES MATERIALMENTE PRESENTES — DEFINICIONES DECLARADAS');
hr();
say();
say('  EJE 1 "A QUIEN" = umbral de nave extraible. Implementacion versionada:');
say('        `normalizarRestriccion(r).umbral_ab_fuera != null`, que la sesion');
say('        anterior probo equivalente a "alguno de los once patrones matchea"');
say('        (0 discrepancias en las dos direcciones). Se re-corre el control.');
say('  EJE 2 "DONDE" = zona por campo O por texto.');
say('        campo: /DENTRO|FUERA/ sobre normalizarTexto(AreaRestriccion)');
say('        texto: /\\bDENTRO\\b|\\bFUERA\\b/ sobre n3(Observacion)  <- criterio de');
say('               01_medir_ejes.js:348, importado por forma');
say('        VARIANTE Z2: la misma, restando "FUERA DE PARAMETROS" (no geografico).');
say('  EJE 3 "QUE" = enumera actividad suspendida.');
say('        Q1 = >=1 de los 22 terminos de ACTIVIDADES (reproduce el 122/254');
say('             versionado; 4 de los 22 dan cero en el dato)');
say('        Q2 = Q1 sin CARTAS DE CONTINUIDAD (que la bitacora midio como');
say('             EXCEPCION y no como actividad) — es la definicion PRIMARIA');
say('        Q3 = Q2 union TODAS ("todo tipo de faenas" / "totalidad")');
say();

const umbralOk = (f) => NORMREC.get(K(f)).umbral_ab_fuera != null;
const zonaCampo = (f) => /DENTRO|FUERA/.test(normalizarTexto(f.r.AreaRestriccion));
const zonaTextoBruta = (f) => /\bDENTRO\b|\bFUERA\b/.test(t3(f));
const zonaTextoLimpia = (f) => {
  const t = t3(f).replace(/\bFUERA\s+DE\s+PARAMETROS\b/g, ' ');
  return /\bDENTRO\b|\bFUERA\b/.test(t);
};
const Z1 = (f) => zonaCampo(f) || zonaTextoBruta(f);
const Z2 = (f) => zonaCampo(f) || zonaTextoLimpia(f);
const ACT_SIN_CARTAS = ACTIVIDADES.filter(([rot]) => rot !== 'CARTAS DE CONTINUIDAD');
const Q1 = (f) => ACTIVIDADES.some(([, re]) => re.test(t3(f)));
const Q2 = (f) => ACT_SIN_CARTAS.some(([, re]) => re.test(t3(f)));
const Q3 = (f) => Q2(f) || TODAS.test(t3(f));

// control de equivalencia once patrones <-> umbral_ab_fuera
{
  let disc1 = 0, disc2 = 0;
  for (const f of filas) {
    const tm = OBS_MOTOR.get(K(f));
    const algunPatron = AB_PATTERNS.some(p => p.test(tm));
    const tieneUmbral = umbralOk(f);
    if (algunPatron && !tieneUmbral) disc1++;
    if (!algunPatron && tieneUmbral) disc2++;
    COMPARACIONES += 2;
  }
  say(`  CONTROL once patrones <-> umbral_ab_fuera, sobre las 444:`);
  say(`        patron matchea y el parser NO deja umbral : ${disc1} / 444`);
  say(`        ningun patron y el parser SI deja umbral  : ${disc2} / 444`);
  if (disc1 || disc2) say('        *** HAY DISCREPANCIA — el eje 1 no es equivalente a los once patrones.');
  else say('        >>> 0 y 0. Equivalentes tambien sobre las 444, no solo sobre los 254.');
}
say();

say('  4.1 — LOS TRES EJES SOBRE LAS 444 (cada uno por separado):');
const nU = filas.filter(umbralOk).length;
const nZ1 = filas.filter(Z1).length, nZ2 = filas.filter(Z2).length;
const nQ1 = filas.filter(Q1).length, nQ2 = filas.filter(Q2).length, nQ3 = filas.filter(Q3).length;
COMPARACIONES += filas.length * 6;
say(`        eje 1  umbral extraible ............ ${rp(nU, 4)} / 444   (sin umbral: ${444 - nU})`);
say(`        eje 2  zona Z1 (campo o texto) ..... ${rp(nZ1, 4)} / 444   (sin zona: ${444 - nZ1})`);
say(`        eje 2  zona Z2 (sin falso positivo)  ${rp(nZ2, 4)} / 444   (sin zona: ${444 - nZ2})`);
say(`        eje 3  Q1 (con CARTAS) ............. ${rp(nQ1, 4)} / 444`);
say(`        eje 3  Q2 (sin CARTAS) ............. ${rp(nQ2, 4)} / 444   <- PRIMARIA`);
say(`        eje 3  Q3 (Q2 + "todas") ........... ${rp(nQ3, 4)} / 444`);
say();
say('        CONTROL de reproduccion contra la bitacora versionada (denominador 254):');
say(`          Q1 sobre la bolsa A : ${A.filter(Q1).length} / 254   (la bitacora dice 122)`);
say(`          umbral en bolsa A   : ${A.filter(umbralOk).length} / 254   (la bitacora dice 148)`);
say();
say('        POR QUE Q1 == Q2 — no es un error de copia, se mide:');
{
  const conCartas = filas.filter(f => /\bCARTAS?\s+(?:DE\s+)?CONTINUIDAD\b/.test(t3(f)));
  const soloCartas = conCartas.filter(f => !Q2(f));
  say(`          registros que nombran CARTAS DE CONTINUIDAD    : ${conCartas.length} / 444`);
  say(`          de esos, cuya UNICA "actividad" son las cartas : ${soloCartas.length}`);
  say('          >>> Sacar las cartas del vocabulario no mueve a nadie: ningun registro');
  say('              las nombra solas. Q1 y Q2 coinciden por el DATO, no por definicion.');
}
say();
say('        EL PISO DEL TEXTO — registros sin texto en `Observacion`:');
{
  const vacios = filas.filter(f => !String(f.r.Observacion == null ? '' : f.r.Observacion).trim());
  say(`          Observacion vacia o solo espacios : ${vacios.length} / 444`);
  say(`          de esos, en bolsa A : ${vacios.filter(esA).length} · en bolsa B : ${vacios.filter(f => !esA(f)).length}`);
  say(`          de esos, con zona por CAMPO (unica via que no es texto) : ${vacios.filter(zonaCampo).length}`);
  say('          >>> NINGUNA opcion basada en texto puede capturarlos. Es el techo');
  say('              comun de A, B, C y D y no depende de cual se elija.');
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (5) PUNTO 2 — LAS CUATRO OPCIONES SOBRE LAS 444
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(5) PUNTO 2 — CUANTOS CAPTURA CADA OPCION. DENOMINADOR: 444.');
hr();
say();
say('  DEFINICIONES OPERATIVAS, declaradas. Ninguna se recomienda.');
say('    A1 = el criterio VIGENTE, verbatim: /PUERTO CERRADO|CONDICION DE PUERTO/');
say('         sobre norm(Observacion). Es "lo que hay hoy".');
say('    A2 = el LITERAL solo: /PUERTO CERRADO/ sobre norm(Observacion).');
say('         >>> A1 y A2 no son la misma cosa y el prompt las nombra juntas. La');
say('             diferencia es exactamente el termino "CONDICION DE PUERTO".');
say('    Be = PREDICADO ESTRICTO: familia lexica del cierre en uso DECLARATIVO');
say('         (excluye negacion, condicional/futuro y subordinada temporal de 3.3).');
say('    Ba = PREDICADO AMPLIO: Be union RE_PRED (los cinco predicados versionados,');
say('         que agregan TRAFICO SUSPENDIDO / SE SUSPENDE EL TRAFICO /');
say('         PROHIBICION DE ZARPE, que no son la palabra "cerrado").');
say('    C  = LOS TRES EJES: umbral && Z2 && Q2. (Variantes en 5.5.)');
say('    D  = Ba union C.  (Variante De = Be union C en 5.5.)');
say();

const noDeclarativa = new Set();
for (const o of ocurrencias) {
  const c = claseDe(o);
  if (c === 'NEGACION' || c === 'CONDICIONAL / FUTURO' || c === 'SUBORDINADA TEMPORAL ("una vez cerrado")') {
    noDeclarativa.add(K(o.f) + '|' + o.ctx);
  }
}
// un registro entra a Be si tiene AL MENOS UNA ocurrencia declarativa
const declarativasPorReg = new Map();
for (const o of ocurrencias) {
  const c = claseDe(o);
  const esDecl = !(c === 'NEGACION' || c === 'CONDICIONAL / FUTURO' || c === 'SUBORDINADA TEMPORAL ("una vez cerrado")');
  const k = K(o.f);
  declarativasPorReg.set(k, (declarativasPorReg.get(k) || 0) + (esDecl ? 1 : 0));
}
const Be = (f) => (declarativasPorReg.get(K(f)) || 0) > 0;
const Ba = (f) => Be(f) || RE_PRED.test(t3(f));
const Cc = (f) => umbralOk(f) && Z2(f) && Q2(f);
const Dd = (f) => Ba(f) || Cc(f);
const A1 = (f) => esA(f);
const A2 = (f) => /PUERTO CERRADO/.test(OBS_NORM.get(K(f)));

const OPCIONES = [
  ['A1  criterio vigente (2 literales)', A1, 'lexico'],
  ['A2  literal "PUERTO CERRADO"', A2, 'lexico'],
  ['Be  predicado estricto', Be, 'lexico'],
  ['Ba  predicado amplio', Ba, 'lexico'],
  ['C   los tres ejes', Cc, 'ejes'],
  ['D   Ba union C', Dd, 'mixto'],
];

say('  5.1 — CUANTOS ENTRAN, SOBRE LAS 444');
say();
say(`        ${pad('opcion', 38)} ${rp('entran', 7)} ${rp('quedan fuera', 13)}`);
for (const [rot, fn] of OPCIONES) {
  const n = filas.filter(fn).length;
  COMPARACIONES += filas.length;
  say(`        ${pad(rot, 38)} ${rp(n, 7)} ${rp(444 - n, 13)}   ${cierra(rot, [n, 444 - n], TOTAL)}`);
}
say();

say('  5.2 — CONTRA LOS 254 Y CONTRA LOS 190. Las dos puntas, por opcion.');
say();
say(`        ${pad('opcion', 38)} ${rp('de A(254)', 10)} ${rp('de B(190)', 10)} ${rp('total', 7)}`);
for (const [rot, fn] of OPCIONES) {
  const dA = A.filter(fn).length, dB = B.filter(fn).length;
  say(`        ${pad(rot, 38)} ${rp(dA, 10)} ${rp(dB, 10)} ${rp(dA + dB, 7)}   ${cierra(rot + ' A+B', [dA, dB], filas.filter(fn).length)}`);
}
say();

say('  5.3 — LOS QUE CADA OPCION DEJA AFUERA DE LOS 254, Y POR QUE.');
say('        Causa primaria, disjunta, denominador = los que salen.');
say();
// La causa se decompone POR LO QUE LA OPCION TESTEA. Reportar causas lexicas
// para una opcion de ejes seria el mismo defecto de rotulo que la sesion
// anterior declaro tres veces: el numero bien, la linea que lo presenta mal.
const causaLexica = (f) => {
  const t = t3(f);
  if (!RE_FAM.test(t) && !RE_PRED.test(t)) return 'no trae ninguna forma de cierre ni predicado';
  if (!RE_FAM.test(t)) return 'trae predicado de suspension pero no la palabra cerrado';
  if (!Be(f)) return 'trae la palabra cerrado pero NO en uso declarativo';
  return 'trae cierre declarativo — sale solo por no traer el literal exacto';
};
const causaEjes = (f) => {
  const falta = [];
  if (!umbralOk(f)) falta.push('a-quien');
  if (!Z2(f)) falta.push('donde');
  if (!Q2(f)) falta.push('que');
  return falta.length ? `falta ${falta.join(' + ')}` : 'no falta ninguno (no deberia estar aca)';
};
const causaMixta = (f) => `${causaLexica(f)}  ||  ${causaEjes(f)}`;
const causaFueraDe = (modo) => modo === 'ejes' ? causaEjes : modo === 'mixto' ? causaMixta : causaLexica;
for (const [rot, fn, modo] of OPCIONES) {
  const causaFuera = causaFueraDe(modo);
  const fuera = A.filter(f => !fn(f));
  say(`        ${rot}  —  deja fuera ${fuera.length} de los 254`);
  if (fuera.length === 0) { say('            (ninguno)'); say(); continue; }
  const t = tally(fuera.map(causaFuera));
  for (const [k, v] of t) say(`            ${rp(v, 4)}  ${k}`);
  say(`            ${cierra(rot + ' fuera-de-254', t.map(([, v]) => v), fuera.length)}`);
  const ej = fuera[0];
  say(`            caso · ID ${ej.r.IDRestriccion} · ${String(ej.r.GLBahia).replace(/\s+/g, ' ')}`);
  say(`               ${JSON.stringify(String(ej.r.Observacion).slice(0, 190))}`);
  say();
}

say('  5.4 — LOS QUE CADA OPCION METE DE LOS 190, Y POR QUE ENTRAN.');
say();
const causaEntra = (f) => {
  const t = t3(f);
  if (/\bCERRAD[OA]S?\s+PARA\b/.test(t)) return 'dice "CERRADO PARA ..." (cierre dirigido a flota)';
  if (RE_FAM.test(t)) return 'trae la familia del cierre en otra forma';
  if (RE_PRED.test(t)) return 'trae predicado de suspension (no la palabra cerrado)';
  if (umbralOk(f) && Z2(f) && Q2(f)) return 'entra SOLO por los tres ejes';
  return 'otra';
};
for (const [rot, fn] of OPCIONES) {
  const dentro = B.filter(fn);
  say(`        ${rot}  —  mete ${dentro.length} de los 190`);
  if (dentro.length === 0) { say('            (ninguno)'); say(); continue; }
  const t = tally(dentro.map(causaEntra));
  for (const [k, v] of t) say(`            ${rp(v, 4)}  ${k}`);
  say(`            ${cierra(rot + ' entra-de-190', t.map(([, v]) => v), dentro.length)}`);
  say();
}

say('  >>> Y LA PREMISA DEL PROMPT, AHORA CON NUMERO: de los 89 de la bolsa B que');
say('      dicen "CERRADO PARA", cuantos traen LOS TRES EJES:');
{
  const tres = p89.filter(Cc).length;
  const dos = p89.filter(f => [umbralOk(f), Z2(f), Q2(f)].filter(Boolean).length >= 2).length;
  say(`        de los ${p89.length}: con los TRES ejes ......... ${tres}`);
  say(`        de los ${p89.length}: con al menos DOS ejes ..... ${dos}`);
  say(`        de los ${p89.length}: con umbral ${p89.filter(umbralOk).length} · con zona ${p89.filter(Z2).length} · con actividad ${p89.filter(Q2).length}`);
  say('        >>> El prompt decia "los tres ejes completos" para los 89. El numero');
  say(`            real es ${tres}. La afirmacion no se sostiene tal como venia.`);
}
say();

say('  5.5 — LO QUE MIDE SI UNA OPCION *LIMPIA* O SOLO AMPLIA:');
say('        los 34 de la bolsa A que hoy entran SIN cerrar nada.');
say();
say(`        ${pad('opcion', 38)} ${rp('de los 34 quedan afuera', 25)} ${rp('siguen adentro', 15)}`);
for (const [rot, fn] of OPCIONES) {
  const fuera = p34.filter(f => !fn(f)).length;
  say(`        ${pad(rot, 38)} ${rp(fuera, 25)} ${rp(34 - fuera, 15)}   ${cierra(rot + ' 34', [fuera, 34 - fuera], 34)}`);
}
say();
say('        Y el caso citado de esos 34:');
if (p34.length) {
  const f = p34[0];
  say(`          ID ${f.r.IDRestriccion} · ${String(f.r.GLBahia).replace(/\s+/g, ' ')}`);
  say(`          ${JSON.stringify(String(f.r.Observacion).slice(0, 200))}`);
}
say();

say('  5.6 — QUE LAS BOLSAS CIERREN Y NO SE SOLAPEN SIN DECIRLO — inclusiones');
say('        medidas, no supuestas:');
const inc = (nx, fx, ny, fy) => {
  const viol = filas.filter(f => fx(f) && !fy(f)).length;
  COMPARACIONES += filas.length;
  say(`        ${pad(nx + ' subset de ' + ny, 34)} ${viol === 0 ? 'SI' : `NO — ${viol} violaciones`}`);
  return viol;
};
inc('A2', A2, 'A1', A1);
inc('A2', A2, 'Be', Be);
inc('A1', A1, 'Be', Be);
inc('Be', Be, 'Ba', Ba);
inc('Ba', Ba, 'D', Dd);
inc('C', Cc, 'D', Dd);
say();
say('        SOLAPE DE Ba Y C (los dos componentes de D):');
{
  const soloBa = filas.filter(f => Ba(f) && !Cc(f)).length;
  const soloC = filas.filter(f => !Ba(f) && Cc(f)).length;
  const ambos = filas.filter(f => Ba(f) && Cc(f)).length;
  const ninguno = filas.filter(f => !Ba(f) && !Cc(f)).length;
  say(`          solo Ba ${soloBa} · solo C ${soloC} · ambos ${ambos} · ninguno ${ninguno}`);
  say(`          ${cierra('solape Ba/C', [soloBa, soloC, ambos, ninguno], TOTAL)}`);
  say(`          D = ${soloBa + soloC + ambos}`);
}
say();

say('  5.7 — VARIANTES DE C Y DE D, porque la definicion de los ejes no es unica.');
say('        Se dan todas para que el owner vea la sensibilidad, sin elegir ninguna.');
say();
const VAR = [
  ['C  umbral && Z2 && Q2  (primaria)', (f) => umbralOk(f) && Z2(f) && Q2(f)],
  ['C  umbral && Z1 && Q1  (Z y Q laxas)', (f) => umbralOk(f) && Z1(f) && Q1(f)],
  ['C  umbral && Z2 && Q3  (Q con "todas")', (f) => umbralOk(f) && Z2(f) && Q3(f)],
  ['C  umbral && Z2 && Q1  (Q con CARTAS)', (f) => umbralOk(f) && Z2(f) && Q1(f)],
];
for (const [rot, fn] of VAR) {
  const n = filas.filter(fn).length;
  const nD = filas.filter(f => Ba(f) || fn(f)).length;
  const nDe = filas.filter(f => Be(f) || fn(f)).length;
  say(`        ${pad(rot, 40)} C=${rp(n, 4)}   D(Ba)=${rp(nD, 4)}   D(Be)=${rp(nDe, 4)}`);
}
say();
say('        >>> Si dos variantes dan el MISMO numero no es un error de copia: se');
say('            mide abajo cuantos registros mueve cada relajacion por separado.');
say(`            Z1 sin Z2 (solo "fuera de parametros")  : ${filas.filter(f => Z1(f) && !Z2(f)).length} / 444`);
say(`            de esos, que ademas tienen umbral y Q2  : ${filas.filter(f => Z1(f) && !Z2(f) && umbralOk(f) && Q2(f)).length}`);
say(`            Q1 sin Q2 (solo cartas de continuidad)  : ${filas.filter(f => Q1(f) && !Q2(f)).length} / 444`);
say(`            Q3 sin Q2 (solo dice "todas")           : ${filas.filter(f => Q3(f) && !Q2(f)).length} / 444`);
say(`            de esos, que ademas tienen umbral y Z2  : ${filas.filter(f => Q3(f) && !Q2(f) && umbralOk(f) && Z2(f)).length}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (5.8) LA QUINTA FORMA QUE EL DATO SUGIERE — OBSERVACION, NO PROPUESTA
// ─────────────────────────────────────────────────────────────────────────────
say('  5.8 — UNA QUINTA FORMA QUE EL DATO SUGIERE. Se describe con su conteo y');
say('        NO se recomienda. Sale de 3.4: el sujeto del cierre esta escrito.');
say();
say('        E = predicado declarativo CUYO SUJETO ES GEOGRAFICO o elidido tras');
say('            "PARA <flota>". Es Be MENOS los registros donde lo unico cerrado');
say('            es una actividad. No exige literal fijo ni los tres ejes.');
say();
{
  const geo = new Map(), act = new Map();
  for (const o of ocurrencias) {
    const c = claseDe(o);
    if (c === 'NEGACION' || c === 'CONDICIONAL / FUTURO' || c === 'SUBORDINADA TEMPORAL ("una vez cerrado")') continue;
    const s = clasifSujeto(o);
    const k = K(o.f);
    if (/ACTIVIDAD/.test(s)) act.set(k, (act.get(k) || 0) + 1);
    else if (/SIN SUJETO/.test(s)) { /* residuo: no cuenta ni de un lado ni del otro */ }
    else geo.set(k, (geo.get(k) || 0) + 1);
  }
  const E = (f) => (geo.get(K(f)) || 0) > 0;
  const soloAct = filas.filter(f => Be(f) && !E(f) && (act.get(K(f)) || 0) > 0);
  const niUno = filas.filter(f => Be(f) && !E(f) && (act.get(K(f)) || 0) === 0);
  const nE = filas.filter(E).length;
  COMPARACIONES += filas.length * 2;
  say(`        E entran ................................. ${rp(nE, 4)} / 444`);
  say(`        Be entran ................................ ${rp(filas.filter(Be).length, 4)} / 444`);
  say(`        Be que E deja afuera ..................... ${rp(filas.filter(f => Be(f) && !E(f)).length, 4)}`);
  say(`           de esos, solo se cierra una ACTIVIDAD . ${rp(soloAct.length, 4)}`);
  say(`           de esos, residuo sin sujeto clasificado ${rp(niUno.length, 4)}`);
  say(`        ${cierra('E vs Be', [nE, soloAct.length, niUno.length], filas.filter(Be).length)}`);
  say(`        de A(254) : ${A.filter(E).length}   de B(190) : ${B.filter(E).length}`);
  say(`        de los 34 que hoy no cierran nada, quedan afuera : ${p34.filter(f => !E(f)).length} / 34`);
  say(`        permiten umbral: ${filas.filter(f => E(f) && umbralOk(f)).length} / ${nE}  ·  zona Z2: ${filas.filter(f => E(f) && Z2(f)).length} / ${nE}`);
  if (soloAct.length) {
    const f = soloAct[0];
    say(`        caso de los que E deja afuera · ID ${f.r.IDRestriccion} · ${String(f.r.GLBahia).replace(/\s+/g, ' ')}`);
    say(`        ${JSON.stringify(String(f.r.Observacion).slice(0, 200))}`);
  }
  say('        >>> Se consigna porque el dato la trae escrita, no porque convenga.');
  say('            Su costo esta a la vista: depende de un clasificador de sujeto');
  say('            que en 3.4 dejo 2 ocurrencias sin clasificar sobre 334.');
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (6) PUNTO 3 — LA RED SECUNDARIA
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(6) PUNTO 3 — LA RED SECUNDARIA DE LA OPCION D, DIMENSIONADA');
hr();
say();
say('    La red = los que entran por EJES y NO por predicado. Es lo que D agrega');
say('    sobre B. Si es cero, la red no captura nada y la opcion D es igual a B.');
say();
for (const [rotB, fnB] of [['Ba (amplio)', Ba], ['Be (estricto)', Be]]) {
  say(`    ---- red contra ${rotB} ----`);
  const red3 = filas.filter(f => Cc(f) && !fnB(f));
  const dosDeTres = (f) => [umbralOk(f), Z2(f), Q2(f)].filter(Boolean).length >= 2;
  const red2 = filas.filter(f => dosDeTres(f) && !fnB(f));
  COMPARACIONES += filas.length * 2;
  const ids = (arr) => new Set(arr.map(f => f.r.IDRestriccion));
  say(`      con LOS TRES ejes y sin predicado  : ${red3.length} / 444 filas · ${ids(red3).size} restricciones distintas`);
  say(`      con DOS de los tres y sin predicado: ${red2.length} / 444 filas · ${ids(red2).size} restricciones distintas`);
  say(`      IDRestriccion de la red de TRES: ${[...ids(red3)].sort((a, b) => a - b).join(', ') || '(ninguno)'}`);
  say(`      IDRestriccion de la red de DOS : ${[...ids(red2)].sort((a, b) => a - b).join(', ') || '(ninguno)'}`);
  say('      >>> La fila es captura x registro. Una misma restriccion vista en cinco');
  say('          capturas son cinco filas y UNA restriccion. Los dos numeros van juntos.');
  say();
  const listar = (rot, arr, max) => {
    say(`      ${rot} — ${arr.length} registro(s):`);
    if (arr.length === 0) { say('        (ninguno) — la red no captura nada por esta via.'); return; }
    let i = 0;
    for (const f of arr) {
      const nr = NORMREC.get(K(f));
      say(`        ID ${f.r.IDRestriccion} · ${String(f.r.GLBahia).replace(/\s+/g, ' ')} · ${f.cap}`);
      say(`           umbral=${nr.umbral_ab_fuera} zonaCampo=${zonaCampo(f)} zonaTexto=${zonaTextoLimpia(f)} act=${Q2(f)}`);
      say(`           ${JSON.stringify(String(f.r.Observacion).slice(0, 210))}`);
      if (++i >= max) { say(`        (mostrados ${max} de ${arr.length})`); break; }
    }
  };
  listar('TRES EJES', red3, 20);
  say();
  listar('DOS DE TRES', red2, 12);
  say();
}
say('    Y el caso que el prompt nombra — el tipeo de Puerto Montt:');
{
  const pm = filas.filter(f => /\bPURTO\s+CERRAD[OA]S?\b/.test(t3(f)));
  say(`      registros con "PURTO CERRADO" : ${pm.length} / 444`);
  for (const f of pm) {
    say(`        ID ${f.r.IDRestriccion} · ${String(f.r.GLBahia).replace(/\s+/g, ' ')}`);
    say(`           A1=${A1(f)} A2=${A2(f)} Be=${Be(f)} Ba=${Ba(f)} C=${Cc(f)} D=${Dd(f)}`);
    say(`           ${JSON.stringify(String(f.r.Observacion).slice(0, 230))}`);
  }
  say('      >>> Entra o no entra por opcion, arriba. Sin aproximacion de ningun tipo.');
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (7) PUNTO 4 — IMPLEMENTABILIDAD
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(7) PUNTO 4 — DE LOS QUE ENTRAN CON CADA OPCION: UMBRAL Y ZONA');
hr();
say();
say('    `null` de umbral esta SOBRECARGADO (medido por la sesion anterior). Se');
say('    parte en dos, con la rama del parser que lo produce:');
say('      SIN UMBRAL A PROPOSITO = el texto dice a quien alcanza sin numero:');
say('         /TODO TIPO DE NAVES/ (:69, bloqueo_total)');
say('         /EMBARCACIONES MENORES|NAVES MENORES/ sin numero (:92)');
say('         /TODO TIPO DE EMBARCACIONES/ (:95)');
say('      NO SE PUDO LEER = umbral null y ninguna de esas tres ramas.');
say();
const ramaProposito = (f) => {
  const tm = OBS_MOTOR.get(K(f));
  if (/TODO\s+TIPO\s+DE\s+NAVES/.test(tm)) return 'bloqueo_total (:69)';
  if (/EMBARCACIONES\s+MENORES/.test(tm) || /NAVES\s+MENORES/.test(tm)) return 'MENORES sin numero (:92)';
  if (/TODO\s+TIPO\s+DE\s+EMBARCACIONES/.test(tm)) return 'TODO TIPO DE EMBARCACIONES (:95)';
  return null;
};
const RE_DIGITO = /\d/;
const causaSinUmbral = (f) => {
  const r = ramaProposito(f);
  if (r) return 'CIERRE SIN UMBRAL — ' + r;
  if (!RE_DIGITO.test(OBS_MOTOR.get(K(f)))) return 'NO SE PUDO LEER — el texto no tiene ningun digito';
  return 'NO SE PUDO LEER — hay digitos pero ninguno junto a unidad de los 11 patrones';
};

for (const [rot, fn] of OPCIONES) {
  const dentro = filas.filter(fn);
  const N = dentro.length;
  say(`    ---- ${rot} · denominador ${N} ----`);
  if (N === 0) { say('      (bolsa vacia)'); say(); continue; }
  const conU = dentro.filter(umbralOk).length;
  const sinU = dentro.filter(f => !umbralOk(f));
  const proposito = sinU.filter(f => ramaProposito(f) !== null).length;
  const hueco = sinU.length - proposito;
  say(`      permiten extraer umbral .................. ${rp(conU, 4)} / ${N}`);
  say(`      sin umbral ............................... ${rp(sinU.length, 4)} / ${N}`);
  say(`         de esos, CIERRE SIN UMBRAL (a proposito) ${rp(proposito, 4)}`);
  say(`         de esos, NO SE PUDO LEER (hueco real) .. ${rp(hueco, 4)}`);
  say(`      ${cierra(rot + ' umbral', [conU, proposito, hueco], N)}`);
  const tc = tally(sinU.map(causaSinUmbral));
  for (const [k, v] of tc) say(`           ${rp(v, 4)}  ${k}`);
  say();
  const zc = dentro.filter(zonaCampo).length;
  const zt = dentro.filter(zonaTextoLimpia).length;
  const zsolo = dentro.filter(f => !zonaCampo(f) && zonaTextoLimpia(f)).length;
  const znada = dentro.filter(f => !Z2(f)).length;
  say(`      zona por CAMPO (AreaRestriccion) ......... ${rp(zc, 4)} / ${N}`);
  say(`      zona por TEXTO (sin falso positivo) ...... ${rp(zt, 4)} / ${N}`);
  say(`      zona SOLO por texto ...................... ${rp(zsolo, 4)} / ${N}`);
  say(`      SIN ZONA por ninguna via ................. ${rp(znada, 4)} / ${N}`);
  say(`      ${cierra(rot + ' zona', [dentro.filter(Z2).length, znada], N)}`);
  say();
  const niU_niZ = dentro.filter(f => !umbralOk(f) && !Z2(f) && ramaProposito(f) === null).length;
  say(`      >>> NI A QUIEN NI DONDE (no se puede armar el aviso): ${niU_niZ} / ${N}`);
  say();
}
say('    ---- POR QUE "NO SE PUDO LEER" BAJA DE 37 (A1) A 19 (Ba). Medido, no');
say('         estimado: cuanto de esa baja lo explican los 34 que no cierran nada.');
{
  const noLeible = (f) => !umbralOk(f) && ramaProposito(f) === null;
  const en34 = p34.filter(noLeible).length;
  const enA1 = A.filter(noLeible).length;
  const enBa = filas.filter(f => Ba(f) && noLeible(f)).length;
  say(`      no-leibles dentro de A1 (254) ................ ${enA1}`);
  say(`      no-leibles dentro de los 34 que no cierran ... ${en34}`);
  say(`      no-leibles dentro de Ba (327) ................ ${enBa}`);
  say(`      >>> de los ${enA1} no-leibles de A1, ${en34} son de los 34. Los otros`);
  say(`          ${enA1 - en34} salen de A1 por otra via o siguen adentro de Ba.`);
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (8) OBSERVACIONES DEL DATO — insumos numericos
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(8) INSUMOS PARA OBSERVACIONES DEL DATO');
hr();
say();
say('  8.1 — CLASES DE VALOR DE `Observacion` sobre las 444, sin colapsar:');
{
  const clase = (v) => v === undefined ? 'AUSENTE' : v === null ? 'null' : v === '' ? '""' : v === 0 ? '0 (number)' : v === '0' ? '"0" (string)' : typeof v;
  const t = tally(filas.map(f => clase(f.r.Observacion)));
  for (const [k, v] of t) say(`        ${pad(k, 14)} ${rp(v, 4)} / 444`);
  say(`        ${cierra('clases de Observacion', t.map(([, v]) => v), TOTAL)}`);
}
say();
say('  8.2 — CLASES DE VALOR DE `AreaRestriccion` sobre las 444:');
{
  const clase = (v) => v === undefined ? 'AUSENTE' : v === null ? 'null' : v === '' ? '""' : 'valor';
  const t = tally(filas.map(f => clase(f.r.AreaRestriccion)));
  for (const [k, v] of t) say(`        ${pad(k, 14)} ${rp(v, 4)} / 444`);
  say(`        ${cierra('clases de AreaRestriccion', t.map(([, v]) => v), TOTAL)}`);
}
say();
say('  8.3 — RUIDO DE FUENTE, medido sobre las 444 (no heredado):');
{
  const conta = (rot, fn) => { const n = filas.filter(fn).length; COMPARACIONES += filas.length; say(`        ${pad(rot, 42)} ${rp(n, 4)} / 444`); };
  conta('doble espacio o mas en Observacion', f => /\s{2,}/.test(String(f.r.Observacion || '')));
  conta('TAB en Observacion', f => /\t/.test(String(f.r.Observacion || '')));
  conta('TAB en GLBahia', f => /\t/.test(String(f.r.GLBahia || '')));
  conta('comillas escapadas en Observacion', f => /"/.test(String(f.r.Observacion || '')));
  conta('"CONDICIONDE" pegado', f => /CONDICIONDE/.test(norm(f.r.Observacion)));
  conta('"RESTRICCIONESDE" pegado', f => /RESTRICCIONESDE/.test(norm(f.r.Observacion)));
  conta('entities HTML en Observacion', f => /&(LT|GT|AMP|QUOT);/i.test(String(f.r.Observacion || '')));
  conta('entities HTML en NaveRecibe', f => /&(LT|GT|AMP|QUOT);/i.test(String(f.r.NaveRecibe || '')));
  conta('acento presente en Observacion', f => /[À-ÿ]/.test(String(f.r.Observacion || '')));
}
say();
say('  8.4 — ¿CAMBIA ALGUNA OPCION SI NO SE NORMALIZA? Control de la normalizacion:');
{
  const crudo = (s) => String(s == null ? '' : s).toUpperCase();
  let dif = 0;
  for (const f of filas) {
    const a = CRITERIO.test(norm(f.r.Observacion));
    const b = CRITERIO.test(crudo(f.r.Observacion));
    if (a !== b) dif++;
    COMPARACIONES++;
  }
  say(`        A1 con norm vs A1 con solo toUpperCase : ${dif} registros cambian de bolsa`);
  let dif2 = 0;
  for (const f of filas) {
    const a = RE_FAM.test(n3(f.r.Observacion));
    const b = RE_FAM.test(crudo(f.r.Observacion));
    if (a !== b) dif2++;
    COMPARACIONES++;
  }
  say(`        familia del cierre, n3 vs toUpperCase   : ${dif2} registros cambian`);
}
say();
say('  8.5 — LA FAMILIA DEL CIERRE CONTRA LOS TRES CAMPOS NUMERICOS:');
{
  const fam = filas.filter(f => RE_FAM.test(t3(f)));
  const conBandera = fam.filter(f => f.r.paralizar !== 0 || f.r.nzarpe !== 0 || f.r.nrecalada !== 0).length;
  say(`        registros con familia del cierre en Observacion : ${fam.length} / 444`);
  say(`          de esos, con algun campo numerico != 0        : ${conBandera}`);
  say(`          de esos, con los tres en 0                    : ${fam.length - conBandera}`);
  say(`        ${cierra('familia vs banderas', [conBandera, fam.length - conBandera], fam.length)}`);
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// CIERRE
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('CONTROLES FINALES');
hr();
say(`  comparaciones efectivas : ${COMPARACIONES}`);
if (COMPARACIONES === 0) morir(6, 'cero comparaciones efectivas');
say(`  controles de suma       : ${FALLOS.length === 0 ? 'todos CIERRAN' : FALLOS.length + ' FALLARON'}`);
for (const x of FALLOS) say(`      *** ${x}`);
say('  insumos tocados         : ninguno (solo lectura). Nada que restaurar.');
say('  motor BRE               : require() de sitport-parser.js. NO modificado.');
if (FALLOS.length) morir(5, 'hay controles de suma que no cierran');
say();
say('exit 0');
hr();
volcar();
