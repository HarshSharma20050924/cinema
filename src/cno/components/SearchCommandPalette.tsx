import React, { useState, useEffect, useRef } from "react";
import { Search, X, Clock, ArrowRight, Film } from "lucide-react";
import { CNO_RECENT_SEARCHES, CNO_TRENDING_SEARCHES } from "../mockData";
import { api } from "../../api/client";
import type { CnoMedia } from "../types";

interface SearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (media: CnoMedia) => void;
}

export const SearchCommandPalette: React.FC<SearchCommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
}) => {
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>(CNO_RECENT_SEARCHES);
  const [results, setResults] = useState<CnoMedia[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Live search debounce querying backend
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const posts = await api.globalSearch(trimmed);
        const mapped: CnoMedia[] = posts.slice(0, 10).map((p) => ({
          id: p.link || p.title,
          title: p.title,
          type: "movie",
          year: 2024,
          genres: ["Cinema"],
          overview: p.description || p.title,
          backdrop: p.image || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop",
          poster: p.image || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop",
          backendProvider: p.provider,
          backendLink: p.link,
        }));
        setResults(mapped);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectRecent = (term: string) => {
    setQuery(term);
  };

  const handleClearRecents = () => {
    setRecents([]);
  };

  return (
    <div className="cno-spotlight-backdrop" onClick={onClose}>
      <div
        className="cno-spotlight-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="cno-spotlight-input-wrap">
          <Search size={18} color="#94a3b8" />
          <input
            ref={inputRef}
            type="text"
            className="cno-spotlight-input"
            placeholder="Search movies, shows and people"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              className="cno-icon-btn"
              style={{ width: "28px", height: "28px" }}
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </button>
          ) : (
            <span style={{ fontSize: "11px", color: "#64748b" }}>ESC</span>
          )}
        </div>

        {/* Search Body */}
        <div className="cno-spotlight-body">
          {query.trim().length > 0 ? (
            <div>
              <div className="cno-spotlight-section-header">
                <span>{isSearching ? "Searching cluster..." : `Results (${results.length})`}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                {results.length > 0 ? (
                  results.map((media) => (
                    <div
                      key={media.id}
                      className="cno-spotlight-item"
                      onClick={() => {
                        onSelectMedia(media);
                        onClose();
                      }}
                    >
                      <img src={media.poster} alt={media.title} className="cno-spotlight-thumb" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14.5px", fontWeight: "600", color: "#ffffff" }}>
                          {media.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#8e95a5", marginTop: "2px" }}>
                          {media.backendProvider || "Cinema"} • {media.year}
                        </div>
                      </div>
                      <ArrowRight size={15} color="#64748b" />
                    </div>
                  ))
                ) : !isSearching ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                    No results found for "{query}"
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {/* RECENT SEARCHES */}
              {recents.length > 0 && (
                <div>
                  <div className="cno-spotlight-section-header">
                    <span>Recent</span>
                    <button className="cno-spotlight-clear-btn" onClick={handleClearRecents}>
                      Clear
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "6px" }}>
                    {recents.map((item, idx) => (
                      <div
                        key={idx}
                        className="cno-spotlight-item"
                        onClick={() => handleSelectRecent(item)}
                      >
                        <Clock size={16} color="#64748b" />
                        <span style={{ flex: 1, fontSize: "14px", color: "#cbd5e1" }}>{item}</span>
                        <ArrowRight size={14} color="#64748b" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TRENDING ITEMS */}
              <div>
                <div className="cno-spotlight-section-header">
                  <span>Trending</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                  {CNO_TRENDING_SEARCHES.map((item) => (
                    <div
                      key={item.id}
                      className="cno-spotlight-item"
                      onClick={() => {
                        onSelectMedia(item);
                        onClose();
                      }}
                    >
                      <img src={item.poster} alt={item.title} className="cno-spotlight-thumb" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#8e95a5", marginTop: "2px" }}>
                          Movie • {item.year}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="cno-spotlight-footer">
          <div>
            <span className="cno-key-badge">↑</span>
            <span className="cno-key-badge">↓</span> to move
          </div>
          <div>
            <span className="cno-key-badge">↵</span> to open
          </div>
          <div>
            <span className="cno-key-badge">esc</span> to close
          </div>
        </div>
      </div>
    </div>
  );
};
