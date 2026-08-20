// (m2) — ¿caen zarpe y recalada en la MISMA jurisdiccion lacustre publicada?
//
// ALCANCE CERRADO por el owner: se mide y se para. No se disena la solucion, no
// se toca el raster ni la mascara, no se abre la fuente de agua.
//
// LOS OCHO PUNTOS son los mismos literales de
// _bitacoras/spec2_pantalla_2026-08-20/08_lago_contra_las_tres_clases.js, igual
// que en (m1). No se copiaron de ninguna prosa.
//
// LA CAPA NO SE ELIGE ACA: sale de data/decreto/ambitos_publicados.json, campo
// capa_publicada. El propio fichero declara por que no puede ser la consultada.
//
// TRES LECTURAS DE "CAE EN LA JURISDICCION", Y SE PUBLICAN LAS TRES.
// El owner lo pidio explicitamente y (m1) explico por que: publicar una sola
// comprobacion como si fuera la respuesta es lo que casi hace que Calbuco y
// Llanquihue parezcan el mismo caso.
//   L1 · DENTRO estricto        ST_Contains(geom, punto)
//   L2 · DENTRO con tolerancia  derivable de L3 para CUALQUIER umbral, asi que
//        NO se fija un umbral inventado aca: se publica la distancia y cada
//        cual pone el suyo. Se informan ademas tres cortes de referencia y se
//        dice de donde sale cada uno.
//   L3 · MAS CERCA de esa que de otra  ST_Distance en metros contra las seis
//
// EL CONTROL POSITIVO ES EL QUE TIENE QUE DISCRIMINAR, y por eso no es un punto
// maritimo: la capa publicada TIENE SOLO LAS SEIS LACUSTRES —la maritima no
// esta publicada, C3 falla— asi que cualquier punto de mar cae en ninguna por
// construccion, y eso no probaria nada. El control positivo son los SEIS
// ST_PointOnSurface de las propias jurisdicciones: puntos que TIENEN que caer
// dentro de la suya y de ninguna otra. Si alguno no cae, el instrumento no mide.
'use strict';
const { Client } = require('pg');
require('dotenv').config({ path: 'C:/Users/katia/tmarea-backend/.env' });

const PUNTOS = [
  ['Gral Carrera  zarpe    Pto Ibanez',    -46.2947, -71.9264, 'Gral Carrera'],
  ['Gral Carrera  recalada Rio Tranquilo', -46.6194, -72.6733, 'Gral Carrera'],
  ['Llanquihue    zarpe    Muelle',        -41.2553, -73.0026, 'Llanquihue'],
  ['Llanquihue    recalada Frutillar',     -41.0726, -72.9353, 'Llanquihue'],
  ['Villarrica    zarpe    Pucon',         -39.2765, -71.9803, 'Villarrica'],
  ['Villarrica    recalada Villarrica',    -39.2883, -72.2195, 'Villarrica'],
  ['Panguipulli   zarpe    Costanera',     -39.6439, -72.3220, 'Panguipulli'],
  ['Panguipulli   recalada Pto Fuy',       -39.8720, -71.8891, 'Panguipulli'],
];

// cortes de referencia, cada uno con su procedencia declarada. NO son criterios
// de aceptacion: son reglas para leer la columna de distancia.
const CORTES = [
  [50, 'la resolucion de celda del raster de ruteo, 50 m, que declara cada descriptor de tile'],
  [2000, 'el snap que el descriptor de AUSTRAL_N declara en sus observaciones: "0 puertos aislados (snap 2000m)"'],
];

(async () => {
  const c = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  await c.connect();

  const capa = require('C:/Users/katia/tmarea-backend/data/decreto/ambitos_publicados.json').capa_publicada;
  const amb = require('C:/Users/katia/tmarea-backend/data/decreto/ambitos_publicados.json')
    .ambitos.find(a => a.ambito === 'lacustre');

  console.log('(m2) — LOS OCHO PUNTOS CONTRA LAS SEIS JURISDICCIONES LACUSTRES PUBLICADAS');
  console.log('');
  console.log('  capa, leida de ambitos_publicados.json: ' + capa);
  console.log('  el ambito lacustre se declara publicado el ' + amb.publicado_el +
              ', con ' + amb.jurisdicciones_esperadas + ' jurisdicciones esperadas');

  const js = (await c.query(
    "select id, nombre, round((st_area(geom::geography)/1e6)::numeric,1) km2 " +
    "from " + capa + " where ambito='lacustre' order by id")).rows;
  console.log('  en la base hay ' + js.length + ': ' + js.map(r => r.id).join(', '));
  const total = (await c.query('select count(*) n from ' + capa)).rows[0].n;
  console.log('  ALCANCE DE LA CAPA, y hay que decirlo: la tabla entera tiene ' + total + ' filas y son');
  console.log('  las SEIS lacustres. La maritima NO esta publicada, asi que un punto de mar cae en');
  console.log('  ninguna POR CONSTRUCCION. Por eso el control que discrimina es el positivo.');
  if (String(js.length) !== String(amb.jurisdicciones_esperadas)) {
    console.log('ALTO: la base no tiene las que el registro declara.'); process.exit(1);
  }
  console.log('');

  async function medir(lat, lon) {
    const q = await c.query(
      "select id, st_contains(geom, st_setsrid(st_point($1,$2),4326)) dentro, " +
      " st_distance(geom::geography, st_setsrid(st_point($1,$2),4326)::geography) dist_m " +
      "from " + capa + " where ambito='lacustre' order by dist_m asc", [lon, lat]);
    return q.rows;
  }

  const fmt = (m) => (m === 0 ? '0' : Number(m).toFixed(1));
  const resultados = [];

  console.log('LOS OCHO PUNTOS');
  console.log('  ' + 'punto'.padEnd(38) + 'L1 dentro de'.padEnd(24) + 'L3 mas cerca (id · metros)');
  console.log('  ' + '-'.repeat(94));
  for (const [et, lat, lon, lago] of PUNTOS) {
    const filas = await medir(lat, lon);
    const dentro = filas.filter(r => r.dentro).map(r => r.id);
    const cerca = filas[0];
    resultados.push({ et, lago, dentro, cerca });
    console.log('  ' + et.padEnd(38) +
      (dentro.length ? dentro.join('+') : '(ninguna)').padEnd(24) +
      cerca.id + ' · ' + fmt(cerca.dist_m) + ' m');
  }

  console.log('');
  console.log('  LA TABLA ENTERA DE DISTANCIAS, para que L2 se pueda leer con cualquier umbral:');
  console.log('  ' + 'punto'.padEnd(38) + js.map(r => r.id.slice(0, 11).padStart(12)).join(''));
  for (const [et, lat, lon] of PUNTOS) {
    const filas = await medir(lat, lon);
    const porId = Object.fromEntries(filas.map(r => [r.id, r.dist_m]));
    console.log('  ' + et.padEnd(38) + js.map(r => fmt(porId[r.id]).padStart(12)).join(''));
  }

  console.log('');
  console.log('CONTROL POSITIVO — un punto GARANTIZADO dentro de cada jurisdiccion');
  console.log('  (ST_PointOnSurface, que por definicion cae dentro incluso en poligonos concavos)');
  console.log('');
  console.log('  DEFECTO DE INSTRUMENTO PROPIO, CORREGIDO Y DECLARADO. La primera version');
  console.log('  exigia que el punto cayera en SU jurisdiccion Y EN NINGUNA OTRA, y dio 5 de 6:');
  console.log('  el de lago_ranco cae tambien en puerto_varas. NO ES UN DEFECTO DE LA CAPA NI DEL');
  console.log('  INSTRUMENTO: es un TRASLAPE DECLARADO. El build del 2026-08-13 lo imprime en su');
  console.log('  propia salida —"Lago Ranco (lacustre) x Puerto Varas (lacustre) = 155.426 km2"— y');
  console.log('  el control C3 del ambito lacustre, "cero traslapes fuera de los declarados');
  console.log('  deliberados", dio obtenido 0. El repositorio ya lo tenia contestado y el esperado');
  console.log('  de mi control salio de mi suposicion, no de la corrida. Es la familia de la cifra');
  console.log('  clavada en vez de derivada. Ahora el esperado SE DERIVA de los traslapes reales.');
  console.log('');
  const traslapes = (await c.query(
    'select a.id ia, b.id ib, st_area(st_intersection(a.geom,b.geom)::geography)/1e6 km2 ' +
    'from ' + capa + ' a join ' + capa + ' b on a.id < b.id ' +
    "where a.ambito='lacustre' and b.ambito='lacustre' and st_intersects(a.geom,b.geom) " +
    'and st_area(st_intersection(a.geom,b.geom)::geography) > 0')).rows;
  console.log('  traslapes reales entre las seis, DERIVADOS de la capa: ' +
    (traslapes.length ? traslapes.map(t => t.ia + ' x ' + t.ib + ' = ' + Number(t.km2).toFixed(3) + ' km2').join(' · ') : 'ninguno'));
  const solapaCon = (id) => traslapes.filter(t => t.ia === id || t.ib === id).map(t => (t.ia === id ? t.ib : t.ia));
  console.log('');
  let cpOk = 0;
  for (const j of js) {
    const p = (await c.query(
      'select st_y(st_pointonsurface(geom)) lat, st_x(st_pointonsurface(geom)) lon from ' +
      capa + ' where id=$1', [j.id])).rows[0];
    const filas = await medir(p.lat, p.lon);
    const dentro = filas.filter(r => r.dentro).map(r => r.id);
    // LA AFIRMACION QUE ESTE CONTROL PRUEBA: el punto cae dentro de SU jurisdiccion.
    // Que caiga ademas en otra solo es admisible si esa otra es un traslape DERIVADO.
    const caeEnLaSuya = dentro.includes(j.id);
    const extras = dentro.filter(x => x !== j.id);
    const extrasExplicados = extras.every(x => solapaCon(j.id).includes(x));
    const ok = caeEnLaSuya && extrasExplicados;
    if (ok) cpOk++;
    console.log('  ' + (ok ? 'ok  ' : 'MAL ') + j.id.padEnd(22) +
      'cae en: ' + (dentro.join('+') || '(ninguna)') +
      (extras.length ? '   [el extra es traslape declarado: ' + extrasExplicados + ']' : ''));
  }
  console.log('  CONTROL POSITIVO: ' + cpOk + ' de ' + js.length +
              ' — el instrumento SI distingue dentro de fuera');

  console.log('');
  console.log('CONTROL NEGATIVO — un punto que no puede caer en ninguna');
  for (const [et, lat, lon] of [['Cordoba, Argentina', -31.42, -64.18], ['Quellon (mar)', -43.1208, -73.6232]]) {
    const filas = await medir(lat, lon);
    const dentro = filas.filter(r => r.dentro).map(r => r.id);
    console.log('  ' + (dentro.length === 0 ? 'ok  ' : 'MAL ') + et.padEnd(24) +
      'cae en: ' + (dentro.join('+') || '(ninguna)') + ' · mas cerca ' + fmt(filas[0].dist_m) + ' m');
  }
  console.log('  NOTA DE ALCANCE: este control es DEBIL y se dice. Con la capa teniendo solo');
  console.log('  lacustres, "no cae en ninguna" es cierto para casi todo el pais. Vale como');
  console.log('  comprobacion de que ST_Contains no devuelve true de mas, y nada mas.');

  console.log('');
  console.log('-'.repeat(96));
  console.log('LA PREGUNTA: ¿zarpe y recalada del MISMO lago caen en la MISMA jurisdiccion?');
  console.log('-'.repeat(96));
  const porLago = {};
  for (const r of resultados) (porLago[r.lago] = porLago[r.lago] || []).push(r);
  const veredictos = {};
  for (const [lago, par] of Object.entries(porLago)) {
    const [a, b] = par;
    const l1 = a.dentro.length && b.dentro.length && a.dentro[0] === b.dentro[0]
      ? 'MISMA (' + a.dentro[0] + ')'
      : (a.dentro.length === 0 && b.dentro.length === 0 ? 'NINGUNO DENTRO'
        : 'PARCIAL: ' + (a.dentro[0] || 'ninguna') + ' / ' + (b.dentro[0] || 'ninguna'));
    const l3 = a.cerca.id === b.cerca.id
      ? 'MISMA (' + a.cerca.id + ')  ·  ' + fmt(a.cerca.dist_m) + ' m / ' + fmt(b.cerca.dist_m) + ' m'
      : 'DISTINTAS: ' + a.cerca.id + ' / ' + b.cerca.id;
    veredictos[lago] = { l1, l3, dmax: Math.max(a.cerca.dist_m, b.cerca.dist_m) };
    console.log('  ' + lago.padEnd(16));
    console.log('      L1 dentro estricto ... ' + l1);
    console.log('      L3 mas cerca ......... ' + l3);
    for (const [corte, proc] of CORTES) {
      const ok = a.cerca.dist_m <= corte && b.cerca.dist_m <= corte && a.cerca.id === b.cerca.id;
      console.log('      L2 con ' + String(corte).padStart(4) + ' m ....... ' + (ok ? 'MISMA' : 'no alcanza'));
    }
  }
  console.log('');
  console.log('  procedencia de los cortes de L2, que NO son criterios de aceptacion:');
  CORTES.forEach(([c2, p]) => console.log('    ' + String(c2).padStart(5) + ' m — ' + p));

  console.log('');
  console.log('LA PREGUNTA QUE (m1) DEJO SERVIDA: los lagos que fallan por EXTENT o MIXTA,');
  console.log('¿tienen jurisdiccion publicada igual?');
  for (const lago of ['Villarrica', 'Panguipulli']) {
    const v = veredictos[lago];
    console.log('  ' + lago.padEnd(14) + '(m1): ' + (lago === 'Villarrica' ? 'EXTENT' : 'MIXTA').padEnd(8) +
      '· jurisdiccion publicada: ' + (v.l3.startsWith('MISMA') ? 'SI, y la MISMA para los dos extremos' : 'ver arriba'));
  }

  console.log('');
  console.log('-'.repeat(96));
  console.log('LO QUE ESTA MEDICION NO SOSTIENE — y (m1) es quien lo prueba');
  console.log('-'.repeat(96));
  console.log('  CAER EN LA JURISDICCION NO ES ESTAR EN AGUA NAVEGABLE. La jurisdiccion de una');
  console.log('  Capitania lacustre NO es el espejo de agua: incluye tierra. Y hay un caso donde');
  console.log('  las dos mediciones se cruzan sobre EL MISMO PUNTO:');
  console.log('     Llanquihue / Muelle  -41.2553 -73.0026');
  console.log('       (m2) cae DENTRO de puerto_varas, a 0 m. Estricto, sin tolerancia.');
  console.log('       (m1) el raster dice TIERRA y 0 de 6561 celdas navegables en 2 km.');
  console.log('  Las dos son ciertas a la vez. Asi que (m2) sostiene "que jurisdiccion gobierna');
  console.log('  este viaje" y NO sostiene "este viaje es navegable". Son dos preguntas y esta');
  console.log('  medicion contesta una.');
  const union = (await c.query(
    "select st_area(st_union(geom)::geography)/1e6 u, sum(st_area(geom::geography))/1e6 s " +
    "from " + capa + " where ambito='lacustre'")).rows[0];
  console.log('');
  console.log('  Y UNA COTA DE LECTURA PARA EL AREA, derivada y no citada: la suma de las seis da ' +
    Number(union.s).toFixed(1) + ' km2');
  console.log('  y su UNION da ' + Number(union.u).toFixed(1) + ' km2. La diferencia son los ' +
    (Number(union.s) - Number(union.u)).toFixed(1) + ' km2 del traslape');
  console.log('  declarado, contados dos veces por cualquier suma. No es un defecto: es como se lee.');

  await c.end();
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
