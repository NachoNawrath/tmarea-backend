// Extrae los Arts. 24, 25, 29 y 30 del D.S. 364/1980 (RRDN) y escribe
// data/decreto/rrdn_articulos.json. Re-ejecutable desde la raiz del repo.
//
// POR QUE LEE EL .txt DE -raw Y NO EL DE -layout: la columna de anotaciones
// marginales de BCN se mezcla dentro de la linea del texto, y los dos extractores
// la colocan en articulos DISTINTOS: -layout la pone en el Art. 30 inciso 2 y -raw
// la pone en el Art. 33 letra C. -raw NO ESTA LIMPIO EN GENERAL; lo esta para los
// CUATRO articulos de este insumo, que es lo que hace falta aca. Cual de las dos
// colocaciones es la correcta NO ESTA DETERMINADO: ver la nota de parseo de
// data/decreto/fuente_ds364/PROCEDENCIA.md. Es la misma clase que documenta la
// nota de parseo 3 de data/decreto/fuente_dfl292/PROCEDENCIA.md.
//
// POR QUE texto_decreto ES UN ARRAY: el Art. 30 tiene dos incisos y entre ellos
// cae un salto de pagina. Unirlos en una sola cadena obliga a editar el literal
// o a arrastrar el pie y la cabecera de pagina. Partido en incisos, cada cadena
// se re-encuentra exacta en una re-extraccion y nada se edita adentro.
const fs = require('fs');
const cp = require('child_process');

const DIR = 'data/decreto/fuente_ds364';
const PDF = DIR + '/DTO-364_2012-03-17.pdf';
const TXT_LAYOUT = DIR + '/DTO-364_2012-03-17.txt';
const TXT_RAW = DIR + '/DTO-364_2012-03-17.raw.txt';
const SALIDA = 'data/decreto/rrdn_articulos.json';

// sha256 con crypto y no con sha256sum: coreutils antepone "\" a la linea cuando la
// ruta contiene backslashes, y eso rompia el cotejo contra un temporal de Windows.
const sha = (f) => require('crypto').createHash('sha256').update(require('fs').readFileSync(f)).digest('hex');

// Mobiliario de pagina que BCN repite y que no es texto normativo.
const ES_MOBILIARIO = (l) =>
  /^Decreto 364, DEFENSA \(1980\)$/.test(l.trim()) ||
  /^Biblioteca del Congreso Nacional de Chile/.test(l.trim());

const raw = fs.readFileSync(TXT_RAW, 'utf8').replace(/\r\n/g, '\n');
const layout = fs.readFileSync(TXT_LAYOUT, 'utf8').replace(/\r\n/g, '\n').split('\n');

// Recorta desde el encabezado de un articulo hasta el del siguiente.
function tajada(desde, hasta) {
  const i = raw.indexOf(desde);
  const j = raw.indexOf(hasta);
  if (i < 0 || j < 0 || j <= i) throw new Error('ancla no encontrada: ' + desde);
  return raw.slice(i, j);
}

const descartadas = [];
function incisos(bloque, cortes) {
  const limpias = bloque.split('\n').filter((l) => {
    if (ES_MOBILIARIO(l)) { descartadas.push(l.trim()); return false; }
    return l.trim() !== '';
  });
  const texto = limpias.join(' ');
  if (!cortes.length) return [texto.replace(/\s+/g, ' ').trim()];
  const out = [];
  let resto = texto;
  for (const c of cortes) {
    const k = resto.indexOf(c);
    if (k < 0) throw new Error('corte de inciso no encontrado: ' + c);
    out.push(resto.slice(0, k));
    resto = resto.slice(k);
  }
  out.push(resto);
  return out.map((s) => s.replace(/\s+/g, ' ').trim());
}

// Linea del inciso en el .txt de -layout, para poder ir a mirarlo a mano.
function lineaLayout(fragmento) {
  const clave = fragmento.split(' ').slice(0, 4).join(' ');
  for (let n = 0; n < layout.length; n++) {
    if (layout[n].replace(/\s+/g, ' ').trim().startsWith(clave)) return n + 1;
  }
  return null;
}

const DEF = [
  { id: 'art_24', desde: 'ARTICULO 24°', hasta: 'ARTICULO 25°', cortes: [],
    titulo: 'Art. 24 — el despacho previo es obligatorio para hacerse a la mar',
    porque: 'Es el texto literal de lo que D-C9 declara como su unico apoyo ("EL DESPACHO ES OBLIGATORIO") y de la frase "Ninguna nave inicia navegacion sin despacho" de la parafrasis de §5. La parafrasis atribuye esa carga a los Arts. 29 y 30; el texto esta aqui. CONTRATO_MOTOR.md §2 ya lo cita como base legal (RRDN Art. 24-27) y su texto no estaba en el arbol.' },
  { id: 'art_25', desde: 'ARTICULO 25°', hasta: 'ARTICULO 26°', cortes: [],
    titulo: 'Art. 25 — documentacion en orden y condiciones de seguridad',
    porque: 'Es el texto literal de "presenta documentacion y cumple las disposiciones de seguridad de la Autoridad Maritima" de la parafrasis de §5, que la parafrasis atribuye al Art. 30. El Art. 30 literal no dice ni "seguridad" ni "Autoridad Maritima".' },
  { id: 'art_29', desde: 'ARTICULO 29°', hasta: 'ARTICULO 30°', cortes: [],
    titulo: 'Art. 29 — clasificacion de las naves para determinar autoridades y documentos',
    porque: 'Lo cita D-C9 por numero. Su categoria E ("Naves menores nacionales") es lo que la parafrasis invoca para decir que el reglamento cubre al usuario de Tmarea.' },
  { id: 'art_30', desde: 'ARTICULO 30°', hasta: 'ARTICULO 31°',
    cortes: ['Además para que la autoridad marítima otorgue el'],
    titulo: 'Art. 30 — requisitos para obtener la autorizacion de zarpe',
    porque: 'Lo cita D-C9 por numero. NOTA DE PARSEO — LA ANOTACION MARGINAL NO SE ATRIBUYE: el consolidado de BCN lleva al margen "DTO 220, DEFENSA / Art. unico / D.O. 07.07.2007" UNA sola vez, y LAS DOS EXTRACCIONES DISCREPAN sobre a que articulo pertenece. -layout la emite dentro del inciso 2 de ESTE articulo; -raw la emite dentro de la letra C del Art. 33. Cual de las dos lecturas es la correcta NO ESTA DETERMINADO: exigiria leer las posiciones de glifo del PDF. Se declara la discrepancia y NO se afirma ninguna de las dos.' },
];

const shaLayout = sha(TXT_LAYOUT);
const shaRaw = sha(TXT_RAW);

const articulos = DEF.map((d) => {
  const partes = incisos(tajada(d.desde, d.hasta), d.cortes);
  return {
    id: d.id,
    titulo: d.titulo,
    texto_decreto: partes,
    por_que_esta: d.porque,
    procedencia: {
      documento: 'D.S. (M.) 364 de 1980, Reglamento de Recepcion y Despacho de Naves (RRDN). Texto consolidado de la Biblioteca del Congreso Nacional, Ultima Version De: 17-MAR-2012',
      documento_txt: TXT_LAYOUT,
      documento_sha256: shaLayout,
      linea_en_el_documento: partes.map(lineaLayout),
      extraido_de: TXT_RAW,
      extraido_de_sha256: shaRaw,
      extraido_por: '_bitacoras/ds364_al_arbol_2026-08-19/01_extraer_articulos.js',
      fecha_cotejo: '2026-08-19',
    },
  };
});

const doc = {
  version: 'v1',
  fuente: 'data/decreto/fuente_ds364/ — la cadena de custodia esta en el PROCEDENCIA.md de ese directorio',
  generado: '2026-08-19',
  generado_por: '_bitacoras/ds364_al_arbol_2026-08-19/01_extraer_articulos.js',
  norma: {
    identificacion: 'D.S. (M.) 364 de 1980 — Aprueba el Reglamento de Recepcion y Despacho de Naves, modifica el Decreto 1.340 bis, de 14 de junio de 1941, de Marina',
    organismo: 'Ministerio de Defensa Nacional',
    promulgacion: '1980-04-29',
    publicacion: '1980-06-27',
    version_del_texto: 'Ultima Version De: 17-MAR-2012 (Ultima Modificacion: 17-MAR-2012, Decreto 701)',
    referido_como: 'RRDN',
    articulos_del_decreto: 38,
    pdf: PDF,
    pdf_sha256: sha(PDF),
  },
  alcance_de_este_insumo:
    'CUATRO articulos de TREINTA Y OCHO. No es el decreto completo y no se lee como tal. Estan los Arts. 29 y 30 porque D-C9 los cita por numero, y los Arts. 24 y 25 porque son los que llevan el texto que D-C9 declara como su apoyo. Los otros treinta y cuatro no estan; salen del PDF del mismo directorio.',
  nota_estructura:
    'texto_decreto es un ARRAY de incisos, no una cadena. El Art. 30 tiene dos incisos y entre ellos cae un salto de pagina en el PDF: unirlos obligaria a editar el literal o a arrastrar el pie y la cabecera de pagina. Cada elemento del array se re-encuentra por si solo en una re-extraccion del PDF; la union de los dos, no. El control esta en _bitacoras/ds364_al_arbol_2026-08-19/02_control_rebusqueda.js.',
  nota_de_lo_que_NO_hace:
    'No adjudica, no decide y no contesta D-C9. Es texto fuente citable. Ningun fichero del repositorio lo lee todavia.',
  articulos,
};

fs.writeFileSync(SALIDA, JSON.stringify(doc, null, 2) + '\n', 'utf8');

console.log('AMBITO: data/decreto/fuente_ds364/DTO-364_2012-03-17.raw.txt — extraccion -raw del PDF versionado.');
console.log('');
console.log('lineas de mobiliario de pagina descartadas DENTRO de los cuatro articulos: ' + descartadas.length);
if (!descartadas.length) console.log('  (ninguna — solo el Art. 30 cruza un salto de pagina; ver control)');
descartadas.forEach((l) => console.log('  DESCARTADA: ' + l));
console.log('');
for (const a of articulos) {
  console.log(a.id + ' — incisos: ' + a.texto_decreto.length +
    ' — linea en el .txt de -layout: ' + JSON.stringify(a.procedencia.linea_en_el_documento));
  a.texto_decreto.forEach((p, i) => console.log('   [' + i + '] ' + p.length + ' caracteres'));
}
console.log('');
console.log('escrito: ' + SALIDA + ' (' + fs.statSync(SALIDA).size + ' bytes)');
