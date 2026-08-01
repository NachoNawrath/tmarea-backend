// src/services/fondeadero-service.js
//
// Busca el puerto/fondeadero más cercano ANTES de una restricción de tránsito,
// en la dirección de viaje, para sugerir dónde esperar condiciones favorables.
//
// "Antes" se determina con la geometría real de la ruta: solo puertos MOP que
// estén cerca del segmento de ruta ANTERIOR a la zona restringida son candidatos.
//
// Fuente: puertos_chile_nacional.json (644 puertos MOP, FeatureSet Esri:
// { features: [{ attributes: { NOMBRE, ... }, geometry: { x: lng, y: lat } }] }).

const puertosRaw = require('./data/puertos_chile_nacional.json');

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
 * Encuentra el puerto MOP más cercano a la restricción que esté sobre el
 * tramo de ruta ANTERIOR a la zona restringida.
 *
 * @param {number} latRestr  latitud de la restricción
 * @param {number} lngRestr  longitud de la restricción
 * @param {{lat:number, lng:number}[]} rutaAntes  puntos de ruta desde zarpe
 *        hasta justo antes de entrar en la zona restringida
 * @returns {{ nombre, lat, lng, distancia_mn } | null}
 */
function buscarFondeadero(latRestr, lngRestr, rutaAntes) {
  if (typeof latRestr !== 'number' || typeof lngRestr !== 'number') return null;
  if (!rutaAntes || rutaAntes.length === 0) return null;

  const MAX_DIST_RUTA_KM = 30;
  const MARGEN_BBOX = 0.3; // ~33 km

  // Bounding box del tramo anterior, expandido por margen
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const p of rutaAntes) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  minLat -= MARGEN_BBOX; maxLat += MARGEN_BBOX;
  minLng -= MARGEN_BBOX; maxLng += MARGEN_BBOX;

  // Submuestra de la ruta para chequeo eficiente (~100 puntos max)
  const step = Math.max(1, Math.floor(rutaAntes.length / 100));
  const muestra = [];
  for (let i = 0; i < rutaAntes.length; i += step) muestra.push(rutaAntes[i]);
  const ultimo = rutaAntes[rutaAntes.length - 1];
  if (muestra[muestra.length - 1] !== ultimo) muestra.push(ultimo);

  let mejor = null;
  let mejorDist = Infinity;

  for (const p of PUERTOS) {
    if (p.lat < minLat || p.lat > maxLat || p.lng < minLng || p.lng > maxLng) continue;

    let cercaDeRuta = false;
    for (const rp of muestra) {
      if (distKm(p.lat, p.lng, rp.lat, rp.lng) < MAX_DIST_RUTA_KM) {
        cercaDeRuta = true;
        break;
      }
    }
    if (!cercaDeRuta) continue;

    const d = distKm(latRestr, lngRestr, p.lat, p.lng);
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
