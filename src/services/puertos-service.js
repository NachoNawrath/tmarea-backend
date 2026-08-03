const fs = require('fs');
const path = require('path');
const { normalizarTexto } = require('../utils/normalizarTexto');

let puertosCache = null;

async function loadPuertos() {
  try {
    const jsonPath = path.join(__dirname, 'data', 'puertos_chile_nacional.json');
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(rawData);

    if (!data.features || !Array.isArray(data.features)) {
      console.error('No se encontraron features en el JSON');
      return [];
    }

    console.log(`Total de features MOP encontrados: ${data.features.length}`);

    const puertosMOP = data.features.map((feature) => {
      const attr = feature.attributes;
      const geom = feature.geometry;
      return {
        id: attr.OBJECTID,
        nombre: attr.NOMBRE,
        provincia: attr.PROVINCIA,
        ubicacion: { lat: geom.y, lng: geom.x },
        operativa: attr.OPERATIVA === 'Si',
        locationMOP: attr.LOCATION,
        fuente: 'MOP',
      };
    });

    // Cargar y fusionar puertos adicionales (no registrados en MOP)
    const adicionalPath = path.join(__dirname, 'data', 'puertos_adicionales.json');
    let puertosManuales = [];
    try {
      const adicionalRaw = fs.readFileSync(adicionalPath, 'utf-8');
      const adicionales = JSON.parse(adicionalRaw);
      puertosManuales = adicionales.map((p, i) => ({
        id: `manual_${i + 1}`,
        nombre: p.nombre,
        provincia: p.region,
        ubicacion: { lat: p.lat, lng: p.lng },
        operativa: true,
        locationMOP: null,
        fuente: p.fuente || 'manual',
      }));
      console.log(`Puertos adicionales cargados: ${puertosManuales.length}`);
    } catch (e) {
      console.warn('No se pudo cargar puertos_adicionales.json:', e.message);
    }

    const total = [...puertosMOP, ...puertosManuales];
    console.log(`Total de puertos disponibles: ${total.length}`);
    return total;
  } catch (error) {
    console.error('Error cargando puertos:', error.message);
    return [];
  }
}

async function getPuertos() {
  if (!puertosCache) {
    puertosCache = await loadPuertos();
  }
  return puertosCache;
}

async function getPuertosByProvincia(provincia) {
  const puertos = await getPuertos();
  return puertos.filter(
    (p) => p.provincia.toLowerCase() === provincia.toLowerCase()
  );
}

async function getPuertosByProximidad(lat, lng, radiusKm = 50) {
  const puertos = await getPuertos();

  // Fórmula simple de distancia (no es geográficamente exacta pero funciona)
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Radio Tierra en km

  return puertos.filter((puerto) => {
    const dLat = toRad(puerto.ubicacion.lat - lat);
    const dLng = toRad(puerto.ubicacion.lng - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) *
        Math.cos(toRad(puerto.ubicacion.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radiusKm;
  });
}
async function searchPuertos(query, limit = 8) {
  const puertos = await getPuertos();
  const q = normalizarTexto(query);
  const resultados = puertos.filter((p) => {
    const nombre = normalizarTexto(p.nombre);
    const provincia = normalizarTexto(p.provincia);
    return nombre.includes(q) || provincia.includes(q);
  });
  return resultados.slice(0, limit);
}
module.exports = {
  getPuertos,
  getPuertosByProvincia,
  getPuertosByProximidad,
  loadPuertos,
  searchPuertos,
};