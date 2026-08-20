'use strict';
// S4: ¿alguna de las TRES clases de perfil de costo destraba el ruteo lacustre?
//
// Las clases salen de aplicarAjusteLicencia (src/config/perfiles-costo.js):
//   base            -> PNM y CDC (sin ajuste)
//   bandaMaxM=1500  -> PLDB y PDB
//   penalMax=1.2    -> CDAM
//
// El sujeto es el motor de rutas, no la pantalla: por eso se le pregunta
// directo. Las dos clases que ademas se vieron EN PANTALLA son la base
// (patron_nave_menor) y PDB, y las dos dieron la misma pagina de 1100
// caracteres.
//
// CONTROL POSITIVO: la misma llamada sobre una ruta MARITIMA tiene que dar ok.

const B = 'http://localhost:3000';

const LAGOS = [
  ['Gral Carrera: Pto Ibanez -> Rio Tranquilo', -46.2947, -71.9264, -46.6194, -72.6733],
  ['Llanquihue: Muelle -> Frutillar',            -41.2553, -73.0026, -41.0726, -72.9353],
  ['Villarrica: Pucon -> Villarrica',            -39.2765, -71.9803, -39.2883, -72.2195],
  ['Panguipulli: Costanera -> Pto Fuy',          -39.6439, -72.3220, -39.8720, -71.8891],
];
const CLASES = [
  ['base  (PNM / CDC)', 'PNM'],
  ['bandaMaxM=1500 (PDB)', 'PDB'],
  ['penalMax=1.2 (CDAM)', 'CDAM'],
];
const CONTROL = ['CONTROL POSITIVO maritima: Quellon -> Calbuco', -43.1208, -73.6232, -41.7639, -73.1303];

async function calc(y1, x1, y2, x2, licencia) {
  const r = await fetch(B + '/api/rutas/calcular', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat_origen: y1, lon_origen: x1, lat_destino: y2, lon_destino: x2, licencia }),
  });
  const d = await r.json();
  return d.ok ? ('ok  tramos=' + (d.tramos || []).length) : ('FALLA  ' + (d.error_code || d.error));
}

(async () => {
  for (const [n, y1, x1, y2, x2] of LAGOS) {
    console.log(n);
    for (const [rot, lic] of CLASES) console.log('   ' + rot.padEnd(22) + ' -> ' + await calc(y1, x1, y2, x2, lic));
  }
  console.log('');
  const [cn, cy1, cx1, cy2, cx2] = CONTROL;
  console.log(cn);
  for (const [rot, lic] of CLASES) console.log('   ' + rot.padEnd(22) + ' -> ' + await calc(cy1, cx1, cy2, cx2, lic));
})();
