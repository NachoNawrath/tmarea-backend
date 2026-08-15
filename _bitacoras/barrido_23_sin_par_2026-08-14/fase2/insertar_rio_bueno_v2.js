/**
 * FASE 2 (bis) — INSERCION QUIRURGICA EN EL v2, aprobada por el owner tras el
 * alto: regenerar el v2 destruye `correccion_testigos`, `convenciones` y 27,6 KB
 * de `jurisdicciones`, que los escribe `fase5_corregir_testigos.py` DESPUES de
 * migrar y que recalcula contra la capa OSM de 925 MB con un umbral del owner.
 *
 * Toca DOS cosas y ninguna mas:
 *   1. `puntos_notables`: los tres sectores del rio Bueno, en la misma posicion
 *      y con el mismo contenido que produce `fase4_migrar_insumo_v2.py`, que no
 *      los calcula sino que copia la lista del v1 (linea 1263).
 *   2. `derivado_de["jurisdicciones_capitanias.json"]`: el sha256 del v1 en
 *      disco, que es lo que la migracion escribiria y lo que el control B0 de
 *      `fase4_auditoria_v2.py` compara.
 *
 * El v2 se serializa con python `json.dump(ensure_ascii=False, indent=1)`: los
 * elementos del arreglo van a 2 espacios y sus claves a 3. Se respeta.
 *
 * Shell declarada (§7.3). Para el owner, en PowerShell, desde la raiz:
 *     node _bitacoras\barrido_23_sin_par_2026-08-14\fase2\insertar_rio_bueno_v2.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const V1 = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_capitanias.json');
const V2 = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json');

const NOMBRES = ['El Manzanito (rio Bueno)', 'Los Patos (rio Bueno)', 'La Goleta (rio Bueno)'];
const abortar = (m) => { console.error('ABORTA (§4.1): ' + m); process.exit(2); };
const sha256Archivo = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const crudoAntes = fs.readFileSync(V2, 'utf8');
const EOL = crudoAntes.includes('\r\n') ? '\r\n' : '\n';
const v1 = JSON.parse(fs.readFileSync(V1, 'utf8'));
const antes = JSON.parse(crudoAntes);

// Los tres se toman DEL v1, no se reescriben aca: si difirieran, no serian la
// copia que la migracion haria (§2, coherencia entre lo que se afirma y lo que
// se mide).
const nuevos = v1.puntos_notables.filter((p) => NOMBRES.includes(p.nombre));
if (nuevos.length !== 3) abortar(`en el v1 hay ${nuevos.length} de los tres sectores, se esperaban 3`);

// ── 1. puntos_notables ───────────────────────────────────────────────────────
const ANCLA = [
  '  {',
  '   "nombre": "Ribera Sur rio Bueno",',
  '   "lat_dms": "40 14 30 S",',
  '   "lon_dms": null,',
  '   "lat": -40.241667,',
  '   "lon": null',
  '  },',
].join(EOL);
if (crudoAntes.split(ANCLA).length - 1 !== 1) abortar('el ancla de puntos_notables no aparece exactamente una vez en el v2');

const bloque = (p) => [
  '  {',
  `   "nombre": ${JSON.stringify(p.nombre)},`,
  `   "lat_dms": ${JSON.stringify(p.lat_dms)},`,
  `   "lon_dms": ${JSON.stringify(p.lon_dms)},`,
  `   "lat": ${p.lat},`,
  `   "lon": ${p.lon},`,
  `   "nota": ${JSON.stringify(p.nota)}`,
  '  },',
].join(EOL);

let crudo = crudoAntes.replace(ANCLA, ANCLA + EOL + nuevos.map(bloque).join(EOL));

// ── 2. derivado_de ───────────────────────────────────────────────────────────
const shaViejo = antes.derivado_de['jurisdicciones_capitanias.json'];
const shaNuevo = sha256Archivo(V1);
if (shaViejo === shaNuevo) abortar('el sha del v1 no cambio: no hay nada que poner al dia');
if (crudo.split(shaViejo).length - 1 !== 1) abortar(`el sha viejo aparece ${crudo.split(shaViejo).length - 1} veces en el v2, se esperaba 1`);
crudo = crudo.replace(shaViejo, shaNuevo);

// ── controles antes de escribir ──────────────────────────────────────────────
let despues;
try { despues = JSON.parse(crudo); } catch (e) { abortar('el resultado no parsea: ' + e.message); }

if (despues.puntos_notables.length !== 76) abortar(`puntos_notables quedo en ${despues.puntos_notables.length}, se esperaba 76`);

// Nada mas de primer nivel se movio.
const ka = Object.keys(antes), kb = Object.keys(despues);
if (ka.join('|') !== kb.join('|')) abortar('cambio el conjunto o el orden de las claves de primer nivel');
for (const k of ka) {
  if (k === 'puntos_notables' || k === 'derivado_de') continue;
  if (JSON.stringify(antes[k]) !== JSON.stringify(despues[k])) abortar(`cambio "${k}", y no debia`);
}
// derivado_de: solo el sha del v1.
for (const k of Object.keys(antes.derivado_de)) {
  const cambio = antes.derivado_de[k] !== despues.derivado_de[k];
  if (k === 'jurisdicciones_capitanias.json' ? !cambio : cambio) abortar(`derivado_de["${k}"] cambio de forma inesperada`);
}
// Las 73 anteriores, identicas y en su orden.
const sobrev = despues.puntos_notables.filter((p) => !NOMBRES.includes(p.nombre));
if (sobrev.length !== 73) abortar(`sobreviven ${sobrev.length} de las 73`);
for (let i = 0; i < 73; i++) {
  if (JSON.stringify(sobrev[i]) !== JSON.stringify(antes.puntos_notables[i])) abortar(`la entrada ${i} (${antes.puntos_notables[i].nombre}) cambio o se movio`);
}
// Los tres son copia EXACTA de los del v1.
for (const n of nuevos) {
  const enV2 = despues.puntos_notables.find((p) => p.nombre === n.nombre);
  if (JSON.stringify(enV2) !== JSON.stringify(n)) abortar(`${n.nombre} no es copia exacta del v1`);
}
// EOL sin mezclar.
const lf = (crudo.match(/(?<!\r)\n/g) || []).length;
if (EOL === '\r\n' && lf !== 0) abortar(`quedaron ${lf} saltos LF sueltos en un archivo CRLF`);

fs.writeFileSync(V2, crudo);

console.log('INSERCION QUIRURGICA EN EL v2 — OK');
console.log('  puntos_notables:', antes.puntos_notables.length, '->', despues.puntos_notables.length);
console.log('  derivado_de[v1]:', shaViejo.slice(0, 16), '->', shaNuevo.slice(0, 16));
console.log('  EOL preservado :', EOL === '\r\n' ? 'CRLF' : 'LF');
console.log('  sha256 v2 antes:', crypto.createHash('sha256').update(Buffer.from(crudoAntes, 'utf8')).digest('hex'));
console.log('  sha256 v2 ahora:', sha256Archivo(V2));
