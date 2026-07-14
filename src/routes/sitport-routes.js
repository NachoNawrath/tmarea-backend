const express = require('express');
const sitportService = require('../services/sitport-service');
const router = express.Router();

router.get('/restricciones', async (req, res) => {
  try {
    const data = await sitportService.consultaRestricciones();
    res.json({ success: true, data, error: null });
  } catch (error) {
    res.status(502).json({ success: false, data: [], error: error.message });
  }
});

router.get('/bahias', async (req, res) => {
  try {
    const data = await sitportService.consultaBahias();
    res.json({ success: true, data, error: null });
  } catch (error) {
    res.status(502).json({ success: false, data: [], error: error.message });
  }
});

router.get('/pronostico', async (req, res) => {
  try {
    const data = await sitportService.totalPronostico();
    res.json({ success: true, data, error: null });
  } catch (error) {
    res.status(502).json({ success: false, data: [], error: error.message });
  }
});

module.exports = router;
