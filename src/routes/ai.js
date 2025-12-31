const express = require('express');
const router = express.Router();
const { generateGuideResponse } = require('../services/aiService');

/**
 * @route   POST /api/ai/guide
 * @desc    Get AI guide assistance
 * @access  Public
 */
router.post('/guide', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const response = await generateGuideResponse(prompt, history || []);
    
    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('AI Guide error:', error.message);
    
    // Forward upstream status code if available (e.g. 429 Too Many Requests)
    const status = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to get AI assistance';
    
    res.status(status).json({
      success: false,
      error: errorMessage
    });
  }
});

module.exports = router;
