-- Migration 009: Enhance games table and add more system settings
-- This script adds more detailed fields to games and expands settings for MoMo and Google AI

-- 1. Enhance Games Table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('games') AND name = 'version')
BEGIN
    ALTER TABLE games ADD 
        version NVARCHAR(50),
        size NVARCHAR(50),
        developer NVARCHAR(255),
        category NVARCHAR(100),
        requirements NVARCHAR(MAX),
        bundle_id NVARCHAR(255),
        package_name NVARCHAR(255),
        screenshots_json NVARCHAR(MAX);
    PRINT 'Enhanced games table with new fields';
END

-- 2. Add More System Settings
-- MoMo configuration
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'momo_access_key')
    INSERT INTO system_settings (key_name, value, description, is_secure)
    VALUES ('momo_access_key', 'F8BBA842ECF85', 'MoMo Access Key', 1);

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'momo_secret_key')
    INSERT INTO system_settings (key_name, value, description, is_secure)
    VALUES ('momo_secret_key', 'K951B6PE1waDMi640xX08PD3vg6EkVlz', 'MoMo Secret Key', 1);

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'momo_endpoint')
    INSERT INTO system_settings (key_name, value, description, is_secure)
    VALUES ('momo_endpoint', 'https://test-payment.momo.vn', 'MoMo API Endpoint', 0);

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'momo_return_url')
    INSERT INTO system_settings (key_name, value, description, is_secure)
    VALUES ('momo_return_url', 'http://localhost:3001/payment/success', 'MoMo Return URL', 0);

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'momo_notify_url')
    INSERT INTO system_settings (key_name, value, description, is_secure)
    VALUES ('momo_notify_url', 'http://localhost:3000/api/payment/callback', 'MoMo IPN URL', 0);

-- Google AI configuration
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'google_ai_api_key')
    INSERT INTO system_settings (key_name, value, description, is_secure)
    VALUES ('google_ai_api_key', '', 'Google Generative AI (Gemini) API Key', 1);

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'ai_provider')
    INSERT INTO system_settings (key_name, value, description, is_secure)
    VALUES ('ai_provider', 'openai', 'Active AI provider (openai or google)', 0);

PRINT 'Added production ready settings for MoMo and Google AI';
GO
