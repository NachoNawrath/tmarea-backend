'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_niveles_telefono.js — DE QUE NIVEL ES CADA TELEFONO DEL MAPA
//
// Mide, sobre `src/data/bahia-capitania-map.json` en el commit `01bf543`, a que
// NIVEL pertenece el numero de cada una de las 164 entradas: Capitania,
// Gobernacion, las dos, ninguna, o null. Es el insumo de la correccion de
// `CONTRATO_MOTOR.md` §5.1, que declara que los 164 son de Gobernacion.
//
// POR QUE NO ALCANZA CON EL INSTRUMENTO DEL 2026-08-15
//   `_bitacoras/auditoria_rotulos_2026-08-15/02_medir_pantalla.js` ya mide UNA
//   de las cuatro casillas —"cuyo numero es de una CAPITANIA del CSV"— y su
//   cifra se REUSA aca sin tocarla, con el mismo desarmado del CSV para que sea
//   la misma cifra. Lo que ese instrumento NO hace es partir el resto: agrupa
//   todo lo demas en "Gobernacion u otro", en una sola casilla, y no cuenta
//   nulls. §5.1 afirma exactamente sobre esa casilla, asi que hay que abrirla.
//   Lo que se agrega aca es el universo del nivel GOBERNACION y la particion
//   completa; lo que ya estaba medido no se vuelve a medir de otra manera.
//
// EL UNIVERSO DE CADA NIVEL, Y SUS LIMITES — declarados, no supuestos
//   CAPITANIA   : los telefonos de `capitanias_64_final.csv`, desarmados igual
//                 que en el instrumento del 08-15 (se parte por `ó` y `/`, se
//                 dejan solo los digitos, minimo 8). No es autoridad sobre la
//                 vigencia del contacto: es un indice.
//   GOBERNACION : la tabla hardcodeada de `src/utils/capitanias.js`
//                 —14 Gobernaciones + Hanga Roa— MAS el numero de la GM
//                 Antartica Chilena recuperado en
//                 `_bitacoras/frente_contacto_2026-08-13/`.
//                 **§5.1 declara que esa tabla NO ES FUENTE**, y aca no se usa
//                 como fuente: se usa como INDICE para preguntar de quien es un
//                 numero, que es el mismo papel que cumple el CSV. Sus limites,
//                 escritos porque cambian la lectura: tres de sus valores estan
//                 desactualizados contra DIRECTEMAR (Arica, Talcahuano, Puerto
//                 Montt, §5.1) y le falta la Antartica, que por eso se agrega
//                 aparte. Un numero de Gobernacion que no este en ese indice
//                 cae en "ninguna", no en "Gobernacion".
//
// LAS CASILLAS SON CINCO Y NO CUATRO, y la quinta es el hallazgo: un numero
// puede estar en LOS DOS universos. Meterlo en uno solo seria elegir en
// silencio. La suma de las cinco tiene que dar 164 y el instrumento aborta si
// no da.
//
// NO ESCRIBE NINGUN ARCHIVO.
// Corrida:  node _bitacoras/contrato_51_telefonos_2026-08-16/01_medir_niveles_telefono.js
// Shell declarada (CLAUDE.md §7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');

const ABORTOS = [];
const ANCLA  = '01bf543341b53f0a54b719952dbea494c75ef0b2';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_CSV  = '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv';
const P_CAP  = 'src/utils/capitanias.js';
const P_SB   = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER  = 'data/contacto/reparticiones_publicadas.json';

// Recuperado y verificado en `_bitacoras/frente_contacto_2026-08-13/
// gm_antartica_chilena_RECUPERADO.md`. DIRECTEMAR publica ESE MISMO numero para
// la Gobernacion Maritima Antartica Chilena Y para sus dos Capitanias, asi que
// es un numero que NO distingue el nivel — y por eso la casilla "en los dos"
// existe.
const TEL_GM_ANTARTICA = '+56 32 2208557';

const digitos = t => String(t).replace(/[^0-9]/g, '');

L('================================================================================');
L('DE QUE NIVEL ES CADA TELEFONO DEL MAPA — insumo de la correccion de §5.1');
L(`Ancla: commit fijo ${ANCLA}`);
L('NO escribe ningun archivo.');
L('================================================================================');

// ── insumos ──────────────────────────────────────────────────────────────────
L('');
L('=== INSUMOS, con sha256 del archivo en disco ===');
for (const p of [P_CSV, P_CAP, P_SB, P_DER]) L(`  ${p.padEnd(62)} ${sha(p)}`);

// El mapa sale del ANCLA y no del disco: asi la cifra que la declaracion cite
// queda atada a un commit y no a lo que haya en el disco de alguien.
const textoMapa = execFileSync('git', ['show', `${ANCLA}:${P_MAPA}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' })
  .replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const mapa = JSON.parse(textoMapa);
L(`  ${(P_MAPA + '  [del ancla, en CRLF]').padEnd(62)} ${crypto.createHash('sha256').update(Buffer.from(textoMapa, 'utf8')).digest('hex')}`);

// ── universo CAPITANIA: el CSV, con el desarmado del 08-15 ───────────────────
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
const U_CAPITANIA = new Map();
for (const l of csvLin.slice(1)) {
  const f = parseCsvLinea(l);
  for (const t of String(f[iTel]).split(/ó|\//)) {
    const d = digitos(t);
    if (d.length >= 8) U_CAPITANIA.set(d, f[iCap]);
  }
}

// ── universo GOBERNACION: la tabla hardcodeada, leida del archivo ────────────
// Se lee del ARCHIVO y no se transcribe a mano: una copia pegada aca envejece
// en silencio el dia que alguien toque la tabla, que es el modo de falla que
// esta misma sesion esta corrigiendo.
const capTxt = fs.readFileSync(abs(P_CAP), 'utf8');
const U_GOBERNACION = new Map();
for (const m of capTxt.matchAll(/nombre:\s*'([^']+)'[^}]*?tel:\s*'([^']+)'/g))
  U_GOBERNACION.set(digitos(m[2]), m[1]);
U_GOBERNACION.set(digitos(TEL_GM_ANTARTICA), 'Antártica Chilena (recuperada, fuera de la tabla)');

L('');
L('=== LOS DOS UNIVERSOS ===');
L(`  CAPITANIA   : ${U_CAPITANIA.size} numeros distintos, de ${csvLin.length - 1} filas del CSV`);
L(`  GOBERNACION : ${U_GOBERNACION.size} numeros distintos`);
L(`      leidos de ${P_CAP} : ${U_GOBERNACION.size - 1}`);
L(`      mas la GM Antartica Chilena, recuperada aparte : 1 (${TEL_GM_ANTARTICA})`);
if (U_CAPITANIA.size === 0 || U_GOBERNACION.size === 0) ABORTOS.push('algun universo quedo vacio');

const enLosDos = [...U_CAPITANIA.keys()].filter(d => U_GOBERNACION.has(d));
L(`  numeros que estan en LOS DOS universos : ${enLosDos.length}`);
for (const d of enLosDos) L(`      ${d}  -> Capitania "${U_CAPITANIA.get(d)}"  ·  Gobernacion "${U_GOBERNACION.get(d)}"`);

// ── la particion ─────────────────────────────────────────────────────────────
L('');
L('=== LA PARTICION DE LAS 164 ENTRADAS ===');
const casillas = { nulo: [], soloCap: [], soloGob: [], ambos: [], ninguna: [] };
const claves = Object.keys(mapa);
for (const k of claves) {
  const t = mapa[k].telefono;
  if (t === null || t === undefined || String(t).trim() === '') { casillas.nulo.push(k); continue; }
  const d = digitos(t);
  const c = U_CAPITANIA.has(d), g = U_GOBERNACION.has(d);
  if (c && g) casillas.ambos.push(k);
  else if (c) casillas.soloCap.push(k);
  else if (g) casillas.soloGob.push(k);
  else casillas.ninguna.push(k);
}
const suma = casillas.nulo.length + casillas.soloCap.length + casillas.soloGob.length + casillas.ambos.length + casillas.ninguna.length;

L(`  DENOMINADOR DECLARADO : ${claves.length} entradas del mapa. Todas tienen la clave`);
L('  `telefono`; la casilla "null" cuenta las que la traen en null o vacia.');
L('');
L(`    de una CAPITANIA y no de una Gobernacion   : ${String(casillas.soloCap.length).padStart(3)}`);
L(`    de una GOBERNACION y no de una Capitania   : ${String(casillas.soloGob.length).padStart(3)}`);
L(`    en LOS DOS universos (no distingue nivel)  : ${String(casillas.ambos.length).padStart(3)}`);
L(`    en NINGUNO de los dos                      : ${String(casillas.ninguna.length).padStart(3)}`);
L(`    telefono null o vacio                      : ${String(casillas.nulo.length).padStart(3)}`);
L(`    ${'-'.repeat(46)}`);
L(`    SUMA                                       : ${String(suma).padStart(3)}  de ${claves.length}`);
if (suma !== claves.length) ABORTOS.push(`la particion suma ${suma} y las entradas son ${claves.length}`);
if (claves.length === 0) ABORTOS.push('cero entradas: no hay nada que particionar');

L('');
L('  COMPARACIONES EFECTIVAS (entradas clasificadas) : ' + suma);

// detalle de las casillas chicas
L('');
L('  DETALLE de las casillas que no son masivas:');
L(`    en LOS DOS : ${casillas.ambos.join(', ') || '(ninguna)'}`);
for (const k of casillas.ambos) {
  const d = digitos(mapa[k].telefono);
  L(`        ${String(k).padStart(3)}  ${mapa[k].telefono}  -> Capitania "${U_CAPITANIA.get(d)}" y Gobernacion "${U_GOBERNACION.get(d)}"`);
}
L(`    en NINGUNO : ${casillas.ninguna.length} entradas`);
const porNumNinguna = new Map();
for (const k of casillas.ninguna) {
  const t = mapa[k].telefono;
  if (!porNumNinguna.has(t)) porNumNinguna.set(t, []);
  porNumNinguna.get(t).push(k);
}
for (const [t, ks] of [...porNumNinguna].sort((a, b) => b[1].length - a[1].length))
  L(`        ${String(t).padEnd(18)} ${String(ks.length).padStart(3)} entradas`);
L(`    null : ${casillas.nulo.join(', ') || '(ninguna)'}`);

// ── lo que §5.1 afirma, punto por punto ──────────────────────────────────────
L('');
L('=== LO QUE §5.1 AFIRMA, CONTRASTADO ===');
const distintos = new Set(claves.filter(k => mapa[k].telefono).map(k => digitos(mapa[k].telefono)));
L(`  "son 15 valores distintos, uno por Gobernacion"`);
L(`      MEDIDO: ${distintos.size} valores distintos entre las ${claves.length - casillas.nulo.length} entradas con telefono.`);
L(`  "el mismo telefono se repite en promedio 11 veces"`);
L(`      MEDIDO: ${((claves.length - casillas.nulo.length) / distintos.size).toFixed(1)} veces en promedio.`);
L(`  "los 164 telefonos son de Gobernacion, sin una sola excepcion"`);
L(`      MEDIDO: ${casillas.soloGob.length} lo son sin ambiguedad; ${casillas.soloCap.length} son de una Capitania y no de una Gobernacion.`);
L(`  "ninguno es de una Capitania"`);
L(`      MEDIDO: ${casillas.soloCap.length + casillas.ambos.length} numeros figuran en el indice de Capitanias.`);

// la afirmacion de los tres numeros desactualizados
L('');
L('  "tres de sus valores estan desactualizados ... alimentan 41 de las 164 entradas"');
const TRES = ['+56 58 220 6402', '+56 41 226 6100', '+56 65 256 1100'];
let sumaTres = 0;
for (const t of TRES) {
  const n = claves.filter(k => digitos(mapa[k].telefono) === digitos(t)).length;
  sumaTres += n;
  L(`      ${t.padEnd(18)} -> ${n} entradas del mapa lo llevan`);
}
L(`      MEDIDO: los tres juntos alimentan ${sumaTres} entradas, no 41.`);

// ── la bahia 129 ─────────────────────────────────────────────────────────────
L('');
L('=== LA BAHIA 129 — nombre y CdReparticion, nada mas ===');
const sbRaw = JSON.parse(fs.readFileSync(abs(P_SB), 'utf8'));
const sbArr = Array.isArray(sbRaw) ? sbRaw : sbRaw.recordsets[0];
if (!Array.isArray(sbArr) || sbArr.length === 0) ABORTOS.push(`${P_SB} no trae registros`);
const reg129 = sbArr.find(r => String(r.IDBahia) === '129');
const der = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8')).reparticiones;
if (!reg129) {
  L('  SITPORT no trae la bahia 129 en consultaBahias.');
  ABORTOS.push('la 129 no esta en la captura de SITPORT');
} else {
  const cd = Number(reg129.CdReparticion);
  const r = der[String(cd)];
  // El campo de nombre en `consultaBahias` se llama `NMBahia`. Los campos del
  // registro se listan tal cual para que no haya que adivinar cual es cual.
  L(`  campos del registro de SITPORT                 : ${Object.keys(reg129).join(', ')}`);
  L(`  nombre de la bahia en SITPORT (\`NMBahia\`)      : ${JSON.stringify(reg129.NMBahia)}`);
  L(`  CdReparticion                                  : ${cd}`);
  L(`  esa reparticion, en el derivado                : ${r ? JSON.stringify(r.nombre_publicado) + '  (CSV: ' + JSON.stringify(r.nombre_sitport) + ')' : '(no esta en el derivado)'}`);
  L(`  lo que el mapa dice hoy para la 129            : capitania=${JSON.stringify(mapa['129'].capitania)} · gobernacion=${JSON.stringify(mapa['129'].gobernacion)} · telefono=${JSON.stringify(mapa['129'].telefono)}`);
  L('');
  L('  Nada mas sobre la 129 en esta medicion: la eleccion de fuente entre el mapa');
  L('  y el decreto es normativa y es del owner.');
}

L('');
L('================================================================================');
if (ABORTOS.length) { L('ABORTA — ' + ABORTOS.join(' · ')); L('================================================================================'); process.exit(3); }
L('MEDICION COMPLETA. Ningun archivo fue escrito.');
L('================================================================================');
