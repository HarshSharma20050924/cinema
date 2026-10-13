import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, SearchIcon, XIcon, FilmIcon } from "../../icons";
import { CREATIVE_INDUSTRIES, type CreativeCategory } from "./BrowseCategoriesGrid";

interface CategoryDropdownProps {
  selectedCategoryId?: string | null;
  onSelectCategory: (category: CreativeCategory | null) => void;
  className?: string;
}

const CATEGORY_BADGES: Record<string, string> = {
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
};

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  selectedCategoryId,
  onSelectCategory,
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

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeCategory = CREATIVE_INDUSTRIES.find((c) => c.id === selectedCategoryId);

  const searchLower = filterSearch.trim().toLowerCase();
  const filteredCategories = CREATIVE_INDUSTRIES.filter((c) => {
    if (!searchLower) return true;
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.countBadge.toLowerCase().includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower)
    );
  });

  const displayTitle = activeCategory ? activeCategory.name : "Categories";
  const isFiltered = Boolean(activeCategory);

  return (
    <div
      ref={dropdownRef}
      className={`category-dropdown-wrapper ${className}`}
      style={{
        position: "relative",
        display: "inline-block",
        zIndex: isOpen ? 50 : 10,
        userSelect: "none",
      }}
    >
      {/* Trigger Button - Clean pure black pill */}
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
            ? "#e50914"
            : isOpen
            ? "rgba(255, 255, 255, 0.10)"
            : "rgba(14, 14, 14, 0.90)",
          border: isFiltered
            ? "1px solid #ff2b38"
            : isOpen
            ? "1px solid rgba(255, 255, 255, 0.25)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          color: "#ffffff",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: isFiltered
            ? "0 4px 18px rgba(229, 9, 20, 0.55)"
            : "0 4px 14px rgba(0, 0, 0, 0.5)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <FilmIcon size={14} color="#ffffff" />

        <span style={{ color: "#ffffff", fontWeight: isFiltered ? 800 : 600 }}>
          {displayTitle}
        </span>

        {/* Clear filter button if filtered */}
        {isFiltered && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory(null);
              setIsOpen(false);
            }}
            title="Reset"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
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
            <XIcon size={10} color="#ffffff" />
          </span>
        )}

        <div
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            display: "flex",
            alignItems: "center",
            color: isFiltered ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
          }}
        >
          <ChevronDownIcon size={12} />
        </div>
      </button>

      {/* Floating Dropdown Menu / Mobile Bottom Sheet */}
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          {isMobile && (
            <div
              onClick={() => setIsOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                zIndex: 9998,
              }}
            />
          )}

          <div
            style={{
              position: isMobile ? "fixed" : "absolute",
              top: isMobile ? "auto" : "calc(100% + 8px)",
              bottom: isMobile ? "76px" : "auto",
              left: isMobile ? "12px" : 0,
              right: isMobile ? "12px" : "auto",
              maxWidth: isMobile ? "420px" : "none",
              margin: isMobile ? "0 auto" : "0",
              width: isMobile ? "auto" : "290px",
              maxHeight: isMobile ? "68vh" : "420px",
              background: "#0a0a0a",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: isMobile ? "22px" : "18px",
              boxShadow: "0 24px 70px rgba(0, 0, 0, 0.98)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: isMobile ? 9999 : 100,
              animation: isMobile ? "slideUpModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)" : "fadeIn 0.15s ease-out",
            }}
          >
            {/* Header with Title and Close (✕) Button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "#080808",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FilmIcon size={16} color="#e50914" />
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
                  Categories
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "rgba(255, 255, 255, 0.5)",
                    fontWeight: 600,
                  }}
                >
                  ({CREATIVE_INDUSTRIES.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Search Box inside dropdown */}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "#000000",
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
              <SearchIcon size={13} color="rgba(255, 255, 255, 0.4)" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search category..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#ffffff",
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
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List of Categories */}
          <div
            style={{
              padding: "6px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {/* "All Categories" option */}
            <button
              type="button"
              onClick={() => {
                onSelectCategory(null);
                setIsOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "10px",
                background: !selectedCategoryId
                  ? "rgba(255, 255, 255, 0.12)"
                  : "transparent",
                color: !selectedCategoryId ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                fontSize: "13px",
                fontWeight: !selectedCategoryId ? 700 : 500,
                textAlign: "left",
                cursor: "pointer",
                border: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedCategoryId) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              }}
              onMouseLeave={(e) => {
                if (selectedCategoryId) e.currentTarget.style.background = "transparent";
              }}
            >
              <span>All Categories</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                All
              </span>
            </button>

            {filteredCategories.map((c) => {
              const isSelected = selectedCategoryId === c.id;
              const badge = CATEGORY_BADGES[c.id] || c.countBadge;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(c);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: isSelected
                      ? "#e50914"
                      : "transparent",
                    color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
                    fontSize: "13px",
                    fontWeight: isSelected ? 700 : 500,
                    textAlign: "left",
                    cursor: "pointer",
                    border: isSelected ? "1px solid #ff2b38" : "none",
                    boxShadow: isSelected ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isSelected ? "#ffffff" : (c.accentColor || "#e50914"),
                        display: "inline-block",
                      }}
                    />
                    {c.name}
                  </span>

                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 7px",
                      borderRadius: "999px",
                      background: isSelected
                        ? "rgba(255, 255, 255, 0.25)"
                        : "rgba(255, 255, 255, 0.08)",
                      color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                      fontWeight: 600,
                    }}
                  >
                    {badge}
                  </span>
                </button>
              );
            })}

            {filteredCategories.length === 0 && (
              <div
                style={{
                  padding: "20px 12px",
                  textAlign: "center",
                  color: "rgba(255, 255, 255, 0.4)",
                  fontSize: "12px",
                }}
              >
                No categories found
              </div>
            )}
          </div>
        </div>
      </>
    )}
  </div>
  );
};
