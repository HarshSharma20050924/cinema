const axios = require("axios");
const serverCache = require("../services/cacheService.cjs");

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function fetchTmdb(url) {
  try {
    const res = await axios.get(url, { timeout: 4000 });
    if (res.data) return res.data;
  } catch (_) {}
  try {
    const proxyUrl = `https://cinema-dwh.pages.dev/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await axios.get(proxyUrl, { timeout: 7000 });
    if (res.data) return res.data;
  } catch (_) {}
  return null;
}

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

async function getImdbFilms(req, res) {
  const {
    decade = "all",
    genre = "all",
    sort = "highest",
    page = 1,
    search = "",
  } = req.query;

  const cleanSearch = (search || "").trim();
  const cacheKey = cleanSearch
    ? `imdb:search:${cleanSearch.toLowerCase()}:${page}`
    : `imdb:${decade}:${genre}:${sort}:${page}`;

  const cached = serverCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    // 1. If searching by title query, use official IMDb Suggestions API + TMDB Multi Search
    if (cleanSearch) {
      const firstChar = cleanSearch[0].toLowerCase();
      const imdbSugUrl = `https://v3.sg.media-imdb.com/suggestion/titles/${encodeURIComponent(firstChar)}/${encodeURIComponent(cleanSearch.toLowerCase())}.json`;
      
      const [imdbRes, tmdbData] = await Promise.all([
        axios.get(imdbSugUrl, { timeout: 4500 }).then(r => r.data).catch(() => null),
        fetchTmdb(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanSearch)}&page=${page}`),
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
            imdbRating: 8.0, // base fallback rating
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
      if (tmdbData && tmdbData.results) {
        for (const r of tmdbData.results) {
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

      serverCache.set(cacheKey, items, 15 * 60 * 1000);
      return res.json(items);
    }

    // 2. Discover Catalog by Rating (Highest, Lowest, Popular, Newest, Oldest)
    let tmdbSort = "vote_average.desc";
    let minVotes = 300;

    switch (sort) {
      case "lowest":
        tmdbSort = "vote_average.asc";
        minVotes = 60; // captures famous low-rated IMDb films
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

    let url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&sort_by=${tmdbSort}&page=${page}`;

    // Apply Genre / Regional Language
    if (genre && genre !== "all") {
      const gLower = genre.toLowerCase();
      if (gLower === "bollywood") {
        url += `&with_original_language=hi`;
        if (minVotes > 80) minVotes = 80;
      } else if (gLower === "south") {
        url += `&with_original_language=te|ta|ml|kn`;
        if (minVotes > 25) minVotes = 25;
      } else if (gLower === "korean") {
        url += `&with_original_language=ko`;
        if (minVotes > 50) minVotes = 50;
      } else if (gLower === "anime") {
        url += `&with_genres=16&with_original_language=ja`;
        if (minVotes > 60) minVotes = 60;
      } else {
        const gId = GENRE_MAP[gLower];
        if (gId) {
          url += `&with_genres=${gId}`;
        }
      }
    }

    url += `&vote_count.gte=${minVotes}`;

    // Apply Decade
    if (decade && decade !== "all") {
      const dec = parseInt(decade, 10);
      if (!isNaN(dec)) {
        url += `&primary_release_date.gte=${dec}-01-01&primary_release_date.lte=${dec + 9}-12-31`;
      }
    }

    const data = await fetchTmdb(url);
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

    serverCache.set(cacheKey, items, 30 * 60 * 1000);
    return res.json(items);
  } catch (err) {
    console.warn("IMDb discovery error:", err.message);
    return res.json([]);
  }
}

module.exports = { getImdbFilms };
