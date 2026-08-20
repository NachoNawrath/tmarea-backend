'use strict';
// La fila del texto de §10 del CONTRATO —redactada y NO aplicada, para que el
// owner la pegue— y las dos enmiendas que el segundo defecto de lenguaje obliga.

const fs = require('fs');
const path = require('path');
const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
const SITIO = 'SESION-tres-de-d4-2026-08-20';

const NUEVA = {
  id: 'D4D5::contrato-10-dice-transitar',
  token_local: null,
  espacio_de_nombres: 'CONTRATO_MOTOR.md 10 — catalogo de mensajes',
  sitio: SITIO,
  repo: 'tmarea-backend',
  texto_literal: 'Tu embarcación NO puede transitar por [zona].',
  sin_texto: false,
  titulo: 'El texto de §10 del contrato dice «transitar», y el owner decidio que un barco NAVEGA — redactado y sin aplicar, lo pega el owner',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    donde_esta: 'CONTRATO_MOTOR.md, §10, fila «Zona intermedia cerrada», columna de Capa 1.',
    la_decision: 'Owner, 2026-08-20, vista en pantalla: «un barco NAVEGA, no transita. Transitar es ' +
      'vocabulario de transito terrestre y suena a auto». Se corrigio en la app el mismo dia; el ' +
      'texto del CONTRATO no se toca — precedente D9 (INV-3.5) y D4D5::inv34-derogado-por-d5: el ' +
      'texto del contrato lo escribe el owner.',
    LO_QUE_CAMBIA_Y_LO_QUE_NO: {
      capa_1_CAMBIA: 'de «Tu embarcación NO puede transitar por [zona].» a ' +
        '«Tu embarcación NO puede navegar por [zona].»  Es texto NUESTRO al patron: se corrige.',
      capa_2_NO_CAMBIA_Y_ESTE_ES_EL_PUNTO: 'La Capa 2 dice «Segun D.L. 2222 Art. 32, la Autoridad ' +
        'Maritima puede prohibir el TRANSITO por aguas jurisdiccionales». Eso es PARAFRASIS DE LA ' +
        'NORMA, y la norma dice transito. Cambiarlo seria citar mal el D.L. 2222. NO SE TOCA.',
      el_rotulo_de_la_fila: 'La fila se llama «Zona intermedia cerrada». Queda como PREGUNTA aparte, ' +
        'no resuelta: «zona intermedia» es vocabulario legitimo de INV-3.1 —una jurisdiccion que la ' +
        'ruta atraviesa y no es origen ni destino— pero es la misma palabra que D4 acaba de sacar de ' +
        'la pantalla. Si el owner esta editando §10, conviene que decida las dos juntas.',
    },
    LA_REGLA_QUE_SEPARA_LOS_DOS_CASOS: 'Se corrige el VERBO, no el SUSTANTIVO. «Transitar» como lo ' +
      'que hace un barco es el defecto. «Transito» como nombre de la categoria es la palabra de la ' +
      'norma y se queda: por eso el titulo del bloque «RESTRICCIONES EN TRANSITO» y las otras tres ' +
      'cadenas del mismo componente NO se tocaron.',
    inventario_medido: 'Barrido de los dos repos, src/ y scripts/, extensiones js/jsx/json/css, sin ' +
      'node_modules ni __tests__: 195 ficheros, 101 lineas con el vocabulario. Clasificadas: ' +
      '3 PATRON_VERBO (corregidas), 5 PATRON_SUSTANTIVO (intactas), 2 TOPONIMO (intactas), ' +
      '18 CSS `transition` (falso positivo declarado), 73 INTERNO (identificadores, claves y ' +
      'comentarios: renombrarlos seria comportamiento). Crudo en 15_inventario_transitar.txt.',
    defecto_de_instrumento_declarado: 'El primer barrido uso `grep -riE "tr[aá]nsit"` y PERDIO las ' +
      'cadenas acentuadas: en una expresion de corchetes, «a» es una secuencia UTF-8 de dos bytes y ' +
      'grep la trata como dos alternativas de un byte. El inventario salio corto. Repetido con dos ' +
      'patrones literales. Y la primera CLASIFICACION metio el titulo del bloque en INTERNO, que es ' +
      'justo la cadena que el owner pregunto: lo cazo el volcado de seguridad de la capa de render, ' +
      'que existe porque una lista de anclas se equivoca por omision.',
  },
  donde: {
    fichero: 'CONTRATO_MOTOR.md',
    seccion_por_titulo: '10 — catalogo de mensajes',
    cita_de_anclaje: 'la fila cuya primera celda dice «Zona intermedia cerrada»',
  },
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'El documento no la fecha: nace de la decision del owner del 2026-08-20, tomada mirando ' +
    'la pantalla. Crudo en _bitacoras/tres_de_d4_2026-08-20/.',
  grupo: '2_decision_del_owner',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true,
  texto_ya_redactado_en: 'esta misma fila, campo LO_QUE_CAMBIA_Y_LO_QUE_NO.capa_1_CAMBIA. Esta listo ' +
    'para pegar: cambia UNA palabra de UNA celda.',
  pregunta: 'La Capa 1 de la fila «Zona intermedia cerrada» de §10 dice «Tu embarcación NO puede ' +
    'transitar por [zona].» y ya esta redactado su reemplazo: «Tu embarcación NO puede navegar por ' +
    '[zona].» ¿Lo pegas? Y de paso, ya que estas en §10: ¿el nombre de la fila —«Zona intermedia ' +
    'cerrada»— se queda? Es vocabulario legitimo de INV-3.1, pero es la misma palabra que D4 acaba ' +
    'de sacar de la pantalla del patron.',
  por_que_es_del_owner: 'Es texto de contrato. Precedente D9 (INV-3.5) y D4D5::inv34-derogado-por-d5: ' +
    'el agente mide y redacta, el texto del contrato lo pega el owner.',
  medicion: '_bitacoras/tres_de_d4_2026-08-20/15_inventario_transitar.txt',
  consecuencia_hoy: 'La app ya dice «navegar» y el contrato sigue diciendo «transitar». Mientras eso ' +
    'dure, la Verificacion de §10 contra la pantalla da distinto por una palabra, y es NUESTRA ' +
    'divergencia, no un defecto de la app.',
  duplicada_de: null,
};

const yaEsta = d.deudas.some(x => x.id === NUEVA.id);
if (!yaEsta) d.deudas.push(NUEVA);
console.log('alta: ' + (yaEsta ? 'YA EXISTIA' : NUEVA.id));

// ── ENMIENDA 1 · el hueco de §2 lleva LOS DOS casos ──────────────────────────
const hueco = d.deudas.find(x => x.id === 'D4D5::spec2-sin-punto-de-veracidad');
hueco.titulo = 'Ninguno de los nueve puntos de §2 exige que un mensaje al patron sea VERDADERO ni que este bien dicho, y ya van DOS casos en la misma sesion';
hueco.evidencia_en_el_arbol.SEGUNDO_CASO_EL_MISMO_DIA = {
  el_defecto: '«⛔ Tu embarcación NO puede transitar». Un barco NAVEGA. «Transitar» es vocabulario de ' +
    'transito terrestre. Decision del owner, 2026-08-20, tomada MIRANDO LA PANTALLA.',
  la_app_ya_se_contradecia_sola: 'Dos lineas mas abajo, en la MISMA tarjeta, el motivo que emite el ' +
    'BRE dice «tu embarcación (AB 10) no puede navegar». El verbo correcto ya estaba en el motor; ' +
    'la tarjeta lo contradecia arriba.',
  POR_QUE_REFUERZA_ESTA_FILA_Y_NO_ES_OTRA: 'Es el SEGUNDO defecto de LENGUAJE cazado mirando la ' +
    'pantalla en la misma sesion, despues de «zona intermedia». Los dos son cadenas BIEN FORMADAS ' +
    'que dicen algo equivocado: ningun test las caza —no habia ni uno que las asertara, medido— y ' +
    'ningun validador las caza, porque un validador comprueba forma. Y ninguno de los nueve puntos ' +
    'de §2 los cubre.',
  los_dos_casos: [
    'CASO 1 — «zona intermedia» sobre el puerto de zarpe: el mensaje afirma algo FALSO sobre la ' +
    'posicion. Se cazo dentro de la medicion de S5(b), que hablaba de duplicacion, y S5(b) acaba de ' +
    'ser ANULADA.',
    'CASO 2 — «transitar» por «navegar»: el mensaje esta MAL DICHO para su lector. No se cazo dentro ' +
    'de ninguna medicion: lo vio el owner en pantalla. Ningun instrumento lo habria encontrado.',
  ],
  la_diferencia_entre_los_dos_y_por_que_importa: 'El primero es VERACIDAD —afirma algo que no es—. El ' +
    'segundo es REGISTRO —es cierto pero esta dicho en el idioma equivocado para quien lo lee—. Si ' +
    '§2 suma un punto, hay que decidir si cubre uno o los dos: son criterios distintos y el segundo ' +
    'es mucho mas dificil de verificar sin un humano mirando.',
};
hueco.pregunta = '¿§2 tiene que incluir un punto sobre la calidad de lo que se le dice al patron? Van ' +
  'dos casos en un dia y ninguno lo detecta un test ni un validador: «zona intermedia» sobre el ' +
  'puerto de zarpe, que afirma algo FALSO, y «Tu embarcación NO puede transitar», que es cierto pero ' +
  'esta MAL DICHO —un barco navega—. El primero se cazo por casualidad dentro de la medicion de ' +
  'S5(b), que acaba de anularse; el segundo lo vio el owner en pantalla y ningun instrumento lo ' +
  'habria encontrado. La pregunta tiene dos mitades: ¿el punto nuevo cubre VERACIDAD, cubre REGISTRO, ' +
  'o cubre las dos? Y si cubre registro, ¿contra que se verifica, si no hay instrumento que lo mida?';
console.log('enmendada: D4D5::spec2-sin-punto-de-veracidad — ahora lleva los dos casos');

// ── ENMIENDA 2 · el pasamanos va por la CUARTA ───────────────────────────────
const pas = d.deudas.find(x => x.id === 'D4D5::motivo-principal-muere-en-el-pasamanos');
pas.titulo = 'CUARTA vez el mismo defecto: el backend calcula texto para el patron, el hook lo copia o ni eso, y no lo dibuja nadie';
pas.evidencia_en_el_arbol.CUARTA_INSTANCIA_2026_08_20 = 'Encontrada horas despues de escribir esta ' +
  'fila, y por eso se enmienda en vez de abrir otra: `advertencias` de /api/rutas/calcular. Las ' +
  'compone raster-router-service.js —incluido el cotejo vertical contra el Derrotero SHOA, que le ' +
  'dice al patron que su calado no alcanza en un canal— y la PWA las lee CERO veces en todo su ' +
  'arbol. Control positivo del barrido: «ETA» da 42 en el mismo arbol. Van cuatro: `cierre` ' +
  '(corregida en 6443178), `cobertura_jurisdiccional` (viva), `motivo_principal` y `advertencias`. ' +
  'Y la cuarta es la mas cara de las cuatro: es una advertencia de SONDA.';
console.log('enmendada: D4D5::motivo-principal-muere-en-el-pasamanos — cuarta instancia');

const sitio = d.cobertura.sitios.find(s => s.id === SITIO);
sitio.filas_en_este_declarativo = d.deudas.filter(x => x.sitio === SITIO).length;
d.version = (d.version || 1) + 1;
fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });

const filas = d.deudas.length;
console.log('');
console.log(`filas ${filas} · unicas ${d.deudas.filter(x => !x.duplicada_de).length} · vivas ${d.deudas.filter(x => x.estado === 'viva' && !x.duplicada_de).length}`);
console.log(`sitios ${d.cobertura.sitios.length} · barridos ${d.cobertura.sitios.filter(x => x.barrido).length}`);
console.log(`suma filas_en_este_declarativo: ${d.cobertura.sitios.reduce((a, s) => a + (s.filas_en_este_declarativo || 0), 0)} (tiene que ser ${filas})`);
