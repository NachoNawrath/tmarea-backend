'use strict';
// Escribe la decision (C) del owner del 2026-08-20 sobre el campo `uso`:
//   · fila PLAN-2::desacople-licencia-uso        -> firmada, con la regla y el ORDEN del trabajo
//   · fila PLAN-2::usos-inertes-en-el-formulario -> firmada; la pregunta desaparece por absorcion
//   · fila PLAN-2::sin-bloque-oceanografico-en-p3 -> ENMENDADA: su fuente ya no es el uso
//   · politica_de_firma                           -> la regla nueva: firmar es responder, no hacer
// Ningun estado se mueve: 'cerrada' esta reservado a que SE HIZO EL TRABAJO.

const fs = require('fs');
const path = require('path');
const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const D = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
const por = id => {
  const x = D.deudas.find(y => y.id === id);
  if (!x) { console.error('NO EXISTE la fila ' + id); process.exit(1); }
  return x;
};
const FIRMA = {
  firmada: true,
  fecha: '2026-08-20',
  que_significa_esta_firma: 'El owner firmo la RESPUESTA A LA PREGUNTA, no el trabajo. La fila sigue VIVA a proposito: el vocabulario de estado de este declarativo reserva "cerrada" para cuando se hizo el trabajo, y el propio validador rotula ese numero como "CERRADAS por trabajo". Una decision no es el trabajo. Nadie debe leer esta firma como una deuda cerrada.'
};
const NOTA_ESTADO = 'DECIDIDA Y NO CERRADA. El grupo dice QUE HACE FALTA para cerrarla y el estado dice si ya se hizo: lo que hacia falta era la decision del owner y ya esta; lo que falta es el trabajo, y en la sesion del 2026-08-20 se decidio explicitamente no implementar nada. Cuando el trabajo se haga, la fila cierra con su evidencia.';

// ── FILA 3 · el desacople licencia / uso ─────────────────────────────────────
const f3 = por('PLAN-2::desacople-licencia-uso');
f3.firma_owner = Object.assign({}, FIRMA);
f3.por_que_sigue_viva = NOTA_ESTADO;
f3.decision_del_owner = {
  fecha: '2026-08-20',
  LA_REGLA: 'El uso declarado de la nave DEJA DE GOBERNAR. El REGIMEN — deportivo o comercial — sale de la LICENCIA del registro. La ACTIVIDAD — pesca, acuicultura, transporte — sale del DESTINO del viaje, que ya la declara y por viaje.',
  el_fundamento_del_owner_textual: '"Da lo mismo para que usa esa embarcacion, todos los barcos navegan y listo; eso es hilar muy fino y no aporta, trae confusion."',
  la_precision_que_agrego_la_medicion_y_que_el_owner_hizo_suya: 'El campo hacia DOS trabajos con UN SOLO control: decidia el REGIMEN y pretendia decir la ACTIVIDAD. El que sobra es el que esta mal, y esta mal por una razon precisa: es un hecho de la NAVE, marcado una vez, cuando la actividad es un hecho del VIAJE. El mismo hecho preguntado dos veces, y la vez que sobra es la peor de las dos.',
  por_que_la_licencia_puede_con_el_regimen: 'Medido: de las cinco licencias del registro, TRES dicen "deportivo" en el propio nombre, y el conjunto de licencias deportivas ya existe en el codigo y ya gobierna un bloqueo normativo.',
  por_que_el_destino_puede_con_la_actividad: 'Medido: el patron comercial ya elige Caladero, Centro salmonero o Centro mitilidos entre los tipos de destino, y ya se le exige declarar ESPECIE en caladero y en coordenadas. La actividad ya esta declarada, dos pantallas mas adelante y mejor.',
  el_motor_no_participa: 'Medido: en el backend, `uso` aparece 4 veces y las cuatro son prosa. CERO comportamientos. El motor nunca ve el campo: recibe `perfil_deportivo` y `navegacion_deportiva`, que la PWA construye a partir de el. La decision es entera de la PWA.'
};
f3.EL_ORDEN_DEL_TRABAJO_ES_PARTE_DE_LA_DECISION = {
  firmado_por_el_owner_el: '2026-08-20',
  PRIMERO_DE_TODO: 'Reemplazar el bloqueo del TM-002 Art. 22 para que se apoye en la LICENCIA y no en el ambito derivado del uso.',
  el_motivo_y_es_medido: 'Hoy el bloqueo es "ambito COMERCIAL y licencia DEPORTIVA". Sin el campo, el ambito es comercial PARA TODOS, asi que el bloqueo pasaria a dispararse SIEMPRE: ningun patron con licencia deportiva podria guardar un viaje, nunca. Sacar el campo sin reemplazo convierte un bloqueo normativo correcto en un BLOQUEO UNIVERSAL. El modo de falla no es "deja de bloquear": es "bloquea a todos los deportivos, siempre".',
  DESPUES: [
    'Que la rama deportiva se abra por LICENCIA y no por uso: hoy el perfil deportivo y la navegacion deportiva solo se construyen dentro de la rama que exige uso recreativo.',
    'Que el selector de licencia deje de estar escondido detras del uso — hoy solo se dibuja si el uso es recreativo — y que ofrezca las CINCO del registro, no las cuatro deportivas.',
    'Que la actividad se lea del DESTINO del viaje.'
  ],
  ULTIMA_LINEA: 'Borrar el campo del formulario. Es la ultima linea del trabajo, no la primera.',
  por_que_el_orden_va_escrito_en_la_fila: 'Porque la fila se va a leer despues, cuando nadie recuerde la medicion. Un orden que vive solo en la conversacion se pierde, y el primer paso que se saltee es justamente el que evita el bloqueo universal.'
};
f3.LA_PERDIDA_MEDIDA_Y_SU_RECUPERACION = {
  que_se_pierde: 'El Patron de Nave Menor que pesca deja de recibir el recordatorio de registrar zarpe y recalada en Sernapesca. La condicion de ese recordatorio es un O de TRES — la licencia contiene "artesanal", o contiene "pesca", o el uso es pesca — y el uso era el tercer termino. Su licencia no contiene ninguna de las dos palabras.',
  como_se_recupera: 'POR DESTINO: Caladero. Y no es un parche, es mejor que lo que se pierde — el destino es del VIAJE y el uso se marca UNA VEZ EN LA VIDA. Un patron que declaro "pesca" hace seis meses y hoy sale a buscar combustible recibia el recordatorio igual; con el destino, lo recibe el que va a pescar.',
  quien_no_pierde_nada: 'El Patron de Pesca Artesanal: su licencia contiene las dos palabras y el recordatorio ya le llega hoy SIN pasar por el uso.'
};
f3.las_consecuencias = {
  cuanto_cuelga_del_campo: 'Medido: 6 ramas de comportamiento en la PWA, de las que cuelgan 13 cosas que el patron deportivo ve en pantalla. Las cuatro capitales: el selector de licencia entero — y con el la frase "Tu licencia determina el ambito de navegacion habilitado (RGDN Art. 12)" —, el autocompletado del arqueo bruto desde la eslora (TM-002 Art. 28), el autocompletado de la clasificacion de bahia, y el veredicto deportivo completo.',
  el_obstaculo_de_plomeria_que_hay_que_resolver_por_el_camino: 'Hay DOS campos de licencia con vocabularios distintos. El del formulario ofrece CUATRO — solo deportivas — y solo se dibuja si el uso es recreativo; el del registro tiene CINCO y solo se escribe en el alta, asi que cambiar de licencia exige borrar el perfil. Si la licencia va a gobernar, la autoridad tiene que ser la del registro, y eso toca dos filas del grupo 1 ya declaradas.',
  que_habilita: 'La fila PLAN-2::licencia-de-bahia-en-ruta-costera-sin-aviso, firmada el mismo dia y declarada NO aplicable hasta que este trabajo este hecho.'
};
f3.lo_que_queda = 'En este orden: (1) reemplazar el bloqueo del TM-002 Art. 22 por uno que se apoye en la licencia; (2) abrir la rama deportiva por licencia; (3) mostrar el selector de licencia siempre y con las cinco del registro; (4) leer la actividad del destino del viaje; (5) recuperar el recordatorio de Sernapesca por destino; (6) y recien ahi, borrar el campo del formulario.';

// ── FILA 10 · los usos inertes ───────────────────────────────────────────────
const f10 = por('PLAN-2::usos-inertes-en-el-formulario');
f10.firma_owner = Object.assign({}, FIRMA);
f10.por_que_sigue_viva = NOTA_ESTADO;
f10.decision_del_owner = {
  fecha: '2026-08-20',
  LA_REGLA: 'La pregunta se contesta POR ABSORCION: no es que dos opciones de cuatro no hagan nada, es que LA LISTA ENTERA SE VA. Con el regimen en la licencia y la actividad en el destino, el campo no tiene trabajo que hacer.',
  la_pregunta_que_esta_fila_hacia: 'Decia "o hacen algo, o no deberian estar en la lista". La respuesta del owner del 2026-08-20 es la segunda, y para las cuatro.',
  TRANSPORTE: 'NO existe como perfil de usuario del producto. Decision del owner, textual en su intencion: si un transportista necesita algo distinto, lo dira su licencia o su destino, no un campo que se marca una vez en la vida.',
  ACUICULTURA: 'Deja de ser una opcion inerte que habia que llenar y pasa a ser un DESTINO — Centro salmonero, Centro mitilidos — que el patron ya elige por viaje. No se pierde el perfil: se lo lee donde de verdad se declara.',
  por_que_esta_fila_NO_es_del_grupo_4: 'Su afirmacion NO es falsa: hasta que el campo se saque, elegir acuicultura o transporte sigue dando exactamente la misma pantalla que no elegir. La fila no murio, fue CONTESTADA. El grupo tampoco se reescribe: sigue siendo del owner y conserva su pregunta.',
  un_dato_que_la_medicion_agrego_a_la_fila: 'El ambito se calcula como "recreativo -> deportivo, cualquier otra cosa -> comercial". O sea que acuicultura y transporte no solo son inertes entre si: son indistinguibles del CAMPO VACIO. La fila decia "da la misma pantalla que no elegir" y la medicion lo confirma por construccion, no por casualidad.'
};
f10.lo_que_queda = 'Se cierra con el borrado del campo, que es la ULTIMA linea del trabajo de la fila PLAN-2::desacople-licencia-uso. Esta fila no se toca antes que aquella: borrar la lista sin haber reemplazado el bloqueo es el bloqueo universal.';
f10.depende_de = 'PLAN-2::desacople-licencia-uso. Las dos se firmaron juntas el 2026-08-20 y se cierran con el mismo trabajo.';

// ── ENMIENDA · el bloque oceanografico ───────────────────────────────────────
const oce = por('PLAN-2::sin-bloque-oceanografico-en-p3');
const FRASE_VIEJA = oce.evidencia_en_el_arbol.quien_lo_necesita;
oce.evidencia_en_el_arbol.quien_lo_necesita = 'El viaje que va a pescar. Se lo reconoce por el DESTINO — Caladero, Centro salmonero, Centro mitilidos — mas la ESPECIE que ya se exige en caladero y en coordenadas. Ver la enmienda de abajo.';
oce.enmienda_2026_08_20 = {
  la_frase_que_se_enmienda_textual: FRASE_VIEJA,
  por_que_es_falsa_desde_hoy: 'Con la decision del owner del 2026-08-20 el uso declarado de la nave deja de gobernar y la lista de usos se va entera. Una fuente que va a dejar de existir no puede ser la fuente de este bloque.',
  la_fuente_nueva: 'El DESTINO del viaje mas la ESPECIE. Ya existe y ya esta cableado: el patron comercial elige entre Caladero, Centro salmonero, Centro mitilidos, Puerto o caleta y Coordenadas GPS, y la especie es obligatoria en caladero y en coordenadas.',
  por_que_ademas_es_MEJOR: 'El bloque sirve para buscar caladeros. El destino dice si ESTE viaje va a un caladero; el uso decia si la NAVE se marco alguna vez como de pesca. La fuente nueva es del viaje y la vieja era de la nave.',
  lo_que_NO_cambia: 'Todo lo demas de esta fila sigue en pie: el servicio oceanografico esta entero en el backend, los ocho bloques de la pantalla de verificacion son exhaustivos y ninguno es oceanografico, y el unico camino indirecto — las corrientes que alimentan el ETA — salio vacio en la pantalla medida.'
};
oce.depende_de = 'Producto tiene que decir que ve el pescador; hoy no esta escrito en la especificacion ni en ningun otro lado. Lo que SI quedo decidido el 2026-08-20 es DE DONDE sale que este viaje es de pesca: del destino y la especie, no del uso de la nave.';

// ── POLITICA DE FIRMA · la regla nueva ───────────────────────────────────────
D.politica_de_firma = D.politica_de_firma +
  '  ||  REGLA AGREGADA EL 2026-08-20, y vale para TODOS los grupos: FIRMAR ES RESPONDER, NO HACER. ' +
  'Una fila del grupo 2 con firma_owner.firmada = true y estado "viva" es lo NORMAL y no es una contradiccion: ' +
  'el owner contesto la pregunta y el trabajo sigue pendiente. El estado "cerrada" esta reservado a que SE HIZO ' +
  'EL TRABAJO — el propio validador rotula ese numero como "CERRADAS por trabajo". Cerrar las diez filas firmadas ' +
  'el 2026-08-20 habria bajado las vivas de 59 a 49 sin que nadie tocara una linea, que es exactamente el modo de ' +
  'falla que este campo existe para impedir. LA ASIMETRIA QUE VA ANOTADA Y NO SE CORRIGE: la fila ' +
  'PLAN-3-E8::p1-en-e4 esta cerrada y con firmada=false. No es un defecto y no se toca: esa fila cerro AL APLICAR ' +
  'el texto, no al decidirlo, asi que su cierre lo dio el trabajo y no la firma. Las dos convenciones conviven ' +
  'porque describen dos cosas distintas.';

fs.writeFileSync(RUTA, JSON.stringify(D, null, 2) + '\n', 'utf8');
console.log('ESCRITO. Filas tocadas: 3 (dos firmadas + una enmendada) + politica_de_firma.');
