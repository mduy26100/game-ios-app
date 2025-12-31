const sql = require('mssql');
const { getPool } = require('../config/database');

/**
 * User Management Functions
 */

async function createUser(userData) {
  const { email, password_hash, name } = userData;
  
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('name', sql.NVarChar, name || null)
      .query(`
        INSERT INTO users (email, password_hash, name)
        OUTPUT INSERTED.*
        VALUES (@email, @password_hash, @name)
      `);
    
    return result.recordset[0];
  } catch (error) {
    if (error.number === 2627) { // Duplicate key error
      throw new Error('Email already exists');
    }
    throw error;
  }
}

async function getAllUsers(filters = {}) {
  const { search, limit = 50, offset = 0, includeDeleted = false } = filters;
  
  try {
    const pool = await getPool();
    
    let whereConditions = [];
    
    // Exclude soft-deleted users by default
    if (!includeDeleted) {
      whereConditions.push('u.deleted_at IS NULL');
    }
    
    if (search) {
      whereConditions.push('(u.email LIKE @search OR u.name LIKE @search)');
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    const query = `
      SELECT u.*, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.created_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;
    
    const request = pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset);
    
    if (search) {
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    
    const result = await request.query(query);
    
    return {
      success: true,
      users: result.recordset
    };
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Soft delete a user (set deleted_at timestamp)
 */
async function softDeleteUser(userId) {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('UPDATE users SET deleted_at = GETDATE() WHERE id = @userId');
    
    return { success: true, message: 'User soft deleted successfully' };
  } catch (error) {
    console.error('Error soft deleting user:', error);
    throw error;
  }
}

/**
 * Hard delete a user (permanently remove from database)
 */
async function hardDeleteUser(userId) {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM users WHERE id = @userId');
    
    return { success: true, message: 'User permanently deleted' };
  } catch (error) {
    console.error('Error hard deleting user:', error);
    throw error;
  }
}

/**
 * Restore a soft-deleted user
 */
async function restoreUser(userId) {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('UPDATE users SET deleted_at = NULL WHERE id = @userId');
    
    return { success: true, message: 'User restored successfully' };
  } catch (error) {
    console.error('Error restoring user:', error);
    throw error;
  }
}  

async function getUserByEmail(email) {
  const pool = await getPool();
  const result = await pool.request()
    .input('email', sql.NVarChar, email)
    .query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = @email
    `);
  
  const user = result.recordset[0];
  if (!user) return null;

  if (user.role_id) {
    const permResult = await pool.request()
      .input('role_id', sql.Int, user.role_id)
      .query(`
        SELECT p.name 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = @role_id
      `);
    user.permissions = permResult.recordset.map(row => row.name);
  } else {
    user.permissions = [];
  }
  
  return user;
}

async function getUserById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = @id
    `);
  
  const user = result.recordset[0];
  if (!user) return null;

  if (user.role_id) {
    const permResult = await pool.request()
      .input('role_id', sql.Int, user.role_id)
      .query(`
        SELECT p.name 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = @role_id
      `);
    user.permissions = permResult.recordset.map(row => row.name);
  } else {
    user.permissions = [];
  }
  
  return user;
}

async function updateUser(id, updates) {
  const pool = await getPool();
  const setClauses = [];
  const request = pool.request().input('id', sql.Int, id);

  if (updates.name !== undefined) {
    setClauses.push('name = @name');
    request.input('name', sql.NVarChar, updates.name);
  }
  if (updates.password_hash !== undefined) {
    setClauses.push('password_hash = @password_hash');
    request.input('password_hash', sql.NVarChar, updates.password_hash);
  }
  if (updates.is_vip !== undefined) {
    setClauses.push('is_vip = @is_vip');
    request.input('is_vip', sql.Bit, updates.is_vip);
  }
  if (updates.vip_expires_at !== undefined) {
    setClauses.push('vip_expires_at = @vip_expires_at');
    request.input('vip_expires_at', sql.DateTime, updates.vip_expires_at);
  }
  if (updates.role_id !== undefined) {
    setClauses.push('role_id = @role_id');
    request.input('role_id', sql.Int, updates.role_id);
  }
  if (updates.is_admin !== undefined) {
    setClauses.push('is_admin = @is_admin');
    request.input('is_admin', sql.Bit, updates.is_admin);
  }

  setClauses.push('updated_at = GETDATE()');

  const result = await request.query(`
    UPDATE users
    SET ${setClauses.join(', ')}
    OUTPUT INSERTED.*
    WHERE id = @id
  `);

  return result.recordset[0];
}

async function updateUserVIP(userId, months) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Handle lifetime VIP (months = 0 means lifetime)
  if (months === 0) {
    return updateUser(userId, {
      is_vip: true,
      vip_expires_at: null // null means lifetime/never expires
    });
  }

  // Calculate expiration date for time-limited VIP
  const now = new Date();
  const currentExpiry = user.vip_expires_at ? new Date(user.vip_expires_at) : null;
  
  // If already VIP and not expired, extend from current expiry
  // Otherwise, start from now
  const baseDate = (currentExpiry && currentExpiry > now) ? currentExpiry : now;
  const expiryDate = new Date(baseDate);
  expiryDate.setMonth(expiryDate.getMonth() + months);

  return updateUser(userId, {
    is_vip: true,
    vip_expires_at: expiryDate
  });
}

/**
 * Transaction Management Functions
 */

async function createTransaction(transactionData) {
  const { 
    user_id, amount, duration_months, 
    momo_order_id, momo_request_id,
    zalopay_app_trans_id, zalopay_zp_trans_token,
    payment_method = 'momo'
  } = transactionData;
  
  const pool = await getPool();
  const result = await pool.request()
    .input('user_id', sql.Int, user_id)
    .input('amount', sql.Decimal(10, 2), amount)
    .input('duration_months', sql.Int, duration_months)
    .input('momo_order_id', sql.NVarChar, momo_order_id || null)
    .input('momo_request_id', sql.NVarChar, momo_request_id || null)
    .input('zalopay_app_trans_id', sql.NVarChar, zalopay_app_trans_id || null)
    .input('zalopay_zp_trans_token', sql.NVarChar, zalopay_zp_trans_token || null)
    .input('payment_method', sql.NVarChar, payment_method)
    .query(`
      INSERT INTO transactions (
        user_id, amount, duration_months, 
        momo_order_id, momo_request_id, 
        zalopay_app_trans_id, zalopay_zp_trans_token,
        payment_method,
        status
      )
      OUTPUT INSERTED.*
      VALUES (
        @user_id, @amount, @duration_months, 
        @momo_order_id, @momo_request_id, 
        @zalopay_app_trans_id, @zalopay_zp_trans_token,
        @payment_method,
        'pending'
      )
    `);
  
  return result.recordset[0];
}

async function updateTransaction(id, updates) {
  const pool = await getPool();
  const setClauses = [];
  const request = pool.request().input('id', sql.Int, id);

  if (updates.status !== undefined) {
    setClauses.push('status = @status');
    request.input('status', sql.NVarChar, updates.status);
  }
  if (updates.momo_order_id !== undefined) {
    setClauses.push('momo_order_id = @momo_order_id');
    request.input('momo_order_id', sql.NVarChar, updates.momo_order_id);
  }
  if (updates.momo_request_id !== undefined) {
    setClauses.push('momo_request_id = @momo_request_id');
    request.input('momo_request_id', sql.NVarChar, updates.momo_request_id);
  }
  if (updates.momo_trans_id !== undefined) {
    request.input('momo_trans_id', sql.NVarChar, updates.momo_trans_id);
  }
  if (updates.zalopay_zp_trans_token !== undefined) {
    setClauses.push('zalopay_zp_trans_token = @zalopay_zp_trans_token');
    request.input('zalopay_zp_trans_token', sql.NVarChar, updates.zalopay_zp_trans_token);
  }

  setClauses.push('updated_at = GETDATE()');

  const result = await request.query(`
    UPDATE transactions
    SET ${setClauses.join(', ')}
    OUTPUT INSERTED.*
    WHERE id = @id
  `);

  return result.recordset[0];
}

async function getTransactionByMomoOrderId(orderId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('momo_order_id', sql.NVarChar, orderId)
    .query('SELECT * FROM transactions WHERE momo_order_id = @momo_order_id');
  
  return result.recordset[0] || null;
}

async function getTransactionByZaloAppTransId(appTransId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('zalopay_app_trans_id', sql.NVarChar, appTransId)
    .query('SELECT * FROM transactions WHERE zalopay_app_trans_id = @zalopay_app_trans_id');
  
  return result.recordset[0] || null;
}

async function getTransactionByZaloAppTransId(appTransId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('zalopay_app_trans_id', sql.NVarChar, appTransId)
    .query('SELECT * FROM transactions WHERE zalopay_app_trans_id = @zalopay_app_trans_id');
  
  return result.recordset[0] || null;
}

async function getTransactionsByUserId(userId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('user_id', sql.Int, userId)
    .query(`
      SELECT * FROM transactions 
      WHERE user_id = @user_id 
      ORDER BY created_at DESC
    `);
  
  return result.recordset;
}

/**
 * VIP Packages Management
 */

async function getAllVIPPackages() {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT * FROM vip_packages ORDER BY display_order');
  return result.recordset;
}

async function getActiveVIPPackages() {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT * FROM vip_packages WHERE is_active = 1 ORDER BY display_order');
  return result.recordset;
}

async function getVIPPackageById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM vip_packages WHERE id = @id');
  return result.recordset[0] || null;
}

async function getVIPPackageByDuration(durationMonths) {
  const pool = await getPool();
  const result = await pool.request()
    .input('duration', sql.Int, durationMonths)
    .query('SELECT * FROM vip_packages WHERE duration_months = @duration');
  return result.recordset[0] || null;
}

async function createVIPPackage(packageData) {
  const pool = await getPool();
  const result = await pool.request()
    .input('duration_months', sql.Int, packageData.duration_months)
    .input('price', sql.Decimal(10, 2), packageData.price)
    .input('title', sql.NVarChar, packageData.title)
    .input('description', sql.NVarChar, packageData.description || null)
    .input('discount_label', sql.NVarChar, packageData.discount_label || null)
    .input('is_active', sql.Bit, packageData.is_active !== undefined ? packageData.is_active : true)
    .input('is_featured', sql.Bit, packageData.is_featured || false)
    .input('display_order', sql.Int, packageData.display_order || 0)
    .query(`
      INSERT INTO vip_packages (duration_months, price, title, description, discount_label, is_active, is_featured, display_order)
      OUTPUT INSERTED.*
      VALUES (@duration_months, @price, @title, @description, @discount_label, @is_active, @is_featured, @display_order)
    `);
  
  return result.recordset[0];
}

async function updateVIPPackage(id, updates) {
  const pool = await getPool();
  const setClauses = [];
  const request = pool.request().input('id', sql.Int, id);

  if (updates.duration_months !== undefined) {
    setClauses.push('duration_months = @duration_months');
    request.input('duration_months', sql.Int, updates.duration_months);
  }
  if (updates.price !== undefined) {
    setClauses.push('price = @price');
    request.input('price', sql.Decimal(10, 2), updates.price);
  }
  if (updates.title !== undefined) {
    setClauses.push('title = @title');
    request.input('title', sql.NVarChar, updates.title);
  }
  if (updates.description !== undefined) {
    setClauses.push('description = @description');
    request.input('description', sql.NVarChar, updates.description);
  }
  if (updates.discount_label !== undefined) {
    setClauses.push('discount_label = @discount_label');
    request.input('discount_label', sql.NVarChar, updates.discount_label);
  }
  if (updates.is_active !== undefined) {
    setClauses.push('is_active = @is_active');
    request.input('is_active', sql.Bit, updates.is_active);
  }
  if (updates.is_featured !== undefined) {
    setClauses.push('is_featured = @is_featured');
    request.input('is_featured', sql.Bit, updates.is_featured);
  }
  if (updates.display_order !== undefined) {
    setClauses.push('display_order = @display_order');
    request.input('display_order', sql.Int, updates.display_order);
  }

  if (setClauses.length === 0) {
    throw new Error('No fields to update');
  }

  setClauses.push('updated_at = GETDATE()');

  const result = await request.query(`
    UPDATE vip_packages
    SET ${setClauses.join(', ')}
    OUTPUT INSERTED.*
    WHERE id = @id
  `);

  return result.recordset[0];
}

/**
 * Admin Functions
 */



async function getAllTransactions(filters = {}) {
  const pool = await getPool();
  let query = `
    SELECT t.*, u.email, u.name 
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const request = pool.request();

  if (filters.status) {
    query += ' AND t.status = @status';
    request.input('status', sql.NVarChar, filters.status);
  }

  if (filters.user_id) {
    query += ' AND t.user_id = @user_id';
    request.input('user_id', sql.Int, filters.user_id);
  }

  if (filters.date_from) {
    query += ' AND t.created_at >= @date_from';
    request.input('date_from', sql.DateTime, new Date(filters.date_from));
  }

  if (filters.date_to) {
    query += ' AND t.created_at <= @date_to';
    request.input('date_to', sql.DateTime, new Date(filters.date_to));
  }

  query += ' ORDER BY t.created_at DESC';

  if (filters.limit) {
    query += ` OFFSET ${filters.offset || 0} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
  }

  const result = await request.query(query);
  return result.recordset;
}

async function getDashboardStats() {
  const pool = await getPool();
  
  // Total revenue
  const revenueResult = await pool.request().query(`
    SELECT SUM(amount) as total_revenue
    FROM transactions
    WHERE status = 'completed'
  `);
  
  // Active VIP users
  const activeVIPResult = await pool.request().query(`
    SELECT COUNT(*) as active_vip_count
    FROM users
    WHERE is_vip = 1 AND (vip_expires_at IS NULL OR vip_expires_at > GETDATE())
  `);
  
  // Pending transactions
  const pendingResult = await pool.request().query(`
    SELECT COUNT(*) as pending_count
    FROM transactions
    WHERE status = 'pending'
  `);
  
  // Total users
  const usersResult = await pool.request().query(`
    SELECT COUNT(*) as total_users
    FROM users
  `);
  
  // Recent transactions (last 10)
  const recentResult = await pool.request().query(`
    SELECT TOP 10 t.*, u.email, u.name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `);
  
  return {
    total_revenue: revenueResult.recordset[0].total_revenue || 0,
    active_vip_users: activeVIPResult.recordset[0].active_vip_count || 0,
    pending_transactions: pendingResult.recordset[0].pending_count || 0,
    total_users: usersResult.recordset[0].total_users || 0,
    recent_transactions: recentResult.recordset
  };
}

/**
 * RBAC Functions
 */

async function getAllRoles() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM roles ORDER BY id');
  return result.recordset;
}

async function getRoleById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM roles WHERE id = @id');
  
  const role = result.recordset[0];
  if (!role) return null;

  const permResult = await pool.request()
    .input('role_id', sql.Int, id)
    .query(`
      SELECT p.* 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = @role_id
    `);
  role.permissions = permResult.recordset;
  return role;
}

async function getAllPermissions() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM permissions ORDER BY module, name');
  return result.recordset;
}

async function createRole(roleData) {
  const pool = await getPool();
  const result = await pool.request()
    .input('name', sql.NVarChar, roleData.name)
    .input('description', sql.NVarChar, roleData.description || null)
    .query(`
      INSERT INTO roles (name, description)
      OUTPUT INSERTED.*
      VALUES (@name, @description)
    `);
  return result.recordset[0];
}

async function updateRole(id, updates) {
  const pool = await getPool();
  const setClauses = [];
  const request = pool.request().input('id', sql.Int, id);

  if (updates.name !== undefined) {
    setClauses.push('name = @name');
    request.input('name', sql.NVarChar, updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push('description = @description');
    request.input('description', sql.NVarChar, updates.description);
  }

  setClauses.push('updated_at = GETDATE()');

  const result = await request.query(`
    UPDATE roles
    SET ${setClauses.join(', ')}
    OUTPUT INSERTED.*
    WHERE id = @id
  `);
  return result.recordset[0];
}

async function assignPermissionsToRole(roleId, permissionIds) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // Delete existing permissions
    await transaction.request()
      .input('role_id', sql.Int, roleId)
      .query('DELETE FROM role_permissions WHERE role_id = @role_id');

    // Add new permissions
    for (const permId of permissionIds) {
      await transaction.request()
        .input('role_id', sql.Int, roleId)
        .input('perm_id', sql.Int, permId)
        .query('INSERT INTO role_permissions (role_id, permission_id) VALUES (@role_id, @perm_id)');
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  // User functions
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  updateUserVIP,
  getAllUsers,
  softDeleteUser,
  hardDeleteUser,
  restoreUser,
  
  // Transaction functions
  createTransaction,
  updateTransaction,
  updateTransaction,
  getTransactionByMomoOrderId,
  getTransactionByZaloAppTransId,
  getTransactionsByUserId,
  getAllTransactions,
  
  // VIP Package functions
  getAllVIPPackages,
  getActiveVIPPackages,
  getVIPPackageById,
  getVIPPackageByDuration,
  createVIPPackage,
  updateVIPPackage,
  
  // RBAC functions
  getAllRoles,
  getRoleById,
  getAllPermissions,
  createRole,
  updateRole,
  assignPermissionsToRole,

  // Admin functions
  getDashboardStats
};
