-- Add admin flag to users table and create VIP packages table
-- Migration 006

-- Step 1: Add is_admin column to users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'users') AND name = 'is_admin')
BEGIN
  ALTER TABLE users ADD is_admin BIT DEFAULT 0;
  CREATE INDEX idx_users_admin ON users(is_admin);
  PRINT 'Added is_admin column to users table';
END
ELSE
BEGIN
  PRINT 'is_admin column already exists in users table';
END
GO

-- Step 2: Create vip_packages table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='vip_packages' and xtype='U')
BEGIN
  CREATE TABLE vip_packages (
    id INT PRIMARY KEY IDENTITY(1,1),
    duration_months INT UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    title NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    discount_label NVARCHAR(50),
    is_active BIT DEFAULT 1,
    is_featured BIT DEFAULT 0,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
  );

  CREATE INDEX idx_packages_active ON vip_packages(is_active, display_order);
  CREATE INDEX idx_packages_duration ON vip_packages(duration_months);
  
  PRINT 'Created vip_packages table';
END
ELSE
BEGIN
  PRINT 'vip_packages table already exists';
END
GO

-- Step 3: Insert default VIP packages (migrate from env vars)
IF NOT EXISTS (SELECT * FROM vip_packages)
BEGIN
  INSERT INTO vip_packages (duration_months, price, title, description, discount_label, display_order, is_featured)
  VALUES 
    (1, 50000, '1 Month VIP', 'Perfect for trying out VIP features', NULL, 1, 0),
    (3, 120000, '3 Months VIP', 'Most popular choice - best value!', '20% OFF', 2, 1),
    (6, 200000, '6 Months VIP', 'Extended access with great savings', '33% OFF', 3, 0),
    (12, 350000, '1 Year VIP', 'Ultimate package - maximum savings!', '42% OFF', 4, 0);
  
  PRINT 'Inserted default VIP packages';
END
ELSE
BEGIN
  PRINT 'VIP packages already exist';
END
GO

PRINT 'Migration 006 completed successfully';
GO
