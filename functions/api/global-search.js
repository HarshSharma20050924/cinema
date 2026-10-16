/**
 * Cloudflare Pages Function: /api/global-search
 * Searches across multiple providers in parallel on the edge.
 * Combines and deduplicates results seamlessly.
 */

export async function onRequestGet(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const q = (reqUrl.searchParams.get("q") || reqUrl.searchParams.get("query") || "").trim();
  const page = parseInt(reqUrl.searchParams.get("page") || "1", 10);
  const rawProviders = reqUrl.searchParams.get("providers") || "";

  if (!q) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  let providerList = [];
  if (rawProviders) {
    providerList = rawProviders.split(",").map(p => p.trim()).filter(Boolean);
  }
  if (providerList.length === 0) {
    providerList = ["drive", "vega", "hdhub4u", "4khdhub", "movieBoxWeb", "autoEmbed"];
  }

  // Query up to 8 providers in parallel with timeout
  const searchPromises = providerList.slice(0, 8).map(async (provider) => {
    try {
      const searchUrl = new URL("/api/search", reqUrl.origin);
      searchUrl.searchParams.set("provider", provider);
      searchUrl.searchParams.set("q", q);
      searchUrl.searchParams.set("page", String(page));

      const res = await fetch(searchUrl.toString(), {
        headers: { "User-Agent": "Cinema-GlobalSearch-Edge/1.0" },
        signal: AbortSignal.timeout(9000)
      });

      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    } catch (_) {
      return [];
    }
  });

  const settled = await Promise.allSettled(searchPromises);
  const combined = [];
  const seen = new Set();

  for (const r of settled) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      for (const item of r.value) {
        if (item && item.link) {
          const key = `${item.provider || ""}::${item.link}`;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        }
      }
    }
  }

  return new Response(JSON.stringify(combined), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60"
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
