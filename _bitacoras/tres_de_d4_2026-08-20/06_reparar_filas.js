'use strict';
// REPARA las 6 filas que el validador rechazo, y NO se disimula por que.
//
// El 05 las escribio con dos defectos que V7 cazo, los dos de forma:
//   (a) `abierta_el: '2026-08-20'` con `abierta_el_lo_dice_el_documento: false`.
//       El documento NO las fecha —nacen de una medicion— asi que va null. Es la
//       misma regla que las 15 filas de PLAN-2 ya cumplian y que yo copie mal.
//   (b) toda la evidencia colgada como campos sueltos de la fila, en vez de
//       dentro de `evidencia_en_el_arbol`. Una fila con sin_texto=true necesita
//       ESE campo: es lo que la muestra.
// El validador los caza a los dos. Va escrito porque el 05 llego a correr.

const fs = require('fs');
const path = require('path');
const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));

const COMUNES = new Set([
  'id', 'token_local', 'espacio_de_nombres', 'sitio', 'repo', 'texto_literal', 'sin_texto',
  'titulo', 'evidencia_en_el_arbol', 'donde', 'abierta_el', 'abierta_el_lo_dice_el_documento',
  'nota_fecha', 'grupo', 'estado', 'firma_owner', 'redactada_no_aplicada', 'duplicada_de',
  'medicion',
]);
const POR_GRUPO = {
  '1_cierra_con_lo_que_hay': ['costo_estimado', 'depende_de'],
  '2_decision_del_owner': ['pregunta', 'por_que_es_del_owner', 'consecuencia_hoy'],
  '3_dato_externo': ['que_dato', 'a_quien', 'aviso_sobre_la_via'],
};

let tocadas = 0;
for (const f of d.deudas) {
  if (!String(f.id).startsWith('D4D5::')) continue;
  const permitidos = new Set([...COMUNES, ...(POR_GRUPO[f.grupo] || [])]);
  const ev = f.evidencia_en_el_arbol && typeof f.evidencia_en_el_arbol === 'object'
    ? f.evidencia_en_el_arbol : {};
  for (const k of Object.keys(f)) {
    if (permitidos.has(k)) continue;
    ev[k] = f[k];
    delete f[k];
  }
  ev.medido_el = ev.medido_el || '2026-08-20';
  ev.salida_cruda = '_bitacoras/tres_de_d4_2026-08-20/';
  f.evidencia_en_el_arbol = ev;
  f.abierta_el = null;
  tocadas++;
}

fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });
console.log('filas D4D5 reparadas: ' + tocadas);
for (const f of d.deudas.filter(x => String(x.id).startsWith('D4D5::'))) {
  console.log('  ' + f.id + '  grupo=' + f.grupo + '  claves_evidencia=' + Object.keys(f.evidencia_en_el_arbol).length);
}
