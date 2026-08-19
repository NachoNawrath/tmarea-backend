#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
// control_ancla_declarada.js - (a1)-T, punto (i)
//
// Exige que los nodos de data/catalogo/anclas_declaradas.json sigan como la
// pieza que los decidio los dejo: el ancla en el valor declarado Y la
// coordenada en la posicion declarada.
//
// POR QUE ES UN SCRIPT PROPIO Y NO VIVE DENTRO DEL CONTROL DE DRIFT:
//   · e01_control_drift_catalogo.js consulta SITPORT antes que nada y sale
//     NO_SE_PUDO_MEDIR si no responde. Alojado ahi, este control NO CORRERIA
//     el dia que orion.directemar.cl este caido -- justo un dia en que nadie
//     esta mirando la base.
//   · la via documentada de aquel control es `npm run drift`, que siempre pasa
//     --estado y REESCRIBE data/catalogo/estado_drift.json. Ese fichero no es
//     ruido de entorno: hoy mismo lleva en el arbol un drift NO DECLARADO sin
//     triar (SITPORT sumo la bahia 258). Pisarlo borra evidencia.
//   · y no entra a la suite porque hoy NINGUN test de src/services/__tests__/
//     toca la base -- medido: cero menciones de require('pg'), new Pool o
//     DB_HOST -- y un test que se saltea solo cuando no hay base es un control
//     que pasa en verde por no haber mirado.
// NO se llama e01_ a proposito: ese prefijo nombra la etapa E0.1, que es el
// drift del catalogo de bahias contra SITPORT. Este control sale de (a1), que
// es el frente del join. El prefijo mentiria la etapa.
//
// Uso:  npm run ancla
//       node scripts/control_ancla_declarada.js [--declaracion <archivo>]
//
// Codigos de salida:
//   0  SIN_NOVEDAD             todas las filas declaradas estan como se declaro
//   1  ESTADO_DECLARADO_ROTO   una fila declarada dejo de estarlo: ancla
//                              repuesta, coordenada movida, o las dos
//   2  NO_SE_PUDO_MEDIR        la base no respondio, o la lectura no discrimina
//   3  DECLARACION_NO_CALZA    la fila no esta, el id apunta a otro nodo, o la
//                              declaracion es ilegible
// Solo el 0 es "pasa". NO CORRIGE NADA: la base no se escribe.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  ErrorAnclasDeclaradas, CODIGO_SALIDA, evaluarAnclasDeclaradas,
} = require('../src/services/anclas-declaradas');

const RAIZ = path.join(__dirname, '..');
const FLAGS = new Set(['--declaracion']);

function leerArgumentos(argv) {
  const encontrados = new Map();
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!FLAGS.has(t)) {
      console.error('flag desconocido o argumento suelto: ' + t + '. Aceptados: ' + [...FLAGS].join(', '));
      process.exit(CODIGO_SALIDA.DECLARACION_NO_CALZA);
    }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) {
      console.error(t + ' necesita un valor');
      process.exit(CODIGO_SALIDA.DECLARACION_NO_CALZA);
    }
    encontrados.set(t, v);
    i++;
  }
  return encontrados;
}
const ARGS = leerArgumentos(process.argv.slice(2));
const RUTA_DECL = path.resolve(ARGS.get('--declaracion') || path.join(RAIZ, 'data/catalogo/anclas_declaradas.json'));

// Todo lo que no sea imprimible sale escapado: el nombre del nodo 656 trae un
// C1 (H-8) y una salida de terminal que se pega en una bitacora no lleva un
// caracter de control adentro.
const RE_CONTROL = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f]', 'g');
const escapar = t => String(t).replace(RE_CONTROL,
  c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const LEER = `SELECT id, nombre, fuente, fuente_id, bahia_sitport_id,
    ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng
  FROM nodos_maritimos ORDER BY id`;

function imprimir(informe, origen) {
  const L = console.log;
  L('='.repeat(80));
  L('CONTROL DEL ANCLA DECLARADA - (a1)-T punto (i)');
  L('corrida     : ' + new Date().toISOString());
  L('origen      : ' + origen);
  L('declaracion : ' + path.relative(RAIZ, RUTA_DECL).split(path.sep).join('/'));
  L('='.repeat(80));
  L('');
  L('UNIVERSO Y ALCANCE');
  L('  filas leidas de nodos_maritimos ........ ' + informe.universo + '   (unidad: filas)');
  L('  filas que la declaracion nombra ........ ' + informe.declaradas + '   (unidad: filas; son las UNICAS que se exigen)');
  L('  tolerancia de la coordenada ............ ' + informe.tolerancia_grados + '   (unidad: grados, dato declarado)');
  L('');
  L('CONTROL NEGATIVO - que la lectura discrimine');
  L('  filas fuera de la declaracion .......... ' + informe.negativo.ajenas);
  L('    de esas, CON ancla puesta ............ ' + informe.negativo.ajenas_con_ancla);
  L('    de esas, con ancla NULL .............. ' + informe.negativo.ajenas_sin_ancla);
  if (informe.negativo.discrimina) {
    L('  ok hay ancla puesta fuera de las declaradas: un NULL leido es un NULL real');
  } else {
    L('  x NINGUNA fila ajena tiene ancla. Esta lectura no distingue "ancla en NULL"');
    L('    de "la columna vino vacia", asi que el verde de las declaradas no probaria');
    L('    nada. No es un defecto del dato: es que NO SE PUDO MEDIR.');
  }
  L('');
  L('HALLAZGOS');
  if (informe.hallazgos.length === 0) {
    L('  ninguno. Las ' + informe.declaradas + ' filas declaradas estan como se declaro.');
  }
  for (const h of informe.hallazgos) {
    L('  [' + h.clase + ']  nodo ' + h.nodo_id + '  ' + escapar(h.nombre));
    L('      ' + h.detalle);
    L('      esperado   : ' + h.esperado);
    L('      encontrado : ' + h.encontrado);
    if (h.dlat_grados !== undefined) {
      L('      dlat ' + h.dlat_grados.toFixed(9) + ' grados  ·  dlng ' + h.dlng_grados.toFixed(9) + ' grados');
    }
  }
  L('');
  L('-'.repeat(80));
  L('declaradas ' + informe.declaradas + ' · estado roto ' + informe.resumen.estado_declarado_roto +
    ' · declaracion no calza ' + informe.resumen.declaracion_no_calza);
  L('VEREDICTO: ' + informe.veredicto + '  (salida ' + CODIGO_SALIDA[informe.veredicto] + ')');
  if (informe.veredicto === 'ESTADO_DECLARADO_ROTO') {
    L('Alguien intervino el geom de una fila declarada. ESTE CONTROL NO CORRIGE:');
    L('restituir el estado declarado es una escritura sobre la base y necesita');
    L('autorizacion. Antes de restituir conviene averiguar QUIEN lo escribio, que es');
    L('lo unico que este control no puede contestar (H-2: el productor del campo no');
    L('esta versionado). Un UPDATE apurado borra ese rastro.');
  }
  if (informe.veredicto === 'DECLARACION_NO_CALZA') {
    L('No es que el dato este mal: es que la premisa del propio control se rompio.');
    L('Lo tiene que leer una persona antes de creerle nada al resto del informe.');
  }
  L('-'.repeat(80));
}

(async () => {
  let declaracion;
  try {
    declaracion = JSON.parse(fs.readFileSync(RUTA_DECL, 'utf8'));
  } catch (e) {
    console.error('='.repeat(80));
    console.error('NO SE PUDO LEER LA DECLARACION ' + RUTA_DECL + ': ' + e.message);
    console.error('='.repeat(80));
    process.exit(CODIGO_SALIDA.DECLARACION_NO_CALZA);
  }

  const { Pool } = require('pg');
  const db = process.env.DB_NAME || 'mapa_navegacion';
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: db,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  let filas;
  try {
    filas = (await pool.query(LEER)).rows;
  } catch (e) {
    console.error('='.repeat(80));
    console.error('NO SE PUDO MEDIR: la base no respondio - ' + e.message);
    console.error('Sin la lectura no hay veredicto, y "no se pudo leer" NO es "sin novedad".');
    console.error('='.repeat(80));
    await pool.end().catch(() => {});
    process.exit(CODIGO_SALIDA.NO_SE_PUDO_MEDIR);
  } finally {
    await pool.end().catch(() => {});
  }

  let informe;
  try {
    informe = evaluarAnclasDeclaradas({ filas, declaracion });
  } catch (e) {
    if (e instanceof ErrorAnclasDeclaradas) {
      console.error('='.repeat(80));
      console.error('EL CONTROL SE DETIENE: ' + e.message);
      console.error('='.repeat(80));
      process.exit(CODIGO_SALIDA.DECLARACION_NO_CALZA);
    }
    throw e;
  }

  imprimir(informe, 'consulta en vivo a postgres ' + db + ' :: nodos_maritimos (SOLA LECTURA)');
  process.exit(CODIGO_SALIDA[informe.veredicto]);
})().catch(e => {
  console.error('ERROR NO CONTROLADO:', e);
  process.exit(CODIGO_SALIDA.NO_SE_PUDO_MEDIR);
});
