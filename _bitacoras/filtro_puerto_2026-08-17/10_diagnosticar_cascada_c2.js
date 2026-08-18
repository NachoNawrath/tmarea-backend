// ─────────────────────────────────────────────────────────────────────────────
// ENTRADA (18) — LA DEUDA DE INSTRUMENTO. Hace re-corrible lo que esa entrada
// afirma: que las cifras publicadas (C2 55 · C3 50 · C4 3 · C5 1) son las de
// `g7_desempate.js` y las del artefacto (47 · 55 · 6 · 1) las de `f1_generar.js`,
// y que la diferencia es UNA rama de C2 —`c[0].d === 0`— que toca OCHO filas.
//
// SOLO LEE. Los criterios se importan VERBATIM por tajo de texto de los dos
// ficheros versionados; si un literal no se encuentra es FALLA, no «no aplicable».
// Comprueba el sha256 de los dos entregables de F1 al abrir y al cerrar.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BACK = 'C:/Users/katia/tmarea-backend';
const INS = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/insumos');
const SALIDA = process.argv[2] || path.join(__dirname, '10_diagnosticar_cascada_c2.txt');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const falla = m => { fallas.push(m); say('  ✗ FALLA · ' + m); };
const exigir = (n, cond, det) => { if (cond) say(`  ✓ ${n} · ${det}`); else { fallas.push(n); say(`  ✗ ROJO EXIGIDO Y NO SALIÓ · ${n} · ${det}`); } };
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const N3 = n => String(n).padStart(3);
const cerrar = () => { fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
  console.log(`\n[evidencia] ${SALIDA} · ${fs.statSync(SALIDA).size} bytes`); process.exit(fallas.length ? 2 : 0); };

const RUTA_JOIN = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');
const RUTA_TSV = path.join(__dirname, 'F1_adjudicacion.tsv');
const RUTA_ROUTES = path.join(BACK, 'src/routes/sitport-routes.js');
const SHA_JOIN = 'dfd072361faa5607b7c487b73d5d45796d16ec10cbd99a613a5df7db351168f5';
const SHA_TSV = '0ca33c18e48229eba257573ff662cfb2f770e62b24d53354aae220c8d72a1788';

say('='.repeat(80));
say('ENTRADA (18) · LAS DOS CASCADAS — g7_desempate.js contra f1_generar.js');
say(`corrida ${new Date().toISOString()}`);
say('='.repeat(80));

say('\n0 · GUARDS');
if (sha256(RUTA_JOIN) !== SHA_JOIN) falla('join_puerto_bahia.json no es dfd07236…'); else say('  ✓ join dfd07236…');
if (sha256(RUTA_TSV) !== SHA_TSV) falla('F1_adjudicacion.tsv no es 0ca33c18…'); else say('  ✓ tsv 0ca33c18…');
if (fallas.length) { say('\nINSUMO NO VERIFICADO — no se mide nada.'); cerrar(); }

// ── 1 · IMPORTACIÓN VERBATIM ────────────────────────────────────────────────
say('\n1 · IMPORTACIÓN VERBATIM DE LOS CRITERIOS');
function tajo(src, ini, fin, quien) {
  const i = src.indexOf(ini);
  if (i < 0) { falla(`no se encuentra el literal en ${quien}: ${ini}`); return null; }
  const j = src.indexOf(fin, i + ini.length);
  if (j < 0) { falla(`el bloque no cierra en ${quien}: falta ${JSON.stringify(fin)}`); return null; }
  return src.slice(i, j + fin.length);
}
const SRC_F1 = fs.readFileSync(path.join(INS, 'f1_generar.js'), 'utf8');
const SRC_G7 = fs.readFileSync(path.join(INS, 'g7_desempate.js'), 'utf8');
const SRC_ROUTES = fs.readFileSync(RUTA_ROUTES, 'utf8');

const T_C2_F1 = "['C2_razon_distancia',";
const T_C2_G7 = "['C2 razón de distancia (d2/d1 >= 3)',";
const LIN_C2_F1 = tajo(SRC_F1, T_C2_F1, '],\n', 'f1_generar.js');
const LIN_C2_G7 = tajo(SRC_G7, T_C2_G7, '],\n', 'g7_desempate.js');
const BLOQUE_CRIT = tajo(SRC_F1, 'const CRITERIOS = [', '\n];', 'f1_generar.js');
const BLOQUE_KM = tajo(SRC_F1, 'const km = (p, q) =>', 'Math.asin(Math.sqrt(x)); };', 'f1_generar.js');
const BLOQUE_COORDS = tajo(SRC_ROUTES, 'const BAHIA_COORDS = {', '\n};', 'src/routes/sitport-routes.js');
if (fallas.length) { say('\nNO SE PUDO IMPORTAR — es falla, no «no aplicable».'); cerrar(); }
say(`  ✓ C2 de f1_generar (${LIN_C2_F1.length} b) · C2 de g7 (${LIN_C2_G7.length} b) · CRITERIOS (${BLOQUE_CRIT.length} b) · km() (${BLOQUE_KM.length} b) · BAHIA_COORDS (${BLOQUE_COORDS.length} b)`);
exigir('CP-1 · el tajo discrimina',
  tajo(SRC_F1, "['C2_razon_QUE_NO_EXISTE',", '],\n', '(control)') === null && fallas.pop() !== undefined,
  'un literal inexistente NO se encuentra — si «se encontrara», los tajos de arriba no dirían nada');
exigir('CP-2 · las dos líneas de C2 son distintas', LIN_C2_F1 !== LIN_C2_G7,
  'si fueran el mismo texto, no habría nada que diagnosticar');

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const piezas = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 3);
const unico = (c, f) => { const ok = c.filter(f); return ok.length === 1 ? ok[0] : null; };
const { getCapitaniaByBahiaId } = require(path.join(BACK, 'src/utils/capitanias'));
const R_T = 6371, rad = Math.PI / 180;
const km = new Function('R_T', 'rad', BLOQUE_KM + ' return km;')(R_T, rad);
const BAHIA_COORDS = new Function(BLOQUE_COORDS + '\nreturn BAHIA_COORDS;')();
say(`  ✓ BAHIA_COORDS evaluado · ${Object.keys(BAHIA_COORDS).length} bahías`);
if (Object.keys(BAHIA_COORDS).length === 0) falla('BAHIA_COORDS sin entradas — piso por unidad');

// CRITERIOS de f1 verbatim; la variante g7 sustituye SÓLO la línea de C2.
function criterios(lineaC2, nombreBahia) {
  const bloque = BLOQUE_CRIT.replace(LIN_C2_F1, lineaC2);
  if (lineaC2 !== LIN_C2_F1 && bloque === BLOQUE_CRIT) { falla('la sustitución de C2 no mordió el bloque'); return null; }
  return new Function('norm', 'piezas', 'unico', 'RAZON', 'nombreBahia', 'getCapitaniaByBahiaId',
    bloque + '\nreturn CRITERIOS;')(norm, piezas, unico, 3, nombreBahia, getCapitaniaByBahiaId);
}

// ── 2 · REPLAY DE LAS DOS CASCADAS ──────────────────────────────────────────
say('\n2 · REPLAY SOBRE LAS 109 `desempatado` DEL ARTEFACTO');
const J = JSON.parse(fs.readFileSync(RUTA_JOIN, 'utf8'));
const DES = J.filas.filter(f => f.estado === 'desempatado');
if (DES.length !== 109) falla(`se esperaban 109 desempatadas y hay ${DES.length}`);

function corrida(lineaC2) {
  const res = new Map(); const cuenta = { C2: 0, C3: 0, C4: 0, C5: 0, SIN: 0 };
  for (const f of DES) {
    const e = f.evidencia.empate_entre;
    const nombreBahia = new Map(e.map(x => [x.bahia_id, x.nombre]));
    const CR = criterios(lineaC2, nombreBahia); if (!CR) return null;
    // el mismo valor bajo los dos nombres: f1 lee `.km`, g7 lee `.d`
    const cands = e.map(x => ({ id: x.bahia_id, km: x.km, d: x.km }));
    let g = null, v = null;
    for (const [n, fn] of CR) { const r = fn(f, cands); if (r) { g = r; v = String(n).slice(0, 2); break; } }
    if (!g) { cuenta.SIN++; res.set(f.nodo_id, null); continue; }
    cuenta[v]++; res.set(f.nodo_id, { via: v, bahia: g.id });
  }
  return { cuenta, res };
}
const A = corrida(LIN_C2_F1), B = corrida(LIN_C2_G7);
if (!A || !B) { say('\nREPLAY IMPOSIBLE.'); cerrar(); }
const P = c => `C2 ${N3(c.C2)} · C3 ${N3(c.C3)} · C4 ${N3(c.C4)} · C5 ${N3(c.C5)} · sin resolver ${c.SIN}`;
say(`  artefacto (JSON) ............... C2  47 · C3  55 · C4   6 · C5   1`);
say(`  replay con la C2 de f1_generar . ${P(A.cuenta)}`);
say(`  bitácora F1 (publicado) ........ C2  55 · C3  50 · C4   3 · C5   1`);
say(`  replay con la C2 de g7 ......... ${P(B.cuenta)}`);
exigir('R-A · el replay reproduce el artefacto',
  A.cuenta.C2 === 47 && A.cuenta.C3 === 55 && A.cuenta.C4 === 6 && A.cuenta.C5 === 1 && A.cuenta.SIN === 0,
  'la C2 de f1_generar da 47·55·6·1');
exigir('R-B · el replay reproduce lo publicado',
  B.cuenta.C2 === 55 && B.cuenta.C3 === 50 && B.cuenta.C4 === 3 && B.cuenta.C5 === 1 && B.cuenta.SIN === 0,
  'la C2 de g7 da 55·50·3·1 — las cifras tachadas eran de este instrumento');

let malA = 0, malB = 0;
for (const f of DES) {
  const a = A.res.get(f.nodo_id), b = B.res.get(f.nodo_id);
  if (!a || a.bahia !== f.bahia_id || !f.via.startsWith(a.via)) malA++;
  if (!b || b.bahia !== f.bahia_id || !f.via.startsWith(b.via)) malB++;
}
exigir('R-C · control 109/109 fila por fila', malA === 0, `replay A contra el artefacto: ${DES.length - malA}/${DES.length}`);
exigir('R-D · control positivo del control', malB > 0, `replay B discrepa en ${malB} filas — si fuera 0, R-C no distinguiría las dos cascadas`);

// ── 3 · LAS OCHO FILAS, NOMBRADAS ───────────────────────────────────────────
say('\n3 · LAS FILAS CON CANDIDATA A 0,00 km — NOMBRADAS, Y SU DESTINO EN CADA CASCADA');
const CERO = DES.filter(f => f.evidencia.empate_entre[0].km === 0);
say(`  filas de las 109 cuya candidata más cercana está a 0,00 km: ${CERO.length}`);
let mismaBahia = 0, cambian = [];
const dest = { C3: 0, C4: 0, otro: 0 };
for (const f of CERO) {
  const a = A.res.get(f.nodo_id), b = B.res.get(f.nodo_id);
  const na = f.evidencia.empate_entre.find(x => x.bahia_id === a.bahia);
  const nb = f.evidencia.empate_entre.find(x => x.bahia_id === b.bahia);
  if (a.bahia === b.bahia) mismaBahia++; else cambian.push(f.nodo_id);
  if (a.via === 'C3') dest.C3++; else if (a.via === 'C4') dest.C4++; else dest.otro++;
  say(`    nodo ${N3(f.nodo_id)} ${f.nombre.slice(0, 30).padEnd(30)} g7 ${b.via}→${N3(b.bahia)} «${(nb ? nb.nombre : '?').replace(/\s+/g, ' ').slice(0, 24)}» ${String(nb ? nb.km : '?').padStart(5)} km`);
  say(`             ${' '.repeat(30)} f1 ${a.via}→${N3(a.bahia)} «${(na ? na.nombre : '?').replace(/\s+/g, ' ').slice(0, 24)}» ${String(na ? na.km : '?').padStart(5)} km${a.bahia !== b.bahia ? '   ← CAMBIA DE BAHÍA' : ''}`);
}
exigir('D-1 · las ocho caen 5 a C3 y 3 a C4',
  CERO.length === 8 && dest.C3 === 5 && dest.C4 === 3 && dest.otro === 0,
  `${CERO.length} filas · a C3 ${dest.C3} · a C4 ${dest.C4} · a otro ${dest.otro}`);
exigir('D-2 · 7 de 8 eligen la misma bahía igual, y la única que cambia es Guayacán',
  mismaBahia === 7 && cambian.length === 1 && cambian[0] === 59,
  `misma bahía ${mismaBahia}/8 · cambian [${cambian.join(',')}] (se exige sólo el nodo 59)`);
say('  ES LA AFIRMACIÓN QUE SOSTIENE EL PRECIO DE (b1): si cambiaran más, (b1)');
say('  dejaría de costar una fila y habría que volver a decidirlo.');

// ── 4 · EL LÍMITE DEL REDONDEO, MEDIDO ──────────────────────────────────────
say('\n4 · EL LÍMITE DECLARADO — el replay usa los km del artefacto, redondeados a');
say('    2 decimales, y g7 corría SIN redondear. ¿Puede eso mover alguna de las 8?');
let exacto = 0, casi = [], sinCoord = 0;
for (const f of CERO) {
  const b = BAHIA_COORDS[f.evidencia.empate_entre[0].bahia_id];
  if (!b || f.lat == null) { sinCoord++; continue; }
  const d = km({ lat: f.lat, lng: f.lng }, { lat: b.lat, lng: b.lng });
  if (d === 0) exacto++; else casi.push(`${f.nodo_id}:${d.toExponential(2)}`);
}
say(`    distancia SIN redondear a su candidata más cercana: ${exacto}/${CERO.length} son 0 EXACTO`);
if (casi.length) say(`    las que no: ${casi.join(' · ')}`);
if (sinCoord) say(`    sin coordenada resoluble: ${sinCoord}`);
// LA HIPÓTESIS ERA «las 8 están a cero exacto y la rama `d === 0` dispara igual
// sin redondeo». QUEDÓ REFUTADA: ninguna está a cero. Se recorta el alcance de la
// aserción a lo que sí se mide —que el redondeo NO es inocente— y lo que se sigue
// de ahí lo cierra 4-bis.
exigir('D-3 · ninguna de las ocho está a cero exacto, así que el redondeo NO es inocente',
  exacto === 0 && sinCoord === 0 && CERO.length === 8,
  `las 8 están entre 1,5 y 4,4 METROS de su bahía, no a cero. \`+km().toFixed(2)\` de f1_generar las lleva a 0,00. REFUTA que la rama \`d === 0\` de g7 sea el mecanismo: g7 NO redondeaba, así que esa rama no podía dispararle a ninguna. Qué sí disparaba, en 4-bis`);

// ── 4-bis · SI NO ESTÁN A CERO EXACTO, ¿QUÉ RESOLVÍA g7? ────────────────────
// D-3 en rojo obliga a esto: la rama `d === 0` NO puede ser la que disparaba en
// g7, porque g7 NO redondeaba y ninguna de las 8 está a cero. Se recalcula el
// empate SIN redondear para las 8 y se les aplica la C2 de f1_generar VERBATIM.
say('\n4-bis · EL MECANISMO REAL — la misma C2 de f1_generar sobre distancias SIN redondear');
const COORDS = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: +id, lat: c.lat, lng: c.lng }));
let resuelveC2 = 0, mismaB = 0, detalle = [];
for (const f of CERO) {
  const v = COORDS.map(c => ({ id: c.id, km: km(f, c), d: km(f, c) })).sort((x, y) => x.km - y.km)
    .filter(x => x.km <= 30);
  const emp = v.filter(x => x.km - v[0].km < 10);
  const nombreBahia = new Map(f.evidencia.empate_entre.map(x => [x.bahia_id, x.nombre]));
  const CR = criterios(LIN_C2_F1, nombreBahia);
  const g = CR[0][1](f, emp);           // SÓLO C2, la de f1_generar, verbatim
  if (g) { resuelveC2++; if (g.id === B.res.get(f.nodo_id).bahia) mismaB++; }
  detalle.push(`${f.nodo_id}${g ? `→C2:${g.id}` : '→C2 no resuelve'} (d1=${v[0].km.toFixed(5)} d2=${(v[1] ? v[1].km : NaN).toFixed(2)} razón=${v[1] ? (v[1].km / v[0].km).toFixed(0) : '—'})`);
}
say('    ' + detalle.join('\n    '));
exigir('D-4 · el mecanismo es EL REDONDEO, no la rama `d === 0`',
  resuelveC2 === CERO.length && mismaB === CERO.length,
  resuelveC2 === CERO.length
    ? `sin redondear, la MISMA C2 de f1_generar resuelve las ${CERO.length} por su rama de RAZÓN y elige la misma bahía que g7. Lo que las tira abajo en la cascada es \`+km().toFixed(2)\`: convierte 1,5–4,4 m en 0,00 y entonces el guard \`c[0].km > 0\` de la propia C2 las descarta`
    : `sólo ${resuelveC2}/${CERO.length} resuelven en C2 sin redondear (misma bahía ${mismaB}) — el mecanismo NO está cerrado`);

// ── 5 · MORDIDA ─────────────────────────────────────────────────────────────
say('\n5 · MORDIDA — parche anclado al token sintáctico completo');
const TOKEN = 'c[0].d === 0';
const C2_MORDIDA = LIN_C2_G7.replace(TOKEN, 'c[0].d === -1');
const M = LIN_C2_G7 !== C2_MORDIDA ? corrida(C2_MORDIDA) : null;
exigir('M-A · la rama de C2 es la que produce la diferencia',
  !!M && M.cuenta.C2 === 47 && M.cuenta.C3 === 55 && M.cuenta.C4 === 6 && M.cuenta.C5 === 1,
  M ? `desactivando SÓLO \`${TOKEN}\` en la línea de g7, su cascada colapsa a la de f1_generar: ${P(M.cuenta)}`
    : `el token \`${TOKEN}\` no se encontró en la línea de g7 — la mordida no mordió`);
const C2_FALSA = LIN_C2_G7.replace('c[0].d > 0', 'c[0].d > 0 /* intacto */');
const MF = corrida(C2_FALSA);
exigir('M-B · una mordida que NO toca el mecanismo no mueve nada',
  !!MF && MF.cuenta.C2 === 55 && MF.cuenta.C3 === 50,
  'un parche cosmético en la misma línea deja 55·50·3·1 — es el control de que M-A le pegó al mecanismo y no a cualquier cosa');

// ── 6 · CIERRE ──────────────────────────────────────────────────────────────
say('\n6 · CIERRE');
if (sha256(RUTA_JOIN) !== SHA_JOIN) falla('el join CAMBIÓ durante la corrida'); else say('  ✓ join dfd07236… sin tocar');
if (sha256(RUTA_TSV) !== SHA_TSV) falla('la hoja CAMBIÓ durante la corrida'); else say('  ✓ tsv 0ca33c18… sin tocar');
say('\n' + '='.repeat(80));
say(fallas.length ? `FALLAS: ${fallas.length}` : 'SIN FALLAS');
say('QUÉ NO PRUEBA: no re-corre g7 sobre su propio insumo — reproduce su cascada');
say('sobre los empates que dejó escritos el artefacto. Y no dice cuál de las dos');
say('cascadas es la correcta: dice que son dos y en qué difieren.');
say('='.repeat(80));
cerrar();
