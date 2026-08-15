/**
 * BARRIDO DE LAS 23 CAPITANIAS SIN PAR CONTRA EL TEXTO DEL DECRETO
 * ----------------------------------------------------------------
 * Pregunta que contesta, y solo esa:
 *   para cada Capitania cuyo par (limite_norte_dec, limite_sur_dec) esta
 *   incompleto en el insumo v1, QUE COORDENADAS trae su parrafo en el texto
 *   versionado TM-025-A_2025-06-04.txt, CUALES estan en el insumo y en que rol,
 *   y CUALES no estan en ninguna parte de su entrada.
 *
 * Lo que NO hace: no corrige el insumo, no escribe nada fuera de _bitacoras/,
 * no decide si un paralelo ausente "deberia" ir a limite_norte/limite_sur —
 * eso es adjudicacion sobre el decreto y es del owner (CLAUDE.md §0.4).
 *
 * Shell declarada (CLAUDE.md §7.3): ejecutado con `node` sobre Windows.
 * Reproducible por el owner, en PowerShell, desde la raiz del repo:
 *     node _bitacoras\barrido_23_sin_par_2026-08-14\barrido_23.js
 *
 * Falla ruidoso (CLAUDE.md §4.1/§4.2): si una de las 23 no encuentra su parrafo
 * en el texto, el proceso aborta con el motivo. No hay caso por defecto.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const TXT = path.join(RAIZ, 'data', 'decreto', 'fuente', 'TM-025-A_2025-06-04.txt');
const INSUMO = path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_capitanias.json');

const TOL = 1e-5; // grados. ~1,1 m en latitud. Umbral tecnico (§0.4).

// ---------------------------------------------------------------- utilidades
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const dec = (g, m, s, hemi) => {
  const v = Number(g) + Number(m) / 60 + Number(s) / 3600;
  return /^(s|w)/i.test(hemi) ? -v : v;
};

// Lineas de aparato editorial que NO son texto normativo: el encabezado corrido
// de cada pagina y las notas al pie que citan los D.S. modificatorios.
const esAparato = (l) =>
  /^\s*FIJA JURISDICCI/i.test(l) ||
  /^\s*\d+\s+D\.S\.\s*\(M\)/.test(l);

// ------------------------------------------------------- segmentacion del txt
const lineasTodas = fs.readFileSync(TXT, 'utf8').split(/\r?\n/);
// El Art. 1 es lo unico que fija jurisdicciones. Del Art. 2 en adelante hay
// texto normativo general y la ficha tecnica, que no pertenecen a ningun
// parrafo de Capitania y contaminarian el ultimo bloque.
const FIN_ART1 = lineasTodas.findIndex((l) => /^\s*Art\.\s*2\s*[°º]/.test(l));
if (FIN_ART1 < 0) { console.error('ABORTA (§4.1): no se encontro el inicio del Art. 2 en el texto.'); process.exit(2); }
const lineas = lineasTodas.slice(0, FIN_ART1);

const RE_GOB = /^\s*GOBERNACI[ÓO]N\s+MAR[ÍI]TIMA\s+(?:DE\s+|DEL\s+)?(.+?)\s*$/i;
const RE_CAP = /^\s*-\s*Capitan[ií]a\s+de\s+Puerto\s+(?:de\s+|del\s+)?(.+?)\s*\.?\s*$/i;
// La frase de remision viene partida en dos lineas en la fuente; se busca sobre
// el texto del bloque aplanado, no linea a linea.
const RE_IGUAL = /En su jurisdicci[óo]n existir[áa]\s+la\s+Capitan[ií]a\s+de\s+Puerto\s+(?:de\s+|del\s+)?([\s\S]+?),\s*con\s+igual\s+territorio\s+jurisdiccional/i;

// bloques[] = { clase:'gob'|'cap', nombre, desde, hasta, gob }
const bloques = [];
let actual = null;
let gobActual = null;
for (let i = 0; i < lineas.length; i++) {
  const l = lineas[i];
  if (esAparato(l)) continue;
  let m;
  if ((m = l.match(RE_GOB))) {
    if (actual) actual.hasta = i - 1;
    gobActual = m[1];
    actual = { clase: 'gob', nombre: m[1], desde: i + 1, hasta: null, gob: m[1] };
    bloques.push(actual);
  } else if ((m = l.match(RE_CAP))) {
    if (actual) actual.hasta = i - 1;
    actual = { clase: 'cap', nombre: m[1], desde: i + 1, hasta: null, gob: gobActual };
    bloques.push(actual);
  }
}
if (actual) actual.hasta = lineas.length - 1;

// Remision explicita: "con igual territorio jurisdiccional" (frase partida en
// dos lineas en la fuente), y recorte del bloque de la Gobernacion, que termina
// donde empieza su lista de Capitanias.
const remision = new Map(); // norm(nombre capitania) -> nombre gobernacion
for (const b of bloques) {
  if (b.clase !== 'gob') continue;
  const cola = lineas.slice(b.desde, b.hasta + 1).filter((l) => !esAparato(l)).join('\n');
  const m = cola.match(RE_IGUAL);
  if (m) remision.set(norm(m[1].replace(/\s+/g, ' ')), b.nombre);
  for (let i = b.desde; i <= b.hasta; i++) {
    if (/En su jurisdicci[óo]n existir[áa]n?\s*(las siguientes|la\s+Capitan)/i.test(lineas[i])) { b.hasta = i - 1; break; }
  }
}

const textoDe = (b) => lineas.slice(b.desde, b.hasta + 1)
  .filter((l) => !esAparato(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();

// --------------------------------------------------------- extraccion de DMS
// Formas presentes en la fuente: º/°, ´/'/’, ''/"/”/'/°, sufijo S|Sur|W|Weste,
// y un caso con el segundo cerrado por ° (linea "41°44’40° S.").
const RE_DMS = /(\d{1,3})\s*[°º]\s*(\d{1,2})\s*[´'’]\s*(\d{1,2})\s*(?:''|["”´’'°º])?\s*(Sur|Weste|S|W)\b\.?/g;
// Tokens sin hemisferio (la fuente los tiene: "Latitud 42°23'30" y Longitud ...")
const RE_DMS_SIN = /(\d{1,3})\s*[°º]\s*(\d{1,2})\s*[´'’]\s*(\d{1,2})\s*(?:''|["”´’'°º])?/g;

const ROL = (pre) => {
  const p = norm(pre);
  if (/\bparalelo\b\s*$/.test(p)) return 'paralelo';
  if (/\bmeridiano\b\s*$/.test(p) || /\bmeridiano del lugar\b\s*$/.test(p)) return 'meridiano';
  if (/\blatitud\b\s*$/.test(p)) return 'latitud';
  if (/\blongitud\b\s*$/.test(p)) return 'longitud';
  if (/\bl\s*$/.test(p)) return 'L=';
  if (/\bg\s*$/.test(p)) return 'G=';
  return 'sin rotulo';
};

// gap que une una latitud con su longitud formando UN punto:
// solo puntuacion, opcional "y"/"e", opcional la palabra Longitud o "G =".
const RE_JUNTA = /^[.,;\s]*(?:y|e)?[\s]*(?:longitud|long|g\s*=)?[\s.:]*$/i;

function tokens(texto) {
  const out = [];
  const vistos = new Set();
  let m;
  RE_DMS.lastIndex = 0;
  while ((m = RE_DMS.exec(texto))) {
    const hemi = /^S/i.test(m[4]) ? 'S' : 'W';
    out.push({
      ini: m.index, fin: m.index + m[0].length, crudo: m[0].trim(),
      g: m[1], mi: m[2], s: m[3], hemi,
      eje: hemi === 'S' ? 'lat' : 'lon',
      val: dec(m[1], m[2], m[3], hemi),
      rol: ROL(texto.slice(Math.max(0, m.index - 24), m.index)),
      sufijo: true,
    });
    for (let k = m.index; k < m.index + m[0].length; k++) vistos.add(k);
  }
  RE_DMS_SIN.lastIndex = 0;
  while ((m = RE_DMS_SIN.exec(texto))) {
    if (vistos.has(m.index)) continue;
    const rol = ROL(texto.slice(Math.max(0, m.index - 24), m.index));
    // Sin hemisferio: se infiere del rotulo. Si no hay rotulo, se declara.
    const eje = /latitud|paralelo|^L=$/.test(rol) ? 'lat'
      : /longitud|meridiano|^G=$/.test(rol) ? 'lon' : null;
    if (eje === null) continue; // no se inventa: queda fuera y se reporta aparte
    out.push({
      ini: m.index, fin: m.index + m[0].length, crudo: m[0].trim(),
      g: m[1], mi: m[2], s: m[3], hemi: eje === 'lat' ? 'S' : 'W',
      eje, val: dec(m[1], m[2], m[3], eje === 'lat' ? 'S' : 'W'),
      rol, sufijo: false,
    });
  }
  out.sort((a, b) => a.ini - b.ini);
  return out;
}

// Agrupa en items: PUNTO (lat+lon) o SUELTO (una sola coordenada).
function items(texto) {
  const t = tokens(texto);
  const res = [];
  for (let i = 0; i < t.length; i++) {
    const a = t[i], b = t[i + 1];
    if (a && b && a.eje === 'lat' && b.eje === 'lon' && RE_JUNTA.test(texto.slice(a.fin, b.ini))) {
      res.push({ clase: 'punto', lat: a, lon: b, ini: a.ini });
      i++;
    } else {
      res.push({ clase: 'suelto', tok: a, ini: a.ini });
    }
  }
  return res;
}

// ------------------------------------------------- inventario del insumo
const insumo = JSON.parse(fs.readFileSync(INSUMO, 'utf8'));
const tieneNum = (v) => typeof v === 'number' && isFinite(v);

// Rol con el que el insumo v1 puede guardar una coordenada, y que significa:
//   limite_norte_dec / limite_sur_dec -> una LINEA de latitud (paralelo)
//   vertices[k] / poligonal_completa[k] -> un PUNTO (par lat+lon)
//   punto_interior -> declarado CONVENCION en el propio insumo, no es decreto
// El esquema v1 NO tiene ningun campo para un MERIDIANO suelto. Eso no es un
// hueco de transcripcion de una entrada: es una forma que el esquema no admite.
const ROL_LINEA_LAT = new Set(['limite_norte_dec', 'limite_sur_dec']);

function puntosInsumo(c) {
  const pts = [];
  (c.vertices || []).forEach((v, k) => {
    if (tieneNum(v.lat) && tieneNum(v.lon)) pts.push({ rol: `vertices[${k}]`, lat: v.lat, lon: v.lon });
  });
  (c.poligonal_completa || []).forEach((v, k) => {
    if (tieneNum(v.lat) && tieneNum(v.lon)) pts.push({ rol: `poligonal_completa[${k}]`, lat: v.lat, lon: v.lon });
  });
  return pts;
}

// `vertices` y `poligonal_completa` guardan LOS MISMOS puntos en varias entradas
// (en puerto_williams son el mismo punto A y el mismo punto F dos veces). Contar
// las dos listas mide la duplicacion del esquema, no cuantos puntos distintos
// hay sobre una linea. Se cuentan pares (lat,lon) distintos.
function puntosDistintos(pts) {
  const vistos = new Set();
  return pts.filter((p) => {
    const k = `${p.lat.toFixed(5)}|${p.lon.toFixed(5)}`;
    if (vistos.has(k)) return false;
    vistos.add(k); return true;
  });
}

function coordsInsumo(c) {
  const inv = []; // { eje, val, rol }
  if (tieneNum(c.limite_norte_dec)) inv.push({ eje: 'lat', val: c.limite_norte_dec, rol: 'limite_norte_dec' });
  if (tieneNum(c.limite_sur_dec)) inv.push({ eje: 'lat', val: c.limite_sur_dec, rol: 'limite_sur_dec' });
  (c.vertices || []).forEach((v, k) => {
    if (tieneNum(v.lat)) inv.push({ eje: 'lat', val: v.lat, rol: `vertices[${k}].lat` });
    if (tieneNum(v.lon)) inv.push({ eje: 'lon', val: v.lon, rol: `vertices[${k}].lon` });
  });
  (c.poligonal_completa || []).forEach((v, k) => {
    if (tieneNum(v.lat)) inv.push({ eje: 'lat', val: v.lat, rol: `poligonal_completa[${k}].lat` });
    if (tieneNum(v.lon)) inv.push({ eje: 'lon', val: v.lon, rol: `poligonal_completa[${k}].lon` });
  });
  if (c.punto_interior) {
    // Declarado en el propio insumo como CONVENCION, no decreto. Se inventaria
    // aparte y NO cuenta como "el insumo lo guardo del decreto".
    if (tieneNum(c.punto_interior.lat)) inv.push({ eje: 'lat', val: c.punto_interior.lat, rol: 'punto_interior.lat (CONVENCION)', convencion: true });
    if (tieneNum(c.punto_interior.lon)) inv.push({ eje: 'lon', val: c.punto_interior.lon, rol: 'punto_interior.lon (CONVENCION)', convencion: true });
  }
  return inv;
}

// Fuera de la entrada: catalogos compartidos del propio insumo.
const globales = [];
(insumo.puntos_notables || []).forEach((p, k) => {
  if (tieneNum(p.lat)) globales.push({ eje: 'lat', val: p.lat, rol: `puntos_notables[${k}] ${p.nombre}` });
  if (tieneNum(p.lon)) globales.push({ eje: 'lon', val: p.lon, rol: `puntos_notables[${k}] ${p.nombre}` });
});
(insumo.fronteras_declaradas || []).forEach((f) => {
  (f.puntos || []).forEach((p, k) => {
    if (tieneNum(p.lat)) globales.push({ eje: 'lat', val: p.lat, rol: `frontera ${f.id}[${k}].lat` });
    if (tieneNum(p.lon)) globales.push({ eje: 'lon', val: p.lon, rol: `frontera ${f.id}[${k}].lon` });
  });
});

const buscar = (inv, eje, val) => inv.filter((x) => x.eje === eje && Math.abs(x.val - val) <= TOL);

// TERCER ESTADO, y es el que cambia la respuesta: una coordenada puede estar en
// la entrada como TEXTO —dentro de `texto_decreto` o de `completado_desde_oficial`,
// que es la constancia del cotejo del 2026-08-11— y no estar en ningun campo
// numerico. La transcripcion de la prosa la guardo; la extraccion estructurada
// no. El constructor de la capa lee campos numericos, no prosa.
function prosaDe(c) {
  const trozos = [];
  (function walk(o) {
    if (typeof o === 'string') { trozos.push(o); return; }
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o && typeof o === 'object') { Object.keys(o).forEach((k) => walk(o[k])); }
  })({
    texto_decreto: c.texto_decreto,
    completado_desde_oficial: c.completado_desde_oficial,
    nota: c.nota, nota_anterior: c.nota_anterior, revisar: c.revisar,
    nota_poligonal: c.nota_poligonal, cita_correccion: c.cita_correccion,
    cita_rol_decreto: c.cita_rol_decreto, cierre: c.cierre,
  });
  return trozos.join('\n');
}

// El insumo escribe el DMS separado por espacios y sin simbolos: "40 17 03 S".
function enProsa(prosa, g, mi, s) {
  const variantes = new Set();
  const gs = [String(g), String(Number(g)), String(Number(g)).padStart(3, '0'), String(Number(g)).padStart(2, '0')];
  for (const gg of gs) variantes.add(`${gg} ${mi} ${s}`);
  for (const v of variantes) if (prosa.includes(v)) return v;
  return null;
}

// ------------------------------------------------------------------- barrido
const sinPar = insumo.capitanias.filter(
  (c) => !(tieneNum(c.limite_norte_dec) && tieneNum(c.limite_sur_dec))
);

const idxCap = new Map();
for (const b of bloques) if (b.clase === 'cap') idxCap.set(norm(b.nombre), b);
const idxGob = new Map();
for (const b of bloques) if (b.clase === 'gob') idxGob.set(norm(b.nombre), b);

const salida = [];
const noResueltas = [];

for (const c of sinPar) {
  const n = norm(c.nombre);
  let bloque = idxCap.get(n);
  let origen = 'bullet propio de la Capitania';
  if (!bloque && remision.has(n)) {
    bloque = idxGob.get(norm(remision.get(n)));
    origen = `remision expresa: "con igual territorio jurisdiccional" -> parrafo de la GM de ${remision.get(n)}`;
  }
  if (!bloque) { noResueltas.push(c.id); continue; }
  salida.push({ c, bloque, origen, texto: textoDe(bloque) });
}

if (noResueltas.length) {
  console.error('ABORTA (§4.1): sin parrafo en el texto para: ' + noResueltas.join(', '));
  process.exit(2);
}

// --------------------------------------------------------------- impresion
const L = (s = '') => console.log(s);
const HR = '='.repeat(80);
const hr = '-'.repeat(80);

L(HR);
L('BARRIDO DE LAS 23 CAPITANIAS SIN PAR CONTRA EL TEXTO DEL DECRETO');
L(`fuente texto : data/decreto/fuente/TM-025-A_2025-06-04.txt`);
L(`fuente insumo: data/decreto/jurisdicciones_capitanias.json (v1)`);
L(`tolerancia de igualdad: ${TOL} grados`);
L(`Capitanias en el insumo: ${insumo.capitanias.length} | sin par: ${sinPar.length}`);
L(HR);

const resumen = [];

for (const { c, bloque, origen, texto } of salida) {
  const inv = coordsInsumo(c);
  const its = items(texto);
  L('');
  L(HR);
  L(`${c.id}   [${c.ambito}]   GM ${c.gobernacion}`);
  L(`parrafo: lineas ${bloque.desde + 1}-${bloque.hasta + 1} del txt`);
  L(`origen : ${origen}`);
  L(HR);
  L('--- PARRAFO LITERAL DEL TEXTO VERSIONADO -------------------------------');
  L(texto);
  L('--- FIN DEL PARRAFO ----------------------------------------------------');
  L('');
  const campos = ['limite_norte_dms', 'limite_norte_dec', 'limite_sur_dms', 'limite_sur_dec']
    .map((k) => `${k}=${k in c ? JSON.stringify(c[k]) : '(campo ausente)'}`).join('  ');
  L(`insumo: ${campos}`);
  L(`insumo: coordenadas guardadas en la entrada = ${inv.length}` +
    (inv.length ? ` -> ${inv.map((x) => x.rol).join(', ')}` : ''));
  L('');

  if (!its.length) { L('COORDENADAS EN EL PARRAFO: NINGUNA.'); resumen.push({ id: c.id, n: 0, igual: 0, otro: 0, prosa: 0, falta: 0, det: [] }); L(hr); continue; }

  const pts = puntosInsumo(c);
  const prosa = prosaDe(c);
  L(`COORDENADAS EN EL PARRAFO: ${its.length} item(s)`);
  L('');
  L('  #  que dice el texto      valor literal                    decimal                  ESTADO EN EL INSUMO');
  let igual = 0, otro = 0, falta = 0, prosaSolo = 0; const det = [];
  its.forEach((it, k) => {
    const num = String(k + 1).padStart(3);
    let quePide, literal, decimal, estado, extra = null, anomalia = null;

    if (it.clase === 'punto') {
      quePide = `PUNTO (${it.lat.rol}+${it.lon.rol})`;
      literal = `${it.lat.crudo} / ${it.lon.crudo}`;
      decimal = `${it.lat.val.toFixed(6)} / ${it.lon.val.toFixed(6)}`;
      // Mismo rol = un punto del insumo con AMBAS coordenadas, en el mismo indice.
      const p = pts.find((q) => Math.abs(q.lat - it.lat.val) <= TOL && Math.abs(q.lon - it.lon.val) <= TOL);
      if (p) { estado = `MISMO ROL  -> ${p.rol}`; igual++; }
      else {
        const hl = buscar(inv, 'lat', it.lat.val).filter((x) => !x.convencion);
        const hg = buscar(inv, 'lon', it.lon.val).filter((x) => !x.convencion);
        if (hl.length || hg.length) { estado = `OTRO ROL   -> ${[...hl, ...hg].map((x) => x.rol).join(' + ')} (punto partido / no es un punto)`; otro++; }
        else {
          const pl = enProsa(prosa, it.lat.g, it.lat.mi, it.lat.s);
          const pg = enProsa(prosa, it.lon.g, it.lon.mi, it.lon.s);
          if (pl && pg) { estado = `SOLO EN PROSA -> "${pl} S / ${pg} W" en texto, en NINGUN campo numerico`; prosaSolo++; }
          else {
            estado = 'NO ESTA';
            falta++;
            const gl = buscar(globales, 'lat', it.lat.val), gg = buscar(globales, 'lon', it.lon.val);
            if (gl.length || gg.length) extra = `fuera de la entrada: ${[...gl, ...gg].map((x) => x.rol).join(' | ')}`;
          }
        }
      }
    } else {
      const t = it.tok;
      // Anomalia de la fuente: rotulo y hemisferio se contradicen.
      if (/longitud|meridiano|^G=$/.test(t.rol) && t.hemi === 'S') anomalia = `la fuente escribe "${t.crudo}": rotulo de LONGITUD con hemisferio S`;
      if (/latitud|paralelo|^L=$/.test(t.rol) && t.hemi === 'W') anomalia = `la fuente escribe "${t.crudo}": rotulo de LATITUD con hemisferio W`;
      const ejeReal = anomalia ? (t.eje === 'lat' ? 'lon' : 'lat') : t.eje;
      const valReal = anomalia ? -Math.abs(t.val) : t.val;

      const esLineaLat = /paralelo|latitud|^L=$/.test(t.rol) && ejeReal === 'lat';
      const esLineaLon = /meridiano|longitud|^G=$/.test(t.rol) && ejeReal === 'lon';
      quePide = esLineaLat ? `LINEA de latitud (${t.rol})` : esLineaLon ? `LINEA de longitud (${t.rol})` : `coordenada suelta (${t.rol})`;
      literal = t.crudo;
      decimal = valReal.toFixed(6);

      const h = buscar(inv, ejeReal, valReal).filter((x) => !x.convencion);
      const mismoRol = esLineaLat ? h.filter((x) => ROL_LINEA_LAT.has(x.rol)) : [];
      if (mismoRol.length) { estado = `MISMO ROL  -> ${mismoRol.map((x) => x.rol).join(', ')}`; igual++; }
      else if (h.length) {
        // DISCRIMINADOR DECLARADO, es heuristica y no veredicto: una linea del
        // decreto que se recorre entre dos vertices queda representada por sus
        // DOS extremos. Si el insumo tiene un solo punto sobre esa linea, el
        // trozo queda con un extremo abierto.
        const sobre = puntosDistintos(pts).filter((q) => Math.abs((ejeReal === 'lat' ? q.lat : q.lon) - valReal) <= TOL).length;
        estado = `OTRO ROL   -> ${h.map((x) => x.rol).join(', ')}`
          + (esLineaLon ? ' | el esquema v1 NO tiene campo para un meridiano' : ' | esta como coordenada de un punto, no como linea')
          + ` | puntos del insumo sobre esa linea: ${sobre}` + (sobre >= 2 ? ' (segmento con dos extremos)' : ' (EXTREMO ABIERTO)');
        otro++;
      } else {
        const p = enProsa(prosa, t.g, t.mi, t.s);
        if (p) { estado = `SOLO EN PROSA -> "${p} ${t.hemi}" en texto, en NINGUN campo numerico`; prosaSolo++; }
        else {
          estado = 'NO ESTA' + (esLineaLon ? ' | el esquema v1 NO tiene campo para un meridiano' : '');
          falta++;
        }
        const g = buscar(globales, ejeReal, valReal);
        if (g.length) extra = `fuera de la entrada: ${g.map((x) => x.rol).join(' | ')}`;
      }
    }

    L(`${num}  ${quePide.padEnd(22)} ${literal.replace(/\s*\n\s*/g, ' ').padEnd(32)} ${decimal.padEnd(24)} ${estado}`);
    if (anomalia) L(`     !! ANOMALIA DE LA FUENTE: ${anomalia}`);
    if (extra) L(`        (${extra})`);
    det.push({ quePide, literal: literal.replace(/\s*\n\s*/g, ' '), estado });
  });
  L('');
  L(`  -> en el parrafo ${its.length} | mismo rol ${igual} | otro rol ${otro} | solo en prosa ${prosaSolo} | NO ESTA ${falta}`);
  resumen.push({ id: c.id, n: its.length, igual, otro, prosa: prosaSolo, falta, det });
  L(hr);
}

L('');
L(HR);
L('CUADRO RESUMEN — las 23');
L(HR);
L('capitania                en el parrafo  mismo rol  otro rol  solo prosa  NO ESTA');
for (const r of resumen) {
  L(`${r.id.padEnd(24)} ${String(r.n).padStart(13)} ${String(r.igual).padStart(10)} ${String(r.otro).padStart(9)} ${String(r.prosa).padStart(11)} ${String(r.falta).padStart(8)}`);
}
const tot = resumen.reduce((a, r) => ({ n: a.n + r.n, i: a.i + r.igual, o: a.o + r.otro, p: a.p + r.prosa, f: a.f + r.falta }), { n: 0, i: 0, o: 0, p: 0, f: 0 });
L(hr);
L(`${'TOTAL'.padEnd(24)} ${String(tot.n).padStart(13)} ${String(tot.i).padStart(10)} ${String(tot.o).padStart(9)} ${String(tot.p).padStart(11)} ${String(tot.f).padStart(8)}`);
L('');
L('LO QUE EL DECRETO DA Y EL INSUMO NO GUARDA COMO CAMPO NUMERICO CON EL MISMO ROL:');
const conFalta = resumen.filter((r) => r.falta + r.otro + r.prosa > 0);
if (!conFalta.length) L('  (ninguna)');
for (const r of conFalta) {
  L(`  ${r.id}`);
  r.det.filter((d) => !d.estado.startsWith('MISMO')).forEach((d) => L(`      ${d.literal.padEnd(32)} ${d.quePide.padEnd(24)} ${d.estado}`));
}
L('');
L('SIN NINGUNA COORDENADA EN SU PARRAFO:');
const cero = resumen.filter((r) => r.n === 0);
L(cero.length ? '  ' + cero.map((r) => r.id).join(', ') : '  (ninguna)');
L(HR);
