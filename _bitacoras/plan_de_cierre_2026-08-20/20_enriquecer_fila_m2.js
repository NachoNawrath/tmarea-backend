// Enriquece la fila de (m2) con las dos cosas que el owner pidio que diga con
// esas palabras: la REGLA del control positivo, y el cruce de (m1) con (m2).
'use strict';
const fs = require('fs');
const F = 'C:/Users/katia/tmarea-backend/data/deudas/deudas_declaradas.json';
const ID = 'SESION-plan-de-cierre-2026-08-20::los-ocho-puntos-caen-en-su-jurisdiccion-y-eso-desacopla-S4-a-medias';

const D = JSON.parse(fs.readFileSync(F, 'utf8'));
const f = D.deudas.find(d => d.id === ID);
if (!f) { console.error('ALTO: no esta la fila de m2'); process.exit(1); }
const e = f.evidencia_en_el_arbol;

e.LA_REGLA_QUE_HAY_QUE_PRESERVAR_DE_ESTA_SESION =
  'UN CONTROL POSITIVO QUE FALLA SE SOSPECHA A SI MISMO ANTES DE ACUSAR AL DATO, Y LA PRIMERA MEDICION ES ' +
  'BUSCAR SI ALGUIEN YA LO CONTESTO. Asi paso, entero: el control positivo salio 5 DE 6 —el punto interior de ' +
  'lago_ranco caia tambien en puerto_varas—; en vez de publicarlo como hallazgo se fue a buscar si el ' +
  'repositorio ya lo tenia contestado; Y LO TENIA, DESDE EL 2026-08-13: la salida del build imprime textual ' +
  '"Lago Ranco (lacustre) x Puerto Varas (lacustre) = 155.426 km2" y el control C3 del ambito lacustre, "cero ' +
  'traslapes fuera de los declarados deliberados", dio obtenido 0. EL QUE ESTABA MAL ERA EL CONTROL: su ' +
  'esperado —"cae en la suya y en ninguna otra"— salia de una SUPOSICION y no de la corrida. PUBLICARLO ' +
  'HABRIA ACUSADO A LA CAPA DE UN DEFECTO QUE NO TIENE. Corregido para que el esperado SE DERIVE de los ' +
  'traslapes reales de la capa, el control da 6 de 6. La regla vale para cualquier control de este ' +
  'repositorio y por eso queda escrita como regla y no como anecdota.';

e.EL_CRUCE_DE_M1_CON_M2_Y_ES_LO_QUE_IMPIDE_LEER_MAL_ESTA_FILA =
  'EL MUELLE DE LLANQUIHUE CAE DENTRO DE LA JURISDICCION A 0 m Y EL RASTER DICE TIERRA CON 0 DE 6561 ' +
  'NAVEGABLES. LAS DOS CIERTAS. Punto -41,2553 -73,0026, el mismo en las dos mediciones. LA JURISDICCION DE ' +
  'UNA CAPITANIA LACUSTRE NO ES EL ESPEJO DE AGUA: INCLUYE TIERRA, Y puerto_varas SON 1.437,4 km2. Esto es lo ' +
  'que impide que alguien lea (m2) como "entonces el lago esta resuelto". No lo esta: (m2) contesta que ' +
  'jurisdiccion gobierna el viaje, y (m1) sigue diciendo que ese viaje no se puede trazar.';

f.enmienda_2026_08_20 =
  'ENRIQUECIDA EL MISMO DIA, por decision del owner, con dos cosas que la primera version tenia dispersas y ' +
  'que el owner quiso con esas palabras: la REGLA del control positivo que se sospecha a si mismo, y el cruce ' +
  'de (m1) con (m2) sobre el mismo punto. Ningun numero de la medicion cambio.';

fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');
console.log('ENRIQUECIDA: ' + ID);
console.log('  + LA_REGLA_QUE_HAY_QUE_PRESERVAR_DE_ESTA_SESION');
console.log('  + EL_CRUCE_DE_M1_CON_M2_Y_ES_LO_QUE_IMPIDE_LEER_MAL_ESTA_FILA');
console.log('  filas ' + D.deudas.length + ' · sin id ' + D.deudas.filter(d => !d.id).length + ' (asercion por D4)');
console.log('  fichero existe: ' + fs.existsSync(F));
