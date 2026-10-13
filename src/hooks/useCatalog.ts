import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { appCache } from "../utils/cache";
import type { CatalogFilter, CatalogData } from "../types";

export function useCatalog(providerValue?: string, initialFilter?: string) {
  const getCachedCatalog = (): CatalogData => {
    if (!providerValue) return { catalog: [], genres: [], all: [] };
    const cached = appCache.get<CatalogData>(`api:catalog:${providerValue}`);
    if (cached) return cached;
    const oldCached = appCache.get<CatalogFilter[]>(`api:catalog:${providerValue}`);
    if (Array.isArray(oldCached)) {
      return { catalog: oldCached, genres: [], all: oldCached };
    }
    return { catalog: [], genres: [], all: [] };
  };

  const initialCached = getCachedCatalog();
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilter[]>(initialCached.catalog || []);
  const [genreFilters, setGenreFilters] = useState<CatalogFilter[]>(initialCached.genres || []);
  const [filters, setFilters] = useState<CatalogFilter[]>(initialCached.all || []);
  const [activeFilter, setActiveFilter] = useState<string>(() => {
    if (initialFilter) return initialFilter;
    return initialCached.all[0]?.filter || "";
  });
  const [loading, setLoading] = useState(() => initialCached.all.length === 0);
  const initialAppliedRef = useRef(false);

  useEffect(() => {
    if (!providerValue) {
      setCatalogFilters([]);
      setGenreFilters([]);
      setFilters([]);
      setActiveFilter("");
      return;
    }

    let mounted = true;
    const cached = getCachedCatalog();
    if (cached.all.length > 0) {
      setCatalogFilters(cached.catalog);
      setGenreFilters(cached.genres);
      setFilters(cached.all);
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function fetchCatalog() {
      try {
        const data = await api.getCatalog(providerValue!);
        if (mounted && data) {
          const cat = data.catalog || [];
          const gen = data.genres || [];
          const all = data.all || [...cat, ...gen];

          setCatalogFilters(cat);
          setGenreFilters(gen);
          setFilters(all);

          if (!initialAppliedRef.current && initialFilter !== undefined) {
            initialAppliedRef.current = true;
            const match = all.find((c) => c.filter === initialFilter);
            if (match) {
              setActiveFilter(match.filter);
              return;
            }
          }

          setActiveFilter((prev) => {
            const hasPrev = all.some((c) => c.filter === prev);
            return hasPrev ? prev : all[0]?.filter || "";
          });
        }
      } catch (err) {
        if (mounted) {
          setCatalogFilters([]);
          setGenreFilters([]);
          setFilters([]);
          setActiveFilter("");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchCatalog();
    return () => {
      mounted = false;
    };
  }, [providerValue]);

  return { filters, catalogFilters, genreFilters, activeFilter, setActiveFilter, loading };
}
