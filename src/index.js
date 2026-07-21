require('dotenv').config();
'use strict';

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
app.use('/api/mitilidos', mitilidosRoutes);

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
app.use('/api/rutas', rutasRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

