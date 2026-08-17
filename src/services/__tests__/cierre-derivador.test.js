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
// Se importa el parser para el CONTROL DE CONTENCIÓN de la fuente B (D-C6): el
// derivador lee del texto con léxico propio y el parser con el suyo, y hay que
// vigilar que no se separen hacia abajo. No se usa para derivar nada.
const { normalizarRestriccion } = require('../sitport-parser');

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

  // R1 (2026-08-17) · `rama_parser` YA NO EXISTE. Bajo D-C6 el alcance se lee del
  // TEXTO (fuente B), así que no hay rama de parser que reportar: el nombre había
  // dejado de ser verdadero en TODOS sus valores, no sólo en el de la unión.
  // La procedencia bajó a `componentes[i].regla`, un solo eje: qué regla leyó ESE
  // componente. Y la separación que D-C3 hacía por rama sigue en pie desde un
  // lugar más directo — se dice qué se leyó en vez de inferir qué quiso decir un
  // null:  menores_sin_umbral <-> se leyó un componente `menores` sin número
  //        no_legible         <-> no se leyó NINGÚN componente.
  test('el campo `rama_parser` ya no existe en ningún alcance', () => {
    for (const t of ['SE ESTABLECE CONDICIÓN DE PUERTO CERRADO PARA NAVES MENORES, DENTRO Y FUERA DE LA BAHÍA.',
      'PUERTO CERRADO PARA EMBARCACIONES MENORES DE 25 A.B. DENTRO Y FUERA.',
      'SE ESTABLECE CONDICIÓN DE PUERTO A "MAL TIEMPO N°224" CERRADO.']) {
      assert.ok(!('rama_parser' in derivarCierre(reg(t)).alcance),
        'rama_parser volvió: es un campo con dos vocabularios y por eso se eliminó');
    }
  });

  test('"MENORES" sin número NO es un fallo de extracción — se leyó la clase', () => {
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO CERRADO POR AVISO DE MAL TIEMPO PARA NAVES MENORES, DENTRO Y FUERA DE LA BAHÍA.'));
    assert.strictEqual(c.alcance.tipo, 'menores_sin_umbral');
    assert.strictEqual(c.alcance.umbral, null);
    // La separación de D-C3: se leyó un componente, y es de clase sin número.
    assert.ok(c.alcance.componentes.length >= 1);
    assert.ok(c.alcance.componentes.some(k => k.tipo === 'menores_sin_umbral' && k.umbral === null));
  });

  test('cierre TOTAL es su propio estado y NO se pliega a menores', () => {
    // Corrección del owner 2026-08-16: un cierre para TODO TIPO DE NAVES alcanza
    // a todas. Plegarlo a menores_sin_umbral le angostaría el alcance.
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO CERRADO, TRÁFICO SUSPENDIDO PARA TODO TIPO DE NAVES DENTRO Y FUERA DE LA BAHÍA.'));
    assert.strictEqual(c.alcance.tipo, 'total');
    assert.notStrictEqual(c.alcance.tipo, 'menores_sin_umbral');
    // El camino del parser sigue existiendo, pero como COMPONENTE, no como rama.
    assert.ok(c.alcance.componentes.some(k => k.regla === 'parser:69'));
  });

  test('ilegible se distingue de "sin umbral a propósito": CERO componentes', () => {
    // Hay un dígito y no es tonelaje: el 224 es el número del aviso.
    const c = derivarCierre(reg('SE ESTABLECE CONDICIÓN DE PUERTO A "MAL TIEMPO N°224" CERRADO.', { AreaRestriccion: null }));
    assert.strictEqual(c.estado, 'cerrado');
    assert.strictEqual(c.alcance.tipo, 'no_legible');
    assert.deepStrictEqual(c.alcance.componentes, [],
      'no_legible es "no se leyó NINGÚN componente" — si trae alguno, es otra cosa');
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

  // Los conteos son los MEDIDOS bajo D-C6 (opción A del owner, 2026-08-17), no
  // los de la predicción de Fase 1 —215/14/88/18 y 110/10/34/13—, que quedó
  // RETIRADA: se había hecho sobre la tabla de los 20 múltiples y por
  // construcción no cubría los registros de alcance ÚNICO mal leídos.
  // Instrumento: _bitacoras/alcance_union_2026-08-17/03_verificar_union.txt
  test('los cuatro estados de alcance suman 335 en filas', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    const cerrados = cargar().map(x => derivarCierre(x.r)).filter(c => c.estado === 'cerrado');
    const n = t => cerrados.filter(c => c.alcance.tipo === t).length;
    assert.strictEqual(n('umbral'), 214);
    assert.strictEqual(n('total'), 16);
    assert.strictEqual(n('menores_sin_umbral'), 90);
    assert.strictEqual(n('no_legible'), 15);
    assert.strictEqual(n('umbral') + n('total') + n('menores_sin_umbral') + n('no_legible'), 335);
  });

  test('la misma partición en RESTRICCIONES suma 167', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    // Las dos cifras van juntas: 335 filas son 167 restricciones distintas, y
    // decir una sin la otra ya salió mal en este frente.
    const porId = new Map();
    for (const { r } of cargar()) {
      const c = derivarCierre(r);
      if (c.estado !== 'cerrado') continue;
      const id = String(r.IDRestriccion);
      if (porId.has(id)) {
        assert.strictEqual(porId.get(id), c.alcance.tipo,
          `el ID ${id} deriva dos tipos distintos entre capturas`);
      } else porId.set(id, c.alcance.tipo);
    }
    assert.strictEqual(porId.size, 167);
    const n = t => [...porId.values()].filter(v => v === t).length;
    assert.strictEqual(n('umbral'), 109);
    assert.strictEqual(n('total'), 12);
    assert.strictEqual(n('menores_sin_umbral'), 36);
    assert.strictEqual(n('no_legible'), 10);
    assert.strictEqual(n('umbral') + n('total') + n('menores_sin_umbral') + n('no_legible'), 167);
  });

  test('los que no traen alcance legible caen al genérico y NO desaparecen', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    const cerrados = cargar().map(x => derivarCierre(x.r)).filter(c => c.estado === 'cerrado');
    const genericos = cerrados.filter(c => c.aviso_modo === 'generico');
    assert.strictEqual(genericos.length, 15, 'eran 19 antes de D-C6; cuatro pasaron a detalle');
    assert.strictEqual(cerrados.filter(c => c.aviso_modo === 'detalle').length, 320);
    // Siguen en el resultado, con su texto crudo, y siguen declarando cierre:
    assert.ok(genericos.every(c => c.estado === 'cerrado'));
    assert.ok(genericos.every(c => typeof c.texto_original === 'string' && c.texto_original.length > 0));
  });

  test('todo umbral extraído trae su unidad — cero huecos', { skip: !hayMaterial && 'falta sondaje-sitport/' }, () => {
    const cerrados = cargar().map(x => derivarCierre(x.r)).filter(c => c.estado === 'cerrado');
    const conUmbral = cerrados.filter(c => c.alcance.tipo === 'umbral');
    assert.strictEqual(conUmbral.length, 214);
    assert.strictEqual(conUmbral.filter(c => c.alcance.unidad == null).length, 0,
      'un umbral sin unidad es falla del lector, no "no aplicable"');
    // El reparto es el MEDIDO. 207/8 era una predicción sobre 215 y no reprodujo:
    // 95342 salió del bucket `umbral` (era el 50 TRG) y 95219/95220 también.
    const ab = conUmbral.filter(c => c.alcance.unidad === 'AB').length;
    const trg = conUmbral.filter(c => c.alcance.unidad === 'TRG').length;
    assert.strictEqual(ab + trg, 214, 'AB y TRG tienen que repartirse los 214 sin resto');
    assert.strictEqual(ab, 207);
    assert.strictEqual(trg, 7);
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

// ─────────────────────────────────────────────────────────────────────────────
// D-C6 · EL ALCANCE ES LA UNIÓN DE TODO LO QUE EL TEXTO NOMBRE
//
// Decisión del owner 2026-08-17, opción A. Los casos con ID se resuelven contra
// el registro REAL del sondaje, no contra un texto tipeado a mano: un literal
// transcrito ya se pagó dos veces en este frente. Si el ID no está en el
// material, es FALLA y no "no aplicable" — por eso `traer` tira.
// ─────────────────────────────────────────────────────────────────────────────
describe('cierre-derivador — D-C6: la unión', () => {
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
  const skip = { skip: !hayMaterial && 'falta sondaje-sitport/' };

  const PORID = new Map();
  if (hayMaterial) {
    for (const f of CAPTURAS) {
      for (const r of JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).recordsets[0]) {
        const id = String(r.IDRestriccion);
        if (!PORID.has(id)) PORID.set(id, r);
      }
    }
  }
  function traer(id) {
    const r = PORID.get(String(id));
    if (!r) throw new Error(`el ID ${id} no está en el sondaje — es falla, no "no aplicable"`);
    return r;
  }
  const alc = id => derivarCierre(traer(id)).alcance;

  // ── los 9 que emitían el más angosto, uno por uno ──────────────────────────
  // Medido en `alcance_multiple` §3: dejaban naves sin aviso. Bajo D-C6 los
  // nueve emiten la unión y ninguno deja a nadie afuera.
  const LOS_NUEVE = [
    ['95062', 'BORDE COSTERO-VALDIVIA', 25, { tipo: 'umbral', umbral: 100 }],
    ['95071', 'BAHIA QUELLON', 50, { tipo: 'umbral', umbral: 100 }],
    ['95075', 'QUEILEN', 25, { tipo: 'umbral', umbral: 50 }],
    ['95155', 'BAHIA QUELLON', 50, { tipo: 'umbral', umbral: 100 }],
    ['95352', 'BAHIA QUELLON', 50, { tipo: 'umbral', umbral: 100 }],
    ['95219', 'SECTOR CHAIHUIN', 50, { tipo: 'total', umbral: null }],
    ['95220', 'BAHIA CORRAL', 50, { tipo: 'total', umbral: null }],
    ['95099', 'BAHIA CONCHALI', null, { tipo: 'total', umbral: null }],
    ['95100', 'BAHIA PICHIDANGUI', null, { tipo: 'total', umbral: null }],
  ];
  for (const [id, bahia, antes, esperado] of LOS_NUEVE) {
    test(`los 9 · ID ${id} (${bahia}): antes ${antes == null ? 'menores_sin_umbral' : 'umbral ' + antes} → ${esperado.tipo}${esperado.umbral != null ? ' ' + esperado.umbral : ''}`, skip, () => {
      const a = alc(id);
      assert.strictEqual(a.tipo, esperado.tipo);
      assert.strictEqual(a.umbral, esperado.umbral);
      if (antes != null) {
        assert.notStrictEqual(a.umbral, antes,
          `${id} volvió al umbral angosto ${antes}: deja naves sin aviso`);
      }
      assert.ok(a.componentes.length >= 2, 'un múltiple tiene que traer más de un componente');
    });
  }

  // ── los 4 de cola abierta ──────────────────────────────────────────────────
  // No dejaban una ventana de tonelaje: dejaban TODO lo que está por encima.
  // `total` es el único valor del vocabulario sin techo.
  test('los 4 de cola abierta salen a `total`, que es el único valor sin techo', skip, () => {
    for (const id of ['95219', '95220', '95099', '95100']) {
      const a = alc(id);
      assert.strictEqual(a.tipo, 'total', `${id} tiene que alcanzar a todas: su cola no tiene tope`);
      assert.strictEqual(a.umbral, null);
    }
  });

  // ── LOS CINCO DE LA OPCIÓN A ───────────────────────────────────────────────
  // Son la decisión del owner. Si mañana alguno se mueve, esto se pone rojo.
  test('opción A · los 4 que pasan de genérico a detalle, con su alcance', skip, () => {
    const ESPERADO = {
      '94985': 'total',              // EMBARCACIONES MAYORES Y MENORES
      '95201': 'total',              // PARA NAVES Y EMBARCACIONES
      '95202': 'total',              // ídem, otra bahía
      '95169': 'menores_sin_umbral', // CERRADO PARA EE MM — salda O4b
    };
    for (const [id, tipo] of Object.entries(ESPERADO)) {
      const c = derivarCierre(traer(id));
      assert.strictEqual(c.aviso_modo, 'detalle', `${id} tiene que salir con detalle`);
      assert.strictEqual(c.alcance.tipo, tipo);
      assert.ok(c.alcance.componentes.length > 0);
      // D-C4: el detalle NO reemplaza al piso. El texto crudo sigue viajando.
      assert.strictEqual(c.texto_original, traer(id).Observacion);
    }
  });

  test('opción A · 95342 cambia de tipo sin cambiar de aviso_modo', skip, () => {
    // "CERRADO PARA EMBARCACIONES MENORES DENTRO Y FUERA DE LA BAHIA HASTA 50 TRG".
    // El "HASTA 50 TRG" cae después de DENTRO Y FUERA, donde la ventana termina.
    // La unión de "todas las menores" con "menores de 50 TRG" es la clase entera:
    // AMPLÍA. Recuperar el número exige mover el TERMINADOR, que es lo que
    // sostiene que los 10 descartados no se ensanchen — decisión del owner: NO se
    // toca. Si alguien lo mueve, este test se lo dice.
    const c = derivarCierre(traer('95342'));
    assert.strictEqual(c.alcance.tipo, 'menores_sin_umbral');
    assert.strictEqual(c.alcance.umbral, null);
    assert.strictEqual(c.aviso_modo, 'detalle');
  });

  test('opción A · NINGÚN otro registro mueve su aviso_modo', skip, () => {
    // El conteo agregado. Los cuatro nombrados y cero más: si aparece un quinto,
    // es una decisión del owner que nadie tomó.
    const cerrados = [...PORID.values()].map(derivarCierre).filter(c => c.estado === 'cerrado');
    assert.strictEqual(cerrados.filter(c => c.aviso_modo === 'generico').length, 10,
      'sobre 167 restricciones cerradas');
    assert.strictEqual(cerrados.filter(c => c.aviso_modo === 'detalle').length, 157);
  });

  // ── un alcance único que NO cambia ─────────────────────────────────────────
  test('un registro de alcance único sale idéntico a antes de D-C6', skip, () => {
    // 95208 (PUERTO MONTT, el del tipeo "PURTO" y la octava grafía "50 A/B.").
    // Nombra UN alcance, así que la unión ES ese alcance y nada se mueve.
    const a = alc('95208');
    assert.strictEqual(a.tipo, 'umbral');
    assert.strictEqual(a.umbral, 50);
    assert.strictEqual(a.unidad, 'AB');
    // 143 restricciones de alcance único no cambiaron; ésta es una de ellas.
  });

  // ── mayores ∪ menores = total, con los dos caminos distinguidos ────────────
  test('`total` tiene DOS caminos y `componentes[i].regla` los distingue', skip, () => {
    // Camino 1 — la rama del parser: "TODO TIPO DE NAVES".
    const porParser = derivarCierre(traer('95056')).alcance;
    assert.strictEqual(porParser.tipo, 'total');
    assert.ok(porParser.componentes.some(k => k.regla === 'parser:69'),
      'el cierre total declarado llega por la rama :69 del parser');

    // Camino 2 — la unión de dos clases disjuntas. D-C6: "dice «mayores y
    // menores» → alcanza a todos". Es la decisión del owner, no una inferencia.
    const porUnion = derivarCierre(traer('95099')).alcance;
    assert.strictEqual(porUnion.tipo, 'total');
    assert.ok(!porUnion.componentes.some(k => k.regla === 'parser:69'),
      'este total NO viene de la rama :69: viene de sumar mayores y menores');
    const clases = porUnion.componentes.filter(k => k.regla === 'lexico:para').map(k => k.tipo);
    assert.ok(clases.includes('mayores') && clases.includes('menores_sin_umbral'),
      'los dos componentes disjuntos tienen que estar a la vista');

    // Y el mismo valor por dos caminos NO se colapsa en un campo sobrecargado:
    // la procedencia vive en cada componente, no en un `rama_parser` con dos
    // vocabularios. Es R1.
    assert.ok(!('rama_parser' in porParser) && !('rama_parser' in porUnion));
  });

  // ── EL CONJUNTO NEGATIVO ───────────────────────────────────────────────────
  // El riesgo real de la fuente B no son los 9: son éstos. `alcance_multiple` §7
  // midió que "dos clases de nave" dispara 8 veces y acierta 3. Un léxico que
  // leyera "NAVES MAYORES" sin exigir gobierno por predicado de cierre ensancha
  // cinco registros que nadie declaró múltiples.
  const DESCARTADOS = [
    ['95156', 'remisión', { tipo: 'umbral', umbral: 100 }],
    ['95157', 'remisión', { tipo: 'umbral', umbral: 100 }],
    ['95158', 'remisión', { tipo: 'umbral', umbral: 100 }],
    ['95159', 'remisión', { tipo: 'umbral', umbral: 100 }],
    ['95072', 'faena', { tipo: 'menores_sin_umbral', umbral: null }],
    ['95027', 'excepción', { tipo: 'umbral', umbral: 25 }],
    ['95028', 'excepción', { tipo: 'umbral', umbral: 25 }],
    ['95029', 'excepción', { tipo: 'umbral', umbral: 25 }],
    ['95193', 'excepción', { tipo: 'umbral', umbral: 25 }],
    ['94977', 'universal modificado', { tipo: 'menores_sin_umbral', umbral: null }],
  ];
  for (const [id, motivo, esperado] of DESCARTADOS) {
    test(`negativo · ID ${id} (${motivo}) NO se ensancha`, skip, () => {
      const a = alc(id);
      assert.strictEqual(a.tipo, esperado.tipo,
        `${id} se ensanchó: el léxico leyó como alcance algo que no lo gobierna un predicado de cierre`);
      assert.strictEqual(a.umbral, esperado.umbral);
      assert.notStrictEqual(a.tipo, 'total',
        `${id} salió a total: es exactamente el falso positivo que M3 producía`);
    });
  }

  test('negativo · los 5 que M3 ensanchaba siguen sin nombrar a las mayores', skip, () => {
    // 95072 y 95156-95159 son los cinco falsos positivos nombrados de M3.
    for (const id of ['95072', '95156', '95157', '95158', '95159']) {
      const a = alc(id);
      assert.ok(!a.componentes.some(k => k.tipo === 'mayores'),
        `${id}: "NAVES MAYORES" volvió a leerse como alcance de un cierre`);
    }
  });

  test('negativo · 94977: el universal MODIFICADO denota UN conjunto, no dos', skip, () => {
    // "PUERTO CERRADO PARA TODO TIPO DE EMBARCACIONES MENORES" es {menores}.
    // Si se leyera `todas` + `menores` por separado, la unión daría `total` — que
    // es la lectura que `alcance_multiple` §8 OBS-3 midió como equivocada.
    const a = alc('94977');
    assert.strictEqual(a.tipo, 'menores_sin_umbral');
    assert.ok(!a.componentes.some(k => k.tipo === 'total'),
      'el universal se leyó suelto: el modificador MENORES se perdió');
  });

  // ── LOS TRES DEFECTOS DE LA PRIMERA CORRIDA ────────────────────────────────
  // Los tres los cazó el conteo "alcance único que CAMBIA", que existía para ser
  // cero. Cada uno queda con un test que se pone rojo si vuelve.
  test('defecto 1 · el léxico usa UN vocabulario, no dos', skip, () => {
    // La rama del universal modificado emitía 'menores' y el barrido general
    // 'menores_sin_umbral' para la misma cosa; la unión no encontraba el par en
    // la retícula y devolvía no_legible. Es el mismo defecto que R1 cierra, y me
    // lo hice dentro de una función de veinte líneas.
    const VOCAB = new Set(['umbral', 'total', 'menores_sin_umbral', 'mayores']);
    let vistos = 0;
    for (const r of PORID.values()) {
      for (const k of derivarCierre(r).alcance.componentes) {
        assert.ok(VOCAB.has(k.tipo), `componente con tipo fuera del vocabulario: ${k.tipo}`);
        vistos++;
      }
    }
    assert.ok(vistos > 0, 'comparaciones efectivas = 0 sería un test que no prueba nada');
  });

  test('defecto 2 · `menores_sin_umbral` ∪ `umbral(N)` es la clase entera', skip, () => {
    // `menores_sin_umbral` significa TODAS las menores (parser :90) y contiene a
    // "las menores de N". Sin esta rama la unión devolvía null y el registro caía
    // al genérico — perdiendo detalle que ya tenía. Afectaba 95072, 95118, 95342.
    for (const id of ['95072', '95118', '95342']) {
      const c = derivarCierre(traer(id));
      assert.strictEqual(c.alcance.tipo, 'menores_sin_umbral', `${id}`);
      assert.strictEqual(c.aviso_modo, 'detalle',
        `${id} cayó al genérico: la unión no supo sumar la clase con su propio umbral`);
    }
  });

  test('defecto 3 · dos marcas de la misma clase son UNA expresión (ID 94993)', skip, () => {
    // "FUERA DE LA BAHIA CERRADO PARA EE MM MENORES DE 25 AB" nombra la clase dos
    // veces y denota UN conjunto. Sin el colapso, la primera marca quedaba sin
    // número y emitía la clase, la segunda absorbía el 25, y la unión sumaba algo
    // que el texto dijo una sola vez. Es §1 de `alcance_multiple`, que yo había
    // citado en el encabezado del archivo y no había implementado.
    const a = alc('94993');
    assert.strictEqual(a.tipo, 'umbral');
    assert.strictEqual(a.umbral, 25);
    assert.strictEqual(a.unidad, 'AB');
    const delLexico = a.componentes.filter(k => k.regla === 'lexico:para');
    assert.strictEqual(delLexico.length, 1,
      'el léxico leyó dos componentes donde el texto declara uno');
  });

  // ── texto leído a medias ───────────────────────────────────────────────────
  test('texto leído a medias: el alcance NO se completa con lo que no se leyó', () => {
    // Sintético a propósito: sobre el material son CERO (medido, 0 de 167). Un
    // par que la retícula no sabe sumar NO se resuelve inventando un valor ni
    // quedándose con la mitad legible —que achicaría, contra D-C6—: cae al
    // genérico, que es el piso de D-C4 y alcanza a todos. Amplía.
    const c = derivarCierre(reg('PUERTO CERRADO PARA NAVES MAYORES DENTRO Y FUERA DE LA BAHIA.'));
    assert.strictEqual(c.estado, 'cerrado', 'el cierre no se pierde');
    assert.strictEqual(c.alcance.tipo, 'no_legible');
    assert.strictEqual(c.aviso_modo, 'generico', 'el genérico es el piso y sale igual');
    // La evidencia de lo que SÍ se leyó no se tira: queda en componentes.
    assert.ok(c.alcance.componentes.some(k => k.tipo === 'mayores'),
      'se leyó `mayores` y no hay valor de vocabulario para él: se dice, no se calla');
  });

  test('sobre el material, los que caen a medias son CERO', skip, () => {
    let medias = 0, comparados = 0;
    for (const r of PORID.values()) {
      const a = derivarCierre(r).alcance;
      if (derivarCierre(r).estado !== 'cerrado') continue;
      comparados++;
      if (a.tipo === 'no_legible' && a.componentes.length > 0) medias++;
    }
    assert.strictEqual(comparados, 167, 'denominador: 167 restricciones cerradas');
    assert.strictEqual(medias, 0);
  });

  // ── el control de contención de la fuente B ────────────────────────────────
  test('contención · todo umbral del parser está CONTENIDO en la unión', skip, () => {
    // El derivador tiene léxico propio y el parser tiene el suyo: los dos leen el
    // mismo texto y pueden separarse con el tiempo. Este control NO los obliga a
    // ser iguales —D-C6 amplía a propósito— pero caza que se separen HACIA ABAJO.
    let comparadas = 0, porClase = [];
    for (const r of PORID.values()) {
      const c = derivarCierre(r);
      if (c.estado !== 'cerrado') continue;
      const n = normalizarRestriccion(r);
      if (n.umbral_ab_fuera == null) continue;
      comparadas++;
      const a = c.alcance;
      if (a.tipo === 'menores_sin_umbral') { porClase.push(String(r.IDRestriccion)); continue; }
      assert.ok(a.tipo === 'total' || a.tipo === 'no_legible' ||
        (a.tipo === 'umbral' && a.umbral >= n.umbral_ab_fuera),
        `ID ${r.IDRestriccion}: el parser leyó ${n.umbral_ab_fuera} y la unión emite ${a.tipo} ${a.umbral} — es MÁS ANGOSTA`);
    }
    assert.ok(comparadas > 0, 'comparaciones efectivas = 0 sería un test que no prueba nada');
    assert.strictEqual(comparadas, 112, 'restricciones cerradas donde el parser extrae umbral');
    // La rama de clase se admite porque "todas las menores" contiene "las menores
    // de N" — pero se PINCHA el conjunto, porque admitirla sin más le quitaría al
    // control la capacidad de cazar un angostamiento hacia esa clase.
    assert.deepStrictEqual(porClase.sort(), ['95342'],
      'apareció un segundo registro que baja de umbral a la clase: es decisión del owner');
  });
});
