const express = require("express");
const { getProviders } = require("../controllers/providersController.cjs");
const { getCatalog } = require("../controllers/catalogController.cjs");
const { getPosts, searchPosts, globalSearch } = require("../controllers/postsController.cjs");
const { getMeta } = require("../controllers/metaController.cjs");
const { getStreams } = require("../controllers/streamController.cjs");
const { getRatings } = require("../controllers/ratingsController.cjs");
const { getEpisodes } = require("../controllers/episodesController.cjs");
const { proxyStream, downloadFile, getPlaylistM3u } = require("../controllers/proxyController.cjs");
const { getPoster, proxyImage } = require("../controllers/posterController.cjs");
const { getLetterboxdFilms } = require("../controllers/letterboxdController.cjs");
const { getImdbFilms } = require("../controllers/imdbController.cjs");

const router = express.Router();

router.get("/providers", getProviders);
router.get("/catalog", getCatalog);
router.get("/posts", getPosts);
router.get("/search", searchPosts);
router.get("/search/global", globalSearch);
router.get("/global-search", globalSearch);
router.get("/meta", getMeta);
router.get("/episodes", getEpisodes);
router.get("/ratings", getRatings);
router.get("/letterboxd", getLetterboxdFilms);
router.get("/letterboxd/films", getLetterboxdFilms);
router.get("/imdb", getImdbFilms);
router.get("/imdb/films", getImdbFilms);
router.get("/streams", getStreams);
router.get("/poster", getPoster);
router.get("/image-proxy", proxyImage);
router.get("/proxy", proxyStream);
router.get("/download", downloadFile);
router.get("/stream/torrent", async (req, res) => {
  const hash = req.query.hash || req.query.infoHash;
  const name = req.query.name || '';
  if (!hash) return res.status(400).send("infoHash parameter required");
  const torrentService = require("../services/torrentService.cjs");
  await torrentService.handleStream(req, res, hash, name);
});
router.get("/torrent/download", async (req, res) => {
  const hash = req.query.hash || req.query.infoHash;
  const name = req.query.name || '';
  if (!hash) return res.status(400).send("infoHash parameter required");
  const torrentService = require("../services/torrentService.cjs");
  await torrentService.handleDownload(req, res, hash, name);
});
router.get("/playlist", getPlaylistM3u);
router.get("/playlist.m3u", getPlaylistM3u);

const { playInVlc } = require("../controllers/vlcController.cjs");
router.post("/play-vlc", playInVlc);
router.get("/play-vlc", playInVlc);

// Residential IP Fetch Relay (Used by Render Primary Server to route scrapes via Phone's Wi-Fi)
const { relayFetch } = require("../controllers/fetchController.cjs");
router.get("/fetch", relayFetch);
router.post("/fetch", relayFetch);
router.get("/relay", relayFetch);
// Scraper Studio & Extension Manager Workbench API
const { handleDeepCrawl, getExtensionCatalog, testCustomWebsite } = require("../controllers/scraperController.cjs");
router.post("/scraper/crawl", handleDeepCrawl);
router.get("/scraper/crawl", handleDeepCrawl);
router.get("/scraper/extensions", getExtensionCatalog);
router.post("/scraper/test-custom", testCustomWebsite);

module.exports = router;

