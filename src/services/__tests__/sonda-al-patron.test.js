'use strict';
// LA ADVERTENCIA DE SONDA LLEGA AL PATRON — PASO 1 DE LA AGENDA DE LA MAREA.
//
//   «La unica advertencia de seguridad fisica que la app calcula y descarta.»
//
// El backend compone el texto —sonda documentada del Derrotero SHOA contra el
// calado de la nave mas su margen de resguardo— y la PWA no lo dibuja nunca.
// Este control cubre las DOS mitades del defecto, porque son dos y no una:
//
//   (1) el texto no se compone NUNCA para una ruta de P3, porque `fetchRuta`
//       no manda `calado_m` y el backend cae a su default de 1,5 m; y
//   (2) aunque se compusiera, no hay forma de seleccionarlo: `advertencias`
//       es un `string[]` plano con CUATRO clases mezcladas, incluido un
//       diagnostico interno del motor que nombra un algoritmo.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE LA SELECCION SE ANCLA EN UNA CLASE Y NO EN EL TEXTO — §4.9.
//
// Filtrar la advertencia de sonda por una cadena suya («Derrotero SHOA») seria
// una guarda anclada en la ORTOGRAFIA de un texto vivo: el dia que alguien
// reescriba la frase, la advertencia deja de dibujarse EN VERDE Y EN SILENCIO.
// Este arbol ya pago dos veces por esa forma —la mordida `Confirma`/`Confirme` y
// la guarda `/DEROGACION/i`—. La clase es un IDENTIFICADOR: el texto puede
// reescribirse entero sin moverla, y renombrarla pone ESTE control en rojo.
//
// LA LISTA DECLARADA vive aca y no en un modulo nuevo, siguiendo el precedente
// de `borde-pwa-backend.test.js`: una lista cerrada y tipada, en el control,
// donde alguien se va a apoyar en ella.
//
// EL BORDE SE CRUZA DOS VECES Y EN LAS DOS DIRECCIONES, y es una EXCEPCION
// FIRMADA por el owner el 2026-08-21, no un descuido: PWA -> backend (`calado_m`
// en el request) y backend -> PWA (la clase en la respuesta). El plan de cierre
// pide «a lo sumo una vez y en una direccion». Partirla dejaba las dos mitades
// sin criterio de aceptacion corrible: la mitad que solo dibuja no tiene pantalla
// que mirar, porque el backend no compone nada con calado 1,5 m.
// ─────────────────────────────────────────────────────────────────────────────

const test = require('node:test');
const assert = require('node:assert');

const { advertenciasCotejoVertical } = require('../raster/cotejo-vertical');
const { advertenciasPeligrosPorCanal } = require('../raster/peligros-canal');
const { cargarGeometrias } = require('../raster/canal-geometria');
const { ADVERTENCIAS_BASE } = require('../raster-router-service');

const HOOK = 'file:///C:/Users/katia/tmarea-pwa/src/hooks/useVoyageVerification.js';

// ── LA LISTA DECLARADA DE CLASES ─────────────────────────────────────────────
// Las cuatro cosas distintas que hoy viajan en el mismo array. La diferencia no
// es cosmetica: solo UNA es una advertencia de seguridad fisica al patron.
const CLASES = {
  cotejo_vertical:   'sonda documentada del Derrotero contra calado + margen. Texto al patron. LA UNICA que P3 dibuja.',
  peligros_canal:    'bajos y rocas catalogados del Derrotero. Texto al patron, pero NO es un veredicto sobre su nave.',
  descargo_base:     'los dos descargos que van en TODA respuesta, incluidas las de error. No es senal.',
  diagnostico_motor: 'el string-pulling no simplifico la ruta. Nombra un algoritmo interno: NO es texto al patron.',
};

// Waypoints sinteticos posados sobre la geometria real de un canal — es lo que
// `canalesQueCruzaRuta` mide (buffer 500 m). No hace falta levantar el raster.
function waypointsSobre(canal) {
  const linea = cargarGeometrias().get(canal);
  assert.ok(linea, `sin geometria cargada para ${canal} — el control no puede medir`);
  const i = Math.floor(linea.length / 2);
  return [linea[i], linea[Math.min(linea.length - 1, i + 1)]];
}

// Calado que dispara en los tres canales con geometria (sonda max 11 m).
const CALADO_QUE_DISPARA = 12.0;

// ── BACKEND · cada productor pone su clase donde el texto NACE ───────────────

test('la advertencia de sonda viaja tipada, no como cadena suelta', () => {
  const a = advertenciasCotejoVertical(waypointsSobre('Canal Chacao'), CALADO_QUE_DISPARA);
  assert.strictEqual(a.length, 1, 'con calado 12 m sobre Canal Chacao tiene que salir una');
  assert.strictEqual(typeof a[0], 'object', '`advertencias` dejo de ser string[]');
  assert.strictEqual(a[0].clase, 'cotejo_vertical');
  // TODO VIAJA COMO DATO. Si el consumidor tuviera que sacar algo del texto con
  // una expresión regular, lo perdería en silencio al reescribirse la frase.
  //
  // [REANCLADA EL 2026-08-21] Esta prueba decía `assert.match(a[0].texto,
  // /Derrotero SHOA/)`, o sea EXIGÍA LA CITA DENTRO DEL CUERPO. Era la única
  // guarda del árbol que lo exigía —se midió: `cotejo-contrato` sólo cubre las
  // filas de §10, y el texto de sonda no es del catálogo— y la escribí yo en esta
  // misma sesión. Cuando el owner decidió sacar la fuente del cuerpo, esta línea
  // se puso ROJA: §4.9 funcionando, una guarda positiva caduca a la vista. Se
  // reancla en los CAMPOS, que es lo que no depende de cómo esté redactada la frase.
  assert.strictEqual(a[0].canal, 'Canal Chacao');
  assert.strictEqual(a[0].fuente, 'Derrotero SHOA');
  assert.strictEqual(a[0].pagina, 159);
  assert.strictEqual(a[0].sonda_m, 5);
});

test('la fuente NO va dentro del cuerpo — el cuerpo es lenguaje llano', () => {
  const a = advertenciasCotejoVertical(waypointsSobre('Canal Chacao'), CALADO_QUE_DISPARA);
  // PROHIBICIÓN ANCLADA EN LA COSA PROHIBIDA Y NO EN SU ORTOGRAFÍA (§4.9): lo que
  // no puede aparecer en el cuerpo es EL VALOR del campo `fuente`, leído del
  // propio objeto. Renombrar la fuente no afloja la guarda; escribirla de otra
  // manera dentro del texto sí la pasaría, y eso queda ANOTADO: es el límite de
  // esta forma, y no se puede cerrar sin comparar contra una lista de sinónimos
  // que nadie mantiene.
  assert.ok(!a[0].texto.includes(a[0].fuente),
    'la fuente concreta va en su campo y en la línea chica de la PWA, no en el cuerpo');
  assert.ok(!/p\.\s*\d/.test(a[0].texto), 'la página tampoco va en el cuerpo');
  assert.match(a[0].texto, /Según fuentes oficiales/);
});

test('las dos ramas del texto salen del DATO, no de un regex sobre la prosa', () => {
  // RAMA A — Canal Tenglo es hoy el único registro cuya fuente nombra el lugar de
  // SU SONDA (los demás topónimos ubican el paso). Verificado a mano el 2026-08-21.
  const tenglo = advertenciasCotejoVertical(waypointsSobre('Canal Tenglo'), CALADO_QUE_DISPARA);
  assert.strictEqual(tenglo.length, 1);
  assert.match(tenglo[0].punto_bajo, /punta Hoffmann/);
  assert.match(tenglo[0].texto, /punta Hoffmann/);
  assert.ok(!/sin un punto exacto/.test(tenglo[0].texto),
    'con punto nombrado NO puede decir que no lo hay — es la corrección del owner');

  // RAMA B — Paso Chocoi: la fuente no nombra el lugar de la sonda.
  const chocoi = advertenciasCotejoVertical(waypointsSobre('Canal Chacao'), CALADO_QUE_DISPARA);
  assert.strictEqual(chocoi[0].punto_bajo, null);
  assert.match(chocoi[0].texto, /sin un punto exacto señalado/);
});

test('cada aviso lleva su canal como DATO, para que la tarjeta pueda titularse', () => {
  // Owner, 2026-08-21: con dos avisos el patron leia dos parrafos que arrancan
  // igual y ninguno decia de que canal hablaba. El titulo de cada tarjeta sale de
  // `canal`, NO de parsear el cuerpo. Esta asercion es lo que se pone rojo si
  // alguien saca el campo creyendo que el nombre ya esta en el texto.
  const dos = [
    ...advertenciasCotejoVertical(waypointsSobre('Canal Chacao'), 6.0),
    ...advertenciasCotejoVertical(waypointsSobre('Canal Tenglo'), 6.0),
  ];
  assert.strictEqual(dos.length, 2);
  assert.deepStrictEqual(dos.map((a) => a.canal), ['Canal Chacao', 'Canal Tenglo']);
  // Y el cuerpo NO se puede usar para deducirlo: el de Chocoi dice «en este paso».
  assert.ok(!dos[0].texto.includes(dos[0].canal),
    'el cuerpo de la rama B no nombra el canal — por eso el campo hace falta');
});

test('el insumo verificado a mano sobrevive a regenerar el JSON', () => {
  // La corrección vive en el generador, no en el JSON, porque el JSON se REGENERA
  // desde el CSV. Estas dos aserciones se ponen rojas si alguien regenera con un
  // generador que perdió las correcciones — que es el modo de falla real.
  const pasos = require('../../config/pasos-sonda-canal.json');
  const tenglo = pasos.find((p) => p.canal === 'Canal Tenglo');
  assert.strictEqual(tenglo.sonda_canal_min_m, 1.0,
    'Canal Tenglo carga 1,0 m: el 11,0 del extractor era el extremo bajo del tramo MÁS PROFUNDO');
  assert.ok(!pasos.some((p) => p.canal === 'Canal Moraleda'),
    'la sonda de 9,5 m es del acceso E de Canal Pilcomayo, no de Canal Moraleda');
});

test('los peligros por canal viajan con su propia clase, distinta de la sonda', () => {
  const a = advertenciasPeligrosPorCanal(waypointsSobre('Canal Chacao'));
  assert.ok(a.length > 0, 'Canal Chacao tiene peligros catalogados');
  assert.strictEqual(a[0].clase, 'peligros_canal');
});

test('los descargos de base tambien van tipados — ninguno queda sin clase (§4.2)', () => {
  assert.strictEqual(ADVERTENCIAS_BASE.length, 2);
  for (const a of ADVERTENCIAS_BASE) assert.strictEqual(a.clase, 'descargo_base');
});

test('toda clase emitida esta en la lista declarada — nada sin declarar', () => {
  const emitidas = new Set([
    ...advertenciasCotejoVertical(waypointsSobre('Canal Chacao'), CALADO_QUE_DISPARA),
    ...advertenciasPeligrosPorCanal(waypointsSobre('Canal Chacao')),
    ...ADVERTENCIAS_BASE,
  ].map((a) => a.clase));
  for (const c of emitidas) {
    assert.ok(CLASES[c], `clase "${c}" emitida y NO declarada en este control`);
  }
});

// ── EL DEFECTO (1) · el calado nunca cruza el borde ──────────────────────────

test('el default del backend (1,5 m): Chocoi no dispara, Tenglo SI', () => {
  // [REESCRITA EL 2026-08-21, Y SE DICE POR QUE.] Esta prueba afirmaba que con el
  // default de 1,5 m NO dispara NINGUN canal, y llevaba escrito que su rojo
  // significaria que la premisa de la pieza cambio. SE PUSO ROJA, y la premisa
  // habia cambiado de verdad: al corregir el insumo —Canal Tenglo de 11,0 a 1,0 m,
  // que es lo que la fuente declara como su punto mas bajo— una nave de 1,5 m de
  // calado exige 2,0 m y 1,0 < 2,0, asi que Tenglo dispara. La guarda hizo
  // exactamente lo que tenia que hacer: avisar a la vista en vez de quedarse verde
  // sobre un mundo que ya no era el que describia.
  //
  // Y la consecuencia buena, que conviene dejar anotada: aunque un cliente se
  // olvide de mandar `calado_m`, Canal Tenglo AVISA IGUAL. El defecto que abrio
  // esta pieza —el calado que no cruzaba el borde— deja de silenciar este caso.
  assert.strictEqual(advertenciasCotejoVertical(waypointsSobre('Canal Chacao'), 1.5).length, 0,
    'Paso Chocoi documenta 5 m: con 1,5 m de calado no hay nada que advertir');
  assert.strictEqual(advertenciasCotejoVertical(waypointsSobre('Canal Tenglo'), 1.5).length, 1,
    'Canal Tenglo documenta 1 m frente a punta Hoffmann: con 1,5 m de calado TIENE que avisar');
});

test('el aviso de Tenglo alcanza a casi toda la flota, y es lo aceptado', () => {
  // Consecuencia firmada por el owner el 2026-08-21 al aceptar la correccion del
  // insumo: <<en Tenglo la advertencia va a salir casi siempre, y esta bien que
  // salga -- el Derrotero dice que ahi hay un metro en bajamar>>. Se ancla para
  // que el dia que alguien la vea salir demasiado, encuentre la decision y no la
  // confunda con un defecto. Umbral: sonda 1 m < calado + max(0,5; 0,1 x calado).
  assert.strictEqual(advertenciasCotejoVertical(waypointsSobre('Canal Tenglo'), 0.6).length, 1,
    'desde 0,6 m de calado ya avisa');
  assert.strictEqual(advertenciasCotejoVertical(waypointsSobre('Canal Tenglo'), 0.4).length, 0,
    'por debajo de 0,5 m no: el margen minimo es 0,5 y 1,0 no es menor que 0,9');
});

test('P3 manda el calado de la nave: `fetchRuta` deja de caer al default', async () => {
  const fs = require('fs');
  const hook = fs.readFileSync('C:/Users/katia/tmarea-pwa/src/hooks/useVoyageVerification.js', 'utf8');
  const cuerpo = hook.slice(hook.indexOf('async function fetchRuta'), hook.indexOf('async function fetchNavigation'));
  assert.match(cuerpo, /calado_m/, 'fetchRuta tiene que mandar calado_m o el backend nunca compone la advertencia');
});

// ── PWA · LA FUNCION PURA (C1(b), firmado por el owner el 2026-08-21) ────────

test('la PWA selecciona por CLASE y esa clase es una de las que el backend emite', async () => {
  const m = await import(HOOK);
  assert.strictEqual(typeof m.advertenciasDeSonda, 'function');
  // EL ANCLA (C1(a)): identidad, no ortografia. Si el backend renombra la clase,
  // esto se pone ROJO en vez de dejar de dibujar en silencio.
  assert.ok(CLASES[m.CLASE_SONDA], `la PWA filtra por "${m.CLASE_SONDA}", que el backend no emite`);
  assert.strictEqual(m.CLASE_SONDA, 'cotejo_vertical');
});

test('el selector saca la de sonda y deja fuera las otras tres clases', async () => {
  const { advertenciasDeSonda } = await import(HOOK);
  const ruta = {
    ok: true,
    advertencias: [
      { clase: 'descargo_base',     texto: 'Corredor de Referencia Tmarea — linea segmentada informativa.' },
      { clase: 'cotejo_vertical',   texto: 'Su ruta cruza Canal Chacao, donde el Derrotero SHOA documenta 5 m…' },
      { clase: 'peligros_canal',    texto: 'El derrotero menciona en este sector: Bajo Amazonas…' },
      { clase: 'diagnostico_motor', texto: 'El string-pulling no pudo simplificar la ruta…' },
    ],
  };
  const sel = advertenciasDeSonda(ruta);
  assert.strictEqual(sel.length, 1);
  assert.match(sel[0].texto, /Canal Chacao/);
});

test('una ruta fallida no dibuja nada, aunque el error traiga los descargos', async () => {
  const { advertenciasDeSonda } = await import(HOOK);
  const rutaError = { ok: false, error: 'fuera de cobertura', advertencias: ADVERTENCIAS_BASE };
  assert.deepStrictEqual(advertenciasDeSonda(rutaError), []);
});

// ── LA MORDIDA · que el selector DISCRIMINE, no que devuelva algo ────────────

test('MORDIDA — cambiada la clase, el selector no la ve', async () => {
  const { advertenciasDeSonda, CLASE_SONDA } = await import(HOOK);
  const intacta = { ok: true, advertencias: [{ clase: CLASE_SONDA, texto: 'Su ruta cruza Canal Chacao…' }] };
  const rota = { ok: true, advertencias: [{ clase: CLASE_SONDA + '_x', texto: 'Su ruta cruza Canal Chacao…' }] };

  // CONTROL GENERICO DEL ARNES: la mutacion tiene que MUTAR. Una mordida cuyo
  // literal caduco se vuelve una copia identica del dato y sale «no muerde»
  // acusando al control en vez de a la mutacion (13.º defecto de instrumento,
  // 2026-08-21).
  assert.notDeepStrictEqual(rota, intacta, 'LA MUTACION NO MUTO');

  assert.strictEqual(advertenciasDeSonda(intacta).length, 1);
  assert.strictEqual(advertenciasDeSonda(rota).length, 0, 'el selector no discrimina por clase');
});

// ── PWA · LA FUENTE AL VEREDICTO (firmado: entra, topada en U, nunca UV) ─────

test('la sonda escala a U, y NUNCA a UV', async () => {
  const { escalarPorSonda, CLASE_SONDA } = await import(HOOK);
  const con = { ok: true, advertencias: [{ clase: CLASE_SONDA, texto: 'x' }] };
  const sin = { ok: true, advertencias: [{ clase: 'descargo_base', texto: 'x' }] };
  assert.strictEqual(escalarPorSonda(con), 'U');
  assert.strictEqual(escalarPorSonda(sin), 'Q');
  assert.strictEqual(escalarPorSonda(null), 'Q');
  // El tope: una fuente que declara su propia posicion aproximada no cierra un
  // puerto. Fundamento ya escrito en la cabecera de cotejo-vertical.js.
  assert.notStrictEqual(escalarPorSonda(con), 'UV');
});

test('`ruta` ES parametro de calcularVeredicto, y la sonda compone el maximo', async () => {
  const { calcularVeredicto, CLASE_SONDA } = await import(HOOK);
  const ruta = { ok: true, advertencias: [{ clase: CLASE_SONDA, texto: 'x' }] };
  const r = calcularVeredicto({ portStatus: {}, weather: {}, navigation: {}, transitRestrictions: null, ruta });
  assert.strictEqual(r.veredicto, 'U', 'con todo lo demas en Q, la sonda sola tiene que subir a U');
  assert.strictEqual(r.detalles.sonda, 'U', 'la sonda tiene que verse en `detalles` como las otras seis fuentes');
});

test('sin sonda, el veredicto no se mueve — la fuente no inventa un ambar', async () => {
  const { calcularVeredicto } = await import(HOOK);
  const r = calcularVeredicto({ portStatus: {}, weather: {}, navigation: {}, transitRestrictions: null, ruta: { ok: true, advertencias: [] } });
  assert.strictEqual(r.veredicto, 'Q');
  assert.strictEqual(r.detalles.sonda, 'Q');
});
