const path = require('path');

// Load server/.env with an explicit absolute path so the configuration is found
// regardless of the current working directory (npm workspaces, nodemon, or a
// direct `node server/src/server.js` launched from the repository root).
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = require('./app');
const prisma = require('./utils/prisma');
const { getAiMode } = require('./ai/claudeClient');

const PORT = process.env.PORT || 5000;

// Mandatory Startup Validation (Rule R3 & R5)
const checkEnvironment = () => {
  console.log('----------------------------------------------------');
  console.log('TalentFlow Backend Service Initialization');
  console.log('----------------------------------------------------');

  if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY WARNING] JWT_SECRET is not set. Using default fallback. Set this in production!');
  }

  // Rule R3: single source of truth for the effective AI provider mode
  // Priority: live Gemini > live Anthropic > offline demo (mock sentinel) > disabled
  const aiMode = getAiMode();

  if (aiMode === 'gemini') {
    console.log(`[AI READY] Google Gemini live API active (model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}).`);
  } else if (aiMode === 'anthropic') {
    console.log(
      `[AI READY] Anthropic Claude live API active (model: ${process.env.AI_MODEL || 'claude-3-5-sonnet-20241022'}).`
    );
  } else if (aiMode === 'mock') {
    console.log(
      '[AI DEMO MODE] "mock-key-development" detected: AI features return deterministic, schema-validated simulated data. No request is sent to Gemini or Anthropic.'
    );
  } else {
    console.warn('[AI WARNING] No AI API key configured (GEMINI_API_KEY / ANTHROPIC_API_KEY).');
    console.warn(
      '[AI WARNING] AI features return HTTP 503 until a key is provided, or set ANTHROPIC_API_KEY=mock-key-development for the offline demo mode.'
    );
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
