'use strict';
// TODA CIFRA QUE VAYA EN UN MENSAJE DE COMMIT SALE DEL INDICE, NO DEL DISCO.
// La regla que costo el commit malo `2d47022`: el mensaje decia 36 filas y el
// objeto tenia 34. Comparar main contra origin/main verifica que LO SUBIDO ES LO
// COMMITEADO, nunca que lo commiteado es lo medido.
//
// Este control lee `git show :ruta` — el objeto del INDICE — y ademas comprueba
// que los INTOCABLES no entraron.

const { execFileSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const BACK = path.join(__dirname, '..', '..');
const g = (...a) => execFileSync('git', a, { cwd: BACK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const delIndice = ruta => g('show', ':' + ruta);
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

let fallos = 0;
const chk = (rot, ok, det) => { if (!ok) fallos++; console.log('  ' + (ok ? 'OK  ' : '!!  ') + rot + (det ? '  ->  ' + det : '')); };

console.log('CONTROL CONTRA EL INDICE — las cifras del mensaje de commit salen de aca.');
console.log('Corrida: ' + new Date().toISOString());
console.log('');

// ── 1 · el declarativo, leido del INDICE ─────────────────────────────────────
const RUTA_D = 'data/deudas/deudas_declaradas.json';
const crudoIdx = delIndice(RUTA_D);
const crudoDisco = fs.readFileSync(path.join(BACK, RUTA_D), 'utf8');
const d = JSON.parse(crudoIdx);

const filas = d.deudas.length;
const unicas = d.deudas.filter(x => !x.duplicada_de).length;
const vivas = d.deudas.filter(x => x.estado === 'viva' && !x.duplicada_de).length;
const cerradas = d.deudas.filter(x => x.estado === 'cerrada').length;
const sitios = d.cobertura.sitios.length;
const barridos = d.cobertura.sitios.filter(x => x.barrido).length;
const suma = d.cobertura.sitios.reduce((a, s) => a + (s.filas_en_este_declarativo || 0), 0);
const g2 = d.deudas.filter(x => x.grupo === '2_decision_del_owner');
const g2vivas = g2.filter(x => x.estado === 'viva');
const g2firmadas = g2.filter(x => (x.firma_owner || {}).firmada === true);
const g2vivasSinFirmar = g2vivas.filter(x => !(x.firma_owner || {}).firmada);

console.log('1 · DECLARATIVO, DESDE EL INDICE (git show :' + RUTA_D + ')');
console.log('     filas ' + filas + ' · unicas ' + unicas + ' · vivas ' + vivas + ' · cerradas ' + cerradas);
console.log('     sitios ' + sitios + ' · barridos ' + barridos + ' · sin barrer ' + (sitios - barridos));
console.log('     grupo 2: ' + g2.length + ' filas · ' + g2vivas.length + ' vivas · ' + g2firmadas.length + ' firmadas');
console.log('     grupo 2 VIVAS SIN FIRMAR: ' + g2vivasSinFirmar.length);
g2vivasSinFirmar.forEach(x => console.log('        ' + x.id));
chk('suma de filas_en_este_declarativo == filas', suma === filas, suma + ' vs ' + filas);
chk('el total de filas no bajo (66)', filas === 66, String(filas));
chk('las vivas no bajaron (59): firmar es responder, no hacer', vivas === 59, String(vivas));
console.log('');

// ── 2 · las filas que esta sesion toco, LEIDAS DEL INDICE ────────────────────
const FIRMADAS = [
  'PLAN-2::licencia-de-bahia-en-ruta-costera-sin-aviso',
  'PLAN-2::spec-no-cubre-p4',
  'D4D5::puerto-escala-lo-que-declara-no-aplicable',
  'D4D5::abierto-y-con-restriccion-colapsados-en-pantalla',
  'D4D5::spec2-sin-punto-de-veracidad',
  'D4D5::e2-y-e6-sin-premisa',
  'D4D5::inv34-derogado-por-d5',
  'D4D5::contrato-10-dice-transitar',
  'PLAN-2::desacople-licencia-uso',
  'PLAN-2::usos-inertes-en-el-formulario',
];
console.log('2 · LAS DIEZ FIRMADAS, EN EL INDICE — firmada=true Y estado=viva');
let ok10 = 0;
for (const id of FIRMADAS) {
  const x = d.deudas.find(y => y.id === id);
  const bien = !!x && x.firma_owner.firmada === true && x.estado === 'viva' &&
    !!x.decision_del_owner && !!x.lo_que_queda;
  if (bien) ok10++;
  chk(id, bien, x ? 'estado=' + x.estado + ' firmada=' + x.firma_owner.firmada : 'NO EXISTE');
}
chk('las diez, completas', ok10 === 10, ok10 + '/10');
console.log('');

console.log('3 · LA UNDECIMA: reencuadrada, NO firmada');
const e7 = d.deudas.find(y => y.id === 'PLAN-7.2::e7-pieza-2-sin-criterio');
chk('lleva el bloque de pregunta agendada', !!e7.NO_ES_UNA_PREGUNTA_ABIERTA_ES_AGENDADA);
chk('lleva la medicion que la anticipa', !!e7.LA_MEDICION_YA_ANTICIPA_LA_RESPUESTA);
chk('sigue SIN firmar y viva', e7.firma_owner.firmada === false && e7.estado === 'viva');
console.log('');

console.log('4 · LA ENMIENDA DEL BLOQUE OCEANOGRAFICO');
const oce = d.deudas.find(y => y.id === 'PLAN-2::sin-bloque-oceanografico-en-p3');
chk('lleva enmienda_2026_08_20', !!oce.enmienda_2026_08_20);
chk('la frase vieja ya no esta en quien_lo_necesita',
  !/uno de los usos declarables del formulario/.test(oce.evidencia_en_el_arbol.quien_lo_necesita));
chk('la frase vieja queda CITADA en la enmienda',
  /uno de los usos declarables del formulario/.test(oce.enmienda_2026_08_20.la_frase_que_se_enmienda_textual));
console.log('');

console.log('5 · LA POLITICA DE FIRMA');
chk('trae la regla nueva', /FIRMAR ES RESPONDER, NO HACER/.test(d.politica_de_firma));
chk('anota la asimetria de la fila del ambito antartico', /PLAN-3-E8::p1-en-e4/.test(d.politica_de_firma));
console.log('');

console.log('6 · INDICE vs DISCO — tienen que ser el mismo objeto');
console.log('     indice sha256 ' + sha(crudoIdx));
console.log('     disco  sha256 ' + sha(crudoDisco));
chk('identicos', sha(crudoIdx) === sha(crudoDisco), sha(crudoIdx) === sha(crudoDisco) ? '' : 'DIVERGEN — el indice esta obsoleto, NO commitear');
console.log('');

// ── 7 · los INTOCABLES ───────────────────────────────────────────────────────
console.log('7 · LOS INTOCABLES — tienen que seguir FUERA del indice');
const INTOCABLES = ['.claude/launch.json', 'data/catalogo/estado_drift.json'];
const staged = g('diff', '--cached', '--name-only').trim().split('\n').filter(Boolean);
for (const f of INTOCABLES) chk('fuera del stage: ' + f, !staged.includes(f));
console.log('');
console.log('   LO QUE SI ESTA EN EL STAGE (' + staged.length + '):');
staged.forEach(f => console.log('     ' + f));
const ESPERADO = [
  'data/deudas/deudas_declaradas.json',
  '_bitacoras/las_once_2026-08-20/01_medir_uso.js',
  '_bitacoras/las_once_2026-08-20/01_medir_uso.txt',
  '_bitacoras/las_once_2026-08-20/02_escribir_ocho.js',
  '_bitacoras/las_once_2026-08-20/02_escribir_ocho.txt',
  '_bitacoras/las_once_2026-08-20/03_escribir_tres_y_diez.js',
  '_bitacoras/las_once_2026-08-20/03_escribir_tres_y_diez.txt',
  '_bitacoras/las_once_2026-08-20/04_control_caracteres.js',
  '_bitacoras/las_once_2026-08-20/04_control_caracteres.txt',
  '_bitacoras/las_once_2026-08-20/05_control_contra_el_indice.js',
  '_bitacoras/las_once_2026-08-20/05_control_contra_el_indice.txt',
  '_bitacoras/las_once_2026-08-20/06_mensaje_commit.txt',
];
// El .txt de ESTE control se agrega al stage DESPUES de correrlo — por
// construccion no puede estar antes —, asi que no cuenta como faltante.
const SE_AGREGA_DESPUES = ['_bitacoras/las_once_2026-08-20/05_control_contra_el_indice.txt'];
const sobran = staged.filter(f => !ESPERADO.includes(f));
const faltan = ESPERADO.filter(f => !staged.includes(f) && !SE_AGREGA_DESPUES.includes(f));
chk('no entro nada de contrabando', sobran.length === 0, sobran.join(', '));
chk('no falta nada de lo esperado', faltan.length === 0, faltan.join(', '));
console.log('');

console.log(fallos ? 'ROJO — ' + fallos + ' fallo(s). NO commitear.' : 'VERDE — el indice es lo medido. Se puede commitear.');
process.exit(fallos ? 1 : 0);
