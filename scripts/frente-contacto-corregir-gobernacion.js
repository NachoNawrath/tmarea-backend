'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// frente-contacto-corregir-gobernacion.js — frente de CONTACTO
//
// Aplica una correccion DECLARADA del campo `gobernacion` de
// `src/data/bahia-capitania-map.json`, y —en la MISMA corrida— retira la
// discrepancia que esa correccion deja sin objeto en
// `data/decreto/zonas_aviso.json`.
//
// LAS DOS MITADES SON UNA SOLA PIEZA, Y ESO ESTA MEDIDO, no supuesto.
//   `bd75c494` le puso retiro automatico a la discrepancia declarada. Lo
//   automatico es la DETENCION, no la limpieza: escrita la Gobernacion correcta
//   y con la declaracion sin retirar, el guard de `src/services/zonas-aviso.js`
//   detiene la carga y la suite cae a 69/84. Medido en
//   `_bitacoras/bahia_129_gobernacion_2026-08-16/`, bloques N4 y 02_. El estado
//   intermedio no es un paso: es un arbol roto. Por eso este script escribe los
//   dos archivos o ninguno, y REVIERTE LOS DOS si la carga no pasa al final.
//
// POR QUE EL ALCANCE ES DATO Y NO CODIGO
//   CLAUDE.md §4.3. La correccion vive en `data/contacto/correcciones_gobernacion.json`
//   con su bahia, su valor viejo, su valor nuevo y la fuente publicada que la
//   adjudica. El script no nombra ninguna bahia.
//
// LOS TRES GUARDS QUE NO SE PUEDEN SALTEAR
//   1. el archivo tiene que decir HOY `valor_actual_esperado`. Si se movio, se
//      detiene en vez de pisar;
//   2. `valor_nuevo` tiene que coincidir con lo que el DECRETO le da a la
//      jurisdiccion de esa bahia. El script no le cree al valor declarado: lo
//      coteja. Una correccion mal tipeada no entra;
//   3. la jurisdiccion de la bahia se resuelve por la zona de `zonas_aviso.json`
//      que declara esa `bahia_id`, y tiene que ser la MISMA que la correccion
//      declara. Son dos archivos distintos diciendo lo mismo; si no lo dicen,
//      aborta. (El join NO se usa: para esta bahia dice `sin_resolver`.)
//
// NI EL MAPA NI `zonas_aviso.json` SE RESERIALIZAN. Los dos estan formateados a
// mano —columnas alineadas en uno, objetos compactos en el otro— y reserializar
// produciria un diff de cientos de lineas para cambiar dos. Se editan por linea
// y se comprueba que todo lo demas queda identico.
//
// Corrida:  node scripts/frente-contacto-corregir-gobernacion.js --correccion=<id>
//           node scripts/frente-contacto-corregir-gobernacion.js --correccion=<id> --dry-run
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ESCRIBE: src/data/bahia-capitania-map.json y data/decreto/zonas_aviso.json
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');

const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_ZA   = 'data/decreto/zonas_aviso.json';
const P_JUR  = 'data/decreto/jurisdicciones_v2.json';
const P_DECL = 'data/contacto/correcciones_gobernacion.json';

const DRY = process.argv.includes('--dry-run');
const argId = (process.argv.find(a => a.startsWith('--correccion=')) || '').slice('--correccion='.length);

const RESPALDO = new Map();
function respaldar() { for (const p of [P_MAPA, P_ZA]) RESPALDO.set(p, fs.readFileSync(abs(p))); }
function revertir() { for (const [p, b] of RESPALDO) fs.writeFileSync(abs(p), b); }

function abortar(motivo, revirtiendo = false) {
  if (revirtiendo) revertir();
  console.error('');
  console.error('================================================================================');
  console.error(`ABORTA — ${motivo}`);
  console.error(revirtiendo ? 'Los dos archivos quedaron REVERTIDOS a su estado de partida.' : 'No se escribio ningun archivo.');
  console.error('================================================================================');
  process.exit(3);
}

L('================================================================================');
L(`CORRECCION DECLARADA DE \`gobernacion\`, y retiro de la discrepancia que deja sin objeto${DRY ? '   [--dry-run]' : ''}`);
L('================================================================================');

if (!argId) abortar('falta --correccion=<id>. El alcance de una pieza no tiene valor por defecto: se declara.');

// ── la correccion declarada ──────────────────────────────────────────────────
const decl = JSON.parse(fs.readFileSync(abs(P_DECL), 'utf8'));
if (!Array.isArray(decl.correcciones) || decl.correcciones.length === 0) abortar(`${P_DECL} no declara ninguna correccion`);
const cands = decl.correcciones.filter(c => c.id === argId);
if (cands.length === 0) abortar(`${P_DECL} no declara la correccion "${argId}". Declaradas: ${decl.correcciones.map(c => c.id).join(', ')}`);
if (cands.length > 1) abortar(`${P_DECL} declara ${cands.length} correcciones con el id "${argId}"`);
const C = cands[0];

// Mapeo exhaustivo del campo, sin caso por defecto (CLAUDE.md §4.2).
const CAMPOS = { gobernacion: true };
if (!Object.prototype.hasOwnProperty.call(CAMPOS, C.campo))
  abortar(`la correccion "${argId}" declara el campo "${C.campo}", que este script no sabe corregir. Admitidos: ${Object.keys(CAMPOS).join(', ')}. Sin caso por defecto: un campo desconocido detiene la corrida, no cae al generico`);
if (!Number.isInteger(C.bahia_id)) abortar(`la correccion "${argId}" no declara \`bahia_id\` entero`);
if (typeof C.valor_actual_esperado !== 'string' || !C.valor_actual_esperado.trim()) abortar(`la correccion "${argId}" no declara \`valor_actual_esperado\``);
if (typeof C.valor_nuevo !== 'string' || !C.valor_nuevo.trim()) abortar(`la correccion "${argId}" no declara \`valor_nuevo\``);
if (!C.motivo || !String(C.motivo).trim()) abortar(`la correccion "${argId}" no declara \`motivo\` escrito`);
if (!C.fuente || !C.fuente.url || !C.fuente.consultada_el)
  abortar(`la correccion "${argId}" no declara su \`fuente\` con url y fecha de consulta. Una adjudicacion sin fuente citada es una preferencia`);
if (C.valor_actual_esperado === C.valor_nuevo) abortar(`la correccion "${argId}" declara el mismo valor viejo y nuevo: no hay nada que corregir`);

L('');
L('  CORRECCION DECLARADA');
L(`      id        : ${C.id}`);
L(`      bahia     : ${C.bahia_id}`);
L(`      campo     : ${C.campo}`);
L(`      ${C.valor_actual_esperado}  ->  ${C.valor_nuevo}`);
L(`      fuente    : ${C.fuente.publicada_por || '(sin declarar)'}, consultada el ${C.fuente.consultada_el}`);
L(`                  ${C.fuente.url}`);

// ── el mapa ──────────────────────────────────────────────────────────────────
const textoMapa = fs.readFileSync(abs(P_MAPA), 'utf8');
if (textoMapa.charCodeAt(0) === 0xFEFF) abortar(`${P_MAPA} tiene BOM`);
const EOL_M = /\r\n/.test(textoMapa) ? '\r\n' : '\n';
const lineasMapa = textoMapa.split(EOL_M);
const mapaJson = JSON.parse(textoMapa);

L('');
L(`  ${P_MAPA}`);
L(`      sha256 ANTES : ${sha(P_MAPA)}`);
L(`      fin de linea : ${EOL_M === '\r\n' ? 'CRLF' : 'LF'}   entradas: ${Object.keys(mapaJson).length}`);

const eBahia = mapaJson[String(C.bahia_id)];
if (!eBahia) abortar(`la bahia ${C.bahia_id} no existe en ${P_MAPA}`);

// GUARD 1 — el archivo tiene que decir hoy lo que la correccion espera.
if (eBahia[C.campo] !== C.valor_actual_esperado)
  abortar(`la bahia ${C.bahia_id} tiene \`${C.campo}\` = ${JSON.stringify(eBahia[C.campo])} y la correccion esperaba ` +
          `${JSON.stringify(C.valor_actual_esperado)}. El archivo se movio desde que se declaro la correccion, ` +
          `o la correccion ya se aplico. No se pisa nada`);
L(`      guard 1 — el archivo dice hoy ${JSON.stringify(C.valor_actual_esperado)}: OK`);

// ── zonas_aviso: la zona que declara esta bahia ──────────────────────────────
const textoZa = fs.readFileSync(abs(P_ZA), 'utf8');
const EOL_Z = /\r\n/.test(textoZa) ? '\r\n' : '\n';
const lineasZa = textoZa.split(EOL_Z);
const zaJson = JSON.parse(textoZa);

const R = C.retirar_discrepancia_declarada;
if (!R || !R.zona || !R.nivel || !R.clave_nota || !R.nota)
  abortar(`la correccion "${argId}" no declara \`retirar_discrepancia_declarada\` con zona, nivel, clave_nota y nota`);

const zonasConLaBahia = zaJson.zonas.filter(z => z.contacto && Number(z.contacto.bahia_id) === C.bahia_id);
if (zonasConLaBahia.length !== 1)
  abortar(`${P_ZA} tiene ${zonasConLaBahia.length} zonas cuyo contacto declara la bahia ${C.bahia_id}, y tiene que haber exactamente una`);
const zona = zonasConLaBahia[0];

// GUARD 3 — dos archivos distintos tienen que decir la misma jurisdiccion.
if (zona.jurisdiccion_id !== R.zona)
  abortar(`la bahia ${C.bahia_id} cuelga de la zona '${zona.jurisdiccion_id}' en ${P_ZA} y la correccion declara '${R.zona}'`);
L(`      guard 3 — la zona de la bahia coincide en los dos archivos ('${R.zona}'): OK`);

// GUARD 2 — el valor nuevo tiene que ser el del decreto.
const jur = JSON.parse(fs.readFileSync(abs(P_JUR), 'utf8'));
const j = jur.jurisdicciones.find(x => x.id === zona.jurisdiccion_id);
if (!j) abortar(`el insumo del decreto no trae la jurisdiccion '${zona.jurisdiccion_id}'`);
const delDecreto = C.campo === 'gobernacion' ? j.gobernacion : null;
if (delDecreto === null) abortar(`no se sabe de donde sacar '${C.campo}' del decreto`);
if (normalizarTexto(C.valor_nuevo) !== normalizarTexto(delDecreto))
  abortar(`la correccion declara \`valor_nuevo\` = ${JSON.stringify(C.valor_nuevo)} y el decreto le da ` +
          `${JSON.stringify(delDecreto)} a '${zona.jurisdiccion_id}'. El valor declarado no se aplica sin cotejar`);
L(`      guard 2 — \`valor_nuevo\` coincide con el decreto (${JSON.stringify(delDecreto)}): OK`);

// La discrepancia declarada tiene que existir y ser del nivel que se retira.
const dd = zona.contacto.discrepancias_declaradas;
if (!Array.isArray(dd) || dd.length === 0)
  abortar(`la zona '${R.zona}' no tiene \`discrepancias_declaradas\` que retirar. Si ya se retiro, esta correccion ya se aplico`);
if (!dd.some(x => Number(x.bahia_id) === C.bahia_id && x.nivel === R.nivel))
  abortar(`la zona '${R.zona}' no declara ninguna discrepancia de la bahia ${C.bahia_id} en nivel '${R.nivel}'`);
if (dd.length !== 1)
  abortar(`la zona '${R.zona}' declara ${dd.length} discrepancias y este script solo sabe retirar el bloque entero. ` +
          `Retirar una de varias exige decidir que pasa con las otras, y eso no se resuelve de este lado`);
if (Object.prototype.hasOwnProperty.call(zona.contacto, R.clave_nota))
  abortar(`la zona '${R.zona}' ya tiene la clave '${R.clave_nota}': esta correccion ya se aplico`);
L(`      la zona declara 1 discrepancia, de la bahia ${C.bahia_id} en nivel '${R.nivel}': OK`);

// ── escritura del mapa, por linea ────────────────────────────────────────────
const LINEA = new RegExp(`^(\\s*"${C.bahia_id}":\\s*\\{ "capitania": )(.*?),(\\s*)("gobernacion": )(.*?),(\\s*)("telefono": )(.*?) \\}(,?)$`);
let nLineaMapa = -1, m = null;
for (let i = 0; i < lineasMapa.length; i++) { const x = LINEA.exec(lineasMapa[i]); if (x) { if (nLineaMapa !== -1) abortar(`la bahia ${C.bahia_id} aparece en mas de una linea`); nLineaMapa = i; m = x; } }
if (nLineaMapa === -1) abortar(`la linea de la bahia ${C.bahia_id} no calza el parser estructural`);
if (JSON.parse(m[5]) !== C.valor_actual_esperado) abortar(`la linea de la bahia ${C.bahia_id} no trae el valor esperado en \`gobernacion\``);

// Se conservan las columnas: el relleno de la columna que cambia absorbe la
// diferencia de largo; las otras no se mueven.
const litNuevo = JSON.stringify(C.valor_nuevo);
const padGob = ' '.repeat(Math.max(1, m[6].length + (m[5].length - litNuevo.length)));
const lineaNueva = `${m[1]}${m[2]},${m[3]}${m[4]}${litNuevo},${padGob}${m[7]}${m[8]} }${m[9]}`;
const lineasMapa2 = lineasMapa.slice();
lineasMapa2[nLineaMapa] = lineaNueva;

let distintasMapa = 0;
for (let i = 0; i < lineasMapa.length; i++) if (lineasMapa2[i] !== lineasMapa[i]) { distintasMapa++; if (i !== nLineaMapa) abortar(`la linea ${i + 1} del mapa cambio y no es la de la bahia ${C.bahia_id}`); }
if (distintasMapa !== 1) abortar(`cambiaron ${distintasMapa} lineas del mapa y tenia que cambiar 1`);
const textoMapa2 = lineasMapa2.join(EOL_M);
const mapaJson2 = JSON.parse(textoMapa2);
let fueraMapa = 0;
for (const k of Object.keys(mapaJson)) {
  if (k === String(C.bahia_id)) continue;
  fueraMapa++;
  if (JSON.stringify(mapaJson[k]) !== JSON.stringify(mapaJson2[k])) abortar(`la entrada ${k} del mapa cambio y no es la de la pieza`);
}
if (mapaJson2[String(C.bahia_id)].capitania !== eBahia.capitania) abortar(`la bahia ${C.bahia_id} cambio su \`capitania\`, que esta pieza no toca`);
if (mapaJson2[String(C.bahia_id)].telefono !== eBahia.telefono) abortar(`la bahia ${C.bahia_id} cambio su \`telefono\`, que esta pieza no toca`);
L('');
L(`  MAPA — linea ${nLineaMapa + 1}, 1 de ${lineasMapa.length}`);
L(`      antes  : ${lineasMapa[nLineaMapa].trim()}`);
L(`      despues: ${lineaNueva.trim()}`);
L(`      entradas fuera de la pieza comprobadas identicas : ${fueraMapa}`);
L(`      \`capitania\` y \`telefono\` de la bahia ${C.bahia_id}: sin cambios`);

// ── escritura de zonas_aviso, por linea ──────────────────────────────────────
// Se localiza el bloque de la zona por su `jurisdiccion_id`, se borra el bloque
// `discrepancias_declaradas` completo contando corchetes, y se inserta la nota
// nueva DESPUES de la ultima linea del contacto. Nada mas del archivo se toca.
function bloqueDeLaZona(lineas, zonaId) {
  const iZona = lineas.findIndex(l => l.includes(`"jurisdiccion_id": "${zonaId}"`));
  if (iZona === -1) return null;
  return iZona;
}
const iZona = bloqueDeLaZona(lineasZa, R.zona);
if (iZona === -1 || iZona === null) abortar(`no se encontro la linea de la zona '${R.zona}' en ${P_ZA}`);

let iDD = -1;
for (let i = iZona; i < lineasZa.length; i++) {
  if (/"jurisdiccion_id":/.test(lineasZa[i]) && i !== iZona) break;
  if (/"discrepancias_declaradas":\s*\[/.test(lineasZa[i])) { iDD = i; break; }
}
if (iDD === -1) abortar(`no se encontro la linea de \`discrepancias_declaradas\` dentro de la zona '${R.zona}'`);
let prof = 0, iFin = -1;
for (let i = iDD; i < lineasZa.length; i++) {
  for (const ch of lineasZa[i]) { if (ch === '[') prof++; else if (ch === ']') prof--; }
  if (prof === 0) { iFin = i; break; }
}
if (iFin === -1) abortar(`no se encontro el cierre de \`discrepancias_declaradas\` en la zona '${R.zona}'`);

const iNotaAncla = (() => {
  for (let i = iFin + 1; i < lineasZa.length; i++) {
    if (/^\s*\},?\s*$/.test(lineasZa[i])) return i - 1;   // fin del objeto `contacto`
    if (/"jurisdiccion_id":/.test(lineasZa[i])) break;
  }
  return -1;
})();
if (iNotaAncla === -1) abortar(`no se encontro el final del objeto \`contacto\` de la zona '${R.zona}'`);

const sangria = (lineasZa[iNotaAncla].match(/^\s*/) || [''])[0];
const lineaNota = `${sangria}${JSON.stringify(R.clave_nota)}: ${JSON.stringify(R.nota)}`;

const lineasZa2 = [];
for (let i = 0; i < lineasZa.length; i++) {
  if (i >= iDD && i <= iFin) continue;                       // se borra el bloque
  lineasZa2.push(lineasZa[i]);
  if (i === iNotaAncla) {
    // la linea ancla es la ultima del contacto: le falta la coma para que siga otra
    lineasZa2[lineasZa2.length - 1] = lineasZa2[lineasZa2.length - 1].replace(/,?\s*$/, ',');
    lineasZa2.push(lineaNota);
  }
}
const textoZa2 = lineasZa2.join(EOL_Z);
let zaJson2;
try { zaJson2 = JSON.parse(textoZa2); } catch (e) { abortar(`${P_ZA} resultante no es JSON valido: ${e.message}`); }

// Todo lo que no es el contacto de esa zona tiene que quedar identico.
if (zaJson2.zonas.length !== zaJson.zonas.length) abortar(`${P_ZA} cambio su cantidad de zonas`);
let fueraZa = 0;
for (let i = 0; i < zaJson.zonas.length; i++) {
  const a = zaJson.zonas[i], b = zaJson2.zonas[i];
  if (a.jurisdiccion_id !== R.zona) { fueraZa++; if (JSON.stringify(a) !== JSON.stringify(b)) abortar(`la zona '${a.jurisdiccion_id}' cambio y no es la de la pieza`); continue; }
  if (JSON.stringify({ ...a, contacto: null }) !== JSON.stringify({ ...b, contacto: null })) abortar(`la zona '${R.zona}' cambio fuera de su \`contacto\``);
}
for (const k of Object.keys(zaJson)) {
  if (k === 'zonas') continue;
  if (JSON.stringify(zaJson[k]) !== JSON.stringify(zaJson2[k])) abortar(`${P_ZA} cambio la clave de nivel raiz '${k}', que esta pieza no toca`);
}
const cA = zaJson.zonas.find(z => z.jurisdiccion_id === R.zona).contacto;
const cB = zaJson2.zonas.find(z => z.jurisdiccion_id === R.zona).contacto;
const quitadas = Object.keys(cA).filter(k => !(k in cB));
const agregadas = Object.keys(cB).filter(k => !(k in cA));
const cambiadas = Object.keys(cA).filter(k => k in cB && JSON.stringify(cA[k]) !== JSON.stringify(cB[k]));
if (quitadas.join(',') !== 'discrepancias_declaradas') abortar(`se quitaron las claves [${quitadas}] del contacto y solo se quita \`discrepancias_declaradas\``);
if (agregadas.join(',') !== R.clave_nota) abortar(`se agregaron las claves [${agregadas}] y solo se agrega '${R.clave_nota}'`);
if (cambiadas.length !== 0) abortar(`cambiaron las claves [${cambiadas}] del contacto, y esta pieza no cambia ninguna existente`);
L('');
L(`  ${P_ZA} — zona '${R.zona}'`);
L(`      sha256 ANTES : ${sha(P_ZA)}`);
L(`      lineas borradas : ${iFin - iDD + 1} (el bloque \`discrepancias_declaradas\`, lineas ${iDD + 1}-${iFin + 1})`);
L(`      lineas agregadas: 1 ('${R.clave_nota}')`);
L(`      claves quitadas : ${quitadas.join(', ')}`);
L(`      claves agregadas: ${agregadas.join(', ')}`);
L(`      claves cambiadas: ${cambiadas.length}`);
L(`      zonas fuera de la pieza comprobadas identicas : ${fueraZa}`);
L(`      la \`nota_2026-08-16\` sigue en el contacto: ${Object.prototype.hasOwnProperty.call(cB, 'nota_2026-08-16')}`);

if (DRY) {
  L('');
  L('  --dry-run: NO se escribio nada.');
  L('================================================================================');
  process.exit(0);
}

// ── se escriben LOS DOS, y se comprueba que la carga pasa ────────────────────
respaldar();
fs.writeFileSync(abs(P_MAPA), textoMapa2, { encoding: 'utf8' });
fs.writeFileSync(abs(P_ZA), textoZa2, { encoding: 'utf8' });
L('');
L('  ESCRITOS LOS DOS ARCHIVOS');
L(`      ${P_MAPA}  sha256 DESPUES : ${sha(P_MAPA)}`);
L(`      ${P_ZA}    sha256 DESPUES : ${sha(P_ZA)}`);

// La carga real, en proceso aparte: el modulo cachea y medirla en este proceso
// mediria el cache. Si no pasa, se revierten LOS DOS: el estado intermedio no
// es un paso valido.
const codigo = `
  try {
    const { cargarZonasAviso } = require(${JSON.stringify(abs('src/services/zonas-aviso.js'))});
    const r = cargarZonasAviso({ recargar: true });
    const z = r.zonas.find(x => x.jurisdiccion_id === ${JSON.stringify(R.zona)});
    console.log('OK ' + JSON.stringify(z.contacto.discrepancias));
  } catch (e) { console.log('FALLA ' + String(e.message).replace(/\\r?\\n/g, ' ')); }`;
const r = spawnSync(process.execPath, ['-e', codigo], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
const salida = ((r.stdout || '') + (r.stderr || '')).trim();
L('');
L('  LA CARGA REAL, despues de escribir:');
L(`      ${salida.split('\n')[0]}`);
if (!salida.startsWith('OK'))
  abortar(`la carga de zonas de aviso NO pasa despues de escribir: ${salida}`, true);
L('      la carga PASA y la zona ya no arrastra discrepancias declaradas.');
L('================================================================================');
