// CONTROL de la extraccion: cada inciso guardado en data/decreto/rrdn_articulos.json
// se re-busca en una RE-EXTRACCION FRESCA del PDF versionado y tiene que encontrarse.
// Si no se encuentra, la extraccion altero el texto.
//
// POR QUE LA BUSQUEDA ES NORMALIZADA POR ESPACIOS Y NO LITERAL: el PDF es binario con
// streams comprimidos y no se puede buscar dentro. Y texto_decreto guarda los incisos con
// los cortes de linea duros del PDF deshechos, igual que el art_2 del D.S. 991. Una
// busqueda de subcadena cruda fallaria siempre, sin decir nada sobre la fidelidad. Se
// normaliza a un espacio simple en los DOS lados y se exige subcadena exacta.
//
// Salida: exit 0 si todo pasa, exit 1 si algo falla.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const DIR = 'data/decreto/fuente_ds364';
const PDF = DIR + '/DTO-364_2012-03-17.pdf';
const INSUMO = 'data/decreto/rrdn_articulos.json';

const norm = (s) => s.replace(/\s+/g, ' ').trim();
// sha256 con crypto y no con sha256sum: coreutils antepone "\" a la linea cuando la
// ruta contiene backslashes, y eso rompia el cotejo contra un temporal de Windows.
const sha = (f) => require('crypto').createHash('sha256').update(require('fs').readFileSync(f)).digest('hex');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ds364-control-'));
const freshLayout = path.join(tmp, 'fresh_layout.txt');
const freshRaw = path.join(tmp, 'fresh_raw.txt');
cp.execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', PDF, freshLayout]);
cp.execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', PDF, freshRaw]);

const insumo = JSON.parse(fs.readFileSync(INSUMO, 'utf8'));
const NL = norm(fs.readFileSync(freshLayout, 'utf8'));
const NR = norm(fs.readFileSync(freshRaw, 'utf8'));

let fallos = 0;
const ok = (cond, etiqueta, detalle) => {
  if (!cond) fallos++;
  console.log((cond ? '  PASA  ' : '  FALLA ') + etiqueta + (detalle ? ' — ' + detalle : ''));
};

console.log('AMBITO: ' + INSUMO + ' contra una re-extraccion fresca de ' + PDF);
// pdftotext -v sale con status 99, asi que spawnSync y no execFileSync.
const ver = cp.spawnSync('pdftotext', ['-v'], { encoding: 'utf8' });
console.log('herramienta: ' + ((ver.stdout || '') + (ver.stderr || '')).split(/\r?\n/)[0].trim());
console.log('');
console.log('== C0 · la re-extraccion fresca reproduce byte a byte los .txt versionados ==');
ok(sha(freshLayout) === sha(DIR + '/DTO-364_2012-03-17.txt'), 'sha256 de -layout coincide', sha(freshLayout));
ok(sha(freshRaw) === sha(DIR + '/DTO-364_2012-03-17.raw.txt'), 'sha256 de -raw coincide', sha(freshRaw));
ok(sha(PDF) === insumo.norma.pdf_sha256, 'sha256 del PDF coincide con el declarado en el insumo', sha(PDF));

console.log('');
console.log('== C1 · cada inciso guardado se re-encuentra en la re-extraccion (-raw) ==');
for (const a of insumo.articulos) {
  a.texto_decreto.forEach((p, i) => {
    ok(NR.includes(norm(p)), a.id + ' inciso[' + i + '] se encuentra en -raw', norm(p).length + ' caracteres');
  });
}

console.log('');
console.log('== C2 · CONTROL NEGATIVO: el mismo inciso con UN caracter cambiado NO se encuentra ==');
console.log('   (sin esto, C1 pasaria aunque el instrumento no supiera fallar)');
for (const a of insumo.articulos) {
  a.texto_decreto.forEach((p, i) => {
    const n = norm(p);
    const k = Math.floor(n.length / 2);
    const roto = n.slice(0, k) + (n[k] === 'a' ? 'e' : 'a') + n.slice(k + 1);
    ok(!NR.includes(roto), a.id + ' inciso[' + i + '] roto NO se encuentra en -raw');
  });
}

console.log('');
console.log('== C3 · por que el Art. 30 va en DOS incisos y no en uno ==');
const a30 = insumo.articulos.find((a) => a.id === 'art_30');
const unido = norm(a30.texto_decreto.join(' '));
ok(!NR.includes(unido), 'los dos incisos UNIDOS no se encuentran en -raw', 'entre ellos cae un salto de pagina');
ok(!NL.includes(unido), 'los dos incisos UNIDOS no se encuentran en -layout');

console.log('');
console.log('== C4 · por que el extractor lee -raw y no -layout ==');
console.log('   (informativo: -layout mezcla la columna de anotaciones marginales de BCN)');
for (const a of insumo.articulos) {
  a.texto_decreto.forEach((p, i) => {
    const hallado = NL.includes(norm(p));
    console.log('  ' + (hallado ? 'se encuentra    ' : 'NO se encuentra ') + a.id + ' inciso[' + i + '] en -layout');
  });
}
const p2 = norm(a30.texto_decreto[1]);
ok(!NL.includes(p2), 'art_30 inciso[1] NO se encuentra en -layout — es el motivo declarado de usar -raw');

console.log('');
console.log('== C5 · caracteres de control fuera de LF/CR en el insumo escrito ==');
const bytes = fs.readFileSync(INSUMO);
const malos = [...bytes].filter((b) => b < 0x20 && b !== 0x0a && b !== 0x0d).length;
ok(malos === 0, 'el JSON no tiene caracteres de control fuera de LF/CR', malos + ' encontrados');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('');
console.log(fallos === 0 ? 'RESULTADO: todo pasa. 0 fallos.' : 'RESULTADO: ' + fallos + ' FALLOS.');
process.exit(fallos === 0 ? 0 : 1);
