export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function computeEstimatedEndTime(remainingSeconds: number): string {
  if (isNaN(remainingSeconds) || remainingSeconds <= 0) return "";
  const endDate = new Date(Date.now() + remainingSeconds * 1000);
  let hours = endDate.getHours();
  const minutes = endDate.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `Ends ${hours}:${minutes} ${ampm}`;
}

export const cleanAudioName = (raw: string): string => {
  if (!raw) return "Original Audio";
  let cleaned = raw
    .replace(/\s*·\s*Season\s*\d+/gi, "")
    .replace(/\s*-\s*Season\s*\d+/gi, "")
    .replace(/\s*Season\s*\d+/gi, "")
    .replace(/\b(dub|dubbed|dubbing)\b/gi, "")
    .replace(/[^a-zA-Z0-9\s()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.toLowerCase() === "dub") return "Original Audio";
  return cleaned;
};

export function isStrictTitleMatch(candidateTitle: string, queryTitle: string, expectedYear?: number | string): boolean {
  if (!candidateTitle || !queryTitle) return false;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\[.*?\]|\(.*?\)/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const stopWords = new Set([
    "the", "a", "an", "of", "and", "in", "to", "movie", "full", "hindi", "dubbed",
    "dual", "audio", "season", "episode", "part", "hd", "hq", "org", "web", "dl", "rip"
  ]);

  const cleanCand = normalize(candidateTitle);
  const cleanQuery = normalize(queryTitle);

  if (cleanCand === cleanQuery) return true;

  const queryTokens = cleanQuery.split(" ").filter((t) => t.length > 1 && !stopWords.has(t));
  const candTokens = cleanCand.split(" ").filter((t) => t.length > 1 && !stopWords.has(t));

  if (queryTokens.length === 0) return cleanCand.includes(cleanQuery);

  const allMatched = queryTokens.every((token) => candTokens.includes(token));
  if (!allMatched) return false;

  const extraCandTokens = candTokens.filter((t) => !queryTokens.includes(t) && isNaN(Number(t)));
  if (extraCandTokens.length >= 2 && queryTokens.length <= 2) {
    return false;
  }

  const candYearMatch = candidateTitle.match(/\b(19\d\d|20\d\d)\b/);
  if (candYearMatch && expectedYear) {
    const candYear = parseInt(candYearMatch[1], 10);
    const expYear = typeof expectedYear === "number" ? expectedYear : parseInt(String(expectedYear), 10);
    if (!isNaN(candYear) && !isNaN(expYear)) {
      if (Math.abs(candYear - expYear) > 1) {
        return false;
      }
    }
  }

  return true;
}
