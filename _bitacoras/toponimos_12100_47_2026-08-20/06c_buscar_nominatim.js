// P6c - PASE 1 ACOTADO Y PASE 2 SIN ACOTAR, CONTRA OSM POR NOMINATIM
//
// POR QUE EXISTE: Overpass quedo inaccesible. overpass-api.de dejo de conectar
// tras el rebote de 429 de 06_buscar_osm.js, y los dos espejos devuelven
// "Internal Server Error" HASTA PARA LA CONSULTA MAS TRIVIAL (node(id);out;),
// o sea que no es mi consulta: es el servicio. Quedaron 7 cajas de 39.
//
// Nominatim SI responde, es la MISMA base OSM, y acota con viewbox+bounded=1.
// Lo que se pierde respecto de Overpass es el volcado de la caja entera; eso
// lo cubre GeoNames, que esta ENTERO en local y no depende de ningun servicio.
//
// PASE 1: viewbox de la caja del ancla, bounded=1.
// PASE 2: para todo cero del pase 1, la MISMA consulta SIN acotar, sobre Chile.

const fs = require('fs'), path = require('path'), https = require('https');
const AN = require(path.join(__dirname, 'anclas_39.json'));
const TT = require(path.join(__dirname, 'toponimos_39.json')).toponimos;

const UA = 'tmarea-backend/reconocimiento-toponimos (proyecto Tmarea, medicion puntual)';
const get = url => new Promise(res => {
  const req = https.get(url, { headers: { 'User-Agent': UA }, timeout: 40000 }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d }));
  });
  req.on('timeout', () => { req.destroy(); res({ status: 0, body: '' }); });
  req.on('error', e => res({ status: 0, body: String(e.message) }));
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

function caja(a) {
  if (a.tipo === 'RESPALDO_DEBIL') { const c = a.cajon, m = 0.25;
    return { s: c.latS - m, n: c.latN + m, w: Math.min(c.lonW, c.lonE) - m, e: Math.max(c.lonW, c.lonE) + m }; }
  const dlat = a.R_km / 111, dlon = a.R_km / (111 * Math.cos(a.lat * Math.PI / 180));
  return { s: a.lat - dlat, n: a.lat + dlat, w: a.lon - dlon, e: a.lon + dlon };
}
const fila = j => ({ name: j.name || j.display_name.split(',')[0], display: j.display_name,
  lat: +j.lat, lon: +j.lon, clase: j.class + '/' + j.type, tipo_dir: j.addresstype || null });

(async () => {
  const F = path.join(__dirname, 'nominatim_crudo.json');
  const out = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : {};
  const conCadena = TT.filter(t => t.busqueda);
  console.log(`toponimos con cadena de busqueda: ${conCadena.length}`);

  // ---- PASE 1, ACOTADO ----
  for (const t of conCadena) {
    const k = t.n + '|' + t.cita;
    if (out[k] && out[k].p1 && out[k].p1.http === 200) continue;
    const c = caja(AN[t.n]);
    const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&countrycodes=cl'
      + '&bounded=1&viewbox=' + [c.w, c.n, c.e, c.s].map(x => x.toFixed(5)).join(',')
      + '&q=' + encodeURIComponent(t.busqueda);
    let r = await get(u), intento = 0;
    while (r.status !== 200 && intento < 3) { await sleep(20000); r = await get(u); intento++; }
    let j = []; try { j = JSON.parse(r.body); } catch (e) { }
    out[k] = out[k] || {};
    out[k].p1 = { http: r.status, n: j.length, res: j.map(fila) };
    process.stdout.write(`P1 #${t.n} ${String(j.length).padStart(2)}  "${t.busqueda}"\n`);
    fs.writeFileSync(F, JSON.stringify(out, null, 1), 'utf8');
    await sleep(1300);
  }

  // ---- PASE 2, SIN ACOTAR, solo para los ceros ----
  const ceros = conCadena.filter(t => out[t.n + '|' + t.cita].p1.n === 0);
  console.log(`\nPASE 2 - sin acotar, para los ${ceros.length} que dieron cero en el pase 1`);
  for (const t of ceros) {
    const k = t.n + '|' + t.cita;
    if (out[k].p2 && out[k].p2.http === 200) continue;
    const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=20&countrycodes=cl&q='
      + encodeURIComponent(t.busqueda);
    let r = await get(u), intento = 0;
    while (r.status !== 200 && intento < 3) { await sleep(20000); r = await get(u); intento++; }
    let j = []; try { j = JSON.parse(r.body); } catch (e) { }
    out[k].p2 = { http: r.status, n: j.length, res: j.map(fila) };
    process.stdout.write(`P2 #${t.n} ${String(j.length).padStart(2)}  "${t.busqueda}"\n`);
    fs.writeFileSync(F, JSON.stringify(out, null, 1), 'utf8');
    await sleep(1300);
  }

  const p1ok = conCadena.filter(t => out[t.n + '|' + t.cita].p1.http === 200).length;
  const conC = conCadena.filter(t => out[t.n + '|' + t.cita].p1.n > 0).length;
  console.log(`\nRESUMEN NOMINATIM`);
  console.log(`  consultas del pase 1 con http 200 : ${p1ok} de ${conCadena.length}`);
  console.log(`  con al menos un candidato acotado : ${conC} de ${conCadena.length}`);
  console.log(`  fueron al pase 2 sin acotar       : ${ceros.length}`);
  const p2conC = ceros.filter(t => out[t.n + '|' + t.cita].p2 && out[t.n + '|' + t.cita].p2.n > 0).length;
  console.log(`  de esos, con algo fuera de la caja: ${p2conC}  <- van a revision manual, no a "no encontrado"`);
})();
