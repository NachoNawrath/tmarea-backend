const express = require('express');
const cors = require('cors');
const puertosRouter = require('./routes/puertos');
const centrosRouter = require('./routes/centros');

const app = express();
app.use(cors());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/puertos', puertosRouter);
app.use('/api/centros', centrosRouter);

app.listen(3000, () => console.log('Backend running on port 3000'));
