import express from 'express';
import cors from 'cors';
const puertosRouter = require('./routes/puertos');

const app = express();
app.use(cors());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/puertos', puertosRouter);

app.listen(3000, () => console.log('Backend running on port 3000'));
