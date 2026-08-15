/**
 * FASE 3 — VERIFICACION. Solo lectura: no escribe en data/.
 *
 * Compara POR CODEPOINT, no por glifo. Dos cadenas que se ven iguales pueden
 * diferir en su secuencia de puntos de codigo ("Í" es U+00CD o bien "I"+U+0301,
 * y se dibujan igual). Por eso:
 *   · toda igualdad se decide sobre los BYTES UTF-8 de la cadena, que estan en
 *     biyeccion con la secuencia de codepoints;
 *   · de los campos con no-ASCII se imprime la secuencia de codepoints;
 *   · se declara si alguna cadena no esta en forma NFC, que es donde vive la
 *     trampa de las dos representaciones.
 *
 * Falla ruidoso: cualquier control en rojo pone el codigo de salida en 1 y la
 * fase NO se puede dar por buena.
 *
 * Shell declarada (§7.3). Para el owner, en PowerShell, desde la raiz:
 *     node _bitacoras\barrido_23_sin_par_2026-08-14\fase3\verificar_fase3.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const D3 = __dirname;
const V1 = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_capitanias.json');
const V2 = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json');
// El v2 de HEAD NO se guarda como archivo (362 KB, sobre el umbral de §3.5): se
// saca del propio repositorio, que es la fuente reproducible (§3.4).
const V2_HEAD_CMD = 'git show HEAD:data/decreto/jurisdicciones_v2.json';
// Del v2 regenerado en la copia descartable se conservo lo unico que esta prueba
// compara —`puntos_notables` y `derivado_de`—; el archivo completo se borro por
// el mismo umbral, con su PROCEDENCIA.txt al lado.
const REGEN_PN = path.join(D3, '11_puntos_notables_regenerado.json');
const REGEN_DD = path.join(D3, '12_derivado_de_regenerado.json');

const leer = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const bytes = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x), 'utf8');
const sha = (x) => crypto.createHash('sha256').update(bytes(x)).digest('hex');
const igualCodepoint = (a, b) => bytes(a).equals(bytes(b));
const codepoints = (s) => Array.from(s).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
const noAscii = (s) => Array.from(s).filter((c) => c.codePointAt(0) > 127);

const NOMBRES = ['El Manzanito (rio Bueno)', 'Los Patos (rio Bueno)', 'La Goleta (rio Bueno)'];
const IGM = ['Punta Anxious', 'Peninsula Brecknock', 'Punta Harry', 'Cabo San Vicente'];

let fallos = 0;
const L = (s = '') => console.log(s);
const ok = (m) => L('  [ OK ]   ' + m);
const mal = (m) => { fallos++; L('  [FALLO]  ' + m); };
const H = (t) => { L(''); L('='.repeat(78)); L(t); L('='.repeat(78)); };

const v1 = leer(V1);
const v2 = leer(V2);
const head = JSON.parse(require('child_process').execSync(V2_HEAD_CMD, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));

L('VERIFICACION DE LA FASE 3 — camino B, los tres sectores del rio Bueno');
L(`v1 : ${path.relative(RAIZ, V1)}  sha256 ${crypto.createHash('sha256').update(fs.readFileSync(V1)).digest('hex')}`);
L(`v2 : ${path.relative(RAIZ, V2)}  sha256 ${crypto.createHash('sha256').update(fs.readFileSync(V2)).digest('hex')}`);
L(`referencia de HEAD: ${V2_HEAD_CMD}  (${head.puntos_notables.length} puntos_notables)`);

// ── A ────────────────────────────────────────────────────────────────────────
H('A — LA PRUEBA CORRIDA: el v2 regenerado desde el v1 actual');
if (!fs.existsSync(REGEN_PN) || !fs.existsSync(REGEN_DD)) {
  mal('no esta la evidencia de la copia regenerada; la prueba no se corrio');
} else {
  const regen = { puntos_notables: leer(REGEN_PN), derivado_de: leer(REGEN_DD) };
  L(`  regenerado: ${regen.puntos_notables.length} puntos_notables · quirurgico: ${v2.puntos_notables.length} · v1: ${v1.puntos_notables.length}`);
  L('  (el regenerado NO lleva las 4 del IGM: las escribe un script posterior, no la migracion)');
  L('');

  // A1 — la migracion COPIA la lista del v1: tienen que ser identicas.
  igualCodepoint(regen.puntos_notables, v1.puntos_notables)
    ? ok('A1 · el `puntos_notables` regenerado es identico al del v1, por codepoint')
    : mal('A1 · el `puntos_notables` regenerado NO coincide con el del v1');

  // A2 — el quirurgico, sacando las 4 del IGM, tiene que ser ese mismo.
  const quirSinIgm = v2.puntos_notables.filter((p) => !IGM.includes(p.nombre));
  igualCodepoint(quirSinIgm, regen.puntos_notables)
    ? ok('A2 · el quirurgico menos las 4 del IGM es identico al regenerado, por codepoint (mismo contenido Y mismo orden)')
    : mal('A2 · el quirurgico menos las 4 del IGM difiere del regenerado');

  // A3 — el sha que la migracion escribe es el que quedo en el quirurgico.
  const shaReal = crypto.createHash('sha256').update(fs.readFileSync(V1)).digest('hex');
  const dRegen = regen.derivado_de['jurisdicciones_capitanias.json'];
  const dQuir = v2.derivado_de['jurisdicciones_capitanias.json'];
  (dRegen === shaReal && dQuir === shaReal)
    ? ok(`A3 · derivado_de[v1] escrito a mano == el que escribe la migracion == el v1 en disco (${shaReal.slice(0, 16)}…)`)
    : mal(`A3 · no coinciden: regenerado ${String(dRegen).slice(0, 16)} / quirurgico ${String(dQuir).slice(0, 16)} / disco ${shaReal.slice(0, 16)}`);
}

// ── B ────────────────────────────────────────────────────────────────────────
H('B — LOS TRES PUNTOS EN v1 Y EN v2, Y SUS DECIMALES');
const dec = (d) => { const [g, m, s, h] = d.split(' '); const v = +g + m / 60 + s / 3600; return /^[SW]$/.test(h) ? -v : v; };
for (const n of NOMBRES) {
  const a = v1.puntos_notables.find((p) => igualCodepoint(p.nombre, n));
  const b = v2.puntos_notables.find((p) => igualCodepoint(p.nombre, n));
  if (!a) { mal(`B · "${n}" no esta en el v1`); continue; }
  if (!b) { mal(`B · "${n}" no esta en el v2`); continue; }
  if (!igualCodepoint(a, b)) { mal(`B · "${n}": la entrada del v1 y la del v2 difieren`); continue; }
  const dLat = Math.abs(dec(a.lat_dms) - a.lat), dLon = Math.abs(dec(a.lon_dms) - a.lon);
  if (dLat > 5e-7 || dLon > 5e-7) { mal(`B · "${n}": el decimal no reproduce el DMS (dlat ${dLat}, dlon ${dLon})`); continue; }
  ok(`B · ${n.padEnd(26)} v1==v2 por codepoint · ${a.lat_dms} -> ${a.lat} · ${a.lon_dms} -> ${a.lon} (delta < 5e-7)`);
}
// Orden Norte->Sur en el tramo tocado, en los dos archivos.
for (const [etq, doc] of [['v1', v1], ['v2', v2]]) {
  const i = doc.puntos_notables.findIndex((p) => p.nombre === 'Ribera Sur rio Bueno');
  const lats = doc.puntos_notables.slice(i, i + 5).map((p) => p.lat);
  const bien = lats.every((v, k) => k === 0 || v <= lats[k - 1]);
  bien ? ok(`B · ${etq}: orden Norte->Sur en el tramo insertado (${lats.join(' -> ')})`)
    : mal(`B · ${etq}: el orden Norte->Sur se rompe (${lats.join(' -> ')})`);
}

// ── C ────────────────────────────────────────────────────────────────────────
H('C — LAS CUATRO DEL IGM, INTACTAS CON SUS ADJUDICACIONES');
for (const n of IGM) {
  const a = head.puntos_notables.find((p) => p.nombre === n);
  const b = v2.puntos_notables.find((p) => p.nombre === n);
  if (!a) { mal(`C · "${n}" no estaba en HEAD; la referencia esta mal`); continue; }
  if (!b) { mal(`C · "${n}" NO esta en el v2 actual: se perdio`); continue; }
  if (!igualCodepoint(a, b)) {
    mal(`C · "${n}" cambio respecto de HEAD (sha ${sha(a).slice(0, 16)} -> ${sha(b).slice(0, 16)})`);
    continue;
  }
  const campos = ['motivo_eleccion', 'descartados', 'nota_grafia', 'usado_por', 'fuente'];
  const presentes = campos.filter((c) => c in b);
  ok(`C · ${n.padEnd(20)} identico a HEAD por codepoint · sha ${sha(b).slice(0, 16)} · adjudicacion: ${presentes.join(', ')}`);
}
L('');
L('  Los no-ASCII de esas cuatro entradas, con su codepoint (aca es donde el glifo enganaria):');
for (const n of IGM) {
  const b = v2.puntos_notables.find((p) => p.nombre === n);
  if (!b) continue;
  (function walk(o, ruta) {
    if (typeof o === 'string') {
      const raros = noAscii(o);
      if (raros.length) {
        const unicos = [...new Set(raros)];
        L(`    ${n} ${ruta}: ${unicos.map((c) => `'${c}' ${codepoints(c)}`).join('  ')}`);
        if (o !== o.normalize('NFC')) mal(`C · "${n}"${ruta} NO esta en forma NFC: hay glifos compuestos por varios codepoints`);
      }
      return;
    }
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${ruta}[${i}]`));
    if (o && typeof o === 'object') return Object.keys(o).forEach((k) => walk(o[k], `${ruta}.${k}`));
  })(b, '');
}
const noNfc = v2.puntos_notables.filter((p) => JSON.stringify(p) !== JSON.stringify(p).normalize('NFC')).length;
noNfc === 0 ? ok(`C · las ${v2.puntos_notables.length} entradas de puntos_notables estan en forma NFC (0 fuera)`)
  : mal(`C · ${noNfc} entradas no estan en NFC`);

// ── D ────────────────────────────────────────────────────────────────────────
H('D — correccion_testigos, convenciones Y jurisdicciones, SIN CAMBIOS VS HEAD');
for (const k of ['correccion_testigos', 'convenciones', 'jurisdicciones']) {
  const enHead = k in head, enV2 = k in v2;
  if (!enHead) { mal(`D · "${k}" no esta en HEAD; la referencia esta mal`); continue; }
  if (!enV2) { mal(`D · "${k}" DESAPARECIO del v2`); continue; }
  igualCodepoint(head[k], v2[k])
    ? ok(`D · ${k.padEnd(20)} identico a HEAD por codepoint · ${bytes(v2[k]).length} bytes · sha ${sha(v2[k]).slice(0, 16)}`)
    : mal(`D · ${k} CAMBIO respecto de HEAD (${bytes(head[k]).length} -> ${bytes(v2[k]).length} bytes)`);
}

// ── E ────────────────────────────────────────────────────────────────────────
H('E — EL DIFF DEL v2, ACOTADO A puntos_notables Y derivado_de');
const kh = Object.keys(head), kv = Object.keys(v2);
kh.join('|') === kv.join('|')
  ? ok(`E · las ${kh.length} claves de primer nivel, las mismas y en el mismo orden`)
  : mal(`E · cambio el conjunto/orden de claves: perdidas [${kh.filter((k) => !kv.includes(k))}] nuevas [${kv.filter((k) => !kh.includes(k))}]`);
const movidas = kh.filter((k) => kv.includes(k) && !igualCodepoint(head[k], v2[k]));
igualCodepoint(movidas, ['derivado_de', 'puntos_notables'].filter((k) => movidas.includes(k))) && movidas.length === 2
  ? ok(`E · SOLO cambiaron: ${movidas.join(', ')}`)
  : mal(`E · cambiaron ${movidas.length} claves y se esperaban exactamente 2: ${movidas.join(', ') || '(ninguna)'}`);
// derivado_de: solo la entrada del v1.
const dm = Object.keys(head.derivado_de).filter((k) => head.derivado_de[k] !== v2.derivado_de[k]);
(dm.length === 1 && dm[0] === 'jurisdicciones_capitanias.json')
  ? ok('E · dentro de derivado_de solo cambio "jurisdicciones_capitanias.json"')
  : mal(`E · dentro de derivado_de cambiaron: ${dm.join(', ') || '(ninguna)'}`);
// puntos_notables: solo tres altas, ningun cambio ni baja.
const antesN = head.puntos_notables, ahoraN = v2.puntos_notables;
const altas = ahoraN.filter((p) => !antesN.some((q) => igualCodepoint(q, p)));
const bajas = antesN.filter((p) => !ahoraN.some((q) => igualCodepoint(q, p)));
(altas.length === 3 && bajas.length === 0 && altas.every((p) => NOMBRES.includes(p.nombre)))
  ? ok(`E · puntos_notables: 3 altas (${altas.map((p) => p.nombre).join(', ')}), 0 bajas, 0 modificadas`)
  : mal(`E · puntos_notables: ${altas.length} altas y ${bajas.length} bajas, se esperaban 3 y 0`);
// Las 73 de HEAD, en su orden relativo.
const resto = ahoraN.filter((p) => !NOMBRES.includes(p.nombre));
igualCodepoint(resto, antesN)
  ? ok('E · las 73 de HEAD sobreviven identicas y en el mismo orden relativo')
  : mal('E · las 73 de HEAD cambiaron de contenido o de orden');

// ── cierre ───────────────────────────────────────────────────────────────────
H(fallos === 0 ? 'RESULTADO: TODOS LOS CONTROLES EN VERDE' : `RESULTADO: ${fallos} CONTROL(ES) EN ROJO — la fase NO pasa`);
process.exit(fallos === 0 ? 0 : 1);
