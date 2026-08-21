// 01_aplicar.js — LA CAPA 2 DEL §10 SE ACORTA. Version V3, firmada por el owner
// el 2026-08-21 con las palabras exactas.
//
// CUATRO SITIOS, UN SOLO ACTO. Dos se ponen rojos si falta uno (cotejo-contrato.js
// compara la celda del §10 contra mensaje.capa_2_con_capitania); DOS NO SE PONEN
// ROJOS Y POR ESO VAN ACA A PROPOSITO:
//   · mensaje.capa_2_sin_capitania — el propio dato declara que cotejo-contrato.js
//     NO lo cubre. Si se olvida, la ruta Puerto Eden -> Tortel se queda con el
//     texto largo y la suite da 170/170 en verde.
//   · el preambulo del §10 — el contrato citandose a si mismo; ningun control
//     compara el contrato contra si mismo.
//
// CADA REEMPLAZO EXIGE UNA SOLA OCURRENCIA EXACTA y se detiene si no la encuentra
// o si encuentra dos. Un reemplazo que no muerde es un reemplazo que miente.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const CONTRATO = path.join(RAIZ, 'CONTRATO_MOTOR.md');
const DATO = path.join(RAIZ, 'data', 'decreto', 'zonas_aviso.json');

const COLA_VIEJA_CON =
  'Confirme con la Capitanía {nombre} antes de zarpar. Sin cita: esta situación no la produce ' +
  'una norma sino la ausencia de un dato nuestro (INV-3.6). No implica que exista una restricción, ' +
  'ni que no exista: implica que el motor no puede responder por esa zona.';

const COLA_VIEJA_SIN =
  'Coordine con la Autoridad Marítima por VHF Canal 16 antes de zarpar. Sin cita: esta situación ' +
  'no la produce una norma sino la ausencia de un dato nuestro (INV-3.6). No implica que exista una ' +
  'restricción, ni que no exista: implica que el motor no puede responder por esa zona.';

// LA FRASE FIRMADA, y es la unica redaccion nueva de la pieza.
const FRASE = 'Nos falta el dato: no sabemos si en esa zona hay una restricción.';

const NUEVA_CON = 'Confirme con la Capitanía {nombre} antes de zarpar. ' + FRASE;
const NUEVA_SIN = 'Coordine con la Autoridad Marítima por VHF Canal 16 antes de zarpar. ' + FRASE;

// La celda del §10 usa [nombre] y lleva negritas; el dato usa {nombre} y es texto
// plano. cotejo-contrato.js unifica las dos cosas, por eso pueden diferir aca.
const CELDA_VIEJA =
  'Confirme con la Capitanía [nombre] antes de zarpar. **Sin cita: esta situación no la produce ' +
  'una norma sino la ausencia de un dato nuestro** (INV-3.6). No implica que exista una restricción, ' +
  'ni que no exista: implica que el motor no puede responder por esa zona.';

const CELDA_NUEVA = 'Confirme con la Capitanía [nombre] antes de zarpar. ' + FRASE;

const PREAMBULO_VIEJO =
  'artículo que citar porque no hay norma en juego: hay un dato que nos falta. Que no haya cita\n' +
  'es, precisamente, lo que esa fila comunica.';

const PREAMBULO_NUEVO =
  'artículo que citar porque no hay norma en juego: hay un dato que nos falta. **Eso se explica\n' +
  'acá y no en la fila:** al patrón se le dice qué hacer, no por qué no hay cita. Hasta el\n' +
  '2026-08-21 la fila lo explicaba, y esa explicación salió por decisión del owner.';

// La constancia va en el dato ademas de en la bitacora: es la convencion que el
// propio fichero ya tiene (`actualizado_2026-08-13`) y CLAUDE.md §3.3.
const NOTA_ANCLA = '    "actualizado_2026-08-13":';
const NOTA_NUEVA =
  '    "actualizado_2026-08-21": "SE ACORTA LA CAPA 2. Sale la cola que explicaba la teoria del dato ' +
  '—\'Sin cita: ... la ausencia de un dato nuestro (INV-3.6). No implica que exista una restriccion, ni que ' +
  'no exista: implica que el motor no puede responder por esa zona.\'— y entra \'Nos falta el dato: no sabemos ' +
  'si en esa zona hay una restriccion.\'. Decision del owner del 2026-08-21, version V3 de tres propuestas. ' +
  'LA FRASE NUEVA ES REDACCION, NO RECORTE: dice en voz de persona lo que el §10 decia en voz de contrato. ' +
  'Es parafrasis del texto VIEJO, no del nuevo — desde esta pieza el §10 y este dato dicen lo mismo literalmente, ' +
  'y cotejo-contrato.js lo comprueba en cada corrida. Los DOS campos se mueven: `capa_2_sin_capitania` NO lo ' +
  'cubre ningun control y se habria quedado con la cola larga en verde. Motivo del corte: de los 261 caracteres ' +
  'renderizados, 206 eran explicacion; y la ultima frase repetia el encabezado del bloque de la PWA, que D1 ' +
  'habia alineado a proposito con estas mismas palabras. Evidencia: _bitacoras/capa2_corta_2026-08-21/.",\n';

let fallos = 0;
function reemplazarUnaVez(texto, viejo, nuevo, que) {
  const partes = texto.split(viejo);
  if (partes.length === 1) {
    console.log('  ROJO  ' + que + ': NO se encontro el texto viejo. No se toca nada.');
    fallos++;
    return texto;
  }
  if (partes.length > 2) {
    console.log('  ROJO  ' + que + ': ' + (partes.length - 1) + ' ocurrencias, se esperaba UNA. No se elige una.');
    fallos++;
    return texto;
  }
  console.log('  ok    ' + que + '  (' + viejo.length + ' -> ' + nuevo.length + ' caracteres)');
  return partes[0] + nuevo + partes[1];
}

console.log('CONTRATO_MOTOR.md');
let contrato = fs.readFileSync(CONTRATO, 'utf8');
const contratoAntes = contrato;
contrato = reemplazarUnaVez(contrato, CELDA_VIEJA, CELDA_NUEVA, 'celda Capa 2 de la fila');
contrato = reemplazarUnaVez(contrato, PREAMBULO_VIEJO, PREAMBULO_NUEVO, 'preambulo Excepcion declarada');

console.log('data/decreto/zonas_aviso.json');
let dato = fs.readFileSync(DATO, 'utf8');
const datoAntes = dato;
dato = reemplazarUnaVez(dato, COLA_VIEJA_CON, NUEVA_CON, 'mensaje.capa_2_con_capitania');
dato = reemplazarUnaVez(dato, COLA_VIEJA_SIN, NUEVA_SIN, 'mensaje.capa_2_sin_capitania');
dato = reemplazarUnaVez(dato, NOTA_ANCLA, NOTA_NUEVA + NOTA_ANCLA, 'constancia actualizado_2026-08-21');

if (fallos > 0) {
  console.log('\nDETENIDO: ' + fallos + ' reemplazo(s) sin morder. NO se escribio ningun fichero.');
  process.exit(1);
}

// El JSON tiene que seguir siendo JSON, y los campos tienen que decir lo firmado.
const j = JSON.parse(dato);
if (j.mensaje.capa_2_con_capitania !== NUEVA_CON) throw new Error('capa_2_con_capitania no quedo como se firmo');
if (j.mensaje.capa_2_sin_capitania !== NUEVA_SIN) throw new Error('capa_2_sin_capitania no quedo como se firmo');
if (!j.mensaje.actualizado_2026_08_21 && !j.mensaje['actualizado_2026-08-21']) throw new Error('falta la constancia');

fs.writeFileSync(CONTRATO, contrato, 'utf8');
fs.writeFileSync(DATO, dato, 'utf8');

console.log('\nESCRITO. Bytes: CONTRATO ' + contratoAntes.length + ' -> ' + contrato.length +
            '  |  DATO ' + datoAntes.length + ' -> ' + dato.length);
console.log('\nLO QUE VE EL PATRON AHORA (Antofagasta):');
console.log('  ' + j.mensaje.capa_1);
console.log('  ' + j.mensaje.capa_2_con_capitania.replace('{nombre}', 'Antofagasta'));
console.log('\nY EN LA DERIVACION GENERICA:');
console.log('  ' + j.mensaje.capa_2_sin_capitania);
