export interface CnoMedia {
  id: string;
  title: string;
  subtitle?: string;
  type: "movie" | "show";
  year: number | string;
  rating?: string; // e.g. "R", "PG-13", "TV-MA"
  score?: number; // e.g. 8.0
  likedPercent?: number; // e.g. 89
  runtime?: string; // e.g. "2h 2m", "3 Seasons"
  genres: string[];
  overview: string;
  backdrop: string;
  poster: string;
  logo?: string;
  rank?: number;
  progress?: number; // 0 to 100 for continue watching
  timeLeft?: string; // "1h 39m left"
  starring?: string[];
  creators?: string[];
  directors?: string[];
  trailerUrl?: string;
  topics?: string[];
  whereToWatch?: {
    stream?: string[];
    free?: string[];
    rent?: string[];
    buy?: string[];
  };
  reviews?: {
    user: string;
    avatar: string;
    date: string;
    rating: number;
    text: string;
  }[];
  episodes?: CnoEpisode[];
  seasons?: number;
  about?: {
    tagline?: string;
    released?: string;
    language?: string;
    budget?: string;
    boxOffice?: string;
    studios?: string;
    countries?: string;
    imdbId?: string;
    tmdbId?: string;
  };
  // Underlying Cinema backend integration
  backendProvider?: string;
  backendLink?: string;
}

export interface CnoEpisode {
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  runtime: string;
  overview: string;
  thumbnail: string;
  rating?: number;
  streamUrl?: string;
}

export type CnoNavTab = "home" | "movies" | "shows" | "coming_soon" | "my_list";

export const CNO_VERSION = "1.0.0";
