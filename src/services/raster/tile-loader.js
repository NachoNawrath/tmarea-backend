'use strict';
const fs = require('fs');
const path = require('path');
const { derivarGrueso } = require('./multi-level');

// Factor del nivel grueso relativo al medio (coarse.bin, factor 8):
// 32/8 = 4. Ver multi-level.js.
const FACTOR_GRUESO_ADICIONAL = 4;

// Los tiles (.bin/.coarse.bin/.meta.json) viven FUERA del repo -- son
// artefactos de 100+MB que GitHub rechaza. Ver tools/raster-build/ y
// TMAREA_SPEC_Router_Raster_v1.md §5.
const TILES_DIR = process.env.TMAREA_TILES_DIR || 'C:/tmarea-data/tiles';

function loadTile(tileId) {
  const metaPath = path.join(TILES_DIR, `${tileId}.meta.json`);
  const binPath = path.join(TILES_DIR, `${tileId}.bin`);
  const coarsePath = path.join(TILES_DIR, `${tileId}.coarse.bin`);

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  const binBuf = fs.readFileSync(binPath);
  const packed = new Uint16Array(binBuf.buffer, binBuf.byteOffset, binBuf.byteLength / 2);
  if (packed.length !== meta.rows * meta.cols) {
    throw new Error(
      `Tile ${tileId}: .bin tiene ${packed.length} celdas, meta.json espera ${meta.rows * meta.cols} (rows*cols)`
    );
  }

  const coarseFactor = meta.coarse_factor;
  const coarseRows = Math.ceil(meta.rows / coarseFactor);
  const coarseCols = Math.ceil(meta.cols / coarseFactor);
  const coarseBuf = fs.readFileSync(coarsePath);
  const coarse = new Uint16Array(coarseBuf.buffer, coarseBuf.byteOffset, coarseBuf.byteLength / 2);
  if (coarse.length !== coarseRows * coarseCols) {
    throw new Error(
      `Tile ${tileId}: .coarse.bin tiene ${coarse.length} celdas, esperado ${coarseRows * coarseCols}`
    );
  }

  const { grueso, gruesoRows, gruesoCols } = derivarGrueso(coarse, coarseRows, coarseCols, FACTOR_GRUESO_ADICIONAL);
  const gruesoFactor = coarseFactor * FACTOR_GRUESO_ADICIONAL;

  return {
    tileId,
    meta,
    packed,
    medio: coarse,
    medioRows: coarseRows,
    medioCols: coarseCols,
    medioFactor: coarseFactor,
    grueso,
    gruesoRows,
    gruesoCols,
    gruesoFactor,
  };
}

module.exports = { loadTile, TILES_DIR };
