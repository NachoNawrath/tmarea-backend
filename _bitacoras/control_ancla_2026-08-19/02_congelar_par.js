#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
// 02_congelar_par.js - (a1)-T
//
// Congela EL PAR que usa scripts/prueba_mordida_ancla.js como fixture:
//   (a) la LECTURA REAL de nodos_maritimos de hoy, con las columnas exactas
//       que el control lee;
//   (b) la DECLARACION vigente en el momento de esa lectura.
//
// LOS DOS JUNTOS, Y CON LA MISMA FECHA. El motivo es una correccion del owner
// en la PARADA 1: si se congelara solo la foto, el dia que otra pieza declare
// un nodo que hoy tiene ancla puesta, el control negativo de la mordida daria
// ROJO sin que nada este mal -- y ese es justamente el caso de uso que el
// declarativo promete soportar sin tocar codigo. Una foto con una declaracion
// de otra fecha da rojos que no significan nada.
//
// QUE PRUEBA EL PAR Y QUE NO. El par es el fixture de una prueba que mide si
// la FUNCION MUERDE, y eso no depende de que declaracion coma. QUE EL MUNDO DE
// HOY ESTE BIEN NO LO PRUEBA ESTE FICHERO: lo prueba `npm run ancla` contra la
// base viva. Son dos afirmaciones distintas y no se mezclan.
//
// SOLA LECTURA sobre la base. No escribe estado_drift.json.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

const RAIZ = path.join(__dirname, '..', '..');
const DECL = path.join(RAIZ, 'data/catalogo/anclas_declaradas.json');
const FECHA = '2026-08-19';
const OUT_LECTURA = path.join(__dirname, '02_par_lectura_781_' + FECHA + '.json');
const OUT_DECL = path.join(__dirname, '02_par_declaracion_' + FECHA + '.json');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det !== undefined ? ' - ' + det : ''));
  else { fallas.push(n); say('  x ROJO - ' + n + (det !== undefined ? ' - ' + det : '')); }
};
const RE_CONTROL = new RegExp('[\\u007f-\\u009f]', 'g');
const escaparControles = s => s.replace(RE_CONTROL,
  c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const controlesEnBytes = b => [...b].filter(x => x < 0x20 && x !== 0x0a && x !== 0x0d).length;

const LEER = `SELECT id, nombre, fuente, fuente_id, bahia_sitport_id,
    ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng
  FROM nodos_maritimos ORDER BY id`;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'mapa_navegacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

(async () => {
  say('='.repeat(78));
  say('(a1)-T - CONGELAR EL PAR (lectura + declaracion) - SOLA LECTURA');
  say('corrida ' + new Date().toISOString());
  say('='.repeat(78));

  const filas = (await pool.query(LEER)).rows.map(r => ({
    id: Number(r.id), nombre: r.nombre, fuente: r.fuente, fuente_id: r.fuente_id,
    bahia_sitport_id: r.bahia_sitport_id === null ? null : Number(r.bahia_sitport_id),
    lat: Number(r.lat), lng: Number(r.lng),
  }));
  await pool.end();

  say('');
  say('1 - LA LECTURA');
  exigir('781 filas', filas.length === 781, filas.length + ' filas');
  // La misma huella que publico la pieza (a1): id|lat|lng|ancla en orden de id.
  const huella = sha(filas.map(r => r.id + '|' + r.lat + '|' + r.lng + '|' + r.bahia_sitport_id).join('\n'));
  say('    huella del universo (sha256 de id|lat|lng|ancla, orden de id): ' + huella);
  exigir('la huella coincide con la que dejo la pieza (a1) el 2026-08-19',
    huella === '02228be7d7867358e77a9bd07a916100e965d102db30263fef2742e8cb37d10d', huella.slice(0, 12) + '...');

  const doc = {
    _que_es: 'Lectura REAL y completa de nodos_maritimos del ' + FECHA + ', con las columnas exactas que lee scripts/control_ancla_declarada.js. Es el fixture de scripts/prueba_mordida_ancla.js.',
    _va_en_par_con: path.basename(OUT_DECL),
    _no_prueba: 'Este fichero NO prueba que el mundo de hoy este bien. Prueba, junto a su declaracion pareja, que la funcion de veredicto no se pone roja sobre un estado real y coherente -- que es el control negativo de la mordida. Que el mundo de hoy este bien lo prueba npm run ancla contra la base viva.',
    _nota_caracteres: 'El nombre del nodo 656 trae U+0091 (H-8). Va escapado como los seis bytes ASCII de la secuencia. Intencional, no es un hallazgo.',
    fecha: FECHA,
    huella_universo_sha256: huella,
    huella_clase: 'sha256 de la cadena id|lat|lng|ancla de las 781 filas unidas por LF, en orden de id. Es la misma clase que publico la pieza (a1).',
    filas,
  };

  // Cabecera indentada, y las 781 filas a UNA POR LINEA. Con indent 2 el
  // fichero daba 179 KB; asi da bastante menos y ademas se diffea fila por
  // fila. La forma sigue siendo JSON valido y se comprueba re-parseandolo.
  const sinFilas = { ...doc };
  delete sinFilas.filas;
  const cabeceraCompleta = JSON.stringify(sinFilas, null, 2);
  const cabecera = cabeceraCompleta.slice(0, cabeceraCompleta.lastIndexOf('\n}'));
  const cuerpo = doc.filas.map(f => '    ' + JSON.stringify(f)).join(',\n');
  const jsonLectura = escaparControles(cabecera + ',\n  "filas": [\n' + cuerpo + '\n  ]\n}\n');
  fs.writeFileSync(OUT_LECTURA, jsonLectura, { encoding: 'utf8' });

  say('');
  say('2 - LA DECLARACION PAREJA');
  const bytesDecl = fs.readFileSync(DECL);
  fs.writeFileSync(OUT_DECL, bytesDecl);
  say('    copiada de ' + path.relative(RAIZ, DECL).split(path.sep).join('/'));

  say('');
  say('3 - LOS DOS FICHEROS');
  for (const p of [OUT_LECTURA, OUT_DECL]) {
    const b = fs.readFileSync(p);
    say('    ' + path.basename(p) + ' - ' + b.length + ' bytes');
    say('      sha256 de los BYTES EN DISCO (clase FA-4): ' + sha(b));
    exigir('cero caracteres de control fuera de LF/CR en ' + path.basename(p),
      controlesEnBytes(b) === 0, controlesEnBytes(b) + ' encontrados');
  }
  exigir('la copia de la declaracion es byte a byte identica al original',
    sha(fs.readFileSync(OUT_DECL)) === sha(bytesDecl), 'si');

  say('');
  say('4 - EL PAR RE-PARSEA Y SIRVE');
  const lec = JSON.parse(fs.readFileSync(OUT_LECTURA, 'utf8'));
  const dec = JSON.parse(fs.readFileSync(OUT_DECL, 'utf8'));
  exigir('la lectura re-parsea 781 filas', lec.filas.length === 781, lec.filas.length);
  exigir('la declaracion re-parsea 11 filas', dec.filas.length === 11, dec.filas.length);
  const ids = new Set(lec.filas.map(f => f.id));
  exigir('los 11 declarados estan en la lectura - el par es COHERENTE',
    dec.filas.every(f => ids.has(f.nodo_id)), dec.filas.filter(f => ids.has(f.nodo_id)).length + ' / 11');
  const conAncla = lec.filas.filter(f => f.bahia_sitport_id !== null).length;
  say('    filas de la lectura con ancla puesta: ' + conAncla + ' de 781');
  exigir('la lectura trae ancla puesta en alguna fila - sin eso el control negativo de la mordida no valdria',
    conAncla > 0, conAncla);

  say('');
  say('='.repeat(78));
  say(fallas.length ? 'ROJO - ' + fallas.length + ' exigencias no se cumplieron' : 'VERDE - par congelado');
  say('='.repeat(78));
  fs.writeFileSync(path.join(__dirname, '02_congelar_par.txt'), L.join('\n') + '\n', { encoding: 'utf8' });
  process.exit(fallas.length ? 2 : 0);
})().catch(async e => {
  console.error('ERROR NO CONTROLADO:', e);
  try { await pool.end(); } catch (_) { /* ya cerrado */ }
  process.exit(3);
});
