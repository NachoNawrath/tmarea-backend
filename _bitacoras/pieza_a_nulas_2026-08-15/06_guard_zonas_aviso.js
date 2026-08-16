'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 06_guard_zonas_aviso.js — SOLO MIDE. No escribe nada.
//
// La Pieza A dejo la suite en 69/84. NO es un fallo del generador: es el guard
// de `src/services/zonas-aviso.js:105-113` haciendo exactamente lo que fue
// escrito para hacer.
//
// `data/decreto/zonas_aviso.json` declara, para algunas zonas, un contacto de
// tipo `sin_contacto` con su `motivo` y con la lista de `bahias_en_discrepancia`
// que lo hace comprobable. El guard exige que esa discrepancia SIGA EXISTIENDO:
// si el mapa pasa a coincidir con el decreto, el `sin_contacto` estaria
// escondiendo un contacto que si se puede dar.
//
// Este instrumento mide, zona por zona, cuales de esas discrepancias declaradas
// siguen en pie despues de la Pieza A y cuales dejaron de existir.
//
// Corrida:  node _bitacoras/pieza_a_nulas_2026-08-15/06_guard_zonas_aviso.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const ANCLA = '0bc80d2';

const zonas = JSON.parse(fs.readFileSync(abs('data/decreto/zonas_aviso.json'), 'utf8'));
const jur = JSON.parse(fs.readFileSync(abs('data/decreto/jurisdicciones_v2.json'), 'utf8'));
const J = new Map(jur.jurisdicciones.map(j => [j.id, j]));
const despues = JSON.parse(fs.readFileSync(abs('src/data/bahia-capitania-map.json'), 'utf8'));
let antes;
try { antes = JSON.parse(execFileSync('git', ['show', `${ANCLA}:src/data/bahia-capitania-map.json`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })); }
catch (e) { console.error(`ABORTA — no se pudo leer el ancla: ${e.message}`); process.exit(3); }

// La misma regla que el guard, reescrita aca: un instrumento que importara el
// guard probaria que el guard coincide consigo mismo.
function coincide(entrada, j) {
  if (!entrada || !j) return false;
  if (entrada.capitania != null) return normalizarTexto(entrada.capitania) === normalizarTexto(j.nombre);
  return normalizarTexto(entrada.gobernacion || '') === normalizarTexto(j.gobernacion || '');
}

L('================================================================================');
L('EL GUARD DE `sin_contacto` DE zonas-aviso.js CONTRA LA PIEZA A');
L('================================================================================');
const lista = zonas.zonas || zonas.entradas || [];
L('');
L(`  zonas declaradas : ${lista.length}`);

let comparadas = 0, siguen = 0, dejaron = 0;
const rotas = [];
L('');
L('  zona                 decreto              bahia   ¿discrepaba en ' + ANCLA + '?  ¿discrepa hoy?');
for (const z of lista) {
  const c = z.contacto;
  if (!c || c.tipo !== 'sin_contacto') continue;
  const j = J.get(z.jurisdiccion_id);
  for (const id of (c.bahias_en_discrepancia || [])) {
    comparadas++;
    const antesDiscrepa = !coincide(antes[String(id)], j);
    const hoyDiscrepa = !coincide(despues[String(id)], j);
    if (hoyDiscrepa) siguen++; else { dejaron++; rotas.push({ zona: z.jurisdiccion_id, id, j }); }
    L(`  ${String(z.jurisdiccion_id).padEnd(20)} ${String(j && j.nombre).padEnd(20)} ${String(id).padStart(5)}   ${String(antesDiscrepa).padEnd(20)} ${hoyDiscrepa}`);
  }
}
L('');
L(`  COMPARACIONES EFECTIVAS : ${comparadas}`);
L(`  discrepancias que siguen en pie : ${siguen}`);
L(`  discrepancias que DEJARON de existir : ${dejaron}`);
if (comparadas === 0) { L(''); L('ABORTA — cero comparaciones efectivas: ninguna zona declara `sin_contacto` con bahias.'); process.exit(3); }

for (const r of rotas) {
  const e = despues[String(r.id)];
  L('');
  L(`  ZONA '${r.zona}' — su \`sin_contacto\` ya no es cierto:`);
  L(`      el decreto la llama          : "${r.j.nombre}" (gobernacion "${r.j.gobernacion}")`);
  L(`      el mapa decia en ${ANCLA}      : capitania=${JSON.stringify(antes[String(r.id)].capitania)}  telefono=${JSON.stringify(antes[String(r.id)].telefono)}`);
  L(`      el mapa dice hoy             : capitania=${JSON.stringify(e.capitania)}  telefono=${JSON.stringify(e.telefono)}`);
  L(`      motivo declarado en el dato  : ${JSON.stringify((lista.find(z => z.jurisdiccion_id === r.zona).contacto || {}).motivo)}`);
  // El motivo declara DOS discrepancias y el guard mide UNA.
  const gobMapa = e.gobernacion, gobDecreto = r.j.gobernacion;
  L('');
  L('      LAS DOS MITADES DEL MOTIVO, por separado:');
  L(`        (i)  "no tiene Capitania atribuida"        -> HOY ES FALSO: dice ${JSON.stringify(e.capitania)}`);
  L(`        (ii) "la Gobernacion del mapa no es la del decreto"`);
  L(`             mapa=${JSON.stringify(gobMapa)}  decreto=${JSON.stringify(gobDecreto)}  -> sigue siendo ${normalizarTexto(gobMapa || '') !== normalizarTexto(gobDecreto || '') ? 'CIERTO' : 'falso'}`);
  L('        El guard de zonas-aviso.js:108-110 solo mira la Gobernacion cuando');
  L('        `capitania == null`. Escrita la Capitania, deja de mirarla. O sea que');
  L('        la declaracion quedo MITAD FALSA y el control no puede decir cual');
  L('        mitad. La Pieza A no toca `gobernacion` y no cerro esa discrepancia.');
}

L('');
L('  QUE SIGNIFICA, dicho sin suavizar: el guard NO fallo. Cazo que un dato');
L('  declarado como "no hay contacto que dar" dejo de ser cierto porque el');
L('  contacto aparecio. Corregir la declaracion cambia lo que el patron ve en el');
L('  aviso de esa zona, asi que no se resuelve de este lado (CLAUDE.md §0.4).');
L('  `data/decreto/zonas_aviso.json` NO se toco.');
L('================================================================================');
