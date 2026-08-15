/**
 * FASE 3 — VERIFICACION del ancla de `puerto_williams`. Solo lectura.
 *
 * Compara POR CODEPOINT, no por glifo: toda igualdad se decide sobre los bytes
 * UTF-8, que estan en biyeccion con la secuencia de puntos de codigo. De los
 * campos con no-ASCII se imprime el codepoint, y se declara si alguna cadena no
 * esta en forma NFC — que es donde vive la trampa de las dos representaciones.
 *
 * LA REFERENCIA VA ANCLADA A UN COMMIT FIJO, NO A `HEAD`. Ayer este mismo
 * instrumento uso `HEAD` y los controles se pusieron en rojo solos al commitear,
 * sin que el dato cambiara. Una referencia relativa sirve una sola vez.
 *
 * Falla ruidoso: cualquier control en rojo pone el codigo de salida en 1.
 *
 * Shell declarada (§7.3). Para el owner, en PowerShell, desde la raiz:
 *     node _bitacoras\no_cerrables_2026-08-15\verificar_ancla_pw.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const V1 = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_capitanias.json');
const V2 = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json');
const COMMIT_ANTES = 'bf66ab2';   // ultimo commit antes de esta fase

const bytes = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x), 'utf8');
const sha = (x) => crypto.createHash('sha256').update(bytes(x)).digest('hex');
const igual = (a, b) => bytes(a).equals(bytes(b));
const cps = (s) => Array.from(s).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
const noAscii = (s) => [...new Set(Array.from(s).filter((c) => c.codePointAt(0) > 127))];

const IGM = ['Punta Anxious', 'Peninsula Brecknock', 'Punta Harry', 'Cabo San Vicente'];
const LACUSTRES = ['lago_rapel', 'lago_villarrica', 'lago_panguipulli', 'lago_ranco', 'puerto_varas', 'lago_general_carrera'];

let fallos = 0;
const L = (s = '') => console.log(s);
const ok = (m) => L('  [ OK ]   ' + m);
const mal = (m) => { fallos++; L('  [FALLO]  ' + m); };
const H = (t) => { L(''); L('='.repeat(78)); L(t); L('='.repeat(78)); };

const v1 = JSON.parse(fs.readFileSync(V1, 'utf8'));
const v2 = JSON.parse(fs.readFileSync(V2, 'utf8'));
const leerDe = (c, p) => JSON.parse(execSync(`git show ${c}:${p}`, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const a1 = leerDe(COMMIT_ANTES, 'data/decreto/jurisdicciones_capitanias.json');
const a2 = leerDe(COMMIT_ANTES, 'data/decreto/jurisdicciones_v2.json');

L('VERIFICACION — el ancla de puerto_williams (camino A, owner 2026-08-15)');
L(`v1 en disco : sha256 ${crypto.createHash('sha256').update(fs.readFileSync(V1)).digest('hex')}`);
L(`v2 en disco : sha256 ${crypto.createHash('sha256').update(fs.readFileSync(V2)).digest('hex')}`);
L(`referencia  : git show ${COMMIT_ANTES}:…  (v1 con ${a1.capitanias.filter((c) => c.punto_interior).length} punto_interior)`);

// ── A ───────────────────────────────────────────────────────────────────────
H('A — EL ANCLA EN EL v1, CON LA FORMA Y EL TEXTO DE LAS 51');
const pw1 = v1.capitanias.find((c) => c.id === 'puerto_williams');
const otras = v1.capitanias.filter((c) => c.punto_interior && c.id !== 'puerto_williams');
otras.length === 51 ? ok(`A1 · las otras siguen siendo 51 (total ahora ${otras.length + 1})`) : mal(`A1 · hay ${otras.length} otras con punto_interior, se esperaban 51`);
pw1.punto_interior ? ok('A2 · puerto_williams tiene punto_interior') : mal('A2 · puerto_williams NO tiene punto_interior');
if (pw1.punto_interior) {
  const forma = Object.keys(pw1.punto_interior).join(',');
  forma === 'lat,lon,origen' ? ok(`A3 · forma {${forma}}, la misma que las 51`) : mal(`A3 · forma {${forma}}`);
  const textos = new Set(otras.map((c) => c.punto_interior.origen));
  textos.size === 1 && igual(pw1.punto_interior.origen, [...textos][0])
    ? ok('A4 · el texto de `origen` es IDENTICO POR CODEPOINT al unico que usan las 51')
    : mal(`A4 · el texto de origen difiere (las 51 usan ${textos.size} texto(s) distinto(s))`);
  const o = pw1.punto_interior.origen;
  const raros = noAscii(o);
  raros.length === 0 ? ok(`A5 · el texto de origen es ASCII puro (${o.length} chars, sin tildes, como las 51)`)
    : L(`         no-ASCII: ${raros.map((c) => `'${c}' ${cps(c)}`).join('  ')}`);
  o === o.normalize('NFC') ? ok('A6 · el texto esta en forma NFC') : mal('A6 · el texto NO esta en NFC');
  L(`         valor: lat ${pw1.punto_interior.lat}  lon ${pw1.punto_interior.lon}`);
}
// El orden de claves: punto_interior entre `revisar` y `texto_decreto`.
const ka = Object.keys(a1.capitanias.find((c) => c.id === 'puerto_williams')).join(',');
const kb = Object.keys(pw1).join(',');
kb === ka.replace('revisar,', 'revisar,punto_interior,')
  ? ok('A7 · la clave quedo entre `revisar` y `texto_decreto`, sin mover ninguna otra')
  : mal(`A7 · orden de claves: ${kb}`);

// ── B ───────────────────────────────────────────────────────────────────────
H('B — LA COORDENADA: SEDE, NO BAHIA, Y TESTIGO A DISTANCIA NO NULA');
const seed = fs.readFileSync(path.join(RAIZ, 'scripts', 'seed-bahias-sitport.js'), 'utf8');
const blo = seed.match(/const BAHIA_COORDS = \{[\s\S]*?\n\};/)[0];
const CO = [...blo.matchAll(/(\d+):\s*\{\s*lat:\s*(-?[\d.]+),\s*lng:\s*(-?[\d.]+),\s*nombre:\s*'([^']*)'/g)]
  .map((r) => ({ id: +r[1], lat: +r[2], lon: +r[3], n: r[4] }));
const km = (a, b, c, d) => { const k = Math.cos((a + c) / 2 * Math.PI / 180); return Math.hypot((b - d) * k, a - c) * 111.19; };
const p = pw1.punto_interior;
const cerca = CO.map((b) => ({ b, d: km(p.lat, p.lon, b.lat, b.lon) })).sort((x, y) => x.d - y.d)[0];
cerca.d > 0.05
  ? ok(`B1 · el ancla NO cae sobre una bahia SITPORT: la mas proxima es ${cerca.b.id} "${cerca.b.n}" a ${cerca.d.toFixed(2)} km`)
  : mal(`B1 · el ancla cae sobre la bahia ${cerca.b.id}: el testigo se confirmaria solo (§4.6)`);
const sedes = v1.capitanias.filter((c) => c.punto_interior && c.ambito === 'maritima');
const sobreBahia = sedes.filter((c) => CO.some((b) => km(c.punto_interior.lat, c.punto_interior.lon, b.lat, b.lon) < 0.05)).length;
sobreBahia === 0 ? ok(`B2 · ninguna de las ${sedes.length} sedes maritimas cae sobre una bahia (se mantiene el patron)`) : mal(`B2 · ${sobreBahia} sedes caen sobre una bahia`);
const CAJA = { xw: -85, xe: -65, ys: -60, yn: -17 };
(p.lon >= CAJA.xw && p.lon <= CAJA.xe && p.lat >= CAJA.ys && p.lat <= CAJA.yn)
  ? ok('B3 · el ancla cae dentro de la caja de trabajo del constructor') : mal('B3 · el ancla cae FUERA de la caja de trabajo');

// ── C ───────────────────────────────────────────────────────────────────────
H('C — LO DERIVADO EN EL v2');
const pw2 = v2.jurisdicciones.find((j) => j.id === 'puerto_williams');
const pw2a = a2.jurisdicciones.find((j) => j.id === 'puerto_williams');
igual(pw2.ancla_seleccion, pw1.punto_interior)
  ? ok('C1 · `ancla_seleccion` del v2 es copia IDENTICA POR CODEPOINT del `punto_interior` del v1')
  : mal('C1 · `ancla_seleccion` no coincide con el v1');
igual(pw2.causa_sin_geometria, pw1.revisar)
  ? ok('C2 · `causa_sin_geometria` es ahora, literal, el campo `revisar` — el hito N 26')
  : mal('C2 · la causa no coincide con `revisar`');
pw2.estado_geometria === 'no_cerrable' && pw2.participa_matching === false
  ? ok('C3 · sigue `no_cerrable` y `participa_matching: false` — el ancla NO la vuelve construible')
  : mal(`C3 · estado=${pw2.estado_geometria} matching=${pw2.participa_matching}`);
pw2.punto_representativo === null
  ? ok('C4 · `punto_representativo` en null: una no_cerrable no recibe testigo')
  : mal(`C4 · recibio testigo: ${JSON.stringify(pw2.punto_representativo).slice(0, 90)}`);
const nc = v2.jurisdicciones.filter((j) => j.ambito === 'maritima' && j.estado_geometria !== 'cerrable').length;
const cer = v2.jurisdicciones.filter((j) => j.ambito === 'maritima' && j.estado_geometria === 'cerrable').length;
(nc === 8 && cer === 44)
  ? ok(`C5 · maritimas: ${cer} cerrables y ${nc} no_cerrable — las mismas que antes. C4 no se abarata`)
  : mal(`C5 · maritimas: ${cer} cerrables y ${nc} no_cerrable`);
const shaV1 = crypto.createHash('sha256').update(fs.readFileSync(V1)).digest('hex');
v2.derivado_de['jurisdicciones_capitanias.json'] === shaV1
  ? ok(`C6 · `.concat(`derivado_de[v1] == el v1 en disco (${shaV1.slice(0, 16)}…)`))
  : mal('C6 · derivado_de[v1] no coincide con el v1 en disco');

// ── D ───────────────────────────────────────────────────────────────────────
H('D — LOS CUATRO BLOQUES QUE SALIERON IDENTICOS, SIGUEN IDENTICOS');
for (const k of ['correccion_testigos', 'convenciones', 'puntos_notables', 'pendientes']) {
  igual(a2[k], v2[k])
    ? ok(`D · ${k.padEnd(20)} identico a ${COMMIT_ANTES} por codepoint · ${bytes(v2[k]).length} bytes · sha ${sha(v2[k]).slice(0, 16)}`)
    : mal(`D · ${k} CAMBIO (${bytes(a2[k]).length} -> ${bytes(v2[k]).length} bytes)`);
}

// ── E ───────────────────────────────────────────────────────────────────────
H('E — LAS CUATRO DEL IGM, INTACTAS CON SUS ADJUDICACIONES');
for (const n of IGM) {
  const x = a2.puntos_notables.find((q) => q.nombre === n);
  const y = v2.puntos_notables.find((q) => q.nombre === n);
  if (!x) { mal(`E · "${n}" no estaba en la referencia`); continue; }
  if (!y) { mal(`E · "${n}" NO esta en el v2: se perdio`); continue; }
  igual(x, y)
    ? ok(`E · ${n.padEnd(20)} identico por codepoint · sha ${sha(y).slice(0, 16)} · ${['motivo_eleccion', 'descartados', 'nota_grafia', 'usado_por', 'fuente'].filter((c) => c in y).join(', ')}`)
    : mal(`E · "${n}" cambio respecto de la referencia`);
}
const fueraNfc = v2.puntos_notables.filter((q) => JSON.stringify(q) !== JSON.stringify(q).normalize('NFC')).length;
fueraNfc === 0 ? ok(`E · las ${v2.puntos_notables.length} entradas de puntos_notables estan en NFC (0 fuera)`) : mal(`E · ${fueraNfc} fuera de NFC`);
L('');
L('  no-ASCII de esas cuatro, con su codepoint (donde el glifo enganaria):');
for (const n of IGM) {
  const y = v2.puntos_notables.find((q) => q.nombre === n);
  if (!y) continue;
  const r = noAscii(JSON.stringify(y));
  if (r.length) L(`    ${n.padEnd(20)} ${r.map((c) => `'${c}' ${cps(c)}`).join('  ')}`);
}

// ── F ───────────────────────────────────────────────────────────────────────
H('F — EL DIFF ACOTADO A LO ESPERADO');
Object.keys(a2).join('|') === Object.keys(v2).join('|')
  ? ok(`F1 · las ${Object.keys(v2).length} claves de primer nivel, las mismas y en el mismo orden`)
  : mal('F1 · cambio el conjunto/orden de claves de primer nivel');
const movidas = Object.keys(a2).filter((k) => !igual(a2[k], v2[k]));
igual(movidas.slice().sort(), ['derivado_de', 'jurisdicciones'])
  ? ok('F2 · de primer nivel SOLO cambiaron `derivado_de` y `jurisdicciones`')
  : mal(`F2 · cambiaron: ${movidas.join(', ')}`);

const ia = Object.fromEntries(a2.jurisdicciones.map((j) => [j.id, j]));
const ib = Object.fromEntries(v2.jurisdicciones.map((j) => [j.id, j]));
const cambiadas = Object.keys(ia).filter((id) => !igual(ia[id], ib[id])).sort();
const esperadas = ['puerto_williams', 'punta_arenas', ...LACUSTRES].sort();
igual(cambiadas, esperadas)
  ? ok(`F3 · cambian exactamente ${cambiadas.length} jurisdicciones, y son las esperadas`)
  : mal(`F3 · cambian [${cambiadas.join(', ')}], se esperaban [${esperadas.join(', ')}]`);

// Hoja por hoja: que cada una cambie SOLO en lo previsto.
function hojas(a, b, ruta, out) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) hojas(a[k], b[k], `${ruta}.${k}`, out);
    return;
  }
  out.push(ruta);
}
{
  const o = []; hojas(ia.punta_arenas, ib.punta_arenas, '', o);
  igual(o, ['.punto_representativo.bahias_que_eligen_esta_sede'])
    ? ok(`F4 · punta_arenas cambia SOLO el contador (${ia.punta_arenas.punto_representativo.bahias_que_eligen_esta_sede} -> ${ib.punta_arenas.punto_representativo.bahias_que_eligen_esta_sede}); su testigo no se mueve`)
    : mal(`F4 · punta_arenas cambia en: ${o.join(', ')}`);
}
{
  // `ancla_seleccion` pasa de null a objeto. `null` no es recorrible, asi que la
  // hoja es la clave entera y no sus tres campos: la primera version de este
  // control esperaba las tres y fallo por la expectativa, no por el dato.
  const o = []; hojas(ia.puerto_williams, ib.puerto_williams, '', o);
  igual(o.slice().sort(), ['.ancla_seleccion', '.causa_sin_geometria'])
    ? ok('F5 · puerto_williams cambia SOLO `causa_sin_geometria` y `ancla_seleccion`')
    : mal(`F5 · puerto_williams cambia en: ${o.join(', ')}`);
}
// F6 — las seis lacustres. El control NO afloja a "cualquier cosa": afirma el
// conjunto EXACTO de hojas medido, clasificado, y que una sola resolucion cambia.
{
  const todas = [];
  for (const id of LACUSTRES) { const o = []; hojas(ia[id], ib[id], '', o); todas.push(...o.map((r) => [id, r])); }
  const campo = (r) => r.replace(/^\.cuerpos_lacustres\.\d+\./, '').replace(/\.\d+$/, '');
  const cuenta = {};
  for (const [, r] of todas) cuenta[campo(r)] = (cuenta[campo(r)] || 0) + 1;
  const esperado = { anclaje: 32, gemelos_geometricos_declarados: 2, resolucion: 1, shapefile_fid: 1, shapefile_detalle: 1, motivo: 1 };
  // Se comparan ENTRADAS ORDENADAS, no los objetos: `igual` va por JSON.stringify
  // y ahi el orden de insercion de las claves cuenta. La primera version fallo por
  // eso con los mismos numeros de los dos lados.
  const orden = (o) => Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1));
  igual(orden(cuenta), orden(esperado))
    ? ok(`F6 · las seis lacustres cambian en ${todas.length} hojas, y son exactamente las esperadas: ` +
         Object.entries(esperado).map(([k, v]) => `${v} ${k}`).join(' · '))
    : mal(`F6 · el conjunto de hojas no es el esperado: ${JSON.stringify(cuenta)}`);

  // La unica resolucion que se mueve, nombrada.
  const movidas = [];
  for (const id of LACUSTRES) {
    const A = ia[id].cuerpos_lacustres || [], B = ib[id].cuerpos_lacustres || [];
    B.forEach((c, i) => { if (A[i] && A[i].resolucion !== c.resolucion) movidas.push(`${id}[${i}] ${c.nombre_decreto}: ${A[i].resolucion} -> ${c.resolucion}`); });
  }
  igual(movidas, ['lago_villarrica[5] Laguna Galletue: ausente -> aceptado'])
    ? ok('F7 · una sola resolucion se mueve: Laguna Galletue, ausente -> aceptado')
    : mal(`F7 · resoluciones movidas: ${movidas.join(' | ') || '(ninguna)'}`);
  const gal = (ib.lago_villarrica.cuerpos_lacustres || [])[5];
  /D12/.test(gal.motivo || '') && /2026-08-12/.test(gal.motivo || '')
    ? ok('F8 · el motivo de Galletue cita D12 y su fecha: es adjudicacion del owner, no derivacion')
    : mal('F8 · el motivo de Galletue no cita D12 con su fecha');
}
L('');
L('  ORIGEN DE LAS SEIS LACUSTRES — NO ES ESTE CAMBIO, Y HAY QUE LEERLO ASI:');
L('    El v2 commiteado no se regeneraba desde antes del 2026-08-12. Todo lo de');
L('    arriba estaba ya escrito en data/decreto/cotejo_lacustre_adjudicado.json y');
L('    el v2 no lo tenia. Dos capas de desfase:');
L('      · 2026-08-12 — D12, ADJUDICACION DEL OWNER: Laguna Galletue pasa de');
L('        "ausente" a "aceptado" con el fid 965. El v2 commiteado seguia diciendo');
L('        "Sin ninguna coincidencia ni candidato en el shapefile". Eso es');
L('        sustantivo, no cosmetico.');
L('      · 2026-08-13 — af0a853 (E3 paso 5): `anclaje` y');
L('        `gemelos_geometricos_declarados`.');
L('    El cambio del 2026-08-14 fue quirurgico y PRESERVO el desfase. Regenerar hoy');
L('    lo puso al dia. Quien lea el diff no tiene que buscar la causa en el ancla.');

H(fallos === 0 ? 'RESULTADO: TODOS LOS CONTROLES EN VERDE' : `RESULTADO: ${fallos} CONTROL(ES) EN ROJO — la fase NO pasa`);
process.exit(fallos === 0 ? 0 : 1);
