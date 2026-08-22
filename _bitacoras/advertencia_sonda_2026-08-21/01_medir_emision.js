'use strict';
// MEDICION 1 — QUE EMITE EL BACKEND, EN QUE FORMA, Y SOBRE QUE RUTAS DISPARA.
//
// Instrumento del gate del Paso 1 (la advertencia de sonda del Derrotero).
// NO levanta el servidor: llama a la funcion pura `advertenciasCotejoVertical`
// con waypoints sinteticos posados SOBRE la geometria real de cada canal, que
// es lo que `canalesQueCruzaRuta` mide (buffer 500 m).
//
// Denominadores que este instrumento declara:
//   · pasos del Derrotero cargados        — unidad: registro de pasos-sonda-canal.json
//   · pasos con geometria verificable     — unidad: la misma
//   · calado de disparo por canal         — unidad: metros de calado de la nave
//
// Se corre:  node _bitacoras/advertencia_sonda_2026-08-21/01_medir_emision.js

const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const { advertenciasCotejoVertical, margenBajoQuilla } = require(
  path.join(RAIZ, 'src', 'services', 'raster', 'cotejo-vertical.js'));
const { canalesQueCruzaRuta, cargarGeometrias } = require(
  path.join(RAIZ, 'src', 'services', 'raster', 'canal-geometria.js'));
const { advertenciasPeligrosPorCanal } = require(
  path.join(RAIZ, 'src', 'services', 'raster', 'peligros-canal.js'));
const PASOS = require(path.join(RAIZ, 'src', 'config', 'pasos-sonda-canal.json'));

const L = [];
const say = (s) => { L.push(s); };

say('MEDICION 1 — LA ADVERTENCIA DE SONDA: QUE EMITE Y CUANDO');
say('='.repeat(78));
say('');

// ── A · El insumo del Derrotero ──────────────────────────────────────────────
say('A · EL INSUMO — src/config/pasos-sonda-canal.json');
say('    Unidad: REGISTRO de paso. Denominador: los registros del fichero.');
say('');
const conGeo = PASOS.filter((p) => p.canal_geometria_disponible);
say(`    pasos cargados                    : ${PASOS.length}`);
say(`    con geometria verificable         : ${conGeo.length}  (${(100 * conGeo.length / PASOS.length).toFixed(1)} % de ${PASOS.length})`);
say(`    SIN geometria (nunca evaluables)  : ${PASOS.length - conGeo.length}`);
say('');
for (const p of PASOS) {
  const marca = p.canal_geometria_disponible ? 'CON GEO' : 'sin geo';
  say(`    [${marca}] ${p.canal} / ${p.nombre} — sonda min ${p.sonda_canal_min_m} m — Derrotero p.${p.pagina}`);
}
say('');

// ── B · La geometria realmente cargada ───────────────────────────────────────
say('B · LA GEOMETRIA QUE canal-geometria.js CARGA DE VERDAD');
say('    (el flag del JSON dice que deberia haber; esto mide que hay)');
say('');
const geos = cargarGeometrias();
say(`    canales con linea cargada         : ${geos.size}`);
for (const [canal, linea] of geos) {
  say(`      ${canal} — ${linea.length} vertices`);
}
const flagSinLinea = conGeo.map((p) => p.canal).filter((c) => !geos.has(c));
say(`    con flag=true y SIN linea cargada : ${flagSinLinea.length}` + (flagSinLinea.length ? ` (${flagSinLinea.join(', ')})` : ''));
say('');

// ── C · El disparo: barrido de calado por canal ──────────────────────────────
say('C · SOBRE QUE RUTAS DISPARA — barrido de calado, canal por canal');
say('    Regla del codigo: dispara si  sonda_min < calado + max(0,5 ; 0,1 x calado)');
say('    Unidad del barrido: metros de calado. Paso: 0,1 m. Rango: 0,1 a 20,0');
say('    (el rango es el que P1_VesselProfile.jsx valida para el campo calado_m)');
say('');
for (const [canal, linea] of geos) {
  // Waypoints sinteticos: el vertice medio de la linea del canal, repetido en
  // un par para que sea una polilinea valida. Cae a 0 m de la linea, o sea
  // dentro del buffer de 500 m con margen de sobra.
  const medio = linea[Math.floor(linea.length / 2)];
  const wp = [medio, linea[Math.min(linea.length - 1, Math.floor(linea.length / 2) + 1)]];
  const cruza = canalesQueCruzaRuta(wp);
  const paso = PASOS.find((p) => p.canal === canal);
  let umbral = null;
  for (let c = 1; c <= 200; c++) {
    const calado = c / 10;
    if (advertenciasCotejoVertical(wp, calado).some((t) => t.includes(paso.nombre))) { umbral = calado; break; }
  }
  say(`    ${canal}`);
  say(`      canales que el punto medio hace "cruzar" : ${cruza.join(' + ') || 'ninguno'}`);
  say(`      sonda documentada                        : ${paso.sonda_canal_min_m} m (${paso.nombre}, p.${paso.pagina})`);
  say(`      calado MINIMO que dispara                : ${umbral === null ? 'NINGUNO en 0,1-20,0' : umbral.toFixed(1) + ' m'}`);
  if (umbral !== null) {
    say(`      margen a ese calado                      : ${margenBajoQuilla(umbral).toFixed(1)} m`);
  }
  say('');
}

// ── D · El caso que la PWA produce HOY ───────────────────────────────────────
say('D · EL CASO QUE LA PWA PRODUCE HOY');
say('    P3 llama /api/rutas/calcular desde fetchRuta (useVoyageVerification.js).');
say('    Su body NO lleva calado_m: el backend cae al default de routes-routes.js.');
say('');
const CALADO_DEFAULT_P3 = 1.5; // routes-routes.js:105
const CALADOS_MUESTRA = [1.5, 2.0, 3.0, 4.5, 4.6, 8.7, 10.1];
for (const calado of CALADOS_MUESTRA) {
  const disparos = [];
  for (const [canal, linea] of geos) {
    const medio = linea[Math.floor(linea.length / 2)];
    const wp = [medio, linea[Math.min(linea.length - 1, Math.floor(linea.length / 2) + 1)]];
    const a = advertenciasCotejoVertical(wp, calado);
    if (a.length) disparos.push(canal);
  }
  const marca = calado === CALADO_DEFAULT_P3 ? '  <-- EL DEFAULT QUE P3 PRODUCE HOY' : '';
  say(`    calado ${String(calado).padStart(5)} m  ->  dispara en: ${disparos.join(', ') || 'NINGUN canal'}${marca}`);
}
say('');

// ── E · El texto literal, tal como viaja ─────────────────────────────────────
say('E · EL TEXTO LITERAL — asi sale del backend, sin tocar');
say('    Se muestra el peor caso: un calado que dispara en los tres canales.');
say('');
const CALADO_DEMO = 12.0;
for (const [canal, linea] of geos) {
  const medio = linea[Math.floor(linea.length / 2)];
  const wp = [medio, linea[Math.min(linea.length - 1, Math.floor(linea.length / 2) + 1)]];
  for (const t of advertenciasCotejoVertical(wp, CALADO_DEMO)) {
    say(`    [cotejo_vertical] ${t}`);
    say('');
  }
}

// ── F · Que MAS viaja en el mismo array ──────────────────────────────────────
say('F · QUE MAS VIAJA EN `advertencias` — el array NO es de una sola clase');
say('    raster-router-service.js:659 arranca el array con ADVERTENCIAS_BASE y');
say('    despues le concatena cotejo + peligros + un diagnostico del motor.');
say('');
say('    clase BASE (siempre presentes, 2 de 2):');
say('      1. Corredor de Referencia Tmarea — linea segmentada informativa.');
say('      2. No reemplaza carta nautica SHOA. El patron mantiene responsabilidad absoluta de la derrota.');
say('');
say('    clase PELIGROS (peligros-canal.js, mismos 3 canales con geometria):');
for (const [canal, linea] of geos) {
  const medio = linea[Math.floor(linea.length / 2)];
  const wp = [medio, linea[Math.min(linea.length - 1, Math.floor(linea.length / 2) + 1)]];
  const p = advertenciasPeligrosPorCanal(wp);
  if (p.length === 0) { say(`      ${canal}: sin texto de peligros catalogado`); continue; }
  for (const t of p) say(`      ${canal}: ${t}`);
}
say('');
say('    clase DIAGNOSTICO DEL MOTOR (raster-router-service.js:566):');
say('      "El string-pulling no pudo simplificar la ruta (linea de vista obstruida en todo el trayecto)."');
say('      NO es texto al patron: nombra un algoritmo interno. Viaja en el MISMO array.');
say('');
say('    CONSECUENCIA MEDIDA: `advertencias` es string[] plano, sin tipo por elemento.');
say('    Renderizarlo entero pone el diagnostico del motor delante del patron.');
say('    Renderizar solo la sonda exige un discriminador que HOY NO EXISTE en el dato.');
say('');

say('='.repeat(78));
say('FIN DE LA MEDICION 1 — VERIFICADO');

const salida = L.join('\n');
require('fs').writeFileSync(
  path.join(__dirname, '01_medir_emision.txt'), salida + '\n', 'utf8');
process.stdout.write(salida + '\n');
