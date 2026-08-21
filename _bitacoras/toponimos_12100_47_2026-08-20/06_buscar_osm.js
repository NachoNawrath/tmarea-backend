// P6 - PASE 1 ACOTADO, CONTRA OSM POR OVERPASS
// CRITERIO: 04_criterio_busqueda.txt.
//
// DISENO: NO se consulta "un nombre" por vez. Se pide TODO lo nombrado de las
// clases relevantes dentro del bbox de cada entrada, UNA consulta por entrada,
// y el emparejamiento con los toponimos se hace DESPUES y en local.
//
// Por que asi y no una consulta por toponimo:
//   1. el plegado de acentos y la tolerancia de generico quedan bajo control
//      propio y auditables, en vez de dentro de un regex remoto;
//   2. un "no encontrado" queda respaldado por LA LISTA ENTERA de lo que si
//      hay en esa caja, que es evidencia de verdad y no un silencio;
//   3. 39 consultas en vez de 73, y mas amables con un servicio gratuito.

const fs = require('fs'), path = require('path'), https = require('https');
const AN = require(path.join(__dirname, 'anclas_39.json'));
const TT = require(path.join(__dirname, 'toponimos_39.json')).toponimos;

// EL VOCABULARIO DE LA CONSULTA, declarado. Todo lo que podria SER uno de los
// doce tipos de lugar del criterio, y nada mas.
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
const post = body => new Promise((res, rej) => {
  const req = https.request('https://overpass-api.de/api/interpreter',
    { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' } },
    r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); });
  req.on('error', rej); req.write(body); req.end();
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

function bbox(a) {
  if (a.tipo === 'RESPALDO_DEBIL') {
    const c = a.cajon, m = 0.25;
    return [c.latS - m, Math.min(c.lonW, c.lonE) - m, c.latN + m, Math.max(c.lonW, c.lonE) + m];
  }
  const dlat = a.R_km / 111, dlon = a.R_km / (111 * Math.cos(a.lat * Math.PI / 180));
  return [a.lat - dlat, a.lon - dlon, a.lat + dlat, a.lon + dlon];
}

(async () => {
  const entradas = [...new Set(TT.map(t => t.n))].sort((x, y) => x - y);
  const crudo = {};
  let total = 0, fallos = 0;
  for (const n of entradas) {
    const a = AN[n]; const b = bbox(a);
    const bb = `(${b[0].toFixed(5)},${b[1].toFixed(5)},${b[2].toFixed(5)},${b[3].toFixed(5)})`;
    const q = `[out:json][timeout:90];(${FILTROS.map(f => f + bb + ';').join('')});out center tags;`;
    let r;
    try { r = await post('data=' + encodeURIComponent(q)); } catch (e) { r = { status: 0, body: String(e) }; }
    let els = [];
    if (r.status === 200) { try { els = JSON.parse(r.body).elements || []; } catch (e) { fallos++; } }
    else fallos++;
    crudo[n] = {
      bbox: b, ancla: a.tipo, alto_km: +((b[2] - b[0]) * 111).toFixed(1), http: r.status,
      elementos: els.map(e => ({
        t: e.type, id: e.id,
        lat: e.lat != null ? e.lat : (e.center ? e.center.lat : null),
        lon: e.lon != null ? e.lon : (e.center ? e.center.lon : null),
        name: e.tags.name,
        clase: ['natural', 'place', 'man_made', 'seamark:type', 'waterway', 'landuse', 'amenity', 'bridge']
          .filter(k => e.tags[k]).map(k => k + '=' + e.tags[k]).join(','),
        source: e.tags.source || null,
      })).filter(e => e.lat != null),
    };
    total += crudo[n].elementos.length;
    process.stdout.write(`#${n} ${String(crudo[n].elementos.length).padStart(4)} elem  http ${r.status}  caja ${crudo[n].alto_km} km\n`);
    await sleep(1800);
  }
  fs.writeFileSync(path.join(__dirname, 'osm_crudo.json'), JSON.stringify(crudo, null, 1), 'utf8');
  console.log(`\nTOTAL elementos nombrados traidos: ${total}   consultas fallidas: ${fallos} de ${entradas.length}`);
})();
