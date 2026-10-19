const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/constants.cjs');
const domainResolver = require('./services/domainResolver.cjs');
const apiRoutes = require('./routes/index.cjs');

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors());
app.use(express.json());

// Mount Modular API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const clusterSync = require('./services/clusterSync.cjs');

async function startServer() {
  // Sync live domain mirrors on startup
  await domainResolver.syncUrls();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 Cinema Modular Engine listening on http://0.0.0.0:${PORT}`);
    // Start automated 24/7 cluster registration if in cloud or auto-sync enabled
    clusterSync.initClusterSync(PORT).catch((err) => {
      console.warn('Cluster sync startup error:', err.message);
    });

    // Channel Poster is now manual/selective - disabled by default
    if (process.env.ENABLE_AUTO_POSTER === 'true') {
      try {
        const { start247AutoPoster } = require('./services/channelPosterWorker.cjs');
        start247AutoPoster();
      } catch (err) {
        console.warn('AutoPoster startup notice:', err.message);
      }
    }
  });
}

startServer();
