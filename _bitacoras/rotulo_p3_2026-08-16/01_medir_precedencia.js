'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_precedencia.js — EN QUE ESCALON DE INV-10.1 CAE CADA ENTRADA.
//
// Corrida:  node _bitacoras/rotulo_p3_2026-08-16/01_medir_precedencia.js
// Shell declarada (CLAUDE.md §7.3): identica en PowerShell y en Git Bash.
// NO ESCRIBE NINGUN ARCHIVO.
//
// QUE MIDE, Y POR QUE NO ALCANZA CON LO YA MEDIDO
//   `_bitacoras/auditoria_rotulos_2026-08-15/02_medir_pantalla.js` mide UNA
//   pregunta: "¿el numero que P3 muestra figura en el indice de Capitanias?".
//   Su respuesta —108 de 164— se reusa aca sin tocarla y con el mismo
//   desarmado del CSV, para que sea la misma cifra.
//
//   INV-10.1 pregunta OTRA COSA, y mas dura: su escalon 1 dice "Telefono de la
//   Capitania, **si la fuente lo tiene para esa Capitania**". No basta con que
//   el numero sea de alguna Capitania: tiene que ser el de LA Capitania que la
//   entrada nombra. Una entrada con el numero de otra Capitania cumple la vara
//   del 108 y NO cumple el escalon 1. Las dos varas se miden y su diferencia se
//   publica: si dieran lo mismo, una de las dos estaria de mas.
//
// LOS INDICES, Y QUE NO SON — declarados igual que en
// `_bitacoras/contrato_51_telefonos_2026-08-16/01_medir_niveles_telefono.js`
//   NIVEL CAPITANIA   : `data/contacto/reparticiones_publicadas.json` (D-R4),
//                       que es el derivado con `nombre_publicado` y `telefono`
//                       por reparticion — el mismo insumo con el que se
//                       escribieron la Pieza A y el lote Cisnes —, MAS el
//                       indice de numeros de `capitanias_64_final.csv` para la
//                       vara del 108.
//   NIVEL GOBERNACION : la tabla hardcodeada de `src/utils/capitanias.js` mas
//                       la GM Antartica Chilena. **CONTRATO_MOTOR.md §5.1
//                       declara que esa tabla NO ES FUENTE**, y aca no se usa
//                       como fuente: se usa como INDICE para preguntar de quien
//                       es un numero. Un numero de Gobernacion que no este en
//                       el indice cae en "indeterminado", nunca en Gobernacion.
//
// LA PRECEDENCIA NO ES EXCLUSIVIDAD DE NUMERO, y se declara porque decide 35
// entradas: DIRECTEMAR publica el mismo numero para una Gobernacion y para una
// Capitania suya. Si ese numero es el que el CSV publica para la Capitania que
// la entrada nombra, **el escalon 1 se cumple** — INV-10.1 ordena escalones, no
// exige que el numero sea privativo de un nivel.
//
// LA LINEA BASE ES PARTE DE LA MEDICION: el instrumento no concluye si el arbol
// no esta donde dice estar. Comprueba HEAD contra el ancla y aborta si difiere.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));

const ABORTOS = [];
const ANCLA  = '9bbd80a364b38fdacf7b793c62a1cab59b2a400a';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_CSV  = '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv';
const P_CAP  = 'src/utils/capitanias.js';
const P_DER  = 'data/contacto/reparticiones_publicadas.json';
const P_SB   = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';

// Mismo valor y misma procedencia que el instrumento de §5.1: recuperado en
// `_bitacoras/frente_contacto_2026-08-13/gm_antartica_chilena_RECUPERADO.md`.
const TEL_GM_ANTARTICA = '+56 32 2208557';

const digitos = t => String(t == null ? '' : t).replace(/[^0-9]/g, '');

L('================================================================================');
L('EN QUE ESCALON DE INV-10.1 CAE CADA ENTRADA — estado de hoy, sin tocar nada');
L(`Ancla: commit fijo ${ANCLA}`);
L('NO escribe ningun archivo.');
L('================================================================================');

// ── linea base: el arbol tiene que estar donde dice estar ────────────────────
L('');
L('=== LINEA BASE (parte de la medicion, no un preambulo) ===');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();
L(`  HEAD    : ${head}`);
L(`  esperado: ${ANCLA}`);
if (head !== ANCLA) ABORTOS.push(`HEAD es ${head} y el ancla es ${ANCLA}: la medicion no se puede atribuir a un commit`);

// ── insumos ──────────────────────────────────────────────────────────────────
L('');
L('=== INSUMOS, con sha256 del archivo en disco ===');
for (const p of [P_MAPA, P_CSV, P_CAP, P_DER, P_SB]) L(`  ${p.padEnd(62)} ${sha(p)}`);

const mapa = JSON.parse(fs.readFileSync(abs(P_MAPA), 'utf8'));
const claves = Object.keys(mapa);

// ── indice NIVEL CAPITANIA, por reparticion publicada (D-R4) ─────────────────
const der = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8')).reparticiones;
// nombre publicado normalizado -> { telefonos: Set<digitos>, atomico, cd }
const CAP_POR_NOMBRE = new Map();
let repSinNombre = 0;
for (const [cd, r] of Object.entries(der)) {
  if (!r.nombre_publicado) { repSinNombre++; continue; }
  const k = normalizarTexto(r.nombre_publicado);
  const tels = new Set();
  for (const t of String(r.telefono == null ? '' : r.telefono).split(/ó|\/|o\s/)) {
    const d = digitos(t);
    if (d.length >= 8) tels.add(d);
  }
  if (!CAP_POR_NOMBRE.has(k)) CAP_POR_NOMBRE.set(k, { telefonos: new Set(), atomico: r.telefono_atomico, cds: [] });
  const e = CAP_POR_NOMBRE.get(k);
  for (const d of tels) e.telefonos.add(d);
  e.cds.push(Number(cd));
}

// ── indice de NUMEROS de Capitania, el del 08-15, para la vara del 108 ───────
function parseCsvLinea(l) {
  const o = []; let c = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === '"') { if (q && l[i + 1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { o.push(c); c = ''; }
    else c += ch;
  }
  o.push(c); return o;
}
let csvTxt = fs.readFileSync(abs(P_CSV), 'utf8');
if (csvTxt.charCodeAt(0) === 0xFEFF) csvTxt = csvTxt.slice(1);
const csvLin = csvTxt.split(/\r?\n/).filter(x => x.trim());
const csvCab = parseCsvLinea(csvLin[0]);
const iTel = csvCab.indexOf('Telefono'), iCap = csvCab.indexOf('Capitania');
const NUM_DE_CAPITANIA = new Map();
for (const l of csvLin.slice(1)) {
  const f = parseCsvLinea(l);
  for (const t of String(f[iTel]).split(/ó|\//)) {
    const d = digitos(t);
    if (d.length >= 8) NUM_DE_CAPITANIA.set(d, f[iCap]);
  }
}

// ── indice NIVEL GOBERNACION ─────────────────────────────────────────────────
const capTxt = fs.readFileSync(abs(P_CAP), 'utf8');
const NUM_DE_GOBERNACION = new Map();
for (const m of capTxt.matchAll(/nombre:\s*'([^']+)'[^}]*?tel:\s*'([^']+)'/g))
  NUM_DE_GOBERNACION.set(digitos(m[2]), m[1]);
NUM_DE_GOBERNACION.set(digitos(TEL_GM_ANTARTICA), 'Antártica Chilena (recuperada, fuera de la tabla)');

L('');
L('=== LOS INDICES ===');
L(`  reparticiones publicadas con nombre  : ${CAP_POR_NOMBRE.size} nombres distintos, de ${Object.keys(der).length} reparticiones`);
L(`      reparticiones SIN nombre publicado, excluidas del indice : ${repSinNombre}`);
L(`  numeros de Capitania (CSV, vara del 108) : ${NUM_DE_CAPITANIA.size}`);
L(`  numeros de Gobernacion (indice, NO fuente) : ${NUM_DE_GOBERNACION.size}`);
if (CAP_POR_NOMBRE.size === 0 || NUM_DE_GOBERNACION.size === 0 || NUM_DE_CAPITANIA.size === 0)
  ABORTOS.push('algun indice quedo vacio');

// ── LA PARTICION POR ESCALON DE INV-10.1 ─────────────────────────────────────
// Cada entrada cae en UNA casilla y solo una. El orden de evaluacion ES la
// precedencia del invariante, y se recorre de arriba hacia abajo.
L('');
L('================================================================================');
L('LA PARTICION POR ESCALON DE INV-10.1');
L('================================================================================');
L(`  DENOMINADOR DECLARADO : ${claves.length} entradas del mapa.`);
L('');
L('  Las casillas, y el criterio EXACTO de cada una:');
L('   E1  el mapa nombra una Capitania Y trae el telefono que la fuente publica');
L('       PARA ESA Capitania -> escalon 1, se rotula "Capitania de Puerto de X".');
L('   E1x el mapa nombra una Capitania y trae un numero que ES de una Capitania');
L('       pero NO de la nombrada. NO cumple el escalon 1: el par nombre+numero');
L('       manda al patron a otra reparticion.');
L('   E2  el numero es de la Gobernacion -> escalon 2, "Gobernacion Maritima de X".');
L('   E3  sin telefono -> escalon 3, el campo NO se muestra.');
L('   E?  no clasificable con los indices de hoy. Se declara, no se reparte.');

const cas = { E1: [], E1x: [], E2: [], E3: [], Eq: [] };
for (const k of claves) {
  const e = mapa[k];
  const tel = e.telefono;
  if (tel == null || String(tel).trim() === '') { cas.E3.push(k); continue; }
  const d = digitos(tel);
  const nombreCap = e.capitania == null ? null : normalizarTexto(e.capitania);
  const rep = nombreCap ? CAP_POR_NOMBRE.get(nombreCap) : null;

  if (rep && rep.telefonos.has(d)) { cas.E1.push(k); continue; }
  if (nombreCap && NUM_DE_CAPITANIA.has(d)) { cas.E1x.push(k); continue; }
  if (NUM_DE_GOBERNACION.has(d)) { cas.E2.push(k); continue; }
  if (NUM_DE_CAPITANIA.has(d)) { cas.E1x.push(k); continue; }  // numero de Capitania sin nombre de Capitania
  cas.Eq.push(k);
}
const suma = cas.E1.length + cas.E1x.length + cas.E2.length + cas.E3.length + cas.Eq.length;

L('');
L(`   E1   escalon 1 CUMPLIDO en el dato                     : ${String(cas.E1.length).padStart(3)}`);
L(`   E1x  numero de una Capitania que NO es la nombrada     : ${String(cas.E1x.length).padStart(3)}`);
L(`   E2   escalon 2 — el numero es de la Gobernacion        : ${String(cas.E2.length).padStart(3)}`);
L(`   E3   escalon 3 — sin telefono, el campo no se muestra  : ${String(cas.E3.length).padStart(3)}`);
L(`   E?   no clasificable con los indices de hoy            : ${String(cas.Eq.length).padStart(3)}`);
L(`        ${'-'.repeat(52)}`);
L(`        SUMA                                              : ${String(suma).padStart(3)}  de ${claves.length}`);
if (suma !== claves.length) ABORTOS.push(`la particion suma ${suma} y las entradas son ${claves.length}`);
if (claves.length === 0) ABORTOS.push('cero entradas: no hay nada que particionar');
L('');
L(`  COMPARACIONES EFECTIVAS (entradas clasificadas) : ${suma}`);

L('');
L('  DETALLE de las casillas que no son masivas:');
L(`    E3 : ${cas.E3.map(k => `${k} (capitania=${JSON.stringify(mapa[k].capitania)})`).join(', ') || '(ninguna)'}`);
L(`    E1x: ${cas.E1x.length} entradas`);
for (const k of cas.E1x.slice(0, 25))
  L(`        ${String(k).padStart(3)}  nombra "${mapa[k].capitania}"  tel ${mapa[k].telefono}  -> ese numero es de "${NUM_DE_CAPITANIA.get(digitos(mapa[k].telefono))}"`);
if (cas.E1x.length > 25) L(`        ... y ${cas.E1x.length - 25} mas`);
L(`    E? : ${cas.Eq.length} entradas`);
{
  const porNum = new Map();
  for (const k of cas.Eq) {
    const t = mapa[k].telefono;
    if (!porNum.has(t)) porNum.set(t, []);
    porNum.get(t).push(k);
  }
  for (const [t, ks] of [...porNum].sort((a, b) => b[1].length - a[1].length))
    L(`        ${String(t).padEnd(18)} ${String(ks.length).padStart(3)} entradas  (ej. ${ks[0]}: capitania=${JSON.stringify(mapa[ks[0]].capitania)}, gobernacion=${JSON.stringify(mapa[ks[0]].gobernacion)})`);
}

// ── LAS DOS VARAS, y su diferencia ───────────────────────────────────────────
L('');
L('=== LAS DOS VARAS, Y SU DIFERENCIA ===');
const vara108 = claves.filter(k => mapa[k].telefono && NUM_DE_CAPITANIA.has(digitos(mapa[k].telefono)));
L(`  vara del 08-15  "el numero es de ALGUNA Capitania"      : ${vara108.length} de ${claves.length}`);
L(`  vara de INV-10.1 "el numero es de LA Capitania nombrada" : ${cas.E1.length} de ${claves.length}`);
L(`  diferencia                                               : ${vara108.length - cas.E1.length}`);
L('  La diferencia son las E1x: entradas que la vara vieja cuenta como acierto y');
L('  el escalon 1 rechaza, porque el numero manda a otra reparticion que la nombrada.');
if (vara108.length !== cas.E1.length + cas.E1x.length)
  ABORTOS.push(`la vara del 108 (${vara108.length}) no cierra contra E1+E1x (${cas.E1.length}+${cas.E1x.length})`);
else
  L(`  CIERRA: ${cas.E1.length} E1 + ${cas.E1x.length} E1x = ${vara108.length}`);

// ── QUE ROTULA P3 HOY, Y QUE ROTULARIA CON LA PRECEDENCIA APLICADA ───────────
L('');
L('=== QUE ROTULA P3 HOY, Y QUE ROTULARIA CON LA PRECEDENCIA APLICADA ===');
L('  HOY, literal (PortStatusBlock.jsx:76-77): "Gobernacion Maritima de {gobernacion}"');
L('  para las 164, sin mirar `capitania` ni una vez.');
let cambianRotulo = 0, cambianNombre = 0, dejanDeMostrarse = 0;
for (const k of claves) {
  const e = mapa[k];
  const hoyNivel = 'gobernacion', hoyNombre = e.gobernacion;
  let nuevoNivel, nuevoNombre;
  if (cas.E3.includes(k)) { nuevoNivel = null; nuevoNombre = null; }
  else if (cas.E1.includes(k)) { nuevoNivel = 'capitania'; nuevoNombre = e.capitania; }
  else { nuevoNivel = 'gobernacion'; nuevoNombre = e.gobernacion; }
  if (nuevoNivel === null) { dejanDeMostrarse++; continue; }
  if (nuevoNivel !== hoyNivel) cambianRotulo++;
  if (normalizarTexto(String(nuevoNombre)) !== normalizarTexto(String(hoyNombre))) cambianNombre++;
}
L('');
L(`  entradas cuyo ROTULO DE NIVEL cambia (Gobernacion -> Capitania) : ${cambianRotulo}`);
L(`  entradas cuyo NOMBRE mostrado cambia                            : ${cambianNombre}`);
L(`  entradas que DEJAN de mostrar el campo (escalon 3)              : ${dejanDeMostrarse}`);
L(`  entradas que no se mueven                                       : ${claves.length - cambianRotulo - dejanDeMostrarse}`);
L(`  SUMA : ${cambianRotulo} + ${dejanDeMostrarse} + ${claves.length - cambianRotulo - dejanDeMostrarse} = ${claves.length}`);

// ── LA OPCION BARATA, MEDIDA ANTES DE DESCARTARLA ────────────────────────────
// El componente YA RECIBE `data.capitania` (el backend lo emite en
// `sitport-routes.js:346` y la PWA lo copia en `useVoyageVerification.js:246`).
// De ahi sale la opcion mas barata que existe: decidir el escalon en el JSX con
// `capitania != null`, sin tocar el backend. Se mide en vez de descartarla de
// palabra, porque su costo no se ve sin el numero.
L('');
L('=== LA OPCION BARATA: decidir el escalon con `capitania != null` en el JSX ===');
const conNombreCap = claves.filter(k => mapa[k].capitania != null);
const baratoOk   = conNombreCap.filter(k => cas.E1.includes(k));
const baratoE1x  = conNombreCap.filter(k => cas.E1x.includes(k));
const baratoGob  = conNombreCap.filter(k => cas.E2.includes(k));
L(`  entradas que rotularia "Capitania de Puerto de X" : ${conNombreCap.length} de ${claves.length}`);
L(`      de esas, el numero SI es de la Capitania nombrada  : ${baratoOk.length}`);
L(`      de esas, el numero es de OTRA Capitania            : ${baratoE1x.length}`);
L(`      de esas, el numero es de la GOBERNACION            : ${baratoGob.length}`);
L(`  SUMA : ${baratoOk.length} + ${baratoE1x.length} + ${baratoGob.length} = ${baratoOk.length + baratoE1x.length + baratoGob.length} de ${conNombreCap.length}`);
if (baratoOk.length + baratoE1x.length + baratoGob.length !== conNombreCap.length)
  ABORTOS.push('la opcion barata no reparte sus entradas: la suma no cierra');
L('');
L(`  LO QUE ESO CUESTA, con su denominador: ${baratoGob.length} de las ${claves.length} quedarian rotuladas`);
L('  "Capitania de Puerto de X" sobre un numero que es de la GOBERNACION — que es');
L('  LITERALMENTE el defecto que INV-10.1 dice existir para cerrar. La opcion mas');
L(`  barata construye la infraccion que el invariante nombra, en ${baratoGob.length + baratoE1x.length} entradas contando`);
L('  las que mandan a otra Capitania.');

// ── ATOMICIDAD: INV-10.1 prohibe el `tel:` sobre un valor no atomico ─────────
L('');
L('=== ATOMICIDAD DEL VALOR QUE SE RENDERIZA COMO `tel:` (INV-10.1) ===');
L('  El render de hoy arma `tel:` SIEMPRE, sin comprobar nada. Lo que hoy lo');
L('  salva es el DATO, no el render.');
// El criterio NO se inventa aca: es el mismo `esAtomico` que ya usan
// `scripts/frente-contacto-aplicar-lote.js:262`, `frente-contacto-pieza-a.js:167`
// y la V5 de `_bitacoras/lote_cisnes_2026-08-16/03_verificar.js:84`. Inventar un
// criterio propio produjo, en la primera corrida de este instrumento, la cifra
// legible y falsa de 75 no atomicos contra los 0 que la V5 ya media.
const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);
const noAtomicos = claves.filter(k => mapa[k].telefono != null && !esAtomico(mapa[k].telefono));
L(`  entradas con telefono                          : ${claves.filter(k => mapa[k].telefono).length}`);
L(`  entradas cuyo valor NO es un numero atomico    : ${noAtomicos.length}  ${noAtomicos.join(', ')}`);
L('  Denominador: las ' + claves.length + ' entradas.');

// ── EL CUARTO CAMINO A PANTALLA ──────────────────────────────────────────────
L('');
L('=== EL CUARTO CAMINO — no estaba enumerado en `0bc80d2` ===');
L('  `useVoyageVerification.js:535-547` arma el recordatorio `r1_radio_aviso`');
L('  leyendo `portStatus.zarpe.gobernacion` y `portStatus.zarpe.telefono` — el');
L('  MISMO par que P3 — y lo rotula "Gobernacion Maritima de {nombre}".');
L('  `NormativeBlock.jsx:81-83` lo renderiza con el telefono en una pastilla.');
L('  Los dos hechos se leyeron del codigo de la PWA, en SOLO LECTURA.');
L('  Alcance en entradas: el mismo par, asi que las mismas ' + cas.E1.length + ' de E1.');

L('');
L('================================================================================');
if (ABORTOS.length) { L('ABORTA — ' + ABORTOS.join(' · ')); L('================================================================================'); process.exit(3); }
L('MEDICION COMPLETA. Ningun archivo fue escrito.');
L('================================================================================');
