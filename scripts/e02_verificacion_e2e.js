'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e02_verificacion_e2e.js — verificacion de punta a punta de E0.2.
//
// Contesta dos cosas y las contesta ejecutando el motor, no describiendolo:
//   1. ¿Cambio la CAUSA donde tenia que cambiar?  (lacustre y antartico)
//   2. ¿Se movio alguna BANDERA?  La propuesta prometio 0 cambios sobre las
//      ocho rutas reales, medido antes de construir. Aca se comprueba despues.
//
//   node scripts/e02_verificacion_e2e.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { Pool } = require('pg');
const { warmup, calcularRuta } = require('../src/services/raster-router-service');
const { construirPerfilCosto } = require('../src/config/perfiles-costo');
const { medirCoberturaRuta, componerAvisos } = require('../src/services/cobertura-jurisdiccional');

const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});

const PUNTOS = {
  ANAHUAC:      { lat: -41.48607231899996, lon: -72.97656408099994 },
  MELINKA:      { lat: -43.89816864699998, lon: -73.74786402599995 },
  CHACABUCO:    { lat: -45.462,            lon: -72.807 },
  QUELLON:      { lat: -43.12075347399997, lon: -73.62317869399999 },
  CHONCHI:      { lat: -42.61872181399997, lon: -73.76883021899994 },
  CASTRO:       { lat: -42.4808,           lon: -73.7591 },
  ANCUD:        { lat: -41.8665,           lon: -73.8313 },
  CHAITEN:      { lat: -42.9112,           lon: -72.7187 },
  ARICA:        { lat: -18.4746,           lon: -70.3126 },
  IQUIQUE:      { lat: -20.2133,           lon: -70.1503 },
  PUNTA_ARENAS: { lat: -53.1358,           lon: -70.8625 },
  PTO_WILLIAMS: { lat: -54.9324,           lon: -67.5968 },
  VALPARAISO:   { lat: -33.0333,           lon: -71.6333 },
  SAN_ANTONIO:  { lat: -33.5833,           lon: -71.6167 },
};

// La bandera medida ANTES de construir E0.2, en
// _bitacoras/e02_propuesta_2026-08-11/01_causas_por_ambito.txt. Se escribe aca
// para que la comparacion sea automatica y no a ojo.
const BANDERA_ANTES = {
  'Anahuac -> Melinka': 'Q',
  'Anahuac -> Quellon': 'Q',
  'Anahuac -> Chacabuco': 'Q',
  'Ancud -> Castro (mar interior)': 'Q',
  'Chonchi -> Chaiten (Corcovado)': 'Q',
  'Arica -> Iquique (norte)': 'Q',
  'Valparaiso -> San Antonio': 'Q',
  'Punta Arenas -> Pto Williams': 'U',
  'Lago Villarrica: bahia 210 -> 209': 'U',
  'Antartica: bahia 139 Fildes -> 231 Chile': 'U',
};

const RUTAS = [
  ['Anahuac -> Melinka', 'ANAHUAC', 'MELINKA'],
  ['Anahuac -> Quellon', 'ANAHUAC', 'QUELLON'],
  ['Anahuac -> Chacabuco', 'ANAHUAC', 'CHACABUCO'],
  ['Ancud -> Castro (mar interior)', 'ANCUD', 'CASTRO'],
  ['Chonchi -> Chaiten (Corcovado)', 'CHONCHI', 'CHAITEN'],
  ['Arica -> Iquique (norte)', 'ARICA', 'IQUIQUE'],
  ['Valparaiso -> San Antonio', 'VALPARAISO', 'SAN_ANTONIO'],
  ['Punta Arenas -> Pto Williams', 'PUNTA_ARENAS', 'PTO_WILLIAMS'],
];

const DIRECTAS = [
  ['Lago Villarrica: bahia 210 -> 209',
    [{ lat: -39.2883, lng: -72.2195 }, { lat: -39.2833, lng: -71.9667 }]],
  ['Antartica: bahia 139 Fildes -> 231 Chile',
    [{ lat: -62.2, lng: -58.9667 }, { lat: -62.4667, lng: -59.6833 }]],
];

const L = (...a) => console.log(...a);
const filas = [];

async function correr(nombre, wps) {
  const med = await medirCoberturaRuta(pool, wps);
  const { avisos, defectos, bandera_cobertura } = await componerAvisos(med, pool);
  const antes = BANDERA_ANTES[nombre];
  const cambio = antes !== bandera_cobertura;
  filas.push({ nombre, antes, ahora: bandera_cobertura, cambio });

  L('');
  L('─'.repeat(78));
  L(`${nombre}`);
  L(`  bandera ANTES ${antes}  ->  AHORA ${bandera_cobertura}   ${cambio ? '*** CAMBIO ***' : '(sin cambio)'}`);
  L(`  avisos ${avisos.length} · defectos de construccion registrados ${defectos.length}`);
  for (const a of avisos) {
    L(`    aviso ${a.largo_km} km`);
    L(`      causa  = ${a.causa}`);
    L(`      origen = ${a.origen}`);
    L(`      ambito_no_publicado = ${a.ambito_no_publicado || '(ninguno)'}`);
    L(`      jurisdicciones_probables = ${JSON.stringify(a.jurisdicciones_probables)}`);
    L(`      capitanias = ${JSON.stringify(a.capitanias)}`);
    L(`      capa_2 -> ${a.capa_2.slice(0, 90)}...`);
  }
}

(async () => {
  L('VERIFICACION DE PUNTA A PUNTA — E0.2');
  L(`fecha: ${new Date().toISOString()}`);
  L('shell: PowerShell 5.1 / Windows. Reproducible: node scripts/e02_verificacion_e2e.js');

  warmup('AUSTRAL_N');
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

  L('\n' + '='.repeat(78));
  L('LAS OCHO RUTAS REALES');
  L('='.repeat(78));
  for (const [nombre, a, b] of RUTAS) {
    const r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b]);
    if (!r.ok) { L(`\n${nombre}: RUTEO FALLIDO ${r.error}`); continue; }
    const wps = r.tramos.filter(t => t.tipo !== 'aproximacion_final')
      .flatMap(t => t.coords).map(c => ({ lat: c[1], lng: c[0] }));
    await correr(nombre, wps);
  }

  L('\n' + '='.repeat(78));
  L('LAS DOS RUTAS DE AMBITO NO PUBLICADO');
  L('='.repeat(78));
  for (const [nombre, wps] of DIRECTAS) await correr(nombre, wps);

  L('\n' + '='.repeat(78));
  L('RESUMEN DE BANDERAS');
  L('='.repeat(78));
  for (const f of filas) {
    L(`  ${f.nombre.padEnd(42)} ${f.antes} -> ${f.ahora}  ${f.cambio ? 'CAMBIO' : 'igual'}`);
  }
  const cambios = filas.filter(f => f.cambio).length;
  L(`\nRutas medidas: ${filas.length} · cambios de bandera: ${cambios}`);
  L(cambios === 0
    ? 'La promesa de la propuesta se cumple: 0 cambios de bandera.'
    : 'ATENCION: hubo cambios de bandera que la propuesta no anticipo.');

  await pool.end();
  process.exit(cambios === 0 ? 0 : 1);
})().catch(async (e) => {
  console.error('VERIFICACION ABORTADA:', e.message, '\n', e.stack);
  try { await pool.end(); } catch { /* noop */ }
  process.exit(1);
});
