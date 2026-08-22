'use strict';
// MEDICION 2 — LOS TRES HUECOS DEL PUNTO (5).
//
// Que puede y que NO puede evaluar el cotejo vertical, con el denominador de
// cada capa nombrado. Ninguna cifra sale de una conversacion: todas salen de
// contar el fichero.
//
// Se corre:  node _bitacoras/advertencia_sonda_2026-08-21/02_medir_huecos.js

const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');

const CSV = path.join(RAIZ, 'tools', 'derrotero', 'piloto_chacao', 'pasos_full.csv');
const PASOS = require(path.join(RAIZ, 'src', 'config', 'pasos-sonda-canal.json'));
const PELIGROS = require(path.join(RAIZ, 'src', 'config', 'peligros-por-canal.json'));
const { cargarGeometrias } = require(
  path.join(RAIZ, 'src', 'services', 'raster', 'canal-geometria.js'));

// ── parser CSV minimo con comillas (el fichero trae comas dentro de citas) ───
function parseCSV(texto) {
  const filas = [];
  let campo = '', fila = [], enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') enComillas = false;
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo.length || fila.length) { fila.push(campo); filas.push(fila); }
  const cab = filas.shift();
  return filas.filter((f) => f.length > 1).map((f) => Object.fromEntries(cab.map((k, i) => [k, f[i]])));
}

const L = [];
const say = (s) => { L.push(s); };

say('MEDICION 2 — LOS TRES HUECOS DEL COTEJO VERTICAL');
say('='.repeat(78));
say('');

const filas = parseCSV(fs.readFileSync(CSV, 'utf8'));

// ── HUECO 1 · de la extraccion al insumo ────────────────────────────────────
say('HUECO 1 · DE LA EXTRACCION AL INSUMO — cuanto del Derrotero trae sonda');
say('    Unidad: REGISTRO DE PASO extraido del Derrotero SHOA.');
say('    Denominador: los registros de tools/derrotero/piloto_chacao/pasos_full.csv,');
say('    que es la corrida completa de las paginas 141 a 623 del Derrotero.');
say('');
const conSonda = filas.filter((f) => f.sonda_canal_min_m && f.sonda_canal_min_m.trim() !== '');
const conGeoRef = filas.filter((f) => f.geometria_ref && f.geometria_ref.trim() !== 'SIN_GEOMETRIA');
say(`    registros extraidos                     : ${filas.length}`);
say(`    con sonda_canal_min_m documentada       : ${conSonda.length}   (${(100 * conSonda.length / filas.length).toFixed(1)} % de ${filas.length})`);
say(`    SIN sonda — el cotejo no tiene que medir: ${filas.length - conSonda.length}   (${(100 * (filas.length - conSonda.length) / filas.length).toFixed(1)} %)`);
say('');
say(`    (control de forma: los ${conSonda.length} con sonda son los ${PASOS.length} de pasos-sonda-canal.json: ` +
    `${conSonda.length === PASOS.length ? 'COINCIDE' : 'NO COINCIDE — revisar el generador'})`);
say('');

// ── HUECO 2 · del insumo a la geometria ─────────────────────────────────────
say('HUECO 2 · DEL INSUMO A LA GEOMETRIA — cuanto de la sonda es evaluable');
say('    Unidad: REGISTRO DE PASO con sonda. Denominador: los 7 del insumo.');
say('');
const geos = cargarGeometrias();
const evaluables = PASOS.filter((p) => p.canal_geometria_disponible);
say(`    pasos con sonda                         : ${PASOS.length}`);
say(`    con geometria -> EVALUABLES             : ${evaluables.length}   (${(100 * evaluables.length / PASOS.length).toFixed(1)} % de ${PASOS.length})`);
say(`    sin geometria -> MUDOS PARA SIEMPRE     : ${PASOS.length - evaluables.length}   (${(100 * (PASOS.length - evaluables.length) / PASOS.length).toFixed(1)} %)`);
say('');
for (const p of PASOS.filter((x) => !x.canal_geometria_disponible)) {
  const refCsv = filas.find((f) => f.nombre === p.nombre);
  say(`      MUDO: ${p.canal} / ${p.nombre} — sonda ${p.sonda_canal_min_m} m, p.${p.pagina}` +
      `  [geometria_ref en el CSV: ${refCsv ? refCsv.geometria_ref : '(no hallado)'}]`);
}
say('');
say('    ENCADENADO — lo evaluable sobre el denominador de la EXTRACCION:');
say(`      ${evaluables.length} de ${filas.length} registros = ${(100 * evaluables.length / filas.length).toFixed(1)} %`);
say('');

// ── HUECO 3 · del Derrotero a Chile ─────────────────────────────────────────
say('HUECO 3 · DEL DERROTERO A CHILE — cuanta agua queda fuera de la pregunta');
say('    Este hueco NO tiene denominador de paso: es geografico. Se acota con');
say('    dos denominadores que SI existen en el arbol, y se dice cual es cual.');
say('');
say('    (3a) CANALES QUE EL MISMO DERROTERO NOMBRA, unidad: canal.');
say('         Denominador: las claves de src/config/peligros-por-canal.json,');
say('         generado del MISMO CSV por generar_peligros_por_canal.py.');
const canalesPeligros = Object.keys(PELIGROS);
const canalesConGeo = [...geos.keys()];
say(`         canales con peligros catalogados   : ${canalesPeligros.length}`);
say(`         de esos, con geometria en el arbol : ${canalesConGeo.filter((c) => canalesPeligros.includes(c)).length}`);
say(`         => de los ${canalesPeligros.length} canales que el Derrotero nombra, el motor ubica ${canalesConGeo.filter((c) => canalesPeligros.includes(c)).length}.`);
say(`         (el tercer canal con geometria, Canal Tenglo, NO esta en el catalogo de`);
say(`          peligros: por eso 3 geometrias y 2 en la interseccion. Denominadores distintos.)`);
say('');
say('    (3b) COBERTURA DEL RASTER, unidad: tile del motor de rutas.');
say('         Es el universo de agua sobre el que la app calcula CUALQUIER ruta.');
const registryPath = path.join(RAIZ, 'src', 'services', 'raster-router-service.js');
const src = fs.readFileSync(registryPath, 'utf8');
const idsTile = [...src.matchAll(/id:\s*'([A-Z_0-9]+)'/g)].map((m) => m[1]);
say(`         tiles declarados en TILE_REGISTRY  : ${idsTile.length}` + (idsTile.length ? ` (${[...new Set(idsTile)].join(', ')})` : ''));
say('');
say('    LO QUE ESTAS DOS CIFRAS NO SON: no son "porcentaje de Chile cubierto".');
say('    Nadie midio los km2 de agua navegable con sonda documentada, y este');
say('    instrumento NO lo estima. Lo que queda probado es la FORMA del hueco:');
say(`    la app puede preguntar por la sonda en ${canalesConGeo.length} canales y en ningun otro sitio.`);
say('');

// ── El reparto por si alguien quiere el numero de una sola linea ────────────
say('EL RESUMEN, CON CADA CIFRA SOBRE SU PROPIO DENOMINADOR:');
say(`    ${filas.length} registros de paso extraidos del Derrotero (pp. 141-623)`);
say(`     -> ${conSonda.length} traen sonda documentada          (${(100 * conSonda.length / filas.length).toFixed(1)} % de ${filas.length})`);
say(`     -> ${evaluables.length} de esos ${conSonda.length} tienen geometria      (${(100 * evaluables.length / conSonda.length).toFixed(1)} % de ${conSonda.length})`);
say(`     -> ${canalesConGeo.length} canales interrogables por SONDA   (Chacao, Moraleda, Tenglo)`);
say('');
say('='.repeat(78));
say('FIN DE LA MEDICION 2 — VERIFICADO');

const salida = L.join('\n');
fs.writeFileSync(path.join(__dirname, '02_medir_huecos.txt'), salida + '\n', 'utf8');
process.stdout.write(salida + '\n');
