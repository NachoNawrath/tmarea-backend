// MEDICION DE GATE — no escribe nada en data/. Solo mide.
// Responde tres preguntas de la PARADA 1:
//   (1) cuantos articulos tiene el decreto y donde estan los encabezados;
//   (2) donde cae la columna marginal de BCN en CADA extraccion, articulo por articulo;
//   (3) cuanto texto son los 38+2 y cuales se complican.
// AMBITO: los dos .txt versionados de data/decreto/fuente_ds364/, tal cual estan en disco.
const fs = require('fs');
const DIR = 'data/decreto/fuente_ds364';
const L = DIR + '/DTO-364_2012-03-17.txt';
const R = DIR + '/DTO-364_2012-03-17.raw.txt';

const ES_MOBILIARIO = (l) =>
  /^Decreto 364, DEFENSA \(1980\)$/.test(l.trim()) ||
  /^Biblioteca del Congreso Nacional de Chile/.test(l.trim());

// Encabezado de articulo. Cubre "ARTICULO 8° BIS" y "Articulo 2° bis:".
const ENC = /^(ARTICULO|Artículo)\s+(\d+)°(\s+(BIS|bis))?:?\s/;

function leer(f) { return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split('\n'); }

function encabezados(lineas) {
  const out = [];
  lineas.forEach((l, n) => {
    const m = ENC.exec(l.trim());
    if (m) out.push({ n: n + 1, num: Number(m[2]), bis: !!m[4], id: 'art_' + m[2] + (m[4] ? '_bis' : ''), linea: l });
  });
  return out;
}

function tajadas(lineas, encs) {
  const out = [];
  for (let i = 0; i < encs.length; i++) {
    const desde = encs[i].n - 1;
    const hasta = i + 1 < encs.length ? encs[i + 1].n - 1 : lineas.length;
    const crudas = lineas.slice(desde, hasta);
    const mob = crudas.filter(ES_MOBILIARIO).length;
    const texto = crudas.filter((l) => !ES_MOBILIARIO(l) && l.trim() !== '').join(' ').replace(/\s+/g, ' ').trim();
    out.push({ id: encs[i].id, n: encs[i].n, mob, texto });
  }
  return out;
}

const lineasL = leer(L), lineasR = leer(R);
const encL = encabezados(lineasL), encR = encabezados(lineasR);

console.log('AMBITO: ' + L + ' y ' + R + ', tal cual en disco.');
console.log('');
console.log('== G1 · encabezados de articulo ==');
console.log('  -layout ... ' + encL.length);
console.log('  -raw ...... ' + encR.length);
console.log('  ids -layout: ' + encL.map((e) => e.id).join(' '));
const mismos = encL.length === encR.length && encL.every((e, i) => e.id === encR[i].id);
console.log('  las dos extracciones declaran LA MISMA lista y EN EL MISMO ORDEN: ' + (mismos ? 'SI' : 'NO'));
// CONTROL NEGATIVO del regex de encabezado: un numero que el decreto no tiene.
const falso = lineasL.filter((l) => /^ARTICULO 99°\s/.test(l.trim())).length;
console.log('  CONTROL NEGATIVO — encabezados "ARTICULO 99°" encontrados: ' + falso + ' (esperado 0)');

const tL = tajadas(lineasL, encL), tR = tajadas(lineasR, encR);

console.log('');
console.log('== G2 · articulo por articulo: coinciden las DOS extracciones? ==');
console.log('   Si coinciden, ninguna columna marginal cayo en ese articulo en NINGUNA de las dos,');
console.log('   y el texto queda DOBLEMENTE ATESTIGUADO. Si discrepan, una de las dos trae de mas.');
console.log('');
console.log('  id           car(raw)  car(lay)  mob(raw) mob(lay)  coinciden');
let iguales = 0, difieren = [];
for (let i = 0; i < tR.length; i++) {
  const a = tR[i], b = tL[i];
  const ok = a.texto === b.texto;
  if (ok) iguales++; else difieren.push(a.id);
  console.log('  ' + a.id.padEnd(12) + String(a.texto.length).padStart(8) + String(b.texto.length).padStart(10) +
    String(a.mob).padStart(9) + String(b.mob).padStart(9) + '  ' + (ok ? 'si' : 'NO'));
}
console.log('');
console.log('  coinciden ..... ' + iguales + ' de ' + tR.length);
console.log('  discrepan ..... ' + difieren.length + ' de ' + tR.length + (difieren.length ? ' — ' + difieren.join(' ') : ''));

console.log('');
console.log('== G3 · el volumen ==');
const totR = tR.reduce((s, a) => s + a.texto.length, 0);
console.log('  caracteres de texto de articulo, extraccion -raw, los ' + tR.length + ': ' + totR);
const SIETE = ['art_13', 'art_16', 'art_17', 'art_26', 'art_27', 'art_33', 'art_36'];
const totSiete = tR.filter((a) => SIETE.includes(a.id)).reduce((s, a) => s + a.texto.length, 0);
console.log('  caracteres de los SIETE del encargo: ' + totSiete);
const YA = ['art_24', 'art_25', 'art_29', 'art_30'];
const totYa = tR.filter((a) => YA.includes(a.id)).reduce((s, a) => s + a.texto.length, 0);
console.log('  caracteres de los CUATRO ya extraidos: ' + totYa);
console.log('  los 31 restantes (ni los cuatro ni los siete): ' + (totR - totSiete - totYa) +
  ' caracteres en ' + (tR.length - 11) + ' articulos');
