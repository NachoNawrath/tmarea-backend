'use strict';
// CORRECCION DEL VOSEO. Las cuatro cadenas del bucket A pasan a usted. NADA MAS
// del mensaje cambia: ni la puntuacion, ni el orden, ni la cita, ni el canal.
//
// Se aplica por REEMPLAZO EXACTO y con conteo esperado: si una sustitucion no
// muerde, o muerde mas veces de las previstas, el script se detiene y no
// escribe nada. Un reemplazo que muerde de mas es peor que uno que no muerde.
//
// La palabra vieja y la nueva se comparan en NFC en las dos puntas — D1.
const fs = require('fs'), path = require('path');
const PWA = path.resolve(__dirname, '..', '..', '..', 'tmarea-pwa');

const CAMBIOS = [
  { f: 'src/components/verification/DriftCatalogoBlock.jsx',
    de: 'Consultá con la', a: 'Consulte con la', n: 2,
    donde: 'tarjeta de dato ilegible y rama no_evaluado' },
  { f: 'src/screens/P3_VoyageVerification.jsx',
    de: 'Contactá a <strong>{rotulo}</strong>', a: 'Contacte a <strong>{rotulo}</strong>', n: 1,
    donde: 'escalon 3, rama con rotulo' },
  { f: 'src/screens/P3_VoyageVerification.jsx',
    de: 'Contactá a la autoridad marítima', a: 'Contacte a la autoridad marítima', n: 1,
    donde: 'escalon 3, rama de fallback — no se pinta si hay rotulo' },
];

const cuenta = (t, s) => t.split(s).length - 1;
const L = [];
const say = (x) => { L.push(x === undefined ? '' : x); console.log(x === undefined ? '' : x); };

say('CORRECCION DEL VOSEO — voseo_al_patron_2026-08-20');
say('');
const porFichero = new Map();
for (const c of CAMBIOS) {
  if (!porFichero.has(c.f)) porFichero.set(c.f, fs.readFileSync(path.join(PWA, c.f), 'utf8').normalize('NFC'));
}
let mal = 0;
for (const c of CAMBIOS) {
  let t = porFichero.get(c.f);
  const de = c.de.normalize('NFC'), a = c.a.normalize('NFC');
  const hay = cuenta(t, de);
  const ok = hay === c.n;
  if (!ok) mal++;
  say('  ' + (ok ? 'OK  ' : '!!  ') + c.f);
  say('        ' + c.donde);
  say('        "' + c.de + '"  ->  "' + c.a + '"    esperadas ' + c.n + ' · encontradas ' + hay);
  if (ok) porFichero.set(c.f, t.split(de).join(a));
}
say('');
if (mal) { say('EXIT 1  — ROJO: alguna sustitucion no mordio como se esperaba. NO SE ESCRIBIO NADA.'); process.exit(1); }

for (const [f, t] of porFichero) fs.writeFileSync(path.join(PWA, f), t, 'utf8');
say('ficheros escritos : ' + porFichero.size);
say('');
say('CONTROL DESPUES DE ESCRIBIR: ninguna de las formas viejas puede quedar viva,');
say('y cada forma nueva tiene que aparecer las veces previstas.');
for (const [f] of porFichero) {
  const t = fs.readFileSync(path.join(PWA, f), 'utf8').normalize('NFC');
  for (const c of CAMBIOS.filter((x) => x.f === f)) {
    const viejas = cuenta(t, c.de.normalize('NFC')), nuevas = cuenta(t, c.a.normalize('NFC'));
    const bien = viejas === 0 && nuevas === c.n;
    if (!bien) mal++;
    say('  ' + (bien ? 'OK  ' : '!!  ') + f + '  viejas=' + viejas + ' nuevas=' + nuevas + ' (esperado 0 / ' + c.n + ')');
  }
}
say('');
say('EXIT ' + (mal ? 1 : 0) + (mal ? '  — ROJO' : '  — VERDE'));
fs.writeFileSync(path.join(__dirname, '12_correccion_voseo.txt'), L.join('\n') + '\n', 'utf8');
process.exit(mal ? 1 : 0);
