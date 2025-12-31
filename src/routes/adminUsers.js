const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/auth');
const { softDeleteUser, hardDeleteUser, restoreUser, updateUser } = require('../services/userService');

/**
 * @route PUT /api/admin/users/:id/soft-delete
 * @desc Soft delete a user
 * @access Admin with users:soft_delete permission
 */
router.put('/:id/soft-delete', requirePermission('users:soft_delete'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await softDeleteUser(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/admin/users/:id/hard-delete
 * @desc Permanently delete a user
 * @access Admin with users:hard_delete permission
 */
router.delete('/:id/hard-delete', requirePermission('users:hard_delete'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await hardDeleteUser(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/admin/users/:id/restore  
 * @desc Restore a soft-deleted user
 * @access Admin with users:restore permission
 */
router.put('/:id/restore', requirePermission('users:restore'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await restoreUser(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/admin/users/:id/role
 * @desc Update user role
 * @access Admin with users:manage_roles permission
 */
router.put('/:id/role', requirePermission('users:manage_roles'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role_id } = req.body;
    
    const result = await updateUser(userId, { role_id });
    res.json({ success: true, user: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
