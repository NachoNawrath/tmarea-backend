'use strict';
/**
 * Perfiles de costo del router raster (TMAREA_SPEC_Router_Raster_v1.md §6.1, §7.1).
 *
 * dMinM es un margen geometrico de separacion de la orilla -- NO una
 * garantia de profundidad. La profundidad la resuelven la ecosonda de
 * la nave y la capa de confianza batimetrica (Fase 3), no este archivo.
 *
 * Valores preliminares, pendientes de calibracion operacional (ver spec
 * §6.1). Viven aca, exportados, para no hardcodearlos dentro del router.
 *
 * Nota Fase 2: esto NO es el contrato PerfilNavegacion completo de §6/§15
 * (licencia x clasificacion de nave x ambito) -- eso es Fase 4, bloqueado
 * a la integracion con P1/P2 del frontend. Fase 2 solo necesita construir
 * un perfil de costo valido para probar el router; construirPerfilCosto()
 * cubre exactamente eso.
 */

// Tabla calado -> {dMinM, bandaMinM, bandaMaxM} (spec §6.1)
const TABLA_CALADO = [
  { caladoMaxM: 1.5, dMinM: 50, bandaMinM: 150, bandaMaxM: 2500 },
  { caladoMaxM: 2.5, dMinM: 80, bandaMinM: 250, bandaMaxM: 3000 },
  { caladoMaxM: 4.0, dMinM: 150, bandaMinM: 400, bandaMaxM: 3000 },
  { caladoMaxM: Infinity, dMinM: 200, bandaMinM: 500, bandaMaxM: 3000 },
];

const PENAL_MAX_DEFAULT = 2.2;

// Tope duro de expansiones del A* fino sin restriccion (spec §7.2): un
// OOM nunca es un modo de falla aceptable. Si se supera, el router
// devuelve { ok:false, motivo:'ruta_no_convergente' } en vez de colgarse.
const MAX_EXPANSIONES_ASTAR = 3_000_000;

function costoBaseDesdeCalado(calado_m) {
  const fila = TABLA_CALADO.find((f) => calado_m <= f.caladoMaxM) || TABLA_CALADO[TABLA_CALADO.length - 1];
  return { dMinM: fila.dMinM, bandaMinM: fila.bandaMinM, bandaMaxM: fila.bandaMaxM, penalMax: PENAL_MAX_DEFAULT };
}

// Ajustes por licencia sobre la base de calado (spec §6.1). Simplificado
// para Fase 2 -- el contrato completo de licencia x clasificacion vive
// en §6.2/§15 y se implementa en Fase 4.
function aplicarAjusteLicencia(costo, licencia) {
  const ajustado = { ...costo };
  if (licencia === 'PLDB' || licencia === 'PDB') {
    ajustado.bandaMaxM = 1500;
  } else if (licencia === 'CDAM') {
    ajustado.penalMax = 1.2;
  }
  return ajustado;
}

/**
 * Perfil de costo minimo para probar el router en Fase 2. NO es
 * PerfilNavegacion completo (sin habilitado/bloqueos/clasificacionNave) --
 * ver nota de archivo.
 */
function construirPerfilCosto({ calado_m, licencia = 'PNM', maxDistCostaM = null }) {
  const costo = aplicarAjusteLicencia(costoBaseDesdeCalado(calado_m), licencia);
  return {
    licencia,
    limites: { maxDistCostaM },
    costo,
  };
}

module.exports = {
  TABLA_CALADO,
  PENAL_MAX_DEFAULT,
  MAX_EXPANSIONES_ASTAR,
  costoBaseDesdeCalado,
  aplicarAjusteLicencia,
  construirPerfilCosto,
};
