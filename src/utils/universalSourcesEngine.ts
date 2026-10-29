import { api } from "../api/client";
import { ACTIVE_TELEGRAM_EXTENSIONS } from "../hooks/useProviders";
import type { StreamItem, Post, Provider } from "../types";

export interface NormalizedServerLink {
  id: string;
  serverName: string;
  serverNumber: number;
  quality: "4K" | "1080p" | "720p" | "480p" | "HD";
  size: string | null;
  codec: string;
  url: string;
  provider: string;
  sourceTitle: string;
  isDirect: boolean;
  isTorrent?: boolean;
  languages?: string[];
  isMovieBox?: boolean;
}

export interface UniversalEpisode {
  season: number;
  episode: number;
  title?: string;
  links: NormalizedServerLink[];
}

// Regex to extract clean qualities (including standalone resolution numbers like 480, 720, 1080, 2160)
const QUALITY_REGEX = /\b(4k|2160p?|uhd|1080p?|fhd|720p?|480p?|sd|360p?|hd)\b/i;

// Regex to extract file size (e.g. "1.8 GB", "950 MB", "15.64 GB")
const SIZE_REGEX = /\b(\d+(?:\.\d+)?\s*(?:GB|MB|gb|mb))\b/;

// Codec & Audio tags
const CODEC_TAGS = [
  "HDR10+",
  "HDR10",
  "HDR",
  "DV",
  "Dolby Vision",
  "WEB-DL",
  "WEBRip",
  "BluRay",
  "HEVC",
  "x265",
  "x264",
  "10bit",
  "DDP5.1",
  "DDP2.0",
  "Atmos",
  "AAC",
  "Dual Audio",
  "Multi Audio",
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
];

export function extractQuality(text: string): "4K" | "1080p" | "720p" | "480p" | "HD" {
  if (!text) return "1080p";
  const match = text.match(QUALITY_REGEX);
  if (!match) return "1080p";
  const val = match[1].toLowerCase();
  if (val === "4k" || val === "2160" || val === "2160p" || val === "uhd") return "4K";
  if (val === "1080" || val === "1080p" || val === "fhd") return "1080p";
  if (val === "720" || val === "720p") return "720p";
  if (val === "480" || val === "480p" || val === "360" || val === "360p" || val === "sd") return "480p";
  return "HD";
}

export function extractFileSize(text: string): string | null {
  if (!text) return null;
  const match = text.match(SIZE_REGEX);
  return match ? match[1].toUpperCase() : null;
}

export function extractCodecInfo(text: string): string {
  if (!text) return "";
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const tag of CODEC_TAGS) {
    if (lower.includes(tag.toLowerCase()) && !found.includes(tag)) {
      found.push(tag);
    }
  }
  return found.slice(0, 5).join(" ");
}

export function extractAudioLanguages(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const langs: string[] = [];

  if (lower.includes("dual audio") || lower.includes("dual-audio") || /\bdual\b/.test(lower)) {
    langs.push("Dual Audio");
  }
  if (lower.includes("multi audio") || lower.includes("multi-audio") || /\bmulti\b/.test(lower)) {
    langs.push("Multi Audio");
  }
  if (lower.includes("hindi") || /\bhin\b/.test(lower)) {
    langs.push("Hindi");
  }
  if (lower.includes("english") || /\beng\b/.test(lower)) {
    langs.push("English");
  }
  if (lower.includes("tamil") || /\btam\b/.test(lower)) {
    langs.push("Tamil");
  }
  if (lower.includes("telugu") || /\btel\b/.test(lower)) {
    langs.push("Telugu");
  }
  if (lower.includes("dubbed") || /\bdub\b/.test(lower)) {
    langs.push("Dubbed");
  }

  return langs;
}

/**
 * Deduplication helper: normalizes URLs to avoid showing identical PixelDrain, GoFile, or Cloudflare storage links
 */
export function getLinkDedupeHash(url: string): string {
  if (!url) return "";
  try {
    const clean = url.trim().toLowerCase();
    // Match common file storage paths
    const pixeldrainMatch = clean.match(/pixeldrain\.com\/(?:u|api\/file)\/([a-zA-Z0-9]+)/);
    if (pixeldrainMatch) return `pd_${pixeldrainMatch[1]}`;

    const gofileMatch = clean.match(/gofile\.io\/d\/([a-zA-Z0-9]+)/);
    if (gofileMatch) return `gf_${gofileMatch[1]}`;

    const hubcloudMatch = clean.match(/hubcloud\.[a-z]+\/(?:drive\/)?([a-zA-Z0-9]+)/);
    if (hubcloudMatch) return `hc_${hubcloudMatch[1]}`;

    const directFileMatch = clean.match(/\/([^\/?#]+\.(?:mp4|mkv|m3u8|webm))/);
    if (directFileMatch) return `file_${directFileMatch[1]}`;

    // Fallback: stripped origin + path
    return clean.split("?")[0].replace(/\/+$/, "");
  } catch {
    return url;
  }
}

/**
/**
 * Clean real server title generator: strictly anonymous Server N format
 */
export function getCleanServerName(serverIndex: number, _originalHost?: string, _isMovieBox?: boolean, _providerKey?: string, _realTitle?: string): string {
  return `Server ${serverIndex}`;
}

export function convertLinkListToStreams(linkList: any[]): StreamItem[] {
  const result: StreamItem[] = [];
  if (!Array.isArray(linkList)) return result;

  for (const entry of linkList) {
    const rawDirect = entry.directLinks || [];
    if (Array.isArray(rawDirect) && rawDirect.length > 0) {
      for (const dl of rawDirect) {
        if (dl.link) {
          result.push({
            title: entry.title || dl.title || "Stream",
            name: entry.title || dl.title || "Stream",
            server: entry.title || dl.title || "Stream",
            url: dl.link,
            link: dl.link,
            quality: entry.quality,
          } as StreamItem);
        }
      }
    } else if (entry.link || entry.url) {
      result.push({
        title: entry.title || "Stream",
        name: entry.title || "Stream",
        server: entry.title || "Stream",
        url: entry.link || entry.url,
        link: entry.link || entry.url,
        quality: entry.quality,
      } as StreamItem);
    }
  }
  return result;
}

/**
 * Normalizes raw stream and download items across providers into authentic, informative links
 * Strictly formats display names as "Server 1", "Server 2", etc.
 */
export function normalizeRawLinks(
  rawStreams: StreamItem[],
  providerName: string,
  existingCount = 0
): NormalizedServerLink[] {
  const result: NormalizedServerLink[] = [];
  const seenHashes = new Set<string>();

  let serverCounter = existingCount + 1;
  const isMovieBox = providerName.toLowerCase().includes("moviebox");
  const qualityServerCounters: Record<string, number> = {};

  for (const item of rawStreams) {
    const rawUrl = item.url || (item as any).link || "";
    if (!rawUrl) continue;

    const hash = getLinkDedupeHash(rawUrl);
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);

    const rawItemTitle = item.title || item.name || (item as any).server || "";
    const titleStr = `${rawItemTitle} ${(item as any).quality || ""} ${(item as any).size || ""}`;
    const quality = extractQuality(titleStr);
    const size = (item as any).size || extractFileSize(titleStr);
    const codec = extractCodecInfo(titleStr) || "WEB-DL";
    const languages = extractAudioLanguages(titleStr);

    // Number servers per quality (e.g. 1080p has Server 1: Pixeldrain, Server 2: FastDL, Server 3: GDrive)
    const srvNum = (qualityServerCounters[quality] || 0) + 1;
    qualityServerCounters[quality] = srvNum;
    const cleanDisplayName = `Server ${srvNum}`;

    result.push({
      id: `server-${quality}-${srvNum}-${Math.random().toString(36).slice(2, 7)}`,
      serverName: cleanDisplayName,
      serverNumber: srvNum,
      quality,
      size: size || null,
      codec,
      url: rawUrl,
      provider: isMovieBox ? "MovieBox" : providerName.toLowerCase().includes("hdhub") ? "HDHub4u" : providerName.toLowerCase().includes("4khd") ? "4kHDHub" : providerName,
      sourceTitle: rawItemTitle || `Option ${srvNum}`,
      isDirect: !rawUrl.includes(".html") && !rawUrl.includes("drive.google"),
      isTorrent: rawUrl.startsWith("magnet:") || (item as any).type === "torrent",
      languages,
      isMovieBox,
    });

    serverCounter++;
  }

  return result;
}

/**
 * Prioritized extension groups based on content type
 * STRICT MANDATE: Only fetch from moviebox, hdhub4u, and 4khdhub
 */
export function getPrioritizedProvidersForType(_mediaType?: "movie" | "tv" | "anime"): string[] {
  return [
    "movieBoxWeb",
    "hdhub4u",
    "4khdhub",
  ];
}

/**
 * Universal multi-extension link aggregator
 * STRICT MANDATE: Only fetch from moviebox, hdhub4u, and 4khdhub
 */
export async function aggregateUniversalLinks(
  title: string,
  mediaType: "movie" | "tv" | "anime" = "movie",
  _activeProviders: Provider[] = [],
  onChunk?: (chunk: NormalizedServerLink[]) => void
): Promise<NormalizedServerLink[]> {
  if (!title) return [];
  const cleanTitle = title
    .replace(/\b(1080p|720p|2160p|4k|uhd|hdr|web-dl|webrip|bluray|x264|x265|hevc|aac|dual\s*audio|hindi|english|org|subs?)\b/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[\._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanTitle || cleanTitle.length < 2) return [];

  // Strictly sequenced target providers: HDHub4u first, then MovieBox, then 4kHDHub
  const targetProviders = ["hdhub4u", "movieBoxWeb", "4khdhub"];

  const aggregatedLinks: NormalizedServerLink[] = [];
  const seenHashes = new Set<string>();
  const firstWord = cleanTitle.split(" ")[0].toLowerCase();

  for (const provKey of targetProviders) {
    try {
      const posts = await api.searchPosts(provKey, cleanTitle, 1);
      if (!posts || posts.length === 0) continue;

      const matchingPost = posts.find((p) => {
        if (!p || !p.title) return false;
        const pLower = p.title.toLowerCase();
        return pLower.includes(firstWord) || pLower.includes(cleanTitle.toLowerCase());
      }) || (posts[0]?.title?.toLowerCase().includes(firstWord) ? posts[0] : null);

      if (!matchingPost || !matchingPost.link) continue;

      const allRawStreams: StreamItem[] = [];

      // 1. Fetch direct streams
      try {
        const directStreams = await api.getStreams(provKey, matchingPost.link, mediaType === "tv" ? "tv" : "movie");
        if (directStreams && directStreams.length > 0) {
          allRawStreams.push(...directStreams);
        }
      } catch (_) {}

      // 2. Fetch meta.linkList
      try {
        const meta = await api.getMeta(provKey, matchingPost.link);
        if (meta && (meta as any).linkList && Array.isArray((meta as any).linkList)) {
          const listStreams = convertLinkListToStreams((meta as any).linkList);
          if (listStreams.length > 0) {
            allRawStreams.push(...listStreams);
          }
        }
      } catch (_) {}

      if (allRawStreams.length > 0) {
        const normalized = normalizeRawLinks(allRawStreams, provKey, aggregatedLinks.length);
        const newChunk: NormalizedServerLink[] = [];
        for (const item of normalized) {
          const hash = getLinkDedupeHash(item.url);
          if (!seenHashes.has(hash)) {
            seenHashes.add(hash);
            aggregatedLinks.push(item);
            newChunk.push(item);
          }
        }

        // Live progressive callback as soon as each provider finishes!
        if (newChunk.length > 0 && onChunk) {
          onChunk(newChunk);
        }
      }
    } catch {
      // Continue to next provider in sequence
    }
  }

  return aggregatedLinks;
}
