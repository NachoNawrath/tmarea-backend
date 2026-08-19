// MEDICION DE GATE (3) — no escribe nada en data/. Simula el diseno propuesto sobre
// LOS 40 articulos y dice, articulo por articulo, que pasaria. Es la evidencia de la
// recomendacion "siete vs 38" y de la solucion del Art. 33.
//
// DISENO SIMULADO:
//  · el articulo se corta de encabezado a encabezado en LAS DOS extracciones;
//  · dentro, se PARTE EN FRAGMENTOS alli donde cae el mobiliario de pagina de BCN
//    (pie y cabecera corrida). El punto de corte lo pone EL DOCUMENTO, no la mano;
//  · si las dos extracciones dan el MISMO texto, el articulo queda doblemente atestiguado;
//  · si una es SUBSECUENCIA de palabras de la otra, se toma LA CORTA y se declara el
//    tramo sobrante como columna marginal AISLADA — sin atribuirla a ningun articulo;
//  · si no se da ninguna de las dos, el articulo NO SE RESUELVE y hay que decirlo.
const fs = require('fs');
const DIR = 'data/decreto/fuente_ds364';
const ES_MOBILIARIO = (l) =>
  /^Decreto 364, DEFENSA \(1980\)$/.test(l.trim()) ||
  /^Biblioteca del Congreso Nacional de Chile/.test(l.trim());
const ENC = /^(ARTICULO|Artículo)\s+(\d+)°(\s+(BIS|bis))?:?\s/;
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const leer = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
function fragmentar(lineas) {
  const encs = [];
  lineas.forEach((l, n) => { const m = ENC.exec(l.trim()); if (m) encs.push({ n, id: 'art_' + m[2] + (m[4] ? '_bis' : '') }); });
  return encs.map((e, i) => {
    const bloque = lineas.slice(e.n, i + 1 < encs.length ? encs[i + 1].n : lineas.length);
    const frags = [[]];
    let corto = false;
    for (const l of bloque) {
      if (ES_MOBILIARIO(l)) { corto = true; continue; }
      if (l.trim() === '') continue;
      if (corto) { frags.push([]); corto = false; }
      frags[frags.length - 1].push(l);
    }
    return { id: e.id, frags: frags.filter((f) => f.length).map((f) => norm(f.join(' '))) };
  });
}
function subsecuencia(chico, grande) { // chico y grande son arrays de palabras
  let i = 0;
  for (const w of grande) if (i < chico.length && chico[i] === w) i++;
  return i === chico.length;
}
function sobrante(chico, grande) {
  const out = []; let i = 0;
  for (const w of grande) { if (i < chico.length && chico[i] === w) i++; else out.push(w); }
  return out.join(' ');
}
const NR = norm(leer(DIR + '/DTO-364_2012-03-17.raw.txt'));
const NL = norm(leer(DIR + '/DTO-364_2012-03-17.txt'));
const tR = fragmentar(leer(DIR + '/DTO-364_2012-03-17.raw.txt').split('\n'));
const tL = fragmentar(leer(DIR + '/DTO-364_2012-03-17.txt').split('\n'));
const SIETE = ['art_13','art_16','art_17','art_26','art_27','art_33','art_36'];
const YA = ['art_24','art_25','art_29','art_30'];
console.log('AMBITO: los 40 articulos de los dos .txt de ' + DIR + '/, tal cual en disco.');
console.log('');
console.log('  id           frag  fuente   estado                      re-encuentro  marca');
let noResueltos = [], porFuente = { raw: 0, layout: 0, cualquiera: 0 }, conCorte = 0;
const resumen = [];
for (let k = 0; k < tR.length; k++) {
  const id = tR[k].id, fr = tR[k].frags, fl = tL[k].frags;
  const jr = fr.join(' '), jl = fl.join(' ');
  let fuente, estado, aislado = '', frags;
  if (jr === jl) { fuente = 'cualquiera'; estado = 'identico en las dos'; frags = fr; }
  else if (subsecuencia(jl.split(' '), jr.split(' '))) { fuente = 'layout'; estado = 'columna marginal aislada'; aislado = sobrante(jl.split(' '), jr.split(' ')); frags = fl; }
  else if (subsecuencia(jr.split(' '), jl.split(' '))) { fuente = 'raw'; estado = 'columna marginal aislada'; aislado = sobrante(jr.split(' '), jl.split(' ')); frags = fr; }
  else { fuente = '—'; estado = 'NO RESUELTO'; frags = fr; noResueltos.push(id); }
  const N = fuente === 'layout' ? NL : NR;
  const todos = frags.every((f) => N.includes(f));
  const unidoNo = frags.length === 1 ? true : !N.includes(frags.join(' '));
  if (fuente !== '—') porFuente[fuente]++;
  if (frags.length > 1) conCorte++;
  const marca = SIETE.includes(id) ? 'SIETE' : YA.includes(id) ? 'ya' : '';
  console.log('  ' + id.padEnd(12) + String(frags.length).padStart(4) + '  ' + fuente.padEnd(10) +
    estado.padEnd(28) + (todos && unidoNo ? 'ok' : 'REVISAR').padEnd(14) + marca);
  resumen.push({ id, frags, fuente, estado, aislado, todos, unidoNo });
}
console.log('');
console.log('  articulos: ' + tR.length + '  ·  identicos en las dos: ' + porFuente.cualquiera +
  '  ·  resueltos tomando -layout: ' + porFuente.layout + '  ·  tomando -raw: ' + porFuente.raw +
  '  ·  NO RESUELTOS: ' + noResueltos.length + (noResueltos.length ? ' (' + noResueltos.join(' ') + ')' : ''));
console.log('  articulos partidos en mas de un fragmento por salto de pagina: ' + conCorte);
console.log('');
console.log('== tramos marginales AISLADOS (no se atribuyen a ningun articulo) ==');
for (const r of resumen) if (r.aislado) console.log('  ' + r.id.padEnd(12) + 'sale de -' + (r.fuente === 'layout' ? 'raw' : 'layout') + ': ' + JSON.stringify(r.aislado));
console.log('');
console.log('== NO REGRESION: los cuatro ya extraidos ==');
const viejo = JSON.parse(fs.readFileSync('data/decreto/rrdn_articulos.json', 'utf8'));
for (const a of viejo.articulos) {
  const r = resumen.find((x) => x.id === a.id);
  const igual = JSON.stringify(r.frags) === JSON.stringify(a.texto_decreto);
  console.log('  ' + a.id.padEnd(12) + (igual ? 'IDENTICO al texto ya publicado' : 'DIFIERE del texto ya publicado') +
    '  (fragmentos ' + r.frags.length + ' vs ' + a.texto_decreto.length + ')');
}
console.log('');
console.log('== los SIETE del encargo, en detalle ==');
for (const id of SIETE) {
  const r = resumen.find((x) => x.id === id);
  console.log('  ' + id.padEnd(10) + 'fragmentos ' + r.frags.length + ' · fuente ' + r.fuente + ' · ' + r.estado +
    ' · ' + r.frags.reduce((s, f) => s + f.length, 0) + ' caracteres');
}
