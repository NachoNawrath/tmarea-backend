#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e03join_cierre_34.js — pasada de cierre sobre las 34 que subieron al owner.
//
// Objetivo del owner: que ninguna quede como "sin resolver" a secas. Cada una
// queda con DONDE esta su respuesta, o con QUE habria que consultar.
//
// Agota lo que ya hay delante, en este orden, y se detiene en el primero que
// cierre — el orden es de mas literal a mas derivado:
//   I    el decreto NOMBRA el cuerpo o el accidente (cita textual)
//   II   el decreto lo encierra en un POLIGONO de vertices escritos (antartica)
//   III  el decreto declara una LINEA COMPARTIDA con la vecina y el punto cae
//        de un lado (el instrumento del caso Ancud)
//   IV   la BANDA de paralelos que el propio decreto escribe lo excluye
//   V    identidad del cuerpo de agua, admitiendo diferencia de GRAFIA — que es
//        criterio ya adjudicado en cotejo_lacustre_adjudicado.json
//
// Lo que NINGUNO de los cinco cierra sale agrupado por FUENTE A CONSULTAR.
//
// Uso:  node scripts/e03join_cierre_34.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const leer = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const H = t => { console.log(''); console.log('─'.repeat(78)); console.log(t); console.log('─'.repeat(78)); };

const insumo    = leer(path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json'));
const cotejo    = leer(path.join(RAIZ, 'data', 'decreto', 'cotejo_lacustre_adjudicado.json'));
const particion = leer(path.join(RAIZ, '_bitacoras', 'e03join_recon_2026-08-11', 'particion.json'));
const jurPorId  = new Map(insumo.jurisdicciones.map(j => [j.id, j]));

// Coordenadas desde la FUENTE, no desde el seed ni la tabla.
const coords = new Map();
{
  const txt = fs.readFileSync(path.join(RAIZ, 'src', 'routes', 'sitport-routes.js'), 'utf8');
  const bloque = txt.slice(txt.indexOf('const BAHIA_COORDS = {'));
  const re = /^\s*(\d+):\s*\{\s*lat:\s*(-?\d+(?:\.\d+)?),\s*lng:\s*(-?\d+(?:\.\d+)?)/gm;
  let m; while ((m = re.exec(bloque)) !== null) coords.set(Number(m[1]), { lat: Number(m[2]), lon: Number(m[3]) });
  if (coords.size < 160) throw new Error('BAHIA_COORDS: el parser no esta leyendo la fuente.');
}

// Topónimos del decreto que no traen coordenada en el texto y que se
// registraron con procedencia IGM en fase5S. Se citan, no se inventan.
const TOPONIMOS_IGM = {
  'Punta Harry':      { lat: -(52 + 43 / 60 + 1 / 3600), lon: -(70 + 34 / 60 + 17 / 3600), dms: '52 43 01 S / 070 34 17 W' },
  'Cabo San Vicente': { lat: -(52 + 46 / 60 + 49 / 3600), lon: -(70 + 25 / 60 + 57 / 3600), dms: '52 46 49 S / 070 25 57 W' },
  'Punta Anxious':    { lat: -(54 + 7 / 60 + 1 / 3600), lon: -(70 + 56 / 60 + 4 / 3600), dms: '54 07 01 S / 070 56 04 W' },
};

// ── Geometria minima, en grados proyectados a metros locales ────────────────
const M_LAT = 111132;
const mLon = lat => 111320 * Math.cos(lat * Math.PI / 180);
// Lado y distancia de un punto a una POLILINEA declarada. Devuelve el signo del
// producto cruz en el segmento mas cercano y la distancia en metros. El signo
// por si solo no dice nada: lo interpreta quien conoce que lado declaro cada
// jurisdiccion, y por eso se reporta junto con la distancia.
function ladoYDistancia(p, linea) {
  let mejor = null;
  for (let i = 0; i < linea.length - 1; i++) {
    const a = linea[i], b = linea[i + 1];
    const k = mLon((a.lat + b.lat) / 2);
    const ax = a.lon * k, ay = a.lat * M_LAT, bx = b.lon * k, by = b.lat * M_LAT;
    const px = p.lon * k, py = p.lat * M_LAT;
    const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    const t = Math.max(0, Math.min(1, (vx * wx + vy * wy) / (vx * vx + vy * vy)));
    const cx = ax + t * vx, cy = ay + t * vy;
    const d = Math.hypot(px - cx, py - cy);
    const cruz = vx * wy - vy * wx;
    if (!mejor || d < mejor.d) mejor = { d, signo: Math.sign(cruz), i };
  }
  return mejor;
}
const dentroPoligono = (p, poly) => {
  let dentro = false;
  for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
    const xi = poly[i].lon, yi = poly[i].lat, xk = poly[k].lon, yk = poly[k].lat;
    if ((yi > p.lat) !== (yk > p.lat) && p.lon < (xk - xi) * (p.lat - yi) / (yk - yi) + xi) dentro = !dentro;
  }
  return dentro;
};
// Distancia de edicion, para medir "diferencia de grafia" en vez de afirmarla.
function edicion(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

const LAS_34 = particion.bahias.filter(b => ['E', 'F', 'G'].includes(b.cajon));
console.log('='.repeat(78));
console.log('E0.3 — PASADA DE CIERRE SOBRE LAS 34');
console.log(`fecha: ${new Date().toISOString()}`);
console.log('='.repeat(78));
console.log(`bahias en la pasada: ${LAS_34.length} (cajones E, F y G del reconocimiento)`);

const cerradas = [], abiertas = [];
const cerrar = (b, instrumento, destino, cita) => cerradas.push({ b, instrumento, destino, cita });
const abrir  = (b, motivo, fuente, pregunta) => abiertas.push({ b, motivo, fuente, pregunta });

// ── I · El decreto lo nombra ────────────────────────────────────────────────
H('I. EL DECRETO LO NOMBRA — CITA TEXTUAL');

// Se busca el nombre de la bahia dentro del texto de cada jurisdiccion, token a
// token, y se exige que el token sea distintivo (no una palabra generica).
// 'PRIMERA' y 'SEGUNDA' NO son genericas: 'Primera Angostura' y 'Segunda
// Angostura' son dos accidentes distintos y confundirlos fue el primer falso
// positivo de esta pasada. 'CHILE' si lo es: aparece en "limite politico
// internacional Chile-Peru".
const GENERICO = new Set(['SECTOR', 'CANAL', 'BAHIA', 'ISLA', 'ISLAS', 'LAGO', 'LAGOS', 'PUERTO', 'CALETA', 'RIO', 'RIOS',
  'NORTE', 'SUR', 'ESTE', 'OESTE', 'WESTE', 'ORIENTE', 'DE', 'DEL', 'LA', 'EL', 'Y', 'LOS', 'LAS', 'PUNTA', 'CHILE']);
// Sustantivo con que arranca el nombre: 'RIO Palena' y 'LAGO Palena' no son el
// mismo accidente aunque compartan el token distintivo.
const CABEZA = /^(LAGO|LAGUNA|EMBALSE|RIO|CANAL|BAHIA|ISLA|ESTERO|SENO|PUERTO|CALETA|ENSENADA|FIORDO)\b/;
const nombresPorJur = new Map(insumo.jurisdicciones.map(j => [j.id, norm(j.texto_decreto)]));

// Para que una mencion CIERRE hacen falta tres cosas, y las tres se comprueban:
//   (1) TODOS los tokens distintivos del nombre aparecen en el mismo parrafo
//       — con uno solo, 'Primera Angostura' calzaba con 'Segunda Angostura';
//   (2) el sustantivo con que arranca el nombre coincide con el que el decreto
//       usa junto al token — con esto 'Rio Palena' deja de calzar con 'Lago
//       Palena', que es otro accidente y esta a 60 km;
//   (3) el parrafo es UNO solo.
function mencionesDe(nombreBahia) {
  const limpio = norm(nombreBahia).replace(/[()'-]/g, ' ');
  const cabeza = (CABEZA.exec(limpio) || [null])[0];
  const toks = limpio.split(/\s+/).filter(t => t.length > 3 && !GENERICO.has(t));
  if (toks.length === 0) return [];
  const hits = [];
  for (const [id, texto] of nombresPorJur) {
    const palabras = texto.replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    const encontrados = toks.map(t => {
      const i = palabras.indexOf(t);
      if (i >= 0) return { t, i, como: 'exacta' };
      const j = palabras.findIndex(p => p.length > 4 && Math.abs(p.length - t.length) <= 2 && edicion(p, t) <= 1);
      return j >= 0 ? { t, i: j, como: `grafia (${palabras[j]})` } : null;
    });
    if (encontrados.some(e => e === null)) continue;
    // (2) el sustantivo de cabeza, si el nombre lo trae, tiene que estar junto
    // al token en el texto del decreto. 'LAGOS' cuenta como 'LAGO'.
    if (cabeza) {
      const previa = (palabras[encontrados[0].i - 1] || '').replace(/S$/, '');
      if (previa && previa !== cabeza.replace(/S$/, '') && CABEZA.test(previa)) continue;
    }
    hits.push({ id, token: toks.join('+'), como: encontrados.map(e => e.como).join(', ') });
  }
  return hits;
}

for (const b of LAS_34) {
  const hits = mencionesDe(b.nombre_sitport);
  if (hits.length !== 1) continue;
  const j = jurPorId.get(hits[0].id);
  const frag = /[^.]*\b[^.]*\./.exec(j.texto_decreto.slice(Math.max(0, norm(j.texto_decreto).indexOf(hits[0].token.slice(0, 5)) - 80))) || [''];
  cerrar(b, `I · el decreto la nombra (${hits[0].como})`, hits[0].id, `${j.nombre}: "...${j.texto_decreto.slice(Math.max(0, norm(j.texto_decreto).indexOf(norm(hits[0].token)) - 60), norm(j.texto_decreto).indexOf(norm(hits[0].token)) + 60).trim()}..."`);
  console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} -> ${hits[0].id}   [${hits[0].como} sobre '${hits[0].token}']`);
}
console.log(`  cerradas por mencion literal: ${cerradas.length}`);

// ── II · Poligono de vertices escritos (antartica) ──────────────────────────
H('II. EL DECRETO LO ENCIERRA EN UN POLIGONO DE VERTICES ESCRITOS');

const antarticas = insumo.jurisdicciones.filter(j => j.ambito === 'antartica' && j.contorno && j.contorno.length >= 3);
console.log(`jurisdicciones antarticas con contorno escrito: ${antarticas.length}`);
for (const b of LAS_34) {
  if (cerradas.some(c => c.b.id === b.id)) continue;
  const p = coords.get(b.id); if (!p) continue;
  const dentro = antarticas.filter(j => dentroPoligono(p, j.contorno));
  if (dentro.length === 1) {
    cerrar(b, 'II · cae dentro del poligono de vertices que el decreto escribe', dentro[0].id, `${dentro[0].nombre}: "${dentro[0].texto_decreto}"`);
    console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} (${p.lat}, ${p.lon}) -> ${dentro[0].id}`);
  } else if (dentro.length > 1) {
    console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} cae en ${dentro.length} poligonos: ${dentro.map(d => d.id).join(', ')}`);
  } else if (p.lat < -55) {
    console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} (${p.lat}, ${p.lon}) NO cae en ninguno de los cuatro`);
  }
}

// ── III · Linea compartida con la vecina (el instrumento de Ancud) ──────────
H('III. LINEA COMPARTIDA DECLARADA — EL INSTRUMENTO DEL CASO ANCUD');

// Cada entrada declara: la polilinea, de donde sale, y que jurisdiccion queda
// de cada lado SEGUN EL TEXTO. El signo se calcula; la lectura del lado es del
// decreto, no del codigo.
const LINEAS = [
  {
    nombre: 'linea que divide el Canal Moraleda',
    cita: 'melinka: "Por el Este la linea imaginaria que divide el Canal Moraleda entre los siguientes puntos..." · puerto_cisnes: "Por el Weste la linea imaginaria que divide el Canal Moraleda entre los siguientes puntos..."',
    linea: jurPorId.get('melinka').contorno.map(c => ({ lat: c.lat, lon: c.lon })),
    oeste: 'melinka', este: 'puerto_cisnes',
    lat_min: -44.781667, lat_max: -43.740278,
    // Caso de calibracion del signo, adentro del script: la bahia 124 se llama
    // MELINKA y esta al Weste de la linea. Si el signo se invirtiera, esto
    // revienta en vez de dar 33 atribuciones espejadas en silencio.
    calibracion: { id: 124, lado: 'melinka' },
  },
  {
    nombre: 'linea Cayo Blanco - Punta San Andres - Puerto Perez - Islote Rodriguez - Isla Traiguen',
    cita: 'puerto_aguirre: "Por el Norte el paralelo 44 46 54 S hasta el Islote Cayo Blanco y desde este punto la linea imaginaria que une los siguientes puntos..." · puerto_chacabuco cita la MISMA linea por su Norte',
    linea: jurPorId.get('puerto_aguirre').contorno.map(c => ({ lat: c.lat, lon: c.lon })),
    oeste: 'puerto_aguirre', este: 'puerto_cisnes',
    lat_min: -45.463333, lat_max: -44.781667,
  },
  {
    nombre: 'meridiano 073 15 00 W entre los paralelos 43 00 30 S y 43 44 25 S',
    cita: 'quellon: "...hasta su interseccion con la Longitud 073 15 00 W, luego hacia el Sur por este Meridiano hasta la Latitud 43 44 25 S, y desde alli hacia el Weste" · chaiten: "...siguiendo el paralelo 43 00 30 S hacia el Weste hasta su interseccion con el Meridiano 073 15 00 W, luego hacia el Sur hasta el Paralelo 43 44 25 S y desde alli hacia el Este"',
    linea: [{ lat: -43.008333, lon: -73.25 }, { lat: -43.740278, lon: -73.25 }],
    oeste: 'quellon', este: 'chaiten',
    lat_min: -43.740278, lat_max: -43.008333,
  },
  {
    nombre: 'linea Punta Harry - Cabo San Vicente (Segunda Angostura)',
    cita: 'punta_arenas: "...hasta la linea imaginaria que une Punta Harry con Cabo San Vicente, en la Segunda Angostura del Estrecho de Magallanes" · punta_delgada: "El Estrecho de Magallanes desde la linea imaginaria que une punta Harry y Cabo San Vicente, hasta el limite maritimo internacional por el Oriente". Coordenadas de los dos topónimos: IGM, registradas en fase5S.',
    linea: [TOPONIMOS_IGM['Punta Harry'], TOPONIMOS_IGM['Cabo San Vicente']],
    oeste: 'punta_arenas', este: 'punta_delgada',
    lat_min: -53.5, lat_max: -52.0,
  },
  {
    nombre: 'linea Cabo San Vicente - Punta Anxious',
    cita: 'tierra_del_fuego: "El area oriental de la linea imaginaria que une Cabo San Vicente por el Norte, hasta Punta Anxius por el Sur". Coordenadas: IGM, fase5S (el decreto escribe "Anxius" y la capa trae "Anxious": diferencia de grafia registrada).',
    linea: [TOPONIMOS_IGM['Cabo San Vicente'], TOPONIMOS_IGM['Punta Anxious']],
    oeste: 'punta_arenas', este: 'tierra_del_fuego',
    lat_min: -54.2, lat_max: -52.7,
  },
];

const AL_FILO_M = 2000; // menos de 2 km de la linea: no lo cierra la geometria.

// El signo del producto cruz se CALIBRA contra un caso conocido en vez de
// razonarse. Con la polilinea orientada N->S, el signo negativo resulto ser el
// Weste; si algun dia se invierte, la asercion de abajo lo caza.
const LADO_DE = (L, signo) => (signo < 0 ? L.oeste : L.este);
for (const L of LINEAS) {
  if (!L.calibracion) continue;
  const p = coords.get(L.calibracion.id);
  const r = ladoYDistancia(p, L.linea);
  if (LADO_DE(L, r.signo) !== L.calibracion.lado) {
    throw new Error(`calibracion del signo rota en '${L.nombre}': la bahia ${L.calibracion.id} deberia dar ` +
      `'${L.calibracion.lado}' y da '${LADO_DE(L, r.signo)}'. Con el signo invertido esta pasada espeja todas ` +
      `sus atribuciones sin avisar.`);
  }
  console.log(`  calibracion OK en '${L.nombre}': la bahia ${L.calibracion.id} cae en ${L.calibracion.lado}.`);
}

// Una linea corta NO se extiende para juzgar un punto lejano: se aplica solo
// cuando el punto queda estrictamente MAS ALLA de los dos extremos en longitud.
// Asi el veredicto no depende de prolongar un trazo de 12 km por 60.
for (const L of LINEAS) {
  console.log('');
  console.log(`  ${L.nombre}`);
  console.log(`    ${L.oeste} al Weste · ${L.este} al Este`);
  const lonMin = Math.min(...L.linea.map(q => q.lon)), lonMax = Math.max(...L.linea.map(q => q.lon));
  for (const b of LAS_34) {
    if (cerradas.some(c => c.b.id === b.id)) continue;
    const p = coords.get(b.id); if (!p) continue;
    if (p.lat > L.lat_max || p.lat < L.lat_min) continue;
    const r = ladoYDistancia(p, L.linea);
    const lado = LADO_DE(L, r.signo);
    const filo = r.d < AL_FILO_M;
    const esMeridiano = lonMin === lonMax;
    const robusto = esMeridiano || p.lon < lonMin || p.lon > lonMax;
    const motivo = filo ? 'AL FILO: a menos de 2 km de la linea'
      : !robusto ? 'NO ROBUSTO: la longitud cae entre los extremos de la linea, o sea que el veredicto depende de como se prolongue'
      : null;
    console.log(`    ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} (${p.lat}, ${p.lon})  ${(r.d / 1000).toFixed(2)} km  -> ${lado}${motivo ? `   *** ${motivo} ***` : ''}`);
    if (motivo) continue;
    // Exclusion adicional declarada: tierra_del_fuego describe "el area
    // oriental de la linea que une Cabo San Vicente por el NORTE hasta Punta
    // Anxius por el Sur". Un punto al Norte del propio Cabo San Vicente no
    // puede estar en el area oriental de una linea que ahi empieza.
    if (lado === 'punta_delgada' && p.lat > TOPONIMOS_IGM['Cabo San Vicente'].lat) {
      cerrar(b, `III · al Este de la ${L.nombre} (${(r.d / 1000).toFixed(2)} km) y al Norte de Cabo San Vicente, donde arranca la linea de tierra_del_fuego`, lado,
        `${L.cita}  ||  tierra_del_fuego queda excluida: "El area oriental de la linea imaginaria que une Cabo San Vicente por el Norte, hasta Punta Anxius por el Sur" arranca en ${TOPONIMOS_IGM['Cabo San Vicente'].dms}, al Sur de esta bahia.`);
    } else if (lado === 'punta_delgada') {
      console.log(`         (queda abierta: al Sur de Cabo San Vicente compiten punta_delgada y tierra_del_fuego, y las dos son "al Este")`);
    } else {
      cerrar(b, `III · cae al ${lado === L.oeste ? 'Weste' : 'Este'} de la ${L.nombre}, a ${(r.d / 1000).toFixed(2)} km`, lado, L.cita);
    }
  }
}

// ── IV · La banda de paralelos excluye ──────────────────────────────────────
H('IV. LA BANDA DE PARALELOS QUE EL DECRETO ESCRIBE');

const conBanda = insumo.jurisdicciones.filter(j =>
  j.limite_norte && Number.isFinite(j.limite_norte.dec) && j.limite_sur && Number.isFinite(j.limite_sur.dec));
for (const b of LAS_34) {
  if (cerradas.some(c => c.b.id === b.id)) continue;
  const p = coords.get(b.id); if (!p) continue;
  const candidatos = [b.capitania_mapa, b.capitania_sitport].filter(Boolean).map(norm);
  const esCandidato = j => candidatos.some(c => norm(j.nombre) === c || norm(j.nombre).replace(/^(PUERTO|LAGO) /, '') === c);
  // Los DOS candidatos tienen que declarar banda. Si uno no la declara, que el
  // otro contenga al punto no excluye a nadie: no hay con que excluirlo. Sin
  // esta guarda, la bahia 137 salia "cerrada" a punta_arenas solo porque
  // tierra_del_fuego no escribe paralelos — que es justo lo que la deja abierta.
  const candidatosConBanda = conBanda.filter(esCandidato);
  if (candidatosConBanda.length < 2) continue;
  const cont = candidatosConBanda.filter(j => j.limite_norte.dec >= p.lat && p.lat >= j.limite_sur.dec);
  if (cont.length === 1) {
    cerrar(b, `IV · de los dos candidatos, la banda del decreto solo contiene a este (lat ${p.lat})`, cont[0].id,
      `${cont[0].nombre}: "${cont[0].texto_decreto.slice(0, 150)}..."`);
    console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} lat ${String(p.lat).padStart(9)} -> ${cont[0].id}  (el otro candidato queda fuera de su propia banda)`);
  }
}

// ── V · Identidad del cuerpo de agua, admitiendo grafia ─────────────────────
H('V. IDENTIDAD DEL CUERPO DE AGUA, ADMITIENDO DIFERENCIA DE GRAFIA');
console.log('El criterio de grafia NO se inventa aca: cotejo_lacustre_adjudicado.json ya lo');
console.log('usa adjudicado ("Caburgua/Caburga y Pullinque/Pullingue son diferencias de');
console.log('grafia"). Se mide la distancia de edicion en vez de afirmar el parecido.');
console.log('');
const cuerpos = [];
for (const j of cotejo.jurisdicciones) for (const cu of j.cuerpos) cuerpos.push({ jur: j.id, nombre: norm(cu.nombre_decreto), fragmento: cu.fragmento_decreto });
for (const b of LAS_34) {
  if (cerradas.some(c => c.b.id === b.id)) continue;
  const n = norm(b.nombre_sitport).replace(/^(LAGO|LAGUNA|EMBALSE|RIO) /, '').replace(/ SECTOR .*/, '');
  const hits = cuerpos.map(c => ({ ...c, d: edicion(c.nombre.replace(/^(LAGO|LAGUNA|EMBALSE|RIO) /, ''), n) })).filter(c => c.d <= 2);
  const jurs = [...new Set(hits.map(h => h.jur))];
  if (jurs.length === 1) {
    const h = hits.sort((a, x) => a.d - x.d)[0];
    cerrar(b, `V · identidad del cuerpo de agua (distancia de edicion ${h.d})`, h.jur, `${jurPorId.get(h.jur).nombre}: "${jurPorId.get(h.jur).texto_decreto}"`);
    console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} ~ "${h.nombre}" (edicion ${h.d}) -> ${h.jur}`);
  } else if (jurs.length > 1) {
    console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} el cuerpo lo nombran ${jurs.length}: ${jurs.join(', ')}`);
  }
}

// ── VI · Contorno cerrado escrito, fuera de la Antartica ───────────────────
H('VI. CONTORNO CERRADO ESCRITO EN EL DECRETO (no solo el antartico)');
const cerrados = insumo.jurisdicciones.filter(j => j.contorno_cerrado === true && j.contorno && j.contorno.length >= 3);
console.log(`jurisdicciones con contorno declarado cerrado: ${cerrados.length} -> ${cerrados.map(j => j.id).join(', ')}`);
for (const b of LAS_34) {
  if (cerradas.some(c => c.b.id === b.id)) continue;
  const p = coords.get(b.id); if (!p) continue;
  const dentro = cerrados.filter(j => dentroPoligono(p, j.contorno));
  if (dentro.length === 1) {
    cerrar(b, 'VI · cae dentro del contorno cerrado que el decreto escribe', dentro[0].id, `${dentro[0].nombre}: "${dentro[0].texto_decreto.slice(0, 240)}..."`);
    console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} -> ${dentro[0].id}`);
  }
}

// ── VII · Ninguna de las dos candidatas: que dice el RESTO del decreto ──────
H('VII. CUANDO NINGUNA CANDIDATA LA CONTIENE — QUE DICE EL RESTO DEL DECRETO');
console.log('Las candidatas son las que proponen el mapa y SITPORT. Que ninguna de las dos');
console.log('contenga al punto no deja la bahia sin respuesta: deja sin respuesta a las dos');
console.log('fuentes operativas. La pregunta correcta es cual jurisdiccion del decreto SI la');
console.log('contiene, aunque no la haya propuesto nadie.');
console.log('');
for (const b of LAS_34) {
  if (cerradas.some(c => c.b.id === b.id)) continue;
  const p = coords.get(b.id); if (!p) continue;
  const contienen = conBanda.filter(j => j.limite_norte.dec >= p.lat && p.lat >= j.limite_sur.dec);
  const nombres = contienen.map(j => j.id);
  console.log(`  ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} lat ${String(p.lat).padStart(9)} lon ${String(p.lon).padStart(9)}`);
  console.log(`       jurisdicciones cuya banda declarada la contiene: ${nombres.length ? nombres.join(', ') : 'NINGUNA'}`);
  // GUARDA: una candidata que el decreto define SIN paralelos no queda excluida
  // porque otra tenga banda. Sin esto, la 90 (Isla Robinson Crusoe, a 670 km de
  // la costa) cerraba en san_antonio por compartir latitud, y la 137 cerraba en
  // punta_arenas solo porque tierra_del_fuego no escribe paralelos. La latitud
  // no atribuye: excluye, y solo excluye a quien declaro una banda.
  const candidatasJur = [b.capitania_mapa, b.capitania_sitport].filter(Boolean)
    .map(c => insumo.jurisdicciones.find(j => norm(j.nombre) === norm(c) || norm(j.nombre).replace(/^(PUERTO|LAGO) /, '') === norm(c)))
    .filter(Boolean);
  const sinBanda = candidatasJur.filter(j => !conBanda.includes(j));
  if (sinBanda.length) {
    console.log(`       NO CIERRA: la candidata '${sinBanda.map(j => j.id).join(', ')}' no declara paralelos, asi que la banda de otra no la excluye.`);
    continue;
  }
  if (contienen.length === 1) {
    cerrar(b, 'VII · es la UNICA jurisdiccion del decreto cuya banda declarada contiene el punto', contienen[0].id,
      `${contienen[0].nombre}: "${contienen[0].texto_decreto.slice(0, 240)}..."`);
    console.log(`       -> CIERRA en ${contienen[0].id}: es la unica`);
  }
}

// ── Cierre ──────────────────────────────────────────────────────────────────
H('RESULTADO DE LA PASADA');
const idsCerradas = new Set(cerradas.map(c => c.b.id));
const sinCerrar = LAS_34.filter(b => !idsCerradas.has(b.id));
console.log(`  cerradas con lo que ya habia delante : ${cerradas.length} de ${LAS_34.length}`);
console.log(`  siguen abiertas                      : ${sinCerrar.length}`);
console.log('');
console.log('  CERRADAS:');
for (const c of cerradas.sort((a, b) => a.b.id - b.b.id)) {
  console.log(`   ${String(c.b.id).padStart(3)} ${c.b.nombre_sitport.padEnd(34)} -> ${String(c.destino).padEnd(20)} ${c.instrumento}`);
  console.log(`        cita: ${c.cita.slice(0, 220)}`);
  const coincide = c.b.capitania_sitport && (norm(jurPorId.get(c.destino).nombre) === norm(c.b.capitania_sitport) || norm(jurPorId.get(c.destino).nombre).replace(/^(PUERTO|LAGO) /, '') === norm(c.b.capitania_sitport));
  console.log(`        SITPORT dice ${c.b.capitania_sitport || '—'} · ${coincide ? 'CORROBORA' : 'NO corrobora'} · el mapa dice ${c.b.capitania_mapa == null ? '(null)' : c.b.capitania_mapa}`);
}
console.log('');
console.log('  SIGUEN ABIERTAS:');
for (const b of sinCerrar) {
  const p = coords.get(b.id);
  console.log(`   ${String(b.id).padStart(3)} ${b.nombre_sitport.padEnd(34)} (${p ? `${p.lat}, ${p.lon}` : 's/coord'})  mapa=${b.capitania_mapa == null ? '(null)' : b.capitania_mapa}  sitport=${b.capitania_sitport || '—'}`);
}

fs.writeFileSync(path.join(RAIZ, '_bitacoras', 'e03join_cierre_2026-08-11', 'cierre.json'),
  JSON.stringify({ generado: new Date().toISOString(), cerradas: cerradas.map(c => ({ id: c.b.id, nombre: c.b.nombre_sitport, destino: c.destino, instrumento: c.instrumento, cita: c.cita })), abiertas: sinCerrar.map(b => ({ id: b.id, nombre: b.nombre_sitport, mapa: b.capitania_mapa, sitport: b.capitania_sitport, coord: coords.get(b.id) || null })) }, null, 2) + '\n', 'utf8');

console.log('');
console.log('='.repeat(78));
console.log('FIN DE LA PASADA — no se modifico ningun dato ni servicio.');
console.log('='.repeat(78));
