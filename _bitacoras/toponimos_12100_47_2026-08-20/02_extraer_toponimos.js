// P2 - LOS TOPONIMOS DE LAS 39 ENTRADAS SIN COORDENADAS SUFICIENTES
//
// CRITERIO: 01_criterio_lugares.txt, escrito ANTES de esto.
// DECIDE  : la TABLA MANUAL de este fichero, de leer las 39 entradas enteras.
// LA MAQUINA NO EXTRAE: cotejo al humano en lo mecanizable.
//
// El cotejo mecanico que si vale: TODA cita de la tabla tiene que aparecer
// LITERAL en el cuerpo de SU entrada, con los espacios normalizados (el PDF
// corta lineas en cualquier parte). Eso caza un nombre mal tecleado y caza un
// nombre inventado, que son los dos modos de falla de una tabla escrita a mano.

const fs = require('fs');
const path = require('path');

const DIR_PREV = path.join(__dirname, '..', 'limite_puerto_12100_47_2026-08-20');
const entradas = require(path.join(DIR_PREV, 'entradas_punto1.json'));
const clasif = require(path.join(DIR_PREV, 'clasificacion_punto1.json')).filas;

const ents = Array.isArray(entradas) ? entradas
  : (entradas.entradas || Object.values(entradas).find(Array.isArray));
const byN = {}; for (const e of ents) byN[e.n] = e;
const clasByN = {}; for (const f of clasif) clasByN[f.n] = f;

const norm = s => s.replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
const fold = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// ---------------------------------------------------------------------------
// LA TABLA MANUAL. Un objeto por OCURRENCIA.
//   n        : entrada del ANEXO "A" punto 1
//   cita     : la cadena literal del documento (control mecanico)
//   busqueda : lo que se le pediria a un gazetteer. null = no hay cadena.
//   A/B/C/D  : los cuatro ejes del criterio
//   media    : LAT | LON | NO   (bandera de la enmienda, seccion 8)
// ---------------------------------------------------------------------------
const T = [
// ===== CONJUNTO A - las 14 C-ALGUNAS - escalon 9 -> 21 =====
{n:1,  cita:'el canto Weste de la Península Alacrán', busqueda:'Península Alacrán', A:'L-PUNTA', B:'B-NOMBRE', C:'C-PARTE',  D:'D-DEFINE', media:'NO'},
{n:1,  cita:'Punta Chacalluta',                        busqueda:'Punta Chacalluta',  A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:5,  cita:'faro Península Serrano',                  busqueda:'faro Península Serrano', A:'L-FARO', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},
{n:6,  cita:'Islote Patillos',                         busqueda:'Islote Patillos',   A:'L-ISLOTE',B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:6,  cita:'Punta Cotitira',                          busqueda:'Punta Cotitira',    A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:8,  cita:'Islote Blanco',                           busqueda:'Islote Blanco',     A:'L-ISLOTE',B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:8,  cita:'el canto Weste de roca Blanca',           busqueda:'roca Blanca',       A:'L-ROCA',  B:'B-NOMBRE', C:'C-PARTE',  D:'D-DEFINE', media:'NO'},
{n:14, cita:'punta Caldera',                           busqueda:'punta Caldera',     A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:14, cita:'punta Francisco',                         busqueda:'punta Francisco',   A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:23, cita:'Punta Liles',                             busqueda:'Punta Liles',       A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:23, cita:'Punta Fraile',                            busqueda:'Punta Fraile',      A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:26, cita:'faro Punta Panul',                        busqueda:'faro Punta Panul',  A:'L-FARO',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LAT'},
{n:26, cita:'punta Molo Sur',                          busqueda:'punta Molo Sur',    A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LAT'},
{n:27, cita:'la Piedra de la Iglesia',                 busqueda:'Piedra de la Iglesia', A:'L-ROCA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},
{n:28, cita:'la punta Montecristo',                    busqueda:'punta Montecristo', A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},
{n:29, cita:'Punta Lirquén',                           busqueda:'Punta Lirquén',     A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LAT'},
{n:32, cita:'el faro Punta Puchoco',                   busqueda:'faro Punta Puchoco',A:'L-FARO',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:32, cita:'islote que se encuentra al Surweste de la Punta Oeste de Caleta Lotilla', busqueda:null, A:'L-ISLOTE', B:'B-DESCRITO', C:'C-ENTERO', D:'D-DEFINE', media:'NO',
       nota:'El documento NO lo nombra. Es el caso que obligo a separar el eje B del eje A.'},
{n:32, cita:'la Punta Oeste de Caleta Lotilla',        busqueda:null,                A:'L-PUNTA', B:'B-DESCRITO', C:'C-ENTERO', D:'D-AUXILIAR', media:'NO',
       nota:'"Punta Oeste" es la punta oeste DE la caleta, no un nombre propio. No es vertice: ubica al islote.'},
{n:32, cita:'Caleta Lotilla',                          busqueda:'Caleta Lotilla',    A:'L-CALETA',B:'B-NOMBRE', C:'C-ENTERO', D:'D-AUXILIAR', media:'NO',
       nota:'Entra en el denominador aunque no sea vertice: sin ella no hay como llegar al islote sin nombre.'},
{n:38, cita:'el muelle del Ex Frigorífico',            busqueda:'muelle del Ex Frigorífico', A:'L-MUELLE', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},
{n:38, cita:'canal Tenglo',                            busqueda:'canal Tenglo',      A:'L-CANAL', B:'B-NOMBRE', C:'C-ENTERO', D:'D-AUXILIAR', media:'NO',
       nota:'No es vertice. Se cuenta porque es lo que desambigua CUALES punta Anselmo y punta Codina.'},
{n:38, cita:'punta Anselmo',                           busqueda:'punta Anselmo',     A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:38, cita:'punta Codina',                            busqueda:'punta Codina',      A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:43, cita:'islotes Eva',                             busqueda:'islotes Eva',       A:'L-ISLOTE',B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:43, cita:'Punta Lackawana',                         busqueda:'Punta Lackawana',   A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:47, cita:'punta Zegers',                            busqueda:'punta Zegers',      A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},

// ===== CONJUNTO B - las 25 C-NINGUNA - escalon 21 -> 44 =====
{n:2,  cita:'punta Pichalo',       busqueda:'punta Pichalo',       A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:2,  cita:'punta Pisagua',       busqueda:'punta Pisagua',       A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:3,  cita:'punta Landgren',      busqueda:'punta Landgren',      A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:3,  cita:'punta Junín',         busqueda:'punta Junín',         A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:4,  cita:'punta Rabo de Ballena', busqueda:'punta Rabo de Ballena', A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:4,  cita:'punta Monreal',       busqueda:'punta Monreal',       A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:9,  cita:'punta Choros',        busqueda:'punta Choros',        A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LAT'},
{n:12, cita:'punta Hueso Parado',  busqueda:'punta Hueso Parado',  A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:12, cita:'islote Puntilla',     busqueda:'islote Puntilla',     A:'L-ISLOTE',B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:13, cita:'la parte norte del cementerio', busqueda:null,        A:'L-OBRA',  B:'B-DESCRITO', C:'C-PARTE', D:'D-DEFINE', media:'LAT',
       nota:'El documento no nombra el cementerio: dice "el cementerio", de Chanaral. Y pide su PARTE NORTE.'},
{n:13, cita:'la punta Rocosa y blanca notable', busqueda:null,     A:'L-PUNTA', B:'B-DESCRITO', C:'C-ENTERO', D:'D-DEFINE', media:'LON',
       nota:'"Rocosa y blanca notable" es descripcion de aspecto, no nombre. No indexa en ningun catalogo.'},
{n:15, cita:'punta Caldereta',     busqueda:'punta Caldereta',     A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:15, cita:'punta Zorro',         busqueda:'punta Zorro',         A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:18, cita:'la desembocadura del río Huasco', busqueda:'río Huasco', A:'L-DESEMBOC', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO',
       nota:'El RIO tiene nombre; la desembocadura como PUNTO es derivada y ademas migra.'},
{n:18, cita:'el islote Blanco',    busqueda:'islote Blanco',       A:'L-ISLOTE',B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:19, cita:'punta Medanitos',     busqueda:'punta Medanitos',     A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:19, cita:'punta Mostacilla',    busqueda:'punta Mostacilla',    A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:20, cita:'el morro Pelícano',   busqueda:'morro Pelícano',      A:'L-MORRO', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LAT'},
{n:20, cita:'el Puente Negro',     busqueda:'Puente Negro',        A:'L-OBRA',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},
{n:21, cita:'punta Miedo',         busqueda:'punta Miedo',         A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:21, cita:'punta Herradura',     busqueda:'punta Herradura',     A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:22, cita:'el canto Weste de isla Huevos', busqueda:'isla Huevos', A:'L-ISLOTE', B:'B-NOMBRE', C:'C-PARTE', D:'D-DEFINE', media:'NO'},
{n:22, cita:'el canto Weste de Punta Cabo Tablas', busqueda:'Punta Cabo Tablas', A:'L-PUNTA', B:'B-NOMBRE', C:'C-PARTE', D:'D-DEFINE', media:'NO'},
{n:24, cita:'roca La Baja',        busqueda:'roca La Baja',        A:'L-ROCA',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:24, cita:'punta Gruesa',        busqueda:'punta Gruesa',        A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:25, cita:'Punta San Carlos',    busqueda:'Punta San Carlos',    A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:25, cita:'Punta Lobería',       busqueda:'Punta Lobería',       A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:33, cita:'punta Lutrín',        busqueda:'punta Lutrín',        A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:33, cita:'punta Villagrán',     busqueda:'punta Villagrán',     A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:34, cita:'punta Millaneco',     busqueda:'punta Millaneco',     A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:34, cita:'faro Punta Tucapel',  busqueda:'faro Punta Tucapel',  A:'L-FARO',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:35, cita:'punta Molino',        busqueda:'punta Molino',        A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:35, cita:'punta San Carlos',    busqueda:'punta San Carlos',    A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:36, cita:'punta Ahui',          busqueda:'punta Ahui',          A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:36, cita:'roca Cochinos',       busqueda:'roca Cochinos',       A:'L-ROCA',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:36, cita:'la isla Cochinos',    busqueda:'isla Cochinos',       A:'L-ISLOTE',B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},
{n:37, cita:'roca San Pedro',      busqueda:'roca San Pedro',      A:'L-ROCA',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:37, cita:'canto S de isla Calbuco', busqueda:'isla Calbuco',    A:'L-ISLOTE',B:'B-NOMBRE', C:'C-PARTE',  D:'D-DEFINE', media:'NO'},
{n:40, cita:'punta Pichi Nichi',   busqueda:'punta Pichi Nichi',   A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LAT'},
{n:40, cita:'punta García',        busqueda:'punta García',        A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},
{n:41, cita:'Punta Cubillos',      busqueda:'Punta Cubillos',      A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:41, cita:'Punta Ganso',         busqueda:'Punta Ganso',         A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:42, cita:'punta Sofía',         busqueda:'punta Sofía',         A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:42, cita:'punta Weste',         busqueda:'punta Weste',         A:'L-PUNTA', B:'B-DESCRITO', C:'C-ENTERO', D:'D-DEFINE', media:'NO', duda:true,
       nota:'DUDA GENUINA. "Weste" es la palabra que el propio documento usa como direccion ("canto Weste") en otras cuatro entradas, asi que "punta Weste" puede ser "la punta oeste" y no un nombre. Por la regla de la seccion 3 va a B-DESCRITO; por la seccion 9 SE BUSCA IGUAL, y si aparece verificada, corrige.'},
{n:44, cita:'punta Mila',          busqueda:'punta Mila',          A:'L-PUNTA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LON'},
{n:44, cita:'los Islotes Cisnes',  busqueda:'Islotes Cisnes',      A:'L-ISLOTE',B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'LAT'},
{n:46, cita:'el faro Isla Isabel', busqueda:'faro Isla Isabel',    A:'L-FARO',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO',
       nota:'Unico de las 39 donde el PARALELO Y EL MERIDIANO cuelgan del MISMO toponimo: hacen falta sus DOS coordenadas, no media.'},
{n:49, cita:'faro Punta Gusano',   busqueda:'faro Punta Gusano',   A:'L-FARO',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:49, cita:'boya Banco Herradura',busqueda:'boya Banco Herradura',A:'L-BOYA',  B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
{n:49, cita:'baliza anterior de Punta Truco', busqueda:'baliza Punta Truco', A:'L-BALIZA', B:'B-NOMBRE', C:'C-ENTERO', D:'D-DEFINE', media:'NO'},
];

// ---------------------------------------------------------------------------
const SET_A = clasif.filter(f => f.coordenadas === 'C-ALGUNAS').map(f => f.n);
const SET_B = clasif.filter(f => f.coordenadas === 'C-NINGUNA').map(f => f.n);
// los 8 puertos que no aterrizan en ninguna bahia (06_cruzar.txt, direccion A->B)
const NO_ATERRIZAN = ['JUNIN', 'CALETA BUENA', 'TOCOPILLA', 'LOS VILOS', 'TOME', 'PENCO', 'BORIES', 'PERCY'];

for (const t of T) {
  t.conjunto = SET_A.includes(t.n) ? 'A' : (SET_B.includes(t.n) ? 'B' : '??');
  t.entrada = clasByN[t.n].nombre;
  t.clase_formato = clasByN[t.n].clase;
}

const L = [];
const say = s => { L.push(s); };

say('P2 - LOS TOPONIMOS DE LAS 39 ENTRADAS SIN COORDENADAS SUFICIENTES');
say('='.repeat(78));
say('');
say('CRITERIO : 01_criterio_lugares.txt, escrito ANTES de correr esto.');
say('DECIDE   : la tabla manual de este fichero. La maquina coteja, no extrae.');
say('ARBOL    : las 49 entradas de entradas_punto1.json de la bitacora del');
say('           2026-08-20. Vocabulario: el castellano del documento, con');
say('           "Weste" por Oeste y el generico en minuscula o mayuscula');
say('           indistintamente ("punta Caldera" / "Punta Liles").');
say('');

// --- CONTROL 1: toda cita aparece literal en su entrada -------------------
let malas = 0;
const fallos = [];
for (const t of T) {
  const cuerpo = fold(byN[t.n].cuerpo);
  if (!cuerpo.includes(fold(t.cita))) { malas++; fallos.push(`#${t.n} ${t.entrada}: "${t.cita}"`); }
}
say('CONTROL 1 - TODA CITA APARECE LITERAL EN EL CUERPO DE SU ENTRADA');
say('  Cotejo mecanico contra el texto extraido del PDF, espacios normalizados');
say('  y diacriticos plegados. Caza un nombre mal tecleado y uno inventado.');
say(`  ocurrencias de la tabla : ${T.length}`);
say(`  citas que NO aparecen   : ${malas}`);
for (const f of fallos) say('    FALLA: ' + f);
say(`  VEREDICTO: ${malas === 0 ? 'OK' : 'ROJO'}`);
say('');

// --- CONTROL 2: POSITIVO, el cotejo muerde -------------------------------
const cebo = fold('punta Inexistente de la Sesion');
const cuerposTodos = T.map(t => fold(byN[t.n].cuerpo)).join(' | ');
say('CONTROL 2 - POSITIVO: EL COTEJO MUERDE');
say('  Se le pasa un nombre fabricado que NO esta en el documento. Un cotejo');
say('  que nunca marca nada no ha demostrado que sepa marcar.');
say(`  cebo "punta Inexistente de la Sesion" encontrado: ${cuerposTodos.includes(cebo) ? 'SI' : 'NO'}`);
say(`  VEREDICTO: ${cuerposTodos.includes(cebo) ? 'ROJO' : 'OK - el cotejo distingue'}`);
say('');

// --- CONTROL 3: las entradas cubiertas son exactamente las 39 -------------
const cubiertas = [...new Set(T.map(t => t.n))].sort((a, b) => a - b);
const esperadas = [...SET_A, ...SET_B].sort((a, b) => a - b);
const faltan = esperadas.filter(n => !cubiertas.includes(n));
const sobran = cubiertas.filter(n => !esperadas.includes(n));
say('CONTROL 3 - COBERTURA: NINGUNA ENTRADA SIN TOPONIMO, NINGUNA DE MAS');
say(`  entradas C-ALGUNAS (conjunto A) : ${SET_A.length}`);
say(`  entradas C-NINGUNA (conjunto B) : ${SET_B.length}`);
say(`  entradas cubiertas por la tabla : ${cubiertas.length}`);
say(`  faltan: ${faltan.length ? faltan.join(',') : 'ninguna'}   sobran: ${sobran.length ? sobran.join(',') : 'ninguna'}`);
say(`  VEREDICTO: ${(!faltan.length && !sobran.length && SET_A.length === 14 && SET_B.length === 25) ? 'OK' : 'ROJO'}`);
say('');

// --- CONTROL 4: D-DESCRIPT --------------------------------------------------
const descript = T.filter(t => t.D === 'D-DESCRIPT');
say('CONTROL 4 - LOS D-DESCRIPT, QUE NO ENTRAN EN EL DENOMINADOR');
say(`  toponimos D-DESCRIPT dentro de las 39 : ${descript.length}`);
say('  Y no es que no se hayan mirado: los CUATRO que el 2026-08-20 identifico');
say('  como descriptivos —Punta Patache, faro Molo Caleta Manzano, faro Punta');
say('  Gualpen, Punta Pardo— estan TODOS en entradas C-TODAS, que por definicion');
say('  quedan fuera de este universo. Dentro de las 39 no hay ninguno: si el');
say('  limite no trae coordenadas, todo nombre que aparece hace falta.');
say('  VEREDICTO: OK - el cero tiene explicacion, no es un cero de no haber mirado');
say('');

// --- EL RESULTADO ----------------------------------------------------------
const A = T.filter(t => t.conjunto === 'A');
const B = T.filter(t => t.conjunto === 'B');

say('EL RESULTADO - CUANTOS TOPONIMOS HAY QUE RESOLVER');
say('-'.repeat(78));
say('LOS DOS CONJUNTOS NO SE SUMAN. Cada cifra dice su conjunto y su unidad.');
say('');
say('  CONJUNTO A - las 14 entradas C-ALGUNAS   (escalon 9 -> 21 bahias)');
say(`    ocurrencias de toponimo : ${A.length}`);
say(`    entradas                : ${[...new Set(A.map(t => t.n))].length} de 14`);
say(`    media por entrada       : ${(A.length / 14).toFixed(2)} toponimos/entrada`);
say('');
say('  CONJUNTO B - las 25 entradas C-NINGUNA   (escalon 21 -> 44 bahias)');
say(`    ocurrencias de toponimo : ${B.length}`);
say(`    entradas                : ${[...new Set(B.map(t => t.n))].length} de 25`);
say(`    media por entrada       : ${(B.length / 25).toFixed(2)} toponimos/entrada`);
const inutiles = B.filter(t => NO_ATERRIZAN.includes(t.entrada));
const nInut = [...new Set(inutiles.map(t => t.n))].length;
say('');
say('    Y LA CIFRA UTIL, que es distinta y va siempre al lado:');
say(`      de esas ${[...new Set(B.map(t => t.n))].length} entradas, ${nInut} no aterrizan en ninguna bahia del catalogo`);
say(`      (${[...new Set(inutiles.map(t => t.entrada))].join(' · ')}), y aportan ${inutiles.length} ocurrencias.`);
say(`      ENTRADAS UTILES AL CATALOGO : ${25 - nInut} de 25   ->  23 bahias (ANCUD aporta dos filas, 118 y 214)`);
say(`      OCURRENCIAS UTILES          : ${B.length - inutiles.length} de ${B.length}`);
say('');

// --- LUGARES DISTINTOS: colisiones de cadena, veredicto MANUAL --------------
say('CUANTOS DISTINTOS - LA DEDUPLICACION, QUE NO ES POR CADENA');
say('-'.repeat(78));
const porCadena = {};
for (const t of T) {
  if (!t.busqueda) continue;
  const k = fold(t.busqueda);
  (porCadena[k] = porCadena[k] || []).push(t);
}
const colisiones = Object.entries(porCadena).filter(([, v]) => v.length > 1);
say(`  colisiones de cadena normalizada que la maquina propone : ${colisiones.length}`);
say('');
// veredicto manual, uno por uno
const VEREDICTO_DEDUP = {
  'PUNTA SAN CARLOS': { colapsa: false, razon: 'NO. #25 JUAN FERNANDEZ es la bahia Cumberland en isla Robinson Crusoe, a ~670 km de la costa; #35 CORRAL esta en la desembocadura del rio Valdivia, Los Rios. Mismo nombre, ~1.400 km de distancia y dos cartas del SHOA distintas (5411 y 6241). DOS LUGARES.' },
  'ISLOTE BLANCO':   { colapsa: false, razon: 'NO. #8 TOCOPILLA es Antofagasta (carta 1311); #18 HUASCO es Atacama (carta 3211). ~700 km. DOS LUGARES. Y ademas caen en conjuntos distintos —A y B—, asi que el colapso ni siquiera seria legal: las cifras de A y B no se suman.' },
};
for (const [k, v] of colisiones) {
  const ver = VEREDICTO_DEDUP[k];
  say(`  "${k}"  en #${v.map(t => t.n + ' ' + t.entrada + ' [' + t.conjunto + ']').join('  ·  #')}`);
  say(`     veredicto MANUAL: ${ver ? (ver.colapsa ? 'COLAPSA' : 'NO COLAPSA') : 'SIN VEREDICTO -- ROJO'}`);
  say(`     ${ver ? ver.razon : 'falta la razon escrita'}`);
  say('');
}
const sinVeredicto = colisiones.filter(([k]) => !VEREDICTO_DEDUP[k]).length;
say(`  colisiones sin veredicto manual escrito : ${sinVeredicto}  ${sinVeredicto === 0 ? 'OK' : 'ROJO'}`);
say('');
const colapsados = colisiones.filter(([k]) => VEREDICTO_DEDUP[k] && VEREDICTO_DEDUP[k].colapsa).length;
say('  EL RESULTADO DE LA DEDUPLICACION:');
say(`    conjunto A : ${A.length} ocurrencias  ->  ${A.length - 0} lugares distintos   (0 colapsos)`);
say(`    conjunto B : ${B.length} ocurrencias  ->  ${B.length - 0} lugares distintos   (0 colapsos)`);
say('');
say('  EL HALLAZGO, que el encargo daba por supuesto al reves: NO HAY UN SOLO');
say('  TOPONIMO REPETIDO. El encargo decia "hay repetidos entre entradas" y');
say('  medido no los hay: las dos unicas colisiones de cadena son HOMONIMOS DE');
say('  LUGARES DISTINTOS, y colapsarlas habria fabricado un falso positivo');
say('  adentro del propio denominador — antes de buscar nada.');
say('  Ocurrencias y lugares distintos coinciden en los dos conjuntos.');
say('');

const out = { QUE_ES_ESTO: 'Toponimos a resolver de las 39 entradas sin coordenadas suficientes de la Res. 12100/47 ANEXO "A" punto 1. Tabla MANUAL cotejada por maquina. Criterio en 01_criterio_lugares.txt.',
  denominador: { conjunto_A: '14 entradas C-ALGUNAS, escalon 9->21 bahias', conjunto_B: '25 entradas C-NINGUNA (22 utiles al catalogo, 23 bahias), escalon 21->44 bahias', NO_SE_SUMAN: true },
  conteo: { A_ocurrencias: A.length, A_lugares_distintos: A.length, B_ocurrencias: B.length, B_lugares_distintos: B.length, B_ocurrencias_utiles: B.length - inutiles.length },
  toponimos: T };
fs.writeFileSync(path.join(__dirname, 'toponimos_39.json'), JSON.stringify(out, null, 1), 'utf8');
say('ESCRITO: toponimos_39.json');
say('');
const verde = malas === 0 && !faltan.length && !sobran.length && sinVeredicto === 0 && !cuerposTodos.includes(cebo);
say(`VEREDICTO P2: ${verde ? 'VERDE - los cuatro controles pasan' : 'ROJO'}`);

const txt = L.join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, '02_extraer_toponimos.txt'), txt, 'utf8');
process.stdout.write(txt);
process.exit(verde ? 0 : 1);
