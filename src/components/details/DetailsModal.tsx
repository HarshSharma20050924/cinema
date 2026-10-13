import React, { useState, useEffect, useRef } from "react";
import { fetchTMDBDetails, type TMDBDetails } from "../../api/tmdb";
import { api, getBackendUrl } from "../../api/client";
import { parseTitleAndYear } from "../media/MediaCard";
import { Navbar } from "../layout/Navbar";
import { appCache } from "../../utils/cache";
import { isValidStreamUrl, isLandingPageUrl, isDirectMediaUrl } from "./linkHelpers";
import { DetailsHero } from "./DetailsHero";
import { DetailsLinksDrawer } from "./DetailsLinksDrawer";
import { DetailsScreenshots } from "./DetailsScreenshots";
import { DetailsTrailer } from "./DetailsTrailer";
import { DetailsCast } from "./DetailsCast";
import { DetailsRecommendations } from "./DetailsRecommendations";
import { MoreLinksModal, type MoreLinksModalData } from "./MoreLinksModal";
import { ScreenshotLightboxModal } from "./ScreenshotLightboxModal";
import { downloadManager } from "../../utils/downloadManager";
import { DownloadManagerModal } from "../downloads/DownloadManagerModal";
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
  onClose: () => void;
  onPlayStream: (url: string, title?: string) => void;
  onPlayExternal?: (url: string, player: ExternalPlayerType) => void;
  onSelectRecommended?: (post: Post) => void;
  onSelectPerson?: (personId: number) => void;
  onSearchGlobal?: (title: string) => void;
  defaultPlayer?: ExternalPlayerType;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "download" | null>(null);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(0);
  const [tmdb, setTmdb] = useState<TMDBDetails | null>(null);

  // Per-release server resolution cache and loading states
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [resolvingKeys, setResolvingKeys] = useState<Record<string, boolean>>({});
  const [isScanningMirrors, setIsScanningMirrors] = useState<boolean>(false);
  const [releaseServers, setReleaseServers] = useState<Record<string, StreamItem[]>>({});
  const [moreLinksData, setMoreLinksData] = useState<MoreLinksModalData | null>(null);

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

    fetchTMDBDetails(titleToSearch, details?.imdbId)
      .then((data) => {
        if (isCurrent && data) {
          setTmdb(data);
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

  // Robust series detection across all providers
  const isSeries =
    details?.type === "series" ||
    details?.type === "tv" ||
    details?.type === "tvseries" ||
    details?.type === "tv_series" ||
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
  const activeSeason = linkList.length > 0 ? linkList[validSeasonIdx] : null;

  // Single episodes
  const episodes = Array.isArray(activeSeason?.directLinks) ? activeSeason.directLinks : [];

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
  const handleDownloadDirectUrl = (url: string, serverName: string, label?: string) => {
    if (!url) return;
    if (url.startsWith("magnet:")) {
      window.location.href = url;
      return;
    }

    const cleanFileName = `${displayTitle} - ${label || serverName}`.replace(/[^a-zA-Z0-9._-]/g, "_") + ".mp4";

    if (url.includes("pixeldrain.dev/api/file") || url.includes("pixeldrain.com/api/file")) {
      const dlUrl = url.includes("?download") ? url : `${url}?download`;
      downloadManager.startDownload(dlUrl, displayTitle, cleanFileName);
      if (typeof window !== "undefined" && (window as any).CinemaDesktop?.isDesktop) {
        setIsDownloadManagerOpen(true);
      }
      return;
    }

    const backendUrl = getBackendUrl();
    const downloadUrl = `${backendUrl}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(cleanFileName)}`;
    downloadManager.startDownload(downloadUrl, displayTitle, cleanFileName);
    if (typeof window !== "undefined" && (window as any).CinemaDesktop?.isDesktop) {
      setIsDownloadManagerOpen(true);
    }
  };

  const handlePlayRelease = async (key: string, primaryLink: string) => {
    const list = await fetchServersForLink(key, primaryLink);
    const streamable = list.filter(
      (s) =>
        !s.server?.toLowerCase().includes("download only") &&
        !s.server?.toLowerCase().includes("gdrive")
    );
    const chosen = streamable[0]?.link || list[0]?.link || primaryLink;
    if (chosen) {
      onPlayStream(chosen, displayTitle);
    }
  };

  const handleDownloadRelease = async (key: string, primaryLink: string, label: string) => {
    setDownloadingKey(key);
    try {
      const list = await fetchServersForLink(key, primaryLink);
      const directCandidates = list.filter(
        (s) => !/links\.(kmhd|kmphotos)\.[a-z]+/i.test(s.link) && !/\/locked\?/i.test(s.link)
      );
      const chosen = directCandidates[0] || list[0];
      const dlLink = chosen?.link || primaryLink;
      const serverName = chosen?.server || "Mirror";
      handleDownloadDirectUrl(dlLink, serverName, label);
    } catch (err) {
      console.error("Download release resolution error:", err);
      handleDownloadDirectUrl(primaryLink, "Mirror", label);
    } finally {
      setDownloadingKey(null);
    }
  };

  // Artwork & metadata resolution: provider's authentic artwork prioritized over external lookups
  const backdropImage =
    (details?.backdrop && details.backdrop.trim()) ||
    (tmdb?.backdropUrl && tmdb.backdropUrl.trim()) ||
    (details?.poster && details.poster.trim()) ||
    (details?.image && details.image.trim()) ||
    (post.image && post.image.trim()) ||
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600";

  const posterImage =
    (details?.poster && details.poster.trim()) ||
    (details?.image && details.image.trim()) ||
    (post.image && post.image.trim()) ||
    (tmdb?.posterUrl && tmdb.posterUrl.trim()) ||
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600";

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
    (post.tag?.match(/\d+(\.\d+)?/)?.[0]) ||
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
        />
      </DetailsHero>

      {/* 3. MOVIE STILLS & SCREENSHOTS SECTION */}
      <DetailsScreenshots
        screenshots={allScreenshots}
        onSelectScreenshot={setSelectedScreenshotIdx}
      />

      {/* 4. OFFICIAL TRAILER SECTION */}
      <DetailsTrailer
        trailerEmbed={activeTrailerEmbed}
        trailerUrl={activeTrailerUrl}
      />

      {/* 5. CAST SECTION */}
      <DetailsCast
        cast={tmdb?.cast}
        onSelectPerson={onSelectPerson}
      />

      {/* 6. RECOMMENDED & SIMILAR MOVIES */}
      <DetailsRecommendations
        recommendations={tmdb?.recommendations}
        similar={tmdb?.similar}
        targetProviderKey={targetProviderKey}
        onSelectRecommended={onSelectRecommended}
        containerRef={containerRef}
      />

      {/* 7. MORE DOWNLOAD LINKS / MIRRORS MODAL */}
      <MoreLinksModal
        data={moreLinksData}
        onClose={() => setMoreLinksData(null)}
        onDownloadUrl={handleDownloadDirectUrl}
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
    </div>
  );
};
