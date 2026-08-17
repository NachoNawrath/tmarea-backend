// _bitacoras/sondaje_cierre_2026-08-16/02_medir_no_cero.js
//
// SONDAJE-CIERRE — segunda pasada. `01_medir_cierre_sitport.js` encontró que los
// tres campos NO estan en 0 en las seis capturas y que NO son binarios:
//   paralizar ∈ {0, 1, 11}   ·   nzarpe ∈ {0}   ·   nrecalada ∈ {0, 2, 8}
// Este instrumento cita ENTEROS los registros no-cero, los cruza contra
// `tiporestriccion` (que es el campo de la fuente que NOMBRA la paralizacion) y
// persigue sus IDRestriccion por las seis capturas, para separar dos cosas que
// (F) no separa: un campo que CAMBIA de valor, y un registro que ENTRA o SALE.
//
// NO propone regla de derivacion. Describe comportamiento.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.resolve(__dirname, '..', '..', 'sondaje-sitport');
const SALIDA = path.resolve(__dirname, '02_medir_no_cero.txt');
const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));

const TRES = ['paralizar', 'nzarpe', 'nrecalada'];
const EXCLUIDOS = ['bahias_sitport.json'];

const capturas = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.json') && !EXCLUIDOS.includes(f))
  .map(f => {
    const full = path.join(DIR, f);
    const buf = fs.readFileSync(full);
    return {
      f, sha: crypto.createHash('sha256').update(buf).digest('hex'),
      mtime: fs.statSync(full).mtime,
      recs: (JSON.parse(buf.toString('utf8')).recordsets[0] || []),
    };
  })
  .sort((a, b) => a.mtime - b.mtime);

const TOTAL = capturas.reduce((a, c) => a + c.recs.length, 0);

hr();
say('SONDAJE DE CIERRE — LOS REGISTROS NO-CERO, ENTEROS');
say('Instrumento: _bitacoras/sondaje_cierre_2026-08-16/02_medir_no_cero.js');
say(`Corrida: ${new Date().toISOString()} · sin salir a la API`);
say(`Universo: ${capturas.length} capturas · ${TOTAL} registros`);
hr();
say();

// ─────────────────────────────────────────────────────────────────────────────
// (A) LOS REGISTROS NO-CERO, CITADOS ENTEROS
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(A) TODO REGISTRO CON ALGUNO DE LOS TRES DISTINTO DE 0 — citado entero');
hr();
const noCero = [];
for (const c of capturas) {
  c.recs.forEach((r, i) => {
    if (TRES.some(k => r[k] !== 0)) noCero.push({ cap: c.f, i, r });
  });
}
say(`    registros no-cero: ${noCero.length} / ${TOTAL}`);
say();
for (const { cap, i, r } of noCero) {
  say(`    ── ${cap} · recordsets[0][${i}] · IDRestriccion ${r.IDRestriccion}`);
  say(JSON.stringify(r, null, 2).split('\n').map(l => '       ' + l).join('\n'));
  say();
}

// ─────────────────────────────────────────────────────────────────────────────
// (B) CRUCE CONTRA `tiporestriccion` — el campo que NOMBRA la paralizacion
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(B) CRUCE: `tiporestriccion` × `paralizar` × `nrecalada`   (denominador 444)');
hr();
const tabla = new Map();
for (const c of capturas) for (const r of c.recs) {
  const k = `${String(r.tiporestriccion)}  ||  paralizar=${r.paralizar}  nzarpe=${r.nzarpe}  nrecalada=${r.nrecalada}`;
  tabla.set(k, (tabla.get(k) || 0) + 1);
}
let suma = 0;
for (const [k, n] of [...tabla.entries()].sort((a, b) => b[1] - a[1])) { say(`    ${String(n).padStart(4)} / ${TOTAL}   ${k}`); suma += n; }
say(`    suma ${suma} — ${suma === TOTAL ? 'CIERRA' : '*** NO CIERRA ***'}`);
say();
const nPar = capturas.reduce((a, c) => a + c.recs.filter(r => /PARALIZAC/i.test(String(r.tiporestriccion))).length, 0);
const nParaliz = capturas.reduce((a, c) => a + c.recs.filter(r => r.paralizar !== 0).length, 0);
say(`    tiporestriccion dice PARALIZACIÓN… : ${nPar} / ${TOTAL}`);
say(`    paralizar !== 0                    : ${nParaliz} / ${TOTAL}`);
say('    >>> si estos dos numeros no coinciden, el campo `paralizar` NO es la bandera');
say('        del tipo de restriccion que la fuente ya nombra en texto.');
say();

// ─────────────────────────────────────────────────────────────────────────────
// (C) LOS ID NO-CERO, PERSEGUIDOS POR LAS SEIS CAPTURAS
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(C) ¿EL VALOR CAMBIA, O EL REGISTRO ENTRA Y SALE? — cada ID no-cero, capturado a capturado');
hr();
const idsNoCero = [...new Set(noCero.map(x => x.r.IDRestriccion))];
say(`    IDRestriccion distintos con algun campo no-cero: ${idsNoCero.length}`);
say();
for (const id of idsNoCero) {
  say(`    ID ${id}`);
  for (const c of capturas) {
    const r = c.recs.find(x => x.IDRestriccion === id);
    if (!r) say(`        ${c.f.padEnd(38)} — AUSENTE de esta captura`);
    else say(`        ${c.f.padEnd(38)} paralizar=${r.paralizar} nzarpe=${r.nzarpe} nrecalada=${r.nrecalada}  · ${r.GLBahia}`);
  }
  say();
}

// ─────────────────────────────────────────────────────────────────────────────
// (D) ¿ES UN CONTEO? — lo que el dato deja ver de la FORMA del valor
// ─────────────────────────────────────────────────────────────────────────────
hr();
say('(D) OBSERVACIONES DE FORMA DEL VALOR — sin proponer regla');
hr();
// ¿Los 9 con paralizar=11 son 9 registros distintos o 9 filas del mismo evento?
const g11 = noCero.filter(x => x.r.paralizar === 11);
say(`    (D1) los ${g11.length} registros con paralizar=11:`);
say(`         IDRestriccion distintos : ${new Set(g11.map(x => x.r.IDRestriccion)).size}`);
say(`         bahias distintas        : ${new Set(g11.map(x => x.r.GLBahia)).size}  -> ${[...new Set(g11.map(x => x.r.GLBahia))].join(' · ')}`);
say(`         FCinicio distintos      : ${new Set(g11.map(x => x.r.FCinicio)).size}  -> ${[...new Set(g11.map(x => x.r.FCinicio))].join(' · ')}`);
say(`         tiporestriccion         : ${[...new Set(g11.map(x => x.r.tiporestriccion))].join(' · ')}`);
say(`         nrecalada de esos 9     : ${[...new Set(g11.map(x => x.r.nrecalada))].join(' · ')}`);
say();
// ¿los valores coinciden con algun conteo del propio registro o de la captura?
say('    (D2) ¿el valor coincide con algun conteo de la captura donde vive?');
for (const { cap, r } of noCero) {
  const c = capturas.find(x => x.f === cap);
  const mismaBahia = c.recs.filter(x => x.bahia === r.bahia).length;
  const mismoID = c.recs.filter(x => x.IDRestriccion === r.IDRestriccion).length;
  say(`         ${cap.slice(0, 34).padEnd(36)} ID ${String(r.IDRestriccion).padStart(6)} · paralizar=${String(r.paralizar).padStart(2)} nrecalada=${String(r.nrecalada).padStart(2)} · filas de su bahia en la captura: ${mismaBahia} · filas de su ID: ${mismoID}`);
}
say();
say('    (D3) rango: los valores observados son 0,1,11 (paralizar) y 0,2,8 (nrecalada).');
say('         `nzarpe` es 0 en 444/444: constante en las seis capturas y en las');
say('         231 comparaciones efectivas de (F). Un campo constante no puede ser');
say('         la señal — no distingue ningun caso del resto del universo medido.');
say();

hr();
say(`FIN — no-cero: ${noCero.length}/${TOTAL} · IDs no-cero: ${idsNoCero.length} · capturas: ${capturas.length}`);
hr();

fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
console.log(`\n[salida escrita] ${SALIDA}`);
