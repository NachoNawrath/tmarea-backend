'use strict';
// M4 (continuacion) — TRES COSAS QUE EL 01 DEJA ABIERTAS.
//
//  D1  POR QUE la ruta cae fuera de toda celda. Dos causas EXCLUYENTES y
//      medibles: (a) el punto de ruta esta a mas de 80 km de TODO punto de
//      bahia — el tope del buffer de construccion —, o (b) ne_land dice que ahi
//      hay tierra y el ST_Difference borro la celda. En geografia de fiordos (b)
//      es la sospecha, y sospechar no es medir.
//  D2  LAS CELDAS VACIAS. §1.1 del plan dice 33 de 163. Se RE-MIDE, no se cita.
//      Y se cruza con dos cosas: si el ensanche del ambito publicado las rescata,
//      y si publican restriccion HOY.
//  D3  COTA SECUNDARIA (Opcion 3, owner 2026-08-20). Mismo conjunto de rutas,
//      contra `jurisdicciones_decreto` — el ANDAMIO. Mide celda-vs-CAPITANIA,
//      no celda-vs-bahia, y el andamio esta declarado NO promovible: 60 pares
//      traslapados, 44.875,6 km2, 10 de 64 filas sin geometria, salido del
//      insumo v1 con 11 jurisdicciones que difieren del v2 —todas del corredor
//      de Chiloe, que es donde corren estas rutas—. Va como COTA, no como
//      referente, y el caveat viaja con el numero.
//
// CONTROL POSITIVO  R1 = 38 waypoints y las 7 bahias 113 117 120 122 155 232 235
//                   (mismo control que el 01, repetido porque este instrumento
//                   es otro y no hereda el del anterior).
// CONTROL NEGATIVO  jurisdiccion 'no_existe' -> 0 filas.

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

const RUTAS = [
  { id: 'R1  Quellon -> San Rafael', o: { lat: -43.1208, lng: -73.6232 }, d: { lat: -41.7639, lng: -73.1303 } },
  { id: 'R2  Valparaiso -> San Antonio', o: { lat: -33.0224, lng: -71.6326 }, d: { lat: -33.5875, lng: -71.6147 } },
  { id: 'R3  Lago Gral Carrera', o: { lat: -46.2947, lng: -71.9264 }, d: { lat: -46.6194, lng: -72.6733 } },
  { id: 'C1  Punta Arenas -> Pto Williams', o: { lat: -53.1600, lng: -70.9100 }, d: { lat: -54.9330, lng: -67.6170 } },
  { id: 'C2  Pto Natales -> Pto Eden', o: { lat: -51.7319, lng: -72.5136 }, d: { lat: -49.1300, lng: -74.4200 } },
  { id: 'C3  Arica -> Iquique', o: { lat: -18.4750, lng: -70.3230 }, d: { lat: -20.2000, lng: -70.1500 } },
  { id: 'C4  Quellon -> Melinka', o: { lat: -43.1208, lng: -73.6232 }, d: { lat: -43.8990, lng: -73.7450 } },
  { id: 'C5  Pto Aguirre -> Pto Cisnes', o: { lat: -45.1600, lng: -73.5200 }, d: { lat: -44.7400, lng: -72.6900 } },
  { id: 'C6  Antofagasta -> Taltal', o: { lat: -23.6500, lng: -70.4000 }, d: { lat: -25.4000, lng: -70.4800 } },
];

const n1 = (x) => (x == null ? '—' : Number(x).toFixed(1));
const n3 = (x) => (x == null ? '—' : Number(x).toFixed(3));

async function rutaApp(o, d, licencia = 'PNM') {
  const r = await fetch(`${BACKEND}/api/rutas/calcular`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat_origen: o.lat, lon_origen: o.lng, lat_destino: d.lat, lon_destino: d.lng, licencia }),
  });
  const j = await r.json();
  if (!j.ok || !Array.isArray(j.tramos)) return { err: j.error_code || j.error || 'sin tramos' };
  const tramos = j.tramos.filter(t => t.tipo !== 'aproximacion_final' && t.coords && t.coords.length >= 2);
  return { wp: tramos.flatMap(t => t.coords).map(([lng, lat]) => ({ lat, lng })) };
}

// D1 — el trozo de ruta fuera de toda celda, partido por causa.
const SQL_D1 = `
WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g),
     celdas AS (
       SELECT ST_Union(bj.geom) AS g FROM bahia_jurisdicciones bj, ruta
       WHERE ST_Intersects(bj.geom, ruta.g)
     ),
     fuera AS (
       SELECT CASE WHEN c.g IS NULL THEN ruta.g ELSE ST_Difference(ruta.g, c.g) END AS g
       FROM ruta, celdas c
     ),
     tierra AS (
       SELECT ST_Union(l.geom) AS g FROM ne_land l, ruta
       WHERE ST_Intersects(l.geom, ruta.g)
     ),
     lejos AS (
       SELECT ST_Union(ST_Buffer(bs.geom::geography, 80000)::geometry) AS g
       FROM bahias_sitport bs, ruta
       WHERE ST_DWithin(bs.geom::geography, ruta.g::geography, 200000)
     )
SELECT ST_Length(ruta.g::geography)/1000.0                                   AS km_total,
       ST_Length(f.g::geography)/1000.0                                      AS km_fuera_de_toda_celda,
       CASE WHEN t.g IS NULL THEN 0
            ELSE ST_Length(ST_Intersection(f.g, t.g)::geography)/1000.0 END   AS km_fuera_dentro_de_ne_land,
       CASE WHEN l.g IS NULL THEN ST_Length(f.g::geography)/1000.0
            ELSE ST_Length(ST_Difference(f.g, l.g)::geography)/1000.0 END     AS km_fuera_a_mas_de_80km
FROM ruta, fuera f, tierra t, lejos l`;

// D3 — cota secundaria contra el andamio por Capitania.
const SQL_D3 = `
WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g)
SELECT jd.id, jd.nombre, jd.ambito, jd.estado_geometria
FROM jurisdicciones_decreto jd, ruta
WHERE jd.geom IS NOT NULL AND ST_Intersects(jd.geom, ruta.g)
ORDER BY jd.id`;

(async () => {
  console.log('M4 (continuacion) — CAUSAS DEL HUECO, CELDAS VACIAS, Y LA COTA DEL ANDAMIO');
  console.log('Corrida: ' + new Date().toISOString());
  console.log('');

  // ── CONTROL NEGATIVO ───────────────────────────────────────────────────────
  const neg = await pool.query("SELECT id FROM jurisdicciones_decreto WHERE id = 'no_existe'");
  console.log(`CONTROL NEGATIVO  jurisdiccion 'no_existe' -> ${neg.rowCount} filas`);

  // ── D2 · CELDAS VACIAS ─────────────────────────────────────────────────────
  console.log('');
  console.log('='.repeat(78));
  console.log('D2 · CELDAS VACIAS — RE-MEDIDAS, NO CITADAS');
  console.log('='.repeat(78));
  const vac = await pool.query(`
    SELECT bs.bahia_id, bs.nombre,
           (bj.bahia_id IS NULL) AS sin_fila,
           COALESCE(ST_IsEmpty(bj.geom), TRUE) AS vacia,
           COALESCE(ST_Area(bj.geom::geography)/1000000.0, 0) AS km2
    FROM bahias_sitport bs
    LEFT JOIN bahia_jurisdicciones bj ON bj.bahia_id = bs.bahia_id
    ORDER BY km2 ASC, bs.bahia_id`);
  const vacias = vac.rows.filter(r => r.vacia || Number(r.km2) === 0);
  console.log(`Denominador: ${vac.rowCount} bahias del catalogo (bahias_sitport). Unidad: bahia.`);
  console.log(`CELDAS VACIAS (area 0 o sin fila): ${vacias.length}`);
  console.log(`  §1.1 del PLAN dice 33. Medido hoy: ${vacias.length}. ` +
    (vacias.length === 33 ? 'COINCIDE.' : 'NO COINCIDE — y el que manda es este.'));

  // El ensanche: que jurisdicciones estan publicadas, y que bahias cuelgan.
  const amb = require('../../data/decreto/ambitos_publicados.json');
  const join = require('../../data/decreto/join_bahia_jurisdiccion.json');
  const publicados = (amb.ambitos || [])
    .filter(a => a.publicado === true).map(a => a.ambito);
  console.log('');
  console.log(`Ambitos declarados publicados: ${publicados.length ? publicados.join(', ') : '(ninguno)'}`);
  const jurPub = await pool.query(
    `SELECT id FROM jurisdicciones_decreto WHERE ambito = ANY($1) AND geom IS NOT NULL`, [publicados]);
  const setJurPub = new Set(jurPub.rows.map(r => r.id));
  const bahiaAJur = new Map(join.entradas.map(e => [e.bahia_id, e.jurisdiccion_id]));

  const rescatadas = vacias.filter(v => setJurPub.has(bahiaAJur.get(v.bahia_id)));
  const noRescatadas = vacias.filter(v => !setJurPub.has(bahiaAJur.get(v.bahia_id)));
  console.log(`De las ${vacias.length} vacias: RESCATADAS por el ensanche ${rescatadas.length} · NO rescatadas ${noRescatadas.length}`);

  // Restricciones vivas hoy.
  const rr = await fetch(`${BACKEND}/api/sitport/restricciones`);
  const rj = await rr.json();
  const vivas = rj.data || [];
  const bahiasConRestriccion = new Set(vivas.map(r => Number(r.bahia)));
  const bahiasConTodos = new Set(vivas.filter(r => (r.tipo || '').trim() === 'TODOS').map(r => Number(r.bahia)));
  console.log('');
  console.log(`Restricciones vivas en consultaRestricciones AHORA: ${vivas.length} filas · tipo TODOS: ${bahiasConTodos.size} bahias distintas`);
  const vaciasConRestr = vacias.filter(v => bahiasConRestriccion.has(v.bahia_id));
  console.log(`Celdas vacias que publican restriccion HOY: ${vaciasConRestr.length}` +
    (vaciasConRestr.length ? ' -> ' + vaciasConRestr.map(v => `${v.bahia_id} ${v.nombre}`).join(' | ') : ''));
  console.log('');
  console.log('  Las NO rescatadas por el ensanche (id · jurisdiccion del join · nombre):');
  for (const v of noRescatadas) {
    console.log(`   ${String(v.bahia_id).padStart(3)}  ${String(bahiaAJur.get(v.bahia_id) || '(sin join)').padEnd(22)}  ${v.nombre}`);
  }

  // ── D1 y D3 POR RUTA ───────────────────────────────────────────────────────
  console.log('');
  console.log('='.repeat(78));
  console.log('D1 · POR QUE LA RUTA CAE FUERA DE TODA CELDA   +   D3 · COTA DEL ANDAMIO');
  console.log('='.repeat(78));
  console.log('D1 unidad: km de linea de ruta. Las dos causas se miden por separado y');
  console.log('  pueden solaparse (un trozo dentro de ne_land Y a mas de 80 km): se');
  console.log('  publican las dos y NO se restan.');
  console.log('D3 unidad: jurisdiccion del decreto (andamio). CAVEAT en la cabecera.');
  console.log('');

  for (const r of RUTAS) {
    const { wp, err } = await rutaApp(r.o, r.d);
    if (err) { console.log(`${r.id}  ->  NO CALCULABLE: ${err}`); console.log(''); continue; }
    const geo = JSON.stringify({ type: 'LineString', coordinates: wp.map(p => [p.lng, p.lat]) });

    if (r.id.startsWith('R1')) {
      const cp = await pool.query(
        `WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) AS g)
         SELECT bj.bahia_id FROM bahia_jurisdicciones bj, ruta WHERE ST_Intersects(bj.geom, ruta.g) ORDER BY 1`, [geo]);
      const set = cp.rows.map(x => x.bahia_id);
      console.log('CONTROL POSITIVO  R1: waypoints ' + wp.length + ' (esperado 38) · celdas ' + set.join(' '));
      console.log('  -> ' + ((wp.length === 38 && set.join(' ') === '113 117 120 122 155 232 235') ? 'OK' : 'FALLA'));
      console.log('');
    }

    const d1 = (await pool.query(SQL_D1, [geo])).rows[0];
    const d3 = await pool.query(SQL_D3, [geo]);

    // bahias que salen del andamio, via join, y comparacion con las de celda
    const bahiasAndamio = new Set();
    for (const [bid, jid] of bahiaAJur) if (d3.rows.some(x => x.id === jid)) bahiasAndamio.add(bid);
    const celdas = (await pool.query(
      `WITH ruta AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1),4326) AS g)
       SELECT bj.bahia_id FROM bahia_jurisdicciones bj, ruta WHERE ST_Intersects(bj.geom, ruta.g)`, [geo]))
      .rows.map(x => x.bahia_id);
    const setCeldas = new Set(celdas);
    const soloAndamio = [...bahiasAndamio].filter(b => !setCeldas.has(b));
    const soloCelda = [...setCeldas].filter(b => !bahiasAndamio.has(b));

    console.log(r.id + `   (waypoints ${wp.length})`);
    console.log(`   D1  km_total ${n3(d1.km_total)} · fuera de toda celda ${n3(d1.km_fuera_de_toda_celda)} ` +
      `(${((d1.km_fuera_de_toda_celda / d1.km_total) * 100).toFixed(1)} %)`);
    console.log(`       de esos:  dentro de ne_land ${n3(d1.km_fuera_dentro_de_ne_land)} km ` +
      `· a mas de 80 km de todo punto de bahia ${n3(d1.km_fuera_a_mas_de_80km)} km`);
    console.log(`   D3  jurisdicciones del andamio que la ruta cruza: ${d3.rowCount}` +
      (d3.rowCount ? '  [' + d3.rows.map(x => x.id).join(' ') + ']' : ''));
    console.log(`       bahias por celda ${setCeldas.size} · bahias por andamio ${bahiasAndamio.size} ` +
      `· solo andamio ${soloAndamio.length} · solo celda ${soloCelda.length}`);
    if (soloAndamio.length) {
      const conR = soloAndamio.filter(b => bahiasConTodos.has(b));
      console.log(`       solo andamio con restriccion TODOS viva HOY: ${conR.length}` +
        (conR.length ? ' -> ' + conR.join(' ') : ''));
    }
    console.log('');
  }

  await pool.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
