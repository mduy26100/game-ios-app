require('dotenv').config();
const { initializeDatabase, closeConnection } = require('./config/database');
const { fetchAllPages, validateGame } = require('./services/apiService');
const { upsertGames, getStats, getCountByGroup } = require('./services/databaseService');

const START_PAGE = parseInt(process.env.START_PAGE || '1');
const END_PAGE = parseInt(process.env.END_PAGE || '100');

/**
 * Main function to orchestrate the scraping process
 */
async function main() {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('   IOSGods API Scraper to MSSQL Database');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Initialize database
    console.log('📊 Step 1: Initializing Database...\n');
    await initializeDatabase();
    
    // Step 2: Fetch data from API
    console.log('\n📡 Step 2: Fetching Data from API...\n');
    
    let pageProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    
    // Progress callback function
    const onProgress = async (pageNumber, games) => {
      pageProcessed++;
      
      // Validate games
      const validGames = games.filter(validateGame);
      const invalidCount = games.length - validGames.length;
      
      if (invalidCount > 0) {
        console.warn(`⚠️  Page ${pageNumber}: ${invalidCount} invalid games skipped`);
      }
      
      // Save to database
      if (validGames.length > 0) {
        console.log(`💾 Saving ${validGames.length} games from page ${pageNumber}...`);
        const results = await upsertGames(validGames);
        
        totalInserted += results.inserted;
        totalUpdated += results.updated;
        totalFailed += results.failed;
        
        if (results.failed > 0) {
          console.error(`   Failed to save ${results.failed} games`);
          results.errors.forEach(err => {
            console.error(`   - Game ${err.gameId}: ${err.error}`);
          });
        }
        
        console.log(`   ✅ Inserted: ${results.inserted}, Updated: ${results.updated}`);
      }
      
      // Progress summary
      const progress = ((pageNumber - START_PAGE + 1) / (END_PAGE - START_PAGE + 1) * 100).toFixed(1);
      console.log(`📊 Progress: ${progress}% (Page ${pageNumber}/${END_PAGE})\n`);
    };
    
    // Fetch all pages with progress tracking
    await fetchAllPages(START_PAGE, END_PAGE, onProgress);
    
    // Step 3: Display statistics
    console.log('\n📈 Step 3: Final Statistics...\n');
    
    const stats = await getStats();
    const groupCounts = await getCountByGroup();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    FINAL RESULTS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Games in Database: ${stats.total_games}`);
    console.log(`Total Groups: ${stats.total_groups}`);
    console.log(`First Created: ${stats.first_created ? new Date(stats.first_created).toLocaleString() : 'N/A'}`);
    console.log(`Last Synced: ${stats.last_synced ? new Date(stats.last_synced).toLocaleString() : 'N/A'}`);
    console.log('\n--- Current Session ---');
    console.log(`Pages Processed: ${pageProcessed}/${END_PAGE - START_PAGE + 1}`);
    console.log(`Games Inserted: ${totalInserted}`);
    console.log(`Games Updated: ${totalUpdated}`);
    console.log(`Games Failed: ${totalFailed}`);
    
    if (groupCounts.length > 0) {
      console.log('\n--- Games by Group ---');
      groupCounts.forEach(group => {
        console.log(`${group.group_name || '(no group)'}: ${group.count}`);
      });
    }
    
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Total Time: ${elapsedTime} seconds`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('✅ Scraping completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during scraping:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await closeConnection();
  }
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
