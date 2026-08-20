// Escribe en data/deudas/deudas_declaradas.json:
//   1 ENMIENDA  PLAN-2::zarpe-y-recalada-entran-como-transito -> 4_caduca (G7)
//   4 FILAS     dos del gate (metodo) + dos preguntas del grupo 2
//   1 SITIO     SESION-plan-de-cierre-2026-08-20, que ademas va a SITIOS_CANON
//
// Se corre con `node 01_escribir_filas.js`. Deja el fichero y lo dice.
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = 'C:/Users/katia/tmarea-backend';
const F = path.join(RAIZ, 'data/deudas/deudas_declaradas.json');
const V = path.join(RAIZ, 'scripts/validar_deudas_declaradas.js');
const SITIO = 'SESION-plan-de-cierre-2026-08-20';

const D = JSON.parse(fs.readFileSync(F, 'utf8'));
const antes = {
  filas: D.deudas.length,
  vivas: D.deudas.filter(x => !x.duplicada_de && !['cerrada', 'caduca'].includes(x.estado)).length,
  sitios: D.cobertura.sitios.length,
};

// ---------------------------------------------------------------------------
// 1 . LA ENMIENDA — G7
// ---------------------------------------------------------------------------
const z = D.deudas.find(x => x.id === 'PLAN-2::zarpe-y-recalada-entran-como-transito');
if (!z) { console.error('ALTO: no esta la fila de G7'); process.exit(1); }
if (z.grupo !== '1_cierra_con_lo_que_hay' || z.estado !== 'viva') {
  console.error('ALTO: la fila de G7 no esta como el gate la midio'); process.exit(1);
}

z.grupo = '4_caduca';
z.estado = 'caduca';

// los dos campos que exigia el grupo 1 se RETIRAN: describian un trabajo que la
// decision del owner elimino. Se dice que se retiraron y que decian.
delete z.costo_estimado;
delete z.depende_de;

z.afirmacion_que_ya_es_falsa =
  'Que la bahia del puerto de zarpe y la de la recalada NO deben aparecer en la lista de transito. ' +
  'La fila pedia mandar los dos ids para que el backend las excluyera, o sea DEDUPLICAR. ' +
  'D4, firmada por el owner el 2026-08-20, decidio lo contrario y con esas palabras: EL DATO DUPLICADO ' +
  'SE MANTIENE — zarpe y recalada se quedan en la lista porque el trazado los navega, y bajo D5 corresponde. ' +
  'Y la afirmacion de §2 que la sostenia, S5(b), no esta incumplida: esta ANULADA.';

z.medicion = {
  hecha_el: '2026-08-20',
  instrumento:
    'Lectura del arbol y del historial, sin levantar servidores. (a) El mensaje de 5fc17cc en tmarea-backend, ' +
    'que trae la regla de D4 textual. (b) §2 de PLAN_JURISDICCION.md, bloque de S5, con el tachado a la vista ' +
    'y su recuadro «REESCRITA el 2026-08-20 por D4», que termina en «Consecuencia sobre la medicion: S5(b) ' +
    'queda ANULADA». (c) La salida de `npm run cifra`, que es el unico emisor correcto de la cifra. ' +
    '(d) Barrido literal «zona intermedia» sobre tmarea-pwa/src, con control positivo «ETA» = 42 ficheros-linea ' +
    'en el mismo arbol y control negativo «ZZQXNOEXISTE» = 0.',
  resultado:
    'La regla firmada es la contraria a la que esta fila pedia. `npm run cifra` publica «4 de 15, con 2 anuladas ' +
    'por decision del owner», y nombra a S5(b) como una de las dos anuladas por D4. La MITAD de esta fila que D4 ' +
    'si mantuvo viva —corregir la palabra, porque «zona intermedia» afirmaba una POSICION falsa sobre el muelle ' +
    'del que el patron zarpa— YA ESTA APLICADA en tmarea-pwa por df26887: el barrido de «zona intermedia» sobre ' +
    'tmarea-pwa/src da 2 apariciones y las DOS son PROSA, el comentario que explica el cambio. Cero en texto al ' +
    'patron. O sea: no queda nada vivo debajo de esta fila, y se dice en vez de dejarlo suponer.',
  salida_cruda_en: '_bitacoras/plan_de_cierre_2026-08-20/',
};

z.enmienda_2026_08_20 =
  'CADUCADA POR EL GATE DEL PLAN DE CIERRE, decision del owner del 2026-08-20, opcion (a) de las tres que el ' +
  'gate ofrecio. No se cierra: MURIO, que es lo que el grupo 4 significa. Se retiran `costo_estimado` y ' +
  '`depende_de`, que el grupo 1 exigia y que describian un trabajo que ya no existe; decian, textual, «Bajo: ' +
  'los dos ids ya existen en voyageData. El riesgo esta en elegir CUAL id, porque el puerto y la bahia no son ' +
  'la misma unidad» y «Nada abierto.». Ese «Nada abierto» era justamente lo falso: D4 ya estaba firmada. ' +
  'La linea `sostiene` de la evidencia se conserva SIN BORRAR —dice «S5(b).»— porque es el registro de contra ' +
  'que criterio se escribio la fila; lo que se agrega es que ese criterio esta anulado.';

z.evidencia_en_el_arbol.sostiene_ANULADA_2026_08_20 =
  'S5(b) esta ANULADA por D4, no incumplida. La linea `sostiene` de arriba queda como estaba, a la vista, ' +
  'porque hacerla desaparecer volveria incomprensible por que esta fila llego a escribirse.';

z.por_que_esta_fila_importa_aunque_este_muerta =
  'Porque estuvo VIVA, en el grupo 1_cierra_con_lo_que_hay, con `depende_de: "Nada abierto."`, durante todo el ' +
  'intervalo entre la firma de D4 y este gate. Cualquiera que hubiera tomado el declarativo como plan de trabajo ' +
  'habria des-firmado una decision del owner creyendo que cerraba una deuda. Ver la fila hermana ' +
  SITIO + '::una-anulacion-de-spec-no-propaga-sola.';

// ---------------------------------------------------------------------------
// 2 . LAS CUATRO FILAS NUEVAS
// ---------------------------------------------------------------------------
const base = {
  token_local: null,
  espacio_de_nombres: 'sesion del plan de cierre 2026-08-20',
  sitio: SITIO,
  texto_literal: null,
  sin_texto: true,
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  duplicada_de: null,
  redactada_no_aplicada: true,
};

const nuevas = [];

// --- FILA 1 DEL GATE · el metodo, de G7 ------------------------------------
nuevas.push(Object.assign({}, base, {
  id: SITIO + '::una-anulacion-de-spec-no-propaga-sola',
  repo: 'tmarea-backend',
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  titulo:
    'Una decision del owner que ANULA una afirmacion de la especificacion no propaga sola al declarativo: ' +
    'propago a una fila de dos, y ningun control lo caza',
  nota_fecha:
    'El documento no fecha esta deuda: no estaba escrita en ninguna parte. Nace del gate de la sesion del ' +
    'plan de cierre del 2026-08-20, cuya salida cruda vive en _bitacoras/plan_de_cierre_2026-08-20/.',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_hecho:
      'El 2026-08-20 se anularon DOS afirmaciones de §2 por decision del owner: S2(c) por D5 y S5(b) por D4. ' +
      'Cada una tenia una fila del declarativo que la declaraba en su campo `sostiene`. UNA de las dos fue ' +
      'enmendada el mismo dia y la otra no.',
    la_que_si:
      'PLAN-2::la-lista-de-capitanias-atravesadas-no-existe-en-pantalla lleva un campo `enmienda_2026_08_20` ' +
      'que dice, textual: «la linea `sostiene: "S1 y S2(c)"` queda en S1 solo: S2(c) esta ANULADA, no cumplida».',
    la_que_no:
      'PLAN-2::zarpe-y-recalada-entran-como-transito quedo VIVA, en el grupo 1_cierra_con_lo_que_hay, con ' +
      '`sostiene: "S5(b)."` y `depende_de: "Nada abierto."`, pidiendo exactamente lo que D4 rechazo. ' +
      'La caduco este gate, veinte dias despues de nada y el mismo dia de la firma.',
    por_que_ningun_control_lo_caza:
      'El validador del declarativo comprueba FORMA: que la fila tenga su grupo, sus campos obligatorios, su ' +
      'sitio en la cobertura y su `donde` por seccion y texto. Una fila con todos sus campos en orden que ' +
      'sostiene una afirmacion derogada es FORMALMENTE PERFECTA. Es la misma familia que este declarativo ya ' +
      'tiene fichada en doce defectos de instrumento: corre perfecto y afirma otra cosa.',
    lo_que_hace_falta_y_no_existe:
      'Nada ata el campo `sostiene` de una fila al vocabulario VIVO de la especificacion. El emisor de la cifra ' +
      'ya sabe cuales estan anuladas —las nombra una por una con su decision y su fecha— asi que el dato para ' +
      'cazarlo existe y esta en el arbol; lo que no existe es quien lo cruce.',
    el_alcance_real_de_la_deuda:
      'No es sobre §2 solamente. Es sobre cualquier campo de una fila que cite un enunciado externo que puede ' +
      'derogarse: `sostiene` hoy, y manana la cita de un invariante del contrato. La fila hermana que ya existe ' +
      'sobre lo mismo, en otro eje, es SESION-caracterizacion-deudas-2026-08-19::nada-ata-categoria-contractual-al-contrato.',
  },
  donde: {
    fichero: 'tmarea-backend/scripts/validar_deudas_declaradas.js',
    seccion_por_titulo: 'el bucle «por fila: V2 y V7», donde se comprueban los campos que cada grupo exige',
    cita_de_anclaje:
      'el bloque que valida los campos obligatorios por grupo, contra el campo `sostiene` de las filas de ' +
      'PLAN-2, que ningun control mira',
  },
  costo_estimado:
    'Bajo para el cruce: el emisor de la cifra ya publica la lista de afirmaciones anuladas con su decision y ' +
    'su fecha, y el validador ya recorre todas las filas. Es un control mas en un instrumento que existe y que ' +
    'ya corre en cada sesion. ALTO si se quiere general —atar cualquier cita a cualquier documento vivo—, y ese ' +
    'no es el alcance que esta fila pide.',
  depende_de:
    'Nada abierto. El dato de las anuladas ya esta en el arbol y ya tiene emisor unico.',
  medicion: '_bitacoras/plan_de_cierre_2026-08-20/, apartado 0, hallazgo G7.',
}));

// --- FILA 2 DEL GATE · G8 ---------------------------------------------------
nuevas.push(Object.assign({}, base, {
  id: SITIO + '::un-entregable-que-solo-vive-en-el-chat-no-existe',
  repo: 'tmarea-backend',
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  titulo:
    'El plan de cierre anterior no existio en ningun arbol: ni fichero, ni bitacora. Vivio solo en el ' +
    'transcript de la sesion que lo produjo',
  nota_fecha:
    'El documento no fecha esta deuda: no estaba escrita en ninguna parte. Nace del gate de la sesion del ' +
    'plan de cierre del 2026-08-20, cuya salida cruda vive en _bitacoras/plan_de_cierre_2026-08-20/.',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_barrido:
      'Patron literal «brecha» —ASCII, alcanza «brechas»— sobre los DOS arboles enteros, todas las extensiones, ' +
      'excluyendo node_modules y .git: CERO ficheros en tmarea-backend y CERO en tmarea-pwa.',
    los_controles_positivos:
      'Del mismo barrido y del mismo arbol, para probar que el grep alcanza: «declarativo» da 81 ficheros en ' +
      'tmarea-backend y «restriccion» da 11 ficheros en tmarea-pwa. El instrumento llega; el texto no esta.',
    donde_si_estaba:
      'En el transcript de la sesion, fuera de los dos repositorios: linea 266, 37.808 caracteres. El prompt que ' +
      'lo pidio esta en la linea 3 del mismo fichero. Se pudo recuperar entero, y por eso el plan nuevo pudo ' +
      'medirse contra el viejo — pero eso fue suerte de conservacion, no una propiedad del proceso.',
    por_que_es_deuda_y_no_una_anecdota:
      'Es el modo de falla que este declarativo enuncia sobre si mismo, textual en su propio motivo: «cuatro o ' +
      'cinco inventarios de deudas no cerraron nada porque vivian en la bitacora de la sesion que los creo». ' +
      'El plan anterior estaba un escalon PEOR: ni bitacora tuvo. Y no es una deuda de aquella sesion: es una ' +
      'deuda del proceso, porque nada le pidio que dejara fichero.',
    lo_que_este_commit_cierra_y_lo_que_no:
      'Este commit pone el plan NUEVO en el arbol, con su bitacora y bajo control de versiones. Eso cierra la ' +
      'INSTANCIA. NO cierra la CLASE: sigue sin haber ninguna regla ni ningun control que diga que un entregable ' +
      'de una sesion tiene que aterrizar en el arbol antes de que la sesion termine. Por eso la fila queda VIVA ' +
      'y no cerrada, y lo dice en vez de dejar que el conteo lo insinue.',
    la_fila_hermana_que_ya_existe:
      'SESION-caracterizacion-deudas-2026-08-19::declarativo-que-nadie-abre dice lo mismo en el otro extremo del ' +
      'ciclo: un declarativo que nadie abre al arrancar tiene el mismo defecto que la bitacora que nadie reabre. ' +
      'Esta fila es su gemela de salida: un entregable que nadie escribe al terminar.',
  },
  donde: {
    fichero: 'tmarea-backend/CLAUDE.md',
    seccion_por_titulo:
      'la seccion de convenciones de sesion, que es donde viven las reglas de como se cierra una sesion',
    cita_de_anclaje:
      'la ausencia de cualquier regla que exija que el entregable de una sesion quede en el arbol; el hueco ' +
      'esta donde estan las reglas de bitacora y de commit',
  },
  costo_estimado:
    'Minimo si alcanza con una regla escrita. Medio si se quiere control: «una sesion que produce un entregable ' +
    'deja un fichero» no se puede assertear sin definir que es un entregable, y esa definicion es del owner. ' +
    'La regla sin control corrige el olvido; no lo detecta.',
  depende_de:
    'Nada abierto. Pero cae en CLAUDE-MD, que es uno de los NUEVE sitios sin barrer, y se dice: la fila esta ' +
    'escrita aca porque la produjo esta sesion, no porque CLAUDE-MD se haya barrido. Sigue en false.',
  medicion: '_bitacoras/plan_de_cierre_2026-08-20/, apartado 0, hallazgo G8, y su barrido declarado en el apartado 9.',
}));

// --- FILA 3 · grupo 2 · el color de lo que no se pudo traer -----------------
nuevas.push(Object.assign({}, base, {
  id: SITIO + '::color-del-dato-que-no-se-pudo-traer',
  repo: 'tmarea-pwa',
  grupo: '2_decision_del_owner',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  titulo:
    'Que color lleva en pantalla un dato que la app no pudo traer. Hoy lleva VERDE, y el texto de abajo dice ' +
    'lo contrario que el color',
  nota_fecha:
    'El documento no fecha esta deuda: no estaba escrita en ninguna parte, ni siquiera como pregunta. El plan ' +
    'de cierre anterior ya la habia nombrado como decision faltante el 2026-08-20 y seguia sin existir como ' +
    'fila. Salida cruda en _bitacoras/plan_de_cierre_2026-08-20/.',
  pregunta:
    'Cuando la app NO PUDO traer un dato —el servicio no contesto, o el motor no pudo evaluar—, ¿que color lleva ' +
    'ese bloque en pantalla? Hoy el bloque del clima se pinta VERDE con el rotulo «Condicion Normal» y justo ' +
    'debajo dice que no se pudieron obtener los datos: el color afirma una cosa y el texto afirma la contraria, ' +
    'en la misma tarjeta. Las opciones son tres. (a) La carencia tiene color PROPIO, distinto de los tres del ' +
    'veredicto, y el patron aprende un cuarto simbolo. (b) La carencia toma el AMBAR, igual que una precaucion, ' +
    'y el patron no aprende nada nuevo pero deja de poder distinguir «hay un problema» de «no sabemos si lo hay». ' +
    '(c) La carencia NO tiene color: el bloque se dibuja en gris neutro y sin estado, como ya se hace con las ' +
    'restricciones que no le aplican a la nave. ¿Cual de las tres, y vale para todos los bloques o solo para ' +
    'los que hoy pintan verde?',
  por_que_es_del_owner:
    'Es producto puro y no tiene cita normativa. Ninguna norma dice de que color se pinta la ignorancia de una ' +
    'app. Precedente D15: una decision de producto se escribe declarando que NO la respalda una norma, para que ' +
    'nadie salga a buscarle una.',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_caso_medido:
      'Con el backend caido, la pantalla de verificacion del viaje muestra el bloque de clima en VERDE con el ' +
      'rotulo «Condicion Normal» e inmediatamente debajo «No se pudo obtener datos de clima», mientras las dos ' +
      'tarjetas de puerto estan en ambar. Verde y ambar en la misma pantalla, y el verde encima de un fallo.',
    el_segundo_caso:
      'La pantalla lacustre muestra dos puertos en verde «Abierto» sobre un viaje cuya ruta no se pudo trazar.',
    el_tercero_que_no_es_de_color_pero_es_el_mismo_defecto:
      'La pantalla de carga marca con tilde verde «Conectando con SITPORT» y «Consultando condiciones ' +
      'meteorologicas» mientras los dos fallaban.',
    que_afirmacion_de_la_spec_toca:
      'S6(b) —«No hay verde con algo ambar en la misma pantalla»— y por el otro lado S8 —«Cuando el motor no ' +
      'puede evaluar algo, lo dice»—. Las dos estan hoy en NO CUMPLE. La mitad de S8 se puede cerrar SIN esta ' +
      'decision, porque distinguir «no se pudo preguntar» de «no hay nada» no necesita elegir un color. La ' +
      'mitad de S6(b) NO se puede cerrar sin ella.',
    por_que_no_lo_decide_el_agente:
      'Porque la opcion (b) tiene un costo que solo el owner puede aceptar: fundir en el mismo ambar «hay un ' +
      'problema» y «no sabemos si lo hay» le quita al patron una distincion que hoy no tiene pero que podria ' +
      'tener. Y la (a) le agrega un simbolo a una pantalla que ya usa tres.',
    salida_cruda: '_bitacoras/spec2_pantalla_2026-08-20/ para los tres casos; _bitacoras/plan_de_cierre_2026-08-20/ para la unidad U3.',
  },
  donde: {
    fichero: 'tmarea-pwa/src/components/verification/WeatherBlock.jsx',
    seccion_por_titulo: 'el render del bloque de clima, y su estado cuando el fetch no devolvio datos',
    cita_de_anclaje:
      'el rotulo «Condicion Normal» dibujado en verde sobre la linea «No se pudo obtener datos de clima», en la ' +
      'misma tarjeta',
  },
  medicion: '_bitacoras/spec2_pantalla_2026-08-20/, §3, veredictos S6(b) y S8.',
}));

// --- FILA 4 · grupo 2 · trayecto o extremos ---------------------------------
nuevas.push(Object.assign({}, base, {
  id: SITIO + '::jurisdiccion-por-trayecto-o-por-extremos',
  repo: 'tmarea-backend',
  grupo: '2_decision_del_owner',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  titulo:
    'La condicion jurisdiccional de un viaje, ¿se responde por el TRAYECTO o por los EXTREMOS? Es la decision ' +
    'sin escribir que mas plata mueve del tablero, y la medicion va al lado',
  nota_fecha:
    'El documento no fecha esta deuda: no estaba escrita en ninguna parte, ni como fila ni como pregunta. Nace ' +
    'de la unidad U7 del plan de cierre del 2026-08-20. Salida cruda en _bitacoras/plan_de_cierre_2026-08-20/.',
  pregunta:
    'La especificacion promete que quien navega en un lago ve la condicion de su lago. Hoy eso se responde ' +
    'preguntando por el TRAYECTO: primero se calcula la ruta y despues se pregunta la jurisdiccion de lo que ' +
    'esa ruta atraviesa. Esa cadena es NUESTRA ARQUITECTURA, no el requisito, y en los cuatro lagos que tienen ' +
    'puerto en el catalogo la primera mitad falla, asi que la segunda no llega a preguntarse nunca. ' +
    '¿La condicion jurisdiccional de un viaje se responde por el TRAYECTO —lo que la ruta efectivamente ' +
    'atraviesa— o basta con los EXTREMOS —zarpe y recalada, que el patron ya declaro antes de que exista ' +
    'ninguna ruta? Y si la respuesta es «depende», ¿de que depende: del tipo de agua, de la distancia, o de si ' +
    'hay ruta calculada? ' +
    'LA MEDICION VA AL LADO PORQUE ES LA QUE HACE CARA A LA PREGUNTA. Por TRAYECTO: hay que cambiar la fuente ' +
    'de agua del pipeline del raster y regenerar tiles —el mayor pesa 213.639.480 bytes y son 16.785 por 6.364 ' +
    'celdas a 50 metros, medido hoy sobre el fichero y su descriptor—, extender los extents de dos tiles, ' +
    'volver a correr los controles de conectividad, y correr una regresion obligatoria sobre las rutas ' +
    'maritimas que HOY FUNCIONAN, porque la mascara del raster maritimo cambia con ellas. Por EXTREMOS: son ' +
    'dos consultas de punto contra seis geometrias que ya estan publicadas, y cero motor de rutas. ' +
    'La misma promesa, dos ordenes de magnitud de distancia.',
  por_que_es_del_owner:
    'Es una decision de ARQUITECTURA con consecuencia de producto, y ninguna medicion la contesta: se puede ' +
    'medir cuanto cuesta cada camino —y esta fila lo trae— pero no cual de los dos es la promesa que la app ' +
    'le hace al patron. Precedente D11, donde el owner corrigio la pregunta antes de contestarla.',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    lo_que_esta_medido_y_no_se_re_mide:
      'Las cuatro jurisdicciones lacustres publicadas que tienen puerto en el catalogo fallan en el motor de ' +
      'rutas, 4 lagos por 3 clases = 12 fallas, con control positivo de que las maritimas del mismo motor si ' +
      'calculan. Dos fallan por enganche y dos por cobertura de tiles.',
    lo_que_esta_MEDIDO_HOY_del_costo:
      'El fichero del tile mayor pesa 213.639.480 bytes; su descriptor declara 6.364 columnas por 16.785 filas ' +
      'a 50 m de resolucion, dtype uint16. Eso es dato del disco, no estimacion.',
    lo_que_es_INFERENCIA_Y_VA_MARCADO:
      'QUE la causa sea que la mascara de agua se construyo con datos del OCEANO es INFERENCIA FUERTE, no ' +
      'medicion. La FUENTE si esta verificada por partida doble —la cabecera del script de build la declara, y ' +
      'el descriptor del propio tile la repite en su bloque de fuentes: water-polygons-split-4326, que se deriva ' +
      'de la linea de costa y por lo tanto no trae lagos interiores—. Lo que NADIE hizo es abrir el raster y ' +
      'comprobar que las celdas del lago valen 0. El instrumento para hacerlo EXISTE en el arbol, se llama ' +
      'check_control_points, y los tiles estan en disco. Es barato y no se corrio.',
    la_medicion_que_puede_ahorrar_todo_lo_demas:
      'Para los cuatro lagos: ¿zarpe y recalada caen en la MISMA jurisdiccion lacustre publicada? En un lago es ' +
      'lo esperable, porque la jurisdiccion es del tamano del lago. Si caen, el camino por EXTREMOS contesta la ' +
      'promesa entera sin tocar el raster. Si no caen, el trayecto importa y hay que discutir el raster — pero ' +
      'con el numero en la mano.',
    la_nota_de_alcance_que_no_rescata_y_va_pegada:
      'Hoy la autoridad no publica ni una restriccion ni un pronostico para ninguna de las seis jurisdicciones ' +
      'lacustres publicadas: 0 de 6. Cerrar el camino hace que se PUEDA preguntar; no garantiza que haya ' +
      'respuesta. Elegir el camino caro para despues no recibir nada es un riesgo que va escrito antes de la ' +
      'firma, no despues.',
    por_que_la_pregunta_es_mas_grande_que_el_lago:
      'Si la respuesta es «por extremos», no cambia solo el lago: cambia el sitio donde la app decide que ' +
      'jurisdicciones nombrar, y eso toca tambien lo maritimo, donde hoy el trayecto SI se calcula bien. La ' +
      'pregunta se abre en el lago porque ahi el trayecto falla, pero se contesta para toda la app.',
    salida_cruda: '_bitacoras/spec2_pantalla_2026-08-20/ y _bitacoras/plan_de_cierre_2026-08-20/, unidad U7.',
  },
  donde: {
    fichero: 'tmarea-backend/PLAN_JURISDICCION.md',
    seccion_por_titulo: '2. ESPECIFICACION — QUE VE EL PATRON CUANDO ESTO ESTE TERMINADO, punto S4',
    cita_de_anclaje:
      'la frase «Si navega en un lago, ve la condicion de su lago», que no dice por que camino se responde, y ' +
      'la ausencia de cualquier punto que lo diga',
  },
  medicion: '_bitacoras/plan_de_cierre_2026-08-20/, unidad U7; y _bitacoras/spec2_pantalla_2026-08-20/, veredicto S4.',
}));

// ---------------------------------------------------------------------------
// 3 . EL SITIO — a los DOS lados
// ---------------------------------------------------------------------------
if (D.cobertura.sitios.some(s => s.id === SITIO)) { console.error('ALTO: el sitio ya existe'); process.exit(1); }

D.deudas.push(...nuevas);

D.cobertura.sitios.push({
  id: SITIO,
  repo: 'tmarea-backend',
  fichero: '_bitacoras/plan_de_cierre_2026-08-20/',
  seccion_por_titulo: 'deudas que genera el gate y el plan de cierre, rehecho entero',
  vocabulario_del_barrido: [
    'los ocho hallazgos del gate, G1 a G8: cuales sobreviven como deuda y cuales son correccion de rotulo',
    'las decisiones que el plan descubrio que NO existen como fila: el color de la carencia y el camino de la jurisdiccion',
  ],
  orden: 3,
  barrido: true,
  barrido_el: '2026-08-20',
  filas_en_este_declarativo: 4,
  nota:
    'Mismo precedente que SESION-caracterizacion-deudas-2026-08-19, SESION-tres-de-d4-2026-08-20 y ' +
    'SESION-limite-puerto-12100-47-2026-08-20: una sesion es un sitio de deuda propio. Esta sesion NO midio el ' +
    'producto: leyo los dos arboles, el declarativo contra el indice, las bitacoras, y el plan anterior — que ' +
    'no estaba en ningun arbol, y esa es una de las cuatro filas. Este sitio NO marca barrido ningun otro: ' +
    'PLAN-5-DECISIONES y CLAUDE-MD siguen en false aunque dos de estas cuatro filas caigan cerca de ellos, y se ' +
    'dice en el `depende_de` de cada una. De los cuatro hallazgos del gate que producian escritura, DOS ' +
    'quedaron fuera por decision del owner: los cuatro sitios donde el plan todavia dice que D4 sigue abierta ' +
    'los pega el owner como texto —opcion (c) de las tres que el gate ofrecio—, y S7(a) no se firma hoy porque ' +
    'el owner quiere mirarla en pantalla antes.',
  bitacora: '_bitacoras/plan_de_cierre_2026-08-20/',
});

// la canon del validador — el otro lado
let v = fs.readFileSync(V, 'utf8');
const ancla = "  'SESION-limite-puerto-12100-47-2026-08-20',\n";
if (!v.includes(ancla)) { console.error('ALTO: no encontre el ancla en la canon'); process.exit(1); }
if (v.includes(SITIO)) { console.error('ALTO: el sitio ya esta en la canon'); process.exit(1); }
v = v.replace(ancla, ancla + "  '" + SITIO + "',\n");
fs.writeFileSync(V, v, 'utf8');

// version y generado
D.version = 7;
D.generado = '2026-08-20';

fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');

const despues = {
  filas: D.deudas.length,
  vivas: D.deudas.filter(x => !x.duplicada_de && !['cerrada', 'caduca'].includes(x.estado)).length,
  sitios: D.cobertura.sitios.length,
};
console.log('ESCRITO.');
console.log('  filas  ' + antes.filas + ' -> ' + despues.filas);
console.log('  vivas  ' + antes.vivas + ' -> ' + despues.vivas);
console.log('  sitios ' + antes.sitios + ' -> ' + despues.sitios);
console.log('  enmendada: PLAN-2::zarpe-y-recalada-entran-como-transito  1_cierra_con_lo_que_hay/viva -> 4_caduca/caduca');
nuevas.forEach(n => console.log('  nueva: ' + n.id + '  [' + n.grupo + ']'));
console.log('  canon del validador: ' + SITIO + ' agregado');
console.log('  fichero existe: ' + fs.existsSync(F) + ' · validador existe: ' + fs.existsSync(V));
