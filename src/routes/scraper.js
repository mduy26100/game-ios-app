const express = require('express');
const router = express.Router();
const { startScrape, stopScrape, getStatus } = require('../services/scraperService');
const { requireAdmin } = require('../middleware/adminAuth');

/**
 * @route POST /api/admin/scraper/start
 * @desc Start the scraper
 * @access Admin
 */
router.post('/start', requireAdmin, async (req, res) => {
  try {
    const { source, customUrl, pages } = req.body;
    
    // Validation
    if (!source && !customUrl) {
      return res.status(400).json({ success: false, error: 'Source or Custom URL is required' });
    }

    const result = await startScrape({ 
      source, 
      customUrl, 
      pages: parseInt(pages) || 1 
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/admin/scraper/stop
 * @desc Stop the scraper
 * @access Admin
 */
router.post('/stop', requireAdmin, (req, res) => {
  try {
    const result = stopScrape();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/admin/scraper/status
 * @desc Get current scraper status
 * @access Admin
 */
router.get('/status', requireAdmin, (req, res) => {
  try {
    const status = getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
