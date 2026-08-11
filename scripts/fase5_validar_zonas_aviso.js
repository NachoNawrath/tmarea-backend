#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// fase5_validar_zonas_aviso.js
//
// Dos cosas, en este orden:
//   1. CARGA la declaracion real y muestra que quedo resuelto para cada zona.
//   2. PRUEBA DE MORDIDA: rompe la declaracion de una forma distinta por cada
//      regla del validador y comprueba que se detiene. Un validador que nunca
//      se probo contra un dato malo no es un control, es una decoracion.
//
// Sale 0 solo si la declaracion real carga limpia Y todas las mordidas muerden.
// Cualquier otro caso sale 1 con el detalle.
//
// Uso:  node scripts/fase5_validar_zonas_aviso.js
// ─────────────────────────────────────────────────────────────────────────────

const { cargarZonasAviso, validarDeclaracion, ErrorZonasAviso } = require('../src/services/zonas-aviso');

const DECL      = require('../data/decreto/zonas_aviso.json');
const INSUMO    = require('../data/decreto/jurisdicciones_v2.json');
const CONTACTOS = require('../src/data/bahia-capitania-map.json');

const clonar = o => JSON.parse(JSON.stringify(o));
const zonaDe = (d, id) => d.zonas.find(z => z.jurisdiccion_id === id);

let fallas = 0;

console.log('================================================================');
console.log('ZONAS DE AVISO — CARGA REAL');
console.log('================================================================');

let cargado;
try {
  cargado = cargarZonasAviso({ recargar: true });
} catch (e) {
  console.log(`FALLA AL CARGAR LA DECLARACION REAL: ${e.message}`);
  process.exit(1);
}

console.log(`version de la declaracion : ${cargado.version}`);
console.log(`zonas declaradas          : ${cargado.zonas.length}`);
console.log(`zonas que reclaman tramo  : ${cargado.zonas_con_ambito.length} (las que tienen ambito declarado)`);
console.log(`derivacion sin Capitania  : ${cargado.contacto_generico.via} — ${cargado.contacto_generico.procedencia}`);
console.log('');
console.log('jurisdiccion         ambito        contacto      nombre / telefono');
console.log('-------------------- ------------- ------------- ---------------------------------------');
for (const z of cargado.zonas) {
  const c = z.contacto;
  const detalle = c.tipo === 'sin_contacto' ? '(sin contacto declarado)' : `${c.nombre} — ${c.telefono}`;
  console.log(
    `${z.jurisdiccion_id.padEnd(20)} ${String(z.ambito_jurisdiccion).padEnd(13)} ` +
    `${c.tipo.padEnd(13)} ${detalle}`
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO DE DISCREPANCIAS DE CLASE C (fase5R §3): el mapa operativo dice una
// cosa y el decreto otra. La regla ya declarada es que el mapa NO revoca a la
// capa, y que cada discrepancia se adjudica leyendo el parrafo de las DOS
// Capitanias en juego. Este registro se DERIVA de las fuentes en cada corrida:
// si alguna se resuelve, deja de aparecer sola.
// ─────────────────────────────────────────────────────────────────────────────
const conDiscrepancia = cargado.zonas.filter(z => z.contacto.tipo === 'sin_contacto');
console.log('');
console.log('================================================================');
console.log('DISCREPANCIAS DE CLASE C — el mapa operativo contra el decreto');
console.log('================================================================');
console.log(`  total: ${conDiscrepancia.reduce((n, z) => n + z.contacto.discrepancias.length, 0)} bahia(s) ` +
            `en ${conDiscrepancia.length} jurisdiccion(es)`);
console.log('');
for (const z of conDiscrepancia) {
  console.log(`  ${z.jurisdiccion_id}  [nivel ${z.contacto.discrepancias[0].nivel}]`);
  for (const d of z.contacto.discrepancias) {
    console.log(`    bahia ${d.bahia_id}`);
    console.log(`      el decreto dice : Capitania '${d.dice_el_decreto.capitania}' / Gobernacion '${d.dice_el_decreto.gobernacion}'`);
    console.log(`      el mapa dice    : Capitania '${d.dice_el_mapa.capitania}' / Gobernacion '${d.dice_el_mapa.gobernacion}'`);
  }
  console.log(`      consecuencia    : sin contacto declarado; el aviso deriva al generico`);
  console.log(`      motivo          : ${z.contacto.motivo}`);
  console.log(`      pendiente       : adjudicar leyendo el parrafo del decreto de las dos Capitanias en juego (fase5R §3, clase C)`);
  console.log('');
}
console.log('');
console.log('causa de la carencia, tal como la declara el insumo (no se copia, se lee):');
for (const z of cargado.zonas) {
  console.log(`  ${z.jurisdiccion_id}: ${z.causa_sin_geometria}`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('================================================================');
console.log('PRUEBA DE MORDIDA DEL VALIDADOR');
console.log('================================================================');

// Cada familia: que se rompe, y que tiene que decir el validador al detenerse.
const FAMILIAS = [
  ['M1  jurisdiccion inexistente',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').jurisdiccion_id = 'no_existe'; return [d, INSUMO, CONTACTOS]; },
    /no corresponde a ninguna jurisdiccion/],

  ['M2  la jurisdiccion recupero geometria (retiro automatico)',
    () => { const i = clonar(INSUMO);
            i.jurisdicciones.find(j => j.id === 'arica').participa_matching = true;
            return [DECL, i, CONTACTOS]; },
    /YA participa del matching/],

  ['M3  aparece una nula sin zona declarada',
    () => { const d = clonar(DECL); d.zonas = d.zonas.filter(z => z.jurisdiccion_id !== 'baker'); return [d, INSUMO, CONTACTOS]; },
    /sin geometria que no tienen zona de aviso/],

  ['M4  zona declarada dos veces',
    () => { const d = clonar(DECL); d.zonas.push(clonar(zonaDe(d, 'arica'))); return [d, INSUMO, CONTACTOS]; },
    /declarada mas de una vez/],

  ['M5  tipo de contacto desconocido',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').contacto = { tipo: 'inventado', bahia_id: 71 }; return [d, INSUMO, CONTACTOS]; },
    /tipo de contacto 'inventado' desconocido/],

  ['M6  contacto de Capitania que el mapa atribuye a otra',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').contacto = { tipo: 'capitania', bahia_id: 98 }; return [d, INSUMO, CONTACTOS]; },
    /revoque al decreto/],

  ['M7  la fuente cambia la atribucion bajo una zona ya declarada',
    () => { const c = clonar(CONTACTOS); c['71'].capitania = 'Iquique'; return [DECL, INSUMO, c]; },
    /no es 'Arica'/],

  ['M8  bahia de contacto que no existe en el mapa',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').contacto = { tipo: 'capitania', bahia_id: 999999 }; return [d, INSUMO, CONTACTOS]; },
    /no existe en bahia-capitania-map/],

  ['M9  contacto sin telefono utilizable',
    () => { const c = clonar(CONTACTOS); c['71'].telefono = ''; return [DECL, INSUMO, c]; },
    /no trae telefono/],

  ['M10 derivar a Gobernacion cuando la fuente SI atribuye Capitania',
    () => { const c = clonar(CONTACTOS); c['127'].capitania = 'Chacabuco'; return [DECL, INSUMO, c]; },
    /SI tiene Capitania atribuida/],

  ['M11 derivar a Gobernacion que no coincide con la del decreto',
    () => { const c = clonar(CONTACTOS); c['127'].gobernacion = 'Castro'; return [DECL, INSUMO, c]; },
    /no coinciden: no se declara contacto/],

  ['M12 sin_contacto sin motivo escrito',
    () => { const d = clonar(DECL); zonaDe(d, 'lirquen').contacto = { tipo: 'sin_contacto' }; return [d, INSUMO, CONTACTOS]; },
    /exige 'motivo' escrito/],

  ['M13 sin ambito y sin motivo de la ausencia',
    () => { const d = clonar(DECL); delete zonaDe(d, 'arica').motivo_sin_ambito; return [d, INSUMO, CONTACTOS]; },
    /exige 'motivo_sin_ambito' escrito/],

  ['M14 tipo de ambito desconocido',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').ambito = { tipo: 'circulo', radio_km: 50 }; return [d, INSUMO, CONTACTOS]; },
    /tipo de ambito 'circulo' desconocido/],

  ['M15 banda de latitud dada vuelta',
    () => { const d = clonar(DECL);
            zonaDe(d, 'arica').ambito = { tipo: 'banda_latitud', lat_norte: -20, lat_sur: -18, procedencia: 'prueba' };
            return [d, INSUMO, CONTACTOS]; },
    /no mayor que/],

  ['M16 banda de latitud sin procedencia',
    () => { const d = clonar(DECL);
            zonaDe(d, 'arica').ambito = { tipo: 'banda_latitud', lat_norte: -17.5, lat_sur: -19.216667 };
            return [d, INSUMO, CONTACTOS]; },
    /exige 'procedencia'/],

  ['M17 carencia sin causa escrita en el insumo',
    () => { const i = clonar(INSUMO);
            i.jurisdicciones.find(j => j.id === 'arica').causa_sin_geometria = '';
            return [DECL, i, CONTACTOS]; },
    /no declara 'causa_sin_geometria'/],

  ['M18 declaracion sin derivacion generica',
    () => { const d = clonar(DECL); delete d.contacto_generico; return [d, INSUMO, CONTACTOS]; },
    /contacto_generico/],
  ['M19 sin_contacto sin las bahias que prueban la discrepancia',
    () => { const d = clonar(DECL); delete zonaDe(d, 'lirquen').contacto.bahias_en_discrepancia; return [d, INSUMO, CONTACTOS]; },
    /exige 'bahias_en_discrepancia'/],

  ['M20 la discrepancia se resolvio y el sin_contacto la esconderia',
    () => { const c = clonar(CONTACTOS); c['97'].capitania = 'Lirquen'; return [DECL, INSUMO, c]; },
    /SI coincide hoy con el decreto/],
];

// Control negativo: la declaracion intacta NO puede morder. Sin esto, un
// validador que lanzara siempre pasaria las 18 familias y pareceria perfecto.
console.log('');
try {
  const r = validarDeclaracion(DECL, INSUMO, CONTACTOS);
  console.log(`M0  control negativo — declaracion intacta          : NO muerde, ${r.zonas.length} zonas. OK`);
} catch (e) {
  console.log(`M0  control negativo — declaracion intacta          : MUERDE cuando no debia -> ${e.message}`);
  fallas++;
}

for (const [nombre, romper, esperado] of FAMILIAS) {
  let resultado;
  try {
    const [d, i, c] = romper();
    validarDeclaracion(d, i, c);
    resultado = null;
  } catch (e) {
    resultado = e;
  }
  if (!resultado) {
    console.log(`${nombre.padEnd(52)}: NO MUERDE — el validador acepto un dato malo`);
    fallas++;
  } else if (!(resultado instanceof ErrorZonasAviso)) {
    console.log(`${nombre.padEnd(52)}: muerde con el error equivocado (${resultado.name}) -> ${resultado.message}`);
    fallas++;
  } else if (!esperado.test(resultado.message)) {
    console.log(`${nombre.padEnd(52)}: muerde con otro motivo -> ${resultado.message}`);
    fallas++;
  } else {
    console.log(`${nombre.padEnd(52)}: muerde. ${resultado.message.slice(0, 110)}`);
  }
}

console.log('');
console.log('================================================================');
if (fallas === 0) {
  console.log(`RESULTADO: declaracion limpia y mordida ${FAMILIAS.length}/${FAMILIAS.length} + control negativo.`);
  process.exit(0);
}
console.log(`RESULTADO: ${fallas} problema(s). NO se da por buena.`);
process.exit(1);
