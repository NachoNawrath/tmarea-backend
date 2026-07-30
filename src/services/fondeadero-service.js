// src/services/fondeadero-service.js
//
// Busca el puerto/fondeadero más cercano ANTES de una restricción de tránsito,
// en la dirección de viaje, para sugerir dónde esperar condiciones favorables.
//
// Fuente: puertos_chile_nacional.json (644 puertos MOP, FeatureSet Esri:
// { features: [{ attributes: { NOMBRE, ... }, geometry: { x: lng, y: lat } }] }).

const puertosRaw = require('./data/puertos_chile_nacional.json');

// Normaliza el FeatureSet a una lista plana { nombre, lat, lng } una sola vez.
const PUERTOS = (puertosRaw.features || [])
  .map((f) => ({
    nombre: f.attributes?.NOMBRE || 'Puerto sin nombre',
    lat: f.geometry?.y,
    lng: f.geometry?.x,
  }))
  .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');

const KM_POR_MN = 1.852;

function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Encuentra el puerto más cercano ANTES de la restricción, en el sentido de viaje.
 *
 * "Antes" depende de la dirección: si el viaje va de norte a sur (lat de zarpe
 * mayor —menos negativa— que la restricción), antes = puertos AL NORTE de la
 * restricción (latitud mayor). Si va de sur a norte, antes = puertos AL SUR.
 *
 * @param {number} lat  latitud de la restricción
 * @param {number} lng  longitud de la restricción
 * @param {number} latZarpe latitud del puerto de zarpe (define la dirección)
 * @returns {{ nombre, lat, lng, distancia_mn } | null}
 */
function buscarFondeadero(lat, lng, latZarpe) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Dirección de viaje. Si no viene latZarpe, se asume norte→sur (corredor
  // austral), coherente con la simplificación v1 del contexto.
  const vaAlSur = latZarpe == null || isNaN(latZarpe) || latZarpe >= lat;

  const candidatos = PUERTOS.filter((p) => {
    // Excluir el propio punto de la restricción (mismo lugar, ~0 km).
    if (vaAlSur) return p.lat > lat;   // antes = más al norte
    return p.lat < lat;                // antes = más al sur
  });

  if (candidatos.length === 0) return null;

  let mejor = null;
  let mejorDist = Infinity;
  for (const p of candidatos) {
    const d = distKm(lat, lng, p.lat, p.lng);
    if (d < mejorDist) {
      mejorDist = d;
      mejor = p;
    }
  }

  if (!mejor) return null;
  return {
    nombre: mejor.nombre,
    lat: mejor.lat,
    lng: mejor.lng,
    distancia_mn: Math.round(mejorDist / KM_POR_MN),
  };
}

module.exports = { buscarFondeadero };
