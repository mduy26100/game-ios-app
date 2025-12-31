require('dotenv').config();
const axios = require('axios');
const { initializeDatabase, closeConnection } = require('../config/database');
const { getSettingValue } = require('../services/settingsService');

async function listModels() {
  try {
    await initializeDatabase();
    
    const apiKey = await getSettingValue('google_ai_api_key');
    if (!apiKey) {
      console.error('No Google AI API Key found in settings');
      return;
    }

    console.log('Fetching available models with API key...');
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    console.log('\nAvailable Models:');
    response.data.models.forEach(model => {
      console.log(`- ${model.name} (${model.version})`);
      console.log(`  Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
    });

  } catch (error) {
    console.error('Error fetching models:', error.response?.data?.error?.message || error.message);
  } finally {
    await closeConnection();
  }
}

listModels();
