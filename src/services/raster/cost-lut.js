'use strict';
/**
 * LUT de costo (spec §7.1). Se reconstruye una vez por request (<1ms)
 * a partir del perfil de navegacion -- nunca se cachea entre requests
 * porque depende de dMinM/bandaMinM/bandaMaxM/maxDistCostaM del perfil.
 */

const FACTOR_CONFIANZA = { 1: 1.4, 2: 1.15, 3: 1.0 }; // ROJO, AMARILLO, VERDE
const KML_BONUS = 0.85;
const PISO_GLOBAL = 0.8;
const DIST_MASK = 0x1fff;

function costoBase(d, dMinEfectivo, bandaMinM, bandaMaxM, penalMax) {
  if (d < dMinEfectivo) return Infinity;
  if (d < bandaMinM) {
    // lerp 1.6 -> 1.0 entre dMinEfectivo y bandaMinM: no pegarse al roquerio
    const t = (d - dMinEfectivo) / (bandaMinM - dMinEfectivo);
    return 1.6 + (1.0 - 1.6) * t;
  }
  if (d <= bandaMaxM) return 1.0;
  return Math.min(1.0 + (d - bandaMaxM) / 8000, penalMax);
}

/** Tabla de 65536 entradas, indexada por el valor crudo de la celda empaquetada. */
function buildCostLUT(perfil) {
  const lut = new Float32Array(65536);
  const { dMinM, bandaMinM, bandaMaxM, penalMax } = perfil.costo;
  const maxDistCostaM = perfil.limites && perfil.limites.maxDistCostaM != null ? perfil.limites.maxDistCostaM : Infinity;

  for (let v = 0; v < 65536; v++) {
    const kml = (v >> 15) & 0b1;
    const confianza = (v >> 13) & 0b11;
    const d = (v & DIST_MASK) * 10; // unit_m siempre 10 en esta version del formato

    if (confianza === 0 || d > maxDistCostaM) {
      lut[v] = Infinity;
      continue;
    }

    const dMinEfectivo = kml ? Math.min(dMinM, 50) : dMinM;
    let costo = costoBase(d, dMinEfectivo, bandaMinM, bandaMaxM, penalMax);
    if (costo === Infinity) {
      lut[v] = Infinity;
      continue;
    }

    costo *= FACTOR_CONFIANZA[confianza];
    if (kml) costo *= KML_BONUS;
    lut[v] = Math.max(costo, PISO_GLOBAL);
  }
  return lut;
}

// Invariante de monotonia (spec §7.2): un nivel agregado NUNCA puede ser
// mas restrictivo que el fino, porque poda opciones validas antes de que
// el fino las evalue. El max-pooling ya lo respeta para la distancia
// (toma el MAXIMO del bloque, nunca subestima cuanta agua hay). Pero el
// margen dMinM tambien tiene que respetarlo: medio.bin/grueso.bin no
// llevan el bit 15 (zona relajada / KML), asi que si la LUT gruesa usara
// el dMinM real del perfil, un canal que la Fase 2 relaja a 50m (Tenglo,
// area portuaria, canal derivado) quedaria excluido del corredor ANTES
// de que el A* fino, que si ve el bit 15, tuviera oportunidad de usarlo
// -- el bug que motivo esta nota (Puyuhuapi, Apiao seguian fallando con
// el router real aunque el test de sanidad ya daba 100%).
//
// Arreglo de una linea, sin tocar el formato del .bin: la LUT gruesa usa
// dMinM=50 SIEMPRE, el minimo absoluto -- el mismo valor al que la
// relajacion acota dMinEfectivo. Con eso el corredor nunca excluye un
// canal que el fino podria usar; el fino sigue aplicando el margen
// correcto del perfil porque el si tiene el bit 15 disponible.
const DMIN_GRUESO_INVARIANTE = 50;

/**
 * LUT para las pasadas grueso/medio (spec §7.2). Ambos niveles solo
 * llevan el campo distancia (max-pooling, ver build_tile.py paso 10) --
 * no hay bits de confianza ni kml ahi. Ver DMIN_GRUESO_INVARIANTE arriba
 * para por que dMinM se fija en 50 en vez de tomarlo del perfil.
 *
 * bandaMinM/bandaMaxM/penalMax SI vienen del perfil: no son un corte
 * duro, solo modulan el costo relativo dentro del corredor, y un
 * corredor con gradiente de costo distinto al fino no rompe la
 * monotonia (el fino sigue siendo quien decide el camino final).
 */
function buildCoarseCostLUT(perfil) {
  const lut = new Float32Array(DIST_MASK + 1);
  const { bandaMinM, bandaMaxM, penalMax } = perfil.costo;
  const maxDistCostaM = perfil.limites && perfil.limites.maxDistCostaM != null ? perfil.limites.maxDistCostaM : Infinity;

  for (let distUnits = 0; distUnits <= DIST_MASK; distUnits++) {
    const d = distUnits * 10;
    if (d > maxDistCostaM) {
      lut[distUnits] = Infinity;
      continue;
    }
    const costo = costoBase(d, DMIN_GRUESO_INVARIANTE, bandaMinM, bandaMaxM, penalMax);
    if (costo === Infinity) {
      lut[distUnits] = Infinity;
      continue;
    }
    lut[distUnits] = Math.max(costo * FACTOR_CONFIANZA[1], PISO_GLOBAL);
  }
  return lut;
}

module.exports = { buildCostLUT, buildCoarseCostLUT, FACTOR_CONFIANZA, KML_BONUS, PISO_GLOBAL, costoBase };
