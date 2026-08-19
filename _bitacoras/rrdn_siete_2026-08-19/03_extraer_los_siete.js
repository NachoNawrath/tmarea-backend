// Extrae del D.S. 364/1980 (RRDN) los ONCE articulos que CONTRATO_MOTOR.md cita por
// esa sigla — los cuatro que ya estaban (24, 25, 29, 30) mas los SIETE que estaban
// citados sin texto (13, 16, 17, 26, 27, 33, 36) — y reescribe
// data/decreto/rrdn_articulos.json. Re-ejecutable desde la raiz del repo.
//
// QUE CAMBIA RESPECTO DE 01_extraer_articulos.js, Y POR QUE:
//
// (1) LA FUENTE YA NO ES FIJA. La v1 leia siempre -raw. MEDIDO en el gate de esta
//     sesion (00/01/02_gate_*): el consolidado de BCN lleva CUATRO bloques de columna
//     marginal, no uno, y NINGUNA de las dos extracciones esta limpia en general:
//     -layout reparte cada bloque entre los articulos junto a cuyas lineas se dibuja,
//     y -raw lo emite entero dentro de UN articulo. Cada extraccion esta limpia
//     exactamente donde la otra esta sucia. Correr la v1 con siete anclas mas habria
//     metido "DS 1.079, Subs. Marina, 1987 Art. Unico" dentro del Art. 13 y
//     "DTO 220, DEFENSA Art. unico D.O. 07.07.2007" dentro del Art. 33, y el control
//     de la v1 lo habria dado en verde porque busca en -raw, que es donde estan.
//     Aca la fuente SE ELIGE POR MEDICION, articulo por articulo:
//       · si las dos extracciones dan el mismo texto -> queda doblemente atestiguado;
//       · si una es SUBSECUENCIA DE PALABRAS de la otra -> se toma la corta y el tramo
//         sobrante se publica como columna marginal AISLADA, sin atribuirla a nadie;
//       · si no se da ninguna de las dos -> ESTE SCRIPT FALLA. No adivina.
//
// (2) EL CORTE EN FRAGMENTOS YA NO SE ESCRIBE A MANO. La v1 llevaba un ancla literal
//     ('Ademas para que la autoridad maritima otorgue el') para partir el Art. 30. Aca
//     el corte cae DONDE EL DOCUMENTO PUSO EL MOBILIARIO DE PAGINA. Lo pone el PDF.
//
// (3) texto_decreto NO ES UN ARRAY DE INCISOS y la v1 lo llamaba asi. MEDIDO: el Art.
//     36 tiene DOS incisos normativos y UN solo fragmento (no cruza pagina), y el Art.
//     17 tiene UN inciso y DOS fragmentos, porque el salto de pagina le cae EN MITAD DE
//     UNA ORACION, entre "distinto" y "del prefijado". En el Art. 30 las dos cosas
//     coincidieron por casualidad. Es un array de FRAGMENTOS SEPARADOS POR SALTO DE
//     PAGINA, y asi se declara.
//
// NO REGRESION: los cuatro textos ya firmados en 8397396 tienen que salir IDENTICOS.
// Lo comprueba 04_control_rebusqueda.js contra el fichero que hay en ese commit.
const fs = require('fs');

const DIR = 'data/decreto/fuente_ds364';
const PDF = DIR + '/DTO-364_2012-03-17.pdf';
const TXT_LAYOUT = DIR + '/DTO-364_2012-03-17.txt';
const TXT_RAW = DIR + '/DTO-364_2012-03-17.raw.txt';
const SALIDA = 'data/decreto/rrdn_articulos.json';

// sha256 con crypto y no con sha256sum: coreutils antepone "\" a la linea cuando la
// ruta contiene backslashes. Lo cazo la sesion del 2026-08-19 anterior.
const sha = (f) => require('crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// Mobiliario de pagina que BCN repite y que no es texto normativo.
const ES_MOBILIARIO = (l) =>
  /^Decreto 364, DEFENSA \(1980\)$/.test(l.trim()) ||
  /^Biblioteca del Congreso Nacional de Chile/.test(l.trim());

// Encabezado de articulo. Cubre "ARTICULO 8° BIS" y "Articulo 2° bis:".
const ENC = /^(ARTICULO|Artículo)\s+(\d+)°(\s+(BIS|bis))?:?\s/;

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const leer = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

// Corta el documento en articulos y cada articulo en fragmentos, cortando alli donde
// cae el mobiliario de pagina.
function fragmentar(texto) {
  const lineas = texto.split('\n');
  const encs = [];
  lineas.forEach((l, n) => {
    const m = ENC.exec(l.trim());
    if (m) encs.push({ n, id: 'art_' + m[2] + (m[4] ? '_bis' : '') });
  });
  const out = {};
  encs.forEach((e, i) => {
    const bloque = lineas.slice(e.n, i + 1 < encs.length ? encs[i + 1].n : lineas.length);
    const frags = [[]];
    let corto = false;
    for (const l of bloque) {
      if (ES_MOBILIARIO(l)) { corto = true; continue; }
      if (l.trim() === '') continue;
      if (corto) { frags.push([]); corto = false; }
      frags[frags.length - 1].push(l);
    }
    out[e.id] = frags.filter((f) => f.length).map((f) => norm(f.join(' ')));
  });
  return { orden: encs.map((e) => e.id), articulos: out };
}

const esSubsecuencia = (chico, grande) => {
  let i = 0;
  for (const w of grande) if (i < chico.length && chico[i] === w) i++;
  return i === chico.length;
};
const sobrante = (chico, grande) => {
  const out = []; let i = 0;
  for (const w of grande) { if (i < chico.length && chico[i] === w) i++; else out.push(w); }
  return out.join(' ');
};

const F_RAW = fragmentar(leer(TXT_RAW));
const F_LAY = fragmentar(leer(TXT_LAYOUT));
const lineasLayout = leer(TXT_LAYOUT).split('\n');

// Devuelve { frags, fuente, cotejo, aislado } o lanza si no se resuelve.
function elegirFuente(id) {
  const fr = F_RAW.articulos[id], fl = F_LAY.articulos[id];
  if (!fr || !fl) throw new Error('articulo ausente en alguna extraccion: ' + id);
  const jr = fr.join(' '), jl = fl.join(' ');
  if (jr === jl) {
    return { frags: fr, fuente: TXT_RAW, cotejo:
      'IDENTICO EN LAS DOS EXTRACCIONES. El texto de -layout y el de -raw coinciden palabra por palabra: ninguna columna marginal cayo en este articulo en ninguna de las dos, y el literal queda doblemente atestiguado. Se nombra -raw como fuente por continuidad con la v1 del insumo.' };
  }
  if (esSubsecuencia(jl.split(' '), jr.split(' '))) {
    return { frags: fl, fuente: TXT_LAYOUT, aislado: sobrante(jl.split(' '), jr.split(' ')), cotejo:
      'COLUMNA MARGINAL AISLADA. -raw trae, dentro de este articulo, un tramo que -layout no trae, y el resto de la secuencia de palabras es IDENTICA en las dos. Se toma -layout, que es el que no lo trae. El tramo excluido queda escrito en columna_marginal_aislada y NO SE ATRIBUYE a ningun articulo.' };
  }
  if (esSubsecuencia(jr.split(' '), jl.split(' '))) {
    return { frags: fr, fuente: TXT_RAW, aislado: sobrante(jr.split(' '), jl.split(' ')), cotejo:
      'COLUMNA MARGINAL AISLADA. -layout trae, dentro de este articulo, un tramo que -raw no trae, y el resto de la secuencia de palabras es IDENTICA en las dos. Se toma -raw, que es el que no lo trae. El tramo excluido queda escrito en columna_marginal_aislada y NO SE ATRIBUYE a ningun articulo.' };
  }
  throw new Error('NO RESUELTO: ' + id + ' — las dos extracciones discrepan y ninguna es subsecuencia de la otra. No se extrae y no se adivina.');
}

// Linea del fragmento en el .txt de -layout, para poder ir a mirarlo a mano.
function lineaLayout(fragmento) {
  const clave = fragmento.split(' ').slice(0, 4).join(' ');
  for (let n = 0; n < lineasLayout.length; n++) {
    if (norm(lineasLayout[n]).startsWith(clave)) return n + 1;
  }
  return null;
}

// Los ONCE. El orden es el del decreto. titulo y por_que_esta de los cuatro de la v1
// van copiados palabra por palabra: esta sesion no reescribe lo que el owner ya firmo.
const DEF = [
  { id: 'art_13', titulo: 'Art. 13 — aviso de arribada con 24 horas de anticipacion',
    porque: 'CONTRATO_MOTOR.md lo cita en la seccion "6.1 Comercial / Acuicola / Transporte": "Aviso de arribada 24h (RRDN Art. 13): recordatorio normativo." Es el unico lugar del contrato que lo nombra. MEDIDO EN ESTA SESION: en -raw este articulo se lleva el bloque marginal "DS 1.079, Subs. Marina, 1987 Art. Unico"; sale limpio de -layout, y de ahi se extrae.' },
  { id: 'art_16', titulo: 'Art. 16 — cambio del puerto prefijado de recalada: permiso previo',
    porque: 'CONTRATO_MOTOR.md lo cita en INV-2.2 (puerto de recalada cerrado) como Capa 2 normativa junto al Art. 17: "RRDN Art. 16: si cambia el puerto de recalada, solicitar permiso a la Autoridad Maritima con anticipacion". El literal dice eso mismo.' },
  { id: 'art_17', titulo: 'Art. 17 — definicion de arribada forzosa',
    porque: 'CONTRATO_MOTOR.md lo cita en INV-2.2 y en INV-2.3: "RRDN Art. 17 (define arribada forzosa como entrada a puerto distinto del prefijado)". El literal dice eso y ADEMAS remite al Libro III, titulo V, parrafo 6 del Codigo de Comercio, remision que el contrato no recoge. ESTE ARTICULO CRUZA UN SALTO DE PAGINA y el corte le cae EN MITAD DE UNA ORACION, entre "distinto" y "del prefijado": por eso son dos fragmentos, y NO son dos incisos.' },
  { id: 'art_24', titulo: 'Art. 24 — el despacho previo es obligatorio para hacerse a la mar',
    porque: 'Es el texto literal de lo que D-C9 declara como su unico apoyo ("EL DESPACHO ES OBLIGATORIO") y de la frase "Ninguna nave inicia navegacion sin despacho" de la parafrasis de §5. La parafrasis atribuye esa carga a los Arts. 29 y 30; el texto esta aqui. CONTRATO_MOTOR.md §2 ya lo cita como base legal (RRDN Art. 24-27) y su texto no estaba en el arbol.' },
  { id: 'art_25', titulo: 'Art. 25 — documentacion en orden y condiciones de seguridad',
    porque: 'Es el texto literal de "presenta documentacion y cumple las disposiciones de seguridad de la Autoridad Maritima" de la parafrasis de §5, que la parafrasis atribuye al Art. 30. El Art. 30 literal no dice ni "seguridad" ni "Autoridad Maritima".' },
  { id: 'art_26', titulo: 'Art. 26 — el despacho solo puede negarse por causa legal o reglamentaria',
    porque: 'CONTRATO_MOTOR.md lo cita en la seccion "2. LOGICA ZARPE != RECALADA — INVARIANTE" ("Base legal: RRDN Art. 24-27, Art. 33, Art. 36") y en la seccion "6.1": "la app NO evalua la autorizacion de zarpe (RRDN Art. 26, Art. 33 listan causales que decide la Autoridad)". HALLAZGO MEDIDO Y NO ENMENDADO: el Art. 26 NO LISTA causales; dice en que casos el despacho PUEDE negarse (causa legal o reglamentaria, orden judicial, o solicitud de la Autoridad competente). El que lista causales es el Art. 33. Queda anotado en la bitacora de esta sesion con opciones; CONTRATO_MOTOR.md no se toca.' },
  { id: 'art_27', titulo: 'Art. 27 — quien solicita el despacho y con cuanta anticipacion',
    porque: 'CONTRATO_MOTOR.md lo cita dentro del rango "Base legal: RRDN Art. 24-27" de la seccion "2. LOGICA ZARPE != RECALADA — INVARIANTE". Es el unico lugar del contrato que lo alcanza, y lo alcanza por rango y no por numero propio.' },
  { id: 'art_29', titulo: 'Art. 29 — clasificacion de las naves para determinar autoridades y documentos',
    porque: 'Lo cita D-C9 por numero. Su categoria E ("Naves menores nacionales") es lo que la parafrasis invoca para decir que el reglamento cubre al usuario de Tmarea.' },
  { id: 'art_30', titulo: 'Art. 30 — requisitos para obtener la autorizacion de zarpe',
    porque: 'Lo cita D-C9 por numero. NOTA DE PARSEO — LA ANOTACION MARGINAL NO SE ATRIBUYE: el consolidado de BCN lleva al margen "DTO 220, DEFENSA / Art. unico / D.O. 07.07.2007" UNA sola vez, y LAS DOS EXTRACCIONES DISCREPAN sobre a que articulo pertenece. -layout la emite dentro del inciso 2 de ESTE articulo; -raw la emite dentro de la letra C del Art. 33. Cual de las dos lecturas es la correcta NO ESTA DETERMINADO: exigiria leer las posiciones de glifo del PDF. Se declara la discrepancia y NO se afirma ninguna de las dos.' },
  { id: 'art_33', titulo: 'Art. 33 — causales por las que la Autoridad Maritima no otorga el zarpe',
    porque: 'CONTRATO_MOTOR.md lo cita en la seccion "2. LOGICA ZARPE != RECALADA — INVARIANTE" y en la seccion "6.1" ("RRDN Art. 26, Art. 33 listan causales que decide la Autoridad"): es el articulo que efectivamente las lista, en cuatro letras A a D, y el literal dice "entre otras", o sea que la lista no es cerrada. MEDIDO EN ESTA SESION: en -raw este articulo se lleva el bloque marginal "DTO 220, DEFENSA Art. unico D.O. 07.07.2007" dentro de su letra C; sale limpio de -layout, y de ahi se extrae. A QUE ARTICULO PERTENECE ESA ANOTACION SIGUE SIN DETERMINAR.' },
  { id: 'art_36', titulo: 'Art. 36 — puertos intermedios y zarpe a la gira con puerto cerrado',
    porque: 'Es el articulo del RRDN mas citado por CONTRATO_MOTOR.md: cinco lugares — INV-0.1, la base legal de la seccion 2, la Capa 2 de INV-2.1, el bloque "quien autoriza" de INV-2.1 y la fila «Zarpe cerrado» del catalogo de mensajes. Y es el UNICO del que el contrato ya traia una cita entre comillas rotulada "Texto legal literal": el control de esta sesion la coteja contra este texto. Tiene DOS incisos normativos y UN solo fragmento, porque no cruza salto de pagina.' },
];

const shaLayout = sha(TXT_LAYOUT);
const shaRaw = sha(TXT_RAW);
const SHA = { [TXT_LAYOUT]: shaLayout, [TXT_RAW]: shaRaw };

const informe = [];
const articulos = DEF.map((d) => {
  const e = elegirFuente(d.id);
  informe.push({ id: d.id, fuente: e.fuente, frags: e.frags.length, aislado: e.aislado || '',
                 chars: e.frags.reduce((s, f) => s + f.length, 0) });
  const proc = {
    documento: 'D.S. (M.) 364 de 1980, Reglamento de Recepcion y Despacho de Naves (RRDN). Texto consolidado de la Biblioteca del Congreso Nacional, Ultima Version De: 17-MAR-2012',
    documento_txt: TXT_LAYOUT,
    documento_sha256: shaLayout,
    linea_en_el_documento: e.frags.map(lineaLayout),
    extraido_de: e.fuente,
    extraido_de_sha256: SHA[e.fuente],
    cotejo_entre_extracciones: e.cotejo,
    corte_por_salto_de_pagina: e.frags.length > 1,
    extraido_por: '_bitacoras/rrdn_siete_2026-08-19/03_extraer_los_siete.js',
    fecha_cotejo: '2026-08-19',
  };
  if (e.aislado) {
    proc.columna_marginal_aislada = {
      tramo: e.aislado,
      palabras: e.aislado.split(" ").length,
      que_es: "LAS PALABRAS EXCLUIDAS, en el orden en que las emite la otra extraccion. NO ES UNA CITA LITERAL CONTIGUA y no se encuentra como subcadena en ningun fichero: en el PDF esto es una columna dibujada AL MARGEN, y la otra extraccion la intercala entre las lineas del articulo, un pedazo por linea. Lo que si es exacto, y lo comprueba el control C4, es que re-insertar estas palabras en el texto publicado reproduce palabra por palabra lo que la otra extraccion emite para este articulo.",
      sale_de: e.fuente === TXT_RAW ? TXT_LAYOUT : TXT_RAW,
      no_se_atribuye: 'Este tramo es aparato marginal del consolidado de BCN y NO se guarda como texto del articulo. A QUE ARTICULO PERTENECE NO ESTA DETERMINADO: las dos extracciones lo colocan en articulos distintos y establecerlo exigiria leer las posiciones de glifo del PDF. Se declara y no se afirma ninguna de las dos colocaciones.',
    };
  }
  return { id: d.id, titulo: d.titulo, texto_decreto: e.frags, por_que_esta: d.porque, procedencia: proc };
});

const doc = {
  version: 'v2',
  fuente: 'data/decreto/fuente_ds364/ — la cadena de custodia esta en el PROCEDENCIA.md de ese directorio',
  generado: '2026-08-19',
  generado_por: '_bitacoras/rrdn_siete_2026-08-19/03_extraer_los_siete.js',
  norma: {
    identificacion: 'D.S. (M.) 364 de 1980 — Aprueba el Reglamento de Recepcion y Despacho de Naves, modifica el Decreto 1.340 bis, de 14 de junio de 1941, de Marina',
    organismo: 'Ministerio de Defensa Nacional',
    promulgacion: '1980-04-29',
    publicacion: '1980-06-27',
    version_del_texto: 'Ultima Version De: 17-MAR-2012 (Ultima Modificacion: 17-MAR-2012, Decreto 701)',
    referido_como: 'RRDN',
    articulos_del_decreto: 40,
    articulos_del_decreto_desglose: 'CUARENTA encabezados de articulo, contados sobre las DOS extracciones del PDF versionado, que dan la misma lista y en el mismo orden: 38 numerados (Art. 1° a Art. 38°) mas "Articulo 2° bis" mas "ARTICULO 8° BIS". La v1 de este insumo publicaba 38, que es el conteo de los numerados solamente; el denominador correcto para "cuantos articulos tiene el decreto" es 40.',
    pdf: PDF,
    pdf_sha256: sha(PDF),
  },
  alcance_de_este_insumo:
    'ONCE articulos de CUARENTA. No es el decreto completo y no se lee como tal. Estan los ONCE que CONTRATO_MOTOR.md cita por la sigla RRDN — 13, 16, 17, 24, 25, 26, 27, 29, 30, 33 y 36 — mas nada. Los otros VEINTINUEVE no estan; salen del PDF del mismo directorio. Que no esten no significa que no digan nada: significa que nadie los ha necesitado todavia, y este insumo es "los articulos que alguien necesito, con su motivo escrito al lado", no "el decreto".',
  nota_estructura:
    'texto_decreto es un ARRAY DE FRAGMENTOS SEPARADOS POR SALTO DE PAGINA, y NO un array de incisos normativos. La v1 lo llamaba "array de incisos" porque en el Art. 30 las dos cosas coincidieron; MEDIDO en esta sesion que no coinciden en general: el Art. 36 tiene DOS incisos normativos y UN solo fragmento, porque no cruza pagina; y al Art. 17 el salto de pagina le cae EN MITAD DE UNA ORACION, entre "distinto" y "del prefijado", asi que sus dos fragmentos no son dos incisos. El corte esta donde el PDF puso el mobiliario de pagina de BCN, no donde lo puso una mano. Cada fragmento se re-encuentra por si solo en una re-extraccion del PDF; la union de los fragmentos de un mismo articulo, no. El control esta en _bitacoras/rrdn_siete_2026-08-19/04_control_rebusqueda.js.',
  nota_de_la_columna_marginal:
    'El consolidado de BCN lleva CUATRO bloques de anotacion marginal, no uno, y NINGUNA de las dos extracciones esta limpia en general: -layout reparte cada bloque entre los articulos junto a cuyas lineas se dibuja, y -raw lo emite entero dentro de UN articulo. Por eso extraido_de VARIA POR ARTICULO y no es el mismo para todos: se elige por medicion. Cuando las dos extracciones dan el mismo texto, el literal queda doblemente atestiguado. Cuando una es subsecuencia de palabras de la otra, se toma la corta y el tramo sobrante se publica en columna_marginal_aislada SIN ATRIBUIRLO a ningun articulo. El unico articulo del decreto que no se resuelve asi es el "Articulo 2° bis", donde las dos extracciones traen el bloque "DS 1428, Subs. Marina, 1986." en distinto orden y ninguna esta limpia; no esta entre los once y no se extrajo.',
  nota_de_lo_que_NO_hace:
    'No adjudica, no decide y no contesta D-C9. Es texto fuente citable. Ningun fichero del repositorio lo lee todavia.',
  articulos,
};

fs.writeFileSync(SALIDA, JSON.stringify(doc, null, 2) + '\n', 'utf8');

console.log('AMBITO: los dos .txt versionados de ' + DIR + '/. La fuente se elige POR ARTICULO y por medicion.');
console.log('');
console.log('  id         fuente     frag  caracteres  tramo marginal aislado');
for (const r of informe) {
  console.log('  ' + r.id.padEnd(10) + (r.fuente === TXT_RAW ? '-raw   ' : '-layout') + '   ' +
    String(r.frags).padStart(3) + String(r.chars).padStart(11) + '  ' + (r.aislado ? JSON.stringify(r.aislado) : '—'));
}
console.log('');
console.log('articulos escritos ....... ' + articulos.length + ' de 40 encabezados del decreto');
console.log('fragmentos totales ....... ' + informe.reduce((s, r) => s + r.frags, 0));
console.log('de -raw .................. ' + informe.filter((r) => r.fuente === TXT_RAW).length);
console.log('de -layout ............... ' + informe.filter((r) => r.fuente === TXT_LAYOUT).length);
console.log('con columna aislada ...... ' + informe.filter((r) => r.aislado).length);
console.log('');
console.log('escrito: ' + SALIDA + ' (' + fs.statSync(SALIDA).size + ' bytes)');
