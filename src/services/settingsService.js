const sql = require('mssql');
const { getPool } = require('../config/database');

async function getSettings() {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT key_name, value, description, is_secure, updated_at FROM system_settings');
  
  // Mask secure values
  return result.recordset.map(setting => ({
    ...setting,
    value: setting.is_secure ? (setting.value ? '********' : '') : setting.value
  }));
}

async function getSettingValue(keyName) {
  const pool = await getPool();
  const result = await pool.request()
    .input('key_name', sql.NVarChar, keyName)
    .query('SELECT value FROM system_settings WHERE key_name = @key_name');
  
  return result.recordset[0]?.value || null;
}

async function updateSetting(keyName, value) {
  const pool = await getPool();
  
  // If value is masked (********), don't update it
  if (value === '********') {
    return null; 
  }

  const result = await pool.request()
    .input('key_name', sql.NVarChar, keyName)
    .input('value', sql.NVarChar, value)
    .query(`
      UPDATE system_settings
      SET value = @value, updated_at = GETDATE()
      OUTPUT INSERTED.key_name, INSERTED.description, INSERTED.is_secure, INSERTED.updated_at
      WHERE key_name = @key_name
    `);
  
  if (result.rowsAffected[0] === 0) {
    // Insert if not exists (upsert logic could be better but this is simple)
    // Actually, let's assume keys exist from migration, or do an Upsert
    const upsert = await pool.request()
      .input('key_name', sql.NVarChar, keyName)
      .input('value', sql.NVarChar, value)
      .query(`
        IF EXISTS (SELECT 1 FROM system_settings WHERE key_name = @key_name)
          UPDATE system_settings SET value = @value, updated_at = GETDATE() WHERE key_name = @key_name
        ELSE
          INSERT INTO system_settings (key_name, value, description, is_secure)
          VALUES (@key_name, @value, '', 0)
      `);
      return { key_name: keyName, value };
  }

  return { 
    ...result.recordset[0],
    value: result.recordset[0].is_secure ? '********' : value
  };
}

module.exports = {
  getSettings,
  getSettingValue,
  updateSetting
};
