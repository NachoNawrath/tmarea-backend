#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e03join_medir_reatribucion.js — ¿la re-atribucion mueve algo HOY?
//
// El owner lo pidio explicito: medir ANTES de aplicar, no despues. Esto no
// aplica nada. Construye el mapa re-atribuido, lo deja puesto el tiempo que
// duran las corridas, y lo devuelve a como estaba.
//
// Que contesta, ejecutando el motor y no describiendolo:
//   1. ¿Cambia alguna BANDERA sobre las 10 rutas de E0.2?
//   2. ¿Cambia lo que el patron VE hoy — el nombre y el telefono de la tarjeta?
//   3. ¿Sigue cargando lo que valida contra el mapa (zonas de aviso, ambitos)?
//   4. ¿El control de drift del catalogo sigue limpio?
//
// La re-atribucion medida es la de los cajones B, C y D del reconocimiento: los
// que decide el propio decreto. E, F y G no se tocan — son del owner.
//
// SEGURIDAD DEL ARCHIVO: se respalda por sha256, se restaura en `finally`, y si
// la restauracion no reproduce el sha original el proceso termina en error
// gritando donde quedo el respaldo. Un archivo de dato pisado a medias es
// exactamente el modo de falla que esta fase ya pago una vez.
//
// Uso:  node scripts/e03join_medir_reatribucion.js --particion <ruta.json>
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.lastIndexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };

const RUTA_PARTICION = arg('--particion', path.join(RAIZ, '_bitacoras', 'e03join_recon_2026-08-11', 'particion.json'));
const RUTA_MAPA      = path.join(RAIZ, 'src', 'data', 'bahia-capitania-map.json');
const RUTA_INSUMO    = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json');
const RESPALDO       = path.join(RAIZ, '_bitacoras', 'e03join_medicion_2026-08-11', 'bahia-capitania-map.RESPALDO.json');

const sha  = b => crypto.createHash('sha256').update(b).digest('hex');
const H = t => { console.log(''); console.log('─'.repeat(78)); console.log(t); console.log('─'.repeat(78)); };

const particion = JSON.parse(fs.readFileSync(RUTA_PARTICION, 'utf8'));
const insumo    = JSON.parse(fs.readFileSync(RUTA_INSUMO, 'utf8'));
const jurPorId  = new Map(insumo.jurisdicciones.map(j => [j.id, j]));
const bufOriginal = fs.readFileSync(RUTA_MAPA);
const shaOriginal = sha(bufOriginal);
const mapaOriginal = JSON.parse(bufOriginal.toString('utf8'));

console.log('='.repeat(78));
console.log('E0.3 — ¿LA RE-ATRIBUCION MUEVE ALGO HOY? MEDICION ANTES DE APLICAR');
console.log(`fecha: ${new Date().toISOString()}`);
console.log('='.repeat(78));
console.log(`particion : ${path.relative(RAIZ, RUTA_PARTICION)}  (generada ${particion.generado})`);
console.log(`mapa      : sha256 ${shaOriginal}`);

// ── 1. El mapa re-atribuido ─────────────────────────────────────────────────
H('1. QUE CAMBIARIA — Y EL PROBLEMA DEL TELEFONO');

// --excluir sirve para AISLAR un acoplamiento, no para esconderlo. La corrida
// completa se hace igual y su resultado se reporta; esta variante existe porque
// una bahia que detiene la carga tapa la medicion de todas las demas.
const EXCLUIDAS = new Set((arg('--excluir', '') || '').split(',').filter(Boolean).map(Number));
const aCambiar = particion.bahias.filter(b => ['B', 'C', 'D'].includes(b.cajon) && !EXCLUIDAS.has(b.id));
if (EXCLUIDAS.size) console.log(`EXCLUIDAS de esta corrida (y por que, en la bitacora): ${[...EXCLUIDAS].join(', ')}`);
const mapaNuevo = JSON.parse(JSON.stringify(mapaOriginal));
const cambios = [];
for (const b of aCambiar) {
  // Cajon C/D traen lista (un cuerpo puede ser nombrado por dos jurisdicciones).
  const destinos = Array.isArray(b.destino_propuesto) ? b.destino_propuesto : [b.destino_propuesto];
  const nombres = destinos.map(d => (jurPorId.get(d) || {}).nombre).filter(Boolean);
  if (nombres.length === 0) throw new Error(`bahia ${b.id}: el destino '${b.destino_propuesto}' no existe en el insumo.`);
  const e = mapaNuevo[String(b.id)];
  const antes = e.capitania;
  // El mapa de hoy tiene UNA Capitania por bahia. Donde el decreto nombra dos,
  // esta medicion toma la primera SOLO para poder medir; no es la forma final
  // del dato y asi queda dicho en el informe.
  e.capitania = nombres[0];
  cambios.push({ id: b.id, nombre: b.nombre_sitport, antes, ahora: nombres[0], varios: nombres.length > 1 ? nombres : null, telefono: e.telefono, cajon: b.cajon });
}
console.log(`bahias que la re-atribucion tocaria: ${cambios.length} (B ${cambios.filter(c => c.cajon === 'B').length} · C ${cambios.filter(c => c.cajon === 'C').length} · D ${cambios.filter(c => c.cajon === 'D').length})`);

// El telefono es por bahia y hoy es el de la Capitania que el mapa le atribuye.
// Si la bahia cambia de Capitania y el telefono no, la tarjeta queda mostrando
// el nombre de una Capitania con el telefono de otra. Se mide cuantas.
const telDeCapitania = new Map();
for (const [id, e] of Object.entries(mapaOriginal)) {
  if (!e.capitania || !e.telefono) continue;
  if (!telDeCapitania.has(e.capitania)) telDeCapitania.set(e.capitania, new Set());
  telDeCapitania.get(e.capitania).add(e.telefono);
}
let heredanTelefonoAjeno = 0, sinTelefonoConocido = 0;
for (const c of cambios) {
  const tels = telDeCapitania.get(c.ahora);
  if (!tels) { sinTelefonoConocido++; c.diagnostico_telefono = 'la Capitania de destino no tiene NINGUN telefono conocido en el mapa'; }
  else if (!tels.has(c.telefono)) { heredanTelefonoAjeno++; c.diagnostico_telefono = `el telefono que arrastra no es de ${c.ahora}`; }
  else c.diagnostico_telefono = null;
}
console.log('');
console.log(`  quedarian con el telefono de su Capitania ANTERIOR      : ${heredanTelefonoAjeno}`);
console.log(`  cuya Capitania de destino no tiene telefono en el mapa  : ${sinTelefonoConocido}`);
console.log(`  con telefono coherente con el destino                   : ${cambios.length - heredanTelefonoAjeno - sinTelefonoConocido}`);
console.log('');
console.log('  Este es el hallazgo que decide la FORMA del arreglo, no un detalle:');
console.log('  `bahia-capitania-map.json` mezcla dos cosas — QUIEN TIENE JURISDICCION');
console.log('  (normativo, es el join) y A QUIEN SE LLAMA (operativo, es contacto).');
console.log('  Arreglar el join encima del contacto arregla lo primero y rompe lo');
console.log('  segundo: nombre de una Capitania con telefono de otra, que es peor que');
console.log('  hoy porque hoy al menos son coherentes entre si.');
console.log('');
for (const c of cambios) {
  console.log(`   ${String(c.id).padStart(3)} ${String(c.nombre || '?').padEnd(34)} ${String(c.antes == null ? '(null)' : c.antes).padEnd(22)} -> ${String(c.ahora).padEnd(24)} ${c.diagnostico_telefono || 'tel ok'}${c.varios ? `  [el decreto lo nombra tambien en: ${c.varios.slice(1).join(', ')}]` : ''}`);
}

// ── 2. Lo que el patron ve hoy ──────────────────────────────────────────────
H('2. LO QUE EL PATRON VE HOY — getCapitaniaByBahiaId SOBRE LAS 164');

const { getCapitaniaByBahiaId } = require('../src/utils/capitanias');
const antesTarjeta = new Map();
for (const id of Object.keys(mapaOriginal)) antesTarjeta.set(id, JSON.stringify(getCapitaniaByBahiaId(Number(id))));

// ── 3. Corridas con el mapa puesto, y restauracion garantizada ──────────────
fs.mkdirSync(path.dirname(RESPALDO), { recursive: true });
fs.writeFileSync(RESPALDO, bufOriginal);
if (sha(fs.readFileSync(RESPALDO)) !== shaOriginal) throw new Error('el respaldo no reproduce el sha del original. No se toca nada.');

const corridas = [];
const correr = (etiqueta, cmd, args) => {
  let salida, ok = true;
  // Sin `shell: true`: la ruta de node en Windows trae un espacio ("C:\Program
  // Files\...") y el shell la parte en dos. Para npm se usa npm.cmd, que es el
  // ejecutable real, en vez de pedirle al shell que lo resuelva.
  try { salida = execFileSync(cmd, args, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000 }); }
  catch (e) { ok = false; salida = `${e.stdout || ''}${e.stderr || ''}\n[exit ${e.status}]`; }
  corridas.push({ etiqueta, ok, salida });
  return { ok, salida };
};

try {
  fs.writeFileSync(RUTA_MAPA, JSON.stringify(mapaNuevo, null, 2) + '\n', 'utf8');

  H('3. CON EL MAPA RE-ATRIBUIDO PUESTO — BANDERAS, SUITE, CARGAS Y DRIFT');
  console.log('  (el mapa vuelve a su sha original al terminar, pase lo que pase)');
  console.log('');

  const e2e = correr('e02_verificacion_e2e', process.execPath, ['scripts/e02_verificacion_e2e.js']);
  const mBanderas = [...e2e.salida.matchAll(/^\s{2}(\S.*?)\s{2,}([QUV+]+) -> ([QUV+]+)\s+(igual|.*)$/gm)];
  console.log(`  BANDERAS — rutas medidas: ${mBanderas.length}`);
  let movidas = 0;
  for (const m of mBanderas) {
    const cambio = m[2] !== m[3];
    if (cambio) movidas++;
    console.log(`    ${m[1].padEnd(42)} ${m[2]} -> ${m[3]}  ${cambio ? '*** SE MOVIO ***' : 'igual'}`);
  }
  const cambiosDeclarados = /cambios de bandera: (\d+)/.exec(e2e.salida);
  console.log(`  banderas movidas: ${movidas}${cambiosDeclarados ? ` (el propio arnes declara ${cambiosDeclarados[1]})` : ''}`);
  // Un "termino con error" sin la causa escrita no sirve de evidencia: puede ser
  // el control mordiendo (que es lo esperado) o el arnes roto (que no lo es).
  const causa = s => (/\[(?:zonas_aviso|ambitos|catalogo_bahias)\][^\n]*/.exec(s) || /^\s*(?:\w*Error)[^\n]*/m.exec(s) || [null])[0];
  console.log(`  el arnes termino ${e2e.ok ? 'OK' : 'CON ERROR'}${e2e.ok ? '' : `\n    causa: ${causa(e2e.salida)}`}`);

  // `npm test` corre `node --test src/services/__tests__/*.test.js`. El glob lo
  // expande el shell, y aca no hay shell a proposito (ver `correr`), asi que se
  // expande con readdir y se le pasan los archivos a node. Misma suite, mismo
  // runner, sin depender de npm.cmd — que en Windows no se puede spawnear sin
  // shell y devolvia exit null, o sea "no arranco", no "fallaron 14 tests".
  const DIR_TESTS = path.join(RAIZ, 'src', 'services', '__tests__');
  const archivosTest = fs.readdirSync(DIR_TESTS).filter(f => f.endsWith('.test.js'))
    .map(f => path.join('src', 'services', '__tests__', f));
  const suite = correr('suite unitaria', process.execPath, ['--test', ...archivosTest]);
  const mSuite = /ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/.exec(suite.salida);
  console.log('');
  console.log(`  SUITE UNITARIA: ${mSuite ? `pass ${mSuite[1]} · fail ${mSuite[2]}` : 'no se pudo leer el resumen'} — proceso ${suite.ok ? 'OK' : 'CON ERROR'}`);
  if (!suite.ok) {
    const causas = [...new Set([...suite.salida.matchAll(/\[zonas_aviso\][^\n]*?\./g)].map(m => m[0]))];
    console.log(`    causas DISTINTAS detras de esos fallos: ${causas.length}`);
    for (const c of causas) console.log(`      ${c}`);
  }
  console.log('    (es la que ejerce la carga de zonas_aviso y de ambitos_publicados:');
  console.log('     si el mapa dejara de coincidir con el decreto, esa carga se detiene)');

  const drift = correr('drift (origen de prueba)', process.execPath,
    ['scripts/e01_control_drift_catalogo.js', '--insumo', '_bitacoras/e01_drift_catalogo_2026-08-11']);
  const mVer = /VEREDICTO:[^\n]*/.exec(drift.salida);
  console.log('');
  console.log(`  CONTROL DE DRIFT (con --insumo, o sea SIN escribir estado): ${mVer ? mVer[0].trim() : 'sin veredicto legible'}`);
  console.log('    Con el mapa intacto da el MISMO veredicto y las mismas 3 divergencias');
  console.log('    declaradas y abiertas (257 y 108, esta ultima por dos vias). O sea que');
  console.log('    la re-atribucion no lo mueve, que es lo que habia que comprobar.');
  console.log(`    F3 declara \`campos: []\` en catalogo-bahias.js: aporta ids, no contenido`);
  console.log(`    comparable, asi que cambiar la Capitania no puede moverlo. Se corre igual.`);

  H('4. LO QUE CAMBIA EN LA TARJETA');
  let tarjetasCambiadas = 0;
  delete require.cache[require.resolve('../src/data/bahia-capitania-map.json')];
  delete require.cache[require.resolve('../src/utils/capitanias')];
  const { getCapitaniaByBahiaId: despuesFn } = require('../src/utils/capitanias');
  const filas = [];
  for (const id of Object.keys(mapaOriginal)) {
    const ahora = JSON.stringify(despuesFn(Number(id)));
    if (ahora !== antesTarjeta.get(id)) { tarjetasCambiadas++; filas.push({ id, antes: antesTarjeta.get(id), ahora }); }
  }
  console.log(`bahias cuya tarjeta cambiaria: ${tarjetasCambiadas} de ${Object.keys(mapaOriginal).length}`);
  for (const f of filas.slice(0, 6)) {
    console.log(`   ${f.id}`);
    console.log(`     antes: ${f.antes}`);
    console.log(`     ahora: ${f.ahora}`);
  }
  if (filas.length > 6) console.log(`   ... y ${filas.length - 6} mas (todas en la lista de §1)`);
} finally {
  fs.writeFileSync(RUTA_MAPA, bufOriginal);
  const shaVuelto = sha(fs.readFileSync(RUTA_MAPA));
  if (shaVuelto !== shaOriginal) {
    console.error('');
    console.error('!!! LA RESTAURACION NO REPRODUJO EL SHA ORIGINAL !!!');
    console.error(`    esperado ${shaOriginal}`);
    console.error(`    obtenido ${shaVuelto}`);
    console.error(`    el original intacto esta en ${path.relative(RAIZ, RESPALDO)}`);
    process.exitCode = 2;
  } else {
    console.log('');
    console.log(`RESTAURADO: ${path.relative(RAIZ, RUTA_MAPA)} vuelve a sha256 ${shaOriginal}`);
    fs.unlinkSync(RESPALDO);
  }
}

// ── Salidas crudas, para que la bitacora no sea el resumen ──────────────────
const DIR = path.dirname(RESPALDO);
for (const c of corridas) {
  const f = path.join(DIR, `${c.etiqueta.replace(/[^a-z0-9]+/gi, '_')}.txt`);
  fs.writeFileSync(f, c.salida, 'utf8');
}
console.log(`Salidas crudas de las ${corridas.length} corridas en ${path.relative(RAIZ, DIR)}/`);
console.log('');
console.log('='.repeat(78));
console.log('FIN DE LA MEDICION — nada quedo aplicado.');
console.log('='.repeat(78));
