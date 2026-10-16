/**
 * Utility helpers for Season and Dub extraction across providers and extensions.
 */

export interface SeasonDisplayInfo {
  dub: string;
  seasonNum: number;
  seasonTitle: string;
  formattedLabel: string;
  epsCount: number;
}

export function getSeasonDisplayInfo(season: any, fallbackIdx: number = 0): SeasonDisplayInfo {
  if (!season) {
    return {
      dub: "",
      seasonNum: fallbackIdx + 1,
      seasonTitle: `Season ${fallbackIdx + 1}`,
      formattedLabel: `Season ${fallbackIdx + 1}`,
      epsCount: 0,
    };
  }

  let dub = "";
  const rawTitle = (typeof season.title === "string" ? season.title : "").trim();

  // 1. Direct dub or language property on the season object
  if (typeof season.dub === "string" && season.dub.trim()) {
    dub = season.dub.trim();
  } else if (typeof season.language === "string" && season.language.trim()) {
    dub = season.language.trim();
  }

  // 2. Parse JSON episode payload if available (e.g. MovieBoxWeb JSON: {"language":"Hindi dub",...})
  if (!dub && Array.isArray(season.directLinks) && season.directLinks.length > 0) {
    for (const ep of season.directLinks) {
      const linkStr = ep?.link;
      if (typeof linkStr === "string" && linkStr.startsWith("{")) {
        try {
          const parsed = JSON.parse(linkStr);
          if (parsed.language && typeof parsed.language === "string" && parsed.language.trim()) {
            dub = parsed.language.trim();
            break;
          }
          if (parsed.dub && typeof parsed.dub === "string" && parsed.dub.trim()) {
            dub = parsed.dub.trim();
            break;
          }
        } catch (_) {}
      }
    }
  }

  // 3. Extract dub from title if delimited by "·" or " - " or brackets
  let cleanSeasonTitle = rawTitle;
  if (rawTitle.includes("·")) {
    const parts = rawTitle.split("·").map((p: string) => p.trim());
    if (parts.length >= 2) {
      if (!dub) dub = parts[0];
      cleanSeasonTitle = parts.slice(1).join(" · ").trim();
    }
  } else if (rawTitle.includes(" - ") && /dub|sub|audio|hindi|english|tamil|telugu|jap/i.test(rawTitle)) {
    const parts = rawTitle.split(" - ").map((p: string) => p.trim());
    if (/dub|sub|audio|hindi|english|tamil|telugu|jap/i.test(parts[0])) {
      if (!dub) dub = parts[0];
      cleanSeasonTitle = parts.slice(1).join(" - ").trim();
    }
  } else {
    const bracketMatch = rawTitle.match(/\[(.*?)\]|\((.*?)\)/);
    if (bracketMatch) {
      const candidate = (bracketMatch[1] || bracketMatch[2]).trim();
      if (/dub|sub|audio|hindi|english|tamil|telugu|jap|dual/i.test(candidate)) {
        if (!dub) dub = candidate;
        cleanSeasonTitle = rawTitle.replace(bracketMatch[0], "").trim();
      }
    }
  }

  // 4. Resolve season number
  let seasonNum = typeof season.season === "number" && season.season > 0 ? season.season : 0;
  if (!seasonNum) {
    const sMatch = cleanSeasonTitle.match(/\b(?:season\s*|s0*)(\d+)\b/i) || rawTitle.match(/\b(?:season\s*|s0*)(\d+)\b/i);
    if (sMatch) {
      seasonNum = parseInt(sMatch[1], 10);
    } else {
      seasonNum = fallbackIdx + 1;
    }
  }

  // Fallback for cleanSeasonTitle
  if (!cleanSeasonTitle || (dub && cleanSeasonTitle.toLowerCase() === dub.toLowerCase())) {
    cleanSeasonTitle = `Season ${seasonNum}`;
  }

  // If cleanSeasonTitle does not explicitly mention "Season", prefix it
  if (!/\b(?:season\s*|s\d+)\b/i.test(cleanSeasonTitle)) {
    cleanSeasonTitle = `Season ${seasonNum} - ${cleanSeasonTitle}`;
  }

  const epsCount = Array.isArray(season.directLinks) ? season.directLinks.length : 0;
  const epsLabel = epsCount > 0 ? ` (${epsCount} Eps)` : "";

  // Title-case dub name (e.g. "hindi dub" -> "Hindi Dub")
  const prettyDub = dub
    ? dub
        .split(/\s+/)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "";

  const formattedLabel = prettyDub
    ? `[${prettyDub}] ${cleanSeasonTitle}${epsLabel}`
    : `${cleanSeasonTitle}${epsLabel}`;

  return {
    dub: prettyDub,
    seasonNum,
    seasonTitle: cleanSeasonTitle,
    formattedLabel,
    epsCount,
  };
}
