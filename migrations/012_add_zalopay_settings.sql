-- Add ZaloPay settings
IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'zalopay_app_id')
    INSERT INTO system_settings (key_name, value, description) VALUES ('zalopay_app_id', '2553', 'ZaloPay App ID');

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'zalopay_key1')
    INSERT INTO system_settings (key_name, value, description) VALUES ('zalopay_key1', 'PcY4iZIKFCIdgZvA21hgDTRLxnoXaOSy', 'ZaloPay Key 1 (Signing)');

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'zalopay_key2')
    INSERT INTO system_settings (key_name, value, description) VALUES ('zalopay_key2', 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz', 'ZaloPay Key 2 (Verify)');

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'zalopay_endpoint')
    INSERT INTO system_settings (key_name, value, description) VALUES ('zalopay_endpoint', 'https://sb-openapi.zalopay.vn/v2', 'ZaloPay API Endpoint');

IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key_name = 'zalopay_callback_url')
    INSERT INTO system_settings (key_name, value, description) VALUES ('zalopay_callback_url', 'http://localhost:3000/api/zalopay/callback', 'ZaloPay Callback URL');
