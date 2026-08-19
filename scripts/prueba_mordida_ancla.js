#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
// prueba_mordida_ancla.js - CLAUDE.md §4.6, para el control de (a1)-T
//
// Un control que exige NULL y nunca se probo contra un dato malo pasa en verde
// cuando no encuentra las filas -- por id equivocado, por tabla vacia, por
// conexion muerta -- y eso es peor que no tenerlo. Este script rompe el estado
// de una forma distinta por cada cosa que el control dice detectar, y comprueba
// que se pone rojo en cada una.
//
// Corre contra EL PAR CONGELADO de _bitacoras/control_ancla_2026-08-19/:
// la lectura real de nodos_maritimos del 2026-08-19 y la declaracion vigente
// EN ESA MISMA FECHA. No toca la base, no necesita red y no escribe nada.
//
// POR QUE EL PAR Y NO SOLO LA FOTO. Si la foto se cotejara contra la
// declaracion VIVA, el dia que otra pieza declare un nodo que hoy tiene ancla
// puesta el control negativo daria rojo sin que nada este mal -- y ese es
// justo el caso que el declarativo promete soportar sin tocar codigo.
//
// QUE PRUEBA ESTE SCRIPT: que la FUNCION DE VEREDICTO MUERDE. No prueba que el
// mundo de hoy este bien; eso lo prueba `npm run ancla` contra la base viva.
//
// Sale 0 solo si el control negativo NO muerde y TODAS las familias muerden.
//
// Uso:  npm run ancla:mordida
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  ErrorAnclasDeclaradas, CLASES, evaluarAnclasDeclaradas, validarDeclaracion,
} = require('../src/services/anclas-declaradas');

const RAIZ = path.join(__dirname, '..');
const PAR = path.join(RAIZ, '_bitacoras/control_ancla_2026-08-19');
const RUTA_LECTURA = path.join(PAR, '02_par_lectura_781_2026-08-19.json');
const RUTA_DECL_CONGELADA = path.join(PAR, '02_par_declaracion_2026-08-19.json');
const RUTA_DECL_VIVA = path.join(RAIZ, 'data/catalogo/anclas_declaradas.json');

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const clonar = o => JSON.parse(JSON.stringify(o));
const RE_CONTROL = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f]', 'g');
const escapar = t => String(t).replace(RE_CONTROL,
  c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const LECTURA_BASE = JSON.parse(fs.readFileSync(RUTA_LECTURA, 'utf8')).filas;
const DECL_BASE = JSON.parse(fs.readFileSync(RUTA_DECL_CONGELADA, 'utf8'));

// El nodo sobre el que se inyecta no se elige por gusto: 655 es uno de los DOS
// a los que el trigger les puso ancla de verdad al aplicar (a1) -- #655 -> 83 -
// asi que la inyeccion reproduce un valor observado y no uno inventado.
const NODO = 655;
const ANCLA_OBSERVADA = 83;
const declarado = id => DECL_BASE.filas.find(f => f.nodo_id === id);

// Cada familia devuelve { filas, declaracion } ya roto, y declara que espera:
// 'error' (el control se detiene) o un patron sobre el informe.
const FAMILIAS = [
  ['M1  el ancla vuelve en una fila declarada, con la coordenada intacta', () => {
    const filas = clonar(LECTURA_BASE);
    filas.find(r => r.id === NODO).bahia_sitport_id = ANCLA_OBSERVADA;
    return { filas, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'ESTADO_DECLARADO_ROTO', clase: 'ancla_repuesta_con_coordenada_intacta', nodo: NODO, hallazgos: 1 }],

  ['M2  las once recuperan ancla a la vez', () => {
    const filas = clonar(LECTURA_BASE);
    for (const d of DECL_BASE.filas) filas.find(r => r.id === d.nodo_id).bahia_sitport_id = ANCLA_OBSERVADA;
    return { filas, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'ESTADO_DECLARADO_ROTO', clase: 'ancla_repuesta_con_coordenada_intacta', hallazgos: 11 }],

  ['M3  la tabla llega VACIA - el caso que dejaria pasar un control mal escrito', () => {
    return { filas: [], declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DECLARACION_NO_CALZA', clase: 'fila_ausente', hallazgos: 11 }],

  ['M4  un nodo_id declarado ya no existe en la tabla (renumeracion)', () => {
    const filas = clonar(LECTURA_BASE).filter(r => r.id !== NODO);
    return { filas, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DECLARACION_NO_CALZA', clase: 'fila_ausente', nodo: NODO, hallazgos: 1 }],

  ['M5  el nodo_id existe pero es OTRO nodo - el ancla por id no basta', () => {
    const filas = clonar(LECTURA_BASE);
    const r = filas.find(x => x.id === NODO);
    r.nombre = 'Otra Caleta Cualquiera';
    r.fuente_id = 'CAL-9999';
    return { filas, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'DECLARACION_NO_CALZA', clase: 'identidad_distinta', nodo: NODO, hallazgos: 1 }],

  ['M6  la coordenada vuelve al +6,00 grados CON EL ANCLA EN NULL', () => {
    const filas = clonar(LECTURA_BASE);
    const d = declarado(659);
    const r = filas.find(x => x.id === 659);
    r.lat = d.estado_previo.lat;
    r.lng = d.estado_previo.lng;
    return { filas, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'ESTADO_DECLARADO_ROTO', clase: 'coordenada_movida_con_ancla_intacta', nodo: 659, hallazgos: 1 }],

  ['M7  la declaracion llega VACIA - no hay a quien exigirle nada', () => {
    const declaracion = clonar(DECL_BASE);
    declaracion.filas = [];
    return { filas: clonar(LECTURA_BASE), declaracion };
  }, 'error'],

  // AGREGADA por esta sesion, y va declarada: sin ella el control negativo del
  // informe -- el unico trozo del instrumento que decide si un NULL leido es un
  // NULL real -- no tendria mordida propia.
  ['M8  NINGUNA fila ajena tiene ancla - la lectura no discrimina', () => {
    const declarados = new Set(DECL_BASE.filas.map(f => f.nodo_id));
    const filas = clonar(LECTURA_BASE);
    for (const r of filas) if (!declarados.has(r.id)) r.bahia_sitport_id = null;
    return { filas, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'NO_SE_PUDO_MEDIR', hallazgos: 0 }],

  // AGREGADA por esta sesion, y va declarada: es la reproduccion literal de lo
  // que le paso al nodo 655 al aplicar (a1) -- el geom se movio Y el trigger
  // encontro poligono -- y sin ella la tercera clase del vocabulario seria una
  // rama que ninguna prueba produce.
  ['M9  los DOS sintomas en la misma fila - el caso literal del 655 en (a1)', () => {
    const filas = clonar(LECTURA_BASE);
    const d = declarado(NODO);
    const r = filas.find(x => x.id === NODO);
    r.lat = d.estado_previo.lat;
    r.lng = d.estado_previo.lng;
    r.bahia_sitport_id = ANCLA_OBSERVADA;
    return { filas, declaracion: clonar(DECL_BASE) };
  }, { veredicto: 'ESTADO_DECLARADO_ROTO', clase: 'ancla_repuesta_y_coordenada_movida', nodo: NODO, hallazgos: 1 }],

  // AGREGADA por esta sesion. ancla_esperada solo admite null; esta familia
  // prueba que la restriccion MUERDE y no es un comentario en el codigo. Sin
  // ella, la regla de que "un ancla CON VALOR es una decision deliberada" no
  // estaria probada, y un tipeo podria debilitar el control en silencio.
  ['M10 una fila declara ancla_esperada con un entero - restriccion deliberada', () => {
    const declaracion = clonar(DECL_BASE);
    declaracion.filas.find(f => f.nodo_id === NODO).ancla_esperada = ANCLA_OBSERVADA;
    return { filas: clonar(LECTURA_BASE), declaracion };
  }, 'error'],
];

const L = console.log;
const fallas = [];

L('='.repeat(80));
L('PRUEBA DE MORDIDA DEL CONTROL DEL ANCLA - (a1)-T');
L('corrida ' + new Date().toISOString());
L('='.repeat(80));
L('');
L('EL PAR CONGELADO (fixture, no mide el mundo)');
L('  lectura     : ' + path.basename(RUTA_LECTURA));
L('                781 filas esperadas, ' + LECTURA_BASE.length + ' leidas');
L('                sha256 de los BYTES EN DISCO (clase FA-4): ' + sha(fs.readFileSync(RUTA_LECTURA)));
L('  declaracion : ' + path.basename(RUTA_DECL_CONGELADA));
L('                ' + DECL_BASE.filas.length + ' filas declaradas');
L('                sha256 de los BYTES EN DISCO (clase FA-4): ' + sha(fs.readFileSync(RUTA_DECL_CONGELADA)));

// ── G1 · EL PAR NO PUEDE VENCERSE EN SILENCIO ───────────────────────────────
// Congelar la declaracion junto a la foto resolvio un falso rojo, pero abrio lo
// que el principio de e01 cerraba: "una copia del dato real es una segunda
// fuente de verdad y se vence sola". El dia que se declare un nodo doce, esta
// prueba seguiria VERDE contra un declarativo de once y dejaria de probar nada
// sobre el control que corre de verdad.
//
// Por eso ESTO FALLA, y no avisa. No es el falso rojo que el par vino a evitar:
// aquel era un rojo sin instruccion -- CN mordiendo porque un nodo recien
// declarado tenia ancla en la foto -- y este trae la orden y el motivo. Un
// fixture vencido ES un defecto. Ademas hace que el _procedimiento del
// declarativo se cumpla en vez de recordarse, que es la leccion que este
// repositorio ya pago: "acordarse ya fallo una vez".
const shaVivo = sha(fs.readFileSync(RUTA_DECL_VIVA));
const shaCongelado = sha(fs.readFileSync(RUTA_DECL_CONGELADA));
const DECL_VIVA = JSON.parse(fs.readFileSync(RUTA_DECL_VIVA, 'utf8'));
L('');
L('G1 - EL PAR CONTRA LA DECLARACION VIVA');
if (shaVivo === shaCongelado) {
  L('  ok la declaracion viva y la congelada son el MISMO fichero byte a byte');
  L('     ' + shaCongelado.slice(0, 16) + ' · ' + DECL_BASE.filas.length + ' filas declaradas');
} else {
  fallas.push('G1');
  const vivos = new Set(DECL_VIVA.filas.map(f => f.nodo_id));
  const congelados = new Set(DECL_BASE.filas.map(f => f.nodo_id));
  const soloVivos = [...vivos].filter(i => !congelados.has(i));
  const soloCongelados = [...congelados].filter(i => !vivos.has(i));
  L('  x  EL PAR VENCIO - la declaracion viva ya no es la congelada');
  L('       viva      ' + shaVivo.slice(0, 16) + ' · ' + DECL_VIVA.filas.length + ' filas');
  L('       congelada ' + shaCongelado.slice(0, 16) + ' · ' + DECL_BASE.filas.length + ' filas');
  if (soloVivos.length) L('       declarados que el fixture NO cubre: ' + soloVivos.join(', '));
  if (soloCongelados.length) L('       en el fixture y ya no declarados: ' + soloCongelados.join(', '));
  if (!soloVivos.length && !soloCongelados.length) L('       mismos nodo_id: la diferencia esta en el resto del fichero');
  L('       QUE HACER: congelar un PAR nuevo -- lectura Y declaracion, juntas y con');
  L('       la misma fecha -- y apuntar este script a el:');
  L('         node _bitacoras/control_ancla_2026-08-19/02_congelar_par.js');
  L('       Todo lo de abajo sigue corriendo, pero cubre la declaracion VIEJA.');
}

// G2 · la declaracion VIVA se valida igual, aunque el par este fresco. Es lo
// unico de esta prueba que dice algo del artefacto que el control usa de
// verdad, y no cuesta nada: no necesita base ni red.
L('');
L('G2 - LA DECLARACION VIVA SE VALIDA, no solo la congelada');
try {
  validarDeclaracion(DECL_VIVA);
  L('  ok data/catalogo/anclas_declaradas.json pasa la validacion estructural · ' +
    DECL_VIVA.filas.length + ' filas · tolerancia ' + DECL_VIVA.tolerancia_grados + ' grados');
} catch (e) {
  fallas.push('G2');
  L('  x  la declaracion VIVA no valida: ' + e.message);
}

// CONTROL NEGATIVO. Si el par sale rojo, la que esta mal es la prueba y no el
// control: nada de lo de abajo significaria nada.
L('');
L('-'.repeat(80));
L('CONTROL NEGATIVO - el par intacto tiene que salir SIN_NOVEDAD');
let informeCN;
try {
  informeCN = evaluarAnclasDeclaradas({ filas: clonar(LECTURA_BASE), declaracion: clonar(DECL_BASE) });
} catch (e) {
  L('  x el par intacto hizo DETENER el control: ' + e.message);
  fallas.push('CN');
}
if (informeCN) {
  const ok = informeCN.veredicto === 'SIN_NOVEDAD' && informeCN.hallazgos.length === 0;
  L('  ' + (ok ? 'ok' : 'x ') + ' veredicto ' + informeCN.veredicto + ' · hallazgos ' + informeCN.hallazgos.length +
    ' · ajenas con ancla ' + informeCN.negativo.ajenas_con_ancla + ' de ' + informeCN.negativo.ajenas);
  if (!ok) {
    fallas.push('CN');
    for (const h of informeCN.hallazgos) L('      [' + h.clase + '] nodo ' + h.nodo_id + ' ' + escapar(h.nombre));
  }
}

L('');
L('-'.repeat(80));
L('FAMILIAS - cada una tiene que MORDER');
for (const [nombre, romper, espera] of FAMILIAS) {
  const { filas, declaracion } = romper();
  let informe = null, error = null;
  try {
    informe = evaluarAnclasDeclaradas({ filas, declaracion });
  } catch (e) {
    if (e instanceof ErrorAnclasDeclaradas) error = e; else throw e;
  }

  if (espera === 'error') {
    if (error) L('  ok ' + nombre + '\n        el control se DETIENE: ' + error.message);
    else { fallas.push(nombre); L('  x  ' + nombre + '\n        NO se detuvo - veredicto ' + informe.veredicto); }
    continue;
  }

  if (error) {
    fallas.push(nombre);
    L('  x  ' + nombre + '\n        se detuvo cuando debia dar veredicto ' + espera.veredicto + ': ' + error.message);
    continue;
  }

  const problemas = [];
  if (informe.veredicto !== espera.veredicto) problemas.push('veredicto ' + informe.veredicto + ' y no ' + espera.veredicto);
  if (espera.hallazgos !== undefined && informe.hallazgos.length !== espera.hallazgos) {
    problemas.push('hallazgos ' + informe.hallazgos.length + ' y no ' + espera.hallazgos);
  }
  if (espera.clase !== undefined && !informe.hallazgos.some(h => h.clase === espera.clase)) {
    problemas.push('ninguna hallazgo de clase ' + espera.clase);
  }
  if (espera.nodo !== undefined && !informe.hallazgos.some(h => h.nodo_id === espera.nodo)) {
    problemas.push('el nodo ' + espera.nodo + ' no aparece entre los hallazgos');
  }

  if (problemas.length === 0) {
    L('  ok ' + nombre);
    L('        ' + informe.veredicto + ' · ' + informe.hallazgos.length + ' hallazgo(s)' +
      (espera.clase ? ' · clase ' + espera.clase : ''));
  } else {
    fallas.push(nombre);
    L('  x  ' + nombre);
    for (const p of problemas) L('        ' + p);
  }
}

L('');
L('-'.repeat(80));
L('VOCABULARIO EJERCITADO - toda clase del control tiene al menos una familia');
const clasesEjercitadas = new Set();
for (const [, romper, espera] of FAMILIAS) {
  if (espera !== 'error' && espera.clase) clasesEjercitadas.add(espera.clase);
  void romper;
}
for (const clase of Object.keys(CLASES)) {
  const tocada = clasesEjercitadas.has(clase);
  L('  ' + (tocada ? 'ok' : 'x ') + ' ' + clase);
  if (!tocada) fallas.push('clase sin familia: ' + clase);
}

L('');
L('='.repeat(80));
if (fallas.length === 0) {
  L('SIN FALLAS - el control negativo no mordio y las ' + FAMILIAS.length + ' familias mordieron.');
  L('QUE NO PRUEBA: no dice nada del estado de la base de hoy. Eso es npm run ancla.');
} else {
  L('ROJO - ' + fallas.length + ' fallas: ' + fallas.join(' · '));
}
L('='.repeat(80));
process.exit(fallas.length ? 2 : 0);
