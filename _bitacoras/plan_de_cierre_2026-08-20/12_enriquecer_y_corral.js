// (1) Enriquece la fila de (m1) con lo que el owner pidio que diga con esas
//     palabras. (2) Escribe la fila propia del punto de control CORRAL.
//     (3) Sube el sitio a 6 filas.
'use strict';
const fs = require('fs');
const F = 'C:/Users/katia/tmarea-backend/data/deudas/deudas_declaradas.json';
const SITIO = 'SESION-plan-de-cierre-2026-08-20';
const ID_M1 = SITIO + '::las-cuatro-lacustres-son-TRES-causas-y-esta-medido';
const ID_CORRAL = SITIO + '::corral-falla-en-un-instrumento-trackeado-y-nadie-lo-sabia';

const D = JSON.parse(fs.readFileSync(F, 'utf8'));
const antes = { filas: D.deudas.length, vivas: D.deudas.filter(x => !x.duplicada_de && !['cerrada', 'caduca'].includes(x.estado)).length };

// ---------------------------------------------------------------------------
// 1 . LA FILA DE (m1), ENRIQUECIDA
// ---------------------------------------------------------------------------
const m1 = D.deudas.find(d => d.id === ID_M1);
if (!m1) { console.error('ALTO: no esta la fila de m1'); process.exit(1); }
const e = m1.evidencia_en_el_arbol;

e.EL_HALLAZGO_DE_LA_SESION_CON_LAS_PALABRAS_DEL_OWNER =
  'EL VALOR DE LA CELDA NO SEPARA LAGO DE MAR. Calbuco lee raw=32768, confianza=0, TIERRA, IGUAL QUE ' +
  'LLANQUIHUE — y la ruta de Calbuco calcula. Lo que separa es el VECINDARIO: 2278 y 3644 contra 0 de 6561. ' +
  'Una medicion que hubiera publicado solo el valor de la celda habria concluido que son el mismo caso. ' +
  'Va con estas palabras porque el owner lo fijo asi el 2026-08-20, y porque es el hallazgo de la sesion: no ' +
  'es un detalle de como se midio, es la diferencia entre medir y no medir.';

e.LO_QUE_ESTA_MEDICION_NO_MIDIO_Y_SE_DICE =
  'QUE EL AGUA NO ESTA, ESTA PROBADO: dentro del extent, cero celdas navegables en el radio de snap alrededor ' +
  'de los cuatro puntos lacustres que caen dentro. QUE LA CAUSA SEA LA FUENTE DE AGUA DEL PIPELINE, NO. Eso ' +
  'SIGUE SIENDO INFERENCIA, y su instrumento esta nombrado y sin correr: habria que abrir la fuente ' +
  'declarada del build —water-polygons-split-4326, derivada de la linea de costa— y comprobar que los lagos ' +
  'interiores no estan en ella. La medicion prueba la AUSENCIA del agua; no prueba su CAUSA. Las dos cosas se ' +
  'confundieron una vez en este frente y no se van a confundir otra.';

e.LO_QUE_ESTO_LE_HACE_A_U7_DEL_PLAN =
  'U7 NO TIENE UN COSTO: TIENE TRES, y eso REORDENA LA UNIDAD. Dos lagos —Llanquihue y Gral Carrera— caen del ' +
  'lado CARO, el que exige tocar la mascara y por lo tanto regenerar tiles. UNO —Villarrica— es solo EXTENT. ' +
  'UNO —Panguipulli— es MIXTO y necesita las dos cosas. Consecuencia directa y medida: arreglar SOLO el extent ' +
  'deja TRES de los cuatro lagos sin ruta. El plan de cierre trata U7 como una unidad con un solo camino caro ' +
  'y un solo camino barato; con esto medido, el camino barato no alcanza para ninguno de los cuatro por si ' +
  'solo. EL PLAN TIENE QUE REFLEJARLO — decision del owner del 2026-08-20 — y esta fila es donde queda escrito ' +
  'hasta que se refleje.';

e.LO_UNICO_QUE_SE_TOCO_DEL_ENTORNO =
  'pyproj 3.7.2 INSTALADO. Es el pin que el propio tools/raster-build/requirements.txt declara, y sin el el ' +
  'instrumento trackeado no arranca. No se instalo nada mas, no se actualizo nada, y no se toco ninguna otra ' +
  'dependencia: numpy ya estaba, y en la version exacta del pin. Queda anotado porque un entorno que cambia ' +
  'sin registro es un resultado que no se puede repetir.';

m1.enmienda_2026_08_20 =
  'ENRIQUECIDA EL MISMO DIA, por decision del owner, con cuatro cosas que la primera version no decia y que no ' +
  'son adorno: (a) el hallazgo del control positivo con las palabras del owner; (b) lo que la medicion NO ' +
  'midio; (c) que U7 tiene TRES costos y no uno, lo que reordena la unidad; (d) la unica mutacion del entorno. ' +
  'Nada de la medicion cambio: los numeros son los mismos de la corrida del 2026-08-20.';

// ---------------------------------------------------------------------------
// 2 . LA FILA DE CORRAL
// ---------------------------------------------------------------------------
if (D.deudas.some(d => d.id === ID_CORRAL)) { console.error('ALTO: la fila de Corral ya existe'); process.exit(1); }

D.deudas.push({
  id: ID_CORRAL,
  token_local: null,
  espacio_de_nombres: 'sesion del plan de cierre 2026-08-20 — hallazgo lateral de (m1)',
  sitio: SITIO,
  repo: 'tmarea-backend',
  texto_literal: null,
  sin_texto: true,
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha:
    'El documento no fecha esta deuda: el instrumento no declara sus fallos en ninguna parte, porque no se ' +
    'corria. Nace del 2026-08-20, al correrlo. Salida cruda en _bitacoras/plan_de_cierre_2026-08-20/.',
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true,
  duplicada_de: null,
  titulo:
    'Un punto de control de un instrumento TRACKEADO falla, y nadie lo sabia porque el instrumento no corria ' +
    'por falta de una dependencia que su propio requirements pinea',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    EL_FALLO:
      'tools/raster-build/check_control_points.py, corrido sobre AUSTRAL_N, da 10 de 11. El que falla es CORRAL: ' +
      'lat -39.8700, lon -73.4300, esperado AGUA, obtenido TIERRA, en fila=841 col=3746 con confianza_raw=0. ' +
      'No es un punto cualquiera de la lista: es un PUERTO MARITIMO REAL, y esta en la lista junto a Anahuac / ' +
      'Puerto Montt y Paso Tenglo, que son los dos que SI dan AGUA.',
    Y_LA_OTRA_MITAD_QUE_ES_LA_QUE_IMPORTA:
      'SE DESCUBRIO SOLO PORQUE ALGUIEN INSTALO EL PIN. El instrumento NO CORRIA: le faltaba pyproj, que su ' +
      'propio tools/raster-build/requirements.txt declara en 3.7.2. Sin esa dependencia el fichero muere en el ' +
      'import y no reporta nada. UN INSTRUMENTO QUE NO CORRE NO REPORTA NADA, Y ESO NO ES LO MISMO QUE REPORTAR ' +
      'VERDE. Mientras estuvo roto, el repositorio tenia un control de puntos de raster trackeado, citado en la ' +
      'spec del router, y en estado desconocido. La deuda no es solo Corral: es que nada obliga a que un ' +
      'instrumento trackeado se pueda correr.',
    lo_que_NO_se_hizo_y_es_deliberado:
      'NO SE INVESTIGO, por instruccion explicita del owner del 2026-08-20. No se sabe si el defecto es de la ' +
      'mascara en ese punto, de la linea de costa de la fuente, o del valor ESPERADO que la lista declara. Las ' +
      'tres son posibles y esta fila no elige. Se escribe el hecho.',
    lo_que_juega_a_favor_de_mirarlo_algun_dia:
      'Corral esta a -39.87 de latitud, o sea en el borde NORTE de AUSTRAL_N, que es la zona que el propio ' +
      'comentario del instrumento dice que se agrego al corregir el bbox. La fila lo anota como CONTEXTO, no ' +
      'como diagnostico.',
    salida_cruda: '_bitacoras/plan_de_cierre_2026-08-20/10a_instrumento_trackeado.txt',
    relacion_con_la_otra_fila_de_la_sesion:
      'Es hallazgo LATERAL de la medicion (m1) y no es (m1). Va como fila propia por decision del owner, para ' +
      'que la fila de (m1) no afirme de si misma algo que no le encargaron.',
  },
  donde: {
    fichero: 'tmarea-backend/tools/raster-build/check_control_points.py',
    seccion_por_titulo: 'la lista CONTROL_POINTS',
    cita_de_anclaje:
      'la entrada que espera AGUA en Corral, y el bloque de imports de la cabecera, que es donde el fichero ' +
      'moria sin la dependencia',
  },
  costo_estimado:
    'DOS COSAS DE PRECIO MUY DISTINTO, y la fila no las funde. Mirar Corral: barato, es un punto y el ' +
    'instrumento ya corre. Que un instrumento trackeado no se pueda correr: eso NO es barato ni es de este ' +
    'fichero — toca como se declara y se comprueba el entorno de las herramientas del repositorio, y hoy nada ' +
    'lo comprueba.',
  depende_de:
    'Nada abierto. Cae cerca de CLAUDE-MD, que es uno de los NUEVE sitios sin barrer y sigue en false: esta ' +
    'fila esta escrita aca porque la produjo esta sesion, no porque ese sitio se haya barrido.',
  medicion: '_bitacoras/plan_de_cierre_2026-08-20/, corrida del instrumento trackeado del 2026-08-20.',
});

// ---------------------------------------------------------------------------
// 3 . EL SITIO
// ---------------------------------------------------------------------------
const s = D.cobertura.sitios.find(x => x.id === SITIO);
if (!s) { console.error('ALTO: no esta el sitio'); process.exit(1); }
s.filas_en_este_declarativo = 6;
s.vocabulario_del_barrido.push(
  'el hallazgo LATERAL que (m1) destapo y que el owner mando a fila propia: que un punto de control de un ' +
  'instrumento trackeado falla, y que se supo solo porque hubo que instalar una dependencia para poder correrlo');

fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');

const despues = { filas: D.deudas.length, vivas: D.deudas.filter(x => !x.duplicada_de && !['cerrada', 'caduca'].includes(x.estado)).length };
console.log('ESCRITO.');
console.log('  enriquecida: ' + ID_M1);
console.log('      + EL_HALLAZGO_DE_LA_SESION_CON_LAS_PALABRAS_DEL_OWNER');
console.log('      + LO_QUE_ESTA_MEDICION_NO_MIDIO_Y_SE_DICE');
console.log('      + LO_QUE_ESTO_LE_HACE_A_U7_DEL_PLAN');
console.log('      + LO_UNICO_QUE_SE_TOCO_DEL_ENTORNO');
console.log('  nueva:       ' + ID_CORRAL);
console.log('  filas ' + antes.filas + ' -> ' + despues.filas + '   vivas ' + antes.vivas + ' -> ' + despues.vivas);
console.log('  el sitio declara ahora ' + s.filas_en_este_declarativo + ' filas');
// se comprueba que la fila nueva TIENE id, que es el defecto que ya mordio una vez
const sinId = D.deudas.filter(d => !d.id).length;
console.log('  filas sin id: ' + sinId + '  (tiene que ser 0 — es el defecto que mordio en 11_fila_m1)');
console.log('  fichero existe: ' + fs.existsSync(F));
