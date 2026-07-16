const PRESETS = {
  barcaza: { Cb: 0.70, Kw: 0.04, x: 0.65 },
  lancha: { Cb: 0.50, Kw: 0.02, x: 0.50 },
  catamaran: { Cb: 0.35, Kw: 0.06, x: 0.75 },
};

const COEFICIENTE_PUNTAL = 0.055;
const DENSIDAD_AGUA_MAR = 1.025; // t/m3

class ShipPhysics {
  calcular(params) {
    const { tipo_embarcacion, eslora, manga, velocidad_crucero_nominal, peso_carga_adicional_ton } = params;

    const preset = PRESETS[tipo_embarcacion];
    if (!preset) {
      throw new Error(`Tipo de embarcación no soportado: ${tipo_embarcacion}`);
    }
    const { Cb, Kw, x } = preset;

    const puntal = eslora * COEFICIENTE_PUNTAL;
    const Delta_lightship = Cb * eslora * manga * puntal * DENSIDAD_AGUA_MAR;
    const Delta_total = Delta_lightship + peso_carga_adicional_ton;
    const STW = velocidad_crucero_nominal * Math.pow(Delta_lightship / Delta_total, x);

    return { Cb, Kw, x, Delta_lightship, Delta_total, STW };
  }
}

module.exports = ShipPhysics;
