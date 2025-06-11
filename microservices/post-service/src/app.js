import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'; // Ajouté pour l'authentification locale
import axios from 'axios'; // Ajouté pour les appels vers les autres services
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Import des routes
import postRoutes from './routes/posts.js';

// Configuration de l'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Configuration MongoDB
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const mongoDB = process.env.MONGODB_URI || 'mongodb://mongodb-post:27017/breezy_posts';
    await mongoose.connect(mongoDB);
    console.log('✅ Post Service: Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ Post Service: MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Post Service: MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Post Service: MongoDB connection error:', error);
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

// Configuration Swagger pour Post Service
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Breezy Post Service API',
      version: '1.0.0',
      description: 'API de gestion des posts pour Breezy - Service indépendant',
    },
    servers: [
      {
        url: 'http://localhost:3000/api/posts',  
        description: 'Post Service via API Gateway (Recommended)'
      },
      {
        url: `http://localhost:${PORT}`,         
        description: 'Post Service Direct Access'
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
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'Post Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/posts', postRoutes);

// Routes Swagger
app.get('/docs/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Breezy Post Service API Documentation'
}));

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: 'Breezy Post Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      posts: '/posts'
    }
  });
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ Post Service Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    service: 'Post Service'
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    service: 'Post Service',
    path: req.originalUrl
  });
});

// Connexion à la base de données et démarrage du serveur
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Post Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
});

export default app;