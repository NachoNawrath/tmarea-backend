'use strict';
const { calcularRuta, warmup } = require('./src/services/nautical-graph-router');
const coastlineGuard = require('./src/services/coastline-guard');

function verificar(nombre, latO, lonO, latD, lonD) {
  const t0 = Date.now();
  const r = calcularRuta(latO, lonO, latD, lonD);
  const ms = Date.now() - t0;
  console.log(`\n=== ${nombre} ===`);
  console.log(`ok: ${r.ok} | ${ms}ms | ${r.distancia_mn}mn | ${r.tramos.length} tramos | confianza_minima: ${r.confianza_minima}`);
  console.log('advertencias:', JSON.stringify(r.advertencias));

  if (!r.coords || r.coords.length < 2) {
    console.log('SIN GEOMETRIA (no hay ruta calculable)');
    return;
  }
  let cruces = 0;
  for (let i = 0; i < r.coords.length - 1; i++) {
    const check = coastlineGuard.crossesCoastline([r.coords[i], r.coords[i + 1]]);
    if (check.crossesLand) { cruces++; console.log(`  CRUCE #${cruces} pt${i}->pt${i+1}: ${check.motivo}`); }
  }
  console.log(`Segmentos: ${r.coords.length - 1}, cruces: ${cruces}`);
  console.log(cruces === 0 ? '=> 100% NAVEGABLE POR AGUA' : `=> ${cruces} TRAMO(S) SIN RESOLVER`);
}

const t0 = Date.now();
warmup();
console.log(`warmup(): ${Date.now() - t0}ms\n`);
coastlineGuard.ensureReady();

// Prueba 1: Anahuac / Puerto Montt -> Melinka
verificar('Anahuac -> Melinka', -41.48, -72.93, -43.89, -73.74);

// Prueba 2: Valdivia (Corral) -> Anahuac / Puerto Montt
verificar('Valdivia/Corral -> Anahuac', -39.878, -73.430, -41.48, -72.93);
