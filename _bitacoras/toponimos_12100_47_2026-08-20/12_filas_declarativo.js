// P12 - LAS FILAS DEL DECLARATIVO
// Lee el declarativo VIVO, agrega y escribe. No pisa nada existente.
// Se relee en el momento de correr porque la sesion del voseo escribe en el
// mismo fichero: el estado de partida es el que este en disco, no el que yo vi.

const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const D = JSON.parse(fs.readFileSync(F, 'utf8'));
const antesFilas = D.deudas.length, antesSitios = D.cobertura.sitios.length;

const SITIO = 'SESION-toponimos-12100-47-2026-08-20';
const BIT = '_bitacoras/toponimos_12100_47_2026-08-20/';

const FILA_1 = {
  id: 'LIMITE-PUERTO::los-toponimos-en-fuentes-abiertas',
  token_local: null,
  espacio_de_nombres: 'Res. D.G.T.M. y M.M. Ex. 12100/47 — ANEXO "A" punto 1: los toponimos de las entradas sin coordenadas suficientes, buscados en fuentes abiertas',
  sitio: SITIO, repo: 'tmarea-backend', texto_literal: null, sin_texto: true,
  donde: { fichero: BIT, seccion_por_titulo: 'los dos numeros, y sobre que descansan',
    cita_de_anclaje: 'la linea de 10_los_dos_numeros.txt que dice "estricto : 9 + 6 (conjunto A) = 15   y sumando el B: 26 de 164"' },
  abierta_el: null, abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'Nace de la medicion del 2026-08-20 que pidio LA_PRIMERA_MEDICION_DE_QUIEN_RETOME_ESTA_FILA de LIMITE-PUERTO::12100-47-cruzada-contra-el-catalogo. Salida cruda en ' + BIT + '.',
  grupo: '2_decision_del_owner', estado: 'viva', firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true, duplicada_de: null,
  titulo: 'Las fuentes abiertas resuelven MAS de lo que se suponia y MENOS de lo que haria falta: de las 9 bahias geometrizables se pasa a 26 de 164 con lo que hay gratis, y el derrotero llevaria a entre 40 y 43 — o sea que la compra ya no compra el problema entero, compra el ultimo tercio',
  pregunta: '¿Se digitaliza ahora el lote que las fuentes abiertas ya resuelven —26 bahias de 164 medidas, o 34 si se acepta el criterio laxo— y se deja la compra del derrotero para despues, o se espera a tenerlo todo? Y por separado, porque no es la misma pregunta: ¿vale un derrotero que aporta el tramo de 26 a entre 40 y 43, sabiendo que ese tramo es el mas caro y el mas chico? Las dos se pueden contestar sin medir nada mas.',
  por_que_es_deuda: 'El 2026-08-20 quedo escrito como encargo que ANTES de gastar en licencia del derrotero habia que mirar si los toponimos estaban en fuentes abiertas, porque si estaban el escalon cambiaba de precio antes de empezar. Se miro. Estan, en buena parte, y el precio cambio. Dejar esa medicion solo en una bitacora seria repetir el modo de falla que el declarativo existe para impedir.',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    la_pregunta_que_se_contesto: '¿Cuantos de los toponimos que hacen falta para volver geometria las entradas sin coordenadas de la Res. 12100/47 estan en fuentes abiertas y gratuitas, verificados contra la geografia de su entrada?',
    LA_RESPUESTA: 'De 77 toponimos en 39 entradas, 73 tienen cadena de busqueda. Veredicto ESTRICTO: 49 VERIFICADOS (16 de 25 en el conjunto A, 33 de 48 en el B), 21 encontrados y DESCARTADOS, 3 NO ENCONTRADOS. Llevado a entradas y a bahias: solo con fuentes abiertas se pasa de 9 a 26 bahias de 164; con criterio laxo, a 34. CON DERROTERO, ESTIMADO: entre 40 y 43 de 164.',
    LOS_DOS_CONJUNTOS_NO_SE_SUMAN: {
      nota: 'La cifra de ENTRADAS de A y la de B tienen denominadores distintos y no se promedian. Lo unico que se suma es la BAHIA, que es la unidad comun con el 9 de partida.',
      CONJUNTO_A: '14 entradas C-ALGUNAS, 12 UTILES al catalogo, 12 bahias. Es el escalon 9 -> 21 que el declarativo nombra. 27 toponimos, 25 con cadena.',
      CONJUNTO_B: '25 entradas C-NINGUNA, 22 UTILES al catalogo, 23 bahias. Es el escalon 21 -> 44. 50 toponimos, 48 con cadena.',
      LAS_TRES_QUE_NO_MUEVEN_NADA: 'JUNIN, CALETA BUENA y LOS VILOS son C-NINGUNA y no aterrizan en ninguna bahia del catalogo: resolver sus 6 toponimos suma CERO. Por eso el conjunto B se reporta siempre 25 / 22 utiles / 23 bahias.',
      Y_LO_MISMO_LE_PASA_AL_A: 'TOCOPILLA y TOME son C-ALGUNAS y tampoco aterrizan. El conjunto A es 14 / 12 utiles / 12 bahias. Eso NO se habia dicho el 2026-08-20 y cierra la aritmetica sin tocar nada: 12 + 23 + las 9 C-TODAS = 44, que son las 44 que calzan.'
    },
    EL_NUMERO_QUE_DECIDE: {
      solo_fuentes_abiertas_MEDIDO: 'ESTRICTO 26 de 164 (9 + 6 del A + 11 del B) · LAXO 34 de 164 (9 + 10 + 15)',
      con_derrotero_ESTIMADO: 'COTA BAJA 40 de 164 (el derrotero resuelve lo N-SEGURA) · COTA ALTA 43 de 164 (resuelve ademas lo N-DUDOSA). Techo absoluto si se resolviera todo: 44.',
      POR_QUE_SON_DOS_COTAS_Y_NO_UN_NUMERO: 'Porque un porcentaje inventado se leeria como medicion. Las cotas salen de la CLASE DE LUGAR, que es informacion del documento publico, y de nada mas. NO SE ABRIO NINGUN DERROTERO.',
      LA_DIFERENCIA_ESTRICTO_LAXO_ES_UNA_DECISION_DEL_OWNER: 'Son 10 toponimos, y el relajamiento es UNO SOLO y declarado: aceptar el MISMO LUGAR BAJO OTRO ACCIDENTE — el faro Punta Gusano por punta Gusano, el Banco Herradura por la boya fondeada encima, Isla Isabel por su faro. No se relaja distancia, ni region, ni coherencia geometrica, ni unicidad. Cuanto vale una posicion aproximada para una boca de puerto es decision del owner, no mia.'
    },
    SOBRE_CUANTAS_PROCEDENCIAS_DESCANSA: {
      la_regla: 'Overpass y Nominatim son LA MISMA BASE OSM por dos puertas: cuentan UNA procedencia, no dos. GeoNames es la otra. Maximo 2.',
      conjunto_A: '7 de 16 con DOS · 6 solo GeoNames · 3 solo OSM',
      conjunto_B: '13 de 33 con DOS · 13 solo GeoNames · 7 solo OSM',
      LO_QUE_ESO_SIGNIFICA: 'NINGUNA DE LAS DOS FUENTES SOLA SOSTIENE EL RESULTADO. Sin GeoNames el conteo cae de 16 a 10 y de 33 a 20. Sin OSM cae de 16 a 13 y de 33 a 26. Y la que mas aporta es la que casi nadie mira: el dump de GeoNames, que ademas es la unica de las dos con procedencia independiente — se midio que 490 de los 1.156 natural=cape de Chile en OSM traen source=IGM, o sea que OSM-Chile bebe del gazetteer del Estado.',
      SI_HUBIERA_UNA_SOLA_FUENTE_EL_NUMERO_NO_SERIA_DEFENDIBLE: 'Con una sola procedencia, 19 de los 49 verificados quedarian sin segundo respaldo y 30 se caerian. La medicion se sostiene porque son dos, y eso vale mas que cualquiera de las dos.'
    },
    EL_LIMITE_DEL_INSTRUMENTO_QUE_SE_DECLARA: {
      que_paso: 'Overpass devolvio 429 y despues corto la conexion. Se trajeron 7 CAJAS DE 39. Los dos espejos publicos devuelven HTTP 500 hasta para la consulta mas trivial que existe, asi que no era la consulta: era el servicio.',
      COMO_SE_REPORTA_Y_POR_QUE: 'Esas 32 cajas se reportan como CAJA NO TRAIDA, y NUNCA como "sin candidatos". Si se hubieran leido como ceros, la medicion habria fabricado 32 entradas sin resultado que nunca se consultaron — y el numero que puede evitar una compra habria salido de un silencio.',
      QUE_QUEDA_DEBIL_Y_QUE_NO: 'Los VERIFICADOS no estan en duda: un candidato encontrado y revisado es un candidato encontrado. Lo que queda debil son los DESCARTADOS y los NO ENCONTRADOS, porque en 32 de 39 cajas no se pudo volcar la caja entera, que es lo unico que caza "otro nombre para el mismo lugar". POR ESO EL NUMERO DE FUENTES ABIERTAS ES UNA COTA INFERIOR y se declara asi.'
    },
    EL_CRITERIO: 'Cinco condiciones y hay que pasar las CINCO: V1 distancia al ancla (R = 25 km, calibrado contra los dos falsos amigos reales del 2026-08-20) · V2 region y costa · V3 clase compatible con la clase de lugar · V4 COHERENCIA GEOMETRICA con el limite (los dos extremos de una linea a lados opuestos de la boca; un eje que corte la bahia) · V5 unicidad (dos candidatos validos = no verificado). EL NOMBRE COINCIDENTE NO ES NINGUNA DE LAS CINCO: es lo que trae al candidato a la mesa. Criterio completo, escrito ANTES de aplicarse, en ' + BIT + '04_criterio_busqueda.txt.',
    LA_CLASIFICACION_POR_CLASE_DE_LUGAR: 'Doce clases declaradas ANTES de aplicarse, las doce usadas, ninguna nueva hizo falta. 47 de los 77 toponimos son PUNTAS (61 %); con islotes, rocas, faros y morros, la enorme mayoria. N-SEGURA (clase que un derrotero de costa seguro nombra): 24 de 27 en A, 44 de 50 en B. N-IMPROBABLE: UNO solo en las 77, el cementerio de Chanaral. Y solo 4 de 77 no tienen nombre en el documento: el techo de las fuentes abiertas NO estaba en la falta de nombre.',
    EL_HALLAZGO_QUE_CONTRADICE_LA_PREMISA: 'NO HAY UN SOLO TOPONIMO REPETIDO. El encargo daba por supuesto que si. Las dos unicas colisiones de cadena son HOMONIMOS DE LUGARES DISTINTOS: "Punta San Carlos" (#25 JUAN FERNANDEZ, isla Robinson Crusoe / #35 CORRAL, Valdivia — 1.400 km, cartas 5411 y 6241) e "Islote Blanco" (#8 TOCOPILLA, carta 1311 / #18 HUASCO, carta 3211 — 700 km). Colapsarlos por cadena habria fabricado un falso positivo DENTRO DEL PROPIO DENOMINADOR, antes de buscar nada. Y no quedo en teoria: al buscar "punta San Carlos" para CORRAL, el buscador ofrecio la de Juan Fernandez A 845,6 km. Colapsar habria puesto el limite de Corral en Juan Fernandez.',
    LO_QUE_LA_BUSQUEDA_ACOTADA_SALVO: 'Para MEJILLONES el documento dice "el paralelo que pasa por punta Choros". Hay una punta Choros conocida en la region de Coquimbo, a ~700 km al sur, que una busqueda sin acotar habria traido con toda seguridad. El acotado devolvio la punta Choros DE ANTOFAGASTA, a 7,9 km del ancla, que es la que la entrada nombra.',
    UNA_CORRECCION_QUE_LA_BUSQUEDA_OBLIGO: '"punta Weste" de #42 CHACABUCO se habia clasificado B-DESCRITO con duda, razonando que "Weste" es la palabra que el propio documento usa como direccion en otras cuatro entradas. GeoNames tiene "Punta Weste" (PT) a 5,0 km de bahia Chacabuco: ACA es nombre propio. El criterio mandaba buscar igual los B-DESCRITO con duda justamente para esto. Eje B corregido de B-DESCRITO a B-NOMBRE.',
    LO_QUE_NO_RESUELVE_NI_EL_DERROTERO: 'CORONEL. Su limite termina "al islote que se encuentra al Surweste de la Punta Oeste de Caleta Lotilla": un islote SIN NOMBRE, ubicado por una punta SIN NOMBRE, de una caleta que NO ESTA en ninguna de las dos fuentes. Un gazetteer no puede ni intentarlo — no hay cadena que consultar. Un derrotero podria, porque es prosa de costa y describe accidentes sin nombre, pero eso es lo que se estima, no lo que se sabe.',
    EL_RESIDUO_QUE_NINGUNA_FUENTE_CIERRA: 'Tres entradas piden un BORDE y no un lugar: "el canto Weste de la Peninsula Alacran" (ARICA), "el canto Weste de isla Huevos" y "el canto Weste de Punta Cabo Tablas" (LOS VILOS), "canto S de isla Calbuco" (SAN JOSE DE CALBUCO). El toponimo esta encontrado y el borde no: un gazetteer devuelve UN PUNTO. No bloquea el conteo y no desaparece.',
    tres_conteos_publicados: 'ENCONTRADO Y VERIFICADO / ENCONTRADO Y DESCARTADO / NO ENCONTRADO, por separado y por conjunto, con la razon escrita de los 73 — tambien la de los 21 rechazados. Publicar los NO es lo que permite auditar el criterio.',
    fuentes: 'OSM via Overpass y via Nominatim (ODbL) y el dump CL de GeoNames (CC-BY 4.0), sha256 en ' + BIT + 'PROCEDENCIA.md. Sin cuenta y sin instalar nada. NO SE ABRIO NINGUN DERROTERO, no se consulto y no se cito; tampoco se uso como fuente de coordenadas docs/TMAREA_Extraccion_Derrotero_SHOA.md.',
    lo_que_NO_se_toco: 'No se georreferencio nada, no se construyo geometria, no se toco data/ salvo este declarativo, ni la base, ni la capa, ni src/ de ningun repo. La resolucion no se promovio. Las coordenadas de los candidatos viven en la bitacora como RECONOCIMIENTO, que es lo que permite verificar V1 y V4.',
    DOS_COSAS_QUE_LA_COMPRA_TIENE_QUE_SABER_Y_NO_ESTABAN: {
      el_costo_de_extraer_ya_esta_pagado: 'docs/TMAREA_Extraccion_Derrotero_SHOA.md, 292 lineas, v2.0, documenta un reconocimiento YA HECHO sobre un tomo de 623 paginas con capa de texto: formatos de coordenada, unidades, ruido a filtrar, paginacion. O sea que "como se extrae" NO es parte del precio de la compra.',
      el_tomo_conocido_NO_es_el_que_cubre_la_mayoria: 'Ese tomo cubre Cap. VII y VIII, de Canal Chacao al sur. De las 25 entradas del conjunto B, 17 estan al NORTE de Canal Chacao. El volumen del que el proyecto tiene experiencia de mano no es el que cubre la mayoria del conjunto. "Cuatro volumenes de Arica a Magallanes" es dato externo y no se verifico: verificarlo exigia abrir algo que esta sesion no abre.'
    },
    EL_DEFECTO_DE_INSTRUMENTO_QUE_SE_PUBLICA: 'El geocodificador fallo en el PRIMERO de cinco. Para #3 JUNIN, Nominatim devolvio "Eleuterio Ramirez, Poblacion Naval Marinero Ugarte, Iquique", clase highway/tertiary — UNA CALLE. Y la prueba de contencion en el cajon LO ACEPTO. La leccion tiene fila propia: ver LICENCIA-Y-METODO mas abajo y METODO::emparejar-por-nombre-sin-revision-subcuenta-en-silencio, que esta fila EXTIENDE y no modifica.',
    OTRO_DEFECTO_QUE_SE_PUBLICA: 'El pase 2 sin acotar se corrio con la CADENA COMPLETA ("faro Isla Isabel", "baliza anterior de Punta Truco") y devolvio cero. Repetido por NUCLEO ("Isla Isabel", "Punta Truco"), aparecieron TRES que el pase anterior habia dado por inexistentes: Isla Isabel, Caleta Lackawana y Estero Landgren. Un cero de una consulta mal formulada se lee igual que un cero real. Es el mismo modo de falla que el 2026-08-20 midio en el generador de candidatos: la consulta era poco generosa, y lo que lo caza es mirar otra vez, no el criterio.',
    salida_cruda: BIT + '10_los_dos_numeros.txt'
  }
};

const FILA_2 = {
  id: 'LICENCIA::osm-es-gratis-con-compartir-igual-y-el-derrotero-cuesta-sin-esa-clausula',
  token_local: null,
  espacio_de_nombres: 'Licencias de las fuentes de toponimia y geometria del proyecto',
  sitio: SITIO, repo: 'tmarea-backend', texto_literal: null, sin_texto: true,
  donde: { fichero: BIT + 'PROCEDENCIA.md', seccion_por_titulo: 'LICENCIAS — lo que hoy no obliga a nada y manana si',
    cita_de_anclaje: 'la tabla de PROCEDENCIA.md que enfrenta OSM (ODbL, compartir-igual) con GeoNames (CC-BY) y con el derrotero (cuesta, sin compartir-igual)' },
  abierta_el: null, abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'Nace del reconocimiento del 2026-08-20 sobre fuentes abiertas de toponimia. Se declara como fila propia por decision explicita del owner: enterrada en una bitacora no la ve quien retome esto.',
  grupo: '2_decision_del_owner', estado: 'viva', firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true, duplicada_de: null,
  titulo: 'Ninguna de las dos vias es gratis-y-sin-condiciones: OSM no cuesta plata pero arrastra ODbL con compartir-igual si alguna vez alimenta una capa publicada, y el derrotero cuesta plata pero no trae esa clausula — las dos cosas pesan y hay que elegir sabiendo cual se paga',
  pregunta: '¿Se acepta que la capa de limites de puerto, si se construye con toponimia de OSM, quede bajo ODbL con su clausula de compartir-igual al distribuirse? Si la respuesta es no, entonces el derrotero no es el camino caro alternativo: es el unico camino, y la comparacion de precio cambia por completo. La pregunta se puede contestar sin medir nada: depende de como se quiera distribuir la capa.',
  por_que_es_deuda: 'Hoy no obliga a nada: sostener coordenadas en una bitacora como RECONOCIMIENTO es la misma clase que la resolucion del 2026-08-20 — fuente citable, no incorporada. Pero la decision de comprar o no comprar un derrotero se estaba tomando comparando "gratis" contra "cuesta", y esa comparacion es falsa: una de las dos opciones tiene un precio que no se paga en plata. Quien retome esto tiene que verlo antes de decidir, no despues de haber construido la capa.',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    la_pregunta_que_se_contesto: '¿Que condiciones arrastra cada fuente de toponimia disponible, y como cambian la comparacion de precio entre fuentes abiertas y derrotero?',
    LA_RESPUESTA: 'OSM (Overpass y Nominatim): gratis, ODbL, COMPARTIR-IGUAL — una base de datos derivada que se distribuya queda bajo ODbL, y hay que atribuir. GeoNames (dump CL): gratis, CC-BY 4.0, solo atribuir, SIN compartir-igual. Derrotero de la Costa de Chile del SHOA: CUESTA, sin compartir-igual, y hoy el proyecto NO tiene licencia propia — los ejemplares que existen estan licenciados a otra empresa.',
    LA_COMPARACION_HONESTA: 'No es "gratis contra caro". Es: una via no cuesta plata y condiciona la distribucion; la otra cuesta plata y no la condiciona. Cual conviene depende de algo que esta fila NO decide y que no es tecnico: como se quiere distribuir la capa.',
    UN_DATO_QUE_INCLINA_LA_BALANZA_Y_NO_ES_OBVIO: 'De los 49 toponimos verificados, 19 dependen SOLO de GeoNames (6 en el conjunto A y 13 en el B). GeoNames es CC-BY, sin compartir-igual. O sea que una parte del resultado NO arrastra ODbL, y separar que vino de donde es posible: esta anotado toponimo por toponimo en ' + BIT + 'veredictos.json, campo "p".',
    lo_que_esta_fila_NO_dice: 'No es asesoria legal y no interpreta el alcance de la ODbL sobre una capa concreta. Dice que la clausula existe, que se activa al DISTRIBUIR una base derivada, y que hoy no esta activada porque nada se incorporo.',
    lo_que_hoy_NO_obliga: 'Nada. La bitacora sostiene coordenadas como reconocimiento con su procedencia, su fecha y su sha256. No se promovio nada a data/, ni a la base, ni a la capa.',
    salida_cruda: BIT + 'PROCEDENCIA.md'
  }
};

const FILA_3 = {
  id: 'METODO::la-contencion-no-discrimina-cuando-el-borde-de-la-caja-es-el-falso-positivo',
  token_local: null,
  espacio_de_nombres: 'Metodo — acotar una busqueda por geografia para matar falsos positivos',
  sitio: SITIO, repo: 'tmarea-backend', texto_literal: null, sin_texto: true,
  donde: { fichero: BIT + '04_criterio_busqueda.txt', seccion_por_titulo: 'EL CONTROL (c), QUE SE AGREGO PORQUE EL INSTRUMENTO FALLO AL CORRERLO',
    cita_de_anclaje: 'la linea de 04_criterio_busqueda.txt que dice "UNA PRUEBA DE CONTENCION NO PUEDE DISCRIMINAR CUANDO EL BORDE DE LA CAJA ES EL FALSO POSITIVO"' },
  abierta_el: null, abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'Nace del fallo del instrumento del 2026-08-20 y se declara como fila propia por decision explicita del owner: la leccion no es de esta pieza.',
  grupo: '1_cierra_con_lo_que_hay', estado: 'viva', firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true, duplicada_de: null,
  titulo: 'Acotar una busqueda a una caja geografica NO discrimina cuando el borde de la caja ES el falso positivo: la caja acota el DONDE y no el QUE, y hay que preguntar por el QUE aparte — medido, fallo en el primero de cinco',
  costo_estimado: 'Chico y de escritura: dos lineas de control junto a toda prueba de contencion geografica del arbol —que el resultado NOMBRE lo que se pidio, y que su clase no sea absurda— mas la regla escrita en el sitio de metodo que corresponda. La MEDICION ya esta pagada.',
  depende_de: 'Nada externo. Se cierra con lo que ya esta en el arbol.',
  por_que_es_deuda: 'El proyecto acota busquedas por geografia en varios lados —bahia contra jurisdiccion, nodo contra bahia, ruta contra celda— y la intuicion de que "si cae dentro de la caja, es" esta en todos. Esta medicion muestra que esa intuicion tiene un agujero exacto y reproducible, y le pone un caso. Mientras la regla viva solo en la bitacora de la sesion que la midio, la proxima la vuelve a pagar.',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    la_pregunta_que_se_contesto: '¿Alcanza con que un candidato caiga dentro de la caja geografica esperada para aceptarlo?',
    LA_RESPUESTA: 'NO, y fallo en el PRIMERO de cinco casos. Buscando el ancla de la entrada #3 JUNIN, Nominatim devolvio "Eleuterio Ramirez, Poblacion Naval Marinero Ugarte, Iquique", lat -20,2121 lon -70,1492, clase highway/tertiary: UNA CALLE DE IQUIQUE. La prueba de contencion LA ACEPTO, porque el borde sur del cajon de #3 es justamente Iquique. El falso positivo cayo pegado al borde que tenia que filtrarlo.',
    LA_REGLA: 'Una prueba de contencion responde "esta en la zona", que es una pregunta sobre el DONDE. No responde "es la cosa que pedi", que es una pregunta sobre el QUE. Cuando el borde de la caja coincide con la fuente del falso positivo, el DONDE no discrimina nada. HAY QUE PREGUNTAR POR EL QUE, APARTE Y SIEMPRE: (1) que el resultado NOMBRE lo que se pidio —si se pidio "Junin" y vuelve "Eleuterio Ramirez", no es— y (2) que su CLASE no sea absurda para lo que se busca —una boca de puerto no se ancla en una calle—. Los dos controles son de dos lineas y los dos son decisivos.',
    POR_QUE_NO_LO_ARREGLA_ACHICAR_LA_CAJA: 'Es la tentacion obvia y no sirve. El cajon de #3 se construye ENTRE las anclas de las entradas vecinas, y una de esas vecinas es Iquique: achicarlo hasta excluir Iquique seria excluir el borde que el propio documento fija. El problema no es el tamano de la caja. Es que la caja contesta otra pregunta.',
    QUE_RELACION_TIENE_CON_LA_OTRA_FILA_DE_METODO: 'METODO::emparejar-por-nombre-sin-revision-subcuenta-en-silencio midio que emparejar por NOMBRE sin revision subcuenta 16 %. Esta mide lo simetrico: acotar por LUGAR sin revision sobrecuenta. Las dos apuntan a lo mismo — ni el nombre solo ni la posicion sola verifican — y ninguna modifica a la otra. Esta fila EXTIENDE aquella y no la toca.',
    controles: 'El fallo no se estimo: esta la salida cruda con las cinco filas, la que fallo y las cuatro que pasaron, en ' + BIT + '05_anclas.txt, con los tres controles (c1) contencion, (c2) el display nombra al puerto, (c3) la clase no es una calle, impresos uno por uno. CONTROL POSITIVO del propio hallazgo: las otras cuatro consultas devolvieron el lugar correcto y cinco resultados distintos, o sea que no es un geocodificador roto que falla en todo.',
    LO_QUE_NO_SE_COBRA_COMO_MERITO: 'El criterio escrito ANTES habria dejado pasar el ancla falsa. Lo que la cazo fue CORRER EL INSTRUMENTO Y MIRAR LA SALIDA, fila por fila, en cinco filas. Cinco se miran; setenta y tres no se miran igual. Y el dano habria sido cero: #3 JUNIN es una de las tres entradas que no mueven ninguna bahia. Se dice para no cobrarse un merito que no corresponde.',
    salida_cruda: BIT + '05_anclas.txt'
  }
};

// --- escribir -----------------------------------------------------------------
const yaEsta = id => D.deudas.some(d => d.id === id);
const nuevas = [FILA_1, FILA_2, FILA_3].filter(f => !yaEsta(f.id));
D.deudas.push(...nuevas);
if (!D.cobertura.sitios.some(s => s.id === SITIO)) {
  const orden = Math.max(...D.cobertura.sitios.map(s => s.orden || 0)) + 1;
  D.cobertura.sitios.push({ id: SITIO, repo: 'tmarea-backend', fichero: BIT,
    seccion_por_titulo: 'los toponimos de las entradas sin coordenadas de la Res. 12100/47, buscados en fuentes abiertas',
    barrido: true, barrido_el: '2026-08-20',
    nota: 'La sesion midio, sobre las 39 entradas sin coordenadas suficientes, cuantos de sus 77 toponimos estan en fuentes abiertas y verificados contra la geografia de su entrada. No georreferencio nada y no construyo geometria.',
    filas_en_este_declarativo: nuevas.length, bitacora: BIT, orden,
    vocabulario_del_barrido: [
      'los 77 toponimos de las 39 entradas C-ALGUNAS y C-NINGUNA del ANEXO "A" punto 1 de la Res. 12100/47',
      'las condiciones de licencia de las fuentes usadas, que salieron de paso y el owner ordeno declarar como fila propia',
      'el fallo de la prueba de contencion geografica, que tampoco es de esta pieza'] });
}
fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');

const L = [];
const say = s => { L.push(s); console.log(s); };
say('P12 - LAS FILAS DEL DECLARATIVO');
say('='.repeat(78));
say(`ANTES  : ${antesFilas} filas · ${antesSitios} sitios`);
say(`DESPUES: ${D.deudas.length} filas · ${D.cobertura.sitios.length} sitios`);
say('');
say('FILAS AGREGADAS:');
for (const f of nuevas) say(`  ${f.id}\n     grupo ${f.grupo} · estado ${f.estado} · firmada false`);
say('');
say(`SITIO AGREGADO: ${SITIO}`);
say('');
say('NO SE TOCO NINGUNA FILA EXISTENTE. En particular');
say('LIMITE-PUERTO::12100-47-cruzada-contra-el-catalogo sigue VIVA y sin firmar:');
say('esta sesion contesta su encargo LA_PRIMERA_MEDICION_DE_QUIEN_RETOME_ESTA_FILA,');
say('y darla por contestada es firma del owner, no mia. Y');
say('METODO::emparejar-por-nombre-sin-revision-subcuenta-en-silencio tampoco se');
say('toco: la fila nueva de metodo la EXTIENDE desde afuera.');
say('');
say('FALTA EL SEGUNDO LADO: agregar el sitio a SITIOS_CANON en');
say('scripts/validar_deudas_declaradas.js. Sin eso [V5] se pone rojo, y esta bien.');
say('');
say('Corra ahora: npm run deudas');
fs.writeFileSync(path.join(__dirname, '12_filas_declarativo.txt'), L.join('\n') + '\n', 'utf8');
