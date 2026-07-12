/**
 * VESSEL ROUTES V2
 *
 * Con protecciones de concurrencia:
 * - Rate limiting: 100 req/min por usuario
 * - Concurrency: máx 10 requests simultáneos
 * - Queue: procesamiento asíncrono
 */

const express = require('express');
const router = express.Router();
const vesselController = require('../controllers/vesselController_v2');
const { authMiddleware } = require('../middleware/auth');
const {
  rateLimitMiddleware,
  concurrencyMiddleware,
  timeoutMiddleware
} = require('../middleware/concurrency');

router.use(authMiddleware);
router.use(rateLimitMiddleware(100, 60));
router.use(timeoutMiddleware(30000));

router.post(
  '/',
  concurrencyMiddleware(10),
  vesselController.createOrUpdateVessel
);

router.get('/job/:jobId', vesselController.getJobStatus);

router.get('/me', vesselController.getCurrentVessel);

router.delete('/me', vesselController.deleteVessel);

module.exports = router;
