const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validarHabilitacionDeportiva,
  derivarABDeEslora,
  TABLA_ARQUEO_ESLORA,
} = require('../deportivo-validator');

function perfil(overrides = {}) {
  return {
    licencia: 'PDB',
    clasificacion_nave: 'BAHIA_MOTOR',
    propulsion: 'motor',
    ...overrides,
  };
}

// ── INV-4.1 — límite efectivo = min(licencia, clasificación, degradación_vela) ──
describe('INV-4.1 — límite efectivo = min(licencia, clasificación, degradación_vela)', () => {

  it('CDC + COSTERA_60 + ámbito 70 → UV (licencia CDC limita a 60)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDC', clasificacion_nave: 'COSTERA_60' }),
      { ambito_millas: 70 }
    );
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.some(m => m.regla === 'INV-4.1'));
  });

  it('CDAM + COSTERA_12 + ámbito 15 → UV (clasificación manda sobre licencia)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'COSTERA_12' }),
      { ambito_millas: 15 }
    );
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.some(m => m.regla === 'INV-4.1'));
  });

  it('vela + motor_operativo=false → tope 12 MN; ámbito 15 → UV', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'ALTA_MAR', propulsion: 'vela', motor_operativo: false }),
      { ambito_millas: 15 }
    );
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.some(m => m.regla === 'INV-4.1'));
  });

  it('contra-prueba: vela + motor_operativo=true → sin degradación; CDAM+ALTA_MAR+100 → Q', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'ALTA_MAR', propulsion: 'vela', motor_operativo: true }),
      { ambito_millas: 100 }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('CDC + COSTERA_12 + ámbito 13 → UV (clasificación 12 < licencia 60)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDC', clasificacion_nave: 'COSTERA_12' }),
      { ambito_millas: 13 }
    );
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.some(m => m.regla === 'INV-4.1'));
  });

  it('CDAM + COSTERA_60 + ámbito 55 → Q (dentro del límite)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'COSTERA_60' }),
      { ambito_millas: 55 }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('CDAM + COSTERA_60 + ámbito 61 → UV (excede 60)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'COSTERA_60' }),
      { ambito_millas: 61 }
    );
    assert.equal(r.bandera, 'UV');
  });

  it('CDC + COSTERA_60 + ámbito 60 → Q (exactamente en el límite, no excede)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDC', clasificacion_nave: 'COSTERA_60' }),
      { ambito_millas: 60 }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('CDAM + ALTA_MAR + ámbito 500 → Q (sin tope, Infinity)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'ALTA_MAR' }),
      { ambito_millas: 500 }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('vela + motor_operativo=undefined → alerta warning, no UV por sí sola', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'ALTA_MAR', propulsion: 'vela' }),
      { ambito_millas: 10 }
    );
    assert.equal(r.bandera, 'Q');
    assert.ok(r.alertas.some(a => a.tipo === 'warning'));
  });

  it('CDAM + COSTERA_12 + vela + motor_operativo=false + ámbito 10 → Q (min(∞,12,12)=12, 10≤12)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'COSTERA_12', propulsion: 'vela', motor_operativo: false }),
      { ambito_millas: 10 }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('PDB + COSTERA_12 + ámbito 5 → UV (licencia PDB limita a bahía=0)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'COSTERA_12' }),
      { ambito_millas: 5 }
    );
    assert.equal(r.bandera, 'UV');
  });

  it('todo válido sin navegación → Q (no hay ámbito que comparar)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'ALTA_MAR' }),
      {}
    );
    assert.equal(r.bandera, 'Q');
  });
});

// ── INV-4.2 — PLDB × propulsión ────────────────────────────────────────────
describe('INV-4.2 — PLDB solo habilita motor', () => {

  it('PLDB + vela → UV', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PLDB', propulsion: 'vela' }),
      {}
    );
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.some(m => m.regla === 'INV-4.2'));
  });

  it('PLDB + mixto → UV', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PLDB', propulsion: 'mixto' }),
      {}
    );
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.some(m => m.regla === 'INV-4.2'));
  });

  it('PLDB + motor → no bloquea por INV-4.2', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PLDB', propulsion: 'motor' }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.bandera, 'Q');
    assert.ok(!r.motivos.some(m => m.regla === 'INV-4.2'));
  });
});

// ── INV-4.4 — derivarABDeEslora ────────────────────────────────────────────
describe('INV-4.4 — AB derivado de eslora (RGDN Art. 28)', () => {

  it('eslora 8 m → AB 5.0', () => {
    const d = derivarABDeEslora(8);
    assert.equal(d.ab, 5.0);
    assert.equal(d.derivado, true);
    assert.equal(d.fuente, 'RGDN Art. 28');
  });

  it('eslora 15 m → AB 22.3', () => {
    const d = derivarABDeEslora(15);
    assert.equal(d.ab, 22.3);
  });

  it('eslora 10 m → AB 10.0', () => {
    const d = derivarABDeEslora(10);
    assert.equal(d.ab, 10.0);
  });

  it('eslora 23.99 m → AB 50.0 (tope tabla)', () => {
    const d = derivarABDeEslora(23.99);
    assert.equal(d.ab, 50.0);
  });

  it('eslora >= 24 → null (fuera de tabla)', () => {
    assert.equal(derivarABDeEslora(24), null);
    assert.equal(derivarABDeEslora(30), null);
  });

  it('eslora <= 0 → null', () => {
    assert.equal(derivarABDeEslora(0), null);
    assert.equal(derivarABDeEslora(-5), null);
  });

  it('eslora null/undefined → null', () => {
    assert.equal(derivarABDeEslora(null), null);
    assert.equal(derivarABDeEslora(undefined), null);
  });

  it('AB derivado se refleja en resultado del validador (eslora 12 → AB 15.0)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ eslora: 12 }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.ab_derivado, true);
    assert.equal(r.ab_efectivo, 15.0);
  });

  it('AB explícito no se sobreescribe por derivación', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ eslora: 12, arqueo_bruto: 20 }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.ab_derivado, false);
    assert.equal(r.ab_efectivo, 20);
  });

  it('tabla tiene 17 filas y esloraMax ascendente', () => {
    assert.equal(TABLA_ARQUEO_ESLORA.length, 17);
    for (let i = 1; i < TABLA_ARQUEO_ESLORA.length; i++) {
      assert.ok(TABLA_ARQUEO_ESLORA[i].esloraMax > TABLA_ARQUEO_ESLORA[i - 1].esloraMax);
    }
  });
});

// ── Datos críticos faltantes/fuera de enum → UV ────────────────────────────
describe('datos críticos faltantes/fuera de enum → UV', () => {

  it('licencia ausente → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ licencia: undefined }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('licencia fuera de enum → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ licencia: 'INVENTADA' }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('clasificación ausente → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ clasificacion_nave: undefined }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('clasificación fuera de enum → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ clasificacion_nave: 'OCEANO' }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('propulsión ausente → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ propulsion: undefined }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('propulsión fuera de enum → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ propulsion: 'nuclear' }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('eslora negativa → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ eslora: -3 }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('motor_hp negativo → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ motor_hp: -10 }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('arqueo_bruto negativo → UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ arqueo_bruto: -1 }), {});
    assert.equal(r.bandera, 'UV');
  });

  it('perfilNave null → UV (graceful)', () => {
    const r = validarHabilitacionDeportiva(null, {});
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.length >= 3);
  });
});

// ── Sentinel bahía=0 ───────────────────────────────────────────────────────
describe('sentinel bahía=0 — bahía en bahía → Q; bahía + ámbito>0 → UV', () => {

  it('PDB + BAHIA_MOTOR + ámbito "bahia" → Q', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('PDB + BAHIA_VELA + vela + motor_op=true + ámbito "bahia" → Q', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'BAHIA_VELA', propulsion: 'vela', motor_operativo: true }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('PLDB + BAHIA_MOTOR + motor + ámbito "bahia" → Q', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PLDB', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('PDB + BAHIA_MOTOR + ámbito 0 → Q (sentinel numérico)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 0 }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('CDC + BAHIA_MOTOR + ámbito "bahia" → Q (clasificación manda sobre licencia)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDC', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.bandera, 'Q');
  });

  it('PDB + BAHIA_MOTOR + ámbito 1 → UV', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 1 }
    );
    assert.equal(r.bandera, 'UV');
  });

  it('PDB + BAHIA_VELA + vela + motor_op=true + ámbito 5 → UV', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'BAHIA_VELA', propulsion: 'vela', motor_operativo: true }),
      { ambito_millas: 5 }
    );
    assert.equal(r.bandera, 'UV');
  });

  it('PLDB + BAHIA_MOTOR + motor + ámbito 0.5 → UV', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PLDB', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 0.5 }
    );
    assert.equal(r.bandera, 'UV');
  });

  it('PDB + BAHIA_MOTOR + ámbito 12 → UV', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 12 }
    );
    assert.equal(r.bandera, 'UV');
  });

  it('CDC + BAHIA_MOTOR + ámbito 60 → UV (clasificación 0 < licencia 60)', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDC', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 60 }
    );
    assert.equal(r.bandera, 'UV');
  });
});

// ── Escalamiento de bandera ────────────────────────────────────────────────
describe('escalamiento de bandera — ninguna baja a la otra', () => {

  it('múltiples causas UV → bandera UV, todos los motivos presentes', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'INVENTADA', clasificacion_nave: 'OCEANO', propulsion: 'nuclear' }),
      {}
    );
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.length >= 3, `esperaba ≥3 motivos, hay ${r.motivos.length}`);
  });

  it('una sola causa UV → bandera UV', () => {
    const r = validarHabilitacionDeportiva(perfil({ propulsion: 'nuclear' }), {});
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.length >= 1);
  });

  it('todo válido + ámbito dentro de límite → Q, 0 motivos', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDAM', clasificacion_nave: 'ALTA_MAR' }),
      { ambito_millas: 50 }
    );
    assert.equal(r.bandera, 'Q');
    assert.equal(r.motivos.length, 0);
  });

  it('UV temprano (licencia) + checks posteriores válidos → UV se mantiene', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'INVENTADA', clasificacion_nave: 'ALTA_MAR', propulsion: 'motor' }),
      { ambito_millas: 10 }
    );
    assert.equal(r.bandera, 'UV');
  });

  it('checks tempranos válidos + UV tardío (INV-4.1) → UV se escala', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'CDC', clasificacion_nave: 'COSTERA_60' }),
      { ambito_millas: 100 }
    );
    assert.equal(r.bandera, 'UV');
    assert.ok(r.motivos.some(m => m.regla === 'INV-4.1'));
  });
});

// ── NUEVO — BAHIA_* → ámbito 'bahia' por clasificación declarada ──────────
describe('NUEVO — BAHIA_* → ámbito bahia por clasificación, independiente de distancia de ruta', () => {

  it('BAHIA_VELA + PDB + ámbito "bahia" → Q', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'BAHIA_VELA', propulsion: 'vela', motor_operativo: true }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.bandera, 'Q');
    assert.equal(r.motivos.length, 0);
  });

  it('BAHIA_MOTOR + PDB + ámbito "bahia" → Q', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PDB', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.bandera, 'Q');
    assert.equal(r.motivos.length, 0);
  });

  it('BAHIA_MOTOR + PLDB + ámbito "bahia" → Q', () => {
    const r = validarHabilitacionDeportiva(
      perfil({ licencia: 'PLDB', clasificacion_nave: 'BAHIA_MOTOR' }),
      { ambito_millas: 'bahia' }
    );
    assert.equal(r.bandera, 'Q');
    assert.equal(r.motivos.length, 0);
  });
});
