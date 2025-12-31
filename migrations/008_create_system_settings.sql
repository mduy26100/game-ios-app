-- Create system_settings table for storing API keys and configuration
-- Migration 008

CREATE TABLE system_settings (
    key_name NVARCHAR(50) PRIMARY KEY,
    value NVARCHAR(MAX),
    description NVARCHAR(255),
    is_secure BIT DEFAULT 0, -- If 1, value shouldn't be returned to frontend in plain text
    updated_at DATETIME DEFAULT GETDATE()
);

-- Insert default settings
INSERT INTO system_settings (key_name, value, description, is_secure)
VALUES 
    ('openai_api_key', '', 'API Key for OpenAI integration', 1),
    ('content_prompt_template', 'Generate a compelling description for iOS game: {title}. Target audience: {plan} users.', 'Template for content generation', 0),
    ('momo_partner_code', 'MOMO', 'MoMo Partner Code', 0);

PRINT 'Created system_settings table';
GO
