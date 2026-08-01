// src/services/restriction-rules-engine.js
// Motor de reglas declarativo para evaluar restricciones SITPORT usando json-rules-engine.

const { Engine } = require('json-rules-engine');

let engineInstance = null;

function getEngine() {
  if (engineInstance) return engineInstance;

  const engine = new Engine([], { allowUndefinedFacts: true });

  // ── Regla 1: TEMPORAL → bloqueo total ──────────────────────────────────────
  engine.addRule({
    name: 'temporal-bloqueo',
    priority: 10,
    conditions: {
      all: [{ fact: 'condicion', operator: 'equal', value: 'TEMPORAL' }],
    },
    event: {
      type: 'bloqueo',
      params: {
        nivel: 'UV',
        motivo: 'Condición TEMPORAL — navegación suspendida para todas las naves',
      },
    },
  });

  // ── Regla 5: bloqueo_total → todas las naves ──────────────────────────────
  engine.addRule({
    name: 'bloqueo-total',
    priority: 9,
    conditions: {
      all: [{ fact: 'bloqueo_total', operator: 'equal', value: true }],
    },
    event: {
      type: 'bloqueo',
      params: {
        nivel: 'UV',
        motivo: 'Puerto cerrado para todo tipo de naves',
      },
    },
  });

  // ── Regla 2: MAL_TIEMPO sin umbral AB → bloqueo todas las menores ─────────
  engine.addRule({
    name: 'mal-tiempo-sin-umbral',
    priority: 8,
    conditions: {
      all: [
        { fact: 'condicion', operator: 'equal', value: 'MAL_TIEMPO' },
        { fact: 'umbral_ab_fuera', operator: 'equal', value: null },
        { fact: 'afecta_menores', operator: 'equal', value: true },
      ],
    },
    event: {
      type: 'bloqueo',
      params: {
        nivel: 'UV',
        motivo:
          'Condición MAL TIEMPO — navegación suspendida para embarcaciones menores',
      },
    },
  });

  // ── Regla 3: MAL_TIEMPO + umbral + nave bajo umbral → bloqueo ─────────────
  engine.addRule({
    name: 'mal-tiempo-bajo-umbral',
    priority: 7,
    conditions: {
      all: [
        { fact: 'condicion', operator: 'equal', value: 'MAL_TIEMPO' },
        { fact: 'umbral_ab_fuera', operator: 'greaterThan', value: 0 },
        { fact: 'nave_ab_definido', operator: 'equal', value: true },
        {
          fact: 'nave_ab',
          operator: 'lessThan',
          value: { fact: 'umbral_ab_fuera' },
        },
      ],
    },
    event: {
      type: 'bloqueo',
      params: {
        nivel: 'UV',
        motivo:
          'Condición MAL TIEMPO — tu embarcación (AB {nave_ab}) no puede navegar (restricción para menores de {umbral} AB)',
      },
    },
  });

  // ── Regla 4: VARIABLE + umbral + nave bajo umbral → precaución ────────────
  engine.addRule({
    name: 'variable-bajo-umbral',
    priority: 6,
    conditions: {
      all: [
        { fact: 'condicion', operator: 'equal', value: 'VARIABLE' },
        { fact: 'umbral_ab_fuera', operator: 'greaterThan', value: 0 },
        { fact: 'nave_ab_definido', operator: 'equal', value: true },
        {
          fact: 'nave_ab',
          operator: 'lessThan',
          value: { fact: 'umbral_ab_fuera' },
        },
      ],
    },
    event: {
      type: 'precaucion',
      params: {
        nivel: 'U',
        motivo:
          'Condición VARIABLE — restricción activa para tu embarcación (AB {nave_ab}, menores de {umbral} AB)',
      },
    },
  });

  // ── Regla 7: VARIABLE sin umbral + afecta menores → precaución ────────────
  engine.addRule({
    name: 'variable-sin-umbral',
    priority: 5,
    conditions: {
      all: [
        { fact: 'condicion', operator: 'equal', value: 'VARIABLE' },
        { fact: 'umbral_ab_fuera', operator: 'equal', value: null },
        { fact: 'afecta_menores', operator: 'equal', value: true },
      ],
    },
    event: {
      type: 'precaucion',
      params: {
        nivel: 'U',
        motivo:
          'Condición VARIABLE — restricción activa para embarcaciones menores',
      },
    },
  });

  // ── Regla 6: Umbral existe + nave sin AB cargado → precaución ─────────────
  engine.addRule({
    name: 'sin-ab-con-umbral',
    priority: 4,
    conditions: {
      all: [
        { fact: 'umbral_ab_fuera', operator: 'greaterThan', value: 0 },
        { fact: 'nave_ab_definido', operator: 'equal', value: false },
      ],
    },
    event: {
      type: 'precaucion',
      params: {
        nivel: 'U',
        motivo:
          'Restricción activa — carga tu AB en el perfil para verificar si te afecta',
      },
    },
  });

  engineInstance = engine;
  return engine;
}

// ─────────────────────────────────────────────────────────────────────────────
// Evalúa una restricción normalizada contra el perfil de la nave.
// restriccionNorm: salida de normalizarRestriccion()
// nave_ab: número (AB de la nave) o null (no cargado)
// Retorna: { bloquea, estado, nivel, motivo }
// ─────────────────────────────────────────────────────────────────────────────
async function evaluarRestriccion(restriccionNorm, nave_ab) {
  const engine = getEngine();

  const ab =
    nave_ab != null && nave_ab !== '' && !isNaN(nave_ab)
      ? Number(nave_ab)
      : null;

  const facts = {
    condicion: restriccionNorm.condicion,
    afecta_menores: restriccionNorm.afecta_menores,
    afecta_mayores: restriccionNorm.afecta_mayores,
    umbral_ab_fuera: restriccionNorm.umbral_ab_fuera,
    umbral_ab_dentro: restriccionNorm.umbral_ab_dentro,
    bloqueo_total: restriccionNorm.bloqueo_total,
    nave_ab: ab ?? 0,
    nave_ab_definido: ab != null,
  };

  const { events } = await engine.run(facts);

  if (events.length === 0) {
    if (!restriccionNorm.afecta_menores) {
      return {
        bloquea: false,
        estado: 'no_afecta',
        nivel: null,
        motivo: 'Esta restricción aplica a naves mayores, no a tu embarcación',
      };
    }
    return {
      bloquea: false,
      estado: 'no_afecta',
      nivel: null,
      motivo:
        ab != null
          ? `Tu embarcación (AB ${ab}) no está afectada por esta restricción`
          : 'Esta restricción no afecta a tu embarcación',
    };
  }

  const rank = { UV: 2, U: 1 };
  const best = events.reduce((a, b) =>
    (rank[b.params?.nivel] || 0) > (rank[a.params?.nivel] || 0) ? b : a,
  );

  const nivel = best.params?.nivel;
  let motivo = best.params?.motivo || '';
  motivo = motivo
    .replace('{nave_ab}', ab != null ? String(ab) : '?')
    .replace('{umbral}', String(restriccionNorm.umbral_ab_fuera ?? '?'));

  const bloquea = nivel === 'UV';
  let estado;
  if (bloquea) estado = 'bloquea';
  else if (ab == null && restriccionNorm.umbral_ab_fuera != null)
    estado = 'sin_ab';
  else estado = 'precaucion';

  return { bloquea, estado, nivel, motivo };
}

module.exports = { evaluarRestriccion, getEngine };
