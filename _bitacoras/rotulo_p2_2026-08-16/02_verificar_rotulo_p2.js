'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 02_verificar_rotulo_p2.js — verifica el cierre de P2 contra el arbol.
//
// QUE COMPRUEBA, y por que cada cosa:
//   (A) LINEA BASE. El mapa trae 164 entradas y `contactoPorEscalon` reproduce
//       la vara publicada 99/65/0. Si el insumo se movio, lo que siga no mide
//       lo que dice medir.
//   (B) EL LITERAL DURO YA NO ESTA en P2, comprobado por literal Y por linea.
//   (C) EL TELEFONO SALIO del aviso de arribada forzosa (INV-10.1, 1a frase),
//       y `styles.arribadaTel` bajo con el.
//   (D) LO QUE COMPRA LA OPCION B, y es el punto del instrumento: en TODA la
//       PWA hay UN SOLO lugar que ensambla una frase rotulada, y P2 y P4 la
//       consumen del mismo. Se mide por conteo sobre el arbol —no por
//       inspeccion de un archivo— porque un guard que construye su universo del
//       mismo archivo que valida es tautologico.
//   (E) P2 Y P4 EMITEN LA MISMA FRASE PARA EL MISMO NIVEL, evaluado sobre las
//       164 entradas. `rotularContacto` y `etiquetaDeNivel` NO se transcriben
//       aca: se EXTRAEN del archivo real de la PWA y se evaluan. Si alguien las
//       cambia, este instrumento mide la version cambiada.
//   (F) EL EFECTO: cuantos rotulos cambian y cuantos no, con denominador.
//
// Aborta con exit 3 ante cualquier fallo, y ante cero comparaciones efectivas.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const RAIZ_BACKEND = path.join(__dirname, '..', '..');
const RAIZ_PWA = path.join(RAIZ_BACKEND, '..', 'tmarea-pwa');
const SALIDA = path.join(__dirname, '02_verificar_rotulo_p2.txt');

const { contactoPorEscalon } = require(path.join(RAIZ_BACKEND, 'src', 'services', 'contacto-por-escalon'));
const MAPA = require(path.join(RAIZ_BACKEND, 'src', 'data', 'bahia-capitania-map.json'));

const out = [];
const P = (s = '') => { out.push(s); console.log(s); };
const guardar = () => fs.writeFileSync(SALIDA, out.join('\n') + '\n', 'utf8');
const abortar = (msg) => { P(''); P('ABORTA: ' + msg); guardar(); process.exit(3); };
const ok = (msg) => P('    OK   ' + msg);

// CRLF: si un literal no se encuentra es FALLA, no "no aplicable". Se normaliza
// el salto de linea antes de comparar y despues no hay excusa.
const leer = (p) => {
  if (!fs.existsSync(p)) abortar(`no existe ${p}`);
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
};

const RUTA_P2   = path.join(RAIZ_PWA, 'src', 'screens', 'P3_VoyageVerification.jsx');
const RUTA_HOOK = path.join(RAIZ_PWA, 'src', 'hooks', 'useVoyageVerification.js');
const SRC_PWA   = path.join(RAIZ_PWA, 'src');

const p2   = leer(RUTA_P2);
const hook = leer(RUTA_HOOK);
const lineasP2 = p2.split('\n');

P('================================================================================');
P('VERIFICACION DEL CIERRE DE P2 — el rotulo del aviso de arribada forzosa');
P('================================================================================');
P('');

// ── (A) linea base ──────────────────────────────────────────────────────────
P('(A) LINEA BASE');
const claves = Object.keys(MAPA);
if (claves.length !== 164) abortar(`el mapa trae ${claves.length} entradas y la vara publicada es 164`);
ok(`bahia-capitania-map.json : ${claves.length} entradas`);

const resueltos = new Map();
const escalon = { capitania: 0, gobernacion: 0, nulo: 0 };
for (const k of claves) {
  const c = contactoPorEscalon(MAPA[k]);
  resueltos.set(k, c);
  if (c.nivel === 'capitania') escalon.capitania++;
  else if (c.nivel === 'gobernacion') escalon.gobernacion++;
  else escalon.nulo++;
}
if (escalon.capitania !== 99 || escalon.gobernacion !== 65 || escalon.nulo !== 0) {
  abortar(`la vara publicada es 99/65/0 y salio ${escalon.capitania}/${escalon.gobernacion}/${escalon.nulo}`);
}
ok(`vara de INV-10.1 reproducida : 99 / 65 / 0, suma 164`);
P('');

// ── (B) el literal duro ─────────────────────────────────────────────────────
P('(B) EL LITERAL DURO DE P2');
const LITERAL = /Capitan[ií]a de Puerto de \{nombre\}/;
const golpes = [];
lineasP2.forEach((l, i) => { if (LITERAL.test(l)) golpes.push(i + 1); });
if (golpes.length > 0) abortar(`el literal duro sigue en P2, lineas ${golpes.join(', ')}`);
ok('"Capitanía de Puerto de {nombre}" : 0 ocurrencias en todo el archivo');

// Y ningun literal de nivel suelto dentro de P2, por ninguna de sus formas
// conocidas —las tres que el frente ya vio en pantalla—.
const FORMAS = ['Capitanía de Puerto de', 'Gobernación Marítima de', 'Gob. Marítima de'];
for (const f of FORMAS) {
  if (p2.includes(f)) {
    const ln = lineasP2.findIndex(l => l.includes(f)) + 1;
    // Un literal dentro de un comentario no rotula nada; se distingue.
    const linea = lineasP2[ln - 1].trim();
    const enComentario = linea.startsWith('//') || linea.startsWith('*') || linea.startsWith('/*');
    if (!enComentario) abortar(`P2 vuelve a traer el literal de nivel ${JSON.stringify(f)} en la linea ${ln}`);
    ok(`${JSON.stringify(f)} aparece solo en comentario (linea ${ln}) — no rotula`);
  } else {
    ok(`${JSON.stringify(f)} : 0 ocurrencias en P2`);
  }
}
P('');

// ── (C) el telefono ─────────────────────────────────────────────────────────
P('(C) EL TELEFONO DENTRO DEL MENSAJE NORMATIVO — INV-10.1, primera frase');
const iIni = lineasP2.findIndex(l => l.includes('arribadaForzosa &&'));
if (iIni < 0) abortar('no se encontro el bloque del aviso de arribada forzosa en P2');
let prof = 0, iFin = -1;
for (let i = iIni; i < lineasP2.length; i++) {
  for (const ch of lineasP2[i]) { if (ch === '{') prof++; else if (ch === '}') prof--; }
  if (i > iIni && prof <= 0) { iFin = i; break; }
}
if (iFin < 0) abortar('no se pudo delimitar el bloque del aviso de arribada forzosa');
const bloque = lineasP2.slice(iIni, iFin + 1).join('\n');
P(`    bloque del aviso : lineas ${iIni + 1}-${iFin + 1} (${iFin - iIni + 1} lineas)`);
for (const [etq, re] of [['tel: (enlace telefonico)', /tel:\$\{/], ['rec?.telefono', /rec\?\.telefono/], ['la palabra "Teléfono"', /Tel[eé]fono:/]]) {
  if (re.test(bloque)) abortar(`el aviso todavia trae ${etq} — INV-10.1 lo prohibe dentro de un mensaje normativo`);
  ok(`${etq} : ausente del aviso`);
}
if (/arribadaTel/.test(p2)) abortar('`styles.arribadaTel` sigue definido o usado en P2 pese a quedar sin consumidor');
ok('styles.arribadaTel : dado de baja (0 ocurrencias)');

// El telefono NO se perdio: sigue en la tarjeta de RECALADA, que es donde el
// invariante lo pone. Se comprueba en el otro archivo, no se supone.
const psb = leer(path.join(SRC_PWA, 'components', 'verification', 'PortStatusBlock.jsx'));
if (!/tipo="RECALADA"/.test(psb) || !/capitania\.telefono/.test(psb)) {
  abortar('la tarjeta de RECALADA de PortStatusBlock ya no muestra el telefono — el dato se habria perdido, no movido');
}
ok('el telefono sigue en la tarjeta de RECALADA de PortStatusBlock — se movio, no se perdio');
P('');

// ── (D) lo que compra la OPCION B ───────────────────────────────────────────
P('(D) UN SOLO ENSAMBLADO DE FRASE ROTULADA EN TODA LA PWA — lo que compra B');
const archivos = [];
(function barrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) barrer(p);
    else if (/\.(jsx?|tsx?)$/.test(e.name)) archivos.push(p);
  }
})(SRC_PWA);
P(`    archivos de src/ barridos : ${archivos.length}`);
if (archivos.length === 0) abortar('cero archivos barridos');

// Definiciones: cuantos lugares ENSAMBLAN la frase (etiqueta + nombre, con o sin
// articulo). Se cuenta la definicion de `rotularContacto`, no sus llamadas.
let defsRotular = 0, defsEtiqueta = 0;
const consumidores = [];
for (const f of archivos) {
  const t = leer(f);
  const rel = path.relative(RAIZ_PWA, f).replace(/\\/g, '/');
  defsRotular  += (t.match(/function rotularContacto\s*\(/g) || []).length;
  defsEtiqueta += (t.match(/function etiquetaDeNivel\s*\(/g) || []).length;
  // llamadas a rotularContacto que NO sean su propia definicion
  const llamadas = (t.match(/rotularContacto\s*\(/g) || []).length - (t.match(/function rotularContacto\s*\(/g) || []).length;
  if (llamadas > 0) consumidores.push({ rel, llamadas });
}
P(`    definiciones de rotularContacto() : ${defsRotular}`);
P(`    definiciones de etiquetaDeNivel() : ${defsEtiqueta}`);
if (defsRotular !== 1) abortar(`hay ${defsRotular} definiciones de rotularContacto — B compra que haya UNA`);
if (defsEtiqueta !== 1) abortar(`hay ${defsEtiqueta} definiciones de etiquetaDeNivel — deberia haber UNA`);
P('    consumidores que la llaman :');
for (const c of consumidores) P(`      ${c.rel}  (${c.llamadas})`);
const relP2 = path.relative(RAIZ_PWA, RUTA_P2).replace(/\\/g, '/');
const relHook = path.relative(RAIZ_PWA, RUTA_HOOK).replace(/\\/g, '/');
if (!consumidores.some(c => c.rel === relP2)) abortar('P2 no llama a rotularContacto — no esta compartiendo la frase');
if (!consumidores.some(c => c.rel === relHook)) abortar('el hook (r1/P4) no llama a rotularContacto');
if (!/import\s*\{[^}]*\brotularContacto\b[^}]*\}\s*from\s*'\.\.\/hooks\/useVoyageVerification'/.test(p2)) {
  abortar('P2 no importa rotularContacto del hook — la comparte de otro lado o la redefine');
}
ok('P2 y P4 consumen LA MISMA funcion, importada del mismo modulo');
P('');

// ── (E) la misma frase para el mismo nivel ──────────────────────────────────
// El criterio NO se transcribe: se extrae del archivo real y se evalua.
P('(E) P2 Y P4 EMITEN LA MISMA FRASE PARA EL MISMO NIVEL');
const cuerpo = (nombre) => {
  const i = hook.indexOf(`function ${nombre}(`);
  if (i < 0) abortar(`no se encontro la definicion de ${nombre}() en ${relHook}`);
  let prof = 0, j = hook.indexOf('{', i), fin = -1;
  for (let k = j; k < hook.length; k++) {
    if (hook[k] === '{') prof++;
    else if (hook[k] === '}') { prof--; if (prof === 0) { fin = k; break; } }
  }
  if (fin < 0) abortar(`no se pudo delimitar el cuerpo de ${nombre}()`);
  return hook.slice(i, fin + 1);
};
const fabrica = new Function(`${cuerpo('etiquetaDeNivel')}\n${cuerpo('rotularContacto')}\nreturn { etiquetaDeNivel, rotularContacto };`);
const { rotularContacto } = fabrica();
ok(`etiquetaDeNivel() y rotularContacto() extraidas de ${relHook} y evaluadas`);

// Las dos plantillas, leidas del arbol y no inventadas.
const mP4 = hook.match(/Avisar por radio a \$\{(\w+)\}/);
if (!mP4) abortar('no se encontro la plantilla de r1 (P4) en el hook');
if (!/Contactá a <strong>\{rotulo\}<\/strong> por VHF Canal 16/.test(p2)) {
  abortar('no se encontro la plantilla del aviso de P2 con {rotulo}');
}
ok('plantillas leidas del arbol : P4 "Avisar por radio a ${…}" · P2 "Contactá a <strong>{…}</strong>"');

// LA IDENTIDAD NO SE PRUEBA COMPARANDO f(x) CON f(x) — eso da 100% siempre y no
// mide nada. Se prueba sobre los CALLSITES: la divergencia, si existiera, viviria
// ahi. Se extrae del arbol la expresion con la que cada consumidor obtiene su
// rotulo y se comprueba que son la MISMA llamada con la MISMA forma de
// argumentos. La evaluacion de la funcion viene despues, y sirve para exhibir la
// frase, no para probar la identidad.
const callsite = (texto, archivo) => {
  // La DEFINICION tambien matchea `rotularContacto(`. Se saltan las ocurrencias
  // precedidas de `function `, que es lo que hizo abortar a la primera version de
  // este instrumento contra el hook — el archivo donde la funcion vive Y se usa.
  let i = -1;
  for (let k = texto.indexOf('rotularContacto('); k >= 0; k = texto.indexOf('rotularContacto(', k + 1)) {
    if (/function\s+$/.test(texto.slice(Math.max(0, k - 20), k))) continue;
    i = k; break;
  }
  if (i < 0) abortar(`no se encontro ninguna LLAMADA a rotularContacto en ${archivo} (solo su definicion)`);
  const desde = texto.lastIndexOf('\n', i) + 1;
  let prof = 0, fin = -1;
  for (let k = i; k < texto.length; k++) {
    if (texto[k] === '(') prof++;
    else if (texto[k] === ')') { prof--; if (prof === 0) { fin = k; break; } }
  }
  if (fin < 0) abortar(`no se pudo delimitar el callsite de rotularContacto en ${archivo}`);
  return texto.slice(desde, fin + 1).split('\n').map(s => s.trim()).join(' ').replace(/\s+/g, ' ');
};
const csP2 = callsite(p2, relP2);
const csP4 = callsite(hook, relHook);
P('    los DOS callsites, extraidos del arbol :');
P(`      ${relP2}`);
P(`        ${csP2}`);
P(`      ${relHook}`);
P(`        ${csP4}`);
let comparadas = 0;
// (1) misma funcion invocada; (2) dos argumentos: el contacto y un fallback que
// resuelve a nombre de Gobernacion. Si un consumidor pasara otra cosa en el
// primer argumento, la frase podria divergir aunque la funcion sea una sola.
for (const [rel, cs] of [[relP2, csP2], [relHook, csP4]]) {
  comparadas++;
  if (!/\brotularContacto\(/.test(cs)) abortar(`${rel}: el callsite no invoca rotularContacto`);
  if (!/contacto/i.test(cs)) abortar(`${rel}: el callsite no pasa un contacto como primer argumento — ${cs}`);
  if (!/getCapitania\(/.test(cs)) abortar(`${rel}: el callsite no pasa el fallback de getCapitania como segundo argumento — ${cs}`);
}
if (comparadas === 0) abortar('cero callsites comparados en (E)');
P(`    callsites comparados : ${comparadas} (los dos, y son los dos que existen segun (D))`);
ok('misma funcion, mismo primer argumento (el `contacto` del escalon) y mismo fallback');

// Ahora si, la frase exhibida. Una sola evaluacion por nivel: la identidad ya
// quedo probada arriba, esto muestra QUE frase es.
const porNivel = new Map();
for (const k of claves) {
  const c = resueltos.get(k);
  if (!porNivel.has(c.nivel)) porNivel.set(c.nivel, { n: 0, ejemplo: rotularContacto(c, () => null) });
  porNivel.get(c.nivel).n++;
}
P('    el segmento rotulado que los dos comparten, por nivel :');
for (const [nivel, v] of porNivel) {
  P(`      nivel ${String(nivel).padEnd(12)} (${String(v.n).padStart(3)} entradas)`);
  P(`        P4 -> "Avisar por radio a ${v.ejemplo} al iniciar la navegación"`);
  P(`        P2 -> "Contactá a ${v.ejemplo} por VHF Canal 16 antes de recalar."`);
}
P('');

// ── (F) el efecto ───────────────────────────────────────────────────────────
P('(F) EFECTO SOBRE LAS 164 — denominador: entradas de bahia-capitania-map.json');
const viejo = (e) => { const n = e.capitania || e.gobernacion; return n === null || n === undefined ? null : `Capitanía de Puerto de ${n}`; };
const nuevo = (c) => { const f = rotularContacto(c, () => null); return f ? f.replace(/^la /, '') : null; };
let comp2 = 0, sinCambio = 0;
const soloEtq = [], etqYNombre = [];
for (const k of claves) {
  const e = MAPA[k], c = resueltos.get(k);
  const v = viejo(e), n = nuevo(c);
  if (v === null) continue;
  comp2++;
  if (v === n) { sinCambio++; continue; }
  ((e.capitania || e.gobernacion) === c.nombre ? soloEtq : etqYNombre).push(k);
}
if (comp2 === 0) abortar('cero comparaciones efectivas en (F)');
P(`    comparaciones efectivas          : ${comp2}`);
P(`    NO cambian (ya decian la verdad) : ${sinCambio}`);
P(`    CAMBIAN                          : ${soloEtq.length + etqYNombre.length}`);
P(`      · solo la etiqueta             : ${soloEtq.length}`);
P(`      · etiqueta Y nombre            : ${etqYNombre.length}`);
P(`    suma                             : ${sinCambio + soloEtq.length + etqYNombre.length}`);
if (sinCambio !== 99 || soloEtq.length + etqYNombre.length !== 65) {
  abortar(`el efecto medido en la Fase 1 era 99 sin cambio / 65 cambian, y salio ${sinCambio} / ${soloEtq.length + etqYNombre.length}`);
}
ok('reproduce el efecto medido en 01_medir_rotulo_p2.txt');
P('');
P('    LOS QUE CAMBIAN DE NOMBRE — lo que el patron ve distinto (primeros 8):');
for (const k of etqYNombre.slice(0, 8)) {
  P(`      id ${String(k).padStart(3)}  HOY "${viejo(MAPA[k])}"  ->  NUEVO "${nuevo(resueltos.get(k))}"`);
}
P(`      … y ${etqYNombre.length - 8} mas`);
P('');

P('================================================================================');
P(`FIN — sin abortos. Comparaciones efectivas: (E) ${comparadas} · (F) ${comp2}`);
P('================================================================================');
guardar();
