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

// ─── LA DISCREPANCIA DECLARADA SOBRE UN CONTACTO QUE SI SE DA ───────────────
// Hasta el 2026-08-16 este modulo tenia dos estados para la coincidencia entre
// el mapa operativo y el decreto: o coincidia y el contacto se daba, o no
// coincidia y se declaraba `sin_contacto`. Con eso alcanzaba mientras la
// coincidencia fuera UNA.
//
// No lo es: son DOS NIVELES —Capitania y Gobernacion— y pueden caer distinto.
// El guard de :110 los colapsaba con un corto-circuito:
//
//     coincideGob = e.capitania == null && mismoNombre(e.gobernacion, ...)
//
// o sea que escrita la Capitania, la Gobernacion dejaba de mirarse. Medido en
// `_bitacoras/zonas_aviso_discrepancia_2026-08-16/01_medir_niveles.txt`: 11
// comparaciones, y UNA cae en esa sombra —`puerto_eden`/129, con la Capitania
// coincidiendo y la Gobernacion en desacuerdo con el decreto—. Su declaracion
// `sin_contacto` quedo MITAD FALSA y no habia forma de decir cual mitad.
//
// NO SE AGREGA UN CUARTO TIPO. El `tipo` dice QUE CONTACTO SE DA; la
// discrepancia es ORTOGONAL a eso y cruzarlas haria crecer el vocabulario por
// producto (nivel x tipo). Se agrega un campo declarativo, admisible en los
// tipos que si dan contacto, con UNA sola exigencia: el nivel declarado tiene
// que discrepar HOY contra la fuente.
//
// DE ESA UNICA EXIGENCIA CAE SOLA LA CONTRADICCION, y por eso no hay regla que
// la nombre (CLAUDE.md §4.3): declarar `nivel: 'capitania'` sobre la bahia de
// un contacto `tipo: 'capitania'` es imposible, porque la rama ya exigio
// coincidencia en ese nivel y la discrepancia exige lo contrario. Se detiene
// por la medicion, no por un caso particular en el codigo.
const NIVELES_DISCREPANCIA = new Set(['capitania', 'gobernacion']);

// ─── EL TERCER ESTADO ────────────────────────────────────────────────────────
// Hasta el 2026-08-15 las dos exigencias de este modulo colgaban del MISMO
// booleano: `participa_matching === false` decidia a la vez que una zona pueda
// existir (:196) y que sea obligatoria (:216). Con dos estados eso alcanzaba.
//
// Con TRES no alcanza, y falla en la peor direccion. Una jurisdiccion construida
// EN PARTE —geometria hasta su alcance declarado, y una porcion declarada sin
// cubrir— tiene `participa_matching: true`, porque tiene geometria y sacarla del
// matching perderia lo que si se construyo. Con el criterio viejo su zona pasaba
// a estar PROHIBIDA por :196 y a la vez dejaba de ser exigida por :216: los dos
// guards se rompian juntos y el hueco declarado se volvia invisible. Eso es la
// causa (a) de INV-3.6 implementada como silencio, que es exactamente lo que el
// invariante existe para impedir.
//
// Ahora la pregunta se le hace a `estado_geometria`, que tiene los tres valores,
// con mapeo EXHAUSTIVO y sin caso por defecto. NO SE AFLOJA NINGUN CONTROL
// (CLAUDE.md 0.3): las dos exigencias de antes siguen enteras en sus filas
// —'cerrable' prohibe, 'no_cerrable' obliga— y lo que se agrega es una tercera
// fila donde antes no habia nada.
//
//   cerrable          la geometria cubre la jurisdiccion entera -> NO lleva zona.
//   cerrable_parcial  se construyo y una parte declarada quedo sin cubrir ->
//                     lleva zona, y la zona declara LA PARTE NO CUBIERTA.
//   no_cerrable       no hay con que construirla -> lleva zona por la entera.
const ZONA_POR_ESTADO = {
  cerrable:         'prohibida',
  cerrable_parcial: 'obligatoria',
  no_cerrable:      'obligatoria',
};

// `estado_geometria` es el campo que gobierna. Se exige que ESTE: un insumo que
// no lo traiga no se resuelve mirando `participa_matching`, porque ese es
// justamente el desfase que este bloque vino a cerrar.
function estadoDe(jur) {
  const e = jur.estado_geometria;
  if (!ZONA_POR_ESTADO[e]) {
    throw new ErrorZonasAviso(
      `la jurisdiccion '${jur.id}' declara estado_geometria '${e}', que no esta en ` +
      `el mapeo (${Object.keys(ZONA_POR_ESTADO).join(', ')}). No hay caso por defecto: ` +
      `un estado nuevo decide si su carencia se le declara al patron o no, y eso no ` +
      `se adivina.`);
  }
  return e;
}

class ErrorZonasAviso extends Error {
  constructor(mensaje) {
    super(`[zonas_aviso] ${mensaje}`);
    this.name = 'ErrorZonasAviso';
  }
}

const exigir = (cond, mensaje) => { if (!cond) throw new ErrorZonasAviso(mensaje); };
const textoNoVacio = (v) => typeof v === 'string' && v.trim().length > 0;

// ─── Discrepancia declarada sobre un contacto que SI se da ──────────────────
/**
 * Valida y resuelve `contacto.discrepancias_declaradas`. Devuelve SIEMPRE un
 * arreglo —vacio cuando no hay— para que la forma del contacto resuelto no
 * dependa de si la zona declaro algo: un consumidor no puede "olvidarse" de un
 * campo que siempre esta.
 *
 * La forma resuelta es LA MISMA que la de `sin_contacto`. Dos formas para el
 * mismo concepto es la trampa de CLAUDE.md §2 —dos campos con rol parecido— y
 * este modulo no la va a estrenar.
 */
function resolverDiscrepanciasDeclaradas(zona, jur, contactos) {
  const d = zona.contacto.discrepancias_declaradas;
  if (d === null || d === undefined) return [];

  exigir(Array.isArray(d) && d.length > 0,
    `zona '${zona.jurisdiccion_id}': 'discrepancias_declaradas' esta presente pero no es un arreglo con al menos ` +
    `un elemento. Declarar el campo vacio no declara nada: o se escribe la discrepancia, o se omite el campo.`);

  return d.map(item => {
    exigir(item && typeof item === 'object',
      `zona '${zona.jurisdiccion_id}': cada discrepancia declarada es un objeto con 'bahia_id', 'nivel' y 'motivo'.`);
    exigir(Number.isInteger(item.bahia_id),
      `zona '${zona.jurisdiccion_id}': discrepancia declarada sin 'bahia_id' entero.`);
    exigir(NIVELES_DISCREPANCIA.has(item.nivel),
      `zona '${zona.jurisdiccion_id}': la discrepancia de la bahia ${item.bahia_id} declara nivel '${item.nivel}', ` +
      `que no esta en (${[...NIVELES_DISCREPANCIA].join(', ')}). No hay caso por defecto: el nivel decide contra ` +
      `que campo se comprueba, y adivinarlo comprobaria otra cosa.`);
    // El motivo se exige con la misma vara que `sin_contacto`: una discrepancia
    // sin motivo escrito es prosa que nadie puede adjudicar despues.
    exigir(textoNoVacio(item.motivo),
      `zona '${zona.jurisdiccion_id}': la discrepancia de la bahia ${item.bahia_id} en nivel '${item.nivel}' ` +
      `exige 'motivo' escrito.`);

    const e = contactos[String(item.bahia_id)];
    exigir(e,
      `zona '${zona.jurisdiccion_id}': la bahia ${item.bahia_id} declarada en discrepancia no existe en ` +
      `bahia-capitania-map.json.`);

    // LA EXIGENCIA. Es el espejo de la que ya tiene `sin_contacto` en :111, con
    // el signo puesto por `nivel` y SIN el corto-circuito que hacia invisible al
    // nivel Gobernacion. Si el mapa paso a coincidir en el nivel declarado, la
    // discrepancia dejo de existir y la declaracion tiene que retirarse: es la
    // misma reversibilidad que el encabezado promete para la zona entera.
    const delMapa    = item.nivel === 'capitania' ? e.capitania   : e.gobernacion;
    const delDecreto = item.nivel === 'capitania' ? jur.nombre    : jur.gobernacion;
    exigir(!mismoNombre(delMapa, delDecreto),
      `zona '${zona.jurisdiccion_id}': la bahia ${item.bahia_id} declara una discrepancia en nivel ` +
      `'${item.nivel}' que HOY NO EXISTE: el mapa dice '${delMapa}' y el decreto dice '${delDecreto}', y ` +
      `coinciden. Una discrepancia declarada que se resolvio deja de declararse: mantenerla escrita haria ` +
      `que el registro afirme un desacuerdo que ya no hay. (Si el nivel declarado es el mismo del que sale ` +
      `el contacto, esto es lo que lo detiene: esa rama ya exigio que coincidiera.)`);

    return {
      bahia_id: item.bahia_id,
      dice_el_mapa:    { capitania: e.capitania, gobernacion: e.gobernacion, telefono: e.telefono },
      dice_el_decreto: { capitania: jur.nombre, gobernacion: jur.gobernacion },
      nivel: item.nivel,
      motivo: item.motivo.trim(),
    };
  });
}

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
        // OJO: aca el nivel se INFIERE del dato; en `discrepancias_declaradas`
        // se DECLARA. La asimetria esta anotada como deuda en la bitacora del
        // 2026-08-16 y no se salda hoy: cambiar la forma de entrada de
        // `sin_contacto` toca cinco zonas que estan en verde.
        nivel: e.capitania == null ? 'gobernacion' : 'capitania',
        // El motivo vive a nivel de contacto en esta rama. Se copia a cada
        // entrada para que la forma resuelta sea IDENTICA a la de
        // `discrepancias_declaradas` y el consumidor vea una sola.
        motivo: c.motivo.trim(),
      };
    });
    return {
      tipo: 'sin_contacto', motivo: c.motivo.trim(), nombre: null, telefono: null,
      bahia_id: null, discrepancias,
    };
  }

  // Los dos tipos que SI dan contacto pueden traer discrepancias declaradas.
  // Se resuelven ANTES de armar el objeto para que una declaracion invalida
  // detenga la carga en vez de viajar al lado de un telefono correcto.
  const discrepancias = resolverDiscrepanciasDeclaradas(zona, jur, contactos);

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
      // `gobernacion` conserva lo que dice el MAPA, no lo que dice el decreto:
      // es el valor de la fuente y borrarlo esconderia la medicion. Cuando esa
      // Gobernacion es la que el decreto contradice, `discrepancias` lo dice al
      // lado, con `dice_el_decreto` adentro. La marca acompaña al valor; no lo
      // reemplaza ni lo tapa.
      gobernacion: entrada.gobernacion || null, bahia_id: c.bahia_id, motivo: null,
      discrepancias,
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
    discrepancias,
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
  //
  // ── CORREGIDA EL 2026-08-21: MIRABA LA MARCA, NO EL TELEFONO ────────────────
  // La version vieja era SOLO el `!includes('{telefono}')` de abajo: comprobaba
  // que no estuviera la MARCA DE PLANTILLA, no que no hubiera un telefono.
  // Contraejemplo corrido: «Confirme con la Capitania {nombre} al +56 61 220 1234
  // antes de zarpar» PASABA la guarda, y viola INV-10.1 en la cara. Y el espejo,
  // que prueba que el ancla estaba mal y no floja: «Este mensaje no lleva
  // {telefono}, por INV-10.1» la DETENIA. Rechazaba el texto correcto y aceptaba
  // el incorrecto, las dos por el mismo motivo.
  //
  // ES LA FORMA DE PROHIBICION DE LA REGLA DE LAS GUARDAS DE TEXTO, Y ES LA
  // PELIGROSA DE LAS DOS. En una guarda POSITIVA el literal caduca en ROJO y se
  // nota; en una de PROHIBICION caduca en VERDE y en silencio, que es lo que
  // pasaba aca. La regla entera, con sus dos mitades, esta en la cabecera de
  // scripts/publicar_cifra_spec2.js y en la fila
  // METODO::una-guarda-de-texto-comprueba-que-lo-mencione-no-que-lo-afirme.
  //
  // EL ANCLA NUEVA ES LA COSA PROHIBIDA Y NO SU ORTOGRAFIA: un telefono es una
  // corrida larga de digitos, se escriba como se escriba. UMBRAL 6, unidad:
  // DIGITO, contando a traves de espacios, parentesis y el signo mas, y NO a
  // traves del punto ni del guion — para no confundir una fecha (2026-08-21) ni
  // un numero de resolucion (12.100/47). Los dos margenes, MEDIDOS el 2026-08-21
  // sobre el propio bloque `mensaje` y sobre `contacto_generico`: la corrida
  // legitima mas larga que existe hoy tiene 2 digitos («Canal 16») y el telefono
  // chileno mas corto tiene 8. El umbral deja tres digitos de aire de cada lado.
  //
  // SE APLICA A LOS TRES CAMPOS DE `mensaje`, Y LA VIEJA MIRABA UNO. Es un
  // ensanche a proposito y se dice en vez de deslizarse: INV-10.1 habla de «un
  // mensaje del catalogo» y los tres lo son. Dejarlo en uno habria dejado una
  // guarda cuyo comentario afirma mas de lo que comprueba, que es este mismo
  // defecto otra vez, una linea mas abajo.
  const CORRIDA_DE_DIGITOS = /[0-9][0-9\s()+]*[0-9]/g;
  const DIGITOS_DE_TELEFONO = 6;
  const cuantosDigitos = c => (c.match(/[0-9]/g) || []).length;
  for (const campo of ['capa_1', 'capa_2_con_capitania', 'capa_2_sin_capitania']) {
    const larga = (msg[campo].match(CORRIDA_DE_DIGITOS) || [])
      .find(c => cuantosDigitos(c) >= DIGITOS_DE_TELEFONO);
    exigir(!larga,
      `"mensaje.${campo}" trae la corrida "${larga}" (${larga ? cuantosDigitos(larga) : 0} digitos, umbral ` +
      `${DIGITOS_DE_TELEFONO}), que tiene forma de telefono. INV-10.1 prohibe el telefono dentro de un mensaje ` +
      `del catalogo: el contacto se muestra en el punto de zarpe y recalada, no aca.`);
  }
  // La marca sigue prohibida aparte, y no es redundante: `{telefono}` no tiene
  // ningun digito, asi que la corrida de arriba no la ve. Son dos formas de
  // meter un telefono y hacen falta las dos.
  exigir(!msg.capa_2_con_capitania.includes('{telefono}'),
    `"mensaje.capa_2_con_capitania" lleva {telefono}, y INV-10.1 prohibe el telefono dentro de ` +
    `un mensaje del catalogo: el contacto se muestra en el punto de zarpe y recalada, no aca.`);
  exigir(!/\{[a-z_]+\}/.test(msg.capa_1) && !/\{[a-z_]+\}/.test(msg.capa_2_sin_capitania),
    'hay marcas de sustitucion en un texto que no las resuelve; saldrian literales a pantalla.');

  const porId = new Map();
  for (const j of insumo.jurisdicciones) porId.set(j.id, j);

  // Las que necesitan zona de aviso hoy. Es la lista contra la que se exige
  // correspondencia exacta en los dos sentidos.
  const conCarencia = insumo.jurisdicciones
    .filter(j => ZONA_POR_ESTADO[estadoDe(j)] === 'obligatoria')
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
    exigir(ZONA_POR_ESTADO[estadoDe(jur)] === 'obligatoria',
      `la jurisdiccion '${id}' esta 'cerrable': su geometria cubre la jurisdiccion ENTERA. ` +
      `Su zona de aviso perdio la carencia que la justificaba y debe retirarse de zonas_aviso.json. ` +
      `(Si lo que pasa es que se construyo solo en parte, el estado que corresponde es ` +
      `'cerrable_parcial' y la zona se queda, declarando la parte no cubierta.)`);
    exigir(textoNoVacio(jur.causa_sin_geometria),
      `la jurisdiccion '${id}' esta sin geometria pero no declara 'causa_sin_geometria' en el insumo. ` +
      `Un aviso sin causa escrita no se publica.`);

    const contacto = resolverContacto(zona, jur, contactos);
    const ambito   = validarAmbito(zona);

    // ─── CRITERIO DEL AGENTE, NO NORMA. Revocable, y con su condicion escrita.
    // Una zona cuyo contacto SE DA y ademas arrastra una discrepancia declarada
    // no puede reclamar un tramo de ruta.
    //
    // POR QUE: la marca de la discrepancia viaja en el contacto resuelto, pero
    // el consumidor no la carga. Medido el 2026-08-16 en
    // `cobertura-jurisdiccional.js:405`: de la zona reclamante se mapean tres
    // campos —`{nombre, telefono, tipo}`— y `discrepancias` se pierde ahi. Ese
    // archivo esta fuera de la zona de escritura de esta pieza, asi que lo unico
    // que se puede hacer desde aca es que el hueco NO SEA SILENCIOSO: el dia que
    // alguien le declare un ambito a una zona en esta condicion, la carga se
    // detiene con el motivo en vez de dejar caer la marca en el mapeo.
    //
    // CONDICION DE REVOCACION: se levanta el dia que el consumidor sepa cargar
    // la marca. No antes, y no por conveniencia de que una zona reclame.
    //
    // NO alcanza a `sin_contacto`: esa rama no entrega contacto —el consumidor
    // la filtra en :404 y deriva al generico—, asi que no hay marca que perder.
    // Las cinco zonas que hoy la usan conservan su derecho a declarar ambito.
    exigir(!(contacto.tipo !== 'sin_contacto' && contacto.discrepancias.length > 0 && ambito !== null),
      `la zona '${id}' declara un contacto de tipo '${contacto.tipo}' CON ${contacto.discrepancias.length} ` +
      `discrepancia(s) declarada(s) y ademas un ambito. Hoy el consumidor de una zona reclamante ` +
      `(cobertura-jurisdiccional.js) se queda con nombre, telefono y tipo: la marca de la discrepancia se ` +
      `pierde en ese mapeo y el valor que la encarna llegaria sin ella. Criterio del agente (2026-08-16), no ` +
      `norma: se levanta cuando el consumidor sepa cargar la marca.`);

    zonas.push({
      jurisdiccion_id: id,
      nombre: jur.nombre,
      gobernacion: jur.gobernacion,
      ambito_jurisdiccion: jur.ambito,
      // Viaja resuelto para que quien consuma la zona sepa si la carencia es de
      // la jurisdiccion ENTERA ('no_cerrable') o de una PARTE declarada de ella
      // ('cerrable_parcial'). Al patron se le dice lo mismo en los dos casos
      // (INV-3.6); la distincion es del registro interno.
      estado_geometria: estadoDe(jur),
      causa_sin_geometria: jur.causa_sin_geometria,
      contacto,
      ambito,
      motivo_sin_ambito: zona.ambito ? null : zona.motivo_sin_ambito.trim(),
    });
  }

  const faltantes = conCarencia.filter(id => !vistos.has(id));
  exigir(faltantes.length === 0,
    `hay jurisdicciones con carencia declarada y sin zona de aviso: ${faltantes.join(', ')}. ` +
    `Sin su declaracion, una ruta que las cruce volveria a callar (INV-3.6). ` +
    `Una 'cerrable_parcial' cuenta acá igual que una 'no_cerrable': su parte no cubierta ` +
    `produce el mismo silencio.`);

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
