import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useProviders, matchProvider } from "./hooks/useProviders";
import { useCatalog } from "./hooks/useCatalog";
import { useMediaPosts } from "./hooks/useMediaPosts";
import { useSettings, launchExternalPlayer } from "./hooks/useSettings";
import { Navbar } from "./components/layout/Navbar";
import { BottomNav } from "./components/layout/BottomNav";
import { CatalogSection } from "./components/catalog/CatalogSection";
import { CatalogFilterBar } from "./components/catalog/CatalogFilterBar";
import {
  BrowseCategoriesGrid,
  CREATIVE_INDUSTRIES,
  CREATIVE_GENRES,
  type CreativeCategory,
} from "./components/catalog/BrowseCategoriesGrid";
import { HeroSpotlight } from "./components/hero/HeroSpotlight";
import { MediaGrid } from "./components/media/MediaGrid";
import { backdropCache } from "./components/media/MediaCard";
import { Footer } from "./components/layout/Footer";
import { cleanSearchQuery, getInitialRouteState } from "./utils/routeState";
import { AmbientBackground } from "./components/layout/AmbientBackground";
import { AppModals } from "./components/layout/AppModals";
import { SettingsModal } from "./components/settings/SettingsModal";
import { DownloadPage } from "./components/download/DownloadPage";
import { TermsPage } from "./components/legal/TermsPage";
import { PrivacyPage } from "./components/legal/PrivacyPage";
import { DisclaimerPage } from "./components/legal/DisclaimerPage";
import { RankingsHubPage } from "./components/rankings/RankingsHubPage";
import { BrowseByProviderShelf } from "./components/media/BrowseByProviderShelf";
import { BrowseByGenreShelf } from "./components/media/BrowseByGenreShelf";
import { BrowseByLanguageShelf } from "./components/media/BrowseByLanguageShelf";
import { ExploreTopicsShelf } from "./components/media/ExploreTopicsShelf";
import { GenreShowcasePage } from "./components/catalog/GenreShowcasePage";
import { CatalogFilterBrowsePage } from "./components/catalog/CatalogFilterBrowsePage";
import { DedicatedSearchPage } from "./components/search/DedicatedSearchPage";
import { ComingSoonPage } from "./components/catalog/ComingSoonPage";
import { MyListPage } from "./components/watchlist/MyListPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { HomeCinematicBanner } from "./components/home/HomeCinematicBanner";
import { ContinueWatchingShelf } from "./components/media/ContinueWatchingShelf";
import { TopPicksPersonalizedShelf } from "./components/home/TopPicksPersonalizedShelf";
import { SignInModal } from "./components/auth/SignInModal";
import { CreateAccountModal } from "./components/auth/CreateAccountModal";
import { ManageProfilesModal } from "./components/auth/ManageProfilesModal";
import { GlassToast } from "./components/common/GlassToast";
import { getContinueWatchingList, type ContinueWatchingItem } from "./utils/continueWatchingService";
import { ServerIcon, DownloadIcon, RefreshIcon } from "./icons";
import { TopProgressBar } from "./components/common/TopProgressBar";
import {
  getInitialHomeShelves,
  getInitialMoviesShelves,
  getInitialTvShelves,
  getInitialAnimeShelves,
  fetchLiveHomeTrending,
  fetchLiveAnimeTrending,
  HOME_SPOTLIGHT_ITEMS,
  MOVIES_SPOTLIGHT_ITEMS,
  TV_SPOTLIGHT_ITEMS,
  ANIME_SPOTLIGHT_ITEMS,
  type HomeShelf,
} from "./data/homeCuratedService";
import { api } from "./api/client";
import { appCache } from "./utils/cache";
import {
  loadNavigationState,
  saveNavigationState,
  clearOverlayState,
  type NavigationState,
} from "./utils/navigationState";
import type { Provider, Post, MediaDetails, StreamItem, ExternalPlayerType } from "./types";

// Load saved session state on initial startup
const initialNavState: NavigationState | null = loadNavigationState();

const initialRoute = getInitialRouteState(initialNavState);

export default function App() {
  // Clear any leftover CNO experiment state and handle direct "Open in Web" URL redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cinema_ui_mode");
        const params = new URLSearchParams(window.location.search);
        let changed = false;
        if (params.has("ui")) {
          params.delete("ui");
          changed = true;
        }

        // Direct external video stream redirection (only if no title and starts with http)
        const linkParam = params.get("link") || params.get("stream");
        if (linkParam && (linkParam.startsWith("http://") || linkParam.startsWith("https://")) && !params.get("title") && !params.get("provider")) {
          window.location.replace(linkParam);
          return;
        }

        if (changed) {
          const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "") + window.location.hash;
          window.history.replaceState({}, "", newUrl);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState(initialRoute.searchQuery);
  const [isGlobalSearch, setIsGlobalSearch] = useState(initialRoute.isGlobalSearch);
  const [page, setPage] = useState(initialRoute.page);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"home" | "movies" | "tv" | "categories" | "extensions">("home");


  // Browse by Category page view state (shows colorful category cards)
  const [isBrowsingCategories, setIsBrowsingCategories] = useState(initialRoute.isBrowsingCategories);

  // View All Category State: When set, displays paginated grid with Category selection options
  const [viewAllCategory, setViewAllCategory] = useState<{ filter: string; title: string } | null>(
    initialRoute.viewAllCategory
  );

  // Distinct states for Category & Genre (never collide!)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => {
    if (initialRoute.nicheId && CREATIVE_INDUSTRIES.some((c) => c.id === initialRoute.nicheId)) {
      return initialRoute.nicheId;
    }
    return null;
  });
  const [selectedGenreCategory, setSelectedGenreCategory] = useState<CreativeCategory | null>(() => {
    if (initialRoute.nicheId && CREATIVE_GENRES.some((g) => g.id === initialRoute.nicheId)) {
      return CREATIVE_GENRES.find((g) => g.id === initialRoute.nicheId) || null;
    }
    return null;
  });
  const [selectedProviderGenre, setSelectedProviderGenre] = useState<{ filter: string; title: string } | null>(null);
  const [isMergedFilter, setIsMergedFilter] = useState<boolean>(false);
  const selectedNicheId = selectedCategoryId || selectedGenreCategory?.id || null;

  const [activeCustomPage, setActiveCustomPage] = useState<"downloads" | "terms" | "privacy" | "disclaimer" | "rankings" | "letterboxd" | "imdb" | null>(
    (initialRoute as any).customPage || null
  );

  // Cno.to Genre Showcase, Dedicated Search, and Global Ambient Canvas States
  const [selectedGenreShowcase, setSelectedGenreShowcase] = useState<string | null>(null);
  const [isDedicatedSearchOpen, setIsDedicatedSearchOpen] = useState<boolean>(false);
  const [ambientBackdrop, setAmbientBackdrop] = useState<string | null>(null);

  // Active top-level navigation tab ("home" | "movies" | "tv" | "anime" | "coming-soon" | "mylist")
  const [selectedNavTab, setSelectedNavTab] = useState<"home" | "movies" | "tv" | "anime" | "coming-soon" | "mylist">(() => {
    if (initialRoute.tab === "movies") return "movies";
    if (initialRoute.tab === "tv") return "tv";
    if (initialRoute.tab === "anime") return "anime";
    if (initialRoute.tab === "coming-soon") return "coming-soon";
    if (initialRoute.tab === "mylist" || initialRoute.tab === "watchlist") return "mylist";
    return "home";
  });
  const [isComingSoonPageOpen, setIsComingSoonPageOpen] = useState(initialRoute.tab === "coming-soon");
  const [isMyListPageOpen, setIsMyListPageOpen] = useState(initialRoute.tab === "mylist" || initialRoute.tab === "watchlist");

  // Dynamic Home, Movies & TV Spotlight State (Populated live from TMDB trending)
  const [homeSpotlightItems, setHomeSpotlightItems] = useState<Post[]>(HOME_SPOTLIGHT_ITEMS);
  const [movieSpotlightItems, setMovieSpotlightItems] = useState<Post[]>(MOVIES_SPOTLIGHT_ITEMS);
  const [tvSpotlightItems, setTvSpotlightItems] = useState<Post[]>(TV_SPOTLIGHT_ITEMS);

  // Global Keyboard Shortcut for Search (Cmd+K, Ctrl+K, or /)
  useEffect(() => {
    const handleGlobalSearchKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsDedicatedSearchOpen((prev) => !prev);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        setIsDedicatedSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalSearchKey);
    return () => window.removeEventListener("keydown", handleGlobalSearchKey);
  }, []);

  // Double-buffered crossfading ambient background layers (Zero-stutter GPU composite transition)
  const [bgLayerA, setBgLayerA] = useState<string | null>(ambientBackdrop);
  const [bgLayerB, setBgLayerB] = useState<string | null>(null);
  const [activeBgLayer, setActiveBgLayer] = useState<"A" | "B">("A");

  useEffect(() => {
    if (!ambientBackdrop) return;
    if (activeBgLayer === "A") {
      setBgLayerB(ambientBackdrop);
      setActiveBgLayer("B");
    } else {
      setBgLayerA(ambientBackdrop);
      setActiveBgLayer("A");
    }
  }, [ambientBackdrop]);

  // Home Page Curated Shelves
  const [homeShelves, setHomeShelves] = useState<HomeShelf[]>(getInitialHomeShelves);
  // Dedicated Movies Page Shelves (Matching Screenshot 1)
  const [moviesShelves, setMoviesShelves] = useState<HomeShelf[]>(getInitialMoviesShelves);
  // Dedicated TV Shows Page Shelves (Matching Screenshot 2)
  const [tvShelves, setTvShelves] = useState<HomeShelf[]>(getInitialTvShelves);
  // Dedicated Anime Page Shelves (Matching Anime Showcase & Inspiration)
  const [animeSpotlightItems, setAnimeSpotlightItems] = useState<Post[]>(ANIME_SPOTLIGHT_ITEMS);
  const [animeShelves, setAnimeShelves] = useState<HomeShelf[]>(getInitialAnimeShelves);

  // Auth & Profile Modals State
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showManageProfilesModal, setShowManageProfilesModal] = useState(false);

  useEffect(() => {
    const handleOpenCreate = () => {
      setShowCreateAccountModal(true);
      setShowSignInModal(false);
    };
    window.addEventListener("cinema:open_create_account", handleOpenCreate);
    return () => window.removeEventListener("cinema:open_create_account", handleOpenCreate);
  }, []);

  // Aggregated home posts for dynamic personalized recommendation shelf
  const allHomePosts = useMemo(() => {
    const list: any[] = [];
    homeShelves.forEach((s) => {
      if (Array.isArray(s.items)) {
        s.items.forEach((it) => {
          const key = it.id || it.tmdbId;
          if (key && !list.some((existing) => (existing.id || existing.tmdbId) === key)) {
            list.push(it);
          }
        });
      }
    });
    return list;
  }, [homeShelves]);

  useEffect(() => {
    let mounted = true;
    fetchLiveHomeTrending().then((live) => {
      if (!mounted) return;

      // Update dynamic spotlights with live trending releases
      if (live.trendingMovies && live.trendingMovies.length > 0) {
        setMovieSpotlightItems(live.trendingMovies.slice(0, 6));
        setHomeSpotlightItems(live.trendingMovies.slice(0, 6));
      }
      if (live.trendingTv && live.trendingTv.length > 0) {
        setTvSpotlightItems(live.trendingTv.slice(0, 6));
      }

      // 1. Live Update Home Shelves
      setHomeShelves((prev) =>
        prev.map((shelf) => {
          if (shelf.id === "trending-movies" && live.trendingMovies && live.trendingMovies.length > 0) {
            return { ...shelf, items: live.trendingMovies };
          }
          if (shelf.id === "trending-tv-shows" && live.trendingTv && live.trendingTv.length > 0) {
            return { ...shelf, items: live.trendingTv };
          }
          if (shelf.id === "popular-right-now" && live.popular && live.popular.length > 0) {
            return { ...shelf, items: live.popular };
          }
          if (shelf.id === "coming-soon" && live.comingSoon && live.comingSoon.length > 0) {
            return { ...shelf, items: live.comingSoon };
          }
          if (shelf.id === "documentaries" && live.documentaries && live.documentaries.length > 0) {
            return { ...shelf, items: live.documentaries };
          }
          return shelf;
        })
      );

      // 2. Live Update Movies Shelves
      setMoviesShelves((prev) =>
        prev.map((shelf) => {
          if (shelf.id === "top-10-movies-today" && live.topMoviesToday && live.topMoviesToday.length > 0) {
            return { ...shelf, items: live.topMoviesToday.slice(0, 10) };
          }
          if ((shelf.id === "top-10-trending" || shelf.id === "trending-movies") && live.trendingMovies && live.trendingMovies.length > 0) {
            return { ...shelf, items: live.trendingMovies.slice(0, 10) };
          }
          if (shelf.id === "coming-soon" && live.comingSoon && live.comingSoon.length > 0) {
            return { ...shelf, items: live.comingSoon };
          }
          if (shelf.id === "popular-right-now" && live.popular && live.popular.length > 0) {
            return { ...shelf, items: live.popular };
          }
          if (shelf.id === "documentaries" && live.documentaries && live.documentaries.length > 0) {
            return { ...shelf, items: live.documentaries };
          }
          return shelf;
        })
      );

      // 3. Live Update TV Shelves
      setTvShelves((prev) =>
        prev.map((shelf) => {
          if (shelf.id === "top-10-shows-today" && live.topTvToday && live.topTvToday.length > 0) {
            return { ...shelf, items: live.topTvToday.slice(0, 10) };
          }
          if (shelf.id === "new-episodes-this-week" && live.newTvThisWeek && live.newTvThisWeek.length > 0) {
            return { ...shelf, items: live.newTvThisWeek };
          }
          if (shelf.id === "popular-shows" && live.trendingTv && live.trendingTv.length > 0) {
            return { ...shelf, items: live.trendingTv };
          }
          if (shelf.id === "top-rated" && live.tvTopRated && live.tvTopRated.length > 0) {
            return { ...shelf, items: live.tvTopRated };
          }
          if (shelf.id === "comedy" && live.tvComedy && live.tvComedy.length > 0) {
            return { ...shelf, items: live.tvComedy };
          }
          if (shelf.id === "animation" && live.tvAnimation && live.tvAnimation.length > 0) {
            return { ...shelf, items: live.tvAnimation };
          }
          if (shelf.id === "docuseries" && live.docuseries && live.docuseries.length > 0) {
            return { ...shelf, items: live.docuseries };
          }
          return shelf;
        })
      );
    });

    // 4. Live Update Anime Shelves & Spotlight from TMDB Dynamic Endpoints
    fetchLiveAnimeTrending().then((animeData) => {
      if (!mounted) return;
      if (animeData.topAnimeToday && animeData.topAnimeToday.length > 0) {
        setAnimeSpotlightItems(animeData.topAnimeToday.slice(0, 6));
      }
      setAnimeShelves((prev) =>
        prev.map((shelf) => {
          if (shelf.id === "top-10-anime-today" && animeData.topAnimeToday && animeData.topAnimeToday.length > 0) {
            return { ...shelf, items: animeData.topAnimeToday.slice(0, 10) };
          }
          if (shelf.id === "trending-anime" && animeData.trendingAnime && animeData.trendingAnime.length > 0) {
            return { ...shelf, items: animeData.trendingAnime };
          }
          if (shelf.id === "shonen-action-anime" && animeData.shonenAction && animeData.shonenAction.length > 0) {
            return { ...shelf, items: animeData.shonenAction };
          }
          if (shelf.id === "anime-movies" && animeData.animeMovies && animeData.animeMovies.length > 0) {
            return { ...shelf, items: animeData.animeMovies };
          }
          if (shelf.id === "dark-fantasy-anime" && animeData.darkFantasy && animeData.darkFantasy.length > 0) {
            return { ...shelf, items: animeData.darkFantasy };
          }
          if (shelf.id === "romance-slice-anime" && animeData.romanceAnime && animeData.romanceAnime.length > 0) {
            return { ...shelf, items: animeData.romanceAnime };
          }
          return shelf;
        })
      );
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Derive active navbar tab
  const activeNavTab: "home" | "movies" | "tv" | "anime" | "coming-soon" | "mylist" | "categories" | "rankings" | "downloads" =
    activeCustomPage === "rankings" || activeCustomPage === "letterboxd" || activeCustomPage === "imdb"
      ? "rankings"
      : activeCustomPage === "downloads"
      ? "downloads"
      : isBrowsingCategories
      ? "categories"
      : isComingSoonPageOpen || selectedNavTab === "coming-soon"
      ? "coming-soon"
      : isMyListPageOpen || selectedNavTab === "mylist"
      ? "mylist"
      : searchQuery
      ? "home"
      : viewAllCategory
      ? viewAllCategory.title.toLowerCase().includes("anime")
        ? "anime"
        : viewAllCategory.title.toLowerCase().includes("movie")
        ? "movies"
        : viewAllCategory.title.toLowerCase().includes("tv") ||
          viewAllCategory.title.toLowerCase().includes("series")
        ? "tv"
        : "home"
      : selectedNavTab;

  // 1. Settings Hook
  const {
    settings,
    saveSettings,
    completeSetup,
    toggleExtension,
  } = useSettings();

  // 2. Providers Hook (restores saved provider on reload, prioritizes URL query param)
  const urlProvider = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("provider") : null;
  const {
    providers: allProviders,
    activeProvider,
    setActiveProvider,
    loading: loadingProviders,
  } = useProviders(urlProvider || initialNavState?.activeProviderValue);

  // All active enabled providers in the system (temporarily disabling Pirate Bay & Gram Cinema per user request)
  const installedProviders = allProviders.filter((p) => {
    if (p.disabled) return false;
    const v = (p.value || "").toLowerCase();
    const n = (p.name || "").toLowerCase();
    if (v.includes("pirate") || v.includes("tpb") || n.includes("pirate")) return false;
    if (v.includes("gram") || n.includes("gram")) return false;
    return true;
  });

  // Ensure an activeProvider is set once providers finish loading if none is selected yet
  useEffect(() => {
    if (installedProviders.length === 0) return;
    if (!activeProvider) {
      const preferred =
        installedProviders.find((p) => p.value.toLowerCase() === "vega") ||
        installedProviders[0];
      setActiveProvider(preferred);
    }
  }, [installedProviders, activeProvider, setActiveProvider]);

  // 3. Catalog Filters Hook
  const {
    filters,
    catalogFilters,
    genreFilters,
  } = useCatalog(activeProvider?.value, initialNavState?.activeFilter);

  // Determine current active filter
  const activeBrowseFilter = viewAllCategory
    ? viewAllCategory.filter
    : filters.length > 0
    ? filters[0].filter
    : "";

  // 4. Media Posts Hook with Global Search & Pagination (Loads 30+ titles per page)
  const { posts, loading: loadingPosts, isStreaming } = useMediaPosts(
    activeProvider?.value,
    activeBrowseFilter,
    searchQuery,
    page,
    isGlobalSearch,
    isGlobalSearch
      ? (allProviders.length > 0 ? allProviders.map((p) => p.value) : installedProviders.map((p) => p.value))
      : [activeProvider?.value || installedProviders[0]?.value || "hdhub4u"],
    allProviders
  );

  // Selected Item State for Details & Streams
  const [selectedPost, setSelectedPost] = useState<Post | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const title = p.get("title");
      const link = p.get("link") || p.get("movie") || p.get("item") || "";
      const prov = p.get("provider");
      const poster = p.get("poster") || p.get("image") || "";

      // Section and tab titles must NEVER trigger a movie details modal
      const isSectionTitle =
        Boolean(title &&
        [
          "anime",
          "all anime",
          "all movies",
          "movies",
          "all tv shows",
          "tv shows",
          "shows",
          "trending movies",
          "trending tv shows",
          "popular right now",
        ].includes(title.toLowerCase().trim()));

      // Only initialize selectedPost if a valid media title or link is present and it is not a section title
      if ((link || title) && !isSectionTitle) {
        const backdrop = p.get("backdrop") || "";
        const cleanTitleKey = title ? title.replace(/\s*\(\d{4}\)$/, "").toLowerCase().trim() : "";
        const cachedBackdrop = cleanTitleKey ? backdropCache.get(cleanTitleKey) : undefined;
        return {
          title: title || "Movie Details",
          link: link,
          provider: prov || activeProvider?.value || installedProviders[0]?.value || "hdhub4u",
          image: poster,
          backdropUrl: backdrop || cachedBackdrop || undefined,
          isDirectDeepLink: true,
        };
      }
    }
    return initialNavState?.selectedPost || null;
  });
  const [details, setDetails] = useState<MediaDetails | null>(
    initialNavState?.details || null
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [streams, setStreams] = useState<StreamItem[]>(
    initialNavState?.streams || []
  );
  const [loadingStreams, setLoadingStreams] = useState(false);

  // Video Playback & Download Manager State
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("play");
      if (p) return p;
      const t = new URLSearchParams(window.location.search).get("title");
      if (t) return null; // If opening a specific title directly, do not restore stale playbackUrl
    }
    return initialNavState?.playbackUrl || null;
  });
  const [playerModalState, setPlayerModalState] = useState<{
    url: string;
    title: string;
    backdrop?: string;
    poster?: string;
    servers?: StreamItem[];
    runtime?: string | number;
    season?: number;
    episode?: number;
    episodes?: any[];
    seasonsCount?: number;
    tmdbId?: number;
    initialTime?: number;
    post?: any;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("play");
      const t = new URLSearchParams(window.location.search).get("title") || "Cinema Stream";
      const b = new URLSearchParams(window.location.search).get("backdrop") || new URLSearchParams(window.location.search).get("poster");
      const timeStr = new URLSearchParams(window.location.search).get("t");
      const parsedTime = timeStr ? parseInt(timeStr, 10) : undefined;
      if (p) {
        return {
          url: p,
          title: t,
          backdrop: b || undefined,
          poster: b || undefined,
          initialTime: !isNaN(parsedTime as number) ? parsedTime : undefined,
        };
      }
    }
    return null;
  });
  const [downloadManagerOpen, setDownloadManagerOpen] = useState(false);
  const [continueWatchingModalOpen, setContinueWatchingModalOpen] = useState(false);
  const [detailsInitialTab, setDetailsInitialTab] = useState<"stream" | "download" | null>(null);

  // Resume playback from exact position saved in Continue Watching
  const handleResumeContinueWatching = useCallback((item: ContinueWatchingItem) => {
    if (item.post) {
      setSelectedPost(item.post);
    }
    setPlayerModalState({
      url: item.playbackUrl || "",
      title: item.title,
      backdrop: item.backdrop || item.poster,
      poster: item.poster || item.backdrop,
      servers: (item.servers as any) || [],
      season: item.season,
      episode: item.episode,
      tmdbId: item.tmdbId,
      initialTime: item.currentTime,
      post: item.post,
    });
    setPlaybackUrl(item.playbackUrl || "");
  }, []);

  // Cast / Person Details State & URL Hash Synchronization (e.g. #!/person/3223)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.startsWith("#!/person/")) {
        const idPart = hash.replace("#!/person/", "").split("?")[0];
        const pId = parseInt(idPart, 10);
        if (!isNaN(pId)) return pId;
      }
      const qPerson = new URLSearchParams(window.location.search).get("person");
      if (qPerson) {
        const pId = parseInt(qPerson, 10);
        if (!isNaN(pId)) return pId;
      }
    }
    return null;
  });

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#!/person/")) {
        const idPart = hash.replace("#!/person/", "").split("?")[0];
        const pId = parseInt(idPart, 10);
        if (!isNaN(pId)) {
          selectedPersonIdRef.current = pId;
          setSelectedPersonId(pId);
        }
      } else if (!hash.startsWith("#!/person/") && selectedPersonIdRef.current !== null) {
        selectedPersonIdRef.current = null;
        setSelectedPersonId(null);
      }
    };

    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  // Synchronize ?play= parameter from URL (e.g. from /vlc/ page or direct links)
  useEffect(() => {
    const syncPlayFromUrl = () => {
      if (typeof window === "undefined") return;
      const p = new URLSearchParams(window.location.search).get("play");
      const t = new URLSearchParams(window.location.search).get("title") || "Cinema Stream";
      if (p) {
        setPlaybackUrl(p);
        setPlayerModalState((prev) => (prev?.url === p ? prev : { url: p, title: t }));
      }
    };

    syncPlayFromUrl();
    window.addEventListener("popstate", syncPlayFromUrl);
    return () => window.removeEventListener("popstate", syncPlayFromUrl);
  }, []);

  const handleOpenPerson = (personId: number) => {
    selectedPersonIdRef.current = personId;
    setSelectedPersonId(personId);
    try {
      window.history.pushState(
        { modal: "person", personId },
        "",
        window.location.pathname + window.location.search + `#!/person/${personId}`
      );
    } catch {}
  };

  const handleClosePerson = () => {
    if (selectedPersonIdRef.current === null) return;
    selectedPersonIdRef.current = null;
    setSelectedPersonId(null);
    try {
      if (window.history.state?.modal === "person") {
        window.history.back();
      } else if (window.location.hash.startsWith("#!/person/")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } catch {}
  };

  // Save current navigation state to sessionStorage on any change
  useEffect(() => {
    saveNavigationState({
      activeProviderValue: activeProvider?.value,
      activeFilter: activeBrowseFilter,
      searchQuery,
      isGlobalSearch,
      page,
      selectedPost,
      details,
      streams,
      playbackUrl,
      activeNavTab,
      activeCustomPage,
      isBrowsingCategories,
      viewAllCategory,
      selectedNicheId,
    });
  }, [
    activeProvider?.value,
    activeBrowseFilter,
    searchQuery,
    isGlobalSearch,
    page,
    selectedPost,
    details,
    streams,
    playbackUrl,
    activeNavTab,
    activeCustomPage,
    isBrowsingCategories,
    viewAllCategory,
    selectedNicheId,
  ]);

  // Synchronize browser URL query parameters so page reload retains exact view, filter and niche
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedPost) {
      if (selectedPost.title) params.set("title", selectedPost.title);
      if (selectedPost.backdropUrl) params.set("backdrop", selectedPost.backdropUrl);
    } else {
      if (activeCustomPage) {
        params.set("tab", activeCustomPage);
      } else if (searchQuery) {
        params.set("q", searchQuery);
        if (isGlobalSearch) params.set("global", "1");
      } else if (isBrowsingCategories) {
        params.set("tab", "categories");
      } else if (viewAllCategory) {
        const tab = activeNavTab === "tv" ? "tv" : activeNavTab === "anime" ? "anime" : "movies";
        params.set("tab", tab);
        if (viewAllCategory.filter) params.set("filter", viewAllCategory.filter);
        if (viewAllCategory.title) params.set("title", viewAllCategory.title);
      } else if (activeNavTab && activeNavTab !== "home") {
        params.set("tab", activeNavTab);
      } else {
        if (selectedNicheId) {
          params.set("tab", "home");
        }
      }

      if (selectedNicheId) {
        params.set("niche", selectedNicheId);
      }
      if (page > 1) {
        params.set("page", String(page));
      }
    }

    const newSearch = params.toString() ? `?${params.toString()}` : "";
    const currentSearch = window.location.search;
    if (newSearch !== currentSearch) {
      const newUrl = window.location.pathname + newSearch + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  }, [
    selectedPost,
    activeProvider?.value,
    activeCustomPage,
    searchQuery,
    isGlobalSearch,
    isBrowsingCategories,
    viewAllCategory,
    activeNavTab,
    selectedNicheId,
    page,
  ]);

  interface NavigationSnapshot {
    selectedNavTab: any;
    activeCustomPage: string | null;
    viewAllCategory: { filter: string; title: string } | null;
    selectedGenreShowcase: string | null;
    isComingSoonPageOpen: boolean;
    isMyListPageOpen: boolean;
    isBrowsingCategories: boolean;
    selectedCategoryId: string | null;
    selectedGenreCategory: any | null;
    selectedProviderGenre: any | null;
    isMergedFilter: boolean;
    searchQuery: string;
    isDedicatedSearchOpen: boolean;
    page: number;
    scrollY: number;
  }

  const savedCatalogScrollY = useRef<number>(0);
  const detailsHistoryStackRef = useRef<Post[]>([]);
  const navHistoryStackRef = useRef<NavigationSnapshot[]>([]);
  const selectedPersonIdRef = useRef<number | null>(selectedPersonId);
  const selectedPostRef = useRef<Post | null>(selectedPost);
  const playbackUrlRef = useRef<string | null>(playbackUrl);

  useEffect(() => {
    selectedPersonIdRef.current = selectedPersonId;
  }, [selectedPersonId]);

  useEffect(() => {
    selectedPostRef.current = selectedPost;
  }, [selectedPost]);

  useEffect(() => {
    playbackUrlRef.current = playbackUrl;
  }, [playbackUrl]);

  // Handle browser Back / Forward history (consistent on every page, search, and modal)
  useEffect(() => {
    const onPopState = () => {
      // 1. If video player modal is open, back closes it
      if (playbackUrlRef.current) {
        playbackUrlRef.current = null;
        setPlaybackUrl(null);
        setPlayerModalState(null);
        return;
      }

      // 2. If person details modal is open, back closes ONLY person modal and returns to media details
      if (selectedPersonIdRef.current !== null) {
        selectedPersonIdRef.current = null;
        setSelectedPersonId(null);
        if (window.location.hash.startsWith("#!/person/")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        return;
      }

      // 3. If media details modal is open, back returns to previous details or restores catalog/search view!
      if (selectedPostRef.current) {
        if (detailsHistoryStackRef.current.length > 0) {
          const prevPost = detailsHistoryStackRef.current.pop()!;
          handleSelectPost(prevPost, true);
          return;
        }
        selectedPostRef.current = null;
        setSelectedPost(null);
        setDetails(null);
        setStreams([]);
        clearOverlayState();
        document.body.style.overflow = "";

        // Clean detail query parameters immediately from URL so reload does not re-open modal
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          sp.delete("title");
          sp.delete("backdrop");
          sp.delete("backdropUrl");
          sp.delete("link");
          sp.delete("poster");
          sp.delete("image");
          sp.delete("movie");
          sp.delete("item");
          const newSearch = sp.toString() ? `?${sp.toString()}` : "";
          window.history.replaceState(null, "", window.location.pathname + newSearch);
        }

        const targetScroll = savedCatalogScrollY.current;
        requestAnimationFrame(() => {
          window.scrollTo({ top: targetScroll, behavior: "instant" });
        });
        return;
      }

      // 4. Pop from Navigation History Stack if present (restores exact subpage and scroll position)
      if (navHistoryStackRef.current.length > 0) {
        const prev = navHistoryStackRef.current.pop()!;
        setSelectedNavTab(prev.selectedNavTab);
        setActiveCustomPage(prev.activeCustomPage);
        setViewAllCategory(prev.viewAllCategory);
        setSelectedGenreShowcase(prev.selectedGenreShowcase);
        setIsComingSoonPageOpen(prev.isComingSoonPageOpen);
        setIsMyListPageOpen(prev.isMyListPageOpen);
        setIsBrowsingCategories(prev.isBrowsingCategories);
        setSelectedCategoryId(prev.selectedCategoryId);
        setSelectedGenreCategory(prev.selectedGenreCategory);
        setSelectedProviderGenre(prev.selectedProviderGenre);
        setIsMergedFilter(prev.isMergedFilter);
        setSearchQuery(prev.searchQuery);
        setIsDedicatedSearchOpen(prev.isDedicatedSearchOpen);
        setPage(prev.page);

        const targetScroll = prev.scrollY;
        savedCatalogScrollY.current = targetScroll;
        setTimeout(() => {
          window.scrollTo({ top: targetScroll, behavior: "instant" });
        }, 50);
        return;
      }

      // 5. Default: catalog route popstate
      const route = getInitialRouteState(loadNavigationState());
      if (route.tab) setSelectedNavTab(route.tab as any);
      setActiveCustomPage((route as any).customPage || null);
      setIsBrowsingCategories(route.isBrowsingCategories);
      setViewAllCategory(route.viewAllCategory);
      setSearchQuery(route.searchQuery);
      setIsGlobalSearch(route.isGlobalSearch);
      const catId = route.nicheId ? CREATIVE_INDUSTRIES.find((c) => c.id === route.nicheId)?.id || null : null;
      const genre = route.nicheId ? CREATIVE_GENRES.find((g) => g.id === route.nicheId) || null : null;
      setSelectedCategoryId(catId);
      setSelectedGenreCategory(genre);
      setPage(route.page);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Track and persist scroll position when browsing the catalog (not in modal)
  useEffect(() => {
    const onScroll = () => {
      if (!selectedPost && !playbackUrl && selectedPersonId === null) {
        savedCatalogScrollY.current = window.scrollY;
        saveNavigationState({ scrollY: window.scrollY });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [selectedPost, playbackUrl, selectedPersonId]);

  // Restore scroll position after reload
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    if (!scrollRestoredRef.current && posts.length > 0 && initialNavState?.scrollY) {
      scrollRestoredRef.current = true;
      setTimeout(() => {
        window.scrollTo({ top: initialNavState.scrollY || 0, behavior: "instant" });
      }, 60);
    }
  }, [posts.length]);

  // Provider Selection (Keep normal tabs active without view hijacking)
  const handleSelectProvider = (p: Provider) => {
    setActiveProvider(p);
  };

  // Open Details Modal and fetch metadata & initial streams
  const handleSelectPost = async (post: Post, isFromHistory = false) => {
    if (!isFromHistory) {
      if (!selectedPost) {
        // First modal open from catalog or search results
        savedCatalogScrollY.current = window.scrollY;
        window.history.pushState({ modal: "details", link: post.link }, "");
      } else {
        // Modal already open, clicked recommendation inside details
        detailsHistoryStackRef.current.push(selectedPost);
        window.history.pushState({ modal: "details", link: post.link }, "");
      }
    }

    setSelectedPost(post);

    const targetProviderKey = post.provider || activeProvider?.value;
    if (!targetProviderKey) return;

    // Check instant cache for details first to avoid empty flicker
    const cachedMeta = appCache.get<MediaDetails>(`api:meta:${targetProviderKey}:${post.link}`);
    if (cachedMeta) {
      setDetails(cachedMeta);
      setLoadingDetails(false);
    } else {
      setDetails(null);
      setLoadingDetails(true);
    }

    setStreams([]);
    setLoadingStreams(true);

    try {
      let activeLink = post.link;
      // Treat as search if no link, pure IMDb ID, or search/movie query route from Home shelves
      const isImdbOrMissing =
        !activeLink ||
        (activeLink.startsWith("tt") && !activeLink.includes("/")) ||
        activeLink.startsWith("/search") ||
        activeLink.startsWith("/movie/");

      if (isImdbOrMissing) {
        try {
          const cleanTitle = post.title.replace(/\s*\(\d{4}\)$/, "").trim();
          const searchResults = await api.search(targetProviderKey, cleanTitle);
          if (searchResults && searchResults.length > 0) {
            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
            const targetNorm = normalize(cleanTitle);

            // Verify title match so an unrelated search result is never opened
            const match = searchResults.find((r) => {
              const rNorm = normalize(r.title);
              return (
                rNorm === targetNorm ||
                rNorm.startsWith(targetNorm) ||
                targetNorm.startsWith(rNorm) ||
                rNorm.includes(targetNorm) ||
                targetNorm.includes(rNorm)
              );
            });

            if (match) {
              activeLink = match.link;
              setSelectedPost((prev) =>
                prev ? { ...prev, link: activeLink, provider: targetProviderKey } : prev
              );
            } else {
              console.log(`[Cinema] No match found for "${cleanTitle}" on ${targetProviderKey}`);
            }
          }
        } catch (err) {
          console.warn("Auto-search on active provider failed:", err);
        }
      }

      let meta: MediaDetails | null = null;
      if (activeLink) {
        try {
          meta = await api.getMeta(targetProviderKey, activeLink);
        } catch (e) {
          console.warn("Direct getMeta failed:", e);
        }
      }

      setDetails(meta);
      setLoadingDetails(false);

      // If no release list exists (e.g. embed/single stream provider like AutoEmbed, KissKh), resolve direct stream
      if (!meta?.linkList || meta.linkList.length === 0) {
        if (activeLink) {
          const resolved = await api.getStreams(targetProviderKey, activeLink, meta?.type || "movie");
          setStreams(Array.isArray(resolved) ? resolved : []);
        }
      }
    } catch (err) {
      console.error("Error loading media details:", err);
    } finally {
      setLoadingDetails(false);
      setLoadingStreams(false);
    }
  };

  // Automatically fetch details & streams when selectedPost is initialized from URL deep link
  const initialDeepLinkPostLoadedRef = useRef(false);
  useEffect(() => {
    if (!initialDeepLinkPostLoadedRef.current && selectedPost && !details) {
      initialDeepLinkPostLoadedRef.current = true;
      handleSelectPost(selectedPost, true);
    }
  }, [selectedPost, details]);

  const handleCloseDetails = (triggerHistoryBack = false) => {
    if (detailsHistoryStackRef.current.length > 0) {
      const prev = detailsHistoryStackRef.current.pop()!;
      handleSelectPost(prev, true);
      return;
    }

    setSelectedPost(null);
    setDetails(null);
    setStreams([]);
    setDetailsInitialTab(null);
    clearOverlayState();
    document.body.style.overflow = "";

    const targetScroll = savedCatalogScrollY.current;
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetScroll, behavior: "instant" });
    });

    if (triggerHistoryBack && window.history.state?.modal === "details") {
      window.history.back();
    } else {
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        sp.delete("title");
        sp.delete("backdrop");
        sp.delete("backdropUrl");
        sp.delete("link");
        sp.delete("poster");
        sp.delete("image");
        sp.delete("movie");
        sp.delete("item");
        if (activeProvider) {
          sp.set("provider", activeProvider.value);
        }
        const newSearch = sp.toString() ? `?${sp.toString()}` : "";
        window.history.replaceState(null, "", window.location.pathname + newSearch);
      }
    }
  };

  const handleClosePlayer = () => {
    setPlaybackUrl(null);
    setPlayerModalState(null);
    saveNavigationState({ playbackUrl: null });
    if (typeof window !== "undefined" && window.location.search.includes("play=")) {
      const u = new URL(window.location.href);
      u.searchParams.delete("play");
      u.searchParams.delete("title");
      window.history.replaceState(null, "", u.pathname + (u.search ? u.search : ""));
    }
  };

  // Open butter-smooth Cinema Video Player with full movie title & servers
  const handleOpenStreamPlayer = (
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
    tmdbId?: number,
    initialTime?: number,
    post?: any
  ) => {
    const rawTitle = title || selectedPost?.title || details?.title || "Cinema Stream";
    const cleanMovieTitle = rawTitle
      .replace(/\b(1080p|720p|2160p|4k|uhd|hdr|web-dl|webrip|bluray|x264|x265|hevc|aac|dual\s*audio|hindi|english|org|subs?)\b/gi, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/[\._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const finalTmdbId = tmdbId || (selectedPost as any)?.tmdbId || (details as any)?.id;
    let autoInitialTime = initialTime;
    if (!autoInitialTime) {
      try {
        const cwList = getContinueWatchingList();
        const match = cwList.find(
          (c) =>
            (finalTmdbId && c.tmdbId === finalTmdbId && c.season === season && c.episode === episode) ||
            (c.title && (cleanMovieTitle || rawTitle) && c.title.toLowerCase().trim() === (cleanMovieTitle || rawTitle).toLowerCase().trim() && c.season === season && c.episode === episode)
        );
        if (match && match.currentTime > 4) {
          autoInitialTime = match.currentTime;
        }
      } catch {}
    }

    setPlayerModalState({
      url,
      title: cleanMovieTitle || rawTitle,
      servers,
      backdrop: backdrop || details?.backdrop || selectedPost?.image,
      poster: poster || details?.poster || selectedPost?.image,
      runtime: runtime || details?.runtime,
      season,
      episode,
      episodes,
      seasonsCount,
      tmdbId: finalTmdbId,
      initialTime: autoInitialTime,
      post: post || selectedPost,
    });
    setPlaybackUrl(url);
    saveNavigationState({ playbackUrl: url });
  };

  // Player launcher - routes to in-app Web Player if defaultPlayer is "web"
  const handlePlayExternal = (url: string, player?: ExternalPlayerType, title?: string) => {
    const finalPlayer = player || settings.defaultPlayer || "web";
    if (finalPlayer === "web") {
      handleOpenStreamPlayer(url, title);
      return;
    }
    launchExternalPlayer(url, finalPlayer, settings.customPlayerScheme, title);
  };

  // Hero Spotlight Actions: Play directly opens Video Player, Download opens Download section, Info opens Details
  const handlePlayFromHero = (post: Post) => {
    const isTv = post.mediaType === "tv" || (post as any)?.type === "series" || (post as any)?.type === "tv";
    handleOpenStreamPlayer(
      "",
      post.title,
      undefined,
      post.image,
      post.image,
      undefined,
      isTv ? 1 : undefined,
      isTv ? 1 : undefined,
      undefined,
      undefined,
      post.id
    );
    handleSelectPost(post);
  };

  const handleDownloadFromHero = (post: Post) => {
    setDetailsInitialTab("download");
    handleSelectPost(post);
  };

  const handleInfoFromHero = (post: Post) => {
    setDetailsInitialTab(null);
    handleSelectPost(post);
  };

  const heroCandidatePosts =
    activeNavTab === "anime"
      ? (animeSpotlightItems.length > 0 ? animeSpotlightItems : ANIME_SPOTLIGHT_ITEMS)
      : activeNavTab === "movies"
      ? (movieSpotlightItems.length > 0 ? movieSpotlightItems : MOVIES_SPOTLIGHT_ITEMS)
      : activeNavTab === "tv"
      ? (tvSpotlightItems.length > 0 ? tvSpotlightItems : TV_SPOTLIGHT_ITEMS)
      : (homeSpotlightItems.length > 0 ? homeSpotlightItems : HOME_SPOTLIGHT_ITEMS);

  const heroPost = heroCandidatePosts[0] || null;

  // Persistent tracking of active section slides (Home, Movies, TV, or active Genre)
  const [activeSectionSlides, setActiveSectionSlides] = useState<Post[]>(heroCandidatePosts);
  const [, setAmbientSlideIndex] = useState<number>(0);

  // Sync section slides whenever heroCandidatePosts changes while on Home/Movies/TV
  useEffect(() => {
    if (heroCandidatePosts.length > 0 && !isComingSoonPageOpen && !isBrowsingCategories && !selectedGenreShowcase) {
      setActiveSectionSlides(heroCandidatePosts);
    }
  }, [heroCandidatePosts, isComingSoonPageOpen, isBrowsingCategories, selectedGenreShowcase]);

  // Keep ambient wallpaper smoothly changing across all pages (Coming Soon, Categories, etc.)
  // using slides from the section the user came from (Home, Movies, TV, or Genre)
  const isHeroMounted = (!activeCustomPage && !searchQuery && !isBrowsingCategories && !viewAllCategory && !isDedicatedSearchOpen && !isComingSoonPageOpen && selectedNavTab !== "coming-soon" && !isMyListPageOpen && selectedNavTab !== "mylist" && !selectedGenreShowcase && !!heroPost);

  useEffect(() => {
    if (isHeroMounted || selectedGenreShowcase) return;
    if (!activeSectionSlides || activeSectionSlides.length <= 1) return;

    const timer = setInterval(() => {
      setAmbientSlideIndex((prev) => {
        const nextIdx = (prev + 1) % activeSectionSlides.length;
        const slide = activeSectionSlides[nextIdx];
        if (slide) {
          const bg = slide.backdropUrl || slide.image || null;
          if (bg) setAmbientBackdrop(bg);
        }
        return nextIdx;
      });
    }, 8000);

    return () => clearInterval(timer);
  }, [isHeroMounted, selectedGenreShowcase, activeSectionSlides]);

  // Push current browsing state and scroll position before navigating to a subpage or changing view
  const pushNavSnapshot = () => {
    if (!selectedPost && !playbackUrl && selectedPersonId === null) {
      navHistoryStackRef.current.push({
        selectedNavTab,
        activeCustomPage,
        viewAllCategory,
        selectedGenreShowcase,
        isComingSoonPageOpen,
        isMyListPageOpen,
        isBrowsingCategories,
        selectedCategoryId,
        selectedGenreCategory,
        selectedProviderGenre,
        isMergedFilter,
        searchQuery,
        isDedicatedSearchOpen,
        page,
        scrollY: window.scrollY,
      });
      try {
        window.history.pushState({ cinemaPage: true }, "");
      } catch {}
    }
  };

  // Back to multi-row home from anywhere (Navbar logo, hard reset)
  const handleBackToHome = () => {
    detailsHistoryStackRef.current = [];
    navHistoryStackRef.current = [];
    setSelectedPost(null);
    setDetails(null);
    setStreams([]);
    clearOverlayState();
    document.body.style.overflow = "";

    setActiveCustomPage(null);
    setViewAllCategory(null);
    setSelectedGenreShowcase(null);
    setIsComingSoonPageOpen(false);
    setIsMyListPageOpen(false);
    setIsDedicatedSearchOpen(false);
    setIsBrowsingCategories(false);
    setSelectedCategoryId(null);
    setSelectedGenreCategory(null);
    setSelectedProviderGenre(null);
    setIsMergedFilter(false);
    setSelectedNavTab("home");
    setSearchQuery("");
    setPage(1);

    if (window.history.state?.modal === "details") {
      window.history.replaceState(null, "", "/");
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  // Universal Back Button: Restores exact previous view and scroll position
  const handleGoBack = () => {
    // 1. If video player modal is open, close it
    if (playbackUrlRef.current) {
      handleClosePlayer();
      return;
    }

    // 2. If person details modal is open, close it
    if (selectedPersonIdRef.current !== null) {
      handleClosePerson();
      return;
    }

    // 3. If media details modal is open, return to previous details or restore catalog/search view
    if (selectedPostRef.current) {
      handleCloseDetails(true);
      return;
    }

    // 4. Pop from navigation history stack to restore previous subpage/tab and scroll position
    if (navHistoryStackRef.current.length > 0) {
      const prev = navHistoryStackRef.current.pop()!;
      setSelectedNavTab(prev.selectedNavTab);
      setActiveCustomPage(prev.activeCustomPage);
      setViewAllCategory(prev.viewAllCategory);
      setSelectedGenreShowcase(prev.selectedGenreShowcase);
      setIsComingSoonPageOpen(prev.isComingSoonPageOpen);
      setIsMyListPageOpen(prev.isMyListPageOpen);
      setIsBrowsingCategories(prev.isBrowsingCategories);
      setSelectedCategoryId(prev.selectedCategoryId);
      setSelectedGenreCategory(prev.selectedGenreCategory);
      setSelectedProviderGenre(prev.selectedProviderGenre);
      setIsMergedFilter(prev.isMergedFilter);
      setSearchQuery(prev.searchQuery);
      setIsDedicatedSearchOpen(prev.isDedicatedSearchOpen);
      setPage(prev.page);

      const targetScroll = prev.scrollY;
      savedCatalogScrollY.current = targetScroll;
      setTimeout(() => {
        window.scrollTo({ top: targetScroll, behavior: "instant" });
      }, 50);
      return;
    }

    // 5. Default fallback to home
    handleBackToHome();
  };

  // Helper to resolve category filter
  const getCategoryFilter = (cat: CreativeCategory): { filter: string; title: string } => {
    if (cat.id === "bollywood") {
      const bFilter = filters.find(
        (f) =>
          (f.filter.toLowerCase().includes("bollywood") || f.title.toLowerCase().includes("bollywood")) &&
          !f.filter.toLowerCase().includes("south")
      );
      return {
        filter: bFilter ? bFilter.filter : "/category/bollywood-movies",
        title: "Bollywood",
      };
    }
    if (cat.id === "tollywood" || cat.id === "kollywood" || cat.id === "mollywood" || cat.id === "sandalwood") {
      const matchedFilter = filters.find((f) =>
        cat.filterMatch.some(
          (m) => f.filter.toLowerCase().includes(m) || f.title.toLowerCase().includes(m)
        )
      );
      if (matchedFilter) {
        return { filter: matchedFilter.filter, title: cat.name };
      }
      const keyword =
        cat.id === "tollywood" ? "telugu"
        : cat.id === "kollywood" ? "tamil"
        : cat.id === "mollywood" ? "malayalam"
        : "kannada";
      return { filter: `/category/${keyword}`, title: cat.name };
    }
    if (cat.id === "punjabi") {
      const pFilter = filters.find((f) =>
        cat.filterMatch.some(
          (m) => f.filter.toLowerCase().includes(m) || f.title.toLowerCase().includes(m)
        )
      );
      return { filter: pFilter ? pFilter.filter : "/category/punjabi", title: cat.name };
    }
    const matched = filters.find((f) => {
      const fFilter = f.filter.toLowerCase();
      const fTitle = f.title.toLowerCase();
      return cat.filterMatch.some((m: string) => {
        const pattern = m.toLowerCase();
        return fFilter.includes(pattern) || fTitle.includes(pattern);
      });
    });
    return { filter: matched ? matched.filter : `/category/${cat.id}`, title: cat.name };
  };

  // Helper to resolve genre filter
  const getGenreFilter = (genre: CreativeCategory): { filter: string; title: string } => {
    const matched = filters.find((f) => {
      const fFilter = f.filter.toLowerCase();
      const fTitle = f.title.toLowerCase();
      return genre.filterMatch.some((m: string) => {
        const pattern = m.toLowerCase();
        return fFilter.includes(pattern) || fTitle.includes(pattern);
      });
    });
    return { filter: matched ? matched.filter : `/category/${genre.id}`, title: genre.name };
  };

  // Select Category (Solid Red when active)
  const handleSelectCategory = (cat: CreativeCategory | null) => {
    if (!cat) {
      setSelectedCategoryId(null);
      if (isMergedFilter && (selectedGenreCategory || selectedProviderGenre)) {
        setIsMergedFilter(false);
        if (selectedGenreCategory) {
          setViewAllCategory(getGenreFilter(selectedGenreCategory));
        } else if (selectedProviderGenre) {
          setViewAllCategory({
            filter: selectedProviderGenre.filter,
            title: `${selectedProviderGenre.title} Movies`,
          });
        }
        setSearchQuery("");
      } else {
        handleGoBack();
      }
      setPage(1);
      return;
    }

    pushNavSnapshot();
    setSelectedCategoryId(cat.id);
    setIsBrowsingCategories(false);

    const activeGenreTitle = selectedGenreCategory?.name || selectedProviderGenre?.title;
    if (isMergedFilter && activeGenreTitle) {
      // Merged filter: Combine Category + Genre
      const combinedTitle = `${cat.name} + ${activeGenreTitle}`;
      const combinedSearch = `${cat.name} ${activeGenreTitle}`;
      setViewAllCategory({ filter: "", title: combinedTitle });
      setSearchQuery(combinedSearch);
      setPage(1);
      return;
    }

    // Normal separate Category selection
    setSelectedGenreCategory(null);
    setSelectedProviderGenre(null);
    const catInfo = getCategoryFilter(cat);
    setViewAllCategory(catInfo);
    setSearchQuery("");
    setPage(1);
  };

  // Select Genre Category (Solid Blue when active)
  const handleSelectGenreCategory = (genre: CreativeCategory | null) => {
    if (!genre) {
      setSelectedGenreCategory(null);
      if (isMergedFilter && selectedCategoryId) {
        setIsMergedFilter(false);
        const cat = CREATIVE_INDUSTRIES.find((c) => c.id === selectedCategoryId);
        if (cat) {
          setViewAllCategory(getCategoryFilter(cat));
        } else {
          handleGoBack();
        }
        setSearchQuery("");
      } else {
        handleGoBack();
      }
      setPage(1);
      return;
    }

    pushNavSnapshot();
    setSelectedGenreCategory(genre);
    setSelectedProviderGenre(null);
    setIsBrowsingCategories(false);

    const activeCat = CREATIVE_INDUSTRIES.find((c) => c.id === selectedCategoryId);
    if (isMergedFilter && activeCat) {
      // Merged filter: Combine Category + Genre
      const combinedTitle = `${activeCat.name} + ${genre.name}`;
      const combinedSearch = `${activeCat.name} ${genre.name}`;
      setViewAllCategory({ filter: "", title: combinedTitle });
      setSearchQuery(combinedSearch);
      setPage(1);
      return;
    }

    // Normal separate Genre selection
    setSelectedCategoryId(null);
    const gInfo = getGenreFilter(genre);
    setViewAllCategory(gInfo);
    setSearchQuery("");
    setPage(1);
  };

  // Select Provider Genre (Solid Blue when active)
  const handleSelectProviderGenre = (filter: string, title: string) => {
    pushNavSnapshot();
    setSelectedProviderGenre({ filter, title });
    setSelectedGenreCategory(null);
    setIsBrowsingCategories(false);

    const activeCat = CREATIVE_INDUSTRIES.find((c) => c.id === selectedCategoryId);
    if (isMergedFilter && activeCat) {
      // Merged filter: Combine Category + Genre
      const combinedTitle = `${activeCat.name} + ${title}`;
      const combinedSearch = `${activeCat.name} ${title}`;
      setViewAllCategory({ filter: "", title: combinedTitle });
      setSearchQuery(combinedSearch);
      setPage(1);
      return;
    }

    // Normal separate Genre selection
    setSelectedCategoryId(null);
    setViewAllCategory({ filter, title: `${title} Movies` });
    setSearchQuery("");
    setPage(1);
  };

  // Toggle Merge Filters (+)
  const handleToggleMerge = () => {
    if (isMergedFilter) {
      setIsMergedFilter(false);
      const cat = CREATIVE_INDUSTRIES.find((c) => c.id === selectedCategoryId);
      if (cat) {
        setSelectedGenreCategory(null);
        setSelectedProviderGenre(null);
        setViewAllCategory(getCategoryFilter(cat));
        setSearchQuery("");
      } else if (selectedGenreCategory) {
        setSelectedCategoryId(null);
        setViewAllCategory(getGenreFilter(selectedGenreCategory));
        setSearchQuery("");
      } else if (selectedProviderGenre) {
        setSelectedCategoryId(null);
        setViewAllCategory({
          filter: selectedProviderGenre.filter,
          title: `${selectedProviderGenre.title} Movies`,
        });
        setSearchQuery("");
      }
      setPage(1);
      return;
    }

    // Turn Merge mode ON
    setIsMergedFilter(true);
    const cat = CREATIVE_INDUSTRIES.find((c) => c.id === selectedCategoryId);
    const genreTitle = selectedGenreCategory?.name || selectedProviderGenre?.title;

    if (cat && genreTitle) {
      const combinedTitle = `${cat.name} + ${genreTitle}`;
      const combinedSearch = `${cat.name} ${genreTitle}`;
      setViewAllCategory({ filter: "", title: combinedTitle });
      setSearchQuery(combinedSearch);
      setPage(1);
    }
  };

  const handleOpenComingSoon = () => {
    pushNavSnapshot();
    detailsHistoryStackRef.current = [];
    setSelectedPost(null);
    setDetails(null);
    setStreams([]);
    clearOverlayState();
    document.body.style.overflow = "";

    setActiveCustomPage(null);
    setIsBrowsingCategories(false);
    setViewAllCategory(null);
    setSelectedGenreShowcase(null);
    setIsDedicatedSearchOpen(false);
    setSelectedCategoryId(null);
    setSelectedGenreCategory(null);
    setSelectedProviderGenre(null);
    setIsMergedFilter(false);
    setIsMyListPageOpen(false);
    setIsComingSoonPageOpen(true);
    setSelectedNavTab("coming-soon");
    setSearchQuery("");
    setPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle Navbar and Footer Links (Home, Movies, TV Shows, Anime, Coming Soon, Categories, Downloads, Legal, Rankings)
  const handleSelectCategoryNav = (
    type: "home" | "movies" | "tv" | "anime" | "coming-soon" | "categories" | "rankings" | "letterboxd" | "imdb" | "downloads" | "terms" | "privacy" | "disclaimer" | "mylist"
  ) => {
    setIsDedicatedSearchOpen(false);
    if (
      type === "downloads" ||
      type === "terms" ||
      type === "privacy" ||
      type === "disclaimer" ||
      type === "rankings" ||
      type === "letterboxd" ||
      type === "imdb"
    ) {
      pushNavSnapshot();
      setIsComingSoonPageOpen(false);
      setIsMyListPageOpen(false);
      setIsBrowsingCategories(false);
      setSelectedNavTab(
        type === "downloads"
          ? "downloads"
          : type === "rankings" || type === "letterboxd" || type === "imdb"
          ? "rankings"
          : "home"
      );
      setActiveCustomPage(type);
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    if (type === "home") {
      handleBackToHome();
      return;
    }

    setActiveCustomPage(null);

    if (type === "coming-soon") {
      navHistoryStackRef.current = [];
      handleOpenComingSoon();
      return;
    }

    if (type === "mylist") {
      navHistoryStackRef.current = [];
      detailsHistoryStackRef.current = [];
      setSelectedPost(null);
      setDetails(null);
      setStreams([]);
      clearOverlayState();
      document.body.style.overflow = "";

      setIsComingSoonPageOpen(false);
      setSelectedGenreShowcase(null);
      setIsBrowsingCategories(false);
      setViewAllCategory(null);
      setIsDedicatedSearchOpen(false);
      setSelectedCategoryId(null);
      setSelectedGenreCategory(null);
      setSelectedProviderGenre(null);
      setIsMergedFilter(false);
      setIsMyListPageOpen(true);
      setSelectedNavTab("mylist");
      setSearchQuery("");
      setPage(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (type === "movies") {
      navHistoryStackRef.current = [];
      detailsHistoryStackRef.current = [];
      setSelectedPost(null);
      setDetails(null);
      setStreams([]);
      clearOverlayState();
      document.body.style.overflow = "";

      setIsComingSoonPageOpen(false);
      setIsMyListPageOpen(false);
      setSelectedGenreShowcase(null);
      setIsBrowsingCategories(false);
      setSelectedCategoryId(null);
      setSelectedGenreCategory(null);
      setSelectedProviderGenre(null);
      setIsMergedFilter(false);
      setViewAllCategory(null);
      setSelectedNavTab("movies");
      setPage(1);
      setSearchQuery("");
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    if (type === "tv") {
      navHistoryStackRef.current = [];
      detailsHistoryStackRef.current = [];
      setSelectedPost(null);
      setDetails(null);
      setStreams([]);
      clearOverlayState();
      document.body.style.overflow = "";

      setIsComingSoonPageOpen(false);
      setIsMyListPageOpen(false);
      setSelectedGenreShowcase(null);
      setIsBrowsingCategories(false);
      setSelectedCategoryId(null);
      setSelectedGenreCategory(null);
      setSelectedProviderGenre(null);
      setIsMergedFilter(false);
      setViewAllCategory(null);
      setSelectedNavTab("tv");
      setPage(1);
      setSearchQuery("");
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    if (type === "anime") {
      navHistoryStackRef.current = [];
      detailsHistoryStackRef.current = [];
      setSelectedPost(null);
      setDetails(null);
      setStreams([]);
      clearOverlayState();
      document.body.style.overflow = "";

      setIsComingSoonPageOpen(false);
      setIsMyListPageOpen(false);
      setSelectedGenreShowcase(null);
      setIsBrowsingCategories(false);
      setSelectedCategoryId(null);
      setSelectedGenreCategory(null);
      setSelectedProviderGenre(null);
      setViewAllCategory(null);
      setSelectedNavTab("anime");
      setPage(1);
      setSearchQuery("");
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    if (type === "categories") {
      setIsComingSoonPageOpen(false);
      setIsMyListPageOpen(false);
      setSelectedGenreShowcase(null);
      setIsBrowsingCategories(true);
      setViewAllCategory(null);
      setSelectedCategoryId(null);
      setSelectedGenreCategory(null);
      setSelectedProviderGenre(null);
      setIsMergedFilter(false);
      setSearchQuery("");
      setPage(1);
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
  };


  return (
    <div
      className="app-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg-main)",
        color: "#fff",
        position: "relative",
      }}
    >
      {/* Top GitHub/YouTube-style single-pass Progress Bar (Suppressed when Details modal is open in favor of transparent skeleton) */}
      <TopProgressBar
        isLoading={Boolean((loadingProviders || loadingPosts || loadingDetails || loadingStreams) && !selectedPost)}
      />

      {/* Dynamic Double-Buffered Blurred Ambient Background */}
      <AmbientBackground
        activeCustomPage={activeCustomPage}
        searchQuery={searchQuery}
        bgLayerA={bgLayerA}
        bgLayerB={bgLayerB}
        activeBgLayer={activeBgLayer}
      />

      {/* 1. Navbar (with CINEMA logo and Home / Movies / TV Shows / Categories) */}
      <Navbar
        providers={installedProviders}
        activeProvider={activeProvider}
        onSelectProvider={handleSelectProvider}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim()) {
            setActiveCustomPage(null);
            setIsBrowsingCategories(false);
            setViewAllCategory(null);
            setSelectedGenreShowcase(null);
            setIsDedicatedSearchOpen(false);
            setSelectedCategoryId(null);
            setSelectedGenreCategory(null);
            setSelectedProviderGenre(null);
            setIsMergedFilter(false);
          }
          setPage(1);
        }}
        isGlobalSearch={isGlobalSearch}
        onToggleGlobalSearch={() => setIsGlobalSearch(!isGlobalSearch)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenDownloads={() => setDownloadManagerOpen(true)}
        onOpenSearch={() => setIsDedicatedSearchOpen(true)}
        onGoHome={handleBackToHome}
        onOpenSignIn={() => setShowSignInModal(true)}
        onOpenCreateAccount={() => setShowCreateAccountModal(true)}
        onOpenManageProfiles={() => setShowManageProfilesModal(true)}
        onClose={
          viewAllCategory || selectedGenreShowcase || isBrowsingCategories || isComingSoonPageOpen || activeCustomPage || isDedicatedSearchOpen || searchQuery || navHistoryStackRef.current.length > 0
            ? handleGoBack
            : undefined
        }
        onSelectCategoryNav={handleSelectCategoryNav}
        activeNavTab={activeNavTab}
        hasHero={(!activeCustomPage && !searchQuery && !isBrowsingCategories && !viewAllCategory && !isComingSoonPageOpen && selectedNavTab !== "coming-soon" && !!heroPost) || !!selectedGenreShowcase}
      />

      {/* 2. MAIN CONTENT AREA */}
      {searchQuery ? (
        /* A. SEARCH RESULTS VIEW (with Niche Dropdown, Pagination & Back Button) - Evaluated first so search works across all pages */
        <div className="cinema-subpage-container" style={{ width: "100%", paddingTop: "64px" }}>
          <div
            className="catalog-filter-container"
            style={{
              maxWidth: "1480px",
              margin: "0 auto",
              padding: "16px 24px 0 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <CatalogFilterBar
              selectedCategoryId={selectedCategoryId}
              selectedGenreCategory={selectedGenreCategory}
              selectedProviderGenreTitle={selectedProviderGenre?.title}
              isMergedFilter={isMergedFilter}
              extraGenres={genreFilters}
              onSelectCategory={handleSelectCategory}
              onSelectGenreCategory={handleSelectGenreCategory}
              onSelectProviderGenre={handleSelectProviderGenre}
              onToggleMerge={handleToggleMerge}
            />
          </div>

          <MediaGrid
            posts={posts}
            title={
              isMergedFilter && selectedCategoryId && (selectedGenreCategory || selectedProviderGenre)
                ? `${CREATIVE_INDUSTRIES.find((c) => c.id === selectedCategoryId)?.name || selectedCategoryId} + ${selectedGenreCategory?.name || selectedProviderGenre?.title}`
                : `${isGlobalSearch ? "Global Search" : activeProvider?.name || "Search"} for "${searchQuery}"`
            }
            loading={loadingPosts}
            providerName={activeProvider?.name}
            page={page}
            onPageChange={(newPage) => {
              setPage(newPage);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSelectPost={handleSelectPost}
            showBack={true}
            onBack={handleGoBack}
            isGlobalSearch={isGlobalSearch}
            isStreaming={isStreaming}
            onToggleGlobalSearch={() => setIsGlobalSearch(true)}
          />
        </div>
      ) : activeCustomPage === "rankings" ? (
        <RankingsHubPage
          onSelectPost={handleSelectPost}
          onBack={handleGoBack}
          activeProviderKey={activeProvider?.value}
          pageMode="top250"
        />
      ) : activeCustomPage === "letterboxd" ? (
        <RankingsHubPage
          onSelectPost={handleSelectPost}
          onBack={handleGoBack}
          activeProviderKey={activeProvider?.value}
          pageMode="letterboxd"
        />
      ) : activeCustomPage === "imdb" ? (
        <RankingsHubPage
          onSelectPost={handleSelectPost}
          onBack={handleGoBack}
          activeProviderKey={activeProvider?.value}
          pageMode="imdb"
        />
      ) : activeCustomPage === "downloads" ? (
        <DownloadPage onBack={handleGoBack} />
      ) : activeCustomPage === "terms" ? (
        <TermsPage onBack={handleGoBack} />
      ) : activeCustomPage === "privacy" ? (
        <PrivacyPage onBack={handleGoBack} />
      ) : activeCustomPage === "disclaimer" ? (
        <DisclaimerPage onBack={handleGoBack} />
      ) : isBrowsingCategories ? (
        /* B. BROWSE BY CATEGORY PAGE (Vibrant colorful category cards matching reference) */
        <div className="cinema-subpage-container" style={{ width: "100%", paddingTop: "64px" }}>
          <BrowseCategoriesGrid
            onSelectCategory={handleSelectCategory}
            onOpenRankings={() => handleSelectCategoryNav("rankings")}
            onBack={handleGoBack}
          />
        </div>
      ) : isDedicatedSearchOpen ? (
        /* C1. DEDICATED FULL-SCREEN SEARCH PAGE */
        <DedicatedSearchPage
          posts={posts}
          onSelectPost={handleSelectPost}
          onBack={handleGoBack}
          loading={loadingPosts}
          onTriggerSearch={(q) => {
            pushNavSnapshot();
            setSearchQuery(q);
            setIsDedicatedSearchOpen(false);
          }}
        />
      ) : isComingSoonPageOpen || selectedNavTab === "coming-soon" || selectedGenreShowcase?.toLowerCase().includes("coming") || viewAllCategory?.title.toLowerCase().includes("coming") ? (
        /* Dedicated Coming Soon Page */
        <ComingSoonPage
          onBack={handleGoBack}
          onSelectPost={handleSelectPost}
        />
      ) : isMyListPageOpen || selectedNavTab === "mylist" ? (
        /* Dedicated My List Page (Matches CNO.TO reference with Continue Watching, Custom Lists, Stats) */
        <MyListPage
          onSelectPost={handleSelectPost}
          onResumeContinueWatching={handleResumeContinueWatching}
          onOpenDownloads={() => setDownloadManagerOpen(true)}
          onBrowseMore={handleBackToHome}
        />
      ) : selectedGenreShowcase ? (
        /* C2. GENRE SHOWCASE PAGE (Matching Cno.to Screenshot 2) */
        <GenreShowcasePage
          genreTitle={selectedGenreShowcase}
          posts={posts}
          onSelectPost={handleSelectPost}
          onBack={handleGoBack}
          onOpenFilterBrowse={(genre) => {
            pushNavSnapshot();
            setViewAllCategory({ filter: `/genre/${genre.toLowerCase()}`, title: genre });
            setSelectedGenreShowcase(null);
          }}
          onStreamNow={handlePlayFromHero}
          onSlideChange={(_p, bg) => setAmbientBackdrop(bg || null)}
        />
      ) : viewAllCategory ? (
        /* C3. DEDICATED FILTER & BROWSE PAGE (Matching Cno.to Screenshot 3) */
        <CatalogFilterBrowsePage
          initialTitle={viewAllCategory.title}
          initialGenre={viewAllCategory.title}
          posts={posts}
          loading={loadingPosts}
          onSelectPost={handleSelectPost}
          onBack={handleGoBack}
        />
      ) : (
        /* D. MULTI-ROW HOMEPAGE (Hero Spotlight + Browse by Provider + Divided Horizontal Categories) */
        <div style={{ width: "100%", position: "relative", zIndex: 1 }}>
          {/* Hero Spotlight — framed cleanly below navbar */}
          {heroPost && (
            <HeroSpotlight
              post={heroPost}
              candidatePosts={heroCandidatePosts}
              provider={activeProvider}
              categoryLabel={activeNavTab === "movies" ? "Movies" : activeNavTab === "tv" ? "TV Shows" : activeNavTab === "anime" ? "Anime" : undefined}
              onPlay={handlePlayFromHero}
              onDownload={handleDownloadFromHero}
              onInfo={handleInfoFromHero}
              onSlideChange={(_p, bg) => setAmbientBackdrop(bg || null)}
            />
          )}

          {/* Standalone Provider Shelf (Only if no heroPost on Home tab) */}
          {!heroPost && activeNavTab === "home" && (
            <div style={{ marginTop: "24px", position: "relative", zIndex: 2 }}>
              <BrowseByProviderShelf
                providers={installedProviders}
                activeProviderKey={activeProvider?.value}
                onSelectProvider={handleSelectProvider}
              />
            </div>
          )}


          {/* Divided Horizontal Category Rows with "View All ->" */}
          <div
            className={`home-catalog-container ${!heroPost ? "no-hero" : ""}`}
            style={{ width: "100%", marginTop: "32px" }}
          >
            {activeNavTab === "movies" ? (
              /* Dedicated Movies Showcase (Matching Screenshot 1) */
              <div style={{ display: "flex", flexDirection: "column", gap: "56px", width: "100%" }}>
                {moviesShelves.map((shelf) => {
                  const isLandscape =
                    shelf.id.includes("top-10") ||
                    shelf.id.includes("franchise") ||
                    shelf.id.includes("action") ||
                    shelf.id.includes("sci-fi") ||
                    shelf.id.includes("animation") ||
                    shelf.id.includes("documentaries") ||
                    shelf.id.includes("coming-soon") ||
                    shelf.id.includes("box-office");

                  return (
                    <React.Fragment key={shelf.id}>
                      <CatalogSection
                        title={shelf.title}
                        filter=""
                        providerValue=""
                        initialPosts={shelf.items}
                        layout={isLandscape ? "landscape" : "portrait"}
                        onViewAll={(_filter, title) => {
                          if (title.toLowerCase().includes("coming")) {
                            handleOpenComingSoon();
                          } else {
                            pushNavSnapshot();
                            setSelectedGenreShowcase(null);
                            setViewAllCategory({ filter: `/filter/${encodeURIComponent(title)}`, title });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        onSelectPost={handleSelectPost}
                      />

                      {/* Browse by Genre Shelf embedded right below Popular Right Now (Matching Screenshot 1) */}
                      {shelf.id === "popular-right-now" && (
                        <BrowseByGenreShelf
                          onSelectGenre={(genreName) => {
                            pushNavSnapshot();
                            setSelectedGenreShowcase(genreName);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
                      )}

                      {/* Explore Topics Shelf embedded right below Documentaries (Matching Screenshot 1) */}
                      {shelf.id === "documentaries" && (
                        <ExploreTopicsShelf
                          onSelectTopic={(topicName) => {
                            pushNavSnapshot();
                            setSelectedGenreShowcase(topicName);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Bottom Callout: Discover All Movies Button (Matching Screenshot 1) */}
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0 20px 0" }}>
                  <button
                    onClick={() => {
                      pushNavSnapshot();
                      setViewAllCategory({ filter: "", title: "All Movies" });
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "14px 34px",
                      borderRadius: "9999px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "none",
                      transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e50914";
                      e.currentTarget.style.borderColor = "#e50914";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span>Discover All Movies</span>
                    <span style={{ fontSize: "16px" }}>→</span>
                  </button>
                </div>
              </div>
            ) : activeNavTab === "tv" ? (
              /* Dedicated TV Shows Showcase (Matching Screenshot 2) */
              <div style={{ display: "flex", flexDirection: "column", gap: "56px", width: "100%" }}>
                {tvShelves.map((shelf) => {
                  const isLandscape =
                    shelf.id.includes("top-10") ||
                    shelf.id.includes("new-episodes") ||
                    shelf.id.includes("drama") ||
                    shelf.id.includes("docuseries") ||
                    shelf.id.includes("kids");

                  return (
                    <React.Fragment key={shelf.id}>
                      <CatalogSection
                        title={shelf.title}
                        filter=""
                        providerValue=""
                        initialPosts={shelf.items}
                        layout={isLandscape ? "landscape" : "portrait"}
                        onViewAll={(_filter, title) => {
                          pushNavSnapshot();
                          setSelectedGenreShowcase(null);
                          setViewAllCategory({ filter: `/filter/${encodeURIComponent(title)}`, title });
                          window.scrollTo({ top: 0, behavior: "instant" });
                        }}
                        onSelectPost={handleSelectPost}
                      />

                      {/* Browse by Genre Shelf embedded right below Popular Shows (Matching Screenshot 2) */}
                      {shelf.id === "popular-shows" && (
                        <BrowseByGenreShelf
                          onSelectGenre={(genreName) => {
                            pushNavSnapshot();
                            setSelectedGenreShowcase(genreName);
                            window.scrollTo({ top: 0, behavior: "instant" });
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Bottom Callout: Discover All Shows Button (Matching Screenshot 2) */}
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0 20px 0" }}>
                  <button
                    onClick={() => {
                      pushNavSnapshot();
                      setViewAllCategory({ filter: "/category/web-series", title: "All TV Shows" });
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "14px 34px",
                      borderRadius: "9999px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "none",
                      transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e50914";
                      e.currentTarget.style.borderColor = "#e50914";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span>Discover All Shows</span>
                    <span style={{ fontSize: "16px" }}>→</span>
                  </button>
                </div>
              </div>
            ) : activeNavTab === "anime" ? (
              /* Dedicated Anime Showcase (Top Airing, Trending, Masterpieces, Shonen, Movies, Classics) */
              <div style={{ display: "flex", flexDirection: "column", gap: "56px", width: "100%" }}>
                {animeShelves.map((shelf) => {
                  const isLandscape =
                    shelf.id.includes("top-10") ||
                    shelf.id.includes("shonen") ||
                    shelf.id.includes("movies") ||
                    shelf.id.includes("dark");

                  return (
                    <React.Fragment key={shelf.id}>
                      <CatalogSection
                        title={shelf.title}
                        filter=""
                        providerValue=""
                        initialPosts={shelf.items}
                        layout={isLandscape ? "landscape" : "portrait"}
                        onViewAll={(_filter, title) => {
                          pushNavSnapshot();
                          setSelectedGenreShowcase(null);
                          setViewAllCategory({ filter: `/genre/anime`, title: `Anime - ${title}` });
                          window.scrollTo({ top: 0, behavior: "instant" });
                        }}
                        onSelectPost={handleSelectPost}
                      />

                      {/* Browse by Genre Shelf embedded right below Trending Anime */}
                      {shelf.id === "trending-anime" && (
                        <BrowseByGenreShelf
                          onSelectGenre={(genreName) => {
                            pushNavSnapshot();
                            setSelectedGenreShowcase(genreName);
                            window.scrollTo({ top: 0, behavior: "instant" });
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Bottom Callout: Discover All Anime Button */}
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0 20px 0" }}>
                  <button
                    onClick={() => {
                      pushNavSnapshot();
                      setViewAllCategory({ filter: "/genre/anime", title: "All Anime" });
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "14px 34px",
                      borderRadius: "9999px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "none",
                      transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e50914";
                      e.currentTarget.style.borderColor = "#e50914";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span>Discover All Anime</span>
                    <span style={{ fontSize: "16px" }}>→</span>
                  </button>
                </div>
              </div>
            ) : activeNavTab === "home" ? (
              /* Multi-Row Home Showcase (All uniform media cards, no disruptive banners) */
              <div style={{ display: "flex", flexDirection: "column", gap: "56px", width: "100%" }}>
                {/* 3D Landscape Continue Watching Shelf with Red Progress Bar & Time Remaining */}
                <ContinueWatchingShelf
                  onResume={handleResumeContinueWatching}
                  onSelectPost={handleSelectPost}
                  onOpenModal={() => setActiveNavTab("watchlist")}
                />

                {/* Personalized 16:9 Landscape Shelf: Top Picks for [User] */}
                <TopPicksPersonalizedShelf
                  availablePosts={allHomePosts}
                  onSelectPost={handleSelectPost}
                />

                {homeShelves.map((shelf, idx) => (
                  <React.Fragment key={shelf.id}>
                    {/* Explore Horror Category Banner rendered BEFORE the shelf so media cards appear directly below it */}
                    {shelf.id === "halloween-horror" && (
                      <HomeCinematicBanner
                        type="explore"
                        eyebrow="ALL OCTOBER"
                        title="Halloween & Horror"
                        description="Slashers, haunted houses, witches, ghost stories, and scares for the kids."
                        buttonText="Explore Horror →"
                        backdropUrl="https://image.tmdb.org/t/p/original/sHI9xlFRWCJ38AIIfOqnGjuEvXz.jpg"
                        onExplore={() => {
                          pushNavSnapshot();
                          setSelectedGenreShowcase("Horror");
                          setPage(1);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    )}

                    <CatalogSection
                      title={shelf.title}
                      filter=""
                      providerValue=""
                      initialPosts={shelf.items}
                      layout={
                        shelf.id.includes("trending-tv") ||
                        shelf.id.includes("coming-soon") ||
                        shelf.id.includes("documentaries") ||
                        shelf.id.includes("box-office") ||
                        shelf.id.includes("halloween") ||
                        shelf.id.includes("horror")
                          ? "landscape"
                          : idx % 2 === 1
                          ? "landscape"
                          : "portrait"
                      }
                      onViewAll={(_filter, title) => {
                        if (title.toLowerCase().includes("coming")) {
                          handleOpenComingSoon();
                        } else {
                          pushNavSnapshot();
                          setSelectedGenreShowcase(null);
                          setViewAllCategory({ filter: `/filter/${encodeURIComponent(title)}`, title });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      onSelectPost={handleSelectPost}
                    />

                    {/* UPPER BANNER: Popular TV Show Cinematic Banner after Trending TV Shows */}
                    {shelf.id === "trending-tv-shows" && (
                      <HomeCinematicBanner
                        type="spotlight"
                        post={tvSpotlightItems[0] || TV_SPOTLIGHT_ITEMS[0]}
                        eyebrow="POPULAR NOW"
                        actionLabel="Watch"
                        onPlay={handlePlayFromHero}
                        onInfo={handleInfoFromHero}
                      />
                    )}

                    {/* MID BANNER & Shelf: Browse by Language + Browse by Genre + Popular Movie Cinematic Banner after Popular Right Now */}
                    {(shelf.id === "popular-right-now" || (homeShelves.findIndex((s) => s.id === "popular-right-now") === -1 && idx === 1)) && (
                      <>
                        <BrowseByLanguageShelf
                          onSelectLanguage={(lang) => {
                            pushNavSnapshot();
                            setSelectedGenreShowcase(lang.name);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
                        <BrowseByGenreShelf
                          onSelectGenre={(genreName) => {
                            pushNavSnapshot();
                            setSelectedGenreShowcase(genreName);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
                        <HomeCinematicBanner
                          type="spotlight"
                          post={movieSpotlightItems[1] || MOVIES_SPOTLIGHT_ITEMS[0]}
                          eyebrow="POPULAR NOW"
                          actionLabel="Play"
                          onPlay={handlePlayFromHero}
                          onInfo={handleInfoFromHero}
                        />
                      </>
                    )}

                    {/* Explore Topics Shelf embedded on Home right after Documentaries */}
                    {shelf.id === "documentaries" && (
                      <ExploreTopicsShelf
                        onSelectTopic={(topicName) => {
                          pushNavSnapshot();
                          setSelectedGenreShowcase(topicName);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : !loadingPosts && posts.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "80px 24px",
                  textAlign: "center",
                  minHeight: "50vh",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    background: "rgba(229, 9, 20, 0.12)",
                    border: "1px solid rgba(229, 9, 20, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "18px",
                    color: "#e50914",
                  }}
                >
                  <ServerIcon size={26} />
                </div>

                <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
                  Server Inactive or Catalog Empty
                </h3>

                <p style={{ fontSize: "14px", color: "#a3a3a3", maxWidth: "480px", marginBottom: "20px", lineHeight: "1.6" }}>
                  The local backend server is not running or the provider is still loading.
                </p>

                {/* Helpful Activation Guide Box */}
                <div
                  style={{
                    maxWidth: "460px",
                    width: "100%",
                    background: "#0e0e11",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                    padding: "18px 22px",
                    marginBottom: "24px",
                    textAlign: "left",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#e50914" }}>•</span>
                    <span>How to activate the server:</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#888888", lineHeight: "1.6" }}>
                    <li>Go to the <strong style={{ color: "#ffffff" }}>Downloads</strong> section.</li>
                    <li>Install <strong style={{ color: "#ffffff" }}>Cinema APK</strong> or <strong style={{ color: "#ffffff" }}>Cinema Runner</strong> on your device.</li>
                    <li>Keep Runner or the app active in the background to automatically scrape and stream catalog sources.</li>
                  </ul>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    onClick={() => handleSelectCategoryNav("downloads")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "11px 24px",
                      borderRadius: "12px",
                      background: "#e50914",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.2s ease, transform 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#b80710")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#e50914")}
                  >
                    <DownloadIcon size={16} />
                    <span>Go to Downloads</span>
                  </button>

                  <button
                    onClick={() => {
                      appCache.clear();
                      window.location.reload();
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "11px 24px",
                      borderRadius: "12px",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "border-color 0.2s ease, transform 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)")}
                  >
                    <RefreshIcon size={16} />
                    <span>Reload Catalog</span>
                  </button>
                </div>
              </div>
            ) : filters.length > 0 ? (
              (activeNavTab === "movies"
                ? filters.slice(0, 18)
                : activeNavTab === "tv"
                ? filters.slice(0, 10)
                : filters.slice(0, 5)
              ).map((f, idx) => {
                let sectionTitle = f.title;
                let sectionLayout: "landscape" | "portrait" = "portrait";
                let showRank = false;
                let showDateBadge = false;

                if (activeNavTab === "movies") {
                  const configs: Array<{ title: string; layout: "landscape" | "portrait"; rank?: boolean; badge?: boolean }> = [
                    { title: "Top 10 Movies Today", layout: "landscape", rank: true },
                    { title: "Movie Premieres", layout: "landscape" },
                    { title: "Trending Movies", layout: "landscape" },
                    { title: "Popular Right Now", layout: "portrait" },
                    { title: "Blockbusters", layout: "landscape" },
                    { title: "Critically Acclaimed", layout: "portrait" },
                    { title: "Franchise", layout: "landscape" },
                    { title: "Action & Adventure", layout: "landscape" },
                    { title: "Comedy", layout: "portrait" },
                    { title: "Sci-Fi & Fantasy", layout: "landscape" },
                    { title: "Horror", layout: "portrait" },
                    { title: "Hidden Gems", layout: "portrait" },
                    { title: "Animation", layout: "landscape" },
                    { title: "Thriller", layout: "portrait" },
                    { title: "Documentaries", layout: "landscape" },
                    { title: "Explore Studios", layout: "landscape" },
                    { title: "Box Office Hits", layout: "landscape" },
                    { title: "Timeless Classics", layout: "portrait" },
                  ];
                  const cfg = configs[idx % configs.length];
                  sectionTitle = cfg.title;
                  sectionLayout = cfg.layout;
                  showRank = Boolean(cfg.rank);
                  showDateBadge = Boolean(cfg.badge);
                } else if (activeNavTab === "tv") {
                  const configs: Array<{ title: string; layout: "landscape" | "portrait"; rank?: boolean; badge?: boolean }> = [
                    { title: "Top 10 Shows Today", layout: "landscape", rank: true },
                    { title: "New Episodes This Week", layout: "landscape" },
                    { title: "Popular Shows", layout: "portrait" },
                    { title: "Shows by Genre", layout: "landscape" },
                    { title: "Top Rated Series", layout: "portrait" },
                    { title: "Drama Series", layout: "landscape" },
                    { title: "Comedy Series", layout: "portrait" },
                    { title: "Animation & Anime", layout: "portrait" },
                    { title: "Documentaries", layout: "landscape" },
                  ];
                  const cfg = configs[idx % configs.length];
                  sectionTitle = cfg.title;
                  sectionLayout = cfg.layout;
                  showRank = Boolean(cfg.rank);
                  showDateBadge = Boolean(cfg.badge);
                } else {
                  // Home tab (Core shelves only, no genre dumping on Home)
                  const configs: Array<{ title: string; layout: "landscape" | "portrait"; rank?: boolean; badge?: boolean }> = [
                    { title: "Top 10 Movies Today", layout: "landscape", rank: true },
                    { title: "New in Theaters", layout: "landscape" },
                    { title: "Popular Right Now", layout: "portrait" },
                    { title: "Trending TV Shows", layout: "landscape" },
                    { title: "Coming Soon", layout: "landscape", badge: true },
                  ];
                  const cfg = configs[idx % configs.length];
                  sectionTitle = cfg.title;
                  sectionLayout = cfg.layout;
                  showRank = Boolean(cfg.rank);
                  showDateBadge = Boolean(cfg.badge);
                }

                return (
                  <CatalogSection
                    key={`${f.filter}-${idx}`}
                    title={sectionTitle}
                    filter={f.filter}
                    providerValue={activeProvider?.value || ""}
                    initialPosts={idx === 0 && f.filter === activeBrowseFilter ? posts : undefined}
                    layout={sectionLayout}
                    showRank={showRank}
                    showDateBadge={showDateBadge}
                    onViewAll={(filter, title) => {
                      if (title.toLowerCase().includes("coming")) {
                        handleOpenComingSoon();
                        return;
                      }
                      pushNavSnapshot();
                      const lower = title.toLowerCase();
                      const isGenre = [
                        "comedy",
                        "action",
                        "sci-fi",
                        "fantasy",
                        "horror",
                        "drama",
                        "animation",
                        "romance",
                        "thriller",
                        "adventure",
                        "documentary",
                        "crime",
                        "mystery",
                        "family",
                        "anime",
                        "classic",
                      ].some((g) => lower.includes(g));

                      if (isGenre) {
                        setSelectedGenreShowcase(title);
                      } else {
                        setViewAllCategory({ filter, title });
                      }
                      setPage(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onSelectPost={handleSelectPost}
                  />
                );
              })
            ) : (
              <CatalogSection
                title="Top 10 Movies Today"
                filter=""
                providerValue={activeProvider?.value || ""}
                initialPosts={posts}
                layout="portrait"
                showRank={true}
                onViewAll={(filter, title) => {
                  pushNavSnapshot();
                  setViewAllCategory({ filter, title });
                  setPage(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSelectPost={handleSelectPost}
              />
            )}
          </div>
        </div>
      )}

      {/* 3. Professional Footer */}
      <Footer
        onNavigateTab={(tab) => handleSelectCategoryNav(tab)}
        onExploreNiches={() => handleSelectCategoryNav("categories")}
      />

      {/* 4. Mobile Bottom Nav */}
      <BottomNav
        activeTab={
          isDedicatedSearchOpen || searchQuery
            ? "search"
            : isMyListPageOpen || selectedNavTab === "mylist"
            ? "mylist"
            : activeNavTab === "movies"
            ? "movies"
            : activeNavTab === "tv"
            ? "tv"
            : "home"
        }
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === "home") {
            handleBackToHome();
            setIsDedicatedSearchOpen(false);
          } else if (tab === "movies") {
            setIsDedicatedSearchOpen(false);
            handleSelectCategoryNav("movies");
          } else if (tab === "tv") {
            setIsDedicatedSearchOpen(false);
            handleSelectCategoryNav("tv");
          } else if (tab === "search") {
            setIsDedicatedSearchOpen(true);
          } else if (tab === "mylist") {
            setIsDedicatedSearchOpen(false);
            handleSelectCategoryNav("mylist");
          }
        }}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Global Application Modals */}
      <AppModals
        selectedPost={selectedPost}
        setSelectedPost={setSelectedPost}
        details={details}
        setDetails={setDetails}
        loadingDetails={loadingDetails}
        streams={streams}
        setStreams={setStreams}
        loadingStreams={loadingStreams}
        activeProvider={activeProvider}
        installedProviders={installedProviders}
        handleSelectProvider={handleSelectProvider}
        handleSelectPost={handleSelectPost}
        handleCloseDetails={handleCloseDetails}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isGlobalSearch={isGlobalSearch}
        setIsGlobalSearch={setIsGlobalSearch}
        settingsModalOpen={settingsModalOpen}
        setSettingsModalOpen={setSettingsModalOpen}
        handleBackToHome={handleBackToHome}
        handleSelectCategoryNav={handleSelectCategoryNav}
        activeNavTab={activeNavTab}
        defaultPlayer={settings.defaultPlayer}
        detailsInitialTab={detailsInitialTab}
        handleOpenStreamPlayer={handleOpenStreamPlayer}
        handlePlayExternal={handlePlayExternal}
        handleOpenPerson={handleOpenPerson}
        detailsHistoryStackRef={detailsHistoryStackRef}
        setActiveCustomPage={setActiveCustomPage}
        setIsBrowsingCategories={setIsBrowsingCategories}
        setViewAllCategory={setViewAllCategory}
        setSelectedCategoryId={setSelectedCategoryId}
        setSelectedGenreCategory={setSelectedGenreCategory}
        setSelectedProviderGenre={setSelectedProviderGenre}
        setIsMergedFilter={setIsMergedFilter}
        setPage={setPage}
        selectedPersonId={selectedPersonId}
        handleClosePerson={handleClosePerson}
        downloadManagerOpen={downloadManagerOpen}
        setDownloadManagerOpen={setDownloadManagerOpen}
        ambientBackdrop={ambientBackdrop}
        heroPost={heroPost}
        heroCandidatePosts={heroCandidatePosts}
        activeSectionSlides={activeSectionSlides}
        playerModalState={playerModalState}
        setPlayerModalState={setPlayerModalState}
        playbackUrl={playbackUrl}
        handleClosePlayer={handleClosePlayer}
        continueWatchingModalOpen={continueWatchingModalOpen}
        setContinueWatchingModalOpen={setContinueWatchingModalOpen}
        handleResumeContinueWatching={handleResumeContinueWatching}
      />

      {/* Auth & Profiles Modals */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onOpenCreateAccount={() => {
          setShowSignInModal(false);
          setShowCreateAccountModal(true);
        }}
      />

      <CreateAccountModal
        isOpen={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onOpenSignIn={() => {
          setShowCreateAccountModal(false);
          setShowSignInModal(true);
        }}
        onSuccess={() => {}}
      />

      <ManageProfilesModal
        isOpen={showManageProfilesModal}
        onClose={() => setShowManageProfilesModal(false)}
      />

      <GlassToast />
      </div>
  );
}
