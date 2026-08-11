'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// coincidencia-nombres.js — la regla de coincidencia de nombre, en un solo lugar.
//
// DEUDA DE E0.2, SALDADA EN E0.3. `mismoNombre` estaba escrito dos veces —
// zonas-aviso.js:39 y ambitos-publicados.js:41— y los dos textos no eran
// identicos: uno normalizaba los argumentos crudos y el otro los pasaba por
// `|| ''` antes. Daban el mismo resultado porque normalizarTexto ya trata null
// como vacio, o sea que la diferencia era del tipo que no se nota hasta que uno
// de los dos cambia.
//
// POR QUE AHORA SE PUEDE UNIFICAR, Y ANTES NO CONVENIA: la regla existia porque
// el join bahia -> Capitania era POR NOMBRE. Con `join_bahia_jurisdiccion.json`
// el join pasa a la clave del decreto y deja de ser una regla: es un lookup por
// id. Lo que queda para el nombre es UNA sola cosa —cotejar que el contacto que
// el mapa operativo ofrece sea el de la jurisdiccion que dice el decreto— y esa
// cosa tiene un solo dueño.
//
// Que NO hace: no resuelve variantes ("Chacabuco" vs "Puerto Chacabuco") ni
// grafias. Eso se decidio con medicion en E0.3 y vive en el dato, no aca. Una
// funcion que "entiende" variantes en el codigo seria un caso particular
// escondido (CLAUDE.md §4.3).
// ─────────────────────────────────────────────────────────────────────────────

const { normalizarTexto } = require('./normalizarTexto');

/**
 * True si los dos nombres son el mismo, insensible a acentos y mayusculas.
 * Un vacio NUNCA coincide con nada, ni con otro vacio: dos jurisdicciones sin
 * nombre no son la misma jurisdiccion, y devolver true ahi haria que un dato
 * faltante pasara por un dato que calza.
 */
function mismoNombre(a, b) {
  const na = normalizarTexto(a);
  return na !== '' && na === normalizarTexto(b);
}

module.exports = { mismoNombre };
