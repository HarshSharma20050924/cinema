import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { Provider } from "../types";

export function useProviders(initialProviderValue?: string) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchProviders() {
      try {
        setLoading(true);
        const list = await api.getProviders();
        if (mounted) {
          const activeList = list.filter((p) => !p.disabled);
          setProviders(activeList);

          const resolvedValue = initialProviderValue === "movieBox" ? "movieBoxWeb" : initialProviderValue;
          const target = resolvedValue
            ? activeList.find((p) => p.value === resolvedValue)
            : null;
          const defaultProvider =
            target ||
            activeList.find((p) => p.value.toLowerCase() === "hdhub4u") ||
            activeList[0] ||
            null;
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
  }, [initialProviderValue]);

  return { providers, activeProvider, setActiveProvider, loading, error };
}
