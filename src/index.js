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
const centrosRouter = require('./services/centros');
app.use('/api/centros', centrosRouter);
const mitilidosRoutes = require('./routes/mitilidos-routes');
app.use('/api/mitilidos', mitilidosRoutes);
const sitportRoutes = require('./routes/sitport-routes');
app.use('/api/sitport', sitportRoutes);
const navigationRoutes = require('./routes/navigation-routes');
app.use('/api', navigationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});