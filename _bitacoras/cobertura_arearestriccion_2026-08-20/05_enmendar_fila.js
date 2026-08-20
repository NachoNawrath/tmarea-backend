// 05_enmendar_fila.js — la enmienda que el owner pidio en PARADA 2.
//
// La fila describia el hallazgo como un colapso de la funcion. El owner lo
// nombra como lo que es: informacion de alcance que LLEGA y se DESCARTA. Se
// agrega esa afirmacion con sus palabras, dentro de EL_HALLAZGO.
//
// NO se arregla nada y NO se mide nada mas sobre la AML: queda para cuando se
// redacte la regla que reemplaza a INV-3.4.

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const F = path.join(RAIZ, 'data', 'deudas', 'deudas_declaradas.json');
const ID = 'D4D5::detectararea-colapsa-un-vocabulario-de-tres';

const D = JSON.parse(fs.readFileSync(F, 'utf8'));
const fila = D.deudas.find((d) => d.id === ID);
if (!fila) { console.error('ALTO: no existe la fila ' + ID); process.exit(1); }

const CLAVE = 'NO_ES_UN_CAMPO_MAL_PARSEADO';
if (fila.evidencia_en_el_arbol.EL_HALLAZGO[CLAVE]) {
  console.error('ALTO: la clave ' + CLAVE + ' ya existe. No se escribe dos veces.');
  process.exit(1);
}

fila.evidencia_en_el_arbol.EL_HALLAZGO[CLAVE] =
  'Hay restricciones cuya area SITPORT SI declara —"OTRA ÁREA FIJADA POR LA AML", 38 filas de las 509, 16 de ellas con ese valor SOLO— y que la app trata igual que si no la declarara. No es un campo mal parseado: es informacion de alcance que LLEGA y se DESCARTA. El dato entra por consultaRestricciones, cruza el parser, y sale por la misma etiqueta que una fila con el campo en null. NO se arregla ahora y no se mide nada mas sobre la AML: queda para cuando se redacte la regla que reemplaza a INV-3.4, que es donde va a hacer falta (decision del owner, 2026-08-20).';

fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');
console.log('ENMENDADA la fila ' + ID);
console.log('  clave nueva: EL_HALLAZGO.' + CLAVE);
console.log('  filas totales (sin cambio): ' + D.deudas.length);
console.log('  claves de EL_HALLAZGO ahora: ' + Object.keys(fila.evidencia_en_el_arbol.EL_HALLAZGO).join(' · '));
