const centrosService = require('../services/centros-acuicolas-service');
const express = require('express');
const router = express.Router();

router.get('/', centrosService.getAllCentros);
router.get('/search', centrosService.searchCentros);
router.get('/nearby', centrosService.getNearbyCentros);
router.get('/:id', centrosService.getCentroById);

module.exports = router;
