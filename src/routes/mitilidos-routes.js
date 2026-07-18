'use strict';

const express          = require('express');
const router           = express.Router();
const mitilidosService = require('../services/mitilidos-service');

// ─────────────────────────────────────────────
//  Rate limiting por IP (sin dependencias externas)
// ─────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000;  // 1 minuto
const RATE_LIMIT_MAX       = 60;          // 60 requests/minuto por IP

const rateLimitStore = new Map();

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

  // Limpieza periódica para evitar memory leak (cada 500 entradas)
  if (rateLimitStore.size > 500) {
    for (const [key, val] of rateLimitStore) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(key);
    }
  }

  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error:   'Demasiadas solicitudes',
      detalle: `Máximo ${RATE_LIMIT_MAX} requests por minuto`,
      retry_after_ms: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
    });
  }

  next();
}

// ─────────────────────────────────────────────
//  Helper de respuesta de error
// ─────────────────────────────────────────────
function errorResponse(res, status, mensaje, detalle = null) {
  const body = { error: mensaje };
  if (detalle) body.detalle = detalle;
  return res.status(status).json(body);
}

// ─────────────────────────────────────────────
//  Aplicar rate limiting a todas las rutas
// ─────────────────────────────────────────────
router.use(rateLimiter);

// ─────────────────────────────────────────────
//  GET /api/mitilidos/search?q=...
//  Búsqueda unificada — campo principal de P2
//  Busca por: código centro, n° pertinencia,
//  titular, ubicación, comuna, especie
// ─────────────────────────────────────────────
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return errorResponse(res, 400, 'Parámetro q requerido');

    const resultado = mitilidosService.search(q);
    return res.json(resultado);
  } catch (e) {
    if (e.message.includes('caracteres') || e.message.includes('vacío') || e.message.includes('excede')) {
      return errorResponse(res, 400, 'Query inválido', e.message);
    }
    console.error('[mitilidos/search]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/mitilidos/codigo/:codigo
//  Busca por código RNA/SERNAPESCA
//  Ej: /api/mitilidos/codigo/100339
// ─────────────────────────────────────────────
router.get('/codigo/:codigo', (req, res) => {
  try {
    const resultado = mitilidosService.buscarPorCodigo(req.params.codigo);
    return res.json(resultado);
  } catch (e) {
    if (e.message.includes('caracteres') || e.message.includes('permitidos')) {
      return errorResponse(res, 400, 'Código inválido', e.message);
    }
    console.error('[mitilidos/codigo]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/mitilidos/titular?nombre=...
//  Busca por nombre o apellido del titular
// ─────────────────────────────────────────────
router.get('/titular', (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) return errorResponse(res, 400, 'Parámetro nombre requerido');

    const resultado = mitilidosService.buscarPorTitular(nombre);
    return res.json(resultado);
  } catch (e) {
    if (e.message.includes('caracteres') || e.message.includes('permitidos')) {
      return errorResponse(res, 400, 'Nombre inválido', e.message);
    }
    console.error('[mitilidos/titular]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/mitilidos/especie?nombre=...
//  Busca por especie: chorito, cholga, choro,
//  ostion, ostra, etc.
// ─────────────────────────────────────────────
router.get('/especie', (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) return errorResponse(res, 400, 'Parámetro nombre requerido');

    const resultado = mitilidosService.buscarPorEspecie(nombre);
    return res.json(resultado);
  } catch (e) {
    if (e.message.includes('caracteres') || e.message.includes('permitidos')) {
      return errorResponse(res, 400, 'Especie inválida', e.message);
    }
    console.error('[mitilidos/especie]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/mitilidos/comuna?nombre=...
// ─────────────────────────────────────────────
router.get('/comuna', (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) return errorResponse(res, 400, 'Parámetro nombre requerido');

    const resultado = mitilidosService.buscarPorComuna(nombre);
    return res.json(resultado);
  } catch (e) {
    if (e.message.includes('caracteres') || e.message.includes('permitidos')) {
      return errorResponse(res, 400, 'Comuna inválida', e.message);
    }
    console.error('[mitilidos/comuna]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/mitilidos/region?nombre=...
// ─────────────────────────────────────────────
router.get('/region', (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) return errorResponse(res, 400, 'Parámetro nombre requerido');

    const resultado = mitilidosService.buscarPorRegion(nombre);
    return res.json(resultado);
  } catch (e) {
    if (e.message.includes('caracteres') || e.message.includes('permitidos')) {
      return errorResponse(res, 400, 'Región inválida', e.message);
    }
    console.error('[mitilidos/region]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/mitilidos/proximidad?lat=...&lng=...&radio=...
//  Busca concesiones cercanas a una posición GPS
//  radio en km, máximo 200, default 50
// ─────────────────────────────────────────────
router.get('/proximidad', (req, res) => {
  try {
    const { lat, lng, radio } = req.query;
    if (!lat || !lng) return errorResponse(res, 400, 'Parámetros lat y lng requeridos');

    const resultado = mitilidosService.buscarPorProximidad(lat, lng, radio);
    return res.json(resultado);
  } catch (e) {
    if (e.message.includes('inválid') || e.message.includes('radio')) {
      return errorResponse(res, 400, 'Coordenadas inválidas', e.message);
    }
    console.error('[mitilidos/proximidad]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/mitilidos/stats
//  Estadísticas generales de la base de datos
// ─────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    return res.json(mitilidosService.obtenerEstadisticas());
  } catch (e) {
    console.error('[mitilidos/stats]', e.message);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ─────────────────────────────────────────────
//  GET /api/mitilidos/status
//  Health check del servicio
// ─────────────────────────────────────────────
router.get('/status', (req, res) => {
  return res.json(mitilidosService.getStatus());
});

module.exports = router;