-- Create users table for authentication
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' and xtype='U')
BEGIN
  CREATE TABLE users (
    id INT PRIMARY KEY IDENTITY(1,1),
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    name NVARCHAR(255),
    is_vip BIT DEFAULT 0,
    vip_expires_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
  );

  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_users_vip ON users(is_vip, vip_expires_at);

  PRINT 'Users table created successfully';
END
ELSE
BEGIN
  PRINT 'Users table already exists';
END
GO
