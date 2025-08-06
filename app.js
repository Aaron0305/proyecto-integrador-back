import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import usersRoutes from './routes/users.js';
import semestresRoutes from './routes/semestres.js';
import statsRoutes from './routes/statsRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';

const app = express();

// Configurar CORS específicamente
app.use(cors({
  origin: 'http://localhost:5173', // Puerto de tu cliente React
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rutas
app.use('/api/users', usersRoutes);
app.use('/api/semestres', semestresRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/assignments', assignmentRoutes);

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/medidor', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error al conectar a MongoDB:', err));

// Manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

export default app;