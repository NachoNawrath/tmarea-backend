// 02_escribir_fila.js — UNA fila en el declarativo con el resultado de la medicion.
// Escribe por FICHERO y no por `node -e` inline (precedente: backtick y parentesis
// dentro de node -e, dos defectos de instrumento ya fichados).
//
// Toca SOLO data/deudas/deudas_declaradas.json:
//   · agrega 1 fila al sitio SESION-tres-de-d4-2026-08-20
//   · sube filas_en_este_declarativo de ese sitio de 10 a 11  (lo exige [V4])
//   · declara en ese sitio que la medicion que la genera es una QUINTA, no una de
//     las cuatro que el vocabulario_del_barrido enumera — si no, el sitio miente
//
// NO toca src/, ni el parser, ni el validador, ni CONTRATO_MOTOR.md.

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const F = path.join(RAIZ, 'data', 'deudas', 'deudas_declaradas.json');
const SITIO = 'SESION-tres-de-d4-2026-08-20';

const D = JSON.parse(fs.readFileSync(F, 'utf8'));

const antes = { filas: D.deudas.length, vivas: D.deudas.filter((d) => !['cerrada', 'caduca'].includes(d.estado) && d.duplicada_de == null).length };

const fila = {
  id: 'D4D5::detectararea-colapsa-un-vocabulario-de-tres',
  token_local: null,
  espacio_de_nombres: 'PLAN_JURISDICCION.md 5 — D4 y D5, y la celda',
  sitio: SITIO,
  repo: 'tmarea-backend',
  texto_literal: null,
  sin_texto: true,
  donde: {
    fichero: 'src/services/sitport-parser.js',
    seccion_por_titulo: 'Deteccion de area de restriccion — funcion detectarArea()',
    cita_de_anclaje: 'el `return \'DENTRO_Y_FUERA\';` final, el que se alcanza cuando no hubo ni DENTRO ni FUERA',
  },
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'El documento no la fecha: no estaba escrita en ninguna parte. Nace de la medicion de cobertura del 2026-08-20, cuya salida cruda vive en _bitacoras/cobertura_arearestriccion_2026-08-20/.',
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  titulo: 'AreaRestriccion tiene un vocabulario de TRES terminos y detectarArea() lo lee como binario: manda a DENTRO_Y_FUERA tres cosas distintas, una de las cuales es "no se"',
  costo_estimado: 'Chico y acotado a una funcion: detectarArea() son ocho lineas. Lo que NO es chico es decidir que devuelve para el tercer termino y para el campo vacio, porque eso es contrato y no codigo. Medir ya esta pagado.',
  depende_de: 'Nada externo para separar los tres casos. Para que la separacion sirva de algo hace falta la geometria del "limite del puerto", que es la fila hermana D4D5::la-segunda-direccion-no-es-decidible y es dato de DIRECTEMAR.',
  por_que_es_deuda: 'La regla que reemplaza a INV-3.4 —se informan las restricciones que el trazado efectivamente navega— necesita saber DONDE aplica cada restriccion. AreaRestriccion es el unico campo del dato que lo acota. Hoy el motor lo lee con una funcion de dos valores sobre un campo de tres, y el valor que devuelve cuando no entiende es el mismo que devuelve cuando la restriccion aplica en las dos areas. O sea: la unica lectura que el motor hace de este campo no distingue "aplica en todas partes" de "el dato no dice nada".',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    la_pregunta_que_se_contesto: '¿AreaRestriccion esta poblado en la bolsa historica de capturas de SITPORT con la misma cobertura que hoy, o el poblamiento de hoy es de hoy nomas?',
    LA_RESPUESTA: 'NO es de hoy. La cobertura es ALTA y ESTABLE en las diez capturas del arbol, del 2026-07-30 al 2026-08-20 — veintidos dias.',
    el_denominador: 'DIEZ capturas distintas y 509 filas de restriccion. Unidad: captura = un payload distinto de consultaRestricciones, deduplicado por md5 del conjunto de filas; fila = un elemento del recordset, identificado por IDRestriccion. De los trece ficheros candidatos del arbol se excluyo UNO —el insumo alterado a proposito de la prueba de mordida de drift del 2026-08-11, que es un fichero fabricado y no una captura— y se dedujeron DOS payloads repetidos: restricciones_2026-07-31_21-01.json es byte a byte identico a _20-32.json, y la copia de insumo_2026-08-11 lo es de la del directorio padre.',
    cobertura_sobre_la_bolsa_entera: 'POBLADO 437 de 509 filas = 85,9 %. VACIO 72 de 509 = 14,1 %. Definicion de poblado: la clave esta presente, no es null, y su String() sin espacios tiene largo mayor que 0.',
    cobertura_sobre_TIPO_TODOS: 'POBLADO 373 de 379 filas de tipo TODOS = 98,4 %. Solo SEIS filas de tipo TODOS en toda la bolsa no declaran area. Nota de unidad: "tipo TODOS" se cuenta DESPUES de recortar espacios — en el crudo los otros tipos vienen con espacio al final ("FRENTE ATRAQUE ", "INSTALACION ") y sin recortar la comparacion falla.',
    estabilidad_en_el_tiempo: 'Por captura, sobre tipo TODOS: 96,2 % · 100,0 % · 98,6 % · 100,0 % · 96,6 % · 97,4 % · 95,0 % · 100,0 % · 100,0 % · 100,0 %. Nunca baja de 95 %. Sobre la bolsa entera oscila entre 76,9 % y 95,2 % sin tendencia. No se modelo nada: es el numero de cada captura.',
    EL_HALLAZGO: {
      el_vocabulario_es_de_TRES: 'Los valores crudos distintos del campo, en las 509 filas, son combinaciones de TRES terminos y no de dos: "DENTRO DEL LÍMITE DEL PUERTO", "FUERA DEL LÍMITE DEL PUERTO" y "OTRA ÁREA FIJADA POR LA AML". El tercero aparece en 38 filas: solo en 16, acompañado en 22.',
      lo_que_el_parser_hace_con_eso: 'detectarArea() busca las subcadenas DENTRO y FUERA y devuelve DENTRO_Y_FUERA en tres situaciones que no son la misma: (a) las 277 filas que declaran de verdad las dos areas, (b) las 72 filas con el campo en null, y (c) las 16 filas cuyo unico valor es "OTRA ÁREA FIJADA POR LA AML", que no contiene ni DENTRO ni FUERA y cae por el return final. Son 365 filas de 509 saliendo por la misma etiqueta.',
      por_que_no_hizo_falta_tocar_el_parser_para_medirlo: 'Quien colapsa los tres casos es la SALIDA de detectarArea(). El dato crudo no los colapsa: null es distinguible de una cadena, y una cadena con los dos terminos es distinguible de una con uno. La separacion se midio leyendo el campo, no cambiando la funcion. El instrumento importa normalizarTexto de src/services/sitport-parser.js en vez de reimplementarlo, para que su lectura sea la del motor.',
    },
    lo_que_esto_HABILITA_y_lo_que_NO: {
      habilita: 'Que la regla que reemplaza a INV-3.4 se apoye en el campo para acotar el area: el dato esta, es viejo, y en el subconjunto que le importa —tipo TODOS— falta en 6 filas de 379.',
      no_habilita: 'Que el motor sepa DONDE esta ese limite. El campo dice "dentro" o "fuera" de un limite del puerto cuya geometria no esta en el repositorio. Esa es la fila D4D5::la-segunda-direccion-no-es-decidible y sigue siendo dato externo.',
    },
    el_ancla_de_hoy: 'El owner declara 16 de 18 poblados y 15 de 15 de tipo TODOS sobre el vivo del 2026-08-20. Va como DECLARADO: ese momento no dejo artefacto y no se puede volver a ver. Lo MEDIDO del mismo dia que si esta en el arbol es _bitacoras/tres_de_d4_2026-08-20/03_puerto_abierto_con_restriccion.txt, 16:52:48Z, 20 filas vigentes con TODOS=17. Esta sesion tomo ademas una captura propia a las 18:29:41Z —17 filas, 15 poblados, TODOS=14 de 14— que queda en la bitacora y cierra el agujero: el "hoy" de esta fila si se puede volver a ver.',
    INV_34_ESTA_DEROGADA: 'La pregunta nacio como "¿puede INV-3.4 apoyarse en este campo?". INV-3.4 quedo DEROGADA el 2026-08-20 por el commit ec25dae, cuyo asunto lo dice: "D5 CERRADA: el trazado es el criterio. Y deroga INV-3.4, que es el punto de fondo". La decision esta tomada y el TEXTO lo escribe el owner. Por eso el resultado se ancla en la regla que la reemplaza y no en el invariante derogado. Ver D4D5::inv34-derogado-por-d5.',
    controles: 'CONTROL POSITIVO para todo cero: la clave AreaRestriccion esta PRESENTE en las 509 filas, o sea que los 72 vacios son campo vacio y no campo ausente; ademas MotivoRestriccion no vacio en 509 de 509, que prueba que cada fichero se leyo. CONTROL NEGATIVO: la clave inventada AreaRestriccionXX da 0 de 509. CONTROL DE FORMA: las cinco casillas del reparto suman 509 de 509, y por captura tambien. CORROBORACION no buscada: la captura mas chica de la bolsa, la del 2026-08-13 con 9 filas, se sospecho subconjunto; el criterio declarado —contencion de IDRestriccion— la absolvio, y el log del servidor de esa misma sesion dice textual "[SITPORT] consultaRestricciones: 9 registros obtenidos". Dos instrumentos, el mismo 9.',
    defecto_de_instrumento_propio: 'La primera pasada dejo fuera _bitacoras/filtro_puerto_2026-08-17/insumos/CONGELADO_vivo.json sin decirlo: su forma es {congelado_en, ruta, n, cuerpo:{success, data}} y el extractor no conocia la capa `data`, asi que devolvio cero filas y la bolsa salio de NUEVE capturas y 483 filas en vez de DIEZ y 509. El fichero se descartaba EN SILENCIO. Corregido: un candidato ilegible ahora aborta la corrida en vez de caerse de la lista. Se declara porque llego a correr y porque es, otra vez, la misma forma: el instrumento corria perfecto y medía otra cosa.',
    salida_cruda: '_bitacoras/cobertura_arearestriccion_2026-08-20/01_medir_cobertura.txt',
  },
  redactada_no_aplicada: true,
  duplicada_de: null,
};

// no duplicar si se corre dos veces
if (D.deudas.some((d) => d.id === fila.id)) {
  console.error('ALTO: la fila ' + fila.id + ' ya existe. No se escribe dos veces.');
  process.exit(1);
}
D.deudas.push(fila);

const s = D.cobertura.sitios.find((x) => x.id === SITIO);
if (!s) { console.error('ALTO: no existe el sitio ' + SITIO); process.exit(1); }
const declAntes = s.filas_en_este_declarativo;
s.filas_en_este_declarativo = D.deudas.filter((d) => d.sitio === SITIO).length;
s.vocabulario_del_barrido.push('la medicion de cobertura de AreaRestriccion sobre la bolsa historica de capturas (2026-08-20), que es una QUINTA y no una de las cuatro de arriba');
s.nota += ' AMPLIADO otra vez el 2026-08-20 con la fila que salio de medir la cobertura historica de AreaRestriccion: esa medicion NO es una de las cuatro que el owner pidio para D4 y D5, y va declarada aparte en el vocabulario para que el sitio no afirme de si mismo algo que no hizo.';

fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');

const despues = { filas: D.deudas.length, vivas: D.deudas.filter((d) => !['cerrada', 'caduca'].includes(d.estado) && d.duplicada_de == null).length };
console.log('ESCRITO ' + path.relative(RAIZ, F).replace(/\\/g, '/'));
console.log('  fila nueva          : ' + fila.id);
console.log('  sitio               : ' + SITIO);
console.log('  filas del sitio     : ' + declAntes + ' -> ' + s.filas_en_este_declarativo);
console.log('  filas totales       : ' + antes.filas + ' -> ' + despues.filas);
console.log('  vivas unicas        : ' + antes.vivas + ' -> ' + despues.vivas);
