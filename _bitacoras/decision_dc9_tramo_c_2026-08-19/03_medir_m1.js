'use strict';
// M1 — DE LOS PUERTOS QUE UN PATRON PUEDE ELEGIR COMO ZARPE, CUANTOS TIENEN
// BAHIA Y CAPITANIA RESUELTAS. Mide con las piezas VIVAS del motor, no con una
// re-derivacion: fichaDePuerto + getCapitaniaByBahiaId + contactoPorEscalon.
//
// DEFINICION DE "PUERTO DE ZARPE", declarada y no supuesta:
//   P2_VoyageSetup.jsx renderiza el selector de zarpe con tipo="puerto" FIJO
//   (<Buscador tipo="puerto" value={puertoZarpe} .../>), y CONFIG_BUSQUEDA.puerto
//   apunta a /api/puertos?search=... El universo de zarpe es, entonces,
//   exactamente lo que ese endpoint puede devolver: nodos_maritimos con
//   fuente <> 'SITPORT'. NO hay ninguna otra via a puerto_zarpe.
//   Su espejo versionado es data/catalogo/join_puerto_bahia.json (693 filas de
//   la base, 688 nombres distintos), que es el mismo artefacto que el motor lee
//   en vivo. DENOMINADOR = 688 nombres.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const RAIZ = path.resolve(__dirname, '..', '..');
const { fichaDePuerto } = require(path.join(RAIZ, 'src', 'services', 'join-puerto-bahia'));
const { getCapitaniaByBahiaId } = require(path.join(RAIZ, 'src', 'utils', 'capitanias'));
const { contactoPorEscalon } = require(path.join(RAIZ, 'src', 'services', 'contacto-por-escalon'));

const RUTA_JOIN = path.join(RAIZ, 'data', 'catalogo', 'join_puerto_bahia.json');
const bufJoin = fs.readFileSync(RUTA_JOIN);
console.log('=== HUELLA (clase: fichero en disco) ===');
console.log('data/catalogo/join_puerto_bahia.json : ' + crypto.createHash('sha256').update(bufJoin).digest('hex'));
const join = JSON.parse(bufJoin.toString('utf8'));
console.log('filas del artefacto: ' + join.filas.length);
const nombres = [...new Set(join.filas.map(f => f.nombre))];
console.log('nombres distintos  : ' + nombres.length + '   <-- DENOMINADOR de M1');

const cont = {};
const inc = (k) => { cont[k] = (cont[k] || 0) + 1; };
const conBahia = [];
for (const n of nombres) {
  const f = fichaDePuerto(n);
  if (f.bahia_id === null) { inc('SILENCIO/' + f.silencio); continue; }
  inc('CON BAHIA');
  conBahia.push({ nombre: n, bahia_id: f.bahia_id, estado: f.estado_en_el_catalogo });
}
console.log('');
console.log('=== (a) ZARPE -> BAHIA, sobre los 688 nombres ===');
for (const k of Object.keys(cont).sort()) console.log('  ' + k.padEnd(38) + String(cont[k]).padStart(4) + ' / ' + nombres.length);

console.log('');
console.log('=== (b) DE LOS QUE TIENEN BAHIA: CAPITANIA CONOCIDA ===');
const capCont = {}; const escCont = {}; const atomCont = {};
const desconocidas = [];
for (const p of conBahia) {
  const cap = getCapitaniaByBahiaId(p.bahia_id);
  const conocida = cap.capitania !== 'Desconocida';
  capCont[conocida ? 'capitania conocida' : 'capitania Desconocida'] = (capCont[conocida ? 'capitania conocida' : 'capitania Desconocida'] || 0) + 1;
  if (!conocida) desconocidas.push(p);
  const c = contactoPorEscalon(cap);
  const nivel = c.nivel === null ? 'null (EL CAMPO NO SE MUESTRA)' : c.nivel;
  escCont[nivel] = (escCont[nivel] || 0) + 1;
  if (c.nivel !== null) { const k = c.telefono_atomico ? 'telefono ATOMICO' : 'telefono NO atomico'; atomCont[k] = (atomCont[k] || 0) + 1; }
}
for (const k of Object.keys(capCont).sort()) console.log('  ' + k.padEnd(38) + String(capCont[k]).padStart(4) + ' / ' + conBahia.length);
if (desconocidas.length) {
  console.log('  las Desconocidas, con su bahia:');
  for (const d of desconocidas) console.log('    bahia ' + d.bahia_id + '  ' + d.nombre);
}

console.log('');
console.log('=== (c) EL ESCALON DE INV-10.1 QUE LE TOCA AL AVISO, sobre los ' + conBahia.length + ' con bahia ===');
for (const k of Object.keys(escCont).sort()) console.log('  ' + k.padEnd(38) + String(escCont[k]).padStart(4) + ' / ' + conBahia.length);
console.log('  (de los que SI muestran contacto:)');
for (const k of Object.keys(atomCont).sort()) console.log('  ' + k.padEnd(38) + String(atomCont[k]).padStart(4));

console.log('');
console.log('=== (d) LO QUE EL AVISO NO PODRIA NOMBRAR — el denominador de la pregunta del owner ===');
const sinNada = nombres.length - conBahia.length + (capCont['capitania Desconocida'] || 0);
console.log('  sin bahia (cualquier silencio) .......... ' + (nombres.length - conBahia.length) + ' / ' + nombres.length);
console.log('  con bahia pero Capitania Desconocida .... ' + (capCont['capitania Desconocida'] || 0) + ' / ' + nombres.length);
console.log('  SIN CAPITANIA QUE NOMBRAR, total ........ ' + sinNada + ' / ' + nombres.length +
            '   = ' + (100 * sinNada / nombres.length).toFixed(1) + ' %');
console.log('  con Capitania nombrable ................. ' + (nombres.length - sinNada) + ' / ' + nombres.length +
            '   = ' + (100 * (nombres.length - sinNada) / nombres.length).toFixed(1) + ' %');

console.log('');
console.log('=== CONTROL POSITIVO — un nombre del propio artefacto tiene que resolver ===');
const cp = fichaDePuerto(join.filas.find(f => f.estado === 'derivado_limpio').nombre);
console.log('  ' + JSON.stringify(join.filas.find(f => f.estado === 'derivado_limpio').nombre) + ' -> bahia_id ' + cp.bahia_id + ' (esperado: numero)');
console.log('=== CONTROL NEGATIVO — un nombre inventado NO tiene que resolver ===');
const cn = fichaDePuerto('Puerto Inexistente QZX 99');
console.log('  bahia_id ' + JSON.stringify(cn.bahia_id) + ' silencio ' + JSON.stringify(cn.silencio) + ' (esperado: null / destino_sin_ficha_de_puerto)');
