/**
 * KatMovies - Posts / Browse / Search Module
 * Interacts with KatMovieHD (new.katmoviehd.top) via high-speed SvelteKit JSON data extraction
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

async function fetchHtml(url) {
  const res = await axios.get(url, {
    headers: HEADERS,
    timeout: 12000,
  });
  return res.data;
}

function parseItemsFromHtmlOrSvelte(data) {
  const posts = [];
  const parsed = parseSvelteData(data);
  const items = parsed?.data?.items || parsed?.items || [];

  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const rawTitle = (item.post_title || '')
        .replace(/&amp;/g, '&')
        .replace(/&#8211;/g, '-')
        .replace(/&#8217;/g, "'")
        .replace(/^Download\s+/i, '')
        .trim();
      const slug = item.slug || '';
      const link = slug.startsWith('/') ? slug : `/${slug}`;
      const image = item.thumbnail_image || '';

      if (rawTitle && link) {
        posts.push({
          title: rawTitle,
          link,
          image,
          provider: 'katmovies',
          providerName: 'KatMoviesHD',
        });
      }
    }
    if (posts.length > 0) return posts;
  }

  // Fallback: Cheerio HTML DOM parsing
  const $ = cheerio.load(data);
  $('.recent-posts, .posts-list, article, .item, .post').each((_, el) => {
    const titleEl = $(el).find('h2, h3, a.title, .entry-title').first();
    const title = (titleEl.text() || $(el).find('img').attr('alt') || '').replace(/^Download\s+/i, '').trim();
    let link = $(el).find('a').first().attr('href') || '';
    const image = $(el).find('img').attr('src') || '';

    if (link && link.startsWith('http')) {
      try {
        const u = new URL(link);
        link = u.pathname;
      } catch (_) {}
    }

    if (title && link) {
      posts.push({
        title,
        link,
        image,
        provider: 'katmovies',
        providerName: 'KatMoviesHD',
      });
    }
  });

  return posts;
}

async function getPosts({ filter = '', page = 1 }) {
  try {
    const cleanFilter = filter ? filter.replace(/^\/+/, '') : '';
    let targetUrl = `${BASE_URL}/`;
    if (cleanFilter) {
      targetUrl = page > 1 ? `${BASE_URL}/${cleanFilter}?page=${page}` : `${BASE_URL}/${cleanFilter}`;
    } else {
      targetUrl = page > 1 ? `${BASE_URL}/?page=${page}` : `${BASE_URL}/`;
    }

    const data = await fetchHtml(targetUrl);
    return parseItemsFromHtmlOrSvelte(data);
  } catch (err) {
    console.warn('[KatMovies] getPosts error:', err.message);
    return [];
  }
}

async function getSearchPosts({ searchQuery = '', page = 1 }) {
  try {
    const query = encodeURIComponent(searchQuery.trim());
    const targetUrl = page > 1 ? `${BASE_URL}/?s=${query}&page=${page}` : `${BASE_URL}/?s=${query}`;
    const data = await fetchHtml(targetUrl);
    return parseItemsFromHtmlOrSvelte(data);
  } catch (err) {
    console.warn('[KatMovies] getSearchPosts error:', err.message);
    return [];
  }
}

module.exports = {
  getPosts,
  getSearchPosts,
};
