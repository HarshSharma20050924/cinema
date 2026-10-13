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

export interface TMDBDetails {
  id: number;
  title: string;
  backdropUrl: string | null;
  posterUrl: string | null;
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
  directors?: string[];
  creators?: string[];
  episodesCount?: number | null;
  spokenLanguages?: string[];
}

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_W500 = "https://image.tmdb.org/t/p/w500";
const IMG_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";
const IMG_BASE_W185 = "https://image.tmdb.org/t/p/w185";

export async function fetchTMDBDetails(
  title: string,
  imdbId?: string
): Promise<TMDBDetails | null> {
  try {
    let tmdbId: number | null = null;
    let mediaType: "movie" | "tv" = "movie";

    // 1. Try finding by IMDB ID if present
    if (imdbId && /^tt\d+$/.test(imdbId)) {
      const findRes = await fetch(
        `${BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
      );
      if (findRes.ok) {
        const findData = await findRes.json();
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
        .replace(/[-_.]+/g, " ")
        .trim();

      const targetClean = (cleanTitle || title).trim().toLowerCase();
      const searchRes = await fetch(
        `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          cleanTitle || title
        )}`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = (searchData.results || []).filter(
          (r: any) => r.media_type === "movie" || r.media_type === "tv"
        );

        // 1. Exact title match (e.g. "I" matches movie named "I")
        let matched = results.find(
          (r: any) =>
            (r.title && r.title.trim().toLowerCase() === targetClean) ||
            (r.name && r.name.trim().toLowerCase() === targetClean) ||
            (r.original_title && r.original_title.trim().toLowerCase() === targetClean) ||
            (r.original_name && r.original_name.trim().toLowerCase() === targetClean)
        );

        // 2. Fuzzy match only if query has sufficient length (>= 4 characters) to prevent false positives like "I" -> "Insidious"
        if (!matched && targetClean.length >= 4) {
          matched = results.find((r: any) => {
            const rt = (r.title || r.name || "").toLowerCase();
            return rt.startsWith(targetClean) || rt.includes(targetClean);
          });
        }

        if (matched) {
          tmdbId = matched.id;
          mediaType = matched.media_type === "tv" ? "tv" : "movie";
        }
      }
    }

    if (!tmdbId) return null;

    // 3. Fetch full details with credits, recommendations, similar, videos, images, external_ids in ONE request
    const detailRes = await fetch(
      `${BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,recommendations,similar,videos,images,external_ids`
    );
    if (!detailRes.ok) return null;

    const data = await detailRes.json();

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
    const directors = (data.credits?.crew || [])
      .filter((c: any) => c.job === "Director")
      .map((c: any) => c.name);
    const creators = (data.created_by || []).map((c: any) => c.name);

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
      validVideos.find((v: any) => v.type === "Teaser" || v.type === "Clip") ||
      validVideos[0];
    if (trailerItem && trailerItem.key) {
      trailerEmbed = `https://www.youtube-nocookie.com/embed/${trailerItem.key}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
      trailerUrl = `https://www.youtube.com/watch?v=${trailerItem.key}`;
    }

    // Parse screenshots / backdrops
    const rawBackdrops = data.images?.backdrops || [];
    const screenshots: string[] = rawBackdrops
      .slice(0, 10)
      .map((b: any) => `${IMG_BASE_ORIGINAL}${b.file_path}`)
      .filter(Boolean);

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

    return {
      id: data.id,
      title: data.title || data.name,
      backdropUrl: data.backdrop_path ? `${IMG_BASE_ORIGINAL}${data.backdrop_path}` : null,
      posterUrl: data.poster_path ? `${IMG_BASE_W500}${data.poster_path}` : null,
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
      directors,
      creators,
      episodesCount,
      spokenLanguages,
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

