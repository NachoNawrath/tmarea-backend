'use strict';
// Mide si un aviso de ambito no publicado puede NOMBRAR la Capitania o tiene que
// derivar al contacto generico. Usa la misma regla que zonas-aviso.js: el nombre
// de la Capitania del decreto tiene que coincidir con el que el mapa operativo
// atribuye a alguna bahia; si no coincide, no se usa (INV-3.3).
//   node scripts/fase5_medir_e02_contacto.js

const ins = require('../data/decreto/jurisdicciones_v2.json');
const mapa = require('../src/data/bahia-capitania-map.json');
const { normalizarTexto } = require('../src/utils/normalizarTexto');

const norm = (s) => normalizarTexto(s || '');

const porCapitania = new Map();
const porGobernacion = new Map();
for (const [id, e] of Object.entries(mapa)) {
  if (e.capitania) {
    const k = norm(e.capitania);
    if (!porCapitania.has(k)) porCapitania.set(k, []);
    porCapitania.get(k).push({ bahia_id: id, telefono: e.telefono, capitania: e.capitania });
  } else if (e.gobernacion) {
    const k = norm(e.gobernacion);
    if (!porGobernacion.has(k)) porGobernacion.set(k, []);
    porGobernacion.get(k).push({ bahia_id: id, telefono: e.telefono, gobernacion: e.gobernacion });
  }
}

console.log('CONTACTO RESOLUBLE POR JURISDICCION, POR AMBITO');
console.log(`fecha: ${new Date().toISOString()}`);
console.log('regla aplicada: la misma de zonas-aviso.js — coincidencia de nombre normalizado');
console.log('entre el decreto y el mapa operativo. Sin coincidencia no se usa el contacto.');

const resumen = {};
for (const ambito of ['lacustre', 'antartica', 'insular_remota', 'maritima']) {
  const js = ins.jurisdicciones.filter((x) => x.ambito === ambito);
  console.log(`\n=== ambito ${ambito} (${js.length} jurisdicciones) ===`);
  let ok = 0, gob = 0, sin = 0;
  for (const j of js) {
    const hitCap = porCapitania.get(norm(j.nombre));
    const hitGob = porGobernacion.get(norm(j.gobernacion));
    let veredicto;
    if (hitCap) { veredicto = `CAPITANIA via bahia ${hitCap[0].bahia_id} tel ${hitCap[0].telefono}`; ok++; }
    else if (hitGob) { veredicto = `solo GOBERNACION via bahia ${hitGob[0].bahia_id} tel ${hitGob[0].telefono}`; gob++; }
    else { veredicto = 'SIN CONTACTO — deriva al generico (VHF Canal 16)'; sin++; }
    console.log(`  ${j.id.padEnd(24)} decreto="${j.nombre}"`);
    console.log(`  ${''.padEnd(24)} ${veredicto}`);
  }
  resumen[ambito] = { n: js.length, capitania: ok, gobernacion: gob, sin_contacto: sin };
}

console.log('\n=== RESUMEN ===');
for (const [a, r] of Object.entries(resumen)) {
  console.log(`  ${a.padEnd(16)} ${r.n} jur · capitania ${r.capitania} · solo gobernacion ${r.gobernacion} · sin contacto ${r.sin_contacto}`);
}
