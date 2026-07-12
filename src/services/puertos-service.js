/**
 * Tmarea Puertos Service
 */
const fs = require('fs');
const path = require('path');

const PUERTOS_DATA_PATH = path.join(__dirname, './data/puertos_chile_nacional.json');

function loadPuertos() {
  try {
    const rawData = fs.readFileSync(PUERTOS_DATA_PATH, 'utf-8');
    const data = JSON.parse(rawData);
    return data;
  } catch (error) {
    console.error(`Error cargando puertos:`, error.message);
    return { puertos: [], metadata: {} };
  }
}

function validarPuerto(puerto) {
  const campos_requeridos = ['id', 'nombre', 'latitud', 'longitud', 'tipo'];
  return campos_requeridos.every(c => puerto.hasOwnProperty(c));
}

function getAllPuertos(req, res) {
  const data = loadPuertos();
  const puertosValidos = data.puertos.filter(validarPuerto);
  return res.json({
    success: true,
    count: puertosValidos.length,
    data: puertosValidos,
    metadata: data.metadata
  });
}

function searchPuertos(req, res) {
  const data = loadPuertos();
  let puertos = data.puertos.filter(validarPuerto);
  const { q, type } = req.query;
  
  if (q) {
    const searchTerm = q.toLowerCase().trim();
    puertos = puertos.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm) || 
      p.id.toLowerCase().includes(searchTerm)
    );
  }
  
  if (type) {
    puertos = puertos.filter(p => p.tipo === type);
  }
  
  return res.json({
    success: true,
    query: { q, type },
    count: puertos.length,
    data: puertos,
    metadata: data.metadata
  });
}

function getPuertoById(req, res) {
  const data = loadPuertos();
  const puerto = data.puertos.find(p => p.id === req.params.id);
  
  if (!puerto) {
    return res.status(404).json({
      success: false,
      error: `Puerto con id '${req.params.id}' no encontrado`
    });
  }
  
  if (!validarPuerto(puerto)) {
    return res.status(500).json({
      success: false,
      error: `Puerto ${req.params.id} tiene estructura inválida`
    });
  }
  
  return res.json({
    success: true,
    data: puerto
  });
}

function getNearbyPuertos(req, res) {
  const data = loadPuertos();
  const { lat, lng, radius = 50 } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros requeridos: lat, lng'
    });
  }
  
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = parseFloat(radius);
  
  if (isNaN(userLat) || isNaN(userLng) || isNaN(radiusKm)) {
    return res.status(400).json({
      success: false,
      error: 'Coordenadas y radius deben ser números'
    });
  }
  
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  const nearby = data.puertos
    .filter(validarPuerto)
    .map(p => ({
      ...p,
      distancia_km: haversine(userLat, userLng, p.latitud, p.longitud)
    }))
    .filter(p => p.distancia_km <= radiusKm)
    .sort((a, b) => a.distancia_km - b.distancia_km);
  
  return res.json({
    success: true,
    origin: { lat: userLat, lng: userLng },
    radius_km: radiusKm,
    count: nearby.length,
    data: nearby
  });
}

module.exports = {
  getAllPuertos,
  searchPuertos,
  getPuertoById,
  getNearbyPuertos,
  loadPuertos,
  validarPuerto
};
