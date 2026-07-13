const puertosService = require('../services/puertos-service');
const express = require('express');
const router = express.Router();

// Obtener todos los puertos
router.get('/', async (req, res) => {
  try {
    const puertos = await puertosService.getPuertos();
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
    const puertos = await puertosService.getPuertosByProvincia(req.params.provincia);
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
      parseFloat(radius)
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