import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Configuration de l'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des services
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  post: process.env.POST_SERVICE_URL || 'http://localhost:3003',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004'
};

// Middlewares de sécurité
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Plus élevé pour la gateway
  message: {
    error: 'Too many requests from this IP, please try again later.',
    service: 'API Gateway'
  }
});
app.use(globalLimiter);

// Middlewares
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check de la gateway
app.get('/health', async (req, res) => {
  const healthChecks = {};
  
  // Vérifier la santé de chaque service
  const services_health = await Promise.allSettled([
    fetch(`${services.auth}/health`).then(r => r.json()).catch(() => ({ status: 'unhealthy' })),
    fetch(`${services.user}/health`).then(r => r.json()).catch(() => ({ status: 'unhealthy' })),
    fetch(`${services.post}/health`).then(r => r.json()).catch(() => ({ status: 'unhealthy' })),
    fetch(`${services.notification}/health`).then(r => r.json()).catch(() => ({ status: 'unhealthy' }))
  ]);

  healthChecks.auth = services_health[0].status === 'fulfilled' ? services_health[0].value : { status: 'unhealthy' };
  healthChecks.user = services_health[1].status === 'fulfilled' ? services_health[1].value : { status: 'unhealthy' };
  healthChecks.post = services_health[2].status === 'fulfilled' ? services_health[2].value : { status: 'unhealthy' };
  healthChecks.notification = services_health[3].status === 'fulfilled' ? services_health[3].value : { status: 'unhealthy' };

  const allHealthy = Object.values(healthChecks).every(service => service.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    service: 'API Gateway',
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: healthChecks
  });
});

// Configuration des proxies pour chaque microservice
const createProxy = (target, pathRewrite = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onError: (err, req, res) => {
      console.error(`❌ Proxy error for ${req.url}:`, err.message);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: 'API Gateway',
        timestamp: new Date().toISOString()
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🔄 Proxying ${req.method} ${req.url} to ${target}`);
    }
  });
};

// Routes vers les microservices
app.use('/api/auth', createProxy(services.auth, { '^/api/auth': '/auth' }));
app.use('/api/users', createProxy(services.user, { '^/api/users': '/users' }));
app.use('/api/posts', createProxy(services.post, { '^/api/posts': '/posts' }));
app.use('/api/notifications', createProxy(services.notification, { '^/api/notifications': '/notifications' }));

// Documentation routes for each service
app.use('/docs/auth', createProxy(services.auth, { '^/docs/auth': '/docs' }));
app.use('/docs/users', createProxy(services.user, { '^/docs/users': '/docs' }));
app.use('/docs/posts', createProxy(services.post, { '^/docs/posts': '/docs' }));
app.use('/docs/notifications', createProxy(services.notification, { '^/docs/notifications': '/docs' }));

// Routes directes (sans /api prefix) pour compatibilité
app.use('/auth', createProxy(services.auth));
app.use('/users', createProxy(services.user));
app.use('/posts', createProxy(services.post));
app.use('/notifications', createProxy(services.notification));

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: 'Breezy API Gateway',
    version: '1.0.0',
    services: {
      auth: `${services.auth}`,
      user: `${services.user}`,
      post: `${services.post}`,
      notification: `${services.notification}`
    },
    endpoints: {
      health: '/health',
      auth: '/api/auth or /auth',
      users: '/api/users or /users',
      posts: '/api/posts or /posts',
      notifications: '/api/notifications or /notifications'
    },
    documentation: 'See individual service endpoints for detailed API documentation'
  });
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ API Gateway Error:', err.stack);
  res.status(500).json({
    error: 'Gateway error occurred',
    service: 'API Gateway',
    timestamp: new Date().toISOString()
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    service: 'API Gateway',
    path: req.originalUrl,
    availableServices: ['/auth', '/users', '/posts', '/notifications']
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Gateway URL: http://localhost:${PORT}`);
  console.log('Microservices:');
  Object.entries(services).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });
});

export default app;