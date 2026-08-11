'use strict';
const { warmup, calcularRuta } = require('./src/services/raster-router-service');
const { construirPerfilCosto } = require('./src/config/perfiles-costo');

const w = warmup('AUSTRAL_N');
console.log(`warmup: ${w.ms}ms\n`);

const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

// Punto de referencia con snap conocido-bueno (origen en todos los tests)
const ANAHUAC   = { lat: -41.48607231899996, lon: -72.97656408099994 };

// Test 1: Chacabuco exacto del issue (-45.465, -72.811)
const CHACABUCO_ISSUE = { lat: -45.465, lon: -72.811 };

// Test 3: tierra firme — centro del continente (no hay raster ahí, pero si lo
// hubiera debería ser SNAP_FAILED; si cae fuera del tile el error será distinto)
const TIERRA_FIRME = { lat: -40.0, lon: -72.0 };

function correr(nombre, origen, destino) {
  const heapAntes = process.memoryUsage().heapUsed;
  const t0 = Date.now();
  const r = calcularRuta(perfil, origen, destino);
  const ms = Date.now() - t0;
  const heapDespues = process.memoryUsage().heapUsed;
  const deltaHeapMB = ((heapDespues - heapAntes) / 1024 / 1024).toFixed(2);

  console.log(`=== ${nombre} ===`);
  if (r.ok) {
    // Primer y último waypoint para estimar snap del destino
    const todos = r.tramos.flatMap(t => t.coords);
    const ultimo = todos[todos.length - 1];
    console.log(`  SNAP OK | ${ms}ms | ${r.distancia_mn}mn | ${r.tramos.length} tramo(s)`);
    if (ultimo) console.log(`  último waypoint (snap destino aprox): lon=${ultimo[0].toFixed(5)}, lat=${ultimo[1].toFixed(5)}`);
  } else {
    console.log(`  FALLA: ${r.error}`);
    if (r.error_code) console.log(`  error_code: ${r.error_code} | punto: ${r.punto_fallido}`);
  }
  console.log(`  heap delta: ${deltaHeapMB > 0 ? '+' : ''}${deltaHeapMB} MB`);
  console.log();
  return r;
}

// Test 1: Chacabuco debe hacer snap OK ahora
correr('Test 1 — Chacabuco destino (-45.465, -72.811) [antes SNAP_FAILED]',
  ANAHUAC, CHACABUCO_ISSUE);

// Test 2: Anahuac como destino (regresión — el origen ya funcionaba bien)
correr('Test 2 — Anahuac destino (regresión)',
  CHACABUCO_ISSUE, ANAHUAC);

// Test 3: tierra firme — debe fallar (SNAP_FAILED u "outside tile")
correr('Test 3 — Tierra firme destino (-40.0, -72.0)',
  ANAHUAC, TIERRA_FIRME);

// Test 4: Chacabuco — medir heap total (dos llamadas para descartar GC)
console.log('=== Test 4 — Heap total (2x Chacabuco) ===');
const h0 = process.memoryUsage().heapUsed;
calcularRuta(perfil, ANAHUAC, CHACABUCO_ISSUE);
calcularRuta(perfil, ANAHUAC, CHACABUCO_ISSUE);
const h1 = process.memoryUsage().heapUsed;
console.log(`  heap antes:  ${(h0/1024/1024).toFixed(1)} MB`);
console.log(`  heap después: ${(h1/1024/1024).toFixed(1)} MB`);
console.log(`  delta: ${((h1-h0)/1024/1024).toFixed(2)} MB`);
