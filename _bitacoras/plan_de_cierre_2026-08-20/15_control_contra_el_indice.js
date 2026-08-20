// Control contra el INDICE para el commit de (m1). Misma regla que 04: toda
// cifra que vaya al mensaje sale de `git show :ruta`, no del disco.
// Agrega dos aserciones nuevas, una por cada defecto que mordio en esta tanda:
//   por D4 -> ninguna fila del declarativo sin id
//   por D6 -> ningun fichero del indice con BOM
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const git = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const gitBuf = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { maxBuffer: 64 * 1024 * 1024 });

const fallos = [];
const chk = (n, c, d) => { console.log('  ' + (c ? 'ok  ' : 'MAL ') + n + (d ? '  ->  ' + d : '')); if (!c) fallos.push(n); };

console.log('CONTROL CONTRA EL INDICE — commit de (m1)');
console.log('');
const stageado = git('diff', '--cached', '--name-only').trim().split('\n').filter(Boolean);
console.log('  ficheros en el INDICE (' + stageado.length + '):');
stageado.forEach(f => console.log('      ' + f));
console.log('');

// --- los intocables y lo que NO entra ---------------------------------------
const INTOCABLES = ['.claude/launch.json', 'data/catalogo/estado_drift.json'];
INTOCABLES.forEach(i => chk('intocable FUERA del indice: ' + i, !stageado.includes(i)));
const modif = git('status', '--porcelain').split('\n').filter(l => l.startsWith(' M')).map(l => l.slice(3).trim());
chk('los dos intocables siguen modificados y sin stagear',
    modif.length === 2 && INTOCABLES.every(i => modif.includes(i)), modif.join(' | '));
chk('PLAN_JURISDICCION.md NO entro', !stageado.includes('PLAN_JURISDICCION.md'));
chk('ningun src/ entro', !stageado.some(f => f.startsWith('src/')));
chk('NINGUN fichero de tools/ entro — el instrumento trackeado no se modifico',
    !stageado.some(f => f.startsWith('tools/')));

// --- el declarativo DEL INDICE ----------------------------------------------
const tmp = path.join(os.tmpdir(), 'decl_indice_m1_' + process.pid + '.json');
fs.writeFileSync(tmp, gitBuf('show', ':data/deudas/deudas_declaradas.json'));
let salida = '';
try {
  salida = execFileSync(process.execPath,
    [path.join(RAIZ, 'scripts/validar_deudas_declaradas.js'), '--fichero', tmp], { encoding: 'utf8' });
} catch (e) { salida = (e.stdout || '') + (e.stderr || ''); }
const num = (re) => { const m = salida.match(re); return m ? Number(m[1]) : null; };
const C = {
  sitios: num(/sitios en la canon\s*:\s*(\d+)/),
  barridos: num(/barridos\s*:\s*(\d+)/),
  sinBarrer: num(/sin barrer\s*:\s*(\d+)/),
  filas: num(/^\s*filas\s*:\s*(\d+)/m),
  unicas: num(/deudas unicas \(sin duplicadas\)\s*:\s*(\d+)/),
  vivas: num(/VIVAS\s*:\s*(\d+)/),
  cerradas: num(/CERRADAS por trabajo:\s*(\d+)/),
};
console.log('');
console.log('  CIFRAS DEL OBJETO DEL INDICE: ' + JSON.stringify(C));
chk('el declarativo DEL INDICE sale VERDE', /\nVERDE/.test(salida));
chk('filas 74', C.filas === 74);
chk('unicas 72', C.unicas === 72);
chk('VIVAS 66', C.vivas === 66);
chk('sitios 20 · barridos 11', C.sitios === 20 && C.barridos === 11);
chk('SIN BARRER 9 — no se barrio ninguno', C.sinBarrer === 9);
chk('CERRADAS por trabajo sigue en 2', C.cerradas === 2);

const D = JSON.parse(fs.readFileSync(tmp, 'utf8'));
const porId = Object.fromEntries(D.deudas.map(d => [d.id, d]));
const S = 'SESION-plan-de-cierre-2026-08-20';

// ASERCION NUEVA, POR D4
const sinId = D.deudas.filter(d => !d.id).length;
chk('ASERCION POR D4: ninguna fila sin id', sinId === 0, sinId + ' sin id');

const m1 = porId[S + '::las-cuatro-lacustres-son-TRES-causas-y-esta-medido'];
chk('la fila de (m1) esta en el indice', !!m1);
const e = m1 ? m1.evidencia_en_el_arbol : {};
chk('dice el hallazgo con las palabras del owner',
    !!e.EL_HALLAZGO_DE_LA_SESION_CON_LAS_PALABRAS_DEL_OWNER &&
    /EL VALOR DE LA CELDA NO SEPARA LAGO DE MAR/.test(e.EL_HALLAZGO_DE_LA_SESION_CON_LAS_PALABRAS_DEL_OWNER) &&
    /2278 y 3644 contra 0 de 6561/.test(e.EL_HALLAZGO_DE_LA_SESION_CON_LAS_PALABRAS_DEL_OWNER));
chk('dice lo que NO midio', !!e.LO_QUE_ESTA_MEDICION_NO_MIDIO_Y_SE_DICE &&
    /SIGUE SIENDO INFERENCIA/.test(e.LO_QUE_ESTA_MEDICION_NO_MIDIO_Y_SE_DICE));
chk('dice que U7 tiene TRES costos', !!e.LO_QUE_ESTO_LE_HACE_A_U7_DEL_PLAN &&
    /TIENE TRES/.test(e.LO_QUE_ESTO_LE_HACE_A_U7_DEL_PLAN));
chk('anota pyproj 3.7.2 como lo unico del entorno',
    !!e.LO_UNICO_QUE_SE_TOCO_DEL_ENTORNO && /pyproj 3\.7\.2/.test(e.LO_UNICO_QUE_SE_TOCO_DEL_ENTORNO));

const corral = porId[S + '::corral-falla-en-un-instrumento-trackeado-y-nadie-lo-sabia'];
chk('la fila de CORRAL esta en el indice', !!corral);
chk('CORRAL dice el fallo', !!corral && /esperado AGUA, obtenido TIERRA/.test(JSON.stringify(corral)));
chk('CORRAL dice que se supo solo porque se instalo el pin',
    !!corral && /SE DESCUBRIO SOLO PORQUE ALGUIEN INSTALO EL PIN/.test(JSON.stringify(corral)));
chk('CORRAL dice que un instrumento que no corre no reporta verde',
    !!corral && /NO REPORTA NADA, Y ESO NO ES LO MISMO QUE REPORTAR\s+VERDE/.test(JSON.stringify(corral).replace(/\\n/g, ' ')));
chk('CORRAL esta redactada y no aplicada', !!corral && corral.redactada_no_aplicada === true);
const sitio = D.cobertura.sitios.find(x => x.id === S);
chk('el sitio declara 6 filas', sitio && sitio.filas_en_este_declarativo === 6);

// --- la bitacora del indice --------------------------------------------------
const bit = gitBuf('show', ':_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt').toString('utf8');
const bitPlano = bit.replace(/\s+/g, ' ');   // por D3: nunca literal contra prosa envuelta
console.log('');
[['el apartado 12', '12 . (m1) — CHECK_CONTROL_POINTS'],
 ['el hallazgo del control positivo', 'EL VALOR DE LA CELDA NO SEPARA LAGO DE MAR'],
 ['que U7 tiene tres costos', 'U7 NO TIENE UN COSTO: TIENE TRES'],
 ['que solo el extent deja tres sin ruta', 'ARREGLAR SOLO EL EXTENT DEJA TRES DE LOS CUATRO SIN RUTA'],
 ['lo que no se midio', 'La medicion prueba la AUSENCIA; no prueba la CAUSA'],
 ['pyproj como unica mutacion', 'pyproj 3.7.2'],
 ['la leccion de Corral', 'UN INSTRUMENTO QUE NO CORRE NO REPORTA NADA'],
 ['D6, el BOM', 'D6 · BOM Y CRLF'],
 ['la enmienda de la cabecera de U7', '~~hoy: UNA MEDICION QUE FALTA~~']
].forEach(([n, t]) => chk('bitacora DEL INDICE trae ' + n, bitPlano.includes(t.replace(/\s+/g, ' '))));

// --- indice vs disco, y ASERCION NUEVA POR D6 -------------------------------
console.log('');
let bom = 0;
for (const rel of stageado) {
  const idx = gitBuf('show', ':' + rel).toString('utf8');
  const dsk = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  if (idx.charCodeAt(0) === 0xFEFF) { bom++; console.log('      BOM en el indice: ' + rel); }
  if (idx.replace(/\r\n/g, '\n') !== dsk.replace(/\r\n/g, '\n')) chk('indice != disco: ' + rel, false);
}
chk('indice == disco en los ' + stageado.length + ' ficheros', true);
chk('ASERCION POR D6: ningun fichero del indice arranca con BOM', bom === 0, bom + ' con BOM');

fs.unlinkSync(tmp);
console.log('');
console.log(fallos.length ? 'ROJO -- ' + fallos.length + ': ' + fallos.join(' · ') : 'VERDE');
process.exit(fallos.length ? 1 : 0);
