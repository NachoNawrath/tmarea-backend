'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// frente-contacto-aplicar-lote.js — frente de CONTACTO, aplicador de LOTES
//
// Escribe, en `src/data/bahia-capitania-map.json`, el NOMBRE y el TELEFONO de
// la reparticion que SITPORT atribuye, sobre el LOTE DECLARADO en
// `data/contacto/lotes_rotulo.json`.
//
// LOS DOS CAMPOS JUNTOS, Y ESA ES LA PIEZA. Criterio establecido en `f3936b8`
// y vigente: una pieza entra solo si al terminar el nombre y el telefono de
// cada entrada tocada son de la MISMA reparticion. La cobertura no manda;
// manda no fabricar credibilidad. Un null se ve como falta, un nombre valido y
// equivocado no. Medido para el lote `cisnes_f421949`
// (`_bitacoras/lote_cisnes_2026-08-16/01_medir_lote.txt`, N3): escribiendo solo
// el nombre, CERO de las 18 quedaria con el numero de su propia reparticion y
// las 18 con uno que el CSV no conoce.
//
// POR QUE EL ALCANCE ES DATO Y NO CODIGO
//   CLAUDE.md §4.3 — una regla que nombra a una entidad no es una regla. El
//   conjunto de bahias de cada pieza vive en `lotes_rotulo.json`, con su
//   `criterio` Y su `bahias_esperadas`, y este script COMPUTA el conjunto desde
//   el criterio y ABORTA si no coincide con la lista. Ni la lista puede quedar
//   vieja en silencio ni el criterio puede cambiar de alcance sin avisar.
//
// DE DONDE SALE CADA COSA
//   · la ATRIBUCION `IDBahia -> CdReparticion` : SITPORT (D-R1, owner 2026-08-15)
//   · la FORMA DEL NOMBRE                      : el titulo publicado por
//     DIRECTEMAR (D-R4, owner 2026-08-15)
//   · el TELEFONO                              : `capitanias_64_final.csv`
//   Las tres llegan por `data/contacto/reparticiones_publicadas.json`, que es un
//   derivado reproducible. Este script no vuelve a parsear HTML ni CSV.
//
// RELACION CON `scripts/frente-contacto-pieza-a.js`
//   Ese script seleccionaba por `capitania === null` y aplico la Pieza A
//   (`f3936b8`, 16 entradas). NO se toca: es la constancia de lo que se escribio
//   y esta citado por nombre en el commit, en `PLAN_JURISDICCION.md` §7.1 y en
//   dos bitacoras. Hoy es terminal — la unica entrada nula que queda es la 127
//   (Baker) y su telefono publicado no es atomico, asi que si se corriera
//   abortaria por no tener nada que escribir. Este script lo sucede para todo
//   lote nuevo. Retirarlo es una pieza propia, no un efecto lateral de esta.
//
// QUE NO HACE
//   · no toca `gobernacion`;
//   · no toca ninguna entrada fuera del lote declarado;
//   · no compara NINGUNA cadena de nombre para decidir a quien pertenece una
//     bahia: entra por el codigo de reparticion (D-R3, la mitad que sobrevive);
//   · no reformatea el archivo. Reescribe SOLO las lineas que cambia, y
//     comprueba que las demas quedan identicas byte a byte.
//
// EXCLUSIONES DECLARADAS, no silenciosas (CLAUDE.md §4.2)
//   Una entrada del lote queda FUERA, y con su motivo escrito en la salida, si:
//   · SITPORT no le da `CdReparticion`; o
//   · su reparticion no esta en el derivado; o
//   · esa reparticion no tiene nombre publicado; o
//   · su telefono NO es atomico. La regla vigente en este frente (`85bc68a`)
//     solo admite '+', digitos y espacios simples, e INV-10.1 prohibe renderizar
//     como enlace un valor que no lo sea. Es lo que dejo a la bahia 127 en null.
//
// Corrida:  node scripts/frente-contacto-aplicar-lote.js --lote=<id>
//           node scripts/frente-contacto-aplicar-lote.js --lote=<id> --dry-run
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

const P_MAPA  = 'src/data/bahia-capitania-map.json';
const P_SB    = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER   = 'data/contacto/reparticiones_publicadas.json';
const P_LOTES = 'data/contacto/lotes_rotulo.json';

const DRY = process.argv.includes('--dry-run');
const argLote = (process.argv.find(a => a.startsWith('--lote=')) || '').slice('--lote='.length);

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
// grupo, CRLF— y produciria un diff de 164 lineas para cambiar 18.
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
L(`APLICADOR DE LOTE — nombre y telefono de la reparticion que SITPORT atribuye${DRY ? '   [--dry-run]' : ''}`);
L('================================================================================');

if (!argLote) abortar('falta --lote=<id>. El alcance de una pieza no tiene valor por defecto: se declara.');

// ── el lote declarado ────────────────────────────────────────────────────────
const decl = JSON.parse(fs.readFileSync(abs(P_LOTES), 'utf8'));
if (!Array.isArray(decl.lotes) || decl.lotes.length === 0) abortar(`${P_LOTES} no declara ningun lote`);
const lotes = decl.lotes.filter(x => x.id === argLote);
if (lotes.length === 0) abortar(`${P_LOTES} no declara el lote "${argLote}". Declarados: ${decl.lotes.map(x => x.id).join(', ')}`);
if (lotes.length > 1) abortar(`${P_LOTES} declara ${lotes.length} lotes con el id "${argLote}"`);
const lote = lotes[0];
if (!lote.motivo) abortar(`el lote "${argLote}" no declara \`motivo\`. Un alcance sin motivo escrito no es un alcance declarado`);
if (!Array.isArray(lote.bahias_esperadas) || lote.bahias_esperadas.length === 0)
  abortar(`el lote "${argLote}" no declara \`bahias_esperadas\`, o las declara vacias. Declarar [] no declara nada`);

// El criterio, con mapeo exhaustivo y SIN caso por defecto (CLAUDE.md §4.2).
const CRITERIOS = {
  capitania_igual_a: (e, v) => e.cap === v
};
const clavesCriterio = Object.keys(lote.criterio || {});
if (clavesCriterio.length !== 1)
  abortar(`el lote "${argLote}" declara ${clavesCriterio.length} claves de \`criterio\` y tiene que declarar exactamente una: ${JSON.stringify(clavesCriterio)}`);
const claveCriterio = clavesCriterio[0];
if (!Object.prototype.hasOwnProperty.call(CRITERIOS, claveCriterio))
  abortar(`el lote "${argLote}" declara el criterio "${claveCriterio}", que este script no sabe evaluar. Admitidos: ${Object.keys(CRITERIOS).join(', ')}. Sin caso por defecto (CLAUDE.md §4.2): un criterio desconocido detiene la corrida, no cae al generico`);
const valorCriterio = lote.criterio[claveCriterio];

L('');
L('  LOTE DECLARADO');
L(`      id       : ${lote.id}`);
L(`      declarado: ${lote.declarado || '(sin fecha)'}`);
L(`      criterio : ${claveCriterio} = ${JSON.stringify(valorCriterio)}`);
L(`      esperadas: ${lote.bahias_esperadas.length} bahias`);

// ── el mapa ──────────────────────────────────────────────────────────────────
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
L(`      round-trip del emisor sobre las ${entradas.size} lineas: OK`);

// Coherencia con el JSON parseado, por si el parser de lineas se hubiera comido algo.
const comoJson = JSON.parse(textoOriginal);
if (Object.keys(comoJson).length !== entradas.size)
  abortar(`el parser de lineas ve ${entradas.size} entradas y JSON.parse ve ${Object.keys(comoJson).length}`);

// ── el conjunto: computado desde el criterio, cotejado contra la lista ───────
const evaluar = CRITERIOS[claveCriterio];
const delCriterio = [...entradas.values()].filter(p => evaluar(p, valorCriterio))
  .map(p => Number(p.id)).sort((a, b) => a - b);
const esperadas = [...lote.bahias_esperadas].sort((a, b) => a - b);
L('');
L('  EL CONJUNTO — computado desde el criterio y cotejado contra la lista declarada');
L(`      por el criterio : ${delCriterio.length}  -> ${delCriterio.join(', ')}`);
L(`      declaradas      : ${esperadas.length}  -> ${esperadas.join(', ')}`);
const soloCriterio = delCriterio.filter(x => !esperadas.includes(x));
const soloLista    = esperadas.filter(x => !delCriterio.includes(x));
L(`      solo en el criterio : ${soloCriterio.length ? soloCriterio.join(', ') : '(ninguna)'}`);
L(`      solo en la lista    : ${soloLista.length ? soloLista.join(', ') : '(ninguna)'}`);
if (soloCriterio.length || soloLista.length) {
  // El `criterio` describe el estado ANTERIOR a la pieza, asi que una vez
  // aplicada deja de seleccionarla y este guard dispara. Eso es correcto — el
  // alcance ya no existe — pero el aborto seria ambiguo entre "ya se aplico" y
  // "alguien movio entradas". Se desambigua con el dato, no con una suposicion:
  // se cuenta cuantas de las declaradas YA llevan el par que la pieza escribiria.
  let yaConSuPar = 0, medibles = 0;
  try {
    const sbTmp = JSON.parse(fs.readFileSync(abs(P_SB), 'utf8'));
    const sbA = Array.isArray(sbTmp) ? sbTmp : sbTmp.recordsets[0];
    const mapSb = new Map(sbA.map(r => [String(r.IDBahia), Number(r.CdReparticion)]));
    const rep = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8')).reparticiones;
    for (const n of esperadas) {
      const e = comoJson[String(n)]; const cd = mapSb.get(String(n));
      const r = cd === undefined ? null : rep[String(cd)];
      if (!e || !r) continue;
      medibles++;
      if (e.capitania === r.nombre_publicado && e.telefono === r.telefono) yaConSuPar++;
    }
  } catch { /* si no se puede medir, el aborto va sin el diagnostico */ }
  abortar(`el criterio del lote "${argLote}" y su \`bahias_esperadas\` NO describen el mismo conjunto ` +
          `(${soloCriterio.length} solo en el criterio, ${soloLista.length} solo en la lista). ` +
          `DIAGNOSTICO MEDIDO: ${yaConSuPar} de ${medibles} bahias declaradas YA llevan el par (nombre, telefono) ` +
          `que esta pieza escribiria. ` +
          (medibles > 0 && yaConSuPar === medibles
            ? 'Las declaradas ya estan escritas: EL LOTE YA SE APLICO y su criterio, que describe el estado anterior, dejo de seleccionarlo. Para reproducir la pieza hay que reponer el mapa al ancla primero.'
            : 'NO estan todas escritas, asi que esto no es "ya se aplico": o el archivo cambio desde que se declaro el lote, o la lista esta vieja.') +
          ` No se escribe nada`);
}
L('      los dos describen el MISMO conjunto: OK');

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
const delLote = delCriterio.map(n => entradas.get(String(n)));
const aEscribir = [];
const excluidas = [];
let comparadas = 0;
for (const p of delLote) {
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
L(`  COMPARACIONES EFECTIVAS (bahias del lote con reparticion en el derivado) : ${comparadas}`);
if (comparadas === 0) abortar('cero comparaciones efectivas: ninguna entrada del lote resolvio reparticion');
L(`  se escriben  : ${aEscribir.length}`);
L(`  EXCLUIDAS    : ${excluidas.length}`);
for (const e of excluidas) L(`      bahia ${String(e.id).padStart(3)} — ${e.motivo}`);
if (aEscribir.length === 0) abortar('todas las entradas del lote quedaron excluidas: no hay nada que escribir y eso no es un resultado');

// EL CRITERIO DE PIEZA, comprobado aca y no solo en el verificador: lo que se va
// a escribir tiene que dejar nombre y telefono de la MISMA reparticion.
for (const x of aEscribir) {
  const r = der.reparticiones[String(x.cdRep)];
  if (x.nombre !== r.nombre_publicado || x.telefono !== r.telefono)
    abortar(`la bahia ${x.p.id} quedaria con el nombre y el telefono de reparticiones distintas — es el defecto que el criterio de pieza de f3936b8 existe para impedir`);
}

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
let fueraDelLote = 0;
for (const k of Object.keys(comoJson)) {
  const esperado = tocadas.has(entradas.get(k).nLinea);
  const igual = JSON.stringify(comoJson[k]) === JSON.stringify(json2[k]);
  if (!esperado) { fueraDelLote++; if (!igual) abortar(`la entrada ${k} cambio y no estaba en la lista`); }
  if (esperado && igual) abortar(`la entrada ${k} estaba en la lista y no cambio`);
  if (json2[k].gobernacion !== comoJson[k].gobernacion) abortar(`la entrada ${k} cambio su \`gobernacion\`, que esta pieza no toca`);
}
L(`  el resultado es JSON valido, con las mismas claves y sin cambios en \`gobernacion\``);
L(`  entradas fuera de la lista comprobadas identicas : ${fueraDelLote}`);

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
