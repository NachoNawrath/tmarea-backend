// Medicion de SOLO LECTURA: que contacto le llega hoy al patron por cada una de
// las 21 bahias lacustres, ahora que el ambito esta publicado y el nombre de la
// Capitania sale del decreto.
//
// NO decide nada y no aplica nada. Es el frente de contacto de §7.1, que es del
// owner. Lo que agrega este paso es que estos numeros YA SE MUESTRAN: hasta el
// paso 5 ninguna bahia lacustre entraba al matching, asi que la discrepancia era
// interna. Hoy sale en la tarjeta de una restriccion real.
//
// QUE COMPARA, y con que autoridad:
//   · lo que el motor muestra  -> src/data/bahia-capitania-map.json, que es la
//     fuente AUTORIZADA del contacto por CONTRATO_MOTOR.md §5;
//   · contra que se compara    -> _bitacoras/sondeo_catalogo_2026-08-12/
//     capitanias_64_final.csv, que NO es autoridad: el sondeo se cerro SIN
//     APLICAR y su propia bitacora pide re-verificar contra los raw. Por eso lo
//     que este script afirma es que las dos fuentes DISCREPAN, no cual tiene
//     razon.
const path = require('path');
const fs = require('fs');
const RAIZ = path.join(__dirname, '..', '..');

const { cargarJoin } = require(path.join(RAIZ, 'src/services/join-bahia-jurisdiccion'));
const { capitaniaDeBahia } = require(path.join(RAIZ, 'src/services/capitania-de-bahia'));
const insumo = require(path.join(RAIZ, 'data/decreto/jurisdicciones_v2.json'));

const CSV = path.join(RAIZ, '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv');
const filasCsv = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map(l => {
  const c = l.match(/"((?:[^"]|"")*)"/g).map(s => s.slice(1, -1));
  return { cdrep: Number(c[0]), capitania: c[2], gobernacion: c[3], telefono: c[5] };
});
const normTel = t => (t || '').replace(/\D/g, '');

const amb = new Map(insumo.jurisdicciones.map(j => [j.id, j.ambito]));
const join = cargarJoin();

const filas = [];
for (const [id, e] of join.resueltas) {
  if (!e.jurisdicciones.some(x => amb.get(x) === 'lacustre')) continue;
  const c = capitaniaDeBahia(Number(id), ['lacustre']);
  filas.push({ bahia: Number(id), jur: e.jurisdicciones.join('+'), ...c });
}
filas.sort((a, b) => a.bahia - b.bahia);

console.log('LAS 21 BAHIAS LACUSTRES — LO QUE EL MOTOR MUESTRA HOY');
console.log('bahia  jurisdiccion(join)          Capitania (decreto)      Gobernacion   telefono (mapa)');
for (const f of filas) {
  console.log(`${String(f.bahia).padStart(5)}  ${f.jur.padEnd(27)} ${String(f.capitania).padEnd(24)} ` +
    `${String(f.gobernacion).padEnd(13)} ${f.telefono}`);
}

const porCap = new Map(), porTel = new Map();
for (const f of filas) {
  if (!porCap.has(f.capitania)) porCap.set(f.capitania, new Set());
  porCap.get(f.capitania).add(f.telefono);
  if (!porTel.has(f.telefono)) porTel.set(f.telefono, new Set());
  porTel.get(f.telefono).add(f.capitania);
}

console.log('\nUNA CAPITANIA CON MAS DE UN TELEFONO:');
for (const [c, s] of porCap) if (s.size > 1) console.log(`   ${c} -> ${[...s].join(' | ')}`);
console.log('UN TELEFONO PARA MAS DE UNA CAPITANIA:');
for (const [t, s] of porTel) if (s.size > 1) console.log(`   ${t} -> ${[...s].join(' | ')}`);

// ── CONTRA EL CSV, Y POR REPARTICION, NO POR NOMBRE ──────────────────────────
// La primera version de este script emparejo por NOMBRE y devolvio "NO
// ENCONTRADA" para dos de las seis: el CSV las llama VILLARRICA y PANGUIPULLI y
// el decreto `lago_villarrica` y `lago_panguipulli`. Es la trampa de
// equivalencia que CLAUDE.md §2 persigue y que este repositorio ya pago tres
// veces en un dia. La clave correcta es la que A3 ya establecio para el mismo
// problema: el CODIGO DE REPARTICION, que publica la propia fuente para los dos
// lados y no admite abreviaturas.
//
// De donde sale la reparticion de cada bahia: de `consultaBahias` de la captura
// cruda de esta sesion. Es la atribucion OPERATIVA de SITPORT, que por INV-3.3
// no revoca al decreto — y en la bahia 160 se sabe que difieren. Se declara para
// que nadie lea esta tabla como "el decreto dice".
const bahiasSitport = JSON.parse(fs.readFileSync(
  path.join(__dirname, '01_sitport_crudo', 'consultaBahias.json'), 'utf8'));
const repDeBahia = new Map(bahiasSitport
  .filter(b => b && b.IDBahia != null)
  .map(b => [Number(b.IDBahia), Number(b.CdReparticion)]));

console.log('\nCONTRA EL CSV DE LAS 64, emparejado por REPARTICION de SITPORT.');
console.log('El CSV NO es autoridad (ver la cabecera): esto mide que las dos fuentes DISCREPAN.');
console.log('bahia  Capitania mostrada        tel mostrado         rep  CSV: Capitania        tel del CSV');
let discrepan = 0, comparadas = 0;
for (const f of filas) {
  const rep = repDeBahia.get(f.bahia);
  const enCsv = rep != null ? filasCsv.find(x => x.cdrep === rep) : null;
  const coincide = enCsv ? normTel(enCsv.telefono) === normTel(f.telefono) : null;
  if (enCsv) { comparadas++; if (!coincide) discrepan++; }
  console.log(`${String(f.bahia).padStart(5)}  ${String(f.capitania).padEnd(24)} ${f.telefono.padEnd(20)} ` +
    `${String(rep == null ? '—' : rep).padStart(3)}  ${(enCsv ? enCsv.capitania : 'NO LISTADA').padEnd(21)} ` +
    `${enCsv ? enCsv.telefono : '—'}   ${coincide === null ? '' : (coincide ? 'coincide' : 'DISCREPA')}`);
}
console.log(`\ncomparadas ${comparadas} de ${filas.length} · discrepan ${discrepan}`);

const compartido = [...porTel].find(([, s]) => s.size > 1)[0];
const valdivia = filasCsv.find(x => normTel(x.telefono) === normTel(compartido));
console.log(`\nEl telefono que hoy comparten tres Capitanias lacustres es ${compartido}.`);
console.log(valdivia
  ? `El CSV le da ese numero a: ${valdivia.capitania} (reparticion ${valdivia.cdrep}, gobernacion ${valdivia.gobernacion}). Es una Capitania MARITIMA.`
  : 'Ese numero no aparece en el CSV.');
