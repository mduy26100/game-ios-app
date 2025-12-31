require('dotenv').config();
const { getPool, sql, closeConnection } = require('./config/database');
const { generateDownloadUrl } = require('./services/downloadService');

/**
 * Script to update existing games with download URLs
 * This is useful if you already have games in the database without download URLs
 */
async function updateDownloadUrls() {
  try {
    console.log('🔄 Starting to update download URLs for existing games...\n');
    
    const pool = await getPool();
    
    // Get all games without download URLs or with null download URLs
    const gamesQuery = `
      SELECT id, slug 
      FROM games 
      WHERE download_url IS NULL OR download_url = ''
    `;
    
    const result = await pool.request().query(gamesQuery);
    const games = result.recordset;
    
    if (games.length === 0) {
      console.log('✅ All games already have download URLs!');
      return;
    }
    
    console.log(`Found ${games.length} games to update\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const game of games) {
      try {
        const downloadUrl = generateDownloadUrl(game.id, game.slug);
        
        if (downloadUrl) {
          await pool.request()
            .input('id', sql.Int, game.id)
            .input('download_url', sql.NVarChar(2000), downloadUrl)
            .query('UPDATE games SET download_url = @download_url WHERE id = @id');
          
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`Progress: ${updated}/${games.length} games updated`);
          }
        } else {
          console.warn(`⚠️  Could not generate URL for game ${game.id}`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Error updating game ${game.id}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                   UPDATE COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total games processed: ${games.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    throw error;
  } finally {
    await closeConnection();
  }
}

// Run the update
if (require.main === module) {
  updateDownloadUrls().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { updateDownloadUrls };
