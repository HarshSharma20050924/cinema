const fs = require('fs');

let serverCode = fs.readFileSync('server.cjs', 'utf-8');

serverCode = serverCode.replace(
`let providersConfig = readJSON(PROVIDERS_FILE, {
  gramcinema: {
    name: 'Gram Cinema',
    enabled: true,
    baseUrl: 'https://gramcinema.com',
    searchTimeoutMs: 4000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  },
  autoEmbed: {
    name: 'AutoEmbed',
    enabled: true,
    baseUrl: 'https://autoembed.to',
  },
  flixhq: {
    name: 'FlixHQ',
    enabled: true,
    baseUrl: 'https://flixhq.to',
  },
  kisskh: {
    name: 'KissKH (Anime/Asian)',
    enabled: true,
    baseUrl: 'https://kisskh.co',
  },
});`,
`let providersConfig = readJSON(PROVIDERS_FILE, {});`);

fs.writeFileSync('server.cjs', serverCode, 'utf-8');
console.log('server.cjs updated successfully.');
