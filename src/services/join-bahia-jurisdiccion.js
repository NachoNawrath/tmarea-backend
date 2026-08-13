'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// join-bahia-jurisdiccion.js — carga y VALIDA el join bahia -> jurisdiccion.
//
// CONTRATO_MOTOR.md INV-3.3: la unidad de jurisdiccion es la Capitania de
// Puerto y sus limites son los del D.S. 991. Este modulo es el unico punto por
// el que la atribucion entra al motor, y valida antes de entregarla.
//
// La validacion va ADENTRO de la carga, como en zonas-aviso.js y
// ambitos-publicados.js: no hay forma de consumir el join sin que se haya
// comprobado. Cualquier incoherencia LANZA con el motivo.
//
// LO QUE ESTE ARCHIVO NO ES: un directorio de contactos. El telefono y el
// nombre para mostrar siguen en src/data/bahia-capitania-map.json. Este dice
// QUIEN TIENE JURISDICCION; aquel dice A QUIEN SE LLAMA. E0.3 midio que
// mezclarlos dejaba 34 de 42 re-atribuciones mostrando el nombre de una
// Capitania con el telefono de otra.
//
// UNA BAHIA SIN RESOLVER ES UN ESTADO LEGITIMO DEL DATO (CLAUDE.md §4.2), y por
// eso se declara con `estado` explicito y con la fuente a consultar. Lo que NO
// es legitimo es que falte: una bahia del catalogo sin entrada detiene la carga.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');

const RUTA_JOIN   = path.join(__dirname, '..', '..', 'data', 'decreto', 'join_bahia_jurisdiccion.json');
const RUTA_INSUMO = path.join(__dirname, '..', '..', 'data', 'decreto', 'jurisdicciones_v2.json');
const RUTA_MAPA   = path.join(__dirname, '..', 'data', 'bahia-capitania-map.json');

const ESTADOS   = new Set(['resuelta', 'sin_resolver']);
const RESPALDOS = new Set(['decreto', 'operativo', 'declaracion_versionada']);

class ErrorJoin extends Error {
  constructor(mensaje) { super(`[join_bahia_jurisdiccion] ${mensaje}`); this.name = 'ErrorJoin'; }
}
const exigir = (cond, mensaje) => { if (!cond) throw new ErrorJoin(mensaje); };
const textoNoVacio = v => typeof v === 'string' && v.trim().length > 0;

/**
 * Valida el join contra sus dos fuentes y devuelve la atribucion resuelta.
 * Funcion pura sobre los tres objetos: la carga desde disco la envuelve y la
 * prueba de mordida la ejerce con variantes en memoria, sin copiar reglas.
 */
function validarJoin(join, insumo, catalogo) {
  exigir(join && Array.isArray(join.entradas), 'el archivo no trae un arreglo "entradas".');
  exigir(textoNoVacio(join.procedencia), 'el archivo no trae "procedencia".');

  const jurPorId = new Map(insumo.jurisdicciones.map(j => [j.id, j]));
  const idsCatalogo = new Set(Object.keys(catalogo).map(Number));

  const vistas = new Set();
  const resueltas = new Map();
  const sinResolver = [];

  for (const e of join.entradas) {
    const id = e.bahia_id;
    exigir(Number.isInteger(id), `hay una entrada con bahia_id no entero: ${JSON.stringify(id)}`);
    exigir(!vistas.has(id), `la bahia ${id} esta declarada mas de una vez.`);
    vistas.add(id);
    exigir(idsCatalogo.has(id),
      `la bahia ${id} no existe en bahia-capitania-map.json. El join no puede atribuir una bahia que el catalogo no tiene.`);
    exigir(ESTADOS.has(e.estado),
      `bahia ${id}: estado '${e.estado}' desconocido. Aceptados: ${[...ESTADOS].join(', ')}. No hay caso por defecto.`);

    if (e.estado === 'sin_resolver') {
      exigir(e.jurisdiccion_id === null,
        `bahia ${id}: esta 'sin_resolver' y trae jurisdiccion '${e.jurisdiccion_id}'. Las dos cosas no pueden ser ciertas.`);
      // Lo que el owner pidio que no volviera a pasar: una pendiente sin fuente.
      const f = e.fuente_a_consultar;
      exigir(f && textoNoVacio(f.id) && textoNoVacio(f.a_quien) && textoNoVacio(f.que_falta) && textoNoVacio(f.pregunta),
        `bahia ${id}: 'sin_resolver' exige 'fuente_a_consultar' con id, a_quien, que_falta y pregunta escritos. ` +
        `Una pendiente sin fuente identificada queda como verdad y no avisa.`);
      sinResolver.push({ bahia_id: id, nombre_sitport: e.nombre_sitport, fuente: f, candidatos: e.candidatos || null,
        declaracion_previa_en_el_repo: e.declaracion_previa_en_el_repo || null });
      continue;
    }

    exigir(RESPALDOS.has(e.respaldo),
      `bahia ${id}: respaldo '${e.respaldo}' desconocido. Aceptados: ${[...RESPALDOS].join(', ')}. No hay caso por defecto.`);
    exigir(textoNoVacio(e.criterio), `bahia ${id}: una atribucion resuelta exige 'criterio' escrito.`);
    exigir(textoNoVacio(e.evidencia),
      `bahia ${id}: una atribucion resuelta exige 'evidencia'. Sin ella no se puede saber de donde salio ni revisarla.`);

    const destinos = [e.jurisdiccion_id, ...(e.jurisdicciones_adicionales || [])];
    for (const d of destinos) {
      exigir(jurPorId.has(d),
        `bahia ${id}: la jurisdiccion '${d}' no existe en jurisdicciones_v2.json. El join quedo apuntando a una ` +
        `jurisdiccion que el insumo no tiene: o el insumo cambio, o la atribucion esta mal escrita.`);
    }
    // Un cuerpo que el decreto nombra en dos jurisdicciones no es un error: es
    // INV-3.4 (muestra de mas, nunca de menos). Pero exige evidencia de las dos.
    if (destinos.length > 1) {
      exigir(e.respaldo === 'decreto',
        `bahia ${id}: declara ${destinos.length} jurisdicciones con respaldo '${e.respaldo}'. Atribuirla a varias ` +
        `solo se sostiene si el decreto la nombra en varias.`);
    }
    resueltas.set(id, {
      bahia_id: id, nombre_sitport: e.nombre_sitport,
      jurisdiccion_id: e.jurisdiccion_id,
      jurisdicciones: destinos,
      respaldo: e.respaldo, criterio: e.criterio, evidencia: e.evidencia,
      respaldo_pendiente: e.respaldo_pendiente || null,
    });
  }

  // Correspondencia en el otro sentido: ninguna bahia del catalogo sin entrada.
  // Sin esto, agregar una bahia al catalogo la dejaria fuera del join en
  // silencio, que es el falso negativo que E0.1 encontro vivo con la 257.
  const faltantes = [...idsCatalogo].filter(id => !vistas.has(id)).sort((a, b) => a - b);
  exigir(faltantes.length === 0,
    `hay bahias del catalogo sin entrada en el join: ${faltantes.join(', ')}. Una bahia sin atribucion declarada ` +
    `vuelve a descartarse en silencio cuando el motor filtre por Capitania (INV-3.6).`);

  return {
    version: join.version,
    conteo: {
      total: vistas.size,
      resueltas: resueltas.size,
      sin_resolver: sinResolver.length,
      por_respaldo: [...resueltas.values()].reduce((a, r) => { a[r.respaldo] = (a[r.respaldo] || 0) + 1; return a; }, {}),
    },
    resueltas,
    sin_resolver: sinResolver,
    /** id de bahia -> id de jurisdiccion, o null si no esta resuelta. Sin caso por defecto. */
    jurisdiccionDe(bahiaId) {
      const r = resueltas.get(Number(bahiaId));
      return r ? r.jurisdiccion_id : null;
    },
    /**
     * El sentido inverso: que bahias cuelgan de estas jurisdicciones. Lo usa el
     * ensanche de E3 para pasar de la jurisdiccion que la ruta intersecta a las
     * bahias bajo cuyo nombre SITPORT publica.
     *
     * Mira `jurisdicciones` —el destino principal MAS los adicionales— y no
     * solo `jurisdiccion_id`: una bahia que el decreto nombra en dos
     * jurisdicciones entra por cualquiera de las dos. Es INV-3.4 aplicado al
     * reves, muestra de mas y nunca de menos.
     *
     * Una jurisdiccion sin ninguna bahia devuelve vacio y eso es legitimo: 29
     * de las 64 no tienen ninguna atribuida (E0.3), y 27 de esas 29 son
     * jurisdicciones a las que SITPORT no le cuelga nada. Vacio significa "no
     * hay bahia que agregar", nunca "no se encontro".
     */
    bahiasDeJurisdicciones(jurisdiccionIds) {
      const buscadas = new Set(jurisdiccionIds);
      const salida = new Set();
      for (const r of resueltas.values()) {
        if (r.jurisdicciones.some(j => buscadas.has(j))) salida.add(r.bahia_id);
      }
      return salida;
    },
  };
}

let _cache = null;

function cargarJoin({ recargar = false } = {}) {
  if (_cache && !recargar) return _cache;
  if (recargar) for (const r of [RUTA_JOIN, RUTA_INSUMO, RUTA_MAPA]) delete require.cache[require.resolve(r)];
  _cache = validarJoin(require(RUTA_JOIN), require(RUTA_INSUMO), require(RUTA_MAPA));
  return _cache;
}

module.exports = { cargarJoin, validarJoin, ErrorJoin };
