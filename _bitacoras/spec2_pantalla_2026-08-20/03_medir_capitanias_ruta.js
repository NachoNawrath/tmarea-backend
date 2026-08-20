'use strict';
// Cuantas Capitanias cruza de verdad la ruta R1 tal como la calcula la app
// (waypoints del motor raster, no la recta). Mismo predicado que
// bahiasEnRutaPostGIS: interseccion de la polilinea contra bahia_jurisdicciones.
//
// CONTROL POSITIVO: el conteo de waypoints tiene que dar 38, que es lo que el
// log del backend registro cuando la llamo el navegador.

require('dotenv').config({ path: 'C:/Users/katia/tmarea-backend/.env' });
const { Pool } = require('pg');
const mapa = require('C:/Users/katia/tmarea-backend/src/data/bahia-capitania-map.json');

const BACKEND = 'http://localhost:3000';
const arr = Array.isArray(mapa) ? mapa : Object.entries(mapa).map(([k, v]) => ({ id: k, ...v }));
const capDe = id => {
  const e = arr.find(x => String(x.bahia_id || x.id || x.idBahia) === String(id));
  return e ? e.capitania : '(sin entrada en el mapa operativo)';
};

const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});

(async () => {
  const r = await fetch(`${BACKEND}/api/rutas/calcular`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat_origen: -43.1208, lon_origen: -73.6232, lat_destino: -41.7639, lon_destino: -73.1303, licencia: 'PNM' }),
  });
  const d = await r.json();
  const tramos = d.tramos.filter(t => t.tipo !== 'aproximacion_final' && t.coords && t.coords.length >= 2);
  const wp = tramos.flatMap(t => t.coords).map(([lng, lat]) => ({ lat, lng }));
  console.log('waypoints =', wp.length, ' (CONTROL POSITIVO: el log del backend dijo 38 cuando llamo el navegador)');

  const wkt = 'LINESTRING(' + wp.map(p => `${p.lng} ${p.lat}`).join(',') + ')';
  const q = await pool.query(
    `WITH l AS (SELECT ST_SetSRID(ST_GeomFromText($1),4326) g)
     SELECT b.bahia_id, b.nombre FROM bahia_jurisdicciones b, l
     WHERE ST_Intersects(ST_SetSRID(b.geom,4326), l.g) ORDER BY 1`, [wkt]);

  console.log('\nBAHIAS QUE LA RUTA CRUZA (' + q.rows.length + '):');
  const caps = new Set();
  for (const row of q.rows) {
    const c = capDe(row.bahia_id);
    caps.add(c);
    console.log(`   ${row.bahia_id}  ${row.nombre}  ->  Capitania ${c}`);
  }
  console.log('\nCAPITANIAS DISTINTAS QUE LA RUTA ATRAVIESA: ' + caps.size);
  console.log('   ' + [...caps].sort().join(' · '));

  const conRestriccion = [117, 122, 235, 120, 113];
  console.log('\nDE ESAS, LAS QUE LA PANTALLA NOMBRO (por tener restriccion vigente): ' + conRestriccion.length + ' bahias');
  const capsMostradas = new Set(conRestriccion.map(capDe));
  console.log('   capitanias nombradas en pantalla: ' + capsMostradas.size + '  -> ' + [...capsMostradas].sort().join(' · '));
  const mudas = [...caps].filter(c => !capsMostradas.has(c));
  console.log('   CAPITANIAS CRUZADAS QUE LA PANTALLA NO NOMBRA: ' + mudas.length + '  -> ' + (mudas.join(' · ') || 'ninguna'));

  await pool.end();
})();
