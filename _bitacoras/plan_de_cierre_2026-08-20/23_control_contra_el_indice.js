// Control contra el INDICE para el commit de (m2). Misma regla que 04: toda
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
chk('filas 75', C.filas === 75);
chk('unicas 73', C.unicas === 73);
chk('VIVAS 67', C.vivas === 67);
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
chk('el sitio declara 7 filas', sitio && sitio.filas_en_este_declarativo === 7);

// --- la bitacora del indice --------------------------------------------------
const bit = gitBuf('show', ':_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt').toString('utf8');
// por D3, y su SEGUNDA VUELTA, medida en esta misma corrida: normalizar el
// espacio NO ALCANZA. Un prefijo de linea — el '>' de un bloque de cita —
// SOBREVIVE a la normalizacion y parte el token igual. Se retiran los prefijos
// de linea ANTES de normalizar.
const bitPlano = bit
  .split(/\r?\n/)
  .map(l => l.replace(/^\s*>\s?/, ''))
  .join(' ')
  .replace(/\s+/g, ' ');
console.log('');
[['el apartado 12', '12 . (m1) — CHECK_CONTROL_POINTS'],
 ['el apartado 13', '13 . (m2) — LOS OCHO PUNTOS CONTRA LAS SEIS'],
 ['la regla del control positivo', 'UN CONTROL POSITIVO QUE FALLA SE SOSPECHA A SI MISMO'],
 ['el traslape citado del build', 'Lago Ranco (lacustre) x Puerto Varas (lacustre) = 155.426 km2'],
 ['que el control negativo no discrimina', 'NO DISCRIMINA'],
 ['el hallazgo del control positivo', 'EL VALOR DE LA CELDA NO SEPARA LAGO DE MAR'],
 ['que U7 tiene tres costos', 'U7 NO TIENE UN COSTO: TIENE TRES'],
 ['que solo el extent deja tres sin ruta', 'ARREGLAR SOLO EL EXTENT DEJA TRES DE LOS CUATRO SIN RUTA'],
 ['lo que no se midio', 'La medicion prueba la AUSENCIA; no prueba la CAUSA'],
 ['pyproj como unica mutacion', 'pyproj 3.7.2'],
 ['la leccion de Corral', 'UN INSTRUMENTO QUE NO CORRE NO REPORTA NADA'],
 ['D6, el BOM', 'D6 · BOM Y CRLF'],
 ['la enmienda de la cabecera de U7', '~~hoy: UNA MEDICION QUE FALTA~~']
].forEach(([n, t]) => chk('bitacora DEL INDICE trae ' + n, bitPlano.includes(t.replace(/\s+/g, ' '))));

// --- lo que ESTE commit agrega: la fila de (m2) y el apartado 13 -----------
const m2 = porId[S + '::los-ocho-puntos-caen-en-su-jurisdiccion-y-eso-desacopla-S4-a-medias'];
chk('la fila de (m2) esta en el indice', !!m2);
const e2 = m2 ? m2.evidencia_en_el_arbol : {};
chk('(m2) trae la REGLA del control positivo, con sus palabras',
    !!e2.LA_REGLA_QUE_HAY_QUE_PRESERVAR_DE_ESTA_SESION &&
    /SE SOSPECHA A SI MISMO ANTES DE ACUSAR AL DATO/.test(e2.LA_REGLA_QUE_HAY_QUE_PRESERVAR_DE_ESTA_SESION) &&
    /5 DE 6/.test(e2.LA_REGLA_QUE_HAY_QUE_PRESERVAR_DE_ESTA_SESION) &&
    /ACUSADO A LA CAPA DE UN DEFECTO QUE NO TIENE/.test(e2.LA_REGLA_QUE_HAY_QUE_PRESERVAR_DE_ESTA_SESION));
chk('(m2) trae el cruce con (m1), con sus palabras',
    !!e2.EL_CRUCE_DE_M1_CON_M2_Y_ES_LO_QUE_IMPIDE_LEER_MAL_ESTA_FILA &&
    /LAS DOS CIERTAS/.test(e2.EL_CRUCE_DE_M1_CON_M2_Y_ES_LO_QUE_IMPIDE_LEER_MAL_ESTA_FILA) &&
    /NO ES EL ESPEJO DE AGUA/.test(e2.EL_CRUCE_DE_M1_CON_M2_Y_ES_LO_QUE_IMPIDE_LEER_MAL_ESTA_FILA) &&
    /1.437,4 km2/.test(e2.EL_CRUCE_DE_M1_CON_M2_Y_ES_LO_QUE_IMPIDE_LEER_MAL_ESTA_FILA));
chk('(m2) declara DEBIL el control negativo', /control negativo se declara DEBIL/.test(JSON.stringify(e2)));
chk('(m2) dice que NO cierra la fila lacustre', /LO RODEA|lo rodea/.test(JSON.stringify(m2)));
chk('PLAN-2::ninguna-ruta-lacustre-es-calculable SIGUE VIVA',
    porId['PLAN-2::ninguna-ruta-lacustre-es-calculable'].estado === 'viva');
chk('la fila del grupo 2 de trayecto/extremos SIGUE SIN FIRMAR',
    porId[S + '::jurisdiccion-por-trayecto-o-por-extremos'].firma_owner.firmada === false);
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
