// Control contra el INDICE para el commit de S7(a). Misma regla de siempre:
// toda cifra que vaya al mensaje sale de `git show :ruta`, no del disco.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const git = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const gitBuf = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { maxBuffer: 64 * 1024 * 1024 });

const fallos = [];
const chk = (n, c, d) => { console.log('  ' + (c ? 'ok  ' : 'MAL ') + n + (d ? '  ->  ' + d : '')); if (!c) fallos.push(n); };

console.log('CONTROL CONTRA EL INDICE — commit de S7(a) firmada');
console.log('');
const stageado = git('diff', '--cached', '--name-only').trim().split('\n').filter(Boolean);
console.log('  ficheros en el INDICE (' + stageado.length + '):');
stageado.forEach(f => console.log('      ' + f));
console.log('');

const INTOCABLES = ['.claude/launch.json', 'data/catalogo/estado_drift.json'];
INTOCABLES.forEach(i => chk('intocable FUERA del indice: ' + i, !stageado.includes(i)));
const modif = git('status', '--porcelain').split('\n').filter(l => l.startsWith(' M')).map(l => l.slice(3).trim());
chk('los dos intocables siguen modificados y sin stagear',
    modif.length === 2 && INTOCABLES.every(i => modif.includes(i)), modif.join(' | '));
chk('ningun src/ entro — no se toco codigo', !stageado.some(f => f.startsWith('src/')));
chk('CONTRATO_MOTOR.md NO entro — §10 se leyo, no se modifico', !stageado.includes('CONTRATO_MOTOR.md'));
chk('PLAN_JURISDICCION.md NO entro', !stageado.includes('PLAN_JURISDICCION.md'));
chk('data/spec2/cifra_spec2.json NO entro — la cifra no se movio',
    !stageado.includes('data/spec2/cifra_spec2.json'));
chk('ningun scripts/ entro', !stageado.some(f => f.startsWith('scripts/')));

// --- el declarativo DEL INDICE ----------------------------------------------
const tmp = path.join(os.tmpdir(), 's7a_decl_' + process.pid + '.json');
fs.writeFileSync(tmp, gitBuf('show', ':data/deudas/deudas_declaradas.json'));
let salida = '';
try {
  salida = execFileSync(process.execPath,
    [path.join(RAIZ, 'scripts/validar_deudas_declaradas.js'), '--fichero', tmp], { encoding: 'utf8' });
} catch (e) { salida = (e.stdout || '') + (e.stderr || ''); }
const num = (re) => { const m = salida.match(re); return m ? Number(m[1]) : null; };
const FILAS = num(/filas\s+:\s+(\d+)/);
const VIVAS = num(/VIVAS\s+:\s+(\d+)/);
const UNICAS = num(/deudas unicas \(sin duplicadas\)\s+:\s+(\d+)/);
chk('el declarativo DEL INDICE valida en VERDE', /VERDE/.test(salida));
console.log('');
console.log('  CIFRAS DEL INDICE, las unicas que pueden ir al mensaje:');
console.log('      filas           = ' + FILAS);
console.log('      deudas unicas   = ' + UNICAS);
console.log('      VIVAS           = ' + VIVAS);

const D = JSON.parse(fs.readFileSync(tmp, 'utf8'));
const ID = 'PLAN-2::la-capa-2-del-catalogo-no-llega-a-la-pantalla';
const f = D.deudas.find(x => x.id === ID);
chk('la fila nueva esta en el INDICE', !!f);
if (f) {
  chk('  grupo 1_cierra_con_lo_que_hay', f.grupo === '1_cierra_con_lo_que_hay', f.grupo);
  chk('  estado viva', f.estado === 'viva', f.estado);
  chk('  repo tmarea-pwa', f.repo === 'tmarea-pwa', f.repo);
  chk('  trae la primera medicion de quien la retome', !!f.primera_medicion_de_quien_la_retome);
  chk('  dice que esta REDACTADA Y NO MEDIDA',
      JSON.stringify(f).includes('REDACTADA Y NO MEDIDA'));
  chk('  el VHF va en esta fila y no en una propia',
      !!(f.evidencia_en_el_arbol || {}).el_vhf_va_aca_y_no_en_fila_propia);
}
const sitio = D.cobertura.sitios.find(s => s.id === 'PLAN-2');
const reales = D.deudas.filter(x => x.sitio === 'PLAN-2').length;
chk('PLAN-2 declara sus filas y las tiene', sitio.filas_en_este_declarativo === reales,
    'declara ' + sitio.filas_en_este_declarativo + ', tiene ' + reales);
console.log('      PLAN-2 filas    = ' + sitio.filas_en_este_declarativo);
fs.unlinkSync(tmp);

// --- la cifra NO se movio, leida de su autoridad EN EL INDICE ----------------
const cifra = JSON.parse(gitBuf('show', ':data/spec2/cifra_spec2.json').toString('utf8'));
const df = cifra.denominador_fino;
chk('la cifra del INDICE sigue en 4 de 15 con 2 anuladas',
    df.cumple === 4 && df.vigente === 15 && df.anuladas === 2,
    'cumple=' + df.cumple + ' vigente=' + df.vigente + ' anuladas=' + df.anuladas);
chk('S7(a) NO esta entre las que cumplen',
    !df.cumple_cuales.includes('S7(a)'), df.cumple_cuales.join(' '));
chk('la vista por punto sigue con S7 en NO CUMPLE',
    cifra.denominador_por_punto.no_cumple_cuales.includes('S7'),
    cifra.denominador_por_punto.no_cumple_cuales.join(' '));
console.log('      FORMA LEGAL     = "' + cifra.politica_de_publicacion.forma_legal + '"');

// --- los cuatro sitios del plan, DEL INDICE ---------------------------------
const plan = gitBuf('show', ':_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt').toString('utf8');
const enmiendas = [
  'RESPONDIDA Y FIRMADA EL 2026-08-20. El owner la miro en pantalla',
  'RESPONDIDA Y FIRMADA EL 2026-08-20, mirando la pantalla: NO.',
  'AL DIA EL 2026-08-20: la frase de arriba YA NO ES CIERTA',
  'FIRMADA EL 2026-08-20, despues. El owner la miro en pantalla',
];
enmiendas.forEach((e, i) => chk('enmienda ' + (i + 1) + ' de 4 en el plan', plan.includes(e)));
chk('el plan NO borro el texto viejo de la pregunta 10',
    plan.includes('¿El texto literal de la Capitania entrecomillado ES la cita de S7(a)?'));
chk('el plan NO borro «NO SE FIRMA HOY»', plan.includes('S7(a) · NO SE FIRMA HOY.'));

const spec2 = gitBuf('show', ':_bitacoras/spec2_pantalla_2026-08-20/spec2_pantalla_2026-08-20.txt').toString('utf8');
chk('la medicion del 2026-08-20 lleva su nota al dia',
    spec2.includes('AL DIA EL 2026-08-20 — EL CRITERIO SE CERRO'));
chk('la medicion NO borro su veredicto original',
    spec2.includes('ninguna de las 7\n    NOMBRA la resolucion ni el articulo.'));

const bit = gitBuf('show', ':_bitacoras/s7a_pantalla_2026-08-20/s7a_pantalla_2026-08-20.txt').toString('utf8');
chk('la bitacora nueva trae la firma', bit.includes('S7(a) · NO CUMPLE. FIRMADO POR EL OWNER EL 2026-08-20'));
chk('la bitacora nueva cita §10 literal', bit.includes('Segun D.S. 364 Art. 16, si debes cambiar el puerto de recalada'));
chk('la bitacora nueva declara que R1 no reproducia el caso', bit.includes('R1 NO REPRODUCE EL CASO HOY, Y NO SE FABRICO'));
chk('la bitacora nueva declara que la corrida es CAPTURA y no medicion',
    bit.includes('ESTO ES UNA CAPTURA, NO UNA MEDICION'));

// --- BOM y caracteres, sobre lo que esta EN EL INDICE ------------------------
const sospechoso = c => (c < 0x20 && c !== 0x0A && c !== 0x0D && c !== 0x09) || c === 0x7F || (c >= 0x80 && c <= 0x9F);
let bom = 0, raros = 0;
for (const f2 of stageado) {
  const t = gitBuf('show', ':' + f2).toString('utf8');
  if (t.charCodeAt(0) === 0xFEFF) { bom++; console.log('      BOM en ' + f2); }
  for (const ch of t) if (sospechoso(ch.codePointAt(0))) raros++;
}
chk('ningun fichero del INDICE con BOM', bom === 0);
chk('ningun caracter sospechoso (H-T2) en el INDICE', raros === 0, 'sospechosos=' + raros);

console.log('');
console.log(fallos.length === 0 ? 'VERDE — las cifras de arriba son las que pueden ir al mensaje.'
                                : 'ROJO — ' + fallos.length + ' fallo(s): ' + fallos.join(' | '));
process.exit(fallos.length === 0 ? 0 : 1);
