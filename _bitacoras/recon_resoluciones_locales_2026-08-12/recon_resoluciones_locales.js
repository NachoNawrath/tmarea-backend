#!/usr/bin/env node
/**
 * RECONOCIMIENTO DEL INDICE "RESOLUCIONES LOCALES AA.MM" DE DIRECTEMAR
 * ====================================================================
 *
 * Regenera, desde cero y sin pasos manuales, todo lo que afirma la bitacora
 * `_bitacoras/recon_resoluciones_locales_2026-08-12.txt`.
 *
 * QUE HACE
 *   1. Baja las N paginas del indice raiz a un cache local (idempotente: no
 *      re-baja lo que ya esta en disco).
 *   2. Las parsea a `catalogo_resoluciones_locales.json` — 1 fila por documento.
 *   3. Corre los tres cotejos y las cuatro familias de instrumento, e imprime
 *      la salida literal que las bitacoras `salida_*.txt` transcriben.
 *
 * USO
 *   node recon_resoluciones_locales.js            # usa el cache si existe
 *   node recon_resoluciones_locales.js --bajar    # fuerza la re-descarga
 *   node recon_resoluciones_locales.js --sha      # imprime sha256 por pagina
 *
 * NI EL CACHE HTML (4,2 MB) NI EL JSON QUE ESCRIBE (476 KB) SE VERSIONAN: los
 * dos son derivados de un frente que la bitacora cierra, y este script los
 * reconstruye en una corrida. Lo que fija el estado de la fuente al 2026-08-12
 * es `paginas_sha256.txt` —URL y sha256 de las 44 paginas—, siguiendo el
 * precedente de `geodata/costa/PROCEDENCIA.txt` y del propio
 * `sondeo_catalogo_2026-08-12/`. Correr esto hoy da el estado de HOY, no el de
 * la bitacora; para saber si cambio, comparar contra esos 44 hashes.
 *
 * REPRODUCIBILIDAD: el JSON que emite NO lleva fecha de generacion adentro, a
 * proposito. Un derivado con `generado: new Date()` cambia de sha256 en cada
 * corrida y "se regenero igual" deja de ser distinguible de "salio distinto"
 * (trampa ya pagada en E0.3). La fecha de captura vive en PROCEDENCIA.txt.
 *
 * SHELL: escrito para `node` a secas; corre igual en PowerShell y en Git Bash.
 * La descarga usa fetch() de Node 18+, no curl, para no depender de la shell.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const CACHE = path.join(DIR, '_cache_html');
const BASE = 'https://www.directemar.cl/directemar/site/tax/port/fid_adjunto/taxport_34___';
const SALIDA_JSON = path.join(DIR, 'catalogo_resoluciones_locales.json');
const REPO = path.resolve(DIR, '..', '..');

const FORZAR = process.argv.includes('--bajar');
const SOLO_SHA = process.argv.includes('--sha');

// ---------------------------------------------------------------------------
// 1. DESCARGA
// ---------------------------------------------------------------------------

/** Lee de la pagina 1 cuantas paginas declara la paginacion. No se hardcodea:
 *  el indice crece, y un numero fijo dejaria de recorrerlo entero en silencio. */
function ultimaPagina(html) {
  const ns = [...html.matchAll(/taxport_34___(\d+)\.html/g)].map((m) => +m[1]);
  if (!ns.length) throw new Error('la pagina 1 no declara paginacion: cambio el HTML del indice');
  return Math.max(...ns);
}

async function bajar() {
  if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE, { recursive: true });

  const p1 = path.join(CACHE, 'p1.html');
  if (FORZAR || !fs.existsSync(p1)) {
    const r = await fetch(BASE + '1.html');
    if (!r.ok) throw new Error(`pagina 1: HTTP ${r.status}`);
    fs.writeFileSync(p1, await r.text());
  }
  const total = ultimaPagina(fs.readFileSync(p1, 'utf8'));

  for (let i = 2; i <= total; i++) {
    const f = path.join(CACHE, `p${i}.html`);
    if (!FORZAR && fs.existsSync(f) && fs.statSync(f).size > 0) continue;
    const r = await fetch(`${BASE}${i}.html`);
    if (!r.ok) throw new Error(`pagina ${i}: HTTP ${r.status}`); // §4.1 falla ruidoso
    fs.writeFileSync(f, await r.text());
  }
  return total;
}

// ---------------------------------------------------------------------------
// 2. PARSEO
// ---------------------------------------------------------------------------

const ENTIDADES = {
  '&amp;': '&', '&quot;': '"', '&#34;': '"', '&#039;': "'", '&#39;': "'",
  '&ordm;': 'º', '&deg;': '°', '&nbsp;': ' ', '&ntilde;': 'ñ',
};
const desescapar = (s) => s.replace(/&#?\w+;/g, (c) => ENTIDADES[c] || c);

/**
 * Cada documento es un <li class="list-group-item"> con:
 *   - href al PDF bajo /site/docs/AAAAMMDD/...
 *   - dos <span class="epigrafe">: [0] fecha de publicacion, [1] fecha del doc
 *   - data-ga-opt-label : el titulo completo
 *   - data-ga-action    : "Resoluciones Locales AA.MM - <Gobernacion> - <Unidad>"
 *
 * La ruta taxonomica sale de data-ga-action y NO de la URL: los IDs de termino
 * de la URL (taxport_34_<gob>_<cap>) no son descubribles — ninguna pagina del
 * sitio enumera sus hijos (ver §1 de la bitacora).
 */
function parsear(total) {
  const items = [];
  for (let p = 1; p <= total; p++) {
    const html = fs.readFileSync(path.join(CACHE, `p${p}.html`), 'utf8');
    for (const b of html.split('<li class="list-group-item">').slice(1)) {
      const url = (b.match(/href="([^"]*\/site\/docs\/[^"]*)"/) || [])[1];
      if (!url) continue;
      const eps = [...b.matchAll(/<span class="epigrafe">([^<]*)<\/span>/g)].map((m) => m[1].trim());
      const ruta = desescapar((b.match(/data-ga-action="([^"]*)"/) || [])[1] || '');
      const partes = ruta.split(' - ');
      items.push({
        pagina: p,
        url,
        publicado: eps[0] || '',
        fecha_documento: eps[1] || '',
        titulo: desescapar((b.match(/data-ga-opt-label="([^"]*)"/) || [])[1] || ''),
        gobernacion: partes.length >= 2 ? partes[1] : null,
        unidad: partes.length >= 3 ? partes.slice(2).join(' - ') : null,
      });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// 3. COTEJOS
// ---------------------------------------------------------------------------

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/^(cp|gm|c\.p\.|g\.m\.)\s+/, '').replace(/\bpto\.?\b/g, 'puerto')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Alias sitio -> insumo. Van declarados aca y no resueltos por parecido de
 *  texto: "Cisnes"/"Puerto Cisnes" y "Villarica"/"Lago Villarrica" se parecen,
 *  pero "Cisnes"/"Puerto Aguirre" no, y una coincidencia difusa que acierta en
 *  el primer par inventa el segundo. Un mapeo sin destino es error (§4.2). */
const ALIAS = {
  aguirre: 'puerto_aguirre',
  chacabuco: 'puerto_chacabuco',
  cisnes: 'puerto_cisnes',
  eden: 'puerto_eden',
  hornopiren: 'rio_negro_hornopiren',
  lirquen_tome: 'lirquen',
  panguipulli: 'lago_panguipulli',
  soberania: 'puerto_soberania',
  tal_tal: 'taltal',
  villarica: 'lago_villarrica',
  williams: 'puerto_williams',
};

function cotejar(items) {
  const unidades = new Map();
  for (const it of items) {
    if (!it.unidad) continue;
    const k = it.gobernacion + '||' + it.unidad;
    if (!unidades.has(k)) {
      unidades.set(k, { gobernacion: it.gobernacion, unidad: it.unidad, tipo: /^GM/.test(it.unidad) ? 'GM' : 'CP', docs: [] });
    }
    unidades.get(k).docs.push(it);
  }
  const cps = [...unidades.values()].filter((u) => u.tipo === 'CP');
  const gms = [...unidades.values()].filter((u) => u.tipo === 'GM');

  const porClave = new Map();
  for (const u of cps) {
    const base = norm(u.unidad);
    porClave.set(ALIAS[base] || base, u);
  }
  return { unidades, cps, gms, porClave };
}

// ---------------------------------------------------------------------------
// 4. FAMILIAS DE INSTRUMENTO
// ---------------------------------------------------------------------------

const FAMILIAS = [
  ['A', 'Define / establece CONDICIONES DE PUERTO de la jurisdiccion',
    /(define|establece|fija)[^.]{0,40}condiciones de puerto|condiciones de tiempo y puerto|condiciones de puerto y limites de operacion|establece condiciones de tiempo variable/],
  ['B', 'Resolucion de OPERACION / zonificacion de una bahia nombrada',
    /condiciones de operacion (para|en|de) la bahia|resolucion de operacion de (la )?bahia|delimitacion y zonificacion/],
  ['C', 'PROCEDIMIENTO ante condiciones de tiempo variable / mal tiempo',
    /procedimiento[s]? ante condicion|acciones a seguir.*(tiempo variable|mal tiempo)|cierre de puerto ante|medidas de seguridad ante la presencia de mal tiempo|procedimiento para naves menores, ante condiciones/],
  ['D', 'PLAN (subsidiario) de mal tiempo',
    /plan (subsidiario )?(de |)mal tiempo|plan de contingencia para afrontar condicion de mal tiempo/],
];

const nt = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------------------------------------------------------------------------
// 5. TOPONIMOS DE LOS CASOS ABIERTOS
// ---------------------------------------------------------------------------

/** Salen de `_bitacoras/inventario_pendientes_geograficos_2026-08-12.txt`, por
 *  su identificador de caso. La lista es del inventario, no inventada aca. */
const TOPONIMOS = [
  ['A1',  'limite Sur XI Region (baker, puerto_eden, bahias 127/129/154)', ['chaltel', 'fitz roy', 'iceberg', 'tempano', 'messier', 'adalberto', 'canal fallos', 'del castillo', 'tortel', 'rio bravo', 'yungay']],
  ['A2',  'limite Chile-Peru (arica)', ['concordia', 'hito n 1', 'hito 1']],
  ['A3/A4', 'islas oceanicas (hanga_roa, juan_fernandez)', ['pascua', 'sala y gomez', 'san felix', 'san ambrosio', 'juan fernandez', 'cumberland', 'robinson crusoe']],
  ['A5/A6', 'extremo argentino (punta_delgada, tierra_del_fuego)', ['espiritu santo', 'dungeness']],
  ['A7',  'Canal Beagle / hito 26 (puerto_williams)', ['beagle', 'hito n 26', 'hito 26']],
  ['A8/A9', 'contorno Bahia de Concepcion (lirquen, talcahuano)', ['bahia de concepcion', 'andalien']],
  ['A10', 'Punta de Lobos (talcahuano)', ['punta de lobos']],
  ['A11', 'Punta Juan Latorre (valdivia, corral)', ['juan latorre']],
  ['B1',  'bahia 137 Bahia Chilota / Porvenir', ['porvenir', 'chilota', 'punta harry', 'cabo san vicente', 'anxious', 'anxius']],
  ['B2/B3', 'costura Cisnes-Aguirre, bahias 239 y 241', ['ferronave', 'devia', 'goni', 'ninualac', 'cayo blanco', 'punta san andres', 'puerto perez', 'islote rodriguez', 'traiguen']],
  ['C2',  'Estero Reloncavi (cochamo)', ['reloncavi']],
  ['C3',  'ancla de tierra_del_fuego', ['gente grande', 'bahia inutil', 'whiteside', 'canal gabriel', 'almirantazgo']],
  ['C5/D1', 'cuerpos y rios nombrados sin construir', ['lago chapo', 'maicolpue', 'laguna san rafael', 'san rafael', 'tolten', 'rio fuy', 'rio san pedro', 'rio bueno', 'rio colun', 'gualletue', 'galletue']],
  ['D8',  'id 108 de SITPORT (carahue)', ['carahue', 'imperial', 'moncul']],
  ['D9',  'bahia 257 Rio Cochrane', ['cochrane']],
  ['C9/E1', 'Bahia Paraiso y hermanas antarticas', ['bahia paraiso', 'covadonga', 'fildes', 'soberania']],
  ['D3',  'papudo sin testigo', ['papudo']],
];

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

(async () => {
  const total = await bajar();

  if (SOLO_SHA) {
    for (let i = 1; i <= total; i++) {
      const f = path.join(CACHE, `p${i}.html`);
      const b = fs.readFileSync(f);
      console.log(`p${String(i).padStart(2)}.html  ${crypto.createHash('sha256').update(b).digest('hex')}  ${String(b.length).padStart(7)} bytes  ${BASE}${i}.html`);
    }
    return;
  }

  const items = parsear(total);
  fs.writeFileSync(SALIDA_JSON, JSON.stringify(items, null, 1) + '\n');

  const L = console.log;
  L('================================================================================');
  L('RECONOCIMIENTO — RESOLUCIONES LOCALES AA.MM (DIRECTEMAR)');
  L('================================================================================');
  L(`paginas del indice        : ${total}`);
  L(`documentos catalogados    : ${items.length}`);
  const urls = new Set(items.map((i) => i.url));
  L(`URLs de PDF distintas     : ${urls.size}  (duplicadas: ${items.length - urls.size})`);
  const fechas = items.map((i) => i.publicado).filter(Boolean).map((d) => d.split('/').reverse().join('-')).sort();
  L(`rango de publicacion      : ${fechas[0]} .. ${fechas[fechas.length - 1]}`);

  const { unidades, cps, gms, porClave } = cotejar(items);
  const sinRuta = items.filter((i) => !i.unidad);
  L(`Gobernaciones             : ${new Set([...unidades.values()].map((u) => u.gobernacion)).size}`);
  L(`unidades CP con pagina    : ${cps.length}`);
  L(`unidades GM con pagina    : ${gms.length}`);
  L(`items sin unidad atribuida: ${sinRuta.length}  (data-ga-action vacio o cortado)`);

  // --- desfase de fechas ---------------------------------------------------
  let desfase = 0;
  for (const i of items) {
    const m = i.url.match(/\/docs\/(\d{4})(\d{2})(\d{2})\//);
    if (!m || !i.publicado) continue;
    const [d, mo, y] = i.publicado.split('/');
    if (Math.abs(new Date(+y, +mo - 1, +d) - new Date(+m[1], +m[2] - 1, +m[3])) > 40 * 864e5) desfase++;
  }
  L(`items con "publicado" desfasado >40 dias del directorio del PDF : ${desfase}`);

  // --- COTEJO 1 : contra el insumo ----------------------------------------
  L('\n================================================================================');
  L('COTEJO 1 — contra las 64 de data/decreto/jurisdicciones_v2.json');
  L('================================================================================');
  const insumo = require(path.join(REPO, 'data', 'decreto', 'jurisdicciones_v2.json'));
  const porId = new Map(insumo.jurisdicciones.map((x) => [x.id, x]));
  L(`jurisdicciones en el insumo: ${insumo.jurisdicciones.length}`);
  const sobran = [...porClave.entries()].filter(([k]) => !porId.has(k));
  const faltan = [...porId.entries()].filter(([k]) => !porClave.has(k));
  L(`\nCP del sitio SIN par en el insumo: ${sobran.length}`);
  sobran.forEach(([k, u]) => L(`   ${u.gobernacion} / ${u.unidad}  -> clave normalizada "${k}"`));
  L(`\njurisdicciones del insumo SIN pagina en el indice: ${faltan.length}`);
  faltan.forEach(([k, x]) => L(`   ${k.padEnd(20)} ${x.nombre.padEnd(24)} gob=${(x.gobernacion || '').padEnd(20)} ambito=${x.ambito}`));
  L('\nalias declarados (nombre del sitio -> id del insumo):');
  Object.entries(ALIAS).forEach(([a, b]) => { if (porClave.has(b)) L(`   ${a.padEnd(16)} -> ${b}`); });

  // --- COTEJO 2 : contra el catalogo del propio DIRECTEMAR -----------------
  L('\n================================================================================');
  L('COTEJO 2 — contra las 64 Capitanias del catalogo de DIRECTEMAR');
  L('  fuente: _bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv');
  L('================================================================================');
  const csv = fs.readFileSync(path.join(REPO, '_bitacoras', 'sondeo_catalogo_2026-08-12', 'capitanias_64_final.csv'), 'utf8').replace(/^﻿/, '');
  const filas = csv.trim().split(/\r?\n/).slice(1)
    .map((l) => (l.match(/"([^"]*)"/g) || []).map((s) => s.slice(1, -1)))
    .filter((c) => c.length > 2);
  L(`Capitanias en el catalogo: ${filas.length}`);
  const ALIAS_CAT = { taltal: 'tal_tal', rio_negro_hornopiren: 'hornopiren', lago_general_carrera: 'general_carrera' };
  const cat = new Map(filas.map((c) => [norm(c[2]), c]));
  const clave = (k) => (cat.has(k) ? k : (ALIAS_CAT[k] && cat.has(ALIAS_CAT[k]) ? ALIAS_CAT[k] : null));
  const sinIndice = [...cat.entries()].filter(([k]) => ![...porClave.keys()].some((p) => clave(p) === k));
  L(`\nCapitanias del catalogo SIN pagina en el indice de resoluciones: ${sinIndice.length}`);
  sinIndice.forEach(([k, c]) => L(`   ${c[2].padEnd(26)} gob=${c[3]}`));

  // --- FAMILIAS ------------------------------------------------------------
  L('\n================================================================================');
  L('LAS CUATRO FAMILIAS DE INSTRUMENTO');
  L('  Se separan por TITULO. Ningun PDF fue abierto: afirmar que dos titulos');
  L('  distintos hacen lo mismo seria afirmar contenido no leido (§3.2).');
  L('================================================================================');
  const unidadesPorFamilia = {};
  for (const [id, desc, re] of FAMILIAS) {
    const hits = items.filter((i) => re.test(nt(i.titulo)));
    const us = new Set(hits.map((i) => i.unidad).filter(Boolean));
    unidadesPorFamilia[id] = us;
    L(`\n--- FAMILIA ${id} — ${desc}`);
    L(`    ${hits.length} documentos en ${us.size} unidades\n`);
    hits.sort((a, b) => (a.unidad || '').localeCompare(b.unidad || '', 'es')).forEach((i) => {
      L(`  ${(i.gobernacion || '?')} / ${(i.unidad || '(SIN RUTA TAXONOMICA)')}`);
      L(`     ${i.fecha_documento || '(sin fecha)'}`);
      L(`     ${i.titulo}`);
      L(`     https://www.directemar.cl${i.url}`);
    });
  }
  const abc = new Set([...unidadesPorFamilia.A, ...unidadesPorFamilia.B, ...unidadesPorFamilia.C].filter(Boolean));
  const abcd = new Set([...abc, ...unidadesPorFamilia.D]);
  L(`\nunidades con instrumento de A, B o C : ${abc.size}`);
  L(`unidades con instrumento de A/B/C/D   : ${abcd.size}`);
  const ninguno = cps.map((u) => u.unidad).filter((u) => !abcd.has(u)).sort((a, b) => a.localeCompare(b, 'es'));
  L(`unidades CP SIN ninguno de los cuatro : ${ninguno.length}`);
  ninguno.forEach((u) => L(`   ${u}`));

  // --- TOPONIMOS -----------------------------------------------------------
  L('\n================================================================================');
  L('TOPONIMOS DE LOS CASOS ABIERTOS DEL INVENTARIO');
  L('  Lista tomada de _bitacoras/inventario_pendientes_geograficos_2026-08-12.txt');
  L('================================================================================');
  for (const [id, desc, ws] of TOPONIMOS) {
    const hits = items.filter((i) => ws.some((w) => nt(i.titulo).includes(w)));
    L(`\n##### ${id} — ${desc}  ->  ${hits.length} coincidencias`);
    hits.forEach((i) => {
      L(`   ${(i.gobernacion || '?')} / ${(i.unidad || '(SIN RUTA TAXONOMICA)')}   ${i.fecha_documento || '(sin fecha)'}`);
      L(`     ${i.titulo}`);
      L(`     https://www.directemar.cl${i.url}`);
    });
  }

  // --- DEROGATORIAS --------------------------------------------------------
  L('\n================================================================================');
  L('DEROGATORIAS PRESENTES EN EL INDICE');
  L('================================================================================');
  const der = items.filter((i) => /deroga/.test(nt(i.titulo)));
  L(`${der.length} documentos\n`);
  der.forEach((i) => {
    L(`  ${(i.gobernacion || '?')} / ${(i.unidad || '(SIN RUTA)')}   ${i.fecha_documento || '(sin fecha)'}`);
    L(`     ${i.titulo}`);
  });

  L('\n================================================================================');
  L(`FIN. Catalogo escrito en ${path.basename(SALIDA_JSON)}`);
  L('================================================================================');
})().catch((e) => { console.error('\nABORTA:', e.message); process.exit(1); });
