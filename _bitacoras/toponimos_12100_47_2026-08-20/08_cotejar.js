// P8 - EL COTEJO: candidatos de las fuentes, listos para revision manual
// CRITERIO: 04_criterio_busqueda.txt, pases 1 y 2, y las cinco V.
//
// ESTE FICHERO NO VERIFICA NADA. Arma la mesa. El veredicto es de 09, a mano.
//
// TRES ENTRADAS DE DATOS, y NO son tres fuentes:
//   OSM via Overpass  - 7 cajas de 39 (el resto no se pudo, ver PROCEDENCIA)
//   OSM via Nominatim - las 73 consultas, acotadas y sin acotar
//     ^ las dos son LA MISMA BASE OSM. Cuentan como UNA procedencia.
//   GeoNames CL       - dump local completo. LA SEGUNDA procedencia.
//
// Y el volcado de CAJA ENTERA del pase 2 sale de GeoNames, que esta en local
// y no depende de ningun servicio: es lo unico que caza el cuarto modo de
// falla del 2026-08-20, otro nombre para el mismo lugar.

const fs = require('fs'), path = require('path');
const AN = require(path.join(__dirname, 'anclas_39.json'));
const TT = require(path.join(__dirname, 'toponimos_39.json')).toponimos;
const OSM = require(path.join(__dirname, 'osm_crudo.json'));
const GN = require(path.join(__dirname, 'geonames_crudo.json'));
const NOM = require(path.join(__dirname, 'nominatim_crudo.json'));

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const GEN = /^(PUNTAS?|ISLAS?|ISLOTES?|ROCAS?|PIEDRA|MORRO|CERRO|FARO|BALIZA|BOYA|CALETA|CANAL|MUELLE|RIO|PUENTE|PENINSULA|BANCO|BAHIA|EL|LA|LOS|LAS|DE|DEL)\s+/;
function nucleo(s) { let x = fold(s); let p; do { p = x; x = x.replace(GEN, ''); } while (x !== p); return x || fold(s); }
function dkm(a, b, c, d) { const t = Math.PI / 180, x = (c - a) * t, y = (d - b) * t;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(y / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)); }
function anclaPt(a) { return a.tipo === 'RESPALDO_DEBIL'
  ? { lat: (a.cajon.latN + a.cajon.latS) / 2, lon: (a.cajon.lonW + a.cajon.lonE) / 2 } : { lat: a.lat, lon: a.lon }; }

const L = []; const say = s => L.push(s);
say('P8 - EL COTEJO: CANDIDATOS PARA LA REVISION MANUAL');
say('='.repeat(78));
say('ESTE FICHERO NO VERIFICA NADA. Arma la mesa para el veredicto de 09.');
say('PROCEDENCIA de cada fuente, su vocabulario y sus fallos: PROCEDENCIA.md');
say('DOS PROCEDENCIAS, no tres: Overpass y Nominatim son la misma base OSM.');
say('');

const salida = {};
for (const t of TT) {
  const clave = t.n + '|' + t.cita;
  if (!t.busqueda) { salida[clave] = { sin_cadena: true, conjunto: t.conjunto, entrada: t.entrada, cita: t.cita }; continue; }
  const nu = nucleo(t.busqueda);
  const a = anclaPt(AN[t.n]);
  const caja = (OSM[t.n] && OSM[t.n].http === 200) ? OSM[t.n].elementos : null;
  const re = new RegExp('(^|\\s)' + nu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|\\s)');
  const cand = [];
  if (caja) {
    for (const e of caja) {
      const f = fold(e.name); const t1 = re.test(f), t2 = !t1 && f.includes(nu);
      if (t1 || t2) cand.push({ f: 'OSM-ovp', tier: t1 ? 'T1' : 'T2', name: e.name, clase: e.clase, lat: e.lat, lon: e.lon, src: e.source, d: dkm(a.lat, a.lon, e.lat, e.lon), pase: 1 });
    }
  }
  const nm = NOM[clave] || {};
  // TIERS PARA NOMINATIM. Nominatim NO devuelve coincidencias de cadena:
  // devuelve un RANKING. "punta Caldera" le saca Punta Zorro y Punta Frodden,
  // que no comparten una letra util con el nucleo. Contarlas como candidatos
  // de nombre INFLA el conteo de "encontrado" en el generador, que es donde
  // menos se nota. Se separan en tres niveles y el T3 se publica aparte:
  //   T1 el nucleo esta como palabra   T2 como subcadena   T3 NI SIQUIERA
  const tierDe = n => { const f = fold(n); return re.test(f) ? "T1" : (f.includes(nu) ? "T2" : "T3"); };
  for (const pase of [1, 2]) {
    const bloque = pase === 1 ? nm.p1 : nm.p2;
    for (const r of ((bloque && bloque.res) || []))
      cand.push({ f: "OSM-nom", tier: tierDe(r.name), name: r.name, clase: r.clase, lat: r.lat, lon: r.lon, display: r.display, d: dkm(a.lat, a.lon, r.lat, r.lon), pase });
  }
  const g = GN[clave] || { t1: [], t2: [], en_caja: 0 };
  for (const e of g.t1) cand.push({ f: 'GeoNames', tier: 'T1', name: e.name, clase: e.code, lat: e.lat, lon: e.lon, d: dkm(a.lat, a.lon, e.lat, e.lon), pase: 1 });
  for (const e of g.t2) cand.push({ f: 'GeoNames', tier: 'T2', name: e.name, clase: e.code, lat: e.lat, lon: e.lon, d: dkm(a.lat, a.lon, e.lat, e.lon), pase: 1 });
  cand.sort((x, y) => x.d - y.d);
  salida[clave] = { conjunto: t.conjunto, entrada: t.entrada, cita: t.cita, busqueda: t.busqueda, nucleo: nu,
    ejeA: t.A, ejeC: t.C, media: t.media, ancla: AN[t.n].tipo, R_km: AN[t.n].R_km,
    ancla_lat: a.lat, ancla_lon: a.lon,
    caja_overpass: caja ? caja.length : 'NO TRAIDA', gn_en_caja: g.en_caja,
    nom_p1: nm.p1 ? nm.p1.n : null, nom_p2: nm.p2 ? nm.p2.n : null, candidatos: cand };
}

for (const cj of ['A', 'B']) {
  const S = TT.filter(t => t.conjunto === cj && t.busqueda);
  const conC = S.filter(t => salida[t.n + '|' + t.cita].candidatos.some(c => c.tier !== 'T3'));
  say('='.repeat(78));
  say(`CONJUNTO ${cj} - ${S.length} toponimos con cadena de busqueda`);
  say('='.repeat(78));
  say(`  con al menos un candidato : ${conC.length} de ${S.length}`);
  say(`  sin ningun candidato      : ${S.length - conC.length} de ${S.length}`);
  say('');
  for (const t of S) {
    const s = salida[t.n + '|' + t.cita];
    const dentro = s.candidatos.filter(c => c.d <= 25).length;
    const t3 = s.candidatos.filter(c => c.tier === 'T3').length;
    say(`#${t.n} ${t.entrada}  ·  "${t.busqueda}"  [${t.ejeA || s.ejeA}]  nucleo="${s.nucleo}"`);
    say(`     ancla ${s.ancla} (${s.ancla_lat.toFixed(4)} ${s.ancla_lon.toFixed(4)})  ·  caja Overpass: ${s.caja_overpass}  ·  GeoNames en caja: ${s.gn_en_caja}  ·  Nominatim p1/p2: ${s.nom_p1}/${s.nom_p2 === null ? '-' : s.nom_p2}`);
    const conNombre = s.candidatos.filter(c => c.tier !== 'T3');
    if (!conNombre.length) { say(`     CANDIDATOS CON COINCIDENCIA DE NOMBRE: NINGUNO${s.candidatos.length ? '  (' + s.candidatos.length + ' T3 de puro ranking, se descartan de oficio)' : ' en ninguna fuente'}`); say(''); continue; }
    say(`     candidatos: ${s.candidatos.length}  (dentro de 25 km: ${dentro} · T3 sin coincidencia de nombre: ${t3})`);
    const vistos = new Set();
    for (const c of conNombre) {
      const k = c.name + '|' + c.lat.toFixed(3) + '|' + c.lon.toFixed(3);
      if (vistos.has(k)) continue; vistos.add(k);
      if (vistos.size > 8) { say(`     ... y ${conNombre.length - 8} mas`); break; }
      say(`     ${c.f.padEnd(9)} ${c.tier} p${c.pase} ${c.d.toFixed(1).padStart(6)} km  ${c.lat.toFixed(4)} ${c.lon.toFixed(4)}  ${String(c.clase).slice(0, 26).padEnd(26)} ${c.name}${c.src ? ' [src=' + c.src + ']' : ''}`);
    }
    say('');
  }
}

fs.writeFileSync(path.join(__dirname, 'candidatos.json'), JSON.stringify(salida, null, 1), 'utf8');
fs.writeFileSync(path.join(__dirname, '08_cotejar.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
