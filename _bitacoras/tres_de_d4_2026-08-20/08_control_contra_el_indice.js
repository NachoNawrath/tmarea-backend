'use strict';
// TODA CIFRA QUE VAYA EN UN MENSAJE DE COMMIT SALE DEL INDICE, NO DEL DISCO.
// La regla que costo el commit malo `2d47022`: el mensaje decia 36 filas y el
// objeto tenia 34, porque el `git add` se hizo antes de tres ediciones. Comparar
// main contra origin/main verifica que lo subido es lo commiteado, NUNCA que lo
// commiteado es lo medido.
//
// Este control lee `git show :ruta` — el objeto del INDICE — y no el fichero del
// disco. Ademas compara los dos, para que si divergen se sepa ANTES.

const { execFileSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const delIndice = (ruta) => execFileSync('git', ['show', ':' + ruta], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

console.log('CONTROL CONTRA EL INDICE — las cifras del mensaje de commit salen de aca.');
console.log('Corrida: ' + new Date().toISOString());
console.log('');

// ── 1 · el declarativo, leido del INDICE ─────────────────────────────────────
const RUTA_D = 'data/deudas/deudas_declaradas.json';
const crudoIdx = delIndice(RUTA_D);
const crudoDisco = fs.readFileSync(RUTA_D, 'utf8');
const d = JSON.parse(crudoIdx);

const filas = d.deudas.length;
const unicas = d.deudas.filter(x => !x.duplicada_de).length;
const vivas = d.deudas.filter(x => x.estado === 'viva' && !x.duplicada_de).length;
const sitios = d.cobertura.sitios.length;
const barridos = d.cobertura.sitios.filter(x => x.barrido).length;
const nuevas = d.deudas.filter(x => String(x.id).startsWith('D4D5::'));
const suma = d.cobertura.sitios.reduce((a, s) => a + (s.filas_en_este_declarativo || 0), 0);

console.log('DECLARATIVO, DESDE EL INDICE (git show :' + RUTA_D + ')');
console.log(`  filas ${filas} · unicas ${unicas} · vivas ${vivas}`);
console.log(`  sitios ${sitios} · barridos ${barridos} · sin barrer ${sitios - barridos}`);
console.log(`  filas nuevas de esta sesion (prefijo D4D5::): ${nuevas.length}`);
console.log(`  suma de filas_en_este_declarativo por sitio: ${suma}  (tiene que ser ${filas})  -> ` +
  (suma === filas ? 'OK' : 'FALLA'));
console.log('  ids nuevos:');
for (const f of nuevas) console.log('    ' + f.id + '  [' + f.grupo + ']');
console.log('');
console.log('  enmiendas a filas de PLAN-2 presentes en el INDICE:');
for (const id of ['PLAN-2::procedencia-copia-congelada-mal-ubicada',
                  'PLAN-2::la-lista-de-capitanias-atravesadas-no-existe-en-pantalla']) {
  const f = d.deudas.find(x => x.id === id);
  console.log('    ' + (f && f.enmienda_2026_08_20 ? 'SI' : 'NO') + '  ' + id);
}
console.log('');
console.log('  INDICE vs DISCO (los dos tienen que ser el mismo objeto):');
console.log('    indice sha256 ' + sha(crudoIdx));
console.log('    disco  sha256 ' + sha(crudoDisco));
console.log('    -> ' + (sha(crudoIdx) === sha(crudoDisco) ? 'IDENTICOS' : 'DIVERGEN — el indice esta obsoleto, NO commitear'));

// ── 2 · el PLAN, leido del INDICE ────────────────────────────────────────────
const RUTA_P = 'PLAN_JURISDICCION.md';
const planIdx = delIndice(RUTA_P);
const planDisco = fs.readFileSync(RUTA_P, 'utf8');
console.log('');
console.log('PLAN_JURISDICCION.md, DESDE EL INDICE');
const marcas = [
  ['D5 CERRADA en la tabla', 'CERRADA 2026-08-20 por el owner: CERO de más'],
  ['seccion D5', '### D5 — el trazado es el criterio. Cerrada el 2026-08-20.'],
  ['seccion tres de D4', '### Las tres de D4 —'],
  ['seccion la celda', '### La celda — medida el 2026-08-20.'],
  ['cifra 4 de 16', '**CUMPLE 4 de 16**'],
  ['S2 con tachado', '~~de esas Capitanías~~'],
  ['S2 respaldo INV-3.4 tachado', '~~INV-3.4~~'],
  ['D4 sigue abierta en la tabla', '| D4 | Zarpe y recalada bajo unidad Capitanía'],
  ['condicion de D5 retirada', '**condición RETIRADA por el owner el 2026-08-20**'],
];
for (const [rot, aguja] of marcas) {
  const n = planIdx.split(aguja).length - 1;
  console.log('  ' + (n > 0 ? 'OK  ' : '!!  ') + rot + '  -> ' + n + ' aparicion(es)');
}
console.log('  CONTROL NEGATIVO  cadena que no puede estar: "ZZQX" -> ' +
  (planIdx.split('ZZQX').length - 1) + ' (esperado 0)');
console.log('  CONTROL POSITIVO  "INV-3.6" -> ' + (planIdx.split('INV-3.6').length - 1) + ' (esperado > 0)');
console.log('  D4 sigue ABIERTA: la tabla dice "**abierta**" en su fila -> ' +
  (/\| D4 \| Zarpe y recalada[^\n]*\*\*abierta\*\*/.test(planIdx) ? 'SI' : 'NO'));
console.log('  indice sha256 ' + sha(planIdx));
console.log('  disco  sha256 ' + sha(planDisco));
console.log('  -> ' + (sha(planIdx) === sha(planDisco) ? 'IDENTICOS' : 'DIVERGEN — NO commitear'));

// ── 3 · el validador, leido del INDICE ───────────────────────────────────────
const RUTA_V = 'scripts/validar_deudas_declaradas.js';
const valIdx = delIndice(RUTA_V);
console.log('');
console.log('scripts/validar_deudas_declaradas.js, DESDE EL INDICE');
console.log('  el sitio nuevo esta en SITIOS_CANON -> ' +
  (valIdx.includes("'SESION-tres-de-d4-2026-08-20'") ? 'SI' : 'NO'));
console.log('  indice sha256 ' + sha(valIdx));
console.log('  disco  sha256 ' + sha(fs.readFileSync(RUTA_V, 'utf8')));

// ── 4 · lo que NO tiene que estar en el indice ───────────────────────────────
console.log('');
console.log('LO QUE NO ENTRA AL INDICE — control explicito:');
for (const r of ['.claude/launch.json', 'data/catalogo/estado_drift.json']) {
  let enIdx = false;
  try {
    const idx = delIndice(r);
    enIdx = sha(idx) !== sha(fs.readFileSync(r, 'utf8'));
    console.log('  ' + r + ' -> en el indice esta la version de HEAD, NO la modificada: ' +
      (enIdx ? 'CORRECTO' : '!! el indice tiene la version modificada'));
  } catch (e) {
    console.log('  ' + r + ' -> no se pudo leer del indice: ' + e.message);
  }
}
const stageados = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' })
  .split('\n').filter(Boolean);
console.log('  ficheros stageados: ' + stageados.length);
console.log('  ¿alguno de los dos intocables entre ellos? -> ' +
  (stageados.some(f => f === '.claude/launch.json' || f === 'data/catalogo/estado_drift.json') ? '!! SI' : 'NO'));
console.log('  ¿alguno de src/ del backend? -> ' +
  (stageados.some(f => f.startsWith('src/')) ? '!! SI' : 'NO'));
console.log('  ¿CONTRATO_MOTOR.md? -> ' + (stageados.includes('CONTRATO_MOTOR.md') ? '!! SI' : 'NO'));
