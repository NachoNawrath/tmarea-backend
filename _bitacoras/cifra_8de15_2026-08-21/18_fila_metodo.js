'use strict';
// LA FILA QUE SOSTIENE §4.10 DE CLAUDE.md.
//
// El texto canonico de la regla vive en CLAUDE.md; esta fila es donde vive su
// MEDICION, igual que METODO::una-guarda-de-texto-... sostiene a §4.9. Si las dos
// dejan de decir lo mismo, manda la fila.
//
// POR QUE ES FILA Y NO SUBCAMPO: precedente del 2026-08-20, cuando el owner pidio
// en la PARADA 2 que la regla del emparejador fuera fila propia. Una regla de
// METODO que vive dentro de otra fila no se encuentra buscando la regla.

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
const arr = Array.isArray(d) ? d : (d.filas || Object.values(d).find(Array.isArray));

const ID = 'METODO::con-el-negativo-en-rojo-el-numerador-vale-cero';
if (arr.some(x => x.id === ID)) throw new Error('la fila ya existe: esta pieza no se corre dos veces');

const antes = arr.length;

arr.push({
  id: ID,
  token_local: null,
  espacio_de_nombres: 'Metodo — suites de mordida y cualquier control cuya asercion sea «esto tiene que fallar»',
  sitio: 'SESION-cifra-8de15-2026-08-21',
  repo: 'tmarea-backend',
  texto_literal: null,
  sin_texto: true,
  donde: {
    fichero: '_bitacoras/cifra_8de15_2026-08-21/05_mordida_vieja_dato_nuevo.txt',
    seccion_por_titulo: 'CONTROL NEGATIVO — la copia SIN mutar tiene que publicar en verde',
    cita_de_anclaje: 'la linea que dice "FALLA copia intacta -> exit 1  (el guard muerde lo que no debe)" debajo de once lineas que dicen ok',
  },
  abierta_el: null,
  abierta_el_lo_dice_el_documento: false,
  nota_fecha: 'El documento no la fecha porque no estaba escrita en ninguna parte. Nace de la medicion del 2026-08-21 y el owner pidio ese mismo dia que quedara como REGLA y no como nota, y que valiera para toda mordida del arbol.',
  grupo: '1_cierra_con_lo_que_hay',
  estado: 'viva',
  firma_owner: { firmada: true, fecha: '2026-08-21' },
  redactada_no_aplicada: false,
  duplicada_de: null,
  titulo: 'Un «n/n» con el control negativo en ROJO no es un 100 %: es una medicion que no se hizo — si el dato base ya es invalido, TODAS las mordidas pasan al vacio y el numero sube al maximo justo cuando la medicion vale cero',
  evidencia_en_el_arbol: {
    medido_el: '2026-08-21',
    lo_que_se_midio: 'Se corrio prueba_mordida_cifra.js con el dato ya movido a 8 de 15 y el emisor todavia sin corregir. LAS ONCE MORDIDAS DIJERON ok. Ninguna probo lo que dice probar: el emisor se detenia por el dato base, asi que mutarlo no cambiaba el resultado. El instrumento imprimio 12/13 y la unica linea roja fue el control negativo.',
    por_que_pasa: 'Una mordida afirma «con el dato mutado, el instrumento tiene que detenerse». Si el instrumento YA se detiene con el dato sin mutar, se detiene con cualquier mutacion. La asercion se cumple por una causa ajena al merito de cada caso.',
    lo_que_NO_es: 'NO es un defecto de una mordida en particular ni se arregla mordida por mordida. Es una propiedad de la SUITE, y por eso la regla no vive en prueba_mordida_cifra.js sino en CLAUDE.md §4.10.',
    donde_vive_el_texto_canonico: 'CLAUDE.md §4.10, aplicado el 2026-08-21. Cierra la familia que abren §4.6 —un control tiene que poder fallar— y §4.9 —uno que puede fallar todavia puede comprobar otra cosa—. Si el texto y esta fila dejan de decir lo mismo, manda la fila.',
  },
  costo_estimado: 'La REGLA ya esta aplicada y no cuesta nada: es una lectura, no un instrumento. Lo que queda abierto y por eso la fila esta VIVA es el BARRIDO: ninguna de las otras suites de mordida del arbol —drift, ancla, deudas, y las que vengan— se reviso bajo este criterio, y ninguna imprime su total de forma que distinga «n/n con negativo verde» de «n/n con negativo rojo». Chico por suite, y son cuatro.',
  depende_de: 'Nada abierto.',
  lo_que_esta_fila_NO_pide: 'No pide cambiar el formato de salida de las cuatro suites. Un instrumento que se autocalifique tambien puede mentir; lo que la regla exige es una LECTURA, y quien no la haga no se salva con un rotulo. Si al barrer aparece que el rotulo ayuda, esa es una decision aparte y con su medicion.',
});

if (arr.length !== antes + 1) throw new Error('la fila no entro');
fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });

console.log('FILA NUEVA — ' + ID);
console.log('  estado ......... viva  ·  firmada por el owner el 2026-08-21');
console.log('  texto canonico . CLAUDE.md §4.10');
console.log('  medicion ....... _bitacoras/cifra_8de15_2026-08-21/05_mordida_vieja_dato_nuevo.txt');
console.log('');
console.log(`filas: ${antes} -> ${arr.length}`);
