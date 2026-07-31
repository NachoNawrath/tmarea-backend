/**
 * tide-routes.js
 * Router Express para predicción de marea basada en análisis armónico propio.
 *
 * Registrar en src/index.js:
 *   const tideRoutes = require('./routes/tide-routes');
 *   app.use('/api/tide', tideRoutes);
 */

const express = require('express');
const router = express.Router();
const tps = require('../services/tide-prediction-service');

// ─── Rate limiting simple (mismo patrón que marine-weather-routes.js) ────────
const _rl = new Map();
function rateLimiter(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = _rl.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60_000; }
  entry.count++;
  _rl.set(ip, entry);
  if (entry.count > 60) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Máximo 60 por minuto.' });
  }
  if (_rl.size > 5000) {
    for (const [k, v] of _rl) { if (now > v.reset) _rl.delete(k); }
  }
  next();
}

function parseLatLon(query) {
  const lat = parseFloat(query.lat);
  const lon = parseFloat(query.lon);
  const errores = [];
  if (query.lat === undefined || Number.isNaN(lat) || lat < -90 || lat > 90) {
    errores.push('lat debe ser un número decimal entre -90 y 90');
  }
  if (query.lon === undefined || Number.isNaN(lon) || lon < -180 || lon > 180) {
    errores.push('lon debe ser un número decimal entre -180 y 180');
  }
  return { lat, lon, errores };
}

function parseOptionalDate(value, fallback) {
  if (value === undefined) return { date: fallback, error: null };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: null, error: `fecha inválida: ${value}` };
  return { date: d, error: null };
}

// ─── GET /api/tide/predict ────────────────────────────────────────────────
/**
 * Query: lat, lon (requeridos), datetime (ISO8601, default: ahora)
 * 200: { height_m, trend, next_high, next_low, station_used, distance_mn, disclaimer }
 * 400: parámetros inválidos | 503 sin estación a menos de 50mn
 */
router.get('/predict', rateLimiter, (req, res) => {
  const { lat, lon, errores } = parseLatLon(req.query);
  const { date: datetime, error: dateErr } = parseOptionalDate(req.query.datetime, new Date());
  if (dateErr) errores.push(dateErr);
  if (errores.length) return res.status(400).json({ error: 'Parámetros inválidos', detalle: errores });

  try {
    const current = tps.predictTide(lat, lon, datetime);
    if (current.error) return res.status(503).json(current);

    const hl = tps.nextHighLow(lat, lon, datetime);

    return res.json({
      height_m: current.height_m,
      trend: current.trend,
      next_high: hl.next_high,
      next_low: hl.next_low,
      station_used: current.station_used,
      distance_mn: current.distance_nm,
      disclaimer: current.disclaimer,
    });
  } catch (err) {
    console.error('[tide/predict] Error interno:', err.message);
    return res.status(500).json({ error: 'No fue posible calcular la predicción de marea.' });
  }
});

// ─── GET /api/tide/curve ──────────────────────────────────────────────────
/**
 * Query: lat, lon (requeridos), from (ISO8601, default: ahora), hours (default 24, máx 240)
 * 200: { station_used, distance_mn, points: [{time, height_m}, ...], disclaimer }
 */
router.get('/curve', rateLimiter, (req, res) => {
  const { lat, lon, errores } = parseLatLon(req.query);
  const { date: from, error: dateErr } = parseOptionalDate(req.query.from, new Date());
  if (dateErr) errores.push(dateErr);

  const hours = req.query.hours !== undefined ? parseFloat(req.query.hours) : 24;
  if (Number.isNaN(hours) || hours <= 0 || hours > 240) {
    errores.push('hours debe ser un número entre 0 y 240');
  }

  if (errores.length) return res.status(400).json({ error: 'Parámetros inválidos', detalle: errores });

  try {
    const result = tps.tideCurve(lat, lon, from, hours);
    if (result.error) return res.status(503).json(result);

    return res.json({
      station_used: result.station_used,
      distance_mn: result.distance_nm,
      points: result.points,
      disclaimer: result.disclaimer,
    });
  } catch (err) {
    console.error('[tide/curve] Error interno:', err.message);
    return res.status(500).json({ error: 'No fue posible calcular la curva de marea.' });
  }
});

// ─── POST /api/tide/curve-ruta ────────────────────────────────────────────
/**
 * Curva de marea multi-estación a lo largo de una ruta.
 *
 * NOTA: la spec P4 lo describía como GET, pero `ruta_puntos` es un array de
 * objetos {lat,lng} que no cabe razonablemente en un query string. Se
 * implementa como POST con body JSON, igual que los endpoints hermanos
 * /api/sitport/weather-ruta y /restricciones-ruta.
 *
 * Body: {
 *   ruta_puntos: [{ lat, lng }, ...]  (requerido, >= 1 punto)
 *   hora_zarpe: ISO8601                (requerido)
 *   velocidad_nudos: number > 0        (requerido)
 * }
 * 200: { ok, estaciones_ruta: [...], disclaimer }
 * 400: parámetros inválidos
 */
router.post('/curve-ruta', rateLimiter, (req, res) => {
  const { ruta_puntos, hora_zarpe, velocidad_nudos } = req.body || {};
  const errores = [];

  if (!Array.isArray(ruta_puntos) || ruta_puntos.length < 1) {
    errores.push('ruta_puntos debe ser un array con al menos un punto {lat, lng}');
  } else {
    const puntoInvalido = ruta_puntos.some((p) => {
      const lat = p && parseFloat(p.lat);
      const lon = p && parseFloat(p.lng != null ? p.lng : p.lon);
      return Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lon) || lon < -180 || lon > 180;
    });
    if (puntoInvalido) errores.push('ruta_puntos contiene coordenadas inválidas');
  }

  const { date: zarpe, error: dateErr } = parseOptionalDate(hora_zarpe, null);
  if (hora_zarpe === undefined || zarpe === null) errores.push('hora_zarpe es requerida (ISO8601)');
  if (dateErr) errores.push(dateErr);

  const vel = parseFloat(velocidad_nudos);
  if (Number.isNaN(vel) || vel <= 0) errores.push('velocidad_nudos debe ser un número mayor que 0');

  if (errores.length) return res.status(400).json({ ok: false, error: 'Parámetros inválidos', detalle: errores });

  try {
    const result = tps.tideCurveRuta(ruta_puntos, zarpe, vel);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[tide/curve-ruta] Error interno:', err.message);
    return res.status(500).json({ ok: false, error: 'No fue posible calcular la curva de marea de la ruta.' });
  }
});

// ─── GET /api/tide/stations ───────────────────────────────────────────────
router.get('/stations', rateLimiter, (req, res) => {
  res.json({ stations: tps.listStations() });
});

// ─── GET /api/tide/health ─────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', ...tps.getHealthInfo() });
});

module.exports = router;
