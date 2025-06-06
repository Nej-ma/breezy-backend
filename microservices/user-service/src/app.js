import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Import des routes
import userRoutes from './routes/users.js';

// Configuration de l'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Breezy User Service API',
      version: '1.0.0',
      description: 'API de gestion des utilisateurs pour Breezy - Réseau social',
      contact: {
        name: 'Breezy Team',
        email: 'contact@breezy.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Serveur de développement User Service'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js'] // Chemin vers les fichiers contenant les annotations Swagger
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configuration MongoDB
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const mongoDB = process.env.MONGODB_URI || 'mongodb://mongodb-user:27017/breezy_users';
    await mongoose.connect(mongoDB);
    console.log('✅ User Service: Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ User Service: MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ User Service: MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ User Service: MongoDB connection error:', error);
});

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

// Middlewares
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'User Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/users', userRoutes);

// Documentation Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Breezy User Service API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: 'Breezy User Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/users',
      docs: '/docs'
    }
  });
});



// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ User Service Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    service: 'User Service'
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    service: 'User Service',
    path: req.originalUrl
  });
});

// Connexion à la base de données et démarrage du serveur
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`User Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
});

export default app;