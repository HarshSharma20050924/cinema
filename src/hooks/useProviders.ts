import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";
import type { Provider } from "../types";

export const ACTIVE_TELEGRAM_EXTENSIONS = new Set([
  "movies4u",
  "moviesmod",
  "4khdhub",
  "4khdhub4u",
  "drive",
  "movieboxweb",
  "moviebox",
  "tpb",
  "multi",
  "castle",
  "vega",
  "hdhub4u",
  "primemirror",
  "disneymirror",
  "netflixmirror",
  "uhd",
  "dramacool",
  "animesalt",
  "anikoto",
  "animeworld",
  "hianime",
  "flixhq",
  "showbox",
  "mxplayer",
  "zeefliz",
  "moviezwap",
  "filmyfly",
  "topmovies",
]);

export function normalizeProviderKey(raw?: string | null): string {
  if (!raw) return "";
  const clean = raw.toLowerCase().trim();
  if (clean === "default" || clean === "cinema") return "";
  if (clean === "prime" || clean === "primemirror") return "primeMirror";
  if (clean === "netflix" || clean === "netflixmirror") return "netflixMirror";
  if (clean === "disney" || clean === "disneymirror") return "disneyMirror";
  if (clean === "moviebox" || clean === "movieboxweb") return "movieBoxWeb";
  if (clean === "hdhub" || clean === "hdhub4u") return "hdhub4u";
  if (clean === "4khdhub" || clean === "4khdhub4u") return "4khdhub";
  return clean;
}

export function matchProvider(list: Provider[], key?: string | null): Provider | null {
  if (!key || !list || list.length === 0) return null;
  const cleanKey = normalizeProviderKey(key).toLowerCase();
  if (!cleanKey) return null;

  // 1. Exact match
  const exact = list.find((p) => p.value.toLowerCase() === cleanKey);
  if (exact) return exact;

  // 2. Name match
  const byName = list.find((p) => p.name.toLowerCase() === cleanKey);
  if (byName) return byName;

  // 3. Substring match
  const partial = list.find((p) => p.value.toLowerCase().includes(cleanKey) || cleanKey.includes(p.value.toLowerCase()));
  if (partial) return partial;

  return null;
}

export function useProviders(initialProviderValue?: string) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialUrlProviderRef = useRef<string | null>(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("provider")
      : null
  );

  const resolveProvider = useCallback(
    (activeList: Provider[]) => {
      if (!activeList || activeList.length === 0) return null;

      // Priority 1: URL search parameter (?provider=primeMirror or ?open=web&provider=vega)
      let urlProvKey = initialUrlProviderRef.current;
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search);
        const curProv = p.get("provider");
        if (curProv) urlProvKey = curProv;
      }

      const fromUrl = matchProvider(activeList, urlProvKey);
      if (fromUrl) return fromUrl;

      // Priority 2: Passed initialProviderValue (from saved navigation state)
      const fromInitial = matchProvider(activeList, initialProviderValue);
      if (fromInitial) return fromInitial;

      // Priority 3: Fallback to HDHub4u or first enabled provider
      return (
        activeList.find((p) => p.value.toLowerCase() === "hdhub4u") ||
        activeList[0] ||
        null
      );
    },
    [initialProviderValue]
  );

  useEffect(() => {
    let mounted = true;
    async function fetchProviders() {
      try {
        setLoading(true);
        const list = await api.getProviders();
        if (mounted) {
          const activeList = list.filter((p) => {
            if (p.disabled) return false;
            const val = (p.value || "").toLowerCase();
            return ACTIVE_TELEGRAM_EXTENSIONS.has(val);
          });
          setProviders(activeList);

          const defaultProvider = resolveProvider(activeList);
          setActiveProvider(defaultProvider);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load providers");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProviders();
    return () => {
      mounted = false;
    };
  }, [resolveProvider]);

  // Keep activeProvider in sync ONLY on browser Back/Forward (popstate) navigation
  useEffect(() => {
    if (typeof window === "undefined" || providers.length === 0) return;

    function handlePopState() {
      const p = new URLSearchParams(window.location.search);
      const urlProvKey = p.get("provider");
      if (urlProvKey) {
        const matched = matchProvider(providers, urlProvKey);
        if (matched) {
          setActiveProvider(matched);
        }
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [providers]);

  return { providers, activeProvider, setActiveProvider, loading, error };
}

