// ─────────────────────────────────────────────────────────────────────────────
// (a1) · PIEZA 2 · LA CORRECCION DE LA BASE
//
// ESTE ES EL UNICO INSTRUMENTO DE LA SESION QUE ESCRIBE EN `nodos_maritimos`.
//
//   node 02_corregir_nodos.js              -> VERIFICA y no escribe (por defecto)
//   node 02_corregir_nodos.js --aplicar    -> escribe, dentro de UNA transaccion
//   node 02_corregir_nodos.js --revertir   -> devuelve los once al estado PREVIO
//
// POR QUE EXISTE --revertir, y no es un lujo: la base NO ESTA VERSIONADA. Si esta
// correccion sale mal, no hay `git revert` que la deshaga — el unico camino de
// vuelta es este instrumento. Y el estado previo esta embebido abajo, asi que la
// vuelta es exacta y no reconstruida.
//
// POR QUE EL DEFECTO ES NO ESCRIBIR: la base no esta versionada. Un instrumento
// que escribe por omision no tiene vuelta atras y no deja donde mirar.
//
// QUE CORRIGE, Y ES DOBLE — las dos partes van juntas y esto no es ampliar el
// alcance, es lo que 01_ midio:
//   (a1) la GEOMETRIA de los once, a la coordenada de `caletas_chile.json`.
//        Los DOS ejes: el `lng` esta corrido ~6 grados y la `lat` entre 38,4 y
//        44,5 km al sur. Con solo el `lng`, 01_ mide que se mueven CERO filas.
//   (a2) el ANCLA de los once, a NULL. `la_geografia_coincide` es `true` en las
//        doce filas de `bahia_declarada_lejos`: el ancla ES la bahia mas cercana
//        al punto equivocado, o sea que no es un dato independiente — es el
//        error propagado. Dejarla puesta es lo que hace que (a1) valga cero.
//        AUTORIZADA POR EL OWNER EL 2026-08-19. Se reabrio porque cambio la
//        evidencia, no porque cambio de opinion nadie.
//
// EL TRIGGER — lo encontro este mismo instrumento, al hacer ROLLBACK en la
// primera corrida con --aplicar. `trg_jurisdiccion_auto` es un
// BEFORE INSERT OR UPDATE OF geom que corre `asignar_jurisdiccion_sitport()`:
//     SELECT bahia_id INTO NEW.bahia_sitport_id
//     FROM bahia_jurisdicciones WHERE ST_Intersects(NEW.geom, geom) LIMIT 1;
// O sea que PISA el ancla cada vez que alguien mueve el punto. Un UPDATE que
// toque `geom` y `bahia_sitport_id` en la misma sentencia NO PUEDE dejar el
// ancla en NULL: el trigger la vuelve a poner despues.
// POR ESO VAN DOS SENTENCIAS, en esta transaccion y en este orden:
//   (i)  UPDATE de `geom` — el trigger corre y pone lo que le da la gana;
//   (ii) UPDATE de `bahia_sitport_id` SOLO — no menciona `geom`, asi que el
//        trigger NO se dispara y el NULL queda.
// Lo que el trigger asigno en (i) queda registrado abajo, no se tapa.
//
// LO QUE NO HACE: no borra filas, no toca los otros 770 nodos, no toca el
// artefacto, no toca `src/` y NO TOCA EL TRIGGER. La re-derivacion es 04_.
//
// IDEMPOTENCIA: corrido dos veces, la segunda detecta el estado ya corregido,
// dice que no hay nada que hacer y sale 0 sin abrir transaccion.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
require('dotenv').config();
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { Pool } = require('pg');

const BACK = 'C:/Users/katia/tmarea-backend';
const RUTA_TSV = path.join(__dirname, '03_antes_despues.tsv');
const APLICAR = process.argv.includes('--aplicar');
const REVERTIR = process.argv.includes('--revertir');

// LA EVIDENCIA NO SE PISA. `02_corregir_nodos.txt` guarda LA CORRIDA QUE ESCRIBIO,
// y nada mas. Una corrida que no cambia la base —verificar, o un --aplicar sobre
// una base ya corregida— escribe al fichero `_sin_efecto`. Esto no es cosmetica:
// la primera version pisaba el registro de la aplicacion con el de la idempotencia,
// y el unico registro de que se escribio la base desaparecia en la corrida siguiente.
const SALIDA_APLICADA = path.join(__dirname, '02_corregir_nodos.txt');
const SALIDA_SIN_EFECTO = path.join(__dirname, '02_corregir_nodos_sin_efecto.txt');
let escribio = false;

// ── EL ESTADO PREVIO, EMBEBIDO ──────────────────────────────────────────────
// Si la base no esta EXACTAMENTE asi, no se escribe nada. No es paranoia: el
// unico registro de lo que habia antes es este fichero.
const ANTES = {
  653: { lat: -28.823795, lng: -77.231492, anc: 90, nombre: 'Huasco' },
  654: { lat: -27.415729, lng: -76.829464, anc: 158, nombre: 'Puerto De Caldera Mejoras Fiscales' },
  655: { lat: -27.687595, lng: -76.947172, anc: 158, nombre: 'Puerto Viejo' },
  // El nombre del 656 trae DOS caracteres raros y va escrito con escapes para que
  // este fichero no los lleve crudos: U+00E3 (mojibake de la enye) y U+0091, que
  // es un CONTROL C1. `limpiarNombre` del lector solo barre \r \n \t, asi que el
  // U+0091 sobrevive al indice. Ver H-8 en la bitacora. El lugar se llama Chanaral.
  656: { lat: -26.696806, lng: -76.638227, anc: 157, nombre: 'San Pedro Cha\u00e3\u0091Aral De Las Animas' },
  657: { lat: -30.571551, lng: -77.439966, anc: 90, nombre: 'Guanaqueros' },
  658: { lat: -29.619181, lng: -77.472042, anc: 90, nombre: 'Punta Choros B Los Corrales' },
  659: { lat: -33.417206, lng: -77.644258, anc: 90, nombre: 'El Membrillo' },
  660: { lat: -33.427059, lng: -77.602478, anc: 90, nombre: 'Portales' },
  661: { lat: -33.313404, lng: -77.529192, anc: 90, nombre: 'San Pedro Con Con' },
  662: { lat: -33.134386, lng: -77.501974, anc: 90, nombre: 'Ventanas' },
  663: { lat: -34.363123, lng: -77.891296, anc: 90, nombre: 'Matanzas' },
};

// ── EL ESTADO POSTERIOR, EMBEBIDO Y ADEMAS COTEJADO CONTRA LA FUENTE ────────
// Los valores van escritos acá Y se exige que `caletas_chile.json` siga
// diciendo lo mismo. Si el fichero cambiara, el instrumento para: una fuente
// que se mueve entre dos corridas no es una fuente.
const DESPUES = {
  653: { cal: 'CAL-0078', lat: -28.460872, lng: -71.224055 },
  654: { cal: 'CAL-0076', lat: -27.06394, lng: -70.823869 },
  655: { cal: 'CAL-0082', lat: -27.334874, lng: -70.941229 },
  656: { cal: 'CAL-0074', lat: -26.351827, lng: -70.633371 },
  657: { cal: 'CAL-0134', lat: -30.194365, lng: -71.431134 },
  658: { cal: 'CAL-0109', lat: -29.246534, lng: -71.468394 },
  659: { cal: 'CAL-0210', lat: -33.02215, lng: -71.632543 },
  660: { cal: 'CAL-0214', lat: -33.031146, lng: -71.590059 },
  661: { cal: 'CAL-0206', lat: -32.918841, lng: -71.518234 },
  662: { cal: 'CAL-0192', lat: -32.740921, lng: -71.490708 },
  663: { cal: 'CAL-0250', lat: -33.962747, lng: -71.877457 },
};
const IDS = Object.keys(ANTES).map(Number).sort((a, b) => a - b);

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det ? ' · ' + det : ''));
  else { fallas.push(n); say('  x ROJO EXIGIDO Y NO SALIO · ' + n + (det ? ' · ' + det : '')); }
};
const cerrar = async (pool) => {
  if (pool) await pool.end().catch(() => {});
  const SALIDA = REVERTIR ? path.join(__dirname, '02_corregir_nodos_revertir.txt')
    : escribio ? SALIDA_APLICADA : SALIDA_SIN_EFECTO;
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
  console.log('\n[evidencia] ' + SALIDA + ' · ' + fs.statSync(SALIDA).size + ' bytes');
  process.exit(fallas.length ? 2 : 0);
};
// huella del universo entero: id|lat|lng|ancla de las 781, en orden de id
const huella = filas => crypto.createHash('sha256')
  .update(filas.map(r => r.id + '|' + r.lat + '|' + r.lng + '|' + r.bahia_sitport_id).join('\n')).digest('hex');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'mapa_navegacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});
// Todo lo que no sea imprimible sale como \uXXXX: un TSV versionado no lleva
// caracteres de control adentro, y el nombre del 656 trae uno (H-8).
const escapar = t => String(t).replace(/[\u0000-\u001f\u007f-\u009f]/g,
  c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const LEER = `SELECT id, nombre, fuente, fuente_id, bahia_sitport_id,
    ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng
  FROM nodos_maritimos ORDER BY id`;

(async () => {
  say('='.repeat(80));
  say('(a1) · PIEZA 2 · CORREGIR LOS ONCE EN nodos_maritimos');
  say('modo: ' + (REVERTIR ? 'REVERTIR — devuelve los once al estado previo' : APLICAR ? 'APLICAR — escribe' : 'VERIFICAR — no escribe'));
  say('corrida ' + new Date().toISOString());
  say('='.repeat(80));

  // ── 1 · LA FUENTE SIGUE DICIENDO LO MISMO ────────────────────────────────
  say('\n1 · LA FUENTE — caletas_chile.json no se movio entre corridas');
  const CAL = new Map(JSON.parse(fs.readFileSync(path.join(BACK, 'caletas_chile.json'), 'utf8')).map(c => [c.id, c]));
  let fuenteOk = true;
  for (const id of IDS) {
    const d = DESPUES[id], c = CAL.get(d.cal);
    if (!c || c.latitud !== d.lat || c.longitud !== d.lng) {
      fuenteOk = false;
      say('    #' + id + ' · ' + d.cal + ' esperaba ' + d.lat + ',' + d.lng + ' y el fichero dice ' + (c ? c.latitud + ',' + c.longitud : 'NO EXISTE'));
    }
  }
  exigir('los 11 destinos coinciden con caletas_chile.json valor por valor', fuenteOk, '11 / 11');

  // ── 2 · EL ESTADO DE PARTIDA ─────────────────────────────────────────────
  say('\n2 · ESTADO DE PARTIDA — la base tiene que estar exactamente como 01_ la dejo');
  const antesFilas = (await pool.query(LEER)).rows;
  exigir('nodos_maritimos trae 781 filas', antesFilas.length === 781, antesFilas.length + ' filas');
  const HUELLA_ANTES = huella(antesFilas);
  say('    huella del universo ANTES (sha256 de id|lat|lng|ancla de las 781): ' + HUELLA_ANTES);
  const M = new Map(antesFilas.map(r => [r.id, r]));

  let yaCorregidos = 0, comoEsperado = 0;
  for (const id of IDS) {
    const r = M.get(id), a = ANTES[id], d = DESPUES[id];
    if (!r) { exigir('el nodo ' + id + ' existe', false, 'no esta en la tabla'); continue; }
    if (r.lat === a.lat && r.lng === a.lng && r.bahia_sitport_id === a.anc) comoEsperado++;
    else if (r.lat === d.lat && r.lng === d.lng && r.bahia_sitport_id === null) yaCorregidos++;
    else {
      exigir('el nodo ' + id + ' esta en un estado conocido', false,
        'lat=' + r.lat + ' lng=' + r.lng + ' anc=' + r.bahia_sitport_id + ' — ni el previo ni el posterior');
    }
    if (r.nombre !== a.nombre) exigir('el nombre del nodo ' + id + ' es el declarado', false, JSON.stringify(r.nombre));
  }
  say('    de los 11 · en el estado PREVIO: ' + comoEsperado + ' · ya CORREGIDOS: ' + yaCorregidos);
  if (fallas.length) { say('\nESTADO DE PARTIDA DESCONOCIDO — no se escribe nada.'); await cerrar(pool); }
  if (yaCorregidos === 11 && !REVERTIR) {
    say('\n  IDEMPOTENCIA · los once ya estan corregidos. No hay nada que hacer y no se');
    say('  abre transaccion. Este instrumento no vuelve a escribir lo que ya escribio.');
    say('\n' + '='.repeat(80));
    say('SIN FALLAS — nada que aplicar.');
    say('='.repeat(80));
    await cerrar(pool);
  }
  // En --revertir el estado de partida es el CORREGIDO, no el previo: la exigencia
  // se da vuelta, porque lo que se exige es de donde se vuelve.
  if (!REVERTIR) {
    exigir('los once estan en el estado PREVIO declarado, valor por valor', comoEsperado === 11, comoEsperado + ' / 11');
  } else {
    exigir('los once estan en el estado CORREGIDO, que es de donde se vuelve', yaCorregidos === 11, yaCorregidos + ' / 11');
  }
  if (fallas.length) { say('\nNO SE ESCRIBE NADA.'); await cerrar(pool); }

  // ── 2-bis · REVERTIR ─────────────────────────────────────────────────────
  if (REVERTIR) {
    say('\n2-bis · REVERTIR — devolver los once al estado PREVIO');
    if (comoEsperado === 11) {
      say('    los once YA estan en el estado previo. Nada que revertir.');
      say('\n' + '='.repeat(80));
      say('SIN FALLAS — nada que revertir.');
      say('='.repeat(80));
      await cerrar(pool);
    }
    const cli2 = await pool.connect();
    let ok2 = false;
    try {
      await cli2.query('BEGIN');
      for (const id of IDS) {
        const a = ANTES[id];
        const r1 = await cli2.query(
          'UPDATE nodos_maritimos SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE id = $3',
          [a.lng, a.lat, id]);
        const r2 = await cli2.query('UPDATE nodos_maritimos SET bahia_sitport_id = $1 WHERE id = $2', [a.anc, id]);
        if (r1.rowCount !== 1 || r2.rowCount !== 1) { fallas.push('revertir nodo ' + id); say('  x #' + id + ' geom=' + r1.rowCount + ' ancla=' + r2.rowCount); }
        else say('  ok #' + id + ' · vuelto a (' + a.lat + ', ' + a.lng + ') ancla ' + a.anc);
      }
      if (fallas.length) throw new Error('algun revert no toco una fila');
      const dentro = (await cli2.query(LEER)).rows;
      const MD2 = new Map(dentro.map(r => [r.id, r]));
      let bien = 0;
      for (const id of IDS) {
        const r = MD2.get(id), a = ANTES[id];
        if (r && r.lat === a.lat && r.lng === a.lng && r.bahia_sitport_id === a.anc) bien++;
        else say('  x #' + id + ' quedo lat=' + (r && r.lat) + ' lng=' + (r && r.lng) + ' anc=' + (r && r.bahia_sitport_id));
      }
      exigir('los once volvieron al estado previo exacto', bien === 11, bien + ' / 11');
      const huellaVuelta = huella(dentro);
      exigir('la huella del universo vuelve a la de partida declarada',
        huellaVuelta === 'd7d8d365141370029d41c07a21b5c34c5ac137d26bc737515b251cf9e830d462', huellaVuelta);
      if (fallas.length) throw new Error('la vuelta no quedo exacta');
      await cli2.query('COMMIT');
      ok2 = true; escribio = true;
      say('\n  COMMIT · la base quedo como estaba antes de esta pieza');
    } catch (e) {
      if (!ok2) { await cli2.query('ROLLBACK').catch(() => {}); say('\n  ROLLBACK · ' + e.message); }
      fallas.push('la reversion no cerro');
    } finally { cli2.release(); }
    say('\n' + '='.repeat(80));
    say(fallas.length ? fallas.length + ' FALLA(S)' : 'SIN FALLAS — revertido.');
    say('='.repeat(80));
    await cerrar(pool);
  }

  // ── 3 · LO QUE SE VA A HACER, FILA POR FILA ──────────────────────────────
  say('\n3 · LOS ONCE UPDATE, uno por uno');
  say('    cada uno: geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)  ·  bahia_sitport_id = NULL');
  for (const id of IDS) {
    const a = ANTES[id], d = DESPUES[id];
    say('    #' + id + ' ' + a.nombre.padEnd(36).slice(0, 36)
      + ' (' + a.lat + ', ' + a.lng + ') ancla ' + String(a.anc).padStart(3)
      + '  ->  (' + d.lat + ', ' + d.lng + ') ancla NULL   [' + d.cal + ']');
  }

  if (!APLICAR) {
    say('\n  MODO VERIFICAR — no se escribio nada. Para aplicar: node 02_corregir_nodos.js --aplicar');
    say('\n' + '='.repeat(80));
    say('SIN FALLAS — verificado, no aplicado.');
    say('='.repeat(80));
    await cerrar(pool);
  }

  // ── 4 · LA TRANSACCION ───────────────────────────────────────────────────
  say('\n4 · LA TRANSACCION');
  const cli = await pool.connect();
  let commiteado = false;
  try {
    await cli.query('BEGIN');

    // (i) LA GEOMETRIA. El WHERE lleva el estado previo entero: si otra cosa lo
    // movio entre el paso 2 y este, el UPDATE no toca nada y rowCount da 0.
    say('  (i) UPDATE de geom — el trigger trg_jurisdiccion_auto va a correr');
    for (const id of IDS) {
      const d = DESPUES[id], a = ANTES[id];
      const r = await cli.query(
        `UPDATE nodos_maritimos
            SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)
          WHERE id = $3
            AND ST_Y(geom)::float8 = $4 AND ST_X(geom)::float8 = $5
            AND bahia_sitport_id IS NOT DISTINCT FROM $6`,
        [d.lng, d.lat, id, a.lat, a.lng, a.anc]);
      if (r.rowCount !== 1) { fallas.push('UPDATE de geom del nodo ' + id); say('  x el UPDATE de geom del nodo ' + id + ' toco ' + r.rowCount + ' filas, no 1'); }
      else say('  ok #' + id + ' · geom · 1 fila');
    }
    if (fallas.length) throw new Error('algun UPDATE de geom no toco exactamente una fila');

    // QUE HIZO EL TRIGGER — se mide y se publica, no se tapa.
    say('\n  QUE ESCRIBIO EL TRIGGER sobre bahia_sitport_id al mover el punto:');
    const trasTrigger = (await cli.query(LEER)).rows.filter(r => IDS.includes(r.id));
    for (const r of trasTrigger) {
      say('    #' + r.id + ' ' + escapar(r.nombre).padEnd(36).slice(0, 36) + ' -> ancla '
        + (r.bahia_sitport_id === null ? 'NULL (el punto no cae en ningun poligono)' : String(r.bahia_sitport_id)));
    }
    const puestos = trasTrigger.filter(r => r.bahia_sitport_id !== null);
    say('    el trigger puso ancla en ' + puestos.length + ' de 11'
      + (puestos.length ? ': ' + puestos.map(r => '#' + r.id + '->' + r.bahia_sitport_id).join(' ') : ''));

    // (ii) EL ANCLA. Esta sentencia NO menciona `geom`, asi que el trigger
    // —que es UPDATE OF geom— no se dispara y el NULL queda puesto.
    say('\n  (ii) UPDATE de bahia_sitport_id a NULL — sin tocar geom, el trigger no corre');
    for (const id of IDS) {
      const r = await cli.query('UPDATE nodos_maritimos SET bahia_sitport_id = NULL WHERE id = $1', [id]);
      if (r.rowCount !== 1) { fallas.push('UPDATE del ancla del nodo ' + id); say('  x el UPDATE del ancla del nodo ' + id + ' toco ' + r.rowCount + ' filas, no 1'); }
      else say('  ok #' + id + ' · ancla · 1 fila');
    }
    if (fallas.length) throw new Error('algun UPDATE de ancla no toco exactamente una fila');

    // ── verificacion DENTRO de la transaccion, antes del COMMIT ────────────
    say('\n5 · VERIFICACION DENTRO DE LA TRANSACCION — antes del COMMIT');
    const dentro = (await cli.query(LEER)).rows;
    const MD = new Map(dentro.map(r => [r.id, r]));
    let ok = 0;
    for (const id of IDS) {
      const r = MD.get(id), d = DESPUES[id];
      if (r && r.lat === d.lat && r.lng === d.lng && r.bahia_sitport_id === null) ok++;
      else say('  x #' + id + ' quedo lat=' + (r && r.lat) + ' lng=' + (r && r.lng) + ' anc=' + (r && r.bahia_sitport_id));
    }
    exigir('los once quedaron en el destino declarado', ok === 11, ok + ' / 11');
    exigir('siguen siendo 781 filas — no se borro ni se inserto nada', dentro.length === 781, dentro.length);

    // ── control negativo: los 770 que NO se tocan ──────────────────────────
    say('\n6 · CONTROL NEGATIVO — los 770 que no se mueven');
    let iguales = 0; const movidos = [];
    for (const r of antesFilas) {
      if (IDS.includes(r.id)) continue;
      const n = MD.get(r.id);
      if (n && n.lat === r.lat && n.lng === r.lng && n.bahia_sitport_id === r.bahia_sitport_id && n.nombre === r.nombre) iguales++;
      else movidos.push(r.id);
    }
    exigir('770 / 770 filas ajenas quedaron identicas en id, nombre, lat, lng y ancla',
      iguales === 770 && movidos.length === 0, iguales + ' / 770' + (movidos.length ? ' · se movieron ' + movidos.join(',') : ''));
    if (fallas.length) throw new Error('la verificacion dentro de la transaccion no salio verde');

    await cli.query('COMMIT');
    commiteado = true; escribio = true;
    say('\n  COMMIT');
  } catch (e) {
    if (!commiteado) { await cli.query('ROLLBACK').catch(() => {}); say('\n  ROLLBACK · ' + e.message); }
    fallas.push('la transaccion no cerro');
  } finally {
    cli.release();
  }
  if (!commiteado) { say('\nNADA QUEDO ESCRITO.'); await cerrar(pool); }

  // ── 7 · VERIFICACION DESPUES DEL COMMIT, EN CONEXION NUEVA ───────────────
  say('\n7 · VERIFICACION DESPUES DEL COMMIT — lectura nueva, no la de la transaccion');
  const despuesFilas = (await pool.query(LEER)).rows;
  const MF = new Map(despuesFilas.map(r => [r.id, r]));
  let firmes = 0;
  for (const id of IDS) {
    const r = MF.get(id), d = DESPUES[id];
    if (r && r.lat === d.lat && r.lng === d.lng && r.bahia_sitport_id === null) firmes++;
  }
  exigir('los once quedaron escritos', firmes === 11, firmes + ' / 11');
  const HUELLA_DESPUES = huella(despuesFilas);
  say('    huella del universo DESPUES: ' + HUELLA_DESPUES);
  exigir('la huella del universo CAMBIO', HUELLA_ANTES !== HUELLA_DESPUES, HUELLA_ANTES.slice(0, 12) + '... -> ' + HUELLA_DESPUES.slice(0, 12) + '...');
  const ajenasIguales = despuesFilas.filter(r => !IDS.includes(r.id)).every(r => {
    const a = M.get(r.id);
    return a && a.lat === r.lat && a.lng === r.lng && a.bahia_sitport_id === r.bahia_sitport_id;
  });
  exigir('y las 770 ajenas siguen identicas despues del COMMIT', ajenasIguales, '770 / 770');

  // ── 8 · LA HOJA ANTES/DESPUES — el unico registro que sobrevive ──────────
  say('\n8 · 03_antes_despues.tsv');
  const H = ['nodo_id', 'nombre_en_la_base_ESCAPADO', 'fuente', 'fuente_id_en_la_base',
    'lat_antes', 'lng_antes', 'ancla_antes', 'lat_despues', 'lng_despues', 'ancla_despues',
    'fuente_de_la_verdad', 'nombre_en_la_fuente_ESCAPADO', 'comuna_en_la_fuente_ESCAPADO', 'dlat_grados', 'dlng_grados'];
  const filasTsv = [H.join('\t')];
  for (const id of IDS) {
    const r = MF.get(id), a = ANTES[id], d = DESPUES[id], c = CAL.get(d.cal);
    filasTsv.push([id, escapar(r.nombre), r.fuente, r.fuente_id,
      a.lat, a.lng, a.anc, d.lat, d.lng, 'NULL',
      d.cal, escapar(c.nombre), escapar(c.comuna),
      +(d.lat - a.lat).toFixed(6), +(d.lng - a.lng).toFixed(6)].join('\t'));
  }
  const tsv = filasTsv.join('\n') + '\n';
  fs.writeFileSync(RUTA_TSV, tsv, { encoding: 'utf8' });
  const ctrl = [...tsv].filter(ch => { const c = ch.charCodeAt(0); return c < 32 && c !== 10 && c !== 13 && c !== 9; });
  exigir('la hoja no trae caracteres de control fuera de LF/CR/TAB', ctrl.length === 0, ctrl.length + ' encontrados');
  say('    ' + RUTA_TSV);
  say('    ' + filasTsv.length + ' lineas (1 cabecera + 11) · sha256 '
    + crypto.createHash('sha256').update(fs.readFileSync(RUTA_TSV)).digest('hex'));
  say('    NOTA · las columnas de nombre van ESCAPADAS. El nombre del nodo 656 trae');
  say('    U+00E3 (mojibake de la enye) y U+0091, que es un CONTROL C1. Es el dato, no');
  say('    una transcripcion: va escapado para que la hoja no lleve un control adentro.');
  say('    El lugar se llama Chanaral. Ver H-8.');

  say('\n' + '='.repeat(80));
  say(fallas.length ? fallas.length + ' FALLA(S)' : 'SIN FALLAS — los once corregidos y las 770 ajenas intactas.');
  say('QUE NO PRUEBA: no dice nada del artefacto. El join sigue derivado del insumo');
  say('viejo hasta que corra 04_.');
  say('');
  say('LO QUE QUEDA FRAGIL Y VA ESCRITO: el trigger trg_jurisdiccion_auto SIGUE PUESTO.');
  say('El dia que alguien vuelva a mover el geom de cualquiera de estos once, el ancla');
  say('se le vuelve a poner sola. El NULL de hoy no es una propiedad de la fila: es el');
  say('estado en que la dejo esta pieza, y el trigger puede deshacerlo sin que nadie mire.');
  say('='.repeat(80));
  await cerrar(pool);
})().catch(async e => { say('EXCEPCION: ' + e.stack); fallas.push('excepcion'); await cerrar(pool); });
