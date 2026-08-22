'use strict';
/**
 * Cotejo vertical por sonda documentada, como ADVERTENCIA (Fase 3
 * redefinida -- spec-router-raster-v1.md SS6.3, docs/handoff-fase2.md).
 *
 * Por que advertencia y no bloqueo, a diferencia de como SS6.3 lo describe
 * originalmente ("el paso es INTRANSITABLE"): 6 de los 7 registros de
 * src/config/pasos-sonda-canal.json tienen posicion aproximada o ninguna
 * geometria verificable (ver ese archivo, campo canal_geometria_disponible).
 * Bloquear una ruta real por una sonda cuya ubicacion no esta confirmada
 * es peor que el falso positivo ocasional de advertir de mas -- el error
 * seguro es advertir sin necesidad, no cerrar un paso que si se navega.
 *
 * Post-proceso puro: corre DESPUES de que el A* ya trazo la ruta, sobre la
 * polilinea final. No modifica el raster, la LUT de costo ni el A* --
 * exactamente el mismo principio que ya aplica el router para KML/zonas
 * dragadas (el margen se relaja en el costo, nunca se prohibe explorar).
 */
const fs = require('fs');
const path = require('path');
const { canalesQueCruzaRuta } = require('./canal-geometria');

const PASOS_PATH = path.join(__dirname, '..', '..', 'config', 'pasos-sonda-canal.json');

let PASOS_CACHE = null;
function cargarPasos() {
  if (!PASOS_CACHE) {
    PASOS_CACHE = JSON.parse(fs.readFileSync(PASOS_PATH, 'utf8'));
  }
  return PASOS_CACHE;
}

/** spec SS6.3: margen_bajo_quilla = max(0.5m, 0.1 x calado). Preliminar,
 * practica nautica comun, no dato de fuente -- mismo criterio que
 * perfiles-costo.js documenta para otros margenes preliminares. */
function margenBajoQuilla(calado_m) {
  return Math.max(0.5, 0.1 * calado_m);
}

/**
 * @param {Array<[number,number]>} waypointsLonLat - ruta trazada, [lon,lat]
 * @param {number} calado_m
 * @returns {Array<{clase:'cotejo_vertical', texto:string}>} listas para el array
 *   `advertencias` de la respuesta. TIPADAS y no cadenas sueltas: ese array lleva
 *   CUATRO clases distintas —descargos de base, peligros de canal, un diagnóstico
 *   interno del motor y ésta— y la PWA dibuja SÓLO ésta. La clase se pone donde el
 *   texto NACE y nunca por un mapeo posterior (§4.2), y la selección del otro lado
 *   se ancla en ella y no en una frase del texto (§4.9): un filtro por literal
 *   dejaría de dibujar EN VERDE Y EN SILENCIO el día que alguien reescriba la frase.
 */
function advertenciasCotejoVertical(waypointsLonLat, calado_m) {
  if (!calado_m || calado_m <= 0) return [];

  const pasos = cargarPasos().filter((p) => p.canal_geometria_disponible);
  if (pasos.length === 0) return [];

  const canalesCruzados = new Set(canalesQueCruzaRuta(waypointsLonLat));
  if (canalesCruzados.size === 0) return [];

  const margen = margenBajoQuilla(calado_m);
  const profundidadRequerida = calado_m + margen;

  const advertencias = [];
  for (const paso of pasos) {
    if (!canalesCruzados.has(paso.canal)) continue;
    if (paso.sonda_canal_min_m < profundidadRequerida) {
      // ── EL CUERPO VA EN LENGUAJE LLANO Y LA FUENTE VA APARTE ─────────────
      // Decisión del owner, 2026-08-21. El texto anterior citaba «Derrotero SHOA»
      // y «(p.291)» dentro de la frase y se leía como documento técnico, no como
      // aviso: le prestaba al patrón una certeza que este dato no tiene. Ahora el
      // cuerpo dice «Según fuentes oficiales» y la fuente concreta viaja en campos
      // propios, para que la PWA la ponga abajo y en chico, como comprobación.
      //
      // MEDIDO ANTES DE CAMBIARLO, y es lo que autorizó el cambio: esto NO agrega
      // un caso a S7. §10 del contrato es la fuente única de mensajes normativos y
      // manda «NO inventar citas fuera de este catálogo»; el Derrotero está
      // declarado en el propio contrato como fuente de DATOS, no como norma. Un
      // «(p.291)» incrustado en la frase se leía como cita normativa sin serlo.
      // Y el modelo de doble capa de INV-1.3 ya separa el estado de su cita: la
      // línea chica de abajo es esa misma separación.
      //
      // NI EL CALADO NI EL MARGEN SE MUESTRAN COMO ANTES. El margen sigue
      // decidiendo QUIÉN recibe el aviso —arriba, en `profundidadRequerida`— pero
      // sale del texto: `margenBajoQuilla` está declarado en este mismo archivo
      // como práctica náutica preliminar y NO dato de fuente, y mostrarlo con un
      // decimal lo presentaba como medición.
      const m = (n) => String(n).replace('.', ',');
      const cuerpo = paso.punto_bajo
        // RAMA A — la fuente NOMBRA el lugar de la sonda. La salvedad no es
        // «posición aproximada»: la fuente sí la sitúa. Lo que falta es la
        // coordenada para ponerla sobre la ruta, y eso es lo que se dice.
        ? `Según fuentes oficiales, hay sondas de ${m(paso.sonda_canal_min_m)} m ${paso.punto_bajo}. ` +
          `No podemos ubicar ese punto en su ruta. Su nave cala ${m(calado_m)} m. ` +
          `Con marea baja puede haber menos agua que la registrada. ` +
          `Navegue atento a la ecosonda y consulte la carta náutica.`
        // RAMA B — la fuente no lo nombra. Acá sí corresponde decir que no hay
        // punto señalado. Medido: de los 7 registros, sólo Canal Tenglo nombra el
        // lugar de SU SONDA; los demás topónimos ubican el paso, no la sonda.
        : `Según fuentes oficiales, hay sondas de ${m(paso.sonda_canal_min_m)} m en este paso, ` +
          `sin un punto exacto señalado. Su nave cala ${m(calado_m)} m. ` +
          `Con marea baja puede haber menos agua que la registrada. ` +
          `Navegue atento a la ecosonda y consulte la carta náutica.`;

      advertencias.push({
        clase: 'cotejo_vertical',
        // TODO LO QUE EL CONSUMIDOR NECESITA VIAJA COMO DATO, NUNCA DENTRO DE LA
        // CADENA. Sacarlo del texto con una expresión regular sería el mismo
        // defecto que la clase existe para evitar: el día que la frase se
        // reescriba, el consumidor pierde el campo en silencio.
        canal: paso.canal,
        sonda_m: paso.sonda_canal_min_m,
        punto_bajo: paso.punto_bajo || null,
        texto: cuerpo,
        fuente: 'Derrotero SHOA',
        pagina: paso.pagina,
      });
    }
  }
  return advertencias;
}

module.exports = { advertenciasCotejoVertical, margenBajoQuilla };
