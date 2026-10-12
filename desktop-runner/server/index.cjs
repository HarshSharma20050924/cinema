const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/constants.cjs');
const domainResolver = require('./services/domainResolver.cjs');
const apiRoutes = require('./routes/index.cjs');

const app = express();

app.use(cors());
app.use(express.json());

// Mount Modular API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  // Sync live domain mirrors on startup
  await domainResolver.syncUrls();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 Cinema Modular Engine listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
