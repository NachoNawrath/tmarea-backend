'use strict';
// REGISTRA EL SITIO DE ESTA SESION EN cobertura.sitios.
//
// POR QUE HACE FALTA, y lo destapo el validador y no yo: [V2] rechazo la fila
// nueva porque su `sitio` no estaba declarado — «Entro de contrabando». El
// control es correcto y no se afloja (CLAUDE.md §0.3): una fila cuyo sitio nadie
// declaro es una deuda que no pertenece a ningun barrido, o sea una deuda que
// nadie se comprometio a mirar.
//
// SITIO PROPIO Y NO ALOJADA EN UNO EXISTENTE, por el precedente medido de
// SESION-u2-capa-b-2026-08-21: alojar una fila en un sitio que declara por
// escrito no barrer ese asunto vuelve falso un campo que ningun control mira.
// Ademas, este sitio barre algo que ninguno de los 26 anteriores podia barrer:
// una regla sobre TODAS las suites de mordida del arbol.

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
const sitios = d.cobertura.sitios;

const ID = 'SESION-cifra-8de15-2026-08-21';
if (sitios.some(s => s.id === ID)) throw new Error('el sitio ya existe');

const antesSitios = sitios.length;
const antesBarridos = sitios.filter(s => s.barrido).length;
const ordenMax = Math.max(...sitios.map(s => s.orden || 0));

sitios.push({
  id: ID,
  repo: 'tmarea-backend',
  fichero: '_bitacoras/cifra_8de15_2026-08-21/',
  seccion_por_titulo: 'deudas que genera el movimiento de la cifra a 8 de 15 al 2026-08-21',
  vocabulario_del_barrido: [
    'la UNICA deuda que esta pieza abre y que no es de la cifra: que si el dato base de un instrumento ya es invalido, TODAS sus mordidas pasan al vacio y solo el control negativo lo ve. Se barre esa regla —aplicada en CLAUDE.md 4.10— y NO se barre su consecuencia: ninguna de las otras suites de mordida del arbol se reviso bajo ese criterio.',
  ],
  orden: ordenMax + 1,
  barrido: true,
  barrido_el: '2026-08-21',
  filas_en_este_declarativo: 1,
  nota: 'Segundo sitio de sesion creado el mismo dia, y el precedente es el de SESION-u2-capa-b-2026-08-21: una sesion es un sitio de deuda propio y se crea el dia de su barrido, por la pieza que inserta su unica fila. Crear el sitio mueve dos cifras mas de las previstas y se dice antes de escribirlo. LO QUE ESTA PIEZA NO BARRIO Y VA COMO LINEA EN SU BITACORA, no como fila: (L1) publicar_cifra_spec2.js normaliza una tilde que el dato no tiene, o sea un no-op que ademas tolera una forma_legal acentuada, que es lo que la convencion del fichero prohibe — el owner decidio el 2026-08-21 que queda como linea y NO se toca; (L2) el pie del emisor lleva numeros escritos a mano y va a envejecer, y no se deriva porque obligaria a `npm run cifra` a recorrer los dos repos en cada corrida; (L3) la guarda de una nota puede caducar en ROJO pero EXIGIENDO la mentira, que es el limite de la forma positiva y no lo arregla el reanclaje. LO QUE TAMPOCO BARRE, y es de otro frente: el barredor de copias a mano de la cifra sigue sin construirse — vive en D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia, que esta pieza REMIDIO y dejo viva.',
  bitacora: '_bitacoras/cifra_8de15_2026-08-21/',
});

fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });

const ahoraBarridos = sitios.filter(s => s.barrido).length;
console.log('SITIO REGISTRADO — ' + ID);
console.log(`  orden ...... ${ordenMax + 1}`);
console.log(`  sitios ..... ${antesSitios} -> ${sitios.length}`);
console.log(`  barridos ... ${antesBarridos} -> ${ahoraBarridos}`);
console.log(`  sin barrer . ${sitios.length - ahoraBarridos}`);
