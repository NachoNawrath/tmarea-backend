'use strict';
// SOLO LECTURA. v3 — el corte que decide: qué bahías CAMBIARÍAN de atribución si
// se adoptara SITPORT, separando la diferencia de grafía de la diferencia real.
// Más 2.3 (contacto) y 2.4 (campos del join).
const path = require('path'); const fs = require('fs');
const RAIZ = 'C:/Users/katia/tmarea-backend';
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));

const join   = require(path.join(RAIZ, 'data/decreto/join_bahia_jurisdiccion.json'));
const mapa   = require(path.join(RAIZ, 'src/data/bahia-capitania-map.json'));
const insumo = require(path.join(RAIZ, 'data/decreto/jurisdicciones_v2.json'));
const spBah  = require(path.join(RAIZ, '_bitacoras/sondeo_catalogo_2026-08-12/sitport_bahias_raw.json')).recordset;
const spCap  = require(path.join(RAIZ, '_bitacoras/sondeo_catalogo_2026-08-12/sitport_capitanias_raw.json')).recordset;

const JUR = new Map(insumo.jurisdicciones.map(j => [j.id, j]));
const CAP_SP = new Map(spCap.map(c => [Number(c.Cdreparticion),
  String(c.NMBahia).replace(/^CAPITAN[ÍI]A\s+DE\s+PUERTO\s+/i, '').trim()]));
const REP = new Map(spBah.map(b => [Number(b.IDBahia), Number(b.CdReparticion)]));
const NOM_SP = new Map(spBah.map(b => [Number(b.IDBahia), b.NMBahia]));
const N = (s) => normalizarTexto(s);
const eq = (a, b) => { const n = N(a); return n !== '' && n === N(b); };
// quita prefijos que son convención de nombre, no entidad distinta
// OJO: normalizarTexto devuelve MAYÚSCULAS. Los patrones van en mayúscula o no
// colapsan ninguna variante (ese error dio "0 variantes de grafía" en la v3.0).
const nucleo = (s) => N(s).replace(/^(PUERTO|LAGO|BAHIA)\s+/, '').replace(/\bGRAL\.?\s*/, 'GENERAL ').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

// ── CSV del sondeo ───────────────────────────────────────────────────────────
function leerCSV(p) {
  const txt = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const lineas = txt.split(/\r?\n/).filter(l => l.trim());
  const parse = (l) => { const o = []; let c = '', q = false;
    for (let i = 0; i < l.length; i++) { const ch = l[i];
      if (ch === '"') { if (q && l[i+1] === '"') { c += '"'; i++; } else q = !q; }
      else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; }
    o.push(c); return o; };
  const cab = parse(lineas[0]);
  return lineas.slice(1).map(l => Object.fromEntries(parse(l).map((v, i) => [cab[i], v])));
}
const csv = leerCSV(path.join(RAIZ, '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv'));
const CSV_POR_REP = new Map(csv.map(r => [Number(r.CdRep), r]));

const filas = join.entradas.map(e => {
  const id = Number(e.bahia_id), m = mapa[String(id)] || {};
  const jur = e.jurisdiccion_id ? JUR.get(e.jurisdiccion_id) : null;
  const rep = REP.get(id) ?? null;
  return { id, nombre: e.nombre_sitport || NOM_SP.get(id) || '(sin nombre)',
    joinId: e.jurisdiccion_id, joinNombre: jur ? jur.nombre : e.jurisdiccion_id,
    respaldo: e.respaldo, estado: e.estado,
    mapaCap: m.capitania ?? null, mapaGob: m.gobernacion ?? null, mapaTel: m.telefono ?? null,
    rep, spCap: rep != null ? (CAP_SP.get(rep) || null) : null, csv: rep != null ? CSV_POR_REP.get(rep) : null };
});

const L = console.log;
L('='.repeat(78)); L('2.2 — CORTE POR ATRIBUCIÓN DE LA PROPIA BAHÍA'); L('='.repeat(78));
const res = filas.filter(f => f.estado === 'resuelta');
const igualNombre = res.filter(f => eq(f.joinNombre, f.spCap));
const soloGrafia  = res.filter(f => !eq(f.joinNombre, f.spCap) && nucleo(f.joinNombre) === nucleo(f.spCap));
const distintoDeVerdad = res.filter(f => !eq(f.joinNombre, f.spCap) && nucleo(f.joinNombre) !== nucleo(f.spCap));
L(`  resueltas por el join .......................... ${res.length}`);
L(`   · decreto y SITPORT dicen el mismo nombre ..... ${igualNombre.length}`);
L(`   · difieren SOLO en grafía/prefijo ............. ${soloGrafia.length}  (misma entidad)`);
L(`   · ATRIBUCIÓN DISTINTA DE VERDAD ............... ${distintoDeVerdad.length}`);
L(`  sin resolver (grupo D) ......................... ${filas.length - res.length}`);
L('');
L('  variantes de grafía encontradas:');
for (const v of [...new Set(soloGrafia.map(f => `${f.joinNombre}  ≡  ${f.spCap}`))]) L(`    ${v}`);
L('');
L('─'.repeat(78)); L(`  LAS ${distintoDeVerdad.length} CON ATRIBUCIÓN DISTINTA — decreto vs SITPORT`); L('─'.repeat(78));
for (const f of distintoDeVerdad)
  L(`  ${String(f.id).padStart(3)} ${f.nombre.padEnd(34)} decreto: ${String(f.joinNombre).padEnd(18)} SITPORT: ${String(f.spCap).padEnd(16)} [${f.respaldo}]  mapa: ${f.mapaCap}`);
L('');

L('='.repeat(78)); L('2.3 — CONTACTO'); L('='.repeat(78));
const claves = [...new Set(Object.values(mapa).flatMap(v => Object.keys(v)))];
L(`  campos que existen HOY en el mapa: ${JSON.stringify(claves)}`);
const conTel = filas.filter(f => f.mapaTel), conGob = filas.filter(f => f.mapaGob), conCap = filas.filter(f => f.mapaCap);
L(`  de las ${filas.length}: con telefono ${conTel.length} · con gobernacion ${conGob.length} · con capitania ${conCap.length} · con direccion 0 (el campo no existe)`);
const conCsv = filas.filter(f => f.csv);
const csvTel = filas.filter(f => f.csv && f.csv.Telefono), csvDir = filas.filter(f => f.csv && f.csv.Direccion), csvGob = filas.filter(f => f.csv && f.csv.Gobernacion);
L(`  con capitanias_64_final.csv: alcanzables ${conCsv.length} · tendrían telefono ${csvTel.length} · direccion ${csvDir.length} · gobernacion ${csvGob.length}`);
L('');
const normTel = (t) => String(t || '').replace(/[^0-9]/g, '');
const cambiaTel = filas.filter(f => f.csv && f.csv.Telefono && normTel(f.csv.Telefono) !== normTel(f.mapaTel));
const cambiaGob = filas.filter(f => f.csv && f.csv.Gobernacion && !eq(f.csv.Gobernacion, f.mapaGob));
const cambiaAlguno = filas.filter(f => cambiaTel.includes(f) || cambiaGob.includes(f));
L(`  cambiarían de TELÉFONO ....... ${cambiaTel.length}`);
L(`  cambiarían de GOBERNACIÓN .... ${cambiaGob.length}`);
L(`  cambiarían de alguno ......... ${cambiaAlguno.length}  ← las que impactan al patrón`);
L('');
L('  GOBERNACIÓN — las que cambiarían:');
for (const f of cambiaGob) L(`    ${String(f.id).padStart(3)} ${f.nombre.padEnd(32)} ${String(f.mapaGob).padEnd(16)} → ${f.csv.Gobernacion}`);
L('');
L('  TELÉFONO — las que cambiarían (agrupadas por capitanía del CSV):');
const porCap = new Map();
for (const f of cambiaTel) { const k = `${f.csv.Capitania}|${f.mapaTel}|${f.csv.Telefono}`;
  if (!porCap.has(k)) porCap.set(k, []); porCap.get(k).push(f.id); }
for (const [k, ids] of porCap) { const [cap, viejo, nuevo] = k.split('|');
  L(`    ${cap.padEnd(20)} ${String(viejo).padEnd(18)} → ${nuevo}`);
  L(`        ${ids.length} bahías: ${ids.join(', ')}`); }
L('');

L('='.repeat(78)); L('2.4 — ¿EL JOIN TIENE CAMPOS DE CONTACTO?'); L('='.repeat(78));
L(`  campos de una entrada del join: ${JSON.stringify(Object.keys(join.entradas[0]))}`);
const contacto = ['telefono', 'direccion', 'gobernacion', 'contacto', 'fono', 'email'];
const hallados = Object.keys(join.entradas[0]).filter(k => contacto.some(c => k.toLowerCase().includes(c)));
L(`  campos de contacto presentes: ${hallados.length ? JSON.stringify(hallados) : 'NINGUNO'}`);
L(`  conteo declarado por el join : ${JSON.stringify(join.conteo)}`);

L(''); L('='.repeat(78)); L('2.2 — GRUPOS A/B/C/D (variantes de grafía ya colapsadas)'); L('='.repeat(78));
const mismo = (a,b) => nucleo(a) !== '' && nucleo(a) === nucleo(b);
const gA=[],gB=[],gC=[],gD=[];
for (const f of filas) {
  if (f.estado !== 'resuelta' || !f.joinId) { gD.push(f); continue; }
  if (!mismo(f.joinNombre, f.spCap)) { gC.push(f); continue; }
  mismo(f.mapaCap, f.joinNombre) ? gA.push(f) : gB.push(f);
}
L(`  A) los tres coinciden .................... ${gA.length}`);
L(`  B) join=SITPORT, mapa difiere ........... ${gB.length}`);
L(`  C) join difiere de SITPORT .............. ${gC.length}`);
L(`  D) el join no la resuelve ............... ${gD.length}`);
L(`                                    TOTAL   ${gA.length+gB.length+gC.length+gD.length}`);
L('');
L('  GRUPO B en detalle (mapa desactualizado, sin efecto en la medición):');
for (const f of gB) L(`    ${String(f.id).padStart(3)} ${f.nombre.padEnd(34)} join/SITPORT: ${String(f.joinNombre).padEnd(20)} mapa: ${f.mapaCap}`);
const cB={}; for(const f of gB) cB[f.respaldo]=(cB[f.respaldo]||0)+1;
L(`    respaldo en B: ${JSON.stringify(cB)}`);
