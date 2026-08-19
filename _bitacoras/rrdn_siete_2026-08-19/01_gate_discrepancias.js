// MEDICION DE GATE (2) — no escribe nada en data/.
// Para cada articulo donde las dos extracciones DISCREPAN, muestra QUE trae de mas
// cada una. Diff a nivel de palabra (LCS), sobre el texto ya normalizado por espacios.
// AMBITO: los dos .txt versionados de data/decreto/fuente_ds364/, tal cual en disco.
const fs = require('fs');
const DIR = 'data/decreto/fuente_ds364';
const ES_MOBILIARIO = (l) =>
  /^Decreto 364, DEFENSA \(1980\)$/.test(l.trim()) ||
  /^Biblioteca del Congreso Nacional de Chile/.test(l.trim());
const ENC = /^(ARTICULO|Artículo)\s+(\d+)°(\s+(BIS|bis))?:?\s/;
const leer = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split('\n');
function tajadas(lineas) {
  const encs = [];
  lineas.forEach((l, n) => { const m = ENC.exec(l.trim()); if (m) encs.push({ n, id: 'art_' + m[2] + (m[4] ? '_bis' : '') }); });
  return encs.map((e, i) => ({
    id: e.id,
    texto: lineas.slice(e.n, i + 1 < encs.length ? encs[i + 1].n : lineas.length)
      .filter((l) => !ES_MOBILIARIO(l) && l.trim() !== '').join(' ').replace(/\s+/g, ' ').trim(),
  }));
}
// LCS sobre palabras.
function diff(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
    d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const soloA = [], soloB = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { i++; j++; }
    else if (d[i + 1][j] >= d[i][j + 1]) soloA.push(a[i++]);
    else soloB.push(b[j++]);
  }
  while (i < m) soloA.push(a[i++]);
  while (j < n) soloB.push(b[j++]);
  return { soloA, soloB, lcs: d[0][0] };
}
const tR = tajadas(leer(DIR + '/DTO-364_2012-03-17.raw.txt'));
const tL = tajadas(leer(DIR + '/DTO-364_2012-03-17.txt'));
console.log('AMBITO: los dos .txt de ' + DIR + '/, tal cual en disco.');
console.log('DIFF DE PALABRAS. "solo en -raw" = lo que -raw trae y -layout no, y al reves.');
console.log('');
const SIETE = ['art_13','art_16','art_17','art_26','art_27','art_33','art_36'];
for (let k = 0; k < tR.length; k++) {
  if (tR[k].texto === tL[k].texto) continue;
  const pr = tR[k].texto.split(' '), pl = tL[k].texto.split(' ');
  const { soloA, soloB } = diff(pr, pl);
  const marca = SIETE.includes(tR[k].id) ? '  <<< ES UNO DE LOS SIETE' : (['art_24','art_25','art_29','art_30'].includes(tR[k].id) ? '  <<< YA EXTRAIDO' : '');
  console.log('---- ' + tR[k].id + ' (raw ' + pr.length + ' palabras, layout ' + pl.length + ')' + marca);
  console.log('     solo en -raw    : ' + (soloA.length ? JSON.stringify(soloA.join(' ')) : '(nada)'));
  console.log('     solo en -layout : ' + (soloB.length ? JSON.stringify(soloB.join(' ')) : '(nada)'));
  // Subsecuencia: si el limpio es subsecuencia del sucio, la diferencia es SOLO material anadido.
  console.log('     -layout es subsecuencia de -raw: ' + (soloB.length === 0 ? 'SI' : 'no') +
              '   ·   -raw es subsecuencia de -layout: ' + (soloA.length === 0 ? 'SI' : 'no'));
  console.log('');
}
