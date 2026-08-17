// src/services/__tests__/cierre-derivador.test.js
//
// Tests de la derivación del estado de cierre. NO tocan el motor BRE: su suite
// (`node --test src/services/__tests__/bre-test.js`, 37 tests) queda como está.
// Este archivo termina en `.test.js`, así que entra a `npm test`.
//
// Los casos con ID vienen del material de sondaje y están citados con su ID de
// restricción para que se pueda ir a buscarlos al archivo.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { derivarCierre } = require('../cierre-derivador');

// Un registro mínimo con la forma real de SITPORT (20 campos; acá los que el
// derivador mira). Los demás valores son los del dato: NaveRecibe con entities
// sin decodificar, AreaRestriccion que puede venir null.
function reg(Observacion, extra = {}) {
  return {
    Observacion,
    MotivoRestriccion: 'MAL TIEMPO',
    NaveRecibe: 'NAVE MENOR (&LT;100 AB)',
    AreaRestriccion: 'DENTRO DEL LIMITE DEL PUERTO, FUERA DEL LIMITE DEL PUERTO',
    GLBahia: 'BAHIA DE PRUEBA',
    bahia: 999,
    FCinicio: '30 Jul 2026 14:00:00:000',
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — D-C1: el cierre es el estado', () => {
  test('un texto que declara puerto cerrado da estado=cerrado', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO CERRADO POR AVISO DE MAL TIEMPO PARA NAVES MENORES, DENTRO Y FUERA DE LA BAHÍA.'));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.via, 'predicado');
    assert.strictEqual(c.razon_sin_cierre, null);
  });

  test('el estado convive con la causa: no la reemplaza ni la consume', () => {
    // "PUERTO CERRADO POR AVISO DE MAL TIEMPO" es las dos cosas a la vez.
    // El derivador emite el ESTADO; la causa la sigue emitiendo derivarCondicion.
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE TIEMPO VARIABLE, PUERTO CERRADO PARA EMBARCACIONES MENORES DE 25 AB.'));
    assert.strictEqual(c.estado, 'cerrado');
    // El derivador NO produce ningún campo de condición/causa:
    assert.ok(!('condicion' in c) && !('causa' in c) && !('condicion_legible' in c));
  });

  test('un texto sin cierre da sin_cierre_declarado con su razón', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO VARIABLE, POR AUMENTO INTENCIDAD DE VIENTO.'));
    assert.strictEqual(c.estado, 'sin_cierre_declarado');
    assert.strictEqual(c.via, null);
    assert.strictEqual(c.razon_sin_cierre, 'texto_sin_cierre');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — D-C2: predicado y red, sin fuzzy matching', () => {
  test('el tipeo "PURTO CERRADO" entra por el predicado solo (ID 95208)', () => {
    // Lo que se rompió fue "PUERTO", no "CERRADO". El criterio vigente
    // (/PUERTO CERRADO|CONDICION DE PUERTO/) NO lo atrapa; el predicado sí, y
    // sin ninguna aproximación.
    const c = derivarCierre(reg('SE ESTABLECE CONDICION DE MAL TIEMPO, PURTO CERRADO PARA EMBARCACIONES MENORES DE 50 A/B. DENTRO Y FUERA DE LA BAHIA'));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.via, 'predicado');
  });

  test('CERRAZÓN DE NIEBLA NO entra por la familia del cierre (ID 95351)', () => {
    // Es una CAUSA meteorológica a una letra de la raíz del cierre. Si este test
    // se pone verde con estado=cerrado, el predicado se volvió una caza por
    // aproximación y hay que pararlo.
    const c = derivarCierre(reg('SE ESTABLECE CONDICION DE PUERTO N° 234 CERRAZÓN DE NIEBLA , SE RESTRINGUE AMARRE DE NAVES MAYORES A TT.MM.', { AreaRestriccion: null }));
    assert.strictEqual(c.estado, 'sin_cierre_declarado');
  });

  test('entra por la red de tres ejes sin decir "cerrado" (ID 94987 PANGUIPULLI)', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICION DE TIEMPO VARIABLE POR CONDICIONES DE VIENTO, SE RESTRINGE NAVEGACION PARA EMBARCACIONES MENORES DE 100 ARQUEO BRUTO PARA TODOS LOS LAGOS DE LA JURISDICCION.'));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.via, 'ejes');
  });

  test('entra por la red: "QUEDA SUSPENDIDOS LOS ZARPES" (ID 95163 LAGO RANCO)', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO VARIABLE PARA LA JURISDICCIÓN DE LAGO RANCO, DENTRO Y FUERA. QUEDA SUSPENDIDOS LOS ZARPES PARA TODA NAVE MENOR A 12 TRG.'));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.via, 'ejes');
  });

  test('"TRÁFICO SUSPENDIDO" entra por predicado sin la palabra cerrado (ID 95043)', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO MAL TIEMPO, TRÁFICO SUSPENDIDO PARA PARA TODO TIPO DE NAVES DENTRO Y FUERA DE LA BAHÍA DE SAN VICENTE', { AreaRestriccion: null }));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.via, 'predicado');
  });

  test('la red exige LOS TRES ejes: con dos no alcanza', () => {
    // umbral + zona, sin actividad nombrada, y sin ninguna palabra de cierre.
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE TIEMPO VARIABLE PARA EMBARCACIONES MENORES DE 25 AB DENTRO Y FUERA DE LA BAHÍA.', { AreaRestriccion: null }));
    assert.strictEqual(c.estado, 'sin_cierre_declarado');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — D-C3: el umbral define el alcance, no la existencia', () => {
  test('umbral con número', () => {
    const c = derivarCierre(reg('PUERTO CERRADO PARA EMBARCACIONES MENORES DE 25 A.B. DENTRO Y FUERA DE LA BAHÍA.'));
    assert.strictEqual(c.alcance.tipo, 'umbral');
    assert.strictEqual(c.alcance.umbral, 25);
  });

  test('"MENORES" sin número NO es un fallo de extracción (parser:92)', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO CERRADO POR AVISO DE MAL TIEMPO PARA NAVES MENORES, DENTRO Y FUERA DE LA BAHÍA.'));
    assert.strictEqual(c.alcance.tipo, 'menores_sin_umbral');
    assert.strictEqual(c.alcance.umbral, null);
    assert.strictEqual(c.alcance.rama_parser, 'parser:92');
  });

  test('cierre TOTAL es su propio estado y NO se pliega a menores (parser:69)', () => {
    // Corrección del owner 2026-08-16: un cierre para TODO TIPO DE NAVES alcanza
    // a todas. Plegarlo a menores_sin_umbral le angostaría el alcance.
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO CERRADO, TRÁFICO SUSPENDIDO PARA TODO TIPO DE NAVES DENTRO Y FUERA DE LA BAHÍA.'));
    assert.strictEqual(c.alcance.tipo, 'total');
    assert.notStrictEqual(c.alcance.tipo, 'menores_sin_umbral');
    assert.strictEqual(c.alcance.rama_parser, 'parser:69');
  });

  test('ilegible se distingue de "sin umbral a propósito"', () => {
    // Hay un dígito y no es tonelaje: el 224 es el número del aviso.
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO A "MAL TIEMPO N°224" CERRADO.', { AreaRestriccion: null }));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.alcance.tipo, 'no_legible');
    assert.strictEqual(c.alcance.rama_parser, null);
  });

  test('los cuatro tipos de alcance son valores distintos', () => {
    const tipos = new Set(['umbral', 'total', 'menores_sin_umbral', 'no_legible']);
    assert.strictEqual(tipos.size, 4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — D-C4: el aviso sale siempre; el genérico es un piso', () => {
  test('alcance ilegible → aviso_modo genérico, y el registro NO desaparece', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO A "MAL TIEMPO N°224" CERRADO.', { AreaRestriccion: null }));
    assert.strictEqual(c.aviso_modo, 'generico');
    assert.strictEqual(c.estado, 'cerrado');   // sigue siendo un cierre
  });

  test('alcance legible → aviso_modo detalle: el genérico no le quita detalle', () => {
    const c = derivarCierre(reg('PUERTO CERRADO PARA EMBARCACIONES MENORES DE 25 A.B. DENTRO Y FUERA DE LA BAHÍA.'));
    assert.strictEqual(c.aviso_modo, 'detalle');
  });

  test('el backend emite la BANDERA, no el texto del aviso', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO A "MAL TIEMPO N°224" CERRADO.', { AreaRestriccion: null }));
    // El texto lo pone el render (decisión del owner). Si algún día el backend
    // empieza a redactar el aviso, este test se pone rojo.
    const claves = Object.keys(c);
    assert.ok(!claves.some(k => /mensaje|aviso_texto|leyenda/.test(k)));
  });

  test('el texto de la Capitanía viaja TAL CUAL, sin parafrasear ni normalizar', () => {
    const crudo = 'SE ESTABLECE CONDICIÓN DE TIEMPO "VARIABLE" PUERTO CERRADO PARA EMBARCACIONES  MENOR A 25 AB';
    const c = derivarCierre(reg(crudo));
    assert.strictEqual(c.texto_original, crudo);   // byte a byte
  });

  test('sin texto: se dice, no se infiere (INV-0.2)', () => {
    const c = derivarCierre(reg('   ', { MotivoRestriccion: 'MAL TIEMPO', AreaRestriccion: 'DENTRO DEL LIMITE DEL PUERTO' }));
    assert.strictEqual(c.estado, 'sin_cierre_declarado');
    assert.strictEqual(c.razon_sin_cierre, 'sin_texto');
    // Trae zona por campo y no por eso se le inventa un cierre:
    assert.strictEqual(c.via, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — D-C5: se lee el número, la unidad se conserva', () => {
  test('AB se conserva como AB', () => {
    const c = derivarCierre(reg('PUERTO CERRADO PARA EMBARCACIONES MENORES DE 25 A.B. DENTRO Y FUERA.'));
    assert.strictEqual(c.alcance.umbral, 25);
    assert.strictEqual(c.alcance.unidad, 'AB');
  });

  test('TRG se conserva como TRG y NO se convierte a AB', () => {
    const c = derivarCierre(reg('PUERTO CERRADO PARA TODA NAVE MENOR A 12 TRG DENTRO Y FUERA.'));
    assert.strictEqual(c.alcance.umbral, 12);
    assert.strictEqual(c.alcance.unidad, 'TRG');   // 12 TRG ≠ 12 AB
  });

  test('la octava grafía "A/B." con barra también da unidad (ID 95208)', () => {
    const c = derivarCierre(reg('MAL TIEMPO, PURTO CERRADO PARA EMBARCACIONES MENORES DE 50 A/B. DENTRO Y FUERA DE LA BAHIA'));
    assert.strictEqual(c.alcance.umbral, 50);
    assert.strictEqual(c.alcance.unidad, 'AB');
  });

  test('"TRG///" — las barras son de la fuente y no rompen la lectura', () => {
    const c = derivarCierre(reg('PUERTO CERRADO PARA NAVE MENOR A 50 TRG/// DENTRO Y FUERA.'));
    assert.strictEqual(c.alcance.unidad, 'TRG');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — ruido de fuente (INV-0.3)', () => {
  test('las comillas escapadas no rompen el criterio (ID 95185)', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICION DE TIEMPO "VARIABLE" PUERTO CERRADO PARA EMBARCACIONES MENOR A 25 AB DENTRO DE LA BAHIA Y 50 AB FUERA', { GLBahia: 'RADA DE\tCARELMAPU' }));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.alcance.tipo, 'umbral');
  });

  test('el doble espacio no rompe el criterio', () => {
    const c = derivarCierre(reg('PUERTO CERRADO  PARA EE.MM. DE 100 AB.  ENTRE PUNTA NIEBLA HASTA PUNTA RONCA'));
    assert.strictEqual(c.estado, 'cerrado');
  });

  test('"CONDICIONDE" pegado: no se caza, y el registro entra igual por CERRADO (ID 95171)', () => {
    // La palabra pegada NO se separa — ningún normalizador lo hace y no se
    // aproxima. El registro entra por el participio, que está intacto.
    const c = derivarCierre(reg('SE ESTABLECE CONDICIONDE PUERTO CERRADO PARA TODA LA JURISDICCION DE JUAN FERNANDEZ.', { AreaRestriccion: 'DENTRO Y FUERA DEL LÍMITE DEL PUERTO', NaveRecibe: 'NAVE MAYOR (&GT;=100 AB), NAVE MENOR (&LT;100 AB)' }));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.via, 'predicado');
  });

  test('el registro no se muta', () => {
    const r = reg('PUERTO CERRADO PARA EMBARCACIONES MENORES DE 25 AB DENTRO Y FUERA.');
    const antes = JSON.stringify(r);
    derivarCierre(r);
    assert.strictEqual(JSON.stringify(r), antes);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4.6 — UN CONTROL TIENE QUE PODER FALLAR.
// No alcanza con que los tests de arriba pasen: hay que probar que el derivador
// MUERDE. Se le inyecta el defecto que debe cazar y se confirma que lo caza, y
// se le inyecta el vecino léxico y se confirma que NO lo caza.
// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — MORDIDA (§4.6)', () => {
  test('MORDIDA POSITIVA: se inyecta un cierre y el derivador lo caza', () => {
    const base = reg('SE ESTABLECE CONDICIÓN DE PUERTO VARIABLE POR AUMENTO DE VIENTO.');
    const antes = derivarCierre(base);
    assert.strictEqual(antes.estado, 'sin_cierre_declarado', 'el control arranca en no-cierre');

    const inyectado = reg(base.Observacion + ' PUERTO CERRADO PARA EMBARCACIONES MENORES DE 25 AB.');
    const despues = derivarCierre(inyectado);
    assert.strictEqual(despues.estado, 'cerrado', 'MORDIDA FALLIDA: se inyectó un cierre y no lo cazó');
    assert.strictEqual(despues.alcance.tipo, 'umbral');
  });

  test('MORDIDA NEGATIVA: se inyecta CERRAZÓN y el derivador NO la caza', () => {
    const base = reg('SE ESTABLECE CONDICIÓN DE PUERTO VARIABLE POR AUMENTO DE VIENTO.');
    const inyectado = reg(base.Observacion + ' CERRAZÓN DE NIEBLA EN LA JURISDICCIÓN.');
    const despues = derivarCierre(inyectado);
    assert.strictEqual(despues.estado, 'sin_cierre_declarado',
      'MORDIDA FALLIDA: CERRAZON (niebla, una CAUSA) se leyó como cierre — el predicado se volvió aproximado');
  });

  test('MORDIDA DE LA RED: se le saca un eje y deja de entrar', () => {
    const tres = reg('SE ESTABLECE CONDICIÓN DE TIEMPO VARIABLE, SE RESTRINGE NAVEGACIÓN PARA EMBARCACIONES MENORES DE 25 AB DENTRO Y FUERA DE LA BAHÍA.', { AreaRestriccion: null });
    assert.strictEqual(derivarCierre(tres).estado, 'cerrado', 'con los tres ejes debe entrar');
    assert.strictEqual(derivarCierre(tres).via, 'ejes');

    // Se le saca el eje "qué queda suspendido" (la actividad nombrada):
    const dos = reg('SE ESTABLECE CONDICIÓN DE TIEMPO VARIABLE PARA EMBARCACIONES MENORES DE 25 AB DENTRO Y FUERA DE LA BAHÍA.', { AreaRestriccion: null });
    assert.strictEqual(derivarCierre(dos).estado, 'sin_cierre_declarado',
      'MORDIDA FALLIDA: la red entró con dos ejes, y exige tres');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Los 444 registros reales. Guarda si el material no está (precedente:
// bre-test.js "sondaje real"). Los conteos son los medidos y publicados.
// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — sondaje real, 444 registros', () => {
  const DIR = path.join(__dirname, '..', '..', '..', 'sondaje-sitport');
  const CAPTURAS = [
    'restricciones_2026-07-30_19-42.json',
    'restricciones_2026-07-31_16-32.json',
    'restricciones_2026-07-31_20-32.json',
    'restricciones_2026-07-31_21-01.json',
    'restricciones_2026-08-01_13-14.json',
    'check_ahora.json',
  ];
  const hayMaterial = CAPTURAS.every(f => fs.existsSync(path.join(DIR, f)));

  function cargar() {
    const filas = [];
    for (const f of CAPTURAS) {
      const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      for (const r of j.recordsets[0]) filas.push({ captura: f, r });
    }
    return filas;
  }

  test('los conteos de la Opción D cierran contra lo medido', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    const filas = cargar();
    assert.strictEqual(filas.length, 444, 'el denominador no es 444');

    const der = filas.map(x => ({ ...x, c: derivarCierre(x.r) }));
    const cerrados = der.filter(x => x.c.estado === 'cerrado');

    assert.strictEqual(cerrados.length, 335, 'D (Ba ∪ red) debe dar 335 / 444');
    assert.strictEqual(cerrados.filter(x => x.c.via === 'predicado').length, 327, 'Ba debe dar 327 / 444');
    assert.strictEqual(cerrados.filter(x => x.c.via === 'ejes').length, 8, 'la red debe agregar 8 filas');

    const idsRed = [...new Set(cerrados.filter(x => x.c.via === 'ejes').map(x => x.r.IDRestriccion))].sort((a, b) => a - b);
    assert.deepStrictEqual(idsRed, [94987, 95163, 95205, 95295], 'la red son 4 restricciones y son estas');
  });

  test('los cuatro estados de alcance suman 335', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    const cerrados = cargar().map(x => derivarCierre(x.r)).filter(c => c.estado === 'cerrado');
    const n = t => cerrados.filter(c => c.alcance.tipo === t).length;
    assert.strictEqual(n('umbral'), 217);
    assert.strictEqual(n('total'), 5);
    assert.strictEqual(n('menores_sin_umbral'), 94);
    assert.strictEqual(n('no_legible'), 19);
    assert.strictEqual(n('umbral') + n('total') + n('menores_sin_umbral') + n('no_legible'), 335);
  });

  test('los 19 sin umbral legible caen al genérico y NO desaparecen', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    const cerrados = cargar().map(x => derivarCierre(x.r)).filter(c => c.estado === 'cerrado');
    const genericos = cerrados.filter(c => c.aviso_modo === 'generico');
    assert.strictEqual(genericos.length, 19);
    // Siguen en el resultado, con su texto crudo, y siguen declarando cierre:
    assert.ok(genericos.every(c => c.estado === 'cerrado'));
    assert.ok(genericos.every(c => typeof c.texto_original === 'string' && c.texto_original.length > 0));
  });

  test('todo umbral extraído trae su unidad — cero huecos', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    const cerrados = cargar().map(x => derivarCierre(x.r)).filter(c => c.estado === 'cerrado');
    const conUmbral = cerrados.filter(c => c.alcance.tipo === 'umbral');
    assert.strictEqual(conUmbral.filter(c => c.alcance.unidad == null).length, 0,
      'un umbral sin unidad es falla del lector, no "no aplicable"');
    assert.strictEqual(conUmbral.filter(c => c.alcance.unidad === 'AB').length, 209);
    assert.strictEqual(conUmbral.filter(c => c.alcance.unidad === 'TRG').length, 8);
  });

  test('los 26 sin texto se declaran, no se infieren', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    const todos = cargar().map(x => derivarCierre(x.r));
    assert.strictEqual(todos.filter(c => c.razon_sin_cierre === 'sin_texto').length, 26);
  });

  test('el texto original sale byte a byte en los 444', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    let comparadas = 0;
    for (const { r } of cargar()) {
      assert.strictEqual(derivarCierre(r).texto_original, r.Observacion || '');
      comparadas++;
    }
    assert.strictEqual(comparadas, 444, 'comparaciones efectivas = 0 sería un test que no prueba nada');
  });
});
