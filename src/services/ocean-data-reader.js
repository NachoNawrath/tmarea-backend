const axios = require('axios');

// La API real de Open-Meteo no expone wind_u_10m/wind_v_10m/ocean_current_u/
// ocean_current_v en /v1/marine (devuelve 400 "Data corrupted"). Verificado
// contra la API en vivo: /v1/marine solo da ocean_current_velocity (km/h) +
// ocean_current_direction (°); el viento en componentes U/V (m/s) existe pero
// en el endpoint de pronóstico general /v1/forecast, como
// wind_u_component_10m / wind_v_component_10m con wind_speed_unit=ms. Por eso
// se consultan ambos endpoints y la corriente se descompone U/V aquí mismo.
const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_TIMEOUT_MS = 10000;
const FORECAST_DAYS = 2;
const KMH_A_MS = 1 / 3.6;

const IFOP_URL = 'http://modelo.ifop.cl/chonos/api/currents';
const IFOP_TIMEOUT_MS = 3000;

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 horas
const LAT_THRESHOLD_IFOP = -41.5;
const BBOX_MARGIN_DEG = 0.5;
const BBOX_ROUNDING_DEG = 0.5;

const EARTH_RADIUS_NM = 3440.065;

const ATRIBUCION =
  'Weather data by Open-Meteo.com (CC BY 4.0). Corrientes zona sur por IFOP/Chonos cuando disponible.';

// Cache en memoria simple, misma estrategia que sitport-service.js.
const cache = new Map();

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function calcularBoundingBox(ruta_puntos) {
  const lats = ruta_puntos.map((p) => p.lat);
  const lons = ruta_puntos.map((p) => p.lon);
  return {
    minLat: roundTo(Math.min(...lats) - BBOX_MARGIN_DEG, BBOX_ROUNDING_DEG),
    maxLat: roundTo(Math.max(...lats) + BBOX_MARGIN_DEG, BBOX_ROUNDING_DEG),
    minLon: roundTo(Math.min(...lons) - BBOX_MARGIN_DEG, BBOX_ROUNDING_DEG),
    maxLon: roundTo(Math.max(...lons) + BBOX_MARGIN_DEG, BBOX_ROUNDING_DEG),
  };
}

function truncarAHora(fecha) {
  const d = new Date(fecha);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString().slice(0, 13); // "2026-07-10T09"
}

function claveCache(bbox, fecha, modo, velocidadKn) {
  return `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}_${truncarAHora(fecha)}_${modo}_${Math.round(velocidadKn)}kn`;
}

function parseUTC(isoStr) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(isoStr) ? isoStr : `${isoStr}Z`);
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
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

class OceanDataUnavailableError extends Error {}

class OceanDataReader {
  usaIFOP(ruta_puntos) {
    return ruta_puntos.some((p) => p.lat < LAT_THRESHOLD_IFOP);
  }

  async consultarOpenMeteo(bbox) {
    const lat_centro = (bbox.minLat + bbox.maxLat) / 2;
    const lon_centro = (bbox.minLon + bbox.maxLon) / 2;

    const [marino, viento] = await Promise.all([
      axios.get(OPEN_METEO_MARINE_URL, {
        params: {
          latitude: lat_centro,
          longitude: lon_centro,
          hourly: 'ocean_current_velocity,ocean_current_direction',
          forecast_days: FORECAST_DAYS,
          timezone: 'UTC',
        },
        timeout: OPEN_METEO_TIMEOUT_MS,
      }),
      axios.get(OPEN_METEO_FORECAST_URL, {
        params: {
          latitude: lat_centro,
          longitude: lon_centro,
          hourly: 'wind_u_component_10m,wind_v_component_10m',
          wind_speed_unit: 'ms',
          forecast_days: FORECAST_DAYS,
          timezone: 'UTC',
        },
        timeout: OPEN_METEO_TIMEOUT_MS,
      }),
    ]);

    return { marino: marino.data, viento: viento.data };
  }

  async consultarIFOP(lat, lon, fechaIso) {
    const response = await axios.get(IFOP_URL, {
      params: { lat, lon, fecha: fechaIso },
      timeout: IFOP_TIMEOUT_MS,
    });
    return response.data;
  }

  // Interpolación lineal de un componente U/V de la grilla horaria de
  // Open-Meteo en un instante arbitrario (no necesariamente alineado a la hora).
  interpolarValor(tiemposHoras, valores, horasObjetivo) {
    const ultimo = tiemposHoras.length - 1;
    if (horasObjetivo <= tiemposHoras[0]) return valores[0];
    if (horasObjetivo >= tiemposHoras[ultimo]) return valores[ultimo];

    let i = 0;
    while (i < ultimo && tiemposHoras[i + 1] < horasObjetivo) i++;
    const t0 = tiemposHoras[i];
    const t1 = tiemposHoras[i + 1];
    const v0 = valores[i];
    const v1 = valores[i + 1];
    const frac = (horasObjetivo - t0) / (t1 - t0);
    return v0 + (v1 - v0) * frac;
  }

  // Convierte un array paralelo de {time, velocidad_kmh, direccion_grados} en
  // ejes horarios + arrays U/V ya descompuestos. Descomponer en la grilla
  // (antes de interpolar) evita el problema de interpolar linealmente un
  // ángulo que cruza 0°/360°.
  construirEjeYComponentesCorriente(horarioMarino) {
    const inicioGrilla = parseUTC(horarioMarino.time[0]).getTime();
    const tiemposHoras = horarioMarino.time.map(
      (t) => (parseUTC(t).getTime() - inicioGrilla) / 3600000
    );
    const U = horarioMarino.ocean_current_velocity.map((velKmh, i) => {
      const velMs = velKmh * KMH_A_MS;
      const dirRad = toRad(horarioMarino.ocean_current_direction[i]);
      return velMs * Math.sin(dirRad);
    });
    const V = horarioMarino.ocean_current_velocity.map((velKmh, i) => {
      const velMs = velKmh * KMH_A_MS;
      const dirRad = toRad(horarioMarino.ocean_current_direction[i]);
      return velMs * Math.cos(dirRad);
    });
    return { tiemposHoras, U, V, inicioGrilla };
  }

  construirEjeHoras(time) {
    const inicioGrilla = parseUTC(time[0]).getTime();
    const tiemposHoras = time.map((t) => (parseUTC(t).getTime() - inicioGrilla) / 3600000);
    return { tiemposHoras, inicioGrilla };
  }

  // velocidadReferenciaKn es la velocidad_crucero_nominal real de la
  // embarcación (provista por el llamador), usada para estimar en qué punto
  // de la grilla horaria de Open-Meteo cae cada segmento. Es una aproximación
  // razonable —el STW real difiere por carga y deriva, que calculan
  // ShipPhysics/NavigationCalculator más adelante— pero ya no es un valor
  // fijo arbitrario: refleja la embarcación real de cada solicitud.
  construirVectoresOpenMeteo(datosOpenMeteo, fechaSalida, ruta_puntos, velocidadReferenciaKn) {
    const horarioViento = datosOpenMeteo.viento.hourly;
    const horarioMarino = datosOpenMeteo.marino.hourly;

    const { tiemposHoras: tiemposViento, inicioGrilla: inicioViento } = this.construirEjeHoras(
      horarioViento.time
    );
    const {
      tiemposHoras: tiemposMarino,
      U: gridUCorriente,
      V: gridVCorriente,
      inicioGrilla: inicioMarino,
    } = this.construirEjeYComponentesCorriente(horarioMarino);

    const offsetSalidaViento = (parseUTC(fechaSalida).getTime() - inicioViento) / 3600000;
    const offsetSalidaMarino = (parseUTC(fechaSalida).getTime() - inicioMarino) / 3600000;

    let acumuladoNM = 0;
    const segmentos = [];
    for (let i = 0; i < ruta_puntos.length - 1; i++) {
      const desde = ruta_puntos[i];
      const hasta = ruta_puntos[i + 1];
      const distanciaSegmentoNM = distanciaHaversineNM(desde, hasta);
      const duracionEstimadaHoras = distanciaSegmentoNM / velocidadReferenciaKn;
      const horasNavegadas =
        acumuladoNM / velocidadReferenciaKn + duracionEstimadaHoras / 2;
      // Punto medio temporal del segmento: para segmentos cortos (<1h) esto
      // equivale a "usar la hora más cercana"; para segmentos más largos,
      // interpolarValor mezcla los dos puntos horarios que rodean ese
      // instante, cumpliendo la interpolación lineal pedida.
      const horaObjetivoViento = offsetSalidaViento + horasNavegadas;
      const horaObjetivoMarino = offsetSalidaMarino + horasNavegadas;

      segmentos.push({
        desde,
        hasta,
        U_viento: round2(
          this.interpolarValor(tiemposViento, horarioViento.wind_u_component_10m, horaObjetivoViento)
        ),
        V_viento: round2(
          this.interpolarValor(tiemposViento, horarioViento.wind_v_component_10m, horaObjetivoViento)
        ),
        U_corriente: round2(this.interpolarValor(tiemposMarino, gridUCorriente, horaObjetivoMarino)),
        V_corriente: round2(this.interpolarValor(tiemposMarino, gridVCorriente, horaObjetivoMarino)),
      });

      acumuladoNM += distanciaSegmentoNM;
    }
    return segmentos;
  }

  // IFOP/Chonos modela solo corrientes ("chonos/api/currents"); el viento
  // sigue viniendo de Open-Meteo incluso cuando IFOP responde bien. Se intenta
  // solo en los segmentos que tocan la zona sur (lat < -41.5).
  async aplicarIFOP(segmentos, fechaSalida) {
    let ifopUsado = false;
    let fallbackUsado = false;

    const resultado = await Promise.all(
      segmentos.map(async (segmento) => {
        const requiereIFOP =
          segmento.desde.lat < LAT_THRESHOLD_IFOP || segmento.hasta.lat < LAT_THRESHOLD_IFOP;
        if (!requiereIFOP) return segmento;

        try {
          const datosIFOP = await this.consultarIFOP(
            segmento.desde.lat,
            segmento.desde.lon,
            fechaSalida
          );
          const u = Number(datosIFOP?.u_corriente);
          const v = Number(datosIFOP?.v_corriente);
          ifopUsado = true;
          return {
            ...segmento,
            U_corriente: Number.isFinite(u) ? round2(u) : segmento.U_corriente,
            V_corriente: Number.isFinite(v) ? round2(v) : segmento.V_corriente,
          };
        } catch (error) {
          console.warn('[OCEAN] IFOP falló para segmento, uso Open-Meteo:', error.message);
          fallbackUsado = true;
          return segmento;
        }
      })
    );

    return { segmentos: resultado, ifopUsado, fallbackUsado };
  }

  async obtenerDatos(ruta_puntos, fecha, velocidadCruceroNominal) {
    const bbox = calcularBoundingBox(ruta_puntos);
    const modo = this.usaIFOP(ruta_puntos) ? 'IFOP' : 'OpenMeteo';
    const cacheKey = claveCache(bbox, fecha, modo, velocidadCruceroNominal);

    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('[OCEAN] usando cache para', cacheKey);
      return cached;
    }

    let datosOpenMeteo;
    try {
      datosOpenMeteo = await this.consultarOpenMeteo(bbox);
    } catch (error) {
      throw new OceanDataUnavailableError(`Open-Meteo falló: ${error.message}`);
    }

    let segmentos = this.construirVectoresOpenMeteo(
      datosOpenMeteo,
      fecha,
      ruta_puntos,
      velocidadCruceroNominal
    );
    let fuente = 'OpenMeteo';

    if (modo === 'IFOP') {
      const { segmentos: segmentosConIFOP, ifopUsado, fallbackUsado } = await this.aplicarIFOP(
        segmentos,
        fecha
      );
      segmentos = segmentosConIFOP;
      fuente = fallbackUsado ? 'IFOP_fallback_OpenMeteo' : ifopUsado ? 'IFOP' : 'OpenMeteo';
    }

    const resultado = {
      fuente,
      timestamp: new Date().toISOString(),
      segmentos,
      atribucion: ATRIBUCION,
    };

    setCache(cacheKey, resultado);
    return resultado;
  }
}

module.exports = { OceanDataReader, OceanDataUnavailableError };
