const fs = require('fs');
const path = require('path');

let mitilidos = null;

function loadMitilidos() {
  try {
    // Intentar cargar primero Los Lagos (la región principal)
    const loslagosPath = path.join(__dirname, 'data', 'concesiones_mitilidos_loslagos.json');
    const araucaniaPath = path.join(__dirname, 'data', 'concesiones_mitilidos_araucania.json');
    const otrasPath = path.join(__dirname, 'data', 'concesiones_mitilidos_otras.json');

    let allFeatures = [];

    if (fs.existsSync(loslagosPath)) {
      const loslagos = JSON.parse(fs.readFileSync(loslagosPath, 'utf8'));
      allFeatures = allFeatures.concat(loslagos.features || []);
    }

    if (fs.existsSync(araucaniaPath)) {
      const araucania = JSON.parse(fs.readFileSync(araucaniaPath, 'utf8'));
      allFeatures = allFeatures.concat(araucania.features || []);
    }

    if (fs.existsSync(otrasPath)) {
      const otras = JSON.parse(fs.readFileSync(otrasPath, 'utf8'));
      allFeatures = allFeatures.concat(otras.features || []);
    }

    mitilidos = {
      type: 'FeatureCollection',
      features: allFeatures,
      metadata: {
        total: allFeatures.length,
        loaded_at: new Date().toISOString()
      }
    };

    console.log(`[Mitilidos] Cargadas ${mitilidos.metadata.total} concesiones`);
    return mitilidos;
  } catch (error) {
    console.error('[Mitilidos] Error cargando datos:', error.message);
    return { type: 'FeatureCollection', features: [], metadata: { error: error.message } };
  }
}

// Calcular distancia en km entre dos coordenadas (Haversine)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio terrestre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buscarPorProximidad(lat, lon, radiusKm = 50) {
  if (!mitilidos) loadMitilidos();

  const resultados = mitilidos.features
    .filter((feature) => {
      const geom = feature.geometry;
      if (!geom || !geom.coordinates) return false;

      // Para polígonos, usar el centro (primer punto)
      const coords = geom.coordinates[0];
      if (!coords || coords.length === 0) return false;

      const [featureLon, featureLat] = coords[0];
      const distancia = haversineDistance(lat, lon, featureLat, featureLon);
      return distancia <= radiusKm;
    })
    .map((feature) => {
      const coords = feature.geometry.coordinates[0][0];
      const [lon, lat] = coords;
      const distancia = haversineDistance(lat, lon, lat, lon);
      return {
        ...feature,
        distancia_km: parseFloat(distancia.toFixed(2))
      };
    })
    .sort((a, b) => a.distancia_km - b.distancia_km);

  return {
    count: resultados.length,
    busqueda: { lat, lon, radiusKm },
    data: resultados
  };
}

function buscarPorComuna(comuna) {
  if (!mitilidos) loadMitilidos();

  const comunaNormalizada = comuna.toUpperCase().trim();
  
  const resultados = mitilidos.features.filter((feature) => {
    const comunaFeature = (feature.properties?.comuna || '').toUpperCase().trim();
    return comunaFeature.includes(comunaNormalizada) || comunaNormalizada.includes(comunaFeature);
  });

  return {
    count: resultados.length,
    busqueda: { comuna },
    data: resultados
  };
}

function buscarPorRegion(region) {
  if (!mitilidos) loadMitilidos();

  const regionNormalizada = region.toUpperCase().trim();
  
  const resultados = mitilidos.features.filter((feature) => {
    const regionFeature = (feature.properties?.region || '').toUpperCase().trim();
    return regionFeature.includes(regionNormalizada) || regionNormalizada.includes(regionFeature);
  });

  return {
    count: resultados.length,
    busqueda: { region },
    data: resultados
  };
}

function buscarPorEspecie(especie) {
  if (!mitilidos) loadMitilidos();

  const especieBuscada = especie.toUpperCase();
  
  const resultados = mitilidos.features.filter((feature) => {
    const especies = (feature.properties?.especies || '').toUpperCase();
    return especies.includes(especieBuscada);
  });

  return {
    count: resultados.length,
    busqueda: { especie },
    data: resultados
  };
}

function buscarPorTitular(titular) {
  if (!mitilidos) loadMitilidos();

  const titularNormalizado = titular.toLowerCase().trim();
  
  const resultados = mitilidos.features.filter((feature) => {
    const titularFeature = (feature.properties?.titular || '').toLowerCase().trim();
    return titularFeature.includes(titularNormalizado);
  });

  return {
    count: resultados.length,
    busqueda: { titular },
    data: resultados
  };
}

function obtenerEstadisticas() {
  if (!mitilidos) loadMitilidos();

  const stats = {
    total_concesiones: mitilidos.features.length,
    regiones: {},
    comunas: {},
    especies_principales: {}
  };

  mitilidos.features.forEach((feature) => {
    const region = feature.properties?.region || 'Desconocida';
    const comuna = feature.properties?.comuna?.trim() || 'Desconocida';
    const especies = feature.properties?.especies?.split(',') || [];

    stats.regiones[region] = (stats.regiones[region] || 0) + 1;
    stats.comunas[comuna] = (stats.comunas[comuna] || 0) + 1;

    especies.forEach((esp) => {
      const especie = esp.trim().toUpperCase();
      stats.especies_principales[especie] = (stats.especies_principales[especie] || 0) + 1;
    });
  });

  return stats;
}

module.exports = {
  loadMitilidos,
  buscarPorProximidad,
  buscarPorComuna,
  buscarPorRegion,
  buscarPorEspecie,
  buscarPorTitular,
  obtenerEstadisticas
};
