import axios from 'axios';

// Cache for validated tokens (simple in-memory cache)
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access token required',
        service: 'Post Service'
      });
    }

    const token = authHeader.split(' ')[1];

    // Check cache first for performance
    const cacheKey = token;
    const cachedResult = tokenCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_TTL)) {
      console.log('🚀 Using cached token validation');
      req.user = cachedResult.user;
      return next();
    }

    // Validate token with Auth Service
    console.log('🔍 Validating token with Auth Service...');
    
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    
    const response = await axios.post(`${authServiceUrl}/auth/validate-token`, {
      token: token
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.valid) {
      // Clear from cache if invalid
      tokenCache.delete(cacheKey);
      
      return res.status(401).json({ 
        error: response.data.error || 'Invalid token',
        service: 'Post Service'
      });
    }

    // Cache the result
    tokenCache.set(cacheKey, {
      user: response.data.user,
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (tokenCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of tokenCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          tokenCache.delete(key);
        }
      }
    }

    req.user = response.data.user;
    next();

  } catch (error) {
    console.error('❌ Post Service auth middleware error:', error.message);
    
    // If Auth Service is down, reject the request
    if (error.code === 'ECONNREFUSED' || error.code === 'TIMEOUT') {
      return res.status(503).json({ 
        error: 'Authentication service unavailable',
        service: 'Post Service'
      });
    }

    return res.status(401).json({ 
      error: 'Authentication failed',
      service: 'Post Service'
    });
  }
};

export default authMiddleware;
