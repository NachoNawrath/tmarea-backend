const puertosService = require('../services/puertos-service');
const express = require('express');
const router = express.Router();

// Obtener todos los puertos
router.get('/', async (req, res) => {
  try {
    const { q, search, limit, incluir_sitport } = req.query;
    const query = (q || search || '').trim();
    const opciones = { incluirSitport: incluir_sitport === 'true' };
    let puertos;
    if (query.length >= 2) {
      puertos = await puertosService.searchPuertos(query, parseInt(limit) || 8, opciones);
    } else {
      puertos = await puertosService.getPuertos(opciones);
    }
    res.json({
      success: true,
      count: puertos.length,
      data: puertos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Buscar por provincia
router.get('/provincia/:provincia', async (req, res) => {
  try {
    const puertos = await puertosService.getPuertosByProvincia(req.params.provincia, { incluirSitport: req.query.incluir_sitport === 'true' });
    res.json({
      success: true,
      count: puertos.length,
      data: puertos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Buscar por proximidad
router.get('/proximidad/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const radius = req.query.radius || 50;
    const puertos = await puertosService.getPuertosByProximidad(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius),
      { incluirSitport: req.query.incluir_sitport === 'true' }
    );
    res.json({
      success: true,
      count: puertos.length,
      data: puertos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;