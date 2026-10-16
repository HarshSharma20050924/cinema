import type { CategoryFilter, RankedItem } from "./types";
export { IMDB_RANKINGS, LETTERBOXD_RANKINGS } from "../../data/rankingsData";

export const TOP250_CATEGORIES: CategoryFilter[] = [
  { id: "movies", label: "Top 250 Movies" },
  { id: "tv", label: "Top 250 TV Shows" },
  { id: "anime", label: "Top 250 Anime" },
  { id: "horror", label: "Top 250 Horror" },
  { id: "scifi", label: "Top 250 Sci-Fi" },
  { id: "action", label: "Top 250 Action" },
  { id: "comedy", label: "Top 250 Comedy" },
  { id: "romance", label: "Top 250 Romance" },
  { id: "bollywood", label: "Top 250 Bollywood" },
  { id: "south", label: "Top 250 South Indian" },
  { id: "korean", label: "Top 250 K-Drama" },
];

export const LETTERBOXD_DECADES: CategoryFilter[] = [
  { id: "all", label: "Any decade" },
  { id: "upcoming", label: "Upcoming" },
  { id: "2020s", label: "2020s" },
  { id: "2010s", label: "2010s" },
  { id: "2000s", label: "2000s" },
  { id: "1990s", label: "1990s" },
  { id: "1980s", label: "1980s" },
  { id: "1970s", label: "1970s" },
  { id: "1960s", label: "1960s" },
  { id: "1950s", label: "1950s" },
  { id: "1940s", label: "1940s" },
  { id: "1930s", label: "1930s" },
  { id: "1920s", label: "1920s" },
  { id: "1910s", label: "1910s" },
  { id: "1900s", label: "1900s" },
  { id: "1890s", label: "1890s" },
  { id: "1880s", label: "1880s" },
  { id: "1870s", label: "1870s" },
  { id: "1860s", label: "1860s" },
];

export const LETTERBOXD_GENRES: CategoryFilter[] = [
  { id: "all", label: "Any genre" },
  { id: "action", label: "Action" },
  { id: "adventure", label: "Adventure" },
  { id: "animation", label: "Animation" },
  { id: "comedy", label: "Comedy" },
  { id: "crime", label: "Crime" },
  { id: "documentary", label: "Documentary" },
  { id: "drama", label: "Drama" },
  { id: "family", label: "Family" },
  { id: "fantasy", label: "Fantasy" },
  { id: "history", label: "History" },
  { id: "horror", label: "Horror" },
  { id: "music", label: "Music" },
  { id: "mystery", label: "Mystery" },
  { id: "romance", label: "Romance" },
  { id: "science-fiction", label: "Science Fiction" },
  { id: "thriller", label: "Thriller" },
  { id: "tv-movie", label: "TV Movie" },
  { id: "war", label: "War" },
  { id: "western", label: "Western" },
];

export const IMDB_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "rank", label: "Official IMDb Rank (#1-250)" },
  { value: "highest", label: "Highest Rated (IMDb 10-Point)" },
  { value: "lowest", label: "Lowest Rated" },
  { value: "votes", label: "Most Voted" },
  { value: "year-desc", label: "Newest First" },
  { value: "year-asc", label: "Oldest First" },
];

export const DEDICATED_IMDB_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "highest", label: "Highest Rated (IMDb 10-Point)" },
  { value: "votes", label: "Most Popular / Voted" },
  { value: "year-desc", label: "Release Date: Newest First" },
  { value: "year-asc", label: "Release Date: Oldest First" },
  { value: "lowest", label: "Lowest Rated" },
];

export const LETTERBOXD_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "rating-highest", label: "Average Rating: Highest First" },
  { value: "rating-lowest", label: "Average Rating: Lowest First" },
  { value: "popular-all", label: "Film Popularity: All Time" },
  { value: "popular-week", label: "Film Popularity: This Week" },
  { value: "popular-month", label: "Film Popularity: This Month" },
  { value: "popular-year", label: "Film Popularity: This Year" },
  { value: "release-newest", label: "Release Date: Newest First" },
  { value: "release-earliest", label: "Release Date: Earliest First" },
  { value: "length-shortest", label: "Film Length: Shortest First" },
  { value: "length-longest", label: "Film Length: Longest First" },
  { value: "name-az", label: "Film Name: A to Z" },
];

export function parseVotes(v?: string): number {
  if (!v) return 0;
  if (v.includes("M")) return parseFloat(v) * 1_000_000;
  if (v.includes("K")) return parseFloat(v) * 1_000;
  return parseFloat(v) || 0;
}

export function parseRuntimeMinutes(r?: string): number {
  if (!r) return 120;
  let total = 0;
  const h = r.match(/(\d+)\s*h/);
  const m = r.match(/(\d+)\s*m/);
  if (h) total += parseInt(h[1], 10) * 60;
  if (m) total += parseInt(m[1], 10);
  return total || 120;
}

/**
 * Resolves effective ratings for an item so that neither IMDb mode nor
 * Letterboxd mode ever shows an empty dash ("—") rating on badges or hover.
 */
export function getEffectiveRatings(item: RankedItem): {
  imdbRatingStr: string;
  letterboxdRatingStr: string;
  rawImdb: number;
  rawLetterboxd: number;
} {
  let rawLb = item.letterboxdRating;
  let rawImdb = item.imdbRating;

  if (rawLb != null && rawImdb == null) {
    rawImdb = Math.min(9.9, Math.round(rawLb * 2 * 10) / 10);
  } else if (rawImdb != null && rawLb == null) {
    rawLb = Math.min(5.0, Math.round((rawImdb / 2) * 10) / 10);
  }

  // Final fallback to generic rating or 8.0/4.0
  if (rawImdb == null) {
    const fallback = (item as any).rating || (item.rank ? Math.max(7.2, 9.3 - item.rank * 0.008) : 8.0);
    rawImdb = Math.round(fallback * 10) / 10;
    rawLb = Math.min(5.0, Math.round((rawImdb / 2) * 10) / 10);
  }
  if (rawLb == null) {
    rawLb = Math.min(5.0, Math.round((rawImdb / 2) * 10) / 10);
  }

  return {
    imdbRatingStr: rawImdb.toFixed(1),
    letterboxdRatingStr: rawLb.toFixed(1),
    rawImdb,
    rawLetterboxd: rawLb,
  };
}
