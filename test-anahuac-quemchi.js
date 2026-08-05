'use strict';
// Verifica que la ruta Anahuac→Quemchi devuelve waypoints reales del raster
// (no simplemente los extremos conectados en línea recta).
//
// El propósito es confirmar que fetchTransitRestrictions recibe puntos
// navegables reales y no una interpolación en línea recta que puede cruzar
// tierra o pasar lejos de las bahías SITPORT relevantes.
//
// Coordenadas:
//   Anahuac / Puerto Montt: lat -41.486, lon -72.977
//   Puerto Quemchi (Chiloé): lat -42.1448, lon -73.4725

const { warmup, calcularRuta } = require('./src/services/raster-router-service');
const { construirPerfilCosto } = require('./src/config/perfiles-costo');

const w = warmup('AUSTRAL_N');
console.log(`warmup: ${w.ms}ms\n`);

const ANAHUAC = { lat: -41.48607231899996, lon: -72.97656408099994 };
const QUEMCHI = { lat: -42.1448, lon: -73.4725 };

function distNM(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Distancia de un punto [lon, lat] a la línea recta entre A y B (en nm)
function distPuntoALineaNM(lon, lat, lonA, latA, lonB, latB) {
  // t = proyección paramétrica sobre el segmento
  const dx = lonB - lonA;
  const dy = latB - latA;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distNM(lat, lon, latA, lonA);
  const t = Math.max(0, Math.min(1, ((lon - lonA) * dx + (lat - latA) * dy) / len2));
  return distNM(lat, lon, latA + t * dy, lonA + t * dx);
}

const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });
const t0 = Date.now();
const r = calcularRuta(perfil, ANAHUAC, QUEMCHI);
const ms = Date.now() - t0;

console.log('=== Anahuac → Puerto Quemchi ===');

if (!r.ok) {
  console.error(`FALLA: ruta falló (${r.error_code}: ${r.error}) en ${ms}ms`);
  process.exit(1);
}

const coords = r.tramos.flatMap((t) => t.coords);
console.log(`ok | ${ms}ms | ${r.distancia_mn}mn | ${r.tramos.length} tramo(s) | ${coords.length} waypoints`);

// 1 — La ruta debe tener waypoints intermedios (no solo los 2 extremos)
if (coords.length < 5) {
  console.error(`FALLA: solo ${coords.length} waypoints — se esperan ≥5 (ruta navegando por canales)`);
  process.exit(1);
}
console.log(`waypoints intermedios: ${coords.length} ≥ 5 ✓`);

// 2 — La distancia total debe ser razonable: Anahuac→Quemchi ~45-70mn
const distMin = 35, distMax = 100;
if (r.distancia_mn < distMin || r.distancia_mn > distMax) {
  console.error(`FALLA: distancia ${r.distancia_mn}mn fuera del rango esperado [${distMin}, ${distMax}]mn`);
  process.exit(1);
}
console.log(`distancia ${r.distancia_mn}mn en [${distMin}, ${distMax}]mn ✓`);

// 3 — Al menos un waypoint debe desviarse de la línea recta (≥ 2nm)
//     Esto distingue el trazado por canales reales de una interpolación lineal.
const UMBRAL_DESVIACION_NM = 2;
let maxDesviacion = 0;
for (const [lon, lat] of coords) {
  const d = distPuntoALineaNM(lon, lat, ANAHUAC.lon, ANAHUAC.lat, QUEMCHI.lon, QUEMCHI.lat);
  if (d > maxDesviacion) maxDesviacion = d;
}
console.log(`desviación máxima respecto a línea recta: ${maxDesviacion.toFixed(2)} nm`);
if (maxDesviacion < UMBRAL_DESVIACION_NM) {
  console.error(`FALLA: desviación ${maxDesviacion.toFixed(2)}nm < ${UMBRAL_DESVIACION_NM}nm — la ruta es casi línea recta`);
  process.exit(1);
}
console.log(`desviación ${maxDesviacion.toFixed(2)} nm ≥ ${UMBRAL_DESVIACION_NM} nm ✓`);

console.log('\n=> RUTA ANAHUAC → QUEMCHI: waypoints reales confirmados ✓');
