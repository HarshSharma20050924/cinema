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
    </div>
  );
};
