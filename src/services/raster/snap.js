'use strict';
/**
 * Snap-to-navigable (spec §7.3). Resuelve el caso de un origen/destino
 * que cae en tierra o en una celda con margen insuficiente (d < dMinM)
 * en la mascara -- tipico de caletas chicas / centros de cultivo, y
 * tambien de coordenadas de muelle (ver TMAREA_SPEC §10, nota Corral).
 *
 * CRITICO: debe usar EXACTAMENTE el mismo criterio de navegabilidad que
 * buildCostLUT() (cost-lut.js) -- incluido el bit 15 (KML / zona de
 * margen relajado, spec §7.1) que acota dMinEfectivo a 50m. Si el snap
 * usara dMinM crudo sin esa relajacion, podria rechazar una celda que el
 * A* SI considera navegable (o aceptar el snap en una celda que el A*
 * considera intransitable), y la ruta fallaria "sin motivo aparente"
 * porque snap y A* estarian evaluando dos criterios distintos.
 *
 * Busqueda en espiral (anillos cuadrados de Chebyshev crecientes) desde
 * la celda de origen hasta agotar MAX_CELDAS_SNAP celdas visitadas.
 * No garantiza la celda EXACTAMENTE mas cercana en distancia euclidea
 * (dentro de un mismo anillo, las esquinas estan mas lejos que los
 * bordes) -- aproximacion aceptable para un snap, no para el propio A*.
 *
 * @param {object} perfilCosto - { costo: {dMinM,...}, limites?: {maxDistCostaM} } -- mismo objeto que buildCostLUT()
 */
const MAX_CELDAS_SNAP = 15000;

function snapToNavigable(fila0, col0, meta, packed, perfilCosto) {
  const { cols, rows, unit_m } = meta;
  const { dMinM } = perfilCosto.costo;
  const maxDistCostaM = perfilCosto.limites && perfilCosto.limites.maxDistCostaM != null
    ? perfilCosto.limites.maxDistCostaM
    : Infinity;

  const check = (fila, col) => {
    if (fila < 0 || fila >= rows || col < 0 || col >= cols) return null;
    const raw = packed[fila * cols + col];
    const confianza = (raw >> 13) & 0b11;
    if (confianza === 0) return null;
    const kml = (raw >> 15) & 0b1;
    const d = (raw & 0x1fff) * unit_m;
    if (d > maxDistCostaM) return null;
    const dMinEfectivo = kml ? Math.min(dMinM, 50) : dMinM;
    if (d < dMinEfectivo) return null;
    return { fila, col };
  };

  const direct = check(fila0, col0);
  if (direct) return { idx: fila0 * cols + col0, fila: fila0, col: col0, distSnapM: 0 };

  let celdas = 0;
  const maxR = Math.ceil(Math.max(rows, cols) / 2);
  for (let r = 1; r <= maxR; r++) {
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== r) continue; // solo el borde del anillo
        celdas++;
        if (celdas > MAX_CELDAS_SNAP) {
          console.warn(`[snap] SNAP_FAILED: no se encontró agua navegable cerca de (fila=${fila0}, col=${col0}) tras explorar ${celdas} celdas`);
          return null;
        }
        const res = check(fila0 + dr, col0 + dc);
        if (res) {
          const distSnapM = Math.hypot(dr * meta.res_m, dc * meta.res_m);
          return { idx: res.fila * cols + res.col, fila: res.fila, col: res.col, distSnapM };
        }
      }
    }
  }
  return null;
}

module.exports = { snapToNavigable };
