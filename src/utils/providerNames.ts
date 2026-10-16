export const DEFAULT_PROVIDER_NAMES: Record<string, string> = {
  tpb: "ThePirateBay",
  thepiratebay: "ThePirateBay",
  hdhub4u: "HDHub4u",
  olamovies: "OlaMovies",
  gramcinema: "Gram Cinema",
  vega: "VMovies",
  topmovies: "TopMovies",
  moviesmod: "MoviesMod",
  katmovies: "KatMoviesHD",
  katmoviehd: "KatMovieHD",
  katmoviefix: "KatMovieFix",
  kisskh: "KissKH",
  animepahe: "AnimePahe",
  luxmovies: "LuxMovies",
  mod: "MoviesMod",
  extra: "ExtraMovies",
  cine: "Cinevood",
  moviebox: "MovieBox",
  movieboxweb: "MovieBox",
  autoembed: "AutoEmbed",
  allmoviesforyou: "AllMoviesForYou",
  uhd: "UHDMovies",
  top: "TopMovies",
  ringz: "RingoMovies",
  showbox: "ShowBox",
  streamio: "Streamio",
};

export function getProviderDisplayName(key?: string, fallback?: string): string {
  const cleanKey = (key || "").toLowerCase().trim();
  if (cleanKey && DEFAULT_PROVIDER_NAMES[cleanKey]) {
    return DEFAULT_PROVIDER_NAMES[cleanKey];
  }
  if (fallback && fallback !== "Other Extensions" && fallback !== key) {
    return fallback;
  }
  if (key && key.trim()) {
    const k = key.trim();
    return k.charAt(0).toUpperCase() + k.slice(1);
  }
  return fallback || "Other Extensions";
}
