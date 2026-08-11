#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e01_prueba_mordida_arranque.js — CLAUDE.md §4.6 aplicado al aviso de arranque.
//
// El aviso de arranque es un control nuevo: si nunca se probó contra un insumo
// malo, no prueba nada. Acá se le pasa el insumo alterado a propósito y se
// comprueba que grita, y el intacto, que no.
//
// El archivo de estado se redirige a un temporal: esta prueba no pisa
// data/catalogo/estado_drift.json.
//
// Uso:  node scripts/e01_prueba_mordida_arranque.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const modulo = require('../src/services/drift-arranque');

const RAIZ = path.join(__dirname, '..');
const INTACTO = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_2026-08-11');
const ALTERADO = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_alterado_2026-08-11');
const ESTADO_TMP = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'e01-arranque-')), 'estado.json');

// El módulo escribe siempre en su ESTADO fijo; para la prueba se le pasa otro
// por argumento, que el control toma porque el último --estado gana.
function correr(insumo) {
  return new Promise(resolve => {
    const lineas = [];
    const log = {
      log: m => lineas.push(['info', m]),
      warn: m => lineas.push(['warn', m]),
      error: m => lineas.push(['warn', m]),
    };
    modulo.revisarDriftEnArranque({ log, argsExtra: ['--estado', ESTADO_TMP, '--insumo', insumo] });
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

  L('');
  L('='.repeat(78));
  if (fallas === 0) {
    L('RESULTADO: el aviso de arranque grita con drift no declarado y calla sin él.');
    process.exit(0);
  }
  L(`RESULTADO: ${fallas} problema(s). El aviso de arranque NO se da por bueno.`);
  process.exit(1);
})();
