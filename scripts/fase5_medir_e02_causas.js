'use strict';
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// fase5_medir_e02_causas.js â€” MEDICION para la propuesta de E0.2.
//
// La pregunta que contesta: de los trozos de ruta que hoy no resuelven
// jurisdiccion, Â¿cuantos caen en un ambito que nunca se construyo, y cuantos
// son de verdad un hueco de nuestra capa?
//
// INV-3.6 manda clasificar cada trozo en (a) jurisdiccion declarada sin
// geometria o (b) hueco de la propia capa, y dice que (b) es "un defecto de
// construccion nuestro". Si un trozo cae en un ambito entero que no se
// construyo, hoy sale etiquetado (b) â€” o sea, se afirma un defecto de
// construccion sobre una capa que para ese ambito no existe.
//
// MIDE TAMBIEN EL CASO QUE ROMPE EL FUNDAMENTO (CLAUDE.md Â§1.2):
//   - trozos que NINGUN ambito reclama  -> ahi la distincion no aporta nada y
//     (b) es la etiqueta correcta;
//   - trozos que DOS O MAS ambitos reclaman -> ahi la causa seria ambigua y el
//     diseÃ±o tiene que decidir, no adivinar.
//
// Geografia de reclamo: jurisdicciones_decreto filtrada por ambito. Es la unica
// relacion de la base con geometria Y ambito. Esta marcada SUPERSEDIDA y NO
// resuelve jurisdiccion (INV-3.3): se usa solo para saber en que ambito cae un
// trozo, que es lo mismo que zonas_aviso.json ya hace con banda_latitud.
//
// No escribe en la base.
//   node scripts/fase5_medir_e02_causas.js
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

require('dotenv').config();
const { Pool } = require('pg');
const { warmup, calcularRuta } = require('../src/services/raster-router-service');
const { construirPerfilCosto } = require('../src/config/perfiles-costo');
const { medirCoberturaRuta, componerAvisos } = require('../src/services/cobertura-jurisdiccional');

const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});

// Los mismos ocho puntos y las mismas ocho rutas de fase5_medir_cobertura_ruta.js,
// para que esta medicion sea comparable con la de R1.
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
  ['corredor dia 0', 'Anahuac -> Melinka',             'ANAHUAC',      'MELINKA'],
  ['corredor dia 0', 'Anahuac -> Quellon',             'ANAHUAC',      'QUELLON'],
  ['corredor dia 0', 'Anahuac -> Chacabuco',           'ANAHUAC',      'CHACABUCO'],
  ['corredor dia 0', 'Ancud -> Castro (mar interior)', 'ANCUD',        'CASTRO'],
  ['corredor dia 0', 'Chonchi -> Chaiten (Corcovado)', 'CHONCHI',      'CHAITEN'],
  ['fuera corredor', 'Arica -> Iquique (norte)',       'ARICA',        'IQUIQUE'],
  ['fuera corredor', 'Valparaiso -> San Antonio',      'VALPARAISO',   'SAN_ANTONIO'],
  ['fuera corredor', 'Punta Arenas -> Pto Williams',   'PUNTA_ARENAS', 'PTO_WILLIAMS'],
];

// Rutas de ambito no maritimo, que las ocho de arriba no cubren. Extremos =
// coordenadas publicadas por SITPORT (bahias_sitport). No se rutean: el motor
// raster no tiene tile de lago ni de Antartica, asi que van como segmento
// recto entre dos puntos reales, que es como un patron las dibujaria hoy.
const RUTAS_DIRECTAS = [
  ['ambito lacustre',  'Lago Villarrica: bahia 210 -> 209',
    [{ lat: -39.2883, lng: -72.2195 }, { lat: -39.2833, lng: -71.9667 }]],
  ['ambito antartico', 'Antartica: bahia 139 Fildes -> 231 Chile',
    [{ lat: -62.2, lng: -58.9667 }, { lat: -62.4667, lng: -59.6833 }]],
];

// Que ambitos reclaman un trozo, y cuantos metros de el reclama cada uno.
const SQL_RECLAMO = `
WITH trozo AS (
  SELECT ST_SetSRID(ST_MakeLine(ST_MakePoint($2,$1), ST_MakePoint($4,$3)), 4326) AS g
)
SELECT j.ambito,
       round(ST_Length(ST_Intersection(ST_Union(j.geom), t.g)::geography)::numeric, 1) AS m_reclamados,
       count(*) AS jurisdicciones_que_tocan
  FROM jurisdicciones_decreto j, trozo t
 WHERE j.geom IS NOT NULL AND ST_Intersects(j.geom, t.g)
 GROUP BY j.ambito, t.g
 ORDER BY 2 DESC`;

async function ambitosQueReclaman(p) {
  const { rows } = await pool.query(SQL_RECLAMO, [p.lat_ini, p.lon_ini, p.lat_fin, p.lon_fin]);
  return rows.filter(r => Number(r.m_reclamados) > 0);
}

// Un ambito esta PUBLICADO si la capa que el motor consulta hoy tiene geometria
// sobre el. Medido en el reconocimiento: lacustre 0%, antartica 0%, maritima
// 12,53%. Aca se vuelve a medir para no depender de un numero copiado.
async function coberturaPorAmbito() {
  await pool.query("SET statement_timeout = '900s'");
  const { rows } = await pool.query(`
    WITH amb AS (SELECT ambito, ST_Union(geom) g FROM jurisdicciones_decreto
                  WHERE geom IS NOT NULL GROUP BY 1),
         vig AS (SELECT ST_Union(geom) g FROM bahia_jurisdicciones WHERE NOT ST_IsEmpty(geom))
    SELECT a.ambito,
           round((100*ST_Area(ST_Intersection(a.g,v.g)::geography)
                  / NULLIF(ST_Area(a.g::geography),0))::numeric, 3) AS pct
      FROM amb a CROSS JOIN vig v ORDER BY 1`);
  return rows;
}

const L = (...a) => console.log(...a);
const linea = (c = 'â”€') => L(c.repeat(78));

async function analizar(grupo, nombre, waypoints, acumulador) {
  L('');
  linea('â”€');
  L(`${nombre}   [${grupo}]`);
  const medicion = await medirCoberturaRuta(pool, waypoints);
  const { avisos, defectos, bandera_cobertura } = await componerAvisos(medicion, pool);
  L(`  largo ${medicion.largo_ruta_km?.toFixed(2)} km Â· piezas sin jurisdiccion ${medicion.piezas.length} Â· ` +
    `bandera hoy ${bandera_cobertura} Â· avisos ${avisos.length} Â· defectos ${defectos.length}`);

  for (const p of medicion.piezas) {
    const reclamos = await ambitosQueReclaman(p);
    const etiquetaHoy = p.clasificacion === 'defecto_recorte'
      ? 'SILENCIADO (defecto_recorte)'
      : 'aviso causa=hueco_de_capa';
    L(`    trozo ${p.largo_km.toFixed(3)} km â€” hoy: ${etiquetaHoy}`);
    if (reclamos.length === 0) {
      L(`        reclamado por: NINGUN ambito`);
      acumulador.sin_reclamo.push({ grupo, nombre, km: p.largo_km, clas: p.clasificacion });
    } else {
      for (const r of reclamos) {
        L(`        reclamado por ambito '${r.ambito}': ${r.m_reclamados} m (${r.jurisdicciones_que_tocan} jurisdiccion/es)`);
      }
      const clave = reclamos.map(r => r.ambito).sort().join('+');
      if (reclamos.length > 1) {
        acumulador.ambiguos.push({ grupo, nombre, km: p.largo_km, ambitos: clave, clas: p.clasificacion });
      } else {
        acumulador.por_ambito[clave] = acumulador.por_ambito[clave] || { km: 0, trozos: 0, silenciados: 0 };
        acumulador.por_ambito[clave].km += p.largo_km;
        acumulador.por_ambito[clave].trozos += 1;
        if (p.clasificacion === 'defecto_recorte') acumulador.por_ambito[clave].silenciados += 1;
      }
    }
  }
}

(async () => {
  L('MEDICION E0.2 â€” QUE AMBITO RECLAMA CADA TROZO QUE HOY NO RESUELVE JURISDICCION');
  L(`fecha: ${new Date().toISOString()}`);
  L('shell del agente: PowerShell 5.1 / Windows. Reproducible: node scripts/fase5_medir_e02_causas.js');

  L('');
  L('COBERTURA DE LA CAPA VIGENTE POR AMBITO (re-medida, no copiada):');
  for (const r of await coberturaPorAmbito()) {
    L(`  ${r.ambito.padEnd(16)} ${String(r.pct).padStart(8)} %   -> ${Number(r.pct) === 0 ? 'NO PUBLICADO' : 'con cobertura parcial'}`);
  }

  const acc = { por_ambito: {}, sin_reclamo: [], ambiguos: [] };

  L('');
  L('â•'.repeat(78));
  L('LAS OCHO RUTAS REALES DEL MOTOR DE RUTEO');
  L('â•'.repeat(78));
  warmup('AUSTRAL_N');
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

  for (const [grupo, nombre, a, b] of RUTAS) {
    let r;
    try { r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b]); }
    catch (e) { L(`\n${nombre}: EXCEPCION DE RUTEO â€” ${e.message}`); continue; }
    if (!r.ok) { L(`\n${nombre}: RUTEO FALLIDO â€” ${r.error} (${r.error_code || '-'})`); continue; }
    // Mismo criterio que el backend: se descartan los tramos de aproximacion final.
    const wps = r.tramos.filter(t => t.tipo !== 'aproximacion_final')
      .flatMap(t => t.coords).map(c => ({ lat: c[1], lng: c[0] }));
    if (wps.length < 2) { L(`\n${nombre}: menos de 2 waypoints utiles`); continue; }
    await analizar(grupo, nombre, wps, acc);
  }

  L('');
  L('â•'.repeat(78));
  L('RUTAS DE AMBITO NO MARITIMO (segmento recto entre puntos publicados)');
  L('â•'.repeat(78));
  for (const [grupo, nombre, wps] of RUTAS_DIRECTAS) await analizar(grupo, nombre, wps, acc);

  L('');
  L('â•'.repeat(78));
  L('RESUMEN');
  L('â•'.repeat(78));
  L('\nTrozos sin jurisdiccion agrupados por el ambito que los reclama:');
  for (const [amb, v] of Object.entries(acc.por_ambito).sort()) {
    L(`  ${amb.padEnd(16)} ${v.trozos} trozos Â· ${v.km.toFixed(2)} km Â· ${v.silenciados} de ellos hoy SILENCIADOS`);
  }

  L(`\nEL CASO QUE ROMPE EL FUNDAMENTO â€” trozos que NINGUN ambito reclama: ${acc.sin_reclamo.length}`);
  for (const s of acc.sin_reclamo) L(`  ${s.km.toFixed(3)} km Â· ${s.nombre} Â· hoy ${s.clas}`);
  if (acc.sin_reclamo.length === 0) L('  (ninguno)');
  L('  Para estos, (b) hueco_de_capa es la etiqueta correcta y el registro no aporta.');

  L(`\nEL OTRO CASO QUE LO ROMPE â€” trozos que DOS O MAS ambitos reclaman: ${acc.ambiguos.length}`);
  for (const s of acc.ambiguos) L(`  ${s.km.toFixed(3)} km Â· ${s.nombre} Â· ambitos ${s.ambitos} Â· hoy ${s.clas}`);
  if (acc.ambiguos.length === 0) L('  (ninguno)');
  L('  Para estos la causa seria ambigua y el diseÃ±o tiene que decidir, no adivinar.');

  await pool.end();
})().catch(async (e) => {
  console.error('\nMEDICION ABORTADA:', e.message);
  console.error(e.stack);
  try { await pool.end(); } catch { /* noop */ }
  process.exit(1);
});
