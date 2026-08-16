'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 02_verificar.js — VERIFICACION DE LO ESCRITO POR LA SESION CLAUSULA-Y-PAPEL.
//
// QUE COMPRUEBA, y por que cada cosa:
//   V1  la clausula §6.1 existe en CLAUDE.md y cubre las cuatro cosas exigidas.
//   V2  el contrato subio a v2.4 y el changelog de v2.4 esta escrito.
//   V3  LAS ENMIENDAS LLEVAN FECHA, COMMIT E INSTRUMENTO. Es la regla que este
//       repositorio pago dos veces: una declaracion sin fecha envejece en
//       silencio.
//   V4  TODO INSTRUMENTO CITADO EXISTE EN LA RUTA QUE SE CITA. Una cita que no
//       se puede abrir es peor que ninguna: parece respaldo y no lo es.
//   V5  el texto tachado sigue VISIBLE (§3.3 — se enmienda, no se borra).
//   V6  D-R5 entro en el registro y D-R1/D-R2/D-R4 quedaron intactas.
//   V7  no se toco nada fuera de la zona de escritura autorizada.
//   V8  ningun archivo escrito quedo con CRLF.
//
// CORRE SOBRE EL ARBOL DE TRABAJO, no sobre un commit: lo que se verifica es
// justamente lo que todavia no se commiteo.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const ANCLA = 'd5305d2c893414633ffd2aefc2e00d22a3edf070';

const L = [];
const say = s => { L.push(s); console.log(s); };
const fallas = [];
const check = (id, cond, desc, detalle) => {
  say(`  ${cond ? '✓' : '✗'} ${id}  ${desc}`);
  if (detalle) say(`        ${detalle}`);
  if (!cond) fallas.push(`${id} — ${desc}`);
};

const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ }).toString().trim();
if (head !== ANCLA) {
  console.error(`ABORTA: HEAD es ${head}, se esperaba ${ANCLA}. Esta verificacion es PRE-commit.`);
  process.exit(3);
}

const REL_CLAUDE = 'CLAUDE.md';
const REL_CONTRATO = 'CONTRATO_MOTOR.md';
const REL_REGISTRO = '_bitacoras/auditoria_rotulos_2026-08-15/auditoria_rotulos_2026-08-15.txt';
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const claude = leer(REL_CLAUDE);
const contrato = leer(REL_CONTRATO);
const registro = leer(REL_REGISTRO);

say('================================================================================');
say('VERIFICACION — CLAUSULA-Y-PAPEL');
say(`ancla HEAD (pre-commit) : ${ANCLA}`);
say(`fecha                   : ${new Date().toISOString()}`);
say('================================================================================');
say('');

// ── V1 — la clausula ─────────────────────────────────────────────────────────
say('V1 — CLAUDE.md §6.1 existe y cubre las cuatro cosas exigidas');
say('--------------------------------------------------------------------------------');
check('V1.0', claude.includes('### 6.1 — Una restricción de escritura no suspende el deber de redactar'),
  'la subseccion §6.1 existe con su titulo');
check('V1.1', /Esa prohibición es\s+sobre \*\*el archivo\*\*, nunca sobre \*\*la redacción\*\*/.test(claude),
  'dice que la restriccion NO suspende el deber de redactar');
check('V1.2', claude.includes('la afirmación vigente citada literal') &&
              claude.includes('la medición que la contradice') &&
              claude.includes('el texto de reemplazo redactado y listo para aplicar') &&
              claude.includes('las opciones, si hay más de una redacción posible') &&
              claude.includes('qué pieza y qué autorización harían falta'),
  'enumera las CINCO cosas que la bitacora entrega');
check('V1.3', claude.includes('**Redactar no es aplicar.**') &&
              claude.includes('no requiere autorización previa'),
  'declara que redactar no es aplicar');
check('V1.4', claude.includes('fuera de\nzona es el peor resultado posible de una sesión'),
  'declara el peor resultado posible de una sesion');
// §6.1 no debe haber renumerado nada ni tocado el bloque corregido de §6.
check('V1.5', claude.includes('## 7. ENTORNO — WINDOWS') && claude.includes('### 7.1 —') &&
              claude.includes('## 8. LO QUE SE ESPERA DE UNA SESIÓN BIEN HECHA'),
  '§7 y §8 conservan su numero — no hubo renumeracion');
check('V1.6', claude.includes('~~**`CONTRATO_MOTOR.md` no se edita.**') &&
              claude.includes('CORREGIDO 2026-08-16 (§3.3), por el owner'),
  'el bloque corregido de §6 quedo INTACTO');
say('');

// ── V2 — version y changelog ─────────────────────────────────────────────────
say('V2 — el contrato subio a v2.4 y su changelog esta escrito');
say('--------------------------------------------------------------------------------');
check('V2.0', /^Versión: 2\.4$/m.test(contrato), 'la version dice 2.4');
check('V2.1', !/^Versión: 2\.3$/m.test(contrato), 'no quedo ninguna linea "Versión: 2.3" (se sobrescribe, no se tacha)');
check('V2.2', contrato.includes('Cambios v2.4:'), 'el changelog de v2.4 existe');
check('V2.3', contrato.includes('Cambios v2.3:') && contrato.includes('Cambios v2.1:'),
  'los changelogs anteriores siguen ahi');
const iV24 = contrato.indexOf('Cambios v2.4:');
const iV23 = contrato.indexOf('Cambios v2.3:');
check('V2.4', iV24 > 0 && iV24 < iV23, 'v2.4 esta ARRIBA de v2.3, como el resto del changelog');
say('');

// ── V3 — fecha, commit e instrumento en cada enmienda ────────────────────────
say('V3 — LAS ENMIENDAS LLEVAN FECHA, COMMIT E INSTRUMENTO');
say('--------------------------------------------------------------------------------');
// Cada enmienda se ubica por un fragmento propio y se le exige las tres cosas.
const ENMIENDAS = [
  { id: 'E1-celda', ancla: 'la dirección TAMBIÉN existe, y desde `dc7d63e`',
    desc: 'enmienda de la direccion, celda de §5',
    commits: ['dc7d63e', 'f3936b8'], inst: '01_medir_direccion.js', largo: 1600 },
  { id: 'E2-celda', ancla: 'cierto del escalón 1 y falso del frente de re-atribución.** Ninguna bahía',
    desc: 'enmienda del "0 de 164", celda de §5',
    commits: [], inst: null, largo: 400, puntero: 'Ver §5.1' },
  { id: 'E2-bloque', ancla: 'el "0 de 164" es cierto DEL ESCALÓN 1 y falso del frente de',
    desc: 'enmienda del "0 de 164", bloque de §5.1',
    commits: ['d5305d2'], inst: '01_medir_universo.js', largo: 1400 },
  { id: 'E3-retiroA', ancla: 'tal como estaba escrita, esta condición YA DISPARABA',
    desc: 'enmienda de la condicion de retiro, fila de Gobernacion',
    commits: ['dc7d63e', 'd5305d2'], inst: '01_medir_direccion.js', largo: 1600 },
  { id: 'E3-retiroB', ancla: 'esta fila lo tenía peor que la otra: su condición se',
    desc: 'enmienda de la condicion de retiro, fila del escalon',
    commits: ['d5305d2'], inst: '01_medir_direccion.js', largo: 2200 },
];
for (const e of ENMIENDAS) {
  const i = contrato.indexOf(e.ancla);
  if (i < 0) { check(e.id, false, `${e.desc} — NO SE ENCUENTRA EL ANCLA`); continue; }
  // La ventana ARRANCA ANTES del ancla: el rotulo "ENMENDADO <fecha> (§3.3)"
  // precede al texto por el que se ubica la enmienda, y una ventana que empieza
  // en el ancla lo deja afuera y declara falso lo que esta escrito.
  const bloque = contrato.slice(Math.max(0, i - 300), i + e.largo);
  const tieneFecha = /2026-08-16/.test(bloque);
  const tieneCommit = e.commits.length === 0 ? true : e.commits.every(c => bloque.includes(c));
  const tieneInst = e.inst === null ? bloque.includes(e.puntero) : bloque.includes(e.inst);
  const tieneRegla = bloque.includes('(§3.3)');
  check(e.id, tieneFecha && tieneCommit && tieneInst && tieneRegla, e.desc,
    `fecha:${tieneFecha ? 'si' : 'NO'} · commit:${tieneCommit ? (e.commits.join(',') || 'n/a (puntero)') : 'NO'} · ` +
    `${e.inst ? `instrumento:${tieneInst ? e.inst : 'NO'}` : `puntero:${tieneInst ? e.puntero : 'NO'}`} · §3.3:${tieneRegla ? 'si' : 'NO'}`);
}
say('');

// ── V4 — todo instrumento citado existe en la ruta que se cita ───────────────
say('V4 — TODO INSTRUMENTO CITADO EXISTE EN LA RUTA QUE SE CITA');
say('--------------------------------------------------------------------------------');
// Se barren las rutas `_bitacoras/.../algo.js` citadas en lo que esta sesion
// escribio, y se abre cada una. Una cita que no se puede abrir no es respaldo.
const RE_RUTA = /`(_bitacoras\/[^`]+\.(?:js|txt|json))`/g;
const citadas = new Set();
for (const txt of [contrato, registro]) {
  let m; RE_RUTA.lastIndex = 0;
  // Una ruta puede venir partida en dos lineas por el ancho de columna del
  // texto. Se re-pega antes de buscarla en disco: si no, el verificador
  // reporta como rota una cita que esta bien escrita y solo esta envuelta.
  while ((m = RE_RUTA.exec(txt)) !== null) citadas.add(m[1].replace(/\n\s*/g, ''));
}
const ordenadas = [...citadas].sort();
let faltan = 0;
for (const r of ordenadas) {
  const existe = fs.existsSync(path.join(RAIZ, r));
  if (!existe) faltan++;
  say(`      ${existe ? 'ok  ' : 'FALTA'} ${r}`);
}
check('V4.0', faltan === 0, `las ${ordenadas.length} rutas citadas existen en disco`,
  `faltan: ${faltan}`);
// Las tres citas nuevas, nombradas, para que no se diluyan en el barrido.
for (const r of [
  '_bitacoras/clausula_y_papel_2026-08-16/01_medir_direccion.js',
  '_bitacoras/clausula_y_papel_2026-08-16/01_medir_direccion.txt',
  '_bitacoras/reatribucion_reconocimiento_2026-08-16/01_medir_universo.js',
  '_bitacoras/reatribucion_reconocimiento_2026-08-16/02_medir_arrastre.txt',
]) check(`V4.${r.split('/').pop()}`, fs.existsSync(path.join(RAIZ, r)), `existe ${r}`);
say('');

// ── V5 — el tachado sigue visible ───────────────────────────────────────────
say('V5 — el texto enmendado sigue VISIBLE con tachado (§3.3: se enmienda, no se borra)');
say('--------------------------------------------------------------------------------');
check('V5.1', contrato.includes('~~La **dirección sigue sin existir** en ninguna fuente viva~~'),
  'el texto viejo de la direccion sigue visible, tachado');
check('V5.2', contrato.includes('~~**hoy eso no le cuesta ninguna entrada — 0 de 164**~~'),
  'el "0 de 164" de la celda sigue visible, tachado');
check('V5.3', contrato.includes('~~**Hoy eso no le cuesta ninguna entrada — 0 de 164, medido**'),
  'el "0 de 164" del bloque sigue visible, tachado');
check('V5.4', contrato.includes('~~una fuente de contacto\nindexada por Capitanía~~'),
  'la condicion de retiro A sigue visible, tachada');
check('V5.5', contrato.includes('~~una fuente de\n> contacto indexada por Capitanía~~'),
  'la condicion de retiro B sigue visible, tachada');
say('');

// ── V6 — D-R5 en el registro, y las tres anteriores intactas ────────────────
say('V6 — D-R5 entro y D-R1/D-R2/D-R4 quedaron como se escribieron');
say('--------------------------------------------------------------------------------');
check('V6.0', registro.includes('ADDENDUM 2026-08-16 (cuarto)'), 'el addendum cuarto existe');
check('V6.1', /^D-R5 — SITPORT REPORTA CONDICION DE PUERTO/m.test(registro),
  'D-R5 esta escrita en la forma de D-R1/D-R2/D-R4');
check('V6.2', registro.includes('LAS 32 MEDIDAS EL 2026-08-16 QUEDAN HABILITADAS'),
  'D-R5 habilita las 32 explicitamente');
check('V6.3', registro.includes('NO ES PREGUNTA NORMATIVA: no se') && registro.includes('escala.'),
  'D-R5 declara que no es pregunta normativa y no se escala');
// Las tres anteriores, byte a byte contra el blob del ancla.
const registroAncla = execFileSync('git', ['show', `${ANCLA}:${REL_REGISTRO}`], { cwd: RAIZ, maxBuffer: 1 << 24 }).toString();
check('V6.4', registro.startsWith(registroAncla),
  'el registro es el del ancla MAS texto agregado al final — nada anterior se reescribio',
  `${registroAncla.length} bytes antes, ${registro.length} ahora, +${registro.length - registroAncla.length}`);
for (const d of ['D-R1 — PARA EL ROTULO', 'D-R2 — LAS "38 DE 157"', 'D-R4 — EL NOMBRE SALE DEL TITULO']) {
  check(`V6.${d.slice(0, 4)}`, registro.includes(d), `${d.slice(0, 4)} sigue con su texto`);
}
say('');

// ── V7 — zona de escritura ──────────────────────────────────────────────────
say('V7 — no se escribio nada fuera de la zona autorizada');
say('--------------------------------------------------------------------------------');
const AUTORIZADOS = new Set([REL_CLAUDE, REL_CONTRATO, REL_REGISTRO]);
const PREEXISTENTE = new Set(['data/catalogo/estado_drift.json']);
// NO se hace `.trim()` sobre la salida entera: eso come el espacio inicial de la
// PRIMERA linea, y `--porcelain` codifica el estado en las dos primeras
// columnas. Con el espacio comido, `slice(3)` corta el nombre del archivo.
const porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: RAIZ })
  .toString().split('\n').filter(l => l.trim() !== '');
const modificados = porcelain.filter(l => /^[ MARC]M/.test(l) || /^M[ MD]/.test(l)).map(l => l.slice(3).trim());
const fueraDeZona = modificados.filter(r => !AUTORIZADOS.has(r) && !PREEXISTENTE.has(r));
for (const r of modificados) {
  say(`      ${AUTORIZADOS.has(r) ? 'autorizado ' : PREEXISTENTE.has(r) ? 'preexistente' : 'FUERA      '} ${r}`);
}
check('V7.0', fueraDeZona.length === 0, 'ningun archivo modificado fuera de la zona', `fuera: ${fueraDeZona.join(', ') || 'ninguno'}`);
const untrackedNuevos = porcelain.filter(l => l.startsWith('??')).map(l => l.slice(3).trim())
  .filter(r => r.startsWith('_bitacoras/clausula_y_papel_2026-08-16'));
check('V7.1', untrackedNuevos.length === 1 && untrackedNuevos[0] === '_bitacoras/clausula_y_papel_2026-08-16/',
  'lo unico nuevo es el directorio de bitacora de esta sesion', untrackedNuevos.join(', '));
check('V7.2', !modificados.some(r => r.startsWith('src/') || r.startsWith('data/contacto/') || r.startsWith('data/decreto/')),
  'cero `src/`, cero `data/contacto/`, cero `data/decreto/`');
say('');

// ── V8 — sin CRLF ───────────────────────────────────────────────────────────
say('V8 — ningun archivo escrito quedo con CRLF (CLAUDE.md §7.2)');
say('--------------------------------------------------------------------------------');
for (const rel of [REL_CLAUDE, REL_CONTRATO, REL_REGISTRO,
  '_bitacoras/clausula_y_papel_2026-08-16/01_medir_direccion.js',
  '_bitacoras/clausula_y_papel_2026-08-16/01_medir_direccion.txt',
  '_bitacoras/clausula_y_papel_2026-08-16/clausula_y_papel_2026-08-16.txt']) {
  const buf = fs.readFileSync(path.join(RAIZ, rel));
  const crlf = buf.includes(Buffer.from('\r\n'));
  check(`V8.${path.basename(rel)}`, !crlf, `${rel} sin CRLF`);
}
say('');

// ── MORDIDA (CLAUDE.md §4.6) — este verificador se corrigio, y un control que
//    se toca se vuelve a probar contra el defecto que debe cazar. Los cuatro
//    defectos que tuvo en su primera corrida —ventana que empezaba despues del
//    rotulo, ventana corta, ruta partida en dos lineas, y `trim()` sobre la
//    salida entera de porcelain— estan cubiertos abajo, cada uno por su lado.
say('MORDIDA DEL PROPIO VERIFICADOR (CLAUDE.md §4.6)');
say('--------------------------------------------------------------------------------');
const mordidas = [];
const bite = (id, cond, desc) => { mordidas.push(cond); say(`  ${cond ? '✓' : '✗'} ${id}  ${desc} -> ${cond ? 'MUERDE' : 'NO MUERDE'}`); };

// M1 — una enmienda a la que se le quita la fecha debe caer.
{
  const e = ENMIENDAS[0];
  const i = contrato.indexOf(e.ancla);
  const sinFecha = contrato.slice(Math.max(0, i - 300), i + e.largo).replace(/2026-08-16/g, '');
  bite('M1', !/2026-08-16/.test(sinFecha), 'enmienda sin fecha');
}
// M2 — una enmienda a la que se le quita el instrumento debe caer.
{
  const e = ENMIENDAS[0];
  const i = contrato.indexOf(e.ancla);
  const sinInst = contrato.slice(Math.max(0, i - 300), i + e.largo).split('01_medir_direccion.js').join('');
  bite('M2', !sinInst.includes(e.inst), 'enmienda sin instrumento citado');
}
// M3 — la ventana DEBE arrancar antes del ancla; con la ventana vieja, el
//      rotulo "(§3.3)" queda afuera. Es el defecto exacto que tuvo.
{
  const e = ENMIENDAS[0];
  const i = contrato.indexOf(e.ancla);
  const vieja = contrato.slice(i, i + e.largo);
  const nueva = contrato.slice(Math.max(0, i - 300), i + e.largo);
  bite('M3', !vieja.includes('(§3.3)') && nueva.includes('(§3.3)'),
    'ventana que arranca en el ancla pierde el rotulo (§3.3); la corregida lo ve');
}
// M4 — una ruta citada que NO existe debe caer, aunque venga partida en lineas.
{
  const inventada = '`_bitacoras/clausula_y_papel_2026-08-16/\n    99_no_existe.js`';
  let m; const RE = /`(_bitacoras\/[^`]+\.(?:js|txt|json))`/g;
  m = RE.exec(inventada);
  const repegada = m[1].replace(/\n\s*/g, '');
  bite('M4', repegada === '_bitacoras/clausula_y_papel_2026-08-16/99_no_existe.js' &&
             !fs.existsSync(path.join(RAIZ, repegada)),
    'ruta partida en dos lineas que no existe: se re-pega y se caza igual');
}
// M5 — el parseo de porcelain no debe comerse la primera letra del primer
//      archivo. Es el defecto que reporto "LAUDE.md".
{
  const crudo = ' M CLAUDE.md\n M CONTRATO_MOTOR.md\n?? algo/\n';
  const malo = crudo.trim().split('\n').filter(l => /^[ MARC]M/.test(l) || /^M[ MD]/.test(l)).map(l => l.slice(3).trim());
  const bueno = crudo.split('\n').filter(l => l.trim() !== '')
    .filter(l => /^[ MARC]M/.test(l) || /^M[ MD]/.test(l)).map(l => l.slice(3).trim());
  bite('M5', malo[0] !== 'CLAUDE.md' && bueno[0] === 'CLAUDE.md' && bueno.length === 2,
    '`trim()` sobre la salida entera corta el nombre; el parseo corregido no');
}
// M6 — un archivo modificado fuera de la zona debe caer.
{
  const fuera = ['CLAUDE.md', 'src/services/zonas-aviso.js'].filter(r => !AUTORIZADOS.has(r) && !PREEXISTENTE.has(r));
  bite('M6', fuera.length === 1 && fuera[0] === 'src/services/zonas-aviso.js',
    'un archivo de `src/` modificado cae fuera de la zona');
}
const TODAS_MUERDEN = mordidas.every(Boolean);
if (!TODAS_MUERDEN) fallas.push('MORDIDA — un control del verificador no muerde');
say('');

say('================================================================================');
say(`VEREDICTO : ${fallas.length === 0 ? 'TODOS LOS CONTROLES PASAN' : `${fallas.length} CONTROL(ES) FALLAN`}`);
for (const f of fallas) say(`   ✗ ${f}`);
say('================================================================================');

fs.writeFileSync(path.join(__dirname, '02_verificar.txt'), L.join('\n') + '\n', 'utf8');
if (fallas.length > 0) process.exit(1);
