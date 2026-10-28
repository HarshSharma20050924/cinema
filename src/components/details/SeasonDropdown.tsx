import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, XIcon, FilmIcon } from "../../icons";
import { getSeasonDisplayInfo } from "../../utils/seasonUtils";

export interface SeasonDropdownProps {
  linkList: any[];
  validSeasonIdx: number;
  onSelectSeasonIdx: (idx: number) => void;
  activeSeason: any;
}

const getDubColor = (dub: string) => {
  const d = dub.toLowerCase();
  if (d.includes("hindi")) return "#e50914"; // Solid Red
  if (d.includes("original")) return "#0284c7"; // Solid Blue
  if (d.includes("english")) return "#8b5cf6"; // Solid Purple
  if (d.includes("jap") || d.includes("anime")) return "#ec4899"; // Solid Pink
  if (d.includes("tamil") || d.includes("telugu")) return "#f59e0b"; // Solid Amber
  return "#10b981"; // Solid Emerald
};

export const SeasonDropdown: React.FC<SeasonDropdownProps> = ({
  linkList,
  validSeasonIdx,
  onSelectSeasonIdx,
  activeSeason,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!linkList || linkList.length <= 1) return null;

  const currentInfo = getSeasonDisplayInfo(activeSeason, validSeasonIdx);
  const currentDubColor = currentInfo.dub ? getDubColor(currentInfo.dub) : null;

  // Extract distinct dubs
  const distinctDubs = Array.from(
    new Set(
      linkList
        .map((s, idx) => getSeasonDisplayInfo(s, idx).dub)
        .filter(Boolean)
    )
  );
  const hasMultipleDubs = distinctDubs.length > 1;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        zIndex: isOpen ? 60 : 10,
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "#94a3b8",
          marginRight: "6px",
        }}
      >
        Season:
      </span>

      {/* Trigger Button - Matches CategoryDropdown & GenreDropdown pure black pill style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          height: "36px",
          padding: "0 14px",
          borderRadius: "999px",
          background: isOpen ? "rgba(255, 255, 255, 0.14)" : "rgba(14, 16, 22, 0.78)",
          border: isOpen
            ? "1px solid rgba(255, 255, 255, 0.28)"
            : "1px solid rgba(255, 255, 255, 0.16)",
          color: "#ffffff",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "rgba(14, 16, 22, 0.78)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
          }
        }}
      >
        {/* Solid Color Badge for Dub */}
        {currentInfo.dub && currentDubColor && (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "5px",
              background: currentDubColor,
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {currentInfo.dub}
          </span>
        )}

        <span
          style={{
            color: "#ffffff",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {currentInfo.seasonTitle}
        </span>

        {currentInfo.epsCount > 0 && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.55)",
              whiteSpace: "nowrap",
            }}
          >
            ({currentInfo.epsCount} Eps)
          </span>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginLeft: "2px",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <ChevronDownIcon size={14} color="#94a3b8" />
        </div>
      </button>

      {/* Floating Dropdown Menu - Matches CategoryDropdown & GenreDropdown modal card */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "300px",
            maxHeight: "380px",
            background: "rgba(14, 17, 24, 0.82)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "18px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 100,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {/* Header with Title and Close button */}
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FilmIcon size={16} color="#e50914" />
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
                Select Season
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.5)",
                  fontWeight: 600,
                }}
              >
                ({linkList.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Close"
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }}
            >
              <XIcon size={12} />
            </button>
          </div>

          {/* List of Seasons */}
          <div
            style={{
              padding: "6px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {hasMultipleDubs ? (
              distinctDubs.map((dubName) => {
                const dubColor = getDubColor(dubName);
                const itemsForDub = linkList
                  .map((season, sIdx) => ({ season, sIdx, info: getSeasonDisplayInfo(season, sIdx) }))
                  .filter(({ info }) => info.dub.toLowerCase() === dubName.toLowerCase());

                return (
                  <div key={dubName} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {/* Dub Group Header */}
                    <div
                      style={{
                        padding: "8px 12px 4px",
                        fontSize: "11px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        marginBottom: "3px",
                        marginTop: "2px",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: dubColor,
                            display: "inline-block",
                          }}
                        />
                        {dubName}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "rgba(255, 255, 255, 0.4)",
                          textTransform: "none",
                          fontWeight: 600,
                        }}
                      >
                        {itemsForDub.length} {itemsForDub.length === 1 ? "Season" : "Seasons"}
                      </span>
                    </div>

                    {/* Season Items - Matches CategoryDropdown solid on-select style */}
                    {itemsForDub.map(({ sIdx, info }) => {
                      const isSelected = sIdx === validSeasonIdx;
                      return (
                        <button
                          key={sIdx}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            onSelectSeasonIdx(sIdx);
                            setIsOpen(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            background: isSelected ? "#e50914" : "transparent",
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
                            if (!isSelected) {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                              e.currentTarget.style.color = "#ffffff";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                            }
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: isSelected ? "#ffffff" : dubColor,
                                display: "inline-block",
                              }}
                            />
                            {info.seasonTitle}
                          </span>

                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 7px",
                              borderRadius: "999px",
                              background: isSelected ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.08)",
                              color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                              fontWeight: isSelected ? 700 : 500,
                            }}
                          >
                            {info.epsCount} Eps
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              linkList.map((season, sIdx) => {
                const info = getSeasonDisplayInfo(season, sIdx);
                const isSelected = sIdx === validSeasonIdx;
                const dubColor = info.dub ? getDubColor(info.dub) : "#e50914";

                return (
                  <button
                    key={sIdx}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectSeasonIdx(sIdx);
                      setIsOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: isSelected ? "#e50914" : "transparent",
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
                      if (!isSelected) {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                        e.currentTarget.style.color = "#ffffff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                      }
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: isSelected ? "#ffffff" : dubColor,
                          display: "inline-block",
                        }}
                      />
                      {info.seasonTitle}
                    </span>

                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 7px",
                        borderRadius: "999px",
                        background: isSelected ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.08)",
                        color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      {info.epsCount} Eps
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
