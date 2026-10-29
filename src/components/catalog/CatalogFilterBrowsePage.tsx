import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Post } from "../../types";
import { MediaCard } from "../media/MediaCard";
import { ArrowLeftIcon } from "../../icons";
import {
  formatTmdbResults,
  isFakePlaceholder,
  BEST_PICTURE_WINNERS,
  EMMY_AWARD_WINNERS,
  PALME_DOR_WINNERS,
  MINDFUCK_MOVIES,
  DIRECTED_BY_LEGENDS,
} from "../../data/homeCuratedService";
import { IMDB_RANKINGS, LETTERBOXD_RANKINGS, type RankedItem } from "../../data/rankingsData";

interface CatalogFilterBrowsePageProps {
  initialTitle: string;
  initialGenre?: string;
  posts?: Post[];
  loading?: boolean;
  onSelectPost: (post: Post) => void;
  onBack: () => void;
}

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const BASE_URL = "https://api.themoviedb.org/3";

// Exact Genre list from Screenshot 6
const GENRE_OPTIONS = [
  "Any genre",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Thriller",
  "War",
  "Western",
];

const TMDB_GENRE_MAP: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

const TMDB_TV_GENRE_MAP: Record<string, number> = {
  Action: 10759,
  Adventure: 10759,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 10765,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 10765,
  Thriller: 53,
  War: 10768,
  Western: 37,
};

const rankedToPost = (item: RankedItem): Post => ({
  id: String(item.tmdbId || item.id || item.imdbId),
  title: item.title,
  type: item.type === "tv" ? "tv" : "movie",
  year: String(item.year || ""),
  rating: String(item.imdbRating || item.letterboxdRating || "8.5"),
  poster: item.poster,
  backdrop: item.backdrop || item.poster,
  genres: Array.isArray(item.genres) ? item.genres.join(", ") : "",
  plot: item.overview,
  runtime: item.runtime,
  director: item.director,
});

// Exact Sort list with Curated Collections
const SORT_OPTIONS = [
  { label: "Popular", value: "popular" },
  { label: "Top Rated", value: "top_rated" },
  { label: "Newest", value: "newest" },
  { label: "Box Office", value: "box_office" },
  { label: "IMDb Top 250", value: "imdb_top_250" },
  { label: "Letterboxd Top 250", value: "letterboxd_top_250" },
  { label: "Oscar Best Picture Winners", value: "best_picture_winners" },
  { label: "Emmy Award Winners", value: "emmy_award_winners" },
  { label: "Palme d'Or Winners", value: "palme_dor_winners" },
  { label: "Critically Acclaimed", value: "critically_acclaimed" },
  { label: "Mind-Bending Movies", value: "mind_bending_movies" },
  { label: "Highest Rated on Letterboxd", value: "highest_rated_letterboxd" },
  { label: "Highest Rated on IMDb", value: "highest_rated_imdb" },
  { label: "Directed by Legends", value: "directed_by_legends" },
];

// Initial dynamic service provider seeds (fetched & updated dynamically from TMDB + user extensions)
export interface ServiceItem {
  label: string;
  value: string;
  providerId?: number;
}

const INITIAL_SERVICE_OPTIONS: ServiceItem[] = [
  { label: "Any service", value: "any" },
  { label: "Netflix", value: "netflix", providerId: 8 },
  { label: "Amazon Prime Video", value: "prime", providerId: 9 },
  { label: "Apple TV", value: "apple", providerId: 350 },
  { label: "Disney Plus", value: "disney", providerId: 337 },
  { label: "JioCinema", value: "jiocinema", providerId: 220 },
  { label: "Zee5", value: "zee5", providerId: 232 },
  { label: "SonyLIV", value: "sonyliv", providerId: 237 },
  { label: "Crunchyroll", value: "crunchyroll", providerId: 283 },
  { label: "Hulu", value: "hulu", providerId: 15 },
  { label: "fuboTV", value: "fubo", providerId: 257 },
  { label: "Paramount Plus Premium", value: "paramount", providerId: 531 },
  { label: "Peacock Premium", value: "peacock", providerId: 386 },
  { label: "YouTube Premium", value: "youtube", providerId: 188 },
];

// Exact Year list from Screenshot 3
const YEAR_OPTIONS = [
  "Any year",
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "1980s",
  "1970s",
  "1960s",
  "Before 1960",
];

// Exact Length list from Screenshot 4
const LENGTH_OPTIONS = [
  "Any length",
  "Under 90 min",
  "90 min – 2 hr",
  "Over 2 hours",
];

// Exact Rating list from Screenshot 5
const RATING_OPTIONS = [
  "Any rating",
  "9+ stars",
  "8+ stars",
  "7+ stars",
  "6+ stars",
];

// Exact Language list from Screenshot 6 + user languages (Tamil, Telugu, Malayalam, Kannada, Dual Audio, Multi Audio)
const LANGUAGE_OPTIONS = [
  { label: "Any language", value: "any" },
  { label: "Hindi", value: "hi" },
  { label: "Tamil", value: "ta" },
  { label: "Telugu", value: "te" },
  { label: "Malayalam", value: "ml" },
  { label: "Kannada", value: "kn" },
  { label: "Dual Audio", value: "dual" },
  { label: "Multi Audio", value: "multi" },
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Italian", value: "it" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Chinese", value: "zh" },
  { label: "Portuguese", value: "pt" },
  { label: "Swedish", value: "sv" },
  { label: "Danish", value: "da" },
  { label: "Turkish", value: "tr" },
];

// Translucent Frosted Glass Dropdown on desktop, Bottom Sheet Drawer on mobile (Screenshot from 2026-10-29 23-21-37.png)
const CnoDropdownMenu: React.FC<{
  title?: string;
  items: Array<{ label: string; value: string }>;
  selected: string;
  onSelect: (val: string) => void;
  onClose?: () => void;
  minWidth?: string;
}> = ({ title, items, selected, onSelect, onClose, minWidth = "190px" }) => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
    return (
      <>
        {/* Dimmed Backdrop */}
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.70)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 100040,
            animation: "cinemaFadeIn 0.2s ease",
          }}
        />

        {/* Mobile Bottom Sheet Drawer matching Screenshot from 2026-10-29 23-21-37.png */}
        <div
          className="cinema-no-scrollbar"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "75vh",
            zIndex: 100050,
            background: "rgba(16, 18, 24, 0.96)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            borderTop: "1px solid rgba(255, 255, 255, 0.16)",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.8)",
            padding: "10px 0 24px 0",
            display: "flex",
            flexDirection: "column",
            animation: "cinemaSlideUpSheet 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Drag Handle Pill */}
          <div
            style={{
              width: "36px",
              height: "4px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.28)",
              margin: "2px auto 14px auto",
              flexShrink: 0,
            }}
          />

          {/* Uppercase Category Header */}
          {title && (
            <div
              style={{
                padding: "0 22px 10px 22px",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.5)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "4px",
                flexShrink: 0,
              }}
            >
              {title}
            </div>
          )}

          {/* Touch-friendly Row Items */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {items.map((item) => {
              const isSelected = selected === item.value || selected === item.label;
              return (
                <button
                  key={item.value}
                  onClick={() => {
                    onSelect(item.value);
                    onClose?.();
                  }}
                  style={{
                    height: "48px",
                    padding: "0 22px",
                    background: isSelected ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    border: "none",
                    color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                    fontSize: "15px",
                    fontWeight: isSelected ? 700 : 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span>{item.label}</span>
                  {isSelected && (
                    <span style={{ color: "#e50914", fontSize: "16px", fontWeight: 800 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // Desktop dropdown
  return (
    <div
      className="cinema-no-scrollbar"
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        zIndex: 120,
        minWidth,
        maxHeight: "calc(100vh - 220px)",
        overflowY: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        background: "rgba(14, 16, 22, 0.80)",
        backdropFilter: "blur(28px) saturate(190%)",
        WebkitBackdropFilter: "blur(28px) saturate(190%)",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        borderRadius: "16px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        padding: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      {items.map((item) => {
        const isSelected = selected === item.value || selected === item.label;
        return (
          <button
            key={item.value}
            onClick={() => {
              onSelect(item.value);
              onClose?.();
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              background: isSelected ? "#e50914" : "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: isSelected ? 700 : 500,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = "transparent";
            }}
          >
            {/* White checkmark matching user screenshot */}
            <span
              style={{
                width: "14px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "12px",
                opacity: isSelected ? 1 : 0,
              }}
            >
              ✓
            </span>
            <span style={{ flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export function resolveInitialSort(title?: string | null): string {
  if (!title) return "popular";
  const t = title.toLowerCase().trim();
  if (t.includes("letterboxd top 250") || t.includes("top 250 letterboxd")) return "letterboxd_top_250";
  if (t.includes("imdb top 250") || t.includes("top 250") || t.includes("top250")) return "imdb_top_250";
  if (t.includes("best picture") || t.includes("oscar")) return "best_picture_winners";
  if (t.includes("emmy") || t.includes("emery")) return "emmy_award_winners";
  if (t.includes("palme") || t.includes("cannes")) return "palme_dor_winners";
  if (
    t.includes("mind-bending") ||
    t.includes("mind bending") ||
    t.includes("mindfuck") ||
    t.includes("mind-fucking") ||
    t.includes("mindfucking")
  )
    return "mind_bending_movies";
  if (t.includes("legend") || t.includes("directed by legends") || t.includes("directors"))
    return "directed_by_legends";
  if (t.includes("highest rated on letterboxd") || t.includes("highest rated letterboxd"))
    return "highest_rated_letterboxd";
  if (t.includes("highest rated on imdb") || t.includes("highest rated imdb"))
    return "highest_rated_imdb";
  if (t.includes("critically acclaimed") || t.includes("acclaimed"))
    return "critically_acclaimed";
  if (t.includes("box office") || t.includes("boxoffice") || t.includes("blockbuster"))
    return "box_office";
  if (t.includes("top rated") || t.includes("top-rated")) return "top_rated";
  if (t.includes("trending") || t.includes("newest")) return "newest";
  return "popular";
}

export function resolveInitialGenre(title?: string | null): string {
  if (!title) return "Any genre";
  // If shelf or title is a curated ranking/collection, keep genre as Any genre so all titles are visible
  if (resolveInitialSort(title) !== "popular") return "Any genre";

  const clean = title.toLowerCase().trim();
  if (clean === "anime" || clean === "all anime") return "Any genre";
  if (clean.includes("docu")) return "Documentary";
  if (clean.includes("horror")) return "Horror";
  if (clean.includes("thrill") || clean.includes("psychological")) return "Thriller";
  if (clean.includes("scifi") || clean.includes("sci-fi") || clean.includes("science")) return "Science Fiction";
  if (clean.includes("anim")) return "Animation";
  if (clean.includes("action")) return "Action";
  if (clean.includes("adventur")) return "Adventure";
  if (clean.includes("comed")) return "Comedy";
  if (clean.includes("crime")) return "Crime";
  if (clean.includes("drama")) return "Drama";
  if (clean.includes("myster")) return "Mystery";
  if (clean.includes("fantas")) return "Fantasy";
  if (clean.includes("romanc")) return "Romance";
  if (clean.includes("war")) return "War";
  if (clean.includes("western")) return "Western";
  if (clean.includes("music")) return "Music";
  if (clean.includes("family") || clean.includes("kid")) return "Family";
  
  const exact = GENRE_OPTIONS.find((g) => g.toLowerCase() === clean);
  return exact || "Any genre";
}

export const CatalogFilterBrowsePage: React.FC<CatalogFilterBrowsePageProps> = ({
  initialTitle,
  initialGenre,
  posts = [],
  loading = false,
  onSelectPost,
  onBack,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>(() => {
    return resolveInitialGenre(initialGenre || initialTitle);
  });
  const [selectedSort, setSelectedSort] = useState<string>(() => {
    return resolveInitialSort(initialTitle);
  });
  const [selectedService, setSelectedService] = useState<string>("any");
  const [selectedYear, setSelectedYear] = useState<string>("Any year");
  const [selectedLength, setSelectedLength] = useState<string>("Any length");
  const [selectedRating, setSelectedRating] = useState<string>(() => {
    const t = (initialTitle || "").toLowerCase();
    if (t.includes("top rated") || t.includes("top-rated")) return "9+ stars";
    return "Any rating";
  });
  const [selectedLanguage, setSelectedLanguage] = useState<string>("any");
  const [hideWatched, setHideWatched] = useState<boolean>(false);
  const [mediaType, setMediaType] = useState<"movies" | "tv" | "anime">(() => {
    const t = (initialTitle || "").toLowerCase();
    if (t.includes("anime")) return "anime";
    if (
      t.includes("tv") ||
      t.includes("series") ||
      t.includes("show") ||
      t.includes("episodes") ||
      t.includes("emmy") ||
      t.includes("emery")
    )
      return "tv";
    return "movies";
  });

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Switch mediaType, sort, and genre dynamically if navigating into categories
  useEffect(() => {
    const t = (initialTitle || "").toLowerCase();
    const resolvedG = resolveInitialGenre(initialGenre || initialTitle);
    if (resolvedG !== "Any genre") {
      setSelectedGenre(resolvedG);
    }
    const resolvedS = resolveInitialSort(initialTitle);
    if (resolvedS !== "popular") {
      setSelectedSort(resolvedS);
    }
    if (t.includes("top rated") || t.includes("top-rated")) {
      setSelectedRating("9+ stars");
      setSelectedSort("top_rated");
    }
    if (t.includes("anime")) {
      setMediaType("anime");
    } else if (
      t.includes("tv") ||
      t.includes("series") ||
      t.includes("show") ||
      t.includes("episodes") ||
      t.includes("emmy") ||
      t.includes("emery")
    ) {
      setMediaType("tv");
    } else if (t.includes("movie") || t.includes("film")) {
      setMediaType("movies");
    }
  }, [initialTitle, initialGenre]);

  // Sliding pill indicator for [ Movies | TV Shows | Anime ]
  const mediaTypeContainerRef = useRef<HTMLDivElement>(null);
  const mediaTypeBtnRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const updateSlider = useCallback(() => {
    const activeBtn = mediaTypeBtnRefs.current[mediaType];
    if (activeBtn) {
      setSliderStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        opacity: 1,
      });
    }
  }, [mediaType]);

  useEffect(() => {
    updateSlider();
    const raf = requestAnimationFrame(updateSlider);
    window.addEventListener("resize", updateSlider);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateSlider);
    };
  }, [updateSlider]);

  // Dynamic services (not hardcoded)
  const [dynamicServices, setDynamicServices] = useState<ServiceItem[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("cinema_cached_watch_services");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return INITIAL_SERVICE_OPTIONS;
  });

  // Fetch dynamic watch providers from TMDB / Watch Providers & local providers
  useEffect(() => {
    let mounted = true;
    async function loadDynamicProviders() {
      try {
        const url = `${BASE_URL}/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=IN`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        let data: any = null;
        try {
          const res = await fetch(proxyUrl);
          if (res.ok) data = await res.json();
        } catch (_) {}

        if (!data) {
          try {
            const res = await fetch(url);
            if (res.ok) data = await res.json();
          } catch (_) {}
        }

        if (mounted && data && Array.isArray(data.results) && data.results.length > 0) {
          const tmdbProviders: ServiceItem[] = data.results.slice(0, 24).map((p: any) => ({
            label: p.provider_name,
            value: p.provider_name.toLowerCase().replace(/[^a-z0-9]/g, ""),
            providerId: p.provider_id,
          }));

          // Read custom extension providers if any
          const extensionProviders: ServiceItem[] = [];
          try {
            const rawExt = localStorage.getItem("cinema_installed_providers");
            if (rawExt) {
              const parsed = JSON.parse(rawExt);
              if (Array.isArray(parsed)) {
                parsed.forEach((ext: any) => {
                  if (ext.name && ext.value) {
                    extensionProviders.push({ label: ext.name, value: ext.value });
                  }
                });
              }
            }
          } catch {}

          const merged: ServiceItem[] = [
            { label: "Any service", value: "any" },
            ...tmdbProviders,
            ...extensionProviders,
          ];

          // Deduplicate by value
          const unique = merged.filter((item, index, self) =>
            index === self.findIndex((t) => t.value === item.value)
          );

          setDynamicServices(unique);
          try {
            localStorage.setItem("cinema_cached_watch_services", JSON.stringify(unique));
          } catch {}
        }
      } catch (err) {
        console.warn("Failed to dynamically load watch providers:", err);
      }
    }

    loadDynamicProviders();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Open dropdown state
  const [openDropdown, setOpenDropdown] = useState<
    "none" | "genre" | "sort" | "service" | "year" | "length" | "rating" | "language"
  >("none");

  const filterBarRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown("none");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 3. TMDB Live Fetcher with In-Memory & Session Cache for 0ms instant display
  const [tmdbPosts, setTmdbPosts] = useState<Post[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const activeRequestIdRef = useRef<number>(0);

  const fetchTmdbPage = useCallback(
    async (targetPage: number, resetList = false) => {
      const requestId = ++activeRequestIdRef.current;

      if (targetPage === 1) {
        setTmdbLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const isTv = mediaType === "tv" || mediaType === "anime";
        const effectiveIsTv = isTv || selectedSort === "emmy_award_winners";

        // Curated Collections canonical seeds (IMDb Top 250, Letterboxd, Best Picture, Palme d'Or, etc.)
        let curatedList: Post[] = [];
        if (selectedSort === "imdb_top_250") {
          const raw = effectiveIsTv ? IMDB_RANKINGS.filter((r) => r.type === "tv") : IMDB_RANKINGS.filter((r) => r.type !== "tv");
          curatedList = raw.map(rankedToPost);
        } else if (selectedSort === "letterboxd_top_250") {
          curatedList = LETTERBOXD_RANKINGS.map(rankedToPost);
        } else if (selectedSort === "best_picture_winners") {
          curatedList = BEST_PICTURE_WINNERS;
        } else if (selectedSort === "emmy_award_winners") {
          curatedList = EMMY_AWARD_WINNERS;
        } else if (selectedSort === "palme_dor_winners") {
          curatedList = PALME_DOR_WINNERS;
        } else if (selectedSort === "mind_bending_movies") {
          curatedList = MINDFUCK_MOVIES;
        } else if (selectedSort === "directed_by_legends") {
          curatedList = DIRECTED_BY_LEGENDS;
        } else if (selectedSort === "highest_rated_letterboxd") {
          curatedList = LETTERBOXD_RANKINGS.slice().sort((a, b) => (b.letterboxdRating || 0) - (a.letterboxdRating || 0)).map(rankedToPost);
        } else if (selectedSort === "highest_rated_imdb") {
          curatedList = IMDB_RANKINGS.slice().sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0)).map(rankedToPost);
        } else if (selectedSort === "critically_acclaimed") {
          const raw = IMDB_RANKINGS.filter((r) => r.imdbRating >= 8.5).slice(0, 60);
          curatedList = raw.map(rankedToPost);
        }

        if (curatedList.length > 0) {
          if (selectedGenre !== "Any genre") {
            curatedList = curatedList.filter((p) => p.genres && p.genres.toLowerCase().includes(selectedGenre.toLowerCase()));
          }

          if (selectedYear !== "Any year") {
            curatedList = curatedList.filter((p) => {
              const y = parseInt(p.year || "0", 10);
              if (selectedYear === "2020s") return y >= 2020 && y <= 2029;
              if (selectedYear === "2010s") return y >= 2010 && y <= 2019;
              if (selectedYear === "2000s") return y >= 2000 && y <= 2009;
              if (selectedYear === "1990s") return y >= 1990 && y <= 1999;
              if (selectedYear === "1980s") return y >= 1980 && y <= 1989;
              if (selectedYear === "1970s") return y >= 1970 && y <= 1979;
              if (selectedYear === "1960s") return y >= 1960 && y <= 1969;
              if (selectedYear === "Before 1960") return y < 1960;
              return true;
            });
          }
        }

        const endpoint = effectiveIsTv ? "/discover/tv" : "/discover/movie";
        const params = new URLSearchParams();
        params.set("api_key", TMDB_API_KEY);
        params.set("page", String(targetPage));

        // Anime Mode: strictly Japanese animation
        if (mediaType === "anime") {
          params.set("with_genres", "16"); // Animation
          params.set("with_original_language", "ja"); // Japanese
        }

        // 1. Sort configuration (Dynamically maps every custom & curated sort so infinite discovery keeps streaming!)
        if (selectedSort === "popular") {
          params.set("sort_by", "popularity.desc");
          params.set("vote_count.gte", effectiveIsTv ? "10" : "30");
          if (!effectiveIsTv) params.set("primary_release_date.lte", todayStr);
        } else if (
          selectedSort === "top_rated" ||
          selectedSort === "imdb_top_250" ||
          selectedSort === "highest_rated_imdb"
        ) {
          params.set("sort_by", "vote_average.desc");
          params.set("vote_count.gte", effectiveIsTv ? "30" : "300");
          if (!effectiveIsTv) params.set("primary_release_date.lte", todayStr);
        } else if (
          selectedSort === "letterboxd_top_250" ||
          selectedSort === "highest_rated_letterboxd"
        ) {
          params.set("sort_by", "vote_average.desc");
          params.set("vote_count.gte", effectiveIsTv ? "30" : "200");
          if (!effectiveIsTv) params.set("primary_release_date.lte", todayStr);
        } else if (selectedSort === "mind_bending_movies") {
          params.set("with_genres", "9648,878"); // Mystery + Sci-Fi
          params.set("sort_by", "vote_average.desc");
          params.set("vote_count.gte", "80");
          if (!effectiveIsTv) params.set("primary_release_date.lte", todayStr);
        } else if (
          selectedSort === "best_picture_winners" ||
          selectedSort === "critically_acclaimed"
        ) {
          params.set("sort_by", "vote_average.desc");
          params.set("vote_count.gte", effectiveIsTv ? "40" : "350");
          if (!effectiveIsTv) params.set("primary_release_date.lte", todayStr);
        } else if (selectedSort === "palme_dor_winners") {
          params.set("with_genres", "18"); // Drama / Art / Festival
          params.set("sort_by", "vote_average.desc");
          params.set("vote_count.gte", "120");
          if (!effectiveIsTv) params.set("primary_release_date.lte", todayStr);
        } else if (selectedSort === "emmy_award_winners") {
          params.set("sort_by", "vote_average.desc");
          params.set("vote_count.gte", "120");
        } else if (selectedSort === "directed_by_legends") {
          params.set("sort_by", "vote_average.desc");
          params.set("vote_count.gte", "280");
          if (!effectiveIsTv) params.set("primary_release_date.lte", todayStr);
        } else if (selectedSort === "newest") {
          params.set("sort_by", effectiveIsTv ? "first_air_date.desc" : "primary_release_date.desc");
          params.set(effectiveIsTv ? "first_air_date.lte" : "primary_release_date.lte", todayStr);
          params.set("vote_count.gte", "5");
        } else if (selectedSort === "box_office") {
          params.set("sort_by", effectiveIsTv ? "popularity.desc" : "revenue.desc");
          if (!effectiveIsTv) params.set("primary_release_date.lte", todayStr);
        }

        // 2. Genre configuration
        if (selectedGenre !== "Any genre") {
          const genreId = isTv
            ? (TMDB_TV_GENRE_MAP[selectedGenre] || TMDB_GENRE_MAP[selectedGenre])
            : TMDB_GENRE_MAP[selectedGenre];
          if (genreId) {
            if (mediaType === "anime") {
              params.set("with_genres", `16,${genreId}`);
            } else {
              params.set("with_genres", String(genreId));
            }
          }
        }

        // 3. Dynamic Service / Watch Provider
        if (selectedService !== "any") {
          const matchedService = dynamicServices.find((s) => s.value === selectedService);
          if (matchedService && matchedService.providerId) {
            params.set("with_watch_providers", String(matchedService.providerId));
            params.set("watch_region", "IN");
          }
        }

        // 4. Year configuration
        if (selectedYear === "2020s") {
          params.set(isTv ? "first_air_date.gte" : "primary_release_date.gte", "2020-01-01");
          params.set(isTv ? "first_air_date.lte" : "primary_release_date.lte", "2029-12-31");
        } else if (selectedYear === "2010s") {
          params.set(isTv ? "first_air_date.gte" : "primary_release_date.gte", "2010-01-01");
          params.set(isTv ? "first_air_date.lte" : "primary_release_date.lte", "2019-12-31");
        } else if (selectedYear === "2000s") {
          params.set(isTv ? "first_air_date.gte" : "primary_release_date.gte", "2000-01-01");
          params.set(isTv ? "first_air_date.lte" : "primary_release_date.lte", "2009-12-31");
        } else if (selectedYear === "1990s") {
          params.set(isTv ? "first_air_date.gte" : "primary_release_date.gte", "1990-01-01");
          params.set(isTv ? "first_air_date.lte" : "primary_release_date.lte", "1999-12-31");
        } else if (selectedYear === "1980s") {
          params.set(isTv ? "first_air_date.gte" : "primary_release_date.gte", "1980-01-01");
          params.set(isTv ? "first_air_date.lte" : "primary_release_date.lte", "1989-12-31");
        } else if (selectedYear === "1970s") {
          params.set(isTv ? "first_air_date.gte" : "primary_release_date.gte", "1970-01-01");
          params.set(isTv ? "first_air_date.lte" : "primary_release_date.lte", "1979-12-31");
        } else if (selectedYear === "1960s") {
          params.set(isTv ? "first_air_date.gte" : "primary_release_date.gte", "1960-01-01");
          params.set(isTv ? "first_air_date.lte" : "primary_release_date.lte", "1969-12-31");
        } else if (selectedYear === "Before 1960") {
          params.set(isTv ? "first_air_date.lte" : "primary_release_date.lte", "1959-12-31");
        }

        // 5. Length / Runtime configuration
        if (!isTv) {
          if (selectedLength === "Under 90 min") {
            params.set("with_runtime.lte", "90");
          } else if (selectedLength === "90 min – 2 hr") {
            params.set("with_runtime.gte", "90");
            params.set("with_runtime.lte", "120");
          } else if (selectedLength === "Over 2 hours") {
            params.set("with_runtime.gte", "120");
          }
        }

        // 6. Rating configuration
        if (selectedRating === "9+ stars") {
          params.set("vote_average.gte", isTv ? "8.0" : "8.5");
          params.set("vote_count.gte", isTv ? "25" : "200");
        } else if (selectedRating === "8+ stars") {
          params.set("vote_average.gte", "8.0");
        } else if (selectedRating === "7+ stars") {
          params.set("vote_average.gte", "7.0");
        } else if (selectedRating === "6+ stars") {
          params.set("vote_average.gte", "6.0");
        }

        // 7. Language configuration
        if (selectedLanguage !== "any") {
          if (selectedLanguage === "dual" || selectedLanguage === "multi") {
            params.set("with_original_language", "hi|te|ta|ml|kn");
          } else {
            params.set("with_original_language", selectedLanguage);
          }
        }

        const cacheKey = `cinema_filter_cache_${endpoint}_${params.toString()}`;

        // Instant Cache Hydration: Render cached results immediately on page 1
        if (targetPage === 1 && resetList) {
          try {
            const cachedStr = sessionStorage.getItem(cacheKey);
            if (cachedStr) {
              const cachedData = JSON.parse(cachedStr);
              if (cachedData && Array.isArray(cachedData.results) && cachedData.results.length > 0) {
                const cachedFormatted = formatTmdbResults(cachedData.results, isTv, true).filter(
                  (m) => !isFakePlaceholder(m.title)
                );
                if (cachedFormatted.length > 0 && activeRequestIdRef.current === requestId) {
                  setTmdbPosts(cachedFormatted);
                  setHasMore(true);
                  setTmdbLoading(false);
                }
              }
            }
          } catch (_) {}
        }

        const directUrl = `${BASE_URL}${endpoint}?${params.toString()}`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
        const cfUrl = `https://tmdb-proxy.workers.dev/3${endpoint}?${params.toString()}`;

        let json: any = null;

        // 1. Direct fetch TMDB FIRST: Direct TMDB natively supports CORS in browser and returns in 60-150ms!
        try {
          const directController = new AbortController();
          const directTimer = setTimeout(() => directController.abort(), 2000);
          const res = await fetch(directUrl, { signal: directController.signal });
          clearTimeout(directTimer);
          if (res.ok) json = await res.json();
        } catch (_) {}

        // 2. Fallback to proxy if direct was blocked (e.g. strict firewall/adblocker)
        if (!json) {
          try {
            const proxyController = new AbortController();
            const proxyTimer = setTimeout(() => proxyController.abort(), 2500);
            const res = await fetch(proxyUrl, { signal: proxyController.signal });
            clearTimeout(proxyTimer);
            if (res.ok) json = await res.json();
          } catch (_) {}
        }

        // 3. Fallback to Cloudflare worker proxy
        if (!json) {
          try {
            const res = await fetch(cfUrl);
            if (res.ok) json = await res.json();
          } catch (_) {}
        }

        // If another request started while this one was in flight, discard stale data
        lastFetchedPageRef.current = targetPage;

        if (json && Array.isArray(json.results)) {
          // Cache successful page 1 results
          if (targetPage === 1) {
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify({ results: json.results.slice(0, 40) }));
            } catch (_) {}
          }

          const formatted = formatTmdbResults(json.results, effectiveIsTv, true).filter(
            (m) => !isFakePlaceholder(m.title)
          );

          if (resetList) {
            if (curatedList.length > 0) {
              const seenTitles = new Set(curatedList.map((c) => (c.title || "").toLowerCase().trim()));
              const combined = [
                ...curatedList,
                ...formatted.filter((m) => !seenTitles.has((m.title || "").toLowerCase().trim())),
              ];
              setTmdbPosts(combined);
            } else {
              setTmdbPosts(formatted);
            }
          } else {
            setTmdbPosts((prev) => {
              const existingTitles = new Set(prev.map((p) => (p.title || "").toLowerCase().trim()));
              const newItems = formatted.filter((m) => !existingTitles.has((m.title || "").toLowerCase().trim()));
              return [...prev, ...newItems];
            });
          }

          const totalPages = json.total_pages && json.total_pages > 1 ? json.total_pages : 500;
          setHasMore(json.page < totalPages);
        } else if (curatedList.length > 0 && resetList) {
          setTmdbPosts(curatedList);
          setHasMore(true);
        } else {
          setHasMore(true);
        }
      } catch (err) {
        console.error("TMDB catalog browse fetch error:", err);
      } finally {
        if (activeRequestIdRef.current === requestId) {
          setTmdbLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [mediaType, selectedSort, selectedGenre, selectedService, selectedYear, selectedLength, selectedRating, selectedLanguage, dynamicServices]
  );

  const lastFetchedPageRef = useRef<number>(1);

  // Trigger fetch when any filter changes & pre-fetch 2nd page so grid is 40 items full
  useEffect(() => {
    lastFetchedPageRef.current = 1;
    setPage(1);
    fetchTmdbPage(1, true);
    const timer = setTimeout(() => {
      fetchTmdbPage(2, false);
    }, 450);
    return () => clearTimeout(timer);
  }, [fetchTmdbPage]);

  // Load next page
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = lastFetchedPageRef.current + 1;
    lastFetchedPageRef.current = nextPage;
    setPage(nextPage);
    fetchTmdbPage(nextPage, false);
  }, [loadingMore, hasMore, fetchTmdbPage]);

  // Infinite scroll IntersectionObserver to auto-load when near bottom
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || loadingMore || tmdbLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "450px" }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, tmdbLoading, handleLoadMore]);

  // Filter out watched if hideWatched is enabled
  const displayedPosts = useMemo(() => {
    let list = tmdbPosts.length > 0 ? tmdbPosts : (posts.length > 0 ? posts : []);
    list = list.filter((p) => !isFakePlaceholder(p.title));
    if (hideWatched) {
      try {
        const rawHistory = localStorage.getItem("cinema_history");
        const watchedIds = rawHistory ? new Set(JSON.parse(rawHistory).map((h: any) => h.id || h.link || h.title)) : new Set();
        list = list.filter((p) => !watchedIds.has(p.tmdbId || p.link || p.title));
      } catch {}
    }
    return list;
  }, [tmdbPosts, posts, hideWatched]);

  const isCurrentlyLoading = tmdbLoading && displayedPosts.length === 0;

  // Toggle helper
  const toggleDropdown = (key: typeof openDropdown) => {
    setOpenDropdown(openDropdown === key ? "none" : key);
  };

  // Surprise Me Handler (picks a random high-quality title and opens it!)
  const handleSurpriseMe = () => {
    if (displayedPosts.length > 0) {
      const randomIndex = Math.floor(Math.random() * displayedPosts.length);
      onSelectPost(displayedPosts[randomIndex]);
    }
  };

  // Reset all filters
  const handleResetAll = () => {
    setSelectedGenre("Any genre");
    setSelectedSort("popular");
    setSelectedService("any");
    setSelectedYear("Any year");
    setSelectedLength("Any length");
    setSelectedRating("Any rating");
    setSelectedLanguage("any");
    setHideWatched(false);
  };

  const genreLabel = selectedGenre === "Any genre" ? "Genre" : selectedGenre;
  const sortLabel = selectedSort === "popular" ? "Sort" : (SORT_OPTIONS.find((s) => s.value === selectedSort)?.label || "Sort");
  const serviceLabel = selectedService === "any" ? "Service" : (dynamicServices.find((s) => s.value === selectedService)?.label || "Service");
  const yearLabel = selectedYear === "Any year" ? "Year" : selectedYear;
  const lengthLabel = selectedLength === "Any length" ? "Length" : selectedLength;
  const ratingLabel = selectedRating === "Any rating" ? "Rating" : selectedRating;
  const languageLabel = selectedLanguage === "any" ? "Language" : (LANGUAGE_OPTIONS.find((l) => l.value === selectedLanguage)?.label || "Language");

  // Reusable Pill Button style with Solid Red Accent for Active Selection
  const getPillStyle = (isOpen: boolean, isActive: boolean) => ({
    padding: "7px 16px",
    borderRadius: "999px",
    background: isActive
      ? "#e50914"
      : isOpen
      ? "rgba(255, 255, 255, 0.16)"
      : "rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    color: "#ffffff",
    border: isActive
      ? "1px solid #e50914"
      : isOpen
      ? "1px solid rgba(255, 255, 255, 0.3)"
      : "1px solid rgba(255, 255, 255, 0.12)",
    boxShadow: isActive
      ? "0 4px 14px rgba(229, 9, 20, 0.45)"
      : "0 2px 8px rgba(0, 0, 0, 0.3)",
    fontSize: "13.5px",
    fontWeight: isActive ? 700 : 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap" as const,
    transition: "all 0.15s ease",
  });

  const isAnyFilterActive =
    selectedGenre !== "Any genre" ||
    selectedSort !== "popular" ||
    selectedService !== "any" ||
    selectedYear !== "Any year" ||
    selectedLength !== "Any length" ||
    selectedRating !== "Any rating" ||
    selectedLanguage !== "any" ||
    hideWatched;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#000000",
        color: "#ffffff",
        paddingTop: "76px",
        paddingBottom: "80px",
      }}
    >
      {/* 1. Header Row */}
      <div
        style={{
          padding: isMobile ? "12px 14px 8px 14px" : "16px 48px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Left: Back button + Title + Count */}
        <div>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "8px",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
          >
            <ArrowLeftIcon size={14} />
            <span>Back</span>
          </button>

          <h1
            style={{
              fontSize: "clamp(28px, 3.5vw, 42px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: "0 0 4px 0",
              lineHeight: 1.1,
            }}
          >
            {mediaType === "anime"
              ? "Anime Catalog"
              : selectedGenre !== "Any genre"
              ? selectedGenre
              : initialTitle}
          </h1>

          <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
            {displayedPosts.length} titles available
          </div>
        </div>

        {/* Right: [ 🎲 Surprise Me ] + [ Movies | TV Shows | Anime ] matching user screenshot */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Surprise Me Pill */}
          <button
            onClick={handleSurpriseMe}
            title="Pick a random title"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 18px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
            }}
          >
            {/* Dice Icon matching user screenshot */}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 8h.01"></path>
              <path d="M8 8h.01"></path>
              <path d="M8 16h.01"></path>
              <path d="M16 16h.01"></path>
              <path d="M12 12h.01"></path>
            </svg>
            <span>Surprise Me</span>
          </button>

          {/* Segmented Switch: [ Movies | TV Shows | Anime ] with Sliding Frosted Glass Pill */}
          <div
            ref={mediaTypeContainerRef}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              height: "36px",
              boxSizing: "border-box",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              borderRadius: "999px",
              padding: "3px",
              overflow: "hidden",
            }}
          >
            {/* Sliding frosted pill indicator */}
            <div
              style={{
                position: "absolute",
                top: "3px",
                bottom: "3px",
                left: `${sliderStyle.left}px`,
                width: `${sliderStyle.width}px`,
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.20)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                transition: "left 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease",
                opacity: sliderStyle.opacity,
                pointerEvents: "none",
                zIndex: 1,
              }}
            />

            <button
              ref={(el) => {
                mediaTypeBtnRefs.current["movies"] = el;
              }}
              onClick={() => setMediaType("movies")}
              style={{
                position: "relative",
                zIndex: 2,
                height: "100%",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                borderRadius: "999px",
                border: "none",
                background: "transparent",
                color: mediaType === "movies" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "color 0.18s ease",
                lineHeight: 1,
              }}
            >
              Movies
            </button>
            <button
              ref={(el) => {
                mediaTypeBtnRefs.current["tv"] = el;
              }}
              onClick={() => setMediaType("tv")}
              style={{
                position: "relative",
                zIndex: 2,
                height: "100%",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                borderRadius: "999px",
                border: "none",
                background: "transparent",
                color: mediaType === "tv" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "color 0.18s ease",
                lineHeight: 1,
              }}
            >
              TV Shows
            </button>
            <button
              ref={(el) => {
                mediaTypeBtnRefs.current["anime"] = el;
              }}
              onClick={() => setMediaType("anime")}
              style={{
                position: "relative",
                zIndex: 2,
                height: "100%",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                borderRadius: "999px",
                border: "none",
                background: "transparent",
                color: mediaType === "anime" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "color 0.18s ease",
                lineHeight: 1,
              }}
            >
              Anime
            </button>
          </div>
        </div>
      </div>

      {/* 2. CNO.TO FILTER BAR (Exact Match to Screenshots with Frosted Navbar Glass & Solid Red Selection) */}
      <div
        ref={filterBarRef}
        style={{
          padding: isMobile ? "4px 12px 14px 12px" : "10px 48px 24px 48px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: isMobile ? "nowrap" : "wrap",
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          position: "relative",
          zIndex: 40,
        }}
      >
        {/* 1. Genre Pill (Screenshot 6) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => toggleDropdown("genre")}
            style={getPillStyle(openDropdown === "genre", selectedGenre !== "Any genre")}
          >
            <span>{genreLabel}</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>
              {openDropdown === "genre" ? "▲" : "▼"}
            </span>
          </button>

          {openDropdown === "genre" && (
            <CnoDropdownMenu
              title="GENRE"
              items={GENRE_OPTIONS.map((g) => ({ label: g, value: g }))}
              selected={selectedGenre}
              onSelect={(val) => {
                setSelectedGenre(val);
                setOpenDropdown("none");
              }}
              onClose={() => setOpenDropdown("none")}
              minWidth="190px"
            />
          )}
        </div>

        {/* 2. Sort Pill (Screenshot 1) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => toggleDropdown("sort")}
            style={getPillStyle(openDropdown === "sort", selectedSort !== "popular")}
          >
            <span>{sortLabel}</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>
              {openDropdown === "sort" ? "▲" : "▼"}
            </span>
          </button>

          {openDropdown === "sort" && (
            <CnoDropdownMenu
              title="SORT BY"
              items={SORT_OPTIONS}
              selected={selectedSort}
              onSelect={(val) => {
                setSelectedSort(val);
                setOpenDropdown("none");
              }}
              onClose={() => setOpenDropdown("none")}
              minWidth="160px"
            />
          )}
        </div>

        {/* 3. Service Pill (Screenshot 2 + Dynamic Services from TMDB & local extensions) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => toggleDropdown("service")}
            style={getPillStyle(openDropdown === "service", selectedService !== "any")}
          >
            <span>{serviceLabel}</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>
              {openDropdown === "service" ? "▲" : "▼"}
            </span>
          </button>

          {openDropdown === "service" && (
            <CnoDropdownMenu
              title="SERVICE"
              items={dynamicServices.map((s) => ({ label: s.label, value: s.value }))}
              selected={selectedService}
              onSelect={(val) => {
                setSelectedService(val);
                setOpenDropdown("none");
              }}
              onClose={() => setOpenDropdown("none")}
              minWidth="230px"
            />
          )}
        </div>

        {/* 4. Year Pill (Screenshot 3) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => toggleDropdown("year")}
            style={getPillStyle(openDropdown === "year", selectedYear !== "Any year")}
          >
            <span>{yearLabel}</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>
              {openDropdown === "year" ? "▲" : "▼"}
            </span>
          </button>

          {openDropdown === "year" && (
            <CnoDropdownMenu
              title="RELEASE YEAR"
              items={YEAR_OPTIONS.map((y) => ({ label: y, value: y }))}
              selected={selectedYear}
              onSelect={(val) => {
                setSelectedYear(val);
                setOpenDropdown("none");
              }}
              onClose={() => setOpenDropdown("none")}
              minWidth="160px"
            />
          )}
        </div>

        {/* 5. Length Pill (Screenshot 4) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => toggleDropdown("length")}
            style={getPillStyle(openDropdown === "length", selectedLength !== "Any length")}
          >
            <span>{lengthLabel}</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>
              {openDropdown === "length" ? "▲" : "▼"}
            </span>
          </button>

          {openDropdown === "length" && (
            <CnoDropdownMenu
              title="LENGTH"
              items={LENGTH_OPTIONS.map((l) => ({ label: l, value: l }))}
              selected={selectedLength}
              onSelect={(val) => {
                setSelectedLength(val);
                setOpenDropdown("none");
              }}
              onClose={() => setOpenDropdown("none")}
              minWidth="160px"
            />
          )}
        </div>

        {/* 6. Rating Pill (Screenshot 5) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => toggleDropdown("rating")}
            style={getPillStyle(openDropdown === "rating", selectedRating !== "Any rating")}
          >
            <span>{ratingLabel}</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>
              {openDropdown === "rating" ? "▲" : "▼"}
            </span>
          </button>

          {openDropdown === "rating" && (
            <CnoDropdownMenu
              title="RATING"
              items={RATING_OPTIONS.map((r) => ({ label: r, value: r }))}
              selected={selectedRating}
              onSelect={(val) => {
                setSelectedRating(val);
                setOpenDropdown("none");
              }}
              onClose={() => setOpenDropdown("none")}
              minWidth="150px"
            />
          )}
        </div>

        {/* 7. Language Pill (Screenshot 6 + Tamil, Telugu, Malayalam, Kannada, Dual/Multi Audio) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => toggleDropdown("language")}
            style={getPillStyle(openDropdown === "language", selectedLanguage !== "any")}
          >
            <span>{languageLabel}</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>
              {openDropdown === "language" ? "▲" : "▼"}
            </span>
          </button>

          {openDropdown === "language" && (
            <CnoDropdownMenu
              title="LANGUAGE"
              items={LANGUAGE_OPTIONS.map((l) => ({ label: l.label, value: l.value }))}
              selected={selectedLanguage}
              onSelect={(val) => {
                setSelectedLanguage(val);
                setOpenDropdown("none");
              }}
              onClose={() => setOpenDropdown("none")}
              minWidth="170px"
            />
          )}
        </div>

        {/* 8. Hide Watched Pill */}
        <button
          onClick={() => setHideWatched(!hideWatched)}
          style={getPillStyle(false, hideWatched)}
        >
          {hideWatched && <span>✓</span>}
          <span>Hide Watched</span>
        </button>

        {/* Clean Translucent Frosted Reset Pill (No red underline or ugly borders) */}
        {isAnyFilterActive && (
          <button
            onClick={handleResetAll}
            title="Reset all filters"
            style={{
              padding: "7px 16px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "rgba(255, 255, 255, 0.85)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
            }}
          >
            <span>✕ Reset</span>
          </button>
        )}
      </div>

      {/* 3. Titles Grid */}
      <div style={{ padding: isMobile ? "0 12px" : "0 48px" }}>
        {isCurrentlyLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(3, minmax(0, 1fr))"
                : "repeat(auto-fill, minmax(215px, 1fr))",
              gap: isMobile ? "12px 8px" : "28px 20px",
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "2/3",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.05)",
                  animation: "pulse 1.5s infinite ease-in-out",
                }}
              />
            ))}
          </div>
        ) : displayedPosts.length === 0 ? (
          <div
            style={{
              padding: "100px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
              No titles match your filters
            </div>
            <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
              Try selecting "Any genre" or resetting filters to see more results.
            </div>
            <button
              onClick={handleResetAll}
              style={{
                marginTop: "8px",
                padding: "8px 22px",
                borderRadius: "999px",
                background: "#e50914",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(229, 9, 20, 0.45)",
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(3, minmax(0, 1fr))"
                  : "repeat(auto-fill, minmax(215px, 1fr))",
                gap: isMobile ? "12px 8px" : "28px 20px",
              }}
            >
              {displayedPosts.map((post, idx) => (
                <MediaCard
                  key={`${post.tmdbId || post.link || post.title}-${idx}`}
                  post={post}
                  onClick={onSelectPost}
                  layout="portrait"
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel: auto-loads on scroll without manual button click */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "72px",
                  marginTop: "32px",
                  marginBottom: "40px",
                }}
              >
                {loadingMore && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "8px 24px",
                      borderRadius: "999px",
                      background: "rgba(255, 255, 255, 0.06)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#e50914",
                        animation: "cinemaDotBounce 1.2s infinite ease-in-out",
                        animationDelay: "0s",
                      }}
                    />
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#e50914",
                        animation: "cinemaDotBounce 1.2s infinite ease-in-out",
                        animationDelay: "0.2s",
                      }}
                    />
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#e50914",
                        animation: "cinemaDotBounce 1.2s infinite ease-in-out",
                        animationDelay: "0.4s",
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
