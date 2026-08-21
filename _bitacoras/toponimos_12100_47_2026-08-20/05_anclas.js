// P5 - LAS ANCLAS GEOGRAFICAS DE LAS 39 ENTRADAS
// CRITERIO: 04_criterio_busqueda.txt secciones 2, 3, 9 y 10.
//   ancla primaria  = la bahia del catalogo con que la entrada calzo (34 de 39)
//   ancla respaldo  = cajon de vecinas (a) + geocodificar el nombre del puerto
//                     (b), y (b) tiene que caer dentro de (a).

const fs = require('fs'), path = require('path'), https = require('https');
const BA = require(path.join(__dirname, '_bahias_coords.json'));

// entrada -> bahia del catalogo. De 06_cruzar.txt del 2026-08-20, calce
// EXACTO y calce PROBABLE ACEPTADO. Los 6 rechazados NO estan aca.
const ANCLA = {
  1:71, 5:72, 6:195, 14:81, 23:91, 26:93, 27:103, 29:97, 32:100, 38:109, 43:129, 47:132,
  2:204, 9:75, 12:79, 13:80, 15:82, 18:84, 19:202, 20:85, 21:86, 24:92, 25:90,
  33:102, 34:101, 35:107, 36:118, 37:113, 40:121, 41:123, 42:126, 44:130, 46:135, 49:138,
};
// las CINCO sin bahia: cajon de vecinas + nombre del puerto a geocodificar
const RESPALDO = {
  3:  { puerto: 'Junín, Chile',       norte: 204, sur: 72 },
  4:  { puerto: 'Caleta Buena, Chile',norte: 204, sur: 72 },
  8:  { puerto: 'Tocopilla, Chile',   norte: 73,  sur: 75 },
  22: { puerto: 'Los Vilos, Chile',   norte: 86,  sur: 91 },
  28: { puerto: 'Tomé, Chile',        norte: 103, sur: 97 },
};

const UA = 'tmarea-backend/reconocimiento-toponimos (proyecto Tmarea, medicion puntual)';
const get = url => new Promise((res, rej) => {
  https.get(url, { headers: { 'User-Agent': UA } }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
  }).on('error', rej);
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const L = []; const say = s => { L.push(s); console.log(s); };
  say('P5 - LAS ANCLAS GEOGRAFICAS');
  say('='.repeat(78));
  say('CRITERIO: 04_criterio_busqueda.txt, secciones 2/3/9/10.');
  say('FUENTE de la coordenada de bahia: scripts/seed-bahias-sitport.js (162');
  say('  bahias con lat/lng). FUENTE del par entrada->bahia: 06_cruzar.txt del');
  say('  2026-08-20, calce exacto + calce probable ACEPTADO. Los 6 rechazados');
  say('  no entran: si la revision los mato, no pueden anclar nada.');
  say('');
  const out = {};

  say('ANCLA PRIMARIA - bahia del catalogo');
  say(`  entradas con ancla primaria : ${Object.keys(ANCLA).length} de 39`);
  for (const [n, b] of Object.entries(ANCLA)) {
    out[n] = { tipo: 'PRIMARIA', bahia: +b, lat: BA[b].lat, lon: BA[b].lng, nombre_bahia: BA[b].nombre, R_km: 25 };
  }
  say('');
  say('ANCLA DE RESPALDO - las CINCO sin bahia');
  say('  (a) cajon entre las anclas de la entrada anterior y la siguiente');
  say('  (b) Nominatim sobre el nombre del puerto, acotado a Chile');
  say('  REGLA: (b) tiene que caer dentro de (a). Si no cae, se descarta (b).');
  say('');
  for (const [n, r] of Object.entries(RESPALDO)) {
    const N = BA[r.norte], S = BA[r.sur];
    const cajon = { latN: Math.max(N.lat, S.lat), latS: Math.min(N.lat, S.lat),
                    lonW: Math.min(N.lng, S.lng), lonE: Math.max(N.lng, S.lng) };
    const altura = Math.abs(cajon.latN - cajon.latS) * 111;
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=' + encodeURIComponent(r.puerto);
    let geo = null, raw = '';
    try { raw = await get(url); const j = JSON.parse(raw); if (j.length) geo = { lat: +j[0].lat, lon: +j[0].lon, display: j[0].display_name, clase: j[0].class + '/' + j[0].type }; } catch (e) { }
    await sleep(1200); // politica de uso de Nominatim: 1 consulta/segundo
    // (c) EL CONTROL QUE FALTABA. Criterio seccion 11: la contencion en el
    // cajon NO alcanza cuando el borde del cajon ES el falso positivo.
    const fold = x => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    const nucleo = fold(r.puerto.split(',')[0].trim());
    const nombra = !!(geo && fold(geo.display).includes(nucleo));
    const claseOk = !!(geo && geo.clase.indexOf('highway/') !== 0);
    const enCajon = !!(geo && geo.lat <= cajon.latN && geo.lat >= cajon.latS && geo.lon >= cajon.lonW - 0.6 && geo.lon <= cajon.lonE + 0.6);
    const dentro = enCajon && nombra && claseOk;
    say(`  #${n} ${r.puerto}`);
    say(`     cajon (a): lat ${cajon.latS.toFixed(3)} .. ${cajon.latN.toFixed(3)}  (${altura.toFixed(0)} km de alto)  entre bahias ${r.norte} y ${r.sur}`);
    say(`     geocod (b): ${geo ? geo.lat.toFixed(4) + ' ' + geo.lon.toFixed(4) + '  [' + geo.clase + ']  ' + geo.display.slice(0, 64) : 'SIN RESULTADO'}`);
    say(`     (c1) cae en el cajon ............. ${geo ? (enCajon ? 'SI' : 'NO  <- RECHAZA') : '--'}`);
    say(`     (c2) el display NOMBRA al puerto . ${geo ? (nombra ? 'SI' : 'NO  <- RECHAZA') : '--'}`);
    say(`     (c3) la clase no es una calle .... ${geo ? (claseOk ? 'SI' : 'NO  <- RECHAZA') : '--'}`);
    say(`     VEREDICTO: ancla ${dentro ? 'PUNTUAL con R=25 km' : 'DEBIL: se busca el cajon entero'}`);
    say('');
    out[n] = dentro
      ? { tipo: 'RESPALDO_PUNTUAL', lat: geo.lat, lon: geo.lon, nombre_bahia: null, puerto: r.puerto, display: geo.display, R_km: 25, cajon }
      : { tipo: 'RESPALDO_DEBIL', cajon, puerto: r.puerto, R_km: null, geo };
  }

  const prim = Object.values(out).filter(a => a.tipo === 'PRIMARIA').length;
  const rp = Object.values(out).filter(a => a.tipo === 'RESPALDO_PUNTUAL').length;
  const rd = Object.values(out).filter(a => a.tipo === 'RESPALDO_DEBIL').length;
  say('EL REPARTO');
  say(`  PRIMARIA (bahia del catalogo) : ${prim} de 39`);
  say(`  RESPALDO PUNTUAL (b cayo en a): ${rp} de 39`);
  say(`  RESPALDO DEBIL (cajon entero) : ${rd} de 39`);
  say(`  suma: ${prim + rp + rd} de 39  ${prim + rp + rd === 39 ? 'OK' : 'ROJO'}`);
  say('');
  say('CONTROL POSITIVO DEL GEOCODIFICADOR: si las cinco consultas hubieran');
  say('devuelto lo mismo, o ninguna, el paso (b) no habria demostrado nada.');
  say(`  consultas con resultado : ${Object.values(out).filter(a => a.display || (a.geo)).length} de 5`);
  say(`  resultados distintos    : ${new Set(Object.values(out).map(a => a.display || (a.geo && a.geo.display)).filter(Boolean)).size}`);

  fs.writeFileSync(path.join(__dirname, 'anclas_39.json'), JSON.stringify(out, null, 1), 'utf8');
  fs.writeFileSync(path.join(__dirname, '05_anclas.txt'), L.join('\n') + '\n', 'utf8');
  say('');
  say('ESCRITO: anclas_39.json');
})();
