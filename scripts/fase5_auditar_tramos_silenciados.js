#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// fase5_auditar_tramos_silenciados.js
//
// PREGUNTA QUE RESPONDE, y que decide si el camino C se sostiene:
//   de los tramos que el criterio SILENCIA, ¿las aguas de ese tramo pertenecen a
//   la misma jurisdiccion que la ruta ya resolvio y ya muestra, o a otra?
//
// El fundamento del camino C dice "ahi no hay ceguera porque la jurisdiccion que
// opera esas aguas ya esta en la lista de la ruta". Eso es una afirmacion sobre
// identidad de jurisdiccion. Lo que hay que probar es lo otro: que la restriccion
// de esas aguas efectivamente le llega al patron. Si el dueño de esas aguas NO
// esta entre las bahias que la ruta matcheo, entonces su restriccion no se lista,
// y el silenciamiento seria un falso negativo con otro nombre.
//
// COMO SE PREGUNTA "de quien son esas aguas" en la capa vigente: la celda que las
// contiene fue borrada por el recorte de tierra, asi que no se puede preguntar a
// la capa. Se reconstruye el teselado ANTES del recorte, con la misma figura que
// la vista materializada construye (mismo bbox, mismos puntos), y se pregunta a
// ese. El bbox no se copia: se lee de la definicion de la propia vista.
//
// LA PRUEBA DE VERDAD ES ESTRUCTURAL, no la foto de SITPORT de hoy: las
// restricciones cambian por hora. Que una bahia no tenga restriccion activa en
// este momento no prueba nada; que su bahia dueña este o no en el conjunto
// matcheado, si. La consulta a SITPORT va igual, como ilustracion.
//
// Uso:  node scripts/fase5_auditar_tramos_silenciados.js
// Sale 1 si aparece al menos un tramo silenciado cuyas aguas pertenecen a una
// bahia que la ruta NO matcheo. Ese es el caso que rompe el fundamento.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { Pool } = require('pg');
const { warmup, calcularRuta } = require('../src/services/raster-router-service');
const { construirPerfilCosto } = require('../src/config/perfiles-costo');
const { medirCoberturaRuta, capaJurisdiccionesVigente } = require('../src/services/cobertura-jurisdiccional');
const { getCapitaniaByBahiaId } = require('../src/utils/capitanias');
const sitportService = require('../src/services/sitport-service');

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
  ['Anahuac -> Melinka',             'ANAHUAC',      'MELINKA'],
  ['Anahuac -> Quellon',             'ANAHUAC',      'QUELLON'],
  ['Anahuac -> Chacabuco',           'ANAHUAC',      'CHACABUCO'],
  ['Ancud -> Castro (mar interior)', 'ANCUD',        'CASTRO'],
  ['Chonchi -> Chaiten (Corcovado)', 'CHONCHI',      'CHAITEN'],
  ['Arica -> Iquique (norte)',       'ARICA',        'IQUIQUE'],
  ['Valparaiso -> San Antonio',      'VALPARAISO',   'SAN_ANTONIO'],
  ['Punta Arenas -> Pto Williams',   'PUNTA_ARENAS', 'PTO_WILLIAMS'],
];

// El bbox y el radio salen de la definicion de la capa, no de una copia.
async function parametrosDeLaCapa(pool, capa) {
  const { rows } = await pool.query(
    `SELECT pg_get_viewdef(c.oid, true) AS def
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname=$1`, [capa]);
  if (!rows.length) throw new Error(`no se pudo leer la definicion de '${capa}'`);
  const def = rows[0].def;
  // PostgreSQL guarda la definicion reescrita: los literales quedan como
  // '-82'::integer::double precision. Se acepta esa forma tambien.
  const num = String.raw`'?(-?[\d.]+)'?(?:::[a-z ]+)*`;
  const env = new RegExp(
    `ST_MakeEnvelope\\(\\s*${num},\\s*${num},\\s*${num},\\s*${num}`, 'i').exec(def);
  const rad = /ST_Buffer\([^)]*?::geography,\s*([\d.]+)/i.exec(def)
           || /buffer_distancia_m[\s\S]{0,80}?([0-9]{3,})/i.exec(def);
  if (!env) throw new Error(`la capa '${capa}' no declara un bbox legible; no se reconstruye el teselado a ciegas`);
  if (!rad) throw new Error(`la capa '${capa}' no declara un radio de alcance legible`);
  return { bbox: env.slice(1, 5).map(Number), radio_m: Number(rad[1]) };
}

// Teselado ANTES del recorte de tierra: de quien serian esas aguas si la costa
// gruesa no las hubiera borrado.
const SQL_DUENO = `
WITH bbox AS (SELECT ST_MakeEnvelope($2,$3,$4,$5,4326) AS g),
     tramo AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) AS g),
     puntos AS (SELECT ST_Collect(geom) AS g FROM bahias_sitport),
     vor AS (SELECT (ST_Dump(ST_VoronoiPolygons(p.g, 0::float, b.g))).geom AS g
               FROM puntos p, bbox b),
     asignado AS (SELECT s.bahia_id, s.nombre, s.geom AS punto, v.g
                    FROM vor v JOIN bahias_sitport s ON ST_Contains(v.g, s.geom))
SELECT a.bahia_id, a.nombre,
       ST_Length(ST_Intersection(t.g, a.g)::geography)/1000.0 AS km_en_esta_celda,
       ST_Distance(a.punto::geography, t.g::geography)        AS dist_al_punto_m
  FROM asignado a, tramo t
 WHERE ST_Intersects(a.g, t.g)
 ORDER BY km_en_esta_celda DESC;
`;

// Segunda opinion: la capa del decreto que hay en la base. Esta marcada como
// SUPERSEDIDA Y DESACTUALIZADA; se consulta como contraste, no como verdad.
const SQL_DECRETO = `
SELECT id, nombre, gobernacion
  FROM jurisdicciones_decreto
 WHERE geom IS NOT NULL
   AND ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1),4326));
`;

const linea = (a, b) => JSON.stringify({
  type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]],
});

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const capa = await capaJurisdiccionesVigente(pool);
  const { bbox, radio_m } = await parametrosDeLaCapa(pool, capa);

  console.log('================================================================');
  console.log('AUDITORIA DE LOS TRAMOS QUE EL CRITERIO SILENCIA');
  console.log('================================================================');
  console.log(`fecha  : ${new Date().toISOString()}`);
  console.log(`capa   : ${capa}   bbox ${bbox.join(' ')}   alcance ${radio_m} m`);
  console.log(`segunda opinion: jurisdicciones_decreto (SUPERSEDIDA Y DESACTUALIZADA — contraste, no verdad)`);
  console.log(`la capa del D.S. 991 vigente NO existe todavia: C3 no pasa. Esa mitad de la`);
  console.log(`pregunta del owner no se puede responder hoy y se dice, no se rellena.`);
  console.log('');

  let restricciones = [];
  let sitportOk = true;
  try {
    const todas = await sitportService.consultaRestricciones();
    restricciones = todas.filter(r => r.tipo && r.tipo.trim() === 'TODOS');
    console.log(`SITPORT: ${restricciones.length} restriccion(es) de tipo TODOS activas ahora`);
  } catch (e) {
    sitportOk = false;
    console.log(`SITPORT NO RESPONDE (${e.message}). La columna de restriccion activa queda sin dato;`);
    console.log(`la prueba estructural, que es la que decide, se hace igual.`);
  }
  const conRestriccion = new Set(restricciones.map(r => r.bahia));

  warmup('AUSTRAL_N');
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

  let nSilenciados = 0, nRompen = 0, nRompenConRestriccion = 0;
  const rompen = [];

  for (const [nombre, a, b] of RUTAS) {
    const r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b], {});
    if (!r || !r.ok) { console.log(`\n---- ${nombre}: ruteo no ok, se omite`); continue; }
    const wps = r.tramos
      .filter(t => t.tipo !== 'aproximacion_final' && (t.coords || []).length >= 2)
      .flatMap(t => t.coords).map(([lng, lat]) => ({ lat, lng }));
    if (wps.length < 2) continue;

    // El mismo conjunto matcheado que arma el endpoint.
    const { rows: matchRows } = await pool.query(
      `SELECT bahia_id FROM "${capa}"
        WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1),4326))`,
      [JSON.stringify({ type: 'LineString', coordinates: wps.map(w => [w.lng, w.lat]) })]);
    const matcheadas = new Set(matchRows.map(x => x.bahia_id));

    const med = await medirCoberturaRuta(pool, wps);
    const silenciados = med.piezas.filter(p => p.clasificacion === 'defecto_recorte');

    console.log('');
    console.log(`---- ${nombre} ----`);
    console.log(`  bahias matcheadas por la ruta: ${[...matcheadas].sort((x, y) => x - y).join(', ') || '(ninguna)'}`);
    console.log(`  tramos silenciados: ${silenciados.length}`);

    for (const p of silenciados) {
      nSilenciados++;
      const geo = linea({ lat: p.lat_ini, lon: p.lon_ini }, { lat: p.lat_fin, lon: p.lon_fin });
      const { rows: duenos } = await pool.query(SQL_DUENO, [geo, ...bbox]);
      const { rows: dec } = await pool.query(SQL_DECRETO, [geo]);

      console.log(`   · tramo ${p.largo_km.toFixed(4)} km  ${p.lat_ini.toFixed(5)},${p.lon_ini.toFixed(5)} -> ${p.lat_fin.toFixed(5)},${p.lon_fin.toFixed(5)}`);
      for (const d of duenos) {
        const enMatch = matcheadas.has(d.bahia_id);
        const cap = getCapitaniaByBahiaId(d.bahia_id);
        const tieneRestr = conRestriccion.has(d.bahia_id);
        const dentroAlcance = Number(d.dist_al_punto_m) <= radio_m;
        console.log(`       aguas de bahia ${String(d.bahia_id).padStart(3)} ${String(d.nombre).slice(0, 34).padEnd(34)} ` +
          `${Number(d.km_en_esta_celda).toFixed(3)} km  Capitania=${cap.capitania}`);
        console.log(`         ¿la ruta ya matcheo esa bahia? ${enMatch ? 'SI' : 'NO  <-- ROMPE EL FUNDAMENTO'}` +
          `   | dentro del alcance de ${radio_m} m: ${dentroAlcance ? 'si' : 'no'}` +
          `   | restriccion activa ahora: ${sitportOk ? (tieneRestr ? 'SI' : 'no') : 'sin dato'}`);
        if (!enMatch) {
          nRompen++;
          if (tieneRestr) nRompenConRestriccion++;
          rompen.push({ ruta: nombre, tramo_km: p.largo_km, bahia_id: d.bahia_id, bahia: d.nombre,
                        capitania: cap.capitania, con_restriccion: tieneRestr });
        }
      }
      console.log(`       segunda opinion (capa del decreto, superseida): ` +
        (dec.length ? dec.map(x => x.nombre).join(', ') : '(ninguna jurisdiccion la cubre)'));
    }
  }

  console.log('');
  console.log('================================================================');
  console.log('RESULTADO');
  console.log('================================================================');
  console.log(`  tramos silenciados auditados                              : ${nSilenciados}`);
  console.log(`  dueños de agua que la ruta NO habia matcheado             : ${nRompen}`);
  console.log(`  de esos, con restriccion SITPORT activa en este momento   : ${sitportOk ? nRompenConRestriccion : 'sin dato'}`);
  console.log('');
  if (nRompen === 0) {
    console.log('  El fundamento se sostiene en la muestra medida: en todos los tramos');
    console.log('  silenciados, las aguas pertenecen a bahias que la ruta ya matcheo, y por');
    console.log('  lo tanto sus restricciones ya se listan. No hay restriccion que el patron');
    console.log('  deje de ver por el silenciamiento.');
    await pool.end();
    process.exit(0);
  }
  console.log('  EL FUNDAMENTO NO SE SOSTIENE TAL COMO ESTA ESCRITO. Casos:');
  for (const x of rompen) {
    console.log(`    ${x.ruta} | tramo ${x.tramo_km.toFixed(3)} km | bahia ${x.bahia_id} ${x.bahia} ` +
      `| Capitania ${x.capitania} | restriccion activa ahora: ${x.con_restriccion ? 'SI' : 'no'}`);
  }
  console.log('');
  console.log('  Ojo con leer la columna de restriccion activa como si decidiera: las');
  console.log('  restricciones de SITPORT cambian por hora. Un "no" de hoy no prueba que el');
  console.log('  tramo sea seguro de silenciar; prueba solo que hoy no hay nada publicado.');
  await pool.end();
  process.exit(1);
})().catch(e => { console.error('FALLA:', e.message); process.exit(2); });
