const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Rutas
const puertosRoutes = require('./routes/puertos');
app.use('/api/puertos', puertosRoutes);
const centrosRouter = require('./services/centros');
app.use('/api/centros', centrosRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});