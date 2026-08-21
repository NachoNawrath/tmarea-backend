'use strict';
// LA COBERTURA JURISDICCIONAL COMPONE EL VEREDICTO (U2 · capa C).
//
// Hasta esta pieza el handler calculaba `cobertura_jurisdiccional`, lo devolvia
// en su propio campo, y NO lo metia en el maximo de INV-1.1 — escrito en el
// propio `sitport-routes.js` como pieza pendiente. Dos lineas mas arriba el
// mismo handler SI componia el drift.
//
// El mecanismo se CALCA de `componerConDrift` (drift-ambito-a.js). No es un
// mecanismo nuevo: es el mismo, con el otro tope.
//
// LA RAMA `null` SE FIJA A LA VISTA, Y NO ES UN DESCUIDO. `evaluarCobertura`
// devuelve dos estados: 'evaluada' (bandera Q|U) y 'no_evaluada' (bandera NULL,
// con su motivo). Calcado de drift, `null` NO APORTA: el backend no escala
// cuando la evaluacion fallo. Quien escala en ese caso es la PWA, que mapea
// estado 'no_evaluada' -> 'U'. La asimetria es HEREDADA de drift, no la
// introduce esta pieza, y se deja aqui EXPLICITA para que se lea en el control
// en vez de deducirse del silencio. Va declarada como fila aparte, redactada y
// no aplicada.

const test = require('node:test');
const assert = require('node:assert');

const { componerConCobertura, BANDERA_AVISO } = require('../cobertura-jurisdiccional');

test('el tope del aviso es U, y es dato del modulo, no del control', () => {
  assert.strictEqual(BANDERA_AVISO, 'U');
});

test('una cobertura en U sobre un veredicto en Q lo sube a U', () => {
  assert.strictEqual(componerConCobertura('Q', 'U'), 'U');
});

test('una cobertura en Q no mueve nada', () => {
  assert.strictEqual(componerConCobertura('Q', 'Q'), 'Q');
  assert.strictEqual(componerConCobertura('U', 'Q'), 'U');
  assert.strictEqual(componerConCobertura('UV', 'Q'), 'UV');
});

test('la composicion NUNCA baja un veredicto ya escalado', () => {
  assert.strictEqual(componerConCobertura('UV', 'U'), 'UV');
  assert.strictEqual(componerConCobertura('U', 'U'), 'U');
});

test('el aporte de la cobertura esta topado en U: ni un UV que llegara la sube a UV', () => {
  // INV-3.6: "escala el veredicto a U, y NUNCA a U+V. La ausencia de dato no es
  // una prohibicion". El tope es por construccion, no por confiar en el emisor.
  assert.strictEqual(componerConCobertura('Q', 'UV'), 'U');
});

test('bandera NULL (cobertura no_evaluada) NO aporta — la asimetria heredada de drift', () => {
  assert.strictEqual(componerConCobertura('Q', null), 'Q');
  assert.strictEqual(componerConCobertura('U', null), 'U');
});

test('una bandera previa que no pertenece al vocabulario se trata como Q', () => {
  // Calcado de componerConDrift: RANGO[previa] != null ? previa : 'Q'.
  assert.strictEqual(componerConCobertura(undefined, 'U'), 'U');
  assert.strictEqual(componerConCobertura('ZZQX', 'Q'), 'Q');
});
