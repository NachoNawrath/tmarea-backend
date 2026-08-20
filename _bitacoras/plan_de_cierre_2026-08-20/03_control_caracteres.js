// Control de caracteres por PUNTOS DE CODIGO — criterio H-T2.
//
// POR QUE POR PUNTOS DE CODIGO Y NO POR BYTES: el criterio viejo miraba bytes
// < 0x20, y U+0091 en UTF-8 son dos bytes -- C2 91 -- y ninguno es < 0x20. Un
// control por bytes da 0 sobre un fichero que SI lo trae. Ese es el falso
// negativo que H-T2 corrigio.
//
// CONTROL POSITIVO DEL PROPIO CRITERIO: se fabrica un U+0091 POR PUNTO DE
// CODIGO y se comprueba que el detector lo caza. Se fabrica, no se escribe como
// literal en este fichero: la primera version de un control de esta familia
// traia el centinela literal y SE MARCABA A SI MISMA.
//
// Corre sobre los ficheros TOCADOS del arbol mas los instrumentos de la sesion.
//
// DOS EXCLUSIONES DECLARADAS, y el motivo es el mismo: son la SALIDA de un
// control, y un control que se mide a si mismo cambia su propio resultado al
// escribirlo. Quedan fuera 03_control_caracteres.txt -- la salida de este mismo
// fichero -- y 04_control_contra_el_indice.txt, que ademas NO se stagea: es la
// salida de un control que corre CONTRA el indice y no puede vivir dentro del
// indice que valida. Se dice aca para que la ausencia no se lea como olvido.
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');

const FICHEROS = [
  '_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/01_escribir_filas.js',
  '_bitacoras/plan_de_cierre_2026-08-20/01_escribir_filas.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/02_enmendar_bitacora.js',
  '_bitacoras/plan_de_cierre_2026-08-20/02_enmendar_bitacora.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/03_control_caracteres.js',
  '_bitacoras/plan_de_cierre_2026-08-20/04_control_contra_el_indice.js',
  '_bitacoras/plan_de_cierre_2026-08-20/05_mensaje_commit.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/07_enmendar_defectos.js',
  '_bitacoras/plan_de_cierre_2026-08-20/07_enmendar_defectos.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/08_mensaje_commit.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/10_m1_ocho_puntos_lacustres.py',
  '_bitacoras/plan_de_cierre_2026-08-20/10_m1_ocho_puntos_lacustres.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/10a_instrumento_trackeado.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/11_fila_m1.js',
  '_bitacoras/plan_de_cierre_2026-08-20/11_fila_m1.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/12_enriquecer_y_corral.js',
  '_bitacoras/plan_de_cierre_2026-08-20/12_enriquecer_y_corral.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/13_bitacora_12.js',
  '_bitacoras/plan_de_cierre_2026-08-20/13_bitacora_12.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/14_mensaje_commit.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/17_m2_ocho_puntos_contra_seis.js',
  '_bitacoras/plan_de_cierre_2026-08-20/17_m2_ocho_puntos_contra_seis.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/18_solapes_y_areas.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/19_fila_m2.js',
  '_bitacoras/plan_de_cierre_2026-08-20/19_fila_m2.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/20_enriquecer_fila_m2.js',
  '_bitacoras/plan_de_cierre_2026-08-20/20_enriquecer_fila_m2.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/21_bitacora_13.js',
  '_bitacoras/plan_de_cierre_2026-08-20/21_bitacora_13.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/22_mensaje_commit.txt',
  '_bitacoras/plan_de_cierre_2026-08-20/23_control_contra_el_indice.js',
  '_bitacoras/plan_de_cierre_2026-08-20/24_dos_defectos_mas.js',
  '_bitacoras/plan_de_cierre_2026-08-20/24_dos_defectos_mas.txt',
  'data/deudas/deudas_declaradas.json',
  'scripts/validar_deudas_declaradas.js',
];

function sospechosos(texto) {
  const malos = [];
  for (const ch of texto) {
    const cp = ch.codePointAt(0);
    const raro = (cp < 0x20 && cp !== 0x0A && cp !== 0x0D) || cp === 0x7F || (cp >= 0x80 && cp <= 0x9F);
    if (raro) malos.push('U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
  }
  return malos;
}

let total = 0, sosp = 0, conBOM = 0, faltan = 0;
console.log('CONTROL DE CARACTERES — por puntos de codigo (H-T2)');
console.log('');
for (const rel of FICHEROS) {
  const abs = path.join(RAIZ, rel);
  if (!fs.existsSync(abs)) { console.log('  FALTA   ' + rel); faltan++; continue; }
  const t = fs.readFileSync(abs, 'utf8');
  let n = 0;
  for (const _ of t) n++;
  const m = sospechosos(t);
  const bom = t.charCodeAt(0) === 0xFEFF;
  total += n; sosp += m.length; if (bom) conBOM++;
  console.log('  ' + (m.length === 0 && !bom ? 'ok  ' : 'MAL ') +
              String(n).padStart(8) + ' puntos · ' + (bom ? 'CON BOM · ' : 'sin BOM · ') +
              (m.length ? [...new Set(m)].join(' ') + ' · ' : '') + rel);
}
console.log('');
console.log('  ficheros ................ ' + FICHEROS.length + ' · faltantes: ' + faltan);
console.log('  puntos de codigo ........ ' + total);
console.log('  sospechosos ............. ' + sosp);
console.log('  con BOM ................. ' + conBOM);

// control positivo: el centinela fabricado por punto de codigo
const centinela = 'texto normal' + String.fromCodePoint(0x91) + 'mas texto';
const caz = sospechosos(centinela);
console.log('  CONTROL POSITIVO: U+0091 fabricado -> cazado ' + caz.length + ' de 1 (' + caz.join('') + ')');

// control negativo: el mismo texto sin centinela
const limpio = sospechosos('texto normal mas texto');
console.log('  CONTROL NEGATIVO: el mismo texto sin centinela -> ' + limpio.length + ' (tiene que ser 0)');

// y el falso negativo que este criterio corrige, medido en vivo
const bytes = Buffer.from(centinela, 'utf8');
let porBytes = 0;
for (const b of bytes) if (b < 0x20 && b !== 0x0A && b !== 0x0D) porBytes++;
console.log('  EL FALSO NEGATIVO QUE H-T2 CORRIGE: el mismo centinela contado POR BYTES da ' +
            porBytes + '. Por eso este control no mira bytes.');

const ok = sosp === 0 && conBOM === 0 && faltan === 0 && caz.length === 1 && limpio.length === 0;
console.log('');
console.log(ok ? 'VERDE' : 'ROJO');
process.exit(ok ? 0 : 1);
