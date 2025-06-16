import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Local authentication middleware for Auth Service
 * This middleware is used internally by the Auth Service to validate tokens
 * without making HTTP calls to itself (avoiding circular dependencies)
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access token required',
        service: 'Auth Service'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Optional: Check if user still exists and is active
    // This adds a database call but ensures user is still valid
    const user = await User.findById(decoded.userId).select('-password -verificationToken -passwordResetToken');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        service: 'Auth Service'
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({ 
        error: 'User account is not verified',
        service: 'Auth Service'
      });
    }

    if (user.isSuspended) {
      // Check if suspension has expired
      if (user.suspendedUntil && new Date() > user.suspendedUntil) {
        user.isSuspended = false;
        user.suspendedUntil = null;
        await user.save();
      } else {
        return res.status(401).json({
          error: 'User account is suspended',
          service: 'Auth Service'
        });
      }
    }

    // Add user data to request
    req.user = {
      id: user._id,
      userId: user._id, // For compatibility
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      isVerified: user.isVerified,
      role: user.role,
      createdAt: user.createdAt
    };
    
    next();

  } catch (error) {
    console.error('❌ Auth Service local middleware error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        service: 'Auth Service'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        service: 'Auth Service'
      });
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed',
      service: 'Auth Service'
    });
  }
};

export default authMiddleware;
