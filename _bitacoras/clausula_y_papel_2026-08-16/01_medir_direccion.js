'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_direccion.js — LA DIRECCION DE CAPITANIA: EXISTE EN FUENTE VIVA, Y
// NO LA CONSUME NADIE.
//
// PREGUNTA, y son DOS, porque la fila de §5 mezcla las dos en una frase:
//   (1) ¿existe la direccion de Capitania en una fuente VIVA del repositorio?
//   (2) ¿la lee alguien de `src/`?
//
// POR QUE IMPORTA LA PALABRA "VIVA". La fila de §5 dice que la direccion "sigue
// sin existir en ninguna fuente viva". El campo `direccion` existe en
// `data/contacto/reparticiones_publicadas.json` desde `f3936b8`, pero hasta
// `dc7d63e` ese archivo era un derivado de generacion —lo leian tres scripts y
// ningun archivo de `src/`, y §5.1 lo dice literal—. Lo que volvio falsa la
// frase NO fue un dato nuevo: fue el ascenso del insumo a fuente viva. Por eso
// el instrumento mide las dos cosas por separado y no las suma.
//
// LO QUE ESTE INSTRUMENTO NO HACE: no sale a la API, no monta la app y no
// ejecuta ningun modulo de `src/`. El barrido de consumidores es LEXICO sobre el
// arbol, y por eso su negativa se declara como tal (CLAUDE.md §2): lo que
// devuelve es "no lo encontre con este parser", con el parser escrito al lado.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const ANCLA = 'd5305d2c893414633ffd2aefc2e00d22a3edf070';

const P_REPS = path.join(RAIZ, 'data', 'contacto', 'reparticiones_publicadas.json');
const REL_REPS = 'data/contacto/reparticiones_publicadas.json';
const P_SRC = path.join(RAIZ, 'src');

const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const L = [];
const say = s => { L.push(s); console.log(s); };

// ── LINEA BASE — el instrumento aborta, no concluye ──────────────────────────
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ }).toString().trim();
if (head !== ANCLA) {
  console.error(`ABORTA: HEAD es ${head}, se esperaba el ancla ${ANCLA}. La linea base es parte de la medicion.`);
  process.exit(3);
}
const sucio = execFileSync('git', ['status', '--porcelain', '--', REL_REPS], { cwd: RAIZ }).toString();
if (sucio.trim() !== '') {
  console.error(`ABORTA: el insumo esta modificado respecto del ancla:\n${sucio}`);
  process.exit(3);
}

say('================================================================================');
say('LA DIRECCION DE CAPITANIA — existe en fuente viva, y no la consume nadie');
say(`ancla HEAD : ${ANCLA}`);
say(`fecha      : ${new Date().toISOString()}`);
say('================================================================================');
say('');

// ── PROCEDENCIA DEL INSUMO ───────────────────────────────────────────────────
say('PROCEDENCIA DEL INSUMO');
say('--------------------------------------------------------------------------------');
const stat = fs.statSync(P_REPS);
say(`  ruta       : ${REL_REPS}`);
say(`  sha256     : ${sha(P_REPS)}`);
say(`  bytes      : ${stat.size}`);
say(`  mtime      : ${stat.mtime.toISOString()}   (mtime de checkout, NO fecha de captura)`);

// El blob de git es la identidad que importa: dice si el archivo es EL MISMO en
// los commits que la enmienda cita. El sha256 del archivo en disco y el blob de
// git no son el mismo byte cuando hay CRLF de por medio (CLAUDE.md §3.5).
const blobEn = c => execFileSync('git', ['rev-parse', `${c}:${REL_REPS}`], { cwd: RAIZ }).toString().trim();
const blobDisco = execFileSync('git', ['hash-object', REL_REPS], { cwd: RAIZ }).toString().trim();
const COMMITS = ['f3936b8', 'dc7d63e', 'a0eb892', 'd5305d2'];
say('');
say('  blob de git por commit — dice si el archivo es EL MISMO, no si se parece:');
for (const c of COMMITS) say(`    ${c}  ${blobEn(c)}`);
say(`    en disco   ${blobDisco}`);
const idénticosDesde = COMMITS.filter(c => blobEn(c) === blobDisco);
say(`  identico al de hoy en: ${idénticosDesde.join(', ')}`);
say('');

// ── (1) ¿EXISTE LA DIRECCION EN EL INSUMO? ───────────────────────────────────
const insumo = JSON.parse(fs.readFileSync(P_REPS, 'utf8'));
const REPS = insumo.reparticiones;

function contarDirecciones(reps) {
  const claves = Object.keys(reps);
  const con = [];
  const sin = [];
  for (const k of claves) {
    const d = reps[k].direccion;
    if (typeof d === 'string' && d.trim() !== '') con.push(k); else sin.push(k);
  }
  return { total: claves.length, con, sin };
}

const c1 = contarDirecciones(REPS);
say('(1) ¿EXISTE LA DIRECCION EN EL INSUMO?');
say('--------------------------------------------------------------------------------');
say(`  reparticiones en el insumo        : ${c1.total}`);
say(`  con \`direccion\` no vacia          : ${c1.con.length}`);
say(`  sin \`direccion\`                   : ${c1.sin.length}`);
for (const k of c1.sin) {
  say(`      -> CdRep ${k}  ${REPS[k].nombre_sitport}  direccion=${JSON.stringify(REPS[k].direccion)}`);
}
say(`  SUMA : ${c1.con.length} + ${c1.sin.length} = ${c1.con.length + c1.sin.length}  de ${c1.total}   ${c1.con.length + c1.sin.length === c1.total ? 'CIERRA' : 'NO CIERRA'}`);
say('');
say('  Y LO QUE NO ES UNA CASUALIDAD, dicho para que no se lea como dos defectos:');
const sinNombre = Object.keys(REPS).filter(k => !(typeof REPS[k].nombre_publicado === 'string' && REPS[k].nombre_publicado.trim() !== ''));
say(`  reparticiones sin \`nombre_publicado\` : ${sinNombre.length}  -> ${sinNombre.map(k => `${k} (${REPS[k].nombre_sitport})`).join(' · ')}`);
const solapan = c1.sin.filter(k => sinNombre.includes(k));
say(`  la unica sin direccion, ¿esta tambien sin nombre publicado? : ${solapan.length === c1.sin.length ? 'SI' : 'NO'}  -> ${solapan.join(', ') || '(ninguna)'}`);
say('  Es la misma carencia de la misma ficha, no dos huecos distintos.');
say('');

// ── (2) ¿QUIEN LEE EL INSUMO, Y QUIEN LEE `direccion`? ───────────────────────
function jsDe(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...jsDe(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const ARCHIVOS = jsDe(P_SRC).sort();

// PARSER DECLARADO, para que la negativa sea auditable:
//   · consumidor del insumo = el texto nombra `reparticiones_publicadas`
//   · lectura del campo     = `.direccion` o 'direccion'/"direccion" como clave,
//     NUNCA seguido de `_` ni de otra letra. Eso excluye `direccion_viento`,
//     `direccion_deg`, `direccion_grados` y `direccionDeriva`, que son de otro
//     dato y estan en el arbol.
const RE_INSUMO = /reparticiones_publicadas/;
const RE_CAMPO = /(?:\.direccion|['"]direccion['"])(?![\w_])/g;

function analizar(archivos, leer) {
  const consumidores = [];
  const hitsCampo = [];
  for (const p of archivos) {
    const txt = leer(p);
    const rel = path.relative(RAIZ, p).replace(/\\/g, '/');
    const esConsumidor = RE_INSUMO.test(txt);
    if (esConsumidor) consumidores.push(rel);
    txt.split('\n').forEach((linea, i) => {
      RE_CAMPO.lastIndex = 0;
      if (RE_CAMPO.test(linea)) hitsCampo.push({ rel, n: i + 1, esConsumidor, linea: linea.trim() });
    });
  }
  return { consumidores, hitsCampo };
}

const a = analizar(ARCHIVOS, p => fs.readFileSync(p, 'utf8'));

say('(2) ¿QUIEN LEE EL INSUMO, Y QUIEN LEE EL CAMPO `direccion`?');
say('--------------------------------------------------------------------------------');
say(`  archivos .js barridos bajo src/          : ${ARCHIVOS.length}`);
say(`  que nombran \`reparticiones_publicadas\`   : ${a.consumidores.length}`);
for (const r of a.consumidores) say(`      -> ${r}`);
say('');
say(`  apariciones de \`direccion\` como campo en src/ : ${a.hitsCampo.length}`);
for (const h of a.hitsCampo) {
  say(`      ${h.esConsumidor ? '[CONSUMIDOR]' : '[ajeno]     '} ${h.rel}:${h.n}  ${h.linea.slice(0, 72)}`);
}
const enConsumidor = a.hitsCampo.filter(h => h.esConsumidor);
say('');
say(`  >>> apariciones dentro de un CONSUMIDOR del insumo : ${enConsumidor.length}`);
say(`  >>> NINGUN archivo de src/ lee la direccion del insumo : ${enConsumidor.length === 0 ? 'CONFIRMADO' : 'FALSO'}`);
say('');
say('  ALCANCE DE ESTA NEGATIVA (CLAUDE.md §2): es un barrido LEXICO sobre el');
say('  arbol, con el parser escrito arriba. No se monto la app. Un consumidor que');
say('  llegara al campo por indireccion —destructuring con renombre, acceso por');
say('  variable— no lo caza este parser, y se dice en vez de afirmar cobertura.');
say('');

// ── MORDIDA (CLAUDE.md §4.6) — el control tiene que poder fallar ─────────────
say('MORDIDA — se le inyecta el defecto que debe cazar (CLAUDE.md §4.6)');
say('--------------------------------------------------------------------------------');

// B1 — si una repartición perdiera su direccion, ¿se mueve el conteo?
const variante = JSON.parse(JSON.stringify(REPS));
const victima = c1.con[0];
variante[victima].direccion = null;
const c2 = contarDirecciones(variante);
const b1 = c2.con.length === c1.con.length - 1;
say(`  B1  una reparticion pierde su direccion (CdRep ${victima})`);
say(`      esperado ${c1.con.length - 1}, medido ${c2.con.length}  -> ${b1 ? 'MUERDE' : 'NO MUERDE'}`);

// B2 — si un consumidor del insumo empezara a leer `direccion`, ¿lo caza?
const FALSO = "const r = require('../../data/contacto/reparticiones_publicadas.json');\nconst d = r.reparticiones[k].direccion;\n";
const b = analizar([path.join(P_SRC, '__mordida_ficticia.js')], () => FALSO);
const b2 = b.consumidores.length === 1 && b.hitsCampo.filter(h => h.esConsumidor).length === 1;
say('  B2  un consumidor ficticio del insumo que SI lee `direccion`');
say(`      esperado 1 consumidor y 1 hit marcado [CONSUMIDOR], medido ${b.consumidores.length} y ${b.hitsCampo.filter(h => h.esConsumidor).length}  -> ${b2 ? 'MUERDE' : 'NO MUERDE'}`);
say('      (el archivo NO existe: el texto se le pasa al analizador en memoria)');

// B3 — el parser no debe confundir `direccion_viento` con el campo del insumo
const RUIDO = "const x = b.direccion_viento;\nconst y = w.direccion_deg;\nconst z = direccionDeriva;\n";
const c = analizar([path.join(P_SRC, '__ruido_ficticio.js')], () => RUIDO);
const b3 = c.hitsCampo.length === 0;
say('  B3  ruido del arbol real: `direccion_viento`, `direccion_deg`, `direccionDeriva`');
say(`      esperado 0 hits, medido ${c.hitsCampo.length}  -> ${b3 ? 'MUERDE' : 'NO MUERDE'}`);
say('');

// ── VEREDICTO ────────────────────────────────────────────────────────────────
const OK_1 = c1.total === 64 && c1.con.length === 63 && c1.sin.length === 1;
const OK_2 = enConsumidor.length === 0;
const OK_B = b1 && b2 && b3;

say('================================================================================');
say('VEREDICTO');
say('================================================================================');
say(`  (1) la direccion EXISTE en fuente viva : ${c1.con.length} de ${c1.total}   ${OK_1 ? 'como se declara' : 'DISTINTO DE LO DECLARADO'}`);
say(`  (2) la direccion NO la consume nadie   : ${enConsumidor.length} lecturas en src/   ${OK_2 ? 'como se declara' : 'DISTINTO DE LO DECLARADO'}`);
say(`  mordida B1·B2·B3                       : ${OK_B ? 'las tres muerden' : 'UNA NO MUERDE'}`);
say('');
say('  LO QUE ESTO LE CORRIGE A §5: la fila dice que la direccion "sigue sin');
say('  existir en ninguna fuente viva". EXISTE, en 63 de 64, y el archivo es');
say('  fuente viva desde `dc7d63e` —lo lee `src/services/contacto-por-escalon.js`—.');
say('  LO QUE NO CAMBIA: la fila sigue en PENDIENTE. Cambia su causa: no falta la');
say('  fuente, falta el consumidor. INV-10.1 manda mostrar la direccion y hoy');
say('  ningun render la recibe.');
say('================================================================================');

fs.writeFileSync(path.join(__dirname, '01_medir_direccion.txt'), L.join('\n') + '\n', 'utf8');

if (!(OK_1 && OK_2 && OK_B)) {
  console.error('ABORTA: la medicion no reproduce lo declarado, o un control no muerde.');
  process.exit(3);
}
