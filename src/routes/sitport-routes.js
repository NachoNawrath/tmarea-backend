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


router.post('/restricciones', async (req, res) => {
  try {
    const { puerto } = req.body;
    const data = await sitportService.consultaRestricciones();
    if (!puerto) return res.json({ success: true, data, error: null });
    const filtradas = data.filter(r =>
      (() => { const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); const skip = ['caleta','bahia','puerto','ensenada','canal','punta','seno','rada','isla','lago','golfo']; const p = norm(puerto); const words = norm(r.GLBahia || '').split(/\s+/).filter(w => w.length > 3 && !skip.includes(w)); return words.length > 0 && words.some(w => p.includes(w)); })()
    );
    const timestamp = new Date().toISOString();
    res.json({ success: true, restricciones: filtradas, timestamp, error: null });
  } catch (error) {
    res.status(502).json({ success: false, restricciones: [], error: error.message });
  }
});

module.exports = router;
