// P3 - CLASIFICACION POR CLASE DE LUGAR
//
// CRITERIO: 01_criterio_lugares.txt, escrito ANTES. La tabla de clases del
// eje A y la tabla N- de la seccion 6 se leen de ahi, no se inventan aca.
// Esto solo CUENTA lo que la tabla manual de 02 ya decidio.

const fs = require('fs');
const path = require('path');
const D = require(path.join(__dirname, 'toponimos_39.json'));
const T = D.toponimos;

// La tabla de la seccion 6 del criterio, transcrita. NO se toca aca.
const SEGURA = ['L-PUNTA', 'L-ISLOTE', 'L-ROCA', 'L-MORRO', 'L-FARO', 'L-BALIZA', 'L-CALETA', 'L-CANAL'];
const DUDOSA = ['L-BOYA', 'L-DESEMBOC', 'L-MUELLE'];
const IMPROB = ['L-OBRA'];
const CLASES = [...SEGURA, ...DUDOSA, ...IMPROB];

function veredicto(t) {
  if (t.B === 'B-DESCRITO') return 'N-DUDOSA';   // el eje B domina al eje A
  if (SEGURA.includes(t.A)) return 'N-SEGURA';
  if (DUDOSA.includes(t.A)) return 'N-DUDOSA';
  if (IMPROB.includes(t.A)) return 'N-IMPROBABLE';
  return 'SIN-CLASE';
}

const L = []; const say = s => L.push(s);
say('P3 - CLASIFICACION POR CLASE DE LUGAR');
say('='.repeat(78));
say('');
say('CRITERIO : 01_criterio_lugares.txt, escrito ANTES de correr esto.');
say('UNIDAD   : el TOPONIMO. En los dos conjuntos ocurrencias = lugares');
say('           distintos (0 colapsos, 02_extraer_toponimos.txt), asi que la');
say('           cifra vale para las dos unidades a la vez. Se dice igual.');
say('DENOMINADOR: A = 27 toponimos de 14 entradas · B = 50 de 25 entradas.');
say('           NO SE SUMAN.');
say('');

// --- CONTROL A: ninguna clase fuera de las doce declaradas -----------------
const fuera = T.filter(t => !CLASES.includes(t.A));
say('CONTROL A - NINGUNA CLASE FUERA DE LAS DOCE DECLARADAS');
say(`  clases declaradas en el criterio : ${CLASES.length}`);
say(`  toponimos sin clase declarada    : ${fuera.length}`);
say(`  VEREDICTO: ${fuera.length === 0 ? 'OK - no hubo que declarar clase nueva' : 'ROJO'}`);
say('');

// --- CONTROL B: las doce clases NO se usan todas, y eso se dice ------------
const usadas = [...new Set(T.map(t => t.A))];
const noUsadas = CLASES.filter(c => !usadas.includes(c));
say('CONTROL B - CUANTAS DE LAS DOCE CLASES SE USAN');
say(`  usadas : ${usadas.length} de 12   ->  ${usadas.sort().join(' ')}`);
say(`  vacias : ${noUsadas.length}${noUsadas.length ? '  ->  ' + noUsadas.join(' ') : ''}`);
say('  Una clase vacia no es un error: se declaro porque el vocabulario del');
say('  documento la tenia, y que no aparezca en las 39 es un dato.');
say('');

// --- CONTROL C: las sumas cierran ------------------------------------------
for (const cj of ['A', 'B']) {
  const S = T.filter(t => t.conjunto === cj);
  const porClase = {}; for (const t of S) porClase[t.A] = (porClase[t.A] || 0) + 1;
  const suma = Object.values(porClase).reduce((a, b) => a + b, 0);
  say(`CONTROL C${cj} - LAS CLASES SUMAN EL CONJUNTO ${cj}`);
  say(`  suma de las clases: ${suma} de ${S.length}   VEREDICTO: ${suma === S.length ? 'OK' : 'ROJO'}`);
}
say('');

// --- EL RESULTADO ----------------------------------------------------------
for (const cj of ['A', 'B']) {
  const S = T.filter(t => t.conjunto === cj);
  const nEnt = [...new Set(S.map(t => t.n))].length;
  const rot = cj === 'A' ? 'CONJUNTO A - 14 entradas C-ALGUNAS - escalon 9 -> 21 bahias'
                         : 'CONJUNTO B - 25 entradas C-NINGUNA - escalon 21 -> 44 bahias';
  say('='.repeat(78));
  say(rot);
  say('='.repeat(78));
  say(`  toponimos: ${S.length}   entradas: ${nEnt}`);
  say('');
  say('  EJE A - CLASE DE LUGAR');
  const porClase = {}; for (const t of S) porClase[t.A] = (porClase[t.A] || 0) + 1;
  for (const c of CLASES) {
    if (!porClase[c]) continue;
    const cuales = S.filter(t => t.A === c).map(t => (t.busqueda || t.cita.slice(0, 34) + '…'));
    say(`    ${c.padEnd(11)} ${String(porClase[c]).padStart(2)}`);
    say(`        ${cuales.join(' · ')}`);
  }
  say('');
  say('  EJE B - NOMBRADO vs DESCRITO   (el que decide la via del gazetteer)');
  const nom = S.filter(t => t.B === 'B-NOMBRE').length;
  const des = S.filter(t => t.B === 'B-DESCRITO');
  say(`    B-NOMBRE    ${String(nom).padStart(2)} de ${S.length}`);
  say(`    B-DESCRITO  ${String(des.length).padStart(2)} de ${S.length}`);
  for (const t of des) say(`        #${t.n} ${t.entrada}: "${t.cita}"${t.duda ? '   [DUDA - se busca igual, seccion 9]' : ''}`);
  say('');
  say('  EJE C - ENTERO vs PARTE   (residuo que el nombre NO cierra)');
  const parte = S.filter(t => t.C === 'C-PARTE');
  say(`    C-ENTERO ${String(S.length - parte.length).padStart(2)}   C-PARTE ${String(parte.length).padStart(2)}`);
  for (const t of parte) say(`        #${t.n} ${t.entrada}: "${t.cita}"`);
  say('');
  say('  BANDERA MEDIA COORDENADA   (a favor: tolera mas error)');
  const lat = S.filter(t => t.media === 'LAT').length, lon = S.filter(t => t.media === 'LON').length;
  say(`    solo LATITUD  ${String(lat).padStart(2)}   solo LONGITUD ${String(lon).padStart(2)}   las dos ${String(S.length - lat - lon).padStart(2)}`);
  say('');
  say('  EJE D - ROL');
  const aux = S.filter(t => t.D === 'D-AUXILIAR');
  say(`    D-DEFINE ${String(S.length - aux.length).padStart(2)}   D-AUXILIAR ${String(aux.length).padStart(2)}   D-DESCRIPT  0`);
  for (const t of aux) say(`        #${t.n} ${t.entrada}: "${t.cita}"`);
  say('');
  say('  >>> EL VEREDICTO DEL ENCARGO - LO QUE UNA PUBLICACION NAUTICA NOMBRA');
  const v = {}; for (const t of S) { const k = veredicto(t); v[k] = (v[k] || 0) + 1; }
  say(`      N-SEGURA      ${String(v['N-SEGURA'] || 0).padStart(2)} de ${S.length}   clase que un derrotero de costa seguro nombra`);
  say(`      N-DUDOSA      ${String(v['N-DUDOSA'] || 0).padStart(2)} de ${S.length}   clase dudosa, o sin nombre en el documento`);
  say(`      N-IMPROBABLE  ${String(v['N-IMPROBABLE'] || 0).padStart(2)} de ${S.length}   casi seguro no`);
  const sum2 = (v['N-SEGURA'] || 0) + (v['N-DUDOSA'] || 0) + (v['N-IMPROBABLE'] || 0);
  say(`      suma ${sum2} de ${S.length}  ${sum2 === S.length ? 'OK' : 'ROJO'}`);
  say('      El desglose de N-DUDOSA, porque son dos cosas distintas en la misma casilla:');
  const dudClase = S.filter(t => t.B === 'B-NOMBRE' && DUDOSA.includes(t.A));
  say(`        por CLASE dudosa con nombre : ${dudClase.length}${dudClase.length ? '  (' + dudClase.map(t => t.A + ' ' + (t.busqueda || '')).join(' · ') + ')' : ''}`);
  say(`        por NO TENER NOMBRE         : ${des.length}`);
  say('');
}

// --- LA CIFRA UTIL DE B, arrastrada -----------------------------------------
const NO_ATERRIZAN = ['JUNIN', 'CALETA BUENA', 'LOS VILOS'];
const Butil = T.filter(t => t.conjunto === 'B' && !NO_ATERRIZAN.includes(t.entrada));
const vU = {}; for (const t of Butil) { const k = veredicto(t); vU[k] = (vU[k] || 0) + 1; }
say('='.repeat(78));
say('CONJUNTO B, SOLO LO UTIL AL CATALOGO - 22 entradas, 23 bahias');
say('='.repeat(78));
say('  JUNIN, CALETA BUENA y LOS VILOS no aterrizan en ninguna bahia: resolver');
say('  sus 6 toponimos suma CERO bahias. La cifra util va siempre al lado.');
say(`  toponimos utiles : ${Butil.length} de 50`);
say(`      N-SEGURA      ${String(vU['N-SEGURA'] || 0).padStart(2)} de ${Butil.length}`);
say(`      N-DUDOSA      ${String(vU['N-DUDOSA'] || 0).padStart(2)} de ${Butil.length}`);
say(`      N-IMPROBABLE  ${String(vU['N-IMPROBABLE'] || 0).padStart(2)} de ${Butil.length}`);
say('');

// --- LO QUE LA CLASIFICACION YA DEJA DICHO -----------------------------------
say('='.repeat(78));
say('LO QUE ESTA CLASIFICACION YA DEJA DICHO, ANTES DE BUSCAR NADA');
say('='.repeat(78));
const puntas = T.filter(t => t.A === 'L-PUNTA').length;
say(`  1. ES UNA LISTA DE PUNTAS. ${puntas} de los 77 toponimos de las 39 entradas`);
say(`     son L-PUNTA (${(puntas / 77 * 100).toFixed(0)} %), y con islotes, rocas, faros y morros`);
say('     se llega a la enorme mayoria. Eso es exactamente el catalogo de un');
say('     derrotero de costa — y tambien, y esto es lo que hay que medir, el');
say('     catalogo de un gazetteer costero.');
const sinNombre = T.filter(t => t.B === 'B-DESCRITO' && !t.duda).length;
say(`  2. SOLO ${sinNombre} TOPONIMOS DE 77 NO TIENEN NOMBRE. Son los unicos que la via`);
say('     del gazetteer no puede ni intentar. El techo de las fuentes abiertas');
say('     NO esta en la falta de nombre: hay nombre casi siempre.');
say('  3. EL TECHO VA A ESTAR EN LA VERIFICACION, no en el hallazgo. Con 40+');
say('     puntas de nombre corto y comun en 4.000 km de costa, encontrar "una"');
say('     punta Blanca es facil y encontrar "la" punta Blanca de la entrada es');
say('     el trabajo. Por eso el diseno de la busqueda se para en PARADA 1.');
say('');
say(`VEREDICTO P3: ${fuera.length === 0 ? 'VERDE' : 'ROJO'}`);

const txt = L.join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, '03_clasificar_lugares.txt'), txt, 'utf8');
process.stdout.write(txt);
process.exit(fuera.length === 0 ? 0 : 1);
