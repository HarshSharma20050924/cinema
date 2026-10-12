import { useState, useEffect, useRef } from "react";
import { useProviders } from "./hooks/useProviders";
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
import { Footer } from "./components/layout/Footer";
import { DetailsModal } from "./components/details/DetailsModal";
import { PersonDetailsModal } from "./components/person/PersonDetailsModal";
import { VideoPlayerModal } from "./components/player/VideoPlayerModal";
import { OnboardingModal } from "./components/setup/OnboardingModal";
import { SettingsModal } from "./components/settings/SettingsModal";
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

function getInitialRouteState(saved: NavigationState | null) {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get("tab") as "home" | "movies" | "tv" | "categories" | null;
  const q = urlParams.get("q");
  const filter = urlParams.get("filter");
  const title = urlParams.get("title");
  const niche = urlParams.get("niche");
  const isGlobal = urlParams.get("global") === "1";
  const pageNum = parseInt(urlParams.get("page") || "1", 10);

  if (tab === "categories") {
    return {
      tab: "categories" as const,
      isBrowsingCategories: true,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (tab === "movies") {
    return {
      tab: "movies" as const,
      isBrowsingCategories: false,
      viewAllCategory: {
        filter: filter !== null ? filter : (saved?.viewAllCategory?.filter ?? ""),
        title: title || saved?.viewAllCategory?.title || "All Movies",
      },
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: niche || saved?.selectedNicheId || null,
      page: !isNaN(pageNum) && pageNum > 0 ? pageNum : (saved?.page || 1),
    };
  }

  if (tab === "tv") {
    return {
      tab: "tv" as const,
      isBrowsingCategories: false,
      viewAllCategory: {
        filter: filter !== null ? filter : (saved?.viewAllCategory?.filter ?? "/category/web-series"),
        title: title || saved?.viewAllCategory?.title || "TV Shows & Series",
      },
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: niche || saved?.selectedNicheId || "web-series",
      page: !isNaN(pageNum) && pageNum > 0 ? pageNum : (saved?.page || 1),
    };
  }

  if (q) {
    return {
      tab: "home" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: q,
      isGlobalSearch: isGlobal || saved?.isGlobalSearch || false,
      nicheId: niche || saved?.selectedNicheId || null,
      page: !isNaN(pageNum) && pageNum > 0 ? pageNum : (saved?.page || 1),
    };
  }

  if (tab === "home") {
    if (filter !== null && title) {
      return {
        tab: "home" as const,
        isBrowsingCategories: false,
        viewAllCategory: { filter, title },
        searchQuery: "",
        isGlobalSearch: false,
        nicheId: niche || null,
        page: !isNaN(pageNum) && pageNum > 0 ? pageNum : 1,
      };
    }
    return {
      tab: "home" as const,
      isBrowsingCategories: false,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: niche || null,
      page: 1,
    };
  }

  // Fallback to saved session state
  if (saved?.isBrowsingCategories) {
    return {
      tab: "categories" as const,
      isBrowsingCategories: true,
      viewAllCategory: null,
      searchQuery: "",
      isGlobalSearch: false,
      nicheId: null,
      page: 1,
    };
  }

  if (saved?.viewAllCategory) {
    return {
      tab: saved.activeNavTab || "movies",
      isBrowsingCategories: false,
      viewAllCategory: saved.viewAllCategory,
      searchQuery: saved.searchQuery || "",
      isGlobalSearch: saved.isGlobalSearch || false,
      nicheId: saved.selectedNicheId || null,
      page: saved.page || 1,
    };
  }

  return {
    tab: "home" as const,
    isBrowsingCategories: false,
    viewAllCategory: null,
    searchQuery: saved?.searchQuery || "",
    isGlobalSearch: saved?.isGlobalSearch || false,
    nicheId: saved?.selectedNicheId || null,
    page: saved?.page || 1,
  };
}

const initialRoute = getInitialRouteState(initialNavState);

export default function App() {
  const [searchQuery, setSearchQuery] = useState(initialRoute.searchQuery);
  const [isGlobalSearch, setIsGlobalSearch] = useState(initialRoute.isGlobalSearch);
  const [page, setPage] = useState(initialRoute.page);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"home" | "search" | "extensions" | "settings">("home");

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

  // Derive active navbar tab
  const activeNavTab: "home" | "movies" | "tv" | "categories" = isBrowsingCategories
    ? "categories"
    : searchQuery
    ? "home"
    : !viewAllCategory
    ? "home"
    : viewAllCategory.title.toLowerCase().includes("movie")
    ? "movies"
    : viewAllCategory.title.toLowerCase().includes("tv") ||
      viewAllCategory.title.toLowerCase().includes("series")
    ? "tv"
    : "categories";

  // 1. Settings Hook
  const {
    settings,
    saveSettings,
    completeSetup,
    toggleExtension,
  } = useSettings();

  // 2. Providers Hook (restores saved provider on reload)
  const {
    providers: allProviders,
    activeProvider,
    setActiveProvider,
    loading: loadingProviders,
  } = useProviders(initialNavState?.activeProviderValue);

  // Ensure activeProvider stays in sync with installedProviders
  const installedProviders = allProviders.filter((p) => {
    if (p.disabled) return false;
    const installed = settings.installedExtensions;
    if (installed && installed.length > 0) {
      return (
        installed.includes(p.value) ||
        (installed.includes('movieBox') && p.value === 'movieBoxWeb')
      );
    }
    return p.value.toLowerCase() === 'hdhub4u';
  });

  // Sync activeProvider if current activeProvider is not in installed list
  if (installedProviders.length > 0 && activeProvider) {
    const isInstalled = installedProviders.some((p) => p.value === activeProvider.value);
    if (!isInstalled) {
      const preferred =
        installedProviders.find((p) => p.value === "hdhub4u") || installedProviders[0];
      setActiveProvider(preferred);
    }
  }

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
    isGlobalSearch ? installedProviders.map((p) => p.value) : [activeProvider?.value || "hdhub4u"],
    allProviders
  );

  // Selected Item State for Details & Streams
  const [selectedPost, setSelectedPost] = useState<Post | null>(
    initialNavState?.selectedPost || null
  );
  const [details, setDetails] = useState<MediaDetails | null>(
    initialNavState?.details || null
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [streams, setStreams] = useState<StreamItem[]>(
    initialNavState?.streams || []
  );
  const [loadingStreams, setLoadingStreams] = useState(false);

  // Video Playback State
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(
    initialNavState?.playbackUrl || null
  );

  // Cast / Person Details State & URL Hash Synchronization (e.g. #!/person/3223)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#!/person/")) {
        const idPart = hash.replace("#!/person/", "").split("?")[0];
        const pId = parseInt(idPart, 10);
        if (!isNaN(pId)) {
          setSelectedPersonId(pId);
        }
      } else if (!hash.startsWith("#!/person/") && selectedPersonId !== null) {
        setSelectedPersonId(null);
      }
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [selectedPersonId]);

  const handleOpenPerson = (personId: number) => {
    setSelectedPersonId(personId);
    window.location.hash = `#!/person/${personId}`;
  };

  const handleClosePerson = () => {
    setSelectedPersonId(null);
    if (window.location.hash.startsWith("#!/person/")) {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    }
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
    isBrowsingCategories,
    viewAllCategory,
    selectedNicheId,
  ]);

  // Synchronize browser URL query parameters so page reload retains exact view, filter and niche
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("q", searchQuery);
      if (isGlobalSearch) params.set("global", "1");
    } else if (isBrowsingCategories) {
      params.set("tab", "categories");
    } else if (viewAllCategory) {
      const tab = activeNavTab === "tv" ? "tv" : "movies";
      params.set("tab", tab);
      if (viewAllCategory.filter) params.set("filter", viewAllCategory.filter);
      if (viewAllCategory.title) params.set("title", viewAllCategory.title);
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

    const newSearch = params.toString() ? `?${params.toString()}` : "";
    const currentSearch = window.location.search;
    if (newSearch !== currentSearch) {
      const newUrl = window.location.pathname + newSearch + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  }, [
    searchQuery,
    isGlobalSearch,
    isBrowsingCategories,
    viewAllCategory,
    activeNavTab,
    selectedNicheId,
    page,
  ]);

  const savedCatalogScrollY = useRef<number>(0);
  const detailsHistoryStackRef = useRef<Post[]>([]);

  // Handle browser Back / Forward history (consistent on every page, search, and modal)
  useEffect(() => {
    const onPopState = () => {
      // 1. If video player modal is open, back closes it
      if (playbackUrl) {
        setPlaybackUrl(null);
        return;
      }

      // 2. If person details modal is open, back closes it
      if (selectedPersonId !== null) {
        setSelectedPersonId(null);
        return;
      }

      // 3. If media details modal is open, back returns to previous details or restores catalog/search view!
      if (selectedPost) {
        if (detailsHistoryStackRef.current.length > 0) {
          const prevPost = detailsHistoryStackRef.current.pop()!;
          handleSelectPost(prevPost, true);
          return;
        }
        setSelectedPost(null);
        setDetails(null);
        setStreams([]);
        clearOverlayState();
        document.body.style.overflow = "";
        const targetScroll = savedCatalogScrollY.current;
        requestAnimationFrame(() => {
          window.scrollTo({ top: targetScroll, behavior: "instant" });
        });
        return;
      }

      // 4. Default: catalog route popstate
      const route = getInitialRouteState(loadNavigationState());
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
  }, [playbackUrl, selectedPersonId, selectedPost]);

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

  // Provider Selection
  const handleSelectProvider = (p: Provider) => {
    setActiveProvider(p);
    setViewAllCategory(null);
    setIsBrowsingCategories(false);
    setSearchQuery("");
    setPage(1);
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
      let meta: MediaDetails | null = null;
      if (post.link) {
        try {
          meta = await api.getMeta(targetProviderKey, post.link);
        } catch (e) {
          console.warn("Direct getMeta failed:", e);
        }
      }

      setDetails(meta);
      setLoadingDetails(false);

      // If no release list exists (e.g. embed/single stream provider like AutoEmbed, KissKh), resolve direct stream
      if (!meta?.linkList || meta.linkList.length === 0) {
        if (post.link) {
          const resolved = await api.getStreams(targetProviderKey, post.link, meta?.type || "movie");
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

  const handleCloseDetails = (triggerHistoryBack = true) => {
    if (detailsHistoryStackRef.current.length > 0) {
      const prev = detailsHistoryStackRef.current.pop()!;
      handleSelectPost(prev, true);
      return;
    }

    setSelectedPost(null);
    setDetails(null);
    setStreams([]);
    clearOverlayState();
    document.body.style.overflow = "";

    const targetScroll = savedCatalogScrollY.current;
    requestAnimationFrame(() => {
      window.scrollTo({ top: targetScroll, behavior: "instant" });
    });

    if (triggerHistoryBack && window.history.state?.modal === "details") {
      window.history.back();
    }
  };

  const handleClosePlayer = () => {
    setPlaybackUrl(null);
    saveNavigationState({ playbackUrl: null });
  };

  // External Player launcher (VLC / MPV / MX Player)
  const handlePlayExternal = (url: string, player: ExternalPlayerType = "vlc") => {
    const finalPlayer = player || settings.defaultPlayer || "vlc";
    launchExternalPlayer(url, finalPlayer, settings.customPlayerScheme);
  };

  const heroPost = posts.length > 0 ? posts[0] : null;

  // Back to multi-row home
  const handleBackToHome = () => {
    setViewAllCategory(null);
    setIsBrowsingCategories(false);
    setSelectedCategoryId(null);
    setSelectedGenreCategory(null);
    setSelectedProviderGenre(null);
    setIsMergedFilter(false);
    setSearchQuery("");
    setPage(1);
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
        handleBackToHome();
      }
      setPage(1);
      return;
    }

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
          handleBackToHome();
        }
        setSearchQuery("");
      } else {
        handleBackToHome();
      }
      setPage(1);
      return;
    }

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

  // Handle Navbar Category Links (Home, Movies, TV Shows, Categories)
  const handleSelectCategoryNav = (type: "home" | "movies" | "tv" | "categories") => {
    if (type === "home") {
      handleBackToHome();
      return;
    }

    if (type === "movies") {
      setIsBrowsingCategories(false);
      setSelectedCategoryId(null);
      setSelectedGenreCategory(null);
      setSelectedProviderGenre(null);
      setIsMergedFilter(false);
      setViewAllCategory({
        filter: "",
        title: "All Movies",
      });
      setPage(1);
      setSearchQuery("");
      return;
    }

    if (type === "tv") {
      setIsBrowsingCategories(false);
      setSelectedCategoryId("web-series");
      setSelectedGenreCategory(null);
      setSelectedProviderGenre(null);
      setIsMergedFilter(false);
      const tvFilter = filters.find(
        (f) =>
          f.title.toLowerCase().includes("tv") ||
          f.title.toLowerCase().includes("series") ||
          f.filter.toLowerCase().includes("series")
      );
      setViewAllCategory({
        filter: tvFilter?.filter || "/category/web-series",
        title: "TV Shows & Series",
      });
      setPage(1);
      setSearchQuery("");
      return;
    }

    if (type === "categories") {
      setIsBrowsingCategories(true);
      setViewAllCategory(null);
      setSelectedCategoryId(null);
      setSelectedGenreCategory(null);
      setSelectedProviderGenre(null);
      setIsMergedFilter(false);
      setSearchQuery("");
      setPage(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      {/* Top Animated Loader Bar */}
      {(loadingProviders || loadingPosts || loadingDetails || loadingStreams) && (
        <div className="top-loader-bar" />
      )}

      {/* 0. ONBOARDING GATE */}
      {!settings.isConfigured && (
        <OnboardingModal
          availableProviders={allProviders}
          onComplete={(_providerSource, installed) => {
            completeSetup("Cinema", "Cinema", installed);
            if (installed.length > 0) {
              const matched = allProviders.find((p) => p.value === installed[0]);
              if (matched) setActiveProvider(matched);
            }
          }}
        />
      )}

      {/* 1. Navbar (with CINEMA logo and Home / Movies / TV Shows / Categories) */}
      <Navbar
        providers={installedProviders}
        activeProvider={activeProvider}
        onSelectProvider={handleSelectProvider}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setIsBrowsingCategories(false);
          setPage(1);
        }}
        isGlobalSearch={isGlobalSearch}
        onToggleGlobalSearch={() => setIsGlobalSearch(!isGlobalSearch)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onGoHome={handleBackToHome}
        onSelectCategoryNav={handleSelectCategoryNav}
        activeNavTab={activeNavTab}
        hasHero={!searchQuery && !isBrowsingCategories && !viewAllCategory && !!heroPost}
      />

      {/* 2. MAIN CONTENT AREA */}
      {searchQuery ? (
        /* A. SEARCH RESULTS VIEW (with Niche Dropdown, Pagination & Back Button) */
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
            onBack={handleBackToHome}
            isGlobalSearch={isGlobalSearch}
            isStreaming={isStreaming}
          />
        </div>
      ) : isBrowsingCategories ? (
        /* B. BROWSE BY CATEGORY PAGE (Vibrant colorful category cards matching reference) */
        <div className="cinema-subpage-container" style={{ width: "100%", paddingTop: "64px" }}>
          <BrowseCategoriesGrid onSelectCategory={handleSelectCategory} />
        </div>
      ) : viewAllCategory ? (
        /* C. DEDICATED VIEW ALL CATEGORY PAGE (with Cinema Niche Dropdown + 30+ titles Grid & Pagination) */
        <div className="cinema-subpage-container" style={{ width: "100%", padding: "84px 24px 0 24px" }}>
          {/* Cinema Niche & Genre Dropdown on Movies / TV Shows */}
          <div
            className="catalog-filter-container"
            style={{
              maxWidth: "1480px",
              margin: "0 auto",
              padding: "0 0 16px 0",
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
            title={viewAllCategory.title}
            loading={loadingPosts}
            providerName={activeProvider?.name}
            page={page}
            onPageChange={(newPage) => {
              setPage(newPage);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSelectPost={handleSelectPost}
            showBack={true}
            onBack={handleBackToHome}
            isStreaming={isStreaming}
          />
        </div>
      ) : (
        /* D. MULTI-ROW HOMEPAGE (Hero Spotlight + Divided Horizontal Categories) */
        <div style={{ width: "100%" }}>
          {/* Hero Spotlight — pulls up behind fixed transparent navbar */}
          {heroPost && (
            <div style={{ marginTop: "-64px" }}>
              <HeroSpotlight
                post={heroPost}
                provider={activeProvider}
                onStream={handleSelectPost}
                onDownload={handleSelectPost}
              />
            </div>
          )}

          {/* Right-aligned Categories & Genre Dropdowns on Home Page */}
          <div
            className="catalog-filter-container"
            style={{
              maxWidth: "1480px",
              margin: "0 auto",
              padding: "16px 24px 8px 24px",
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

          {/* Divided Horizontal Category Rows with "View All ->" */}
          <div
            className={`home-catalog-container ${!heroPost ? "no-hero" : ""}`}
            style={{ width: "100%", marginTop: "0" }}
          >
            {!loadingPosts && posts.length === 0 ? (
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
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "rgba(229, 9, 20, 0.15)",
                    border: "2px solid rgba(229, 9, 20, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "18px",
                  }}
                >
                  <span style={{ fontSize: "28px" }}>📡</span>
                </div>

                <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#ffffff", marginBottom: "8px" }}>
                  Server Inactive or Catalog Empty
                </h3>
                <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "440px", marginBottom: "26px", lineHeight: "1.6" }}>
                  The mobile backend cluster may be reconnecting or the current provider has not loaded titles yet. Tap below to reload the servers and restore the catalog.
                </p>

                <button
                  onClick={() => {
                    appCache.clear();
                    window.location.reload();
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "13px 32px",
                    borderRadius: "10px",
                    background: "#e50914",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(229, 9, 20, 0.5)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#b80710";
                    e.currentTarget.style.transform = "scale(1.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#e50914";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <span style={{ fontSize: "16px" }}>↻</span>
                  <span>Reload Server & Catalog</span>
                </button>
              </div>
            ) : filters.length > 0 ? (
              filters.slice(0, 10).map((f, idx) => (
                <CatalogSection
                  key={`${f.filter}-${idx}`}
                  title={f.title}
                  filter={f.filter}
                  providerValue={activeProvider?.value || ""}
                  initialPosts={idx === 0 && f.filter === activeBrowseFilter ? posts : undefined}
                  onViewAll={(filter, title) => {
                    setViewAllCategory({ filter, title });
                    setPage(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onSelectPost={handleSelectPost}
                />
              ))
            ) : (
              <CatalogSection
                title="Trending Movies"
                filter=""
                providerValue={activeProvider?.value || ""}
                initialPosts={posts}
                onViewAll={(filter, title) => {
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
        activeTab={mobileTab}
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === "home") {
            handleBackToHome();
          } else if (tab === "search") {
            const inputs = document.querySelectorAll("input");
            const mobileInput = inputs[inputs.length - 1] as HTMLInputElement;
            if (mobileInput) {
              mobileInput.focus();
            }
          } else if (tab === "extensions" || tab === "settings") {
            setSettingsModalOpen(true);
          }
        }}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* 5. Media Details & Releases Modal (Survives Reloads) */}
      {selectedPost && (
        <DetailsModal
          post={selectedPost}
          details={details}
          loadingDetails={loadingDetails}
          streams={streams}
          loadingStreams={loadingStreams}
          activeProvider={activeProvider}
          providers={installedProviders}
          onSelectProvider={(p) => {
            handleSelectProvider(p);
            handleCloseDetails();
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            handleCloseDetails();
          }}
          isGlobalSearch={isGlobalSearch}
          onToggleGlobalSearch={() => setIsGlobalSearch(!isGlobalSearch)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onGoHome={() => {
            handleBackToHome();
            handleCloseDetails();
          }}
          onSelectCategoryNav={(type) => {
            handleSelectCategoryNav(type);
            handleCloseDetails();
          }}
          activeNavTab={activeNavTab}
          defaultPlayer={settings.defaultPlayer}
          onClose={handleCloseDetails}
          onPlayStream={(url) => setPlaybackUrl(url)}
          onPlayExternal={handlePlayExternal}
          onSelectRecommended={(p) => handleSelectPost(p)}
          onSelectPerson={handleOpenPerson}
        />
      )}

      {/* 5b. Cast / Person Details Page with Dedicated Filmography & Bio (Matches Reference) */}
      {selectedPersonId && (
        <PersonDetailsModal
          personId={selectedPersonId}
          onClose={handleClosePerson}
          onSelectMedia={(post) => {
            handleSelectPost(post);
            handleClosePerson();
          }}
          activeProviderKey={activeProvider?.value || "hdhub4u"}
          activeProvider={activeProvider}
          providers={installedProviders}
          onSelectProvider={(p) => {
            handleSelectProvider(p);
            handleClosePerson();
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            handleClosePerson();
          }}
          isGlobalSearch={isGlobalSearch}
          onToggleGlobalSearch={() => setIsGlobalSearch(!isGlobalSearch)}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onGoHome={() => {
            handleBackToHome();
            handleClosePerson();
          }}
          onSelectCategoryNav={(type) => {
            handleSelectCategoryNav(type);
            handleClosePerson();
          }}
          activeNavTab={activeNavTab}
          onNavigateTab={handleSelectCategoryNav}
        />
      )}

      {/* 6. Video Player Modal */}
      <VideoPlayerModal
        playbackUrl={playbackUrl}
        onClose={handleClosePlayer}
      />

      {/* 7. Settings Modal */}
      {settingsModalOpen && (
        <SettingsModal
          settings={settings}
          availableProviders={allProviders}
          onSave={saveSettings}
          onToggleExtension={toggleExtension}
          onResetSetup={() => {
            saveSettings({ isConfigured: false, installedExtensions: ["hdhub4u"] });
            setSettingsModalOpen(false);
          }}
          onClose={() => setSettingsModalOpen(false)}
        />
      )}
    </div>
  );
}
