const puertosService = require('../services/puertos-service');
const express = require('express');
const router = express.Router();

router.get('/', puertosService.getAllPuertos);
router.get('/search', puertosService.searchPuertos);
router.get('/nearby', puertosService.getNearbyPuertos);
router.get('/:id', puertosService.getPuertoById);

module.exports = router;
