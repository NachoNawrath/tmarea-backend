// _bitacoras/sondaje_cierre_2026-08-16/01_medir_cierre_sitport.js
//
// SONDAJE-CIERRE-RECONOCIMIENTO — 2026-08-16.
// Mide QUE MANDA SITPORT en los campos de cierre sobre las seis capturas crudas
// que ya estan en disco. NO sale a la API. NO propone regla de derivacion.
//
// CRITERIOS IMPORTADOS de los scripts versionados de sondaje-sitport/ (no se
// inventan de nuevo):
//   · `recordsets[0]` es donde viven los registros  (resumen.ps1, comparar.ps1,
//     auditoria.ps1, check_mejillones.ps1 — los cuatro lo hacen igual)
//   · la vara de resumen.ps1: total / bahias distintas por GLBahia / NaveRecibe
//     que matchea MENOR — se reproduce en (H) como control cruzado
//   · comparar.ps1 identifica una restriccion entre capturas por GLBahia; se
//     reproduce en (F2) al lado de la identidad por IDRestriccion, que es la
//     que este instrumento agrega y declara.
//
// CRITERIOS AGREGADOS ACA, declarados:
//   · etiquetado de valor por TIPO: 0 (number), "0" (string), null, "" y campo
//     AUSENTE se cuentan por separado y nunca se colapsan.
//   · barrido de cardinalidad sobre TODOS los campos, para que un campo de
//     cierre que no sea uno de los tres se encuentre por el dato y no por el
//     nombre que le pusimos nosotros.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.resolve(__dirname, '..', '..', 'sondaje-sitport');
const SALIDA = path.resolve(__dirname, '01_medir_cierre_sitport.txt');

const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));

// Los tres campos que el prompt nombra. El barrido (C) no depende de esta lista.
const TRES = ['paralizar', 'nzarpe', 'nrecalada'];

// INV-0.3 — normalizacion de texto antes de comparar (doble espacio de fuente).
const normTxt = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();

// Etiqueta de valor que NO colapsa 0 / "0" / null / "" / ausente.
const AUSENTE = Symbol('ausente');
function etiqueta(v) {
  if (v === AUSENTE) return 'AUSENTE (la clave no viene en el registro)';
  if (v === null) return 'null';
  if (v === undefined) return 'undefined (clave presente, valor undefined)';
  const t = typeof v;
  if (t === 'number') return `number ${v}`;
  if (t === 'boolean') return `boolean ${v}`;
  if (t === 'string') return v === '' ? 'string "" (vacia)' : `string ${JSON.stringify(v)}`;
  if (Array.isArray(v)) return `array[${v.length}]`;
  return `${t} ${JSON.stringify(v)}`;
}
const leer = (rec, k) => (Object.prototype.hasOwnProperty.call(rec, k) ? rec[k] : AUSENTE);

function bump(map, k) { map.set(k, (map.get(k) || 0) + 1); }
function ordenado(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

// ─────────────────────────────────────────────────────────────────────────────
// (0) INVENTARIO
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('SONDAJE DE CIERRE — QUE MANDA SITPORT EN LOS CAMPOS DE CIERRE');
say('Instrumento: _bitacoras/sondaje_cierre_2026-08-16/01_medir_cierre_sitport.js');
say(`Corrida: ${new Date().toISOString()} · sin salir a la API`);
hr();
say();

if (!fs.existsSync(DIR)) { console.error(`FALLA: no existe ${DIR}`); process.exit(2); }

// Universo: los .json de sondaje-sitport que son capturas de restricciones.
// bahias_sitport.json se excluye por ser otra consulta (consultaBahias) y se
// declara excluido, no se omite en silencio.
const todos = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
const EXCLUIDOS = ['bahias_sitport.json'];
const archivos = todos.filter(f => !EXCLUIDOS.includes(f));

say('(0) INVENTARIO DEL MATERIAL');
say(`    .json en sondaje-sitport/ : ${todos.length}`);
say(`    excluidos, con motivo     : ${EXCLUIDOS.join(', ')} (es consultaBahias, no restricciones)`);
say(`    capturas medidas          : ${archivos.length}`);
say();

const capturas = [];
for (const f of archivos) {
  const full = path.join(DIR, f);
  const buf = fs.readFileSync(full);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const st = fs.statSync(full);
  const j = JSON.parse(buf.toString('utf8'));
  if (!Array.isArray(j.recordsets)) { console.error(`FALLA: ${f} no trae recordsets[]`); process.exit(2); }
  const recs = j.recordsets[0] || [];

  // ¿La fecha de captura vive ADENTRO del archivo, o solo en el nombre?
  const clavesTop = Object.keys(j);
  const mFecha = f.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})/);
  const fechaNombre = mFecha ? `${mFecha[1]} ${mFecha[2]}:${mFecha[3]}` : null;

  capturas.push({
    f, full, sha, size: buf.length, mtime: st.mtime, recs,
    fechaNombre, clavesTop, rowsAffected: JSON.stringify(j.rowsAffected),
  });
}

// Orden cronologico por mtime del sistema de archivos (unica fecha que existe
// para check_ahora.json, que no la lleva en el nombre).
capturas.sort((a, b) => a.mtime - b.mtime);

for (const c of capturas) {
  say(`  ${c.f}`);
  say(`      ruta          : sondaje-sitport/${c.f}`);
  say(`      sha256        : ${c.sha}`);
  say(`      tamaño        : ${c.size} bytes`);
  say(`      mtime (disco) : ${c.mtime.toISOString().replace('T', ' ').slice(0, 19)}Z  /  local ${c.mtime.toLocaleString('sv-SE')}`);
  say(`      fecha en nombre: ${c.fechaNombre || '— NO la lleva en el nombre —'}`);
  say(`      claves top     : ${c.clavesTop.join(', ')} · rowsAffected=${c.rowsAffected}`);
  say(`      registros      : ${c.recs.length}`);
}
say();
const TOTAL = capturas.reduce((a, c) => a + c.recs.length, 0);
say(`    DENOMINADOR GLOBAL — registros de restriccion sumados: ${TOTAL}`);
say(`      ${capturas.map(c => `${c.recs.length}`).join(' + ')} = ${TOTAL}`);
say();

// Idénticas por sha256
const porSha = new Map();
for (const c of capturas) { if (!porSha.has(c.sha)) porSha.set(c.sha, []); porSha.get(c.sha).push(c.f); }
say('    IDENTICAS ENTRE SI POR SHA256 (no por bytes):');
let hubo = false;
for (const [sha, fs_] of porSha) {
  if (fs_.length > 1) { hubo = true; say(`      ${sha.slice(0, 32)}…  ->  ${fs_.join('  ==  ')}`); }
}
if (!hubo) say('      ninguna: las seis son distintas.');
say(`    grupos distintos de contenido: ${porSha.size} sobre ${capturas.length} capturas`);
say();

// ¿Hay una marca de tiempo ADENTRO de algun registro que feche la captura?
const clavesFecha = new Set();
for (const c of capturas) for (const r of c.recs) for (const k of Object.keys(r)) {
  if (/fec|fch|fc|date|time|hora/i.test(k)) clavesFecha.add(k);
}
say(`    claves con pinta de fecha DENTRO del registro: ${[...clavesFecha].sort().join(', ') || '(ninguna)'}`);
say('    >>> Ninguna de ellas fecha LA CAPTURA: fechan la restriccion. La hora en');
say('        que se consulto a SITPORT vive SOLO en el nombre del archivo y en el');
say('        mtime del disco — dato NO autofechado; si el archivo se copia o se');
say('        renombra, envejece en silencio. check_ahora.json ni siquiera la lleva');
say('        en el nombre: su unica fecha es el mtime.');
say();

// ─────────────────────────────────────────────────────────────────────────────
// (A) ESTRUCTURA DE UN REGISTRO
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(A) ESTRUCTURA — TODOS LOS CAMPOS QUE SITPORT EMITE');
hr();
const presencia = new Map();   // clave -> nº de registros que la traen
const formas = new Map();      // firma de claves -> nº registros
for (const c of capturas) for (const r of c.recs) {
  const ks = Object.keys(r).sort();
  bump(formas, ks.join('|'));
  for (const k of ks) bump(presencia, k);
}
const union = [...presencia.keys()].sort();
say(`    campos distintos en la union de las ${capturas.length} capturas: ${union.length}`);
say(`    formas de registro distintas (firma de claves): ${formas.size}`);
for (const [firma, n] of ordenado(formas)) say(`      ${n}/${TOTAL} registros: ${firma.split('|').length} campos`);
say();
say('    campo                    presentes / total     ausentes');
for (const k of union) {
  const n = presencia.get(k);
  say(`      ${k.padEnd(22)} ${String(n).padStart(5)} / ${TOTAL}          ${TOTAL - n}`);
}
say();

// Cita literal de UN registro entero.
const cCita = capturas[0];
const rCita = cCita.recs[0];
say(`    UN REGISTRO CITADO ENTERO — ${cCita.f}, recordsets[0][0]:`);
say(JSON.stringify(rCita, null, 2).split('\n').map(l => '      ' + l).join('\n'));
say();

// ─────────────────────────────────────────────────────────────────────────────
// (B) LOS TRES CAMPOS DE CIERRE — VALORES REALES
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(B) LOS TRES CAMPOS DE CIERRE — QUE VALORES TOMAN, SOBRE EL TOTAL');
hr();
for (const k of TRES) {
  const m = new Map();
  for (const c of capturas) for (const r of c.recs) bump(m, etiqueta(leer(r, k)));
  say(`    ${k}  (denominador ${TOTAL})`);
  let suma = 0;
  for (const [v, n] of ordenado(m)) { say(`        ${String(n).padStart(4)} / ${TOTAL}   ${v}`); suma += n; }
  say(`        suma ${suma} — ${suma === TOTAL ? 'CIERRA' : '*** NO CIERRA ***'}`);
  say();
}
say('    DESGLOSE POR CAPTURA (denominador propio de cada una):');
for (const c of capturas) {
  const partes = TRES.map(k => {
    const m = new Map();
    for (const r of c.recs) bump(m, etiqueta(leer(r, k)));
    return `${k}={${ordenado(m).map(([v, n]) => `${v}:${n}`).join(', ')}}`;
  });
  say(`      ${c.f}  (n=${c.recs.length})`);
  for (const p of partes) say(`          ${p}`);
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (C) BARRIDO — QUE OTRO CAMPO SE COMPORTA COMO BANDERA
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(C) BARRIDO DE CARDINALIDAD — buscar campos de cierre POR EL DATO, no por el nombre');
hr();
const card = [];
for (const k of union) {
  const m = new Map();
  for (const c of capturas) for (const r of c.recs) bump(m, etiqueta(leer(r, k)));
  card.push([k, m]);
}
card.sort((a, b) => a[1].size - b[1].size);
say(`    denominador ${TOTAL} registros`);
for (const [k, m] of card) {
  say(`    ${k.padEnd(22)} valores distintos: ${String(m.size).padStart(4)}`);
  if (m.size <= 8) for (const [v, n] of ordenado(m)) say(`          ${String(n).padStart(4)}   ${v}`);
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (D) EL CAMPO `nivel`
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(D) EL CAMPO `nivel` — ¿aparece en ALGUNA de las capturas?');
hr();
let nivelClaves = 0, nivelCaseIns = new Set();
for (const c of capturas) for (const r of c.recs) for (const k of Object.keys(r)) {
  if (k.toLowerCase() === 'nivel') { nivelClaves++; nivelCaseIns.add(k); }
}
say(`    (D1) por clave, insensible a mayusculas, sobre ${TOTAL} registros: ${nivelClaves}`);
say(`         formas de la clave encontradas: ${[...nivelCaseIns].join(', ') || '(ninguna)'}`);
say('    (D2) por texto crudo del archivo — literal `"nivel"` en el JSON tal cual llego:');
for (const c of capturas) {
  const txt = fs.readFileSync(c.full, 'utf8');
  const nComillas = (txt.match(/"nivel"/gi) || []).length;
  const nSuelto = (txt.match(/nivel/gi) || []).length;
  say(`         ${c.f.padEnd(38)} "nivel": ${nComillas}   ·  la cadena nivel (en cualquier lugar, incl. texto libre): ${nSuelto}`);
}
say('    (D3) `cierre_total` como literal en las capturas:');
for (const c of capturas) {
  const txt = fs.readFileSync(c.full, 'utf8');
  say(`         ${c.f.padEnd(38)} ${(txt.match(/cierre_total/gi) || []).length}`);
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (E) CENTINELAS (INV-0.2)
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(E) CENTINELAS — -999 y parientes, en cualquier campo (INV-0.2)');
hr();
const cent = new Map();
for (const c of capturas) for (const r of c.recs) for (const k of Object.keys(r)) {
  const v = r[k];
  if (v === -999 || v === '-999' || v === 999 || v === '999' || v === -1 || v === '-1') bump(cent, `${k} = ${etiqueta(v)}`);
}
if (cent.size === 0) say(`    ninguno, sobre ${TOTAL} registros x ${union.length} campos.`);
else for (const [k, n] of ordenado(cent)) say(`    ${String(n).padStart(4)}   ${k}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (F) MOVIMIENTO ENTRE CAPTURAS
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(F) COMO SE MUEVEN — captura contra captura consecutiva');
hr();

// Identidad. Se declara y se comprueba antes de usarla.
say('    (F0) IDENTIDAD DE UN REGISTRO ENTRE CAPTURAS — comprobada antes de usarla');
let idUnicoSiempre = true;
for (const c of capturas) {
  const ids = c.recs.map(r => r.IDRestriccion);
  const nUnicos = new Set(ids).size;
  const nNulos = ids.filter(x => x == null).length;
  if (nUnicos !== c.recs.length) idUnicoSiempre = false;
  say(`         ${c.f.padEnd(38)} IDRestriccion: ${nUnicos} distintos / ${c.recs.length} registros · nulos ${nNulos}`);
}
say(`         IDRestriccion es identidad valida en TODAS las capturas: ${idUnicoSiempre ? 'SI' : 'NO'}`);
if (!idUnicoSiempre) say('         -> se cae a la identidad de comparar.ps1 (GLBahia) y se declara.');
say();

let comparacionesEfectivas = 0;
const cambiosPorCampo = new Map();
const cambiosTres = [];
const cambiosTodos = [];

for (let i = 1; i < capturas.length; i++) {
  const a = capturas[i - 1], b = capturas[i];
  const ma = new Map(a.recs.map(r => [String(r.IDRestriccion), r]));
  const mb = new Map(b.recs.map(r => [String(r.IDRestriccion), r]));
  const comunes = [...ma.keys()].filter(k => mb.has(k));
  const nuevos = [...mb.keys()].filter(k => !ma.has(k));
  const idos = [...ma.keys()].filter(k => !mb.has(k));

  say(`    ${a.f}  ->  ${b.f}`);
  say(`        registros: ${a.recs.length} -> ${b.recs.length} · comunes por ID: ${comunes.length} · nuevos: ${nuevos.length} · desaparecidos: ${idos.length}`);

  let cambiadosAlgo = 0;
  for (const k of comunes) {
    comparacionesEfectivas++;
    const ra = ma.get(k), rb = mb.get(k);
    const campos = [...new Set([...Object.keys(ra), ...Object.keys(rb)])];
    let cambioAqui = false;
    for (const cp of campos) {
      const va = etiqueta(leer(ra, cp)), vb = etiqueta(leer(rb, cp));
      if (va !== vb) {
        cambioAqui = true;
        bump(cambiosPorCampo, cp);
        const corta = s => (s.length > 150 ? s.slice(0, 150) + '…' : s);
        cambiosTodos.push(`${a.f.slice(13, 29)} -> ${b.f.slice(13, 29)} · ID ${k} · ${cp}\n              DE : ${corta(va)}\n              A  : ${corta(vb)}`);
        if (TRES.includes(cp)) cambiosTres.push(`${a.f} -> ${b.f} · ID ${k} · ${cp}: ${va}  ->  ${vb}`);
      }
    }
    if (cambioAqui) cambiadosAlgo++;
  }
  say(`        de los ${comunes.length} comunes, con AL MENOS un campo distinto: ${cambiadosAlgo}`);
  say();
}

say(`    COMPARACIONES EFECTIVAS (pares de registro con misma identidad): ${comparacionesEfectivas}`);
if (comparacionesEfectivas === 0) {
  say('    *** CERO COMPARACIONES EFECTIVAS — el instrumento no midio nada. ABORTA.');
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
  process.exit(3);
}
say();
say('    CAMPOS QUE CAMBIARON, y en cuantos pares (denominador: las comparaciones de arriba):');
if (cambiosPorCampo.size === 0) say(`        NINGUN campo cambio en ninguno de los ${comparacionesEfectivas} pares.`);
else for (const [k, n] of ordenado(cambiosPorCampo)) say(`        ${String(n).padStart(5)} / ${comparacionesEfectivas}   ${k}`);
say();
say('    TODO CAMBIO, CON SU DIRECCION (son pocos: caben enteros):');
if (cambiosTodos.length === 0) say('        ninguno.');
else for (const l of cambiosTodos) say(`        ${l}`);
say();
say('    CAMBIOS EN LOS TRES CAMPOS DE CIERRE, uno por uno:');
if (cambiosTres.length === 0) say(`        NINGUNO. Los tres campos son CONSTANTES en las ${comparacionesEfectivas} comparaciones.`);
else for (const l of cambiosTres) say(`        ${l}`);
say();

// (F2) el criterio versionado de comparar.ps1: identidad por GLBahia
say('    (F2) CONTRASTE con la identidad de comparar.ps1 (GLBahia, normalizado INV-0.3):');
for (let i = 1; i < capturas.length; i++) {
  const a = capturas[i - 1], b = capturas[i];
  const sa = new Set(a.recs.map(r => normTxt(r.GLBahia)));
  const sb = new Set(b.recs.map(r => normTxt(r.GLBahia)));
  const com = [...sa].filter(x => sb.has(x)).length;
  say(`         ${a.f} -> ${b.f}: bahias ${sa.size} -> ${sb.size} · comunes ${com} · entran ${[...sb].filter(x => !sa.has(x)).length} · salen ${[...sa].filter(x => !sb.has(x)).length}`);
}
const conDoble = new Set();
for (const c of capturas) for (const r of c.recs) if (/\s{2,}/.test(String(r.GLBahia || ''))) conDoble.add(r.GLBahia);
say(`         GLBahia con doble espacio (INV-0.3): ${conDoble.size}${conDoble.size ? ' -> ' + [...conDoble].map(x => JSON.stringify(x)).join(', ') : ''}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (G) COMBINACIONES REALES
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(G) COMBINACIONES DE LOS TRES QUE EXISTEN EN EL DATO REAL');
hr();
const combos = new Map();
const combosPorCap = new Map();
for (const c of capturas) {
  const m = new Map();
  for (const r of c.recs) {
    const t = TRES.map(k => etiqueta(leer(r, k))).join(' | ');
    bump(combos, t); bump(m, t);
  }
  combosPorCap.set(c.f, m);
}
say(`    orden de la tupla: ${TRES.join(' | ')}   ·   denominador ${TOTAL}`);
let sumaC = 0;
for (const [t, n] of ordenado(combos)) { say(`      ${String(n).padStart(4)} / ${TOTAL}   ( ${t} )`); sumaC += n; }
say(`      suma ${sumaC} — ${sumaC === TOTAL ? 'CIERRA' : '*** NO CIERRA ***'}`);
say(`    combinaciones distintas OBSERVADAS: ${combos.size}`);
say();
say('    LAS 8 TEORICAS 0/1, y cual falta (el hueco tambien es informacion):');
for (const p of [0, 1]) for (const z of [0, 1]) for (const rc of [0, 1]) {
  const t = [`number ${p}`, `number ${z}`, `number ${rc}`].join(' | ');
  const n = combos.get(t) || 0;
  say(`      paralizar=${p} nzarpe=${z} nrecalada=${rc}  ->  ${n === 0 ? 'NUNCA APARECE' : n + ' registros'}`);
}
say();
say('    por captura:');
for (const c of capturas) {
  say(`      ${c.f} (n=${c.recs.length}):`);
  for (const [t, n] of ordenado(combosPorCap.get(c.f))) say(`          ${String(n).padStart(4)}   ( ${t} )`);
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (H) CONTROLES CRUZADOS
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(H) CONTROLES CRUZADOS CONTRA VARAS QUE NO SALEN DE ESTE INSTRUMENTO');
hr();
say('    (H1) La vara de resumen.ps1 (criterio versionado): total · bahias por GLBahia · NaveRecibe~MENOR');
for (const c of capturas) {
  const bah = new Set(c.recs.map(r => r.GLBahia)).size;
  const men = c.recs.filter(r => /MENOR/i.test(String(r.NaveRecibe || ''))).length;
  say(`         ${c.f.padEnd(38)} Total: ${c.recs.length} | Bahias: ${bah} | Afectan menores: ${men}`);
}
say();
say('    (H2) Los 20 campos que la bitacora rotulo_p2 (03_medir_cierre_total.txt, 08-16,');
say('         9 registros vivos) declaro como emitidos por la fuente — contra la union de acá.');
const VEINTE = ['AreaRestriccion','Detalle','FCTermino','FCinicio','FrenteAtraque','GLBahia','IDRestriccion','MotivoRestriccion','NaveRecibe','NombreInstalacion','Observacion','SitioAtraque','bahia','glnombre','idipbahia','nrecalada','nzarpe','paralizar','tipo','tiporestriccion'];
const faltanAca = VEINTE.filter(k => !union.includes(k));
const sobranAca = union.filter(k => !VEINTE.includes(k));
say(`         declarados el 08-16 : ${VEINTE.length}`);
say(`         union de las 6 capturas (30-07 al 03-08) : ${union.length}`);
say(`         estan el 08-16 y NO en las capturas : ${faltanAca.length ? faltanAca.join(', ') : '(ninguno)'}`);
say(`         estan en las capturas y NO el 08-16 : ${sobranAca.length ? sobranAca.join(', ') : '(ninguno)'}`);
say();

hr();
say(`FIN — capturas: ${capturas.length} · registros: ${TOTAL} · comparaciones efectivas: ${comparacionesEfectivas}`);
say(`      campos distintos: ${union.length} · combinaciones observadas de los tres: ${combos.size}`);
hr();

fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
console.log(`\n[salida escrita] ${SALIDA}`);
