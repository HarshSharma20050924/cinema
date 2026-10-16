/**
 * ThePirateBay (tpb-google.pages.dev) - Catalog Module
 * Provides top torrent catalog categories for Cinema
 */

const catalog = [
  { title: 'Top 100 Movies & TV', filter: 'top100_video' },
  { title: 'Recent Torrents', filter: 'recent' },
  { title: '4K / UHD Movies', filter: '211' },
  { title: 'HD Movies (1080p)', filter: '207' },
  { title: 'HD TV Shows', filter: '208' },
];

const genres = [];

module.exports = { catalog, genres };
