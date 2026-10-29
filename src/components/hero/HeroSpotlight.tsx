import React, { useEffect, useState, useMemo } from "react";
import { PlayIcon, StarIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, InfoIcon, DownloadIcon, CheckIcon } from "../../icons";
import { fetchTMDBDetails, type TMDBDetails } from "../../api/tmdb";
import { parseTitleAndYear } from "../media/MediaCard";
import type { Post, Provider } from "../../types";

interface HeroSpotlightProps {
  post: Post | null;
  candidatePosts?: Post[];
  provider: Provider | null;
  onPlay: (post: Post) => void;
  onDownload: (post: Post) => void;
  onInfo: (post: Post) => void;
  categoryLabel?: string;
  onSlideChange?: (post: Post, backdropUrl?: string) => void;
  children?: React.ReactNode;
}

export function cleanHeroTitle(raw: string): string {
  if (!raw) return "";
  let cleaned = raw
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^\)]*(?:1080|720|480|2160|4k|hevc|x264|x265|dvd|web|hd|rip|cam|hindi|dual|multi)[^\)]*\)/gi, " ")
    .replace(/\|.*$/g, " ")
    .replace(/\b(1080p|720p|480p|2160p|4k|uhd|fhd|hd|hevc|x264|x265|h264|h265|aac|ddp|atmos|web-dl|webrip|bluray|brrip|dvdrip|hdtc|hq-hdtc|camrip|predvd|esub|dual\s*audio|multi\s*audio|full\s*movie|uncut|extended|remastered|untouched|v2)\b/gi, "")
    .replace(/[-_.:|&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const { title } = parseTitleAndYear(cleaned);
  return (title || cleaned).trim();
}

import { optimizeImage } from "../../utils/imageOptimizer";

export const upgradeToHighRes = (url: string | null | undefined): string => {
  return optimizeImage(url, "backdrop");
};

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  post: initialPost,
  candidatePosts = [],
  onPlay,
  onDownload,
  onInfo,
  categoryLabel,
  onSlideChange,
}) => {
  const slides = useMemo(() => {
    const list: Post[] = [];
    const seen = new Set<string>();

    if (initialPost) {
      const key = initialPost.link || initialPost.title;
      seen.add(key);
      list.push(initialPost);
    }

    for (const p of candidatePosts) {
      const key = p.link || p.title;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(p);
      }
      if (list.length >= 6) break;
    }

    return list;
  }, [initialPost, candidatePosts]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isHovered, setIsHovered] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("cinema_watchlist");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [detailsCache, setDetailsCache] = useState<Record<string, { tmdb: TMDBDetails | null; bg: string | null }>>({});
  const [loadedLogos, setLoadedLogos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0);
  }, [slides.length, currentIndex]);

  // Reset to first slide immediately when switching tabs (e.g. Home -> Movies -> TV)
  useEffect(() => {
    setCurrentIndex(0);
    setPrevIndex(null);
  }, [categoryLabel]);

  const currentPost = slides[currentIndex] || initialPost;

  // Clean up previous slide after transition completes (650ms)
  useEffect(() => {
    if (prevIndex === null) return;
    const timer = setTimeout(() => {
      setPrevIndex(null);
    }, 650);
    return () => clearTimeout(timer);
  }, [currentIndex, prevIndex]);

  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setDirection("next");
      setPrevIndex(currentIndex);
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length, isHovered, currentIndex]);

  useEffect(() => {
    if (!slides.length) return;
    let isCurrent = true;

    slides.forEach((post) => {
      const title = cleanHeroTitle(post.title || "");
      if (!title || detailsCache[title]) return;

      const { year } = parseTitleAndYear(post.title || "");

      fetchTMDBDetails(title, undefined, year)
        .then((data) => {
          if (!isCurrent) return;
          if (data && data.backdropUrl) {
            setDetailsCache((prev) => ({ ...prev, [title]: { tmdb: data, bg: upgradeToHighRes(data.backdropUrl) } }));
          } else {
            fetch(`/api/poster?query=${encodeURIComponent(title)}`)
              .then((r) => r.json())
              .then((json) => {
                if (!isCurrent) return;
                let bg = json?.background;
                if (!bg && json?.poster && json.poster.includes("/poster/")) {
                  bg = json.poster.replace("/poster/", "/background/");
                }
                setDetailsCache((prev) => ({ ...prev, [title]: { tmdb: data || null, bg: bg ? upgradeToHighRes(bg) : null } }));
              })
              .catch(() => {
                if (!isCurrent) return;
                setDetailsCache((prev) => ({ ...prev, [title]: { tmdb: data || null, bg: null } }));
              });
          }
        })
        .catch(() => {});
    });

    return () => { isCurrent = false; };
  }, [slides]);

  if (!currentPost) return null;

  const getSlideImage = (p: Post | null | undefined): string => {
    if (!p) return "";
    const title = cleanHeroTitle(p.title || "");
    const cached = detailsCache[title];
    return (
      (cached?.tmdb?.backdropUrl && upgradeToHighRes(cached.tmdb.backdropUrl.trim())) ||
      cached?.bg ||
      upgradeToHighRes(p.image) ||
      ""
    );
  };

  const currentTitle = cleanHeroTitle(currentPost.title || "");
  const cached = detailsCache[currentTitle];
  const tmdb = cached?.tmdb;
  const cinemetaBg = cached?.bg;

  const { year: extractedYear } = parseTitleAndYear(currentPost.title || "");
  const rating =
    currentPost.rating ||
    tmdb?.rating ||
    (currentPost.tag ? currentPost.tag.replace(/[★⭐]/g, "").trim() : "8.5");
  const year = currentPost.year || tmdb?.year || extractedYear || "2024";
  const genres =
    currentPost.genres ||
    (tmdb?.genres && tmdb.genres.length > 0 ? tmdb.genres.slice(0, 2).join(", ") : "Sci-Fi, Adventure");
  const runtime = tmdb?.runtime
    ? typeof tmdb.runtime === "string" && (tmdb.runtime.includes("h") || tmdb.runtime.includes("m"))
      ? tmdb.runtime
      : !isNaN(Number(tmdb.runtime)) && Number(tmdb.runtime) > 0
      ? `${Math.floor(Number(tmdb.runtime) / 60)}h ${Number(tmdb.runtime) % 60}m`
      : null
    : null;

  const plot =
    currentPost.overview ||
    currentPost.description ||
    tmdb?.overview ||
    "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.";

  const heroImage =
    (currentPost.backdropUrl && upgradeToHighRes(currentPost.backdropUrl.trim())) ||
    (tmdb?.backdropUrl && upgradeToHighRes(tmdb.backdropUrl.trim())) ||
    cinemetaBg ||
    upgradeToHighRes(currentPost.image) ||
    "";
  const displayLogo = currentPost.logoUrl || tmdb?.logoUrl;

  const postId = currentPost.link || currentPost.title;
  const isSaved = watchlist.includes(postId);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist((prev) => {
      const next = prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId];
      try { localStorage.setItem("cinema_watchlist", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) return;
    setDirection("prev");
    setPrevIndex(currentIndex);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (slides.length <= 1) return;
    setDirection("next");
    setPrevIndex(currentIndex);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const goToSlide = (idx: number) => {
    if (idx === currentIndex || slides.length <= 1) return;
    setDirection(idx > currentIndex ? "next" : "prev");
    setPrevIndex(currentIndex);
    setCurrentIndex(idx);
  };

  const displayTitle = tmdb?.title || currentTitle || currentPost.title;

  useEffect(() => {
    if (currentPost && onSlideChange && heroImage) {
      onSlideChange(currentPost, heroImage);
    }
  }, [currentIndex, currentPost, heroImage, onSlideChange]);

  return (
    <div
      className="hero-spotlight-root"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "680px",
        height: "85vh",
        maxHeight: "880px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: "0 0 8px 0",
        backgroundColor: "transparent",
        border: "none",
        boxShadow: "none",
        userSelect: "none",
      }}
    >
      {/* Background Image Container */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 95%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 95%)",
        }}
      >
        {/* CSS Keyframes for Seamless Right-to-Left / Left-to-Right Slide Transition */}
        <style>{`
          @keyframes heroImgSlideOutLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
          @keyframes heroImgSlideInRight {
            0% { transform: translateX(100%); }
            100% { transform: translateX(0); }
          }
          @keyframes heroImgSlideOutRight {
            0% { transform: translateX(0); }
            100% { transform: translateX(100%); }
          }
          @keyframes heroImgSlideInLeft {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(0); }
          }
          @keyframes heroTextSlideNext {
            0% { opacity: 0; transform: translateX(70px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes heroTextSlidePrev {
            0% { opacity: 0; transform: translateX(-70px); }
            100% { opacity: 1; transform: translateX(0); }
          }
        `}</style>

        {/* 1. Outgoing background image during slide transition */}
        {prevIndex !== null && slides[prevIndex] && (
          <img
            key={`hero-bg-prev-${prevIndex}`}
            src={getSlideImage(slides[prevIndex])}
            alt="outgoing slide"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 20%",
              animation:
                direction === "next"
                  ? "heroImgSlideOutLeft 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards"
                  : "heroImgSlideOutRight 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards",
            }}
          />
        )}

        {/* 2. Incoming / Current background image */}
        <img
          key={`hero-bg-curr-${currentIndex}`}
          src={heroImage}
          alt={displayTitle}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 20%",
            animation:
              prevIndex !== null
                ? direction === "next"
                  ? "heroImgSlideInRight 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards"
                  : "heroImgSlideInLeft 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards"
                : "none",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0";
          }}
        />

        {/* Minimal top fade under navigation bar (kept transparent) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "90px",
            background: "linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, transparent 100%)",
          }}
        />

        {/* Soft localized text backing */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 15% 65%, rgba(0, 0, 0, 0.4) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Row 1: Spotlight Text Content (Sliding in sync with the slide transition) */}
      <div
        key={`hero-content-${currentIndex}`}
        className="hero-spotlight-content"
        style={{
          position: "relative",
          zIndex: 4,
          maxWidth: "680px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          textAlign: "left",
          gap: "14px",
          padding: "0 48px",
          marginBottom: "64px",
          animation:
            prevIndex !== null
              ? direction === "next"
                ? "heroTextSlideNext 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards"
                : "heroTextSlidePrev 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards"
              : "none",
        }}
      >
        {categoryLabel && (
          <div style={{ fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "-2px" }}>
            {categoryLabel}
          </div>
        )}

        {/* Title / Logo with zero-font-pop skeleton shimmer */}
        {(() => {
          // If neither currentPost.logoUrl nor TMDB metadata is resolved yet:
          const isResolving = !currentPost.logoUrl && !cached;
          if (isResolving) {
            return (
              <div
                className="skeleton-shimmer"
                style={{
                  width: "clamp(260px, 35vw, 440px)",
                  height: "clamp(56px, 7vw, 90px)",
                  borderRadius: "14px",
                  marginBottom: "8px",
                }}
              />
            );
          }

          if (displayLogo) {
            const isLogoLoaded = Boolean(loadedLogos[displayLogo]);
            return (
              <div style={{ position: "relative", minHeight: "56px", marginBottom: "6px", width: "100%", maxWidth: "480px" }}>
                {!isLogoLoaded && (
                  <div
                    className="skeleton-shimmer"
                    style={{
                      width: "clamp(240px, 30vw, 380px)",
                      height: "clamp(50px, 6vw, 80px)",
                      borderRadius: "14px",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  />
                )}
                <img
                  src={displayLogo}
                  alt={displayTitle}
                  onClick={() => onInfo(currentPost)}
                  title="View Details"
                  onLoad={() => setLoadedLogos((prev) => ({ ...prev, [displayLogo]: true }))}
                  style={{
                    maxHeight: "135px",
                    maxWidth: "min(480px, 88vw)",
                    objectFit: "contain",
                    filter: "drop-shadow(0 4px 24px rgba(0, 0, 0, 0.95))",
                    cursor: "pointer",
                    opacity: isLogoLoaded ? 1 : 0,
                    transition: "opacity 0.28s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "block",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                />
              </div>
            );
          }

          // If TMDB resolved and there is genuinely no logo, show styled title
          return (
            <h1
              onClick={() => onInfo(currentPost)}
              title="View Details"
              style={{
                fontFamily: "var(--font-display, 'Space Grotesk', -apple-system, sans-serif)",
                fontSize: "clamp(56px, 7.5vw, 102px)",
                fontWeight: 900,
                lineHeight: 0.95,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                textShadow: "0 4px 32px rgba(0, 0, 0, 0.95)",
                margin: 0,
                cursor: "pointer",
                transition: "color 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ff3b30";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              {displayTitle}
            </h1>
          );
        })()}

        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "14px", fontWeight: 700, color: "rgba(255, 255, 255, 0.92)", textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontWeight: 800 }}>
            <StarIcon size={14} fill="#f59e0b" color="#f59e0b" />
            <span>{rating ? (rating.includes("/10") ? rating : `${rating}/10`) : "8.2/10"}</span>
          </div>
          <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>•</span>
          <span>{year || "2026"}</span>
          {genres && <><span style={{ color: "rgba(255, 255, 255, 0.4)" }}>•</span><span>{genres.split(",")[0].trim()}</span></>}
          {runtime && <><span style={{ color: "rgba(255, 255, 255, 0.4)" }}>•</span><span style={{ color: "rgba(255, 255, 255, 0.75)" }}>{runtime}</span></>}
        </div>

        <p style={{ fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.55, color: "rgba(255, 255, 255, 0.92)", maxWidth: "620px", margin: "0", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: "0 2px 14px rgba(0, 0, 0, 0.95), 0 1px 4px rgba(0, 0, 0, 0.8)" }}>
          {plot}
        </p>

        <div className="hero-spotlight-actions" style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
          {/* RED PLAY BUTTON */}
          <button
            onClick={() => onPlay(currentPost)}
            style={{
              height: "44px",
              padding: "0 28px",
              borderRadius: "999px",
              background: "#e50914",
              color: "#ffffff",
              fontSize: "14.5px",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 20px rgba(229, 9, 20, 0.45)",
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.background = "#f40612";
              e.currentTarget.style.boxShadow = "0 6px 24px rgba(229, 9, 20, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "#e50914";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(229, 9, 20, 0.45)";
            }}
          >
            <PlayIcon size={17} fill="#ffffff" color="#ffffff" />
            <span>Play</span>
          </button>

          {/* WATCHLIST & INFO CAPSULE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "44px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.16)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              padding: "0 6px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
            }}
          >
            <button
              title={isSaved ? "In Watchlist" : "Add to Watchlist"}
              onClick={toggleWatchlist}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {isSaved ? <CheckIcon size={19} color="#4ade80" /> : <PlusIcon size={19} color="#ffffff" />}
            </button>
            <div style={{ width: "1px", height: "18px", background: "rgba(255, 255, 255, 0.22)" }} />
            <button
              title="Details & Cast"
              onClick={() => onInfo(currentPost)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <InfoIcon size={19} color="#ffffff" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Previous slide"
            style={{
              position: "absolute",
              top: "50%",
              left: "24px",
              transform: "translateY(-50%)",
              zIndex: 5,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(20, 24, 32, 0.65)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: isHovered ? 1 : 0,
              pointerEvents: isHovered ? "auto" : "none",
              transition: "opacity 0.25s ease, transform 0.2s ease, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(30, 36, 48, 0.9)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(20, 24, 32, 0.65)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <ChevronLeftIcon size={22} color="#ffffff" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next slide"
            style={{
              position: "absolute",
              top: "50%",
              right: "24px",
              transform: "translateY(-50%)",
              zIndex: 5,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(20, 24, 32, 0.65)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              opacity: isHovered ? 1 : 0,
              pointerEvents: isHovered ? "auto" : "none",
              transition: "opacity 0.25s ease, transform 0.2s ease, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(30, 36, 48, 0.9)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(20, 24, 32, 0.65)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <ChevronRightIcon size={22} color="#ffffff" />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "38px",
            right: "48px",
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: "6px 14px",
            borderRadius: "999px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {slides.map((_, idx) => {
            const isActive = idx === currentIndex;
            const isPast = idx < currentIndex;
            return (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  width: isActive ? "36px" : "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: isActive
                    ? "rgba(255, 255, 255, 0.28)"
                    : isPast
                    ? "#ffffff"
                    : "rgba(255, 255, 255, 0.38)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  position: "relative",
                  overflow: "hidden",
                  transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease",
                }}
              >
                {isActive && (
                  <div
                    key={`hero-dot-fill-${currentIndex}`}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      borderRadius: "999px",
                      background: "#ffffff",
                      transformOrigin: "left center",
                      animation: "heroDotFill 8s linear forwards",
                      animationPlayState: isHovered ? "paused" : "running",
                      willChange: "transform",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};