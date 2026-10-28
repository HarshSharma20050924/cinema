/**
 * Resolves direct movie URLs and website homepages across all streaming providers.
 */

export const PROVIDER_DOMAINS: Record<string, string> = {
  vega: "https://new1.vegamovies.lease",
  vegamovies: "https://new1.vegamovies.lease",
  drive: "https://new3.moviesdrive.beer",
  moviesdrive: "https://new3.moviesdrive.beer",
  moviesmod: "https://moviesmod.uk.com",
  mod: "https://moviesmod.uk.com",
  hdhub: "https://new8.hdhub4u.cl",
  hdhub4u: "https://new8.hdhub4u.cl",
  moviebox: "https://officialmoviebox.com",
  movieboxweb: "https://officialmoviebox.com",
  "4khdhub": "https://4khdhub.one",
  "4khdhub4u": "https://4khdhub.one",
  kat: "https://new.katmoviehd.top",
  katmovies: "https://new.katmoviehd.top",
  katmoviehd: "https://new.katmoviehd.top",
  multi: "https://m1.multimovies.courses",
  multimovies: "https://m1.multimovies.courses",
  topmovies: "https://moviesleech.club",
  uhdmovies: "https://uhdmovies.us.org",
  uhd: "https://uhdmovies.us.org",
  cinemaluxe: "https://cinemaluxe.one",
  extramovies: "https://extramovies.ist",
  extra: "https://extramovies.ist",
  bollyflix: "https://bollyflix.vip",
  moviesflix: "https://moviesflix.is",
  world4ufree: "https://world4ufree.vet",
  world4u: "https://world4ufree.vet",
  skymovieshd: "https://skymovieshd.ink",
  luxmovies: "https://luxmovies.link",
  eonmovies: "https://eonmovies.ink",
  cinevood: "https://1cinevood.lol",
  "1cinevood": "https://1cinevood.lol",
  movies4u: "https://movies4u.vip",
  filmyfly: "https://filmyfly.mov",
  moviezwap: "https://moviezwap.org",
  zeefliz: "https://zeefliz.ink",

  // Hollywood & OTT Series
  showbox: "https://officialmoviebox.com",
  gokuhd: "https://goku.sx",
  goku: "https://goku.sx",
  protonmovies: "https://protonmovies.lat",
  ridomovies: "https://ridomovies.tv",
  flixhq: "https://flixhq.to",
  netflixmirror: "https://net52.cc",
  disneymirror: "https://net52.cc",
  primemirror: "https://net52.cc",
  castle: "https://castletv.xyz",
  mxplayer: "https://www.mxplayer.in",

  // Anime & Asian Drama
  hianime: "https://hianime.to",
  kisskh: "https://kisskh.co",
  gogoanime: "https://anitaku.so",
  animerulz: "https://animerulz.cc",
  animesalt: "https://animesalt.cc",
  animeworld: "https://animeworld.ac",
  anikoto: "https://anikoto.com",
  dramacool: "https://dramacool.ch",
  kickassanime: "https://kickassanime.mx",

  // Torrents
  thepiratebay: "https://thepiratebay.org",
  tpb: "https://thepiratebay.org",
  yts: "https://yts.mx",
  "1337x": "https://1337x.to",
};

/**
 * Resolves a full external URL pointing directly to the actual movie page
 * on the provider's website.
 */
export function resolveDirectMovieUrl(provider?: string | null, link?: string | null): string | null {
  if (link && (link.startsWith("http://") || link.startsWith("https://"))) {
    return link;
  }

  const cleanProv = (provider || "").toLowerCase().trim();
  const domain = PROVIDER_DOMAINS[cleanProv] || PROVIDER_DOMAINS["hdhub4u"];

  if (link && link.trim().length > 0) {
    const trimmed = link.trim();
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${domain.replace(/\/+$/, "")}${cleanPath}`;
  }

  return domain || null;
}
