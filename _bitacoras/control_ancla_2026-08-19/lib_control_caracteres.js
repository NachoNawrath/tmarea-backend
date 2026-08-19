'use strict';
// ---------------------------------------------------------------------------
// lib_control_caracteres.js - (a1)-T
//
// EL control de caracteres de control de esta sesion, en un solo lugar, para
// que 03_cierre_controles.js y 08_mordida_control_caracteres.js midan LA MISMA
// funcion y no dos transcripciones de la misma idea.
//
// CRITERIO, declarado entero porque la primera version tenia un hueco y el
// hueco era justo el caso de esta carpeta:
//
//   (a) byte < 0x20 que no sea LF (0x0A) ni CR (0x0D)  ->  control C0
//   (b) byte 0x7F                                       ->  DEL
//   (c) byte 0xC2 seguido de 0x80..0x9F                 ->  control C1 en UTF-8
//
// LA (c) FALTABA. La version del 2026-08-19 22:22 miraba solo `b < 0x20`, y el
// U+0091 del nodo 656 -- el unico control que este repositorio tiene de verdad
// en un dato (H-8) -- se codifica en UTF-8 como los DOS bytes 0xC2 0x91, y
// NINGUNO de los dos es menor que 0x20. O sea que el control salia verde sobre
// un fichero que llevara ese caracter crudo adentro: exactamente lo que decia
// impedir. Medido en 08_mordida_control_caracteres.txt.
//
// El TAB (0x09) NO se admite: ningun fichero que esta sesion escribe lo lleva,
// y admitirlo por si acaso es ensanchar un control sin motivo.
// ---------------------------------------------------------------------------

function controlesEnBytes(buf) {
  const hallados = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 0x20 && b !== 0x0a && b !== 0x0d) {
      hallados.push({ offset: i, clase: 'C0', detalle: '0x' + b.toString(16).padStart(2, '0') });
    } else if (b === 0x7f) {
      hallados.push({ offset: i, clase: 'DEL', detalle: '0x7f' });
    } else if (b === 0xc2 && i + 1 < buf.length && buf[i + 1] >= 0x80 && buf[i + 1] <= 0x9f) {
      hallados.push({
        offset: i, clase: 'C1',
        detalle: 'U+00' + buf[i + 1].toString(16).padStart(2, '0') + ' codificado 0xc2 0x' + buf[i + 1].toString(16),
      });
      i++;
    }
  }
  return hallados;
}

// El criterio TAL COMO ESTA SESION LO ESCRIBIO PRIMERO, conservado para poder
// medir su hueco en la mordida. NO SE USA PARA CONTROLAR NADA: existe solo como
// termino de comparacion, y por eso lleva el nombre que lleva.
function controlesEnBytes_VERSION_VIEJA_CON_HUECO(buf) {
  const hallados = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 0x20 && b !== 0x0a && b !== 0x0d) hallados.push({ offset: i, clase: 'C0', detalle: '0x' + b.toString(16) });
  }
  return hallados;
}

module.exports = { controlesEnBytes, controlesEnBytes_VERSION_VIEJA_CON_HUECO };
