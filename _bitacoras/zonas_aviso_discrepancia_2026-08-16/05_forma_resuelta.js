'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 05_forma_resuelta.js — SOLO MIDE. No escribe nada.
//
// ES EL CONTRAPUNTO DIRECTO DE `pieza_a_nulas_2026-08-15` §15, que midio:
//
//     ¿el campo extra sobrevive a la resolucion?  false
//     ¿sobrevive bahias_en_discrepancia?          false
//     contacto resuelto: { ..., "gobernacion": "Aysén", "motivo": null }
//
// y concluyo, con razon para el esquema de ese dia: "el esquema tolera
// escribirlo y no admite declararlo".
//
// Este instrumento mide LO MISMO sobre el esquema de hoy. Tres cosas:
//   (1) que la forma resuelta lleve `discrepancias` SIEMPRE, en las tres ramas,
//       para que un consumidor no pueda olvidarse de un campo que a veces esta;
//   (2) que las entradas de `sin_contacto` y las de `discrepancias_declaradas`
//       tengan LAS MISMAS CLAVES — dos formas para el mismo concepto es la
//       trampa de CLAUDE.md §2;
//   (3) el objeto de `puerto_eden` volcado literal, para poder compararlo con el
//       de §15 sin intermediarios.
//
// Corrida:  node _bitacoras/zonas_aviso_discrepancia_2026-08-16/05_forma_resuelta.js
// Shell declarada (CLAUDE.md §7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const L = (...a) => console.log(...a);

const { cargarZonasAviso } = require(path.join(RAIZ, 'src/services/zonas-aviso'));

let cargado;
try { cargado = cargarZonasAviso({ recargar: true }); }
catch (e) { L(`ABORTA — la declaracion real no carga: ${e.message}`); process.exit(3); }

let fallas = 0;
const fallar = (m) => { L(`    FALLA: ${m}`); fallas++; };

L('================================================================================');
L('LA FORMA DEL CONTACTO RESUELTO — contrapunto de pieza_a_nulas §15');
L('================================================================================');

// ─── (1) `discrepancias` esta SIEMPRE ───────────────────────────────────────
L('');
L('(1) ¿`discrepancias` viaja en las tres ramas, siempre?');
L('');
L('    zona                 tipo          ¿tiene `discrepancias`?  cuantas');
let comparadas = 0;
for (const z of cargado.zonas) {
  const c = z.contacto;
  comparadas++;
  const tiene = Array.isArray(c.discrepancias);
  L(`    ${z.jurisdiccion_id.padEnd(20)} ${c.tipo.padEnd(13)} ${String(tiene).padEnd(23)} ` +
    `${tiene ? c.discrepancias.length : '—'}`);
  if (!tiene) fallar(`la zona '${z.jurisdiccion_id}' (${c.tipo}) NO trae el arreglo 'discrepancias'.`);
}
L('');
L(`    COMPARACIONES EFECTIVAS : ${comparadas}`);
if (comparadas === 0) { L('ABORTA — cero comparaciones efectivas.'); process.exit(3); }

// ─── (2) las claves, iguales en las dos ramas ───────────────────────────────
L('');
L('(2) ¿Las entradas de las DOS ramas tienen las mismas claves?');
const deSinContacto = cargado.zonas.filter(z => z.contacto.tipo === 'sin_contacto' && z.contacto.discrepancias.length);
const deDeclaradas  = cargado.zonas.filter(z => z.contacto.tipo !== 'sin_contacto' && z.contacto.discrepancias.length);
L('');
L(`    zonas con discrepancia por 'sin_contacto'          : ${deSinContacto.length}`);
L(`    zonas con discrepancia declarada sobre contacto    : ${deDeclaradas.length}`);

if (deSinContacto.length === 0 || deDeclaradas.length === 0) {
  L('');
  L('    ABORTA — hace falta al menos una de CADA rama para comparar las formas.');
  L('    Comparar una rama consigo misma probaria que coincide consigo misma.');
  process.exit(3);
}

const clavesA = Object.keys(deSinContacto[0].contacto.discrepancias[0]).sort();
const clavesB = Object.keys(deDeclaradas[0].contacto.discrepancias[0]).sort();
L('');
L(`    claves de 'sin_contacto'          : ${clavesA.join(', ')}`);
L(`    claves de 'discrepancias_declaradas': ${clavesB.join(', ')}`);
if (clavesA.join('|') !== clavesB.join('|')) {
  fallar('las dos ramas devuelven formas DISTINTAS. Un consumidor tendria que conocer las dos.');
} else {
  L('    -> IDENTICAS. El consumidor ve una sola forma.');
}

// Y que sean iguales para TODAS, no solo para la primera de cada una.
let entradas = 0;
for (const z of [...deSinContacto, ...deDeclaradas]) {
  for (const d of z.contacto.discrepancias) {
    entradas++;
    const k = Object.keys(d).sort().join('|');
    if (k !== clavesA.join('|')) fallar(`la entrada de '${z.jurisdiccion_id}'/bahia ${d.bahia_id} tiene otras claves: ${k}`);
  }
}
L(`    entradas comprobadas una por una : ${entradas}`);

// ─── (3) el objeto de puerto_eden, literal ──────────────────────────────────
L('');
L('(3) El contacto resuelto de `puerto_eden`, volcado literal:');
L('');
const pe = cargado.zonas.find(z => z.jurisdiccion_id === 'puerto_eden');
if (!pe) { L('ABORTA — `puerto_eden` no esta en la declaracion.'); process.exit(3); }
L(JSON.stringify(pe.contacto, null, 2).split('\n').map(l => '    ' + l).join('\n'));

L('');
L('    LO QUE §15 MIDIO EL 2026-08-15, para comparar sin intermediarios:');
L('        { "tipo": "capitania", "nombre": "Puerto Edén",');
L('          "telefono": "+56 61 2201164", "gobernacion": "Aysén",');
L('          "bahia_id": 129, "motivo": null }');
L('        ¿el campo extra sobrevive a la resolucion?  false');
L('');
L('    LO QUE CAMBIA: `gobernacion` sigue diciendo "Aysén" —es lo que la fuente');
L('    dice, y borrarlo esconderia la medicion— pero ya no viaja solo. Al lado va');
L('    `discrepancias`, con el nivel declarado y con `dice_el_decreto` adentro.');
L('    La marca acompaña al valor; no lo reemplaza ni lo tapa.');

// ─── lo que este instrumento NO prueba ──────────────────────────────────────
L('');
L('================================================================================');
L('LO QUE ESTE INSTRUMENTO NO PRUEBA, dicho para que nadie lo lea de mas');
L('================================================================================');
L('  Que la marca LLEGUE A PANTALLA. No llega, y no es un descuido:');
L('    · `puerto_eden` tiene ambito null, asi que no entra en `zonas_con_ambito`,');
L('      que es lo unico que `cobertura-jurisdiccional.js:360` consume. Su contacto');
L('      no alcanza `componerAvisos` hoy.');
L('    · y si lo alcanzara, `:405` mapea {nombre, telefono, tipo} y `discrepancias`');
L('      se perderia ahi. Ese archivo esta fuera de la zona de escritura de esta');
L('      pieza.');
L('  Lo que el validador SI garantiza es que ese hueco no sea silencioso: una zona');
L('  en esta condicion no puede declarar ambito, y la carga se detiene si alguien');
L('  se lo declara (familia M29 de la mordida).');
L('================================================================================');
L('');
if (fallas === 0) { L('RESULTADO: la forma resuelta es una sola y lleva la marca. Sin fallas.'); process.exit(0); }
L(`RESULTADO: ${fallas} falla(s).`);
process.exit(1);
