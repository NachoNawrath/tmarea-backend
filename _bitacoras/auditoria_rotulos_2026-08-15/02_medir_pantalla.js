'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 02_medir_pantalla.js — QUE LE LLEGA AL PATRON. Solo mide.
//
// Corrida:  node _bitacoras/auditoria_rotulos_2026-08-15/02_medir_pantalla.js
// Shell declarada (§7.3): igual en PowerShell y en Git Bash. Sin `>` de
// PowerShell: la salida se captura con `-o`/`tee` o se lee de pantalla.
//
// LO QUE MIDE. Hay TRES caminos distintos de contacto hacia la pantalla, y no
// leen el mismo campo. Medirlos como uno solo fue lo que dejo pasar el defecto:
//
//   P1  restricciones-ruta (:817) -> capitaniaDeBahia(id, ambitosPublicados)
//       -> TransitRestrictionsBlock.jsx:62  `r.capitania || r.gobernacion`
//       Render: "📞 {nombre} — {tel}".  SIN etiqueta de nivel.
//
//   P2  estado-puerto (:339) -> getCapitaniaByBahiaId  (MAPA CRUDO)
//       -> P3_VoyageVerification.jsx:237  `rec.capitania || rec.gobernacion`
//       Render: "Capitania de Puerto de {nombre}". ETIQUETA DURA en el JSX.
//
//   P3  estado-puerto (:339) -> getCapitaniaByBahiaId  (MAPA CRUDO)
//       -> PortStatusBlock.jsx:76-77  `data.gobernacion` / `data.telefono`
//       Render: "📞 Gobernacion Maritima de {nombre} — {tel}".
//       NUNCA lee `capitania`.
//
// Los tres se leyeron del codigo, no se supusieron. Las rutas de la PWA son
// C:/Users/katia/tmarea-pwa, leida SOLO como lectura.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));

const L = (...a) => console.log(...a);
let ABORTOS = [];

const mapa = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/bahia-capitania-map.json'), 'utf8'));
const ids  = Object.keys(mapa);
const amb  = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/decreto/ambitos_publicados.json'), 'utf8'));
const join = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/decreto/join_bahia_jurisdiccion.json'), 'utf8'));
const jur  = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/decreto/jurisdicciones_v2.json'), 'utf8'));
const jurPorId  = new Map(jur.jurisdicciones.map(j => [j.id, j]));
const joinPorId = new Map(join.entradas.map(e => [Number(e.bahia_id), e]));

// captura SITPORT del 2026-08-13
const sbRaw = JSON.parse(fs.readFileSync(path.join(RAIZ, '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json'), 'utf8'));
const SB = new Map((Array.isArray(sbRaw) ? sbRaw : sbRaw.recordsets[0]).map(r => [Number(r.IDBahia), Number(r.CdReparticion)]));

// CSV verificado: CdRep -> nombre de Capitania
function leerCSV(f) {
  const txt = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
  const filas = [];
  for (const linea of txt.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const c = []; let cur = ''; let dentro = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (ch === '"') { if (dentro && linea[i + 1] === '"') { cur += '"'; i++; } else dentro = !dentro; }
      else if (ch === ',' && !dentro) { c.push(cur); cur = ''; }
      else cur += ch;
    }
    c.push(cur); filas.push(c);
  }
  const cab = filas.shift();
  return filas.map(f2 => Object.fromEntries(cab.map((h, i) => [h, f2[i]])));
}
const csv = leerCSV(path.join(RAIZ, '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv'));
const csvPorCdRep = new Map(csv.map(r => [Number(r.CdRep), r]));
const NOMBRES_GOBERNACION = new Set(csv.map(r => normalizarTexto(r.Gobernacion)));

L('================================================================================');
L('QUE LE LLEGA AL PATRON — TRES CAMINOS DE CONTACTO, MEDIDOS POR SEPARADO');
L('2026-08-15');
L('================================================================================');

// ─── El estado de los ambitos, que decide de donde sale el nombre en P1 ──────
L('');
L('=== AMBITOS PUBLICADOS HOY (deciden el nombre solo en P1) ===');
const publicados = amb.ambitos.filter(a => a.publicado).map(a => a.ambito);
for (const a of amb.ambitos) L(`  ${a.ambito.padEnd(18)} publicado=${a.publicado}`);
L(`  ambitosPublicados efectivo = [${publicados.join(', ')}]`);
L('  Nota: en la ruta real ese arreglo sale de ensancheVigente(pool) contra la base,');
L('  no de este archivo. Aca se mide el archivo declarado, que es lo que el gate lee.');

// reimplementacion literal de capitania-de-bahia.js:50-76, para poder medirla sin base
function capitaniaDeBahiaSim(id, ambitos) {
  const c = mapa[String(id)] || null;
  const delMapa = { capitania: c ? c.capitania ?? null : null, gobernacion: c ? c.gobernacion ?? null : null,
                    telefono: c ? c.telefono ?? null : null, fuente: 'mapa_operativo' };
  if (!Array.isArray(ambitos) || ambitos.length === 0) return delMapa;
  const e = joinPorId.get(Number(id));
  if (!e || !e.jurisdiccion_id) return delMapa;
  const j = jurPorId.get(e.jurisdiccion_id);
  if (!j || !ambitos.includes(j.ambito)) return delMapa;
  return { capitania: j.nombre, gobernacion: delMapa.gobernacion, telefono: delMapa.telefono, fuente: 'decreto' };
}

// verdad de referencia: a que Capitania atribuye SITPORT
function sitportDe(id) {
  const cd = SB.get(Number(id)); if (cd == null) return null;
  const f = csvPorCdRep.get(cd); return f ? f.Capitania : null;
}

// ─── P1 ──────────────────────────────────────────────────────────────────────
L('');
L('=== P1 — bahias INTERMEDIAS de la ruta (TransitRestrictionsBlock) ===');
L('  Render literal: "📞 {r.capitania || r.gobernacion} — {r.telefono}", sin etiqueta.');
let p1 = { comparadas: 0, ok: 0, equivocadas: [], porDecreto: 0, caeAGobernacion: [] };
for (const id of ids) {
  const c = capitaniaDeBahiaSim(id, publicados);
  if (c.fuente === 'decreto') p1.porDecreto++;
  const mostrado = c.capitania || c.gobernacion;      // el `||` del JSX
  if (!c.capitania) p1.caeAGobernacion.push({ id, muestra: c.gobernacion });
  const s = sitportDe(id);
  if (!s || !mostrado) continue;
  p1.comparadas++;
  if (normalizarTexto(mostrado) === normalizarTexto(s)) p1.ok++;
  else p1.equivocadas.push({ id, muestra: mostrado, sitport: s, fuente: c.fuente, tel: c.telefono });
}
L(`  entradas cuyo nombre sale del DECRETO hoy (ambito publicado): ${p1.porDecreto}`);
L(`  entradas donde \`capitania\` es null y el JSX cae a \`gobernacion\`: ${p1.caeAGobernacion.length}`);
L(`      -> ${p1.caeAGobernacion.map(x => `${x.id}:"${x.muestra}"`).join(', ')}`);
L(`  COMPARACIONES EFECTIVAS : ${p1.comparadas}`);
L(`  el nombre mostrado ES el que SITPORT atribuye : ${p1.ok}`);
L(`  el nombre mostrado NO lo es                   : ${p1.equivocadas.length}`);
if (p1.comparadas === 0) ABORTOS.push('P1 con cero comparaciones efectivas');

// ─── P2 ──────────────────────────────────────────────────────────────────────
L('');
L('=== P2 — aviso de ARRIBADA FORZOSA (P3_VoyageVerification.jsx:237) ===');
L('  Render literal: "Capitania de Puerto de {rec.capitania || rec.gobernacion}".');
L('  Lee del MAPA CRUDO (estado-puerto :339 -> getCapitaniaByBahiaId): el decreto');
L('  NO participa en este camino, este por publicado el ambito que este.');
let p2 = { comparadas: 0, ok: 0, equivocadas: [], gobernacionRotuladaCapitania: [] };
for (const id of ids) {
  const c = mapa[id];
  const mostrado = c.capitania || c.gobernacion;
  if (c.capitania == null) {
    // el `||` cae al campo gobernacion, y el JSX lo rotula "Capitania de Puerto de"
    p2.gobernacionRotuladaCapitania.push({ id, muestra: c.gobernacion,
      esNombreDeGobernacion: NOMBRES_GOBERNACION.has(normalizarTexto(c.gobernacion)) });
  }
  const s = sitportDe(id);
  if (!s || !mostrado) continue;
  p2.comparadas++;
  if (normalizarTexto(mostrado) === normalizarTexto(s)) p2.ok++;
  else p2.equivocadas.push({ id, muestra: mostrado, sitport: s });
}
L(`  COMPARACIONES EFECTIVAS : ${p2.comparadas}`);
L(`  el nombre rotulado "Capitania de Puerto de X" ES el que SITPORT atribuye : ${p2.ok}`);
L(`  NO lo es                                                                : ${p2.equivocadas.length}`);
L(`  entradas donde lo rotulado "Capitania de Puerto de" es un nombre de GOBERNACION: ${p2.gobernacionRotuladaCapitania.filter(x => x.esNombreDeGobernacion).length} de ${p2.gobernacionRotuladaCapitania.length}`);
for (const x of p2.gobernacionRotuladaCapitania)
  L(`      ${String(x.id).padStart(3)}  capitania=null -> muestra "Capitania de Puerto de ${x.muestra}"  (¿es nombre de Gobernacion? ${x.esNombreDeGobernacion})`);
if (p2.comparadas === 0) ABORTOS.push('P2 con cero comparaciones efectivas');

// ─── P3 ──────────────────────────────────────────────────────────────────────
L('');
L('=== P3 — tarjeta de ZARPE y RECALADA (PortStatusBlock.jsx:76-77) ===');
L('  Render literal: "📞 Gobernacion Maritima de {data.gobernacion} — {data.telefono}".');
L('  NO lee `capitania` en ningun caso. Es el escalon que INV-10.1 gobierna.');
// de quien es cada telefono
const telDeCapitania = new Map();
for (const r of csv) for (const t of String(r.Telefono).split(/ó|ó|\//)) {
  const d = t.replace(/[^0-9]/g, ''); if (d.length >= 8) telDeCapitania.set(d, r.Capitania);
}
let p3 = { total: 0, telDeCapitania: [], telNoReconocido: 0 };
for (const id of ids) {
  const c = mapa[id]; if (!c.telefono) continue;
  p3.total++;
  const d = String(c.telefono).replace(/[^0-9]/g, '');
  if (telDeCapitania.has(d)) p3.telDeCapitania.push({ id, gob: c.gobernacion, tel: c.telefono, deQuien: telDeCapitania.get(d) });
  else p3.telNoReconocido++;
}
L(`  entradas con telefono                                       : ${p3.total}`);
L(`  cuyo numero es de una CAPITANIA del CSV verificado           : ${p3.telDeCapitania.length}`);
L(`  cuyo numero no figura en el CSV de Capitanias (Gobernacion u otro): ${p3.telNoReconocido}`);
L('  De las que SI: el numero de una Capitania se muestra bajo la etiqueta');
L('  "Gobernacion Maritima de {Gobernacion}". Reparto por Capitania duena del numero:');
const rep = new Map();
for (const x of p3.telDeCapitania) rep.set(x.deQuien, (rep.get(x.deQuien) || 0) + 1);
for (const [k, v] of [...rep].sort((a, b) => b[1] - a[1])) L(`      ${String(k).padEnd(24)} ${String(v).padStart(3)}`);
if (p3.total === 0) ABORTOS.push('P3 con cero entradas con telefono');

// ─── las creibles-y-equivocadas que EFECTIVAMENTE se muestran ────────────────
L('');
L('=== LO PELIGROSO: nombre creible y equivocado que SI llega a pantalla ===');
const universo = new Set([...csv.map(r => normalizarTexto(r.Capitania)),
                          ...jur.jurisdicciones.map(j => normalizarTexto(j.nombre))]);
for (const [etq, lista] of [['P1 (transito)', p1.equivocadas], ['P2 (arribada forzosa)', p2.equivocadas]]) {
  const creibles = lista.filter(d => universo.has(normalizarTexto(d.muestra)));
  L(`  ${etq.padEnd(24)}: ${creibles.length} creibles-y-equivocadas de ${lista.length} equivocadas`);
}
L('');
L('  --- detalle P1, el camino donde el rotulo del mapa llega tal cual ---');
for (const d of p1.equivocadas.sort((a, b) => Number(a.id) - Number(b.id)))
  L(`    ${String(d.id).padStart(3)}  muestra "${d.muestra}" (${d.fuente})  ·  SITPORT dice "${d.sitport}"  ·  tel ${d.tel}`);

L('');
if (ABORTOS.length) { L('ABORTA — ' + ABORTOS.join(' · ')); process.exit(3); }
L('Ningun archivo de src/, data/ ni de la PWA fue escrito por este instrumento.');
L('================================================================================');
