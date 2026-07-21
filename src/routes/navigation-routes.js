const express = require('express');
const { OceanDataReader, OceanDataUnavailableError } = require('../services/ocean-data-reader');
const ShipPhysics = require('../services/ship-physics');
const NavigationCalculator = require('../services/navigation-calculator');

const router = express.Router();

const CAMPOS_REQUERIDOS = [
  'tipo_embarcacion',
  'eslora',
  'manga',
  'velocidad_crucero_nominal',
  'consumo_nominal',
  'ruta_puntos',
  'peso_carga_adicional_ton',
  'fecha_hora_salida',
];

function validarBody(body) {
  for (const campo of CAMPOS_REQUERIDOS) {
    if (body[campo] === undefined || body[campo] === null) {
      return `Falta el campo requerido: ${campo}`;
    }
  }

  if (!Array.isArray(body.ruta_puntos) || body.ruta_puntos.length < 2) {
    return 'ruta_puntos debe ser un array con al menos 2 puntos';
  }

  return null;
}

router.post('/navegacion/calculo', async (req, res) => {
  const errorValidacion = validarBody(req.body);
  if (errorValidacion) {
    return res.status(400).json({ success: false, data: null, error: errorValidacion });
  }

  try {
    const oceanReader = new OceanDataReader();
    const shipPhysics = new ShipPhysics();

    const [datosOceanicos, fisica] = await Promise.all([
      oceanReader.obtenerDatos(
        req.body.ruta_puntos.map(p => Array.isArray(p) ? { lat: p[0], lon: p[1] } : { lat: p.lat, lon: p.lon ?? p.lng }),
        req.body.fecha_hora_salida,
        req.body.velocidad_crucero_nominal
      ),
      Promise.resolve(shipPhysics.calcular(req.body)),
    ]);

    const calculator = new NavigationCalculator();
    const resultado = await calculator.calcular(datosOceanicos, fisica, req.body);

    res.json({ success: true, data: resultado, error: null });
  } catch (error) {
    console.error('[NAVEGACION]', error.message);
    if (error instanceof OceanDataUnavailableError) {
      return res.status(503).json({ success: false, data: null, error: error.message });
    }
    res.status(500).json({ success: false, data: null, error: error.message });
  }
});

module.exports = router;
