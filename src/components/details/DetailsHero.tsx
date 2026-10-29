import React, { useState, useEffect } from "react";
import {
  StarIcon,
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  FilmIcon,
  CheckIcon,
  PlusIcon,
  ThumbsUpIcon,
  MoreHorizontalIcon,
  Volume2Icon,
  VolumeXIcon,
} from "../../icons";
import type { TMDBDetails } from "../../api/tmdb";
import type { MediaPost } from "../../types";
import { MediaContextMenu } from "../media/MediaContextMenu";
import { isUserSignedIn } from "../../utils/profileService";
import { toast } from "../../utils/toastService";
import { isItemSaved, toggleSavedItem } from "../../utils/userListsService";

export interface DetailsHeroProps {
  backdropImage: string;
  backdropLoaded: boolean;
  onBackdropLoaded: () => void;
  posterImage: string;
  heroPosterLoaded: boolean;
  onPosterLoaded: () => void;
  displayTitle: string;
  rating: string | null;
  year: string | null;
  runtime: string | null;
  isSeries: boolean;
  seasonNum: string | null;
  genres: string[];
  plot: string;
  hasAnyRealDetails: boolean;
  realRating: string | null;
  imdbUrl: string;
  resolvedImdbId: string | null;
  letterboxd: {
    letterboxdRating: string | null;
    letterboxdUrl: string | null;
  } | null;
  formattedGenres: string | null;
  starsNames: string | null;
  creatorOrDirector: { label: string; value: string } | null;
  episodesCount: number | null;
  realLanguage: string | null;
  realQuality: string | null;
  activeTab: "stream" | "download" | null;
  onToggleTab: (tab: "stream" | "download") => void;
  onPlayPrimary?: () => void;
  onSelectPerson?: (personId: number) => void;
  activeTrailerEmbed: string | null;
  tmdb?: TMDBDetails | null;
  heroIntroStage?: "fullscreen" | "fitting" | "settled";
  children?: React.ReactNode;
}

export const DetailsHero: React.FC<DetailsHeroProps> = ({
  backdropImage,
  backdropLoaded,
  onBackdropLoaded,
  posterImage,
  heroPosterLoaded,
  onPosterLoaded,
  displayTitle,
  rating,
  year,
  runtime,
  isSeries,
  seasonNum,
  genres,
  plot,
  hasAnyRealDetails,
  realRating,
  imdbUrl,
  resolvedImdbId,
  letterboxd,
  formattedGenres,
  starsNames,
  creatorOrDirector,
  episodesCount,
  realLanguage,
  realQuality,
  activeTab,
  onToggleTab,
  onPlayPrimary,
  onSelectPerson,
  activeTrailerEmbed,
  tmdb,
  heroIntroStage = "settled",
  children,
}) => {
  const [isExpandedSynopsis, setIsExpandedSynopsis] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | undefined>(undefined);

  const mediaPostItem = React.useMemo<MediaPost>(() => ({
    id: String(tmdb?.id || resolvedImdbId || displayTitle),
    tmdbId: tmdb?.id,
    imdbId: resolvedImdbId || undefined,
    title: displayTitle,
    image: posterImage,
    backdrop: backdropImage,
    type: isSeries ? "tv" : "movie",
    year: year || (tmdb as any)?.release_date?.slice(0, 4) || (tmdb as any)?.first_air_date?.slice(0, 4),
    rating: realRating || rating || undefined,
  }), [tmdb, resolvedImdbId, displayTitle, posterImage, backdropImage, isSeries, year, realRating, rating]);

  useEffect(() => {
    setIsWatchlisted(isItemSaved(mediaPostItem.id || mediaPostItem.tmdbId));
    const handleSavedUpdated = () => {
      setIsWatchlisted(isItemSaved(mediaPostItem.id || mediaPostItem.tmdbId));
    };
    window.addEventListener("cinema:saved_items_updated", handleSavedUpdated);
    return () => window.removeEventListener("cinema:saved_items_updated", handleSavedUpdated);
  }, [mediaPostItem]);

  // Content rating (e.g. TV-14, PG-13, R)
  const contentRating = tmdb?.contentRating || (isSeries ? "TV-14" : "PG-13");

  // Format first & last air date for technical card
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const firstAiredFormatted = formatDate(tmdb?.firstAirDate);
  const lastAiredFormatted = formatDate(tmdb?.lastAirDate);

  // Check if item is unreleased / upcoming
  const isUnreleased = React.useMemo(() => {
    // 1. Check explicit release or air date (movies or series)
    const rawDate = tmdb?.firstAirDate || tmdb?.lastAirDate;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d > today) return true;
      }
    }

    // 2. Check TMDB status string
    const statusLower = (tmdb?.status || "").toLowerCase().trim();
    if (
      statusLower.includes("post prod") ||
      statusLower.includes("in prod") ||
      statusLower.includes("planned") ||
      statusLower.includes("rumored") ||
      statusLower.includes("upcoming") ||
      statusLower.includes("announced")
    ) {
      return true;
    }

    // 3. Check year vs current year
    const nowYear = new Date().getFullYear();
    const itemYear = parseInt(tmdb?.year || "", 10);
    if (!isNaN(itemYear) && itemYear > nowYear) {
      return true;
    }

    return false;
  }, [tmdb]);

  const displayStatus = isUnreleased
    ? "Coming Soon"
    : tmdb?.status || (isSeries ? "Returning Series" : "Released");

  // Ends time calculation from runtime (Screenshot 2)
  const endsTime = React.useMemo(() => {
    if (!runtime) return null;
    const matchH = runtime.match(/(\d+)\s*h/);
    const matchM = runtime.match(/(\d+)\s*m/);
    const hours = matchH ? parseInt(matchH[1], 10) : 0;
    const mins = matchM ? parseInt(matchM[1], 10) : 0;
    const totalMins = hours * 60 + mins;
    if (totalMins <= 0) return null;
    const now = new Date();
    now.setMinutes(now.getMinutes() + totalMins);
    return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, [runtime]);

  // Indian movie check for INR currency conversion
  const isIndianMovie = React.useMemo(() => {
    return (
      tmdb?.countries?.some((c) => /india/i.test(c)) ||
      tmdb?.spokenLanguages?.some((l) => /hindi|tamil|telugu|malayalam|kannada|bengali|marathi|punjabi/i.test(l)) ||
      (tmdb as any)?.originCountry?.includes("IN")
    );
  }, [tmdb]);

  const formatCurrency = (amount?: number | null) => {
    if (!amount || amount <= 0) return null;
    if (isIndianMovie) {
      const inr = amount * 86;
      if (inr >= 10000000) {
        const cr = (inr / 10000000).toFixed(inr >= 100000000 ? 0 : 1);
        return `₹${cr} Cr`;
      }
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(inr);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Like percentage derived from rating (Screenshot 2)
  const likePercent = React.useMemo(() => {
    if (rating && !isNaN(parseFloat(rating))) {
      const score = parseFloat(rating);
      return Math.min(Math.round(score * 10) + 8, 99);
    }
    return 88;
  }, [rating]);

  const [isMuted, setIsMuted] = useState(true);
  const [isPlayingAutoTrailer, setIsPlayingAutoTrailer] = useState(false);
  const [isTrailerHidden, setIsTrailerHidden] = useState(false);
  const [trailerFailed, setTrailerFailed] = useState(false);
  const [trailerHasPlayed, setTrailerHasPlayed] = useState(false);

  // Extract key from active trailer or first TMDB trailer
  const trailerKey = React.useMemo(() => {
    if (activeTrailerEmbed) {
      const match = activeTrailerEmbed.match(/embed\/([^?&]+)/);
      if (match) return match[1];
    }
    if (tmdb?.trailerEmbed) {
      const match = tmdb.trailerEmbed.match(/embed\/([^?&]+)/);
      if (match) return match[1];
    }
    return tmdb?.trailers?.[0]?.key || null;
  }, [activeTrailerEmbed, tmdb]);

  const trailerEmbedUrl = trailerKey
    ? `https://www.youtube-nocookie.com/embed/${trailerKey}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
    : null;

  // Auto-play trailer after 5 seconds if not hidden, key exists, and verified available
  useEffect(() => {
    if (!trailerKey || isTrailerHidden || trailerFailed) return;

    let isMounted = true;

    // Check with YouTube oembed endpoint if video is public & embeddable
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${trailerKey}&format=json`)
      .then((res) => {
        if (!isMounted) return;
        if (!res.ok) {
          setTrailerFailed(true);
          return;
        }
        // Start playing after 4.5s
        const timer = setTimeout(() => {
          if (isMounted) setIsPlayingAutoTrailer(true);
        }, 4500);
        return () => clearTimeout(timer);
      })
      .catch(() => {
        if (isMounted) setTrailerFailed(true);
      });

    return () => {
      isMounted = false;
    };
  }, [trailerKey, isTrailerHidden, trailerFailed]);

  // Listen to YouTube player messages to cleanly fallback ONLY on real fatal errors
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      try {
        let data = e.data;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (_) {}
        }
        // Catch playing state (info === 1 or data === 1)
        if (
          data?.event === "onStateChange" &&
          (data?.info === 1 || data?.data === 1)
        ) {
          setTrailerHasPlayed(true);
        }

        // Catch YouTube fatal player errors (codes 100: not found/private, 101/150: embed restricted)
        if (
          (data?.event === "onError" || data?.event === "onPlayerError") &&
          [100, 101, 150].includes(Number(data?.info || data?.data))
        ) {
          setTrailerFailed(true);
          setIsPlayingAutoTrailer(false);
        }
      } catch (_) {}
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  const highResBackdrop = React.useMemo(() => {
    if (!backdropImage) return "";
    let clean = backdropImage.trim();
    if (clean.includes("image.tmdb.org/t/p/")) return clean.replace(/\/w\d+\//, "/original/");
    if (clean.includes("images.metahub.space/")) {
      return clean.replace(/\/background\/(?:small|medium)\//, "/background/large/");
    }
    return clean;
  }, [backdropImage]);

  // Instant browser cache check & watchdog timer: NEVER leave skeleton shimmer stuck indefinitely
  useEffect(() => {
    const srcToTest = highResBackdrop || backdropImage;
    if (!srcToTest) {
      onBackdropLoaded?.();
      return;
    }
    const testImg = new Image();
    testImg.src = srcToTest;
    if (testImg.complete && testImg.naturalWidth > 0) {
      onBackdropLoaded?.();
    } else {
      testImg.onload = () => onBackdropLoaded?.();
      testImg.onerror = () => onBackdropLoaded?.();
    }
    // Safety watchdog: Maximum 750ms skeleton timeout so user NEVER needs to reload the page
    const timer = setTimeout(() => {
      onBackdropLoaded?.();
    }, 750);
    return () => clearTimeout(timer);
  }, [highResBackdrop, backdropImage, onBackdropLoaded]);

  const isFullscreen = heroIntroStage === "fullscreen";

  return (
    <div
      className="details-hero-banner"
      style={{
        position: "relative",
        width: "100%",
        minHeight: isFullscreen ? "calc(100vh + 72px)" : "82vh",
        maxHeight: isFullscreen ? "calc(100vh + 72px)" : "900px",
        height: isFullscreen ? "calc(100vh + 72px)" : "82vh",
        display: "flex",
        alignItems: "flex-end",
        marginTop: "-72px",
        padding: "115px 48px 110px 48px",
        overflow: "visible",
        backgroundColor: "transparent",
        transition:
          "height 0.65s cubic-bezier(0.22, 1, 0.36, 1), min-height 0.65s cubic-bezier(0.22, 1, 0.36, 1), max-height 0.65s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* Background Container - Smooth Mask Fade (Matches Home hero, eliminates divider completely) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: "-140px",
          width: "100%",
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 45%, rgba(0,0,0,0.5) 75%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 45%, rgba(0,0,0,0.5) 75%, transparent 100%)",
          transition: "bottom 0.65s ease",
        }}
      >
        {/* Full-width cinematic backdrop */}
        {(!backdropLoaded || !(highResBackdrop || backdropImage)) && (
          <div
            className="skeleton-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background: "linear-gradient(90deg, #07090e 0%, #161b26 50%, #07090e 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmerWave 2s infinite linear",
            }}
          />
        )}
        {(highResBackdrop || backdropImage) && (
          <img
            ref={(img) => {
              if (img && img.complete && img.naturalWidth > 0 && !backdropLoaded) {
                onBackdropLoaded?.();
              }
            }}
            src={highResBackdrop || backdropImage}
            alt={displayTitle}
            onLoad={onBackdropLoaded}
            onError={() => {
              onBackdropLoaded?.();
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 18%",
              filter: "none",
              opacity: backdropLoaded ? 1 : 0.85,
              transform: "scale(1)",
              transition: "opacity 0.35s ease",
              animation: "cinemaHeroKenBurns 25s ease-in-out infinite alternate",
            }}
          />
        )}

        {/* Soft Text Radial Vignette Backing (Inside mask so it fades smoothly to 100% transparent without any sharp cutoff line) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 18% 65%, rgba(6, 8, 12, 0.58) 0%, rgba(6, 8, 12, 0.22) 50%, transparent 80%)",
            pointerEvents: "none",
          }}
        />

        {/* Minimal Top Navbar Fade (Hidden in fullscreen for crystal-clear top edge) */}
        {!isFullscreen && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "72px",
              background: "linear-gradient(180deg, rgba(6, 8, 12, 0.35) 0%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* 5-second Auto-Preview Trailer Video (Muted by default to ensure 100% instant browser autoplay) */}
        {isPlayingAutoTrailer && !isTrailerHidden && !trailerFailed && trailerEmbedUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <iframe
              src={`${trailerEmbedUrl}${trailerEmbedUrl.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&loop=1&playsinline=1&enablejsapi=1&start=6`}
              title={`${displayTitle} Preview`}
              allow="autoplay; encrypted-media"
              onError={() => {
                setTrailerFailed(true);
                setIsPlayingAutoTrailer(false);
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "125vw",
                height: "125vh",
                transform: "translate(-50%, -50%) scale(1.08)",
                border: "none",
                pointerEvents: "none",
              }}
            />
          </div>
        )}
      </div>

      {/* Floating Single Toggle Button for Trailer Preview (Hide / Show) */}
      {!trailerFailed && trailerEmbedUrl && (
        <div
          style={{
            position: "absolute",
            top: "92px",
            right: "48px",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
          }}
        >
          {isPlayingAutoTrailer && !isTrailerHidden ? (
            <button
              type="button"
              onClick={() => {
                setIsPlayingAutoTrailer(false);
                setIsTrailerHidden(true);
              }}
              title="Hide Trailer Preview"
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                background: "rgba(10, 14, 22, 0.65)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.5)",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e50914";
                e.currentTarget.style.borderColor = "#e50914";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(10, 14, 22, 0.65)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
              }}
            >
              <span>Hide Trailer</span>
            </button>
          ) : isTrailerHidden ? (
            <button
              type="button"
              onClick={() => {
                setIsTrailerHidden(false);
                setIsPlayingAutoTrailer(true);
              }}
              title="Watch Trailer Preview"
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                background: "rgba(10, 14, 22, 0.65)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.5)",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e50914";
                e.currentTarget.style.borderColor = "#e50914";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(10, 14, 22, 0.65)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
              }}
            >
              <PlayIcon size={12} fill="#ffffff" color="#ffffff" />
              <span>Show Trailer</span>
            </button>
          ) : null}
        </div>
      )}



      {/* Content Container: Left Info & Controls + Right Starring/Directors */}
      <div
        className="details-hero-content"
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "48px",
          width: "100%",
          flexWrap: "wrap",
          marginBottom: isFullscreen ? "0px" : "36px",
          opacity: isFullscreen ? 0.05 : 1,
          transform: isFullscreen ? "translateY(24px)" : "translateY(0)",
          transition:
            "opacity 0.45s ease-out 0.15s, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
        }}
      >
        {/* Left Column: Title / Logo, Subtitle, Actions, Plot */}
        <div
          className="details-hero-meta-col"
          style={{
            flex: "1 1 640px",
            maxWidth: "760px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Main Title: Official Movie Logo Image or Original Poster Font */}
          {!hasAnyRealDetails && !tmdb ? (
            <div
              className="skeleton-shimmer"
              style={{
                width: "clamp(260px, 40vw, 440px)",
                height: "clamp(48px, 6vw, 75px)",
                borderRadius: "14px",
                marginBottom: "6px",
              }}
            />
          ) : tmdb?.logoUrl ? (
            <div style={{ marginBottom: "6px", maxWidth: "min(100%, 460px)" }}>
              <img
                src={tmdb.logoUrl}
                alt={displayTitle}
                style={{
                  maxHeight: "125px",
                  maxWidth: "100%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 6px 24px rgba(0,0,0,0.9))",
                }}
              />
            </div>
          ) : (
            <h1
              className="details-hero-title"
              style={{
                fontSize: "clamp(34px, 5.2vw, 62px)",
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.04,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                fontFamily: "'Outfit', 'Cinzel', system-ui, sans-serif",
                margin: 0,
                textShadow: "0 4px 24px rgba(0,0,0,0.95), 0 0 14px rgba(0,0,0,0.7)",
              }}
            >
              {displayTitle}
            </h1>
          )}

          {/* Subtitle Line (Genres · Year · Seasons / Runtime · Ends · Rated · Star Rating · Liked Percent) */}
          {!hasAnyRealDetails && !tmdb ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
              <div className="skeleton-shimmer" style={{ width: "130px", height: "18px", borderRadius: "6px" }} />
              <div className="skeleton-shimmer" style={{ width: "55px", height: "18px", borderRadius: "6px" }} />
              <div className="skeleton-shimmer" style={{ width: "80px", height: "18px", borderRadius: "6px" }} />
              <div className="skeleton-shimmer" style={{ width: "95px", height: "18px", borderRadius: "6px" }} />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                fontSize: "14px",
                fontWeight: 600,
                color: "#cbd5e1",
              }}
            >
              {genres.length > 0 && (
                <span style={{ color: "#ffffff", fontWeight: 700 }}>
                  {genres.slice(0, 3).join(", ")}
                </span>
              )}

              {year && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                  <span>{year}{isSeries ? "–" : ""}</span>
                </>
              )}

              {isSeries && tmdb?.seasonsCount && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                  <span>{tmdb.seasonsCount} {tmdb.seasonsCount === 1 ? "Season" : "Seasons"}</span>
                </>
              )}

              {/* Content / Age Rating Badge */}
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.14)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "0.04em",
                }}
              >
                {contentRating}
              </span>

              {/* Star Rating */}
              {rating && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#ffd700",
                  }}
                >
                  <StarIcon size={14} fill="#ffd700" color="#ffd700" />
                  <span style={{ fontWeight: 800 }}>{rating}</span>
                </div>
              )}

              {/* Like percentage */}
              <span
                style={{
                  color: "#4ade80",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ThumbsUpIcon size={13} color="#4ade80" />
                <span>{likePercent}% Liked</span>
              </span>
            </div>
          )}

          {/* Synopsis Description with Functional Show More / Less Toggle */}
          {!plot && !hasAnyRealDetails && !tmdb ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "6px 0", maxWidth: "820px" }}>
              <div className="skeleton-shimmer" style={{ width: "98%", height: "16px", borderRadius: "6px" }} />
              <div className="skeleton-shimmer" style={{ width: "88%", height: "16px", borderRadius: "6px" }} />
              <div className="skeleton-shimmer" style={{ width: "65%", height: "16px", borderRadius: "6px" }} />
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <p
                className="details-hero-synopsis"
                style={{
                  fontSize: "16.5px",
                  lineHeight: 1.65,
                  color: "#e2e8f0",
                  margin: "6px 0",
                  textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  maxWidth: "820px",
                }}
              >
                {plot && plot.length > 300 && !isExpandedSynopsis
                  ? `${plot.slice(0, 300).trim()}...`
                  : plot}
              </p>
              {plot && plot.length > 300 && (
                <button
                  type="button"
                  onClick={() => setIsExpandedSynopsis(!isExpandedSynopsis)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    padding: 0,
                    marginTop: "4px",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    opacity: 0.9,
                  }}
                >
                  {isExpandedSynopsis ? "Show Less" : "Show More"}
                </button>
              )}
            </div>
          )}

          {/* Action Buttons Row matching Cno.to and Cinejoy (Screenshot 1 & 2) */}
          <div
            className="details-action-buttons-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            {isUnreleased ? (
              <>
                {/* Prominent Coming Soon / Releasing Date Capsule for Unreleased Movies */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "13px 28px",
                    borderRadius: "999px",
                    background: "#e50914",
                    border: "1px solid #e50914",
                    color: "#ffffff",
                    fontSize: "14.5px",
                    fontWeight: 800,
                    letterSpacing: "0.01em",
                    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.45)",
                  }}
                >
                  <span>
                    {firstAiredFormatted ? `Releasing ${firstAiredFormatted}` : "Coming Soon"}
                  </span>
                </div>

                {/* Watch Trailer Button for Unreleased Titles */}
                {activeTrailerEmbed && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrailerHidden(false);
                      setIsPlayingAutoTrailer(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "13px 24px",
                      borderRadius: "999px",
                      background: "rgba(255, 255, 255, 0.12)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.22)",
                      color: "#ffffff",
                      fontSize: "14.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.04)";
                      e.currentTarget.style.background = "#e50914";
                      e.currentTarget.style.borderColor = "#e50914";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
                    }}
                  >
                    <PlayIcon size={16} fill="#ffffff" color="#ffffff" />
                    <span>Watch Trailer</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {/* 1. Play Button - Solid Cinema Red (Rule 2) */}
                <button
                  className="details-action-btn details-stream-btn"
                  onClick={onPlayPrimary || (() => onToggleTab("stream"))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "13px 30px",
                    borderRadius: "999px",
                    background: "#e50914",
                    color: "#ffffff",
                    fontSize: "14.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    border: "1px solid #e50914",
                    boxShadow: "0 4px 14px rgba(229, 9, 20, 0.45)",
                    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.04)";
                    e.currentTarget.style.background = "#f40612";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "#e50914";
                  }}
                >
                  <PlayIcon size={16} fill="#ffffff" color="#ffffff" />
                  <span>{isSeries ? "Play S1 E1" : "Play"}</span>
                </button>

                {/* 2. Stream Links / Servers Button - Frosted Glass Capsule */}
                <button
                  type="button"
                  onClick={() => onToggleTab("stream")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 22px",
                    borderRadius: "999px",
                    background: activeTab === "stream" ? "rgba(229, 9, 20, 0.25)" : "rgba(255, 255, 255, 0.10)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: activeTab === "stream" ? "1px solid #e50914" : "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.04)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = activeTab === "stream" ? "rgba(229, 9, 20, 0.25)" : "rgba(255, 255, 255, 0.10)";
                  }}
                >
                  <FilmIcon size={15} color="#ffffff" />
                  <span>Stream Links</span>
                </button>

                {/* 3. Download Button - Frosted Glass Capsule */}
                <button
                  type="button"
                  onClick={() => onToggleTab("download")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 22px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.10)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.04)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                  }}
                >
                  <DownloadIcon size={15} color="#ffffff" />
                  <span>Download</span>
                </button>
              </>
            )}

            {/* 4. Circular Action Button: Add to Watchlist (+) */}
            <button
              type="button"
              onClick={() => {
                const nowSaved = toggleSavedItem(mediaPostItem);
                setIsWatchlisted(nowSaved);
                if (nowSaved) {
                  toast.success(`Added "${displayTitle}" to Watchlist`);
                } else {
                  toast.info(`Removed "${displayTitle}" from Watchlist`);
                }
              }}
              title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
              aria-label="Add to Watchlist"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: isWatchlisted ? "#e50914" : "rgba(255, 255, 255, 0.10)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: isWatchlisted
                  ? "1px solid #e50914"
                  : "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                if (!isWatchlisted) e.currentTarget.style.background = "rgba(255, 255, 255, 0.20)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                if (!isWatchlisted) e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
              }}
            >
              {isWatchlisted ? <CheckIcon size={18} color="#ffffff" /> : <PlusIcon size={18} color="#ffffff" />}
            </button>

            {/* 5. Circular Action Button: Like (ThumbsUp) */}
            <button
              type="button"
              onClick={() => {
                if (!isUserSignedIn()) {
                  toast.info("Sign up to like movies and personalize your experience");
                  window.dispatchEvent(new CustomEvent("cinema:open_create_account"));
                  return;
                }
                setIsLiked(!isLiked);
              }}
              title={isLiked ? "Liked" : "Like"}
              aria-label="Like"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: isLiked ? "rgba(229, 9, 20, 0.25)" : "rgba(255, 255, 255, 0.10)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: isLiked
                  ? "1px solid #e50914"
                  : "1px solid rgba(255, 255, 255, 0.18)",
                color: isLiked ? "#ff4d4d" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                if (!isLiked) e.currentTarget.style.background = "rgba(255, 255, 255, 0.20)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                if (!isLiked) e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
              }}
            >
              <ThumbsUpIcon size={16} fill={isLiked ? "#ff4d4d" : "none"} color={isLiked ? "#ff4d4d" : "#ffffff"} />
            </button>

            {/* 6. Circular Action Button: More (...) -> Opens MediaContextMenu */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuPos({ x: rect.right, y: rect.bottom + 6 });
                setContextMenuOpen((prev) => !prev);
              }}
              title="More options"
              aria-label="More options"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.10)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.20)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
              }}
            >
              <MoreHorizontalIcon size={18} color="#ffffff" />
            </button>

            {contextMenuOpen && (
              <MediaContextMenu
                post={{
                  id: tmdb?.id || String(displayTitle),
                  tmdbId: tmdb?.id,
                  title: displayTitle,
                  image: posterImage,
                  backdrop: backdropImage,
                  type: isSeries ? "tv" : "movie",
                  year: year || (tmdb as any)?.release_date?.slice(0, 4) || (tmdb as any)?.first_air_date?.slice(0, 4),
                  rating: realRating || rating,
                } as any}
                isOpen={contextMenuOpen}
                onClose={() => setContextMenuOpen(false)}
                onPlay={() => {
                  setContextMenuOpen(false);
                  if (onPlayPrimary) onPlayPrimary();
                }}
                onOpenDownloads={() => {
                  setContextMenuOpen(false);
                  onToggleTab("download");
                }}
                position={menuPos}
              />
            )}

            {/* 7. Circular Action Button: Mute / Sound Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute" : "Mute"}
              aria-label="Sound Toggle"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.10)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.20)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
              }}
            >
              {isMuted ? <VolumeXIcon size={18} color="#ffffff" /> : <Volume2Icon size={18} color="#ffffff" />}
            </button>
          </div>

          {/* Dynamic Links Drawer Rendered Here as Children */}
          {children}
        </div>

        {/* Right Column: Starring & Directors matching Cno.to Screenshot 1 & 2 */}
        <div
          className="details-hero-specs-card"
          style={{
            flex: "0 0 350px",
            minWidth: "320px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            background: "rgba(10, 13, 20, 0.45)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            padding: "26px 28px",
            boxShadow: "0 20px 48px rgba(0, 0, 0, 0.55)",
          }}
        >
          {/* While specs are loading: render elegant specs skeleton shimmer */}
          {!hasAnyRealDetails && !tmdb && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="skeleton-shimmer" style={{ width: "80px", height: "12px", borderRadius: "4px" }} />
                <div className="skeleton-shimmer" style={{ width: "230px", height: "16px", borderRadius: "6px" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="skeleton-shimmer" style={{ width: "90px", height: "12px", borderRadius: "4px" }} />
                <div className="skeleton-shimmer" style={{ width: "170px", height: "16px", borderRadius: "6px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="skeleton-shimmer" style={{ width: "90px", height: "14px", borderRadius: "4px" }} />
                <div className="skeleton-shimmer" style={{ width: "100px", height: "14px", borderRadius: "4px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="skeleton-shimmer" style={{ width: "70px", height: "14px", borderRadius: "4px" }} />
                <div className="skeleton-shimmer" style={{ width: "110px", height: "14px", borderRadius: "4px" }} />
              </div>
            </div>
          )}

          {/* Starring */}
          {tmdb?.cast && tmdb.cast.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span
                style={{
                  fontSize: "13px",
                  color: "rgba(255, 255, 255, 0.55)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Starring
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {tmdb.cast.slice(0, 4).map((c, idx) => (
                  <span
                    key={c.id || idx}
                    onClick={() => onSelectPerson && onSelectPerson(c.id)}
                    style={{
                      fontSize: "15px",
                      color: "#ffffff",
                      fontWeight: 650,
                      lineHeight: "1.45",
                      cursor: "pointer",
                      textDecoration: "none",
                      textDecorationColor: "rgba(255, 255, 255, 0.4)",
                      textUnderlineOffset: "3px",
                      transition: "color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#e50914";
                      e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.textDecoration = "none";
                    }}
                  >
                    {c.name}{idx < Math.min(tmdb.cast.length, 4) - 1 ? "," : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Directors & Creators */}
          {(() => {
            const hasCreators = (tmdb?.creatorsList && tmdb.creatorsList.length > 0) || (tmdb?.creators && tmdb.creators.length > 0);
            const label = creatorOrDirector?.label || (hasCreators ? "Creators" : "Directors");

            let list: Array<{ id?: number; name: string }> = [];
            if (tmdb?.creatorsList && tmdb.creatorsList.length > 0) {
              list = tmdb.creatorsList;
            } else if (tmdb?.directorsList && tmdb.directorsList.length > 0) {
              list = tmdb.directorsList;
            } else if (tmdb?.creators && tmdb.creators.length > 0) {
              list = tmdb.creators.map((name) => ({ name }));
            } else if (tmdb?.directors && tmdb.directors.length > 0) {
              list = tmdb.directors.map((name) => ({ name }));
            } else if (creatorOrDirector?.value) {
              list = creatorOrDirector.value
                .split(",")
                .map((s) => ({ name: s.trim() }))
                .filter((s) => s.name);
            }

            if (list.length === 0) return null;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(255, 255, 255, 0.55)",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {list.map((d, idx) => (
                    <span
                      key={d.id || `${d.name}-${idx}`}
                      onClick={() => {
                        if (d.id && onSelectPerson) {
                          onSelectPerson(d.id);
                        }
                      }}
                      style={{
                        fontSize: "15px",
                        color: "#ffffff",
                        fontWeight: 650,
                        lineHeight: "1.45",
                        cursor: "pointer",
                        textDecoration: "none",
                        textDecorationColor: "rgba(255, 255, 255, 0.4)",
                        textUnderlineOffset: "3px",
                        transition: "color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#e50914";
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#ffffff";
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {d.name}{idx < list.length - 1 ? "," : ""}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Real Release Date */}
          {firstAiredFormatted && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "10px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "14px",
              }}
            >
              <span style={{ color: "rgba(255, 255, 255, 0.65)", fontWeight: 600 }}>Release Date</span>
              <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "15px" }}>{firstAiredFormatted}</span>
            </div>
          )}

          {/* Real Runtime with Ends Time */}
          {runtime && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "10px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "14px",
              }}
            >
              <span style={{ color: "rgba(255, 255, 255, 0.65)", fontWeight: 600 }}>Runtime</span>
              <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "15px" }}>
                {endsTime ? `${runtime} • Ends ${endsTime}` : runtime}
              </span>
            </div>
          )}

          {/* Real Budget (in INR for Indian movies, USD for international) */}
          {tmdb?.budget && tmdb.budget > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "10px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "14px",
              }}
            >
              <span style={{ color: "rgba(255, 255, 255, 0.65)", fontWeight: 600 }}>Budget</span>
              <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "15px" }}>{formatCurrency(tmdb.budget)}</span>
            </div>
          ) : null}

          {/* Real Revenue (in INR for Indian movies, USD for international) */}
          {tmdb?.revenue && tmdb.revenue > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "10px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "14px",
              }}
            >
              <span style={{ color: "rgba(255, 255, 255, 0.65)", fontWeight: 600 }}>Revenue</span>
              <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "15px" }}>{formatCurrency(tmdb.revenue)}</span>
            </div>
          ) : null}

          {/* Status & Technical Tagline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "10px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "14px",
            }}
          >
            <span style={{ color: "rgba(255, 255, 255, 0.65)", fontWeight: 600 }}>Status</span>
            <span
              style={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "15px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {displayStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
