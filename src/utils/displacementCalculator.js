/**
 * DISPLACEMENT CALCULATOR
 *
 * Cálculos ISO 8666:2019 - Desplazamiento en agua salada
 * Validado contra datos empíricos chilenos (BEM 2025, DIRECTEMAR)
 */

const { getCbByType } = require('../constants/vesselTypes');

function calculateDisplacement(eslora, manga, puntal, cb, densidad = 1.025) {
  if (!eslora || !manga || !puntal || !cb) {
    throw new Error('Faltan parámetros para calcular desplazamiento');
  }

  const displacement = eslora * manga * puntal * cb * densidad;
  return Math.round(displacement * 100) / 100;
}

function calculateDisplacementByType(eslora, manga, puntal, vesselType) {
  const cb = getCbByType(vesselType);
  return calculateDisplacement(eslora, manga, puntal, cb);
}

function calculateDraft(displacement, eslora, manga) {
  if (!displacement || !eslora || !manga) {
    throw new Error('Faltan parámetros para calcular calado');
  }

  const draft = displacement / (eslora * manga * 1.025);
  return Math.round(draft * 1000) / 1000;
}

function validateDisplacement(trg, displacementCalculated, tolerance = 0.15) {
  const displacementExpected = trg * 3.2;
  const deviation = Math.abs(displacementCalculated - displacementExpected);
  const deviationPct = (deviation / displacementExpected) * 100;

  const minRange = displacementExpected * (1 - tolerance);
  const maxRange = displacementExpected * (1 + tolerance);

  const isValid = displacementCalculated >= minRange && displacementCalculated <= maxRange;

  return {
    status: isValid ? 'ok' : 'warning',
    warning: !isValid,
    displacement_expected: Math.round(displacementExpected * 100) / 100,
    displacement_calculated: displacementCalculated,
    deviation_pct: Math.round(deviationPct * 100) / 100,
    tolerance_pct: tolerance * 100,
    range_min: Math.round(minRange * 100) / 100,
    range_max: Math.round(maxRange * 100) / 100,
    message: isValid
      ? `Desplazamiento validado: ${displacementCalculated}t dentro de rango esperado (${minRange.toFixed(1)}–${maxRange.toFixed(1)}t).`
      : `Desplazamiento ${displacementCalculated}t desviado ${deviationPct.toFixed(1)}% del esperado (${displacementExpected.toFixed(1)}t ± ${(tolerance * 100).toFixed(0)}%). Revisar dimensiones.`
  };
}

function calculateDynamicConsumption(consumoNominal, cargaActual, displacementVacio) {
  if (!consumoNominal || !displacementVacio) {
    return consumoNominal;
  }

  const factor_carga = 0.10;
  const cargaPct = cargaActual / displacementVacio;
  const consumoDinamico = consumoNominal * (1 + factor_carga * cargaPct);

  return Math.round(consumoDinamico * 100) / 100;
}

function calculateAutonomy(capacidadFuel, consumoDinamico) {
  if (!capacidadFuel || !consumoDinamico || consumoDinamico <= 0) {
    return 0;
  }

  const hours = capacidadFuel / consumoDinamico;
  return Math.round(hours * 100) / 100;
}

module.exports = {
  calculateDisplacement,
  calculateDisplacementByType,
  calculateDraft,
  validateDisplacement,
  calculateDynamicConsumption,
  calculateAutonomy
};
