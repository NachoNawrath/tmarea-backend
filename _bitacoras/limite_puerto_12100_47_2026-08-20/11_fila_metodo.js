// P7 - Tres escrituras pedidas por el owner en la PARADA 2.
//
//   (a) DOS notas nuevas dentro de la fila del resultado, que NO se miden:
//       el derrotero del SHOA y su licencia, y la primera medicion de quien
//       retome la fila.
//   (b) UNA FILA PROPIA para el hallazgo de metodo, que hasta ahora vivia
//       adentro de la otra como un subcampo. El owner la quiere aparte porque
//       es lo que mas vale y porque enterrada en la evidencia de otra fila no
//       la encuentra nadie -- que es exactamente el modo de falla que el
//       declarativo existe para impedir.
//   (c) el sitio pasa a declarar DOS filas, no una.
//
// Se escribe con FICHERO, no con node -e inline.
// NO toca ninguna otra fila. D4D5::la-segunda-direccion-no-es-decidible sigue
// viva y sin firmar, por decision explicita del owner.

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const BE = path.resolve(DIR, '..', '..');
const RUTA_DECL = path.join(BE, 'data/deudas/deudas_declaradas.json');

const SITIO = 'SESION-limite-puerto-12100-47-2026-08-20';
const ID_RESULTADO = 'LIMITE-PUERTO::12100-47-cruzada-contra-el-catalogo';
const ID_METODO = 'METODO::emparejar-por-nombre-sin-revision-subcuenta-en-silencio';

const say = (s) => console.log(s);
say('P7 - LAS TRES ESCRITURAS DE LA PARADA 2');
say('='.repeat(78));
say('');

const D = JSON.parse(fs.readFileSync(RUTA_DECL, 'utf8'));
say('ANTES  : ' + D.deudas.length + ' filas · ' + D.cobertura.sitios.length + ' sitios');
say('');

// ── (a) las dos notas ──────────────────────────────────────────────────────
const res = D.deudas.find((d) => d.id === ID_RESULTADO);
if (!res) { say('ROJO: no encuentro la fila del resultado'); process.exit(3); }

res.evidencia_en_el_arbol.POR_QUE_EL_CAMINO_A_LAS_21_ESTA_FRENADO =
  'NO SE MIDIO. Declaracion del owner del 2026-08-20. El DERROTERO DE LA COSTA DE ' +
  'CHILE del SHOA resolveria los toponimos: da coordenadas por lugar, con precision ' +
  'de minuto de arco. El proyecto NO tiene licencia propia sobre esa publicacion y hoy ' +
  'no hay presupuesto para tomarla. O sea que el camino de 9 a 21 bahias EXISTE, tiene ' +
  'un PRECIO, y esta frenado POR ESO y no por una dificultad tecnica. Se escribe para ' +
  'que nadie vuelva a estimarlo como si fuera un problema de ingenieria.';

res.evidencia_en_el_arbol.LA_PRIMERA_MEDICION_DE_QUIEN_RETOME_ESTA_FILA =
  'NO SE MIDIO, y va escrito como encargo. Antes de gastar en cartas o en licencia del ' +
  'derrotero, mirar si los toponimos estan en FUENTES ABIERTAS: IDE Chile, GeoNames, y ' +
  'los catalogos de datos del Estado. Los toponimos que hacen falta son puntas, faros, ' +
  'islotes, rocas y desembocaduras -- la clase de nombre que un gazetteer suele traer. ' +
  'Si estan, el escalon de 9 a 21 cambia de precio antes de empezar. Esta es la PRIMERA ' +
  'medicion, no una sugerencia: hacerla despues de comprar seria haber comprado sin saber.';

res.evidencia_en_el_arbol.el_hallazgo_de_metodo_TIENE_FILA_PROPIA =
  'El hallazgo de metodo salio de esta fila y ahora es ' + ID_METODO + '. Se movio por ' +
  'decision del owner: enterrado adentro de la evidencia de otra fila no lo encuentra ' +
  'nadie, que es el modo de falla que el declarativo existe para impedir. Acá queda el ' +
  'resumen; el desarrollo esta alla.';

say('(a) DOS notas agregadas a ' + ID_RESULTADO + ':');
say('    - POR_QUE_EL_CAMINO_A_LAS_21_ESTA_FRENADO   (licencia del derrotero, NO medido)');
say('    - LA_PRIMERA_MEDICION_DE_QUIEN_RETOME_ESTA_FILA  (fuentes abiertas, NO medido)');
say('    + puntero a la fila de metodo');
say('');

// ── (b) la fila de metodo ──────────────────────────────────────────────────
if (D.deudas.some((d) => d.id === ID_METODO)) { say('ROJO: la fila de metodo ya existe'); process.exit(3); }

const FILA_METODO = {
  id: ID_METODO,
  token_local: null,
  espacio_de_nombres: 'Metodo — emparejamiento de nombres entre dos fuentes del proyecto',
  sitio: SITIO,
  repo: 'tmarea-backend',
  texto_literal: null,
  sin_texto: true,
  donde: {
    fichero: '_bitacoras/limite_puerto_12100_47_2026-08-20/',
    seccion_por_titulo: 'CONTROL DE RECALL — cuanto costaba creerle al generador',
    cita_de_anclaje: 'la linea de 06_cruzar.txt que dice "pares verdaderos que el generador NO VIO : 9"',
  },
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'El documento no la fecha: no estaba escrita en ninguna parte. Nace de la medicion ' +
    'del 2026-08-20 y el owner pidio en la PARADA 2 que fuera fila propia y no un subcampo.',
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true,
  duplicada_de: null,

  titulo: 'Emparejar nombres entre dos fuentes con un generador automatico y sin revision a mano ' +
    'SUBCUENTA EN SILENCIO: medido, 16 % — y uno de los cuatro modos de falla no lo caza ningun ' +
    'umbral de similitud, porque el par verdadero no comparte letras',

  costo_estimado: 'Chico y de escritura, no de codigo: escribir la regla en un lugar canonico del ' +
    'arbol —CLAUDE.md o el sitio de metodo que corresponda— para que la proxima sesion que empareje ' +
    'nombres no la redescubra pagandola. La MEDICION ya esta pagada y esta en la bitacora. Lo que NO ' +
    'es chico, y por eso no se propone, es construir un emparejador general: la conclusion de esta ' +
    'medicion es justamente que no existe.',

  depende_de: 'Nada externo. Se cierra con lo que ya esta en el arbol.',

  por_que_es_deuda: 'El proyecto empareja nombres entre fuentes distintas todo el tiempo —bahia ' +
    'contra Capitania, nodo contra bahia, puerto contra bahia— y varias de esas capas ya estan ' +
    'construidas. Esta medicion pone numero a lo que cuesta hacerlo sin revision a mano, y el numero ' +
    'no es una intuicion: es 16 % de subconteo, silencioso, sobre un cruce concreto. Mientras la ' +
    'regla viva solo en la bitacora de la sesion que la midio, la proxima la vuelve a pagar. Es ' +
    'exactamente el motivo por el que este declarativo existe.',

  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    la_pregunta_que_se_contesto: '¿Cuanto se pierde emparejando por nombre con un generador ' +
      'automatico y sin revisar los candidatos a mano?',

    LA_RESPUESTA: 'Sobre un cruce real de 53 puertos contra 164 bahias: el generador por contencion ' +
      'con frontera de palabra propuso 31 candidatos y NO VIO 9 pares verdaderos, que son 7 bahias ' +
      'distintas. Creerle habria dado 37 bahias en vez de 44. SUBCONTEO DEL 16 %, y en silencio: el ' +
      'generador no avisa de lo que no ve.',

    el_denominador: '53 puertos (lado A) contra 164 bahias (lado B). Unidad del resultado: BAHIA. ' +
      'Los 9 pares perdidos son 7 bahias distintas porque tres puertos de Isla de Pascua caen en la ' +
      'misma. El 16 % es 7 sobre 44, no sobre 164.',

    LOS_CUATRO_MODOS_DE_FALLA: {
      '1_plural': 'El documento dice PATILLOS y el catalogo dice PATILLO. La contencion no muerde en ' +
        'ninguna de las dos direcciones.',
      '2_espacio': 'El documento dice TALTAL y el catalogo dice "TAL TAL". Un espacio de mas.',
      '3_parentesis': 'ANTOFAGASTA esta dentro de "BAHIA MORENO (ANTOFAGASTA)", pero la frontera de ' +
        'palabra no salta un parentesis. El nombre esta ahi, escrito completo, y el patron no lo ve.',
      '4_OTRO_NOMBRE_PARA_EL_MISMO_LUGAR: EL QUE PRUEBA EL PUNTO':
        'JUAN FERNANDEZ contra ISLA ROBINSON CRUSOE. Son el mismo lugar: el limite que la resolucion ' +
        'fija para el puerto de Juan Fernandez —"linea imaginaria entre Punta San Carlos y Punta ' +
        'Loberia"— es la bahia Cumberland, que esta en la isla Robinson Crusoe, la isla principal del ' +
        'archipielago Juan Fernandez. Y las dos cadenas NO COMPARTEN UNA SOLA LETRA UTIL. Ningun ' +
        'umbral de Levenshtein, ningun trigrama, ninguna fonetica llega de una a la otra, porque no ' +
        'hay nada que medir: la relacion es geografica, no ortografica. Los otros tres del mismo ' +
        'modo: RIO NEGRO HORNOPIREN -> CANAL HORNOPIREN, las tres caletas HANGA -> ISLA DE PASCUA, ' +
        'SAN JOSE DE CALBUCO -> BAHIA DE CALBUCO.',
    },

    POR_QUE_NO_LO_ARREGLA_AFLOJAR_EL_UMBRAL: 'Es la tentacion obvia y esta medida que no sirve. ' +
      'Aflojar el umbral podria cazar los modos 1, 2 y 3 —son diferencias de una letra o un signo—, ' +
      'pero NO puede cazar el modo 4, que no tiene distancia que bajar. Y al aflojarlo entran MAS ' +
      'falsos amigos, que es el error caro. O sea: el ajuste que recupera lo barato empeora lo caro y ' +
      'deja lo caro sin recuperar. LO UNICO QUE ENCUENTRA EL MODO 4 ES MIRAR LA LISTA ENTERA.',

    LOS_FALSOS_AMIGOS_QUE_LA_REVISION_MATO: {
      cuantos: '6 pares rechazados sobre 41 revisados, todos con su razon escrita y todos publicados ' +
        'en 06_cruzar.txt. Publicar los NO no es cortesia: es lo que permite auditar el criterio.',
      'CHAÑARAL — la carta lo decide': 'El generador propuso la bahia 158, CALETA CHAÑARAL Y ENSENADA ' +
        'GAVIOTA, para el puerto de CHAÑARAL. Comparten el toponimo y son otro lugar: Chañaral de ' +
        'Aceituno esta cientos de km al sur del puerto de Chañaral de Atacama. Lo que lo decide sin ' +
        'discusion es que la entrada de la resolucion CITA LA CARTA SHOA 2213, que es la de Chañaral ' +
        'de Atacama. El documento traia el desempate adentro y un umbral no lo lee.',
      'CORONEL — 600 km': 'El generador propuso la bahia 114, CANAL CHACAO SECTOR PARGUA Y PUNTA ' +
        'CORONEL, para el puerto de CORONEL. "Punta Coronel" del canal Chacao esta a unos 600 km del ' +
        'puerto de Coronel, en Biobio. Homonimo puro. La contencion con frontera de palabra muerde ' +
        'PERFECTO acá: es un acierto del patron y un error del mundo.',
      los_otros_cuatro: 'Tres son unidades distintas de SITPORT que repiten el toponimo (BORDE ' +
        'COSTERO NORTE PATACHE, BORDE COSTERO SUR PATACHE, SECTOR NORTE QUINTERO): contarlas sumaria ' +
        'el mismo lugar dos y tres veces. El cuarto es SAN JOSE-CAICAEN contra SAN JOSE DE CALBUCO, ' +
        'que es emparejar por el token compartido "SAN JOSE" — la trampa que el criterio prohibe.',
    },

    LA_REGLA_QUE_SE_PROPONE_ESCRIBIR: 'Cuando se empareje por nombre entre dos fuentes del proyecto: ' +
      '(1) la normalizacion NO descarta tokens —no se borran BAHIA, PUERTO, CALETA—, porque borrar ' +
      'tokens es una heuristica de similitud disfrazada de normalizacion; (2) el calce EXACTO de ' +
      'cadena normalizada es automatico y no se revisa, porque no hay nada que juzgar en una ' +
      'igualdad; (3) TODO lo demas es CANDIDATO y lleva veredicto manual con razon escrita, ' +
      'publicados tambien los rechazados; (4) el generador es GENEROSO a proposito, porque su unica ' +
      'falla cara es omitir; (5) y despues de correr el generador SE MIRA LA LISTA ENTERA del lado ' +
      'chico, porque el modo 4 solo se caza asi. El paso (5) es el que esta medicion agrega: sin el, ' +
      'los otros cuatro pasos igual subcuentan 16 %.',

    controles: 'El recall se midio, no se estimo: los 9 pares perdidos estan enumerados uno por uno ' +
      'en 06_cruzar.txt con el modo de falla de cada uno, y el instrumento imprime la cuenta. Los 6 ' +
      'rechazados tambien estan enumerados con su razon. CONTROL POSITIVO del propio hallazgo: el ' +
      'generador SI acerto en 31 candidatos, de los cuales 25 resultaron verdaderos — o sea que no ' +
      'es un generador roto que no muerde nada, es un generador razonable con un techo.',

    LO_QUE_ESTE_HALLAZGO_NO_DICE: 'No dice que el emparejamiento automatico no sirva: sirve para ' +
      'armar la lista. Dice que no sirve para DECIDIR, y pone el numero. Y no dice nada sobre las ' +
      'capas de emparejamiento que el proyecto YA construyo: esas no se auditaron en esta sesion y ' +
      'esta fila no afirma nada sobre ellas.',

    salida_cruda: '_bitacoras/limite_puerto_12100_47_2026-08-20/06_cruzar.txt',
  },
};

D.deudas.push(FILA_METODO);
say('(b) FILA PROPIA agregada: ' + ID_METODO);
say('    grupo ' + FILA_METODO.grupo + ' · estado ' + FILA_METODO.estado +
    ' · firmada ' + FILA_METODO.firma_owner.firmada);
say('');

// ── (c) el sitio ───────────────────────────────────────────────────────────
const sitio = D.cobertura.sitios.find((s) => s.id === SITIO);
if (!sitio) { say('ROJO: no encuentro el sitio'); process.exit(3); }
sitio.filas_en_este_declarativo = 2;
sitio.vocabulario_del_barrido.push(
  'el hallazgo de METODO que la propia medicion produjo: cuanto subcuenta un emparejamiento ' +
  'automatico de nombres sin revision a mano. NO es una de las preguntas que el owner pidio, y va ' +
  'declarado aparte para que el sitio no afirme de si mismo algo que no le encargaron');
sitio.nota += ' AMPLIADO el 2026-08-20 en la PARADA 2: el hallazgo de metodo pasa de subcampo a ' +
  'FILA PROPIA por decision del owner, y el sitio declara DOS filas.';

say('(c) sitio ' + SITIO + ': filas_en_este_declarativo 1 -> 2');
say('');

fs.writeFileSync(RUTA_DECL, JSON.stringify(D, null, 2) + '\n', 'utf8');
say('DESPUES: ' + D.deudas.length + ' filas · ' + D.cobertura.sitios.length + ' sitios');
say('');
say('NO SE TOCO ninguna otra fila. D4D5::la-segunda-direccion-no-es-decidible');
say('sigue VIVA y SIN FIRMAR, por decision explicita del owner en la PARADA 2:');
say('esto contesta la mitad —esta publicado— y la otra mitad sigue siendo dato externo.');
