import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../api/client";
import {
  SearchIcon,
  ArrowLeftIcon,
  StarIcon,
  FilmIcon,
  XIcon,
} from "../../icons";
import type { Post } from "../../types";
import type {
  PlatformMode,
  PageMode,
  SortKey,
  RankedItem,
  RankingsHubPageProps,
} from "./types";
import {
  TOP250_CATEGORIES,
  LETTERBOXD_GENRES,
  LETTERBOXD_DECADES,
  IMDB_SORT_OPTIONS,
  LETTERBOXD_SORT_OPTIONS,
  DEDICATED_IMDB_SORT_OPTIONS,
  LETTERBOXD_RANKINGS,
  IMDB_RANKINGS,
  parseVotes,
  parseRuntimeMinutes,
} from "./constants";
import { SortDropdown } from "./SortDropdown";
import { RankingsCategoryDropdown } from "./RankingsCategoryDropdown";
import { RankingsCard } from "./RankingsCard";

export type { RankingsHubPageProps };

export const RankingsHubPage: React.FC<RankingsHubPageProps> = ({
  onSelectPost,
  onBack,
  activeProviderKey = "hdhub4u",
  initialMode = "imdb",
  initialCategory = "movies",
  pageMode = "top250",
}) => {
  const [mode, setMode] = useState<PlatformMode>(
    pageMode === "letterboxd" ? "letterboxd" : pageMode === "imdb" ? "imdb" : initialMode
  );

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [selectedTop250Category, setSelectedTop250Category] = useState<string>(initialCategory);
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedDecade, setSelectedDecade] = useState<string>("all");

  const [top250Films, setTop250Films] = useState<RankedItem[]>([]);
  const [top250Page, setTop250Page] = useState<number>(1);
  const [top250HasMore, setTop250HasMore] = useState<boolean>(true);
  const [loadingTop250, setLoadingTop250] = useState<boolean>(pageMode === "top250");

  const [letterboxdLiveFilms, setLetterboxdLiveFilms] = useState<RankedItem[]>([]);
  const [letterboxdPage, setLetterboxdPage] = useState<number>(1);
  const [letterboxdHasMore, setLetterboxdHasMore] = useState<boolean>(true);
  const [loadingLetterboxd, setLoadingLetterboxd] = useState<boolean>(pageMode === "letterboxd");

  const [imdbLiveFilms, setImdbLiveFilms] = useState<RankedItem[]>([]);
  const [imdbPage, setImdbPage] = useState<number>(1);
  const [imdbHasMore, setImdbHasMore] = useState<boolean>(true);
  const [loadingImdb, setLoadingImdb] = useState<boolean>(pageMode === "imdb");

  const [sortBy, setSortBy] = useState<SortKey>(
    pageMode === "top250"
      ? mode === "letterboxd"
        ? "rating-highest"
        : "rank"
      : mode === "letterboxd"
      ? "rating-highest"
      : "highest"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 1. Fetch real scraped Top 250 films for both IMDb and Letterboxd
  useEffect(() => {
    if (pageMode !== "top250") return;

    let cancelled = false;
    setLoadingTop250(true);
    setTop250Films([]);
    setTop250Page(1);
    setTop250HasMore(true);

    const fetchTop250 = async () => {
      try {
        let films: any[] = [];
        if (selectedTop250Category === "movies") {
          const listSlug =
            mode === "letterboxd"
              ? "kevindoherty123/list/official-top-250-narrative-feature-films-2"
              : "dave/list/imdb-top-250";
          films = await api.getLetterboxdFilms({ list: listSlug, page: 1 });
        } else if (selectedTop250Category === "tv") {
          films = await api.getLetterboxdFilms({
            list: "dori_han/list/imdb-top-250-tv-shows",
            page: 1,
          });
        } else if (selectedTop250Category === "anime") {
          films = await api.getLetterboxdFilms({
            list: "yellowtruck/list/letterboxds-official-top-250-anime-tv-miniseries",
            page: 1,
          });
        } else if (
          ["horror", "scifi", "science-fiction", "action", "comedy", "romance"].includes(
            selectedTop250Category
          )
        ) {
          const genreKey =
            selectedTop250Category === "scifi" ? "science-fiction" : selectedTop250Category;
          films = await api.getLetterboxdFilms({ genre: genreKey, sort: "rating-highest", page: 1 });
        } else {
          films = await api.getImdbFilms({
            genre: selectedTop250Category,
            sort: "highest",
            page: 1,
          });
        }

        if (!cancelled) {
          if (Array.isArray(films) && films.length > 0) {
            setTop250Films(films);
          } else {
            setTop250Films([]);
          }
        }
      } catch {
        if (!cancelled) setTop250Films([]);
      } finally {
        if (!cancelled) setLoadingTop250(false);
      }
    };

    fetchTop250();
    return () => {
      cancelled = true;
    };
  }, [pageMode, mode, selectedTop250Category]);

  // 2. Fetch live Letterboxd films (Dedicated Letterboxd Page) with search debounce
  useEffect(() => {
    if (pageMode !== "letterboxd") return;

    let cancelled = false;
    setLoadingLetterboxd(true);
    setLetterboxdLiveFilms([]);
    setLetterboxdPage(1);
    setLetterboxdHasMore(true);

    const timer = setTimeout(() => {
      api
        .getLetterboxdFilms({
          decade: selectedDecade,
          genre: selectedGenre,
          sort: sortBy,
          page: 1,
          search: searchQuery.trim(),
        })
        .then((films) => {
          if (!cancelled) {
            if (Array.isArray(films) && films.length > 0) {
              setLetterboxdLiveFilms(films);
            } else {
              setLetterboxdLiveFilms(LETTERBOXD_RANKINGS);
            }
          }
        })
        .catch(() => {
          if (!cancelled) setLetterboxdLiveFilms(LETTERBOXD_RANKINGS);
        })
        .finally(() => {
          if (!cancelled) setLoadingLetterboxd(false);
        });
    }, searchQuery.trim() ? 350 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pageMode, selectedGenre, selectedDecade, sortBy, searchQuery]);

  // 3. Fetch live IMDb films (Dedicated IMDb Page) with search debounce
  useEffect(() => {
    if (pageMode !== "imdb") return;

    let cancelled = false;
    setLoadingImdb(true);
    setImdbLiveFilms([]);
    setImdbPage(1);
    setImdbHasMore(true);

    const timer = setTimeout(() => {
      api
        .getImdbFilms({
          decade: selectedDecade,
          genre: selectedGenre,
          sort: sortBy,
          page: 1,
          search: searchQuery.trim(),
        })
        .then((films) => {
          if (!cancelled) {
            if (Array.isArray(films) && films.length > 0) {
              setImdbLiveFilms(films);
            } else {
              setImdbLiveFilms(IMDB_RANKINGS);
            }
          }
        })
        .catch(() => {
          if (!cancelled) setImdbLiveFilms(IMDB_RANKINGS);
        })
        .finally(() => {
          if (!cancelled) setLoadingImdb(false);
        });
    }, searchQuery.trim() ? 350 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pageMode, selectedGenre, selectedDecade, sortBy, searchQuery]);

  // When mode changes in Top 250, align filters & sortBy
  const handleModeChange = (newMode: PlatformMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setTop250Page(1);
    setTop250HasMore(true);
    if (newMode === "letterboxd") {
      setSortBy("rating-highest");
    } else {
      setSelectedTop250Category("movies");
      setSortBy("rank");
    }
  };

  // Merge items with strict zero leakage
  const allItems = useMemo(() => {
    let rawList: RankedItem[] = [];

    if (pageMode === "top250") {
      if (top250Films.length > 0) {
        rawList = top250Films;
      } else if (mode === "letterboxd") {
        let canonical = LETTERBOXD_RANKINGS;
        switch (selectedTop250Category) {
          case "movies":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                (i.type === "movie" || i.category === "official250") &&
                i.type !== "tv" &&
                i.category !== "tv" &&
                i.category !== "anime" &&
                i.category !== "lbanime"
            );
            break;
          case "tv":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) => i.type === "tv" || i.category === "tv"
            );
            break;
          case "anime":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                i.category === "anime" ||
                i.category === "lbanime" ||
                (i.genres &&
                  i.genres.some(
                    (g) =>
                      g.toLowerCase().includes("animation") ||
                      g.toLowerCase().includes("anime")
                  ))
            );
            break;
          case "horror":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                i.genres &&
                i.genres.some((g) => g.toLowerCase().includes("horror"))
            );
            break;
          case "scifi":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                i.genres &&
                i.genres.some(
                  (g) =>
                    g.toLowerCase().includes("sci-fi") ||
                    g.toLowerCase().includes("science")
                )
            );
            break;
          case "action":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                i.genres &&
                i.genres.some((g) => g.toLowerCase().includes("action"))
            );
            break;
          case "comedy":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                i.genres &&
                i.genres.some((g) => g.toLowerCase().includes("comedy"))
            );
            break;
          case "romance":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                i.genres &&
                i.genres.some((g) => g.toLowerCase().includes("romance"))
            );
            break;
          case "bollywood":
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                i.category === "bollywood" ||
                (i.country && i.country.toLowerCase().includes("india"))
            );
            break;
          case "south":
            canonical = LETTERBOXD_RANKINGS.filter((i) => i.category === "south");
            break;
          case "korean":
            canonical = LETTERBOXD_RANKINGS.filter((i) => i.category === "korean");
            break;
          default:
            canonical = LETTERBOXD_RANKINGS.filter(
              (i) =>
                (i.type === "movie" || i.category === "official250") &&
                i.type !== "tv" &&
                i.category !== "tv" &&
                i.category !== "anime" &&
                i.category !== "lbanime"
            );
            break;
        }
        rawList = canonical;
      } else {
        // IMDb Top 250 fallback
        let canonical = IMDB_RANKINGS;
        switch (selectedTop250Category) {
          case "movies":
            canonical = IMDB_RANKINGS.filter(
              (i) =>
                (i.category === "movies" || i.category === "official250") &&
                i.type !== "tv" &&
                i.category !== "tv" &&
                i.category !== "anime"
            );
            break;
          case "tv":
            canonical = IMDB_RANKINGS.filter((i) => i.category === "tv" || i.type === "tv");
            break;
          case "anime":
            canonical = IMDB_RANKINGS.filter(
              (i) =>
                i.category === "anime" ||
                (i.genres &&
                  i.genres.some((g) => g.toLowerCase().includes("animation")))
            );
            break;
          case "horror":
            canonical = IMDB_RANKINGS.filter(
              (i) =>
                i.category === "horror" ||
                (i.genres &&
                  i.genres.some((g) => g.toLowerCase().includes("horror")))
            );
            break;
          case "scifi":
            canonical = IMDB_RANKINGS.filter(
              (i) =>
                i.category === "scifi" ||
                (i.genres &&
                  i.genres.some(
                    (g) =>
                      g.toLowerCase().includes("sci-fi") ||
                      g.toLowerCase().includes("science")
                  ))
            );
            break;
          case "action":
            canonical = IMDB_RANKINGS.filter(
              (i) =>
                i.category === "action" ||
                (i.genres &&
                  i.genres.some((g) => g.toLowerCase().includes("action")))
            );
            break;
          case "comedy":
            canonical = IMDB_RANKINGS.filter(
              (i) =>
                i.category === "comedy" ||
                (i.genres &&
                  i.genres.some((g) => g.toLowerCase().includes("comedy")))
            );
            break;
          case "romance":
            canonical = IMDB_RANKINGS.filter(
              (i) =>
                i.category === "romance" ||
                (i.genres &&
                  i.genres.some((g) => g.toLowerCase().includes("romance")))
            );
            break;
          case "bollywood":
            canonical = IMDB_RANKINGS.filter((i) => i.category === "bollywood");
            break;
          case "south":
            canonical = IMDB_RANKINGS.filter((i) => i.category === "south");
            break;
          case "korean":
            canonical = IMDB_RANKINGS.filter((i) => i.category === "korean");
            break;
          default:
            canonical = IMDB_RANKINGS.filter(
              (i) =>
                (i.category === "movies" || i.category === "official250") &&
                i.type !== "tv" &&
                i.category !== "tv" &&
                i.category !== "anime"
            );
            break;
        }
        rawList = canonical;
      }
    } else if (pageMode === "letterboxd") {
      rawList = letterboxdLiveFilms.length > 0 ? letterboxdLiveFilms : LETTERBOXD_RANKINGS;
    } else {
      // Dedicated IMDb discovery page (all titles available)
      rawList = imdbLiveFilms.length > 0 ? imdbLiveFilms : IMDB_RANKINGS;
    }

    const seen = new Set<string>();
    const deduplicated: RankedItem[] = [];
    for (const item of rawList) {
      const key = (item.imdbId || item.id || item.slug || item.title).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(item);
      }
    }
    return deduplicated;
  }, [pageMode, mode, top250Films, letterboxdLiveFilms, imdbLiveFilms, selectedTop250Category]);

  // Exact filtering & sorting
  const displayItems = useMemo(() => {
    let list = [...allItems];

    if (pageMode !== "top250") {
      // Dedicated discovery pages filter by Decade and Genre
      if (selectedDecade !== "all") {
        const dec = parseInt(selectedDecade, 10);
        if (!isNaN(dec)) {
          list = list.filter((i) => i.year >= dec && i.year < dec + 10);
        }
      }
      if (selectedGenre !== "all") {
        list = list.filter((i) =>
          i.genres &&
          i.genres.some((g) =>
            g.toLowerCase().includes(selectedGenre.toLowerCase())
          )
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.director && i.director.toLowerCase().includes(q)) ||
          (i.genres && i.genres.some((g) => g.toLowerCase().includes(q))) ||
          String(i.year).includes(q)
      );
    }

    list.sort((a, b) => {
      if (mode === "letterboxd") {
        switch (sortBy) {
          case "rating-highest":
            return (b.letterboxdRating || 0) - (a.letterboxdRating || 0);
          case "rating-lowest":
            return (a.letterboxdRating || 0) - (b.letterboxdRating || 0);
          case "popular-all":
            return parseVotes(b.imdbVotes) - parseVotes(a.imdbVotes);
          case "popular-year":
            return (
              (b.year >= 2024 ? 1 : 0) - (a.year >= 2024 ? 1 : 0) ||
              parseVotes(b.imdbVotes) - parseVotes(a.imdbVotes)
            );
          case "popular-month":
          case "popular-week":
            return (
              (b.year >= 2023 ? 1 : 0) - (a.year >= 2023 ? 1 : 0) ||
              parseVotes(b.imdbVotes) - parseVotes(a.imdbVotes)
            );
          case "release-newest":
            return b.year - a.year;
          case "release-earliest":
            return a.year - b.year;
          case "length-shortest":
            return parseRuntimeMinutes(a.runtime) - parseRuntimeMinutes(b.runtime);
          case "length-longest":
            return parseRuntimeMinutes(b.runtime) - parseRuntimeMinutes(a.runtime);
          case "name-az":
            return a.title.localeCompare(b.title);
          default:
            return (b.letterboxdRating || 0) - (a.letterboxdRating || 0);
        }
      }

      // IMDb mode
      switch (sortBy) {
        case "rank":
          return (a.rank || 999) - (b.rank || 999);
        case "highest":
          return (b.imdbRating || 0) - (a.imdbRating || 0);
        case "lowest":
          return (a.imdbRating || 0) - (b.imdbRating || 0);
        case "votes":
          return parseVotes(b.imdbVotes) - parseVotes(a.imdbVotes);
        case "year-desc":
          return b.year - a.year;
        case "year-asc":
          return a.year - b.year;
        default:
          return pageMode === "top250"
            ? (a.rank || 999) - (b.rank || 999)
            : (b.imdbRating || 0) - (a.imdbRating || 0);
      }
    });

    return list;
  }, [allItems, searchQuery, sortBy, mode, pageMode, selectedDecade, selectedGenre]);

  const handleCardClick = (item: RankedItem) => {
    onSelectPost({
      title: item.title,
      link: item.imdbId || item.title,
      image: item.poster,
      provider: activeProviderKey || "hdhub4u",
    });
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);

    try {
      if (pageMode === "top250") {
        const nextPage = top250Page + 1;
        let more: any[] = [];
        if (selectedTop250Category === "movies") {
          const listSlug =
            mode === "letterboxd"
              ? "kevindoherty123/list/official-top-250-narrative-feature-films-2"
              : "dave/list/imdb-top-250";
          more = await api.getLetterboxdFilms({ list: listSlug, page: nextPage });
        } else if (selectedTop250Category === "tv") {
          more = await api.getLetterboxdFilms({
            list: "dori_han/list/imdb-top-250-tv-shows",
            page: nextPage,
          });
        } else if (selectedTop250Category === "anime") {
          more = await api.getLetterboxdFilms({
            list: "yellowtruck/list/letterboxds-official-top-250-anime-tv-miniseries",
            page: nextPage,
          });
        } else if (
          ["horror", "scifi", "science-fiction", "action", "comedy", "romance"].includes(
            selectedTop250Category
          )
        ) {
          const genreKey =
            selectedTop250Category === "scifi" ? "science-fiction" : selectedTop250Category;
          more = await api.getLetterboxdFilms({
            genre: genreKey,
            sort: "rating-highest",
            page: nextPage,
          });
        } else {
          more = await api.getImdbFilms({
            genre: selectedTop250Category,
            sort: "highest",
            page: nextPage,
          });
        }

        if (Array.isArray(more) && more.length > 0) {
          setTop250Films((prev) => [...prev, ...more]);
          setTop250Page(nextPage);
        } else {
          setTop250HasMore(false);
        }
      } else if (pageMode === "letterboxd") {
        const nextPage = letterboxdPage + 1;
        const more = await api.getLetterboxdFilms({
          decade: selectedDecade,
          genre: selectedGenre,
          sort: sortBy,
          page: nextPage,
          search: searchQuery.trim(),
        });
        if (Array.isArray(more) && more.length > 0) {
          setLetterboxdLiveFilms((prev) => [...prev, ...more]);
          setLetterboxdPage(nextPage);
        } else {
          setLetterboxdHasMore(false);
        }
      } else {
        const nextPage = imdbPage + 1;
        const more = await api.getImdbFilms({
          decade: selectedDecade,
          genre: selectedGenre,
          sort: sortBy,
          page: nextPage,
          search: searchQuery.trim(),
        });
        if (Array.isArray(more) && more.length > 0) {
          setImdbLiveFilms((prev) => [...prev, ...more]);
          setImdbPage(nextPage);
        } else {
          setImdbHasMore(false);
        }
      }
    } catch {
      // Keep existing
    } finally {
      setLoadingMore(false);
    }
  };

  const isImdb = mode === "imdb";
  const modeAccent = isImdb ? "#f5c518" : "#00e054";
  const isCurrentlyLoading =
    pageMode === "top250"
      ? loadingTop250
      : mode === "letterboxd"
      ? loadingLetterboxd
      : loadingImdb;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#ffffff",
        fontFamily: "var(--font-main, 'Plus Jakarta Sans', sans-serif)",
        paddingTop: isMobile ? "124px" : "76px",
        paddingBottom: "80px",
      }}
    >
      {/* ─── Sticky Top Bar ─────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: isMobile ? "108px" : "60px",
          zIndex: 30,
          background: "rgba(0,0,0,0.94)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Back + Platform toggle row */}
        <div
          style={{
            maxWidth: "1480px",
            margin: "0 auto",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          {/* Back button + Page Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={onBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            >
              <ArrowLeftIcon size={13} />
              <span>Back</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "4px",
                  height: "18px",
                  borderRadius: "2px",
                  background: pageMode === "letterboxd" ? "#00e054" : isImdb ? "#f5c518" : "#e50914",
                }}
              />
              <h1 style={{ fontSize: "17px", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                {pageMode === "letterboxd"
                  ? "Letterboxd Discovery"
                  : pageMode === "imdb"
                  ? "IMDb Discovery"
                  : "Top 250 Hall of Fame"}
              </h1>
            </div>
          </div>

          {/* Top 250 page only: Switch between IMDb Top 250 & Letterboxd Top 250 */}
          {pageMode === "top250" && (
            <div
              style={{
                display: "inline-flex",
                background: "rgba(255,255,255,0.05)",
                padding: "3px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.08)",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => handleModeChange("imdb")}
                style={{
                  padding: "5px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  background: isImdb ? "#f5c518" : "transparent",
                  color: isImdb ? "#000000" : "rgba(255,255,255,0.55)",
                  transition: "all 0.2s",
                  border: "none",
                  fontFamily: "inherit",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  if (!isImdb) {
                    e.currentTarget.style.background = "#f5c518";
                    e.currentTarget.style.color = "#000000";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isImdb) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }
                }}
              >
                IMDb Top 250
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("letterboxd")}
                style={{
                  padding: "5px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  background: !isImdb ? "#00e054" : "transparent",
                  color: !isImdb ? "#000000" : "rgba(255,255,255,0.55)",
                  transition: "all 0.2s",
                  border: "none",
                  fontFamily: "inherit",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => {
                  if (isImdb) {
                    e.currentTarget.style.background = "#00e054";
                    e.currentTarget.style.color = "#000000";
                  }
                }}
                onMouseLeave={(e) => {
                  if (isImdb) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }
                }}
              >
                Letterboxd Top 250
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Control Bar (Solid Scale Badge + Category Dropdowns + Search + Sort) ──── */}
      <div
        style={{
          maxWidth: "1480px",
          margin: "0 auto",
          padding: isMobile ? "12px 14px 10px" : "16px 20px 10px",
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          flexDirection: isMobile ? "column" : "row",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Left: Solid Scale Badge + Category Dropdown + Clean Count (NO loading pill next to tabs!) */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
          {/* Solid Scale Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 13px",
              borderRadius: "999px",
              background: isImdb ? "#f5c518" : "#00e054",
              border: "none",
              fontSize: "11.5px",
              fontWeight: 900,
              color: "#000000",
              boxShadow: isImdb
                ? "0 3px 12px rgba(245, 197, 24, 0.45)"
                : "0 3px 12px rgba(0, 224, 84, 0.45)",
              letterSpacing: "0.02em",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            <StarIcon size={11} fill="#000000" color="#000000" />
            <span>
              {pageMode === "top250"
                ? isImdb
                  ? "IMDb Top 250"
                  : "Letterboxd Top 250"
                : isImdb
                ? "IMDb 10-Point Scale"
                : "Letterboxd 5-Star Scale"}
            </span>
          </div>

          {/* Dropdown Filters */}
          {pageMode === "top250" ? (
            <RankingsCategoryDropdown
              categories={TOP250_CATEGORIES}
              selectedCategory={selectedTop250Category}
              onSelectCategory={(cat) => {
                setSelectedTop250Category(cat);
                setTop250Films([]);
                setLoadingTop250(true);
              }}
              placeholder="Top 250 category..."
            />
          ) : (
            <>
              {/* Dedicated discovery pages: Any genre & Any decade */}
              <RankingsCategoryDropdown
                categories={LETTERBOXD_GENRES}
                selectedCategory={selectedGenre}
                onSelectCategory={(g) => {
                  setSelectedGenre(g);
                  if (pageMode === "letterboxd") {
                    setLetterboxdLiveFilms([]);
                    setLoadingLetterboxd(true);
                  } else {
                    setImdbLiveFilms([]);
                    setLoadingImdb(true);
                  }
                }}
                prefix="Genre"
                placeholder="Any genre"
              />
              <RankingsCategoryDropdown
                categories={LETTERBOXD_DECADES}
                selectedCategory={selectedDecade}
                onSelectCategory={(d) => {
                  setSelectedDecade(d);
                  if (pageMode === "letterboxd") {
                    setLetterboxdLiveFilms([]);
                    setLoadingLetterboxd(true);
                  } else {
                    setImdbLiveFilms([]);
                    setLoadingImdb(true);
                  }
                }}
                prefix="Decade"
                placeholder="Any decade"
              />
            </>
          )}

          {/* Clean title count without loading pill */}
          <span
            style={{
              fontSize: "12.5px",
              color: "rgba(255,255,255,0.4)",
              fontWeight: 600,
              marginLeft: "4px",
              whiteSpace: "nowrap",
            }}
          >
            {displayItems.length} {isImdb ? "titles" : "films"}
          </span>
        </div>

        {/* Search + Custom Sort Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: isMobile ? "100%" : "auto" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: isMobile ? 1 : "initial", width: isMobile ? "100%" : "auto" }}>
            <div
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.3)",
                display: "flex",
                pointerEvents: "none",
              }}
            >
              <SearchIcon size={13} />
            </div>
            <input
              type="text"
              placeholder={pageMode === "letterboxd" ? "Search Letterboxd..." : isImdb ? "Search IMDb..." : "Search titles..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "999px",
                padding: "0 32px 0 32px",
                height: "36px",
                color: "#ffffff",
                fontSize: "12.5px",
                width: isMobile ? "100%" : "190px",
                boxSizing: "border-box",
                outline: "none",
                transition: "border-color 0.2s",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = modeAccent)}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "11px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <XIcon size={11} />
              </button>
            )}
          </div>

          {/* Custom Sort Dropdown */}
          <SortDropdown
            value={sortBy}
            onChange={setSortBy}
            options={
              mode === "imdb"
                ? pageMode === "top250"
                  ? IMDB_SORT_OPTIONS
                  : DEDICATED_IMDB_SORT_OPTIONS
                : LETTERBOXD_SORT_OPTIONS
            }
          />
        </div>
      </div>

      {/* Embedded CSS for hover badge */}
      <style>{`
        .rankings-hover-badge {
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.22s ease, transform 0.22s ease;
        }
        .rankings-card-container:hover .rankings-hover-badge {
          opacity: 1;
          transform: translateY(0);
        }
        @media (hover: none), (max-width: 768px) {
          .rankings-hover-badge {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }
        }
      `}</style>

      {/* ─── Cards Grid ─────────────────────────────────────── */}
      <div
        style={{
          maxWidth: "1480px",
          margin: "0 auto",
          padding: isMobile ? "8px 14px 24px" : "8px 20px 24px",
        }}
      >
        {isCurrentlyLoading ? (
          /* Simple, non-glowing loader */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "420px",
              padding: "70px 20px",
              gap: "14px",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "3px solid rgba(255, 255, 255, 0.12)",
                borderTopColor: modeAccent,
                animation: "spin 0.75s linear infinite",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.01em", color: "#ffffff" }}>
                {pageMode === "top250"
                  ? `Loading ${TOP250_CATEGORIES.find((c) => c.id === selectedTop250Category)?.label || "Top 250"}...`
                  : isImdb
                  ? `Loading ${selectedGenre !== "all" ? selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1) : "IMDb"} titles...`
                  : `Loading ${selectedGenre !== "all" ? selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1) : "Letterboxd"} films...`}
              </span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                Fetching live scraped ratings & rankings...
              </span>
            </div>
          </div>
        ) : displayItems.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <FilmIcon size={48} color="rgba(255,255,255,0.12)" />
            <p style={{ marginTop: "16px", fontSize: "15px", fontWeight: 600 }}>
              No titles found
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(auto-fill, minmax(130px, 1fr))"
                  : "repeat(auto-fill, minmax(154px, 1fr))",
                gap: isMobile ? "10px" : "14px",
              }}
            >
              {displayItems.map((item, idx) => (
                <RankingsCard
                  key={`${item.id || item.imdbId || item.slug || item.title}_${idx}`}
                  item={item}
                  idx={idx}
                  mode={mode}
                  pageMode={pageMode}
                  isHov={hoveredId === (item.id || item.title)}
                  onHover={setHoveredId}
                  onClick={handleCardClick}
                />
              ))}
            </div>

            {/* Load More Button */}
            {(pageMode === "top250"
              ? top250HasMore && top250Films.length >= 20
              : pageMode === "letterboxd"
              ? letterboxdHasMore && letterboxdLiveFilms.length >= 20
              : imdbHasMore && imdbLiveFilms.length >= 20) && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "40px",
                  marginBottom: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "11px 28px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: loadingMore ? "not-allowed" : "pointer",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingMore) {
                      e.currentTarget.style.background = modeAccent;
                      e.currentTarget.style.color = "#000000";
                      e.currentTarget.style.borderColor = modeAccent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loadingMore) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                    }
                  }}
                >
                  {loadingMore ? (
                    <>
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#ffffff",
                          animation: "spin 0.6s linear infinite",
                        }}
                      />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <span>Load More</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
