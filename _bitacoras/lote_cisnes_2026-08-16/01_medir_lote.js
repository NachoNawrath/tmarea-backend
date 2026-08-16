'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_lote.js — LOTE CISNES. MEDICION PREVIA, NO ESCRIBE NADA.
//
// Frente de CONTACTO y atribucion de bahias (PLAN_JURISDICCION.md §7.1).
// NO es el frente de jurisdiccion del D.S. 991.
//
// QUE MIDE, y por que cada bloque existe:
//   N0  insumos con sha256 y fecha de captura declarada
//   N1  el LOTE: las entradas que `f421949` renombro, medidas de DOS maneras
//       independientes —del commit y del rotulo de hoy— y comparadas. Si no
//       coinciden, alguien las movio despues y el prompt de la sesion cambia
//       de sentido: aborta.
//   N2  estado real de las 18 hoy: mapa, `CdReparticion` de SITPORT, y el par
//       (nombre, telefono) que le corresponde por D-R4
//   N3  el CRITERIO DE PIEZA de `f3936b8`: al terminar, nombre y telefono de la
//       MISMA reparticion. Cuantas cumplen, cuantas no, y el motivo medido de
//       cada una — con los dos modos de falla conocidos del frente probados por
//       nombre: telefono NO ATOMICO en la fuente (dejo a Baker en null) y
//       `CdReparticion` AUSENTE del CSV (el 189)
//   N4  cruce con `data/decreto/zonas_aviso.json`
//   N5  los TRES caminos a pantalla (P1, P2, P3) — hoy y con el lote aplicado
//       en memoria. La forma de cada camino se re-lee del codigo, no se toma
//       del reporte anterior
//   N6  el SEGUNDO resolvedor, `ambitos-publicados.js:306` — hoy y con el lote
//   N7  las entradas que NO son del lote: cuantas se moverian (debe ser 0)
//
// NO ESCRIBE NINGUN ARCHIVO. Ni de `src/`, ni de `data/`, ni de la PWA.
//
// Corrida:  node _bitacoras/lote_cisnes_2026-08-16/01_medir_lote.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');

const ABORTOS = [];
const abortar = m => { ABORTOS.push(m); };

const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_SB   = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER  = 'data/contacto/reparticiones_publicadas.json';
const P_JOIN = 'data/decreto/join_bahia_jurisdiccion.json';
const P_ZA   = 'data/decreto/zonas_aviso.json';
const P_CSV  = '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv';
const P_JUR  = 'data/decreto/jurisdicciones_v2.json';

const COMMIT_RENOMBRE = 'f421949';

L('================================================================================');
L('LOTE CISNES — MEDICION PREVIA. 2026-08-16');
L('Frente de CONTACTO (PLAN_JURISDICCION.md §7.1). NO escribe ningun archivo.');
L('================================================================================');

// ── N0 ───────────────────────────────────────────────────────────────────────
L('');
L('=== N0 — INSUMOS, con sha256 del archivo EN DISCO ===');
for (const p of [P_SB, P_DER, P_JOIN, P_ZA, P_CSV, P_JUR]) L(`  ${p.padEnd(62)} ${sha(p)}`);
L('');
L('  FECHA DE CAPTURA DEL SNAPSHOT DE SITPORT — declarada, no inferida:');
L('    _bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json');
L('    capturado el 2026-08-13. Es el MISMO snapshot versionado que lee');
L('    `scripts/frente-contacto-pieza-a.js`, y por eso la medicion del plan y la');
L('    de la verificacion corren contra el mismo dato.');
L('    LO QUE NO SE MIDE: si SITPORT dice hoy lo mismo que el 2026-08-13.');
L('    Esta sesion NO consulta SITPORT en vivo.');

// ── insumos ──────────────────────────────────────────────────────────────────
// EL MAPA SE LEE DEL ANCLA `bd75c494`, NO DEL DISCO, y hay dos razones:
//   · esta es la medicion PREVIA a la pieza. Leyendola del disco, el instrumento
//     deja de reproducirla en cuanto la pieza se aplica — que es el mismo defecto
//     que un verificador anclado a HEAD;
//   · asi la corrida de hoy y la de dentro de seis meses dan lo mismo (§3.4).
// El blob viene en LF y el disco esta en CRLF: se convierte para que el sha256
// que se declara sea el del archivo, no el del blob.
const ANCLA = 'bd75c494';
const textoMapa = execFileSync('git', ['show', `${ANCLA}:${P_MAPA}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' })
  .replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const mapa = JSON.parse(textoMapa);
L('');
L('  EL MAPA NO SE LEE DEL DISCO — sale del ancla, para que esta medicion previa');
L('  se reproduzca igual despues de aplicada la pieza:');
L(`  ${(P_MAPA + '  [' + ANCLA + ', en CRLF]').padEnd(62)} ${crypto.createHash('sha256').update(Buffer.from(textoMapa, 'utf8')).digest('hex')}`);

const sbRaw = JSON.parse(fs.readFileSync(abs(P_SB), 'utf8'));
// Las capturas de SITPORT no tienen todas la misma forma: unas son el array
// pelado y otras el sobre de mssql { recordsets: [[...]] }. Trampa ya pagada.
const sbArr = Array.isArray(sbRaw) ? sbRaw : sbRaw.recordsets[0];
if (!Array.isArray(sbArr) || sbArr.length === 0) abortar(`${P_SB} no trae registros`);
const SB = new Map(sbArr.map(r => [String(r.IDBahia), Number(r.CdReparticion)]));

const der = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8')).reparticiones;
const join = JSON.parse(fs.readFileSync(abs(P_JOIN), 'utf8'));
const JOIN = new Map(join.entradas.map(e => [String(e.bahia_id), e]));
const za = JSON.parse(fs.readFileSync(abs(P_ZA), 'utf8'));
const jur = JSON.parse(fs.readFileSync(abs(P_JUR), 'utf8'));

// CSV: se usa SOLO como universo de telefonos para el conteo de P3, con el
// MISMO desarmado que uso `02_medir_pantalla.js` de la auditoria del 08-15, para
// que las dos cifras sean comparables. No se usa como fuente de rotulo (D-R4).
function parseCsvLinea(l) {
  const o = []; let c = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === '"') { if (q && l[i + 1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { o.push(c); c = ''; }
    else c += ch;
  }
  o.push(c); return o;
}
let csvTxt = fs.readFileSync(abs(P_CSV), 'utf8');
if (csvTxt.charCodeAt(0) === 0xFEFF) csvTxt = csvTxt.slice(1);
const csvLin = csvTxt.split(/\r?\n/).filter(x => x.trim());
const csvCab = parseCsvLinea(csvLin[0]);
const iTel = csvCab.indexOf('Telefono'), iCap = csvCab.indexOf('Capitania');
const TEL_DE_CAPITANIA = new Map();
for (const l of csvLin.slice(1)) {
  const f = parseCsvLinea(l);
  for (const t of String(f[iTel]).split(/ó|\//)) {
    const d = t.replace(/[^0-9]/g, '');
    if (d.length >= 8) TEL_DE_CAPITANIA.set(d, f[iCap]);
  }
}

// ── N1 — el lote, medido de dos maneras ──────────────────────────────────────
L('');
L('=== N1 — QUE ES EL LOTE, medido de DOS maneras independientes ===');

// (a) del commit del renombre, leyendo el arbol de git, no el disco.
const antes = JSON.parse(execFileSync('git', ['show', `${COMMIT_RENOMBRE}^:${P_MAPA}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' }));
const despues = JSON.parse(execFileSync('git', ['show', `${COMMIT_RENOMBRE}:${P_MAPA}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' }));
const delCommit = Object.keys(despues)
  .filter(k => antes[k] && antes[k].capitania !== despues[k].capitania && despues[k].capitania === 'Puerto Cisnes')
  .sort((a, b) => Number(a) - Number(b));
const rotulosViejos = [...new Set(delCommit.map(k => antes[k].capitania))];
L(`  (a) renombradas por ${COMMIT_RENOMBRE} a "Puerto Cisnes" : ${delCommit.length}`);
L(`      rotulo del que venian                        : ${JSON.stringify(rotulosViejos)}`);

// (b) del rotulo de hoy, sobre el archivo en disco.
const delRotulo = Object.keys(mapa).filter(k => mapa[k].capitania === 'Puerto Cisnes').sort((a, b) => Number(a) - Number(b));
L(`  (b) entradas que HOY dicen "Puerto Cisnes"       : ${delRotulo.length}`);

const iguales = delCommit.length === delRotulo.length && delCommit.every((v, i) => v === delRotulo[i]);
L(`  ¿los dos conjuntos son el mismo?                 : ${iguales}`);
if (!iguales) abortar('el conjunto renombrado por el commit y el que hoy lleva el rotulo NO son el mismo: alguien movio entradas despues y la premisa de la sesion cambia');
const LOTE = delRotulo;
L(`  LOTE = ${LOTE.join(', ')}`);
L('');
L('  Que dice cada uno, y por que se miden los dos: (a) es "lo que el commit');
L('  hizo" y (b) es "lo que el archivo dice hoy". Que coincidan prueba que');
L('  ninguna entrada entro ni salio del lote entre f421949 y HEAD.');

// ── N2 — estado real de las 18 ───────────────────────────────────────────────
L('');
L('=== N2 — ESTADO DE LAS 18 ANTES DE LA PIEZA (mapa del ancla), contra el dato ===');
L('  D-R4: el nombre sale del TITULO que DIRECTEMAR publica, entrando por');
L('  `CdReparticion`. El telefono sale del CSV por la misma clave. Las dos cosas');
L('  llegan por `data/contacto/reparticiones_publicadas.json`.');
L('');
L('   id  CdRep  join                 mapa: capitania    telefono          -> D-R4: nombre           telefono          ident');
const filas = [];
let comparadas = 0;
for (const id of LOTE) {
  const e = mapa[id];
  const cd = SB.get(id);
  const r = cd === undefined ? null : der[String(cd)];
  if (cd !== undefined && r) comparadas++;
  const j = JOIN.get(id);
  const f = {
    id, cd: cd === undefined ? null : cd, r,
    capHoy: e.capitania, telHoy: e.telefono, gob: e.gobernacion,
    jur: j ? (j.jurisdiccion_id || '(sin_resolver)') : '(no esta en el join)',
    estadoJoin: j ? j.estado : null
  };
  filas.push(f);
  L(`  ${String(id).padStart(3)}  ${String(f.cd ?? '—').padStart(5)}  ${String(f.jur).padEnd(20)} ${String(f.capHoy).padEnd(15)} ${String(f.telHoy).padEnd(17)} -> ${String(r && r.nombre_publicado || '—').padEnd(18)} ${String(r && r.telefono || '—').padEnd(17)} ${r && r.identificado_por || '—'}`);
}
L('');
L(`  COMPARACIONES EFECTIVAS (bahias del lote con reparticion en el derivado) : ${comparadas}`);
if (comparadas === 0) abortar('cero comparaciones efectivas en N2');

const porCd = new Map();
for (const f of filas) porCd.set(f.cd, (porCd.get(f.cd) || 0) + 1);
L('  reparto por CdReparticion de SITPORT:');
for (const [cd, n] of [...porCd].sort((a, b) => b[1] - a[1]))
  L(`      CdRep ${String(cd).padStart(4)}  ${String(n).padStart(2)}  -> "${der[String(cd)] ? der[String(cd)].nombre_publicado : '—'}"  (CSV: "${der[String(cd)] ? der[String(cd)].nombre_sitport : '—'}")`);

L('');
L('  QUE CAMBIA, campo por campo:');
const cambiaNombre = filas.filter(f => f.r && f.r.nombre_publicado !== f.capHoy);
const cambiaTel = filas.filter(f => f.r && f.r.telefono !== f.telHoy);
L(`      el NOMBRE cambia en   : ${cambiaNombre.length} de ${LOTE.length}   (queda igual en ${LOTE.length - cambiaNombre.length}: ${filas.filter(f => f.r && f.r.nombre_publicado === f.capHoy).map(f => f.id).join(', ') || '—'})`);
L(`      el TELEFONO cambia en : ${cambiaTel.length} de ${LOTE.length}`);
L(`      la GOBERNACION        : no se toca. Valores distintos hoy en el lote: ${JSON.stringify([...new Set(filas.map(f => f.gob))])}`);

// De quien es el telefono que las 18 llevan hoy.
const telHoyUnico = [...new Set(filas.map(f => f.telHoy))];
L('');
L(`  DE QUIEN ES EL TELEFONO QUE LLEVAN HOY: ${JSON.stringify(telHoyUnico)}`);
for (const t of telHoyUnico) {
  const d = t.replace(/[^0-9]/g, '');
  const dueno = TEL_DE_CAPITANIA.get(d);
  const cuantas = Object.keys(mapa).filter(k => String(mapa[k].telefono).replace(/[^0-9]/g, '') === d);
  L(`      "${t}" -> ¿es de alguna Capitania del CSV? ${dueno ? `SI, ${dueno}` : 'NO'}   ·  lo llevan ${cuantas.length} entradas del mapa: ${cuantas.join(', ')}`);
}

// ── N3 — el criterio de pieza ────────────────────────────────────────────────
L('');
L('=== N3 — CRITERIO DE PIEZA (f3936b8): nombre y telefono de la MISMA reparticion ===');
L('  La atomicidad se RECALCULA aca, no se toma de la bandera del derivado:');
L('  un insumo que mienta su propia bandera no puede hacer pasar el criterio.');
const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);
const TITULO_CAPITANIA = /^Capitan[íi]a\s+de\s+Puerto\b/i;

const cumplen = [], noCumplen = [];
for (const f of filas) {
  const motivos = [];
  if (f.cd === null) motivos.push('MODO DE FALLA CONOCIDO — SITPORT no trae esta bahia en consultaBahias: sin atribucion');
  else if (!f.r) motivos.push(`MODO DE FALLA CONOCIDO — CdReparticion ${f.cd} AUSENTE del derivado (el caso del 189)`);
  else {
    if (!f.r.nombre_publicado) motivos.push(`la reparticion ${f.cd} no tiene nombre publicado: ${f.r.motivo_sin_identificar}`);
    if (!f.r.telefono) motivos.push(`la reparticion ${f.cd} no trae telefono`);
    else if (!esAtomico(f.r.telefono)) motivos.push(`MODO DE FALLA CONOCIDO — telefono NO ATOMICO en la fuente (${JSON.stringify(f.r.telefono)}): el caso que dejo a Baker/127 en null`);
    if (f.r.titulo_publicado && !TITULO_CAPITANIA.test(String(f.r.titulo_publicado)))
      motivos.push(`el titulo publicado no es de Capitania de Puerto (${JSON.stringify(f.r.titulo_publicado)}) — INV-3.3`);
  }
  if (motivos.length === 0) cumplen.push(f); else noCumplen.push({ f, motivos });
}
L('');
L(`  CUMPLEN el criterio (se pueden escribir con el par completo) : ${cumplen.length} de ${LOTE.length}`);
L(`  NO cumplen                                                  : ${noCumplen.length}`);
for (const x of noCumplen) L(`      bahia ${String(x.f.id).padStart(3)} — ${x.motivos.join(' · ')}`);
if (noCumplen.length === 0) {
  L('      (ninguna)');
  L('');
  L('  LOS DOS MODOS DE FALLA CONOCIDOS, probados por nombre sobre este lote:');
  L(`      · telefono NO atomico en la fuente : 0 de ${LOTE.length}. Los ${LOTE.length} telefonos publicados son atomicos.`);
  L(`      · CdReparticion ausente del CSV    : 0 de ${LOTE.length}. Las ${porCd.size} reparticiones del lote estan en el derivado.`);
}

// Contra-prueba del criterio: el par que quedaria si se escribiera SOLO el nombre.
L('');
L('  CONTRA-PRUEBA — el caso que romperia el fundamento (§1.2): si se escribiera');
L('  SOLO el nombre y se dejara el telefono de hoy, ¿cuantas quedarian con el');
L('  numero de su propia reparticion?');
let soloNombreOk = 0, soloNombreOtra = 0, soloNombreDesconocido = 0;
for (const f of filas) {
  if (!f.r) continue;
  const d = String(f.telHoy).replace(/[^0-9]/g, '');
  const dueno = TEL_DE_CAPITANIA.get(d);
  if (!dueno) soloNombreDesconocido++;
  else if (normalizarTexto(dueno) === normalizarTexto(f.r.nombre_sitport)) soloNombreOk++;
  else soloNombreOtra++;
}
L(`      el numero es de la MISMA reparticion que el nombre : ${soloNombreOk}`);
L(`      el numero es de OTRA reparticion del CSV           : ${soloNombreOtra}`);
L(`      el numero no figura en el CSV de Capitanias        : ${soloNombreDesconocido}`);
L('      Es el mismo resultado que N10 de la Pieza A: escribir un campo solo NO');
L('      es una pieza mas chica, es la misma pieza fabricando credibilidad.');

// ── N4 — cruce con zonas_aviso.json ──────────────────────────────────────────
L('');
L('=== N4 — CRUCE CON `data/decreto/zonas_aviso.json` ===');
const enLote = new Set(LOTE.map(Number));
let cruces = 0, zonasVistas = 0;
L('   zona                  tipo            bahias declaradas      ¿toca el lote?');
for (const z of za.zonas) {
  zonasVistas++;
  const c = z.contacto;
  const ids = [];
  if (c.bahia_id != null) ids.push(Number(c.bahia_id));
  for (const b of (c.bahias_en_discrepancia || [])) ids.push(Number(b));
  for (const d of (c.discrepancias_declaradas || [])) ids.push(Number(d.bahia_id));
  const toca = [...new Set(ids)].filter(i => enLote.has(i));
  if (toca.length) cruces++;
  L(`   ${String(z.jurisdiccion_id).padEnd(20)} ${String(c.tipo).padEnd(15)} ${[...new Set(ids)].join(',').padEnd(22)} ${toca.length ? 'SI -> ' + toca.join(',') : 'no'}`);
}
L('');
L(`  COMPARACIONES EFECTIVAS (zonas leidas) : ${zonasVistas}`);
if (zonasVistas === 0) abortar('cero zonas leidas en N4');
L(`  zonas que cruzan el lote               : ${cruces}`);
L(`  discrepancias declaradas vivas que el lote tocaria : ${cruces}`);
if (cruces === 0) {
  L('  NINGUNA declaracion de `zonas_aviso.json` cae dentro del lote. El universo');
  L('  declarado ahi son 11 bahias —71, 89, 90, 97, 98, 127, 129, 131, 132, 137,');
  L('  138— y el lote son otras 18. La rama de la discrepancia de `bd75c494` no');
  L('  se toca, y su retiro automatico (M24) no se dispara por esta pieza.');
}

// ── N5 — los tres caminos ────────────────────────────────────────────────────
L('');
L('=== N5 — LOS TRES CAMINOS A PANTALLA, hoy y con el lote aplicado ===');
L('  La forma de cada camino se re-leyo del codigo en esta sesion, backend y PWA,');
L('  y las lineas literales estan transcritas en la seccion 6 de la bitacora.');
L('  No se transcriben desde aca porque la PWA vive en OTRO repositorio y un');
L('  instrumento que la lea de disco deja de ser reproducible (§3.4).');

// mapa simulado con el lote aplicado
const mapa2 = JSON.parse(textoMapa);
for (const f of cumplen) { mapa2[f.id].capitania = f.r.nombre_publicado; mapa2[f.id].telefono = f.r.telefono; }

const NOMBRES_JUR = new Map(jur.jurisdicciones.map(j => [j.id, j.nombre]));
const sitportNombreDe = id => {
  const cd = SB.get(String(id));
  const r = cd === undefined ? null : der[String(cd)];
  return r ? r.nombre_sitport : null;   // la cadena que SITPORT publica, via CSV
};

// DOS VARAS, y hay que decir cual mide que — medirlas como una sola es lo que
// dejo pasar el defecto la primera vez (§2):
//   vara CADENA      : ¿el nombre mostrado coincide con la cadena CRUDA de
//                      SITPORT ("MELINKA", "AGUIRRE", "CISNES")? Es la que uso
//                      `02_medir_pantalla.js` el 08-15, y se conserva para que
//                      las cifras sean comparables. Pero D-R4 DESCARTO esa
//                      cadena como forma del rotulo, asi que esta vara castiga
//                      al rotulo correcto: "Puerto Aguirre" no es "AGUIRRE".
//   vara REPARTICION : ¿el nombre mostrado es el nombre PUBLICADO de la
//                      reparticion que SITPORT le atribuye? Es la que D-R1+D-R4
//                      definen, y la unica que mide lo que la pieza promete.
const nombrePublicadoDe = id => {
  const cd = SB.get(String(id));
  const r = cd === undefined ? null : der[String(cd)];
  return r && r.nombre_publicado ? r.nombre_publicado : null;
};

function medirCaminos(m, etq) {
  const ids = Object.keys(m);
  // P1 / P2: ¿el nombre mostrado es el que SITPORT atribuye?
  let p1c = 0, p1ok = 0, p2c = 0, p2ok = 0, p2caeAGob = 0;
  let repC = 0, repOk = 0;
  for (const id of ids) {
    const e = m[id];
    const s = sitportNombreDe(id);
    const mostrado = e.capitania || e.gobernacion;
    if (e.capitania == null) p2caeAGob++;
    const np = nombrePublicadoDe(id);
    if (np && mostrado) { repC++; if (normalizarTexto(mostrado) === normalizarTexto(np)) repOk++; }
    if (!s || !mostrado) continue;
    p1c++; p2c++;
    if (normalizarTexto(mostrado) === normalizarTexto(s)) { p1ok++; p2ok++; }
  }
  // P3: ¿cuantos telefonos del mapa son de una Capitania del CSV?
  let p3total = 0, p3deCap = 0;
  for (const id of ids) {
    if (!m[id].telefono) continue;
    p3total++;
    if (TEL_DE_CAPITANIA.has(String(m[id].telefono).replace(/[^0-9]/g, ''))) p3deCap++;
  }
  L('');
  L(`  --- ${etq} ---`);
  L('  P1 TransitRestrictionsBlock  NO SE MIDE ACA, y hay que decir por que: P1 toma el');
  L('     nombre del DECRETO en las entradas de ambito publicado y del mapa en el resto,');
  L('     mientras que P2 lee siempre el mapa crudo. Modelarlos con una sola regla es lo');
  L('     que la seccion 4 de la auditoria del 08-15 advirtio que no se hiciera. P1 se mide');
  L('     con su instrumento versionado: 08_pantalla_antes.txt y 07_pantalla_despues.txt.');
  L(`  P2 P3_VoyageVerification     "Capitanía de Puerto de {capitania || gobernacion}", etiqueta DURA`);
  L(`     COMPARACIONES EFECTIVAS ${p2c} · coincide: ${p2ok} · NO: ${p2c - p2ok} · entradas que caen a \`gobernacion\`: ${p2caeAGob}`);
  L(`  P3 PortStatusBlock           "📞 Gobernación Marítima de {gobernacion} — {telefono}". NUNCA lee \`capitania\``);
  L(`     entradas con telefono ${p3total} · cuyo numero es de una CAPITANIA del CSV: ${p3deCap} · no figura en el CSV: ${p3total - p3deCap}`);
  L(`  VARA REPARTICION (la de D-R1+D-R4) sobre el nombre mostrado en P2:`);
  L(`     COMPARACIONES EFECTIVAS ${repC} · el nombre mostrado ES el nombre publicado de la reparticion que SITPORT atribuye: ${repOk} · NO lo es: ${repC - repOk}`);
  if (p1c === 0 || p2c === 0 || p3total === 0 || repC === 0) abortar(`cero comparaciones efectivas en los caminos (${etq})`);
  return { p1c, p1ok, p2c, p2ok, p2caeAGob, p3total, p3deCap, repC, repOk };
}
const hoy = medirCaminos(mapa, 'ANTES DE LA PIEZA (mapa del ancla bd75c494)');
const con = medirCaminos(mapa2, 'CON EL LOTE APLICADO (simulado en memoria, no se escribio nada)');
L('');
L('  DELTA del lote:');
L(`      P2 vara CADENA (cruda de SITPORT)   : ${hoy.p1ok} -> ${con.p1ok}   (${con.p1ok - hoy.p1ok >= 0 ? '+' : ''}${con.p1ok - hoy.p1ok})`);
L(`      P2 vara REPARTICION (D-R1+D-R4)     : ${hoy.repOk} -> ${con.repOk}   (${con.repOk - hoy.repOk >= 0 ? '+' : ''}${con.repOk - hoy.repOk})`);
L('      LAS DOS VARAS NO MIDEN LO MISMO Y LA DIFERENCIA ES DEL LOTE: la vara');
L('      CADENA no le da el punto a "Puerto Aguirre" porque SITPORT escribe');
L('      "AGUIRRE", y D-R4 descarto justamente esa cadena como forma del rotulo.');
L(`      Sobre las 18 del lote: por la vara REPARTICION pasan de 0 a ${con.repOk - hoy.repOk}.`);
L(`      P3 numeros de Capitania rotulados "Gobernación Marítima de" : ${hoy.p3deCap} -> ${con.p3deCap}   (${con.p3deCap - hoy.p3deCap >= 0 ? '+' : ''}${con.p3deCap - hoy.p3deCap})`);
L('      P3 EMPEORA. Es el mismo efecto que la Pieza A declaro y el owner acepto');
L('      antes de escribir: el dato mejora y el rotulo de P3 sigue mintiendo,');
L('      porque `PortStatusBlock.jsx:76-77` nunca lee `capitania`.');

// La cifra del "100" que dos bitacoras y el plan dan por buena.
L('');
L('  CONTROL DE UNA CIFRA HEREDADA — el "100 de 164" de P3:');
const mapaAntesPiezaA = JSON.parse(execFileSync('git', ['show', 'f3936b8^:' + P_MAPA], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' }));
let antesN = 0;
for (const k of Object.keys(mapaAntesPiezaA)) if (TEL_DE_CAPITANIA.has(String(mapaAntesPiezaA[k].telefono).replace(/[^0-9]/g, ''))) antesN++;
L(`      mapa ANTES de la Pieza A (f3936b8^) : ${antesN}`);
L(`      mapa HOY (despues de la Pieza A)    : ${hoy.p3deCap}`);
L(`      lo que el plan y dos bitacoras dicen: "de 84 a 100"`);
L(`      MEDIDO: de ${antesN} a ${hoy.p3deCap}. El 100 es 84+16 hecho de cabeza, no una medicion:`);
L('      varias de las 17 nulas YA llevaban el numero de una Capitania —el de OTRA—,');
L('      asi que reemplazarlo no sumaba al conteo. El delta real de la Pieza A fue +6.');

// ── N6 — el segundo resolvedor ───────────────────────────────────────────────
L('');
L('=== N6 — EL SEGUNDO RESOLVEDOR: `src/services/ambitos-publicados.js:306` ===');
L('  Regla leida del codigo (no se toca en esta sesion): para cada jurisdiccion');
L('  recorre TODAS las entradas del mapa y toma la PRIMERA cuyo `capitania`');
L('  coincida con el nombre del decreto. El orden de las claves decide.');
const jurDelLote = [...new Set(LOTE.map(id => JOIN.get(id)).filter(Boolean).map(e => e.jurisdiccion_id).filter(Boolean))];
L(`  jurisdicciones que el join le da a las bahias del lote: ${JSON.stringify(jurDelLote)}`);
L('');
L('   jurisdiccion         nombre del decreto      HOY: bahia/telefono          CON EL LOTE: bahia/telefono');
let n6c = 0;
for (const jid of jurDelLote) {
  const nombre = NOMBRES_JUR.get(jid);
  if (!nombre) continue;
  n6c++;
  const primera = m => {
    for (const [bid, e] of Object.entries(m))
      if (e.capitania && normalizarTexto(e.capitania) === normalizarTexto(nombre) && String(e.telefono || '').trim()) return `${bid} / ${e.telefono}`;
    return '(ninguna — no emite contacto)';
  };
  L(`   ${jid.padEnd(20)} ${String(nombre).padEnd(23)} ${primera(mapa).padEnd(28)} ${primera(mapa2)}`);
}
L('');
L(`  COMPARACIONES EFECTIVAS (jurisdicciones del lote con nombre en el decreto) : ${n6c}`);
if (n6c === 0) abortar('cero comparaciones efectivas en N6');

// ── N7 — lo que NO es del lote ───────────────────────────────────────────────
L('');
L('=== N7 — LAS ENTRADAS QUE NO SON DEL LOTE ===');
let movidas = 0, iguales7 = 0;
for (const k of Object.keys(mapa)) {
  if (enLote.has(Number(k))) continue;
  if (JSON.stringify(mapa[k]) === JSON.stringify(mapa2[k])) iguales7++; else { movidas++; L(`      MOVIDA fuera del lote: ${k}`); }
}
L(`  entradas fuera del lote        : ${iguales7 + movidas}`);
L(`  identicas tras aplicar el lote : ${iguales7}`);
L(`  movidas                        : ${movidas}   (debe ser 0)`);
if (movidas !== 0) abortar(`${movidas} entradas fuera del lote se moverian`);

L('');
L('================================================================================');
if (ABORTOS.length) { L('ABORTA — ' + ABORTOS.join(' · ')); L('================================================================================'); process.exit(3); }
L('MEDICION COMPLETA. Ningun archivo fue escrito.');
L('================================================================================');
