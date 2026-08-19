#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
// 08_mordida_control_caracteres.js - (a1)-T
//
// El control de caracteres de control de 03_cierre_controles.js salio VERDE
// sobre 21 ficheros sin que nadie probara que puede dar ROJO. Es un control de
// "no hay": el modo de falla es salir verde por no saber mirar. Aca se le
// inyecta el defecto que dice cazar.
//
// Mide LA MISMA funcion que corre el control -- lib_control_caracteres.js --,
// no una transcripcion. Y mide tambien la VERSION VIEJA, la que esta sesion
// escribio a las 22:22, porque la diferencia entre las dos ES el hallazgo.
//
// No toca ningun fichero del arbol: trabaja sobre buffers en memoria.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { controlesEnBytes, controlesEnBytes_VERSION_VIEJA_CON_HUECO } = require('./lib_control_caracteres');

const RAIZ = path.join(__dirname, '..', '..');
const DECL = path.join(RAIZ, 'data/catalogo/anclas_declaradas.json');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det !== undefined ? ' - ' + det : ''));
  else { fallas.push(n); say('  x ROJO - ' + n + (det !== undefined ? ' - ' + det : '')); }
};

const LIMPIO = fs.readFileSync(DECL);
const C1 = String.fromCharCode(0x91);

say('='.repeat(78));
say('(a1)-T - MORDIDA DEL CONTROL DE CARACTERES DE CONTROL');
say('corrida ' + new Date().toISOString());
say('='.repeat(78));
say('');
say('  fichero de partida: data/catalogo/anclas_declaradas.json - ' + LIMPIO.length + ' bytes');

say('');
say('CN - CONTROL NEGATIVO: el fichero real, limpio, no puede morder');
exigir('criterio vigente: 0 hallazgos', controlesEnBytes(LIMPIO).length === 0, controlesEnBytes(LIMPIO).length);

say('');
say('I1 - SE INYECTA UN C0 (0x07, BEL) en el contenido');
const i1 = Buffer.concat([LIMPIO.subarray(0, 100), Buffer.from([0x07]), LIMPIO.subarray(100)]);
const r1 = controlesEnBytes(i1);
const v1 = controlesEnBytes_VERSION_VIEJA_CON_HUECO(i1);
say('    criterio vigente ...... ' + r1.length + ' hallazgo(s)' + (r1[0] ? ' · ' + r1[0].clase + ' ' + r1[0].detalle : ''));
say('    version vieja ......... ' + v1.length + ' hallazgo(s)');
exigir('el criterio vigente MUERDE', r1.length > 0, r1.length);
exigir('la version vieja tambien mordia este caso', v1.length > 0, v1.length);

say('');
say('I2 - SE INYECTA EL U+0091 CRUDO, que es el caracter real del nodo 656 (H-8)');
say('     En UTF-8 son DOS bytes: 0xC2 0x91. Ninguno de los dos es menor que 0x20.');
const i2 = Buffer.concat([LIMPIO.subarray(0, 100), Buffer.from(C1, 'utf8'), LIMPIO.subarray(100)]);
const r2 = controlesEnBytes(i2);
const v2 = controlesEnBytes_VERSION_VIEJA_CON_HUECO(i2);
say('    bytes inyectados ...... ' + [...Buffer.from(C1, 'utf8')].map(b => '0x' + b.toString(16)).join(' '));
say('    criterio vigente ...... ' + r2.length + ' hallazgo(s)' + (r2[0] ? ' · ' + r2[0].clase + ' ' + r2[0].detalle : ''));
say('    version vieja ......... ' + v2.length + ' hallazgo(s)   <<< EL HUECO');
exigir('el criterio VIGENTE muerde el C1', r2.length > 0, r2.length);
exigir('y lo clasifica como C1', r2.length > 0 && r2[0].clase === 'C1', r2.length ? r2[0].clase : '(ninguno)');
exigir('QUEDA MEDIDO que la version vieja NO lo mordia', v2.length === 0, v2.length + ' hallazgos');

say('');
say('I3 - EL DEFECTO DEL ESCAPADOR DE HOY, que era el mordedor propuesto');
say('     El escapador con rango U+0000 se llevaba los LF del JSON indentado y los');
say('     dejaba como la secuencia ASCII escapada. MEDICION: eso NO agrega ningun');
say('     byte de control -- al reves, SACA los LF -- asi que este control se queda');
say('     VERDE. No es su mordedor. El que caza ese defecto es OTRO: el re-parseo');
say('     del JSON que 01_construir_declarativo.js hace despues de escribir.');
const malEscapado = Buffer.from(LIMPIO.toString('utf8').replace(/\n/g, '\\u000a'), 'utf8');
const r3 = controlesEnBytes(malEscapado);
say('    LF en el fichero limpio ..... ' + [...LIMPIO].filter(b => b === 0x0a).length);
say('    LF tras el mal escapado ..... ' + [...malEscapado].filter(b => b === 0x0a).length);
say('    criterio vigente ............ ' + r3.length + ' hallazgo(s)');
exigir('MEDIDO: el control de caracteres NO caza el defecto del escapador', r3.length === 0, r3.length);
let reparsea = true;
try { JSON.parse(malEscapado.toString('utf8')); } catch (e) { reparsea = false; }
exigir('y el que SI lo caza es el re-parseo del JSON', reparsea === false, 'JSON.parse falla');

say('');
say('I4 - SE INYECTA UN DEL (0x7F)');
const i4 = Buffer.concat([LIMPIO.subarray(0, 100), Buffer.from([0x7f]), LIMPIO.subarray(100)]);
const r4 = controlesEnBytes(i4);
const v4 = controlesEnBytes_VERSION_VIEJA_CON_HUECO(i4);
say('    criterio vigente ...... ' + r4.length + ' hallazgo(s)' + (r4[0] ? ' · ' + r4[0].clase : ''));
say('    version vieja ......... ' + v4.length + ' hallazgo(s)   <<< segundo hueco');
exigir('el criterio vigente muerde el DEL', r4.length > 0 && r4[0].clase === 'DEL', r4.length);
exigir('QUEDA MEDIDO que la version vieja tampoco lo mordia', v4.length === 0, v4.length);

say('');
say('I5 - CONTROL NEGATIVO DEL CRITERIO (c): un 0xC2 que NO precede a un C1');
say('     "Ã" es U+00C3 = 0xC3 0x83, y el nombre del 656 trae "ã" = 0xC3 0xA3.');
say('     Si el criterio marcara cualquier 0xC2/0xC3, el fichero real ya seria rojo.');
const i5 = Buffer.concat([LIMPIO, Buffer.from('Âáñ', 'utf8')]);
exigir('acentos y enies NO disparan el criterio', controlesEnBytes(i5).length === 0, controlesEnBytes(i5).length);

say('');
say('='.repeat(78));
if (fallas.length === 0) {
  say('VERDE - el control muerde C0, C1 y DEL, y no muerde texto acentuado.');
  say('HALLAZGO DE ESTA CORRIDA, y va a la bitacora: la version que corrio a las');
  say('22:22 sobre los 21 ficheros NO habria cazado un U+0091 crudo ni un DEL. El');
  say('veredicto de aquella corrida sigue siendo correcto -- los ficheros estan');
  say('limpios y el criterio vigente lo confirma -- pero lo estaba probando menos');
  say('de lo que decia.');
} else {
  say('ROJO - ' + fallas.length + ' exigencias no se cumplieron');
}
say('='.repeat(78));
fs.writeFileSync(path.join(__dirname, '08_mordida_control_caracteres.txt'), L.join('\n') + '\n', { encoding: 'utf8' });
process.exit(fallas.length ? 2 : 0);
