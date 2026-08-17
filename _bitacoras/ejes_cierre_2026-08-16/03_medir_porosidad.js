// _bitacoras/ejes_cierre_2026-08-16/03_medir_porosidad.js
//
// EJES-DEL-CIERRE — tercera pasada, y mide EL CASO QUE ROMPE MI PROPIA
// PARTICION (§1.2). La pasada 2 encontro 67 registros de la bolsa B que
// suspenden actividades y 96 que traen la palabra CERRADO. Si el criterio
// verbatim deja afuera cierres, la particion 254/190 no es una linea: es un
// corte del criterio.
//
// NO propone criterio nuevo. NO toca el motor. Mide el borde.
//
// exit 3 si la particion no reproduce.

const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const DIR = path.join(RAIZ, 'sondaje-sitport');
const SALIDA = path.resolve(__dirname, '03_medir_porosidad.txt');
const L = [];
const say = (s = '') => { L.push(s); console.log(s); };
const hr = (c = '=') => say(c.repeat(80));
const volcar = () => fs.writeFileSync(SALIDA, L.join('\n') + '\n', 'utf8');
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);
const tally = (a) => { const m = new Map(); for (const v of a) m.set(v, (m.get(v) || 0) + 1); return [...m.entries()].sort((x, y) => y[1] - x[1]); };

const capturas = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'bahias_sitport.json')
  .map(f => ({ f, mtime: fs.statSync(path.join(DIR, f)).mtime, recs: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).recordsets[0] || [] }))
  .sort((a, b) => a.mtime - b.mtime);
const filas = []; for (const c of capturas) for (const r of c.recs) filas.push({ cap: c.f, r });
const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const n3 = (s) => norm(s).replace(/[^A-Z0-9Ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const CRITERIO = /PUERTO CERRADO|CONDICION\s*DE\s*PUERTO/;
const A = filas.filter(({ r }) => CRITERIO.test(norm(r.Observacion)));
const B = filas.filter(({ r }) => !CRITERIO.test(norm(r.Observacion)));

hr();
say('EJES DEL CIERRE — PASADA 3: LA POROSIDAD DE LA PARTICION 254/190');
say(`Corrida: ${new Date().toISOString()} · sin salir a la API · A=${A.length} B=${B.length}`);
hr();
if (A.length !== 254 || B.length !== 190) { say('*** exit 3'); volcar(); process.exit(3); }
say();

say('  9.1 — LA PALABRA CERRADO/CERRADA EN LA BOLSA B (los que "no declaran cierre"):');
const bCerr = B.filter(f => /\bCERRAD[OA]S?\b/.test(n3(f.r.Observacion)));
say(`        contienen CERRADO/CERRADA         : ${bCerr.length} / 190`);
const bCerrPara = B.filter(f => /\bCERRAD[OA]S?\s+PARA\b/.test(n3(f.r.Observacion)));
say(`        contienen "CERRADO PARA ..."      : ${bCerrPara.length} / 190`);
say(`        (predicado de cierre dirigido a un segmento de flota)`);
say(`        sin la palabra                    : ${190 - bCerr.length} / 190`);
say(`        suma ${bCerr.length + (190 - bCerr.length)} / 190`);
say();

say('  9.2 — QUE SUJETO LLEVA ESE "CERRADO" EN LA BOLSA B. 6 palabras alrededor:');
const ctx = [];
for (const f of bCerr) {
  const t = n3(f.r.Observacion);
  const re = /(?:\S+\s+){0,3}CERRAD[OA]S?(?:\s+\S+){0,4}/g;
  let m; while ((m = re.exec(t)) !== null) ctx.push(m[0].trim());
}
for (const [k, v] of tally(ctx)) if (v >= 2) say(`        ${rpad(v, 4)}  ${k}`);
say(`        (+ ${tally(ctx).filter(([, v]) => v === 1).length} contextos que aparecen una sola vez)`);
say();

say('  9.3 — EL CASO DEL TIPEO: variantes de "PUERTO" mal escritas que el criterio');
say('        no atrapa. Busqueda: token de 4-7 letras que empieza P y sigue CERRADO.');
const tipos = [];
for (const f of filas) {
  const t = n3(f.r.Observacion);
  const re = /\b(P[A-Z]{2,6})\s+CERRAD[OA]S?\b/g;
  let m; while ((m = re.exec(t)) !== null) tipos.push(m[1]);
}
for (const [k, v] of tally(tipos)) {
  const bolsa = k === 'PUERTO' ? '(criterio SI lo atrapa)' : '(criterio NO lo atrapa)';
  say(`        ${rpad(v, 4)}  "${k} CERRADO"   ${bolsa}`);
}
say();
const conTipeo = B.filter(f => /\bP[A-Z]{2,6}\s+CERRAD[OA]S?\b/.test(n3(f.r.Observacion)) && !/\bPUERTO\s+CERRAD[OA]S?\b/.test(n3(f.r.Observacion)));
say(`        registros de la bolsa B con la forma "P??? CERRADO" no-PUERTO: ${conTipeo.length}`);
for (const f of conTipeo) {
  say(`          ID ${f.r.IDRestriccion} · ${f.r.GLBahia}`);
  say(`             ${JSON.stringify(String(f.r.Observacion).slice(0, 190))}`);
}
say();

say('  9.4 — LOS 190, PARTIDOS POR "TRAE PREDICADO DE CIERRE" (medicion, no criterio nuevo):');
const RE_PRED = /\bCERRAD[OA]S?\s+PARA\b|\bCERRAD[OA]S?\s+EL\b|\bTRAFICO\s+SUSPENDIDO\b|\bSE\s+SUSPENDE\s+EL\s+TRAFICO\b|\bPROHIBICION\s+DE\s+ZARPE\b/;
const bPred = B.filter(f => RE_PRED.test(n3(f.r.Observacion)));
say(`        con predicado de cierre : ${bPred.length} / 190`);
say(`        sin predicado           : ${190 - bPred.length} / 190`);
say(`        suma ${bPred.length + (190 - bPred.length)} / 190`);
say();
say('        >>> ESTO NO PROPONE UN CRITERIO. Mide cuanto material queda del lado');
say('            "no declara cierre" trayendo una frase que cierra algo.');
say();

say('  9.5 — Y EL CASO INVERSO, que es el que rompe mi propia medicion: registros');
say('        de la bolsa A que entran SOLO por "CONDICION DE PUERTO" y cuyo texto');
say('        NO trae ningun predicado de cierre.');
const soloCDP = A.filter(f => !/PUERTO CERRADO/.test(norm(f.r.Observacion)));
const soloCDPsinPred = soloCDP.filter(f => !RE_PRED.test(n3(f.r.Observacion)) && !/\bCERRAD[OA]S?\b/.test(n3(f.r.Observacion)));
say(`        entran solo por "CONDICION DE PUERTO"        : ${soloCDP.length} / 254`);
say(`        de esos, sin CERRADO ni predicado de cierre  : ${soloCDPsinPred.length} / 254`);
const vistos = new Set();
for (const f of soloCDPsinPred) {
  const t = String(f.r.Observacion).slice(0, 150);
  if (vistos.has(t)) continue; vistos.add(t);
  say(`          ID ${f.r.IDRestriccion} · ${f.r.GLBahia}`);
  say(`             ${JSON.stringify(t)}`);
  if (vistos.size >= 10) break;
}
say(`        (textos distintos mostrados: ${vistos.size})`);
say();
say('        >>> LA BOLSA A NO ES "LOS QUE ESTAN CERRADOS": es "los que matchean');
say('            dos literales". Las dos puntas del borde estan medidas arriba.');
say();
hr();
say(`comparaciones efectivas: 444 registros · ${bCerr.length} contextos de CERRADO en B`);
say('exit 0');
hr();
volcar();
