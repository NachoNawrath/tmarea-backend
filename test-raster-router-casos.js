'use strict';
const { warmup, calcularRuta } = require('./src/services/raster-router-service');
const { construirPerfilCosto } = require('./src/config/perfiles-costo');

const w = warmup('AUSTRAL_N');
console.log(`warmup: ${w.ms}ms\n`);

const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

// Coordenadas reales (puertos_chile_nacional.json / tmarea_nodos_nauticos_v1.json)
const ANAHUAC = { lat: -41.48607231899996, lon: -72.97656408099994 };
const MELINKA = { lat: -43.89816864699998, lon: -73.74786402599995 };
const CHACABUCO = { lat: -45.462, lon: -72.807 };
const ISLA_MAILLEN = { lat: -41.55574797299994, lon: -73.00202664399995 }; // rampa Puqueldon, sector Maillen
const ISLA_CALBUCO = { lat: -41.77629706199997, lon: -73.13039365699996 };
const CHONCHI = { lat: -42.61872181399997, lon: -73.76883021899994 }; // molo, junto al paso Imelev
const ISLA_LEMUY = { lat: -42.63815757799995, lon: -73.72160344299994 };
const QUELLON = { lat: -43.12075347399997, lon: -73.62317869399999 };

function correr(nombre, origen, destino, opts = {}) {
  const t0 = Date.now();
  const r = calcularRuta(perfil, origen, destino, opts);
  const ms = Date.now() - t0;
  console.log(`=== ${nombre} ===`);
  if (!r.ok) {
    console.log(`  FALLA: ${r.error} (${ms}ms)`);
    return;
  }
  console.log(`  ok | ${ms}ms | ${r.distancia_mn}mn | ${r.tramos.length} tramo(s) | ` +
    `restringido=${r._debug.restringido} | camino=${r._debug.celdasCaminoCompleto}celdas -> ${r._debug.celdasWaypoints}wp`);
  console.log(`  max_dist_costa_mn=${r.max_dist_costa_mn} | pct_en_resguardo=${r.pct_en_resguardo}`);
  console.log(`  waypoints (lon,lat): ${JSON.stringify(r.tramos.flatMap(t => t.coords))}`);
  return r;
}

correr('Test 2 -- Anahuac -> Melinka (Tenglo)', ANAHUAC, MELINKA);
console.log();
correr('Test 7 -- Anahuac -> Chacabuco (rendimiento, <1.5s pedido)', ANAHUAC, CHACABUCO);
console.log();
correr('Caso Maillen -- Anahuac/PM -> Isla Maillen (paso poniente)', ANAHUAC, ISLA_MAILLEN);
console.log();
correr('Caso Maillen -- Anahuac/PM -> Isla Calbuco (via paso o exterior)', ANAHUAC, ISLA_CALBUCO);
console.log();
correr('Caso Imelev/Lemuy -- Chonchi -> Isla Lemuy', CHONCHI, ISLA_LEMUY);
console.log();
correr('Caso Imelev/Lemuy -- Chonchi -> Quellon (via canal o exterior)', CHONCHI, QUELLON);
