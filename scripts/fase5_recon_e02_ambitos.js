'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// fase5_recon_e02_ambitos.js — RECONOCIMIENTO de E0.2, no construye nada.
//
// Responde las tres preguntas que E0.2 tiene que contestar antes de proponer:
//
//   1. Que ambitos existen en el insumo del decreto, y con que estado.
//   2. Cuales de esos ambitos estan efectivamente en la base HOY, medido
//      contra la capa que el motor declara consultar.
//   3. Como se comporta el motor cuando una ruta cae en un ambito que no esta.
//      Se responde ejecutando el codigo del motor, no leyendolo.
//
// No escribe en la base. Solo lee y mide.
//
// Reproducible:  node scripts/fase5_recon_e02_ambitos.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { Pool } = require('pg');

const insumo = require('../data/decreto/jurisdicciones_v2.json');
const declCapa = require('../data/decreto/capa_consultada.json');
const { medirCoberturaRuta, componerAvisos } = require('../src/services/cobertura-jurisdiccional');
const { cargarZonasAviso } = require('../src/services/zonas-aviso');

const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});

const linea = (c = '─') => console.log(c.repeat(78));
const titulo = (t) => { console.log(''); linea('═'); console.log(t); linea('═'); };

// ─── Rutas de prueba ────────────────────────────────────────────────────────
// TODOS los extremos son coordenadas publicadas por SITPORT y presentes en
// bahias_sitport. No se inventa ninguna posicion (INV-0.2 / CLAUDE.md §3.2).
const RUTAS = [
  {
    id: 'lacustre_villarrica',
    ambito_esperado: 'lacustre',
    descripcion: 'Lago Villarrica: bahia 210 (Sector Villarrica) -> bahia 209 (Sector Pucon)',
    waypoints: [{ lat: -39.2883, lng: -72.2195 }, { lat: -39.2833, lng: -71.9667 }],
  },
  {
    id: 'antartica_fildes_chile',
    ambito_esperado: 'antartica',
    descripcion: 'Antartica: bahia 139 (Fildes) -> bahia 231 (Bahia Chile)',
    waypoints: [{ lat: -62.2, lng: -58.9667 }, { lat: -62.4667, lng: -59.6833 }],
  },
  {
    id: 'maritima_control',
    ambito_esperado: 'maritima',
    descripcion: 'CONTROL maritimo: bahia 254 (Canal Chaffers Sur) -> bahia 126 (Bahia Chacabuco)',
    waypoints: [{ lat: -43.8, lng: -73.6 }, { lat: -45.4667, lng: -72.8 }],
  },
];

// Reproduce el matching geografico del motor tal como lo hace
// sitport-routes.js:557 (bahiasEnRutaPostGIS), contra la capa DECLARADA.
async function bahiasEnRuta(waypoints) {
  const capa = declCapa.capa_jurisdicciones;
  const geo = JSON.stringify({ type: 'LineString', coordinates: waypoints.map(w => [w.lng, w.lat]) });
  const { rows } = await pool.query(
    `SELECT bahia_id FROM "${capa}" WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)) ORDER BY 1`,
    [geo]);
  return rows.map(r => r.bahia_id);
}

async function main() {
  console.log('RECONOCIMIENTO E0.2 — EL REGISTRO DE AMBITOS PUBLICADOS');
  console.log(`fecha de ejecucion: ${new Date().toISOString()}`);
  console.log(`insumo: data/decreto/jurisdicciones_v2.json v${insumo.version} generado ${insumo.generado}`);
  console.log(`capa declarada: ${declCapa.capa_jurisdicciones} (recorte: ${declCapa.capa_recorte_tierra})`);
  console.log('shell del agente: Git Bash / PowerShell (Windows). Comandos reproducibles: PowerShell.');

  // ── 1. AMBITOS EN EL INSUMO ───────────────────────────────────────────────
  titulo('1. QUE AMBITOS EXISTEN EN EL INSUMO DEL DECRETO');

  const porAmbito = new Map();
  for (const j of insumo.jurisdicciones) {
    if (!porAmbito.has(j.ambito)) porAmbito.set(j.ambito, []);
    porAmbito.get(j.ambito).push(j);
  }

  console.log('\nambito           n   participa_matching  estado_geometria');
  linea();
  for (const [amb, js] of [...porAmbito].sort()) {
    const pm = js.filter(j => j.participa_matching === true).length;
    const est = {};
    for (const j of js) est[j.estado_geometria] = (est[j.estado_geometria] || 0) + 1;
    console.log(
      `${amb.padEnd(16)} ${String(js.length).padStart(2)}   ${String(pm).padStart(2)} si / ${String(js.length - pm).padStart(2)} no    ` +
      Object.entries(est).map(([k, v]) => `${k}=${v}`).join('  '));
  }

  console.log('\nDetalle por ambito — recetas y jurisdicciones:');
  for (const [amb, js] of [...porAmbito].sort()) {
    const recetas = {};
    for (const j of js) recetas[j.receta || '(sin receta)'] = (recetas[j.receta || '(sin receta)'] || 0) + 1;
    console.log(`\n  ${amb} (${js.length}):`);
    console.log(`    recetas: ${Object.entries(recetas).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    for (const j of js) {
      console.log(`    - ${j.id.padEnd(24)} matching=${String(j.participa_matching).padEnd(5)} ` +
        `estado=${(j.estado_geometria || '-').padEnd(20)} ${j.causa_sin_geometria ? 'causa=' + j.causa_sin_geometria.slice(0, 60) : ''}`);
    }
  }

  // ── 2. QUE HAY EN LA BASE HOY ─────────────────────────────────────────────
  titulo('2. QUE AMBITOS ESTAN EFECTIVAMENTE EN LA BASE HOY');

  console.log('\n2.a — Relaciones de la base que llevan una columna "ambito":');
  linea();
  const { rows: conAmbito } = await pool.query(`
    SELECT c.relname AS relacion,
           CASE c.relkind WHEN 'r' THEN 'tabla' WHEN 'm' THEN 'matview' WHEN 'v' THEN 'vista' END AS tipo
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public' AND c.relkind IN ('r','m','v')
       AND a.attname = 'ambito' AND a.attnum > 0
     ORDER BY 1`);
  console.table(conAmbito);
  console.log(`La capa que el motor consulta es '${declCapa.capa_jurisdicciones}'.`);
  console.log(`¿Lleva columna 'ambito'?  ${conAmbito.some(r => r.relacion === declCapa.capa_jurisdicciones) ? 'SI' : 'NO'}`);

  console.log('\n2.b — Cobertura de cada ambito por la capa VIGENTE.');
  console.log('El area de referencia de cada ambito sale de jurisdicciones_decreto, que es');
  console.log('la unica relacion de la base con geometria Y ambito. Esta marcada SUPERSEDIDA:');
  console.log('sirve como referencia de DONDE cae cada ambito, no como capa correcta.');
  linea();
  await pool.query("SET statement_timeout = '600s'");
  const { rows: cob } = await pool.query(`
    WITH amb AS (
      SELECT ambito, ST_Union(geom) g FROM jurisdicciones_decreto WHERE geom IS NOT NULL GROUP BY 1),
    vig AS (
      SELECT ST_Union(geom) g FROM "${declCapa.capa_jurisdicciones}" WHERE NOT ST_IsEmpty(geom))
    SELECT a.ambito,
           round((ST_Area(a.g::geography)/1e6)::numeric, 0) AS km2_ambito,
           round((ST_Area(ST_Intersection(a.g, v.g)::geography)/1e6)::numeric, 0) AS km2_cubierto,
           round((100*ST_Area(ST_Intersection(a.g, v.g)::geography)
                  / NULLIF(ST_Area(a.g::geography),0))::numeric, 3) AS pct_cubierto
      FROM amb a CROSS JOIN vig v ORDER BY 1`);
  console.table(cob);

  const ambitosDelInsumo = [...porAmbito.keys()].sort();
  const medidos = new Set(cob.map(r => r.ambito));
  const noMedibles = ambitosDelInsumo.filter(a => !medidos.has(a));
  if (noMedibles.length) {
    console.log(`\nAmbitos del insumo que NO se pueden medir asi: ${noMedibles.join(', ')}`);
    console.log('Motivo: ninguna de sus jurisdicciones tiene geometria en jurisdicciones_decreto,');
    console.log('asi que no hay area de referencia contra la cual medir. No determinado.');
  }

  console.log('\n2.c — Las celdas de la capa vigente, por si la geometria esta o no:');
  linea();
  const { rows: celdas } = await pool.query(`
    SELECT count(*) AS celdas,
           count(*) FILTER (WHERE geom IS NULL)      AS geom_nula,
           count(*) FILTER (WHERE ST_IsEmpty(geom))  AS geom_vacia,
           count(*) FILTER (WHERE NOT ST_IsEmpty(geom)) AS con_area
      FROM "${declCapa.capa_jurisdicciones}"`);
  console.table(celdas);

  console.log('\n2.d — Las bahias del catalogo cuyo nombre las ubica en un lago o en la Antartica:');
  linea();
  const { rows: lac } = await pool.query(`
    SELECT b.bahia_id, b.nombre, b.lat, b.lng,
           round((ST_Area(j.geom::geography)/1e6)::numeric, 2) AS km2_celda,
           ST_IsEmpty(j.geom) AS celda_vacia
      FROM bahias_sitport b
      JOIN "${declCapa.capa_jurisdicciones}" j USING (bahia_id)
     WHERE b.nombre ILIKE '%lago%' OR b.lat < -60
     ORDER BY b.lat < -60, b.bahia_id`);
  console.table(lac);

  // ── 3. COMPORTAMIENTO DEL MOTOR ───────────────────────────────────────────
  titulo('3. COMO SE COMPORTA EL MOTOR CUANDO LA RUTA CAE EN UN AMBITO QUE NO ESTA');

  console.log('\nSe ejecuta el codigo del motor, no se describe:');
  console.log('  - matching geografico  = sitport-routes.js:557  bahiasEnRutaPostGIS');
  console.log('  - aviso de cobertura   = cobertura-jurisdiccional.js  medirCoberturaRuta + componerAvisos');

  const za = cargarZonasAviso();
  console.log(`\nzonas_aviso.json cargado: ${za.zonas.length} zonas declaradas, ` +
    `${za.zonas_con_ambito.length} con ambito (o sea, capaces de reclamar un tramo).`);
  console.log(`ambito de jurisdiccion de las zonas declaradas: ` +
    JSON.stringify(za.zonas.reduce((a, z) => (a[z.ambito_jurisdiccion] = (a[z.ambito_jurisdiccion] || 0) + 1, a), {})));

  for (const r of RUTAS) {
    linea('─');
    console.log(`\nRUTA ${r.id}  [ambito esperado: ${r.ambito_esperado}]`);
    console.log(`  ${r.descripcion}`);
    console.log(`  waypoints: ${JSON.stringify(r.waypoints)}`);

    const ids = await bahiasEnRuta(r.waypoints);
    console.log(`\n  [matching] bahias que la capa vigente hace matchear: ${ids.length ? ids.join(', ') : '(NINGUNA)'}`);
    console.log(`  [matching] consecuencia: toda restriccion SITPORT cuya bahia no este en ese set se descarta`);
    console.log(`             (sitport-routes.js, filtro por bahiaIdsEnRuta).`);

    const medicion = await medirCoberturaRuta(pool, r.waypoints);
    const { avisos, defectos, bandera_cobertura } = componerAvisos(medicion);

    console.log(`\n  [cobertura] largo de ruta: ${medicion.largo_ruta_km?.toFixed(3)} km`);
    console.log(`  [cobertura] piezas sin jurisdiccion: ${medicion.piezas.length}`);
    for (const p of medicion.piezas) {
      console.log(`      largo=${p.largo_km.toFixed(4)}km  clasificacion=${p.clasificacion}  ` +
        `dentro_del_recorte=${p.dentro_del_recorte}  pegada_a_cobertura=${p.pegada_a_cobertura}`);
    }
    console.log(`  [cobertura] bandera: ${bandera_cobertura}`);
    console.log(`  [cobertura] avisos: ${avisos.length}   defectos registrados: ${defectos.length}`);
    for (const a of avisos) {
      console.log(`      causa='${a.causa}'  bandera=${a.bandera}  jurisdicciones_probables=${JSON.stringify(a.jurisdicciones_probables)}`);
      console.log(`      capitanias=${JSON.stringify(a.capitanias)}`);
      console.log(`      capa_1: ${a.capa_1}`);
      console.log(`      capa_2: ${a.capa_2}`);
    }
    for (const d of defectos) {
      console.log(`      DEFECTO tipo='${d.tipo}' largo=${d.largo_km}km`);
      console.log(`              ${d.detalle}`);
    }
  }

  linea('─');
  console.log('\nNOTA sobre el alcance de lo medido en el bloque 3: el aviso de cobertura se');
  console.log('calcula y se devuelve en su propio campo del endpoint, pero NO compone el');
  console.log('veredicto — asi esta escrito en sitport-routes.js:852 ("Todavia NO compone el');
  console.log('veredicto — esa es la pieza 4"). Lo que se mide arriba es lo que el backend');
  console.log('produce, no lo que el patron ve hoy en pantalla.');

  await pool.end();
}

main().catch(async (e) => {
  console.error('\nRECONOCIMIENTO ABORTADO:', e.message);
  console.error(e.stack);
  try { await pool.end(); } catch { /* noop */ }
  process.exit(1);
});
