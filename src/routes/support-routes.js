'use strict';

const express    = require('express');
const router     = express.Router();
const { sequelize } = require('../models/index');

// ─── Tabla ─────────────────────────────────────────────────────────────────
async function ensureTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS reportes_incidencias (
      id                SERIAL PRIMARY KEY,
      descripcion       TEXT NOT NULL,
      screenshot_base64 TEXT,
      pantalla_actual   VARCHAR(50),
      datos_viaje       JSONB,
      navegador         VARCHAR(200),
      coordenadas_gps   JSONB,
      version_app       VARCHAR(20),
      nombre_usuario    VARCHAR(200),
      perfil_usuario    VARCHAR(50),
      estado            VARCHAR(20) DEFAULT 'pendiente',
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);
}
ensureTable().catch(err =>
  console.error('[SUPPORT] Error creando tabla reportes_incidencias:', err.message)
);

// ─── Rate limiting: 3 reportes por IP por hora ─────────────────────────────
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX       = 3;
const rateLimitStore = new Map();

function rateLimiter(req, res, next) {
  const ip  = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    entry = { windowStart: now, count: 1 };
  } else {
    entry.count++;
  }
  rateLimitStore.set(ip, entry);
  if (rateLimitStore.size > 500) {
    for (const [key, val] of rateLimitStore) {
      if (now - val.windowStart > RATE_WINDOW_MS) rateLimitStore.delete(key);
    }
  }
  if (entry.count > RATE_MAX) {
    return res.status(429).json({
      error: 'Demasiadas solicitudes',
      detalle: `Máximo ${RATE_MAX} reportes por hora`,
      retry_after_ms: RATE_WINDOW_MS - (now - entry.windowStart),
    });
  }
  next();
}

// ─── Email (opcional, solo si SMTP configurado) ────────────────────────────
async function enviarEmailReporte(reporte) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.log(`[REPORT] Reporte #${reporte.id} guardado sin envío de email (SMTP no configurado)`);
    return;
  }

  const nodemailer  = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });

  const fecha = new Date(reporte.created_at).toLocaleString('es-CL');

  const attachments = [];
  if (reporte.screenshot_base64) {
    attachments.push({
      filename:    `screenshot-reporte-${reporte.id}.jpg`,
      content:     reporte.screenshot_base64.replace(/^data:image\/\w+;base64,/, ''),
      encoding:    'base64',
      contentType: 'image/jpeg',
    });
  }

  const gpsStr = reporte.coordenadas_gps
    ? `${reporte.coordenadas_gps.lat}, ${reporte.coordenadas_gps.lon}`
    : 'No disponible';

  const html = `
    <h2 style="color:#0A2647">Nuevo reporte de incidencia — Tmarea #${reporte.id}</h2>
    <p><strong>Descripción:</strong></p>
    <blockquote style="background:#f4f4f4;padding:12px;border-left:4px solid #1A6EBD;font-size:15px">
      ${reporte.descripcion}
    </blockquote>
    <table cellpadding="8" cellspacing="0" border="1"
      style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-top:16px">
      <tr>
        <th align="left" style="background:#f0f0f0;min-width:130px">Campo</th>
        <th align="left" style="background:#f0f0f0">Valor</th>
      </tr>
      <tr><td>Nombre</td><td>${reporte.nombre_usuario || '—'}</td></tr>
      <tr><td>Perfil</td><td>${reporte.perfil_usuario || '—'}</td></tr>
      <tr><td>Pantalla</td><td>${reporte.pantalla_actual || '—'}</td></tr>
      <tr><td>Navegador</td><td>${reporte.navegador || '—'}</td></tr>
      <tr><td>Coordenadas GPS</td><td>${gpsStr}</td></tr>
      <tr><td>Versión App</td><td>${reporte.version_app || '—'}</td></tr>
      <tr><td>Fecha</td><td>${fecha}</td></tr>
    </table>
    ${attachments.length ? '<p style="margin-top:12px"><em>Screenshot adjunto a este correo.</em></p>' : ''}
  `;

  await transporter.sendMail({
    from:        SMTP_USER,
    to:          'soporte@tmarea.cl',
    subject:     `[Tmarea Bug #${reporte.id}] Reporte desde ${reporte.pantalla_actual || 'desconocida'} — ${fecha}`,
    html,
    attachments,
  });
}

// ─── POST /api/support/report ──────────────────────────────────────────────
router.post('/report', rateLimiter, async (req, res) => {
  try {
    const { descripcion, screenshot_base64, metadata = {} } = req.body;

    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ error: 'La descripción es requerida.' });
    }
    if (descripcion.trim().length > 500) {
      return res.status(400).json({ error: 'La descripción no puede superar los 500 caracteres.' });
    }

    const [rows] = await sequelize.query(
      `INSERT INTO reportes_incidencias
         (descripcion, screenshot_base64, pantalla_actual, datos_viaje, navegador,
          coordenadas_gps, version_app, nombre_usuario, perfil_usuario)
       VALUES
         (:descripcion, :screenshot, :pantalla, :datos_viaje, :navegador,
          :coordenadas, :version, :nombre, :perfil)
       RETURNING id, created_at`,
      {
        replacements: {
          descripcion:  descripcion.trim(),
          screenshot:   screenshot_base64 || null,
          pantalla:     metadata.pantalla       || null,
          datos_viaje:  metadata.datos_viaje    ? JSON.stringify(metadata.datos_viaje)   : null,
          navegador:    metadata.navegador      || null,
          coordenadas:  metadata.coordenadas    ? JSON.stringify(metadata.coordenadas)   : null,
          version:      metadata.version_app    || null,
          nombre:       metadata.nombre_usuario || null,
          perfil:       metadata.perfil_usuario || null,
        },
      }
    );

    const reporte = {
      id:              rows[0].id,
      created_at:      rows[0].created_at,
      descripcion:     descripcion.trim(),
      screenshot_base64,
      pantalla_actual: metadata.pantalla,
      navegador:       metadata.navegador,
      coordenadas_gps: metadata.coordenadas,
      version_app:     metadata.version_app,
      nombre_usuario:  metadata.nombre_usuario,
      perfil_usuario:  metadata.perfil_usuario,
    };

    enviarEmailReporte(reporte).catch(err =>
      console.error(`[REPORT] Error enviando email para reporte #${reporte.id}:`, err.message)
    );

    return res.json({
      success: true,
      id:      reporte.id,
      message: 'Reporte recibido. Revisaremos tu caso en un plazo de 24 a 72 horas.',
    });
  } catch (err) {
    console.error('[SUPPORT] Error en POST /report:', err.message);
    return res.status(500).json({ error: 'Error interno al guardar el reporte.' });
  }
});

// ─── GET /api/support/reports ──────────────────────────────────────────────
// TODO: agregar autenticación admin
router.get('/reports', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows] = await sequelize.query(
      `SELECT id, descripcion, pantalla_actual, navegador, nombre_usuario, perfil_usuario,
              version_app, estado, created_at
       FROM reportes_incidencias
       ORDER BY created_at DESC
       LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset } }
    );

    const [[countRow]] = await sequelize.query(
      'SELECT COUNT(*) AS total FROM reportes_incidencias'
    );

    return res.json({ data: rows, page, limit, total: Number(countRow.total) });
  } catch (err) {
    console.error('[SUPPORT] Error en GET /reports:', err.message);
    return res.status(500).json({ error: 'Error interno al obtener reportes.' });
  }
});

module.exports = router;
