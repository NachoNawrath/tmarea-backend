'use strict';
// Control post dMinM=50: con el margen duro fijo, las naves grandes ya no
// se alejan de la costa por prohibicion, solo por preferencia (bandaMinM).
// Si pct_en_resguardo cae bajo 0.6 en alguna ruta del corredor, bandaMinM
// necesita subir -- es preferencia, no prohibicion, se ajusta sin riesgo.
//
// Las "4 rutas del corredor": las 4 legs con coordenadas reales ya usadas
// en test-raster-router-casos.js que tocan puntos de control distintos de
// la tabla de corredor troncal (Canal Tenglo, Paso Poniente Isla Maillen,
// Paso Imelev/Canal Lemuy, y la performance del corredor completo a
// Chacabuco).
const { warmup, calcularRuta } = require('./src/services/raster-router-service');
const { construirPerfilCosto } = require('./src/config/perfiles-costo');

const w = warmup('AUSTRAL_N');
console.log(`warmup: ${w.ms}ms\n`);

const ANAHUAC = { lat: -41.48607231899996, lon: -72.97656408099994 };
const MELINKA = { lat: -43.89816864699998, lon: -73.74786402599995 };
const CHACABUCO = { lat: -45.462, lon: -72.807 };
const ISLA_MAILLEN = { lat: -41.55574797299994, lon: -73.00202664399995 };
const CHONCHI = { lat: -42.61872181399997, lon: -73.76883021899994 };
const QUELLON = { lat: -43.12075347399997, lon: -73.62317869399999 };

const RUTAS = [
  ['Anahuac -> Melinka (Canal Tenglo)', ANAHUAC, MELINKA],
  ['Anahuac -> Chacabuco (corredor completo)', ANAHUAC, CHACABUCO],
  ['Anahuac -> Isla Maillen (Paso Poniente)', ANAHUAC, ISLA_MAILLEN],
  ['Chonchi -> Quellon (Paso Imelev / Canal Lemuy)', CHONCHI, QUELLON],
];

const CALADOS = [2.5, 4.0];
let algunaBajo06 = false;
const resumen = [];

for (const [nombre, origen, destino] of RUTAS) {
  for (const calado_m of CALADOS) {
    const perfil = construirPerfilCosto({ calado_m, licencia: 'PNM' });
    const t0 = Date.now();
    const r = calcularRuta(perfil, origen, destino);
    const ms = Date.now() - t0;
    if (!r.ok) {
      console.log(`${nombre} | calado=${calado_m}m -> FALLA: ${r.error} (${ms}ms)`);
      resumen.push({ nombre, calado_m, ok: false });
      continue;
    }
    const bajo06 = r.pct_en_resguardo < 0.6;
    if (bajo06) algunaBajo06 = true;
    console.log(
      `${nombre} | calado=${calado_m}m (bandaMinM=${perfil.costo.bandaMinM}) -> ` +
      `OK ${ms}ms | pct_en_resguardo=${r.pct_en_resguardo} ${bajo06 ? '  <-- BAJO 0.6' : ''}`
    );
    resumen.push({ nombre, calado_m, ok: true, pct_en_resguardo: r.pct_en_resguardo });
  }
}

console.log();
console.log(algunaBajo06
  ? 'RESULTADO: al menos una ruta/calado cayo bajo pct_en_resguardo=0.6 -- revisar bandaMinM'
  : 'RESULTADO: todas las rutas mantienen pct_en_resguardo >= 0.6');
