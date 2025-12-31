const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const { requirePermission } = require('../middleware/auth');
const { getSettings, updateSetting, getSettingValue } = require('../services/settingsService');
const axios = require('axios');

/**
 * @route   GET /api/admin/settings
 * @desc    Get all system settings
 * @access  Admin
 */
router.get('/settings', requirePermission('settings:view'), async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    Update a system setting
 * @access  Admin
 */
router.put('/settings/:key', requirePermission('settings:manage'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }

    const setting = await updateSetting(key, value);
    
    res.json({
      success: true,
      setting
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/generate-content
 * @desc    Generate content using AI (OpenAI or Google Gemini)
 * @access  Admin
 */
router.post('/generate-content', requirePermission('games:edit'), async (req, res) => {
  try {
    const { title, type, plan, prompt } = req.body;
    
    // Get active provider from settings
    const provider = await getSettingValue('ai_provider') || 'openai';
    
    // Get prompt template if not provided
    let finalPrompt = prompt;
    if (!finalPrompt) {
      const template = await getSettingValue('content_prompt_template');
      if (template) {
        finalPrompt = template
          .replace('{title}', title || '')
          .replace('{type}', type || '')
          .replace('{plan}', plan || '');
      } else {
        finalPrompt = `Write a description for ${title}`;
      }
    }

    let content = '';

    if (provider === 'google') {
      // Use Google Gemini
      const apiKey = await getSettingValue('google_ai_api_key');
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'Google AI API key not configured'
        });
      }

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        contents: [{
          parts: [{ text: finalPrompt }]
        }]
      });

      if (response.data.candidates && response.data.candidates[0].content.parts[0].text) {
        content = response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response from Google AI');
      }
    } else {
      // Use OpenAI
      const apiKey = await getSettingValue('openai_api_key');
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'OpenAI API key not configured'
        });
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: finalPrompt }],
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      content = response.data.choices[0].message.content;
    }

    res.json({
      success: true,
      content,
      provider
    });

  } catch (error) {
    console.error('Generate content error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to generate content'
    });
  }
});

/**
 * @route   POST /api/admin/generate-game-data
 * @desc    Generate structured game data JSON using AI
 * @access  Admin
 */
router.post('/generate-game-data', requirePermission('games:edit'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const provider = await getSettingValue('ai_provider') || 'openai';
    
    const systemPrompt = `You are a professional game data assistant. 
    Return a VALID JSON object exactly matching these fields for the game the user describes. 
    If a field is unknown, use an empty string. 
    Fields: title, description, developer, category, version, size (e.g. 1.2 GB), requirements, bundle_id, package_name.
    JSON ONLY, no markdown, no explanation.`;

    let data = null;

    if (provider === 'google') {
      const apiKey = await getSettingValue('google_ai_api_key');
      if (!apiKey) throw new Error('Google API key not set');

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }]
        }]
      });

      let text = response.data.candidates[0].content.parts[0].text;
      // Clean up markdown code blocks if AI included them
      text = text.replace(/```json\n?|```/g, '').trim();
      data = JSON.parse(text);
    } else {
      const apiKey = await getSettingValue('openai_api_key');
      if (!apiKey) throw new Error('OpenAI API key not set');

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      let text = response.data.choices[0].message.content;
      text = text.replace(/```json\n?|```/g, '').trim();
      data = JSON.parse(text);
    }

    res.json({
      success: true,
      data,
      provider
    });

  } catch (error) {
    console.error('Generate game data error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate game data'
    });
  }
});

module.exports = router;
