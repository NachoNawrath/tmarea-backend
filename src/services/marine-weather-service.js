/**
 * marine-weather-service.js
 * Análisis ambiental para pesca artesanal.
 * 
 * Fuente de datos: Open-Meteo Marine API (ya integrada en ocean-data-reader.js)
 * Conocimiento de especies: especies_pesca.json (directorio raíz)
 * 
 * Endpoint expuesto: GET /api/marine-weather/analyze
 * Parámetros: lat (float), lng (float), especie_id (int)
 */

const path = require('path');

// ─── Carga de base de conocimiento de especies ───────────────────────────────
let _especiesCache = null;

function cargarEspecies() {
  if (_especiesCache) return _especiesCache;
  try {
    _especiesCache = require(path.join(process.cwd(), 'especies_pesca.json'));
    console.log(`[marine-weather] ${_especiesCache.length} especies cargadas desde especies_pesca.json`);
    return _especiesCache;
  } catch (err) {
    console.error('[marine-weather] ERROR cargando especies_pesca.json:', err.message);
    throw new Error('No se pudo cargar la base de conocimiento de especies. Verifica que especies_pesca.json esté en el directorio raíz del backend.');
  }
}

// ─── Cliente Open-Meteo Marine ────────────────────────────────────────────────
/**
 * Obtiene SST y clorofila para un punto geográfico.
 * Open-Meteo Marine entrega: wave_height, sea_surface_temperature, wind_wave_height.
 * Clorofila: Open-Meteo no la entrega directamente — se estima desde el contexto
 * oceanográfico (temperatura + zona biogeográfica chilena) como proxy conservador.
 * 
 * NOTA: Cuando Copernicus Marine Service esté integrado, reemplaza _estimarClorofila()
 * por la llamada real al producto OCEANCOLOUR_GLO_BGC_L4_MY.
 */
async function obtenerDatosMarinos(lat, lng) {
  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lng);
  url.searchParams.set('hourly', [
    'sea_surface_temperature',
    'wave_height',
    'wave_direction',
    'wave_period',
    'wind_wave_height',
  ].join(','));
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'America/Santiago');

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo Marine respondió HTTP ${res.status}`);
  }

  const data = await res.json();
  const hourly = data.hourly;

  // Tomamos el valor de la hora más reciente con dato válido
  const now = new Date();
  const horaActual = now.getHours();
  const idx = Math.min(horaActual, (hourly.time?.length ?? 1) - 1);

  const sst = hourly.sea_surface_temperature?.[idx] ?? null;
  const waveHeight = hourly.wave_height?.[idx] ?? null;
  const wavePeriod = hourly.wave_period?.[idx] ?? null;
  const waveDir = hourly.wave_direction?.[idx] ?? null;

  return { sst, waveHeight, wavePeriod, waveDir };
}

/**
 * Proxy conservador de clorofila basado en zona biogeográfica chilena.
 * Reemplazar por Copernicus Marine cuando esté disponible.
 * 
 * Zonificación:
 *  Norte  (lat > -30):          aguas oligotróficas del Pacífico subtropical → clorofila baja
 *  Centro (-30 a -41.5):        zona de surgencia estacional → clorofila media-alta
 *  Sur    (lat < -41.5):        canales y fiordos patagónicos → clorofila variable/alta
 */
function _estimarClorofila(lat) {
  if (lat > -30)   return { valor: 1.2, fuente: 'estimado_zona_norte' };
  if (lat > -41.5) return { valor: 4.5, fuente: 'estimado_zona_centro_surgencia' };
  return              { valor: 3.8, fuente: 'estimado_zona_sur_patagonica' };
}

// ─── Lógica de análisis ───────────────────────────────────────────────────────

/**
 * Evalúa si las condiciones ambientales están dentro del rango óptimo para la especie.
 * Retorna: { condicion_optima, sst_estado, clorofila_estado }
 */
function evaluarCondiciones(especie, sst, clorofila) {
  const sstOk = sst !== null
    ? sst >= especie.temp_min_optima && sst <= especie.temp_max_optima
    : null; // null = sin dato

  const cloroOk = clorofila !== null
    ? clorofila >= especie.clorofila_min_optima && clorofila <= especie.clorofila_max_optima
    : null;

  // condicion_optima: true solo si ambas variables están en rango
  // Si alguna es null, es indeterminado → false (conservador)
  const condicion_optima = sstOk === true && cloroOk === true;

  const sst_estado = sstOk === null ? 'sin_dato'
    : sstOk ? 'optima' : sst < especie.temp_min_optima ? 'baja' : 'alta';

  const clorofila_estado = cloroOk === null ? 'sin_dato'
    : cloroOk ? 'optima' : clorofila < especie.clorofila_min_optima ? 'baja' : 'alta';

  return { condicion_optima, sst_estado, clorofila_estado };
}

/**
 * Alerta de FAN (Floraciones Algales Nocivas).
 * Umbral preventivo: clorofila > 2× el máximo óptimo de la especie.
 */
function evaluarFAN(especie, clorofila) {
  if (clorofila === null) return null;
  const umbral = especie.clorofila_max_optima * 2;
  if (clorofila > umbral) {
    return `⚠ ALERTA FAN PREVENTIVA: concentración de clorofila anormalmente alta (${clorofila.toFixed(2)} mg/m³, umbral: ${umbral.toFixed(1)} mg/m³). Riesgo elevado de Floraciones Algales Nocivas. Consulta la Red de Monitoreo de SERNAPESCA antes de extraer recursos bentónicos o pelágicos en la zona.`;
  }
  return null;
}

/**
 * Función principal del servicio.
 * Retorna el reporte completo para el endpoint.
 */
async function analizar(lat, lng, especieId) {
  const especies = cargarEspecies();
  const especie = especies.find(e => e.id === Number(especieId));
  if (!especie) {
    throw Object.assign(new Error(`Especie con id=${especieId} no encontrada`), { statusCode: 400 });
  }

  // Fetch paralelo de datos marinos
  let datosMarinos;
  let fuenteDatos = 'open-meteo-marine';
  let errorConexion = null;

  try {
    datosMarinos = await obtenerDatosMarinos(lat, lng);
  } catch (err) {
    // Modo degradado: sin SST real, usamos solo el conocimiento de la especie
    console.warn('[marine-weather] Fallo Open-Meteo Marine:', err.message);
    datosMarinos = { sst: null, waveHeight: null, wavePeriod: null, waveDir: null };
    fuenteDatos = 'sin_datos_en_tiempo_real';
    errorConexion = 'No fue posible obtener datos satelitales en este momento. El reporte se basa solo en conocimiento de la especie.';
  }

  const { sst, waveHeight, wavePeriod, waveDir } = datosMarinos;

  // Clorofila (proxy hasta integrar Copernicus)
  const { valor: clorofila, fuente: fuenteClorofila } = _estimarClorofila(lat);

  // Evaluación
  const evaluacion = evaluarCondiciones(especie, sst, clorofila);
  const alertaFAN  = evaluarFAN(especie, clorofila);

  // Consejo dinámico según condición
  const consejo_dinamico = evaluacion.condicion_optima
    ? especie.consejo_productivo_optimo
    : especie.consejo_productivo_adverso;

  return {
    // Identidad
    especie: {
      id:                 especie.id,
      nombre_comun:       especie.especie,
      nombre_cientifico:  especie.nombre_cientifico,
    },

    // Datos ambientales
    sst_actual:        sst,
    sst_rango_optimo:  { min: especie.temp_min_optima, max: especie.temp_max_optima },
    sst_estado:        evaluacion.sst_estado,

    clorofila_actual:  clorofila,
    clorofila_rango:   { min: especie.clorofila_min_optima, max: especie.clorofila_max_optima },
    clorofila_estado:  evaluacion.clorofila_estado,
    clorofila_fuente:  fuenteClorofila,

    // Condiciones de oleaje (bonus — sin costo)
    oleaje: waveHeight !== null ? {
      altura_m:     waveHeight,
      periodo_s:    wavePeriod,
      direccion_deg: waveDir,
    } : null,

    // Veredicto
    condicion_optima:  evaluacion.condicion_optima,
    consejo_dinamico,

    // Alertas
    alerta_FAN:        alertaFAN,

    // Normativa y seguridad (estáticos de la BD de especies)
    normativa_sernapesca:  especie.normativa_sernapesca,
    regulacion_minsal:     especie.regulacion_minsal,
    seguridad_navegacion:  especie.seguridad_navegacion,

    // Metadatos
    punto_analizado:  { lat, lng },
    fuente_datos:     fuenteDatos,
    error_conexion:   errorConexion,
    timestamp:        new Date().toISOString(),
  };
}

module.exports = { analizar };