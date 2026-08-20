'use strict';
// INVENTARIO DEL VOCABULARIO «transitar / transito / transito» EN LOS DOS REPOS.
//
// DEFECTO DE INSTRUMENTO PROPIO, DECLARADO: el primer barrido uso
// `grep -riE "tr[aá]nsit"` y PERDIO cadenas. La causa: en una expresion de
// corchetes, `a` es la secuencia UTF-8 de DOS bytes, y grep la trata como dos
// alternativas de un byte cada una — no matchea el caracter. Las cadenas con
// «transito» quedaron fuera y el inventario salio corto. Es el DECIMO de la
// serie que el declarativo lleva fichada —la quinta de esta sesion— y de la
// misma forma que los otros nueve: corre perfecto y mide otra cosa.
// EL BARRIDO BUENO usa DOS patrones literales, `transit` y `transit`, que grep
// compara como secuencias de bytes. Se comprueba abajo con un control positivo
// que exige encontrar una cadena acentuada conocida.
//
// CLASIFICACION, declarada antes de contar:
//   PATRON  la cadena la LEE el patron (literal de texto que se renderiza, o
//           campo de texto que la API emite para mostrarse).
//   INTERNO identificador, clave, comentario, o nombre de fichero/componente.
//           NO SE TOCA: renombrar `restriccionesTransito` es comportamiento.
//   CSS     `transition` de hojas de estilo. Es ingles y no es el vocabulario.
//           Falso positivo del patron `transit`, y va declarado para que su
//           conteo no infle nada.
//   TOPONIMO nombre propio de un lugar. NO SE TOCA nunca.

const fs = require('fs');
const path = require('path');

const REPOS = [
  { nombre: 'tmarea-backend', raiz: path.join(__dirname, '..', '..'), dirs: ['src', 'scripts'] },
  { nombre: 'tmarea-pwa', raiz: 'C:/Users/katia/tmarea-pwa', dirs: ['src'] },
];
const EXT = /\.(js|jsx|json|css)$/;
const SALTAR = new Set(['node_modules', '.git', 'dist', 'build', '__tests__']);

// Dos patrones literales. NADA de expresiones de corchetes sobre multibyte.
const PATRONES = ['transit', 'tránsit', 'Transit', 'Tránsit', 'TRANSIT', 'TRÁNSIT'];
const casa = (linea) => PATRONES.some(p => linea.includes(p));

function recorrer(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SALTAR.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(full, out);
    else if (EXT.test(e.name)) out.push(full);
  }
}

// ── CONTROL POSITIVO DEL BARRIDO ─────────────────────────────────────────────
console.log('INVENTARIO DE «transitar / tránsito» — LOS DOS REPOS');
console.log('Corrida: ' + new Date().toISOString());
console.log('');
console.log('CONTROL POSITIVO DEL PATRON — la razon por la que el primer barrido fallo:');
const acentuada = '  mensajeTexto = \'⚠ Restricción activa en zona de tránsito\';';
console.log('  cadena de prueba con acento: ' + (casa(acentuada) ? 'ENCONTRADA' : '!! PERDIDA'));
const sinAcento = "mensajeTexto = '⛔ Tu embarcación NO puede transitar';";
console.log('  cadena de prueba sin acento: ' + (casa(sinAcento) ? 'ENCONTRADA' : '!! PERDIDA'));
console.log('  CONTROL NEGATIVO — linea sin el vocabulario: ' + (casa('const x = 1;') ? '!! FALSO POSITIVO' : 'no casa, correcto'));
console.log('');

// ── EL BARRIDO ───────────────────────────────────────────────────────────────
const hits = [];
for (const r of REPOS) {
  const ficheros = [];
  for (const d of r.dirs) recorrer(path.join(r.raiz, d), ficheros);
  for (const f of ficheros) {
    const lineas = fs.readFileSync(f, 'utf8').split(/\r?\n/);
    lineas.forEach((l, i) => {
      if (casa(l)) hits.push({ repo: r.nombre, fichero: path.relative(r.raiz, f).replace(/\\/g, '/'), linea: i + 1, texto: l.trim() });
    });
  }
  console.log(`  ${r.nombre}: ${ficheros.length} ficheros barridos (${r.dirs.join(', ')}), extensiones ${EXT}`);
}
console.log('');
console.log('DENOMINADOR: ' + hits.length + ' lineas con el vocabulario. Unidad: linea de fichero.');
console.log('');

// ── CLASIFICACION ────────────────────────────────────────────────────────────
// Las cadenas de PATRON se enumeran a mano por su ancla, no por heuristica: una
// heuristica que decida sola que es "texto al patron" es justo lo que no se puede
// defender. Cada una lleva por que.
const PATRON_ANCLAS = [
  { ancla: "NO puede transitar", clase: 'PATRON', verbo: true },
  { ancla: "precaución al transitar", clase: 'PATRON', verbo: true },
  { ancla: "antes de transitar", clase: 'PATRON', verbo: true },
  { ancla: "Restricción activa en zona de tránsito", clase: 'PATRON', verbo: false },
  { ancla: "Restricción activa en tránsito", clase: 'PATRON', verbo: false },
  { ancla: "afecta tu tránsito", clase: 'PATRON', verbo: false },
  { ancla: "Tránsito constante de naves", clase: 'PATRON', verbo: false },
  // AÑADIDA EN LA SEGUNDA PASADA, y va declarado: la primera clasificacion metio
  // el TITULO DEL BLOQUE en INTERNO, porque ninguna ancla lo cubria. Es texto que
  // el patron lee —se renderiza en mayusculas por CSS, «RESTRICCIONES EN
  // TRANSITO»— y es justamente el que el owner pregunto. Una clasificacion por
  // lista de anclas se equivoca por omision, no por exceso: eso es lo que el
  // volcado de la capa de render de abajo existe para cazar.
  { ancla: "Restricciones en tránsito", clase: 'PATRON', verbo: false },
];
const clasificar = (h) => {
  for (const a of PATRON_ANCLAS) if (h.texto.includes(a.ancla)) return a.verbo ? 'PATRON_VERBO' : 'PATRON_SUSTANTIVO';
  if (/transition\s*:/.test(h.texto) || /transition:/.test(h.texto)) return 'CSS';
  if (/Sector El Transito|El Tránsito/.test(h.texto)) return 'TOPONIMO';
  return 'INTERNO';
};

const grupos = {};
for (const h of hits) { const c = clasificar(h); (grupos[c] = grupos[c] || []).push(h); }

for (const c of ['PATRON_VERBO', 'PATRON_SUSTANTIVO', 'TOPONIMO', 'CSS', 'INTERNO']) {
  const g = grupos[c] || [];
  console.log('='.repeat(78));
  console.log(`${c}  —  ${g.length} de ${hits.length}`);
  console.log('='.repeat(78));
  if (c === 'INTERNO' || c === 'CSS') {
    const porFichero = {};
    for (const h of g) porFichero[h.repo + '/' + h.fichero] = (porFichero[h.repo + '/' + h.fichero] || 0) + 1;
    for (const [f, n] of Object.entries(porFichero).sort()) console.log(`   ${String(n).padStart(3)}  ${f}`);
    console.log('   NO SE TOCA.');
  } else {
    for (const h of g) {
      console.log(`   ${h.repo}/${h.fichero}:${h.linea}`);
      console.log(`      ${h.texto.slice(0, 130)}`);
    }
  }
  console.log('');
}

// ── VOLCADO DE SEGURIDAD ─────────────────────────────────────────────────────
// Una clasificacion por lista de anclas se equivoca POR OMISION. Este volcado
// muestra TODA linea con el vocabulario que quedo en INTERNO y vive en la capa
// de render de la PWA —components/ y screens/—, que es donde puede esconderse
// una cadena que el patron lee. Se mira a ojo; no se decide por heuristica.
// Fue este volcado el que cazo el titulo del bloque.
console.log('='.repeat(78));
console.log('VOLCADO DE SEGURIDAD — INTERNO en la capa de render de la PWA');
console.log('='.repeat(78));
const enRender = (grupos.INTERNO || []).filter(h =>
  h.repo === 'tmarea-pwa' && /^src\/(components|screens)\//.test(h.fichero));
if (!enRender.length) console.log('   ninguna. Todo lo que la capa de render tiene con este vocabulario esta clasificado.');
for (const h of enRender) console.log(`   ${h.fichero}:${h.linea}  ${h.texto.slice(0, 120)}`);
console.log('');

console.log('RESUMEN');
for (const c of ['PATRON_VERBO', 'PATRON_SUSTANTIVO', 'TOPONIMO', 'CSS', 'INTERNO']) {
  console.log(`  ${c.padEnd(20)} ${String((grupos[c] || []).length).padStart(3)}`);
}
console.log(`  ${'TOTAL'.padEnd(20)} ${String(hits.length).padStart(3)}`);
