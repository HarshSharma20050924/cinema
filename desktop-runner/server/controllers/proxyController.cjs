const { resolveHubCloudDirect } = require('./streamController.cjs');
const axios = require("axios");
const { URL } = require("url");
const { spawn } = require("child_process");
const fs = require("fs");
const { DEFAULT_HEADERS } = require("../config/constants.cjs");

function hasFfmpeg() {
  try {
    return fs.existsSync('/usr/bin/ffmpeg') || fs.existsSync('/usr/local/bin/ffmpeg');
  } catch (_) {
    return false;
  }
}

/**
 * Resolves request headers taking into account custom query headers,
 * explicit referer/origin, and domain-specific anti-hotlinking requirements.
 */
function resolveRequestHeaders(targetUrl, queryHeaders, queryReferer, queryOrigin) {
  let customHeaders = {};
  if (queryHeaders) {
    try {
      customHeaders = typeof queryHeaders === "string" ? JSON.parse(decodeURIComponent(queryHeaders)) : queryHeaders;
    } catch (_) {}
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (_) {
    return { ...DEFAULT_HEADERS, ...customHeaders };
  }

  const host = (parsed.host || "").toLowerCase();
  const headers = { ...DEFAULT_HEADERS, ...customHeaders };
  delete headers["Host"];

  if (queryReferer) {
    headers["Referer"] = decodeURIComponent(queryReferer);
  }
  if (queryOrigin) {
    headers["Origin"] = decodeURIComponent(queryOrigin);
  }

  // Domain-specific automatic fallback headers if not explicitly supplied
  if (!headers["Referer"] || headers["Referer"].includes(parsed.host)) {
    if (
      host.includes("hakunaymatata.com") ||
      host.includes("moviebox") ||
      host.includes("inmoviebox.com") ||
      host.includes("aoneroom.com") ||
      host.includes("sssrr.org")
    ) {
      headers["Origin"] = "https://officialmoviebox.com";
      headers["Referer"] = "https://officialmoviebox.com/";
    } else if (
      host.includes("krussdomi.com") ||
      host.includes("habibikun") ||
      host.includes("babybayw") ||
      host.includes("narutokun") ||
      host.includes("advancedairesearchlab")
    ) {
      headers["Origin"] = "https://krussdomi.com";
      headers["Referer"] = "https://krussdomi.com/";
    } else if (
      host.includes("videocdndelivery") ||
      host.includes("cdnvideo") ||
      host.includes("streamingvideofaster") ||
      host.includes("kisskh")
    ) {
      headers["Origin"] = "https://kisskh.is";
      headers["Referer"] = "https://kisskh.is/";
    } else if (
      host.includes("mxplayer") ||
      host.includes("d3sgzbosmwirao.cloudfront.net")
    ) {
      headers["Origin"] = "https://www.mxplayer.in";
      headers["Referer"] = "https://www.mxplayer.in/";
    } else if (
      host.includes("bhcoxn.com") ||
      host.includes("fhxod.com") ||
      host.includes("hlowb.com")
    ) {
      headers["User-Agent"] = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
      headers["Origin"] = parsed.origin;
      headers["Referer"] = parsed.origin + "/";
    } else {
      if (!headers["Origin"]) headers["Origin"] = parsed.origin;
      if (!headers["Referer"]) headers["Referer"] = parsed.origin + "/";
    }
  }

  return headers;
}

/**
 * Recursively resolves M3U8 playlists (handling master playlists and segment lists).
 */
async function parseM3u8Segments(targetUrl, headers, depth = 0) {
  if (depth > 5) throw new Error("Too many M3U8 playlist levels");

  const res = await axios.get(targetUrl, {
    headers,
    responseType: "text",
    timeout: 15000,
    validateStatus: (status) => status < 400,
  });

  const content = typeof res.data === "string" ? res.data : String(res.data);
  const lines = content.split("\n").map((l) => l.trim());

  // Master playlist detection (#EXT-X-STREAM-INF)
  const hasMaster = lines.some((l) => l.includes("#EXT-X-STREAM-INF"));
  if (hasMaster) {
    let bestUrl = null;
    let highestBandwidth = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("#EXT-X-STREAM-INF")) {
        const bwMatch = lines[i].match(/BANDWIDTH=(\d+)/i);
        const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;
        for (let j = i + 1; j < lines.length; j++) {
          const cand = lines[j];
          if (cand && !cand.startsWith("#")) {
            const resolved = cand.startsWith("http")
              ? cand
              : (cand.startsWith("//") ? "https:" + cand : new URL(cand, targetUrl).href);
            if (bw > highestBandwidth || !bestUrl) {
              highestBandwidth = bw;
              bestUrl = resolved;
            }
            break;
          }
        }
      }
    }

    if (bestUrl) {
      return await parseM3u8Segments(bestUrl, headers, depth + 1);
    }
  }

  let initSegmentUrl = null;
  const segments = [];
  let currentByteOffset = 0;
  let currentRange = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("#EXT-X-MAP:")) {
      const uriMatch = line.match(/URI=["']?([^"']+)["']?/);
      if (uriMatch && uriMatch[1]) {
        initSegmentUrl = uriMatch[1].startsWith("http")
          ? uriMatch[1]
          : (uriMatch[1].startsWith("//") ? "https:" + uriMatch[1] : new URL(uriMatch[1], targetUrl).href);
      }
    } else if (line.startsWith("#EXT-X-BYTERANGE:")) {
      const match = line.match(/#EXT-X-BYTERANGE:(\d+)(?:@(\d+))?/i);
      if (match) {
        const len = parseInt(match[1], 10);
        const off = match[2] !== undefined ? parseInt(match[2], 10) : currentByteOffset;
        currentRange = `bytes=${off}-${off + len - 1}`;
        currentByteOffset = off + len;
      }
    } else if (!line.startsWith("#") && line.length > 0) {
      const segUrl = line.startsWith("http")
        ? line
        : (line.startsWith("//") ? "https:" + line : new URL(line, targetUrl).href);
      segments.push({ url: segUrl, range: currentRange });
      currentRange = null;
    }
  }

  return {
    playlistUrl: targetUrl,
    segments,
    initSegmentUrl,
  };
}

/**
 * Downloads an HLS stream and pipes full video stream to res (using FFmpeg remuxing or direct TS chunks)
 */
async function streamHlsDownload(req, res, { targetUrl, headers, filename }) {
  const m3u8Data = await parseM3u8Segments(targetUrl, headers);
  const useFfmpeg = hasFfmpeg();

  const baseName = filename.replace(/\.(m3u8|ts|mkv|mp4)$/i, "");
  const finalFilename = `${baseName}.${useFfmpeg ? "mp4" : "ts"}`;

  res.setHeader("Content-Disposition", `attachment; filename="${finalFilename}"`);
  res.setHeader("Content-Type", useFfmpeg ? "video/mp4" : "video/mp2t");
  res.setHeader("Accept-Ranges", "none");

  let isClosed = false;
  let ffmpeg = null;

  req.on("close", () => {
    isClosed = true;
    if (ffmpeg) {
      try { ffmpeg.kill("SIGKILL"); } catch (_) {}
    }
  });

  let outputStream = res;

  if (useFfmpeg) {
    ffmpeg = spawn("ffmpeg", [
      "-loglevel", "error",
      "-i", "pipe:0",
      "-c", "copy",
      "-bsf:a", "aac_adtstoasc",
      "-movflags", "frag_keyframe+empty_moov+default_base_moof",
      "-f", "mp4",
      "pipe:1",
    ]);

    ffmpeg.stdout.pipe(res);
    ffmpeg.stdin.on("error", (err) => {
      if (err.code !== "EPIPE") console.warn("ffmpeg stdin error:", err.message);
    });
    ffmpeg.on("error", (err) => {
      console.warn("ffmpeg spawn error:", err.message);
      if (!res.headersSent) res.status(500).end();
    });

    outputStream = ffmpeg.stdin;
  }

  // Download init segment if present (fMP4)
  if (m3u8Data.initSegmentUrl) {
    try {
      const initRes = await axios.get(m3u8Data.initSegmentUrl, {
        headers,
        responseType: "arraybuffer",
        timeout: 15000,
      });
      if (!isClosed && outputStream.writable) {
        outputStream.write(Buffer.from(initRes.data));
      }
    } catch (e) {
      console.warn("Failed to download init segment:", e.message);
    }
  }

  // Concurrent in-order segment downloader
  const CONCURRENCY = 4;
  const segments = m3u8Data.segments;
  const bufferMap = new Map();
  let nextToWrite = 0;
  let currentIndex = 0;

  async function downloadWorker() {
    while (currentIndex < segments.length && !isClosed) {
      while (bufferMap.size >= 8 && !isClosed) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (isClosed || currentIndex >= segments.length) break;

      const idx = currentIndex++;
      const seg = segments[idx];

      const segHeaders = { ...headers };
      if (seg.range) {
        segHeaders["Range"] = seg.range;
      }

      let data = null;
      for (let attempt = 0; attempt < 3 && !isClosed; attempt++) {
        try {
          const sRes = await axios.get(seg.url, {
            headers: segHeaders,
            responseType: "arraybuffer",
            timeout: 20000,
          });
          data = Buffer.from(sRes.data);
          break;
        } catch (err) {
          if (attempt === 2) console.warn(`Segment ${idx} failed after 3 attempts:`, err.message);
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }

      if (data) {
        bufferMap.set(idx, data);
      }

      while (bufferMap.has(nextToWrite) && !isClosed) {
        const chunk = bufferMap.get(nextToWrite);
        bufferMap.delete(nextToWrite);
        if (outputStream.writable) {
          outputStream.write(chunk);
        }
        nextToWrite++;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => downloadWorker());
  await Promise.all(workers);

  while (bufferMap.has(nextToWrite) && !isClosed) {
    const chunk = bufferMap.get(nextToWrite);
    bufferMap.delete(nextToWrite);
    if (outputStream.writable) {
      outputStream.write(chunk);
    }
    nextToWrite++;
  }

  if (!isClosed && outputStream.end) {
    outputStream.end();
  }
}

/**
 * Proxy video/audio/m3u8 stream with full header preservation
 */
async function proxyStream(req, res) {
  const { url, referer, origin, headers: queryHeaders } = req.query;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!url) return res.status(400).send("URL required");

  try {
    let targetUrl = url;
    if (typeof targetUrl === "string" && targetUrl.startsWith("http%3A")) {
      try { targetUrl = decodeURIComponent(targetUrl); } catch (_) {}
    }
    if (/(hubcdn|hubcloud|hubdrive)/i.test(targetUrl)) {
      const direct = await resolveHubCloudDirect(targetUrl);
      if (direct) targetUrl = direct;
    }

    const headers = resolveRequestHeaders(targetUrl, queryHeaders, referer, origin);

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const isM3u8 = targetUrl.includes(".m3u8") || req.query.type === "m3u8";

    if (isM3u8) {
      const response = await axios({
        method: "get",
        url: targetUrl,
        headers,
        responseType: "text",
        timeout: 15000,
        validateStatus: () => true,
      });

      if (response.status >= 400) {
        return res.status(response.status).send(response.data);
      }

      let m3u8Text = response.data;
      const lines = m3u8Text.split("\n");
      const refererParam = headers["Referer"] ? "&referer=" + encodeURIComponent(headers["Referer"]) : "";
      const originParam = headers["Origin"] ? "&origin=" + encodeURIComponent(headers["Origin"]) : "";

      const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          if (trimmed.includes("URI=\"")) {
            return trimmed.replace(/URI=\"([^\"]+)\"/g, (match, uri) => {
              const fullUri = uri.startsWith("http")
                ? uri
                : (uri.startsWith("//") ? "https:" + uri : new URL(uri, targetUrl).href);
              return 'URI="/api/proxy?url=' + encodeURIComponent(fullUri) + refererParam + originParam + '"';
            });
          }
          return line;
        }

        const chunkAbsoluteUrl = trimmed.startsWith("http")
          ? trimmed
          : (trimmed.startsWith("//") ? "https:" + trimmed : new URL(trimmed, targetUrl).href);

        return "/api/proxy?url=" + encodeURIComponent(chunkAbsoluteUrl) + refererParam + originParam;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.status(200).send(rewritten.join("\n"));
    }

    const isHead = req.method === "HEAD";
    const response = await axios({
      method: isHead ? "head" : "get",
      url: targetUrl,
      headers,
      responseType: isHead ? "text" : "stream",
      timeout: 25000,
      validateStatus: (status) => status < 500,
    });

    res.status(response.status);

    if (response.headers["content-type"]) res.set("Content-Type", response.headers["content-type"]);
    if (response.headers["content-length"]) res.set("Content-Length", response.headers["content-length"]);
    if (response.headers["content-range"]) res.set("Content-Range", response.headers["content-range"]);
    if (response.headers["accept-ranges"]) res.set("Accept-Ranges", response.headers["accept-ranges"]);

    if (isHead) {
      return res.end();
    }

    req.on("close", () => {
      if (response.data && !response.data.destroyed) {
        response.data.destroy();
      }
    });

    response.data.on("error", () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });

    response.data.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send("Proxy failed: " + err.message);
    }
  }
}

/**
 * High-speed video downloader supporting both direct streams (MP4/MKV/ZIP)
 * and HLS (.m3u8) streams for ALL extensions.
 */
async function downloadFile(req, res) {
  const { url, filename, headers: queryHeaders, referer, origin, type } = req.query;
  if (!url) return res.status(400).send("URL required");

  try {
    let targetUrl = url;
    if (typeof targetUrl === "string" && targetUrl.startsWith("http%3A")) {
      try { targetUrl = decodeURIComponent(targetUrl); } catch (_) {}
    }
    if (/(hubcdn|hubcloud|hubdrive)/i.test(targetUrl)) {
      const direct = await resolveHubCloudDirect(targetUrl);
      if (direct) targetUrl = direct;
    }

    let requestedName = filename ? decodeURIComponent(filename) : "video.mp4";
    const headers = resolveRequestHeaders(targetUrl, queryHeaders, referer, origin);

    const isExplicitM3u8 = type === "m3u8" || targetUrl.includes(".m3u8");

    if (req.headers.range && !isExplicitM3u8) {
      headers["Range"] = req.headers.range;
    }

    // If HLS (.m3u8), stream/remux all segments
    if (isExplicitM3u8) {
      try {
        await streamHlsDownload(req, res, { targetUrl, headers, filename: requestedName });
        return;
      } catch (hlsErr) {
        console.error("HLS stream download failed:", hlsErr.message);
        if (res.headersSent) return res.end();
        return res.status(500).send("HLS download processing error: " + hlsErr.message);
      }
    }

    // Direct stream (MP4, MKV, ZIP, etc.)
    const response = await axios({
      method: "get",
      url: targetUrl,
      headers,
      responseType: "stream",
      timeout: 35000,
      validateStatus: (status) => status < 400,
    });

    const upstreamDisp = response.headers["content-disposition"] || "";
    const contentType = (response.headers["content-type"] || "").toLowerCase();

    // Check if upstream actually returned an M3U8 content type despite lack of .m3u8 extension
    if (contentType.includes("mpegurl") || contentType.includes("application/x-mpegurl")) {
      try {
        await streamHlsDownload(req, res, { targetUrl, headers, filename: requestedName });
        return;
      } catch (hlsErr) {
        console.error("Upstream HLS stream download failed:", hlsErr.message);
        if (res.headersSent) return res.end();
        return res.status(500).send("HLS download processing error: " + hlsErr.message);
      }
    }

    let upstreamFilename = "";
    const filenameMatch = upstreamDisp.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
    if (filenameMatch && filenameMatch[1]) {
      upstreamFilename = decodeURIComponent(filenameMatch[1].trim());
    }

    const isZip =
      contentType.includes("zip") ||
      upstreamFilename.toLowerCase().endsWith(".zip") ||
      targetUrl.toLowerCase().includes(".zip") ||
      requestedName.toLowerCase().includes(".zip") ||
      requestedName.toLowerCase().includes("pack");

    let finalName = requestedName;
    if (isZip) {
      if (!finalName) {
        finalName = upstreamFilename || "season_pack.zip";
      } else {
        finalName = finalName.replace(/\.(mkv|mp4)$/i, "");
        if (!finalName.toLowerCase().endsWith(".zip")) {
          finalName += ".zip";
        }
      }
    } else {
      if (!finalName) {
        finalName = upstreamFilename || "video.mkv";
      } else if (finalName.toLowerCase().endsWith(".zip")) {
        finalName = finalName.replace(/\.zip$/i, ".mkv");
      }
    }

    if (contentType.includes("text/html") && !targetUrl.includes(".html")) {
      return res.status(400).send("The upstream server returned an HTML webpage instead of a video stream. Please try another mirror.");
    }

    res.status(response.status);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Disposition", `attachment; filename="${finalName}"`);
    res.setHeader(
      "Content-Type",
      isZip ? "application/zip" : (response.headers["content-type"] || "application/octet-stream")
    );

    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    if (response.headers["content-range"]) {
      res.setHeader("Content-Range", response.headers["content-range"]);
    }
    if (response.headers["accept-ranges"]) {
      res.setHeader("Accept-Ranges", response.headers["accept-ranges"]);
    }

    req.on("close", () => {
      if (response.data && !response.data.destroyed) {
        response.data.destroy();
      }
    });

    response.data.on("error", () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });

    response.data.pipe(res);
  } catch (err) {
    console.error("Direct download request failed for", url, err.message);
    if (!res.headersSent) {
      res.status(502).send("Upstream stream download error: " + err.message);
    } else {
      res.end();
    }
  }
}

function getPlaylistM3u(req, res) {
  const { url, title } = req.query;
  if (!url) return res.status(400).send("URL required");

  let targetUrl = decodeURIComponent(url);
  let cleanTitle = (title ? decodeURIComponent(title) : "Cinema Stream").replace(/[\r\n]/g, " ").trim() || "stream";

  let host = "";
  try {
    host = new URL(targetUrl).hostname.toLowerCase();
  } catch (_) {}

  const isMovieBox =
    host.includes("hakunaymatata.com") ||
    host.includes("moviebox") ||
    host.includes("inmoviebox.com");

  const isMxPlayer =
    host.includes("mxplayer") ||
    host.includes("d3sgzbosmwirao.cloudfront.net") ||
    (host.includes("cloudfront.net") && targetUrl.includes("/secim/"));

  let m3u = "#EXTM3U\n";
  m3u += `#EXTINF:-1,${cleanTitle}\n`;
  if (isMovieBox) {
    m3u += "#EXTVLCOPT:http-referrer=https://officialmoviebox.com/\n";
    m3u += "#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n";
  } else if (isMxPlayer) {
    m3u += "#EXTVLCOPT:http-referrer=https://www.mxplayer.in/\n";
    m3u += "#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\n";
  }
  m3u += `${targetUrl}\n`;

  const safeName = cleanTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
  res.setHeader("Content-Type", "application/x-mpegurl; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="${safeName}.m3u"`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  return res.status(200).send(m3u);
}

module.exports = { proxyStream, downloadFile, getPlaylistM3u };
