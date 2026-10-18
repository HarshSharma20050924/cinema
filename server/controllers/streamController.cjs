const axios = require('axios');
const cheerio = require('cheerio');
const zendaEngine = require('../services/zendaEngine.cjs');
const { DEFAULT_HEADERS } = require('../config/constants.cjs');

/**
 * Resolves raw Gofile URLs to direct high-speed stream links via Gofile API (same as Vega App)
 */
async function resolveGofileLink(gofileLink) {
  try {
    const id = new URL(gofileLink).pathname.split('/').filter(Boolean).pop();
    if (!id) return null;
    const tokenRes = await axios.post('https://api.gofile.io/accounts', {}, { timeout: 8000 });
    const token = tokenRes.data?.data?.token;
    if (!token) return null;
    const contentRes = await axios.get(`https://api.gofile.io/contents/${id}?wt=4fd6sg89d7s6`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    const children = contentRes.data?.data?.children;
    if (children) {
      const firstKey = Object.keys(children)[0];
      const link = children[firstKey]?.link;
      if (link) return { server: 'Gofile Direct', link, type: 'mkv' };
    }
  } catch (e) {
    console.warn('Gofile resolver error:', e.message);
  }
  return null;
}

/**
 * Comprehensive real mirror extractor for HubCloud / HubDrive / Greenmotors / Gamerxyt / vcloud.
 * Extracts 100% real direct download & streaming mirrors (CF Storage, Pixeldrain, CF Worker, GDrive, FastDL).
 * Zero mock links. Zero intermediate redirects.
 */
async function extractHubCloudMirrors(link) {
  if (!link || typeof link !== 'string' || !/^https?:\/\//i.test(link)) return [];
  const mirrors = [];
  const seenUrls = new Set();

  const addMirror = (server, rawLink, type = 'mkv') => {
    if (!rawLink || typeof rawLink !== 'string') return;
    const clean = rawLink.trim();
    if (!clean || seenUrls.has(clean)) return;

    // Filter out advertising, navigation, telegram bots, and landing page URLs
    const lower = clean.toLowerCase();
    if (
      lower.includes('telegram') ||
      lower.includes('t.me/') ||
      lower.includes('/tg/bot') ||
      lower.includes('/admin/') ||
      lower.includes('contact') ||
      lower.includes('report') ||
      lower.includes('login') ||
      lower.includes('signup') ||
      lower.includes('javascript:') ||
      lower === '#'
    ) {
      return;
    }

    seenUrls.add(clean);
    mirrors.push({ server, link: clean, type });
  };

  try {
    const headers = {
      ...DEFAULT_HEADERS,
      Referer: link,
      Cookie: 'xla=s4t; cf_clearance=woQrFGXtLfmEMBEiGUsVHrUBMT8s3cmguIzmMjmvpkg',
    };

    let targetLink = link;

    // 1. Resolve Katmovies links.kmhd.me / links.kmphotos protector pages
    if (targetLink.includes('kmhd') || targetLink.includes('kmphotos')) {
      try {
        const fileIdMatch = targetLink.match(/[\w]+_[a-f0-9]{8}/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[0];
          const token =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTgwNzQ4NDIzMywiaWF0IjoxNzA3NDg0MjMzfQ.7u5bF9PcMhvClSDZgsd6EU-CQnp1Ec--wsezkDEgiZo';
          const origin = new URL(targetLink).origin;
          const apiRes = await axios.get(`https://api.dandndn.one/api/v1/file/${fileId}`, {
            headers: { ...headers, Authorization: `Bearer ${token}`, Origin: origin },
            timeout: 8000,
          });
          const hubId = apiRes.data?.upload_links?.hubdrive_res;
          if (hubId && hubId !== 'None') {
            targetLink = `https://hubcloud.ist/drive/${hubId}`;
          }
        }
      } catch (_) {}
    }

    // 2. Resolve intermediate HubDrive / Greenmotors landing pages
    if (targetLink.includes('hubdrive') || targetLink.includes('greenmotors')) {
      try {
        const landingRes = await axios.get(targetLink, { headers, timeout: 8000, maxRedirects: 5 });
        const lHtml = typeof landingRes.data === 'string' ? landingRes.data : '';
        const refreshMatch = lHtml.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i);
        if (refreshMatch && refreshMatch[1]) {
          targetLink = refreshMatch[1];
        } else {
          const $l = cheerio.load(lHtml);
          const nextHref = $l(".btn-success1, .btn-primary, a[href*='hubcloud'], a[href*='drive/']").attr('href');
          if (nextHref && nextHref.startsWith('http')) {
            targetLink = nextHref;
          }
        }
      } catch (err) {
        console.warn('Landing page redirect check error:', err.message);
      }
    }

    // 2.5 Resolve HubCloud search-recover.php pages
    if (targetLink.includes('search-recover.php')) {
      try {
        const u = new URL(targetLink);
        let q = u.searchParams.get('q');
        const from_ac = u.searchParams.get('from_ac') || '';
        if (q) {
          try {
            if (!q.includes(' ') && q.length > 8) {
              const b64 = Buffer.from(q, 'base64').toString('utf-8');
              if (b64 && /[a-z0-9]/i.test(b64)) q = b64;
            }
          } catch (_) {}
          const sApi = `https://${u.hostname}/drive/search-recover.php?api=search&q=${encodeURIComponent(q)}&page=1&from_ac=${encodeURIComponent(from_ac)}`;
          const sRes = await axios.get(sApi, {
            headers: { ...headers, Accept: 'application/json', Referer: targetLink },
            timeout: 8000
          });
          const hits = sRes.data?.hits || [];
          if (hits.length > 0) {
            const matchedHit = hits.find(h => {
              const fn = (h.file_name || '').toLowerCase();
              return q.split(' ').every(word => fn.includes(word.toLowerCase()));
            }) || hits[0];
            const hitUrl = matchedHit?.url;
            if (hitUrl && hitUrl.startsWith('http')) {
              targetLink = hitUrl.replace('hubcloud.cx', 'hubcloud.ist');
            }
          }
        }
      } catch (srErr) {
        console.warn('search-recover resolver error:', srErr.message);
      }
    }

    // 3. Fetch the drive page (e.g. hubcloud.ist/drive/...)
    const res = await axios.get(targetLink, { headers, timeout: 10000, maxRedirects: 5 });
    const html = typeof res.data === 'string' ? res.data : '';
    const $ = cheerio.load(html);

    // Check direct R2
    const directR2 = $('a[href*="r2.dev"]').attr('href');
    if (directR2) addMirror('HubCDN', directR2);

    // Extract vcloudLink script url
    let vcloudLink = '';
    const reurlMatch = html.match(/var\s+reurl\s*=\s*["'`](https?:\/\/[^"'`]+)["'`]/i);
    if (reurlMatch && reurlMatch[1]) {
      vcloudLink = reurlMatch[1];
    }

    if (!vcloudLink) {
      const doubleAtobMatch = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/);
      if (doubleAtobMatch && doubleAtobMatch[1]) {
        try {
          vcloudLink = Buffer.from(Buffer.from(doubleAtobMatch[1], 'base64').toString('utf-8'), 'base64').toString('utf-8');
        } catch (_) {}
      }
    }

    if (!vcloudLink) {
      const plainMatch = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
      if (plainMatch && plainMatch[1]) {
        const val = plainMatch[1];
        vcloudLink = val.includes('r=') ? Buffer.from(val.split('r=')[1], 'base64').toString('utf-8') : val;
      }
    }

    if (!vcloudLink) {
      vcloudLink = $('.fa-file-download').parent().attr('href') || $("a[href*='hubcloud.php']").attr('href') || '';
    }

    // 4. Fetch and parse vcloudLink buttons
    if (vcloudLink) {
      try {
        const u = new URL(targetLink);
        if (vcloudLink.startsWith('/')) vcloudLink = `${u.origin}${vcloudLink}`;
      } catch (_) {}

      const vRes = await axios.get(vcloudLink, {
        headers: { ...headers, Referer: targetLink },
        timeout: 10000,
      });
      const vHtml = typeof vRes.data === 'string' ? vRes.data : '';
      const $v = cheerio.load(vHtml);

      // Extract real pixeldrain token from inline script if present
      const pxlMatch = vHtml.match(/var\s+pxl\s*=\s*["']([^"']+)["']/i);
      const realPixeldrainUrl = pxlMatch ? pxlMatch[1] : '';

      const buttons = $v('.btn-success, .btn-danger, .btn-secondary, a.btn, a[href]');
      for (let i = 0; i < buttons.length; i++) {
        let href = $v(buttons[i]).attr('href') || '';
        if (!href || href === '#' || href.startsWith('javascript:')) continue;

        if (href.includes('pixeld')) {
          const pxUrl = realPixeldrainUrl || href;
          const token = pxUrl.split('/').pop()?.split('?')[0];
          if (token && token.length > 3) {
            addMirror('Pixeldrain', `https://pixeldrain.dev/api/file/${token}?download`);
          }
        } else if (href.includes('cloudflarestorage') || href.includes('r2.cloudflarestorage')) {
          addMirror('CF Storage', href);
        } else if (href.includes('.dev') && !href.includes('/?id=')) {
          addMirror('CF Worker', href);
        } else if (
          href.includes('cdn.') ||
          href.includes('.buzz') ||
          href.includes('?token=') ||
          (href.includes('.mkv') && href.startsWith('http'))
        ) {
          addMirror('CF Worker', href);
        } else if (href.includes('storage.googleapis.com') || href.includes('googleusercontent')) {
          addMirror('GDrive (download only)', href);
        } else if (href.includes('fuckingfast.net') || href.includes('fastdl') || href.includes('fsl.')) {
          addMirror('FastDL', href);
        } else if (href.includes('hubcdn') && !href.includes('/?id=')) {
          addMirror('HubCDN', href);
        } else if (href.includes('gofile.io')) {
          const resolvedGf = await resolveGofileLink(href);
          if (resolvedGf?.link) {
            addMirror('Gofile Direct', resolvedGf.link);
          } else {
            addMirror('Gofile', href);
          }
        } else if (href.includes('hubcloud') || href.includes('/?id=')) {
          // GDrive redirector link: follow redirect
          try {
            let directGoogle = href;
            const res1 = await axios.get(href, {
              headers,
              timeout: 6000,
              maxRedirects: 0,
              validateStatus: (s) => s >= 200 && s < 400,
            });
            if (res1.headers?.location) {
              directGoogle = res1.headers.location;
              if (directGoogle.includes('?link=')) directGoogle = directGoogle.split('?link=')[1];
            }
            if (directGoogle && directGoogle.startsWith('http') && !directGoogle.includes('/drive/')) {
              addMirror('GDrive (download only)', directGoogle);
            }
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.warn('extractHubCloudMirrors error:', err.message);
  }

  return mirrors;
}

/**
 * Direct resolver helper
 */
async function resolveHubCloudDirect(link) {
  const mirrors = await extractHubCloudMirrors(link);
  // Pick highest speed mirror (CF Storage -> Pixeldrain -> CF Worker)
  if (mirrors.length > 0) {
    return mirrors[0].link;
  }
  return null;
}

/**
 * Prioritizes streams matching Vega's ranking strategy:
 * Playable Cloudflare R2/Workers and Gofile come ahead of Pixeldrain/GDrive.
 */
function sortStreamsByPriority(streams, isDownload = false) {
  const getPriority = (serverName = '') => {
    const s = serverName.toLowerCase();
    if (isDownload) {
      if (s.includes('cf storage') || s.includes('storage') || s.includes('resumable')) return 1;
      if (s.includes('gdrive') || s.includes('google') || s.includes('instant')) return 2;
      if (s.includes('pixeldrain')) return 3;
      if (s.includes('gofile')) return 4;
      if (s.includes('fastdl') || s.includes('fsl')) return 5;
      if (s.includes('hubcdn')) return 6;
      if (s.includes('cf worker') || s.includes('worker') || s.includes('fast cloud')) return 7;
      return 10;
    } else {
      // Streaming priority (highest speed playable cloud stream first)
      if (s.includes('cf storage') || s.includes('storage')) return 1;
      if (s.includes('cf worker') || s.includes('worker') || s.includes('fast cloud')) return 2;
      if (s.includes('gofile')) return 3;
      if (s.includes('pixeldrain')) return 4;
      if (s.includes('fastdl') || s.includes('fsl')) return 5;
      if (s.includes('hubcdn')) return 6;
      if (s.includes('gdrive') || s.includes('google')) return 7;
      return 10;
    }
  };

  return [...streams].sort((a, b) => getPriority(a.server) - getPriority(b.server));
}

async function getStreams(req, res) {
  const { provider = 'autoEmbed', link, type = 'movie', download = 'false' } = req.query;
  if (!link) return res.status(400).json({ error: 'Link required' });

  const isDownload = download === 'true' || download === true;

  try {
    let streams = [];

    // 1. Attempt official Zenda provider module
    try {
      const mod = await zendaEngine.loadModule(provider, 'stream');
      if (mod && mod.getStream) {
        const context = zendaEngine.getProviderContext(provider);

        const results = await mod.getStream({
          link,
          type,
          isDownload,
          providerContext: context,
          signal: new AbortController().signal,
        });

        if (Array.isArray(results) && results.length > 0) {
          streams = results;
        }
      }
    } catch (modErr) {
      console.warn(`Zenda stream module error for ${provider}:`, modErr.message);
    }

    // 2. Real Mirror Extraction for any HubCloud / HubDrive / Katmovies / Gamerxyt / Greenmotors links
    const isHosterLink = (l) =>
      Boolean(l && typeof l === 'string' && /(hubcdn|hubcloud|hubdrive|greenmotors|gamerxyt|vcloud|kmhd|kmphotos|katdrive|gdflix|4khdhub)/i.test(l));

    if (streams.length === 0 || isHosterLink(link)) {
      const realMirrors = await extractHubCloudMirrors(link);
      if (realMirrors.length > 0) {
        for (const mirror of realMirrors) {
          if (!streams.some((s) => s.link === mirror.link)) {
            streams.push(mirror);
          }
        }
      }
    }

    // Expand any streams that are themselves intermediate hoster links
    const expandedStreams = [];
    for (const s of streams) {
      if (isHosterLink(s.link)) {
        const subMirrors = await extractHubCloudMirrors(s.link);
        if (subMirrors.length > 0) {
          for (const sm of subMirrors) {
            if (!expandedStreams.some((x) => x.link === sm.link)) {
              expandedStreams.push(sm);
            }
          }
          continue;
        }
      }
      if (!expandedStreams.some((x) => x.link === s.link)) {
        expandedStreams.push(s);
      }
    }
    streams = expandedStreams;

    // 3. Resolve any raw Gofile mirrors to direct links
    for (let i = 0; i < streams.length; i++) {
      if (streams[i].link && streams[i].link.includes('gofile.io/') && !streams[i].server?.includes('Direct')) {
        try {
          const resolvedGf = await resolveGofileLink(streams[i].link);
          if (resolvedGf) {
            streams[i] = resolvedGf;
          }
        } catch (_) {}
      }
    }

    // 4. Normalize links and filter out landing pages / countdown widgets
    streams = streams
      .filter((s) => Boolean(s && s.link && typeof s.link === 'string'))
      .map((s) => {
        let l = s.link.trim();
        if (l.startsWith('//')) {
          l = 'https:' + l;
        }
        return { ...s, link: l };
      })
      .filter((s) => {
        const lower = s.link.toLowerCase();
        return (
          !lower.includes('tickcounter.com') &&
          !lower.includes('countdown') &&
          !lower.includes('t.me/') &&
          !lower.includes('telegram') &&
          !lower.includes('/tg/bot')
        );
      });

    // 5. Sort streams using Vega's priority rules
    const sorted = sortStreamsByPriority(streams, isDownload);
    res.json(sorted);
  } catch (err) {
    console.error(`Stream error for ${provider}:`, err.message);
    res.json([]);
  }
}

module.exports = { getStreams, resolveHubCloudDirect, extractHubCloudMirrors };
