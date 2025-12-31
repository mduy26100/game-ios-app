const { requireAuth } = require('./auth');
const { getUserById } = require('../services/userService');

/**
 * Middleware to check if user is an admin
 */
async function requireAdmin(req, res, next) {
  try {
    // First, require authentication
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Check if user is admin
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (!user.is_admin && user.role_name !== 'super_admin' && user.role_name !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }
    
    // User is admin, continue
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
}

module.exports = {
  requireAdmin
};
