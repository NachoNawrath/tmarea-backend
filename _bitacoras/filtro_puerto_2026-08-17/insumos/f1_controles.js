// ─────────────────────────────────────────────────────────────────────────────
// F1 · BANCO DE CONTROLES — lee el ARTEFACTO DEL DISCO, no la estructura en
// memoria del generador. Las mordidas se aplican sobre COPIAS en scratchpad;
// el artefacto real no se toca y se comprueba su sha256 al final.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BACK = 'C:/Users/katia/tmarea-backend', AQUI = __dirname;
const RUTA_ART = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');
const RUTA_HOJA = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const SHA_ART_0 = sha(RUTA_ART), SHA_HOJA_0 = sha(RUTA_HOJA);

const SRC = fs.readFileSync(path.join(BACK, 'src/routes/sitport-routes.js'), 'utf8');
const a = SRC.indexOf('const BAHIA_COORDS = {'), b = SRC.indexOf('\n};', a);
const BAHIA_COORDS = new Function(SRC.slice(a, b + 3) + '\n return BAHIA_COORDS;')();
const nodos = JSON.parse(fs.readFileSync(path.join(AQUI, 'nodos.json'), 'utf8'));
const anclaDeNodo = new Map(nodos.map(n => [n.id, n.bahia_sitport_id == null ? null : Number(n.bahia_sitport_id)]));

// ── LOS CONTROLES ────────────────────────────────────────────────────────────
function correr(art, hojaTxt, etq) {
  const R = {}; let comparaciones = 0;
  const F = art.filas || [];
  const VOC = Object.keys(art.vocabulario_estado || {});
  const hoja = hojaTxt.split('\n').filter(l => l.trim());

  // C9 · piso por unidad ANTES de medir nada
  const unidades = { filas: F.length, vocabulario: VOC.length, hoja: Math.max(0, hoja.length - 1) };
  R.C9 = { ok: unidades.filas > 0 && unidades.vocabulario > 0, det: JSON.stringify(unidades) };
  if (!R.C9.ok) return { R, comparaciones: 0, aborta: true };

  // C1 · cobertura: una fila por nodo, sin duplicados, y todos los nodos del catálogo
  const ids = F.map(r => r.nodo_id);
  const nombresArt = new Set(F.map(r => r.nombre));
  const esperados = new Set(); {
    const m = new Map();
    for (const n of nodos) { const nom = String(n.nombre).replace(/[\r\n\t]+/g, ' ').trim();
      const y = m.get(nom); if (!y || (y.bahia_sitport_id == null && n.bahia_sitport_id != null)) m.set(nom, n); }
    for (const k of m.keys()) esperados.add(k);
  }
  const faltan = [...esperados].filter(n => !nombresArt.has(n));
  comparaciones += esperados.size;
  R.C1 = { ok: new Set(ids).size === F.length && faltan.length === 0 && F.length === esperados.size,
    det: `filas ${F.length} · ids únicos ${new Set(ids).size} · esperados ${esperados.size} · faltan ${faltan.length}` };

  // C2 · vocabulario cerrado
  const fuera = F.filter(r => !VOC.includes(r.estado));
  comparaciones += F.length;
  R.C2 = { ok: fuera.length === 0, det: `fuera del vocabulario ${fuera.length}` + (fuera.length ? ` (p.ej. "${fuera[0].estado}")` : '') };

  // C3 · coherencia estado ↔ bahia_id ↔ via
  const SIN = ['a_adjudicar', 'sin_bahia_en_catalogo'];
  const malC3 = F.filter(r => SIN.includes(r.estado)
    ? (r.bahia_id !== null || r.via !== null)
    : (r.bahia_id === null || r.via === null || r.via === undefined));
  comparaciones += F.length;
  R.C3 = { ok: malC3.length === 0, det: `incoherentes ${malC3.length}` + (malC3.length ? ` (nodo ${malC3[0].nodo_id})` : '') };

  // C4 · las confirmadas dicen exactamente lo que dice la base
  const conf = F.filter(r => r.estado === 'confirmado_declarado');
  const malC4 = conf.filter(r => anclaDeNodo.get(r.nodo_id) !== r.bahia_id);
  comparaciones += conf.length;
  R.C4 = { ok: conf.length > 0 && malC4.length === 0, det: `${conf.length - malC4.length}/${conf.length} coinciden con nodos_maritimos` };

  // C5 · toda bahia_id emitida existe en el catálogo de bahías
  const emitidas = F.filter(r => r.bahia_id !== null);
  const inexistentes = emitidas.filter(r => !BAHIA_COORDS[r.bahia_id]);
  comparaciones += emitidas.length;
  R.C5 = { ok: emitidas.length > 0 && inexistentes.length === 0, det: `emitidas ${emitidas.length} · inexistentes ${inexistentes.length}` };

  // C6 · ninguna a_adjudicar elige bahía por defecto
  const adj = F.filter(r => r.estado === 'a_adjudicar');
  const conBahia = adj.filter(r => r.bahia_id !== null);
  comparaciones += adj.length;
  R.C6 = { ok: adj.length > 0 && conBahia.length === 0, det: `a_adjudicar ${adj.length} · con bahía puesta ${conBahia.length}` };

  // C7 · la hoja es exactamente las a_adjudicar, con prioridad 1..N sin huecos
  const filasHoja = hoja.slice(1).map(l => l.split('\t'));
  const idsHoja = filasHoja.map(c => Number(c[1]));
  const prios = filasHoja.map(c => Number(c[0])).sort((x, y) => x - y);
  const prioOk = prios.length > 0 && prios.every((p, i) => p === i + 1);
  const mismos = idsHoja.length === adj.length && idsHoja.every(id => adj.some(r => r.nodo_id === id));
  comparaciones += filasHoja.length;
  R.C7 = { ok: prioOk && mismos, det: `hoja ${filasHoja.length} · a_adjudicar ${adj.length} · prioridad 1..N ${prioOk}` };

  // C8 · ningún nombre con control chars ni bordes sucios
  const sucios = F.filter(r => /[\r\n\t]/.test(r.nombre) || r.nombre !== r.nombre.trim());
  comparaciones += F.length;
  R.C8 = { ok: sucios.length === 0, det: `nombres sucios ${sucios.length}` + (sucios.length ? ` (nodo ${sucios[0].nodo_id})` : '') };

  return { R, comparaciones, aborta: false };
}

function informar(etq, res) {
  const nombres = Object.keys(res.R);
  const rojos = nombres.filter(n => !res.R[n].ok);
  console.log(`  ${etq}`);
  for (const n of nombres) console.log(`     ${res.R[n].ok ? '✓' : '✗'} ${n}  ${res.R[n].det}`);
  console.log(`     comparaciones efectivas: ${res.comparaciones}`);
  return rojos;
}

// ── CORRIDA LIMPIA ───────────────────────────────────────────────────────────
console.log('═'.repeat(78));
console.log('F1 · CONTROLES SOBRE EL ARTEFACTO DEL DISCO');
console.log('═'.repeat(78));
const artTxt = fs.readFileSync(RUTA_ART, 'utf8'), hojaTxt = fs.readFileSync(RUTA_HOJA, 'utf8');
const limpio = correr(JSON.parse(artTxt), hojaTxt, 'LIMPIO');
const rojosLimpio = informar('LÍNEA BASE', limpio);
if (rojosLimpio.length) { console.log(`\n✗ ${rojosLimpio.length} CONTROL(ES) EN ROJO SIN MORDIDA: ${rojosLimpio.join(', ')}`); process.exit(3); }

// ── MORDIDAS, sobre COPIAS ───────────────────────────────────────────────────
console.log('\n' + '═'.repeat(78));
console.log('MORDIDAS — sobre copias. El artefacto real no se toca.');
console.log('═'.repeat(78));
const fallas = [];
function mordida(etq, mut, esperado) {
  const art = JSON.parse(artTxt); let hoja = hojaTxt;
  const r = mut(art, hoja); if (typeof r === 'string') hoja = r;
  const res = correr(art, hoja, etq);
  const rojos = res.aborta ? ['ABORTA'] : Object.keys(res.R).filter(n => !res.R[n].ok);
  const mordio = res.aborta ? esperado === 'ABORTA' : rojos.includes(esperado);
  console.log(`  ${mordio ? '✓ MUERDE ' : '✗ NO MUERDE'}  ${etq}  → esperado ${esperado} · rojos: ${rojos.join(', ') || '(ninguno)'}`);
  if (!mordio) fallas.push(etq);
}
mordida('M1 se borra una fila del artefacto', art => { art.filas.splice(10, 1); }, 'C1');
mordida('M2 un estado fuera del vocabulario', art => { art.filas[0].estado = 'resuelto_mas_o_menos'; }, 'C2');
mordida('M3 una a_adjudicar con bahía puesta', art => {
  const r = art.filas.find(x => x.estado === 'a_adjudicar'); r.bahia_id = r.evidencia.empate_entre[0].bahia_id; }, 'C6');
mordida('M4 una bahia_id que no existe', art => {
  art.filas.find(x => x.bahia_id !== null).bahia_id = 999999; }, 'C5');
mordida('M5 una confirmada con el ancla cambiada', art => {
  const r = art.filas.find(x => x.estado === 'confirmado_declarado'); r.bahia_id = r.bahia_id === 101 ? 102 : 101; }, 'C4');
mordida('M6 se reinyecta un \\r en un nombre', art => { art.filas[5].nombre = art.filas[5].nombre + '\r'; }, 'C8');
mordida('M7 la hoja pierde una fila', (art, hoja) => {
  const l = hoja.split('\n'); l.splice(3, 1); return l.join('\n'); }, 'C7');
mordida('M8 artefacto vacío', art => { art.filas = []; }, 'ABORTA');
mordida('M9 estado y bahia_id incoherentes', art => {
  art.filas.find(x => x.estado === 'derivado_limpio').bahia_id = null; }, 'C3');

// ── EL ARTEFACTO NO SE MOVIÓ ─────────────────────────────────────────────────
console.log('\n' + '═'.repeat(78));
const ok1 = sha(RUTA_ART) === SHA_ART_0, ok2 = sha(RUTA_HOJA) === SHA_HOJA_0;
console.log(`  artefacto intacto: ${ok1 ? '✓' : '✗'} ${SHA_ART_0.slice(0, 16)}…`);
console.log(`  hoja intacta:      ${ok2 ? '✓' : '✗'} ${SHA_HOJA_0.slice(0, 16)}…`);
if (!ok1 || !ok2) fallas.push('el instrumento movió un insumo');
console.log('\n' + (fallas.length ? `${fallas.length} FALLA(S): ${fallas.join(' · ')}` : 'F1 EN VERDE · 8 controles · 9 mordidas · el artefacto no se movió'));
if (fallas.length) process.exit(3);
