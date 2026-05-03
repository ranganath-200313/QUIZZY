require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, '../frontend')));
// ─── SECURITY MIDDLEWARE ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disable for serving HTML with inline scripts
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter for auth endpoints
  message: { success: false, message: 'Too many login attempts, please try again later' }
});

// ─── BODY PARSING ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── SERVE STATIC FRONTEND ───────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API ROUTES ──────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/quiz', apiLimiter, require('./routes/quiz'));
app.use('/api/teacher', apiLimiter, require('./routes/teacher'));

// ─── HEALTH CHECK ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Quiz API is running', timestamp: new Date().toISOString() });
});

// ─── FRONTEND ROUTING (SPA fallback) ────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── ERROR HANDLER ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── START SERVER ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Quiz App Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
