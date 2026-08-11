#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e01_prueba_mordida_arranque.js — CLAUDE.md §4.6 aplicado al aviso de arranque.
//
// El aviso de arranque es un control nuevo: si nunca se probó contra un insumo
// malo, no prueba nada. Acá se le pasa el insumo alterado a propósito y se
// comprueba que grita, y el intacto, que no.
//
// ESTA PRUEBA NO PISA data/catalogo/estado_drift.json, y ya no porque redirija
// el archivo a ningún lado: porque el control NO ESCRIBE el estado cuando corre
// con --insumo, que es siempre el caso acá. Es una propiedad del control, no una
// precaución de esta prueba.
//
// CORRECCIÓN 2026-08-11 (CLAUDE.md §3.3 — se agrega, no se reescribe). La
// versión anterior de este archivo decía:
//
//     "El archivo de estado se redirige a un temporal: esta prueba no pisa
//      data/catalogo/estado_drift.json."
//     "...que el control toma porque el último --estado gana."
//
// Las dos frases eran falsas. `arg()` usaba indexOf, que devuelve la PRIMERA
// ocurrencia, y drift-arranque.js pone su `--estado` real ANTES de argsExtra:
// el temporal nunca ganaba y esta prueba escribía el archivo publicado con el
// insumo alterado adentro. Es el rastro que quedó commiteado en 01d3901.
// Medición y reproducción en _bitacoras/e03_recon_estado_drift_2026-08-11.txt.
//
// Uso:  node scripts/e01_prueba_mordida_arranque.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const modulo = require('../src/services/drift-arranque');

const RAIZ = path.join(__dirname, '..');
const INTACTO = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_2026-08-11');
const ALTERADO = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_alterado_2026-08-11');

// Huella del estado publicado, para comprobar al final que sigue igual. La
// prueba comprueba su propia inocuidad en vez de declararla en un comentario,
// que es lo que fallaba antes.
const huellaEstado = () => (fs.existsSync(modulo.ESTADO)
  ? crypto.createHash('sha256').update(fs.readFileSync(modulo.ESTADO)).digest('hex')
  : '(no existe)');

// El módulo pasa siempre `--estado ESTADO`. No se le contrapone nada: la guarda
// del control descarta la escritura por el solo hecho de que haya --insumo.
function correr(insumo) {
  return new Promise(resolve => {
    const lineas = [];
    const log = {
      log: m => lineas.push(['info', m]),
      warn: m => lineas.push(['warn', m]),
      error: m => lineas.push(['warn', m]),
    };
    modulo.revisarDriftEnArranque({ log, argsExtra: ['--insumo', insumo] });
    const esperar = () => (lineas.length ? resolve(lineas) : setTimeout(esperar, 200));
    esperar();
  });
}

(async () => {
  let fallas = 0;
  const L = console.log;
  L('='.repeat(78));
  L('PRUEBA DE MORDIDA — AVISO DE DRIFT EN EL ARRANQUE');
  L('='.repeat(78));
  L('');

  const huellaAntes = huellaEstado();
  L(`estado publicado ANTES : ${path.relative(RAIZ, modulo.ESTADO)}`);
  L(`                sha256 : ${huellaAntes}`);
  L('');

  const [[nivelOk, textoOk]] = await correr(INTACTO);
  if (nivelOk === 'info' && /declarad/i.test(textoOk)) {
    L(`M0  control negativo — insumo intacto : NO grita. ${textoOk.slice(0, 96)}`);
  } else {
    L(`M0  control negativo — insumo intacto : GRITA cuando no debía -> [${nivelOk}] ${textoOk}`);
    fallas++;
  }

  const [[nivelMal, textoMal]] = await correr(ALTERADO);
  if (nivelMal === 'warn' && /DRIFT NO DECLARADO/.test(textoMal)) {
    L(`M1  insumo alterado a propósito       : grita. ${textoMal.slice(0, 96)}`);
  } else {
    L(`M1  insumo alterado a propósito       : NO GRITA — el arranque se comió el drift -> [${nivelMal}] ${textoMal}`);
    fallas++;
  }

  // M2 — la prueba comprueba que no ensucia lo que mide. Las dos corridas de
  // arriba usaron --insumo, así que el control no pudo escribir el estado.
  L('');
  const huellaDespues = huellaEstado();
  L(`estado publicado DESPUÉS: sha256 ${huellaDespues}`);
  if (huellaDespues === huellaAntes) {
    L('M2  el estado publicado                : INTACTO tras las dos corridas.');
  } else {
    L('M2  el estado publicado                : CAMBIÓ — la prueba escribió el archivo real.');
    L('    Es el defecto que la guarda de --insumo existe para impedir.');
    fallas++;
  }

  L('');
  L('='.repeat(78));
  if (fallas === 0) {
    L('RESULTADO: el aviso de arranque grita con drift no declarado, calla sin él,');
    L('           y no toca el estado publicado.');
    process.exit(0);
  }
  L(`RESULTADO: ${fallas} problema(s). El aviso de arranque NO se da por bueno.`);
  process.exit(1);
})();
