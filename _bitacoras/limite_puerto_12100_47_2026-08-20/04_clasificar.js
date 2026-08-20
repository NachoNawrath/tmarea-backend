// P3 - Clasificacion de las 49 entradas por formato.
//
// EL CRITERIO ESTA EN 03_criterio_clases.txt Y SE ESCRIBIO ANTES QUE ESTO.
//
// ─── QUIEN DECIDE ───────────────────────────────────────────────────────────
// Decide la tabla de abajo, que es MIA y salio de leer las 49 entradas enteras.
// La maquina NO clasifica. La maquina hace de control: mide la parte que SI es
// mecanizable -- hay o no hay una coordenada numerica en el texto, hay o no hay
// una lista enumerada de vertices -- y la coteja contra lo que yo dije. Cada
// desacuerdo se imprime y se explica. Un desacuerdo sin explicar es rojo.
//
// Es al reves de lo habitual a proposito: no automatizo el juicio y despues lo
// reviso por encima; hago el juicio y despues dejo que la maquina me pesque.

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const datos = JSON.parse(fs.readFileSync(path.join(DIR, 'entradas_punto1.json'), 'utf8'));

// ── LA TABLA MANUAL ────────────────────────────────────────────────────────
// n  = numero de entrada de 02_extraer.txt
// e1 = P-VERT | P-LIN | P-PARMER | P-MIXTA
// e2 = C-TODAS | C-ALGUNAS | C-NINGUNA
// por = por que, cuando la entrada no es obvia. "" = obvia, no hace falta.
const MANUAL = [
  { n:  1, e1:'P-LIN',    e2:'C-ALGUNAS', por:'punto intermedio con numero; Peninsula Alacran y Punta Chacalluta sin el' },
  { n:  2, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n:  3, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n:  4, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n:  5, e1:'P-PARMER', e2:'C-ALGUNAS', por:'paralelo con numero; el meridiano cuelga del faro Peninsula Serrano' },
  { n:  6, e1:'P-LIN',    e2:'C-ALGUNAS', por:'' },
  { n:  7, e1:'P-PARMER', e2:'C-TODAS',   por:'meridiano Y paralelo los dos con numero. Punta Patache solo dice donde nace: los dos ejes ya cierran la linea contra la costa, asi que el toponimo es DESCRIPTIVO, no definitorio' },
  { n:  8, e1:'P-LIN',    e2:'C-ALGUNAS', por:'' },
  { n:  9, e1:'P-PARMER', e2:'C-NINGUNA', por:'un solo paralelo, colgado de punta Choros' },
  { n: 10, e1:'P-VERT',   e2:'C-TODAS',   por:'poligono de 5 vertices' },
  { n: 11, e1:'P-PARMER', e2:'C-TODAS',   por:'' },
  { n: 12, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 13, e1:'P-PARMER', e2:'C-NINGUNA', por:'los dos ejes colgados de toponimos, y uno es "la parte norte del cementerio"' },
  { n: 14, e1:'P-LIN',    e2:'C-ALGUNAS', por:'' },
  { n: 15, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 16, e1:'P-LIN',    e2:'C-TODAS',   por:'los TRES vertices traen coordenada. Es linea, no lista enumerada, por eso no es P-VERT' },
  { n: 17, e1:'P-LIN',    e2:'C-TODAS',   por:'los dos extremos traen coordenada' },
  { n: 18, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 19, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 20, e1:'P-PARMER', e2:'C-NINGUNA', por:'' },
  { n: 21, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 22, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 23, e1:'P-LIN',    e2:'C-ALGUNAS', por:'' },
  { n: 24, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 25, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 26, e1:'P-PARMER', e2:'C-ALGUNAS', por:'tres ejes: dos paralelos colgados de toponimos y un meridiano con numero' },
  { n: 27, e1:'P-PARMER', e2:'C-ALGUNAS', por:'' },
  { n: 28, e1:'P-PARMER', e2:'C-ALGUNAS', por:'' },
  { n: 29, e1:'P-PARMER', e2:'C-ALGUNAS', por:'meridiano con numero; el paralelo cuelga de Punta Lirquen' },
  { n: 30, e1:'P-MIXTA',  e2:'C-TODAS',   por:'linea por el paralelo 36 41 18 S hasta el punto en coordenadas, y DESPUES baja por ese meridiano: hacen falta las dos primitivas. El faro Molo Caleta Manzano es descriptivo, la latitud que lo acompana ya define el tramo' },
  { n: 31, e1:'P-PARMER', e2:'C-TODAS',   por:'meridiano 073 11 28,5 W y paralelo 36 43 17,5 S, los dos con numero; faro Punta Gualpen y Punta Pardo son descriptivos' },
  { n: 32, e1:'P-LIN',    e2:'C-ALGUNAS', por:'dos puntos intermedios con numero, pero los DOS extremos sin: el faro Punta Puchoco y un islote que el documento ni nombra -- "el islote que se encuentra al Surweste de la Punta Oeste de Caleta Lotilla"' },
  { n: 33, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 34, e1:'P-LIN',    e2:'C-NINGUNA', por:'el caso que el encargo cita: linea entre dos toponimos, cero coordenadas' },
  { n: 35, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 36, e1:'P-MIXTA',  e2:'C-NINGUNA', por:'linea entre punta Ahui y roca Cochinos MAS el meridiano de isla Cochinos. Ni F2 ni F3 ni F4: es la entrada que obligo a declarar F5' },
  { n: 37, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 38, e1:'P-MIXTA',  e2:'C-ALGUNAS', por:'paralelo con numero + meridiano colgado del muelle del Ex Frigorifico, Y ADEMAS una linea aparte para el canal Tenglo. Dos primitivas, y en dos lugares distintos' },
  { n: 39, e1:'P-VERT',   e2:'C-TODAS',   por:'cuatro vertices enumerados, todos con lat y long' },
  { n: 40, e1:'P-PARMER', e2:'C-NINGUNA', por:'' },
  { n: 41, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 42, e1:'P-LIN',    e2:'C-NINGUNA', por:'' },
  { n: 43, e1:'P-LIN',    e2:'C-ALGUNAS', por:'' },
  { n: 44, e1:'P-PARMER', e2:'C-NINGUNA', por:'' },
  { n: 45, e1:'P-VERT',   e2:'C-TODAS',   por:'cinco vertices enumerados. OJO: los cinco traen el signo de grado DONDE VA EL DE MINUTO en la longitud -- "70 52 36 W" sale como 70(grado)52(grado)36(comilla). Legible para un humano, NO parseable a ciegas' },
  { n: 46, e1:'P-PARMER', e2:'C-NINGUNA', por:'' },
  { n: 47, e1:'P-PARMER', e2:'C-ALGUNAS', por:'' },
  { n: 48, e1:'P-PARMER', e2:'C-TODAS',   por:'un paralelo y DOS meridianos, los tres con numero. Unica entrada que se declara como AREA y no como linea: "el area interior que se forma entre..."' },
  { n: 49, e1:'P-LIN',    e2:'C-NINGUNA', por:'unica anclada a una BOYA (boya Banco Herradura), que es un objeto que se mueve y se cambia de lugar' },
];

// clase derivada, por la precedencia declarada en 03_criterio_clases.txt §2 y §4
function claseDe(e1, e2) {
  if (e1 === 'P-VERT')   return 'F1';
  if (e1 === 'P-MIXTA')  return 'F5';
  if (e1 === 'P-PARMER') return 'F3';
  return e2 === 'C-NINGUNA' ? 'F2' : 'F4';   // P-LIN
}

const NOMBRE_CLASE = {
  F1: 'POLIGONO / VERTICES ENUMERADOS',
  F2: 'LINEA ENTRE TOPONIMOS, SIN COORDENADAS',
  F3: 'PARALELO Y/O MERIDIANO',
  F4: 'MIXTO - LINEA CON COORDENADAS',
  F5: 'LINEA + PARALELO/MERIDIANO (clase nueva)',
};

const FALTA = {
  F1: 'nada. Los vertices ya son coordenadas: la linea sale sola.',
  F2: 'georreferenciar CADA toponimo. Ninguno esta en el documento -> carta del SHOA u otra fuente.',
  F3: 'si los dos ejes traen numero, nada. Si un eje cuelga de un toponimo, hace falta MEDIA coordenada de ese toponimo: solo la latitud si es un paralelo, solo la longitud si es un meridiano.',
  F4: 'georreferenciar solo los extremos sin numero. Los que traen, ya estan.',
  F5: 'las dos cosas a la vez: los toponimos de la linea y el eje del paralelo/meridiano.',
};

// ── detectores mecanicos (control, NO decision) ────────────────────────────
// Coordenada = digito(s) + signo de grado + digito(s). Se admiten los DOS signos
// que el documento mezcla: U+00B0 (grado) y U+00BA (ordinal masculino). Se le
// saca antes el parentesis de la carta, para que "N 1111" no cuente -- aunque el
// patron ya exige digito ANTES del signo y "N" no lo es.
const RE_COORD = /[0-9]{1,3}\s*[°º]\s*[0-9]/;
const RE_VERTICES = /^\s*[1-9]\)\s/m;

function cuerpoSinCarta(c) {
  return c.replace(/\((?:Cartas?\s+de\s+referencia)[\s\S]*?\)\.?/g, ' ');
}

const say = (s) => console.log(s);

say('P3 - CLASIFICACION POR FORMATO');
say('='.repeat(78));
say('');
say('CRITERIO: 03_criterio_clases.txt, escrito ANTES de correr esto.');
say('DECIDE  : la tabla manual de este fichero, de leer las 49 entradas enteras.');
say('LA MAQUINA NO CLASIFICA: coteja al humano en lo mecanizable.');
say('DENOMINADOR: las 49 ENTRADAS del ANEXO "A" punto 1. No son 53 -- 53 son los');
say('PUERTOS, y una entrada puede nombrar dos. El formato es de la ENTRADA.');
say('');

if (MANUAL.length !== datos.entradas.length) {
  say('ROJO: la tabla manual tiene ' + MANUAL.length + ' filas y hay ' +
      datos.entradas.length + ' entradas.');
  process.exit(3);
}

// ── controles ──────────────────────────────────────────────────────────────
say('CONTROL A - COORDENADAS: LA MAQUINA CONTRA MI TABLA');
say('  La maquina dice si HAY o NO HAY una coordenada numerica. Yo dije C-NINGUNA');
say('  en unas y no en otras. Tienen que coincidir en las 49.');
let desacA = 0;
const filas = [];
for (const m of MANUAL) {
  const e = datos.entradas.find((x) => x.n === m.n);
  const cuerpo = cuerpoSinCarta(e.cuerpo);
  const maqHayCoord = RE_COORD.test(cuerpo);
  const yoHayCoord = m.e2 !== 'C-NINGUNA';
  const maqVert = RE_VERTICES.test(cuerpo);
  const yoVert = m.e1 === 'P-VERT';
  if (maqHayCoord !== yoHayCoord) {
    desacA++;
    say('  DESACUERDO #' + m.n + ' ' + e.nombre + ' -- yo: ' + m.e2 +
        ' | maquina: ' + (maqHayCoord ? 'hay coordenada' : 'no hay coordenada'));
  }
  filas.push({ ...m, nombre: e.nombre, puertos: e.puertos, maqHayCoord, maqVert, yoVert,
               clase: claseDe(m.e1, m.e2) });
}
say('  desacuerdos: ' + desacA + (desacA === 0 ? '   VEREDICTO: OK' : '   VEREDICTO: ROJO'));
say('');

say('CONTROL B - VERTICES ENUMERADOS: LA MAQUINA CONTRA MI TABLA');
let desacB = 0;
for (const f of filas) {
  if (f.maqVert !== f.yoVert) {
    desacB++;
    say('  DESACUERDO #' + f.n + ' ' + f.nombre + ' -- yo: ' + f.e1 +
        ' | maquina: ' + (f.maqVert ? 'hay lista 1) 2) 3)' : 'no hay lista'));
  }
}
say('  desacuerdos: ' + desacB + (desacB === 0 ? '   VEREDICTO: OK' : '   VEREDICTO: ROJO'));
say('');

say('CONTROL C - POSITIVO: LA MAQUINA MUERDE');
const conCoord = filas.filter((f) => f.maqHayCoord).length;
const conVert = filas.filter((f) => f.maqVert).length;
say('  entradas donde el detector de coordenadas muerde : ' + conCoord + ' de 49');
say('  entradas donde el detector de vertices muerde    : ' + conVert + ' de 49');
const okC = conCoord > 0 && conCoord < 49 && conVert > 0 && conVert < 49;
say('  VEREDICTO: ' + (okC
  ? 'OK - los dos detectores separan, no dicen que si a todo ni que no a todo'
  : 'ROJO - un detector que responde lo mismo siempre no esta midiendo'));
say('');

say('CONTROL D - LAS CLASES SUMAN 49');
const porClase = {};
for (const f of filas) (porClase[f.clase] ||= []).push(f);
const suma = Object.values(porClase).reduce((a, v) => a + v.length, 0);
say('  suma de las clases: ' + suma + ' de 49   VEREDICTO: ' + (suma === 49 ? 'OK' : 'ROJO'));
say('');

// ── el resultado ───────────────────────────────────────────────────────────
say('EL RESULTADO - LAS ENTRADAS POR CLASE');
say('-'.repeat(78));
for (const c of ['F1', 'F2', 'F3', 'F4', 'F5']) {
  const v = porClase[c] || [];
  const puertos = v.reduce((a, f) => a + f.puertos.length, 0);
  say('');
  say(c + '  ' + NOMBRE_CLASE[c]);
  say('    entradas: ' + v.length + ' de 49        puertos: ' + puertos + ' de 53');
  say('    para volverla geometria hace falta: ' + FALTA[c]);
  say('    ' + v.map((f) => f.nombre).join(' · '));
}
say('');

say('EL RESULTADO - EL EJE 2, QUE ES EL QUE CONTESTA LA PREGUNTA (5)');
say('-'.repeat(78));
for (const c of ['C-TODAS', 'C-ALGUNAS', 'C-NINGUNA']) {
  const v = filas.filter((f) => f.e2 === c);
  say('  ' + c.padEnd(10) + ' ' + String(v.length).padStart(2) + ' de 49 entradas   ' +
      String(v.reduce((a, f) => a + f.puertos.length, 0)).padStart(2) + ' de 53 puertos');
}
say('');
say('  C-TODAS es la lista corta que importa: se vuelven geometria sin resolver');
say('  un solo toponimo y sin abrir una sola carta.');
for (const f of filas.filter((x) => x.e2 === 'C-TODAS')) {
  say('    #' + String(f.n).padStart(2) + '  ' + f.nombre.padEnd(24) + '  ' + f.clase);
}
say('');

say('LA TABLA COMPLETA, 49 FILAS, CON LA RAZON DONDE HUBO JUICIO');
say('-'.repeat(78));
for (const f of filas) {
  say(String(f.n).padStart(2) + '  ' + f.clase + '  ' + f.e1.padEnd(8) + ' ' +
      f.e2.padEnd(10) + ' ' + f.nombre);
  if (f.por) say('      ' + f.por);
}
say('');

// ── las cartas del SHOA, medido de paso ────────────────────────────────────
const ediciones = [];
for (const e of datos.entradas) {
  for (const m of e.cuerpo.matchAll(/Edici[oó]n\s+(\d{4})/g)) ediciones.push(Number(m[1]));
}
say('LAS CARTAS DEL SHOA (medido, de paso)');
say('  menciones de "Edicion AAAA" en las 49 entradas : ' + ediciones.length);
say('  edicion mas vieja / mas nueva                  : ' +
    Math.min(...ediciones) + ' / ' + Math.max(...ediciones));
say('  TODA entrada cita al menos una carta con su edicion: ' +
    (datos.entradas.every((e) => /Edici[oó]n\s+\d{4}/.test(e.cuerpo)) ? 'SI (49 de 49)' : 'NO'));
say('');

fs.writeFileSync(path.join(DIR, 'clasificacion_punto1.json'),
  JSON.stringify({
    QUE_ES_ESTO: 'Clasificacion por formato de las 49 entradas del ANEXO "A" punto 1. ' +
                 'NINGUN CODIGO LA CONSUME. No es un insumo y no adjudica nada.',
    criterio: '03_criterio_clases.txt',
    denominador: '49 entradas / 53 puertos',
    conteo_por_clase: Object.fromEntries(Object.entries(porClase).map(([k, v]) => [k, v.length])),
    conteo_por_eje2: Object.fromEntries(['C-TODAS', 'C-ALGUNAS', 'C-NINGUNA']
      .map((c) => [c, filas.filter((f) => f.e2 === c).length])),
    filas: filas.map(({ n, nombre, puertos, e1, e2, clase, por }) =>
      ({ n, nombre, puertos, primitiva: e1, coordenadas: e2, clase, razon: por || null })),
  }, null, 2) + '\n', 'utf8');
say('ESCRITO: clasificacion_punto1.json');
say('');

const verde = desacA === 0 && desacB === 0 && okC && suma === 49;
say('VEREDICTO P3: ' + (verde ? 'VERDE - los cuatro controles pasan' : 'ROJO'));
process.exit(verde ? 0 : 3);
