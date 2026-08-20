'use strict';
const fs = require('fs');
const F = 'C:/Users/katia/tmarea-backend/_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt';
let t = fs.readFileSync(F, 'utf8');
const antes = t.length;

// --- U7 vuelve a cambiar: (m2) le contesta la mitad --------------------------
const a1 = 'LO QUE (m1) CAMBIA DE ESTA UNIDAD, y no es un detalle: U7 NO TIENE UN COSTO,\n' +
  'TIENE TRES. Dos lagos del lado caro —mascara—, uno de extent, uno mixto. El\n' +
  'texto de abajo describe la unidad como si tuviera un camino caro y uno barato;\n' +
  'con (m1) medido, el barato NO ALCANZA PARA NINGUNO DE LOS CUATRO por si solo.\n' +
  'Se lee entero contra el apartado 12.\n';
const b1 = a1 +
  'Y LO QUE (m2) CAMBIA, EL MISMO DIA Y EN LA OTRA DIRECCION: la mitad\n' +
  'JURISDICCIONAL de S4 SE PUEDE CONTESTAR SIN EL RASTER, para los CUATRO lagos e\n' +
  'incluidos los dos que el raster no puede rutear. Los ocho puntos caen DENTRO de\n' +
  'su jurisdiccion publicada, a 0 m, y los cuatro pares en la MISMA. Lo que NO se\n' +
  'desacopla es la otra mitad —que el viaje sea navegable—, y (m1) la mide en cero\n' +
  'sobre el mismo punto. Apartado 13.\n';
if (!t.includes(a1)) { console.error('ALTO: ancla U7'); process.exit(1); }
t = t.replace(a1, b1);

// --- el apartado 13 ----------------------------------------------------------
const b2 = `

------------------------------------------------------------------------------
13 . (m2) — LOS OCHO PUNTOS CONTRA LAS SEIS JURISDICCIONES PUBLICADAS
------------------------------------------------------------------------------
Pedida por el owner el 2026-08-20 con ALCANCE CERRADO: se mide y se para. No se
diseno la solucion, no se toco el raster ni la mascara, no se abrio la fuente de
agua — esa inferencia sigue abierta y pide su propia sesion.

LA CAPA NO SE ELIGIO ACA: sale de data/decreto/ambitos_publicados.json, campo
capa_publicada, que declara jurisdicciones_ds991 y explica por que NO puede ser
la capa consultada —que hoy es un teselado de Voronoi que el propio contrato
marca como contradictorio con INV-3.3—. El registro declara el ambito lacustre
publicado el 2026-08-13 con 6 jurisdicciones esperadas; la base tiene 6.
LOS OCHO PUNTOS son los mismos literales que en (m1).

TRES LECTURAS, PORQUE LA PREGUNTA ADMITE TRES
------------------------------------------------------------------------------
  L1 · DENTRO estricto ....... ST_Contains
  L2 · DENTRO con tolerancia . NO lleva umbral inventado. Se publica la tabla
       entera de distancias contra las seis y cada cual fija el suyo. Se
       informan dos cortes de referencia CON SU PROCEDENCIA —50 m, la resolucion
       de celda del raster; 2000 m, el snap que declara el descriptor de
       AUSTRAL_N— y se dice que NO son criterios de aceptacion.
  L3 · MAS CERCA de esa que de otra ... ST_Distance en metros contra las seis

EL RESULTADO — las tres lecturas coinciden
------------------------------------------------------------------------------
  Gral Carrera   Pto Ibanez / Rio Tranquilo  ->  lago_general_carrera   0 m / 0 m
  Llanquihue     Muelle / Frutillar          ->  puerto_varas           0 m / 0 m
  Villarrica     Pucon / Villarrica          ->  lago_villarrica        0 m / 0 m
  Panguipulli    Costanera / Pto Fuy         ->  lago_panguipulli       0 m / 0 m

  Los OCHO caen DENTRO, a 0 m, sin necesitar tolerancia, y los CUATRO pares en la
  MISMA jurisdiccion. Ninguno cae en mas de una. La segunda mas cercana esta, en
  el caso mas ajustado, a 22,7 km: no hay ambiguedad de adjudicacion en ningun
  punto, y por eso las tres lecturas no se separan.

LA PREGUNTA QUE (m1) DEJO SERVIDA, CONTESTADA: SI
------------------------------------------------------------------------------
Villarrica —que (m1) midio EXTENT, los dos extremos fuera de todos los tiles— y
Panguipulli —MIXTA— TIENEN jurisdiccion publicada, y la MISMA para sus dos
extremos. Para contestar S4 por extremos EL PROBLEMA DEL TILE DEJA DE IMPORTAR:
la jurisdiccion no vive en el raster, vive en la capa del D.S. 991, y ahi los
cuatro lagos estan.

EL CONTROL POSITIVO, Y LA REGLA QUE HAY QUE PRESERVAR DE ESTA SESION
------------------------------------------------------------------------------
El control son los seis ST_PointOnSurface de las propias jurisdicciones, que por
definicion caen dentro incluso en poligonos concavos. NO es un punto maritimo, y
el motivo importa: la capa publicada tiene SOLO las seis lacustres —la maritima
no esta publicada, C3 falla— asi que cualquier punto de mar cae en ninguna POR
CONSTRUCCION y eso no probaria nada.

SALIO 5 DE 6. El punto interior de lago_ranco cae tambien en puerto_varas.

Y en vez de publicarlo como hallazgo se fue a buscar si el repositorio ya lo
tenia contestado. LO TENIA, DESDE EL 2026-08-13. La salida del build lo imprime
textual:

    Lago Ranco (lacustre) x Puerto Varas (lacustre) = 155.426 km2

y el control C3 del ambito lacustre —«cero traslapes fuera de los declarados
deliberados»— dio obtenido 0. Es un TRASLAPE DECLARADO. La medicion de hoy da
155,426 km2 y CORROBORA la suya.

EL QUE ESTABA MAL ERA EL CONTROL: su esperado —«cae en la suya y en ninguna
otra»— salia de una SUPOSICION y no de la corrida. Es la familia de la cifra
clavada en vez de derivada. PUBLICARLO HABRIA ACUSADO A LA CAPA DE UN DEFECTO
QUE NO TIENE. Corregido para que el esperado SE DERIVE de los traslapes reales,
el control da 6 de 6.

  > LA REGLA, y queda como regla y no como anecdota: UN CONTROL POSITIVO QUE
  > FALLA SE SOSPECHA A SI MISMO ANTES DE ACUSAR AL DATO, Y LA PRIMERA MEDICION
  > ES BUSCAR SI ALGUIEN YA LO CONTESTO.

EL CONTROL NEGATIVO VA DECLARADO DEBIL EN SU PROPIA SALIDA
------------------------------------------------------------------------------
Cordoba y Quellon caen en ninguna, 2 de 2. Pero con la capa teniendo solo
lacustres, «no cae en ninguna» es cierto para casi todo el pais. UN CONTROL QUE
ES CIERTO PARA CASI TODO EL PAIS NO DISCRIMINA, y decirlo vale mas que tenerlo:
vale para comprobar que ST_Contains no devuelve true de mas, y nada mas. El que
discrimina es el positivo.

EL CRUCE DE (m1) CON (m2), Y ES LO QUE IMPIDE LEER MAL ESTA MEDICION
------------------------------------------------------------------------------
  EL MUELLE DE LLANQUIHUE CAE DENTRO DE LA JURISDICCION A 0 m Y EL RASTER DICE
  TIERRA CON 0 DE 6561 NAVEGABLES. LAS DOS CIERTAS.

  Punto -41,2553 -73,0026, el mismo en las dos mediciones.
  LA JURISDICCION DE UNA CAPITANIA LACUSTRE NO ES EL ESPEJO DE AGUA: INCLUYE
  TIERRA, Y puerto_varas SON 1.437,4 km2.

Eso es lo que impide que alguien lea (m2) como «entonces el lago esta resuelto».
No lo esta. (m2) contesta QUE JURISDICCION GOBIERNA EL VIAJE; (m1) sigue
diciendo que ese viaje NO SE PUEDE TRAZAR. Son dos preguntas y hoy hay una
contestada.

UNA COTA DE LECTURA, derivada y no citada
------------------------------------------------------------------------------
La suma de las areas de las seis da 4.479,4 km2 y su UNION da 4.324,0 km2. La
diferencia son los 155,4 km2 del traslape declarado, que cualquier suma cuenta
dos veces. No es un defecto: es como se lee esa cifra, y el registro de ambitos
publica la suma.

EL VEREDICTO, EN UNA LINEA
------------------------------------------------------------------------------
SI DESACOPLA S4 DEL RASTER, PARA LOS CUATRO —incluidos los dos que el raster no
puede rutear— PERO SOLO LA MITAD JURISDICCIONAL: dos consultas de punto contra
una capa ya publicada contestan «que jurisdiccion gobierna este viaje». LO QUE
QUEDA SIN DESACOPLAR es «este viaje es navegable», que sigue siendo del raster y
que (m1) midio en cero sobre el mismo punto.

LO QUE ESTA FILA NO CIERRA, Y SE DICE
------------------------------------------------------------------------------
NO cierra PLAN-2::ninguna-ruta-lacustre-es-calculable, que sigue VIVA: ninguna
ruta lacustre se rutea igual, y esta medicion no lo arregla — LO RODEA, y solo
para la pregunta jurisdiccional.
Y NO contesta la fila del grupo 2. La decision de si la condicion se responde
por TRAYECTO o por EXTREMOS sigue SIN FIRMAR: esta medicion le puso el numero,
no la contesto.

UNA NOTA DE PROCEDENCIA QUE VA DICHA
------------------------------------------------------------------------------
18_solapes_y_areas.txt es salida cruda de una consulta INLINE, sin fichero de
instrumento. Sus dos numeros —el traslape y las areas— estan RE-DERIVADOS dentro
de 17, que si es fichero versionado, y coinciden. Se conserva como primera
pasada y se declara su procedencia, en vez de dejar una salida cruda sin
instrumento y que alguien la cite como medida.
`;
t = t + b2;

fs.writeFileSync(F, t, 'utf8');
console.log('ENMENDADA. bytes ' + antes + ' -> ' + t.length);
console.log('existe: ' + fs.existsSync(F));
for (const tok of ['13 . (m2) — LOS OCHO PUNTOS CONTRA LAS SEIS',
  'UN CONTROL POSITIVO QUE', 'SALIO 5 DE 6', 'Lago Ranco (lacustre) x Puerto Varas (lacustre) = 155.426 km2',
  'ACUSADO A LA CAPA DE UN DEFECTO', 'LAS DOS CIERTAS', 'NO ES EL ESPEJO DE AGUA',
  'NO DISCRIMINA', 'LO RODEA', 'Y LO QUE (m2) CAMBIA']) {
  console.log((t.includes(tok) ? '  ok   ' : '  FALTA') + '  ' + tok);
}
