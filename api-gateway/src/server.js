import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthCheck } from './middleware/healthCheck.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.use('/health', healthCheck);

// API routes
app.use('/api', router);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: "Breezy API Gateway",
        version: "1.0.0",
        services: {
            auth: process.env.AUTH_SERVICE_URL || "http://auth-service:3001",
            user: process.env.USER_SERVICE_URL || "http://user-service:3002",
            post: process.env.POST_SERVICE_URL || "http://post-service:3003",
            notification: process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:3004"
        },
        endpoints: {
            health: "/health",
            auth: "/api/auth",
            users: "/api/users",
            posts: "/api/posts",
            notifications: "/api/notifications"
        },
        documentation: "See individual service endpoints for detailed API documentation"
    });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
    console.log(`📋 Health check available at http://localhost:${PORT}/health`);
});
