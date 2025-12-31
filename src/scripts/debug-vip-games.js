require('dotenv').config();
const { initializeDatabase, closeConnection } = require('../config/database');
const sql = require('mssql');

async function testVIPGames() {
  try {
    await initializeDatabase();
    const pool = await sql.connect();
    
    console.log('\n=== Checking database for VIP games ===\n');
    
    // Check total games
    const total = await pool.request().query('SELECT COUNT(*) as total FROM games');
    console.log(`Total games in database: ${total.recordset[0].total}`);
    
    // Check distinct group_name values
    const groups = await pool.request().query(`
      SELECT DISTINCT group_name, COUNT(*) as count 
      FROM games 
      WHERE group_name IS NOT NULL
      GROUP BY group_name
      ORDER BY count DESC
    `);
    console.log('\nDistinct group_name values:');
    groups.recordset.forEach(g => {
      console.log(`  ${g.group_name}: ${g.count} games`);
    });
    
    // Check games with 'vip' in group_name (case insensitive)
    const vipGames = await pool.request().query(`
      SELECT TOP 10 id, title, group_name, type
      FROM games
      WHERE group_name LIKE '%vip%'
      ORDER BY updated_at DESC
    `);
    console.log(`\nGames with 'vip' in group_name: ${vipGames.recordset.length}`);
    if (vipGames.recordset.length > 0) {
      vipGames.recordset.forEach(g => {
        console.log(`  [${g.id}] ${g.title} - Group: ${g.group_name}, Type: ${g.type}`);
      });
    }
    
    // Check games where group_name exactly equals 'vip'
    const exactVip = await pool.request()
      .input('group', sql.NVarChar(50), 'vip')
      .query('SELECT COUNT(*) as total FROM games WHERE group_name = @group');
    console.log(`\nGames with exact group_name='vip': ${exactVip.recordset[0].total}`);
    
    console.log('\n=== Test complete ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeConnection();
  }
}

testVIPGames();
