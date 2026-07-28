'use strict';
/**
 * Adjunta el texto de advertencia de peligros por canal (Fase 3
 * redefinida, docs/handoff-fase2.md) a una ruta ya trazada.
 * src/config/peligros-por-canal.json se genera de peligros_full.csv
 * (tools/raster-build/generar_peligros_por_canal.py) -- no alimenta el
 * raster (spec extraccion SS0.1), es texto informativo.
 *
 * Misma limitacion que cotejo-vertical.js: solo se adjunta para los
 * canales con geometria real verificable (canal-geometria.js). Un canal
 * sin geometria puede tener peligros catalogados en el JSON, pero el
 * router no tiene forma de confirmar que la ruta pasa por ahi, asi que no
 * los adjunta -- no se inventa la deteccion.
 */
const fs = require('fs');
const path = require('path');
const { canalesQueCruzaRuta } = require('./canal-geometria');

const PELIGROS_PATH = path.join(__dirname, '..', '..', 'config', 'peligros-por-canal.json');

let CACHE = null;
function cargarPeligrosPorCanal() {
  if (!CACHE) {
    CACHE = JSON.parse(fs.readFileSync(PELIGROS_PATH, 'utf8'));
  }
  return CACHE;
}

/**
 * @param {Array<[number,number]>} waypointsLonLat
 * @returns {string[]} textos de advertencia, uno por canal cruzado con peligros catalogados
 */
function advertenciasPeligrosPorCanal(waypointsLonLat) {
  const canalesCruzados = canalesQueCruzaRuta(waypointsLonLat);
  if (canalesCruzados.length === 0) return [];

  const porCanal = cargarPeligrosPorCanal();
  const advertencias = [];
  for (const canal of canalesCruzados) {
    const entry = porCanal[canal];
    if (entry && entry.texto_advertencia) {
      advertencias.push(entry.texto_advertencia);
    }
  }
  return advertencias;
}

module.exports = { advertenciasPeligrosPorCanal };
