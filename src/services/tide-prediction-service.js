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
  listStations,
  getHealthInfo,
  findNearestStation,
  heightAt,
  parseDate,
  MAX_STATION_DISTANCE_NM,
};
