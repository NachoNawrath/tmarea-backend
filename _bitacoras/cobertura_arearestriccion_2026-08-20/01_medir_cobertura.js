// 01_medir_cobertura.js — LA COBERTURA HISTORICA DE AreaRestriccion
// Sesion del 2026-08-20. UNA pregunta: ¿AreaRestriccion esta poblado en la bolsa
// historica de capturas de SITPORT con la misma cobertura que hoy?
//
// NO toca src/. Importa normalizarTexto del parser de produccion para que la
// lectura de este instrumento sea LA MISMA del motor, sin reimplementarla.
//
// Salida cruda -> 01_medir_cobertura.txt

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src', 'services', 'sitport-parser.js'));

const L = [];
const say = (s = '') => { L.push(s); };

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATOS — todo fichero del arbol que contenga una respuesta de
// consultaRestricciones. La INCLUSION o EXCLUSION de cada uno va declarada.
// ─────────────────────────────────────────────────────────────────────────────
const CANDIDATOS = [
  { r: 'sondaje-sitport/restricciones_2026-07-30_19-42.json', fecha: '2026-07-30 19:42 (local, del nombre)', proc: 'sondaje-sitport/capturar.ps1 contra orion.directemar.cl' },
  { r: 'sondaje-sitport/restricciones_2026-07-31_16-32.json', fecha: '2026-07-31 16:32 (local, del nombre)', proc: 'sondaje-sitport/capturar.ps1' },
  { r: 'sondaje-sitport/restricciones_2026-07-31_20-32.json', fecha: '2026-07-31 20:32 (local, del nombre)', proc: 'sondaje-sitport/capturar.ps1' },
  { r: 'sondaje-sitport/restricciones_2026-07-31_21-01.json', fecha: '2026-07-31 21:01 (local, del nombre)', proc: 'sondaje-sitport/capturar.ps1' },
  { r: 'sondaje-sitport/restricciones_2026-08-01_13-14.json', fecha: '2026-08-01 13:14 (local, del nombre)', proc: 'sondaje-sitport/capturar.ps1' },
  { r: 'sondaje-sitport/check_ahora.json', fecha: '2026-08-03 (mtime; el contenido no se fecha a si mismo)', proc: 'sondaje-sitport/check_*.ps1' },
  { r: '_bitacoras/sitport_crudo_2026-08-08.json', fecha: '2026-08-08 (del nombre)', proc: 'bitacora suelta' },
  { r: '_bitacoras/e01_drift_catalogo_2026-08-11/sitport_consultaRestricciones.json', fecha: '2026-08-11 (del nombre del directorio)', proc: 'E01 drift de catalogo' },
  { r: '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_2026-08-11/sitport_consultaRestricciones.json', fecha: '2026-08-11 (del nombre del directorio)', proc: 'E01 drift de catalogo, copia de insumo' },
  { r: '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_alterado_2026-08-11/sitport_consultaRestricciones.json', fecha: '2026-08-11', proc: 'E01 drift', excluir: 'ALTERADO A PROPOSITO. Es el insumo de una prueba de mordida de drift: su contenido fue modificado para que el control se pusiera rojo. Un fichero fabricado no es una captura.' },
  { r: '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaRestricciones.json', fecha: '2026-08-13 (del nombre del directorio)', proc: 'E3 paso 6', sospecha_subconjunto: true },
  { r: '_bitacoras/filtro_puerto_2026-08-17/insumos/CONGELADO_vivo.json', fecha: '2026-08-17T23:02:53.110Z (declarado adentro, campo congelado_en)', proc: 'frente filtro_puerto, congelado de /api/sitport/restricciones' },
  { r: '_bitacoras/cobertura_arearestriccion_2026-08-20/captura_2026-08-20_18-29Z.json', fecha: '2026-08-20T18:29:41Z (captura de ESTA sesion)', proc: 'POST directo a orion.directemar.cl/sitport/back/users/consultaRestricciones, HTTP 200, 22.900 bytes' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Extraccion — tres formas distintas en el arbol, mismas claves adentro
// ─────────────────────────────────────────────────────────────────────────────
function extraerFilas(j) {
  if (Array.isArray(j)) {
    if (j.length && Array.isArray(j[0])) return { filas: j[0], forma: 'array-de-arrays' };
    return { filas: j, forma: 'array plano' };
  }
  if (j && j.recordsets) {
    const rs = j.recordsets;
    return { filas: Array.isArray(rs[0]) ? rs[0] : rs, forma: '{recordsets:[[...]]}' };
  }
  if (j && j.cuerpo !== undefined) {
    const dentro = extraerFilas(j.cuerpo);
    return { filas: dentro.filas, forma: '{…,cuerpo} -> ' + dentro.forma };
  }
  if (j && Array.isArray(j.data)) return { filas: j.data, forma: '{success,data,error}' };
  throw new Error('forma no reconocida: claves = ' + Object.keys(j || {}).join(','));
}

const MES = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function fcinicioAMs(s) {
  // "29 Jul 2026 11:32:00:000"
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/.exec(String(s || ''));
  if (!m || !(m[2] in MES)) return null;
  return Date.UTC(+m[3], MES[m[2]], +m[1], +m[4], +m[5], +m[6]);
}
function msAIso(ms) { return ms === null ? '—' : new Date(ms).toISOString().slice(0, 16).replace('T', ' '); }

// ─────────────────────────────────────────────────────────────────────────────
// La definicion de POBLADO y el reparto — mismo criterio que detectarArea()
// ─────────────────────────────────────────────────────────────────────────────
const CLAVE = 'AreaRestriccion';
function estaPoblado(fila) {
  if (!(CLAVE in fila)) return false;
  const v = fila[CLAVE];
  if (v === null || v === undefined) return false;
  return String(v).trim().length > 0;
}
function repartir(fila) {
  if (!estaPoblado(fila)) return 'vacio';
  const a = normalizarTexto(fila[CLAVE]);   // el MISMO normalizarTexto del motor
  const d = a.includes('DENTRO');            // el MISMO includes de detectarArea()
  const f = a.includes('FUERA');
  if (d && f) return 'las_dos';
  if (d) return 'DENTRO';
  if (f) return 'FUERA';
  return 'poblado_pero_ni_DENTRO_ni_FUERA';
}
const tipoNorm = (fila) => String(fila.tipo === undefined || fila.tipo === null ? '' : fila.tipo).trim().toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
say('LA COBERTURA HISTORICA DE AreaRestriccion');
say('Corrida: ' + new Date().toISOString());
say('Instrumento: este fichero. normalizarTexto importado de src/services/sitport-parser.js — NO se modifico.');
say('');
say('DEFINICIONES — toda cifra de abajo se lee con estas y con ninguna otra');
say('  captura ......... un payload DISTINTO de consultaRestricciones, deduplicado por md5 del');
say('                    conjunto de filas (no del fichero: hay copias indentadas del mismo payload).');
say('                    Unidad: captura.');
say('  fila ............ un elemento del recordset, identificado por IDRestriccion. Unidad: fila de restriccion.');
say('  poblado ......... la clave AreaRestriccion esta PRESENTE, no es null y su String() sin espacios');
say('                    tiene largo > 0. Unidad: filas / filas de esa captura.');
say('  tipo TODOS ...... campo `tipo` igual a "TODOS" DESPUES de recortar espacios y pasar a mayuscula.');
say('                    EL RECORTE SE DECLARA: en el crudo los otros vienen con espacio al final');
say('                    ("INSTALACION ", "FRENTE ATRAQUE "), y sin recortar la comparacion falla.');
say('  reparto ......... DENTRO solo · FUERA solo · las_dos (contiene ambas subcadenas) · vacio.');
say('                    Se comprueba por captura que los cuatro suman el total.');
say('  DENTRO/FUERA .... subcadenas ASCII buscadas sobre normalizarTexto(valor). No se usa grep ni');
say('                    clase de caracteres: "LIMITE" acentuado nunca se matchea, y no hace falta.');
say('');

// ─────────────────────────────────────────────────────────────────────────────
// PASO 1 — leer, deduplicar, y decidir la bolsa
// ─────────────────────────────────────────────────────────────────────────────
const leidos = [];
for (const c of CANDIDATOS) {
  const abs = path.join(RAIZ, c.r);
  const bytes = fs.readFileSync(abs);
  const md5fich = crypto.createHash('md5').update(bytes).digest('hex');
  let filas, forma;
  // Un candidato que no se puede leer NO se descarta en silencio: aborta.
  // Precedente: un instrumento que corre perfecto y mide otra cosa es el defecto
  // que mas veces se ficho en este proyecto. Aca, la primera pasada se comio
  // CONGELADO_vivo.json —forma {success,data}— y la bolsa salio de 9 y no de 10.
  try { ({ filas, forma } = extraerFilas(JSON.parse(bytes.toString('utf8')))); }
  catch (e) { throw new Error('CANDIDATO ILEGIBLE, no se sigue: ' + c.r + ' — ' + e.message); }
  const md5filas = crypto.createHash('md5').update(JSON.stringify(filas)).digest('hex');
  const ids = new Set(filas.map((f) => f.IDRestriccion));
  const fcs = filas.map((f) => fcinicioAMs(f.FCinicio)).filter((x) => x !== null);
  leidos.push({ ...c, md5fich, md5filas, forma, filas, ids, maxFC: fcs.length ? Math.max(...fcs) : null });
}

say('='.repeat(78));
say('PASO 1 — LOS CANDIDATOS DEL ARBOL, Y QUE ENTRA');
say('='.repeat(78));
say('');
say('  bytes   filas  md5(fichero)  md5(filas)    forma                        fichero');
for (const x of leidos) {
  say('  ' + String(fs.statSync(path.join(RAIZ, x.r)).size).padStart(7) + '  ' +
      String(x.filas ? x.filas.length : '—').padStart(5) + '  ' +
      x.md5fich.slice(0, 12) + '  ' + (x.md5filas || '—'.repeat(12)).slice(0, 12) + '  ' +
      (x.forma || '—').padEnd(28) + '  ' + x.r);
}
say('');

// exclusion 1: el alterado
const excluidos = [];
for (const x of leidos) if (x.excluir) { x.fuera = x.excluir; excluidos.push(x); }

// exclusion 2: e3_paso6, por el criterio de subconjunto
say('-'.repeat(78));
say('EL CRITERIO CON QUE SE DECIDE e3_paso6 — declarado ANTES de aplicarlo');
say('-'.repeat(78));
say('Una captura es SUBCONJUNTO, y por tanto NO es una captura, si su conjunto de');
say('IDRestriccion esta contenido ENTERO en el de otro fichero de la lista y ademas es');
say('mas chico. Un porcentaje de cobertura calculado sobre un subconjunto filtrado no');
say('mide la cobertura del endpoint: mide el filtro de quien lo guardo.');
say('');
const sospechoso = leidos.find((x) => x.sospecha_subconjunto);
if (sospechoso && sospechoso.ids) {
  say('  candidato : ' + sospechoso.r);
  say('  sus filas : ' + sospechoso.filas.length + '  (IDRestriccion distintos: ' + sospechoso.ids.size + ')');
  let contenedor = null;
  for (const otro of leidos) {
    if (otro === sospechoso || !otro.ids || otro.excluir) continue;
    let dentroTodos = true;
    for (const id of sospechoso.ids) if (!otro.ids.has(id)) { dentroTodos = false; break; }
    if (dentroTodos && otro.ids.size > sospechoso.ids.size) { contenedor = otro; break; }
  }
  if (contenedor) {
    say('  VEREDICTO : SUBCONJUNTO. Sus ' + sospechoso.ids.size + ' IDRestriccion estan TODOS dentro de');
    say('              ' + contenedor.r);
    say('              que tiene ' + contenedor.ids.size + '. EXCLUIDO de la bolsa.');
    sospechoso.fuera = 'SUBCONJUNTO de ' + contenedor.r + ' (' + sospechoso.ids.size + ' de ' + contenedor.ids.size + ' IDRestriccion). No es una captura del endpoint.';
    excluidos.push(sospechoso);
  } else {
    say('  VEREDICTO : NO es subconjunto de ningun otro fichero de la lista. ENTRA a la bolsa.');
    say('              (es chico, pero chico no es subconjunto — el criterio es el de arriba)');
    say('  CORROBORACION INDEPENDIENTE, no buscada: el log del servidor de esa misma sesion,');
    say('              _bitacoras/e3_paso6_2026-08-13/06_server_log.txt, dice textual');
    say('              "[SITPORT] consultaRestricciones: 9 registros obtenidos".');
    say('              O sea: las 9 filas son LA RESPUESTA ENTERA de ese dia, no un recorte.');
    say('              Dos instrumentos distintos, el mismo 9.');
  }
  say('  CONTROL POSITIVO del test de subconjunto: un fichero contra si mismo debe dar');
  say('              contenido=SI. Comprobado: ' + ([...sospechoso.ids].every((i) => sospechoso.ids.has(i)) ? 'SI' : 'NO'));
  say('  CONTROL NEGATIVO: el ID inventado 999999999 NO esta en el sospechoso: ' + (!sospechoso.ids.has(999999999) ? 'correcto' : 'FALLA'));
}
say('');

// dedup por md5 de filas
const bolsa = [];
const vistos = new Map();
for (const x of leidos) {
  if (x.fuera || !x.filas) continue;
  if (vistos.has(x.md5filas)) { vistos.get(x.md5filas).gemelos.push(x.r); continue; }
  const e = { ...x, gemelos: [] };
  vistos.set(x.md5filas, e);
  bolsa.push(e);
}

say('-'.repeat(78));
say('LA BOLSA QUE QUEDA');
say('-'.repeat(78));
say('EXCLUIDOS (' + excluidos.length + '):');
for (const x of excluidos) { say('  · ' + x.r); say('      ' + x.fuera); }
say('');
say('DEDUPLICADOS por md5 del conjunto de filas:');
let ndup = 0;
for (const x of bolsa) for (const g of x.gemelos) { ndup++; say('  · ' + g); say('      payload IDENTICO a ' + x.r + ' (md5 filas ' + x.md5filas.slice(0, 12) + ')'); }
if (!ndup) say('  (ninguno)');
say('');

// ─────────────────────────────────────────────────────────────────────────────
// (1) EL DENOMINADOR REAL
// ─────────────────────────────────────────────────────────────────────────────
const totalFilas = bolsa.reduce((a, x) => a + x.filas.length, 0);
say('='.repeat(78));
say('(1) EL DENOMINADOR REAL');
say('='.repeat(78));
say('CAPTURAS EN LA BOLSA: ' + bolsa.length + '  ·  FILAS QUE SUMAN: ' + totalFilas);
say('Unidad: captura (payload distinto) y fila de restriccion (IDRestriccion).');
say('');
say('  #  fecha declarada de la captura                      filas   FCinicio max (UTC, corrobora)');
bolsa.forEach((x, i) => {
  say('  ' + String(i + 1).padStart(2) + '  ' + x.fecha.padEnd(50) + ' ' +
      String(x.filas.length).padStart(5) + '   ' + msAIso(x.maxFC));
});
say('');
say('RANGO: de ' + bolsa[0].fecha.split(' ')[0] + ' a ' + bolsa[bolsa.length - 1].fecha.split('T')[0].split(' ')[0] +
    ' — ' + bolsa.length + ' capturas.');
say('');

// ─────────────────────────────────────────────────────────────────────────────
// (2) LA COBERTURA  ·  (3) SOBRE TIPO TODOS  ·  (4) POR CAPTURA
// ─────────────────────────────────────────────────────────────────────────────
const VALORES = ['DENTRO', 'FUERA', 'las_dos', 'poblado_pero_ni_DENTRO_ni_FUERA', 'vacio'];
const acum = { todo: {}, todos: {} };
for (const k of VALORES) { acum.todo[k] = 0; acum.todos[k] = 0; }
let filasTodos = 0;
let clavePresenteSiempre = true;
const porCaptura = [];

for (const x of bolsa) {
  const c = {}; const t = {};
  for (const k of VALORES) { c[k] = 0; t[k] = 0; }
  let nTodos = 0;
  let clavePresente = 0;
  for (const f of x.filas) {
    if (CLAVE in f) clavePresente++;
    const r = repartir(f);
    c[r]++; acum.todo[r]++;
    if (tipoNorm(f) === 'TODOS') { nTodos++; t[r]++; acum.todos[r]++; }
  }
  filasTodos += nTodos;
  if (clavePresente !== x.filas.length) clavePresenteSiempre = false;
  const pobl = x.filas.length - c.vacio;
  const poblT = nTodos - t.vacio;
  porCaptura.push({ x, c, t, nTodos, pobl, poblT, clavePresente });
}

const pobladoTotal = totalFilas - acum.todo.vacio;
const pobladoTodos = filasTodos - acum.todos.vacio;
const pct = (a, b) => b === 0 ? '—' : (100 * a / b).toFixed(1).replace('.', ',') + ' %';

say('='.repeat(78));
say('(2) LA COBERTURA — sobre la bolsa entera');
say('='.repeat(78));
say('  DENOMINADOR: ' + totalFilas + ' filas de restriccion, en ' + bolsa.length + ' capturas.');
say('');
say('  AreaRestriccion POBLADO ....... ' + pobladoTotal + ' de ' + totalFilas + '   (' + pct(pobladoTotal, totalFilas) + ')');
say('  AreaRestriccion VACIO ......... ' + acum.todo.vacio + ' de ' + totalFilas + '   (' + pct(acum.todo.vacio, totalFilas) + ')');
say('');
say('  REPARTO POR VALOR, sobre las mismas ' + totalFilas + ' filas:');
say('    DENTRO solo ................. ' + String(acum.todo.DENTRO).padStart(4) + '   (' + pct(acum.todo.DENTRO, totalFilas) + ')');
say('    FUERA solo .................. ' + String(acum.todo.FUERA).padStart(4) + '   (' + pct(acum.todo.FUERA, totalFilas) + ')');
say('    las dos ..................... ' + String(acum.todo.las_dos).padStart(4) + '   (' + pct(acum.todo.las_dos, totalFilas) + ')');
say('    poblado, ni una ni otra ..... ' + String(acum.todo.poblado_pero_ni_DENTRO_ni_FUERA).padStart(4) + '   (' + pct(acum.todo.poblado_pero_ni_DENTRO_ni_FUERA, totalFilas) + ')');
say('    vacio ....................... ' + String(acum.todo.vacio).padStart(4) + '   (' + pct(acum.todo.vacio, totalFilas) + ')');
const sumaTodo = VALORES.reduce((a, k) => a + acum.todo[k], 0);
say('    CONTROL DE FORMA  los cinco suman ' + sumaTodo + ' y el denominador es ' + totalFilas + ': ' + (sumaTodo === totalFilas ? 'CUADRA' : 'NO CUADRA'));
say('');
say('  EL VOCABULARIO ENTERO DEL CAMPO — todo valor crudo distinto y sus filas.');
say('  Va porque el reparto de cuatro casillas no lo cubre: hay una quinta.');
const vocab = new Map();
for (const x of bolsa) for (const f of x.filas) {
  const v = estaPoblado(f) ? String(f[CLAVE]) : '(vacio: ' + JSON.stringify(f[CLAVE]) + ')';
  vocab.set(v, (vocab.get(v) || 0) + 1);
}
[...vocab.entries()].sort((a, b) => b[1] - a[1]).forEach(([v, n]) => {
  say('    ' + String(n).padStart(4) + '  ' + repartir({ [CLAVE]: v.startsWith('(vacio') ? null : v }).padEnd(32) + '  "' + v + '"');
});
say('    CONTROL DE FORMA  el vocabulario suma ' + [...vocab.values()].reduce((a, b) => a + b, 0) + ' contra ' + totalFilas);
say('');

say('='.repeat(78));
say('(3) LA COBERTURA SOBRE TIPO TODOS — el subconjunto que le importa a la regla');
say('='.repeat(78));
say('  DENOMINADOR: ' + filasTodos + ' filas de tipo TODOS, en las mismas ' + bolsa.length + ' capturas.');
say('');
say('  POBLADO ....................... ' + pobladoTodos + ' de ' + filasTodos + '   (' + pct(pobladoTodos, filasTodos) + ')');
say('    DENTRO solo ................. ' + String(acum.todos.DENTRO).padStart(4));
say('    FUERA solo .................. ' + String(acum.todos.FUERA).padStart(4));
say('    las dos ..................... ' + String(acum.todos.las_dos).padStart(4));
say('    poblado, ni una ni otra ..... ' + String(acum.todos.poblado_pero_ni_DENTRO_ni_FUERA).padStart(4));
say('    vacio ....................... ' + String(acum.todos.vacio).padStart(4));
const sumaTodos = VALORES.reduce((a, k) => a + acum.todos[k], 0);
say('    CONTROL DE FORMA  suman ' + sumaTodos + ' contra ' + filasTodos + ': ' + (sumaTodos === filasTodos ? 'CUADRA' : 'NO CUADRA'));
say('');

say('='.repeat(78));
say('(4) SI CAMBIA EN EL TIEMPO — el numero por captura, sin modelar nada');
say('='.repeat(78));
say('');
say('  fecha de la captura                     filas  poblado         TODOS  poblado(TODOS)');
for (const p of porCaptura) {
  say('  ' + p.x.fecha.slice(0, 38).padEnd(38) + ' ' +
      String(p.x.filas.length).padStart(5) + '  ' +
      (p.pobl + ' de ' + p.x.filas.length).padEnd(10) + ' ' + pct(p.pobl, p.x.filas.length).padStart(6) + '  ' +
      String(p.nTodos).padStart(5) + '  ' +
      (p.poblT + ' de ' + p.nTodos).padEnd(10) + ' ' + pct(p.poblT, p.nTodos));
}
say('');
say('  reparto por captura:');
say('  fecha                                   DENTRO  FUERA  las_dos  vacio');
for (const p of porCaptura) {
  const s = VALORES.reduce((a, k) => a + p.c[k], 0);
  say('  ' + p.x.fecha.slice(0, 38).padEnd(38) + ' ' +
      String(p.c.DENTRO).padStart(6) + ' ' + String(p.c.FUERA).padStart(6) + ' ' +
      String(p.c.las_dos).padStart(8) + ' ' + String(p.c.vacio).padStart(6) +
      '   [suma ' + s + '/' + p.x.filas.length + (s === p.x.filas.length ? ' ok]' : ' NO CUADRA]'));
}
say('');

// ─────────────────────────────────────────────────────────────────────────────
// (5) EL CASO "NO SE"
// ─────────────────────────────────────────────────────────────────────────────
say('='.repeat(78));
say('(5) EL CASO "NO SE" — separado SIN tocar el parser');
say('='.repeat(78));
say('detectarArea() colapsa dos cosas en DENTRO_Y_FUERA: la fila que declara las dos');
say('areas, y la fila que no declara ninguna. El CRUDO no las colapsa, asi que la');
say('separacion se hace leyendo el campo y no cambiando la funcion.');
say('');
const dyf = acum.todo.las_dos + acum.todo.vacio + acum.todo.poblado_pero_ni_DENTRO_ni_FUERA;
say('  filas que HOY se leerian como DENTRO_Y_FUERA: ' + dyf + ' de ' + totalFilas);
say('    de esas, son DE VERDAD las dos ............ ' + acum.todo.las_dos + '   (' + pct(acum.todo.las_dos, dyf) + ' de las ' + dyf + ')');
say('    de esas, son "no se" (campo vacio) ........ ' + acum.todo.vacio + '   (' + pct(acum.todo.vacio, dyf) + ' de las ' + dyf + ')');
say('    de esas, poblado pero ni una ni otra ...... ' + acum.todo.poblado_pero_ni_DENTRO_ni_FUERA);
say('');
const ejemplos = [];
for (const x of bolsa) for (const f of x.filas) if (repartir(f) === 'las_dos') ejemplos.push({ cap: x.fecha.slice(0, 16), b: f.bahia, n: f.GLBahia, v: f[CLAVE] });
say('  EJEMPLARES de "las dos", los primeros 6 de ' + ejemplos.length + ':');
if (!ejemplos.length) say('    (ninguno)');
ejemplos.slice(0, 6).forEach((e) => say('    ' + e.cap + '  bahia ' + String(e.b).padStart(4) + '  ' + String(e.n).slice(0, 26).padEnd(26) + '  "' + e.v + '"'));
say('');

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLES
// ─────────────────────────────────────────────────────────────────────────────
say('='.repeat(78));
say('CONTROLES');
say('='.repeat(78));
say('');
say('CONTROL POSITIVO OBLIGATORIO PARA TODO CERO — separa "campo vacio" de "campo ausente"');
say('  La clave ' + CLAVE + ' esta PRESENTE en las ' + totalFilas + ' filas de la bolsa: ' + (clavePresenteSiempre ? 'SI' : 'NO'));
say('  Detalle por captura (clave presente / filas), y un campo vecino no vacio que');
say('  prueba que el fichero se leyo de verdad:');
for (const p of porCaptura) {
  const conMotivo = p.x.filas.filter((f) => String(f.MotivoRestriccion || '').trim().length > 0).length;
  say('    ' + p.x.fecha.slice(0, 30).padEnd(30) + '  ' + p.clavePresente + '/' + p.x.filas.length +
      '   MotivoRestriccion no vacio: ' + conMotivo + '/' + p.x.filas.length +
      (p.pobl === 0 ? '   <-- CERO POBLADOS: el campo esta, y vacio' : ''));
}
say('');
say('CONTROL NEGATIVO — una clave que no existe debe dar 0 poblados en todas');
let negativo = 0;
for (const x of bolsa) for (const f of x.filas) if ('AreaRestriccionXX' in f) negativo++;
say('  filas con la clave inventada AreaRestriccionXX: ' + negativo + ' de ' + totalFilas + (negativo === 0 ? '  (correcto)' : '  FALLA'));
say('');
say('CONTROL DEL RECORTE DE `tipo` — que el espacio final existe de verdad');
const crudos = new Map();
for (const x of bolsa) for (const f of x.filas) { const k = JSON.stringify(f.tipo); crudos.set(k, (crudos.get(k) || 0) + 1); }
say('  valores CRUDOS distintos del campo tipo, tal cual vienen:');
[...crudos.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => say('    ' + k.padEnd(22) + ' ' + v + ' filas'));
say('  filas de tipo TODOS despues del recorte: ' + filasTodos + ' de ' + totalFilas);
say('');
say('CONTROL DE LECTURA — normalizarTexto es el del motor, no una copia');
say('  require(src/services/sitport-parser.js).normalizarTexto("dentro del limite") = "' + normalizarTexto('dentro del limite') + '"');
say('  normalizarTexto(null) = "' + normalizarTexto(null) + '"  (la rama que hace indistinguible el "no se")');
say('');
say('EL ANCLA DE HOY — declarado, no medido aca');
say('  El owner declara 16 de 18 poblados y 15 de 15 de tipo TODOS, medido el 2026-08-20');
say('  sobre el vivo. Ese momento no tiene artefacto y NO se puede volver a ver: va como');
say('  DECLARADO. Lo MEDIDO del mismo dia y que si esta en el arbol es');
say('  _bitacoras/tres_de_d4_2026-08-20/03_puerto_abierto_con_restriccion.txt, 16:52:48Z,');
say('  20 filas vigentes, TODOS=17. Y la captura de esta sesion, 18:29:41Z, esta en la tabla.');
say('');
say('FIN.');

fs.writeFileSync(path.join(__dirname, '01_medir_cobertura.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
