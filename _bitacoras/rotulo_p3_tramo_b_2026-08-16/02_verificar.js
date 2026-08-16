'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 02_verificar.js — VERIFICACION DEL TRAMO B. Solo lee y afirma.
//
// Corrida (shell declarada, §7.3 — identica en PowerShell y en Git Bash):
//     cd C:\Users\katia\tmarea-backend
//     node _bitacoras\rotulo_p3_tramo_b_2026-08-16\02_verificar.js
//     node _bitacoras\rotulo_p3_tramo_b_2026-08-16\02_verificar.js --pwa=<copia>
//
// `--pwa=` existe para la CORRIDA EN ROJO: apunta a una copia con los 3 archivos
// restaurados del estado pre-pieza. La PWA real NO se restaura in situ: un corte
// a mitad de camino dejaria el otro repositorio en un estado que nadie pidio.
//
// LA VERDAD DE REFERENCIA NO SALE DEL RESOLVEDOR. El escalon esperado se
// reconstruye leyendo `data/contacto/reparticiones_publicadas.json` con
// desarmado propio. Un guard que construye su universo del mismo codigo que
// valida es tautologico y no puede fallar.
//
// Y LA ETIQUETA NO SE COPIA: V3 EJECUTA la `etiquetaDeNivel` REAL de la PWA,
// extraida de su archivo. Transcribir el literal a este instrumento seria
// validar mi propia transcripcion.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const ANCLA = 'dc7d63e72b1787e0cd93bfc587eb8a2201f3753d';
const PWA_REAL = 'C:/Users/katia/tmarea-pwa';
const argPwa = (process.argv.slice(2).find(a => a.startsWith('--pwa=')) || '').slice(6);
const PWA = argPwa || PWA_REAL;
const ES_PWA_REAL = path.resolve(PWA) === path.resolve(PWA_REAL);

const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));

const L = (...a) => console.log(...a);
const FALLAS = [];
const NO_MEDIBLE = [];
const fallar = m => { FALLAS.push(m); L(`    ✗ ${m}`); };
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const delAncla = rel => execSync(`git show ${ANCLA}:${rel}`, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString();
const leerPwa = rel => fs.readFileSync(path.join(PWA, rel), 'utf8');

const P_HOOK  = 'src/hooks/useVoyageVerification.js';
const P_CARD  = 'src/components/verification/PortStatusBlock.jsx';
const P_NORM  = 'src/components/verification/NormativeBlock.jsx';
const P_P2    = 'src/screens/P3_VoyageVerification.jsx';
const P_P1    = 'src/components/verification/TransitRestrictionsBlock.jsx';

L('================================================================================');
L('VERIFICACION — TRAMO B DEL ROTULO DE P3');
L(`Ancla del backend: commit fijo ${ANCLA}`);
L(`Raiz de la PWA   : ${PWA}${ES_PWA_REAL ? '  (la real)' : '  (COPIA — corrida en rojo)'}`);
L('================================================================================');

// ── linea base ───────────────────────────────────────────────────────────────
// Es parte de la medicion. Si el arbol no esta donde se cree, las cifras salen
// legibles y falsas, que es peor que no arrancar.
L('');
L('=== LINEA BASE ===');
const head = execSync('git rev-parse HEAD', { cwd: RAIZ }).toString().trim();
L(`  HEAD del backend : ${head}`);
L(`  esperado         : ${ANCLA}`);
if (head !== ANCLA) { L('ABORTA — el backend no esta en el ancla.'); process.exit(3); }

// ─────────────────────────────────────────────────────────────────────────────
// LA REFERENCIA INDEPENDIENTE — se arma acá, sin tocar el resolvedor
// ─────────────────────────────────────────────────────────────────────────────
const mapa = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/bahia-capitania-map.json'), 'utf8'));
const ids = Object.keys(mapa);
const insumo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/contacto/reparticiones_publicadas.json'), 'utf8'));

const digitos = t => String(t == null ? '' : t).replace(/[^0-9]/g, '');
const refIndice = new Map();
for (const rep of Object.values(insumo.reparticiones || {})) {
  if (!rep || !rep.nombre_publicado) continue;              // 2 de 64, estado legitimo
  const k = normalizarTexto(rep.nombre_publicado);
  if (!refIndice.has(k)) refIndice.set(k, new Set());
  for (const trozo of String(rep.telefono == null ? '' : rep.telefono).split(/ó|\//)) {
    const d = digitos(trozo);
    if (d.length >= 8) refIndice.get(k).add(d);
  }
}
// El escalon esperado, deducido de INV-10.1 y no del codigo que lo implementa.
function nivelEsperado(e) {
  const tel = e.telefono == null ? '' : String(e.telefono).trim();
  if (tel === '') return null;                                             // escalon 3
  const cap = e.capitania == null ? '' : String(e.capitania).trim();
  if (cap !== '') {
    const tels = refIndice.get(normalizarTexto(cap));
    if (tels && tels.has(digitos(tel))) return 'capitania';                // escalon 1
  }
  const gob = e.gobernacion == null ? '' : String(e.gobernacion).trim();
  if (gob !== '') return 'gobernacion';                                    // escalon 2
  return null;                                                             // escalon 3
}

// ── la `etiquetaDeNivel` REAL de la PWA, ejecutada ───────────────────────────
function etiquetaDeNivelDeLaPwa() {
  const src = leerPwa(P_HOOK);
  const i = src.indexOf('export function etiquetaDeNivel');
  if (i < 0) return null;
  let j = src.indexOf('{', i), prof = 0, fin = -1;
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') prof++;
    else if (src[k] === '}') { prof--; if (prof === 0) { fin = k + 1; break; } }
  }
  if (fin < 0) return null;
  const cuerpo = src.slice(i, fin).replace('export function', 'function');
  // eslint-disable-next-line no-new-func
  return new Function(`${cuerpo}; return etiquetaDeNivel;`)();
}

// ── V1 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V1 — LOS 5 PUNTOS QUEDARON ESCRITOS, cada uno en su archivo ===');
L('  Se exige el literal NUEVO y se exige que el VIEJO ya no este. Un control que');
L('  solo mirara el nuevo pasaria con los dos conviviendo.');
const V1 = [
  ['punto 1 · pasamanos',        P_HOOK, 'contacto: data?.contacto || null,',        null],
  ['punto 2 · consumidor P3',    P_CARD, 'const contacto = data?.contacto;',         'const capNombre = data?.gobernacion'],
  ['punto 3 · render P3',        P_CARD, '📞 {capitania.etiqueta} {capitania.nombre}', '📞 Gobernación Marítima de {capitania.nombre}'],
  ['punto 4 · r1_radio_aviso',   P_HOOK, 'const contactoZarpe = portStatus?.zarpe?.contacto;', 'telefono: capZarpeTel || null,'],
  ['punto 5 · render P4',        P_NORM, '{reminder.canal && (',                     '{reminder.telefono && ('],
];
let v1 = 0;
for (const [etq, rel, nuevo, viejo] of V1) {
  const src = leerPwa(rel);
  const tieneNuevo = src.includes(nuevo);
  const tieneViejo = viejo ? src.includes(viejo) : false;
  v1++;
  L(`  ${etq.padEnd(26)} nuevo:${tieneNuevo ? 'SI' : 'NO'}  viejo:${viejo ? (tieneViejo ? 'TODAVIA ESTA' : 'retirado') : '(no aplica)'}`);
  if (!tieneNuevo) fallar(`V1: ${etq} — el literal nuevo no esta en ${rel}`);
  if (tieneViejo) fallar(`V1: ${etq} — el literal viejo sigue en ${rel}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v1}`);
if (v1 === 0) NO_MEDIBLE.push('V1 con cero comparaciones');

// ── V2 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V2 — NADA FUERA DE LOS 5 PUNTOS, hunk por hunk ===');
if (!ES_PWA_REAL) {
  L('  NO MEDIBLE en la corrida en rojo: la copia no es un arbol de git.');
  NO_MEDIBLE.push('V2 no medible fuera de la PWA real');
} else {
  // Las regiones se declaran desde el mapa del Tramo A (`02_particion.txt`) mas
  // las DOS inserciones estructurales que los puntos obligan y que no caen en su
  // misma linea: el import del rotulador y el helper que evita que el literal se
  // duplique. Se declaran acá para que un hunk nuevo no pueda colarse como una
  // de ellas.
  const REGIONES = [
    [P_HOOK, 246, 248, 'punto 1 — pasamanos'],
    [P_HOOK, 521, 522, 'punto 4 — helper del rotulo, insertado antes de buildNormativeReminders'],
    [P_HOOK, 532, 547, 'punto 4 — r1_radio_aviso'],
    [P_CARD,   3,   4, 'punto 3 — import del rotulador'],
    [P_CARD,  73,  78, 'punto 2 — consumidor'],
    [P_CARD,  94, 107, 'punto 3 — render'],
    [P_NORM,  75,  85, 'punto 5 — la pildora del telefono'],
  ];
  // NO se hace `.trim()` sobre la salida entera: `git status --short` marca el
  // estado en las DOS primeras columnas y un modificado sin `add` empieza con
  // espacio. Trimear el bloque le come ese espacio a la PRIMERA linea y despues
  // el corte por posicion devuelve la ruta sin su primer caracter.
  const estado = execSync('git status --short', { cwd: PWA }).toString().split(/\r?\n/).filter(l => l.trim() !== '');
  const esModificado = l => /^[ MARC][ M]\s/.test(l) && /M/.test(l.slice(0, 2));
  const modificados = estado.filter(esModificado).map(l => l.slice(2).trim());
  const otros = estado.filter(l => !esModificado(l));
  L(`  archivos modificados : ${modificados.length}`);
  for (const m of modificados) L(`      ${m}`);
  L(`  otras entradas de status (no modificadas): ${otros.length}`);
  for (const o of otros) L(`      ${o}`);
  const ESPERADOS = [P_HOOK, P_CARD, P_NORM].sort();
  if (JSON.stringify(modificados.slice().sort()) !== JSON.stringify(ESPERADOS))
    fallar(`V2: los archivos modificados no son exactamente los 3 declarados`);
  for (const o of otros) if (!o.includes('diff_transit.txt'))
    fallar(`V2: entrada inesperada en el status de la PWA: ${o}`);

  const diff = execSync('git diff -U0', { cwd: PWA, maxBuffer: 64 * 1024 * 1024 }).toString();
  let archivo = null, hunks = 0, huerfanos = 0;
  for (const linea of diff.split(/\r?\n/)) {
    const md = linea.match(/^diff --git a\/(\S+)/);
    if (md) { archivo = md[1]; continue; }
    const mh = linea.match(/^@@ -(\d+)(?:,(\d+))? /);
    if (!mh) continue;
    hunks++;
    const ini = Number(mh[1]);
    const largo = mh[2] === undefined ? 1 : Number(mh[2]);
    // `-N,0` es una INSERCION inmediatamente despues de la linea vieja N: no
    // toca ninguna linea vieja, y su ancla es N. Modelarla como si tocara N+1
    // la deja caer fuera de su propia region cuando se agrega al final del
    // bloque, que es justo lo que hacen el campo del pasamanos y el import.
    const fin = largo === 0 ? ini : ini + largo - 1;
    const region = REGIONES.find(r => r[0] === archivo && ini >= r[1] && fin <= r[2]);
    L(`  hunk ${String(hunks).padStart(2)}  ${archivo}  viejo ${ini}-${fin}  ${region ? '-> ' + region[3] : 'FUERA DE TODA REGION DECLARADA'}`);
    if (!region) { huerfanos++; fallar(`V2: hunk fuera de los 5 puntos — ${archivo} lineas ${ini}-${fin}`); }
  }
  L(`  COMPARACIONES EFECTIVAS : ${hunks} hunks · fuera de region : ${huerfanos}`);
  if (hunks === 0) { NO_MEDIBLE.push('V2 con cero hunks'); fallar('V2: cero hunks — o no se escribio nada, o el diff no se leyo'); }
}

// ── V3 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V3 — LA AFIRMACION CENTRAL: que rotula el render, entrada por entrada ===');
L('  Referencia independiente del resolvedor. Etiqueta tomada de la funcion REAL');
L('  de la PWA, ejecutada, no transcrita.');
const etiquetaDeNivel = etiquetaDeNivelDeLaPwa();
let v3 = 0, reparto = new Map(), malRotuladas = 0;
if (typeof etiquetaDeNivel !== 'function') {
  fallar('V3: no se pudo extraer `etiquetaDeNivel` de la PWA — el render no toma la etiqueta de un dato');
  NO_MEDIBLE.push('V3 sin funcion de etiqueta');
} else {
  const srcCard = leerPwa(P_CARD);
  if (!srcCard.includes('etiquetaDeNivel'))
    fallar('V3: PortStatusBlock no usa `etiquetaDeNivel` — la etiqueta volvio a salir del JSX');
  for (const id of ids) {
    const nivel = nivelEsperado(mapa[id]);
    const etq = etiquetaDeNivel(nivel);
    v3++;
    const clave = etq === null ? '(el campo no se muestra)' : etq;
    reparto.set(clave, (reparto.get(clave) || 0) + 1);
    // La afirmacion que INV-10.1 existe para cerrar: ningun numero de
    // Gobernacion bajo la etiqueta "Capitania".
    if (nivel !== 'capitania' && etq === 'Capitanía de Puerto de') malRotuladas++;
  }
  L(`  COMPARACIONES EFECTIVAS : ${v3}`);
  for (const [k, n] of [...reparto].sort((a, b) => b[1] - a[1])) L(`      ${k.padEnd(26)} ${String(n).padStart(3)}`);
  const cap = reparto.get('Capitanía de Puerto de') || 0;
  const gob = reparto.get('Gobernación Marítima de') || 0;
  const oculto = reparto.get('(el campo no se muestra)') || 0;
  L(`  la particion cierra: ${cap} + ${gob} + ${oculto} = ${cap + gob + oculto}  de ${ids.length}`);
  L(`  numeros que NO son del escalon 1 rotulados "Capitanía de Puerto de" : ${malRotuladas}`);
  if (cap !== 99)  fallar(`V3: el escalon 1 rotulado da ${cap} y la medicion previa dio 99`);
  if (gob !== 65)  fallar(`V3: el escalon 2 rotulado da ${gob} y la medicion previa dio 65`);
  if (oculto !== 0) fallar(`V3: ${oculto} entradas dejarian de mostrar el campo, y la medicion previa dio 0`);
  if (cap + gob + oculto !== ids.length) fallar('V3: la particion no cierra en 164');
  if (malRotuladas !== 0) fallar(`V3: ${malRotuladas} rotuladas Capitania sin cumplir el escalon 1`);
  if (v3 === 0) NO_MEDIBLE.push('V3 con cero comparaciones');
}

// ── V4 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V4 — EL ESCALON 3 SE HONRA Y NO SE RELLENA (casos construidos) ===');
L('  El dato de hoy no ejercita este camino: 0 de 164. Se construye desde cero.');
const CASOS3 = [
  ['bahia sin resolver', { capitania: 'Desconocida', gobernacion: 'Desconocida', telefono: null }],
  ['sin telefono y sin nombres', { capitania: null, gobernacion: null, telefono: null }],
  ['telefono vacio', { capitania: 'Valparaíso', gobernacion: 'Valparaíso', telefono: '   ' }],
  ['hay telefono pero nadie a quien rotular', { capitania: null, gobernacion: null, telefono: '+56 32 220 8905' }],
];
let v4 = 0;
if (typeof etiquetaDeNivel === 'function') {
  for (const [etq, caso] of CASOS3) {
    v4++;
    const nivel = nivelEsperado(caso);
    const salida = etiquetaDeNivel(nivel);
    L(`  ${etq.padEnd(40)} nivel=${String(nivel)}  etiqueta=${JSON.stringify(salida)}`);
    if (nivel !== null) fallar(`V4: "${etq}" no cae al escalon 3`);
    if (salida !== null) fallar(`V4: el escalon 3 devuelve la etiqueta ${JSON.stringify(salida)} en vez de callar — eso es el relleno que el escalon 3 prohibe`);
  }
  // Y el render: sin etiqueta no puede haber fila.
  const srcCard = leerPwa(P_CARD);
  v4++;
  const cierraPorEtiqueta = /if\s*\(\s*etiqueta\s*&&\s*contacto\.nombre\s*\)/.test(srcCard);
  L(`  el render exige etiqueta y nombre para armar la fila : ${cierraPorEtiqueta ? 'SI' : 'NO'}`);
  if (!cierraPorEtiqueta) fallar('V4: el render no condiciona la fila a que haya etiqueta — el escalon 3 podria mostrarse');
} else NO_MEDIBLE.push('V4 sin funcion de etiqueta');
L(`  COMPARACIONES EFECTIVAS : ${v4}`);
if (v4 === 0) NO_MEDIBLE.push('V4 con cero comparaciones');

// ── V5 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V5 — EL TypeError DE `.replace` Y EL `tel:` NO ATOMICO ===');
const srcCard = leerPwa(P_CARD);
let v5 = 0;
const bajoAtomico = /capitania\.atomico\s*\?/.test(srcCard);
const replaceSuelto = /href=\{`tel:\$\{capitania\.telefono\.replace/.test(srcCard);
const telefonoGuardado = /\{capitania\.telefono\s*&&\s*\(/.test(srcCard);
v5 += 3;
L(`  el \`tel:\` se arma solo bajo \`capitania.atomico\`        : ${bajoAtomico ? 'SI' : 'NO'}`);
L(`  el \`.replace\` esta dentro de esa rama                  : ${replaceSuelto && bajoAtomico ? 'SI' : (replaceSuelto ? 'NO — cuelga suelto' : 'no aparece')}`);
L(`  la fila del telefono esta guardada por su presencia     : ${telefonoGuardado ? 'SI' : 'NO'}`);
if (!bajoAtomico) fallar('V5: el `tel:` no esta condicionado a la atomicidad que INV-10.1 exige');
if (!telefonoGuardado) fallar('V5: `.replace` puede invocarse sobre un telefono ausente — es el TypeError');
if (!replaceSuelto) fallar('V5: no se encontro el `tel:` esperado; el render cambio de forma');
L(`  COMPARACIONES EFECTIVAS : ${v5}`);

// ── V6 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V6 — NINGUN MENSAJE NORMATIVO LLEVA TELEFONO (INV-10.1, primera frase) ===');
const srcHook = leerPwa(P_HOOK);
const srcNorm = leerPwa(P_NORM);
const pushes = (srcHook.match(/reminders\.push\(/g) || []).length;
// se cuenta sobre el bloque de recordatorios, no sobre el archivo entero
const iBuild = srcHook.indexOf('function buildNormativeReminders');
const bloque = iBuild < 0 ? '' : srcHook.slice(iBuild);
const emiteTel = (bloque.match(/^\s*telefono:/gm) || []).length;
const renderizaTel = /reminder\.telefono/.test(srcNorm);
L(`  recordatorios que el generador emite      : ${pushes}`);
L(`  de esos, los que llevan clave \`telefono\`  : ${emiteTel}   (antes: 1 — r1_radio_aviso)`);
L(`  el render consume \`reminder.telefono\`     : ${renderizaTel ? 'SI' : 'NO'}`);
L(`  COMPARACIONES EFECTIVAS : ${pushes + 1}`);
if (pushes === 0) { NO_MEDIBLE.push('V6 con cero recordatorios'); fallar('V6: no se encontro ningun recordatorio — el bloque cambio de forma'); }
if (emiteTel !== 0) fallar(`V6: ${emiteTel} recordatorios siguen emitiendo telefono`);
if (renderizaTel) fallar('V6: NormativeBlock sigue renderizando `reminder.telefono` — la rama quedo abierta');

// ── V7 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V7 — EL BACKEND NO SE TOCO ===');
let v7 = 0;
for (const rel of ['src/services/contacto-por-escalon.js', 'src/routes/sitport-routes.js']) {
  v7++;
  const ancla = delAncla(rel).replace(/\r\n/g, '\n');
  const hoy = fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
  L(`  ${rel.padEnd(42)} ${ancla === hoy ? 'INTACTO' : 'CAMBIO'}`);
  if (ancla !== hoy) fallar(`V7: ${rel} cambio, y esta pieza no escribe backend`);
}
L(`  COMPARACIONES EFECTIVAS : ${v7}`);

// ── V8 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V8 — EL DATO NO SE TOCO, entrada por entrada ===');
const mapaAncla = JSON.parse(delAncla('src/data/bahia-capitania-map.json'));
let v8 = 0, dif = 0;
for (const id of new Set([...Object.keys(mapaAncla), ...ids])) {
  v8++;
  if (JSON.stringify(mapaAncla[id]) !== JSON.stringify(mapa[id])) { dif++; fallar(`V8: la entrada ${id} del mapa cambio`); }
}
L(`  COMPARACIONES EFECTIVAS : ${v8} · entradas distintas : ${dif}`);
if (v8 === 0) NO_MEDIBLE.push('V8 con cero comparaciones');

// ── V9 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V9 — P1 y P2 INTACTOS: ni su archivo ni su literal se movieron ===');
const P1P2 = [
  ['P2', P_P2, 237, "const nombre = rec?.capitania || rec?.gobernacion", '685092f085a13ad0fd84ed31dcf21ddc'],
  ['P1', P_P1,  62, 'const nombreCap = r.capitania || r.gobernacion;',   '1ffcaabade18406ee5f3c17d7a3b476a'],
];
let v9 = 0;
for (const [etq, rel, linea, literal, shaEsperado] of P1P2) {
  v9++;
  const lineas = leerPwa(rel).split(/\r?\n/);
  const enLinea = (lineas[linea - 1] || '').includes(literal);
  const real = sha(path.join(PWA, rel)).slice(0, 32);
  L(`  ${etq}  ${rel}:${linea}  literal:${enLinea ? 'OK' : 'MOVIDO'}  sha256:${real === shaEsperado ? 'INTACTO' : 'CAMBIO -> ' + real}`);
  if (!enLinea) fallar(`V9: el literal de ${etq} no esta en su linea declarada`);
  if (real !== shaEsperado) fallar(`V9: ${rel} cambio, y ${etq} esta fuera del alcance de esta pieza`);
}
L(`  COMPARACIONES EFECTIVAS : ${v9}`);

// ── V10 ──────────────────────────────────────────────────────────────────────
L('');
L('=== V10 — LA SUITE DEL BACKEND ===');
let v10 = 0;
try {
  const salida = execSync('npm test', { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  const pass = Number((salida.match(/^.*?pass (\d+)/m) || [])[1]);
  const fail = Number((salida.match(/^.*?fail (\d+)/m) || [])[1]);
  v10 = pass;
  L(`  pass : ${pass}   fail : ${fail}   (linea base al abrir: 86 / 0)`);
  if (fail !== 0) fallar(`V10: la suite tiene ${fail} fallas`);
  if (pass !== 86) fallar(`V10: la suite da ${pass} y la linea base era 86 — esta pieza no la mueve`);
} catch (e) {
  fallar(`V10: la suite no se pudo correr o salio en rojo — ${String(e.message).split('\n')[0]}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v10}`);

// ── V11 ──────────────────────────────────────────────────────────────────────
L('');
L('=== V11 — LA ENMIENDA DEL CONTRATO: tachado, original visible, casillas quietas ===');
const contrato = fs.readFileSync(path.join(RAIZ, 'CONTRATO_MOTOR.md'), 'utf8');
const EXIGE = [
  ['la version bumpeo a 2.3',                    /^Versión: 2\.3$/m],
  ['el changelog v2.3 existe',                   /^Cambios v2\.3:/m],
  ['la frase del 108 quedo TACHADA',             /~~Leído como lo lee P3, que sólo pregunta/],
  ['el texto original sigue VISIBLE',            /Leído como lo lee P3, que sólo pregunta \*"¿este número es de una Capitanía\?"\*/],
  ['el 108 NO se borro',                         /\*\*108 de 164\*\*/],
  ['la enmienda lleva fecha e instrumento',      /ENMENDADO 2026-08-16 \(§3\.3\)/],
  ['la nota del Tramo A quedo cumplida',         /CUMPLIDO 2026-08-16, el mismo día, en el Tramo B/],
  ['casilla 73 intacta',                         /\| de una \*\*Capitanía\*\* y no de una Gobernación \| \*\*73\*\* \|/],
  ['casilla 56 intacta',                         /\| de una \*\*Gobernación\*\* y no de una Capitanía \| \*\*56\*\* \|/],
  ['casilla 35 intacta',                         /\| figura en \*\*los dos\*\* índices — el número no distingue el nivel \| \*\*35\*\* \|/],
];
let v11 = 0;
for (const [etq, re] of EXIGE) {
  v11++;
  const ok = re.test(contrato);
  L(`  ${etq.padEnd(44)} ${ok ? 'OK' : 'NO'}`);
  if (!ok) fallar(`V11: ${etq}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v11}`);

// ── cierre ───────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
if (NO_MEDIBLE.length) { L('NO MEDIBLE : ' + NO_MEDIBLE.join(' · ')); }
if (FALLAS.length) {
  L(`RESULTADO: ROJO — ${FALLAS.length} falla(s)`);
  for (const f of FALLAS) L(`  · ${f}`);
  L('================================================================================');
  process.exit(1);
}
L('RESULTADO: VERDE — 11 controles, 0 fallas.');
L('Ningun archivo fue escrito por este instrumento, en ninguno de los dos repos.');
L('================================================================================');
