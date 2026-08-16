'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// frente-contacto-derivar-reparticiones.js
//
// Construye `data/contacto/reparticiones_publicadas.json`: el indice
// `CdReparticion -> { nombre publicado, telefono, direccion }` que la Pieza A
// del frente de CONTACTO consume.
//
// POR QUE EXISTE (R4 = opcion B, decidida por el owner el 2026-08-15):
//   · la ATRIBUCION `IDBahia -> CdReparticion` la da SITPORT (D-R1);
//   · la FORMA DEL NOMBRE la da el titulo que DIRECTEMAR publica, NO la columna
//     `Capitania` de `capitanias_64_final.csv` — medido: esa columna es la
//     cadena cruda de SITPORT sin su prefijo, 64 de 64
//     (`_bitacoras/pieza_a_nulas_2026-08-15/`, bloque N12);
//   · el TELEFONO y la DIRECCION los da el CSV, que para eso si es un derivado
//     de DIRECTEMAR — cotejado por el NUMERO contra la ficha publicada en las
//     cinco filas cotejables (bloque N11).
//
// La reparticion se identifica contra la ficha publicada por NOMBRE cuando la
// cadena coincide, y por TELEFONO cuando no. Nunca por subcadena ni por
// parecido: donde ninguna de las dos identifica, la fila sale con
// `nombre_publicado: null` y su motivo escrito. No se adjudica (CLAUDE.md §0.4).
//
// INSUMO QUE NO ESTA EN HEAD: los 16 `gm_*.html` de DIRECTEMAR. La poda del
// sondeo del 2026-08-12 los saco del arbol de trabajo. Se leen del arbol
// `a474ae4` con `git show`, que es reproducible desde el propio repositorio
// (CLAUDE.md §3.4). Si el arbol no los tiene, ESTE SCRIPT ABORTA: no se degrada
// a "no los encontre" (§4.1).
//
// Corrida:  node scripts/frente-contacto-derivar-reparticiones.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ESCRIBE: data/contacto/reparticiones_publicadas.json
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const ARBOL_GM = 'a474ae4';
const P_CSV = '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv';
const SALIDA = 'data/contacto/reparticiones_publicadas.json';

function abortar(motivo) {
  console.error('');
  console.error('================================================================================');
  console.error(`ABORTA — ${motivo}`);
  console.error('No se escribio ningun archivo.');
  console.error('================================================================================');
  process.exit(3);
}

// ── normalizacion de telefono, VIGENTE en este frente ────────────────────────
// Fijada por `85bc68a`: U+00A0 -> U+0020 y colapso de espacios repetidos, de
// modo que lo escrito son solo digitos, '+' y espacios simples. Ratificada por
// el owner el 2026-08-15 al dejar la bahia 127 fuera de la Pieza A.
function normalizarTelefono(t) {
  if (t == null) return null;
  return String(t).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}
// Un valor es ATOMICO si, ya normalizado, no tiene mas que '+', digitos y
// espacios simples. `"Móvil: +569 5617 3241"` no pasa, y no se resuelve
// normalizando la cadena: falta el numero.
function esAtomico(t) {
  return typeof t === 'string' && t.length > 0 && /^\+?[\d]+(?: [\d]+)*$/.test(t);
}

// ── CSV ──────────────────────────────────────────────────────────────────────
function leerCSV(f) {
  const txt = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
  const filas = [];
  for (const linea of txt.split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const c = []; let cur = ''; let dentro = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (ch === '"') { if (dentro && linea[i + 1] === '"') { cur += '"'; i++; } else dentro = !dentro; }
      else if (ch === ',' && !dentro) { c.push(cur); cur = ''; } else cur += ch;
    }
    c.push(cur); filas.push(c);
  }
  const cab = filas.shift();
  return filas.map(f2 => Object.fromEntries(cab.map((h, i) => [h, f2[i]])));
}

L('================================================================================');
L('DERIVADO `CdReparticion -> nombre publicado / telefono / direccion`');
L('================================================================================');

const csv = leerCSV(abs(P_CSV));
L('');
L(`  ${P_CSV}`);
L(`      sha256 (archivo en disco) : ${sha(abs(P_CSV))}`);
L(`      filas de datos            : ${csv.length}`);
if (csv.length !== 64) abortar(`el CSV deberia traer 64 filas de datos y trae ${csv.length}`);

// ── fichas publicadas ────────────────────────────────────────────────────────
let archivosGm;
try {
  archivosGm = execFileSync('git', ['ls-tree', '-r', '--name-only', ARBOL_GM], { cwd: RAIZ, encoding: 'utf8' })
    .split(/\r?\n/).filter(l => /gm_.*\.html$/.test(l));
} catch (e) {
  abortar(`no se pudo listar el arbol ${ARBOL_GM}: ${e.message}`);
}
L('');
L(`  gm_*.html en el arbol ${ARBOL_GM} : ${archivosGm.length}`);
if (archivosGm.length === 0) abortar(`el arbol ${ARBOL_GM} no tiene gm_*.html`);

const publicadas = new Map();   // nombre normalizado -> ficha
const shaGm = [];
for (const f of archivosGm) {
  let html;
  try { html = execFileSync('git', ['show', `${ARBOL_GM}:${f}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { abortar(`no se pudo leer ${f} de ${ARBOL_GM}: ${e.message}`); }
  shaGm.push([path.basename(f), crypto.createHash('sha256').update(Buffer.from(html, 'utf8')).digest('hex'), html.length]);
  const re = /id="vtxt_cuerpo_T\d+">([^<]*)<\/div>/g;
  const marcas = []; let m;
  while ((m = re.exec(html)) !== null) marcas.push({ titulo: m[1], fin: re.lastIndex });
  for (let i = 0; i < marcas.length; i++) {
    // Colapso de espacios ANTES de parsear: la fuente trae
    // "Capitanía  de Puerto de Melinka" con DOBLE ESPACIO, y titulos con espacio
    // final. Sin colapsar, Melinka se declara ausente — es la trampa que
    // CLAUDE.md §2 ya lista como caso real de este repositorio.
    const titulo = marcas[i].titulo.replace(/\s+/g, ' ').trim();
    const mCap = /^Capitan[íi]a de Puerto(?: de| del)?\s+(.+)$/i.exec(titulo);
    if (!mCap) continue;
    const cuerpo = html.slice(marcas[i].fin, i + 1 < marcas.length ? marcas[i + 1].fin : html.length);
    const mTel = /<li>\s*(?:Tel[ée]fono|Fono)\s*:\s*([^<]*)<\/li>/i.exec(cuerpo);
    publicadas.set(normalizarTexto(mCap[1]), {
      nombre: mCap[1].trim(),
      titulo,
      archivo: path.basename(f),
      telefono: mTel ? normalizarTelefono(mTel[1].replace(/&nbsp;/g, ' ')) : null
    });
  }
}
L(`  titulos "Capitania de Puerto de X" distintos : ${publicadas.size}`);
if (publicadas.size === 0)
  abortar('el parseo de los gm_*.html devolvio CERO titulos — un lado vacio da el mismo resultado que un lado identico si se cuentan diferencias');

const soloDigitos = t => (t || '').replace(/[^\d+]/g, '');
const porTelPublicado = new Map();
for (const [, v] of publicadas) {
  if (!v.telefono) continue;
  const k = soloDigitos(v.telefono);
  if (!porTelPublicado.has(k)) porTelPublicado.set(k, []);
  porTelPublicado.get(k).push(v);
}
L(`  fichas con telefono legible                  : ${[...publicadas.values()].filter(v => v.telefono).length}`);
if (porTelPublicado.size === 0) abortar('ninguna ficha publicada trae telefono legible: el lado de identificacion por numero quedaria vacio');

// ── cotejo ───────────────────────────────────────────────────────────────────
const reparticiones = {};
let porNombre = 0, porTelefono = 0, sinIdentificar = 0, comparadas = 0;
for (const f of csv) {
  const cdRep = Number(f.CdRep);
  if (!Number.isInteger(cdRep)) abortar(`fila del CSV con CdRep no numerico: ${JSON.stringify(f.CdRep)}`);
  comparadas++;
  const tel = normalizarTelefono(f.Telefono) || null;
  const dir = (f.Direccion || '').trim() || null;
  const base = {
    cd_reparticion: cdRep,
    nombre_sitport: f.Capitania,
    telefono: tel,
    telefono_atomico: tel ? esAtomico(tel) : false,
    direccion: dir
  };
  const pn = publicadas.get(normalizarTexto(f.Capitania));
  if (pn) {
    reparticiones[String(cdRep)] = { ...base, nombre_publicado: pn.nombre, titulo_publicado: pn.titulo, identificado_por: 'nombre', ficha: pn.archivo };
    porNombre++;
    continue;
  }
  const cand = tel ? (porTelPublicado.get(soloDigitos(tel)) || []) : [];
  if (cand.length === 1) {
    reparticiones[String(cdRep)] = { ...base, nombre_publicado: cand[0].nombre, titulo_publicado: cand[0].titulo, identificado_por: 'telefono', ficha: cand[0].archivo };
    porTelefono++;
    continue;
  }
  reparticiones[String(cdRep)] = {
    ...base,
    nombre_publicado: null,
    titulo_publicado: null,
    identificado_por: null,
    ficha: null,
    motivo_sin_identificar: cand.length > 1
      ? `su telefono lo publican ${cand.length} fichas distintas: ${cand.map(c => c.titulo).join(' · ')}`
      : (tel
        ? 'ninguna ficha publicada trae ese nombre ni ese telefono'
        : 'la fila del CSV no trae telefono, y su nombre no figura en ningun titulo publicado')
  };
  sinIdentificar++;
}

L('');
L(`  COMPARACIONES EFECTIVAS  : ${comparadas}`);
L(`  identificadas por NOMBRE : ${porNombre}`);
L(`  identificadas por NUMERO : ${porTelefono}`);
L(`  SIN identificar          : ${sinIdentificar}`);
if (comparadas === 0) abortar('cero comparaciones efectivas');
if (porNombre + porTelefono === 0) abortar('ninguna reparticion quedo identificada: el derivado no serviria para nada');
for (const [k, v] of Object.entries(reparticiones))
  if (!v.nombre_publicado) L(`      CdRep ${String(k).padStart(3)} "${v.nombre_sitport}" -> ${v.motivo_sin_identificar}`);

const noAtomicos = Object.values(reparticiones).filter(v => v.telefono && !v.telefono_atomico);
L('');
L(`  reparticiones con telefono NO atomico : ${noAtomicos.length}`);
for (const v of noAtomicos) L(`      CdRep ${String(v.cd_reparticion).padStart(3)} "${v.nombre_sitport}" tel=${JSON.stringify(v.telefono)}`);

// ── escritura ────────────────────────────────────────────────────────────────
const salida = {
  que_es: 'Indice CdReparticion -> nombre publicado por DIRECTEMAR, telefono y direccion. Insumo del frente de CONTACTO.',
  que_NO_es: 'NO es fuente de jurisdiccion. La jurisdiccion la fija el D.S. 991 via data/decreto/ (INV-3.3). Este archivo no dice que territorio le corresponde a nadie.',
  generado_por: 'scripts/frente-contacto-derivar-reparticiones.js',
  regenerable: 'node scripts/frente-contacto-derivar-reparticiones.js',
  decision: 'R4 = opcion B, owner 2026-08-15. El nombre sale del titulo publicado por DIRECTEMAR; la columna `Capitania` del CSV NO se usa como rotulo porque es la cadena cruda de SITPORT (medido 64 de 64).',
  fuentes: {
    nombre_publicado: `titulos "Capitania de Puerto de X" de los 16 gm_*.html de DIRECTEMAR, capturados el 2026-08-12, leidos del arbol git ${ARBOL_GM} (no estan en HEAD)`,
    telefono_y_direccion: `${P_CSV} (sha256 del archivo en disco: ${sha(abs(P_CSV))})`,
    identificacion: 'por nombre cuando la cadena coincide normalizada (INV-0.3); por telefono cuando no. Nunca por subcadena.'
  },
  normalizacion_telefono: "U+00A0 -> U+0020 y colapso de espacios repetidos (85bc68a). `telefono_atomico` es true solo si el valor tiene unicamente '+', digitos y espacios simples.",
  conteos: { filas: comparadas, identificadas_por_nombre: porNombre, identificadas_por_telefono: porTelefono, sin_identificar: sinIdentificar },
  reparticiones
};

const destino = abs(SALIDA);
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify(salida, null, 2) + '\n', { encoding: 'utf8' });
L('');
L(`  ESCRITO: ${SALIDA}`);
L(`      sha256 (archivo en disco) : ${sha(destino)}`);
L('================================================================================');
