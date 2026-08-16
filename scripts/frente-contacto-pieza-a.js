'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// frente-contacto-pieza-a.js — PIEZA A del frente de CONTACTO
//
// Escribe, en `src/data/bahia-capitania-map.json`, el NOMBRE y el TELEFONO de la
// Capitania en las entradas que hoy tienen `capitania: null`.
//
// LOS DOS CAMPOS JUNTOS, Y ESA ES LA PIEZA. Medido el 2026-08-15
// (`_bitacoras/pieza_a_nulas_2026-08-15/`, bloque N10): escribiendo solo el
// nombre, CERO de las 17 nulas quedarian con el numero de su propia
// reparticion —diez con el de otra, siete con uno que el CSV no conoce—. Es la
// combinacion que el owner reverso el 2026-08-13 y que
// `PLAN_JURISDICCION.md` §7.1 llama "la peor de las dos posibles": el nombre de
// una Capitania con el telefono de otra. Un campo solo NO es una pieza mas
// chica: es la misma pieza fabricando credibilidad.
//
// DE DONDE SALE CADA COSA
//   · la ATRIBUCION `IDBahia -> CdReparticion` : SITPORT (D-R1, owner 2026-08-15)
//   · la FORMA DEL NOMBRE                      : el titulo publicado por
//     DIRECTEMAR (R4 = opcion B, owner 2026-08-15)
//   · el TELEFONO                              : `capitanias_64_final.csv`
//   Las tres llegan por `data/contacto/reparticiones_publicadas.json`, que es un
//   derivado reproducible. Este script no vuelve a parsear HTML ni CSV.
//
// QUE NO HACE
//   · no toca `gobernacion`;
//   · no toca ninguna entrada que ya tenga `capitania`;
//   · no compara NINGUNA cadena de nombre para decidir a quien pertenece una
//     bahia: entra por el codigo de reparticion (D-R3, la mitad que sobrevive);
//   · no reformatea el archivo. Reescribe SOLO las lineas que cambia, y
//     comprueba que las demas quedan identicas byte a byte.
//
// EXCLUSIONES DECLARADAS, no silenciosas (CLAUDE.md §4.2)
//   Una entrada queda FUERA, y con su motivo escrito en la salida, si:
//   · su reparticion no tiene nombre publicado en el derivado; o
//   · el telefono de su reparticion NO es atomico. La regla de normalizacion
//     vigente en este frente (`85bc68a`) solo admite '+', digitos y espacios
//     simples, e INV-10.1 prohibe renderizar como enlace un valor que no lo sea.
//     Hoy el mapa tiene CERO telefonos no atomicos: escribir uno seria estrenar
//     el defecto. No se arregla normalizando la cadena — lo que falta es el
//     numero.
//
// Corrida:  node scripts/frente-contacto-pieza-a.js
//           node scripts/frente-contacto-pieza-a.js --dry-run
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ESCRIBE: src/data/bahia-capitania-map.json  (salvo con --dry-run)
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_SB = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER = 'data/contacto/reparticiones_publicadas.json';

const DRY = process.argv.includes('--dry-run');

function abortar(motivo) {
  console.error('');
  console.error('================================================================================');
  console.error(`ABORTA — ${motivo}`);
  console.error('No se escribio ningun archivo.');
  console.error('================================================================================');
  process.exit(3);
}

// ── el archivo, como documento de lineas ─────────────────────────────────────
// Se reescriben solo las lineas que cambian. Reserializar el JSON entero
// destruiria el formato del archivo —columnas alineadas, lineas en blanco por
// grupo, CRLF— y produciria un diff de 164 lineas para cambiar 16.
const LINEA = /^(\s*"(\d+)":\s*)\{ ("capitania": )(.*?),(\s*)("gobernacion": )(.*?),(\s*)("telefono": )(.*?) \}(,?)$/;

function parsearLinea(l) {
  const m = LINEA.exec(l);
  if (!m) return null;
  let cap, gob, tel;
  try { cap = JSON.parse(m[4]); gob = JSON.parse(m[7]); tel = JSON.parse(m[10]); }
  catch { return null; }
  return {
    prefijo: m[1], id: m[2],
    litCap: m[4], padCap: m[5], litGob: m[7], padGob: m[8], litTel: m[10], coma: m[11],
    cap, gob, tel
  };
}

// Re-emite la linea conservando las columnas. Si un valor cambia de largo, el
// relleno de SU columna absorbe la diferencia; las demas no se mueven.
function emitirLinea(p, cap, tel) {
  const litCap = JSON.stringify(cap);
  const litTel = JSON.stringify(tel);
  const padCap = ' '.repeat(Math.max(1, p.padCap.length + (p.litCap.length - litCap.length)));
  const padGob = ' '.repeat(Math.max(1, p.padGob.length));
  return `${p.prefijo}{ "capitania": ${litCap},${padCap}"gobernacion": ${p.litGob},${padGob}"telefono": ${litTel} }${p.coma}`;
}

L('================================================================================');
L(`PIEZA A — NOMBRE Y TELEFONO DE CAPITANIA EN LAS ENTRADAS SIN ROTULO${DRY ? '   [--dry-run]' : ''}`);
L('================================================================================');

const textoOriginal = fs.readFileSync(abs(P_MAPA), 'utf8');
if (textoOriginal.charCodeAt(0) === 0xFEFF) abortar(`${P_MAPA} tiene BOM: el guard de forma del dato deberia haberlo cazado`);
const EOL = /\r\n/.test(textoOriginal) ? '\r\n' : '\n';
const lineas = textoOriginal.split(EOL);

const entradas = new Map();
for (let i = 0; i < lineas.length; i++) {
  const l = lineas[i];
  if (!l.trim() || l.trim() === '{' || l.trim() === '}') continue;
  const p = parsearLinea(l);
  if (!p) abortar(`linea ${i + 1} de ${P_MAPA} no calza el parser estructural: ${JSON.stringify(l)}`);
  if (entradas.has(p.id)) abortar(`clave duplicada "${p.id}" en ${P_MAPA}, linea ${i + 1}`);
  entradas.set(p.id, { ...p, nLinea: i });
}
L('');
L(`  ${P_MAPA}`);
L(`      sha256 ANTES : ${sha(abs(P_MAPA))}`);
L(`      fin de linea : ${EOL === '\r\n' ? 'CRLF' : 'LF'}`);
L(`      entradas     : ${entradas.size}`);

// Round-trip: re-emitir cada linea SIN cambiarle nada tiene que devolver el
// mismo byte. Si no, el emisor no conserva el formato y no se escribe nada.
for (const [id, p] of entradas) {
  if (emitirLinea(p, p.cap, p.tel) !== lineas[p.nLinea])
    abortar(`el emisor no reproduce la linea de la entrada ${id} sin cambiarla — no conserva el formato`);
}
L('      round-trip del emisor sobre las ' + entradas.size + ' lineas: OK');

// Coherencia con el JSON parseado, por si el parser de lineas se hubiera comido algo.
const comoJson = JSON.parse(textoOriginal);
if (Object.keys(comoJson).length !== entradas.size)
  abortar(`el parser de lineas ve ${entradas.size} entradas y JSON.parse ve ${Object.keys(comoJson).length}`);

// ── insumos ──────────────────────────────────────────────────────────────────
const sbRaw = JSON.parse(fs.readFileSync(abs(P_SB), 'utf8'));
// Las capturas de SITPORT no tienen todas la misma forma: unas son el array
// pelado y otras el sobre de mssql { recordsets: [[...]] }. Trampa ya pagada.
const sbArr = Array.isArray(sbRaw) ? sbRaw : sbRaw.recordsets[0];
if (!Array.isArray(sbArr) || sbArr.length === 0) abortar(`${P_SB} no trae registros`);
const SB = new Map(sbArr.map(r => [String(r.IDBahia), Number(r.CdReparticion)]));

const der = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8'));
if (!der.reparticiones || Object.keys(der.reparticiones).length === 0)
  abortar(`${P_DER} no trae reparticiones — regeneralo con scripts/frente-contacto-derivar-reparticiones.js`);
L('');
L(`  ${P_SB}   -> ${sbArr.length} registros`);
L(`  ${P_DER}  -> ${Object.keys(der.reparticiones).length} reparticiones`);

const conNombre = Object.values(der.reparticiones).filter(r => r.nombre_publicado);
if (conNombre.length === 0) abortar('el derivado no tiene ningun nombre publicado: no habria nada que escribir');

// El rotulo tiene que venir de un titulo de CAPITANIA DE PUERTO. Es INV-3.3
// aplicado al valor que se escribe: la Alcaldia de Mar no es unidad de
// jurisdiccion y su nombre no puede ocupar este campo. Se comprueba contra el
// titulo publicado, no contra el nombre, porque el nombre solo no lo dice.
const TITULO_CAPITANIA = /^Capitan[íi]a\s+de\s+Puerto\b/i;

// La atomicidad se RECALCULA aca y no se toma de la bandera del derivado: un
// insumo que se equivoque en su propia bandera no puede hacer que este script
// escriba un `tel:` roto (CLAUDE.md §5.3).
const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);

// ── lista de trabajo ─────────────────────────────────────────────────────────
const sinRotulo = [...entradas.values()].filter(p => p.cap === null).sort((a, b) => Number(a.id) - Number(b.id));
L('');
L(`  entradas con \`capitania\` null : ${sinRotulo.length}`);
if (sinRotulo.length === 0) {
  L('');
  L('  NADA QUE ESCRIBIR: el campo `capitania` no tiene ninguna entrada nula.');
  L('  Estado terminal declarado, no un cotejo vacio. Ningun archivo fue escrito.');
  L('================================================================================');
  process.exit(0);
}

const aEscribir = [];
const excluidas = [];
let comparadas = 0;
for (const p of sinRotulo) {
  const cdRep = SB.get(p.id);
  if (cdRep === undefined) { excluidas.push({ id: p.id, motivo: 'SITPORT no trae esta bahia en consultaBahias: sin atribucion, no hay que escribir' }); continue; }
  const r = der.reparticiones[String(cdRep)];
  if (!r) { excluidas.push({ id: p.id, cdRep, motivo: `el derivado no tiene la reparticion ${cdRep}` }); continue; }
  comparadas++;
  if (!r.nombre_publicado) { excluidas.push({ id: p.id, cdRep, motivo: `la reparticion ${cdRep} no tiene nombre publicado: ${r.motivo_sin_identificar}` }); continue; }
  if (!r.telefono) { excluidas.push({ id: p.id, cdRep, motivo: `la reparticion ${cdRep} no trae telefono` }); continue; }
  if (!esAtomico(r.telefono)) { excluidas.push({ id: p.id, cdRep, motivo: `el telefono de la reparticion ${cdRep} NO es atomico (${JSON.stringify(r.telefono)}): INV-10.1 lo prohibe como enlace y hoy el mapa no tiene ninguno. Falta conseguir el numero atomico; no se arregla normalizando la cadena` }); continue; }
  if (!r.identificado_por) abortar(`la reparticion ${cdRep} tiene nombre publicado y no declara como se identifico`);
  if (!TITULO_CAPITANIA.test(String(r.titulo_publicado || '')))
    abortar(`la reparticion ${cdRep} no viene de un titulo de Capitania de Puerto sino de ${JSON.stringify(r.titulo_publicado)} — INV-3.3 prohibe que ese valor ocupe el campo`);
  if (normalizarTexto(r.nombre_publicado) !== normalizarTexto(String(r.titulo_publicado).replace(TITULO_CAPITANIA, '').replace(/^\s*(?:de|del)\s+/i, '')))
    abortar(`la reparticion ${cdRep} tiene un \`nombre_publicado\` que no sale de su \`titulo_publicado\``);
  aEscribir.push({ p, cdRep, nombre: r.nombre_publicado, telefono: r.telefono, identificado_por: r.identificado_por });
}
L('');
L(`  COMPARACIONES EFECTIVAS (nulas con reparticion en el derivado) : ${comparadas}`);
if (comparadas === 0) abortar('cero comparaciones efectivas: ninguna entrada nula resolvio reparticion');
L(`  se escriben  : ${aEscribir.length}`);
L(`  EXCLUIDAS    : ${excluidas.length}`);
for (const e of excluidas) L(`      bahia ${String(e.id).padStart(3)} — ${e.motivo}`);
if (aEscribir.length === 0) abortar('todas las entradas quedaron excluidas: no hay nada que escribir y eso no es un resultado');

// ── escritura ────────────────────────────────────────────────────────────────
L('');
L('  QUE SE ESCRIBE');
L('      id   CdRep  capitania                telefono              identificada por');
const nuevas = lineas.slice();
for (const x of aEscribir) {
  nuevas[x.p.nLinea] = emitirLinea(x.p, x.nombre, x.telefono);
  L(`      ${String(x.p.id).padStart(3)}  ${String(x.cdRep).padStart(5)}  ${x.nombre.padEnd(24)} ${x.telefono.padEnd(21)} ${x.identificado_por}`);
}

// Guard duro: ninguna linea fuera de la lista puede haber cambiado.
const tocadas = new Set(aEscribir.map(x => x.p.nLinea));
let distintas = 0;
for (let i = 0; i < lineas.length; i++) {
  if (nuevas[i] === lineas[i]) continue;
  distintas++;
  if (!tocadas.has(i)) abortar(`la linea ${i + 1} cambio y NO esta en la lista de trabajo`);
}
if (distintas !== aEscribir.length) abortar(`cambiaron ${distintas} lineas y la lista tiene ${aEscribir.length}`);
L('');
L(`  lineas modificadas : ${distintas} de ${lineas.length}`);
L(`  lineas identicas   : ${lineas.length - distintas}`);

const textoNuevo = nuevas.join(EOL);
// El resultado tiene que seguir siendo el mismo JSON salvo en lo declarado.
let json2;
try { json2 = JSON.parse(textoNuevo); } catch (e) { abortar(`el archivo resultante no es JSON valido: ${e.message}`); }
if (Object.keys(json2).length !== Object.keys(comoJson).length) abortar('el archivo resultante cambio su cantidad de entradas');
for (const k of Object.keys(comoJson)) {
  const esperado = tocadas.has(entradas.get(k).nLinea);
  const igual = JSON.stringify(comoJson[k]) === JSON.stringify(json2[k]);
  if (!esperado && !igual) abortar(`la entrada ${k} cambio y no estaba en la lista`);
  if (esperado && igual) abortar(`la entrada ${k} estaba en la lista y no cambio`);
  if (json2[k].gobernacion !== comoJson[k].gobernacion) abortar(`la entrada ${k} cambio su \`gobernacion\`, que esta pieza no toca`);
}
L('  el resultado es JSON valido, con las mismas claves y sin cambios en `gobernacion`');

if (DRY) {
  L('');
  L('  --dry-run: NO se escribio nada.');
  L('================================================================================');
  process.exit(0);
}
fs.writeFileSync(abs(P_MAPA), textoNuevo, { encoding: 'utf8' });
L('');
L(`  ESCRITO: ${P_MAPA}`);
L(`      sha256 DESPUES : ${sha(abs(P_MAPA))}`);
L('================================================================================');
