'use strict';
// CONTROL CONTRA EL INDICE.
//
// Toda cifra que vaya al mensaje de commit sale de `git show :ruta`, NO del disco.
// Regla que costo `2d47022`: un mensaje que decia 36 filas sobre un objeto de 34.
//
// Y el control de indice-contra-disco va por `git diff --quiet -- ruta`, NO por
// comparacion de sha: con core.autocrlf=true el blob guarda LF y el disco puede
// tener CRLF, y la comparacion de sha da ROJO sobre un arbol correcto. Precedente
// declarado en _bitacoras/tres_de_d4_2026-08-20/14_control_contra_el_indice_dos_repos.js.

const { execFileSync } = require('child_process');
const path = require('path');

const BACK = path.join(__dirname, '..', '..');
const g = (...a) => execFileSync('git', a, { cwd: BACK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let fallos = 0;
const chk = (rot, ok, det) => { if (!ok) fallos++; console.log('  ' + (ok ? 'OK  ' : '!!  ') + rot + (det ? '  ->  ' + det : '')); };

console.log('CONTROL CONTRA EL INDICE — cobertura de AreaRestriccion, 2026-08-20');
console.log('Corrida: ' + new Date().toISOString());
console.log('');

// ── 1 · LAS CIFRAS DEL MENSAJE, LEIDAS DEL INDICE ───────────────────────────
console.log('1 · LAS CIFRAS DEL MENSAJE DE COMMIT SALEN DE `git show :ruta`');
const D = JSON.parse(g('show', ':data/deudas/deudas_declaradas.json'));
const noVivo = ['cerrada', 'caduca'];
const unicas = D.deudas.filter((d) => d.duplicada_de == null);
const vivas = unicas.filter((d) => !noVivo.includes(d.estado));
const sitios = D.cobertura.sitios;
const barridos = sitios.filter((s) => s.barrido === true).length;

console.log('     filas totales en el INDICE   : ' + D.deudas.length);
console.log('     unicas                       : ' + unicas.length);
console.log('     vivas                        : ' + vivas.length);
console.log('     sitios                       : ' + sitios.length + '   barridos: ' + barridos + '   sin barrer: ' + (sitios.length - barridos));

chk('el indice trae 66 filas', D.deudas.length === 66, 'trae ' + D.deudas.length);
chk('el indice trae 64 unicas', unicas.length === 64, 'trae ' + unicas.length);
chk('el indice trae 59 vivas', vivas.length === 59, 'trae ' + vivas.length);
chk('siguen 9 sitios sin barrer', (sitios.length - barridos) === 9);

// ── 2 · LA FILA NUEVA, EN EL INDICE ─────────────────────────────────────────
console.log('');
console.log('2 · LA FILA NUEVA ESTA EN EL OBJETO, NO SOLO EN EL DISCO');
const ID = 'D4D5::detectararea-colapsa-un-vocabulario-de-tres';
const f = D.deudas.find((d) => d.id === ID);
chk('la fila ' + ID + ' esta en el indice', !!f);
if (f) {
  chk('su sitio es SESION-tres-de-d4-2026-08-20', f.sitio === 'SESION-tres-de-d4-2026-08-20', f.sitio);
  chk('su grupo es 1_cierra_con_lo_que_hay', f.grupo === '1_cierra_con_lo_que_hay', f.grupo);
  chk('estado viva y sin firma del owner', f.estado === 'viva' && f.firma_owner.firmada === false);
  chk('sin_texto=true con evidencia_en_el_arbol no vacia [V7]',
    f.sin_texto === true && f.evidencia_en_el_arbol && Object.keys(f.evidencia_en_el_arbol).length > 0);
  chk('abierta_el es null porque el documento no la fecha [V7]',
    f.abierta_el === null && f.abierta_el_lo_dice_el_documento === false && !!f.nota_fecha);
  const e = f.evidencia_en_el_arbol;
  // Este chk salio ROJO en la primera corrida y tenia razon: buscaba la cadena
  // "DIEZ capturas y 509 filas" y la fila dice "DIEZ capturas distintas y 509
  // filas de restriccion". El defecto estaba en el CONTROL, no en la fila. Se
  // corrige el control y se deja dicho: se comprueban los dos numeros, no una
  // frase, que es lo que habia que comprobar desde el principio.
  chk('la evidencia declara DIEZ capturas y 509 filas',
    /DIEZ capturas/.test(e.el_denominador) && e.el_denominador.includes('509 filas'));
  chk('la evidencia declara 437 de 509 global', e.cobertura_sobre_la_bolsa_entera.includes('437 de 509'));
  chk('la evidencia declara 373 de 379 en TODOS', e.cobertura_sobre_TIPO_TODOS.includes('373 de 379'));
  chk('la evidencia cita ec25dae como el commit que derogo INV-3.4', e.INV_34_ESTA_DEROGADA.includes('ec25dae'));
  chk('la evidencia cita su salida cruda', e.salida_cruda === '_bitacoras/cobertura_arearestriccion_2026-08-20/01_medir_cobertura.txt');
  // la enmienda que el owner pidio en PARADA 2, con SUS palabras
  const enm = e.EL_HALLAZGO.NO_ES_UN_CAMPO_MAL_PARSEADO;
  chk('la enmienda de PARADA 2 esta en el indice', !!enm);
  chk('dice que SITPORT SI declara el area', !!enm && /area SITPORT SI declara/.test(enm));
  chk('nombra las 38 filas y las 16 con el valor solo', !!enm && enm.includes('38 filas') && enm.includes('16 de ellas'));
  chk('dice que NO es un campo mal parseado', !!enm && enm.includes('No es un campo mal parseado'));
  chk('dice que la informacion LLEGA y se DESCARTA', !!enm && enm.includes('LLEGA y se DESCARTA'));
}
const sit = sitios.find((s) => s.id === 'SESION-tres-de-d4-2026-08-20');
chk('el sitio declara 11 filas y tiene 11 [V4]',
  sit.filas_en_este_declarativo === 11 && D.deudas.filter((d) => d.sitio === sit.id).length === 11);

// ── 3 · LA FILA HERMANA NO SE TOCO ──────────────────────────────────────────
console.log('');
console.log('3 · LA CLAVE DE LA FILA HERMANA SE SOSTIENE Y NO SE TOCO (D6)');
const hermana = D.deudas.find((d) => d.id === 'D4D5::inv34-derogado-por-d5');
chk('la fila hermana sigue en el indice', !!hermana);
const clave = hermana && hermana.evidencia_en_el_arbol.EL_ARGUMENTO_EN_CONTRA_ESTA_ESCRITO_EN_EL_PROPIO_INV34
  && hermana.evidencia_en_el_arbol.EL_ARGUMENTO_EN_CONTRA_ESTA_ESCRITO_EN_EL_PROPIO_INV34.y_un_dato_medido_que_juega_a_favor_de_la_regla;
chk('la clave y_un_dato_medido_que_juega_a_favor_de_la_regla sigue ahi', !!clave);
chk('y sigue diciendo "20 filas vigentes del 2026-08-20" — sin enmendar',
  !!clave && clave.includes('20 filas vigentes del 2026-08-20'));
console.log('     motivo: el resultado la SOSTIENE. Instruccion del owner: si se sostiene, no se toca.');

// ── 4 · LA CAPTURA DE ESTA SESION, EN EL INDICE ─────────────────────────────
console.log('');
console.log('4 · LA CAPTURA DE ESTA SESION ESTA EN EL INDICE Y ES LA QUE SE MIDIO');
const cap = JSON.parse(g('show', ':_bitacoras/cobertura_arearestriccion_2026-08-20/captura_2026-08-20_18-29Z.json'));
const filasCap = cap.recordsets[0];
const pobl = filasCap.filter((r) => r.AreaRestriccion !== null && String(r.AreaRestriccion).trim() !== '').length;
const todos = filasCap.filter((r) => String(r.tipo).trim().toUpperCase() === 'TODOS');
const poblTodos = todos.filter((r) => r.AreaRestriccion !== null && String(r.AreaRestriccion).trim() !== '').length;
console.log('     filas: ' + filasCap.length + '   poblados: ' + pobl + '   TODOS: ' + todos.length + '   poblados(TODOS): ' + poblTodos);
chk('la captura del indice da 17 filas, 15 poblados, 14 de 14 en TODOS',
  filasCap.length === 17 && pobl === 15 && todos.length === 14 && poblTodos === 14);

// ── 5 · INDICE == ARBOL DE TRABAJO, por git diff --quiet ─────────────────────
console.log('');
console.log('5 · INDICE CONTRA DISCO — por `git diff --quiet`, no por sha');
const limpio = (ruta) => { try { g('diff', '--quiet', '--', ruta); return true; } catch (e) { return false; } };
const STAGEADOS = [
  'data/deudas/deudas_declaradas.json',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/01_medir_cobertura.js',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/01_medir_cobertura.txt',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/02_escribir_fila.js',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/02_escribir_fila.txt',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/03_control_caracteres.js',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/03_control_caracteres.txt',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/04_control_contra_el_indice.js',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/04_control_contra_el_indice.txt',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/05_enmendar_fila.js',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/05_enmendar_fila.txt',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/captura_2026-08-20_18-29Z.json',
  '_bitacoras/cobertura_arearestriccion_2026-08-20/cobertura_arearestriccion_2026-08-20.txt',
];
// EXCEPCION DECLARADA: este control NO puede comprobar su PROPIO fichero de
// salida. Lo esta escribiendo mientras corre, asi que el disco siempre difiere
// del indice en ese instante y el chk daria rojo sobre un arbol correcto. Se
// comprueba aparte, DESPUES de la corrida, con `git status --porcelain`.
const YO = '_bitacoras/cobertura_arearestriccion_2026-08-20/04_control_contra_el_indice.txt';
for (const r of STAGEADOS) {
  if (r === YO) { console.log('  --  ' + r + '  ->  NO comprobable desde adentro: es la salida de este mismo control'); continue; }
  chk('indice == disco  ' + r, limpio(r));
}

// ── 6 · LOS INTOCABLES NO ENTRARON ──────────────────────────────────────────
console.log('');
console.log('6 · LOS INTOCABLES — tienen que seguir MODIFICADOS Y FUERA DEL INDICE');
const status = g('status', '--porcelain');
const INTOCABLES = ['.claude/launch.json', 'data/catalogo/estado_drift.json'];
for (const r of INTOCABLES) {
  const linea = status.split('\n').find((l) => l.slice(3).trim() === r);
  chk(r + ' sigue " M" (modificado, NO stageado)', !!linea && linea.slice(0, 2) === ' M', linea ? JSON.stringify(linea.slice(0, 2)) : 'no aparece');
}
console.log('');
console.log('   Y NADA de src/, del parser, del validador ni del contrato entro al indice:');
const enIndice = g('diff', '--cached', '--name-only').trim().split('\n').filter(Boolean);
const PROHIBIDO = /^(src\/|scripts\/validar_deudas_declaradas\.js|CONTRATO_MOTOR\.md|PLAN_JURISDICCION\.md|\.claude\/|data\/catalogo\/)/;
const intrusos = enIndice.filter((r) => PROHIBIDO.test(r));
chk('0 intrusos en el indice', intrusos.length === 0, intrusos.join(' '));
console.log('');
console.log('   FICHEROS EN EL INDICE (' + enIndice.length + '):');
enIndice.forEach((r) => console.log('     ' + r));
chk('el indice trae exactamente los ' + STAGEADOS.length + ' ficheros declarados y ninguno mas',
  enIndice.length === STAGEADOS.length && STAGEADOS.every((r) => enIndice.includes(r)),
  'indice=' + enIndice.length + ' declarados=' + STAGEADOS.length);

// ── CONTROL NEGATIVO DEL PROPIO CONTROL ─────────────────────────────────────
console.log('');
console.log('CONTROL NEGATIVO DEL PROPIO CONTROL — tiene que saber decir que no');
const rutaFalsa = 'data/deudas/NO_EXISTE.json';
let cazo = false;
try { g('show', ':' + rutaFalsa); } catch (e) { cazo = true; }
chk('`git show :' + rutaFalsa + '` falla, o sea que el control lee de verdad del indice', cazo);
chk('la fila inventada "D4D5::ZZQX" NO esta en el indice', !D.deudas.some((d) => d.id === 'D4D5::ZZQX'));

console.log('');
console.log(fallos === 0 ? 'VERDE — 0 fallos.' : 'ROJO — ' + fallos + ' fallo(s).');
process.exit(fallos === 0 ? 0 : 1);
