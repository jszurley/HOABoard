require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const communitiesRoutes = require('./routes/communities');
const potlucksRoutes = require('./routes/potlucks');
const suggestionsRoutes = require('./routes/suggestions');
const questionsRoutes = require('./routes/questions');
const calendarRoutes = require('./routes/calendar');
const pollsRoutes = require('./routes/polls');

const app = express();

app.set('trust proxy', 1);

// Serve static files first
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Security
app.use('/api', helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost')) return callback(null, true);
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts, please try again later.' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use(express.json({ limit: '10kb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'HOABoard' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/communities', potlucksRoutes);
app.use('/api/communities', suggestionsRoutes);
app.use('/api/communities', questionsRoutes);
app.use('/api/communities', calendarRoutes);
app.use('/api/communities', pollsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`HOABoard server running on port ${PORT}`);
});
