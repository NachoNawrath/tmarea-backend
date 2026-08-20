// Control contra el INDICE, no contra el disco. Es la regla que costo 2d47022,
// que commiteo un indice obsoleto: el mensaje decia 36 filas y el objeto tenia 34.
//
// Toda cifra que vaya al mensaje de commit sale de `git show :ruta`.
// Y verifica explicitamente que los INTOCABLES no entraron.
//
// SOBRE FINALES DE LINEA, declarado porque ya mordio una vez en este repositorio:
// git guarda el blob con LF. Comparar el sha256 del blob contra el sha256 del
// fichero en disco puede dar distinto SIN que el contenido difiera. Por eso la
// comparacion indice-vs-disco se hace sobre el texto NORMALIZADO a LF, y ademas
// se informa si hubo normalizacion.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const git = (...args) => execFileSync('git', ['-C', RAIZ, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const gitBuf = (...args) => execFileSync('git', ['-C', RAIZ, ...args], { maxBuffer: 64 * 1024 * 1024 });

const fallos = [];
const chk = (nombre, cond, detalle) => {
  console.log('  ' + (cond ? 'ok  ' : 'MAL ') + nombre + (detalle ? '  ->  ' + detalle : ''));
  if (!cond) fallos.push(nombre);
};

console.log('CONTROL CONTRA EL INDICE — las cifras del commit salen de aca');
console.log('');

// --- 1. que esta stageado, exactamente ---------------------------------------
const stageado = git('diff', '--cached', '--name-only').trim().split('\n').filter(Boolean);
console.log('  ficheros en el INDICE (' + stageado.length + '):');
stageado.forEach(f => console.log('      ' + f));
console.log('');

// --- 2. LOS INTOCABLES NO ENTRARON -------------------------------------------
const INTOCABLES = ['.claude/launch.json', 'data/catalogo/estado_drift.json'];
for (const i of INTOCABLES) {
  chk('intocable FUERA del indice: ' + i, !stageado.includes(i));
}
const modificados = git('status', '--porcelain').split('\n').filter(l => l.startsWith(' M'));
chk('los dos intocables siguen modificados y sin stagear',
    modificados.length === 2 && INTOCABLES.every(i => modificados.some(l => l.includes(i))),
    modificados.map(l => l.trim()).join(' | '));

// --- 3. el declarativo DEL INDICE, validado por su propio validador ----------
const tmp = path.join(os.tmpdir(), 'declarativo_del_indice_' + process.pid + '.json');
fs.writeFileSync(tmp, gitBuf('show', ':data/deudas/deudas_declaradas.json'));

let salida = '';
try {
  salida = execFileSync(process.execPath,
    [path.join(RAIZ, 'scripts/validar_deudas_declaradas.js'), '--fichero', tmp],
    { encoding: 'utf8' });
} catch (e) { salida = (e.stdout || '') + (e.stderr || ''); }

const num = (re) => { const m = salida.match(re); return m ? Number(m[1]) : null; };
const CIFRAS = {
  sitios:     num(/sitios en la canon\s*:\s*(\d+)/),
  barridos:   num(/barridos\s*:\s*(\d+)/),
  sinBarrer:  num(/sin barrer\s*:\s*(\d+)/),
  filas:      num(/^\s*filas\s*:\s*(\d+)/m),
  unicas:     num(/deudas unicas \(sin duplicadas\)\s*:\s*(\d+)/),
  vivas:      num(/VIVAS\s*:\s*(\d+)/),
  cerradas:   num(/CERRADAS por trabajo:\s*(\d+)/),
};
console.log('');
console.log('  CIFRAS LEIDAS DEL OBJETO DEL INDICE:');
Object.entries(CIFRAS).forEach(([k, v]) => console.log('      ' + k.padEnd(12) + v));
console.log('');

chk('el declarativo DEL INDICE sale VERDE', /\nVERDE/.test(salida));
chk('sitios 20',      CIFRAS.sitios === 20);
chk('barridos 11',    CIFRAS.barridos === 11);
chk('SIN BARRER 9 — no se barrio ninguno de los nueve', CIFRAS.sinBarrer === 9);
chk('filas 72',       CIFRAS.filas === 72);
chk('unicas 70',      CIFRAS.unicas === 70);
chk('VIVAS 64',       CIFRAS.vivas === 64);
chk('CERRADAS por trabajo sigue en 2 — nadie cerro nada hoy', CIFRAS.cerradas === 2);

// --- 4. el contenido del INDICE dice lo que el commit va a decir -------------
const D = JSON.parse(fs.readFileSync(tmp, 'utf8'));
const porId = Object.fromEntries(D.deudas.map(d => [d.id, d]));
const SITIO = 'SESION-plan-de-cierre-2026-08-20';

const z = porId['PLAN-2::zarpe-y-recalada-entran-como-transito'];
chk('la caducada esta en 4_caduca/caduca EN EL INDICE',
    z && z.grupo === '4_caduca' && z.estado === 'caduca', z ? z.grupo + '/' + z.estado : 'no esta');
chk('la caducada trae afirmacion_que_ya_es_falsa', !!(z && z.afirmacion_que_ya_es_falsa));
chk('la caducada trae las cuatro claves de medicion que el grupo 4 exige',
    !!(z && z.medicion && z.medicion.hecha_el && z.medicion.instrumento && z.medicion.resultado && z.medicion.salida_cruda_en));
chk('a la caducada se le retiraron costo_estimado y depende_de',
    !!z && z.costo_estimado === undefined && z.depende_de === undefined);

const nuevas = [
  SITIO + '::una-anulacion-de-spec-no-propaga-sola',
  SITIO + '::un-entregable-que-solo-vive-en-el-chat-no-existe',
  SITIO + '::color-del-dato-que-no-se-pudo-traer',
  SITIO + '::jurisdiccion-por-trayecto-o-por-extremos',
];
nuevas.forEach(id => chk('fila EN EL INDICE: ' + id.replace(SITIO + '::', ''), !!porId[id]));
chk('las dos del grupo 2 son del grupo 2',
    ['color-del-dato-que-no-se-pudo-traer', 'jurisdiccion-por-trayecto-o-por-extremos']
      .every(s => porId[SITIO + '::' + s].grupo === '2_decision_del_owner'));
chk('las dos del gate son del grupo 1',
    ['una-anulacion-de-spec-no-propaga-sola', 'un-entregable-que-solo-vive-en-el-chat-no-existe']
      .every(s => porId[SITIO + '::' + s].grupo === '1_cierra_con_lo_que_hay'));
chk('las cuatro nacen SIN FIRMAR — son preguntas y deudas, no decisiones',
    nuevas.every(id => porId[id].firma_owner.firmada === false));
chk('la pregunta del trayecto trae la medicion adentro, como pidio el owner',
    /213\.639\.480/.test(porId[SITIO + '::jurisdiccion-por-trayecto-o-por-extremos'].pregunta));

// --- 5. el sitio esta a los DOS lados ----------------------------------------
const sitioEnDato = D.cobertura.sitios.find(s => s.id === SITIO);
chk('el sitio esta en cobertura.sitios DEL INDICE', !!sitioEnDato);
chk('declara 4 filas y tiene 4', sitioEnDato && sitioEnDato.filas_en_este_declarativo === 4);
const validadorIndice = gitBuf('show', ':scripts/validar_deudas_declaradas.js').toString('utf8');
chk('el sitio esta en SITIOS_CANON DEL INDICE', validadorIndice.includes("'" + SITIO + "'"));
chk('PLAN-5-DECISIONES y CLAUDE-MD siguen barrido=false',
    ['PLAN-5-DECISIONES', 'CLAUDE-MD'].every(id => D.cobertura.sitios.find(s => s.id === id).barrido === false));

// --- 6. la bitacora del indice trae lo que dice traer ------------------------
const bitIndice = gitBuf('show', ':_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt').toString('utf8');
[['el apartado 10', '10 . LO QUE EL OWNER RESOLVIO'],
 ['G6 opcion (c): el PLAN no se toca', 'G6 · OPCION (c)'],
 ['S7(a) no se firma', 'S7(a) · NO SE FIRMA HOY'],
 ['la aritmetica de las vivas', '61 + 4 - 1 = 64'],
 ['la cifra de §2 no se movio', '4 de 15, con 2 anuladas']
].forEach(([n, tok]) => chk('bitacora DEL INDICE trae ' + n, bitIndice.includes(tok)));

// --- 7. indice vs disco, normalizando finales de linea -----------------------
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 12);
let normalizados = 0;
for (const rel of stageado) {
  const idx = gitBuf('show', ':' + rel).toString('utf8');
  const dsk = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const nIdx = idx.replace(/\r\n/g, '\n'), nDsk = dsk.replace(/\r\n/g, '\n');
  if (idx !== nIdx || dsk !== nDsk) normalizados++;
  chk('indice == disco: ' + rel, nIdx === nDsk, sha(nIdx) + ' / ' + sha(nDsk));
}
chk('el PLAN_JURISDICCION.md NO esta en el indice — es la opcion (c) de G6',
    !stageado.includes('PLAN_JURISDICCION.md'));
chk('ningun fichero de src/ entro al indice', !stageado.some(f => f.startsWith('src/')));

console.log('');
console.log('  ficheros que hicieron falta normalizar a LF para comparar: ' + normalizados);
fs.unlinkSync(tmp);

console.log('');
console.log(fallos.length ? 'ROJO -- ' + fallos.length + ' fallo(s): ' + fallos.join(' · ') : 'VERDE');
process.exit(fallos.length ? 1 : 0);
