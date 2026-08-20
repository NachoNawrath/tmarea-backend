// Escribe UNA fila con el resultado de (m2). Nada mas. Sin commit.
'use strict';
const fs = require('fs');
const F = 'C:/Users/katia/tmarea-backend/data/deudas/deudas_declaradas.json';
const SITIO = 'SESION-plan-de-cierre-2026-08-20';
const ID = SITIO + '::los-ocho-puntos-caen-en-su-jurisdiccion-y-eso-desacopla-S4-a-medias';

const D = JSON.parse(fs.readFileSync(F, 'utf8'));
if (D.deudas.some(d => d.id === ID)) { console.error('ALTO: la fila ya existe'); process.exit(1); }
const antes = { filas: D.deudas.length, vivas: D.deudas.filter(x => !x.duplicada_de && !['cerrada', 'caduca'].includes(x.estado)).length };

D.deudas.push({
  id: ID,
  token_local: null,
  espacio_de_nombres: 'sesion del plan de cierre 2026-08-20 — medicion (m2)',
  sitio: SITIO,
  repo: 'tmarea-backend',
  texto_literal: null,
  sin_texto: true,
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha:
    'El documento no fecha esta deuda: nace de la medicion (m2) del 2026-08-20, corrida por orden del owner con ' +
    'alcance cerrado a medir y parar. Salida cruda en _bitacoras/plan_de_cierre_2026-08-20/.',
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true,
  duplicada_de: null,
  titulo:
    'Los OCHO puntos lacustres caen DENTRO de su jurisdiccion publicada y los cuatro pares en la MISMA: S4 se ' +
    'puede contestar por extremos, con dos consultas de punto y cero motor de rutas — pero solo la mitad de S4',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    la_capa_no_se_eligio_aca:
      'Sale de data/decreto/ambitos_publicados.json, campo capa_publicada: jurisdicciones_ds991. Ese mismo ' +
      'fichero declara por que NO puede ser la capa consultada, que hoy es un teselado de Voronoi que el ' +
      'contrato marca como contradictorio con INV-3.3. El registro declara el ambito lacustre publicado el ' +
      '2026-08-13 con 6 jurisdicciones esperadas, y la base tiene 6.',
    los_ocho_puntos:
      'Los mismos literales de _bitacoras/spec2_pantalla_2026-08-20/08_lago_contra_las_tres_clases.js, igual ' +
      'que en (m1). No se copiaron de ninguna prosa.',
    TRES_LECTURAS_PORQUE_LA_PREGUNTA_ADMITE_TRES:
      'El owner lo pidio explicitamente y (m1) explico por que. L1 DENTRO estricto con ST_Contains. L3 MAS ' +
      'CERCA con ST_Distance en metros contra las seis. L2 DENTRO CON TOLERANCIA no lleva umbral inventado: se ' +
      'publica la tabla entera de distancias y cualquiera fija el suyo; se informan dos cortes de referencia ' +
      'con su procedencia declarada —50 m, la resolucion de celda del raster; 2000 m, el snap que el descriptor ' +
      'de AUSTRAL_N declara— y se dice que NO son criterios de aceptacion.',
    EL_RESULTADO:
      'LAS TRES LECTURAS COINCIDEN Y DAN LO MISMO PARA LOS CUATRO LAGOS. Los ocho puntos caen DENTRO de una ' +
      'jurisdiccion, a 0 m, sin necesidad de tolerancia, y los dos extremos de cada lago caen en la MISMA: ' +
      'Gral Carrera -> lago_general_carrera · Llanquihue -> puerto_varas · Villarrica -> lago_villarrica · ' +
      'Panguipulli -> lago_panguipulli. Ninguno de los ocho cae en mas de una. La segunda jurisdiccion mas ' +
      'cercana esta, en el caso mas ajustado, a 22,7 km: no hay ambiguedad de adjudicacion en ningun punto.',
    LA_PREGUNTA_QUE_M1_DEJO_SERVIDA_CONTESTADA:
      'SI. Villarrica —que (m1) midio como EXTENT, los dos extremos fuera de todos los tiles— y Panguipulli ' +
      '—MIXTA— TIENEN jurisdiccion publicada, y la MISMA para sus dos extremos. O sea que para contestar S4 por ' +
      'extremos el problema del tile DEJA DE IMPORTAR: la jurisdiccion no vive en el raster, vive en la capa ' +
      'del D.S. 991, y ahi los cuatro lagos estan.',
    EL_CONTROL_POSITIVO_Y_EL_DEFECTO_QUE_DESTAPO:
      'El control son los seis ST_PointOnSurface de las propias jurisdicciones, que por definicion caen dentro ' +
      'incluso en poligonos concavos. NO es un punto maritimo, y el motivo importa: la capa publicada tiene ' +
      'SOLO las seis lacustres —la maritima no esta publicada, C3 falla— asi que cualquier punto de mar cae en ' +
      'ninguna POR CONSTRUCCION y no probaria nada. Por eso el control negativo se declara DEBIL en su propia ' +
      'salida: vale para comprobar que ST_Contains no devuelve true de mas, y nada mas.',
    MI_DEFECTO_DE_INSTRUMENTO_Y_QUE_EL_REPOSITORIO_YA_LO_TENIA_CONTESTADO:
      'La primera version del control positivo exigia que cada punto cayera en SU jurisdiccion Y EN NINGUNA ' +
      'OTRA, y dio 5 de 6: el de lago_ranco cae tambien en puerto_varas. NO ES UN DEFECTO DE LA CAPA. Es un ' +
      'TRASLAPE DECLARADO, y el repositorio ya lo tenia escrito: la salida del build del 2026-08-13 lo imprime ' +
      'textual —"Lago Ranco (lacustre) x Puerto Varas (lacustre) = 155.426 km2"— y el control C3 del ambito ' +
      'lacustre, "cero traslapes fuera de los declarados deliberados", dio obtenido 0. Mi medicion da 155,426 ' +
      'km2 y CORROBORA la suya. El esperado de mi control habia salido de MI SUPOSICION y no de la corrida, ' +
      'que es la familia de la cifra clavada en vez de derivada. Corregido: ahora el esperado SE DERIVA de los ' +
      'traslapes reales de la capa, y el control da 6 de 6. Va escrito porque si se hubiera publicado el 5 de 6 ' +
      'como hallazgo, habria acusado a la capa de un defecto que no tiene.',
    LO_QUE_ESTA_MEDICION_NO_SOSTIENE_Y_LO_PRUEBA_M1:
      'CAER EN LA JURISDICCION NO ES ESTAR EN AGUA NAVEGABLE. La jurisdiccion de una Capitania lacustre no es ' +
      'el espejo de agua: incluye tierra. Y hay un punto donde las dos mediciones se cruzan y las dos son ' +
      'ciertas a la vez: Llanquihue / Muelle, -41,2553 -73,0026. (m2) dice que cae DENTRO de puerto_varas, a ' +
      '0 m, estricto. (m1) dice que el raster ahi vale TIERRA y que hay 0 de 6561 celdas navegables en 2 km. ' +
      'Asi que (m2) sostiene QUE JURISDICCION GOBIERNA ESTE VIAJE y NO sostiene QUE ESTE VIAJE SEA NAVEGABLE. ' +
      'Son dos preguntas distintas y esta medicion contesta una.',
    una_cota_de_lectura_derivada_y_no_citada:
      'La suma de las areas de las seis da 4.479,4 km2 y su UNION da 4.324,0 km2. La diferencia son los ' +
      '155,4 km2 del traslape declarado, que cualquier suma cuenta dos veces. No es un defecto: es como se lee ' +
      'esa cifra, y el registro de ambitos publica la suma.',
    salida_cruda:
      '_bitacoras/plan_de_cierre_2026-08-20/17_m2_ocho_puntos_contra_seis.js y .txt, con las areas y los ' +
      'traslapes en 18_solapes_y_areas.txt.',
  },
  donde: {
    fichero: 'tmarea-backend/PLAN_JURISDICCION.md',
    seccion_por_titulo: '2. ESPECIFICACION — QUE VE EL PATRON CUANDO ESTO ESTE TERMINADO, punto S4',
    cita_de_anclaje:
      'la frase «Si navega en un lago, ve la condicion de su lago», que sigue sin decir por que camino se ' +
      'responde; y el bloque de la unidad U7 de la bitacora del plan de cierre, que lo trata como una pregunta ' +
      'de ruteo',
  },
  costo_estimado:
    'ESTA FILA NO PIDE CONSTRUIR NADA: pide que la pregunta que la fila hermana del grupo 2 tiene que decidir ' +
    'se decida con este numero al lado. Lo que la medicion acota: si el owner elige EXTREMOS, la mitad ' +
    'jurisdiccional de S4 se contesta con DOS CONSULTAS DE PUNTO contra una capa que ya esta publicada, y cero ' +
    'motor de rutas, para los CUATRO lagos —incluidos los dos que el raster no puede rutear—. Si elige ' +
    'TRAYECTO, no se ahorra nada de lo que (m1) midio.',
  depende_de:
    'La decision es la fila hermana SESION-plan-de-cierre-2026-08-20::jurisdiccion-por-trayecto-o-por-extremos, ' +
    'del grupo 2 y SIN FIRMAR. Esta medicion no la contesta: le pone el numero. Y no cierra ' +
    'PLAN-2::ninguna-ruta-lacustre-es-calculable, que sigue viva: ninguna ruta lacustre se rutea igual, y esta ' +
    'fila no lo arregla — lo rodea, y solo para la pregunta jurisdiccional.',
  medicion: '_bitacoras/plan_de_cierre_2026-08-20/, medicion (m2) del 2026-08-20.',
});

const s = D.cobertura.sitios.find(x => x.id === SITIO);
if (!s) { console.error('ALTO: no esta el sitio'); process.exit(1); }
s.filas_en_este_declarativo = 7;
s.vocabulario_del_barrido.push(
  'la medicion (m2) del 2026-08-20: los ocho puntos lacustres contra las seis jurisdicciones publicadas, en ' +
  'TRES lecturas de "cae en la jurisdiccion", con control positivo derivado de los traslapes reales de la capa. ' +
  'El owner la pidio con alcance CERRADO a medir y parar.');

fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');

const despues = { filas: D.deudas.length, vivas: D.deudas.filter(x => !x.duplicada_de && !['cerrada', 'caduca'].includes(x.estado)).length };
console.log('ESCRITA UNA FILA.');
console.log('  ' + ID);
console.log('  filas ' + antes.filas + ' -> ' + despues.filas + '   vivas ' + antes.vivas + ' -> ' + despues.vivas);
console.log('  el sitio declara ahora ' + s.filas_en_este_declarativo + ' filas');
console.log('  filas sin id: ' + D.deudas.filter(d => !d.id).length + '  (asercion por D4, tiene que ser 0)');
console.log('  fichero existe: ' + fs.existsSync(F));
