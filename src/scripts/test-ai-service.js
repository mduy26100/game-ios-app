require('dotenv').config();
const { initializeDatabase, closeConnection } = require('../config/database');
const { generateGuideResponse } = require('../services/aiService');

async function testAI() {
  try {
    await initializeDatabase();
    
    console.log('Testing AI Service with Gemini Flash Latest...');
    console.log('Prompt: "Liệt kê cho tôi những app vip"');
    
    const result = await generateGuideResponse("Liệt kê cho tôi những app vip", []);
    
    console.log('\nResponse:');
    console.log(result);
    
    console.log('\n✅ AI Service Test Successful');
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await closeConnection();
  }
}

testAI();
