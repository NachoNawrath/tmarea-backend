'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// andamio-medicion.js — el andamio de E1, y los dos guards que lo sostienen.
//
// QUÉ ES UN ANDAMIO: una capa que sirve para MEDIR y que no puede llegar a
// producción. `jurisdicciones_decreto` es la única capa por Capitanía que existe
// hoy, y con ella se puede medir el cambio de unidad (E2) sin esperar a que
// cierre C3. Pero su método produce traslapes y salió de un insumo viejo: si el
// motor la consultara, respondería mal y sin avisar.
//
// CÓMO SE DEFINE "CONTEXTO DE MEDICIÓN" — camino B, aprobado por el owner el
// 2026-08-11. NO por una variable de entorno: una variable se queda puesta en un
// shell y viaja a una corrida que no es de medición, y falla en silencio. Acá el
// contexto no se DECLARA, se DEMUESTRA: el nombre de la capa sólo se obtiene
// llamando a `capaDeMedicion()`, que un proceso de producción no tiene cableada.
// Y si alguien la cablea, el guard de arranque lo caza. Es el mismo espíritu de
// la guarda de E0.3: la condición se deduce de lo que el proceso ES, no de lo
// que alguien se acuerde de declarar.
//
// LOS DOS GUARDS, Y POR QUÉ NO PUEDEN DIVERGIR — camino 2, aprobado el mismo
// día. El texto del comentario de la base vive en `capa_consultada.json`; el
// script de aplicación lo escribe y `verificarComentarioEnLaBase()` comprueba
// que la base dice exactamente eso. Antes eran dos textos que alguien tenía que
// acordarse de sincronizar, y el de la base decía "NO CONSULTAR" sin condición,
// contradiciendo al del repositorio.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');

const RUTA_CAPA = path.join(__dirname, '..', '..', 'data', 'decreto', 'capa_consultada.json');

class ErrorAndamio extends Error {
  constructor(mensaje) { super(`[andamio] ${mensaje}`); this.name = 'ErrorAndamio'; }
}
const exigir = (cond, mensaje) => { if (!cond) throw new ErrorAndamio(mensaje); };
const textoNoVacio = v => typeof v === 'string' && v.trim().length > 0;

/**
 * Valida el bloque `andamio`. Función pura sobre la declaración, para que la
 * prueba de mordida la ejerza con variantes en memoria sin copiar reglas.
 */
function validarDeclaracion(decl) {
  exigir(decl && typeof decl === 'object', 'la declaración de capa no es un objeto.');
  const a = decl.andamio;
  exigir(a && typeof a === 'object',
    'capa_consultada.json no trae el bloque "andamio". Sin él no hay andamio declarado y no se puede medir ' +
    'el cambio de unidad sobre ninguna capa: E1 existe para que ese permiso sea explícito.');
  exigir(textoNoVacio(a.capa), 'el bloque "andamio" no nombra la capa.');
  exigir(/^[a-z_][a-z0-9_]*$/i.test(a.capa), `el nombre de capa '${a.capa}' no es un identificador válido.`);
  exigir(a.es_andamio === true,
    `el bloque "andamio" no declara es_andamio === true (vale ${JSON.stringify(a.es_andamio)}). ` +
    `Una capa que no se declara andamio no puede usarse como andamio: sin esa marca no hay nada que impida promoverla.`);
  exigir(textoNoVacio(a.para_que), 'el bloque "andamio" exige "para_que": para qué se puede usar.');
  exigir(Array.isArray(a.no_se_promueve_porque) && a.no_se_promueve_porque.length > 0,
    'el bloque "andamio" exige "no_se_promueve_porque" con al menos un motivo escrito. Un andamio sin motivos ' +
    'medidos para no promoverse es una capa a la que sólo le falta que alguien se anime.');
  exigir(textoNoVacio(a.comentario_en_la_base),
    'el bloque "andamio" exige "comentario_en_la_base": es el texto que el guard de la base tiene que decir. ' +
    'Sin él los dos guards vuelven a ser dos textos que alguien tiene que acordarse de sincronizar.');

  // EL GUARD CENTRAL. La capa que el motor consulta no puede ser el andamio.
  exigir(decl.capa_jurisdicciones !== a.capa,
    `la capa declarada para el motor ("capa_jurisdicciones") es '${decl.capa_jurisdicciones}', que es la MISMA ` +
    `que el bloque "andamio" marca como andamio de medición. Esa capa no puede responderle al patrón: ` +
    `${a.no_se_promueve_porque.join(' · ')}`);
  return a;
}

function cargar() {
  delete require.cache[require.resolve(RUTA_CAPA)];
  const decl = require(RUTA_CAPA);
  return { decl, andamio: validarDeclaracion(decl) };
}

/**
 * El guard de arranque. BLOQUEANTE a propósito, y por eso separado del hook de
 * E0.1, que es informativo y declara "no bloquea ni demora el arranque": ahí una
 * fuente externa caída no puede tumbar el servicio, y acá el servicio no puede
 * arrancar respondiendo con una capa que no debe responder.
 */
function verificarEnArranque({ log = console } = {}) {
  const { andamio } = cargar();
  log.log(`[andamio] OK: '${andamio.capa}' declarada como andamio de medición; el motor consulta otra capa.`);
  return andamio;
}

/**
 * La ÚNICA forma de obtener el nombre de la capa de andamio. Que exista esta
 * función y que un script la llame ES el contexto de medición: no hay flag que
 * quede puesta ni entorno que viaje.
 */
function capaDeMedicion() {
  return cargar().andamio.capa;
}

/**
 * El segundo guard: lo que la base dice tiene que ser lo que el repositorio
 * declara, literal. Si alguien edita el COMMENT ON a mano, esto se detiene.
 */
async function verificarComentarioEnLaBase(pool) {
  const { andamio } = cargar();
  const { rows } = await pool.query(
    `SELECT obj_description(c.oid) AS comentario
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = $1`, [andamio.capa]);
  exigir(rows.length === 1,
    `la capa '${andamio.capa}' no existe en el esquema public. El andamio está declarado sobre una capa que no está.`);
  const enLaBase = rows[0].comentario;
  exigir(textoNoVacio(enLaBase),
    `la capa '${andamio.capa}' no tiene comentario en la base. Quien la abra sin el repositorio al lado no tiene ` +
    `cómo saber que es un andamio. Correr scripts/e1_aplicar_andamio.js.`);
  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  exigir(norm(enLaBase) === norm(andamio.comentario_en_la_base),
    `el comentario de '${andamio.capa}' en la base NO es el que declara capa_consultada.json. Los dos guards ` +
    `dejaron de decir lo mismo, que es exactamente lo que E1 vino a impedir.\n` +
    `  en la base : ${norm(enLaBase).slice(0, 160)}...\n` +
    `  declarado  : ${norm(andamio.comentario_en_la_base).slice(0, 160)}...\n` +
    `  Si el cambio es querido, se edita capa_consultada.json y se corre scripts/e1_aplicar_andamio.js; ` +
    `nunca al revés.`);
  return { capa: andamio.capa, coincide: true };
}

module.exports = {
  validarDeclaracion, verificarEnArranque, capaDeMedicion, verificarComentarioEnLaBase, ErrorAndamio,
};
