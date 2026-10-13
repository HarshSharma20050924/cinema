/**
 * KatMovies - Catalog Module
 * Provides categories for KatMovieHD movies and web series
 */
const catalog = [
  { title: 'Latest Releases', filter: '' },
  { title: 'Hindi Dubbed', filter: 'category/hindi-dubbed' },
  { title: 'Dual Audio', filter: 'category/dual-audio' },
  { title: 'Web Series', filter: 'category/tv-series-dubbed' },
  { title: 'Bollywood Movies', filter: 'category/bollywood' },
  { title: '1080p Full HD', filter: 'category/1080p-movies' },
  { title: '4K UltraHD', filter: 'category/4k-2160p-movies' },
  { title: 'Anime Dubbed', filter: 'category/anime-dubbed' },
];

const genres = [
  { title: 'Action', filter: 'category/action' },
  { title: 'Adventure', filter: 'category/adventure' },
  { title: 'Comedy', filter: 'category/comedy' },
  { title: 'Crime', filter: 'category/crime' },
  { title: 'Drama', filter: 'category/drama' },
  { title: 'Horror', filter: 'category/horror' },
  { title: 'Sci-Fi', filter: 'category/sci-fi' },
  { title: 'Thriller', filter: 'category/thriller' },
];

module.exports = { catalog, genres };
