const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../src/config/database');

async function runMigration(fileName) {
  try {
    const filePath = path.join(__dirname, '../migrations', fileName);
    console.log(`Reading migration: ${filePath}`);
    const query = fs.readFileSync(filePath, 'utf8');
    
    console.log('Connecting to database...');
    const pool = await getPool();
    
    console.log('Executing migration statements sequentially...');
    // A simple split by semicolon (careful with semicolons inside strings, though this migration is simple)
    const statements = query
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await pool.request().query(statement);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('already an object named') || err.message.includes('already has a primary key') || err.message.includes('Column names in each table must be unique')) {
          console.log(`ℹ️  Skipping: ${err.message}`);
        } else {
          throw err;
        }
      }
    }
    
    console.log(`✅ Migration ${fileName} executed successfully (${statements.length} statements)!`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Migration failed:`, error.message);
    process.exit(1);
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Please provide a migration filename (e.g., 010_rbac_system.sql)');
  process.exit(1);
}

runMigration(migrationFile);
