#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e03_prueba_mordida_guarda.js — CLAUDE.md §4.6 aplicado a la guarda misma.
//
// La guarda nueva dice: una corrida con --insumo NO escribe el estado publicado,
// con ninguna combinacion de flags. Eso hay que probarlo intentandolo, no
// afirmandolo — que es exactamente lo que fallo antes: habia una redireccion
// escrita, documentada, y que no funcionaba.
//
// Cada caso INTENTA ensuciar el estado publicado por una via distinta y
// comprueba que el archivo sigue byte a byte igual. Y el control negativo
// comprueba que la corrida real SI lo escribe: una guarda que bloquea todo
// tampoco sirve.
//
//   node scripts/e03_prueba_mordida_guarda.js
//   salida 0 = ningun intento ensucio el estado y la corrida real si lo escribe.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const CONTROL = path.join(RAIZ, 'scripts/e01_control_drift_catalogo.js');
const ESTADO = path.join(RAIZ, 'data/catalogo/estado_drift.json');
const INTACTO = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_2026-08-11');
const ALTERADO = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_alterado_2026-08-11');
const TMP = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'e03-guarda-')), 'estado.json');

const huella = (p) => (fs.existsSync(p)
  ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
  : '(no existe)');

function correr(args) {
  try {
    return { salida: 0, out: execFileSync(process.execPath, [CONTROL, ...args], { cwd: RAIZ, encoding: 'utf8', timeout: 120000 }) };
  } catch (e) {
    return { salida: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

// Cada caso: el argv con que se intenta ensuciar el estado publicado.
const INTENTOS = [
  ['G1  --insumo alterado + --estado real (la forma que contamino 01d3901)',
    ['--insumo', ALTERADO, '--estado', ESTADO]],

  ['G2  --estado real PRIMERO y --insumo despues (el orden de drift-arranque)',
    ['--estado', ESTADO, '--insumo', ALTERADO]],

  ['G3  --estado repetido, real primero y temporal despues (el caso de la prueba de arranque)',
    ['--estado', ESTADO, '--estado', TMP, '--insumo', ALTERADO]],

  ['G4  --estado repetido al reves, temporal primero y real despues',
    ['--estado', TMP, '--estado', ESTADO, '--insumo', ALTERADO]],

  ['G5  --insumo repetido, intacto y despues alterado',
    ['--insumo', INTACTO, '--insumo', ALTERADO, '--estado', ESTADO]],

  ['G6  insumo INTACTO + --estado real (origen de prueba aunque el dato este sano)',
    ['--insumo', INTACTO, '--estado', ESTADO]],
];

const L = console.log;
let fallas = 0;

L('='.repeat(78));
L('PRUEBA DE MORDIDA — LA GUARDA DEL ESTADO PUBLICADO');
L(`estado publicado: ${path.relative(RAIZ, ESTADO)}`);
L('='.repeat(78));

const base = huella(ESTADO);
L(`\nsha256 de partida: ${base}\n`);

for (const [nombre, args] of INTENTOS) {
  const antes = huella(ESTADO);
  const r = correr(args);
  const despues = huella(ESTADO);
  const etq = nombre.padEnd(74);
  if (despues !== antes) {
    L(`${etq}\n    NO MUERDE — el estado publicado cambio. salida ${r.salida}`);
    fallas++;
  } else {
    const dijo = (r.out.split('\n').find(l => l.includes('[estado] NO se escribe')) || '').trim();
    L(`${etq}\n    intacto. salida ${r.salida}. ${dijo || '(sin linea de aviso)'}`);
    if (!dijo) {
      L('    FALLA: la guarda actuo en silencio. Tiene que decir por que no escribe.');
      fallas++;
    }
  }
}

// ── control negativo: la corrida REAL sigue escribiendo ──────────────────────
// Sin --insumo. Consulta en vivo. Si esto no escribe, la guarda bloqueo de mas y
// el archivo que D8 exige versionado dejaria de actualizarse solo.
L('');
L('-'.repeat(78));
L('CONTROL NEGATIVO — la corrida REAL (sin --insumo) tiene que escribir el estado');
L('-'.repeat(78));
const antesReal = huella(ESTADO);
const rReal = correr(['--estado', ESTADO]);
const despuesReal = huella(ESTADO);
const origen = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')).origen : '(no existe)';

if (despuesReal !== antesReal || /consulta en vivo/.test(origen)) {
  L(`escribe. salida ${rReal.salida}. origen registrado: "${origen}"`);
  if (!/consulta en vivo/.test(origen)) {
    L('FALLA: escribio, pero el origen no es una consulta en vivo.');
    fallas++;
  }
} else {
  L(`NO ESCRIBE — la guarda bloqueo de mas. salida ${rReal.salida}`);
  fallas++;
}

L('');
L('='.repeat(78));
if (fallas === 0) {
  L(`RESULTADO: ${INTENTOS.length}/${INTENTOS.length} intentos rechazados + control negativo.`);
  L('Ninguna combinacion de flags deja que un origen de prueba escriba el estado,');
  L('y la corrida real lo sigue escribiendo.');
  process.exit(0);
}
L(`RESULTADO: ${fallas} problema(s). La guarda NO se da por buena.`);
process.exit(1);
