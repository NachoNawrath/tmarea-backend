'use strict';
// SONDA DE USTED. La pregunta (5) del owner era si conviven tres registros. Al
// leer el inventario aparecio "Mantenga escucha activa" — o sea que usted YA
// esta en el arbol, y la pregunta pasa a ser cuantos registros conviven.
// Formas inequivocas solamente: un subjuntivo suelto no prueba trato de usted.
const fs = require('fs'), path = require('path');
const D = __dirname;
const BACK = path.resolve(D, '..', '..'), PWA = path.resolve(BACK, '..', 'tmarea-pwa');
const hits = JSON.parse(fs.readFileSync(path.join(D, '02_clasificacion.json'), 'utf8'));
const claves = [...new Set(hits.filter((h) => h.rol === 'P').map((h) => h.clave))].sort();
const abs = (c) => (c.indexOf('pwa/') === 0 ? path.join(PWA, c.slice(4)) : path.join(BACK, c.slice(8)));

const FORMAS = ['contacte', 'verifique', 'revise', 'consulte', 'coordine', 'avise',
  'confirme', 'solicite', 'mantenga', 'evite', 'recuerde', 'navegue',
  'ingrese', 'seleccione', 'compruebe', 'actualice', 'cargue', 'busque',
  'usted', 'su embarcación', 'su nave'];
const BS = String.fromCharCode(92);
const re = (f) => new RegExp('(?<![' + BS + 'p{L}' + BS + 'p{N}])' + f + '(?![' + BS + 'p{L}' + BS + 'p{N}])', 'giu');
const RE = FORMAS.map((f) => ({ f, r: re(f) }));

const L = [];
const say = (s) => L.push(s === undefined ? '' : s);
say('SONDA DE USTED en ROL P — voseo_al_patron_2026-08-20');
say('');
say('ambito: los ' + claves.length + ' ficheros de ROL P con hit en el paso 02.');
say("formas: imperativo de usted inequivoco + el pronombre. QUITADA la forma");
say("        informe: es sustantivo 19 de 19 veces en este arbol, no imperativo.");
say('');
let n = 0;
for (const c of claves) {
  let t; try { t = fs.readFileSync(abs(c), 'utf8').normalize('NFC'); } catch { continue; }
  const lineas = t.split(/\r?\n/);
  for (let i = 0; i < lineas.length; i++) {
    for (const { f, r } of RE) {
      r.lastIndex = 0;
      if (!r.test(lineas[i])) continue;
      n++;
      say('  [' + f + ']  ' + c + '  L' + (i + 1));
      say('        ' + lineas[i].trim().slice(0, 170));
    }
  }
}
say('');
say('apariciones de usted en ROL P : ' + n);
fs.writeFileSync(path.join(D, '04_usted.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
