const axios = require('axios');

const BASE_URL = 'https://orion.directemar.cl/sitport/back/users';
const TIMEOUT_MS = 10000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

// Cache en memoria simple: Map<key, {data, timestamp}>.
// Redis está pendiente de configurar (ver contexto del proyecto); un Map
// alcanza para 3 endpoints de bajo tráfico y evita sumar infraestructura
// antes de que Redis esté realmente disponible.
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

function normalizeError(error, contexto) {
  if (error.code === 'ECONNABORTED') {
    return new Error(`[SITPORT] Timeout consultando ${contexto}`);
  }
  if (error.response) {
    return new Error(`[SITPORT] ${contexto} respondió ${error.response.status}`);
  }
  if (error.request) {
    return new Error(`[SITPORT] Sin respuesta de red consultando ${contexto}`);
  }
  return new Error(`[SITPORT] Error consultando ${contexto}: ${error.message}`);
}

// consultaRestricciones y consultaBahias devuelven { recordsets: [[...]] }
// (formato del driver SQL Server de DIRECTEMAR), no un array plano.
// Totalpronostico sí devuelve el array directo.
function unwrapRecordset(responseData) {
  if (responseData && Array.isArray(responseData.recordsets)) {
    return responseData.recordsets[0] || [];
  }
  return responseData;
}

async function consultaRestricciones() {
  const cacheKey = 'restricciones';
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SITPORT] consultaRestricciones: usando cache');
    return cached;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/consultaRestricciones`,
      {},
      { timeout: TIMEOUT_MS }
    );
    const data = unwrapRecordset(response.data);
    setCache(cacheKey, data);
    console.log(`[SITPORT] consultaRestricciones: ${data.length} registros obtenidos`);
    return data;
  } catch (error) {
    throw normalizeError(error, 'consultaRestricciones');
  }
}

async function consultaBahias() {
  const cacheKey = 'bahias';
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SITPORT] consultaBahias: usando cache');
    return cached;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/consultaBahias`,
      {},
      { timeout: TIMEOUT_MS }
    );
    const data = unwrapRecordset(response.data);
    setCache(cacheKey, data);
    console.log(`[SITPORT] consultaBahias: ${data.length} registros obtenidos`);
    return data;
  } catch (error) {
    throw normalizeError(error, 'consultaBahias');
  }
}

async function totalPronostico() {
  const cacheKey = 'pronostico';
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[SITPORT] totalPronostico: usando cache');
    return cached;
  }

  try {
    const response = await axios.get(`${BASE_URL}/Totalpronostico`, {
      timeout: TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        Referer: 'https://orion.directemar.cl/sitport/',
      },
    });
    setCache(cacheKey, response.data);
    console.log(`[SITPORT] totalPronostico: ${response.data.length} registros obtenidos`);
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'totalPronostico');
  }
}

module.exports = {
  consultaRestricciones,
  consultaBahias,
  totalPronostico,
};
