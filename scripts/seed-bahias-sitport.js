'use strict';
// Seed bahias_sitport desde BAHIA_COORDS de sitport-routes.js
// Uso: node scripts/seed-bahias-sitport.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'mapa_navegacion',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// ── BAHIA_COORDS extraído de sitport-routes.js ────────────────────────────────
const BAHIA_COORDS = {
  71:  { lat: -18.4746, lng: -70.3126, nombre: 'Bahía de Arica' },
  204: { lat: -19.5975, lng: -70.2152, nombre: 'Pisagua' },
  72:  { lat: -20.2133, lng: -70.1503, nombre: 'Bahía de Iquique' },
  195: { lat: -20.7500, lng: -70.2083, nombre: 'Patillo' },
  196: { lat: -20.7833, lng: -70.2167, nombre: 'Borde Costero Norte Patache' },
  73:  { lat: -20.8000, lng: -70.2200, nombre: 'Patache' },
  197: { lat: -20.8167, lng: -70.2167, nombre: 'Borde Costero Sur Patache' },
  236: { lat: -22.0500, lng: -70.1833, nombre: 'Caleta Viuda' },
  74:  { lat: -22.1000, lng: -70.2167, nombre: 'Bahía Algodonales' },
  76:  { lat: -22.7167, lng: -70.2833, nombre: 'Caleta Michilla' },
  75:  { lat: -23.1000, lng: -70.4500, nombre: 'Bahía Mejillones del Sur' },
  77:  { lat: -23.6500, lng: -70.4000, nombre: 'Bahía Moreno (Antofagasta)' },
  78:  { lat: -23.7603, lng: -70.4631, nombre: 'Caleta Coloso' },
  79:  { lat: -25.4089, lng: -70.4911, nombre: 'Tal Tal' },
  172: { lat: -26.1414, lng: -70.6621, nombre: 'Bahía Pan de Azúcar' },
  80:  { lat: -26.3500, lng: -70.6333, nombre: 'Bahía Chañaral' },
  81:  { lat: -27.0637, lng: -70.8237, nombre: 'Bahía Caldera' },
  82:  { lat: -27.0833, lng: -70.8500, nombre: 'Bahía Calderilla' },
  83:  { lat: -27.1167, lng: -70.8750, nombre: 'Sector Punta Totoralillo' },
  157: { lat: -28.0797, lng: -71.1486, nombre: 'Puerto Carrizal Bajo' },
  84:  { lat: -28.4609, lng: -71.2241, nombre: 'Bahía Puerto Huasco' },
  158: { lat: -29.0773, lng: -71.4920, nombre: 'Caleta Chañaral y Ensenada Gaviota' },
  206: { lat: -29.4167, lng: -71.2500, nombre: 'La Higuera' },
  202: { lat: -29.4500, lng: -71.3000, nombre: 'Cruz Grande' },
  85:  { lat: -29.9500, lng: -71.3400, nombre: 'Bahía Coquimbo' },
  86:  { lat: -29.9668, lng: -71.3499, nombre: 'Bahía Herradura de Guayacán' },
  151: { lat: -30.0500, lng: -71.3833, nombre: 'Barnes' },
  150: { lat: -30.1938, lng: -71.4305, nombre: 'Guanaqueros' },
  87:  { lat: -30.2558, lng: -71.4969, nombre: 'Tongoy' },
  88:  { lat: -31.3833, lng: -71.6167, nombre: 'Bahía Conchalí' },
  180: { lat: -32.1362, lng: -71.5298, nombre: 'Bahía Pichidangui' },
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
  96:  { lat: -34.1667, lng: -71.5833, nombre: 'Lago Rapel' },
  95:  { lat: -34.3829, lng: -72.0144, nombre: 'Pichilemu' },
  229: { lat: -34.8333, lng: -71.0833, nombre: 'Lago Vichuquén' },
  103: { lat: -35.3325, lng: -72.4060, nombre: 'Bahía Constitución' },
  97:  { lat: -36.7104, lng: -72.9776, nombre: 'Bahía Concepción - Lirquén' },
  98:  { lat: -36.7090, lng: -73.1132, nombre: 'Bahía Concepción - Talcahuano' },
  99:  { lat: -36.7251, lng: -73.1326, nombre: 'Bahía San Vicente' },
  198: { lat: -36.7833, lng: -73.1833, nombre: 'Sector Costero Península de Hualpén' },
  100: { lat: -37.0092, lng: -73.1833, nombre: 'Bahía Coronel' },
  102: { lat: -37.0735, lng: -73.1522, nombre: 'Lota' },
  101: { lat: -37.6015, lng: -73.6548, nombre: 'Lebu' },
  141: { lat: -38.7167, lng: -73.1700, nombre: 'Carahue - Sector Río' },
  142: { lat: -38.7000, lng: -73.1000, nombre: 'Carahue - Sector Lago' },
  143: { lat: -38.7500, lng: -73.4333, nombre: 'Carahue - Borde Costero' },
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
  105: { lat: -39.2667, lng: -72.0833, nombre: 'Lago Villarrica' },
  209: { lat: -39.2833, lng: -71.9667, nombre: 'Lago Villarrica Sector Pucón' },
  210: { lat: -39.2883, lng: -72.2195, nombre: 'Lago Villarrica Sector Villarrica' },
  245: { lat: -39.5500, lng: -71.9833, nombre: 'Lago Pellaifa' },
  246: { lat: -39.5833, lng: -72.0833, nombre: 'Lago Pullinque' },
  247: { lat: -39.5500, lng: -72.1500, nombre: 'Lago Calafquén' },
  160: { lat: -40.6833, lng: -72.3167, nombre: 'Lago Puyehue' },
  161: { lat: -40.7833, lng: -72.4500, nombre: 'Lago Rupanco' },
  111: { lat: -41.1500, lng: -72.8000, nombre: 'Lago Llanquihue' },
  159: { lat: -41.1000, lng: -72.1000, nombre: 'Lago Todos los Santos' },
  162: { lat: -41.4333, lng: -72.5167, nombre: 'Lago Chapo' },
  153: { lat: -41.5333, lng: -72.2000, nombre: 'Lago Tagua Tagua' },
  109: { lat: -41.4700, lng: -72.9400, nombre: 'Puerto Montt' },
  216: { lat: -41.4833, lng: -72.9500, nombre: 'Canal Tenglo' },
  110: { lat: -41.5000, lng: -72.8833, nombre: 'Bahía Chincui' },
  152: { lat: -41.4950, lng: -72.3106, nombre: 'Cochamó' },
  233: { lat: -41.6000, lng: -72.4500, nombre: 'Seno Reloncaví' },
  232: { lat: -41.8000, lng: -73.1667, nombre: 'San José - Caicaén' },
  113: { lat: -41.7763, lng: -73.1304, nombre: 'Bahía de Calbuco' },
  114: { lat: -41.7991, lng: -73.4798, nombre: 'Canal Chacao Sector Pargua y Pta Coronel' },
  112: { lat: -41.6156, lng: -73.5966, nombre: 'Bahía Maullín' },
  147: { lat: -41.6000, lng: -73.6833, nombre: 'Rada Manzano' },
  148: { lat: -41.5833, lng: -73.7333, nombre: 'Ensenada Estaquilla' },
  149: { lat: -41.7480, lng: -73.7052, nombre: 'Rada de Carelmapu' },
  115: { lat: -41.9712, lng: -72.4718, nombre: 'Canal Hornopirén' },
  184: { lat: -42.0000, lng: -72.5000, nombre: 'Ensenada Hualaihué' },
  181: { lat: -42.0167, lng: -72.4500, nombre: 'Canal Cholgo' },
  183: { lat: -42.0333, lng: -72.3500, nombre: 'Estero Pichicolo' },
  185: { lat: -42.0500, lng: -72.4333, nombre: 'Ensenada Rolecha' },
  187: { lat: -42.1167, lng: -72.4667, nombre: 'Sector Buill' },
  186: { lat: -42.1500, lng: -72.5333, nombre: 'Sector Ayacara' },
  182: { lat: -42.2000, lng: -72.4167, nombre: 'Estero Comau' },
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
  121: { lat: -42.9112, lng: -72.7187, nombre: 'Chaitén' },
  234: { lat: -43.6333, lng: -72.1000, nombre: 'Río Palena' },
  251: { lat: -43.3000, lng: -73.5500, nombre: 'Canal Golfo Corcovado (Norte)' },
  252: { lat: -43.5000, lng: -73.2833, nombre: 'Canal Moraleda (Este)' },
  253: { lat: -43.7000, lng: -73.5500, nombre: 'Canal Chaffers Norte' },
  255: { lat: -43.7500, lng: -73.7000, nombre: 'Canal Pérez Norte' },
  175: { lat: -43.7833, lng: -73.7500, nombre: 'Sector Repolla Alto' },
  254: { lat: -43.8000, lng: -73.6000, nombre: 'Canal Chaffers Sur' },
  176: { lat: -43.8333, lng: -73.7333, nombre: 'Sector Repolla Bajo' },
  256: { lat: -43.8500, lng: -73.7000, nombre: 'Canal Pérez Sur' },
  124: { lat: -43.8987, lng: -73.7462, nombre: 'Melinka' },
  238: { lat: -44.5000, lng: -73.2000, nombre: 'Sector Canal Moraleda' },
  240: { lat: -44.7333, lng: -73.5000, nombre: 'Sector Canal Pilcomayo y Canal Rodríguez' },
  123: { lat: -44.7352, lng: -72.6826, nombre: 'Puerto Cisnes' },
  239: { lat: -44.8000, lng: -73.4000, nombre: 'Sector Canal Ferronave y Canal Devia' },
  242: { lat: -44.8667, lng: -73.6000, nombre: 'Sector Canal Carrera del Chivato y Canal Cuchi' },
  241: { lat: -44.9333, lng: -73.5500, nombre: 'Sector Canal Goñi y Canal Ninualac' },
  243: { lat: -45.0333, lng: -73.6000, nombre: 'Sector Canal Darwin' },
  244: { lat: -45.1000, lng: -73.5500, nombre: 'Sector Canal Tránsito' },
  125: { lat: -45.1667, lng: -73.5333, nombre: 'Sector Bahía de Puerto Aguirre' },
  226: { lat: -45.3667, lng: -73.0333, nombre: 'Boca Wickham' },
  227: { lat: -45.3333, lng: -73.4000, nombre: 'Canal Williams' },
  228: { lat: -45.3833, lng: -73.5000, nombre: 'Canal Vicuña' },
  220: { lat: -45.4000, lng: -72.8500, nombre: 'Fiordo Aysén' },
  126: { lat: -45.4667, lng: -72.8000, nombre: 'Bahía Chacabuco' },
  221: { lat: -45.5333, lng: -73.3000, nombre: 'Estero Quitralco' },
  222: { lat: -45.5000, lng: -73.3333, nombre: 'Estero Cupquelán' },
  225: { lat: -45.6000, lng: -73.1000, nombre: 'Canal Utarupa' },
  224: { lat: -45.7000, lng: -73.2000, nombre: 'Canal Errázuriz' },
  223: { lat: -46.1000, lng: -73.8833, nombre: 'Canal Costa y Elefantes' },
  128: { lat: -46.5000, lng: -72.1000, nombre: 'Lago General Carrera' },
  127: { lat: -47.8000, lng: -73.5300, nombre: 'Baker' },
  203: { lat: -48.5000, lng: -72.8333, nombre: "Lago O'Higgins" },
  129: { lat: -49.1295, lng: -74.4089, nombre: 'Puerto Edén' },
  154: { lat: -50.3667, lng: -75.3167, nombre: 'Isla Guarello' },
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
  138: { lat: -54.9324, lng: -67.5968, nombre: 'Puerto Williams' },
  199: { lat: -55.9833, lng: -67.2667, nombre: 'Cabo de Hornos' },
  139: { lat: -62.2000, lng: -58.9667, nombre: 'Bahía Fildes' },
  231: { lat: -62.4667, lng: -59.6833, nombre: 'Bahía Chile' },
  140: { lat: -64.8167, lng: -63.0000, nombre: 'Bahía Paraíso' },
};

async function main() {
  const client = await pool.connect();
  try {
    console.log('Creando tabla bahias_sitport...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bahias_sitport (
        bahia_id INTEGER PRIMARY KEY,
        nombre   TEXT NOT NULL,
        lat      DOUBLE PRECISION NOT NULL,
        lng      DOUBLE PRECISION NOT NULL,
        geom     GEOMETRY(Point, 4326)
      );
      CREATE INDEX IF NOT EXISTS idx_bahias_sitport_geom
        ON bahias_sitport USING GIST(geom);
    `);

    console.log('Insertando bahías...');
    const entries = Object.entries(BAHIA_COORDS);
    let inserted = 0;

    for (const [id, { lat, lng, nombre }] of entries) {
      await client.query(
        `INSERT INTO bahias_sitport (bahia_id, nombre, lat, lng, geom)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326))
         ON CONFLICT (bahia_id) DO UPDATE
           SET nombre = EXCLUDED.nombre,
               lat    = EXCLUDED.lat,
               lng    = EXCLUDED.lng,
               geom   = EXCLUDED.geom`,
        [Number(id), nombre, lat, lng]
      );
      inserted++;
    }

    console.log(`✓ ${inserted} bahías insertadas`);

    const { rows } = await client.query('SELECT COUNT(*) FROM bahias_sitport');
    console.log(`Total en tabla: ${rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
