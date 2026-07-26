'use strict';
/**
 * Test 2 (spec §10 v1.5): Canal Tenglo, dos corridas.
 *
 * Origen/destino NO son "Anahuac real" (eso ya se probo, esta del lado
 * exterior del canal). Se derivan del propio trazado de 39 puntos del
 * canal (tmarea_nodos_nauticos_v1.json, edge N-PM-01->N-PM-02): se toman
 * los dos extremos y se ubica un punto ~2km mas alla de cada uno, sobre
 * celda navegable, extrapolando la direccion del tramo final del canal
 * en cada punta.
 */
const proj4 = require('proj4');
const { warmup, calcularRuta } = require('./src/services/raster-router-service');
const { construirPerfilCosto } = require('./src/config/perfiles-costo');

const CRS = '+proj=tmerc +lat_0=0 +lon_0=-72 +k=0.9996 +x_0=500000 +y_0=10000000 +datum=WGS84 +units=m';

// path completo (lon, lat) del edge N-PM-01->N-PM-02, tmarea_nodos_nauticos_v1.json
const TENGLO_PATH = [
  [-72.9387607, -41.4776306], [-72.9391973, -41.4775993], [-72.9396349, -41.4775771],
  [-72.9400732, -41.477564], [-72.9405118, -41.4775602], [-72.9409504, -41.4775654],
  [-72.9413886, -41.4775798], [-72.9418262, -41.4776034], [-72.9422625, -41.4776361],
  [-72.9426973, -41.4776781], [-72.943131, -41.4777287], [-72.9435624, -41.4777888],
  [-72.9439911, -41.4778574], [-72.9444175, -41.4779354], [-72.9448404, -41.4780218],
  [-72.9452602, -41.4781176], [-72.9456762, -41.4782214], [-72.9460881, -41.4783343],
  [-72.9464958, -41.4784556], [-72.9468988, -41.4785855], [-72.9472967, -41.4787236],
  [-72.9476893, -41.4788701], [-72.9480764, -41.4790246], [-72.9484574, -41.4791873],
  [-72.9488326, -41.4793577], [-72.9519, -41.4814], [-72.9550928, -41.4836097],
  [-72.9567531, -41.4845179], [-72.9584134, -41.4854262], [-72.9584939, -41.4854399],
  [-72.9585744, -41.4854537], [-72.958657, -41.4854555], [-72.9587396, -41.4854531],
  [-72.9588243, -41.4854403], [-72.9589091, -41.485422], [-72.9589902, -41.4853934],
  [-72.9590714, -41.4853571], [-72.9593207, -41.4852378], [-72.9595701, -41.4851186],
];

function proyectar(lon, lat) {
  return proj4('EPSG:4326', CRS, [lon, lat]);
}
function desproyectar(x, y) {
  return proj4(CRS, 'EPSG:4326', [x, y]);
}

/**
 * Extrapola 2km mas alla del punto extremo, en la direccion del EJE
 * COMPLETO del canal (punto 0 -> punto final), no del tangente local
 * entre los ultimos 2 puntos -- esos quedan a ~30m entre si (curva de
 * salida), una base demasiado corta y ruidosa para fijar una direccion.
 */
function extrapolarEnEje(puntoExtremo, signo, distanciaM) {
  const [xA, yA] = proyectar(...TENGLO_PATH[0]);
  const [xB, yB] = proyectar(...TENGLO_PATH[TENGLO_PATH.length - 1]);
  const dx = xB - xA, dy = yB - yA;
  const norm = Math.hypot(dx, dy);
  const ux = (dx / norm) * signo, uy = (dy / norm) * signo;
  const [x0, y0] = proyectar(...puntoExtremo);
  const [lon, lat] = desproyectar(x0 + ux * distanciaM, y0 + uy * distanciaM);
  return { lon, lat };
}

// Origen: 2km ANTES del extremo Anahuac/PM (signo -1, contra el eje).
// Destino: 2km DESPUES del extremo paso (signo +1, siguiendo el eje).
const ORIGEN = extrapolarEnEje(TENGLO_PATH[0], -1, 2000);
const DESTINO = extrapolarEnEje(TENGLO_PATH[TENGLO_PATH.length - 1], 1, 2000);

console.log('Origen derivado (2km mas alla del extremo Anahuac/PM):', ORIGEN);
console.log('Destino derivado (2km mas alla del extremo paso, hacia Golfo de Ancud):', DESTINO);
console.log();

warmup('AUSTRAL_N');

// Distancia minima del camino a CUALQUIER punto del corredor de 39 puntos
// del canal (no solo al pixel mas angosto) -- una ruta puede usar el
// canal sin pasar por ese pixel exacto, especialmente tras el
// string-pulling.
function distanciaMinimaAlCanal(tramos) {
  let min = Infinity;
  for (const t of tramos) {
    for (const [lon, lat] of t.coords) {
      for (const [clon, clat] of TENGLO_PATH) {
        const d = Math.hypot(lon - clon, lat - clat) * 111320;
        if (d < min) min = d;
      }
    }
  }
  return min;
}

function correr(nombre, calado_m) {
  const perfil = construirPerfilCosto({ calado_m, licencia: 'PNM' });
  const t0 = Date.now();
  const r = calcularRuta(perfil, { lat: ORIGEN.lat, lon: ORIGEN.lon }, { lat: DESTINO.lat, lon: DESTINO.lon });
  const ms = Date.now() - t0;
  console.log(`=== ${nombre} (calado=${calado_m}m, dMinM=${perfil.costo.dMinM}) ===`);
  if (!r.ok) {
    console.log(`  FALLA: ${r.error} (motivo=${r.motivo}) (${ms}ms)`);
    return;
  }
  const distTenglo = distanciaMinimaAlCanal(r.tramos);
  console.log(`  ok | ${ms}ms | ${r.distancia_mn}mn | max_dist_costa_mn=${r.max_dist_costa_mn} | _debug=${JSON.stringify(r._debug)}`);
  console.log(`  distancia minima del camino al corredor del canal (39 puntos): ${distTenglo.toFixed(0)}m`);
  console.log(`  ${distTenglo < 150 ? '=> PASA POR EL CANAL' : '=> NO pasa por el canal (rodea)'}`);
}

correr('Calado 1,5-2,5m -- debe PASAR por Tenglo', 2.0);
console.log();
correr('Calado 2,5-4,0m -- debe CERRARSE y rodear', 3.0);
