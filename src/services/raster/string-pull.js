'use strict';
/**
 * String-pulling (spec §7.4): simplifica el camino de celdas del A* a
 * waypoints, con un umbral de linea de vista MAS estricto que el de
 * ruteo (d >= 2*dMinM) para que la polilinea quede mas conservadora que
 * el camino de celdas -- ninguna tangente roza un vertice rocoso. Si un
 * tramo no cumple, se conserva el vertice intermedio.
 *
 * Algoritmo: extension voraz hacia adelante. Para cada punto de anclaje,
 * extiende el candidato lo mas lejos posible mientras la linea de vista
 * se mantenga; cuando falla, ancla en el ultimo punto valido. O(n) en la
 * practica para geometrias razonables (cada celda se toca un numero
 * acotado de veces), a diferencia del clasico O(n^2) de buscar el punto
 * mas lejano visible desde cada ancla.
 */
function lineOfSight(idxA, idxB, meta, packed, umbralM) {
  const { cols, unit_m } = meta;
  const r0 = (idxA / cols) | 0;
  const c0 = idxA % cols;
  const r1 = (idxB / cols) | 0;
  const c1 = idxB % cols;
  const steps = Math.max(1, Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)));

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const r = Math.round(r0 + (r1 - r0) * t);
    const c = Math.round(c0 + (c1 - c0) * t);
    const raw = packed[r * cols + c];
    const confianza = (raw >> 13) & 0b11;
    if (confianza === 0) return false;
    const d = (raw & 0x1fff) * unit_m;
    if (d < umbralM) return false;
  }
  return true;
}

function stringPull(path, meta, packed, dMinM) {
  if (path.length <= 2) return path.slice();
  const umbralM = 2 * dMinM;

  const simplified = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = i + 1;
    while (j + 1 < path.length && lineOfSight(path[i], path[j + 1], meta, packed, umbralM)) {
      j++;
    }
    simplified.push(path[j]);
    i = j;
  }
  return simplified;
}

module.exports = { stringPull, lineOfSight };
