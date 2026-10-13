const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middleware: Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Middleware: Parse JSON bodies
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'TalentFlow API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
