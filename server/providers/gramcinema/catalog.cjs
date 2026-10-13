/**
 * GramCinema (bollywood.eu.org) - Catalog Module
 * Provides categories for the TG Archive file provider
 */

const catalog = [
  { title: 'Trending', filter: 'trending' },
  { title: 'Bollywood Movies', filter: 'bollywood hindi 2024' },
  { title: 'Hollywood Movies', filter: 'english 2024' },
  { title: 'South Indian (Hindi)', filter: 'south hindi dubbed' },
  { title: 'Web Series', filter: 'web series hindi' },
  { title: 'Tamil & Telugu', filter: 'tamil telugu' },
  { title: 'Dual Audio', filter: 'dual audio hindi english' },
  { title: '4K / UHD', filter: '2160p uhd' },
];

const genres = [];

module.exports = { catalog, genres };
