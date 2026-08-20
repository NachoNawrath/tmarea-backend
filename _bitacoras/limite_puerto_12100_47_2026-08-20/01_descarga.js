// P1 - Registro de la descarga: sha256, tamanos, y el control de estabilidad.
//
// El control que importa aca no es "el fichero existe" sino "el fichero es EL MISMO
// que se midio en el gate". Se descargo dos veces, con 11 minutos entre medio y por
// dos rutas distintas (sonda al scratchpad y descarga a la bitacora). Si los dos
// sha256 coinciden, el servidor no esta sirviendo algo que varia. Si no coinciden,
// esta sesion no tiene fuente y para.
//
// sha256 por crypto, no por sha256sum (CLAUDE.md).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const PDF = 'DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.pdf';
const TXT = 'DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.txt';

// sha256 medido en el GATE sobre la sonda al scratchpad, 2026-08-20 ~20:24 UTC.
const SHA_DEL_GATE = 'a9045b8801adff2240d6c8327800750d16d33ac578d06ceb73bf17111f6fc005';

function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

const say = (s) => console.log(s);

say('P1 - DESCARGA Y CADENA DE CUSTODIA');
say('='.repeat(78));
say('');
say('FUENTE');
say('  D.G.T.M. y M.M. Ord. Exenta N 12100/47 Vrs., del 01 de septiembre de 2009,');
say('  modificada por ultima vez el 16 de agosto de 2021.');
say('  URL: https://www.directemar.cl/directemar/site/docs/20170203/20170203111813/' +
    '12100_47_010909_dgtm__modificado_el_270821_.pdf');
say('  Fecha de consulta: 2026-08-20, 16:35 (UTC-04:00) / 20:35 UTC');
say('  Metodo: curl.exe -sS -L -D headers_crudos.txt -o <archivo>. HTTP 200.');
say('  Sin autenticacion, sin JS.');
say('');

say('LOS ARCHIVOS');
const filas = [];
for (const f of [PDF, TXT]) {
  const p = path.join(DIR, f);
  const b = fs.readFileSync(p);
  // DEFINICION: lineas = saltos de linea, igual que wc -l. El fichero termina en \n,
  // asi que split('\n') devuelve una pieza mas: la cadena vacia posterior al ultimo
  // salto, que no es una linea. Se resta. Sin esto el rotulo diria "wc -l" y el
  // numero seria otro - el defecto de instrumento de siempre.
  const lineas = f.endsWith('.txt') ? b.toString('utf8').split('\n').length - 1 : null;
  filas.push({ f, bytes: b.length, sha: sha256(p), lineas });
}
for (const r of filas) {
  say('  ' + r.f);
  say('    bytes  : ' + r.bytes.toLocaleString('es-CL'));
  if (r.lineas !== null) say('    lineas : ' + r.lineas.toLocaleString('es-CL') + '   (definicion: saltos de linea, wc -l)');
  say('    sha256 : ' + r.sha);
}
say('');

say('CONTROL DE ESTABILIDAD DE LA FUENTE (positivo)');
const shaPdf = filas[0].sha;
say('  sha256 medido en el gate (sonda al scratchpad, ~20:24 UTC) :');
say('    ' + SHA_DEL_GATE);
say('  sha256 medido ahora (descarga a la bitacora, 20:35 UTC)    :');
say('    ' + shaPdf);
const estable = shaPdf === SHA_DEL_GATE;
say('  VEREDICTO: ' + (estable
  ? 'IDENTICOS. Dos descargas independientes, 11 minutos aparte, mismo byte.'
  : 'DISTINTOS. El servidor sirve algo que varia. LA SESION PARA ACA.'));
say('');
say('  Lo que este control NO prueba: que este PDF sea la version VIGENTE de la');
say('  resolucion. Prueba que la URL sirve siempre lo mismo, no que lo que sirve');
say('  siga sin derogar. Mismo limite que el declarado en');
say('  data/decreto/fuente_resoluciones_locales/PROCEDENCIA.md. Por eso se registra');
say('  la fecha de consulta.');
say('');

say('CAPA DE TEXTO');
say('  pdftotext version 4.06 [www.xpdfreader.com] - Glyph & Cog');
say('  Es el MISMO binario con que se produjeron los .txt de data/decreto/fuente/ y');
say('  de data/decreto/fuente_resoluciones_locales/. Vale la misma deuda declarada');
say('  alla: pdftotext de poppler-utils no es el de xpdf y no esta comprobado que');
say('  produzcan el mismo byte.');
say('  Comando: pdftotext -layout -enc UTF-8 <pdf> <txt>   (exit 0)');
say('  4 de las 19 resoluciones locales leidas el 2026-08-12 eran escaneos SIN capa');
say('  de texto. Esta NO lo es: 57.213 bytes extraidos.');
say('');

say('CLASE DEL DOCUMENTO');
say('  RECONOCIMIENTO - fuente citable, no incorporada.');
say('  Origen: VERIFICADO por consulta propia con URL (no RECORDADO).');
say('  No se promueve a data/decreto/. Nada de esto se incorpora a ningun insumo y');
say('  nada adjudica nada.');
say('');

process.exit(estable ? 0 : 3);
