'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 04_verificar.js — VERIFICA la Pieza A contra el estado publicado, no contra el
// generador. Sale distinto de cero si algo no se cumple.
//
// El ancla es `0bc80d2:src/data/bahia-capitania-map.json`, leido con `git show`
// del COMMIT FIJO en que abrio esta sesion, no de HEAD. Un verificador que se
// compare contra HEAD deja de medir en cuanto alguien commitea.
//
// Lo que exige, cada cosa con su cuenta:
//   V1  el archivo sigue teniendo las mismas claves y `gobernacion` intacta
//   V2  cambian EXACTAMENTE las entradas que estaban en null y tenian con que
//       escribirse; ninguna otra linea se movio un byte
//   V3  EL PAR: en cada entrada escrita, el nombre y el telefono salen de LA
//       MISMA fila del derivado, entrando por el `CdReparticion` de SITPORT.
//       Es la comprobacion que tumbo la decision del 2026-08-13.
//   V4  el rotulo escrito viene de un titulo de "Capitania de Puerto"
//       (INV-3.3: ninguna Alcaldia de Mar en el campo)
//   V5  no queda ningun telefono no atomico en el archivo (INV-10.1)
//   V6  las nulas que quedan estan DECLARADAS: cada una con el motivo por el que
//       el generador no pudo escribirla
//
// Corrida:  node _bitacoras/pieza_a_nulas_2026-08-15/04_verificar.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash. No escribe nada.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);

const ANCLA = '0bc80d2';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_SB = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER = 'data/contacto/reparticiones_publicadas.json';

let fallos = 0;
const fallar = m => { fallos++; L(`    FALLA — ${m}`); };
function abortar(motivo) {
  L('');
  L('================================================================================');
  L(`ABORTA — ${motivo}`);
  L('================================================================================');
  process.exit(3);
}

L('================================================================================');
L('VERIFICACION DE LA PIEZA A');
L(`Ancla: ${ANCLA}:${P_MAPA} (commit fijo, no HEAD)`);
L('================================================================================');

// ── los dos estados ──────────────────────────────────────────────────────────
let antesTxt;
try { antesTxt = execFileSync('git', ['show', `${ANCLA}:${P_MAPA}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); }
catch (e) { abortar(`no se pudo leer ${ANCLA}:${P_MAPA}: ${e.message}`); }
const despuesTxt = fs.readFileSync(abs(P_MAPA), 'utf8');

// `git show` entrega el BLOB, que con core.autocrlf=true esta en LF mientras el
// disco esta en CRLF. Comparar los bytes crudos mediria el fin de linea, no el
// dato. Se comparan LINEA A LINEA, que es lo que interesa.
const antes = antesTxt.split(/\r?\n/);
const despues = despuesTxt.split(/\r?\n/);
L('');
L(`  lineas antes   : ${antes.length}`);
L(`  lineas despues : ${despues.length}`);
if (antes.length !== despues.length) abortar('el archivo cambio su cantidad de lineas: la pieza no reformatea');

const jsonAntes = JSON.parse(antesTxt);
const jsonDespues = JSON.parse(despuesTxt);
const clavesAntes = Object.keys(jsonAntes);
L(`  entradas       : ${clavesAntes.length} -> ${Object.keys(jsonDespues).length}`);

// ── insumos, para reconstruir lo esperado sin usar el generador ──────────────
const sbRaw = JSON.parse(fs.readFileSync(abs(P_SB), 'utf8'));
const sbArr = Array.isArray(sbRaw) ? sbRaw : sbRaw.recordsets[0];
const SB = new Map(sbArr.map(r => [String(r.IDBahia), Number(r.CdReparticion)]));
const der = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8'));
const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);
const TITULO_CAPITANIA = /^Capitan[íi]a\s+de\s+Puerto\b/i;

// La lista esperada se deriva del ESTADO ANTERIOR, no de la salida del
// generador: las que estaban en null y su reparticion tenia nombre publicado y
// telefono atomico.
const nulasAntes = clavesAntes.filter(k => jsonAntes[k].capitania === null);
const esperadas = new Map();
const esperadasFuera = [];
for (const k of nulasAntes) {
  const cd = SB.get(k);
  const r = cd !== undefined ? der.reparticiones[String(cd)] : null;
  if (!r || !r.nombre_publicado || !r.telefono || !esAtomico(r.telefono)) { esperadasFuera.push(k); continue; }
  esperadas.set(k, { cd, nombre: r.nombre_publicado, telefono: r.telefono, titulo: r.titulo_publicado });
}
L('');
L(`  entradas en null en ${ANCLA} : ${nulasAntes.length}`);
L(`  esperadas escritas           : ${esperadas.size}`);
L(`  esperadas FUERA              : ${esperadasFuera.length} -> ${esperadasFuera.join(', ') || '(ninguna)'}`);
if (nulasAntes.length === 0) abortar(`el ancla ${ANCLA} no tiene ninguna entrada en null: no hay nada que verificar`);
if (esperadas.size === 0) abortar('cero entradas esperadas: el cotejo no compararia nada');

// ── V1 ───────────────────────────────────────────────────────────────────────
L('');
L('  V1 — claves y `gobernacion`');
let v1 = 0;
if (JSON.stringify(clavesAntes) !== JSON.stringify(Object.keys(jsonDespues))) fallar('las claves cambiaron de conjunto o de orden');
for (const k of clavesAntes) {
  v1++;
  if (jsonAntes[k].gobernacion !== jsonDespues[k].gobernacion) fallar(`la entrada ${k} cambio su \`gobernacion\``);
}
L(`      COMPARACIONES EFECTIVAS : ${v1}`);
if (v1 === 0) abortar('cero comparaciones efectivas en V1');

// ── V2 ───────────────────────────────────────────────────────────────────────
L('');
L('  V2 — que lineas se movieron');
const lineasDistintas = [];
for (let i = 0; i < antes.length; i++) if (antes[i] !== despues[i]) lineasDistintas.push(i + 1);
const cambiadas = clavesAntes.filter(k => JSON.stringify(jsonAntes[k]) !== JSON.stringify(jsonDespues[k]));
L(`      COMPARACIONES EFECTIVAS : ${antes.length} lineas · ${clavesAntes.length} entradas`);
L(`      lineas distintas        : ${lineasDistintas.length}`);
L(`      entradas distintas      : ${cambiadas.length}`);
if (lineasDistintas.length !== esperadas.size) fallar(`se movieron ${lineasDistintas.length} lineas y se esperaban ${esperadas.size}`);
if (cambiadas.length !== esperadas.size) fallar(`cambiaron ${cambiadas.length} entradas y se esperaban ${esperadas.size}`);
for (const k of cambiadas) if (!esperadas.has(k)) fallar(`la entrada ${k} cambio y no estaba en la lista esperada`);
for (const k of esperadas.keys()) if (!cambiadas.includes(k)) fallar(`la entrada ${k} estaba en la lista esperada y no cambio`);

// ── V3 ───────────────────────────────────────────────────────────────────────
L('');
L('  V3 — EL PAR: nombre y telefono de la MISMA fila del derivado');
let v3 = 0;
for (const [k, e] of esperadas) {
  v3++;
  const d = jsonDespues[k];
  if (d.capitania !== e.nombre) fallar(`entrada ${k}: \`capitania\` es ${JSON.stringify(d.capitania)} y la reparticion ${e.cd} publica ${JSON.stringify(e.nombre)}`);
  if (d.telefono !== e.telefono) fallar(`entrada ${k}: \`telefono\` es ${JSON.stringify(d.telefono)} y la reparticion ${e.cd} trae ${JSON.stringify(e.telefono)}`);
  // el par, dicho al reves: el numero escrito no puede ser de OTRA reparticion
  const duenos = Object.values(der.reparticiones).filter(r => r.telefono === d.telefono).map(r => r.cd_reparticion);
  if (duenos.length && !duenos.includes(e.cd))
    fallar(`entrada ${k}: el numero ${JSON.stringify(d.telefono)} es de la/s reparticion/es ${duenos.join(', ')} y el nombre es de la ${e.cd}`);
}
L(`      COMPARACIONES EFECTIVAS : ${v3}`);
if (v3 === 0) abortar('cero comparaciones efectivas en V3');

// ── V4 ───────────────────────────────────────────────────────────────────────
L('');
L('  V4 — el rotulo viene de un titulo de "Capitania de Puerto" (INV-3.3)');
let v4 = 0;
for (const [k, e] of esperadas) {
  v4++;
  if (!TITULO_CAPITANIA.test(String(e.titulo || ''))) fallar(`entrada ${k}: el rotulo sale de ${JSON.stringify(e.titulo)}, que no es un titulo de Capitania de Puerto`);
}
L(`      COMPARACIONES EFECTIVAS : ${v4}`);
if (v4 === 0) abortar('cero comparaciones efectivas en V4');

// ── V5 ───────────────────────────────────────────────────────────────────────
L('');
L('  V5 — atomicidad de TODOS los telefonos del archivo (INV-10.1)');
let v5 = 0, noAtom = [];
for (const k of clavesAntes) {
  const t = jsonDespues[k].telefono;
  if (t == null) continue;
  v5++;
  if (!esAtomico(t)) noAtom.push(`${k}=${JSON.stringify(t)}`);
}
L(`      COMPARACIONES EFECTIVAS : ${v5}`);
L(`      no atomicos             : ${noAtom.length}`);
if (noAtom.length) fallar(`hay telefonos no atomicos: ${noAtom.join(' · ')}`);
if (v5 === 0) abortar('cero comparaciones efectivas en V5');

// ── V6 ───────────────────────────────────────────────────────────────────────
L('');
L('  V6 — las nulas que quedan estan declaradas');
const nulasDespues = clavesAntes.filter(k => jsonDespues[k].capitania === null);
L(`      COMPARACIONES EFECTIVAS : ${nulasAntes.length}`);
L(`      nulas antes             : ${nulasAntes.length}`);
L(`      nulas despues           : ${nulasDespues.length}`);
for (const k of nulasDespues) {
  const cd = SB.get(k);
  const r = cd !== undefined ? der.reparticiones[String(cd)] : null;
  let motivo = null;
  if (cd === undefined) motivo = 'SITPORT no trae la bahia';
  else if (!r) motivo = `el derivado no tiene la reparticion ${cd}`;
  else if (!r.nombre_publicado) motivo = `la reparticion ${cd} no tiene nombre publicado: ${r.motivo_sin_identificar}`;
  else if (!r.telefono) motivo = `la reparticion ${cd} no trae telefono`;
  else if (!esAtomico(r.telefono)) motivo = `el telefono de la reparticion ${cd} no es atomico: ${JSON.stringify(r.telefono)}`;
  if (!motivo) fallar(`la entrada ${k} sigue en null y NO hay motivo que lo explique`);
  else L(`      ${String(k).padStart(3)} sigue en null — ${motivo}`);
}
if (nulasDespues.length !== esperadasFuera.length) fallar(`quedaron ${nulasDespues.length} nulas y se esperaban ${esperadasFuera.length}`);

// ── cierre ───────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L(`  sha256 del archivo en disco : ${crypto.createHash('sha256').update(fs.readFileSync(abs(P_MAPA))).digest('hex')}`);
if (fallos === 0) { L('  RESULTADO: TODO VERDE — V1 a V6 sin fallas.'); L('================================================================================'); process.exit(0); }
L(`  RESULTADO: ${fallos} FALLA(S).`);
L('================================================================================');
process.exit(1);
