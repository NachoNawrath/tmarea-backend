/**
 * FASE 2 — PASO 1: los tres sectores del rio Bueno a `puntos_notables` del v1.
 *
 * Metodo: REEMPLAZO LITERAL DE CADENA sobre el archivo, no parseo + reserializado.
 * `jurisdicciones_capitanias.json` es transcripcion a mano (no lo escribe ningun
 * script); reserializarlo reformatearia el archivo entero y el diff dejaria de
 * ser legible. Se toca solo el trozo que hay que tocar.
 *
 * Preserva el fin de linea del archivo (CRLF en disco, LF en el indice de git).
 *
 * Falla ruidoso (CLAUDE.md §4.1): aborta si el ancla no aparece exactamente una
 * vez, si el resultado no parsea, si el conteo no queda en 72, o si el archivo
 * cambia en algo que no sean las tres entradas nuevas.
 *
 * Shell declarada (§7.3). Para el owner, en PowerShell, desde la raiz:
 *     node _bitacoras\barrido_23_sin_par_2026-08-14\fase2\insertar_rio_bueno.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const V1 = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_capitanias.json');

const NOTA = 'Sector del rio Bueno que el decreto le da a la Capitania de Puerto '
  + 'Lago Ranco. TM-025 A, parrafo de esa Capitania, segun D.S. (M) N 80 del 22 de '
  + 'marzo de 2004, Art. 1 N 7. Localiza el sector; no delimita el cauce.';

// Orden por latitud descendente, que es la convencion de la lista (68/69).
const NUEVOS = [
  { nombre: 'El Manzanito (rio Bueno)', lat_dms: '40 15 06 S', lon_dms: '073 41 01 W', lat: -40.251667, lon: -73.683611 },
  { nombre: 'Los Patos (rio Bueno)', lat_dms: '40 17 03 S', lon_dms: '073 31 43 W', lat: -40.284167, lon: -73.528611 },
  { nombre: 'La Goleta (rio Bueno)', lat_dms: '40 17 13 S', lon_dms: '073 36 52 W', lat: -40.286944, lon: -73.614444 },
];

const abortar = (m) => { console.error('ABORTA (§4.1): ' + m); process.exit(2); };

const antes = fs.readFileSync(V1, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const EOL = antes.includes('\r\n') ? '\r\n' : '\n';

// El ancla es el bloque COMPLETO de `Ribera Sur rio Bueno`, con su cierre, para
// que la insercion caiga inmediatamente despues y en ningun otro lado.
const ANCLA = [
  '    {',
  '      "nombre": "Ribera Sur rio Bueno",',
  '      "lat_dms": "40 14 30 S",',
  '      "lon_dms": null,',
  '      "lat": -40.241667,',
  '      "lon": null',
  '    },',
].join(EOL);

const ocurrencias = antes.split(ANCLA).length - 1;
if (ocurrencias !== 1) abortar(`el ancla aparece ${ocurrencias} veces, se esperaba 1`);

const bloque = (p) => [
  '    {',
  `      "nombre": ${JSON.stringify(p.nombre)},`,
  `      "lat_dms": ${JSON.stringify(p.lat_dms)},`,
  `      "lon_dms": ${JSON.stringify(p.lon_dms)},`,
  `      "lat": ${p.lat},`,
  `      "lon": ${p.lon},`,
  `      "nota": ${JSON.stringify(NOTA)}`,
  '    },',
].join(EOL);

const despues = antes.replace(ANCLA, ANCLA + EOL + NUEVOS.map(bloque).join(EOL));

// ── controles antes de escribir ─────────────────────────────────────────────
let obj;
try { obj = JSON.parse(despues); } catch (e) { abortar('el resultado no parsea como JSON: ' + e.message); }
if (obj.puntos_notables.length !== 72) abortar(`puntos_notables quedo en ${obj.puntos_notables.length}, se esperaba 72`);

const objAntes = JSON.parse(antes);
// Nada fuera de puntos_notables se movio.
for (const k of Object.keys(objAntes)) {
  if (k === 'puntos_notables') continue;
  if (JSON.stringify(objAntes[k]) !== JSON.stringify(obj[k])) abortar(`cambio la clave de primer nivel "${k}", y no debia`);
}
// Las 69 anteriores siguen identicas y en el mismo orden relativo.
const sobrevivientes = obj.puntos_notables.filter((p) => !NUEVOS.some((n) => n.nombre === p.nombre));
if (sobrevivientes.length !== 69) abortar(`sobreviven ${sobrevivientes.length} de las 69 originales`);
for (let i = 0; i < 69; i++) {
  if (JSON.stringify(sobrevivientes[i]) !== JSON.stringify(objAntes.puntos_notables[i])) {
    abortar(`la entrada original ${i} (${objAntes.puntos_notables[i].nombre}) cambio o se movio de orden`);
  }
}
// El orden Norte->Sur en el tramo tocado.
const idx = obj.puntos_notables.findIndex((p) => p.nombre === 'Ribera Sur rio Bueno');
const tramo = obj.puntos_notables.slice(idx, idx + 5).map((p) => p.lat);
for (let i = 1; i < tramo.length; i++) if (tramo[i] > tramo[i - 1]) abortar(`el orden Norte->Sur se rompe en el tramo insertado: ${tramo.join(' -> ')}`);
// El decimal reproduce el DMS (misma regla que usa el resto de la lista).
const dec = (d) => { const [g, m, s, h] = d.split(' '); const v = +g + m / 60 + s / 3600; return /[SW]/.test(h) ? -v : v; };
for (const n of NUEVOS) {
  if (Math.abs(dec(n.lat_dms) - n.lat) > 5e-7) abortar(`${n.nombre}: lat no reproduce su DMS`);
  if (Math.abs(dec(n.lon_dms) - n.lon) > 5e-7) abortar(`${n.nombre}: lon no reproduce su DMS`);
}
// El fin de linea no se mezclo.
const lf = (despues.match(/(?<!\r)\n/g) || []).length;
if (EOL === '\r\n' && lf !== 0) abortar(`quedaron ${lf} saltos LF sueltos en un archivo CRLF`);

fs.writeFileSync(V1, despues);

console.log('PASO 1 OK');
console.log('  archivo        :', path.relative(RAIZ, V1));
console.log('  EOL preservado :', EOL === '\r\n' ? 'CRLF' : 'LF');
console.log('  puntos_notables:', objAntes.puntos_notables.length, '->', obj.puntos_notables.length);
console.log('  sha256 antes   :', sha(antes));
console.log('  sha256 despues :', sha(despues));
console.log('  insertados en  : indices', idx + 1, 'a', idx + 3, '(despues de "Ribera Sur rio Bueno")');
for (const n of NUEVOS) console.log('   +', n.nombre, '|', n.lat_dms, '/', n.lon_dms, '|', n.lat, '/', n.lon);
