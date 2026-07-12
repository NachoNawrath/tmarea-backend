/**
 * VESSEL TYPES - Coeficientes de Bloque automáticos (SOLAS)
 *
 * Used in P1.1 (Perfil Nave) para calcular desplazamiento automático
 * según tipo de nave. Validado contra datos empíricos chilenos.
 */

const VESSEL_TYPES = {
  barcaza: {
    cb: 0.70,
    label: "Barcaza chata o gabarra",
    typical_trg_range: [15, 80],
    description: "Embarcación de fondo plano, máximo volumen"
  },
  trasmallo: {
    cb: 0.60,
    label: "Trasmallo / Palangrera",
    typical_trg_range: [20, 70],
    description: "Embarcación pesquera de forma media"
  },
  motonave: {
    cb: 0.55,
    label: "Motonave carguera",
    typical_trg_range: [30, 100],
    description: "Buque carguero de trabajo"
  },
  catamarano: {
    cb: 0.45,
    label: "Catamarán de trabajo",
    typical_trg_range: [25, 90],
    description: "Casco doble, velocidad media-alta"
  },
  otro: {
    cb: 0.60,
    label: "Otro tipo",
    typical_trg_range: [15, 100],
    description: "Usa trasmallo como referencia por defecto"
  }
};

function getCbByType(vesselType) {
  const type = VESSEL_TYPES[vesselType?.toLowerCase()] || VESSEL_TYPES.otro;
  return type.cb;
}

function isTrgInRange(vesselType, trg) {
  const type = VESSEL_TYPES[vesselType?.toLowerCase()];
  if (!type) return true;

  const [min, max] = type.typical_trg_range;
  return trg >= min && trg <= max;
}

module.exports = {
  VESSEL_TYPES,
  getCbByType,
  isTrgInRange
};
