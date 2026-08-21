// 03_mordida.js — LA MORDIDA DE LOS CUATRO SITIOS.
//
// «170/170 en verde» NO prueba que el arbol vigile este cambio. Prueba que nada
// se rompio, que es otra cosa (§4.6). Lo que hay que probar es DONDE muerde y —
// mas importante para esta pieza — DONDE NO MUERDE, porque la declaracion del
// gate fue exactamente esa: de los cuatro sitios que se movieron, DOS no los
// mira nadie.
//
// Se muta en MEMORIA. Ni CONTRATO_MOTOR.md ni zonas_aviso.json se tocan, y se
// verifica al final que siguen intactos en disco.

const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const P_CONTRATO = path.join(RAIZ, 'CONTRATO_MOTOR.md');
const P_DATO = path.join(RAIZ, 'data', 'decreto', 'zonas_aviso.json');

const { cotejar } = require(path.join(RAIZ, 'src/services/cotejo-contrato.js'));
const { validarDeclaracion } = require(path.join(RAIZ, 'src/services/zonas-aviso.js'));

const CONTRATO_0 = fs.readFileSync(P_CONTRATO, 'utf8');
const DATO_0 = fs.readFileSync(P_DATO, 'utf8');
const HUELLA_CONTRATO = CONTRATO_0.length;
const HUELLA_DATO = DATO_0.length;

const DECL_0 = JSON.parse(DATO_0);
const insumo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/decreto/jurisdicciones_v2.json'), 'utf8'));
const contactos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/bahia-capitania-map.json'), 'utf8'));
const clonar = o => JSON.parse(JSON.stringify(o));

const COLA_VIEJA = ' Sin cita: esta situación no la produce una norma sino la ausencia de un dato ' +
  'nuestro (INV-3.6). No implica que exista una restricción, ni que no exista: implica que el motor ' +
  'no puede responder por esa zona.';

// Corre los DOS controles que miran este texto y devuelve que paso con cada uno.
//
// ── CORREGIDA EN LA PRIMERA CORRIDA, Y SE DICE ─────────────────────────────
// La primera version leia `try { cotejar(...) } catch`. ESTA MAL: `cotejar` solo
// LANZA ante errores de FORMA —fila ausente, celda que cambio de forma, origen
// desconocido—; una DIVERGENCIA de texto la DEVUELVE en `estado`/`divergencias`.
// O sea que M1, M2 y N1 salieron «VERDE» sobre un cotejo que estaba encontrando
// la divergencia y reportandola. El instrumento decia verde donde el arbol decia
// rojo, y la que lo cazo fue la propia mordida: tres casos esperados en ROJO
// salieron en VERDE y no habia forma de leer eso como exito.
// Es §4.6 sobre el instrumento de §4.6. Los dos controles ciegos —M3 y M4— NO
// cambian con esta correccion: dan verde por el motivo declarado, no por el bug.
function correr(decl, contrato) {
  const r = { cotejo: null, guard: null };
  try {
    const res = cotejar(decl, contrato, { BANDERA_AVISO: 'U' });
    r.cotejo = res.estado === 'ok' ? 'VERDE' : 'ROJO';
  } catch (e) { r.cotejo = 'ROJO'; }
  try { validarDeclaracion(decl, insumo, contactos); r.guard = 'VERDE'; }
  catch (e) { r.guard = 'ROJO'; }
  return r;
}

const casos = [
  ['C0 · el arbol como quedo, sin mutar',
   () => [clonar(DECL_0), CONTRATO_0], { cotejo: 'VERDE', guard: 'VERDE' },
   'control positivo: si esto sale rojo, el instrumento mide el entorno y no la pieza'],

  ['M1 · el §10 vuelve al texto largo y el dato NO',
   () => {
     const c = CONTRATO_0.replace(
       'Confirme con la Capitanía [nombre] antes de zarpar. Nos falta el dato: no sabemos si en esa zona hay una restricción.',
       'Confirme con la Capitanía [nombre] antes de zarpar.' + COLA_VIEJA);
     return [clonar(DECL_0), c];
   }, { cotejo: 'ROJO', guard: 'VERDE' },
   'SITIO 1 y 2 estan ACOPLADOS: mover uno sin el otro se detiene'],

  ['M2 · el dato vuelve al texto largo y el §10 NO',
   () => {
     const d = clonar(DECL_0);
     d.mensaje.capa_2_con_capitania = d.mensaje.capa_2_con_capitania
       .replace(' Nos falta el dato: no sabemos si en esa zona hay una restricción.', COLA_VIEJA);
     return [d, CONTRATO_0];
   }, { cotejo: 'ROJO', guard: 'VERDE' },
   'el acople vale en los dos sentidos'],

  ['M3 · SOLO `capa_2_sin_capitania` vuelve al texto largo',
   () => {
     const d = clonar(DECL_0);
     d.mensaje.capa_2_sin_capitania = d.mensaje.capa_2_sin_capitania
       .replace(' Nos falta el dato: no sabemos si en esa zona hay una restricción.', COLA_VIEJA);
     return [d, CONTRATO_0];
   }, { cotejo: 'VERDE', guard: 'VERDE' },
   '>>> EL HALLAZGO DEL GATE, MEDIDO: LOS DOS CONTROLES DAN VERDE. Puerto Eden -> ' +
   'Tortel se habria quedado con la cola larga y nadie se entera.'],

  ['M4 · el preambulo del §10 vuelve a decir lo que ya no es cierto',
   () => {
     const c = CONTRATO_0.replace(
       '**Eso se explica\nacá y no en la fila:** al patrón se le dice qué hacer, no por qué no hay cita. Hasta el\n' +
       '2026-08-21 la fila lo explicaba, y esa explicación salió por decisión del owner.',
       'Que no haya cita\nes, precisamente, lo que esa fila comunica.');
     return [clonar(DECL_0), c];
   }, { cotejo: 'VERDE', guard: 'VERDE' },
   '>>> EL SEGUNDO SITIO CIEGO: el contrato se contradice a si mismo y los dos ' +
   'controles dan VERDE. cotejo-contrato.js compara el DATO contra el §10, nunca ' +
   'el contrato contra si mismo.'],

  ['N1 · negativo del barrido: se rompe la marca {nombre}',
   () => {
     const d = clonar(DECL_0);
     d.mensaje.capa_2_con_capitania = d.mensaje.capa_2_con_capitania.replace('{nombre}', 'Antofagasta');
     return [d, CONTRATO_0];
   }, { cotejo: 'ROJO', guard: 'ROJO' },
   'prueba que el instrumento sabe dar rojo por su cuenta'],
];

console.log('MORDIDA DE LOS CUATRO SITIOS — mutacion en memoria, ficheros intactos');
console.log('='.repeat(78));
let ok = 0, mal = 0;
for (const [nombre, armar, esperado, porque] of casos) {
  const [d, c] = armar();
  const r = correr(d, c);
  const paso = r.cotejo === esperado.cotejo && r.guard === esperado.guard;
  if (paso) ok++; else mal++;
  console.log('\n' + (paso ? '  ok  ' : ' FALLA') + '  ' + nombre);
  console.log('        cotejo-contrato.js : ' + r.cotejo.padEnd(5) + ' (esperado ' + esperado.cotejo + ')');
  console.log('        guard zonas-aviso  : ' + r.guard.padEnd(5) + ' (esperado ' + esperado.guard + ')');
  console.log('        ' + porque);
}

const intacto = fs.readFileSync(P_CONTRATO, 'utf8').length === HUELLA_CONTRATO &&
                fs.readFileSync(P_DATO, 'utf8').length === HUELLA_DATO;
console.log('\n' + '='.repeat(78));
console.log('RESULTADO: ' + ok + ' de ' + casos.length + (mal ? '   ' + mal + ' FALLA(S)' : ''));
console.log('FICHEROS EN DISCO: ' + (intacto ? 'INTACTOS, verificado por tamano' : 'TOCADOS — DEFECTO GRAVE'));
console.log('\nLO QUE ESTA MORDIDA DEJA ESCRITO:');
console.log('  De los CUATRO sitios que esta pieza movio, DOS los vigila un control');
console.log('  (M1, M2) y DOS no los vigila nadie (M3, M4). Los dos ciegos se movieron');
console.log('  a mano y a proposito, y esta es la prueba de que hacia falta.');
process.exit(mal ? 1 : 0);
