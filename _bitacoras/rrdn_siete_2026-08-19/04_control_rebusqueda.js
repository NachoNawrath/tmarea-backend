// CONTROL de data/decreto/rrdn_articulos.json. Corre sobre LOS ONCE articulos, no solo
// sobre los siete nuevos. Cada fragmento guardado se re-busca en una RE-EXTRACCION
// FRESCA del PDF versionado, EN LA EXTRACCION QUE EL PROPIO INSUMO DECLARA, y tiene que
// encontrarse. Si no se encuentra, la extraccion altero el texto.
//
// LA BUSQUEDA ES NORMALIZADA POR ESPACIOS Y NO LITERAL: el PDF es binario con streams
// comprimidos y no se puede buscar dentro; y texto_decreto guarda los fragmentos con los
// cortes de linea duros deshechos. Se normaliza a un espacio simple en los DOS lados y se
// exige subcadena exacta.
//
// ================================ LO QUE ESTE CONTROL NO CUBRE ================================
// ESTE CONTROL NO DETECTA UN TRUNCADO. Un fragmento correcto pero INCOMPLETO se
// re-encuentra igual de bien que el completo, porque un prefijo de una subcadena sigue
// siendo una subcadena. Si la extraccion se comio el ultimo inciso de un articulo, aca
// pasa todo en verde. LO QUE CUBRE EL TRUNCADO ES LA LECTURA DEL OWNER, y por eso
// 05_lectura_parada2.js publica con que termina cada articulo y a que remite.
// =============================================================================================
//
// Salida: exit 0 si todo pasa, exit 1 si algo falla.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const DIR = 'data/decreto/fuente_ds364';
const PDF = DIR + '/DTO-364_2012-03-17.pdf';
const TXT_LAYOUT = DIR + '/DTO-364_2012-03-17.txt';
const TXT_RAW = DIR + '/DTO-364_2012-03-17.raw.txt';
const INSUMO = 'data/decreto/rrdn_articulos.json';
const FIRMADO = '8397396';  // el commit donde el owner firmo los cuatro de la v1

const norm = (s) => s.replace(/\s+/g, ' ').trim();
// sha256 con crypto y no con sha256sum: coreutils antepone "\" a la linea cuando la ruta
// contiene backslashes.
const sha = (f) => require('crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rrdn-control-'));
const freshLayout = path.join(tmp, 'fresh_layout.txt');
const freshRaw = path.join(tmp, 'fresh_raw.txt');
cp.execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', PDF, freshLayout]);
cp.execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', PDF, freshRaw]);

const insumo = JSON.parse(fs.readFileSync(INSUMO, 'utf8'));
const NL = norm(fs.readFileSync(freshLayout, 'utf8'));
const NR = norm(fs.readFileSync(freshRaw, 'utf8'));
const EN = (ruta) => (ruta === TXT_LAYOUT ? NL : NR);
const OTRA = (ruta) => (ruta === TXT_LAYOUT ? NR : NL);
const NOMBRE = (ruta) => (ruta === TXT_LAYOUT ? '-layout' : '-raw');

let fallos = 0;
const ok = (cond, etiqueta, detalle) => {
  if (!cond) fallos++;
  console.log((cond ? '  PASA  ' : '  FALLA ') + etiqueta + (detalle ? ' — ' + detalle : ''));
};

console.log('AMBITO: ' + INSUMO + ' (' + insumo.articulos.length + ' articulos) contra una re-extraccion fresca de ' + PDF);
const ver = cp.spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }); // -v sale con status 99
console.log('herramienta: ' + ((ver.stdout || '') + (ver.stderr || '')).split(/\r?\n/)[0].trim());
console.log('');
console.log('*** ESTE CONTROL NO DETECTA UN TRUNCADO: un fragmento correcto pero incompleto se');
console.log('*** re-encuentra igual. Lo que cubre el truncado es la lectura del owner (PARADA 2).');

console.log('');
console.log('== C0 · la re-extraccion fresca reproduce byte a byte los .txt versionados ==');
ok(sha(freshLayout) === sha(TXT_LAYOUT), 'sha256 de -layout coincide', sha(freshLayout));
ok(sha(freshRaw) === sha(TXT_RAW), 'sha256 de -raw coincide', sha(freshRaw));
ok(sha(PDF) === insumo.norma.pdf_sha256, 'sha256 del PDF coincide con el declarado en el insumo', sha(PDF));

console.log('');
console.log('== C1 · cada fragmento se re-encuentra en LA EXTRACCION QUE EL INSUMO DECLARA ==');
for (const a of insumo.articulos) {
  a.texto_decreto.forEach((p, i) => {
    ok(EN(a.procedencia.extraido_de).includes(norm(p)),
      a.id + ' frag[' + i + '] se encuentra en ' + NOMBRE(a.procedencia.extraido_de),
      norm(p).length + ' caracteres');
  });
}

console.log('');
console.log('== C2 · CONTROL NEGATIVO: el mismo fragmento con UN caracter cambiado NO se encuentra ==');
console.log('   (sin esto, C1 pasaria aunque el instrumento no supiera fallar)');
for (const a of insumo.articulos) {
  a.texto_decreto.forEach((p, i) => {
    const n = norm(p);
    const k = Math.floor(n.length / 2);
    const roto = n.slice(0, k) + (n[k] === 'a' ? 'e' : 'a') + n.slice(k + 1);
    ok(!EN(a.procedencia.extraido_de).includes(roto), a.id + ' frag[' + i + '] roto NO se encuentra');
  });
}

console.log('');
console.log('== C3 · los fragmentos de un mismo articulo UNIDOS no se encuentran ==');
console.log('   (es el motivo declarado de que texto_decreto sea un array; que nadie los junte)');
let partidos = 0;
for (const a of insumo.articulos) {
  if (a.texto_decreto.length < 2) continue;
  partidos++;
  const unido = norm(a.texto_decreto.join(' '));
  ok(!NR.includes(unido), a.id + ' unido NO se encuentra en -raw', 'entre medio cae un salto de pagina');
  ok(!NL.includes(unido), a.id + ' unido NO se encuentra en -layout');
}
ok(partidos === 2, 'articulos partidos por salto de pagina entre los once', partidos + ' (art_17 y art_30)');

console.log('');
console.log('== C4 · la columna marginal aislada: por que la fuente es la que es ==');
console.log('   El tramo aislado NO es una cita contigua: en el PDF es una columna al margen y la');
console.log('   otra extraccion la intercala linea por linea. Asi que no se busca como subcadena.');
console.log('   Lo que se exige es EXACTO: re-insertar las palabras excluidas en el texto publicado');
console.log('   reproduce PALABRA POR PALABRA lo que la otra extraccion emite para ese articulo.');
// Re-deriva el articulo desde la RE-EXTRACCION FRESCA, con la misma regla de corte del extractor.
const ES_MOBILIARIO = (l) =>
  /^Decreto 364, DEFENSA \(1980\)$/.test(l.trim()) ||
  /^Biblioteca del Congreso Nacional de Chile/.test(l.trim());
const ENC = /^(ARTICULO|Artículo)\s+(\d+)°(\s+(BIS|bis))?:?\s/;
function tajadaFresca(archivo, id) {
  const lineas = fs.readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const encs = [];
  lineas.forEach((l, n) => { const m = ENC.exec(l.trim()); if (m) encs.push({ n, id: 'art_' + m[2] + (m[4] ? '_bis' : '') }); });
  const k = encs.findIndex((e) => e.id === id);
  if (k < 0) return null;
  return norm(lineas.slice(encs[k].n, k + 1 < encs.length ? encs[k + 1].n : lineas.length)
    .filter((l) => !ES_MOBILIARIO(l) && l.trim() !== '').join(' '));
}
const reinsertar = (publicado, tramo, objetivo) => {
  // Recorre el objetivo consumiendo primero lo publicado y, lo que no calce, contra el tramo.
  const P = publicado.split(' '), T = tramo.split(' '), O = objetivo.split(' ');
  let p = 0, t = 0;
  for (const w of O) {
    if (p < P.length && P[p] === w) { p++; continue; }
    if (t < T.length && T[t] === w) { t++; continue; }
    return false;
  }
  return p === P.length && t === T.length;
};
let aislados = 0;
for (const a of insumo.articulos) {
  const ca = a.procedencia.columna_marginal_aislada;
  if (!ca) continue;
  aislados++;
  const otra = NOMBRE(ca.sale_de);
  const frescaOtra = ca.sale_de === TXT_LAYOUT ? freshLayout : freshRaw;
  const objetivo = tajadaFresca(frescaOtra, a.id);
  const publicado = norm(a.texto_decreto.join(' '));
  // (i) NO todos los fragmentos publicados estan en la otra extraccion: alli va la columna
  // adentro. Se mide FRAGMENTO A FRAGMENTO y no sobre el texto unido, porque el unido de un
  // articulo partido por salto de pagina no se encuentra en NINGUNA de las dos (eso es C3) y
  // daria por bueno este control por un motivo que no tiene nada que ver con la columna.
  const enOtra = a.texto_decreto.filter((p) => OTRA(a.procedencia.extraido_de).includes(norm(p))).length;
  ok(enOtra < a.texto_decreto.length,
    a.id + ' NO todos sus fragmentos estan en ' + otra + ' — alli va la columna adentro',
    enOtra + ' de ' + a.texto_decreto.length + ' fragmentos se encuentran alla');
  // (ii) CONTROL POSITIVO: publicado + tramo reproduce exacto lo que la otra extraccion emite.
  ok(objetivo !== null && reinsertar(publicado, norm(ca.tramo), objetivo),
    a.id + ' CONTROL POSITIVO: publicado + tramo reproduce palabra por palabra ' + otra,
    ca.palabras + ' palabras excluidas');
  // (iii) y TODOS sus fragmentos si estan en la extraccion que el insumo declara.
  ok(a.texto_decreto.every((p) => EN(a.procedencia.extraido_de).includes(norm(p))),
    a.id + ' TODOS sus fragmentos si estan en ' + NOMBRE(a.procedencia.extraido_de),
    a.texto_decreto.length + ' de ' + a.texto_decreto.length);
}
ok(aislados === 3, 'articulos con columna marginal aislada entre los once', aislados + ' (art_13, art_30, art_33)');

console.log('');
console.log('== C5 · caracteres de control fuera de LF/CR en el insumo escrito ==');
const malos = [...fs.readFileSync(INSUMO)].filter((b) => b < 0x20 && b !== 0x0a && b !== 0x0d).length;
ok(malos === 0, 'el JSON no tiene caracteres de control fuera de LF/CR', malos + ' encontrados');

console.log('');
console.log('== C6 · NO REGRESION: los cuatro que el owner firmo en ' + FIRMADO + ' ==');
console.log('   (es lo unico que garantiza que esta sesion no reescribio texto ya firmado)');
const viejo = JSON.parse(cp.execFileSync('git', ['show', FIRMADO + ':' + INSUMO], { encoding: 'utf8' }));
for (const av of viejo.articulos) {
  const an = insumo.articulos.find((x) => x.id === av.id);
  ok(!!an && JSON.stringify(an.texto_decreto) === JSON.stringify(av.texto_decreto),
    av.id + ' texto_decreto IDENTICO al de ' + FIRMADO,
    'fragmentos ' + (an ? an.texto_decreto.length : '?') + ' vs ' + av.texto_decreto.length);
}
ok(viejo.articulos.length === 4, 'la v1 firmada tenia cuatro articulos', viejo.articulos.length + '');

console.log('');
console.log('== C7 · la cita que CONTRATO_MOTOR.md rotula "Texto legal literal" es literal ==');
const contrato = fs.readFileSync('CONTRATO_MOTOR.md', 'utf8').split(/\r?\n/);
const iCita = contrato.findIndex((l) => l.includes('RRDN Art. 36, inciso 2'));
const bloque = [];
for (let n = iCita + 1; n < contrato.length; n++) {
  if (/^\s*>/.test(contrato[n])) bloque.push(contrato[n].replace(/^\s*>\s?/, ''));
  else if (bloque.length) break;
}
const cita = norm(bloque.join(' ')).replace(/^"|"$/g, '');
const a36 = insumo.articulos.find((a) => a.id === 'art_36');
ok(iCita >= 0, 'la cita esta donde se dijo — CONTRATO_MOTOR.md, INV-2.1, Capa 2', 'linea ' + (iCita + 1));
ok(norm(a36.texto_decreto.join(' ')).includes(cita),
  'la cita del contrato es subcadena exacta del Art. 36 extraido', cita.length + ' caracteres');
// CONTROL NEGATIVO de C7: la misma cita con una palabra cambiada NO es subcadena.
ok(!norm(a36.texto_decreto.join(' ')).includes(cita.replace('mal tiempo', 'buen tiempo')),
  'CONTROL NEGATIVO: la cita con "mal tiempo"->"buen tiempo" NO es subcadena');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('');
console.log(fallos === 0 ? 'RESULTADO: todo pasa. 0 fallos.' : 'RESULTADO: ' + fallos + ' FALLOS.');
process.exit(fallos === 0 ? 0 : 1);
