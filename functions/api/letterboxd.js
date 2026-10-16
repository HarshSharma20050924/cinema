import LETTERBOXD_DATA from "./letterboxd-data.json";

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const url = new URL(request.url);
  const decade = url.searchParams.get("decade") || "all";
  const genre = url.searchParams.get("genre") || "all";
  const sort = url.searchParams.get("sort") || "rating-highest";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const search = (url.searchParams.get("search") || "").trim();
  const list = (url.searchParams.get("list") || "").trim();

  const jsonHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=1800, s-maxage=3600",
  };

  // 1. Try forwarding to residential phone / desktop backend if alive
  try {
    let backendUrl = null;
    if (env?.cinema_db) {
      try {
        const row = await env.cinema_db.prepare("SELECT value FROM config WHERE key = 'BACKEND_URL'").first();
        if (row?.value) backendUrl = row.value;
      } catch (_) {}
    }
    if (!backendUrl && env?.CINEMA_KV) {
      try {
        backendUrl = await env.CINEMA_KV.get("BACKEND_URL");
      } catch (_) {}
    }

    if (backendUrl && !backendUrl.includes(url.hostname)) {
      const cleanNode = backendUrl.replace(/\/+$/, "");
      const forwardUrl = `${cleanNode}${url.pathname}${url.search}`;
      const nodeResp = await fetch(forwardUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(3500),
      });
      if (nodeResp.ok) {
        const data = await nodeResp.json();
        if (Array.isArray(data) && data.length > 0) {
          return new Response(JSON.stringify(data), { headers: jsonHeaders });
        }
      }
    }
  } catch (_) {}

  // 2. EDGE FALLBACK: Search by title query using IMDb Suggestions + TMDB
  if (search) {
    try {
      const firstChar = search[0].toLowerCase();
      const imdbSugUrl = `https://v3.sg.media-imdb.com/suggestion/titles/${encodeURIComponent(firstChar)}/${encodeURIComponent(search.toLowerCase())}.json`;
      const tmdbSearchUrl = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(search)}&page=${page}`;

      const [imdbRes, tmdbRes] = await Promise.all([
        fetch(imdbSugUrl, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(tmdbSearchUrl, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const items = [];
      const seen = new Set();

      // Canonical match first
      const sLower = search.toLowerCase();
      const canonicalMatches = LETTERBOXD_DATA.filter((m) =>
        m.title.toLowerCase().includes(sLower)
      );
      for (const m of canonicalMatches) {
        seen.add(m.title.toLowerCase().trim());
        items.push(m);
      }

      // IMDb suggestions
      if (imdbRes && imdbRes.d) {
        for (const d of imdbRes.d) {
          const t = d.l || "";
          if (!t || seen.has(t.toLowerCase().trim())) continue;
          seen.add(t.toLowerCase().trim());

          const posterUrl = d.i ? d.i.imageUrl : "";
          const isTv = d.q === "TV series" || d.qid === "tvSeries";
          const year = d.y || null;

          items.push({
            id: d.id,
            imdbId: d.id,
            title: t,
            year,
            type: isTv ? "tv" : "movie",
            imdbRating: 8.0,
            letterboxdRating: 4.0,
            imdbVotes: d.s || "IMDb",
            genres: [isTv ? "TV Series" : "Feature Film"],
            category: "search",
            poster: posterUrl,
            backdrop: posterUrl,
            overview: d.s ? `Starring ${d.s}` : `Release Year ${year || "Unknown"}`,
            runtime: "2h 00m",
            director: d.s ? d.s.split(",")[0]?.trim() : "",
          });
        }
      }

      // TMDB search
      if (tmdbRes && tmdbRes.results) {
        for (const r of tmdbRes.results) {
          const t = r.title || r.name;
          if (!t) continue;
          const k = t.toLowerCase().trim();
          if (seen.has(k)) continue;
          seen.add(k);

          const year = parseInt((r.release_date || r.first_air_date || "").split("-")[0], 10) || null;
          const rating = Math.round((r.vote_average || 7.0) * 10) / 10;
          const poster = r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : "";
          const backdrop = r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : poster;

          items.push({
            id: `tmdb_${r.id}`,
            tmdbId: r.id,
            title: t,
            year,
            type: r.media_type === "tv" ? "tv" : "movie",
            imdbRating: rating,
            letterboxdRating: Math.round((rating / 2) * 10) / 10,
            imdbVotes: r.vote_count ? `${r.vote_count}` : "TMDB",
            genres: ["Film"],
            category: "search",
            poster,
            backdrop,
            overview: r.overview || "",
            runtime: "2h 00m",
          });
        }
      }

      return new Response(JSON.stringify(items), { headers: jsonHeaders });
    } catch (_) {}
  }

  // 3. Filter & Sort Canonical Letterboxd Dataset
  let listData = [...LETTERBOXD_DATA];

  // Filter Decade
  if (decade && decade !== "all") {
    const dec = parseInt(decade, 10);
    if (!isNaN(dec)) {
      listData = listData.filter((f) => f.year >= dec && f.year < dec + 10);
    }
  }

  // Filter Genre
  if (genre && genre !== "all") {
    const gLower = genre.toLowerCase();
    listData = listData.filter(
      (f) =>
        f.category?.toLowerCase() === gLower ||
        f.genres?.some((g) => g.toLowerCase().includes(gLower))
    );
  }

  // Sort
  switch (sort) {
    case "rating-lowest":
      listData.sort((a, b) => (a.letterboxdRating || 0) - (b.letterboxdRating || 0));
      break;
    case "release-newest":
      listData.sort((a, b) => (b.year || 0) - (a.year || 0));
      break;
    case "release-earliest":
      listData.sort((a, b) => (a.year || 0) - (b.year || 0));
      break;
    case "name-az":
      listData.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "rating-highest":
    default:
      listData.sort(
        (a, b) =>
          (b.letterboxdRating || 0) - (a.letterboxdRating || 0) ||
          (a.rank || 999) - (b.rank || 999)
      );
      break;
  }

  // Pagination (50 items per page)
  const pageSize = 50;
  const start = (page - 1) * pageSize;
  const pageItems = listData.slice(start, start + pageSize);

  return new Response(JSON.stringify(pageItems), { headers: jsonHeaders });
}
