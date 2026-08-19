#!/usr/bin/env node
'use strict';
// 00_gate_premisas.js - GATE de la sesion (a1)-T. SOLA LECTURA.
// No escribe en la base. No escribe estado_drift.json. Escribe su .txt.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det ? ' - ' + det : ''));
  else { fallas.push(n); say('  x ROJO - ' + n + (det ? ' - ' + det : '')); }
};

const ESPERADO = {
  653: { lat: -28.460872, lng: -71.224055 },
  654: { lat: -27.06394,  lng: -70.823869 },
  655: { lat: -27.334874, lng: -70.941229 },
  656: { lat: -26.351827, lng: -70.633371 },
  657: { lat: -30.194365, lng: -71.431134 },
  658: { lat: -29.246534, lng: -71.468394 },
  659: { lat: -33.02215,  lng: -71.632543 },
  660: { lat: -33.031146, lng: -71.590059 },
  661: { lat: -32.918841, lng: -71.518234 },
  662: { lat: -32.740921, lng: -71.490708 },
  663: { lat: -33.962747, lng: -71.877457 },
};
const IDS = Object.keys(ESPERADO).map(Number).sort((a, b) => a - b);
const HUELLA_DECLARADA = '02228be7d7867358e77a9bd07a916100e965d102db30263fef2742e8cb37d10d';
const SHA_ARTEFACTO = '61bf7dc7';

const huella = filas => crypto.createHash('sha256')
  .update(filas.map(r => r.id + '|' + r.lat + '|' + r.lng + '|' + r.bahia_sitport_id).join('\n')).digest('hex');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'mapa_navegacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});
const LEER = `SELECT id, nombre, fuente, fuente_id, bahia_sitport_id,
    ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng
  FROM nodos_maritimos ORDER BY id`;

(async () => {
  say('='.repeat(78));
  say('(a1)-T - GATE - PREMISAS CONTRA LA BASE DE HOY - SOLA LECTURA');
  say('corrida ' + new Date().toISOString());
  say('='.repeat(78));

  const { rows } = await pool.query(LEER);
  say('');
  say('1 - EL UNIVERSO nodos_maritimos');
  exigir('781 filas', rows.length === 781, rows.length + ' filas');
  const h = huella(rows);
  say('    huella de hoy (sha256 de id|lat|lng|ancla, orden de id): ' + h);
  exigir('la huella coincide con la declarada 02228be7...', h === HUELLA_DECLARADA, h.slice(0, 12) + '...');

  say('');
  say('2 - LOS ONCE - ancla y coordenada');
  const porId = new Map(rows.map(r => [Number(r.id), r]));
  let conAncla = 0, coordMala = 0, faltan = 0;
  for (const id of IDS) {
    const r = porId.get(id);
    if (!r) { faltan++; say('    #' + id + ' NO ESTA EN LA TABLA'); continue; }
    const e = ESPERADO[id];
    const okCoord = Math.abs(r.lat - e.lat) < 1e-9 && Math.abs(r.lng - e.lng) < 1e-9;
    if (!okCoord) coordMala++;
    if (r.bahia_sitport_id !== null) conAncla++;
    say('    #' + id + ' ancla=' + (r.bahia_sitport_id === null ? 'NULL' : r.bahia_sitport_id)
      + '  lat=' + r.lat + ' lng=' + r.lng + '  coord=' + (okCoord ? 'ok' : 'DISTINTA'));
  }
  exigir('los once existen', faltan === 0, (IDS.length - faltan) + ' / 11');
  exigir('los once tienen ancla NULL', conAncla === 0, conAncla + ' con ancla de 11');
  exigir('los once conservan la coordenada corregida', coordMala === 0, coordMala + ' distintas de 11');

  say('');
  say('3 - CONTROL NEGATIVO - el resto del universo NO es todo NULL');
  const ajenas = rows.filter(r => !ESPERADO[Number(r.id)]);
  const ajenasConAncla = ajenas.filter(r => r.bahia_sitport_id !== null).length;
  say('    filas ajenas: ' + ajenas.length + ' - con ancla puesta: ' + ajenasConAncla
    + ' - con ancla NULL: ' + (ajenas.length - ajenasConAncla));
  exigir('hay filas con ancla puesta fuera de los once (la lectura discrimina)',
    ajenasConAncla > 0, ajenasConAncla + ' / ' + ajenas.length);

  say('');
  say('4 - EL ARTEFACTO join_puerto_bahia.json');
  const p = path.join(__dirname, '..', '..', 'data/catalogo/join_puerto_bahia.json');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  say('    sha256 del fichero en disco: ' + sha);
  exigir('empieza por ' + SHA_ARTEFACTO, sha.startsWith(SHA_ARTEFACTO), sha.slice(0, 12) + '...');

  say('');
  say('='.repeat(78));
  say(fallas.length ? 'ROJO - ' + fallas.length + ' exigencias no se cumplieron' : 'VERDE - todas las premisas se cumplen');
  say('='.repeat(78));
  await pool.end();
  const salida = path.join(__dirname, '00_gate_premisas.txt');
  fs.writeFileSync(salida, L.join('\n') + '\n', { encoding: 'utf8' });
  console.log('\n[evidencia] ' + salida);
  process.exit(fallas.length ? 2 : 0);
})().catch(async e => { console.error('ERROR NO CONTROLADO:', e); try { await pool.end(); } catch (_) {} process.exit(3); });
