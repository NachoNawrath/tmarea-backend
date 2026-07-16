const EARTH_RADIUS_NM = 3440.065;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function distanciaHaversineNM(desde, hasta) {
  const dLat = toRad(hasta.lat - desde.lat);
  const dLon = toRad(hasta.lon - desde.lon);
  const lat1 = toRad(desde.lat);
  const lat2 = toRad(hasta.lat);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_NM * c;
}

function derrota(desde, hasta) {
  const lat1 = toRad(desde.lat);
  const lat2 = toRad(hasta.lat);
  const dLon = toRad(hasta.lon - desde.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

class NavigationCalculator {
  async calcular(datosOceanicos, fisica, params) {
    const { STW, Delta_total, Delta_lightship, Kw } = fisica;
    const { consumo_nominal, velocidad_crucero_nominal, fecha_hora_salida } = params;

    const CH_real =
      consumo_nominal *
      Math.pow(STW / velocidad_crucero_nominal, 3) *
      Math.pow(Delta_total / Delta_lightship, 0.65);

    const segmentosCalculados = await Promise.all(
      datosOceanicos.segmentos.map((segmento) =>
        Promise.resolve().then(() =>
          this.calcularSegmento(segmento, { STW, Kw, CH_real, fuente: datosOceanicos.fuente })
        )
      )
    );

    const distancia_total_mn = segmentosCalculados.reduce((sum, s) => sum + s.distancia_mn, 0);
    const eta_horas = segmentosCalculados.reduce((sum, s) => sum + (s.tiempo_horas || 0), 0);
    const consumo_total_litros = segmentosCalculados.reduce(
      (sum, s) => sum + (s.consumo_litros || 0),
      0
    );
    const alerta_autonomia = segmentosCalculados.some((s) => s.alerta);

    const salida = new Date(fecha_hora_salida);
    const eta_llegada_iso = alerta_autonomia
      ? null
      : new Date(salida.getTime() + eta_horas * 3600 * 1000).toISOString();

    return {
      resumen: {
        distancia_total_mn: round2(distancia_total_mn),
        eta_horas: round2(eta_horas),
        eta_llegada_iso,
        consumo_total_litros: round2(consumo_total_litros),
        STW_knots: round2(STW),
        SOG_promedio_knots: eta_horas > 0 ? round2(distancia_total_mn / eta_horas) : 0,
        alerta_autonomia,
      },
      segmentos: segmentosCalculados.map(({ alerta, ...resto }) => resto),
    };
  }

  calcularSegmento(segmento, { STW, Kw, CH_real, fuente }) {
    const { desde, hasta, U_viento, V_viento, U_corriente, V_corriente } = segmento;

    const distancia_mn = distanciaHaversineNM(desde, hasta);
    const derrotaGrados = derrota(desde, hasta);

    const dx = U_viento * Kw + U_corriente;
    const dy = V_viento * Kw + V_corriente;
    const V_deriva = Math.sqrt(dx ** 2 + dy ** 2);
    const direccionDeriva = (toDeg(Math.atan2(dx, dy)) + 360) % 360;

    const alphaRad = toRad(derrotaGrados - direccionDeriva);
    const discriminante = STW ** 2 - (V_deriva * Math.sin(alphaRad)) ** 2;

    let SOG_knots = 0;
    let alerta = false;
    if (discriminante < 0) {
      alerta = true;
    } else {
      SOG_knots = V_deriva * Math.cos(alphaRad) + Math.sqrt(discriminante);
    }

    const tiempo_horas = SOG_knots > 0 ? distancia_mn / SOG_knots : null;
    const consumo_litros = tiempo_horas !== null ? CH_real * tiempo_horas : null;

    return {
      desde,
      hasta,
      distancia_mn: round2(distancia_mn),
      SOG_knots: round2(SOG_knots),
      tiempo_horas: tiempo_horas !== null ? round2(tiempo_horas) : null,
      consumo_litros: consumo_litros !== null ? round2(consumo_litros) : null,
      fuente_oceanica: fuente,
      alerta,
    };
  }
}

module.exports = NavigationCalculator;
