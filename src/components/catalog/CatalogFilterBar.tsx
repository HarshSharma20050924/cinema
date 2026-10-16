import React from "react";
import { CategoryDropdown } from "./CategoryDropdown";
import { GenreDropdown } from "./GenreDropdown";
import { PlusIcon } from "../../icons";
import type { CreativeCategory } from "./BrowseCategoriesGrid";
import type { CatalogFilter } from "../../types";

interface CatalogFilterBarProps {
  selectedCategoryId: string | null;
  selectedGenreCategory: CreativeCategory | null;
  selectedProviderGenreTitle?: string | null;
  isMergedFilter: boolean;
  extraGenres?: CatalogFilter[];
  onSelectCategory: (category: CreativeCategory | null) => void;
  onSelectGenreCategory: (genre: CreativeCategory | null) => void;
  onSelectProviderGenre?: (filter: string, title: string) => void;
  onToggleMerge: () => void;
  onOpenLetterboxd?: () => void;
  onOpenImdb?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CatalogFilterBar: React.FC<CatalogFilterBarProps> = ({
  selectedCategoryId,
  selectedGenreCategory,
  selectedProviderGenreTitle,
  isMergedFilter,
  extraGenres = [],
  onSelectCategory,
  onSelectGenreCategory,
  onSelectProviderGenre,
  onToggleMerge,
  onOpenLetterboxd,
  onOpenImdb,
  className = "",
  style,
}) => {
  const hasCategory = Boolean(selectedCategoryId);
  const hasGenre = Boolean(selectedGenreCategory || selectedProviderGenreTitle);

  return (
    <div
      className={`catalog-filter-bar ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        ...style,
      }}
    >
      {/* 1. Category Dropdown (Solid Red when active) */}
      <CategoryDropdown
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
      />

      {/* 2. Merge (+) Filter Button */}
      <button
        type="button"
        onClick={onToggleMerge}
        title={
          isMergedFilter
            ? "Merged Filter Active (Click to separate filters)"
            : hasCategory && hasGenre
            ? "Click to merge Category + Genre"
            : "Click + to combine Category and Genre filters"
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isMergedFilter ? "6px" : "0",
          height: "38px",
          padding: isMergedFilter ? "0 14px" : "0 11px",
          borderRadius: "999px",
          background: isMergedFilter
            ? "linear-gradient(135deg, #e50914 0%, #2563eb 100%)"
            : hasCategory || hasGenre
            ? "rgba(25, 25, 25, 0.95)"
            : "rgba(14, 14, 14, 0.90)",
          border: isMergedFilter
            ? "1px solid rgba(255, 255, 255, 0.5)"
            : hasCategory || hasGenre
            ? "1px dashed rgba(255, 255, 255, 0.45)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          color: "#ffffff",
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: isMergedFilter
            ? "0 4px 20px rgba(147, 51, 234, 0.65)"
            : hasCategory || hasGenre
            ? "0 4px 14px rgba(0, 0, 0, 0.6)"
            : "0 4px 14px rgba(0, 0, 0, 0.5)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isMergedFilter) {
            e.currentTarget.style.background = "rgba(45, 45, 45, 0.95)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.6)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isMergedFilter) {
            e.currentTarget.style.background =
              hasCategory || hasGenre ? "rgba(25, 25, 25, 0.95)" : "rgba(14, 14, 14, 0.90)";
            e.currentTarget.style.borderColor =
              hasCategory || hasGenre
                ? "1px dashed rgba(255, 255, 255, 0.45)"
                : "1px solid rgba(255, 255, 255, 0.12)";
          }
        }}
      >
        <PlusIcon
          size={isMergedFilter ? 13 : 15}
          color="#ffffff"
          style={{
            transform: isMergedFilter ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        {isMergedFilter && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Merged
          </span>
        )}
      </button>

      {/* 3. Genre Dropdown (Solid Blue when active) */}
      <GenreDropdown
        selectedGenreCategory={selectedGenreCategory}
        selectedProviderGenreTitle={selectedProviderGenreTitle}
        onSelectGenreCategory={onSelectGenreCategory}
        extraGenres={extraGenres}
        onSelectProviderGenre={onSelectProviderGenre}
      />

      {/* 4. IMDb Brand Discovery Button */}
      {onOpenImdb && (
        <button
          type="button"
          onClick={onOpenImdb}
          title="Explore IMDb Ratings & Discovery"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "38px",
            padding: "0 15px",
            borderRadius: "999px",
            background: "rgba(14, 14, 14, 0.90)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            fontSize: "12.5px",
            fontWeight: 800,
            cursor: "pointer",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f5c518";
            e.currentTarget.style.borderColor = "#f5c518";
            e.currentTarget.style.color = "#000000";
            e.currentTarget.style.boxShadow = "0 4px 18px rgba(245, 197, 24, 0.6)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(14, 14, 14, 0.90)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.5)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span
            style={{
              fontWeight: 900,
              fontSize: "12px",
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            IMDb
          </span>
        </button>
      )}

      {/* 5. Letterboxd Brand Discovery Button */}
      {onOpenLetterboxd && (
        <button
          type="button"
          onClick={onOpenLetterboxd}
          title="Explore Letterboxd Films & Ratings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            height: "38px",
            padding: "0 14px",
            borderRadius: "999px",
            background: "rgba(14, 14, 14, 0.90)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#00e054";
            e.currentTarget.style.borderColor = "#00e054";
            e.currentTarget.style.color = "#000000";
            e.currentTarget.style.boxShadow = "0 4px 18px rgba(0, 224, 84, 0.55)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(14, 14, 14, 0.90)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.5)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* Authentic Letterboxd 3-circle dots */}
          <div style={{ display: "flex", alignItems: "center", gap: "2.5px" }}>
            <span style={{ width: "6.5px", height: "6.5px", borderRadius: "50%", background: "#ff8000" }} />
            <span style={{ width: "6.5px", height: "6.5px", borderRadius: "50%", background: "#00e054" }} />
            <span style={{ width: "6.5px", height: "6.5px", borderRadius: "50%", background: "#40bcf4" }} />
          </div>
          <span>Letterboxd</span>
        </button>
      )}
    </div>
  );
};
