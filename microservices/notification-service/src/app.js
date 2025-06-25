import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Import du middleware d'authentification local
import { authMiddleware, socketAuthMiddleware } from './middleware/auth.middleware.js';

// Import routes
import notificationRoutes from './routes/notifications.js';
import messageRoutes from './routes/messages.js';

// Import services
import { cleanupOldNotifications, cleanupOldMessages } from './services/notification.service.js';

// Configuration de l'environnement
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3004;

// Configuration MongoDB
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const mongoDB = process.env.MONGODB_URI || 'mongodb://mongodb-notification:27017/breezy_notifications';
    await mongoose.connect(mongoDB);
    console.log('✅ Notification Service: Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ Notification Service: MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Notification Service: MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Notification Service: MongoDB connection error:', error);
});

// Middlewares de sécurité
app.use(helmet());

// CORS géré par Traefik - pas besoin de configuration ici

// Middlewares
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.IO with distributed authentication
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  console.log(`🔌 User ${socket.user.username} (${socket.userId}) connected to notifications`);

  socket.join(`user-${socket.userId}`);
  console.log(`👤 User ${socket.user.username} joined notifications room`);

  // Send unread notification count on connection
  socket.emit('notificationCount', { 
    unread: 0 // This will be updated by client calling the API
  });

  // Handle client ping to keep connection alive
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle joining specific conversation rooms for private messages
  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation-${conversationId}`);
    console.log(`👥 User ${socket.user.username} joined conversation ${conversationId}`);
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
    console.log(`👥 User ${socket.user.username} left conversation ${conversationId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User ${socket.user.username} disconnected from notifications`);
  });
});

// Rendre io accessible dans les routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'Notification Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    websocket: 'active'
  });
});

// Routes API pour notifications
app.use('/', notificationRoutes);
app.use('/', messageRoutes);

// Legacy endpoint for backward compatibility
app.get('/notifications', (req, res) => {
  res.json({
    message: 'Notification Service API',
    endpoints: {
      health: '/health',
      notifications: '/',
      messages: '/messages',
      websocket: 'ws://localhost:' + PORT
    }
  });
});

// Protected endpoint for sending notifications
app.post('/notifications/send', authMiddleware, (req, res) => {
  const { userId, type, message, data } = req.body;
  
  // Check permissions (user can only send to themselves unless admin)
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden: Cannot send notifications for other users',
      service: 'Notification Service'
    });
  }
  
  // Emit notification
  io.to(`user-${userId}`).emit('notification', {
    type,
    message,
    data,
    timestamp: new Date().toISOString(),
    from: {
      id: req.user.id,
      username: req.user.username
    }
  });

  res.status(200).json({
    success: true,
    message: 'Notification sent successfully'
  });
});

// Route par défaut
app.get('/', (req, res) => {
  res.json({
    message: 'Breezy Notification Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      notifications: '/notifications',
      websocket: 'ws://localhost:' + PORT
    }
  });
});

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Breezy Notification Service API',
      version: '1.0.0',
      description: 'API de notifications temps réel pour Breezy',
    },
    servers: [
      {
        url: 'http://localhost:8080/api/notifications',
        description: 'Notification Service via API Gateway'
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
  apis: ['./src/routes/*.js', './src/app.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Routes Swagger
app.get('/docs/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Breezy Notification Service API Documentation'
}));

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ Notification Service Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    service: 'Notification Service'
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    service: 'Notification Service',
    path: req.originalUrl
  });
});

// Connexion à la base de données et démarrage du serveur
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Notification Service running on port ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket server active for real-time notifications`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
    
    // Schedule cleanup tasks (run daily at 2 AM)
    const scheduleCleanup = () => {
      const now = new Date();
      const tomorrow2AM = new Date(now);
      tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
      tomorrow2AM.setHours(2, 0, 0, 0);
      
      const msUntil2AM = tomorrow2AM.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          await cleanupOldNotifications();
          await cleanupOldMessages();
        } catch (error) {
          console.error('❌ Scheduled cleanup failed:', error);
        }
        
        // Schedule next cleanup (24 hours later)
        setInterval(async () => {
          try {
            await cleanupOldNotifications();
            await cleanupOldMessages();
          } catch (error) {
            console.error('❌ Scheduled cleanup failed:', error);
          }
        }, 24 * 60 * 60 * 1000); // 24 hours
      }, msUntil2AM);
    };
    
    scheduleCleanup();
  });
});

export default app;