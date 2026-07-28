'use strict';
/**
 * Cotejo vertical por sonda documentada, como ADVERTENCIA (Fase 3
 * redefinida -- spec-router-raster-v1.md SS6.3, docs/handoff-fase2.md).
 *
 * Por que advertencia y no bloqueo, a diferencia de como SS6.3 lo describe
 * originalmente ("el paso es INTRANSITABLE"): 6 de los 7 registros de
 * src/config/pasos-sonda-canal.json tienen posicion aproximada o ninguna
 * geometria verificable (ver ese archivo, campo canal_geometria_disponible).
 * Bloquear una ruta real por una sonda cuya ubicacion no esta confirmada
 * es peor que el falso positivo ocasional de advertir de mas -- el error
 * seguro es advertir sin necesidad, no cerrar un paso que si se navega.
 *
 * Post-proceso puro: corre DESPUES de que el A* ya trazo la ruta, sobre la
 * polilinea final. No modifica el raster, la LUT de costo ni el A* --
 * exactamente el mismo principio que ya aplica el router para KML/zonas
 * dragadas (el margen se relaja en el costo, nunca se prohibe explorar).
 */
const fs = require('fs');
const path = require('path');
const { canalesQueCruzaRuta } = require('./canal-geometria');

const PASOS_PATH = path.join(__dirname, '..', '..', 'config', 'pasos-sonda-canal.json');

let PASOS_CACHE = null;
function cargarPasos() {
  if (!PASOS_CACHE) {
    PASOS_CACHE = JSON.parse(fs.readFileSync(PASOS_PATH, 'utf8'));
  }
  return PASOS_CACHE;
}

/** spec SS6.3: margen_bajo_quilla = max(0.5m, 0.1 x calado). Preliminar,
 * practica nautica comun, no dato de fuente -- mismo criterio que
 * perfiles-costo.js documenta para otros margenes preliminares. */
function margenBajoQuilla(calado_m) {
  return Math.max(0.5, 0.1 * calado_m);
}

/**
 * @param {Array<[number,number]>} waypointsLonLat - ruta trazada, [lon,lat]
 * @param {number} calado_m
 * @returns {string[]} advertencias en texto, listas para el array `advertencias` de la respuesta
 */
function advertenciasCotejoVertical(waypointsLonLat, calado_m) {
  if (!calado_m || calado_m <= 0) return [];

  const pasos = cargarPasos().filter((p) => p.canal_geometria_disponible);
  if (pasos.length === 0) return [];

  const canalesCruzados = new Set(canalesQueCruzaRuta(waypointsLonLat));
  if (canalesCruzados.size === 0) return [];

  const margen = margenBajoQuilla(calado_m);
  const profundidadRequerida = calado_m + margen;

  const advertencias = [];
  for (const paso of pasos) {
    if (!canalesCruzados.has(paso.canal)) continue;
    if (paso.sonda_canal_min_m < profundidadRequerida) {
      advertencias.push(
        `Su ruta cruza ${paso.canal}, donde el Derrotero SHOA documenta ${paso.sonda_canal_min_m} m de sonda en ${paso.nombre} ` +
        `(p.${paso.pagina}) — menos que su calado (${calado_m} m) más margen de resguardo (${margen.toFixed(1)} m). ` +
        `Posición aproximada del dato: verifique con ecosonda antes de transitar.`
      );
    }
  }
  return advertencias;
}

module.exports = { advertenciasCotejoVertical, margenBajoQuilla };
