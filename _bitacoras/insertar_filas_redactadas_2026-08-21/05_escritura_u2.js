// VERSIONADO EL 2026-08-21. Es el instrumento que CORRIO, con UNA sola edicion:
// la raiz del repositorio salia clavada como 'C:/Users/katia/tmarea-backend' y
// ahora se deriva de __dirname, para que corra en cualquier clon. Nada mas se
// toco. Se volvio a correr despues de la edicion — un instrumento no se da por
// bueno porque compila (§ regla de los doce defectos).
// ESCRITURA 2 y 3 -- sitio nuevo + las cuatro filas de U2 A+C (R1..R4).
const fs = require('fs');
const P = require('path').resolve(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const D = JSON.parse(fs.readFileSync(P, 'utf8'));

const SITIO = 'SESION-cobertura-capas-a-c-2026-08-20';
const NS = 'sesion U2 capas A y C 2026-08-20 — lo que la pieza declara en vez de corregir de paso';
const NOTA_FECHA = 'El documento no fecha estas deudas: nacen de construir la composicion de la cobertura el 2026-08-20. La bitacora las redacto en su §6 con la instruccion del owner escrita al lado —«NINGUNA SE INSERTA EN ESTA PIEZA»— y se insertan el 2026-08-21, en la pieza que vacia la cola. Salida cruda en _bitacoras/cobertura_capas_a_c_2026-08-20/.';

if (D.cobertura.sitios.some(s => s.id === SITIO)) throw new Error('ALTO: el sitio ya existe');

// --- ESCRITURA 2 -------------------------------------------------------------
D.cobertura.sitios.push({
  id: SITIO,
  repo: 'tmarea-backend',
  fichero: '_bitacoras/cobertura_capas_a_c_2026-08-20/',
  seccion_por_titulo: 'deudas que genera la U2 capas A y C — que el veredicto deje de decir verde',
  vocabulario_del_barrido: [
    'las CUATRO deudas que la pieza de las capas A y C dejo redactadas en su §6 y que el owner ordeno NO insertar ese dia: lo que la pieza CALCA de drift y no introduce, lo que el pasamanos copia y nadie lee, lo que copia y NO es senal perdida, y el limite del control del borde que la propia pieza construyo',
  ],
  orden: 8,
  barrido: true,
  barrido_el: '2026-08-20',
  filas_en_este_declarativo: 4,
  nota: 'Mismo precedente que SESION-caracterizacion-deudas-2026-08-19, SESION-tres-de-d4-2026-08-20, SESION-limite-puerto-12100-47-2026-08-20, SESION-plan-de-cierre-2026-08-20 y SESION-voseo-al-patron-2026-08-20: una sesion es un sitio de deuda propio. El sitio se crea el 2026-08-21, en la pieza que inserta las filas, y NO el dia del barrido: las cuatro se redactaron el 2026-08-20 sin sitio donde alojarse, y por eso §6 decia «sitio a decidir». Este sitio NO marca barrido ningun otro: PWA-COMENTARIOS y PWA-SIN-ANOTAR siguen en false aunque dos de estas cuatro filas sean de tmarea-pwa y caigan cerca de ellos. LO QUE LA PIEZA NO BARRIO Y NO SE DECLARA ACA: la capa B —el bloque que dibuja el aviso, item 2 del orden del plan de cierre— y la cifra de §2 con su nota, que son piezas propias.',
  bitacora: '_bitacoras/cobertura_capas_a_c_2026-08-20/',
});

// --- ESCRITURA 3 -------------------------------------------------------------
const base = (id, repo, titulo) => ({
  id: SITIO + '::' + id,
  token_local: null,
  espacio_de_nombres: NS,
  sitio: SITIO,
  repo,
  texto_literal: null,
  sin_texto: true,
  titulo,
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha: NOTA_FECHA,
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  duplicada_de: null,
});

const R1 = Object.assign(base(
  'asimetria-de-no-evaluada-entre-el-backend-y-la-pwa',
  'tmarea-backend',
  'La cobertura `no_evaluada` NO aporta en el backend y SI escala en la PWA: `bandera_final` puede decir Q sobre una cobertura que no se pudo evaluar mientras la pantalla dice U'
), {
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_hecho: 'componerConCobertura devuelve la bandera previa cuando banderaCobertura llega en null, y null es el estado no_evaluada. El backend NO escala ese estado. Quien si lo escala es la PWA: useVoyageVerification.js hace `const bandera = c.estado === "no_evaluada" ? "U" : c.bandera`, dentro de escalarPorCobertura. Los dos extremos del borde tratan el mismo estado de forma distinta.',
    la_asimetria_es_heredada: 'De componerConDrift, en drift-ambito-a.js. componerConCobertura esta CALCADA de ella y topada con BANDERA_AVISO. Esta pieza calca la asimetria, no la introduce, y por eso se declara en vez de corregirse de paso (§4.8).',
    fijada_por_test: 'src/services/__tests__/cobertura-compone-veredicto.test.js, caso «bandera NULL (cobertura no_evaluada) NO aporta — la asimetria heredada de drift», que asserta componerConCobertura("Q", null) === "Q" y componerConCobertura("U", null) === "U". La rama esta fijada A LA VISTA: el test la AFIRMA en vez de taparla, asi que corregirla exige tocar el test y deja diff.',
    lo_que_NO_esta_medido: 'Cuantas rutas reales llegan hoy con estado no_evaluada. El test fija el comportamiento sobre entradas construidas; nadie conto el caso en el trafico.',
  },
  donde: {
    fichero: 'src/services/cobertura-jurisdiccional.js y src/services/__tests__/cobertura-compone-veredicto.test.js',
    seccion_por_titulo: 'componerConCobertura -> la rama de banderaCobertura en null',
    cita_de_anclaje: 'el comentario «`banderaCobertura` en null es el estado `no_evaluada`, y aca NO aporta», y el caso de test «bandera NULL (cobertura no_evaluada) NO aporta — la asimetria heredada de drift»',
  },
  costo_estimado: 'Bajo si se decide que el backend escale: es una rama y su test. Lo que no es bajo es DECIDIR de que lado se unifica, porque la misma asimetria vive en drift y arreglar solo la cobertura dejaria a los dos hermanos discrepando entre si.',
  depende_de: 'Nada abierto. Comparte causa con la rama equivalente de componerConDrift, que no tiene fila propia.',
});

const R2 = Object.assign(base(
  'fondeadero-sugerido-no-lo-lee-nadie',
  'tmarea-pwa',
  'QUINTA instancia del mismo pasamanos: `fondeadero_sugerido` se calcula, se copia y no lo lee nadie en toda la PWA — es senal perdida, no campo redundante'
), {
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_hecho: 'El motor calcula un fondeadero sugerido, useVoyageVerification.js lo copia en su objeto `result` (`fondeadero_sugerido: data.fondeadero_sugerido || null`) y esa copia es su UNICA aparicion en la PWA. Copiar no es consumir.',
    el_instrumento: 'La asercion de U1 en src/services/__tests__/borde-pwa-backend.test.js, que mide el consumo SIN el objeto `result` del pasamanos, a proposito: un control que comparara claves emitidas contra claves copiadas lo daria por verde.',
    es_la_QUINTA_del_mismo_pasamanos: 'Van cinco: `cierre` (corregida en 6443178), `cobertura_jurisdiccional` (PLAN-2::cobertura-jurisdiccional-muere-en-el-pasamanos, cableada por esta misma pieza en su capa A), `motivo_principal` y `advertencias` (las dos dentro de D4D5::motivo-principal-muere-en-el-pasamanos), y esta. Va como FILA PROPIA y no absorbida, con el precedente de la segunda: instancia medida en otra sesion, fila propia, sitio propio.',
    por_que_es_senal_y_no_redundancia: 'Se separa de `total` A PROPOSITO. `total` lo recalcula el consumidor por su cuenta; el fondeadero no lo calcula nadie mas en la PWA, asi que su perdida cuesta informacion. Meter los dos en la misma bolsa convertiria la lista en un vaciadero.',
    lo_que_esta_fila_NO_pide: 'Cablearlo. Lo que pide decidir es lo mismo que pide su hermana: si el pasamanos sigue siendo una copia campo por campo, todo campo nuevo del backend nace invisible.',
  },
  donde: {
    fichero: 'tmarea-pwa/src/hooks/useVoyageVerification.js',
    seccion_por_titulo: 'FETCH RESTRICCIONES DE TRANSITO -> fetchTransitRestrictions',
    cita_de_anclaje: 'la linea `fondeadero_sugerido: data.fondeadero_sugerido || null` dentro del objeto `result`, y la ausencia de cualquier lector de ese campo fuera de esa copia',
  },
  costo_estimado: 'Bajo si se decide dibujarlo. Alto —y es la pregunta real, la misma que ya trae D4D5::motivo-principal-muere-en-el-pasamanos— si se decide que el pasamanos deje de ser una copia manual.',
  depende_de: 'Nada abierto. Comparte causa con D4D5::motivo-principal-muere-en-el-pasamanos y con PLAN-2::cobertura-jurisdiccional-muere-en-el-pasamanos.',
});

const R3 = Object.assign(base(
  'total-es-redundante-y-conviene-decirlo',
  'tmarea-pwa',
  '`total` se copia y no lo lee nadie, pero NO es senal perdida: el consumidor lo recalcula. Se declara para que la exencion no quede en silencio'
), {
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_hecho: 'useVoyageVerification.js copia `total: data.total || 0` en su objeto `result` y ningun componente lo lee. Lo que si hace el consumidor es contar por su cuenta: TransitRestrictionsBlock.jsx liga `const lista = transitRestrictions?.restricciones_intermedias || []` y cuenta `lista.length`, `aplican.length` e `informativas.length`. Verificado el 2026-08-21: el literal `restricciones_intermedias.length` da 0 apariciones en tmarea-pwa/src — el conteo pasa por la ligadura `lista`, no por el campo.',
    por_que_es_FILA_y_no_un_detalle: 'Porque la alternativa es una exencion sin motivo. La lista declarada del borde tiene un tipo `redundante` justamente para esto, y §4.2 prohibe que un campo salga de la cuenta sin decir por que.',
    la_separacion_es_deliberada: 'Va aparte de fondeadero_sugerido. Los dos se copian y ninguno tiene lector, pero uno cuesta informacion y el otro no. Meterlos juntos borraria la unica distincion que hace util la lista.',
  },
  donde: {
    fichero: 'tmarea-pwa/src/hooks/useVoyageVerification.js y tmarea-pwa/src/components/verification/TransitRestrictionsBlock.jsx',
    seccion_por_titulo: 'FETCH RESTRICCIONES DE TRANSITO -> fetchTransitRestrictions',
    cita_de_anclaje: 'la linea `total: data.total || 0` dentro del objeto `result`, contra `const lista = transitRestrictions?.restricciones_intermedias || []` y sus `.length` en el bloque',
  },
  costo_estimado: 'Casi nulo como escritura: es una linea de la lista declarada del borde, y ya esta puesta como `redundante`. Lo que la fila conserva es el MOTIVO, para que nadie la reclasifique como senal perdida ni la borre por parecer trivial.',
  depende_de: 'Nada abierto. Es la contracara de la fila de fondeadero_sugerido y solo se entiende junto a ella.',
});

const R4 = Object.assign(base(
  'la-asercion-del-borde-mira-el-payload-congelado',
  'tmarea-backend',
  'La asercion de U1 saca su universo de campos de un payload CONGELADO y no del endpoint vivo: si manana el handler emite una clave mas, el control sigue VERDE y el borde tiene un campo sin declarar'
), {
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_hecho: 'borde-pwa-backend.test.js compara las claves de _bitacoras/spec2_pantalla_2026-08-20/05_payload_antofagasta_taltal.json contra su lista DECLARADO. El payload es lo que el navegador recibio el 2026-08-20. Una clave nueva del handler no aparece en ese fichero, asi que no puede romper la comparacion.',
    el_modo_de_falla: 'El control no se pone rojo: se queda verde afirmando algo que dejo de ser cierto. Es la familia que este repositorio tiene fichada —el instrumento corre perfecto y verifica otra cosa— aplicada al control que existe para impedirla.',
    esta_dicho_DENTRO_del_control: 'Y no solo en la bitacora. El propio test lo declara en bloque destacado antes de la lista, con el motivo escrito: «Queda dicho aca y no en una bitacora porque aca es donde alguien se va a apoyar en el control».',
    lo_que_cerrarlo_exige: 'Leer el `res.json` del handler, o sea parsear codigo. Es otra pieza con su propia decision, y por eso el limite se declara en vez de taparse.',
  },
  donde: {
    fichero: 'src/services/__tests__/borde-pwa-backend.test.js',
    seccion_por_titulo: 'LO QUE ESTE CONTROL NO MIRA, Y HAY QUE SABERLO ANTES DE APOYARSE EN EL',
    cita_de_anclaje: 'LAS CLAVES SALEN DEL PAYLOAD CONGELADO, NO DEL ENDPOINT VIVO.',
  },
  costo_estimado: 'Medio y con decision adentro: hay que elegir entre parsear el `res.json` del handler —fragil ante cualquier refactor— o levantar el endpoint en el propio test, que le mete red o base a una suite que hoy no las necesita. Ninguna de las dos es una linea.',
  depende_de: 'Nada abierto. El control existe y funciona; lo que falta es de donde saca su universo.',
});

const nuevas = [R1, R2, R3, R4];
const ya = new Set(D.deudas.map(d => d.id));
for (const f of nuevas) {
  if (ya.has(f.id)) throw new Error('ALTO: id repetido -> ' + f.id);
  D.deudas.push(f);
}

fs.writeFileSync(P, JSON.stringify(D, null, 2) + '\n', { encoding: 'utf8' });
console.log('ESCRITURA 2 -- sitio nuevo: ' + SITIO + '  (sitios: ' + D.cobertura.sitios.length + ')');
console.log('ESCRITURA 3 -- filas: ' + D.deudas.length);
nuevas.forEach(f => console.log('    ' + f.id + '   [' + f.repo + ']'));
console.log('NOTA: las cuatro van SIN el campo redactada_no_aplicada -- ninguna trae texto de correccion redactado.');
