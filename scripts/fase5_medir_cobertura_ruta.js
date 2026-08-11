#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// fase5_medir_cobertura_ruta.js — MEDICION, no construccion.
//
// Pregunta que responde: de una ruta real (la que produce el motor de ruteo de
// hoy), ¿que parte NO cae en ninguna jurisdiccion de la capa que el motor
// consulta? Y de esa parte, ¿cuanta se muestra al patron y cuanta queda como
// defecto registrado?
//
// Usa el MISMO modulo que el backend (src/services/cobertura-jurisdiccional.js).
// No hay una segunda implementacion de la medicion: lo que se mide aca es
// exactamente lo que el endpoint va a devolver.
//
// Ademas reporta las dos partes del criterio POR SEPARADO, para que se pueda
// juzgar cuanto aporta cada una en vez de tener que creer en el conjunto.
//
// Uso:  node scripts/fase5_medir_cobertura_ruta.js
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { Pool } = require('pg');
const { warmup, calcularRuta } = require('../src/services/raster-router-service');
const { construirPerfilCosto } = require('../src/config/perfiles-costo');
const { medirCoberturaRuta, componerAvisos } = require('../src/services/cobertura-jurisdiccional');

// Puntos de partida/llegada: coordenadas reales ya usadas por los tests del
// router (test-raster-router-casos.js) y por el catalogo SITPORT.
const PUNTOS = {
  ANAHUAC:      { lat: -41.48607231899996, lon: -72.97656408099994 },
  MELINKA:      { lat: -43.89816864699998, lon: -73.74786402599995 },
  CHACABUCO:    { lat: -45.462,            lon: -72.807 },
  QUELLON:      { lat: -43.12075347399997, lon: -73.62317869399999 },
  CHONCHI:      { lat: -42.61872181399997, lon: -73.76883021899994 },
  CASTRO:       { lat: -42.4808,           lon: -73.7591 },
  ANCUD:        { lat: -41.8665,           lon: -73.8313 },
  CHAITEN:      { lat: -42.9112,           lon: -72.7187 },
  ARICA:        { lat: -18.4746,           lon: -70.3126 },
  IQUIQUE:      { lat: -20.2133,           lon: -70.1503 },
  PUNTA_ARENAS: { lat: -53.1358,           lon: -70.8625 },
  PTO_WILLIAMS: { lat: -54.9324,           lon: -67.5968 },
  VALPARAISO:   { lat: -33.0333,           lon: -71.6333 },
  SAN_ANTONIO:  { lat: -33.5833,           lon: -71.6167 },
};

const RUTAS = [
  ['corredor dia 0', 'Anahuac -> Melinka',             'ANAHUAC',      'MELINKA'],
  ['corredor dia 0', 'Anahuac -> Quellon',             'ANAHUAC',      'QUELLON'],
  ['corredor dia 0', 'Anahuac -> Chacabuco',           'ANAHUAC',      'CHACABUCO'],
  ['corredor dia 0', 'Ancud -> Castro (mar interior)', 'ANCUD',        'CASTRO'],
  ['corredor dia 0', 'Chonchi -> Chaiten (Corcovado)', 'CHONCHI',      'CHAITEN'],
  ['fuera corredor', 'Arica -> Iquique (norte)',       'ARICA',        'IQUIQUE'],
  ['fuera corredor', 'Valparaiso -> San Antonio',      'VALPARAISO',   'SAN_ANTONIO'],
  ['fuera corredor', 'Punta Arenas -> Pto Williams',   'PUNTA_ARENAS', 'PTO_WILLIAMS'],
];

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log('================================================================');
  console.log('MEDICION DE COBERTURA JURISDICCIONAL SOBRE RUTAS REALES');
  console.log('================================================================');
  console.log(`fecha              : ${new Date().toISOString()}`);
  console.log(`motor de ruteo     : raster-router-service (el de produccion)`);
  console.log(`waypoints medidos  : los que recibe el backend — tramos sin 'aproximacion_final',`);
  console.log(`                     igual que src/hooks/useVoyageVerification.js:849 del PWA`);
  console.log(`modulo de medicion : src/services/cobertura-jurisdiccional.js (el mismo del endpoint)`);
  console.log('');

  const w = warmup('AUSTRAL_N');
  console.log(`warmup tile AUSTRAL_N: ${w.ms}ms`);
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

  const todas = [];
  const resumen = [];
  let capaInfo = null;

  for (const [grupo, nombre, a, b] of RUTAS) {
    console.log('');
    console.log(`---- ${nombre}  [${grupo}] ----`);
    let r;
    try {
      r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b], {});
    } catch (e) {
      console.log(`  RUTEO LANZA: ${e.message}`);
      resumen.push({ grupo, nombre, estado: 'ruteo_excepcion' });
      continue;
    }
    if (!r || !r.ok) {
      console.log(`  RUTEO NO OK: ${r && r.error}`);
      resumen.push({ grupo, nombre, estado: 'ruteo_fallido' });
      continue;
    }
    const wps = r.tramos
      .filter(t => t.tipo !== 'aproximacion_final' && (t.coords || []).length >= 2)
      .flatMap(t => t.coords)
      .map(([lng, lat]) => ({ lat, lng }));
    if (wps.length < 2) {
      console.log('  ruta con menos de 2 waypoints tras descartar aproximacion_final');
      resumen.push({ grupo, nombre, estado: 'ruta_degenerada' });
      continue;
    }

    const med = await medirCoberturaRuta(pool, wps);
    const { avisos, defectos, bandera_cobertura } = await componerAvisos(med, pool);
    capaInfo = capaInfo || { capa: med.capa, recorte: med.capa_recorte, tolerancia: med.tolerancia_m };

    const km = f => med.piezas.filter(f).reduce((s, p) => s + p.largo_km, 0);
    const desc = km(() => true);
    const kmAviso = km(p => p.clasificacion === 'aviso');
    const kmDefecto = km(p => p.clasificacion === 'defecto_recorte');
    // Las dos mitades del criterio, por separado.
    const kmSoloRecorte = km(p => p.dentro_del_recorte);
    const kmSoloPegada = km(p => p.pegada_a_cobertura);

    console.log(`  waypoints=${wps.length}  largo=${med.largo_ruta_km.toFixed(2)} km  distancia_mn=${r.distancia_mn}`);
    console.log(`  descubierto ${desc.toFixed(4)} km (${(desc / med.largo_ruta_km * 100).toFixed(3)}%) en ${med.piezas.length} pieza(s)`);
    console.log(`     criterio (i) solo  — entero dentro del recorte : ${kmSoloRecorte.toFixed(4)} km silenciaria`);
    console.log(`     criterio (ii) solo — pegado a cobertura        : ${kmSoloPegada.toFixed(4)} km silenciaria`);
    console.log(`     criterio (i AND ii) — el aplicado              : ${kmDefecto.toFixed(4)} km silencia`);
    console.log(`  => AVISO al patron: ${avisos.length} tarjeta(s), ${kmAviso.toFixed(4)} km | bandera cobertura ${bandera_cobertura}`);
    console.log(`  => DEFECTO registrado: ${defectos.length}`);
    for (const p of med.piezas) {
      console.log(`     ${p.clasificacion.padEnd(16)} ${p.largo_km.toFixed(4).padStart(10)} km  ` +
        `recorte=${p.dentro_del_recorte ? 'si' : 'no'} (frac ${p.fraccion_en_recorte.toFixed(4)})  ` +
        `pegada=${p.pegada_a_cobertura ? 'si' : 'no'}  ` +
        `ini ${p.lat_ini.toFixed(5)},${p.lon_ini.toFixed(5)} fin ${p.lat_fin.toFixed(5)},${p.lon_fin.toFixed(5)}`);
      todas.push(p);
    }
    resumen.push({
      grupo, nombre, estado: 'ok',
      largo_km: +med.largo_ruta_km.toFixed(3), desc_km: +desc.toFixed(4),
      aviso_km: +kmAviso.toFixed(4), defecto_km: +kmDefecto.toFixed(4),
      n_avisos: avisos.length, bandera: bandera_cobertura,
      solo_i: +kmSoloRecorte.toFixed(4), solo_ii: +kmSoloPegada.toFixed(4),
    });
  }

  console.log('');
  console.log('================================================================');
  console.log('COHERENCIA ENTRE EL PREDICADO Y LA MEDIDA');
  console.log('================================================================');
  // 1. El predicado contra la medida. Se deja a la vista porque el criterio
  //    dejo de apoyarse en el predicado justamente porque discrepaban.
  const discrepan = todas.filter(p => p.predicado_coveredby !== p.dentro_del_recorte);
  console.log(`  piezas donde ST_CoveredBy discrepa de la medida en metros: ${discrepan.length} de ${todas.length}`);
  console.log(`  (por eso el criterio mide metros fuera y no pregunta al predicado)`);

  // 2. La banda intermedia. La tolerancia solo es defendible mientras nada caiga
  //    entre el ruido numerico y un hueco de verdad. El dia que algo caiga ahi,
  //    aparece aca y hay que volver a discutirla.
  const tol = capaInfo ? capaInfo.tolerancia : null;
  const dentro = todas.filter(p => p.fuera_del_recorte_m <= tol);
  const fuera  = todas.filter(p => p.fuera_del_recorte_m > tol);
  const peorDentro = dentro.reduce((m, p) => Math.max(m, p.fuera_del_recorte_m), 0);
  const menorFuera = fuera.length ? fuera.reduce((m, p) => Math.min(m, p.fuera_del_recorte_m), Infinity) : null;
  console.log('');
  console.log(`  tolerancia declarada          : ${tol} m`);
  console.log(`  peor residuo bajo tolerancia  : ${peorDentro.toExponential(3)} m  (${dentro.length} piezas)`);
  console.log(`  menor exceso sobre tolerancia : ${menorFuera === null ? '—' : menorFuera.toFixed(2) + ' m'}  (${fuera.length} piezas)`);
  const banda = todas.filter(p => p.fuera_del_recorte_m > tol && p.fuera_del_recorte_m < 1);
  console.log(`  piezas en la banda ambigua (${tol} m .. 1 m): ${banda.length}` +
    (banda.length ? '  <-- REVISAR LA TOLERANCIA' : '  (ninguna: la separacion es limpia)'));

  console.log('');
  console.log('================================================================');
  console.log('RESUMEN');
  console.log('================================================================');
  console.log(`  capa consultada: ${capaInfo && capaInfo.capa} | recortada contra: ${capaInfo && capaInfo.recorte}`);
  console.log('');
  console.log('  ruta                                largo    descub.    AVISO   defecto  tarjetas bandera');
  for (const x of resumen) {
    if (x.estado !== 'ok') { console.log(`  ${x.nombre.padEnd(34)} ${x.estado}`); continue; }
    console.log(`  ${x.nombre.padEnd(34)} ${String(x.largo_km).padStart(8)} ${String(x.desc_km).padStart(9)} ` +
      `${String(x.aviso_km).padStart(9)} ${String(x.defecto_km).padStart(9)} ${String(x.n_avisos).padStart(6)}  ${x.bandera}`);
  }
  const ok = resumen.filter(x => x.estado === 'ok');
  const s = k => ok.reduce((a, b) => a + b[k], 0);
  console.log('');
  console.log(`  TOTAL largo ${s('largo_km').toFixed(2)} km | descubierto ${s('desc_km').toFixed(2)} km ` +
    `| AVISO ${s('aviso_km').toFixed(2)} km | defecto silenciado ${s('defecto_km').toFixed(2)} km`);
  console.log(`  si el criterio fuera solo (i) : silenciaria ${s('solo_i').toFixed(2)} km`);
  console.log(`  si el criterio fuera solo (ii): silenciaria ${s('solo_ii').toFixed(2)} km`);
  console.log('');
  const conAviso = ok.filter(x => x.n_avisos > 0);
  console.log(`  rutas con aviso al patron: ${conAviso.length} de ${ok.length}` +
    (conAviso.length ? ` -> ${conAviso.map(x => x.nombre).join(', ')}` : ''));
  const corredor = ok.filter(x => x.grupo === 'corredor dia 0');
  console.log(`  corredor de dia 0 con aviso: ${corredor.filter(x => x.n_avisos > 0).length} de ${corredor.length}`);

  await pool.end();
})().catch(e => { console.error('FALLA:', e.message); process.exit(1); });
