'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_pieza_a.js — SOLO MIDE. No escribe ningun archivo.
//
// Mide lo que la PIEZA A necesita saber antes de escribirse, y los tres hechos
// que P1 del addendum del 2026-08-15 dejo anotados y sin desarrollar.
//
//   N1  la via D-R1/D-R3 (`IDBahia -> CdReparticion -> fila del CSV`) aplicada a
//       las 164: cobertura, y que cambiaria si se aplicara entera
//   N2  las 17 nulas, fila por fila, con lo que la via les escribiria
//   N3  `CdRep 189` — la entrada 146 y su relacion con la 258
//   N4  `CdRep 430` — `RIO NEGRO HORNOPIREN` contra las 8 de "Hornopiren"
//   N5  el rotulo de las 64 filas del CSV contra los `gm_*.html` de DIRECTEMAR:
//       cuantas de las 64 estan publicadas como CAPITANIA y cuantas aparecen
//       dentro de un bloque de ALCALDIAS DE MAR (INV-3.3)
//   N6  la FORMA de la cadena que la via imprimiria (caja, tildes, abreviatura)
//   N7  atomicidad de los telefonos que la via escribiria (INV-10.1)
//   N8  que campo lee cada camino a pantalla, leido del codigo
//
// NO adjudica. En ningun punto decide que dos rotulos nombran la misma
// reparticion ni elige un valor: informa lo que cada fuente dice.
//
// Corrida:  node _bitacoras/pieza_a_nulas_2026-08-15/01_medir_pieza_a.js
// Shell declarada (CLAUDE.md §7.3): el agente la corrio con `node` desde Git
// Bash. La linea es identica en PowerShell desde la raiz del repositorio. Para
// bajar la salida a archivo en PowerShell SIN corromper tildes y ñ:
//     node _bitacoras\pieza_a_nulas_2026-08-15\01_medir_pieza_a.js | Tee-Object -FilePath salida.txt
// `>` de PowerShell reencodea: esta prohibido para medir (CLAUDE.md §7.2).
//
// Los `gm_*.html` de DIRECTEMAR NO estan en HEAD — la poda del sondeo del
// 2026-08-12 los saco. Se leen del arbol `a474ae4` con `git show`, que es
// reproducible desde el propio repositorio (§3.4). Si el arbol no los tiene, el
// bloque N5 ABORTA; no se degrada a "no encontre".
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const ARBOL_GM = 'a474ae4';

function abortar(motivo) {
  L('');
  L('================================================================================');
  L(`ABORTA — ${motivo}`);
  L('================================================================================');
  process.exit(3);
}

// ─── insumos ─────────────────────────────────────────────────────────────────
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_SB = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_CSV = '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv';
const P_JOIN = 'data/decreto/join_bahia_jurisdiccion.json';

// El mapa se lee del ANCLA `0bc80d2`, no del disco. Esta medicion describe el
// estado ANTERIOR a la Pieza A; leyendola del disco dejaria de correr en cuanto
// la pieza se aplicara, y una medicion que solo se puede reproducir antes de
// tocar nada no es reproducible (CLAUDE.md §3.4).
const ANCLA_MAPA = '0bc80d2';
let mapaTxt;
try { mapaTxt = execFileSync('git', ['show', `${ANCLA_MAPA}:${P_MAPA}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); }
catch (e) { console.error(`ABORTA — no se pudo leer ${ANCLA_MAPA}:${P_MAPA}: ${e.message}`); process.exit(3); }
const mapa = JSON.parse(mapaTxt);
const sbRaw = JSON.parse(fs.readFileSync(abs(P_SB), 'utf8'));
// las capturas no tienen la misma forma: una es el array pelado y otra el sobre
// de mssql `{recordsets:[[...]]}`. Trampa ya pagada el 2026-08-15.
const sbArr = Array.isArray(sbRaw) ? sbRaw : sbRaw.recordsets[0];
const SB = new Map(sbArr.map(r => [Number(r.IDBahia), { cdRep: Number(r.CdReparticion), nombre: r.NMBahia }]));

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
const csv = leerCSV(abs(P_CSV));
const csvPorCdRep = new Map(csv.map(r => [Number(r.CdRep), r]));
const join = JSON.parse(fs.readFileSync(abs(P_JOIN), 'utf8'));
const joinPorId = new Map(join.entradas.map(e => [Number(e.bahia_id), e]));

L('================================================================================');
L('PIEZA A — LAS 17 NULAS. MEDICION PREVIA A ESCRIBIR NADA. 2026-08-15');
L('Sesion PIEZA-A-NULAS. Solo lectura. Ningun archivo fue escrito por este script.');
L('================================================================================');
L('');
L('N0 — INSUMOS, con sha256 del ARCHIVO EN DISCO (no del blob de git: con');
L('     core.autocrlf=true no son el mismo byte)');
L('--------------------------------------------------------------------------------');
L(`    ${P_MAPA.padEnd(62)} (leido de ${ANCLA_MAPA}, no del disco)`);
L(`        sha256 del blob en ${ANCLA_MAPA} : ${crypto.createHash('sha256').update(Buffer.from(mapaTxt, 'utf8')).digest('hex')}`);
L(`        sha256 del mismo contenido en CRLF, que es como vive en disco:`);
L(`        ${crypto.createHash('sha256').update(Buffer.from(mapaTxt.replace(/\r?\n/g, '\r\n'), 'utf8')).digest('hex')}`);
for (const p of [P_SB, P_CSV, P_JOIN]) L(`    ${p.padEnd(62)} ${sha(abs(p))}`);
L(`    gm_*.html de DIRECTEMAR: NO estan en HEAD. Se leen del arbol ${ARBOL_GM}.`);
L('');
L(`    entradas del mapa                : ${Object.keys(mapa).length}`);
L(`    registros de consultaBahias      : ${sbArr.length}`);
L(`    filas de datos del CSV           : ${csv.length}`);
L(`    entradas del join                : ${join.entradas.length}`);

if (csv.length !== 64) abortar(`el CSV deberia traer 64 filas de datos y trae ${csv.length}`);

// ─── N1 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N1 — LA VIA D-R1/D-R3 APLICADA A LAS 164: COBERTURA Y EFECTO');
L('================================================================================');
L('  La via es `IDBahia -> CdReparticion` (SITPORT, D-R1) `-> fila del CSV`');
L('  (D-R3). La cadena de nombre de SITPORT no se compara contra nada.');
L('');

const via = [];
let sinSitport = 0, sinFilaCsv = 0;
const cdRepSinFila = new Map();
for (const id of Object.keys(mapa).map(Number).sort((a, b) => a - b)) {
  const s = SB.get(id);
  if (!s) { sinSitport++; via.push({ id, estado: 'SIN_SITPORT' }); continue; }
  const f = csvPorCdRep.get(s.cdRep);
  if (!f) {
    sinFilaCsv++;
    cdRepSinFila.set(s.cdRep, (cdRepSinFila.get(s.cdRep) || 0) + 1);
    via.push({ id, estado: 'SIN_FILA_CSV', cdRep: s.cdRep, nombreSitport: s.nombre });
    continue;
  }
  via.push({
    id, estado: 'RESUELVE', cdRep: s.cdRep, nombreSitport: s.nombre,
    csvNombre: f.Capitania, csvTelefono: f.Telefono, csvGobernacion: f.Gobernacion,
    csvDireccion: f.Direccion,
    hoyNombre: mapa[String(id)].capitania, hoyTelefono: mapa[String(id)].telefono,
    hoyGobernacion: mapa[String(id)].gobernacion
  });
}
const resuelven = via.filter(v => v.estado === 'RESUELVE');
L(`    COMPARACIONES EFECTIVAS (bahias con CdRep y con fila en el CSV) : ${resuelven.length}`);
L(`    sin registro en consultaBahias                                  : ${sinSitport}`);
L(`    con CdRep pero SIN fila en el CSV                               : ${sinFilaCsv}`);
for (const [c, n] of cdRepSinFila) L(`        CdRep ${c} -> ${n} bahia(s)`);
if (resuelven.length === 0) abortar('cero comparaciones efectivas en N1');

// efecto sobre el campo `capitania`
const nulasHoy = resuelven.filter(v => v.hoyNombre === null || v.hoyNombre === '');
const igualLiteral = resuelven.filter(v => v.hoyNombre === v.csvNombre);
const igualNormal = resuelven.filter(v => v.hoyNombre != null && v.hoyNombre !== '' &&
  normalizarTexto(v.hoyNombre) === normalizarTexto(v.csvNombre));
const difiereNormal = resuelven.filter(v => v.hoyNombre != null && v.hoyNombre !== '' &&
  normalizarTexto(v.hoyNombre) !== normalizarTexto(v.csvNombre));
L('');
L('    CAMPO `capitania` — que le pasaria a cada entrada si la via se aplicara');
L('    entera y VERBATIM (la cadena del CSV tal cual esta escrita):');
L(`        hoy null, la via le escribe un nombre                : ${nulasHoy.length}`);
L(`        hoy igual al CSV CARACTER POR CARACTER (no cambia)   : ${igualLiteral.length}`);
L(`        hoy igual sólo tras normalizar — CAMBIA LA CADENA    : ${igualNormal.length - igualLiteral.length}`);
L(`        hoy distinto tambien normalizado — CAMBIA EL NOMBRE  : ${difiereNormal.length}`);
L(`        --- suma                                             : ${nulasHoy.length + igualLiteral.length + (igualNormal.length - igualLiteral.length) + difiereNormal.length}`);
L('');
L('    La fila "igual sólo tras normalizar" es la que no se ve venir: son entradas');
L('    cuyo rotulo HOY nombra la misma reparticion y cuya CADENA cambiaria igual.');

// efecto sobre el campo `telefono`
const telIgual = resuelven.filter(v => v.hoyTelefono === v.csvTelefono);
const telDif = resuelven.filter(v => v.hoyTelefono !== v.csvTelefono);
L('');
L('    CAMPO `telefono` — mismo ejercicio:');
L(`        hoy identico al del CSV                              : ${telIgual.length}`);
L(`        CAMBIARIA                                            : ${telDif.length}`);

// ─── N2 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N2 — LAS 17 NULAS, FILA POR FILA');
L('================================================================================');
const nulas = Object.keys(mapa).map(Number).filter(id => mapa[String(id)].capitania === null).sort((a, b) => a - b);
L(`    entradas con \`capitania\` null : ${nulas.length}`);
L(`    ids: ${nulas.join(', ')}`);
if (nulas.length !== 17) abortar(`se esperaban 17 nulas y hay ${nulas.length} — la premisa cambio`);
L('');
L('    id   CdRep  nombre SITPORT de la bahia        CSV.Capitania          CSV.Telefono          telefono HOY          gobernacion HOY');
let nulasResueltas = 0;
for (const id of nulas) {
  const s = SB.get(id); const f = s ? csvPorCdRep.get(s.cdRep) : null;
  const m = mapa[String(id)];
  if (f) nulasResueltas++;
  L(`    ${String(id).padStart(3)}  ${String(s ? s.cdRep : '—').padStart(5)}  ${String(s ? s.nombre : '(sin registro)').padEnd(33)} ${String(f ? f.Capitania : '(SIN FILA EN EL CSV)').padEnd(22)} ${String(f ? f.Telefono : '—').padEnd(21)} ${String(m.telefono).padEnd(21)} ${m.gobernacion}`);
}
L('');
L(`    de las 17, la via les escribe nombre a : ${nulasResueltas}`);
L(`    quedan sin nombre por esta via         : ${17 - nulasResueltas}`);
L('');
L('    Y el cotejo que decide si la pieza toca UN campo o DOS: el telefono que');
L('    esas 17 tienen HOY contra el que el CSV le da a su CdRep.');
let telNulasIgual = 0, telNulasDif = 0;
const telNulasDetalle = [];
for (const id of nulas) {
  const s = SB.get(id); const f = s ? csvPorCdRep.get(s.cdRep) : null;
  if (!f) continue;
  if (mapa[String(id)].telefono === f.Telefono) telNulasIgual++;
  else { telNulasDif++; telNulasDetalle.push({ id, hoy: mapa[String(id)].telefono, csv: f.Telefono, nom: f.Capitania }); }
}
L(`        COMPARACIONES EFECTIVAS : ${telNulasIgual + telNulasDif}`);
L(`        telefono ya coincide    : ${telNulasIgual}`);
L(`        telefono DIFIERE        : ${telNulasDif}`);
if (telNulasIgual + telNulasDif === 0) abortar('cero comparaciones efectivas en el cotejo de telefono de las 17');
for (const d of telNulasDetalle)
  L(`        ${String(d.id).padStart(3)}  hoy="${d.hoy}"  CSV(${d.nom})="${d.csv}"`);

// ─── N3 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N3 — CdRep 189: LA ENTRADA 146, Y LA 258');
L('================================================================================');
const enCsv189 = csvPorCdRep.has(189);
L(`    ¿el CSV lista el CdRep 189?  ${enCsv189}`);
const bahias189 = [...SB.entries()].filter(([, s]) => s.cdRep === 189).map(([id]) => id).sort((a, b) => a - b);
L(`    bahias que SITPORT cuelga del CdRep 189 : ${bahias189.length} -> ${bahias189.join(', ') || '(ninguna)'}`);
for (const id of bahias189) {
  const m = mapa[String(id)]; const e = joinPorId.get(id);
  L(`        bahia ${id}  SITPORT="${SB.get(id).nombre}"`);
  L(`            mapa HOY      : capitania="${m ? m.capitania : '(sin entrada)'}"  telefono="${m ? m.telefono : '—'}"  gobernacion="${m ? m.gobernacion : '—'}"`);
  L(`            join          : jurisdiccion_id="${e ? e.jurisdiccion_id : '(sin entrada)'}"  respaldo="${e ? e.respaldo : '—'}"`);
  L(`            ¿esta entre las 17 nulas? ${nulas.includes(id)}`);
}
const b258 = SB.get(258);
L('');
L(`    bahia 258 en consultaBahias : ${b258 ? `SI — "${b258.nombre}", CdRep ${b258.cdRep}` : 'NO'}`);
L(`    bahia 258 en el mapa        : ${Object.prototype.hasOwnProperty.call(mapa, '258')}`);
if (b258) L(`    CSV para el CdRep ${b258.cdRep} : ${csvPorCdRep.has(b258.cdRep) ? `"${csvPorCdRep.get(b258.cdRep).Capitania}"` : '(sin fila)'}`);
L('');
L('    Lo que esto decide para la PIEZA A: si la 146 esta o no entre las entradas');
L('    que la pieza toca, y si la via deja o no alguna entrada sin nombre.');

// ─── N4 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N4 — CdRep 430: "RIO NEGRO HORNOPIREN" CONTRA LAS 8 DE "Hornopiren"');
L('================================================================================');
const fila430 = csvPorCdRep.get(430);
L(`    CSV, CdRep 430 : Capitania="${fila430 ? fila430.Capitania : '(sin fila)'}"  Telefono="${fila430 ? fila430.Telefono : '—'}"  Gobernacion="${fila430 ? fila430.Gobernacion : '—'}"`);
const bahias430 = [...SB.entries()].filter(([, s]) => s.cdRep === 430).map(([id]) => id).sort((a, b) => a - b);
L(`    bahias que SITPORT cuelga del CdRep 430 : ${bahias430.length} -> ${bahias430.join(', ')}`);
const rotHorno = Object.keys(mapa).map(Number).filter(id => mapa[String(id)].capitania && normalizarTexto(mapa[String(id)].capitania) === 'HORNOPIREN').sort((a, b) => a - b);
L(`    entradas del mapa con rotulo "Hornopiren" : ${rotHorno.length} -> ${rotHorno.join(', ')}`);
const soloSitport430 = bahias430.filter(id => !rotHorno.includes(id));
const soloRotulo = rotHorno.filter(id => !bahias430.includes(id));
L(`    en CdRep 430 y NO rotuladas "Hornopiren" : ${soloSitport430.length} -> ${soloSitport430.join(', ') || '(ninguna)'}`);
L(`    rotuladas "Hornopiren" y NO en CdRep 430 : ${soloRotulo.length} -> ${soloRotulo.join(', ') || '(ninguna)'}`);
L('');
L('    id   nombre SITPORT                       rotulo HOY      telefono HOY          telefono CSV(430)');
for (const id of bahias430) {
  const m = mapa[String(id)];
  L(`    ${String(id).padStart(3)}  ${String(SB.get(id).nombre).padEnd(36)} ${String(m ? m.capitania : '(sin entrada)').padEnd(15)} ${String(m ? m.telefono : '—').padEnd(21)} ${fila430 ? fila430.Telefono : '—'}`);
}
const telYaIgual430 = bahias430.filter(id => mapa[String(id)] && fila430 && mapa[String(id)].telefono === fila430.Telefono).length;
L('');
L(`    de las ${bahias430.length}, ya traen el telefono del CSV : ${telYaIgual430}`);
L('    O sea: el telefono de esta reparticion ya se adjudico y se escribio; el');
L('    rotulo del mismo registro no. Es el estado que la seccion 3 de la auditoria');
L('    describio y esto lo cuantifica por entrada.');

// ─── N5 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N5 — EL ROTULO DE LAS 64 FILAS DEL CSV CONTRA DIRECTEMAR (INV-3.3)');
L('================================================================================');
L(`    Fuente: los gm_*.html del sondeo del 2026-08-12, leidos del arbol ${ARBOL_GM}`);
L('    con `git show`. No estan en HEAD (la poda del sondeo los saco).');
L('');
let archivosGm;
try {
  archivosGm = execFileSync('git', ['ls-tree', '-r', '--name-only', ARBOL_GM], { cwd: RAIZ, encoding: 'utf8' })
    .split(/\r?\n/).filter(l => /gm_.*\.html$/.test(l));
} catch (e) {
  abortar(`no se pudo listar el arbol ${ARBOL_GM}: ${e.message}`);
}
L(`    archivos gm_*.html en ${ARBOL_GM} : ${archivosGm.length}`);
if (archivosGm.length === 0) abortar(`el arbol ${ARBOL_GM} no tiene gm_*.html`);

// parseo: cada seccion es  id="vtxt_cuerpo_TN">TITULO</div> ... hasta el proximo contSubtit
const capitaniasPublicadas = new Map(); // normalizado -> {titulo, archivo}
const alcaldiasPublicadas = new Map();  // normalizado -> {bajo, archivo, literal}
let seccionesLeidas = 0;
for (const f of archivosGm) {
  let html;
  try { html = execFileSync('git', ['show', `${ARBOL_GM}:${f}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { abortar(`no se pudo leer ${f} de ${ARBOL_GM}: ${e.message}`); }
  const re = /id="vtxt_cuerpo_T\d+">([^<]*)<\/div>/g;
  const marcas = [];
  let m2;
  while ((m2 = re.exec(html)) !== null) marcas.push({ titulo: m2[1].trim(), fin: re.lastIndex });
  for (let i = 0; i < marcas.length; i++) {
    seccionesLeidas++;
    const cuerpo = html.slice(marcas[i].fin, i + 1 < marcas.length ? marcas[i + 1].fin : html.length);
    // Colapso de espacios ANTES de parsear el titulo. La fuente trae
    // "Capitanía  de Puerto de Melinka" con DOBLE ESPACIO y titulos con espacio
    // final. La primera version de este instrumento no lo colapsaba y declaro
    // ausente a Melinka: es la misma trampa que CLAUDE.md §2 ya lista como caso
    // real de este repositorio. Se corrige el parser, no la afirmacion.
    const t = marcas[i].titulo.replace(/\s+/g, ' ').trim();
    const mCap = /^Capitan[íi]a de Puerto(?: de| del)?\s+(.+)$/i.exec(t);
    if (mCap) {
      const mTel = /<li>\s*(?:Tel[ée]fono|Fono)\s*:\s*([^<]*)<\/li>/i.exec(cuerpo);
      capitaniasPublicadas.set(normalizarTexto(mCap[1]), {
        titulo: t, nombre: mCap[1].trim(), archivo: path.basename(f),
        telefono: mTel ? mTel[1].replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : null
      });
      continue;
    }
    const mAlc = /^Alcald[íi]as? de Mar(?: de| del)?\s+(.+)$/i.exec(t);
    if (mAlc) {
      const bajo = mAlc[1].trim();
      const items = [...cuerpo.matchAll(/<li>([^<]*)<\/li>/g)].map(x => x[1].replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
      for (const it of items) alcaldiasPublicadas.set(normalizarTexto(it), { bajo, archivo: path.basename(f), literal: it });
    }
  }
}
L(`    secciones leidas                              : ${seccionesLeidas}`);
L(`    titulos "Capitania de Puerto de X" distintos  : ${capitaniasPublicadas.size}`);
L(`    items dentro de bloques "Alcaldias de Mar"    : ${alcaldiasPublicadas.size}`);
if (capitaniasPublicadas.size === 0 || alcaldiasPublicadas.size === 0)
  abortar('el parseo de los gm_*.html devolvio un lado vacio — un lado vacio y un lado identico dan lo mismo si se cuentan diferencias');

L('');
L('    COTEJO de las 64 filas del CSV contra lo publicado. La igualdad es de');
L('    CADENA normalizada (INV-0.3): no afirma identidad de reparticion.');
let esCap = 0, esAlc = 0, niUnoNiOtro = 0;
const listaAlc = [], listaNi = [];
for (const fila of csv) {
  const n = normalizarTexto(fila.Capitania);
  const c = capitaniasPublicadas.has(n);
  const a = alcaldiasPublicadas.has(n);
  if (c) esCap++;
  if (a && !c) { esAlc++; listaAlc.push({ fila, info: alcaldiasPublicadas.get(n) }); }
  if (!c && !a) { niUnoNiOtro++; listaNi.push(fila); }
}
L('');
L(`    COMPARACIONES EFECTIVAS                                     : ${csv.length}`);
L(`    publicada por DIRECTEMAR como "Capitania de Puerto de X"    : ${esCap}`);
L(`    NO publicada como Capitania y SI dentro de un bloque de     : ${esAlc}`);
L('        Alcaldias de Mar');
L(`    en ninguno de los dos lugares                               : ${niUnoNiOtro}`);
for (const x of listaAlc)
  L(`        CdRep ${String(x.fila.CdRep).padStart(3)}  CSV="${x.fila.Capitania}"  ->  publicada como ALCALDIA "${x.info.literal}", bajo "${x.info.bajo}" (${x.info.archivo})`);
for (const f of listaNi)
  L(`        CdRep ${String(f.CdRep).padStart(3)}  CSV="${f.Capitania}"  ->  no figura con ese nombre en ningun titulo de Capitania ni en ningun bloque de Alcaldias`);

L('');
L('    LA PREGUNTA QUE DECIDE SI ESTO LE TOCA A LA PIEZA A:');
L('    ¿alguna de las 164 bahias llega, por la via `CdRep -> CSV`, a una fila que');
L('    DIRECTEMAR no publica como Capitania de Puerto?');
const alcanzadas = new Map();
for (const v of resuelven) {
  const n = normalizarTexto(v.csvNombre);
  if (!capitaniasPublicadas.has(n)) {
    if (!alcanzadas.has(v.cdRep)) alcanzadas.set(v.cdRep, { nombre: v.csvNombre, ids: [] });
    alcanzadas.get(v.cdRep).ids.push(v.id);
  }
}
L(`        COMPARACIONES EFECTIVAS : ${resuelven.length}`);
L(`        bahias alcanzadas       : ${[...alcanzadas.values()].reduce((s, x) => s + x.ids.length, 0)}`);
for (const [c, x] of alcanzadas) L(`        CdRep ${c} ("${x.nombre}") -> ${x.ids.length} bahia(s): ${x.ids.join(', ')}`);

L('');
L('    LOS TITULOS QUE DIRECTEMAR PUBLICA, literal, para las filas que el cotejo');
L('    de arriba no encontro. Se busca por SUBCADENA normalizada del nombre del');
L('    CSV dentro de cada titulo publicado: dice si el nombre esta CONTENIDO en');
L('    alguno, no que sean la misma reparticion.');
for (const f of [...listaNi]) {
  const n = normalizarTexto(f.Capitania);
  const cont = [...capitaniasPublicadas.entries()].filter(([k]) => k.includes(n) || n.includes(k));
  if (cont.length === 0) { L(`        CSV="${f.Capitania}"  ->  ningun titulo publicado lo contiene`); continue; }
  for (const [, v] of cont) L(`        CSV="${f.Capitania}"  ->  titulo publicado: "${v.titulo}"  (${v.archivo})`);
}

L('');
L(`    LOS ${capitaniasPublicadas.size} TITULOS "Capitania de Puerto de X" PUBLICADOS, literal y completos,`);
L('    para que la lectura de arriba se pueda auditar sin volver a la fuente:');
for (const [, v] of [...capitaniasPublicadas.entries()].sort((a, b) => a[0].localeCompare(b[0])))
  L(`        "${v.titulo}"  (${v.archivo})`);

// ─── N11 ─────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N11 — IDENTIFICACION POR EL NUMERO ENTRE EL CSV Y LA FICHA PUBLICADA');
L('================================================================================');
L('    Las 6 filas de N5 cuyo nombre DIRECTEMAR no publica plantean una pregunta');
L('    que el nombre no puede contestar. Se contesta POR EL TELEFONO, que es la');
L('    misma via que este repositorio ya uso para el contacto lacustre: se compara');
L('    el telefono de la fila del CSV contra el de la ficha publicada. No supone');
L('    ninguna equivalencia de rotulos.');
const solNum = t => (t || '').replace(/[^\d+]/g, '');
const porTelPublicado = new Map();
for (const [, v] of capitaniasPublicadas) {
  if (!v.telefono) continue;
  const k = solNum(v.telefono);
  if (!porTelPublicado.has(k)) porTelPublicado.set(k, []);
  porTelPublicado.get(k).push(v);
}
L('');
L(`    fichas publicadas con telefono legible : ${[...capitaniasPublicadas.values()].filter(v => v.telefono).length} de ${capitaniasPublicadas.size}`);
if (porTelPublicado.size === 0) abortar('cero fichas publicadas con telefono — un lado vacio en N11');
let n11cmp = 0, n11ok = 0;
for (const f of [...listaAlc.map(x => x.fila), ...listaNi]) {
  n11cmp++;
  const cand = porTelPublicado.get(solNum(f.Telefono)) || [];
  if (cand.length) n11ok++;
  L(`        CdRep ${String(f.CdRep).padStart(3)}  CSV="${f.Capitania}"  tel="${f.Telefono || '(vacio)'}"`);
  if (!f.Telefono) { L('            -> la fila no trae telefono: no se puede identificar por esta via'); continue; }
  if (!cand.length) { L('            -> ninguna ficha publicada trae ese numero'); continue; }
  for (const c of cand) L(`            -> MISMO NUMERO que la ficha "${c.titulo}"  (tel publicado "${c.telefono}", ${c.archivo})`);
}
L('');
L(`    COMPARACIONES EFECTIVAS : ${n11cmp}`);
L(`    identificadas por el numero contra una ficha publicada : ${n11ok}`);
if (n11cmp === 0) abortar('cero comparaciones efectivas en N11');

// ─── N12 ─────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N12 — DE DONDE SALE LA COLUMNA `Capitania` DEL CSV');
L('================================================================================');
L('    D-R3 dice "del CSV canonico, nunca de la cadena cruda de SITPORT". Esto');
L('    mide si esas dos cosas son distintas, contra la captura de');
L('    `consultaCapuertoRestriccion` del 2026-08-11.');
const P_REP = '_bitacoras/e01d_d7_y_257_2026-08-11/sitport_consultaCapuertoRestriccion.json';
const repRaw = JSON.parse(fs.readFileSync(abs(P_REP), 'utf8'));
const repArr = Array.isArray(repRaw) ? repRaw : repRaw.recordsets[0];
const repPorCd = new Map(repArr.map(r => [Number(r.Cdreparticion ?? r.CdReparticion), String(r.NMBahia)]));
L('');
L(`    ${P_REP}`);
L(`        sha256 : ${sha(abs(P_REP))}`);
L(`        reparticiones : ${repArr.length}`);
let n12cmp = 0, n12igual = 0, n12dist = 0;
const n12detalle = [];
for (const f of csv) {
  const nm = repPorCd.get(Number(f.CdRep));
  if (!nm) continue;
  n12cmp++;
  const pelado = nm.replace(/^CAPITAN[IÍ]A\s+DE\s+PUERTO\s+(?:DE\s+)?/i, '').replace(/\s+/g, ' ').trim();
  if (normalizarTexto(pelado) === normalizarTexto(f.Capitania)) n12igual++;
  else { n12dist++; n12detalle.push({ f, nm, pelado }); }
}
L('');
L(`    COMPARACIONES EFECTIVAS : ${n12cmp}`);
L('    (se compara la columna `Capitania` del CSV contra el `NMBahia` de SITPORT');
L('     al que se le quita el prefijo "CAPITANÍA DE PUERTO [DE]")');
L(`        coinciden normalizados : ${n12igual}`);
L(`        difieren               : ${n12dist}`);
if (n12cmp === 0) abortar('cero comparaciones efectivas en N12');
for (const d of n12detalle) L(`        CdRep ${String(d.f.CdRep).padStart(3)}  CSV="${d.f.Capitania}"  SITPORT="${d.nm}" -> pelado="${d.pelado}"`);
L('');
L('    Y el mismo cotejo contra los titulos publicados por DIRECTEMAR, para ver');
L('    de cual de las dos fuentes esta mas cerca la columna:');
let cercaDirectemar = 0;
for (const f of csv) if (capitaniasPublicadas.has(normalizarTexto(f.Capitania))) cercaDirectemar++;
L(`        filas del CSV cuyo nombre coincide con un titulo de DIRECTEMAR : ${cercaDirectemar} de ${csv.length}`);
L(`        filas del CSV cuyo nombre coincide con el NMBahia pelado de SITPORT : ${n12igual} de ${n12cmp}`);

// ─── N9 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N9 — UN NUMERO PARA DOS CAPITANIAS: REPETICIONES DENTRO DEL CSV');
L('================================================================================');
L('    La identificacion es POR EL NUMERO, no por el nombre: no supone ninguna');
L('    equivalencia de rotulos.');
const porTel = new Map();
for (const f of csv) {
  if (!f.Telefono) continue;
  const k = f.Telefono.replace(/\s+/g, '');
  if (!porTel.has(k)) porTel.set(k, []);
  porTel.get(k).push(f);
}
const repetidos = [...porTel.entries()].filter(([, v]) => v.length > 1);
L('');
L(`    COMPARACIONES EFECTIVAS (filas con telefono) : ${csv.filter(f => f.Telefono).length}`);
L(`    numeros distintos                            : ${porTel.size}`);
L(`    numeros que aparecen en MAS DE UNA fila      : ${repetidos.length}`);
if (csv.filter(f => f.Telefono).length === 0) abortar('cero comparaciones efectivas en N9');
for (const [k, v] of repetidos) {
  const bahias = v.reduce((s, f) => s + resuelven.filter(x => x.cdRep === Number(f.CdRep)).length, 0);
  L(`        "${v[0].Telefono}"  ->  ${v.length} filas: ${v.map(f => `${f.Capitania} (CdRep ${f.CdRep})`).join(' · ')}   [alcanza ${bahias} bahia(s)]`);
}

// ─── N10 ─────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N10 — SI SE ESCRIBE EL NOMBRE Y NO EL TELEFONO: ¿DE QUIEN ES EL NUMERO QUE');
L('      QUEDA AL LADO?');
L('================================================================================');
L('    Es la comprobacion que tumbo la decision del 2026-08-13 (PLAN §7.1): el');
L('    nombre de una Capitania con el telefono de otra. Se identifica POR EL');
L('    NUMERO contra las 64 filas del CSV, sin comparar nombres.');
const duenoDelNumero = new Map();
for (const f of csv) { if (f.Telefono) duenoDelNumero.set(f.Telefono.replace(/\s+/g, ''), f); }
function diagnosticar(ids, etiqueta) {
  let coincide = 0, deOtra = 0, noIdentificable = 0;
  const detalle = [];
  for (const id of ids) {
    const s = SB.get(id); const f = s && csvPorCdRep.get(s.cdRep); const m = mapa[String(id)];
    if (!f || !m || !m.telefono) continue;
    const dueno = duenoDelNumero.get(m.telefono.replace(/\s+/g, ''));
    if (!dueno) { noIdentificable++; detalle.push({ id, nom: f.Capitania, tel: m.telefono, dueno: '(no figura en el CSV)' }); }
    else if (Number(dueno.CdRep) === s.cdRep) coincide++;
    else { deOtra++; detalle.push({ id, nom: f.Capitania, tel: m.telefono, dueno: `${dueno.Capitania} (CdRep ${dueno.CdRep})` }); }
  }
  L('');
  L(`    ${etiqueta}`);
  L(`        COMPARACIONES EFECTIVAS                              : ${coincide + deOtra + noIdentificable}`);
  L(`        el numero es de la MISMA reparticion que el nombre    : ${coincide}`);
  L(`        el numero es de OTRA reparticion del CSV              : ${deOtra}`);
  L(`        el numero no figura en el CSV (no identificable)      : ${noIdentificable}`);
  if (coincide + deOtra + noIdentificable === 0) abortar(`cero comparaciones efectivas en N10 / ${etiqueta}`);
  return detalle;
}
const det17 = diagnosticar(nulas, 'LAS 17 NULAS — escribiendo solo el nombre y dejando el telefono de hoy:');
for (const d of det17)
  L(`        ${String(d.id).padStart(3)}  quedaria "${d.nom}"  con  "${d.tel}"  que es de: ${d.dueno}`);
const det163 = diagnosticar(resuelven.map(v => v.id), 'LAS 163 — mismo ejercicio, para dimensionar el resto:');
L(`        (detalle omitido: ${det163.length} filas)`);

// ─── N13 ─────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N13 — LAS DOS FORMAS DEL ROTULO, LADO A LADO');
L('================================================================================');
L('    Forma A = la cadena de la columna `Capitania` del CSV, verbatim (D-R3 tal');
L('              como esta escrita).');
L('    Forma B = el nombre del titulo que DIRECTEMAR publica para esa misma');
L('              reparticion, entrando igual por `CdReparticion`. La reparticion');
L('              se identifica por NOMBRE cuando coincide y por TELEFONO cuando');
L('              no (N11). Donde ninguna de las dos identifica, no hay forma B.');
const formaB = new Map(); // CdRep -> nombre publicado
for (const f of csv) {
  const porNombre = capitaniasPublicadas.get(normalizarTexto(f.Capitania));
  if (porNombre) { formaB.set(Number(f.CdRep), porNombre.nombre); continue; }
  const cand = f.Telefono ? (porTelPublicado.get(solNum(f.Telefono)) || []) : [];
  if (cand.length === 1) formaB.set(Number(f.CdRep), cand[0].nombre);
}
L('');
L(`    filas del CSV con forma B : ${formaB.size} de ${csv.length}`);
for (const f of csv) if (!formaB.has(Number(f.CdRep))) {
  const n = resuelven.filter(v => v.cdRep === Number(f.CdRep)).length;
  L(`        SIN forma B: CdRep ${f.CdRep} "${f.Capitania}" -> alcanza ${n} bahia(s)`);
}
const conB = resuelven.filter(v => formaB.has(v.cdRep));
L('');
L(`    COMPARACIONES EFECTIVAS (bahias con forma A y con forma B) : ${conB.length} de ${resuelven.length}`);
if (conB.length === 0) abortar('cero comparaciones efectivas en N13');
const bIgualHoy = conB.filter(v => v.hoyNombre === formaB.get(v.cdRep)).length;
const bNulaHoy = conB.filter(v => !v.hoyNombre).length;
const bCambia = conB.filter(v => v.hoyNombre && v.hoyNombre !== formaB.get(v.cdRep)).length;
L('');
L('    Forma B contra lo que el mapa dice HOY:');
L(`        identico caracter por caracter (no cambia) : ${bIgualHoy}`);
L(`        hoy null, B le escribe un nombre           : ${bNulaHoy}`);
L(`        CAMBIA la cadena                           : ${bCambia}`);
L('');
L('    Recordatorio del mismo cotejo para la forma A (N1): identicos 0.');
L('');
L('    LAS 17 NULAS, las dos formas:');
L('        id   forma A (CSV verbatim)   forma B (titulo DIRECTEMAR)');
for (const id of nulas) {
  const s = SB.get(id); const f = csvPorCdRep.get(s.cdRep);
  L(`        ${String(id).padStart(3)}  ${String(f ? f.Capitania : '—').padEnd(24)} ${formaB.get(s.cdRep) || '(sin forma B)'}`);
}

// ─── N6 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N6 — LA FORMA DE LA CADENA QUE LA VIA IMPRIMIRIA');
L('================================================================================');
L('    D-R3 fija que el nombre sale del CSV. Esto mide QUE CADENA es esa, sin');
L('    proponer ninguna transformacion.');
L('');
const csvMayus = csv.filter(f => f.Capitania === f.Capitania.toUpperCase()).length;
L(`    filas del CSV cuyo nombre esta integramente en MAYUSCULAS : ${csvMayus} de ${csv.length}`);
const hoyMayus = resuelven.filter(v => v.hoyNombre && v.hoyNombre === v.hoyNombre.toUpperCase()).length;
const hoyNoNulo = resuelven.filter(v => v.hoyNombre).length;
L(`    entradas del mapa con rotulo hoy en MAYUSCULAS            : ${hoyMayus} de ${hoyNoNulo} no nulas`);
L('');
L('    Filas del CSV cuya cadena tiene algo mas que la caja — se listan por lo que');
L('    la cadena ES, no por lo que deberia ser:');
for (const f of csv) {
  const notas = [];
  if (/\./.test(f.Capitania)) notas.push('trae un punto (abreviatura)');
  if (/^RIO |^BAHIA |RIO NEGRO/.test(f.Capitania) && !/[ÍÁÉÓÚÑ]/.test(f.Capitania)) notas.push('sin tilde donde el resto del CSV si la lleva');
  if (/CHANARAL/.test(f.Capitania)) notas.push('sin la ñ');
  if (notas.length) L(`        CdRep ${String(f.CdRep).padStart(3)}  "${f.Capitania}"  -> ${notas.join('; ')}`);
}
L('');
L('    Cuantas bahias imprimirian cada una de esas cadenas:');
for (const f of csv) {
  if (!/\./.test(f.Capitania) && !/CHANARAL/.test(f.Capitania)) continue;
  const n = resuelven.filter(v => v.cdRep === Number(f.CdRep)).length;
  L(`        "${f.Capitania}" -> ${n} bahia(s)`);
}

// ─── N7 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N7 — ATOMICIDAD DE LOS TELEFONOS QUE LA VIA ESCRIBIRIA (INV-10.1)');
L('================================================================================');
L('    INV-10.1: "un valor que no sea un numero atomico no se renderiza como');
L('    enlace". Criterio usado, declarado: NO es atomico si trae `/`, la palabra');
L('    `ó`/`o`, `Movil`, `Anexo`, `(` o mas de un `+`.');
const noAtomico = t => /\//.test(t) || /\(/.test(t) || /\bm[oó]vil\b/i.test(t) || /\banexo\b/i.test(t) || (t.match(/\+/g) || []).length > 1 || /\s[óo]\s/i.test(t);
const filasNoAtom = csv.filter(f => f.Telefono && noAtomico(f.Telefono));
L('');
L(`    COMPARACIONES EFECTIVAS (filas del CSV con telefono) : ${csv.filter(f => f.Telefono).length}`);
L(`    filas con telefono NO atomico                        : ${filasNoAtom.length}`);
for (const f of filasNoAtom) {
  const n = resuelven.filter(v => v.cdRep === Number(f.CdRep)).length;
  L(`        CdRep ${String(f.CdRep).padStart(3)}  "${f.Capitania}"  -> ${n} bahia(s)  tel="${f.Telefono}"`);
}
const nulasNoAtom = nulas.filter(id => { const s = SB.get(id); const f = s && csvPorCdRep.get(s.cdRep); return f && f.Telefono && noAtomico(f.Telefono); });
L(`    de las 17 NULAS, cuantas recibirian un telefono no atomico : ${nulasNoAtom.length} -> ${nulasNoAtom.join(', ') || '(ninguna)'}`);
const hoyNoAtom = Object.keys(mapa).filter(k => mapa[k].telefono && noAtomico(mapa[k].telefono)).length;
L(`    telefonos NO atomicos en el mapa HOY                       : ${hoyNoAtom} de 164`);

// ─── N8 ──────────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L('N8 — QUE CAMPO LEE CADA CAMINO A PANTALLA, LEIDO DEL CODIGO');
L('================================================================================');
L('    Se imprimen las lineas literales. No se supone ningun comportamiento.');
const puntos = [
  ['src/routes/sitport-routes.js', /getCapitaniaByBahiaId|capitaniaDeBahia\(/],
  ['src/services/capitania-de-bahia.js', /capitania|gobernacion|telefono/],
];
for (const [f, re] of puntos) {
  const p = abs(f);
  if (!fs.existsSync(p)) { L(`    ${f} — NO EXISTE en el arbol de trabajo`); continue; }
  const lineas = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const hits = lineas.map((l, i) => [i + 1, l]).filter(([, l]) => re.test(l));
  L('');
  L(`    ${f} — ${hits.length} lineas`);
  for (const [n, l] of hits.slice(0, 40)) L(`      ${String(n).padStart(4)}: ${l.trim()}`);
}
L('');
L('    EFECTO DE LA PIEZA A SOBRE EL CAMINO P2 (la etiqueta dura "Capitanía de');
L('    Puerto de {nombre}" de P3_VoyageVerification.jsx:237, que hoy cae a');
L('    `rec.gobernacion` cuando `rec.capitania` es null):');
L(`        entradas que hoy caen a gobernacion en ese camino : ${nulas.length}`);
L(`        entradas que seguirian cayendo tras la Pieza A    : ${17 - nulasResueltas}`);
L('');
L('    El resto de lo que ese camino hace —rotular con etiqueta dura, y rotular');
L('    "Gobernación Marítima de" un numero de Capitania en P3— no depende del');
L('    valor escrito y este bloque no lo mide: esta medido en');
L('    `_bitacoras/auditoria_rotulos_2026-08-15/02_medir_pantalla.txt`.');

L('');
L('================================================================================');
L('Ningun archivo fue escrito por este script.');
L('================================================================================');
