'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_rotulos.js — RECONOCIMIENTO del frente de rotulo y atribucion de
// bahias. SOLO MIDE. No escribe ningun archivo de src/ ni de data/.
//
// Corrida:  node _bitacoras/auditoria_rotulos_2026-08-15/01_medir_rotulos.js
// Shell declarada (CLAUDE.md §7.3): el agente lo corrio con `node` desde Git
// Bash; para el owner, la misma linea corre igual en PowerShell desde la raiz
// del repositorio. La salida va a stdout y se redirige con `tee`/`-o`, NUNCA
// con `>` de PowerShell.
//
// QUE MIDE, y por que cada cosa:
//   M1 — estado del archivo: entradas, forma, nulos por campo.
//   M2 — universo de nombres de Capitania admisibles, de las TRES fuentes que
//        el repositorio tiene, para poder decir "este nombre existe" sin
//        inventar el universo.
//   M3 — atribucion segun SITPORT `CdReparticion`, contra las DOS capturas de
//        `consultaBahias` que hay en el repositorio, con su fecha. Un snapshot
//        viejo produce el mismo error que un numero de resumen.
//   M4 — atribucion segun `data/decreto/join_bahia_jurisdiccion.json`, que es
//        la fuente que CONTRATO_MOTOR.md §5 declara AUTORIZADA para atribucion
//        bahia -> Capitania. SITPORT no lo es.
//   M5 — las CREIBLES-Y-EQUIVOCADAS: rotulo no nulo, que nombra a una Capitania
//        que existe, y que NO es la que la fuente atribuye.
//   M6 — el lote `Puerto Cisnes` de f421949, aparte.
//   M7 — que llega al patron: los tres campos que el backend emite y cual de
//        ellos toca la pantalla.
//
// REGLA DE INSTRUMENTO: se cuentan COMPARACIONES EFECTIVAS y se aborta con
// codigo 3 si alguna familia da cero. Un lado vacio y un lado identico dan el
// mismo numero de diferencias.
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));

let ABORTOS = [];
const L = (...a) => console.log(...a);
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const rel = f => path.relative(RAIZ, f).replace(/\\/g, '/');

function insumo(p) {
  const f = path.join(RAIZ, p);
  if (!fs.existsSync(f)) { ABORTOS.push(`insumo ausente: ${p}`); return null; }
  const st = fs.statSync(f);
  L(`    ${p.padEnd(66)} ${String(st.size).padStart(8)} b  ${sha(f).slice(0, 16)}…  mtime ${st.mtime.toISOString().slice(0, 10)}`);
  return f;
}

// ─── INSUMOS ─────────────────────────────────────────────────────────────────
L('================================================================================');
L('AUDITORIA DE ROTULOS Y ATRIBUCION — RECONOCIMIENTO. 2026-08-15');
L('================================================================================');
L('');
L('INSUMOS, con sha256 del archivo en disco');
L('--------------------------------------------------------------------------------');
// MAPA_OVERRIDE / SITPORT_OVERRIDE: rutas alternativas, SOLO para la prueba de
// mordida de §4.6 (03_mordida.js). Vacias en la corrida real, y la corrida
// declara cual uso para que no se confunda una medicion con un ensayo.
const F_MAPA = insumo(process.env.MAPA_OVERRIDE || 'src/data/bahia-capitania-map.json');
if (process.env.MAPA_OVERRIDE || process.env.SITPORT_OVERRIDE)
  L(`    *** ENSAYO DE MORDIDA — MAPA_OVERRIDE=${process.env.MAPA_OVERRIDE || '(no)'} SITPORT_OVERRIDE=${process.env.SITPORT_OVERRIDE || '(no)'}`);
const F_SB12 = insumo('_bitacoras/sondeo_catalogo_2026-08-12/sitport_bahias_raw.json');
const F_SB13 = insumo(process.env.SITPORT_OVERRIDE || '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json');
const F_SB11 = insumo('_bitacoras/e01_drift_catalogo_2026-08-11/sitport_consultaBahias.json');
const F_CSV  = insumo('_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv');
const F_JOIN = insumo('data/decreto/join_bahia_jurisdiccion.json');
const F_JUR  = insumo('data/decreto/jurisdicciones_v2.json');
const F_DIFF = insumo('_bitacoras/sondeo_catalogo_2026-08-12/diff_capitanias.csv');
if (ABORTOS.length) { L(''); L('ABORTA — ' + ABORTOS.join(' · ')); process.exit(3); }
L('');
L('  jurisdicciones_v2.json se lee SOLO para traducir jurisdiccion_id -> nombre.');
L('  Esta en la ruta a pantalla: capitania-de-bahia.js lo requiere para armar el');
L('  contacto que ve el patron, asi que no es lectura del frente de jurisdiccion.');

// ─── M1 — estado del archivo ─────────────────────────────────────────────────
const mapa = JSON.parse(fs.readFileSync(F_MAPA, 'utf8'));
const ids  = Object.keys(mapa);
L('');
L('=== M1 — estado de bahia-capitania-map.json HOY ===');
L(`  entradas                        : ${ids.length}`);
const formas = new Map();
for (const id of ids) formas.set(Object.keys(mapa[id]).join('|'), (formas.get(Object.keys(mapa[id]).join('|')) || 0) + 1);
for (const [f, n] of formas) L(`  forma "${f}" : ${n}`);
for (const campo of ['capitania', 'gobernacion', 'telefono']) {
  const nulos = ids.filter(i => mapa[i][campo] == null);
  const vacios = ids.filter(i => mapa[i][campo] === '');
  L(`  ${campo.padEnd(12)} null=${String(nulos.length).padStart(3)}  ''=${vacios.length}`);
  if (nulos.length) L(`      ids null: ${nulos.join(', ')}`);
}
const capsDistintas = [...new Set(ids.map(i => mapa[i].capitania).filter(Boolean))].sort();
L(`  valores distintos de \`capitania\` (no nulos): ${capsDistintas.length}`);
L(`      ${capsDistintas.join(' | ')}`);
const gobsDistintas = [...new Set(ids.map(i => mapa[i].gobernacion).filter(Boolean))].sort();
L(`  valores distintos de \`gobernacion\`: ${gobsDistintas.length}`);
L(`      ${gobsDistintas.join(' | ')}`);
const telsDistintos = new Set(ids.map(i => mapa[i].telefono).filter(Boolean));
L(`  valores distintos de \`telefono\`: ${telsDistintos.size}`);

// ─── M2 — universo de nombres admisibles ─────────────────────────────────────
// CSV: "CdRep","Codigo","Capitania","Gobernacion","Region","Telefono","Direccion","Jefe"
function leerCSV(f) {
  const txt = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
  const filas = [];
  for (const linea of txt.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const celdas = []; let cur = ''; let dentro = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') { if (dentro && linea[i + 1] === '"') { cur += '"'; i++; } else dentro = !dentro; }
      else if (c === ',' && !dentro) { celdas.push(cur); cur = ''; }
      else cur += c;
    }
    celdas.push(cur);
    filas.push(celdas);
  }
  const cab = filas.shift();
  return filas.map(f2 => Object.fromEntries(cab.map((c, i) => [c, f2[i]])));
}
const csv = leerCSV(F_CSV);
const porCdRep = new Map(csv.map(r => [Number(r.CdRep), r]));
const jur = JSON.parse(fs.readFileSync(F_JUR, 'utf8'));
const jurPorId = new Map(jur.jurisdicciones.map(j => [j.id, j]));

L('');
L('=== M2 — universo de nombres de Capitania, por fuente ===');
L(`  capitanias_64_final.csv          : ${csv.length} filas`);
L(`  jurisdicciones_v2.json           : ${jur.jurisdicciones.length} jurisdicciones del decreto`);
const univCSV = new Set(csv.map(r => normalizarTexto(r.Capitania)));
const univDEC = new Set(jur.jurisdicciones.map(j => normalizarTexto(j.nombre)));
L(`  nombres normalizados distintos   : CSV=${univCSV.size}  decreto=${univDEC.size}`);
const soloCSV = [...univCSV].filter(n => !univDEC.has(n)).sort();
const soloDEC = [...univDEC].filter(n => !univCSV.has(n)).sort();
L(`  en el CSV y NO en el decreto (${soloCSV.length}): ${soloCSV.join(' | ')}`);
L(`  en el decreto y NO en el CSV (${soloDEC.length}): ${soloDEC.join(' | ')}`);
L('  NOTA: el CSV rotula sus 64 filas como Capitania de Puerto. f421949 midio que');
L('  ese rotulo es falso para al menos una (Rada Covadonga, Alcaldia de Mar), asi');
L('  que "existe en el CSV" NO prueba "es Capitania de Puerto" (INV-3.3).');

// ─── M3 — atribucion segun SITPORT ───────────────────────────────────────────
function cargarBahias(f, etiqueta) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  // Las capturas NO tienen la misma forma: unas son el array pelado y otras el
  // sobre de mssql {recordsets:[[...]]}. Desenvolver hasta dar con registros que
  // traigan IDBahia — si se toma `recordsets` como si fuera el array de datos,
  // da UN registro y el cotejo sale con cero comparaciones. Paso por aca.
  let arr = Array.isArray(d) ? d : (d.recordset || (d.recordsets && d.recordsets[0]) || d.data || d.Data || Object.values(d).find(Array.isArray));
  while (Array.isArray(arr) && arr.length && Array.isArray(arr[0])) arr = arr[0];
  if (!Array.isArray(arr) || !arr.length || arr[0].IDBahia === undefined) {
    ABORTOS.push(`${etiqueta}: no se encontraron registros con IDBahia`);
    return new Map();
  }
  const m = new Map();
  for (const r of arr) m.set(Number(r.IDBahia), { cdRep: Number(r.CdReparticion), nombre: r.NMBahia });
  L(`  ${etiqueta.padEnd(34)} ${arr.length} registros · ${m.size} ids distintos`);
  return m;
}
L('');
L('=== M3 — atribucion segun SITPORT CdReparticion ===');
L('  Las TRES capturas de consultaBahias que hay en el repositorio, con su fecha:');
const SB11 = cargarBahias(F_SB11, 'captura 2026-08-11');
const SB12 = cargarBahias(F_SB12, 'captura 2026-08-12 (sondeo)');
const SB13 = cargarBahias(F_SB13, 'captura 2026-08-13 (e3 paso6)');
L('  Fecha de captura y procedencia: declaradas en');
L('    _bitacoras/sondeo_catalogo_2026-08-12/PROCEDENCIA.txt  (2026-08-12 ~16:10)');
L('    _bitacoras/e3_paso6_2026-08-13/  (2026-08-13)');
L('  NINGUNA es una consulta en vivo de esta sesion.');

// ¿las capturas concuerdan entre si?
let driftEntreCapturas = 0;
for (const [id, v] of SB13) {
  const a = SB12.get(id);
  if (a && a.cdRep !== v.cdRep) { driftEntreCapturas++; L(`    DRIFT 12->13  bahia ${id}: CdRep ${a.cdRep} -> ${v.cdRep}`); }
}
L(`  bahias cuyo CdReparticion cambia entre la captura del 12 y la del 13: ${driftEntreCapturas}`);
L(`  ids en el mapa y ausentes de la captura del 13: ${ids.filter(i => !SB13.has(Number(i))).join(', ') || 'ninguno'}`);
L(`  ids en la captura del 13 y ausentes del mapa  : ${[...SB13.keys()].filter(i => !mapa[String(i)]).join(', ') || 'ninguno'}`);

function cotejarSitport(SB, etiqueta) {
  const r = { etiqueta, comparadas: 0, coinciden: 0, difieren: [], sinCdRep: [], mapaNull: [] };
  for (const id of ids) {
    const s = SB.get(Number(id));
    if (!s) { r.sinCdRep.push(`${id}(ausente de la captura)`); continue; }
    const fila = porCdRep.get(s.cdRep);
    if (!fila) { r.sinCdRep.push(`${id}(CdRep ${s.cdRep} sin fila en el CSV)`); continue; }
    const rot = mapa[id].capitania;
    if (rot == null) { r.mapaNull.push({ id, sitport: fila.Capitania, cdRep: s.cdRep }); continue; }
    r.comparadas++;
    if (normalizarTexto(rot) === normalizarTexto(fila.Capitania)) r.coinciden++;
    else r.difieren.push({ id, nombre: s.nombre, rotulo: rot, sitport: fila.Capitania, cdRep: s.cdRep });
  }
  return r;
}
const c13 = cotejarSitport(SB13, '2026-08-13');
const c12 = cotejarSitport(SB12, '2026-08-12');
for (const c of [c13, c12]) {
  L('');
  L(`  --- contra la captura ${c.etiqueta} ---`);
  L(`  COMPARACIONES EFECTIVAS : ${c.comparadas}`);
  L(`  coinciden               : ${c.coinciden}`);
  L(`  DIFIEREN                : ${c.difieren.length}`);
  L(`  rotulo null (no compara): ${c.mapaNull.length}`);
  L(`  sin CdRep resoluble     : ${c.sinCdRep.length}${c.sinCdRep.length ? ' -> ' + c.sinCdRep.join(', ') : ''}`);
  if (c.comparadas === 0) ABORTOS.push(`cotejo SITPORT ${c.etiqueta} con CERO comparaciones efectivas`);
}
L('');
L('  --- las que DIFIEREN contra la captura del 2026-08-13 ---');
for (const d of c13.difieren.sort((a, b) => Number(a.id) - Number(b.id)))
  L(`    ${String(d.id).padStart(3)}  ${String(d.nombre).slice(0, 40).padEnd(42)} mapa="${d.rotulo}"  SITPORT(CdRep ${d.cdRep})="${d.sitport}"`);
L('');
L('  --- las de rotulo NULL, con lo que SITPORT SI atribuye ---');
for (const d of c13.mapaNull.sort((a, b) => Number(a.id) - Number(b.id)))
  L(`    ${String(d.id).padStart(3)}  mapa=null   SITPORT(CdRep ${d.cdRep})="${d.sitport}"`);

// ─── M4 — atribucion segun el join (fuente autorizada §5) ────────────────────
const join = JSON.parse(fs.readFileSync(F_JOIN, 'utf8'));
const joinPorId = new Map(join.entradas.map(e => [Number(e.bahia_id), e]));
L('');
L('=== M4 — atribucion segun join_bahia_jurisdiccion.json (FUENTE AUTORIZADA §5) ===');
L(`  generado: ${join.generado}   conteo: ${JSON.stringify(join.conteo)}`);
const m4 = { comparadas: 0, coinciden: 0, difieren: [], sinResolver: [], mapaNull: [], sinNombre: [] };
for (const id of ids) {
  const e = joinPorId.get(Number(id));
  if (!e || !e.jurisdiccion_id) { m4.sinResolver.push(id); continue; }
  const j = jurPorId.get(e.jurisdiccion_id);
  if (!j) { m4.sinNombre.push(`${id}(${e.jurisdiccion_id})`); continue; }
  const rot = mapa[id].capitania;
  if (rot == null) { m4.mapaNull.push({ id, decreto: j.nombre }); continue; }
  m4.comparadas++;
  if (normalizarTexto(rot) === normalizarTexto(j.nombre)) m4.coinciden++;
  else m4.difieren.push({ id, rotulo: rot, decreto: j.nombre, jid: e.jurisdiccion_id, respaldo: e.respaldo });
}
L(`  COMPARACIONES EFECTIVAS : ${m4.comparadas}`);
L(`  coinciden               : ${m4.coinciden}`);
L(`  DIFIEREN                : ${m4.difieren.length}`);
L(`  rotulo null (no compara): ${m4.mapaNull.length}`);
L(`  sin_resolver en el join : ${m4.sinResolver.length} -> ${m4.sinResolver.join(', ')}`);
L(`  jurisdiccion_id sin nombre en v2: ${m4.sinNombre.length}${m4.sinNombre.length ? ' -> ' + m4.sinNombre.join(', ') : ''}`);
if (m4.comparadas === 0) ABORTOS.push('cotejo JOIN con CERO comparaciones efectivas');
L('');
L('  --- las que DIFIEREN contra el join ---');
for (const d of m4.difieren.sort((a, b) => Number(a.id) - Number(b.id)))
  L(`    ${String(d.id).padStart(3)}  mapa="${d.rotulo}"  decreto="${d.decreto}" (${d.jid}, respaldo=${d.respaldo})`);

// ─── M4b — ¿SITPORT y el join dicen lo mismo? ────────────────────────────────
L('');
L('=== M4b — SITPORT contra el JOIN, sin pasar por el mapa ===');
let dd = { comparadas: 0, coinciden: 0, difieren: [] };
for (const id of ids) {
  const s = SB13.get(Number(id)); const e = joinPorId.get(Number(id));
  if (!s || !e || !e.jurisdiccion_id) continue;
  const fila = porCdRep.get(s.cdRep); const j = jurPorId.get(e.jurisdiccion_id);
  if (!fila || !j) continue;
  dd.comparadas++;
  if (normalizarTexto(fila.Capitania) === normalizarTexto(j.nombre)) dd.coinciden++;
  else dd.difieren.push({ id, sitport: fila.Capitania, decreto: j.nombre });
}
L(`  COMPARACIONES EFECTIVAS : ${dd.comparadas}`);
L(`  coinciden               : ${dd.coinciden}`);
L(`  DIFIEREN                : ${dd.difieren.length}`);
if (dd.comparadas === 0) ABORTOS.push('cotejo SITPORT-vs-JOIN con CERO comparaciones efectivas');
for (const d of dd.difieren.sort((a, b) => Number(a.id) - Number(b.id)))
  L(`    ${String(d.id).padStart(3)}  SITPORT="${d.sitport}"  decreto="${d.decreto}"`);

// ─── M5 — creibles y equivocadas ─────────────────────────────────────────────
L('');
L('=== M5 — CREIBLES Y EQUIVOCADAS ===');
L('  Definicion: rotulo NO nulo + el nombre existe en el universo de Capitanias');
L('  + NO es la que la fuente atribuye. Un null se ve como falta; esto no.');
for (const [nombreFuente, lista] of [['SITPORT 2026-08-13', c13.difieren], ['JOIN (decreto)', m4.difieren]]) {
  const creibles = lista.filter(d => univCSV.has(normalizarTexto(d.rotulo)) || univDEC.has(normalizarTexto(d.rotulo)));
  const inexistentes = lista.filter(d => !univCSV.has(normalizarTexto(d.rotulo)) && !univDEC.has(normalizarTexto(d.rotulo)));
  L(`  contra ${nombreFuente.padEnd(20)}: creibles-y-equivocadas=${creibles.length}  con nombre inexistente=${inexistentes.length}`);
  if (inexistentes.length) L(`      nombre inexistente: ${inexistentes.map(d => `${d.id}="${d.rotulo}"`).join(', ')}`);
}

// ─── M6 — el lote Puerto Cisnes de f421949 ───────────────────────────────────
L('');
L('=== M6 — el lote `Puerto Cisnes` de f421949, aparte ===');
const lote = ids.filter(i => normalizarTexto(mapa[i].capitania) === normalizarTexto('Puerto Cisnes'));
L(`  entradas rotuladas "Puerto Cisnes" hoy: ${lote.length} -> ${lote.join(', ')}`);
const repartoS = new Map(), repartoJ = new Map();
for (const id of lote) {
  const s = SB13.get(Number(id)); const fila = s ? porCdRep.get(s.cdRep) : null;
  const k = fila ? fila.Capitania : `(sin fila CdRep ${s ? s.cdRep : '?'})`;
  repartoS.set(k, [...(repartoS.get(k) || []), id]);
  const e = joinPorId.get(Number(id)); const j = e && e.jurisdiccion_id ? jurPorId.get(e.jurisdiccion_id) : null;
  const kj = j ? j.nombre : '(sin_resolver)';
  repartoJ.set(kj, [...(repartoJ.get(kj) || []), id]);
}
L('  reparto segun SITPORT 2026-08-13:');
for (const [k, v] of repartoS) L(`      ${String(k).padEnd(24)} ${String(v.length).padStart(2)}  -> ${v.join(', ')}`);
L('  reparto segun el JOIN (decreto):');
for (const [k, v] of repartoJ) L(`      ${String(k).padEnd(24)} ${String(v.length).padStart(2)}  -> ${v.join(', ')}`);

// ─── M7 — que llega al patron ────────────────────────────────────────────────
L('');
L('=== M7 — telefonos: de quien es cada numero ===');
const telCap = new Map(); // telefono normalizado -> nombre de Capitania del CSV
for (const r of csv) for (const t of String(r.Telefono).split(/ó|ó|\//)) {
  const soloDig = t.replace(/[^0-9]/g, '');
  if (soloDig.length >= 8) telCap.set(soloDig, r.Capitania);
}
let esDeCapitania = 0, noReconocido = 0;
const detalle = new Map();
for (const id of ids) {
  const t = mapa[id].telefono; if (!t) continue;
  const dg = String(t).replace(/[^0-9]/g, '');
  if (telCap.has(dg)) { esDeCapitania++; detalle.set(telCap.get(dg), (detalle.get(telCap.get(dg)) || 0) + 1); }
  else noReconocido++;
}
L(`  entradas cuyo telefono coincide con un numero de CAPITANIA del CSV : ${esDeCapitania}`);
L(`  entradas cuyo telefono NO figura en el CSV de Capitanias           : ${noReconocido}`);
L('  reparto de las que si:');
for (const [k, v] of [...detalle].sort((a, b) => b[1] - a[1])) L(`      ${String(k).padEnd(22)} ${v}`);

// ─── CIERRE ──────────────────────────────────────────────────────────────────
L('');
L('=== RESUMEN DE COMPARACIONES EFECTIVAS ===');
L(`  M3 SITPORT 08-13 : ${c13.comparadas}`);
L(`  M3 SITPORT 08-12 : ${c12.comparadas}`);
L(`  M4 JOIN          : ${m4.comparadas}`);
L(`  M4b SITPORT-JOIN : ${dd.comparadas}`);
if (ABORTOS.length) { L(''); L('ABORTA — ' + ABORTOS.join(' · ')); process.exit(3); }
L('');
L('Ningun archivo de src/ ni de data/ fue escrito por este instrumento.');
L('================================================================================');
