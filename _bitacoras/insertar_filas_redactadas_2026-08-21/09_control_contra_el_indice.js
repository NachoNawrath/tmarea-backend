// VERSIONADO EL 2026-08-21. Es el instrumento que CORRIO, con UNA sola edicion:
// la raiz del repositorio salia clavada como 'C:/Users/katia/tmarea-backend' y
// ahora se deriva de __dirname, para que corra en cualquier clon. Nada mas se
// toco. Se volvio a correr despues de la edicion — un instrumento no se da por
// bueno porque compila (§ regla de los doce defectos).
'use strict';
// CONTROL CONTRA EL INDICE — pieza «insertar las filas redactadas», 2026-08-21.
// Calcado de _bitacoras/tres_de_d4_2026-08-20/08_control_contra_el_indice.js.
// NO se reusa ese fichero tal cual A PROPOSITO: mide el prefijo D4D5:: y las
// enmiendas de PLAN-2, o sea que sobre esta pieza correria perfecto y verificaria
// otra cosa. Se calca el metodo, no el instrumento.
//
// Lee `git show :ruta` — el objeto del INDICE — y no el disco. Compara los dos.

process.chdir(require('path').resolve(__dirname, '..', '..'));
const { execFileSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const delIndice = (r) => execFileSync('git', ['show', ':' + r], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const ok = (b) => (b ? 'OK  ' : '!!  ');

console.log('CONTROL CONTRA EL INDICE — las cifras del informe salen de aca, no del disco.');
console.log('Corrida: ' + new Date().toISOString());
console.log('');

// ── 1 · el declarativo, desde el INDICE ──────────────────────────────────────
const RUTA_D = 'data/deudas/deudas_declaradas.json';
const idx = delIndice(RUTA_D);
const disco = fs.readFileSync(RUTA_D, 'utf8');
const d = JSON.parse(idx);

const filas = d.deudas.length;
const unicas = d.deudas.filter(x => !x.duplicada_de).length;
const NO_VIVOS = ['cerrada', 'caduca'];
const vivas = d.deudas.filter(x => !x.duplicada_de && !NO_VIVOS.includes(x.estado)).length;
const sitios = d.cobertura.sitios.length;
const barridos = d.cobertura.sitios.filter(x => x.barrido).length;
const suma = d.cobertura.sitios.reduce((a, s) => a + (s.filas_en_este_declarativo || 0), 0);

console.log('DECLARATIVO, DESDE EL INDICE (git show :' + RUTA_D + ')');
console.log('  filas ' + filas + ' · unicas ' + unicas + ' · vivas ' + vivas);
console.log('  sitios ' + sitios + ' · barridos ' + barridos + ' · sin barrer ' + (sitios - barridos));
console.log('  ' + ok(suma === filas) + 'suma de filas_en_este_declarativo == filas  ->  ' + suma + ' vs ' + filas);
console.log('');

const IDS_VOSEO = d.deudas.filter(x => String(x.id).startsWith('SESION-voseo-al-patron-2026-08-20::'));
const IDS_U2 = d.deudas.filter(x => String(x.id).startsWith('SESION-cobertura-capas-a-c-2026-08-20::'));
console.log('  LAS OCHO FILAS DE ESTA PIEZA, EN EL INDICE:');
console.log('  ' + ok(IDS_VOSEO.length === 5) + 'sitio del voseo: ' + IDS_VOSEO.length + ' filas (1 de antes + 4 de hoy)');
IDS_VOSEO.forEach(f => console.log('        ' + f.id));
console.log('  ' + ok(IDS_U2.length === 4) + 'sitio de U2 A+C: ' + IDS_U2.length + ' filas (4 de hoy)');
IDS_U2.forEach(f => console.log('        ' + f.id + '  [' + f.repo + ']'));
console.log('');

const sVoseo = d.cobertura.sitios.find(s => s.id === 'SESION-voseo-al-patron-2026-08-20');
const sU2 = d.cobertura.sitios.find(s => s.id === 'SESION-cobertura-capas-a-c-2026-08-20');
console.log('  CONTADORES DE SITIO, EN EL INDICE:');
console.log('  ' + ok(sVoseo.filas_en_este_declarativo === 5) + 'voseo  filas_en_este_declarativo = ' + sVoseo.filas_en_este_declarativo + ' (esperado 5)');
console.log('  ' + ok(sU2 && sU2.filas_en_este_declarativo === 4) + 'U2 A+C filas_en_este_declarativo = ' + (sU2 ? sU2.filas_en_este_declarativo : 'NO EXISTE') + ' (esperado 4)');
console.log('  ' + ok(sU2 && sU2.barrido === true && !!sU2.barrido_el && !!sU2.bitacora) + 'U2 A+C barrido=' + (sU2 && sU2.barrido) + ' barrido_el=' + (sU2 && sU2.barrido_el) + ' bitacora citada=' + !!(sU2 && sU2.bitacora));
console.log('  ' + ok(sVoseo.vocabulario_del_barrido.length === 3) + 'voseo vocabulario_del_barrido = ' + sVoseo.vocabulario_del_barrido.length + ' entradas (era 2)');
console.log('');

console.log('  FIRMA Y ESTADO DE LAS OCHO:');
const ocho = IDS_VOSEO.filter(f => f.nota_fecha && /2026-08-20/.test(f.nota_fecha)).concat(IDS_U2);
console.log('  ' + ok(IDS_U2.every(f => f.firma_owner.firmada === false)) + 'las CUATRO de U2 nacen con firmada=false');
console.log('  ' + ok(IDS_U2.every(f => !('redactada_no_aplicada' in f))) + 'las CUATRO de U2 NO llevan redactada_no_aplicada (ninguna trae texto de correccion)');
console.log('  ' + ok(IDS_U2.every(f => f.estado === 'viva' && f.grupo === '1_cierra_con_lo_que_hay')) + 'las CUATRO de U2: estado viva, grupo 1');
console.log('  ' + ok(IDS_U2.filter(f => f.repo === 'tmarea-pwa').length === 2) + 'de las CUATRO de U2, 2 son de tmarea-pwa y 2 de tmarea-backend');
console.log('');

console.log('  INDICE vs DISCO (tienen que ser el mismo objeto):');
console.log('    indice sha256 ' + sha(idx));
console.log('    disco  sha256 ' + sha(disco));
console.log('    -> ' + (sha(idx) === sha(disco) ? 'IDENTICOS' : 'DIVERGEN — el indice esta obsoleto, NO commitear'));

// ── 2 · las cuatro del voseo, BYTE POR BYTE contra lo redactado ──────────────
console.log('');
console.log('LAS CUATRO DEL VOSEO, CONTRA 18_cuatro_filas.json — identidad, no parecido');
const redactadas = JSON.parse(fs.readFileSync('_bitacoras/voseo_al_patron_2026-08-20/18_cuatro_filas.json', 'utf8'));
let iguales = 0;
for (const r of redactadas) {
  const enIdx = d.deudas.find(x => x.id === r.id);
  const igual = enIdx && sha(JSON.stringify(r)) === sha(JSON.stringify(enIdx));
  console.log('  ' + ok(igual) + r.id.split('::')[1]);
  if (igual) iguales++;
}
console.log('  ' + ok(iguales === 4) + iguales + '/4 identicas al objeto redactado el 2026-08-20 (sha256 del JSON canonico)');

// ── 3 · el validador, desde el INDICE ────────────────────────────────────────
const RUTA_V = 'scripts/validar_deudas_declaradas.js';
const val = delIndice(RUTA_V);
console.log('');
console.log('scripts/validar_deudas_declaradas.js, DESDE EL INDICE');
console.log('  ' + ok(val.includes("'SESION-cobertura-capas-a-c-2026-08-20',")) + 'el sitio nuevo esta en SITIOS_CANON');
console.log('  ' + ok(val.includes('EL VIGESIMOTERCERO')) + 'lleva su nota de procedencia al lado');
console.log('  ' + ok(sha(val) === sha(fs.readFileSync(RUTA_V, 'utf8'))) + 'indice == disco');

// ── 4 · el desmentido de C-2, desde el INDICE ────────────────────────────────
const RUTA_T = 'src/services/__tests__/borde-pwa-backend.test.js';
const t = delIndice(RUTA_T);
console.log('');
console.log(RUTA_T + ', DESDE EL INDICE — el desmentido de C-2');
console.log('  ' + ok(!t.includes("'deuda_sin_fila',  nota: 'el motor calcula")) + 'ya NO dice que fondeadero_sugerido es deuda_sin_fila');
console.log('  ' + ok(t.includes("fondeadero_sugerido:       { tipo: 'deuda_con_fila'")) + 'ahora dice deuda_con_fila');
console.log('  ' + ok(t.includes('SESION-cobertura-capas-a-c-2026-08-20::fondeadero-sugerido-no-lo-lee-nadie')) + 'la nota cita el id de la fila');
// ESPERADO DERIVADO, NO CLAVADO. La primera version de esta linea exigia UNA
// aparicion de la cadena `deuda_sin_fila` y salio en rojo con DOS, sobre un
// fichero correcto: la segunda la escribi yo, en la nota nueva que dice «Era
// deuda_sin_fila». Contar la CADENA mide el texto que habla del tipo; lo que
// importa es que ninguna ENTRADA de la lista lo tenga como `tipo`.
const conTipoSinFila = (t.match(/tipo: 'deuda_sin_fila'/g) || []).length;
console.log('  ' + ok(conTipoSinFila === 0) + 'ninguna entrada de DECLARADO tiene tipo deuda_sin_fila (' + conTipoSinFila + ')');
console.log('      la cadena `deuda_sin_fila` aparece ' + (t.split('deuda_sin_fila').length - 1) +
  ' vez/veces, y las dos son PROSA: el vocabulario de la cabecera y la nota que dice «Era deuda_sin_fila»');

// ── 5 · las dos enmiendas de bitacora, desde el INDICE ───────────────────────
console.log('');
console.log('LAS DOS BITACORAS QUE IBAN A QUEDAR MINTIENDO, DESDE EL INDICE');
const b1 = delIndice('_bitacoras/voseo_al_patron_2026-08-20/18_cuatro_filas.md');
const b2 = delIndice('_bitacoras/cobertura_capas_a_c_2026-08-20/cobertura_capas_a_c_2026-08-20.txt');
console.log('  ' + ok(b1.includes('ENMIENDA DEL 2026-08-21 — YA ESTÁN')) + '18_cuatro_filas.md trae su enmienda');
console.log('  ' + ok(b1.includes('POR QUÉ NO ESTÁN YA EN')) + '  ...y conserva el texto original sin retocar (§3.3)');
console.log('  ' + ok(b2.includes('ENMENDADO EL 2026-08-21')) + 'cobertura_capas_a_c §6 trae su enmienda');
console.log('  ' + ok(b2.includes('NINGUNA SE INSERTA EN ESTA PIEZA. Instruccion del owner.')) + '  ...y conserva el texto original sin retocar (§3.3)');
console.log('  ' + ok(b2.includes('NINGUN CONTROL MIRA SI LA EVIDENCIA DE UNA FILA ENVEJECIO')) + 'la nota que el owner pidio, con esas palabras');
console.log('  ' + ok(b2.includes('SON CUATRO, NO CINCO')) + 'queda escrito que eran cuatro y no cinco');

// ── 6 · lo que NO entra al indice ────────────────────────────────────────────
console.log('');
console.log('LO QUE NO ENTRA AL INDICE — control explicito de los TRES intocables:');
const INTOCABLES = ['.claude/launch.json', 'data/catalogo/estado_drift.json',
                    '_bitacoras/toponimos_12100_47_2026-08-20/osm_crudo.json'];
for (const r of INTOCABLES) {
  const enIdx = delIndice(r);
  const distinto = sha(enIdx) !== sha(fs.readFileSync(r, 'utf8'));
  console.log('  ' + ok(distinto) + r + ' -> el indice tiene la version de HEAD, no la modificada');
}
const stageados = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' })
  .split('\n').filter(Boolean);
console.log('');
console.log('  ficheros stageados: ' + stageados.length);
stageados.forEach(f => console.log('    ' + f));
// ESPERADO ESTRUCTURAL, NO UN NUMERO. La primera version exigia "son CINCO" y
// dejo de ser cierta en cuanto la bitacora de la pieza entro al mismo commit:
// un esperado clavado envejece con el commit que describe. Lo que importa es
// que esten las CINCO escrituras sustantivas y que todo lo demas sea bitacora
// de esta pieza -- nada de otro frente entrando de costado.
const CINCO = [
  'data/deudas/deudas_declaradas.json',
  'scripts/validar_deudas_declaradas.js',
  RUTA_T,
  '_bitacoras/voseo_al_patron_2026-08-20/18_cuatro_filas.md',
  '_bitacoras/cobertura_capas_a_c_2026-08-20/cobertura_capas_a_c_2026-08-20.txt',
];
const DIR_BIT = '_bitacoras/insertar_filas_redactadas_2026-08-21/';
const faltan = CINCO.filter(f => !stageados.includes(f));
const sobran = stageados.filter(f => !CINCO.includes(f) && !f.startsWith(DIR_BIT));
console.log('  ' + ok(faltan.length === 0) + 'estan las CINCO escrituras sustantivas' +
  (faltan.length ? ' -- FALTAN: ' + faltan.join(', ') : ''));
console.log('  ' + ok(sobran.length === 0) + 'todo lo demas stageado es bitacora de esta pieza (' +
  stageados.filter(f => f.startsWith(DIR_BIT)).length + ' ficheros)' +
  (sobran.length ? ' -- SE COLO: ' + sobran.join(', ') : ''));
console.log('  ' + ok(!stageados.some(f => INTOCABLES.includes(f))) + 'ninguno de los tres intocables entre ellos');
console.log('  ' + ok(!stageados.includes('CONTRATO_MOTOR.md')) + 'CONTRATO_MOTOR.md NO esta');
console.log('  ' + ok(!stageados.includes('PLAN_JURISDICCION.md')) + 'PLAN_JURISDICCION.md NO esta');
console.log('  ' + ok(!stageados.includes('CLAUDE.md')) + 'CLAUDE.md NO esta');
console.log('  ' + ok(!stageados.some(f => /data\/spec2\//.test(f))) + 'la cifra de §2 (data/spec2/) NO esta — es la pieza siguiente');
const srcStageado = stageados.filter(f => f.startsWith('src/'));
console.log('  de src/ hay ' + srcStageado.length + ': ' + (srcStageado.join(', ') || '(ninguno)'));
console.log('  ' + ok(srcStageado.length === 1 && srcStageado[0] === RUTA_T) +
  'el unico de src/ es el desmentido de C-2, autorizado por el owner el 2026-08-21');

// ── 7 · caracteres ───────────────────────────────────────────────────────────
console.log('');
console.log('CONTROL DE CARACTERES sobre TODOS los objetos del INDICE (' + stageados.length + '):');
function raros(texto) {
  const m = [];
  for (const ch of texto) {
    const cp = ch.codePointAt(0);
    if ((cp < 0x20 && cp !== 0x0A && cp !== 0x0D) || cp === 0x7F || (cp >= 0x80 && cp <= 0x9F))
      m.push('U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
  }
  return m;
}
for (const r of stageados) {
  const s = delIndice(r);
  const mal = raros(s);
  console.log('  ' + ok(mal.length === 0 && s.charCodeAt(0) !== 0xFEFF) + r + '  puntos_de_codigo=' + [...s].length +
    '  sospechosos=' + mal.length + '  BOM=' + (s.charCodeAt(0) === 0xFEFF ? 'SI' : 'no'));
}
console.log('  CONTROL POSITIVO del lector del indice: una ruta inexistente tiene que fallar ->');
try {
  delIndice('data/deudas/NO_EXISTE.json');
  console.log('    !!  no fallo. El control no esta leyendo del indice.');
} catch (e) {
  console.log('    OK  fallo, o sea que lee de verdad del indice');
}
