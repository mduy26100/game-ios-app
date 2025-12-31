const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const { requirePermission } = require('../middleware/auth');
const {
  getAllVIPPackages,
  getVIPPackageById,
  createVIPPackage,
  updateVIPPackage,
  getAllUsers,
  getAllTransactions,
  getDashboardStats,
  updateUser,
  getAllRoles,
  getRoleById,
  getAllPermissions,
  createRole,
  updateRole,
  assignPermissionsToRole
} = require('../services/userService');

// Mount settings routes
router.use('/', require('./adminSettings'));

// Mount user management routes  
router.use('/users', require('./adminUsers'));

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/stats', requirePermission('dashboard:view'), async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/packages
 * @desc    Get all VIP packages (including inactive)
 * @access  Admin
 */
router.get('/packages', requirePermission('packages:view'), async (req, res) => {
  try {
    const packages = await getAllVIPPackages();
    res.json({
      success: true,
      packages
    });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/packages/:id
 * @desc    Get package by ID
 * @access  Admin
 */
router.get('/packages/:id', requirePermission('packages:view'), async (req, res) => {
  try {
    const package = await getVIPPackageById(parseInt(req.params.id));
    if (!package) {
      return res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    }
    res.json({
      success: true,
      package
    });
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/packages
 * @desc    Create new VIP package
 * @access  Admin
 */
router.post('/packages', requirePermission('packages:manage'), async (req, res) => {
  try {
    const { duration_months, price, title, description, discount_label, is_active, is_featured, display_order } = req.body;
    
    // Validation
    if (duration_months === undefined || !price || !title) {
      return res.status(400).json({
        success: false,
        error: 'duration_months, price, and title are required'
      });
    }
    
    const package = await createVIPPackage({
      duration_months,
      price,
      title,
      description,
      discount_label,
      is_active,
      is_featured,
      display_order
    });
    
    console.log(`✅ Admin created VIP package: ${package.title}`);
    
    res.json({
      success: true,
      package
    });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/packages/:id
 * @desc    Update VIP package
 * @access  Admin
 */
router.put('/packages/:id', requirePermission('packages:manage'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const package = await updateVIPPackage(id, updates);
    
    if (!package) {
      return res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    }
    
    console.log(`✅ Admin updated VIP package: ${package.title}`);
    
    res.json({
      success: true,
      package
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with filters
 * @access  Admin
 */
router.get('/transactions', requirePermission('transactions:view'), async (req, res) => {
  try {
    const { status, user_id, date_from, date_to, limit, offset } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (user_id) filters.user_id = parseInt(user_id);
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);
    
    const transactions = await getAllTransactions(filters);
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Admin
 */
router.get('/users', requirePermission('users:view'), async (req, res) => {
  try {
    const { search, is_vip, is_admin, limit, offset } = req.query;
    
    const filters = {};
    if (search) filters.search = search;
    if (is_vip !== undefined) filters.is_vip = is_vip === 'true' || is_vip === '1';
    if (is_admin !== undefined) filters.is_admin = is_admin === 'true' || is_admin === '1';
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);
    
    const result = await getAllUsers(filters);
    
    res.json(result);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/admin
 * @desc    Toggle user admin status
 * @access  Admin
 */
router.put('/users/:id/admin', requirePermission('users:manage_roles'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_admin } = req.body;
    
    if (is_admin === undefined) {
      return res.status(400).json({
        success: false,
        error: 'is_admin field is required'
      });
    }
    
    const user = await updateUser(userId, { is_admin });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`✅ Admin ${is_admin ? 'granted' : 'revoked'} admin access for user: ${user.email}`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Update user admin status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/vip
 * @desc    Update user VIP status
 * @access  Admin
 */
router.put('/users/:id/vip', requirePermission('users:edit'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_vip, vip_expires_at } = req.body;
    
    const updates = {};
    if (is_vip !== undefined) updates.is_vip = is_vip;
    if (vip_expires_at !== undefined) updates.vip_expires_at = vip_expires_at;
    
    const user = await updateUser(userId, updates);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`✅ Admin updated VIP status for user: ${user.email}`);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_vip: user.is_vip,
        vip_expires_at: user.vip_expires_at
      }
    });
  } catch (error) {
    console.error('Update user VIP status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/games
 * @desc    Get all games with filters
 * @access  Admin
 */
router.get('/games', requirePermission('games:view'), async (req, res) => {
  try {
    const { search, group, type, page = 1, limit = 50 } = req.query;
    const { getGames } = require('../services/databaseService');
    
    const result = await getGames({
      search,
      group,
      type,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/**
 * @route   PUT /api/admin/games/:id
 * @desc    Update game details
 * @access  Admin
 */
router.put('/games/:id', requirePermission('games:edit'), async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const updates = req.body;
    const { updateGame } = require('../services/databaseService');
    
    const game = await updateGame(gameId, updates);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    console.log(`✅ Admin updated game: ${game.title}`);
    
    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/games/:id/visibility
 * @desc    Update game visibility (vip/free/hidden)
 * @access  Admin
 */
router.put('/games/:id/visibility', requirePermission('games:edit'), async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const { group } = req.body; // 'vip', 'free', or 'hidden'
    const { updateGame } = require('../services/databaseService');
    
    if (!['vip', 'free', 'hidden'].includes(group)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid visibility value. Must be vip, free, or hidden'
      });
    }
    
    const game = await updateGame(gameId, { group });
    
    console.log(`✅ Admin changed game visibility: ${game.title} -> ${group}`);
    
    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Update game visibility error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * RBAC Routes
 */

router.get('/roles', requirePermission('roles:view'), async (req, res) => {
  try {
    const roles = await getAllRoles();
    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/roles/:id', requirePermission('roles:view'), async (req, res) => {
  try {
    const role = await getRoleById(parseInt(req.params.id));
    if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/roles', requirePermission('roles:manage'), async (req, res) => {
  try {
    const role = await createRole(req.body);
    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/roles/:id', requirePermission('roles:manage'), async (req, res) => {
  try {
    const role = await updateRole(parseInt(req.params.id), req.body);
    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/permissions', requirePermission('roles:view'), async (req, res) => {
  try {
    const permissions = await getAllPermissions();
    res.json({ success: true, permissions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/roles/:id/permissions', requirePermission('roles:manage'), async (req, res) => {
  try {
    await assignPermissionsToRole(parseInt(req.params.id), req.body.permissionIds);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/users/:id/role', requirePermission('users:manage_roles'), async (req, res) => {
  try {
    const user = await updateUser(parseInt(req.params.id), { role_id: req.body.role_id });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
