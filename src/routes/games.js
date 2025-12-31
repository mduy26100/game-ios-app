const express = require('express');
const router = express.Router();
const {
  getGamesPaginated,
  searchGames,
  getGameById,
  getRecentGames
} = require('../services/databaseService');
const { getDownloadInfo } = require('../services/downloadService');

/**
 * GET /api/games
 * List all games with pagination and optional filtering by group
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const group = req.query.group; // 'vip' or 'free'
    const type = req.query.type; // 'game' or 'app'
    
    // Validate
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100' }
      });
    }
    
    if (group && !['vip', 'free'].includes(group.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid group. Must be "vip" or "free"' }
      });
    }

    if (type && !['game', 'app'].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid type. Must be "game" or "app"' }
      });
    }
    
    const result = await getGamesPaginated(page, limit, group, type);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/games/search
 * Search games by title or description
 */
router.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: { message: 'Search query "q" is required' }
      });
    }
    
    const result = await searchGames(query, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/games/recent
 * Get recently updated games
 */
router.get('/recent', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    if (limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        error: { message: 'Limit must be between 1 and 50' }
      });
    }
    
    const games = await getRecentGames(limit);
    
    res.json({
      success: true,
      data: { games }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/games/:id
 * Get a single game by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid game ID' }
      });
    }
    
    const game = await getGameById(id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: { message: 'Game not found' }
      });
    }
    
    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    next(error);
  }
});

const { optionalAuth } = require('../middleware/auth');

/**
 * GET /api/games/:id/download
 * Get download URLs for a game
 */
router.get('/:id/download', optionalAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid game ID' }
      });
    }
    
    const game = await getGameById(id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: { message: 'Game not found' }
      });
    }

    // Check VIP access
    if (game.group_name === 'vip') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required for VIP games' }
        });
      }
      if (!req.user.is_vip) {
        return res.status(403).json({
          success: false,
          error: { message: 'VIP subscription required' }
        });
      }
    }
    
    const downloadInfo = getDownloadInfo(game.id, game.slug);
    
    res.json({
      success: true,
      data: {
        id: game.id,
        title: game.title,
        ...downloadInfo
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
