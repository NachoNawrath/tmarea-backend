// Escribe en el declarativo las OCHO decisiones firmadas por el owner el 2026-08-20
// y reencuadra la fila de la pieza 2 de E7 como pregunta AGENDADA.
// NO cambia ningun estado: 'cerrada' esta reservado por el vocabulario del propio
// declarativo para cuando SE HIZO EL TRABAJO, y en esta sesion no se implementa nada.
const fs = require('fs');
const RUTA = 'data/deudas/deudas_declaradas.json';
const D = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
const por = id => {
  const x = D.deudas.find(y => y.id === id);
  if (!x) { console.error('NO EXISTE la fila ' + id); process.exit(1); }
  return x;
};
const FIRMA = {
  firmada: true,
  fecha: '2026-08-20',
  que_significa_esta_firma: 'El owner firmo la RESPUESTA A LA PREGUNTA, no el trabajo. La fila sigue VIVA a proposito: el vocabulario de estado de este declarativo reserva "cerrada" para cuando se hizo el trabajo, y el propio validador rotula ese numero como "CERRADAS por trabajo". Una decision no es el trabajo. Nadie debe leer esta firma como una deuda cerrada.'
};
const NOTA_ESTADO = 'DECIDIDA Y NO CERRADA. El grupo dice QUE HACE FALTA para cerrarla y el estado dice si ya se hizo: lo que hacia falta era la decision del owner y ya esta; lo que falta es el trabajo, y en la sesion del 2026-08-20 se decidio explicitamente no implementar nada. Cuando el trabajo se haga, la fila cierra con su evidencia.';
const marcar = (x, bloque, queda) => {
  x.firma_owner = Object.assign({}, FIRMA);
  x.decision_del_owner = bloque;
  x.lo_que_queda = queda;
  x.por_que_sigue_viva = NOTA_ESTADO;
};

// -- 1 -----------------------------------------------------------------------
marcar(por('PLAN-2::licencia-de-bahia-en-ruta-costera-sin-aviso'), {
  fecha: '2026-08-20',
  LA_REGLA: 'Cuando la travesia planificada excede el alcance de la licencia declarada, la app AVISA. El aviso escala el veredicto a U y NUNCA a U+V: informa el limite, no prohibe la salida.',
  el_fundamento: {
    normativo_y_es_de_la_propia_app: 'El RGDN Art. 12 no lo trajo el agente a la conversacion: lo cita la propia pantalla al pedir el dato, con el texto "Tu licencia determina el ambito de navegacion habilitado (RGDN Art. 12)." Una app que promete determinar el ambito habilitado y despues calla en el caso mas claro no queda incompleta: queda FALSA en un punto que el patron usa para decidir.',
    coherencia_con_D5: 'El fundamento con que el owner cerro D5 dice, textual, que "la app es informativa: entrega una opcion de ruta segun el trazado normado en el TM-008. Es el patron quien, con el instrumento de navegacion de su barco, aplica ese trayecto". Avisar es exactamente eso.',
    por_que_U_y_no_U_mas_V: 'Mismo trato que S3 le da a la Capitania sin limite cargado: "Escala el veredicto a U, nunca a U+V". Se informa el limite; no se le prohibe salir.'
  },
  las_consecuencias: {
    la_distancia_entra_en_la_pregunta: 'Hoy, cuando la clasificacion es de bahia, el ambito se fija en "bahia" ANTES de llamar al validador y sin mirar la distancia de la ruta. La regla exige que la distancia real de la ruta entre en la pregunta.',
    un_test_cambia_y_esta_bien: 'La suite prueba hoy lo contrario a proposito, con el nombre puesto. Ese test es la decision vieja escrita SOLO en codigo: al cambiar la decision cambia el test, y deja de ser una regla de producto que vive escondida en una asercion.',
    el_caso_medido_que_se_cierra: 'Patron Deportivo de Bahia, nave de bahia a motor, Caleta Pesquera Quellon -> Caleta Pesquera San Rafael, 84,3 millas nauticas por canales abiertos de Chiloe: hoy bandera Q, cero motivos, y cero apariciones de "licencia", "no habilit" e "ilegal" en toda la pantalla.'
  },
  ESTA_NO_SE_APLICA_TODAVIA_Y_TAMPOCO_SE_CIERRA: {
    de_que_depende: 'De la decision sobre si el uso declarado de la nave sigue gobernando algo.',
    medido_el_2026_08_20: 'El veredicto deportivo entero y la alerta de licencia en la pantalla de armado del viaje SOLO se construyen dentro de la rama que exige uso "recreativo". El perfil deportivo se arma si el uso es recreativo Y ademas hay licencia, clasificacion y propulsion cargadas; si esa rama no corre, el motor no recibe perfil deportivo ni navegacion deportiva y no hay veredicto deportivo que avisar. Y el selector de licencia que muestra la promesa del RGDN Art. 12 solo se dibuja cuando el uso es recreativo.',
    la_consecuencia_practica: 'Aplicar esta regla antes de decidir que abre la rama deportiva seria construir el aviso adentro de una puerta que puede desaparecer. Por eso el owner la firmo y NO la mando a implementar.'
  }
}, 'Decidir primero que gobierna la rama deportiva. Despues: que la distancia real de la ruta entre en la pregunta al validador, el aviso propio con su cita, y el test que hoy prueba lo contrario reescrito con la decision nueva.');

// -- 2 -----------------------------------------------------------------------
marcar(por('PLAN-2::spec-no-cubre-p4'), {
  fecha: '2026-08-20',
  LA_REGLA: 'La especificacion cubre TAMBIEN la pantalla del viaje activo, y con un criterio propio y ACOTADO: mientras navega, al patron se le dice LO QUE CAMBIO respecto de lo que verifico antes de zarpar. No los nueve puntos.',
  el_fundamento: {
    seguridad_del_patron: 'La verificacion hecha en tierra CADUCA durante la travesia. La auditoria del fundamento del 2026-08-10 lo dice textual: "las restricciones de SITPORT cambian por hora". El unico momento en que una restriccion nueva puede hacerle cambiar el rumbo es cuando esta navegando, y hoy esa pantalla no pregunta nada.',
    por_que_acotado_y_no_los_nueve: 'Pedirle los nueve puntos a la pantalla del agua es pedirle que sea la otra pantalla: cara de construir y ruidosa para alguien que esta gobernando. Un solo criterio, verificable, y la deuda de infraestructura queda acotada a "esta pantalla tambien pregunta".'
  },
  las_consecuencias: {
    la_pantalla_del_agua_pasa_a_tener_criterio: 'Hoy no tiene ninguno: pesa 45.326 bytes, no usa el hook de verificacion y no importa ninguno de los 8 bloques de verificacion.',
    el_ambito_de_la_especificacion_deja_de_ser_nota_al_pie: 'La especificacion era contrastable solo contra la pantalla de antes de zarpar, y su ambito viajaba declarado en el veredicto de cada medicion. Con el punto nuevo, el ambito queda escrito en la propia especificacion.',
    lo_que_NO_cambia: 'La cifra de la medicion del 2026-08-20 no se recalcula: se midio en el unico ambito contra el que la especificacion era contrastable ese dia, y asi quedo declarada.'
  }
}, 'Escribir el punto en la especificacion. Es texto de producto y lo escribe el owner. El cableado de la pantalla del viaje activo ya tiene su propia fila en el grupo 1.');

// -- 4 -----------------------------------------------------------------------
marcar(por('D4D5::puerto-escala-lo-que-declara-no-aplicable'), {
  fecha: '2026-08-20',
  LA_REGLA: 'El estado del puerto sigue escalando el veredicto SIEMPRE, porque es un estado del LUGAR y no un veredicto por nave. Lo que cambia es el TEXTO: el motivo tiene que decir, en la misma linea, que el puerto tiene restriccion vigente y si esa restriccion le aplica o no a la nave.',
  el_fundamento: {
    coherencia_con_algo_ya_escrito: 'El backend ya lo declara donde emite el cierre: "Estado de puerto, no veredicto por nave: no depende del AB de quien pregunta". La regla no inventa un criterio nuevo: le da voz al que ya estaba.',
    seguridad_del_patron: 'El mal tiempo empeora, no mejora, en el rato entre que verifica y suelta amarras. Bajar el estado de un puerto porque hoy no le aplica a este arqueo seria ocultar un hecho del lugar que puede cambiar en horas.',
    que_era_lo_que_estaba_mal: 'No que subiera: que subiera SIN DECIR POR QUE. Eso es lo que violaba S6 -- "nunca se contradice con lo que hay debajo" -- y es lo que el texto arregla.'
  },
  las_consecuencias: {
    no_se_toca_la_composicion_del_maximo: 'El veredicto se sigue componiendo igual.',
    no_se_toca_la_API: 'El endpoint de puerto sigue sin recibir el arqueo bruto, y no le hace falta.',
    la_contradiccion_medida_se_cierra_por_el_texto: 'Las dos pasadas del 2026-08-20 sobre Quellon -> San Rafael con la unica restriccion vigente de Bahia Quellon: con AB 50 el motivo decia "Puerto de zarpe con restricciones" mientras la misma tarjeta decia "Tu embarcacion (AB 50) no esta afectada por esta restriccion". Con la regla, el motivo dice las dos cosas.'
  }
}, 'Escribir la cadena del motivo del veredicto para que nombre las dos cosas. Una cadena, un sitio.');

// -- 5 -----------------------------------------------------------------------
marcar(por('D4D5::abierto-y-con-restriccion-colapsados-en-pantalla'), {
  fecha: '2026-08-20',
  LA_REGLA: 'Dos rotulos separados: la CONDICION del puerto (abierto o cerrado) y las RESTRICCIONES VIGENTES (cuantas). Son dos hechos distintos del mismo lugar y no se funden en un color.',
  el_fundamento: {
    es_la_lectura_literal_de_S5_tal_como_el_owner_la_reescribio: 'S5 quedo, textual: "un hecho puede aparecer en mas de un bloque si sirve a mas de una decision; lo que no puede es que dos apariciones del mismo hecho digan cosas distintas sin decir cual manda". Aca no hay dos apariciones de un hecho: hay DOS HECHOS fundidos en uno, y el color se lo come al que decide si puede zarpar.',
    el_dato_ya_los_separa: 'Sobre las 20 filas de restriccion vigentes del 2026-08-20, 14 declaran cierre y 6 no. Tres de esas 6 son de tipo TODOS: Bahia Gregorio, Puerto Williams y Primera Angostura, las tres por viento. Un puerto puede tener restriccion vigente y NO estar cerrado.'
  },
  las_consecuencias: {
    queda_definido_que_significa_duplicado: 'El bloque de puerto cuenta el ESTADO del lugar y el de transito cuenta las RESTRICCIONES que la ruta encuentra. No cuentan lo mismo, y con dos rotulos la pantalla lo dice en vez de suponerlo.',
    lo_que_el_patron_deja_de_ver: 'Deja de ver el mismo amarillo para un puerto con aviso de viento fuera del limite portuario y para un puerto cerrado.'
  }
}, 'Separar el rotulo en el componente de la tarjeta de puerto. Un componente.');

// -- 6 -----------------------------------------------------------------------
marcar(por('D4D5::spec2-sin-punto-de-veracidad'), {
  fecha: '2026-08-20',
  LA_REGLA: 'La especificacion suma un punto que cubre VERACIDAD y solo veracidad: ningun mensaje afirma sobre la posicion, la nave o la norma algo que el dato emitido contradiga. El REGISTRO -- que este dicho en el idioma del patron -- queda como REGLA DE ESTILO que NO bloquea y NO es criterio de aceptacion.',
  el_fundamento: {
    veracidad_si_tiene_instrumento: 'Los dos casos del 2026-08-20 son de la misma forma: el mensaje le pone a un lugar un rol que el dato emitido contradice -- llamar "zona intermedia" al puerto de zarpe --. Eso se assertea, y por lo tanto se puede exigir.',
    registro_no_lo_tiene_y_por_eso_no_bloquea: 'El segundo caso -- "transitar" por "navegar" -- lo vio el owner en pantalla y ningun instrumento lo habria encontrado. Un criterio de aceptacion cuyo instrumento es "que alguien lo mire" no se verifica: se declara cumplido.',
    el_modo_de_falla_ya_esta_fichado_en_este_mismo_declarativo: 'Una fila de este grupo lo dice textual: "un estado sin condicion de salida no se cierra: se olvida". Un punto de aceptacion sin instrumento le baja el precio a los otros nueve.'
  },
  las_consecuencias: {
    cambia_el_criterio_de_aceptacion_de_varias_etapas: 'Todas las etapas que citan la especificacion suman el punto nuevo.',
    los_dos_casos_quedan_cubiertos_hacia_adelante: 'El primero por el punto; el segundo por la regla de estilo. Se dice cual cubre cual, para que nadie crea que el segundo esta garantizado por un test.',
    lo_que_sigue_sin_estar_garantizado_y_se_declara: 'Un mensaje mal dicho pero cierto puede volver a pasar. La regla de estilo lo hace corregible, no lo hace detectable.'
  }
}, 'Escribir el punto nuevo en la especificacion, y la regla de estilo donde no se lea como criterio de aceptacion. Texto de producto: lo escribe el owner.');

// -- 7 -----------------------------------------------------------------------
marcar(por('D4D5::e2-y-e6-sin-premisa'), {
  fecha: '2026-08-20',
  LA_REGLA: 'E6 se ACOTA: pasa a gobernar A QUIEN SE NOMBRA y A QUIEN SE LLAMA, y deja de gobernar QUE RESTRICCIONES SE LISTAN. La direccion esperada que E2 declaraba -- hacia arriba -- queda RETIRADA.',
  el_fundamento: {
    E6_no_vivia_solo_de_D5: 'Vive de INV-3.3, que prohibe resolver jurisdiccion por celda de un teselado, y eso D5 no lo toca. Lo que murio es la premisa de volumen, no la etapa.',
    por_que_no_se_disuelve_en_E4: 'Disolverla perderia el unico trabajo que hoy sostiene S1 -- ver todas las Capitanias que la ruta atraviesa -- y S3 -- el aviso de Capitania sin limite cargado --.'
  },
  las_consecuencias: {
    cuanto_es_hacia_abajo_y_es_COTA_no_medida: 'Sobre las 8 rutas calculables del arnes, con las restricciones vigentes del 2026-08-20 y contra el andamio por Capitania: Quellon -> San Rafael mostraria 4 restricciones MENOS que bajo la regla vieja (bahias 112, 148, 251 y 252), Punta Arenas -> Williams 1 menos (bahia 165) y Quellon -> Melinka 1 menos (bahia 252). CAVEAT que viaja con el numero: el andamio esta declarado NO promovible, asi que es cota y no medida exacta.',
    el_premio_que_cobra_gratis: 'Con la unidad Capitania, el defecto de la pieza 2 de E7 desaparece por construccion: a nivel de Capitania rompen 0 de 34 tramos silenciados, contra 2 de 34 a nivel de bahia.',
    lo_que_hay_que_reescribir: 'El punto 1 de E2 -- la direccion esperada -- y el alcance y el criterio de aceptacion de E6, que hoy nombra S2.'
  }
}, 'Reescribir E2 y E6 en el plan, con el criterio de aceptacion nuevo. Texto de plan: lo escribe el owner.');

// -- 8 -----------------------------------------------------------------------
marcar(por('D4D5::inv34-derogado-por-d5'), {
  fecha: '2026-08-20',
  QUE_SE_FIRMO: 'La DIRECCION. El texto NO.',
  LA_DIRECCION: 'El TITULO SOBREVIVE, con otra redaccion. La bahia sigue siendo ETIQUETA de la restriccion; la unidad de aplicacion es la CAPITANIA cuyo territorio el trazado navega, salvo que el propio texto de la restriccion acote el area.',
  el_fundamento: {
    es_la_unica_lectura_que_el_motor_puede_cumplir: 'La geometria de "las aguas de una bahia" NO existe en el arbol. La celda no lo es -- se aparta hasta 73,7 km del punto de su bahia, medido --, hay un punto por bahia, y la capa por Capitania esta declarada andamio no promovible. Elegir que la bahia es extension seria escribir hoy una regla cuya segunda mitad el motor no puede comprobar con ningun dato que tenga.',
    coherencia_con_el_contrato: 'INV-3.3 ya declara a la Capitania como la unidad jurisdiccional, y la propia nota de alcance de INV-3.4 dice que el motor evalua a nivel de Capitania porque "es el envolvente: muestra de mas, nunca de menos".',
    el_dato_que_sostiene_la_salvedad: 'AreaRestriccion no esta vacio: sobre las 20 filas vigentes del 2026-08-20 hay filas que declaran "DENTRO DEL LIMITE DEL PUERTO", "FUERA DEL LIMITE DEL PUERTO" y las dos a la vez. La propia autoridad acota el area en el dato.'
  },
  LO_QUE_NO_SE_FIRMO_Y_SIGUE_EN_PIE: 'El TEXTO de reemplazo. La condicion que el owner fijo el 2026-08-20 no se movio: no se redacta antes de que la celda este resuelta. Y la segunda direccion de la regla de D5 sigue sin ser decidible con el dato de hoy.',
  consecuencia_hoy: 'El contrato y la seccion de decisiones del plan siguen afirmando cosas contrarias. Queda declarado, no en silencio, y ahora con la direccion escrita para que el texto se redacte en una sola pasada cuando la celda se resuelva.'
}, 'Redactar el texto de reemplazo del invariante, cuando la celda este resuelta. Texto de contrato: lo escribe el owner. La direccion ya no es la pregunta.');

// -- 9 -----------------------------------------------------------------------
marcar(por('D4D5::contrato-10-dice-transitar'), {
  fecha: '2026-08-20',
  LA_REGLA: 'Se pegan los DOS sitios del contrato, no uno. Y el nombre de la fila "Zona intermedia cerrada" SE QUEDA.',
  LA_CORRECCION_DE_ALCANCE_QUE_ENCONTRO_LA_LECTURA_DEL_2026_08_20: {
    lo_que_esta_fila_decia: 'Que era "UNA palabra de UNA celda".',
    lo_que_se_midio: 'Son DOS sitios. Barrido declarado: el fichero del contrato completo, patron LITERAL "transitar" -- literal y no clase de caracteres, justamente por el defecto de acentos ya fichado --, 2 apariciones.',
    sitio_1: 'La celda de Capa 1 de la fila "Zona intermedia cerrada" del catalogo de mensajes.',
    sitio_2: 'La linea del invariante del mensaje en doble capa, que dice: Mensaje inequivoco ("Tu embarcacion NO puede transitar" vs "No afectada"). Es la misma cadena al patron y le corresponde el mismo cambio.',
    lo_que_NO_se_toca: 'La Capa 2, que parafrasea la norma -- el D.L. 2222 Art. 32 habla de prohibir el TRANSITO -- y cambiarla seria citar mal.'
  },
  el_fundamento_del_nombre_que_se_queda: {
    la_regla_verbo_sustantivo_es_del_propio_owner: 'Se corrige el VERBO, no el SUSTANTIVO. "Zona intermedia" es el nombre de una CATEGORIA del contrato, definida en INV-3.1 -- una jurisdiccion que la ruta atraviesa y no es origen ni destino --, no es texto que lea el patron.',
    el_defecto_no_era_la_palabra: 'Lo que se cazo en pantalla no fue la palabra: fue aplicarsela al puerto de ZARPE, o sea un mensaje falso. Eso lo cubre el punto de veracidad nuevo de la especificacion, no el nombre de una fila del contrato. Cambiar el nombre haria desaparecer la palabra sin arreglar el defecto.'
  },
  consecuencia_hoy: 'La app ya dice "navegar" y el contrato sigue diciendo "transitar" en dos sitios. Mientras dure, la verificacion del contrato contra la pantalla da distinto por una palabra, y es NUESTRA divergencia, no un defecto de la app.'
}, 'Pegar la palabra en los DOS sitios. Texto de contrato: lo pega el owner. Es lo mas barato de las once.');

// -- 11 · reencuadre: no es una pregunta abierta, es AGENDADA -----------------
const e7 = por('PLAN-7.2::e7-pieza-2-sin-criterio');
e7.pregunta = 'La app calla el aviso de "Capitania sin limite cargado" en los tramos donde da por hecho que la jurisdiccion dueña de esas aguas ya esta en la lista de la ruta; en dos tramos medidos no lo esta y calla igual. ESTA PREGUNTA ES AGENDADA Y NO ABIERTA: por decision del owner del 2026-08-19 no se elige camino hasta que cierre la etapa de la capa por Capitania. Cuando esa etapa cierre: ¿sigue haciendo falta una regla de silenciamiento propia, o el defecto desaparece con el cambio de unidad?';
e7.NO_ES_UNA_PREGUNTA_ABIERTA_ES_AGENDADA = {
  aceptado_por_el_owner_el: '2026-08-20',
  por_que_se_reencuadra: 'La fila estaba redactada como una pregunta abierta y su propia condicion de cierre prohibe contestarla hoy. Mezclada con las demas hacia leer ONCE preguntas trabadas esperando al owner cuando habia DIEZ. El reencuadre no cambia el estado de la deuda: cambia lo que la fila le dice a quien la lee.',
  la_puerta: 'La etapa de la capa por Capitania (E4/C3), por decision del owner del 2026-08-19.',
  y_ademas_estaba_mal_redactada_al_reves_que_las_otras: 'No nombraba ni la pieza, ni los caminos, ni la etapa. Era tan anonima que no se podia contestar sin abrir el repositorio, que es justo lo que el grupo 2 promete evitar. La pregunta de arriba es la version que se entiende sola.'
};
e7.LA_MEDICION_YA_ANTICIPA_LA_RESPUESTA = {
  medido_el: '2026-08-10, sobre 8 rutas reales · denominador: 34 tramos silenciados',
  a_nivel_de_Capitania: '0 de 34 tramos rompen.',
  a_nivel_de_bahia: '2 de 34 rompen. Los dos en la ruta Anahuac -> Chacabuco: un tramo de 6,3855 km con 2,240 km de aguas de Canal Chaffers Sur sin matchear, y uno de 6,1500 km con 2,839 km de Bahia Chacabuco sin matchear. 12,54 km entre los dos.',
  lo_que_eso_significa: 'El fundamento se sostiene en la unidad que el contrato manda y se cae en la unidad que el codigo usa. Con el cambio de unidad el defecto desaparece POR CONSTRUCCION, y ninguno de los cinco caminos de la auditoria hace falta.',
  el_aviso_que_va_con_esto: 'Ninguna de las dos bahias publica restriccion hoy. Eso NO salva al criterio: las restricciones cambian por hora y la pregunta es estructural.',
  por_que_NO_conviene_construir_la_tercera_condicion_mientras_tanto: 'Su precio es reconstruir de quien serian esas aguas SIN el recorte, y eso se apoya en el mismo teselado que otra fila de este declarativo declara NO concluyente para esta pregunta exacta: navegar las aguas de una bahia sin cruzar su celda no es decidible con el dato de hoy. Seria pagar codigo nuevo por una respuesta que no podemos sostener.'
};

fs.writeFileSync(RUTA, JSON.stringify(D, null, 2) + '\n', 'utf8');
console.log('ESCRITO. Filas tocadas: 9');
