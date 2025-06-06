import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middlewares
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.IO pour les notifications temps réel
io.on('connection', (socket) => {
  console.log('🔌 User connected to notifications:', socket.id);

  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined notifications room`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected from notifications:', socket.id);
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
app.get('/notifications', (req, res) => {
  res.json({
    message: 'Notification Service API',
    endpoints: {
      health: '/health',
      websocket: 'ws://localhost:' + PORT
    }
  });
});

// Endpoint pour envoyer une notification
app.post('/notifications/send', (req, res) => {
  const { userId, type, message, data } = req.body;
  
  // Émettre la notification via Socket.IO
  io.to(`user-${userId}`).emit('notification', {
    type,
    message,
    data,
    timestamp: new Date().toISOString()
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
    console.log(`Notification Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`WebSocket server active for real-time notifications`);
  });
});

export default app;