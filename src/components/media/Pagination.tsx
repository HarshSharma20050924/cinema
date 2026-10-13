import React, { useState } from "react";

export interface PaginationProps {
  page: number;
  totalPages?: number;
  hasMore?: boolean;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages = 94,
  onPageChange,
}) => {
  const [jumpInput, setJumpInput] = useState<string>("");
  const effectiveTotal = Math.max(totalPages, page);

  // Generate page items e.g. [1, 2, 3, "...", 94]
  const getPageItems = (): (number | "...")[] => {
    if (effectiveTotal <= 6) {
      return Array.from({ length: effectiveTotal }, (_, i) => i + 1);
    }
    if (page <= 3) {
      return [1, 2, 3, "...", effectiveTotal];
    }
    if (page >= effectiveTotal - 2) {
      return [1, "...", effectiveTotal - 2, effectiveTotal - 1, effectiveTotal];
    }
    return [1, "...", page - 1, page, page + 1, "...", effectiveTotal];
  };

  const handleJump = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= effectiveTotal) {
      onPageChange(parsed);
      setJumpInput("");
    }
  };

  const pageItems = getPageItems();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        marginTop: "44px",
        paddingBottom: "36px",
      }}
    >
      {/* 1. TOTAL PAGES & CURRENT POSITION BADGE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
          color: "rgba(255, 255, 255, 0.65)",
          fontWeight: 600,
        }}
      >
        <span>
          Page <strong style={{ color: "#ffffff" }}>{page}</strong> of{" "}
          <strong style={{ color: "#ffffff" }}>{effectiveTotal}</strong>
        </span>
        <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "999px",
            background: "rgba(229, 9, 20, 0.12)",
            color: "#ff4d5a",
            fontSize: "12px",
            fontWeight: 700,
            border: "1px solid rgba(229, 9, 20, 0.25)",
          }}
        >
          {effectiveTotal} Total Pages
        </span>
      </div>

      {/* 2. NUMBERED PAGINATION STRIP (matching user reference: 1 | 2 | 3 | ... | 94 | Next >) */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "stretch",
          borderRadius: "6px",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          background: "#0c0d10",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.75)",
        }}
      >
        {/* Previous Button (if page > 1) */}
        {page > 1 && (
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            style={{
              padding: "9px 16px",
              background: "transparent",
              color: "#cbd5e1",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              borderRight: "1px solid rgba(255, 255, 255, 0.14)",
              transition: "all 0.15s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#cbd5e1";
            }}
          >
            &lt; Prev
          </button>
        )}

        {/* Number Buttons + Ellipsis */}
        {pageItems.map((item, idx) => {
          if (item === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  minWidth: "42px",
                  padding: "9px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255, 255, 255, 0.4)",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRight:
                    idx < pageItems.length - 1 || page < effectiveTotal
                      ? "1px solid rgba(255, 255, 255, 0.14)"
                      : "none",
                  userSelect: "none",
                }}
              >
                ...
              </span>
            );
          }

          const isActive = item === page;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              style={{
                minWidth: "44px",
                padding: "9px 14px",
                background: isActive ? "#e50914" : "transparent",
                color: isActive ? "#ffffff" : "#cbd5e1",
                fontSize: "13px",
                fontWeight: isActive ? 800 : 600,
                cursor: isActive ? "default" : "pointer",
                border: "none",
                borderRight:
                  idx < pageItems.length - 1 || page < effectiveTotal
                    ? "1px solid rgba(255, 255, 255, 0.14)"
                    : "none",
                boxShadow: isActive ? "inset 0 0 10px rgba(0, 0, 0, 0.25)" : "none",
                transition: "all 0.15s ease",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#cbd5e1";
                }
              }}
            >
              {item}
            </button>
          );
        })}

        {/* Next > Button */}
        {page < effectiveTotal && (
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            style={{
              padding: "9px 18px",
              background: "transparent",
              color: "#cbd5e1",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              transition: "all 0.15s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#cbd5e1";
            }}
          >
            Next &gt;
          </button>
        )}
      </div>

      {/* 3. JUMP TO PAGE FORM */}
      <form
        onSubmit={handleJump}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12.5px",
          color: "rgba(255, 255, 255, 0.6)",
        }}
      >
        <span>Jump to page:</span>
        <input
          type="number"
          min={1}
          max={effectiveTotal}
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          placeholder={String(page)}
          style={{
            width: "60px",
            padding: "5px 8px",
            borderRadius: "6px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            color: "#ffffff",
            fontSize: "12.5px",
            fontWeight: 700,
            textAlign: "center",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#e50914";
            e.currentTarget.style.boxShadow = "0 0 8px rgba(229, 9, 20, 0.4)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          type="submit"
          disabled={!jumpInput.trim()}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            background: jumpInput.trim() ? "#e50914" : "rgba(255, 255, 255, 0.06)",
            color: jumpInput.trim() ? "#ffffff" : "rgba(255, 255, 255, 0.3)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: jumpInput.trim() ? "pointer" : "default",
            border: "none",
            transition: "all 0.15s ease",
          }}
        >
          Go
        </button>
      </form>
    </div>
  );
};
