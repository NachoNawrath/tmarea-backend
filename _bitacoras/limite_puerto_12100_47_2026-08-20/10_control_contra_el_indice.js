'use strict';
// CONTROL CONTRA EL INDICE.
//
// LA REGLA QUE COSTO UN COMMIT MALO: toda cifra que vaya en un mensaje de commit
// sale de correr el control contra el INDICE (git show :ruta), no contra el
// disco. 2d47022 commiteo un indice obsoleto -- el mensaje decia 36 filas y el
// objeto tenia 34 -- y la verificacion de push NO lo cazo y NO PODIA: comparar
// main contra origin/main comprueba que lo subido es lo commiteado, nunca que lo
// commiteado es lo medido.
//
// Instrumento hermano: _bitacoras/tres_de_d4_2026-08-20/08_control_contra_el_indice.js
//
// Cuatro controles:
//   (1) INDICE CONTRA DISCO, por git diff --quiet y NO por sha.
//   (2) LOS INTOCABLES NO ENTRARON.
//   (3) LAS CIFRAS DEL MENSAJE, leidas del INDICE.
//   (4) EL sha256 DEL .txt SOBREVIVE AL INDICE -- que es para lo que se puso el
//       .gitattributes, y no se da por bueno porque el fichero exista.

const { execSync } = require('child_process');
const crypto = require('crypto');

const sh = (c) => execSync(c, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const shBuf = (c) => execSync(c, { cwd: process.cwd(), maxBuffer: 64 * 1024 * 1024 });
const say = (s) => console.log(s);

const D = '_bitacoras/limite_puerto_12100_47_2026-08-20';
const INTOCABLES = ['.claude/launch.json', 'data/catalogo/estado_drift.json'];
const SHA_TXT_DECLARADO = 'dc8a1506291c3172f47cc4a4e872dc475c777c3429ad8d3e989df9844eb2430a';
const SHA_PDF_DECLARADO = 'a9045b8801adff2240d6c8327800750d16d33ac578d06ceb73bf17111f6fc005';

say('CONTROL CONTRA EL INDICE');
say('='.repeat(78));
say('');
say('HEAD        : ' + sh('git rev-parse HEAD').trim());
say('origin/main : ' + sh('git rev-parse origin/main').trim());
say('');

let rojo = 0;

// ── (1) indice contra disco ────────────────────────────────────────────────
say('1 - INDICE CONTRA DISCO   (por git diff --quiet, NO por sha)');
say('');
say('  TERCER DEFECTO DE INSTRUMENTO PROPIO DE ESTA SESION, y va escrito.');
say('  La primera version media TODO lo stageado, incluida su PROPIA SALIDA. La');
say('  primera corrida paso solo porque 10_control_contra_el_indice.txt todavia no');
say('  estaba versionado. En cuanto lo estuvo, la redireccion del shell TRUNCA el');
say('  fichero antes de que node arranque, asi que el control se encontraba con su');
say('  propia salida vacia en disco y llena en el indice, y salia ROJO sobre un');
say('  arbol correcto. Otra vez la misma familia: corria perfecto y medía otra cosa.');
say('');
say('  Correccion: la salida de este control queda FUERA de su propio alcance. Un');
say('  instrumento no puede comparar contra el indice un fichero que todavia no');
say('  termino de escribir. LIMITE QUE ESO DEJA, dicho y no escondido: quien');
say('  audite esto tiene que comprobar aparte que 10_control_contra_el_indice.txt');
say('  se stageo despues de correr -- y ahi lo unico que vale es git status.');
say('');
const AUTO_EXCLUIDO = D + '/10_control_contra_el_indice.txt';
const ALCANCE = [D, 'data/deudas/deudas_declaradas.json', 'scripts/validar_deudas_declaradas.js',
                 ':(exclude)' + AUTO_EXCLUIDO];
let limpio = true;
try { sh('git diff --quiet -- ' + ALCANCE.map((p) => '"' + p + '"').join(' ')); }
catch (e) { limpio = false; }
say('  alcance: la bitacora + el declarativo + el validador, MENOS');
say('           ' + AUTO_EXCLUIDO);
say('  git diff --quiet -> exit ' + (limpio ? '0' : 'distinto de 0'));
say('  VEREDICTO: ' + (limpio
  ? 'OK - lo que esta en el indice es byte a byte lo que esta en disco'
  : 'ROJO - hay cambios en disco que NO estan en el indice'));
if (!limpio) rojo++;
say('');
say('  CONTROL POSITIVO de este control: el mismo git diff --quiet, corrido sobre');
say('  los DOS INTOCABLES, tiene que dar distinto de 0 -- porque estan modificados');
say('  a proposito y sin stagear. Si diera 0, el instrumento no sabria ver una');
say('  diferencia y su OK de arriba no valdria nada.');
let intocablesSucios = false;
try { sh('git diff --quiet -- .claude/launch.json data/catalogo/estado_drift.json'); }
catch (e) { intocablesSucios = true; }
say('  -> ' + (intocablesSucios
  ? 'OK - da distinto de 0 sobre los intocables. El instrumento SI ve diferencias.'
  : 'ROJO - da 0 sobre ficheros que sabemos modificados: no mide nada.'));
if (!intocablesSucios) rojo++;
say('');

// ── (2) los intocables ─────────────────────────────────────────────────────
say('2 - LOS INTOCABLES NO ENTRARON');
const porcelain = sh('git status --porcelain').split('\n');
for (const f of INTOCABLES) {
  const linea = porcelain.find((l) => l.slice(3).trim() === f);
  const estado = linea ? linea.slice(0, 2) : '(ausente)';
  const ok = estado === ' M';
  say('  ' + f.padEnd(34) + ' -> "' + estado + '"  ' + (ok ? 'OK (modificado, SIN stagear)' : 'ROJO'));
  if (!ok) rojo++;
}
const stageados = sh('git diff --cached --name-only').trim().split('\n').filter(Boolean);
const intrusos = stageados.filter((f) => INTOCABLES.includes(f));
say('  intocables dentro del indice: ' + (intrusos.length ? intrusos.join(', ') + '  ROJO' : 'ninguno  OK'));
if (intrusos.length) rojo++;
say('');
say('  ficheros en el indice: ' + stageados.length);
say('    NOTA de unidad: este numero es el del indice EN EL MOMENTO DE ESTA');
say('    CORRIDA. La salida de este mismo control -- 10_control_contra_el_indice.txt --');
say('    se escribe despues y se stagea despues, asi que el indice final tiene ' +
    (stageados.length + 1) + '.');
say('    Se dice en vez de dejar dos numeros sueltos que no cuadran.');
say('');

// ── (3) las cifras del mensaje, del INDICE ─────────────────────────────────
say('3 - LAS CIFRAS DEL MENSAJE DE COMMIT, LEIDAS DEL INDICE');
const Didx = JSON.parse(sh('git show :data/deudas/deudas_declaradas.json'));
const Ddisk = JSON.parse(require('fs').readFileSync('data/deudas/deudas_declaradas.json', 'utf8'));

const cuenta = (D0) => {
  const unicas = D0.deudas.filter((d) => !d.duplicada_de);
  return {
    filas: D0.deudas.length,
    unicas: unicas.length,
    vivas: unicas.filter((d) => d.estado === 'viva').length,
    sitios: D0.cobertura.sitios.length,
    barridos: D0.cobertura.sitios.filter((s) => s.barrido).length,
  };
};
const cIdx = cuenta(Didx), cDisk = cuenta(Ddisk);

for (const k of Object.keys(cIdx)) {
  const ok = cIdx[k] === cDisk[k];
  say('  ' + k.padEnd(10) + ' indice: ' + String(cIdx[k]).padStart(3) +
      '   disco: ' + String(cDisk[k]).padStart(3) + '   ' + (ok ? 'OK' : 'ROJO'));
  if (!ok) rojo++;
}
say('');
say('  LAS CIFRAS QUE PUEDEN IR EN EL MENSAJE, y salen del INDICE:');
say('    ' + cIdx.filas + ' filas · ' + cIdx.unicas + ' unicas · ' + cIdx.vivas +
    ' vivas · ' + cIdx.sitios + ' sitios · ' + cIdx.barridos + ' barridos · ' +
    (cIdx.sitios - cIdx.barridos) + ' sin barrer');
const fila = Didx.deudas.find((d) => d.id === 'LIMITE-PUERTO::12100-47-cruzada-contra-el-catalogo');
say('    la fila nueva esta en el indice: ' + (fila ? 'SI' : 'NO  ROJO'));
if (!fila) rojo++;
else say('      grupo ' + fila.grupo + ' · estado ' + fila.estado +
         ' · firmada ' + fila.firma_owner.firmada);
const canon = sh('git show :scripts/validar_deudas_declaradas.js');
const enCanon = canon.includes('SESION-limite-puerto-12100-47-2026-08-20');
say('    el sitio nuevo esta en SITIOS_CANON del indice: ' + (enCanon ? 'SI' : 'NO  ROJO'));
if (!enCanon) rojo++;
say('');

// ── (4) el sha256 sobrevive al indice ──────────────────────────────────────
say('4 - EL sha256 SOBREVIVE AL INDICE   (para esto se puso el .gitattributes)');
say('  No se da por bueno porque el fichero exista: se saca el blob DEL INDICE');
say('  y se le vuelve a calcular el sha256.');
const pares = [
  ['DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.txt', SHA_TXT_DECLARADO],
  ['DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.pdf', SHA_PDF_DECLARADO],
];
for (const [f, esperado] of pares) {
  const blob = shBuf('git show ":' + D + '/' + f + '"');
  const sha = crypto.createHash('sha256').update(blob).digest('hex');
  const ok = sha === esperado;
  say('  ' + f);
  say('    declarado en PROCEDENCIA.md : ' + esperado);
  say('    recalculado desde el indice : ' + sha);
  say('    bytes en el indice          : ' + blob.length.toLocaleString('es-CL'));
  say('    -> ' + (ok ? 'OK' : 'ROJO - git normalizo el fichero y el sha declarado es falso'));
  if (!ok) rojo++;
}
say('');
say('  CONTROL POSITIVO de este control.');
say('');
say('  DEFECTO DE INSTRUMENTO PROPIO, cazado en la primera corrida y por eso queda');
say('  escrito. La primera version comparaba el TAMANO en indice contra el tamano');
say('  en disco, esperando ver normalizacion. Dio 0 de 25 y salio ROJO sobre un');
say('  arbol correcto. Estaba mal PENSADO: con core.autocrlf=true la conversion');
say('  LF->CRLF ocurre al SACAR (checkout), no al METER (add), asi que comparar');
say('  indice contra disco no puede verla nunca. Corria perfecto y medía otra cosa,');
say('  que es la familia de siempre.');
say('');
say('  El instrumento correcto es git ls-files --eol, que dice el fin de linea');
say('  REAL del blob en el indice y el atributo en vigor:');
const eol = sh('git ls-files --eol -- ' + D).trim().split('\n').map((l) => {
  const [attrs, ruta] = l.split('\t');
  const [i, w, a] = attrs.trim().split(/\s+/);
  return { i, w, a, ruta: ruta.replace(D + '/', '') };
});
const elTxt = eol.find((e) => e.ruta.endsWith('mod-2021-08-16.txt'));
const unJs = eol.find((e) => e.ruta.endsWith('.js'));
say('    ' + elTxt.ruta);
say('      ' + elTxt.i + '  ' + elTxt.a + '   <- CRLF conservado en el INDICE, por -text');
say('    ' + unJs.ruta);
say('      ' + unJs.i + '  attr/(sin especificar)   <- LF, y CRLF al sacarlo en un clon');
say('');
say('  O sea que la regla no es preventiva para el futuro: TRABAJO EN ESTE MISMO');
say('  add. pdftotext escribio el .txt con CRLF; sin el .gitattributes, autocrlf');
say('  lo habria pasado a LF AL METERLO y el sha declarado seria falso YA, no en');
say('  un clon. La contrafactual, calculada:');
const blobTxt = shBuf('git show ":' + D + '/DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.txt"');
const normalizado = Buffer.from(blobTxt.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
const shaNorm = crypto.createHash('sha256').update(normalizado).digest('hex');
say('    sha256 real, con la regla    : ' + SHA_TXT_DECLARADO + '  (' +
    blobTxt.length.toLocaleString('es-CL') + ' bytes)');
say('    sha256 si git lo normalizaba : ' + shaNorm + '  (' +
    normalizado.length.toLocaleString('es-CL') + ' bytes)');
const posOk = elTxt.i === 'i/crlf' && elTxt.a === 'attr/-text' && shaNorm !== SHA_TXT_DECLARADO;
say('    -> ' + (posOk
  ? 'OK - son sha distintos y ' + (blobTxt.length - normalizado.length).toLocaleString('es-CL') +
    ' bytes de diferencia. La regla evito un sha falso, medido.'
  : 'ROJO - o el atributo no esta en vigor, o no habia nada que normalizar'));
if (!posOk) rojo++;
say('');

say('='.repeat(78));
say('VEREDICTO: ' + (rojo === 0 ? 'VERDE - los cuatro controles pasan' : 'ROJO (' + rojo + ')'));
say('');
say('LO QUE ESTE CONTROL NO PRUEBA: que lo commiteado sea lo correcto. Prueba que');
say('lo que se va a commitear es lo que se midio. Sin commit hasta autorizacion.');
process.exit(rojo === 0 ? 0 : 3);
