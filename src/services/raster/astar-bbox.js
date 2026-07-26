'use strict';
/**
 * A* restringido a un bounding box, con arrays tipados dimensionados al
 * BBOX (indice local), no al tile completo (spec §7.2).
 *
 * Por que esto reemplaza la version con Map/Set: Map/Set dispersos no
 * escalan -- en Anahuac->Chacabuco (250nm) una busqueda amplia agoto el
 * heap de V8 (>1.7GB) sin converger. La correccion NO es evitar arrays
 * tipados por miedo a dimensionarlos al tile completo (106,8M celdas,
 * eso si seria ~2GB) -- es dimensionarlos al BBOX DEL CORREDOR, que para
 * una ruta larga tipica es ~3,6M celdas (gScore+fScore Float32Array 14MB
 * c/u, cameFrom Int32Array 14MB, closed bitset ~450KB). El caso limite
 * "sin restriccion" (bbox = tile completo) tambien usa esta misma
 * funcion -- ahi si el bbox es grande (~1,3GB en total) pero sigue
 * siendo memoria DENSA y acotada, nunca la explosion sin limite de un
 * Map que crece con cada nodo tocado.
 */
const TypedBinaryHeap = require('./typed-heap');

const SQRT2 = Math.SQRT2;
// Vecinos aplanados en typed arrays paralelos (no array-de-arrays): evita
// el costo de destructuring por iteracion en el bucle mas caliente del
// modulo, que corre millones de veces en rutas largas.
const NEIGHBOR_DR = Int8Array.from([-1, -1, -1, 0, 0, 1, 1, 1]);
const NEIGHBOR_DC = Int8Array.from([-1, 0, 1, -1, 1, -1, 0, 1]);
const NEIGHBOR_DIST = Float64Array.from([SQRT2, 1, SQRT2, 1, 1, SQRT2, 1, SQRT2]);

function octileCells(r0, c0, r1, c1) {
  const dx = Math.abs(c0 - c1);
  const dy = Math.abs(r0 - r1);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
}

function bitsetGet(bs, i) {
  return (bs[i >>> 5] >>> (i & 31)) & 1;
}
function bitsetSet(bs, i) {
  bs[i >>> 5] |= 1 << (i & 31);
}

/**
 * @param {number} cols - cols del grid GLOBAL (para indexar cellValues/costLUT/isAllowed)
 * @param {{rowMin,rowMax,colMin,colMax}} bbox - coords globales, max exclusivo
 * @param {(globalIdx:number)=>boolean} [isAllowed] - filtro adicional sobre el bbox
 * @returns {{path:number[]|null, expansions:number, motivo?:string}}
 */
function astarBBox({
  cols,
  cellValues,
  costLUT,
  resM,
  startIdxGlobal,
  goalIdxGlobal,
  bbox,
  isAllowed = null,
  epsilon = 1.0,
  maxExpansions = 3_000_000,
}) {
  const { rowMin, rowMax, colMin, colMax } = bbox;
  const localRows = rowMax - rowMin;
  const localCols = colMax - colMin;
  const n = localRows * localCols;

  const globalRowOf = (globalIdx) => (globalIdx / cols) | 0;
  const globalColOf = (globalIdx) => globalIdx % cols;

  const toLocal = (globalIdx) => {
    const row = globalRowOf(globalIdx);
    const col = globalColOf(globalIdx);
    if (row < rowMin || row >= rowMax || col < colMin || col >= colMax) return -1;
    return (row - rowMin) * localCols + (col - colMin);
  };

  const startLocal = toLocal(startIdxGlobal);
  const goalLocal = toLocal(goalIdxGlobal);
  if (startLocal === -1 || goalLocal === -1) {
    return { path: null, expansions: 0, motivo: 'fuera_de_bbox' };
  }

  const gScore = new Float32Array(n).fill(Infinity);
  const fScore = new Float32Array(n).fill(Infinity);
  const cameFrom = new Int32Array(n).fill(-1);
  const closed = new Uint32Array((n >>> 5) + 1);

  const goalRow = (goalLocal / localCols) | 0;
  const goalCol = goalLocal % localCols;
  const startRow = (startLocal / localCols) | 0;
  const startCol = startLocal % localCols;

  gScore[startLocal] = 0;
  fScore[startLocal] = octileCells(startRow, startCol, goalRow, goalCol) * resM * epsilon;

  const heap = new TypedBinaryHeap(Math.min(n, 4096), fScore);
  heap.push(startLocal);

  let expansions = 0;
  while (!heap.isEmpty()) {
    const current = heap.pop();
    if (bitsetGet(closed, current)) continue;
    bitsetSet(closed, current);

    if (current === goalLocal) {
      return { path: reconstructPath(cameFrom, current, rowMin, colMin, localCols, cols), expansions };
    }
    if (++expansions > maxExpansions) {
      return { path: null, expansions, motivo: 'ruta_no_convergente' };
    }

    const row = (current / localCols) | 0;
    const col = current % localCols;
    const gCurrent = gScore[current];

    for (let k = 0; k < 8; k++) {
      const nr = row + NEIGHBOR_DR[k];
      const nc = col + NEIGHBOR_DC[k];
      if (nr < 0 || nr >= localRows || nc < 0 || nc >= localCols) continue;
      const nLocal = nr * localCols + nc;
      if (bitsetGet(closed, nLocal)) continue;

      const nGlobalIdx = (nr + rowMin) * cols + (nc + colMin);
      if (isAllowed && !isAllowed(nGlobalIdx)) continue;

      const cellCost = costLUT[cellValues[nGlobalIdx]];
      if (!Number.isFinite(cellCost)) continue;

      const tentativeG = gCurrent + NEIGHBOR_DIST[k] * resM * cellCost;
      if (tentativeG < gScore[nLocal]) {
        gScore[nLocal] = tentativeG;
        cameFrom[nLocal] = current;
        fScore[nLocal] = tentativeG + octileCells(nr, nc, goalRow, goalCol) * resM * epsilon;
        heap.push(nLocal);
      }
    }
  }
  return { path: null, expansions, motivo: 'sin_camino' };
}

function reconstructPath(cameFrom, goalLocal, rowMin, colMin, localCols, globalCols) {
  const toGlobal = (localIdx) => {
    const localRow = (localIdx / localCols) | 0;
    const localCol = localIdx % localCols;
    return (localRow + rowMin) * globalCols + (localCol + colMin);
  };
  const path = [toGlobal(goalLocal)];
  let cur = goalLocal;
  while (cameFrom[cur] !== -1) {
    cur = cameFrom[cur];
    path.push(toGlobal(cur));
  }
  path.reverse();
  return path;
}

module.exports = { astarBBox, octileCells };
