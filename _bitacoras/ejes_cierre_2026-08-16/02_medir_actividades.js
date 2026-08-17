// _bitacoras/ejes_cierre_2026-08-16/02_medir_actividades.js
//
// EJES-DEL-CIERRE — segunda pasada. Mide el TERCER EJE ("que queda suspendido"),
// el cruce con los perfiles de patron, la convivencia de estado y causa, y la
// bolsa B (los 190).
//
// LA LISTA DE ACTIVIDADES SALE DEL DATO: cada termino de VOCABULARIO viene de
// la tabla de frecuencias que imprimio 01_medir_ejes.txt (4.1) o del volcado de
// clausulas (4.2). Ninguno se trajo de afuera. Los terminos que el prompt
// nombraba y que NO estan en el dato se miden igual y se declaran en cero.
//
// NO propone regla. NO toca el motor. NO sale a la API. Cuenta.
//
// Controles que ABORTAN:
//   exit 3  la particion no reproduce 254/190
//   exit 4  derivarCondicion no se pudo extraer de sitport-routes.js
//   exit 5  alguna bolsa declarada no cierra contra su denominador

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const DIR = path.join(RAIZ, 'sondaje-sitport');
const PARSER = path.join(RAIZ, 'src', 'services', 'sitport-parser.js');
const RUTAS = path.join(RAIZ, 'src', 'routes', 'sitport-routes.js');
const SALIDA = path.resolve(__dirname, '02_medir_actividades.txt');

const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
const volcar = () => fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
const abortar = (code, msg) => { say(); say(`*** CONTROL FALLIDO — ${msg}`); say(`*** exit ${code}`); volcar(); process.exit(code); };
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);
const tally = (arr) => { const m = new Map(); for (const v of arr) m.set(v, (m.get(v) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); };

const { normalizarRestriccion } = require(PARSER);

// `derivarCondicion` se EXTRAE del archivo como texto y se ejecuta ese texto,
// misma tecnica que la sesion anterior. No se reescribe.
const srcRutas = fs.readFileSync(RUTAS, 'utf8');
const iIni = srcRutas.indexOf('function derivarCondicion(r) {');
if (iIni === -1) abortar(4, 'no se encontro `function derivarCondicion(r) {` en sitport-routes.js');
const resto = srcRutas.slice(iIni);
const mFin = resto.match(/\r?\n\}\r?\n/);
if (!mFin) abortar(4, 'no se encontro el cierre de derivarCondicion');
const cuerpo = resto.slice(0, mFin.index + mFin[0].length);
let derivarCondicion;
try { derivarCondicion = eval('(' + cuerpo.replace(/^function derivarCondicion/, 'function') + ')'); }
catch (e) { abortar(4, 'derivarCondicion no evaluo: ' + e.message); }
if (typeof derivarCondicion !== 'function') abortar(4, 'derivarCondicion no es funcion');

// ─────────────────────────────────────────────────────────────────────────────
const EXCLUIDOS = ['bahias_sitport.json'];
const capturas = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.json') && !EXCLUIDOS.includes(f))
  .map(f => ({ f, mtime: fs.statSync(path.join(DIR, f)).mtime, recs: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).recordsets[0] || [] }))
  .sort((a, b) => a.mtime - b.mtime);
const filas = [];
for (const c of capturas) for (const r of c.recs) filas.push({ cap: c.f, r });
const TOTAL = filas.length;

const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const deEnt = (s) => String(s == null ? '' : s).replace(/&LT;/gi, '<').replace(/&GT;/gi, '>').replace(/&AMP;/gi, '&').replace(/&QUOT;/gi, '"');
const n1 = (s) => norm(deEnt(s));
const n3 = (s) => n1(s).replace(/[^A-Z0-9Ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

const CRITERIO = /PUERTO CERRADO|CONDICION\s*DE\s*PUERTO/;
const A = filas.filter(({ r }) => CRITERIO.test(norm(r.Observacion)));
const B = filas.filter(({ r }) => !CRITERIO.test(norm(r.Observacion)));

hr();
say('EJES DEL CIERRE — PASADA 2: EJE "QUE QUEDA SUSPENDIDO", PERFILES, CONVIVENCIA, BOLSA B');
say('Instrumento: _bitacoras/ejes_cierre_2026-08-16/02_medir_actividades.js');
say(`Corrida: ${new Date().toISOString()} · sin salir a la API`);
say(`Universo ${TOTAL} · bolsa A ${A.length} · bolsa B ${B.length}`);
hr();
if (TOTAL !== 444 || A.length !== 254 || B.length !== 190) abortar(3, `particion NO reproducida: ${TOTAL}/${A.length}/${B.length}`);
say();

// ═════════════════════════════════════════════════════════════════════════════
// EJE 3 — QUE QUEDA SUSPENDIDO
// ═════════════════════════════════════════════════════════════════════════════
hr();
say('(5) EJE "QUE QUEDA SUSPENDIDO" — DENOMINADOR 254');
hr();
say();
say('  PROCEDENCIA DE CADA TERMINO: al lado va su frecuencia en la tabla 4.1 de');
say('  01_medir_ejes.txt, que es de donde salio. Los tres del prompt que NO estaban');
say('  en esa tabla se miden igual y se declaran.');
say();

// VOCABULARIO — cada entrada: [rotulo, regex sobre N3, procedencia]
const ACTIVIDADES = [
  ['BUCEO',                     /\bBUCEO\b/,                                   '4.1 BUCEO:50'],
  ['CENTROS DE CULTIVO',        /\bCENTROS?\s+DE\s+CULTIVOS?\b/,               '4.1 CENTROS:36 CULTIVOS:29'],
  ['REMOLQUE',                  /\bREMOLQUES?\b/,                              '4.1 REMOLQUES:29 REMOLQUE:18'],
  ['FAENAS ACUICOLAS',          /\bACUICOLAS?\b/,                              '4.1 ACUICOLAS:5'],
  ['TRABAJOS (generico)',       /\bTRABAJOS?\b/,                               '4.1 TRABAJOS:48 TRABAJO:5'],
  ['NAVEGACION',                /\bNAVEGACION\b/,                              '4.1 NAVEGACION:22'],
  ['TRAFICO',                   /\bTRAFICO\b/,                                 '4.1 TRAFICO:18'],
  ['ZARPE',                     /\bZARPES?\b/,                                 '4.1 ZARPES:5'],
  ['ATRAQUE',                   /\bATRAQUE\b/,                                 '4.1 ATRAQUE:7'],
  ['CARGA / DESCARGA',          /\b(?:CARGA|DESCARGA)\b/,                      '4.1 CARGA:6 DESCARGA:6'],
  ['VIVERES / PERTRECHOS',      /\b(?:VIVERES|PERTRECHOS)\b/,                  '4.1 VIVERES:6 PERTRECHOS:6'],
  ['FONDEO',                    /\bFONDEOS?\b|\bFONDEADAS?\b/,                 '4.1 FONDEOS:6 FONDEADAS:4'],
  ['DEPORTIVAS / DEPORTES',     /\bDEPORTIV[AO]S?\b|\bDEPORTES\b/,             '4.1 DEPORTIVAS:7 DEPORTES:6'],
  ['NAUTICOS',                  /\bNAUTICOS?\b/,                               '4.1 NAUTICOS:6'],
  ['PESCA',                     /\bPESCA\b/,                                   '4.1 PESCA:6'],
  ['CONECTIVIDAD',              /\bCONECTIVIDAD\b/,                            '4.1 CONECTIVIDAD:4'],
  ['CARTAS DE CONTINUIDAD',     /\bCARTAS?\s+(?:DE\s+)?CONTINUIDAD\b/,         '4.1 CARTAS:42 CONTINUIDAD:38'],
  ['TRANSFERENCIA',             /\bTRANSFERENCIA\b/,                           'del prompt — NO estaba en 4.1'],
  ['PESCA ARTESANAL',           /\bARTESANAL(?:ES)?\b/,                        'del prompt — NO estaba en 4.1'],
  ['RECREATIVAS',               /\bRECREATIV[AO]S?\b/,                         'del prompt — NO estaba en 4.1'],
  ['TURISTICAS',                /\bTURISTIC[AO]S?\b/,                          'del prompt — NO estaba en 4.1'],
  ['ACTIVIDADES MARITIMAS PORT.', /\bACTIVIDADES?\s+MARITIMAS?\b/,             'del prompt — NO estaba en 4.1'],
];

const MARCADOR_SUSP = /\bSUSPEND\w*|\bPROHIB\w*|\bRESTRING\w*|\bCANCELA\w*|\bCERRAD[OA]S?\b|\bQUEDAN?\b/;
const TODAS = /\bTODO\s+TIPO\s+DE\s+FAENAS?\b|\bTOTALIDAD\b|\bTODAS?\s+LAS\s+(?:ACTIVIDADES|FAENAS)\b/;

const obsN3 = new Map();
for (const f of filas) obsN3.set(`${f.cap}#${f.r.IDRestriccion}`, n3(f.r.Observacion));
const K = (f) => `${f.cap}#${f.r.IDRestriccion}`;

say('  5.1 — CONTEO POR ACTIVIDAD, sobre los 254 (mencion en el texto):');
say(`        ${pad('actividad', 30)} ${rpad('en A', 6)} ${rpad('con marcador', 13)}  procedencia`);
const faltantes = [];
for (const [rot, re, proc] of ACTIVIDADES) {
  const hits = A.filter(f => re.test(obsN3.get(K(f))));
  const conM = hits.filter(f => MARCADOR_SUSP.test(obsN3.get(K(f))));
  say(`        ${pad(rot, 30)} ${rpad(hits.length, 6)} ${rpad(conM.length, 13)}  ${proc}`);
  if (hits.length === 0) faltantes.push(rot);
}
say();
if (faltantes.length) {
  say('        *** TERMINOS CON CERO APARICIONES EN LA BOLSA A:');
  for (const t of faltantes) say(`            ${t}`);
  say('        Se declaran en cero, no como "no aplicable". Todos vienen del prompt,');
  say('        no del dato — la tabla 4.1 no los tenia.');
  say();
  say('        CONTROL: ¿aparecen en ALGUN lugar de las seis capturas, en cualquier campo?');
  for (const rot of faltantes) {
    const re = ACTIVIDADES.find(a => a[0] === rot)[1];
    const enTodoCampo = filas.filter(f => {
      const r = f.r;
      return Object.values(r).some(v => typeof v === 'string' && re.test(n3(v)));
    });
    say(`            ${pad(rot, 30)} ${rpad(enTodoCampo.length, 4)} / 444 registros (cualquier campo)`);
    for (const f of enTodoCampo.slice(0, 3)) {
      const campo = Object.keys(f.r).find(k => typeof f.r[k] === 'string' && re.test(n3(f.r[k])));
      say(`                ID ${f.r.IDRestriccion} · campo ${campo} = ${JSON.stringify(String(f.r[campo]).slice(0, 110))}`);
    }
  }
  say();
}

say('  5.2 — ¿CUANTOS ENUMERAN ACTIVIDADES Y CUANTOS NO?');
const actividadesDe = (f) => ACTIVIDADES.filter(([, re]) => re.test(obsN3.get(K(f)))).map(([rot]) => rot);
const conAct = A.filter(f => actividadesDe(f).length > 0);
const sinAct = A.filter(f => actividadesDe(f).length === 0);
say(`        enumeran al menos una actividad : ${conAct.length} / 254`);
say(`        no nombran ninguna              : ${sinAct.length} / 254`);
say(`        suma                            : ${conAct.length + sinAct.length} / 254 ${conAct.length + sinAct.length === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();
say('        CUANTAS ACTIVIDADES POR REGISTRO:');
let s52 = 0;
for (const [k, v] of tally(A.map(f => String(actividadesDe(f).length)))) { say(`          ${rpad(k, 3)} actividad(es)  ${rpad(v, 4)} / 254`); s52 += v; }
say(`          ${pad('suma', 17)} ${rpad(s52, 4)} / 254 ${s52 === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  5.3 — NOMBRAR ALGUNAS vs SUSPENDER TODO.');
say('        "dice TODO/TOTALIDAD" = /TODO TIPO DE FAENAS|TOTALIDAD|TODAS LAS (ACTIVIDADES|FAENAS)/');
const diceTodo = A.filter(f => TODAS.test(obsN3.get(K(f))));
const nombraSinTodo = A.filter(f => actividadesDe(f).length > 0 && !TODAS.test(obsN3.get(K(f))));
const todoSinNombrar = A.filter(f => TODAS.test(obsN3.get(K(f))) && actividadesDe(f).length === 0);
const niUnoNiOtro = A.filter(f => actividadesDe(f).length === 0 && !TODAS.test(obsN3.get(K(f))));
const ambos = A.filter(f => actividadesDe(f).length > 0 && TODAS.test(obsN3.get(K(f))));
say(`        NOMBRAN actividades y NO dicen "todo"      : ${nombraSinTodo.length} / 254`);
say(`        NOMBRAN actividades Y ADEMAS dicen "todo"  : ${ambos.length} / 254`);
say(`        dicen "todo" SIN nombrar ninguna           : ${todoSinNombrar.length} / 254`);
say(`        ni nombran ni dicen "todo"                 : ${niUnoNiOtro.length} / 254`);
say(`        suma                                       : ${nombraSinTodo.length + ambos.length + todoSinNombrar.length + niUnoNiOtro.length} / 254`);
if (nombraSinTodo.length + ambos.length + todoSinNombrar.length + niUnoNiOtro.length !== 254) abortar(5, 'la bolsa de 5.3 no cierra en 254');
say(`        (total que dicen "todo": ${diceTodo.length})`);
say();
say('        LOS QUE DICEN "TODO/TOTALIDAD" — clausulas distintas:');
const clausTodo = [];
for (const f of diceTodo) {
  const t = obsN3.get(K(f));
  const m = t.match(/.{0,45}(?:TODO TIPO DE FAENAS?|TOTALIDAD|TODAS? LAS (?:ACTIVIDADES|FAENAS)).{0,55}/);
  if (m) clausTodo.push(m[0].trim());
}
for (const [k, v] of tally(clausTodo)) say(`          ${rpad(v, 4)}  ${k}`);
say();

say('  5.4 — FORMAS DISTINTAS DE ENUMERAR. Firma = conjunto ordenado de actividades.');
const firmas = tally(A.map(f => { const a = actividadesDe(f); return a.length ? a.slice().sort().join(' + ') : '(ninguna)'; }));
say(`        firmas distintas: ${firmas.length}`);
let s54 = 0;
for (const [k, v] of firmas) { say(`          ${rpad(v, 4)}  ${k}`); s54 += v; }
say(`          ${rpad(s54, 4)}  suma ${s54 === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();

say('  5.5 — POLARIDAD: las clausulas de CARTAS DE CONTINUIDAD, que no es una');
say('        actividad sino una EXCEPCION. Se separan SE ACEPTAN de NO SE ACEPTAN.');
const reCartas = /\bCARTAS?\s+(?:DE\s+)?CONTINUIDAD\b/;
const conCartas = A.filter(f => reCartas.test(obsN3.get(K(f))));
const clausCartas = [];
for (const f of conCartas) {
  const t = obsN3.get(K(f));
  const m = t.match(/.{0,30}CARTAS?\s+(?:DE\s+)?CONTINUIDAD.{0,25}/);
  if (m) clausCartas.push(m[0].trim());
}
say(`        registros con la frase: ${conCartas.length} / 254`);
for (const [k, v] of tally(clausCartas)) say(`          ${rpad(v, 4)}  ${k}`);
const noAceptan = conCartas.filter(f => /NO SE (?:ACEPTAN|RECEPCIONAN)/.test(obsN3.get(K(f)))).length;
const siAceptan = conCartas.filter(f => /(?<!NO )SE (?:ACEPTAN|RECEPCIONAN)/.test(obsN3.get(K(f))) && !/NO SE (?:ACEPTAN|RECEPCIONAN)/.test(obsN3.get(K(f)))).length;
say(`        NO se aceptan : ${noAceptan}   ·   SI se aceptan : ${siAceptan}   ·   suma ${noAceptan + siAceptan} / ${conCartas.length}`);
say();

// ═════════════════════════════════════════════════════════════════════════════
// EJE 4 — PERFILES
// ═════════════════════════════════════════════════════════════════════════════
hr();
say('(6) CRUCE CON LOS PERFILES DE PATRON — DENOMINADOR 254');
hr();
say();
say('  MAPEO DECLARADO actividad -> perfil. Lo AMBIGUO se marca y NO se resuelve.');
say('    comercial       : NAVEGACION, TRAFICO, ZARPE, ATRAQUE, CARGA/DESCARGA,');
say('                      VIVERES/PERTRECHOS, FONDEO, CONECTIVIDAD');
say('    acuicultura     : CENTROS DE CULTIVO, FAENAS ACUICOLAS');
say('    pesca artesanal : PESCA');
say('    deportivo       : DEPORTIVAS/DEPORTES, NAUTICOS');
say('    AMBIGUOS (no se asignan): BUCEO, REMOLQUE, TRABAJOS (generico),');
say('                      CARTAS DE CONTINUIDAD');
say();
const MAPA = {
  'NAVEGACION': ['comercial'], 'TRAFICO': ['comercial'], 'ZARPE': ['comercial'],
  'ATRAQUE': ['comercial'], 'CARGA / DESCARGA': ['comercial'],
  'VIVERES / PERTRECHOS': ['comercial'], 'FONDEO': ['comercial'], 'CONECTIVIDAD': ['comercial'],
  'CENTROS DE CULTIVO': ['acuicultura'], 'FAENAS ACUICOLAS': ['acuicultura'],
  'PESCA': ['pesca artesanal'],
  'DEPORTIVAS / DEPORTES': ['deportivo'], 'NAUTICOS': ['deportivo'],
};
const AMBIGUOS = ['BUCEO', 'REMOLQUE', 'TRABAJOS (generico)', 'CARTAS DE CONTINUIDAD'];
const perfilesDe = (f) => {
  const s = new Set();
  for (const a of actividadesDe(f)) for (const p of (MAPA[a] || [])) s.add(p);
  return [...s].sort();
};
const ambiguosDe = (f) => actividadesDe(f).filter(a => AMBIGUOS.includes(a));

say('  6.1 — CUANTOS PERFILES ALCANZA CADA REGISTRO (solo por actividad nombrada):');
let s61 = 0;
for (const [k, v] of tally(A.map(f => String(perfilesDe(f).length)))) { say(`          ${rpad(k, 3)} perfil(es)  ${rpad(v, 4)} / 254`); s61 += v; }
say(`          ${pad('suma', 15)} ${rpad(s61, 4)} / 254 ${s61 === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();
say('  6.2 — QUE COMBINACIONES DE PERFIL APARECEN:');
let s62 = 0;
for (const [k, v] of tally(A.map(f => { const p = perfilesDe(f); return p.length ? p.join(' + ') : '(ninguno nombrado)'; }))) { say(`          ${rpad(v, 4)}  ${k}`); s62 += v; }
say(`          ${rpad(s62, 4)}  suma ${s62 === 254 ? 'CIERRA' : '*** NO CIERRA'}`);
say();
say('  6.3 — LA PREGUNTA DEL PROMPT: ¿cuantos suspenden a UNOS perfiles y no a otros?');
const parcial = A.filter(f => { const p = perfilesDe(f); return p.length > 0 && p.length < 4; });
const todosCuatro = A.filter(f => perfilesDe(f).length === 4);
const ninguno = A.filter(f => perfilesDe(f).length === 0);
say(`        alcanzan 1..3 perfiles (asimetricos) : ${parcial.length} / 254`);
say(`        alcanzan los 4                       : ${todosCuatro.length} / 254`);
say(`        no nombran actividad de ningun perfil: ${ninguno.length} / 254`);
say(`        suma                                 : ${parcial.length + todosCuatro.length + ninguno.length} / 254`);
if (parcial.length + todosCuatro.length + ninguno.length !== 254) abortar(5, 'la bolsa de 6.3 no cierra');
say();
say('  6.4 — EL CASO QUE ROMPERIA LA LECTURA FACIL (§1.2): MISMA BAHIA + MISMO');
say('        umbral + MISMA captura, y perfiles alcanzados DISTINTOS.');
const porGrupo = new Map();
for (const f of A) {
  const n = normalizarRestriccion(f.r);
  const g = `${f.cap} | bahia=${f.r.bahia} | umbral_fuera=${n.umbral_ab_fuera}`;
  if (!porGrupo.has(g)) porGrupo.set(g, []);
  porGrupo.get(g).push(f);
}
let gruposComparados = 0, gruposDivergentes = 0;
const divergencias = [];
for (const [g, fs_] of porGrupo) {
  if (fs_.length < 2) continue;
  gruposComparados++;
  const firmas = new Set(fs_.map(f => perfilesDe(f).join('+') || '(ninguno)'));
  if (firmas.size > 1) { gruposDivergentes++; divergencias.push([g, fs_]); }
}
say(`        grupos con 2+ registros comparables : ${gruposComparados}`);
if (gruposComparados === 0) abortar(5, 'cero comparaciones efectivas en 6.4');
say(`        grupos donde los perfiles DIVERGEN  : ${gruposDivergentes}`);
say();
for (const [g, fs_] of divergencias.slice(0, 6)) {
  say(`        ── ${g}`);
  for (const f of fs_) {
    say(`           ID ${f.r.IDRestriccion} · perfiles=[${perfilesDe(f).join(', ') || '-'}] · ambiguos=[${ambiguosDe(f).join(', ') || '-'}]`);
    say(`              ${JSON.stringify(String(f.r.Observacion).slice(0, 130))}`);
  }
  say();
}
if (divergencias.length > 6) say(`        ... y ${divergencias.length - 6} grupos divergentes mas`);
say();
say('  6.5 — LOS AMBIGUOS, CONTADOS Y NO RESUELTOS:');
for (const a of AMBIGUOS) {
  const re = ACTIVIDADES.find(x => x[0] === a)[1];
  say(`        ${pad(a, 26)} ${rpad(A.filter(f => re.test(obsN3.get(K(f)))).length, 4)} / 254`);
}
const conAmbiguo = A.filter(f => ambiguosDe(f).length > 0);
const soloAmbiguo = A.filter(f => ambiguosDe(f).length > 0 && perfilesDe(f).length === 0);
say(`        registros con al menos un ambiguo            : ${conAmbiguo.length} / 254`);
say(`        registros cuya UNICA actividad es ambigua    : ${soloAmbiguo.length} / 254`);
say('        >>> en esos, el perfil alcanzado NO se puede determinar del texto.');
say();

// ═════════════════════════════════════════════════════════════════════════════
// EJE 5 — CONVIVENCIA ESTADO / CAUSA
// ═════════════════════════════════════════════════════════════════════════════
hr();
say('(7) CONVIVENCIA DE ESTADO Y CAUSA — DENOMINADOR 444, DESGLOSADO POR BOLSA');
hr();
say();
say('  CAUSAS sacadas del dato (tabla 4.1) — no de una lista traida:');
const CAUSAS = [
  ['MAL TIEMPO',      /\bMAL\s+TIEMPO\b/,                    '4.1 MAL:120 TIEMPO:198'],
  ['TIEMPO VARIABLE', /\bTIEMPO\s+VARIABLE\b|\bVARIABLE\b/,  '4.1 VARIABLE:130'],
  ['TEMPORAL',        /\bTEMPORAL\b/,                        '4.1 TEMPORAL:29'],
  ['MAREJADA',        /\bMAREJADAS?\b/,                      '4.1 MAREJADA:14'],
  ['VIENTO',          /\bVIENTOS?\b/,                        '4.1 VIENTO:6 VIENTOS:4'],
  ['CERRAZON/NIEBLA', /\bCERRAZON\b|\bNIEBLA\b/,             '4.1 NIEBLA:12 · 4.2 CERRAZON'],
  ['VISIBILIDAD',     /\bVISIBILIDAD\b/,                     'de derivarCondicion, bitacora anterior'],
];
say(`        ${pad('causa', 20)} ${rpad('en A', 6)} ${rpad('en B', 6)}  procedencia`);
for (const [rot, re, proc] of CAUSAS) {
  say(`        ${pad(rot, 20)} ${rpad(A.filter(f => re.test(obsN3.get(K(f)))).length, 6)} ${rpad(B.filter(f => re.test(obsN3.get(K(f)))).length, 6)}  ${proc}`);
}
say();
const RE_CAUSA = /\bMAL\s+TIEMPO\b|\bVARIABLE\b|\bTEMPORAL\b|\bMAREJADAS?\b|\bVIENTOS?\b|\bCERRAZON\b|\bNIEBLA\b|\bVISIBILIDAD\b/;
say('  7.1 — LOS 444, POR LAS DOS DIMENSIONES A LA VEZ:');
const cell = (cierre, causa) => filas.filter(f => (CRITERIO.test(norm(f.r.Observacion)) === cierre) && (RE_CAUSA.test(obsN3.get(K(f))) === causa)).length;
const cc = cell(true, true), cs = cell(true, false), sc = cell(false, true), ss = cell(false, false);
say(`        declaran CIERRE  Y  causa   : ${cc}`);
say(`        declaran CIERRE, sin causa  : ${cs}`);
say(`        solo causa, sin cierre      : ${sc}`);
say(`        ni cierre ni causa          : ${ss}`);
say(`        suma                        : ${cc + cs + sc + ss} / 444 ${cc + cs + sc + ss === 444 ? 'CIERRA' : '*** NO CIERRA'}`);
if (cc + cs + sc + ss !== 444) abortar(5, 'la matriz de 7.1 no cierra en 444');
say(`        (dentro de la bolsa A: ${cc} conviven, ${cs} no — suma ${cc + cs} / 254)`);
say();
say('  7.2 — RECONCILIACION DE "157 de 173" DE LA SESION ANTERIOR:');
const con173 = A.filter(f => /PUERTO CERRADO/.test(norm(f.r.Observacion)));
say(`        denominador 173 = bolsa A con el literal "PUERTO CERRADO" : ${con173.length}`);
say(`        (los otros ${254 - con173.length} entran a la bolsa A por "CONDICION DE PUERTO")`);
const RE_TRES = /\bTEMPORAL\b|\bMAL TIEMPO\b|\bTIEMPO VARIABLE\b/;
const conviven173 = con173.filter(f => RE_TRES.test(obsN3.get(K(f)))).length;
say(`        de esos 173, cuantos dicen TAMBIEN TEMPORAL|MAL TIEMPO|TIEMPO VARIABLE : ${conviven173}`);
const tapados = con173.filter(f => derivarCondicion(f.r) !== 'Puerto Cerrado').length;
const noTapados = con173.filter(f => derivarCondicion(f.r) === 'Puerto Cerrado').length;
say(`        de esos 173, a cuantos derivarCondicion NO les devuelve 'Puerto Cerrado' : ${tapados}`);
say(`        a cuantos SI                                                            : ${noTapados}`);
say(`        suma ${tapados + noTapados} / 173 ${tapados + noTapados === con173.length ? 'CIERRA' : '*** NO CIERRA'}`);
say();
say('  7.3 — LA MISMA CONVIVENCIA CON EL DENOMINADOR 254:');
const conviven254 = A.filter(f => RE_TRES.test(obsN3.get(K(f)))).length;
say(`        de los 254, dicen TEMPORAL|MAL TIEMPO|TIEMPO VARIABLE : ${conviven254} / 254`);
say(`        de los 254, NO dicen ninguna de las tres              : ${254 - conviven254} / 254`);
say();
say('  7.4 — QUE DEVUELVE derivarCondicion SOBRE LAS DOS BOLSAS (control de herencia):');
const dcA = tally(A.map(f => String(derivarCondicion(f.r)))), dcB = tally(B.map(f => String(derivarCondicion(f.r))));
const etiquetas = [...new Set([...dcA.map(x => x[0]), ...dcB.map(x => x[0])])].sort();
let sa = 0, sb = 0;
say(`        ${pad('etiqueta', 34)} ${rpad('A', 5)} ${rpad('B', 5)}`);
for (const e of etiquetas) {
  const va = (dcA.find(x => x[0] === e) || [, 0])[1], vb = (dcB.find(x => x[0] === e) || [, 0])[1];
  say(`        ${pad(e, 34)} ${rpad(va, 5)} ${rpad(vb, 5)}`); sa += va; sb += vb;
}
say(`        ${pad('suma', 34)} ${rpad(sa, 5)} ${rpad(sb, 5)}  ${sa === 254 && sb === 190 ? 'CIERRAN' : '*** NO CIERRAN'}`);
say();

// ═════════════════════════════════════════════════════════════════════════════
// EJE 6 — LOS 190
// ═════════════════════════════════════════════════════════════════════════════
hr();
say('(8) LOS 190 QUE NO DECLARAN CIERRE — ¿LA PARTICION ES POROSA?');
hr();
say();
const conActB = B.filter(f => actividadesDe(f).length > 0);
say(`  8.1 — de los 190, ¿cuantos NOMBRAN alguna actividad? : ${conActB.length} / 190`);
say(`        ${pad('actividad', 30)} ${rpad('en B', 6)}`);
for (const [rot, re] of ACTIVIDADES) {
  const n = B.filter(f => re.test(obsN3.get(K(f)))).length;
  if (n > 0) say(`        ${pad(rot, 30)} ${rpad(n, 6)}`);
}
say();
const bConUmbral = B.filter(f => { const n = normalizarRestriccion(f.r); return n.umbral_ab_dentro != null || n.umbral_ab_fuera != null; });
say(`  8.2 — de los 190, ¿cuantos traen UMBRAL de nave (por el parser)? : ${bConUmbral.length} / 190`);
say(`        sin umbral : ${190 - bConUmbral.length} / 190  ·  suma ${bConUmbral.length + (190 - bConUmbral.length)} / 190`);
say();
const bSuspende = B.filter(f => /\bSUSPEND\w*|\bPROHIB\w*|\bCANCELA\w*/.test(obsN3.get(K(f))));
say(`  8.3 — de los 190, ¿cuantos usan un marcador de SUSPENSION/PROHIBICION? : ${bSuspende.length} / 190`);
say();
const sospechosos = B.filter(f => actividadesDe(f).length > 0 && /\bSUSPEND\w*|\bPROHIB\w*|\bCANCELA\w*/.test(obsN3.get(K(f))));
say(`  8.4 — LOS QUE SUSPENDEN ACTIVIDADES SIN DECIR CIERRE — "cierre bajo otro nombre":`);
say(`        ${sospechosos.length} / 190`);
const vistos = new Set();
for (const f of sospechosos) {
  const t = String(f.r.Observacion).slice(0, 165);
  if (vistos.has(t)) continue; vistos.add(t);
  say(`         ID ${f.r.IDRestriccion} · ${f.r.GLBahia} · actividades=[${actividadesDe(f).join(', ')}]`);
  say(`            ${JSON.stringify(t)}`);
}
say(`        (textos distintos mostrados: ${vistos.size} de ${sospechosos.length} registros)`);
say();
const bCerrado = B.filter(f => /\bCERRAD[OA]\b/.test(obsN3.get(K(f))));
say(`  8.5 — de los 190, ¿cuantos contienen la palabra CERRADO/CERRADA suelta? : ${bCerrado.length} / 190`);
for (const f of bCerrado.slice(0, 8)) say(`         ID ${f.r.IDRestriccion} · ${JSON.stringify(String(f.r.Observacion).slice(0, 150))}`);
say();

hr();
say('CONTROLES: particion 254/190 reproducida · derivarCondicion extraido y ejecutado');
say(`comparaciones efectivas: ${gruposComparados} grupos comparables en 6.4 · ${TOTAL} registros`);
say('exit 0');
hr();
volcar();
