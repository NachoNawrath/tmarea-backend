'use strict';
// Test de cierre de Fase 2 (Etapa B): con dMinM=50 constante calibrado
// contra Paso Tautil (241 m, el paso mas angosto documentado del
// corredor troncal), Puerto Montt -> Chacabuco deberia converger para
// calados 2,5-4,0 m -- antes dMinM escalaba a 150 m para ese bucket de
// calado, mayor que el margen que Paso Tautil realmente tiene.
const { warmup, calcularRuta } = require('./src/services/raster-router-service');
const { construirPerfilCosto, TABLA_CALADO } = require('./src/config/perfiles-costo');

const w = warmup('AUSTRAL_N');
console.log(`warmup: ${w.ms}ms\n`);
console.log('TABLA_CALADO:', JSON.stringify(TABLA_CALADO));
console.log();

const ANAHUAC = { lat: -41.48607231899996, lon: -72.97656408099994 }; // Puerto Montt
const CHACABUCO = { lat: -45.462, lon: -72.807 };

function correr(calado_m) {
  const perfil = construirPerfilCosto({ calado_m, licencia: 'PNM' });
  const t0 = Date.now();
  const r = calcularRuta(perfil, ANAHUAC, CHACABUCO);
  const ms = Date.now() - t0;
  console.log(`=== Puerto Montt -> Chacabuco, calado=${calado_m} m (dMinM=${perfil.costo.dMinM}, bandaMinM=${perfil.costo.bandaMinM}) ===`);
  if (!r.ok) {
    console.log(`  FALLA: ${r.error} (${ms}ms)`);
    return false;
  }
  console.log(`  OK | ${ms}ms | ${r.distancia_mn}mn | ${r.tramos.length} tramo(s) | ` +
    `restringido=${r._debug.restringido} | celdas=${r._debug.celdasCaminoCompleto}->${r._debug.celdasWaypoints}wp`);
  console.log(`  max_dist_costa_mn=${r.max_dist_costa_mn} | pct_en_resguardo=${r.pct_en_resguardo}`);
  return true;
}

const ok25 = correr(2.5);
console.log();
const ok40 = correr(4.0);
console.log();

if (ok25 && ok40) {
  console.log('TEST PM->CHACABUCO (dMinM=50): PASA para calado 2.5 y 4.0 m');
} else {
  console.log('TEST PM->CHACABUCO (dMinM=50): FALLA');
  process.exitCode = 1;
}
