const zendaEngine = require("../services/zendaEngine.cjs");
const serverCache = require("../services/cacheService.cjs");

/**
 * Intelligent episode & season pack extractor for series where upstream
 * scrapers missed E01-E99 or hardcoded dummy "Movie" placeholders.
 */
async function enhanceSeriesMeta(url, title, axios, cheerio) {
  try {
    const res = await axios.get(url, {
      headers: {
        Cookie: "xla=s4t",
        Referer: "https://google.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
      },
      timeout: 8000,
    });
    const $ = cheerio.load(res.data);
    const container = $(".page-body").length ? $(".page-body") : $("main").length ? $("main") : $("body");

    const qualityGroups = {};
    let currentQ = "720p";

    // 1. Scan for headings and episode rows (e.g. E01 - Drive, Episode 1, EP-01)
    container.find("h1, h2, h3, h4, h5, h6, p, div, li").each((_, el) => {
      const text = $(el).text().trim();
      if (!text) return;

      // Check if heading changes quality context
      const qMatch = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i);
      if (qMatch && /(single\s*episode|episode|hevc|web-dl|bluray)/i.test(text)) {
        currentQ = qMatch[1].toLowerCase();
        if (/hevc|10bit/i.test(text)) currentQ += " (HEVC)";
      }

      // Check for episode prefix: E01, E1, EP01, Episode 1, Ep 1
      const epMatch = text.match(/^(E|EP|Episode)\s*0*(\d+)\b/i);
      if (epMatch) {
        const epNum = parseInt(epMatch[2], 10);
        const epTitle = `Episode ${epNum}`;

        const links = [];
        $(el).find("a").each((_a, aEl) => {
          const href = $(aEl).attr("href");
          if (!href) return;
          const aText = $(aEl).text().toLowerCase();
          if (
            /(hubdrive|greenmotors|hubcloud|hubcdn|drive)/i.test(href) ||
            /(drive|watch|instant|download)/i.test(aText)
          ) {
            links.push(href);
          }
        });

        if (links.length > 0) {
          const bestLink = links.find((h) => h.includes("hubdrive")) || links[0];
          if (!qualityGroups[currentQ]) qualityGroups[currentQ] = [];
          if (!qualityGroups[currentQ].some((e) => e.title === epTitle)) {
            qualityGroups[currentQ].push({ title: epTitle, link: bestLink });
          }
        }
      }
    });

    // 2. Scan for full season batch packs (e.g. "1080p 10Bit HEVC [7.6GB]")
    const batchPacks = [];
    container.find("a").each((_, aEl) => {
      const href = $(aEl).attr("href");
      if (!href || !/(hubdrive|greenmotors|hubcloud)/i.test(href)) return;
      const text = $(aEl).text().trim();
      const parentText = $(aEl).parent().text().trim();
      const fullText = `${text} ${parentText}`;

      const isPack = /(pack|zip|batch|complete|all episodes)/i.test(fullText);
      const hasSize = /\[\s*\d+(\.\d+)?\s*(gb|mb)\s*\]/i.test(fullText);
      const isEp = /episode\s*\d+/i.test(fullText) || /^E\s*0*\d+/i.test(text);

      if ((isPack || hasSize) && !isEp) {
        const label = text.length > 4 ? text : parentText;
        if (!batchPacks.some((p) => p.link === href || p.title === label)) {
          batchPacks.push({ title: label, link: href });
        }
      }
    });

    const linkList = [];
    for (const [q, eps] of Object.entries(qualityGroups)) {
      if (eps.length > 0) {
        linkList.push({
          title: `${title} - ${q.toUpperCase()}`,
          quality: q,
          directLinks: eps,
        });
      }
    }

    if (batchPacks.length > 0) {
      linkList.push({
        title: `${title} - Full Season Packs`,
        quality: "Pack",
        directLinks: batchPacks.map((p) => ({ title: p.title, link: p.link })),
      });
    }

    return linkList;
  } catch (err) {
    console.warn("enhanceSeriesMeta failed:", err.message);
    return [];
  }
}

/**
 * Universal episodes resolver for API/streaming providers (e.g. MovieBox Web,
 * MKVDrama, GokuHD, Showbox, etc.) that provide episodesLink pointers.
 */
async function resolveProviderEpisodes(provider, meta, context) {
  const hasEpisodesLink =
    (Array.isArray(meta.linkList) && meta.linkList.some((g) => g.episodesLink)) ||
    meta.episodesLink;

  if (!hasEpisodesLink) return null;

  try {
    const epMod = await zendaEngine.loadModule(provider, "episodes");
    if (!epMod || !epMod.getEpisodes) return null;

    const rawGroups =
      Array.isArray(meta.linkList) && meta.linkList.length > 0
        ? meta.linkList
        : [{ title: meta.title || "Episodes", episodesLink: meta.episodesLink }];

    // Prioritize popular tracks (Hindi first, then Original Audio, then English)
    const preferredLangs = ["hindi", "original", "english"];
    const matchedPreferred = rawGroups.filter((g) => {
      const aT = (g.title || "").toLowerCase();
      return preferredLangs.some((l) => aT.includes(l));
    });

    // If Hindi or English tracks exist, strictly keep those; otherwise keep top 2 tracks
    const candidateGroups = matchedPreferred.length > 0 ? matchedPreferred : rawGroups.slice(0, 2);
    const groupsToProcess = [...candidateGroups].sort((a, b) => {
      const aT = (a.title || "").toLowerCase();
      const bT = (b.title || "").toLowerCase();
      const aP = preferredLangs.findIndex((l) => aT.includes(l));
      const bP = preferredLangs.findIndex((l) => bT.includes(l));
      if (aP !== -1 && bP !== -1) return aP - bP;
      if (aP !== -1) return -1;
      if (bP !== -1) return 1;
      return 0;
    });
    const resolvedGroups = [];

    for (const g of groupsToProcess) {
      if (g.episodesLink) {
        try {
          const eps = await epMod.getEpisodes({
            url: g.episodesLink,
            providerContext: context,
          });

          if (Array.isArray(eps) && eps.length > 0) {
            // Group episodes by Season (e.g. "S01 E01" or "Season 1")
            const gSeasonMatch = (g.title || '').match(/\b(?:season\s*(\d{1,2})|s(\d{1,2}))\b/i);
            const parentSeasonNum = gSeasonMatch ? parseInt(gSeasonMatch[1] || gSeasonMatch[2], 10) : 1;

            const seasonMap = new Map();
            for (const ep of eps) {
              let seasonNum = parentSeasonNum;
              let epTitle = ep.title || 'Episode';

              if (typeof ep.link === 'string' && ep.link.startsWith('{')) {
                try {
                  const parsed = JSON.parse(ep.link);
                  if (parsed.season) seasonNum = Number(parsed.season);
                  if (parsed.episode && (!epTitle || epTitle === 'Episode')) {
                    epTitle = `Episode ${parsed.episode}`;
                  }
                } catch (_) {}
              }

              // Only override if epTitle explicitly specifies another season (e.g. S02E01)
              const sMatch = epTitle.match(/\b(?:S(\d{1,2})E\d+|Season\s*(\d{1,2}))\b/i);
              if (sMatch) seasonNum = parseInt(sMatch[1] || sMatch[2], 10);

              if (!seasonMap.has(seasonNum)) seasonMap.set(seasonNum, []);
              seasonMap.get(seasonNum).push({
                title: epTitle,
                link: ep.link,
              });
            }

            const dubName = (g.title || g.language || '').trim();
            const sortedSeasons = Array.from(seasonMap.keys()).sort((a, b) => a - b);
            for (const sNum of sortedSeasons) {
              let finalTitle = dubName || `Season ${sNum}`;
              // Only append Season if dubName doesn't already contain this season!
              if (!new RegExp(`\\b(season\\s*${sNum}|s0*${sNum})\\b`, 'i').test(finalTitle)) {
                finalTitle = `${finalTitle} · Season ${sNum}`;
              }
              resolvedGroups.push({
                title: finalTitle,
                season: sNum,
                dub: dubName || 'Default Audio',
                quality: g.quality || 'HD',
                directLinks: seasonMap.get(sNum),
              });
            }
          } else if (Array.isArray(g.directLinks)) {
            resolvedGroups.push(g);
          }
        } catch (epErr) {
          console.warn(`Failed to resolve episodes for ${g.title}:`, epErr.message);
          if (Array.isArray(g.directLinks)) resolvedGroups.push(g);
        }
      } else if (Array.isArray(g.directLinks)) {
        resolvedGroups.push(g);
      }
    }

    return resolvedGroups.length > 0 ? resolvedGroups : null;
  } catch (err) {
    console.warn(`resolveProviderEpisodes error for ${provider}:`, err.message);
    return null;
  }
}

/**
 * Extract screenshots and official trailer embed across all sources
 */
async function enrichScreenshotsAndTrailer(provider, meta, link, context) {
  try {
    meta.screenshots = Array.isArray(meta.screenshots) ? meta.screenshots : [];
    let foundTrailer = Boolean(meta.trailerEmbed || meta.trailerUrl);

    // 1. Scrape provider's page for high-res screenshot stills and YouTube trailer iframe
    const pageUrl =
      meta.webUrl ||
      (typeof link === "string" && link.startsWith("http")
        ? link
        : typeof link === "string" && link.startsWith("/")
        ? `${context.getBaseUrl(provider)}${link}`
        : null);

    if (pageUrl && (!meta.screenshots.length || !foundTrailer)) {
      try {
        const res = await context.axios.get(pageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Referer: "https://google.com",
            Cookie: "xla=s4t",
          },
          timeout: 6000,
        });

        if (res && res.data) {
          const $ = context.cheerio.load(res.data);

          // A. Trailer extraction from iframes & links
          if (!foundTrailer) {
            $("iframe").each((_, el) => {
              const src = $(el).attr("src") || $(el).attr("data-src") || "";
              const ytMatch = src.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
              if (ytMatch) {
                const ytId = ytMatch[1];
                meta.trailerEmbed = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
                meta.trailerUrl = `https://www.youtube.com/watch?v=${ytId}`;
                foundTrailer = true;
                return false;
              }
            });

            if (!foundTrailer) {
              $('a[href*="youtube.com"], a[href*="youtu.be"]').each((_, el) => {
                const href = $(el).attr("href") || "";
                const ytMatch = href.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
                if (ytMatch) {
                  const ytId = ytMatch[1];
                  meta.trailerEmbed = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
                  meta.trailerUrl = `https://www.youtube.com/watch?v=${ytId}`;
                  foundTrailer = true;
                  return false;
                }
              });
            }
          }

          // B. Screenshots extraction from article body (remove noise / related posts / sidebars first)
          $(
            "aside, .primary-sidebar, .sidebar, .widget, .widget-recent, .thumbnail-wrapper, .recent-posts, .related, .related-posts, footer, header, nav, .comments, .yarpp-related, .wp-block-latest-posts, .crp_related, .jp-relatedposts, .wp-block-post-template, .thumb"
          ).remove();

          const container = $("main.page-body, .entry-content, article.post, .page-body, article").first();
          const scrapedScreenshots = [];

          container.find("img").each((_, el) => {
            let src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || "";
            if (!src) return;

            if (src.startsWith("//")) src = `https:${src}`;
            if (src.startsWith("/")) return;

            const lower = src.toLowerCase();

            if (
              lower.includes("logo") ||
              lower.includes("gravatar") ||
              lower.includes("avatar") ||
              lower.includes("whatsapp") ||
              lower.includes("telegram") ||
              lower.includes("emoji") ||
              lower.includes("reaction") ||
              lower.includes("button") ||
              lower.includes("banner") ||
              lower.includes("snvhost") ||
              lower.includes("icon") ||
              lower.includes("badge") ||
              lower.includes("poster") ||
              lower.endsWith(".svg")
            ) {
              return;
            }

            if (meta.image && (src === meta.image || lower === meta.image.toLowerCase())) return;
            if (meta.poster && (src === meta.poster || lower === meta.poster.toLowerCase())) return;

            const alt = ($(el).attr("alt") || "").toLowerCase();
            const titleAttr = ($(el).attr("title") || "").toLowerCase();

            // Reject any image that represents a movie download card/poster
            if (
              alt.includes("poster") ||
              alt.includes("download") ||
              alt.includes("full movie") ||
              alt.includes("season") ||
              alt.includes("episodes") ||
              titleAttr.includes("poster") ||
              titleAttr.includes("download")
            ) {
              return;
            }

            // Real video snapshot detection
            const isLikelyScreenshot =
              lower.includes("vlcsnap") ||
              lower.includes("screenshot") ||
              lower.includes("screen-shot") ||
              lower.includes("screen_shot") ||
              lower.includes("-stills") ||
              lower.includes("_stills") ||
              alt.includes("screenshot") ||
              alt.includes("vlcsnap") ||
              titleAttr.includes("screenshot");

            if (isLikelyScreenshot) {
              let fullSrc = src.replace(/\.th\.(jpe?g|png|webp)$/i, ".$1");
              if (!scrapedScreenshots.includes(fullSrc)) {
                scrapedScreenshots.push(fullSrc);
              }
            }
          });

          if (scrapedScreenshots.length > 0) {
            meta.screenshots = scrapedScreenshots;
          }
        }
      } catch (_) {}
    }

    // 2. Fallback to Cinemeta if trailer or screenshots missing
    if ((!foundTrailer || meta.screenshots.length < 2) && meta.imdbId) {
      try {
        const itemType = meta.type === "series" ? "series" : "movie";
        const cmRes = await context.axios.get(
          `https://v3-cinemeta.strem.io/meta/${itemType}/${meta.imdbId}.json`,
          { timeout: 3500 }
        );
        const cmMeta = cmRes.data?.meta;
        if (cmMeta) {
          if (!foundTrailer && Array.isArray(cmMeta.trailers) && cmMeta.trailers.length > 0) {
            const ytId = cmMeta.trailers[0].source;
            if (ytId) {
              meta.trailerEmbed = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
              meta.trailerUrl = `https://www.youtube.com/watch?v=${ytId}`;
              foundTrailer = true;
            }
          }
          if (cmMeta.background && !meta.screenshots.includes(cmMeta.background)) {
            meta.screenshots.push(cmMeta.background);
          }
        }
      } catch (_) {}
    }

    // 3. Fallback to YouTube trailer search if trailer still missing
    if (!foundTrailer && meta.title) {
      try {
        const cleanTitle = meta.title
          .replace(/\b(1080p|720p|480p|2160p|4k|web-dl|webrip|hevc|x264|bluray|hindi|dual audio|uncut|esub|hq|all episodes|season \d+)\b/gi, "")
          .replace(/[\[\]\(\)\|–-]/g, " ")
          .trim();

        if (cleanTitle) {
          const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + " official trailer")}`;
          const ytRes = await context.axios.get(ytSearchUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            timeout: 3500,
          });
          const match = (ytRes.data || "").match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (match && match[1]) {
            const ytId = match[1];
            meta.trailerEmbed = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
            meta.trailerUrl = `https://www.youtube.com/watch?v=${ytId}`;
            foundTrailer = true;
          }
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn("enrichScreenshotsAndTrailer error:", err.message);
  }
}

async function getMeta(req, res) {
  const { provider = "autoEmbed", link } = req.query;
  if (!link) return res.status(400).json({ error: "Link required" });

  const cacheKey = `meta:v8:${provider}:${link}`;
  const cached = serverCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const mod = await zendaEngine.loadModule(provider, "meta");
    if (!mod.getMeta) return res.json(null);

    const context = zendaEngine.getProviderContext(provider);
    const meta = await mod.getMeta({ link, providerContext: context });

    if (meta) {
      const isSeries =
        meta.type === "series" ||
        (meta.title && meta.title.toLowerCase().includes("season")) ||
        (meta.webUrl && meta.webUrl.toLowerCase().includes("season"));

      // 1. Universal Episodes Resolution for API/streaming providers (MovieBox Web, MKVDrama, etc.)
      const resolvedEpisodes = await resolveProviderEpisodes(provider, meta, context);
      if (resolvedEpisodes) {
        meta.linkList = resolvedEpisodes;
      }

      // 2. Direct episodes array normalization
      if (Array.isArray(meta.episodes) && (!meta.linkList || meta.linkList.length === 0)) {
        meta.linkList = [
          {
            title: "Episodes",
            quality: "HD",
            directLinks: meta.episodes.map((e) => ({
              title: e.title || "Episode",
              link: e.link,
            })),
          },
        ];
      }

      // 3. Fallback for scraped sites (HdHub4u, Vega) where episodes were missed or hardcoded as "Movie"
      const hasOnlyDummyMovieLinks =
        isSeries &&
        Array.isArray(meta.linkList) &&
        meta.linkList.length > 0 &&
        meta.linkList.every(
          (g) =>
            !g.directLinks ||
            g.directLinks.length === 0 ||
            g.directLinks.every((l) => (l.title || "").toLowerCase() === "movie")
        );

      if (hasOnlyDummyMovieLinks || (isSeries && (!meta.linkList || meta.linkList.length === 0))) {
        const pageUrl =
          meta.webUrl ||
          (link.startsWith("http") ? link : `${context.getBaseUrl(provider)}${link}`);
        const enhancedList = await enhanceSeriesMeta(
          pageUrl,
          meta.title || "Series",
          context.axios,
          context.cheerio
        );

        if (enhancedList.length > 0) {
          meta.linkList = enhancedList;
        }
      }

      // 4. Ensure any items with a single .link are normalized into directLinks
      if (Array.isArray(meta.linkList)) {
        for (const g of meta.linkList) {
          if (!Array.isArray(g.directLinks) && g.link) {
            g.directLinks = [{ title: g.title || "Stream", link: g.link }];
          }
          if (isSeries && Array.isArray(g.directLinks)) {
            for (const l of g.directLinks) {
              if ((l.title || "").toLowerCase() === "movie") {
                l.title = g.title || "Episode 1";
              }
            }
          }
        }
      }

      // 5. Enrich with Screenshots and Official Trailer Embed across all providers
      await enrichScreenshotsAndTrailer(provider, meta, link, context);

      serverCache.set(cacheKey, meta, 60 * 60 * 1000);
    }
    res.json(meta || null);
  } catch (err) {
    console.error(`Meta error for ${provider}:`, err.message);
    res.json(null);
  }
}

module.exports = { getMeta };
