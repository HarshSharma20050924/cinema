export const isValidStreamUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  if (trimmed.includes("skydrop.live") || trimmed.includes("magiclinks.lol/series")) return false;
  if (trimmed.includes("t.me/") || trimmed.includes("telegram")) return false;
  return /^(https?|magnet):/i.test(trimmed) || trimmed.startsWith("/api/");
};

export const isDirectMediaUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!isValidStreamUrl(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  return (
    lower.includes("cloudflarestorage.com") ||
    lower.includes("pixeldrain.dev") ||
    lower.includes("pixeldrain.com") ||
    lower.includes("googleusercontent.com") ||
    lower.includes("storage.googleapis.com") ||
    lower.includes("r2.dev") ||
    lower.includes("workers.dev") ||
    lower.includes(".buzz") ||
    lower.includes("cdn.") ||
    lower.includes("fuckingfast.net") ||
    lower.includes("fastdl") ||
    lower.includes("gofile.io") ||
    lower.includes("moviebox") ||
    lower.includes("hakunaymatata") ||
    lower.includes("aoneroom") ||
    lower.startsWith("magnet:") ||
    lower.includes("/api/stream/torrent") ||
    lower.includes("/api/torrent/download") ||
    /\.(mkv|mp4|webm|avi|m3u8|ts)(\?|$)/i.test(lower)
  );
};

export const isLandingPageUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;
  if (isDirectMediaUrl(url)) return false;

  let host = "";
  let pathname = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    pathname = u.pathname.toLowerCase();
  } catch {
    host = url.toLowerCase();
  }

  const isIntermediateHoster =
    host.includes("links.ol-am.top") ||
    host.includes("links.olamovies") ||
    host.includes("ol-am.top") ||
    host.includes("greenmotors") ||
    host.includes("hubdrive") ||
    host.includes("hubcloud") ||
    host.includes("vcloud") ||
    host.includes("gamerxyt") ||
    host.includes("kmhd") ||
    host.includes("kmphotos") ||
    host.includes("katdrive") ||
    host.includes("gdflix") ||
    host.includes("send.cm") ||
    host.includes("1fichier") ||
    host.includes("4khdhub") ||
    host.includes("hdhub4u");

  if (isIntermediateHoster) return true;

  if (pathname.endsWith(".html") || pathname.endsWith(".htm") || pathname.includes("/archives/")) {
    return true;
  }

  return false;
};
