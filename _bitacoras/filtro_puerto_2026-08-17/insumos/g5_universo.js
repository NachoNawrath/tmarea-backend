// ─────────────────────────────────────────────────────────────────────────────
// PASOS 2-4 · FRENTE DEL FILTRO sitport-routes.js:333-338
//   2 · el universo real, con denominador declarado, en filas Y en restricciones
//   3 · los caminos de arreglo, como funciones
//   4 · aguas abajo por camino, las dos direcciones por separado
// SOLO LEE los repos. Material vivo y catálogo real desde captura CONGELADA.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path');
const BACK = 'C:/Users/katia/tmarea-backend';
const SP = path.join(BACK, 'src/routes/sitport-routes.js');
const AQUI = __dirname;

const fallas = [];
const falla = m => { fallas.push(m); console.log('  ✗ FALLA · ' + m); };

// ── EXTRACCIÓN VERBATIM, delimitada por estructura ───────────────────────────
const SRC = fs.readFileSync(SP, 'utf8');
function tajo(desdeLit, hastaLit, base) {
  const a = SRC.indexOf(desdeLit, base || 0);
  if (a < 0) { falla(`literal no encontrado: ${desdeLit}`); return null; }
  const b = SRC.indexOf(hastaLit, a);
  if (b < 0) { falla(`cierre no encontrado tras ${desdeLit}`); return null; }
  return SRC.slice(a, b + hastaLit.length);
}
const marcaPost = SRC.indexOf("router.post('/restricciones'");
if (marcaPost < 0) falla('no está router.post(/restricciones)');
const FILTRO_SRC = tajo('const norm = s =>', '\n    });', marcaPost);
const COORDS_SRC = tajo('const BAHIA_COORDS = {', '\n};');
for (const [lit, txt] of [['p.includes(w)', FILTRO_SRC], ['skip.includes(w)', FILTRO_SRC],
                          ['w.length > 3', FILTRO_SRC], ['lat:', COORDS_SRC]]) {
  if (!txt || !txt.includes(lit)) falla(`literal ausente del extracto: ${lit}`);
}
if (fallas.length) { console.log('ABORTA: extracción'); process.exit(2); }
const BAHIA_COORDS = new Function(COORDS_SRC + '\n return BAHIA_COORDS;')();
const filtroHoy = new Function('puerto', 'data', FILTRO_SRC + '\n    return filtradas;');

// SKIP y norm, tomados del MISMO extracto (no transcritos)
const SKIP = new Function(FILTRO_SRC.slice(0, FILTRO_SRC.indexOf('const p = norm')) + '\n return skip;')();
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const tokensBahia = (gl, skip = SKIP) => norm(gl).split(/\s+/).filter(w => w.length > 3 && !skip.includes(w));
const piezasPuerto = p => norm(p).split(/[^a-z0-9]+/).filter(Boolean);

const { derivarCierre } = require(path.join(BACK, 'src/services/cierre-derivador.js'));

// ── MATERIAL ─────────────────────────────────────────────────────────────────
function cargarSondaje() {
  const dir = path.join(BACK, 'sondaje-sitport');
  let filas = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json') && x !== 'bahias_sitport.json').sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    filas = filas.concat(j.recordsets ? j.recordsets[0] : j);
  }
  return filas;
}
const SONDAJE = cargarSondaje();
const congVivo = JSON.parse(fs.readFileSync(path.join(AQUI, 'CONGELADO_vivo.json'), 'utf8'));
const VIVO = congVivo.cuerpo.data;
const congPuertos = JSON.parse(fs.readFileSync(path.join(AQUI, 'CONGELADO_puertos.json'), 'utf8'));
const REAL = congPuertos.cuerpo.data;
const PROXY = JSON.parse(fs.readFileSync(path.join(BACK, 'caletas_chile.json'), 'utf8'));

const cerrada = (() => {
  const memo = new Map();
  return r => {
    if (!memo.has(r.IDRestriccion)) memo.set(r.IDRestriccion, derivarCierre(r).estado === 'cerrado');
    return memo.get(r.IDRestriccion);
  };
})();

// ── CATÁLOGOS como lista de {nombre, lat, lng, idBahia} ──────────────────────
// DEDUP POR NOMBRE — el filtro recibe un NOMBRE, así que dos filas con el mismo
// nombre son indistinguibles para él. Al colapsar se PREFIERE la fila anclada:
// un `new Map()` a secas se queda con la última y PIERDE un ancla en silencio
// (medido: 198 nombres anclados en la base, 197 tras un dedup ingenuo).
const dupNombres = (() => {
  const c = new Map();
  for (const p of REAL) c.set(p.nombre, (c.get(p.nombre) || 0) + 1);
  return [...c.entries()].filter(([, n]) => n > 1);
})();
const catReal = (() => {
  const m = new Map();
  for (const p of REAL) {
    const v = { nombre: p.nombre, lat: p.lat, lng: p.lng, idBahia: p.bahia_sitport_id ?? null };
    const y = m.get(p.nombre);
    if (!y || (y.idBahia == null && v.idBahia != null)) m.set(p.nombre, v);
  }
  return [...m.values()];
})();
const catProxy = [...new Map(PROXY.map(c => [c.nombre, {
  nombre: c.nombre, lat: c.latitud, lng: c.longitud, idBahia: null,
}])).values()];

// ── DISTANCIA ────────────────────────────────────────────────────────────────
const R_TIERRA = 6371;
function km(a, b) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TIERRA * Math.asin(Math.sqrt(x));
}
const COORDS = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: Number(id), lat: c.lat, lng: c.lng }));
function bahiaMasCercana(p) {
  if (p.lat == null || p.lng == null || Number.isNaN(p.lat)) return null;
  if (COORDS.length === 0) return null;   // sin coordenadas no hay ancla: se dice, no se revienta
  let mejor = null, d = Infinity;
  for (const c of COORDS) { const dd = km(p, c); if (dd < d) { d = dd; mejor = c; } }
  return mejor ? { id: mejor.id, km: d } : null;
}

// ── TOKENS GENÉRICOS, MEDIDOS (no elegidos a mano) ───────────────────────────
// Un token es GENÉRICO DE CATÁLOGO si aparece como pieza en >= K nombres de puerto.
const K_GENERICO = 10;
function tokensGenericosDeCatalogo(catalogo, material) {
  const piezasPorNombre = catalogo.map(p => new Set(piezasPuerto(p.nombre)));
  const univ = new Set();
  for (const r of material) for (const w of tokensBahia(r.GLBahia)) univ.add(w);
  const out = new Map();
  for (const w of univ) {
    let n = 0;
    for (const s of piezasPorNombre) if (s.has(w)) n++;
    if (n >= K_GENERICO) out.set(w, n);
  }
  return out;
}

// ── LOS CAMINOS ──────────────────────────────────────────────────────────────
function hacerResolvedores(catalogo, material) {
  const gen = tokensGenericosDeCatalogo(catalogo, material);
  const SKIP_AMPLIADO = SKIP.concat([...gen.keys()]);
  const porBahia = new Map();
  for (const r of material) {
    if (!porBahia.has(r.bahia)) porBahia.set(r.bahia, []);
    porBahia.get(r.bahia).push(r);
  }
  const deBahia = id => porBahia.get(id) || [];

  const O1 = p => { const pt = new Set(piezasPuerto(p.nombre));
    return material.filter(r => { const w = tokensBahia(r.GLBahia); return w.length > 0 && w.some(x => pt.has(x)); }); };
  const O2 = p => { const pn = norm(p.nombre);
    return material.filter(r => { const w = tokensBahia(r.GLBahia, SKIP_AMPLIADO); return w.length > 0 && w.some(x => pn.includes(x)); }); };
  const O3 = p => { const pt = new Set(piezasPuerto(p.nombre));
    return material.filter(r => { const w = tokensBahia(r.GLBahia, SKIP_AMPLIADO); return w.length > 0 && w.some(x => pt.has(x)); }); };
  const O5 = (p, radio = 25) => { const c = bahiaMasCercana(p); return (c && c.km <= radio) ? deBahia(c.id) : []; };

  return {
    gen, SKIP_AMPLIADO,
    O0: p => filtroHoy(p.nombre, material),
    O1, O2, O3,
    O4: p => (p.idBahia != null ? deBahia(p.idBahia) : O3(p)),
    O5: p => O5(p),
    O6: p => (p.idBahia != null ? deBahia(p.idBahia) : O5(p)),
    O5r: (p, r) => O5(p, r),
  };
}

// ── MEDICIÓN DE UN CAMINO ────────────────────────────────────────────────────
function medirCamino(fn, catalogo, material, nombreCamino) {
  let comparaciones = 0;
  const res = new Map();
  for (const p of catalogo) {
    const f = fn(p);
    comparaciones++;
    const ids = new Set(f.map(r => r.IDRestriccion));
    const bah = new Set(f.map(r => r.bahia));
    const cerr = f.filter(cerrada);
    res.set(p.nombre, {
      filas: f.length, ids, bahias: bah,
      cerradasFilas: cerr.length, cerradasIds: new Set(cerr.map(r => r.IDRestriccion)),
      primera: f.length ? f[0].bahia : null,
      idBahia: p.idBahia,
    });
  }
  const agg = { camino: nombreCamino, n: catalogo.length, comparaciones,
    conFilas: 0, proyRojo: 0, ambar: 0, mezcla: 0,
    filasTot: 0, idsTot: 0, cerradasFilasTot: 0 };
  for (const v of res.values()) {
    if (v.filas > 0) agg.conFilas++;
    if (v.cerradasFilas > 0) agg.proyRojo++; else if (v.filas > 0) agg.ambar++;
    if (v.bahias.size > 1) agg.mezcla++;
    agg.filasTot += v.filas; agg.idsTot += v.ids.size; agg.cerradasFilasTot += v.cerradasFilas;
  }
  return { agg, res };
}

// ── VERDAD DE TERRENO (los que traen bahia_sitport_id) ───────────────────────
function contraVerdad(res, catalogo) {
  const anclados = catalogo.filter(p => p.idBahia != null);
  const o = { anclados: anclados.length, aciertoIncluido: 0, soloAjenas: 0, conAjenas: 0,
    nada: 0, rotuloCorrecto: 0, rotuloAjeno: 0, rotuloNulo: 0, ajenasFilas: 0, ajenasCerradas: 0 };
  for (const p of anclados) {
    const v = res.get(p.nombre);
    const propia = v.bahias.has(p.idBahia);
    const ajenas = [...v.bahias].filter(b => b !== p.idBahia);
    if (v.filas === 0) o.nada++;
    else {
      if (propia) o.aciertoIncluido++;
      if (ajenas.length) o.conAjenas++;
      if (!propia && ajenas.length) o.soloAjenas++;
    }
    if (v.primera == null) o.rotuloNulo++;
    else if (v.primera === p.idBahia) o.rotuloCorrecto++;
    else o.rotuloAjeno++;
  }
  return o;
}

// ── DELTA AGUAS ABAJO, LAS DOS DIRECCIONES POR SEPARADO ──────────────────────
function delta(base, otro, catalogo) {
  const d = { nombresCambian: 0,
    dejanFilas: 0, dejanIds: 0, empiezanFilas: 0, empiezanIds: 0,
    puertosPierdenTodo: 0, puertosGananDesdeCero: 0,
    dejanDeSerRojo: 0, empiezanASerRojo: 0, rotuloCambia: 0 };
  for (const p of catalogo) {
    const a = base.get(p.nombre), b = otro.get(p.nombre);
    const salen = [...a.ids].filter(x => !b.ids.has(x));
    const entran = [...b.ids].filter(x => !a.ids.has(x));
    if (salen.length || entran.length) d.nombresCambian++;
    d.dejanIds += salen.length; d.empiezanIds += entran.length;
    d.dejanFilas += Math.max(0, a.filas - b.filas > 0 ? a.filas - b.filas : 0);
    d.empiezanFilas += Math.max(0, b.filas - a.filas > 0 ? b.filas - a.filas : 0);
    if (a.filas > 0 && b.filas === 0) d.puertosPierdenTodo++;
    if (a.filas === 0 && b.filas > 0) d.puertosGananDesdeCero++;
    if (a.cerradasFilas > 0 && b.cerradasFilas === 0) d.dejanDeSerRojo++;
    if (a.cerradasFilas === 0 && b.cerradasFilas > 0) d.empiezanASerRojo++;
    if (a.primera !== b.primera) d.rotuloCambia++;
  }
  return d;
}

// ═════════════════════════════════════════════════════════════════════════════
function corrida(catalogo, material, etqCat, etqMat) {
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`CATÁLOGO ${etqCat}  ×  MATERIAL ${etqMat}`);
  console.log('═'.repeat(78));
  if (catalogo.length === 0 || material.length === 0) { falla(`unidad vacía en ${etqCat}×${etqMat}`); return null; }

  const R = hacerResolvedores(catalogo, material);
  console.log(`  tokens genéricos de catálogo (>= ${K_GENERICO} nombres de puerto): ` +
    ([...R.gen.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}(${n})`).join(' · ') || '(ninguno)'));

  const caminos = [['O0 hoy', R.O0], ['O1 palabra', R.O1], ['O2 skip+', R.O2], ['O3 palabra+skip+', R.O3],
                   ['O4 id→O3', R.O4], ['O5 geo 25km', R.O5], ['O6 id→geo', R.O6]];
  const medidos = new Map();
  console.log('\n  camino            conFilas  proyRojo    ámbar   mezcla   filas   restr   cerrFilas');
  for (const [n, fn] of caminos) {
    const m = medirCamino(fn, catalogo, material, n);
    medidos.set(n, m);
    const a = m.agg;
    console.log('  ' + n.padEnd(18) + String(a.conFilas).padStart(8) + String(a.proyRojo).padStart(10)
      + String(a.ambar).padStart(9) + String(a.mezcla).padStart(9)
      + String(a.filasTot).padStart(8) + String(a.idsTot).padStart(8) + String(a.cerradasFilasTot).padStart(12));
  }
  console.log(`  (denominador: ${catalogo.length} nombres · material ${material.length} filas / ${new Set(material.map(r => r.IDRestriccion)).size} restricciones)`);

  const anclados = catalogo.filter(p => p.idBahia != null).length;
  if (anclados > 0) {
    console.log(`\n  CONTRA VERDAD DE TERRENO — ${anclados} puertos con bahia_sitport_id`);
    console.log('  camino            acierto  soloAjenas  conAjenas    nada   rótulo✓  rótuloAjeno  rótuloØ');
    for (const [n] of caminos) {
      const o = contraVerdad(medidos.get(n).res, catalogo);
      console.log('  ' + n.padEnd(18) + String(o.aciertoIncluido).padStart(7) + String(o.soloAjenas).padStart(12)
        + String(o.conAjenas).padStart(11) + String(o.nada).padStart(8)
        + String(o.rotuloCorrecto).padStart(10) + String(o.rotuloAjeno).padStart(13) + String(o.rotuloNulo).padStart(9));
    }
  }

  console.log('\n  AGUAS ABAJO contra O0 — las dos direcciones POR SEPARADO');
  console.log('  camino            cambian  DEJAN(restr)  EMPIEZAN(restr)  pierdenTodo  gananDe0  −rojo  +rojo  rótuloCambia');
  const base = medidos.get('O0 hoy').res;
  for (const [n] of caminos.slice(1)) {
    const d = delta(base, medidos.get(n).res, catalogo);
    console.log('  ' + n.padEnd(18) + String(d.nombresCambian).padStart(7) + String(d.dejanIds).padStart(14)
      + String(d.empiezanIds).padStart(17) + String(d.puertosPierdenTodo).padStart(13)
      + String(d.puertosGananDesdeCero).padStart(10) + String(d.dejanDeSerRojo).padStart(7)
      + String(d.empiezanASerRojo).padStart(7) + String(d.rotuloCambia).padStart(14));
  }
  return { R, medidos, caminos };
}

// ── CLASES DE DEFECTO ────────────────────────────────────────────────────────
function clases(catalogo, material, etq) {
  const R = hacerResolvedores(catalogo, material);
  const gen = R.gen;
  const bahiasPorToken = new Map();
  for (const r of material) for (const w of new Set(tokensBahia(r.GLBahia))) {
    if (!bahiasPorToken.has(w)) bahiasPorToken.set(w, new Set());
    bahiasPorToken.get(w).add(r.bahia);
  }
  const c = { D1: 0, D2: 0, D3: 0, D4: 0, nInvolucrados: 0 };
  for (const p of catalogo) {
    const f = filtroHoy(p.nombre, material);
    if (!f.length) continue;
    const pn = norm(p.nombre), pt = new Set(piezasPuerto(p.nombre));
    let d1 = false, d2 = false, d3 = false;
    for (const r of f) for (const w of tokensBahia(r.GLBahia)) {
      if (!pn.includes(w)) continue;
      if (!pt.has(w)) d1 = true;                                   // entró por SUBCADENA
      if ((bahiasPorToken.get(w) || new Set()).size > 1) d2 = true; // token compartido entre bahías
      if (gen.has(w)) d3 = true;                                   // genérico contra el catálogo
    }
    const d4 = new Set(f.map(r => r.bahia)).size > 1;
    if (d1) c.D1++; if (d2) c.D2++; if (d3) c.D3++; if (d4) c.D4++;
    if (d1 || d2 || d3 || d4) c.nInvolucrados++;
  }
  console.log(`\n  CLASES DE DEFECTO — ${etq} (denominador ${catalogo.length} nombres)`);
  console.log(`    D1 subcadena ............................... ${c.D1}`);
  console.log(`    D2 token compartido entre bahías del material  ${c.D2}`);
  console.log(`    D3 token genérico contra el catálogo ....... ${c.D3}`);
  console.log(`    D4 doble atribución (>1 bahía en la misma respuesta)  ${c.D4}`);
  console.log(`    nombres tocados por al menos una clase ..... ${c.nInvolucrados}`);
}

// ── VALIDACIÓN DEL ANCLA GEOGRÁFICA ──────────────────────────────────────────
function validarGeo() {
  const anclados = catReal.filter(p => p.idBahia != null && p.lat != null);
  if (!anclados.length) { falla('sin puertos anclados para validar geo'); return; }
  let ok = 0; const ds = [];
  const sinCoord = [];
  for (const p of anclados) {
    if (!BAHIA_COORDS[p.idBahia]) { sinCoord.push(p.idBahia); continue; }
    const c = bahiaMasCercana(p);
    ds.push(km(p, BAHIA_COORDS[p.idBahia]));
    if (c && c.id === p.idBahia) ok++;
  }
  ds.sort((a, b) => a - b);
  const q = f => ds[Math.min(ds.length - 1, Math.floor(ds.length * f))];
  console.log(`\n  VALIDACIÓN DEL ANCLA GEOGRÁFICA — contra los ${anclados.length} nombres con bahia_sitport_id`);
  console.log(`    la bahía MÁS CERCANA es la declarada en ....... ${ok} / ${anclados.length}`);
  console.log(`    distancia puerto→su bahía declarada (km): p50 ${q(.5).toFixed(1)} · p90 ${q(.9).toFixed(1)} · p99 ${q(.99).toFixed(1)} · máx ${ds[ds.length - 1].toFixed(1)}`);
  for (const lim of [25, 50, 100, 200]) {
    console.log(`    anclas declaradas a más de ${String(lim).padStart(3)} km del puerto ... ${ds.filter(d => d > lim).length}`);
  }
  console.log(`    ids anclados SIN coordenada en BAHIA_COORDS ... ${new Set(sinCoord).size}`);
  console.log('    sensibilidad al radio (catálogo REAL × SONDAJE, puertos con >=1 fila):');
  const R = hacerResolvedores(catReal, SONDAJE);
  for (const radio of [10, 25, 50, 100]) {
    let conFilas = 0, rojo = 0;
    for (const p of catReal) { const f = R.O5r(p, radio); if (f.length) conFilas++; if (f.some(cerrada)) rojo++; }
    console.log(`      radio ${String(radio).padStart(3)} km → conFilas ${String(conFilas).padStart(3)} · proyRojo ${String(rojo).padStart(3)}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('MATERIAL Y CATÁLOGOS — con unidad y con hora');
console.log(`  SONDAJE (versionado, 6 ficheros): ${SONDAJE.length} filas · ${new Set(SONDAJE.map(r => r.IDRestriccion)).size} restricciones · ${new Set(SONDAJE.map(r => r.bahia)).size} bahías · ${SONDAJE.filter(cerrada).length} filas cerradas`);
console.log(`  VIVO CONGELADO ${congVivo.congelado_en}: ${VIVO.length} filas · ${new Set(VIVO.map(r => r.IDRestriccion)).size} restricciones · ${new Set(VIVO.map(r => r.bahia)).size} bahías · ${VIVO.filter(cerrada).length} filas cerradas`);
console.log(`  CATÁLOGO REAL congelado ${congPuertos.congelado_en}: ${REAL.length} filas · ${catReal.length} nombres · ${catReal.filter(p => p.idBahia != null).length} con bahia_sitport_id`);
console.log(`  CATÁLOGO PROXY caletas_chile.json: ${PROXY.length} filas · ${catProxy.length} nombres · 0 con bahia_sitport_id`);
console.log(`  nombres DUPLICADOS en el catálogo real (indistinguibles para un filtro por nombre): ${dupNombres.length}`);
for (const [n, c] of dupNombres) console.log(`     ${c}× "${n}"`);
console.log(`  BAHIA_COORDS (sitport-routes.js): ${COORDS.length} bahías con coordenada`);
const bahiasMaterial = new Set(SONDAJE.map(r => r.bahia));
console.log(`  bahías del SONDAJE sin coordenada en BAHIA_COORDS: ${[...bahiasMaterial].filter(b => !BAHIA_COORDS[b]).length}`);

clases(catReal, SONDAJE, 'REAL 688 × SONDAJE 444');
clases(catProxy, SONDAJE, 'PROXY 481 × SONDAJE 444');
validarGeo();

corrida(catReal, SONDAJE, 'REAL 688', 'SONDAJE 444');
corrida(catProxy, SONDAJE, 'PROXY 481', 'SONDAJE 444');
corrida(catReal, VIVO, 'REAL 688', `VIVO ${VIVO.length}`);

// ═════════════════════════════════════════════════════════════════════════════
// MORDIDAS — se inyecta el defecto y se EXIGE el rojo. Un instrumento no se da
// por bueno porque corrió: tiene que fallar cuando el mundo está mal.
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(78));
console.log('MORDIDAS');
console.log('═'.repeat(78));
function exigir(etq, condicion, detalle) {
  console.log(`  ${condicion ? '✓ MUERDE ' : '✗ NO MUERDE'}  ${etq}   ${detalle}`);
  if (!condicion) falla(`mordida sin efecto: ${etq}`);
}

// M-A · el resolvedor devuelve siempre vacío → todo tiene que colapsar
{
  const m = medirCamino(() => [], catReal, SONDAJE, 'vacío');
  const o = contraVerdad(m.res, catReal);
  exigir('M-A resolvedor vacío', m.agg.conFilas === 0 && o.aciertoIncluido === 0,
    `conFilas ${m.agg.conFilas} · acierto ${o.aciertoIncluido}`);
}
// M-B · la verdad de terreno se falsea con un id inexistente → acierto a 0
{
  const catFalso = catReal.map(p => ({ ...p, idBahia: p.idBahia == null ? null : 999999 }));
  const R = hacerResolvedores(catFalso, SONDAJE);
  const m = medirCamino(R.O4, catFalso, SONDAJE, 'O4 con verdad falseada');
  const o = contraVerdad(m.res, catFalso);
  exigir('M-B verdad de terreno falseada', o.aciertoIncluido === 0 && o.rotuloCorrecto === 0,
    `acierto ${o.aciertoIncluido} · rótulo✓ ${o.rotuloCorrecto}`);
}
// M-C · material vacío → el instrumento tiene que abortar la corrida, no informar OK
{
  const antes = fallas.length;
  corrida(catReal, [], 'REAL 688', 'VACÍO 0');
  exigir('M-C material vacío', fallas.length > antes, `fallas ${antes} → ${fallas.length}`);
  fallas.length = antes; // esta falla es la ESPERADA; no cuenta contra el instrumento
}
// M-D · BAHIA_COORDS vaciado → el camino geográfico tiene que caer a 0
{
  const guardado = COORDS.splice(0, COORDS.length);
  const R = hacerResolvedores(catReal, SONDAJE);
  let conFilas = 0;
  for (const p of catReal) if (R.O5(p).length) conFilas++;
  COORDS.push(...guardado);
  exigir('M-D BAHIA_COORDS vaciado', conFilas === 0, `O5 conFilas ${conFilas} (con coords: 397)`);
}
// M-E · CONTROL POSITIVO del delta: comparar un camino consigo mismo da CERO.
//        Si no da cero, el delta inventa movimiento y ninguna cifra de aguas
//        abajo vale nada.
{
  const R = hacerResolvedores(catReal, SONDAJE);
  const m = medirCamino(R.O0, catReal, SONDAJE, 'O0');
  const d = delta(m.res, m.res, catReal);
  const todoCero = Object.values(d).every(v => v === 0);
  exigir('M-E delta contra sí mismo = 0', todoCero, JSON.stringify(d));
}
// M-F · sin catálogo → aborta
{
  const antes = fallas.length;
  corrida([], SONDAJE, 'VACÍO 0', 'SONDAJE 444');
  exigir('M-F catálogo vacío', fallas.length > antes, `fallas ${antes} → ${fallas.length}`);
  fallas.length = antes;
}

console.log('\n' + '═'.repeat(78));
if (fallas.length) { console.log(`${fallas.length} FALLA(S)`); process.exit(3); }
console.log('instrumento sin fallas · las 6 mordidas muerden');
