#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// prueba_mordida_cotejo_contrato.js
//
// El cotejo dato ↔ contrato (src/services/cotejo-contrato.js) ejercido contra
// datos malos. Un control que nunca se probo contra un dato malo no es un
// control, es una decoracion (CLAUDE.md §4.6).
//
// ORDEN, Y NO ES CASUAL: el CONTROL NEGATIVO VA PRIMERO. Si el cotejo lanzara
// siempre, pasaria todas las mordidas y pareceria perfecto. Primero se prueba
// que con el dato real NO muerde; recien despues se le rompe algo.
//
// Y cada caso comprueba el MENSAJE con el que se detiene, no solo que se
// detenga: un caso que muerde por otra razon esta en verde probando otra cosa.
// Es la trampa que el paso 5 de E3 pago —un caso salia CAZADO por C4 en vez de
// C6— y por eso no se repite acá.
//
// Semantica de salida, la de E0.1:
//   0  el dato dice lo que el contrato dice, y el control muerde donde debe
//   1  hay divergencia, o alguna mordida no mordio
//   2  no se pudo medir
//
// Uso:  node scripts/prueba_mordida_cotejo_contrato.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { cotejar, cotejarReal, filaDelCatalogo, SALIDA, RUTA_CONTRATO, RUTA_DECL } =
  require('../src/services/cotejo-contrato');

const RAIZ = path.join(__dirname, '..');
const DECL = JSON.parse(fs.readFileSync(RUTA_DECL, 'utf8'));
const CONTRATO = fs.readFileSync(RUTA_CONTRATO, 'utf8');
const { BANDERA_AVISO } = require('../src/services/cobertura-jurisdiccional');
const CODIGO = { BANDERA_AVISO };

const clonar = o => JSON.parse(JSON.stringify(o));
let fallas = 0;

console.log('================================================================');
console.log('COTEJO DATO ↔ CONTRATO — LA CORRIDA REAL');
console.log('================================================================');
console.log(`  dato     : ${path.relative(RAIZ, RUTA_DECL)}`);
console.log(`  contrato : ${path.relative(RAIZ, RUTA_CONTRATO)}`);

let real;
try {
  real = cotejarReal();
} catch (e) {
  console.log(`NO SE PUDO MEDIR: ${e.message}`);
  process.exit(SALIDA.no_medible);
}
console.log(`  fila     : ${JSON.stringify(real.fila)}`);
for (const r of real.resultados) {
  console.log(`  ${r.coincide ? 'OK     ' : 'DIVERGE'} ${r.nombre}`);
  if (!r.coincide) {
    console.log(`           el contrato dice : ${JSON.stringify(r.esperado)}`);
    console.log(`           el ${r.origen.padEnd(6)} dice : ${JSON.stringify(r.obtenido)}`);
  }
}
if (real.estado !== 'ok') fallas++;

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('================================================================');
console.log('PRUEBA DE MORDIDA');
console.log('================================================================');
console.log('');

// M0 — CONTROL NEGATIVO, PRIMERO.
try {
  const r = cotejar(DECL, CONTRATO, CODIGO);
  if (r.estado === 'ok') {
    console.log(`M0  control negativo — dato y contrato intactos     : NO muerde, ${r.resultados.length} afirmaciones. OK`);
  } else {
    console.log(`M0  control negativo — dato y contrato intactos     : MUERDE cuando no debia -> ${JSON.stringify(r.divergencias.map(d => d.nombre))}`);
    fallas++;
  }
} catch (e) {
  console.log(`M0  control negativo — dato y contrato intactos     : LANZA cuando no debia -> ${e.message}`);
  fallas++;
}

// Cada familia: que se rompe, y que tiene que decir el control al detenerse.
// `esperado` se aplica sobre el nombre de la divergencia o sobre el mensaje del
// error, segun el caso lo produzca como divergencia o como excepcion.
const FAMILIAS = [
  // M1 ESTUVO MUERTA Y NADIE SE ENTERO. Decia
  // `.replace('Confirma', 'Verifica')`, y el 2026-08-20 el §10 paso a usted:
  // el texto dejo de decir «Confirma» y paso a decir «Confirme». Desde ese dia
  // el replace era un no-op, la copia mutada era IDENTICA al dato, y la mordida
  // salia «NO MUERDE» — o sea que el control llevaba un dia entero diciendo que
  // no hace lo que dice, y ese rojo estaba en el arbol al abrir la sesion del
  // 2026-08-21. Es el mismo defecto que el §3(a) de la bitacora de la cifra:
  // UNA MORDIDA CON UN LITERAL ADENTRO CADUCA CUANDO EL DATO LA ALCANZA.
  // La mutacion se DERIVA ahora del texto vivo: se da vuelta su primera
  // palabra, sea cual sea. No puede coincidir con el original y no envejece.
  ['M1  el texto del dato se aparta del catalogo',
    () => { const d = clonar(DECL);
      const t = d.mensaje.capa_2_con_capitania;
      const primera = t.split(' ')[0];
      d.mensaje.capa_2_con_capitania = [...primera].reverse().join('') + t.slice(primera.length);
      return [d, CONTRATO, CODIGO]; },
    { divergencia: /capa 2 con Capitania/ }],

  ['M2  vuelve el telefono al texto, como estaba hasta la v1.7',
    () => { const d = clonar(DECL);
      d.mensaje.capa_2_con_capitania =
        d.mensaje.capa_2_con_capitania.replace('{nombre} antes', '{nombre}: {telefono} antes');
      return [d, CONTRATO, CODIGO]; },
    { divergencia: /capa 2 con Capitania/ }],

  ['M3  la capa 1 del dato se aparta del catalogo',
    () => { const d = clonar(DECL); d.mensaje.capa_1 = 'No tenemos el limite de esta zona.'; return [d, CONTRATO, CODIGO]; },
    { divergencia: /capa 1/ }],

  ['M4  la BANDERA del codigo deja de ser la que el catalogo declara',
    () => [DECL, CONTRATO, { BANDERA_AVISO: 'UV' }],
    { divergencia: /bandera/ }],

  ['M5  la bandera de la CELDA cambia y el codigo se queda atras',
    () => [DECL, CONTRATO.replace('| **Jurisdicción sin límite cargado** | 🟡 U "',
                                  '| **Jurisdicción sin límite cargado** | 🔴 UV "'), CODIGO],
    { divergencia: /bandera/ }],

  ['M6  la procedencia apunta a una fila que no existe',
    () => { const d = clonar(DECL); d.cotejo_con_el_contrato.fila = 'Fila que nadie escribio'; return [d, CONTRATO, CODIGO]; },
    { error: /no tiene ninguna fila con la etiqueta/ }],

  ['M7  la fila se borro del catalogo',
    () => [DECL, CONTRATO.split(/\r?\n/).filter(l => !l.startsWith('| **Jurisdicción sin límite cargado**')).join('\n'), CODIGO],
    { error: /no tiene ninguna fila con la etiqueta/ }],

  ['M8  hay DOS filas con la misma etiqueta: no se elige una',
    () => { const l = CONTRATO.split(/\r?\n/);
      const i = l.findIndex(x => x.startsWith('| **Jurisdicción sin límite cargado**'));
      l.splice(i + 1, 0, l[i]);
      return [DECL, l.join('\n'), CODIGO]; },
    { error: /2 filas con la etiqueta/ }],

  ['M9  el bloque de cotejo se borro del dato — no se apaga en silencio',
    () => { const d = clonar(DECL); delete d.cotejo_con_el_contrato; return [d, CONTRATO, CODIGO]; },
    { error: /no trae el bloque 'cotejo_con_el_contrato'/ }],

  ['M10 una afirmacion sin afirmaciones que hacer',
    () => { const d = clonar(DECL); d.cotejo_con_el_contrato.afirmaciones = []; return [d, CONTRATO, CODIGO]; },
    { error: /arreglo no vacio/ }],

  ['M11 tipo de afirmacion desconocido: no hay caso por defecto',
    () => { const d = clonar(DECL); d.cotejo_con_el_contrato.afirmaciones[0].tipo = 'parecido'; return [d, CONTRATO, CODIGO]; },
    { error: /tipo 'parecido' desconocido/ }],

  ['M12 la afirmacion apunta a una celda que la fila no tiene',
    () => { const d = clonar(DECL); d.cotejo_con_el_contrato.afirmaciones[0].celda = 'capa_9'; return [d, CONTRATO, CODIGO]; },
    { error: /celda 'capa_9', que la fila no tiene/ }],

  ['M13 la celda de capa 1 pierde las comillas y no se puede extraer',
    () => [DECL, CONTRATO.replace('🟡 U "No tenemos cargado el límite de esta jurisdicción."',
                                  '🟡 U No tenemos cargado el límite de esta jurisdicción.'), CODIGO],
    { error: /no se pudo extraer 'entrecomillado'/ }],

  // ── M14 y M15: las dos mordidas de la correccion del 2026-08-21 ────────────
  // Los dos extractores tomaban LO PRIMERO QUE PARECIA el texto y ahora exigen
  // una sola coincidencia. Las dos mutaciones se DERIVAN de la fila viva del
  // contrato —se lee su linea cruda y se reescribe— para que no caduquen si el
  // §10 se mueve o si la fila cambia de texto.
  ['M14 la celda de capa 1 trae DOS tramos entrecomillados: no se elige uno',
    () => {
      const cruda = filaDelCatalogo(CONTRATO, DECL.cotejo_con_el_contrato.fila).cruda;
      const celdas = cruda.split('|');
      celdas[2] = celdas[2].replace('"', '(antes "una cita vieja") "');
      return [DECL, CONTRATO.replace(cruda, celdas.join('|')), CODIGO];
    },
    { error: /2 tramos entre comillas/ }],

  ['M15 la celda declara DOS banderas antes del texto: no se elige una',
    () => {
      const cruda = filaDelCatalogo(CONTRATO, DECL.cotejo_con_el_contrato.fila).cruda;
      const celdas = cruda.split('|');
      // Se antepone OTRA bandera a la que la celda ya trae, derivada de la que
      // el codigo declara: si el motor dijera Q, se antepone U, y al reves.
      const otra = CODIGO.BANDERA_AVISO === 'Q' ? 'U' : 'Q';
      celdas[2] = celdas[2].replace(/(\s)(?=\S*")/, `$1sube de ${otra} a `);
      return [DECL, CONTRATO.replace(cruda, celdas.join('|')), CODIGO];
    },
    { error: /2 banderas antes del texto/ }],
];

// LA MUTACION TIENE QUE MUTAR — agregado el 2026-08-21, y es generico a
// proposito. Varias familias rompen el dato con un `.replace()` de un literal
// escrito a mano; cuando el dato se mueve, el replace se vuelve un no-op y la
// copia «mutada» es identica al original. Ahi la mordida deja de morder, y en el
// mejor caso sale un rojo confuso («NO MUERDE») que acusa al control cuando el
// culpable es la mutacion. Eso fue exactamente M1 desde el 2026-08-20.
// Se comprueba ANTES de cotejar y se dice por su nombre, en vez de dejar que el
// sintoma se lea como otra cosa. No reemplaza a derivar la mutacion del dato
// vivo: la hace RUIDOSA cuando alguien no lo hizo.
const INTACTO = JSON.stringify([DECL, CONTRATO, CODIGO]);

for (const [nombre, romper, esperado] of FAMILIAS) {
  let salida, error;
  const roto = romper();
  if (JSON.stringify(roto) === INTACTO) {
    console.log(`${nombre.padEnd(52)}: LA MUTACION NO MUTO — la copia es identica al dato. ` +
                `Un literal de esta familia caduco: la mordida no puede morder con una copia igual.`);
    fallas++;
    continue;
  }
  try {
    salida = cotejar(...roto);
  } catch (e) {
    error = e;
  }

  if (esperado.error) {
    if (!error) {
      console.log(`${nombre.padEnd(52)}: NO MUERDE (devolvio ${salida ? salida.estado : '?'})`);
      fallas++;
    } else if (!esperado.error.test(error.message)) {
      console.log(`${nombre.padEnd(52)}: muerde por OTRA razon -> ${error.message.slice(0, 90)}`);
      fallas++;
    } else {
      console.log(`${nombre.padEnd(52)}: muerde. ${error.message.slice(0, 84)}`);
    }
    continue;
  }

  // Casos que deben producir DIVERGENCIA, no excepcion.
  if (error) {
    console.log(`${nombre.padEnd(52)}: LANZA en vez de reportar divergencia -> ${error.message.slice(0, 80)}`);
    fallas++;
  } else if (salida.estado !== 'divergencia') {
    console.log(`${nombre.padEnd(52)}: NO MUERDE (estado ${salida.estado})`);
    fallas++;
  } else if (!salida.divergencias.some(d => esperado.divergencia.test(d.nombre))) {
    console.log(`${nombre.padEnd(52)}: diverge por OTRA afirmacion -> ${JSON.stringify(salida.divergencias.map(d => d.nombre))}`);
    fallas++;
  } else {
    const d = salida.divergencias.find(x => esperado.divergencia.test(x.nombre));
    console.log(`${nombre.padEnd(52)}: diverge. "${d.nombre}" · salida ${salida.salida}`);
  }
}

console.log('');
console.log('================================================================');
if (fallas === 0) {
  console.log(`RESULTADO: cotejo real en verde y mordida ${FAMILIAS.length}/${FAMILIAS.length} + control negativo.`);
  console.log('================================================================');
  process.exit(SALIDA.ok);
}
console.log(`RESULTADO: ${fallas} falla(s). El control no hace lo que dice.`);
console.log('================================================================');
process.exit(SALIDA.divergencia);
