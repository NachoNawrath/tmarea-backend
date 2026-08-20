'use strict';
// Tres filas que salen de D4 FIRMADA (owner, 2026-08-20).
// Se escribe con FICHERO, no con `node -e` inline: regla del declarativo.
// El esquema se respeta desde el principio esta vez — la evidencia va DENTRO de
// `evidencia_en_el_arbol` y `abierta_el` va en null cuando el documento no la
// fecha. Los dos los cazo [V7] en la tanda anterior.

const fs = require('fs');
const path = require('path');
const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));

const SITIO = 'SESION-tres-de-d4-2026-08-20';
const base = {
  token_local: null,
  espacio_de_nombres: 'PLAN_JURISDICCION.md 5 — D4 y D5, y la celda',
  sitio: SITIO,
  texto_literal: null,
  sin_texto: true,
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'El documento no fecha estas deudas: nacen de la medicion y de la firma de D4 del ' +
    '2026-08-20. Salida cruda en _bitacoras/tres_de_d4_2026-08-20/.',
  estado: 'viva',
  firma_owner: { firmada: false, fecha: null },
  redactada_no_aplicada: true,
  duplicada_de: null,
  medicion: '_bitacoras/tres_de_d4_2026-08-20/',
};

const NUEVAS = [
{
  ...base,
  id: 'D4D5::motivo-principal-muere-en-el-pasamanos',
  repo: 'tmarea-pwa',
  grupo: '1_cierra_con_lo_que_hay',
  titulo: 'TERCERA vez el mismo defecto: el backend calcula motivo_principal, el hook lo copia, y no lo dibuja nadie',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_hecho: 'motivo_principal se emite en sitport-routes.js (respuesta de /restricciones-ruta), ' +
      'lo copia useVoyageVerification.js en su objeto result, y esa copia es su UNICA aparicion en ' +
      'toda la PWA. VoyageVerdict arma su propia lista de `razones` desde restricciones_intermedias ' +
      'y nunca lo lee.',
    conteos: 'motivo_principal: 4 en el backend (src/), 1 en la PWA (src/) y esa 1 es la linea que lo ' +
      'copia. Control positivo del alcance del grep: "restriccion" da 77 en el mismo arbol de la PWA. ' +
      'Control negativo: "ZZQX" da 0 en el backend.',
    POR_QUE_ES_FILA_Y_NO_UN_DETALLE: 'Es la TERCERA instancia del mismo defecto en el mismo fichero. ' +
      'La primera fue `cierre` —corregida en 6443178—, la segunda es `cobertura_jurisdiccional` ' +
      '—viva, PLAN-2::cobertura-jurisdiccional-muere-en-el-pasamanos—, y esta es la tercera. ' +
      'Tres veces ya no es casualidad: el pasamanos copia campo por campo, asi que TODO campo nuevo ' +
      'del backend nace invisible salvo que alguien se acuerde de nombrarlo. Lo que la fila pide no ' +
      'es cablear este campo: es que se decida si el pasamanos sigue siendo una copia manual.',
    lo_que_costo_hoy: 'Obligo a corregir la cadena de «zona intermedia» en DOS sitios. Si el ' +
      'motivo_principal se dibujara, uno solo habria alcanzado. Y al reves: si se hubiera corregido ' +
      'solo el backend, la pantalla no habria cambiado y el control lo habria dado por hecho.',
    lo_que_esta_fila_NO_pide: 'Arreglarlo. El owner lo dijo explicitamente el 2026-08-20: se escribe, ' +
      'no se arregla.',
  },
  donde: {
    fichero: 'tmarea-pwa/src/hooks/useVoyageVerification.js',
    seccion_por_titulo: 'FETCH RESTRICCIONES DE TRANSITO -> fetchTransitRestrictions',
    cita_de_anclaje: 'la linea que copia motivo_principal dentro del objeto `result`, y la ausencia de ' +
      'cualquier lector de ese campo en components/verification/',
  },
  costo_estimado: 'Bajo si se decide dibujarlo. Alto —y es la pregunta real— si se decide que el ' +
    'pasamanos deje de ser una copia campo por campo: eso toca todos los consumidores.',
  depende_de: 'Nada abierto. Comparte causa con PLAN-2::cobertura-jurisdiccional-muere-en-el-pasamanos.',
},
{
  ...base,
  id: 'D4D5::spec2-sin-punto-de-veracidad',
  repo: 'tmarea-backend',
  grupo: '2_decision_del_owner',
  titulo: 'Ninguno de los nueve puntos de §2 exige que un mensaje al patron sea verdadero, y el unico que lo tapaba acaba de anularse',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    el_defecto_que_lo_destapo: 'El veredicto llamaba «zona intermedia» a Bahia Quellon cuando Bahia ' +
      'Quellon era el puerto de ZARPE. Es un mensaje que afirma algo FALSO sobre la posicion, y le ' +
      'puede hacer buscar fondeadero intermedio por un problema que tiene bajo los pies.',
    COMO_SE_CAZO: 'Por casualidad de alcance. Salio dentro de la evidencia de S5(b), que hablaba de ' +
      'DUPLICACION, no de veracidad. El rotulo era consecuencia de la duplicacion, no la violacion.',
    lo_que_cambia_hoy: 'S5(b) queda ANULADA por D4. O sea: el unico punto de §2 bajo cuya medicion ' +
      'este defecto aparecio ya no existe. La proxima vez que un mensaje afirme algo falso, ninguno ' +
      'de los nueve lo detecta.',
    se_reviso_uno_por_uno_y_ninguno_lo_cubre: 'S1 y S2 son de alcance (que se ve). S3, S8 y S9 son de ' +
      'no-silencio (que no falte). S4 es de ambito. S5 era de duplicacion. S6 es de coherencia entre ' +
      'el veredicto y lo de abajo —cubre CONTRADICCION entre dos mensajes, no falsedad de uno solo—. ' +
      'S7 es de cita: exige que el mensaje diga de donde sale, no que lo que dice sea cierto.',
    por_que_S6_no_alcanza: 'S6 habria cazado este defecto solo si otro bloque hubiera dicho lo ' +
      'contrario. Un unico mensaje falso, sin nadie que lo contradiga, pasa.',
  },
  donde: {
    fichero: 'PLAN_JURISDICCION.md',
    seccion_por_titulo: '2. ESPECIFICACION — QUE VE EL PATRON CUANDO ESTO ESTE TERMINADO',
    cita_de_anclaje: 'los nueve puntos S1 a S9, leidos uno por uno',
  },
  pregunta: '¿§2 tiene que incluir un punto que exija que ningun mensaje afirme algo falso al patron? ' +
    'Hoy los nueve puntos hablan de que se ve, de que no falte, de que traiga cita y de que no se ' +
    'contradiga con lo de al lado — ninguno exige que lo que dice sea cierto. El defecto de «zona ' +
    'intermedia» sobre el puerto de zarpe se cazo por casualidad, dentro de la medicion de otro ' +
    'punto, y ese punto acaba de anularse.',
  por_que_es_del_owner: '§2 es la especificacion de producto y sus puntos los aprueba el owner. ' +
    'Agregar un decimo punto cambia el criterio de aceptacion de todas las etapas que lo citan.',
  consecuencia_hoy: 'El defecto concreto esta CORREGIDO (la cadena se cambio el 2026-08-20 en los dos ' +
    'repos). Lo que queda abierto es que no hay criterio que lo hubiera exigido, ni que lo exija la ' +
    'proxima vez.',
},
{
  ...base,
  id: 'D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia',
  repo: 'tmarea-backend',
  grupo: '1_cierra_con_lo_que_hay',
  titulo: 'La cifra de §2 ya tiene un unico emisor correcto, y nada impide escribirla pelada a mano en otro documento',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-20',
    lo_que_SI_se_hizo: 'La regla del owner —«4 de 15, con 2 anuladas por decision del owner», nunca ' +
      'pelada— quedo escrita donde vive la cifra: data/spec2/cifra_spec2.json es la autoridad, ' +
      '`npm run cifra` es el unico emisor, compone la forma legal DESDE el dato y se DETIENE si el ' +
      'dato y la politica declarada no concuerdan. Mordida 8/8 con control negativo.',
    lo_que_NO_se_logro: 'La otra mitad de la regla — «o que nadie pueda publicarla de otro modo» —. ' +
      'No hay gancho, ni control de commit, ni validador que impida escribir «4 de 15» a mano en una ' +
      'bitacora, en un mensaje de commit o en el propio PLAN.',
    por_que_va_escrito_igual: 'Es la misma carencia que el declarativo de deudas tiene declarada sobre ' +
      'si mismo —«nada lo lee solo»— y el motivo de que exista este fichero. Un instrumento correcto ' +
      'que nadie corre es indistinguible de uno que no existe.',
  },
  donde: {
    fichero: 'scripts/publicar_cifra_spec2.js',
    seccion_por_titulo: 'el bloque final, "LO QUE ESTE INSTRUMENTO NO HACE"',
    cita_de_anclaje: 'la linea que dice que nada lo corre solo y que no hay gancho que impida escribir la cifra a mano',
  },
  costo_estimado: 'Bajo si alcanza con un control que barra los .md y las bitacoras buscando el patron ' +
    '"N de 15" sin su salvedad; el declarativo ya tiene un validador donde colgarlo. Alto si se quiere ' +
    'un gancho de commit, que es infraestructura y toca a todos.',
  depende_de: 'Nada abierto.',
},
];

const yaEstan = new Set(d.deudas.map(x => x.id));
let altas = 0;
for (const f of NUEVAS) {
  if (yaEstan.has(f.id)) { console.log('YA EXISTE: ' + f.id); continue; }
  d.deudas.push(f); altas++;
}

const sitio = d.cobertura.sitios.find(s => s.id === SITIO);
sitio.filas_en_este_declarativo = d.deudas.filter(x => x.sitio === SITIO).length;
sitio.nota += ' AMPLIADO el 2026-08-20 con las filas que salieron de D4 FIRMADA, en la misma sesion.';

d.version = (d.version || 1) + 1;
fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });

const filas = d.deudas.length;
const unicas = d.deudas.filter(x => !x.duplicada_de).length;
const vivas = d.deudas.filter(x => x.estado === 'viva' && !x.duplicada_de).length;
console.log(`altas ${altas}`);
console.log(`filas ${filas} · unicas ${unicas} · vivas ${vivas} · sitios ${d.cobertura.sitios.length} · barridos ${d.cobertura.sitios.filter(x => x.barrido).length}`);
console.log(`suma filas_en_este_declarativo: ${d.cobertura.sitios.reduce((a, s) => a + (s.filas_en_este_declarativo || 0), 0)}  (tiene que ser ${filas})`);
