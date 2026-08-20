// P6 - Escribe LA fila del declarativo, y registra el sitio en los DOS lados.
//
// Se escribe con FICHERO, no con node -e inline (regla del proyecto).
//
// ─── QUE ESCRIBE, DICHO SIN ADORNO ──────────────────────────────────────────
// El encargo dice UNA fila. Es una fila. Pero una fila necesita un SITIO, y una
// sesion de medicion es un sitio propio -- precedentes SESION-caracterizacion-
// deudas-2026-08-19 y SESION-tres-de-d4-2026-08-20. Y un sitio nuevo se agrega
// a los DOS lados o el validador se pone rojo por [V5]:
//    (1) data/deudas/deudas_declaradas.json  -> cobertura.sitios
//    (2) scripts/validar_deudas_declaradas.js -> SITIOS_CANON
// Asi que son UNA fila + DOS registros de sitio. Se dice en vez de colarlo.
//
// NO TOCA ninguna fila existente. En particular NO cierra ni modifica
// D4D5::la-segunda-direccion-no-es-decidible, que es la fila hermana que esta
// medicion contesta en parte: cerrarla es firma del owner, no mia.

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const BE = path.resolve(DIR, '..', '..');
const RUTA_DECL = path.join(BE, 'data/deudas/deudas_declaradas.json');
const RUTA_VALID = path.join(BE, 'scripts/validar_deudas_declaradas.js');

const SITIO = 'SESION-limite-puerto-12100-47-2026-08-20';

const cruce = JSON.parse(fs.readFileSync(path.join(DIR, 'cruce_12100_47.json'), 'utf8'));
const clasif = JSON.parse(fs.readFileSync(path.join(DIR, 'clasificacion_punto1.json'), 'utf8'));

const FILA = {
  id: 'LIMITE-PUERTO::12100-47-cruzada-contra-el-catalogo',
  token_local: null,
  espacio_de_nombres: 'Res. D.G.T.M. y M.M. Ex. 12100/47 — ANEXO "A" punto 1, cruzado contra el catalogo de bahias',
  sitio: SITIO,
  repo: 'tmarea-backend',
  texto_literal: null,
  sin_texto: true,
  donde: {
    fichero: '_bitacoras/limite_puerto_12100_47_2026-08-20/',
    seccion_por_titulo: 'el cruce de la Res. 12100/47 contra el catalogo de 164 bahias',
    cita_de_anclaje: 'la linea de 06_cruzar.txt que dice "EL NUMERO: 9 de 164 bahias (5,5 %), o 9 de las 44 que calzan (20,5 %)"',
  },
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'El documento no la fecha: no estaba escrita en ninguna parte. Nace de la medicion del ' +
    '2026-08-20, cuya salida cruda vive en _bitacoras/limite_puerto_12100_47_2026-08-20/.',
  grupo: '2_decision_del_owner',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true,
  duplicada_de: null,

  titulo: 'El "limite del puerto" SI esta publicado y ya esta medido contra el catalogo: 44 de las ' +
    '164 bahias corresponden a un puerto con limite fijado, pero solo 9 traen coordenadas ' +
    'suficientes para volverse geometria sin abrir una carta del SHOA',

  pregunta: 'Con 9 bahias de 164 geometrizables sin insumo nuevo, ¿se digitaliza ese lote corto, se ' +
    'espera a resolver toponimos por carta del SHOA para llegar a las 21, o no se hace nada con ' +
    'esto? Las tres son defendibles y ninguna depende de medir nada mas. Lo que SI depende de dato ' +
    'externo, y no de esta decision, es si el "DENTRO DEL LIMITE DEL PUERTO" de SITPORT es ESTE ' +
    'limite: eso sigue siendo la fila D4D5::la-segunda-direccion-no-es-decidible.',

  por_que_es_deuda: 'Hasta hoy el repositorio no sabia si el "limite del puerto" que SITPORT nombra ' +
    'en AreaRestriccion existia publicado en alguna parte. Existe, es la Res. D.G.T.M. y M.M. Ex. ' +
    '12100/47 del 01.SEP.2009 con ocho modificaciones, la ultima del 16.AGO.2021, y su ANEXO "A" ' +
    'punto 1 fija los limites. Medido eso, la deuda deja de ser "no sabemos si existe" y pasa a ser ' +
    'una decision con numeros al lado. Se declara porque una medicion que no queda en el declarativo ' +
    'se muere en la bitacora de la sesion que la hizo, que es lo que ya paso cuatro o cinco veces.',

  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    la_pregunta_que_se_contesto: '¿Cuantas de las bahias del catalogo tienen limite de puerto fijado ' +
      'en la Res. 12100/47, y de que formato es cada uno?',

    LA_RESPUESTA: '44 de las 164 bahias del catalogo (26,8 %) corresponden a un puerto con limite ' +
      'fijado: 11 por calce EXACTO de nombre y 33 por calce PROBABLE revisado a mano. 120 sin calce. ' +
      'De esas 44, solo 9 (5,5 % de 164; 20,5 % de las 44) traen coordenadas suficientes para ' +
      'volverse geometria sin resolver un solo toponimo y sin abrir una sola carta del SHOA.',

    la_fuente: {
      documento: 'D.G.T.M. y M.M. Ord. Exenta N° 12100/47 Vrs., 01 de septiembre de 2009, ' +
        'modificada por ultima vez el 16 de agosto de 2021',
      url: 'https://www.directemar.cl/directemar/site/docs/20170203/20170203111813/' +
        '12100_47_010909_dgtm__modificado_el_270821_.pdf',
      consultada_el: '2026-08-20, 16:35 (UTC-04:00). HTTP 200, curl.exe -sS -L. Sin autenticacion.',
      sha256_pdf: 'a9045b8801adff2240d6c8327800750d16d33ac578d06ceb73bf17111f6fc005',
      sha256_txt: 'dc8a1506291c3172f47cc4a4e872dc475c777c3429ad8d3e989df9844eb2430a',
      clase: 'RECONOCIMIENTO — fuente citable, no incorporada. Origen VERIFICADO por consulta propia ' +
        'con URL (no RECORDADO). NO se promovio a data/decreto/: es un cruce de reconocimiento, no ' +
        'una incorporacion. Vive en la bitacora, con .gitattributes propio para que el sha256 del ' +
        '.txt siga valiendo en un clon con core.autocrlf=true.',
      control_de_estabilidad: 'Se descargo DOS veces, 11 minutos aparte y por dos rutas distintas ' +
        '(sonda al scratchpad en el gate, descarga a la bitacora despues). Mismo sha256. Lo que ese ' +
        'control NO prueba es que sea la version vigente: que siga publicada no prueba que no haya ' +
        'sido reemplazada.',
    },

    el_denominador: 'DOS unidades, y no son la misma. ENTRADA = un encabezado del ANEXO "A" punto 1 ' +
      'con su parrafo de limite y su carta: son 49. PUERTO = cada nombre propio que ese encabezado ' +
      'nombra: son 53, porque CUATRO entradas nombran dos puertos (HANGA ROA – HANGA PIKO, PENCO y ' +
      'LIRQUEN, NATALES y BORIES, PERCY y CLARENCIA). El FORMATO es de la entrada; el CRUCE es de los ' +
      'puertos; la RESPUESTA es de las 164 bahias. Toda cifra de esta fila dice cual de las tres usa. ' +
      'Y el 164 es de UNA fuente -- data/decreto/join_bahia_jurisdiccion.json --, no del catalogo ' +
      'entero: data/catalogo/estado_drift.json declara F1:163 F2:163 F3:164 F4:163 F5:163 sobre un ' +
      'universo_sitport de 166.',

    que_quedo_FUERA_y_se_declara: 'Del ANEXO "A" solo se midio el punto 1. Quedan fuera, con su ' +
      'motivo: el punto 2 (zona de espera de practicos, 41 encabezados), el punto 3 (estaciones de ' +
      'transferencia), el punto 4 (dispositivos de separacion de trafico), el punto 5 (derrota ' +
      'recomendada en la parte Oriental del Estrecho de Magallanes — que el encargo no nombraba, y ' +
      'se declara en vez de dejarlo caer) y el ANEXO "B" entero (areas de desembarco de practicos). ' +
      'Ninguno de esos cinco fija limites de puerto.',

    los_cinco_formatos: {
      nota: 'Denominador: las 49 ENTRADAS. El criterio se escribio ANTES de aplicarse, en ' +
        '_bitacoras/limite_puerto_12100_47_2026-08-20/03_criterio_clases.txt.',
      'F1_poligono_o_vertices_enumerados': clasif.conteo_por_clase.F1 +
        ' — ANTOFAGASTA, RIO NEGRO HORNOPIREN, PUNTA ARENAS. Para volverla geometria: nada.',
      'F2_linea_entre_toponimos_sin_coordenadas': clasif.conteo_por_clase.F2 +
        ' — la clase mas grande. Para volverla geometria: georreferenciar CADA toponimo, ninguno ' +
        'esta en el documento.',
      'F3_paralelo_y_o_meridiano': clasif.conteo_por_clase.F3 +
        ' — para volverla geometria: si los dos ejes traen numero, nada; si un eje cuelga de un ' +
        'toponimo, hace falta MEDIA coordenada de ese toponimo (solo la latitud si es un paralelo, ' +
        'solo la longitud si es un meridiano).',
      'F4_mixto_linea_con_coordenadas': clasif.conteo_por_clase.F4 +
        ' — para volverla geometria: georreferenciar solo los extremos sin numero.',
      'F5_CLASE_NUEVA_linea_mas_paralelo_o_meridiano': clasif.conteo_por_clase.F5 +
        ' — TALCAHUANO, ANCUD, PUERTO MONTT. Los cuatro formatos que el encargo anticipaba NO cubren ' +
        'el documento: hay entradas que necesitan una linea entre toponimos Y un paralelo o meridiano ' +
        'para cerrar el limite. ANCUD es el caso puro: "linea que une punta Ahui con roca Cochinos, y ' +
        'el meridiano de la isla Cochinos por el E" no es F2 (hay meridiano), no es F3 (hay linea) y ' +
        'no es F4 (no hay una sola coordenada). La clase se declaro en el criterio ANTES de correr, no ' +
        'despues de ver el resultado.',
      suma: '3 + 18 + 16 + 9 + 3 = 49',
    },

    EL_NUMERO_QUE_DECIDE: {
      cuantas: cruce.coordenadas_de_las_que_calzan.C_TODAS + ' bahias de 164 (5,5 %), o ' +
        cruce.coordenadas_de_las_que_calzan.C_TODAS + ' de las 44 que calzan (20,5 %)',
      cuales: 'bahia 73 PATACHE · 77 BAHIA MORENO (ANTOFAGASTA) · 78 CALETA COLOSO · 89 ISLA DE ' +
        'PASCUA · 98 BAHIA CONCEPCION - TALCAHUANO · 99 BAHIA SAN VICENTE · 115 CANAL HORNOPIREN · ' +
        '131 BAHIA GREGORIO · 134 PUNTA ARENAS',
      el_reparto_de_las_44: 'C-TODAS 9 (geometria directa) · C-ALGUNAS 12 (falta georreferenciar al ' +
        'menos un toponimo) · C-NINGUNA 23 (ni una coordenada). Suma 44. Regla: una bahia que recibe ' +
        'dos puertos de distinta calidad cuenta en la MEJOR.',
      donde_esta_el_cuello_de_botella: 'NO en el emparejamiento. Las 10 entradas C-TODAS del ' +
        'documento aterrizaron TODAS en una bahia del catalogo, ninguna se perdio. El cuello es que ' +
        'el documento casi no trae coordenadas: 25 de sus 49 entradas no tienen ni una.',
      el_escalon_siguiente_medido: 'Resolver los toponimos de las 12 C-ALGUNAS llevaria de 9 a 21 ' +
        'bahias de 164 (12,8 %). Ese salto SI exige abrir cartas del SHOA. No se hizo y no se estimo ' +
        'cuanto cuesta.',
    },

    el_criterio_de_emparejamiento: 'Normalizacion: NFD, quitar diacriticos, mayusculas, colapsar ' +
      'espacios, trim. NO se descartan tokens: no se borran "BAHIA", "PUERTO", "CALETA". Borrar tokens ' +
      'es una heuristica de similitud disfrazada de normalizacion. CALCE EXACTO = cadenas identicas, ' +
      'automatico. CALCE PROBABLE = candidato propuesto por contencion, con veredicto MANUAL y razon ' +
      'escrita, publicados TAMBIEN los rechazados. Ninguna medida de similitud automatica decide nada. ' +
      'Criterio completo y escrito ANTES de aplicarse en 05_criterio_cruce.txt.',

    EL_HALLAZGO_DE_METODO: {
      que_paso: 'El generador automatico de candidatos por contencion propuso 31 pares y NO VIO 9 ' +
        'pares verdaderos, que son 7 bahias distintas. Creerle al generador habria dado 37 bahias en ' +
        'vez de 44: un 16 % de subconteo, y en silencio.',
      los_cuatro_modos_de_falla: 'un PLURAL (el documento dice PATILLOS, el catalogo PATILLO) · un ' +
        'ESPACIO (TALTAL contra "TAL TAL") · un PARENTESIS (ANTOFAGASTA dentro de "BAHIA MORENO ' +
        '(ANTOFAGASTA)", donde la frontera de palabra no salta el parentesis) · y un NOMBRE DISTINTO ' +
        'PARA EL MISMO LUGAR (JUAN FERNANDEZ -> ISLA ROBINSON CRUSOE, RIO NEGRO HORNOPIREN -> CANAL ' +
        'HORNOPIREN, las tres caletas HANGA -> ISLA DE PASCUA, SAN JOSE DE CALBUCO -> BAHIA DE ' +
        'CALBUCO).',
      por_que_no_lo_arregla_un_umbral: 'El cuarto modo no comparte una sola letra util: ningun umbral ' +
        'de similitud, ni fonetica, ni trigramas, encuentran ROBINSON CRUSOE desde JUAN FERNANDEZ. Y ' +
        'aflojar el umbral para cazar los tres primeros habria metido MAS falsos amigos. Lo unico que ' +
        'los encuentra es mirar las 164 a ojo.',
      los_falsos_amigos_que_la_revision_mato: '6 pares rechazados con razon escrita, y dos son del ' +
        'tipo caro: CALETA CHAÑARAL Y ENSENADA GAVIOTA (bahia 158) NO es el puerto de Chañaral de ' +
        'Atacama —la entrada cita la carta SHOA 2213, que es la otra—, y CANAL CHACAO SECTOR PARGUA Y ' +
        'PUNTA CORONEL (bahia 114) NO es el puerto de Coronel: hay ~600 km entre los dos. Un umbral ' +
        'automatico se los come a los dos.',
    },

    la_otra_direccion: 'De los 53 puertos, 45 quedaron emparejados con al menos una bahia y 8 no ' +
      'aterrizan en el catalogo: JUNIN, CALETA BUENA, TOCOPILLA, LOS VILOS, TOME, PENCO, BORIES, ' +
      'PERCY. Los dos numeros —44 de 164 y 45 de 53— no se parecen y no se promedian: la relacion es ' +
      'muchos a muchos en las dos direcciones. Tres puertos de Isla de Pascua caen en una sola bahia, ' +
      'y el catalogo trae DOS entradas para bahia Ancud (118 y 214).',

    las_cartas_del_SHOA: 'Las 49 entradas citan carta con su edicion, 49 de 49, en 50 menciones. ' +
      'Rango de ediciones: 1951 (TALTAL) a 2017 (CONSTITUCION y CORRAL). Una entrada de 1951 sigue ' +
      'siendo el respaldo cartografico vigente de ese limite.',

    EL_AVISO_QUE_NO_SE_PIERDE: {
      lo_que_estos_limites_SON: 'Limites fijados PARA EFECTOS DE PRACTICAJE. El propio documento lo ' +
        'dice en su encabezado: "FIJANSE, para los fines prescritos en el Titulo V, del D.S. (M.) ' +
        'N° 397, de 1985". No son limites de restriccion de navegacion y no son limites de ' +
        'jurisdiccion.',
      lo_que_NO_esta_probado: 'Que el "DENTRO DEL LIMITE DEL PUERTO" que SITPORT declara en ' +
        'AreaRestriccion sea ESTE mismo limite. Es PLAUSIBLE y NO ESTA PROBADO. Esta sesion no lo ' +
        'resuelve a proposito: es dato externo y sigue siendo la fila ' +
        'D4D5::la-segunda-direccion-no-es-decidible.',
      LA_CONVERGENCIA_QUE_VALE_MAS_QUE_LAS_DOS_PARTES: 'data/decreto/fuente_resoluciones_locales/' +
        'PROCEDENCIA.md ya declaraba el 2026-08-12, sobre DIECINUEVE resoluciones locales de ' +
        'DIRECTEMAR y sin una sola excepcion, que "cuando una resolucion local habla de limites, habla ' +
        'de los limites del puerto: una linea entre dos puntas que cierra una bahia. Eso es una boca ' +
        'de puerto, no una frontera entre Capitanias". Esta sesion mide lo mismo en la FUENTE MADRE ' +
        'que esas diecinueve citan. Son dos mediciones independientes —una sobre las hijas, otra ' +
        'sobre la madre— que dan lo mismo, y esa convergencia vale mas que cualquiera de las dos por ' +
        'separado. Lo que ya no se puede sostener es que el limite del puerto sea una nocion vaga: ' +
        'esta publicado, es unico, y esta fechado.',
    },

    lo_que_esto_HABILITA_y_lo_que_NO: {
      habilita: 'Cerrar la mitad de D4D5::la-segunda-direccion-no-es-decidible que preguntaba si el ' +
        'limite del puerto esta publicado en alguna parte. Lo esta. Y da el lote corto de 9 bahias ' +
        'geometrizables sin insumo nuevo, si el owner decide que se digitalizan.',
      no_habilita: 'Saber si ese limite es el que SITPORT usa en AreaRestriccion, que es la otra ' +
        'mitad de esa fila y sigue siendo dato externo. Tampoco habilita nada sobre jurisdiccion: ' +
        'estos limites son de practicaje.',
      lo_que_NO_se_toco: 'No se digitalizo nada, no se resolvio ningun toponimo, no se abrio ninguna ' +
        'carta del SHOA, no se construyo ninguna geometria, no se toco la base ni el catalogo ni una ' +
        'linea de codigo del motor. La resolucion NO se promovio a data/decreto/. Y NO se modifico ' +
        'ninguna fila existente del declarativo: cerrar D4D5::la-segunda-direccion-no-es-decidible es ' +
        'firma del owner.',
    },

    controles: 'FRONTERA DEL BLOQUE: por la numeracion del propio documento (punto 1 = lineas ' +
      '74..464), no por heuristica de texto. POSITIVO: el conteo a ojo de las 49 entradas se hizo ' +
      'ANTES de correr la regla y coincidio. NEGATIVO/DISCRIMINACION: la misma regla de encabezado ' +
      'sobre el punto 2 devuelve 41 encabezados, 6 ausentes del punto 1 — o sea que la regla no esta ' +
      'pegada al blanco y lo que recorta es la frontera. LA MAQUINA CONTRA EL HUMANO: los detectores ' +
      'mecanicos de coordenada y de vertices se corrieron CONTRA mi tabla manual de 49 filas, 0 ' +
      'desacuerdos, y muerden en 24 y en 3 de 49 (o sea que separan, no dicen que si a todo). SUMAS: ' +
      '11+33+120 = 164 y 9+12+23 = 44. RECALL: medido y publicado, 9 pares que el generador no vio.',

    EL_HALLAZGO_DEL_GATE: 'El grep de "ANEXO" —patron ASCII PURO, sin un solo acento— devuelve UNA ' +
      'sola linea del documento, la 1377, que es el ANEXO "B". Concluir de ahi que el Anexo A no esta ' +
      'seria falso: esta en la linea 69, escrito "A N E X O “A”", con espacio entre letra y letra. El ' +
      'problema no era el encoding: era que el vocabulario del documento no es el que uno supone. Un ' +
      'control positivo hace falta TAMBIEN cuando el patron es ASCII puro.',

    defectos_del_documento_que_se_anotan_y_no_se_miden: 'PUNTA ARENAS trae los cinco vertices con el ' +
      'signo de GRADO donde va el de MINUTO en la longitud ("70°52°36” W"): legible para un humano, no ' +
      'parseable a ciegas. RIO NEGRO HORNOPIREN abre con "linea imaginaria de 1,5 millas desde Caleta ' +
      'Rio Negro" y despues enumera cuatro puntos que abarcan ~3,3 millas: el preambulo y los vertices ' +
      'no se reconcilian. PUERTO WILLIAMS es la unica anclada a una BOYA, que es un objeto que se ' +
      'mueve. Ninguna de las tres se midio ni se corrigio.',

    salida_cruda: '_bitacoras/limite_puerto_12100_47_2026-08-20/06_cruzar.txt',
  },
};

const SITIO_NUEVO = {
  id: SITIO,
  repo: 'tmarea-backend',
  fichero: '_bitacoras/limite_puerto_12100_47_2026-08-20/',
  seccion_por_titulo: 'deudas que genera el cruce de la Res. 12100/47 contra el catalogo de bahias',
  vocabulario_del_barrido: [
    'la unica pregunta que el owner pidio: cuantas bahias del catalogo tienen limite de puerto ' +
    'fijado en la Res. D.G.T.M. y M.M. Ex. 12100/47, y de que formato es cada uno',
  ],
  orden: 3,
  barrido: true,
  barrido_el: '2026-08-20',
  filas_en_este_declarativo: 1,
  nota: 'Mismo precedente que SESION-caracterizacion-deudas-2026-08-19 y SESION-tres-de-d4-2026-08-20: ' +
    'una sesion de medicion es un sitio de deuda propio. El alcance fue CERRADO por el owner a contar ' +
    'y clasificar, sin digitalizar, sin resolver toponimos y sin construir geometria, y se cumplio. ' +
    'Este sitio NO marca barrido ningun otro: medir la 12100/47 no barre DIRECTEMAR-REGISTRO ni ' +
    'PLAN-9, que siguen en false.',
  bitacora: '_bitacoras/limite_puerto_12100_47_2026-08-20/',
};

// ── escribir ───────────────────────────────────────────────────────────────
const say = (s) => console.log(s);
say('P6 - LA FILA DEL DECLARATIVO');
say('='.repeat(78));
say('');

const D = JSON.parse(fs.readFileSync(RUTA_DECL, 'utf8'));

const antes = { filas: D.deudas.length, sitios: D.cobertura.sitios.length };
say('ANTES  : ' + antes.filas + ' filas · ' + antes.sitios + ' sitios');

if (D.deudas.some((d) => d.id === FILA.id)) { say('ROJO: la fila ya existe'); process.exit(3); }
if (D.cobertura.sitios.some((s) => s.id === SITIO)) { say('ROJO: el sitio ya existe'); process.exit(3); }

D.deudas.push(FILA);
D.cobertura.sitios.push(SITIO_NUEVO);
fs.writeFileSync(RUTA_DECL, JSON.stringify(D, null, 2) + '\n', 'utf8');

say('DESPUES: ' + D.deudas.length + ' filas · ' + D.cobertura.sitios.length + ' sitios');
say('  fila agregada : ' + FILA.id);
say('  grupo         : ' + FILA.grupo + '   estado: ' + FILA.estado +
    '   firmada: ' + FILA.firma_owner.firmada);
say('  sitio agregado: ' + SITIO);
say('');

// ── el segundo lado: SITIOS_CANON ──────────────────────────────────────────
let v = fs.readFileSync(RUTA_VALID, 'utf8');
if (v.includes(SITIO)) {
  say('SITIOS_CANON: ya estaba, no se toca.');
} else {
  const ancla = "  'SESION-tres-de-d4-2026-08-20',\n";
  if (!v.includes(ancla)) { say('ROJO: no encuentro el ancla en SITIOS_CANON'); process.exit(3); }
  v = v.replace(ancla, ancla + "  '" + SITIO + "',\n");
  fs.writeFileSync(RUTA_VALID, v, 'utf8');
  say('SITIOS_CANON: agregado en scripts/validar_deudas_declaradas.js.');
  say('  Es el SEGUNDO lado. Sin el, [V5] se pone rojo -- y esta bien que lo haga.');
}
say('');
say('NO SE TOCO ninguna fila existente. En particular');
say('D4D5::la-segunda-direccion-no-es-decidible sigue VIVA y sin firmar: esta');
say('medicion contesta la mitad de su pregunta, y cerrarla es firma del owner.');
say('');
say('Corra ahora: npm run deudas');
