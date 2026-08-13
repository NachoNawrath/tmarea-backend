'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e3_verificacion_paso6.js — E3, paso 6: verificacion de punta a punta y
// regresion del ambito lacustre publicado.
//
// QUE CONTESTA, y lo contesta ejecutando el motor y no describiendolo:
//
//   1. ¿Se movio alguna bandera MARITIMA al publicar el ambito lacustre?
//      El plan lo tenia como fundamento declarado ("la capa vigente cubre
//      0,0000 km2 de los seis lagos") y escribio que el paso 6 lo MIDE en vez
//      de repetirlo. Se mide sobre el arnes entero de E0.2 —las 8 rutas reales
//      mas las 2 directas— y sobre tres rutas lacustres mas.
//
//   2. ¿Cuanto ensancho de verdad el Set, ruta por ruta?
//
//   3. ¿Que le cambio de alcance al control de drift A3 (E0.1)? El Set que
//      recibe crecio en lo lacustre, y de ese Set salen las reparticiones con
//      las que A3 decide si un dato de SITPORT publicado bajo una bahia que no
//      conocemos cae DENTRO de la ruta del patron.
//
// EL CONTRAFACTICO ES LA FORMA, Y ES A PROPOSITO. No se compara contra un
// numero copiado de una bitacora vieja: se corre el MISMO motor dos veces sobre
// las MISMAS coordenadas, una con el cableado activo y otra con el ensanche
// apagado en memoria, y se comparan las dos salidas. Un baseline escrito a mano
// envejece —es la leccion del paso 5, tres veces en un dia—; un contrafactico
// medido en la misma corrida, no.
//
// COMO SE APAGA EL ENSANCHE EN LA PASADA `off`: se muta el objeto que `require`
// ya tiene en cache para data/decreto/capa_consultada.json, ANTES de que
// ningun modulo de produccion lo lea. NO SE TOCA EL ARCHIVO EN DISCO — el
// script comprueba su sha256 al principio y al final de cada pasada y aborta si
// se movio. Cada polaridad corre en su propio proceso porque `ensancheVigente`
// memoriza el resultado en la primera consulta.
//
//   node scripts/e3_verificacion_paso6.js
//   node scripts/e3_verificacion_paso6.js --pasada off   (uso interno)
//
// Salida: exit 0 si ninguna bandera se movio donde no debia y el ensanche no
// agrego ninguna bahia a una ruta maritima; exit 1 si algo se movio.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(RAIZ, '.env') });

const RUTA_CAPA = path.join(RAIZ, 'data', 'decreto', 'capa_consultada.json');
const DIR_EVID = path.join(RAIZ, '_bitacoras', 'e3_paso6_2026-08-13');
const RUTA_WPS = path.join(DIR_EVID, '02_rutas_waypoints.json');
const RUTA_CRUDO = path.join(DIR_EVID, '01_sitport_crudo');

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const L = (...a) => console.log(...a);
const ordenado = (s) => [...s].map(Number).sort((a, b) => a - b);

// ═════════════════════════════════════════════════════════════════════════════
// LAS RUTAS.
//
// Las diez primeras son EL ARNES DE E0.2 tal como esta escrito en
// scripts/e02_verificacion_e2e.js — mismos puntos, mismos nombres, para que la
// comparacion con aquella medicion sea la misma ruta y no una parecida. Las
// tres ultimas son lacustres y existen para este paso:
//   · Llanquihue reproduce la medicion de aceptacion del paso 5;
//   · Panguipulli y General Carrera son las dos que el paso 5 dejo anotadas —
//     la restriccion lacustre real y la 257.
// ═════════════════════════════════════════════════════════════════════════════
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

const RUTEADAS = [
  ['Anahuac -> Melinka', 'ANAHUAC', 'MELINKA', 'maritima'],
  ['Anahuac -> Quellon', 'ANAHUAC', 'QUELLON', 'maritima'],
  ['Anahuac -> Chacabuco', 'ANAHUAC', 'CHACABUCO', 'maritima'],
  ['Ancud -> Castro (mar interior)', 'ANCUD', 'CASTRO', 'maritima'],
  ['Chonchi -> Chaiten (Corcovado)', 'CHONCHI', 'CHAITEN', 'maritima'],
  ['Arica -> Iquique (norte)', 'ARICA', 'IQUIQUE', 'maritima'],
  ['Valparaiso -> San Antonio', 'VALPARAISO', 'SAN_ANTONIO', 'maritima'],
  ['Punta Arenas -> Pto Williams', 'PUNTA_ARENAS', 'PTO_WILLIAMS', 'maritima'],
];

// DE DONDE SALE CADA TRAMO DIRECTO, porque no todos valen lo mismo como prueba:
//
//   · las dos primeras son EL ARNES DE E0.2, elegidas antes de que esta capa
//     existiera. Son las unicas independientes de lo que se esta midiendo, y por
//     eso la del Lago Villarrica es la evidencia que mas pesa: nadie la dibujo
//     para que pasara.
//   · la del Llanquihue es la de la aceptacion del paso 5, transcrita igual para
//     que sus numeros se puedan comparar al milesimo.
//   · las SEIS de `cuerda dentro de` se derivaron de la propia capa publicada
//     —el diametro del circulo maximo inscrito en su parte mayor, al 70%—, y eso
//     hay que decirlo: para el MATCHING son circulares por construccion (una
//     ruta dibujada dentro del poligono lo va a intersectar). No lo son para lo
//     que si prueban, que es todo lo que viene despues: que el join expande esa
//     jurisdiccion a SUS bahias, que el contacto sale del decreto, que la
//     cobertura deja de ver un hueco, y que el filtro por ambito no deja entrar
//     nada de un ambito no publicado. Existen para cubrir las SEIS lacustres y
//     no solo la que la aceptacion nombra.
//   · el ultimo es un CONTROL NEGATIVO y salio de un error propio: fue el primer
//     tramo que escribi a mano creyendo que caia en el Lago Panguipulli, y cae
//     entre dos lagos. Se conserva porque mide lo que ninguna de las otras mide
//     — que el ensanche NO reclama lo que no tiene: 0 bahias, causa (b), U.
const DIRECTAS = [
  ['Lago Villarrica: bahia 210 -> 209 (arnes E0.2)', 'lacustre',
    [{ lat: -39.2883, lng: -72.2195 }, { lat: -39.2833, lng: -71.9667 }]],
  ['Antartica: bahia 139 Fildes -> 231 Chile (arnes E0.2)', 'antartica',
    [{ lat: -62.2, lng: -58.9667 }, { lat: -62.4667, lng: -59.6833 }]],
  ['Lago Llanquihue (aceptacion del paso 5)', 'lacustre',
    [{ lat: -41.12, lng: -72.90 }, { lat: -41.20, lng: -72.70 }]],
  ['cuerda dentro de puerto_varas', 'lacustre',
    [{ lat: -41.12319, lng: -72.87963 }, { lat: -41.12319, lng: -72.71892 }]],
  ['cuerda dentro de lago_villarrica', 'lacustre',
    [{ lat: -39.25412, lng: -72.10852 }, { lat: -39.25412, lng: -72.04390 }]],
  ['cuerda dentro de lago_panguipulli', 'lacustre',
    [{ lat: -39.52010, lng: -72.17273 }, { lat: -39.52010, lng: -72.14166 }]],
  ['cuerda dentro de lago_ranco', 'lacustre',
    [{ lat: -40.24812, lng: -72.53782 }, { lat: -40.24812, lng: -72.46954 }]],
  ['cuerda dentro de lago_general_carrera', 'lacustre',
    [{ lat: -46.45536, lng: -71.97990 }, { lat: -46.45536, lng: -71.91818 }]],
  ['cuerda dentro de lago_rapel', 'lacustre',
    [{ lat: -34.14431, lng: -71.41667 }, { lat: -34.14431, lng: -71.39754 }]],
  ['CONTROL NEGATIVO: entre lagos, fuera de toda jurisdiccion publicada', 'control',
    [{ lat: -39.72, lng: -72.20 }, { lat: -39.80, lng: -72.05 }]],
  // EL TRAMO RECTO DEL PASO 5, y esta aca para que un numero no se lea como una
  // regresion. El paso 5 y la mordida del cableado miden "Anahuac -> Melinka"
  // como una RECTA de dos puntos (14 bahias, 22,0256 km); este script la mide
  // RUTEADA por el raster router, que es la geometria que el backend recibe de
  // verdad, y da otro numero. Las dos son correctas y miden rutas distintas. Se
  // corren las dos para que la diferencia quede medida y no argumentada (§2).
  ['Anahuac -> Melinka (recta de 2 puntos, como el paso 5)', 'maritima',
    [{ lat: -41.48607231899996, lng: -72.97656408099994 },
     { lat: -43.89816864699998, lng: -73.74786402599995 }]],
];

// La bandera medida ANTES de construir E0.2 (2026-08-11), transcrita de
// scripts/e02_verificacion_e2e.js. Se usa como TERCERA referencia, no como
// criterio: el criterio es el contrafactico de esta misma corrida. Sirve para
// ver si algo se movio entre el 2026-08-11 y hoy por cualquier otra causa.
const BANDERA_E02 = {
  'Anahuac -> Melinka': 'Q',
  'Anahuac -> Quellon': 'Q',
  'Anahuac -> Chacabuco': 'Q',
  'Ancud -> Castro (mar interior)': 'Q',
  'Chonchi -> Chaiten (Corcovado)': 'Q',
  'Arica -> Iquique (norte)': 'Q',
  'Valparaiso -> San Antonio': 'Q',
  'Punta Arenas -> Pto Williams': 'U',
  'Lago Villarrica: bahia 210 -> 209 (arnes E0.2)': 'U',
  'Antartica: bahia 139 Fildes -> 231 Chile (arnes E0.2)': 'U',
};

// ═════════════════════════════════════════════════════════════════════════════
// PASADA (proceso hijo): mide todas las rutas con la polaridad que le toca.
// ═════════════════════════════════════════════════════════════════════════════
async function pasada(polaridad) {
  const shaAntes = sha(RUTA_CAPA);

  // El interruptor, apagado en MEMORIA para la pasada `off`. Tiene que pasar
  // antes de requerir cualquier modulo de produccion: `ensancheVigente` lee el
  // mismo objeto de la cache de require y memoriza el resultado.
  const decl = require(RUTA_CAPA);
  if (polaridad === 'off') decl.capa_publicada_por_ambito.consultada = false;

  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  const {
    medirCoberturaRuta, componerAvisos, capaJurisdiccionesVigente,
    ensancheVigente, bahiasDelEnsanche,
  } = require(path.join(RAIZ, 'src/services/cobertura-jurisdiccional'));
  const { capitaniaDeBahia } = require(path.join(RAIZ, 'src/services/capitania-de-bahia'));

  const rutas = JSON.parse(fs.readFileSync(RUTA_WPS, 'utf8'));
  const ens = await ensancheVigente(pool);
  const capa = await capaJurisdiccionesVigente(pool);
  const salida = { polaridad, ensanche: ens, capa, rutas: {} };

  for (const r of rutas.rutas) {
    const geojson = JSON.stringify({
      type: 'LineString', coordinates: r.waypoints.map(w => [w.lng, w.lat]),
    });
    // El teselado, preguntado igual que lo pregunta bahiasEnRutaPostGIS.
    const { rows } = await pool.query(
      `SELECT bahia_id FROM "${capa}" WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))`,
      [geojson]);
    const teselado = new Set(rows.map(x => x.bahia_id));
    const extra = ens ? await bahiasDelEnsanche(pool, geojson, ens) : new Set();
    const total = new Set([...teselado, ...extra]);

    const med = await medirCoberturaRuta(pool, r.waypoints);
    const { avisos, defectos, bandera_cobertura } = await componerAvisos(med, pool);
    const km = (xs) => +xs.reduce((a, x) => a + x.largo_km, 0).toFixed(6);

    salida.rutas[r.nombre] = {
      ambito: r.ambito,
      largo_km: med.largo_ruta_km,
      teselado: ordenado(teselado),
      ensanche_agrega: ordenado([...extra].filter(b => !teselado.has(b))),
      total: ordenado(total),
      bandera: bandera_cobertura,
      avisos: avisos.length,
      avisos_km: km(avisos),
      avisos_detalle: avisos.map(a => ({
        causa: a.causa, origen: a.origen, ambito: a.ambito_no_publicado,
        km: a.largo_km, capitanias: a.capitanias.map(c => c.nombre),
      })),
      defectos: defectos.length,
      defectos_km: km(defectos),
      defectos_tipos: defectos.map(d => d.tipo),
      piezas_descubiertas: med.piezas.length,
      km_descubiertos: km(med.piezas),
      // El contacto que el motor le mostraria al patron por cada bahia que la
      // ruta trae. Sale de capitania-de-bahia.js, el mismo que usa la ruta.
      contacto: ordenado(total).map(b => {
        const c = capitaniaDeBahia(Number(b), ens ? ens.ambitos : []);
        return { bahia: Number(b), capitania: c.capitania, telefono: c.telefono, fuente: c.capitania_fuente };
      }),
    };
  }

  await pool.end();
  if (sha(RUTA_CAPA) !== shaAntes) {
    throw new Error('capa_consultada.json SE MOVIO EN DISCO durante la pasada. El apagado tenia que ser en memoria.');
  }
  salida.sha_capa_consultada = shaAntes;
  process.stdout.write('\n===JSON===\n' + JSON.stringify(salida) + '\n');
}

// ═════════════════════════════════════════════════════════════════════════════
// PADRE.
// ═════════════════════════════════════════════════════════════════════════════

/** Rutea las 8 reales UNA sola vez y deja los waypoints en disco. Las dos
 *  pasadas tienen que medir la MISMA geometria: si cada una ruteara por su
 *  cuenta, una diferencia entre pasadas podria venir del ruteo y no del
 *  ensanche, y la comparacion mediria otra cosa (CLAUDE.md §2). */
function construirWaypoints() {
  if (fs.existsSync(RUTA_WPS)) {
    L(`waypoints: se reutiliza ${path.relative(RAIZ, RUTA_WPS)} (sha256 ${sha(RUTA_WPS).slice(0, 16)}…)`);
    return;
  }
  const { warmup, calcularRuta } = require(path.join(RAIZ, 'src/services/raster-router-service'));
  const { construirPerfilCosto } = require(path.join(RAIZ, 'src/config/perfiles-costo'));
  warmup('AUSTRAL_N');
  const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });

  const rutas = [];
  for (const [nombre, a, b, ambito] of RUTEADAS) {
    const r = calcularRuta(perfil, PUNTOS[a], PUNTOS[b]);
    if (!r.ok) {
      L(`  ${nombre}: RUTEO FALLIDO (${r.error}) — se registra y no se mide.`);
      rutas.push({ nombre, ambito, ruteo: 'fallido', error: r.error, waypoints: [] });
      continue;
    }
    const waypoints = r.tramos.filter(t => t.tipo !== 'aproximacion_final')
      .flatMap(t => t.coords).map(c => ({ lat: c[1], lng: c[0] }));
    rutas.push({ nombre, ambito, ruteo: 'ok', waypoints });
    L(`  ${nombre}: ${waypoints.length} waypoints`);
  }
  for (const [nombre, ambito, waypoints] of DIRECTAS) {
    rutas.push({ nombre, ambito, ruteo: 'directa', waypoints });
    L(`  ${nombre}: ${waypoints.length} waypoints (directa)`);
  }
  fs.mkdirSync(DIR_EVID, { recursive: true });
  fs.writeFileSync(RUTA_WPS, JSON.stringify({
    generado_por: 'scripts/e3_verificacion_paso6.js',
    que_es: 'Los waypoints exactos sobre los que corren las dos pasadas del paso 6. Se rutea una sola vez para que la comparacion mida el ensanche y no el ruteo.',
    perfil: { calado_m: 1.2, licencia: 'PNM', tile: 'AUSTRAL_N' },
    rutas,
  }, null, 1));
  L(`waypoints: escrito ${path.relative(RAIZ, RUTA_WPS)}`);
}

function correrPasada(polaridad) {
  const out = execFileSync(process.execPath, [__filename, '--pasada', polaridad], {
    cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const i = out.indexOf('\n===JSON===\n');
  if (i === -1) throw new Error(`la pasada '${polaridad}' no emitio su JSON:\n${out}`);
  const previo = out.slice(0, i).trim();
  if (previo) fs.writeFileSync(path.join(DIR_EVID, `03_pasada_${polaridad}.txt`), previo);
  return JSON.parse(out.slice(i + 12));
}

/** El alcance de A3: que reparticiones entran a la ruta por el Set, con el
 *  ensanche y sin el, y que le cambia eso al control. Se corre con la captura
 *  cruda versionada de SITPORT, que es la foto contra la que se lee todo este
 *  paso. */
function alcanceDrift(off, on) {
  const leer = (n) => JSON.parse(fs.readFileSync(path.join(RUTA_CRUDO, `${n}.json`), 'utf8'));
  const { construirResolutorCapitania, reparticionesDeRuta, evaluarDriftEnRuta } =
    require(path.join(RAIZ, 'src/services/drift-ambito-a'));
  const { leerBahiaCoords } = require(path.join(RAIZ, 'src/services/catalogo-bahias'));

  const resolver = construirResolutorCapitania({
    consultaBahias: leer('consultaBahias'),
    consultaCapuertoRestriccion: leer('consultaCapuertoRestriccion'),
    totalGeneral: leer('totalGeneral'),
  });
  const coords = leerBahiaCoords(path.join(RAIZ, 'src/routes/sitport-routes.js'));
  const transito = leer('consultaRestricciones').filter(r => r.tipo && r.tipo.trim() === 'TODOS');
  const desconocidas = transito
    .filter(r => !coords.has(Number(r.bahia)))
    .map(r => ({ id_bahia: Number(r.bahia), origen: 'consultaRestricciones', nombre: r.GLBahia || null }));

  const filas = [];
  for (const nombre of Object.keys(on.rutas)) {
    const a = new Set(off.rutas[nombre].total);
    const b = new Set(on.rutas[nombre].total);
    const repsOff = reparticionesDeRuta(a, resolver);
    const repsOn = reparticionesDeRuta(b, resolver);
    const nuevas = [...repsOn].filter(r => !repsOff.has(r));
    const dOff = evaluarDriftEnRuta({ registros: desconocidas, idsEnRuta: a, resolver });
    const dOn = evaluarDriftEnRuta({ registros: desconocidas, idsEnRuta: b, resolver });
    filas.push({
      nombre, ambito: on.rutas[nombre].ambito,
      reps_off: repsOff.size, reps_on: repsOn.size, reps_nuevas: nuevas,
      avisos_off: dOff.total, avisos_on: dOn.total,
      defectos_off: dOff.defectos_registrados, defectos_on: dOn.defectos_registrados,
    });
  }
  // ── LA 257, y hay que decir exactamente que se ejerce y que no ──────────────
  // La 257 (Rio Cochrane) es la unica entrada del join que no esta en
  // BAHIA_COORDS: entra al matching y `sitport-routes.js:737` no la lista,
  // porque sin coordenada no se la puede ubicar en el orden de transito. Quien
  // responde por ella es A3.
  //
  // LO QUE NO SE PUEDE MEDIR EN VIVO HOY, dicho antes que el resultado: SITPORT
  // NO publica ninguna restriccion bajo la 257 en la captura de esta sesion, y
  // fabricar una para "verla en pantalla" seria inventar el dato (§3.2). Lo que
  // se ejerce aca es EL MECANISMO, con un registro SINTETICO y declarado como
  // tal: si SITPORT publicara bajo la 257, ¿el ensanche hace que A3 pase de
  // registrar el defecto en silencio a AVISAR? Eso no es dato de la fuente, es
  // el control mordiendo, y se mide con la misma funcion que corre en produccion.
  const SINTETICO = [{
    id_bahia: 257, origen: 'REGISTRO SINTETICO DE LA VERIFICACION (no es dato de SITPORT)',
    nombre: 'RIO COCHRANE',
  }];
  const carrera = Object.keys(on.rutas).find(n => n.includes('lago_general_carrera'));
  const r257 = {
    resuelto: resolver(257),
    publicada_hoy: transito.some(r => Number(r.bahia) === 257),
    en_bahia_coords: coords.has(257),
    ruta: carrera,
    off: carrera ? evaluarDriftEnRuta({ registros: SINTETICO, idsEnRuta: new Set(off.rutas[carrera].total), resolver }) : null,
    on: carrera ? evaluarDriftEnRuta({ registros: SINTETICO, idsEnRuta: new Set(on.rutas[carrera].total), resolver }) : null,
  };

  return { desconocidas, transito: transito.length, filas, r257 };
}

async function fundamento() {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  const decl = require(RUTA_CAPA);
  const capa = decl.capa_jurisdicciones;
  const { rows } = await pool.query(`
    WITH v AS (SELECT ST_Union(geom) g FROM "${capa}")
    SELECT j.id,
           ST_Area(j.geom::geography)/1e6                                   AS km2_lago,
           COALESCE(ST_Area(ST_Intersection(j.geom, v.g)::geography), 0)/1e6 AS km2_traslape,
           ST_Distance(j.geom::geography, v.g::geography)/1000.0            AS km_a_la_vigente
      FROM jurisdicciones_ds991 j, v
     WHERE j.ambito = 'lacustre'
     ORDER BY j.id`);
  const { rows: cnt } = await pool.query(`SELECT count(*)::int n FROM "${capa}"`);
  await pool.end();
  return { capa, celdas: cnt[0].n, filas: rows };
}

(async () => {
  const iPasada = process.argv.indexOf('--pasada');
  if (iPasada !== -1) return pasada(process.argv[iPasada + 1]);

  L('E3 — PASO 6: VERIFICACION DE PUNTA A PUNTA Y REGRESION');
  L(`fecha: ${new Date().toISOString()}`);
  L('shell del agente: Git Bash / Windows. Reproducible por el owner, en PowerShell:');
  L('    cd C:\\Users\\katia\\tmarea-backend');
  L('    node scripts\\e3_verificacion_paso6.js');
  L('');

  L('── 0. LAS RUTAS ' + '─'.repeat(60));
  construirWaypoints();
  const shaCapaAntes = sha(RUTA_CAPA);

  L('');
  L('── 1. LAS DOS PASADAS ' + '─'.repeat(55));
  L('  corriendo la pasada OFF (ensanche apagado en memoria)…');
  const off = correrPasada('off');
  L('  corriendo la pasada ON (el cableado tal como esta)…');
  const on = correrPasada('on');
  if (sha(RUTA_CAPA) !== shaCapaAntes) throw new Error('capa_consultada.json se movio en disco.');
  L(`  capa_consultada.json intacto: sha256 ${shaCapaAntes.slice(0, 24)}…`);
  L(`  ensanche OFF = ${JSON.stringify(off.ensanche)}`);
  L(`  ensanche ON  = ${JSON.stringify(on.ensanche)}`);
  if (off.ensanche !== null) throw new Error('la pasada OFF no apago el ensanche.');
  if (!on.ensanche) throw new Error('la pasada ON no tiene el ensanche activo: el cableado esta apagado en el archivo.');

  L('');
  L('── 2. RUTA POR RUTA ' + '─'.repeat(57));
  const problemas = [];
  const tabla = [];
  for (const nombre of Object.keys(on.rutas)) {
    const a = off.rutas[nombre], b = on.rutas[nombre];
    const movio = a.bandera !== b.bandera;
    const agrega = b.ensanche_agrega.length;
    const e02 = BANDERA_E02[nombre];
    tabla.push({ nombre, ambito: b.ambito, agrega, banderaOff: a.bandera, banderaOn: b.bandera, e02 });

    L('');
    L(`  ${nombre}   [${b.ambito}]`);
    L(`    largo                 ${b.largo_km === null ? 'n/d' : b.largo_km.toFixed(4) + ' km'}`);
    L(`    Set teselado          ${a.teselado.length} {${a.teselado.join(',')}}`);
    L(`    ensanche agrega       ${agrega}${agrega ? ' {' + b.ensanche_agrega.join(',') + '}' : ''}`);
    L(`    Set total             ${a.total.length} -> ${b.total.length}`);
    L(`    km descubiertos       ${a.km_descubiertos} -> ${b.km_descubiertos}`);
    L(`    avisos                ${a.avisos} (${a.avisos_km} km) -> ${b.avisos} (${b.avisos_km} km)`);
    L(`    defectos              ${a.defectos} (${a.defectos_km} km) -> ${b.defectos} (${b.defectos_km} km)`);
    L(`    bandera de cobertura  ${a.bandera} -> ${b.bandera}   ${movio ? '*** SE MOVIO ***' : '(igual)'}` +
      (e02 ? `   [E0.2 2026-08-11: ${e02}]` : ''));
    for (const av of b.avisos_detalle) {
      L(`      aviso ON  ${av.km} km · causa ${av.causa} · origen ${av.origen}` +
        `${av.ambito ? ` · ambito ${av.ambito}` : ''} · ${JSON.stringify(av.capitanias)}`);
    }
    if (agrega > 0) {
      for (const c of b.contacto) {
        L(`      contacto  bahia ${String(c.bahia).padStart(3)} -> ${String(c.capitania).padEnd(22)} ` +
          `${String(c.telefono).padEnd(18)} fuente: ${c.fuente}`);
      }
    }

    if (b.ambito !== 'lacustre') {
      if (agrega !== 0) problemas.push(`${nombre}: el ensanche agrego ${agrega} bahia(s) a una ruta ${b.ambito}`);
      if (movio) problemas.push(`${nombre}: la bandera de una ruta ${b.ambito} se movio ${a.bandera} -> ${b.bandera}`);
      if (a.km_descubiertos !== b.km_descubiertos) {
        problemas.push(`${nombre}: los km descubiertos de una ruta ${b.ambito} se movieron ${a.km_descubiertos} -> ${b.km_descubiertos}`);
      }
    }
  }

  L('');
  L('── 3. EL FUNDAMENTO DECLARADO, MEDIDO ' + '─'.repeat(39));
  L('  El plan declara que el cambio es ADITIVO porque "la capa vigente cubre 0,0000 km2');
  L('  de los seis lagos y lo mas cercano esta entre 16 y 84 km". Se mide, no se repite:');
  const f = await fundamento();
  L(`  capa vigente: ${f.capa} (${f.celdas} celdas)`);
  L('');
  L('    jurisdiccion lacustre     km2 del lago   km2 traslapados   km a la celda mas cercana');
  let traslapeTotal = 0, distMin = Infinity, distMax = -Infinity;
  for (const r of f.filas) {
    traslapeTotal += Number(r.km2_traslape);
    distMin = Math.min(distMin, Number(r.km_a_la_vigente));
    distMax = Math.max(distMax, Number(r.km_a_la_vigente));
    L(`    ${r.id.padEnd(24)} ${Number(r.km2_lago).toFixed(3).padStart(12)} ` +
      `${Number(r.km2_traslape).toFixed(4).padStart(17)} ${Number(r.km_a_la_vigente).toFixed(3).padStart(27)}`);
  }
  L('');
  L(`    traslape total: ${traslapeTotal.toFixed(6)} km2 · distancias: de ${distMin.toFixed(3)} a ${distMax.toFixed(3)} km`);
  if (traslapeTotal > 1e-6) problemas.push(`la capa vigente traslapa ${traslapeTotal} km2 con lo lacustre: el fundamento "aditivo" deja de sostenerse solo`);

  L('');
  L('── 4. EL ALCANCE NUEVO DEL CONTROL DE DRIFT (A3) ' + '─'.repeat(28));
  const d = alcanceDrift(off, on);
  L(`  restricciones de transito en la captura: ${d.transito}`);
  L(`  de esas, bajo una bahia que el catalogo NO conoce: ${d.desconocidas.length}` +
    `${d.desconocidas.length ? ' -> ' + d.desconocidas.map(x => `${x.id_bahia} ${x.nombre}`).join(' · ') : ' (ninguna)'}`);
  L('');
  L('    ruta                                        reps OFF  reps ON  nuevas          avisos A3');
  for (const r of d.filas) {
    L(`    ${r.nombre.slice(0, 42).padEnd(42)} ${String(r.reps_off).padStart(8)} ${String(r.reps_on).padStart(8)}  ` +
      `${(r.reps_nuevas.join(',') || '—').padEnd(14)} ${r.avisos_off} -> ${r.avisos_on}`);
  }

  L('');
  L('── 4 bis. LA BAHIA 257 ' + '─'.repeat(54));
  const q = d.r257;
  L(`  257 en BAHIA_COORDS               : ${q.en_bahia_coords} (por eso no se lista en transito)`);
  L(`  SITPORT publica bajo la 257 hoy   : ${q.publicada_hoy}`);
  L(`  A3 la resuelve a                  : ${q.resuelto ? `${q.resuelto.capitania} (reparticion ${q.resuelto.reparticion}, via ${q.resuelto.via})` : 'NO RESUELVE'}`);
  L(`  ruta usada                        : ${q.ruta}`);
  if (q.off && q.on) {
    L('  EJERCICIO DEL MECANISMO con un registro SINTETICO — no es dato de SITPORT:');
    L(`    con el ensanche APAGADO : avisos ${q.off.total} · defectos ${q.off.defectos_registrados} · ` +
      `causa ${q.off.avisos.length ? q.off.avisos[0].causa : (q.off.defectos[0] ? q.off.defectos[0].tipo + (q.off.defectos[0].fuera_de_ruta ? ' (fuera de la ruta)' : '') : '—')} · bandera ${q.off.bandera}`);
    L(`    con el ensanche ACTIVO  : avisos ${q.on.total} · defectos ${q.on.defectos_registrados} · ` +
      `causa ${q.on.avisos.length ? q.on.avisos[0].causa : (q.on.defectos[0] ? q.on.defectos[0].tipo + (q.on.defectos[0].fuera_de_ruta ? ' (fuera de la ruta)' : '') : '—')} · bandera ${q.on.bandera}`);
    if (q.off.total === 0 && q.on.total === 1) {
      L('    -> se cumple lo que el paso 4 dejo medido: de DEFECTO REGISTRADO a DEFECTO + AVISO.');
    } else {
      problemas.push(`la 257 no paso de defecto a defecto+aviso: off=${q.off.total} on=${q.on.total}`);
    }
  }

  L('');
  L('── 5. VEREDICTO ' + '─'.repeat(61));
  L('');
  L('    ruta                                        ambito     ensanche  bandera OFF->ON   E0.2');
  for (const t of tabla) {
    L(`    ${t.nombre.slice(0, 42).padEnd(42)} ${t.ambito.padEnd(10)} ${String(t.agrega).padStart(8)}  ` +
      `${t.banderaOff} -> ${t.banderaOn}${t.banderaOff !== t.banderaOn ? ' SE MOVIO' : '        '}   ${t.e02 || '—'}`);
  }
  L('');
  const maritimas = tabla.filter(t => t.ambito !== 'lacustre');
  L(`  rutas medidas: ${tabla.length} · de ambito no lacustre: ${maritimas.length}`);
  L(`  banderas no lacustres movidas: ${maritimas.filter(t => t.banderaOff !== t.banderaOn).length}`);
  L(`  bahias que el ensanche agrego a una ruta no lacustre: ${maritimas.reduce((s, t) => s + t.agrega, 0)}`);
  L('');
  if (problemas.length === 0) {
    L('  NINGUNA BANDERA NO LACUSTRE SE MOVIO Y EL ENSANCHE NO AGREGO NADA FUERA DE LO LACUSTRE.');
    L('  El fundamento declarado del plan queda MEDIDO, no repetido.');
  } else {
    L('  ATENCION — el paso 6 encontro lo siguiente:');
    for (const p of problemas) L(`    · ${p}`);
  }

  fs.writeFileSync(path.join(DIR_EVID, '04_comparacion.json'),
    JSON.stringify({ off, on, fundamento: f, drift: d, problemas }, null, 1));
  process.exit(problemas.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('VERIFICACION ABORTADA:', e.message, '\n', e.stack);
  process.exit(1);
});
