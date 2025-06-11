import axios from 'axios';

// Cache for validated tokens
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access token required',
        service: 'Notification Service'
      });
    }

    const token = authHeader.split(' ')[1];

    // Check cache first
    const cacheKey = token;
    const cachedResult = tokenCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_TTL)) {
      req.user = cachedResult.user;
      return next();
    }

    // Validate with Auth Service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    
    const response = await axios.post(`${authServiceUrl}/auth/validate-token`, {
      token: token
    }, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.data.valid) {
      tokenCache.delete(cacheKey);
      return res.status(401).json({ 
        error: response.data.error || 'Invalid token',
        service: 'Notification Service'
      });
    }

    // Cache result
    tokenCache.set(cacheKey, {
      user: response.data.user,
      timestamp: Date.now()
    });

    req.user = response.data.user;
    next();

  } catch (error) {
    console.error('❌ Notification Service auth error:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'TIMEOUT') {
      return res.status(503).json({ 
        error: 'Authentication service unavailable',
        service: 'Notification Service'
      });
    }

    return res.status(401).json({ 
      error: 'Authentication failed',
      service: 'Notification Service'
    });
  }
};

// Middleware for WebSocket authentication
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Validate with Auth Service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    
    const response = await axios.post(`${authServiceUrl}/auth/validate-token`, {
      token: token
    }, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.data.valid) {
      return next(new Error(`Authentication error: ${response.data.error}`));
    }

    socket.user = response.data.user;
    socket.userId = response.data.user.id || response.data.user.userId;
    next();

  } catch (error) {
    console.error('❌ Socket auth error:', error.message);
    next(new Error('Authentication error'));
  }
};

export { authMiddleware, socketAuthMiddleware };
