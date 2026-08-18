// ─────────────────────────────────────────────────────────────────────────────
// (1) CASCADA DE DESEMPATE — rendimiento MEDIDO de cada criterio, e irreductibles
// (2) LA LISTA DE LOS QUE CALLAN, con causa, qué haría falta y actividad
// (3) DÓNDE calla la app — por franja de latitud y por tipo de nodo
// SOLO LEE. No escribe en los repos.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path');
const BACK = 'C:/Users/katia/tmarea-backend', AQUI = __dirname;
const R_RADIO = 30, MARGEN = 10, RAZON = 3;

const fallas = []; const falla = m => { fallas.push(m); console.log('  ✗ FALLA · ' + m); };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const piezas = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 3);

// ── insumos versionados ──────────────────────────────────────────────────────
const SRC = fs.readFileSync(path.join(BACK, 'src/routes/sitport-routes.js'), 'utf8');
const a = SRC.indexOf('const BAHIA_COORDS = {'), b = SRC.indexOf('\n};', a);
if (a < 0 || b < 0) { falla('BAHIA_COORDS no extraíble'); process.exit(2); }
const BAHIA_COORDS = new Function(SRC.slice(a, b + 3) + '\n return BAHIA_COORDS;')();
const { getCapitaniaByBahiaId } = require(path.join(BACK, 'src/utils/capitanias'));
const { derivarCierre } = require(path.join(BACK, 'src/services/cierre-derivador.js'));
const bahiasCat = JSON.parse(fs.readFileSync(path.join(BACK, 'sondaje-sitport/bahias_sitport.json'), 'utf8')).recordsets[0];
const nombreBahia = new Map(bahiasCat.map(b => [Number(b.IDBahia), String(b.NMBahia || '').trim()]));
for (const [id, c] of Object.entries(BAHIA_COORDS)) if (!nombreBahia.has(Number(id))) nombreBahia.set(Number(id), c.nombre || '');

let SONDAJE = [];
for (const f of fs.readdirSync(path.join(BACK, 'sondaje-sitport')).filter(x => x.endsWith('.json') && x !== 'bahias_sitport.json').sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(BACK, 'sondaje-sitport', f), 'utf8'));
  SONDAJE = SONDAJE.concat(j.recordsets ? j.recordsets[0] : j);
}
const VIVO = JSON.parse(fs.readFileSync(path.join(AQUI, 'CONGELADO_vivo.json'), 'utf8')).cuerpo.data;
const bahiasSondaje = new Set(SONDAJE.map(r => r.bahia));
const bahiasSondajeCerradas = new Set(SONDAJE.filter(r => derivarCierre(r).estado === 'cerrado').map(r => r.bahia));
const bahiasVivo = new Set(VIVO.map(r => r.bahia));

// caletas_chile: señal de actividad pesquera declarada
const caletas = JSON.parse(fs.readFileSync(path.join(BACK, 'caletas_chile.json'), 'utf8'));
const caletaPorNombre = new Map(caletas.map(c => [norm(c.nombre), c]));

// ── catálogo real desde psql (trae COMUNA, que /api/puertos no devuelve) ─────
// VOLCADO EN JSON, NO EN TSV, Y NO ES UN DETALLE: el nodo 542 «Defensa Costera
// Sector Boca Budi» TIENE UN RETORNO DE CARRO DENTRO DEL `nombre`, y con TSV
// partía la fila en dos. Los dos fragmentos entraban con `idBahia = NaN`, que
// NO es `null`, así que los dos se contaban como ANCLADOS: 200 anclas donde hay
// 199, 689 nombres donde hay 688. Un separador que el dato puede contener no es
// un separador.
const crudo = JSON.parse(fs.readFileSync(path.join(AQUI, 'nodos.json'), 'utf8'));
if (!Array.isArray(crudo) || crudo.length === 0) { falla('nodos.json vacío o mal formado'); process.exit(2); }
const filas = crudo.map(r => ({
  id: r.id, nombre: String(r.nombre).trim(), tipo: r.tipo, fuente: r.fuente,
  region: r.region, provincia: r.provincia, comuna: r.comuna,
  idBahia: (r.bahia_sitport_id === null || r.bahia_sitport_id === undefined) ? null : Number(r.bahia_sitport_id),
  lat: r.lat === null ? null : Number(r.lat), lng: r.lng === null ? null : Number(r.lng),
}));
const sucios = crudo.filter(r => /[\r\n\t]/.test(String(r.nombre)) || String(r.nombre) !== String(r.nombre).trim());
if (sucios.length) console.log(`  aviso · ${sucios.length} nombres con espacio o control al borde (se recortan al leer): ` + sucios.map(r => r.id).join(', '));
for (const f of filas) {
  if (!Number.isFinite(f.id) || (f.lat !== null && !Number.isFinite(f.lat))) falla(`fila mal parseada: ${JSON.stringify(f).slice(0, 120)}`);
}
if (fallas.length) process.exit(2);
console.log(`insumo psql: ${filas.length} filas · ${new Set(filas.map(f => f.nombre)).size} nombres · ${filas.filter(f => f.idBahia != null).length} con ancla`);
// dedup por nombre PREFIRIENDO la fila anclada (un `new Map` a secas pierde anclas)
const cat = (() => { const m = new Map();
  for (const f of filas) { const y = m.get(f.nombre); if (!y || (y.idBahia == null && f.idBahia != null)) m.set(f.nombre, f); }
  return [...m.values()]; })();
if (cat.length === 0) { falla('catálogo vacío'); process.exit(2); }

// ── geometría ────────────────────────────────────────────────────────────────
const R_T = 6371, rad = Math.PI / 180;
const km = (p, q) => { const dLa = (q.lat - p.lat) * rad, dLo = (q.lng - p.lng) * rad;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(p.lat * rad) * Math.cos(q.lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R_T * Math.asin(Math.sqrt(x)); };
const COORDS = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: +id, lat: c.lat, lng: c.lng }));
const vecinas = p => (p.lat == null || Number.isNaN(p.lat)) ? []
  : COORDS.map(c => ({ id: c.id, d: km(p, c) })).sort((x, y) => x.d - y.d);

// ── CRITERIOS DE DESEMPATE ───────────────────────────────────────────────────
// Cada uno recibe el puerto y el conjunto de candidatas empatadas, y devuelve
// UNA candidata sólo si la señala SIN AMBIGÜEDAD (exactamente una la satisface).
function unico(cands, pred) { const ok = cands.filter(pred); return ok.length === 1 ? ok[0] : null; }
const CRITERIOS = [
  ['C2 razón de distancia (d2/d1 >= 3)', (p, c) => (c.length >= 2 && c[0].d > 0 && c[1].d / c[0].d >= RAZON) ? c[0] : (c.length >= 2 && c[0].d === 0 ? c[0] : null)],
  ['C3 comuna del puerto ↔ nombre de la bahía', (p, c) => {
    const com = new Set(piezas(p.comuna)); if (!com.size) return null;
    return unico(c, x => piezas(nombreBahia.get(x.id)).some(w => com.has(w)));
  }],
  ['C4 nombre del puerto ↔ nombre de la bahía', (p, c) => {
    const nom = new Set(piezas(p.nombre)); if (!nom.size) return null;
    return unico(c, x => piezas(nombreBahia.get(x.id)).some(w => nom.has(w)));
  }],
  ['C5 capitanía de la bahía ↔ comuna/provincia', (p, c) => {
    const geo = new Set([...piezas(p.comuna), ...piezas(p.provincia)]); if (!geo.size) return null;
    return unico(c, x => { const cap = getCapitaniaByBahiaId(x.id);
      return cap && [...piezas(cap.capitania), ...piezas(cap.gobernacion)].some(w => geo.has(w)); });
  }],
];

// ── CLASIFICACIÓN ────────────────────────────────────────────────────────────
const rend = new Map(CRITERIOS.map(([n]) => [n, 0]));
const resultado = [];
for (const p of cat) {
  const v = vecinas(p);
  if (p.idBahia != null) { resultado.push({ p, estado: 'confirmado_declarado', bahia: p.idBahia, via: 'bahia_sitport_id', v }); continue; }
  if (!v.length) { resultado.push({ p, estado: 'sin_coordenada', bahia: null, via: null, v }); continue; }
  const cands = v.filter(x => x.d <= R_RADIO);
  if (cands.length === 0) { resultado.push({ p, estado: 'fuera_de_radio', bahia: null, via: null, v }); continue; }
  if (cands.length === 1) { resultado.push({ p, estado: 'derivado_limpio', bahia: cands[0].id, via: 'única candidata', v }); continue; }
  if (cands[1].d - cands[0].d >= MARGEN) { resultado.push({ p, estado: 'derivado_limpio', bahia: cands[0].id, via: `margen >= ${MARGEN} km`, v }); continue; }
  const empate = cands.filter(x => x.d - cands[0].d < MARGEN);
  let ganada = null, viaGanada = null;
  for (const [nombre, fn] of CRITERIOS) {
    const g = fn(p, empate);
    if (g) { ganada = g; viaGanada = nombre; rend.set(nombre, rend.get(nombre) + 1); break; }
  }
  resultado.push(ganada
    ? { p, estado: 'desempatado', bahia: ganada.id, via: viaGanada, v, empate }
    : { p, estado: 'IRREDUCTIBLE', bahia: null, via: null, v, empate });
}

// ── SALIDA 1 · LA CASCADA ────────────────────────────────────────────────────
const cuenta = e => resultado.filter(r => r.estado === e).length;
console.log('\n' + '═'.repeat(78));
console.log(`(1) CASCADA DE DESEMPATE — radio ${R_RADIO} km · margen de empate ${MARGEN} km`);
console.log('═'.repeat(78));
console.log(`  denominador: ${cat.length} nombres del catálogo real\n`);
console.log(`  confirmado por ancla declarada (bahia_sitport_id) ... ${String(cuenta('confirmado_declarado')).padStart(4)}`);
console.log(`  derivado limpio por geometría ....................... ${String(cuenta('derivado_limpio')).padStart(4)}`);
console.log(`  ── entran a desempate (empate a menos de ${MARGEN} km) ── ${String(cuenta('desempatado') + cuenta('IRREDUCTIBLE')).padStart(4)}`);
for (const [n] of CRITERIOS) console.log(`       ${n.padEnd(46)} ${String(rend.get(n)).padStart(4)}`);
console.log(`       ${'IRREDUCTIBLE — ningún criterio lo señala'.padEnd(46)} ${String(cuenta('IRREDUCTIBLE')).padStart(4)}`);
console.log(`  fuera de todo radio ................................. ${String(cuenta('fuera_de_radio')).padStart(4)}`);
console.log(`  sin coordenada ...................................... ${String(cuenta('sin_coordenada')).padStart(4)}`);
const resueltos = cuenta('confirmado_declarado') + cuenta('derivado_limpio') + cuenta('desempatado');
console.log(`\n  RESUELTOS ........................................... ${String(resueltos).padStart(4)} / ${cat.length}`);
console.log(`  CALLAN .............................................. ${String(cat.length - resueltos).padStart(4)} / ${cat.length}`);

// ── SALIDA 2 · LOS QUE CALLAN, CON CAUSA ─────────────────────────────────────
function actividad(p, r) {
  const c = caletaPorNombre.get(norm(p.nombre));
  const cerca = r.v.length ? r.v[0] : null;
  return {
    tipo: p.tipo, fuente: p.fuente,
    caleta_pesquera: c ? 'sí' : 'no',
    actividades: c ? String(c.actividades || '').slice(0, 60) : '',
    bahia_mas_cercana: cerca ? `${cerca.id} ${nombreBahia.get(cerca.id) || ''} @${cerca.d.toFixed(1)}km` : '(sin coordenada)',
    bahia_con_restricciones: cerca ? (bahiasSondaje.has(cerca.id) ? 'sí' : 'no') : '—',
    bahia_con_cierres: cerca ? (bahiasSondajeCerradas.has(cerca.id) ? 'sí' : 'no') : '—',
  };
}
function queHaceFalta(r) {
  if (r.estado === 'sin_coordenada') return 'una coordenada para el nodo';
  if (r.estado === 'fuera_de_radio') {
    const d = r.v[0].d;
    return d > 200 ? `nodo interior/remoto: la bahía más cercana está a ${d.toFixed(0)} km — decidir si tiene jurisdicción marítima`
      : `ampliar el radio a ${Math.ceil(d)} km, o una bahía que hoy no está en BAHIA_COORDS`;
  }
  const e = r.empate.map(x => `${x.id} ${nombreBahia.get(x.id)} @${x.d.toFixed(1)}km`).join('  vs  ');
  return `adjudicación humana entre: ${e}`;
}
const callan = resultado.filter(r => ['IRREDUCTIBLE', 'fuera_de_radio', 'sin_coordenada'].includes(r.estado));
const CAUSA = { IRREDUCTIBLE: 'empate entre candidatas', fuera_de_radio: 'fuera de todo radio', sin_coordenada: 'coordenada ausente' };
const lineas = ['id\tnombre\ttipo\tfuente\tregion\tprovincia\tcomuna\tCAUSA\tQUE_HACE_FALTA\tbahia_mas_cercana\tbahia_con_restricciones\tbahia_con_cierres\tes_caleta_pesquera\tactividades'];
for (const r of callan.sort((x, y) => x.p.lat - y.p.lat)) {
  const A = actividad(r.p, r);
  lineas.push([r.p.id, r.p.nombre, r.p.tipo, r.p.fuente, r.p.region, r.p.provincia, r.p.comuna,
    CAUSA[r.estado], queHaceFalta(r), A.bahia_mas_cercana, A.bahia_con_restricciones, A.bahia_con_cierres,
    A.caleta_pesquera, A.actividades].join('\t'));
}
fs.writeFileSync(path.join(AQUI, 'LOS_QUE_CALLAN.tsv'), lineas.join('\n'), 'utf8');
console.log(`\n  lista escrita: LOS_QUE_CALLAN.tsv — ${callan.length} filas + cabecera`);

// ── SALIDA 3 · DÓNDE CALLA ───────────────────────────────────────────────────
console.log('\n' + '═'.repeat(78));
console.log('(3) DÓNDE CALLA — franja de latitud (derivada de la coordenada, no del rótulo)');
console.log('═'.repeat(78));
const franja = p => p.lat == null || Number.isNaN(p.lat) ? 'sin coordenada'
  : p.lat > -26 ? 'Norte grande (>-26)' : p.lat > -32 ? 'Norte chico (-26..-32)'
  : p.lat > -37 ? 'Centro (-32..-37)' : p.lat > -42 ? 'Sur (-37..-42)'
  : p.lat > -49 ? 'Los Lagos-Aysén (-42..-49)' : 'Magallanes (<-49)';
const F = new Map();
for (const r of resultado) {
  const k = franja(r.p);
  if (!F.has(k)) F.set(k, { total: 0, callan: 0, callanCaleta: 0 });
  const e = F.get(k); e.total++;
  if (['IRREDUCTIBLE', 'fuera_de_radio', 'sin_coordenada'].includes(r.estado)) {
    e.callan++;
    if (caletaPorNombre.has(norm(r.p.nombre)) || r.p.tipo === 'Caleta') e.callanCaleta++;
  }
}
console.log('  franja                          total   callan    %   de ésos, CALETAS');
for (const [k, e] of [...F.entries()].sort()) {
  console.log(`  ${k.padEnd(30)}${String(e.total).padStart(6)}${String(e.callan).padStart(9)}${(100 * e.callan / e.total).toFixed(0).padStart(5)}%${String(e.callanCaleta).padStart(18)}`);
}
console.log('\n  POR TIPO DE NODO — total en el catálogo vs cuántos callan');
const T = new Map();
for (const r of resultado) {
  const k = r.p.tipo || '(sin tipo)';
  if (!T.has(k)) T.set(k, { total: 0, callan: 0 });
  T.get(k).total++;
  if (['IRREDUCTIBLE', 'fuera_de_radio', 'sin_coordenada'].includes(r.estado)) T.get(k).callan++;
}
console.log('  tipo                             total   callan     %');
for (const [k, e] of [...T.entries()].sort((x, y) => y[1].callan - x[1].callan)) {
  console.log(`  ${k.padEnd(32)}${String(e.total).padStart(5)}${String(e.callan).padStart(9)}${(100 * e.callan / e.total).toFixed(0).padStart(6)}%`);
}
const callanConActividad = callan.filter(r => r.v.length && bahiasSondajeCerradas.has(r.v[0].id)).length;
console.log(`\n  de los ${callan.length} que callan, ${callanConActividad} tienen su bahía más cercana CON CIERRES en el sondaje 444.`);

// ── MORDIDAS ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(78));
console.log('MORDIDAS');
console.log('═'.repeat(78));
const exigir = (e, c, d) => { console.log(`  ${c ? '✓ MUERDE ' : '✗ NO MUERDE'}  ${e}   ${d}`); if (!c) falla(e); };
{ // M1 · sin coordenadas de bahía, TODO tiene que caer a sin resolver
  const g = COORDS.splice(0, COORDS.length);
  let res = 0; for (const p of cat) if (p.idBahia == null && vecinas(p).length) res++;
  COORDS.push(...g);
  exigir('M1 BAHIA_COORDS vaciado', res === 0, `derivables ${res}`);
}
{ // M2 · criterio que nunca señala → su rendimiento tiene que ser 0
  const r0 = unico([{ id: 1 }, { id: 2 }], () => false);
  const r2 = unico([{ id: 1 }, { id: 2 }], () => true);
  exigir('M2 `unico` no elige con 0 ni con 2 coincidencias', r0 === null && r2 === null, `0→${r0} · 2→${r2}`);
}
{ // M3 · comuna borrada → C3 tiene que dejar de rendir
  const antes = rend.get('C3 comuna del puerto ↔ nombre de la bahía');
  let n = 0;
  for (const r of resultado.filter(x => x.empate)) {
    const p = { ...r.p, comuna: '' };
    if (CRITERIOS[1][1](p, r.empate)) n++;
  }
  exigir('M3 comuna borrada', n === 0 && antes > 0, `C3 rendía ${antes} · sin comuna ${n}`);
}
{ // M4 · la lista escrita tiene que tener tantas filas como los que callan
  const l = fs.readFileSync(path.join(AQUI, 'LOS_QUE_CALLAN.tsv'), 'utf8').split('\n').length - 1;
  exigir('M4 la lista cuadra con el conteo', l === callan.length, `archivo ${l} · conteo ${callan.length}`);
}
console.log('\n' + (fallas.length ? `${fallas.length} FALLA(S)` : 'sin fallas · las mordidas muerden'));
if (fallas.length) process.exit(3);
