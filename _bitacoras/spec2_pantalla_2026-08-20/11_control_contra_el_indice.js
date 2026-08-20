'use strict';
// TODA CIFRA QUE VAYA EN UN MENSAJE DE COMMIT SALE DEL INDICE, NO DEL DISCO.
// Es la regla que dejo el commit 2d47022, que publico 36 filas cuando el objeto
// commiteado tenia 34, porque el git add se hizo antes de tres ediciones.
//
// Este control extrae los DOS ficheros desde el INDICE (git show :ruta), corre
// el validador del indice contra el dato del indice, y compara sus cifras con
// las del disco. Si el indice esta viejo, las cifras no calzan y se ve aca.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'indice-deudas-'));

function delIndice(ruta) {
  return execFileSync('git', ['show', ':' + ruta], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 });
}

// --- 1. los dos ficheros, desde el indice ------------------------------------
const datoIdx = delIndice('data/deudas/deudas_declaradas.json');
const valIdx = delIndice('scripts/validar_deudas_declaradas.js');
const pDato = path.join(tmp, 'deudas_declaradas.json');
const pVal = path.join(tmp, 'validar.js');
fs.writeFileSync(pDato, datoIdx);
fs.writeFileSync(pVal, valIdx);

console.log('FICHEROS EXTRAIDOS DEL INDICE');
console.log('  data/deudas/deudas_declaradas.json    ' + datoIdx.length + ' bytes');
console.log('  scripts/validar_deudas_declaradas.js  ' + valIdx.length + ' bytes');
console.log('');

// --- 2. la canon del validador DEL INDICE ------------------------------------
const canon = (valIdx.toString('utf8').match(/const SITIOS_CANON = \[([\s\S]*?)\];/) || [])[1] || '';
const sitiosCanon = [...canon.matchAll(/'([^']+)'/g)].map(m => m[1]);
console.log('CANON DEL VALIDADOR **DEL INDICE**: ' + sitiosCanon.length + ' sitios');
console.log('  ¿incluye PLAN-2? ' + (sitiosCanon.includes('PLAN-2') ? 'SI' : 'NO'));
console.log('');

// --- 3. el dato del indice, contado a mano -----------------------------------
const D = JSON.parse(datoIdx.toString('utf8'));
const noVivos = new Set(['cerrada', 'caduca']);
let unicas = 0, vivas = 0, cerradas = 0;
for (const d of D.deudas) {
  const dup = d.duplicada_de !== null && d.duplicada_de !== undefined;
  if (!dup) { unicas++; if (!noVivos.has(d.estado)) vivas++; }
  if (d.estado === 'cerrada') cerradas++;
}
const plan2 = D.deudas.filter(d => d.sitio === 'PLAN-2');
const barridos = D.cobertura.sitios.filter(s => s.barrido === true).length;

console.log('CONTADO A MANO SOBRE EL DATO **DEL INDICE**');
console.log('  version                : ' + D.version + '   generado: ' + D.generado);
console.log('  sitios en cobertura    : ' + D.cobertura.sitios.length + '   barridos ' + barridos + '   sin barrer ' + (D.cobertura.sitios.length - barridos));
console.log('  FILAS                  : ' + D.deudas.length);
console.log('  unicas                 : ' + unicas + '   duplicadas ' + (D.deudas.length - unicas));
console.log('  VIVAS                  : ' + vivas + '   no vivas ' + (unicas - vivas) + '   (cerradas por trabajo ' + cerradas + ')');
console.log('  filas del sitio PLAN-2 : ' + plan2.length);
const decl = (D.cobertura.sitios.find(s => s.id === 'PLAN-2') || {}).filas_en_este_declarativo;
console.log('  PLAN-2 declara         : ' + decl + '   -> ' + (decl === plan2.length ? 'CALZA' : '!!! NO CALZA'));
console.log('');

// --- 4. correr el validador DEL INDICE sobre el dato DEL INDICE ---------------
console.log('EL VALIDADOR DEL INDICE, CORRIDO SOBRE EL DATO DEL INDICE');
let salida, code = 0;
try {
  salida = execFileSync(process.execPath, [pVal, '--fichero', pDato], { cwd: RAIZ, encoding: 'utf8' });
} catch (e) {
  salida = (e.stdout || '') + (e.stderr || '');
  code = e.status;
}
salida.split('\n').filter(Boolean).forEach(l => console.log('  ' + l));
console.log('  exit ' + code);
console.log('');

// --- 5. y el disco, para comparar --------------------------------------------
const DISCO = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/deudas/deudas_declaradas.json'), 'utf8'));
console.log('COMPARACION INDICE vs DISCO');
console.log('  filas  indice ' + D.deudas.length + '   disco ' + DISCO.deudas.length + '   -> ' + (D.deudas.length === DISCO.deudas.length ? 'IGUALES' : '!!! DISTINTOS — EL INDICE ESTA VIEJO'));
console.log('  sitios indice ' + D.cobertura.sitios.length + '   disco ' + DISCO.cobertura.sitios.length + '   -> ' + (D.cobertura.sitios.length === DISCO.cobertura.sitios.length ? 'IGUALES' : '!!! DISTINTOS'));

fs.rmSync(tmp, { recursive: true, force: true });
