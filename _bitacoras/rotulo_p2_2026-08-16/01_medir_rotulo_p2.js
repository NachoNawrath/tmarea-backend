'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_rotulo_p2.js — cuantas de las 164 entradas del mapa CAMBIAN de rotulo
// si P2 (`tmarea-pwa/src/screens/P3_VoyageVerification.jsx:250`) deja de afirmar
// "Capitania de Puerto de" por literal y pasa a rotular con el nivel que el
// motor ya resolvio en el campo `contacto`.
//
// NO INVENTA CRITERIO. Importa `contactoPorEscalon` —la implementacion
// versionada de la prelacion de INV-10.1— y las dos etiquetas se leen del propio
// `useVoyageVerification.js` de la PWA por literal, no se transcriben aca.
//
// LA LINEA BASE ES PARTE DE LA MEDICION. Aborta si:
//   · el mapa no trae 164 entradas;
//   · `contactoPorEscalon` no reproduce la vara publicada 99 / 65 / 0;
//   · el literal duro de P2 no esta en la linea declarada del archivo de la PWA;
//   · las comparaciones efectivas son cero.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const RAIZ_BACKEND = path.join(__dirname, '..', '..');
const RAIZ_PWA = path.join(RAIZ_BACKEND, '..', 'tmarea-pwa');

const { contactoPorEscalon } = require(path.join(RAIZ_BACKEND, 'src', 'services', 'contacto-por-escalon'));
const MAPA = require(path.join(RAIZ_BACKEND, 'src', 'data', 'bahia-capitania-map.json'));

const out = [];
const P = (s = '') => { out.push(s); console.log(s); };
const abortar = (msg) => { P(''); P('ABORTA: ' + msg); fs.writeFileSync(SALIDA, out.join('\n') + '\n', 'utf8'); process.exit(3); };
const SALIDA = path.join(__dirname, '01_medir_rotulo_p2.txt');

P('================================================================================');
P('MEDICION P2 — el rotulo del aviso de arribada forzosa');
P('================================================================================');
P('');

// ── (0) linea base ──────────────────────────────────────────────────────────
const claves = Object.keys(MAPA);
P('(0) LINEA BASE');
P('    entradas de bahia-capitania-map.json : ' + claves.length);
if (claves.length !== 164) abortar(`el mapa trae ${claves.length} entradas y la vara publicada es 164`);

// El literal duro de P2, comprobado en LA LINEA DECLARADA. Dos salidas pueden
// emitir el mismo texto, asi que no alcanza con que el literal exista.
const RUTA_P2 = path.join(RAIZ_PWA, 'src', 'screens', 'P3_VoyageVerification.jsx');
if (!fs.existsSync(RUTA_P2)) abortar(`no existe ${RUTA_P2} — el mapa de cableado del Tramo A/B lo ubica en src/components/, y ahi NO esta`);
const lineasP2 = fs.readFileSync(RUTA_P2, 'utf8').replace(/\r\n/g, '\n').split('\n');
const LINEA_DECLARADA = 250;
const literalP2 = lineasP2[LINEA_DECLARADA - 1];
P('    ' + path.relative(RAIZ_PWA, RUTA_P2).replace(/\\/g, '/') + ':' + LINEA_DECLARADA);
P('      ' + JSON.stringify(literalP2));
if (!/Capitan[ií]a de Puerto de \{nombre\}/.test(literalP2 || '')) {
  abortar(`la linea ${LINEA_DECLARADA} no trae el literal duro medido el 08-16 — el arbol se movio o la linea es otra`);
}
const ocurrencias = lineasP2.filter(l => /Capitan[ií]a de Puerto de \{nombre\}/.test(l)).length;
P('      ocurrencias del mismo literal en todo el archivo : ' + ocurrencias);

// Las dos etiquetas se LEEN de la PWA, no se transcriben.
const RUTA_HOOK = path.join(RAIZ_PWA, 'src', 'hooks', 'useVoyageVerification.js');
const hook = fs.readFileSync(RUTA_HOOK, 'utf8').replace(/\r\n/g, '\n');
const mCap = hook.match(/nivel === 'capitania'\) return '([^']+)'/);
const mGob = hook.match(/nivel === 'gobernacion'\) return '([^']+)'/);
if (!mCap || !mGob) abortar('no se pudieron leer las dos etiquetas de etiquetaDeNivel() en useVoyageVerification.js');
const ETQ = { capitania: mCap[1], gobernacion: mGob[1] };
P('    etiquetaDeNivel() leida de la PWA :');
P("      capitania   -> " + JSON.stringify(ETQ.capitania));
P("      gobernacion -> " + JSON.stringify(ETQ.gobernacion));
P('');

// ── (1) la vara del escalon ─────────────────────────────────────────────────
const escalon = { capitania: 0, gobernacion: 0, nulo: 0 };
const resueltos = new Map();
for (const k of claves) {
  const c = contactoPorEscalon(MAPA[k]);
  resueltos.set(k, c);
  if (c.nivel === 'capitania') escalon.capitania++;
  else if (c.nivel === 'gobernacion') escalon.gobernacion++;
  else escalon.nulo++;
}
P('(1) VARA DE INV-10.1 — reproducida con la implementacion versionada');
P('    escalon 1 (capitania)   : ' + escalon.capitania);
P('    escalon 2 (gobernacion) : ' + escalon.gobernacion);
P('    escalon 3 (nulo)        : ' + escalon.nulo);
P('    suma                    : ' + (escalon.capitania + escalon.gobernacion + escalon.nulo));
if (escalon.capitania !== 99 || escalon.gobernacion !== 65 || escalon.nulo !== 0) {
  abortar(`la vara publicada es 99 / 65 / 0 y salio ${escalon.capitania} / ${escalon.gobernacion} / ${escalon.nulo}`);
}
P('    -> reproduce la vara publicada en CONTRATO_MOTOR.md §5.1. Sigue.');
P('');

// ── (2) rotulo viejo vs rotulo nuevo ────────────────────────────────────────
// VIEJO, transcripcion de las lineas 237 y 250 tal como estan hoy:
//   const nombre = rec?.capitania || rec?.gobernacion || rec?.nombre || 'destino';
//   <strong>Capitania de Puerto de {nombre}</strong>
// `rec.nombre` es el nombre del PUERTO que la PWA le paso al endpoint, no el de
// una reparticion; no se puede derivar del mapa y se marca aparte.
const rotuloViejo = (e) => {
  const nombre = e.capitania || e.gobernacion || null;
  return nombre === null ? null : `Capitanía de Puerto de ${nombre}`;
};
const rotuloNuevo = (c) => (c.nivel && c.nombre ? `${ETQ[c.nivel]} ${c.nombre}` : null);

let comparadas = 0;
let iguales = 0;
const cambian = { solo_etiqueta: [], etiqueta_y_nombre: [], cae_a_puerto: [] };

for (const k of claves) {
  const e = MAPA[k];
  const c = resueltos.get(k);
  const v = rotuloViejo(e);
  const n = rotuloNuevo(c);
  if (v === null) { cambian.cae_a_puerto.push(k); continue; }
  comparadas++;
  if (v === n) { iguales++; continue; }
  // ¿cambia solo la etiqueta, o tambien el nombre que se le muestra al patron?
  const nombreViejo = e.capitania || e.gobernacion;
  if (nombreViejo === c.nombre) cambian.solo_etiqueta.push(k);
  else cambian.etiqueta_y_nombre.push(k);
}

if (comparadas === 0) abortar('cero comparaciones efectivas');

P('(2) ROTULO DE HOY vs ROTULO CON EL ARREGLO — denominador 164 entradas del mapa');
P('    comparaciones efectivas          : ' + comparadas);
P('    NO cambian (ya decian la verdad) : ' + iguales);
P('    CAMBIAN                          : ' + (cambian.solo_etiqueta.length + cambian.etiqueta_y_nombre.length));
P('      · solo la etiqueta             : ' + cambian.solo_etiqueta.length +
  '   (la entrada no nombra Capitania; hoy se rotula "Capitanía de Puerto de" sobre una Gobernación)');
P('      · etiqueta Y nombre            : ' + cambian.etiqueta_y_nombre.length +
  '   (la entrada nombra Capitania pero el telefono no es el suyo: baja al escalon 2)');
P('    sin nombre en el mapa            : ' + cambian.cae_a_puerto.length +
  '   (hoy caerian al nombre del puerto o a "destino")');
P('    suma                             : ' + (iguales + cambian.solo_etiqueta.length + cambian.etiqueta_y_nombre.length + cambian.cae_a_puerto.length));
P('');

const muestra = (titulo, ids, n = 6) => {
  if (ids.length === 0) return;
  P('    ' + titulo);
  for (const k of ids.slice(0, n)) {
    const e = MAPA[k], c = resueltos.get(k);
    P(`      id ${k}: HOY  ${JSON.stringify(rotuloViejo(e))}`);
    P(`      ${' '.repeat(String(k).length)}   NUEVO ${JSON.stringify(rotuloNuevo(c))}`);
    P(`      ${' '.repeat(String(k).length)}   motivo: ${c.motivo}`);
  }
  if (ids.length > n) P(`      … y ${ids.length - n} mas`);
  P('');
};
muestra('MUESTRA — solo cambia la etiqueta:', cambian.solo_etiqueta);
muestra('MUESTRA — cambian etiqueta y nombre:', cambian.etiqueta_y_nombre);

// ── (3) el telefono dentro del mensaje normativo ────────────────────────────
let conTelefono = 0, atomicos = 0;
for (const k of claves) {
  const c = resueltos.get(k);
  if (c.telefono) conTelefono++;
  if (c.telefono_atomico === true) atomicos++;
}
P('(3) EL TELEFONO — hoy se renderiza dentro del aviso de arribada forzosa');
P('    entradas con telefono           : ' + conTelefono + ' / 164');
P('    de esas, atomicas (tel: valido) : ' + atomicos);
P('    NO atomicas rendereadas hoy como enlace por la linea 255 : ' + (conTelefono - atomicos));
P('');
P('    INV-10.1, primera frase: el contacto se muestra "sólo en el punto de zarpe');
P('    y en el de recalada, nunca dentro de un mensaje normativo".');
P('');

P('================================================================================');
P('FIN — sin abortos. Comparaciones efectivas: ' + comparadas);
P('================================================================================');

fs.writeFileSync(SALIDA, out.join('\n') + '\n', 'utf8');
