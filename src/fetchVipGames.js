require('dotenv').config();
const { initializeDatabase, closeConnection } = require('./config/database');
const { upsertGames, getStats, getCountByGroup } = require('./services/databaseService');
const axios = require('axios');

const API_VIP_URL = 'https://app.iosgods.com/store/api/games/popular-vip';
const START_PAGE = 1;
const END_PAGE = 100;
const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 3;

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.data;
    } catch (error) {
      console.warn(`⚠️  Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`);
      
      if (attempt === retries) {
        throw new Error(`Failed to fetch after ${retries} attempts: ${error.message}`);
      }
      
      const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`   Retrying in ${backoffTime}ms...`);
      await sleep(backoffTime);
    }
  }
}

/**
 * Fetch VIP games from a specific page
 */
async function fetchVipPage(pageNumber) {
  try {
    const url = `${API_VIP_URL}?page=${pageNumber}`;
    console.log(`📥 Fetching VIP page ${pageNumber}...`);
    
    const data = await fetchWithRetry(url);
    
    let games = [];
    if (data && Array.isArray(data.data)) {
      games = data.data;
    } else if (Array.isArray(data)) {
      games = data;
    }
    
    console.log(`✅ Fetched ${games.length} VIP games from page ${pageNumber}`);
    return games;
  } catch (error) {
    console.error(`❌ Error fetching VIP page ${pageNumber}:`, error.message);
    return [];
  }
}

/**
 * Validate game data
 */
function validateGame(game) {
  return !!(game && typeof game === 'object' && game.id && game.title);
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('   IOSGods VIP Games Scraper to MSSQL Database');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Initialize database
    console.log('📊 Step 1: Initializing Database...\n');
    await initializeDatabase();
    
    // Fetch VIP games
    console.log('\n📡 Step 2: Fetching VIP Games from API...\n');
    
    let pageProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    
    for (let page = START_PAGE; page <= END_PAGE; page++) {
      try {
        const games = await fetchVipPage(page);
        
        if (games.length === 0) {
          console.log(`ℹ️  Page ${page} returned no games\n`);
        } else {
          // Validate games
          const validGames = games.filter(validateGame);
          const invalidCount = games.length - validGames.length;
          
          if (invalidCount > 0) {
            console.warn(`⚠️  Page ${page}: ${invalidCount} invalid games skipped`);
          }
          
          // Save to database
          if (validGames.length > 0) {
            console.log(`💾 Saving ${validGames.length} VIP games from page ${page}...`);
            const results = await upsertGames(validGames);
            
            totalInserted += results.inserted;
            totalUpdated += results.updated;
            totalFailed += results.failed;
            
            if (results.failed > 0) {
              console.error(`   Failed to save ${results.failed} games`);
            }
            
            console.log(`   ✅ Inserted: ${results.inserted}, Updated: ${results.updated}`);
          }
        }
        
        pageProcessed++;
        const progress = ((page - START_PAGE + 1) / (END_PAGE - START_PAGE + 1) * 100).toFixed(1);
        console.log(`📊 Progress: ${progress}% (Page ${page}/${END_PAGE})\n`);
        
        // Rate limiting
        if (page < END_PAGE) {
          await sleep(REQUEST_DELAY_MS);
        }
        
      } catch (error) {
        console.error(`❌ Failed to process page ${page}:`, error.message);
      }
    }
    
    // Display statistics
    console.log('\n📈 Step 3: Final Statistics...\n');
    
    const stats = await getStats();
    const groupCounts = await getCountByGroup();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('              VIP SCRAPING RESULTS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total Games in Database: ${stats.total_games}`);
    console.log(`Total Groups: ${stats.total_groups}`);
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
    
    console.log('✅ VIP games scraping completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during scraping:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
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
