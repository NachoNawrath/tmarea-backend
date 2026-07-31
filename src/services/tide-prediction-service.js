'use strict';

const fs = require('fs');
const path = require('path');
const { astro, constituentArgument } = require('./tide-astronomy');

const CONSTANTS_PATH = path.join(__dirname, 'data', 'tidal-constants.json');
const MAX_STATION_DISTANCE_NM = 50;
const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_NM = 1.852;

// El JSON de constantes se carga una sola vez al iniciar el servidor -- no
// se relee en cada request.
let tidalData = null;
try {
  tidalData = JSON.parse(fs.readFileSync(CONSTANTS_PATH, 'utf8'));
} catch (err) {
  console.error(`[tide-prediction-service] no se pudo cargar ${CONSTANTS_PATH}: ${err.message}`);
  tidalData = { generated: null, stations: [] };
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineNm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (EARTH_RADIUS_KM * c) / KM_PER_NM;
}

/**
 * Estación con constantes armónicas más cercana a (lat, lon). No interpola
 * entre estaciones -- en canales interiores la interpolación produce
 * resultados incorrectos (dos puntos cercanos en línea recta pueden estar
 * en cuerpos de agua con regímenes de marea muy distintos).
 * Devuelve null si la más cercana está a más de 50 millas náuticas.
 */
function findNearestStation(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const st of tidalData.stations) {
    const d = haversineNm(lat, lon, st.lat, st.lon);
    if (d < bestDist) {
      bestDist = d;
      best = st;
    }
  }
  if (!best || bestDist > MAX_STATION_DISTANCE_NM) return null;
  return { station: best, distanceNm: bestDist };
}

function noStationResult(lat, lon) {
  return {
    error: 'NO_STATION_WITHIN_RANGE',
    message:
      'No hay datos de marea disponibles: la estación de constantes armónicas más cercana ' +
      `a (${lat.toFixed(4)}, ${lon.toFixed(4)}) está a más de ${MAX_STATION_DISTANCE_NM} millas náuticas.`,
  };
}

/**
 * Altura de marea en el instante `date` para la estación dada, según la
 * fórmula del Admiralty Method:
 *   h(t) = Z0 + Sum[ Ai * fi(t) * cos( Vi(t) + ui(t) - phi_i ) ]
 * Vi(t), fi(t), ui(t) se recalculan en la fecha exacta (ver tide-astronomy.js).
 */
function heightAt(station, date) {
  const a = astro(date);
  let h = station.z0_mm / 1000;
  for (const c of station.constituents) {
    const { V, f, u } = constituentArgument(c.name, a);
    const argDeg = V + u - c.phase_deg;
    h += (c.amplitude_mm / 1000) * f * Math.cos(argDeg * (Math.PI / 180));
  }
  return h;
}

function parseDate(datetime) {
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  if (Number.isNaN(d.getTime())) throw new Error(`fecha inválida: ${datetime}`);
  return d;
}

/**
 * predictTide(lat, lon, datetime) -> { height_m, trend, station_used, distance_nm }
 * o { error, message } si no hay estación a menos de 50mn.
 */
function predictTide(lat, lon, datetime) {
  const found = findNearestStation(lat, lon);
  if (!found) return noStationResult(lat, lon);
  const { station, distanceNm } = found;

  const t = parseDate(datetime);
  const dtMs = 60 * 1000; // 1 minuto, para estimar la tendencia por diferencia central
  const hNow = heightAt(station, t);
  const hLater = heightAt(station, new Date(t.getTime() + dtMs));

  return {
    height_m: Math.round(hNow * 1000) / 1000,
    trend: hLater >= hNow ? 'subiendo' : 'bajando',
    station_used: station.id,
    distance_nm: Math.round(distanceNm * 10) / 10,
    disclaimer:
      'Predicción basada en análisis armónico. No reemplaza la información oficial del SHOA. Uso informativo.',
  };
}

/**
 * nextHighLow(lat, lon, from_datetime) -> { next_high, next_low, station_used, distance_nm }
 * Muestrea la curva minuto a minuto en una ventana de 30h (más larga que
 * cualquier ciclo semidiurno+margen) y detecta el primer máximo/mínimo
 * local posteriores a from_datetime.
 */
function nextHighLow(lat, lon, fromDatetime) {
  const found = findNearestStation(lat, lon);
  if (!found) return noStationResult(lat, lon);
  const { station, distanceNm } = found;

  const from = parseDate(fromDatetime);
  const stepMin = 1;
  const windowHours = 30;
  const n = Math.ceil((windowHours * 60) / stepMin);

  const series = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const t = new Date(from.getTime() + i * stepMin * 60 * 1000);
    series[i] = { t, h: heightAt(station, t) };
  }

  let nextHigh = null;
  let nextLow = null;
  for (let i = 1; i < series.length - 1; i++) {
    const { t, h } = series[i];
    const prev = series[i - 1].h;
    const next = series[i + 1].h;
    if (!nextHigh && h >= prev && h >= next && h > prev) {
      nextHigh = { time: t.toISOString(), height_m: Math.round(h * 1000) / 1000 };
    }
    if (!nextLow && h <= prev && h <= next && h < prev) {
      nextLow = { time: t.toISOString(), height_m: Math.round(h * 1000) / 1000 };
    }
    if (nextHigh && nextLow) break;
  }

  return {
    next_high: nextHigh,
    next_low: nextLow,
    station_used: station.id,
    distance_nm: Math.round(distanceNm * 10) / 10,
    disclaimer:
      'Predicción basada en análisis armónico. No reemplaza la información oficial del SHOA. Uso informativo.',
  };
}

/**
 * tideCurve(lat, lon, from_datetime, hours, stepMinutes=10) -> { station_used, distance_nm, points: [...] }
 */
function tideCurve(lat, lon, fromDatetime, hours, stepMinutes = 10) {
  const found = findNearestStation(lat, lon);
  if (!found) return noStationResult(lat, lon);
  const { station, distanceNm } = found;

  const from = parseDate(fromDatetime);
  const n = Math.floor((hours * 60) / stepMinutes);
  const points = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const t = new Date(from.getTime() + i * stepMinutes * 60 * 1000);
    points[i] = { time: t.toISOString(), height_m: Math.round(heightAt(station, t) * 1000) / 1000 };
  }

  return {
    station_used: station.id,
    distance_nm: Math.round(distanceNm * 10) / 10,
    points,
    disclaimer:
      'Predicción basada en análisis armónico. No reemplaza la información oficial del SHOA. Uso informativo.',
  };
}

/**
 * tideCurveRuta(rutaPuntos, horaZarpe, velocidadNudos) — curva de marea a lo
 * largo de una ruta. Para cada punto de la ruta busca la estación más cercana
 * (mismo criterio de 50mn que predict/curve, SIN interpolar entre estaciones),
 * deduplica estaciones consecutivas repetidas y calcula la hora estimada de
 * paso por cada zona según la distancia acumulada y la velocidad de la nave.
 *
 * Para cada estación de la ruta genera la curva desde horaZarpe cubriendo TODA
 * la ventana del viaje — todas las curvas comparten la MISMA ventana temporal
 * para que el eje X del gráfico compuesto alinee (Puerto Montt M2=1876mm y
 * Ancud M2=665mm se ven a la misma escala, que es justo el punto de mostrarlas
 * juntas).
 *
 * La ventana es de `hours` horas (24 por defecto), pero se EXTIENDE si el viaje
 * dura más: window = max(24h, duración_viaje + colita). Sin esto, en un viaje
 * de ~24h la estación de recalada llegaba casi al borde de la ventana y su
 * curva quedaba vacía/cortada en el gráfico. La colita (WINDOW_TAIL_H) además
 * garantiza que la zona de recalada tenga un tramo visible después de la hora
 * de llegada. Se topa en WINDOW_MAX_H para no generar curvas absurdas si la
 * velocidad es muy baja.
 *
 * Puntos sin estación a menos de 50mn (p.ej. el agujero de Quellón, sin
 * mareógrafo) simplemente no aportan estación: no se interpola sobre ellos.
 * `lastStationId` NO se reinicia en esos huecos, para que un tramo sin datos
 * seguido de la MISMA estación no genere una entrada duplicada en la leyenda.
 *
 * -> { estaciones_ruta: [ { station_id, nombre, lat, lng,
 *        hora_estimada_paso, distancia_mn_desde_zarpe, distancia_estacion_mn,
 *        precision_reducida, curva: [{time, height_m}] } ],
 *      hora_recalada_estimada, ventana_horas, disclaimer }
 */
const WINDOW_TAIL_H = 3;   // horas de curva visible tras llegar a recalada
const WINDOW_MAX_H = 72;   // tope de ventana (evita curvas absurdas a baja velocidad)

function tideCurveRuta(rutaPuntos, horaZarpe, velocidadNudos, { hours = 24, stepMinutes = 10 } = {}) {
  const zarpe = parseDate(horaZarpe);
  const lonOf = (p) => (p.lng != null ? p.lng : p.lon);

  // Pre-pase: distancia total de la ruta para dimensionar la ventana temporal
  // de forma que cubra el viaje completo + la colita de recalada.
  let totalNm = 0;
  for (let i = 1; i < rutaPuntos.length; i++) {
    const prev = rutaPuntos[i - 1];
    const cur = rutaPuntos[i];
    totalNm += haversineNm(prev.lat, lonOf(prev), cur.lat, lonOf(cur));
  }
  const tripHours = velocidadNudos > 0 ? totalNm / velocidadNudos : 0;
  const windowHours = Math.min(WINDOW_MAX_H, Math.max(hours, Math.ceil(tripHours) + WINDOW_TAIL_H));

  const estaciones = [];
  let lastStationId = null;
  let cumNm = 0;

  const n = Math.floor((windowHours * 60) / stepMinutes);

  for (let i = 0; i < rutaPuntos.length; i++) {
    const p = rutaPuntos[i];
    if (i > 0) {
      const prev = rutaPuntos[i - 1];
      cumNm += haversineNm(prev.lat, lonOf(prev), p.lat, lonOf(p));
    }

    const found = findNearestStation(p.lat, lonOf(p));
    if (!found) continue; // hueco (sin estación a <=50mn): no se interpola
    if (found.station.id === lastStationId) continue; // dedup consecutivo
    lastStationId = found.station.id;

    const { station, distanceNm } = found;
    const curva = new Array(n + 1);
    for (let k = 0; k <= n; k++) {
      const t = new Date(zarpe.getTime() + k * stepMinutes * 60 * 1000);
      curva[k] = { time: t.toISOString(), height_m: Math.round(heightAt(station, t) * 1000) / 1000 };
    }

    const horaPasoMs = zarpe.getTime() + (cumNm / velocidadNudos) * 3600 * 1000;

    estaciones.push({
      station_id: station.id,
      nombre: station.name,
      lat: station.lat,
      lng: station.lon,
      hora_estimada_paso: new Date(horaPasoMs).toISOString(),
      distancia_mn_desde_zarpe: Math.round(cumNm * 10) / 10,
      distancia_estacion_mn: Math.round(distanceNm * 10) / 10,
      // 30–50mn: la estación cubre el tramo pero con menor precisión (regla P4).
      precision_reducida: distanceNm >= 30,
      curva,
    });
  }

  return {
    estaciones_ruta: estaciones,
    hora_recalada_estimada: new Date(zarpe.getTime() + tripHours * 3600 * 1000).toISOString(),
    ventana_horas: windowHours,
    disclaimer:
      'Predicción basada en análisis armónico. No reemplaza la información oficial del SHOA. Uso informativo.',
  };
}

function listStations() {
  return tidalData.stations.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    source: s.source,
    years_used: s.years_used,
  }));
}

function getHealthInfo() {
  const counts = tidalData.stations.map((s) => s.constituents.length);
  return {
    stations_loaded: tidalData.stations.length,
    constituents_per_station: {
      min: counts.length ? Math.min(...counts) : 0,
      max: counts.length ? Math.max(...counts) : 0,
    },
    generated: tidalData.generated,
  };
}

module.exports = {
  predictTide,
  nextHighLow,
  tideCurve,
  tideCurveRuta,
  listStations,
  getHealthInfo,
  findNearestStation,
  heightAt,
  parseDate,
  MAX_STATION_DISTANCE_NM,
};
