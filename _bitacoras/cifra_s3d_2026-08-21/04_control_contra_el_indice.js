'use strict';
// CONTROL CONTRA EL INDICE.  node _bitacoras/cifra_s3d_2026-08-21/04_control_contra_el_indice.js
//
// POR QUE EXISTE: `2d47022` commiteo un indice obsoleto — el mensaje decia 36
// filas y el objeto tenia 34. La verificacion de push NO lo cazo y NO PODIA:
// comparar main contra origin/main comprueba que lo subido es lo commiteado,
// nunca que lo commiteado es lo MEDIDO.
//
// Este control hace tres cosas:
//   (A) EMITE LA CIFRA DESDE EL INDICE, no desde el disco. `npm run cifra` lee
//       el disco con una ruta fija y no se le puede apuntar al indice, asi que
//       aca se copian sus guardas y su composicion de forma legal y se corren
//       sobre `git show :ruta`. La cifra del mensaje de commit sale DE ACA.
//   (B) Compara INDICE contra DISCO en cada ruta stageada. Si difieren, alguien
//       edito despues de stagear.
//   (C) Comprueba explicitamente que los TRES INTOCABLES no entraron al indice.
//
// OJO CON DOS DEFECTOS DE MAQUINA YA FICHADOS Y ESQUIVADOS ACA:
//   · `git status --porcelain` NO se trimea: la primera linea empieza con un
//     espacio cuando el fichero esta modificado y no stageado (« M ruta»), y un
//     .trim() se lo come y declara que el intocable dejo de estar modificado.
//   · git da por LIMPIA la version con CRLF y por MODIFICADA la identica al
//     blob. La identidad se prueba contra el BLOB (LF), nunca contra el disco
//     ni contra `git status`.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}
// SIN .trim() -- ver la nota de arriba.
function gitCrudo(args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

let ok = 0, total = 0;
const linea = (paso, rot, extra) => {
  total++; if (paso) ok++;
  console.log(`  ${paso ? 'ok   ' : 'FALLA'} ${rot}${extra ? '  ->  ' + extra : ''}`);
};

console.log('CONTROL CONTRA EL INDICE — 2026-08-21, pieza de la cifra de §2');
console.log('');

// ── (A) LA CIFRA, EMITIDA DESDE EL INDICE ───────────────────────────────────
console.log('(A) LA CIFRA SALE DEL INDICE, NO DEL DISCO');
const crudoIndice = git(['show', ':data/spec2/cifra_spec2.json']);
const d = JSON.parse(crudoIndice);
const f = d.denominador_fino;
const p = d.denominador_por_punto;
const pol = d.politica_de_publicacion;

// Composicion y guardas COPIADAS de scripts/publicar_cifra_spec2.js.
const forma = `${f.cumple} de ${f.vigente}, con ${f.anuladas} anuladas por decision del owner`;
const fallos = [];
if (f.cumple + f.no_cumple !== f.vigente) fallos.push('cumple + no_cumple != vigente');
if (f.vigente + f.anuladas !== f.original) fallos.push('vigente + anuladas != original');
if (d.anuladas.length !== f.anuladas) fallos.push('el bloque anuladas no concuerda');
if (f.cumple_cuales.length !== f.cumple) fallos.push('cumple_cuales no concuerda con cumple');
if (forma !== pol.forma_legal.replace('decisión', 'decision')) fallos.push('forma compuesta != forma_legal');
if (p.cumple + p.no_cumple + p.divididos !== p.total) fallos.push('por punto: la suma no cierra');
if (p.divididos !== p.total - p.unanimes) fallos.push('por punto: divididos != total - unanimes');
if (!p.nota_obligatoria || !/CUMPLE por DEROGACION/i.test(p.nota_obligatoria)) fallos.push('falta la nota de derogacion');
if (!p.nota_obligatoria_s3_dividido || !/DIVIDIDO por TRABAJO/i.test(p.nota_obligatoria_s3_dividido)) fallos.push('falta la nota de S3 dividido');
if (!Array.isArray(p.divididos_cuales) || p.divididos_cuales.length !== p.divididos) fallos.push('divididos_cuales no concuerda con divididos');
if (!Array.isArray(p.serie) || p.serie.length === 0) fallos.push('la vista por punto no trae serie');
else {
  const u = p.serie[p.serie.length - 1];
  if (['unanimes', 'divididos', 'cumple', 'no_cumple'].some(c => u[c] !== p.antes[c])) fallos.push('`antes` no coincide con la ultima foto de la serie');
  if (p.serie.some(s => !s.de_cuando || !s.que_la_movio)) fallos.push('hay fotos de la serie sin de_cuando o sin que_la_movio');
}

linea(fallos.length === 0, 'el dato DEL INDICE pasa las once guardas del emisor', fallos.join(' · ') || 'sin fallos');
console.log('');
console.log('      LA CIFRA PARA EL MENSAJE DE COMMIT, medida contra el indice:');
console.log('        >>  ' + forma + '  <<');
console.log(`        unidad: ${f.unidad}  ·  definicion: ${f.definicion}`);
console.log(`        ambito: ${f.ambito}`);
console.log(`        CUMPLE ${f.cumple} de ${f.vigente} (${f.cumple_cuales.join(', ')}) · NO CUMPLE ${f.no_cumple} · ANULADAS ${f.anuladas} (original ${f.original})`);
console.log(`        por punto: unanimes ${p.unanimes} de ${p.total} · divididos ${p.divididos} (${(p.divididos_cuales || []).join(', ')}) · cumple ${p.cumple} · no cumple ${p.no_cumple}`);
console.log(`        la serie tiene ${Array.isArray(p.serie) ? p.serie.length : 0} fotos, cada una con de_cuando y que_la_movio`);
console.log('');
linea(pol.forma_prohibida === '5 de 15', 'la forma PROHIBIDA del indice quedo al dia', `"${pol.forma_prohibida}"`);
linea(Array.isArray(p.serie) && p.serie.length === 2 && p.serie.every(s => s.de_cuando && s.que_la_movio),
  'las dos fotos de la serie traen de_cuando y que_la_movio');
linea(p.antes.unanimes === p.serie[p.serie.length - 1].unanimes &&
      p.antes.divididos === p.serie[p.serie.length - 1].divididos &&
      p.antes.cumple === p.serie[p.serie.length - 1].cumple &&
      p.antes.no_cumple === p.serie[p.serie.length - 1].no_cumple,
  '`antes` coincide con la ULTIMA foto de la serie');

// ── El declarativo, tambien desde el indice ─────────────────────────────────
const dec = JSON.parse(git(['show', ':data/deudas/deudas_declaradas.json']));
console.log('');
console.log('    EL DECLARATIVO, contado sobre el OBJETO DEL INDICE:');
const unicas = dec.deudas.filter(x => !x.duplicada_de);
const vivas = unicas.filter(x => x.estado === 'viva');
console.log(`      filas ${dec.deudas.length} · unicas ${unicas.length} · vivas ${vivas.length} · sitios ${dec.cobertura.sitios.length} · barridos ${dec.cobertura.sitios.filter(s => s.barrido).length}`);
linea(dec.deudas.length === 91 && unicas.length === 89 && vivas.length === 83,
  'el declarativo NO se movio: 91 · 89 · 83 (ninguna fila nueva)');

// ── (B) INDICE CONTRA DISCO ─────────────────────────────────────────────────
console.log('');
console.log('(B) INDICE CONTRA DISCO — nadie edito despues de stagear');
// SU PROPIA SALIDA QUEDA FUERA, Y NO ES UNA EXCEPCION DE CONVENIENCIA: este
// control se corre redirigiendo su stdout a ese .txt, asi que en el instante en
// que compara, el fichero en disco todavia es el de la corrida ANTERIOR y el
// que va a quedar aun no existe. Un control no puede verificar el artefacto que
// esta produciendo. Se declara en la salida para que nadie lea «12 de 12» y
// crea que esa ruta esta cubierta: NO LO ESTA, y lo que la cubre es que su
// contenido es esta misma salida, que se lee entera.
const MI_PROPIA_SALIDA = '_bitacoras/cifra_s3d_2026-08-21/04_control_contra_el_indice.txt';
const todas = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
const stageadas = todas.filter(r => r !== MI_PROPIA_SALIDA);
if (todas.length !== stageadas.length) {
  console.log(`     (fuera de esta comprobacion, a proposito: ${MI_PROPIA_SALIDA} — es la salida de este mismo control)`);
}
let iguales = 0;
for (const ruta of stageadas) {
  const enIndice = git(['show', ':' + ruta]);
  // El disco puede traer CRLF; el blob siempre LF. Se compara normalizando SOLO
  // el final de linea, que es la unica diferencia legitima en esta maquina.
  const enDisco = fs.readFileSync(path.join(REPO, ruta), 'utf8').replace(/\r\n/g, '\n');
  if (enIndice === enDisco) iguales++;
  else console.log(`     !! DIFIERE: ${ruta}`);
}
linea(iguales === stageadas.length, `las ${stageadas.length} rutas stageadas son identicas en indice y disco`, `${iguales}/${stageadas.length}`);

// ── (C) LOS TRES INTOCABLES ─────────────────────────────────────────────────
console.log('');
console.log('(C) LOS TRES INTOCABLES NO ENTRARON AL INDICE');
const INTOCABLES = [
  '.claude/launch.json',
  '_bitacoras/toponimos_12100_47_2026-08-20/osm_crudo.json',
  'data/catalogo/estado_drift.json',
];
const porcelain = gitCrudo(['status', '--porcelain']).split('\n');
for (const t of INTOCABLES) {
  const fila = porcelain.find(l => l.slice(3) === t);
  const sigueFueraDelIndice = fila != null && fila.startsWith(' M');
  linea(sigueFueraDelIndice, `${t} sigue « M » (modificado y NO stageado)`, fila == null ? 'NO APARECE' : `"${fila.slice(0, 2)}"`);
}
linea(!stageadas.some(r => INTOCABLES.includes(r)), 'ninguno de los tres aparece entre las rutas stageadas');

// ── CONTROL POSITIVO DEL METODO ─────────────────────────────────────────────
console.log('');
console.log('CONTROL POSITIVO DEL METODO — una ruta inexistente tiene que fallar');
let reviento = false;
try { git(['show', ':ruta/que/no/existe.json'], { stdio: 'pipe' }); }
catch { reviento = true; }
linea(reviento, 'git show sobre una ruta que no esta en el indice falla');

console.log('');
console.log(`CONTROL CONTRA EL INDICE: ${ok}/${total}`);
process.exit(ok === total ? 0 : 1);
