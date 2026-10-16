/**
 * Cloudflare Pages Function: /api/imdb & /api/imdb/films
 * Runs directly on Cloudflare Edge with zero dependency on external mobile nodes.
 */

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const GENRE_MAP = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science-fiction": 878,
  scifi: 878,
  thriller: 53,
  "tv-movie": 10770,
  war: 10752,
  western: 37,
};

export async function onRequest(context) {
  const { request } = context;

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
  const sort = url.searchParams.get("sort") || "highest";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const search = (url.searchParams.get("search") || "").trim();

  const jsonHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=1800, s-maxage=3600",
  };

  try {
    // 1. If searching by title query, use official IMDb Suggestions API + TMDB Multi Search
    if (search) {
      const firstChar = search[0].toLowerCase();
      const imdbSugUrl = `https://v3.sg.media-imdb.com/suggestion/titles/${encodeURIComponent(firstChar)}/${encodeURIComponent(search.toLowerCase())}.json`;
      const tmdbSearchUrl = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(search)}&page=${page}`;

      const [imdbRes, tmdbRes] = await Promise.all([
        fetch(imdbSugUrl, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(tmdbSearchUrl, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const items = [];
      const seen = new Set();

      // From IMDb suggestions
      if (imdbRes && imdbRes.d) {
        for (const d of imdbRes.d) {
          if (!d.id || seen.has(d.id.toLowerCase())) continue;
          seen.add(d.id.toLowerCase());

          const posterUrl = d.i ? d.i.imageUrl : "";
          const isTv = d.q === "TV series" || d.qid === "tvSeries";
          const title = d.l || "";
          const year = d.y || null;

          items.push({
            id: d.id,
            imdbId: d.id,
            title,
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

      // Supplement from TMDB search
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
    }

    // 2. Discover Catalog by Rating
    let tmdbSort = "vote_average.desc";
    let minVotes = 300;

    switch (sort) {
      case "lowest":
        tmdbSort = "vote_average.asc";
        minVotes = 60;
        break;
      case "votes":
      case "popular-all":
        tmdbSort = "popularity.desc";
        minVotes = 100;
        break;
      case "year-desc":
      case "release-newest":
        tmdbSort = "primary_release_date.desc";
        minVotes = 40;
        break;
      case "year-asc":
      case "release-earliest":
        tmdbSort = "primary_release_date.asc";
        minVotes = 40;
        break;
      case "highest":
      default:
        tmdbSort = "vote_average.desc";
        minVotes = 300;
        break;
    }

    let discoverUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&sort_by=${tmdbSort}&page=${page}`;

    // Apply Genre / Regional Language
    if (genre && genre !== "all") {
      const gLower = genre.toLowerCase();
      if (gLower === "bollywood") {
        discoverUrl += `&with_original_language=hi`;
        if (minVotes > 80) minVotes = 80;
      } else if (gLower === "south") {
        discoverUrl += `&with_original_language=te|ta|ml|kn`;
        if (minVotes > 25) minVotes = 25;
      } else if (gLower === "korean") {
        discoverUrl += `&with_original_language=ko`;
        if (minVotes > 50) minVotes = 50;
      } else if (gLower === "anime") {
        discoverUrl += `&with_genres=16&with_original_language=ja`;
        if (minVotes > 60) minVotes = 60;
      } else {
        const gId = GENRE_MAP[gLower];
        if (gId) {
          discoverUrl += `&with_genres=${gId}`;
        }
      }
    }

    discoverUrl += `&vote_count.gte=${minVotes}`;

    // Apply Decade
    if (decade && decade !== "all") {
      const dec = parseInt(decade, 10);
      if (!isNaN(dec)) {
        discoverUrl += `&primary_release_date.gte=${dec}-01-01&primary_release_date.lte=${dec + 9}-12-31`;
      }
    }

    const tmdbResp = await fetch(discoverUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = tmdbResp.ok ? await tmdbResp.json() : null;
    const results = data?.results || [];

    const items = results.map((r) => {
      const year = parseInt((r.release_date || "").split("-")[0], 10) || 2020;
      const imdbRating = Math.round((r.vote_average || 7.0) * 10) / 10;
      const poster = r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : "";
      const backdrop = r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : poster;
      const votes = r.vote_count >= 1000 ? `${(r.vote_count / 1000).toFixed(1)}K` : `${r.vote_count}`;

      return {
        id: `imdb_tmdb_${r.id}`,
        tmdbId: r.id,
        title: r.title,
        year,
        type: "movie",
        imdbRating,
        letterboxdRating: Math.round((imdbRating / 2) * 10) / 10,
        imdbVotes: votes,
        genres: [genre !== "all" ? genre : "Cinema"],
        category: genre !== "all" ? genre : "all_films",
        poster,
        backdrop,
        overview: r.overview || "",
        runtime: "2h 00m",
      };
    });

    return new Response(JSON.stringify(items), { headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify([]), { headers: jsonHeaders });
  }
}
