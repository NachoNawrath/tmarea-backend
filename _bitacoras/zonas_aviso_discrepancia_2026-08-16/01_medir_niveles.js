'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_niveles.js — SOLO MIDE. No escribe nada.
//
// El instrumento 06 de `pieza_a_nulas_2026-08-15` midio las discrepancias
// declaradas de las zonas `sin_contacto`. Este mide LOS DOS NIVELES de TODAS
// las zonas, incluidas las que hoy SI dan contacto.
//
// POR QUE HACE FALTA: el guard de `zonas-aviso.js:109-110` calcula
//
//     coincideGob = e.capitania == null && mismoNombre(e.gobernacion, ...)
//
// o sea que escrita la Capitania, la Gobernacion DEJA DE MIRARSE. Una zona con
// `tipo: 'capitania'` puede tener su Gobernacion en desacuerdo con el decreto y
// nadie lo sabria. Esta medicion existe para contestar cuantas.
//
// Corrida:  node _bitacoras/zonas_aviso_discrepancia_2026-08-16/01_medir_niveles.js
// Shell declarada (CLAUDE.md §7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const abs = p => path.join(RAIZ, p);
const L = (...a) => console.log(...a);

const { mismoNombre } = require(abs('src/utils/coincidencia-nombres'));

const DECL      = JSON.parse(fs.readFileSync(abs('data/decreto/zonas_aviso.json'), 'utf8'));
const INSUMO    = JSON.parse(fs.readFileSync(abs('data/decreto/jurisdicciones_v2.json'), 'utf8'));
const CONTACTOS = JSON.parse(fs.readFileSync(abs('src/data/bahia-capitania-map.json'), 'utf8'));

const J = new Map(INSUMO.jurisdicciones.map(j => [j.id, j]));

L('================================================================================');
L('LOS DOS NIVELES DE CADA ZONA — que mira el guard y que no');
L('================================================================================');
L('');
L(`  zonas declaradas : ${DECL.zonas.length}`);
L('');
L('  zona                 tipo          bahia  mapa.cap             decr.cap             coincCap  mapa.gob         decr.gob         coincGob');
L('  -------------------- ------------- -----  -------------------- -------------------- --------  ---------------- ---------------- --------');

let comparadas = 0;
const soloCap = [];   // discrepa el nivel Capitania
const soloGob = [];   // discrepa el nivel Gobernacion
const ninguno = [];   // coinciden los dos

for (const z of DECL.zonas) {
  const c = z.contacto;
  const j = J.get(z.jurisdiccion_id);
  if (!j) { L(`ABORTA — la zona '${z.jurisdiccion_id}' no existe en el insumo.`); process.exit(3); }

  // Las bahias que la zona pone en juego, sea cual sea el tipo de contacto.
  const ids = c.tipo === 'sin_contacto'
    ? (c.bahias_en_discrepancia || [])
    : (Number.isInteger(c.bahia_id) ? [c.bahia_id] : []);

  for (const id of ids) {
    const e = CONTACTOS[String(id)];
    if (!e) { L(`ABORTA — la bahia ${id} no existe en el mapa.`); process.exit(3); }
    comparadas++;

    // Los dos niveles se miden POR SEPARADO y sin corto-circuito. Es lo unico
    // que este instrumento hace distinto del guard, y es todo el punto.
    const coincCap = mismoNombre(e.capitania, j.nombre);
    const coincGob = mismoNombre(e.gobernacion, j.gobernacion);

    const fila = { zona: z.jurisdiccion_id, tipo: c.tipo, bahia: id, e, j };
    if (!coincCap && coincGob) soloCap.push(fila);
    else if (coincCap && !coincGob) soloGob.push(fila);
    else if (coincCap && coincGob) ninguno.push(fila);

    L('  ' + [
      String(z.jurisdiccion_id).padEnd(20),
      String(c.tipo).padEnd(13),
      String(id).padStart(5),
      String(e.capitania).padEnd(20),
      String(j.nombre).padEnd(20),
      String(coincCap).padEnd(8),
      String(e.gobernacion).padEnd(16),
      String(j.gobernacion).padEnd(16),
      String(coincGob),
    ].join(' '));
  }
}

L('');
L(`  COMPARACIONES EFECTIVAS : ${comparadas}`);
if (comparadas === 0) {
  L('');
  L('ABORTA — cero comparaciones efectivas: ninguna zona pone una bahia en juego.');
  process.exit(3);
}

L('');
L('  REPARTO POR NIVEL QUE DISCREPA');
L(`    discrepa SOLO el nivel Capitania   : ${soloCap.length}`);
L(`    discrepa SOLO el nivel Gobernacion : ${soloGob.length}`);
L(`    coinciden los dos niveles          : ${ninguno.length}`);
L(`    discrepan los dos                  : ${comparadas - soloCap.length - soloGob.length - ninguno.length}`);

L('');
L('  EL QUE EL GUARD DE HOY NO PUEDE VER — discrepa la Gobernacion con la');
L('  Capitania escrita, o sea que `coincideGob` de :110 ni se evalua:');
if (soloGob.length === 0) {
  L('    (ninguno)');
} else {
  for (const f of soloGob) {
    L('');
    L(`    zona '${f.zona}'  bahia ${f.bahia}  [tipo declarado hoy: ${f.tipo}]`);
    L(`      nivel Capitania  : mapa "${f.e.capitania}"  ==  decreto "${f.j.nombre}"   -> COINCIDE, el contacto se puede dar`);
    L(`      nivel Gobernacion: mapa "${f.e.gobernacion}"  !=  decreto "${f.j.gobernacion}"  -> DISCREPA, y viaja sin marca`);
    L(`      telefono que el mapa ofrece : ${JSON.stringify(f.e.telefono)}`);
  }
}

L('');
L('  LAS QUE DISCREPAN EN EL NIVEL CAPITANIA, con el tipo que HOY declaran.');
L('  Se separan las dos formas de no coincidir, porque no son lo mismo:');
L('    ATRIBUIDA A OTRA — el mapa nombra una Capitania distinta de la del decreto;');
L('    SIN ATRIBUIR     — el mapa no atribuye ninguna (`capitania: null`). `mismoNombre`');
L('                       devuelve false para el vacio, y eso es correcto —un dato');
L('                       faltante no calza— pero la lectura humana es otra, y es la');
L('                       que habilita el `tipo: gobernacion` en vez de `sin_contacto`.');
for (const f of soloCap) {
  const forma = f.e.capitania == null ? 'SIN ATRIBUIR   ' : 'ATRIBUIDA A OTRA';
  L(`    ${String(f.zona).padEnd(20)} bahia ${String(f.bahia).padStart(4)}  [${String(f.tipo).padEnd(12)}] ${forma}  ` +
    `mapa ${JSON.stringify(f.e.capitania)} != decreto "${f.j.nombre}"`);
}

L('');
L('  LAS QUE COINCIDEN EN LOS DOS NIVELES — no tienen nada que declarar:');
for (const f of ninguno) {
  L(`    ${String(f.zona).padEnd(20)} bahia ${String(f.bahia).padStart(4)}  [${f.tipo}]`);
}

L('');
L('================================================================================');
L('  QUE CONTESTA ESTA MEDICION: cuantas zonas estan en la condicion de');
L('  `puerto_eden` —contacto que SI se da, con el otro nivel en desacuerdo— y');
L('  que el guard de hoy no puede ver. La respuesta es el conteo de arriba, no');
L('  una lista escrita a mano.');
L('================================================================================');
