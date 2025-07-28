/**
 * Role-based access control middleware
 * This middleware checks if the authenticated user has the required role(s)
 */

/**
 * Middleware to check if user has required role
 * @param {string|string[]} roles - Required role(s) (e.g., 'admin' or ['admin', 'moderator'])
 * @returns {Function} Express middleware function
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    // Ensure user is authenticated (should be called after authMiddleware)
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        service: 'Auth Service'
      });
    }

    // Convert single role to array for consistent handling
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user has any of the required roles
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredRoles,
        current: req.user.role,
        service: 'Auth Service'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is admin or moderator
 */
const requireModerator = requireRole(['admin', 'moderator']);

/**
 * Middleware to check if user owns the resource or has elevated privileges
 * @param {string} resourceIdParam - The parameter name containing the resource ID
 * @param {string} userIdField - The field name in the resource that contains the owner ID
 */
const requireOwnershipOrElevated = (resourceIdParam = 'id', userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        service: 'Auth Service'
      });
    }

    // Admin and moderators can access any resource
    if (['admin', 'moderator'].includes(req.user.role)) {
      return next();
    }

    // For regular users, check ownership
    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;

    // If we're checking the user's own profile/data
    if (resourceIdParam === 'userId' && resourceId === userId) {
      return next();
    }

    // For other resources, you'll need to implement resource-specific checks
    // This is a placeholder - implement based on your specific needs
    req.requiresOwnershipCheck = {
      resourceId,
      userIdField,
      userId
    };
    
    next();
  };
};

/**
 * Check if user account is active and not suspended
 */
const requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      service: 'Auth Service'
    });
  }

  // Check if account is suspended (this should already be handled in authMiddleware)
  if (req.user.isSuspended) {
    return res.status(403).json({ 
      error: 'Account is suspended',
      service: 'Auth Service'
    });
  }

  next();
};

export {
  requireRole,
  requireAdmin,
  requireModerator,
  requireOwnershipOrElevated,
  requireActiveAccount
};
