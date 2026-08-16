'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// La prelacion de INV-10.1, enganchada a `npm test`.
//
// POR QUE EN LA SUITE Y NO SOLO EN EL VERIFICADOR DE LA BITACORA: el verificador
// prueba que la pieza quedo bien EL DIA QUE SE ESCRIBIO. Esto prueba que sigue
// bien dentro de seis meses, y lo corre quien no leyo la bitacora. Es el mismo
// criterio con el que `cotejo-contrato.test.js` entro a la suite (camino A,
// PLAN_JURISDICCION.md §7.2): un rastro que nadie mira no es un control.
//
// LOS DOS TESTS SON DISTINTOS A PROPOSITO:
//   · el primero afirma sobre EL DATO REAL, las 164 entradas del mapa, y su
//     numero se mueve con cada pieza del frente de contacto. Prueba que el
//     resolvedor y el dato no se separaron.
//   · el segundo afirma sobre LA REGLA, con casos construidos desde cero, y su
//     resultado NO depende del dato de hoy. Prueba los tres escalones incluido
//     el 3, que hoy no tiene ni una entrada real que lo ejercite.
// Si los dos midieran lo mismo, uno estaria de mas.
// ─────────────────────────────────────────────────────────────────────────────

const test = require('node:test');
const assert = require('node:assert');
const { contactoPorEscalon } = require('../contacto-por-escalon');
const mapa = require('../../data/bahia-capitania-map.json');

test('la prelacion de INV-10.1 reparte las entradas del mapa sin dejar ninguna afuera', () => {
  const claves = Object.keys(mapa);

  // Sin esta asercion el test pasa por no tener nada que repartir: un mapa
  // vaciado dejaria el control en verde sin proteger nada (§0.3).
  assert.ok(claves.length > 0, 'el mapa no trae entradas; el control quedaria vacio');

  const casillas = { capitania: 0, gobernacion: 0, nulo: 0 };
  for (const k of claves) {
    const r = contactoPorEscalon(mapa[k]);

    assert.ok(['capitania', 'gobernacion', null].includes(r.nivel),
      `la entrada ${k} resolvio a un nivel que INV-10.1 no define: ${JSON.stringify(r.nivel)}`);

    // El escalon 3 no se llena con un texto de reemplazo. Si el nivel es null,
    // no puede viajar un nombre ni un telefono que alguien pueda renderizar.
    if (r.nivel === null) {
      assert.strictEqual(r.nombre, null, `la entrada ${k} cayo al escalon 3 pero viaja con nombre`);
      assert.strictEqual(r.telefono, null, `la entrada ${k} cayo al escalon 3 pero viaja con telefono`);
      casillas.nulo++;
    } else {
      assert.ok(r.nombre && String(r.nombre).trim() !== '',
        `la entrada ${k} resolvio al escalon de ${r.nivel} sin nombre que rotular`);
      assert.ok(r.telefono, `la entrada ${k} resolvio al escalon de ${r.nivel} sin telefono`);
      casillas[r.nivel]++;
    }

    // §4.2 — nada cae al escalon general en silencio: la razon viaja escrita.
    assert.ok(r.motivo && r.motivo.length > 0, `la entrada ${k} resolvio sin motivo declarado`);
  }

  const suma = casillas.capitania + casillas.gobernacion + casillas.nulo;
  assert.strictEqual(suma, claves.length,
    `la particion suma ${suma} y las entradas son ${claves.length}`);

  // El numero exacto NO se afirma: se mueve con cada pieza del frente de
  // contacto, y clavarlo aca convertiria este control en un recordatorio de
  // actualizar el test. Lo que se afirma es que el escalon 1 esta EJERCITADO
  // por el dato real: si mañana cayera a cero, el resolvedor y el insumo se
  // separaron y esta es la unica alarma que lo diria.
  assert.ok(casillas.capitania > 0,
    'ninguna entrada del mapa alcanza el escalon 1: el resolvedor dejo de reconocer el insumo de reparticiones');
});

test('los tres escalones de INV-10.1, con casos construidos desde cero', () => {
  // Los casos NO se sacan del mapa: se escriben literales. Un caso tomado del
  // dato deja de probar el dia que el dato cambia, sin avisar.
  //
  // "Arica" y su +56 58 2356704 estan en `reparticiones_publicadas.json` desde
  // que el insumo existe, y se usan como ancla del escalon 1.
  const casos = [
    { que: 'escalon 1 — el numero es el que la fuente publica para esa Capitania',
      entrada: { capitania: 'Arica', gobernacion: 'Arica', telefono: '+56 58 2356704' },
      nivel: 'capitania', nombre: 'Arica' },

    { que: 'escalon 1 — el cotejo del nombre normaliza acentos y mayusculas (INV-0.3)',
      entrada: { capitania: 'ARICA', gobernacion: 'Arica', telefono: '+56 58 2356704' },
      nivel: 'capitania', nombre: 'ARICA' },

    { que: 'escalon 2 — nombra una Capitania pero el numero es de OTRA reparticion',
      entrada: { capitania: 'Arica', gobernacion: 'Valparaíso', telefono: '+56 32 220 8905' },
      nivel: 'gobernacion', nombre: 'Valparaíso' },

    { que: 'escalon 2 — la entrada no nombra Capitania',
      entrada: { capitania: null, gobernacion: 'Aysén', telefono: '+56 67 233 1405' },
      nivel: 'gobernacion', nombre: 'Aysén' },

    { que: 'escalon 2 — la Capitania nombrada no figura en el indice publicado',
      entrada: { capitania: 'Reparticion Que No Existe', gobernacion: 'Aysén', telefono: '+56 67 233 1405' },
      nivel: 'gobernacion', nombre: 'Aysén' },

    { que: 'escalon 3 — sin telefono, el campo no se muestra',
      entrada: { capitania: 'Arica', gobernacion: 'Arica', telefono: null },
      nivel: null, nombre: null },

    { que: 'escalon 3 — telefono en cadena vacia',
      entrada: { capitania: 'Arica', gobernacion: 'Arica', telefono: '   ' },
      nivel: null, nombre: null },

    { que: 'escalon 3 — hay numero pero no hay a quien rotular',
      entrada: { capitania: null, gobernacion: null, telefono: '+56 58 2356704' },
      nivel: null, nombre: null },

    { que: 'escalon 3 — sin contacto resuelto',
      entrada: null, nivel: null, nombre: null },
  ];

  assert.ok(casos.length > 0, 'sin casos no hay nada que probar');

  for (const c of casos) {
    const r = contactoPorEscalon(c.entrada);
    assert.strictEqual(r.nivel, c.nivel, `${c.que}: nivel obtenido ${JSON.stringify(r.nivel)} · motivo "${r.motivo}"`);
    assert.strictEqual(r.nombre, c.nombre, `${c.que}: nombre obtenido ${JSON.stringify(r.nombre)}`);
  }

  // Los tres escalones tienen que estar EJERCITADOS por esta tabla. Una tabla
  // que probara dos de tres pasaria en verde dejando un escalon sin cubrir, y
  // el 3 es justamente el que el dato real no ejercita hoy.
  const cubiertos = new Set(casos.map(c => c.nivel));
  assert.strictEqual(cubiertos.size, 3,
    `los casos cubren ${cubiertos.size} de los 3 escalones de INV-10.1`);

  // INV-10.1: un valor que no sea numero atomico no se renderiza como enlace.
  // El resolvedor no decide el render, pero le tiene que dar al render con que
  // decidir — hoy el JSX arma el `tel:` sin comprobar nada.
  const noAtomico = contactoPorEscalon({ capitania: null, gobernacion: 'Aysén', telefono: 'Móvil: +569 5617 3241' });
  assert.strictEqual(noAtomico.telefono_atomico, false,
    'un valor con texto adentro tiene que viajar marcado como no atomico');
  const atomico = contactoPorEscalon({ capitania: null, gobernacion: 'Aysén', telefono: '+56 67 233 1405' });
  assert.strictEqual(atomico.telefono_atomico, true,
    'un numero atomico tiene que viajar marcado como atomico');
});
