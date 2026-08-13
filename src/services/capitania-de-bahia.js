'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// capitania-de-bahia.js — el UNICO punto donde el decreto y el mapa operativo
// se encuentran para armar el contacto que ve el patron.
//
// DECISION DEL OWNER, 2026-08-13 (PLAN_JURISDICCION.md §E3):
//   · el NOMBRE de la Capitania sale del JOIN de E0.3 —dato declarado con
//     respaldo del decreto— para las bahias cuya jurisdiccion es de un ambito
//     PUBLICADO;
//   · el TELEFONO sigue saliendo de src/data/bahia-capitania-map.json, que es
//     su fuente autorizada por CONTRATO_MOTOR.md §5.
//
// POR QUE. El mapa mezcla quien tiene jurisdiccion con a quien se llama, y E0.3
// ya lo declaro insuficiente para lo primero. Medido sobre las 21 entradas
// lacustres del join (_bitacoras/e3_recon_cableado_2026-08-13.txt §3.c): 17 de
// 21 no nombran bien su Capitania —14 con `capitania: null` que devuelven
// telefono igual, y 159/160/161 nombrando "Puerto Montt", una Capitania
// MARITIMA, donde el decreto dice `puerto_varas` y `lago_ranco`. Sin esto, en
// cuanto E3 cablee el ambito lacustre un patron navegando el Lago Puyehue veria
// "Puerto Montt". Es coherente con INV-3.3: el mapa operativo no revoca al
// decreto.
//
// ESTO NO ARREGLA EL MAPA: lo deja de consultar para el nombre, y solo en los
// ambitos publicados. El frente de contacto (§7.1 del plan) sigue abierto, y en
// cualquier otro ambito el nombre sigue saliendo de donde salia.
//
// LA GOBERNACION SIGUE SALIENDO DEL MAPA, dicho en vez de tapado. El owner
// decidio sobre el nombre de la Capitania y el telefono; la pertenencia
// Capitania -> Gobernacion la dan el decreto, la agrupacion del indice de
// resoluciones locales y la repartición de SITPORT, y las tres coinciden
// (_bitacoras/recon_resoluciones_locales_2026-08-12.txt), asi que no hay
// discrepancia medida que arreglar y no se toca por anticipado.
// ─────────────────────────────────────────────────────────────────────────────

const { getCapitaniaByBahiaId } = require('../utils/capitanias');
const { cargarJoin } = require('./join-bahia-jurisdiccion');

const RUTA_INSUMO = require('path').join(__dirname, '..', '..', 'data', 'decreto', 'jurisdicciones_v2.json');

/**
 * Contacto de una bahia para el bloque de transito.
 *
 * @param {number} bahiaId
 * @param {string[]} ambitosPublicados — los ambitos que ambitos_publicados.json
 *   declara publicados. Vacio (el estado de hoy) = se comporta exactamente como
 *   antes de este cableado, sin ninguna rama nueva que pueda cambiar lo que el
 *   patron ve.
 * @returns {{capitania, gobernacion, telefono, capitania_fuente}}
 */
function capitaniaDeBahia(bahiaId, ambitosPublicados) {
  const contacto = getCapitaniaByBahiaId(bahiaId);
  const delMapa = {
    capitania:   contacto?.capitania   ?? null,
    gobernacion: contacto?.gobernacion ?? null,
    telefono:    contacto?.telefono    ?? null,
    capitania_fuente: 'mapa_operativo',
  };

  if (!Array.isArray(ambitosPublicados) || ambitosPublicados.length === 0) return delMapa;

  const atribucion = cargarJoin().resueltas.get(Number(bahiaId));
  // Una bahia sin atribucion resuelta es un estado legitimo del dato (6 de 164,
  // cada una con su fuente a consultar escrita). No se inventa un nombre: se
  // devuelve el del mapa, que es lo que se mostraba hasta hoy.
  if (!atribucion) return delMapa;

  const jur = require(RUTA_INSUMO).jurisdicciones.find(j => j.id === atribucion.jurisdiccion_id);
  if (!jur || !ambitosPublicados.includes(jur.ambito)) return delMapa;

  return {
    capitania: jur.nombre,          // el decreto, via el join de E0.3
    gobernacion: delMapa.gobernacion,
    telefono: delMapa.telefono,     // el mapa operativo, CONTRATO_MOTOR.md §5
    capitania_fuente: 'decreto',
  };
}

module.exports = { capitaniaDeBahia };
