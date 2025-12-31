require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL;
const REQUEST_DELAY_MS = parseInt(process.env.REQUEST_DELAY_MS || '500');
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3');

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch data from API with retry logic
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
      
      // Exponential backoff
      const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`   Retrying in ${backoffTime}ms...`);
      await sleep(backoffTime);
    }
  }
}

/**
 * Fetch games from a specific page
 */
async function fetchPage(pageNumber) {
  try {
    const url = `${API_BASE_URL}?page=${pageNumber}`;
    console.log(`📥 Fetching page ${pageNumber}...`);
    
    const data = await fetchWithRetry(url);
    
    // The API returns an object with a 'data' property containing the games array
    let games = [];
    
    if (data && Array.isArray(data.data)) {
      games = data.data;
    } else if (Array.isArray(data)) {
      games = data;
    } else {
      console.warn(`⚠️  Unexpected response format for page ${pageNumber}`);
      return [];
    }
    
    console.log(`✅ Fetched ${games.length} games from page ${pageNumber}`);
    return games;
  } catch (error) {
    console.error(`❌ Error fetching page ${pageNumber}:`, error.message);
    return [];
  }
}

/**
 * Fetch all games from start page to end page
 */
async function fetchAllPages(startPage = 1, endPage = 100, onProgress = null) {
  const allGames = [];
  let totalFetched = 0;
  
  console.log(`\n🚀 Starting to fetch pages ${startPage} to ${endPage}...\n`);
  
  for (let page = startPage; page <= endPage; page++) {
    try {
      const games = await fetchPage(page);
      
      if (games.length === 0) {
        console.log(`ℹ️  Page ${page} returned no games, might have reached the end`);
        // Continue to next page instead of breaking, as some pages might be empty
      } else {
        allGames.push(...games);
        totalFetched += games.length;
      }
      
      // Callback for progress tracking
      if (onProgress && typeof onProgress === 'function') {
        await onProgress(page, games);
      }
      
      // Rate limiting - delay between requests
      if (page < endPage) {
        await sleep(REQUEST_DELAY_MS);
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch page ${page}:`, error.message);
      // Continue with next page even if one fails
    }
  }
  
  console.log(`\n✅ Completed fetching all pages. Total games: ${totalFetched}\n`);
  return allGames;
}

/**
 * Validate game data structure
 */
function validateGame(game) {
  if (!game || typeof game !== 'object') {
    return false;
  }
  
  // Check required fields
  if (!game.id || !game.title) {
    return false;
  }
  
  return true;
}

module.exports = {
  fetchPage,
  fetchAllPages,
  validateGame,
  sleep
};
