-- Insert permissions if not exist
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'dashboard:view') INSERT INTO permissions (name, module, description) VALUES ('dashboard:view', 'dashboard', 'View dashboard statistics');
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'packages:view') INSERT INTO permissions (name, module, description) VALUES ('packages:view', 'packages', 'View VIP packages');
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'packages:manage') INSERT INTO permissions (name, module, description) VALUES ('packages:manage', 'packages', 'Create and edit VIP packages');
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'transactions:manage') INSERT INTO permissions (name, module, description) VALUES ('transactions:manage', 'transactions', 'Manage transactions (manual complete)');
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'users:manage_roles') INSERT INTO permissions (name, module, description) VALUES ('users:manage_roles', 'users', 'Assign roles to users');
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'roles:view') INSERT INTO permissions (name, module, description) VALUES ('roles:view', 'roles', 'View roles and permissions');
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'roles:manage') INSERT INTO permissions (name, module, description) VALUES ('roles:manage', 'roles', 'Create and edit roles');
IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'settings:view') INSERT INTO permissions (name, module, description) VALUES ('settings:view', 'settings', 'View system settings');

-- Insert additional roles if not exist
IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'moderator') INSERT INTO roles (name, description) VALUES ('moderator', 'Can manage users and transactions');

-- Assign all permissions to super_admin and admin (idempotently)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- Assign permissions to 'editor'
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'editor'), p.id FROM permissions p
WHERE p.name IN ('dashboard:view', 'games:view', 'games:create', 'games:edit', 'packages:view', 'settings:view')
AND EXISTS (SELECT 1 FROM roles WHERE name = 'editor')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = (SELECT id FROM roles WHERE name = 'editor') AND rp.permission_id = p.id);

-- Assign permissions to 'moderator'
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'moderator'), p.id FROM permissions p
WHERE p.name IN ('dashboard:view', 'games:view', 'users:view', 'users:edit', 'transactions:view', 'transactions:manage')
AND EXISTS (SELECT 1 FROM roles WHERE name = 'moderator')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = (SELECT id FROM roles WHERE name = 'moderator') AND rp.permission_id = p.id);

-- Assign permissions to 'viewer'
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'viewer'), p.id FROM permissions p
WHERE p.name IN ('dashboard:view', 'games:view', 'users:view', 'transactions:view', 'packages:view', 'roles:view', 'settings:view')
AND EXISTS (SELECT 1 FROM roles WHERE name = 'viewer')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = (SELECT id FROM roles WHERE name = 'viewer') AND rp.permission_id = p.id);
