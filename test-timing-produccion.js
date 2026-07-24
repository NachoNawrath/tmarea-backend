'use strict';
const { calcularRuta, warmup, routeCache } = require('./src/services/nautical-graph-router');

const latO = -41.48, lonO = -72.93;
const latD = -43.89, lonD = -73.74;

console.log('\n=== 1. Warm-up (arranque del servidor, una sola vez) ===');
let t0 = Date.now();
warmup();
console.log('warmup() total:', Date.now() - t0, 'ms');

console.log('\n=== 2. Primera petición tras warm-up (sin caché, índice ya tibio) ===');
routeCache.clear();
t0 = Date.now();
const r1 = calcularRuta(latO, lonO, latD, lonD);
console.log('calcularRuta():', Date.now() - t0, 'ms —', r1.distancia_mn, 'mn,', r1.tramos.length, 'tramos, confianza_minima:', r1.confianza_minima, 'cache:', !!r1.cache);

console.log('\n=== 3. Segunda petición, MISMAS coordenadas (debe pegarle al LRU cache) ===');
t0 = Date.now();
const r2 = calcularRuta(latO, lonO, latD, lonD);
console.log('calcularRuta() [cache hit]:', Date.now() - t0, 'ms — cache:', !!r2.cache);

console.log('\n=== 4. Promedio sobre 20 peticiones repetidas (cache caliente) ===');
const N = 20;
t0 = Date.now();
for (let i = 0; i < N; i++) calcularRuta(latO, lonO, latD, lonD);
console.log(`${N} peticiones:`, Date.now() - t0, 'ms total —', ((Date.now() - t0) / N).toFixed(2), 'ms/petición promedio');

console.log('\n=== 5. Ruta distinta (sin cache, ejercita snap+dijkstra+land-mask completo) ===');
routeCache.clear();
t0 = Date.now();
const r3 = calcularRuta(-41.60, -73.00, -42.90, -73.55); // Puerto Montt área -> cerca Queilén
console.log('calcularRuta() nueva ruta:', Date.now() - t0, 'ms —', r3.distancia_mn, 'mn,', r3.tramos.length, 'tramos');
