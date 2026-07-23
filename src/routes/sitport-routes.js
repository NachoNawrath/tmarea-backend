const express = require('express');
const sitportService = require('../services/sitport-service');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// MAPA ESTÁTICO idBahia → coordenadas WGS84
// Fuente: SITPORT/DIRECTEMAR + cartografía austral
// Cubre corredor Puerto Montt – Quellón – Melinka – Chacabuco y ramales
// ─────────────────────────────────────────────────────────────────────────────
const BAHIA_COORDS = {
  71:  { lat: -18.4746, lng: -70.3126, nombre: 'Bahía de Arica' },
  72:  { lat: -20.2133, lng: -70.1503, nombre: 'Bahía de Iquique' },
  75:  { lat: -23.6509, lng: -70.3975, nombre: 'Bahía de Antofagasta' },
  80:  { lat: -27.0667, lng: -70.8333, nombre: 'Bahía de Caldera' },
  84:  { lat: -29.9533, lng: -71.3439, nombre: 'Bahía de Coquimbo' },
  88:  { lat: -33.0333, lng: -71.6333, nombre: 'Bahía de Valparaíso' },
  91:  { lat: -33.5833, lng: -71.6167, nombre: 'Bahía de San Antonio' },
  92:  { lat: -36.6000, lng: -72.9833, nombre: 'Bahía de Concepción' },
  93:  { lat: -36.8167, lng: -73.1500, nombre: 'Bahía de San Vicente' },
  95:  { lat: -39.8500, lng: -73.2000, nombre: 'Bahía de Valdivia' },
  97:  { lat: -40.5667, lng: -73.1167, nombre: 'Bahía de Corral' },
  98:  { lat: -41.4667, lng: -72.9333, nombre: 'Canal de Chacao' },
  100: { lat: -41.4717, lng: -72.9364, nombre: 'Bahía de Ancud' },
  101: { lat: -41.8667, lng: -73.1333, nombre: 'Golfo de Ancud' },
  102: { lat: -41.4833, lng: -72.9333, nombre: 'Puerto Montt' },
  103: { lat: -41.5500, lng: -72.9167, nombre: 'Seno de Reloncaví' },
  107: { lat: -41.8833, lng: -73.7833, nombre: 'Golfo de Corcovado' },
  108: { lat: -42.4833, lng: -73.7667, nombre: 'Canal Moraleda Norte' },
  109: { lat: -42.4667, lng: -73.7500, nombre: 'Castro / Chiloé' },
  112: { lat: -43.1167, lng: -73.6167, nombre: 'Quellón' },
  117: { lat: -43.8833, lng: -73.7333, nombre: 'Golfo del Corcovado Sur' },
  118: { lat: -44.0167, lng: -73.6000, nombre: 'Canal Moraleda Sur' },
  119: { lat: -44.0833, lng: -73.5833, nombre: 'Melinka / Guaitecas' },
  120: { lat: -44.3333, lng: -73.1500, nombre: 'Lago Chapo' },
  121: { lat: -44.5667, lng: -72.6833, nombre: 'Bahía Puyuhuapi' },
  124: { lat: -45.2833, lng: -72.7167, nombre: 'Puerto Chacabuco / Seno Aysén' },
  125: { lat: -45.4000, lng: -72.6833, nombre: 'Puerto Aysén' },
  126: { lat: -45.5667, lng: -72.5833, nombre: 'Lago General Carrera' },
  129: { lat: -46.4167, lng: -75.0333, nombre: 'Golfo de Penas' },
  130: { lat: -47.3333, lng: -74.0000, nombre: 'Canal Messier' },
  133: { lat: -50.9167, lng: -74.1667, nombre: 'Seno Última Esperanza' },
  134: { lat: -51.7333, lng: -72.5000, nombre: 'Estrecho de Magallanes' },
  137: { lat: -53.1500, lng: -70.9167, nombre: 'Punta Arenas' },
  143: { lat: -54.8167, lng: -68.3000, nombre: 'Canal Beagle' },
  213: { lat: -41.7667, lng: -73.8333, nombre: 'Canal Chacao' },
  214: { lat: -41.8667, lng: -73.8333, nombre: 'Bahía Ancud' },
  215: { lat: -42.1000, lng: -73.6167, nombre: 'El Quisco' },
  216: { lat: -41.4667, lng: -72.9500, nombre: 'Canal Tenglo' },
  218: { lat: -41.5833, lng: -72.8333, nombre: 'Laguna Cabeza de Mar' },
  219: { lat: -41.9167, lng: -72.3333, nombre: 'Sector Norte Quintero' },
  220: { lat: -45.4000, lng: -72.7167, nombre: 'Fiordo Aysén' },
  232: { lat: -41.5500, lng: -72.4667, nombre: 'Seno Reloncaví' },
  233: { lat: -41.6000, lng: -72.4500, nombre: 'Seno Reloncaví Norte' },
  238: { lat: -44.5000, lng: -73.2000, nombre: 'Sector Canal Moraleda' },
  76:  { lat: -41.5000, lng: -72.9167, nombre: 'Puerto Montt sector' },
  82:  { lat: -41.4667, lng: -72.9333, nombre: 'Bahía de Puerto Montt' },
  83:  { lat: -42.4833, lng: -73.7500, nombre: 'Castro' },
  85:  { lat: -43.1167, lng: -73.6167, nombre: 'Quellón sector' },
};

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

    res.json({
      success: true,
      restricciones: filtradas,
      timestamp: new Date().toISOString(),
      error: null
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
      bahias_en_ruta: bahias.map(b => ({
        id_bahia:            b.idBahia,
        nombre:              b.nombreBahia,
        temperatura_c:       b.temperatura,
        presion_hpa:         b.presion,
        velocidad_viento_kt: b.velocidadViento,
        direccion_viento:    b.textoDireccionViento || String(b.direccionVientoAprox ?? ''),
        lluvia_mm:           b.lluviaUltimaHora,
        pronostico_texto:    b.pronostico ?? null,
        fecha_dato:          b.fecha,
        distancia_km:        b.distancia_km
      })),
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

module.exports = router;