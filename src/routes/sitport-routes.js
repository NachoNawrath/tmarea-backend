const express = require('express');
const { Pool } = require('pg');
const sitportService = require('../services/sitport-service');
const { buscarFondeadero } = require('../services/fondeadero-service');
const { getCapitaniaByBahiaId } = require('../utils/capitanias');
const { normalizarRestriccion } = require('../services/sitport-parser');
const { evaluarRuta } = require('../services/route-restriction-evaluator');
const router = express.Router();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'mapa_navegacion',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// ─────────────────────────────────────────────────────────────────────────────
// MAPA ESTÁTICO idBahia → coordenadas WGS84
// Fuente: SITPORT/DIRECTEMAR + MOP puertos_chile_nacional + cartografía
// Cubre las 163 bahías del catálogo SITPORT
// ─────────────────────────────────────────────────────────────────────────────
const BAHIA_COORDS = {
  // ── Arica y Parinacota ────────────────────────────────────────────────────
  71:  { lat: -18.4746, lng: -70.3126, nombre: 'Bahía de Arica' },

  // ── Tarapacá ──────────────────────────────────────────────────────────────
  204: { lat: -19.5975, lng: -70.2152, nombre: 'Pisagua' },
  72:  { lat: -20.2133, lng: -70.1503, nombre: 'Bahía de Iquique' },
  195: { lat: -20.7500, lng: -70.2083, nombre: 'Patillo' },
  196: { lat: -20.7833, lng: -70.2167, nombre: 'Borde Costero Norte Patache' },
  73:  { lat: -20.8000, lng: -70.2200, nombre: 'Patache' },
  197: { lat: -20.8167, lng: -70.2167, nombre: 'Borde Costero Sur Patache' },

  // ── Antofagasta ───────────────────────────────────────────────────────────
  236: { lat: -22.0500, lng: -70.1833, nombre: 'Caleta Viuda' },
  74:  { lat: -22.1000, lng: -70.2167, nombre: 'Bahía Algodonales' },
  76:  { lat: -22.7167, lng: -70.2833, nombre: 'Caleta Michilla' },
  75:  { lat: -23.1000, lng: -70.4500, nombre: 'Bahía Mejillones del Sur' },
  77:  { lat: -23.6500, lng: -70.4000, nombre: 'Bahía Moreno (Antofagasta)' },
  78:  { lat: -23.7603, lng: -70.4631, nombre: 'Caleta Coloso' },
  79:  { lat: -25.4089, lng: -70.4911, nombre: 'Tal Tal' },

  // ── Atacama ───────────────────────────────────────────────────────────────
  172: { lat: -26.1414, lng: -70.6621, nombre: 'Bahía Pan de Azúcar' },
  80:  { lat: -26.3500, lng: -70.6333, nombre: 'Bahía Chañaral' },
  81:  { lat: -27.0637, lng: -70.8237, nombre: 'Bahía Caldera' },
  82:  { lat: -27.0833, lng: -70.8500, nombre: 'Bahía Calderilla' },
  83:  { lat: -27.1167, lng: -70.8750, nombre: 'Sector Punta Totoralillo' },
  157: { lat: -28.0797, lng: -71.1486, nombre: 'Puerto Carrizal Bajo' },
  84:  { lat: -28.4609, lng: -71.2241, nombre: 'Bahía Puerto Huasco' },
  158: { lat: -29.0773, lng: -71.4920, nombre: 'Caleta Chañaral y Ensenada Gaviota' },

  // ── Coquimbo ──────────────────────────────────────────────────────────────
  206: { lat: -29.4167, lng: -71.2500, nombre: 'La Higuera' },
  202: { lat: -29.4500, lng: -71.3000, nombre: 'Cruz Grande' },
  85:  { lat: -29.9500, lng: -71.3400, nombre: 'Bahía Coquimbo' },
  86:  { lat: -29.9668, lng: -71.3499, nombre: 'Bahía Herradura de Guayacán' },
  151: { lat: -30.0500, lng: -71.3833, nombre: 'Barnes' },
  150: { lat: -30.1938, lng: -71.4305, nombre: 'Guanaqueros' },
  87:  { lat: -30.2558, lng: -71.4969, nombre: 'Tongoy' },
  88:  { lat: -31.3833, lng: -71.6167, nombre: 'Bahía Conchalí' },
  180: { lat: -32.1362, lng: -71.5298, nombre: 'Bahía Pichidangui' },

  // ── Valparaíso ────────────────────────────────────────────────────────────
  219: { lat: -32.7500, lng: -71.5333, nombre: 'Sector Norte Quintero' },
  91:  { lat: -32.7833, lng: -71.5333, nombre: 'Bahía de Quintero' },
  173: { lat: -32.9188, lng: -71.5179, nombre: 'Bahía Concón' },
  92:  { lat: -33.0333, lng: -71.6333, nombre: 'Bahía de Valparaíso' },
  174: { lat: -33.1930, lng: -71.7009, nombre: 'Bahía Rada Quintay' },
  94:  { lat: -33.3634, lng: -71.6726, nombre: 'Bahía Algarrobo' },
  215: { lat: -33.3949, lng: -71.6972, nombre: 'El Quisco' },
  93:  { lat: -33.5833, lng: -71.6167, nombre: 'Puerto de San Antonio' },
  90:  { lat: -33.6333, lng: -78.8500, nombre: 'Isla Robinson Crusoe' },
  89:  { lat: -27.1167, lng: -109.3500, nombre: 'Isla de Pascua' },

  // ── O'Higgins ─────────────────────────────────────────────────────────────
  96:  { lat: -34.1667, lng: -71.5833, nombre: 'Lago Rapel' },
  95:  { lat: -34.3829, lng: -72.0144, nombre: 'Pichilemu' },

  // ── Maule ─────────────────────────────────────────────────────────────────
  229: { lat: -34.8333, lng: -71.0833, nombre: 'Lago Vichuquén' },
  103: { lat: -35.3325, lng: -72.4060, nombre: 'Bahía Constitución' },

  // ── Biobío / Ñuble ────────────────────────────────────────────────────────
  97:  { lat: -36.7104, lng: -72.9776, nombre: 'Bahía Concepción - Lirquén' },
  98:  { lat: -36.7090, lng: -73.1132, nombre: 'Bahía Concepción - Talcahuano' },
  99:  { lat: -36.7251, lng: -73.1326, nombre: 'Bahía San Vicente' },
  198: { lat: -36.7833, lng: -73.1833, nombre: 'Sector Costero Península de Hualpén' },
  100: { lat: -37.0092, lng: -73.1833, nombre: 'Bahía Coronel' },
  102: { lat: -37.0735, lng: -73.1522, nombre: 'Lota' },
  101: { lat: -37.6015, lng: -73.6548, nombre: 'Lebu' },

  // ── Araucanía ─────────────────────────────────────────────────────────────
  141: { lat: -38.7167, lng: -73.1700, nombre: 'Carahue - Sector Río' },
  142: { lat: -38.7000, lng: -73.1000, nombre: 'Carahue - Sector Lago' },
  143: { lat: -38.7500, lng: -73.4333, nombre: 'Carahue - Borde Costero' },

  // ── Los Ríos ──────────────────────────────────────────────────────────────
  106: { lat: -39.6438, lng: -72.3235, nombre: 'Panguipulli' },
  104: { lat: -39.8136, lng: -73.2487, nombre: 'Valdivia Fluvial' },
  207: { lat: -39.8500, lng: -73.2333, nombre: 'Valdivia Conectividad' },
  208: { lat: -39.7667, lng: -73.3833, nombre: 'Borde Costero - Valdivia' },
  107: { lat: -39.8874, lng: -73.4274, nombre: 'Bahía Corral' },
  170: { lat: -39.9333, lng: -73.5833, nombre: 'Sector Chaihuín' },
  144: { lat: -40.2133, lng: -72.3883, nombre: 'Lago Ranco' },
  145: { lat: -40.2500, lng: -72.0833, nombre: 'Lago Maihue' },
  146: { lat: -40.3333, lng: -72.9667, nombre: 'Río Bueno' },
  248: { lat: -39.8000, lng: -72.3333, nombre: 'Lago Riñihue' },
  249: { lat: -39.8000, lng: -71.9667, nombre: 'Lago Neltume' },
  250: { lat: -39.8667, lng: -71.7833, nombre: 'Lago Pirehuico' },

  // ── Lagos Villarrica / Panguipulli ────────────────────────────────────────
  105: { lat: -39.2667, lng: -72.0833, nombre: 'Lago Villarrica' },
  209: { lat: -39.2833, lng: -71.9667, nombre: 'Lago Villarrica Sector Pucón' },
  210: { lat: -39.2883, lng: -72.2195, nombre: 'Lago Villarrica Sector Villarrica' },
  245: { lat: -39.5500, lng: -71.9833, nombre: 'Lago Pellaifa' },
  246: { lat: -39.5833, lng: -72.0833, nombre: 'Lago Pullinque' },
  247: { lat: -39.5500, lng: -72.1500, nombre: 'Lago Calafquén' },

  // ── Los Lagos — Lagos interiores ──────────────────────────────────────────
  160: { lat: -40.6833, lng: -72.3167, nombre: 'Lago Puyehue' },
  161: { lat: -40.7833, lng: -72.4500, nombre: 'Lago Rupanco' },
  111: { lat: -41.1500, lng: -72.8000, nombre: 'Lago Llanquihue' },
  159: { lat: -41.1000, lng: -72.1000, nombre: 'Lago Todos los Santos' },
  162: { lat: -41.4333, lng: -72.5167, nombre: 'Lago Chapo' },
  153: { lat: -41.5333, lng: -72.2000, nombre: 'Lago Tagua Tagua' },

  // ── Los Lagos — Puerto Montt / Seno Reloncaví ────────────────────────────
  109: { lat: -41.4700, lng: -72.9400, nombre: 'Puerto Montt' },
  216: { lat: -41.4833, lng: -72.9500, nombre: 'Canal Tenglo' },
  110: { lat: -41.5000, lng: -72.8833, nombre: 'Bahía Chincui' },
  152: { lat: -41.4950, lng: -72.3106, nombre: 'Cochamó' },
  233: { lat: -41.6000, lng: -72.4500, nombre: 'Seno Reloncaví' },

  // ── Los Lagos — Calbuco / Maullín ─────────────────────────────────────────
  232: { lat: -41.8000, lng: -73.1667, nombre: 'San José - Caicaén' },
  113: { lat: -41.7763, lng: -73.1304, nombre: 'Bahía de Calbuco' },
  114: { lat: -41.7991, lng: -73.4798, nombre: 'Canal Chacao Sector Pargua y Pta Coronel' },
  112: { lat: -41.6156, lng: -73.5966, nombre: 'Bahía Maullín' },
  147: { lat: -41.6000, lng: -73.6833, nombre: 'Rada Manzano' },
  148: { lat: -41.5833, lng: -73.7333, nombre: 'Ensenada Estaquilla' },
  149: { lat: -41.7480, lng: -73.7052, nombre: 'Rada de Carelmapu' },

  // ── Los Lagos — Hornopirén / Hualaihué ────────────────────────────────────
  115: { lat: -41.9712, lng: -72.4718, nombre: 'Canal Hornopirén' },
  184: { lat: -42.0000, lng: -72.5000, nombre: 'Ensenada Hualaihué' },
  181: { lat: -42.0167, lng: -72.4500, nombre: 'Canal Cholgo' },
  183: { lat: -42.0333, lng: -72.3500, nombre: 'Estero Pichicolo' },
  185: { lat: -42.0500, lng: -72.4333, nombre: 'Ensenada Rolecha' },
  187: { lat: -42.1167, lng: -72.4667, nombre: 'Sector Buill' },
  186: { lat: -42.1500, lng: -72.5333, nombre: 'Sector Ayacara' },
  182: { lat: -42.2000, lng: -72.4167, nombre: 'Estero Comau' },

  // ── Los Lagos — Chiloé ────────────────────────────────────────────────────
  120: { lat: -42.1448, lng: -73.4725, nombre: 'Puerto Quemchi' },
  213: { lat: -41.7833, lng: -73.6167, nombre: 'Canal Chacao' },
  118: { lat: -41.8665, lng: -73.8313, nombre: 'Bahía Ancud y Canal Chacao' },
  214: { lat: -41.8665, lng: -73.8313, nombre: 'Bahía Ancud' },
  235: { lat: -42.3833, lng: -73.4333, nombre: 'Chequián' },
  163: { lat: -42.3813, lng: -73.6512, nombre: 'Canal Dalcahue' },
  122: { lat: -42.4677, lng: -73.4901, nombre: 'Achao' },
  116: { lat: -42.4808, lng: -73.7591, nombre: 'Castro' },
  119: { lat: -42.6187, lng: -73.7688, nombre: 'Chonchi' },
  205: { lat: -42.6382, lng: -73.7216, nombre: 'Puqueldón (Isla Lemuy)' },
  155: { lat: -42.8842, lng: -73.4792, nombre: 'Queilén' },
  117: { lat: -43.1208, lng: -73.6232, nombre: 'Bahía Quellón' },

  // ── Aysén — Chaitén / Palena ──────────────────────────────────────────────
  121: { lat: -42.9112, lng: -72.7187, nombre: 'Chaitén' },
  234: { lat: -43.6333, lng: -72.1000, nombre: 'Río Palena' },

  // ── Aysén — Guaitecas / Melinka ───────────────────────────────────────────
  251: { lat: -43.3000, lng: -73.5500, nombre: 'Canal Golfo Corcovado (Norte)' },
  252: { lat: -43.5000, lng: -73.2833, nombre: 'Canal Moraleda (Este)' },
  253: { lat: -43.7000, lng: -73.5500, nombre: 'Canal Chaffers Norte' },
  255: { lat: -43.7500, lng: -73.7000, nombre: 'Canal Pérez Norte' },
  175: { lat: -43.7833, lng: -73.7500, nombre: 'Sector Repolla Alto' },
  254: { lat: -43.8000, lng: -73.6000, nombre: 'Canal Chaffers Sur' },
  176: { lat: -43.8333, lng: -73.7333, nombre: 'Sector Repolla Bajo' },
  256: { lat: -43.8500, lng: -73.7000, nombre: 'Canal Pérez Sur' },
  124: { lat: -43.8987, lng: -73.7462, nombre: 'Melinka' },

  // ── Aysén — Canales Puerto Aguirre ────────────────────────────────────────
  238: { lat: -44.5000, lng: -73.2000, nombre: 'Sector Canal Moraleda' },
  240: { lat: -44.7333, lng: -73.5000, nombre: 'Sector Canal Pilcomayo y Canal Rodríguez' },
  123: { lat: -44.7352, lng: -72.6826, nombre: 'Puerto Cisnes' },
  239: { lat: -44.8000, lng: -73.4000, nombre: 'Sector Canal Ferronave y Canal Devia' },
  242: { lat: -44.8667, lng: -73.6000, nombre: 'Sector Canal Carrera del Chivato y Canal Cuchi' },
  241: { lat: -44.9333, lng: -73.5500, nombre: 'Sector Canal Goñi y Canal Ninualac' },
  243: { lat: -45.0333, lng: -73.6000, nombre: 'Sector Canal Darwin' },
  244: { lat: -45.1000, lng: -73.5500, nombre: 'Sector Canal Tránsito' },
  125: { lat: -45.1667, lng: -73.5333, nombre: 'Sector Bahía de Puerto Aguirre' },

  // ── Aysén — Chacabuco / Fiordo Aysén ──────────────────────────────────────
  226: { lat: -45.3667, lng: -73.0333, nombre: 'Boca Wickham' },
  227: { lat: -45.3333, lng: -73.4000, nombre: 'Canal Williams' },
  228: { lat: -45.3833, lng: -73.5000, nombre: 'Canal Vicuña' },
  220: { lat: -45.4000, lng: -72.8500, nombre: 'Fiordo Aysén' },
  126: { lat: -45.4667, lng: -72.8000, nombre: 'Bahía Chacabuco' },
  221: { lat: -45.5333, lng: -73.3000, nombre: 'Estero Quitralco' },
  222: { lat: -45.5000, lng: -73.3333, nombre: 'Estero Cupquelán' },
  225: { lat: -45.6000, lng: -73.1000, nombre: 'Canal Utarupa' },
  224: { lat: -45.7000, lng: -73.2000, nombre: 'Canal Errázuriz' },

  // ── Aysén — Baker / Carrera / O'Higgins ───────────────────────────────────
  223: { lat: -46.1000, lng: -73.8833, nombre: 'Canal Costa y Elefantes' },
  128: { lat: -46.5000, lng: -72.1000, nombre: 'Lago General Carrera' },
  127: { lat: -47.8000, lng: -73.5300, nombre: 'Baker' },
  203: { lat: -48.5000, lng: -72.8333, nombre: "Lago O'Higgins" },

  // ── Aysén / Magallanes — Sur ──────────────────────────────────────────────
  129: { lat: -49.1295, lng: -74.4089, nombre: 'Puerto Edén' },
  154: { lat: -50.3667, lng: -75.3167, nombre: 'Isla Guarello' },

  // ── Magallanes — Natales / Estrecho ───────────────────────────────────────
  130: { lat: -51.7319, lng: -72.5136, nombre: 'Puerto Natales' },
  218: { lat: -52.3500, lng: -71.3333, nombre: 'Laguna Cabeza de Mar' },
  132: { lat: -52.3500, lng: -69.6000, nombre: 'Bahía Clarencia' },
  165: { lat: -52.4167, lng: -71.9500, nombre: 'Skyring' },
  133: { lat: -52.4833, lng: -70.3000, nombre: 'Bahía Catalina' },
  156: { lat: -52.5000, lng: -70.3167, nombre: 'Primera Angostura' },
  135: { lat: -52.5500, lng: -70.7833, nombre: 'Cabo Negro' },
  131: { lat: -52.5833, lng: -70.0667, nombre: 'Bahía Gregorio' },
  136: { lat: -52.9333, lng: -71.3333, nombre: 'Seno Otway' },
  200: { lat: -52.9667, lng: -70.8167, nombre: 'Laredo' },
  134: { lat: -53.1358, lng: -70.8625, nombre: 'Punta Arenas' },
  137: { lat: -53.3036, lng: -70.4360, nombre: 'Bahía Chilota' },

  // ── Magallanes — Cabo de Hornos / Beagle ──────────────────────────────────
  138: { lat: -54.9324, lng: -67.5968, nombre: 'Puerto Williams' },
  199: { lat: -55.9833, lng: -67.2667, nombre: 'Cabo de Hornos' },

  // ── Antártica Chilena ─────────────────────────────────────────────────────
  139: { lat: -62.2000, lng: -58.9667, nombre: 'Bahía Fildes' },
  231: { lat: -62.4667, lng: -59.6833, nombre: 'Bahía Chile' },
  140: { lat: -64.8167, lng: -63.0000, nombre: 'Bahía Paraíso' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Lookup de bahia_id por nombre de puerto (para enriquecer estado de zarpe/recalada)
// ─────────────────────────────────────────────────────────────────────────────
function resolverBahiaIdPorNombre(nombre) {
  if (!nombre) return null;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const skip = new Set(['caleta','bahia','puerto','ensenada','canal','punta','seno','rada','isla','lago','golfo']);
  const palabras = norm(nombre).split(/\s+/).filter(w => w.length > 3 && !skip.has(w));
  if (palabras.length === 0) return null;
  for (const [id, coords] of Object.entries(BAHIA_COORDS)) {
    const nombreNorm = norm(coords.nombre);
    if (palabras.some(p => nombreNorm.includes(p))) return Number(id);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Haversine (km)
// ─────────────────────────────────────────────────────────────────────────────
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sitport/restricciones
// ─────────────────────────────────────────────────────────────────────────────
router.get('/restricciones', async (req, res) => {
  try {
    const data = await sitportService.consultaRestricciones();
    res.json({ success: true, data, error: null });
  } catch (error) {
    res.status(502).json({ success: false, data: [], error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sitport/bahias
// ─────────────────────────────────────────────────────────────────────────────
router.get('/bahias', async (req, res) => {
  try {
    const data = await sitportService.consultaBahias();
    res.json({ success: true, data, error: null });
  } catch (error) {
    res.status(502).json({ success: false, data: [], error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sitport/pronostico
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pronostico', async (req, res) => {
  try {
    const data = await sitportService.totalPronostico();
    res.json({ success: true, data, error: null });
  } catch (error) {
    res.status(502).json({ success: false, data: [], error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sitport/restricciones  (filtro por nombre de puerto)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/restricciones', async (req, res) => {
  try {
    const { puerto } = req.body;
    const data = await sitportService.consultaRestricciones();
    if (!puerto) return res.json({ success: true, data, error: null });

    const norm = s =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const skip = ['caleta','bahia','puerto','ensenada','canal','punta',
                  'seno','rada','isla','lago','golfo'];
    const p = norm(puerto);

    const filtradas = data.filter(r => {
      const words = norm(r.GLBahia || '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !skip.includes(w));
      return words.length > 0 && words.some(w => p.includes(w));
    });

    const bahiaId = filtradas[0]?.bahia ?? resolverBahiaIdPorNombre(puerto);
    const cap = bahiaId ? getCapitaniaByBahiaId(bahiaId) : null;

    res.json({
      success: true,
      restricciones: filtradas,
      timestamp: new Date().toISOString(),
      error: null,
      capitania: cap?.capitania || null,
      gobernacion: cap?.gobernacion || null,
      telefono: cap?.telefono || null,
    });
  } catch (error) {
    res.status(502).json({ success: false, restricciones: [], error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sitport/weather-ruta
// Recibe: { ruta_puntos: [{lat, lng}] }
// Devuelve: condiciones meteorológicas reales de SITPORT para la ruta,
//           usando mapa estático idBahia→coords para el matching geográfico.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/weather-ruta', async (req, res) => {
  try {
    const { ruta_puntos } = req.body;

    if (!Array.isArray(ruta_puntos) || ruta_puntos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ruta_puntos debe ser un array no vacío de {lat, lng}'
      });
    }

    // 1. Obtener pronósticos desde SITPORT (con caché interno del servicio)
    const pronosticos = await sitportService.totalPronostico();
    if (!pronosticos || pronosticos.length === 0) {
      return res.status(502).json({
        success: false,
        error: 'SITPORT no respondió',
        peor_tramo: null,
        bahias_en_ruta: [],
        condicion_puerto: null,
        alerta_nivel: null
      });
    }

    // 2. Enriquecer cada pronóstico con coordenadas del mapa estático
    const enriquecidos = pronosticos
      .map(p => {
        const coords = BAHIA_COORDS[p.idBahia];
        if (!coords) return null;
        return { ...p, lat: coords.lat, lng: coords.lng, nombreBahia: coords.nombre };
      })
      .filter(Boolean)
      .filter(p => p.velocidadViento !== null && p.temperatura !== null);

    if (enriquecidos.length === 0) {
      return res.json({
        success: false,
        error: 'Sin datos meteorológicos válidos en SITPORT ahora mismo',
        peor_tramo: null,
        bahias_en_ruta: [],
        condicion_puerto: 'normal',
        alerta_nivel: 'normal'
      });
    }

    // 3. Para cada punto de ruta, encontrar la bahía más cercana (máx 120 km)
    const MAX_DIST_KM = 120;
    const bahiasEnRuta = new Map(); // idBahia → registro

    for (const punto of ruta_puntos) {
      if (!punto.lat || !punto.lng) continue;
      let mejor = null;
      let mejorDist = Infinity;

      for (const p of enriquecidos) {
        const d = distKm(punto.lat, punto.lng, p.lat, p.lng);
        if (d < mejorDist && d < MAX_DIST_KM) {
          mejorDist = d;
          mejor = p;
        }
      }

      if (mejor && !bahiasEnRuta.has(mejor.idBahia)) {
        bahiasEnRuta.set(mejor.idBahia, {
          ...mejor,
          distancia_km: Math.round(mejorDist)
        });
      }
    }

    const bahias = Array.from(bahiasEnRuta.values());

    // 4. Peor tramo = mayor velocidad de viento
    const peorTramo = bahias.length > 0
      ? bahias.reduce((max, b) =>
          (b.velocidadViento || 0) > (max.velocidadViento || 0) ? b : max,
          bahias[0])
      : null;

    // 5. Nivel de alerta según A-41/013
    //    Alta mar: 30 kt | Costera: 26 kt | Bahía: lo que fije la Capitanía
    let alerta_nivel = 'normal';
    let condicion_puerto = 'normal';

    if (peorTramo) {
      const v = peorTramo.velocidadViento || 0;
      if      (v >= 30) { alerta_nivel = 'alto';  condicion_puerto = 'temporal'; }
      else if (v >= 26) { alerta_nivel = 'medio'; condicion_puerto = 'mal_tiempo'; }
      else if (v >= 15) { alerta_nivel = 'bajo';  condicion_puerto = 'tiempo_variable'; }
    }

    // 6. Respuesta estructurada
    res.json({
      success: true,
      bahias_en_ruta: bahias.map(b => {
        const cap = getCapitaniaByBahiaId(b.idBahia);
        return {
          id_bahia:            b.idBahia,
          nombre:              b.nombreBahia,
          lat:                 b.lat,
          lng:                 b.lng,
          temperatura_c:       b.temperatura,
          presion_hpa:         b.presion,
          velocidad_viento_kt: b.velocidadViento,
          direccion_viento:    b.textoDireccionViento || String(b.direccionVientoAprox ?? ''),
          lluvia_mm:           b.lluviaUltimaHora,
          pronostico_texto:    b.pronostico ?? null,
          fecha_dato:          b.fecha,
          distancia_km:        b.distancia_km,
          capitania:           cap?.capitania || null,
          gobernacion:         cap?.gobernacion || null,
          telefono:            cap?.telefono || null,
        };
      }),
      peor_tramo: peorTramo ? {
        id_bahia:            peorTramo.idBahia,
        nombre:              peorTramo.nombreBahia,
        velocidad_viento_kt: peorTramo.velocidadViento,
        direccion_viento:    peorTramo.textoDireccionViento,
        temperatura_c:       peorTramo.temperatura,
        presion_hpa:         peorTramo.presion,
        lluvia_mm:           peorTramo.lluviaUltimaHora,
        pronostico_texto:    peorTramo.pronostico ?? null
      } : null,
      condicion_puerto,
      alerta_nivel,
      fuente:    'SITPORT/DIRECTEMAR',
      normativa: 'A-41/013 DGTM',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[sitport/weather-ruta] Error:', error.message);
    res.status(502).json({
      success: false,
      error: error.message,
      peor_tramo: null,
      bahias_en_ruta: [],
      condicion_puerto: null,
      alerta_nivel: null
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Deriva la "Condición de Puerto" desde el texto libre de la restricción.
// SITPORT no expone un campo estructurado de condición; la publica dentro de
// Observacion ("SE ESTABLECE CONDICIÓN DE MAL TIEMPO..."). Se detecta por
// palabras clave, de mayor a menor severidad.
// ─────────────────────────────────────────────────────────────────────────────
function derivarCondicion(r) {
  const t = (r.Observacion || '').toUpperCase();
  if (t.includes('TEMPORAL')) return 'Temporal';
  if (t.includes('MAL TIEMPO')) return 'Mal Tiempo';
  if (t.includes('TIEMPO VARIABLE')) return 'Tiempo Variable';
  if (t.includes('PUERTO CERRADO') || t.includes('CERRADO')) return 'Puerto Cerrado';
  const m = (r.MotivoRestriccion || '').trim();
  return m ? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() : null;
}

// De todas las restricciones activas de una bahía, elige la más útil para el
// cotejo de Arqueo Bruto del frontend: prioriza la que menciona un límite de AB
// (formato SITPORT "... A 25 AB" / "EEMM"); si ninguna lo hace, la primera.
function elegirRestriccion(lista) {
  return (
    lista.find((r) => {
      const t = r.Observacion || '';
      return /(\d+)\s*AB\b/i.test(t) || /EEMM/i.test(t);
    }) || lista[0]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para matching por segmento de ruta
// ─────────────────────────────────────────────────────────────────────────────

// Matching geográfico via PostGIS: devuelve los bahia_id cuyas celdas Voronoi
// (recortadas por costa) intersectan la ruta. Elimina falsos positivos en
// geografía de fiordos (ej: Maullín no matchea rutas por el Golfo de Ancud).
async function bahiasEnRutaPostGIS(waypoints) {
  if (waypoints.length < 2) return new Set();
  const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);
  const rutaGeoJSON = JSON.stringify({ type: 'LineString', coordinates });
  const { rows } = await pool.query(
    `SELECT bahia_id
     FROM bahia_jurisdicciones
     WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))`,
    [rutaGeoJSON]
  );
  return new Set(rows.map(r => r.bahia_id));
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sitport/restricciones-ruta
// Recibe: { ruta_puntos: [{lat, lng}], zarpe_id?, recalada_id? }
// Devuelve las restricciones SITPORT activas en las bahías que la ruta cruza en
// TRÁNSITO (excluye zarpe y recalada, que ya cubre PortStatusBlock), cada una
// con la Gobernación jurisdiccional y un fondeadero previo para esperar.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/restricciones-ruta', async (req, res) => {
  try {
    const { ruta_puntos, zarpe_id, recalada_id, nave_ab } = req.body;

    if (!Array.isArray(ruta_puntos) || ruta_puntos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ruta_puntos debe ser un array no vacío de {lat, lng}',
        veredicto: 'Q',
        restricciones_intermedias: [],
        total: 0
      });
    }

    // 1. Obtener restricciones de área completa (tipo TODOS = afecta zona, no frente de atraque)
    // No filtrar por NaveRecibe aquí — el BRE determina si aplica al perfil de la nave
    const todasRestricciones = await sitportService.consultaRestricciones();
    const restriccionesTransito = todasRestricciones.filter(r =>
      r.tipo && r.tipo.trim() === 'TODOS'
    );

    const puntosValidos = ruta_puntos.filter(p => p && p.lat != null && p.lng != null);

    // 2. Matching geográfico PostGIS: qué celdas Voronoi (recortadas por costa)
    // intersectan la ruta. Reemplaza el radio de 50km — elimina falsos positivos
    // en geografía de fiordos (ej: Maullín no matchea rutas por el Golfo de Ancud).
    const bahiaIdsEnRuta = await bahiasEnRutaPostGIS(puntosValidos);

    // 3. Agrupar restricciones por bahía y calcular posición en ruta para ordenar.
    // La posición se estima como el índice del waypoint más cercano al punto de la bahía.
    const porBahia = new Map(); // bahiaId → { restricciones, indiceRuta, coordsBahia }

    for (const restriccion of restriccionesTransito) {
      const bahiaId = restriccion.bahia;
      if (!bahiaIdsEnRuta.has(bahiaId)) continue;
      const coordsBahia = BAHIA_COORDS[bahiaId];
      if (!coordsBahia) continue;

      if (!porBahia.has(bahiaId)) {
        // Estimar posición en ruta: índice del waypoint más cercano al punto de la bahía
        let minDist = Infinity, minIdx = 0;
        puntosValidos.forEach((wp, i) => {
          const d = distKm(coordsBahia.lat, coordsBahia.lng, wp.lat, wp.lng);
          if (d < minDist) { minDist = d; minIdx = i; }
        });
        porBahia.set(bahiaId, { restricciones: [], indiceRuta: minIdx, coordsBahia });
      }
      porBahia.get(bahiaId).restricciones.push(restriccion);
    }

    // 4. Ordenar por posición en la ruta (orden de tránsito)
    const restriccionesEnRuta = [...porBahia.entries()]
      .map(([id, { restricciones, indiceRuta, coordsBahia }]) => ({
        idBahia: Number(id),
        coords: coordsBahia,
        rutaIdx: indiceRuta,
        lista: restricciones,
      }))
      .sort((a, b) => a.rutaIdx - b.rutaIdx);

    // 4. Excluir zarpe y recalada por ID explícito.
    // La exclusión posicional (primer/último match) fue eliminada: asumía que
    // las bahías más cercanas a los extremos de la ruta son zarpe/recalada, lo
    // cual falla cuando solo hay pocas bahías dentro del radio y todas son tránsito.
    const excluidas = new Set();
    if (zarpe_id != null) excluidas.add(Number(zarpe_id));
    if (recalada_id != null) excluidas.add(Number(recalada_id));

    // Coordenadas de todas las zonas restringidas (para validar fondeadero)
    const zonasRestringidas = [...porBahia.values()].map(({ coordsBahia }) => coordsBahia);

    // 5. Construir intermedias deduplicadas por bahía
    const intermedias = [];
    let orden = 1;
    for (const { idBahia, coords, rutaIdx, lista } of restriccionesEnRuta) {
      if (excluidas.has(idBahia)) continue;

      const r = elegirRestriccion(lista);
      const cap = getCapitaniaByBahiaId(idBahia);
      const norm = normalizarRestriccion(r);

      const rutaAntes = puntosValidos.slice(0, rutaIdx);
      intermedias.push({
        id_bahia: idBahia,
        nombre_bahia: coords.nombre || r.GLBahia || 'Bahía',
        lat: coords.lat,
        lng: coords.lng,
        restriccion: r.MotivoRestriccion || r.tiporestriccion || 'Restricción activa',
        observacion: r.Observacion || '',
        condicion: norm.condicion,
        condicion_legible: derivarCondicion(r),
        motivo: r.MotivoRestriccion || null,
        tipo_restriccion: r.tiporestriccion || null,
        nave_recibe: r.NaveRecibe || null,
        capitania: cap?.capitania || null,
        gobernacion: cap?.gobernacion || null,
        telefono: cap?.telefono || null,
        orden_en_ruta: orden++,
        fondeadero_previo: buscarFondeadero(coords.lat, coords.lng, rutaAntes, zonasRestringidas),
        _raw: r,
      });
    }

    // Motor de reglas: evaluar toda la ruta contra el perfil de la nave
    const evaluacion = await evaluarRuta(intermedias, nave_ab);

    // Enriquecer cada restricción intermedia con su evaluación individual
    const intermediasEnriquecidas = intermedias.map((r, i) => {
      const ev = evaluacion.restricciones[i] || {};
      const { _raw, ...sinRaw } = r;
      return {
        ...sinRaw,
        evaluacion: {
          bloquea: ev.bloquea ?? false,
          estado: ev.estado || 'indeterminado',
          umbral_ab: ev.umbral_ab ?? null,
          nivel: ev.nivel || null,
          motivo: ev.motivo || null,
        },
      };
    });

    res.json({
      success: true,
      veredicto: evaluacion.veredicto,
      motivo_principal: evaluacion.motivo_principal,
      ultimo_tramo_seguro: evaluacion.ultimo_tramo_seguro,
      fondeadero_sugerido: evaluacion.fondeadero_sugerido,
      restricciones_intermedias: intermediasEnriquecidas,
      total: intermediasEnriquecidas.length,
      fuente: 'SITPORT/DIRECTEMAR',
      timestamp: new Date().toISOString(),
      timestamp_sitport: evaluacion.timestamp_sitport,
      error: null,
    });

  } catch (error) {
    console.error('[sitport/restricciones-ruta] Error:', error.message);
    res.status(502).json({
      success: false,
      error: error.message,
      veredicto: 'U',
      restricciones_intermedias: [],
      total: 0
    });
  }
});

module.exports = router;