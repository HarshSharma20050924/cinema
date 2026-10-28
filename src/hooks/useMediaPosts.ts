import { useState, useEffect } from "react";
import { api } from "../api/client";
import { appCache } from "../utils/cache";
import { getProviderDisplayName } from "../utils/providerNames";
import type { Post } from "../types";

const PRIORITY_PROVIDERS = [
  "hdhub4u",
  "movieBoxWeb",
  "4khdhub",
];

export function useMediaPosts(
  providerValue?: string,
  filter = "",
  searchQuery = "",
  page = 1,
  isGlobalSearch = false,
  installedProviders: string[] = [],
  availableProviders: Array<{ name: string; value: string }> = []
) {
  const nameMap = new Map<string, string>();
  availableProviders.forEach((p) => {
    nameMap.set(p.value.toLowerCase(), p.name);
  });

  const getCachedPosts = (): Post[] => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      if (isGlobalSearch) {
        const sorted = [...installedProviders].sort().join(",");
        return appCache.get<Post[]>(`api:globalSearch:${q}:${sorted || "all"}:p${page}`) || [];
      } else if (providerValue) {
        return appCache.get<Post[]>(`api:search:${providerValue}:${q}:p${page}`) || [];
      }
    } else if (providerValue) {
      return appCache.get<Post[]>(`api:posts:${providerValue}:${filter || "default"}:p${page}`) || [];
    }
    return [];
  };

  const [posts, setPosts] = useState<Post[]>(getCachedPosts);
  const [loading, setLoading] = useState<boolean>(() => getCachedPosts().length === 0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const activeTimers: ReturnType<typeof setTimeout>[] = [];

    // Check instant cache first
    const cached = getCachedPosts();
    if (cached.length > 0) {
      setPosts(cached);
      setLoading(false);
      setIsStreaming(false);
    } else {
      setLoading(true);
      setIsStreaming(true);
      setPosts([]);
    }

    // Robust post deduplication key (normalizes trailing/leading slashes and falls back to clean title)
    const getPostKey = (item: Post) => {
      if (!item) return "";
      const rawLink = (item.link || "").trim().replace(/^\/+|\/+$/g, "");
      if (rawLink) return rawLink.toLowerCase();
      return (item.title || "").trim().toLowerCase();
    };

    // Progressive append helper that updates UI and unblocks spinner
    const appendPosts = (newBatch: Post[]) => {
      if (!mounted || newBatch.length === 0) return;
      setPosts((current) => {
        const seen = new Set(current.map(getPostKey).filter(Boolean));
        const unique = newBatch.filter((item) => {
          const k = getPostKey(item);
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        if (unique.length === 0) return current;
        return [...current, ...unique];
      });
      setLoading(false);
    };

    // 🌊 CONTINUOUS CHUNK WATERFALL: 1-3 items instant, then streams 3-by-3 all the way down
    const streamWaterfall = (
      items: Post[],
      chunkSize = 3,
      intervalMs = 45,
      onComplete?: () => void
    ) => {
      if (!mounted || items.length === 0) {
        if (onComplete) onComplete();
        return;
      }

      // 1. Initial 1-3 items show INSTANTLY (0ms sync)
      appendPosts(items.slice(0, chunkSize));

      if (items.length <= chunkSize) {
        if (onComplete) onComplete();
        return;
      }

      // 2. Stream remaining items in 3-by-3 chunks progressively downward
      let offset = chunkSize;
      const step = () => {
        if (!mounted) return;
        if (offset >= items.length) {
          if (onComplete) onComplete();
          return;
        }

        const nextBatch = items.slice(offset, offset + chunkSize);
        offset += chunkSize;
        appendPosts(nextBatch);

        if (offset < items.length) {
          const t = setTimeout(step, intervalMs);
          activeTimers.push(t);
        } else if (onComplete) {
          onComplete();
        }
      };

      const t = setTimeout(step, intervalMs);
      activeTimers.push(t);
    };

    async function loadPosts() {
      const q = searchQuery.trim();
      if (q) {
        setError(null);
        try {
          if (isGlobalSearch) {
            // ULTRA-FAST ASYNC WORKER POOL STREAMING
            const baseProviders =
              installedProviders.length > 0
                ? installedProviders
                : ["hdhub4u", "movieBoxWeb", "4khdhub"];

            const sortedProviders = [...new Set(baseProviders)].sort((a, b) => {
              const aIdx = PRIORITY_PROVIDERS.indexOf(a.toLowerCase());
              const bIdx = PRIORITY_PROVIDERS.indexOf(b.toLowerCase());
              if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
              if (aIdx !== -1) return -1;
              if (bIdx !== -1) return 1;
              return 0;
            });

            setIsStreaming(true);
            const collectedItems: Post[] = [];

            // Dynamic Worker Pool with concurrency of 4
            const CONCURRENCY = 4;
            let activeCount = 0;
            let index = 0;

            await new Promise<void>((resolve) => {
              const next = () => {
                if (!mounted) return resolve();
                if (index >= sortedProviders.length && activeCount === 0) {
                  return resolve();
                }

                while (activeCount < CONCURRENCY && index < sortedProviders.length) {
                  const providerKey = sortedProviders[index++];
                  activeCount++;

                  api
                    .searchPosts(providerKey, q, page)
                    .then((res) => {
                      if (mounted && Array.isArray(res) && res.length > 0) {
                        const pDisplayName =
                          nameMap.get(providerKey.toLowerCase()) ||
                          getProviderDisplayName(providerKey);

                        const tagged = res.map((item) => ({
                          ...item,
                          provider: item.provider || providerKey,
                          providerName: item.providerName || pDisplayName,
                        }));

                        collectedItems.push(...tagged);

                        // 🌊 Stream in 3-by-3 chunks progressively all the way down
                        streamWaterfall(tagged, 3, 40);
                      }
                    })
                    .catch(() => {})
                    .finally(() => {
                      activeCount--;
                      next();
                    });
                }
              };
              next();
            });

            if (mounted) {
              setLoading(false);
              setIsStreaming(false);
              if (collectedItems.length > 0) {
                const sortedKey = [...installedProviders].sort().join(",");
                appCache.set(
                  `api:globalSearch:${q.toLowerCase()}:${sortedKey || "all"}:p${page}`,
                  collectedItems,
                  10 * 60 * 1000
                );
              }
            }
            return;
          } else if (providerValue) {
            // ULTRA-FAST SINGLE EXTENSION SEARCH WITH CONTINUOUS DOWNWARD CHUNKING
            setIsStreaming(true);
            const pDisplayName =
              nameMap.get(providerValue.toLowerCase()) ||
              getProviderDisplayName(providerValue);

            api
              .searchPosts(providerValue, q, page)
              .then((res) => {
                if (mounted) {
                  if (Array.isArray(res) && res.length > 0) {
                    const tagged = res.map((item) => ({
                      ...item,
                      provider: item.provider || providerValue,
                      providerName: item.providerName || pDisplayName,
                    }));

                    // If posts are already showing from instant cache, update directly without duplicate appending
                    if (cached.length > 0) {
                      setPosts(tagged);
                      setLoading(false);
                      setIsStreaming(false);
                      return;
                    }

                    // 🌊 Stream in 3-by-3 chunks progressively all the way down
                    streamWaterfall(tagged, 3, 40, () => {
                      if (mounted) {
                        setLoading(false);
                        setIsStreaming(false);
                      }
                    });
                  } else {
                    setPosts([]);
                    setLoading(false);
                    setIsStreaming(false);
                  }
                }
              })
              .catch((err) => {
                if (mounted) {
                  console.warn("Single search failed:", err);
                  setPosts([]);
                  setLoading(false);
                  setIsStreaming(false);
                }
              })
              .finally(() => {
                if (mounted) {
                  setLoading(false);
                  setIsStreaming(false);
                }
              });
            return;
          }
        } catch (err: any) {
          if (mounted) {
            setError(err.message || "Search failed");
            if (cached.length === 0) setPosts([]);
            setLoading(false);
            setIsStreaming(false);
          }
        }
        return;
      }

      if (!providerValue) {
        setPosts([]);
        setLoading(false);
        setIsStreaming(false);
        return;
      }

      // PROGRESSIVE CHUNK LOADING FOR EXTENSION CHANGE / CATALOG BROWSING
      setError(null);
      setIsStreaming(true);
      const pDisplayName =
        nameMap.get(providerValue.toLowerCase()) ||
        getProviderDisplayName(providerValue);

      api
        .getPosts(providerValue, filter, page)
        .then((res) => {
          if (mounted && Array.isArray(res) && res.length > 0) {
            const tagged = res.map((item) => ({
              ...item,
              provider: item.provider || providerValue,
              providerName: item.providerName || pDisplayName,
            }));

            // If posts are already showing from instant cache, update directly without duplicate appending
            if (cached.length > 0) {
              setPosts(tagged);
              setLoading(false);
              setIsStreaming(false);
              return;
            }

            // 🌊 Stream in 3-by-3 chunks progressively all the way down
            streamWaterfall(tagged, 3, 40, () => {
              if (mounted) {
                setLoading(false);
                setIsStreaming(false);
              }
            });
          } else if (mounted) {
            setPosts([]);
            setLoading(false);
            setIsStreaming(false);
          }
        })
        .catch((err) => {
          if (mounted && cached.length === 0) {
            setError(err.message || "Error fetching posts");
          }
        })
        .finally(() => {
          if (mounted) {
            setLoading(false);
            setIsStreaming(false);
          }
        });
    }

    const debounce = setTimeout(loadPosts, searchQuery.trim() ? 50 : 0);
    return () => {
      mounted = false;
      clearTimeout(debounce);
      activeTimers.forEach(clearTimeout);
    };
  }, [providerValue, filter, searchQuery, page, isGlobalSearch, installedProviders.join(",")]);

  return { posts, loading, isStreaming, error };
}
