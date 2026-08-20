'use strict';
// VERIFICACION DE PUSH, CON EL CONTROL DEL INDICE ADENTRO.
//
// La verificacion de push que este proyecto usaba —comparar el sha local contra
// origin/main y leer los blob-sha del arbol remoto— comprueba que LO SUBIDO ES
// LO COMMITEADO. Nunca comprueba que LO COMMITEADO ES LO MEDIDO. Ese hueco esta
// en toda verificacion de push previa, y es lo que dejo pasar 2d47022.
//
// Este control hace las dos cosas:
//   A. lo subido es lo commiteado  -> fetch + comparacion de sha y de blob-sha
//   B. lo commiteado es lo medido  -> extrae el dato DEL OBJETO REMOTO, corre el
//      validador DEL OBJETO REMOTO sobre el, y compara sus cifras contra las que
//      afirma el MENSAJE DE COMMIT. Si el commit publico un numero que el objeto
//      no tiene, sale aca.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const g = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const gBuf = (...args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 });

let fallos = 0;
const ok = (c, m) => { console.log((c ? '  ok    ' : '  !!    ') + m); if (!c) fallos++; };

console.log('VERIFICACION DE PUSH — ' + new Date().toISOString());
console.log('');

g('fetch', 'origin', 'main');
const local = g('rev-parse', 'HEAD');
const remoto = g('rev-parse', 'origin/main');

console.log('A . LO SUBIDO ES LO COMMITEADO');
console.log('    HEAD        ' + local);
console.log('    origin/main ' + remoto);
ok(local === remoto, 'HEAD y origin/main son el mismo commit');

const FICHEROS = [
  'data/deudas/deudas_declaradas.json',
  'scripts/validar_deudas_declaradas.js',
  '_bitacoras/spec2_pantalla_2026-08-20/spec2_pantalla_2026-08-20.txt',
  '_bitacoras/spec2_pantalla_2026-08-20/11_control_contra_el_indice.js',
];
console.log('');
console.log('    blob-sha en el arbol REMOTO vs en el arbol LOCAL:');
for (const f of FICHEROS) {
  const bl = g('rev-parse', 'HEAD:' + f);
  const br = g('rev-parse', 'origin/main:' + f);
  ok(bl === br, f + '  ' + br.slice(0, 12));
}

// ─── B. lo commiteado es lo medido ──────────────────────────────────────────
console.log('');
console.log('B . LO COMMITEADO ES LO MEDIDO   <- el hueco que esto cierra');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'verif-push-'));
const pDato = path.join(tmp, 'deudas_declaradas.json');
const pVal = path.join(tmp, 'validar.js');
fs.writeFileSync(pDato, gBuf('show', 'origin/main:data/deudas/deudas_declaradas.json'));
fs.writeFileSync(pVal, gBuf('show', 'origin/main:scripts/validar_deudas_declaradas.js'));

const D = JSON.parse(fs.readFileSync(pDato, 'utf8'));
const noVivos = new Set(['cerrada', 'caduca']);
let unicas = 0, vivas = 0;
for (const d of D.deudas) {
  const dup = d.duplicada_de !== null && d.duplicada_de !== undefined;
  if (!dup) { unicas++; if (!noVivos.has(d.estado)) vivas++; }
}
const sitios = D.cobertura.sitios.length;
const barridos = D.cobertura.sitios.filter(s => s.barrido === true).length;
const plan2 = D.deudas.filter(d => d.sitio === 'PLAN-2').length;
const canon = ((fs.readFileSync(pVal, 'utf8').match(/const SITIOS_CANON = \[([\s\S]*?)\];/) || [])[1] || '');
const nCanon = [...canon.matchAll(/'([^']+)'/g)].length;

console.log('    contado sobre el OBJETO REMOTO:');
console.log('      filas ' + D.deudas.length + ' · unicas ' + unicas + ' · vivas ' + vivas +
            ' · sitios ' + sitios + ' · barridos ' + barridos + ' · PLAN-2 ' + plan2 + ' · canon ' + nCanon);

const msg = g('log', '-1', '--format=%B', 'origin/main');

// UN COMMIT PUEDE NO PUBLICAR CIFRAS, y eso NO es un fallo. Lo que seria un
// fallo es publicar una cifra que el objeto no tiene. Asi que primero se
// pregunta si hay algo que contrastar, y solo entonces se contrasta. Sin esto,
// este control saldria en rojo contra cualquier commit que no sea el que lo
// estreno — o sea, seria de un solo uso, que es justo lo contrario de por que
// se versiona.
const AFIRMACIONES = [
  [/FILAS\s+\d+ -> (\d+)/, 'FILAS', D.deudas.length],
  [/VIVAS\s+\d+ -> (\d+)/, 'VIVAS', vivas],
  [/SITIOS\s+\d+ -> (\d+)/, 'SITIOS', sitios],
  [/BARRIDOS \d+ -> (\d+)/, 'BARRIDOS', barridos],
  [/PLAN-2: (\d+) filas/, 'filas de PLAN-2', plan2],
  [/el sitio (\d+) resulto ser la propia especificacion/, 'numero del sitio nuevo', nCanon],
];
const presentes = AFIRMACIONES.filter(([re]) => re.test(msg));

console.log('');
if (presentes.length === 0) {
  console.log('    el mensaje de commit NO publica cifras del declarativo.');
  console.log('    Nada que contrastar, y no es un fallo: lo que este control persigue es');
  console.log('    una cifra PUBLICADA que el objeto no tenga, no la ausencia de cifras.');
} else {
  console.log('    contra lo que AFIRMA el mensaje de commit (' + presentes.length + ' de ' +
              AFIRMACIONES.length + ' cifras publicadas):');
  for (const [re, etiqueta, valor] of presentes) {
    const dice = Number(msg.match(re)[1]);
    ok(dice === valor, etiqueta + ': el mensaje dice ' + dice + ' y el objeto tiene ' + valor);
  }
  const ausentes = AFIRMACIONES.filter(a => !presentes.includes(a)).map(a => a[1]);
  if (ausentes.length) console.log('    (no publicadas en este mensaje: ' + ausentes.join(', ') + ')');
}

console.log('');
console.log('    el validador DEL OBJETO REMOTO sobre el dato DEL OBJETO REMOTO:');
let code = 0, salida;
try { salida = execFileSync(process.execPath, [pVal, '--fichero', pDato], { cwd: RAIZ, encoding: 'utf8' }); }
catch (e) { salida = (e.stdout || '') + (e.stderr || ''); code = e.status; }
const verde = /VERDE -- el declarativo es valido/.test(salida);
ok(code === 0 && verde, 'sale VERDE con exit 0 (exit ' + code + ')');

fs.rmSync(tmp, { recursive: true, force: true });

console.log('');
console.log(fallos === 0 ? 'VERIFICACION: TODO OK' : 'VERIFICACION: ' + fallos + ' FALLO(S)');
process.exit(fallos === 0 ? 0 : 1);
