// swagger-aggregator/app.js
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import swaggerUi from 'swagger-ui-express';

const app = express();
const PORT = process.env.PORT || 3005;

// Configuration CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:80'],
  credentials: true
}));

app.use(express.json());

// Configuration des services
const SERVICES = {
  auth: {
    name: 'Authentication Service',
    url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    path: '/api/auth'
  },
  user: {
    name: 'User Service', 
    url: process.env.USER_SERVICE_URL || 'http://user-service:3002',
    path: '/api/users'
  },
  post: {
    name: 'Post Service',
    url: process.env.POST_SERVICE_URL || 'http://post-service:3003', 
    path: '/api/posts'
  },
  notification: {
    name: 'Notification Service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
    path: '/api/notifications'
  }
};

// Fonction pour récupérer les specs Swagger d'un service
const getServiceSwaggerSpec = async (serviceName, serviceUrl) => {
  try {
    console.log(`🔍 Fetching Swagger specs for ${serviceName} from ${serviceUrl}`);
    const response = await axios.get(`${serviceUrl}/docs/swagger.json`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn(`⚠️ Could not fetch Swagger specs for ${serviceName}:`, error.message);
    return null;
  }
};

// Merger les spécifications Swagger
const mergeSwaggerSpecs = async () => {
  const baseSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Breezy API - Complete Documentation',
      version: '1.0.0',
      description: 'Documentation complète de l\'API Breezy via Traefik Gateway',
      contact: {
        name: 'Breezy Team',
        email: 'contact@breezy.com'
      }
    },    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Traefik Gateway - Development'
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
            error: { type: 'string' },
            service: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    paths: {},
    tags: [
      { name: 'Authentication', description: 'Gestion de l\'authentification' },
      { name: 'Users', description: 'Gestion des utilisateurs' },
      { name: 'Posts', description: 'Gestion des posts' },
      { name: 'Notifications', description: 'Gestion des notifications' }
    ]
  };

  // Récupérer et merger les specs de chaque service
  for (const [serviceName, config] of Object.entries(SERVICES)) {
    const serviceSpec = await getServiceSwaggerSpec(serviceName, config.url);
    if (serviceSpec && serviceSpec.paths) {
      // Ajouter les paths avec le bon préfixe
      Object.keys(serviceSpec.paths).forEach(path => {
        const newPath = `${config.path}${path}`;
        baseSpec.paths[newPath] = serviceSpec.paths[path];
      });

      // Merger les composants
      if (serviceSpec.components) {
        if (serviceSpec.components.schemas) {
          baseSpec.components.schemas = {
            ...baseSpec.components.schemas,
            ...serviceSpec.components.schemas
          };
        }
      }
    }
  }

  return baseSpec;
};

// Route pour le JSON Swagger unifié
app.get('/swagger.json', async (req, res) => {
  try {
    const mergedSpec = await mergeSwaggerSpecs();
    res.json(mergedSpec);
  } catch (error) {
    console.error('❌ Error merging Swagger specs:', error);
    res.status(500).json({ error: 'Failed to generate documentation' });
  }
});

// Interface Swagger UI unifiée
app.use('/docs', swaggerUi.serve);
app.get('/docs', async (req, res) => {
  try {
    const mergedSpec = await mergeSwaggerSpecs();
    const html = swaggerUi.generateHTML(mergedSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #1DA1F2; }
        .swagger-ui .scheme-container { 
          background: #f8f9fa; 
          padding: 10px; 
          border-radius: 5px; 
          margin-bottom: 20px; 
        }
      `,
      customSiteTitle: 'Breezy API - Documentation Complète',
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
    console.error('❌ Error generating Swagger UI:', error);
    res.status(500).send('Failed to generate documentation');
  }
});

// Page d'accueil avec liens vers les documentations
app.get('/', (req, res) => {
  res.json({
    message: 'Breezy API Gateway - Powered by Traefik',
    version: '1.0.0',
    description: 'API Gateway utilisant Traefik pour le routage des microservices',
    services: Object.fromEntries(
      Object.entries(SERVICES).map(([name, config]) => [name, config.path])
    ),
    documentation: {
      unified: '/docs',
      swagger_json: '/swagger.json',
      individual_services: {
        auth: '/api/auth/docs',
        users: '/api/users/docs', 
        posts: '/api/posts/docs',
        notifications: '/api/notifications/docs'
      }
    },
    endpoints: {
      traefik_dashboard: 'http://localhost:8081',
      health_checks: '/health'
    },
    usage: {
      auth: 'POST /api/auth/login, GET /api/auth/me',
      users: 'GET /api/users, POST /api/users',
      posts: 'GET /api/posts, POST /api/posts',
      notifications: 'GET /api/notifications'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'Swagger Aggregator',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Swagger Aggregator Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    service: 'Swagger Aggregator'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('=====================================');
  console.log(`Swagger Aggregator running on port ${PORT}`);
  console.log(`Unified docs: http://localhost:${PORT}/docs`);
  console.log(`Swagger JSON: http://localhost:${PORT}/swagger.json`);
  console.log('=====================================');
});

export default app;