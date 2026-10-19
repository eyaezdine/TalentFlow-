require('dotenv').config();
const app = require('./app');
const prisma = require('./utils/prisma');

const PORT = process.env.PORT || 5000;

// Mandatory Startup Validation (Rule R3 & R5)
const checkEnvironment = () => {
  console.log('----------------------------------------------------');
  console.log('TalentFlow Backend Service Initialization');
  console.log('----------------------------------------------------');

  if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY WARNING] JWT_SECRET is not set. Using default fallback. Set this in production!');
  }

  // Rule R3: Detect Anthropic or Gemini API Key presence at startup with clear messaging
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'mock-key-development') {
    console.log(`[AI READY] Google Gemini active with model: ${process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}`);
  } else if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.warn('[AI WARNING] ANTHROPIC_API_KEY is not configured in .env.');
    console.warn('[AI WARNING] AI features will operate in simulated or disabled mode until a valid key is provided.');
  } else {
    console.log(`[AI INFO] Anthropic API Key detected. Configured model: ${process.env.AI_MODEL || 'claude-3-5-sonnet-20241022'}`);
  }
};

// Start Server & Test Database Connection
const startServer = async () => {
  try {
    checkEnvironment();

    // Verify database connection
    await prisma.$connect();
    console.log('[DATABASE] SQLite connection established successfully via Prisma.');

    app.listen(PORT, () => {
      console.log(`[SERVER] TalentFlow API running on http://localhost:${PORT}`);
      console.log(`[HEALTH] Health check available at http://localhost:${PORT}/api/health`);
      console.log('----------------------------------------------------');
    });
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
