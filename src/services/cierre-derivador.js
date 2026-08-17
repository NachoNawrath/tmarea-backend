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
// las menores" Y significa "no se pudo leer". Acá se parte.
//
// CÓMO SE PARTÍA HASTA D-C6, y por qué ya no: por la RAMA DEL PARSER que produjo
// ese null (:69 / :92 / :95). Desde D-C6 el alcance se lee del TEXTO —fuente B,
// abajo— así que ya no hay una rama de parser que consultar. La separación NO se
// pierde: se apoya en algo más directo que un null con procedencia.
//
//   menores_sin_umbral  el léxico leyó un componente `menores` SIN número
//   no_legible          el léxico no leyó NINGÚN componente
//
// Deja de inferirse "qué quiso decir el null" y pasa a decirse "qué se leyó".
//
// CORRECCIÓN DEL OWNER (2026-08-16): `total` es su propio estado. Un cierre para
// TODO TIPO DE NAVES alcanza a todas; plegarlo a `menores_sin_umbral` le angosta
// el alcance. La cifra que lo motivó: de los 118 sin número en D, 94 son
// "menores sin número" y 5 son cierre total — no 99 y 19.
//
// LAS RAMAS DEL PARSER SE CONSERVAN COMO PISO, NO COMO CRITERIO. `derivarAlcance`
// sigue leyendo `umbral_ab_fuera` y `bloqueo_total` para producir UN componente
// de piso. No decide el resultado: entra a la unión como uno más. Está medido por
// qué (bitácora §PISO): sin él, los registros cuyo alcance NO viene introducido
// por PARA —"SE SUSPENDE EL TRAFICO DE EE.MM. DE 25 AB", ID 95027— perderían su
// alcance y bajarían al genérico. La unión sólo puede AMPLIAR, así que un piso
// nunca angosta: es la garantía de no-regresión de los 147 de alcance único.
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

// ─────────────────────────────────────────────────────────────────────────────
// D-C6 · EL ALCANCE ES LA UNIÓN DE TODO LO QUE EL TEXTO NOMBRE
//
// Decisión del owner, 2026-08-17. El aviso alcanza a todo lo que el texto
// declare, SUMADO. No se elige entre los alcances declarados: se suman.
// La regla es CONSERVADORA POR DISEÑO: amplía hacia arriba, nunca achica.
//
// FUENTE B — SE LEE DEL TEXTO, NO DE LA SALIDA DEL PARSER. Medido en Fase 1
// (_bitacoras/alcance_union_2026-08-17/02_opciones.txt): las dos ranuras del
// parser arreglan 1 de los 9 casos rotos; leer del texto arregla 9 de 9. El
// motivo es que el parser YA colapsó — de los 41 alcances distintos que los 20
// textos múltiples declaran, sólo 21 sobreviven a `extraerUmbrales`.
//
// EL COSTO DE ESTA FUENTE, DECLARADO: el derivador pasa a tener léxico de
// extracción propio, que DUPLICA del parser la lectura de número+unidad
// (AB_PATTERNS, once patrones) y de las expresiones universales (:69, :95).
// Los dos lectores pueden separarse con el tiempo. Por eso existe el CONTROL DE
// CONTENCIÓN en la suite: todo umbral que el parser extrae tiene que estar
// CONTENIDO en la unión que este archivo emite. No los obliga a ser iguales
// —D-C6 amplía a propósito— pero caza que se separen HACIA ABAJO.
//
// EL GOBIERNO POR PREDICADO DE CIERRE, Y SU LÍMITE HONESTO. Nombrar una clase de
// nave no la vuelve un alcance: `alcance_multiple` §7 midió que "dos clases de
// nave" dispara 8 veces y acierta 3, y que separar los 5 falsos positivos "exige
// leer QUÉ GOBIERNA el sintagma ... eso no es una marca: es análisis sintáctico".
// Este archivo NO hace análisis sintáctico. Hace algo acotado y medible: sólo lee
// alcances dentro de una VENTANA abierta por `PARA` que esté precedida en el
// texto por un predicado de cierre, y la ventana termina en el primer marcador
// que cierra el sintagma. Los cinco falsos positivos que M3 producía quedan
// afuera por construcción, no por excepción:
//   95156-95159  "...DE NAVES MAYORES EN PUERTOS..." — sigue a DE, no a PARA, y
//                cae después del terminador DENTRO que cerró la ventana.
//   95072        "...CON NAVES SUPERIORES A 25 AB" — sigue a CON, no a PARA.
// Es un límite, no una solución general: una Capitanía que escriba
// "cerrado para X, y para el traslado de naves mayores rige otra cosa" volvería
// a entrar. Se declara con su n y la suite lo vigila con el conjunto negativo.
//
// CUÁL DE LOS DOS MECANISMOS HACE EL TRABAJO — MEDIDO, Y NO ES EL QUE PARECE.
// La mordida M3 (04_mordida.js) destapó que anular el guard de precedencia
// —`entraPorPredicado(antes)`— NO pone la suite en rojo. Medido sobre los 444:
//   ocurrencias de PARA                                     402
//   ventanas que el guard RECHAZA                            63
//   filas cuyo NÚMERO DE COMPONENTES cambia sin el guard      36
//   filas cuyo ALCANCE EMITIDO cambia sin el guard             0
// O sea: en este material lo que mantiene afuera a 95156-95159 y a 95072 es la
// VENTANA —el ancla `PARA` y el TERMINADOR—, no la precedencia. El guard filtra
// componentes que la unión después absorbe sin mover el resultado.
// SE CONSERVA IGUAL, y por el mismo motivo que las cuatro alternativas de
// FAMILIA_CIERRE que dan 0 (§4.5): es la DEFINICIÓN de "gobernado por un
// predicado de cierre", no un ajuste a este material. Un texto que abriera con
// "PARA TODA NAVE MENOR..." sin declarar cierre antes lo necesita. Lo que NO se
// hace es atribuirle un efecto que no tiene: la mordida que vigila el conjunto
// negativo ataca el TERMINADOR, que es donde vive el mecanismo.
// ─────────────────────────────────────────────────────────────────────────────

// La ventana la abre PARA. Es la preposición con que estas Capitanías marcan a
// quién alcanza el cierre — verificado sobre los 444, no supuesto.
const ANCLA = /\bPARA\b/g;

// La ventana se cierra en el primer marcador que termina el sintagma de alcance.
// Emergidos del dato, no de una lista previa: son los que efectivamente siguen a
// un alcance en este material. DE y A no pueden estar acá: viven DENTRO de la
// expresión ("MENORES DE 100 ARQUEO BRUTO", "MENOR A 25 AB").
const TERMINADOR = /\b(?:DENTRO|FUERA|POR|SE|CON|HACIA|DESDE|ENTRE|EXCEPTO|CUANDO|QUE|RES|EN)\b/;

// Un universal MODIFICADO por una clase denota UN conjunto, no dos.
// "TODO TIPO DE EMBARCACIONES MENORES" (ID 94977) es {menores}, no {todas}.
// Se consume ENTERO antes del barrido general, porque si no el barrido emitiría
// `todas` y `menores` por separado y la unión daría `total` — que es justo la
// lectura que `alcance_multiple` §8 OBS-3 midió como equivocada.
const UNIV_MODIFICADO = /TODO?A?S?\s+TIPOS?\s+(?:DE\s+)?(?:NAVES|EMBARCACIONES)\s+(MENORES?|MAYORES?)/g;

// Las clases de alcance. Importadas del vocabulario que `alcance_multiple` §1
// dejó emergido del dato; acá se implementan, no se reinventan.
const UNIVERSAL = /TODO?A?S?\s+TIPOS?\s+(?:DE\s+)?(?:NAVES|EMBARCACIONES)|NAVES\s+Y\s+EMBARCACIONES/g;
const CLASE_MENOR = /\bMENOR(?:ES)?\b|\bEE\s*MM\b/g;
const CLASE_MAYOR = /\bMAYOR(?:ES)?\b|\bSUPERIOR(?:ES)?\b/g;

// D-C5 · el número se lee con SU unidad y la unidad NO se convierte.
// Sobre texto N3 la puntuación ya es espacio: "A/B." llega como "A B" (ID 95208),
// "TRG///" como "TRG", "25 (AB)" como "25 AB" (ID 95072, la trampa de OBS-4).
const NUM_UNIDAD = /\b(\d+)\s*(A\s?B|ARQUEO(?:\s+BRUTO)?|TRG)\b/g;

function marcas(re, seg) {
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(seg)) !== null) out.push({ i: m.index, fin: m.index + m[0].length, txt: m[0], g1: m[1] });
  return out;
}

// Lee los alcances de UN segmento ya acotado (lo que sigue a un PARA hasta el
// terminador). Devuelve componentes, en el orden del texto.
function leerSegmento(seg) {
  const comps = [];
  let resto = seg;

  // (1) el universal modificado se consume entero y deja su clase.
  for (const m of marcas(UNIV_MODIFICADO, resto)) {
    comps.push({ tipo: /MAYOR/.test(m.g1) ? 'mayores' : 'menores_sin_umbral', umbral: null, unidad: null, literal: m.txt });
  }
  resto = resto.replace(UNIV_MODIFICADO, ' ');

  // (2) las marcas de clase y los números, ordenados por posición.
  let clases = [
    ...marcas(UNIVERSAL, resto).map((m) => ({ ...m, k: 'todas' })),
    ...marcas(CLASE_MENOR, resto).map((m) => ({ ...m, k: 'menores' })),
    ...marcas(CLASE_MAYOR, resto).map((m) => ({ ...m, k: 'mayores' })),
  ].sort((a, b) => a.i - b.i);

  // (2b) DOS MARCAS SEGUIDAS DE LA MISMA CLASE SON UNA SOLA EXPRESIÓN.
  // "EE MM MENORES DE 25 AB" (ID 94993) nombra la clase dos veces y denota UN
  // conjunto. Sin este colapso, la primera marca se queda sin número y emite
  // `menores`, la segunda absorbe el 25, y la unión suma dos cosas que el texto
  // dijo una sola vez. Es §1 de `alcance_multiple`: dos expresiones son la misma
  // si denotan el mismo conjunto. Sólo colapsa marcas CONTIGUAS y del mismo tipo:
  // "MAYORES Y MENORES" (ID 94985) son distintas y NO se tocan.
  clases = clases.filter((c, i) => i === 0 || clases[i - 1].k !== c.k);
  const nums = marcas(NUM_UNIDAD, resto);

  // (3) cada clase absorbe el primer número que la sigue antes de la clase
  //     siguiente: "EE MM DE 25 AB" es UNA expresión, no dos (alcance_multiple §1).
  const usados = new Set();
  for (let c = 0; c < clases.length; c++) {
    const tope = c + 1 < clases.length ? clases[c + 1].i : Infinity;
    const n = nums.find((x, j) => !usados.has(j) && x.i >= clases[c].fin && x.i < tope);
    if (n) {
      usados.add(nums.indexOf(n));
      comps.push({
        tipo: 'umbral',
        umbral: parseInt(n.g1, 10),
        unidad: n.txt.replace(/\d|\s/g, '').startsWith('TRG') ? 'TRG' : 'AB',
        literal: resto.slice(clases[c].i, n.fin).trim(),
      });
    } else {
      comps.push({ tipo: clases[c].k === 'todas' ? 'total' : clases[c].k === 'menores' ? 'menores_sin_umbral' : 'mayores', umbral: null, unidad: null, literal: clases[c].txt });
    }
  }
  // (4) un número con unidad que ninguna clase absorbió es un alcance igual:
  //     "CERRADO PARA 50 AB" no nombra la clase y alcanza a las de menos de 50.
  nums.forEach((n, j) => {
    if (usados.has(j)) return;
    if (clases.some((c) => c.i < n.i)) return;   // ya quedó cubierto por su clase
    comps.push({
      tipo: 'umbral',
      umbral: parseInt(n.g1, 10),
      unidad: n.txt.replace(/\d|\s/g, '').startsWith('TRG') ? 'TRG' : 'AB',
      literal: n.txt,
    });
  });
  return comps;
}

// Recorre el texto: cada PARA precedido por un predicado de cierre abre una
// ventana; la ventana llega hasta el terminador o hasta el PARA siguiente.
function leerDelTexto(textoN3) {
  const out = [];
  const anclas = marcas(ANCLA, textoN3);
  for (let a = 0; a < anclas.length; a++) {
    const antes = textoN3.slice(0, anclas[a].i);
    if (!entraPorPredicado(antes)) continue;      // el gobierno, implementado como precedencia
    const hasta = a + 1 < anclas.length ? anclas[a + 1].i : textoN3.length;
    let seg = textoN3.slice(anclas[a].fin, hasta);
    const t = seg.match(TERMINADOR);
    if (t) seg = seg.slice(0, t.index);
    for (const c of leerSegmento(seg)) out.push({ ...c, regla: 'lexico:para' });
  }
  return out;
}

// ── LA UNIÓN ────────────────────────────────────────────────────────────────
// La retícula, declarada. `null` = el par no se puede sumar y se dice.
//   umbral(N) ∪ umbral(M) = umbral(max)   sólo con la MISMA unidad (D-C5: no se
//                                          convierte, así que 12 TRG y 12 AB no
//                                          se comparan y el par no se suma)
//   X ∪ total             = total          `total` es el tope
//   mayores ∪ menores     = total          D-C6: "dice «mayores y menores» →
//                                          alcanza a todos". No es una inferencia
//                                          de este archivo: es la decisión.
function unir(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  if (a.tipo === 'total' || b.tipo === 'total') return { tipo: 'total', umbral: null, unidad: null };
  if (a.tipo === 'umbral' && b.tipo === 'umbral') {
    if (a.unidad !== b.unidad) return null;      // D-C5 · no hay tabla de equivalencia
    return a.umbral >= b.umbral ? a : b;
  }
  if (a.tipo === b.tipo) return a;
  const par = [a.tipo, b.tipo].sort().join('+');
  // D-C6: "dice «mayores y menores» → alcanza a todos". No es inferencia de este
  // archivo: es la decisión del owner, citada.
  if (par === 'mayores+menores_sin_umbral') return { tipo: 'total', umbral: null, unidad: null };
  // `menores_sin_umbral` significa TODAS las menores —así lo declara el parser en
  // su :90, "null = TODAS las menores"— y por lo tanto CONTIENE a "las menores de
  // N", que es lo que denota un umbral leído bajo la clase MENORES. La suma es la
  // clase entera. Amplía, que es el lado correcto de D-C6.
  if (par === 'menores_sin_umbral+umbral') return a.tipo === 'menores_sin_umbral' ? a : b;
  return null;                                    // par no medido: no se inventa
}

function derivarAlcance(registro, norm) {
  const textoMotor = normalizarTexto(registro.Observacion);
  const textoN3 = normalizarParaCriterio(registro.Observacion);

  // ── EL PISO. Un componente derivado de las ramas del parser. No decide: entra
  // a la unión como uno más, y la unión sólo amplía.
  let piso = null;
  if (norm.umbral_ab_fuera != null) {
    piso = { tipo: 'umbral', umbral: norm.umbral_ab_fuera, unidad: unidadDelUmbral(textoMotor, norm.umbral_ab_fuera), literal: null, regla: 'parser:umbral_extraido' };
  } else if (norm.bloqueo_total === true || RAMA_TODO_TIPO_DE_NAVES.test(textoMotor)) {
    piso = { tipo: 'total', umbral: null, unidad: null, literal: null, regla: 'parser:69' };
  } else if (RAMA_MENORES_SIN_NUMERO.test(textoMotor)) {
    piso = { tipo: 'menores_sin_umbral', umbral: null, unidad: null, literal: null, regla: 'parser:92' };
  } else if (RAMA_TODO_TIPO_DE_EMBARCACIONES.test(textoMotor)) {
    piso = { tipo: 'menores_sin_umbral', umbral: null, unidad: null, literal: null, regla: 'parser:95' };
  }

  const componentes = (piso ? [piso] : []).concat(leerDelTexto(textoN3));

  // ── LA SUMA. Si algún par no se puede sumar, el resultado NO se completa con
  // un alcance que no se leyó: cae al genérico, que es el piso de D-C4 y alcanza
  // a todos igual. Amplía, nunca achica. Medido: cero registros de 167.
  let u = null;
  let sumable = true;
  for (const c of componentes) {
    const s = unir(u, c);
    if (s === null) { sumable = false; break; }
    u = s;
  }

  // EL VOCABULARIO DE `alcance.tipo` ES CERRADO y sigue siendo el de D-C3:
  // 'umbral' | 'total' | 'menores_sin_umbral' | 'no_legible'. `mayores` existe
  // como COMPONENTE —el texto lo nombra— pero no como resultado: no hay valor
  // para "sólo las mayores" y esta sesión NO lo agrega, porque agregarlo cambia
  // qué ve el patrón y eso es del owner (§0.4). Un cierre que alcanzara sólo a
  // las mayores cae al genérico, que es el piso y alcanza a todos: amplía.
  const VOCABULARIO = new Set(['umbral', 'total', 'menores_sin_umbral']);
  if (!sumable || u == null || !VOCABULARIO.has(u.tipo)) {
    return { tipo: 'no_legible', umbral: null, unidad: null, componentes };
  }
  return { tipo: u.tipo, umbral: u.umbral == null ? null : u.umbral, unidad: u.unidad == null ? null : u.unidad, componentes };
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
