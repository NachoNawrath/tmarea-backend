'use strict';
// SONDA DE SELECCION DE RUTA — NO produce ningun veredicto.
// Replica exactamente densificarRuta() de tmarea-pwa/src/hooks/useVoyageVerification.js
// (paso 50 km) y hace el mismo POST que hace fetchTransitRestrictions.
// Sirve para confirmar, antes de gastar capturas, que el dato vivo sigue igual.

const BACKEND = 'http://localhost:3000';

function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function construirRutaPuntos(zarpe, recalada, pasoKm = 50) {
  if (!recalada) return [{ lat: zarpe.lat, lng: zarpe.lng }];
  const distTotal = distanciaKm(zarpe.lat, zarpe.lng, recalada.lat, recalada.lng);
  const segmentos = Math.max(1, Math.ceil(distTotal / pasoKm));
  const puntos = [];
  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;
    puntos.push({
      lat: zarpe.lat + (recalada.lat - zarpe.lat) * t,
      lng: zarpe.lng + (recalada.lng - zarpe.lng) * t,
    });
  }
  return puntos;
}

const RUTAS = [
  { id: 'R1', nombre: 'Quellon -> Calbuco',
    zarpe: { lat: -43.1208, lng: -73.6232 }, recalada: { lat: -41.7639, lng: -73.1303 } },
  { id: 'R2', nombre: 'Valparaiso (El Membrillo) -> San Antonio (Puertecito)',
    zarpe: { lat: -33.0224, lng: -71.6326 }, recalada: { lat: -33.5875, lng: -71.6147 } },
  { id: 'R3', nombre: 'Lago General Carrera: Pto Ibanez -> Rio Tranquilo',
    zarpe: { lat: -46.2947, lng: -71.9264 }, recalada: { lat: -46.6194, lng: -72.6733 } },
  { id: 'R2b', nombre: 'SUPLENTE Arica -> Iquique',
    zarpe: { lat: -18.4750, lng: -70.3230 }, recalada: { lat: -20.2000, lng: -70.1500 } },
];

(async () => {
  for (const r of RUTAS) {
    const ruta_puntos = construirRutaPuntos(r.zarpe, r.recalada, 50);
    console.log('================================================================');
    console.log(`${r.id}  ${r.nombre}`);
    console.log(`  waypoints densificados (paso 50 km): ${ruta_puntos.length}`);
    let res, data;
    try {
      res = await fetch(`${BACKEND}/api/sitport/restricciones-ruta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta_puntos, nave_ab: 50 }),
      });
      data = await res.json();
    } catch (e) {
      console.log('  ERROR de red:', e.message);
      continue;
    }
    console.log(`  HTTP ${res.status}  success=${data.success}`);
    console.log(`  veredicto=${data.veredicto}  bandera_final=${data.bandera_final}`);
    const ints = data.restricciones_intermedias || [];
    console.log(`  restricciones_intermedias: ${ints.length}`);
    for (const x of ints) {
      console.log(`     bahia ${x.id_bahia} ${x.nombre_bahia} | cap=${x.capitania} | aplica=${x.aplica} | estado=${x.evaluacion && x.evaluacion.estado} | cierre=${x.cierre && x.cierre.estado}`);
    }
    const cob = data.cobertura_jurisdiccional;
    if (cob) {
      console.log(`  cobertura_jurisdiccional: estado=${cob.estado} bandera=${cob.bandera} total_avisos=${cob.total} defectos=${cob.defectos_registrados}`);
      for (const a of (cob.avisos || [])) {
        console.log(`     AVISO #${a.orden_en_ruta} causa=${a.causa} origen=${a.origen} bandera=${a.bandera} largo=${a.largo_km}km`);
        console.log(`        jurisdicciones_probables=${JSON.stringify(a.jurisdicciones_probables)} capitanias=${JSON.stringify(a.capitanias)}`);
        console.log(`        capa_1="${a.capa_1}"`);
        console.log(`        capa_2="${a.capa_2}"`);
        console.log(`        contacto_generico=${a.contacto_generico ? JSON.stringify(a.contacto_generico).slice(0, 160) : 'null'}`);
      }
    } else {
      console.log('  cobertura_jurisdiccional: AUSENTE EN LA RESPUESTA');
    }
    const dr = data.drift_catalogo;
    console.log(`  drift_catalogo: estado=${dr && dr.estado} bandera=${dr && dr.bandera} avisos=${dr && (dr.avisos || []).length} defectos=${dr && (dr.defectos || []).length}`);
    for (const d of ((dr && dr.defectos) || [])) {
      console.log(`     DEFECTO drift: bahia ${d.id_bahia} "${d.nombre_sitport}" cap=${d.capitania_sitport} rep=${d.reparticion} tipo=${d.tipo} fuera_de_ruta=${d.fuera_de_ruta === true}`);
    }
  }
})();
