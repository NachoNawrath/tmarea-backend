#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e01_prueba_mordida_drift.js — CLAUDE.md §4.6
//
// Un control que nunca se probó contra un dato malo no es un control, es una
// decoración. Este script rompe el insumo de una forma distinta por cada cosa
// que el control de drift dice detectar, y comprueba que se detiene en cada una.
//
// Todo corre contra un insumo CONGELADO en disco (la captura de SITPORT del
// 2026-08-11) y contra copias temporales de las fuentes internas: no toca el
// repositorio, no necesita red y no necesita base de datos.
//
// Sale 0 solo si el control negativo NO muerde y TODAS las familias muerden.
//
// Uso:  node scripts/e01_prueba_mordida_drift.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ErrorCatalogoBahias, compararCatalogos, leerFuentesInternas,
} = require('../src/services/catalogo-bahias');

const RAIZ = path.join(__dirname, '..');
const INSUMO = path.join(RAIZ, '_bitacoras/e01_drift_catalogo_2026-08-11/insumo_2026-08-11');

const clonar = o => JSON.parse(JSON.stringify(o));

const CAPTURAS_BASE = {
  consultaBahias: JSON.parse(fs.readFileSync(path.join(INSUMO, 'sitport_consultaBahias.json'), 'utf8')),
  consultaRestricciones: JSON.parse(fs.readFileSync(path.join(INSUMO, 'sitport_consultaRestricciones.json'), 'utf8')),
  totalPronostico: JSON.parse(fs.readFileSync(path.join(INSUMO, 'sitport_totalPronostico.json'), 'utf8')),
};

// Declaración de referencia: LA REAL, no una copia. Solo se le acota
// `fuentes_internas` a las tres que viven en archivo, para que la mordida corra
// sin base levantada.
//
// Se lee y no se copia por una razón medida: la primera versión llevaba las
// divergencias copiadas a mano y quedó vencida en cuanto se adjudicó la bahía 257
// —el control lo cazó, que es lo que tiene que hacer, pero el defecto estaba en
// la prueba y no en el dato—. Una prueba con su propia copia del dato real es una
// segunda fuente de verdad, y este repositorio ya sabe lo que cuestan.
const DECL_BASE = {
  ...JSON.parse(fs.readFileSync(path.join(RAIZ, 'data/catalogo/divergencias_declaradas.json'), 'utf8')),
  fuentes_internas: ['F1', 'F2', 'F3'],
};

// ── raíz temporal con copia de las tres fuentes internas de archivo ──────────
function raizTemporal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e01-mordida-'));
  for (const rel of ['src/routes/sitport-routes.js', 'scripts/seed-bahias-sitport.js', 'src/data/bahia-capitania-map.json']) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.copyFileSync(path.join(RAIZ, rel), path.join(dir, rel));
  }
  return dir;
}

const TMP = raizTemporal();
const INTERNAS_BASE = () => leerFuentesInternas(TMP);

// ── familias ─────────────────────────────────────────────────────────────────
// Cada familia devuelve { internas, capturas, declaracion } ya roto, y declara
// qué espera: 'error' (el control se detiene) o un patrón sobre el veredicto.

const FAMILIAS = [
  ['M1  SITPORT suma una bahía que no tenemos', () => {
    const c = clonar(CAPTURAS_BASE);
    c.consultaBahias.push({ IDBahia: 999, CdReparticion: 1, NMBahia: 'BAHÍA INVENTADA', color: 'default', valor: 0, Nom: 'INVENTADA999' });
    return { internas: INTERNAS_BASE(), capturas: c, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DRIFT_NO_DECLARADO', clase: 'sitport_sin_catalogo', id: 999 }],

  ['M2  SITPORT retira una bahía que sí tenemos', () => {
    const c = clonar(CAPTURAS_BASE);
    c.consultaBahias = c.consultaBahias.filter(b => b.IDBahia !== 71);
    c.consultaRestricciones = c.consultaRestricciones.filter(r => r.bahia !== 71);
    c.totalPronostico = c.totalPronostico.filter(p => p.idBahia !== 71);
    return { internas: INTERNAS_BASE(), capturas: c, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DRIFT_NO_DECLARADO', clase: 'catalogo_sin_sitport', id: 71 }],

  ['M3  un endpoint de dato usa un id fuera del catálogo de la fuente', () => {
    const c = clonar(CAPTURAS_BASE);
    c.consultaRestricciones.push({ ...clonar(c.consultaRestricciones[0]), bahia: 998, GLBahia: 'BAHÍA FANTASMA' });
    return { internas: INTERNAS_BASE(), capturas: c, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DRIFT_NO_DECLARADO', clase: 'endpoint_fuera_de_catalogo', id: 998 }],

  ['M4  nuestras fuentes internas se desincronizan entre sí', () => {
    const internas = INTERNAS_BASE();
    internas.find(f => f.clave === 'F3').ids.delete(71);
    return { internas, capturas: clonar(CAPTURAS_BASE), declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DRIFT_NO_DECLARADO', clase: 'incoherencia_interna', id: 71 }],

  ['M5  una declaración sobrevive a su divergencia', () => {
    const d = clonar(DECL_BASE);
    d.divergencias.push({ id_bahia: 555, clase: 'sitport_sin_catalogo', visto_desde: '2026-01-01', estado: 'abierta', causa: 'divergencia que ya no existe' });
    return { internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: d };
  }, { veredicto: 'DRIFT_NO_DECLARADO', vencidas: 1 }],

  ['M6  la fuente interna cambia de forma y no se puede leer', () => {
    const dir = raizTemporal();
    const f = path.join(dir, 'src/routes/sitport-routes.js');
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('const BAHIA_COORDS = {', 'const COORDENADAS_DE_BAHIA = {'));
    return { raiz: dir, capturas: clonar(CAPTURAS_BASE), declaracion: clonar(DECL_BASE) };
  }, { error: /no declara BAHIA_COORDS/ }],

  ['M7  la fuente interna repite una clave', () => {
    const dir = raizTemporal();
    const f = path.join(dir, 'src/data/bahia-capitania-map.json');
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    j['no-es-un-id'] = { capitania: 'X' };
    fs.writeFileSync(f, JSON.stringify(j));
    return { raiz: dir, capturas: clonar(CAPTURAS_BASE), declaracion: clonar(DECL_BASE) };
  }, { error: /no es un id de bahía/ }],

  ['M8  la declaración usa una clase que no existe', () => {
    const d = clonar(DECL_BASE);
    d.divergencias[0].clase = 'divergencia_menor';
    return { internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: d };
  }, { error: /clase "divergencia_menor" desconocida/ }],

  ['M9  una divergencia se declara sin causa escrita', () => {
    const d = clonar(DECL_BASE);
    d.divergencias[0].causa = '   ';
    return { internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: d };
  }, { error: /sin causa escrita/ }],

  ['M10 la declaración se da por adjudicada sin cita', () => {
    const d = clonar(DECL_BASE);
    d.divergencias[0].estado = 'adjudicada';
    return { internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: d };
  }, { error: /sin bloque "adjudicacion"/ }],

  ['M11 un campo de la declaración está mal escrito', () => {
    const d = clonar(DECL_BASE);
    d.divergencias[0].caussa = 'typo';
    return { internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: d };
  }, { error: /campo "caussa" no reconocido/ }],

  ['M12 se compara menos fuentes de las declaradas', () => {
    const d = clonar(DECL_BASE);
    d.fuentes_internas = ['F1', 'F2', 'F3', 'F4'];
    return { internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: d };
  }, { error: /no son las declaradas/ }],

  // ── contenido: mismo id en dos copias, distinto adentro ────────────────────
  ['M13 dos copias tienen la misma bahía en otra coordenada', () => {
    const internas = INTERNAS_BASE();
    const f2 = internas.find(f => f.clave === 'F2');
    f2.contenido.set(71, { ...f2.contenido.get(71), lat: -18.9999 });
    return { internas, capturas: clonar(CAPTURAS_BASE), declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DRIFT_NO_DECLARADO', clase: 'contenido_divergente', id: 71, campo: 'lat' }],

  ['M14 dos copias llaman distinto a la misma bahía', () => {
    const internas = INTERNAS_BASE();
    const f2 = internas.find(f => f.clave === 'F2');
    f2.contenido.set(72, { ...f2.contenido.get(72), nombre: 'Bahía Renombrada' });
    return { internas, capturas: clonar(CAPTURAS_BASE), declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DRIFT_NO_DECLARADO', clase: 'contenido_divergente', id: 72, campo: 'nombre' }],

  ['M15 una divergencia de contenido se declara sin decir en qué campo', () => {
    const d = clonar(DECL_BASE);
    d.divergencias.push({ id_bahia: 71, clase: 'contenido_divergente', visto_desde: '2026-08-11', estado: 'abierta', causa: 'sin campo' });
    return { internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: d };
  }, { error: /tiene que declarar en qué campo/ }],

  ['M16 se declara un campo en una clase que no lo admite', () => {
    const d = clonar(DECL_BASE);
    d.divergencias[0].campo = 'lat';
    return { internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: d };
  }, { error: /"campo" solo tiene sentido en contenido_divergente/ }],

  ['M17 una fuente declara campos y no trae con qué compararlos', () => {
    const internas = INTERNAS_BASE();
    internas.find(f => f.clave === 'F3').campos = ['nombre'];
    return { internas, capturas: clonar(CAPTURAS_BASE), declaracion: clonar(DECL_BASE) };
  }, { error: /declara campos \(nombre\) pero no trae contenido/ }],

  ['M18 una fuente olvida declarar qué campos aporta', () => {
    const internas = INTERNAS_BASE();
    delete internas.find(f => f.clave === 'F1').campos;
    return { internas, capturas: clonar(CAPTURAS_BASE), declaracion: clonar(DECL_BASE) };
  }, { error: /no declara "campos"/ }],

  ['M19 una captura de SITPORT llega vacía de ids', () => {
    const c = clonar(CAPTURAS_BASE);
    c.totalPronostico = c.totalPronostico.map(p => { const q = { ...p }; delete q.idBahia; return q; });
    return { internas: INTERNAS_BASE(), capturas: c, declaracion: clonar(DECL_BASE) };
  }, { error: /sin id de bahía/ }],

  ['M20 falta una captura entera', () => {
    const c = clonar(CAPTURAS_BASE);
    delete c.consultaBahias;
    return { internas: INTERNAS_BASE(), capturas: c, declaracion: clonar(DECL_BASE) };
  }, { error: /no es un array/ }],
];

// ── corrida ──────────────────────────────────────────────────────────────────
let fallas = 0;
const L = console.log;

L('='.repeat(80));
L('PRUEBA DE MORDIDA — CONTROL DE DRIFT DEL CATÁLOGO (E0.1)');
L(`insumo congelado: ${path.relative(RAIZ, INSUMO)}`);
L('='.repeat(80));
L('');

// M0 — control negativo: con el insumo intacto y la declaración real, el control
// no puede reportar drift no declarado. Si muerde acá, muerde por cualquier cosa.
try {
  const r = compararCatalogos({ internas: INTERNAS_BASE(), capturas: clonar(CAPTURAS_BASE), declaracion: clonar(DECL_BASE) });
  if (r.resumen.no_declaradas === 0 && r.resumen.declaraciones_vencidas === 0 && r.veredicto === 'DRIFT_DECLARADO_ABIERTO') {
    L(`M0  control negativo — insumo intacto                     : NO muerde. ${r.resumen.total} divergencias, las 3 declaradas. OK`);
  } else {
    L(`M0  control negativo — insumo intacto                     : MUERDE cuando no debía -> ${r.veredicto}, no declaradas ${r.resumen.no_declaradas}, vencidas ${r.resumen.declaraciones_vencidas}`);
    fallas++;
  }
} catch (e) {
  L(`M0  control negativo — insumo intacto                     : MUERDE cuando no debía -> ${e.message}`);
  fallas++;
}

for (const [nombre, romper, esperado] of FAMILIAS) {
  const etq = nombre.padEnd(58);
  let entrada;
  try {
    entrada = romper();
  } catch (e) {
    L(`${etq}: no se pudo construir el caso roto -> ${e.message}`);
    fallas++;
    continue;
  }

  let informe = null, error = null;
  try {
    const internas = entrada.internas || leerFuentesInternas(entrada.raiz);
    informe = compararCatalogos({ internas, capturas: entrada.capturas, declaracion: entrada.declaracion });
  } catch (e) {
    error = e;
  }

  if (esperado.error) {
    if (!error) { L(`${etq}: NO MUERDE — el control aceptó un dato malo`); fallas++; }
    else if (!(error instanceof ErrorCatalogoBahias)) { L(`${etq}: muerde con el error equivocado (${error.name}) -> ${error.message}`); fallas++; }
    else if (!esperado.error.test(error.message)) { L(`${etq}: muerde por otro motivo -> ${error.message}`); fallas++; }
    else { L(`${etq}: muerde. ${error.message.slice(0, 90)}`); }
    continue;
  }

  if (error) { L(`${etq}: se detiene cuando debía reportar -> ${error.message}`); fallas++; continue; }
  if (informe.veredicto !== esperado.veredicto) { L(`${etq}: NO MUERDE — veredicto ${informe.veredicto}, se esperaba ${esperado.veredicto}`); fallas++; continue; }

  if (esperado.vencidas !== undefined) {
    if (informe.resumen.declaraciones_vencidas !== esperado.vencidas) {
      L(`${etq}: veredicto correcto pero ${informe.resumen.declaraciones_vencidas} vencidas, se esperaban ${esperado.vencidas}`); fallas++; continue;
    }
    L(`${etq}: muerde. ${informe.veredicto}, ${informe.resumen.declaraciones_vencidas} declaración vencida`);
    continue;
  }

  const encontrada = informe.divergencias.find(d =>
    d.clase === esperado.clase && d.id_bahia === esperado.id && !d.declarada &&
    (esperado.campo === undefined || d.campo === esperado.campo));
  if (!encontrada) {
    L(`${etq}: veredicto correcto pero no cazó ${esperado.clase} id ${esperado.id}${esperado.campo ? ' campo ' + esperado.campo : ''}`); fallas++; continue;
  }
  L(`${etq}: muerde. ${esperado.clase} id ${esperado.id}${esperado.campo ? '/' + esperado.campo : ''} — ${encontrada.detalle}`);
}

L('');
L('='.repeat(80));
if (fallas === 0) {
  L(`RESULTADO: mordida ${FAMILIAS.length}/${FAMILIAS.length} + control negativo. El control puede fallar.`);
  process.exit(0);
}
L(`RESULTADO: ${fallas} problema(s). El control NO se da por bueno.`);
process.exit(1);
