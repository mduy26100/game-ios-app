-- Seed data for IOSGodsDB
USE IOSGodsDB;
GO

-- Create default admin user (password: admin123)
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@iosgods.com')
BEGIN
    INSERT INTO users (email, password_hash, name, is_admin, is_vip, created_at, updated_at)
    VALUES (
        'admin@iosgods.com',
        '$2b$10$P1tanfqc/33a35YfSrLsfOglcQFRPvSd9..NWPFJ9y6Z4V1vyDz5G',  -- admin123
        'Admin User',
        1,
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT 'Admin user created';
END
ELSE
BEGIN
    PRINT 'Admin user already exists';
END
GO

-- Create test VIP user (password: test123)
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'vip@test.com')
BEGIN
    INSERT INTO users (email, password_hash, name, is_vip, vip_expires_at, created_at, updated_at)
    VALUES (
        'vip@test.com',
        '$2b$10$ZTJtlX/EIlanRtaCHuRaNur9ohL1pMDRBt4lfn4GBo.TWV1oxCf92',  -- test123
        'VIP Test User',
        1,
        DATEADD(MONTH, 1, GETDATE()),
        GETDATE(),
        GETDATE()
    );
    PRINT 'VIP test user created';
END
ELSE
BEGIN
    PRINT 'VIP test user already exists';
END
GO

-- Create regular test user (password: test123)
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'user@test.com')
BEGIN
    INSERT INTO users (email, password_hash, name, is_vip, created_at, updated_at)
    VALUES (
        'user@test.com',
        '$2b$10$ZTJtlX/EIlanRtaCHuRaNur9ohL1pMDRBt4lfn4GBo.TWV1oxCf92',  -- test123
        'Regular Test User',
        0,
        GETDATE(),
        GETDATE()
    );
    PRINT 'Regular test user created';
END
ELSE
BEGIN
    PRINT 'Regular test user already exists';
END
GO

-- Insert sample games (if games table exists)
IF EXISTS (SELECT * FROM sysobjects WHERE name='games' and xtype='U')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM games)
    BEGIN
        INSERT INTO games (title, description, version, download_url, is_vip_only, created_at, updated_at)
        VALUES 
            ('Sample VIP Game 1', 'This is a VIP-only game', '1.0.0', 'https://example.com/game1.ipa', 1, GETDATE(), GETDATE()),
            ('Sample Free Game 1', 'This is a free game', '1.0.0', 'https://example.com/game2.ipa', 0, GETDATE(), GETDATE()),
            ('Sample VIP Game 2', 'Another VIP game', '2.0.0', 'https://example.com/game3.ipa', 1, GETDATE(), GETDATE());
        PRINT 'Sample games inserted';
    END
END
GO

-- Insert sample transactions
IF EXISTS (SELECT * FROM sysobjects WHERE name='transactions' and xtype='U')
BEGIN
    DECLARE @admin_user_id INT = (SELECT id FROM users WHERE email = 'admin@iosgods.com');
    DECLARE @vip_user_id INT = (SELECT id FROM users WHERE email = 'vip@test.com');
    
    IF @vip_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = @vip_user_id)
    BEGIN
        INSERT INTO transactions (user_id, amount, duration_months, status, payment_method, created_at, updated_at)
        VALUES 
            (@vip_user_id, 50000, 1, 'completed', 'momo', DATEADD(DAY, -15, GETDATE()), DATEADD(DAY, -15, GETDATE()));
        PRINT 'Sample transaction inserted';
    END
END
GO

PRINT 'Seed data completed successfully!';
GO
