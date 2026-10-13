/**
 * OlaMovies (v6.olamovies.mov) - Posts Module
 * Fetches catalogs and search results from OlaMovies
 */

const BASE_URL = 'https://v6.olamovies.mov';

const COOKIES = 'om_auth_token=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhcnRodXJtb3JnYW4yMDA1MDkyNEBnbWFpbC5jb20iLCJuYW1lIjoiQXJ0aHVyIE1vcmdhbiIsImVtYWlsIjoiYXJ0aHVybW9yZ2FuMjAwNTA5MjRAZ21haWwuY29tIiwic3Vic2NyaXB0aW9uIjpudWxsLCJzaWQiOiJlYzZlOTExMGE3N2Q2OWM3NWU1OTQ3ZDdiOWNhOTg5YSIsImlhdCI6MTc5MTIzMDg1NCwiZXhwIjoxNzkxODM1NjU0fQ.S_-a8Z_aqqFw9Qd-3BGg-l0MXvnhAb-Iu1LwshLA9_-6oA44r1ygw-l1BgFH0UAdnrJ-RutCPrC1jz7b7t1MsJDFY8rdgqBnOtQbinnj4aFfw3yfpS5szy7rgQg6zrPRnHb7ykPz0ZuHkjO4g1WwZxzQnmEhCgwUXqW5Gz14xESStEQO-12Mmkos1ozkHYSrn8wJ4cZisWRVw7Cz9S2Jv6u-iSZvfPUEhFF_iG4qrrhYgpO467GbWV49a3LDe_t-GlT86Up19fD71tzi68PuCkNZzcy-iTFRihHX4tEUnvEEopasgpzQC4joUBWQN5Z9JKF0KhX64F0Xu45GjO5URw; om_peek=eyJlIjoiYXJ0aHVybW9yZ2FuMjAwNTA5MjRAZ21haWwuY29tIiwibiI6IkFydGh1ciBNb3JnYW4ifQ';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cookie': COOKIES,
};

async function getPosts({ filter, page = 1, providerContext }) {
  const { axios, cheerio } = providerContext;

  const f = (filter || '').toLowerCase().trim();
  let url;

  if (!f || f === 'trending' || f === 'home' || f === 'default' || f === '/') {
    url = page > 1 ? `${BASE_URL}?page=${page}` : `${BASE_URL}`;
  } else if (f.includes('series') || f === 'tv-series' || f.includes('web-series')) {
    url = page > 1 ? `${BASE_URL}/categories/tv-series?page=${page}` : `${BASE_URL}/categories/tv-series`;
  } else if (f.includes('shows') || f === 'tv-shows') {
    url = page > 1 ? `${BASE_URL}/categories/tv-shows?page=${page}` : `${BASE_URL}/categories/tv-shows`;
  } else if (f.includes('movie') || f === 'movies' || f.includes('hollywood-movies') || f.includes('bollywood-movies')) {
    url = page > 1 ? `${BASE_URL}/categories/movies?page=${page}` : `${BASE_URL}/categories/movies`;
  } else if (f.includes('2160p') || f.includes('4k') || f.includes('uhd')) {
    url = page > 1 ? `${BASE_URL}/quality/2160p?page=${page}` : `${BASE_URL}/quality/2160p`;
  } else if (f.includes('1080p') || f.includes('fhd')) {
    url = page > 1 ? `${BASE_URL}/quality/1080p?page=${page}` : `${BASE_URL}/quality/1080p`;
  } else if (f.includes('720p') || f.includes('hd')) {
    url = page > 1 ? `${BASE_URL}/quality/720p?page=${page}` : `${BASE_URL}/quality/720p`;
  } else if (f.startsWith('search:') || f.startsWith('search=')) {
    const q = filter.replace(/^search[:=]/i, '');
    url = `${BASE_URL}/search?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ''}`;
  } else if (f.startsWith('/category/') || f.startsWith('/categories/')) {
    // Other generic category paths
    url = `${BASE_URL}${filter}${page > 1 ? `?page=${page}` : ''}`;
  } else {
    // Arbitrary text search query
    url = `${BASE_URL}/search?q=${encodeURIComponent(filter)}${page > 1 ? `&page=${page}` : ''}`;
  }

  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);

    // CRITICAL: Remove sidebar drawer, navigation and header to prevent static menu links
    // and drawer items from polluting catalog results
    $('aside, header, nav, #menu-drawer').remove();

    const posts = [];
    const seenLinks = new Set();

    // Look for all post links (/movies/, /tv-series/, /tv-shows/)
    $('a[href*="/movies/"], a[href*="/tv-series/"], a[href*="/tv-shows/"]').each(function() {
      const href = $(this).attr('href');
      if (!href) return;
      if (
        href.startsWith('/categories/') ||
        href.includes('#comment') ||
        href.includes('/quality/')
      ) {
        return;
      }

      // CRITICAL: Must contain a valid poster image to be a movie card
      const imgEl = $(this).find('img').first();
      if (!imgEl.length) return;

      let img = imgEl.attr('src') || imgEl.attr('data-src') || '';
      if (!img) return;

      if (img.startsWith('/_next/image')) {
        try {
          const u = new URL(img, BASE_URL);
          const orig = u.searchParams.get('url');
          if (orig) img = orig;
        } catch (_) {}
      } else if (!img.startsWith('http')) {
        img = `${BASE_URL}${img}`;
      }

      const fullLink = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      if (seenLinks.has(fullLink)) return;

      // Extract title
      let title = $(this).find('[class*="text-pretty"], [class*="line-clamp"], h2, h3, h4').first().text().trim();
      if (!title) {
        const clone = $(this).clone();
        clone.find('span:has(img)').remove();
        clone.find('svg').remove();
        clone.find('[class*="uppercase"]').remove();
        clone.find('.truncate, [class*="text-[var(--color-meta)]"]').remove();
        title = clone.text().replace(/\s+/g, ' ').trim();
      }

      // Clean leading view count if any, e.g. "42.1K views"
      title = title
        .replace(/^\s*[#\d.]+[KkMm]?\s*views\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (title && title.length > 2) {
        seenLinks.add(fullLink);
        posts.push({
          title,
          link: fullLink,
          image: img,
        });
      }
    });

    return posts;
  } catch (err) {
    console.error('[OlaMovies] getPosts error:', err.message);
    return [];
  }
}

async function getSearchPosts({ searchQuery, page = 1, providerContext }) {
  return getPosts({ filter: `search:${searchQuery}`, page, providerContext });
}

module.exports = { getPosts, getSearchPosts };
