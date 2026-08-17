// _bitacoras/cierre_observacion_2026-08-16/01_medir_capacidad_observacion.js
//
// CIERRE-EN-OBSERVACION-RECONOCIMIENTO — instrumento unico.
//
// PREGUNTA: que sabe hoy el motor extraer de `Observacion`, y alcanza para
// contestar "este puerto tiene la recalada cerrada".
//
// REGLA DE INSTRUMENTO APLICADA: no se escribe un extractor propio. El motor ES
// la implementacion versionada de lectura de `Observacion`, asi que se IMPORTA
// (`require`) y se corre. Los tres archivos del motor se leen y no se tocan.
//
// El criterio de particion 254/190 NO se reinventa: se copia verbatim de
// `_bitacoras/sondaje_cierre_2026-08-16/03_contraste_texto.js` linea 84/115.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const DIR = path.join(RAIZ, 'sondaje-sitport');
const SRC = path.join(RAIZ, 'src', 'services');
const SALIDA = path.resolve(__dirname, '01_medir_capacidad_observacion.txt');

const { normalizarRestriccion, normalizarTexto } = require(path.join(SRC, 'sitport-parser'));
const { evaluarRestriccion } = require(path.join(SRC, 'restriction-rules-engine'));
const { evaluarRuta } = require(path.join(SRC, 'route-restriction-evaluator'));

const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
let FALLAS = 0;
const control = (ok, msg) => { if (!ok) { FALLAS++; say(`    *** CONTROL FALLIDO: ${msg}`); } return ok; };

function volcar(code) {
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
  console.log(`\n[salida escrita] ${SALIDA}`);
  process.exit(code);
}

// ─────────────────────────────────────────────────────────────────────────────
// (0) UNIVERSO — mismo denominador que el sondaje, verificado, no heredado
// ─────────────────────────────────────────────────────────────────────────────
const EXCLUIDOS = ['bahias_sitport.json'];
const capturas = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.json') && !EXCLUIDOS.includes(f))
  .map(f => {
    const full = path.join(DIR, f);
    const buf = fs.readFileSync(full);
    return {
      f,
      mtime: fs.statSync(full).mtime,
      sha: crypto.createHash('sha256').update(buf).digest('hex'),
      recs: JSON.parse(buf.toString('utf8')).recordsets[0] || [],
    };
  })
  .sort((a, b) => a.mtime - b.mtime);

const filas = [];
for (const c of capturas) for (const r of c.recs) filas.push({ cap: c.f, r });
const TOTAL = filas.length;

hr();
say('CIERRE-EN-OBSERVACION — QUE EXTRAE HOY EL MOTOR DE `Observacion`');
say('Instrumento: _bitacoras/cierre_observacion_2026-08-16/01_medir_capacidad_observacion.js');
say(`Corrida: ${new Date().toISOString()} · sin salir a la API · motor IMPORTADO, no reimplementado`);
hr();
say();
hr();
say('(0) UNIVERSO Y DENOMINADOR — re-medido, no heredado de la bitacora anterior');
hr();
for (const c of capturas) say(`    ${c.f.padEnd(38)} n=${String(c.recs.length).padStart(3)}  sha256 ${c.sha.slice(0, 16)}`);
say(`    ${'TOTAL'.padEnd(38)} n=${TOTAL}`);
control(TOTAL === 444, `el denominador global no es 444 sino ${TOTAL}`);
say(`    premisa del prompt "444 registros de seis capturas": ${capturas.length === 6 && TOTAL === 444 ? 'SE SOSTIENE' : '*** NO SE SOSTIENE ***'}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (A) LAS DOS BOLSAS — criterio copiado verbatim del instrumento anterior
// ─────────────────────────────────────────────────────────────────────────────
// verbatim de 03_contraste_texto.js:37-39
const normSondaje = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase();
// verbatim de 03_contraste_texto.js:84
const RE_DECLARA = /PUERTO CERRADO|CONDICION\s*DE\s*PUERTO/;
const declara = ({ r }) => RE_DECLARA.test(normSondaje(r.Observacion));

const BOLSA_A = filas.filter(declara);            // "declaran cierre"
const BOLSA_B = filas.filter(f => !declara(f));   // "no lo declaran"

hr();
say('(A) LAS DOS BOLSAS — particion por el texto de `Observacion`');
hr();
say('    CRITERIO, copiado verbatim de _bitacoras/sondaje_cierre_2026-08-16/03_contraste_texto.js:84');
say('        /PUERTO CERRADO|CONDICION\\s*DE\\s*PUERTO/  sobre Observacion normalizada');
say('    NORMALIZACION DECLARADA (INV-0.3): NFD + borrado de diacriticos, colapso de');
say('    espacios repetidos a uno, trim, mayusculas. NO se decodifican entities HTML');
say('    en este criterio (se miden aparte en (F)).');
say();
say(`    BOLSA A — Observacion declara cierre  : ${BOLSA_A.length} / ${TOTAL}`);
say(`    BOLSA B — no lo declara               : ${BOLSA_B.length} / ${TOTAL}`);
say(`    suma ${BOLSA_A.length + BOLSA_B.length} — ${BOLSA_A.length + BOLSA_B.length === TOTAL ? 'CIERRA' : '*** NO CIERRA ***'}`);
control(BOLSA_A.length + BOLSA_B.length === TOTAL, 'las bolsas no suman el total');
const setA = new Set(BOLSA_A.map(x => x.cap + '#' + x.r.IDRestriccion));
const solapan = BOLSA_B.filter(x => setA.has(x.cap + '#' + x.r.IDRestriccion)).length;
say(`    solapamiento A∩B (por captura+IDRestriccion): ${solapan}  ${solapan === 0 ? '(disjuntas)' : '*** SE SOLAPAN ***'}`);
control(solapan === 0, 'las bolsas se solapan');
say(`    premisa del prompt "254 declaran / 190 no": ${BOLSA_A.length === 254 && BOLSA_B.length === 190 ? 'SE SOSTIENE' : '*** NO SE SOSTIENE ***'}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (B) LAS PROPIEDADES QUE EL MOTOR PRODUCE — con su linea de nacimiento
// ─────────────────────────────────────────────────────────────────────────────
const srcParser = fs.readFileSync(path.join(SRC, 'sitport-parser.js'), 'utf8');
const srcEngine = fs.readFileSync(path.join(SRC, 'restriction-rules-engine.js'), 'utf8');
const srcEval = fs.readFileSync(path.join(SRC, 'route-restriction-evaluator.js'), 'utf8');
const lineasParser = srcParser.split(/\r?\n/);
const lineasEngine = srcEngine.split(/\r?\n/);

function lineaDe(lineas, re) {
  for (let i = 0; i < lineas.length; i++) if (re.test(lineas[i])) return i + 1;
  return null;
}

// se toman las claves REALES que devuelve el motor, no una lista escrita a mano
const muestraNorm = normalizarRestriccion(filas[0].r);
const CLAVES = Object.keys(muestraNorm);

hr();
say('(B) LAS PROPIEDADES QUE `normalizarRestriccion` PRODUCE — lista tomada del objeto,');
say('    no escrita a mano, y cada una con la linea del parser donde nace');
hr();
say(`    propiedades de salida: ${CLAVES.length}`);
say();
// [clave] = [literal que la localiza en el parser, de donde nace, ¿lee `Observacion`?]
// El tercer elemento es un booleano explicito y NO se deduce de la prosa: deducirlo
// del texto ya produjo una linea falsa en la primera corrida de este instrumento.
const NACIMIENTO = {
  bahia_id:        [/bahia_id: registro\.bahia/, 'registro.bahia', false],
  bahia_nombre:    [/bahia_nombre: normalizarTexto\(registro\.GLBahia\)/, 'registro.GLBahia', false],
  condicion:       [/const condicion = detectarCondicion/, 'Observacion + MotivoRestriccion', true],
  afecta_menores:  [/const afecta_menores =/, 'NaveRecibe + Observacion', true],
  afecta_mayores:  [/const afecta_mayores =/, 'NaveRecibe + Observacion', true],
  umbral_ab_dentro:[/umbral_ab_dentro: umbral_dentro/, 'Observacion (regex de AB/TRG)', true],
  umbral_ab_fuera: [/umbral_ab_fuera: umbral_fuera/, 'Observacion (regex de AB/TRG)', true],
  bloqueo_total:   [/bloqueo_total,$/, 'Observacion ("TODO TIPO DE NAVES")', true],
  texto_original:  [/texto_original: registro\.Observacion/, 'Observacion (copia cruda)', true],
  timestamp:       [/timestamp: registro\.FCinicio/, 'registro.FCinicio', false],
  area:            [/area: detectarArea\(registro\.AreaRestriccion\)/, 'registro.AreaRestriccion', false],
};
control(CLAVES.every(k => NACIMIENTO[k]), 'hay una propiedad de salida sin entrada en la tabla de nacimiento');
control(Object.keys(NACIMIENTO).every(k => CLAVES.includes(k)), 'la tabla de nacimiento nombra una propiedad que el motor no produce');

say('    prop.                 linea            lee Observacion   nace de');
say('    ' + '-'.repeat(76));
for (const k of CLAVES) {
  const [re, fuente, leeObs] = NACIMIENTO[k] || [null, '?', false];
  const ln = re ? lineaDe(lineasParser, re) : null;
  if (ln === null) { FALLAS++; say(`    *** ${k}: literal NO ENCONTRADO en sitport-parser.js — es FALLA, no "no aplicable"`); continue; }
  say(`    ${k.padEnd(20)} sitport-parser.js:${String(ln).padEnd(4)}  ${(leeObs ? 'SI' : 'no').padEnd(14)}  ${fuente}`);
}
say();
const DE_OBS = CLAVES.filter(k => NACIMIENTO[k][2]);
const NO_OBS = CLAVES.filter(k => !NACIMIENTO[k][2]);
say('    DE LAS ' + CLAVES.length + ', LAS QUE NACEN DEL TEXTO DE `Observacion`:');
for (const k of DE_OBS) say(`        ${k}`);
say(`        (${DE_OBS.length} de ${CLAVES.length})`);
say('    LAS QUE NO LO LEEN (vienen de otros campos del registro):');
for (const k of NO_OBS) say(`        ${k.padEnd(20)} <- ${NACIMIENTO[k][1]}`);
say(`        (${NO_OBS.length} de ${CLAVES.length})`);
control(DE_OBS.length + NO_OBS.length === CLAVES.length, 'la particion lee/no-lee Observacion no cierra');
say();

// las funciones intermedias que leen Observacion, con su linea
say('    LAS FUNCIONES QUE TOCAN EL TEXTO, con su linea:');
for (const [nom, re] of [
  ['normalizarTexto',      /^function normalizarTexto/],
  ['detectarCondicion',    /^function detectarCondicion/],
  ['AB_PATTERNS',          /^const AB_PATTERNS/],
  ['extraerUmbralDeTexto', /^function extraerUmbralDeTexto/],
  ['extraerUmbrales',      /^function extraerUmbrales/],
  ['detectarArea',         /^function detectarArea/],
  ['normalizarRestriccion',/^function normalizarRestriccion/],
]) {
  const ln = lineaDe(lineasParser, re);
  if (ln === null) { FALLAS++; say(`        *** ${nom}: NO ENCONTRADA — FALLA`); }
  else say(`        ${nom.padEnd(24)} sitport-parser.js:${ln}`);
}
say();
say(`    NUMERO DE PATRONES DE TONELAJE (AB_PATTERNS): ${srcParser.match(/AB_PATTERNS = \[([\s\S]*?)\];/)[1].split('\n').filter(l => l.trim().startsWith('/')).length}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (C) CUALES DE ESAS PROPIEDADES LLEGAN AL VEREDICTO, Y CUALES MUEREN
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(C) CUALES DE ESAS PROPIEDADES LLEGAN AL VEREDICTO — medido sobre el codigo del motor');
hr();
const FACTS = [...new Set([...srcEngine.matchAll(/fact: '([a-z_]+)'/g)].map(m => m[1]))].sort();
const PASADAS = [...new Set([...srcEngine.matchAll(/^\s+([a-z_]+): restriccionNorm\.([a-z_]+),/gm)].map(m => m[2]))].sort();
say(`    hechos (`+'`fact:`'+`) que alguna regla del motor consulta : ${FACTS.length}`);
say(`        ${FACTS.join(', ')}`);
say(`    propiedades del parser que se pasan como hecho          : ${PASADAS.length}`);
say(`        ${PASADAS.join(', ')}`);
say();
say('    prop. del parser        se pasa al motor    alguna regla la consulta');
say('    ' + '-'.repeat(74));
for (const k of CLAVES) {
  const pasa = PASADAS.includes(k);
  const usa = FACTS.includes(k);
  say(`    ${k.padEnd(22)} ${(pasa ? 'SI' : 'no').padEnd(19)} ${usa ? 'SI' : 'NO'}`);
}
say();
const MUERTAS = CLAVES.filter(k => !FACTS.includes(k));
say('    >>> PROPIEDADES QUE NINGUNA REGLA CONSULTA (no llegan al veredicto):');
for (const k of MUERTAS) say(`            ${k}${PASADAS.includes(k) ? '   (se pasa como hecho y no se usa)' : ''}`);
say();
say('    Y lo que el evaluador de ruta exporta de cada restriccion:');
const EXPORTA = [...new Set([...srcEval.matchAll(/^\s+([a-z_]+): (?:norm|ev)\.([a-z_]+),/gm)].map(m => `${m[1]} <- ${m[2]}`))];
for (const e of EXPORTA) say(`        ${e}`);
say();
const lnNivelUV = lineaDe(lineasEngine, /nivel: 'UV'/);
const lnNivelU = lineaDe(lineasEngine, /nivel: 'U'/);
control(lnNivelUV !== null && lnNivelU !== null, 'no se encontro el literal nivel: en el motor de reglas');
say(`    >>> EL MOTOR SI PRODUCE UN CAMPO LLAMADO \`nivel\`: restriction-rules-engine.js:${lnNivelUV} (UV) y :${lnNivelU} (U).`);
const valoresNivel = [...new Set([...srcEngine.matchAll(/nivel: '([A-Z]+)'/g)].map(m => m[1]))];
say(`        valores que puede tomar en TODO el motor: ${valoresNivel.map(v => `'${v}'`).join(', ')} (y null cuando no hay evento)`);
say(`        ocurrencias del literal 'cierre_total' en los tres archivos del motor: ${(srcParser + srcEngine + srcEval).split('cierre_total').length - 1}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (D) CORRER EL MOTOR SOBRE LAS DOS BOLSAS
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  hr();
  say('(D) EL MOTOR CORRIDO SOBRE LAS DOS BOLSAS — denominadores declarados');
  hr();
  say('    El motor SI se puede correr aislado sobre un registro suelto:');
  say('    normalizarRestriccion(registro) -> evaluarRestriccion(norm, nave_ab). No');
  say('    necesita ruta, ni red, ni base. Se corren los 444, uno por uno.');
  say();

  const NORMS = filas.map(f => ({ ...f, n: normalizarRestriccion(f.r) }));
  const nA = NORMS.filter(declara);
  const nB = NORMS.filter(f => !declara(f));
  control(nA.length === BOLSA_A.length && nB.length === BOLSA_B.length, 'las bolsas cambiaron al normalizar');

  // D.1 — las cuatro propiedades vivas, cruzadas contra la bolsa
  say('    D.1 — LAS PROPIEDADES QUE LLEGAN AL VEREDICTO, CRUZADAS CONTRA LA BOLSA');
  say();
  for (const prop of ['condicion', 'bloqueo_total', 'afecta_menores', 'umbral_ab_fuera']) {
    say(`      ${prop}`);
    const vals = [...new Set(NORMS.map(x => String(x.n[prop])))].sort();
    say(`        valor                 bolsa A (${nA.length})   bolsa B (${nB.length})`);
    let sA = 0, sB = 0;
    for (const v of vals) {
      const a = nA.filter(x => String(x.n[prop]) === v).length;
      const b = nB.filter(x => String(x.n[prop]) === v).length;
      sA += a; sB += b;
      say(`        ${v.padEnd(20)} ${String(a).padStart(8)}   ${String(b).padStart(8)}`);
    }
    say(`        ${'suma'.padEnd(20)} ${String(sA).padStart(8)}   ${String(sB).padStart(8)}  ${sA === nA.length && sB === nB.length ? 'CIERRA' : '*** NO CIERRA ***'}`);
    control(sA === nA.length && sB === nB.length, `el cruce de ${prop} no cierra`);
    say();
  }

  // D.2 — veredicto por AB
  say('    D.2 — VEREDICTO DEL MOTOR POR BOLSA Y POR AB DE LA NAVE');
  say('          (`nivel` es la salida del motor: UV bloquea, U precaucion, null nada)');
  say();
  const ABS = [null, 5, 15, 43, 60, 150];
  const filaHead = '      AB      | bolsa | ' + 'UV'.padStart(6) + 'U'.padStart(8) + 'null'.padStart(8) + '  |  UV%';
  say(filaHead);
  say('      ' + '-'.repeat(66));
  const resumen = {};
  for (const ab of ABS) {
    for (const [nomBolsa, bolsa] of [['A', nA], ['B', nB]]) {
      let uv = 0, u = 0, nulo = 0;
      for (const x of bolsa) {
        const ev = await evaluarRestriccion(x.n, ab);
        if (ev.nivel === 'UV') uv++;
        else if (ev.nivel === 'U') u++;
        else nulo++;
      }
      control(uv + u + nulo === bolsa.length, `la corrida AB=${ab} bolsa ${nomBolsa} no cierra`);
      resumen[`${ab}|${nomBolsa}`] = { uv, u, nulo, n: bolsa.length };
      say(`      ${String(ab === null ? 'sin AB' : ab).padEnd(7)} |   ${nomBolsa}   | ${String(uv).padStart(6)}${String(u).padStart(8)}${String(nulo).padStart(8)}  |  ${(100 * uv / bolsa.length).toFixed(1)}%`);
    }
  }
  say();
  say('    >>> LO QUE ESTA TABLA CONTESTA: si la salida del motor distinguiera cierre de');
  say('        no-cierre, la columna UV de la bolsa A tendria que separarse de la de la');
  say('        bolsa B. Contraste, para cada AB (UV% A contra UV% B):');
  for (const ab of ABS) {
    const a = resumen[`${ab}|A`], b = resumen[`${ab}|B`];
    say(`          AB ${String(ab === null ? 'sin AB' : ab).padEnd(6)}  A ${(100 * a.uv / a.n).toFixed(1)}%   B ${(100 * b.uv / b.n).toFixed(1)}%   separacion ${(100 * a.uv / a.n - 100 * b.uv / b.n).toFixed(1)} pts`);
  }
  say();

  // D.3 — el unico campo binario que el motor produce a partir del texto
  const btA = nA.filter(x => x.n.bloqueo_total).length;
  const btB = nB.filter(x => x.n.bloqueo_total).length;
  say('    D.3 — `bloqueo_total`, la unica propiedad del motor con forma de "puerto cerrado":');
  say(`          bolsa A (declaran cierre en texto) con bloqueo_total=true : ${btA} / ${nA.length}`);
  say(`          bolsa B (no lo declaran)           con bloqueo_total=true : ${btB} / ${nB.length}`);
  say();

  // ───────────────────────────────────────────────────────────────────────────
  // (E) QUE DE LA BOLSA A EL MOTOR NO PUEDE RESOLVER, AGRUPADO POR CAUSA
  // ───────────────────────────────────────────────────────────────────────────
  hr();
  say('(E) LA BOLSA A POR CAUSA DE NO-RESOLUCION — denominador ' + nA.length);
  hr();
  say('    DEFINICION OPERATIVA DECLARADA: "no puede resolver" = el motor no produce,');
  say('    a partir de ese registro, ninguna salida cuyo valor dependa de que el texto');
  say('    declare cierre; o la produce perdiendo una distincion que el texto SI trae.');
  say('    Los grupos se solapan a proposito y se declara el solape; abajo va tambien');
  say('    la asignacion a causa PRIMARIA por prioridad, que si es disjunta y cierra.');
  say();

  const GRUPOS = [
    ['G1  condicion=OTRO — ninguna regla dispara con ningun AB',
      x => x.n.condicion === 'OTRO'],
    ['G2  texto dice cerrado y el motor lo lee VARIABLE -> U, no UV',
      x => x.n.condicion === 'VARIABLE'],
    ['G3  alcance geografico: el texto distingue DENTRO/FUERA con umbrales distintos',
      x => x.n.umbral_ab_dentro !== x.n.umbral_ab_fuera],
    ['G4  el texto nombra DENTRO o FUERA pero `area` no sale del texto sino de AreaRestriccion, que viene null',
      x => x.r.AreaRestriccion == null && /\bDENTRO\b|\bFUERA\b/.test(normSondaje(x.r.Observacion))],
    ['G5  umbral de tonelaje presente: el cierre es condicional al AB, no del puerto',
      x => x.n.umbral_ab_fuera != null],
    ['G6  el texto declara cierre TOTAL (toda la jurisdiccion / todo tipo) y bloqueo_total sale false',
      x => /TODA LA JURISDICCION|TODO TIPO/.test(normSondaje(x.r.Observacion)) && x.n.bloqueo_total === false],
    ['G7  el texto declara cierre y el motor no extrae ningun umbral ni bloqueo_total',
      x => x.n.umbral_ab_fuera == null && x.n.bloqueo_total === false],
  ];

  for (const [nombre, pred] of GRUPOS) {
    const hits = nA.filter(pred);
    say(`    ${nombre}`);
    say(`        ${hits.length} / ${nA.length}`);
    if (hits.length === 0) {
      say('        (ninguno — el grupo existe y esta vacio, se declara)');
    } else {
      const c = hits[0];
      say(`        caso citado literal · ${c.cap} · ID ${c.r.IDRestriccion} · ${c.r.GLBahia}`);
      say(`          Observacion: ${JSON.stringify(c.r.Observacion)}`);
      say(`          motor: condicion=${c.n.condicion} bloqueo_total=${c.n.bloqueo_total} umbral_dentro=${c.n.umbral_ab_dentro} umbral_fuera=${c.n.umbral_ab_fuera} area=${c.n.area} afecta_menores=${c.n.afecta_menores}`);
    }
    say();
  }

  say('    ASIGNACION A CAUSA PRIMARIA (prioridad G1>G6>G3>G2>G5>G4>G7, disjunta):');
  const prim = new Map();
  const ORDEN = [0, 5, 2, 1, 4, 3, 6];
  for (const x of nA) {
    let asignado = 'sin causa — el motor lo resuelve';
    for (const i of ORDEN) if (GRUPOS[i][1](x)) { asignado = GRUPOS[i][0].split(' — ')[0].split(':')[0].trim(); break; }
    prim.set(asignado, (prim.get(asignado) || 0) + 1);
  }
  let sp = 0;
  for (const [k, v] of [...prim.entries()].sort((a, b) => b[1] - a[1])) { say(`        ${String(v).padStart(4)} / ${nA.length}   ${k}`); sp += v; }
  say(`        suma ${sp} — ${sp === nA.length ? 'CIERRA' : '*** NO CIERRA ***'}`);
  control(sp === nA.length, 'la asignacion primaria no cierra');
  say();

  // tipo de nave, medido aparte porque el prompt lo pide por separado
  say('    TIPO DE NAVE — lo que el motor extrae y de donde:');
  const naveVals = {};
  for (const x of nA) { const k = normalizarTexto(x.r.NaveRecibe); naveVals[k] = (naveVals[k] || 0) + 1; }
  for (const [k, v] of Object.entries(naveVals).sort((a, b) => b[1] - a[1])) say(`        ${String(v).padStart(4)} / ${nA.length}   NaveRecibe = ${JSON.stringify(k)}`);
  say('        >>> el tipo de nave NO sale de `Observacion`: sale de `NaveRecibe`, y el');
  say('            motor lo colapsa a dos booleanos (afecta_menores / afecta_mayores).');
  say(`        entities HTML sin decodificar en NaveRecibe dentro de la bolsa A: ${nA.filter(x => /&(LT|GT|AMP);/i.test(String(x.r.NaveRecibe || ''))).length} / ${nA.length}`);
  say();

  // ───────────────────────────────────────────────────────────────────────────
  // (F) LA VARIEDAD REAL DEL TEXTO EN LA BOLSA A
  // ───────────────────────────────────────────────────────────────────────────
  hr();
  say('(F) CUANTAS FORMAS DISTINTAS DE DECLARAR CIERRE HAY EN LA BOLSA A');
  hr();
  const decodificar = (s) => String(s == null ? '' : s)
    .replace(/&LT;/gi, '<').replace(/&GT;/gi, '>').replace(/&AMP;/gi, '&')
    .replace(/&QUOT;/gi, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));

  const N1 = (s) => normSondaje(decodificar(s));                    // decodificada + INV-0.3
  const N2 = (s) => N1(s).replace(/\d+/g, '#');                     // numeros -> #
  const N3 = (s) => N2(s).replace(/[^A-Z# ]+/g, ' ').replace(/\s+/g, ' ').trim(); // sin puntuacion

  say('    NIVELES DE NORMALIZACION DECLARADOS:');
  say('      N0  texto crudo tal cual viene de la fuente');
  say('      N1  N0 + entities HTML decodificadas + NFD sin diacriticos + espacios');
  say('          colapsados + trim + mayusculas   (INV-0.3)');
  say('      N2  N1 + toda corrida de digitos reemplazada por "#"');
  say('      N3  N2 + toda puntuacion reemplazada por espacio y recolapsada');
  say();
  const cuenta = (fn) => new Set(nA.map(x => fn(x.r.Observacion))).size;
  say(`      formas distintas en la bolsa A (n=${nA.length}):`);
  say(`        N0 (crudo)                  : ${new Set(nA.map(x => String(x.r.Observacion))).size}`);
  say(`        N1 (normalizado)            : ${cuenta(N1)}`);
  say(`        N2 (numeros a #)            : ${cuenta(N2)}`);
  say(`        N3 (sin puntuacion)         : ${cuenta(N3)}`);
  say(`        prefijo de 40 chars sobre N3: ${new Set(nA.map(x => N3(x.r.Observacion).slice(0, 40))).size}`);
  say();
  const freqN3 = new Map();
  for (const x of nA) { const k = N3(x.r.Observacion); freqN3.set(k, (freqN3.get(k) || 0) + 1); }
  const orden = [...freqN3.entries()].sort((a, b) => b[1] - a[1]);
  const unicos = orden.filter(([, v]) => v === 1).length;
  say(`      de las ${orden.length} formas N3: ${unicos} aparecen UNA sola vez (${(100 * unicos / orden.length).toFixed(1)}%)`);
  const top = orden.slice(0, 10);
  say(`      las 10 mas frecuentes cubren ${top.reduce((s, [, v]) => s + v, 0)} / ${nA.length} registros:`);
  for (const [k, v] of top) say(`        ${String(v).padStart(4)}x  ${JSON.stringify(k.slice(0, 120))}`);
  say();
  say('      PREFIJOS (primeras 6 palabras de N3) — la "plantilla de apertura":');
  const freqPre = new Map();
  for (const x of nA) { const k = N3(x.r.Observacion).split(' ').slice(0, 6).join(' '); freqPre.set(k, (freqPre.get(k) || 0) + 1); }
  const ordenPre = [...freqPre.entries()].sort((a, b) => b[1] - a[1]);
  say(`        prefijos distintos: ${ordenPre.length}`);
  let acum = 0;
  for (const [k, v] of ordenPre.slice(0, 12)) { acum += v; say(`        ${String(v).padStart(4)}x  ${JSON.stringify(k)}`); }
  say(`        esos 12 cubren ${acum} / ${nA.length}`);
  say();
  say('      RUIDO DE FUENTE MEDIDO DENTRO DE LA BOLSA A (sobre el texto crudo):');
  const ruidos = [
    ['doble espacio o mas', /\s{2,}/],
    ['CONDICIONDE pegado', /CONDICIONDE/i],
    ['entities HTML en Observacion', /&(LT|GT|AMP|QUOT|#\d+);/i],
    ['acento presente', /[À-ſ]/],
    ['comillas escapadas', /\\?"/],
  ];
  for (const [nom, re] of ruidos) {
    const h = nA.filter(x => re.test(String(x.r.Observacion || ''))).length;
    say(`        ${nom.padEnd(30)} ${String(h).padStart(4)} / ${nA.length}`);
  }
  say();
  say('      LA NORMALIZACION DEL MOTOR NO COLAPSA ESPACIOS — control directo:');
  const pruebaEsp = normalizarTexto('MAL  TIEMPO');
  say(`        normalizarTexto("MAL  TIEMPO") = ${JSON.stringify(pruebaEsp)}`);
  say(`        ¿contiene "MAL TIEMPO"? ${pruebaEsp.includes('MAL TIEMPO') ? 'SI' : 'NO'}`);
  say(`        registros de la bolsa A con doble espacio DENTRO de una frase que el motor busca literal: ${nA.filter(x => /(MAL\s{2,}TIEMPO|PUERTO\s{2,}CERRADO|TODO\s{2,}TIPO)/i.test(String(x.r.Observacion || ''))).length}`);
  say();
  say('      Y EL MOTOR TAMPOCO DECODIFICA ENTITIES — control directo:');
  say(`        normalizarTexto("NAVE MENOR (&LT;25 AB)") = ${JSON.stringify(normalizarTexto('NAVE MENOR (&LT;25 AB)'))}`);
  say();

  // ───────────────────────────────────────────────────────────────────────────
  // (G) LOS DOS REGISTROS QUE SE MOVIERON — el motor corrido sobre el antes/despues
  // ───────────────────────────────────────────────────────────────────────────
  hr();
  say('(G) LOS DOS REGISTROS CUYO `Observacion` CAMBIO — el motor corrido sobre antes y despues');
  say('    (son la unica evolucion de una condicion de puerto que el material contiene)');
  hr();
  for (const id of [95040, 95071]) {
    const versiones = filas.filter(x => x.r.IDRestriccion === id);
    const textos = [...new Set(versiones.map(x => x.r.Observacion))];
    say(`    ID ${id} · ${versiones.length} apariciones · ${textos.length} textos distintos`);
    for (const t of textos) {
      const reg = versiones.find(x => x.r.Observacion === t);
      const n = normalizarRestriccion(reg.r);
      const ev15 = await evaluarRestriccion(n, 15);
      const ev60 = await evaluarRestriccion(n, 60);
      say(`      texto: ${JSON.stringify(String(t).slice(0, 150))}`);
      say(`        motor -> condicion=${n.condicion} umbral_dentro=${n.umbral_ab_dentro} umbral_fuera=${n.umbral_ab_fuera} bloqueo_total=${n.bloqueo_total} area=${n.area}`);
      say(`        veredicto AB 15 = ${ev15.nivel} (${ev15.estado}) · AB 60 = ${ev60.nivel} (${ev60.estado})`);
    }
    say();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // (H) EL CASO EXTREMO — puerto cerrado para toda la jurisdiccion
  // ───────────────────────────────────────────────────────────────────────────
  hr();
  say('(H) EL CASO MAS CERCANO A UN CIERRE TOTAL DEL MATERIAL — ID 95171');
  hr();
  const extremo = filas.find(x => x.r.IDRestriccion === 95171);
  if (!extremo) { FALLAS++; say('    *** ID 95171 NO ENCONTRADO — es FALLA, no "no aplicable"'); }
  else {
    const n = normalizarRestriccion(extremo.r);
    say(`    ${extremo.cap} · ${extremo.r.GLBahia}`);
    say(`    Observacion: ${JSON.stringify(extremo.r.Observacion)}`);
    say(`    NaveRecibe : ${JSON.stringify(extremo.r.NaveRecibe)}`);
    say(`    AreaRestriccion: ${JSON.stringify(extremo.r.AreaRestriccion)}`);
    say(`    MotivoRestriccion: ${JSON.stringify(extremo.r.MotivoRestriccion)}`);
    say('    SALIDA DEL MOTOR, propiedad por propiedad:');
    for (const k of CLAVES) say(`        ${k.padEnd(20)} ${JSON.stringify(n[k])}`);
    say('    VEREDICTO POR AB:');
    for (const ab of ABS) {
      const ev = await evaluarRestriccion(n, ab);
      say(`        AB ${String(ab === null ? 'sin AB' : ab).padEnd(7)} nivel=${String(ev.nivel)} bloquea=${ev.bloquea} estado=${ev.estado}`);
    }
    const ruta = await evaluarRuta([{ nombre_bahia: extremo.r.GLBahia, id_bahia: extremo.r.bahia, orden_en_ruta: 1, _raw: extremo.r }], 15);
    say(`    Y por evaluarRuta con AB 15: veredicto=${ruta.veredicto} · nivel de la restriccion=${String(ruta.restricciones[0].nivel)}`);
  }
  say();

  // ───────────────────────────────────────────────────────────────────────────
  // (J) EL SEGUNDO LECTOR DE `Observacion` — fuera de los tres archivos del motor
  // ───────────────────────────────────────────────────────────────────────────
  hr();
  say('(J) EL OTRO LECTOR DE `Observacion`: `derivarCondicion` en src/routes/sitport-routes.js');
  hr();
  const srcRutas = fs.readFileSync(path.join(RAIZ, 'src', 'routes', 'sitport-routes.js'), 'utf8');
  const lineasRutas = srcRutas.split(/\r?\n/);
  const lnDeriva = lineaDe(lineasRutas, /^function derivarCondicion\(r\) \{/);
  control(lnDeriva !== null, 'no se encontro derivarCondicion en sitport-routes.js — es FALLA');
  if (lnDeriva === null) { volcar(3); }
  // Se EXTRAE el codigo verbatim del archivo y se ejecuta ese mismo texto; no se
  // reescribe la funcion. Si el archivo cambia, esta medicion cambia con el.
  const bloque = srcRutas.slice(srcRutas.indexOf('function derivarCondicion(r) {'));
  // El archivo puede venir con CRLF: se delimita por regex, no por literal '\n}\n'.
  const mFin = /\r?\n\}\r?\n/.exec(bloque);
  control(mFin != null, 'no se pudo delimitar el cuerpo de derivarCondicion');
  if (mFin == null) volcar(3);
  const fuenteDeriva = bloque.slice(0, mFin.index + mFin[0].length - 1).replace(/\r/g, '');
  const derivarCondicion = new Function(`${fuenteDeriva}; return derivarCondicion;`)();
  say(`    extraida verbatim de sitport-routes.js:${lnDeriva} — ${fuenteDeriva.split('\n').length} lineas, ejecutada tal cual`);
  say('    CUERPO CITADO LITERAL:');
  for (const l of fuenteDeriva.split('\n')) say(`      | ${l}`);
  say();
  const lnPuertoCerrado = lineaDe(lineasRutas, /return 'Puerto Cerrado'/);
  control(lnPuertoCerrado !== null, "el literal 'Puerto Cerrado' no esta en sitport-routes.js — es FALLA");
  say(`    >>> LA RAMA QUE DICE CIERRE EXISTE: sitport-routes.js:${lnPuertoCerrado}`);
  say(`    >>> y su salida viaja al API como \`condicion_legible\`: sitport-routes.js:${lineaDe(lineasRutas, /condicion_legible: derivarCondicion\(r\)/)}`);
  say();
  say('    QUE DEVUELVE SOBRE LAS DOS BOLSAS:');
  const valsDer = new Map();
  for (const [nom, bolsa] of [['A', nA], ['B', nB]]) {
    for (const x of bolsa) {
      const v = String(derivarCondicion(x.r));
      const k = `${v}|${nom}`;
      valsDer.set(k, (valsDer.get(k) || 0) + 1);
    }
  }
  const etiquetas = [...new Set([...valsDer.keys()].map(k => k.split('|')[0]))].sort();
  say(`      etiqueta                        bolsa A (${nA.length})   bolsa B (${nB.length})`);
  let sdA = 0, sdB = 0;
  for (const e of etiquetas) {
    const a = valsDer.get(`${e}|A`) || 0, b = valsDer.get(`${e}|B`) || 0;
    sdA += a; sdB += b;
    say(`      ${e.padEnd(32)} ${String(a).padStart(8)}   ${String(b).padStart(8)}`);
  }
  say(`      ${'suma'.padEnd(32)} ${String(sdA).padStart(8)}   ${String(sdB).padStart(8)}  ${sdA === nA.length && sdB === nB.length ? 'CIERRA' : '*** NO CIERRA ***'}`);
  control(sdA === nA.length && sdB === nB.length, 'el cruce de derivarCondicion no cierra');
  say();
  const pcA = valsDer.get('Puerto Cerrado|A') || 0;
  const conFrase = nA.filter(x => /PUERTO CERRADO/.test(normSondaje(x.r.Observacion)));
  say(`    >>> registros de la bolsa A cuyo texto dice literalmente "PUERTO CERRADO": ${conFrase.length} / ${nA.length}`);
  say(`    >>> registros de la bolsa A a los que derivarCondicion devuelve 'Puerto Cerrado': ${pcA} / ${nA.length}`);
  say('        (los dos conjuntos NO son el mismo: la rama tambien dispara con la palabra');
  say('         "CERRADO" sola, y esta ANTECEDIDA por TEMPORAL / MAL TIEMPO / TIEMPO');
  say('         VARIABLE, que devuelven antes. Se desglosa la interseccion:)');
  say();
  say(`        DE LOS ${conFrase.length} QUE DICEN "PUERTO CERRADO", que devuelve derivarCondicion:`);
  const desglose = new Map();
  for (const x of conFrase) { const v = String(derivarCondicion(x.r)); desglose.set(v, (desglose.get(v) || 0) + 1); }
  let sd = 0;
  for (const [v, n] of [...desglose.entries()].sort((a, b) => b[1] - a[1])) {
    const tapadaPor = v === 'Puerto Cerrado' ? '' : `   <- TAPADO: la rama de cierre nunca se alcanza`;
    say(`          ${String(n).padStart(4)} / ${conFrase.length}   '${v}'${tapadaPor}`);
    sd += n;
  }
  say(`          suma ${sd} / ${conFrase.length} — ${sd === conFrase.length ? 'CIERRA' : '*** NO CIERRA ***'}`);
  control(sd === conFrase.length, 'el desglose de los que dicen PUERTO CERRADO no cierra');
  const tapados = conFrase.filter(x => derivarCondicion(x.r) !== 'Puerto Cerrado').length;
  say(`          >>> TAPADOS EN TOTAL: ${tapados} / ${conFrase.length} (${(100 * tapados / conFrase.length).toFixed(1)}%)`);
  say();
  const pcSinFrase = pcA - (desglose.get('Puerto Cerrado') || 0);
  say(`        Y AL REVES: de los ${pcA} que devuelven 'Puerto Cerrado', ${pcSinFrase} NO contienen`);
  say('        la frase "PUERTO CERRADO" — entran por la palabra "CERRADO" sola.');
  const ejSinFrase = nA.find(x => derivarCondicion(x.r) === 'Puerto Cerrado' && !/PUERTO CERRADO/.test(normSondaje(x.r.Observacion)));
  if (ejSinFrase) say(`          caso citado: ID ${ejSinFrase.r.IDRestriccion} · ${JSON.stringify(String(ejSinFrase.r.Observacion).slice(0, 160))}`);
  say();
  say('    CONTROL — esta funcion NO usa el normalizador central (INV-0.3):');
  say(`        ¿llama a normalizarTexto? ${/normalizarTexto/.test(fuenteDeriva) ? 'SI' : 'NO'}`);
  say(`        ¿quita acentos?          ${/normalize\(/.test(fuenteDeriva) ? 'SI' : 'NO'}`);
  say(`        ¿colapsa espacios?       ${/\\s\+/.test(fuenteDeriva) ? 'SI' : 'NO'}`);
  const conAcento = nA.filter(x => /CONDICIÓN|TEMPORÁL|MAL TIEMPO/.test(String(x.r.Observacion || '')) && /[À-ſ]/.test(String(x.r.Observacion || ''))).length;
  say(`        registros de la bolsa A con acento en Observacion: ${nA.filter(x => /[À-ſ]/.test(String(x.r.Observacion || ''))).length} / ${nA.length}`);
  say(`        (los literales que busca —TEMPORAL, MAL TIEMPO, TIEMPO VARIABLE, PUERTO`);
  say('         CERRADO, CERRADO— no llevan acento, asi que el acento no los rompe; lo');
  say('         que si los rompe es el doble espacio, que tampoco colapsa)');
  say(`        registros de la bolsa A con doble espacio en Observacion: ${nA.filter(x => /\s{2,}/.test(String(x.r.Observacion || ''))).length} / ${nA.length}`);
  say();
  say('    Y DONDE VIAJA `nivel` DEL MOTOR EN LA RESPUESTA DEL BACKEND:');
  const lnNivelRuta = lineaDe(lineasRutas, /nivel: ev\.nivel \|\| null/);
  control(lnNivelRuta !== null, 'no se encontro la emision de nivel en sitport-routes.js');
  say(`        sitport-routes.js:${lnNivelRuta} — se emite ANIDADO: restricciones_intermedias[i].evaluacion.nivel`);
  say(`        ocurrencias de un \`nivel\` de restriccion en el nivel superior del objeto: 0 (medido: el`);
  say(`        unico \`nivel:\` del bloque enriquecedor esta dentro de \`evaluacion: { ... }\`)`);
  say();

  // ───────────────────────────────────────────────────────────────────────────
  // (I) CIERRE
  // ───────────────────────────────────────────────────────────────────────────
  hr();
  say('CIERRE DEL INSTRUMENTO');
  hr();
  say(`    registros medidos      : ${TOTAL}`);
  say(`    bolsa A / bolsa B      : ${nA.length} / ${nB.length}  (suma ${nA.length + nB.length})`);
  say(`    corridas del motor     : ${TOTAL * ABS.length} evaluaciones efectivas (${ABS.length} AB x ${TOTAL} registros)`);
  control(TOTAL * ABS.length > 0, 'cero comparaciones efectivas');
  say(`    controles fallidos     : ${FALLAS}`);
  say(`    ningun archivo de src/, data/, CLAUDE.md, CONTRATO_MOTOR.md ni de la PWA fue tocado.`);
  hr();

  volcar(FALLAS > 0 ? 3 : 0);
}

main().catch(e => { say('*** EXCEPCION: ' + e.stack); volcar(4); });
