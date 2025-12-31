IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'zalopay_app_trans_id' AND Object_ID = Object_ID(N'transactions'))
    ALTER TABLE transactions ADD zalopay_app_trans_id NVARCHAR(100);

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'zalopay_zp_trans_token' AND Object_ID = Object_ID(N'transactions'))
    ALTER TABLE transactions ADD zalopay_zp_trans_token NVARCHAR(255);

IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'payment_method' AND Object_ID = Object_ID(N'transactions'))
    ALTER TABLE transactions ADD payment_method NVARCHAR(50) DEFAULT 'momo';

