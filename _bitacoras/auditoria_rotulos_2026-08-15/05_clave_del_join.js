'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 05_clave_del_join.js — SOLO MIDE. Tres preguntas:
//   Q1  ¿con que clave resuelve el constructor del join?
//   Q2  ¿que nombra cada lado: una REPARTICION o un CUERPO DE AGUA?
//   Q3  las 38 de 157 de M4b, agrupadas por el MECANISMO con que el join llego
//       a su valor — el campo `criterio`, verbatim del dato.
//
// NO adjudica equivalencias de nombre. En ningun punto decide que dos rotulos
// son la misma reparticion: agrupa por como se resolvio, que es dato.
//
// Corrida:  node _bitacoras/auditoria_rotulos_2026-08-15/05_clave_del_join.js
// Shell declarada (§7.3): identica en PowerShell y Git Bash.
// No escribe nada.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);

const mapa = JSON.parse(fs.readFileSync(abs('src/data/bahia-capitania-map.json'), 'utf8'));
const sbRaw = JSON.parse(fs.readFileSync(abs('_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json'), 'utf8'));
const SB = new Map((Array.isArray(sbRaw) ? sbRaw : sbRaw.recordsets[0])
  .map(r => [Number(r.IDBahia), { cdRep: Number(r.CdReparticion), nombre: r.NMBahia }]));
function leerCSV(f) {
  const txt = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
  const filas = [];
  for (const linea of txt.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const c = []; let cur = ''; let dentro = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (ch === '"') { if (dentro && linea[i + 1] === '"') { cur += '"'; i++; } else dentro = !dentro; }
      else if (ch === ',' && !dentro) { c.push(cur); cur = ''; } else cur += ch;
    }
    c.push(cur); filas.push(c);
  }
  const cab = filas.shift();
  return filas.map(f2 => Object.fromEntries(cab.map((h, i) => [h, f2[i]])));
}
const csv = leerCSV(abs('_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv'));
const csvPorCdRep = new Map(csv.map(r => [Number(r.CdRep), r]));
const join = JSON.parse(fs.readFileSync(abs('data/decreto/join_bahia_jurisdiccion.json'), 'utf8'));
const joinPorId = new Map(join.entradas.map(e => [Number(e.bahia_id), e]));
const jur = JSON.parse(fs.readFileSync(abs('data/decreto/jurisdicciones_v2.json'), 'utf8'));
const jurPorId = new Map(jur.jurisdicciones.map(j => [j.id, j]));

L('================================================================================');
L('LA CLAVE DEL JOIN, Y QUE NOMBRA CADA LADO. 2026-08-15');
L('================================================================================');

// ─── Q1 ──────────────────────────────────────────────────────────────────────
L('');
L('=== Q1 — CON QUE CLAVE RESUELVE EL CONSTRUCTOR ===');
const CONSTRUCTOR = 'scripts/e03join_construir_join.js';
const RECON = 'scripts/e03join_reconocimiento.js';
const txtC = fs.readFileSync(abs(CONSTRUCTOR), 'utf8').split(/\r?\n/);
const txtR = fs.readFileSync(abs(RECON), 'utf8').split(/\r?\n/);
const hits = (arr, re) => arr.map((l, i) => [i + 1, l]).filter(([, l]) => re.test(l));

L(`  ocurrencias de "CdReparticion" en ${CONSTRUCTOR} : ${hits(txtC, /CdReparticion/).length}`);
L(`  ocurrencias de "CdReparticion" en ${RECON}       : ${hits(txtR, /CdReparticion/).length}`);
L('');
L(`  ${CONSTRUCTOR} — sus insumos, literal:`);
for (const [n, l] of hits(txtC, /^const RUTAS = \{|particion:|cierre:|insumo:|zonas:/)) L(`    ${String(n).padStart(4)}: ${l}`);
L('');
L(`  ${RECON} — donde SI aparece CdReparticion, literal:`);
for (const [n, l] of hits(txtR, /CdReparticion/)) L(`    ${String(n).padStart(4)}: ${l.trim()}`);
L('');
L(`  ${RECON} — el bloque que resuelve lo lacustre, literal:`);
for (const [n, l] of hits(txtR, /IDENTIDAD LITERAL CONTRA LOS CUERPOS|cotejo_lacustre_adjudicado|cuerpoAJur|const buscarCuerpo|GENERICOS =|k\.replace\(GENERICOS/)) L(`    ${String(n).padStart(4)}: ${l.trim()}`);

// ─── Q2 ──────────────────────────────────────────────────────────────────────
L('');
L('=== Q2 — QUE NOMBRA CADA LADO, CONTRA EL DATO ===');
L('');
L('  LADO SITPORT. `consultaBahias` trae por bahia un `CdReparticion`, y el CSV');
L('  lo traduce a un nombre. Las 6 bahias de LAGO PELLAIFA/PULLINQUE/CALAFQUEN/');
L('  RIÑIHUE/NELTUME/PIREHUICO y las 3 del LAGO VILLARRICA, crudo:');
for (const id of [105, 209, 210, 245, 246, 247, 248, 249, 250, 106]) {
  const s = SB.get(id); const f = csvPorCdRep.get(s.cdRep);
  L(`    bahia ${String(id).padStart(3)}  "${String(s.nombre).padEnd(34)}"  CdRep ${String(s.cdRep).padStart(3)} -> CSV.Capitania="${f.Capitania}"  CSV.Gobernacion="${f.Gobernacion}"`);
}
L('');
L('  LADO JOIN. El valor es un `jurisdiccion_id` del decreto. Lo que ese id trae');
L('  en jurisdicciones_v2.json, crudo:');
for (const jid of ['lago_villarrica', 'lago_panguipulli']) {
  const j = jurPorId.get(jid);
  L(`    id="${j.id}"  nombre="${j.nombre}"  ambito="${j.ambito}"  gobernacion="${j.gobernacion}"`);
  L(`      texto_decreto: ${JSON.stringify(j.texto_decreto)}`);
  L(`      cuerpos_lacustres: ${Array.isArray(j.cuerpos_lacustres) ? j.cuerpos_lacustres.length + ' -> ' + JSON.stringify(j.cuerpos_lacustres) : JSON.stringify(j.cuerpos_lacustres)}`);
}
L('');
L('  EL DATO QUE CONTESTA LA PREGUNTA, sin interpretar el nombre del campo:');
L('  el `texto_decreto` de `lago_panguipulli` ENUMERA los seis lagos de las');
L('  bahias 245-250 y el `texto_decreto` de `lago_villarrica` NO los enumera.');
const tp = normalizarTexto(jurPorId.get('lago_panguipulli').texto_decreto || '');
const tv = normalizarTexto(jurPorId.get('lago_villarrica').texto_decreto || '');
L('');
L('    lago            ¿figura en texto_decreto de lago_panguipulli?  ¿y en el de lago_villarrica?');
for (const id of [245, 246, 247, 248, 249, 250]) {
  const nom = String(SB.get(id).nombre);
  const desnudo = normalizarTexto(nom).replace(/^(LAGO|LAGUNA|EMBALSE|RIO)\s+/, '');
  // busqueda de SUBCADENA sobre el texto literal del decreto. No decide identidad
  // de reparticion: solo dice si esa palabra esta escrita en ese parrafo.
  L(`    ${nom.padEnd(18)} ${String(tp.includes(desnudo)).padEnd(46)} ${tv.includes(desnudo)}`);
}
L('');
L('    OJO: "PIREHUICO" (SITPORT) contra "Pirihueico" (decreto) son cadenas');
L('    distintas y la busqueda de subcadena da false. NO se resuelve aca: decidir');
L('    que son el mismo lago es adjudicar, y no es de este instrumento.');

// ─── Q3 ──────────────────────────────────────────────────────────────────────
L('');
L('=== Q3 — LAS 38 DE 157, AGRUPADAS POR EL `criterio` DEL JOIN ===');
L('  El agrupamiento es por el campo `criterio` de cada entrada del join, verbatim.');
L('  Dice COMO se resolvio esa bahia. No clasifica nombres ni decide equivalencias.');
const ids = Object.keys(mapa);
let comparadas = 0;
const difieren = [];
for (const id of ids) {
  const s = SB.get(Number(id)); const e = joinPorId.get(Number(id));
  if (!s || !e || !e.jurisdiccion_id) continue;
  const f = csvPorCdRep.get(s.cdRep); const j = jurPorId.get(e.jurisdiccion_id);
  if (!f || !j) continue;
  comparadas++;
  if (normalizarTexto(f.Capitania) !== normalizarTexto(j.nombre))
    difieren.push({ id: Number(id), sitport: f.Capitania, decreto: j.nombre, criterio: e.criterio, respaldo: e.respaldo, ambito: j.ambito });
}
L('');
L(`  COMPARACIONES EFECTIVAS : ${comparadas}`);
L(`  DIFIEREN                : ${difieren.length}`);
if (comparadas !== 157 || difieren.length !== 38) {
  L('');
  L(`ABORTA — se esperaban 157 comparaciones y 38 diferencias (M4b); son ${comparadas} y ${difieren.length}.`);
  process.exit(3);
}
const porCriterio = new Map();
for (const d of difieren) {
  const k = d.criterio || '(criterio null)';
  if (!porCriterio.has(k)) porCriterio.set(k, []);
  porCriterio.get(k).push(d);
}
L('');
for (const [k, v] of [...porCriterio].sort((a, b) => b[1].length - a[1].length)) {
  L(`  --- ${v.length} entradas · criterio: "${k}"`);
  for (const d of v.sort((a, b) => a.id - b.id))
    L(`      ${String(d.id).padStart(3)}  SITPORT="${d.sitport}"  decreto="${d.decreto}"  (ambito=${d.ambito}, respaldo=${d.respaldo})`);
}
L('');
L('  Reparto por ambito de la jurisdiccion del decreto:');
const porAmbito = new Map();
for (const d of difieren) porAmbito.set(d.ambito, (porAmbito.get(d.ambito) || 0) + 1);
for (const [k, v] of porAmbito) L(`      ${String(k).padEnd(18)} ${v}`);

L('');
L('Este instrumento NO clasifica las 38 en "conflicto real" contra "artefacto".');
L('Esa particion exige decidir si dos rotulos nombran la misma reparticion, y eso');
L('es adjudicacion del owner. Lo que entrega es el mecanismo de cada una.');
L('Ningun archivo fue escrito.');
L('================================================================================');
