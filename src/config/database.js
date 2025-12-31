require('dotenv').config();
const sql = require('mssql');

// Database configuration
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Master database config (for creating database)
const masterConfig = {
  ...config,
  database: 'master'
};

let pool = null;

/**
 * Get or create database connection pool
 */
async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    console.log('Testing database connection...');
    const pool = await getPool();
    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log('✅ Database connection successful!');
    console.log('SQL Server Version:', result.recordset[0].version.split('\n')[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Create database if it doesn't exist
 */
async function createDatabaseIfNotExists() {
  let masterPool = null;
  try {
    console.log(`Checking if database '${config.database}' exists...`);
    masterPool = await sql.connect(masterConfig);
    
    const checkDbQuery = `
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${config.database}')
      BEGIN
        CREATE DATABASE [${config.database}]
        SELECT 'created' as status
      END
      ELSE
      BEGIN
        SELECT 'exists' as status
      END
    `;
    
    const result = await masterPool.request().query(checkDbQuery);
    const status = result.recordset[0]?.status;
    
    if (status === 'created') {
      console.log(`✅ Database '${config.database}' created successfully`);
    } else {
      console.log(`ℹ️  Database '${config.database}' already exists`);
    }
    
    await masterPool.close();
    return true;
  } catch (error) {
    if (masterPool) await masterPool.close();
    console.error('❌ Error creating database:', error.message);
    throw error;
  }
}

/**
 * Create games table if it doesn't exist
 */
async function createTableIfNotExists() {
  try {
    console.log('Creating games table if not exists...');
    const pool = await getPool();
    
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'games')
      BEGIN
        CREATE TABLE games (
          id INT PRIMARY KEY,
          title NVARCHAR(500) NOT NULL,
          icon_100 NVARCHAR(1000),
          group_name NVARCHAR(50),
          description NVARCHAR(MAX),
          type NVARCHAR(50),
          updated_at DATETIME2,
          short_description NVARCHAR(MAX),
          slug NVARCHAR(500),
          download_url NVARCHAR(2000),
          created_at DATETIME2 DEFAULT GETDATE(),
          last_synced_at DATETIME2 DEFAULT GETDATE()
        )
        
        CREATE INDEX idx_games_updated_at ON games(updated_at)
        CREATE INDEX idx_games_group_name ON games(group_name)
        CREATE INDEX idx_games_slug ON games(slug)
        
        SELECT 'created' as status
      END
      ELSE
      BEGIN
        -- Add download_url column if table exists but column doesn't
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('games') AND name = 'download_url')
        BEGIN
          ALTER TABLE games ADD download_url NVARCHAR(2000)
        END
        SELECT 'exists' as status
      END
    `;
    
    const result = await pool.request().query(createTableQuery);
    const status = result.recordset[0]?.status;
    
    if (status === 'created') {
      console.log('✅ Table "games" created successfully with indexes');
    } else {
      console.log('ℹ️  Table "games" already exists');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    throw error;
  }
}

/**
 * Initialize database (create database and table if needed)
 */
async function initializeDatabase() {
  try {
    await createDatabaseIfNotExists();
    
    // Reconnect to the target database
    if (pool) {
      await pool.close();
      pool = null;
    }
    
    await createTableIfNotExists();
    console.log('✅ Database initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error.message);
  }
}

module.exports = {
  getPool,
  testConnection,
  createDatabaseIfNotExists,
  createTableIfNotExists,
  initializeDatabase,
  closeConnection,
  sql
};
