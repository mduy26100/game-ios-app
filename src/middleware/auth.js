const { getUserFromToken } = require('../services/authService');

/**
 * Middleware to require authentication
 * Attaches user to req.user if token is valid
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = await getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Middleware for optional authentication
 * Attaches user if token is provided and valid, but doesn't fail if not
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await getUserFromToken(token);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
}

/**
 * Middleware to require VIP status
 * Must be used after requireAuth
 */
function requireVIP(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!req.user.is_vip) {
    return res.status(403).json({
      success: false,
      error: 'VIP access required',
      requiresVIP: true
    });
  }

  next();
}

/**
 * Middleware to require a specific permission
 * Handles authentication if req.user is not already present
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      // If not already authenticated, attempt authentication
      if (!req.user) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const token = authHeader.substring(7);
        const user = await getUserFromToken(token);
        
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
          });
        }
        
        req.user = user;
      }

      // Check for super admin bypass
      if (req.user.role_name === 'super_admin' || req.user.is_admin) {
        return next();
      }

      const hasPermission = req.user.permissions && req.user.permissions.includes(permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to perform this action',
          requiredPermission: permission
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during permission check'
      });
    }
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireVIP,
  requirePermission
};
