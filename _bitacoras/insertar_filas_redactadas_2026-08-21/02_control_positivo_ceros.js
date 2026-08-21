// UN CERO SE REINTENTA REFORMULADO ANTES DE PUBLICARSE.
//
// El barrido de prosa —encabezados tipo "FILAS PARA EL DECLARATIVO", "redactadas
// y no aplicadas", "ninguna se inserta"— dio CERO en varios directorios de
// bitacora. Un cero puede significar dos cosas: que no hay nada, o que el
// instrumento no llego. Este control las separa: sobre cada directorio que dio
// cero corre un termino que TIENE que aparecer, y si ese tambien da cero,
// entonces el cero no era del arbol sino del lector.
//
// El control se corre sobre TODOS los directorios de bitacora del 2026-08-18 en
// adelante, que es el tramo donde podia haber filas sin insertar.

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const RAIZ = require('path').resolve(__dirname, '..', '..');
const BIT = path.join(RAIZ, '_bitacoras');

// Lo que se busca: prosa que declare filas para el declarativo.
const AGUJAS = [
  /FILAS? PARA EL DECLARATIVO/i,
  /redactad[ao]s? y no aplicad[ao]s?/i,
  /NINGUNA SE INSERTA/i,
  /sin insertar/i,
];
// El termino del control positivo. Es una palabra vacia del castellano: si NO
// aparece en un fichero de prosa, el lector no llego a ese fichero.
const POSITIVO = /\bde\b/i;

const dirs = fs.readdirSync(BIT, { withFileTypes: true })
  .filter(e => e.isDirectory() && /_2026-08-(1[89]|2[0-9])$/.test(e.name))
  .map(e => e.name).sort();

console.log('CONTROL POSITIVO DE LOS CEROS');
console.log('directorios de bitacora del 2026-08-18 en adelante: ' + dirs.length);
console.log('');

let cerosSanos = 0, cerosSospechosos = 0, conHallazgo = 0;

for (const d of dirs) {
  const dir = path.join(BIT, d);
  let ficheros = [];
  const anda = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const f = path.join(p, e.name);
      if (e.isDirectory()) anda(f);
      else if (/\.(txt|md)$/.test(e.name)) ficheros.push(f);
    }
  };
  anda(dir);

  let hallazgos = 0, alcanzados = 0;
  for (const f of ficheros) {
    const t = fs.readFileSync(f, 'utf8');
    if (POSITIVO.test(t)) alcanzados++;
    if (AGUJAS.some(a => a.test(t))) hallazgos++;
  }

  let veredicto;
  if (hallazgos > 0) { veredicto = 'HALLAZGO'; conHallazgo++; }
  else if (alcanzados > 0) { veredicto = 'cero SANO'; cerosSanos++; }
  else { veredicto = '!! CERO SOSPECHOSO — el lector no llego'; cerosSospechosos++; }

  console.log('  ' + d.padEnd(42) +
    ' ficheros txt/md ' + String(ficheros.length).padStart(3) +
    ' · alcanzados ' + String(alcanzados).padStart(3) +
    ' · hallazgos ' + hallazgos +
    '   ' + veredicto);
}

console.log('');
console.log('RESUMEN — denominador: los ' + dirs.length + ' directorios de arriba; unidad: DIRECTORIO.');
console.log('  con hallazgo de prosa que declara filas : ' + conHallazgo);
console.log('  ceros SANOS (el lector llego y no hay)  : ' + cerosSanos);
console.log('  ceros SOSPECHOSOS (el lector no llego)  : ' + cerosSospechosos);
console.log('');
console.log('  ' + (cerosSospechosos === 0 ? 'OK  ' : '!!  ') +
  'ningun cero quedo sin probar' + (cerosSospechosos ? ' — HAY ' + cerosSospechosos : ''));

// CONTROL NEGATIVO DEL PROPIO CONTROL.
//
// EL CENTINELA SE CONSTRUYE EN TIEMPO DE EJECUCION, Y ESO NO ES ADORNO. La
// primera version uso 'ZZQXNOEXISTE' clavado y salio en rojo con CUATRO
// apariciones, sobre un arbol correcto: ese token es el centinela de
// borde-pwa-backend.test.js y CUATRO bitacoras lo CITAN al documentar sus
// mediciones. Es la leccion ya fichada —un control negativo declara el arbol
// sobre el que corre, y sobre PROSA un centinela literal aparece porque la prosa
// habla de el—. Un token generado al vuelo no puede estar citado por un fichero
// escrito antes, asi que el cero vuelve a significar lo que dice.
const CENTINELA = 'ZZ' + crypto.randomBytes(8).toString('hex').toUpperCase() + 'QX';
let centinela = 0;
for (const d of dirs) {
  const dir = path.join(BIT, d);
  const anda = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const f = path.join(p, e.name);
      if (e.isDirectory()) anda(f);
      else if (/\.(txt|md)$/.test(e.name) && fs.readFileSync(f, 'utf8').includes(CENTINELA)) centinela++;
    }
  };
  anda(dir);
}
console.log('  ' + (centinela === 0 ? 'OK  ' : '!!  ') +
  'control negativo: un centinela generado al vuelo da ' + centinela + ' (esperado 0)');
console.log('      y el literal ZZQXNOEXISTE daria 4, porque CUATRO bitacoras lo citan:');
console.log('      ese es el modo de falla que este centinela evita, no una curiosidad.');
