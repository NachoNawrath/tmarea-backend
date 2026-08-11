#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e03join_prueba_mordida_join.js — ¿el validador del join MUERDE?
//
// CLAUDE.md §4.6: despues de escribir un control hay que inyectarle el defecto
// que debe cazar y comprobar que lo caza. Un control que no puede fallar no
// prueba nada.
//
// Cada caso deforma el join EN MEMORIA —el archivo del repositorio no se toca—
// y espera que la carga se detenga con un motivo que hable del defecto.
//
// Uso:  node scripts/e03join_prueba_mordida_join.js
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const { validarJoin, ErrorJoin } = require('../src/services/join-bahia-jurisdiccion');

const RAIZ = path.join(__dirname, '..');
const JOIN   = require(path.join(RAIZ, 'data', 'decreto', 'join_bahia_jurisdiccion.json'));
const INSUMO = require(path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json'));
const MAPA   = require(path.join(RAIZ, 'src', 'data', 'bahia-capitania-map.json'));

const clonar = o => JSON.parse(JSON.stringify(o));
const buscar = (j, id) => j.entradas.find(e => e.bahia_id === id);
const unaResuelta = j => j.entradas.find(e => e.estado === 'resuelta');
const unaSinResolver = j => j.entradas.find(e => e.estado === 'sin_resolver');

const CASOS = [
  ['una bahia del catalogo sin entrada en el join', /sin entrada en el join/i,
    j => { j.entradas = j.entradas.filter(e => e.bahia_id !== unaResuelta(j).bahia_id); }],

  ['una entrada repetida', /mas de una vez/i,
    j => { j.entradas.push(clonar(unaResuelta(j))); }],

  ['una bahia que el catalogo no tiene', /no existe en bahia-capitania-map/i,
    j => { const e = clonar(unaResuelta(j)); e.bahia_id = 999999; j.entradas.push(e); }],

  ['una jurisdiccion que el insumo no tiene', /no existe en jurisdicciones_v2/i,
    j => { unaResuelta(j).jurisdiccion_id = 'capitania_inventada'; }],

  ['un estado desconocido, sin caso por defecto', /estado .* desconocido/i,
    j => { unaResuelta(j).estado = 'mas_o_menos'; }],

  ['un respaldo desconocido, sin caso por defecto', /respaldo .* desconocido/i,
    j => { unaResuelta(j).respaldo = 'me_parece'; }],

  ['una atribucion resuelta sin evidencia', /exige 'evidencia'/i,
    j => { unaResuelta(j).evidencia = '  '; }],

  ['una atribucion resuelta sin criterio', /exige 'criterio'/i,
    j => { unaResuelta(j).criterio = null; }],

  ['una pendiente SIN fuente a consultar', /fuente_a_consultar/i,
    j => { delete unaSinResolver(j).fuente_a_consultar; }],

  ['una pendiente con fuente pero sin pregunta redactada', /fuente_a_consultar/i,
    j => { unaSinResolver(j).fuente_a_consultar.pregunta = ''; }],

  ['una pendiente que ademas trae jurisdiccion', /no pueden ser ciertas/i,
    j => { unaSinResolver(j).jurisdiccion_id = 'arica'; }],

  ['atribuir a dos jurisdicciones sin respaldo del decreto', /solo se sostiene si el decreto/i,
    j => { const e = unaResuelta(j); e.respaldo = 'operativo'; e.jurisdicciones_adicionales = ['arica']; }],

  ['una jurisdiccion adicional inexistente', /no existe en jurisdicciones_v2/i,
    j => { unaResuelta(j).jurisdicciones_adicionales = ['no_existe_esta']; }],

  ['el archivo sin procedencia', /procedencia/i,
    j => { j.procedencia = ''; }],

  ['el archivo sin arreglo de entradas', /arreglo "entradas"/i,
    j => { delete j.entradas; }],
];

console.log('='.repeat(78));
console.log('PRUEBA DE MORDIDA — VALIDADOR DEL JOIN BAHIA -> JURISDICCION');
console.log(`fecha: ${new Date().toISOString()}`);
console.log('='.repeat(78));
console.log('');

// Control negativo primero: con el archivo del repositorio tal cual, la carga
// tiene que pasar. Si no pasara, todo lo de abajo cazaria por el motivo
// equivocado y la prueba diria que muerde cuando en realidad esta rota.
let ok = 0, fallos = 0;
try {
  const r = validarJoin(clonar(JOIN), INSUMO, MAPA);
  console.log(`CONTROL NEGATIVO: el join del repositorio valida. ${r.conteo.total} bahias · ` +
    `${r.conteo.resueltas} resueltas · ${r.conteo.sin_resolver} sin resolver · ` +
    `respaldo ${JSON.stringify(r.conteo.por_respaldo)}`);
  ok++;
} catch (e) {
  console.log(`CONTROL NEGATIVO FALLIDO: el join del repositorio NO valida -> ${e.message}`);
  fallos++;
}
console.log('');

for (const [nombre, patron, deformar] of CASOS) {
  const j = clonar(JOIN);
  deformar(j);
  let cazado = false, msg = '';
  try {
    validarJoin(j, INSUMO, MAPA);
    msg = 'la carga NO se detuvo';
  } catch (e) {
    msg = e.message;
    cazado = e instanceof ErrorJoin && patron.test(e.message);
    if (!cazado && e instanceof ErrorJoin) msg = `se detuvo, pero por otro motivo: ${e.message}`;
  }
  if (cazado) { ok++; console.log(`  ✔ ${nombre}`); }
  else { fallos++; console.log(`  ✘ ${nombre}\n      ${msg}`); }
}

console.log('');
console.log('='.repeat(78));
console.log(`MORDIDA: ${ok}/${ok + fallos}${fallos ? '  — HAY CONTROLES QUE NO MUERDEN' : ''}`);
console.log('='.repeat(78));
process.exit(fallos ? 1 : 0);
