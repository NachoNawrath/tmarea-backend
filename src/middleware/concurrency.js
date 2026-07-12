/**
 * MIDDLEWARE: RATE LIMITING + CONCURRENCY CONTROL
 *
 * Proteger endpoints de saturación
 */

const { checkRateLimit } = require('../config/redis');

function rateLimitMiddleware(maxRequests = 100, windowSeconds = 60) {
  return async (req, res, next) => {
    const userId = req.user?.id || req.ip;

    try {
      const limit = await checkRateLimit(userId, maxRequests, windowSeconds);

      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', limit.remaining);

      if (!limit.allowed) {
        res.set('Retry-After', limit.retryAfter);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retry_after: limit.retryAfter,
          message: `Máximo ${maxRequests} solicitudes por ${windowSeconds}s`
        });
      }

      next();
    } catch (err) {
      console.error('RateLimit middleware error:', err);
      next();
    }
  };
}

const concurrencyTracking = new Map();

function concurrencyMiddleware(maxConcurrent = 10) {
  return async (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const current = concurrencyTracking.get(userId) || 0;

    if (current >= maxConcurrent) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: `Demasiadas solicitudes simultáneas (máx ${maxConcurrent}). Reintentar en unos segundos.`,
        retry_after: 5
      });
    }

    concurrencyTracking.set(userId, current + 1);

    res.on('finish', () => {
      const newCount = concurrencyTracking.get(userId) - 1;
      if (newCount <= 0) {
        concurrencyTracking.delete(userId);
      } else {
        concurrencyTracking.set(userId, newCount);
      }
    });

    next();
  };
}

function timeoutMiddleware(ms = 30000) {
  return (req, res, next) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: `Solicitud excedió ${ms}ms. Reintentar.`,
          timeout_ms: ms
        });
      }
    }, ms);

    res.on('finish', () => clearTimeout(timeoutId));
    res.on('close', () => clearTimeout(timeoutId));

    next();
  };
}

class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`⚠️ Circuit breaker OPEN (${this.failureCount} fallos)`);

      setTimeout(() => {
        this.state = 'HALF_OPEN';
        console.warn('⚠️ Circuit breaker HALF_OPEN');
      }, this.resetTimeout);
    }
  }

  isOpen() {
    return this.state === 'OPEN';
  }

  isHalfOpen() {
    return this.state === 'HALF_OPEN';
  }
}

const sitportBreaker = new CircuitBreaker(5, 60000);
const weatherBreaker = new CircuitBreaker(5, 60000);

function circuitBreakerMiddleware(breaker) {
  return (req, res, next) => {
    if (breaker.isOpen()) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'El servicio está temporalmente no disponible. Reintentar en unos minutos.',
        retry_after: 60
      });
    }

    next();
  };
}

module.exports = {
  rateLimitMiddleware,
  concurrencyMiddleware,
  timeoutMiddleware,
  circuitBreakerMiddleware,
  CircuitBreaker,
  sitportBreaker,
  weatherBreaker
};
