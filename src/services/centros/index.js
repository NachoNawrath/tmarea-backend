const express = require('express');
const centrosService = require('../centros-service');

const router = express.Router();
centrosService.loadCentros();

router.get('/', (req, res) => {
  const { estado } = req.query;
  const centros = estado ? centrosService.getAll(estado) : centrosService.getAll();
  res.json({ count: centros.length, data: centros });
});

router.get('/stats', (req, res) => {
  const stats = centrosService.getStats();
  res.json(stats);
});

router.get('/region/:region', (req, res) => {
  const centros = centrosService.getByRegion(req.params.region);
  res.json({ region: req.params.region, count: centros.length, data: centros });
});

router.get('/comuna/:comuna', (req, res) => {
  const centros = centrosService.getByComuna(req.params.comuna);
  res.json({ comuna: req.params.comuna, count: centros.length, data: centros });
});

router.get('/empresa/:empresa', (req, res) => {
  const centros = centrosService.getByEmpresa(req.params.empresa);
  res.json({ empresa: req.params.empresa, count: centros.length, data: centros });
});

router.get('/proximidad/:lat/:lng', (req, res) => {
  const { lat, lng } = req.params;
  const distance = req.query.distancia ? parseInt(req.query.distancia) : 25;
  const centros = centrosService.getByProximity(parseFloat(lat), parseFloat(lng), distance);
  res.json({ origen: { lat: parseFloat(lat), lng: parseFloat(lng) }, distancia_km: distance, count: centros.length, data: centros });
});

router.get('/id/:id', (req, res) => {
  const centro = centrosService.getById(parseInt(req.params.id));
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' });
  res.json(centro);
});

module.exports = router;
