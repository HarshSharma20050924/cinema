import React, { useState, useEffect, useRef } from "react";
import { FilmIcon, SearchIcon, ChevronDownIcon, XIcon } from "../../icons";
import type { CategoryFilter } from "./types";

export interface RankingsCategoryDropdownProps {
  categories: CategoryFilter[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  prefix?: string;
  placeholder?: string;
}

export function RankingsCategoryDropdown({
  categories,
  selectedCategory,
  onSelectCategory,
  prefix = "",
  placeholder = "Find category...",
}: RankingsCategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const active = categories.find((c) => c.id === selectedCategory) || categories[0];
  const isCustom = active && active.id !== categories[0]?.id;

  const displayLabel = isCustom
    ? (prefix ? `${prefix}: ${active?.label}` : active?.label)
    : (prefix && active?.id === "all" ? `${active?.label || prefix}` : active?.label || prefix || "Category");

  const filtered = categories.filter((c) =>
    c.label.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative", zIndex: open ? 50 : 10 }}>
      {/* Trigger Button - Cinema CategoryDropdown style */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          height: "36px",
          padding: "0 15px",
          borderRadius: "999px",
          background: isCustom
            ? "#e50914"
            : open
            ? "rgba(255, 255, 255, 0.12)"
            : "rgba(14, 14, 14, 0.90)",
          border: isCustom
            ? "1px solid #ff2b38"
            : open
            ? "1px solid rgba(255, 255, 255, 0.28)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          color: "#ffffff",
          fontSize: "12.5px",
          fontWeight: isCustom ? 800 : 700,
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: isCustom
            ? "0 4px 18px rgba(229, 9, 20, 0.55)"
            : "0 4px 14px rgba(0, 0, 0, 0.5)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        <FilmIcon size={13} color="#ffffff" />
        <span>{displayLabel}</span>

        {isCustom && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory(categories[0].id);
              setOpen(false);
            }}
            title="Reset"
            style={{
              background: "rgba(0, 0, 0, 0.35)",
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
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <ChevronDownIcon size={11} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 7px)",
            left: 0,
            minWidth: "210px",
            background: "#0a0a0c",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "14px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.95)",
            overflow: "hidden",
            zIndex: 100,
            animation: "fadeIn 0.12s ease-out",
          }}
        >
          {/* Quick search inside dropdown */}
          <div
            style={{
              padding: "8px 8px 6px 8px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "9px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.35)",
                  display: "flex",
                  pointerEvents: "none",
                }}
              >
                <SearchIcon size={11} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: "8px",
                  padding: "6px 8px 6px 26px",
                  color: "#fff",
                  fontSize: "11.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          <div style={{ padding: "5px", maxHeight: "280px", overflowY: "auto" }}>
            {filtered.map((cat) => {
              const isSelected = cat.id === selectedCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.id);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "9px",
                    background: isSelected ? "#e50914" : "transparent",
                    color: isSelected ? "#ffffff" : "rgba(255,255,255,0.85)",
                    fontSize: "12.5px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    border: "none",
                    textAlign: "left",
                    transition: "background 0.12s ease",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>{cat.label}</span>
                  {isSelected && (
                    <span style={{ fontSize: "11px", fontWeight: 900 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
