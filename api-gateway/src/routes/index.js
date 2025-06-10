import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { serviceRegistry } from '../config/services.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rate limiting
router.use(rateLimiter);

// Auth service routes (no auth required for login/register)
router.use('/auth', createProxyMiddleware({
    target: serviceRegistry.auth.url,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth': ''
    },
    onError: (err, req, res) => {
        console.error('Auth service proxy error:', err.message);
        res.status(503).json({ error: 'Auth service unavailable' });
    }
}));

// User service routes (auth required for most endpoints)
router.use('/users', authMiddleware, createProxyMiddleware({
    target: serviceRegistry.user.url,
    changeOrigin: true,
    pathRewrite: {
        '^/api/users': ''
    },
    onError: (err, req, res) => {
        console.error('User service proxy error:', err.message);
        res.status(503).json({ error: 'User service unavailable' });
    }
}));

// Post service routes (auth required)
router.use('/posts', authMiddleware, createProxyMiddleware({
    target: serviceRegistry.post.url,
    changeOrigin: true,
    pathRewrite: {
        '^/api/posts': ''
    },
    onError: (err, req, res) => {
        console.error('Post service proxy error:', err.message);
        res.status(503).json({ error: 'Post service unavailable' });
    }
}));

// Notification service routes (auth required)
router.use('/notifications', authMiddleware, createProxyMiddleware({
    target: serviceRegistry.notification.url,
    changeOrigin: true,
    pathRewrite: {
        '^/api/notifications': ''
    },
    onError: (err, req, res) => {
        console.error('Notification service proxy error:', err.message);
        res.status(503).json({ error: 'Notification service unavailable' });
    }
}));

export { router };
