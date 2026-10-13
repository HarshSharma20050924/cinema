import { appCache } from "../utils/cache";
import type { Provider, CatalogFilter, CatalogData, Post, MediaDetails, StreamItem } from "../types";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const TTL = {
  PROVIDERS: 30 * 60 * 1000,
  CATALOG: 15 * 60 * 1000,
  POSTS: 5 * 60 * 1000,
  SEARCH: 3 * 60 * 1000,
  META: 10 * 60 * 1000,
  STREAMS: 3 * 60 * 1000,
};

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal || controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  async getProviders(forceRefresh = false): Promise<Provider[]> {
    const cacheKey = "api:providers";
    if (!forceRefresh) {
      const cached = appCache.get<Provider[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/providers`);
    if (!res.ok) throw new Error("Failed to load providers");
    const data: Provider[] = await res.json();
    const filtered = data.filter((p) => !p.disabled);
    appCache.set(cacheKey, filtered, TTL.PROVIDERS);
    return filtered;
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
};
