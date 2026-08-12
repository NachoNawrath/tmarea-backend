#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e2_cobertura_andamio.js — E2, primera sub-etapa: la cobertura del andamio
// sobre RUTAS REALES. Es lo que E1 dejó explícitamente sin contestar.
//
// LA PREGUNTA: de los kilómetros que un patrón navega de verdad, ¿cuántos
// resuelven a UNA jurisdicción de Capitanía, cuántos caen en NINGUNA, y cuántos
// caen en MÁS DE UNA? Lo último no es un detalle: un tramo que cae en dos
// jurisdicciones le mostraría al patrón las restricciones de las dos.
//
// SOBRE RUTAS, NO SOBRE PUNTOS DE BAHÍA. Los puntos de bahía son puntos de
// ORILLA —35 de 43 testigos caen en tierra, medido en fase5E/F/G— y juzgar una
// capa por ellos es un error que este repositorio ya pagó dos veces. Acá se mide
// sobre la geometría que produce el motor de ruteo.
//
// LA CAPA SE PIDE POR `capaDeMedicion()`, que es el contrato que E1 dejó: este
// script ES un contexto de medición porque llama a esa función, y ningún proceso
// de producción la tiene cableada.
//
// Uso:  node scripts/e2_cobertura_andamio.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { Pool } = require('pg');
const { warmup, calcularRuta } = require('../src/services/raster-router-service');
const { construirPerfilCosto } = require('../src/config/perfiles-costo');
const { capaDeMedicion } = require('../src/services/andamio-medicion');
const declCapa = require('../data/decreto/capa_consultada.json');

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

// Las mismas ocho rutas del arnés de E0.2, para que los números de esta etapa se
// puedan poner al lado de los de aquella sin traducir nada.
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

// CÓMO SE MIDE, Y POR QUÉ NO POR TRAMOS.
// La primera versión de este script partía la ruta en segmentos y contaba en
// cuántas jurisdicciones caía cada uno. Eso NO mide traslape: un tramo que
// simplemente CRUZA un límite toca dos jurisdicciones sin que haya ninguna
// superposición, y el número salía inflado. Es la misma forma de error que el §2
// de CLAUDE.md persigue — medir algo parecido a lo que se afirma.
//
// Acá se mide la geometría de verdad: se corta la ruta contra la UNIÓN de las
// jurisdicciones (los km cubiertos) y contra la unión de las INTERSECCIONES DE
// PARES (los km realmente ambiguos, donde dos figuras se pisan). Un cruce de
// frontera no aporta a lo segundo porque la frontera no tiene área.
//
// En metros sobre geografía, no preguntándole a un predicado: apoyarse en
// ST_CoveredBy ya dio falso en 26 de 36 trozos cuya longitud fuera del corte era
// de nanómetros (trampa pagada, fase5J).
const SQL = capa => `
WITH ruta AS (
  SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g
), cubierta AS (
  SELECT ST_Union(j.geom) AS g FROM ${capa} j WHERE j.geom IS NOT NULL
), traslape AS (
  SELECT COALESCE(ST_Union(ST_Intersection(a.geom, b.geom)), ST_GeomFromText('POLYGON EMPTY', 4326)) AS g
    FROM ${capa} a JOIN ${capa} b ON a.id < b.id
   WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL AND ST_Intersects(a.geom, b.geom)
)
SELECT ST_Length((SELECT g FROM ruta)::geography) AS total_m,
       ST_Length(ST_Intersection((SELECT g FROM ruta), (SELECT g FROM cubierta))::geography) AS cubierto_m,
       ST_Length(ST_Intersection((SELECT g FROM ruta), (SELECT g FROM traslape))::geography) AS ambiguo_m`;

// Con qué jurisdicciones es ambiguo cada tramo. Se pregunta aparte y sólo sobre
// la parte de la ruta que ya se sabe ambigua, para no volver a confundir cruce
// con traslape.
const SQL_PARES = capa => `
WITH ruta AS (
  SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g
)
SELECT a.id AS a, b.id AS b,
       ST_Length(ST_Intersection((SELECT g FROM ruta), ST_Intersection(a.geom, b.geom))::geography) AS metros
  FROM ${capa} a JOIN ${capa} b ON a.id < b.id
 WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL
   AND ST_Intersects(a.geom, b.geom)
   AND ST_Intersects((SELECT g FROM ruta), ST_Intersection(a.geom, b.geom))
 ORDER BY 3 DESC`;

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });

  // E1: el contexto de medición se demuestra llamando a esto.
  const CAPA = capaDeMedicion();
  const A = declCapa.andamio;

  console.log('='.repeat(78));
  console.log('E2 — COBERTURA DEL ANDAMIO SOBRE RUTAS REALES');
  console.log(`fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(78));
  console.log(`capa medida: ${CAPA} (obtenida por capaDeMedicion(), el contrato de E1)`);
  console.log('');
  console.log('LO QUE HAY QUE SABER PARA LEER ESTOS NÚMEROS — leído del propio dato,');
  console.log('data/decreto/capa_consultada.json → andamio:');
  for (const m of A.no_se_promueve_porque) {
    for (const linea of m.match(/.{1,72}(\s|$)/g)) console.log(`  · ${linea.trim()}`);
  }
  console.log(`  · Deuda declarada: ${A.deuda_regenerar_desde_v2.jurisdicciones_que_difieren.length} jurisdicciones difieren entre v1 y v2 —`);
  console.log(`    ${A.deuda_regenerar_desde_v2.jurisdicciones_que_difieren.join(', ')}—`);
  console.log(`    y ${A.deuda_regenerar_desde_v2.por_que_importa.replace(/\s+/g, ' ')}`);

  warmup('AUSTRAL_N');
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

  const totales = { ninguna: 0, una: 0, varias: 0 };
  const paresVistos = new Map();
  const filas = [];

  for (const [nombre, a, b] of RUTAS) {
    const r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b]);
    if (!r.ok) { console.log(`\n${nombre}: RUTEO FALLIDO ${r.error}`); continue; }
    // Los mismos waypoints que el backend recibe: la PWA descarta los tramos de
    // aproximación final antes de llamar, y medirlos infla el resultado con
    // metros de muelle (trampa pagada, useVoyageVerification.js:849).
    const wps = r.tramos.filter(t => t.tipo !== 'aproximacion_final')
      .flatMap(t => t.coords).map(c => ({ lat: c[1], lng: c[0] }));
    const geojson = JSON.stringify({ type: 'LineString', coordinates: wps.map(w => [w.lng, w.lat]) });
    const { rows: [m] } = await pool.query(SQL(CAPA), [geojson]);
    const total = Number(m.total_m);
    const cubierto = Number(m.cubierto_m);
    const ambiguo = Number(m.ambiguo_m);
    const ninguna = total - cubierto;
    const una = cubierto - ambiguo;

    const { rows: pares } = await pool.query(SQL_PARES(CAPA), [geojson]);
    for (const pr of pares) {
      const clave = `${pr.a} + ${pr.b}`;
      paresVistos.set(clave, (paresVistos.get(clave) || 0) + Number(pr.metros));
    }

    totales.ninguna += ninguna; totales.una += una; totales.varias += ambiguo;
    filas.push({ nombre, total, ninguna, una, varias: ambiguo });

    console.log('');
    console.log(`${nombre}  ·  ${(total / 1000).toFixed(2)} km  ·  ${wps.length} waypoints`);
    console.log(`   resuelven a UNA jurisdicción : ${(una / 1000).toFixed(2)} km  (${(100 * una / total).toFixed(1)}%)`);
    console.log(`   caen en NINGUNA              : ${(ninguna / 1000).toFixed(2)} km  (${(100 * ninguna / total).toFixed(1)}%)`);
    console.log(`   caen en zona de TRASLAPE     : ${(ambiguo / 1000).toFixed(2)} km  (${(100 * ambiguo / total).toFixed(1)}%)`);
  }

  const T = totales.ninguna + totales.una + totales.varias;
  console.log('');
  console.log('─'.repeat(78));
  console.log('TOTAL SOBRE LAS OCHO RUTAS');
  console.log('─'.repeat(78));
  console.log(`  kilómetros medidos            : ${(T / 1000).toFixed(2)} km`);
  console.log(`  resuelven a UNA jurisdicción  : ${(totales.una / 1000).toFixed(2)} km  (${(100 * totales.una / T).toFixed(1)}%)`);
  console.log(`  caen en NINGUNA               : ${(totales.ninguna / 1000).toFixed(2)} km  (${(100 * totales.ninguna / T).toFixed(1)}%)`);
  console.log(`  caen en zona de TRASLAPE      : ${(totales.varias / 1000).toFixed(2)} km  (${(100 * totales.varias / T).toFixed(1)}%)`);

  if (paresVistos.size) {
    console.log('');
    console.log('  Dónde caen los kilómetros ambiguos, y entre qué par de jurisdicciones:');
    for (const [par, m] of [...paresVistos].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${(m / 1000).toFixed(2)} km  ${par}`);
    }
    console.log('');
    console.log('  Estos kilómetros son los que el traslape declarado produce SOBRE RUTA. El');
    console.log('  dato declara 60 pares y 44.875,6 km² de traslape en toda la capa; lo de');
    console.log('  arriba es cuánto de eso toca de verdad a una ruta real, que es otra cosa');
    console.log('  y es la que importa para lo que el patrón ve.');
  }

  // ── Cuánto de esto se apoya en la parte desactualizada de la capa ─────────
  // El owner pidió que la medición lea y DECLARE la deuda, no que la mencione.
  // Los km que caen en una de las 11 jurisdicciones que difieren entre v1 y v2
  // son los que una regeneración podría mover.
  const ONCE = A.deuda_regenerar_desde_v2.jurisdicciones_que_difieren;
  let kmEnLas11 = 0;
  for (const [nombre, a, b] of RUTAS) {
    const r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b]);
    if (!r.ok) continue;
    const wps = r.tramos.filter(t => t.tipo !== 'aproximacion_final')
      .flatMap(t => t.coords).map(c => ({ lat: c[1], lng: c[0] }));
    const gj = JSON.stringify({ type: 'LineString', coordinates: wps.map(w => [w.lng, w.lat]) });
    const { rows: [x] } = await pool.query(`
      WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) AS g),
           once AS (SELECT ST_Union(geom) AS g FROM ${CAPA} WHERE id = ANY($2) AND geom IS NOT NULL)
      SELECT COALESCE(ST_Length(ST_Intersection((SELECT g FROM ruta),(SELECT g FROM once))::geography),0) AS m`,
      [gj, ONCE]);
    kmEnLas11 += Number(x.m);
  }
  console.log('');
  console.log('  CUÁNTO DE ESTO SE APOYA EN LA PARTE DESACTUALIZADA DE LA CAPA');
  console.log(`    km que caen en alguna de las ${ONCE.length} jurisdicciones que difieren entre v1 y v2:`);
  console.log(`      ${(kmEnLas11 / 1000).toFixed(2)} km de ${(T / 1000).toFixed(2)} (${(100 * kmEnLas11 / T).toFixed(1)}% del total medido)`);
  console.log('    Son los kilómetros que una regeneración desde v2 podría mover. No se');
  console.log('    afirma en qué dirección ni cuánto: eso exige regenerar y volver a medir.');

  await pool.end();
  console.log('');
  console.log('='.repeat(78));
  console.log('FIN — medición, no construcción. No se modificó nada.');
  console.log('='.repeat(78));
})().catch(e => { console.error('ABORTADO: ' + e.message); process.exit(1); });
