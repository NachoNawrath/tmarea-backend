const express = require('express');
const router = express.Router();
const mitilidos = require('../services/mitilidos-service');

// Cargar datos al iniciar
mitilidos.loadMitilidos();

// GET /api/mitilidos - Obtener todas las concesiones
router.get('/', (req, res) => {
  try {
    const resultado = mitilidos.buscarPorRegion('');
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mitilidos/proximidad?lat=X&lon=Y&radius=Z
// Buscar concesiones cercanas a una ubicación
router.get('/proximidad', (req, res) => {
  try {
    const { lat, lon, radius } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Se requieren lat y lon' });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const radiusNum = radius ? parseFloat(radius) : 50;

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ error: 'lat y lon deben ser números válidos' });
    }

    const resultado = mitilidos.buscarPorProximidad(latNum, lonNum, radiusNum);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mitilidos/comuna?nombre=X
// Buscar por comuna
router.get('/comuna', (req, res) => {
  try {
    const { nombre } = req.query;

    if (!nombre) {
      return res.status(400).json({ error: 'Se requiere parámetro "nombre"' });
    }

    const resultado = mitilidos.buscarPorComuna(nombre);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mitilidos/region?nombre=X
// Buscar por región
router.get('/region', (req, res) => {
  try {
    const { nombre } = req.query;

    if (!nombre) {
      return res.status(400).json({ error: 'Se requiere parámetro "nombre"' });
    }

    const resultado = mitilidos.buscarPorRegion(nombre);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mitilidos/especie?nombre=X
// Buscar por especie (chorito, cholga, choro, ostra)
router.get('/especie', (req, res) => {
  try {
    const { nombre } = req.query;

    if (!nombre) {
      return res.status(400).json({ error: 'Se requiere parámetro "nombre"' });
    }

    const resultado = mitilidos.buscarPorEspecie(nombre);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mitilidos/titular?nombre=X
// Buscar por titular (empresa o productor)
router.get('/titular', (req, res) => {
  try {
    const { nombre } = req.query;

    if (!nombre) {
      return res.status(400).json({ error: 'Se requiere parámetro "nombre"' });
    }

    const resultado = mitilidos.buscarPorTitular(nombre);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mitilidos/estadisticas
// Obtener estadísticas: total por región, comuna, especies
router.get('/estadisticas', (req, res) => {
  try {
    const resultado = mitilidos.obtenerEstadisticas();
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
