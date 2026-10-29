import React, { useState, useEffect, useRef } from "react";
import { PlayIcon, MoreHorizontalIcon } from "../../icons";
import {
  getContinueWatchingList,
  saveContinueWatching,
  removeContinueWatching,
  formatTimeRemaining,
  type ContinueWatchingItem,
} from "../../utils/continueWatchingService";
import { optimizeImage } from "../../utils/imageOptimizer";
import { showToast, showUndoToast } from "../../utils/toastService";
import { fetchTMDBDetails } from "../../api/tmdb";
import { parseTitleAndYear, backdropCache, persistBackdrop, logoCache } from "./MediaCard";
import { MediaContextMenu } from "./MediaContextMenu";
import type { MediaPost } from "../../types";

const getProxiedUrl = (url: string | null, step: number): string | null => {
  if (!url) return null;
  const cleanUrl = url.replace(/^http:\/\//i, "https://");
  if (
    cleanUrl.startsWith("/api/proxy") ||
    cleanUrl.startsWith("/api/image-proxy") ||
    cleanUrl.startsWith("data:")
  ) {
    return cleanUrl;
  }
  if (step === 1) {
    return `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
  }
  if (step >= 2) {
    return `https://cinema-dwh.pages.dev/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
  }
  return cleanUrl;
};

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onResume: (item: ContinueWatchingItem) => void;
  onRemove: (id: string, e: React.MouseEvent, cardEl?: HTMLElement | null) => void;
  onSelectPost?: (post: MediaPost) => void;
  width?: number;
  isDisappearing?: boolean;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({
  item,
  onResume,
  onRemove,
  onSelectPost,
  width = 295,
  isDisappearing = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const cardPosterRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | undefined>(undefined);
  const [imgError, setImgError] = useState(false);
  const [resolvedImg, setResolvedImg] = useState<string>(() => item.backdrop || item.poster || "");

  const { title: cleanTitle, year: extractedYear } = parseTitleAndYear(item.title);
  const cacheKey = (cleanTitle || item.title || "").toLowerCase();

  const [tmdbLogo, setTmdbLogo] = useState<string | null>(() => {
    return item.logoUrl || (cacheKey ? logoCache.get(cacheKey) : null) || null;
  });
  const [logoProxyStep, setLogoProxyStep] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Auto-fetch logo if already cached
  useEffect(() => {
    if (!cacheKey) return;
    if (logoCache.has(cacheKey) && !tmdbLogo) {
      setTmdbLogo(logoCache.get(cacheKey) || null);
    }
  }, [cacheKey, tmdbLogo]);

  // Query TMDB specifically for logo if missing from cache
  useEffect(() => {
    if (!cacheKey) return;
    if (logoCache.has(cacheKey)) {
      setTmdbLogo(logoCache.get(cacheKey) || null);
      return;
    }
    let isMounted = true;
    fetchTMDBDetails(cleanTitle, undefined, extractedYear || item.year)
      .then((data) => {
        if (!isMounted || !data?.logoUrl) return;
        const opt = optimizeImage(data.logoUrl, "logo");
        logoCache.set(cacheKey, opt);
        setTmdbLogo(opt);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [cleanTitle, item.year, cacheKey]);

  // Auto-fetch missing backdrop/poster artwork (e.g. "The Dog Stars") from TMDB / Cinemeta
  useEffect(() => {
    if ((item.backdrop || item.poster) && !imgError) {
      setResolvedImg(item.backdrop || item.poster || "");
      return;
    }

    let isMounted = true;

    // Check memory caches first
    if (backdropCache.has(cacheKey) && backdropCache.get(cacheKey)) {
      setResolvedImg(backdropCache.get(cacheKey)!);
      return;
    }

    // Actively query TMDB for missing backdrop / poster / logo
    fetchTMDBDetails(cleanTitle, undefined, extractedYear || item.year)
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.logoUrl) {
          const optLogo = optimizeImage(data.logoUrl, "logo");
          logoCache.set(cacheKey, optLogo);
          setTmdbLogo(optLogo);
        }
        const found = data.backdropUrl || data.posterUrl;
        if (found) {
          const opt = optimizeImage(found, "backdrop");
          setResolvedImg(opt);
          setImgError(false);
          persistBackdrop(cacheKey, opt);
          saveContinueWatching({
            ...item,
            backdrop: data.backdropUrl || found,
            poster: data.posterUrl || found,
            logoUrl: data.logoUrl || item.logoUrl,
          });
        }
      })
      .catch(() => {
        // Fallback to /api/poster Cinemeta lookup
        fetch(`/api/poster?query=${encodeURIComponent(cleanTitle)}`)
          .then((res) => res.json())
          .then((data) => {
            if (!isMounted || !data?.poster) return;
            const opt = optimizeImage(data.poster, "backdrop");
            setResolvedImg(opt);
            setImgError(false);
            persistBackdrop(cacheKey, opt);
            saveContinueWatching({
              ...item,
              backdrop: data.poster,
              poster: data.poster,
            });
          })
          .catch(() => {});
      });

    return () => {
      isMounted = false;
    };
  }, [item.title, item.year, imgError, cacheKey, cleanTitle, extractedYear]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = 10;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ x: rotateX, y: rotateY });
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const displayImg = optimizeImage(resolvedImg, "backdrop");
  const timeRemaining = formatTimeRemaining(item.currentTime, item.duration);
  const episodeTag = item.season && item.episode ? `S${item.season} E${item.episode}` : null;

  const rawLogo = tmdbLogo || item.logoUrl;
  const optimizedLogo = rawLogo ? optimizeImage(rawLogo, "logo") : null;
  const activeLogo = optimizedLogo ? getProxiedUrl(optimizedLogo, logoProxyStep) : null;

  const post: MediaPost = {
    id: item.id,
    tmdbId: Number(item.id) || undefined,
    title: item.title,
    image: resolvedImg || item.poster || item.backdrop || "",
    backdrop: resolvedImg || item.backdrop || item.poster || "",
    logoUrl: activeLogo || undefined,
    year: item.year || "",
    rating: item.rating ? Number(item.rating) : 0,
    type: item.type === "tv" || item.type === "series" || item.season ? "tv" : "movie",
  };

  return (
    <div
      ref={cardRef}
      style={{
        width: isDisappearing ? "0px" : `${width}px`,
        minWidth: isDisappearing ? "0px" : `${width}px`,
        marginRight: isDisappearing ? "-18px" : "0px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "9px",
        cursor: "pointer",
        perspective: "1000px",
        userSelect: "none",
        zIndex: isHovered ? 12 : 1,
        opacity: isDisappearing ? 0 : 1,
        transform: isDisappearing ? "scale(0.88) translate3d(4px, -8px, 0)" : "scale(1)",
        filter: isDisappearing ? "blur(8px)" : "none",
        transition: "width 0.45s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.45s cubic-bezier(0.16, 1, 0.3, 1), margin-right 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, transform 0.35s ease, filter 0.3s ease",
        overflow: isDisappearing ? "hidden" : "visible",
        pointerEvents: isDisappearing ? "none" : "auto",
      }}
      onClick={() => onResume(item)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuPos({ x: e.clientX, y: e.clientY });
        setContextMenuOpen(true);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Landscape Card matching MediaCard exactly */}
      <div
        ref={cardPosterRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#0c0d12",
          border: isHovered ? "1px solid rgba(255, 255, 255, 0.22)" : "1px solid rgba(255, 255, 255, 0.08)",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.045, 1.045, 1.045)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 22px 44px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 0, 0, 0.5)"
            : "0 6px 18px rgba(0, 0, 0, 0.55)",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease, border-color 0.2s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.3s ease",
        }}
      >
        {/* Backdrop Artwork */}
        {displayImg && !imgError ? (
          <img
            crossOrigin="anonymous"
            src={displayImg}
            alt={item.title}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: isHovered ? "scale(1.08)" : "scale(1)",
              transition: isHovered
                ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease"
                : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
              willChange: "transform, opacity",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #181b24 0%, #0d0f14 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255, 255, 255, 0.6)" }}>
              {item.title}
            </span>
          </div>
        )}

        {/* Ambient Dark Bottom Vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.2) 50%, transparent 80%)",
            pointerEvents: "none",
          }}
        />

        {/* Dynamic 3D Glare Light */}
        {isHovered && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at ${50 + tilt.y * 3}% ${
                50 - tilt.x * 3
              }%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`,
              pointerEvents: "none",
              mixBlendMode: "overlay",
            }}
          />
        )}

        {/* Center Frosted Glass Play Icon on Hover */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "scale(1)" : "scale(0.85)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#e50914",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(229, 9, 20, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            <PlayIcon size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: "2px" }} />
          </div>
        </div>

        {/* Top-Right Three-Dots (•••) Options Button */}
        <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 12 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPos({ x: rect.right, y: rect.bottom + 6 });
              setContextMenuOpen(true);
            }}
            title="Options"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
              opacity: isHovered || contextMenuOpen ? 1 : 0,
              transition: "opacity 0.18s ease, transform 0.18s ease, background 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            }}
          >
            <MoreHorizontalIcon size={14} color="#ffffff" />
          </button>
        </div>

        {/* Landscape Overlay: Extracted Movie Title Logo & Progress Info (matching MediaCard) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            padding: "12px 14px 22px 14px",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.92) 100%)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          {activeLogo && !logoFailed ? (
            <img
              src={activeLogo}
              alt={cleanTitle || item.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              style={{
                maxHeight: "38px",
                maxWidth: "70%",
                objectFit: "contain",
                objectPosition: "left bottom",
                filter: "drop-shadow(0 4px 16px rgba(0, 0, 0, 0.95))",
                marginBottom: "5px",
                display: "block",
                transform: isHovered ? "translateY(-4px) scale(1.08)" : "translateY(0) scale(1)",
                transformOrigin: "left bottom",
                transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onError={() => {
                if (logoProxyStep === 0) {
                  setLogoProxyStep(1);
                } else if (logoProxyStep === 1) {
                  setLogoProxyStep(2);
                } else {
                  setLogoFailed(true);
                }
              }}
            />
          ) : (
            <div
              style={{
                fontSize: "15px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "0.2px",
                textTransform: "uppercase",
                textShadow: "0 2px 14px rgba(0, 0, 0, 0.95)",
                lineHeight: 1.15,
                maxWidth: "85%",
                marginBottom: "5px",
                transform: isHovered ? "translateY(-3px) scale(1.05)" : "translateY(0) scale(1)",
                transformOrigin: "left bottom",
                transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {cleanTitle || item.title}
            </div>
          )}

          {/* Time Remaining & Episode Pill info row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              transform: isHovered ? "translateY(-2px)" : "translateY(0)",
              transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {timeRemaining && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  {timeRemaining}
                </span>
              )}
              {item.year && (
                <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255, 255, 255, 0.7)" }}>
                  • {item.year}
                </span>
              )}
            </div>

            {episodeTag && (
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: "999px",
                  background: "rgba(10, 12, 18, 0.75)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                {episodeTag}
              </span>
            )}
          </div>
        </div>

        {/* Floating In-Card Red Progress Bar matching image copy 8 */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "14px",
            right: "14px",
            height: "4px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.25)",
            zIndex: 5,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(3, item.progressPercent || 0))}%`,
              height: "100%",
              background: "#e50914",
              boxShadow: "0 0 10px rgba(229, 9, 20, 0.8)",
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Meta Below Card */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 2px" }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#ffffff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.5)",
            fontWeight: 500,
          }}
        >
          <span>{Math.round(item.progressPercent)}% watched</span>
          {item.year && <span>• {item.year}</span>}
          {item.episodeTitle && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>• {item.episodeTitle}</span>}
        </div>
      </div>

      {contextMenuOpen && (
        <MediaContextMenu
          post={post}
          isOpen={contextMenuOpen}
          onClose={() => setContextMenuOpen(false)}
          onResume={() => onResume(item)}
          onPlay={() => onResume(item)}
          onOpenDetails={() => {
            if (onSelectPost) onSelectPost(post);
            else onResume(item);
          }}
          onRemoveFromContinueWatching={() => {
            onRemove(item.id, { stopPropagation: () => {} } as any, cardPosterRef.current || cardRef.current);
          }}
          position={menuPos}
        />
      )}
    </div>
  );
};

export interface ContinueWatchingShelfProps {
  onResume: (item: ContinueWatchingItem) => void;
  onSelectPost?: (post: MediaPost) => void;
  onOpenModal: () => void;
}

export const ContinueWatchingShelf: React.FC<ContinueWatchingShelfProps> = ({
  onResume,
  onSelectPost,
  onOpenModal,
}) => {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const loadItems = () => {
    setItems(getContinueWatchingList());
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener("cinema:continue_watching_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("cinema:continue_watching_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
  }, [items]);

  const handleScroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = dir === "left" ? -640 : 640;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    setTimeout(updateScrollButtons, 350);
  };

  const [disappearingIds, setDisappearingIds] = useState<Set<string>>(new Set());
  const pendingTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  const handleRemove = (id: string, e: React.MouseEvent, cardEl?: HTMLElement | null) => {
    e.stopPropagation();
    const item = items.find((it) => it.id === id);
    if (!item) return;

    // Normal clean removal with smooth collapse
    setDisappearingIds((prev) => new Set([...prev, id]));

    // Show Telegram-style Undo Glass Toast
    showUndoToast(`Removed "${item.title}"`, () => {
      // Undo restoration
      if (pendingTimers.current[id]) {
        clearTimeout(pendingTimers.current[id]);
        delete pendingTimers.current[id];
      }
      setDisappearingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (cardEl) {
        cardEl.style.opacity = "1";
        cardEl.style.pointerEvents = "auto";
      }
      showToast(`Restored "${item.title}"`, "info");
    }, 5);

    // Commit removal after 5s if user did not press Undo
    pendingTimers.current[id] = setTimeout(() => {
      removeContinueWatching(id);
      setDisappearingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      delete pendingTimers.current[id];
    }, 5000);
  };

  if (!items || items.length === 0) return null;

  return (
    <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#ffffff",
              margin: 0,
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>Continue Watching</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.20)",
                color: "#ffffff",
                letterSpacing: "0.2px",
              }}
            >
              {items.length}
            </span>
          </h2>
        </div>

        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("cinema:navigate", { detail: { tab: "watchlist" } }));
            onOpenModal?.();
          }}
          style={{
            padding: "5px 14px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(229, 9, 20, 0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          View All →
        </button>
      </div>

      {/* Relative Carousel Row */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Left Frosted Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll("left")}
            aria-label="Scroll Left"
            style={{
              position: "absolute",
              left: "-18px",
              top: "calc(50% - 16px)",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(18, 20, 26, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.65)",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e50914";
              e.currentTarget.style.borderColor = "#e50914";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(18, 20, 26, 0.65)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: "bold" }}>‹</span>
          </button>
        )}

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="cinema-no-scrollbar"
          style={{
            display: "flex",
            gap: "18px",
            overflowX: "auto",
            overflowY: "hidden",
            padding: "8px 4px 14px 4px",
            scrollBehavior: "smooth",
          }}
        >
          {items.map((item, idx) => (
            <ContinueWatchingCard
              key={`${item.id || item.title}-${idx}`}
              item={item}
              onResume={onResume}
              onRemove={handleRemove}
              onSelectPost={onSelectPost}
              isDisappearing={disappearingIds.has(item.id)}
            />
          ))}
        </div>

        {/* Right Frosted Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll("right")}
            aria-label="Scroll Right"
            style={{
              position: "absolute",
              right: "-18px",
              top: "calc(50% - 16px)",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(18, 20, 26, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.65)",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e50914";
              e.currentTarget.style.borderColor = "#e50914";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(18, 20, 26, 0.65)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: "bold" }}>›</span>
          </button>
        )}
      </div>
    </div>
  );
};
