'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 03_mordida.js — PRUEBA DE MORDIDA de 01_medir_rotulos.js (CLAUDE.md §4.6).
//
// Corrida:  node _bitacoras/auditoria_rotulos_2026-08-15/03_mordida.js
// Shell declarada (§7.3): igual en PowerShell y Git Bash.
//
// Un control que solo se ve en verde no se distingue de uno que no muerde. Se
// le inyecta a 01 el defecto que debe cazar, sobre COPIAS en el scratchpad, y
// se confirma que lo caza. NINGUN archivo del repositorio se altera.
//
// Los tres defectos y lo que cada uno debe producir:
//   B1  un rotulo hoy CORRECTO se cambia por otra Capitania que existe
//       -> DIFIEREN sube en 1 y creibles-y-equivocadas sube en 1
//   B2  un rotulo hoy no nulo se pone en null
//       -> `rotulo null` sube en 1 y COMPARACIONES EFECTIVAS baja en 1
//   B3  el lado SITPORT se vacia
//       -> COMPARACIONES EFECTIVAS = 0 y el proceso ABORTA con exit 3
//
// B3 es el que importa: un lado vacio y un lado identico dan las mismas CERO
// diferencias. Este control ya mordio de verdad una vez en esta sesion — el
// cargador leia `recordsets` como si fuera el array de datos y la captura del
// 2026-08-12 entraba con UN registro. Salio por exit 3, no en verde.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const SCRATCH = process.env.SCRATCH_MORDIDA ||
  'C:/Users/katia/AppData/Local/Temp/claude/C--Users-katia--claude/46adb630-73a5-4005-a2a1-60bf7991aac1/scratchpad/mordida_rotulos';
const MEDIR = path.join(__dirname, '01_medir_rotulos.js');

fs.mkdirSync(SCRATCH, { recursive: true });
const L = (...a) => console.log(...a);

function correr(env) {
  try {
    const out = execFileSync(process.execPath, [MEDIR], {
      cwd: RAIZ, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024,
    });
    return { exit: 0, out };
  } catch (e) {
    return { exit: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}
// lee la PRIMERA aparicion de cada cifra, que es la del bloque de la captura del 08-13.
// La etiqueta se pasa EN CRUDO y se escapa aca una sola vez. Pasarla ya escapada
// hacia que el escapado se aplicara dos veces y el regex no calzara nunca: la
// cifra salia `null` hasta en la linea base y B2 se leia como "no mordio" cuando
// el que fallaba era este lector. Queda escrito porque no se ve mirando el verde.
const cifra = (out, etiqueta) => {
  const m = out.match(new RegExp(etiqueta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*(\\d+)'));
  return m ? Number(m[1]) : null;
};
// prueba del propio lector: si estas dos no leen numero, el ensayo no vale nada
function verificarLector(out) {
  const faltan = ['COMPARACIONES EFECTIVAS', 'DIFIEREN', 'rotulo null (no compara)']
    .filter(e => cifra(out, e) === null);
  if (faltan.length) {
    L(`ABORTA: el lector del ensayo no encuentra ${faltan.join(' / ')} en la salida de 01.`);
    L('Un ensayo cuyo lector no lee mide su propio regex, no el control.');
    process.exit(3);
  }
}
const creibles = out => {
  const m = out.match(/contra SITPORT 2026-08-13\s*:\s*creibles-y-equivocadas=(\d+)/);
  return m ? Number(m[1]) : null;
};

L('================================================================================');
L('PRUEBA DE MORDIDA — 01_medir_rotulos.js. 2026-08-15');
L('================================================================================');
L('');

// ─── LINEA BASE ──────────────────────────────────────────────────────────────
const base = correr({});
const B = {
  exit: base.exit,
  comparadas: cifra(base.out, 'COMPARACIONES EFECTIVAS'),
  difieren: cifra(base.out, 'DIFIEREN'),
  nulos: cifra(base.out, 'rotulo null (no compara)'),
  creibles: creibles(base.out),
};
verificarLector(base.out);
L('LINEA BASE (archivos del repositorio, sin tocar)');
L(`  exit=${B.exit}  comparadas=${B.comparadas}  difieren=${B.difieren}  rotuloNull=${B.nulos}  creibles=${B.creibles}`);
if (B.exit !== 0) { L('ABORTA: la linea base ya sale en rojo, no se puede medir mordida contra ella.'); process.exit(3); }

const mapaOrig = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/bahia-capitania-map.json'), 'utf8'));
const resultados = [];

// ─── B1 — rotulo correcto -> otra Capitania que existe ───────────────────────
// La 71 (BAHÍA DE ARICA) coincide hoy: mapa "Arica" y SITPORT CdRep 2 "ARICA".
{
  const m = JSON.parse(JSON.stringify(mapaOrig));
  const antes = m['71'].capitania;
  m['71'].capitania = 'Iquique';                 // existe, y NO es la que SITPORT atribuye
  const f = path.join(SCRATCH, 'mapa_B1.json');
  fs.writeFileSync(f, JSON.stringify(m, null, 2), 'utf8');
  const r = correr({ MAPA_OVERRIDE: path.relative(RAIZ, f).replace(/\\/g, '/') });
  const d = cifra(r.out, 'DIFIEREN'), c = creibles(r.out);
  const mordio = d === B.difieren + 1 && c === B.creibles + 1;
  L('');
  L(`B1 — bahia 71: capitania "${antes}" -> "Iquique" (nombre que existe, Capitania equivocada)`);
  L(`  esperado: difieren ${B.difieren}->${B.difieren + 1}  creibles ${B.creibles}->${B.creibles + 1}`);
  L(`  medido  : difieren ${B.difieren}->${d}  creibles ${B.creibles}->${c}   exit=${r.exit}`);
  L(`  MORDIO: ${mordio ? 'SI' : 'NO'}`);
  resultados.push(['B1', mordio]);
}

// ─── B2 — rotulo no nulo -> null ─────────────────────────────────────────────
{
  const m = JSON.parse(JSON.stringify(mapaOrig));
  const antes = m['71'].capitania;
  m['71'].capitania = null;
  const f = path.join(SCRATCH, 'mapa_B2.json');
  fs.writeFileSync(f, JSON.stringify(m, null, 2), 'utf8');
  const r = correr({ MAPA_OVERRIDE: path.relative(RAIZ, f).replace(/\\/g, '/') });
  const n = cifra(r.out, 'rotulo null (no compara)'), comp = cifra(r.out, 'COMPARACIONES EFECTIVAS');
  const mordio = n === B.nulos + 1 && comp === B.comparadas - 1;
  L('');
  L(`B2 — bahia 71: capitania "${antes}" -> null`);
  L(`  esperado: rotuloNull ${B.nulos}->${B.nulos + 1}  comparadas ${B.comparadas}->${B.comparadas - 1}`);
  L(`  medido  : rotuloNull ${B.nulos}->${n}  comparadas ${B.comparadas}->${comp}   exit=${r.exit}`);
  L(`  MORDIO: ${mordio ? 'SI' : 'NO'}`);
  resultados.push(['B2', mordio]);
}

// ─── B3 — el lado SITPORT vacio ──────────────────────────────────────────────
// El defecto peligroso: cero diferencias porque no hay con que comparar.
{
  const f = path.join(SCRATCH, 'sitport_vacio.json');
  fs.writeFileSync(f, JSON.stringify([]), 'utf8');
  const r = correr({ SITPORT_OVERRIDE: path.relative(RAIZ, f).replace(/\\/g, '/') });
  const abortoPorCero = r.exit === 3 && /no se encontraron registros con IDBahia|CERO comparaciones/.test(r.out);
  L('');
  L('B3 — la captura de SITPORT se reemplaza por un array vacio');
  L(`  esperado: exit 3 y el motivo escrito, NUNCA "0 diferencias" en verde`);
  L(`  medido  : exit=${r.exit}`);
  const motivo = (r.out.match(/^ABORTA — .*$/m) || ['(sin linea ABORTA)'])[0];
  L(`  motivo  : ${motivo}`);
  L(`  MORDIO: ${abortoPorCero ? 'SI' : 'NO'}`);
  resultados.push(['B3', abortoPorCero]);
}

L('');
L('=== VEREDICTO ===');
for (const [k, v] of resultados) L(`  ${k}: ${v ? 'MORDIO' : 'NO MORDIO'}`);
const todos = resultados.every(r => r[1]);
L(`  ${todos ? 'Los tres controles muerden.' : 'HAY AL MENOS UN CONTROL QUE NO MUERDE.'}`);
L('');
L(`Copias del ensayo en: ${SCRATCH} — fuera del repositorio, no se versionan.`);
L('Ningun archivo del repositorio fue alterado por esta prueba.');
L('================================================================================');
process.exit(todos ? 0 : 1);
