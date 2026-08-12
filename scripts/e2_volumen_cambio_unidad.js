#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e2_volumen_cambio_unidad.js — E2, el número que la etapa existe para producir.
//
// LA PREGUNTA: cuántas restricciones ve el patrón HOY, con la unidad bahía, y
// cuántas vería con la unidad Capitanía. Cuánto cambia, y en qué dirección.
//
// CÓMO SE REPRODUCE LO DE HOY, sin una segunda implementación de la regla:
//   · el set de bahías de la ruta sale del MISMO SQL que `bahiasEnRutaPostGIS`
//     usa en sitport-routes.js:562 — ST_Intersects contra la capa que el motor
//     consulta, que `capa_consultada.json` nombra;
//   · una restricción se muestra hoy si su `bahia` está en ese set.
//
// CÓMO SE MODELA LA UNIDAD NUEVA:
//   · el set de JURISDICCIONES de la ruta sale del andamio (E1), pedido por
//     `capaDeMedicion()`;
//   · la Capitanía de la bahía de cada restricción sale del join de E0.3
//     (`join_bahia_jurisdiccion.json`), que es el dato que esa etapa dejó;
//   · una restricción se muestra si la jurisdicción de su bahía está en el set.
//     Es INV-3.4: la bahía etiqueta, la Capitanía decide.
//
// INSUMO DE RESTRICCIONES: la captura versionada de E0.1, para que el número sea
// reproducible. Una corrida en vivo da otro número cada hora y no se podría
// comparar con nada. Queda declarado en la salida.
//
// Uso:  node scripts/e2_volumen_cambio_unidad.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { warmup, calcularRuta } = require('../src/services/raster-router-service');
const { construirPerfilCosto } = require('../src/config/perfiles-costo');
const { capaDeMedicion } = require('../src/services/andamio-medicion');
const { cargarJoin } = require('../src/services/join-bahia-jurisdiccion');

const RAIZ = path.join(__dirname, '..');
const declCapa = require('../data/decreto/capa_consultada.json');
const CAPTURA = path.join(RAIZ, '_bitacoras', 'e01_drift_catalogo_2026-08-11', 'sitport_consultaRestricciones.json');

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

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  const CAPA_HOY = declCapa.capa_jurisdicciones;
  const CAPA_NUEVA = capaDeMedicion();
  const join = cargarJoin();

  const crudo = JSON.parse(fs.readFileSync(CAPTURA, 'utf8'));
  const restricciones = (Array.isArray(crudo) ? crudo : crudo.recordset || crudo.recordsets[0])
    .map(r => ({ bahia: Number(r.bahia), nombre: r.GLBahia || null, tipo: r.tiporestriccion || r.tipo || null }));

  console.log('='.repeat(78));
  console.log('E2 — VOLUMEN DEL CAMBIO DE UNIDAD: BAHÍA → CAPITANÍA');
  console.log(`fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(78));
  console.log(`unidad de hoy    : bahía, sobre '${CAPA_HOY}' (la que el motor consulta)`);
  console.log(`unidad propuesta : Capitanía, sobre '${CAPA_NUEVA}' (el andamio de E1)`);
  console.log(`join bahía→Capitanía: E0.3, ${join.conteo.resueltas} resueltas y ${join.conteo.sin_resolver} sin resolver`);
  console.log(`restricciones    : captura versionada de E0.1, ${restricciones.length} registros`);
  console.log('');
  console.log('LA EXPOSICIÓN QUE ESTE NÚMERO ARRASTRA, DECLARADA JUNTO AL NÚMERO:');
  console.log(`  · 32,1 % de los km medidos caen en alguna de las ${declCapa.andamio.deuda_regenerar_desde_v2.jurisdicciones_que_difieren.length} jurisdicciones que`);
  console.log('    difieren entre v1 y v2 (deuda declarada; regenerar quedó fuera por decisión');
  console.log('    del owner). No se afirma en qué dirección movería el número.');
  console.log('  · 10,5 % de los km caen en zona de traslape del andamio: ahí la capa atribuye');
  console.log('    DOS jurisdicciones y la unidad nueva cuenta de más por construcción.');

  warmup('AUSTRAL_N');
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

  const SQL_BAHIAS = `SELECT bahia_id FROM "${CAPA_HOY}" WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1),4326))`;
  const SQL_JURS = `SELECT id FROM "${CAPA_NUEVA}" WHERE geom IS NOT NULL AND ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1),4326))`;

  let totHoy = 0, totNueva = 0, totNoAtribuibles = 0;
  const filas = [];

  for (const [nombre, a, b] of RUTAS) {
    const r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b]);
    if (!r.ok) { console.log(`\n${nombre}: RUTEO FALLIDO ${r.error}`); continue; }
    const wps = r.tramos.filter(t => t.tipo !== 'aproximacion_final')
      .flatMap(t => t.coords).map(c => ({ lat: c[1], lng: c[0] }));
    const gj = JSON.stringify({ type: 'LineString', coordinates: wps.map(w => [w.lng, w.lat]) });

    const bahias = new Set((await pool.query(SQL_BAHIAS, [gj])).rows.map(x => Number(x.bahia_id)));
    const jurs = new Set((await pool.query(SQL_JURS, [gj])).rows.map(x => x.id));

    const hoy = restricciones.filter(x => bahias.has(x.bahia));
    const nueva = [], noAtribuibles = [];
    for (const x of restricciones) {
      const e = join.resueltas.get(x.bahia);
      if (!e) { if (bahias.has(x.bahia) || jurs.size) noAtribuibles.push(x); continue; }
      if (e.jurisdicciones.some(j => jurs.has(j))) nueva.push(x);
    }
    const soloNueva = nueva.filter(x => !bahias.has(x.bahia));
    const soloHoy = hoy.filter(x => { const e = join.resueltas.get(x.bahia); return !e || !e.jurisdicciones.some(j => jurs.has(j)); });

    totHoy += hoy.length; totNueva += nueva.length;
    filas.push({ nombre, bahias: bahias.size, jurs: jurs.size, hoy: hoy.length, nueva: nueva.length, soloNueva, soloHoy });

    console.log('');
    console.log(`${nombre}`);
    console.log(`   la ruta matchea  : ${bahias.size} bahías (hoy) · ${jurs.size} jurisdicciones (unidad nueva)`);
    console.log(`   restricciones    : ${hoy.length} hoy  →  ${nueva.length} con unidad Capitanía   (${nueva.length - hoy.length >= 0 ? '+' : ''}${nueva.length - hoy.length})`);
    if (soloNueva.length) console.log(`   aparecen         : ${soloNueva.map(x => `${x.bahia} ${x.nombre || ''}`.trim()).join(' · ')}`);
    if (soloHoy.length)   console.log(`   desaparecen      : ${soloHoy.map(x => `${x.bahia} ${x.nombre || ''}`.trim()).join(' · ')}`);
  }

  console.log('');
  console.log('─'.repeat(78));
  console.log('TOTAL SOBRE LAS OCHO RUTAS');
  console.log('─'.repeat(78));
  console.log(`  restricciones mostradas HOY (unidad bahía)      : ${totHoy}`);
  console.log(`  restricciones mostradas con unidad Capitanía    : ${totNueva}`);
  const delta = totNueva - totHoy;
  console.log(`  cambio                                          : ${delta >= 0 ? '+' : ''}${delta}` +
    (totHoy > 0 ? `  (${(100 * delta / totHoy).toFixed(0)} %)` : '  (sin base para porcentaje)'));

  const apareceTotal = filas.reduce((a, f) => a + f.soloNueva.length, 0);
  const desapareceTotal = filas.reduce((a, f) => a + f.soloHoy.length, 0);
  console.log(`  restricciones que APARECEN                      : ${apareceTotal}`);
  console.log(`  restricciones que DESAPARECEN                   : ${desapareceTotal}`);
  console.log('');
  // ── POR QUÉ DESAPARECE CADA UNA. El neto no se reporta solo ────────────────
  // Un signo negativo puede venir de tres causas distintas y sólo una de ellas
  // es el cambio de unidad. Mezclarlas daría un número que decide mal.
  const sinGeom = new Set((await pool.query(
    `SELECT id FROM "${CAPA_NUEVA}" WHERE geom IS NULL`)).rows.map(r => r.id));
  const causas = { sin_geometria: [], join_sin_resolver: [], cambio_de_unidad: [] };
  for (const f of filas) {
    for (const x of f.soloHoy) {
      const e = join.resueltas.get(x.bahia);
      if (!e) causas.join_sin_resolver.push({ ruta: f.nombre, ...x });
      else if (e.jurisdicciones.every(j => sinGeom.has(j))) causas.sin_geometria.push({ ruta: f.nombre, ...x, jur: e.jurisdicciones.join('+') });
      else causas.cambio_de_unidad.push({ ruta: f.nombre, ...x, jur: e.jurisdicciones.join('+') });
    }
  }
  console.log('');
  console.log('  POR QUÉ DESAPARECE CADA UNA — tres causas, y sólo una es el cambio de unidad:');
  console.log(`    ${String(causas.sin_geometria.length).padStart(3)}  su Capitanía NO TIENE GEOMETRÍA en el andamio`);
  console.log(`         (${[...new Set(causas.sin_geometria.map(c => c.jur))].join(', ') || '—'})`);
  console.log(`    ${String(causas.join_sin_resolver.length).padStart(3)}  su bahía es una de las 6 que el join de E0.3 dejó SIN RESOLVER`);
  console.log(`         (${[...new Set(causas.join_sin_resolver.map(c => c.bahia))].join(', ') || '—'})`);
  console.log(`    ${String(causas.cambio_de_unidad.length).padStart(3)}  el CAMBIO DE UNIDAD las deja fuera`);
  console.log('');
  console.log('  Las dos primeras causas NO son efectos del cambio de unidad: son huecos del');
  console.log('  andamio y pendientes de E0.3. Una jurisdicción sin geometría YA tiene su');
  console.log('  aviso por INV-3.6 —R1 pieza 1 la declara— así que el patrón no se queda sin');
  console.log('  saber; pero esas restricciones no se le listan, y eso hay que decirlo.');
  console.log('');
  const netoReal = apareceTotal - causas.cambio_de_unidad.length;
  console.log(`  DESCONTANDO LAS DOS CAUSAS QUE NO SON DEL CAMBIO DE UNIDAD, el neto es ${netoReal >= 0 ? '+' : ''}${netoReal}`);
  console.log('  (aparecen ' + apareceTotal + ', desaparecen ' + causas.cambio_de_unidad.length + '). El signo del neto DEPENDE de cómo se');
  console.log('  traten los huecos del andamio: con la capa como está da ' + (delta >= 0 ? '+' : '') + delta + ', descontándolos da ' + (netoReal >= 0 ? '+' : '') + netoReal + '.');
  console.log('  Un número cuyo SIGNO cambia según eso no alcanza para decidir por orden de');
  console.log('  magnitud, y así se reporta.');

  console.log('  Una que DESAPARECE es lo grave: hoy se muestra y con la unidad nueva no.');
  console.log('  Una que APARECE es lo que INV-3.4 manda — la bahía etiqueta, la Capitanía');
  console.log('  decide — y es de más, nunca de menos (INV-1.2).');

  await pool.end();
  console.log('');
  console.log('='.repeat(78));
  console.log('FIN — medición, no construcción. No se modificó nada.');
  console.log('='.repeat(78));
})().catch(e => { console.error('ABORTADO: ' + e.message); process.exit(1); });
