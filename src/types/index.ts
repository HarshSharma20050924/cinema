export interface Provider {
  name: string;
  value: string;
  version: string;
  icon?: string;
  type: string;
  disabled?: boolean;
}

export interface CatalogFilter {
  title: string;
  filter: string;
}

export interface CatalogData {
  catalog: CatalogFilter[];
  genres: CatalogFilter[];
  all: CatalogFilter[];
}

export interface Post {
  title: string;
  link: string;
  image: string;
  tag?: string;
  provider?: string;
  providerName?: string;
  rating?: string;
  year?: string;
  backdropUrl?: string;
  overview?: string;
  description?: string;
  genres?: string;
  seasons?: string;
  certification?: string;
  mediaType?: "movie" | "tv";
  logoUrl?: string;
  tmdbId?: number;
  isDirectDeepLink?: boolean;
}

export interface DirectLink {
  title: string;
  link: string;
  type?: string;
  servers?: { server: string; link: string }[];
}

export interface LinkGroup {
  title: string;
  quality?: string;
  dub?: string;
  season?: number;
  directLinks: DirectLink[];
}

export interface MediaDetails {
  title: string;
  synopsis?: string;
  image?: string;
  poster?: string;
  imdbId?: string;
  tags?: string[];
  type?: "movie" | "series" | string;
  linkList?: LinkGroup[];
  seasonPacks?: LinkGroup[];
  webUrl?: string;
  screenshots?: string[];
  trailerUrl?: string;
  trailerEmbed?: string;
  rating?: string;
  year?: string;
  runtime?: string;
  genre?: string;
  quality?: string;
  backdrop?: string;
}

export interface StreamItem {
  server: string;
  link: string;
  type?: string;
  quality?: string;
  headers?: Record<string, string>;
  subtitles?: any[];
}

export type ExternalPlayerType = "web" | "vlc" | "mpv" | "mx" | "custom";

export interface UserSettings {
  cinemaName: string;
  providerSource: string;
  installedExtensions: string[];
  defaultPlayer: ExternalPlayerType;
  customPlayerScheme: string;
  isConfigured: boolean;
}
