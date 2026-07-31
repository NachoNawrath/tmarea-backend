'use strict';
/**
 * Niveles agregados para el A* jerarquico de 3 niveles (spec §7.2):
 * grueso (factor 32, ~1600m) -> medio (factor 8, ~400m, es el
 * coarse.bin del pipeline) -> fino (factor 1, 50m).
 *
 * "Medio" viene del pipeline Python. "Grueso" se deriva aca en Node via
 * un max-pool ADICIONAL de factor 4 (32/8) sobre "medio" -- el maximo de
 * maximos es el maximo, asi que esto es matematicamente identico a
 * max-poolear desde resolucion fina directamente (salvo un margen
 * despreciable en el redondeo del padding de borde). Evita duplicar
 * logica de build en Python solo para acelerar el corredor global.
 */

function derivarGrueso(medio, medioRows, medioCols, factorAdicional) {
  const gruesoRows = Math.ceil(medioRows / factorAdicional);
  const gruesoCols = Math.ceil(medioCols / factorAdicional);
  const grueso = new Uint16Array(gruesoRows * gruesoCols);

  for (let gr = 0; gr < gruesoRows; gr++) {
    const mrStart = gr * factorAdicional;
    const mrEnd = Math.min(mrStart + factorAdicional, medioRows);
    for (let gc = 0; gc < gruesoCols; gc++) {
      const mcStart = gc * factorAdicional;
      const mcEnd = Math.min(mcStart + factorAdicional, medioCols);
      let maxVal = 0;
      for (let mr = mrStart; mr < mrEnd; mr++) {
        const base = mr * medioCols;
        for (let mc = mcStart; mc < mcEnd; mc++) {
          const v = medio[base + mc];
          if (v > maxVal) maxVal = v;
        }
      }
      grueso[gr * gruesoCols + gc] = maxVal;
    }
  }
  return { grueso, gruesoRows, gruesoCols };
}

const NEIGHBORS8 = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

/**
 * BFS multi-fuente acotado a radioCeldas pasos, sobre la grilla de UN
 * nivel (grueso o medio -- ambas chicas, ~104K y ~1,7M celdas). Map/Set
 * es apropiado aca (no es el bucle caliente del A* fino que motivo el
 * rediseño): esto ya se midio en ms, no en segundos.
 */
function dilatar(pathCellsNivel, rowsNivel, colsNivel, radioCeldas) {
  const corridor = new Set();
  const dist = new Map();
  const queue = [];

  for (const idx of pathCellsNivel) {
    if (!dist.has(idx)) {
      dist.set(idx, 0);
      corridor.add(idx);
      queue.push(idx);
    }
  }
  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const d = dist.get(idx);
    if (d >= radioCeldas) continue;
    const row = (idx / colsNivel) | 0;
    const col = idx % colsNivel;
    for (const [dr, dc] of NEIGHBORS8) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= rowsNivel || nc < 0 || nc >= colsNivel) continue;
      const nIdx = nr * colsNivel + nc;
      if (dist.has(nIdx)) continue;
      dist.set(nIdx, d + 1);
      corridor.add(nIdx);
      queue.push(nIdx);
    }
  }
  return corridor;
}

/**
 * Bounding box del corredor (en coords de su propio nivel) traducido al
 * nivel siguiente (mas fino), multiplicando por el factor entre niveles.
 */
function bboxANivelFino(corridorSet, colsNivel, factorAlNivelFino, finoRows, finoCols) {
  let rowMin = Infinity, rowMax = -Infinity, colMin = Infinity, colMax = -Infinity;
  for (const idx of corridorSet) {
    const row = (idx / colsNivel) | 0;
    const col = idx % colsNivel;
    if (row < rowMin) rowMin = row;
    if (row > rowMax) rowMax = row;
    if (col < colMin) colMin = col;
    if (col > colMax) colMax = col;
  }
  return {
    rowMin: Math.max(0, rowMin * factorAlNivelFino),
    rowMax: Math.min(finoRows, (rowMax + 1) * factorAlNivelFino),
    colMin: Math.max(0, colMin * factorAlNivelFino),
    colMax: Math.min(finoCols, (colMax + 1) * factorAlNivelFino),
  };
}

/**
 * Convierte el Set de celdas de nivel a un Uint8Array (bitmap plano) del
 * tamano de ESE nivel (chico: grueso ~104K, medio ~1,7M). Lookup por
 * indice O(1) sin hashing -- se llama ~8 veces por celda expandida en el
 * bucle caliente del A* fino, y ahi Set.has() de V8 pesa mucho mas que
 * un acceso a array tipado.
 */
function corridorABitmap(corridorSet, totalCeldasNivel) {
  const bitmap = new Uint8Array(totalCeldasNivel);
  for (const idx of corridorSet) bitmap[idx] = 1;
  return bitmap;
}

function makeCorridorPredicate(corridorBitmap, colsFino, factorAlNivel, colsNivel) {
  return function isAllowed(finoIdx) {
    const row = (finoIdx / colsFino) | 0;
    const col = finoIdx % colsFino;
    const nivelRow = (row / factorAlNivel) | 0;
    const nivelCol = (col / factorAlNivel) | 0;
    return corridorBitmap[nivelRow * colsNivel + nivelCol] === 1;
  };
}

// Radios de dilatacion del corredor jerarquico (grueso->medio->fino), probados
// en orden. Los dos ultimos (24/48 km) son para pasos abiertos donde el camino
// navegable rodea una peninsula muy lejos de la recta grueso (p.ej. Golfo de
// Penas / Peninsula de Taitao, ~46.5S): con solo 3/6/12 km el corredor fino no
// contenia la vuelta por el exterior y la ruta caia al A* fino SIN restriccion
// (lento y a veces agota el tope de expansiones). Estos radios anchos solo se
// evaluan cuando los estrechos fallan, asi que no penalizan las rutas normales.
const RADIOS_DILATACION_M = [3000, 6000, 12000, 24000, 48000];

module.exports = { derivarGrueso, dilatar, bboxANivelFino, corridorABitmap, makeCorridorPredicate, RADIOS_DILATACION_M };
