'use strict';
// ---------------------------------------------------------------------------
// anclas-declaradas.js - (a1)-T, punto (i) de la deuda en PLAN_JURISDICCION.md
//
// La FUNCION DE VEREDICTO del control del ancla. Es pura: recibe las filas ya
// leidas y la declaracion ya parseada, y devuelve un informe. No abre la base,
// no lee ficheros y no imprime.
//
// Esa pureza no es elegancia: es LA RAZON DE QUE LA MORDIDA PUEDA CORRER SIN
// BASE. scripts/prueba_mordida_ancla.js le inyecta filas rotas y comprueba que
// se pone roja en cada familia. Un control que solo se puede ejercitar contra
// la base de verdad no se puede probar sin romper la base de verdad. Mismo
// reparto que src/services/catalogo-bahias.js con el control de drift.
//
// QUE VIGILA: solo las filas que la declaracion nombra. Las demas se MIDEN
// (control negativo) y no se exigen -- ver _que_NO_vigila en
// data/catalogo/anclas_declaradas.json.
//
// QUE NO HACE, y va dicho: NO CORRIGE. Un UPDATE automatico sobre la base sin
// autorizacion esta fuera de alcance, y ademas borraria la evidencia de cuando
// paso, que es el unico rastro que llevaria a H-2.
// ---------------------------------------------------------------------------

class ErrorAnclasDeclaradas extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorAnclasDeclaradas'; }
}

// Vocabulario PROPIO. No se reusa el del control de drift (0/1/2/3 de
// e01_control_drift_catalogo.js): aquel habla de divergencia del catalogo de
// bahias contra SITPORT, y un ancla repuesta no es eso. Compartir codigos
// entre dos preguntas distintas enturbia las dos.
const CODIGO_SALIDA = {
  SIN_NOVEDAD: 0,
  ESTADO_DECLARADO_ROTO: 1,
  NO_SE_PUDO_MEDIR: 2,
  DECLARACION_NO_CALZA: 3,
};

// PRECEDENCIA, declarada porque hace falta y no es obvia:
//   DECLARACION_NO_CALZA > NO_SE_PUDO_MEDIR > ESTADO_DECLARADO_ROTO > SIN_NOVEDAD
// Si el declarativo no calza con la tabla, la lectura de todo lo demas es
// dudosa y ese es el codigo. El informe lista TODAS las clases igual: el codigo
// de salida es un canal grueso y no se le pide que lleve el detalle.
const PRECEDENCIA = ['DECLARACION_NO_CALZA', 'NO_SE_PUDO_MEDIR', 'ESTADO_DECLARADO_ROTO', 'SIN_NOVEDAD'];

// Las tres combinaciones del defecto NO son la misma noticia, aunque comparten
// codigo de salida porque la accion de quien lee es la misma -- alguien
// intervino el geom, hay que averiguar quien y restituir. La combinacion va en
// el informe porque ahi si cabe el detalle, y porque una fila puede traer los
// dos sintomas a la vez y un codigo de salida tendria que elegir uno.
const CLASES = {
  ancla_repuesta_con_coordenada_intacta:
    'el ancla volvio SIN que la posicion se moviera. El trigger no lo explica solo: es la huella de la via desconocida de H-2',
  coordenada_movida_con_ancla_intacta:
    'el geom se movio y el trigger no encontro poligono. Fue 9 de 11 en la corrida de (a1): es la forma MAS FRECUENTE del defecto',
  ancla_repuesta_y_coordenada_movida:
    'el geom se movio y el trigger si encontro poligono. Fue 2 de 11 en la corrida de (a1)',
  fila_ausente:
    'la declaracion nombra un nodo_id que la tabla no trae',
  identidad_distinta:
    'el nodo_id existe pero nombre, fuente o fuente_id no son los declarados: el id ya no apunta al mismo nodo',
};
const CLASES_DE_PREMISA = new Set(['fila_ausente', 'identidad_distinta']);

const CAMPOS_DECLARACION = ['nodo_id', 'nombre', 'fuente', 'fuente_id', 'lat', 'lng'];
const CAMPOS_FILA = ['id', 'nombre', 'fuente', 'fuente_id', 'lat', 'lng', 'bahia_sitport_id'];

// La declaracion se valida entera antes de mirar una sola fila. Un declarativo
// vacio, o sin tolerancia, o con un nodo_id repetido, no puede terminar en
// verde por no tener nada que comparar: ese es exactamente el modo de falla
// que este control existe para no tener.
function validarDeclaracion(declaracion) {
  if (!declaracion || typeof declaracion !== 'object' || Array.isArray(declaracion)) {
    throw new ErrorAnclasDeclaradas('la declaracion no es un objeto');
  }
  const { tolerancia_grados: tol, filas } = declaracion;
  if (typeof tol !== 'number' || !Number.isFinite(tol) || tol <= 0) {
    throw new ErrorAnclasDeclaradas('la declaracion no trae una tolerancia_grados positiva y finita: ' + JSON.stringify(tol));
  }
  if (!Array.isArray(filas)) {
    throw new ErrorAnclasDeclaradas('la declaracion no trae un arreglo filas');
  }
  if (filas.length === 0) {
    throw new ErrorAnclasDeclaradas(
      'la declaracion no nombra ningun nodo. Un control que exige NULL y no tiene a quien exigirselo sale verde ' +
      'sin haber mirado nada, y eso es peor que no correrlo.');
  }
  const vistos = new Set();
  for (const f of filas) {
    if (!f || typeof f !== 'object') throw new ErrorAnclasDeclaradas('la declaracion trae una fila que no es un objeto');
    for (const campo of CAMPOS_DECLARACION) {
      if (f[campo] === undefined || f[campo] === null) {
        throw new ErrorAnclasDeclaradas('la fila declarada ' + JSON.stringify(f.nodo_id) + ' no trae ' + campo);
      }
    }
    if (!Number.isInteger(f.nodo_id)) {
      throw new ErrorAnclasDeclaradas('nodo_id no es entero: ' + JSON.stringify(f.nodo_id));
    }
    if (typeof f.lat !== 'number' || typeof f.lng !== 'number' || !Number.isFinite(f.lat) || !Number.isFinite(f.lng)) {
      throw new ErrorAnclasDeclaradas('la fila declarada ' + f.nodo_id + ' no trae lat/lng numericos');
    }
    if (!('ancla_esperada' in f)) {
      throw new ErrorAnclasDeclaradas('la fila declarada ' + f.nodo_id + ' no declara ancla_esperada. ' +
        'null es un valor, la ausencia no: una fila sin el campo no dice nada y no puede pasar por NULL.');
    }
    // ancla_esperada SOLO ADMITE null, y la restriccion es deliberada. La
    // primera version aceptaba tambien un entero -- "ancla declarada con
    // valor" -- pero HOY NINGUNA declaracion de este repositorio nombra un
    // ancla con valor, asi que era una rama que ningun dato ejercita y ninguna
    // familia de la mordida produce. Es el mismo argumento con que se agrego
    // M9, aplicado al reves. Ademas restringir es mas seguro: convierte un
    // "ancla_esperada": 83 tipeado por error -- que debilitaria el control en
    // silencio, exigiendo justo lo que el trigger escribe -- en un rojo.
    // ENSANCHARLO ES UNA DECISION DE LA PIEZA QUE LO NECESITE, y viene con su
    // familia en scripts/prueba_mordida_ancla.js. La comparacion de mas abajo
    // ya es generica y no hay que tocarla.
    if (f.ancla_esperada !== null) {
      throw new ErrorAnclasDeclaradas('la fila declarada ' + f.nodo_id + ' declara ancla_esperada = ' +
        JSON.stringify(f.ancla_esperada) + '. Hoy este declarativo solo admite null: declarar un ancla CON VALOR ' +
        'es una decision que ninguna pieza tomo todavia, y una rama que ningun dato ejercita no puede entrar ' +
        'por un tipeo. Ensancharlo es deliberado y va con su familia en la prueba de mordida.');
    }
    if (vistos.has(f.nodo_id)) throw new ErrorAnclasDeclaradas('nodo_id repetido en la declaracion: ' + f.nodo_id);
    vistos.add(f.nodo_id);
  }
}

function validarFilas(filas) {
  if (!Array.isArray(filas)) throw new ErrorAnclasDeclaradas('la lectura de la tabla no es un arreglo');
  for (const r of filas) {
    if (!r || typeof r !== 'object') throw new ErrorAnclasDeclaradas('la lectura trae una fila que no es un objeto');
    for (const campo of CAMPOS_FILA) {
      if (!(campo in r)) {
        throw new ErrorAnclasDeclaradas('la lectura no trae la columna ' + campo +
          ' -- la consulta cambio de forma y el control estaria comparando contra undefined');
      }
    }
  }
}

const norma = v => (v === null || v === undefined ? null : Number(v));

function evaluarAnclasDeclaradas({ filas, declaracion }) {
  validarDeclaracion(declaracion);
  validarFilas(filas);

  const tol = declaracion.tolerancia_grados;
  const porId = new Map(filas.map(r => [Number(r.id), r]));
  const declarados = new Set(declaracion.filas.map(f => f.nodo_id));
  const hallazgos = [];

  for (const d of declaracion.filas) {
    const r = porId.get(d.nodo_id);
    if (!r) {
      hallazgos.push({
        nodo_id: d.nodo_id, clase: 'fila_ausente', nombre: d.nombre,
        detalle: 'la tabla no trae el nodo ' + d.nodo_id,
        esperado: 'una fila con ese id', encontrado: 'ninguna',
      });
      continue;
    }
    // La identidad se coteja ANTES que el estado. Un id que ya no apunta al
    // mismo nodo hace que "el ancla esta en NULL" no signifique nada: seria el
    // NULL de otro. Aca es donde la fragilidad del id por renumeracion deja de
    // ser un verde silencioso y pasa a ser un rojo con motivo.
    const difIdentidad = ['nombre', 'fuente', 'fuente_id']
      .filter(campo => String(r[campo]) !== String(d[campo]));
    if (difIdentidad.length > 0) {
      hallazgos.push({
        nodo_id: d.nodo_id, clase: 'identidad_distinta', nombre: d.nombre,
        detalle: 'el id ' + d.nodo_id + ' ya no apunta al mismo nodo: difieren ' + difIdentidad.join(', '),
        esperado: difIdentidad.map(c => c + '=' + d[c]).join(' '),
        encontrado: difIdentidad.map(c => c + '=' + r[c]).join(' '),
      });
      continue;
    }

    const anclaMal = norma(r.bahia_sitport_id) !== norma(d.ancla_esperada);
    const dlat = Math.abs(Number(r.lat) - d.lat);
    const dlng = Math.abs(Number(r.lng) - d.lng);
    const coordMal = dlat > tol || dlng > tol;
    if (!anclaMal && !coordMal) continue;

    const clase = anclaMal && coordMal ? 'ancla_repuesta_y_coordenada_movida'
      : anclaMal ? 'ancla_repuesta_con_coordenada_intacta'
        : 'coordenada_movida_con_ancla_intacta';
    hallazgos.push({
      nodo_id: d.nodo_id, clase, nombre: d.nombre,
      detalle: CLASES[clase],
      esperado: 'ancla=' + (d.ancla_esperada === null ? 'NULL' : d.ancla_esperada) + ' lat=' + d.lat + ' lng=' + d.lng,
      encontrado: 'ancla=' + (r.bahia_sitport_id === null ? 'NULL' : r.bahia_sitport_id) + ' lat=' + r.lat + ' lng=' + r.lng,
      dlat_grados: dlat, dlng_grados: dlng,
    });
  }

  // CONTROL NEGATIVO, y es una exigencia y no un adorno. Si NINGUNA fila fuera
  // de las declaradas tiene ancla, esta lectura no puede distinguir "el ancla
  // esta en NULL" de "la columna vino vacia", y entonces el verde de las
  // declaradas no prueba nada. Eso no es un defecto del dato: es que no se
  // pudo medir.
  const ajenas = filas.filter(r => !declarados.has(Number(r.id)));
  const ajenasConAncla = ajenas.filter(r => r.bahia_sitport_id !== null && r.bahia_sitport_id !== undefined).length;
  const discrimina = ajenasConAncla > 0;

  const premisa = hallazgos.filter(h => CLASES_DE_PREMISA.has(h.clase)).length;
  const roto = hallazgos.length - premisa;

  const veredicto = premisa > 0 ? 'DECLARACION_NO_CALZA'
    : !discrimina ? 'NO_SE_PUDO_MEDIR'
      : roto > 0 ? 'ESTADO_DECLARADO_ROTO'
        : 'SIN_NOVEDAD';

  return {
    universo: filas.length,
    declaradas: declaracion.filas.length,
    tolerancia_grados: tol,
    hallazgos,
    negativo: {
      ajenas: ajenas.length,
      ajenas_con_ancla: ajenasConAncla,
      ajenas_sin_ancla: ajenas.length - ajenasConAncla,
      discrimina,
    },
    resumen: { declaracion_no_calza: premisa, estado_declarado_roto: roto },
    veredicto,
  };
}

module.exports = {
  ErrorAnclasDeclaradas, CODIGO_SALIDA, CLASES, CLASES_DE_PREMISA, PRECEDENCIA,
  validarDeclaracion, evaluarAnclasDeclaradas,
};
