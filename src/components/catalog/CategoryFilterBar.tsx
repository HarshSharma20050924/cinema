import React, { useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "../../icons";
import type { CatalogFilter } from "../../types";

interface CategoryFilterBarProps {
  genres: CatalogFilter[];
  activeFilter: string;
  onSelect: (filter: string, title: string) => void;
  title?: string;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  genres,
  activeFilter,
  onSelect,
  title = "Genres",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!genres || genres.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -280 : 280;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Build clean genre list starting with "All Genres"
  const allOptions: CatalogFilter[] = [
    { title: "All Genres", filter: "" },
    ...genres,
  ];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        marginBottom: "22px",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "12px",
        padding: "6px 10px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginRight: "10px",
          color: "#94a3b8",
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span>🎬</span>
        <span>{title}</span>
      </div>

      {/* Left Scroll Button */}
      <button
        onClick={() => handleScroll("left")}
        style={{
          flexShrink: 0,
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.08)",
          border: "none",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "6px",
          cursor: "pointer",
        }}
        title="Scroll left"
      >
        <ChevronLeftIcon size={12} />
      </button>

      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          overflowX: "auto",
          scrollbarWidth: "none",
          scrollBehavior: "smooth",
          padding: "2px 0",
          width: "100%",
        }}
      >
        {allOptions.map((item, idx) => {
          const isActive =
            activeFilter === item.filter ||
            (!activeFilter && item.filter === "");

          return (
            <button
              key={`${item.filter}-${idx}`}
              onClick={() => onSelect(item.filter, item.title)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.18s ease",
                border: isActive ? "1px solid rgba(229, 9, 20, 0.6)" : "1px solid transparent",
                background: isActive ? "rgba(229, 9, 20, 0.9)" : "rgba(255, 255, 255, 0.05)",
                color: isActive ? "#ffffff" : "#cbd5e1",
                boxShadow: isActive ? "0 2px 10px rgba(229, 9, 20, 0.35)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.color = "#cbd5e1";
                }
              }}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Right Scroll Button */}
      <button
        onClick={() => handleScroll("right")}
        style={{
          flexShrink: 0,
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.08)",
          border: "none",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "6px",
          cursor: "pointer",
        }}
        title="Scroll right"
      >
        <ChevronRightIcon size={12} />
      </button>
    </div>
  );
};
