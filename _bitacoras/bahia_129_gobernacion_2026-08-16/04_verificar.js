'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 04_verificar.js — VERIFICACION DE LA PIEZA DE LA BAHIA 129
//
// ANCLADA AL COMMIT FIJO `4529b67`, no a HEAD. Un verificador que se compare
// contra HEAD deja de medir esta pieza en cuanto alguien commitea encima.
//
// COMPARA LINEA A LINEA y no por bytes del archivo entero: `core.autocrlf=true`
// deja el blob en LF y el mapa en disco en CRLF, asi que el archivo completo
// nunca daria el mismo sha. Lo que se compara es el CONTENIDO de cada linea.
//
// Corrida:  node _bitacoras/bahia_129_gobernacion_2026-08-16/04_verificar.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// NO ESCRIBE NADA. exit 0 si todo pasa, 1 si algo falla, 3 si no pudo medir.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);

const ANCLA  = '4529b67c37cce15adc4a2b123b5c7d91fa31e00d';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_ZA   = 'data/decreto/zonas_aviso.json';
const P_JUR  = 'data/decreto/jurisdicciones_v2.json';
const P_DECL = 'data/contacto/correcciones_gobernacion.json';
const ID     = 'bahia_129_gobernacion';

const FALLAS = [], NO_MEDIBLE = [];
const fallar = m => FALLAS.push(m);

L('================================================================================');
L(`VERIFICACION — BAHIA 129. Ancla: commit fijo ${ANCLA}`);
L('================================================================================');

const blob = p => execFileSync('git', ['show', `${ANCLA}:${p}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' });
let mapaViejoTxt, zaViejoTxt;
try { mapaViejoTxt = blob(P_MAPA); zaViejoTxt = blob(P_ZA); }
catch (e) { NO_MEDIBLE.push(`no se pudo leer el arbol de ${ANCLA} — ${e.message}`); }

if (NO_MEDIBLE.length) { L(''); L('NO SE PUDO MEDIR — ' + NO_MEDIBLE.join(' · ')); L('Esto NO es "paso".'); process.exit(3); }

const mapaHoyTxt = fs.readFileSync(abs(P_MAPA), 'utf8');
const zaHoyTxt   = fs.readFileSync(abs(P_ZA), 'utf8');
const mapaViejo = JSON.parse(mapaViejoTxt), mapaHoy = JSON.parse(mapaHoyTxt);
const zaViejo   = JSON.parse(zaViejoTxt),   zaHoy   = JSON.parse(zaHoyTxt);
const jur = JSON.parse(fs.readFileSync(abs(P_JUR), 'utf8'));

// La pieza se lee de su declaracion, no se transcribe: un verificador que
// hardcodee la bahia mide otra cosa el dia que la declaracion cambie.
const decl = JSON.parse(fs.readFileSync(abs(P_DECL), 'utf8'));
const C = decl.correcciones.find(x => x.id === ID);
if (!C) { L(`NO SE PUDO MEDIR — ${P_DECL} no declara "${ID}"`); process.exit(3); }
const BAHIA = String(C.bahia_id), ZONA = C.retirar_discrepancia_declarada.zona, CLAVE_NOTA = C.retirar_discrepancia_declarada.clave_nota;

L('');
L(`  pieza declarada : bahia ${BAHIA} · campo ${C.campo} · ${C.valor_actual_esperado} -> ${C.valor_nuevo} · zona '${ZONA}'`);
L(`  entradas en el ancla : ${Object.keys(mapaViejo).length} · hoy : ${Object.keys(mapaHoy).length}`);
L(`  zonas en el ancla    : ${zaViejo.zonas.length} · hoy : ${zaHoy.zonas.length}`);

// ── V1 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V1 — la `gobernacion` de la bahia de la pieza es la del DECRETO ===');
const zonaHoy = zaHoy.zonas.find(z => z.contacto && String(z.contacto.bahia_id) === BAHIA);
if (!zonaHoy) { NO_MEDIBLE.push('V1: ninguna zona declara esa bahia'); }
const jj = zonaHoy ? jur.jurisdicciones.find(x => x.id === zonaHoy.jurisdiccion_id) : null;
if (!jj) NO_MEDIBLE.push('V1: el decreto no trae esa jurisdiccion');
else {
  L(`  mapa    : ${JSON.stringify(mapaHoy[BAHIA].gobernacion)}`);
  L(`  decreto : ${JSON.stringify(jj.gobernacion)}   (jurisdiccion '${zonaHoy.jurisdiccion_id}')`);
  L('  COMPARACIONES EFECTIVAS : 1');
  if (normalizarTexto(mapaHoy[BAHIA].gobernacion) !== normalizarTexto(jj.gobernacion))
    fallar(`V1: la bahia ${BAHIA} dice ${JSON.stringify(mapaHoy[BAHIA].gobernacion)} y el decreto ${JSON.stringify(jj.gobernacion)}`);
  if (mapaHoy[BAHIA].gobernacion !== C.valor_nuevo)
    fallar(`V1: la bahia ${BAHIA} no quedo con el \`valor_nuevo\` declarado ${JSON.stringify(C.valor_nuevo)}`);
}

// ── V2 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V2 — `capitania` y `telefono` de esa bahia, SIN TOCAR contra el ancla ===');
L(`  capitania  ancla=${JSON.stringify(mapaViejo[BAHIA].capitania)}  hoy=${JSON.stringify(mapaHoy[BAHIA].capitania)}`);
L(`  telefono   ancla=${JSON.stringify(mapaViejo[BAHIA].telefono)}  hoy=${JSON.stringify(mapaHoy[BAHIA].telefono)}`);
L('  COMPARACIONES EFECTIVAS : 2');
if (mapaViejo[BAHIA].capitania !== mapaHoy[BAHIA].capitania) fallar(`V2: cambio \`capitania\` de la bahia ${BAHIA}`);
if (mapaViejo[BAHIA].telefono !== mapaHoy[BAHIA].telefono) fallar(`V2: cambio \`telefono\` de la bahia ${BAHIA}`);

// ── V3 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V3 — las entradas del mapa que NO son la pieza, IDENTICAS contra el ancla ===');
L('  Identicas caracter por caracter DENTRO de la linea, y ademas como valor JSON.');
L('  El terminador de linea no se compara: es propiedad del repositorio.');
const lineasMapaViejo = mapaViejoTxt.split(/\r\n|\n/), lineasMapaHoy = mapaHoyTxt.split(/\r\n|\n/);
const lineaDe = (ls, id) => ls.find(l => new RegExp(`^\\s*"${id}":`).test(l));
let v3 = 0, difL = [], difV = [];
for (const k of Object.keys(mapaViejo)) {
  if (k === BAHIA) continue;
  v3++;
  const a = lineaDe(lineasMapaViejo, k), b = lineaDe(lineasMapaHoy, k);
  if (a === undefined || b === undefined) { difL.push(`${k}(sin linea)`); continue; }
  if (a !== b) difL.push(k);
  if (JSON.stringify(mapaViejo[k]) !== JSON.stringify(mapaHoy[k])) difV.push(k);
}
L(`  COMPARACIONES EFECTIVAS : ${v3}`);
if (v3 === 0) NO_MEDIBLE.push('V3 con cero comparaciones');
L(`  con la LINEA distinta : ${difL.length}${difL.length ? ' -> ' + difL.join(', ') : ''}`);
L(`  con el VALOR distinto : ${difV.length}${difV.length ? ' -> ' + difV.join(', ') : ''}`);
if (difL.length) fallar(`V3: ${difL.length} entradas fuera de la pieza cambiaron su linea: ${difL.join(', ')}`);
if (difV.length) fallar(`V3: ${difV.length} entradas fuera de la pieza cambiaron su valor: ${difV.join(', ')}`);
if (Object.keys(mapaViejo).join(',') !== Object.keys(mapaHoy).join(',')) fallar('V3: el conjunto o el orden de las claves del mapa cambio');

// ── V4 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V4 — CERO telefonos no atomicos en TODO el mapa (INV-10.1) ===');
const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);
let v4 = 0; const noAtom = [];
for (const k of Object.keys(mapaHoy)) { v4++; if (mapaHoy[k].telefono != null && !esAtomico(mapaHoy[k].telefono)) noAtom.push(k); }
L(`  COMPARACIONES EFECTIVAS : ${v4}`);
L(`  no atomicos : ${noAtom.length}${noAtom.length ? ' -> ' + noAtom.join(', ') : ''}`);
if (noAtom.length) fallar(`V4: ${noAtom.length} telefonos no atomicos`);

// ── V5 ───────────────────────────────────────────────────────────────────────
L('');
L(`=== V5 — el contacto de la zona '${ZONA}': que se quito, que se agrego, que quedo ===`);
const cA = zaViejo.zonas.find(z => z.jurisdiccion_id === ZONA).contacto;
const cB = zaHoy.zonas.find(z => z.jurisdiccion_id === ZONA).contacto;
const quitadas = Object.keys(cA).filter(k => !(k in cB));
const agregadas = Object.keys(cB).filter(k => !(k in cA));
const cambiadas = Object.keys(cA).filter(k => k in cB && JSON.stringify(cA[k]) !== JSON.stringify(cB[k]));
L(`  claves quitadas  : ${quitadas.join(', ') || '(ninguna)'}`);
L(`  claves agregadas : ${agregadas.join(', ') || '(ninguna)'}`);
L(`  claves cambiadas : ${cambiadas.join(', ') || '(ninguna)'}`);
L(`  ¿sigue la \`nota_2026-08-16\` original, sin tocar? ${Object.prototype.hasOwnProperty.call(cB, 'nota_2026-08-16') && cA['nota_2026-08-16'] === cB['nota_2026-08-16']}`);
L('  COMPARACIONES EFECTIVAS (claves del contacto, union) : ' + new Set([...Object.keys(cA), ...Object.keys(cB)]).size);
if (quitadas.join(',') !== 'discrepancias_declaradas') fallar(`V5: se quitaron [${quitadas}] y solo se quita \`discrepancias_declaradas\``);
if (agregadas.join(',') !== CLAVE_NOTA) fallar(`V5: se agregaron [${agregadas}] y solo se agrega '${CLAVE_NOTA}'`);
if (cambiadas.length) fallar(`V5: cambiaron [${cambiadas}], y esta pieza no cambia ninguna clave existente`);
if (cA['nota_2026-08-16'] !== cB['nota_2026-08-16']) fallar('V5: la `nota_2026-08-16` original se toco');

// ── V6 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V6 — el resto de `zonas_aviso.json`, IDENTICO contra el ancla ===');
let v6 = 0; const difZ = [];
for (let i = 0; i < zaViejo.zonas.length; i++) {
  const a = zaViejo.zonas[i], b = zaHoy.zonas[i];
  if (a.jurisdiccion_id === ZONA) {
    // de la zona de la pieza se compara TODO menos su `contacto`, que V5 ya midio
    if (JSON.stringify({ ...a, contacto: null }) !== JSON.stringify({ ...b, contacto: null })) difZ.push(`${a.jurisdiccion_id}(fuera del contacto)`);
    continue;
  }
  v6++;
  if (JSON.stringify(a) !== JSON.stringify(b)) difZ.push(a.jurisdiccion_id);
}
let v6raiz = 0;
for (const k of Object.keys(zaViejo)) {
  if (k === 'zonas') continue;
  v6raiz++;
  if (JSON.stringify(zaViejo[k]) !== JSON.stringify(zaHoy[k])) difZ.push(`raiz:${k}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v6} zonas ajenas + ${v6raiz} claves de raiz + 1 zona de la pieza fuera de su contacto`);
if (v6 === 0) NO_MEDIBLE.push('V6 con cero zonas ajenas comparadas');
L(`  distintas : ${difZ.length}${difZ.length ? ' -> ' + difZ.join(', ') : ''}`);
if (difZ.length) fallar(`V6: ${difZ.length} partes de zonas_aviso.json cambiaron fuera de la pieza: ${difZ.join(', ')}`);

// ── V7 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V7 — la CARGA REAL pasa, y la zona ya no arrastra discrepancias ===');
const codigo = `
  try {
    const { cargarZonasAviso } = require(${JSON.stringify(abs('src/services/zonas-aviso.js'))});
    const r = cargarZonasAviso({ recargar: true });
    const z = r.zonas.find(x => x.jurisdiccion_id === ${JSON.stringify(ZONA)});
    console.log('OK|' + JSON.stringify(z.contacto.discrepancias) + '|' + JSON.stringify(z.contacto.gobernacion || null) + '|' + r.zonas.length);
  } catch (e) { console.log('FALLA|' + String(e.message).replace(/\\r?\\n/g, ' ')); }`;
const rr = spawnSync(process.execPath, ['-e', codigo], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
const sal = ((rr.stdout || '') + (rr.stderr || '')).trim().split('\n')[0];
L(`  ${sal}`);
L('  COMPARACIONES EFECTIVAS : 1 (una carga completa)');
if (!sal.startsWith('OK')) fallar(`V7: la carga no pasa — ${sal}`);
else {
  const [, disc, gob, nz] = sal.split('|');
  L(`      discrepancias que viajan : ${disc}`);
  L(`      gobernacion resuelta     : ${gob}`);
  L(`      zonas cargadas           : ${nz}`);
  if (disc !== '[]') fallar(`V7: la zona sigue arrastrando discrepancias: ${disc}`);
  if (Number(nz) !== zaHoy.zonas.length) fallar(`V7: cargaron ${nz} zonas y el archivo tiene ${zaHoy.zonas.length}`);
}

// ── V8 ───────────────────────────────────────────────────────────────────────
L('');
L(`=== V8 — el \`ambito\` de la zona '${ZONA}' no se movio ===`);
const zA = zaViejo.zonas.find(z => z.jurisdiccion_id === ZONA), zB = zaHoy.zonas.find(z => z.jurisdiccion_id === ZONA);
L(`  ambito ancla=${JSON.stringify(zA.ambito)} · hoy=${JSON.stringify(zB.ambito)}`);
L('  COMPARACIONES EFECTIVAS : 1');
L('  Nota: retirada la discrepancia, la zona RECUPERA el derecho a declarar ambito');
L('  (criterio de `bd75c494`). Hoy no cambia nada porque su ambito es null por otro');
L('  motivo — el decreto no le da el limite Norte con coordenadas — y esta pieza no');
L('  se lo declara. Queda como pendiente declarado en la bitacora.');
if (JSON.stringify(zA.ambito) !== JSON.stringify(zB.ambito)) fallar(`V8: el \`ambito\` de '${ZONA}' cambio`);

// ── veredicto ────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
if (NO_MEDIBLE.length) { L('NO SE PUDO MEDIR — ' + NO_MEDIBLE.join(' · ')); L('================================================================================'); process.exit(3); }
if (FALLAS.length) {
  L(`RESULTADO: ${FALLAS.length} falla(s).`);
  for (const f of FALLAS) L('  · ' + f);
  L('================================================================================');
  process.exit(1);
}
L('RESULTADO: V1–V8 en verde.');
L(`  V1 1 · V2 2 · V3 ${v3} · V4 ${v4} · V5 ${new Set([...Object.keys(cA), ...Object.keys(cB)]).size} · V6 ${v6}+${v6raiz} · V7 1 · V8 1`);
L('================================================================================');
process.exit(0);
