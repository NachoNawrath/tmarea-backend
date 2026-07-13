const fs = require('fs');
const path = require('path');

const CENTROS_DATA_PATH = path.join(__dirname, './data/centros_acuicolas_sur.json');

function loadCentros() {
  try {
    const rawData = fs.readFileSync(CENTROS_DATA_PATH, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error cargando centros:', error.message);
    return { centros_acuicolas: [], metadata: {} };
  }
}

function validarCentro(centro) {
  const campos = ['id', 'nombre', 'latitud_centroide', 'longitud_centroide', 'especie', 'estado'];
  return campos.every(c => centro.hasOwnProperty(c));
}

function getAllCentros(req, res) {
  const data = loadCentros();
  const centros = data.centros_acuicolas.filter(c => c.estado === 'otorgada' && validarCentro(c));
  res.json({ success: true, count: centros.length, data: centros, metadata: data.metadata });
}

function searchCentros(req, res) {
  const data = loadCentros();
  let centros = data.centros_acuicolas.filter(c => c.estado === 'otorgada' && validarCentro(c));
  const { q, especie, region } = req.query;
  
  if (q) {
    const term = q.toLowerCase();
    centros = centros.filter(c => c.nombre.toLowerCase().includes(term) || c.id.toLowerCase().includes(term) || c.titular.toLowerCase().includes(term));
  }
  if (especie) centros = centros.filter(c => c.especie === especie);
  if (region) centros = centros.filter(c => c.region === region);
  
  res.json({ success: true, query: { q, especie, region }, count: centros.length, data: centros, metadata: data.metadata });
}

function getCentroById(req, res) {
  const data = loadCentros();
  const centro = data.centros_acuicolas.find(c => c.id === req.params.id);
  if (!centro) return res.status(404).json({ success: false, error: `Centro ${req.params.id} no encontrado` });
  if (!validarCentro(centro)) return res.status(500).json({ success: false, error: 'Estructura inválida' });
  res.json({ success: true, data: centro });
}

function getNearbyCentros(req, res) {
  const data = loadCentros();
  const { lat, lng, radius = 50 } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, error: 'Requerido: lat, lng' });
  
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = parseFloat(radius);
  if (isNaN(userLat) || isNaN(userLng) || isNaN(radiusKm)) return res.status(400).json({ success: false, error: 'Valores inválidos' });
  
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  const nearby = data.centros_acuicolas.filter(c => c.estado === 'otorgada' && validarCentro(c)).map(c => ({ ...c, distancia_km: haversine(userLat, userLng, c.latitud_centroide, c.longitud_centroide) })).filter(c => c.distancia_km <= radiusKm).sort((a, b) => a.distancia_km - b.distancia_km);
  
  res.json({ success: true, origin: { lat: userLat, lng: userLng }, radius_km: radiusKm, count: nearby.length, data: nearby });
}

module.exports = { getAllCentros, searchCentros, getCentroById, getNearbyCentros, loadCentros, validarCentro };
