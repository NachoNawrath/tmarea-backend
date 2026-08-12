// P6 — Compara dos estados del insumo derivado, campo por campo.
//
//   node comparar_v2.js <v2_antes.json> <v2_despues.json>
//
// El "antes" se saca del repositorio, no de un respaldo suelto:
//   git show c3f2ae1:data/decreto/jurisdicciones_v2.json > v2_antes.json
// (c3f2ae1 es el ultimo commit del v2 previo a esta pasada, 2026-08-11)
//
// No decide nada ni escribe nada: reporta. La diferencia completa es el
// entregable de P6 — lo que cambio Y lo que no, porque "no cambio" tambien es
// un resultado que hay que poder mostrar.

const fs = require('fs');
const [, , RA, RB] = process.argv;
if (!RA || !RB) { console.error('uso: node comparar_v2.js <antes.json> <despues.json>'); process.exit(2); }

const A = JSON.parse(fs.readFileSync(RA, 'utf8'));
const B = JSON.parse(fs.readFileSync(RB, 'utf8'));
const J = (x) => JSON.stringify(x);
const L = (s = '') => console.log(s);

L('='.repeat(78));
L('P6 — DIFERENCIA COMPLETA DEL INSUMO DERIVADO, ANTES Y DESPUES DE LA PASADA');
L('='.repeat(78));
L(`  antes   : ${RA}`);
L(`  despues : ${RB}`);
L();

// ── 1. claves de nivel superior ──────────────────────────────────────────────
const ka = Object.keys(A), kb = Object.keys(B);
const nuevas = kb.filter(k => !ka.includes(k));
const perdidas = ka.filter(k => !kb.includes(k));
const comunes = ka.filter(k => kb.includes(k));
const cambiadas = comunes.filter(k => J(A[k]) !== J(B[k]));

L('1. CLAVES DE NIVEL SUPERIOR');
L(`   antes ${ka.length}  ->  despues ${kb.length}`);
L(`   NUEVAS   (${nuevas.length}): ${nuevas.join(', ') || '—'}`);
L(`   PERDIDAS (${perdidas.length}): ${perdidas.join(', ') || '— ninguna'}`);
L(`   CAMBIADAS(${cambiadas.length}): ${cambiadas.join(', ') || '—'}`);
L(`   IGUALES  (${comunes.length - cambiadas.length}): ${comunes.filter(k => !cambiadas.includes(k)).join(', ')}`);
L();

// ── 2. detalle de las claves cambiadas que no son `jurisdicciones` ───────────
L('2. DETALLE DE LAS CLAVES CAMBIADAS (fuera de `jurisdicciones`)');
for (const k of cambiadas.filter(x => x !== 'jurisdicciones')) {
  if (k === 'derivado_de') {
    L(`   ${k}:`);
    for (const sub of Object.keys(B[k])) {
      const a = (A[k] || {})[sub], b = B[k][sub];
      L(`     ${sub.padEnd(34)} ${a === b ? 'igual' : String(a).slice(0, 16) + ' -> ' + String(b).slice(0, 16)}`);
    }
    continue;
  }
  if (Array.isArray(A[k]) && Array.isArray(B[k])) {
    const nom = (x) => x.nombre || x.id || J(x).slice(0, 40);
    const na = A[k].map(nom), nb = B[k].map(nom);
    L(`   ${k}: ${A[k].length} -> ${B[k].length} elementos`);
    const mas = nb.filter(x => !na.includes(x)), menos = na.filter(x => !nb.includes(x));
    if (mas.length) L(`     + ${mas.join(', ')}`);
    if (menos.length) L(`     - ${menos.join(', ')}`);
    for (const n of na.filter(x => nb.includes(x))) {
      const a = A[k][na.indexOf(n)], b = B[k][nb.indexOf(n)];
      if (J(a) !== J(b)) {
        const campos = [...new Set([...Object.keys(a), ...Object.keys(b)])]
          .filter(c => J(a[c]) !== J(b[c]));
        L(`     ~ ${n}: ${campos.join(', ')}`);
      }
    }
    continue;
  }
  L(`   ${k}: cambio (${J(A[k]).length} -> ${J(B[k]).length} caracteres)`);
}
L();

// ── 3. jurisdicciones ────────────────────────────────────────────────────────
const ja = Object.fromEntries(A.jurisdicciones.map(x => [x.id, x]));
const jb = Object.fromEntries(B.jurisdicciones.map(x => [x.id, x]));
const idsA = Object.keys(ja), idsB = Object.keys(jb);

L('3. JURISDICCIONES');
L(`   cantidad: ${idsA.length} -> ${idsB.length}`);
L(`   ids nuevos  : ${idsB.filter(i => !idsA.includes(i)).join(', ') || '— ninguno'}`);
L(`   ids perdidos: ${idsA.filter(i => !idsB.includes(i)).join(', ') || '— ninguno'}`);

const porCampo = {}, detalle = [];
for (const id of idsA.filter(i => idsB.includes(i))) {
  const a = ja[id], b = jb[id];
  const campos = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(c => J(a[c]) !== J(b[c]));
  if (campos.length) {
    detalle.push([id, campos]);
    campos.forEach(c => porCampo[c] = (porCampo[c] || 0) + 1);
  }
}
L(`   jurisdicciones que cambiaron: ${detalle.length} de ${idsA.length}`);
L();
L('   campos afectados:');
for (const [c, n] of Object.entries(porCampo).sort((x, y) => y[1] - x[1])) L(`     ${c.padEnd(32)} ${n}`);
L();
L('   una por una:');
for (const [id, campos] of detalle) L(`     ${id.padEnd(20)} ${campos.join(', ')}`);
L();

// ── 4. controles duros: lo que NO tenia que cambiar ──────────────────────────
L('4. CONTROLES — LO QUE NO TENIA QUE CAMBIAR');
const fallos = [];
for (const id of idsA.filter(i => idsB.includes(i))) {
  const a = ja[id], b = jb[id];
  for (const c of ['limite_norte', 'limite_sur', 'contorno', 'tramos', 'receta',
                   'estado_geometria', 'participa_matching', 'ambito',
                   'contorno_cerrado', 'lado_abierto', 'sigue_litoral',
                   'cuerpos_lacustres', 'fronteras', 'punto_representativo']) {
    if (J(a[c]) !== J(b[c])) fallos.push(`${id}.${c}`);
  }
}
L(fallos.length
  ? `   CAMBIARON ${fallos.length}: ${fallos.join(', ')}`
  : '   ok  ningun limite, contorno, tramo, receta, estado, ambito, frontera,');
if (!fallos.length) L('       cuerpo lacustre ni punto representativo cambio en las 64.');

const pa = A.jurisdicciones.flatMap(j => (j.contorno || []).concat(j.puntos_no_incorporados || []));
const pb = B.jurisdicciones.flatMap(j => (j.contorno || []).concat(j.puntos_no_incorporados || []));
L(`   puntos totales: ${pa.length} -> ${pb.length}  ${pa.length === pb.length ? 'ok' : '<<< CAMBIO'}`);
const ra = pa.map(p => `${p.respaldo}/${p.respaldo_textual}`).sort().join('|');
const rb = pb.map(p => `${p.respaldo}/${p.respaldo_textual}`).sort().join('|');
L(`   respaldo de los puntos: ${ra === rb ? 'ok  identico' : '<<< CAMBIO'}`);
L();
L('='.repeat(78));
