// src/routes/map-routes.js
const express = require('express');
const router  = express.Router();
const { getCapasRuta } = require('../services/map-service');

/**
 * GET /api/mapa/capas?lat1=X&lng1=X&lat2=X&lng2=X&buffer_mn=10
 *
 * Retorna GeoJSON de las 3 capas PostGIS recortadas al BBOX de la ruta.
 * MapLibre GL JS consume este endpoint directamente en P4.
 */
router.get('/capas', async (req, res) => {
  try {
    const { lat1, lng1, lat2, lng2, buffer_mn } = req.query;

    // Validación
    if (!lat1 || !lng1 || !lat2 || !lng2) {
      return res.status(400).json({
        error: 'Parámetros requeridos: lat1, lng1, lat2, lng2',
      });
    }

    const coords = {
      lat1: parseFloat(lat1),
      lng1: parseFloat(lng1),
      lat2: parseFloat(lat2),
      lng2: parseFloat(lng2),
      buffer_mn: buffer_mn ? parseFloat(buffer_mn) : 10,
    };

    // Validar que son coordenadas reales
    for (const [key, val] of Object.entries(coords)) {
      if (isNaN(val)) {
        return res.status(400).json({ error: `Valor inválido para ${key}: ${req.query[key]}` });
      }
    }

    const capas = await getCapasRuta(coords);

    // Cache de 3 minutos — las capas no cambian frecuentemente
    res.set('Cache-Control', 'public, max-age=180');
    res.json(capas);

  } catch (err) {
    console.error('[map-routes] Error:', err.message);
    res.status(500).json({
      error: 'Error consultando PostGIS',
      detalle: err.message,
    });
  }
});

/**
 * GET /api/mapa/seamarks?lat=X&lng=X&radio_mn=5
 *
 * Seamarks cercanos a un punto — útil para P4 al acercarse a un puerto.
 */
router.get('/seamarks', async (req, res) => {
  try {
    const { lat, lng, radio_mn } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Parámetros requeridos: lat, lng' });
    }

    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const radio = radio_mn ? parseFloat(radio_mn) : 5;

    const capas = await getCapasRuta({
      lat1: latN, lng1: lngN,
      lat2: latN, lng2: lngN,
      buffer_mn: radio,
    });

    res.set('Cache-Control', 'public, max-age=180');
    res.json(capas.seamarks);

  } catch (err) {
    console.error('[map-routes] Error seamarks:', err.message);
    res.status(500).json({ error: 'Error consultando seamarks', detalle: err.message });
  }
});

module.exports = router;
