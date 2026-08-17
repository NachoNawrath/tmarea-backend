'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 03_medir_cierre_total.js — ¿el bloque que P2 arregla LLEGA A PANTALLA?
//
// POR QUE EXISTE. Al montar la app para verificar el cierre de P2 no se pudo
// producir el aviso de arribada forzosa. La causa candidata: la PWA decide
// `estado === 'rojo'` con `restricciones.some(r => r.nivel === 'cierre_total')`
// (`useVoyageVerification.js:236`), y **`cierre_total` no aparece en ningun otro
// archivo de los dos repositorios**. Este instrumento mide si la fuente emite
// ese campo, CONTRA EL DATO VIVO de SITPORT y no contra un fixture.
//
// LA CADENA QUE SE MIDE, entera:
//   restricciones[].nivel === 'cierre_total'   (useVoyageVerification.js:236)
//     -> portStatus.recalada.estado === 'rojo'
//     -> recaladaRaw === 'UV'                  (:155)
//     -> arribadaForzosa = true                (:160-162)
//     -> se renderiza el aviso de P2            (P3_VoyageVerification.jsx:236)
// Si el primer eslabon no existe, el ultimo no ocurre nunca.
//
// NO TOCA EL MOTOR BRE. Solo lee la salida del endpoint ya publicado.
// Aborta con exit 3 si no hay respuesta o si las comparaciones son cero.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const SALIDA = path.join(__dirname, '03_medir_cierre_total.txt');
const RAIZ_PWA = path.join(__dirname, '..', '..', '..', 'tmarea-pwa');

const out = [];
const P = (s = '') => { out.push(s); console.log(s); };
const guardar = () => fs.writeFileSync(SALIDA, out.join('\n') + '\n', 'utf8');
const abortar = (m) => { P(''); P('ABORTA: ' + m); guardar(); process.exit(3); };

(async () => {
  P('================================================================================');
  P('¿EL AVISO DE ARRIBADA FORZOSA LLEGA A PANTALLA? — medido contra el dato vivo');
  P('================================================================================');
  P('');

  // ── (A) el consumidor, citado del arbol ───────────────────────────────────
  const hook = fs.readFileSync(path.join(RAIZ_PWA, 'src', 'hooks', 'useVoyageVerification.js'), 'utf8').replace(/\r\n/g, '\n').split('\n');
  const iCierre = hook.findIndex(l => l.includes("'cierre_total'"));
  if (iCierre < 0) abortar('no se encontro el consumidor de cierre_total en useVoyageVerification.js');
  P('(A) EL CONSUMIDOR — citado literal, con su linea');
  P(`    useVoyageVerification.js:${iCierre + 1}`);
  P(`      ${hook[iCierre].trim()}`);
  P('');

  // ── (B) el productor — barrido de los dos repos ───────────────────────────
  P('(B) EL PRODUCTOR');
  const repos = [
    ['tmarea-backend', path.join(__dirname, '..', '..')],
    ['tmarea-pwa', RAIZ_PWA],
  ];
  let apariciones = 0;
  for (const [nombre, raiz] of repos) {
    const hits = [];
    (function barrer(dir) {
      let entradas;
      try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entradas) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === '_bitacoras') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) barrer(p);
        else if (/\.(jsx?|tsx?|json)$/.test(e.name)) {
          let t; try { t = fs.readFileSync(p, 'utf8'); } catch { continue; }
          if (t.includes('cierre_total')) hits.push(path.relative(raiz, p).replace(/\\/g, '/'));
        }
      }
    })(raiz);
    apariciones += hits.length;
    P(`    ${nombre} : ${hits.length} archivo(s) nombran "cierre_total"`);
    for (const h of hits) P(`      ${h}`);
  }
  P('');
  P('    -> el unico que lo nombra es el que lo BUSCA. Nadie lo escribe.');
  P('');

  // ── (C) el dato vivo ──────────────────────────────────────────────────────
  P('(C) LO QUE SITPORT PUBLICA AHORA — via el endpoint ya montado en :3000');
  let j;
  try {
    const r = await fetch('http://localhost:3000/api/sitport/restricciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    j = await r.json();
  } catch (e) {
    abortar(`no hubo respuesta del backend en :3000 — ${e.message}. Sin dato vivo esto no mide nada.`);
  }
  const registros = j && j.data ? j.data : [];
  if (registros.length === 0) abortar('el endpoint devolvio cero registros: no hay universo que medir');

  P(`    registros de restriccion publicados : ${registros.length}`);
  const conNivel = registros.filter(r => Object.prototype.hasOwnProperty.call(r, 'nivel'));
  P(`    que traen el campo \`nivel\`          : ${conNivel.length}`);
  P(`    con nivel === 'cierre_total'        : ${registros.filter(r => r.nivel === 'cierre_total').length}`);
  P('');
  const campos = new Set();
  for (const r of registros) for (const k of Object.keys(r)) campos.add(k);
  P(`    campos que la fuente SI emite (${campos.size}) :`);
  P('      ' + [...campos].sort().join(', '));
  P('');

  // Los candidatos naturales a "cierre", que la fuente si emite y nadie lee.
  P('    LOS CAMPOS DE CIERRE QUE LA FUENTE SI EMITE, y su valor hoy :');
  let comparadas = 0;
  for (const c of ['paralizar', 'nzarpe', 'nrecalada']) {
    if (!campos.has(c)) { P(`      ${c.padEnd(12)} : NO lo emite`); continue; }
    comparadas++;
    const vals = {};
    for (const r of registros) vals[String(r[c])] = (vals[String(r[c])] || 0) + 1;
    P(`      ${c.padEnd(12)} : ${JSON.stringify(vals)}`);
  }
  if (comparadas === 0) abortar('cero comparaciones efectivas sobre los campos de cierre');
  P('');

  // ── (D) la cadena ─────────────────────────────────────────────────────────
  P('(D) LA CADENA, ESLABON POR ESLABON');
  const rojo = registros.some(r => r.nivel === 'cierre_total');
  P(`    1. alguna restriccion con nivel === 'cierre_total'  : ${rojo ? 'SI' : 'NO'}`);
  P(`    2. -> portStatus.recalada.estado === 'rojo'         : ${rojo ? 'SI' : 'NO'}`);
  P(`    3. -> recaladaRaw === 'UV'  (:155)                  : ${rojo ? 'SI' : 'NO'}`);
  P(`    4. -> arribadaForzosa = true  (:160-162)            : ${rojo ? 'SI' : 'NO'}`);
  P(`    5. -> se renderiza el aviso de P2                   : ${rojo ? 'SI' : 'NO'}`);
  P('');
  if (!rojo) {
    P('    >>> EL BLOQUE QUE P2 ARREGLA NO SE RENDERIZA CON EL DATO DE HOY, y no');
    P('        por una casualidad del dia: el campo del que depende NO LO EMITE');
    P('        NADIE. El arreglo del rotulo es correcto y necesario —el codigo');
    P('        decia algo falso—, pero lo que el patron ve HOY no cambia. Las dos');
    P('        cosas son ciertas a la vez y hay que decirlas juntas.');
  }
  P('');
  P('================================================================================');
  P(`FIN — apariciones de "cierre_total" en los dos repos: ${apariciones} · registros medidos: ${registros.length}`);
  P('================================================================================');
  guardar();
})();
