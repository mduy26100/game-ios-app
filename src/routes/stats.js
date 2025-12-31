const express = require('express');
const router = express.Router();
const { getStats, getCountByGroup, getRecentGames } = require('../services/databaseService');

/**
 * GET /api/stats
 * Get database statistics
 */
router.get('/', async (req, res, next) => {
  try {
    const stats = await getStats();
    const groupCounts = await getCountByGroup();
    const recentGames = await getRecentGames(5);
    
    // Format group counts as an object
    const groups = {};
    groupCounts.forEach(item => {
      groups[item.group_name || 'unknown'] = item.count;
    });
    
    res.json({
      success: true,
      data: {
        total_games: stats.total_games,
        total_groups: stats.total_groups,
        first_created: stats.first_created,
        last_synced: stats.last_synced,
        groups,
        recent_updates: recentGames
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
