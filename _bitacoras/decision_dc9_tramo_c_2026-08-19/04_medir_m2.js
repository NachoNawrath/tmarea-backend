'use strict';
// M2 — ¿EL TELEFONO DEL AVISO ES SEGURO DE MOSTRAR? Mide tres cosas distintas
// que la pregunta junta: (a) que trae el dato, (b) que hace el render de hoy,
// (c) por donde pasa (y por donde NO pasa) este aviso.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const RAIZ = path.resolve(__dirname, '..', '..');
const { contactoPorEscalon } = require(path.join(RAIZ, 'src', 'services', 'contacto-por-escalon'));

const RUTA_MAPA = path.join(RAIZ, 'src', 'data', 'bahia-capitania-map.json');
const buf = fs.readFileSync(RUTA_MAPA);
console.log('=== HUELLA (clase: fichero en disco) ===');
console.log('src/data/bahia-capitania-map.json : ' + crypto.createHash('sha256').update(buf).digest('hex'));
const mapa = JSON.parse(buf.toString('utf8'));
const ids = Object.keys(mapa);
console.log('entradas del mapa: ' + ids.length + '   <-- DENOMINADOR de (a)');

// El MISMO criterio de atomicidad que el motor: copiado del literal de
// contacto-por-escalon.js. Se re-declara aca SOLO para el control negativo.
const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);

console.log('');
console.log('=== (a) EL DATO — que trae bahia-capitania-map.json ===');
const c = { sin_telefono: 0, atomico: 0, no_atomico: 0 };
const noAtomicos = [];
for (const id of ids) {
  const e = mapa[id];
  const t = e && e.telefono;
  if (t == null || String(t).trim() === '') { c.sin_telefono++; continue; }
  if (esAtomico(String(t))) c.atomico++;
  else { c.no_atomico++; noAtomicos.push(id + ' -> ' + JSON.stringify(t) + '  [' + (e.capitania || e.gobernacion) + ']'); }
}
for (const k of Object.keys(c)) console.log('  ' + k.padEnd(16) + String(c[k]).padStart(4) + ' / ' + ids.length);
if (noAtomicos.length) { console.log('  los NO atomicos:'); noAtomicos.forEach(x => console.log('    ' + x)); }

console.log('');
console.log('=== (b) EL VEREDICTO QUE EL MOTOR YA EMITE — contactoPorEscalon sobre las ' + ids.length + ' entradas ===');
const e2 = {}; const atom = {};
for (const id of ids) {
  const r = contactoPorEscalon(mapa[id]);
  const nivel = r.nivel === null ? 'null (escalon 3: NO SE MUESTRA)' : r.nivel;
  e2[nivel] = (e2[nivel] || 0) + 1;
  if (r.nivel !== null) { const k = r.telefono_atomico ? 'telefono_atomico true' : 'telefono_atomico FALSE'; atom[k] = (atom[k] || 0) + 1; }
}
for (const k of Object.keys(e2).sort()) console.log('  ' + k.padEnd(34) + String(e2[k]).padStart(4) + ' / ' + ids.length);
for (const k of Object.keys(atom).sort()) console.log('  ' + k.padEnd(34) + String(atom[k]).padStart(4));

console.log('');
console.log('=== CONTROL NEGATIVO del criterio de atomicidad — tiene que morder ===');
const casos = ['+56 65 256 1100', '+56 65 256 1100 ó +56 65 256 1101', '65-2561100', '', null];
for (const x of casos) console.log('  ' + JSON.stringify(x).padEnd(40) + ' esAtomico=' + esAtomico(x));
console.log('=== CONTROL POSITIVO de contactoPorEscalon — una entrada real y una vacia ===');
console.log('  entrada real (' + ids[0] + '): nivel=' + JSON.stringify(contactoPorEscalon(mapa[ids[0]]).nivel));
console.log('  entrada nula                : nivel=' + JSON.stringify(contactoPorEscalon(null).nivel) + ' (esperado null)');
