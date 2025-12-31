-- Create roles table
CREATE TABLE roles ( id INT PRIMARY KEY IDENTITY(1,1), name NVARCHAR(50) NOT NULL UNIQUE, description NVARCHAR(255), created_at DATETIME DEFAULT GETDATE(), updated_at DATETIME DEFAULT GETDATE() );

-- Create permissions table
CREATE TABLE permissions ( id INT PRIMARY KEY IDENTITY(1,1), name NVARCHAR(50) NOT NULL UNIQUE, description NVARCHAR(255), module NVARCHAR(50), created_at DATETIME DEFAULT GETDATE() );

-- Create role_permissions join table
CREATE TABLE role_permissions ( role_id INT NOT NULL, permission_id INT NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE, FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE );

-- Add role_id to users
ALTER TABLE users ADD role_id INT;
ALTER TABLE users ADD CONSTRAINT FK_user_role FOREIGN KEY (role_id) REFERENCES roles(id);

-- Insert default roles
INSERT INTO roles (name, description) VALUES ('super_admin', 'Full access to all features');
INSERT INTO roles (name, description) VALUES ('admin', 'General administration access');
INSERT INTO roles (name, description) VALUES ('editor', 'Can edit content but cannot manage users or settings');
INSERT INTO roles (name, description) VALUES ('viewer', 'Read-only access to admin panel');

-- Insert core permissions
INSERT INTO permissions (name, module, description) VALUES ('games:view', 'games', 'View games and apps');
INSERT INTO permissions (name, module, description) VALUES ('games:create', 'games', 'Add new games and apps');
INSERT INTO permissions (name, module, description) VALUES ('games:edit', 'games', 'Edit existing games and apps');
INSERT INTO permissions (name, module, description) VALUES ('games:delete', 'games', 'Remove games and apps');
INSERT INTO permissions (name, module, description) VALUES ('users:view', 'users', 'View user list');
INSERT INTO permissions (name, module, description) VALUES ('users:edit', 'users', 'Edit user roles and status');
INSERT INTO permissions (name, module, description) VALUES ('transactions:view', 'transactions', 'View payment history');
INSERT INTO permissions (name, module, description) VALUES ('settings:manage', 'settings', 'Manage API keys and system settings');

-- Assign all permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id) SELECT (SELECT id FROM roles WHERE name = 'super_admin'), id FROM permissions;

-- Update existing admins to super_admin role
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'super_admin') WHERE is_admin = 1;
