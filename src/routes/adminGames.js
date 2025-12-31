const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const { getGames } = require('../services/databaseService');

/**
 * @route   GET /api/admin/games
 * @desc    Get all games with filters
 * @access  Admin
 */
router.get('/games', requireAdmin, async (req, res) => {
  try {
    const { search, group, type, page = 1, limit = 50 } = req.query;
    
    const filters = {};
    if (search) filters.search = search;
    if (group) filters.group = group;
    if (type) filters.type = type;
    
    const games = await getGames({
      ...filters,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      games: games.games,
      pagination: games.pagination
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/games/:id
 * @desc    Update game details
 * @access  Admin
 */
router.put('/games/:id', requireAdmin, async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const updates = req.body;
    
    const game = await updateGame(gameId, updates);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    console.log(`✅ Admin updated game: ${game.title}`);
    
    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/games/:id/visibility
 * @desc    Update game visibility (vip/free/hidden)
 * @access  Admin
 */
router.put('/games/:id/visibility', requireAdmin, async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const { group } = req.body; // 'vip', 'free', or 'hidden'
    
    if (!['vip', 'free', 'hidden'].includes(group)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid visibility value. Must be vip, free, or hidden'
      });
    }
    
    const game = await updateGame(gameId, { group });
    
    console.log(`✅ Admin changed game visibility: ${game.title} -> ${group}`);
    
    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Update game visibility error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
