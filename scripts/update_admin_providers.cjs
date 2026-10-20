const { execSync } = require('child_process');

const TO_DISABLE = [
  'katmoviehd', 'bollyflix', 'moviesflix', 'extramovies', 'world4ufree',
  'skymovieshd', 'cinevood', 'luxmovies', 'luxMovies', 'eonmovies', 'eonMovies',
  'cinemaluxe', 'cinemaLuxe', 'gokuhd', 'gokuHD', 'ridomovies', 'ridoMovies',
  'protonmovies', 'protonMovies', 'kisskh', 'kissKh', 'gogoanime', 'animerulz',
  'yts', '1337x', 'moviesapi', 'moviesApi', 'kartoons', 'cinefreak',
  'everything', 'uniquestream', 'movieBox', 'skyMovieHD'
];

const TO_ENABLE = [
  'hdhub4u', 'vega', '4khdhub', 'drive', 'moviesmod', 'mod', 'uhd',
  'castle', 'mxplayer', 'netflixMirror', 'disneyMirror', 'primeMirror',
  'movieBoxWeb', 'multi', 'movies4u', 'topmovies', 'animeworld', 'animesalt',
  'hiAnime', 'anikoto', 'tpb', 'gramcinema', 'olamovies', 'showbox',
  'flixhq', 'dramacool', 'filmyfly', 'moviezwap', 'zeefliz', 'torrentio', 'autoEmbed'
];

async function updateProviders() {
  console.log('Fetching current CINEMA_PROVIDERS from D1...');
  const currentOutput = execSync(
    'npx wrangler d1 execute cinema_db --command "SELECT value FROM config WHERE key = \'CINEMA_PROVIDERS\'" --remote --json',
    { encoding: 'utf8' }
  );

  let currentConfig = {};
  try {
    const parsed = JSON.parse(currentOutput);
    const row = parsed?.[0]?.results?.[0];
    if (row?.value) {
      currentConfig = JSON.parse(row.value);
    }
  } catch (err) {
    console.warn('Could not parse current config:', err.message);
  }

  // Apply enable/disable
  for (const ext of TO_ENABLE) {
    currentConfig[ext] = { enabled: true, hidden: false };
  }
  for (const ext of TO_DISABLE) {
    currentConfig[ext] = { enabled: false, hidden: true };
  }

  console.log(`Updated config: ${Object.keys(currentConfig).length} extensions total.`);
  console.log(`Enabled: ${Object.values(currentConfig).filter(v => v.enabled).length}`);
  console.log(`Disabled / Hidden: ${Object.values(currentConfig).filter(v => v.hidden).length}`);

  const jsonStr = JSON.stringify(currentConfig).replace(/'/g, "''");
  const sql = `INSERT OR REPLACE INTO config (key, value, updated_at) VALUES ('CINEMA_PROVIDERS', '${jsonStr}', ${Date.now()});`;

  console.log('Writing updated config to D1 cinema_db...');
  execSync(
    `npx wrangler d1 execute cinema_db --command "${sql}" --remote`,
    { stdio: 'inherit' }
  );

  console.log('✅ Successfully updated CINEMA_PROVIDERS in D1!');
}

updateProviders();
