// ─────────────────────────────────────────────────────────────────────────────
// F1 · DERIVAR EL JOIN puerto→bahía Y NO APLICARLO
// Escribe DOS cosas y ninguna es código:
//   data/catalogo/join_puerto_bahia.json          — el artefacto, 688 filas
//   _bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv — la hoja de trabajo
// NO TOCA src/. Nadie consume el artefacto todavía.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BACK = 'C:/Users/katia/tmarea-backend', AQUI = __dirname;
const RADIO = 30, MARGEN = 10, RAZON = 3;

const fallas = []; const falla = m => { fallas.push(m); console.log('  ✗ FALLA · ' + m); };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const piezas = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 3);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

// ── INSUMOS, cada uno con su sha256 ──────────────────────────────────────────
const SRC = fs.readFileSync(path.join(BACK, 'src/routes/sitport-routes.js'), 'utf8');
const a = SRC.indexOf('const BAHIA_COORDS = {'), b = SRC.indexOf('\n};', a);
if (a < 0 || b < 0) { falla('BAHIA_COORDS no extraíble'); process.exit(2); }
const BLOQUE_COORDS = SRC.slice(a, b + 3);
const BAHIA_COORDS = new Function(BLOQUE_COORDS + '\n return BAHIA_COORDS;')();
const { getCapitaniaByBahiaId } = require(path.join(BACK, 'src/utils/capitanias'));
const { derivarCierre } = require(path.join(BACK, 'src/services/cierre-derivador.js'));

const rutaBahias = path.join(BACK, 'sondaje-sitport/bahias_sitport.json');
const bahiasCat = JSON.parse(fs.readFileSync(rutaBahias, 'utf8')).recordsets[0];
const nombreBahia = new Map(bahiasCat.map(x => [Number(x.IDBahia), String(x.NMBahia || '').trim()]));
for (const [id, c] of Object.entries(BAHIA_COORDS)) if (!nombreBahia.has(Number(id))) nombreBahia.set(Number(id), c.nombre || '');

let SONDAJE = [];
const ficherosSondaje = fs.readdirSync(path.join(BACK, 'sondaje-sitport'))
  .filter(x => x.endsWith('.json') && x !== 'bahias_sitport.json').sort();
for (const f of ficherosSondaje) {
  const j = JSON.parse(fs.readFileSync(path.join(BACK, 'sondaje-sitport', f), 'utf8'));
  SONDAJE = SONDAJE.concat(j.recordsets ? j.recordsets[0] : j);
}
const bahiasConFilas = new Set(SONDAJE.map(r => r.bahia));
const bahiasConCierres = new Set(SONDAJE.filter(r => derivarCierre(r).estado === 'cerrado').map(r => r.bahia));

// nodos_maritimos volcado en JSON (NO en TSV: el nodo 542 trae \r en el nombre)
const rutaNodos = path.join(AQUI, 'nodos.json');
const crudo = JSON.parse(fs.readFileSync(rutaNodos, 'utf8'));
if (!Array.isArray(crudo) || crudo.length === 0) { falla('nodos.json vacío'); process.exit(2); }
const limpiar = s => String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim();
const filas = crudo.map(r => ({
  id: r.id, nombre: limpiar(r.nombre), nombre_crudo_sucio: /[\r\n\t]/.test(String(r.nombre)) || String(r.nombre) !== String(r.nombre).trim(),
  tipo: limpiar(r.tipo), fuente: limpiar(r.fuente), region: limpiar(r.region),
  provincia: limpiar(r.provincia), comuna: limpiar(r.comuna),
  idBahia: r.bahia_sitport_id == null ? null : Number(r.bahia_sitport_id),
  lat: r.lat == null ? null : Number(r.lat), lng: r.lng == null ? null : Number(r.lng),
}));
// dedup por nombre PREFIRIENDO la fila anclada
const cat = (() => { const m = new Map();
  for (const f of filas) { const y = m.get(f.nombre); if (!y || (y.idBahia == null && f.idBahia != null)) m.set(f.nombre, f); }
  return [...m.values()]; })();
if (cat.length === 0) { falla('catálogo vacío'); process.exit(2); }

// ── GEOMETRÍA ────────────────────────────────────────────────────────────────
const R_T = 6371, rad = Math.PI / 180;
const km = (p, q) => { const dLa = (q.lat - p.lat) * rad, dLo = (q.lng - p.lng) * rad;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(p.lat * rad) * Math.cos(q.lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R_T * Math.asin(Math.sqrt(x)); };
const COORDS = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: +id, lat: c.lat, lng: c.lng }));
const vecinas = p => (p.lat == null || Number.isNaN(p.lat)) ? []
  : COORDS.map(c => ({ id: c.id, km: +km(p, c).toFixed(2) })).sort((x, y) => x.km - y.km);

// ── CRITERIOS DE DESEMPATE ───────────────────────────────────────────────────
const unico = (c, f) => { const ok = c.filter(f); return ok.length === 1 ? ok[0] : null; };
const CRITERIOS = [
  ['C2_razon_distancia', (p, c) => (c.length >= 2 && c[0].km > 0 && c[1].km / c[0].km >= RAZON) ? c[0] : null],
  ['C3_comuna_vs_bahia', (p, c) => { const g = new Set(piezas(p.comuna)); if (!g.size) return null;
    return unico(c, x => piezas(nombreBahia.get(x.id)).some(w => g.has(w))); }],
  ['C4_nombre_vs_bahia', (p, c) => { const g = new Set(piezas(p.nombre)); if (!g.size) return null;
    return unico(c, x => piezas(nombreBahia.get(x.id)).some(w => g.has(w))); }],
  ['C5_capitania_vs_geo', (p, c) => { const g = new Set([...piezas(p.comuna), ...piezas(p.provincia)]); if (!g.size) return null;
    return unico(c, x => { const cap = getCapitaniaByBahiaId(x.id);
      return cap && [...piezas(cap.capitania), ...piezas(cap.gobernacion)].some(w => g.has(w)); }); }],
];

// ── QUÉ HACE FALTA PARA ADJUDICAR — criterio MEDIDO, no opinado ──────────────
// Si todas las candidatas comparten capitanía Y gobernación, elegir mal NO cambia
// a quién se contacta: es una pregunta de costa. Si están en capitanías distintas,
// la elección cambia la jurisdicción y eso lo dice la Autoridad Marítima.
function quienAdjudica(cands) {
  const caps = cands.map(x => { const c = getCapitaniaByBahiaId(x.id); return c ? `${c.capitania}|${c.gobernacion}` : null; });
  if (caps.some(c => c === null)) return { nivel: 'catalogo', motivo: 'alguna candidata no tiene capitanía mapeada — se arregla el catálogo, no se pregunta' };
  const distintas = new Set(caps);
  if (distintas.size === 1) return { nivel: 'costa', motivo: `las ${cands.length} candidatas comparten capitanía (${caps[0].split('|')[0]}): elegir mal no cambia a quién se contacta, sólo qué restricciones llegan` };
  return { nivel: 'capitania', motivo: `las candidatas están en capitanías distintas (${[...distintas].map(c => c.split('|')[0]).join(' / ')}): la elección cambia la jurisdicción` };
}

// ── CLASIFICACIÓN ────────────────────────────────────────────────────────────
const VOCABULARIO = ['confirmado_declarado', 'derivado_limpio', 'desempatado', 'a_adjudicar', 'sin_bahia_en_catalogo'];
const salida = [];
for (const p of cat) {
  const v = vecinas(p);
  const base = { nodo_id: p.id, nombre: p.nombre, tipo: p.tipo, fuente: p.fuente,
    region: p.region, provincia: p.provincia, comuna: p.comuna, lat: p.lat, lng: p.lng,
    nombre_venia_sucio: p.nombre_venia_sucio === true || p.nombre_crudo_sucio === true };
  const cand = v.filter(x => x.km <= RADIO).map(x => ({ bahia_id: x.id, nombre: nombreBahia.get(x.id) || '', km: x.km }));

  if (p.idBahia != null) {
    salida.push({ ...base, bahia_id: p.idBahia, estado: 'confirmado_declarado', via: 'bahia_sitport_id',
      evidencia: { fuente_del_ancla: 'nodos_maritimos.bahia_sitport_id',
        km_a_esa_bahia: BAHIA_COORDS[p.idBahia] ? +km(p, BAHIA_COORDS[p.idBahia]).toFixed(2) : null,
        la_geografia_coincide: v.length ? v[0].id === p.idBahia : null, candidatas: cand },
      adjudicacion: null });
    continue;
  }
  if (cand.length === 0) {
    salida.push({ ...base, bahia_id: null, estado: 'sin_bahia_en_catalogo', via: null,
      evidencia: { bahia_mas_cercana: v.length ? { bahia_id: v[0].id, nombre: nombreBahia.get(v[0].id) || '', km: v[0].km } : null,
        radio_km: RADIO, candidatas: [] },
      adjudicacion: null });
    continue;
  }
  if (cand.length === 1 || cand[1].km - cand[0].km >= MARGEN) {
    salida.push({ ...base, bahia_id: cand[0].bahia_id, estado: 'derivado_limpio',
      via: cand.length === 1 ? 'unica_candidata_en_radio' : `margen_>=${MARGEN}km`,
      evidencia: { km: cand[0].km, margen_km: cand.length > 1 ? +(cand[1].km - cand[0].km).toFixed(2) : null, candidatas: cand },
      adjudicacion: null });
    continue;
  }
  const empate = cand.filter(x => x.km - cand[0].km < MARGEN);
  const empateV = empate.map(x => ({ id: x.bahia_id, km: x.km }));
  let ganada = null, via = null;
  for (const [n, fn] of CRITERIOS) { const g = fn(p, empateV); if (g) { ganada = g; via = n; break; } }
  if (ganada) {
    salida.push({ ...base, bahia_id: ganada.id, estado: 'desempatado', via,
      evidencia: { empate_entre: empate, elegida_km: ganada.km }, adjudicacion: null });
  } else {
    const q = quienAdjudica(empateV);
    salida.push({ ...base, bahia_id: null, estado: 'a_adjudicar', via: null,
      evidencia: { empate_entre: empate,
        alguna_candidata_con_cierres: empate.some(x => bahiasConCierres.has(x.bahia_id)),
        alguna_candidata_con_restricciones: empate.some(x => bahiasConFilas.has(x.bahia_id)),
        quien_adjudica: q.nivel, por_que: q.motivo },
      adjudicacion: null });
  }
}

// ── PRIORIDAD DE LA HOJA DE TRABAJO — declarada, no implícita ────────────────
const PESO_TIPO = { 'Puerto': 0, 'puerto': 0, 'Terminal': 1, 'Caleta': 2, 'Muelle': 3,
  'Infraestructura Portuaria': 4, 'Embarcadero': 5, 'Rampa': 6, 'Defensa Costera': 7 };
function prioridad(r) {
  return [
    r.evidencia.alguna_candidata_con_cierres ? 0 : 1,          // 1º · toca una bahía CON CIERRES
    r.evidencia.quien_adjudica === 'capitania' ? 0 : r.evidencia.quien_adjudica === 'catalogo' ? 1 : 2, // 2º · más consecuencia
    PESO_TIPO[r.tipo] ?? 9,                                     // 3º · nodo más operativo
    r.evidencia.empate_entre.length,                            // 4º · menos candidatas, más fácil
    r.nodo_id,                                                  // 5º · desempate estable
  ];
}
const aAdjudicar = salida.filter(r => r.estado === 'a_adjudicar')
  .sort((x, y) => { const A = prioridad(x), B = prioridad(y);
    for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return A[i] - B[i]; return 0; });
aAdjudicar.forEach((r, i) => { r.prioridad = i + 1; });

// ── EL ARTEFACTO ─────────────────────────────────────────────────────────────
const resumen = {};
for (const e of VOCABULARIO) resumen[e] = salida.filter(r => r.estado === e).length;
const artefacto = {
  QUE_ES_ESTO: 'PROPUESTA de join puerto→bahía. NINGÚN CÓDIGO LA CONSUME. F2 decide si se consume y cómo.',
  NO_ES: 'No es un catálogo de bahías, no modifica nodos_maritimos, y no es una decisión tomada.',
  generado_en: new Date().toISOString(),
  generado_por: 'sesión FILTRO-PUERTO · F1 · instrumento en scratchpad (no versionado)',
  parametros: { radio_km: RADIO, margen_empate_km: MARGEN, razon_desempate: RAZON,
    por_que_radio_30: 'la atribución ajena se satura en 5/198 a partir de los 20 km y no vuelve a crecer; a 30 km la curva de acierto se dobla (167/198) y deja 113 nodos SIN bahía, que es el modo de falla seguro' },
  insumos: {
    nodos_maritimos: { origen: "psql mapa_navegacion · fuente <> 'SITPORT'", filas: crudo.length, nombres: cat.length, con_ancla: cat.filter(p => p.idBahia != null).length },
    BAHIA_COORDS: { origen: 'src/routes/sitport-routes.js (extraído verbatim)', bahias: COORDS.length, sha256_del_bloque: sha(BLOQUE_COORDS) },
    bahias_sitport: { origen: 'sondaje-sitport/bahias_sitport.json', entradas: bahiasCat.length, sha256: sha(fs.readFileSync(rutaBahias)) },
    sondaje: { ficheros: ficherosSondaje.length, filas: SONDAJE.length, bahias_con_filas: bahiasConFilas.size, bahias_con_cierres: bahiasConCierres.size },
  },
  vocabulario_estado: {
    confirmado_declarado: 'el nodo ya trae bahia_sitport_id. No se derivó nada.',
    derivado_limpio: 'una sola bahía dentro del radio, o la más cercana domina por margen.',
    desempatado: 'había empate y lo resolvió un criterio automático. `via` dice cuál.',
    a_adjudicar: 'había empate y NINGÚN criterio lo resuelve. bahia_id queda en null A PROPÓSITO: no se elige por defecto.',
    sin_bahia_en_catalogo: 'no hay ninguna bahía dentro del radio. NO es "desconocido": es que SITPORT no publica bahía ahí, así que no hay restricción que atribuir.',
  },
  ojo_null: 'bahia_id null NO significa lo mismo en `a_adjudicar` (no sabemos cuál) que en `sin_bahia_en_catalogo` (no hay ninguna). El `estado` los distingue. No los colapsen.',
  resumen,
  filas: salida,
};
const rutaArt = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');
fs.writeFileSync(rutaArt, JSON.stringify(artefacto, null, 2), 'utf8');

// ── LA HOJA DE TRABAJO ───────────────────────────────────────────────────────
const H = ['prioridad', 'nodo_id', 'nombre', 'tipo', 'comuna', 'provincia',
  'QUIEN_ADJUDICA', 'POR_QUE', 'candidata_con_cierres', 'candidatas', 'bahia_elegida_ESCRIBIR_AQUI'];
const lineas = [H.join('\t')];
for (const r of aAdjudicar) {
  lineas.push([r.prioridad, r.nodo_id, r.nombre, r.tipo, r.comuna, r.provincia,
    r.evidencia.quien_adjudica, r.evidencia.por_que,
    r.evidencia.alguna_candidata_con_cierres ? 'SÍ' : 'no',
    r.evidencia.empate_entre.map(c => `${c.bahia_id} ${c.nombre} @${c.km}km`).join('  ·  '), ''].join('\t'));
}
const rutaHoja = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv');
fs.writeFileSync(rutaHoja, lineas.join('\n'), 'utf8');

// ── SALIDA ───────────────────────────────────────────────────────────────────
console.log('F1 · ARTEFACTO GENERADO — nadie lo consume');
console.log(`  ${rutaArt}`);
console.log(`     ${salida.length} filas · sha256 ${sha(fs.readFileSync(rutaArt))}`);
console.log(`  ${rutaHoja}`);
console.log(`     ${aAdjudicar.length} filas + cabecera · sha256 ${sha(fs.readFileSync(rutaHoja))}`);
console.log('\n  reparto por estado:');
for (const e of VOCABULARIO) console.log(`     ${e.padEnd(24)} ${String(resumen[e]).padStart(4)}`);
console.log('\n  quién adjudica, de las a_adjudicar:');
const Q = new Map();
for (const r of aAdjudicar) Q.set(r.evidencia.quien_adjudica, (Q.get(r.evidencia.quien_adjudica) || 0) + 1);
for (const [k, n] of [...Q.entries()].sort((x, y) => y[1] - x[1])) console.log(`     ${k.padEnd(12)} ${String(n).padStart(4)}`);
console.log(`     de las ${aAdjudicar.length}, tocan bahía CON CIERRES: ${aAdjudicar.filter(r => r.evidencia.alguna_candidata_con_cierres).length}`);
console.log('\n  primeras 8 de la hoja priorizada:');
for (const r of aAdjudicar.slice(0, 8)) {
  console.log(`    ${String(r.prioridad).padStart(3)}. [${r.evidencia.quien_adjudica}] ${r.nombre} (${r.comuna}) — ${r.evidencia.empate_entre.map(c => c.bahia_id + ' ' + c.nombre).join(' vs ')}`);
}
console.log('\n' + (fallas.length ? `${fallas.length} FALLA(S)` : 'generación sin fallas — los controles corren aparte'));
if (fallas.length) process.exit(3);
