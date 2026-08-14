'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// zonas-aviso.js — carga y VALIDA la declaracion de zonas de aviso.
//
// CONTRATO_MOTOR.md INV-3.6: una jurisdiccion sin geometria se declara, nunca se
// resuelve en silencio. Este modulo es el unico punto por el que esa declaracion
// entra al motor, y valida antes de entregarla.
//
// La validacion va ADENTRO de la carga, no en un script aparte: no hay forma de
// consumir la declaracion sin que se haya comprobado. Cualquier incoherencia
// LANZA con el motivo; nada se degrada en silencio y no hay caso por defecto.
//
// Reversibilidad: una zona solo puede existir mientras su jurisdiccion siga
// declarada sin geometria en el insumo. Cuando deje de estarlo, esta carga se
// detiene y obliga a retirar la zona. El aviso no puede sobrevivir a su causa.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const { mismoNombre } = require('../utils/coincidencia-nombres');

const RUTA_DECLARACION  = path.join(__dirname, '..', '..', 'data', 'decreto', 'zonas_aviso.json');
const RUTA_INSUMO       = path.join(__dirname, '..', '..', 'data', 'decreto', 'jurisdicciones_v2.json');
const RUTA_CONTACTOS    = path.join(__dirname, '..', 'data', 'bahia-capitania-map.json');

// Tipos aceptados. Cualquier otro valor detiene la carga: sin caso por defecto,
// para que agregar un tipo obligue a escribir su validacion y su resolucion.
const TIPOS_CONTACTO = new Set(['capitania', 'gobernacion', 'sin_contacto']);
const TIPOS_AMBITO   = new Set(['banda_latitud']);

class ErrorZonasAviso extends Error {
  constructor(mensaje) {
    super(`[zonas_aviso] ${mensaje}`);
    this.name = 'ErrorZonasAviso';
  }
}

const exigir = (cond, mensaje) => { if (!cond) throw new ErrorZonasAviso(mensaje); };
const textoNoVacio = (v) => typeof v === 'string' && v.trim().length > 0;

// ─── Resolucion del contacto ────────────────────────────────────────────────
// Cada tipo declara que tiene que cumplirse en la fuente para poder usarlo. La
// coincidencia se comprueba SIEMPRE: si el mapa operativo dejo de coincidir con
// el decreto, la carga se detiene en vez de servir el telefono equivocado.
function resolverContacto(zona, jur, contactos) {
  const c = zona.contacto;
  exigir(c && typeof c === 'object', `zona '${zona.jurisdiccion_id}': falta el objeto 'contacto'.`);
  exigir(TIPOS_CONTACTO.has(c.tipo),
    `zona '${zona.jurisdiccion_id}': tipo de contacto '${c.tipo}' desconocido. ` +
    `Aceptados: ${[...TIPOS_CONTACTO].join(', ')}. No hay caso por defecto.`);

  if (c.tipo === 'sin_contacto') {
    exigir(textoNoVacio(c.motivo),
      `zona '${zona.jurisdiccion_id}': un contacto 'sin_contacto' exige 'motivo' escrito.`);
    // El motivo no basta: la discrepancia que invoca tiene que ser comprobable
    // contra la fuente. Si el mapa hoy coincidiera con el decreto, este
    // 'sin_contacto' estaria escondiendo un contacto que si se puede dar.
    exigir(Array.isArray(c.bahias_en_discrepancia) && c.bahias_en_discrepancia.length > 0,
      `zona '${zona.jurisdiccion_id}': 'sin_contacto' exige 'bahias_en_discrepancia' con al menos una bahia. ` +
      `Es lo que hace comprobable el motivo en vez de dejarlo en prosa.`);
    const discrepancias = c.bahias_en_discrepancia.map(id => {
      exigir(Number.isInteger(id), `zona '${zona.jurisdiccion_id}': bahia en discrepancia no entera: ${id}`);
      const e = contactos[String(id)];
      exigir(e, `zona '${zona.jurisdiccion_id}': la bahia ${id} no existe en bahia-capitania-map.json.`);
      const coincideCap = mismoNombre(e.capitania, jur.nombre);
      const coincideGob = e.capitania == null && mismoNombre(e.gobernacion, jur.gobernacion);
      exigir(!coincideCap && !coincideGob,
        `zona '${zona.jurisdiccion_id}': la bahia ${id} SI coincide hoy con el decreto ` +
        `(mapa: capitania='${e.capitania}', gobernacion='${e.gobernacion}'). La discrepancia que declara el ` +
        `motivo ya no existe: hay contacto que se puede dar y este 'sin_contacto' lo estaria escondiendo.`);
      return {
        bahia_id: id,
        dice_el_mapa: { capitania: e.capitania, gobernacion: e.gobernacion, telefono: e.telefono },
        dice_el_decreto: { capitania: jur.nombre, gobernacion: jur.gobernacion },
        // Que nivel es el que discrepa, para poder trabajarlas una por una.
        nivel: e.capitania == null ? 'gobernacion' : 'capitania',
      };
    });
    return {
      tipo: 'sin_contacto', motivo: c.motivo.trim(), nombre: null, telefono: null,
      bahia_id: null, discrepancias,
    };
  }

  exigir(Number.isInteger(c.bahia_id),
    `zona '${zona.jurisdiccion_id}': contacto '${c.tipo}' exige 'bahia_id' entero.`);
  const entrada = contactos[String(c.bahia_id)];
  exigir(entrada,
    `zona '${zona.jurisdiccion_id}': la bahia ${c.bahia_id} no existe en bahia-capitania-map.json.`);
  exigir(textoNoVacio(entrada.telefono),
    `zona '${zona.jurisdiccion_id}': la bahia ${c.bahia_id} no trae telefono; no sirve como contacto.`);

  if (c.tipo === 'capitania') {
    exigir(mismoNombre(entrada.capitania, jur.nombre),
      `zona '${zona.jurisdiccion_id}': la bahia ${c.bahia_id} esta atribuida a la Capitania ` +
      `'${entrada.capitania}', que no es '${jur.nombre}'. Usar ese contacto seria dejar que el mapa ` +
      `operativo revoque al decreto (INV-3.3). Declarar 'sin_contacto' con su motivo, o corregir la fuente.`);
    return {
      tipo: 'capitania', nombre: entrada.capitania, telefono: entrada.telefono,
      gobernacion: entrada.gobernacion || null, bahia_id: c.bahia_id, motivo: null,
    };
  }

  // tipo === 'gobernacion'
  exigir(entrada.capitania == null,
    `zona '${zona.jurisdiccion_id}': la bahia ${c.bahia_id} SI tiene Capitania atribuida ` +
    `('${entrada.capitania}'). Derivar a la Gobernacion solo se declara cuando la fuente no atribuye Capitania.`);
  exigir(mismoNombre(entrada.gobernacion, jur.gobernacion),
    `zona '${zona.jurisdiccion_id}': la bahia ${c.bahia_id} esta en la Gobernacion ` +
    `'${entrada.gobernacion}' y el decreto pone la jurisdiccion en '${jur.gobernacion}'. ` +
    `Las dos fuentes no coinciden: no se declara contacto hasta adjudicar cual manda.`);
  return {
    tipo: 'gobernacion', nombre: entrada.gobernacion, telefono: entrada.telefono,
    gobernacion: entrada.gobernacion, bahia_id: c.bahia_id, motivo: null,
  };
}

// ─── Validacion del ambito ──────────────────────────────────────────────────
// El ambito es lo unico que permite a una zona reclamar un tramo de ruta. Puede
// no existir: entonces la zona queda registrada pero no reclama nada, y el
// motivo de esa ausencia es obligatorio.
function validarAmbito(zona) {
  const a = zona.ambito;
  if (a === null || a === undefined) {
    exigir(textoNoVacio(zona.motivo_sin_ambito),
      `zona '${zona.jurisdiccion_id}': sin ambito declarado exige 'motivo_sin_ambito' escrito.`);
    return null;
  }
  exigir(TIPOS_AMBITO.has(a.tipo),
    `zona '${zona.jurisdiccion_id}': tipo de ambito '${a.tipo}' desconocido. ` +
    `Aceptados: ${[...TIPOS_AMBITO].join(', ')}. No hay caso por defecto.`);

  // banda_latitud
  exigir(Number.isFinite(a.lat_norte) && Number.isFinite(a.lat_sur),
    `zona '${zona.jurisdiccion_id}': banda_latitud exige 'lat_norte' y 'lat_sur' numericos.`);
  exigir(a.lat_norte > a.lat_sur,
    `zona '${zona.jurisdiccion_id}': banda_latitud con lat_norte (${a.lat_norte}) no mayor que ` +
    `lat_sur (${a.lat_sur}). En el hemisferio sur el borde norte es el menos negativo.`);
  exigir(textoNoVacio(a.procedencia),
    `zona '${zona.jurisdiccion_id}': banda_latitud exige 'procedencia' — de donde salen esos paralelos.`);
  return { tipo: 'banda_latitud', lat_norte: a.lat_norte, lat_sur: a.lat_sur, procedencia: a.procedencia };
}

/**
 * Valida la declaracion contra sus dos fuentes y devuelve las zonas resueltas.
 * Es una funcion pura sobre los tres objetos: la carga desde disco la envuelve,
 * y la prueba de mordida la ejerce con variantes en memoria. Una sola
 * implementacion de la validacion, sin copia de reglas en el test.
 */
function validarDeclaracion(decl, insumo, contactos) {
  exigir(decl && Array.isArray(decl.zonas), 'la declaracion no trae un arreglo "zonas".');
  exigir(decl.contacto_generico && textoNoVacio(decl.contacto_generico.texto),
    'la declaracion no trae "contacto_generico.texto", que es a donde deriva un aviso sin Capitania nombrada.');

  // El texto que ve el patron se transcribe del §10, no se redacta en el codigo.
  // Aca se exige que este completo y que las marcas de sustitucion que el mensaje
  // SI usa esten, y que la que el contrato PROHIBE no este.
  const msg = decl.mensaje;
  exigir(msg && textoNoVacio(msg.procedencia),
    'la declaracion no trae "mensaje.procedencia" — de que fila del catalogo §10 se transcribio el texto.');
  for (const campo of ['capa_1', 'capa_2_con_capitania', 'capa_2_sin_capitania']) {
    exigir(textoNoVacio(msg[campo]), `la declaracion no trae "mensaje.${campo}".`);
  }
  exigir(msg.capa_2_con_capitania.includes('{nombre}'),
    `"mensaje.capa_2_con_capitania" no incluye la marca {nombre}: saldria a pantalla sin ese dato.`);
  // INV-10.1 (contrato v1.8, `d9f7f9e`): el contacto vive en el punto de zarpe y
  // recalada, y los mensajes del catalogo NO llevan telefono. Hasta la v1.7 este
  // guard exigia {telefono} y era correcto; con el invariante escrito, exigirlo
  // IMPIDE cumplir el contrato — medido: el dato corregido abortaba aca. Se
  // INVIERTE, no se quita: el mismo campo sigue vigilado, cambia el signo.
  exigir(!msg.capa_2_con_capitania.includes('{telefono}'),
    `"mensaje.capa_2_con_capitania" lleva {telefono}, y INV-10.1 prohibe el telefono dentro de ` +
    `un mensaje del catalogo: el contacto se muestra en el punto de zarpe y recalada, no aca.`);
  exigir(!/\{[a-z_]+\}/.test(msg.capa_1) && !/\{[a-z_]+\}/.test(msg.capa_2_sin_capitania),
    'hay marcas de sustitucion en un texto que no las resuelve; saldrian literales a pantalla.');

  const porId = new Map();
  for (const j of insumo.jurisdicciones) porId.set(j.id, j);

  // Las que el insumo declara sin geometria hoy. Es la lista contra la que se
  // exige correspondencia exacta en los dos sentidos.
  const sinGeometria = insumo.jurisdicciones
    .filter(j => j.participa_matching === false)
    .map(j => j.id);

  const vistos = new Set();
  const zonas = [];

  for (const zona of decl.zonas) {
    const id = zona.jurisdiccion_id;
    exigir(textoNoVacio(id), 'hay una zona sin "jurisdiccion_id".');
    exigir(!vistos.has(id), `la jurisdiccion '${id}' esta declarada mas de una vez.`);
    vistos.add(id);

    const jur = porId.get(id);
    exigir(jur, `la zona '${id}' no corresponde a ninguna jurisdiccion del insumo.`);
    exigir(jur.participa_matching === false,
      `la jurisdiccion '${id}' YA participa del matching: tiene geometria construible. ` +
      `Su zona de aviso perdio la carencia que la justificaba y debe retirarse de zonas_aviso.json.`);
    exigir(textoNoVacio(jur.causa_sin_geometria),
      `la jurisdiccion '${id}' esta sin geometria pero no declara 'causa_sin_geometria' en el insumo. ` +
      `Un aviso sin causa escrita no se publica.`);

    zonas.push({
      jurisdiccion_id: id,
      nombre: jur.nombre,
      gobernacion: jur.gobernacion,
      ambito_jurisdiccion: jur.ambito,
      causa_sin_geometria: jur.causa_sin_geometria,
      contacto: resolverContacto(zona, jur, contactos),
      ambito: validarAmbito(zona),
      motivo_sin_ambito: zona.ambito ? null : zona.motivo_sin_ambito.trim(),
    });
  }

  const faltantes = sinGeometria.filter(id => !vistos.has(id));
  exigir(faltantes.length === 0,
    `hay jurisdicciones sin geometria que no tienen zona de aviso declarada: ${faltantes.join(', ')}. ` +
    `Sin su declaracion, una ruta que las cruce volveria a callar (INV-3.6).`);

  return {
    version: decl.version,
    contacto_generico: decl.contacto_generico,
    mensaje: decl.mensaje,
    zonas,
    // Solo las que pueden reclamar un tramo de ruta. Hoy puede ser vacio: una
    // zona sin ambito se registra y deriva al contacto generico, no reclama.
    zonas_con_ambito: zonas.filter(z => z.ambito !== null),
  };
}

let _cache = null;

/**
 * Carga la declaracion desde disco, la valida y devuelve las zonas resueltas.
 * Lanza ErrorZonasAviso ante cualquier incoherencia.
 */
function cargarZonasAviso({ recargar = false } = {}) {
  if (_cache && !recargar) return _cache;
  if (recargar) {
    for (const r of [RUTA_DECLARACION, RUTA_INSUMO, RUTA_CONTACTOS]) delete require.cache[require.resolve(r)];
  }
  _cache = validarDeclaracion(
    require(RUTA_DECLARACION),
    require(RUTA_INSUMO),
    require(RUTA_CONTACTOS)
  );
  return _cache;
}

module.exports = { cargarZonasAviso, validarDeclaracion, ErrorZonasAviso };
