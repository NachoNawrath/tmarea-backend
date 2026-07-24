'use strict';
const { calcularRuta } = require('./src/services/nautical-graph-router');

// Origen: Anahuac / Puerto Montt
const latO = -41.48, lonO = -72.93;
// Destino: Melinka (Guaitecas)
const latD = -43.89, lonD = -73.74;

const t0 = Date.now();
const resultado = calcularRuta(latO, lonO, latD, lonD);
const ms = Date.now() - t0;

console.log('\n=== RESULTADO ===');
console.log('Tiempo de cálculo:', ms, 'ms');
console.log('Motor:', resultado.motor);
console.log('Distancia total:', resultado.distancia_mn, 'mn');
console.log('Nº tramos:', resultado.tramos.length);
console.log('Advertencias:', resultado.advertencias);
console.log('\n--- Tramos ---');
for (const t of resultado.tramos) {
  console.log(`[${t.confianza}] ${t.distancia_mn}mn — ${t.advertencia || ''} (${t.coords.length} pts)`);
}
console.log('\n--- Coordenadas completas (lon,lat) ---');
console.log(JSON.stringify(resultado.coords));

require('fs').writeFileSync('test-ruta-melinka-output.json', JSON.stringify(resultado, null, 2));
console.log('\nGuardado en test-ruta-melinka-output.json');
