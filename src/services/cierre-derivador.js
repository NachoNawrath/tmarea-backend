// src/services/cierre-derivador.js
//
// Deriva el ESTADO DE CIERRE del puerto desde `Observacion` de SITPORT.
//
// POR QUÉ VIVE ACÁ Y NO EN EL MOTOR (decisión del owner, 2026-08-16):
// el motor de reglas contesta "¿puede navegar ESTA nave?" — su salida depende
// del AB de quien pregunta (mismo registro: AB 15 → UV, AB 60 → null, medido en
// _bitacoras/cierre_observacion_2026-08-16 §2). Un estado de puerto no puede
// depender de quién pregunta. Y no vive en la ruta porque `derivarCondicion`
// (sitport-routes.js:532) ya mostró el costo de poner lógica de dominio en la
// capa de transporte: cero tests, sin normalizador central, y un defecto de
// precedencia que vivió sin que nada lo cazara.
//
// LAS CINCO DECISIONES DEL OWNER QUE ESTE ARCHIVO IMPLEMENTA:
//   D-C1  el cierre es el ESTADO, la condición es la CAUSA. No compiten por una
//         ranura: conviven. La causa sigue saliendo por `condicion` (motor) y
//         `condicion_legible` (sitport-routes.js:836), que NO se tocan.
//   D-C2  la detección es la OPCIÓN D = predicado amplio (Ba) ∪ red de tres ejes.
//   D-C3  el umbral define el ALCANCE, no la existencia. Cuatro estados de
//         alcance, no tres (corrección del owner, 2026-08-16).
//   D-C4  si hay restricción el aviso sale siempre; cuando el alcance no se
//         puede leer, sale genérico. El genérico es un PISO, no un reemplazo.
//         El backend emite la BANDERA (`aviso_modo`); el texto lo pone el render.
//   D-C5  se lee el número y se conserva la unidad tal como vino. NO se convierte.
//
// NADA DE ESTE ARCHIVO MODIFICA EL MOTOR. `normalizarRestriccion` y
// `normalizarTexto` entran por require desde sitport-parser.js.

const { normalizarRestriccion, normalizarTexto } = require('./sitport-parser');

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZACIÓN (INV-0.3) — declarada, con lo que arregla cada capa
//
// Base: `normalizarTexto` de sitport-parser.js:8 — la misma que el motor aplicó
// para producir los hechos que este archivo consume (`umbral_ab_fuera`,
// `bloqueo_total`). Usar otra base haría que el texto que decide la rama no sea
// el texto sobre el que la rama se decidió.
//
//   entidades   &LT; &GT; &AMP; &QUOT;  →  el dato los trae sin decodificar
//   n3          + toda puntuación a espacio + \s+ colapsado (TAB incluido)
//               →  desarma comillas escapadas (ID 95185) y el TAB de GLBahia
//
// LO QUE NINGUNA ARREGLA, y se declara: palabras pegadas ("CONDICIONDE",
// "RESTRICCIONESDE") y tipeos ("PURTO", "ESTABLCE", "RESTRINGUE"). No se aplica
// ninguna caza por aproximación — ver el bloque de VETO más abajo.
// ─────────────────────────────────────────────────────────────────────────────
function decodificarEntidades(s) {
  return String(s == null ? '' : s)
    .replace(/&LT;/gi, '<')
    .replace(/&GT;/gi, '>')
    .replace(/&AMP;/gi, '&')
    .replace(/&QUOT;/gi, '"');
}

function normalizarParaCriterio(texto) {
  return normalizarTexto(decodificarEntidades(texto))
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// D-C2 · VÍA 1 — EL PREDICADO AMPLIO (Ba)
//
// VETO EXPLÍCITO: no hay fuzzy matching, distancia de edición, Levenshtein ni
// similitud en ninguna parte de este archivo. Está medido que no hace falta: el
// único tipeo conocido ("PURTO CERRADO", ID 95208) entra solo por el predicado,
// porque lo que se rompió fue "PUERTO" y no "CERRADO". Y el riesgo que se
// pagaría es concreto: CERRAZON (niebla) está a una letra de la raíz del cierre
// y es una CAUSA, no un cierre.
//
// FAMILIA_CIERRE: las cuatro alternativas que siguen al participio dan 0 en las
// seis capturas y se conservan igual — son la definición del predicado, no un
// ajuste al material (§4.5: la estructura recibe una fuente mejor sin rehacerse).
// El `\b` deja CERRAZON afuera POR CONSTRUCCIÓN, no por excepción: un predicado
// escrito /CERR/ sí lo tomaría, y por eso no se escribe así.
// ─────────────────────────────────────────────────────────────────────────────
const FAMILIA_CIERRE =
  /\bCERRAD[OA]S?\b|\bCIERRES?\b|\bCERRAR\w*\b|\bCIERRAN?\b|\bCLAUSUR\w*\b/;

// Los predicados que cierran SIN usar la palabra. Importados verbatim de
// _bitacoras/ejes_cierre_2026-08-16/03_medir_porosidad.js:86.
// Los dos primeros ya los cubre FAMILIA_CIERRE; los que agregan son los tres
// últimos, y son los que sostienen "el zarpe sólo se cancela cuando el puerto
// está cerrado" (motivo del owner en D-C2).
const PREDICADOS_DE_CIERRE =
  /\bCERRAD[OA]S?\s+PARA\b|\bCERRAD[OA]S?\s+EL\b|\bTRAFICO\s+SUSPENDIDO\b|\bSE\s+SUSPENDE\s+EL\s+TRAFICO\b|\bPROHIBICION\s+DE\s+ZARPE\b/;

function entraPorPredicado(textoN3) {
  return FAMILIA_CIERRE.test(textoN3) || PREDICADOS_DE_CIERRE.test(textoN3);
}

// ─────────────────────────────────────────────────────────────────────────────
// D-C2 · VÍA 2 — LA RED DE TRES EJES
//
// Los tres ejes materialmente presentes: a quién (umbral extraíble), dónde
// (zona por campo o por texto) y qué queda suspendido (actividad nombrada).
// Es lo que captura los registros que NUNCA dicen "cerrado" y sin embargo
// cierran: "SE RESTRINGE NAVEGACION", "QUEDA SUSPENDIDOS LOS ZARPES".
//
// El vocabulario de actividades se importa verbatim de
// _bitacoras/ejes_cierre_2026-08-16/02_medir_actividades.js:94-116, donde cada
// término tiene su procedencia en la tabla de frecuencias del dato. CARTAS DE
// CONTINUIDAD queda FUERA: no es una actividad sino una vía de excepción
// (cuarto eje, fuera de alcance por decisión del owner).
//
// Es un LÉXICO, no un caso particular: §4.3 prohíbe que el código nombre
// entidades concretas (una bahía, una Capitanía), no que nombre términos.
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVIDADES = [
  /\bBUCEO\b/,
  /\bCENTROS?\s+DE\s+CULTIVOS?\b/,
  /\bREMOLQUES?\b/,
  /\bACUICOLAS?\b/,
  /\bTRABAJOS?\b/,
  /\bNAVEGACION\b/,
  /\bTRAFICO\b/,
  /\bZARPES?\b/,
  /\bATRAQUE\b/,
  /\b(?:CARGA|DESCARGA)\b/,
  /\b(?:VIVERES|PERTRECHOS)\b/,
  /\bFONDEOS?\b|\bFONDEADAS?\b/,
  /\bDEPORTIV[AO]S?\b|\bDEPORTES\b/,
  /\bNAUTICOS?\b/,
  /\bPESCA\b/,
  /\bCONECTIVIDAD\b/,
  /\bTRANSFERENCIA\b/,
  /\bARTESANAL(?:ES)?\b/,
  /\bRECREATIV[AO]S?\b/,
  /\bTURISTIC[AO]S?\b/,
  /\bACTIVIDADES?\s+MARITIMAS?\b/,
];

// "FUERA DE PARÁMETROS" no es una zona: es "fuera de parámetros operacionales".
// Son 6 registros medidos, todos de Quintero. Un lector que busque FUERA se los
// lleva puestos, así que se descuentan antes de mirar.
const FUERA_NO_GEOGRAFICO = /\bFUERA\s+DE\s+PARAMETROS\b/g;

function tieneZona(registro, textoN3) {
  const porCampo = /DENTRO|FUERA/.test(normalizarTexto(registro.AreaRestriccion));
  const porTexto = /\bDENTRO\b|\bFUERA\b/.test(textoN3.replace(FUERA_NO_GEOGRAFICO, ' '));
  return porCampo || porTexto;
}

function nombraActividad(textoN3) {
  return ACTIVIDADES.some((re) => re.test(textoN3));
}

function entraPorEjes(registro, textoN3, norm) {
  return norm.umbral_ab_fuera != null && tieneZona(registro, textoN3) && nombraActividad(textoN3);
}

// ─────────────────────────────────────────────────────────────────────────────
// D-C3 · EL ALCANCE — CUATRO ESTADOS, NO TRES
//
// `null` de umbral está sobrecargado en la salida del parser: significa "todas
// las menores" Y significa "no se pudo leer". Acá se parte, y NO por una
// heurística nueva: por la RAMA DEL PARSER que produjo ese null. Las tres ramas
// se citan con su línea porque son la definición, no una reconstrucción.
//
//   total               sitport-parser.js:69  /TODO TIPO DE NAVES/ → bloqueo_total
//   menores_sin_umbral  sitport-parser.js:92  /EMBARCACIONES|NAVES MENORES/ sin nro
//   (misma rama)        sitport-parser.js:95  /TODO TIPO DE EMBARCACIONES/
//   no_legible          ninguna de las anteriores, y sin número
//
// CORRECCIÓN DEL OWNER (2026-08-16): `total` es su propio estado. Un cierre para
// TODO TIPO DE NAVES alcanza a todas; plegarlo a `menores_sin_umbral` le angosta
// el alcance. La cifra que lo motivó: de los 118 sin número en D, 94 son
// "menores sin número" y 5 son cierre total — no 99 y 19.
// ─────────────────────────────────────────────────────────────────────────────
const RAMA_TODO_TIPO_DE_NAVES = /TODO\s+TIPO\s+DE\s+NAVES/;          // parser :69
const RAMA_MENORES_SIN_NUMERO = /EMBARCACIONES\s+MENORES|NAVES\s+MENORES/; // parser :92
const RAMA_TODO_TIPO_DE_EMBARCACIONES = /TODO\s+TIPO\s+DE\s+EMBARCACIONES/; // parser :95

// D-C5 · LA UNIDAD SE LEE Y SE CONSERVA. NO SE CONVIERTE.
// No hay tabla de equivalencia entre AB y TRG y no hay que construirla: lo que
// se guarda es la grafía reducida a su unidad, y el número tal como el parser
// lo leyó.
//
// SON OCHO GRAFÍAS, NO SIETE — medido el 2026-08-16 en esta sesión:
//   A.B. · AB · AB. · A/B. · ARQUEO (BRUTO) · TRG · TRG// · TRG///
// La octava es "50 A/B." (ID 95208, PUERTO MONTT, captura del 01-08), con barra
// entre la A y la B. La tabla de siete de ejes_cierre §1.5 contó "el token que
// sigue a un número" y la barra partió ese token, así que la grafía no apareció
// en la tabla: no es una falsedad de esa medición, es el borde de su método.
// El parser YA la leía — sitport-parser.js:47 acepta `A\/?\.?B` — y por eso el
// umbral 50 se extrae bien; lo que faltaba era leerle la unidad. Esta expresión
// se alinea con ese patrón en vez de mantener una lista propia.
const NUMERO_CON_UNIDAD = /(\d+)\s*(A\s*\/?\s*\.?\s*B\.?|ARQUEO|TRG\/*)/g;

function unidadDelUmbral(textoMotor, umbral) {
  if (umbral == null) return null;
  NUMERO_CON_UNIDAD.lastIndex = 0;
  let m;
  let primera = null;
  while ((m = NUMERO_CON_UNIDAD.exec(textoMotor)) !== null) {
    const unidad = m[2].startsWith('TRG') ? 'TRG' : 'AB';
    if (primera === null) primera = unidad;
    if (parseInt(m[1], 10) === umbral) return unidad;
  }
  // El umbral salió de uno de los once patrones, y los once exigen una unidad.
  // Si no se encontró junto a SU número, se devuelve la primera del texto antes
  // que nada: es el mismo texto y la misma restricción. Que este caso valga cero
  // sobre el material es un control del instrumento, no un supuesto de acá.
  return primera;
}

function derivarAlcance(registro, norm) {
  const textoMotor = normalizarTexto(registro.Observacion);

  if (norm.umbral_ab_fuera != null) {
    return {
      tipo: 'umbral',
      umbral: norm.umbral_ab_fuera,
      unidad: unidadDelUmbral(textoMotor, norm.umbral_ab_fuera),
      rama_parser: 'umbral_extraido',
    };
  }

  if (norm.bloqueo_total === true || RAMA_TODO_TIPO_DE_NAVES.test(textoMotor)) {
    return { tipo: 'total', umbral: null, unidad: null, rama_parser: 'parser:69' };
  }

  if (RAMA_MENORES_SIN_NUMERO.test(textoMotor)) {
    return { tipo: 'menores_sin_umbral', umbral: null, unidad: null, rama_parser: 'parser:92' };
  }

  if (RAMA_TODO_TIPO_DE_EMBARCACIONES.test(textoMotor)) {
    return { tipo: 'menores_sin_umbral', umbral: null, unidad: null, rama_parser: 'parser:95' };
  }

  return { tipo: 'no_legible', umbral: null, unidad: null, rama_parser: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
//
// Recibe un registro CRUDO de SITPORT (`consultaRestricciones`) y devuelve el
// estado de cierre. No muta el registro. No fabrica nada: cuando no hay texto,
// lo dice (INV-0.2), no lo infiere de MotivoRestriccion ni de AreaRestriccion.
// ─────────────────────────────────────────────────────────────────────────────
function derivarCierre(registro) {
  const norm = normalizarRestriccion(registro);
  const textoN3 = normalizarParaCriterio(registro.Observacion);
  const sinTexto = textoN3 === '';

  const porPredicado = !sinTexto && entraPorPredicado(textoN3);
  const porEjes = !sinTexto && entraPorEjes(registro, textoN3, norm);
  const cerrado = porPredicado || porEjes;

  const alcance = derivarAlcance(registro, norm);

  return {
    estado: cerrado ? 'cerrado' : 'sin_cierre_declarado',
    // Por dónde entró. El predicado tiene prioridad de rótulo porque es la vía
    // primaria de D-C2; la red es lo que D agrega sobre Ba.
    via: cerrado ? (porPredicado ? 'predicado' : 'ejes') : null,
    razon_sin_cierre: cerrado ? null : (sinTexto ? 'sin_texto' : 'texto_sin_cierre'),
    alcance,
    // D-C4 · el backend emite la BANDERA; el texto lo pone el render.
    // El genérico es un PISO: sale cuando el alcance no se puede leer, y NO le
    // quita detalle a los que sí lo tienen.
    aviso_modo: alcance.tipo === 'no_legible' ? 'generico' : 'detalle',
    // D-C4 · el texto de la Capitanía no se parafrasea ni se reescribe. Sale tal
    // cual vino. La derivación se usó para decidir el estado, no para redactar.
    texto_original: norm.texto_original,
  };
}

module.exports = {
  derivarCierre,
  // Exportados para que los tests y el instrumento midan sobre la misma
  // implementación y no sobre una copia (regla de instrumento: no reescribir un
  // criterio que ya tiene implementación versionada).
  normalizarParaCriterio,
  entraPorPredicado,
  entraPorEjes,
  derivarAlcance,
  FAMILIA_CIERRE,
  PREDICADOS_DE_CIERRE,
  ACTIVIDADES,
};
