/**
 * marine-weather-routes.js
 * Router Express para análisis ambiental de pesca artesanal.
 * 
 * Registrar en src/index.js:
 *   const marineWeatherRoutes = require('./routes/marine-weather-routes');
 *   app.use('/api/marine-weather', marineWeatherRoutes);
 */

const express = require('express');
const router  = express.Router();
const { analizar } = require('../services/marine-weather-service');

// ─── Rate limiting simple (mismo patrón que mitilidos-routes.js) ─────────────
const _rl = new Map();
function rateLimiter(req, res, next) {
  const ip  = req.ip || 'unknown';
  const now = Date.now();
  const entry = _rl.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60_000; }
  entry.count++;
  _rl.set(ip, entry);
  if (entry.count > 30) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' });
  }
  // Limpieza periódica
  if (_rl.size > 5000) {
    for (const [k, v] of _rl) { if (now > v.reset) _rl.delete(k); }
  }
  next();
}

// ─── GET /api/marine-weather/analyze ─────────────────────────────────────────
/**
 * Parámetros query (todos requeridos):
 *   lat        (float)  Latitud decimal negativa  Ej: -42.4567
 *   lng        (float)  Longitud decimal negativa Ej: -73.1234
 *   especie_id (int)    ID de la especie en especies_pesca.json (1-7)
 * 
 * Respuesta 200:
 *   { especie, sst_actual, clorofila_actual, condicion_optima,
 *     consejo_dinamico, normativa_sernapesca, regulacion_minsal,
 *     seguridad_navegacion, alerta_FAN, oleaje, ... }
 * 
 * Errores: 400 parámetros inválidos | 404 especie no encontrada | 503 sin datos
 */
router.get('/analyze', rateLimiter, async (req, res) => {
  const { lat, lng, especie_id } = req.query;

  // Validación de parámetros
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  const espId = parseInt(especie_id, 10);

  const errores = [];
  if (lat === undefined || isNaN(latN) || latN < -90 || latN > 90)
    errores.push('lat debe ser un número decimal entre -90 y 90');
  if (lng === undefined || isNaN(lngN) || lngN < -180 || lngN > 180)
    errores.push('lng debe ser un número decimal entre -180 y 180');
  if (especie_id === undefined || isNaN(espId) || espId < 1)
    errores.push('especie_id debe ser un entero positivo');

  // Restricción geográfica: solo Chile (aproximado)
  if (!errores.length && (latN > -15 || latN < -60))
    errores.push('lat fuera del rango de cobertura chilena (-15 a -60)');
  if (!errores.length && (lngN > -65 || lngN < -110))
    errores.push('lng fuera del rango de cobertura chilena (-65 a -110)');

  if (errores.length > 0) {
    return res.status(400).json({ error: 'Parámetros inválidos', detalle: errores });
  }

  try {
    const reporte = await analizar(latN, lngN, espId);
    return res.json(reporte);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[marine-weather/analyze] Error interno:', err.message);
    return res.status(503).json({
      error: 'No fue posible completar el análisis ambiental.',
      detalle: err.message,
    });
  }
});

// ─── GET /api/marine-weather/especies ────────────────────────────────────────
// Devuelve el listado de especies para poblar el dropdown del frontend
router.get('/especies', rateLimiter, (req, res) => {
  try {
    const path = require('path');
    const especies = require(path.join(process.cwd(), 'especies_pesca.json'));
    const lista = especies.map(({ id, especie, nombre_cientifico }) => ({
      id, especie, nombre_cientifico,
    }));
    return res.json({ count: lista.length, data: lista });
  } catch (err) {
    return res.status(503).json({ error: 'No se pudo cargar el listado de especies.' });
  }
});

// ─── GET /api/marine-weather/status ──────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({ ok: true, servicio: 'marine-weather', version: '1.0.0' });
});

module.exports = router;