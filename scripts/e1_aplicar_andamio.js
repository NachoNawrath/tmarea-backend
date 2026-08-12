#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e1_aplicar_andamio.js — escribe en la base el comentario que el repositorio
// declara, y comprueba que quedó escrito.
//
// Es la mitad del camino 2 (aprobado 2026-08-11): los dos guards no pueden
// divergir porque son UNO con dos salidas. El texto vive en
// `data/decreto/capa_consultada.json` → `andamio.comentario_en_la_base`, este
// script lo aplica, y `andamio-medicion.verificarComentarioEnLaBase()` lo
// comprueba. Nunca al revés: el comentario de la base no es fuente.
//
// Reemplaza el comentario anterior, que decía "SUPERSEDIDA Y DESACTUALIZADA. NO
// CONSULTAR" sin condición y contradecía a la declaración del andamio.
//
// Idempotente: correrlo dos veces deja la base igual.
//
// Uso:  node scripts/e1_aplicar_andamio.js [--dry-run]
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { Pool } = require('pg');
const { capaDeMedicion, verificarComentarioEnLaBase } = require('../src/services/andamio-medicion');
const decl = require('../data/decreto/capa_consultada.json');

const SECO = process.argv.includes('--dry-run');

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });

  // capaDeMedicion() valida la declaración entera antes de devolver el nombre:
  // si el bloque está mal, no se llega a escribir nada en la base.
  const capa = capaDeMedicion();
  const texto = decl.andamio.comentario_en_la_base;

  console.log('='.repeat(78));
  console.log('E1 — APLICAR LA DECLARACIÓN DEL ANDAMIO AL COMENTARIO DE LA BASE');
  console.log('='.repeat(78));
  console.log(`capa   : ${capa}`);
  console.log(`modo   : ${SECO ? 'DRY RUN — no escribe' : 'aplica'}`);
  console.log('');

  const { rows: antes } = await pool.query(
    `SELECT obj_description(c.oid) AS c FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=$1`, [capa]);
  if (!antes.length) throw new Error(`la capa '${capa}' no existe en el esquema public.`);
  console.log('ANTES:');
  console.log(`  ${String(antes[0].c || '(sin comentario)').slice(0, 200)}...`);
  console.log('');

  if (SECO) {
    console.log('DRY RUN: no se escribió. El texto que se aplicaría es:');
    console.log(`  ${texto.slice(0, 200)}...`);
    await pool.end();
    return;
  }

  // El identificador no se interpola sin comprobar: `capaDeMedicion()` ya exigió
  // que sea un identificador válido, y acá se cita igual.
  await pool.query(`COMMENT ON TABLE "${capa}" IS ${literal(texto)}`);

  const r = await verificarComentarioEnLaBase(pool);
  console.log('DESPUÉS:');
  console.log(`  el comentario de '${r.capa}' coincide con lo que declara capa_consultada.json.`);
  console.log('');
  console.log('Los dos guards dicen lo mismo, y ahora hay un control que se detiene si dejan');
  console.log('de decirlo: src/services/andamio-medicion.js → verificarComentarioEnLaBase().');
  await pool.end();
})().catch(e => { console.error('ABORTADO: ' + e.message); process.exit(1); });

// COMMENT ON no acepta parámetros ligados: el texto va literal y se escapa acá.
function literal(s) { return `'${String(s).replace(/'/g, "''")}'`; }
