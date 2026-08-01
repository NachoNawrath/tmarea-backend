// src/services/route-restriction-evaluator.js
// Evalúa la ruta completa contra restricciones SITPORT normalizadas.
// Fail-fast: si cualquier bahía da UV → veredicto UV, no sigue evaluando.

const { normalizarRestriccion } = require('./sitport-parser');
const { evaluarRestriccion } = require('./restriction-rules-engine');

// ─────────────────────────────────────────────────────────────────────────────
// evaluarRuta: recibe las restricciones intermedias (ya agrupadas por bahía,
// una por bahía, con el registro crudo en _raw) y el AB de la nave.
//
// Retorna:
// {
//   veredicto: 'Q' | 'U' | 'UV',
//   motivo_principal: string | null,
//   restricciones: [ { bahia, condicion, bloquea, umbral_ab, motivo, estado, nivel } ],
//   ultimo_tramo_seguro: { bahia, indice_ruta } | null,
//   fondeadero_sugerido: { nombre, distancia_mn } | null,
//   timestamp_sitport: string
// }
// ─────────────────────────────────────────────────────────────────────────────
async function evaluarRuta(restriccionesIntermedias, nave_ab) {
  const rank = { Q: 0, U: 1, UV: 2 };
  const resultado = {
    veredicto: 'Q',
    motivo_principal: null,
    restricciones: [],
    ultimo_tramo_seguro: null,
    fondeadero_sugerido: null,
    timestamp_sitport: new Date().toISOString(),
  };

  let peorNivel = 'Q';
  let primerBloqueo = -1;

  for (let i = 0; i < restriccionesIntermedias.length; i++) {
    const r = restriccionesIntermedias[i];
    const raw = r._raw || r;

    const norm = normalizarRestriccion(raw);
    const ev = await evaluarRestriccion(norm, nave_ab);

    resultado.restricciones.push({
      bahia: r.nombre_bahia || norm.bahia_nombre,
      id_bahia: r.id_bahia || norm.bahia_id,
      condicion: norm.condicion,
      bloquea: ev.bloquea,
      umbral_ab: norm.umbral_ab_fuera,
      motivo: ev.motivo,
      estado: ev.estado,
      nivel: ev.nivel,
    });

    if (ev.nivel && rank[ev.nivel] > rank[peorNivel]) {
      peorNivel = ev.nivel;
      resultado.motivo_principal = `Restricción de tránsito en zona intermedia (${r.nombre_bahia || norm.bahia_nombre})`;
    }

    // Fail-fast: UV → no seguir evaluando
    if (peorNivel === 'UV' && primerBloqueo < 0) {
      primerBloqueo = i;
      if (i > 0) {
        const prev = restriccionesIntermedias[i - 1];
        resultado.ultimo_tramo_seguro = {
          bahia: prev.nombre_bahia,
          indice_ruta: prev.orden_en_ruta || i,
        };
      }
      if (r.fondeadero_previo) {
        resultado.fondeadero_sugerido = r.fondeadero_previo;
      }
    }
  }

  resultado.veredicto = peorNivel;
  return resultado;
}

module.exports = { evaluarRuta };
