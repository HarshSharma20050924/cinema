/**
 * OlaMovies (v6.olamovies.mov) - Stream Module
 * Provides stream/download links for OlaMovies releases
 */

async function getStream({ link }) {
  if (!link) return [];

  return [
    {
      server: 'OlaMovies Cloud (Fast Direct)',
      link,
      type: 'direct',
      quality: '1080p',
    },
  ];
}

module.exports = { getStream };
