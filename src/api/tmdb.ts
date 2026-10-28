import type { Post } from "../types";
import { isFakePlaceholder } from "../data/homeCuratedService";

export interface TMDBCast {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
}

export interface TMDBMediaItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average?: number;
  release_date?: string;
}

export interface TMDBProvider {
  name: string;
  logo: string;
}

export interface TMDBDetails {
  id: number;
  title: string;
  backdropUrl: string | null;
  posterUrl: string | null;
  logoUrl?: string | null;
  rating: string;
  imdbRating?: string | null;
  imdbId?: string | null;
  year: string;
  runtime: string;
  genres: string[];
  overview: string;
  cast: TMDBCast[];
  recommendations: TMDBMediaItem[];
  similar: TMDBMediaItem[];
  trailerEmbed?: string | null;
  trailerUrl?: string | null;
  trailers?: Array<{ key: string; name: string; type: string }>;
  screenshots?: string[];
  posters?: string[];
  reviews?: Array<{
    id: string;
    author: string;
    content: string;
    rating?: number | null;
    createdAt?: string;
    avatarUrl?: string | null;
  }>;
  directors?: string[];
  directorsList?: Array<{ id: number; name: string }>;
  creators?: string[];
  creatorsList?: Array<{ id: number; name: string }>;
  episodesCount?: number | null;
  seasonsCount?: number | null;
  mediaType?: "movie" | "tv";
  spokenLanguages?: string[];
  tagline?: string | null;
  status?: string | null;
  firstAirDate?: string | null;
  lastAirDate?: string | null;
  networks?: string[];
  studios?: string[];
  countries?: string[];
  homepage?: string | null;
  keywords?: string[];
  contentRating?: string | null;
  watchProviders?: {
    stream?: TMDBProvider[];
    free?: TMDBProvider[];
    buy?: TMDBProvider[];
  };
  budget?: number | null;
  revenue?: number | null;
  nextEpisodeToAir?: {
    air_date: string;
    episode_number: number;
    season_number: number;
    name: string;
  } | null;
}

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_W500 = "https://image.tmdb.org/t/p/w500";
const IMG_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";
const IMG_BASE_W185 = "https://image.tmdb.org/t/p/w185";

/**
 * Robust TMDB JSON fetcher with automated proxy fallback.
 * Bypasses ISP blocks (common in India where api.themoviedb.org is TCP reset)
 */
async function fetchTMDBJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  // 1. Direct fetch
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return await res.json();
  } catch (_) {
    clearTimeout(timer);
  }

  // 2. Local / Cloudflare proxy fallback
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) return await res.json();
  } catch (_) {}

  // 3. Cloudflare Pages edge proxy fallback
  try {
    const cfUrl = `https://cinema-dwh.pages.dev/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(cfUrl);
    if (res.ok) return await res.json();
  } catch (_) {}

  return null;
}

export async function fetchTMDBDetails(
  title: string,
  imdbId?: string,
  searchYear?: string,
  tmdbIdParam?: number,
  mediaTypeParam?: "movie" | "tv"
): Promise<TMDBDetails | null> {
  try {
    let tmdbId: number | null = tmdbIdParam || null;
    let mediaType: "movie" | "tv" = mediaTypeParam || "movie";

    // 1. Try finding by IMDB ID if present (only if tmdbId not already provided)
    if (!tmdbId && imdbId && /^tt\d+$/.test(imdbId)) {
      const findData = await fetchTMDBJson(
        `${BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
      );
      if (findData) {
        if (findData.movie_results && findData.movie_results.length > 0) {
          tmdbId = findData.movie_results[0].id;
          mediaType = "movie";
        } else if (findData.tv_results && findData.tv_results.length > 0) {
          tmdbId = findData.tv_results[0].id;
          mediaType = "tv";
        }
      }
    }

    // 2. If not found by IMDB ID, search by title
    if (!tmdbId && title) {
      const cleanTitle = title
        .replace(/\b(19\d{2}|20\d{2})\b/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(
          /\b(480p|720p|1080p|2160p|4k|hd|web-dl|webrip|bluray|x264|x265|hevc|dual audio|hindi|english|season\s*\d+|s\d+|episodes?)\b/gi,
          ""
        )
        .replace(/&amp;/gi, " ")
        .replace(/[-_.:]+/g, " ")
        .replace(/\s*&\s*$/, "")
        .replace(/^\s*&\s*/, "")
        .trim();

      const targetClean = (cleanTitle || title).trim().toLowerCase();
      const searchQuery = encodeURIComponent(cleanTitle || title);
      const searchUrl = searchYear
        ? `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${searchQuery}&year=${searchYear}`
        : `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${searchQuery}`;

      let searchData = await fetchTMDBJson(searchUrl);
      if (!searchData || !searchData.results || searchData.results.length === 0) {
        // Retry without year if year-filtered search had no results
        searchData = await fetchTMDBJson(
          `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${searchQuery}`
        );
      }

      if (searchData && searchData.results) {
        const results = (searchData.results || []).filter(
          (r: any) => r.media_type === "movie" || r.media_type === "tv"
        );

        const normalizeStr = (s: string) =>
          (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        const normalizedTarget = normalizeStr(cleanTitle || title);

        // 1. Exact normalized match (ignoring punctuation, colons, hyphens)
        let matched = results.find((r: any) => {
          const t1 = normalizeStr(r.title);
          const t2 = normalizeStr(r.name);
          const t3 = normalizeStr(r.original_title);
          const t4 = normalizeStr(r.original_name);
          return (
            t1 === normalizedTarget ||
            t2 === normalizedTarget ||
            t3 === normalizedTarget ||
            t4 === normalizedTarget
          );
        });

        // 2. Fuzzy match only if query has sufficient length (>= 3 characters)
        if (!matched && normalizedTarget.length >= 3) {
          matched = results.find((r: any) => {
            const rt = normalizeStr(r.title || r.name);
            return (
              rt.startsWith(normalizedTarget) ||
              rt.includes(normalizedTarget) ||
              normalizedTarget.includes(rt)
            );
          });
        }

        // 3. Fallback to top-ranked TMDB search result
        if (!matched && results.length > 0) {
          matched = results[0];
        }

        if (matched) {
          tmdbId = matched.id;
          mediaType = matched.media_type === "tv" ? "tv" : "movie";
        }
      }
    }

    if (!tmdbId) return null;

    // 3. Fetch full details with credits, recommendations, similar, videos, images, external_ids, keywords, ratings, reviews in ONE request
    let [data, watchProvidersData] = await Promise.all([
      fetchTMDBJson(
        `${BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,recommendations,similar,videos,images,external_ids,keywords,content_ratings,release_dates,reviews`
      ),
      fetchTMDBJson(
        `${BASE_URL}/${mediaType}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`
      ).catch(() => null),
    ]);

    // If fetch returned 404/null, retry with the opposite media type (e.g. series vs movie)
    if (!data || data.success === false || data.status_code === 34) {
      const altType = mediaType === "movie" ? "tv" : "movie";
      const [altData, altWatch] = await Promise.all([
        fetchTMDBJson(
          `${BASE_URL}/${altType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,recommendations,similar,videos,images,external_ids,keywords,content_ratings,release_dates,reviews`
        ),
        fetchTMDBJson(
          `${BASE_URL}/${altType}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`
        ).catch(() => null),
      ]);
      if (altData && altData.success !== false && altData.status_code !== 34) {
        data = altData;
        watchProvidersData = altWatch;
        mediaType = altType;
      }
    }

    if (!data || data.success === false) return null;

    // Parse runtime
    let runtimeStr = "";
    if (data.runtime) {
      const hours = Math.floor(data.runtime / 60);
      const mins = data.runtime % 60;
      runtimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    } else if (data.episode_run_time && data.episode_run_time.length > 0) {
      runtimeStr = `${data.episode_run_time[0]}m`;
    }

    // Parse release year
    const releaseDate = data.release_date || data.first_air_date || "";
    const year = releaseDate ? releaseDate.split("-")[0] : "";

    // Parse rating & IMDB ID
    const resolvedImdbId =
      data.imdb_id ||
      data.external_ids?.imdb_id ||
      (imdbId && /^tt\d+$/.test(imdbId) ? imdbId : null);

    let liveImdbRating = data.vote_average ? data.vote_average.toFixed(1) : "";
    if (resolvedImdbId) {
      try {
        const cinRes = await fetch(
          `https://v3-cinemeta.strem.io/meta/${mediaType === "tv" ? "series" : "movie"}/${resolvedImdbId}.json`
        );
        if (cinRes.ok) {
          const cinData = await cinRes.json();
          if (cinData?.meta?.imdbRating) {
            liveImdbRating = String(cinData.meta.imdbRating);
          }
        }
      } catch (_) {}
    }

    const rating = liveImdbRating || (data.vote_average ? data.vote_average.toFixed(1) : "");

    // Directors & Creators
    const rawCrew = data.credits?.crew || [];
    const directorsList: Array<{ id: number; name: string }> = rawCrew
      .filter((c: any) => c.job === "Director")
      .map((c: any) => ({ id: c.id, name: c.name }));
    const directors = directorsList.map((d) => d.name);

    const rawCreators = data.created_by || [];
    const creatorsList: Array<{ id: number; name: string }> = rawCreators.map((c: any) => ({
      id: c.id,
      name: c.name,
    }));
    const creators = creatorsList.map((c) => c.name);

    // Number of episodes
    const episodesCount = typeof data.number_of_episodes === "number" ? data.number_of_episodes : null;

    // Spoken languages
    const spokenLanguages = (data.spoken_languages || []).map((l: any) => l.english_name || l.name);

    // Parse genres
    const genres = (data.genres || []).map((g: any) => g.name);

    // Parse trailer
    let trailerEmbed: string | null = null;
    let trailerUrl: string | null = null;
    const vids = data.videos?.results || [];
    const validVideos = vids.filter((v: any) => v.site === "YouTube" && v.key);
    const trailers: Array<{ key: string; name: string; type: string }> = validVideos.map((v: any) => ({
      key: v.key,
      name: v.name || v.type || "Trailer",
      type: v.type || "Trailer",
    }));

    const trailerItem =
      validVideos.find((v: any) => v.type === "Trailer" && v.official) ||
      validVideos.find((v: any) => v.type === "Trailer") ||
      validVideos.find((v: any) => v.type === "Teaser") ||
      null;
    if (trailerItem && trailerItem.key) {
      trailerEmbed = `https://www.youtube-nocookie.com/embed/${trailerItem.key}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
      trailerUrl = `https://www.youtube.com/watch?v=${trailerItem.key}`;
    }

    // Parse screenshots / backdrops
    const rawBackdrops = data.images?.backdrops || [];
    const screenshots: string[] = rawBackdrops
      .slice(0, 15)
      .map((b: any) => `${IMG_BASE_ORIGINAL}${b.file_path}`)
      .filter(Boolean);

    // Parse posters
    const rawPosters = data.images?.posters || [];
    const posters: string[] = rawPosters
      .slice(0, 15)
      .map((p: any) => `${IMG_BASE_W500}${p.file_path}`)
      .filter(Boolean);

    // Parse reviews
    const rawReviews = data.reviews?.results || [];
    const reviews = rawReviews.slice(0, 10).map((rev: any) => {
      let avatar = rev.author_details?.avatar_path;
      if (avatar && typeof avatar === "string") {
        if (avatar.startsWith("/http")) {
          avatar = avatar.slice(1);
        } else if (avatar.startsWith("/")) {
          avatar = `${IMG_BASE_W185}${avatar}`;
        }
      }
      return {
        id: rev.id || Math.random().toString(36),
        author: rev.author || rev.author_details?.name || "Viewer",
        content: rev.content || "",
        rating: typeof rev.author_details?.rating === "number" ? rev.author_details.rating : null,
        createdAt: rev.created_at || null,
        avatarUrl: avatar || null,
      };
    });

    // Parse official movie logo (transparent PNG with exact title font/artwork)
    let logoUrl: string | null = null;
    const rawLogos = data.images?.logos || [];
    if (rawLogos.length > 0) {
      const enLogo =
        rawLogos.find((l: any) => l.iso_639_1 === "en") ||
        rawLogos.find((l: any) => !l.iso_639_1) ||
        rawLogos[0];
      if (enLogo && enLogo.file_path) {
        logoUrl = `${IMG_BASE_ORIGINAL}${enLogo.file_path}`;
      }
    }

    // Parse cast
    const rawCast = data.credits?.cast || [];
    const cast: TMDBCast[] = rawCast.slice(0, 16).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: c.profile_path ? `${IMG_BASE_W185}${c.profile_path}` : null,
    }));

    // Parse recommendations
    const rawRecs = data.recommendations?.results || [];
    const recommendations: TMDBMediaItem[] = rawRecs.slice(0, 12).map((r: any) => ({
      id: r.id,
      title: r.title || r.name,
      poster_path: r.poster_path ? `${IMG_BASE_W500}${r.poster_path}` : null,
      backdrop_path: r.backdrop_path ? `${IMG_BASE_ORIGINAL}${r.backdrop_path}` : null,
      vote_average: r.vote_average,
      release_date: r.release_date || r.first_air_date,
    }));

    // Parse similar
    const rawSimilar = data.similar?.results || [];
    const similar: TMDBMediaItem[] = rawSimilar.slice(0, 12).map((s: any) => ({
      id: s.id,
      title: s.title || s.name,
      poster_path: s.poster_path ? `${IMG_BASE_W500}${s.poster_path}` : null,
      backdrop_path: s.backdrop_path ? `${IMG_BASE_ORIGINAL}${s.backdrop_path}` : null,
      vote_average: s.vote_average,
      release_date: s.release_date || s.first_air_date,
    }));

    // Parse keywords (Topics)
    const rawKeywords =
      data.keywords?.keywords || data.keywords?.results || [];
    const keywords: string[] = rawKeywords
      .map((k: any) => k.name)
      .filter((k: any) => typeof k === "string" && k.trim().length > 0)
      .slice(0, 16);

    // Parse content / age rating (e.g. TV-14, PG-13, R, TV-MA)
    let contentRating: string | null = null;
    if (mediaType === "tv") {
      const crList = data.content_ratings?.results || [];
      const match =
        crList.find((r: any) => r.iso_3166_1 === "US" || r.iso_3166_1 === "IN") ||
        crList[0];
      if (match?.rating) contentRating = match.rating;
    } else {
      const rdList = data.release_dates?.results || [];
      const match =
        rdList.find((r: any) => r.iso_3166_1 === "US" || r.iso_3166_1 === "IN") ||
        rdList[0];
      if (match?.release_dates && match.release_dates.length > 0) {
        const cert = match.release_dates.find((d: any) => d.certification)?.certification;
        if (cert) contentRating = cert;
      }
    }

    // Parse networks & studios & countries
    const networks: string[] = (data.networks || []).map((n: any) => n.name).filter(Boolean);
    const studios: string[] = (data.production_companies || []).map((c: any) => c.name).filter(Boolean);
    const countries: string[] = (data.production_countries || []).map((c: any) => c.name).filter(Boolean);

    // Parse watch providers (JustWatch) with Indian & multi-region fallback
    const wpResults = watchProvidersData?.results || {};
    const wpIN = wpResults.IN;
    const wpUS = wpResults.US;
    const firstOtherRegion = Object.values(wpResults).find((v: any) => v && (v.flatrate || v.free || v.buy || v.rent)) as any;

    const mapProviders = (list: any[]): TMDBProvider[] =>
      (list || []).map((p: any) => ({
        name: p.provider_name,
        logo: `${IMG_BASE_W185}${p.logo_path}`,
      }));

    const rawStreamList = wpIN?.flatrate || wpUS?.flatrate || firstOtherRegion?.flatrate || [];
    const rawFreeList = wpIN?.free || wpIN?.ads || wpUS?.free || wpUS?.ads || firstOtherRegion?.free || [];
    const rawBuyList = wpIN?.buy || wpIN?.rent || wpUS?.buy || wpUS?.rent || firstOtherRegion?.buy || firstOtherRegion?.rent || [];

    const watchProviders = (rawStreamList.length > 0 || rawFreeList.length > 0 || rawBuyList.length > 0)
      ? {
          stream: mapProviders(rawStreamList),
          free: mapProviders(rawFreeList),
          buy: mapProviders(rawBuyList),
        }
      : undefined;

    // Next episode to air (if returning series)
    let nextEpisodeToAir: TMDBDetails["nextEpisodeToAir"] = null;
    if (data.next_episode_to_air) {
      nextEpisodeToAir = {
        air_date: data.next_episode_to_air.air_date,
        episode_number: data.next_episode_to_air.episode_number,
        season_number: data.next_episode_to_air.season_number,
        name: data.next_episode_to_air.name,
      };
    }

    return {
      id: data.id,
      title: data.title || data.name,
      backdropUrl: data.backdrop_path ? `${IMG_BASE_ORIGINAL}${data.backdrop_path}` : null,
      posterUrl: data.poster_path ? `${IMG_BASE_W500}${data.poster_path}` : null,
      logoUrl,
      rating,
      imdbRating: liveImdbRating || rating,
      imdbId: resolvedImdbId || null,
      year,
      runtime: runtimeStr,
      genres,
      overview: data.overview || "",
      cast,
      recommendations,
      similar,
      trailerEmbed,
      trailerUrl,
      trailers,
      screenshots,
      posters,
      reviews,
      directors,
      directorsList,
      creators,
      creatorsList,
      episodesCount,
      seasonsCount: typeof data.number_of_seasons === "number" ? data.number_of_seasons : null,
      mediaType,
      spokenLanguages,
      tagline: data.tagline || null,
      status: data.status || null,
      firstAirDate: data.first_air_date || data.release_date || null,
      lastAirDate: data.last_air_date || null,
      networks,
      studios,
      countries,
      homepage: data.homepage || null,
      keywords,
      contentRating,
      watchProviders,
      budget: typeof data.budget === "number" && data.budget > 0 ? data.budget : null,
      revenue: typeof data.revenue === "number" && data.revenue > 0 ? data.revenue : null,
      nextEpisodeToAir,
    };
  } catch (error) {
    console.warn("TMDB fetch error:", error);
    return null;
  }
}

export interface TMDBPersonDetails {
  id: number;
  name: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  biography: string;
  profile_path: string | null;
  movies: TMDBMediaItem[];
  tvShows: TMDBMediaItem[];
}

export async function fetchTMDBPersonDetails(personId: number): Promise<TMDBPersonDetails | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}&append_to_response=combined_credits`
    );
    if (!res.ok) return null;
    const data = await res.json();

    const rawCredits = data.combined_credits?.cast || [];

    // Sort by popularity / vote_count desc
    const sortedCredits = [...rawCredits].sort(
      (a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0)
    );

    const movies: TMDBMediaItem[] = sortedCredits
      .filter((c: any) => c.media_type === "movie" && c.poster_path)
      .slice(0, 36)
      .map((m: any) => ({
        id: m.id,
        title: m.title || m.name,
        poster_path: m.poster_path ? `${IMG_BASE_W500}${m.poster_path}` : null,
        backdrop_path: m.backdrop_path ? `${IMG_BASE_ORIGINAL}${m.backdrop_path}` : null,
        vote_average: m.vote_average,
        release_date: m.release_date,
      }));

    const tvShows: TMDBMediaItem[] = sortedCredits
      .filter((c: any) => c.media_type === "tv" && c.poster_path)
      .slice(0, 36)
      .map((t: any) => ({
        id: t.id,
        title: t.name || t.title,
        poster_path: t.poster_path ? `${IMG_BASE_W500}${t.poster_path}` : null,
        backdrop_path: t.backdrop_path ? `${IMG_BASE_ORIGINAL}${t.backdrop_path}` : null,
        vote_average: t.vote_average,
        release_date: t.first_air_date,
      }));

    return {
      id: data.id,
      name: data.name,
      birthday: data.birthday,
      deathday: data.deathday,
      place_of_birth: data.place_of_birth,
      biography: data.biography || "",
      profile_path: data.profile_path ? `${IMG_BASE_W500}${data.profile_path}` : null,
      movies,
      tvShows,
    };
  } catch (err) {
    console.error("fetchTMDBPersonDetails error:", err);
    return null;
  }
}

export async function fetchTMDBSeasonDetails(
  tvId: number | string,
  seasonNumber: number
): Promise<{ air_date?: string | null; episodes: any[] } | null> {
  try {
    const data = await fetchTMDBJson(
      `${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
    );
    if (!data) return null;
    return {
      air_date: data.air_date || null,
      episodes: Array.isArray(data.episodes) ? data.episodes : [],
    };
  } catch (err) {
    console.error("fetchTMDBSeasonDetails error:", err);
    return null;
  }
}

export async function fetchRankingsFromTMDB(
  category: string,
  page = 1
): Promise<any[]> {
  try {
    let url = "";
    let isTv = false;

    switch (category) {
      case "tv":
        url = `${BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&page=${page}`;
        isTv = true;
        break;
      case "anime":
        url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`;
        isTv = true;
        break;
      case "bollywood":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=hi&sort_by=vote_average.desc&vote_count.gte=80&page=${page}`;
        break;
      case "south":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=te|ta|ml|kn&sort_by=vote_average.desc&vote_count.gte=40&page=${page}`;
        break;
      case "korean":
        url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=50&page=${page}`;
        isTv = true;
        break;
      case "action":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "scifi":
      case "science-fiction":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=878&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "horror":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=27&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "comedy":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=35&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "romance":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=10749&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "drama":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=18&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "crime":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=80&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "thriller":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=53&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "adventure":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=12&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "animation":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=16&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;
        break;
      case "mystery":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=9648&sort_by=vote_average.desc&vote_count.gte=200&page=${page}`;
        break;
      case "fantasy":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=14&sort_by=vote_average.desc&vote_count.gte=200&page=${page}`;
        break;
      case "documentary":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=99&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`;
        break;
      case "war":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=10752&sort_by=vote_average.desc&vote_count.gte=200&page=${page}`;
        break;
      case "western":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=37&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`;
        break;
      case "history":
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=36&sort_by=vote_average.desc&vote_count.gte=150&page=${page}`;
        break;
      case "movies":
      default:
        url = `${BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`;
        break;
    }

    const data = await fetchTMDBJson(url);
    if (!data || !data.results) return [];

    return data.results.map((r: any, idx: number) => {
      const year = parseInt((r.release_date || r.first_air_date || "").split("-")[0]) || 2020;
      const imdbRating = Math.round((r.vote_average || 7.0) * 10) / 10;
      const letterboxdRating = Math.min(5.0, Math.round(((r.vote_average || 7.0) / 2) * 10) / 10);
      const voteCount = r.vote_count || 0;
      const imdbVotes = voteCount >= 1000 ? `${(voteCount / 1000).toFixed(1)}K` : `${voteCount}`;

      return {
        id: `tmdb_${r.id}`,
        tmdbId: r.id,
        rank: (page - 1) * 20 + idx + 1,
        title: r.title || r.name,
        year,
        type: isTv ? "tv" : "movie",
        imdbRating,
        imdbVotes,
        letterboxdRating,
        letterboxdRank: (page - 1) * 20 + idx + 1,
        genres: [],
        category,
        poster: r.poster_path ? `${IMG_BASE_W500}${r.poster_path}` : "",
        backdrop: r.backdrop_path ? `${IMG_BASE_ORIGINAL}${r.backdrop_path}` : "",
        overview: r.overview || "",
      };
    });
  } catch (e) {
    console.error("fetchRankingsFromTMDB error:", e);
    return [];
  }
}

export interface SearchLanguageOption {
  code: string;
  label: string;
  tmdbLang?: string;
}

export const SEARCH_LANGUAGES: SearchLanguageOption[] = [
  { code: "all", label: "Any language" },
  { code: "hi", label: "Hindi", tmdbLang: "hi" },
  { code: "ta", label: "Tamil", tmdbLang: "ta" },
  { code: "te", label: "Telugu", tmdbLang: "te" },
  { code: "ml", label: "Malayalam", tmdbLang: "ml" },
  { code: "kn", label: "Kannada", tmdbLang: "kn" },
  { code: "dual", label: "Dual Audio", tmdbLang: "hi|en" },
  { code: "multi", label: "Multi Audio", tmdbLang: "hi|te|ta" },
  { code: "en", label: "English", tmdbLang: "en" },
  { code: "es", label: "Spanish", tmdbLang: "es" },
  { code: "fr", label: "French", tmdbLang: "fr" },
  { code: "de", label: "German", tmdbLang: "de" },
  { code: "it", label: "Italian", tmdbLang: "it" },
  { code: "ja", label: "Japanese", tmdbLang: "ja" },
  { code: "ko", label: "Korean", tmdbLang: "ko" },
];

/**
 * Live TMDB Trending fetcher filtered dynamically by original language.
 * Strictly filters out unreleased concepts and fake titles (Rule 5).
 */
export async function fetchTrendingByLanguage(langCode: string = "all"): Promise<Post[]> {
  const cacheKey = `cinema_search_trending_${langCode}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Cache valid for 3 hours
      if (Date.now() - (parsed.time || 0) < 3 * 60 * 60 * 1000 && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return parsed.items;
      }
    }
  } catch (_) {}

  const todayStr = new Date().toISOString().split("T")[0];
  let rawItems: any[] = [];

  try {
    if (langCode === "all") {
      const data = await fetchTMDBJson(`${BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}`);
      if (data && Array.isArray(data.results)) {
        rawItems = data.results;
      }
    } else {
      const lang = langCode === "dual" ? "hi|en" : langCode === "multi" ? "hi|te|ta" : langCode;
      const [moviesRes, tvRes] = await Promise.all([
        fetchTMDBJson(
          `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${lang}&sort_by=popularity.desc&primary_release_date.lte=${todayStr}&vote_count.gte=5`
        ),
        fetchTMDBJson(
          `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=${lang}&sort_by=popularity.desc&first_air_date.lte=${todayStr}&vote_count.gte=3`
        ),
      ]);

      const mItems = (moviesRes?.results || []).map((r: any) => ({ ...r, media_type: "movie" }));
      const tItems = (tvRes?.results || []).map((r: any) => ({ ...r, media_type: "tv" }));

      const maxLen = Math.max(mItems.length, tItems.length);
      for (let i = 0; i < maxLen; i++) {
        if (mItems[i]) rawItems.push(mItems[i]);
        if (tItems[i]) rawItems.push(tItems[i]);
      }
    }

    const posts: Post[] = rawItems
      .filter((r) => {
        if (!r || (!r.poster_path && !r.backdrop_path)) return false;
        const title = r.title || r.name || "";
        if (!title || isFakePlaceholder(title)) return false;
        const releaseDate = r.release_date || r.first_air_date || "";
        if (releaseDate && releaseDate > todayStr) return false;
        return true;
      })
      .slice(0, 16)
      .map((r) => {
        const releaseDate = r.release_date || r.first_air_date || "";
        const year = releaseDate ? releaseDate.slice(0, 4) : "";
        const isTv = r.media_type === "tv" || (!r.title && !!r.name);
        return {
          title: r.title || r.name,
          year,
          image: r.poster_path
            ? `https://image.tmdb.org/t/p/w185${r.poster_path}`
            : r.backdrop_path
            ? `https://image.tmdb.org/t/p/w185${r.backdrop_path}`
            : "",
          backdropUrl: r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : undefined,
          rating: r.vote_average ? r.vote_average.toFixed(1) : undefined,
          link: `/search?q=${encodeURIComponent(r.title || r.name)}`,
          mediaType: isTv ? "tv" : "movie",
          tmdbId: r.id,
          overview: r.overview || "",
        };
      });

    if (posts.length > 0) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), items: posts }));
      } catch (_) {}
    }

    return posts;
  } catch (err) {
    console.error("fetchTrendingByLanguage error:", err);
    return [];
  }
}

/**
 * Live TMDB multi-search query for fast real-time search suggestions.
 */
export async function searchTMDBLive(query: string): Promise<Post[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  try {
    const url = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(clean)}`;
    const data = await fetchTMDBJson(url);

    if (!data || !Array.isArray(data.results)) return [];

    return data.results
      .filter((r: any) => {
        if (!r || (r.media_type !== "movie" && r.media_type !== "tv")) return false;
        if (!r.poster_path && !r.backdrop_path) return false;
        const title = r.title || r.name || "";
        if (!title || isFakePlaceholder(title)) return false;
        return true;
      })
      .slice(0, 10)
      .map((r: any) => {
        const releaseDate = r.release_date || r.first_air_date || "";
        const year = releaseDate ? releaseDate.slice(0, 4) : "";
        const isTv = r.media_type === "tv";
        return {
          title: r.title || r.name,
          year,
          image: r.poster_path
            ? `https://image.tmdb.org/t/p/w185${r.poster_path}`
            : `https://image.tmdb.org/t/p/w185${r.backdrop_path}`,
          backdropUrl: r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : undefined,
          rating: r.vote_average ? r.vote_average.toFixed(1) : undefined,
          link: `/search?q=${encodeURIComponent(r.title || r.name)}`,
          mediaType: isTv ? "tv" : "movie",
          tmdbId: r.id,
          overview: r.overview || "",
        };
      });
  } catch (err) {
    console.error("searchTMDBLive error:", err);
    return [];
  }
}


