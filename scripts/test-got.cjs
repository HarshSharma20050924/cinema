const axios = require('axios');
const cheerio = require('cheerio');

async function testExtraction() {
  const url = 'https://new1.hdhub4u.free/game-of-thrones-season-8-hindi-bluray-all-episodes/';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cookie': 'xla=s4t'
    },
    timeout: 10000
  });
  const $ = cheerio.load(res.data);
  const container = $('.entry-content').length ? $('.entry-content') : $('body');

  const episodes = [];
  const packs = [];

  container.find('h1, h2, h3, h4, h5, p, div').each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;

    // Check for episode prefix: E01, E1, EP01, Episode 1
    const epMatch = text.match(/^(E|EP|Episode)\s*0*(\d+)\b/i);
    if (epMatch) {
      const epNum = parseInt(epMatch[2], 10);
      const epTitle = `Episode ${epNum}`;

      const servers = [];
      $(el).find('a').each((_a, aEl) => {
        const href = $(aEl).attr('href');
        const aText = $(aEl).text().trim() || 'Link';
        if (href && (href.startsWith('http') || href.startsWith('/'))) {
          servers.push({ server: aText, link: href });
        }
      });

      if (servers.length > 0 && !episodes.some(e => e.title === epTitle)) {
        episodes.push({
          title: epTitle,
          link: servers[0].link,
          servers: servers
        });
      }
    }

    // Check for packs: e.g. "480p Pack", "720p 10Bit HEVC", etc.
    if (/pack|zip|batch|complete/i.test(text)) {
      $(el).find('a').each((_a, aEl) => {
        const href = $(aEl).attr('href');
        const aText = $(aEl).text().trim();
        if (href && !packs.some(p => p.link === href)) {
          packs.push({
            title: aText || text,
            link: href,
            quality: aText.match(/\b(480p|720p|1080p|4k)\b/i)?.[1] || 'HD'
          });
        }
      });
    }
  });

  console.log('Extracted Episodes:', episodes.length);
  console.log('Sample Episode:', JSON.stringify(episodes[0], null, 2));
  console.log('Extracted Packs:', packs.length);
  console.log('Sample Pack:', JSON.stringify(packs[0], null, 2));
}
testExtraction();
