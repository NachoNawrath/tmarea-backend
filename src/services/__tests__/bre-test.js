// Test del motor de reglas BRE contra datos reales del sondaje SITPORT
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { normalizarRestriccion, normalizarTexto } = require('../sitport-parser');
const { evaluarRestriccion } = require('../restriction-rules-engine');
const { evaluarRuta } = require('../route-restriction-evaluator');

// ── Cargar datos del sondaje más reciente ────────────────────────────────────
const sondajePath = path.join(__dirname, '..', '..', '..', 'sondaje-sitport', 'restricciones_2026-08-01_13-14.json');
let sondajeData = [];
try {
  const raw = JSON.parse(fs.readFileSync(sondajePath, 'utf8'));
  sondajeData = raw.recordsets?.[0] || raw;
} catch (e) {
  console.log('Sondaje no disponible, saltando tests de datos reales');
}

// ── Tests del normalizador de texto ──────────────────────────────────────────
describe('normalizarTexto', () => {
  it('maneja acentos correctos', () => {
    assert.equal(normalizarTexto('CONDICIÓN DE MAL TIEMPO'), 'CONDICION DE MAL TIEMPO');
  });

  it('maneja texto sin acentos', () => {
    assert.equal(normalizarTexto('CONDICION DE MAL TIEMPO'), 'CONDICION DE MAL TIEMPO');
  });

  it('maneja texto vacío y null', () => {
    assert.equal(normalizarTexto(''), '');
    assert.equal(normalizarTexto(null), '');
    assert.equal(normalizarTexto(undefined), '');
  });
});

// ── Tests del parser ─────────────────────────────────────────────────────────
describe('normalizarRestriccion', () => {
  it('detecta TEMPORAL', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'SE ESTABLECE CONDICIÓN DE TEMPORAL',
      MotivoRestriccion: 'VIENTO',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.condicion, 'TEMPORAL');
    assert.equal(r.afecta_menores, true);
  });

  it('detecta MAL_TIEMPO', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'SE ESTABLECE CONDICIÓN DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 50 AB',
      MotivoRestriccion: 'MAL TIEMPO',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.condicion, 'MAL_TIEMPO');
    assert.equal(r.umbral_ab_fuera, 50);
    assert.equal(r.afecta_menores, true);
  });

  it('detecta VARIABLE', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'CONDICIÓN DE TIEMPO VARIABLE PARA EEMM 25 AB',
      MotivoRestriccion: 'VIENTO',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.condicion, 'VARIABLE');
    assert.equal(r.umbral_ab_fuera, 25);
  });

  it('extrae umbral EEMM-50AB (formato Melinka)', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'RESTRICCION PARA EEMM-50AB',
      MotivoRestriccion: '',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.umbral_ab_fuera, 50);
  });

  it('extrae umbral EEMM <25 AB (formato Chonchi)', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'RESTRICCION PARA EEMM <25 AB',
      MotivoRestriccion: '',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.umbral_ab_fuera, 25);
  });

  it('detecta TODO TIPO DE NAVES como bloqueo_total', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'RESTRICCION PARA TODO TIPO DE NAVES',
      MotivoRestriccion: '',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.bloqueo_total, true);
  });

  it('detecta TRG como equivalente a AB', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'NAVE MENOR A 12 TRG',
      MotivoRestriccion: '',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.umbral_ab_fuera, 12);
  });

  it('EMBARCACIONES MENORES sin número → umbral null', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'RESTRICCION PARA EMBARCACIONES MENORES',
      MotivoRestriccion: '',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.umbral_ab_fuera, null);
    assert.equal(r.afecta_menores, true);
  });

  it('TEMPORAL tiene prioridad sobre MAL TIEMPO', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: 'CONDICION DE MAL TIEMPO Y TEMPORAL',
      MotivoRestriccion: '',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.condicion, 'TEMPORAL');
  });

  it('fallback a MotivoRestriccion cuando Observacion vacía', () => {
    const r = normalizarRestriccion({
      bahia: 100,
      GLBahia: 'TEST',
      Observacion: '',
      MotivoRestriccion: 'TEMPORAL, VIENTO',
      NaveRecibe: 'NAVE MENOR (<100 AB)',
    });
    assert.equal(r.condicion, 'TEMPORAL');
  });
});

// ── Tests del motor de reglas ────────────────────────────────────────────────
describe('evaluarRestriccion', () => {
  it('TEMPORAL → UV, bloquea', async () => {
    const norm = { condicion: 'TEMPORAL', afecta_menores: true, afecta_mayores: true, umbral_ab_fuera: null, umbral_ab_dentro: null, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, 60);
    assert.equal(ev.nivel, 'UV');
    assert.equal(ev.bloquea, true);
  });

  it('MAL_TIEMPO sin umbral → UV para menores', async () => {
    const norm = { condicion: 'MAL_TIEMPO', afecta_menores: true, afecta_mayores: false, umbral_ab_fuera: null, umbral_ab_dentro: null, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, 15);
    assert.equal(ev.nivel, 'UV');
    assert.equal(ev.bloquea, true);
  });

  it('MAL_TIEMPO con umbral 50, nave AB 15 → UV, bloquea', async () => {
    const norm = { condicion: 'MAL_TIEMPO', afecta_menores: true, afecta_mayores: false, umbral_ab_fuera: 50, umbral_ab_dentro: 50, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, 15);
    assert.equal(ev.nivel, 'UV');
    assert.equal(ev.bloquea, true);
  });

  it('MAL_TIEMPO con umbral 50, nave AB 60 → no afecta', async () => {
    const norm = { condicion: 'MAL_TIEMPO', afecta_menores: true, afecta_mayores: false, umbral_ab_fuera: 50, umbral_ab_dentro: 50, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, 60);
    assert.equal(ev.bloquea, false);
    assert.equal(ev.estado, 'no_afecta');
  });

  it('MAL_TIEMPO con umbral 25, nave AB 43 → no afecta', async () => {
    const norm = { condicion: 'MAL_TIEMPO', afecta_menores: true, afecta_mayores: false, umbral_ab_fuera: 25, umbral_ab_dentro: 25, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, 43);
    assert.equal(ev.bloquea, false);
    assert.equal(ev.estado, 'no_afecta');
  });

  it('VARIABLE con umbral 25, nave AB 15 → U, precaución', async () => {
    const norm = { condicion: 'VARIABLE', afecta_menores: true, afecta_mayores: false, umbral_ab_fuera: 25, umbral_ab_dentro: 25, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, 15);
    assert.equal(ev.nivel, 'U');
    assert.equal(ev.bloquea, false);
  });

  it('umbral 50, nave sin AB → U, sin_ab', async () => {
    const norm = { condicion: 'MAL_TIEMPO', afecta_menores: true, afecta_mayores: false, umbral_ab_fuera: 50, umbral_ab_dentro: 50, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, null);
    assert.equal(ev.nivel, 'U');
    assert.equal(ev.estado, 'sin_ab');
  });

  it('bloqueo_total → UV', async () => {
    const norm = { condicion: 'OTRO', afecta_menores: true, afecta_mayores: true, umbral_ab_fuera: null, umbral_ab_dentro: null, bloqueo_total: true };
    const ev = await evaluarRestriccion(norm, 60);
    assert.equal(ev.nivel, 'UV');
    assert.equal(ev.bloquea, true);
  });
});

// ── Tests del evaluador de ruta ──────────────────────────────────────────────
describe('evaluarRuta', () => {
  it('nave AB 15, rutas MAL_TIEMPO 50AB → veredicto UV', async () => {
    const intermedias = [
      { nombre_bahia: 'ZONA A', id_bahia: 1, orden_en_ruta: 1, _raw: { bahia: 1, GLBahia: 'ZONA A', Observacion: 'CONDICION DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 50 AB', MotivoRestriccion: 'MAL TIEMPO', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
      { nombre_bahia: 'ZONA B', id_bahia: 2, orden_en_ruta: 2, _raw: { bahia: 2, GLBahia: 'ZONA B', Observacion: 'CONDICION DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 25 AB', MotivoRestriccion: 'MAL TIEMPO', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
    ];
    const resultado = await evaluarRuta(intermedias, 15);
    assert.equal(resultado.veredicto, 'UV');
    assert.equal(resultado.restricciones[0].bloquea, true);
    assert.equal(resultado.restricciones[1].bloquea, true);
  });

  it('nave AB 43, MAL_TIEMPO 25AB no bloquea, MAL_TIEMPO 50AB sí', async () => {
    const intermedias = [
      { nombre_bahia: 'ZONA A', id_bahia: 1, orden_en_ruta: 1, _raw: { bahia: 1, GLBahia: 'ZONA A', Observacion: 'CONDICION DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 25 AB', MotivoRestriccion: 'MAL TIEMPO', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
      { nombre_bahia: 'ZONA B', id_bahia: 2, orden_en_ruta: 2, _raw: { bahia: 2, GLBahia: 'ZONA B', Observacion: 'CONDICION DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 50 AB', MotivoRestriccion: 'MAL TIEMPO', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
    ];
    const resultado = await evaluarRuta(intermedias, 43);
    assert.equal(resultado.veredicto, 'UV');
    assert.equal(resultado.restricciones[0].bloquea, false);
    assert.equal(resultado.restricciones[1].bloquea, true);
    assert.equal(resultado.ultimo_tramo_seguro.bahia, 'ZONA A');
  });

  it('nave AB 60, MAL_TIEMPO 50AB no bloquea', async () => {
    const intermedias = [
      { nombre_bahia: 'ZONA A', id_bahia: 1, orden_en_ruta: 1, _raw: { bahia: 1, GLBahia: 'ZONA A', Observacion: 'CONDICION DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 50 AB', MotivoRestriccion: 'MAL TIEMPO', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
    ];
    const resultado = await evaluarRuta(intermedias, 60);
    assert.equal(resultado.veredicto, 'Q');
    assert.equal(resultado.restricciones[0].bloquea, false);
  });

  it('nave sin AB → veredicto U (precaución)', async () => {
    const intermedias = [
      { nombre_bahia: 'ZONA A', id_bahia: 1, orden_en_ruta: 1, _raw: { bahia: 1, GLBahia: 'ZONA A', Observacion: 'CONDICION DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 50 AB', MotivoRestriccion: 'MAL TIEMPO', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
    ];
    const resultado = await evaluarRuta(intermedias, null);
    assert.equal(resultado.veredicto, 'U');
    assert.equal(resultado.restricciones[0].estado, 'sin_ab');
  });

  it('ruta sin restricciones → veredicto Q', async () => {
    const resultado = await evaluarRuta([], 15);
    assert.equal(resultado.veredicto, 'Q');
    assert.equal(resultado.restricciones.length, 0);
  });
});

// ── Tests contra datos reales del sondaje ────────────────────────────────────
describe('sondaje real', () => {
  if (sondajeData.length === 0) {
    it('saltando (sondaje no disponible)', () => {});
    return;
  }

  it('normaliza todos los registros sin error', () => {
    for (const reg of sondajeData) {
      const norm = normalizarRestriccion(reg);
      assert.ok(norm.bahia_id != null || norm.bahia_nombre != null);
      assert.ok(['TEMPORAL', 'MAL_TIEMPO', 'VARIABLE', 'OTRO'].includes(norm.condicion));
    }
  });

  it('evalúa restricciones de NAVE MENOR contra AB 15', async () => {
    const menores = sondajeData.filter(r =>
      (r.NaveRecibe || '').toUpperCase().includes('MENOR')
    );
    assert.ok(menores.length > 0, 'Debe haber restricciones para NAVE MENOR en el sondaje');

    for (const reg of menores.slice(0, 10)) {
      const norm = normalizarRestriccion(reg);
      const ev = await evaluarRestriccion(norm, 15);
      assert.ok(ev.estado, `Sin estado para restricción ${reg.GLBahia}`);
      assert.ok(typeof ev.bloquea === 'boolean');
    }
  });

  it('condiciones detectadas son plausibles', () => {
    const condiciones = {};
    for (const reg of sondajeData) {
      const norm = normalizarRestriccion(reg);
      condiciones[norm.condicion] = (condiciones[norm.condicion] || 0) + 1;
    }
    console.log('Distribución de condiciones:', condiciones);
    assert.ok(Object.keys(condiciones).length >= 2, 'Debe haber al menos 2 tipos de condición');
  });
});
