/**
 * OlaMovies (v6.olamovies.mov) - Catalog Module
 * Provides categories for highest quality UHD movies and series
 */

const catalog = [
  { title: 'Trending', filter: 'trending' },
  { title: 'Movies', filter: 'movies' },
  { title: 'TV Series', filter: 'tv-series' },
  { title: 'TV Shows', filter: 'tv-shows' },
  { title: '4K / 2160p UHD', filter: 'quality-2160p' },
  { title: '1080p Full HD', filter: 'quality-1080p' },
  { title: '720p HD', filter: 'quality-720p' },
];

const genres = [];

module.exports = { catalog, genres };
