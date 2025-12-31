require('dotenv').config();
const express = require('express');
const cors = require('cors');
const gamesRoutes = require('./routes/games');
const statsRoutes = require('./routes/stats');
const authRoutes = require('./routes/auth');
const adminRouter = require('./routes/admin');
const scraperRouter = require('./routes/scraper');
const { initializeDatabase } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase().catch(console.error);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'IOSGods API Server',
    version: '1.0.0',
    endpoints: {
      games: '/api/games',
      search: '/api/games/search?q=query',
      filter: '/api/games?group=vip',
      game_details: '/api/games/:id',
      download: '/api/games/:id/download',
      stats: '/api/stats'
    },
    documentation: '/api/docs'
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    documentation: {
      'GET /api/games': {
        description: 'List all games with pagination',
        parameters: {
          page: 'Page number (default: 1)',
          limit: 'Items per page (default: 20, max: 100)',
          group: 'Filter by group: "vip" or "free" (optional)'
        },
        example: '/api/games?page=1&limit=20&group=vip'
      },
      'GET /api/games/search': {
        description: 'Search games by title or description',
        parameters: {
          q: 'Search query (required)',
          page: 'Page number (default: 1)',
          limit: 'Items per page (default: 20, max: 100)'
        },
        example: '/api/games/search?q=tower&page=1'
      },
      'GET /api/games/recent': {
        description: 'Get recently updated games',
        parameters: {
          limit: 'Number of games (default: 10, max: 50)'
        },
        example: '/api/games/recent?limit=10'
      },
      'GET /api/games/:id': {
        description: 'Get complete details of a single game',
        parameters: {
          id: 'Game ID (required, in URL)'
        },
        example: '/api/games/6172'
      },
      'GET /api/games/:id/download': {
        description: 'Get download URLs for a game',
        parameters: {
          id: 'Game ID (required, in URL)'
        },
        example: '/api/games/6172/download'
      },
      'GET /api/stats': {
        description: 'Get database statistics',
        parameters: {},
        example: '/api/stats'
      }
    }
  });
});

// API Routes
app.use('/api/games', gamesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/admin/scraper', scraperRouter);
app.use('/api/ai', require('./routes/ai'));

// Payment routes
const paymentRoutes = require('./routes/payment');
app.use('/api/payment', paymentRoutes);

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('         IOSGods API Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🎮 Games endpoint: http://localhost:${PORT}/api/games`);
  console.log('═══════════════════════════════════════════════════════\n');
});

module.exports = app;
