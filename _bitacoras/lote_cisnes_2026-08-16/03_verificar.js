'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 03_verificar.js — VERIFICACION DEL LOTE CISNES
//
// ANCLADO AL COMMIT FIJO `bd75c494`, no a HEAD. Un verificador que se compare
// contra HEAD deja de medir en cuanto alguien commitea.
//
// COMPARA LINEA A LINEA Y NO POR BYTES DEL ARCHIVO ENTERO, y hay que decir por
// que: `core.autocrlf=true` deja el blob de git en LF y el disco en CRLF, asi
// que el archivo entero NUNCA va a dar el mismo sha. Lo que se compara es el
// CONTENIDO de cada linea, caracter por caracter. El terminador de linea es
// propiedad del repositorio, no de la entrada.
//
// Corrida:  node _bitacoras/lote_cisnes_2026-08-16/03_verificar.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// NO ESCRIBE NINGUN ARCHIVO. exit 0 si todo pasa, 1 si algo falla,
// 3 si no pudo medir (que no es lo mismo que pasar).
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);

const ANCLA   = 'bd75c494';
const P_MAPA  = 'src/data/bahia-capitania-map.json';
const P_SB    = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER   = 'data/contacto/reparticiones_publicadas.json';
const P_LOTES = 'data/contacto/lotes_rotulo.json';
const LOTE_ID = 'cisnes_f421949';

const FALLAS = [];
const NO_MEDIBLE = [];
const fallar = m => FALLAS.push(m);

L('================================================================================');
L(`VERIFICACION — LOTE CISNES. Ancla: commit fijo ${ANCLA}`);
L('================================================================================');

// ── insumos ──────────────────────────────────────────────────────────────────
let blobViejo;
try {
  blobViejo = execFileSync('git', ['show', `${ANCLA}:${P_MAPA}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' });
} catch (e) { NO_MEDIBLE.push(`no se pudo leer ${ANCLA}:${P_MAPA} — ${e.message}`); }

const textoHoy = fs.readFileSync(abs(P_MAPA), 'utf8');
const lineasHoy   = textoHoy.split(/\r\n|\n/);
const lineasViejo = (blobViejo || '').split(/\r\n|\n/);
const jsonHoy     = JSON.parse(textoHoy);
const jsonViejo   = blobViejo ? JSON.parse(blobViejo) : {};

const decl = JSON.parse(fs.readFileSync(abs(P_LOTES), 'utf8'));
const lote = decl.lotes.find(x => x.id === LOTE_ID);
if (!lote) NO_MEDIBLE.push(`${P_LOTES} no declara el lote "${LOTE_ID}"`);
const LOTE = new Set((lote ? lote.bahias_esperadas : []).map(String));

const sbRaw = JSON.parse(fs.readFileSync(abs(P_SB), 'utf8'));
const sbArr = Array.isArray(sbRaw) ? sbRaw : sbRaw.recordsets[0];
if (!Array.isArray(sbArr) || sbArr.length === 0) NO_MEDIBLE.push(`${P_SB} no trae registros`);
const SB = new Map(sbArr.map(r => [String(r.IDBahia), Number(r.CdReparticion)]));

const der = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8')).reparticiones;
if (!der || Object.keys(der).length === 0) NO_MEDIBLE.push(`${P_DER} no trae reparticiones`);

if (NO_MEDIBLE.length) {
  L('');
  L('NO SE PUDO MEDIR — ' + NO_MEDIBLE.join(' · '));
  L('Esto NO es "paso": es que el verificador no pudo correr.');
  L('================================================================================');
  process.exit(3);
}

L('');
L(`  entradas en el ancla : ${Object.keys(jsonViejo).length}`);
L(`  entradas hoy         : ${Object.keys(jsonHoy).length}`);
L(`  lote declarado       : ${LOTE.size} bahias`);
if (LOTE.size === 0) { L('ABORTA — el lote declarado esta vacio'); process.exit(3); }

const TITULO_CAPITANIA = /^Capitan[íi]a\s+de\s+Puerto\b/i;
const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);

// ── V1 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V1 — las CLAVES y el campo `gobernacion` quedaron intactos ===');
let v1 = 0;
const clavesViejo = Object.keys(jsonViejo), clavesHoy = Object.keys(jsonHoy);
if (clavesViejo.length !== clavesHoy.length) fallar(`V1: el ancla tiene ${clavesViejo.length} entradas y hoy hay ${clavesHoy.length}`);
if (clavesViejo.join(',') !== clavesHoy.join(',')) fallar('V1: el conjunto o el ORDEN de las claves cambio');
for (const k of clavesViejo) {
  v1++;
  if (!(k in jsonHoy)) { fallar(`V1: la entrada ${k} desaparecio`); continue; }
  if (jsonViejo[k].gobernacion !== jsonHoy[k].gobernacion)
    fallar(`V1: la entrada ${k} cambio su \`gobernacion\`: ${JSON.stringify(jsonViejo[k].gobernacion)} -> ${JSON.stringify(jsonHoy[k].gobernacion)}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v1}`);
if (v1 === 0) NO_MEDIBLE.push('V1 con cero comparaciones');
L(`  claves identicas y en el mismo orden · \`gobernacion\` sin cambios : ${FALLAS.filter(f => f.startsWith('V1')).length === 0 ? 'SI' : 'NO'}`);

// ── V2 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V2 — se movieron EXACTAMENTE las lineas del lote, y ninguna otra ===');
let v2 = 0, movidas = [];
if (lineasViejo.length !== lineasHoy.length) fallar(`V2: el archivo tiene ${lineasHoy.length} lineas y el ancla ${lineasViejo.length}`);
for (let i = 0; i < Math.min(lineasViejo.length, lineasHoy.length); i++) {
  v2++;
  if (lineasViejo[i] !== lineasHoy[i]) movidas.push(i + 1);
}
L(`  COMPARACIONES EFECTIVAS (lineas) : ${v2}`);
if (v2 === 0) NO_MEDIBLE.push('V2 con cero comparaciones');
L(`  lineas movidas : ${movidas.length}`);
const idDeLinea = n => {
  const m = /^\s*"(\d+)":/.exec(lineasHoy[n - 1] || '');
  return m ? m[1] : null;
};
const idsMovidos = movidas.map(idDeLinea);
if (idsMovidos.some(x => x === null)) fallar(`V2: alguna linea movida no es una entrada del mapa: ${movidas.filter((n, i) => idsMovidos[i] === null).join(', ')}`);
const fueraDelLote = idsMovidos.filter(x => x && !LOTE.has(x));
const noMovidasDelLote = [...LOTE].filter(id => !idsMovidos.includes(id));
L(`  ids movidos    : ${idsMovidos.join(', ')}`);
if (fueraDelLote.length) fallar(`V2: se movieron ${fueraDelLote.length} entradas que NO son del lote: ${fueraDelLote.join(', ')}`);
if (noMovidasDelLote.length) fallar(`V2: ${noMovidasDelLote.length} entradas del lote NO se movieron: ${noMovidasDelLote.join(', ')}`);
if (movidas.length !== LOTE.size) fallar(`V2: se movieron ${movidas.length} lineas y el lote tiene ${LOTE.size}`);
L(`  todas las movidas son del lote y todo el lote se movio : ${fueraDelLote.length === 0 && noMovidasDelLote.length === 0 ? 'SI' : 'NO'}`);

// ── V3 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V3 — EL PAR: nombre y telefono de la MISMA reparticion, en cada entrada del lote ===');
L('  Es el criterio de pieza de `f3936b8`. La identificacion NO compara nombres:');
L('  entra por `CdReparticion` (D-R1) y cotea contra la fila del derivado.');
let v3 = 0;
L('   id  CdRep  capitania         telefono           ¿del mismo CdRep?');
for (const id of [...LOTE].sort((a, b) => Number(a) - Number(b))) {
  const e = jsonHoy[id];
  const cd = SB.get(id);
  if (cd === undefined) { fallar(`V3: SITPORT no atribuye reparticion a la bahia ${id}, que esta en el lote y fue escrita`); continue; }
  const r = der[String(cd)];
  if (!r) { fallar(`V3: el derivado no tiene la reparticion ${cd} de la bahia ${id}`); continue; }
  v3++;
  const okNombre = e.capitania === r.nombre_publicado;
  const okTel    = e.telefono === r.telefono;
  L(`  ${String(id).padStart(3)}  ${String(cd).padStart(5)}  ${String(e.capitania).padEnd(17)} ${String(e.telefono).padEnd(18)} ${okNombre && okTel ? 'SI' : 'NO'}`);
  if (!okNombre) fallar(`V3: la bahia ${id} tiene capitania ${JSON.stringify(e.capitania)} y la reparticion ${cd} publica ${JSON.stringify(r.nombre_publicado)}`);
  if (!okTel)    fallar(`V3: la bahia ${id} tiene telefono ${JSON.stringify(e.telefono)} y la reparticion ${cd} trae ${JSON.stringify(r.telefono)}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v3}`);
if (v3 === 0) NO_MEDIBLE.push('V3 con cero comparaciones');

// ── V4 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V4 — el rotulo escrito viene de un titulo de "Capitania de Puerto" (INV-3.3) ===');
L('  La Alcaldia de Mar no es unidad de jurisdiccion y su nombre no puede ocupar');
L('  este campo. Se comprueba contra el TITULO publicado, no contra el nombre.');
let v4 = 0;
for (const id of [...LOTE].sort((a, b) => Number(a) - Number(b))) {
  const cd = SB.get(id); const r = cd === undefined ? null : der[String(cd)];
  if (!r) continue;
  v4++;
  if (!TITULO_CAPITANIA.test(String(r.titulo_publicado || '')))
    fallar(`V4: la bahia ${id} lleva un rotulo que viene de ${JSON.stringify(r.titulo_publicado)}, que no es un titulo de Capitania de Puerto`);
  const pelado = String(r.titulo_publicado).replace(TITULO_CAPITANIA, '').replace(/^\s*(?:de|del)\s+/i, '');
  if (normalizarTexto(jsonHoy[id].capitania) !== normalizarTexto(pelado))
    fallar(`V4: la bahia ${id} dice ${JSON.stringify(jsonHoy[id].capitania)} y su titulo publicado pelado es ${JSON.stringify(pelado)}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v4}`);
if (v4 === 0) NO_MEDIBLE.push('V4 con cero comparaciones');
L(`  los ${v4} rotulos del lote vienen de un titulo de Capitania de Puerto : ${FALLAS.filter(f => f.startsWith('V4')).length === 0 ? 'SI' : 'NO'}`);

// ── V5 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V5 — CERO telefonos no atomicos en TODO el archivo (INV-10.1) ===');
L('  El universo son las 164, no las del lote: un `tel:` roto en cualquier');
L('  entrada es el defecto, venga de esta pieza o de otra.');
let v5 = 0, noAtomicos = [];
for (const k of Object.keys(jsonHoy)) {
  v5++;
  if (jsonHoy[k].telefono != null && !esAtomico(jsonHoy[k].telefono)) noAtomicos.push(`${k}=${JSON.stringify(jsonHoy[k].telefono)}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v5}`);
if (v5 === 0) NO_MEDIBLE.push('V5 con cero comparaciones');
L(`  telefonos NO atomicos : ${noAtomicos.length}${noAtomicos.length ? ' -> ' + noAtomicos.join(', ') : ''}`);
if (noAtomicos.length) fallar(`V5: ${noAtomicos.length} telefonos no atomicos: ${noAtomicos.join(', ')}`);

// ── V6 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V6 — las entradas que NO son del lote, IDENTICAS contra el blob del ancla ===');
L('  Identicas caracter por caracter DENTRO de la linea, y ademas identicas como');
L('  valor JSON. El terminador de linea no se compara: el blob viene en LF y el');
L('  disco esta en CRLF, y eso es propiedad del repositorio, no de la entrada.');
let v6 = 0, difLinea = [], difValor = [];
const lineaDeId = (lineas, id) => lineas.find(l => new RegExp(`^\\s*"${id}":`).test(l));
for (const k of Object.keys(jsonViejo)) {
  if (LOTE.has(k)) continue;
  v6++;
  const lv = lineaDeId(lineasViejo, k), lh = lineaDeId(lineasHoy, k);
  if (lv === undefined || lh === undefined) { difLinea.push(`${k}(sin linea)`); continue; }
  if (lv !== lh) difLinea.push(k);
  if (JSON.stringify(jsonViejo[k]) !== JSON.stringify(jsonHoy[k])) difValor.push(k);
}
L(`  COMPARACIONES EFECTIVAS (entradas fuera del lote) : ${v6}`);
if (v6 === 0) NO_MEDIBLE.push('V6 con cero comparaciones');
L(`  con la LINEA distinta : ${difLinea.length}${difLinea.length ? ' -> ' + difLinea.join(', ') : ''}`);
L(`  con el VALOR distinto : ${difValor.length}${difValor.length ? ' -> ' + difValor.join(', ') : ''}`);
if (difLinea.length) fallar(`V6: ${difLinea.length} entradas fuera del lote cambiaron su linea: ${difLinea.join(', ')}`);
if (difValor.length) fallar(`V6: ${difValor.length} entradas fuera del lote cambiaron su valor: ${difValor.join(', ')}`);

// ── V7 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V7 — las entradas con `capitania` null siguen siendo las declaradas ===');
const nulasViejo = Object.keys(jsonViejo).filter(k => jsonViejo[k].capitania === null);
const nulasHoy   = Object.keys(jsonHoy).filter(k => jsonHoy[k].capitania === null);
L(`  nulas en el ancla : ${nulasViejo.length} -> ${nulasViejo.join(', ') || '(ninguna)'}`);
L(`  nulas hoy         : ${nulasHoy.length} -> ${nulasHoy.join(', ') || '(ninguna)'}`);
L('  COMPARACIONES EFECTIVAS : 1 (el conjunto de nulas, antes contra despues)');
if (nulasViejo.join(',') !== nulasHoy.join(','))
  fallar(`V7: el conjunto de entradas nulas cambio: ${nulasViejo.join(',')} -> ${nulasHoy.join(',')}`);
L('  La 127 (Baker) sigue en null a proposito: el telefono que su reparticion');
L('  publica es "Móvil: +569 5617 3241" y no es atomico. Pendiente propio,');
L('  declarado desde `f3936b8`, y esta pieza no lo toca.');

// ── veredicto ────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
if (NO_MEDIBLE.length) {
  L('NO SE PUDO MEDIR — ' + NO_MEDIBLE.join(' · '));
  L('================================================================================');
  process.exit(3);
}
if (FALLAS.length) {
  L(`RESULTADO: ${FALLAS.length} falla(s).`);
  for (const f of FALLAS) L('  · ' + f);
  L('================================================================================');
  process.exit(1);
}
L('RESULTADO: V1–V7 en verde.');
L(`  V1 ${v1} · V2 ${v2} lineas · V3 ${v3} · V4 ${v4} · V5 ${v5} · V6 ${v6} · V7 1`);
L('================================================================================');
process.exit(0);
