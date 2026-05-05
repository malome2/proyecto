const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const juegosRoutes = require('./routes/juegos.routes');
const recomendacionesRoutes = require('./routes/recomendaciones.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const { globalLimiter } = require('./middleware/rateLimiter');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permite peticiones sin origin (Postman, curl) y orígenes en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido — ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(globalLimiter);
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/juegos', juegosRoutes);
app.use('/api/recomendaciones', recomendacionesRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/', (req, res) => {
  res.send('API Museo Videojuegos funcionando');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
