const fs = require('fs');
const path = require('path');
let centrosData = [];

function loadCentros() {
  try {
    const filePath = path.join(__dirname, 'data', 'centros_salmones_chile.json');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const geojson = JSON.parse(rawData);
    centrosData = geojson.features.map(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates[0];
      let lat = 0, lng = 0;
      coords.forEach(coord => { lng += coord[0]; lat += coord[1]; });
      lat /= coords.length;
      lng /= coords.length;
      return {
        id: props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.N_CODIGOCENTRO'],
        nombre: props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.TOPONIMIO'] ? props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.TOPONIMIO'].trim() : 'Sin nombre',
        empresa: props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.TITULAR'] ? props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.TITULAR'].trim() : 'Desconocida',
        region: props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.REGION'] ? props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.REGION'].trim() : 'Desconocida',
        comuna: props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.COMUNA'] ? props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.COMUNA'].trim() : 'Desconocida',
        estado: props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.T_ESTADOTRAMITE'] ? props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.T_ESTADOTRAMITE'].trim() : 'Desconocido',
        especie: props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.T_GRUPOESPECIE'] ? props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.T_GRUPOESPECIE'].trim() : 'Desconocida',
        superficie_hectareas: props['REP_SUBPESCA2.ADM_UOT.PULLINQUE4_T_ACUICULTURA.SUPERFICIEPOLIGONO'] || 0,
        lat, lng
      };
    });
    console.log('[CENTROS] Cargados ' + centrosData.length + ' centros');
    return centrosData.length;
  } catch (error) {
    console.error('[CENTROS] Error:', error.message);
    return 0;
  }
}

function getAll() { return centrosData; }
function getByRegion(region) { return centrosData.filter(c => c.region.toLowerCase().includes(region.toLowerCase())); }
function getByProximity(lat, lng, distanceKm) {
  distanceKm = distanceKm || 25;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  return centrosData.map(centro => {
    const dLat = toRad(centro.lat - lat);
    const dLng = toRad(centro.lng - lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat)) * Math.cos(toRad(centro.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Object.assign({}, centro, { distancia_km: parseFloat(distance.toFixed(2)) });
  }).filter(c => c.distancia_km <= distanceKm).sort((a, b) => a.distancia_km - b.distancia_km);
}
function getStats() {
  const regionStats = {};
  let totalSuperficie = 0;
  centrosData.forEach(centro => {
    if (!regionStats[centro.region]) regionStats[centro.region] = { count: 0, superficie: 0 };
    regionStats[centro.region].count++;
    regionStats[centro.region].superficie += centro.superficie_hectareas;
    totalSuperficie += centro.superficie_hectareas;
  });
  return { total_centros: centrosData.length, total_superficie_hectareas: parseFloat(totalSuperficie.toFixed(2)), por_region: regionStats };
}

module.exports = { loadCentros, getAll, getByRegion, getByProximity, getStats };