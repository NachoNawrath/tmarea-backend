/**
 * REDIS CONFIG
 *
 * Cache distribuido + Queue system para concurrencia
 * - Cache: SITPORT, Open-Meteo (TTL 10 min)
 * - Queue: Cálculos ETA, validación desplazamiento (Bull)
 * - Rate limiting: 100 req/min por usuario
 */

const redis = require('redis');
const { createClient } = require('redis');

const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  db: 0,
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis: Máximo de reintentos alcanzado');
        return new Error('Redis reconexión fallida');
      }
      return retries * 100;
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✓ Redis conectado');
});

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Error conectando Redis:', err);
  }
})();

async function getOrCache(key, fetchFn, ttl = 600) {
  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const value = await fetchFn();
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return value;
  } catch (err) {
    console.error(`Cache error (${key}):`, err);
    return await fetchFn();
  }
}

async function invalidateCache(key) {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`Invalidate cache error (${key}):`, err);
  }
}

async function checkRateLimit(userId, maxRequests = 100, windowSeconds = 60) {
  const key = `ratelimit:${userId}`;

  try {
    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    if (current > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: await redisClient.ttl(key)
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - current,
      retryAfter: null
    };
  } catch (err) {
    console.error('RateLimit error:', err);
    return { allowed: true };
  }
}

module.exports = {
  redisClient,
  getOrCache,
  invalidateCache,
  checkRateLimit
};
