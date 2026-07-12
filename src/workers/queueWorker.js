/**
 * QUEUE WORKERS
 *
 * Procesadores asíncronos para queues.
 * Ejecutar en proceso separado: node src/workers/queueWorker.js
 */

const {
  displacementQueue,
  etaQueue,
  sitportQueue,
  weatherQueue
} = require('../config/queue');

const {
  calculateDisplacementByType,
  calculateDraft,
  validateDisplacement
} = require('../utils/displacementCalculator');

const { getOrCache } = require('../config/redis');

displacementQueue.process(10, async (job) => {
  const { eslora, manga, puntal, tipo_nave, trg, user_id } = job.data;

  console.log(`Processing displacement calc (${job.id})`);

  try {
    const displacement = calculateDisplacementByType(eslora, manga, puntal || 2.0, tipo_nave);
    const draft = calculateDraft(displacement, eslora, manga);
    const validation = validateDisplacement(trg, displacement);

    return {
      displacement,
      draft,
      validation,
      timestamp: new Date()
    };
  } catch (err) {
    console.error(`Displacement calc error (${job.id}):`, err);
    throw err;
  }
});

etaQueue.process(15, async (job) => {
  const {
    voyage_id,
    vessel_id,
    distance_nm,
    cargo_weight,
    displacement_empty,
    consumo_nominal,
    capacidad_fuel,
    swell_height,
    wind_speed
  } = job.data;

  console.log(`Processing ETA calc (${job.id})`);

  try {
    let velocity_adjusted = 8.0;
    if (swell_height > 1.5) velocity_adjusted *= 0.90;
    if (swell_height > 2.5) velocity_adjusted *= 0.85;
    if (wind_speed > 15) velocity_adjusted *= 0.95;

    const travel_hours = distance_nm / velocity_adjusted;
    const eta = new Date(Date.now() + travel_hours * 3600000);

    return {
      distance_nm,
      velocity_adjusted,
      travel_hours,
      eta,
      timestamp: new Date()
    };
  } catch (err) {
    console.error(`ETA calc error (${job.id}):`, err);
    throw err;
  }
});

sitportQueue.process(5, async (job) => {
  const { puerto, tipo_consulta } = job.data;

  console.log(`Processing SITPORT query (${job.id}): ${puerto}`);

  try {
    const result = await getOrCache(
      `sitport:${puerto}:${tipo_consulta}`,
      async () => {
        return {
          puerto,
          sonda_actual: 2.1,
          sonda_minima: 1.5,
          estado: 'operativo',
          restricciones: [],
          timestamp: new Date()
        };
      },
      600
    );

    return result;
  } catch (err) {
    console.error(`SITPORT query error (${job.id}):`, err);
    throw err;
  }
});

weatherQueue.process(5, async (job) => {
  const { lat, lon, days = 1 } = job.data;

  console.log(`Processing weather forecast (${job.id}): ${lat},${lon}`);

  try {
    const result = await getOrCache(
      `weather:${lat}:${lon}:${days}`,
      async () => {
        return {
          lat,
          lon,
          forecast: [
            {
              time: new Date(),
              temperature: 12,
              swell_height: 1.2,
              wind_speed: 10,
              wind_direction: 'NW'
            }
          ],
          timestamp: new Date()
        };
      },
      600
    );

    return result;
  } catch (err) {
    console.error(`Weather forecast error (${job.id}):`, err);
    throw err;
  }
});

const gracefulShutdown = async () => {
  console.log('\n🛑 Iniciando shutdown graceful...');

  try {
    await displacementQueue.close();
    await etaQueue.close();
    await sitportQueue.close();
    await weatherQueue.close();
    console.log('✓ Queues cerradas');
  } catch (err) {
    console.error('Error cerrando queues:', err);
  }

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

console.log('✓ Queue workers iniciados');
