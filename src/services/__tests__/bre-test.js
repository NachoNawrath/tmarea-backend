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

  it('detecta VARIABLE desde MotivoRestriccion cuando Observacion no lo contiene (sub-zona NORMAL)', () => {
    // Caso real: SITPORT reporta TIEMPO VARIABLE en MotivoRestriccion pero Observacion
    // describe sub-zonas donde la bahía principal dice CONDICION NORMAL
    const r = normalizarRestriccion({
      bahia: 124,
      GLBahia: 'MELINKA',
      Observacion: 'GOLFO CORCOVADO RESTRINGIDO PARA NAVES MENORES DE 25 AB. BAHIA MELINKA CONDICION NORMAL.',
      MotivoRestriccion: 'TIEMPO VARIABLE',
      NaveRecibe: 'NAVE MENOR (<25 AB)',
    });
    assert.equal(r.condicion, 'VARIABLE', 'debe detectar VARIABLE desde MotivoRestriccion');
    assert.equal(r.umbral_ab_fuera, 25, 'debe extraer umbral 25 AB de la sub-zona');
    assert.equal(r.afecta_menores, true);
  });

  it('VARIABLE desde MotivoRestriccion — datos reales Melinka sub-zona', () => {
    const r = normalizarRestriccion({
      bahia: 124,
      GLBahia: 'MELINKA',
      Observacion: 'G.CORCOVADO RESTRINGIDO PARA NAVES MENORES DE 25 AB. B.MELINKA CONDICION NORMAL.',
      MotivoRestriccion: 'TIEMPO VARIABLE',
      NaveRecibe: 'NAVE MENOR (&LT;25 AB)',
    });
    assert.equal(r.condicion, 'VARIABLE');
    assert.equal(r.umbral_ab_fuera, 25);
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

  it('Melinka VARIABLE sub-zona: nave AB 15 con umbral 25 → U, precaución (aplica)', async () => {
    const norm = { condicion: 'VARIABLE', afecta_menores: true, afecta_mayores: false, umbral_ab_fuera: 25, umbral_ab_dentro: 25, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, 15);
    assert.equal(ev.nivel, 'U');
    assert.equal(ev.bloquea, false);
    assert.notEqual(ev.estado, 'no_afecta', 'debe afectar a nave de 15 AB');
  });

  it('Melinka VARIABLE sub-zona: nave AB 50 con umbral 25 → no_afecta (informativa)', async () => {
    const norm = { condicion: 'VARIABLE', afecta_menores: true, afecta_mayores: false, umbral_ab_fuera: 25, umbral_ab_dentro: 25, bloqueo_total: false };
    const ev = await evaluarRestriccion(norm, 50);
    assert.equal(ev.estado, 'no_afecta');
    assert.equal(ev.bloquea, false);
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

  it('Melinka VARIABLE sub-zona con datos reales: nave 15 AB → U, nave 50 AB → Q (informativa)', async () => {
    const melinkaRaw = {
      bahia: 124, GLBahia: 'MELINKA', tipo: 'TODOS',
      MotivoRestriccion: 'TIEMPO VARIABLE',
      Observacion: 'GOLFO CORCOVADO RESTRINGIDO PARA NAVES MENORES DE 25 AB. BAHIA MELINKA CONDICION NORMAL.',
      NaveRecibe: 'NAVE MENOR (&LT;25 AB)',
    };
    const intermedia = { nombre_bahia: 'Melinka', id_bahia: 124, orden_en_ruta: 1, _raw: melinkaRaw };

    const res15 = await evaluarRuta([intermedia], 15);
    assert.equal(res15.veredicto, 'U', 'nave 15 AB debe recibir veredicto U');
    assert.notEqual(res15.restricciones[0].estado, 'no_afecta');

    const res50 = await evaluarRuta([intermedia], 50);
    assert.equal(res50.veredicto, 'Q', 'nave 50 AB (sobre umbral) → veredicto Q');
    assert.equal(res50.restricciones[0].estado, 'no_afecta', 'se incluye como informativa');
  });
});

// ── Test de integración: restricción no_afecta sigue presente como informativa
// Propiedad INV-1.2: una restricción que no aplica a la embarcación NUNCA se
// descarta; aparece en la salida con aplica:false y estado:'no_afecta'.
// Este test habría atrapado la regresión del rename aplica_a_mi_embarcacion→aplica.
// ─────────────────────────────────────────────────────────────────────────────
describe('integración: partición bloqueantes vs informativas (INV-1.2)', () => {
  function enriquecer(intermedias, evaluacion) {
    return intermedias.map((r, i) => {
      const ev = evaluacion.restricciones[i] || {};
      const { _raw, ...sinRaw } = r;
      const estado = ev.estado || 'indeterminado';
      return {
        ...sinRaw,
        aplica: estado !== 'no_afecta',
        evaluacion: {
          bloquea: ev.bloquea ?? false,
          estado,
          umbral_ab: ev.umbral_ab ?? null,
          nivel: ev.nivel || null,
          motivo: ev.motivo || null,
        },
      };
    });
  }

  it('restricción que no aplica a la embarcación sigue presente como informativa', async () => {
    const intermedias = [
      { nombre_bahia: 'ZONA BLOQ', id_bahia: 1, orden_en_ruta: 1, _raw: { bahia: 1, GLBahia: 'ZONA BLOQ', Observacion: 'CONDICION DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 50 AB', MotivoRestriccion: 'MAL TIEMPO', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
      { nombre_bahia: 'ZONA INFO', id_bahia: 2, orden_en_ruta: 2, _raw: { bahia: 2, GLBahia: 'ZONA INFO', Observacion: 'CONDICION DE MAL TIEMPO PARA EMBARCACIONES MENORES DE 25 AB', MotivoRestriccion: 'MAL TIEMPO', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
    ];

    const evaluacion = await evaluarRuta(intermedias, 43);
    const salida = enriquecer(intermedias, evaluacion);

    assert.equal(salida.length, 2, 'ambas restricciones deben estar en la salida');

    const bloq = salida.find(r => r.id_bahia === 1);
    assert.equal(bloq.aplica, true, 'restricción que bloquea tiene aplica:true');
    assert.equal(bloq.evaluacion.bloquea, true);

    const info = salida.find(r => r.id_bahia === 2);
    assert.equal(info.aplica, false, 'restricción que no aplica tiene aplica:false');
    assert.equal(info.evaluacion.estado, 'no_afecta');
    assert.equal(info.evaluacion.bloquea, false);
  });

  it('campo aplica es booleano y coincide con evaluacion.estado', async () => {
    const intermedias = [
      { nombre_bahia: 'Z', id_bahia: 1, orden_en_ruta: 1, _raw: { bahia: 1, GLBahia: 'Z', Observacion: 'TEMPORAL', MotivoRestriccion: 'TEMPORAL', NaveRecibe: 'NAVE MENOR (<100 AB)' } },
    ];
    const evaluacion = await evaluarRuta(intermedias, 15);
    const salida = enriquecer(intermedias, evaluacion);

    assert.strictEqual(typeof salida[0].aplica, 'boolean', 'aplica debe ser booleano');
    assert.equal(salida[0].aplica, salida[0].evaluacion.estado !== 'no_afecta');
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
