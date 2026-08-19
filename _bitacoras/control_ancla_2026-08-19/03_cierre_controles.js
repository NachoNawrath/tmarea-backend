#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
// 03_cierre_controles.js - (a1)-T
//
// Tres cosas de cierre, ninguna toca la base:
//   (1) congela la EVIDENCIA de H-T1 -- el estado_drift.json modificado y sin
//       stagear que trae un drift NO DECLARADO -- SIN TOCAR el fichero en su
//       ruta, y le escribe su PROCEDENCIA;
//   (2) corre el control de caracteres de control sobre los BYTES de TODO
//       fichero que esta sesion escribe;
//   (3) publica las huellas con su clase.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const ORIGEN_HT1 = path.join(RAIZ, 'data/catalogo/estado_drift.json');
const COPIA_HT1 = path.join(__dirname, 'HT1_estado_drift_working_tree_2026-08-19.json');
const PROC_HT1 = path.join(__dirname, 'HT1_PROCEDENCIA.txt');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det !== undefined ? ' - ' + det : ''));
  else { fallas.push(n); say('  x ROJO - ' + n + (det !== undefined ? ' - ' + det : '')); }
};
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const rel = p => path.relative(RAIZ, p).split(path.sep).join('/');
// El criterio vive en un solo lugar y lo mide su propia mordida
// (08_mordida_control_caracteres.js). La primera version de este script lo
// llevaba escrito inline y solo miraba `b < 0x20`: no habria cazado el U+0091
// crudo -- que en UTF-8 son 0xC2 0x91 -- ni un DEL. Medido, no supuesto.
const { controlesEnBytes } = require('./lib_control_caracteres');

say('='.repeat(78));
say('(a1)-T - CIERRE DE CONTROLES DE LA SESION');
say('corrida ' + new Date().toISOString());
say('='.repeat(78));

// ── (1) H-T1 ────────────────────────────────────────────────────────────────
say('');
say('1 - H-T1: CONGELAR LA EVIDENCIA SIN TOCAR EL FICHERO EN SU RUTA');
const bytesOrigen = fs.readFileSync(ORIGEN_HT1);
const shaOrigen = sha(bytesOrigen);
const antes = fs.statSync(ORIGEN_HT1).mtimeMs;
fs.writeFileSync(COPIA_HT1, bytesOrigen);
const despues = fs.statSync(ORIGEN_HT1).mtimeMs;
exigir('el fichero de origen NO se modifico (misma mtime antes y despues)', antes === despues, String(antes));
exigir('la copia es byte a byte identica al origen', sha(fs.readFileSync(COPIA_HT1)) === shaOrigen, shaOrigen.slice(0, 12) + '...');

const estado = JSON.parse(bytesOrigen.toString('utf8'));
const noDeclaradas = (estado.divergencias || []).filter(d => d.estado === 'no_declarada');
say('    veredicto que trae la copia .......... ' + estado.veredicto);
say('    universo_sitport ..................... ' + estado.universo_sitport + '   (unidad: ids de bahia)');
say('    divergencias en total ................ ' + (estado.divergencias || []).length);
say('    de esas, NO DECLARADAS ............... ' + noDeclaradas.length);
for (const d of noDeclaradas) say('      id_bahia ' + d.id_bahia + '  ' + d.clase + '  ' + (d.nombre_sitport || '(sin nombre)'));

const proc = [
  'PROCEDENCIA - H-T1 - EVIDENCIA CONGELADA, NO ES UNA DECLARACION',
  '='.repeat(78),
  '',
  'QUE ES: una copia byte a byte de data/catalogo/estado_drift.json tal como',
  'estaba en el working tree del 2026-08-19, MODIFICADO Y SIN STAGEAR.',
  '',
  'NINGUN FICHERO DEL REPOSITORIO LA LEE. No decide nada, no la consulta ningun',
  'control y no reemplaza al fichero de su ruta. Solo testimonia. Esa es la',
  'condicion con la que el owner aprobo congelarla, y es lo que impide que se',
  'mezclen dos preguntas: la copia no puede actuar.',
  '',
  'POR QUE SE CONGELA: la evidencia vivia SOLO en el working tree. Un git',
  'checkout, un npm run drift, o simplemente arrancar el backend -- que re-corre',
  'el control de drift -- la habrian sobrescrito, y con ella el unico registro de',
  'que SITPORT sumo una bahia que nadie declaro. Anotar un hallazgo cuya unica',
  'evidencia puede evaporarse es no anotar nada.',
  '',
  'RUTA DE ORIGEN : data/catalogo/estado_drift.json',
  'FECHA DE COPIA : 2026-08-19',
  'EL FICHERO EN SU RUTA NO SE TOCO. Se comprobo comparando su mtime antes y',
  'despues de la copia, y esta en la salida cruda de 03_cierre_controles.txt.',
  '',
  'sha256 : ' + shaOrigen,
  'CLASE (FA-4): sha256 sobre los BYTES DEL FICHERO EN DISCO, tal como lo dejo',
  'la ultima corrida del control de drift en esta maquina. Con core.autocrlf=true',
  'y sin .gitattributes el blob de git puede no ser el mismo byte -- ver H-10 de',
  '_bitacoras/coordenada_corrida_2026-08-19/.',
  'tamano : ' + bytesOrigen.length + ' bytes',
  '',
  'QUE SE EXTRAJO DE EL, y es lo que el hash no dice:',
  '  · veredicto ' + estado.veredicto + ' (el fichero commiteado en 9d459e9 dice DRIFT_DECLARADO_ABIERTO)',
  '  · universo_sitport ' + estado.universo_sitport + ' (el commiteado dice 165)',
  '  · ' + noDeclaradas.length + ' divergencia(s) NO DECLARADA(S): ' +
    noDeclaradas.map(d => 'id ' + d.id_bahia + ' ' + d.clase).join(' · '),
  '  · ultima_corrida ' + estado.ultima_corrida,
  '',
  'COMO SE VOLVERIA A CAPTURAR: no se puede. Correr el control de drift de nuevo',
  'produce OTRA medicion, no esta. Por eso se congela en vez de anotarse la orden.',
  '',
  'QUE SIGUE: H-T1 quedo aprobado como (T1b) -- anotado, no aplicado. Triarlo y',
  'declararlo en data/catalogo/divergencias_declaradas.json es pieza propia.',
  '',
].join('\n');
fs.writeFileSync(PROC_HT1, proc, { encoding: 'utf8' });
say('    ' + rel(COPIA_HT1));
say('    ' + rel(PROC_HT1));

// ── (2) y (3) ───────────────────────────────────────────────────────────────
const ESCRITOS = [
  'data/catalogo/anclas_declaradas.json',
  'src/services/anclas-declaradas.js',
  'scripts/control_ancla_declarada.js',
  'scripts/prueba_mordida_ancla.js',
  'package.json',
  'PLAN_JURISDICCION.md',
  '_bitacoras/control_ancla_2026-08-19/00_gate_premisas.js',
  '_bitacoras/control_ancla_2026-08-19/00_gate_premisas.txt',
  '_bitacoras/control_ancla_2026-08-19/01_construir_declarativo.js',
  '_bitacoras/control_ancla_2026-08-19/01_construir_declarativo.txt',
  '_bitacoras/control_ancla_2026-08-19/02_congelar_par.js',
  '_bitacoras/control_ancla_2026-08-19/02_congelar_par.txt',
  '_bitacoras/control_ancla_2026-08-19/02_par_lectura_781_2026-08-19.json',
  '_bitacoras/control_ancla_2026-08-19/02_par_declaracion_2026-08-19.json',
  '_bitacoras/control_ancla_2026-08-19/03_cierre_controles.js',
  '_bitacoras/control_ancla_2026-08-19/04_control_ancla.txt',
  '_bitacoras/control_ancla_2026-08-19/05_prueba_mordida.txt',
  '_bitacoras/control_ancla_2026-08-19/06_suite.txt',
  '_bitacoras/control_ancla_2026-08-19/07_mordida_de_las_guardas.js',
  '_bitacoras/control_ancla_2026-08-19/07_mordida_de_las_guardas.txt',
  '_bitacoras/control_ancla_2026-08-19/08_mordida_control_caracteres.js',
  '_bitacoras/control_ancla_2026-08-19/08_mordida_control_caracteres.txt',
  '_bitacoras/control_ancla_2026-08-19/lib_control_caracteres.js',
  '_bitacoras/control_ancla_2026-08-19/HT1_estado_drift_working_tree_2026-08-19.json',
  '_bitacoras/control_ancla_2026-08-19/HT1_PROCEDENCIA.txt',
  '_bitacoras/control_ancla_2026-08-19/control_ancla_2026-08-19.txt',
];

say('');
say('2 - CARACTERES DE CONTROL SOBRE LOS BYTES DE CADA FICHERO QUE LA SESION ESCRIBE');
say('    Criterio (lib_control_caracteres.js, con su mordida en 08_):');
say('      (a) byte < 0x20 que no sea LF ni CR   -> C0');
say('      (b) byte 0x7F                          -> DEL');
say('      (c) byte 0xC2 seguido de 0x80..0x9F    -> C1 codificado en UTF-8');
say('    La (c) faltaba en la primera version de este script y es la que importa aca:');
say('    el U+0091 del nodo 656 son los bytes 0xC2 0x91 y ninguno es < 0x20.');
say('    Corre sobre los BYTES, no sobre el string parseado. En los ficheros de esta');
say('    sesion ese caracter va ESCAPADO -- seis bytes ASCII -- a proposito (H-8), y');
say('    por eso NO cuenta como control: es dato declarado, no un hallazgo.');
say('');
say('3 - HUELLAS. CLASE (FA-4): sha256 sobre los BYTES DEL FICHERO EN DISCO.');
say('');
say('    DENOMINADOR: ' + (ESCRITOS.length + 1) + ' ficheros, que es TODO lo que esta sesion escribe.');
say('    En el bucle de abajo van ' + ESCRITOS.length + '. El que falta es el .txt que este mismo');
say('    script produce: no puede hashearse en el bucle porque todavia no existe, y');
say('    por eso va aparte al final. En la PARADA 2 esa diferencia de uno quedo sin');
say('    denominador declarado, y esto la cierra.');
say('');
let faltantes = 0;
const revisar = (p, r) => {
  const b = fs.readFileSync(p);
  const malos = controlesEnBytes(b);
  if (malos.length > 0) fallas.push('controles en ' + r);
  say('  ' + (malos.length === 0 ? 'ok' : 'x ') + ' ' + String(b.length).padStart(7) + ' bytes  ' +
    sha(b).slice(0, 16) + '  ' + r +
    (malos.length ? '   <-- ' + malos.length + ' CONTROL(ES): ' + malos.map(m => m.clase + '@' + m.offset).join(' ') : ''));
};
for (const r of ESCRITOS) {
  const p = path.join(RAIZ, r);
  if (!fs.existsSync(p)) { faltantes++; say('  -- ' + r + '  (todavia no existe en esta corrida)'); continue; }
  revisar(p, r);
}
if (faltantes > 0) {
  say('');
  say('  ' + faltantes + ' fichero(s) de la lista todavia no existen: esta corrida es previa a');
  say('  escribirlos. Se vuelve a correr al final y ahi la lista tiene que estar completa.');
}

say('');
say('='.repeat(78));
say(fallas.length ? 'ROJO - ' + fallas.length
  : 'VERDE - sin caracteres de control fuera de LF/CR' +
    (faltantes ? ' (con ' + faltantes + ' de ' + (ESCRITOS.length + 1) + ' fichero(s) pendientes)'
      : ' en ' + ESCRITOS.length + ' de ' + (ESCRITOS.length + 1) + '; falta este .txt, abajo'));
say('='.repeat(78));

// El .txt de este script se escribe y RECIEN AHI se puede revisar. Sin este
// paso el denominador seria uno menos que el diffstat, que es exactamente la
// diferencia que hubo que explicar en la PARADA 2.
const RUTA_TXT = path.join(__dirname, '03_cierre_controles.txt');
const REL_TXT = rel(RUTA_TXT);
fs.writeFileSync(RUTA_TXT, L.length ? L.join('\n') + '\n' : '', { encoding: 'utf8' });
const bTxt = fs.readFileSync(RUTA_TXT);
const malosTxt = controlesEnBytes(bTxt);
const cierre = [
  '',
  'CIERRE - el fichero numero ' + (ESCRITOS.length + 1) + ', que es la salida de este mismo script',
  '  ' + (malosTxt.length === 0 ? 'ok' : 'x ') + ' ' + String(bTxt.length).padStart(7) + ' bytes  ' +
    sha(bTxt).slice(0, 16) + '  ' + REL_TXT,
  '  (su sha256 es el del fichero SIN estas lineas de cierre; el fichero final las lleva)',
  malosTxt.length === 0
    ? 'VERDE - los ' + (ESCRITOS.length + 1) + ' ficheros, sin excepcion, sin caracteres de control fuera de LF/CR.'
    : 'ROJO - ' + malosTxt.length + ' control(es) en el propio .txt',
  '='.repeat(78),
  '',
].join('\n');
fs.appendFileSync(RUTA_TXT, cierre, { encoding: 'utf8' });
if (malosTxt.length > 0) fallas.push('controles en ' + REL_TXT);
console.log(cierre);
process.exit(fallas.length ? 2 : 0);
