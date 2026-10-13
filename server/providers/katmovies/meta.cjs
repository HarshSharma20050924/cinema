/**
 * KatMovies - Metadata Module
 * Extracts rich movie details, TV series episodes, and season packs from KatMovieHD
 */
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://new.katmoviehd.top';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': `${BASE_URL}/`,
};

function parseSvelteData(html) {
  if (!html || typeof html !== 'string') return null;
  const match = html.match(/resolve\(\{\s*id:\s*\d+,\s*data:/);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const errorIdx = html.indexOf(',error:', start);
  if (errorIdx === -1) return null;
  const dataStr = html.substring(start, errorIdx);
  try {
    return Function(`"use strict"; return (${dataStr});`)();
  } catch (_) {
    return null;
  }
}

async function getMeta({ link }) {
  try {
    let cleanSlug = (link || '').replace(/^\/+/, '');
    if (cleanSlug.startsWith('http')) {
      try {
        cleanSlug = new URL(cleanSlug).pathname.replace(/^\/+/, '');
      } catch (_) {}
    }
    const targetUrl = `${BASE_URL}/${cleanSlug}`;

    const res = await axios.get(targetUrl, {
      headers: HEADERS,
      timeout: 15000,
    });

    const data = res.data;
    const parsed = parseSvelteData(data);
    const postData = parsed?.data || parsed || {};
    const postContent = postData?.post_content || '';
    const rawPostTitle = (postData?.post_title || '').replace(/&amp;/g, '&').replace(/^Download\s+/i, '').trim();

    const page$ = cheerio.load(data);
    const $ = cheerio.load(postContent ? `<div class="entry-content">${postContent}</div>` : data);

    const titleEl = page$('title').text().replace(/^Download\s+/i, '').trim();
    let title = rawPostTitle || titleEl.replace(/\[.*?\]|\(.*?\)|\|.*/g, '').trim();
    title = title.replace(/\s+/g, ' ').trim();

    // IMDB ID
    let imdbId = '';
    const imdbHref = $('a[href*="imdb.com/title/tt"]').attr('href') || '';
    const imdbMatch = imdbHref.match(/tt\d+/) || (data.match(/imdb\.com\/title\/(tt\d+)/i));
    if (imdbMatch) imdbId = imdbMatch[1] || imdbMatch[0];

    // Synopsis
    let synopsis = '';
    $('li:contains("Storyline"), p:contains("Storyline"), h2:contains("Storyline")').each((_, el) => {
      if (!synopsis) {
        const text = $(el).next('p').text().trim() || $(el).text().replace(/Storyline\s*:?/i, '').trim();
        if (text && text.length > 20) synopsis = text;
      }
    });
    if (!synopsis) {
      synopsis = page$('meta[name="description"]').attr('content') || '';
    }

    // Poster
    const image = postData?.thumbnail_image ||
      $('img[src*="amazon.com"], img[src*="tmdb.org"], .entry-content img').first().attr('src') ||
      page$('meta[property="og:image"]').attr('content') || '';

    // Detect Series vs Movie
    const isSeries =
      /season\s*\d+|\[\s*s\d{1,2}\s*\]|\bseries\b|\bepisodes\b/i.test(rawPostTitle || titleEl) ||
      (/pack|batch|episode\s*\d/i.test(postContent) && !(rawPostTitle || '').toLowerCase().includes('full movie'));
    const type = isSeries ? 'series' : 'movie';

    const releases = [];
    const seasonPacks = [];
    const episodeList = [];

    if (isSeries) {
      // 1. Extract Season Packs
      $('h2, h3, h4, p').each((_, el) => {
        const text = $(el).text().trim();
        if (/pack|batch|complete\s*season|zip/i.test(text)) {
          $(el).find('a').addBack('a').each((_i, a) => {
            const href = $(a).attr('href');
            const aText = $(a).text().trim();
            if (href && (href.includes('kmhd') || href.includes('gdflix') || href.includes('drive'))) {
              const qualityMatch = `${text} ${aText}`.match(/\b(2160p|4k|1080p|720p|480p)\b/i);
              const quality = qualityMatch ? qualityMatch[1].toUpperCase() : 'HD';
              const packTitle = aText && aText.length > 4 ? aText : text;
              if (!seasonPacks.some(p => p.link === href)) {
                seasonPacks.push({
                  title: packTitle,
                  quality,
                  link: href,
                  directLinks: [{ title: packTitle, link: href, type: 'series' }],
                });
              }
            }
          });
        }
      });

      // 2. Extract Individual Episodes with all mirror qualities
      let currentEp = null;
      $('p, h2, h3, h4').each((_, el) => {
        const text = $(el).text().trim();
        const epMatch = text.match(/\b(?:e|ep|episode)\s*0*(\d+)\b(?:\s*[-–:]\s*([^\n\r]+))?/i);

        if (epMatch && !text.toLowerCase().includes('all episodes') && !text.toLowerCase().includes('more episodes')) {
          const epNum = parseInt(epMatch[1], 10);
          const epSub = epMatch[2] ? ` - ${epMatch[2].trim()}` : '';
          const epTitle = `Episode ${epNum}${epSub}`;
          currentEp = { title: epTitle, epNum, servers: [] };
          episodeList.push(currentEp);
          return;
        }

        if (currentEp) {
          $(el).find('a').each((_i, a) => {
            const href = $(a).attr('href');
            let aText = $(a).text().trim();
            if (href && (href.includes('kmhd') || href.includes('gdflix') || href.includes('cloud') || href.includes('drive') || href.includes('fun'))) {
              if (aText.length > 20) aText = 'Download';
              currentEp.servers.push({
                server: aText || 'Download',
                link: href,
              });
            }
          });
        }
      });

      // Format episodes for UI
      for (const ep of episodeList) {
        if (ep.servers.length > 0) {
          // Choose best primary link: 1080p or first
          const best = ep.servers.find(s => /1080/i.test(s.server)) ||
                       ep.servers.find(s => /720/i.test(s.server)) ||
                       ep.servers[0];
          ep.link = best.link;
          ep.quality = (best.server.match(/\b(2160p|4k|1080p|720p|480p)\b/i) || [])[0] || 'HD';
        }
      }
    } else {
      // Movie Releases
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (!href || !href.startsWith('http') || !/links\.(kmhd|kmphotos)\.[a-z]+/i.test(href)) return;
        if (href.includes('/play?') || href.includes('kmhd.medirectlink')) return;

        const parentText = $(el).closest('h2, h3, h4, h5, p, div').text().trim().replace(/[\r\n\t]+/g, ' ');
        const combined = `${parentText} ${text}`;
        const qualityMatch = combined.match(/\b(2160p|4k|1080p|720p|480p|hevc)\b/i);
        const quality = qualityMatch ? qualityMatch[1].toUpperCase() : 'HD';

        if (!releases.some(r => r.link === href)) {
          const relTitle = text && text.length > 3 ? text : parentText || `${quality} Links`;
          releases.push({
            title: relTitle,
            quality,
            link: href,
            directLinks: [{ title: relTitle, link: href, type: 'movie' }],
          });
        }
      });
    }

    const meta = {
      title,
      synopsis,
      image,
      poster: image,
      imdbId,
      type,
      quickDownload: true,
      webUrl: targetUrl,
      provider: 'katmovies',
      providerName: 'KatMoviesHD',
    };

    if (isSeries) {
      meta.seasonPacks = seasonPacks;
      meta.linkList = [];
      if (episodeList.length > 0) {
        meta.linkList.push({
          title: 'Single Episodes',
          quality: 'HD',
          directLinks: episodeList,
        });
      }
      if (seasonPacks.length > 0) {
        meta.linkList.push(...seasonPacks);
      }
    } else {
      meta.linkList = releases;
    }

    return meta;
  } catch (err) {
    console.warn('[KatMovies] getMeta error:', err.message);
    throw err;
  }
}

module.exports = {
  getMeta,
};
