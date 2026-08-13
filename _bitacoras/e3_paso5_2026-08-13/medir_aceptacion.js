// Medicion de la aceptacion de E3 contra la capa REAL ya publicada.
// No es una prueba de mordida: es la medicion que el paso 5 debe dejar escrita.
// Usa las MISMAS funciones que el endpoint, no una reimplementacion.
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(RAIZ, '.env') });

const { Pool } = require(path.join(RAIZ, 'node_modules/pg'));
const pool = new Pool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});
const { ensancheVigente, bahiasDelEnsanche, medirCoberturaRuta } =
  require(path.join(RAIZ, 'src/services/cobertura-jurisdiccional'));
const { capitaniaDeBahia } = require(path.join(RAIZ, 'src/services/capitania-de-bahia'));

const LACUSTRE = [{ lat: -41.12, lng: -72.90 }, { lat: -41.20, lng: -72.70 }];
const MARITIMA = [{ lat: -41.48607231899996, lng: -72.97656408099994 },
                  { lat: -43.89816864699998, lng: -73.74786402599995 }];

const geo = (wps) => JSON.stringify({ type: 'LineString', coordinates: wps.map(w => [w.lng, w.lat]) });

async function celdas(wps) {
  const { rows } = await pool.query(
    `SELECT bahia_id FROM bahia_jurisdicciones
      WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1),4326))`, [geo(wps)]);
  return new Set(rows.map(r => r.bahia_id));
}

(async () => {
  const ens = await ensancheVigente(pool);
  console.log('ENSANCHE VIGENTE:', JSON.stringify(ens));
  console.log();

  for (const [nombre, wps] of [['LACUSTRE (Lago Llanquihue)', LACUSTRE], ['MARITIMA (Anahuac -> Melinka)', MARITIMA]]) {
    const base = await celdas(wps);
    const extra = [...(ens ? await bahiasDelEnsanche(pool, geo(wps), ens) : [])];
    const nuevas = extra.filter(b => !base.has(b)).sort((a, b) => a - b);
    const total = new Set([...base, ...extra]);
    console.log(`--- ${nombre}`);
    console.log(`  teselado (hoy)   : ${base.size} ${JSON.stringify([...base].sort((a, b) => a - b))}`);
    console.log(`  ensanche agrega  : ${nuevas.length} ${JSON.stringify(nuevas)}`);
    console.log(`  TOTAL            : ${total.size}`);
    // OJO: los campos son `piezas` y `largo_km`. La primera version de este
    // script leyo `piezas_descubiertas` y `metros`, que NO EXISTEN, y por eso
    // daba 0,0000 km en las dos rutas: medir un campo inexistente devuelve el
    // mismo cero que "no hay hueco" (CLAUDE.md §2). Corregido antes de reportar.
    const cob = await medirCoberturaRuta(pool, wps);
    const piezas = cob.piezas || [];
    const avisos = piezas.filter(p => p.clasificacion === 'aviso');
    const defectos = piezas.filter(p => p.clasificacion === 'defecto_recorte');
    const km = (ps) => ps.reduce((s, p) => s + p.largo_km, 0);
    console.log(`  capa consultada  : ${cob.capa} + ensanche ${JSON.stringify(cob.ensanche)}`);
    console.log(`  largo de la ruta : ${cob.largo_ruta_km === null ? 'n/d' : cob.largo_ruta_km.toFixed(4)} km`);
    console.log(`  sin jurisdiccion : ${piezas.length} trozo(s), ${km(piezas).toFixed(4)} km`);
    console.log(`    -> aviso al patron   : ${avisos.length} trozo(s), ${km(avisos).toFixed(4)} km`);
    console.log(`    -> defecto de recorte: ${defectos.length} trozo(s), ${km(defectos).toFixed(4)} km`);
    console.log();
  }

  console.log('--- CONTACTO de las bahias del Lago Llanquihue (nombre del decreto, telefono del mapa)');
  const extra = [...(ens ? await bahiasDelEnsanche(pool, geo(LACUSTRE), ens) : [])];
  for (const b of [...new Set(extra)].sort((a, b) => a - b)) {
    const c = capitaniaDeBahia(b, ens ? ens.ambitos : []);
    console.log(`  bahia ${b}: ${JSON.stringify(c)}`);
  }
  await pool.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
