'use strict';
// CORRIGE EL CONTENIDO DE LA FILA, NO SOLO SU ID.
//
// POR QUE HACE FALTA Y LO DESTAPO EL RENOMBRE: al renombrar el id quedo a la
// vista que la fila conserva en su `titulo` y en su `costo_estimado` las MISMAS
// afirmaciones que CLAUDE.md 4.10 acaba de corregir por describir un caso
// imposible. Y eso no es un resto cosmetico: la regla declara que «si el texto y
// la fila dejan de decir lo mismo, MANDA LA FILA». O sea que dejarla asi haria
// que la fila ANULARA la correccion del texto que ella misma sostiene.
//
// LO QUE ERA FALSO, medido el 2026-08-21 sobre los cuatro instrumentos:
//   · titulo ......... afirmaba «un n/n con el negativo en ROJO» y «el numero
//                      sube al maximo». Los cuatro acoplan el negativo a su
//                      total, asi que ese estado no puede ocurrir.
//   · costo_estimado . afirmaba que «ninguna imprime su total de forma que
//                      distinga n/n con negativo verde de n/n con negativo
//                      rojo». Es al reves: LAS CUATRO lo distinguen.
//
// LO QUE NO SE TOCA: `evidencia_en_el_arbol.lo_que_se_midio`, que ya decia «el
// instrumento imprimio 12/13 y la unica linea roja fue el control negativo» — o
// sea que la EVIDENCIA estuvo bien desde el primer momento y lo que estaba mal
// era el titular que se le colgo encima. Se deja intacta a proposito: es la
// prueba de que el dato no fallo, fallo la lectura.

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
const arr = Array.isArray(d) ? d : (d.filas || Object.values(d).find(Array.isArray));

const ID = 'METODO::con-el-negativo-en-rojo-el-numerador-vale-cero';
const f = arr.find(x => x.id === ID);
if (!f) throw new Error('no se encontro la fila ' + ID);

const antes = { titulo: f.titulo, costo: f.costo_estimado };

f.titulo = 'Con el control negativo en ROJO, el numerador no vale n-1: vale CERO. Si el dato base ya es invalido, TODAS las mordidas pasan al vacio — se cumplen por una causa ajena al merito de cada caso — y el total corto se lee como una falla aislada cuando es la anulacion de todas las demas';

f.costo_estimado = 'La REGLA ya esta aplicada y no cuesta nada: es una LECTURA, no un instrumento. Lo que queda abierto, y por eso la fila esta VIVA, es el BARRIDO: ninguna de las otras suites de mordida del arbol se reviso bajo este criterio. Y NO ES LO QUE ESTA FILA DECIA ANTES: afirmaba que ninguna de las cuatro suites acoplaba su control negativo al total, y lo medido es AL REVES — las cuatro lo acoplan. drift imprime su linea de exito solo si fallas === 0; ancla afirma en la suya que el control negativo no mordio y que las N familias mordieron; deudas y cifra lo cuentan DENTRO del denominador. De ahi que el sintoma sea siempre un total CORTO en uno, y que el barrido pendiente no sea de formato sino de LECTURA: revisar que ningun total corto de este repo se haya leido como un casi.';

f.la_correccion_de_esta_fila = 'CORREGIDA EL 2026-08-21, EL MISMO DIA EN QUE SE ESCRIBIO Y ANTES DE COMMITEAR. Su titulo y su costo_estimado nacieron con la afirmacion equivocada: que la suite podia dar «n/n» con el control negativo en rojo. Salio de un reporte mal medido y el owner la elevo a regla sin verificarla; la destapo una pregunta suya que iba para otro lado —«¿que pasa con los cuatro instrumentos que no la cumplen?»—, y al ir a medirlos resulto que ninguno la incumple. El id tambien se renombro: era METODO::un-n-sobre-n-con-el-negativo-en-rojo-no-es-una-medicion. LA EVIDENCIA NO SE TOCO Y ESO ES EL PUNTO: `evidencia_en_el_arbol` decia desde el primer minuto «el instrumento imprimio 12/13 y la unica linea roja fue el control negativo». El dato estuvo bien siempre; lo que fallo fue el titular que se le colgo encima, y nadie lo contrasto contra su propia evidencia hasta que una pregunta lateral obligo a medir.';

if (f.titulo === antes.titulo) throw new Error('el titulo no cambio');
if (f.costo_estimado === antes.costo) throw new Error('el costo_estimado no cambio');

// NINGUN CAMPO PUEDE SEGUIR AFIRMANDO LA FORMA CORREGIDA.
//
// ESTA GUARDA ES DE PROHIBICION Y ESTA ANCLADA EN LA ORTOGRAFIA, que es lo que
// §4.9 desaconseja — y se deja asi A PROPOSITO, con su limite dicho. Mordio en su
// primera corrida contra MI PROPIO texto nuevo, que CITABA la afirmacion vieja
// para negarla: no distingue citar de afirmar, igual que la guarda de
// /DEROGACION/i que este mismo repositorio corrigio el 2026-08-21.
//
// POR QUE NO SE ANCLA MEJOR: aca la «cosa prohibida» es una afirmacion, no una
// cadena, y ningun patron la reconoce. Lo que se hizo en cambio es lo unico
// honesto disponible: reescribir la cita para que DESCRIBA en vez de REPRODUCIR,
// que es la misma salida que se le dio al pie del emisor. La guarda queda como
// red gruesa —caza de mas y nunca de menos— y quien la haga saltar tiene que
// mirar si lo suyo afirma o cita.
const sospechosos = [];
for (const [k, v] of Object.entries(f)) {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (/sube al maximo/i.test(s)) sospechosos.push(k + ' (dice "sube al maximo")');
  if (/n\/n con negativo/i.test(s)) sospechosos.push(k + ' (dice "n/n con negativo")');
}
if (sospechosos.length) {
  console.error('QUEDAN CAMPOS CON LA AFIRMACION VIEJA:');
  sospechosos.forEach(x => console.error('  !! ' + x));
  process.exit(1);
}

fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });

console.log('CONTENIDO DE LA FILA CORREGIDO — ' + ID);
console.log('  titulo ................. reescrito');
console.log('  costo_estimado ......... reescrito, y ahora dice lo MEDIDO (las cuatro acoplan)');
console.log('  la_correccion_de_esta_fila  campo nuevo, con la procedencia del error');
console.log('  evidencia_en_el_arbol .. INTACTA a proposito: el dato nunca estuvo mal');
console.log('');
console.log('  ningun campo de la fila afirma ya la forma corregida — verificado campo por campo');
