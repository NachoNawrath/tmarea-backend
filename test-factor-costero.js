'use strict';
const { warmup, calcularRuta } = require('./src/services/raster-router-service');
const { construirPerfilCosto } = require('./src/config/perfiles-costo');
const { factorCostero, NM_A_M } = require('./src/services/raster/cost-lut');

// Verificar la curva de costo costero
console.log('=== Curva factorCostero ===');
for (const nm of [0, 2, 5, 8, 10, 15, 20, 25, 30, 45, 60, 70]) {
  console.log(`  ${nm} NM -> factor ${factorCostero(nm * NM_A_M).toFixed(3)}`);
}
console.log();

const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });
console.log('perfil:', JSON.stringify(perfil));
console.log();

// Coordenadas
const LA_SERENA    = { lat: -29.9027, lon: -71.2730 };
const ARICA        = { lat: -18.4746, lon: -70.3210 };
const VALPARAISO   = { lat: -33.0245, lon: -71.6260 };
const PUERTO_MONTT = { lat: -41.4693, lon: -72.9367 };
const ANAHUAC      = { lat: -41.48607231899996, lon: -72.97656408099994 };
const PUERTO_AGUIRRE = { lat: -45.1650, lon: -73.5250 };

function correr(nombre, origen, destino) {
  const t0 = Date.now();
  const r = calcularRuta(perfil, origen, destino);
  const ms = Date.now() - t0;
  console.log(`=== ${nombre} ===`);
  if (!r.ok) {
    console.log(`  FALLA: ${r.error} (${ms}ms)`);
    console.log();
    return null;
  }
  console.log(`  ok | ${ms}ms | ${r.distancia_mn.toFixed(1)}mn`);
  console.log(`  max_dist_costa_mn=${r.max_dist_costa_mn} | pct_en_resguardo=${r.pct_en_resguardo}`);
  console.log(`  tramos=${r.tramos.length}`);

  // Verificar que la ruta no se aleje demasiado de la costa
  if (r.max_dist_costa_mn > 15) {
    console.log(`  ** ALERTA: max_dist_costa_mn=${r.max_dist_costa_mn} > 15 NM`);
  } else {
    console.log(`  OK: ruta dentro de 15 NM de la costa`);
  }
  console.log();
  return r;
}

// Test 1: La Serena -> Arica (costa abierta, debe seguir litoral)
correr('La Serena -> Arica', LA_SERENA, ARICA);

// Test 2: Anahuac -> Puerto Aguirre (zona austral, sin regresion)
correr('Anahuac -> Puerto Aguirre', ANAHUAC, PUERTO_AGUIRRE);

// Test 3: Valparaiso -> Puerto Montt (costa completa, debe seguir litoral)
correr('Valparaiso -> Puerto Montt', VALPARAISO, PUERTO_MONTT);
