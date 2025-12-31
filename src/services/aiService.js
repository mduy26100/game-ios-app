const axios = require('axios');
const { getSettingValue } = require('./settingsService');
const { getStats, getRecentGames, getVipGames } = require('./databaseService');

/**
 * AI Service for user assistance
 */
async function generateGuideResponse(userPrompt, conversationHistory = []) {
  const provider = await getSettingValue('ai_provider') || 'google';
  
  // 1. Gather Real-time Context from Database
  const context = await gatherSystemContext();

  const systemInstructions = `You are "GodsAI", the official assistant for IOSGods Games. 
  Your goal is to help users navigate the site, find games, and understand how to use hacked iOS apps.

  SYSTEM CONTEXT (Real-time Data):
  - Total Games Available: ${context.stats.total_games || 'Thousands'}
  - Last Database Update: ${context.stats.last_synced ? new Date(context.stats.last_synced).toLocaleString() : 'Recently'}
  - Trending/Newest Games: ${context.recentGames.map(g => `${g.title} (ID: ${g.id})`).join(', ')}
  - VIP Games (Samples): ${context.vipGames.map(g => `${g.title} (ID: ${g.id})`).join(', ')}

  IMPORTANT SITE INFORMATION:
  - Website Name: IOSGods Games.
  - Categories: Games (Hacked/Modded), Apps (Tweaked/Premium).
  - VIP System: Some apps require VIP. VIP can be purchased at /vip. 
  - VIP Benefits: Unlimited downloads, no ads, priority support, faster speeds.
  - Pricing Plans: Monthly, Quarterly, Yearly, and Lifetime (0 months).
  - Payment: Handled securely via MoMo (Vietnam).
  - Installation: Users need to "sideload" IPAs. Recommended tools: Sideloadly, AltStore.

  INTERACTIVE TAG PROTOCOL (CRITICAL):
  You can output special tags to render UI elements. Use these whenever relevant:

  1. [ACTION:NAVIGATE|label=Button Text|path=/url]
     - Use for navigation suggestions (e.g. "Go to VIP", "Go to Apps").
     - Example: "You can check our plans here: [ACTION:NAVIGATE|label=View VIP Plans|path=/vip]"
     - For "All VIP Apps", use: [ACTION:NAVIGATE|label=Browse All VIP Apps|path=/games?group=vip]

  2. [WIDGET:GAME_MINI|id=123|name=Game Name|icon=url_or_empty]
     - Use when mentioning specific games found in the SYSTEM CONTEXT.
     - Example: "We just updated PUBG! [WIDGET:GAME_MINI|id=567|name=PUBG Mobile|icon=]"

  3. [ACTION:SEARCH|term=search query]
     - Use if the user asks for a game not in your context list.
     - Example: "I can't see that game right now. [ACTION:SEARCH|term=Minecraft]"

  GUIDELINES:
  1. Be helpful, professional, and concise.
  2. Use Markdown for text formatting (bold key terms).
  3. ALWAYS prioritize using Interactive Tags over plain links.
  4. If asked to "List VIP apps" or similar, do NOT refuse. Instead:
     - List the 3-5 VIP samples from your Context using [WIDGET:GAME_MINI].
     - Then provide a button to view the full list: [ACTION:NAVIGATE|label=Browse All VIP Apps|path=/games?group=vip].
  5. If asked about "New games" or "Trending", refer strictly to the SYSTEM CONTEXT provided above.
  6. If the user mentions payment issues, suggest contacting support on the Forum.

  Format: Standard Markdown mixed with the Interactive Tags defined above.`;

  if (provider === 'google') {
    const apiKey = await getSettingValue('google_ai_api_key');
    if (!apiKey) throw new Error('Google AI API Key is not configured in Admin Settings');

    const contents = [
      { parts: [{ text: systemInstructions }] },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: userPrompt }] }
    ];

    // Use gemini-flash-latest which points to the latest stable Flash model (e.g. 1.5)
    // This avoids "model not found" errors if specific versions are regional or deprecated for this key
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      contents
    });

    return response.data.candidates[0].content.parts[0].text;
  } else {
    // Fallback or OpenAI
    const apiKey = await getSettingValue('openai_api_key');
    if (!apiKey) throw new Error('OpenAI API Key is not configured');

    const messages = [
      { role: 'system', content: systemInstructions },
      ...conversationHistory,
      { role: 'user', content: userPrompt }
    ];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4-turbo',
      messages
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    return response.data.choices[0].message.content;
  }
}



/**
 * Gather system context
 */
async function gatherSystemContext() {
  try {
    const [stats, recentGames, vipGames] = await Promise.all([
      getStats(),
      getRecentGames(5),
      getVipGames(5)
    ]);
    return { stats, recentGames, vipGames };
  } catch (error) {
    console.error('Failed to gather AI context:', error);
    return { stats: {}, recentGames: [], vipGames: [] };
  }
}

module.exports = {
  generateGuideResponse
};
