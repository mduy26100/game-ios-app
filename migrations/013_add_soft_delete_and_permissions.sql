-- Migration 013: Add Soft Delete Support and CRUD Permissions
-- This migration adds deleted_at columns for soft delete functionality
-- and creates a comprehensive set of CRUD permissions for role-based access control

-- =====================================================
-- PART 1: Add Soft Delete Columns
-- =====================================================

-- Add deleted_at column to users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'deleted_at')
BEGIN
    ALTER TABLE users ADD deleted_at DATETIME2 NULL;
    PRINT '✓ Added deleted_at column to users table';
END

-- Add deleted_at column to games table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('games') AND name = 'deleted_at')
BEGIN
    ALTER TABLE games ADD deleted_at DATETIME2 NULL;
    PRINT '✓ Added deleted_at column to games table';
END

-- Add deleted_at column to vip_packages table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vip_packages') AND name = 'deleted_at')
BEGIN
    ALTER TABLE vip_packages ADD deleted_at DATETIME2 NULL;
    PRINT '✓ Added deleted_at column to vip_packages table';
END

-- Add deleted_at column to transactions table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('transactions') AND name = 'deleted_at')
BEGIN
    ALTER TABLE transactions ADD deleted_at DATETIME2 NULL;
    PRINT '✓ Added deleted_at column to transactions table';
END

GO

-- =====================================================
-- PART 2: Add Comprehensive CRUD Permissions
-- =====================================================

-- Users Permissions
INSERT INTO permissions (name, description, [module])
SELECT * FROM (VALUES
    ('users:view', 'View users list and details', 'users'),
    ('users:create', 'Create new users', 'users'),
    ('users:edit', 'Edit user information', 'users'),
    ('users:soft_delete', 'Soft delete users (recoverable)', 'users'),
    ('users:hard_delete', 'Permanently delete users', 'users'),
    ('users:restore', 'Restore soft-deleted users', 'users'),
    ('users:manage_roles', 'Assign and change user roles', 'users')
) AS v(name, description, module)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

-- Games Permissions
INSERT INTO permissions (name, description, [module])
SELECT * FROM (VALUES
    ('games:view', 'View games list and details', 'games'),
    ('games:create', 'Add new games to catalog', 'games'),
    ('games:edit', 'Edit game information', 'games'),
    ('games:soft_delete', 'Soft delete games (recoverable)', 'games'),
    ('games:hard_delete', 'Permanently delete games', 'games'),
    ('games:restore', 'Restore soft-deleted games', 'games')
) AS v(name, description, module)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

-- Packages Permissions
INSERT INTO permissions (name, description, module)
SELECT * FROM (VALUES
    ('packages:view', 'View VIP packages', 'packages'),
    ('packages:create', 'Create new VIP packages', 'packages'),
    ('packages:edit', 'Edit package details and pricing', 'packages'),
    ('packages:soft_delete', 'Soft delete packages', 'packages'),
    ('packages:hard_delete', 'Permanently delete packages', 'packages'),
    ('packages:restore', 'Restore soft-deleted packages', 'packages')
) AS v(name, description, module)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

-- Transactions Permissions  
INSERT INTO permissions (name, description, module)
SELECT * FROM (VALUES
    ('transactions:view', 'View all transactions', 'transactions'),
    ('transactions:edit', 'Edit transaction status', 'transactions'),
    ('transactions:soft_delete', 'Soft delete transactions', 'transactions'),
    ('transactions:hard_delete', 'Permanently delete transactions', 'transactions')
) AS v(name, description, module)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

-- Scraper Permissions
INSERT INTO permissions (name, description, module)
SELECT * FROM (VALUES
    ('scraper:access', 'Access data scraper interface', 'scraper'),
    ('scraper:start', 'Start scraping jobs', 'scraper'),
    ('scraper:stop', 'Stop running scraping jobs', 'scraper'),
    ('scraper:view_logs', 'View scraper logs and history', 'scraper')
) AS v(name, description, module)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

-- Roles & Permissions Management
INSERT INTO permissions (name, description, module)
SELECT * FROM (VALUES
    ('roles:view', 'View roles and their permissions', 'roles'),
    ('roles:create', 'Create new roles', 'roles'),
    ('roles:edit', 'Edit role permissions', 'roles'),
    ('roles:delete', 'Delete roles', 'roles')
) AS v(name, description, module)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

GO

-- =====================================================
-- PART 3: Grant Super Admin All New Permissions
-- =====================================================

-- Get super_admin role ID
DECLARE @superAdminRoleId INT;
SELECT @superAdminRoleId = id FROM roles WHERE name = 'super_admin';

IF @superAdminRoleId IS NOT NULL
BEGIN
    -- Grant all new permissions to super_admin
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT @superAdminRoleId, p.id
    FROM permissions p
    WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions rp 
        WHERE rp.role_id = @superAdminRoleId 
        AND rp.permission_id = p.id
    );
    
    PRINT '✓ Granted all permissions to super_admin role';
END

GO

PRINT '========================================';
PRINT 'Migration 013 completed successfully';
PRINT 'Soft delete columns added';
PRINT 'CRUD permissions created';
PRINT '========================================';
