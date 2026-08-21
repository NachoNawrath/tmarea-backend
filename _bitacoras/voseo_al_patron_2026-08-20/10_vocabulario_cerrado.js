'use strict';
// VOCABULARIO CERRADO. Deja de ser una lista de memoria: es la union de
//
//   (i)  el vocabulario del paso 01, escrito de memoria y por eso corto;
//   (ii) las formas MARCADAS al leer enteros los dos conjuntos derivados del
//        corpus por el paso 09 — A (1.090 tokens en posicion de encabezamiento)
//        y B (260 tokens terminados en -as/-es/-is).
//
// Los 1.350 tokens se leyeron uno por uno. Los que no aparecen abajo se leyeron
// y se descartaron: son sustantivos, infinitivos, terceras personas, toponimos
// chilenos y nombres de sindicatos y empresas —el corpus trae el padron de
// concesiones acuicolas, de ahi 'guentelican', 'misilup', 'quiquel'—.
//
// LO QUE ESTE CIERRE NO ALCANZA, medido en 09: un imperativo regular metido a
// mitad de frase sin corte ni conjuncion delante Y que ademas no termine en
// -as/-es/-is. No es cero y se declara.
const fs = require('fs'), path = require('path');
const D = __dirname;

const NUEVAS = [];
const add = (formas, registro, ambiguo, origen, nota) => {
  for (const f of formas) NUEVAS.push({ forma: f.normalize('NFC'), registro, ambiguo, origen, nota });
};

// ── de A: imperativo tuteante que el paso 01 NO tenia ────────────────────────
// Los tres que se vieron de reojo en PARADA 1 estan aca, y no son los unicos:
// el conjunto A devolvio catorce mas.
add(['intenta', 'descarga', 'configura', 'corrige', 'elige', 'levanta',
     'regulariza', 'vigila', 'vuelve', 'quita', 'presiona', 'crea', 'da'],
    'tuteo', true, 'A', 'imperativo tuteante, homografo del indicativo de 3a');
add(['asegúrate', 'comunícate', 'déjalo', 'verifícalo'],
    'tuteo', false, 'A', 'imperativo tuteante con enclitico — inequivoco');

// ── de A: subjuntivo negativo, que es imperativo negativo de tu ──────────────
add(['navegues', 'adquieras'],
    'tuteo', false, 'A+B', 'imperativo negativo de tu ("no navegues") — inequivoco');

// ── de B: segunda persona no imperativa que el paso 01 NO tenia ──────────────
add(['aceptas', 'cedes', 'conoces', 'piensas', 'realizas', 'recibes', 'sufres'],
    'tuteo', false, 'B', 'presente de 2a persona — inequivoco');
add(['deberías', 'recibirás', 'regresarás', 'operarás'],
    'tuteo', false, 'B', 'futuro y condicional de 2a persona — inequivoco');

// ── SEGUNDA LECTURA DE LOS CONJUNTOS, y por que hubo que hacerla ────────────
// La primera lectura de A y B se hizo sobre LISTAS DE PALABRAS SUELTAS, sin la
// frase de al lado. Asi, "varas" se leyo como el toponimo de Puerto Varas y se
// descarto; en el arbol es tambien el verbo de "Si chocas, varas o sufres
// danos". Las cuatro de abajo YA ESTABAN en los conjuntos derivados: no las
// perdio el metodo, las perdio la lectura.
//
// El arreglo no es agregar cuatro formas: es que la lectura se hace con el
// ejemplo al lado. Se rehizo asi, y sobre esa segunda pasada salieron estas.
add(['genera'], 'tuteo', true, 'A (2a lectura)', 'imperativo tuteante, homografo del indicativo de 3a');
add(['chocas'], 'tuteo', false, 'B (2a lectura)', 'presente de 2a persona — inequivoco');
add(['varas', 'tiras'], 'tuteo', true, 'B (2a lectura)', 'verbo de 2a persona homografo de sustantivo y de toponimo');
// ── el vocabulario del paso 01, releido de su fichero para no tener dos verdades ──
const src01 = fs.readFileSync(path.join(D, '01_barrido.js'), 'utf8');
const VIEJAS = [];
const addV = (formas, registro, ambiguo, nota) => {
  for (const f of formas) VIEJAS.push({ forma: f.normalize('NFC'), registro, ambiguo, origen: '01', nota });
};
const bloque = src01.slice(src01.indexOf('const V = [];'), src01.indexOf('// ── MOTOR'));
new Function('add', bloque.replace('const V = [];', '').replace(/const add =[\s\S]*?};/, ''))(addV);

const porForma = new Map();
for (const v of [...VIEJAS, ...NUEVAS]) if (!porForma.has(v.forma)) porForma.set(v.forma, v);
const V = [...porForma.values()];

const L = [];
const say = (s) => L.push(s === undefined ? '' : s);
say('VOCABULARIO CERRADO — voseo_al_patron_2026-08-20');
say('');
say('  del paso 01 (memoria)        : ' + VIEJAS.length + ' formas');
say('  derivadas del corpus (09)    : ' + NUEVAS.length + ' formas');
say('  vocabulario cerrado          : ' + V.length + ' formas distintas');
say('');
const porReg = {};
for (const v of V) {
  const k = v.registro + (v.ambiguo ? ' · ambigua' : ' · inequivoca');
  porReg[k] = (porReg[k] || 0) + 1;
}
for (const [k, n] of Object.entries(porReg).sort()) say('  ' + k.padEnd(36) + n);
say('');
say('LAS ' + NUEVAS.length + ' QUE FALTABAN, con el conjunto del que salieron:');
for (const v of NUEVAS) say('  [' + v.origen.padEnd(3) + '] ' + v.forma.padEnd(14) + (v.ambiguo ? 'AMB  ' : 'INE  ') + v.nota);
say('');
say('CONTROL POSITIVO: las tres vistas de reojo en PARADA 1 mas las dos que la');
say('primera lectura de los conjuntos perdio. Ninguna estaba en el paso 01.');

let mal = 0;
for (const f of ['intenta', 'descarga', 'navegues', 'varas', 'genera']) {
  const estaAhora = porForma.has(f);
  const estabaAntes = VIEJAS.some((v) => v.forma === f);
  const ok = estaAhora && !estabaAntes;
  if (!ok) mal++;
  say('  ' + (ok ? 'OK  ' : 'FALLA ') + f + ' — cerrado:' + estaAhora + ' · paso01:' + estabaAntes);
}
say('');
say('CONTROL NEGATIVO: una forma que NO se marco no debe estar. "guentelican" es');
say('un apellido del padron de concesiones y estuvo en el conjunto A.');
const intruso = porForma.has('guentelican');
say('  ' + (intruso ? 'FALLA — se colo' : 'OK  — no esta'));
if (intruso) mal++;
say('');
say('EXIT ' + (mal ? 1 : 0) + (mal ? '  — ROJO' : '  — VERDE'));

fs.writeFileSync(path.join(D, '10_vocabulario_cerrado.json'), JSON.stringify(V, null, 1), 'utf8');
fs.writeFileSync(path.join(D, '10_vocabulario_cerrado.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
process.exit(mal ? 1 : 0);
