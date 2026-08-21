// P6b - REINTENTO DEL PASE 1 CONTRA OSM
//
// POR QUE EXISTE ESTE FICHERO: 06_buscar_osm.js corrio con 1,8 s entre
// consultas y overpass-api.de contesto 429 en la cuarta, y despues corto la
// conexion (http 0) en las 28 siguientes. 7 de 39 cajas quedaron traidas.
//
// ESO ES UN FALLO DE INSTRUMENTO, NO UN DATO. Si esas 32 cajas se hubieran
// leido como "no hay nada en la caja", la medicion habria reportado 32
// entradas sin candidatos que en realidad NUNCA SE CONSULTARON. Se deja
// escrito porque es exactamente la clase de cero que hay que sospechar.
//
// QUE CAMBIA:
//   - REANUDABLE: solo se piden las cajas que no tengan http 200 guardado.
//   - BACKOFF: 8 s entre consultas, y ante 429 o corte se espera 45 s y se
//     reintenta hasta 4 veces.
//   - TRES ESPEJOS en rotacion. Se declaran: son instancias distintas del
//     MISMO Overpass sobre la MISMA base OSM, asi que NO son tres fuentes.
//     Rotar reparte la carga, no agrega procedencia.

const fs = require('fs'), path = require('path'), https = require('https');
const AN = require(path.join(__dirname, 'anclas_39.json'));
const TT = require(path.join(__dirname, 'toponimos_39.json')).toponimos;
const F = path.join(__dirname, 'osm_crudo.json');
const crudo = JSON.parse(fs.readFileSync(F, 'utf8'));

const ESPEJOS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
const FILTROS = [
  'nwr["name"]["natural"~"^(cape|island|islet|rock|reef|peak|hill|bay|beach|spit|shoal|strait|coastline|water|bare_rock)$"]',
  'nwr["name"]["place"~"^(island|islet|locality|isolated_dwelling|village|hamlet)$"]',
  'nwr["name"]["man_made"~"^(lighthouse|beacon|pier|breakwater|quay|jetty)$"]',
  'nwr["name"]["seamark:type"]',
  'nwr["name"]["waterway"~"^(river|stream)$"]',
  'nwr["name"]["landuse"="cemetery"]',
  'nwr["name"]["amenity"="grave_yard"]',
  'nwr["name"]["bridge"]',
];
const UA = 'tmarea-backend/reconocimiento-toponimos (proyecto Tmarea, medicion puntual)';
const post = (url, body) => new Promise(res => {
  const req = https.request(url, { method: 'POST', timeout: 120000,
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' } },
    r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); });
  req.on('timeout', () => { req.destroy(); res({ status: 0, body: 'timeout' }); });
  req.on('error', e => res({ status: 0, body: String(e.message) }));
  req.write(body); req.end();
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
function bbox(a) {
  if (a.tipo === 'RESPALDO_DEBIL') { const c = a.cajon, m = 0.25;
    return [c.latS - m, Math.min(c.lonW, c.lonE) - m, c.latN + m, Math.max(c.lonW, c.lonE) + m]; }
  const dlat = a.R_km / 111, dlon = a.R_km / (111 * Math.cos(a.lat * Math.PI / 180));
  return [a.lat - dlat, a.lon - dlon, a.lat + dlat, a.lon + dlon];
}

(async () => {
  const entradas = [...new Set(TT.map(t => t.n))].sort((x, y) => x - y);
  const pendientes = entradas.filter(n => !(crudo[n] && crudo[n].http === 200));
  console.log(`cajas ya traidas: ${entradas.length - pendientes.length} de ${entradas.length}`);
  console.log(`pendientes: ${pendientes.join(',')}\n`);
  let e = 0;
  for (const n of pendientes) {
    const a = AN[n], b = bbox(a);
    const bb = `(${b[0].toFixed(5)},${b[1].toFixed(5)},${b[2].toFixed(5)},${b[3].toFixed(5)})`;
    const q = `[out:json][timeout:90];(${FILTROS.map(f => f + bb + ';').join('')});out center tags;`;
    let r = null, intento = 0;
    while (intento < 4) {
      const url = ESPEJOS[e % ESPEJOS.length]; e++;
      r = await post(url, 'data=' + encodeURIComponent(q));
      if (r.status === 200) break;
      intento++;
      console.log(`  #${n} intento ${intento} en ${url.split('/')[2]} -> http ${r.status}; espero 45 s`);
      await sleep(45000);
    }
    let els = [];
    if (r.status === 200) { try { els = JSON.parse(r.body).elements || []; } catch (x) { r.status = -1; } }
    crudo[n] = { bbox: b, ancla: a.tipo, alto_km: +((b[2] - b[0]) * 111).toFixed(1), http: r.status,
      espejo: ESPEJOS[(e - 1) % ESPEJOS.length].split('/')[2],
      elementos: els.map(x => ({ t: x.type, id: x.id,
        lat: x.lat != null ? x.lat : (x.center ? x.center.lat : null),
        lon: x.lon != null ? x.lon : (x.center ? x.center.lon : null),
        name: x.tags.name,
        clase: ['natural', 'place', 'man_made', 'seamark:type', 'waterway', 'landuse', 'amenity', 'bridge']
          .filter(k => x.tags[k]).map(k => k + '=' + x.tags[k]).join(','),
        source: x.tags.source || null })).filter(x => x.lat != null) };
    console.log(`#${n} ${String(crudo[n].elementos.length).padStart(4)} elem  http ${r.status}  ${crudo[n].espejo}`);
    fs.writeFileSync(F, JSON.stringify(crudo, null, 1), 'utf8'); // se guarda en cada vuelta
    await sleep(8000);
  }
  const ok = entradas.filter(n => crudo[n].http === 200);
  console.log(`\nCAJAS TRAIDAS: ${ok.length} de ${entradas.length}   elementos: ${ok.reduce((s, n) => s + crudo[n].elementos.length, 0)}`);
  const mal = entradas.filter(n => crudo[n].http !== 200);
  if (mal.length) console.log(`CAJAS QUE SIGUEN SIN TRAERSE: ${mal.join(',')}  -- NO son "sin candidatos"`);
})();
