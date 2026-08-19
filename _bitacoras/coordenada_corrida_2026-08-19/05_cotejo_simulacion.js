// ─────────────────────────────────────────────────────────────────────────────
// (a1) · PIEZA 5 · EL COTEJO QUE FALTABA — LA SIMULACIÓN DEL GATE CONTRA LO QUE
//                  DE VERDAD CORRIÓ
//
// POR QUE EXISTE ESTE INSTRUMENTO. En la PARADA 1 se publicó una tabla «E3
// HIPOTETICO» con el estado y la via que tendría cada uno de los once si se
// corregía la coordenada y se soltaba el ancla. Esa tabla NO salió de
// `f1_generar.js`: salió de una COPIA de su cascada, escrita al lado para poder
// contestar antes de tocar nada. Al ejecutar, CUATRO filas salieron con OTRO
// `estado` y OTRA `via` que los que la simulación había anunciado — y otras TRES
// difieren sólo en el ROTULO que la copia le puso a la `via`, con el mismo camino.
// Son SIETE lugares donde la copia no dice lo que dice el mecanismo, no cuatro.
//
// El `bahia_id` es idéntico en los once, así que la pieza no cambia de
// resultado. Pero el gate se commitea con una tabla que no es lo que pasó, y eso
// no puede quedar sin marca. Este instrumento mide la diferencia, la nombra y la
// explica.
//
// UNA SIMULACIÓN QUE COPIA UN MECANISMO NO ES ESE MECANISMO; SI SE PUBLICA SU
// RESULTADO, SE DECLARA CUÁL DE LOS DOS CORRIÓ.
//
// QUE COMPARA:
//   (A) LA SIMULACIÓN, reconstruida acá TAL COMO se corrió en la PARADA 1 — con
//       su defecto adentro, sin arreglarlo: la copia NO implementaba la rama del
//       MARGEN de `f1_generar.js`, que resuelve a `derivado_limpio` antes de
//       llegar a la cascada.
//   (B) LA EJECUCIÓN, leída del artefacto vigente `61bf7dc7…`, que sí salió de
//       `f1_generar.js`.
//
// NO ESCRIBE NADA. Sola lectura.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const BACK = 'C:/Users/katia/tmarea-backend';
const INS = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/insumos');
const SALIDA = path.join(__dirname, '05_cotejo_simulacion.txt');
const RUTA_JOIN = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');
const SHA_JOIN = '61bf7dc779f58d38e545f13f1d42c6c12c675f6fa3539c2bc4726d9b37479be1';
const IDS = [653, 654, 655, 656, 657, 658, 659, 660, 661, 662, 663];

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det ? ' · ' + det : ''));
  else { fallas.push(n); say('  x ROJO EXIGIDO Y NO SALIO · ' + n + (det ? ' · ' + det : '')); }
};
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const esc = s => String(s).replace(/[\u0000-\u001f\u007f-\u009f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const cerrar = () => {
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
  console.log('\n[evidencia] ' + SALIDA + ' · ' + fs.statSync(SALIDA).size + ' bytes');
  process.exit(fallas.length ? 2 : 0);
};

// ── LOS INSUMOS DE LA CASCADA — los mismos que usa f1_generar.js ────────────
const SRC = fs.readFileSync(path.join(BACK, 'src/routes/sitport-routes.js'), 'utf8');
const a = SRC.indexOf('const BAHIA_COORDS = {'), b = SRC.indexOf('\n};', a);
const BAHIA_COORDS = new Function(SRC.slice(a, b + 3) + '\n return BAHIA_COORDS;')();
const bcat = JSON.parse(fs.readFileSync(path.join(BACK, 'sondaje-sitport/bahias_sitport.json'), 'utf8')).recordsets[0];
const nombreBahia = new Map(bcat.map(x => [Number(x.IDBahia), String(x.NMBahia || '').trim()]));
for (const [id, c] of Object.entries(BAHIA_COORDS)) if (!nombreBahia.has(+id)) nombreBahia.set(+id, c.nombre || '');
const { getCapitaniaByBahiaId } = require(path.join(BACK, 'src/utils/capitanias'));

const RADIO = 30, MARGEN = 10, RAZON = 3;
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const piezas = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 3);
const R_T = 6371, rad = Math.PI / 180;
const km = (p, q) => {
  const dLa = (q.lat - p.lat) * rad, dLo = (q.lng - p.lng) * rad;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(p.lat * rad) * Math.cos(q.lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R_T * Math.asin(Math.sqrt(x));
};
const COORDS = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: +id, lat: c.lat, lng: c.lng }));
const vecinas = p => COORDS.map(c => ({ id: c.id, km: km(p, c) })).sort((x, y) => x.km - y.km);
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

// ── (A) LA SIMULACIÓN DE LA PARADA 1, CON SU DEFECTO ADENTRO ────────────────
// Va copiada tal como se corrió, SIN arreglarla: no tiene la rama del MARGEN y
// manda al desempate todo lo que no sea candidata única. Arreglarla acá haría
// desaparecer justo lo que este instrumento viene a medir.
function simulacionParada1(p) {
  const cand = vecinas(p).filter(x => x.km <= RADIO);
  if (cand.length === 0) return { estado: 'sin_bahia_en_catalogo', bahia_id: null, via: null };
  if (cand.length === 1) return { estado: 'derivado_limpio', bahia_id: cand[0].id, via: 'unica_en_radio' };
  for (const [n, fn] of CRITERIOS) { const g = fn(p, cand); if (g) return { estado: 'desempatado', bahia_id: g.id, via: n }; }
  return { estado: 'a_adjudicar', bahia_id: null, via: 'ningun_criterio' };
}

// ── (A') LA CASCADA DE f1_generar.js, COPIADA ENTERA — para aislar la causa ──
// Idéntica a la simulación salvo por las DOS líneas que le faltaban: la rama del
// MARGEN y el recorte del `empate` a los que están a menos de MARGEN del primero.
function cascadaCompleta(p) {
  const cand = vecinas(p).filter(x => x.km <= RADIO);
  if (cand.length === 0) return { estado: 'sin_bahia_en_catalogo', bahia_id: null, via: null };
  if (cand.length === 1 || cand[1].km - cand[0].km >= MARGEN) {
    return { estado: 'derivado_limpio', bahia_id: cand[0].id,
      via: cand.length === 1 ? 'unica_candidata_en_radio' : `margen_>=${MARGEN}km` };
  }
  const empate = cand.filter(x => x.km - cand[0].km < MARGEN);
  for (const [n, fn] of CRITERIOS) { const g = fn(p, empate); if (g) return { estado: 'desempatado', bahia_id: g.id, via: n }; }
  return { estado: 'a_adjudicar', bahia_id: null, via: null };
}

say('='.repeat(80));
say('(a1) · PIEZA 5 · LA SIMULACION DEL GATE CONTRA LA EJECUCION');
say('corrida ' + new Date().toISOString());
say('='.repeat(80));

say('\n0 · ESTADO');
exigir('el artefacto es el vigente 61bf7dc7...', sha256(RUTA_JOIN) === SHA_JOIN, sha256(RUTA_JOIN).slice(0, 12) + '...');
const ART = JSON.parse(fs.readFileSync(RUTA_JOIN, 'utf8'));
const M = new Map(ART.filas.map(f => [f.nodo_id, f]));
if (fallas.length) { say('\nNO SE MIDE NADA.'); cerrar(); }

say('\n1 · QUE CORRIO CADA UNO');
say('    (A) SIMULACION · publicada en la PARADA 1 como «E3 HIPOTETICO». Copia de la');
say('        cascada, escrita al lado de f1_generar.js para contestar ANTES de tocar');
say('        la base. Su reparto publicado fue:');
say('        {"derivado_limpio":1,"desempatado":7,"a_adjudicar":2,"sin_bahia_en_catalogo":1}');
say('    (B) EJECUCION  · f1_generar.js del arbol, blob del commit, sobre el volcado');
say('        de la base corregida. Es lo que esta en el artefacto vigente.');

say('\n2 · FILA POR FILA — los once');
say('nodo nombre                              | SIMULACION (A)                          | EJECUCION (B)                           | bahia');
say('-'.repeat(148));
const difEstado = [], difVia = [], difBahia = [];
const repA = {}, repB = {};
for (const id of IDS) {
  const f = M.get(id);
  const p = { lat: f.lat, lng: f.lng, comuna: f.comuna, provincia: f.provincia, nombre: f.nombre };
  const A = simulacionParada1(p);
  const B = { estado: f.estado, bahia_id: f.bahia_id, via: f.via };
  repA[A.estado] = (repA[A.estado] || 0) + 1;
  repB[B.estado] = (repB[B.estado] || 0) + 1;
  if (A.estado !== B.estado) difEstado.push(id);
  if (String(A.via) !== String(B.via)) difVia.push(id);
  if (A.bahia_id !== B.bahia_id) difBahia.push(id);
  const marca = (A.estado !== B.estado) ? '  <== DIFIERE' : '';
  say(String(id).padStart(4) + ' ' + esc(f.nombre).padEnd(36).slice(0, 36)
    + ' | ' + (A.estado + ' / ' + A.via).padEnd(39).slice(0, 39)
    + ' | ' + (B.estado + ' / ' + B.via).padEnd(39).slice(0, 39)
    + ' | ' + String(B.bahia_id).padStart(5) + marca);
}

say('\n3 · EL SALDO');
say('    reparto de la SIMULACION : ' + JSON.stringify(repA));
say('    reparto de la EJECUCION  : ' + JSON.stringify(repB));
exigir('la simulacion reproduce el reparto que la PARADA 1 publico',
  JSON.stringify(repA) === JSON.stringify({ derivado_limpio: 1, desempatado: 7, a_adjudicar: 2, sin_bahia_en_catalogo: 1 }),
  JSON.stringify(repA));
say('');
// LA `via` DIFIERE EN MAS FILAS QUE EL `estado`, Y NO SON LA MISMA COSA. En tres
// de ellas el camino es el mismo y lo que cambia es el ROTULO que la copia le puso:
// escribi `unica_en_radio` donde f1 escribe `unica_candidata_en_radio`, y
// `ningun_criterio` donde f1 deja `null`. Se separan, porque una diferencia de
// nombre y una diferencia de camino no se cuentan juntas.
const SINONIMOS = [['unica_en_radio', 'unica_candidata_en_radio'], ['ningun_criterio', 'null']];
const soloRotulo = difVia.filter(id => {
  const f = M.get(id);
  const A = simulacionParada1({ lat: f.lat, lng: f.lng, comuna: f.comuna, provincia: f.provincia, nombre: f.nombre });
  return A.estado === f.estado && SINONIMOS.some(([x, y]) => String(A.via) === x && String(f.via) === y);
});
const viaReal = difVia.filter(id => !soloRotulo.includes(id));
say('    filas donde difiere el `estado` ............... ' + difEstado.length + '   ' + difEstado.join(','));
say('    filas donde difiere la `via` .................. ' + difVia.length + '   ' + difVia.join(','));
say('        de esas, SOLO POR EL ROTULO de la copia ... ' + soloRotulo.length + '   ' + soloRotulo.join(','));
say('        de esas, por el CAMINO de verdad .......... ' + viaReal.length + '   ' + viaReal.join(','));
say('    filas donde difiere el `bahia_id` ............. ' + difBahia.length + (difBahia.length ? '   ' + difBahia.join(',') : ''));
exigir('EL bahia_id ES IDENTICO EN LOS ONCE — la atribucion no se movio', difBahia.length === 0, '0 de 11');
exigir('difieren CUATRO filas en el camino: mismo conjunto en estado y en via',
  difEstado.length === 4 && viaReal.length === 4 && difEstado.join(',') === viaReal.join(','),
  'estado ' + difEstado.join(',') + ' · via real ' + viaReal.join(','));
exigir('las otras TRES de `via` son solo el rotulo, con el mismo estado y la misma bahia',
  soloRotulo.length === 3, soloRotulo.join(','));
say('    LO QUE ESTO AGREGA A LA CUENTA: la simulacion no difiere en cuatro lugares sino');
say('    en SIETE — cuatro de camino y tres de nombre—. Los tres de nombre no cambian');
say('    nada y por eso son faciles de no ver, que es justo el motivo para contarlos.');

say('\n4 · LA CAUSA, AISLADA');
say('    `f1_generar.js` resuelve a `derivado_limpio` ANTES de llegar al desempate');
say('    cuando la segunda candidata esta a MARGEN o mas de la primera:');
say('        if (cand.length === 1 || cand[1].km - cand[0].km >= MARGEN)   // MARGEN = 10');
say('    La copia de la PARADA 1 NO tenia esa rama: mandaba al desempate todo lo que no');
say('    fuera candidata unica. Sobre esas cuatro filas, C2 —razon de distancia >= 3—');
say('    elegia la MISMA primera candidata, y por eso el `bahia_id` coincide.');
say('');
say('    la prueba de que la causa es esa y no otra: la cascada COMPLETA, copiada acá');
say('    con la rama del MARGEN puesta, tiene que reproducir la ejecucion en los once.');
let ig = 0; const noIg = [];
for (const id of IDS) {
  const f = M.get(id);
  const c = cascadaCompleta({ lat: f.lat, lng: f.lng, comuna: f.comuna, provincia: f.provincia, nombre: f.nombre });
  if (c.estado === f.estado && c.bahia_id === f.bahia_id && String(c.via) === String(f.via)) ig++; else noIg.push(id);
}
exigir('4-A · con la rama del MARGEN puesta, la copia reproduce la ejecucion 11/11',
  ig === 11, ig + '/11' + (noIg.length ? ' · difieren ' + noIg.join(',') : ''));
say('    LA DIFERENCIA ESTA ENTERA EN ESA RAMA. No hay un segundo defecto escondido.');

say('\n5 · LOS CUATRO, CON NOMBRE Y CON SU MARGEN');
for (const id of difEstado) {
  const f = M.get(id);
  const cand = vecinas({ lat: f.lat, lng: f.lng }).filter(x => x.km <= RADIO);
  say('    #' + id + ' ' + esc(f.nombre).padEnd(34).slice(0, 34)
    + ' primera ' + cand[0].id + '@' + cand[0].km.toFixed(2) + ' km · segunda ' + cand[1].id + '@' + cand[1].km.toFixed(2)
    + ' km · margen ' + (cand[1].km - cand[0].km).toFixed(2) + ' km >= 10');
  say('          simulacion decia `desempatado / C2_razon_distancia`; salio `derivado_limpio / margen_>=10km`. Bahia ' + f.bahia_id + ' en los dos.');
}

say('\n' + '='.repeat(80));
say(fallas.length ? fallas.length + ' FALLA(S)' : 'SIN FALLAS — la diferencia esta medida, nombrada y acotada.');
say('');
say('QUE SE CORRIGE DE LA PARADA 1: el reparto por `estado` de la tabla «E3 HIPOTETICO»');
say('era {derivado_limpio:1, desempatado:7, ...} y el real es {derivado_limpio:5,');
say('desempatado:3, ...}. Las dos cifras que esa tabla publicó como resultado —8 filas');
say('con bahia resuelta y 8 cierres devueltos— NO se mueven: dependen del `bahia_id`,');
say('que es identico en los once.');
say('');
say('UNA SIMULACION QUE COPIA UN MECANISMO NO ES ESE MECANISMO; SI SE PUBLICA SU');
say('RESULTADO, SE DECLARA CUAL DE LOS DOS CORRIO.');
say('='.repeat(80));
cerrar();
