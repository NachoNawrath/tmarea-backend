'use strict';
// Verificación automatizada: para cada segmento consecutivo de la ruta calculada,
// confirma contra coastline-guard que no cruza la línea de costa.
const { calcularRuta } = require('./src/services/nautical-graph-router');
const coastlineGuard = require('./src/services/coastline-guard');

const latO = -41.48, lonO = -72.93;   // Anahuac / Puerto Montt
const latD = -43.89, lonD = -73.74;   // Melinka

const resultado = calcularRuta(latO, lonO, latD, lonD);
coastlineGuard.ensureReady();

if (!coastlineGuard.ready) {
  console.error('ABORTA: coastline-guard no está listo —', coastlineGuard.loadError);
  process.exit(1);
}

let cruces = 0;
const coords = resultado.coords;
for (let i = 0; i < coords.length - 1; i++) {
  const check = coastlineGuard.crossesCoastline([coords[i], coords[i + 1]]);
  if (check.crossesLand) {
    cruces++;
    console.log(`CRUCE #${cruces} entre punto ${i} ${JSON.stringify(coords[i])} y ${i+1} ${JSON.stringify(coords[i+1])}: ${check.motivo}`);
  }
}

console.log(`\nTotal segmentos verificados: ${coords.length - 1}`);
console.log(`Cruces de tierra detectados: ${cruces}`);
console.log(cruces === 0 ? 'RUTA VALIDADA: 100% navegable por agua.' : 'RUTA CON PROBLEMAS: revisar segmentos marcados.');
process.exit(cruces === 0 ? 0 : 2);
