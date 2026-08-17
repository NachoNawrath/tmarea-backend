// _bitacoras/derivacion_cierre_2026-08-16/01_verificar_derivacion.js
//
// Verifica la derivación del estado de cierre contra los 444 registros del
// sondaje. NO reimplementa el derivador: lo IMPORTA de src/ y mide su salida.
//
// UNIVERSO: los seis .json de sondaje-sitport/. El guard NO es tautológico —
// no construye su universo desde el archivo que valida.
//
// SALIDAS DE ERROR:
//   exit 3  un conteo no cierra contra lo medido y publicado
//   exit 4  no se pudo importar un criterio versionado (literal no encontrado)
//   exit 5  cero comparaciones efectivas
//   exit 6  un sha256 de insumo cambió entre el arranque y el cierre
//
// SHELL: los comandos que este archivo transcribe para que el owner los repita
// van en PowerShell (§7.3). El agente lo corrió con `node` desde bash.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const SONDAJE = path.join(RAIZ, 'sondaje-sitport');
const SALIDA = path.join(__dirname, '01_verificar_derivacion.txt');

// ── LO QUE SE IMPORTA EN VEZ DE REESCRIBIR ──────────────────────────────────
const { derivarCierre } = require(path.join(RAIZ, 'src', 'services', 'cierre-derivador'));
const { normalizarRestriccion } = require(path.join(RAIZ, 'src', 'services', 'sitport-parser'));

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

function control(ok, rotulo) {
  if (!ok) { FALLAS++; say('    *** CONTROL FALLIDO: ' + rotulo); }
  return ok;
}

function cierra(rotulo, partes, total) {
  const s = partes.reduce((a, b) => a + b, 0);
  const ok = s === total;
  if (!ok) FALLAS++;
  return `suma ${s} / ${total} — ${ok ? 'CIERRA' : '*** NO CIERRA'}  (${rotulo})`;
}

const rp = (v, n) => String(v).padStart(n);
const pad = (s, n) => String(s).padEnd(n);

// ─────────────────────────────────────────────────────────────────────────────
hr();
say('VERIFICACION DE LA DERIVACION DEL ESTADO DE CIERRE — OPCION D (D-C1..D-C5)');
say('Sesion DERIVACION-DE-CIERRE, 2026-08-16. Mide src/services/cierre-derivador.js');
hr();
say('');
say('  El derivador se IMPORTA de src/, no se copia. Lo que se mide es el codigo');
say('  que corre en el backend, no una reconstruccion de el.');
say('');

// ── (0) INSUMOS Y SUS SHA256 AL ARRANQUE ────────────────────────────────────
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
  if (!fs.existsSync(p)) morir(4, `falta el insumo ${f} — sin material no hay verificacion`);
  shaAntes[f] = shaDe(p);
  say(`    ${pad(f, 38)} ${shaAntes[f].slice(0, 32)}`);
}
say('');
say('    Ningun insumo se abre en escritura. Los sha256 se recomprueban al cierre.');
say('');

// ── (1) CARGA Y DENOMINADOR ─────────────────────────────────────────────────
hr('-');
say('(1) EL DENOMINADOR — 444 FILAS, CON SU CONTROL INTERNO');
hr('-');
const filas = [];
for (const f of CAPTURAS) {
  const j = JSON.parse(fs.readFileSync(path.join(SONDAJE, f), 'utf8'));
  const rs = j.recordsets[0];
  if (rs.length !== j.rowsAffected[0]) morir(3, `rowsAffected no coincide con recordsets[0] en ${f}`);
  for (const r of rs) filas.push({ captura: f, r });
  say(`    ${pad(f, 38)} ${rp(rs.length, 3)} registros  (rowsAffected coincide)`);
}
say(`    ${pad('TOTAL', 38)} ${rp(filas.length, 3)}`);
if (filas.length !== 444) morir(3, `el denominador no es 444 sino ${filas.length}`);
say('');
say('    "Fila" = captura x registro. Una misma restriccion vista en cinco capturas');
say('    son cinco filas y UNA restriccion. Donde la diferencia importa se dan los');
say('    dos numeros.');
say('');

// ── (2) LA DERIVACION CORRIDA SOBRE LOS 444 ─────────────────────────────────
hr('-');
say('(2) LA DERIVACION CORRIDA SOBRE LOS 444 — CONTEOS CONTRA LO MEDIDO');
hr('-');
const der = filas.map((x) => ({ ...x, c: derivarCierre(x.r) }));
COMPARACIONES += der.length;

const cerrados = der.filter((x) => x.c.estado === 'cerrado');
const porPredicado = cerrados.filter((x) => x.c.via === 'predicado');
const porEjes = cerrados.filter((x) => x.c.via === 'ejes');
const abiertos = der.filter((x) => x.c.estado === 'sin_cierre_declarado');

say('');
say(`    ${pad('', 42)} ${rp('medido', 7)}  ${rp('esperado', 8)}`);
const ESPERADO = [
  ['D  = predicado amplio U red de ejes', cerrados.length, 335],
  ['Ba = predicado amplio (via=predicado)', porPredicado.length, 327],
  ['red de tres ejes (via=ejes), en FILAS', porEjes.length, 8],
  ['sin cierre declarado', abiertos.length, 109],
];
for (const [rot, medido, esp] of ESPERADO) {
  const ok = medido === esp;
  if (!ok) FALLAS++;
  COMPARACIONES++;
  say(`    ${pad(rot, 42)} ${rp(medido, 7)}  ${rp(esp, 8)}   ${ok ? 'OK' : '*** DISCREPA'}`);
}
say(`    ${cierra('estado', [cerrados.length, abiertos.length], 444)}`);
say('');

const idsRed = [...new Set(porEjes.map((x) => x.r.IDRestriccion))].sort((a, b) => a - b);
say(`    LA RED EN RESTRICCIONES DISTINTAS: ${idsRed.length} (esperado 4)`);
control(idsRed.length === 4, 'la red no son 4 restricciones');
control(JSON.stringify(idsRed) === JSON.stringify([94987, 95163, 95205, 95295]),
  'los IDs de la red no son los medidos');
for (const id of idsRed) {
  const f = porEjes.find((x) => x.r.IDRestriccion === id);
  const veces = porEjes.filter((x) => x.r.IDRestriccion === id).length;
  say(`      ID ${id} · ${pad(String(f.r.GLBahia).trim(), 26)} · en ${veces} captura(s)`);
  say(`         ${JSON.stringify(String(f.r.Observacion).slice(0, 120))}`);
}
say('');
say('    >>> LA RED NO ES EL TIPEO DE PUERTO MONTT. "PURTO CERRADO" (ID 95208) trae');
say('        CERRADO intacto y entra por el PREDICADO, sin ninguna aproximacion. Lo');
say('        que la red captura son cuatro restricciones que NUNCA dicen cerrado.');
{
  const pm = der.filter((x) => /PURTO\s+CERRAD/i.test(String(x.r.Observacion || '')));
  control(pm.length > 0, 'no se encontro el registro del tipeo — literal no hallado es FALLA');
  for (const x of pm) {
    say(`        ID ${x.r.IDRestriccion} · estado=${x.c.estado} · via=${x.c.via}`);
    control(x.c.via === 'predicado', 'el tipeo no entra por el predicado');
    COMPARACIONES++;
  }
}
say('');

// ── (3) D-C3 · LOS CUATRO ESTADOS DE ALCANCE ────────────────────────────────
hr('-');
say('(3) D-C3 · LOS CUATRO ESTADOS DE ALCANCE — DENOMINADOR 335');
hr('-');
say('');
const porTipo = (t) => cerrados.filter((x) => x.c.alcance.tipo === t);
const A_umbral = porTipo('umbral');
const A_total = porTipo('total');
const A_menores = porTipo('menores_sin_umbral');
const A_nolegible = porTipo('no_legible');
const ALC = [
  ['umbral (con numero)', A_umbral.length, 217],
  ['total (parser:69, TODO TIPO DE NAVES)', A_total.length, 5],
  ['menores_sin_umbral (parser:92/:95)', A_menores.length, 94],
  ['no_legible', A_nolegible.length, 19],
];
for (const [rot, medido, esp] of ALC) {
  const ok = medido === esp;
  if (!ok) FALLAS++;
  COMPARACIONES++;
  say(`    ${pad(rot, 42)} ${rp(medido, 7)}  ${rp(esp, 8)}   ${ok ? 'OK' : '*** DISCREPA'}`);
}
say(`    ${cierra('alcance', ALC.map((a) => a[1]), 335)}`);
say('');
say('    >>> LA CORRECCION DEL OWNER, MEDIDA: el prompt de esta sesion traia');
say('        "99 de 118 son MENORES sin numero". Son 94. Los otros 5 son cierre');
say('        TOTAL declarado, y plegarlos a "menores" les ANGOSTA el alcance.');
say('');
say('    LOS CINCO DE `total`, LISTADOS CON SU ID — para que se vea que NO son');
say('    "menores" (pedido del owner):');
for (const x of A_total) {
  say(`      ID ${x.r.IDRestriccion} · ${pad(String(x.r.GLBahia).trim(), 24)} · ${x.captura}`);
  say(`         NaveRecibe: ${JSON.stringify(String(x.r.NaveRecibe))}`);
  say(`         ${JSON.stringify(String(x.r.Observacion).slice(0, 140))}`);
  const nm = normalizarRestriccion(x.r);
  control(nm.bloqueo_total === true, `ID ${x.r.IDRestriccion} no trae bloqueo_total del parser`);
  control(nm.umbral_ab_fuera === null, `ID ${x.r.IDRestriccion} trae umbral y no deberia`);
  COMPARACIONES += 2;
}
say('');
say('    Los cinco traen `bloqueo_total=true` del parser (sitport-parser.js:69) y');
say('    umbral null. Es la MISMA rama que el motor ya usa para "Puerto cerrado para');
say('    todo tipo de naves" (restriction-rules-engine.js:40): no es un criterio');
say('    nuevo, es el que ya estaba, leido por su rama en vez de por su null.');
say('');

// ── (4) D-C5 · LA UNIDAD ────────────────────────────────────────────────────
hr('-');
say('(4) D-C5 · LA UNIDAD SE LEE Y NO SE CONVIERTE — DENOMINADOR 217');
hr('-');
say('');
const sinUnidad = A_umbral.filter((x) => x.c.alcance.unidad == null);
const nAB = A_umbral.filter((x) => x.c.alcance.unidad === 'AB').length;
const nTRG = A_umbral.filter((x) => x.c.alcance.unidad === 'TRG').length;
say(`    unidad AB  : ${rp(nAB, 4)}`);
say(`    unidad TRG : ${rp(nTRG, 4)}`);
say(`    sin unidad : ${rp(sinUnidad.length, 4)}   <- tiene que ser CERO`);
say(`    ${cierra('unidad', [nAB, nTRG, sinUnidad.length], 217)}`);
COMPARACIONES += A_umbral.length;
control(sinUnidad.length === 0, 'hay umbrales sin unidad — un literal no hallado es FALLA');
for (const x of sinUnidad) {
  say(`      *** ID ${x.r.IDRestriccion} umbral=${x.c.alcance.umbral} sin unidad`);
  say(`          ${JSON.stringify(String(x.r.Observacion).slice(0, 140))}`);
}
say('');
say('    HALLAZGO DE ESTA SESION — SON OCHO GRAFIAS, NO SIETE.');
say('    `ejes_cierre` §1.5 publica siete (A.B. · AB · AB. · ARQUEO · TRG · TRG// ·');
say('    TRG///). La octava es "A/B." con BARRA, y aparece en ID 95208 (PUERTO');
say('    MONTT, captura del 01-08): "EMBARCACIONES MENORES DE 50 A/B.".');
{
  const x = der.find((y) => y.r.IDRestriccion === 95208);
  control(!!x, 'no se encontro el ID 95208 — literal no hallado es FALLA');
  if (x) {
    say(`      ID 95208 · umbral=${x.c.alcance.umbral} · unidad=${JSON.stringify(x.c.alcance.unidad)}`);
    control(x.c.alcance.umbral === 50 && x.c.alcance.unidad === 'AB',
      'la octava grafia no se lee');
    COMPARACIONES++;
  }
}
say('    NO invalida esa medicion: su metodo contaba "el token que sigue a un');
say('    numero" y la barra parte el token. Es el BORDE de su metodo, no un error.');
say('    El parser YA la leia (sitport-parser.js:47 acepta A\\/?\\.?B) — el umbral 50');
say('    salia bien; lo que faltaba era leerle la unidad.');
say('');

// ── (5) D-C4 · LOS 19 CAEN AL GENERICO Y NO DESAPARECEN ─────────────────────
hr('-');
say('(5) D-C4 · LOS 19 SIN UMBRAL LEGIBLE — CAEN AL GENERICO Y SIGUEN EN EL RESULTADO');
hr('-');
say('');
const genericos = cerrados.filter((x) => x.c.aviso_modo === 'generico');
say(`    aviso_modo = 'generico' dentro de D : ${genericos.length} / 335   (esperado 19)`);
control(genericos.length === 19, 'los genericos dentro de D no son 19');
control(genericos.every((x) => x.c.estado === 'cerrado'), 'algun generico dejo de declarar cierre');
control(genericos.every((x) => x.c.texto_original && x.c.texto_original.length > 0),
  'algun generico perdio su texto original');
COMPARACIONES += genericos.length * 3;
say(`    de esos, siguen con estado='cerrado'  : ${genericos.filter((x) => x.c.estado === 'cerrado').length} / ${genericos.length}`);
say(`    de esos, conservan texto_original     : ${genericos.filter((x) => x.c.texto_original.length > 0).length} / ${genericos.length}`);
say('');
say('    LOS DIECINUEVE, CON SU ID Y SU RESTRICCION:');
const idsGen = [...new Set(genericos.map((x) => x.r.IDRestriccion))].sort((a, b) => a - b);
say(`    (${genericos.length} filas = ${idsGen.length} restricciones distintas)`);
for (const id of idsGen) {
  const g = genericos.filter((x) => x.r.IDRestriccion === id);
  say(`      ID ${id} · ${pad(String(g[0].r.GLBahia).trim(), 24)} · ${g.length} fila(s) · via=${g[0].c.via}`);
  say(`         ${JSON.stringify(String(g[0].r.Observacion).slice(0, 116))}`);
}
say('');
say('    >>> EL GENERICO ES UN PISO, NO UN REEMPLAZO. Los otros 316 de D conservan');
say('        su detalle: 217 con umbral y unidad, 5 con cierre total, 94 con');
say('        "menores sin umbral" dicho asi por la fuente.');
const conDetalle = cerrados.filter((x) => x.c.aviso_modo === 'detalle').length;
say(`        aviso_modo='detalle' dentro de D : ${conDetalle} / 335`);
say(`    ${cierra('aviso_modo', [conDetalle, genericos.length], 335)}`);
say('');

// ── (6) EL TEXTO NO SE REESCRIBE ────────────────────────────────────────────
hr('-');
say('(6) D-C4 · EL TEXTO DE LA CAPITANIA VIAJA TAL CUAL — 444 COMPARACIONES');
hr('-');
say('');
let identicos = 0;
for (const x of der) {
  if (x.c.texto_original === (x.r.Observacion || '')) identicos++;
  COMPARACIONES++;
}
say(`    texto_original identico byte a byte a Observacion : ${identicos} / 444`);
control(identicos === 444, 'el texto original no viaja identico');
say('');
say('    El derivador normaliza para DECIDIR y nunca para PRODUCIR. La normalizacion');
say('    no toca el texto que sale.');
say('');

// ── (7) LA CAUSA NO SE MOVIO ────────────────────────────────────────────────
hr('-');
say('(7) D-C1 · LA CAUSA NO SE MOVIO — `condicion_legible` INTACTA');
hr('-');
say('');
say('    `derivarCondicion` se EXTRAE de sitport-routes.js como texto y se ejecuta');
say('    ese texto — no se transcribe a mano. Misma tecnica que las tres sesiones');
say('    de medicion anteriores.');
const srcRutas = fs.readFileSync(path.join(RAIZ, 'src', 'routes', 'sitport-routes.js'), 'utf8');
const iIni = srcRutas.indexOf('function derivarCondicion(r) {');
if (iIni === -1) morir(4, 'no se encontro `function derivarCondicion(r) {` en sitport-routes.js');
const resto = srcRutas.slice(iIni);
const mFin = resto.match(/\r?\n\}\r?\n/);
if (!mFin) morir(4, 'no se pudo delimitar el cuerpo de derivarCondicion');
const fuenteDeriva = resto.slice(0, mFin.index + mFin[0].length);
let derivarCondicion;
try {
  derivarCondicion = new Function(`${fuenteDeriva}; return derivarCondicion;`)();
} catch (e) { morir(4, 'derivarCondicion no evalua: ' + e.message); }

const tallyCond = new Map();
for (const x of der) {
  const v = String(derivarCondicion(x.r));
  tallyCond.set(v, (tallyCond.get(v) || 0) + 1);
  COMPARACIONES++;
}
let sumaCond = 0;
say('');
say('    las etiquetas de `condicion_legible` sobre los 444:');
for (const [k, v] of [...tallyCond.entries()].sort((a, b) => b[1] - a[1])) {
  say(`      ${pad(k, 32)} ${rp(v, 4)}`);
  sumaCond += v;
}
say(`    ${cierra('condicion_legible', [sumaCond], 444)}`);
say('');
say('    ESTA SESION NO TOCO `derivarCondicion`: cero lineas modificadas. La tabla');
say('    de arriba es la MISMA que publicaron cierre_observacion §6.2 y ejes_cierre');
say('    §5.3 sobre las dos bolsas (39+7 = 46 "Puerto Cerrado", 18 "Asociados a');
say('    elemento y/o ip"). El estado ahora sale por su propia ranura y la causa se');
say('    queda con la suya.');
{
  const pc = tallyCond.get('Puerto Cerrado') || 0;
  const ae = tallyCond.get('Asociados a elemento y/o ip') || 0;
  control(pc === 46, `'Puerto Cerrado' deberia dar 46 sobre los 444 y da ${pc}`);
  control(ae === 18, `'Asociados a elemento y/o ip' deberia dar 18 y da ${ae}`);
  COMPARACIONES += 2;
}
say('');

// ── (8) LA CONVIVENCIA, CON EL CRITERIO IMPORTADO VERBATIM ──────────────────
hr('-');
say('(8) D-C1 · LA CONVIVENCIA — 249 DE 254, CON EL CRITERIO IMPORTADO VERBATIM');
hr('-');
say('');
say('    El 249 se hereda de ejes_cierre §5.1. En la Fase 1 lo REESCRIBI y me dio');
say('    215 — porque mi regex no era la suya. Aca se IMPORTA del instrumento');
say('    versionado en vez de transcribirlo: se extrae RE_CAUSA como texto de');
say('    _bitacoras/ejes_cierre_2026-08-16/02_medir_actividades.js:339 y se evalua');
say('    ese texto. Si el literal no esta, es FALLA (exit 4), no "no aplicable".');
const srcAct = fs.readFileSync(
  path.join(RAIZ, '_bitacoras', 'ejes_cierre_2026-08-16', '02_medir_actividades.js'), 'utf8');
const mCausa = srcAct.match(/const RE_CAUSA = (\/[^\n]*?\/);/);
if (!mCausa) morir(4, 'no se pudo extraer RE_CAUSA de 02_medir_actividades.js');
let RE_CAUSA;
try { RE_CAUSA = eval(mCausa[1]); } catch (e) { morir(4, 'RE_CAUSA no evalua: ' + e.message); }
if (!(RE_CAUSA instanceof RegExp)) morir(4, 'RE_CAUSA no es RegExp');
say('');
say(`    RE_CAUSA importada: ${RE_CAUSA}`);

// y el criterio 254/190, tambien importado verbatim. NO se transcribe: el
// primer intento de esta sesion lo escribio como /PUERTO CERRADO|CONDICION DE
// PUERTO/ y el original dice CONDICION\s*DE\s*PUERTO. Sobre este material los
// dos dan 254, pero no son el mismo criterio — el original tambien alcanza la
// forma pegada. Se extrae del archivo y se evalua ese texto.
const srcContraste = fs.readFileSync(
  path.join(RAIZ, '_bitacoras', 'sondaje_cierre_2026-08-16', '03_contraste_texto.js'), 'utf8');
const mCrit = srcContraste.match(/filas\.filter\(\(\{ r \}\) => (\/[^\n]*?\/)\.test\(norm\(r\.Observacion\)\)\)/);
if (!mCrit) morir(4, 'no se pudo extraer el criterio 254/190 de 03_contraste_texto.js');
let CRITERIO;
try { CRITERIO = eval(mCrit[1]); } catch (e) { morir(4, 'el criterio 254/190 no evalua: ' + e.message); }
if (!(CRITERIO instanceof RegExp)) morir(4, 'el criterio 254/190 no es RegExp');
say(`    CRITERIO 254/190 importado de 03_contraste_texto.js:84: ${CRITERIO}`);

const normCrit = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase();
const ent = (s) => String(s == null ? '' : s)
  .replace(/&LT;/gi, '<').replace(/&GT;/gi, '>')
  .replace(/&AMP;/gi, '&').replace(/&QUOT;/gi, '"');
const n3 = (s) => normCrit(ent(s)).replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const bolsaA = der.filter((x) => CRITERIO.test(normCrit(x.r.Observacion)));
const bolsaB = der.filter((x) => !CRITERIO.test(normCrit(x.r.Observacion)));
say('');
say(`    bolsa A (declara cierre por el criterio de 254) : ${bolsaA.length}`);
say(`    bolsa B                                         : ${bolsaB.length}`);
say(`    ${cierra('particion 254/190', [bolsaA.length, bolsaB.length], 444)}`);
control(bolsaA.length === 254 && bolsaB.length === 190, 'la particion 254/190 no reproduce');

const cell = (cierreB, causaB) => der.filter((x) =>
  (CRITERIO.test(normCrit(x.r.Observacion)) === cierreB) &&
  (RE_CAUSA.test(n3(x.r.Observacion)) === causaB)).length;
const cc = cell(true, true), cs = cell(true, false), sc = cell(false, true), ss = cell(false, false);
COMPARACIONES += 444;
say('');
say(`    declaran CIERRE  Y  causa   : ${rp(cc, 4)}   (esperado 249)`);
say(`    declaran CIERRE, sin causa  : ${rp(cs, 4)}   (esperado   5)`);
say(`    solo causa, sin cierre      : ${rp(sc, 4)}   (esperado 134)`);
say(`    ni cierre ni causa          : ${rp(ss, 4)}   (esperado  56)`);
say(`    ${cierra('convivencia', [cc, cs, sc, ss], 444)}`);
control(cc === 249, `la convivencia deberia dar 249 y da ${cc}`);
control(cs === 5 && sc === 134 && ss === 56, 'la matriz de convivencia no reproduce');
COMPARACIONES += 4;
say('');
say('    >>> REPRODUCE. Y esa es la razon por la que el estado necesita su propia');
say('        ranura: en 249 de 254 el dato trae las dos cosas, asi que una salida');
say('        de una sola ranura tiene que tirar una de las dos en el 98% de los');
say('        casos. Es lo que le pasaba a `condicion_legible`, que tapaba 157 de');
say('        173 cierres — y deja de pasarle porque ya no compite con nada.');
{
  const con173 = bolsaA.filter((x) => /PUERTO CERRADO/.test(normCrit(x.r.Observacion)));
  const tapados = con173.filter((x) => derivarCondicion(x.r) !== 'Puerto Cerrado');
  say('');
  say(`    los 157 de 173, remedidos: literal "PUERTO CERRADO" = ${con173.length}, tapados = ${tapados.length}`);
  control(con173.length === 173 && tapados.length === 157, 'el 157/173 no reproduce');
  const tapadosCerrados = tapados.filter((x) => x.c.estado === 'cerrado').length;
  say(`    de esos 157 tapados, cuantos el DERIVADOR declara cerrados : ${tapadosCerrados} / ${tapados.length}`);
  control(tapadosCerrados === tapados.length,
    'algun cierre tapado por la causa sigue sin ser declarado por el derivador');
  COMPARACIONES += 3;
  say('');
  say('    >>> LOS 157 QUE LA CAUSA TAPABA ESTAN LOS 157 DECLARADOS POR EL ESTADO.');
  say('        Eso es D-C1 medido: no compiten, conviven.');
}
say('');

// ── (9) LO QUE EL DERIVADOR NO HACE ─────────────────────────────────────────
hr('-');
say('(9) CONTROLES NEGATIVOS — LO QUE EL DERIVADOR NO DEBE HACER');
hr('-');
say('');
{
  const cerrazon = der.filter((x) => /CERRAZ/i.test(String(x.r.Observacion || '')));
  say(`    registros con CERRAZON (niebla, una CAUSA) : ${cerrazon.length} / 444`);
  control(cerrazon.length > 0, 'no se encontro CERRAZON — literal no hallado es FALLA');
  for (const x of cerrazon) {
    const traeFamilia = /\bCERRAD[OA]S?\b/.test(n3(x.r.Observacion));
    say(`      ID ${x.r.IDRestriccion} · estado=${pad(x.c.estado, 22)} trae CERRAD* aparte: ${traeFamilia}`);
    control(x.c.estado === 'cerrado' ? traeFamilia : true,
      `ID ${x.r.IDRestriccion}: se declaro cierre sin traer la familia — el predicado se volvio aproximado`);
    COMPARACIONES++;
  }
  say('');
  say('    >>> NINGUNO de los que declara cierre lo hace POR la palabra CERRAZON.');
  say('        El que sale cerrado trae CERRADO aparte. `\\bCERRAD[OA]S?\\b` no');
  say('        alcanza a CERRAZON por construccion, no por excepcion.');
}
say('');
{
  const sinTexto = der.filter((x) => x.c.razon_sin_cierre === 'sin_texto');
  say(`    Observacion vacia o solo espacios  : ${sinTexto.length} / 444   (esperado 26)`);
  control(sinTexto.length === 26, 'los sin_texto no son 26');
  const conZona = sinTexto.filter((x) => /DENTRO|FUERA/.test(String(x.r.AreaRestriccion || '').toUpperCase())).length;
  say(`    de esos, con zona por CAMPO        : ${conZona}`);
  say(`    de esos, a los que se les invento un cierre : ${sinTexto.filter((x) => x.c.estado === 'cerrado').length}   <- CERO (INV-0.2)`);
  control(sinTexto.every((x) => x.c.estado === 'sin_cierre_declarado'),
    'se declaro cierre sobre un registro sin texto — eso es fabricar dato');
  COMPARACIONES += sinTexto.length;
}
say('');
{
  // El derivador NO produce ninguna etiqueta de causa: la ranura sigue siendo de
  // derivarCondicion. Se mide sobre las claves reales de la salida.
  const claves = Object.keys(der[0].c).sort();
  say(`    claves que emite el derivador : ${claves.join(' · ')}`);
  const prohibidas = claves.filter((k) => /condicion|causa|nivel|bandera|veredicto/.test(k));
  say(`    de esas, que pisen la ranura de la causa o del motor : ${prohibidas.length}   <- CERO`);
  control(prohibidas.length === 0, 'el derivador emite una clave que pisa la causa o el veredicto del motor');
  COMPARACIONES++;
}
say('');

// ── (10) SHA256 AL CIERRE ───────────────────────────────────────────────────
hr('-');
say('(10) INSUMOS — SHA256 AL CIERRE');
hr('-');
let movidos = 0;
for (const f of CAPTURAS) {
  const ahora = shaDe(path.join(SONDAJE, f));
  const ok = ahora === shaAntes[f];
  if (!ok) movidos++;
  say(`    ${pad(f, 38)} ${ok ? 'IDENTICO' : '*** CAMBIO'}`);
}
if (movidos > 0) morir(6, `${movidos} insumos cambiaron de sha256 durante la corrida`);
say('');

// ── CIERRE ──────────────────────────────────────────────────────────────────
hr();
say('CIERRE DEL INSTRUMENTO');
hr();
say(`    comparaciones efectivas : ${COMPARACIONES}`);
say(`    controles fallidos      : ${FALLAS}`);
if (COMPARACIONES === 0) morir(5, 'cero comparaciones efectivas — el instrumento no midio nada');
if (FALLAS > 0) morir(3, `${FALLAS} controles fallidos`);
say('    >>> TODOS LOS CONTEOS CIERRAN CONTRA LO MEDIDO Y PUBLICADO.');
hr();

fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
process.exit(0);
