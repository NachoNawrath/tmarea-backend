/**
 * QUEUE SYSTEM - Bull
 *
 * Procesar trabajos pesados sin bloquear HTTP
 */

const Queue = require('bull');
const redis = require('./redis');

const QUEUES = {
  DISPLACEMENT_CALCULATION: 'displacement-calc',
  ETA_CALCULATION: 'eta-calc',
  SITPORT_QUERY: 'sitport-query',
  WEATHER_FORECAST: 'weather-forecast'
};

const displacementQueue = new Queue(QUEUES.DISPLACEMENT_CALCULATION, {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 3600
    }
  }
});

const etaQueue = new Queue(QUEUES.ETA_CALCULATION, {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 }
  }
});

const sitportQueue = new Queue(QUEUES.SITPORT_QUERY, {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 3600 }
  }
});

const weatherQueue = new Queue(QUEUES.WEATHER_FORECAST, {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 3600 }
  }
});

displacementQueue.on('completed', (job) => {
  console.log(`✓ Displacement calc completado (${job.id})`);
});

displacementQueue.on('failed', (job, err) => {
  console.error(`✗ Displacement calc fallido (${job.id}):`, err.message);
});

etaQueue.on('completed', (job) => {
  console.log(`✓ ETA calc completado (${job.id})`);
});

etaQueue.on('failed', (job, err) => {
  console.error(`✗ ETA calc fallido (${job.id}):`, err.message);
});

sitportQueue.on('completed', (job) => {
  console.log(`✓ SITPORT query completado (${job.id})`);
});

sitportQueue.on('failed', (job, err) => {
  console.error(`✗ SITPORT query fallido (${job.id}):`, err.message);
});

weatherQueue.on('completed', (job) => {
  console.log(`✓ Weather forecast completado (${job.id})`);
});

weatherQueue.on('failed', (job, err) => {
  console.error(`✗ Weather forecast fallido (${job.id}):`, err.message);
});

async function enqueueDisplacementCalc(vesselData) {
  const job = await displacementQueue.add(
    vesselData,
    {
      jobId: `disp-${vesselData.user_id}-${Date.now()}`,
      priority: 5
    }
  );
  return job.id;
}

async function enqueueEtaCalc(voyageData) {
  const job = await etaQueue.add(
    voyageData,
    {
      jobId: `eta-${voyageData.voyage_id}-${Date.now()}`,
      priority: 8
    }
  );
  return job.id;
}

async function enqueueSitportQuery(query) {
  const job = await sitportQueue.add(
    query,
    {
      jobId: `sitport-${query.puerto}-${Date.now()}`,
      priority: 8
    }
  );
  return job.id;
}

async function enqueueWeatherForecast(params) {
  const job = await weatherQueue.add(
    params,
    {
      jobId: `weather-${params.lat}-${params.lon}-${Date.now()}`,
      priority: 7
    }
  );
  return job.id;
}

async function getJobStatus(jobId, queueName) {
  const queue = {
    [QUEUES.DISPLACEMENT_CALCULATION]: displacementQueue,
    [QUEUES.ETA_CALCULATION]: etaQueue,
    [QUEUES.SITPORT_QUERY]: sitportQueue,
    [QUEUES.WEATHER_FORECAST]: weatherQueue
  }[queueName];

  if (!queue) return null;

  const job = await queue.getJob(jobId);
  if (!job) return null;

  return {
    id: job.id,
    state: await job.getState(),
    progress: job.progress(),
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason
  };
}

module.exports = {
  QUEUES,
  displacementQueue,
  etaQueue,
  sitportQueue,
  weatherQueue,
  enqueueDisplacementCalc,
  enqueueEtaCalc,
  enqueueSitportQuery,
  enqueueWeatherForecast,
  getJobStatus
};
