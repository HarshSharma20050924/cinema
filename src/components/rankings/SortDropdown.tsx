import React, { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "../../icons";
import { IMDB_SORT_OPTIONS } from "./constants";
import type { SortKey } from "./types";

export interface SortDropdownProps {
  value: SortKey;
  onChange: (v: SortKey) => void;
  options?: { value: string; label: string }[];
}

export function SortDropdown({
  value,
  onChange,
  options = IMDB_SORT_OPTIONS,
}: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const safeOptions = options && options.length > 0 ? options : IMDB_SORT_OPTIONS;
  const current = safeOptions.find((s) => s.value === value) || safeOptions[0] || { value, label: value };

  return (
    <div ref={ref} style={{ position: "relative", zIndex: open ? 50 : 10 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          height: "36px",
          padding: "0 14px",
          borderRadius: "999px",
          background: open ? "rgba(255,255,255,0.12)" : "rgba(14,14,14,0.9)",
          border: `1px solid ${open ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)"}`,
          color: "#ffffff",
          fontSize: "12.5px",
          fontWeight: 600,
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          transition: "all 0.18s ease",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        <span>{current.label}</span>
        <div
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <ChevronDownIcon size={11} />
        </div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 7px)",
            right: 0,
            minWidth: "170px",
            background: "#0a0a0c",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "14px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.95)",
            overflow: "hidden",
            zIndex: 100,
            animation: "fadeIn 0.12s ease-out",
          }}
        >
          <div style={{ padding: "5px" }}>
            {safeOptions.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "9px",
                    background: active ? "#e50914" : "transparent",
                    color: active ? "#ffffff" : "rgba(255,255,255,0.85)",
                    fontSize: "12.5px",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    border: "none",
                    textAlign: "left",
                    transition: "background 0.12s ease",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
