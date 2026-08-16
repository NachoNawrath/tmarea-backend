'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 04_nulas_solape.js — SOLO MIDE. ¿Las 17 entradas con `capitania` null tienen
// el MISMO candidato en SITPORT y en el JOIN, o discrepan?
//
// Decide si la Pieza A es separable de la eleccion de fuente: si los dos
// candidatos coinciden en las que ambos proponen, la pieza no obliga a elegir.
//
// Corrida:  node _bitacoras/auditoria_rotulos_2026-08-15/04_nulas_solape.js
// Shell declarada (§7.3): identica en PowerShell y Git Bash. Sin `>` de
// PowerShell para capturar: `| Tee-Object -FilePath salida.txt`.
//
// ABORTA con exit 3 si las COMPARACIONES EFECTIVAS no son exactamente 14. El
// reporte de sesion dijo "candidato en SITPORT para 17 y en el join para 14" y
// NO declaro el solape; 14 es la hipotesis a confirmar, no un dato heredado.
//
// No escribe nada. No toca el JSON.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));

const L = (...a) => console.log(...a);
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const abs = p => path.join(RAIZ, p);

const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_SB   = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_CSV  = '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv';
const P_JOIN = 'data/decreto/join_bahia_jurisdiccion.json';
const P_JUR  = 'data/decreto/jurisdicciones_v2.json';

L('================================================================================');
L('LAS 17 NULAS — SITPORT contra el JOIN. 2026-08-15');
L('================================================================================');
L('');
L('INSUMOS');
for (const p of [P_MAPA, P_SB, P_CSV, P_JOIN, P_JUR]) L(`    ${p.padEnd(64)} ${sha(abs(p))}…`);
L('    captura de SITPORT: 2026-08-13 (_bitacoras/e3_paso6_2026-08-13/). No es consulta en vivo.');

const mapa = JSON.parse(fs.readFileSync(abs(P_MAPA), 'utf8'));
const sbRaw = JSON.parse(fs.readFileSync(abs(P_SB), 'utf8'));
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
const csvPorCdRep = new Map(leerCSV(abs(P_CSV)).map(r => [Number(r.CdRep), r]));
const join = JSON.parse(fs.readFileSync(abs(P_JOIN), 'utf8'));
const joinPorId = new Map(join.entradas.map(e => [Number(e.bahia_id), e]));
const jurPorId = new Map(JSON.parse(fs.readFileSync(abs(P_JUR), 'utf8')).jurisdicciones.map(j => [j.id, j]));

// ─── el universo: las entradas con `capitania` null ──────────────────────────
const nulas = Object.keys(mapa).filter(i => mapa[i].capitania == null).map(Number).sort((a, b) => a - b);
L('');
L(`=== UNIVERSO: entradas con \`capitania\` null : ${nulas.length} ===`);
L(`    ${nulas.join(', ')}`);

// ─── los dos candidatos, por entrada ─────────────────────────────────────────
const filas = [];
for (const id of nulas) {
  const s = SB.get(id);
  const filaCsv = s ? csvPorCdRep.get(s.cdRep) : null;
  const candSit = filaCsv ? filaCsv.Capitania : null;
  const motivoSit = !s ? 'ausente de la captura'
    : !filaCsv ? `CdRep ${s.cdRep} sin fila en el CSV` : null;

  const e = joinPorId.get(id);
  const j = e && e.jurisdiccion_id ? jurPorId.get(e.jurisdiccion_id) : null;
  const candJoin = j ? j.nombre : null;
  const motivoJoin = !e ? 'sin entrada en el join'
    : !e.jurisdiccion_id ? `estado='${e.estado}'` : (!j ? `jurisdiccion_id '${e.jurisdiccion_id}' sin nombre en v2` : null);

  filas.push({
    id, nombreSitport: s ? s.nombre : null, cdRep: s ? s.cdRep : null,
    candSit, motivoSit, candJoin, motivoJoin,
    jid: e && e.jurisdiccion_id ? e.jurisdiccion_id : null,
    respaldo: e ? e.respaldo : null,
  });
}

L('');
L('=== TABLA CRUDA: los dos candidatos, las 17 ===');
L('    id   bahia (SITPORT)                        CdRep  candidato SITPORT      candidato JOIN');
for (const f of filas) {
  L(`    ${String(f.id).padStart(3)}  ${String(f.nombreSitport ?? '—').slice(0, 36).padEnd(38)} ${String(f.cdRep ?? '—').padStart(5)}  ${String(f.candSit ?? '(' + f.motivoSit + ')').padEnd(22)} ${f.candJoin ?? '(' + f.motivoJoin + ')'}`);
}

// ─── el cotejo ───────────────────────────────────────────────────────────────
const conSit  = filas.filter(f => f.candSit  != null);
const conJoin = filas.filter(f => f.candJoin != null);
const ambos   = filas.filter(f => f.candSit != null && f.candJoin != null);
const soloSit = filas.filter(f => f.candSit != null && f.candJoin == null);
const soloJoin= filas.filter(f => f.candSit == null && f.candJoin != null);
const ninguno = filas.filter(f => f.candSit == null && f.candJoin == null);

L('');
L('=== SOLAPE ===');
L(`    con candidato en SITPORT            : ${conSit.length}`);
L(`    con candidato en el JOIN            : ${conJoin.length}`);
L(`    con candidato en LOS DOS (comparables): ${ambos.length}`);
L(`    solo SITPORT                        : ${soloSit.length} -> ${soloSit.map(f => `${f.id} (${f.motivoJoin})`).join(', ') || '—'}`);
L(`    solo JOIN                           : ${soloJoin.length} -> ${soloJoin.map(f => f.id).join(', ') || '—'}`);
L(`    ninguno                             : ${ninguno.length} -> ${ninguno.map(f => f.id).join(', ') || '—'}`);

L('');
L(`=== COMPARACIONES EFECTIVAS : ${ambos.length} ===`);
if (ambos.length !== 14) {
  L('');
  L(`ABORTA — se esperaban 14 comparaciones efectivas y son ${ambos.length}.`);
  L('El solape entre "candidato en SITPORT" y "candidato en el JOIN" no es el');
  L('que el reporte de sesion daba por supuesto. Motivo por entrada arriba.');
  process.exit(3);
}

// Igualdad por normalizacion central (INV-0.3): NFD sin diacriticos, mayusculas,
// trim. Es comparacion de CADENA, no de identidad de reparticion.
const igual = f => normalizarTexto(f.candSit) === normalizarTexto(f.candJoin);
const coinciden = ambos.filter(igual);
const discrepan = ambos.filter(f => !igual(f));

L(`    coinciden (cadena normalizada) : ${coinciden.length}`);
L(`    DISCREPAN                      : ${discrepan.length}`);

L('');
L('=== LAS QUE COINCIDEN ===');
for (const f of coinciden) L(`    ${String(f.id).padStart(3)}  SITPORT="${f.candSit}"  JOIN="${f.candJoin}"`);

L('');
L('=== LAS QUE DISCREPAN, una por linea ===');
for (const f of discrepan)
  L(`    ${String(f.id).padStart(3)}  SITPORT="${f.candSit}"  JOIN="${f.candJoin}"   (CdRep ${f.cdRep} · jurisdiccion_id '${f.jid}' · respaldo=${f.respaldo})`);

L('');
L('Comparacion hecha con `normalizarTexto` de src/utils (INV-0.3). Es igualdad');
L('de CADENA: no afirma ni niega que dos nombres distintos sean la misma');
L('reparticion. Esa lectura no la hace este instrumento.');
L('Ningun archivo fue escrito.');
L('================================================================================');
