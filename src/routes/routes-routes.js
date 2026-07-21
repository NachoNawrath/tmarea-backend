// src/routes/routes-routes.js
// Tmarea — Endpoints de rutas náuticas australes

const express = require('express');
const router  = express.Router();
const {
  getAllRoutes,
  getAllEstaciones,
  getReglas,
  getAreas,
  getRoutesInBbox,
} = require('../services/routes-service');

// GET /api/rutas
// Devuelve todas las rutas con waypoints ensamblados
// Query opcional: ?bbox=lat1,lon1,lat2,lon2 para filtrar por área
router.get('/', (req, res) => {
  try {
    const { bbox } = req.query;

    if (bbox) {
      const parts = bbox.split(',').map(Number);
      if (parts.length !== 4 || parts.some(isNaN)) {
        return res.status(400).json({
          error: 'bbox inválido. Formato: ?bbox=lat1,lon1,lat2,lon2',
        });
      }
      const [lat1, lon1, lat2, lon2] = parts;
      const rutas = getRoutesInBbox(lat1, lon1, lat2, lon2);
      return res.json({ count: rutas.length, data: rutas });
    }

    const rutas = getAllRoutes();
    res.json({ count: rutas.length, data: rutas });
  } catch (err) {
    console.error('[routes-routes] GET /api/rutas error:', err.message);
    res.status(500).json({ error: 'Error cargando rutas náuticas' });
  }
});

// GET /api/rutas/estaciones
// Devuelve estaciones de prácticos con sus waypoints
router.get('/estaciones', (req, res) => {
  try {
    const estaciones = getAllEstaciones();
    res.json({ count: estaciones.length, data: estaciones });
  } catch (err) {
    console.error('[routes-routes] GET /api/rutas/estaciones error:', err.message);
    res.status(500).json({ error: 'Error cargando estaciones' });
  }
});

// GET /api/rutas/areas
// Devuelve las áreas geográficas definidas
router.get('/areas', (req, res) => {
  try {
    const areas = getAreas();
    res.json({ count: areas.length, data: areas });
  } catch (err) {
    console.error('[routes-routes] GET /api/rutas/areas error:', err.message);
    res.status(500).json({ error: 'Error cargando áreas' });
  }
});

// GET /api/rutas/reglas
// Devuelve las reglas del motor de decisión navegacional
router.get('/reglas', (req, res) => {
  try {
    const reglas = getReglas();
    res.json({ count: reglas.length, data: reglas });
  } catch (err) {
    console.error('[routes-routes] GET /api/rutas/reglas error:', err.message);
    res.status(500).json({ error: 'Error cargando reglas' });
  }
});

// GET /api/rutas/:id
// Devuelve una ruta específica por id
router.get('/:id', (req, res) => {
  try {
    const rutas = getAllRoutes();
    const ruta = rutas.find(r => r.id === req.params.id);
    if (!ruta) {
      return res.status(404).json({ error: `Ruta '${req.params.id}' no encontrada` });
    }
    res.json(ruta);
  } catch (err) {
    console.error('[routes-routes] GET /api/rutas/:id error:', err.message);
    res.status(500).json({ error: 'Error cargando ruta' });
  }
});

module.exports = router;
