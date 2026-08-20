'use strict';
// VERIFICACION DE PUSH — CON EL CONTROL DEL INDICE ADENTRO.
//
// POR QUE VA ADENTRO Y NO AL LADO: comparar `main` contra `origin/main` y leer
// blob-sha comprueba que LO SUBIDO ES LO COMMITEADO. NUNCA comprueba que LO
// COMMITEADO ES LO MEDIDO. Ese hueco esta en toda verificacion de push previa
// del proyecto y es exactamente el que dejo pasar `2d47022`, cuyo mensaje decia
// 36 filas sobre un objeto que tenia 34.
//
// Asi que este instrumento hace las DOS cosas, en este orden:
//   A. re-mide sobre el OBJETO DEL COMMIT (git show <sha>:ruta) y coteja cada
//      cifra contra lo que el MENSAJE del commit afirma;
//   B. recien despues compara main contra origin/main, blob por blob.
// Si A falla, B no importa: estaria confirmando que se subio bien una mentira.

const { execFileSync } = require('child_process');
const g = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let fallos = 0;
const chequeo = (rot, ok, detalle) => {
  if (!ok) fallos++;
  console.log('  ' + (ok ? 'OK  ' : '!!  ') + rot + (detalle ? '  ->  ' + detalle : ''));
};

console.log('VERIFICACION DE PUSH — control del indice ADENTRO');
console.log('Corrida: ' + new Date().toISOString());
console.log('');

const HEAD = g('rev-parse', 'HEAD').trim();
const mensaje = g('log', '-1', '--format=%B', HEAD);
console.log('commit local  ' + HEAD);
console.log('asunto        ' + g('log', '-1', '--format=%s', HEAD).trim());
console.log('');

// ── A · LO COMMITEADO ES LO MEDIDO ───────────────────────────────────────────
console.log('A · LO COMMITEADO ES LO MEDIDO  (se re-mide sobre el OBJETO del commit)');

const d = JSON.parse(g('show', HEAD + ':data/deudas/deudas_declaradas.json'));
const filas = d.deudas.length;
const unicas = d.deudas.filter(x => !x.duplicada_de).length;
const vivas = d.deudas.filter(x => x.estado === 'viva' && !x.duplicada_de).length;
const sitios = d.cobertura.sitios.length;
const barridos = d.cobertura.sitios.filter(x => x.barrido).length;
const nuevas = d.deudas.filter(x => String(x.id).startsWith('D4D5::')).length;
const suma = d.cobertura.sitios.reduce((a, s) => a + (s.filas_en_este_declarativo || 0), 0);

console.log('  medido sobre el objeto: filas ' + filas + ' · unicas ' + unicas + ' · vivas ' + vivas +
  ' · sitios ' + sitios + ' · barridos ' + barridos + ' · filas D4D5 ' + nuevas);
chequeo('el mensaje dice "55 -> 61 filas" y el objeto tiene ' + filas, filas === 61 && /55 -> 61 filas/.test(mensaje));
chequeo('el mensaje dice "53 -> 59 unicas" y el objeto tiene ' + unicas, unicas === 59 && /53 -> 59 unicas/.test(mensaje));
chequeo('el mensaje dice "48 -> 54 vivas" y el objeto tiene ' + vivas, vivas === 54 && /48 -> 54 vivas/.test(mensaje));
chequeo('el mensaje dice "17 -> 18 sitios" y el objeto tiene ' + sitios, sitios === 18 && /17 -> 18 sitios/.test(mensaje));
chequeo('el mensaje dice "8 -> 9 barridos" y el objeto tiene ' + barridos, barridos === 9 && /8 -> 9 barridos/.test(mensaje));
chequeo('el mensaje dice "6 filas nuevas" y el objeto tiene ' + nuevas, nuevas === 6 && /6 filas nuevas/.test(mensaje));
chequeo('suma de filas_en_este_declarativo por sitio == filas', suma === filas, suma + ' vs ' + filas);
chequeo('el mensaje dice "SIGUEN 9 SIN BARRER" y el objeto deja ' + (sitios - barridos),
  (sitios - barridos) === 9 && /SIGUEN 9 SIN BARRER/.test(mensaje));

const plan = g('show', HEAD + ':PLAN_JURISDICCION.md');
chequeo('D5 CERRADA en la tabla de §5', plan.includes('CERRADA 2026-08-20 por el owner: CERO de más'));
chequeo('D4 SIGUE ABIERTA en la tabla de §5', /\| D4 \| Zarpe y recalada[^\n]*\*\*abierta\*\*/.test(plan));
chequeo('el mensaje dice "D4 SIGUE ABIERTA" y el documento tambien', /D4 SIGUE ABIERTA/.test(mensaje));
chequeo('la cifra 4 de 16 esta escrita en §5', plan.includes('**CUMPLE 4 de 16**'));
chequeo('el mensaje dice "CUMPLE 4 de 16" igual que el documento', /CUMPLE 4 de 16/.test(mensaje));
chequeo('S2 lleva el tachado del alcance', plan.includes('~~de esas Capitanías~~'));
chequeo('INV-3.4 tachado como respaldo de S2', plan.includes('~~INV-3.4~~'));
chequeo('las tres secciones nuevas existen',
  plan.includes('### D5 — el trazado es el criterio. Cerrada el 2026-08-20.') &&
  plan.includes('### Las tres de D4 —') &&
  plan.includes('### La celda — medida el 2026-08-20.'));
chequeo('el sitio nuevo esta en SITIOS_CANON del validador',
  g('show', HEAD + ':scripts/validar_deudas_declaradas.js').includes("'SESION-tres-de-d4-2026-08-20'"));

// las cifras de la celda que el mensaje afirma, cotejadas contra la salida cruda COMMITEADA
const celda = g('show', HEAD + ':_bitacoras/tres_de_d4_2026-08-20/01_medir_celda.txt');
chequeo('73,7 km esta en la salida cruda del instrumento', celda.includes('73.7'));
chequeo('el control positivo de R1 (38 wp) quedo en verde en la salida cruda',
  celda.includes('esperado 38, medido 38  -> OK'));
chequeo('el control positivo de las 7 bahias quedo en verde',
  celda.includes('OK — el instrumento mide lo mismo que el motor'));
const causas = g('show', HEAD + ':_bitacoras/tres_de_d4_2026-08-20/02_celda_causas_y_cota.txt');
chequeo('los 24,665 km de la corroboracion estan en la salida cruda', causas.includes('24.665'));
chequeo('las 33 celdas vacias estan re-medidas y coinciden', causas.includes('Medido hoy: 33. COINCIDE.'));

// lo que NO tiene que estar en el commit
const tocados = g('show', '--name-only', '--format=', HEAD).split('\n').filter(Boolean);
console.log('  ficheros en el commit: ' + tocados.length);
chequeo('CONTRATO_MOTOR.md NO esta en el commit', !tocados.includes('CONTRATO_MOTOR.md'));
chequeo('ningun src/ del backend en el commit', !tocados.some(f => f.startsWith('src/')));
chequeo('.claude/launch.json NO esta en el commit', !tocados.includes('.claude/launch.json'));
chequeo('data/catalogo/estado_drift.json NO esta en el commit', !tocados.includes('data/catalogo/estado_drift.json'));

// ── B · LO SUBIDO ES LO COMMITEADO ───────────────────────────────────────────
console.log('');
console.log('B · LO SUBIDO ES LO COMMITEADO  (blob por blob contra origin/main)');
g('fetch', 'origin', 'main');
const remoto = g('rev-parse', 'origin/main').trim();
console.log('  origin/main  ' + remoto);
chequeo('main == origin/main', HEAD === remoto);

let blobs = 0, distintos = 0;
for (const f of tocados) {
  const a = g('rev-parse', HEAD + ':' + f).trim();
  const b = g('rev-parse', remoto + ':' + f).trim();
  blobs++;
  if (a !== b) { distintos++; console.log('  !!  blob distinto: ' + f); }
}
chequeo('los ' + blobs + ' blobs del commit son identicos en el remoto', distintos === 0);
console.log('  blob-sha cotejados: ' + blobs + '/' + blobs);

// control negativo del propio cotejo
const inventado = HEAD + ':_bitacoras/tres_de_d4_2026-08-20/NO_EXISTE.txt';
let cazo = false;
try { g('rev-parse', inventado); } catch (e) { cazo = true; }
chequeo('CONTROL NEGATIVO: una ruta inventada hace fallar el cotejo', cazo);

console.log('');
console.log(fallos === 0
  ? 'VERDE — lo commiteado es lo medido, Y lo subido es lo commiteado. ' + blobs + '/' + blobs + ' blobs.'
  : 'ROJO — ' + fallos + ' fallo(s).');
process.exit(fallos === 0 ? 0 : 1);
