'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// drift-arranque.js — condición del owner sobre D8 (aprobada B1, 2026-08-11):
// al patrón no se le avisa, PERO la divergencia no puede ser silenciosa del lado
// del equipo. Alguien se tiene que enterar sin correr el control a mano.
//
// Qué hace: al arrancar el backend, dispara el control de drift en un proceso
// aparte y deja dos rastros —una línea de log y un archivo de estado versionado
// en el repositorio, `data/catalogo/estado_drift.json`—. Un cambio en el drift
// aparece como diff de git aunque nadie haya mirado la consola.
//
// Qué NO hace, a propósito:
//   · No bloquea ni demora el arranque. Corre desacoplado y el servidor escucha
//     igual. Que una fuente externa no responda no puede tumbar el servicio.
//   · No toca ningún flujo de veredicto ni cambia ninguna respuesta. Qué hace el
//     motor ante drift es D7 y está sin decidir.
//
// Límite declarado: un proceso de producción arranca rara vez, así que un drift
// que aparece a media semana no se ve hasta el próximo reinicio. La cura es la
// sonda periódica (C2 de `e01b_continuacion_2026-08-11.txt §2.6`), no esto.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const { execFile } = require('child_process');

const RAIZ = path.join(__dirname, '../..');
const CONTROL = path.join(RAIZ, 'scripts/e01_control_drift_catalogo.js');
const ESTADO = path.join(RAIZ, 'data/catalogo/estado_drift.json');
const TIMEOUT_MS = 45000;

// Códigos del control. 0 y 3 son estados conocidos; 1 y 2 son los que exigen que
// alguien mire. La distinción es interna del equipo — no decide nada de lo que ve
// el patrón — así que es criterio técnico y queda declarado acá.
const LECTURA = {
  0: ['info', 'sin drift: el catálogo interno y SITPORT coinciden'],
  1: ['ATENCIÓN', 'DRIFT NO DECLARADO — apareció una divergencia que nadie había visto'],
  2: ['ATENCIÓN', 'no se pudo medir el drift: SITPORT o la base no respondieron'],
  3: ['info', 'drift conocido y declarado, pendiente de decisión'],
};

// `argsExtra` existe para poder probar este aviso contra un insumo alterado
// (scripts/e01_prueba_mordida_arranque.js). El arranque real no lo usa.
function revisarDriftEnArranque({ log = console, argsExtra = [] } = {}) {
  const t0 = Date.now();
  execFile(process.execPath, [CONTROL, '--estado', ESTADO, ...argsExtra], {
    cwd: RAIZ, timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024,
  }, (error, stdout) => {
    const ms = Date.now() - t0;
    const code = error && typeof error.code === 'number' ? error.code
      : error ? null
        : 0;

    if (code === null) {
      log.warn(`[drift] ATENCIÓN — el control no pudo correr (${error.message}). ` +
        'No hay medición de drift en este arranque; eso NO es "sin drift".');
      return;
    }

    const [nivel, texto] = LECTURA[code] || ['ATENCIÓN', `el control salió con un código inesperado (${code})`];
    const resumen = (stdout || '').split('\n').find(l => l.startsWith('total ')) || '';

    const linea = `[drift] ${texto}${resumen ? ' :: ' + resumen.trim() : ''} (${ms}ms, salida ${code}) ` +
      `— detalle en ${path.relative(RAIZ, ESTADO)}`;
    if (nivel === 'info') log.log(linea); else log.warn(linea);
  });
}

module.exports = { revisarDriftEnArranque, ESTADO, CONTROL };
