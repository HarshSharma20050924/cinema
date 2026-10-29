import type { NavigationState } from "./navigationState";

export function cleanSearchQuery(raw: string): string {
  if (!raw) return "";
  const clean = raw
    .replace(/^\s*#?\s*\d+\s*[\.\:\-\)]+\s*/, "") // remove ranking numbers like "1. ", "250. ", "#1 - " but keep titles like "12 Angry Men", "3 Idiots", "1917"
    .replace(/\(.*?\)/g, "") // remove parenthesized content like (1972), (2026)
    .replace(/\[.*?\]/g, "") // remove brackets like [1080p], [Dual Audio]
    .replace(/\b(19\d{2}|20\d{2})\b/g, "") // remove standalone years
    .replace(
      /\b(480p|720p|1080p|2160p|4k|hd|web-dl|webrip|bluray|brrip|bdrip|hdrip|dvdrip|x264|x265|hevc|hq|hdtc|cam|camrip|predvd|pre-dvd|v2|untouched|dual audio|multi audio|hindi|english|tamil|telugu|clean|uncut|extended|complete|season\s*\d+|s\d+|episode\s*\d+|e\d+)\b/gi,
      ""
    )
    .replace(/[-_.:|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean || raw.trim();
}

export function getInitialRouteState(saved: NavigationState | null) {
  if (typeof window === "undefined") {
    return {
      tab: "home" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get("q") || urlParams.get("search") || urlParams.get("query");
  const isGlobal = urlParams.get("global") === "1";
  const filter = urlParams.get("filter");
  const title = urlParams.get("title");
  const niche = urlParams.get("niche");
  const pageNum = parseInt(urlParams.get("page") || "1", 10);

  // 1. Search Query parameter ALWAYS takes highest priority over tabs
  if (q) {
    return {
      tab: "home" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: q,
      isGlobalSearch: isGlobal || saved?.isGlobalSearch || false,
      nicheId: niche || saved?.selectedNicheId || null,
      page: !isNaN(pageNum) && pageNum > 0 ? pageNum : (saved?.page || 1),
    };
  }

  let tab = urlParams.get("tab");
  if (!tab && window.location.hash) {
    const rawHash = window.location.hash.toLowerCase();
    if (!rawHash.includes("person") && !rawHash.startsWith("#!/") && !rawHash.startsWith("#/")) {
      const hash = rawHash.replace(/^#\/?/, "");
      if (hash) tab = hash;
    }
  }
  if (!tab && saved?.activeCustomPage) {
    tab = saved.activeCustomPage;
  }
  if (!tab && saved?.activeNavTab) {
    tab = saved.activeNavTab;
  }

  if (tab === "top250" || tab === "rankings") {
    return {
      tab: "rankings" as const,
      customPage: "rankings" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "letterboxd") {
    return {
      tab: "letterboxd" as const,
      customPage: "letterboxd" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "imdb") {
    return {
      tab: "imdb" as const,
      customPage: "imdb" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "downloads" || tab === "download") {
    return {
      tab: "downloads" as const,
      customPage: "downloads" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "terms") {
    return {
      tab: "terms" as const,
      customPage: "terms" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "privacy") {
    return {
      tab: "privacy" as const,
      customPage: "privacy" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "disclaimer") {
    return {
      tab: "disclaimer" as const,
      customPage: "disclaimer" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "coming-soon" || tab === "comingsoon" || tab === "upcoming") {
    return {
      tab: "coming-soon" as const,
      customPage: null,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "categories") {
    return {
      tab: "categories" as const,
      customPage: null,
      isBrowsingCategories: true,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "movies") {
    return {
      tab: "movies" as const,
      isBrowsingCategories: false,
      viewAllCategory: title ? { filter: filter || "", title } : null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: niche || null,
      page: !isNaN(pageNum) && pageNum > 0 ? pageNum : 1,
    };
  }

  if (tab === "tv") {
    return {
      tab: "tv" as const,
      isBrowsingCategories: false,
      viewAllCategory: title ? { filter: filter || "", title } : null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: niche || null,
      page: !isNaN(pageNum) && pageNum > 0 ? pageNum : 1,
    };
  }

  if (tab === "anime") {
    return {
      tab: "anime" as const,
      isBrowsingCategories: false,
      viewAllCategory: title ? { filter: filter || "", title } : null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: niche || null,
      page: !isNaN(pageNum) && pageNum > 0 ? pageNum : 1,
    };
  }

  if (tab === "watchlist" || tab === "mylist") {
    return {
      tab: "watchlist" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  return {
    tab: "home" as const,
    isBrowsingCategories: false,
    viewAllCategory: null,
    searchQuery: "",
    isGlobalSearch: false,
    nicheId: null,
    page: 1,
  };
}
