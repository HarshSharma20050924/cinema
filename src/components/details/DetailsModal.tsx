import React, { useState, useEffect, useRef } from "react";
import { fetchTMDBDetails, type TMDBDetails } from "../../api/tmdb";
import { api, getBackendUrl } from "../../api/client";
import { parseTitleAndYear, backdropCache, persistBackdrop } from "../media/MediaCard";
import { Navbar } from "../layout/Navbar";
import { appCache } from "../../utils/cache";
import { isValidStreamUrl, isLandingPageUrl, isDirectMediaUrl } from "./linkHelpers";
import { getSeasonDisplayInfo } from "../../utils/seasonUtils";
import { upgradeToHighRes } from "../hero/HeroSpotlight";
import { DetailsHero } from "./DetailsHero";
import { DetailsLinksDrawer } from "./DetailsLinksDrawer";
import { DetailsEpisodesGrid } from "./DetailsEpisodesGrid";
import { DetailsScreenshots } from "./DetailsScreenshots";
import { DetailsTrailer } from "./DetailsTrailer";
import { DetailsCast } from "./DetailsCast";
import { DetailsTopics } from "./DetailsTopics";
import { DetailsWhereToWatch } from "./DetailsWhereToWatch";
import { DetailsRecommendations } from "./DetailsRecommendations";
import { DetailsReviews } from "./DetailsReviews";
import { DetailsAbout } from "./DetailsAbout";
import { MoreLinksModal, type MoreLinksModalData } from "./MoreLinksModal";
import { ScreenshotLightboxModal } from "./ScreenshotLightboxModal";
import { downloadManager } from "../../utils/downloadManager";
import { DownloadManagerModal } from "../downloads/DownloadManagerModal";
import { UniversalDownloadsModal } from "./UniversalDownloadsModal";
import { ArrowLeftIcon } from "../../icons";
import { SeriesRatingsHeatmap } from "./SeriesRatingsHeatmap";
import { aggregateUniversalLinks, normalizeRawLinks, type NormalizedServerLink } from "../../utils/universalSourcesEngine";
import type { Post, MediaDetails, StreamItem, Provider, ExternalPlayerType } from "../../types";

export interface DetailsModalProps {
  post: Post | null;
  details: MediaDetails | null;
  loadingDetails: boolean;
  streams: StreamItem[];
  loadingStreams: boolean;
  activeProvider: Provider | null;
  providers: Provider[];
  onSelectProvider: (provider: Provider) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isGlobalSearch: boolean;
  onToggleGlobalSearch: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
  onSelectCategoryNav?: (type: "home" | "movies" | "tv" | "categories") => void;
  activeNavTab?: string;
  onPlayStream: (
    url: string,
    title?: string,
    servers?: StreamItem[],
    backdrop?: string,
    poster?: string,
    runtime?: string | number,
    season?: number,
    episode?: number,
    episodes?: any[],
    seasonsCount?: number,
    tmdbId?: number
  ) => void;
  onPlayExternal?: (url: string, player: ExternalPlayerType) => void;
  onSelectRecommended?: (post: Post) => void;
  onSelectPerson?: (personId: number) => void;
  onSearchGlobal?: (title: string) => void;
  defaultPlayer?: ExternalPlayerType;
  initialTab?: "stream" | "download" | null;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({
  post,
  details,
  loadingDetails,
  streams,
  loadingStreams,
  activeProvider,
  providers,
  onSelectProvider,
  searchQuery,
  onSearchChange,
  isGlobalSearch,
  onToggleGlobalSearch,
  onOpenSettings,
  onGoHome,
  onSelectCategoryNav,
  activeNavTab,
  onClose,
  onPlayStream,
  onPlayExternal,
  onSelectRecommended,
  onSelectPerson,
  onSearchGlobal,
  defaultPlayer,
  initialTab,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "download" | null>(initialTab ?? null);

  useEffect(() => {
    if (initialTab !== undefined) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(0);
  const [tmdb, setTmdb] = useState<TMDBDetails | null>(null);

  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [streamingKey, setStreamingKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [resolvingKeys, setResolvingKeys] = useState<Record<string, boolean>>({});
  const [isScanningMirrors, setIsScanningMirrors] = useState<boolean>(false);
  const [releaseServers, setReleaseServers] = useState<Record<string, StreamItem[]>>({});
  const [moreLinksData, setMoreLinksData] = useState<MoreLinksModalData | null>(null);
  const [universalLinks, setUniversalLinks] = useState<NormalizedServerLink[]>([]);
  const [loadingUniversalLinks, setLoadingUniversalLinks] = useState(false);
  const [showRatingsHeatmap, setShowRatingsHeatmap] = useState<boolean>(true);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);

  // Fullscreen landscape poster transition on click into details hero (direct settle on page reload)
  const [heroIntroStage, setHeroIntroStage] = useState<"fullscreen" | "fitting" | "settled">(() => {
    if (typeof window !== "undefined") {
      if ((post as any)?.isDirectDeepLink) return "settled";
    }
    return "fullscreen";
  });

  useEffect(() => {
    if ((post as any)?.isDirectDeepLink) {
      setHeroIntroStage("settled");
      return;
    }
    setHeroIntroStage("fullscreen");
    const t = setTimeout(() => {
      setHeroIntroStage("settled");
    }, 400);
    return () => clearTimeout(t);
  }, [post?.link, post?.title]);

  // Multi-extension parallel aggregator for stream & download servers (glitch-free single continuous load)
  const loadedUniversalRef = useRef<string>("");
  const movieKey = (post?.link || post?.title || "").toLowerCase().trim();

  useEffect(() => {
    if (loadedUniversalRef.current !== movieKey) {
      loadedUniversalRef.current = "";
      setUniversalLinks([]);
    }
  }, [movieKey]);

  useEffect(() => {
    if (!post || !movieKey) return;
    if (loadedUniversalRef.current === movieKey && universalLinks.length > 0) return;
    loadedUniversalRef.current = movieKey;

    let mounted = true;
    async function loadUniversalSources() {
      if (universalLinks.length === 0) {
        setLoadingUniversalLinks(true);
      }
      try {
        if (streams && streams.length > 0) {
          const localNormalized = normalizeRawLinks(streams, post?.provider || activeProvider?.value || "server");
          if (mounted && localNormalized.length > 0) {
            setUniversalLinks(localNormalized);
          }
        }

        const queryTitle = details?.title || post?.title || "";
        const multiLinks = await aggregateUniversalLinks(
          queryTitle,
          (details as any)?.isSeries || tmdb?.mediaType === "tv" ? "tv" : "movie",
          providers,
          (chunk) => {
            if (!mounted || chunk.length === 0) return;
            setUniversalLinks((prev) => {
              const seen = new Set(prev.map((p) => p.url));
              const merged = [...prev];
              for (const l of chunk) {
                if (!seen.has(l.url)) {
                  seen.add(l.url);
                  merged.push(l);
                }
              }
              return merged;
            });
            setLoadingUniversalLinks(false);
          }
        );
        if (mounted && multiLinks.length > 0) {
          setUniversalLinks((prev) => {
            const seen = new Set(prev.map((p) => p.url));
            const merged = [...prev];
            for (const l of multiLinks) {
              if (!seen.has(l.url)) {
                seen.add(l.url);
                merged.push(l);
              }
            }
            return merged.length > 0 ? merged : multiLinks;
          });
        }
      } catch {
        // Fallback
      } finally {
        if (mounted) setLoadingUniversalLinks(false);
      }
    }
    loadUniversalSources();
    return () => {
      mounted = false;
    };
  }, [movieKey]);

  // Screenshots lightbox viewer state
  const [selectedScreenshotIdx, setSelectedScreenshotIdx] = useState<number | null>(null);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);

  // Letterboxd rating state and image loading placeholders
  const [letterboxd, setLetterboxd] = useState<{
    letterboxdRating: string | null;
    letterboxdUrl: string | null;
  } | null>(null);
  const [heroPosterLoaded, setHeroPosterLoaded] = useState(false);
  const [backdropLoaded, setBackdropLoaded] = useState(false);

  // Real release screenshots from details; fallback to TMDB backdrops only if provider has none
  const allScreenshots: string[] = (
    details?.screenshots && details.screenshots.length > 0
      ? details.screenshots
      : tmdb?.screenshots && tmdb.screenshots.length > 0
      ? tmdb.screenshots
      : []
  ).filter((s) => typeof s === "string" && s.trim().length > 0);

  const activeTrailerEmbed = details?.trailerEmbed || tmdb?.trailerEmbed || null;
  const activeTrailerUrl = details?.trailerUrl || tmdb?.trailerUrl || null;

  const { title: cleanTitle } = parseTitleAndYear(post?.title || "");

  // Lock body scroll only while detail page is open
  useEffect(() => {
    if (!post) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [post]);

  // When post changes (including from recommendations), scroll container to the top immediately!
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "instant" });
      containerRef.current.scrollTop = 0;
    }
    const container = document.getElementById("cinema-details-scroll-container");
    if (container) {
      container.scrollTo({ top: 0, behavior: "instant" });
      container.scrollTop = 0;
    }
    setActiveTab(null);
    setSelectedSeasonIdx(0);
    setSelectedScreenshotIdx(null);
    setResolvingKey(null);
    setResolvingKeys({});
    setIsScanningMirrors(false);
    setReleaseServers({});
    setHeroPosterLoaded(false);
    setBackdropLoaded(false);
    setLetterboxd(null);
  }, [post?.link, post?.title]);

  // Fetch TMDB metadata on post/details change
  useEffect(() => {
    if (!post?.title && !details?.title) {
      setTmdb(null);
      return;
    }

    let isCurrent = true;
    const titleToSearch = details?.title || cleanTitle || post?.title || "";
    const explicitTmdbId = (post as any)?.tmdbId || (details as any)?.tmdbId || undefined;
    const explicitYear =
      details?.year ||
      (post?.year && String(post.year).match(/\b(19\d{2}|20\d{2})\b/)?.[0]) ||
      (post?.title?.match(/\b(19\d{2}|20\d{2})\b/)?.[0]) ||
      undefined;

    const detectedType: "movie" | "tv" =
      isSeries || (post as any)?.mediaType === "tv" || (details as any)?.mediaType === "tv"
        ? "tv"
        : "movie";

    fetchTMDBDetails(titleToSearch, details?.imdbId, explicitYear, explicitTmdbId, detectedType)
      .then((data) => {
        if (isCurrent && data) {
          setTmdb(data);
          if (data.backdropUrl && cleanTitle) {
            persistBackdrop(cleanTitle, data.backdropUrl);
          }
        }
      })
      .catch((err) => console.warn("TMDB details fetch error:", err));

    return () => {
      isCurrent = false;
    };
  }, [post?.title, details?.title, details?.imdbId, cleanTitle]);

  // Letterboxd rating fetch on metadata change
  const effectiveImdbId =
    tmdb?.imdbId ||
    details?.imdbId ||
    (details?.webUrl?.match(/tt\d+/)?.[0]) ||
    null;
  const effectiveTitle = details?.title || cleanTitle || post?.title || "";

  useEffect(() => {
    if (!effectiveImdbId && !effectiveTitle) {
      setLetterboxd(null);
      return;
    }
    let isCurrent = true;
    api
      .getRatings(effectiveImdbId || undefined, effectiveTitle || undefined)
      .then((data) => {
        if (isCurrent && data) {
          setLetterboxd(data);
        }
      })
      .catch((err) => console.warn("Letterboxd rating fetch error:", err));

    return () => {
      isCurrent = false;
    };
  }, [effectiveImdbId, effectiveTitle]);

  const linkList = details?.linkList || [];
  const targetProviderKey = post?.provider || activeProvider?.value || "provider";

  if (!post) return null;

  // Detect season information from post title if available (e.g. "Game of Thrones (Season 8)")
  const seasonMatch = post.title?.match(/\b(?:season\s*|s0*)(\d+)\b/i);
  const seasonNum = seasonMatch ? seasonMatch[1] : null;

  // Content metadata resolution: authentic provider title always takes precedence
  const baseTitle = details?.title || post.title || tmdb?.title || cleanTitle;
  const displayTitle = seasonNum && !baseTitle.toLowerCase().includes(`season ${seasonNum}`)
    ? `${baseTitle} - Season ${seasonNum}`
    : baseTitle;

  // Strict landscape backdrop resolution:
  // Under NO circumstances should a vertical 2:3 portrait poster be used as a backdrop!
  const knownPortraitUrls = new Set(
    [
      details?.poster?.trim(),
      details?.image?.trim(),
      post?.image?.trim(),
      tmdb?.posterUrl?.trim(),
    ].filter(Boolean) as string[]
  );

  const isLegitLandscape = (url?: string | null): boolean => {
    if (!url) return false;
    const clean = url.trim();
    if (!clean) return false;
    if (knownPortraitUrls.has(clean)) return false;
    return true;
  };

  const rawBackdrop =
    (tmdb?.backdropUrl && isLegitLandscape(tmdb.backdropUrl) && tmdb.backdropUrl.trim()) ||
    (post.backdropUrl && isLegitLandscape(post.backdropUrl) && post.backdropUrl.trim()) ||
    (cleanTitle && isLegitLandscape(backdropCache.get(cleanTitle.toLowerCase())) && backdropCache.get(cleanTitle.toLowerCase())) ||
    (details?.backdrop && isLegitLandscape(details.backdrop) && details.backdrop.trim()) ||
    "";
  const backdropImage = rawBackdrop ? upgradeToHighRes(rawBackdrop) : "";

  const posterImage =
    (details?.poster && details.poster.trim()) ||
    (details?.image && details.image.trim()) ||
    (post.image && post.image.trim()) ||
    (tmdb?.posterUrl && tmdb.posterUrl.trim()) ||
    "";

  // Robust series detection across all providers
  const isSeries =
    details?.type === "series" ||
    details?.type === "tv" ||
    details?.type === "tvseries" ||
    details?.type === "tv_series" ||
    (details as any)?.mediaType === "tv" ||
    (post as any)?.mediaType === "tv" ||
    tmdb?.mediaType === "tv" ||
    Boolean(details?.seasonPacks && details.seasonPacks.length > 0) ||
    Boolean(details?.type !== "movie" && (
      /\bseason\s*\d|\bepisode\s*\d|\bep\s*\d|\bs\d{1,2}\s*e\d{1,2}\b/i.test(post?.title || "") ||
      /\bseason\s*\d|\bepisode\s*\d|\bep\s*\d|\bs\d{1,2}\s*e\d{1,2}\b/i.test(details?.title || "") ||
      linkList.some(
        (group) =>
          /season\s*\d|s\d+|episodes?|eps?\b/i.test(group.title || "") ||
          (Array.isArray(group.directLinks) && group.directLinks.length > 2)
      )
    ));

  // Season resolution
  const validSeasonIdx =
    selectedSeasonIdx >= 0 && selectedSeasonIdx < linkList.length ? selectedSeasonIdx : 0;
  // Auto-select Hindi dub season if available and user is on default index 0
  useEffect(() => {
    if (linkList.length > 1 && selectedSeasonIdx === 0) {
      const firstInfo = getSeasonDisplayInfo(linkList[0], 0);
      if (!firstInfo.dub.toLowerCase().includes("hindi")) {
        const hindiIdx = linkList.findIndex((s, idx) => {
          const info = getSeasonDisplayInfo(s, idx);
          return info.dub.toLowerCase().includes("hindi");
        });
        if (hindiIdx > 0) {
          setSelectedSeasonIdx(hindiIdx);
        }
      }
    }
  }, [linkList, selectedSeasonIdx]);

  const activeSeason = linkList.length > 0 ? linkList[validSeasonIdx] : null;

  // Dynamic episode fetching for providers with episodesLink (e.g. Netflix, Disney, Prime, Vega, MoviesDrive)
  const [fetchedEpisodes, setFetchedEpisodes] = useState<Record<string, any[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    const epLink = activeSeason?.episodesLink;
    if (epLink && (!activeSeason.directLinks || activeSeason.directLinks.length === 0)) {
      if (fetchedEpisodes[epLink]) return;
      setLoadingEpisodes(true);
      api
        .getEpisodes(targetProviderKey, epLink)
        .then((eps) => {
          if (Array.isArray(eps) && eps.length > 0) {
            setFetchedEpisodes((prev) => ({ ...prev, [epLink]: eps }));
          }
        })
        .finally(() => setLoadingEpisodes(false));
    }
  }, [activeSeason?.episodesLink, targetProviderKey]);

  // Single episodes
  const episodes = (Array.isArray(activeSeason?.directLinks) && activeSeason.directLinks.length > 0)
    ? activeSeason.directLinks
    : (activeSeason?.episodesLink && fetchedEpisodes[activeSeason.episodesLink]) || [];

  // Season packs
  const explicitPacks = details?.seasonPacks || [];
  const seasonPacks = explicitPacks.length > 0
    ? explicitPacks
    : linkList.filter((g) =>
        /pack|zip|batch|complete\s*season/i.test(g.title || "") && (!Array.isArray(g.directLinks) || g.directLinks.length <= 1)
      );

  // Fetch servers for link with caching
  const fetchServersForLink = async (key: string, link: string, forceRefresh = false): Promise<StreamItem[]> => {
    if (!forceRefresh && releaseServers[key] && releaseServers[key].length > 0) {
      const valid = releaseServers[key].filter(s => isValidStreamUrl(s.link) && !isLandingPageUrl(s.link));
      if (valid.length > 0) return valid;
    }
    if (!link) return [];

    const cacheKey = `mirrors:${targetProviderKey}:${link}`;
    if (!forceRefresh) {
      const cached = appCache.get<StreamItem[]>(cacheKey);
      if (cached && cached.length > 0) {
        const valid = cached.filter(s => isValidStreamUrl(s.link) && !isLandingPageUrl(s.link));
        if (valid.length > 0) {
          setReleaseServers((prev) => ({ ...prev, [key]: valid }));
          return valid;
        }
      }
    }

    setResolvingKey(key);
    setResolvingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      const backendUrl = getBackendUrl();
      const titleParam = encodeURIComponent(displayTitle || details?.title || post?.title || "");
      const seasonParam = activeSeason?.season || 1;
      const res = await fetch(
        `${backendUrl}/api/streams?provider=${encodeURIComponent(
          targetProviderKey
        )}&link=${encodeURIComponent(link)}&type=${isSeries ? "series" : "movie"}&download=true&title=${titleParam}&season=${seasonParam}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StreamItem[] = await res.json();
      
      const list = Array.isArray(data)
        ? data.filter(s => isValidStreamUrl(s.link) && !isLandingPageUrl(s.link))
        : [];
      
      let finalList: StreamItem[] = [];
      if (list.length > 0) {
        finalList = list;
        appCache.set(cacheKey, finalList, 3 * 60 * 1000);
      } else if (isDirectMediaUrl(link)) {
        finalList = [
          {
            server: "Direct Stream",
            link,
            type: "m3u8",
          },
        ];
      }

      setReleaseServers((prev) => ({ ...prev, [key]: finalList }));
      return finalList;
    } catch (err) {
      console.warn(`Failed to resolve servers for ${key}:`, err);
      if (isDirectMediaUrl(link)) {
        const fallback = [{ server: "Direct Stream", link, type: "m3u8" as const }];
        setReleaseServers((prev) => ({ ...prev, [key]: fallback }));
        return fallback;
      }
      return [];
    } finally {
      setResolvingKey(null);
      setResolvingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Direct download handler for any mirror URL
  const handleDownloadDirectUrl = (url: string, serverName: string, label?: string, headers?: Record<string, string>) => {
    if (!url) return;

    // 0. Intermediate hosters & shortlink protectors (e.g. OlaMovies links.ol-am.top, katdrive, send.cm)
    if (isLandingPageUrl(url) || url.includes("links.ol-am.top") || url.includes("links.olamovies") || url.includes("ol-am.top") || url.includes("/locked?")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const isZip = url.includes(".zip") || (label && label.toLowerCase().includes("zip")) || (serverName && serverName.toLowerCase().includes("zip"));
    const ext = isZip ? ".zip" : ".mp4";
    const cleanFileName = `${displayTitle} - ${label || serverName}`.replace(/[^a-zA-Z0-9._-]/g, "_") + ext;
    const backendUrl = getBackendUrl();

    // 1. If it's a torrent magnet link, seamlessly convert to internal torrent engine download
    if (url.startsWith("magnet:")) {
      const hashMatch = url.match(/btih:([a-fA-F0-9]{32,40})/i);
      if (hashMatch) {
        const infoHash = hashMatch[1];
        const dlUrl = `${backendUrl}/api/torrent/download?hash=${infoHash}&name=${encodeURIComponent(cleanFileName)}`;
        downloadManager.startDownload(dlUrl, displayTitle, cleanFileName);
        if (typeof window !== "undefined" && (window as any).CinemaDesktop?.isDesktop) {
          setIsDownloadManagerOpen(true);
        }
        return;
      }
      window.location.href = url;
      return;
    }

    // 1.5. TPB direct link handling
    if (url.startsWith("tpb:")) {
      const parts = url.split(":");
      const infoHash = parts[2] || "";
      const encName = parts.slice(3).join(":") || encodeURIComponent(cleanFileName);
      const finalUrl = `${backendUrl}/api/torrent/download?hash=${infoHash}&name=${encName}`;
      downloadManager.startDownload(finalUrl, displayTitle, cleanFileName);
      if (typeof window !== "undefined" && (window as any).CinemaDesktop?.isDesktop) {
        setIsDownloadManagerOpen(true);
      }
      return;
    }

    // 2. Direct internal torrent download endpoint
    if (url.includes("/api/torrent/download")) {
      const finalUrl = url.startsWith("http") ? url : `${backendUrl}${url}`;
      downloadManager.startDownload(finalUrl, displayTitle, cleanFileName);
      if (typeof window !== "undefined" && (window as any).CinemaDesktop?.isDesktop) {
        setIsDownloadManagerOpen(true);
      }
      return;
    }

    // 3. Direct internal stream endpoint used as download
    if (url.includes("/api/stream/torrent")) {
      const convertedUrl = url.replace("/api/stream/torrent", "/api/torrent/download");
      const finalUrl = convertedUrl.startsWith("http") ? convertedUrl : `${backendUrl}${convertedUrl}`;
      downloadManager.startDownload(finalUrl, displayTitle, cleanFileName);
      if (typeof window !== "undefined" && (window as any).CinemaDesktop?.isDesktop) {
        setIsDownloadManagerOpen(true);
      }
      return;
    }

    // 4. Pixeldrain direct download
    if (url.includes("pixeldrain.dev/api/file") || url.includes("pixeldrain.com/api/file")) {
      const dlUrl = url.includes("?download") ? url : `${url}?download`;
      downloadManager.startDownload(dlUrl, displayTitle, cleanFileName);
      if (typeof window !== "undefined" && (window as any).CinemaDesktop?.isDesktop) {
        setIsDownloadManagerOpen(true);
      }
      return;
    }

    // 5. Standard backend download proxy
    let downloadUrl = `${backendUrl}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(cleanFileName)}`;
    if (headers && Object.keys(headers).length > 0) {
      downloadUrl += `&headers=${encodeURIComponent(JSON.stringify(headers))}`;
    }
    downloadManager.startDownload(downloadUrl, displayTitle, cleanFileName);
    if (typeof window !== "undefined" && (window as any).CinemaDesktop?.isDesktop) {
      setIsDownloadManagerOpen(true);
    }
  };

  const handlePlayRelease = async (
    key: string,
    primaryLink: string,
    epSeason?: number,
    epNum?: number
  ) => {
    setStreamingKey(key);
    setResolvingKey(key);

    const curSeason = epSeason !== undefined ? epSeason : (isSeries ? selectedSeasonNumber || 1 : undefined);
    const curEp = epNum !== undefined ? epNum : (isSeries ? 1 : undefined);
    const curSeasonsCount = tmdb?.seasonsCount || (details as any)?.totalSeasons || linkList.length || 1;
    const playTitle = isSeries ? `${displayTitle} - S${curSeason} E${curEp}` : displayTitle;

    try {
      const backendUrl = getBackendUrl();
      if (primaryLink.startsWith("tpb:")) {
        const parts = primaryLink.split(":");
        const infoHash = parts[2] || "";
        const encName = parts.slice(3).join(":") || encodeURIComponent(cleanFileName);
        const streamUrl = `${backendUrl}/api/stream/torrent?hash=${infoHash}&name=${encName}`;
        onPlayStream(
          streamUrl,
          playTitle,
          [{ server: "Torrent Stream", link: streamUrl }],
          backdropImage,
          posterImage,
          details?.runtime || tmdb?.runtime,
          curSeason,
          curEp,
          isSeries ? episodes : undefined,
          isSeries ? curSeasonsCount : undefined,
          tmdb?.id
        );
        return;
      }

      // Immediately launch player in connecting/fetching state
      onPlayStream(
        "",
        playTitle,
        undefined,
        backdropImage,
        posterImage,
        details?.runtime || tmdb?.runtime,
        curSeason,
        curEp,
        isSeries ? episodes : undefined,
        isSeries ? curSeasonsCount : undefined,
        tmdb?.id
      );

      const list = await fetchServersForLink(key, primaryLink);
      const streamable = list.filter(
        (s) =>
          !s.server?.toLowerCase().includes("download only") &&
          !s.server?.toLowerCase().includes("gdrive") &&
          s.type !== "download" &&
          !s.link.includes("/api/torrent/download") &&
          !s.link.includes(".zip") &&
          !s.link.includes("links.ol-am.top") &&
          !s.link.includes("links.olamovies")
      );

      // Prioritize proven reliable, high-speed streaming mirrors (Pixeldrain, FastDL, HubCDN, Gofile)
      const getMirrorScore = (url: string, serverName: string = ""): number => {
        const u = url.toLowerCase();
        const s = serverName.toLowerCase();
        if (u.includes("pixeldrain.dev") || u.includes("pixeldrain.com") || s.includes("pixeldrain")) return 100;
        if (u.includes("fuckingfast.net") || u.includes("fastdl") || s.includes("fastdl")) return 90;
        if (u.includes("r2.dev") || u.includes("hubcdn") || u.includes("workers.dev") || u.includes(".buzz") || s.includes("hubcdn") || s.includes("cf worker")) return 85;
        if (u.includes("gofile.io") || s.includes("gofile")) return 80;
        if (u.includes("/api/stream/torrent")) return 75;
        if (/\.(mp4|mkv|m3u8|webm|ts)(\?|$)/i.test(u) && !u.includes("cloudflarestorage.com") && !u.includes("hakunaymatata")) return 70;
        if (u.includes("cloudflarestorage.com") || s.includes("cf storage")) return 40;
        if (u.includes("hakunaymatata") || u.includes("moviebox") || u.includes("aoneroom")) return 30;
        if (u.startsWith("magnet:")) return 20;
        return 10;
      };

      const sortedStreamable = [...streamable].sort((a, b) => {
        return getMirrorScore(b.link, b.server) - getMirrorScore(a.link, a.server);
      });

      let chosen = sortedStreamable[0]?.link;

      // If no direct streamable link found, search only the 3 allowed providers (moviebox, hdhub4u, 4khdhub)
      if (!chosen || chosen.includes(".zip") || chosen.includes("links.ol-am.top") || chosen.includes("links.olamovies")) {
        try {
          const cleanQ = displayTitle.replace(/\(\d{4}\)/g, "").trim();
          const searchRes = await fetch(`${backendUrl}/api/global-search?q=${encodeURIComponent(cleanQ)}`);
          if (searchRes.ok) {
            const matches: any[] = await searchRes.json();
            const altMatch = matches.find(
              (m) =>
                m &&
                (m.provider === "hdhub4u" ||
                  m.provider === "movieBoxWeb" ||
                  m.provider === "4khdhub" ||
                  m.provider === "moviebox" ||
                  m.provider === "4khdhub4u")
            );
            if (altMatch) {
              const metaRes = await fetch(`${backendUrl}/api/meta?provider=${encodeURIComponent(altMatch.provider)}&link=${encodeURIComponent(altMatch.link)}`);
              if (metaRes.ok) {
                const metaData = await metaRes.json();
                const altPrimary = metaData.linkList?.[0]?.directLinks?.[0]?.link || metaData.linkList?.[0]?.link;
                if (altPrimary) {
                  const altList = await fetchServersForLink(`alt_${altMatch.provider}`, altPrimary);
                  const altStreamable = altList.filter(
                    (s) => isValidStreamUrl(s.link) && !s.link.includes(".zip") && !isLandingPageUrl(s.link)
                  );
                  const bestAlt = [...altStreamable].sort(
                    (a, b) => getMirrorScore(b.link, b.server) - getMirrorScore(a.link, a.server)
                  )[0];
                  if (bestAlt?.link) {
                    chosen = bestAlt.link;
                  }
                }
              }
            }
          }
        } catch (_) {}
      }

      if (!chosen) {
        chosen = sortedStreamable[0]?.link || list[0]?.link || primaryLink;
      }

      if (chosen) {
        if (defaultPlayer && defaultPlayer !== "web" && onPlayExternal) {
          onPlayExternal(chosen, defaultPlayer, displayTitle);
        } else {
          // Build comprehensive server cascade for retry failover in Video Player
          const allCandidateServers: StreamItem[] = [];
          allCandidateServers.push({
            server: sortedStreamable[0]?.server || list[0]?.server || "Primary Stream",
            link: chosen,
          });

          for (const s of sortedStreamable) {
            if (s.link && !allCandidateServers.some((c) => c.link === s.link)) {
              allCandidateServers.push(s);
            }
          }

          for (const s of list) {
            if (s.link && !allCandidateServers.some((c) => c.link === s.link)) {
              allCandidateServers.push(s);
            }
          }

          onPlayStream(
            chosen,
            playTitle,
            allCandidateServers.length > 0 ? allCandidateServers : undefined,
            backdropImage,
            posterImage,
            details?.runtime || tmdb?.runtime,
            curSeason,
            curEp,
            isSeries ? episodes : undefined,
            isSeries ? curSeasonsCount : undefined,
            tmdb?.id
          );
        }
      }
    } catch (err) {
      console.warn("Play release resolution error:", err);
    } finally {
      setStreamingKey(null);
      setResolvingKey(null);
    }
  };

  const handleDownloadRelease = async (key: string, primaryLink: string, label: string) => {
    setDownloadingKey(key);

    try {
      const backendUrl = getBackendUrl();
      if (primaryLink.startsWith("tpb:")) {
        const parts = primaryLink.split(":");
        const infoHash = parts[2] || "";
        const encName = parts.slice(3).join(":") || encodeURIComponent(cleanFileName);
        const dlUrl = `${backendUrl}/api/torrent/download?hash=${infoHash}&name=${encName}`;
        handleDownloadDirectUrl(dlUrl, "Direct Torrent Download", label);
        return;
      }

      const list = await fetchServersForLink(key, primaryLink);
      // Prioritize internal torrent download endpoint over raw magnet
      const dlCandidate =
        list.find((s) => s.type === "download" || s.link.includes("/api/torrent/download")) ||
        list.find(
          (s) =>
            !s.link.startsWith("magnet:") &&
            !/links\.(kmhd|kmphotos)\.[a-z]+/i.test(s.link) &&
            !/\/locked\?/i.test(s.link)
        ) ||
        list[0];
      const dlLink = dlCandidate?.link || primaryLink;
      const serverName = dlCandidate?.server || "Download";
      handleDownloadDirectUrl(dlLink, serverName, label, (dlCandidate as any)?.headers);
    } catch (err) {
      console.error("Download release resolution error:", err);
      handleDownloadDirectUrl(primaryLink, "Mirror", label);
    } finally {
      setTimeout(() => {
        setDownloadingKey(null);
      }, 3500);
    }
  };

  const handlePlayPrimary = () => {
    const currentSeason = selectedSeasonNumber || 1;
    const currentSeasonsCount = tmdb?.seasonsCount || (details as any)?.totalSeasons || linkList.length || 1;
    const topStream = streams && streams.length > 0
      ? (streams.find((s) => isValidStreamUrl(s.link) && !s.link.includes(".zip")) || streams[0])
      : null;

    const playTitle = isSeries
      ? `${displayTitle} - S${currentSeason} E1`
      : displayTitle;

    onPlayStream(
      topStream?.link || "",
      playTitle,
      streams && streams.length > 0 ? streams : undefined,
      backdropImage,
      posterImage,
      details?.runtime || tmdb?.runtime,
      isSeries ? currentSeason : undefined,
      isSeries ? 1 : undefined,
      isSeries ? episodes : undefined,
      isSeries ? currentSeasonsCount : undefined,
      tmdb?.id
    );

    // 2. If it's a series and we have episodes, resolve episode 1 for the selected season
    if (isSeries && episodes && episodes.length > 0) {
      const ep1 = episodes[0];
      const epKey = `${currentSeason - 1}_0`;
      const epLink = ep1.link || ep1.url;
      if (epLink) {
        handlePlayRelease(epKey, epLink, currentSeason, 1);
        return;
      }
    }

    // 3. If movie releases exist in linkList, resolve release 0
    if (linkList && linkList.length > 0) {
      const firstRelease = linkList[0];
      const primaryLink = firstRelease.directLinks?.[0]?.link || firstRelease.link;
      if (primaryLink) {
        handlePlayRelease(`release_0`, primaryLink);
        return;
      }
    }

    // 4. If universalLinks exist, resolve top link
    if (universalLinks && universalLinks.length > 0) {
      const topUniv = universalLinks[0];
      if (topUniv?.url) {
        handlePlayRelease(`univ_0`, topUniv.url);
        return;
      }
    }
  };

  // Resolved metadata IDs
  const resolvedImdbId =
    tmdb?.imdbId ||
    details?.imdbId ||
    (details?.webUrl?.match(/tt\d+/)?.[0]) ||
    null;
  const realRating = tmdb?.imdbRating || tmdb?.rating || null;
  const imdbUrl = resolvedImdbId
    ? `https://www.imdb.com/title/${resolvedImdbId}/`
    : `https://www.imdb.com/find/?q=${encodeURIComponent(displayTitle)}`;

  const genres =
    (tmdb?.genres && tmdb.genres.length > 0 && tmdb.genres) ||
    (details?.genre && [details.genre]) ||
    [];
  const formattedGenres = genres && genres.length > 0 ? genres.slice(0, 5).join(" | ") : null;

  const starsNames =
    tmdb?.cast && tmdb.cast.length > 0
      ? tmdb.cast.slice(0, 4).map((c) => c.name).join(", ")
      : null;

  const creatorOrDirector =
    tmdb?.creators && tmdb.creators.length > 0
      ? { label: "Creator", value: tmdb.creators.join(", ") }
      : tmdb?.directors && tmdb.directors.length > 0
      ? { label: "Director", value: tmdb.directors.join(", ") }
      : null;

  const episodesCount =
    typeof tmdb?.episodesCount === "number" && tmdb.episodesCount > 0
      ? tmdb.episodesCount
      : (details?.type === "series" || seasonNum) && episodes && episodes.length > 0
      ? episodes.length
      : null;

  const extractRealLanguage = (): string | null => {
    const text = `${post.title} ${details?.title || ""} ${details?.synopsis || ""}`;
    const dualMatch = text.match(/Dual Audio\s*(\[[^\]]+\])?/i);
    const multiMatch = text.match(/Multi Audio\s*(\[[^\]]+\])?/i);
    const hindiEng = text.match(/Hindi\s*[-+&]\s*English/i);
    const hindiDubbed = text.match(/Hindi Dubbed/i);
    const esubsMatch = text.match(/\b(ESubs|MSubs)\b/i);

    let lang = "";
    if (dualMatch) lang = dualMatch[0];
    else if (multiMatch) lang = multiMatch[0];
    else if (hindiEng) lang = `Dual Audio [${hindiEng[0]}]`;
    else if (hindiDubbed) lang = "Hindi Dubbed";

    if (esubsMatch && lang) {
      lang = `${lang} / ${esubsMatch[0]}`;
    } else if (esubsMatch && !lang) {
      lang = esubsMatch[0];
    }
    return lang || null;
  };
  const realLanguage = extractRealLanguage();

  const extractRealQuality = (): string | null => {
    const qualities: string[] = [];
    const sourceTag = details?.quality || null;
    const combined = `${post.title} ${details?.title || ""}`;

    if (/\b4k\b|\b2160p\b/i.test(combined)) qualities.push("4K");
    if (/\b1080p\b/i.test(combined)) qualities.push("1080p");
    if (/\b720p\b/i.test(combined)) qualities.push("720p");
    if (/\b480p\b/i.test(combined)) qualities.push("480p");

    if (qualities.length > 0) {
      return sourceTag ? `${sourceTag} ${qualities.join(" | ")}` : qualities.join(" | ");
    }
    return sourceTag || null;
  };
  const realQuality = extractRealQuality();

  const hasAnyRealDetails = Boolean(
    realRating ||
    letterboxd?.letterboxdRating ||
    formattedGenres ||
    starsNames ||
    creatorOrDirector ||
    episodesCount ||
    realLanguage ||
    realQuality
  );

  const rating =
    (tmdb?.rating && tmdb.rating !== "N/A" && tmdb.rating) ||
    (details?.rating && details.rating !== "N/A" && details.rating) ||
    (post.tag?.match(/\b(10(?:\.0)?|[1-9](?:\.\d)?)\b/)?.[0]) ||
    null;

  const year =
    (tmdb?.year && tmdb.year !== "N/A" && tmdb.year) ||
    (details?.year && details.year !== "N/A" && details.year) ||
    post.title.match(/\b(19\d{2}|20\d{2})\b/)?.[0] ||
    null;

  const runtime =
    (tmdb?.runtime && tmdb.runtime !== "N/A" && tmdb.runtime) ||
    (details?.runtime && details.runtime !== "N/A" && details.runtime) ||
    null;

  const plot =
    (details?.synopsis && details.synopsis.trim().length > 0 && details.synopsis) ||
    (tmdb?.overview && tmdb.overview.trim().length > 0 && tmdb.overview) ||
    `Experience the latest release "${displayTitle}" in premium high definition. Choose between high-speed direct cloud streaming or full-resolution offline download mirrors.`;

  return (
    <div
      ref={containerRef}
      id="cinema-details-scroll-container"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#07090e",
        zIndex: 150,
        overflowY: "auto",
        overflowX: "hidden",
        display: "block",
        WebkitOverflowScrolling: "touch",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 0. Page Ambient Blurred Background (Matches Home slides & filter pages) */}
      {backdropImage && (
        <div
          style={{
            position: "fixed",
            top: "-15%",
            left: "-15%",
            width: "130%",
            height: "130%",
            backgroundImage: `url(${backdropImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center 25%",
            filter: "blur(75px) saturate(2.2) brightness(0.68)",
            transform: "translate3d(0, 0, 0)",
            pointerEvents: "none",
            zIndex: 0,
            opacity: heroIntroStage === "fullscreen" ? 0 : 1,
            transition: "opacity 0.4s ease",
          }}
        />
      )}
      {/* 1. TOP NAVBAR */}
      <Navbar
        providers={providers}
        activeProvider={activeProvider}
        onSelectProvider={onSelectProvider}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isGlobalSearch={isGlobalSearch}
        onToggleGlobalSearch={onToggleGlobalSearch}
        onOpenSettings={onOpenSettings}
        onGoHome={onGoHome}
        onSelectCategoryNav={(type) => {
          if (onSelectCategoryNav) onSelectCategoryNav(type);
          onClose();
        }}
        activeNavTab={activeNavTab || "home"}
        isModalNavbar={true}
        onClose={onClose}
      />


      {/* 2. HERO SPOTLIGHT BANNER + DYNAMIC LINKS DRAWER */}
      <DetailsHero
        backdropImage={backdropImage}
        backdropLoaded={backdropLoaded}
        onBackdropLoaded={() => setBackdropLoaded(true)}
        posterImage={posterImage}
        heroPosterLoaded={heroPosterLoaded}
        heroIntroStage={heroIntroStage}
        onPosterLoaded={() => setHeroPosterLoaded(true)}
        displayTitle={displayTitle}
        rating={rating}
        year={year}
        runtime={runtime}
        isSeries={isSeries}
        seasonNum={seasonNum}
        genres={genres}
        plot={plot}
        hasAnyRealDetails={hasAnyRealDetails}
        realRating={realRating}
        imdbUrl={imdbUrl}
        resolvedImdbId={resolvedImdbId}
        letterboxd={letterboxd}
        formattedGenres={formattedGenres}
        starsNames={starsNames}
        creatorOrDirector={creatorOrDirector}
        episodesCount={episodesCount}
        realLanguage={realLanguage}
        realQuality={realQuality}
        activeTab={activeTab}
        onToggleTab={(tab) => setActiveTab(activeTab === tab ? null : tab)}
        activeTrailerEmbed={activeTrailerEmbed}
        tmdb={tmdb}
        onPlayPrimary={handlePlayPrimary}
        onSelectPerson={onSelectPerson}
      >
        <DetailsLinksDrawer
          activeTab={activeTab}
          onCloseTab={() => setActiveTab(null)}
          isScanningMirrors={isScanningMirrors}
          loadingDetails={loadingDetails}
          loadingStreams={loadingStreams}
          isSeries={isSeries}
          episodes={episodes}
          seasonPacks={seasonPacks}
          linkList={linkList}
          streams={streams}
          validSeasonIdx={validSeasonIdx}
          onSelectSeasonIdx={setSelectedSeasonIdx}
          activeSeason={activeSeason}
          targetProviderKey={targetProviderKey}
          displayTitle={displayTitle}
          resolvingKey={resolvingKey}
          streamingKey={streamingKey}
          downloadingKey={downloadingKey}
          resolvingKeys={resolvingKeys}
          releaseServers={releaseServers}
          onPlayRelease={handlePlayRelease}
          onDownloadRelease={handleDownloadRelease}
          onDownloadDirectUrl={handleDownloadDirectUrl}
          onPlayStream={onPlayStream}
          onOpenMoreLinks={setMoreLinksData}
          onFetchServersForLink={fetchServersForLink}
          onPlayExternal={onPlayExternal}
          onSearchGlobal={onSearchGlobal}
          onCloseModal={onClose}
          providers={providers}
          onSelectProvider={onSelectProvider}
        />
      </DetailsHero>

      {/* 3. EPISODES GRID (16:9 Landscape Cards matching Cno.to and Cinejoy) */}
      {(isSeries || tmdb?.mediaType === "tv") && (
        <DetailsEpisodesGrid
          tmdbId={tmdb?.id}
          seasonsCount={tmdb?.seasonsCount || (details as any)?.totalSeasons || linkList.length || 1}
          selectedSeason={selectedSeasonNumber}
          onSelectSeason={(seasonNum) => {
            setSelectedSeasonNumber(seasonNum);
            const targetIdx = seasonNum - 1;
            if (targetIdx >= 0 && targetIdx < linkList.length) {
              setSelectedSeasonIdx(targetIdx);
            }
          }}
          providerEpisodes={episodes}
          onPlayEpisode={(epNum, epTitle, directLink) => {
            const currentSeasonsCount = tmdb?.seasonsCount || (details as any)?.totalSeasons || linkList.length || 1;
            const epDisplayTitle = `${displayTitle} - S${selectedSeasonNumber} E${epNum}: ${epTitle || ""}`;
            onPlayStream(
              directLink || "",
              epDisplayTitle,
              streams,
              backdropImage,
              posterImage,
              details?.runtime || tmdb?.runtime,
              selectedSeasonNumber,
              epNum,
              episodes,
              currentSeasonsCount,
              tmdb?.id
            );
            if (!directLink) {
              const ep = episodes[epNum - 1];
              const epKey = `${selectedSeasonNumber - 1}_${epNum - 1}`;
              const link = ep?.link || ep?.url;
              if (link) {
                handlePlayRelease(epKey, link, selectedSeasonNumber, epNum);
              }
            }
          }}
          onDownloadEpisode={(epNum, epTitle, directLink) => {
            const epFileName = `${displayTitle} S${selectedSeasonNumber} E${epNum}${epTitle ? ` - ${epTitle}` : ""}`;
            if (directLink) {
              handleDownloadDirectUrl(
                directLink,
                "Server 1",
                epFileName
              );
              return;
            }

            // Direct episode resolution without redirection or mismatch
            (async () => {
              try {
                const cleanQ = displayTitle.replace(/\(\d{4}\)/g, "").trim();
                const mbRes = await fetch(`/api/search?provider=movieBoxWeb&q=${encodeURIComponent(cleanQ)}`);
                if (mbRes.ok) {
                  const mbMatches: any[] = await mbRes.json();
                  const cleanLower = cleanQ.toLowerCase().trim();
                  const cand = mbMatches.find((m) => m && (m.title || "").toLowerCase().includes(cleanLower)) || mbMatches[0];
                  if (cand?.link) {
                    const metaRes = await fetch(`/api/meta?provider=movieBoxWeb&link=${encodeURIComponent(cand.link)}`);
                    if (metaRes.ok) {
                      const meta = await metaRes.json();
                      const rawLinkList = Array.isArray(meta?.linkList) ? meta.linkList : [];
                      const seasonRegex = new RegExp(`\\bSeason\\s*0*${selectedSeasonNumber}\\b`, "i");
                      const seasonItem = rawLinkList.find((i: any) => seasonRegex.test(i.title || "")) || rawLinkList[0];
                      const targetEp = seasonItem?.directLinks?.[epNum - 1]?.link || seasonItem?.directLinks?.[0]?.link;
                      if (targetEp) {
                        const sRes = await fetch(`/api/streams?provider=movieBoxWeb&link=${encodeURIComponent(targetEp)}&download=true&title=${encodeURIComponent(epFileName)}`);
                        if (sRes.ok) {
                          const sList = await sRes.json();
                          if (Array.isArray(sList) && sList[0]?.link) {
                            handleDownloadDirectUrl(sList[0].link, "Server 1", epFileName, sList[0].headers);
                            return;
                          }
                        }
                      }
                    }
                  }
                }
              } catch (_) {}

              // Fallback to active provider
              const ep = episodes[epNum - 1];
              const link = ep?.link || ep?.url;
              if (link) {
                api.getStreams(activeProvider?.value || "hdhub4u", link, "series")
                  .then((resolved) => {
                    const dl = (resolved && resolved[0]?.link) || link;
                    handleDownloadDirectUrl(dl, "Server 1", epFileName);
                  })
                  .catch(() => {
                    setActiveTab("download");
                  });
              } else {
                setActiveTab("download");
              }
            })();
          }}
          onToggleRatingsHeatmap={() => {
            setShowRatingsHeatmap(true);
            setTimeout(() => {
              const container = document.getElementById("cinema-details-scroll-container");
              const el = document.getElementById("series-ratings-heatmap-section");
              if (container && el) {
                const containerRect = container.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const targetTop = container.scrollTop + (elRect.top - containerRect.top) - 80;
                container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
              } else if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }, 60);
          }}
        />
      )}

      {/* 4. TRAILERS & EXTRAS (Cno.to Screenshot 4) */}
      <DetailsTrailer
        trailerEmbed={activeTrailerEmbed}
        trailerUrl={activeTrailerUrl}
        trailers={tmdb?.trailers}
        backdrop={backdropImage}
        title={displayTitle}
      />

      {/* 5. SERIES / ANIME RATINGS BY EPISODE HEATMAP (Cno.to Screenshot 5) */}
      {(isSeries || tmdb?.mediaType === "tv") && showRatingsHeatmap && (
        <div
          id="series-ratings-heatmap-section"
          style={{ padding: "0 48px", position: "relative", zIndex: 10, margin: "16px 0 32px 0", scrollMarginTop: "90px" }}
        >
          <SeriesRatingsHeatmap
            tmdbId={tmdb?.id || 0}
            seasonsCount={tmdb?.seasonsCount || (details as any)?.totalSeasons || 1}
            onPlayEpisode={(sNum, epNum, epTitle) => {
              const targetIdx = sNum - 1;
              if (targetIdx >= 0 && targetIdx < linkList.length) {
                setSelectedSeasonIdx(targetIdx);
              }
              const ep = episodes[epNum - 1];
              const directLink = ep?.link || ep?.url || ep?.file;
              const epDisplayTitle = `${displayTitle} - S${sNum} E${epNum}: ${epTitle || ""}`;
              const currentSeasonsCount = tmdb?.seasonsCount || (details as any)?.totalSeasons || linkList.length || 1;
              onPlayStream(
                directLink || "",
                epDisplayTitle,
                streams,
                backdropImage,
                posterImage,
                details?.runtime || tmdb?.runtime,
                sNum,
                epNum,
                episodes,
                currentSeasonsCount,
                tmdb?.id
              );
              if (!directLink) {
                const epKey = `${targetIdx >= 0 ? targetIdx : 0}_${epNum - 1}`;
                const link = ep?.link || ep?.url;
                if (link) {
                  handlePlayRelease(epKey, link, sNum, epNum);
                }
              }
            }}
          />
        </div>
      )}

      {/* 6. CAST & CREW SECTION (Circular Headshots matching Cno.to & Cinejoy) */}
      <DetailsCast
        cast={tmdb?.cast}
        onSelectPerson={onSelectPerson}
      />

      {/* 7. PHOTOS & STILLS GALLERY (Cno.to Screenshot 4) */}
      <DetailsScreenshots
        screenshots={allScreenshots}
        posters={tmdb?.posters}
        onSelectScreenshot={setSelectedScreenshotIdx}
      />

      {/* 8. TOPICS & WHERE TO WATCH (Unified Section matching Screenshot 2) */}
      <DetailsTopics
        topics={tmdb?.keywords}
        watchProviders={tmdb?.watchProviders}
        onSelectTopic={onSearchGlobal}
      />

      {/* 10. YOU MIGHT ALSO LIKE / MORE LIKE THIS (Cno.to & Cinejoy) */}
      <DetailsRecommendations
        recommendations={tmdb?.recommendations}
        similar={tmdb?.similar}
        targetProviderKey={targetProviderKey}
        onSelectRecommended={onSelectRecommended}
        containerRef={containerRef}
      />

      {/* 11. REVIEWS SECTION */}
      <DetailsReviews
        reviews={tmdb?.reviews}
        title={displayTitle}
        imdbRating={realRating}
      />

      {/* 12. ABOUT SECTION (Cno.to Screenshot 7) */}
      <DetailsAbout
        tmdb={tmdb}
        displayTitle={displayTitle}
        isSeries={isSeries}
        plot={plot}
        creatorOrDirector={creatorOrDirector}
        imdbUrl={imdbUrl}
        resolvedImdbId={resolvedImdbId}
        runtime={runtime}
        genres={genres}
        onSelectPerson={onSelectPerson}
      />

      {/* 7. MORE DOWNLOAD / STREAM LINKS / MIRRORS MODAL */}
      <MoreLinksModal
        data={moreLinksData}
        onClose={() => setMoreLinksData(null)}
        onDownloadUrl={handleDownloadDirectUrl}
        onPlayStream={(url, title, srvs) => {
          onPlayStream(url, title, srvs, details?.backdrop, details?.poster, details?.runtime);
          setMoreLinksData(null);
        }}
      />

      {/* 8. FULLSCREEN SCREENSHOT LIGHTBOX */}
      <ScreenshotLightboxModal
        screenshots={allScreenshots}
        currentIndex={selectedScreenshotIdx}
        onClose={() => setSelectedScreenshotIdx(null)}
        onNavigate={setSelectedScreenshotIdx}
      />

      {/* 9. DOWNLOAD MANAGER MODAL */}
      <DownloadManagerModal
        isOpen={isDownloadManagerOpen}
        onClose={() => setIsDownloadManagerOpen(false)}
      />

      {/* 10. UNIVERSAL MULTI-EXTENSION DOWNLOAD & STREAM MODAL (Cinejoy Screenshots 1, 2, 3) */}
      <UniversalDownloadsModal
        isOpen={activeTab !== null}
        onClose={() => setActiveTab(null)}
        title={displayTitle}
        isSeries={isSeries}
        isAnime={(details as any)?.isAnime || post?.genres?.toLowerCase().includes("anime") || false}
        seasonsCount={tmdb?.seasonsCount || (details as any)?.totalSeasons || 1}
        episodesCount={episodes?.length || tmdb?.episodesCount || 12}
        serverLinks={universalLinks}
        loading={loadingUniversalLinks}
        mode={activeTab || "download"}
        onPlayLink={(link) => {
          onPlayStream(link.url, `${displayTitle} • ${link.serverName} (${link.quality})`, streams, backdropImage, posterImage);
          setActiveTab(null);
        }}
        onDownloadLink={(link) => {
          handleDownloadDirectUrl(link.url, link.serverName, `${displayTitle} ${link.quality}`);
          setActiveTab(null);
        }}
      />

    </div>
  );
};
