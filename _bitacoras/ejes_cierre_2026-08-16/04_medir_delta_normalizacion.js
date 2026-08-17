// _bitacoras/ejes_cierre_2026-08-16/04_medir_delta_normalizacion.js
//
// EJES-DEL-CIERRE — cuarta pasada, y mide UNA discrepancia de UNO que aparecio
// en la pasada 2: la convivencia medida sobre texto NORMALIZADO da 158/173 y
// los "tapados" de derivarCondicion dan 157/173. derivarCondicion solo hace
// .toUpperCase(). Si la diferencia es de normalizacion, entonces la afirmacion
// "normalizar no cambia ninguna de las 444 salidas, 0 registros afectados hoy"
// (bitacora cierre_observacion_2026-08-16, F3) tiene un contraejemplo.
//
// Se corre derivarCondicion DOS VECES: verbatim, y con el texto normalizado
// antes. Se comparan las 444 salidas.

const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const DIR = path.join(RAIZ, 'sondaje-sitport');
const RUTAS = path.join(RAIZ, 'src', 'routes', 'sitport-routes.js');
const SALIDA = path.resolve(__dirname, '04_medir_delta_normalizacion.txt');
const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
const volcar = () => fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');

const src = fs.readFileSync(RUTAS, 'utf8');
const i = src.indexOf('function derivarCondicion(r) {');
if (i === -1) { say('*** exit 4'); volcar(); process.exit(4); }
const m = src.slice(i).match(/\r?\n\}\r?\n/);
const derivarCondicion = eval('(' + src.slice(i, i + m.index + m[0].length).replace(/^function derivarCondicion/, 'function') + ')');

const capturas = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'bahias_sitport.json')
  .map(f => ({ f, mtime: fs.statSync(path.join(DIR, f)).mtime, recs: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).recordsets[0] || [] }))
  .sort((a, b) => a.mtime - b.mtime);
const filas = []; for (const c of capturas) for (const r of c.recs) filas.push({ cap: c.f, r });

// INV-0.3: sin acentos, espacios colapsados, mayusculas.
const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

hr();
say('EJES DEL CIERRE — PASADA 4: ¿NORMALIZAR CAMBIA ALGUNA SALIDA DE derivarCondicion?');
say(`Corrida: ${new Date().toISOString()} · ${filas.length} registros`);
hr();
say();
say('  Se corre derivarCondicion sobre el registro CRUDO y sobre una copia con');
say('  Observacion y MotivoRestriccion normalizados (INV-0.3). Se comparan.');
say();
let distintos = 0, comparadas = 0;
for (const { cap, r } of filas) {
  const a = derivarCondicion(r);
  const b = derivarCondicion({ Observacion: norm(r.Observacion), MotivoRestriccion: norm(r.MotivoRestriccion) });
  comparadas++;
  if (a !== b) {
    distintos++;
    say(`  ── ${cap} · ID ${r.IDRestriccion} · ${r.GLBahia}`);
    say(`     crudo      -> ${JSON.stringify(a)}`);
    say(`     normalizado-> ${JSON.stringify(b)}`);
    say(`     Observacion: ${JSON.stringify(String(r.Observacion).slice(0, 220))}`);
    say();
  }
}
say(`  comparaciones efectivas : ${comparadas} / 444`);
say(`  salidas que CAMBIAN     : ${distintos} / 444`);
if (comparadas === 0) { say('*** exit 5 — cero comparaciones'); volcar(); process.exit(5); }
say();
say('  NOTA: la segunda corrida normaliza tambien MotivoRestriccion, asi que un');
say('  cambio puede venir del fallback (:538-539) y no de las cuatro ramas. Se');
say('  distingue abajo: cuantos de los que cambian traen Observacion no vacia.');
const cambianConObs = filas.filter(({ r }) => {
  const a = derivarCondicion(r);
  const b = derivarCondicion({ Observacion: norm(r.Observacion), MotivoRestriccion: norm(r.MotivoRestriccion) });
  return a !== b && String(r.Observacion || '').trim() !== '';
}).length;
say(`  de los ${distintos} que cambian, con Observacion no vacia: ${cambianConObs}`);
say();
hr();
say('exit 0');
hr();
volcar();
