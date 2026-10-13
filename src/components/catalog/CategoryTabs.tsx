import React from "react";
import type { CatalogFilter } from "../../types";

interface CategoryTabsProps {
  filters: CatalogFilter[];
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  filters,
  activeFilter,
  onSelectFilter,
}) => {
  if (filters.length === 0) return null;

  return (
    <div
      style={{
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        overflowX: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(10, 14, 22, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          minWidth: "min-content",
        }}
      >
        {filters.map((cat) => {
          const isActive = activeFilter === cat.filter;
          return (
            <button
              key={cat.filter}
              onClick={() => onSelectFilter(cat.filter)}
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 18px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                background: isActive
                  ? "linear-gradient(135deg, #e50914 0%, #ff2e47 100%)"
                  : "rgba(255, 255, 255, 0.05)",
                color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.72)",
                border: isActive
                  ? "1px solid rgba(255, 120, 130, 0.6)"
                  : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: isActive
                  ? "0 4px 18px rgba(229, 9, 20, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)"
                  : "inset 0 1px 1px rgba(255, 255, 255, 0.03)",
                transform: isActive ? "scale(1.02)" : "scale(1)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.72)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }
              }}
            >
              {isActive && (
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    boxShadow: "0 0 6px #ffffff",
                  }}
                />
              )}
              <span>{cat.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
