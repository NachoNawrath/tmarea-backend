const fs = require('fs');
const path = require('path');

let puertosCache = null;

async function loadPuertos() {
  try {
    // Ruta al archivo JSON (fuera del backend, en C:\Users\katia\)
    const jsonPath = path.join(__dirname, 'data', 'puertos_chile_nacional.json');
    
    // Leer archivo
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(rawData);

    // Verificar que features existe
    if (!data.features || !Array.isArray(data.features)) {
      console.error('No se encontraron features en el JSON');
      return [];
    }

    console.log(`Total de features encontrados: ${data.features.length}`);

    // Parsear cada feature
    const puertos = data.features.map((feature) => {
      const attr = feature.attributes;
      const geom = feature.geometry;

      return {
        id: attr.OBJECTID,
        nombre: attr.NOMBRE,
        provincia: attr.PROVINCIA,
        ubicacion: {
          lat: geom.y,
          lng: geom.x,
        },
        operativa: attr.OPERATIVA === 'Si',
        locationMOP: attr.LOCATION,
      };
    });

    console.log(`Total de puertos parseados: ${puertos.length}`);
    return puertos;
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

module.exports = {
  getPuertos,
  getPuertosByProvincia,
  getPuertosByProximidad,
  loadPuertos,
};