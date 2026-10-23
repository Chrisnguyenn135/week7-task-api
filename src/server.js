require('dotenv').config({ quiet: true });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const session = require('express-session');
const { RedisStore } = require('connect-redis');

const sequelize = require('./config/database');
const redis = require('./config/redis');
require('./models/Task');
require('./models/User');
const passport = require('./config/passport');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }));

// Body parsing
app.use(express.json());

// Custom request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Sessions are stored in Redis so they survive restarts and work across processes
app.use(session({
  store: new RedisStore({ client: redis, prefix: 'sess:' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler (four parameters)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

sequelize.sync().then(async () => {
  // A Redis outage fails startup: sessions and caching both depend on it.
  await redis.connect();
  app.listen(process.env.PORT || 3000, () => console.log('API running'));
}).catch(err => {
  console.error('Startup failed', err);
  process.exit(1);
});