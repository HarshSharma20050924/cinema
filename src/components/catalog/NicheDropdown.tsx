import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, SearchIcon, XIcon, FilmIcon } from "../../icons";
import { CREATIVE_CATEGORIES, type CreativeCategory } from "./BrowseCategoriesGrid";
import type { CatalogFilter } from "../../types";

interface NicheDropdownProps {
  selectedNicheId?: string | null;
  activeFilterTitle?: string;
  onSelectNiche: (niche: CreativeCategory | null) => void;
  extraGenres?: CatalogFilter[];
  onSelectGenre?: (filter: string, title: string) => void;
  label?: string;
  className?: string;
}

const NICHE_BADGES: Record<string, string> = {
  bollywood: "Hindi",
  hollywood: "English",
  tollywood: "Telugu",
  kollywood: "Tamil",
  mollywood: "Malayalam",
  sandalwood: "Kannada",
  "south-movies": "South",
  "web-series": "Series",
  "hindi-dubbed": "Dual Audio",
  punjabi: "Punjabi",
  anime: "Anime",
  korean: "K-Drama",
  action: "Action",
  comedy: "Comedy",
  horror: "Horror",
  romance: "Romance",
  scifi: "Sci-Fi",
  crime: "Crime",
  documentary: "Docu",
};

export const NicheDropdown: React.FC<NicheDropdownProps> = ({
  selectedNicheId,
  activeFilterTitle,
  onSelectNiche,
  extraGenres = [],
  onSelectGenre,
  label = "Niche",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setFilterSearch("");
    }
  }, [isOpen]);

  // Escape key closes dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Find currently active niche
  const activeNiche = CREATIVE_CATEGORIES.find((c) => c.id === selectedNicheId);

  // Filter niches by search query
  const searchLower = filterSearch.trim().toLowerCase();
  const filteredNiches = CREATIVE_CATEGORIES.filter((c) => {
    if (!searchLower) return true;
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.countBadge.toLowerCase().includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower)
    );
  });

  // Filter extra provider genres (if provided)
  const filteredGenres = extraGenres.filter((g) => {
    if (!g.title || g.filter === "") return false;
    if (!searchLower) return true;
    return g.title.toLowerCase().includes(searchLower);
  });

  const displayTitle = activeNiche
    ? activeNiche.name
    : activeFilterTitle
    ? activeFilterTitle
    : "All Niches";

  const isFiltered = Boolean(
    activeNiche ||
      (activeFilterTitle &&
        activeFilterTitle !== "All Movies" &&
        activeFilterTitle !== "All TV Shows & Series")
  );

  return (
    <div
      ref={dropdownRef}
      className={`niche-dropdown-wrapper ${className}`}
      style={{
        position: "relative",
        display: "inline-block",
        zIndex: isOpen ? 50 : 10,
        userSelect: "none",
      }}
    >
      {/* Trigger Button - Clean pill matching navbar navigation */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          height: "38px",
          padding: "0 16px",
          borderRadius: "999px",
          background: isFiltered
            ? "rgba(229, 9, 20, 0.16)"
            : isOpen
            ? "rgba(255, 255, 255, 0.10)"
            : "rgba(18, 18, 18, 0.85)",
          border: isFiltered
            ? "1px solid rgba(229, 9, 20, 0.55)"
            : isOpen
            ? "1px solid rgba(255, 255, 255, 0.25)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          color: "#ffffff",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: isFiltered
            ? "0 4px 16px rgba(229, 9, 20, 0.25)"
            : "0 4px 14px rgba(0, 0, 0, 0.4)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <FilmIcon size={14} color={isFiltered ? "#e50914" : "rgba(255, 255, 255, 0.7)"} />

        <span style={{ color: "rgba(255, 255, 255, 0.5)", fontWeight: 500 }}>
          {label}:
        </span>

        <span style={{ color: isFiltered ? "#ffffff" : "#e5e5e5", fontWeight: 700 }}>
          {displayTitle}
        </span>

        {/* Clear filter button if filtered */}
        {isFiltered && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelectNiche(null);
              setIsOpen(false);
            }}
            title="Reset to All"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              marginLeft: "2px",
            }}
          >
            <XIcon size={10} />
          </span>
        )}

        <div
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            display: "flex",
            alignItems: "center",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <ChevronDownIcon size={12} />
        </div>
      </button>

      {/* Floating Dropdown Menu - Pure Black Template matching Extension dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: "300px",
            maxHeight: "420px",
            background: "rgba(10, 10, 10, 0.98)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "18px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 100,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {/* Search Box inside dropdown */}
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              background: "#050505",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                borderRadius: "8px",
                padding: "6px 10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <SearchIcon size={13} color="rgba(255, 255, 255, 0.45)" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search cinema niche..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: "12px",
                  width: "100%",
                }}
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => setFilterSearch("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div
            style={{
              overflowY: "auto",
              padding: "6px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.2) transparent",
            }}
          >
            {/* 1. All Cinema / Reset option */}
            <button
              type="button"
              onClick={() => {
                onSelectNiche(null);
                setIsOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                borderRadius: "10px",
                border: "none",
                background: !isFiltered ? "rgba(255, 255, 255, 0.10)" : "transparent",
                color: !isFiltered ? "#ffffff" : "#a3a3a3",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (isFiltered) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              }}
              onMouseLeave={(e) => {
                if (isFiltered) e.currentTarget.style.background = "transparent";
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: !isFiltered ? 700 : 500 }}>
                  All Cinema
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>
                  Show full library
                </div>
              </div>
              {!isFiltered && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#e50914",
                  }}
                >
                  Active
                </span>
              )}
            </button>

            {/* Section Header */}
            <div
              style={{
                padding: "10px 12px 6px 12px",
                fontSize: "10px",
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Cinema Niches ({filteredNiches.length})
            </div>

            {/* 2. Cinema Niches */}
            {filteredNiches.map((cat) => {
              const isSelected = selectedNicheId === cat.id;
              const badge = NICHE_BADGES[cat.id] || "Cinema";

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectNiche(cat);
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "none",
                    background: isSelected ? "rgba(229, 9, 20, 0.16)" : "transparent",
                    color: isSelected ? "#ffffff" : "#e5e5e5",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 500 }}>
                    {cat.name}
                  </span>

                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: isSelected
                        ? "rgba(229, 9, 20, 0.3)"
                        : "rgba(255, 255, 255, 0.08)",
                      color: isSelected ? "#ff4d5a" : "rgba(255, 255, 255, 0.6)",
                      fontWeight: 600,
                    }}
                  >
                    {badge}
                  </span>
                </button>
              );
            })}

            {/* 3. Extra Provider Genres */}
            {filteredGenres.length > 0 && onSelectGenre && (
              <>
                <div
                  style={{
                    padding: "12px 12px 6px 12px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    marginTop: "6px",
                  }}
                >
                  Provider Genres
                </div>
                {filteredGenres.map((g, idx) => (
                  <button
                    key={`${g.filter}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelectGenre(g.filter, g.title);
                      setIsOpen(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "7px 12px",
                      borderRadius: "8px",
                      border: "none",
                      background: "transparent",
                      color: "#a3a3a3",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "12px",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#a3a3a3";
                    }}
                  >
                    <span>{g.title}</span>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
                      Genre
                    </span>
                  </button>
                ))}
              </>
            )}

            {filteredNiches.length === 0 && filteredGenres.length === 0 && (
              <div
                style={{
                  padding: "24px 12px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.4)",
                }}
              >
                No cinema niches found matching "{filterSearch}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
