'use strict';
// Mediciones de la continuación de E0.1. No modifica nada.
// Uso: node _bitacoras/e01b_continuacion_2026-08-11/medir.js
//
//   A. ¿El descarte de cada endpoint pesa lo mismo? — camino de cada uno hasta
//      la bandera, y qué hay publicado hoy.
//   B. La bahía 108 — ¿Totalpronostico entrega coordenadas? ¿hay puente por
//      cdReparticion? ¿el orden de ids permite acotarla?

const path = require('path');
const RAIZ = path.join(__dirname, '../..');
const INSUMO = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_2026-08-11');

const bahias = require(path.join(INSUMO, 'sitport_consultaBahias.json'));
const restr = require(path.join(INSUMO, 'sitport_consultaRestricciones.json'));
const pron = require(path.join(INSUMO, 'sitport_totalPronostico.json'));
const { leerBahiaCoords } = require(path.join(RAIZ, 'src/services/catalogo-bahias'));

const L = console.log;
L('='.repeat(78));
L('E0.1 (continuación) — MEDICIONES');
L(`insumo congelado: _bitacoras/e01_drift_catalogo_2026-08-11/insumo_2026-08-11`);
L('='.repeat(78));

// ── A. PESO DE CADA DESCARTE ────────────────────────────────────────────────
L('');
L('## A. QUÉ SE PIERDE EN CADA ENDPOINT');
L('');
L('A.1 consultaRestricciones — lo que hay publicado hoy');
const tipos = {};
restr.forEach(x => { const t = (x.tipo || '(sin tipo)').trim(); tipos[t] = (tipos[t] || 0) + 1; });
L(`    ${restr.length} registros por tipo: ${JSON.stringify(tipos)}`);
const todos = restr.filter(x => (x.tipo || '').trim() === 'TODOS');
L(`    tipo TODOS (las únicas que restricciones-ruta mira): ${todos.length} sobre ${new Set(todos.map(x => x.bahia)).size} bahías`);
L(`    con paralizar/nzarpe/nrecalada = 1: ${restr.filter(x => x.paralizar === 1 || x.nzarpe === 1 || x.nrecalada === 1).length}`);
L(`    motivos publicados: ${[...new Set(todos.map(x => x.MotivoRestriccion))].join(' | ')}`);
L('    camino hasta la bandera: restricciones-ruta -> route-restriction-evaluator');
L('                             -> veredictoTransito -> maxVeredicto (PWA). Puede dar UV.');

L('');
L('A.2 Totalpronostico — lo que hay publicado hoy');
const v = pron.map(x => x.velocidadViento).filter(x => x != null).sort((a, b) => b - a);
L(`    ${v.length} registros con viento · max ${v[0]} kt · mediana ${v[Math.floor(v.length / 2)]} · min ${v[v.length - 1]}`);
L(`    >= 30 kt (=> condicion_puerto 'temporal'):     ${v.filter(x => x >= 30).length}`);
L(`    >= 26 kt (=> 'mal_tiempo'):                    ${v.filter(x => x >= 26).length}`);
L(`    >= 15 kt (=> 'tiempo_variable'):               ${v.filter(x => x >= 15).length}`);
L('    camino hasta la bandera: weather-ruta calcula peorTramo = MÁXIMO viento de');
L('                             las bahías matcheadas (sitport-routes.js:429-441)');
L('                             -> condicion_puerto -> useVoyageVerification.js:165');
L("                             veredictoClima = 'temporal' ? UV : 'mal_tiempo' ? U");
L('                             -> maxVeredicto. UN DESCARTE SOLO PUEDE BAJAR EL MÁXIMO.');

L('');
L('A.3 consultaBahias — qué se pierde');
L(`    ${bahias.length} registros. Es el único endpoint que trae el NOMBRE de la bahía`);
L('    junto a su id (NMBahia). No alimenta ninguna bandera: el motor no lo consulta');
L('    en ningún flujo de veredicto (solo GET /api/sitport/bahias, de diagnóstico).');
const soloCatalogo = bahias.map(b => b.IDBahia)
  .filter(id => !restr.some(r => r.bahia === id) && !pron.some(p => p.idBahia === id));
L(`    ids que hoy SOLO aparecen en consultaBahias (sin dato asociado): ${soloCatalogo.length} de ${bahias.length}`);

// ── B. LA BAHÍA 108 ─────────────────────────────────────────────────────────
L('');
L('## B. LA BAHÍA 108');
L('');
L('B.1 ¿Totalpronostico entrega coordenadas?');
const campos = new Set();
pron.forEach(x => Object.keys(x).forEach(k => campos.add(k)));
L(`    unión de campos sobre los ${pron.length} registros:`);
L(`      ${[...campos].join(' | ')}`);
const geo = [...campos].filter(k => /^(lat|lon|lng|x|y)/i.test(k) || /coord|geo|posic/i.test(k));
L(`    campos de posición: ${geo.length ? geo.join(',') : 'NINGUNO'}`);
L('    => NO entrega coordenadas. Tampoco entrega nombre de bahía.');

L('');
L('B.2 ¿cdReparticion sirve de puente hacia consultaBahias?');
const repB = new Set(bahias.map(x => x.CdReparticion));
const repP = new Set(pron.map(x => x.cdReparticion));
const cdB = [...repB].filter(Number.isFinite);
const cdP = [...repP].filter(Number.isFinite);
L(`    consultaBahias.CdReparticion : ${repB.size} valores, rango ${Math.min(...cdB)}–${Math.max(...cdB)}`);
L(`    Totalpronostico.cdReparticion: ${repP.size} valores, rango ${Math.min(...cdP)}–${Math.max(...cdP)}`);
L(`    valores en común: ${[...repP].filter(c => repB.has(c)).length}`);
L(`    cdReparticion del id 108: ${pron.find(x => x.idBahia === 108).cdReparticion}`);
L(`    bahías de consultaBahias con ese CdReparticion: ${bahias.filter(b => b.CdReparticion === 2169).length}`);
L('    => son dos espacios de numeración distintos, sin intersección. NO es puente.');

L('');
L('B.3 ¿El orden de los ids permite acotar dónde está?');
const F1 = leerBahiaCoords(path.join(RAIZ, 'src/routes/sitport-routes.js'));
const arr = [...F1.entries()].map(([id, x]) => ({ id: Number(id), lat: x.lat, nombre: x.nombre })).sort((a, b) => a.id - b.id);
const porLat = [...arr].sort((a, b) => b.lat - a.lat);
const rangoLat = new Map(porLat.map((x, i) => [x.id, i]));
let d2 = 0; arr.forEach((x, i) => { const d = i - rangoLat.get(x.id); d2 += d * d; });
const n = arr.length;
const rho = 1 - (6 * d2) / (n * (n * n - 1));
const inv = arr.filter((x, i) => i > 0 && x.lat > arr[i - 1].lat).length;
L(`    Spearman rho(id, latitud norte->sur) sobre las ${n} bahías = ${rho.toFixed(4)}`);
L(`    pares consecutivos por id donde la latitud NO baja: ${inv} de ${n - 1}`);
L('    vecinos de 108 en el catálogo de SITPORT:');
for (const b of bahias.filter(x => [106, 107, 109, 110].includes(x.IDBahia)).sort((a, b) => a.IDBahia - b.IDBahia)) {
  const c = F1.get(b.IDBahia);
  L(`      ${String(b.IDBahia).padStart(4)}  ${b.NMBahia.padEnd(20)} lat ${c ? c.lat : '?'}`);
}
L('    => rho 0,39 con 55 inversiones: el id NO ordena por geografía de forma');
L('       confiable. La adyacencia 107/109 NO acota nada. Hipótesis descartada.');

const ids = bahias.map(x => x.IDBahia).sort((a, b) => a - b);
const huecos = [];
for (let i = ids[0]; i <= ids[ids.length - 1]; i++) if (!ids.includes(i)) huecos.push(i);
L('');
L(`B.4 108 es uno de ${huecos.length} huecos en la secuencia ${ids[0]}–${ids[ids.length - 1]} de consultaBahias:`);
L(`    ${huecos.join(', ')}`);
L('    Un hueco del catálogo que un endpoint de dato sí usa. No es único como hueco;');
L('    sí es único como hueco que publica dato.');
L('');
L('FIN');
