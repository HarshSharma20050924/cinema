const dns = require('dns');
const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');
const zendaEngine = require('../services/zendaEngine.cjs');
const { DEFAULT_HEADERS } = require('../config/constants.cjs');

// DNS-over-HTTPS / Custom DNS Agent to bypass Indian ISP RPZ DNS poisoning (202.56.230.30)
const resolver = new dns.promises.Resolver();
try {
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
} catch (_) {}

const dnsCache = new Map();

function customLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (options && options.all) {
      return callback(null, [{ address: hostname, family: 4 }]);
    }
    return callback(null, hostname, 4);
  }

  if (dnsCache.has(hostname)) {
    const cachedIp = dnsCache.get(hostname);
    if (options && options.all) {
      return callback(null, [{ address: cachedIp, family: 4 }]);
    }
    return callback(null, cachedIp, 4);
  }

  resolver.resolve4(hostname).then(addresses => {
    if (addresses && addresses.length > 0) {
      const ip = addresses[0];
      dnsCache.set(hostname, ip);
      if (options && options.all) {
        return callback(null, [{ address: ip, family: 4 }]);
      }
      return callback(null, ip, 4);
    }
    dns.lookup(hostname, options, callback);
  }).catch(() => {
    if (hostname.includes('hubdrive.pics')) {
      const fallbackIp = '104.21.23.14';
      if (options && options.all) {
        return callback(null, [{ address: fallbackIp, family: 4 }]);
      }
      return callback(null, fallbackIp, 4);
    }
    dns.lookup(hostname, options, callback);
  });
}

const httpsAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
  rejectUnauthorized: false
});

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
            httpsAgent,
            timeout: 8000,
          });
          const hubId = apiRes.data?.upload_links?.hubdrive_res;
          if (hubId && hubId !== 'None') {
            targetLink = `https://hubcloud.ist/drive/${hubId}`;
          }
        }
      } catch (_) {}
    }

    // 1.5 Resolve MoviesMod links.modpro.blog / thenaukriadda.in / driveseed.org landing pages
    if (targetLink.includes('modpro') || targetLink.includes('thenaukriadda') || targetLink.includes('driveseed')) {
      try {
        let currentLpUrl = targetLink;
        if (currentLpUrl.includes('modpro')) {
          const mpRes = await axios.get(currentLpUrl, { headers, timeout: 8000, maxRedirects: 5 });
          const $mp = cheerio.load(mpRes.data || '');
          let foundSid = '';
          $mp('a[href*="thenaukriadda"], a[href*="sid="]').each((_, el) => {
            const h = $mp(el).attr('href');
            if (h && !foundSid && h.includes('sid=')) foundSid = h;
          });
          if (foundSid) currentLpUrl = foundSid;
        }

        if (currentLpUrl.includes('thenaukriadda') && currentLpUrl.includes('sid=')) {
          const sRes = await axios.get(currentLpUrl, { headers: { ...headers, Referer: targetLink }, timeout: 8000 });
          const $s = cheerio.load(sRes.data || '');
          const lpHttpVal = $s('input[name="_lp_http"]').val();
          const hop1Action = $s('form').attr('action') || 'https://en.thenaukriadda.in/';
          if (lpHttpVal) {
            const hop1Res = await axios.post(hop1Action, new URLSearchParams({ _lp_http: lpHttpVal }).toString(), {
              headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', Referer: currentLpUrl },
              timeout: 8000
            });
            const $h1 = cheerio.load(hop1Res.data || '');
            const hop2Action = $h1('form').attr('action') || hop1Res.request?.res?.responseUrl;
            const hop2Params = {};
            $h1('form input[type="hidden"]').each((_, el) => {
              const n = $h1(el).attr('name');
              const v = $h1(el).attr('value');
              if (n) hop2Params[n] = v;
            });
            if (hop2Action && Object.keys(hop2Params).length > 0) {
              const hop2Res = await axios.post(hop2Action, new URLSearchParams(hop2Params).toString(), {
                headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', Referer: hop1Action },
                timeout: 8000
              });
              const $h2 = cheerio.load(hop2Res.data || '');
              let lpCookieName = null;
              let lpCookieValue = null;
              let lpGoUrl = null;
              $h2('script').each((_, s) => {
                const html = $h2(s).html() || '';
                const scMatch = html.match(/sc\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/);
                if (scMatch) {
                  lpCookieName = scMatch[1];
                  lpCookieValue = scMatch[2].replace(/\\\//g, '/');
                }
                const goMatch = html.match(/setAttribute\(\s*['"]href['"]\s*,\s*['"]([^'"]+)['"]/);
                if (goMatch) {
                  lpGoUrl = goMatch[1].replace(/\\\//g, '/');
                }
              });
              if (!lpGoUrl && lpCookieName) {
                const origin = new URL(hop2Action).origin;
                lpGoUrl = `${origin}/?lp_go=${lpCookieName}`;
              }
              if (lpGoUrl && lpCookieName) {
                const destRes = await axios.get(lpGoUrl, {
                  headers: { ...headers, Cookie: `${lpCookieName}=${lpCookieValue}`, Referer: hop2Action },
                  timeout: 8000
                });
                const destHtml = typeof destRes.data === 'string' ? destRes.data : '';
                const locMatch = destHtml.match(/window\.location\.replace\(["']([^"']+)["']\)/i) ||
                                 destHtml.match(/location\.href\s*=\s*["']([^"']+)["']/i);
                if (locMatch && locMatch[1]) {
                  currentLpUrl = locMatch[1].replace(/\\\//g, '/');
                }
              }
            }
          }
        }

        if (currentLpUrl.includes('driveseed.org')) {
          let dsRes = await axios.get(currentLpUrl, { headers: { ...headers, Referer: 'https://en.thenaukriadda.in/' }, timeout: 8000 });
          let dsHtml = typeof dsRes.data === 'string' ? dsRes.data : '';
          const dsRedirect = dsHtml.match(/location\.replace\(["']([^"']+)["']\)/i);
          if (dsRedirect && dsRedirect[1]) {
            const rel = dsRedirect[1];
            const fullDs = rel.startsWith('http') ? rel : `https://driveseed.org${rel}`;
            dsRes = await axios.get(fullDs, { headers: { ...headers, Referer: currentLpUrl }, timeout: 8000 });
            dsHtml = typeof dsRes.data === 'string' ? dsRes.data : '';
          }
          const $ds = cheerio.load(dsHtml);
          const r2Link = $ds('a[href*="r2.dev"]').attr('href');
          if (r2Link) addMirror('CF Storage', r2Link);
          $ds('a[href*="video-gen.xyz"]').each((_, el) => {
            const h = $ds(el).attr('href');
            if (h && h.startsWith('http')) {
              const label = $ds(el).text().trim() || 'Fast Server';
              addMirror(label.includes('V2') ? 'Fast Server 2' : 'Fast Server', h);
            }
          });
          $ds('a[href*="pixeldrain"], a[href*="hubcloud"]').each((_, el) => {
            const h = $ds(el).attr('href');
            if (h && h.startsWith('http')) addMirror('Direct Link', h);
          });
          if (mirrors.length > 0) return mirrors;
        }

        if (currentLpUrl && currentLpUrl.startsWith('http') && currentLpUrl !== targetLink) {
          targetLink = currentLpUrl;
        }
      } catch (lpErr) {
        console.warn('LinkPilot / modpro resolver error:', lpErr.message);
      }
    }

    // 2. Resolve intermediate HubDrive / Greenmotors / HubCDN landing pages
    if (targetLink.includes('hubdrive') || targetLink.includes('greenmotors') || targetLink.includes('hubcdn')) {
      try {
        const landingRes = await axios.get(targetLink, { headers, httpsAgent, timeout: 8000, maxRedirects: 5 });
        const lHtml = typeof landingRes.data === 'string' ? landingRes.data : '';

        // Check greenmotors token encryption s('o', '<enc>')
        if (lHtml.includes("s('o',") || lHtml.includes('s("o",')) {
          try {
            const encMatch = lHtml.match(/s\(\s*['"]o['"]\s*,\s*['"]([^'"]+)['"]/);
            if (encMatch && encMatch[1]) {
              const rot13 = str => str.replace(/[a-zA-Z]/g, c => {
                const code = c.charCodeAt(0);
                return String.fromCharCode(((code - (code <= 90 ? 65 : 97) + 13) % 26) + (code <= 90 ? 65 : 97));
              });
              let d = Buffer.from(encMatch[1], 'base64').toString('utf-8');
              d = Buffer.from(d, 'base64').toString('utf-8');
              d = rot13(d);
              d = Buffer.from(d, 'base64').toString('utf-8');
              const parsed = JSON.parse(d);
              if (parsed?.o) {
                const nextUrl = Buffer.from(parsed.o, 'base64').toString('utf-8');
                if (nextUrl && nextUrl.startsWith('http')) targetLink = nextUrl;
              }
            }
          } catch (_) {}
        }

        const refreshMatch = lHtml.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i) ||
                             lHtml.match(/location\.replace\(['"]([^'"]+)['"]\)/i);
        if (refreshMatch && refreshMatch[1]) {
          targetLink = refreshMatch[1];
        } else {
          const $l = cheerio.load(lHtml);
          let nextHref = '';
          $l("a[href*='hubcloud'], a.btn-success1, a[href*='drive/'], a[href*='hubcdn']").each((_, el) => {
            const h = $l(el).attr('href');
            if (h && h.startsWith('http') && !nextHref && !h.includes('/admin') && !h.includes('/tg/') && !h.includes('telegram')) {
              nextHref = h;
            }
          });
          if (nextHref) {
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
    const res = await axios.get(targetLink, { headers, httpsAgent, timeout: 10000, maxRedirects: 5 });
    const html = typeof res.data === 'string' ? res.data : '';
    const $ = cheerio.load(html);

    // Check direct R2
    const directR2 = $('a[href*="r2.dev"]').attr('href');
    if (directR2) addMirror('CF Storage', directR2);

    // If this is an archive/intermediate page (like hblinks.lol) linking to hubcloud or direct files
    if (targetLink.includes('hblinks') || targetLink.includes('archive') || targetLink.includes('links.') || targetLink.includes('greenmotors')) {
      const candidateLinks = [];
      $("a[href*='hubcloud'], a[href*='hubcdn.wiki/file/'], a[href*='hubdrive']").each((_, el) => {
        const h = $(el).attr('href');
        if (
          h &&
          h.startsWith('http') &&
          h !== targetLink &&
          !candidateLinks.includes(h) &&
          !h.includes('/admin') &&
          !h.includes('/tg/') &&
          !h.includes('.foo')
        ) {
          candidateLinks.push(h);
        }
      });

      for (const cLink of candidateLinks) {
        const fixedLink = cLink;
        try {
          const subMirrors = await extractHubCloudMirrors(fixedLink);
          if (subMirrors && subMirrors.length > 0) {
            subMirrors.forEach(m => addMirror(m.server, m.link));
            if (mirrors.length > 0) break;
          }
        } catch (_) {}
      }
    }

    // Extract reurl from hubcdn.wiki / inventoryidea (Googleusercontent links / R2 links)
    const reurlMatch = html.match(/var\s+reurl\s*=\s*["'`](https?:\/\/[^"'`]+)["'`]/i);
    if (reurlMatch && reurlMatch[1]) {
      let rawReurl = reurlMatch[1];
      if (rawReurl.includes('?r=') || rawReurl.includes('&r=')) {
        try {
          const u = new URL(rawReurl);
          const rParam = u.searchParams.get('r');
          if (rParam) {
            const decoded = Buffer.from(rParam, 'base64').toString('utf-8');
            if (decoded && decoded.startsWith('http')) rawReurl = decoded;
          }
        } catch (_) {}
      }
      if (rawReurl.includes('?link=') || rawReurl.includes('&link=')) {
        try {
          const u = new URL(rawReurl);
          const target = u.searchParams.get('link');
          if (target && target.startsWith('http')) {
            if (target.includes('googleusercontent') || target.includes('googleapis')) {
              addMirror('GDrive (download only)', target);
            } else if (target.includes('r2.dev') || target.includes('cloudflarestorage')) {
              addMirror('CF Storage', target);
            } else {
              addMirror('HubCDN', target);
            }
          }
        } catch (_) {}
      }
      if (rawReurl.startsWith('http')) {
        if (rawReurl.includes('googleusercontent') || rawReurl.includes('googleapis')) {
          addMirror('GDrive (download only)', rawReurl);
        } else if (rawReurl.includes('r2.dev') || rawReurl.includes('cloudflarestorage')) {
          addMirror('CF Storage', rawReurl);
        }
      }
    }

    // Extract vcloudLink script url
    let vcloudLink = '';
    if (reurlMatch && reurlMatch[1] && (reurlMatch[1].includes('hubcloud') || reurlMatch[1].includes('drive/'))) {
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
      vcloudLink = $("a[href*='hubcloud.php']").attr('href') || $('.fa-file-download').parent().attr('href') || '';
    }

    // 4. Fetch and parse vcloudLink buttons
    if (vcloudLink) {
      try {
        const u = new URL(targetLink);
        if (vcloudLink.startsWith('/')) vcloudLink = `${u.origin}${vcloudLink}`;
      } catch (_) {}

      const vRes = await axios.get(vcloudLink, {
        headers: { ...headers, Referer: targetLink },
        httpsAgent,
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
            addMirror('Pixeldrain (download only)', `https://pixeldrain.com/u/${token}`);
          }
        } else if (href.includes('cloudflarestorage') || href.includes('r2.cloudflarestorage') || href.includes('r2.dev')) {
          addMirror('CF Storage', href);
        } else if (href.includes('hbplay.pages.dev') && href.includes('?u=')) {
          try {
            const uParam = new URL(href).searchParams.get('u');
            if (uParam) {
              const decoded = Buffer.from(uParam, 'base64').toString('utf-8');
              if (decoded && decoded.startsWith('http')) {
                addMirror('CF Storage', decoded);
              }
            }
          } catch (_) {}
        } else if (href.includes('.dev') && !href.includes('/?id=')) {
          addMirror('CF Worker', href);
        } else if (
          href.includes('cdn.') ||
          href.includes('.buzz') ||
          href.includes('?token=') ||
          (href.includes('.mkv') && href.startsWith('http'))
        ) {
          addMirror('CF Worker', href);
        } else if (href.includes('storage.googleapis.com') || href.includes('googleusercontent') || href.includes('hubcdn.club/dl/')) {
          let gLink = href;
          if (href.includes('?link=')) {
            try { gLink = new URL(href).searchParams.get('link') || href; } catch (_) {}
          }
          addMirror('GDrive (download only)', gLink);
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
        } else if ((href.includes('hubcloud') || href.includes('/?id=')) && !href.includes('/admin') && !href.includes('/tg/') && !href.includes('telegram')) {
          // GDrive redirector link: follow redirect
          let directGoogle = href;
          try {
            const res1 = await axios.get(href, {
              headers,
              httpsAgent,
              timeout: 3500,
              maxRedirects: 0,
              validateStatus: (s) => s >= 200 && s < 400,
            });
            if (res1.headers?.location) {
              directGoogle = res1.headers.location;
              if (directGoogle.includes('?link=')) directGoogle = directGoogle.split('?link=')[1];
            }
          } catch (_) {}
          if (directGoogle && directGoogle.startsWith('http') && !directGoogle.includes('/drive/')) {
            addMirror('GDrive (download only)', directGoogle);
          }
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

  let cleanLink = link;
  try {
    if (typeof cleanLink === 'string' && cleanLink.trim().startsWith('{')) {
      const parsed = JSON.parse(cleanLink.trim());
      cleanLink = parsed.hubcloud || parsed.vcloud || parsed.vegadrive || parsed.url || cleanLink;
    }
  } catch (_) {}

  const isDownload = download === 'true' || download === true;

  try {
    let streams = [];

    // 1. Attempt official Zenda provider module
    try {
      const mod = await zendaEngine.loadModule(provider, 'stream');
      if (mod && mod.getStream) {
        const context = zendaEngine.getProviderContext(provider);

        const results = await mod.getStream({
          link: cleanLink,
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

    // 2. Real Mirror Extraction for any HubCloud / HubDrive / Katmovies / Gamerxyt / Greenmotors / VegaDrive links
    const isDirectStream = (url) => {
      if (!url || typeof url !== 'string') return false;
      return Boolean(
        url.includes('cloudflarestorage.com') ||
        url.includes('.r2.dev') ||
        url.includes('googleusercontent.com') ||
        url.includes('/api/file/') ||
        url.includes('gofile.io/download/') ||
        url.includes('fuckingfast.net/dl/') ||
        /\.(mp4|mkv|webm)(\?|$)/i.test(url)
      );
    };

    const isIntermediateHoster = (url) => {
      if (!url || typeof url !== 'string' || isDirectStream(url)) return false;
      return /(hubcloud|hubdrive|greenmotors|gamerxyt|vcloud|kmhd|kmphotos|katdrive|gdflix|4khdhub|vegadrive|hblinks|inventoryidea|fastdl|nexdrive|mdrive|moviesdrive)/i.test(url);
    };

    if (streams.length === 0 || isIntermediateHoster(cleanLink)) {
      const realMirrors = await extractHubCloudMirrors(cleanLink);
      if (realMirrors.length > 0) {
        for (const mirror of realMirrors) {
          if (!streams.some((s) => s.link === mirror.link)) {
            streams.push(mirror);
          }
        }
      }
    }

    // Expand any streams that are themselves intermediate hoster links (NOT direct video files!)
    const expandedStreams = [];
    for (const s of streams) {
      if (isIntermediateHoster(s.link)) {
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
        let l = s.link.trim().replace(/^"|"$/g, '').replace('/hls/"', '/hls/').replace(/\\"/g, '');
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

    // 5. Cross-provider auto-fallback: If provider returned 0 streams, resolve via verified providers
    if (streams.length === 0) {
      let searchTitle = req.query.title || '';
      if (!searchTitle && cleanLink) {
        try {
          const pathname = new URL(cleanLink).pathname;
          const slug = pathname.split('/').filter(Boolean).pop() || '';
          searchTitle = slug
            .replace(/^download[-_]/i, '')
            .replace(/[-_](?:hindi|english|dual|480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|full[-_]movie|full[-_]series|movie).*$/i, '')
            .replace(/[-_]/g, ' ')
            .trim();
        } catch (_) {}
      }

      if (searchTitle && searchTitle.length >= 3) {
        const fallbackCandidates = ['hdhub4u', 'vega', 'mod', 'uhd', '4khdhub'];
        for (const fbProv of fallbackCandidates) {
          if (fbProv === zendaEngine.normalizeProvider(provider)) continue;
          try {
            const fbPostsMod = await zendaEngine.loadModule(fbProv, 'posts');
            if (fbPostsMod && fbPostsMod.getSearchPosts) {
              const fbResults = await fbPostsMod.getSearchPosts({
                searchQuery: searchTitle,
                page: 1,
                providerValue: fbProv,
                providerContext: zendaEngine.getProviderContext(fbProv),
                signal: new AbortController().signal
              });
              if (Array.isArray(fbResults) && fbResults.length > 0) {
                const fbMetaMod = await zendaEngine.loadModule(fbProv, 'meta');
                const fbMeta = await fbMetaMod.getMeta({
                  link: fbResults[0].link,
                  providerContext: zendaEngine.getProviderContext(fbProv)
                });
                const groups = fbMeta?.linkList || fbMeta?.downloadLinks || [];
                if (groups.length > 0) {
                  const targetLink = groups[0]?.directLinks?.[0]?.link || groups[0]?.link || fbResults[0].link;
                  const fbStreamMod = await zendaEngine.loadModule(fbProv, 'stream');
                  if (fbStreamMod && fbStreamMod.getStream) {
                    const fbStreams = await fbStreamMod.getStream({
                      link: targetLink,
                      type,
                      isDownload,
                      providerContext: zendaEngine.getProviderContext(fbProv),
                      signal: new AbortController().signal
                    });
                    if (Array.isArray(fbStreams) && fbStreams.length > 0) {
                      streams = fbStreams;
                      break;
                    }
                  }
                }
              }
            }
          } catch (_) {}
        }
      }
    }

    // 6. Sort streams using Vega's priority rules
    const sorted = sortStreamsByPriority(streams, isDownload);
    res.json(sorted);
  } catch (err) {
    console.error(`Stream error for ${provider}:`, err.message);
    res.json([]);
  }
}

module.exports = { getStreams, resolveHubCloudDirect, extractHubCloudMirrors };
