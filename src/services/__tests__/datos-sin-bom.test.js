'use strict';
// Guard de forma del dato en disco, no de su contenido.
//
// POR QUE EXISTE: a4ea1c1 le metio un BOM UTF-8 a bahia-capitania-map.json.
// require() descarta el BOM, asi que los cinco servicios que leen el mapa por
// ahi siguieron andando y la suite dio 76/76. Pero catalogo-bahias.js lo lee
// con JSON.parse(fs.readFileSync(...)), que NO lo descarta, y ahi el control de
// drift de E0.1 —el que caza divergencias contra SITPORT— salio exit 1 con
// FUENTE INTERNA ILEGIBLE. Un control ciego que nadie ve ciego.
//
// QUE PRUEBA: que todo .json bajo src/data/ lo pueda leer el lector ESTRICTO,
// el de catalogo-bahias.js. Recorre el directorio, no una lista de archivos:
// un archivo nuevo queda cubierto sin que nadie se acuerde de agregarlo aca.
//
// Dos aserciones por archivo, a proposito:
//   1. no arranca con BOM  → diagnostico exacto, dice que byte sobra;
//   2. JSON.parse(readFileSync) no tira → la falla real, sea BOM u otra cosa.
// La 1 sola dejaria pasar cualquier otro byte que rompa al lector estricto.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const DIR_DATOS = path.join(__dirname, '..', '..', 'data');
const BOM_UTF8 = Buffer.from([0xEF, 0xBB, 0xBF]);

function jsonBajo(dir) {
  const salida = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completa = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...jsonBajo(completa));
    else if (entrada.name.endsWith('.json')) salida.push(completa);
  }
  return salida;
}

test('los .json de src/data/ los lee el lector estricto (sin BOM)', async (t) => {
  const archivos = jsonBajo(DIR_DATOS);

  // Sin esta asercion el test pasa solo por no encontrar nada: si alguien mueve
  // src/data/ o rompe el recorrido, un guard vacio es verde y no protege nada.
  assert.ok(archivos.length > 0,
    `no se encontro ningun .json bajo ${DIR_DATOS}; el guard quedaria vacio`);

  for (const archivo of archivos) {
    const rel = path.relative(path.join(__dirname, '..', '..', '..'), archivo);

    await t.test(`${rel} no arranca con BOM`, () => {
      const cabeza = Buffer.alloc(3);
      const fd = fs.openSync(archivo, 'r');
      try { fs.readSync(fd, cabeza, 0, 3, 0); } finally { fs.closeSync(fd); }
      assert.ok(!cabeza.equals(BOM_UTF8),
        `${rel} arranca con BOM UTF-8 (EF BB BF). require() lo descarta, pero ` +
        `JSON.parse(fs.readFileSync(...)) no: rompe el control de drift de E0.1.`);
    });

    await t.test(`${rel} lo parsea JSON.parse(fs.readFileSync)`, () => {
      assert.doesNotThrow(() => JSON.parse(fs.readFileSync(archivo, 'utf8')),
        `${rel} no lo puede leer el lector estricto de catalogo-bahias.js`);
    });
  }
});
