import { appCache } from "../utils/cache";
import type { Provider, CatalogFilter, CatalogData, Post, MediaDetails, StreamItem } from "../types";

export function getBackendUrl(): string {
  const envUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
  if (envUrl) return envUrl;

  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocalhost) {
      // In local development, always use relative path so Vite proxy forwards to local backend (port 3001)
      return "";
    }

    const isCapacitor =
      Boolean((window as any).Capacitor) ||
      window.location.protocol === "capacitor:" ||
      window.location.protocol === "file:";
    if (isCapacitor) {
      return "https://cinema-dwh.pages.dev";
    }
  }
  return "";
}

const BACKEND_URL = getBackendUrl();

const TTL = {
  PROVIDERS: 5 * 1000,
  CATALOG: 15 * 60 * 1000,
  POSTS: 5 * 60 * 1000,
  SEARCH: 3 * 60 * 1000,
  META: 10 * 60 * 1000,
  STREAMS: 3 * 60 * 1000,
};

export const RENDER_CLUSTER = [
  "https://cinema-4h7t.onrender.com",
  "https://cinema-1-zjrx.onrender.com",
  "https://cinema-2-mg14.onrender.com",
  "https://cinema-3-euoh.onrender.com",
  "https://cinema-4-260y.onrender.com",
];

let clusterIndex = Math.floor(Math.random() * RENDER_CLUSTER.length);

export function getBalancedRenderCluster(): string[] {
  const start = clusterIndex % RENDER_CLUSTER.length;
  clusterIndex++;
  return [...RENDER_CLUSTER.slice(start), ...RENDER_CLUSTER.slice(0, start)];
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal || controller.signal,
    });
    if (res.ok) return res;
    if (res.status >= 500 || res.status === 429) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res;
  } catch (primaryErr) {
    clearTimeout(timer);

    // Failover across the 5 distributed Render cluster nodes for the web page
    const isApiPath = url.includes("/api/");
    if (isApiPath) {
      const apiSuffix = url.substring(url.indexOf("/api/"));
      const clusterNodes = getBalancedRenderCluster();
      for (const node of clusterNodes) {
        try {
          const clusterUrl = `${node}${apiSuffix}`;
          const cController = new AbortController();
          const cTimer = setTimeout(() => cController.abort(), 7000);
          const cRes = await fetch(clusterUrl, {
            ...init,
            signal: cController.signal,
          });
          clearTimeout(cTimer);
          if (cRes.ok) return cRes;
        } catch (_) {}
      }
    }
    throw primaryErr;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  async getProviders(_forceRefresh = true): Promise<Provider[]> {
    const cacheKey = "api:providers";
    try {
      const res = await fetchWithTimeout(`${BACKEND_URL}/api/providers?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      }, 8000);
      if (!res.ok) throw new Error("Failed to load providers");
      const data: Provider[] = await res.json();
      const active = data.filter((p) => !p.disabled);
      appCache.set(cacheKey, active, TTL.PROVIDERS);
      return active;
    } catch (err) {
      const cached = appCache.get<Provider[]>(cacheKey);
      if (cached && cached.length > 0) {
        return cached;
      }
      throw err;
    }
  },

  async getCatalog(provider: string, forceRefresh = false): Promise<CatalogData> {
    const cacheKey = `api:catalog:${provider}`;
    if (!forceRefresh) {
      const cached = appCache.get<CatalogData>(cacheKey);
      if (cached && (cached.catalog?.length > 0 || cached.all?.length > 0)) return cached;
    }
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/catalog?provider=${encodeURIComponent(provider)}`);
    if (!res.ok) throw new Error("Failed to load catalog");
    const data = await res.json();
    const rawCatalog: CatalogFilter[] = data.catalog || [];
    const rawGenres: CatalogFilter[] = data.genres || [];

    const sanitize = (list: CatalogFilter[]) => {
      const result: CatalogFilter[] = [];
      const seen = new Set<string>();
      for (const item of list) {
        const title = (item.title || "").trim();
        const filter = (item.filter || "").trim();
        const key = `${title.toLowerCase()}:${filter.toLowerCase()}`;
        if (title && !seen.has(key)) {
          seen.add(key);
          result.push({ title, filter });
        }
      }
      return result;
    };

    const catalogClean = sanitize(rawCatalog);
    const genresClean = sanitize(rawGenres);
    const allClean = sanitize([...rawCatalog, ...rawGenres]);

    const result: CatalogData = {
      catalog: catalogClean,
      genres: genresClean,
      all: allClean,
    };

    appCache.set(cacheKey, result, TTL.CATALOG);
    return result;
  },

  async getPosts(provider: string, filter: string, page = 1, forceRefresh = false): Promise<Post[]> {
    const cacheKey = `api:posts:${provider}:${filter || "default"}:p${page}`;
    if (!forceRefresh) {
      const cached = appCache.get<Post[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/api/posts?provider=${encodeURIComponent(provider)}&filter=${encodeURIComponent(filter)}&page=${page}`
    );
    if (!res.ok) throw new Error("Failed to load posts");
    const list: Post[] = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      appCache.set(cacheKey, list, TTL.POSTS);
    }
    return list;
  },

  async searchPosts(provider: string, query: string, page = 1, forceRefresh = false): Promise<Post[]> {
    const normQ = query.trim().toLowerCase();
    const cacheKey = `api:search:${provider}:${normQ}:p${page}`;
    if (!forceRefresh) {
      const cached = appCache.get<Post[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/api/search?provider=${encodeURIComponent(provider)}&query=${encodeURIComponent(query)}&q=${encodeURIComponent(query)}&page=${page}`
    );
    if (!res.ok) throw new Error("Failed to search posts");
    const list: Post[] = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      appCache.set(cacheKey, list, TTL.SEARCH);
    }
    return list;
  },

  async globalSearch(query: string, providers: string[] = [], page = 1, forceRefresh = false): Promise<Post[]> {
    const normQ = query.trim().toLowerCase();
    const sortedProviders = [...providers].sort().join(",");
    const cacheKey = `api:globalSearch:${normQ}:${sortedProviders || "all"}:p${page}`;
    if (!forceRefresh) {
      const cached = appCache.get<Post[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }
    const providerList = providers.join(",");
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/api/search/global?q=${encodeURIComponent(query)}&providers=${encodeURIComponent(providerList)}&page=${page}`
    );
    if (!res.ok) throw new Error("Failed to search globally");
    const list: Post[] = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      appCache.set(cacheKey, list, TTL.SEARCH);
    }
    return list;
  },

  async getMeta(provider: string, link: string, forceRefresh = false): Promise<MediaDetails> {
    const cacheKey = `api:meta:${provider}:${link}`;
    if (!forceRefresh) {
      const cached = appCache.get<MediaDetails>(cacheKey);
      if (cached) return cached;
    }
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/api/meta?provider=${encodeURIComponent(provider)}&link=${encodeURIComponent(link)}`
    );
    if (!res.ok) throw new Error("Failed to load media meta");
    const data: MediaDetails = await res.json();
    if (data && (data.title || data.linkList?.length)) {
      appCache.set(cacheKey, data, TTL.META);
    }
    return data;
  },

  async getStreams(provider: string, link: string, type = "movie", isDownload = false, forceRefresh = false): Promise<StreamItem[]> {
    const cacheKey = `api:streams:${provider}:${link}:${type}:dl${isDownload}`;
    if (!forceRefresh) {
      const cached = appCache.get<StreamItem[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }
    try {
      const res = await fetchWithTimeout(
        `${BACKEND_URL}/api/streams?provider=${encodeURIComponent(provider)}&link=${encodeURIComponent(link)}&type=${encodeURIComponent(type)}&download=${isDownload}`
      );
      if (!res.ok) return [];
      const list: StreamItem[] = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        appCache.set(cacheKey, list, TTL.STREAMS);
        return list;
      }
      return [];
    } catch {
      return [];
    }
  },

  async getEpisodes(provider: string, url: string, forceRefresh = false): Promise<any[]> {
    const cacheKey = `api:episodes:${provider}:${url}`;
    if (!forceRefresh) {
      const cached = appCache.get<any[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }
    try {
      const res = await fetchWithTimeout(
        `${BACKEND_URL}/api/episodes?provider=${encodeURIComponent(provider)}&url=${encodeURIComponent(url)}`
      );
      if (!res.ok) return [];
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        appCache.set(cacheKey, list, TTL.META);
        return list;
      }
      return [];
    } catch {
      return [];
    }
  },

  async getRatings(imdbId?: string, title?: string): Promise<{ letterboxdRating: string | null; letterboxdUrl: string | null }> {
    if (!imdbId && !title) return { letterboxdRating: null, letterboxdUrl: null };
    const cacheKey = `api:ratings:${imdbId || title}`;
    const cached = appCache.get<{ letterboxdRating: string | null; letterboxdUrl: string | null }>(cacheKey);
    if (cached) return cached;
    try {
      const q = imdbId ? `imdbId=${encodeURIComponent(imdbId)}` : `title=${encodeURIComponent(title || "")}`;
      const res = await fetchWithTimeout(`${BACKEND_URL}/api/ratings?${q}`);
      if (!res.ok) return { letterboxdRating: null, letterboxdUrl: null };
      const data = await res.json();
      if (data && data.letterboxdRating) {
        appCache.set(cacheKey, data, 24 * 60 * 60 * 1000);
      }
      return data;
    } catch {
      return { letterboxdRating: null, letterboxdUrl: null };
    }
  },

  async search(provider: string, query: string, page = 1, forceRefresh = false): Promise<Post[]> {
    return this.searchPosts(provider, query, page, forceRefresh);
  },

  async getLetterboxdFilms(params: {
    decade?: string;
    genre?: string;
    sort?: string;
    page?: number;
    search?: string;
    list?: string;
  }): Promise<any[]> {
    const { decade = "all", genre = "all", sort = "rating-highest", page = 1, search = "", list = "" } = params;
    const cleanSearch = (search || "").trim();
    const cleanList = (list || "").trim();
    const cacheKey = cleanList
      ? `api:letterboxd:list:${cleanList}:p${page}`
      : cleanSearch
      ? `api:letterboxd:search:${cleanSearch.toLowerCase()}:p${page}`
      : `api:letterboxd:${decade}:${genre}:${sort}:p${page}`;
    const cached = appCache.get<any[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const qParams: Record<string, string> = {
        decade,
        genre,
        sort,
        page: String(page),
      };
      if (cleanSearch) qParams.search = cleanSearch;
      if (cleanList) qParams.list = cleanList;

      const q = new URLSearchParams(qParams).toString();
      const res = await fetchWithTimeout(`${BACKEND_URL}/api/letterboxd?${q}`);
      if (!res.ok) return [];
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        appCache.set(cacheKey, list, 15 * 60 * 1000);
        return list;
      }
      return [];
    } catch {
      return [];
    }
  },

  async getImdbFilms(params: {
    decade?: string;
    genre?: string;
    sort?: string;
    page?: number;
    search?: string;
  }): Promise<any[]> {
    const { decade = "all", genre = "all", sort = "highest", page = 1, search = "" } = params;
    const cleanSearch = (search || "").trim();
    const cacheKey = cleanSearch
      ? `api:imdb:search:${cleanSearch.toLowerCase()}:p${page}`
      : `api:imdb:${decade}:${genre}:${sort}:p${page}`;
    const cached = appCache.get<any[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const qParams: Record<string, string> = {
        decade,
        genre,
        sort,
        page: String(page),
      };
      if (cleanSearch) qParams.search = cleanSearch;

      const q = new URLSearchParams(qParams).toString();
      const res = await fetchWithTimeout(`${BACKEND_URL}/api/imdb/films?${q}`);
      if (!res.ok) return [];
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        appCache.set(cacheKey, list, 15 * 60 * 1000);
        return list;
      }
      return [];
    } catch {
      return [];
    }
  },
};
