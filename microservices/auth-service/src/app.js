import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Import des routes
import authRoutes from './routes/auth.js';

// Configuration de l'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration MongoDB
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const mongoDB = process.env.MONGODB_URI || 'mongodb://mongodb-auth:27017/breezy_auth';
    await mongoose.connect(mongoDB);
    console.log('✅ Auth Service: Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ Auth Service: MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Auth Service: MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Auth Service: MongoDB connection error:', error);
});

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

// Middlewares
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Breezy Auth Service API',
      version: '1.0.0',
      description: 'API d\'authentification pour Breezy',
    },
    servers: [
      {
        url: 'http://localhost:3000/api/auth',  // ✅ Via API Gateway
        description: 'Auth Service via API Gateway (Recommended)'
      },
      {
        url: `http://localhost:${PORT}`,       // ✅ Direct access
        description: 'Auth Service Direct Access'
      }
    ],
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);

// Route pour le JSON Swagger (OBLIGATOIRE pour l'API Gateway)
app.get('/docs/swagger.json', (req, res) => {
  res.json(specs);
});

// Configuration Swagger
app.use('/docs', swaggerUi.serve);
app.get('/docs', (req, res) => {
  const options = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Breezy Auth Service API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    }
  };
  res.send(swaggerUi.generateHTML(specs, options));
});
// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'Auth Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes - Sans préfixe car l'API Gateway ajoute déjà /api/auth
app.use('/', authRoutes);

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: 'Breezy Auth Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/auth',
      docs: '/docs'
    }
  });
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ Auth Service Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    service: 'Auth Service'
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    service: 'Auth Service',
    path: req.originalUrl
  });
});

// Connexion à la base de données et démarrage du serveur
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
});

export default app;