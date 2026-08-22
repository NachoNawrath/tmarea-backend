'use strict';
// CONTROL POSITIVO DEL ARREGLO (B). No alcanza con decir que la mordida vieja
// habia dejado de morder: hay que verla no morder.
//
// QUE MIDE: corre el emisor con la mutacion VIEJA —`divididos_cuales = []`—
// sobre el dato de hoy, donde `divididos` vale 0 y `[]` es el valor legitimo. Si
// el emisor PUBLICA (exit 0), la mutacion no rompio nada y la mordida vieja
// habria reportado FALLA sin haber probado lo que dice probar.
//
// Y DE PASO MIDE LA DIRECCION, que es donde me equivoque al reportar el gate: yo
// dije que caducaba «en verde». Caduca en ROJO —la mordida reporta FALLA porque
// el emisor no se detuvo—, que es mejor: se anuncia sola. Lo que SI pasa en
// verde es otra cosa y esta medido aparte en 05: si el dato base ya es invalido,
// TODA la lista pasa al vacio y solo el control negativo lo ve.
//
// Restaura el fichero byte a byte, igual que la mordida real, y lo comprueba.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RUTA = path.join(__dirname, '..', '..', 'data', 'spec2', 'cifra_spec2.json');
const EMISOR = path.join(__dirname, '..', '..', 'scripts', 'publicar_cifra_spec2.js');
const ORIGINAL = fs.readFileSync(RUTA, 'utf8');

function correrCon(json) {
  try {
    fs.writeFileSync(RUTA, JSON.stringify(json, null, 2) + '\n', { encoding: 'utf8' });
    try {
      execFileSync('node', [EMISOR], { encoding: 'utf8', stdio: 'pipe' });
      return 0;
    } catch (e) {
      return e.status == null ? -1 : e.status;
    }
  } finally {
    fs.writeFileSync(RUTA, ORIGINAL, { encoding: 'utf8' });
  }
}

const vivo = JSON.parse(ORIGINAL);
console.log('ESTADO DEL DATO HOY');
console.log(`  divididos ............ ${vivo.denominador_por_punto.divididos}`);
console.log(`  divididos_cuales ..... ${JSON.stringify(vivo.denominador_por_punto.divididos_cuales)}`);
console.log('');

// (1) LA MUTACION VIEJA, tal cual estaba escrita hasta hoy.
const a = JSON.parse(ORIGINAL);
a.denominador_por_punto.divididos_cuales = [];
const exitVieja = correrCon(a);
console.log('MUTACION VIEJA  ->  divididos_cuales = []');
console.log(`  el emisor devolvio exit ${exitVieja}`);
console.log(`  la mordida vieja habria reportado: ${exitVieja !== 0 ? 'ok (muerde)' : 'FALLA (no muerde)'}`);
console.log(`  VEREDICTO: ${exitVieja === 0 ? 'DEJO DE MORDER — la mutacion es identica al dato vivo' : 'todavia muerde'}`);
console.log('');

// (2) LA MUTACION NUEVA, derivada.
const b = JSON.parse(ORIGINAL);
const p = b.denominador_por_punto;
p.divididos_cuales = [...p.divididos_cuales, 'ZZ-SOBRANTE'];
const exitNueva = correrCon(b);
console.log('MUTACION NUEVA  ->  divididos_cuales = [...divididos_cuales, "ZZ-SOBRANTE"]');
console.log(`  el emisor devolvio exit ${exitNueva}`);
console.log(`  VEREDICTO: ${exitNueva !== 0 ? 'MUERDE' : 'NO MUERDE — el arreglo no sirvio'}`);
console.log('');

const final = fs.readFileSync(RUTA, 'utf8');
console.log(`el dato quedo byte a byte como estaba: ${final === ORIGINAL ? 'SI' : 'NO — se ensucio el arbol'}`);

const bien = exitVieja === 0 && exitNueva !== 0 && final === ORIGINAL;
console.log('');
console.log(bien
  ? 'CONTROL POSITIVO DEL ARREGLO (B): PASA. La vieja no mordia, la nueva muerde.'
  : 'CONTROL POSITIVO DEL ARREGLO (B): NO PASA.');
process.exit(bien ? 0 : 1);
