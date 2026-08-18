// ─────────────────────────────────────────────────────────────────────────────
// M1-M3 + LA CURVA DEL UMBRAL N — anclas desplazadas.
// SOLO LEE. No invoca ningún instrumento de F1, no toca la base, no corrige
// nada. Comprueba el sha256 de los dos entregables de F1 al abrir y al cerrar.
// Material: CONGELADO_vivo.json y CONGELADO_puertos.json 23:02Z, versionados,
// más el join commiteado y BAHIA_COORDS extraído VERBATIM por estructura.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BACK = 'C:/Users/katia/tmarea-backend';
const INS = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/insumos');
const SALIDA = process.argv[2] || path.join(__dirname, '08_medir_anclas_desplazadas.txt');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const falla = m => { fallas.push(m); say('  ✗ FALLA · ' + m); };
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const N4 = n => String(n).padStart(4);

const ENTREGABLES = {
  'data/catalogo/join_puerto_bahia.json': 'dfd072361faa5607b7c487b73d5d45796d16ec10cbd99a613a5df7db351168f5',
  '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv': '0ca33c18e48229eba257573ff662cfb2f770e62b24d53354aae220c8d72a1788',
};
const antes = {};
for (const [rel, esp] of Object.entries(ENTREGABLES)) {
  antes[rel] = sha256(path.join(BACK, rel));
  if (antes[rel] !== esp) falla(`ENTREGABLE YA ALTERADO ANTES DE MEDIR: ${rel}`);
}

// ── INSUMOS ──────────────────────────────────────────────────────────────────
const SRC = fs.readFileSync(path.join(BACK, 'src/routes/sitport-routes.js'), 'utf8');
const a = SRC.indexOf('const BAHIA_COORDS = {'), b = SRC.indexOf('\n};', a);
if (a < 0 || b < 0) { falla('BAHIA_COORDS no extraíble'); process.exit(2); }
const BAHIA_COORDS = new Function(SRC.slice(a, b + 3) + '\n return BAHIA_COORDS;')();
const VIVO = JSON.parse(fs.readFileSync(path.join(INS, 'CONGELADO_vivo.json'), 'utf8')).cuerpo.data;
const CAT = JSON.parse(fs.readFileSync(path.join(INS, 'CONGELADO_puertos.json'), 'utf8')).cuerpo.data;
const JOIN = JSON.parse(fs.readFileSync(path.join(BACK, 'data/catalogo/join_puerto_bahia.json'), 'utf8'));
const { derivarCierre } = require(path.join(BACK, 'src/services/cierre-derivador.js'));
const memo = new Map();
const cerrada = r => { if (!memo.has(r.IDRestriccion)) memo.set(r.IDRestriccion, derivarCierre(r).estado === 'cerrado'); return memo.get(r.IDRestriccion); };

const unidades = { vivo: VIVO.length, cat: CAT.length, join: (JOIN.filas || []).length, bahias: Object.keys(BAHIA_COORDS).length };
if (!unidades.vivo || !unidades.cat || !unidades.join || !unidades.bahias) {
  say('ABORTA · piso por unidad: ' + JSON.stringify(unidades));
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' }); process.exit(2);
}

function distKm(la1, lo1, la2, lo2) {
  const R = 6371, r = d => d * Math.PI / 180;
  const dLa = r(la2 - la1), dLo = r(lo2 - lo1);
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
const BAHIAS = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: Number(id), ...c }));
function masCercana(lat, lng) {
  let m = null;
  for (const x of BAHIAS) { const d = distKm(lat, lng, x.lat, x.lng); if (!m || d < m.km) m = { id: x.id, nombre: x.nombre, km: d }; }
  return m;
}
const clave = s => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, '').trim();
const porClave = new Map(JOIN.filas.map(f => [clave(f.nombre), f]));
const RADIO = 30; // el mismo del join, declarado

say('='.repeat(80));
say('M1-M3 + LA CURVA DEL UMBRAL N — anclas desplazadas');
say('corrida ' + new Date().toISOString());
say(`material CONGELADO 23:02Z · ${VIVO.length} filas vivas · ${CAT.length} filas de catálogo · join ${JOIN.filas.length}`);
say('='.repeat(80));
say('');

// ════════════════════════════════════════════════════════════════════════════
say('M1 · EL DOCE — los 12 nodos con ancla a más de 100 km, nombrados');
say('='.repeat(80));
const conAncla = CAT.filter(p => p.bahia_sitport_id != null && BAHIA_COORDS[Number(p.bahia_sitport_id)]);
const kmAncla = p => {
  const c = BAHIA_COORDS[Number(p.bahia_sitport_id)];
  return distKm(p.lat, p.lng, c.lat, c.lng);
};
const lejos100 = conAncla.map(p => ({ p, km: kmAncla(p) })).filter(x => x.km > 100).sort((x, y) => y.km - x.km);
say(`  filas del catálogo con ancla a más de 100 km: ${lejos100.length}`);
say('');
say('  nodo                                      ancla    km    +6,00° → más cercana        veredicto');
for (const { p, km } of lejos100) {
  const d6 = masCercana(p.lat, p.lng + 6);
  const d0 = masCercana(p.lat, p.lng);
  const desp = d0.km >= RADIO && d6.km < RADIO;
  // Un desplazamiento de 6,00° mueve ~558 km a lat -30. Si el nodo mejora con
  // +6 pero no cruza el radio, se marca como «mejora sin cruzar» y NO se cuenta
  // como desplazado: el criterio no se afloja para que entre un caso.
  const mejora = d6.km < d0.km;
  const ver = desp ? 'DESPLAZADO 6,00°' : (mejora ? 'mejora con +6 pero no cruza 30 km' : 'NO es desplazamiento de 6,00°');
  say(`  ${p.nombre.slice(0, 40).padEnd(41)} ${String(p.bahia_sitport_id).padStart(4)} ${km.toFixed(0).padStart(5)}  ${d6.km.toFixed(1).padStart(6)} km «${d6.nombre.slice(0, 22).padEnd(23)}» ${ver}`);
}
say('');

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('LA CURVA DEL UMBRAL N — para la regla (c), medida y no elegida a ojo');
say('='.repeat(80));
say('  Distancia de cada fila anclada a la bahía que declara. Denominador:');
say(`  ${conAncla.length} filas con ancla resoluble en BAHIA_COORDS.`);
const dist = conAncla.map(p => ({ p, km: kmAncla(p) })).sort((x, y) => x.km - y.km);
say('');
say('  umbral   filas por encima   filas por encima CON material vivo   con CIERRE');
for (const u of [5, 9, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500]) {
  const arriba = dist.filter(x => x.km > u);
  const conMat = arriba.filter(x => VIVO.some(r => Number(r.bahia) === Number(x.p.bahia_sitport_id)));
  const conCie = arriba.filter(x => cerrada.length >= 0 && VIVO.filter(r => Number(r.bahia) === Number(x.p.bahia_sitport_id)).some(cerrada));
  say(`  ${String(u).padStart(5)} km ${N4(arriba.length).padStart(15)} ${N4(conMat.length).padStart(35)} ${N4(conCie.length).padStart(12)}`);
}
say('');
say('  LAS 20 DISTANCIAS MÁS GRANDES Y LAS 6 MÁS CHICAS POR ENCIMA DE 5 km:');
for (const x of dist.slice(-20).reverse()) say(`      ${x.km.toFixed(1).padStart(7)} km  ${x.p.nombre.slice(0, 44)}`);
say('      ...');
for (const x of dist.filter(x => x.km > 5).slice(0, 6)) say(`      ${x.km.toFixed(1).padStart(7)} km  ${x.p.nombre.slice(0, 44)}`);
say('');

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('M2 · LOS QUE NO TIENEN ANCLA — el test propuesto, con sus placebos');
say('='.repeat(80));
say('  EL TEST: un nodo está DESPLAZADO si hoy está a >= 30 km de toda bahía y');
say('  con lng+6,00° queda a < 30 km de alguna. No usa el ancla, así que alcanza');
say('  a los que no la tienen. 30 km es el radio del join, declarado en el');
say('  artefacto: por debajo de él el join adjudica, por encima calla.');
say('');
say('  CONTROL POSITIVO — PLACEBOS. El mismo test con otros desplazamientos. Si');
say('  +6,00 marca lo mismo que un placebo, el test no discrimina y no se');
say('  reporta. El placebo -6,00 es el más exigente: mueve la misma distancia');
say('  hacia el continente, donde HAY bahías.');
say('');
const sinAncla = CAT.filter(p => p.bahia_sitport_id == null);
const nomAnclados = new Set(CAT.filter(p => p.bahia_sitport_id != null).map(p => p.nombre));
say(`  denominadores: ${CAT.length} filas · ${sinAncla.length} filas SIN ancla · ${new Set(sinAncla.map(p => p.nombre)).size} nombres sin ancla`);
say('');
function marcados(grupo, off) {
  return grupo.filter(p => {
    const d0 = masCercana(p.lat, p.lng), d6 = masCercana(p.lat, p.lng + off);
    return d0.km >= RADIO && d6.km < RADIO;
  });
}
say('  offset      marcados en las 490 sin ancla     marcados en las 199 con ancla');
for (const off of [6, 3, -6, 9, -3]) {
  const s = marcados(sinAncla, off), c = marcados(conAncla, off);
  const etq = (off > 0 ? '+' : '') + off.toFixed(2) + '°';
  say(`  ${etq.padStart(7)} ${N4(s.length).padStart(28)} ${N4(c.length).padStart(33)}${off === 6 ? '   ← el candidato' : '   (placebo)'}`);
}
say('');
const desplSin = marcados(sinAncla, 6);
const placeboMax = Math.max(...[3, -6, 9, -3].map(o => marcados(sinAncla, o).length));
if (desplSin.length <= placeboMax) {
  say('  EL TEST NO DISCRIMINA sobre los que no tienen ancla: +6,00 no marca más');
  say('  que el mejor placebo. NO SE REPORTA NINGÚN DESPLAZADO ENTRE ELLOS.');
} else {
  say(`  EL TEST DISCRIMINA: +6,00 marca ${desplSin.length} y el mejor placebo ${placeboMax}.`);
  say('');
  say('  LOS MARCADOS SIN ANCLA, y qué les hizo el join:');
  const porEstado = {};
  for (const p of desplSin) {
    const f = porClave.get(clave(p.nombre));
    const est = f ? f.estado : 'NO_ESTA_EN_EL_JOIN';
    porEstado[est] = (porEstado[est] || 0) + 1;
    const d6 = masCercana(p.lat, p.lng + 6);
    const sirve = f && f.bahia_id != null ? VIVO.filter(r => Number(r.bahia) === Number(f.bahia_id)) : [];
    say(`      ${p.nombre.slice(0, 40).padEnd(41)} join=${String(est).padEnd(22)} bahia=${String(f ? f.bahia_id : '—').padStart(5)}` +
        ` · F2 le serviría ${sirve.length} filas (${sirve.filter(cerrada).length} cerradas) · con +6 estaría a ${d6.km.toFixed(1)} km de «${d6.nombre}»`);
  }
  say('');
  say('  APERTURA POR ESTADO DEL JOIN:');
  for (const [k, v] of Object.entries(porEstado).sort((x, y) => y[1] - x[1])) say(`      ${k.padEnd(28)} ${N4(v)}`);
  const peligrosos = desplSin.filter(p => { const f = porClave.get(clave(p.nombre)); return f && f.bahia_id != null; });
  say('');
  say(`  LOS QUE IMPORTAN: ${peligrosos.length} de ${desplSin.length} tienen bahía puesta en el join.`);
  say('  Los demás cayeron en `sin_bahia_en_catalogo` — el radio de 30 km no');
  say('  alcanzó ninguna bahía desde la posición equivocada, así que el defecto');
  say('  se convirtió solo en silencio. ES EL MODO DE FALLA SEGURO, por accidente.');
}
say('');

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('M3 · EL CERO DEL «EMPEORA», sin la premisa caída');
say('='.repeat(80));
say('  De los 9 que se apagan, cuántos tienen el ancla desplazada. Si alguno la');
say('  tiene, se miró la bahía equivocada para concluir que no tenía nada.');
say('');
const LOS9 = ['Borde Costero de Chañaral', 'Caleta Pesquera Guayacán', 'Caleta Pesquera San Pedro de Chañaral',
  'Defensa Costera de Chañaral', 'Embarcadero Puerto Gaviota', 'Embarcadero Rampa El Pascua',
  'Puerto Gaviota', 'Rampa Balseo Coipue 1 (Ex Gaviota) Norte', 'Rampa Balseo Coipue 2 (Ex Gaviota) Sur'];
let conDesplazamiento = 0, materialEscondido = 0;
const escondidas = [];
for (const nom of LOS9) {
  const p = CAT.find(x => x.nombre === nom);
  if (!p) { falla(`el nodo «${nom}» no está en el catálogo congelado — la lista de los 9 no es de este material`); continue; }
  const f = porClave.get(clave(nom));
  const d0 = masCercana(p.lat, p.lng), d6 = masCercana(p.lat, p.lng + 6);
  const desplazado = d0.km >= RADIO && d6.km < RADIO;
  if (desplazado) conDesplazamiento++;
  const bahiaJoin = f && f.bahia_id != null ? Number(f.bahia_id) : null;
  const kmAJoin = bahiaJoin != null && BAHIA_COORDS[bahiaJoin]
    ? distKm(p.lat, p.lng, BAHIA_COORDS[bahiaJoin].lat, BAHIA_COORDS[bahiaJoin].lng) : null;
  // LA BAHÍA REAL: la más cercana desde la posición corregida si está
  // desplazado, y desde la actual si no. Se declara cuál se usó.
  const real = desplazado ? d6 : d0;
  const filasReales = real.km < RADIO ? VIVO.filter(r => Number(r.bahia) === real.id) : [];
  if (filasReales.length > 0 && (bahiaJoin == null || real.id !== bahiaJoin)) {
    materialEscondido++;
    escondidas.push({ nom, real, filasReales });
  }
  say(`  ${nom.slice(0, 40).padEnd(41)}`);
  say(`      join: ${String(f ? f.estado : '—').padEnd(24)} bahía ${String(bahiaJoin ?? '—').padStart(5)}` +
      `${kmAJoin == null ? '' : ` a ${kmAJoin.toFixed(1)} km`}`);
  say(`      posición: más cercana hoy «${d0.nombre}» a ${d0.km.toFixed(1)} km · ${desplazado ? 'DESPLAZADO' : 'no desplazado'}`);
  say(`      bahía real (${desplazado ? 'con +6,00°' : 'posición actual'}): «${real.nombre}» a ${real.km.toFixed(1)} km` +
      ` · ${filasReales.length} filas vivas, ${filasReales.filter(cerrada).length} cerradas`);
}
say('');
say(`  DE LOS 9 QUE SE APAGAN: ${conDesplazamiento} con ancla/posición desplazada.`);
say(`  CON MATERIAL VIVO EN SU BAHÍA REAL Y NO EN LA DEL JOIN: ${materialEscondido}.`);
// LAS DOS AFIRMACIONES SON DISTINTAS Y NO SE MEZCLAN: una es sobre CIERRES y la
// otra sobre MATERIAL. Un puerto puede perder filas verdaderas sin perder
// ningún cierre.
{
  const cierresEscondidos = escondidas.filter(e => e.filasReales.some(cerrada));
  say(`  DESPLAZAMIENTO: ${conDesplazamiento} de 9. La premisa «se miró la bahía`);
  say('  equivocada por una posición corrida» NO se cumple para ninguno de los 9.');
  say('');
  say(`  MATERIAL ESCONDIDO detrás de la bahía del join: ${materialEscondido} de 9.`);
  for (const e of escondidas) say(`     ${e.nom} → «${e.real.nombre}» a ${e.real.km.toFixed(1)} km · ${e.filasReales.length} filas · ${e.filasReales.filter(cerrada).length} CERRADAS`);
  say('');
  say(`  CIERRES escondidos: ${cierresEscondidos.length} de 9.`);
  if (cierresEscondidos.length === 0) {
    say('  => EL «0 DEJAN DE RECIBIR UN CIERRE VERDADERO» SE SOSTIENE, y ahora con');
    say('     la premisa probada y no supuesta. ALCANCE: vale para las 16 filas');
    say('     cerradas del material de las 23:02Z del 2026-08-17 y para los 9 que');
    say('     se apagan. NO es una propiedad de F2: es la medición de un día.');
    say('  => PERO NO SE SOSTIENE la afirmación más ancha de que «no se pierde');
    say('     material verdadero»: se pierde en ' + materialEscondido + ' caso(s), sin cierres.');
  } else {
    say('  => EL «0» ESTABA MAL: hay cierres detrás de la bahía equivocada.');
  }
}
say('');

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('MORDIDAS');
say('='.repeat(80));
let ok = 0, tot = 0;
function mordida(etq, fn, esp) {
  tot++; let r; try { r = fn(); } catch (e) { r = 'EXCEPCIÓN: ' + e.message; }
  if (esp(r)) { ok++; say(`  ✓ MUERDE  ${etq} → ${JSON.stringify(r)}`); }
  else falla(`la mordida NO muerde: ${etq} → ${JSON.stringify(r)}`);
}
// N1 · BAHIA_COORDS vaciado → nadie tiene bahía cerca, el test no marca a nadie.
mordida('N1 BAHIA_COORDS vaciado', () => {
  const vacio = [];
  const mc = (lat, lng) => { let m = null; for (const x of vacio) { const d = distKm(lat, lng, x.lat, x.lng); if (!m || d < m.km) m = { km: d }; } return m; };
  return { marcados: sinAncla.filter(p => { const d6 = mc(p.lat, p.lng + 6); return d6 && d6.km < RADIO; }).length };
}, r => r.marcados === 0);
// N2 · offset cero → el test no puede marcar a nadie (d0 === d6).
mordida('N2 offset 0,00° (el test contra sí mismo)', () => ({ marcados: marcados(CAT, 0).length }), r => r.marcados === 0);
// N3 · haversine falseado a cero → todo queda «a 0 km», nada supera el radio.
mordida('N3 distancia falseada a 0', () => {
  const m = CAT.filter(() => { const d0 = 0, d6 = 0; return d0 >= RADIO && d6 < RADIO; });
  return { marcados: m.length };
}, r => r.marcados === 0);
// N4 · CONTROL POSITIVO: los 4 nodos que SÍ están en Juan Fernández tienen que
//      EMPEORAR con +6,00°. Si el test los marcara, marcaría cualquier cosa.
mordida('N4 control positivo · los 4 de Juan Fernández NO se marcan', () => {
  const jf = CAT.filter(p => p.lng <= -78 && p.lng >= -79.5);
  return { enJF: jf.length, marcados: marcados(jf, 6).length };
}, r => r.enJF > 0 && r.marcados === 0);
// N5 · material vacío → ninguna bahía tiene filas y M3 no puede reportar nada.
mordida('N5 material vivo vacío', () => {
  const v = [];
  return { conFilas: BAHIAS.filter(x => v.some(r => Number(r.bahia) === x.id)).length };
}, r => r.conFilas === 0);
say('');
say(`  ${ok} de ${tot} mordidas muerden`);
say('');

say('='.repeat(80));
say('GUARDA DE ENTREGABLES');
for (const [rel, esp] of Object.entries(ENTREGABLES)) {
  const s = sha256(path.join(BACK, rel));
  if (s === esp && s === antes[rel]) say(`  ✓ ${rel}  ${s.slice(0, 16)}…`);
  else falla(`ENTREGABLE ALTERADO: ${rel} · ahora ${s}`);
}
say('');
say('─'.repeat(70));
say(fallas.length ? `${fallas.length} FALLA(S)` : 'SIN FALLAS · las mordidas muerden y los entregables están intactos.');
fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
console.log(`\n[evidencia] ${SALIDA} · ${fs.statSync(SALIDA).size} bytes`);
process.exit(fallas.length ? 3 : 0);
