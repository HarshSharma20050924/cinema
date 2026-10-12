/**
 * OlaMovies (v6.olamovies.mov) - Meta Module
 * Parses releases, episodes, and direct links from OlaMovies
 */

const COOKIES = 'om_auth_token=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhcnRodXJtb3JnYW4yMDA1MDkyNEBnbWFpbC5jb20iLCJuYW1lIjoiQXJ0aHVyIE1vcmdhbiIsImVtYWlsIjoiYXJ0aHVybW9yZ2FuMjAwNTA5MjRAZ21haWwuY29tIiwic3Vic2NyaXB0aW9uIjpudWxsLCJzaWQiOiJlYzZlOTExMGE3N2Q2OWM3NWU1OTQ3ZDdiOWNhOTg5YSIsImlhdCI6MTc5MTIzMDg1NCwiZXhwIjoxNzkxODM1NjU0fQ.S_-a8Z_aqqFw9Qd-3BGg-l0MXvnhAb-Iu1LwshLA9_-6oA44r1ygw-l1BgFH0UAdnrJ-RutCPrC1jz7b7t1MsJDFY8rdgqBnOtQbinnj4aFfw3yfpS5szy7rgQg6zrPRnHb7ykPz0ZuHkjO4g1WwZxzQnmEhCgwUXqW5Gz14xESStEQO-12Mmkos1ozkHYSrn8wJ4cZisWRVw7Cz9S2Jv6u-iSZvfPUEhFF_iG4qrrhYgpO467GbWV49a3LDe_t-GlT86Up19fD71tzi68PuCkNZzcy-iTFRihHX4tEUnvEEopasgpzQC4joUBWQN5Z9JKF0KhX64F0Xu45GjO5URw; om_peek=eyJlIjoiYXJ0aHVybW9yZ2FuMjAwNTA5MjRAZ21haWwuY29tIiwibiI6IkFydGh1ciBNb3JnYW4ifQ';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cookie': COOKIES,
};

function detectQuality(filename) {
  const fn = (filename || '').toLowerCase();
  if (fn.includes('2160p') || (fn.includes('4k') && !fn.includes('ds4k')) || fn.includes('uhd')) return '4K';
  if (fn.includes('1080p') || fn.includes('fhd')) return '1080p';
  if (fn.includes('720p') || fn.includes('hd')) return '720p';
  if (fn.includes('480p') || fn.includes('sd')) return '480p';
  return 'HD';
}

function parseSeasonEp(filename) {
  const m = (filename || '').match(/S(\d{1,2})E(\d{1,2})/i);
  if (m) {
    return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) };
  }
  const sOnly = (filename || '').match(/Season\s*(\d{1,2})|S(\d{1,2})(?!E)/i);
  if (sOnly) {
    return { season: parseInt(sOnly[1] || sOnly[2], 10), episode: null };
  }
  return { season: 1, episode: null };
}

function detectAudio(fn) {
  const audios = [];
  const f = (fn || '').toLowerCase();
  if (f.includes('hindi')) audios.push('Hindi');
  if (f.includes('dual audio') || f.includes('dual')) audios.push('Dual Audio');
  if (f.includes('multi audio') || f.includes('multi')) audios.push('Multi Audio');
  if (f.includes('tamil')) audios.push('Tamil');
  if (f.includes('telugu')) audios.push('Telugu');
  if (f.includes('kannada')) audios.push('Kannada');
  if (f.includes('malayalam')) audios.push('Malayalam');
  if (f.includes('english') || f.includes('eng')) audios.push('English');
  return audios.length > 0 ? audios.join(', ') : '';
}

async function getMeta({ link, providerContext }) {
  const { axios, cheerio } = providerContext;

  const url = link.startsWith('http') ? link : `https://v6.olamovies.mov${link}`;

  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);

    let title = $('h1').first().text().trim() || $('title').text().replace(/~.*/, '').replace(/\[.*?\]/g, '').trim();
    const synopsis = $('p.overview, .synopsis, article p').first().text().trim();
    let poster = $('.poster img, main img').first().attr('src') || '';
    if (poster.startsWith('/_next/image')) {
      try {
        const u = new URL(poster, 'https://v6.olamovies.mov');
        const orig = u.searchParams.get('url');
        if (orig) poster = orig;
      } catch (_) {}
    }

    // Extract RSC payload
    const matches = res.data.match(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs) || [];
    let fullPayload = '';
    for (const m of matches) {
      const raw = m.slice(24, -3);
      try { fullPayload += JSON.parse(`"${raw}"`); } catch (e) { fullPayload += raw; }
    }

    // Regex to extract release objects
    const fileRegex = /\{"id":"([^"]+)","btnId":"([^"]+)","url":"(https:\/\/[^"]+)","label":"([^"]+)"(?:,"episode":([^,}]+))?,"filename":"([^"]+)","filesize":"([^"]+)"/g;
    let match;
    const rawFiles = [];
    while ((match = fileRegex.exec(fullPayload)) !== null) {
      rawFiles.push({
        id: match[1],
        btnId: match[2],
        url: match[3],
        label: match[4],
        episode: match[5] && match[5] !== 'null' ? parseInt(match[5], 10) : null,
        filename: match[6],
        filesize: match[7],
      });
    }

    const isSeries = url.includes('/tv-series') || url.includes('/tv-shows') || rawFiles.some(f => f.episode !== null);

    if (isSeries) {
      // Group series episodes by season
      const seasonMap = new Map();
      for (const f of rawFiles) {
        const { season: s, episode: parsedEp } = parseSeasonEp(f.filename);
        const epNum = f.episode || parsedEp;
        const sKey = `Season ${s || 1}`;

        if (!seasonMap.has(sKey)) seasonMap.set(sKey, []);

        const q = detectQuality(f.filename);
        const audio = detectAudio(f.filename);
        const epLabel = epNum ? `Episode ${epNum}` : f.label;
        const parts = [epLabel, q];
        if (audio) parts.push(`[${audio}]`);
        if (f.filesize) parts.push(f.filesize);

        seasonMap.get(sKey).push({
          title: parts.join(' · '),
          link: f.url,
          fileName: f.filename,
          quality: q,
          episode: epNum || 0,
        });
      }

      for (const [, eps] of seasonMap) {
        eps.sort((a, b) => a.episode - b.episode);
      }

      const linkList = [];
      const sortedSeasons = [...seasonMap.entries()].sort((a, b) => {
        const sA = parseInt(a[0].replace('Season ', ''), 10) || 0;
        const sB = parseInt(b[0].replace('Season ', ''), 10) || 0;
        return sA - sB;
      });

      for (const [seasonTitle, eps] of sortedSeasons) {
        if (eps.length > 0) {
          linkList.push({
            title: `${seasonTitle} (${eps.length} Files)`,
            directLinks: eps,
          });
        }
      }

      return {
        title,
        type: 'series',
        synopsis,
        image: poster,
        linkList: linkList.length > 0 ? linkList : [
          {
            title: 'OlaMovies Stream / Download',
            directLinks: [{ title: 'Open on OlaMovies', link: url, quality: 'HD' }],
          },
        ],
      };
    } else {
      // Movies: group by quality
      const qualityGroups = {
        '4K': [],
        '1080p': [],
        '720p': [],
        'Other': [],
      };

      for (const f of rawFiles) {
        const q = detectQuality(f.filename);
        const audio = detectAudio(f.filename);
        const labelParts = [];
        if (f.label) {
          labelParts.push(f.label.toUpperCase());
          if (audio && !f.label.toLowerCase().includes(audio.toLowerCase())) {
            labelParts.push(`[${audio}]`);
          }
        } else {
          labelParts.push(q);
          if (audio) labelParts.push(`[${audio}]`);
          if (f.filesize) labelParts.push(f.filesize);
        }

        const item = {
          title: labelParts.join(' · '),
          link: f.url,
          fileName: f.filename,
          quality: q,
        };

        if (qualityGroups[q]) {
          qualityGroups[q].push(item);
        } else {
          qualityGroups['Other'].push(item);
        }
      }

      const linkList = [];
      const groupLabels = [
        { key: '4K', label: '4K Ultra HD Downloads' },
        { key: '1080p', label: '1080p Full HD Downloads' },
        { key: '720p', label: '720p HD Downloads' },
        { key: 'Other', label: 'Additional Releases' },
      ];

      for (const g of groupLabels) {
        const items = qualityGroups[g.key];
        if (items && items.length > 0) {
          linkList.push({
            title: `${g.label} (${items.length} Files)`,
            quality: g.key,
            directLinks: items,
          });
        }
      }

      return {
        title,
        type: 'movie',
        synopsis,
        image: poster,
        linkList: linkList.length > 0 ? linkList : [
          {
            title: 'OlaMovies Stream / Download',
            directLinks: [{ title: 'Open on OlaMovies', link: url, quality: 'HD' }],
          },
        ],
      };
    }
  } catch (err) {
    console.error('[OlaMovies] getMeta error:', err.message);
    return {
      title: 'OlaMovies',
      type: 'movie',
      linkList: [
        {
          title: 'OlaMovies Download Link',
          directLinks: [{ title: 'Open Link', link: url, quality: 'HD' }],
        },
      ],
    };
  }
}

module.exports = { getMeta };
