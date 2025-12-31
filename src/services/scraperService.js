const axios = require('axios');
const { upsertGames } = require('./databaseService');

// Constants
const CONFIG = {
  VIP: {
    URL: 'https://app.iosgods.com/store/api/games/popular-vip',
    TYPE: 'VIP'
  },
  APPS: {
    URL: 'https://app.iosgods.com/store/api/apps/most-downloaded',
    TYPE: 'APP'
  },
  DELAY_MS: 500,
  MAX_RETRIES: 3
};

// Global State (In-Memory)
let scrapeState = {
  status: 'idle', // idle, running, completed, error, stopping
  config: null,
  progress: {
    current: 0,
    total: 0,
    percent: 0
  },
  stats: {
    inserted: 0,
    updated: 0,
    failed: 0
  },
  logs: [] 
};

/**
 * Add log entry
 */
function addLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  
  // Keep last 50 logs
  scrapeState.logs.unshift(logEntry);
  if (scrapeState.logs.length > 50) {
    scrapeState.logs.pop();
  }
  
  console.log(logEntry);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry
 */
async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      return response.data;
    } catch (error) {
      if (attempt === CONFIG.MAX_RETRIES) throw error;
      await sleep(1000 * attempt);
    }
  }
}

/**
 * Get current status
 */
function getStatus() {
  return scrapeState;
}

/**
 * Start scraping process
 */
async function startScrape({ source, customUrl, pages = 1 }) {
  if (scrapeState.status === 'running') {
    throw new Error('Scraper is already running');
  }

  // Reset State
  scrapeState = {
    status: 'running',
    config: { source, pages },
    progress: { current: 0, total: pages, percent: 0 },
    stats: { inserted: 0, updated: 0, failed: 0 },
    logs: []
  };

  addLog(`Starting scraper: Source=${source}, Pages=${pages}`);

  // Determine URL
  let baseUrl;
  if (source === 'vip') baseUrl = CONFIG.VIP.URL;
  else if (source === 'apps') baseUrl = CONFIG.APPS.URL;
  else baseUrl = customUrl;

  if (!baseUrl) {
    scrapeState.status = 'error';
    addLog('Invalid configuration: No URL provided', 'error');
    return;
  }

  // Run async (fire and forget)
  runScrapingLoop(baseUrl, pages).catch(err => {
    scrapeState.status = 'error';
    addLog(`Fatal Error: ${err.message}`, 'error');
  });

  return { success: true, message: 'Scraper started' };
}

/**
 * Main Scraping Loop
 */
async function runScrapingLoop(baseUrl, totalPages) {
  try {
    for (let page = 1; page <= totalPages; page++) {
      if (scrapeState.status === 'stopping') break;

      // Update URL with page param
      const separator = baseUrl.includes('?') ? '&' : '?';
      const url = `${baseUrl}${separator}page=${page}`;
      
      addLog(`Fetching page ${page}/${totalPages}...`);
      
      try {
        const data = await fetchWithRetry(url);
        
        let games = [];
        if (data && Array.isArray(data.data)) games = data.data;
        else if (Array.isArray(data)) games = data;

        if (games.length > 0) {
          // Validate
          const validGames = games.filter(g => g && g.id && g.title);
          
          if (validGames.length > 0) {
            const results = await upsertGames(validGames);
            
            // Update Stats
            scrapeState.stats.inserted += results.inserted;
            scrapeState.stats.updated += results.updated;
            scrapeState.stats.failed += results.failed;
            
            addLog(`Page ${page}: +${results.inserted} new, ~${results.updated} updated`);
          } else {
            addLog(`Page ${page}: No valid games found`, 'warn');
          }
        } else {
          addLog(`Page ${page}: Empty response`, 'warn');
        }

      } catch (err) {
        addLog(`Failed page ${page}: ${err.message}`, 'error');
        scrapeState.stats.failed++;
      }

      // Update Progress
      scrapeState.progress.current = page;
      scrapeState.progress.percent = Math.round((page / totalPages) * 100);

      // Rate Limit
      if (page < totalPages) await sleep(CONFIG.DELAY_MS);
    }

    scrapeState.status = 'completed';
    addLog('Scraping completed successfully', 'success');

  } catch (error) {
    scrapeState.status = 'error';
    addLog(`Scraper crashed: ${error.message}`, 'error');
  }
}

/**
 * Stop scraper
 */
function stopScrape() {
  if (scrapeState.status === 'running') {
    scrapeState.status = 'stopping';
    addLog('Stopping scraper...', 'warn');
    return { success: true };
  }
  return { success: false, message: 'Not running' };
}

module.exports = {
  startScrape,
  stopScrape,
  getStatus
};
