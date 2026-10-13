module.exports = {
  PORT: process.env.PORT || 3001,
  ZENDA_RAW: 'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main',
  DEFAULT_HEADERS: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  },
};
