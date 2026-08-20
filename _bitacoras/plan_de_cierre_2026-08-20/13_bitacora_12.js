'use strict';
const fs = require('fs');
const F = 'C:/Users/katia/tmarea-backend/_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt';
let t = fs.readFileSync(F, 'utf8');
const antes = t.length;

// --- (1) U7 decia que la medicion faltaba. Ya no falta. ---------------------
const a1 = 'QUE ES DE VERDAD — hoy: UNA MEDICION QUE FALTA. Y despues de esa medicion, o\n' +
  'falta un DATO FUENTE o falta una decision de arquitectura. No lo se todavia, y\n' +
  'el prompt lo da por sabido (G5).\n';
const b1 = 'QUE ES DE VERDAD — ~~hoy: UNA MEDICION QUE FALTA~~ LA MEDICION SE HIZO EL\n' +
  'MISMO DIA: ES (m1), Y ESTA EN EL APARTADO 12. El parrafo decia «hoy: UNA\n' +
  'MEDICION QUE FALTA. Y despues de esa medicion, o falta un DATO FUENTE o falta\n' +
  'una decision de arquitectura. No lo se todavia, y el prompt lo da por sabido\n' +
  '(G5)». Se conserva tachado porque era cierto cuando el plan se propuso.\n' +
  'LO QUE (m1) CAMBIA DE ESTA UNIDAD, y no es un detalle: U7 NO TIENE UN COSTO,\n' +
  'TIENE TRES. Dos lagos del lado caro —mascara—, uno de extent, uno mixto. El\n' +
  'texto de abajo describe la unidad como si tuviera un camino caro y uno barato;\n' +
  'con (m1) medido, el barato NO ALCANZA PARA NINGUNO DE LOS CUATRO por si solo.\n' +
  'Se lee entero contra el apartado 12.\n';
if (!t.includes(a1)) { console.error('ALTO: ancla U7'); process.exit(1); }
t = t.replace(a1, b1);

// --- (2) el apartado 11 decia TRES ------------------------------------------
const a2 = '11 . TRES DEFECTOS DE INSTRUMENTO, DECLARADOS PORQUE LOS TRES LLEGARON A CORRER';
const b2 = '11 . TRES DEFECTOS DE INSTRUMENTO, DECLARADOS PORQUE LOS TRES LLEGARON A CORRER\n' +
  '     [AL CERRAR LA SESION SON CINCO. Los otros dos, en el apartado 12.]';
if (!t.includes(a2)) { console.error('ALTO: ancla 11'); process.exit(1); }
t = t.replace(a2, b2);

// --- (3) el apartado 12 -----------------------------------------------------
const b3 = `

------------------------------------------------------------------------------
12 . (m1) — CHECK_CONTROL_POINTS SOBRE LOS OCHO PUNTOS LACUSTRES
------------------------------------------------------------------------------
Pedida por el owner el 2026-08-20 con ALCANCE CERRADO: correr el instrumento
sobre los ocho puntos y publicar el resultado. Nada mas. No se regeneraron
tiles, no se toco la mascara, no se diseno la solucion.

LO PRIMERO, Y ES UN HALLAZGO: EL INSTRUMENTO NO CORRIA
------------------------------------------------------------------------------
tools/raster-build/check_control_points.py moria en el import: falta pyproj, que
su propio tools/raster-build/requirements.txt declara en 3.7.2. De las veinte
dependencias pinneadas solo quedaba numpy —y en la version EXACTA del pin,
2.5.1—, asi que este es el entorno que construyo los tiles y las pesadas se
sacaron despues.
Se instalo el pin. ES LO UNICO QUE SE TOCO DEL ENTORNO EN TODA LA SESION:
    pyproj 3.7.2
No se actualizo nada mas, no se toco ninguna otra dependencia, y no se modifico
ningun fichero de tools/. Queda anotado porque un entorno que cambia sin
registro es un resultado que no se puede repetir.

CON EL INSTALADO, EL INSTRUMENTO TRACKEADO DA 10 DE 11. El que falla es CORRAL,
que espera AGUA en un puerto maritimo real y obtiene TIERRA. Es PREEXISTENTE, es
de un instrumento TRACKEADO, y nadie lo sabia porque el instrumento no corria.
Va como FILA PROPIA por decision del owner, redactada y no aplicada, y NO SE
INVESTIGO. La fila dice las dos cosas: el fallo, y que se supo solo porque
alguien instalo el pin. UN INSTRUMENTO QUE NO CORRE NO REPORTA NADA, Y ESO NO ES
LO MISMO QUE REPORTAR VERDE.

POR QUE HIZO FALTA EXTENDERLO, y que se reuso
------------------------------------------------------------------------------
El instrumento trackeado tiene su lista de puntos CLAVADA en el codigo y mira UN
SOLO TILE por corrida (--tile, por defecto AUSTRAL_N). Con eso no se puede
contestar la pregunta de EXTENT, que exige preguntarle a los CINCO.
Asi que se corrio TAL CUAL primero —salida en 10a_instrumento_trackeado.txt— y
la extension REUSA sus modulos y su aritmetica, sin reimplementar nada:
   · el mismo unpack_cells de packing.py
   · la misma formula col=(x-origin_x)/res, fila=(origin_y-y)/res
   · el mismo criterio: confianza_raw == 0 -> TIERRA, > 0 -> AGUA
   · la proyeccion, con el crs_proj4 que cada tile declara en SU PROPIO
     descriptor. NO se reimplemento la transversa Mercator: una proyeccion mal
     escrita a mano devuelve la celda equivocada EN SILENCIO, que es la familia
     de defecto que este repositorio lleva doce fichados.
Los OCHO PUNTOS salen literales de
_bitacoras/spec2_pantalla_2026-08-20/08_lago_contra_las_tres_clases.js, el
instrumento trackeado que produjo el 12/12. No se copiaron de ninguna prosa.

EL RESULTADO — los ocho puntos contra los cinco tiles
------------------------------------------------------------------------------
  Gral Carrera  Pto Ibanez      DENTRO AUSTRAL_N  raw=32768 conf=0 TIERRA  0/6561
  Gral Carrera  Rio Tranquilo   DENTRO AUSTRAL_N  raw=32768 conf=0 TIERRA  0/6561
  Llanquihue    Muelle          DENTRO AUSTRAL_N  raw=32768 conf=0 TIERRA  0/6561
  Llanquihue    Frutillar       DENTRO AUSTRAL_N  raw=32768 conf=0 TIERRA  0/6561
  Villarrica    Pucon           FUERA DE TODO TILE
  Villarrica    Villarrica      FUERA DE TODO TILE
  Panguipulli   Costanera       DENTRO AUSTRAL_N  raw=32768 conf=0 TIERRA  0/6561
  Panguipulli   Pto Fuy         FUERA DE TODO TILE

  El ultimo numero es CELDAS NAVEGABLES DENTRO DEL SNAP, sobre 6561 celdas de la
  ventana. El radio son 2000 m y NO ES UN UMBRAL DE ESTA SESION: es el snap que
  el propio descriptor de AUSTRAL_N declara en sus observaciones, «0 puertos
  aislados (snap 2000m)».

EL CONTROL POSITIVO, Y ES EL HALLAZGO DE LA SESION
------------------------------------------------------------------------------
  CP Quellon                    DENTRO AUSTRAL_N  raw=40965 conf=1 AGUA    2278/6561
  CP Calbuco                    DENTRO AUSTRAL_N  raw=32768 conf=0 TIERRA  3644/6561
  CP Anahuac / Pto Montt        DENTRO AUSTRAL_N  raw=41011 conf=1 AGUA    2808/6561
  CONTROL NEGATIVO: Cordoba, Argentina -> FUERA DE TODO TILE, 1 de 1.

Son coordenadas de PUERTO, de la misma fuente que las ocho, y de una ruta que SI
calcula. Y destaparon esto, que va con las palabras del owner:

  EL VALOR DE LA CELDA NO SEPARA LAGO DE MAR. Calbuco lee raw=32768,
  confianza=0, TIERRA, IGUAL QUE LLANQUIHUE — y la ruta de Calbuco calcula. Lo
  que separa es el VECINDARIO: 2278 y 3644 contra 0 de 6561. Una medicion que
  hubiera publicado solo el valor de la celda habria concluido que son el mismo
  caso.

La separacion por vecindario es TOTAL y no hay caso intermedio: 2278, 3644 y
2808 de un lado; 0, 0, 0, 0, 0 del otro. Y estaba avisado en el arbol: el propio
check_control_points.py dice en su comentario que un punto de muelle o rampa cae
LEGITIMAMENTE en TIERRA y que eso se resuelve con snap-to-navigable, no es un
defecto del raster. Leer ese comentario ANTES de publicar es lo que impidio
publicar un empate falso.

LA SEPARACION DE CAUSAS — la que el plan anterior dejo DERIVADA
------------------------------------------------------------------------------
  Gral Carrera    MASCARA   dentro del extent, celda TIERRA, 0 navegables en el snap
  Llanquihue      MASCARA   idem
  Villarrica      EXTENT    los dos extremos fuera de todos los tiles
  Panguipulli     MIXTA     Costanera dentro y sin agua; Pto Fuy fuera de todo tile

  DE LOS CUATRO, TRES COINCIDEN CON EL REPARTO DERIVADO DEL PLAN ANTERIOR Y UNO
  NO. Aquel daba Panguipulli como «extent, marginal, por unos 0,7 km». Es MIXTA:
  corregir el extent NO lo arregla. Es exactamente el riesgo que el plan viejo
  declaro al marcar ese reparto como derivado y no medido.

EL VEREDICTO, EN UNA LINEA
------------------------------------------------------------------------------
LA INFERENCIA SE CONFIRMA DONDE APLICA Y DEJA DE SER INFERENCIA —para Llanquihue
y Gral Carrera esta MEDIDO que dentro del extent no hay una sola celda navegable
en 2 km a la redonda, contra 2278-3644 en los maritimos—, NO APLICA a Villarrica
—el problema es extent, no mascara— y APLICA A MEDIAS a Panguipulli.

Y LO QUE NO SE MIDIO, QUE VA PEGADO AL VEREDICTO: que el agua no esta, ESTA
PROBADO. Que la CAUSA sea la fuente de agua del pipeline, NO. Eso SIGUE SIENDO
INFERENCIA, con su instrumento nombrado y sin correr: habria que abrir la fuente
declarada del build y comprobar que los lagos interiores no estan en ella. La
medicion prueba la AUSENCIA; no prueba la CAUSA.

LO QUE ESTO LE HACE AL PLAN
------------------------------------------------------------------------------
U7 NO TIENE UN COSTO: TIENE TRES, Y ESO REORDENA LA UNIDAD (decision del owner,
2026-08-20). Dos lagos del lado caro —el que exige tocar la mascara y por lo
tanto regenerar tiles—, uno de extent, uno mixto. Consecuencia medida: ARREGLAR
SOLO EL EXTENT DEJA TRES DE LOS CUATRO SIN RUTA. El apartado 2 lleva la enmienda
en la cabecera de U7 y el reparto vive aca.
Lo que (m1) NO toca: el orden de §3. U7 sigue octava, porque el criterio no es
el costo. Lo que cambia es que ahora se sabe que detras de la posicion 8 hay
tres trabajos y no uno.

DOS FILAS
------------------------------------------------------------------------------
  SESION-plan-de-cierre-2026-08-20::las-cuatro-lacustres-son-TRES-causas-y-esta-medido
  SESION-plan-de-cierre-2026-08-20::corral-falla-en-un-instrumento-trackeado-y-nadie-lo-sabia
  El sitio pasa a declarar 6 filas. Los nueve sin barrer SIGUEN SIENDO NUEVE.

LOS OTROS DOS DEFECTOS DE INSTRUMENTO — el apartado 11 dice TRES y son CINCO
------------------------------------------------------------------------------
D4 · UNA FILA ESCRITA SIN SU CAMPO id — Y LO CAZO EL VALIDADOR
     instrumento: 11_fila_m1.js
     Armo la fila ENTERA y no le puso el campo id. Usaba la constante ID para
     comprobar que no existiera y para imprimir el log, asi que EL INSTRUMENTO
     DIJO HABER ESCRITO UNA FILA CON id Y HABIA ESCRITO UNA SIN. La salida decia
     «ESCRITA UNA FILA» con el id impreso al lado.
     LO CAZO EL VALIDADOR: [V7] hay una fila sin id. Es el unico de los cinco
     que caza un control de FORMA, y por eso vale nombrarlo: cuando el defecto
     ES de forma, el validador lo agarra. Los otros cuatro no lo eran.
     COMO SE ARREGLO, y es la parte que el owner marco: se RESTAURO el
     declarativo a HEAD con git checkout y se corrigio el INSTRUMENTO, en vez de
     parchear el dato encima. Un instrumento que ya mintio una vez y se parcha
     por fuera queda sirviendo para nada.
     Se agrego ademas, al instrumento siguiente, una asercion de que no hay
     ninguna fila sin id.

D5 · UN CONTROL DEMASIADO ANCHO ACUSANDO A UN TEXTO CORRECTO
     instrumento: 09_verificar_push_enmienda.js
     Exigia que el mensaje de commit no dijera «de 15» en NINGUNA forma. El
     mensaje lo decia dos veces y las dos son legitimas, y la distincion es la
     que importa: una CITA la forma partida como EJEMPLO del defecto D3, y la
     otra cita el costo_estimado de una fila, que contiene el nombre del patron.
     LA POLITICA DEL OWNER PROHIBE PUBLICAR LA CIFRA PELADA, NO NOMBRAR LA
     CADENA MIENTRAS SE DISCUTE EL GUARDIA QUE LA VA A BUSCAR. Acotado a: toda
     aparicion viene con su salvedad O esta entrecomillada, con control negativo
     del propio criterio.
     Y ES OTRA COSA QUE EL GUARDIA DE LA CIFRA VA A NECESITAR, medida antes de
     que se escriba, igual que D3: no basta con normalizar el espacio, hay que
     distinguir PUBLICAR de CITAR. Un guardia que no lo haga rompe todo
     documento que hable del guardia.

     Y EN LA MISMA CORRIDA, D3 MORDIO EN VIVO POR CUARTA VEZ: el control buscaba
     el literal «NORMALIZAR EL ESPACIO EN BLANCO» dentro de la bitacora, y en la
     bitacora ese texto cae en el corte de linea. El control dijo que el
     documento NO traia la leccion que el documento estaba escribiendo. No es un
     defecto nuevo: es D3, y es la mejor prueba que produjo la sesion de que D3
     es cierto.

QUE NO SE TOCO
------------------------------------------------------------------------------
  tools/ no se modifico: check_control_points.py, packing.py y los descriptores
  quedaron como estaban. Los tiles no se tocaron ni se regeneraron. La mascara
  tampoco. PLAN_JURISDICCION.md sigue sin tocarse. src/ de los dos repos,
  intacto. Los dos intocables siguen ' M' y sin stagear.
  Del entorno, SOLO pyproj 3.7.2.
`;
t = t + b3;

fs.writeFileSync(F, t, 'utf8');
console.log('ENMENDADA. bytes ' + antes + ' -> ' + t.length);
console.log('existe: ' + fs.existsSync(F));
for (const tok of ['12 . (m1) — CHECK_CONTROL_POINTS', 'EL VALOR DE LA CELDA NO SEPARA LAGO DE MAR',
                   '2278 y 3644 contra 0 de 6561', 'U7 NO TIENE UN COSTO: TIENE TRES',
                   'ARREGLAR\nSOLO EL EXTENT DEJA TRES DE LOS CUATRO SIN RUTA',
                   'pyproj 3.7.2', 'UN INSTRUMENTO QUE NO CORRE NO REPORTA NADA',
                   'D4 · UNA FILA ESCRITA SIN SU CAMPO id', 'D5 · UN CONTROL DEMASIADO ANCHO',
                   'AL CERRAR LA SESION SON CINCO', '~~hoy: UNA MEDICION QUE FALTA~~']) {
  console.log((t.includes(tok) ? '  ok   ' : '  FALTA') + '  ' + tok.split('\n')[0]);
}
