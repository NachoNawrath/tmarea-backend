// _bitacoras/sondaje_cierre_2026-08-16/03_contraste_texto.js
//
// SONDAJE-CIERRE — tercera pasada, y la que mide EL CASO QUE ROMPERIA LA LECTURA
// FACIL (§1.2). De (02) sale que los dos unicos registros con `paralizar=1`
// llevan en `Observacion` una "CONDICION DE PUERTO" —uno de ellos dice PUERTO
// CERRADO con todas las letras—. La lectura facil seria "paralizar=1 significa
// puerto cerrado". El caso que la rompe es el inverso: un registro que EN TEXTO
// declara puerto cerrado y trae los tres campos en 0.
//
// Este instrumento lo busca. No propone regla: cuenta.

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', '..', 'sondaje-sitport');
const SALIDA = path.resolve(__dirname, '03_contraste_texto.txt');
const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));

const EXCLUIDOS = ['bahias_sitport.json'];
const capturas = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.json') && !EXCLUIDOS.includes(f))
  .map(f => {
    const full = path.join(DIR, f);
    return { f, mtime: fs.statSync(full).mtime, recs: JSON.parse(fs.readFileSync(full, 'utf8')).recordsets[0] || [] };
  })
  .sort((a, b) => a.mtime - b.mtime);

const filas = [];
for (const c of capturas) for (const r of c.recs) filas.push({ cap: c.f, r });
const TOTAL = filas.length;

// INV-0.3 — normalizacion antes de comparar: colapsa espacios, saca acentos,
// mayusculiza. Es la misma forma que usa src/services/sitport-parser.js
// (normalizarTexto), reproducida aca para NO tocar el motor.
const norm = (s) => String(s == null ? '' : s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase();

const tupla = (r) => `paralizar=${r.paralizar} nzarpe=${r.nzarpe} nrecalada=${r.nrecalada}`;

hr();
say('SONDAJE DE CIERRE — EL TEXTO DE LA FUENTE CONTRA LOS TRES CAMPOS');
say('Instrumento: _bitacoras/sondaje_cierre_2026-08-16/03_contraste_texto.js');
say(`Corrida: ${new Date().toISOString()} · sin salir a la API`);
say(`Universo: ${capturas.length} capturas · ${TOTAL} registros`);
hr();
say();

// ─────────────────────────────────────────────────────────────────────────────
// (A) LITERALES BUSCADOS. Si un literal no se encuentra, es FALLA, no "no aplica".
// ─────────────────────────────────────────────────────────────────────────────
const LITERALES = [
  ['PUERTO CERRADO', /PUERTO CERRADO/],
  ['CONDICION DE PUERTO', /CONDICION\s*DE\s*PUERTO/],
  ['CERRADO (la palabra sola)', /CERRAD[OA]/],
  ['CERRAZON', /CERRAZON/],
  ['MAL TIEMPO', /MAL TIEMPO/],
  ['RESTRING', /RESTRING/],
];

hr();
say('(A) LITERALES EN EL TEXTO DE LA FUENTE — Observacion + Detalle + MotivoRestriccion');
hr();
say(`    denominador ${TOTAL} registros · texto normalizado (INV-0.3, sin acentos, espacios colapsados)`);
say();
let faltantes = 0;
for (const [nombre, re] of LITERALES) {
  const hits = filas.filter(({ r }) => re.test(norm(r.Observacion) + ' | ' + norm(r.Detalle) + ' | ' + norm(r.MotivoRestriccion)));
  say(`    ${nombre.padEnd(28)} ${String(hits.length).padStart(4)} / ${TOTAL}`);
  if (hits.length === 0) { faltantes++; say('        *** LITERAL NO ENCONTRADO — es FALLA del sondaje, no "no aplicable".'); }
}
say();
if (faltantes > 0) say(`    literales sin ninguna aparicion: ${faltantes} — declarados arriba.`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (B) EL CASO QUE ROMPE LA LECTURA FACIL
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(B) EL CASO QUE ROMPERIA "paralizar!=0 <=> puerto cerrado"');
hr();
const dicenCerrado = filas.filter(({ r }) => /PUERTO CERRADO|CONDICION\s*DE\s*PUERTO/.test(norm(r.Observacion)));
say(`    registros cuyo Observacion declara PUERTO CERRADO o CONDICION DE PUERTO: ${dicenCerrado.length} / ${TOTAL}`);
say();
const conBandera = dicenCerrado.filter(({ r }) => r.paralizar !== 0 || r.nzarpe !== 0 || r.nrecalada !== 0);
const sinBandera = dicenCerrado.filter(({ r }) => r.paralizar === 0 && r.nzarpe === 0 && r.nrecalada === 0);
say(`      · con algun campo de cierre != 0 : ${conBandera.length}`);
say(`      · con LOS TRES EN 0              : ${sinBandera.length}   <<< EL CASO QUE ROMPE LA LECTURA`);
say();
say('    LOS QUE LO DICEN EN TEXTO Y TRAEN LOS TRES EN 0 — uno por uno:');
if (sinBandera.length === 0) say('        (ninguno)');
for (const { cap, r } of sinBandera) {
  say(`      ── ${cap} · ID ${r.IDRestriccion} · ${r.GLBahia} · ${tupla(r)}`);
  say(`         tipo=${JSON.stringify(r.tipo)} tiporestriccion=${JSON.stringify(r.tiporestriccion)} NaveRecibe=${JSON.stringify(r.NaveRecibe)}`);
  say(`         Observacion: ${JSON.stringify(r.Observacion)}`);
}
say();
say('    Y AL REVES — los que traen bandera, ¿que dice su texto?:');
for (const { cap, r } of filas.filter(({ r }) => r.paralizar !== 0 || r.nzarpe !== 0 || r.nrecalada !== 0)) {
  say(`      ── ${cap.padEnd(38)} ID ${r.IDRestriccion} · ${tupla(r)}`);
  say(`         ${JSON.stringify(r.Observacion)}`);
}
say();

// ─────────────────────────────────────────────────────────────────────────────
// (C) TABLA: literal de cierre × tupla
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(C) TABLA — ¿dice cerrado en texto? × tupla de los tres');
hr();
const t = new Map();
for (const { r } of filas) {
  const dice = /PUERTO CERRADO|CONDICION\s*DE\s*PUERTO/.test(norm(r.Observacion)) ? 'TEXTO dice cerrado/condicion' : 'texto NO lo dice';
  const k = `${dice.padEnd(30)} || ${tupla(r)}`;
  t.set(k, (t.get(k) || 0) + 1);
}
let suma = 0;
for (const [k, n] of [...t.entries()].sort((a, b) => b[1] - a[1])) { say(`    ${String(n).padStart(4)} / ${TOTAL}   ${k}`); suma += n; }
say(`    suma ${suma} — ${suma === TOTAL ? 'CIERRA' : '*** NO CIERRA ***'}`);
say();

// ─────────────────────────────────────────────────────────────────────────────
// (D) LO QUE EL PARSER VE HOY DE ESOS MISMOS REGISTROS
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(D) QUE CAMPOS CONSUME EL PARSER (src/services/sitport-parser.js) — leido, no tocado');
hr();
const CONSUME = ['Observacion', 'MotivoRestriccion', 'NaveRecibe', 'bahia', 'GLBahia', 'FCinicio', 'AreaRestriccion'];
const UNION = [...new Set(filas.flatMap(({ r }) => Object.keys(r)))].sort();
const IGNORA = UNION.filter(k => !CONSUME.includes(k));
say(`    campos que emite la fuente : ${UNION.length}`);
say(`    campos que el parser LEE   : ${CONSUME.length}  -> ${CONSUME.join(', ')}`);
say(`    campos que el parser IGNORA: ${IGNORA.length}  -> ${IGNORA.join(', ')}`);
say();
say('    de los ignorados, los tres de cierre estan entre ellos:');
for (const k of ['paralizar', 'nzarpe', 'nrecalada']) say(`        ${k.padEnd(12)} ignorado por el parser: ${IGNORA.includes(k) ? 'SI' : 'NO'}`);
say();
// control de que la lista CONSUME no se invento: se comprueba contra el archivo.
const src = fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', 'services', 'sitport-parser.js'), 'utf8');
say('    CONTROL — cada campo de la lista CONSUME aparece como `registro.<campo>` en el parser:');
let malos = 0;
for (const k of CONSUME) {
  const ok = new RegExp(`registro\\.${k}\\b`).test(src);
  if (!ok) malos++;
  say(`        registro.${k.padEnd(20)} ${ok ? 'OK' : '*** NO ESTA — la lista esta mal ***'}`);
}
say('    CONTROL INVERSO — ningun campo de la lista IGNORA aparece como `registro.<campo>`:');
let fugas = 0;
for (const k of IGNORA) {
  if (new RegExp(`registro\\.${k}\\b`).test(src)) { fugas++; say(`        *** ${k} SI aparece en el parser — estaba mal clasificado ***`); }
}
if (fugas === 0) say('        ninguno aparece. La particion es correcta.');
if (malos > 0 || fugas > 0) { fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8'); console.error('CONTROL FALLIDO'); process.exit(3); }
say();

hr();
say(`FIN — ${TOTAL} registros · dicen cerrado en texto: ${dicenCerrado.length} · de esos, con los tres en 0: ${sinBandera.length}`);
hr();

fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
console.log(`\n[salida escrita] ${SALIDA}`);
