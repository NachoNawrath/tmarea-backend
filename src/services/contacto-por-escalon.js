'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// contacto-por-escalon.js — resuelve la PRELACION de INV-10.1 sobre un contacto
// de bahia, y devuelve el escalon YA DECIDIDO.
//
// POR QUE EXISTE. Hasta hoy el backend emitia `capitania`, `gobernacion` y
// `telefono` sueltos, y cada consumidor decidia por su cuenta que rotular. El
// render de la tarjeta de zarpe y recalada elegia SIEMPRE `gobernacion`, asi que
// el numero de una Capitania salia bajo la etiqueta "Gobernación Marítima de".
// La prelacion es normativa —INV-10.1— y por eso se resuelve UNA vez, del lado
// del motor, y no una vez por consumidor.
//
// LA PRELACION, literal de INV-10.1:
//   1. Telefono de la Capitania, SI LA FUENTE LO TIENE PARA ESA CAPITANIA.
//   2. Si no, el de su Gobernacion, ROTULADO COMO GOBERNACION — nunca como
//      Capitania.
//   3. Si no hay ninguno de los dos, EL CAMPO NO SE MUESTRA. Sin texto de
//      reemplazo y sin mensaje sustituto.
//
// EL ESCALON 1 ES MAS DURO QUE "EL NUMERO ES DE ALGUNA CAPITANIA", y la
// diferencia no es teorica: medida el 2026-08-16 sobre las 164 entradas del
// mapa, 108 traen un numero que figura en el indice de Capitanias pero solo 99
// traen el de LA Capitania que la entrada nombra. Las otras 9 mandan al patron a
// otra reparticion, y por eso NO cumplen el escalon 1 y bajan al 2.
// Evidencia: `_bitacoras/rotulo_p3_2026-08-16/01_medir_precedencia.txt`.
//
// DE DONDE SALE LA VERDAD DEL ESCALON 1. De
// `data/contacto/reparticiones_publicadas.json`, el indice de lo que DIRECTEMAR
// publica por reparticion — el mismo insumo con el que se escribieron la Pieza A
// (`f3936b8`) y el lote Cisnes (`01bf543`). Este modulo es el primer archivo de
// `src/` que lo lee, o sea que con este commit el archivo pasa de derivado de
// generacion a INSUMO VIVO del motor. Ese ascenso esta declarado en la fila de
// CONTRATO_MOTOR.md §5 que entra con esta pieza; no ocurre de costado.
//
// LO QUE ESTE MODULO NO HACE, dicho para que nadie lo empiece a usar para eso:
//   · NO resuelve jurisdiccion. Quien tiene jurisdiccion lo fija el D.S. 991 via
//     `data/decreto/` (INV-3.3). Aca solo se decide A QUIEN SE LLAMA y COMO SE
//     LO ROTULA.
//   · NO consulta la tabla de Gobernaciones de `src/utils/capitanias.js`.
//     CONTRATO_MOTOR.md §5.1 declara que esa tabla NO ES FUENTE, y leerla en
//     tiempo de request la convertiria en una. El escalon 2 no la necesita: la
//     prelacion dice "el de su Gobernacion", y cual es su Gobernacion lo trae la
//     propia entrada.
//   · NO escribe ni corrige el mapa. Las 9 entradas que mandan a otra
//     reparticion son un defecto DE DATO y este modulo no puede arreglarlo: lo
//     unico que hace es no mentir sobre ellas.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const { normalizarTexto } = require('../utils/normalizarTexto');

const RUTA_INSUMO = path.join(__dirname, '..', '..', 'data', 'contacto', 'reparticiones_publicadas.json');

// Mismo criterio de atomicidad que ya usan `scripts/frente-contacto-pieza-a.js`,
// `scripts/frente-contacto-aplicar-lote.js` y el generador del propio insumo. No
// se define uno nuevo aca a proposito: dos criterios de atomicidad conviviendo
// es la clase de divergencia que este repositorio ya pago.
const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);

const soloDigitos = t => String(t == null ? '' : t).replace(/[^0-9]/g, '');

// ── el indice, construido una vez ────────────────────────────────────────────
// nombre publicado normalizado -> Set de telefonos en digitos.
//
// Una reparticion sin `nombre_publicado` NO entra al indice, y eso es un estado
// legitimo del dato declarado en el propio insumo (`conteos.sin_identificar`):
// son 2 de 64, y sin nombre publicado no hay contra que cotejar el que el mapa
// muestra. No se inventa una clave para ellas.
let _indice = null;
function indicePorNombre() {
  if (_indice) return _indice;

  const insumo = require(RUTA_INSUMO);
  const reparticiones = insumo && insumo.reparticiones;

  // §4.1 — falla ruidoso. Un insumo vacio o cambiado de forma dejaria a TODAS
  // las entradas cayendo al escalon 2, que es un resultado plausible y
  // silencioso: la pantalla se veria como se veia ayer y nadie se enteraria.
  if (!reparticiones || typeof reparticiones !== 'object' || Object.keys(reparticiones).length === 0) {
    throw new Error(
      `contacto-por-escalon: ${RUTA_INSUMO} no trae reparticiones. Sin ese indice el ` +
      `escalon 1 de INV-10.1 no se puede evaluar y todas las entradas caerian al escalon 2 ` +
      `en silencio. Se detiene en vez de degradar.`
    );
  }

  const idx = new Map();
  for (const rep of Object.values(reparticiones)) {
    if (!rep || !rep.nombre_publicado) continue;
    const clave = normalizarTexto(rep.nombre_publicado);
    if (!idx.has(clave)) idx.set(clave, new Set());
    // El insumo puede traer un valor con dos numeros ("… ó …"): se indexan los
    // dos. `telefono_atomico` decide como se RENDERIZA, no de quien ES.
    for (const trozo of String(rep.telefono == null ? '' : rep.telefono).split(/ó|\//)) {
      const d = soloDigitos(trozo);
      if (d.length >= 8) idx.get(clave).add(d);
    }
  }

  if (idx.size === 0) {
    throw new Error(
      `contacto-por-escalon: el indice quedo vacio pese a que ${RUTA_INSUMO} trae ` +
      `${Object.keys(reparticiones).length} reparticiones. Ninguna tiene nombre publicado, ` +
      `lo que contradice el propio insumo.`
    );
  }

  _indice = idx;
  return _indice;
}

/**
 * Resuelve el escalon de INV-10.1 para un contacto de bahia.
 *
 * @param {{capitania: ?string, gobernacion: ?string, telefono: ?string}|null} contacto
 *   La forma que devuelven `getCapitaniaByBahiaId` y `capitaniaDeBahia`.
 * @returns {{nivel: ?string, nombre: ?string, telefono: ?string,
 *            telefono_atomico: boolean, motivo: string}}
 *   `nivel` es 'capitania', 'gobernacion' o **null**. Null es el escalon 3 y
 *   significa EL CAMPO NO SE MUESTRA: quien lo consuma no debe sustituirlo por
 *   un texto de reemplazo, porque eso es exactamente lo que el escalon 3
 *   prohibe.
 *
 *   `motivo` dice POR QUE cayo en ese escalon. No es para el patron: es para que
 *   la razon quede en el dato y no haya que deducirla mirando el codigo (§4.2 —
 *   nada cae al caso general en silencio).
 */
function contactoPorEscalon(contacto) {
  const nada = (motivo) => ({ nivel: null, nombre: null, telefono: null, telefono_atomico: false, motivo });

  if (!contacto || typeof contacto !== 'object') return nada('sin_contacto_resuelto');

  const capitania   = contacto.capitania   == null ? null : String(contacto.capitania);
  const gobernacion = contacto.gobernacion == null ? null : String(contacto.gobernacion);
  const telefono    = contacto.telefono    == null ? null : String(contacto.telefono);

  // ── escalon 3 por falta de telefono ────────────────────────────────────────
  // INV-10.1 hace pivotar la prelacion sobre el TELEFONO: sus tres escalones
  // hablan de que numero se muestra. Sin numero no hay escalon 1 ni 2, y el
  // invariante resuelve la ausencia callando el campo, no llenandolo.
  if (telefono === null || telefono.trim() === '') return nada('sin_telefono');

  const atomico = esAtomico(telefono);
  let motivoBajada = null;

  // ── escalon 1 ──────────────────────────────────────────────────────────────
  if (capitania !== null && capitania.trim() !== '') {
    const tels = indicePorNombre().get(normalizarTexto(capitania));
    if (tels && tels.has(soloDigitos(telefono))) {
      return { nivel: 'capitania', nombre: capitania, telefono, telefono_atomico: atomico,
               motivo: 'el numero es el que la fuente publica para esta Capitania' };
    }
    // Las dos razones por las que el escalon 1 NO se cumple teniendo nombre de
    // Capitania se distinguen, porque no son el mismo problema y se arreglan en
    // frentes distintos: una es un rotulo que la fuente no conoce, la otra es un
    // numero que manda a otra reparticion.
    motivoBajada = tels
      ? 'el numero NO es el que la fuente publica para la Capitania nombrada'
      : 'la Capitania nombrada no tiene nombre publicado en el indice de reparticiones';
  }

  // ── escalon 2 ──────────────────────────────────────────────────────────────
  // No es un caso por defecto silencioso: es el segundo escalon que INV-10.1
  // nombra, y llega con el motivo de la bajada escrito. El nombre de la
  // Gobernacion lo trae la propia entrada; NO se consulta ninguna tabla.
  if (gobernacion !== null && gobernacion.trim() !== '') {
    return { nivel: 'gobernacion', nombre: gobernacion, telefono, telefono_atomico: atomico,
             motivo: capitania ? `escalon 2: ${motivoBajada}` : 'escalon 2: la entrada no nombra Capitania' };
  }

  // ── escalon 3 por no haber a quien rotular ─────────────────────────────────
  // Hay numero pero no hay nombre en ninguno de los dos niveles. Mostrarlo
  // exigiria inventar una etiqueta, y ninguna de las dos que existen seria
  // cierta.
  return nada('hay telefono pero la entrada no nombra ni Capitania ni Gobernacion');
}

// Solo para los instrumentos: permite re-leer el insumo despues de una mordida
// que lo haya tocado. El servicio no lo llama.
function _resetIndice() { _indice = null; delete require.cache[require.resolve(RUTA_INSUMO)]; }

module.exports = { contactoPorEscalon, _resetIndice, RUTA_INSUMO };
