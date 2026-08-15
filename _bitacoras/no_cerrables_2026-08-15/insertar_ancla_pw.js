/**
 * FASE 2 — el ancla de `puerto_williams`, camino A del owner (2026-08-15).
 *
 * Aplica la convencion `punto_interior` que las otras 51 Capitanias ya traen, con
 * la MISMA forma {lat, lon, origen} y el MISMO texto de origen, literal.
 *
 * SOLO puerto_williams. punta_delgada y tierra_del_fuego esperan a DIRECTEMAR:
 * la pregunta abierta de la bahia 137 es justamente como se reparten esas dos la
 * zona al Oriente de Cabo San Vicente.
 *
 * LA COORDENADA. Sede de la Capitania, colocada a mano igual que las 51, con la
 * precision modal de la lista (2 decimales). Corroborada contra la bahia 138
 * "Puerto Williams" del seed SITPORT (-54.9324 / -67.5968), a 0,3 km — dentro
 * del rango de las 38 marítimas con testigo (minimo 0,2 · mediana 1,8 km).
 * NO se usa la coordenada de la bahia como ancla: ninguna de las 49 sedes cae
 * sobre una bahia SITPORT, el texto declarado dice "Sede de la Capitania" —una
 * bahia no lo es— y un ancla sobre el testigo dejaria la contencion probada por
 * construccion (§4.6). La procedencia va en la bitacora, no en el insumo.
 *
 * LO QUE ESTE CAMBIO NO HACE, medido: no vuelve construible a puerto_williams.
 * `estado_geometria` lo DERIVA la migracion y su campo `revisar` —el hito N 26
 * del Canal Beagle— dispara `no_cerrable` por su cuenta. Lo que cambia es la
 * causa mostrada: deja de decir "no hay ancla" y pasa a decir el bloqueo real.
 *
 * Metodo: reemplazo literal de cadena, no parseo + reserializado. El v1 es
 * transcripcion a mano y reserializarlo reformatearia el archivo entero.
 *
 * Shell declarada (§7.3). Para el owner, en PowerShell, desde la raiz:
 *     node _bitacoras\no_cerrables_2026-08-15\insertar_ancla_pw.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const V1 = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_capitanias.json');

const LAT = -54.93, LON = -67.60;
const ORIGEN = 'CONVENCION, no decreto. Sede de la Capitania. La construccion se queda con el trozo que contiene este punto.';

const abortar = (m) => { console.error('ABORTA (§4.1): ' + m); process.exit(2); };

const antes = fs.readFileSync(V1, 'utf8');
const EOL = antes.includes('\r\n') ? '\r\n' : '\n';
const objAntes = JSON.parse(antes);

// El texto de origen se toma DE OTRA ENTRADA, no se escribe aca: si difiriera en
// un caracter, no seria "el mismo texto que las 51" (§2).
const modelo = objAntes.capitanias.find((c) => c.punto_interior);
if (!modelo) abortar('no hay ninguna entrada con punto_interior de la cual tomar el texto');
if (modelo.punto_interior.origen !== ORIGEN) abortar('el texto de origen del modelo no coincide con el declarado en este script');
const distintos = new Set(objAntes.capitanias.filter((c) => c.punto_interior).map((c) => c.punto_interior.origen));
if (distintos.size !== 1) abortar(`hay ${distintos.size} textos de origen distintos entre las existentes; no hay "el mismo texto"`);

const pw = objAntes.capitanias.find((c) => c.id === 'puerto_williams');
if (!pw) abortar('no esta puerto_williams en capitanias');
if (pw.punto_interior) abortar('puerto_williams YA tiene punto_interior');

// Ancla: la linea completa de `revisar`, que es unica en el archivo. El id no
// sirve de ancla — aparece dos veces, tambien en `gobernaciones`.
const ANCLA = '      "revisar": ' + JSON.stringify(pw.revisar) + ',';
const n = antes.split(ANCLA).length - 1;
if (n !== 1) abortar(`el ancla aparece ${n} veces, se esperaba 1`);

const BLOQUE = [
  '      "punto_interior": {',
  `        "lat": ${LAT},`,
  `        "lon": ${LON},`,
  `        "origen": ${JSON.stringify(ORIGEN)}`,
  '      },',
].join(EOL);

const despues = antes.replace(ANCLA, ANCLA + EOL + BLOQUE);

// ── controles antes de escribir ──────────────────────────────────────────────
let obj;
try { obj = JSON.parse(despues); } catch (e) { abortar('el resultado no parsea: ' + e.message); }

const pw2 = obj.capitanias.find((c) => c.id === 'puerto_williams');
if (!pw2.punto_interior) abortar('no quedo el punto_interior');
if (pw2.punto_interior.lat !== LAT || pw2.punto_interior.lon !== LON) abortar('la coordenada no quedo como se declaro');
if (Buffer.from(pw2.punto_interior.origen, 'utf8').compare(Buffer.from(ORIGEN, 'utf8')) !== 0) abortar('el texto de origen no quedo identico por codepoint');
if (Object.keys(pw2.punto_interior).join(',') !== 'lat,lon,origen') abortar(`la forma quedo {${Object.keys(pw2.punto_interior)}} y las 51 son {lat,lon,origen}`);

// Nada mas se movio: todo el resto del documento, identico.
const conAntes = objAntes.capitanias.filter((c) => c.punto_interior).length;
const conAhora = obj.capitanias.filter((c) => c.punto_interior).length;
if (conAhora !== conAntes + 1) abortar(`punto_interior paso de ${conAntes} a ${conAhora}, se esperaba +1`);
for (const k of Object.keys(objAntes)) {
  if (k === 'capitanias') continue;
  if (JSON.stringify(objAntes[k]) !== JSON.stringify(obj[k])) abortar(`cambio la clave de primer nivel "${k}"`);
}
for (let i = 0; i < objAntes.capitanias.length; i++) {
  const a = objAntes.capitanias[i], b = obj.capitanias[i];
  if (a.id !== b.id) abortar(`se movio el orden de capitanias en el indice ${i}`);
  if (a.id === 'puerto_williams') continue;
  if (JSON.stringify(a) !== JSON.stringify(b)) abortar(`cambio la entrada ${a.id}, y no debia`);
}
// puerto_williams: solo se agrego la clave, en su lugar y sin tocar el resto.
const ka = Object.keys(pw).join(','), kb = Object.keys(pw2).join(',');
if (kb !== ka.replace('revisar,', 'revisar,punto_interior,')) abortar(`el orden de claves quedo "${kb}"`);
for (const k of Object.keys(pw)) {
  if (JSON.stringify(pw[k]) !== JSON.stringify(pw2[k])) abortar(`cambio el campo "${k}" de puerto_williams`);
}
const lf = (despues.match(/(?<!\r)\n/g) || []).length;
if (EOL === '\r\n' && lf !== 0) abortar(`quedaron ${lf} saltos LF sueltos en un archivo CRLF`);

fs.writeFileSync(V1, despues);
const sha = (s) => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
console.log('ANCLA DE puerto_williams — ESCRITA EN EL v1');
console.log('  punto_interior :', JSON.stringify(pw2.punto_interior));
console.log('  Capitanias con punto_interior:', conAntes, '->', conAhora);
console.log('  orden de claves:', kb);
console.log('  EOL preservado :', EOL === '\r\n' ? 'CRLF' : 'LF');
console.log('  sha256 antes   :', sha(antes));
console.log('  sha256 despues :', sha(despues));
