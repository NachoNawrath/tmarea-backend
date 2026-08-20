'use strict';
// M4 — LA CELDA. Cuanto se aparta la celda Voronoi de las aguas de su bahia,
// medido sobre las rutas reales que calcula el motor raster.
//
// REFERENTE: Opcion 1 (owner, 2026-08-20). No se inventa una geometria de "las
// aguas de la bahia" —no existe en el repositorio— : se ACOTA el desacuerdo.
// La Opcion 2 (poligonos natural=bay de OSM) queda DECLARADA como lo que se
// renuncia a saber: OSM no es fuente autorizada de jurisdiccion.
// La Opcion 3 (jurisdicciones_decreto, el andamio) va como cota secundaria en
// el instrumento 02, no aca.
//
// CUATRO CORTES:
//   C1  distancia del punto de la bahia al trozo de ruta dentro de SU celda,
//       y km de ruta dentro de la celda. Distribucion entera, SIN umbral.
//   C2  km de ruta que no caen en NINGUNA celda.
//   C3  ranking de bahias por distancia de la ruta al punto, con la marca de
//       si su celda se cruza. Las inversiones de rango no necesitan umbral.
//   C4  celdas vacias: la bahia cuya celda no existe no puede cruzarse nunca.
//
// CONTROLES:
//   positivo 1  R1 tiene que dar 38 waypoints (lo que el log del backend
//               registro cuando llamo el navegador, 2026-08-20).
//   positivo 2  R1 tiene que dar exactamente las 7 bahias que la medicion del
//               2026-08-20 midio: 113 117 120 122 155 232 235.
//   negativo    la bahia 999 no existe: 0 filas en los tres cortes.

require('dotenv').config();
const { Pool } = require('pg');

const BACKEND = 'http://127.0.0.1:3000';
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'mapa_navegacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Las 9 del sondaje v2 del 2026-08-20, verbatim. R3 es lacustre y no se rutea:
// va igual para que su fallo quede en la salida y no en un comentario.
const RUTAS = [
  { id: 'R1  Quellon -> San Rafael  (CONTROL POSITIVO: 38 wp)', o: { lat: -43.1208, lng: -73.6232 }, d: { lat: -41.7639, lng: -73.1303 } },
  { id: 'R2  Valparaiso -> San Antonio',                        o: { lat: -33.0224, lng: -71.6326 }, d: { lat: -33.5875, lng: -71.6147 } },
  { id: 'R3  Lago Gral Carrera  (lacustre)',                    o: { lat: -46.2947, lng: -71.9264 }, d: { lat: -46.6194, lng: -72.6733 } },
  { id: 'C1  Punta Arenas -> Puerto Williams',                  o: { lat: -53.1600, lng: -70.9100 }, d: { lat: -54.9330, lng: -67.6170 } },
  { id: 'C2  Puerto Natales -> Puerto Eden',                    o: { lat: -51.7319, lng: -72.5136 }, d: { lat: -49.1300, lng: -74.4200 } },
  { id: 'C3  Arica -> Iquique',                                 o: { lat: -18.4750, lng: -70.3230 }, d: { lat: -20.2000, lng: -70.1500 } },
  { id: 'C4  Quellon -> Melinka',                               o: { lat: -43.1208, lng: -73.6232 }, d: { lat: -43.8990, lng: -73.7450 } },
  { id: 'C5  Pto Aguirre -> Pto Cisnes',                        o: { lat: -45.1600, lng: -73.5200 }, d: { lat: -44.7400, lng: -72.6900 } },
  { id: 'C6  Antofagasta -> Taltal',                            o: { lat: -23.6500, lng: -70.4000 }, d: { lat: -25.4000, lng: -70.4800 } },
];

const n1 = (x) => (x == null ? '—' : Number(x).toFixed(1));
const n3 = (x) => (x == null ? '—' : Number(x).toFixed(3));

async function rutaApp(origen, destino, licencia = 'PNM') {
  const r = await fetch(`${BACKEND}/api/rutas/calcular`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat_origen: origen.lat, lon_origen: origen.lng,
      lat_destino: destino.lat, lon_destino: destino.lng, licencia,
    }),
  });
  const d = await r.json();
  if (!d.ok || !Array.isArray(d.tramos)) return { err: d.error_code || d.error || 'sin tramos' };
  const tramos = d.tramos.filter(t => t.tipo !== 'aproximacion_final' && t.coords && t.coords.length >= 2);
  const wp = tramos.flatMap(t => t.coords).map(([lng, lat]) => ({ lat, lng }));
  return { wp };
}

const SQL_C1 = `
WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g)
SELECT bj.bahia_id,
       bs.nombre,
       ST_Length(ST_Intersection(bj.geom, ruta.g)::geography) / 1000.0        AS km_dentro,
       ST_Distance(bs.geom::geography,
                   ST_Intersection(bj.geom, ruta.g)::geography) / 1000.0      AS km_punto_a_ruta_en_su_celda,
       ST_Distance(bs.geom::geography, ruta.g::geography) / 1000.0            AS km_punto_a_ruta_entera,
       ST_Area(bj.geom::geography) / 1000000.0                                AS km2_celda
FROM bahia_jurisdicciones bj
JOIN bahias_sitport bs ON bs.bahia_id = bj.bahia_id
CROSS JOIN ruta
WHERE ST_Intersects(bj.geom, ruta.g)
ORDER BY km_punto_a_ruta_en_su_celda DESC`;

const SQL_C2 = `
WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g),
     union_celdas AS (
       SELECT ST_Union(bj.geom) AS g
       FROM bahia_jurisdicciones bj, ruta
       WHERE ST_Intersects(bj.geom, ruta.g)
     )
SELECT ST_Length(ruta.g::geography) / 1000.0 AS km_total,
       CASE WHEN uc.g IS NULL THEN ST_Length(ruta.g::geography) / 1000.0
            ELSE ST_Length(ST_Difference(ruta.g, uc.g)::geography) / 1000.0 END AS km_en_ninguna_celda
FROM ruta, union_celdas uc`;

const SQL_C3 = `
WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g)
SELECT bs.bahia_id,
       bs.nombre,
       ST_Distance(bs.geom::geography, ruta.g::geography) / 1000.0 AS km_ruta_al_punto,
       EXISTS (SELECT 1 FROM bahia_jurisdicciones bj, ruta r2
               WHERE bj.bahia_id = bs.bahia_id AND ST_Intersects(bj.geom, r2.g)) AS celda_cruzada
FROM bahias_sitport bs, ruta
ORDER BY km_ruta_al_punto ASC
LIMIT 25`;

(async () => {
  console.log('M4 — LA CELDA CONTRA LAS AGUAS DE SU BAHIA');
  console.log('Corrida: ' + new Date().toISOString());
  console.log('Capa medida: bahia_jurisdicciones (163 celdas Voronoi sobre los puntos');
  console.log('  SITPORT, recortadas contra ne_land y acotadas a 80 km del punto de');
  console.log('  cada bahia — scripts/create-bahia-jurisdicciones.sql).');
  console.log('Rutas: las 9 del sondaje v2 del 2026-08-20, calculadas por el motor');
  console.log('  raster real (/api/rutas/calcular), tramos != aproximacion_final.');
  console.log('');

  // ── CONTROL NEGATIVO ───────────────────────────────────────────────────────
  const neg = await pool.query('SELECT bahia_id FROM bahia_jurisdicciones WHERE bahia_id = 999');
  const neg2 = await pool.query('SELECT bahia_id FROM bahias_sitport WHERE bahia_id = 999');
  console.log('CONTROL NEGATIVO  bahia 999 (inexistente):');
  console.log(`  bahia_jurisdicciones -> ${neg.rowCount} filas   bahias_sitport -> ${neg2.rowCount} filas`);
  console.log('');

  const acumC1 = [];
  let rutasCalculadas = 0, rutasFallidas = 0;

  for (const r of RUTAS) {
    console.log('='.repeat(78));
    console.log(r.id);
    console.log('='.repeat(78));
    const { wp, err } = await rutaApp(r.o, r.d);
    if (err) {
      rutasFallidas++;
      console.log(`  RUTA NO CALCULABLE: ${err}`);
      console.log('  (declarado, no escondido: PLAN-2::ninguna-ruta-lacustre-es-calculable)');
      console.log('');
      continue;
    }
    rutasCalculadas++;
    const geo = JSON.stringify({ type: 'LineString', coordinates: wp.map(p => [p.lng, p.lat]) });
    console.log(`  waypoints = ${wp.length}`);

    const c1 = await pool.query(SQL_C1, [geo]);
    const c2 = await pool.query(SQL_C2, [geo]);
    const c3 = await pool.query(SQL_C3, [geo]);

    if (r.id.startsWith('R1')) {
      const set = c1.rows.map(x => x.bahia_id).sort((a, b) => a - b);
      const esperado = [113, 117, 120, 122, 155, 232, 235];
      const ok = JSON.stringify(set) === JSON.stringify(esperado);
      console.log('');
      console.log('  CONTROL POSITIVO 1  waypoints: esperado 38, medido ' + wp.length + '  -> ' + (wp.length === 38 ? 'OK' : 'FALLA'));
      console.log('  CONTROL POSITIVO 2  celdas cruzadas por R1');
      console.log('     esperado: ' + esperado.join(' '));
      console.log('     medido:   ' + set.join(' '));
      console.log('     -> ' + (ok ? 'OK — el instrumento mide lo mismo que el motor' : 'FALLA — mide otra cosa'));
    }

    console.log('');
    console.log('  C1 · POR CADA BAHIA CUYA CELDA CRUZA  (orden: mas lejano primero)');
    console.log('     Unidad: km. km_en_su_celda = distancia del PUNTO de la bahia al');
    console.log('     trozo de ruta que cae DENTRO DE SU PROPIA CELDA.');
    console.log('     id   km_en_su_celda  km_a_la_ruta  km_ruta_dentro  km2_celda  nombre');
    for (const x of c1.rows) {
      acumC1.push({ ruta: r.id.slice(0, 2), ...x });
      console.log(`     ${String(x.bahia_id).padStart(3)}  ${n1(x.km_punto_a_ruta_en_su_celda).padStart(12)}  ${n1(x.km_punto_a_ruta_entera).padStart(12)}  ${n1(x.km_dentro).padStart(14)}  ${n1(x.km2_celda).padStart(9)}  ${x.nombre}`);
    }
    console.log(`     pares (ruta, bahia) en esta ruta: ${c1.rowCount}`);

    console.log('');
    const t = c2.rows[0];
    console.log('  C2 · RUTA FUERA DE TODA CELDA');
    console.log(`     km_total = ${n3(t.km_total)}   km_en_ninguna_celda = ${n3(t.km_en_ninguna_celda)}   ` +
      `= ${t.km_total > 0 ? ((t.km_en_ninguna_celda / t.km_total) * 100).toFixed(1) : '—'} %`);

    console.log('');
    console.log('  C3 · LAS 25 BAHIAS MAS CERCANAS A LA RUTA, Y SI SU CELDA SE CRUZA');
    console.log('     (una bahia cerca con celda NO cruzada, debajo de otra lejos con');
    console.log('      celda cruzada, es una INVERSION — no necesita umbral)');
    console.log('     rank   id   km_ruta_al_punto   celda_cruzada  nombre');
    let rank = 0, inversiones = 0, maxCruzada = -1;
    for (const x of c3.rows) {
      rank++;
      if (x.celda_cruzada) maxCruzada = Number(x.km_ruta_al_punto);
      else if (maxCruzada >= 0 && Number(x.km_ruta_al_punto) < maxCruzada) inversiones++;
      console.log(`     ${String(rank).padStart(4)}  ${String(x.bahia_id).padStart(3)}  ${n1(x.km_ruta_al_punto).padStart(16)}   ${x.celda_cruzada ? 'SI' : 'no'}            ${x.nombre}`);
    }
    // Inversiones bien contadas: bahia mas cerca que la cruzada mas lejana, y sin cruzar.
    const kmMaxCruzada = c3.rows.filter(x => x.celda_cruzada).reduce((a, x) => Math.max(a, Number(x.km_ruta_al_punto)), -1);
    const inv = c3.rows.filter(x => !x.celda_cruzada && Number(x.km_ruta_al_punto) < kmMaxCruzada);
    console.log(`     km de la cruzada MAS LEJANA (dentro del top 25): ${n1(kmMaxCruzada)}`);
    console.log(`     INVERSIONES en el top 25: ${inv.length}` +
      (inv.length ? '  -> ' + inv.map(x => `${x.bahia_id}@${n1(x.km_ruta_al_punto)}km`).join(' ') : ''));
    console.log('');
  }

  // ── C1 AGREGADO ────────────────────────────────────────────────────────────
  console.log('='.repeat(78));
  console.log('C1 AGREGADO — DISTRIBUCION ENTERA, SIN UMBRAL');
  console.log('='.repeat(78));
  const vals = acumC1.map(x => Number(x.km_punto_a_ruta_en_su_celda)).sort((a, b) => a - b);
  console.log(`Denominador: ${vals.length} pares (ruta, bahia cuya celda la ruta cruza), sobre ${rutasCalculadas} rutas calculadas de ${RUTAS.length}.`);
  console.log('Unidad: km. Definicion: distancia del punto de la bahia al trozo de ruta dentro de su propia celda.');
  console.log('');
  console.log('  min    p25    p50    p75    p90    max');
  const q = (p) => vals.length ? vals[Math.min(vals.length - 1, Math.floor(p * (vals.length - 1)))] : null;
  console.log(`  ${n1(q(0))}  ${n1(q(0.25)).padStart(5)}  ${n1(q(0.5)).padStart(5)}  ${n1(q(0.75)).padStart(5)}  ${n1(q(0.90)).padStart(5)}  ${n1(q(1)).padStart(5)}`);
  console.log('');
  console.log('  histograma por decena de km (la forma, no un corte):');
  const bins = {};
  for (const v of vals) { const b = Math.floor(v / 10) * 10; bins[b] = (bins[b] || 0) + 1; }
  for (const b of Object.keys(bins).map(Number).sort((a, b2) => a - b2)) {
    console.log(`   [${String(b).padStart(3)}, ${String(b + 10).padStart(3)})  ${String(bins[b]).padStart(3)}  ${'#'.repeat(bins[b])}`);
  }
  console.log('');
  console.log('  los 10 pares mas apartados:');
  acumC1.sort((a, b) => Number(b.km_punto_a_ruta_en_su_celda) - Number(a.km_punto_a_ruta_en_su_celda));
  for (const x of acumC1.slice(0, 10)) {
    console.log(`   ${x.ruta}  bahia ${String(x.bahia_id).padStart(3)}  ${n1(x.km_punto_a_ruta_en_su_celda).padStart(6)} km  ${x.nombre}`);
  }
  console.log('');
  console.log(`Rutas calculadas ${rutasCalculadas} · rutas no calculables ${rutasFallidas} de ${RUTAS.length}.`);

  await pool.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
