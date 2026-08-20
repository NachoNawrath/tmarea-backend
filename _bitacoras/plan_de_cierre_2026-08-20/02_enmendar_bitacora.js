'use strict';
const fs = require('fs');
const F = 'C:/Users/katia/tmarea-backend/_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt';
let t = fs.readFileSync(F, 'utf8');
const antes = t.length;

// --- (1) la cabecera decia que esta sesion no escribe filas -------------------
const a1 = 'Esta sesion PROPONE, ORDENA Y PARA. No escribe codigo, no toca src/ de ninguno\n' +
  'de los dos repos, no levanta el backend ni la PWA, no stagea nada, no commitea\n' +
  'nada, y no escribe ni una fila en el declarativo.\n\n' +
  'Lo unico que esta sesion escribe es este fichero.\n';
const b1 = 'Esta sesion PROPONE, ORDENA Y PARA. No escribe codigo, no toca src/ de ninguno\n' +
  'de los dos repos y no levanta el backend ni la PWA.\n\n' +
  'ENMENDADO EN LA MISMA SESION, DESPUES DEL GATE. El parrafo decia: «no stagea\n' +
  'nada, no commitea nada, y no escribe ni una fila en el declarativo. Lo unico que\n' +
  'esta sesion escribe es este fichero.» Dejo de ser cierto cuando el owner acepto\n' +
  'el plan y ordeno escribir las dos filas del gate mas dos preguntas del grupo 2.\n' +
  'Se enmienda en vez de reescribirse porque el texto viejo es el registro de que\n' +
  'el plan se propuso ANTES de que nada se escribiera. Lo que vale hoy esta en el\n' +
  'apartado 10.\n';
if (!t.includes(a1)) { console.error('ALTO: ancla 1'); process.exit(1); }
t = t.replace(a1, b1);

// --- (2) «lo que esta sesion no toco» nombraba el declarativo ----------------
const a2 = '    src/ de los dos repos · CONTRATO_MOTOR.md · el motor BRE · PLAN_JURISDICCION.md\n' +
  '    · data/deudas/deudas_declaradas.json · cualquier DML o DDL.\n' +
  '    Los nueve sitios sin barrer.\n';
const b2 = '    src/ de los dos repos · CONTRATO_MOTOR.md · el motor BRE · PLAN_JURISDICCION.md\n' +
  '    · cualquier DML o DDL. Los nueve sitios sin barrer, que SIGUEN SIENDO NUEVE.\n' +
  '    ENMENDADO: la lista decia tambien data/deudas/deudas_declaradas.json, y desde\n' +
  '    el apartado 10 eso es falso. El declarativo SI se toco, por orden del owner y\n' +
  '    despues del gate. PLAN_JURISDICCION.md sigue sin tocarse, y eso importa: es la\n' +
  '    opcion (c) de G6, y el texto lo pega el owner.\n';
if (!t.includes(a2)) { console.error('ALTO: ancla 2'); process.exit(1); }
t = t.replace(a2, b2);

// --- (3) el cierre de §9 se reemplaza por el apartado 10 ---------------------
const a3 = '  LO QUE EL GATE JUSTIFICA Y NO SE HIZO, porque hace falta que el owner lo pida:\n' +
  '    · mover PLAN-2::zarpe-y-recalada-entran-como-transito a 4_caduca (G7).\n' +
  '    · enmendar los cuatro sitios de D4 en PLAN_JURISDICCION.md (G6), si el owner\n' +
  '      prefiere la opcion (a) sobre la (c).\n';

const b3 = String.raw`
------------------------------------------------------------------------------
10 . LO QUE EL OWNER RESOLVIO SOBRE EL GATE, Y LO QUE SE ESCRIBIO
------------------------------------------------------------------------------
PLAN ACEPTADO el 2026-08-20. Las resoluciones, una por hallazgo, y despues lo
que se escribio. El apartado 9 de arriba describe la sesion ANTES de esto; lo
que vale es esto.

G7 · OPCION (a). PLAN-2::zarpe-y-recalada-entran-como-transito pasa a 4_caduca
     con su afirmacion_que_ya_es_falsa. Motivo del owner, textual: «un plan que
     tiene que advertir contra su propio insumo esta mal apoyado». No se cierra:
     MURIO, que es lo que el grupo 4 significa. Se retiran los dos campos que el
     grupo 1 exigia —costo_estimado y depende_de— y la enmienda dice que decian,
     porque el «Nada abierto.» era justamente lo falso.

G6 · OPCION (c). Los CUATRO sitios donde el PLAN todavia dice que D4 sigue
     ABIERTA van como T6, texto que pega el owner. NO SE TOCARON, por
     instruccion explicita. Y el supuesto de este plan queda DECLARADO CORRECTO
     por el owner: D4 ESTA FIRMADA. Los cuatro sitios, para que el que los pegue
     no tenga que volver a buscarlos:
       · §5, tabla de decisiones, fila D4, columna estado: dice «abierta».
       · §5, encabezado «Las tres de D4 — medidas el 2026-08-20. D4 sigue
         ABIERTA: falta la firma.»
       · §2, recuadro de aprobacion, parrafo «Al dia el 2026-08-20»: «S5 sigue
         siendo el unico [P] puro y D4 sigue ABIERTA».
       · encabezado del documento, linea de Estado: «(S5 abierta como D4)».

G8 · Es el hallazgo del gate, y va como fila. Palabras del owner: «Ni bitacora
     tuvo». La fila lo dice y ademas separa lo que este commit cierra —la
     INSTANCIA, porque el plan nuevo aterriza en el arbol— de lo que no cierra
     —la CLASE, porque sigue sin haber regla ni control que exija que un
     entregable de sesion deje fichero—. Por eso queda VIVA y no cerrada.

S7(a) · NO SE FIRMA HOY. El owner quiere mirarla en pantalla antes. Queda como
     esta: NO CUMPLE, y la cifra no se mueve. Sigue siendo la unica del tablero
     que puede darse vuelta sin escribir una linea, y sigue sin darse vuelta.
     Esto NO es una deuda nueva y no se le escribe fila: es una pregunta
     pendiente del apartado 6, y ahi vive.

EL PLAN VA A CONTROL DE VERSIONES. El propio G8 nombra el defecto de que un
entregable viva sin trackear; dejarlo asi habria sido escribir el hallazgo y
reproducirlo en el mismo acto.

LO QUE SE ESCRIBIO — cuatro filas nuevas, una enmienda, un sitio nuevo
------------------------------------------------------------------------------
  ENMIENDA
    PLAN-2::zarpe-y-recalada-entran-como-transito
      1_cierra_con_lo_que_hay / viva  ->  4_caduca / caduca

  DOS FILAS DEL GATE, las dos de metodo y las dos del grupo 1
    SESION-plan-de-cierre-2026-08-20::una-anulacion-de-spec-no-propaga-sola
      Una decision que ANULA una afirmacion de §2 no propaga sola al
      declarativo. Propago a UNA fila de DOS: la de las Capitanias atravesadas
      lleva su enmienda del 2026-08-20 retirando S2(c); la de zarpe y recalada
      quedo viva sosteniendo S5(b). Y ningun control lo caza, porque el
      validador comprueba FORMA y una fila que sostiene un enunciado derogado
      es formalmente perfecta. Lo que falta existe a medias: el emisor de la
      cifra YA publica cuales estan anuladas, con su decision y su fecha; lo
      que no existe es quien cruce ese dato contra el campo «sostiene».
    SESION-plan-de-cierre-2026-08-20::un-entregable-que-solo-vive-en-el-chat-no-existe
      El plan anterior no estuvo en ningun arbol. Barrido literal «brecha»
      sobre los dos arboles enteros: 0 y 0, con control positivo «declarativo»
      81 ficheros en el backend y «restriccion» 11 en la PWA. Estaba en el
      transcript, linea 266, 37.808 caracteres. Su gemela de entrada ya existe
      —el declarativo que nadie abre al arrancar—; esta es la de salida.

  DOS PREGUNTAS DEL GRUPO 2, las dos descubiertas por el plan y las dos
  inexistentes como fila hasta hoy
    SESION-plan-de-cierre-2026-08-20::color-del-dato-que-no-se-pudo-traer
      Que color lleva un dato que la app no pudo traer. Hoy lleva VERDE con el
      rotulo «Condicion Normal» y debajo dice que no se pudo obtener: el color
      afirma una cosa y el texto la contraria, en la misma tarjeta. La pregunta
      ofrece tres opciones —color propio, ambar, o sin estado— y dice el costo
      de cada una. Toca S6(b), y se declara que la mitad de S8 se puede cerrar
      SIN esta decision.
    SESION-plan-de-cierre-2026-08-20::jurisdiccion-por-trayecto-o-por-extremos
      Si la condicion jurisdiccional se responde por el TRAYECTO o por los
      EXTREMOS. LA MEDICION VA DENTRO DE LA PREGUNTA, por pedido del owner,
      porque es lo que la hace cara: por trayecto hay que regenerar tiles —el
      mayor pesa 213.639.480 bytes y son 16.785 por 6.364 celdas a 50 m,
      MEDIDO HOY sobre el fichero y su descriptor—, extender extents, re-correr
      conectividad y correr regresion sobre lo maritimo que hoy funciona; por
      extremos son dos consultas de punto contra seis geometrias ya publicadas
      y cero motor de rutas. La misma promesa, dos ordenes de magnitud.
      Y la fila marca la linea que este plan no cruza: la FUENTE del agua esta
      verificada por partida doble —la cabecera del script de build y el bloque
      de fuentes del propio descriptor del tile, los dos declaran
      water-polygons-split-4326— pero QUE las celdas del lago valgan 0 sigue
      siendo INFERENCIA. El instrumento existe en el arbol, se llama
      check_control_points, y no se corrio.

  SITIO NUEVO, agregado a los DOS lados
    SESION-plan-de-cierre-2026-08-20 · barrido=true · 4 filas
    En cobertura.sitios del dato, y en SITIOS_CANON del validador. Quitarlo de
    uno solo pone el validador en rojo por [V5], y esta bien que lo haga.
    NO marca barrido ningun otro sitio: PLAN-5-DECISIONES y CLAUDE-MD siguen en
    false aunque dos de las cuatro filas caigan cerca de ellos, y cada fila lo
    dice en su propio depende_de. LOS NUEVE SIN BARRER SIGUEN SIENDO NUEVE.

EL CONTEO, y los dos numeros van juntos
------------------------------------------------------------------------------
    ANTES   sitios 19 · barridos 10 · sin barrer 9
            filas 68 · unicas 66 · VIVAS 61
            grupo 1: 37/37/36 · grupo 2: 13/13/12 · grupo 3: 15/13/13 · grupo 4: 3/3/0
    AHORA   sitios 20 · barridos 11 · SIN BARRER 9
            filas 72 · unicas 70 · VIVAS 64
            grupo 1: 38/38/37 · grupo 2: 15/15/14 · grupo 3: 15/13/13 · grupo 4: 4/4/0
    version del declarativo 6 -> 7

  LAS VIVAS SUBEN DE 61 A 64 Y ESO ES LO CORRECTO. Cuatro filas nuevas suman
  cuatro vivas; la caducada resta una. 61 + 4 - 1 = 64. Nadie cerro nada por
  trabajo: CERRADAS por trabajo sigue en 2, el mismo numero de ayer.
  Y LA CIFRA DE §2 NO SE MOVIO: sigue 4 de 15, con 2 anuladas por decision del
  owner. Ninguna de estas cuatro filas es una afirmacion de la especificacion.

CONTROLES DE ESTA ESCRITURA
------------------------------------------------------------------------------
  validador del declarativo ....... VERDE · 72 filas · 70 unicas · 64 vivas
  mordida ......................... 32/32, con su control negativo (la copia
                                    sin mutar sale exit 0)
  De las 32, tres muerden justo lo que esta escritura toco y por eso se nombran:
  «grupo 4 sin medicion», «grupo 4 con medicion sin salida cruda» y «pregunta
  del grupo 2 que nombra un fichero del repositorio». Las tres en rojo cuando
  deben, sobre una copia mutada.
  control de caracteres por PUNTOS DE CODIGO (criterio H-T2), sobre los tres
  ficheros tocados del arbol mas el instrumento .......... ver el apartado 11
  control contra el INDICE, no contra el disco ........... ver el apartado 11

  DEFECTO DE INSTRUMENTO: NINGUNO EN ESTA ESCRITURA. Se dice porque el
  declarativo lleva doce fichados y la ausencia tambien es dato. El instrumento
  se escribio como FICHERO y no como node -e inline, que es la regla que este
  repositorio ya pago; se corrio una vez; y se comprobo que los ficheros
  existen despues de correrlo, que es la otra regla que costo un commit malo.
`;
if (!t.includes(a3)) { console.error('ALTO: ancla 3'); process.exit(1); }
t = t.replace(a3, b3);

fs.writeFileSync(F, t, 'utf8');
console.log('ENMENDADA. bytes ' + antes + ' -> ' + t.length);
console.log('existe: ' + fs.existsSync(F));
for (const tok of ['10 . LO QUE EL OWNER RESOLVIO', 'G7 · OPCION (a)', 'G6 · OPCION (c)',
                   'S7(a) · NO SE FIRMA HOY', '61 + 4 - 1 = 64', 'SIN BARRER 9',
                   'LOS NUEVE SIN BARRER SIGUEN SIENDO NUEVE', '213.639.480']) {
  console.log((t.includes(tok) ? '  ok   ' : '  FALTA') + '  ' + tok);
}
console.log((t.includes('no escribe ni una fila en el declarativo. Lo unico que\nesta sesion escribe') ? '  ok     el texto viejo se conserva citado' : '  FALTA  el texto viejo citado'));
