const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const juegosRoutes = require('./routes/juegos.routes');
const recomendacionesRoutes = require('./routes/recomendaciones.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/juegos', juegosRoutes);
app.use('/api/recomendaciones', recomendacionesRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/', (req, res) => {
  res.send('API Museo Videojuegos funcionando');
});

app.listen(3000, () => {
  console.log('Servidor iniciado en puerto 3000');
});
