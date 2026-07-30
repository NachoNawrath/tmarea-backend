'use strict';

/**
 * Argumentos astronómicos y factores nodales para predicción armónica de
 * mareas -- Admiralty Method / Schureman (1958).
 *
 * Fórmulas de los elementos astronómicos (s, h, p, N, pp, omega, i) tomadas
 * de Meeus "Astronomical Algorithms"; los factores nodales f/u siguen las
 * fórmulas de Schureman "Manual of Harmonic Analysis and Prediction of
 * Tides" (1958), Tabla 1/2. Misma formulación que usan pytides/xtide/utide,
 * verificada por comparación numérica contra utide.reconstruct() en
 * scripts/validate_tide_engine.py.
 *
 * f(t) y u(t) se recalculan en la fecha exacta de cada predicción (no una
 * vez por año como las tablas náuticas clásicas), así que capturan el ciclo
 * nodal lunar de 18.6 años con precisión completa en vez de la aproximación
 * escalonada de las tablas de marea tradicionales.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function s2d(deg, arcmin = 0, arcsec = 0) {
  return deg + arcmin / 60 + arcsec / 3600;
}

function polynomial(coefficients, x) {
  let result = 0;
  for (let i = 0; i < coefficients.length; i++) result += coefficients[i] * x ** i;
  return result;
}

// Meeus 7.1 -- Julian Date (UTC)
function julianDate(date) {
  let Y = date.getUTCFullYear();
  let M = date.getUTCMonth() + 1;
  const D =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / (24 * 60) +
    date.getUTCSeconds() / (24 * 60 * 60);
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
}

// Coeficientes polinomiales en T (siglos julianos desde J2000.0), Meeus.
const LUNAR_LONGITUDE = [218.3164591, 481267.88134236, -0.0013268, 1 / 538841.0 - 1 / 65194000.0];
const SOLAR_LONGITUDE = [280.46645, 36000.76983, 0.0003032];
const LUNAR_PERIGEE = [83.353243, 4069.0137111, -0.0103238, -1 / 80053.0, 1 / 18999000.0];
const LUNAR_NODE = [125.044555, -1934.1361849, 0.0020762, 1 / 467410.0, -1 / 60616000.0];
const SOLAR_PERIGEE = [
  280.46645 - 357.5291,
  36000.76932 - 35999.0503,
  0.0003032 + 0.0001559,
  0.00000048,
];
const LUNAR_INCLINATION = [5.145]; // ~constante, inclinación de la órbita lunar a la eclíptica
// Oblicuidad terrestre (Meeus 21.3), en grados; términos de orden alto son
// despreciables en la escala de siglos que nos interesa pero se incluyen
// completos por fidelidad con la fuente.
const OBLIQUITY = [
  s2d(23, 26, 21.448),
  -s2d(0, 0, 4680.93) * 1e-2,
  -s2d(0, 0, 1.55) * 1e-4,
  s2d(0, 0, 1999.25) * 1e-6,
  -s2d(0, 0, 51.38) * 1e-8,
  -s2d(0, 0, 249.67) * 1e-10,
  -s2d(0, 0, 39.05) * 1e-12,
  s2d(0, 0, 7.12) * 1e-14,
  s2d(0, 0, 27.87) * 1e-16,
  s2d(0, 0, 5.79) * 1e-18,
  s2d(0, 0, 2.45) * 1e-20,
];

function mod360(x) {
  return ((x % 360) + 360) % 360;
}

// Schureman: I, xi, nu, nu', nu'' -- cantidades auxiliares dependientes de
// N (nodo lunar), i (inclinación lunar) y omega (oblicuidad terrestre).
function auxAngles(Ndeg, ideg, omegaDeg) {
  const N = D2R * Ndeg;
  const i = D2R * ideg;
  const omega = D2R * omegaDeg;

  const cosI = Math.cos(i) * Math.cos(omega) - Math.sin(i) * Math.sin(omega) * Math.cos(N);
  const I = Math.acos(cosI); // radianes

  const half = (a, b) => 0.5 * (a - b);
  const e1xi = Math.atan(
    (Math.cos(0.5 * (omega - i)) / Math.cos(0.5 * (omega + i))) * Math.tan(0.5 * N)
  );
  const e2xi = Math.atan(
    (Math.sin(0.5 * (omega - i)) / Math.sin(0.5 * (omega + i))) * Math.tan(0.5 * N)
  );
  const xi1 = e1xi - 0.5 * N;
  const xi2 = e2xi - 0.5 * N;
  const xi = -(xi1 + xi2) * R2D;
  const nu = (xi1 - xi2) * R2D;

  const Irad = I;
  const nuRad = D2R * nu;
  const nup = R2D * Math.atan(
    (Math.sin(2 * Irad) * Math.sin(nuRad)) / (Math.sin(2 * Irad) * Math.cos(nuRad) + 0.3347)
  );
  const tan2nupp =
    (Math.sin(Irad) ** 2 * Math.sin(2 * nuRad)) /
    (Math.sin(Irad) ** 2 * Math.cos(2 * nuRad) + 0.0727);
  const nupp = R2D * 0.5 * Math.atan(tan2nupp);

  void half;
  return { I: R2D * I, xi, nu, nup, nupp };
}

/**
 * Calcula los elementos astronómicos necesarios para argumentos de equilibrio
 * y factores nodales, en la fecha dada.
 * @param {Date} date
 */
function astro(date) {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525;

  const s = mod360(polynomial(LUNAR_LONGITUDE, T));
  const h = mod360(polynomial(SOLAR_LONGITUDE, T));
  const p = mod360(polynomial(LUNAR_PERIGEE, T));
  const N = mod360(polynomial(LUNAR_NODE, T));
  const pp = mod360(polynomial(SOLAR_PERIGEE, T));
  const omega = polynomial(OBLIQUITY, T);
  const i = polynomial(LUNAR_INCLINATION, T);

  const { I, xi, nu, nup, nupp } = auxAngles(N, i, omega);
  const P = mod360(p - xi);

  const hourAngle = (jd - Math.floor(jd)) * 360.0; // ángulo horario del sol medio en Greenwich
  const ThS = mod360(hourAngle + h - s); // T + h - s (convención estándar)

  return { ThS, s, h, p, N, pp, ninety: 90, omega, i, I, xi, nu, nup, nupp, P };
}

// Vector base para el producto punto de los argumentos: [T+h-s, s, h, p, N, pp, 90]
function astroVector(a) {
  return [a.ThS, a.s, a.h, a.p, a.N, a.pp, a.ninety];
}

// f=1, u=0 para constituyentes sin dependencia del nodo lunar (S2, P1, SA, SSA)
function fUnity() {
  return 1.0;
}
function uZero() {
  return 0.0;
}

function fO1(a) {
  const omega = D2R * a.omega;
  const i = D2R * a.i;
  const I = D2R * a.I;
  const mean = Math.sin(omega) * Math.cos(0.5 * omega) ** 2 * Math.cos(0.5 * i) ** 4;
  return (Math.sin(I) * Math.cos(0.5 * I) ** 2) / mean;
}
function uO1(a) {
  return 2.0 * a.xi - a.nu;
}

function fK1(a) {
  const omega = D2R * a.omega;
  const i = D2R * a.i;
  const I = D2R * a.I;
  const nu = D2R * a.nu;
  const sin2Icosnu_mean = Math.sin(2 * omega) * (1 - 1.5 * Math.sin(i) ** 2);
  const mean = 0.5023 * sin2Icosnu_mean + 0.1681;
  return (
    Math.sqrt(0.2523 * Math.sin(2 * I) ** 2 + 0.1689 * Math.sin(2 * I) * Math.cos(nu) + 0.0283) /
    mean
  );
}
function uK1(a) {
  return -a.nup;
}

function fM2(a) {
  const omega = D2R * a.omega;
  const i = D2R * a.i;
  const I = D2R * a.I;
  const mean = Math.cos(0.5 * omega) ** 4 * Math.cos(0.5 * i) ** 4;
  return Math.cos(0.5 * I) ** 4 / mean;
}
function uM2(a) {
  return 2.0 * a.xi - 2.0 * a.nu;
}

function fK2(a) {
  const omega = D2R * a.omega;
  const i = D2R * a.i;
  const I = D2R * a.I;
  const nu = D2R * a.nu;
  const sinsqIcos2nu_mean = Math.sin(omega) ** 2 * (1 - 1.5 * Math.sin(i) ** 2);
  const mean = 0.5023 * sinsqIcos2nu_mean + 0.0365;
  return (
    Math.sqrt(0.2523 * Math.sin(I) ** 4 + 0.0367 * Math.sin(I) ** 2 * Math.cos(2 * nu) + 0.0013) /
    mean
  );
}
function uK2(a) {
  return -2.0 * a.nupp;
}

// Coeficientes Doodson-like sobre la base [T+h-s, s, h, p, N, pp, 90],
// derivados de los códigos xdo de pytides/Schureman.
const BASE_CONSTITUENTS = {
  M2: { coeffs: [2, 0, 0, 0, 0, 0, 0], f: fM2, u: uM2 },
  S2: { coeffs: [2, 2, -2, 0, 0, 0, 0], f: fUnity, u: uZero },
  N2: { coeffs: [2, -1, 0, 1, 0, 0, 0], f: fM2, u: uM2 },
  K2: { coeffs: [2, 2, 0, 0, 0, 0, 0], f: fK2, u: uK2 },
  K1: { coeffs: [1, 1, 0, 0, 0, 0, -1], f: fK1, u: uK1 },
  O1: { coeffs: [1, -1, 0, 0, 0, 0, 1], f: fO1, u: uO1 },
  P1: { coeffs: [1, 1, -2, 0, 0, 0, 1], f: fUnity, u: uZero },
  Q1: { coeffs: [1, -2, 0, 1, 0, 0, 1], f: fO1, u: uO1 },
  // Sa = h - p1 (referenciado al perigeo solar, igual que Mm lunar = s-p),
  // no simplemente "h" -- confirmado por validación numérica contra
  // utide.reconstruct() en scripts/validate_tide_engine.py (una versión
  // sin el término -p1 dejaba un residuo sinusoidal anual de ~56mm en
  // Ancud). Ver Schureman (1958) tabla de constituyentes de largo período.
  SA: { coeffs: [0, 0, 1, 0, 0, -1, 0], f: fUnity, u: uZero },
  SSA: { coeffs: [0, 0, 2, 0, 0, 0, 0], f: fUnity, u: uZero },
};

// Constituyentes compuestos (combinaciones lineales de los base): la
// componente de aguas someras M4/MS4/MN4 no tiene forzante astronómico
// propio, su argumento/factor nodal se deriva de sus componentes.
const COMPOUND_CONSTITUENTS = {
  M4: [['M2', 2]],
  MS4: [
    ['M2', 1],
    ['S2', 1],
  ],
  MN4: [
    ['M2', 1],
    ['N2', 1],
  ],
};

/**
 * V (argumento de equilibrio, grados), f (factor nodal, adimensional) y u
 * (corrección nodal de fase, grados) para un constituyente en la fecha de
 * los elementos astronómicos `a` (ver astro()).
 */
function constituentArgument(name, a) {
  if (BASE_CONSTITUENTS[name]) {
    const c = BASE_CONSTITUENTS[name];
    const vec = astroVector(a);
    let V = 0;
    for (let i = 0; i < c.coeffs.length; i++) V += c.coeffs[i] * vec[i];
    return { V: mod360(V), f: c.f(a), u: c.u(a) };
  }
  if (COMPOUND_CONSTITUENTS[name]) {
    let V = 0;
    let u = 0;
    let f = 1;
    for (const [member, n] of COMPOUND_CONSTITUENTS[name]) {
      const m = constituentArgument(member, a);
      V += n * m.V;
      u += n * m.u;
      f *= m.f ** Math.abs(n);
    }
    return { V: mod360(V), f, u };
  }
  throw new Error(`constituyente desconocido: ${name}`);
}

module.exports = { astro, constituentArgument, julianDate, mod360, D2R, R2D };
