'use strict';
// Simula el comportamiento REAL del servidor: warmup() primero (como hace
// src/index.js antes de app.listen), y recién después calcula/verifica la
// ruta — así el caché de rodeos ya está poblado, igual que en producción.
const { calcularRuta, warmup } = require('./src/services/nautical-graph-router');
const coastlineGuard = require('./src/services/coastline-guard');

const t0 = Date.now();
warmup();
console.log(`\nwarmup() total: ${Date.now() - t0}ms (costo único de arranque)\n`);

const latO = -41.48, lonO = -72.93;
const latD = -43.89, lonD = -73.74;

const tRuta = Date.now();
const resultado = calcularRuta(latO, lonO, latD, lonD);
console.log(`calcularRuta() post-warmup: ${Date.now() - tRuta}ms — ${resultado.distancia_mn}mn, ${resultado.tramos.length} tramos, confianza_minima: ${resultado.confianza_minima}`);

coastlineGuard.ensureReady();
let cruces = 0;
const coords = resultado.coords;
for (let i = 0; i < coords.length - 1; i++) {
  const check = coastlineGuard.crossesCoastline([coords[i], coords[i + 1]]);
  if (check.crossesLand) {
    cruces++;
    console.log(`CRUCE #${cruces} entre punto ${i} y ${i + 1}: ${check.motivo}`);
  }
}
console.log(`\nSegmentos verificados: ${coords.length - 1}, cruces detectados: ${cruces}`);
console.log(cruces === 0 ? 'RUTA VALIDADA: 100% navegable por agua.' : `RUTA CON ${cruces} TRAMO(S) NO RESUELTOS (marcados ROJO con advertencia SHOA).`);

const t2 = Date.now();
calcularRuta(latO, lonO, latD, lonD);
console.log(`\nSegunda petición (cache hit): ${Date.now() - t2}ms`);
