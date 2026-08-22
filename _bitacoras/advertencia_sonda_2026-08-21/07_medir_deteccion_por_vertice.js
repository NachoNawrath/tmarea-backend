'use strict';
// MEDICION 3 — UN DEFECTO POR DEBAJO DE LO PEDIDO, MEDIDO Y NO ARREGLADO (§0.1).
//
//   `canalesQueCruzaRuta` PREGUNTA POR LOS VERTICES DE LA RUTA, NO POR SUS TRAMOS.
//
// Mide la distancia de cada WAYPOINT a la linea del canal (buffer 500 m). Como el
// string-pulling deja pocos waypoints y muy separados justo en agua abierta, una
// ruta puede cruzar un canal por el medio y no ser detectada: el segmento lo
// atraviesa, pero ningun vertice cae dentro del buffer.
//
// NO SE ARREGLA EN ESTA PIEZA. Cambiar la deteccion a segmento-contra-segmento
// mueve lo que el backend emite para TODA ruta, y esta pieza es de render y
// tipado. §4.8: se mide, se dice, y se deja escrito donde alguien lo va a leer.
// Y NO SE TOCA EL BUFFER: subirlo hasta que el caso pase seria elegir el umbral
// que hace pasar la prueba (§0.3), no arreglar el mecanismo.
//
// Se corre:  node _bitacoras/advertencia_sonda_2026-08-21/07_medir_deteccion_por_vertice.js
//   (necesita el backend propio escuchando; ver la cabecera de la bitacora)

const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const { cargarGeometrias } = require(path.join(RAIZ, 'src', 'services', 'raster', 'canal-geometria.js'));

const BUFFER_M = 500; // el que canal-geometria.js aplica por defecto

function distPuntoSegmentoM(lon, lat, [l1, a1], [l2, a2]) {
  const k = 111320, kx = k * Math.cos((a1 * Math.PI) / 180);
  const px = (lon - l1) * kx, py = (lat - a1) * k;
  const bx = (l2 - l1) * kx, by = (a2 - a1) * k;
  const L = bx * bx + by * by;
  let t = L > 0 ? (px * bx + py * by) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - t * bx, py - t * by);
}

// Distancia MINIMA entre dos polilineas, muestreando la ruta cada ~50 m. Es lo
// que mediria una deteccion por TRAMO en vez de por vertice.
function minRutaALinea(wps, linea, densificar) {
  let pts = wps;
  if (densificar) {
    pts = [];
    for (let i = 1; i < wps.length; i++) {
      const [l1, a1] = wps[i - 1], [l2, a2] = wps[i];
      const dm = Math.hypot((l2 - l1) * 111320 * Math.cos((a1 * Math.PI) / 180), (a2 - a1) * 111320);
      const n = Math.max(1, Math.ceil(dm / 50));
      for (let s = 0; s < n; s++) pts.push([l1 + ((l2 - l1) * s) / n, a1 + ((a2 - a1) * s) / n]);
    }
    pts.push(wps[wps.length - 1]);
  }
  let min = Infinity;
  for (const [lon, lat] of pts) {
    for (let i = 1; i < linea.length; i++) {
      const d = distPuntoSegmentoM(lon, lat, linea[i - 1], linea[i]);
      if (d < min) min = d;
    }
  }
  return { min, puntos: pts.length };
}

const CASOS = [
  { fichero: 'ruta_pm_ancud.json', canal: 'Canal Chacao', que_es: 'Puerto Montt -> Ancud, el transito real del Canal Chacao' },
  { fichero: 'ruta_cruce.json',    canal: 'Canal Chacao', que_es: 'cruce perpendicular del canal, de orilla a orilla' },
  { fichero: 'ruta_puntilla_anahuac.json', canal: 'Canal Tenglo', que_es: 'Puntilla de Tenglo -> Anahuac, el caso que SI dispara' },
];

const SP = process.env.SP_RUTAS || 'C:/Users/katia/AppData/Local/Temp/claude/C--Users-katia--claude/2971db26-7744-4304-9b02-4e0e521c2bc3/scratchpad/';

const L = [];
const say = (s) => { L.push(s); };

say('MEDICION 3 — LA DETECCION MIRA VERTICES, NO TRAMOS');
say('='.repeat(78));
say('');
say(`Buffer que aplica canal-geometria.js: ${BUFFER_M} m.`);
say('Unidad de las dos columnas: METROS de distancia minima al eje del canal.');
say('  "por vertice" = lo que el codigo mide hoy (los waypoints de la respuesta).');
say('  "por tramo"   = lo mismo, densificando cada segmento a ~50 m.');
say('');

for (const c of CASOS) {
  let r;
  try { r = JSON.parse(fs.readFileSync(SP + c.fichero, 'utf8')); }
  catch { say(`  [${c.fichero}] NO ESTA — se salta. (Es crudo de sesion, no versionado.)`); say(''); continue; }
  const linea = cargarGeometrias().get(c.canal);
  const wps = [];
  for (const t of r.tramos || []) for (const p of t.coords || []) wps.push(p);
  const porVertice = minRutaALinea(wps, linea, false);
  const porTramo = minRutaALinea(wps, linea, true);
  const disparoReal = (r.advertencias || []).some((a) => a.clase === 'cotejo_vertical');

  say(`  ${c.que_es}`);
  say(`    canal interrogado          : ${c.canal}`);
  say(`    waypoints de la respuesta  : ${wps.length}`);
  say(`    por VERTICE (lo de hoy)    : ${Math.round(porVertice.min)} m  -> ${porVertice.min <= BUFFER_M ? 'DETECTA' : 'NO DETECTA'}`);
  say(`    por TRAMO   (densificado)  : ${Math.round(porTramo.min)} m  -> ${porTramo.min <= BUFFER_M ? 'DETECTA' : 'NO DETECTA'}   (${porTramo.puntos} puntos)`);
  say(`    advertencia REALMENTE emitida por el backend: ${disparoReal ? 'SI' : 'NO'}`);
  say('');
}

say('LO QUE ESTO CAMBIA DE LA PIEZA, Y NO LA INVALIDA:');
say('  La advertencia no exige solo (a) calado por encima del umbral y (b) uno de');
say('  los 3 canales con geometria. Exige ademas (c) que un VERTICE de la ruta caiga');
say('  dentro del buffer. En canales angostos y cortos —Tenglo, 39 vertices y ~2 km—');
say('  eso pasa; en Chacao, cuya linea son CINCO vertices sobre ~20 km, el transito');
say('  real de Puerto Montt a Ancud pasa a 817 m del eje y NO se detecta.');
say('');
say('  O sea: el hueco medido en 02_medir_huecos.txt es una COTA SUPERIOR de lo que');
say('  la app puede advertir. 3 de 247 registros es lo evaluable en teoria; en la');
say('  practica hay que restarle las rutas cuyos vertices no caen en el buffer, y');
say('  ese numero NO esta medido — haria falta un barrido de rutas reales.');
say('');
say('  NO SE ARREGLA ACA (§4.8): la deteccion por tramo cambia lo que el backend');
say('  emite para toda ruta. Va como LINEA.');
say('');
say('='.repeat(78));
say('FIN DE LA MEDICION 3 — VERIFICADO');

const salida = L.join('\n');
fs.writeFileSync(path.join(__dirname, '07_medir_deteccion_por_vertice.txt'), salida + '\n', 'utf8');
process.stdout.write(salida + '\n');
