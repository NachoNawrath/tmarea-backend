/**
 * VESSEL TYPES - Clasificación DIRECTEMAR (tipo_estructura + tipo_actividad)
 *
 * NOTA IMPORTANTE: el coeficiente de bloque (Cb) depende actualmente
 * solo de tipo_estructura. tipo_actividad se registra para clasificación
 * pero todavía NO ajusta el Cb: falta la tabla empírica real por
 * combinación estructura×actividad (48 valores), que debe salir de una
 * referencia normativa o naval real, no de una estimación genérica.
 * Los valores de cb aquí son una migración directa del esquema anterior
 * (5 tipos) a los 8 tipos de estructura nuevos — no están validados
 * contra datos empíricos y deben revisarse antes de usarse en producción.
 */

const TIPO_ESTRUCTURA = {
  lancha_motor: {
    cb: 0.50,
    label: 'Lancha Motor',
    typical_trg_range: [5, 50]
  },
  bote_motor: {
    cb: 0.45,
    label: 'Bote Motor',
    typical_trg_range: [1, 15]
  },
  barcaza: {
    cb: 0.70,
    label: 'Barcaza',
    typical_trg_range: [15, 80]
  },
  panga: {
    cb: 0.60,
    label: 'Panga',
    typical_trg_range: [1, 10]
  },
  catamaran: {
    cb: 0.45,
    label: 'Catamarán',
    typical_trg_range: [25, 90]
  },
  bote_remo_vela: {
    cb: 0.40,
    label: 'Bote a Remo/Vela',
    typical_trg_range: [0.5, 8]
  },
  yate: {
    cb: 0.45,
    label: 'Yate',
    typical_trg_range: [10, 60]
  },
  moto_agua: {
    cb: 0.40,
    label: 'Moto de Agua',
    typical_trg_range: [0.1, 1]
  }
};

const TIPO_ACTIVIDAD = {
  pesca_artesanal: { label: 'Pesca Artesanal' },
  transporte_pasajeros: { label: 'Transporte Pasajeros' },
  carga_servicios: { label: 'Carga y Servicios' },
  apoyo_acuicultura: { label: 'Apoyo Acuicultura' },
  deportiva_recreo: { label: 'Deportiva/Recreo' },
  especiales: { label: 'Especiales' }
};

function getCbByType(tipoEstructura, tipoActividad) {
  // tipoActividad reservado para la futura tabla estructura×actividad.
  const estructura = TIPO_ESTRUCTURA[tipoEstructura?.toLowerCase()] || TIPO_ESTRUCTURA.lancha_motor;
  return estructura.cb;
}

function isTrgInRange(tipoEstructura, trg) {
  const estructura = TIPO_ESTRUCTURA[tipoEstructura?.toLowerCase()];
  if (!estructura) return true;

  const [min, max] = estructura.typical_trg_range;
  return trg >= min && trg <= max;
}

module.exports = {
  TIPO_ESTRUCTURA,
  TIPO_ACTIVIDAD,
  getCbByType,
  isTrgInRange
};
