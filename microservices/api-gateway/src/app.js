import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';

// Configuration de l'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des services
const SERVICES = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    path: '/api/auth'
  },
  user: {
    url: process.env.USER_SERVICE_URL || 'http://user-service:3002',
    path: '/api/users'
  },
  post: {
    url: process.env.POST_SERVICE_URL || 'http://post-service:3003',
    path: '/api/posts'
  },
  notification: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
    path: '/api/notifications'
  }
};

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Plus élevé pour l'API Gateway
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Rate limiting spécifique pour l'auth (plus strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 tentatives par IP
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  }
});

app.use(globalLimiter);

// Middlewares
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuration Swagger globale
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Breezy API Gateway',
      version: '1.0.0',
      description: 'API Gateway centralisant tous les microservices de Breezy - Réseau social type Twitter',
      contact: {
        name: 'Breezy Team',
        email: 'contact@breezy.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'API Gateway - Development'
      },
      {
        url: `http://localhost:${PORT}/api/auth`,
        description: 'Auth Service via Gateway'
      },
      {
        url: `http://localhost:${PORT}/api/users`,
        description: 'User Service via Gateway'
      },
      {
        url: `http://localhost:${PORT}/api/posts`,
        description: 'Post Service via Gateway'
      },
      {
        url: `http://localhost:${PORT}/api/notifications`,
        description: 'Notification Service via Gateway'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenu via /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Message d\'erreur'
            },
            service: {
              type: 'string',
              description: 'Service ayant généré l\'erreur'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            service: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy']
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            version: {
              type: 'string'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Gateway',
        description: 'Endpoints de l\'API Gateway'
      },
      {
        name: 'Authentication',
        description: 'Gestion de l\'authentification'
      },
      {
        name: 'Users',
        description: 'Gestion des utilisateurs'
      },
      {
        name: 'Posts',
        description: 'Gestion des posts'
      },
      {
        name: 'Notifications',
        description: 'Gestion des notifications'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/app.js'] // Inclure ce fichier pour les routes Gateway
};

const specs = swaggerJsdoc(swaggerOptions);

// Fonction pour récupérer les specs Swagger des microservices
const getServiceSwaggerSpec = async (serviceName, serviceUrl) => {
  try {
    console.log(`🔍 Récupération des specs Swagger pour ${serviceName} depuis ${serviceUrl}`);
    const response = await axios.get(`${serviceUrl}/docs/swagger.json`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn(`⚠️ Impossible de récupérer les specs Swagger pour ${serviceName}:`, error.message);
    return null;
  }
};

// Merger les spécifications Swagger
const mergeSwaggerSpecs = async () => {
  const mergedSpec = { ...specs };
  
  // Initialiser les paths si ils n'existent pas
  if (!mergedSpec.paths) {
    mergedSpec.paths = {};
  }
  
  for (const [serviceName, config] of Object.entries(SERVICES)) {
    const serviceSpec = await getServiceSwaggerSpec(serviceName, config.url);
    if (serviceSpec && serviceSpec.paths) {
      // Ajouter les paths du service avec le préfixe approprié
      Object.keys(serviceSpec.paths).forEach(path => {
        const newPath = `${config.path}${path}`;
        mergedSpec.paths[newPath] = serviceSpec.paths[path];
      });
      
      // Merger les composants si ils existent
      if (serviceSpec.components) {
        if (!mergedSpec.components) {
          mergedSpec.components = {};
        }
        if (serviceSpec.components.schemas) {
          if (!mergedSpec.components.schemas) {
            mergedSpec.components.schemas = {};
          }
          mergedSpec.components.schemas = {
            ...mergedSpec.components.schemas,
            ...serviceSpec.components.schemas
          };
        }
        if (serviceSpec.components.securitySchemes) {
          if (!mergedSpec.components.securitySchemes) {
            mergedSpec.components.securitySchemes = {};
          }
          mergedSpec.components.securitySchemes = {
            ...mergedSpec.components.securitySchemes,
            ...serviceSpec.components.securitySchemes
          };
        }
      }
    }
  }
  
  return mergedSpec;
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check de l'API Gateway
 *     tags: [Gateway]
 *     responses:
 *       200:
 *         description: Gateway healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'API Gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: SERVICES
  });
});

/**
 * @swagger
 * /health/services:
 *   get:
 *     summary: Health check de tous les microservices
 *     tags: [Gateway]
 *     responses:
 *       200:
 *         description: Status de tous les services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gateway:
 *                   $ref: '#/components/schemas/HealthCheck'
 *                 services:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/HealthCheck'
 */
app.get('/health/services', async (req, res) => {
  const healthChecks = {
    gateway: {
      service: 'API Gateway',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    services: {}
  };

  // Vérifier la santé de chaque microservice
  for (const [serviceName, config] of Object.entries(SERVICES)) {
    try {
      const response = await axios.get(`${config.url}/health`, { timeout: 5000 });
      healthChecks.services[serviceName] = {
        ...response.data,
        status: 'healthy'
      };
    } catch (error) {
      healthChecks.services[serviceName] = {
        service: serviceName,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  res.json(healthChecks);
});

// Documentation Swagger MERGÉE avec tous les services
app.get('/docs/swagger.json', async (req, res) => {
  try {
    const mergedSpec = await mergeSwaggerSpecs();
    res.json(mergedSpec);
  } catch (error) {
    console.error('❌ Erreur lors du merge des specs Swagger:', error);
    res.json(specs); // Fallback sur les specs de base
  }
});

// Interface Swagger UI avec specs mergées
app.use('/docs', swaggerUi.serve);
app.get('/docs', async (req, res) => {
  try {
    const mergedSpec = await mergeSwaggerSpecs();
    const html = swaggerUi.generateHTML(mergedSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #1DA1F2; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
      `,
      customSiteTitle: 'Breezy API Gateway - Documentation Complète',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2
      }
    });
    res.send(html);
  } catch (error) {
    console.error('❌ Erreur lors de la génération de Swagger UI:', error);
    // Fallback sur la version simple
    res.send(swaggerUi.generateHTML(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Breezy API Gateway',
      swaggerOptions: { persistAuthorization: true }
    }));
  }
});

// Configuration des proxies pour chaque service (APRÈS les routes de l'API Gateway)
Object.entries(SERVICES).forEach(([serviceName, config]) => {
  console.log(`🔗 Configuration du proxy ${config.path} -> ${config.url}`);
  
  // Appliquer le rate limiting spécifique pour l'auth
  if (serviceName === 'auth') {
    app.use(config.path, authLimiter);
  }
  
  // Proxy pour toutes les routes du service (y compris /docs)
  app.use(config.path, createProxyMiddleware({
    target: config.url,
    changeOrigin: true,
    pathRewrite: {
      [`^${config.path}`]: '', // Retirer le préfixe /api/[service]
    },
    onError: (err, req, res) => {
      console.error(`❌ Proxy error for ${serviceName}:`, err.message);
      res.status(503).json({
        error: `Service ${serviceName} unavailable`,
        service: 'API Gateway',
        timestamp: new Date().toISOString()
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🔄 Proxying ${req.method} ${req.originalUrl} to ${serviceName}`);
    },
    timeout: 30000,
    proxyTimeout: 30000,
    cookieDomainRewrite: false,
    cookiePathRewrite: false
  }));
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Page d'accueil de l'API Gateway
 *     tags: [Gateway]
 *     responses:
 *       200:
 *         description: Informations sur l'API Gateway
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 services:
 *                   type: object
 *                 endpoints:
 *                   type: object
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Breezy API Gateway - Réseau social type Twitter',
    version: '1.0.0',
    description: 'Point d\'entrée unique pour tous les microservices Breezy',
    services: Object.fromEntries(
      Object.entries(SERVICES).map(([name, config]) => [name, config.path])
    ),
    endpoints: {
      health: '/health',
      servicesHealth: '/health/services',
      documentation: '/docs',
      swaggerJson: '/docs/swagger.json'
    },
    usage: {
      auth: 'POST /api/auth/login, GET /api/auth/me, GET /api/auth/docs',
      users: 'GET /api/users, POST /api/users, GET /api/users/docs'
    },
    documentation: {
      gateway: '/docs',
      authService: '/api/auth/docs',
      userService: '/api/users/docs'
    }
  });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ API Gateway Error:', err.stack);
  res.status(500).json({
    error: 'Internal Gateway Error',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    service: 'API Gateway',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableServices: Object.keys(SERVICES).map(name => SERVICES[name].path)
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ===================================');
  console.log(`📡 API Gateway running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Gateway docs: http://localhost:${PORT}/docs`);
  console.log('🔗 Services routing:');
  Object.entries(SERVICES).forEach(([name, config]) => {
    console.log(`   ${name.toUpperCase()}: http://localhost:${PORT}${config.path} -> ${config.url}`);
    console.log(`   ${name.toUpperCase()} DOCS: http://localhost:${PORT}${config.path}/docs`);
  });
  console.log('🚀 ===================================');
});

export default app;