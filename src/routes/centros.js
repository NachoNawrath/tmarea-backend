const centrosService = require('../services/centros-service');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, limit } = req.query;
    let centros;
    if (search && search.trim().length >= 2) {
      centros = centrosService.search(search.trim(), parseInt(limit) || 10);
    } else {
      centros = centrosService.getAll();
    }
    res.json({ count: centros.length, data: centros });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;