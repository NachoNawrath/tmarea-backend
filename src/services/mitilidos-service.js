'use strict';

const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
//  Constantes de seguridad
// ─────────────────────────────────────────────
const MAX_QUERY_LENGTH  = 100;   // caracteres
const MAX_RESULTS       = 20;    // resultados por búsqueda
const MAX_RADIUS_KM     = 200;   // radio máximo proximidad
const DEFAULT_RADIUS_KM = 50;
const EARTH_RADIUS_KM   = 6371;

// Caracteres permitidos en queries de texto (letras, números, espacios, guiones)
const SAFE_QUERY_REGEX = /^[\p{L}\p{N}\s\-\.]+$/u;

// ─────────────────────────────────────────────
//  Archivos de datos
// ─────────────────────────────────────────────
const DATA_FILES = [
  'concesiones_mitilidos_loslagos.json',
  'concesiones_mitilidos_araucania.json',
  'concesiones_mitilidos_otras.json'
];

// ─────────────────────────────────────────────
//  Estado interno del servicio
// ─────────────────────────────────────────────
let concesiones = [];   // array plano de objetos normalizados
let loaded      = false;
let loadError   = null;
let loadedAt    = null;

// ─────────────────────────────────────────────
//  Utilidades internas
// ─────────────────────────────────────────────

/**
 * Normaliza un string para comparación:
 * minúsculas + sin tildes + sin caracteres de control
 */
function normalize(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Calcula el centroide de un polígono GeoJSON (anillo exterior).
 * Usa promedio de vértices — suficiente para la precisión requerida.
 */
function centroid(coordinates) {
  try {
    const ring = coordinates[0];
    if (!Array.isArray(ring) || ring.length < 3) return { lat: null, lng: null };
    const n    = ring.length;
    let sumLng = 0, sumLat = 0;
    for (const [lng, lat] of ring) {
      sumLng += lng;
      sumLat += lat;
    }
    return {
      lat: parseFloat((sumLat / n).toFixed(6)),
      lng: parseFloat((sumLng / n).toFixed(6))
    };
  } catch {
    return { lat: null, lng: null };
  }
}

/**
 * Distancia Haversine en km entre dos puntos.
 */
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLon  = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Mapea un feature GeoJSON al objeto plano que usa la app.
 */
function featureToRecord(feature) {
  const p   = feature.properties || {};
  const geo = feature.geometry   || {};
  const { lat, lng } = centroid(geo.coordinates || []);

  return {
    // Identificadores — los campos que usan los patrones
    id:             feature.id   ?? null,
    codigo_centro:  p.codigo_centro  != null ? String(p.codigo_centro).trim() : null,
    n_pertinencia:  p.n_pertinencia  != null ? String(p.n_pertinencia).trim() : null,

    // Quién es el dueño
    titular:        p.titular        ? p.titular.trim()  : null,

    // Qué se cultiva
    especies:       p.especies       ? p.especies.trim() : null,

    // Dónde está
    ubicacion:      p.ubicacion      ? p.ubicacion.trim() : null,
    comuna:         p.comuna         ? p.comuna.trim()    : null,
    region:         p.region         ? p.region.trim()    : null,
    carta_geografica: p.carta_geografica ? p.carta_geografica.trim() : null,

    // Datos administrativos
    superficie_ha:    p.superficie_ha    ?? null,
    estado_tramite:   p.estado_tramite   ? p.estado_tramite.trim() : null,
    resolucion_ssp:   p.resolucion_ssp   != null ? String(p.resolucion_ssp)  : null,
    resolucion_ffaa:  p.resolucion_ffaa  != null ? String(p.resolucion_ffaa) : null,

    // Coordenadas para el mapa
    lat,
    lng,

    // Campos normalizados para búsqueda rápida (no se exponen en la API)
    _n_codigo:      normalize(p.codigo_centro),
    _n_pertinencia: normalize(p.n_pertinencia),
    _n_titular:     normalize(p.titular),
    _n_ubicacion:   normalize(p.ubicacion),
    _n_comuna:      normalize(p.comuna),
    _n_region:      normalize(p.region),
    _n_especies:    normalize(p.especies)
  };
}

/**
 * Elimina los campos internos de búsqueda antes de responder al cliente.
 */
function sanitizeForResponse(record) {
  const {
    _n_codigo, _n_pertinencia, _n_titular,
    _n_ubicacion, _n_comuna, _n_region, _n_especies,
    ...clean
  } = record;
  return clean;
}

/**
 * Valida y limpia un query de texto.
 * Lanza Error con mensaje descriptivo si el input es inválido.
 */
function validateQuery(raw) {
  if (raw === undefined || raw === null) throw new Error('query requerido');
  const q = String(raw).trim();
  if (q.length === 0)             throw new Error('query no puede estar vacío');
  if (q.length > MAX_QUERY_LENGTH) throw new Error(`query excede ${MAX_QUERY_LENGTH} caracteres`);
  if (!SAFE_QUERY_REGEX.test(q))  throw new Error('query contiene caracteres no permitidos');
  return q;
}

/**
 * Valida coordenadas y radio para búsqueda por proximidad.
 */
function validateProximidad(lat, lng, radiusKm) {
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  const r  = radiusKm !== undefined ? parseFloat(radiusKm) : DEFAULT_RADIUS_KM;

  if (isNaN(la) || la < -90  || la > 90)          throw new Error('lat inválida (−90 a 90)');
  if (isNaN(lo) || lo < -180 || lo > 180)          throw new Error('lng inválida (−180 a 180)');
  if (isNaN(r)  || r  <= 0   || r  > MAX_RADIUS_KM) throw new Error(`radio inválido (1–${MAX_RADIUS_KM} km)`);
  return { lat: la, lng: lo, radiusKm: r };
}

// ─────────────────────────────────────────────
//  Carga de datos
// ─────────────────────────────────────────────

function loadMitilidos() {
  if (loaded) return;

  const dataDir = path.join(__dirname, 'data');
  let totalFeatures = 0;
  const errores = [];

  for (const archivo of DATA_FILES) {
    const filePath = path.join(dataDir, archivo);

    if (!fs.existsSync(filePath)) {
      console.warn(`[mitilidos] Archivo no encontrado: ${archivo}`);
      continue;
    }

    let raw, geojson;

    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      errores.push(`Lectura ${archivo}: ${e.message}`);
      continue;
    }

    try {
      geojson = JSON.parse(raw);
    } catch (e) {
      errores.push(`JSON inválido en ${archivo}: ${e.message}`);
      continue;
    }

    if (!geojson || !Array.isArray(geojson.features)) {
      errores.push(`${archivo}: sin array "features"`);
      continue;
    }

    let conteo = 0;
    for (const feature of geojson.features) {
      try {
        concesiones.push(featureToRecord(feature));
        conteo++;
      } catch (e) {
        // Feature corrupto — se omite, no detiene la carga
      }
    }

    totalFeatures += conteo;
    console.log(`[mitilidos] ${archivo}: ${conteo} concesiones cargadas`);
  }

  if (errores.length > 0) {
    console.error('[mitilidos] Errores durante la carga:', errores);
  }

  loaded    = true;
  loadedAt  = new Date().toISOString();
  loadError = errores.length === DATA_FILES.length
    ? new Error('No se pudo cargar ningún archivo de mitílidos')
    : null;

  console.log(`[mitilidos] Total: ${totalFeatures} concesiones listas`);
}

function ensureLoaded() {
  if (!loaded) loadMitilidos();
  if (loadError) throw loadError;
}

// ─────────────────────────────────────────────
//  API pública del servicio
// ─────────────────────────────────────────────

/**
 * Búsqueda unificada — el endpoint principal de P2.
 * Busca por: código centro, n° pertinencia, titular, ubicación, comuna, especie.
 * Prioriza coincidencia exacta en código_centro y n_pertinencia.
 */
function search(rawQuery) {
  ensureLoaded();
  const q = validateQuery(rawQuery);
  const n = normalize(q);

  const exactas   = [];
  const parciales = [];

  for (const c of concesiones) {
    // Coincidencia exacta en identificadores numéricos (prioridad máxima)
    if (c._n_codigo === n || c._n_pertinencia === n) {
      exactas.push(sanitizeForResponse(c));
      continue;
    }
    // Coincidencia parcial en cualquier campo de búsqueda
    if (
      c._n_codigo.includes(n)      ||
      c._n_pertinencia.includes(n) ||
      c._n_titular.includes(n)     ||
      c._n_ubicacion.includes(n)   ||
      c._n_comuna.includes(n)      ||
      c._n_especies.includes(n)
    ) {
      parciales.push(sanitizeForResponse(c));
    }
  }

  const resultados = [...exactas, ...parciales].slice(0, MAX_RESULTS);

  return {
    count:    resultados.length,
    query:    q,
    data:     resultados
  };
}

/**
 * Búsqueda por código de centro RNA/SERNAPESCA.
 * Los patrones lo usan como identificador primario.
 */
function buscarPorCodigo(rawCodigo) {
  ensureLoaded();
  const codigo = validateQuery(rawCodigo);
  const n      = normalize(codigo);

  const resultados = concesiones
    .filter(c => c._n_codigo.includes(n))
    .slice(0, MAX_RESULTS)
    .map(sanitizeForResponse);

  return { count: resultados.length, query: codigo, data: resultados };
}

/**
 * Búsqueda por titular (persona natural o empresa).
 */
function buscarPorTitular(rawTitular) {
  ensureLoaded();
  const titular = validateQuery(rawTitular);
  const n       = normalize(titular);

  const resultados = concesiones
    .filter(c => c._n_titular.includes(n))
    .slice(0, MAX_RESULTS)
    .map(sanitizeForResponse);

  return { count: resultados.length, query: titular, data: resultados };
}

/**
 * Búsqueda por especie (chorito, cholga, choro, ostion, ostra, etc.)
 */
function buscarPorEspecie(rawEspecie) {
  ensureLoaded();
  const especie = validateQuery(rawEspecie);
  const n       = normalize(especie);

  const resultados = concesiones
    .filter(c => c._n_especies.includes(n))
    .slice(0, MAX_RESULTS)
    .map(sanitizeForResponse);

  return { count: resultados.length, query: especie, data: resultados };
}

/**
 * Búsqueda por comuna.
 */
function buscarPorComuna(rawComuna) {
  ensureLoaded();
  const comuna = validateQuery(rawComuna);
  const n      = normalize(comuna);

  const resultados = concesiones
    .filter(c => c._n_comuna.includes(n))
    .slice(0, MAX_RESULTS)
    .map(sanitizeForResponse);

  return { count: resultados.length, query: comuna, data: resultados };
}

/**
 * Búsqueda por región.
 */
function buscarPorRegion(rawRegion) {
  ensureLoaded();
  const region = validateQuery(rawRegion);
  const n      = normalize(region);

  const resultados = concesiones
    .filter(c => c._n_region.includes(n))
    .slice(0, MAX_RESULTS)
    .map(sanitizeForResponse);

  return { count: resultados.length, query: region, data: resultados };
}

/**
 * Búsqueda por proximidad geográfica.
 * Usa centroide del polígono como punto de referencia.
 */
function buscarPorProximidad(rawLat, rawLng, rawRadius) {
  ensureLoaded();
  const { lat, lng, radiusKm } = validateProximidad(rawLat, rawLng, rawRadius);

  const resultados = concesiones
    .filter(c => c.lat !== null && c.lng !== null)
    .map(c => {
      const distancia = haversine(lat, lng, c.lat, c.lng);
      return { ...sanitizeForResponse(c), distancia_km: parseFloat(distancia.toFixed(2)) };
    })
    .filter(c => c.distancia_km <= radiusKm)
    .sort((a, b) => a.distancia_km - b.distancia_km)
    .slice(0, MAX_RESULTS);

  return {
    count:    resultados.length,
    busqueda: { lat, lng, radiusKm },
    data:     resultados
  };
}

/**
 * Estadísticas de la base de datos cargada.
 */
function obtenerEstadisticas() {
  ensureLoaded();

  const regiones  = {};
  const comunas   = {};
  const especies  = {};
  const estados   = {};

  for (const c of concesiones) {
    if (c.region)  regiones[c.region]   = (regiones[c.region]   || 0) + 1;
    if (c.comuna)  comunas[c.comuna]    = (comunas[c.comuna]    || 0) + 1;
    if (c.estado_tramite) estados[c.estado_tramite] = (estados[c.estado_tramite] || 0) + 1;

    if (c.especies) {
      for (const esp of c.especies.split(',')) {
        const e = esp.trim().toUpperCase();
        if (e) especies[e] = (especies[e] || 0) + 1;
      }
    }
  }

  return {
    total_concesiones: concesiones.length,
    loaded_at:         loadedAt,
    regiones,
    comunas,
    especies,
    estados_tramite:   estados
  };
}

/**
 * Health check del servicio.
 */
function getStatus() {
  return {
    loaded,
    total:     concesiones.length,
    loaded_at: loadedAt,
    error:     loadError ? loadError.message : null
  };
}

// ─────────────────────────────────────────────
//  Exports
// ─────────────────────────────────────────────
module.exports = {
  loadMitilidos,
  search,
  buscarPorCodigo,
  buscarPorTitular,
  buscarPorEspecie,
  buscarPorComuna,
  buscarPorRegion,
  buscarPorProximidad,
  obtenerEstadisticas,
  getStatus
};