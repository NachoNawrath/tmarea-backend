'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_rotulo.js — QUE LE LLEGA AL PATRON HOY Y QUE LE LLEGARIA, por los
// CUATRO caminos. Solo mide. No escribe ningun archivo, en ninguno de los dos
// repositorios.
//
// Corrida (shell declarada, §7.3 — identica en PowerShell y en Git Bash):
//     cd C:\Users\katia\tmarea-backend
//     node _bitacoras\rotulo_p3_tramo_b_2026-08-16\01_medir_rotulo.js
//
// POR QUE NO ALCANZA CON EL INSTRUMENTO DEL 08-15.
// `_bitacoras/auditoria_rotulos_2026-08-15/02_medir_pantalla.js` modela los
// renders con literales ESCRITOS ADENTRO DEL INSTRUMENTO: no abre un solo
// archivo de la PWA. Mientras el render no se toca, eso da la cifra correcta.
// El Tramo B toca el render, y desde ese momento aquel modelo describe una
// pantalla que ya no existe: seguiria devolviendo 108 y la cifra seria legible y
// falsa. Este instrumento cierra esa puerta LEYENDO la PWA y comprobando, linea
// declarada por linea declarada, que el literal que modela sigue ahi. Si no
// esta, ABORTA en vez de concluir.
//
// P4 no existe en el instrumento del 08-15 —`0bc80d2` no lo enumero— y por eso
// aca se mide por primera vez con denominador propio.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const PWA = 'C:/Users/katia/tmarea-pwa';
const ANCLA = 'dc7d63e72b1787e0cd93bfc587eb8a2201f3753d';

const { contactoPorEscalon } = require(path.join(RAIZ, 'src/services/contacto-por-escalon'));

const L = (...a) => console.log(...a);
const ABORTOS = [];
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

L('================================================================================');
L('QUE LE LLEGA AL PATRON POR LOS CUATRO CAMINOS — hoy y con la pieza aplicada');
L('Ancla: commit fijo ' + ANCLA);
L('NO escribe ningun archivo. La PWA se LEE.');
L('================================================================================');

// ── linea base: parte de la medicion, no un preambulo ────────────────────────
L('');
L('=== LINEA BASE ===');
const head = execSync('git rev-parse HEAD', { cwd: RAIZ }).toString().trim();
L(`  HEAD     : ${head}`);
L(`  esperado : ${ANCLA}`);
if (head !== ANCLA) {
  L('ABORTA — el arbol no esta en el ancla; una cifra medida sobre otro arbol seria legible y falsa.');
  process.exit(3);
}

// ── insumos ──────────────────────────────────────────────────────────────────
L('');
L('=== INSUMOS, con sha256 del archivo en disco ===');
const INSUMOS = {
  'src/data/bahia-capitania-map.json':          path.join(RAIZ, 'src/data/bahia-capitania-map.json'),
  'data/contacto/reparticiones_publicadas.json': path.join(RAIZ, 'data/contacto/reparticiones_publicadas.json'),
  'src/services/contacto-por-escalon.js':       path.join(RAIZ, 'src/services/contacto-por-escalon.js'),
  'pwa:src/hooks/useVoyageVerification.js':     path.join(PWA, 'src/hooks/useVoyageVerification.js'),
  'pwa:src/components/verification/PortStatusBlock.jsx': path.join(PWA, 'src/components/verification/PortStatusBlock.jsx'),
  'pwa:src/components/verification/NormativeBlock.jsx':  path.join(PWA, 'src/components/verification/NormativeBlock.jsx'),
};
for (const [rel, abs] of Object.entries(INSUMOS)) L(`  ${rel.padEnd(54)} ${sha(abs)}`);

// ── el modelo de render se comprueba contra el archivo, no se supone ─────────
// Al buscar por literal se comprueba LA LINEA DECLARADA: en el Tramo A dos
// salidas emitian el mismo texto y el mapa reporto movida una que no lo estaba.
L('');
L('=== LOS 5 PUNTOS DE LA PWA, RELEIDOS CONTRA EL ARCHIVO ===');
const PUNTOS = [
  // El punto que el Tramo A declaro como :246 es EL BLOQUE del pasamanos, que
  // ocupa :246-:248. Se modela por su PRIMERA linea, que es la declarada.
  ['src/hooks/useVoyageVerification.js', 246, 'capitania: data?.capitania || null,', 'P3·P4 PASAMANOS — copia campo por campo (:246-:248)'],
  ['src/components/verification/PortStatusBlock.jsx', 76, 'const capNombre = data?.gobernacion', 'P3 CONSUMIDOR — nunca mira `capitania`'],
  ['src/components/verification/PortStatusBlock.jsx', 99, '📞 Gobernación Marítima de {capitania.nombre}', 'P3 RENDER — etiqueta DURA en el JSX'],
  ['src/hooks/useVoyageVerification.js', 535, 'const capZarpeNombre = portStatus?.zarpe?.gobernacion', 'P4 CONSUMIDOR — r1_radio_aviso'],
  ['src/components/verification/NormativeBlock.jsx', 81, '{reminder.telefono && (', 'P4 RENDER — telefono dentro de un mensaje normativo'],
];
let puntosOK = 0;
for (const [rel, linea, literal, papel] of PUNTOS) {
  const lineas = fs.readFileSync(path.join(PWA, rel), 'utf8').split(/\r?\n/);
  const enLaDeclarada = (lineas[linea - 1] || '').includes(literal);
  const todas = lineas.map((t, i) => t.includes(literal) ? i + 1 : null).filter(Boolean);
  L(`  ${(rel + ':' + linea).padEnd(54)} ${enLaDeclarada ? 'OK' : 'NO ESTA EN LA LINEA DECLARADA'}`);
  L(`      ${papel}`);
  if (todas.length !== 1) L(`      el literal aparece ${todas.length} veces: ${todas.join(', ')}`);
  if (!enLaDeclarada) ABORTOS.push(`${rel}:${linea} — el literal modelado no esta en la linea declarada`);
  else puntosOK++;
}
L(`  PUNTOS COMPROBADOS : ${puntosOK} de ${PUNTOS.length}`);
if (puntosOK === 0) ABORTOS.push('cero puntos comprobados');

// ── P3 y P4: el par que los dos leen ─────────────────────────────────────────
const mapa = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/bahia-capitania-map.json'), 'utf8'));
const ids = Object.keys(mapa);

// Modelo del render de HOY, transcrito de PortStatusBlock.jsx:76-78 y :99, y de
// useVoyageVerification.js:535-547. Los dos rotulan igual y leen el mismo par.
const hoy = e => e.gobernacion ? { muestra: true, etiqueta: 'Gobernación Marítima de', nombre: e.gobernacion, tel: e.telefono } : { muestra: false };
// Modelo del render CON LA PIEZA: sale de `contacto`, ya resuelto por el motor.
const conPieza = c => c.nivel === null
  ? { muestra: false }
  : { muestra: true, etiqueta: c.nivel === 'capitania' ? 'Capitanía de Puerto de' : 'Gobernación Marítima de', nombre: c.nombre, tel: c.telefono, atomico: c.telefono_atomico };

L('');
L('=== P3 — TARJETA DE ZARPE Y RECALADA (PortStatusBlock.jsx) ===');
L('  DENOMINADOR DECLARADO: las 164 entradas de `bahia-capitania-map.json`.');
const r = { comparadas: 0, rotuloCambia: 0, nombreCambia: 0, bajas: 0, quietas: 0, noAtomicos: [], porNivel: new Map() };
const nombresQueCambian = [];
for (const id of ids) {
  const e = mapa[id];
  const a = hoy(e);
  const b = conPieza(contactoPorEscalon(e));
  r.comparadas++;
  const nivel = b.muestra ? b.etiqueta : '(no se muestra)';
  r.porNivel.set(nivel, (r.porNivel.get(nivel) || 0) + 1);
  if (a.muestra && !b.muestra) { r.bajas++; continue; }
  if (!a.muestra && !b.muestra) { r.quietas++; continue; }
  const cambiaEtiqueta = a.etiqueta !== b.etiqueta;
  const cambiaNombre = a.nombre !== b.nombre;
  if (cambiaEtiqueta) r.rotuloCambia++;
  if (cambiaNombre) { r.nombreCambia++; nombresQueCambian.push(`${String(id).padStart(3)}  "${a.nombre}" -> "${b.nombre}"`); }
  if (!cambiaEtiqueta && !cambiaNombre) r.quietas++;
  if (b.muestra && b.atomico === false) r.noAtomicos.push(`${id} ${b.tel}`);
}
L(`  COMPARACIONES EFECTIVAS : ${r.comparadas}`);
L('');
L('  con la pieza aplicada, reparto por etiqueta:');
for (const [k, v] of [...r.porNivel].sort((a2, b2) => b2[1] - a2[1])) L(`      ${k.padEnd(26)} ${String(v).padStart(3)}`);
L('');
L(`  rotulos que SE MUEVEN (Gobernación -> Capitanía) : ${r.rotuloCambia}`);
L(`  de esos, los que ademas CAMBIAN EL NOMBRE        : ${r.nombreCambia}`);
L(`  BAJAS — dejan de mostrar el campo (escalon 3)    : ${r.bajas}`);
L(`  QUIETAS — misma etiqueta y mismo nombre          : ${r.quietas}`);
L(`  SUMA : ${r.rotuloCambia} + ${r.bajas} + ${r.quietas} = ${r.rotuloCambia + r.bajas + r.quietas}  de ${r.comparadas}`);
L('');
L(`  telefonos NO atomicos que hoy se renderizan como \`tel:\` : ${r.noAtomicos.length}`);
L('      (INV-10.1: un valor que no sea numero atomico se muestra como texto)');
for (const x of r.noAtomicos) L(`      ${x}`);
if (r.comparadas === 0) ABORTOS.push('P3 con cero comparaciones efectivas');

L('');
L('  --- los nombres que cambian, uno por uno ---');
for (const x of nombresQueCambian) L(`    ${x}`);

// ── P4 ───────────────────────────────────────────────────────────────────────
L('');
L('=== P4 — RECORDATORIO r1_radio_aviso (useVoyageVerification.js:535-547) ===');
L('  DENOMINADOR DECLARADO: las mismas 164, leidas como bahia de ZARPE.');
L('  Lee EL MISMO PAR que P3 y lo rotula igual, asi que el movimiento de rotulo');
L('  y de nombre es el mismo. Lo que P4 tiene y P3 no es el TELEFONO adentro del');
L('  mensaje normativo, que es lo que la primera frase de INV-10.1 prohibe.');
let p4ConTel = 0;
for (const id of ids) if (mapa[id].telefono) p4ConTel++;
L(`  COMPARACIONES EFECTIVAS : ${ids.length}`);
L(`  recordatorios que HOY llevan telefono   : ${p4ConTel} de ${ids.length}`);
L(`  recordatorios que lo llevarian con D3(a):   0 de ${ids.length}`);
L(`  rotulos que se mueven / nombres que cambian: ${r.rotuloCambia} / ${r.nombreCambia}  (identicos a P3, mismo par)`);
if (ids.length === 0) ABORTOS.push('P4 con cero comparaciones efectivas');

// ── el caso que el dato NO ejercita: la bahia sin resolver ───────────────────
// `getCapitaniaByBahiaId` devuelve {'Desconocida','Desconocida',null} cuando la
// bahia no esta en el mapa. Ese caso no vive en las 164 y por eso se construye
// desde cero, no se saca del dato.
L('');
L('=== EL CASO QUE EL DATO NO EJERCITA — bahia sin resolver (construido) ===');
const desconocida = { capitania: 'Desconocida', gobernacion: 'Desconocida', telefono: null };
const cDesc = contactoPorEscalon(desconocida);
L(`  entrada construida       : ${JSON.stringify(desconocida)}`);
L(`  el motor la resuelve como: ${JSON.stringify(cDesc)}`);
L(`  render de HOY            : "📞 Gobernación Marítima de Desconocida — " + TypeError en .replace()`);
L(`  render CON LA PIEZA      : ${conPieza(cDesc).muestra ? 'SE MUESTRA (mal)' : 'el campo NO se muestra (escalon 3)'}`);
if (cDesc.nivel !== null) ABORTOS.push('la bahia sin resolver no cae al escalon 3');

// ── P1 y P2: se declaran medidos en cero, no se dan por supuestos ────────────
L('');
L('=== P1 y P2 — DECLARADOS SIN MOVIMIENTO, con el motivo medible ===');
const P1P2 = [
  ['P1', 'src/components/verification/TransitRestrictionsBlock.jsx', 62, 'const nombreCap = r.capitania || r.gobernacion;'],
  ['P2', 'src/screens/P3_VoyageVerification.jsx', 237, "const nombre = rec?.capitania || rec?.gobernacion"],
];
for (const [etq, rel, linea, literal] of P1P2) {
  const lineas = fs.readFileSync(path.join(PWA, rel), 'utf8').split(/\r?\n/);
  const ok = (lineas[linea - 1] || '').includes(literal);
  L(`  ${etq}  ${rel}:${linea}  ${ok ? 'INTACTO — fuera de los 5 puntos' : 'NO ESTA EN LA LINEA DECLARADA'}`);
  if (!ok) ABORTOS.push(`${etq}: el literal de ${rel}:${linea} se movio`);
}
L('  Los dos leen `capitania`/`gobernacion`, que esta pieza CONSERVA en la');
L('  respuesta y en el pasamanos. Movimiento esperado: 0 y 0.');

L('');
if (ABORTOS.length) { L('ABORTA — ' + ABORTOS.join(' · ')); process.exit(3); }
L('Ningun archivo fue escrito, en ninguno de los dos repositorios.');
L('================================================================================');
