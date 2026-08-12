require('dotenv').config();
'use strict';

const BOOT_T0 = Date.now();

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Rutas
const puertosRoutes = require('./routes/puertos');
app.use('/api/puertos', puertosRoutes);

const centrosRouter = require('./routes/centros');
const centrosService = require('./services/centros-service');
centrosService.loadCentros();
app.use('/api/centros', centrosRouter);

const mitilidosRoutes = require('./routes/mitilidos-routes');
const mitilidosService = require('./services/mitilidos-service');
mitilidosService.loadMitilidos();
app.use('/api/concesiones', mitilidosRoutes);

const marineWeatherRoutes = require('./routes/marine-weather-routes');
app.use('/api/marine-weather', marineWeatherRoutes);

const sitportRoutes = require('./routes/sitport-routes');
app.use('/api/sitport', sitportRoutes);

const navigationRoutes = require('./routes/navigation-routes');
app.use('/api', navigationRoutes);
const mapRoutes = require('./routes/map-routes');
app.use('/api/mapa', mapRoutes);
const voyageReportRoutes = require('./routes/voyage-report-routes');
app.use('/api/viaje', voyageReportRoutes);

const rutasRoutes = require('./routes/routes-routes');
const rasterRouterService = require('./services/raster-router-service');
// Motor único de rutas: raster A* jerárquico (spec §7). Se calienta el tile
// de arranque; los demás tiles de cobertura se cargan on-demand según las
// coordenadas de la ruta (registry en raster-router-service.js).
rasterRouterService.warmup('AUSTRAL_N');
app.use('/api/rutas', rutasRoutes);

const tideRoutes = require('./routes/tide-routes');
app.use('/api/tide', tideRoutes);

const supportRoutes = require('./routes/support-routes');
app.use('/api/support', supportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─────────────────────────────────────────────────────────────────────────────
// GUARD DE ARRANQUE — E1. BLOQUEANTE, y corre ANTES de escuchar.
//
// Es de naturaleza distinta al de drift (más abajo), que es informativo y
// declara "no bloquea ni demora el arranque": ahí una fuente externa caída no
// puede tumbar el servicio. Acá es al revés — el servicio NO puede levantarse
// respondiendo con una capa declarada como andamio de medición, porque
// respondería mal y sin avisar. Por eso este detiene y aquel informa.
// ─────────────────────────────────────────────────────────────────────────────
try {
  require('./services/andamio-medicion').verificarEnArranque();
} catch (e) {
  console.error('');
  console.error('ARRANQUE DETENIDO — ' + e.message);
  console.error('');
  console.error('El backend no levanta con una capa de andamio declarada como capa del motor.');
  console.error('Se corrige en data/decreto/capa_consultada.json. Ver src/services/andamio-medicion.js.');
  process.exit(1);
}

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const mem = process.memoryUsage();
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Boot: ${Date.now() - BOOT_T0}ms | RSS: ${(mem.rss / 1048576).toFixed(1)}MB | heapUsed: ${(mem.heapUsed / 1048576).toFixed(1)}MB`);

  // Drift del catálogo de bahías (E0.1). Corre desacoplado: no bloquea el
  // arranque, no toca ningún flujo de veredicto y no cambia ninguna respuesta.
  // Solo deja rastro para el equipo — condición del owner sobre D8.
  require('./services/drift-arranque').revisarDriftEnArranque();
});

