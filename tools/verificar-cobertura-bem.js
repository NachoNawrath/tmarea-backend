/**
 * Paso 5: Verificación de cobertura BEM 2025
 * Cruza los 152 registros BEM contra nodos_maritimos (solo reporta, no inserta)
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'mapa_navegacion',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, '../bem_2025_puertos.json'), 'utf8')
    .replace(/^﻿/, '');
  const bem = JSON.parse(raw);
  console.log(`BEM registros: ${bem.length}`);

  const client = await pool.connect();
  try {
    const sinMatch = [];

    for (const b of bem) {
      const nombreNorm = b.nombre
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/^(puerto de|puerto|caleta|terminal|muelle|rampa)\s+/i, '')
        .trim();

      const { rows } = await client.query(
        `SELECT id, nombre, fuente FROM nodos_maritimos
         WHERE nombre_normalizado ILIKE $1
         LIMIT 1`,
        [`%${nombreNorm}%`]
      );

      if (rows.length === 0) {
        sinMatch.push(b.nombre);
      }
    }

    console.log(`\nRegistros BEM SIN match en nodos_maritimos: ${sinMatch.length}/${bem.length}`);
    if (sinMatch.length > 0) {
      console.log('\nLista de gaps:');
      sinMatch.forEach(n => console.log(`  - ${n}`));
    } else {
      console.log('¡Cobertura completa!');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
