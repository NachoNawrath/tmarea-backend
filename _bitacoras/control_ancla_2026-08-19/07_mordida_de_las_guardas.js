#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
// 07_mordida_de_las_guardas.js - (a1)-T
//
// G1 y G2 nacieron en la PARADA 2 para que el par congelado no se venza en
// silencio. Una guarda que nunca se probo contra el defecto que dice cazar es
// una decoracion -- que es exactamente el reproche que las hizo nacer -- asi
// que aca se prueban.
//
// COMO. Se altera TEMPORALMENTE data/catalogo/anclas_declaradas.json y se corre
// EL SCRIPT DE VERDAD, scripts/prueba_mordida_ancla.js, como proceso hijo. NO
// se copia su logica: una simulacion que copia un mecanismo no es ese
// mecanismo, y de eso ya se aprendio en esta carpeta. Lo que corre es el
// instrumento, no una imitacion.
//
// El fichero se restituye SIEMPRE -- la escritura de vuelta esta en un
// `finally`, no al final del camino feliz -- y la restitucion se prueba
// comparando el sha256 de antes y de despues. No toca la base ni necesita red.
//
// PERO UN `finally` NO SOBREVIVE A UN KILL. Si el proceso muere entre la
// alteracion y la restitucion, queda un data/catalogo/anclas_declaradas.json
// alterado en el arbol, y eso es dato de produccion. PROCEDIMIENTO DE
// RECUPERACION, y no hace falta ningun .bak porque el declarativo es
// REPRODUCIBLE:
//
//     node _bitacoras/control_ancla_2026-08-19/01_construir_declarativo.js
//
// lo reconstruye desde 03_antes_despues.tsv, que es su unica fuente, y tiene
// que dar sha256 88802142085f1f7b3c416fc2bd0270b76c47d16f4aafb634834e8b9598011f32
// sobre los BYTES EN DISCO (clase FA-4). Si el fichero ya esta commiteado,
// `git checkout -- data/catalogo/anclas_declaradas.json` hace lo mismo mas
// rapido. Las dos vias se comprueban con `npm run ancla:mordida`, que sale 0
// solo si G1 vuelve a encontrar el par identico.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const DECL = path.join(RAIZ, 'data/catalogo/anclas_declaradas.json');
const MORDIDA = path.join(RAIZ, 'scripts/prueba_mordida_ancla.js');
const FOTO = path.join(__dirname, '02_par_lectura_781_2026-08-19.json');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det !== undefined ? ' - ' + det : ''));
  else { fallas.push(n); say('  x ROJO - ' + n + (det !== undefined ? ' - ' + det : '')); }
};
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

const ORIGINAL = fs.readFileSync(DECL);
const SHA_ORIGINAL = sha(ORIGINAL);

function correrMordida() {
  const r = spawnSync(process.execPath, [MORDIDA], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  return { code: r.status, salida: (r.stdout || '') + (r.stderr || '') };
}

say('='.repeat(78));
say('(a1)-T - MORDIDA DE LAS GUARDAS G1 y G2 DE LA PRUEBA DE MORDIDA');
say('corrida ' + new Date().toISOString());
say('='.repeat(78));
say('');
say('  declarativo vivo, sha256 de partida: ' + SHA_ORIGINAL);

try {
  // ── CONTROL NEGATIVO: sin tocar nada, la mordida real sale 0 ──────────────
  say('');
  say('CN - SIN TOCAR NADA la mordida real tiene que salir 0');
  const cn = correrMordida();
  exigir('exit 0', cn.code === 0, 'exit ' + cn.code);
  exigir('G1 verde', /ok la declaracion viva y la congelada son el MISMO fichero/.test(cn.salida));
  exigir('G2 verde', /ok data\/catalogo\/anclas_declaradas\.json pasa la validacion/.test(cn.salida));

  // ── MG1: se declara un nodo DOCE que el fixture no cubre ──────────────────
  // Se elige un nodo REAL de la foto Y CON ANCLA PUESTA: es literalmente el
  // caso que el owner nombro -- "el dia que se declare un nodo que hoy tiene
  // ancla puesta" -- y ademas prueba que G1 muerde ANTES de que el control
  // negativo pueda dar su rojo confuso.
  say('');
  say('MG1 - SE DECLARA UN NODO DOCE Y EL PAR NO SE REFRESCA');
  const foto = JSON.parse(fs.readFileSync(FOTO, 'utf8'));
  const doce = foto.filas.find(f => f.bahia_sitport_id !== null);
  say('    nodo elegido: #' + doce.id + ' con ancla ' + doce.bahia_sitport_id + ' en la foto');
  const viva = JSON.parse(ORIGINAL.toString('utf8'));
  viva.filas.push({
    nodo_id: doce.id, nombre: doce.nombre, fuente: doce.fuente, fuente_id: doce.fuente_id,
    lat: doce.lat, lng: doce.lng, ancla_esperada: null,
    pieza: 'INYECTADA POR 07_mordida_de_las_guardas.js - NO ES UNA DECLARACION',
    fecha: '2026-08-19',
  });
  fs.writeFileSync(DECL, JSON.stringify(viva, null, 2) + '\n', { encoding: 'utf8' });
  const mg1 = correrMordida();
  exigir('la mordida real FALLA', mg1.code !== 0, 'exit ' + mg1.code);
  exigir('y dice EL PAR VENCIO', /EL PAR VENCIO/.test(mg1.salida));
  exigir('y nombra al nodo que el fixture no cubre',
    new RegExp('declarados que el fixture NO cubre: ' + doce.id).test(mg1.salida));
  exigir('y da la orden de refresco', /02_congelar_par\.js/.test(mg1.salida));
  const lineasG1 = mg1.salida.split('\n').filter(l => /EL PAR VENCIO|fixture NO cubre|02_congelar_par/.test(l));
  for (const l of lineasG1) say('      | ' + l.trim());

  // ── MG2: la declaracion viva queda estructuralmente invalida ──────────────
  say('');
  say('MG2 - LA DECLARACION VIVA QUEDA INVALIDA (tolerancia negativa)');
  const mala = JSON.parse(ORIGINAL.toString('utf8'));
  mala.tolerancia_grados = -1;
  fs.writeFileSync(DECL, JSON.stringify(mala, null, 2) + '\n', { encoding: 'utf8' });
  const mg2 = correrMordida();
  exigir('la mordida real FALLA', mg2.code !== 0, 'exit ' + mg2.code);
  exigir('y G2 dice que la declaracion VIVA no valida', /la declaracion VIVA no valida/.test(mg2.salida));
  for (const l of mg2.salida.split('\n').filter(l => /declaracion VIVA no valida/.test(l))) say('      | ' + l.trim());
} finally {
  fs.writeFileSync(DECL, ORIGINAL);
}

say('');
say('RESTITUCION - el declarativo vivo tiene que volver byte a byte');
const shaFinal = sha(fs.readFileSync(DECL));
say('    sha256 de partida : ' + SHA_ORIGINAL);
say('    sha256 de llegada : ' + shaFinal);
exigir('el fichero volvio identico', shaFinal === SHA_ORIGINAL, 'si');

say('');
say('CIERRE - y la mordida real vuelve a salir 0 con el fichero restituido');
const cierre = correrMordida();
exigir('exit 0', cierre.code === 0, 'exit ' + cierre.code);

say('');
say('='.repeat(78));
say(fallas.length ? 'ROJO - ' + fallas.length + ' exigencias no se cumplieron'
  : 'VERDE - G1 y G2 muerden, y el declarativo vivo quedo como estaba');
say('='.repeat(78));
fs.writeFileSync(path.join(__dirname, '07_mordida_de_las_guardas.txt'), L.join('\n') + '\n', { encoding: 'utf8' });
process.exit(fallas.length ? 2 : 0);
