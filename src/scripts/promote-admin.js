const sql = require('mssql');
const { getPool } = require('../config/database');

/**
 * Promote a user to admin by email
 * Usage: node src/scripts/promote-admin.js user@example.com
 */

async function promoteToAdmin(email) {
  try {
    const pool = await getPool();
    
    // Check if user exists
    const userResult = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');
    
    if (userResult.recordset.length === 0) {
      console.error(`❌ User not found: ${email}`);
      return false;
    }
    
    const user = userResult.recordset[0];
    
    if (user.is_admin) {
      console.log(`✓  User ${email} is already an admin`);
      return true;
    }
    
    // Promote to admin
    await pool.request()
      .input('email', sql.NVarChar, email)
      .query('UPDATE users SET is_admin = 1 WHERE email = @email');
    
    console.log(`✅ Successfully promoted ${email} to admin`);
    console.log(`\nUser details:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name || 'N/A'}`);
    console.log(`  VIP Status: ${user.is_vip ? 'Yes' : 'No'}`);
    console.log(`  Admin: Yes (just granted)`);
    
    return true;
  } catch (error) {
    console.error('❌ Error promoting user:', error);
    throw error;
  } finally {
    await sql.close();
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('Usage: node src/scripts/promote-admin.js <email>');
  console.error('Example: node src/scripts/promote-admin.js admin@example.com');
  process.exit(1);
}

promoteToAdmin(email)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
