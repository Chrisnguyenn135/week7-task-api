require('dotenv').config({ quiet: true });
const express = require('express');
const sequelize = require('./config/database');
require('./models/Task');
const taskRoutes = require('./routes/tasks');

const app = express();
app.use(express.json());

// Custom request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/tasks', taskRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler (four parameters)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

sequelize.sync().then(() => {
  app.listen(process.env.PORT || 3000, () => console.log('API running'));
});