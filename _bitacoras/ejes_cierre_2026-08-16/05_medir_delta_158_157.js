// _bitacoras/ejes_cierre_2026-08-16/05_medir_delta_158_157.js
//
// EJES-DEL-CIERRE — quinta pasada. Nombra el registro que produce la diferencia
// de UNO entre dos cifras de mi propia pasada 2:
//    158/173  convivencia medida sobre N3 (puntuacion a espacio)
//    157/173  "tapados" de derivarCondicion (solo .toUpperCase())
// La pasada 4 ya descarto que sea acentos o espacios. Queda la puntuacion.

const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const DIR = path.join(RAIZ, 'sondaje-sitport');
const RUTAS = path.join(RAIZ, 'src', 'routes', 'sitport-routes.js');
const SALIDA = path.resolve(__dirname, '05_medir_delta_158_157.txt');
const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));

const src = fs.readFileSync(RUTAS, 'utf8');
const i = src.indexOf('function derivarCondicion(r) {');
const m = src.slice(i).match(/\r?\n\}\r?\n/);
const derivarCondicion = eval('(' + src.slice(i, i + m.index + m[0].length).replace(/^function derivarCondicion/, 'function') + ')');

const capturas = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'bahias_sitport.json')
  .map(f => ({ f, mtime: fs.statSync(path.join(DIR, f)).mtime, recs: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).recordsets[0] || [] }))
  .sort((a, b) => a.mtime - b.mtime);
const filas = []; for (const c of capturas) for (const r of c.recs) filas.push({ cap: c.f, r });

const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const n3 = (s) => norm(s).replace(/[^A-Z0-9Ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const CRITERIO = /PUERTO CERRADO|CONDICION\s*DE\s*PUERTO/;
const RE_TRES = /\bTEMPORAL\b|\bMAL TIEMPO\b|\bTIEMPO VARIABLE\b/;

const A = filas.filter(({ r }) => CRITERIO.test(norm(r.Observacion)));
const con173 = A.filter(({ r }) => /PUERTO CERRADO/.test(norm(r.Observacion)));

hr();
say('EJES DEL CIERRE — PASADA 5: DE DONDE SALE LA DIFERENCIA DE UNO (158 vs 157)');
say(`Corrida: ${new Date().toISOString()} · denominador ${con173.length}`);
hr();
say();
const conviven = con173.filter(({ r }) => RE_TRES.test(n3(r.Observacion)));
const tapados = con173.filter(({ r }) => derivarCondicion(r) !== 'Puerto Cerrado');
say(`  convivencia sobre N3        : ${conviven.length} / ${con173.length}`);
say(`  tapados por derivarCondicion: ${tapados.length} / ${con173.length}`);
say();
const kk = (f) => `${f.cap}#${f.r.IDRestriccion}`;
const setT = new Set(tapados.map(kk));
const soloConviven = conviven.filter(f => !setT.has(kk(f)));
const setC = new Set(conviven.map(kk));
const soloTapados = tapados.filter(f => !setC.has(kk(f)));
say(`  conviven pero NO estan tapados : ${soloConviven.length}`);
for (const f of soloConviven) {
  say(`    ID ${f.r.IDRestriccion} · ${f.cap} · ${f.r.GLBahia}`);
  say(`      derivarCondicion -> ${JSON.stringify(derivarCondicion(f.r))}`);
  say(`      crudo  : ${JSON.stringify(String(f.r.Observacion).slice(0, 220))}`);
  say(`      N3     : ${JSON.stringify(n3(f.r.Observacion).slice(0, 220))}`);
}
say();
say(`  tapados pero NO conviven (entran por otra rama) : ${soloTapados.length}`);
for (const f of soloTapados) {
  say(`    ID ${f.r.IDRestriccion} · ${f.cap} · derivarCondicion -> ${JSON.stringify(derivarCondicion(f.r))}`);
  say(`      crudo  : ${JSON.stringify(String(f.r.Observacion).slice(0, 220))}`);
}
say();
hr();
say(`comparaciones efectivas: ${con173.length}`);
say('exit 0');
hr();
fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
