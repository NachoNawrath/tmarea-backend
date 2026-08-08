'use strict';

const LICENCIAS_VALIDAS = ['PLDB', 'PDB', 'CDC', 'CDAM'];

const CLASIFICACIONES_VALIDAS = [
  'ALTA_MAR', 'COSTERA_60', 'COSTERA_12', 'BAHIA_VELA', 'BAHIA_MOTOR',
];

const PROPULSIONES_VALIDAS = ['motor', 'vela', 'mixto', 'manual'];

// RGDN Art. 28 — tabla oficial de arqueo por eslora para deportivas < 24 m (INV-4.4)
// Ordenada ascendente por esloraMax para búsqueda secuencial.
const TABLA_ARQUEO_ESLORA = [
  { esloraMax: 8,     ab: 5.0 },
  { esloraMax: 9,     ab: 7.5 },
  { esloraMax: 10,    ab: 10.0 },
  { esloraMax: 11,    ab: 12.5 },
  { esloraMax: 12,    ab: 15.0 },
  { esloraMax: 13,    ab: 17.5 },
  { esloraMax: 14,    ab: 20.0 },
  { esloraMax: 15,    ab: 22.3 },
  { esloraMax: 16,    ab: 25.0 },
  { esloraMax: 17,    ab: 27.5 },
  { esloraMax: 18,    ab: 30.5 },
  { esloraMax: 19,    ab: 33.5 },
  { esloraMax: 20,    ab: 36.5 },
  { esloraMax: 21,    ab: 39.5 },
  { esloraMax: 22,    ab: 42.5 },
  { esloraMax: 23,    ab: 45.5 },
  { esloraMax: 23.99, ab: 50.0 },
];

// Límites representados como millas numéricas.
// bahía = 0 (sentinel: solo aguas protegidas, sin distancia costa).
const LIMITE_LICENCIA = { PLDB: 0, PDB: 0, CDC: 60, CDAM: Infinity };

const LIMITE_CLASIFICACION = {
  ALTA_MAR: Infinity, COSTERA_60: 60, COSTERA_12: 12,
  BAHIA_VELA: 0, BAHIA_MOTOR: 0,
};

function formatMillas(v) {
  if (v === 0) return 'bahía';
  if (v === Infinity) return 'sin límite';
  return `${v} MN`;
}

function derivarABDeEslora(eslora) {
  if (typeof eslora !== 'number' || eslora <= 0 || eslora >= 24) return null;
  for (const fila of TABLA_ARQUEO_ESLORA) {
    if (eslora <= fila.esloraMax) {
      return { ab: fila.ab, derivado: true, fuente: 'RGDN Art. 28' };
    }
  }
  return null;
}

function validarHabilitacionDeportiva(perfilNave, navegacion) {
  const motivos = [];
  const alertas = [];
  let bandera = 'Q';

  const rank = { Q: 0, U: 1, UV: 2 };
  const escalar = (nivel) => { if (rank[nivel] > rank[bandera]) bandera = nivel; };

  const pn = perfilNave || {};
  const nav = navegacion || {};

  // ─── Validación de tipos y datos críticos ─────────────────────────────
  const licenciaOk = pn.licencia && LICENCIAS_VALIDAS.includes(pn.licencia);
  const clasificacionOk = pn.clasificacion_nave && CLASIFICACIONES_VALIDAS.includes(pn.clasificacion_nave);
  const propulsionOk = pn.propulsion && PROPULSIONES_VALIDAS.includes(pn.propulsion);

  if (!licenciaOk) {
    motivos.push({
      regla: 'datos_criticos',
      capa1: 'Inconsistencias en el seteo respecto de la licencia informada o incompatibilidad de la embarcación.',
      capa2: 'Verifica que tu licencia (PLDB, PDB, CDC o CDAM) sea la correcta según RGDN (TM-002) Art. 12.',
      detalle: `Licencia inválida o ausente: "${pn.licencia || '(vacía)'}".`,
    });
    escalar('UV');
  }

  if (!clasificacionOk) {
    motivos.push({
      regla: 'datos_criticos',
      capa1: 'Inconsistencias en el seteo respecto de la licencia informada o incompatibilidad de la embarcación.',
      capa2: 'La clasificación de nave (Alta Mar, Costera 60 MN, Costera 12 MN, Bahía) debe estar registrada en el certificado de navegabilidad (CIRC A-41/014 C.5).',
      detalle: `Clasificación de nave inválida o ausente: "${pn.clasificacion_nave || '(vacía)'}".`,
    });
    escalar('UV');
  }

  if (!propulsionOk) {
    motivos.push({
      regla: 'datos_criticos',
      capa1: 'Inconsistencias en el seteo respecto de la licencia informada o incompatibilidad de la embarcación.',
      capa2: 'Declara el tipo de propulsión de tu embarcación (motor, vela, mixto o manual).',
      detalle: `Propulsión inválida o ausente: "${pn.propulsion || '(vacía)'}".`,
    });
    escalar('UV');
  }

  if (pn.eslora != null && (typeof pn.eslora !== 'number' || pn.eslora < 0)) {
    motivos.push({
      regla: 'datos_criticos',
      capa1: 'Inconsistencias en el seteo respecto de la licencia informada o incompatibilidad de la embarcación.',
      capa2: 'La eslora debe ser un valor numérico ≥ 0.',
      detalle: `Eslora inválida: "${pn.eslora}".`,
    });
    escalar('UV');
  }

  if (pn.motor_hp != null && (typeof pn.motor_hp !== 'number' || pn.motor_hp < 0)) {
    motivos.push({
      regla: 'datos_criticos',
      capa1: 'Inconsistencias en el seteo respecto de la licencia informada o incompatibilidad de la embarcación.',
      capa2: 'La potencia del motor debe ser un valor numérico ≥ 0.',
      detalle: `Potencia de motor inválida: "${pn.motor_hp}".`,
    });
    escalar('UV');
  }

  if (pn.arqueo_bruto != null && (typeof pn.arqueo_bruto !== 'number' || pn.arqueo_bruto < 0)) {
    motivos.push({
      regla: 'datos_criticos',
      capa1: 'Inconsistencias en el seteo respecto de la licencia informada o incompatibilidad de la embarcación.',
      capa2: 'El arqueo bruto (AB) debe ser un valor numérico ≥ 0.',
      detalle: `Arqueo bruto inválido: "${pn.arqueo_bruto}".`,
    });
    escalar('UV');
  }

  // ─── INV-4.4 — Derivar AB si ausente ──────────────────────────────────
  let abEfectivo = (typeof pn.arqueo_bruto === 'number' && pn.arqueo_bruto >= 0)
    ? pn.arqueo_bruto
    : null;
  let abDerivado = false;

  if (abEfectivo === null && typeof pn.eslora === 'number' && pn.eslora > 0) {
    const derivacion = derivarABDeEslora(pn.eslora);
    if (derivacion) {
      abEfectivo = derivacion.ab;
      abDerivado = true;
      alertas.push({
        tipo: 'info',
        mensaje: `Arqueo bruto derivado de eslora (${pn.eslora} m → ${derivacion.ab} AB, ${derivacion.fuente}).`,
      });
    }
  }

  // ─── INV-4.2 — PLDB × propulsión (RGDN Art. 14 a: solo motor) ────────
  if (licenciaOk && propulsionOk && pn.licencia === 'PLDB' && pn.propulsion !== 'motor') {
    motivos.push({
      regla: 'INV-4.2',
      capa1: 'Incompatibilidad licencia-propulsión: PLDB solo habilita embarcaciones a motor.',
      capa2: 'Según RGDN (TM-002) Art. 14 a), la licencia PLDB habilita únicamente embarcaciones propulsadas exclusivamente a motor. Para propulsión a vela, mixta o manual se requiere licencia PDB, CDC o CDAM.',
      detalle: `PLDB + propulsión "${pn.propulsion}" → incompatible.`,
    });
    escalar('UV');
  }

  // ─── INV-4.1 — Límite efectivo = min(licencia, clasificación, degradación vela)
  if (licenciaOk && clasificacionOk && propulsionOk) {
    const limLic = LIMITE_LICENCIA[pn.licencia];
    const limClasif = LIMITE_CLASIFICACION[pn.clasificacion_nave];
    const degradVela = (pn.propulsion === 'vela' && pn.motor_operativo === false) ? 12 : Infinity;

    if (pn.propulsion === 'vela' && pn.motor_operativo === undefined) {
      alertas.push({
        tipo: 'warning',
        mensaje: 'No se declaró si el motor auxiliar está operativo. Para embarcaciones a vela, este dato afecta el límite de navegación (CIRC A-41/014 H.2).',
      });
    }

    const limiteEfectivo = Math.min(limLic, limClasif, degradVela);

    const ambitoRaw = nav.ambito_millas;
    let ambitoNav = null;
    if (ambitoRaw === 'bahia' || ambitoRaw === 0) {
      ambitoNav = 0;
    } else if (typeof ambitoRaw === 'number' && ambitoRaw >= 0) {
      ambitoNav = ambitoRaw;
    }

    if (ambitoNav !== null && ambitoNav > limiteEfectivo) {
      let factorLimitante;
      if (limLic <= limClasif && limLic <= degradVela) {
        factorLimitante = `licencia ${pn.licencia} (${formatMillas(limLic)})`;
      } else if (limClasif <= limLic && limClasif <= degradVela) {
        factorLimitante = `clasificación ${pn.clasificacion_nave} (${formatMillas(limClasif)})`;
      } else {
        factorLimitante = 'degradación por vela sin motor operativo (12 MN, CIRC A-41/014 H.2)';
      }

      motivos.push({
        regla: 'INV-4.1',
        capa1: `Navegación planificada (${formatMillas(ambitoNav)}) excede el límite efectivo (${formatMillas(limiteEfectivo)}).`,
        capa2: `El límite efectivo es el menor entre licencia, clasificación de nave y degradación por propulsión (CIRC A-41/014 C.5, H.2; RGDN Art. 14). Factor limitante: ${factorLimitante}.`,
        detalle: `Ámbito ${formatMillas(ambitoNav)} > límite ${formatMillas(limiteEfectivo)}.`,
        limite_efectivo: limiteEfectivo,
        factores: { licencia: limLic, clasificacion: limClasif, degradacion_vela: degradVela },
      });
      escalar('UV');
    }
  }

  return { bandera, motivos, alertas, ab_efectivo: abEfectivo, ab_derivado: abDerivado };
}

module.exports = {
  validarHabilitacionDeportiva,
  derivarABDeEslora,
  TABLA_ARQUEO_ESLORA,
  LICENCIAS_VALIDAS,
  CLASIFICACIONES_VALIDAS,
  PROPULSIONES_VALIDAS,
};
