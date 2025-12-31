const sql = require('mssql');
const { getPool } = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 Running migration 006: Add admin and VIP packages...\n');
    const pool = await getPool();
    
    // Step 1: Add is_admin column
    console.log('Step 1: Adding is_admin column to users table...');
    const checkAdmin = await pool.request().query(`
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'users') AND name = 'is_admin'
    `);
    
    if (checkAdmin.recordset.length === 0) {
      await pool.request().query(`ALTER TABLE users ADD is_admin BIT DEFAULT 0`);
      await pool.request().query(`CREATE INDEX idx_users_admin ON users(is_admin)`);
      console.log('✅ Added is_admin column');
    } else {
      console.log('✓  is_admin column already exists');
    }
    
    // Step 2: Create vip_packages table
    console.log('\nStep 2: Creating vip_packages table...');
    const checkTable = await pool.request().query(`
      SELECT * FROM sysobjects WHERE name='vip_packages' and xtype='U'
    `);
    
    if (checkTable.recordset.length === 0) {
      await pool.request().query(`
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
        )
      `);
      
      await pool.request().query(`
        CREATE INDEX idx_packages_active ON vip_packages(is_active, display_order)
      `);
      await pool.request().query(`
        CREATE INDEX idx_packages_duration ON vip_packages(duration_months)
      `);
      
      console.log('✅ Created vip_packages table');
    } else {
      console.log('✓  vip_packages table already exists');
    }
    
    // Step 3: Insert default packages
    console.log('\nStep 3: Inserting default VIP packages...');
    const checkPackages = await pool.request().query(`SELECT COUNT(*) as count FROM vip_packages`);
    
    if (checkPackages.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO vip_packages (duration_months, price, title, description, discount_label, display_order, is_featured)
        VALUES 
          (1, 50000, '1 Month VIP', 'Perfect for trying out VIP features', NULL, 1, 0),
          (3, 120000, '3 Months VIP', 'Most popular choice - best value!', '20% OFF', 2, 1),
          (6, 200000, '6 Months VIP', 'Extended access with great savings', '33% OFF', 3, 0),
          (12, 350000, '1 Year VIP', 'Ultimate package - maximum savings!', '42% OFF', 4, 0)
      `);
      console.log('✅ Inserted 4 default VIP packages');
    } else {
      console.log(`✓  ${checkPackages.recordset[0].count} VIP packages already exist`);
    }
    
    console.log('\n✅ Migration 006 completed successfully!\n');
    
    // Display current packages
    const packages = await pool.request().query(`
      SELECT * FROM vip_packages ORDER BY display_order
    `);
    
    console.log('Current VIP Packages:');
    console.table(packages.recordset.map(p => ({
      ID: p.id,
      Duration: `${p.duration_months} month(s)`,
      Price: `${p.price.toLocaleString()} VND`,
      Title: p.title,
      Active: p.is_active ? 'Yes' : 'No',
      Featured: p.is_featured ? 'Yes' : 'No'
    })));
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.close();
  }
}

runMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exit(1);
  });
