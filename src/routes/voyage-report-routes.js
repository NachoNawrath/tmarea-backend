// src/routes/voyage-report-routes.js
const express = require('express');
const router  = express.Router();
const { generarInformeViaje } = require('../services/voyage-report-service');

/**
 * POST /api/viaje/informe
 * Body: VoyageReportData (ver estructura abajo)
 * Query: ?formato=pdf|csv
 *
 * Estructura esperada del body:
 * {
 *   vessel:               { nombre, matricula, tipo_embarcacion, eslora, licenseType }
 *   patron:               { nombre }
 *   puerto_zarpe:         { nombre, ubicacion }
 *   destino_final:        { nombre }
 *   fecha_zarpe:          ISO string (planificada)
 *   fecha_zarpe_real:     ISO string (real)
 *   fecha_llegada_real:   ISO string
 *   combustible_propulsion_real: number (litros)
 *   combustible_generador_real:  number (litros)
 *   navegacion_estimada:  { eta_horas, consumo_total_litros, distancia_total_mn }
 *   port_status:          { zarpe: {...}, recalada: {...} }
 *   weather:              { peor_tramo, condicion_puerto, fuente }
 *   tramos_registrados: [
 *     { desde, hasta, distancia_mn, duracion_min, registrado: true, nota? }
 *   ]
 *   observaciones_patron: string (opcional)
 * }
 */
router.post('/informe', async (req, res) => {
  try {
    const formato = (req.query.formato || 'pdf').toLowerCase();

    if (!['pdf', 'csv'].includes(formato)) {
      return res.status(400).json({
        error: 'Formato inválido. Use ?formato=pdf o ?formato=csv',
      });
    }

    const data = req.body;

    // Validación mínima de entrada
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Body vacío o inválido' });
    }

    const resultado = await generarInformeViaje(data, formato);

    res.set({
      'Content-Type':        resultado.contentType,
      'Content-Disposition': `attachment; filename="${resultado.filename}"`,
      'Content-Length':      resultado.buffer.length,
      'Cache-Control':       'no-cache',
    });

    res.send(resultado.buffer);

  } catch (err) {
    console.error('[voyage-report] Error generando informe:', err.message);

    // No exponer stack trace al cliente
    res.status(500).json({
      error: 'No se pudo generar el informe',
      detalle: err.message,
    });
  }
});

module.exports = router;
