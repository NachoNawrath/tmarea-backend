#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e03join_reconocimiento.js — RECONOCIMIENTO MEDIDO del join bahia -> Capitania.
//
// E0.3 del PLAN_JURISDICCION.md. No cambia nada: cuenta, cruza y reporta.
//
// Prefijo `e03join` y no `e03` a proposito: `e03_*` ya esta ocupado por el
// frente del estado_drift contaminado (bitacoras e03_recon/e03_construccion/
// e03_cierre del 2026-08-11), que no es esta sub-etapa.
//
// Que cruza y por que:
//   - El mapa operativo (`src/data/bahia-capitania-map.json`) es el join que hoy
//     decide, al cambiar la unidad, si una restriccion aplica.
//   - El insumo del decreto (`data/decreto/jurisdicciones_v2.json`) es la
//     autoridad: el mapa operativo NO revoca al decreto (INV-3.3, fase5R).
//   - Los dos endpoints de SITPORT capturados en E0.1
//     (`consultaCapuertoRestriccion` + `Totalgeneral`, cruzados por
//     `consultaBahias.CdReparticion`) atribuyen Capitania a cada bahia del
//     catalogo. Son fuente OPERATIVA, no normativa: sirven para cotejar, no
//     para adjudicar.
//
// Insumos: por defecto las capturas versionadas de E0.1 (reproducible sin red,
// CLAUDE.md §3.4). Con --sitport-dir se apunta a otra captura.
//
// Uso:  node scripts/e03join_reconocimiento.js [--sitport-dir <ruta>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');

// ── Lectura de argumentos ───────────────────────────────────────────────────
// lastIndexOf y no indexOf: la trampa de e01_prueba_mordida_arranque.js fue un
// lector de argumentos que se comportaba al reves de como lo asumia quien lo
// llamaba. Aca la ultima ocurrencia gana, que es lo que hace un override.
function arg(nombre, porDefecto) {
  const i = process.argv.lastIndexOf(nombre);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

const DIR_SITPORT = arg('--sitport-dir', path.join(RAIZ, '_bitacoras'));
const CAP_E01  = path.join(RAIZ, '_bitacoras', 'e01_drift_catalogo_2026-08-11');
const CAP_E01D = path.join(RAIZ, '_bitacoras', 'e01d_d7_y_257_2026-08-11');

const RUTAS = {
  mapa:      path.join(RAIZ, 'src', 'data', 'bahia-capitania-map.json'),
  insumo:    path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json'),
  zonas:     path.join(RAIZ, 'data', 'decreto', 'zonas_aviso.json'),
  bahias:    path.join(CAP_E01,  'sitport_consultaBahias.json'),
  restric:   path.join(CAP_E01,  'sitport_consultaRestricciones.json'),
  capuerto:  path.join(CAP_E01D, 'sitport_consultaCapuertoRestriccion.json'),
  totalgen:  path.join(CAP_E01D, 'sitport_Totalgeneral.json'),
};
if (DIR_SITPORT !== path.join(RAIZ, '_bitacoras')) {
  RUTAS.bahias   = path.join(DIR_SITPORT, 'sitport_consultaBahias.json');
  RUTAS.restric  = path.join(DIR_SITPORT, 'sitport_consultaRestricciones.json');
  RUTAS.capuerto = path.join(DIR_SITPORT, 'sitport_consultaCapuertoRestriccion.json');
  RUTAS.totalgen = path.join(DIR_SITPORT, 'sitport_Totalgeneral.json');
}

// ── Utilidades ──────────────────────────────────────────────────────────────
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const sha  = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
const leer = p => JSON.parse(fs.readFileSync(p, 'utf8'));

// Un recordset de mssql o un arreglo pelado, sin caso por defecto silencioso.
function filas(obj, nombre) {
  if (Array.isArray(obj)) return obj;
  if (Array.isArray(obj.recordset)) return obj.recordset;
  if (Array.isArray(obj.recordsets) && Array.isArray(obj.recordsets[0])) return obj.recordsets[0];
  throw new Error(`${nombre}: no reconozco la forma del payload (claves: ${Object.keys(obj).join(', ')})`);
}

// "CAPITANÍA DE PUERTO PUERTO MONTT" -> "PUERTO MONTT".
// Se aplica solo al nombre de reparticion de SITPORT, que trae el prefijo
// institucional. Si el prefijo no esta, el nombre se devuelve tal cual y el
// cotejo lo dira: no se inventa una limpieza que la fuente no pide.
const PREFIJO_CAPUERTO = /^CAPITANIA DE PUERTO\s+/;
const sinPrefijo = s => norm(s).replace(PREFIJO_CAPUERTO, '').trim();

const H = t => { console.log(''); console.log('─'.repeat(78)); console.log(t); console.log('─'.repeat(78)); };

// ── Carga ───────────────────────────────────────────────────────────────────
const mapa     = leer(RUTAS.mapa);
const insumo   = leer(RUTAS.insumo);
const zonas    = leer(RUTAS.zonas);
const bahias   = filas(leer(RUTAS.bahias),   'consultaBahias');
const restric  = filas(leer(RUTAS.restric),  'consultaRestricciones');
const capuerto = filas(leer(RUTAS.capuerto), 'consultaCapuertoRestriccion');
const totalgen = filas(leer(RUTAS.totalgen), 'Totalgeneral');

console.log('='.repeat(78));
console.log('E0.3 — RECONOCIMIENTO DEL JOIN BAHIA -> CAPITANIA');
console.log(`fecha de ejecucion: ${new Date().toISOString()}`);
console.log('='.repeat(78));
console.log('');
console.log('INSUMOS (sha256 truncado a 16, para que el reporte sea rastreable)');
for (const [k, p] of Object.entries(RUTAS)) {
  console.log(`  ${k.padEnd(9)} ${sha(p)}  ${path.relative(RAIZ, p)}`);
}
console.log('');
console.log('  Las capturas de SITPORT son las versionadas de E0.1 (2026-08-11).');
console.log('  Fuente OPERATIVA: cotejan, no adjudican (INV-3.3, el mapa no revoca al decreto).');

// ─────────────────────────────────────────────────────────────────────────────
H('1. EL MAPA OPERATIVO — QUE HAY');

const idsMapa = Object.keys(mapa).map(Number).sort((a, b) => a - b);
const sinCap  = idsMapa.filter(id => mapa[String(id)].capitania == null);
const sinTel  = idsMapa.filter(id => !mapa[String(id)].telefono);
const nombresMapa = new Map(); // norm(capitania) -> {literal, bahias[]}
for (const id of idsMapa) {
  const c = mapa[String(id)].capitania;
  if (c == null) continue;
  const k = norm(c);
  if (!nombresMapa.has(k)) nombresMapa.set(k, { literal: c, bahias: [] });
  nombresMapa.get(k).bahias.push(id);
}
console.log(`entradas en el mapa            : ${idsMapa.length}`);
console.log(`bahias sin Capitania atribuida : ${sinCap.length}`);
console.log(`bahias sin telefono            : ${sinTel.length}`);
console.log(`nombres de Capitania distintos : ${nombresMapa.size}`);

// ─────────────────────────────────────────────────────────────────────────────
H('2. NOMBRES DEL MAPA CONTRA NOMBRES DEL DECRETO');

const jurPorNombre = new Map(insumo.jurisdicciones.map(j => [norm(j.nombre), j]));
const jurPorId     = new Map(insumo.jurisdicciones.map(j => [j.id, j]));

const calzan = [], noCalzan = [];
for (const [k, v] of nombresMapa) {
  (jurPorNombre.has(k) ? calzan : noCalzan).push({ k, ...v });
}
console.log(`nombres del mapa que calzan exacto con el insumo : ${calzan.length}`);
console.log(`nombres del mapa que NO calzan                   : ${noCalzan.length}`);
console.log('');
for (const n of noCalzan.sort((a, b) => b.bahias.length - a.bahias.length)) {
  // Candidatos: contencion de tokens en cualquier direccion. Es una PISTA para
  // el cotejo, no una resolucion: quien adjudica es el decreto.
  const cands = insumo.jurisdicciones.filter(j => {
    const a = norm(j.nombre), b = n.k;
    return a !== b && (a.includes(b) || b.includes(a));
  });
  console.log(`  mapa '${n.literal}'  (${n.bahias.length} bahias: ${n.bahias.join(', ')})`);
  console.log(`      candidatos en el insumo: ${cands.length ? cands.map(c => `${c.id} "${c.nombre}"`).join(' | ') : 'NINGUNO'}`);
}

// ─────────────────────────────────────────────────────────────────────────────
H('3. JURISDICCIONES DEL DECRETO SIN NINGUNA BAHIA ATRIBUIDA');

const bahiasDeJur = new Map(insumo.jurisdicciones.map(j => [j.id, []]));
for (const id of idsMapa) {
  const c = mapa[String(id)].capitania;
  if (c == null) continue;
  const j = jurPorNombre.get(norm(c));
  if (j) bahiasDeJur.get(j.id).push(id);
}
const sinBahia = insumo.jurisdicciones.filter(j => bahiasDeJur.get(j.id).length === 0);
console.log(`jurisdicciones del insumo                  : ${insumo.jurisdicciones.length}`);
console.log(`sin ninguna bahia atribuida (nombre exacto): ${sinBahia.length}`);
console.log('');
console.log('  Desglose por ambito y por si participa del matching:');
const porAmbito = {};
for (const j of sinBahia) {
  const k = `${j.ambito}${j.participa_matching === false ? ' (sin geometria)' : ''}`;
  (porAmbito[k] = porAmbito[k] || []).push(j.id);
}
for (const [k, v] of Object.entries(porAmbito).sort()) console.log(`   ${String(v.length).padStart(3)}  ${k}: ${v.join(', ')}`);

// ─────────────────────────────────────────────────────────────────────────────
H('4. LA ATRIBUCION OPERATIVA DE SITPORT (insumo nuevo de E0.1)');

// consultaBahias: IDBahia -> CdReparticion.  capuerto: Cdreparticion -> nombre.
const nombreDeRep = new Map(capuerto.map(r => [Number(r.Cdreparticion), r.NMBahia]));
const repDeBahia  = new Map(bahias.map(b => [Number(b.IDBahia), Number(b.CdReparticion)]));
const nomBahia    = new Map(bahias.map(b => [Number(b.IDBahia), b.NMBahia]));

console.log(`reparticiones en consultaCapuertoRestriccion : ${capuerto.length}`);
console.log(`bahias en consultaBahias                     : ${bahias.length}`);
console.log(`elementos en Totalgeneral                    : ${totalgen.length}`);

// Coherencia interna de la fuente: Totalgeneral tambien liga bahia -> reparticion,
// por un espacio de numeracion distinto (reparticion.codigo == cdReparticion).
let tgOk = 0, tgChoque = [];
for (const t of totalgen) {
  const idB = t.medicionMeteo && Number(t.medicionMeteo.idBahia);
  const rep = t.reparticion && Number(t.reparticion.id);
  if (!Number.isFinite(idB) || !Number.isFinite(rep)) continue;
  if (repDeBahia.get(idB) === rep) tgOk++;
  else tgChoque.push({ idB, tg: rep, cb: repDeBahia.get(idB) });
}
console.log(`  Totalgeneral coincide con consultaBahias en la reparticion: ${tgOk} de ${totalgen.length}`);
if (tgChoque.length) {
  console.log(`  CHOQUES (${tgChoque.length}):`);
  for (const c of tgChoque) console.log(`    bahia ${c.idB}: Totalgeneral=${c.tg} consultaBahias=${c.cb}`);
}

const repSinNombre = [...new Set([...repDeBahia.values()])].filter(r => !nombreDeRep.has(r));
console.log(`  reparticiones citadas por consultaBahias sin fila en capuerto: ${repSinNombre.length}` +
  (repSinNombre.length ? ` -> ${repSinNombre.join(', ')}` : ''));

// bahia -> Capitania segun SITPORT
const capSitport = new Map();
for (const [idB, rep] of repDeBahia) {
  const n = nombreDeRep.get(rep);
  if (n) capSitport.set(idB, sinPrefijo(n));
}
console.log(`  bahias con Capitania atribuida por SITPORT: ${capSitport.size} de ${bahias.length}`);

// Cuantos de esos nombres de reparticion calzan con el decreto
const nomsRep = [...new Set([...capSitport.values()])];
const repCalza = nomsRep.filter(n => jurPorNombre.has(n));
const repNoCalza = nomsRep.filter(n => !jurPorNombre.has(n));
console.log(`  nombres de Capitania de SITPORT distintos : ${nomsRep.length}`);
console.log(`    calzan exacto con el insumo del decreto : ${repCalza.length}`);
console.log(`    NO calzan                               : ${repNoCalza.length}`);
for (const n of repNoCalza.sort()) {
  const bs = [...capSitport].filter(([, v]) => v === n).map(([k]) => k);
  const cands = insumo.jurisdicciones.filter(j => {
    const a = norm(j.nombre);
    return a !== n && (a.includes(n) || n.includes(a));
  });
  console.log(`      '${n}' (${bs.length} bahias) -> candidatos: ${cands.length ? cands.map(c => `${c.id} "${c.nombre}"`).join(' | ') : 'NINGUNO'}`);
}

// ─────────────────────────────────────────────────────────────────────────────
H('5. MAPA CONTRA SITPORT — DONDE COINCIDEN Y DONDE NO');

const acuerdo = [], desacuerdo = [], mapaNullSitportSi = [], sitportSinDato = [];
for (const id of idsMapa) {
  const mio = mapa[String(id)].capitania;
  const suyo = capSitport.get(id);
  if (suyo === undefined) { sitportSinDato.push(id); continue; }
  if (mio == null) { mapaNullSitportSi.push({ id, suyo }); continue; }
  if (norm(mio) === suyo) acuerdo.push(id);
  else desacuerdo.push({ id, mio, suyo });
}
console.log(`coinciden (nombre normalizado)                 : ${acuerdo.length}`);
console.log(`el mapa dice null y SITPORT si atribuye        : ${mapaNullSitportSi.length}`);
console.log(`discrepan                                      : ${desacuerdo.length}`);
console.log(`SITPORT no atribuye (o la bahia no esta en el) : ${sitportSinDato.length}` +
  (sitportSinDato.length ? ` -> ${sitportSinDato.join(', ')}` : ''));
console.log('');
console.log('  Las 24 sin atribuir, con lo que dice SITPORT y si ese nombre existe en el decreto:');
for (const { id, suyo } of mapaNullSitportSi) {
  const j = jurPorNombre.get(suyo);
  console.log(`   ${String(id).padStart(3)}  ${String(nomBahia.get(id) || '?').padEnd(34)} SITPORT: ${suyo.padEnd(28)} decreto: ${j ? j.id : '— NO CALZA —'}`);
}
if (sinCap.filter(id => !capSitport.has(id)).length) {
  console.log('');
  console.log('  Sin atribuir y SITPORT tampoco las cubre:');
  for (const id of sinCap.filter(x => !capSitport.has(x))) {
    console.log(`   ${String(id).padStart(3)}  ${nomBahia.get(id) || '(no esta en consultaBahias)'}`);
  }
}
console.log('');
console.log('  Discrepancias mapa vs SITPORT:');
for (const d of desacuerdo) {
  console.log(`   ${String(d.id).padStart(3)}  ${String(nomBahia.get(d.id) || '?').padEnd(34)} mapa: ${String(d.mio).padEnd(24)} SITPORT: ${d.suyo}`);
}

// ─────────────────────────────────────────────────────────────────────────────
H('6. LAS DISCREPANCIAS DE CLASE C YA DECLARADAS (zonas_aviso.json)');

console.log('Son las que R1 pieza 1 dejo sin contacto porque el mapa las atribuye a una');
console.log('Capitania vecina. Aca se mira que dice SITPORT de cada una: si corrobora al');
console.log('mapa o al decreto. Corroborar NO adjudica — el decreto manda (INV-3.3).');
console.log('');
for (const z of zonas.zonas) {
  const disc = z.contacto.bahias_en_discrepancia;
  if (!disc || !disc.length) continue;
  const j = jurPorId.get(z.jurisdiccion_id);
  for (const id of disc) {
    const e = mapa[String(id)];
    const s = capSitport.get(id);
    const lado = s == null ? 'SITPORT no atribuye'
      : (j && s === norm(j.nombre)) ? '>> SITPORT corrobora al DECRETO'
      : (e && e.capitania && s === norm(e.capitania)) ? '   SITPORT corrobora al MAPA'
      : '   SITPORT dice una TERCERA cosa';
    console.log(`  ${z.jurisdiccion_id.padEnd(18)} bahia ${String(id).padStart(3)} ${String(nomBahia.get(id) || '?').padEnd(30)}`);
    console.log(`      decreto: ${(j ? j.nombre : '?').padEnd(24)} mapa: ${String(e && e.capitania).padEnd(24)} SITPORT: ${s || '—'}`);
    console.log(`      ${lado}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
H('7. QUE PASA CON LAS RESTRICCIONES DE HOY SI EL JOIN NO RESUELVE');

// Al cambiar de unidad, una restriccion se atribuye por la Capitania de su
// bahia. Una bahia sin Capitania resuelta = restriccion que no se puede ubicar.
const bahiasConRestric = [...new Set(restric.map(r => Number(r.bahia)).filter(Number.isFinite))];
const noResuelven = bahiasConRestric.filter(id => {
  const e = mapa[String(id)];
  return !e || e.capitania == null || !jurPorNombre.has(norm(e.capitania));
});
console.log(`restricciones vigentes en la captura   : ${restric.length}`);
console.log(`bahias distintas que las publican      : ${bahiasConRestric.length}`);
console.log(`de esas, que HOY no resuelven a una jurisdiccion del decreto: ${noResuelven.length}`);
for (const id of noResuelven) {
  const e = mapa[String(id)];
  const n = restric.filter(r => Number(r.bahia) === id).length;
  console.log(`   ${String(id).padStart(3)}  ${String(nomBahia.get(id) || '?').padEnd(32)} mapa: ${String(e ? e.capitania : 'NO ESTA EN EL MAPA').padEnd(22)} restricciones: ${n}`);
}

// ─────────────────────────────────────────────────────────────────────────────
H('8. LAS JURISDICCIONES SIN BAHIA, VISTAS POR SITPORT');

console.log('§3 cuenta las que el MAPA deja sin bahia. La pregunta que separa un problema');
console.log('nuestro de una jurisdiccion donde SITPORT no publica es otra: ¿SITPORT le');
console.log('atribuye bahias a esa jurisdiccion? Se compara con el nombre de reparticion,');
console.log('admitiendo la falta del prefijo "Puerto "/"Lago " que SITPORT recorta.');
console.log('');

// Correspondencia laxa SOLO para esta medicion de reconocimiento: sirve para
// contar, no para resolver. La regla definitiva se declara como dato en la
// construccion, no se deduce aca.
const bahiasSitportDeJur = new Map(insumo.jurisdicciones.map(j => [j.id, []]));
for (const [idB, nom] of capSitport) {
  for (const j of insumo.jurisdicciones) {
    const a = norm(j.nombre);
    if (a === nom || a.replace(/^(PUERTO|LAGO)\s+/, '') === nom.replace(/^(PUERTO|LAGO)\s+/, '')) {
      bahiasSitportDeJur.get(j.id).push(idB);
      break;
    }
  }
}
const colapsadas = [], sinPublicar = [];
for (const j of sinBahia) {
  (bahiasSitportDeJur.get(j.id).length ? colapsadas : sinPublicar).push(j);
}
console.log(`de las ${sinBahia.length} sin bahia en el mapa, SITPORT SI les atribuye bahias : ${colapsadas.length}`);
console.log(`de las ${sinBahia.length} sin bahia en el mapa, SITPORT tampoco                : ${sinPublicar.length}`);
console.log('');
console.log('  El mapa las colapsa en la vecina (SITPORT si las distingue):');
for (const j of colapsadas) {
  const bs = bahiasSitportDeJur.get(j.id);
  const quienDiceElMapa = [...new Set(bs.map(id => mapa[String(id)] ? mapa[String(id)].capitania : null))];
  console.log(`   ${j.id.padEnd(20)} ${String(bs.length).padStart(2)} bahias -> el mapa las pone en: ${quienDiceElMapa.map(x => x === null ? '(null)' : `'${x}'`).join(', ')}`);
}
console.log('');
console.log('  Ni el mapa ni SITPORT les atribuyen bahia:');
for (const j of sinPublicar) console.log(`   ${j.id.padEnd(20)} ambito=${j.ambito}  participa_matching=${j.participa_matching}`);

// ─────────────────────────────────────────────────────────────────────────────
H('9. EL INSTRUMENTO DE COTEJO — LA BANDA DE LATITUD QUE DECLARA EL DECRETO');

// Las coordenadas se leen de la FUENTE (BAHIA_COORDS en sitport-routes.js), no
// de la copia del seed ni de la tabla: medir el derivado en vez de la fuente ya
// costo una correccion en esta fase.
const FUENTE_COORDS = path.join(RAIZ, 'src', 'routes', 'sitport-routes.js');
const coords = new Map();
{
  const txt = fs.readFileSync(FUENTE_COORDS, 'utf8');
  const bloque = txt.slice(txt.indexOf('const BAHIA_COORDS = {'));
  const re = /^\s*(\d+):\s*\{\s*lat:\s*(-?\d+(?:\.\d+)?),\s*lng:\s*(-?\d+(?:\.\d+)?)/gm;
  let m;
  while ((m = re.exec(bloque)) !== null) coords.set(Number(m[1]), { lat: Number(m[2]), lng: Number(m[3]) });
  if (coords.size < 160) throw new Error(`BAHIA_COORDS: lei ${coords.size} coordenadas de ${path.relative(RAIZ, FUENTE_COORDS)}; el parser no esta leyendo la fuente.`);
}
console.log(`coordenadas leidas de ${path.relative(RAIZ, FUENTE_COORDS)}: ${coords.size}`);

const conBanda = insumo.jurisdicciones.filter(j =>
  j.limite_norte && Number.isFinite(j.limite_norte.dec) &&
  j.limite_sur   && Number.isFinite(j.limite_sur.dec));
console.log(`jurisdicciones con las DOS latitudes declaradas en el decreto: ${conBanda.length} de ${insumo.jurisdicciones.length}`);

// Lo que romperia el fundamento: si las bandas se pisan, contener no decide.
let pares = 0, paresQuePisan = 0;
for (let i = 0; i < conBanda.length; i++) for (let k = i + 1; k < conBanda.length; k++) {
  pares++;
  const a = conBanda[i], b = conBanda[k];
  const solapa = Math.min(a.limite_norte.dec, b.limite_norte.dec) > Math.max(a.limite_sur.dec, b.limite_sur.dec);
  if (solapa) paresQuePisan++;
}
console.log(`pares de bandas que se pisan en latitud: ${paresQuePisan} de ${pares}`);
console.log('  -> la banda ACOTA, no adjudica: donde varias se pisan, contener no decide.');
console.log('');

const dentro = (j, c) => c && j.limite_norte.dec >= c.lat && c.lat >= j.limite_sur.dec;
const bandaDe = new Map(conBanda.map(j => [j.id, j]));

// El lado del mapa se resuelve con la MISMA regla laxa que el lado de SITPORT,
// para que "no medible" cuente bandas que faltan y no nombres que no calzan.
const jurLaxa = (nombre) => {
  const n = norm(nombre);
  return insumo.jurisdicciones.find(j => {
    const a = norm(j.nombre);
    return a === n || a.replace(/^(PUERTO|LAGO)\s+/, '') === n.replace(/^(PUERTO|LAGO)\s+/, '');
  }) || null;
};

let decideMapaFuera = 0, ambosDentro = 0, ningunoDentro = 0, sinBanda = 0, sinNombre = 0, sinCoord = 0;
const filasCotejo = [];
for (const d of desacuerdo) {
  const c = coords.get(d.id);
  const jMapa = jurLaxa(d.mio);
  const jSit  = jurLaxa(d.suyo);
  if (!jMapa || !jSit) { sinNombre++; filasCotejo.push({ d, veredicto: `no medible: el nombre ${!jMapa ? 'del mapa' : 'de SITPORT'} no calza con ninguna jurisdiccion` }); continue; }
  if (!c) { sinCoord++; filasCotejo.push({ d, jMapa: jMapa.id, jSit: jSit.id, veredicto: 'no medible: la bahia no tiene coordenada en BAHIA_COORDS' }); continue; }
  if (!bandaDe.has(jMapa.id) || !bandaDe.has(jSit.id)) {
    sinBanda++;
    const cual = !bandaDe.has(jMapa.id) ? jMapa.id : jSit.id;
    filasCotejo.push({ d, jMapa: jMapa.id, jSit: jSit.id, lat: c.lat, veredicto: `no medible: '${cual}' no declara las dos latitudes` });
    continue;
  }
  {
  const enMapa = dentro(bandaDe.get(jMapa.id), c), enSit = dentro(bandaDe.get(jSit.id), c);
  let v;
  if (!enMapa && enSit) { v = 'el decreto EXCLUYE al mapa e incluye a SITPORT'; decideMapaFuera++; }
  else if (enMapa && enSit) { v = 'las dos bandas lo contienen (no decide)'; ambosDentro++; }
  else if (!enMapa && !enSit) { v = 'ninguna banda lo contiene'; ningunoDentro++; }
  else { v = '>> AL REVES: solo la banda del mapa lo contiene, SITPORT queda fuera'; ambosDentro++; }
  filasCotejo.push({ d, veredicto: v, jMapa: jMapa.id, jSit: jSit.id, lat: c.lat });
  }
}
console.log(`discrepancias mapa/SITPORT cotejadas contra la banda del decreto: ${desacuerdo.length}`);
console.log(`  el decreto EXCLUYE al mapa e incluye a SITPORT      : ${decideMapaFuera}`);
console.log(`  las dos bandas lo contienen, o solo la del mapa     : ${ambosDentro}`);
console.log(`  ninguna banda lo contiene                           : ${ningunoDentro}`);
console.log(`  no medible — una de las dos no declara sus paralelos: ${sinBanda}`);
console.log(`  no medible — el nombre no calza con ninguna jurisd. : ${sinNombre}`);
console.log(`  no medible — la bahia no tiene coordenada           : ${sinCoord}`);
console.log('');
for (const f of filasCotejo) {
  console.log(`   ${String(f.d.id).padStart(3)}  lat ${f.lat != null ? f.lat.toFixed(4).padStart(9) : '        —'}  mapa=${String(f.jMapa || f.d.mio).padEnd(18)} sitport=${String(f.jSit || f.d.suyo).padEnd(20)} ${f.veredicto}`);
}

// ─────────────────────────────────────────────────────────────────────────────
H('10. LO LACUSTRE — IDENTIDAD LITERAL CONTRA LOS CUERPOS QUE EL DECRETO NOMBRA');

console.log('`cotejo_lacustre_adjudicado.json` ya trae, adjudicado, QUE CUERPO DE AGUA NOMBRA');
console.log('cada jurisdiccion lacustre, con el fragmento literal del decreto. Si el nombre de');
console.log('la bahia de SITPORT ES uno de esos cuerpos, la atribucion es identidad de nombre y');
console.log('no interpretacion.');
console.log('');
console.log('OJO — el campo `resolucion` del cotejo NO califica el nombre: dice si ese cuerpo');
console.log('encontro GEOMETRIA en el shapefile. "rechazado" significa que se rechazo el');
console.log('poligono candidato, no que el decreto no lo nombre. Para el join importa el');
console.log('nombre; la geometria es asunto de E3.');
console.log('');
const cotejo = leer(path.join(RAIZ, 'data', 'decreto', 'cotejo_lacustre_adjudicado.json'));
const cuerpoAJur = new Map(); // norm(nombre_decreto) -> [{jur, resolucion, fragmento}]
for (const j of cotejo.jurisdicciones) {
  for (const cu of j.cuerpos) {
    const k = norm(cu.nombre_decreto);
    if (!cuerpoAJur.has(k)) cuerpoAJur.set(k, []);
    cuerpoAJur.get(k).push({ jur: j.id, resolucion: cu.resolucion, fragmento: cu.fragmento_decreto });
  }
}
const totalCuerpos = [...cuerpoAJur.values()].reduce((a, v) => a + v.length, 0);
console.log(`cuerpos nombrados por el decreto en el cotejo: ${totalCuerpos} (${cuerpoAJur.size} nombres distintos) en ${cotejo.jurisdicciones.length} jurisdicciones`);
console.log('');

// "LAGO X" contra un cuerpo llamado "X" o al reves; tambien RIO/LAGUNA/EMBALSE.
const GENERICOS = /^(LAGO|LAGUNA|EMBALSE|RIO)\s+/;
const buscarCuerpo = (nombreBahia) => {
  const n = norm(nombreBahia || '');
  if (!n) return null;
  const desnudo = n.replace(GENERICOS, '');
  for (const [k, v] of cuerpoAJur) if (k === n || k.replace(GENERICOS, '') === desnudo) return v;
  return null;
};

// Se recorre TODO el catalogo, no solo las sin atribuir: los lagos que el mapa
// pone en la Capitania equivocada estan en la lista de discrepancias, no en la
// de nulas, y son el mismo problema.
let idLit = 0, idLitNulas = 0, multi = 0;
console.log('  bahia                                  mapa                  SITPORT             el decreto la nombra en');
for (const id of idsMapa) {
  const hit = buscarCuerpo(nomBahia.get(id));
  if (!hit) continue;
  idLit++;
  const e = mapa[String(id)];
  if (e.capitania == null) idLitNulas++;
  if (hit.length > 1) multi++;
  const destinos = hit.map(h => `${h.jur}${h.resolucion === 'exacta' ? '' : ` [geom:${h.resolucion}]`}`).join(' + ');
  const yaOk = e.capitania != null && hit.some(h => norm(jurPorId.get(h.jur).nombre) === norm(e.capitania));
  console.log(`   ${String(id).padStart(3)} ${String(nomBahia.get(id)).padEnd(34)} ${String(e.capitania == null ? '(null)' : e.capitania).padEnd(21)} ${String(capSitport.get(id) || '—').padEnd(19)} ${destinos}${yaOk ? '   (el mapa ya coincide)' : ''}`);
}
console.log('');
console.log(`  bahias del catalogo cuyo nombre ES un cuerpo que el decreto nombra: ${idLit}`);
console.log(`    de ellas, hoy sin Capitania atribuida en el mapa                : ${idLitNulas}`);
console.log(`    de ellas, nombradas por MAS DE UNA jurisdiccion (traslape)      : ${multi}`);
console.log('');
console.log('  Sin atribuir y cuyo nombre NO es un cuerpo nombrado por el decreto:');
let adjudicables = 0;
for (const id of sinCap) {
  if (buscarCuerpo(nomBahia.get(id))) continue;
  adjudicables++;
  console.log(`   ${String(id).padStart(3)}  ${String(nomBahia.get(id) || '(no esta en consultaBahias)').padEnd(34)} SITPORT: ${capSitport.get(id) || '—'}`);
}
console.log(`  -> ${adjudicables} de las ${sinCap.length}. Estas no las resuelve la identidad de nombre.`);

// ─────────────────────────────────────────────────────────────────────────────
H('11. LA DEUDA DE E0.2 — LA REGLA DE COINCIDENCIA DUPLICADA');

for (const rel of ['src/services/zonas-aviso.js', 'src/services/ambitos-publicados.js']) {
  const txt = fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n');
  const def = txt.map((l, i) => ({ l, i: i + 1 })).filter(x => /const mismoNombre\s*=/.test(x.l));
  const usos = txt.map((l, i) => ({ l, i: i + 1 })).filter(x => /mismoNombre\(/.test(x.l) && !/const mismoNombre/.test(x.l));
  console.log(`  ${rel}`);
  for (const d of def) console.log(`     definicion  :${d.i}  ${d.l.trim()}`);
  console.log(`     usos        : ${usos.map(u => ':' + u.i).join(' ')}`);
}
console.log('');
console.log('  Las dos definiciones NO son iguales: zonas-aviso.js normaliza los argumentos');
console.log('  crudos y ambitos-publicados.js los pasa por `|| \'\'` antes. Mismo resultado hoy');
console.log('  porque normalizarTexto ya trata null como vacio, pero son dos textos que hay');
console.log('  que mantener sincronizados a mano — que es lo que E0.3 tiene que saldar.');

// ─────────────────────────────────────────────────────────────────────────────
H('12. EL REPARTO — LAS 164 BAHIAS, CADA UNA EN UN SOLO CAJON');

console.log('Particion completa y con prioridad: primero se pregunta si la atribucion esta');
console.log('EN DISPUTA, y recien despues si el nombre calza. Al reves, arreglar la variante');
console.log('de nombre "Cisnes" -> puerto_cisnes contaria como resueltas 16 bahias que SITPORT');
console.log('atribuye a Melinka y a Aguirre: el nombre calzaria y la atribucion seguiria mal.');
console.log('');

// ── El criterio que establece una variante de nombre, y que se puede medir ──
// Un nombre del mapa es VARIANTE de una jurisdiccion cuando el conjunto de
// bahias que el mapa le cuelga es EXACTAMENTE el que SITPORT le atribuye a esa
// jurisdiccion. Igualdad de conjuntos, no parecido de strings: dos fuentes
// independientes agrupando las mismas bahias bajo dos etiquetas distintas es
// evidencia de que la etiqueta cambia y el conjunto no. Si los conjuntos
// difieren, el nombre no es lo unico que esta mal y no se declara variante.
const mismoConjunto = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const variantes = new Map();
console.log('  Nombres del mapa que NO calzan, contra el criterio de igualdad de conjunto:');
for (const n of noCalzan) {
  const candidato = insumo.jurisdicciones.find(j => mismoConjunto(n.bahias, bahiasSitportDeJur.get(j.id) || []));
  if (candidato) {
    variantes.set(n.k, candidato.id);
    console.log(`     '${n.literal}' == ${candidato.id}: los dos conjuntos son los mismos ${n.bahias.length} ids. VARIANTE establecida.`);
  } else {
    const laxo = jurLaxa(n.literal);
    const cuantas = laxo ? (bahiasSitportDeJur.get(laxo.id) || []).length : 0;
    console.log(`     '${n.literal}': el mapa le cuelga ${n.bahias.length} bahias y ${laxo ? `SITPORT le da ${cuantas} a '${laxo.id}'` : 'no hay jurisdiccion parecida'}. NO es solo el nombre.`);
  }
}
console.log('');

const veredictoDe = new Map(filasCotejo.map(f => [f.d.id, f.veredicto]));
const cajones = new Map();
const poner = (cajon, id, nota) => {
  if (!cajones.has(cajon)) cajones.set(cajon, []);
  cajones.get(cajon).push({ id, nota });
};

for (const id of idsMapa) {
  const e = mapa[String(id)];
  const esVariante = e.capitania != null && variantes.has(norm(e.capitania));
  const jMapa = e.capitania == null ? null
    : (esVariante ? jurPorId.get(variantes.get(norm(e.capitania))) : jurLaxa(e.capitania));
  const cuerpo = buscarCuerpo(nomBahia.get(id));
  // La variante se resuelve ANTES de preguntar por la disputa: si el unico
  // desacuerdo con SITPORT era la etiqueta, resuelta la etiqueta no hay disputa.
  const jSitId = capSitport.has(id) ? (jurLaxa(capSitport.get(id)) || {}).id : undefined;
  const enDisputa = desacuerdo.some(d => d.id === id) && !(jMapa && jSitId && jMapa.id === jSitId);
  const v = veredictoDe.get(id) || '';

  if (e.capitania == null) {
    if (cuerpo) poner('D · sin atribuir, la resuelve la identidad de cuerpo de agua del decreto', id, cuerpo.map(c => c.jur).join(' + '));
    else poner('E · sin atribuir y sin identidad de cuerpo -> ADJUDICACION', id, `SITPORT: ${capSitport.get(id) || '—'}`);
    continue;
  }
  if (!jMapa) { poner('G · el nombre del mapa no existe en el decreto -> ADJUDICACION', id, `mapa: '${e.capitania}' / SITPORT: ${capSitport.get(id) || '—'}`); continue; }
  if (!enDisputa) {
    if (jurPorNombre.has(norm(e.capitania))) poner('A1 · sin disputa y el nombre calza exacto', id, '');
    else if (esVariante) poner('A2 · sin disputa; variante ESTABLECIDA por igualdad de conjunto', id, `'${e.capitania}' -> ${jMapa.id}`);
    else poner('A3 · sin disputa; el nombre difiere solo en el prefijo "Puerto "/"Lago "', id, `'${e.capitania}' -> ${jMapa.id}`);
    continue;
  }
  if (v.startsWith('el decreto EXCLUYE')) { poner('B · en disputa, y la banda del decreto la decide contra el mapa', id, `-> ${filasCotejo.find(f => f.d.id === id).jSit}`); continue; }
  if (cuerpo) { poner('C · en disputa, y la identidad de cuerpo de agua la decide', id, cuerpo.map(c => c.jur).join(' + ')); continue; }
  poner('F · en disputa y el decreto no la decide con lo medido -> ADJUDICACION', id, `mapa=${jMapa.id} sitport=${capSitport.get(id)} · ${v}`);
}

const orden = [...cajones.keys()].sort();
let total = 0;
for (const k of orden) {
  const v = cajones.get(k);
  total += v.length;
  console.log(`  ${String(v.length).padStart(3)}  ${k}`);
}
console.log(`  ${String(total).padStart(3)}  TOTAL (contra ${idsMapa.length} entradas del mapa)`);
if (total !== idsMapa.length) throw new Error(`la particion perdio ${idsMapa.length - total} bahias: no es una particion.`);
console.log('');
for (const k of orden) {
  if (/^A1/.test(k)) continue; // el cajon sano, no hace falta listarlo
  console.log(`  ${k}`);
  for (const { id, nota } of cajones.get(k)) {
    console.log(`     ${String(id).padStart(3)} ${String(nomBahia.get(id) || '?').padEnd(34)} ${nota}`);
  }
  console.log('');
}

// Cuanto de esto tiene restriccion publicada hoy: el impacto, no el conteo.
console.log('  Con restriccion publicada en la captura de hoy, por cajon:');
for (const k of orden) {
  const conR = cajones.get(k).filter(x => bahiasConRestric.includes(x.id));
  if (conR.length) console.log(`   ${String(conR.length).padStart(3)}  ${k}  -> bahias ${conR.map(x => x.id).join(', ')}`);
}

console.log('');
console.log('='.repeat(78));
console.log('FIN DEL RECONOCIMIENTO — no se modifico ningun archivo.');
console.log('='.repeat(78));
