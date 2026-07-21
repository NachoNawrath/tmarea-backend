const express          = require('express');
const router           = express.Router();
const mitilidosService = require('../services/mitilidos-service');

// ─────────────────────────────────────────────
//  Rate limiting por IP (sin dependencias externas)
// ─────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX       = 60;
const rateLimitStore       = new Map();

function rateLimiter(req, res, next) {
  const ip  = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 1 };
  } else {
    entry.count++;
  }
  rateLimitStore.set(ip, entry);
  if (rateLimitStore.size > 500) {
    for (const [key, val] of rateLimitStore) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(key);
    }
  }
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Demasiadas solicitudes',
      detalle: `Máximo ${RATE_LIMIT_MAX} requests por minuto`,
      retry_after_ms: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
    });
  }
  next();
}

function errorResponse(res, status, mensaje, detalle = null) {
  return res.status(status).json({ error: mensaje, ...(detalle ? { detalle } : {}) });
}

router.use(rateLimiter);

// ─────────────────────────────────────────────
//  GET /api/concesiones
//  Búsqueda general. Params: q, grupo, comuna, region, limit
// ─────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { q = '', grupo, comuna, region, limit } = req.query;
    const resultado = mitilidosService.search(q, {
      grupo, comuna, region,
      limit: limit ? parseInt(limit) : 20
    });
    return res.json({ success: true, count: resultado.length, data: resultado });
  } catch (e) {
    if (e.message.includes('larga') || e.message.includes('permitidos')) {
      return errorResponse(res, 400, e.message);
    }
    console.error('[concesiones/]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/concesiones/grupos
//  Lista de grupos disponibles con conteo
// ─────────────────────────────────────────────
router.get('/grupos', (req, res) => {
  try {
    return res.json({ success: true, data: mitilidosService.getGrupos() });
  } catch (e) {
    console.error('[concesiones/grupos]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/concesiones/grupo/:grupo
//  Todas las concesiones de un grupo específico
//  Ej: /api/concesiones/grupo/MOLUSCOS
// ─────────────────────────────────────────────
router.get('/grupo/:grupo', (req, res) => {
  try {
    const { limit } = req.query;
    const resultado = mitilidosService.buscarPorGrupo(req.params.grupo, {
      limit: limit ? parseInt(limit) : 500
    });
    return res.json({ success: true, count: resultado.length, data: resultado });
  } catch (e) {
    console.error('[concesiones/grupo]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/concesiones/proximidad?lat=...&lng=...&radio=...&grupo=...
//  Concesiones cercanas a una posición GPS
// ─────────────────────────────────────────────
router.get('/proximidad', (req, res) => {
  try {
    const { lat, lng, radio, grupo } = req.query;
    if (!lat || !lng) return errorResponse(res, 400, 'Parámetros lat y lng requeridos');
    const resultado = mitilidosService.buscarPorProximidad(
      parseFloat(lat), parseFloat(lng), radio, { grupo }
    );
    return res.json({ success: true, count: resultado.length, data: resultado });
  } catch (e) {
    if (e.message.includes('inválid') || e.message.includes('radio')) {
      return errorResponse(res, 400, 'Coordenadas inválidas', e.message);
    }
    console.error('[concesiones/proximidad]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/concesiones/stats
// ─────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    return res.json(mitilidosService.obtenerEstadisticas());
  } catch (e) {
    console.error('[concesiones/stats]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/concesiones/status
// ─────────────────────────────────────────────
router.get('/status', (req, res) => {
  return res.json(mitilidosService.getStatus());
});

module.exports = router;
