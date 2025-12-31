require('dotenv').config();

/**
 * Service for generating download URLs for games
 */

const DOWNLOAD_BASE_URL = process.env.DOWNLOAD_BASE_URL || 'https://app.iosgods.com/store/download-ipa';
const DOWNLOAD_TOKEN = process.env.DOWNLOAD_TOKEN || '';

/**
 * Generate download URL for a game
 * Format: https://app.iosgods.com/store/download-ipa/{id}-{slug}/sideloadly?token={token}
 * 
 * @param {number} gameId - Game ID
 * @param {string} slug - Game slug
 * @returns {string} Complete download URL with token
 */
function generateDownloadUrl(gameId, slug) {
  if (!gameId || !slug) {
    return null;
  }
  
  // Build the URL path: {id}-{slug}/sideloadly
  const path = `${slug}/sideloadly`;
  
  // Build full URL with token
  if (DOWNLOAD_TOKEN) {
    return `${DOWNLOAD_BASE_URL}/${path}?token=${DOWNLOAD_TOKEN}`;
  } else {
    // Return URL without token if not configured
    return `${DOWNLOAD_BASE_URL}/${path}`;
  }
}

/**
 * Generate download URL for Altstore
 * Format: https://app.iosgods.com/store/download-ipa/{id}-{slug}/altstore?token={token}
 * 
 * @param {number} gameId - Game ID
 * @param {string} slug - Game slug
 * @returns {string} Complete download URL for Altstore
 */
function generateAltstoreUrl(gameId, slug) {
  if (!gameId || !slug) {
    return null;
  }
  
  const path = `${slug}/altstore`;
  
  if (DOWNLOAD_TOKEN) {
    return `${DOWNLOAD_BASE_URL}/${path}?token=${DOWNLOAD_TOKEN}`;
  } else {
    return `${DOWNLOAD_BASE_URL}/${path}`;
  }
}

/**
 * Check if download token is configured
 * @returns {boolean}
 */
function hasDownloadToken() {
  return !!DOWNLOAD_TOKEN && DOWNLOAD_TOKEN.length > 0;
}

/**
 * Get download info for a game
 * @param {number} gameId - Game ID
 * @param {string} slug - Game slug
 * @returns {object} Object containing download URLs
 */
function getDownloadInfo(gameId, slug) {
  return {
    sideloadly: generateDownloadUrl(gameId, slug),
    altstore: generateAltstoreUrl(gameId, slug),
    hasToken: hasDownloadToken()
  };
}

module.exports = {
  generateDownloadUrl,
  generateAltstoreUrl,
  hasDownloadToken,
  getDownloadInfo
};
