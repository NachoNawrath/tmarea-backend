#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e01_prueba_mordida_a3.js — CLAUDE.md §4.6 sobre el aviso de drift en ruta (A3).
//
// A3 escala el veredicto que ve el patrón. Un control que escala banderas y que
// nunca se probó contra un caso malo no es un control. Acá se le pasan, uno por
// uno, los casos que tiene que distinguir, y los que NO debe disparar.
//
// Corre contra las capturas congeladas del 2026-08-11: sin red y sin base.
//
// Uso:  node scripts/e01_prueba_mordida_a3.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const {
  BANDERA_MAXIMA, construirResolutorCapitania, evaluarDriftEnRuta,
  noEvaluado, componerConDrift,
} = require('../src/services/drift-ambito-a');

const RAIZ = path.join(__dirname, '..');
const I = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_2026-08-11');
const E = path.join(RAIZ, '_bitacoras/e01d_d7_y_257_2026-08-11');
const leer = f => JSON.parse(fs.readFileSync(f, 'utf8'));

const CAPTURAS = {
  consultaBahias: leer(path.join(I, 'sitport_consultaBahias.json')),
  consultaCapuertoRestriccion: leer(path.join(E, 'sitport_consultaCapuertoRestriccion.json')).recordsets[0],
  totalGeneral: leer(path.join(E, 'sitport_Totalgeneral.json')),
};
const resolver = construirResolutorCapitania(CAPTURAS);

// Ids reales, medidos: 257 es de la repartición 235 (Lago Gral. Carrera) y 108 de
// la 190 (Carahue). 128 y 203 son bahías de la 235 que sí tenemos; 141 es de la 190.
const RUTA_LACUSTRE_LGC = [128, 203];   // una ruta que cruza Lago Gral. Carrera
const RUTA_CARAHUE = [141, 142];        // una ruta que cruza Carahue
const RUTA_CHILOE = [114, 116, 119];    // una ruta que no cruza ninguna de las dos

const REG = (id, origen = 'consultaRestricciones', nombre = null) => [{ id_bahia: id, origen, nombre }];

let fallas = 0;
const L = console.log;
const ok = (n, m) => L(`${n.padEnd(62)}: ${m}`);
const mal = (n, m) => { L(`${n.padEnd(62)}: FALLA — ${m}`); fallas++; };

L('='.repeat(80));
L('PRUEBA DE MORDIDA — A3, AVISO DE DRIFT EN RUTA');
L(`insumo congelado 2026-08-11 · tope duro declarado: ${BANDERA_MAXIMA}`);
L('='.repeat(80));
L('');

// M0 — control negativo: sin bahías desconocidas no puede haber aviso.
{
  const r = evaluarDriftEnRuta({ registros: [], idsEnRuta: RUTA_CHILOE, resolver });
  if (r.total === 0 && r.bandera === 'Q' && r.estado === 'evaluado') ok('M0  control negativo — ninguna bahía desconocida', `NO avisa, bandera ${r.bandera}. OK`);
  else mal('M0  control negativo — ninguna bahía desconocida', `avisó ${r.total}, bandera ${r.bandera}`);
}

// M1 — la bahía en drift es de una Capitanía que la ruta cruza: avisa y escala.
{
  const r = evaluarDriftEnRuta({ registros: REG(257), idsEnRuta: RUTA_LACUSTRE_LGC, resolver });
  const a = r.avisos[0];
  if (r.total === 1 && r.bandera === 'U' && a.causa === 'en_ruta' && /CARRERA/i.test(a.capitania_sitport || ''))
    ok('M1  drift en una Capitanía QUE la ruta cruza', `avisa. bandera ${r.bandera} · ${a.capitania_sitport} · vía ${a.via_resolucion}`);
  else mal('M1  drift en una Capitanía QUE la ruta cruza', `total=${r.total} bandera=${r.bandera} ${JSON.stringify(a || null)}`);
}

// M2 — la bahía en drift es de otra Capitanía: NO avisa, pero queda como defecto.
{
  const r = evaluarDriftEnRuta({ registros: REG(257), idsEnRuta: RUTA_CHILOE, resolver });
  if (r.total === 0 && r.bandera === 'Q' && r.defectos_registrados === 1 && r.defectos[0].fuera_de_ruta)
    ok('M2  drift en OTRA Capitanía — no avisa pero no calla', `sin aviso, bandera Q, 1 defecto registrado fuera de ruta`);
  else mal('M2  drift en OTRA Capitanía — no avisa pero no calla', `total=${r.total} bandera=${r.bandera} defectos=${r.defectos_registrados}`);
}

// M3 — la bahía en drift no se puede ubicar: avisa igual (lado conservador).
{
  const r = evaluarDriftEnRuta({ registros: REG(99999), idsEnRuta: RUTA_CHILOE, resolver });
  const a = r.avisos[0];
  if (r.total === 1 && r.bandera === 'U' && a.causa === 'no_ubicable')
    ok('M3  drift NO ubicable — avisa por el lado conservador', `avisa. bandera ${r.bandera} · ${a.detalle}`);
  else mal('M3  drift NO ubicable — avisa por el lado conservador', `total=${r.total} bandera=${r.bandera} ${JSON.stringify(a || null)}`);
}

// M4 — la 108, que solo Totalgeneral puede resolver, sobre una ruta por Carahue.
{
  const r = evaluarDriftEnRuta({ registros: REG(108, 'totalPronostico'), idsEnRuta: RUTA_CARAHUE, resolver });
  const a = r.avisos[0];
  if (r.total === 1 && a.causa === 'en_ruta' && a.via_resolucion === 'Totalgeneral' && /CARAHUE/i.test(a.capitania_sitport || ''))
    ok('M4  la 108 resuelta SOLO por Totalgeneral', `avisa. ${a.capitania_sitport} · vía ${a.via_resolucion}`);
  else mal('M4  la 108 resuelta SOLO por Totalgeneral', `total=${r.total} ${JSON.stringify(a || null)}`);
}

// M5 — sin resolutor no se puede afirmar que no hay drift: tiene que avisar.
{
  const r = evaluarDriftEnRuta({ registros: REG(257), idsEnRuta: RUTA_LACUSTRE_LGC, resolver: null });
  if (r.total === 1 && r.avisos[0].causa === 'no_ubicable')
    ok('M5  sin resolutor — no se degrada a "no hay drift"', 'avisa como no ubicable');
  else mal('M5  sin resolutor — no se degrada a "no hay drift"', `total=${r.total} bandera=${r.bandera}`);
}

// M6 — EL TOPE DURO. Aunque llegue UV por la vía que sea, el drift no puede
// llevar el veredicto a UV. Es la regla que el owner fijó y la que más caro
// saldría romper.
{
  const casos = [['Q', 'UV'], ['U', 'UV'], ['Q', 'U'], ['UV', 'UV']];
  const salidas = casos.map(([previa, drift]) => componerConDrift(previa, drift));
  const subioAUV = casos.some(([previa], i) => previa !== 'UV' && salidas[i] === 'UV');
  if (!subioAUV && salidas[0] === 'U' && salidas[1] === 'U' && salidas[2] === 'U' && salidas[3] === 'UV')
    ok('M6  tope duro — el drift nunca puede producir UV', `Q+UV=${salidas[0]} · U+UV=${salidas[1]} · Q+U=${salidas[2]} · UV previa se respeta`);
  else mal('M6  tope duro — el drift nunca puede producir UV', `salidas ${salidas.join(',')}`);
}

// M7 — el drift no puede BAJAR una bandera que ya venía más alta.
{
  const r = componerConDrift('UV', 'U');
  if (r === 'UV') ok('M7  el drift no baja una bandera previa más alta', 'UV + drift U = UV');
  else mal('M7  el drift no baja una bandera previa más alta', `dio ${r}`);
}

// M8 — si no se pudo evaluar, el estado lo dice y no aporta bandera.
{
  const r = noEvaluado('SITPORT no respondió');
  if (r.estado === 'no_evaluado' && r.bandera === null && r.total === 0 && r.motivo)
    ok('M8  no evaluado — se declara, no se lee como "sin drift"', `estado=${r.estado} motivo="${r.motivo}"`);
  else mal('M8  no evaluado — se declara, no se lee como "sin drift"', JSON.stringify(r));
}

// M9 — el mismo id por dos endpoints es UN aviso, no dos.
{
  const r = evaluarDriftEnRuta({
    registros: [{ id_bahia: 257, origen: 'consultaRestricciones' }, { id_bahia: 257, origen: 'totalPronostico' }],
    idsEnRuta: RUTA_LACUSTRE_LGC, resolver,
  });
  if (r.total === 1 && r.avisos[0].origenes.length === 2)
    ok('M9  un id por dos endpoints = un aviso', `1 aviso, orígenes ${r.avisos[0].origenes.join('+')}`);
  else mal('M9  un id por dos endpoints = un aviso', `total=${r.total}`);
}

// M10 — regresión de la trampa que se cazó construyendo esto: emparejar por
// NOMBRE de Capitanía apagaba el aviso. "LAGO GRAL.CARRERA" contra
// "Lago General Carrera" no calza como texto, y sí como repartición.
{
  const a = resolver(257), b = resolver(128);
  if (a && b && a.reparticion === b.reparticion && a.capitania !== 'Lago General Carrera')
    ok('M10 pertenencia por repartición, no por nombre', `257 y 128 → repartición ${a.reparticion} ("${a.capitania}")`);
  else mal('M10 pertenencia por repartición, no por nombre', JSON.stringify({ a, b }));
}

L('');
L('='.repeat(80));
if (fallas === 0) { L('RESULTADO: mordida 10/10 + control negativo. A3 puede fallar y falla donde debe.'); process.exit(0); }
L(`RESULTADO: ${fallas} problema(s). A3 NO se da por bueno.`);
process.exit(1);
