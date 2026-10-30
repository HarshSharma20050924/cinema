import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Post, Provider } from "../../types";
import { MediaCard } from "../media/MediaCard";
import { SearchIcon, ArrowLeftIcon, XIcon, CheckIcon, ChevronDownIcon, GlobeIcon } from "../../icons";
import {
  SEARCH_LANGUAGES,
  fetchTrendingByLanguage,
  searchTMDBLive,
} from "../../api/tmdb";

export interface DedicatedSearchPageProps {
  posts?: Post[];
  trendingPosts?: Post[];
  onSelectPost: (post: Post) => void;
  onBack: () => void;
  loading?: boolean;
  providers?: Provider[];
  activeProvider?: Provider | null;
  onSelectProvider?: (provider: Provider) => void;
  onTriggerSearch?: (query: string, providerKey?: string) => void;
}

const HistoryIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const ArrowRightIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const STORAGE_KEY_HISTORY = "cinema_recent_searches";
const STORAGE_KEY_LANG = "cinema_search_lang";

const EMPTY_POSTS: Post[] = [];

export const DedicatedSearchPage: React.FC<DedicatedSearchPageProps> = ({
  posts = EMPTY_POSTS,
  trendingPosts = EMPTY_POSTS,
  onSelectPost,
  onBack,
  loading = false,
  onTriggerSearch,
}) => {
  const [query, setQuery] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_LANG) || "all";
    } catch {
      return "all";
    }
  });

  const fallbackTrendingRef = useRef(trendingPosts);
  fallbackTrendingRef.current = trendingPosts;

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [trendingList, setTrendingList] = useState<Post[]>(() => trendingPosts.slice(0, 16));
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<Post[]>([]);
  const [loadingLiveSearch, setLoadingLiveSearch] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
      }
    } catch (_) {}
    return [];
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Auto focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // History helpers
  const addSearchHistory = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setSearchHistory((prev) => {
      const updated = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (_) {}
  }, []);

  const removeHistoryItem = useCallback((e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((x) => x !== item);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  // Fetch trending by language from TMDB live
  useEffect(() => {
    let isMounted = true;
    setLoadingTrending(true);

    fetchTrendingByLanguage(selectedLanguage)
      .then((items) => {
        if (!isMounted) return;
        if (items && items.length > 0) {
          setTrendingList(items);
        } else if (fallbackTrendingRef.current.length > 0) {
          setTrendingList(fallbackTrendingRef.current.slice(0, 16));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        if (fallbackTrendingRef.current.length > 0) {
          setTrendingList(fallbackTrendingRef.current.slice(0, 16));
        }
      })
      .finally(() => {
        if (isMounted) setLoadingTrending(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLanguage]);

  // Handle outside click for language dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isLangDropdownOpen]);

  // Live debounced search across TMDB
  useEffect(() => {
    const clean = query.trim();
    if (!clean || clean.length < 2) {
      setTmdbSearchResults([]);
      setLoadingLiveSearch(false);
      return;
    }

    setLoadingLiveSearch(true);
    const timer = setTimeout(() => {
      searchTMDBLive(clean)
        .then((results) => {
          setTmdbSearchResults(results);
        })
        .finally(() => {
          setLoadingLiveSearch(false);
        });
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  // Combined search results on full page
  const fullPageSearchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const localMatches = posts.filter((p) => {
      const title = (p.title || "").toLowerCase();
      const cat = (p.genres || p.tag || "").toLowerCase();
      return title.includes(q) || cat.includes(q);
    });

    const combined = [...localMatches];
    const seenTitles = new Set(combined.map((p) => (p.title || "").toLowerCase()));

    for (const r of tmdbSearchResults) {
      const t = (r.title || "").toLowerCase();
      if (!seenTitles.has(t)) {
        seenTitles.add(t);
        combined.push(r);
      }
    }

    return combined;
  }, [posts, query, tmdbSearchResults]);

  // Suggestions for the floating popover under search bar
  const popoverSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    return fullPageSearchResults.slice(0, 6);
  }, [fullPageSearchResults, query]);

  // Popover visibility
  const showPopover = isInputFocused && (query.trim().length > 0 || searchHistory.length > 0);

  // Keyboard navigation inside popover
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsInputFocused(false);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) {
        addSearchHistory(query.trim());
        if (selectedIndex >= 0 && popoverSuggestions[selectedIndex]) {
          onSelectPost(popoverSuggestions[selectedIndex]);
        } else if (popoverSuggestions.length > 0) {
          onSelectPost(popoverSuggestions[0]);
        }
        setIsInputFocused(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (popoverSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < popoverSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : popoverSuggestions.length - 1));
      }
    }
  };

  const handleSelectHistoryItem = (term: string) => {
    setQuery(term);
    addSearchHistory(term);
    setIsInputFocused(false);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (post: Post) => {
    addSearchHistory(post.title);
    onSelectPost(post);
    setIsInputFocused(false);
  };

  const currentLanguageLabel =
    SEARCH_LANGUAGES.find((l) => l.code === selectedLanguage)?.label || "Any language";

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "rgba(8, 10, 16, 0.35)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
        color: "#ffffff",
        paddingTop: "76px",
        paddingBottom: "80px",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Top Bar with Clean Pill Back Button (Desktop only, mobile has top bar) */}
      <div
        className="desktop-only"
        style={{
          padding: "16px 48px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 20px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            color: "#ffffff",
            fontSize: "13.5px",
            fontWeight: 600,
            cursor: "pointer",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <ArrowLeftIcon size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Hero Search Section */}
      <div
        style={{
          position: "relative",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 24px 36px 24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(28px, 4.2vw, 44px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#ffffff",
            marginBottom: "24px",
            textShadow: "0 4px 20px rgba(0, 0, 0, 0.7)",
          }}
        >
          What are you in the mood for?
        </h1>

        {/* Centered Pill Search Input Bar with Floating Suggestions Popover */}
        <div
          style={{
            position: "relative",
            width: "min(680px, 92vw)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "20px",
              color: "rgba(255, 255, 255, 0.6)",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <SearchIcon size={20} />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              // Delay blur to allow clicks inside popover
              setTimeout(() => setIsInputFocused(false), 240);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, shows and people..."
            style={{
              width: "100%",
              height: "56px",
              borderRadius: "32px",
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.13)",
              padding: "0 50px 0 54px",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 500,
              outline: "none",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
              transition: "border-color 0.2s ease, background 0.2s ease",
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
          />

          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              style={{
                position: "absolute",
                right: "16px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.18)",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.28)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
              }}
            >
              <XIcon size={13} color="#ffffff" />
            </button>
          )}

          {/* Floating Suggestions & Recent History Popover (Matching Image 1) */}
          {showPopover && (
            <div
              ref={popoverRef}
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: 0,
                right: 0,
                background: "rgba(22, 24, 30, 0.94)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                zIndex: 600,
                textAlign: "left",
                maxHeight: "380px",
                overflowY: "auto",
                animation: "cinemaSpotlightScaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
            >
              {/* If Query is empty: Show RECENT SEARCHES */}
              {!query.trim() && searchHistory.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "2px 6px 6px 6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: "rgba(255, 255, 255, 0.45)",
                        textTransform: "uppercase",
                      }}
                    >
                      Recent
                    </span>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        clearSearchHistory();
                      }}
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "rgba(255, 255, 255, 0.55)",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        transition: "color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  {searchHistory.map((item, idx) => (
                    <div
                      key={`hist-${item}-${idx}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectHistoryItem(item);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.04)",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(255, 255, 255, 0.75)",
                          flexShrink: 0,
                        }}
                      >
                        <HistoryIcon size={14} />
                      </div>
                      <span
                        style={{
                          flex: 1,
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#ffffff",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item}
                      </span>
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          removeHistoryItem(e, item);
                        }}
                        style={{ color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}
                      >
                        <ArrowRightIcon size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* If Query is typed: Show LIVE SUGGESTIONS */}
              {query.trim() && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div
                    style={{
                      padding: "2px 6px 6px 6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: "rgba(255, 255, 255, 0.45)",
                        textTransform: "uppercase",
                      }}
                    >
                      Suggestions
                    </span>
                    {loadingLiveSearch && (
                      <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>
                        Searching...
                      </span>
                    )}
                  </div>

                  {popoverSuggestions.map((post, idx) => {
                    const isSelected = selectedIndex === idx;
                    const mediaSubtitle = `${post.mediaType === "tv" ? "TV" : "Movie"}${post.year ? ` • ${post.year}` : ""}`;

                    return (
                      <div
                        key={`sugg-${post.tmdbId || post.title}-${idx}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(post);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "7px 10px",
                          borderRadius: "10px",
                          background: isSelected ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.03)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                          }
                        }}
                      >
                        <div
                          style={{
                            width: "30px",
                            height: "42px",
                            borderRadius: "5px",
                            overflow: "hidden",
                            background: "rgba(255, 255, 255, 0.08)",
                            flexShrink: 0,
                          }}
                        >
                          {post.image ? (
                            <img
                              src={post.image}
                              alt={post.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                              }}
                            >
                              🎬
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "#ffffff",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {post.title}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)" }}>
                            {mediaSubtitle}
                          </div>
                        </div>

                        {post.rating && (
                          <div
                            style={{
                              padding: "2px 6px",
                              borderRadius: "999px",
                              background: "rgba(255, 255, 255, 0.08)",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#ffffff",
                            }}
                          >
                            ★ {post.rating}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Keyboard Navigation Footer Hints */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  paddingTop: "8px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                <span>
                  <strong style={{ color: "#ffffff" }}>↑ ↓</strong> to move
                </span>
                <span>
                  <strong style={{ color: "#ffffff" }}>↵</strong> to open
                </span>
                <span>
                  <strong style={{ color: "#ffffff" }}>esc</strong> to close
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area on the Full Page: Trending Grid OR Search Results */}
      <div style={{ padding: "0 48px" }}>
        {!query.trim() ? (
          <div>
            {/* Header row with "Trending Now" on the left and the Language Selector Tab on the right */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "0.01em",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span>Trending Now</span>
                {loadingTrending && (
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255, 255, 255, 0.5)" }}>
                    Loading...
                  </span>
                )}
              </h2>

              {/* Language Selector Dropdown (Matching Image 2 exactly) */}
              <div style={{ position: "relative" }} ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 18px",
                    borderRadius: "999px",
                    background: isLangDropdownOpen
                      ? "rgba(255, 255, 255, 0.14)"
                      : "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isLangDropdownOpen) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    }
                  }}
                >
                  <GlobeIcon size={14} color="#ffffff" />
                  <span>{currentLanguageLabel}</span>
                  <ChevronDownIcon size={12} color="rgba(255, 255, 255, 0.7)" />
                </button>

                {/* Dropdown Menu (Max light transparent frosted glass) */}
                {isLangDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: "220px",
                      maxHeight: "340px",
                      overflowY: "auto",
                      background: "rgba(10, 14, 22, 0.45)",
                      backdropFilter: "blur(32px) saturate(200%)",
                      WebkitBackdropFilter: "blur(32px) saturate(200%)",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      borderRadius: "18px",
                      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.12)",
                      padding: "6px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      zIndex: 1100,
                    }}
                  >
                    {SEARCH_LANGUAGES.map((lang) => {
                      const isSelected = selectedLanguage === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            try {
                              localStorage.setItem(STORAGE_KEY_LANG, lang.code);
                            } catch (_) {}
                            setIsLangDropdownOpen(false);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "9px 12px",
                            borderRadius: "12px",
                            background: isSelected ? "#e50914" : "transparent",
                            border: isSelected ? "1px solid #e50914" : "none",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: isSelected ? 700 : 500,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            boxShadow: isSelected ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          {isSelected ? (
                            <CheckIcon size={14} color="#ffffff" />
                          ) : (
                            <span style={{ width: "14px", display: "inline-block" }} />
                          )}
                          <span>{lang.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Trending Items Grid */}
            <div className="search-trending-grid">
              {trendingList.map((post, idx) => (
                <MediaCard
                  key={`${post.tmdbId || post.title}-${idx}`}
                  post={post}
                  layout="portrait"
                  onClick={onSelectPost}
                  priority={idx < 8}
                />
              ))}
            </div>
          </div>
        ) : fullPageSearchResults.length === 0 && !loadingLiveSearch ? (
          <div
            style={{
              textAlign: "center",
              padding: "70px 20px",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
              No results found for &ldquo;{query}&rdquo;
            </div>
            <div style={{ fontSize: "14px" }}>
              Try searching with another title, actor, or genre.
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.55)",
                marginBottom: "20px",
              }}
            >
              {fullPageSearchResults.length} results for &ldquo;{query}&rdquo;
            </div>

            <div className="search-trending-grid">
              {fullPageSearchResults.map((post, idx) => (
                <MediaCard
                  key={`${post.tmdbId || post.title}-${idx}`}
                  post={post}
                  layout="portrait"
                  onClick={onSelectPost}
                  priority={idx < 12}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
