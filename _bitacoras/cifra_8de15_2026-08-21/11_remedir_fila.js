'use strict';
// NUMERO FRESCO A LA FILA D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia.
// Instruccion del owner: remedir y dejarla VIVA, SIN TOCAR SU TEXTO.
//
// COMO SE CUMPLE «SIN TOCAR SU TEXTO», que es mas literal de lo que parece: esta
// fila tiene `texto_literal: null` y `sin_texto: true` — no hay texto que tocar.
// Lo que si tiene son campos de MEDICION fechados, y esos NO se reescriben: se
// AGREGA uno nuevo con su fecha (CLAUDE.md §3.3). Los viejos describen el primer
// movimiento de la cifra y siguen siendo exactos sobre el.
//
// `estado` no se toca: la fila sigue VIVA. El barredor no se construyo, y esta
// pieza tampoco lo construyo — por el mismo motivo que la anterior lo dejo
// afuera: separar CITA HISTORICA de AFIRMACION VIVA es una decision de diseno,
// no un grep.

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const crudo = fs.readFileSync(RUTA, 'utf8');
const d = JSON.parse(crudo);
const arr = Array.isArray(d) ? d : (d.filas || Object.values(d).find(Array.isArray));

const ID = 'D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia';
const f = arr.find(x => x.id === ID);
if (!f) throw new Error('no se encontro la fila ' + ID);

const antesEstado = f.estado;
const CAMPO = 'remedido_el_2026_08_21_tras_el_SEGUNDO_movimiento';
if (f[CAMPO]) throw new Error('el campo ya existe: esta pieza no se corre dos veces');

f[CAMPO] = {
  medido_el: '2026-08-21',
  que_lo_gatillo: 'La cifra se movio por SEGUNDA vez el mismo dia: de 5 de 15 a 8 de 15 al 2026-08-21, con 2 anuladas por decision del owner, al entrar S3(a)(b)(c). Cada movimiento vuelve falsa de golpe toda copia escrita a mano, asi que el numero de esta fila envejece con la cifra y no con el calendario.',
  cadena_invalidada_por_este_movimiento: { patron: '5 de 15', apariciones: 37, ficheros: 18 },
  cadena_invalidada_por_el_movimiento_anterior: { patron: '4 de 15', apariciones: 45, ficheros: 20 },
  en_la_pwa: 0,
  ambito_del_conteo: 'git ls-files de tmarea-backend Y tmarea-pwa. El conteo del 2026-08-20 —54 en 21 ficheros— era de UN solo repo y de OTRA cadena; no se compara con este y no lo corrige.',
  es_cota_no_medida: 'El conteo NO separa CITA HISTORICA de AFIRMACION VIVA, y la mayoria de las apariciones DEBE seguir diciendo la cadena vieja porque viven en bitacoras. Es cota superior del barrido pendiente.',
  lo_unico_que_esta_pieza_si_barrio: 'Los tres restos de «5 de 15» que quedaban en scripts/publicar_cifra_spec2.js y scripts/prueba_mordida_cifra.js se revisaron uno por uno: los tres son cita historica —dicen que la cabecera LLEVABA esa cifra, o citan el caso en que no_cumple valio 10— y por eso se dejaron. Tres de 37; el resto sigue sin barrer.',
  defecto_de_esta_fila_sobre_si_misma: 'Este conteo tambien esta escrito a mano, en el pie del emisor y aca. O sea que la fila que declara «la cifra se puede escribir a mano y nadie lo ve» tiene su propia medicion escrita a mano en dos sitios. No se deriva porque derivarla obligaria a `npm run cifra` a recorrer los dos repos en cada corrida; lo que se hace en cambio es que los dos sitios lleven FECHA y apunten al crudo.',
  medicion: '_bitacoras/cifra_8de15_2026-08-21/10_conteo_copias_a_mano.txt',
};

if (f.estado !== antesEstado) throw new Error('el estado cambio y no debia');
if (f.texto_literal !== null || f.sin_texto !== true) throw new Error('el texto de la fila cambio y no debia');

fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });

console.log('FILA REMEDIDA — ' + ID);
console.log('  estado ............ ' + f.estado + '  (sin cambio)');
console.log('  texto_literal ..... null  ·  sin_texto true  (sin cambio)');
console.log('  campo agregado .... ' + CAMPO);
console.log('  "5 de 15" ......... 37 apariciones en 18 ficheros');
console.log('  "4 de 15" ......... 45 apariciones en 20 ficheros');
console.log('  en la PWA ......... 0');
console.log('');
console.log('filas totales: ' + arr.length + '  (sin cambio: esta pieza no abre ni cierra ninguna)');
