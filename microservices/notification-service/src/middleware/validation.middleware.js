import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

/**
 * Validation middleware for notification service
 */

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName}: must be a valid MongoDB ObjectId`
      });
    }
    
    next();
  };
};

/**
 * Validate notification type
 */
export const validateNotificationType = (req, res, next) => {
  const { type } = req.body;
  const validTypes = ['like', 'comment', 'follow', 'mention', 'message'];
  
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
    });
  }
  
  next();
};

/**
 * Validate target type
 */
export const validateTargetType = (req, res, next) => {
  const { targetType } = req.body;
  const validTargetTypes = ['Post', 'Comment', 'User', 'PrivateMessage'];
  
  if (targetType && !validTargetTypes.includes(targetType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid target type. Must be one of: ${validTargetTypes.join(', ')}`
    });
  }
  
  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      error: 'Page must be a positive integer'
    });
  }
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be a positive integer between 1 and 100'
    });
  }
  
  next();
};

/**
 * Validate message content
 */
export const validateMessageContent = (req, res, next) => {
  const { content } = req.body;
  
  if (!content || typeof content !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Content is required and must be a string'
    });
  }
  
  if (content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Content cannot be empty'
    });
  }
  
  if (content.length > 1000) {
    return res.status(400).json({
      success: false,
      error: 'Content cannot exceed 1000 characters'
    });
  }
  
  next();
};

/**
 * Rate limiting middleware for notifications
 */
export const rateLimitNotifications = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each user to 50 notifications per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    error: 'Too many notifications sent. Please try again later.',
    service: 'Notification Service'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many notifications sent. Please try again later.',
      service: 'Notification Service'
    });
  }
});

/**
 * Sanitize input data
 */
export const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove potential XSS attacks
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  };
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};
