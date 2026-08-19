'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// EL LECTOR DEL JOIN PUERTO→BAHÍA — F2, decisión (3a).
//
// Traduce un NOMBRE DE PUERTO en la bahía cuyas restricciones hay que servir, o
// en el motivo por el que no hay ninguna. NO consulta SITPORT, no filtra
// restricciones y no arma respuesta: eso es de la ruta. Acá vive una sola
// pregunta —«¿qué bahía le corresponde a este nombre, y si no le corresponde
// ninguna, por qué?»— y su respuesta es un dato, no una decisión de producto.
//
// POR QUÉ SE LEE DE data/catalogo/ Y NO DE src/data/ NI DE LA BASE (decisión
// 3a): el precedente ya existe en producción —`drift-arranque.js:28` lee
// `data/catalogo/estado_drift.json` con este mismo `path.join(RAIZ, …)`— y el
// artefacto conserva así su sha256, que es lo que trece instrumentos del frente
// anclan. Bajo `src/data/` la suite pasaría de 157 a 159 (medido: el único test
// dinámico recorre ese directorio y aporta 2 subtests por .json). En la base,
// `4f9fbdc3…` deja de existir como concepto.
//
// LO QUE ESTE MÓDULO NO HACE, Y ES A PROPÓSITO: no adivina. Sin bahía resuelta
// devuelve el silencio con su clase, y la clase es lo que hace medible el falso
// negativo desde la respuesta.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const RUTA_JOIN = path.join(RAIZ, 'data', 'catalogo', 'join_puerto_bahia.json');

// ─────────────────────────────────────────────────────────────────────────────
// LA REGLA (c) — el umbral, con su motivo adentro, igual que el radio de 30 km
// vive dentro del artefacto.
//
// F2 NO le cree a `anclado_por_el_nodo` cuando la bahía que el nodo declara
// está a más de N km de él, y lo degrada a silencio. N = 100 se eligió con la
// curva medida (§6.2 de f2_verde_falso_2026-08-17.txt): la curva es PLANA entre
// 75 y 100 km —el mismo conjunto de 12 filas, las mismas 10 con material, las
// mismas 8 con cierre—, por debajo de 75 empieza a barrer anclas legítimas, y
// por encima de 100 se cae a 6 y deja pasar la mitad del defecto de los 6,00°.
// 100 es el borde superior de la meseta.
//
// SU BALANCE ESTÁ PUBLICADO Y NO ES NEUTRO: evita 8 falsos positivos y causa 2
// falsos negativos que cuestan 8 cierres reales, en `Puerto De Caldera Mejoras
// Fiscales` (7) y `Huasco` (1). Se aplica igual: creerle a un ancla a 554 km es
// peor. Lo que recupera esos 8 cierres es corregir los 11 `lng` en la base, que
// es pieza propia y ya decidida.
// ─────────────────────────────────────────────────────────────────────────────
const KM_MAX_BAHIA_DECLARADA = 100;

// ─────────────────────────────────────────────────────────────────────────────
// EL VOCABULARIO DEL SILENCIO — CUATRO CLASES EXCLUYENTES, y ninguna es «el
// resto». Un bucket residual hereda el nombre del último de la lista aunque no
// mida eso, así que cada una tiene su nombre propio y su denominador.
//
// Las dos primeras salen del vocabulario del propio artefacto y significan
// cosas distintas: `bahia_id: null` NO quiere decir lo mismo en `a_adjudicar`
// —hay bahías y no sabemos cuál— que en `sin_bahia_en_catalogo` —no hay
// ninguna—. No se colapsan.
// ─────────────────────────────────────────────────────────────────────────────
const SILENCIO = {
  // No hay ninguna bahía dentro del radio. NO es desconocimiento: es que SITPORT
  // no publica bahía ahí, así que no hay restricción que atribuir.
  SIN_BAHIA_EN_CATALOGO: 'sin_bahia_en_catalogo',

  // Hubo empate y ningún criterio lo resolvió. Nadie eligió por defecto.
  A_ADJUDICAR: 'a_adjudicar',

  // El nodo declara una bahía, pero está a más de KM_MAX_BAHIA_DECLARADA. Es el
  // ÚNICO silencio que tapa material: los otros tres no tienen bahía, así que no
  // hay nada que mostrar por construcción. Éste sí, y es deliberado.
  BAHIA_DECLARADA_LEJOS: 'bahia_declarada_lejos',

  // El nombre que llegó no tiene ficha en el catálogo de puertos. NO significa
  // irresoluble: significa que F2 atribuye POR NOMBRE y este destino no está en
  // ese catálogo. Es el caso de los centros de cultivo y las concesiones
  // acuícolas, que llegan por recalada con su lat/lng ya en el body y que la
  // ruta hoy descarta. La vía geométrica es pieza propia, ya recomendada.
  DESTINO_SIN_FICHA_DE_PUERTO: 'destino_sin_ficha_de_puerto',
};

// ─────────────────────────────────────────────────────────────────────────────
// DE DÓNDE SALE EL km QUE SE EMITE — decisión C1, con el nombre que mide lo que
// mide.
//
// El artefacto guarda la distancia en TRES CAMPOS DISTINTOS según el estado, y
// sólo uno de ellos es un ancla: de las 489 filas con atribución, 186 tienen
// ancla declarada y las otras 303 —el 62 %— tienen la distancia a una bahía
// DERIVADA, que no es el ancla de nadie. Por eso el campo emitido se llama
// `km_a_la_bahia` y no `km_al_ancla`, y viaja con `fuente_del_km` al lado: un
// campo honesto en lo que computa y deshonesto en el nombre es exactamente el
// defecto que este frente ya tiene catalogado.
//
// EL ESTADO SE LLAMABA `confirmado_declarado` Y LA FUENTE
// `bahia_declarada_por_el_nodo`. Renombrados el 2026-08-19 en la pieza (a1),
// por el mismo motivo que el párrafo de arriba: nada CONFIRMA ese ancla y el
// nodo no la DECLARA. Medido ese día: 193 de las 198 filas tienen
// `la_geografia_coincide: true`, o sea que el ancla es la bahía más cercana al
// punto — un cálculo, no un dato de SITPORT. La escribe el trigger
// `trg_jurisdiccion_auto` de la base, que hace un point-in-polygon contra la
// matview `bahia_jurisdicciones` y no está versionado en este repositorio. En
// los once nodos de (a1) ese cálculo corrió sobre una coordenada corrida ~6° al
// oeste y ~40 km al sur, y por eso nueve de ellos "declaraban" Isla Robinson
// Crusoe. Un nombre que promete confirmación esconde exactamente ese defecto.
//
// QUIEN LO CONSUME: nadie fuera de este módulo y del artefacto. Medido antes de
// renombrar, con control positivo del grep sobre `tmarea-pwa/src`: cero
// ocurrencias de `estado_en_el_catalogo`, `fuente_del_km` y del vocabulario en
// la PWA, y ningún test de la suite toca el lector. El campo `fuente_del_km` SÍ
// viaja en la respuesta de `/api/sitport/…`, así que el valor nuevo
// `ancla_del_nodo` es visible desde afuera — se dice, no se descubre.
// ─────────────────────────────────────────────────────────────────────────────
const KM_POR_ESTADO = {
  anclado_por_el_nodo:  { campo: 'km_a_esa_bahia', fuente: 'ancla_del_nodo' },
  derivado_limpio:      { campo: 'km',             fuente: 'unica_bahia_en_el_radio' },
  desempatado:          { campo: 'elegida_km',     fuente: 'elegida_por_desempate' },
};

// Los cinco estados que el artefacto declara en su propio `vocabulario_estado`.
// Un estado fuera de esta lista es FALLA del artefacto, no un caso por defecto.
const ESTADOS_CONOCIDOS = new Set([
  'anclado_por_el_nodo',
  'derivado_limpio',
  'desempatado',
  'a_adjudicar',
  'sin_bahia_en_catalogo',
]);

class ErrorCatalogoPuertoBahia extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorCatalogoPuertoBahia';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LA NORMALIZACIÓN DEL NOMBRE — la MISMA que usó el generador del artefacto.
//
// NO ES COSMÉTICA Y ESTÁ MEDIDA: de los 688 nombres que devuelve /api/puertos,
// 685 coinciden con una fila carácter por carácter y TRES no —dos con espacio al
// final y uno con un retorno de carro DENTRO del nombre, el nodo 542 «Defensa
// Costera Sector Boca Budi»—. El artefacto guardó el nombre ya limpio y marcó
// esas tres filas con `nombre_venia_sucio: true`. Las tres tienen bahía
// atribuida (102, 77 y 143), así que sin normalizar aquí tres puertos que sí
// tienen bahía caerían al silencio, y además al silencio EQUIVOCADO: se leerían
// como «este destino no tiene ficha» cuando la ficha existe.
//
// Se normaliza SÓLO lo que el generador normalizó, y se declara qué: retornos de
// carro, saltos de línea y tabulaciones colapsados a un espacio, y recorte de
// los extremos. NO se toca ni el caso ni los acentos: el artefacto conserva el
// nombre tal cual lo publica el catálogo y una comparación insensible al caso
// atribuiría por parecido, que es justo lo que F2 viene a retirar.
// ─────────────────────────────────────────────────────────────────────────────
function limpiarNombre(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// LA CARGA — perezosa, con el error CACHEADO y RE-LANZADO en cada llamada.
//
// POR QUÉ ASÍ Y NO DE OTRA MANERA, con su radio de daño escrito:
//   · no se carga al `require` porque un artefacto ilegible dejaría al backend
//     entero sin arrancar, y este módulo sirve a UNA ruta;
//   · el error NO se traga y NO se degrada a silencio. Un catálogo que no se
//     puede leer no es «este puerto no tiene bahía»: es que no sabemos nada, y
//     confundir las dos cosas es el verde falso que F2 viene a cerrar. Se tira, y
//     la ruta contesta con su error, que es ruidoso y visible;
//   · el error se guarda y se re-lanza en vez de reintentar la lectura en cada
//     request: un artefacto roto no se arregla solo entre dos llamadas, y
//     reintentar convertiría un fallo determinístico en uno intermitente.
// ─────────────────────────────────────────────────────────────────────────────
let indice = null;
let errorDeCarga = null;

// Se exporta con `ruta` para que el instrumento pueda ejercer los caminos de
// falla sobre COPIAS en el scratchpad, sin tocar el artefacto versionado.
function construirIndice(ruta) {
  let crudo;
  try {
    crudo = fs.readFileSync(ruta, 'utf8');
  } catch (e) {
    throw new ErrorCatalogoPuertoBahia(`no se pudo leer ${ruta}: ${e.message}`);
  }

  let artefacto;
  try {
    artefacto = JSON.parse(crudo);
  } catch (e) {
    throw new ErrorCatalogoPuertoBahia(`${ruta} no es JSON válido: ${e.message}`);
  }

  // Un artefacto sin `filas` no es un catálogo corto: es otra cosa. Se dice.
  if (!artefacto || !Array.isArray(artefacto.filas)) {
    throw new ErrorCatalogoPuertoBahia(
      `${ruta} no trae un array 'filas' — la forma del artefacto cambió y esta lectura quedaría ciega`);
  }
  if (artefacto.filas.length === 0) {
    throw new ErrorCatalogoPuertoBahia(`${ruta} trae 'filas' vacío — un índice vacío mandaría al silencio a los 688`);
  }

  const porNombre = new Map();
  for (const fila of artefacto.filas) {
    const nombre = limpiarNombre(fila && fila.nombre);
    if (nombre === '') {
      throw new ErrorCatalogoPuertoBahia(`${ruta}: hay una fila sin nombre utilizable (nodo_id ${fila && fila.nodo_id})`);
    }
    // Un nombre repetido significaría que el índice pierde una fila en silencio,
    // que es como se pierde un ancla sin que nadie lo note. Es falla.
    if (porNombre.has(nombre)) {
      throw new ErrorCatalogoPuertoBahia(
        `${ruta}: el nombre ${JSON.stringify(nombre)} aparece más de una vez — un índice por nombre perdería una de las dos filas`);
    }
    if (!ESTADOS_CONOCIDOS.has(fila.estado)) {
      throw new ErrorCatalogoPuertoBahia(
        `${ruta}: estado ${JSON.stringify(fila.estado)} fuera del vocabulario declarado (nodo_id ${fila.nodo_id})`);
    }
    porNombre.set(nombre, fila);
  }
  return porNombre;
}

function cargar() {
  if (errorDeCarga) throw errorDeCarga;
  if (indice) return indice;
  try {
    indice = construirIndice(RUTA_JOIN);
  } catch (e) {
    errorDeCarga = e;
    throw e;
  }
  return indice;
}

// ─────────────────────────────────────────────────────────────────────────────
// LA PREGUNTA — `fichaDePuerto(nombre)`.
//
// Devuelve SIEMPRE la misma forma, y los dos campos que deciden nunca son
// ambiguos: `bahia_id` es un número o `null`, y `silencio` es una de las cuatro
// clases o `null`. Exactamente uno de los dos está poblado — nunca los dos, y
// nunca ninguno.
//
//   { bahia_id, silencio, km_a_la_bahia, fuente_del_km, estado_en_el_catalogo }
//
// `km_a_la_bahia` y `fuente_del_km` van en `null` cuando no hay bahía: no hay
// distancia a algo que no se eligió, y un 0 ahí sería una distancia medida.
// ─────────────────────────────────────────────────────────────────────────────
function fichaDePuerto(nombrePuerto, opciones) {
  const indicePorNombre = (opciones && opciones.indice) || cargar();
  const kmMax = (opciones && typeof opciones.kmMax === 'number')
    ? opciones.kmMax
    : KM_MAX_BAHIA_DECLARADA;

  const nombre = limpiarNombre(nombrePuerto);
  const fila = nombre === '' ? undefined : indicePorNombre.get(nombre);

  // (S4) El nombre no está en el catálogo de puertos. Ver el vocabulario.
  if (!fila) {
    return {
      bahia_id: null,
      silencio: SILENCIO.DESTINO_SIN_FICHA_DE_PUERTO,
      km_a_la_bahia: null,
      fuente_del_km: null,
      estado_en_el_catalogo: null,
    };
  }

  // (S1) y (S2) — los dos silencios del propio artefacto. Se leen del `estado`
  // y NO de `bahia_id === null`, que es lo que los colapsaría en uno solo.
  if (fila.estado === 'sin_bahia_en_catalogo' || fila.estado === 'a_adjudicar') {
    return {
      bahia_id: null,
      silencio: fila.estado === 'a_adjudicar' ? SILENCIO.A_ADJUDICAR : SILENCIO.SIN_BAHIA_EN_CATALOGO,
      km_a_la_bahia: null,
      fuente_del_km: null,
      estado_en_el_catalogo: fila.estado,
    };
  }

  // De acá para abajo el artefacto dice que hay bahía. Si no la hay, el
  // artefacto se contradice a sí mismo y eso es falla, no un silencio más.
  const bahiaId = fila.bahia_id;
  if (typeof bahiaId !== 'number' || !Number.isFinite(bahiaId)) {
    throw new ErrorCatalogoPuertoBahia(
      `${JSON.stringify(nombre)}: estado ${JSON.stringify(fila.estado)} exige bahia_id numérico y trae ` +
      `${JSON.stringify(bahiaId)} — el artefacto se contradice y no se resuelve por defecto`);
  }

  const donde = KM_POR_ESTADO[fila.estado];
  const evidencia = fila.evidencia || {};
  const kmCrudo = evidencia[donde.campo];
  // Se distingue «no vino» de «vino 0»: un 0 es una distancia medida —hay nodos
  // a 0,0 km de su bahía— y un ausente es que no se puede aplicar la regla.
  const km = (typeof kmCrudo === 'number' && Number.isFinite(kmCrudo)) ? kmCrudo : null;

  // (S3) LA REGLA (c). Sólo alcanza a la bahía DECLARADA por el nodo: las
  // derivadas ya salieron de un radio de 30 km, así que el umbral de 100 no las
  // puede tocar y aplicárselo sería una regla que no muerde donde dice morder.
  if (fila.estado === 'anclado_por_el_nodo') {
    if (km === null) {
      throw new ErrorCatalogoPuertoBahia(
        `${JSON.stringify(nombre)}: anclado_por_el_nodo sin evidencia.${donde.campo} numérico — ` +
        `sin esa distancia la regla del umbral no se puede evaluar y no se supone que pasa`);
    }
    if (km > kmMax) {
      return {
        bahia_id: null,
        silencio: SILENCIO.BAHIA_DECLARADA_LEJOS,
        // El km SE EMITE IGUAL, y es el motivo por el que C1 existe: sin él, el
        // falso negativo no es medible desde la respuesta.
        km_a_la_bahia: km,
        fuente_del_km: donde.fuente,
        estado_en_el_catalogo: fila.estado,
      };
    }
  }

  return {
    bahia_id: bahiaId,
    silencio: null,
    km_a_la_bahia: km,
    fuente_del_km: km === null ? null : donde.fuente,
    estado_en_el_catalogo: fila.estado,
  };
}

module.exports = {
  fichaDePuerto,
  limpiarNombre,
  construirIndice,
  SILENCIO,
  KM_MAX_BAHIA_DECLARADA,
  RUTA_JOIN,
  ErrorCatalogoPuertoBahia,
};
