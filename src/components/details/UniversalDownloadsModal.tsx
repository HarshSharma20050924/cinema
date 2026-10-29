import React, { useState, useMemo } from "react";
import { DownloadIcon, PlayIcon, CopyIcon, CheckIcon, XIcon } from "../../icons";
import type { NormalizedServerLink } from "../../utils/universalSourcesEngine";

export interface UniversalDownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isSeries?: boolean;
  isAnime?: boolean;
  seasonsCount?: number;
  episodesCount?: number;
  serverLinks: NormalizedServerLink[];
  loading?: boolean;
  mode?: "download" | "stream";
  onPlayLink?: (link: NormalizedServerLink) => void;
  onDownloadLink?: (link: NormalizedServerLink) => void;
}

export const UniversalDownloadsModal: React.FC<UniversalDownloadsModalProps> = ({
  isOpen,
  onClose,
  title,
  isSeries = false,
  isAnime = false,
  seasonsCount = 1,
  episodesCount = 12,
  serverLinks,
  loading = false,
  mode = "download",
  onPlayLink,
  onDownloadLink,
}) => {
  const [selectedQuality, setSelectedQuality] = useState<string>("All");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [episodeDropdownOpen, setEpisodeDropdownOpen] = useState(false);

  // Available audio languages derived strictly from real server links
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    serverLinks.forEach((l) => {
      l.languages?.forEach((lang) => {
        if (lang && lang.toLowerCase() !== "original") {
          set.add(lang);
        }
      });
    });
    if (set.size === 0) return [];
    const priorityOrder = [
      "Dual Audio",
      "Multi Audio",
      "Hindi",
      "English",
      "Tamil",
      "Telugu",
      "Dubbed",
    ];
    const result = ["All"];
    priorityOrder.forEach((p) => {
      if (set.has(p)) result.push(p);
    });
    set.forEach((s) => {
      if (!result.includes(s)) result.push(s);
    });
    return result;
  }, [serverLinks]);

  // Available qualities derived strictly from real server links
  const availableQualities = useMemo(() => {
    const set = new Set<string>();
    serverLinks.forEach((l) => {
      if (l.quality) set.add(l.quality);
    });
    if (set.size === 0) return ["All", "4K", "1080p", "720p", "480p"];
    const order = ["4K", "1080p", "720p", "480p", "HD"];
    const result = ["All"];
    order.forEach((q) => {
      if (set.has(q)) result.push(q);
    });
    set.forEach((q) => {
      if (!result.includes(q)) result.push(q);
    });
    return result;
  }, [serverLinks]);

  // Reset chunked pagination whenever filters change
  React.useEffect(() => {
    setVisibleCount(6);
  }, [selectedQuality, selectedLanguage, selectedSeason, selectedEpisode]);

  // Filter & prioritize links
  const filteredLinks = useMemo(() => {
    let list = serverLinks;

    // Filter by quality
    if (selectedQuality !== "All") {
      list = list.filter(
        (l) => l.quality.toLowerCase() === selectedQuality.toLowerCase()
      );
    }

    // Filter by language
    if (selectedLanguage !== "All") {
      list = list.filter((l) => {
        if (!l.languages || l.languages.length === 0) {
          return false;
        }
        return l.languages.some(
          (lang) => lang.toLowerCase() === selectedLanguage.toLowerCase()
        );
      });
    }

    // Sort: If stream mode, prioritize MovieBox & direct streamable servers
    return [...list].sort((a, b) => {
      if (mode === "stream") {
        const aMb = a.isMovieBox || a.provider.toLowerCase().includes("moviebox") ? 1 : 0;
        const bMb = b.isMovieBox || b.provider.toLowerCase().includes("moviebox") ? 1 : 0;
        if (aMb !== bMb) return bMb - aMb;
        const aDir = a.isDirect ? 1 : 0;
        const bDir = b.isDirect ? 1 : 0;
        if (aDir !== bDir) return bDir - aDir;
      }
      return 0;
    });
  }, [serverLinks, selectedQuality, selectedLanguage, mode]);

  const visibleLinks = useMemo(() => {
    return filteredLinks.slice(0, visibleCount);
  }, [filteredLinks, visibleCount]);

  if (!isOpen) return null;

  const handleCopy = (link: NormalizedServerLink) => {
    try {
      navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const isTvOrAnime = isSeries || isAnime;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "rgba(14, 16, 22, 0.60)",
          backdropFilter: "blur(28px) saturate(190%)",
          WebkitBackdropFilter: "blur(28px) saturate(190%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "22px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.60), inset 0 1px 0 rgba(255, 255, 255, 0.10)",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          position: "relative",
          animation: "scaleInModal 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "85vh",
        }}
      >
        {/* Top Header Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h2
            style={{
              fontSize: "19px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            {mode === "stream" ? "Stream" : "Downloads for"} {title}
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Dynamic Quality Filter Tabs for Movies */}
            {!isTvOrAnime && availableQualities.length > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "999px",
                  padding: "3px",
                  border: "1px solid rgba(255, 255, 255, 0.10)",
                }}
              >
                {availableQualities.map((q) => {
                  const active = selectedQuality === q;
                  return (
                    <button
                      key={q}
                      onClick={() => setSelectedQuality(q)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: "999px",
                        background: active ? "#e50914" : "transparent",
                        color: active ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: active ? "1px solid #e50914" : "1px solid transparent",
                        boxShadow: active ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "rgba(255, 255, 255, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
              }}
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>

        {/* Audio Language Filter Row - strictly displayed if real languages exist */}
        {availableLanguages.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              paddingBottom: "4px",
            }}
          >
            <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", fontWeight: 600, marginRight: "2px" }}>
              Audio:
            </span>
            {availableLanguages.map((lang) => {
              const active = selectedLanguage === lang;
              return (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "999px",
                    background: active ? "#e50914" : "rgba(255, 255, 255, 0.07)",
                    color: active ? "#ffffff" : "rgba(255, 255, 255, 0.72)",
                    border: active ? "1px solid #e50914" : "1px solid rgba(255, 255, 255, 0.11)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: active ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                      e.currentTarget.style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.72)";
                    }
                  }}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        )}

        {/* TV Series / Anime Season & Episode Dropdowns */}
        {isTvOrAnime && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Season Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setSeasonDropdownOpen(!seasonDropdownOpen);
                  setEpisodeDropdownOpen(false);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <span>Season {selectedSeason}</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>
                  {seasonDropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {seasonDropdownOpen && (
                <div
                  className="cinema-no-scrollbar"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 130,
                    minWidth: "150px",
                    maxHeight: "260px",
                    overflowY: "auto",
                    background: "rgba(14, 16, 22, 0.78)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    borderRadius: "14px",
                    padding: "4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    boxShadow: "0 18px 45px rgba(0, 0, 0, 0.8)",
                  }}
                >
                  {Array.from({ length: Math.max(seasonsCount || 1, 1) }).map((_, i) => {
                    const sNum = i + 1;
                    const isSelected = selectedSeason === sNum;
                    return (
                      <button
                        key={sNum}
                        onClick={() => {
                          setSelectedSeason(sNum);
                          setSeasonDropdownOpen(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: isSelected ? "rgba(255, 255, 255, 0.12)" : "transparent",
                          border: "none",
                          color: "#ffffff",
                          fontSize: "13px",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Season {sNum}</span>
                        {isSelected && <CheckIcon size={13} color="#ffffff" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Episode Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setEpisodeDropdownOpen(!episodeDropdownOpen);
                  setSeasonDropdownOpen(false);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <span>Episode {selectedEpisode}</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>
                  {episodeDropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {episodeDropdownOpen && (
                <div
                  className="cinema-no-scrollbar"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 130,
                    minWidth: "150px",
                    maxHeight: "260px",
                    overflowY: "auto",
                    background: "rgba(14, 16, 22, 0.78)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    borderRadius: "14px",
                    padding: "4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    boxShadow: "0 18px 45px rgba(0, 0, 0, 0.8)",
                  }}
                >
                  {Array.from({ length: Math.max(episodesCount || 12, 1) }).map((_, i) => {
                    const epNum = i + 1;
                    const isSelected = selectedEpisode === epNum;
                    return (
                      <button
                        key={epNum}
                        onClick={() => {
                          setSelectedEpisode(epNum);
                          setEpisodeDropdownOpen(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: isSelected ? "rgba(255, 255, 255, 0.12)" : "transparent",
                          border: "none",
                          color: "#ffffff",
                          fontSize: "13px",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Episode {epNum}</span>
                        {isSelected && <CheckIcon size={13} color="#ffffff" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Found links count */}
        <div style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.45)", fontWeight: 500 }}>
          {loading
            ? "Scanning high-speed servers across extensions..."
            : `Showing ${visibleLinks.length} of ${filteredLinks.length} ${filteredLinks.length === 1 ? "link" : "links"}`}
        </div>

        {/* Server Cards List */}
        <div
          className="cinema-no-scrollbar"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            overflowY: "auto",
            maxHeight: "440px",
            paddingRight: "2px",
          }}
        >
          {loading && filteredLinks.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px 0" }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "72px",
                    borderRadius: "14px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 18px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "65%" }}>
                    <div style={{ height: "14px", width: "70%", borderRadius: "6px", background: "rgba(255, 255, 255, 0.08)" }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ height: "18px", width: "45px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.05)" }} />
                      <div style={{ height: "18px", width: "55px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.05)" }} />
                      <div style={{ height: "18px", width: "65px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.05)" }} />
                    </div>
                  </div>
                  <div style={{ height: "36px", width: "108px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.08)" }} />
                  {/* Shimmer sweep animation */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)",
                      animation: "cinemaSkeletonShimmer 1.5s infinite ease-in-out",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : filteredLinks.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "13.5px",
              }}
            >
              No download servers available for this selection.
            </div>
          ) : (
            <>
              {visibleLinks.map((link, idx) => {
                const isCopied = copiedId === link.id;
                const isMovieBox = link.isMovieBox || link.provider.toLowerCase().includes("moviebox");
                return (
                  <div
                    key={link.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                      border: "1px solid rgba(255, 255, 255, 0.07)",
                      borderRadius: "14px",
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.07)";
                    }}
                  >
                    {/* Left: Server details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: "14px", color: "#ffffff" }}>
                          {link.serverName || `Server ${idx + 1}`}
                        </span>
                        <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "12px" }}>•</span>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: "rgba(255, 255, 255, 0.10)",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: "#ffffff",
                          }}
                        >
                          {link.quality}
                        </span>
                        {link.size && (
                          <>
                            <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "12px" }}>•</span>
                            <span style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.75)", fontWeight: 600 }}>
                              {link.size}
                            </span>
                          </>
                        )}
                        {/* Audio Language Badges */}
                        {link.languages && link.languages.length > 0 && link.languages.map((lang) => (
                          <span
                            key={lang}
                            style={{
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "rgba(255, 255, 255, 0.08)",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "rgba(255, 255, 255, 0.85)",
                            }}
                          >
                            {lang}
                          </span>
                        ))}
                      </div>

                      {/* Subtitle / Codec line */}
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "rgba(255, 255, 255, 0.45)",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {link.codec || "WEB-DL HEVC DDP5.1"}
                      </div>
                    </div>

                    {/* Right: Actions (Copy & Download/Play) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(link)}
                        title={isCopied ? "Copied!" : "Copy link"}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: isCopied ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: isCopied ? "#4ade80" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isCopied) e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isCopied) e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                        }}
                      >
                        {isCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                      </button>

                      {/* Primary Action Button: White pill for Download, Solid Red for Play */}
                      {mode === "stream" ? (
                        <button
                          onClick={() => onPlayLink?.(link)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 18px",
                            borderRadius: "999px",
                            background: "#e50914",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(229, 9, 20, 0.4)",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f40612";
                            e.currentTarget.style.transform = "scale(1.02)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#e50914";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          <PlayIcon size={13} fill="#ffffff" color="#ffffff" />
                          <span>Play</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onDownloadLink?.(link)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 18px",
                            borderRadius: "999px",
                            background: "#ffffff",
                            color: "#000000",
                            fontSize: "13px",
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(255, 255, 255, 0.15)",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f1f1f1";
                            e.currentTarget.style.transform = "scale(1.02)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          <DownloadIcon size={13} color="#000000" />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Chunked Loading "Load More Links" Button */}
              {visibleCount < filteredLinks.length && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  style={{
                    width: "100%",
                    padding: "12px 18px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.15s ease",
                    marginTop: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
                  }}
                >
                  <span>Load More Links ({filteredLinks.length - visibleCount} remaining)</span>
                  <span style={{ fontSize: "14px" }}>↓</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes cinemaSkeletonShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
