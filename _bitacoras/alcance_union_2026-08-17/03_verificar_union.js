// _bitacoras/alcance_union_2026-08-17/03_verificar_union.js
//
// Sesión ALCANCE-UNION, FASE 2. Sobre 0e385858 + el cambio de esta sesión.
//
// QUÉ VERIFICA, sobre los 444 y con el denominador de la sesión (167
// restricciones · 335 filas cerradas):
//   (1) la partición nueva, en filas Y en restricciones, contra LA PREDICCIÓN
//       de la Fase 1 (R3). Si difiere, se dice con el ID que la produce.
//   (2) el reparto de R2: cuántas cambian, cuántas múltiples NO cambian,
//       cuántas de alcance único NO cambian. Tiene que cerrar en las dos unidades.
//   (3) los 9 que emitían el más angosto, uno por uno, antes y después.
//   (4) los 4 de cola abierta, explícitos.
//   (5) los 15 `num+num`, con su umbral antes y después — cambian de número sin
//       cambiar de `tipo`, así que la partición sola NO los ve.
//   (6) los 10 descartados por lectura: NO se ensanchan. exit 7 si uno se mueve.
//   (7) `aviso_modo`: el delta de 94985 y CERO otros. exit 8 si aparece otro.
//   (8) el contador de "texto leído a medias" (unión no sumable). Se espera 0.
//   (9) el CONTROL DE CONTENCIÓN de la fuente B sobre los 444: todo umbral que
//       el parser extrae tiene que estar CONTENIDO en la unión.
//
// EL ANTES NO SE HEREDA DE LA BITÁCORA: se RECALCULA corriendo la versión previa
// de `derivarAlcance`, reconstruida desde el commit 0e385858 con `git show`. Un
// "antes" copiado a mano sería la tabla validándose contra sí misma.
//
// El universo son los seis .json de sondaje-sitport/, que este archivo no
// escribe ni deriva de sí mismo. sha256 al arranque y al cierre.
//
// exit 3 conteo que no cierra · exit 4 extracción fallida · exit 5 cero
// comparaciones · exit 6 insumo cambiado · exit 7 un descartado se ensanchó ·
// exit 8 un aviso_modo inesperado · exit 9 el control de contención falló.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const SONDAJE = path.join(RAIZ, 'sondaje-sitport');
const SALIDA = path.join(__dirname, '03_verificar_union.txt');

const { derivarCierre } = require(path.join(RAIZ, 'src', 'services', 'cierre-derivador'));
const { normalizarRestriccion } = require(path.join(RAIZ, 'src', 'services', 'sitport-parser'));

const lineas = [];
const say = (s = '') => { lineas.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
let COMPARACIONES = 0, FALLAS = 0;
// El temporal del "antes" se borra TAMBIEN al abortar. La primera version no lo
// hacia —el unlink vivia solo en el cierre feliz— y el exit 8 dejo el archivo
// tirado en el directorio de la bitacora. Un instrumento que aborta tiene que
// dejar el arbol como lo encontro, no solo cuando termina bien.
let TMP_VIEJO = null;
function limpiar() {
  if (TMP_VIEJO) { try { fs.unlinkSync(TMP_VIEJO); } catch (e) { /* ya no estaba */ } }
}
function morir(code, msg) {
  say(''); say('*** ABORTA — ' + msg);
  // los sha256 se recomprueban aunque se aborte: si un insumo cambio, hay que
  // saberlo incluso cuando la corrida termina mal.
  try {
    for (const f of Object.keys(shaAntes)) {
      if (shaDe(path.join(SONDAJE, f)) !== shaAntes[f]) say(`*** ADEMAS: el sha256 de ${f} CAMBIO durante la corrida`);
    }
    say('    (sha256 de insumos recomprobados al abortar)');
  } catch (e) { say('    *** no se pudieron recomprobar los sha256: ' + e.message); }
  limpiar();
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
say('ALCANCE-UNION — FASE 2. VERIFICACION SOBRE LOS 444.');
say('Denominador de la sesion: 167 restricciones · 335 filas cerradas.');
hr();
say('');

// ── (0) INSUMOS ─────────────────────────────────────────────────────────────
const CAPTURAS = ['restricciones_2026-07-30_19-42.json', 'restricciones_2026-07-31_16-32.json',
  'restricciones_2026-07-31_20-32.json', 'restricciones_2026-07-31_21-01.json',
  'restricciones_2026-08-01_13-14.json', 'check_ahora.json'];
const shaDe = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const shaAntes = {};
hr('-'); say('(0) INSUMOS — SHA256 AL ARRANQUE'); hr('-');
for (const f of CAPTURAS) { shaAntes[f] = shaDe(path.join(SONDAJE, f)); say(`    ${pad(f, 38)} ${shaAntes[f].slice(0, 32)}`); }
say('');

// ── (0b) EL "ANTES", RECONSTRUIDO DEL COMMIT — NO COPIADO ───────────────────
hr('-'); say('(0b) EL "ANTES" SE RECONSTRUYE DE 0e385858, NO SE HEREDA DE BITACORA'); hr('-');
let fuenteVieja;
try {
  fuenteVieja = execFileSync('git', ['show', '0e385858:src/services/cierre-derivador.js'],
    { cwd: RAIZ, encoding: 'utf8', maxBuffer: 8 << 20 });
} catch (e) { morir(4, 'no se pudo recuperar cierre-derivador.js de 0e385858: ' + e.message); }
const shaVieja = crypto.createHash('sha256').update(fuenteVieja).digest('hex');
// LO UNICO QUE SE LE TOCA, Y SE DECLARA: el especificador del require. El archivo
// vive en src/services/ y resuelve './sitport-parser' contra SU directorio; al
// cargarlo desde acá hay que darle la ruta absoluta. Se reemplaza el
// ESPECIFICADOR, no el codigo: ninguna linea de criterio cambia, y el control de
// abajo exige que el reemplazo haya ocurrido exactamente una vez.
const ESPEC = "require('./sitport-parser')";
if (fuenteVieja.split(ESPEC).length - 1 !== 1) morir(4, `el especificador ${ESPEC} no aparece exactamente una vez en la fuente recuperada`);
const parcheada = fuenteVieja.replace(ESPEC,
  'require(' + JSON.stringify(path.join(RAIZ, 'src', 'services', 'sitport-parser')) + ')');
const tmpViejo = path.join(__dirname, ".derivador-0e385858.tmp.js"); TMP_VIEJO = tmpViejo;
fs.writeFileSync(tmpViejo, parcheada, { encoding: 'utf8' });
const VIEJO = require(tmpViejo);
say(`    recuperado de git show 0e385858 — ${fuenteVieja.length} bytes, sha256 ${shaVieja.slice(0, 32)}`);
say(`    unico cambio: el especificador ${ESPEC} -> ruta absoluta (1 ocurrencia, controlada).`);
say('    se carga como modulo aparte; el archivo temporal se borra al cierre.');
if (typeof VIEJO.derivarCierre !== 'function') morir(4, 'la version recuperada no expone derivarCierre');
COMPARACIONES++;
say('');

// ── (0c) LA TABLA DE LECTURA, EXTRAIDA DE SU ARCHIVO VERSIONADO ─────────────
function extraerTabla(archivo, marca) {
  const t = fs.readFileSync(archivo, 'utf8');
  const i = t.indexOf('const ' + marca + ' = {');
  if (i < 0) morir(4, `no se pudo ubicar ${marca}`);
  let j = t.indexOf('{', i), prof = 0, fin = -1;
  for (let k = j; k < t.length; k++) { if (t[k] === '{') prof++; else if (t[k] === '}') { prof--; if (!prof) { fin = k; break; } } }
  if (fin < 0) morir(4, `no se pudo cerrar ${marca}`);
  return eval('(' + t.slice(j, fin + 1) + ')');   // eslint-disable-line no-eval
}
const TABLA = extraerTabla(path.join(RAIZ, '_bitacoras', 'alcance_multiple_2026-08-17', '01_medir_multiple.js'), 'TABLA');
const MULTI = Object.entries(TABLA).filter(([, d]) => d.multi).map(([k]) => k);
const DESCARTADOS = Object.entries(TABLA).filter(([, d]) => !d.multi).map(([k]) => k);
COMPARACIONES++;

// ── (1) CARGA Y DERIVACION, ANTES Y DESPUES ─────────────────────────────────
const filas = [];
for (const f of CAPTURAS) {
  const j = JSON.parse(fs.readFileSync(path.join(SONDAJE, f), 'utf8'));
  const rs = j.recordsets[0];
  if (rs.length !== j.rowsAffected[0]) morir(3, `rowsAffected no coincide en ${f}`);
  for (const r of rs) filas.push({ captura: f, r });
}
if (filas.length !== 444) morir(3, `no son 444 filas sino ${filas.length}`);

const der = filas.map((x) => {
  COMPARACIONES += 2;
  return { ...x, antes: VIEJO.derivarCierre(x.r), ahora: derivarCierre(x.r) };
});

// control: estado / via / razon_sin_cierre / texto_original NO se mueven
let mov = 0;
for (const x of der) {
  COMPARACIONES++;
  if (x.antes.estado !== x.ahora.estado || x.antes.via !== x.ahora.via ||
      x.antes.razon_sin_cierre !== x.ahora.razon_sin_cierre ||
      x.antes.texto_original !== x.ahora.texto_original) mov++;
}
hr('-'); say('(1) LO QUE LA UNION NO DEBE TOCAR'); hr('-');
say(`    filas cuyo estado / via / razon_sin_cierre / texto_original cambio : ${mov} / 444`);
if (mov !== 0) { FALLAS++; say('    *** la union movio un campo que no le corresponde'); }
const cerrados = der.filter((x) => x.ahora.estado === 'cerrado');
if (cerrados.length !== 335) morir(3, `los cerrados no son 335 sino ${cerrados.length}`);
say(`    cerrados: ${cerrados.length} filas — sin cambio`);
say('');

// agrupacion por restriccion
const porId = new Map();
for (const x of cerrados) {
  const id = String(x.r.IDRestriccion);
  if (!porId.has(id)) porId.set(id, { filas: 0, r: x.r, antes: x.antes, ahora: x.ahora });
  porId.get(id).filas++;
}
if (porId.size !== 167) morir(3, `las restricciones cerradas no son 167 sino ${porId.size}`);
const filasDe = (ids) => ids.reduce((a, k) => a + porId.get(k).filas, 0);

// ── (2) LA PARTICION NUEVA CONTRA LA PREDICCION (R3) ────────────────────────
hr('-'); say('(2) R3 — LA PARTICION NUEVA CONTRA LA PREDICCION DE FASE 1'); hr('-');
const TIPOS = ['umbral', 'total', 'menores_sin_umbral', 'no_legible'];
const F = {}, R = {};
for (const t of TIPOS) { F[t] = 0; R[t] = 0; }
for (const x of cerrados) F[x.ahora.alcance.tipo]++;
for (const [, o] of porId) R[o.ahora.alcance.tipo]++;
// LA PARTICION VIGENTE ES LA MEDIDA, NO LA PREDICHA. La prediccion de Fase 1
// —215/14/88/18 y 110/10/34/13— quedo RETIRADA por el owner: era ciega a los
// registros de alcance UNICO mal leidos, que son CUATRO y estan en §(3)
// (95169, 95201, 95202, 95342). El quinto de la opcion A, 94985, NO es de
// alcance unico: es MULTIPLE y la prediccion si lo cubria. Estos son los
// numeros que la opcion A fija, y de aca en adelante son la expectativa.
const VIG_F = { umbral: 214, total: 16, menores_sin_umbral: 90, no_legible: 15 };
const VIG_R = { umbral: 109, total: 12, menores_sin_umbral: 36, no_legible: 10 };
say(`    ${pad('tipo', 22)} ${'filas'}  ${'vig.'}   ${''}      ${'restr'}  ${'vig.'}`);
let difiere = false;
for (const t of TIPOS) {
  const okF = F[t] === VIG_F[t], okR = R[t] === VIG_R[t];
  if (!okF || !okR) difiere = true;
  COMPARACIONES += 2;
  say(`    ${pad(t, 22)} ${rp(F[t], 5)}  ${rp(VIG_F[t], 4)} ${okF ? 'OK ' : '***'}    ${rp(R[t], 5)}  ${rp(VIG_R[t], 4)} ${okR ? 'OK' : '***'}`);
}
say('    ' + cierra('particion / filas', TIPOS.map((t) => F[t]), 335));
say('    ' + cierra('particion / restricciones', TIPOS.map((t) => R[t]), 167));
say(`    >>> ${difiere ? '*** LA MEDIDA NO COINCIDE CON LA PARTICION VIGENTE' : 'LA MEDIDA COINCIDE CON LA PARTICION VIGENTE'}`);
if (difiere) FALLAS++;
say('');

// ── (3) R2 — EL REPARTO ─────────────────────────────────────────────────────
hr('-'); say('(3) R2 — QUIEN CAMBIA Y QUIEN NO'); hr('-');
const igual = (a, b) => a.tipo === b.tipo && a.umbral === b.umbral && a.unidad === b.unidad;
const CAMBIAN = [], MULTI_IGUAL = [], UNICO_IGUAL = [], UNICO_CAMBIA = [];
for (const [id, o] of porId) {
  COMPARACIONES++;
  const cambia = !igual(o.antes.alcance, o.ahora.alcance);
  const esMulti = MULTI.includes(id);
  if (cambia && esMulti) CAMBIAN.push(id);
  else if (!cambia && esMulti) MULTI_IGUAL.push(id);
  else if (cambia && !esMulti) UNICO_CAMBIA.push(id);
  else UNICO_IGUAL.push(id);
}
say(`    multiples que CAMBIAN          : ${rp(CAMBIAN.length, 3)} restr · ${rp(filasDe(CAMBIAN), 3)} filas`);
say(`    multiples que NO cambian       : ${rp(MULTI_IGUAL.length, 3)} restr · ${rp(filasDe(MULTI_IGUAL), 3)} filas`);
say(`    alcance unico que NO cambia    : ${rp(UNICO_IGUAL.length, 3)} restr · ${rp(filasDe(UNICO_IGUAL), 3)} filas`);
say(`    alcance unico que CAMBIA       : ${rp(UNICO_CAMBIA.length, 3)} restr · ${rp(filasDe(UNICO_CAMBIA), 3)} filas`);
for (const id of UNICO_CAMBIA) say(`        ID ${id} · ${pad(porId.get(id).r.GLBahia, 34)} · ${pad(porId.get(id).antes.alcance.tipo, 20)} -> ${porId.get(id).ahora.alcance.tipo}`);
// LOS CUATRO SON PARTE DE LA DECISION DEL OWNER (opcion A). NO son un defecto:
// son registros de alcance UNICO cuyo alcance el codigo viejo no sabia leer.
// SON CUATRO Y NO CINCO: el quinto de la opcion A —94985— es MULTIPLE, cae en
// la bolsa `CAMBIAN` de arriba y por eso no aparece en esta lista.
// El conteo se fija en 4 y en ESTOS IDs — si aparece un quinto, o si uno de
// estos deja de moverse, el instrumento muerde. 95342 esta aca y NO en §(7)
// porque cambia de `tipo` sin cambiar de `aviso_modo`.
const UNICO_ESPERADO = ['95169', '95201', '95202', '95342'];
const ucOrd = [...UNICO_CAMBIA].sort();
COMPARACIONES++;
if (ucOrd.length !== UNICO_ESPERADO.length || ucOrd.some((id, i) => id !== UNICO_ESPERADO[i])) {
  morir(3, `los de alcance unico que cambian son ${ucOrd.join(', ')} — se esperaban exactamente ${UNICO_ESPERADO.join(', ')}`);
}
say(`      >>> son EXACTAMENTE los 4 de la opcion A que NO son multiples. El quinto`);
say(`          de la opcion A —94985— es MULTIPLE y esta contado en la bolsa de arriba.`);
say('    ' + cierra('reparto / restricciones', [CAMBIAN.length, MULTI_IGUAL.length, UNICO_IGUAL.length, UNICO_CAMBIA.length], 167));
say('    ' + cierra('reparto / filas', [filasDe(CAMBIAN), filasDe(MULTI_IGUAL), filasDe(UNICO_IGUAL), filasDe(UNICO_CAMBIA)], 335));
say(`      cambian  -> ${CAMBIAN.join(', ')}`);
say(`      multiples que no -> ${MULTI_IGUAL.join(', ')}`);
say('    ' + cierra('multiples / restricciones', [CAMBIAN.length, MULTI_IGUAL.length], MULTI.length));
say('    ' + cierra('multiples / filas', [filasDe(CAMBIAN), filasDe(MULTI_IGUAL)], filasDe(MULTI)));
say('');

// ── (4) LOS 9 QUE DEJABAN NAVES AFUERA ──────────────────────────────────────
hr('-'); say('(4) LOS 9 QUE EMITIAN EL MAS ANGOSTO — UNO POR UNO, ANTES Y DESPUES'); hr('-');
function emitidoDe(a) {
  if (a.tipo === 'umbral') return { k: 'num', v: a.umbral };
  if (a.tipo === 'total') return { k: 'todas' };
  if (a.tipo === 'menores_sin_umbral') return { k: 'menores' };
  return { k: 'generico' };
}
function cubre(emi, den) {
  if (emi.k === 'generico' || emi.k === 'todas') return true;
  if (emi.k === 'num') return den.k === 'num' ? emi.v >= den.v : false;
  if (emi.k === 'menores') { if (den.k === 'menores') return true; if (den.k === 'mayores') return false; return null; }
  return null;
}
const NUEVE = MULTI.filter((id) => {
  COMPARACIONES++;
  const e = emitidoDe(porId.get(id).antes.alcance);
  return TABLA[id].alcances.some((a) => cubre(e, a.den) === false);
});
if (NUEVE.length !== 9 || filasDe(NUEVE) !== 22) morir(3, `los que dejaban afuera no son 9/22 sino ${NUEVE.length}/${filasDe(NUEVE)}`);
say(`    reproducen: ${NUEVE.length} restricciones · ${filasDe(NUEVE)} filas`);
say('');
say(`    ${pad('ID', 8)} ${pad('bahia', 24)} ${pad('ANTES', 22)} ${pad('AHORA', 22)} ${'sigue dejando?'}`);
let siguenDejando = 0;
for (const id of NUEVE) {
  const o = porId.get(id);
  const e = emitidoDe(o.ahora.alcance);
  const falta = TABLA[id].alcances.filter((a) => cubre(e, a.den) === false);
  COMPARACIONES++;
  if (falta.length) siguenDejando++;
  const s = (a) => a.tipo + (a.umbral != null ? ' ' + a.umbral + ' ' + a.unidad : '');
  say(`    ${pad(id, 8)} ${pad(o.r.GLBahia, 24)} ${pad(s(o.antes.alcance), 22)} ${pad(s(o.ahora.alcance), 22)} ${falta.length ? '*** SI' : 'no'}`);
}
say('');
say(`    >>> siguen dejando naves sin aviso : ${siguenDejando} de 9   ${siguenDejando === 0 ? 'OK' : '*** NO'}`);
if (siguenDejando !== 0) FALLAS++;
say('');
say('    LOS 4 DE COLA ABIERTA, EXPLICITOS:');
for (const id of ['95219', '95220', '95099', '95100']) {
  const o = porId.get(id);
  COMPARACIONES++;
  const ok = o.ahora.alcance.tipo === 'total';
  if (!ok) FALLAS++;
  say(`      ID ${id} · ${pad(o.r.GLBahia, 24)} · ${pad(o.antes.alcance.tipo + (o.antes.alcance.umbral != null ? ' ' + o.antes.alcance.umbral : ''), 22)} -> ${pad(o.ahora.alcance.tipo, 8)} ${ok ? 'OK' : '*** esperado total'}`);
}
say('');

// ── (5) LOS num+num — CAMBIAN DE NUMERO SIN CAMBIAR DE TIPO ─────────────────
hr('-'); say('(5) LOS `num+num` — LA PARTICION SOLA NO LOS VE'); hr('-');
const NUMNUM = MULTI.filter((id) => TABLA[id].alcances.every((a) => a.den.k === 'num') && TABLA[id].alcances.length >= 2);
say(`    son ${NUMNUM.length} restricciones · ${filasDe(NUMNUM)} filas   (esperado 15 · 27)`);
if (NUMNUM.length !== 15 || filasDe(NUMNUM) !== 27) FALLAS++;
say('');
say(`    ${pad('ID', 8)} ${pad('bahia', 24)} ${pad('declara', 20)} ${pad('umbral antes', 14)} ${pad('umbral ahora', 14)} ${'tipo'}`);
for (const id of NUMNUM) {
  const o = porId.get(id);
  COMPARACIONES++;
  const decl = TABLA[id].alcances.map((a) => a.den.v).join('/');
  const esperado = Math.max(...TABLA[id].alcances.map((a) => a.den.v));
  const ok = o.ahora.alcance.umbral === esperado;
  if (!ok) FALLAS++;
  say(`    ${pad(id, 8)} ${pad(o.r.GLBahia, 24)} ${pad(decl, 20)} ${pad(o.antes.alcance.umbral, 14)} ${pad(o.ahora.alcance.umbral + (ok ? '' : ' ***'), 14)} ${o.ahora.alcance.tipo}`);
}
say('');

// ── (6) EL CONJUNTO NEGATIVO — LOS 10 DESCARTADOS ───────────────────────────
hr('-'); say('(6) LOS 10 DESCARTADOS POR LECTURA — NO SE ENSANCHAN'); hr('-');
say('    Un lexico que lea "NAVES MAYORES" sin exigir gobierno por predicado de');
say('    cierre ensancha 5 que nadie declaro multiples (M3: 8 disparos, 3 aciertos).');
say('');
let movidos = 0;
for (const id of DESCARTADOS) {
  const o = porId.get(id);
  if (!o) morir(4, `el descartado ${id} no esta entre los cerrados`);
  COMPARACIONES++;
  const cambio = !igual(o.antes.alcance, o.ahora.alcance);
  if (cambio) movidos++;
  const s = (a) => a.tipo + (a.umbral != null ? ' ' + a.umbral : '');
  say(`    ID ${id} · ${pad(o.r.GLBahia, 24)} · ${pad(s(o.antes.alcance), 18)} -> ${pad(s(o.ahora.alcance), 18)} ${cambio ? '*** SE MOVIO' : 'igual'}`);
}
say('');
say(`    >>> descartados que se movieron : ${movidos} de ${DESCARTADOS.length}`);
if (movidos !== 0) morir(7, `${movidos} descartado(s) por lectura se ensancharon`);
say('    OK — ninguno se ensancho.');
say('');

// ── (7) aviso_modo ──────────────────────────────────────────────────────────
hr('-'); say('(7) aviso_modo — EL DELTA DE 94985 Y CERO OTROS'); hr('-');
const movAviso = [];
for (const [id, o] of porId) { COMPARACIONES++; if (o.antes.aviso_modo !== o.ahora.aviso_modo) movAviso.push(id); }
for (const id of movAviso) {
  const o = porId.get(id);
  say(`    ID ${id} · ${pad(o.r.GLBahia, 26)} · ${o.antes.aviso_modo} -> ${o.ahora.aviso_modo}   (${o.filas} fila/s)`);
}
const gA = { detalle: 0, generico: 0 }, gD = { detalle: 0, generico: 0 };
for (const x of cerrados) { gA[x.antes.aviso_modo]++; gD[x.ahora.aviso_modo]++; }
say('');
say(`    filas  : detalle ${gA.detalle} -> ${gD.detalle}   ·   generico ${gA.generico} -> ${gD.generico}`);
const rA = { detalle: 0, generico: 0 }, rD = { detalle: 0, generico: 0 };
for (const [, o] of porId) { rA[o.antes.aviso_modo]++; rD[o.ahora.aviso_modo]++; }
say(`    restr. : detalle ${rA.detalle} -> ${rD.detalle}   ·   generico ${rA.generico} -> ${rD.generico}`);
say('    ' + cierra('aviso_modo ahora / filas', [gD.detalle, gD.generico], 335));
say('    ' + cierra('aviso_modo ahora / restricciones', [rD.detalle, rD.generico], 167));
// LA EXPECTATIVA ES LA DECISION DEL OWNER (opcion A, 2026-08-17), no la
// prediccion de Fase 1. La premisa "solo 94985" quedo RETIRADA: se habia hecho
// sobre la tabla de los 20 multiples, que por construccion no cubre registros de
// alcance UNICO mal leidos. Los cuatro son lecturas correctas del texto y los
// cuatro AMPLIAN. Si aparece un quinto, el instrumento tiene que morder igual.
const AVISO_ESPERADO = ['94985', '95169', '95201', '95202'];
const movOrd = [...movAviso].sort();
if (movOrd.length !== AVISO_ESPERADO.length || movOrd.some((id, i) => id !== AVISO_ESPERADO[i])) {
  morir(8, `aviso_modo se movio en ${movOrd.length} restricciones: ${movOrd.join(', ')} — se esperaban exactamente ${AVISO_ESPERADO.join(', ')}`);
}
for (const id of movOrd) {
  COMPARACIONES++;
  if (porId.get(id).antes.aviso_modo !== 'generico' || porId.get(id).ahora.aviso_modo !== 'detalle') {
    morir(8, `el ID ${id} no se movio de generico a detalle`);
  }
}
say('    >>> se movieron EXACTAMENTE los 4 de la opcion A, todos generico->detalle — OK');
say('');

// ── (8) TEXTO LEIDO A MEDIAS ────────────────────────────────────────────────
hr('-'); say('(8) TEXTO LEIDO A MEDIAS — LA UNION QUE NO SE PUDO SUMAR'); hr('-');
let medias = 0;
const mediasIds = [];
for (const [id, o] of porId) {
  COMPARACIONES++;
  if (o.ahora.alcance.tipo === 'no_legible' && o.ahora.alcance.componentes.length > 0) { medias++; mediasIds.push(id); }
}
say(`    cerradas con componentes leidos y union NO sumable : ${medias} de 167 restricciones`);
say(`      -> ${mediasIds.join(', ') || 'NINGUNA'}`);
say('    Esperado 0. El genérico ya salio; no se completa con un alcance que no se leyo.');
if (medias !== 0) FALLAS++;
say('');
// cuantas dependen SOLO del piso — mide si el lexico solo alcanzaria
let soloPiso = 0, soloLexico = 0, ambos = 0, ninguno = 0;
for (const [, o] of porId) {
  const cs = o.ahora.alcance.componentes;
  COMPARACIONES++;
  const p = cs.some((c) => c.regla && c.regla.startsWith('parser'));
  const l = cs.some((c) => c.regla === 'lexico:para');
  if (p && l) ambos++; else if (p) soloPiso++; else if (l) soloLexico++; else ninguno++;
}
say('    DE DONDE SALIERON LOS COMPONENTES (denominador 167 restricciones):');
say(`      solo del PISO (parser)   : ${soloPiso}      <- sin el piso, estas perderian su alcance`);
say(`      solo del LEXICO (texto)  : ${soloLexico}`);
say(`      de los dos              : ${ambos}`);
say(`      de ninguno (no_legible)  : ${ninguno}`);
say('    ' + cierra('procedencia / restricciones', [soloPiso, soloLexico, ambos, ninguno], 167));
say('');

// ── (9) CONTROL DE CONTENCION DE LA FUENTE B ────────────────────────────────
hr('-'); say('(9) CONTROL DE CONTENCION — PARSER Y DERIVADOR SOBRE LOS 444'); hr('-');
say('    Todo umbral que el parser extrae tiene que estar CONTENIDO en la union.');
say('    NO los obliga a ser iguales —D-C6 amplia a proposito— pero caza que se');
say('    separen HACIA ABAJO: si el derivador emitiera menos que el parser, es falla.');
say('');
// LA RELACION DE CONTENCION, DECLARADA ENTERA. Se escribe acá y no se importa
// del derivador a proposito: un control que tomara la retícula del archivo que
// valida seria tautologico (regla de instrumento).
//   total               contiene todo — es el tope
//   umbral U            contiene al umbral P del parser si U >= P
//   menores_sin_umbral  contiene a "las menores de P": `menores_sin_umbral`
//                       significa TODAS las menores (parser :90, "null = TODAS
//                       las menores") y P se leyo bajo la clase MENORES
//   no_legible          sale por el generico, que es el PISO de D-C4 y alcanza a
//                       todos: es mas ancho, no mas angosto
//
// LA RAMA `menores_sin_umbral` SE AGREGO EL 2026-08-17 Y SE DECLARA POR QUE.
// La primera version del control no la tenia y el control murio con exit 9 en el
// ID 95342. NO se bajo la severidad para que pasara (§0.3): lo que faltaba era
// una relacion verdadera del dominio, no una excepcion. Y como admitirla le
// quita al control la capacidad de cazar un angostamiento HACIA
// `menores_sin_umbral`, se compensa PINCHANDO el conjunto: los registros que
// caen en esa rama tienen que ser exactamente {95342}, que es el que el owner
// acepto. Un segundo caso muerde con exit 9 igual.
const POR_CLASE_ESPERADO = ['95342'];
let cont = 0, contFail = 0, porClase = [];
const fallos = [];
for (const x of cerrados) {
  const n = normalizarRestriccion(x.r);
  if (n.umbral_ab_fuera == null) continue;
  cont++;
  COMPARACIONES++;
  const a = x.ahora.alcance;
  if (a.tipo === 'menores_sin_umbral') { porClase.push(String(x.r.IDRestriccion)); continue; }
  const contenido = a.tipo === 'total' || (a.tipo === 'umbral' && a.umbral >= n.umbral_ab_fuera) || a.tipo === 'no_legible';
  if (!contenido) { contFail++; fallos.push(`${x.r.IDRestriccion}: parser ${n.umbral_ab_fuera}, union ${a.tipo} ${a.umbral}`); }
}
porClase = [...new Set(porClase)].sort();
say(`    comparaciones efectivas del control : ${cont}`);
say(`    fallos                              : ${contFail}`);
for (const f of fallos) say(`      *** ${f}`);
say(`    resueltos por la rama menores_sin_umbral : ${porClase.length}  ->  ${porClase.join(', ') || '—'}`);
if (cont === 0) morir(5, 'el control de contencion no comparo nada');
if (contFail !== 0) morir(9, `${contFail} registros donde la union es MAS ANGOSTA que el parser`);
if (porClase.length !== POR_CLASE_ESPERADO.length || porClase.some((id, i) => id !== POR_CLASE_ESPERADO[i])) {
  morir(9, `la rama menores_sin_umbral del control cubre ${porClase.join(', ')} — se esperaba exactamente ${POR_CLASE_ESPERADO.join(', ')}`);
}
say('    OK — ninguna union quedo por debajo del parser, y la rama de clase cubre');
say('    exactamente el caso que el owner acepto.');
say('');
say('    NOTA sobre `no_legible` en este control: se acepta porque el genérico es');
say('    el PISO de D-C4 y alcanza a TODOS — es mas ancho, no mas angosto. Medido');
say('    arriba: los cerrados que quedan no_legible son 10 restricciones / 15 filas,');
say('    y ninguno viene de PERDER un umbral que el parser tenia — los 4 de §(3)');
say('    que cambian con alcance unico van todos hacia MAS ancho, no hacia menos,');
say('    y el conteo de fallos de este control es 0 sobre 217 comparaciones.');
say('');

// ── (10) CIERRE ─────────────────────────────────────────────────────────────
hr('-'); say('(10) CIERRE'); hr('-');
for (const f of CAPTURAS) if (shaDe(path.join(SONDAJE, f)) !== shaAntes[f]) morir(6, `sha256 de ${f} cambio`);
say(`    los ${CAPTURAS.length} sha256 de insumo identicos al arranque — OK`);
try { fs.unlinkSync(tmpViejo); say('    el modulo temporal del "antes" fue borrado — OK'); } catch (e) { say('    *** no se pudo borrar el temporal: ' + e.message); FALLAS++; }
say(`    comparaciones efectivas : ${COMPARACIONES}`);
if (COMPARACIONES === 0) morir(5, 'cero comparaciones efectivas');
say(`    controles fallidos      : ${FALLAS}`);
hr();
say(FALLAS === 0 ? 'SIN FALLAS.' : `*** ${FALLAS} CONTROL(ES) FALLIDO(S).`);
hr();
fs.writeFileSync(SALIDA, lineas.join('\n') + '\n', { encoding: 'utf8' });
process.exit(FALLAS === 0 ? 0 : 3);
