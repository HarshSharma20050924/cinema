const express = require("express");
const { getProviders } = require("../controllers/providersController.cjs");
const { getCatalog } = require("../controllers/catalogController.cjs");
const { getPosts, searchPosts, globalSearch } = require("../controllers/postsController.cjs");
const { getMeta } = require("../controllers/metaController.cjs");
const { getStreams } = require("../controllers/streamController.cjs");
const { getRatings } = require("../controllers/ratingsController.cjs");
const { proxyStream, downloadFile, getPlaylistM3u } = require("../controllers/proxyController.cjs");
const { getPoster, proxyImage } = require("../controllers/posterController.cjs");

const router = express.Router();

router.get("/providers", getProviders);
router.get("/catalog", getCatalog);
router.get("/posts", getPosts);
router.get("/search", searchPosts);
router.get("/search/global", globalSearch);
router.get("/global-search", globalSearch);
router.get("/meta", getMeta);
router.get("/ratings", getRatings);
router.get("/streams", getStreams);
router.get("/poster", getPoster);
router.get("/image-proxy", proxyImage);
router.get("/proxy", proxyStream);
router.get("/download", downloadFile);
router.get("/playlist", getPlaylistM3u);
router.get("/playlist.m3u", getPlaylistM3u);

module.exports = router;
