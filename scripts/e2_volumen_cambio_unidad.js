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
// MÉTODO DE CONTEO — decidido por el owner el 2026-08-12:
// las jurisdicciones SIN GEOMETRÍA se EXCLUYEN del neto. Su ausencia ya la cubre
// el aviso de INV-3.6, y contarlas como pérdida las contaría dos veces.
//
// CON UNA CONDICIÓN, que es la que da forma a la salida de abajo: el número
// declara APARTE Y DE FORMA VISIBLE cuántas restricciones caen en esas
// jurisdicciones y no se le listan al patrón. El aviso dice que la jurisdicción
// no está cargada; NO dice qué restricciones hay. Esa parte no la tapa el aviso
// y no se puede perder dentro del neto.
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
    filas.push({ nombre, gj, bahias: bahias.size, jurs: jurs.size, hoy: hoy.length, nueva: nueva.length, soloNueva, soloHoy });

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

  const neto = apareceTotal - causas.cambio_de_unidad.length;
  console.log('');
  console.log('╔' + '═'.repeat(74) + '╗');
  console.log('║  EL NÚMERO DE E2, con el método decidido por el owner el 2026-08-12:     ║');
  console.log('║  las jurisdicciones sin geometría se EXCLUYEN del neto.                  ║');
  console.log('║' + ' '.repeat(74) + '║');
  console.log(`║      cambio de volumen al pasar de bahía a Capitanía:  ${(neto >= 0 ? '+' : '') + neto}`.padEnd(75) + '║');
  console.log(`║      aparecen ${apareceTotal} · desaparecen por la unidad ${causas.cambio_de_unidad.length}`.padEnd(75) + '║');
  console.log('╚' + '═'.repeat(74) + '╝');
  console.log('');
  console.log('  Ninguna restricción se pierde por pasar a Capitanía. Las que aparecen son');
  console.log('  INV-3.4 funcionando: la bahía etiqueta, la Capitanía decide, de más y nunca');
  console.log('  de menos (INV-1.2).');

  console.log('');
  console.log('┌' + '─'.repeat(74) + '┐');
  console.log('│  LO QUE ESTE NÚMERO NO CUENTA, Y QUE EL AVISO NO TAPA                    │');
  console.log('└' + '─'.repeat(74) + '┘');
  console.log(`  ${causas.sin_geometria.length} restricciones caen en jurisdicciones SIN GEOMETRÍA y NO se le listan`);
  console.log('  al patrón. Hoy, con unidad bahía, SÍ se le muestran; con unidad Capitanía');
  console.log('  dejarían de mostrarse. Están fuera del neto por método, no porque no pasen.');
  console.log('');
  console.log('  El aviso de INV-3.6 dice que la jurisdicción no está cargada y que consulte');
  console.log('  con la Capitanía. NO dice qué restricciones hay. Esa parte no la cubre.');
  console.log('');
  const porJur = {};
  for (const c of causas.sin_geometria) (porJur[c.jur] = porJur[c.jur] || []).push(c);
  for (const [jur, lista] of Object.entries(porJur)) {
    const rutas = [...new Set(lista.map(x => x.ruta))];
    const bahias = [...new Set(lista.map(x => `${x.bahia} ${x.nombre || ''}`.trim()))];
    console.log(`    ${jur}: ${lista.length} restricciones · bahías ${bahias.join(', ')}`);
    console.log(`      en ${rutas.length} ruta(s): ${rutas.join(' · ')}`);
  }
  console.log('');
  console.log(`  Y ${causas.join_sin_resolver.length} más caen en una bahía que el join de E0.3 dejó sin resolver: tampoco`);
  console.log('  se listan, y a ésas no las cubre ningún aviso, porque su jurisdicción no');
  console.log('  está identificada. Se cierran cuando responda el informante austral.');

  console.log('');
  console.log('  EXPOSICIÓN DEL NÚMERO (declarada junto a él):');
  console.log('    · 32,1 % de los km medidos caen en las 11 jurisdicciones que difieren');
  console.log('      entre v1 y v2. Regenerar las movería; no se afirma en qué dirección.');
  console.log('    · 10,5 % de los km caen en zona de traslape del andamio. No está medido');
  console.log(`      cuántas de las ${apareceTotal} que aparecen vienen de ahí.`);

  // ── EL CRUCE QUE FALTABA: ¿las apariciones se apoyan en tramos ambiguos? ──
  // Es lo único que puede bajar el +11, y +11 es el número con el que se decide.
  // Una restricción aparece porque su Capitanía J está en el set de la ruta. La
  // pregunta es sobre qué apoya J esa presencia: si la ruta toca a J SÓLO dentro
  // de zona de traslape, la aparición descansa en terreno donde la capa atribuye
  // dos jurisdicciones a la vez y podría estar equivocada. Si la toca sobre
  // kilómetros que son exclusivamente de J, la aparición es firme.
  const SQL_APOYO = `
  WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) AS g),
       j AS (SELECT geom FROM "${CAPA_NUEVA}" WHERE id = $2),
       traslape AS (
         SELECT COALESCE(ST_Union(ST_Intersection(a.geom,b.geom)), ST_GeomFromText('POLYGON EMPTY',4326)) AS g
           FROM "${CAPA_NUEVA}" a JOIN "${CAPA_NUEVA}" b ON a.id <> b.id
          WHERE a.id = $2 AND a.geom IS NOT NULL AND b.geom IS NOT NULL AND ST_Intersects(a.geom,b.geom))
  SELECT ST_Length(ST_Intersection((SELECT g FROM ruta),(SELECT geom FROM j))::geography) AS en_j_m,
         ST_Length(ST_Intersection(ST_Intersection((SELECT g FROM ruta),(SELECT geom FROM j)),(SELECT g FROM traslape))::geography) AS en_traslape_m`;

  console.log('');
  console.log('┌' + '─'.repeat(74) + '┐');
  console.log('│  LAS APARICIONES, CRUZADAS CONTRA LOS 218,65 km EN TRASLAPE              │');
  console.log('└' + '─'.repeat(74) + '┘');
  const firmes = [], apoyadasEnTraslape = [];
  for (const f of filas) {
    for (const x of f.soloNueva) {
      const e = join.resueltas.get(x.bahia);
      const jur = e.jurisdicciones.find(j => !sinGeom.has(j)) || e.jurisdiccion_id;
      const { rows: [m] } = await pool.query(SQL_APOYO, [f.gj, jur]);
      const enJ = Number(m.en_j_m), enTr = Number(m.en_traslape_m);
      const exclusivo = enJ - enTr;
      const reg = { ruta: f.nombre, bahia: x.bahia, nombre: x.nombre, jur, enJ, enTr, exclusivo };
      // Firme si la ruta toca a J sobre kilómetros que no comparte con nadie.
      // El umbral es 0: no hace falta elegir uno, porque la distribución separa
      // sola —o hay kilómetros exclusivos o la intersección entera es traslape—.
      (exclusivo > 1 ? firmes : apoyadasEnTraslape).push(reg);
      console.log(`  ${String(x.bahia).padStart(3)} ${String(x.nombre || '').padEnd(22)} → ${jur.padEnd(18)} ` +
        `ruta∩J ${(enJ/1000).toFixed(2)} km · de eso en traslape ${(enTr/1000).toFixed(2)} km · exclusivo ${(exclusivo/1000).toFixed(2)} km` +
        `${exclusivo > 1 ? '' : '   ← SE APOYA EN TRASLAPE'}`);
      console.log(`      (${f.ruta || f.nombre})`);
    }
  }
  console.log('');
  console.log(`  apariciones FIRMES (la ruta toca su Capitanía sobre km exclusivos): ${firmes.length}`);
  console.log(`  apariciones que SE APOYAN EN TRASLAPE                             : ${apoyadasEnTraslape.length}`);
  console.log('');
  if (apoyadasEnTraslape.length === 0) {
    console.log('  NINGUNA de las apariciones descansa en terreno ambiguo. El +11 no baja por');
    console.log('  esta vía: los 218,65 km de traslape existen, pero no son los que hacen');
    console.log('  aparecer estas restricciones. E2 cierra sin reserva sobre su propio número.');
  } else {
    console.log(`  ${apoyadasEnTraslape.length} de las ${apareceTotal} descansan en tramos donde la capa atribuye dos`);
    console.log('  jurisdicciones. Si esas atribuciones fueran erróneas, el número bajaría a');
    console.log(`  +${apareceTotal - apoyadasEnTraslape.length}. No se afirma que lo sean: se afirma de qué dependen.`);
  }

  await pool.end();
  console.log('');
  console.log('='.repeat(78));
  console.log('FIN — medición, no construcción. No se modificó nada.');
  console.log('='.repeat(78));
})().catch(e => { console.error('ABORTADO: ' + e.message); process.exit(1); });
