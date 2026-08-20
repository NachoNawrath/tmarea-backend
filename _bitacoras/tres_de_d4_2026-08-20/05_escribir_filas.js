'use strict';
// Escribe en el declarativo unico las filas que salieron de la sesion
// "LAS TRES DE D4, LA CELDA, Y EL CIERRE DE D5" (2026-08-20), y enmienda dos
// filas de PLAN-2 que esta sesion volvio parcialmente falsas.
//
// Se escribe con FICHERO y no con `node -e` inline: regla del declarativo, que
// nacio de que un backtick ejecutado dentro de node -e mutilo un texto_literal.
// El fichero se lee, se muta en memoria y se vuelve a escribir entero.

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));

const SITIO = 'SESION-tres-de-d4-2026-08-20';
const NS = 'PLAN_JURISDICCION.md 5 — D4 y D5, y la celda';
const NOTA_FECHA = 'El documento no fecha estas deudas: no estaban escritas en ninguna parte. ' +
  'Nacen de las cuatro mediciones de la sesion del 2026-08-20, cuya salida cruda vive en ' +
  '_bitacoras/tres_de_d4_2026-08-20/.';

const base = {
  token_local: null,
  espacio_de_nombres: NS,
  sitio: SITIO,
  texto_literal: null,
  sin_texto: true,
  abierta_el: '2026-08-20',
  abierta_el_lo_dice_el_documento: false,
  nota_fecha: NOTA_FECHA,
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true,
  duplicada_de: null,
};

const NUEVAS = [

// ── 1 ────────────────────────────────────────────────────────────────────────
{
  ...base,
  id: 'D4D5::inv34-derogado-por-d5',
  repo: 'tmarea-backend',
  grupo: '2_decision_del_owner',
  titulo: 'D5 deroga INV-3.4, y hay que separar DOS afirmaciones que no son la misma: la consecuencia cae, y del titulo el owner no dijo nada',
  donde: {
    fichero: 'CONTRATO_MOTOR.md',
    seccion_por_titulo: 'INV-3.4 — La bahia es etiqueta de la restriccion, no criterio de aplicacion',
    cita_de_anclaje: 'el parrafo que empieza "Consecuencia:" y la linea que empieza "Verificacion:"',
  },
  la_decision_ya_esta_tomada: 'El owner decidio el 2026-08-20 que el parrafo que limita la accion SE MODIFICA. ' +
    'Lo que queda pendiente NO es decidir: es el TEXTO, y el texto del contrato lo escribe el owner (precedente D9, INV-3.5).',
  lo_que_cae: {
    consecuencia: 'TEXTO VIGENTE: "una restriccion publicada bajo el nombre de una bahia aplica a toda la ' +
      'jurisdiccion de su Capitania, salvo que el propio texto acote el area (campo AreaRestriccion...)". ' +
      'La regla de D5 dice lo contrario: solo entra lo que el trazado navega, aunque sea la misma Capitania.',
    verificacion: 'TEXTO VIGENTE: "el motor no puede descartar una restriccion por comparacion de nombre de ' +
      'bahia contra la posicion de la ruta". Es exactamente lo que la regla de D5 manda hacer. Un motor que ' +
      'cumpla D5 REPRUEBA esta linea.',
  },
  LA_PREGUNTA_QUE_NO_RESUELVO_YO: {
    el_titulo: '"La bahia es etiqueta de la restriccion, no criterio de aplicacion" afirma que la bahia es ' +
      'ORIGEN y no EXTENSION. La regla del owner solo es aplicable si la bahia SI delimita un area: sin eso, ' +
      '"que el trazado navegue esa bahia" no significa nada.',
    o_sea: 'El titulo no cae por la misma via que la consecuencia. Cae —o sobrevive con otra redaccion— segun ' +
      'que se decida que ES la bahia para el motor. Es una pregunta distinta y va contestada aparte.',
  },
  EL_ARGUMENTO_EN_CONTRA_ESTA_ESCRITO_EN_EL_PROPIO_INV34: {
    nota_de_alcance: 'INV-3.4 dice, textual: las resoluciones locales pueden subdividir la jurisdiccion en ' +
      'SECTORES con condicion de puerto independiente, y SITPORT puede publicar a nivel de sector o de canal. ' +
      'El motor NO implementa sector; mientras no lo haga evalua a nivel de Capitania "que es el envolvente: ' +
      'muestra de mas, nunca de menos".',
    por_que_va_escrito: 'El owner firma viendo las dos caras. La regla de D5 invierte ese default: pasa de ' +
      '"de mas, nunca de menos" a "lo que navega". El fundamento del owner responde a eso —la app es ' +
      'informativa, el patron aplica el trazado con el instrumento de su barco— y es un fundamento valido. ' +
      'Lo que no seria valido es que la eleccion se hiciera sin ver el argumento que se deja atras.',
    y_un_dato_medido_que_juega_a_favor_de_la_regla: 'AreaRestriccion NO esta vacio. De las 20 filas vigentes ' +
      'del 2026-08-20, hay filas que declaran "DENTRO DEL LIMITE DEL PUERTO", "FUERA DEL LIMITE DEL PUERTO" y ' +
      'las dos a la vez. La propia SITPORT acota el area en el dato. Ver 03_puerto_abierto_con_restriccion.txt.',
  },
  ESTO_GOBIERNA_EL_ORDEN: 'El texto de reemplazo NO se redacta antes de que la celda este medida y resuelta ' +
    '(decision del owner, 2026-08-20). Escribir "aplica donde el trazado navega esa bahia" sobre el dato de hoy ' +
    'seria escribir una regla que el motor NO PUEDE CUMPLIR: ver D4D5::la-segunda-direccion-no-es-decidible.',
  pregunta: 'La consecuencia y la verificacion de INV-3.4 caen con la regla de D5: eso ya esta decidido y solo ' +
    'falta el texto. La que falta contestar es otra: el TITULO —"la bahia es etiqueta de la restriccion, no ' +
    'criterio de aplicacion"— ¿tambien cae, o sobrevive con otra redaccion? Si la bahia sigue siendo etiqueta y ' +
    'no extension, la regla nueva no tiene sobre que apoyarse; si pasa a ser extension, hay que decir de que ' +
    'geometria se trata, porque hoy el motor usa una celda Voronoi que no son las aguas de la bahia.',
  por_que_es_del_owner: 'Es texto de contrato. Precedente D9: el agente mide y propone, el texto del contrato ' +
    'lo escribe el owner.',
  medicion: '_bitacoras/tres_de_d4_2026-08-20/ — las cuatro mediciones del 2026-08-20.',
  consecuencia_hoy: 'Mientras el texto no se escriba, CONTRATO_MOTOR.md y §5 del PLAN afirman cosas contrarias. ' +
    'Queda declarado en la propia D5, no en silencio.',
},

// ── 2 ────────────────────────────────────────────────────────────────────────
{
  ...base,
  id: 'D4D5::e2-y-e6-sin-premisa',
  repo: 'tmarea-backend',
  grupo: '2_decision_del_owner',
  titulo: 'E2 esperaba que el cambio de unidad subiera el volumen de restricciones y E6 existe para hacer ese cambio: D5 les saca la premisa a los dos',
  donde: {
    fichero: 'PLAN_JURISDICCION.md',
    seccion_por_titulo: '3. ETAPAS -> E2 . Disenar y medir el cambio de unidad  ·  y  ->  E6 . Cambio de unidad en el motor',
    cita_de_anclaje: 'en E2, la frase "La direccion esperada es hacia arriba por INV-3.4"; en E6, la linea de aceptacion "S1, S2, S5"',
  },
  lo_que_dice_hoy_el_arbol: {
    E2_punto_1: '"Medicion del volumen. Cuantas restricciones mas —o menos— por ruta. La direccion esperada es ' +
      'hacia arriba por INV-3.4."',
    E6: '"Cambiar capa_consultada.json a la capa real y aplicar el diseno de E2." Aceptacion: S1, S2, S5.',
    el_codigo: 'sitport-routes.js, comentario de bahiasEnRutaPostGIS: "El cambio de unidad —dejar de filtrar ' +
      'por bahia y filtrar por Capitania— sigue entero en E6."',
  },
  lo_que_D5_cambia: 'La direccion esperada deja de ser hacia arriba, y E6 deja de ser "filtrar por Capitania". ' +
    'Esto NO mata E6: E6 sigue haciendo falta por INV-3.3 —que prohibe resolver jurisdiccion por celda de un ' +
    'teselado— y por S1 y S3. Lo que cambia es su ALCANCE: la unidad Capitania pasa a gobernar A QUIEN SE NOMBRA ' +
    'y A QUIEN SE LLAMA, y deja de gobernar QUE RESTRICCIONES SE LISTAN.',
  cuanto_es_hacia_abajo_MEDIDO: 'Sobre las 8 rutas calculables del arnes, contra el andamio por Capitania y con ' +
    'las restricciones vivas del 2026-08-20: R1 Quellon->San Rafael mostraria 4 restricciones MAS bajo la regla ' +
    'vieja (bahias 112, 148, 251, 252, todas con TODOS viva), C1 Punta Arenas->Williams 1 mas (bahia 165), C4 ' +
    'Quellon->Melinka 1 mas (bahia 252). CAVEAT que viaja con el numero: el andamio jurisdicciones_decreto esta ' +
    'declarado NO promovible (60 pares traslapados, 44.875,6 km2, 10 de 64 sin geometria, insumo v1 con 11 ' +
    'jurisdicciones que difieren del v2 y todas en el corredor de Chiloe). Es COTA, no medida exacta. ' +
    '02_celda_causas_y_cota.txt.',
  pregunta: 'Con la regla de D5 escrita, ¿que queda siendo E6? Hoy el plan dice que E6 cambia la unidad de la ' +
    'lista de restricciones a Capitania y que E2 esperaba que eso mostrara MAS restricciones por ruta. La regla ' +
    'nueva dice que se muestran menos, y solo las que el trazado navega. ¿E6 pasa a ser solo "resolver ' +
    'jurisdiccion por el poligono del decreto en vez de por celda" —que es lo que INV-3.3 exige y sigue ' +
    'haciendo falta— o hay que replantear tambien su criterio de aceptacion, que hoy nombra S2?',
  por_que_es_del_owner: 'Redefinir el alcance de una etapa es decision de plan, no de implementacion.',
  medicion: '_bitacoras/tres_de_d4_2026-08-20/02_celda_causas_y_cota.txt, bloque D3.',
  consecuencia_hoy: 'E2 y E6 siguen escritas con la premisa vieja. Quien las lea sin leer D5 va a construir en ' +
    'la direccion contraria.',
},

// ── 3 ────────────────────────────────────────────────────────────────────────
{
  ...base,
  id: 'D4D5::puerto-escala-lo-que-declara-no-aplicable',
  repo: 'tmarea-pwa',
  grupo: '2_decision_del_owner',
  titulo: 'La misma restriccion, en la misma pantalla: el bloque de transito la declara inofensiva y el bloque de puerto sube la bandera por ella',
  donde: {
    fichero: 'tmarea-pwa/src/hooks/useVoyageVerification.js',
    seccion_por_titulo: 'mapearRespuestaPuerto, y la composicion del veredicto que consume su `estado`',
    cita_de_anclaje: 'la linea `else if (restricciones.length > 0) estado = \'ambar\'`, que no mira `cierre` y no mira la nave',
  },
  medido_en_pantalla_el: '2026-08-20',
  las_dos_pasadas: {
    ruta: 'Caleta Pesquera Quellon -> Caleta Pesquera San Rafael, 84,3 mn, licencia patron_nave_menor, uso pesca.',
    la_restriccion: 'UNA sola en toda la pantalla: bahia 117 BAHIA QUELLON, condicion MAL_TIEMPO, umbral 25 AB. ' +
      'Y la 117 ES el puerto de zarpe.',
    AB_50: 'bandera 🟨 U · 1 motivo: "Puerto de zarpe \\"Caleta Pesquera Quellon\\" con restricciones" · ' +
      'transito: "Ninguna afecta tu embarcacion" · tarjeta de zarpe 🟡 "Con restricciones" · ' +
      'la MISMA tarjeta desplegada dice "ℹ Tu embarcacion (AB 50) no esta afectada por esta restriccion".',
    AB_10: 'bandera 🟥 U+V · 2 motivos: transito + puerto · transito: "⛔ Tu embarcacion NO puede transitar" · ' +
      'tarjeta de zarpe 🟡 "Con restricciones" (IDENTICA) · desplegada: "⚠ Esta restriccion aplica a tu ' +
      'embarcacion (AB 10 < 25 AB)".',
  },
  LO_QUE_ESO_MIDE: 'El veredicto distingue "aplica" de "no aplica" en la fuente de TRANSITO y NO lo distingue ' +
    'en la fuente de PUERTO. Y no es que el bloque de puerto no sepa: CALCULA la aplicabilidad y la ESCRIBE en ' +
    'la misma tarjeta, en las dos pasadas, con textos opuestos. Despues escala igual.',
  el_codigo_lo_confirma_del_lado_del_transito: 'restriction-rules-engine.js devuelve `nivel: null` en la rama ' +
    'no_afecta, y route-restriction-evaluator.js lo filtra con `if (ev.nivel && ...)`: null es falso y nunca ' +
    'entra al maximo. Del lado del puerto no hay tal filtro porque el endpoint de puerto ni siquiera recibe el AB.',
  lo_que_esta_fila_NO_decide: 'Si eso esta MAL. Puede ser deliberado: la condicion de puerto es un ESTADO del ' +
    'lugar y no un veredicto por nave, y el propio backend lo dice donde emite `cierre` ("Estado de puerto, no ' +
    'veredicto por nave: no depende del AB de quien pregunta"). La medicion solo dice que hoy las dos fuentes ' +
    'se contradicen en la misma pantalla, y que S6 lleva un "nunca se contradice con lo que hay debajo".',
  pregunta: 'Cuando el puerto de zarpe tiene una restriccion vigente que NO afecta a la nave del patron, ' +
    '¿la app tiene que subir la bandera igual? Hoy la sube: sale BANDERA U con un unico motivo, que es ese ' +
    'puerto, mientras la misma pantalla le dice al patron —dos veces, en dos bloques— que esa restriccion no ' +
    'lo afecta. Si la respuesta es que si tiene que subirla, entonces el texto del veredicto deberia decir por ' +
    'que sube algo que no le aplica; si la respuesta es que no, cambia la composicion del maximo.',
  por_que_es_del_owner: 'Es producto puro, del mismo genero que S5/D4: no hay norma que diga si la condicion de ' +
    'puerto es un estado del lugar o un veredicto para el que pregunta.',
  medicion: '_bitacoras/tres_de_d4_2026-08-20/04_pantalla_dos_pasadas_ab50_ab10.txt',
  consecuencia_hoy: 'El patron con AB 50 ve amarillo y "Navegar con precaucion" por una restriccion que la ' +
    'propia app le declara inofensiva, dos veces.',
},

// ── 4 ────────────────────────────────────────────────────────────────────────
{
  ...base,
  id: 'D4D5::abierto-y-con-restriccion-colapsados-en-pantalla',
  repo: 'tmarea-pwa',
  grupo: '2_decision_del_owner',
  titulo: 'En el dato, "puerto abierto" y "restriccion vigente" son independientes; en la pantalla no pueden coexistir',
  donde: {
    fichero: 'tmarea-pwa/src/hooks/useVoyageVerification.js',
    seccion_por_titulo: 'mapearRespuestaPuerto',
    cita_de_anclaje: 'la cadena `if (restricciones.some(r => r.nivel === \'cierre_total\')) estado = \'rojo\'; else if (restricciones.length > 0) estado = \'ambar\';`',
  },
  medido_el: '2026-08-20',
  en_el_dato: 'Los dos bloques leen la MISMA fuente —consultaRestricciones()—, y el estado de puerto es una ' +
    'DERIVACION de esas filas: derivarCierre(r) devuelve "cerrado" o "sin_cierre_declarado". Sobre las 20 filas ' +
    'vigentes del 2026-08-20: 14 cerrado · 6 sin_cierre_declarado. TRES de las 6 son tipo TODOS: bahia 131 ' +
    'BAHIA GREGORIO, 138 PUERTO WILLIAMS y 156 PRIMERA ANGOSTURA, las tres motivo VIENTO, con AreaRestriccion ' +
    'declarado ("FUERA DEL LIMITE DEL PUERTO" en dos, "DENTRO... , FUERA..." en Puerto Williams). ' +
    'RESPUESTA: SI, un puerto puede tener restriccion vigente y no estar cerrado. Son dos cosas distintas del ' +
    'mismo lugar. Control positivo: 14 de 20 SI declaran cierre, o sea el derivador separa de verdad.',
  en_la_pantalla: 'NO. 🟢 "Abierto" solo sale junto a "Sin restricciones activas"; basta UNA restriccion para ' +
    'que el rotulo pase a 🟡 "Con restricciones", sin mirar `cierre` y sin mirar la nave. Medido en las dos ' +
    'tarjetas de las dos pasadas.',
  por_que_importa_para_S5: 'Si el bloque de puertos cuenta el ESTADO del lugar y el de transito cuenta las ' +
    'RESTRICCIONES que la ruta encuentra, entonces no cuentan lo mismo y "duplicado" en S5 significa otra cosa: ' +
    'no es la misma informacion dos veces, son dos informaciones distintas del mismo sitio, hoy fundidas en ' +
    'un solo rotulo. Con el dato de hoy la bahia 117 aparece en los dos bloques y en los dos como "cerrado".',
  pregunta: 'La condicion de puerto y la restriccion, ¿son dos cosas distintas que el patron tiene que ver por ' +
    'separado, o una sola? En el dato son distintas —hoy hay 6 restricciones vigentes que no declaran cierre, ' +
    'tres de ellas de tipo TODOS— pero la pantalla las funde en un solo rotulo de color. De la respuesta ' +
    'depende que significa "duplicado" en S5, que es lo que D4 tiene que decidir.',
  por_que_es_del_owner: 'S5 esta declarada [P] pura en §2: no hay regla escrita en ninguna parte y lo que se ' +
    'decida se convierte en la regla.',
  medicion: '_bitacoras/tres_de_d4_2026-08-20/03_puerto_abierto_con_restriccion.txt y 04_pantalla_dos_pasadas_ab50_ab10.txt',
  consecuencia_hoy: 'Un puerto con una restriccion que no cierra nada se le pinta al patron igual que uno con ' +
    'una que lo cierra: los dos 🟡 "Con restricciones".',
},

// ── 5 ────────────────────────────────────────────────────────────────────────
{
  ...base,
  id: 'D4D5::la-celda-no-son-las-aguas-y-esta-medido-cuanto',
  repo: 'tmarea-backend',
  grupo: '1_cierra_con_lo_que_hay',
  titulo: 'La celda Voronoi se aparta hasta 73,7 km del punto de su bahia, y dos rutas del arnes navegan el 69 % de su recorrido fuera de toda celda',
  donde: {
    fichero: 'src/routes/sitport-routes.js',
    seccion_por_titulo: 'bahiasEnRutaPostGIS, y la capa que declara data/decreto/capa_consultada.json',
    cita_de_anclaje: 'el ST_Intersects contra la capa `bahia_jurisdicciones`, y la `advertencia` de capa_consultada.json que ya dice que esa capa resuelve por teselado',
  },
  medido_el: '2026-08-20',
  no_es_un_descubrimiento_y_se_dice: '§1.1 del PLAN ya declara que la capa NO SIRVE —"sus limites no son los ' +
    'del decreto, su unidad es la bahia y no la Capitania"— y que contradice INV-3.3 (§7 bug 4). Lo que NO ' +
    'estaba era CUANTO, y sobre rutas reales. Eso es lo nuevo.',
  denominador: '8 rutas calculables de las 9 del arnes (R3 lacustre no se rutea: SNAP_FAILED, ya declarado en ' +
    'PLAN-2::ninguna-ruta-lacustre-es-calculable) · 37 pares (ruta, bahia cuya celda la ruta cruza).',
  C1_cuanto_se_aparta: 'Distancia del PUNTO de la bahia al trozo de ruta que cae DENTRO DE SU PROPIA CELDA. ' +
    'Distribucion entera, sin umbral: min 0,0 · p25 1,3 · p50 2,6 · p75 5,0 · p90 13,9 · max 73,7 km. ' +
    'Histograma por decena: [0,10) 31 · [10,20) 3 · [20,30) 1 · [40,50) 1 · [70,80) 1. HAY HUECO entre 30 y 40 ' +
    'y entre 50 y 70: el cuerpo y la cola se separan solos, sin que nadie ponga un corte (mismo criterio con ' +
    'que se justifico la tolerancia de 1 mm en capa_consultada.json). ' +
    'EL CASO: ruta Punta Arenas -> Puerto Williams cruza la celda de la bahia 137 BAHIA CHILOTA en un punto a ' +
    '73,7 km de Bahia Chilota, con 7,1 km de ruta dentro y una celda de 4.375,3 km2. Ninguna lectura de "las ' +
    'aguas de Bahia Chilota" llega a 73,7 km. Segundo: 154 ISLA GUARELLO a 47,1 km, en Natales -> Eden.',
  C2_el_hueco: 'Km de ruta que no caen en NINGUNA celda, sobre el total de la ruta: R1 1,6 % · R2 31,4 % · ' +
    'C1 Punta Arenas->Williams 69,0 % (358,7 de 519,9 km) · C2 Natales->Eden 68,7 % (412,2 de 600,4 km) · ' +
    'C3 1,8 % · C4 0,6 % · C5 20,8 % · C6 20,4 %. ' +
    'CAUSAS, medidas y no supuestas: en R1, R2, C3, C4 y C5 el 100 % del hueco esta DENTRO de ne_land —la ' +
    'linea de costa gruesa dice que ahi hay tierra y el ST_Difference borro la celda—; en C1 y C2 la causa ' +
    'dominante es el tope de 80 km del buffer (349,6 de 358,7 y 328,1 de 412,2 km a mas de 80 km de TODO punto ' +
    'de bahia). Son dos arreglos distintos.',
  CORROBORACION_QUE_NO_ESTABA_BUSCADA: 'En C6 Antofagasta -> Taltal el hueco por el tope de 80 km da 24,665 km. ' +
    'El aviso de cobertura_jurisdiccional que el backend mando a este mismo navegador el 2026-08-20 declaraba ' +
    '24,6646 km con causa jurisdiccion_sin_geometria. Dos instrumentos independientes, tres decimales iguales: ' +
    'esta medicion reproduce el criterio del motor.',
  C3_las_inversiones: 'Bahias mas cerca de la ruta que la cruzada mas lejana, y sin celda cruzada: 3 en total ' +
    'sobre las 8 rutas (200 Laredo a 22,8 km en C1 con la cruzada mas lejana a 31,2; 254 Canal Chaffers Sur a ' +
    '9,8 en C4 con la mas lejana a 12,9; 243 Canal Darwin a 11,2 en C5 con la mas lejana a 17,4). ' +
    'SE PUBLICAN COMO CANDIDATOS Y NO COMO CASOS: ver D4D5::la-segunda-direccion-no-es-decidible.',
  C4_las_celdas_vacias: 'Re-medidas, no citadas: 33 de 163, y COINCIDE con lo que §1.1 dice. De las 33, el ' +
    'ensanche del ambito lacustre rescata 19 y NO rescata 14 (89 Isla de Pascua, 104 Valdivia Fluvial, 133 ' +
    'Bahia Catalina, 139 Bahia Fildes, 140 Bahia Paraiso, 142 Carahue-Sector Lago, 153 Lago Tagua Tagua, 162 ' +
    'Lago Chapo, 183 Estero Pichicolo, 207 Valdivia Conectividad, 225 Canal Utarupa, 229 Lago Vichuquen, 231 ' +
    'Bahia Chile, 234 Rio Palena). Una bahia sin celda no puede ser cruzada nunca. Hoy NINGUNA de las 33 ' +
    'publica restriccion, sobre 20 filas vigentes: el caso existe por construccion y hoy no se ejerce.',
  POR_QUE_ESTO_TOCA_LA_REGLA_DE_D5: 'La regla del owner dice "lo que su trazado efectivamente navega". Hoy el ' +
    'motor filtra por celda cruzada. Las dos coinciden solo si la celda representa las aguas de la bahia, y ' +
    'esta medicion muestra que en la cola no las representa. O sea: la regla puede estar escrita y NO CUMPLIRSE, ' +
    'aunque el codigo parezca correcto.',
  costo_estimado: 'La fila no se cierra con un parche: se cierra reemplazando la capa, que es E4 + E6, y E8 ya ' +
    'lista "retirar bahia_jurisdiccions y su backup". Lo barato y util de hacer antes es separar las dos causas ' +
    'del hueco, que ya esta hecho aca: el 100 % de ne_land en cinco rutas es un problema de linea de costa, y ' +
    'el tope de 80 km en las dos australes es un parametro de construccion.',
  depende_de: 'Nada abierto para medir. Para cerrar, E4 (que la capa del D.S. 991 pase C3) y E6.',
},

// ── 6 ────────────────────────────────────────────────────────────────────────
{
  ...base,
  id: 'D4D5::la-segunda-direccion-no-es-decidible',
  repo: 'tmarea-backend',
  grupo: '3_dato_externo',
  titulo: 'De las dos direcciones que la regla de D5 exige verificar, una es decidible con el dato de hoy y la otra no, y eso gobierna cuando se puede redactar INV-3.4',
  donde: {
    fichero: 'data/decreto/capa_consultada.json',
    seccion_por_titulo: 'capa_jurisdicciones y su `advertencia`',
    cita_de_anclaje: 'la linea que dice que bahia_jurisdicciones "resuelve por teselado, no por los limites del decreto"',
  },
  medido_el: '2026-08-20',
  LA_ASIMETRIA: {
    decidible: 'CRUZAR LA CELDA SIN NAVEGAR SUS AGUAS. Una distancia grande FALSIFICA: nadie va a sostener que ' +
      'las aguas de Bahia Chilota llegan a 73,7 km de Bahia Chilota. Medido y cerrado.',
    no_decidible: 'NAVEGAR LAS AGUAS DE UNA BAHIA SIN CRUZAR SU CELDA. Una distancia chica NO CONFIRMA: que la ' +
      'ruta pase a 9,8 km del punto de Canal Chaffers Sur no prueba que este navegando SUS aguas. Y una ' +
      'inversion de rango tampoco: un teselado de Voronoi NO ES monotono en la distancia a un punto, asi que ' +
      'una inversion es comportamiento esperado de la construccion, no evidencia de defecto. Por eso las 3 ' +
      'inversiones medidas se publican como CANDIDATOS y no como casos.',
  },
  lo_que_falta_y_no_esta_en_el_repositorio: 'Una geometria de "las aguas de la bahia". Hoy hay: la celda (que ' +
    'no lo es, por construccion), UN PUNTO por bahia (bahias_sitport / BAHIA_COORDS), y la capa por Capitania ' +
    'del decreto (jurisdicciones_decreto, declarada ANDAMIO no promovible). Ninguna de las tres.',
  la_opcion_que_se_DESCARTO_y_por_que: 'Traer poligonos natural=bay de OpenStreetMap. DESCARTADA por el owner ' +
    'el 2026-08-20, con su motivo: OSM no es fuente autorizada de jurisdiccion, su cobertura de bahias es ' +
    'desigual, y un km2 que suena mejor y vale menos es peor que no tenerlo. Va escrito porque se considero: ' +
    'misma regla con la que quedo registrada la reversion del Canal 16 en D15.',
  ESTO_GOBIERNA_EL_ORDEN_DE_INV34: 'Mientras esta direccion no sea decidible, el texto de reemplazo de INV-3.4 ' +
    'NO puede decir "aplica donde el trazado navega esa bahia": seria una regla cuya segunda mitad el motor no ' +
    'puede comprobar con ningun dato que tenga. Ver D4D5::inv34-derogado-por-d5.',
  que_dato: '¿Cual es la geografia que delimita una restriccion publicada bajo el nombre de una bahia? El ' +
    'campo AreaRestriccion de SITPORT ya trae "DENTRO DEL LIMITE DEL PUERTO" y "FUERA DEL LIMITE DEL PUERTO", ' +
    'lo que sugiere que existe un "limite del puerto" definido. Se necesita saber si ese limite esta publicado ' +
    'en alguna parte con geometria, o si es una nocion que solo vive en el texto de cada resolucion.',
  a_quien: 'DIRECTEMAR, por el mismo canal por el que van las preguntas de consulta_directemar_registro.md.',
  aviso_sobre_la_via: 'Si la respuesta es que no hay geometria publicada del limite del puerto, la regla de D5 ' +
    'se puede escribir igual, pero su segunda mitad queda declarada como NO VERIFICABLE y eso tiene que estar ' +
    'en el texto del contrato, no en una bitacora.',
},
];

// ── ALTA ──────────────────────────────────────────────────────────────────────
const yaEstan = new Set(d.deudas.map(x => x.id));
let altas = 0;
for (const f of NUEVAS) {
  if (yaEstan.has(f.id)) { console.log('YA EXISTE, no se duplica: ' + f.id); continue; }
  d.deudas.push(f); altas++;
}

// ── ENMIENDAS A DOS FILAS DE PLAN-2 ──────────────────────────────────────────
const enmiendas = [
  {
    id: 'PLAN-2::procedencia-copia-congelada-mal-ubicada',
    campo: 'enmienda_2026_08_20',
    valor: 'La fila decia que la copia congelada y el fichero vivo compartian sha256 ' +
      '3a350d5ab3293ab2304e8029200ea6e42927e8e4b8b9d891ae36c533f8300b00 (1380 bytes). YA NO. Medido al ' +
      'arrancar esta sesion, ANTES de tocar nada: data/catalogo/estado_drift.json son los mismos 1380 bytes ' +
      'con sha256 1a3b52211d8adb0b1a79f8128b09f9dc587fb5cd596e4e054a2872824e662fc0, y tras arrancar el backend ' +
      '4ff4724b63cbceb613abce864a7eebf970f132a861659343163a7c2d2b104900 (unica linea que cambia: ultima_corrida). ' +
      'La divergencia es ESPERABLE —cada arranque pisa el fichero— y no invalida la fila: la agrava. La copia ' +
      'congelada ya no testimonia el estado actual sino el del 2026-08-19, y eso tiene que decirlo el puntero ' +
      'que esta fila pide escribir. Crudo en _bitacoras/tres_de_d4_2026-08-20/.',
  },
  {
    id: 'PLAN-2::la-lista-de-capitanias-atravesadas-no-existe-en-pantalla',
    campo: 'enmienda_2026_08_20',
    valor: 'LA FILA SIGUE VIVA Y NO SE TOCA POR S1: la ruta atraviesa Chonchi y la pantalla no lo nombra, y ' +
      'eso no depende de D5. Lo que SI se enmienda es su sub-bloque ' +
      '`el_mismo_mecanismo_produce_otro_fallo` —el caso de la bahia 114 CANAL CHACAO, que la ruta no cruza y ' +
      'que no le llega al patron—. Con D5 cerrada el 2026-08-20, NO MOSTRARLA ES LO CORRECTO y deja de ser un ' +
      'fallo. Por lo mismo, la linea `sostiene: "S1 y S2(c)"` queda en S1 solo: S2(c) esta ANULADA, no ' +
      'cumplida. Nota de honestidad: el hecho del 2026-08-20 no se puede re-observar hoy — la bahia 114 tiene ' +
      '0 filas vigentes en consultaRestricciones al 2026-08-20 13:00, control positivo la 117 con 1 fila y ' +
      'control negativo la 999 con 0. La anulacion no depende de re-observarlo: el enunciado se derogo, no se ' +
      'falsifico.',
  },
];
let enms = 0;
for (const e of enmiendas) {
  const f = d.deudas.find(x => x.id === e.id);
  if (!f) { console.log('NO ENCONTRADA para enmendar: ' + e.id); continue; }
  f[e.campo] = e.valor; enms++;
}

// ── COBERTURA: el sitio de esta sesion ───────────────────────────────────────
if (!d.cobertura.sitios.some(s => s.id === SITIO)) {
  d.cobertura.sitios.push({
    id: SITIO,
    repo: 'tmarea-backend',
    fichero: '_bitacoras/tres_de_d4_2026-08-20/',
    seccion_por_titulo: 'deudas que genera la propia sesion de D4, D5 y la celda',
    vocabulario_del_barrido: ['las cuatro mediciones pedidas por el owner: D4(1), D4(2), D4(3) y la celda'],
    orden: 2,
    barrido: true,
    barrido_el: '2026-08-20',
    filas_en_este_declarativo: NUEVAS.length,
    nota: 'Mismo precedente que SESION-caracterizacion-deudas-2026-08-19: una sesion de medicion es un sitio ' +
      'de deuda propio. NO se marca barrido PLAN-5-DECISIONES, que sigue en false: esta sesion midio D4 y D5, ' +
      'no barrio §5.',
    bitacora: '_bitacoras/tres_de_d4_2026-08-20/',
  });
}

d.version = (d.version || 1) + 1;
d.generado = '2026-08-20';

fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });

// ── CONTEO, PUBLICADO ────────────────────────────────────────────────────────
const filas = d.deudas.length;
const unicas = d.deudas.filter(x => !x.duplicada_de).length;
const vivas = d.deudas.filter(x => x.estado === 'viva' && !x.duplicada_de).length;
const sitios = d.cobertura.sitios.length;
const barridos = d.cobertura.sitios.filter(x => x.barrido).length;
console.log(`altas ${altas} · enmiendas ${enms}`);
console.log(`filas ${filas} · unicas ${unicas} · vivas ${vivas} · sitios ${sitios} · barridos ${barridos}`);
console.log(`suma de filas_en_este_declarativo por sitio: ${d.cobertura.sitios.reduce((a, s) => a + (s.filas_en_este_declarativo || 0), 0)}`);
