const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
//  Constantes
// ─────────────────────────────────────────────
const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS      = 20;
const MAX_RADIUS_KM    = 200;
const DEFAULT_RADIUS_KM = 50;
const EARTH_RADIUS_KM  = 6371;
const SAFE_QUERY_REGEX = /^[\p{L}\p{N}\s\-\.]+$/u;

const DATA_FILE = path.join(__dirname, 'data', 'concesiones_acuicolas_nacional.json');

// ─────────────────────────────────────────────
//  Estado interno
// ─────────────────────────────────────────────
let concesiones = [];
let loaded      = false;
let loadError   = null;
let loadedAt    = null;

// ─────────────────────────────────────────────
//  Utilidades
// ─────────────────────────────────────────────
function normalize(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────
//  Carga del dataset
// ─────────────────────────────────────────────
function loadMitilidos() {
  if (loaded) return;
  try {
    const raw  = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    concesiones = data.features || [];
    loaded    = true;
    loadError = null;
    loadedAt  = new Date().toISOString();
    console.log(`[concesiones] ${concesiones.length} concesiones acuícolas cargadas`);
  } catch (err) {
    loadError = err;
    concesiones = [];
    console.error('[concesiones] Error cargando dataset:', err.message);
  }
}

function ensureLoaded() {
  if (!loaded) loadMitilidos();
}

// ─────────────────────────────────────────────
//  Funciones de consulta
// ─────────────────────────────────────────────

/**
 * Búsqueda general por texto (titular, especies, ubicacion_nombre, comuna)
 * Filtros opcionales: grupo, comuna, region
 */
function search(query = '', { grupo, comuna, region, limit = MAX_RESULTS } = {}) {
  ensureLoaded();
  if (query.length > MAX_QUERY_LENGTH) throw new Error('Query demasiado larga');
  if (query && !SAFE_QUERY_REGEX.test(query)) throw new Error('Caracteres no permitidos');

  const q = normalize(query);

  return concesiones
    .filter(c => {
      if (grupo  && normalize(c.grupo)  !== normalize(grupo))  return false;
      if (comuna && normalize(c.comuna) !== normalize(comuna)) return false;
      if (region && !normalize(c.region).includes(normalize(region))) return false;
      if (!q) return true;
      return (
        String(c.codigo_centro).includes(q)      ||
        normalize(c.titular).includes(q)         ||
        normalize(c.especies).includes(q)        ||
        normalize(c.ubicacion_nombre).includes(q)||
        normalize(c.comuna).includes(q)
      );
    })
    .slice(0, limit);
}

/**
 * Búsqueda por proximidad — devuelve concesiones dentro de radiusKm
 * Filtro opcional por grupo
 */
function buscarPorProximidad(lat, lng, radiusKm = DEFAULT_RADIUS_KM, { grupo } = {}) {
  ensureLoaded();
  if (isNaN(lat) || isNaN(lng)) throw new Error('Coordenadas inválidas');
  const r = Math.min(Number(radiusKm), MAX_RADIUS_KM);

  return concesiones
    .filter(c => {
      if (!c.lat || !c.lng) return false;
      if (grupo && normalize(c.grupo) !== normalize(grupo)) return false;
      return haversineKm(lat, lng, c.lat, c.lng) <= r;
    })
    .map(c => ({
      ...c,
      distancia_km: Math.round(haversineKm(lat, lng, c.lat, c.lng) * 10) / 10
    }))
    .sort((a, b) => a.distancia_km - b.distancia_km);
}

/**
 * Búsqueda por código de centro
 */
function buscarPorCodigo(codigo) {
  ensureLoaded();
  const cod = Number(codigo);
  return concesiones.filter(c => c.codigo_centro === cod);
}

/**
 * Búsqueda por grupo de especies (MOLUSCOS, SALMONES, ALGAS, PECES, ABALONES o EQUINODERMOS)
 */
function buscarPorGrupo(grupo, { limit = MAX_RESULTS } = {}) {
  ensureLoaded();
  const g = normalize(grupo);
  return concesiones
    .filter(c => normalize(c.grupo) === g)
    .slice(0, limit);
}

/**
 * Todos los grupos disponibles con conteo
 */
function getGrupos() {
  ensureLoaded();
  const grupos = {};
  for (const c of concesiones) {
    if (c.grupo) grupos[c.grupo] = (grupos[c.grupo] || 0) + 1;
  }
  return grupos;
}

/**
 * Estadísticas generales
 */
function obtenerEstadisticas() {
  ensureLoaded();
  const regiones = {}, comunas = {}, grupos = {}, especies = {}, estados = {};
  for (const c of concesiones) {
    if (c.region)        regiones[c.region]        = (regiones[c.region]        || 0) + 1;
    if (c.comuna)        comunas[c.comuna]         = (comunas[c.comuna]         || 0) + 1;
    if (c.grupo)         grupos[c.grupo]           = (grupos[c.grupo]           || 0) + 1;
    if (c.estado_tramite) estados[c.estado_tramite] = (estados[c.estado_tramite] || 0) + 1;
    if (c.especies) {
      for (const esp of c.especies.split(',')) {
        const e = esp.trim().toUpperCase();
        if (e) especies[e] = (especies[e] || 0) + 1;
      }
    }
  }
  return { total_concesiones: concesiones.length, loaded_at: loadedAt, regiones, comunas, grupos, especies, estados_tramite: estados };
}

function getStatus() {
  return { loaded, total: concesiones.length, loaded_at: loadedAt, error: loadError?.message || null };
}

// ─────────────────────────────────────────────
//  Exports
// ─────────────────────────────────────────────
module.exports = {
  loadMitilidos,
  search,
  buscarPorProximidad,
  buscarPorCodigo,
  buscarPorGrupo,
  getGrupos,
  obtenerEstadisticas,
  getStatus
};
