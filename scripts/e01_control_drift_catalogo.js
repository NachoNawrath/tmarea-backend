#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e01_control_drift_catalogo.js — E0.1 del PLAN_JURISDICCION.md
//
// Compara el catálogo interno de bahías contra lo que SITPORT publica, en las
// dos direcciones, y contra sí mismo. Toda divergencia sale listada. Las que no
// están declaradas hacen fallar el control.
//
// Lo que este control NO hace: decidir qué pasa en el motor cuando hay drift.
// Esa decisión es del owner y está abierta (ver la propuesta de E0.1).
//
// Uso:
//   node scripts/e01_control_drift_catalogo.js
//   node scripts/e01_control_drift_catalogo.js --insumo <dir con los 3 JSON>
//   node scripts/e01_control_drift_catalogo.js --raiz <dir> --declaracion <archivo>
//
// Códigos de salida:
//   0  SIN_DRIFT                  las fuentes coinciden (o todo está adjudicado)
//   1  DRIFT_NO_DECLARADO         divergencia que nadie había visto, o declaración
//                                 vencida, o una fuente que no se pudo leer
//   2  NO_SE_PUDO_MEDIR           SITPORT o la base no respondieron
//   3  DRIFT_DECLARADO_ABIERTO    divergencia conocida, pendiente de decisión
//
// Solo el 0 es "pasa". El 3 NO es verde: es una deuda con nombre y fecha.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  ErrorCatalogoBahias, CLASES, CODIGO_SALIDA,
  leerFuentesInternas, compararCatalogos,
} = require('../src/services/catalogo-bahias');

// ── argumentos ───────────────────────────────────────────────────────────────
function arg(nombre, porDefecto) {
  const i = process.argv.indexOf(nombre);
  if (i === -1) return porDefecto;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) {
    console.error(`${nombre} necesita un valor`);
    process.exit(CODIGO_SALIDA.DRIFT_NO_DECLARADO);
  }
  return v;
}

const RAIZ = path.resolve(arg('--raiz', path.join(__dirname, '..')));
const INSUMO = arg('--insumo', null);
const ESTADO = arg('--estado', null);
const RUTA_DECL = path.resolve(arg('--declaracion', path.join(RAIZ, 'data/catalogo/divergencias_declaradas.json')));

const ARCHIVOS_INSUMO = {
  consultaBahias: 'sitport_consultaBahias.json',
  consultaRestricciones: 'sitport_consultaRestricciones.json',
  totalPronostico: 'sitport_totalPronostico.json',
};

// ── obtención de las capturas ────────────────────────────────────────────────
async function obtenerCapturas() {
  if (INSUMO) {
    const dir = path.resolve(INSUMO);
    const capturas = {};
    for (const [clave, archivo] of Object.entries(ARCHIVOS_INSUMO)) {
      const p = path.join(dir, archivo);
      if (!fs.existsSync(p)) {
        throw new ErrorCatalogoBahias(`el insumo ${dir} no trae ${archivo} — una captura ausente dejaría la comparación parcial`);
      }
      capturas[clave] = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    return { capturas, origen: `insumo en disco: ${dir}` };
  }
  const sitport = require(path.join(__dirname, '..', 'src/services/sitport-service'));
  const [consultaBahias, consultaRestricciones, totalPronostico] = await Promise.all([
    sitport.consultaBahias(), sitport.consultaRestricciones(), sitport.totalPronostico(),
  ]);
  return {
    capturas: { consultaBahias, consultaRestricciones, totalPronostico },
    origen: 'consulta en vivo a orion.directemar.cl',
  };
}

// ── F4 y F5: las dos capas en base de datos ──────────────────────────────────
// F4 es la tabla de puntos; F5 la matview de celdas que el motor consulta para
// resolver qué bahías cruza una ruta. Que F5 tenga 33 celdas de geometría vacía
// es un defecto conocido de OTRO frente (E3/E4) y este control no lo mide: acá
// solo interesa que el conjunto de ids y los nombres sean los mismos.
async function fuentesBaseDeDatos() {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'mapa_navegacion',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });
  const db = process.env.DB_NAME || 'mapa_navegacion';
  try {
    const puntos = await pool.query('SELECT bahia_id, nombre, lat, lng FROM bahias_sitport');
    const celdas = await pool.query('SELECT bahia_id, nombre FROM bahia_jurisdicciones');
    return {
      F4: {
        clave: 'F4',
        ruta: `postgres ${db} :: bahias_sitport`,
        rol: 'la tabla de puntos sobre la que se teselan las celdas',
        ids: new Set(puntos.rows.map(r => Number(r.bahia_id))),
        campos: ['lat', 'lng', 'nombre'],
        contenido: new Map(puntos.rows.map(r => [Number(r.bahia_id), {
          lat: Number(r.lat), lng: Number(r.lng), nombre: r.nombre,
        }])),
      },
      F5: {
        clave: 'F5',
        ruta: `postgres ${db} :: bahia_jurisdicciones (matview)`,
        rol: 'las celdas que el motor consulta para resolver qué bahías cruza la ruta',
        ids: new Set(celdas.rows.map(r => Number(r.bahia_id))),
        campos: ['nombre'],
        contenido: new Map(celdas.rows.map(r => [Number(r.bahia_id), { nombre: r.nombre }])),
      },
    };
  } finally {
    await pool.end();
  }
}

// ── informe ──────────────────────────────────────────────────────────────────
function imprimir(informe, origen, rutaDecl) {
  const L = console.log;
  L('='.repeat(80));
  L('CONTROL DE DRIFT DEL CATÁLOGO DE BAHÍAS — E0.1');
  L(`corrida        : ${new Date().toISOString()}`);
  L(`origen SITPORT : ${origen}`);
  L(`declaración    : ${rutaDecl}`);
  L('='.repeat(80));

  L('');
  L('FUENTES INTERNAS COMPARADAS');
  for (const f of informe.fuentes_internas) {
    L(`  ${f.clave}  ${String(f.n).padStart(4)} ids   ${f.ruta}`);
    L(`      ${f.rol}`);
    L(`      campos comparables que declara: ${f.campos.length ? f.campos.join(', ') : '(ninguno)'}`);
  }

  L('');
  L('LO QUE SITPORT PUBLICA');
  for (const e of informe.sitport.por_endpoint) {
    L(`  ${e.endpoint.padEnd(22)} ${String(e.registros).padStart(5)} registros  ${String(e.ids).padStart(4)} ids distintos`);
  }
  L(`  ${'UNIÓN de los tres'.padEnd(22)} ${' '.repeat(15)} ${String(informe.sitport.universo).padStart(4)} ids — el universo contra el que se compara`);

  L('');
  L('DIVERGENCIAS');
  if (informe.divergencias.length === 0) {
    L('  ninguna.');
  }
  for (const clase of Object.keys(CLASES)) {
    const grupo = informe.divergencias.filter(d => d.clase === clase);
    if (grupo.length === 0) continue;
    L('');
    L(`  [${clase}] ${CLASES[clase]}`);
    for (const d of grupo) {
      const marca = d.declarada ? (d.estado === 'adjudicada' ? 'ADJUDICADA' : 'ABIERTA') : '*** NO DECLARADA ***';
      const campo = d.campo ? ` campo ${d.campo}` : '';
      L(`    id ${String(d.id_bahia).padStart(4)}${campo}  ${(d.nombre_sitport || '(sin nombre en la fuente)').padEnd(24)} ${marca}`);
      L(`             ${d.detalle}`);
      if (d.declarada) L(`             declarada desde ${d.visto_desde}: ${d.causa}`);
    }
  }

  if (informe.vencidas.length > 0) {
    L('');
    L('DECLARACIONES VENCIDAS — declaran una divergencia que ya no se observa');
    for (const v of informe.vencidas) L(`    ${v.clase} id ${v.id_bahia}${v.campo ? ' campo ' + v.campo : ''}`);
    L('    Una declaración que sobrevive a su divergencia deja de describir la realidad');
    L('    y empieza a taparla. Se retira del archivo.');
  }

  L('');
  L('-'.repeat(80));
  L(`total ${informe.resumen.total} · no declaradas ${informe.resumen.no_declaradas} · ` +
    `abiertas ${informe.resumen.abiertas} · adjudicadas ${informe.resumen.adjudicadas} · ` +
    `vencidas ${informe.resumen.declaraciones_vencidas}`);
  L(`VEREDICTO: ${informe.veredicto}  (salida ${CODIGO_SALIDA[informe.veredicto]})`);
  if (informe.veredicto === 'DRIFT_DECLARADO_ABIERTO') {
    L('Salida 3 NO es verde. Es drift conocido esperando decisión.');
  }
  L('-'.repeat(80));
}

// ── estado versionado ────────────────────────────────────────────────────────
// Condición del owner sobre D8: la divergencia de ámbito B no se le muestra al
// patrón, pero tampoco puede quedar solo en una consola que nadie leyó. Este
// archivo va al repositorio: si el drift cambia, cambia el archivo, y aparece
// como diff sin que nadie haya mirado.
//
// La fecha de corrida se escribe aparte, en `ultima_corrida`, y NO entra en la
// huella: si entrara, cada corrida produciría un diff y el diff dejaría de
// significar "esto cambió".
function escribirEstado(informe, origen) {
  const huella = {
    veredicto: informe.veredicto,
    fuentes_internas: informe.fuentes_internas.map(f => ({ clave: f.clave, n: f.n })),
    universo_sitport: informe.sitport.universo,
    divergencias: informe.divergencias.map(d => ({
      clase: d.clase, id_bahia: d.id_bahia, campo: d.campo || null,
      nombre_sitport: d.nombre_sitport, detalle: d.detalle,
      estado: d.declarada ? d.estado : 'no_declarada',
    })),
    declaraciones_vencidas: informe.vencidas,
  };
  const contenido = { ultima_corrida: new Date().toISOString(), origen, ...huella };
  try {
    fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
    fs.writeFileSync(ESTADO, JSON.stringify(contenido, null, 2) + '\n');
  } catch (e) {
    console.error(`[estado] no se pudo escribir ${ESTADO}: ${e.message}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  let declaracion;
  try {
    declaracion = JSON.parse(fs.readFileSync(RUTA_DECL, 'utf8'));
  } catch (e) {
    console.error(`No se pudo leer la declaración ${RUTA_DECL}: ${e.message}`);
    process.exit(CODIGO_SALIDA.DRIFT_NO_DECLARADO);
  }

  let capturas, origen;
  try {
    ({ capturas, origen } = await obtenerCapturas());
  } catch (e) {
    console.error('='.repeat(80));
    console.error(`NO SE PUDO MEDIR: ${e.message}`);
    console.error('Sin las tres capturas la comparación sería parcial, y una comparación');
    console.error('parcial que sale limpia es peor que no correr el control.');
    console.error('='.repeat(80));
    process.exit(CODIGO_SALIDA.NO_SE_PUDO_MEDIR);
  }

  let internas;
  try {
    internas = leerFuentesInternas(RAIZ);
  } catch (e) {
    console.error(`FUENTE INTERNA ILEGIBLE: ${e.message}`);
    process.exit(CODIGO_SALIDA.DRIFT_NO_DECLARADO);
  }

  const deBase = (declaracion.fuentes_internas || []).filter(c => c === 'F4' || c === 'F5');
  if (deBase.length > 0) {
    try {
      const disponibles = await fuentesBaseDeDatos();
      for (const clave of deBase) internas.push(disponibles[clave]);
    } catch (e) {
      console.error('='.repeat(80));
      console.error(`NO SE PUDO MEDIR: la declaración exige comparar ${deBase.join(' y ')} y la base no respondió — ${e.message}`);
      console.error('='.repeat(80));
      process.exit(CODIGO_SALIDA.NO_SE_PUDO_MEDIR);
    }
  }

  let informe;
  try {
    informe = compararCatalogos({ internas, capturas, declaracion });
  } catch (e) {
    if (e instanceof ErrorCatalogoBahias) {
      console.error('='.repeat(80));
      console.error(`EL CONTROL SE DETIENE: ${e.message}`);
      console.error('='.repeat(80));
      process.exit(CODIGO_SALIDA.DRIFT_NO_DECLARADO);
    }
    throw e;
  }

  imprimir(informe, origen, RUTA_DECL);
  if (ESTADO) escribirEstado(informe, origen);
  process.exit(CODIGO_SALIDA[informe.veredicto]);
})().catch(e => {
  console.error('ERROR NO CONTROLADO:', e);
  process.exit(CODIGO_SALIDA.DRIFT_NO_DECLARADO);
});
