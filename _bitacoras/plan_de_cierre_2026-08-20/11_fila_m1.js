// Escribe UNA fila con el resultado de (m1). Nada mas.
'use strict';
const fs = require('fs');
const F = 'C:/Users/katia/tmarea-backend/data/deudas/deudas_declaradas.json';
const SITIO = 'SESION-plan-de-cierre-2026-08-20';
const ID = SITIO + '::las-cuatro-lacustres-son-TRES-causas-y-esta-medido';

const D = JSON.parse(fs.readFileSync(F, 'utf8'));
if (D.deudas.some(d => d.id === ID)) { console.error('ALTO: la fila ya existe'); process.exit(1); }
const antes = { filas: D.deudas.length, vivas: D.deudas.filter(x => !x.duplicada_de && !['cerrada', 'caduca'].includes(x.estado)).length };

D.deudas.push({
  // DEFECTO PROPIO, DECLARADO: la primera version de este fichero armo la fila
  // ENTERA y no le puso el campo `id`. Usaba la constante ID para comprobar que
  // no existiera y para imprimir el log, asi que el instrumento decia haber
  // escrito una fila con id y habia escrito una sin. LO CAZO EL VALIDADOR, [V7]
  // "hay una fila sin id", que es exactamente para lo que existe. Se restauro el
  // declarativo a HEAD y se corrigio el instrumento, en vez de parchear encima.
  id: ID,
  token_local: null,
  espacio_de_nombres: 'sesion del plan de cierre 2026-08-20 — medicion (m1)',
  sitio: SITIO,
  repo: 'tmarea-backend',
  texto_literal: null,
  sin_texto: true,
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha:
    'El documento no fecha esta deuda: nace de la medicion (m1) del 2026-08-20, corrida por orden del owner ' +
    'con alcance cerrado a correr y publicar. Salida cruda en _bitacoras/plan_de_cierre_2026-08-20/.',
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true,
  duplicada_de: null,
  titulo:
    'Las cuatro rutas lacustres NO fallan por una causa: fallan por TRES, y Panguipulli es MIXTA. ' +
    'El plan anterior las reparto por aritmetica y se equivoco en una',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    instrumento:
      'Se corrio PRIMERO el instrumento trackeado tal cual —tools/raster-build/check_control_points.py sobre ' +
      'AUSTRAL_N, 10 de 11— para probar la cadena de herramientas y heredar su semantica. Ese instrumento tiene ' +
      'su lista de puntos CLAVADA y mira UN SOLO tile, asi que no puede contestar la pregunta de extent. La ' +
      'extension de esta sesion reusa sus mismos modulos y su misma aritmetica —el mismo unpack_cells, la misma ' +
      'formula de fila y columna, el mismo criterio confianza_raw == 0 -> TIERRA— y pregunta a los CINCO tiles. ' +
      'No reimplementa la proyeccion: usa el crs_proj4 que cada tile declara en su propio descriptor.',
    procedencia_de_los_ocho_puntos:
      'Literales de _bitacoras/spec2_pantalla_2026-08-20/08_lago_contra_las_tres_clases.js, que es el ' +
      'instrumento trackeado que produjo el 12/12 de las fallas lacustres. No se copiaron de ninguna prosa.',
    EL_RESULTADO: {
      'Gral Carrera (Pto Ibanez / Rio Tranquilo)':
        'MASCARA. Los DOS extremos caen DENTRO de AUSTRAL_N, la celda vale raw=32768 confianza=0 —TIERRA— y ' +
        'hay CERO celdas navegables en el radio de snap. 0 de 6561.',
      'Llanquihue (Muelle / Frutillar)':
        'MASCARA. Identico: los dos dentro de AUSTRAL_N, celda TIERRA, 0 de 6561 navegables.',
      'Villarrica (Pucon / Villarrica)':
        'EXTENT. Los DOS extremos caen FUERA DE TODOS LOS TILES. No es un problema de mascara: no hay raster ' +
        'que consultar.',
      'Panguipulli (Costanera / Pto Fuy)':
        'MIXTA, y es la correccion que esta medicion trae. Costanera cae DENTRO de AUSTRAL_N con celda TIERRA ' +
        'y 0 de 6561 navegables —o sea MASCARA—; Pto Fuy cae FUERA DE TODO TILE —o sea EXTENT—. Un solo lago ' +
        'con las dos causas, una en cada punta.',
    },
    EL_CONTROL_POSITIVO_Y_LO_QUE_DESTAPO:
      'El control son coordenadas de PUERTO de la misma fuente y de una ruta que SI calcula. Y destapo algo que ' +
      'obliga a decir COMO se midio: CALBUCO LEE EXACTAMENTE LO MISMO QUE LOS LAGOS EN LA CELDA —raw=32768, ' +
      'confianza=0, TIERRA— y sin embargo su ruta calcula. O sea que EL VALOR DE LA CELDA, SOLO, NO SEPARA LAGO ' +
      'DE MAR. Lo que separa es el VECINDARIO: Quellon 2278 de 6561 celdas navegables, Calbuco 3644 de 6561, ' +
      'Anahuac 2808 de 6561, y los cuatro puntos lacustres de dentro del extent, 0 de 6561. La separacion es ' +
      'total y no hay caso intermedio. Un punto de muelle cae LEGITIMAMENTE en tierra —lo dice el propio ' +
      'check_control_points.py en su comentario— y por eso una medicion que solo hubiera publicado el valor de ' +
      'la celda habria concluido que Calbuco y Llanquihue son el mismo caso. No lo son.',
    el_radio_no_es_un_umbral_inventado:
      'Los 2000 m son el snap que el propio descriptor de AUSTRAL_N declara en sus observaciones: ' +
      '"0 puertos aislados (snap 2000m)". No se eligio en esta sesion.',
    CONTROL_NEGATIVO: 'Un punto de Cordoba, Argentina: FUERA DE TODO TILE, 1 de 1.',
    LO_QUE_ESTO_LE_HACE_A_LA_INFERENCIA_DEL_PLAN:
      'La inferencia era: la mascara de agua se construyo con datos del OCEANO, asi que los lagos no estan en ' +
      'ella por construccion. QUEDA CONFIRMADA DONDE APLICA y deja de ser inferencia: para Llanquihue y Gral ' +
      'Carrera esta MEDIDO que dentro del extent no hay una sola celda de agua navegable en 2 km a la redonda, ' +
      'contra 2278-3644 en los tres marítimos. Para Villarrica NO APLICA —el problema es extent, no mascara— y ' +
      'para Panguipulli aplica a medias. Lo que sigue SIN medir, y se dice: que la CAUSA de esa ausencia sea la ' +
      'fuente de agua del pipeline. La medicion prueba que el agua no esta; no prueba por que no esta. Para eso ' +
      'habria que abrir la fuente, y no es lo que el owner pidio.',
    LO_QUE_CORRIGE_DEL_PLAN_ANTERIOR:
      'El plan anterior repartio las causas por ARITMETICA sobre el registry y los descriptores, y lo declaro ' +
      'como derivado y no medido. De los cuatro, TRES coinciden con lo medido. El cuarto NO: daba Panguipulli ' +
      'como "extent, marginal, por unos 0,7 km", y es MIXTA. Corregir el extent no lo arregla.',
    salida_cruda:
      '_bitacoras/plan_de_cierre_2026-08-20/10_m1_ocho_puntos_lacustres.py y .txt, con la corrida del ' +
      'instrumento trackeado en 10a_instrumento_trackeado.txt.',
    UN_HALLAZGO_LATERAL_QUE_NO_ES_ESTO_Y_VA_EN_UNA_LINEA:
      'El instrumento trackeado NO CORRIA: le faltaba pyproj, que su propio requirements.txt pinea en 3.7.2 y ' +
      'que no estaba instalado —solo quedaba numpy, y en la version exacta del pin—. Se instalo el pin para ' +
      'poder correrlo. Y con el instalado, el instrumento da 10 de 11: su punto de control CORRAL espera AGUA y ' +
      'obtiene TIERRA. Es preexistente, es de un instrumento trackeado, y no es esta medicion.',
  },
  donde: {
    fichero: 'tmarea-backend/tools/raster-build/check_control_points.py',
    seccion_por_titulo: 'la lista CONTROL_POINTS y el argumento --tile',
    cita_de_anclaje:
      'la lista de puntos clavada en el codigo y el hecho de que el instrumento mire un solo tile por corrida, ' +
      'que es lo que impide contestar la pregunta de extent sin extenderlo',
  },
  costo_estimado:
    'ESTA FILA NO PIDE ARREGLAR NADA: pide que el reparto medido reemplace al derivado alli donde el derivado ' +
    'esta escrito. Eso es escritura. Lo que la medicion SI acota, y es su valor: la unidad U7 del plan de cierre ' +
    'no tiene UN costo sino TRES, y dos lagos de cuatro caen del lado caro —el que exige tocar la mascara— asi ' +
    'que arreglar solo el extent deja tres de los cuatro sin ruta.',
  depende_de:
    'Nada abierto para escribir el reparto. La DECISION de que hacer con el sigue siendo la fila hermana ' +
    'SESION-plan-de-cierre-2026-08-20::jurisdiccion-por-trayecto-o-por-extremos, del grupo 2 y sin firmar: si ' +
    'la condicion se responde por EXTREMOS, ninguna de las tres causas hay que arreglarla. Y la fila ' +
    'PLAN-2::ninguna-ruta-lacustre-es-calculable predijo en su costo_estimado que esta medicion podia partirla; ' +
    'partirla o enmendarla NO se hizo aca, porque el owner cerro el alcance a correr y publicar.',
  medicion: '_bitacoras/plan_de_cierre_2026-08-20/, medicion (m1) del 2026-08-20.',
});

const s = D.cobertura.sitios.find(x => x.id === SITIO);
if (!s) { console.error('ALTO: no esta el sitio'); process.exit(1); }
s.filas_en_este_declarativo = 5;
s.vocabulario_del_barrido.push(
  'la medicion (m1) del 2026-08-20: check_control_points sobre los ocho puntos lacustres contra los cinco tiles, ' +
  'con control positivo maritimo y control negativo. El owner la pidio con alcance CERRADO a correr y publicar.');
s.nota += ' AMPLIADO el 2026-08-20 con la fila de (m1): el owner ordeno correr check_control_points sobre los ' +
  'ocho puntos lacustres. Es una QUINTA fila y no una de las cuatro del gate, y va declarada aparte para que el ' +
  'sitio no afirme de si mismo algo que no hizo.';

fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');
const despues = { filas: D.deudas.length, vivas: D.deudas.filter(x => !x.duplicada_de && !['cerrada', 'caduca'].includes(x.estado)).length };
console.log('ESCRITA UNA FILA.');
console.log('  ' + ID);
console.log('  filas ' + antes.filas + ' -> ' + despues.filas + '   vivas ' + antes.vivas + ' -> ' + despues.vivas);
console.log('  el sitio declara ahora ' + s.filas_en_este_declarativo + ' filas');
console.log('  fichero existe: ' + fs.existsSync(F));
