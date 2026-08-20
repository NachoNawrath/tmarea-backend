'use strict';
// SONDA DE SELECCION DE RUTA v2 — NO produce ningun veredicto.
//
// CORRIGE la v1, que era el instrumento equivocado: la v1 mandaba la RECTA
// densificada a 50 km, y la app NO manda eso. La app llama primero a
// /api/rutas/calcular (motor raster) y despues manda los waypoints REALES de
// los tramos, filtrando los de tipo 'aproximacion_final'
// (useVoyageVerification.js, bloque "Restricciones de transito — se llama de
// forma secuencial usando los waypoints reales del motor raster").
//
// CONTROL POSITIVO de que la v2 es la buena: para R1 (Quellon -> San Rafael) el
// log del backend registro waypoints=38 cuando llamo la app. La v2 tiene que
// dar tambien 38, no 5.

const BACKEND = 'http://localhost:3000';

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

async function transito(wp, ab) {
  const r = await fetch(`${BACKEND}/api/sitport/restricciones-ruta`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruta_puntos: wp, nave_ab: ab }),
  });
  return r.json();
}

const RUTAS = [
  { id: 'R1  CONTROL POSITIVO (la app dio 38 wp)', o: { lat: -43.1208, lng: -73.6232 }, d: { lat: -41.7639, lng: -73.1303 } },
  { id: 'R2  Valparaiso -> San Antonio',           o: { lat: -33.0224, lng: -71.6326 }, d: { lat: -33.5875, lng: -71.6147 } },
  { id: 'R3  Lago Gral Carrera',                   o: { lat: -46.2947, lng: -71.9264 }, d: { lat: -46.6194, lng: -72.6733 } },
  { id: 'C1  Punta Arenas -> Puerto Williams',     o: { lat: -53.1600, lng: -70.9100 }, d: { lat: -54.9330, lng: -67.6170 } },
  { id: 'C2  Puerto Natales -> Puerto Eden',       o: { lat: -51.7319, lng: -72.5136 }, d: { lat: -49.1300, lng: -74.4200 } },
  { id: 'C3  Arica -> Iquique',                    o: { lat: -18.4750, lng: -70.3230 }, d: { lat: -20.2000, lng: -70.1500 } },
  { id: 'C4  Quellon -> Melinka',                  o: { lat: -43.1208, lng: -73.6232 }, d: { lat: -43.8990, lng: -73.7450 } },
  { id: 'C5  Pto Aguirre -> Pto Cisnes',           o: { lat: -45.1600, lng: -73.5200 }, d: { lat: -44.7400, lng: -72.6900 } },
  { id: 'C6  Antofagasta -> Taltal',               o: { lat: -23.6500, lng: -70.4000 }, d: { lat: -25.4000, lng: -70.4800 } },
];

(async () => {
  for (const r of RUTAS) {
    const { wp, err } = await rutaApp(r.o, r.d);
    if (err) { console.log(`${r.id}  ->  RUTA NO CALCULABLE: ${err}`); continue; }
    const d = await transito(wp, 50);
    const cob = d.cobertura_jurisdiccional || {};
    const dr = d.drift_catalogo || {};
    console.log(`${r.id}`);
    console.log(`   waypoints=${wp.length}  restricciones=${(d.restricciones_intermedias || []).length}  bandera_final=${d.bandera_final}`);
    console.log(`   cobertura: estado=${cob.estado} bandera=${cob.bandera} AVISOS=${cob.total} defectos=${cob.defectos_registrados}`);
    for (const a of (cob.avisos || [])) {
      console.log(`      AVISO causa=${a.causa} origen=${a.origen} bandera=${a.bandera} largo=${a.largo_km}km jur=${JSON.stringify(a.jurisdicciones_probables)} caps=${JSON.stringify((a.capitanias || []).map(c => c.nombre))}`);
    }
    console.log(`   drift: estado=${dr.estado} avisos=${(dr.avisos || []).length} defectos=${(dr.defectos || []).length}`);
  }
})();
