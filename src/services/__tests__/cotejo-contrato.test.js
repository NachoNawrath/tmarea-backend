'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Engancha el cotejo dato ↔ contrato dentro de `npm test`.
//
// POR QUE ACA Y NO EN UN COMANDO APARTE: es el camino A que el owner decidio el
// 2026-08-12 para esta familia de controles (PLAN_JURISDICCION.md §7.2). El
// camino B —un `npm run` aparte— quedo descartado por medicion, y con motivo:
// es el mecanismo que ya fallo, porque depende de que alguien se acuerde de
// correrlo. Un rastro que nadie mira no es un control.
//
// EL TEST NO LLEVA NINGUNA REGLA PROPIA. Llama a `cotejarReal()` y afirma sobre
// su resultado. Si copiara el normalizador o el texto esperado, envejeceria en
// cuanto el contrato cambie — que es exactamente el defecto que este control
// existe para cazar. La mordida completa vive en
// `scripts/prueba_mordida_cotejo_contrato.js`, con su control negativo primero.
// ─────────────────────────────────────────────────────────────────────────────

const test = require('node:test');
const assert = require('node:assert');
const { cotejarReal } = require('../cotejo-contrato');

test('el dato transcrito dice lo que el contrato dice (§10) — cotejo dato ↔ contrato', async (t) => {
  let r;
  try {
    r = cotejarReal();
  } catch (e) {
    // No se pudo medir. Es un estado distinto de "hay divergencia" y se reporta
    // como tal, con el motivo, en vez de leerse como que el cotejo paso.
    assert.fail(`el cotejo NO SE PUDO MEDIR: ${e.message}`);
  }

  // Sin esta asercion el test pasa por no tener nada que comparar: una
  // declaracion vaciada dejaria el control en verde y sin proteger nada (§0.3).
  assert.ok(r.resultados.length > 0,
    'el cotejo no produjo ninguna afirmacion; el control quedaria vacio');

  for (const a of r.resultados) {
    await t.test(a.nombre, () => {
      assert.strictEqual(a.obtenido, a.esperado,
        `el ${a.origen} dice ${JSON.stringify(a.obtenido)} y la celda '${a.celda}' de la fila ` +
        `'${r.fila}' del catalogo dice ${JSON.stringify(a.esperado)}. ` +
        `El §10 es la fuente unica de mensajes: si el catalogo cambio, el dato tiene que seguirlo.`);
    });
  }

  assert.strictEqual(r.estado, 'ok', `divergencias: ${JSON.stringify(r.divergencias.map(d => d.nombre))}`);
});
