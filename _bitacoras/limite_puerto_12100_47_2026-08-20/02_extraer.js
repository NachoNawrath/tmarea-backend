// P2 - Extraccion de las entradas del ANEXO "A", punto 1 (LIMITES DE PUERTO).
//
// ─── LO QUE ESTE INSTRUMENTO NO HACE ────────────────────────────────────────
// No clasifica, no empareja, no interpreta. Recorta y parte. El juicio va en
// 03_criterio_clases.txt y en 04_clasificar.js, y va DESPUES.
//
// ─── LA FRONTERA DEL BLOQUE ─────────────────────────────────────────────────
// No se busca por texto ni por heuristica. El documento numera sus propios
// puntos y esa numeracion es la frontera:
//
//   linea   69 : A N E X O "A"
//   linea   74 : 1.- FIJANSE ... los siguientes limites de los puertos     <- EL BLANCO
//   linea  465 : 2.- FIJANSE ... (zona de espera de practicos)             <- fuera
//   linea  902 : 3.- FIJANSE ... Estaciones de Transferencia               <- fuera
//   linea 1025 : 4.- FIJANSE ... dispositivos de separacion de trafico     <- fuera
//   linea 1357 : 5.- Derrota recomendada ... Estrecho de Magallanes        <- fuera
//   linea 1377 : ANEXO "B"                                                 <- fuera
//
// Bloque = lineas 74..464 (1-indexadas), 391 lineas. Cerrado por los dos lados
// por un encabezado numerado.
//
// HALLAZGO DEL GATE, que queda escrito porque casi cuesta la sesion: el grep de
// 'ANEXO' (patron ASCII PURO, sin un solo acento) devuelve UNA sola linea, la
// 1377, que es el Anexo B. Concluir de ahi que el Anexo A no esta seria falso:
// esta en la linea 69 escrito 'A N E X O "A"', con espacio entre letra y letra.
// El problema no era el encoding. Era que el vocabulario del documento no es el
// que uno supone. Un control positivo hace falta TAMBIEN cuando el patron es
// ASCII puro.
//
// ─── REGLA DE ENCABEZADO (declarada antes de correr) ────────────────────────
// Una linea es ENCABEZADO DE ENTRADA si, tras recortar espacios:
//   (a) no esta vacia,
//   (b) termina en ':',
//   (c) toda letra que contiene es mayuscula -- comparada con
//       toLocaleUpperCase('es'), no byte a byte,
//   (d) con UNA excepcion: el conector suelto 'y' se admite en minuscula,
//       porque el documento escribe 'PENCO y LIRQUEN'.
//
// La sangria NO entra en la regla, a proposito: el .txt trae la primera pagina
// del bloque con 5 espacios de sangria y las demas con 0. Una regla anclada a la
// sangria habria partido el bloque en dos y nadie se habria enterado.
//
// ─── UNIDAD: ENTRADA != PUERTO ──────────────────────────────────────────────
// Una entrada puede nombrar dos puertos. Separador declarado: el conector ' y '
// o un guion (- o el guion largo U+2013) entre dos nombres propios. La
// yuxtaposicion sin conector NO parte: 'RIO NEGRO HORNOPIREN' es un puerto, no
// dos, y 'SAN JOSE DE CALBUCO' tampoco se parte por el 'DE'.
//
// ─── CONTROLES ──────────────────────────────────────────────────────────────
// (1) POSITIVO por conteo a mano: el bloque se leyo entero y se contaron 49
//     encabezados a ojo, antes de correr esto. Si la regla no devuelve 49, la
//     regla esta mal, no el conteo.
// (2) NEGATIVO / de discriminacion: la misma regla se corre sobre el punto 2
//     (lineas 465..901), que NO es el blanco. Debe devolver un conjunto
//     NO VACIO y DISTINTO. Si devolviera 0, la regla no discrimina: estaria
//     acertando por casualidad sobre el bloque bueno. Si devolviera lo mismo,
//     el recorte no esta recortando nada.
// (3) La linea 74 -- '1.- FIJANSE ... que se indican:' -- termina en ':' y NO
//     debe entrar, porque tiene minusculas. Se comprueba explicitamente.

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const TXT = path.join(DIR, 'DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.txt');

const BLOQUE_P1 = { desde: 74, hasta: 464, rotulo: 'ANEXO A punto 1 - LIMITES DE PUERTO' };
const BLOQUE_P2 = { desde: 465, hasta: 901, rotulo: 'ANEXO A punto 2 - zona de espera (control negativo)' };

const CONTEO_A_MANO = 49;

const lineas = fs.readFileSync(TXT, 'utf8').split('\n');

function esEncabezado(linea) {
  const t = linea.trim();
  if (t.length === 0) return false;
  if (!t.endsWith(':')) return false;
  // (c) + (d): toda letra en mayuscula, salvo el conector suelto 'y'.
  const sinConector = t.replace(/(^|\s)y(\s|$)/g, '$1Y$2');
  return sinConector === sinConector.toLocaleUpperCase('es');
}

function encabezadosDe(bloque) {
  const out = [];
  for (let i = bloque.desde; i <= bloque.hasta; i++) {
    const linea = lineas[i - 1];
    if (linea === undefined) continue;
    if (esEncabezado(linea)) out.push({ linea_n: i, texto: linea.trim() });
  }
  return out;
}

// Separa una entrada en los puertos que nombra.
function puertosDe(nombreConDosPuntos) {
  const n = nombreConDosPuntos.replace(/:$/, '').trim();
  const partes = n.split(/\s+(?:y|–|-)\s+/);
  return partes.map((s) => s.trim()).filter((s) => s.length > 0);
}

const say = (s) => console.log(s);

say('P2 - EXTRACCION DE LAS ENTRADAS DEL ANEXO "A" PUNTO 1');
say('='.repeat(78));
say('');
say('FUENTE  : DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.txt');
say('          sha256 dc8a1506291c3172f47cc4a4e872dc475c777c3429ad8d3e989df9844eb2430a');
say('BLOQUE  : lineas ' + BLOQUE_P1.desde + '..' + BLOQUE_P1.hasta +
    ' (' + (BLOQUE_P1.hasta - BLOQUE_P1.desde + 1) + ' lineas)');
say('');

// ── control (3) ────────────────────────────────────────────────────────────
say('CONTROL 3 - LA CABECERA DEL PUNTO 1 NO DEBE ENTRAR');
const l74 = lineas[73];
say('  linea 74: ' + JSON.stringify(l74.trim().slice(0, 72)));
say('  termina en ":" ? ' + l74.trim().endsWith(':'));
say('  la regla la toma ? ' + esEncabezado(l74) + '   (debe ser false: tiene minusculas)');
const ok3 = esEncabezado(l74) === false;
say('  VEREDICTO: ' + (ok3 ? 'OK' : 'ROJO'));
say('');

// ── extraccion ─────────────────────────────────────────────────────────────
const enc = encabezadosDe(BLOQUE_P1);

say('CONTROL 1 - POSITIVO POR CONTEO A MANO');
say('  contadas a ojo leyendo el bloque entero : ' + CONTEO_A_MANO);
say('  devueltas por la regla                  : ' + enc.length);
const ok1 = enc.length === CONTEO_A_MANO;
say('  VEREDICTO: ' + (ok1 ? 'OK - coinciden' : 'ROJO - la regla esta mal, no el conteo'));
say('');

// ── control negativo ───────────────────────────────────────────────────────
const encP2 = encabezadosDe(BLOQUE_P2);
const setP1 = new Set(enc.map((e) => e.texto));
const setP2 = new Set(encP2.map((e) => e.texto));
const soloP2 = [...setP2].filter((t) => !setP1.has(t));
say('CONTROL 2 - NEGATIVO / DE DISCRIMINACION (punto 2, que NO es el blanco)');
say('  encabezados que la MISMA regla encuentra en el punto 2 : ' + encP2.length);
say('  de ellos, ausentes del punto 1                         : ' + soloP2.length);
const ok2 = encP2.length > 0 && soloP2.length > 0;
say('  VEREDICTO: ' + (ok2
  ? 'OK - la regla muerde en los dos bloques y devuelve conjuntos distintos:'
  : 'ROJO - la regla no discrimina, acierta por casualidad'));
say('  primeros 6 del punto 2, para que se vea que son OTROS puertos:');
for (const t of encP2.slice(0, 6)) say('    ' + t.linea_n + '  ' + t.texto);
say('');
say('  QUE PRUEBA ESTE CONTROL: que la regla de encabezado no esta pegada al');
say('  punto 1. Lo que deja fuera al punto 2 es el RECORTE POR LINEA, no la');
say('  regla. Si manana alguien mueve la frontera, las 49 se contaminan y este');
say('  control no lo va a cazar: lo unico que lo caza es la numeracion del');
say('  documento, que es por lo que la frontera se puso ahi.');
say('');

// ── el listado ─────────────────────────────────────────────────────────────
const entradas = enc.map((e, idx) => {
  const puertos = puertosDe(e.texto);
  const fin = idx + 1 < enc.length ? enc[idx + 1].linea_n - 1 : BLOQUE_P1.hasta;
  const cuerpo = lineas.slice(e.linea_n, fin).join('\n');
  return { n: idx + 1, linea_n: e.linea_n, hasta_n: fin, nombre: e.texto.replace(/:$/, ''), puertos, cuerpo };
});

const multi = entradas.filter((e) => e.puertos.length > 1);
const totalPuertos = entradas.reduce((a, e) => a + e.puertos.length, 0);

say('EL RESULTADO - LA UNIDAD, QUE NO ES UNA SOLA');
say('  ENTRADAS del punto 1 ........................ ' + entradas.length);
say('  PUERTOS nombrados por esas entradas ......... ' + totalPuertos);
say('  entradas que nombran mas de un puerto ....... ' + multi.length);
say('');
say('  DEFINICIONES');
say('    ENTRADA = un encabezado del punto 1 con su parrafo de limite y su carta.');
say('    PUERTO  = cada nombre propio que el encabezado nombra, separados por el');
say('              conector " y " o por guion. Denominador de (2) y de (3).');
say('');
say('  LAS QUE NOMBRAN DOS:');
for (const e of multi) {
  say('    #' + String(e.n).padStart(2) + '  ' + e.nombre + '   ->   ' + e.puertos.join('  |  '));
}
say('');
say('  ATENCION, y es juicio mio, no del documento: las tres que el encargo');
say('  anticipaba usan el conector " y ". La cuarta, HANGA ROA - HANGA PIKO, usa');
say('  un guion largo. La parti igual porque son dos caletas distintas de Isla de');
say('  Pascua, pero el documento le fija UN limite unico a las dos, igual que a');
say('  PENCO y LIRQUEN. Si el owner prefiere contarla como un puerto, el total');
say('  baja de ' + totalPuertos + ' a ' + (totalPuertos - 1) + ' y ninguna otra cifra se mueve.');
say('');

say('LISTADO CRUDO DE LAS ' + entradas.length + ' ENTRADAS');
say('-'.repeat(78));
for (const e of entradas) {
  say(String(e.n).padStart(2) + '  L' + String(e.linea_n).padStart(3) + '  ' + e.nombre +
      (e.puertos.length > 1 ? '   [' + e.puertos.length + ' puertos]' : ''));
}
say('');

fs.writeFileSync(path.join(DIR, 'entradas_punto1.json'),
  JSON.stringify({
    QUE_ES_ESTO: 'Recorte mecanico del ANEXO "A" punto 1 de la Res. DGTM y MM Ex. 12100/47. ' +
                 'NINGUN CODIGO LO CONSUME. No es un insumo, no adjudica nada, no se promueve a data/.',
    fuente: 'DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.txt',
    sha256_fuente: 'dc8a1506291c3172f47cc4a4e872dc475c777c3429ad8d3e989df9844eb2430a',
    bloque: BLOQUE_P1,
    conteo: { entradas: entradas.length, puertos: totalPuertos, entradas_multipuerto: multi.length },
    entradas: entradas.map(({ n, linea_n, hasta_n, nombre, puertos, cuerpo }) =>
      ({ n, linea_n, hasta_n, nombre, puertos, cuerpo })),
  }, null, 2) + '\n', 'utf8');
say('ESCRITO: entradas_punto1.json');
say('');

const verde = ok1 && ok2 && ok3;
say('VEREDICTO P2: ' + (verde ? 'VERDE - los tres controles pasan' : 'ROJO'));
process.exit(verde ? 0 : 3);
