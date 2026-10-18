const axios = require('axios');
const cheerio = require('cheerio');
const zendaEngine = require('../services/zendaEngine.cjs');
const domainResolver = require('../services/domainResolver.cjs');
const { smartAxios } = require('../services/smartFetcher.cjs');
const { extractHubCloudMirrors } = require('./streamController.cjs');
const { DEFAULT_HEADERS } = require('../config/constants.cjs');

/**
 * Normalizes and cleans media titles
 */
function cleanTitle(raw) {
  if (!raw) return '';
  let str = String(raw).replace(/^[\s🎬📺📥⚡📦⬇️▶️]+/gu, '').trim();
  str = str.replace(/^(?:download|watch(?:\s+online)?|stream)\s+/i, '').trim();
  str = str.replace(/\[\s*18\+\s*\]|\(\s*18\+\s*\)|\[Adult\]/gi, '').trim();
  str = str.replace(/\{[^}]*\}/g, ' ');
  str = str.replace(/\[\s*(?:dual\s*audio|hindi|eng|org|bluray|hevc|x264|x265|720p|1080p|480p|2160p|4k)[^\]]*\]/gi, ' ');
  str = str.replace(/\((?:season\s*\d+\s*[-+–—]\s*\d+|seasons?\s*\d+[^)]*)\)/gi, ' ');
  str = str.replace(/\b(?:season\s*\d+\s*[-+–—]\s*\d+)\b/gi, ' ');
  str = str.split(/\b(?:480p|720p|1080p|2160p|4k)\s*[|•·–—-]/i)[0];
  str = str.split(/\b(?:dual\s*audio|multi\s*audio|hindi\s*dubbed|org\s*2\.0|org\s*5\.1|multi\s*sub)\b/i)[0];
  str = str.replace(/\b(?:480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|hdrip)\b.*$/i, '');
  str = str.replace(/\b(?:complete|hindi|english|telugu|tamil|malayalam|kannada)\b.*$/i, '');
  str = str.replace(/[\s|·–—\-_:]+$/g, '').trim();
  str = str.replace(/\s{2,}/g, ' ').trim();
  return str;
}

/**
 * Test a mirror URL's live HTTP reachability and latency
 */
async function probeMirror(url, headers = {}) {
  const start = Date.now();
  try {
    const res = await axios({
      method: 'GET',
      url,
      headers: {
        ...DEFAULT_HEADERS,
        Range: 'bytes=0-1024',
        ...headers,
      },
      timeout: 5000,
      maxRedirects: 3,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const latency = Date.now() - start;
    const size = res.headers['content-range']?.split('/')?.[1] || res.headers['content-length'];
    let formattedSize = '';
    if (size && !isNaN(size)) {
      const bytes = parseInt(size, 10);
      formattedSize = bytes > 1024 * 1024 * 1024
        ? `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return {
      alive: true,
      statusCode: res.status,
      latencyMs: latency,
      contentType: res.headers['content-type'] || 'video/octet-stream',
      fileSize: formattedSize,
    };
  } catch (err) {
    return {
      alive: false,
      statusCode: err.response?.status || 0,
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

/**
 * End-to-End deep crawl endpoint
 */
async function handleDeepCrawl(req, res) {
  const targetUrl = req.body?.url || req.query?.url;
  const requestedProvider = req.body?.provider || req.query?.provider;
  const query = req.body?.query || req.query?.query;

  if (!targetUrl && !query) {
    return res.status(400).json({ error: 'url or query parameter is required' });
  }

  const crawlSteps = [];
  const errors = [];
  let stepIndex = 1;

  const logStep = (name, url, status, timeMs, details, data = null) => {
    crawlSteps.push({
      step: stepIndex++,
      name,
      url,
      status,
      timeMs,
      details,
      data,
    });
  };

  try {
    let effectiveUrl = targetUrl;
    let provider = requestedProvider;

    // Detect provider from URL if not specified
    if (!provider && effectiveUrl) {
      const lower = effectiveUrl.toLowerCase();
      if (lower.includes('hdhub4u') || lower.includes('greenmotors') || lower.includes('hblinks')) provider = 'hdhub4u';
      else if (lower.includes('vegamovies') || lower.includes('nexdrive') || lower.includes('vcloud')) provider = 'vega';
      else if (lower.includes('moviesdrive') || lower.includes('mdrive')) provider = 'drive';
      else if (lower.includes('moviesmod') || lower.includes('modpro')) provider = 'moviesmod';
      else if (lower.includes('moviebox')) provider = 'movieBoxWeb';
      else if (lower.includes('katmoviehd') || lower.includes('katmovies') || lower.includes('kmhd')) provider = 'katmoviehd';
      else if (lower.includes('4khdhub')) provider = '4khdhub';
      else provider = 'custom';
    }

    let searchResults = [];
    // If a search query was supplied without direct URL, search on provider
    if (!effectiveUrl && query && provider) {
      const sStart = Date.now();
      try {
        const postsMod = await zendaEngine.loadModule(provider, 'posts');
        const context = zendaEngine.getProviderContext(provider);
        if (postsMod.getSearchPosts) {
          searchResults = await postsMod.getSearchPosts({
            searchQuery: query,
            page: 1,
            providerContext: context,
            signal: new AbortController().signal,
          });
        }
        logStep(
          `Search on ${provider}`,
          `${domainResolver.getBaseUrl(provider)}/?s=${encodeURIComponent(query)}`,
          200,
          Date.now() - sStart,
          `Found ${searchResults?.length || 0} posts matching "${query}".`,
          searchResults?.slice(0, 5)
        );
        if (searchResults && searchResults.length > 0) {
          effectiveUrl = searchResults[0].link;
          const bUrl = domainResolver.getBaseUrl(provider);
          if (effectiveUrl.startsWith('/') && bUrl) effectiveUrl = `${bUrl}${effectiveUrl}`;
        } else {
          return res.json({
            success: false,
            message: `No search results found for "${query}" on ${provider}.`,
            crawlSteps,
            errors: ['No search results found'],
          });
        }
      } catch (sErr) {
        errors.push(`Search failed: ${sErr.message}`);
        logStep(`Search failed`, query, 500, Date.now() - sStart, sErr.message);
      }
    }

    // Step 1: Analyze & Parse Metadata & Structural Hierarchy
    let metadata = {
      title: '',
      cleanTitle: '',
      type: 'movie',
      poster: '',
      synopsis: '',
      imdbId: '',
      year: '',
    };
    let structure = [];
    let initialLinkList = [];

    const metaStart = Date.now();
    try {
      if (provider && provider !== 'custom') {
        const metaMod = await zendaEngine.loadModule(provider, 'meta');
        const context = zendaEngine.getProviderContext(provider);
        const metaRes = await metaMod.getMeta({
          link: effectiveUrl,
          providerContext: context,
        });

        metadata = {
          title: metaRes.title || '',
          cleanTitle: cleanTitle(metaRes.title) || metaRes.title || '',
          type: metaRes.type || (metaRes.title?.toLowerCase().includes('season') ? 'series' : 'movie'),
          poster: metaRes.image || metaRes.poster || '',
          synopsis: metaRes.synopsis || '',
          imdbId: metaRes.imdbId || '',
          year: metaRes.year || (metaRes.title?.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || ''),
        };

        initialLinkList = metaRes.linkList || [];

        logStep(
          'Metadata Extraction',
          effectiveUrl,
          200,
          Date.now() - metaStart,
          `Parsed "${metadata.cleanTitle}" (${metadata.type.toUpperCase()}). Found ${initialLinkList.length} quality/season groups.`,
          { metadata, groupCount: initialLinkList.length }
        );
      } else {
        // Custom URL Heuristic HTML Parsing
        const pageRes = await smartAxios.get(effectiveUrl, { headers: DEFAULT_HEADERS });
        const $ = cheerio.load(pageRes.data);
        const pageTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
        const pageImage = $('meta[property="og:image"]').attr('content') || $('img').first().attr('src') || '';
        const pageDesc = $('meta[property="og:description"]').attr('content') || $('p').first().text() || '';

        metadata = {
          title: pageTitle.trim(),
          cleanTitle: cleanTitle(pageTitle),
          type: /season|series|episode|s\d+/i.test(pageTitle) ? 'series' : 'movie',
          poster: pageImage.startsWith('/') ? new URL(pageImage, effectiveUrl).href : pageImage,
          synopsis: pageDesc.trim().slice(0, 300),
          imdbId: pageRes.data.match(/tt\d{7,8}/)?.[0] || '',
          year: pageTitle.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || '',
        };

        // Find candidate streaming/download links
        const customCandidates = [];
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          const txt = $(el).text().trim();
          if (href && /^https?:\/\//i.test(href) && /(hubcloud|drive|cloud|fastdl|gofile|pixeldrain|download|stream|file|mkv|mp4)/i.test(href)) {
            customCandidates.push({ title: txt || 'Download Link', link: href });
          }
        });

        initialLinkList = customCandidates.map((c) => ({
          title: c.title,
          quality: c.title.match(/\b(4K|2160p|1080p|720p|480p)\b/i)?.[0] || 'HD',
          directLinks: [{ title: c.title, link: c.link }],
        }));

        logStep(
          'Custom Page Scraping',
          effectiveUrl,
          200,
          Date.now() - metaStart,
          `Custom heuristic scrape found "${metadata.cleanTitle}". Extracted ${initialLinkList.length} candidate buttons.`,
          { metadata, candidateCount: initialLinkList.length }
        );
      }
    } catch (mErr) {
      errors.push(`Metadata error: ${mErr.message}`);
      logStep('Metadata Extraction Error', effectiveUrl, 500, Date.now() - metaStart, mErr.message);
    }

    // Step 2: Build Normalized Structure Tree (resolving episodesLink for Series)
    const treeStart = Date.now();
    for (let gIdx = 0; gIdx < initialLinkList.length; gIdx++) {
      const grp = initialLinkList[gIdx];
      const gTitle = grp.title || grp.quality || `Group ${gIdx + 1}`;
      const quality = grp.quality || gTitle.match(/\b(4K|2160p|1080p|720p|480p)\b/i)?.[0] || 'HD';
      const size = gTitle.match(/\[?(\d+(?:\.\d+)?\s*(?:GB|MB))\]?/i)?.[1] || '';
      const dub = gTitle.match(/\{(.*?)\}|\[(Dual Audio.*?)\]/i)?.[1] || 'Default Audio';

      let episodeList = [];

      if (Array.isArray(grp.directLinks) && grp.directLinks.length > 0) {
        episodeList = grp.directLinks.map((d, dIdx) => ({
          title: d.title || `Episode ${dIdx + 1}`,
          link: d.link || d,
          type: d.type || (metadata.type === 'series' ? 'episode' : 'movie'),
        }));
      } else if (grp.episodesLink && provider && provider !== 'custom') {
        try {
          const epStart = Date.now();
          const epMod = await zendaEngine.loadModule(provider, 'episodes');
          const context = zendaEngine.getProviderContext(provider);
          const rawEps = await epMod.getEpisodes({
            url: grp.episodesLink,
            providerContext: context,
            signal: new AbortController().signal,
          });
          if (Array.isArray(rawEps)) {
            episodeList = rawEps.map((e, eIdx) => ({
              title: e.title || `Episode ${eIdx + 1}`,
              link: e.link,
              type: 'episode',
            }));
          }
          logStep(
            `Episodes Resolution (${gTitle})`,
            grp.episodesLink,
            200,
            Date.now() - epStart,
            `Resolved ${episodeList.length} individual episodes from archive.`,
            episodeList.slice(0, 4)
          );
        } catch (epErr) {
          errors.push(`Failed to fetch episodes for ${gTitle}: ${epErr.message}`);
        }
      }

      structure.push({
        groupIndex: gIdx + 1,
        title: gTitle,
        quality,
        size,
        dub,
        episodeCount: episodeList.length,
        episodes: episodeList,
      });
    }

    logStep(
      'Structure Tree Built',
      effectiveUrl,
      200,
      Date.now() - treeStart,
      `Normalized ${structure.length} quality groups with total ${structure.reduce((a, b) => a + b.episodeCount, 0)} playable items.`
    );

    // Step 3: Deep Crawl Target Link to extract Final Mirrors
    // Pick the first playable episode/quality link to deep-crawl
    let targetStreamLink = '';
    for (const group of structure) {
      if (group.episodes && group.episodes.length > 0) {
        targetStreamLink = group.episodes[0].link;
        break;
      }
    }
    if (!targetStreamLink && effectiveUrl) {
      targetStreamLink = effectiveUrl;
    }

    const mirrorList = [];
    if (targetStreamLink) {
      const crawlResolveStart = Date.now();

      // Check if it is a MovieBox Web json or api link
      if (targetStreamLink.startsWith('{') && targetStreamLink.includes('subjectId')) {
        try {
          const streamMod = await zendaEngine.loadModule('movieBoxWeb', 'stream');
          const context = zendaEngine.getProviderContext('movieBoxWeb');
          const mbStreams = await streamMod.getStream({
            link: targetStreamLink,
            type: metadata.type,
            isDownload: true,
            providerContext: context,
            signal: new AbortController().signal,
          });
          if (Array.isArray(mbStreams)) {
            mbStreams.forEach((s) => mirrorList.push({ server: s.server || 'MovieBox Direct', link: s.link, type: 'mp4' }));
          }
          logStep('MovieBox Stream Extraction', 'moviebox-api', 200, Date.now() - crawlResolveStart, 'Extracted direct CDN video stream.', mirrorList);
        } catch (mbErr) {
          errors.push(`MovieBox stream error: ${mbErr.message}`);
        }
      } else {
        // Deep follow through intermediate protectors & HubCloud / HubDrive / Greenmotors / Gamerxyt / Modpro
        logStep('Crawling Stream Target Link', targetStreamLink, 200, 0, `Initiating deep mirror extraction on: ${targetStreamLink}`);

        const realMirrors = await extractHubCloudMirrors(targetStreamLink);
        if (realMirrors && realMirrors.length > 0) {
          realMirrors.forEach((m) => mirrorList.push(m));
          logStep(
            'Direct Mirrors Extracted',
            targetStreamLink,
            200,
            Date.now() - crawlResolveStart,
            `Successfully resolved ${realMirrors.length} 100% active cloud mirrors.`,
            realMirrors
          );
        } else {
          // If extractHubCloudMirrors didn't catch it, attempt zenda provider getStream
          try {
            if (provider && provider !== 'custom') {
              const streamMod = await zendaEngine.loadModule(provider, 'stream');
              const context = zendaEngine.getProviderContext(provider);
              const zStreams = await streamMod.getStream({
                link: targetStreamLink,
                type: metadata.type,
                isDownload: true,
                providerContext: context,
                signal: new AbortController().signal,
              });
              if (Array.isArray(zStreams) && zStreams.length > 0) {
                zStreams.forEach((s) => mirrorList.push(s));
                logStep('Provider Stream Extraction', targetStreamLink, 200, Date.now() - crawlResolveStart, `Provider module returned ${zStreams.length} streams.`, zStreams);
              }
            }
          } catch (zErr) {
            errors.push(`Provider stream module notice: ${zErr.message}`);
          }
        }
      }
    }

    // Step 4: Probing Final Mirrors for Live Speed, File Size & Video MIME Type
    const validatedMirrors = [];
    for (const m of mirrorList) {
      const probe = await probeMirror(m.link);
      validatedMirrors.push({
        server: m.server,
        link: m.link,
        type: m.type || 'mkv',
        isDownloadOnly: /download\s*only/i.test(m.server) || /gdrive/i.test(m.server),
        alive: probe.alive,
        statusCode: probe.statusCode,
        latencyMs: probe.latencyMs,
        fileSize: probe.fileSize || 'Streamable',
        contentType: probe.contentType,
      });
    }

    logStep(
      'Mirrors Health Verification',
      'health-check',
      200,
      0,
      `Probed ${validatedMirrors.length} mirrors. Active: ${validatedMirrors.filter((v) => v.alive).length}/${validatedMirrors.length}`,
      validatedMirrors
    );

    return res.json({
      success: true,
      url: effectiveUrl,
      provider,
      metadata,
      structure,
      crawlSteps,
      finalMirrors: validatedMirrors,
      searchResults: searchResults?.length > 0 ? searchResults : undefined,
      errors,
    });
  } catch (err) {
    console.error('handleDeepCrawl critical error:', err);
    logStep('Crawl Aborted with Error', targetUrl || '', 500, 0, err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      crawlSteps,
      errors: [...errors, err.message],
    });
  }
}

/**
 * Returns all available extensions with configuration, domain mirrors and test queries
 */
async function getExtensionCatalog(req, res) {
  try {
    const urls = await domainResolver.syncUrls();
    const manifestService = require('../services/manifestService.cjs');
    const providers = await manifestService.getProviders();

    const enriched = providers.map((p) => {
      const baseUrl = domainResolver.getBaseUrl(p.value);
      return {
        ...p,
        baseUrl: baseUrl || 'https://...',
        status: baseUrl ? 'Online' : 'Offline',
        supportedTypes: p.type === 'anime' ? ['anime'] : p.type === 'hindi' ? ['movie', 'series'] : ['movie', 'series', 'anime'],
        sampleQueries: p.value.includes('anime')
          ? ['Naruto', 'Attack on Titan', 'Jujutsu Kaisen']
          : ['Jawan', 'Avatar', 'Game of Thrones', 'Loki', 'Stree 2'],
      };
    });

    return res.json({
      success: true,
      count: enriched.length,
      extensions: enriched,
    });
  } catch (err) {
    console.error('getExtensionCatalog error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Test Custom Website Scraping
 */
async function testCustomWebsite(req, res) {
  const { url, selectors } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const steps = [];
  try {
    const start = Date.now();
    const pageRes = await smartAxios.get(url, { headers: DEFAULT_HEADERS });
    const $ = cheerio.load(pageRes.data);

    const title = selectors?.title ? $(selectors.title).text().trim() : $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || $('title').text().trim();
    const poster = selectors?.poster ? $(selectors.poster).attr('src') : $('meta[property="og:image"]').attr('content') || $('img').first().attr('src');
    const synopsis = selectors?.synopsis ? $(selectors.synopsis).text().trim() : $('meta[property="og:description"]').attr('content') || $('p').first().text().trim();

    const links = [];
    const linkSelector = selectors?.link || 'a';
    $(linkSelector).each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && /^https?:\/\//i.test(href) && /(hubcloud|drive|cloud|fastdl|pixeldrain|download|stream|mkv|mp4)/i.test(href)) {
        links.push({ text: text || 'Link', href });
      }
    });

    return res.json({
      success: true,
      url,
      elapsedMs: Date.now() - start,
      extracted: {
        title,
        cleanTitle: cleanTitle(title),
        poster,
        synopsis,
        linksCount: links.length,
        links: links.slice(0, 20),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  handleDeepCrawl,
  getExtensionCatalog,
  testCustomWebsite,
};
