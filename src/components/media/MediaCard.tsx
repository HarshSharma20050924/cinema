import React, { useState, useEffect } from "react";
import { StarIcon, FilmIcon } from "../../icons";
import type { Post } from "../../types";

interface MediaCardProps {
  post: Post;
  onClick: (post: Post) => void;
  hideProviderBadge?: boolean;
}

const posterCache = new Map<string, string>();

export function parseTitleAndYear(raw: string) {
  if (!raw) return { title: "", year: "", language: "" };

  // Remove Telegram @ handles, websites, and ripper group prefixes
  let str = raw
    .replace(/^@\S+\s*/g, "")
    .replace(/^(?:www\s*\.?\s*\S+|filmy4wap\s*(?:blog)?|tamildbox|bolly4u|cinemavilla)\s*/gi, "")
    .trim();

  // Extract language if present (Hindi, Tamil, Telugu, Dual Audio, etc.)
  const langMatch = str.match(/\b(Hindi|Dual Audio|Multi Audio|Tamil|Telugu|Dubbed)\b/i);
  const language = langMatch ? langMatch[1] : "";

  // Extract year if found (19xx or 20xx)
  const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : "";

  // Strip quality tags, brackets, resolutions, "Full Movie", pipes, scene groups, episode codes
  let clean = str
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\|.*$/g, "")
    .replace(
      /\b(480p|720p|1080p|2160p|4k|hd|web-dl|webrip|bluray|brrip|bdrip|hdrip|dvdrip|x264|x265|hevc|remux|hq|hdtc|cam|camrip|predvd|pre-dvd|v2|untouched|dual audio|hindi|english|tamil|telugu|esub|multi audio|clean|uncut|complete|full movie|all episodes|series|season\s*\d+|s\d+e\d+|s\d+|e\d+|episode\s*\d+|megusta|cakes|rawr|grace|glxtv|galaxytv|flux|ntb|pahe|yify|yts|eztv|proper|repack|rerip|hdtv|ddp\d*(?:\.\d*)?|atmos|aac\d*(?:\.\d*)?|amzn|nf|dsnp|atvp|max|paramount|durban|phd|ac|lc|gs|cftd|unrated|extended)\b/gi,
      ""
    )
    .replace(/&amp;/gi, " ")
    .replace(/[-_.:]+/g, " ")
    .replace(/[@&|\-]+$/g, "")
    .replace(/^[@&|\-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // If still ends with '&' or special char
  clean = clean.replace(/\s*&\s*$/, "").replace(/^\s*&\s*/, "").trim();

  if (!clean) clean = str.split(/[-|[(]/)[0].trim();
  return { title: clean, year, language };
}

interface MediaCardProps {
  post: Post;
  onClick: (post: Post) => void;
  hideProviderBadge?: boolean;
  priority?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  post,
  onClick,
  hideProviderBadge = false,
  priority = false,
}) => {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [cinemetaPoster, setCinemetaPoster] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const { title: cleanTitle, year: extractedYear, language: extractedLang } = parseTitleAndYear(post.title);

  // Synchronous direct poster from post prop (enforce https to prevent mixed content)
  const rawPoster =
    post.image && typeof post.image === "string" && post.image.trim() !== ""
      ? post.image.trim()
      : null;
  const directPoster = rawPoster
    ? rawPoster.replace(/^http:\/\/image\.tmdb\.org\//i, "https://image.tmdb.org/").replace(/^http:\/\//i, "https://")
    : null;

  // Active poster with graceful proxy / Cinemeta resolution
  const activePoster =
    cinemetaPoster ||
    (directPoster
      ? useProxy
        ? `/api/image-proxy?url=${encodeURIComponent(directPoster)}`
        : directPoster
      : null);

  // Reset state on post change or manual reload
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
    setUseProxy(false);
    setCinemetaPoster(null);
    setRetryCount(0);
  }, [post.link, post.image, reloadKey]);

  // Cinemeta lookup helper
  const fetchCinemeta = React.useCallback(async () => {
    if (!cleanTitle) return;
    const cacheKey = cleanTitle.toLowerCase();
    if (posterCache.has(cacheKey)) {
      const cached = posterCache.get(cacheKey);
      if (cached) {
        setCinemetaPoster(cached);
        setImgError(false);
        setImgLoaded(false);
      }
      return;
    }
    try {
      const res = await fetch(`/api/poster?query=${encodeURIComponent(cleanTitle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.poster) {
          posterCache.set(cacheKey, data.poster);
          setCinemetaPoster(data.poster);
          setImgError(false);
          setImgLoaded(false);
        }
      }
    } catch (_) {}
  }, [cleanTitle]);

  // Auto-reload failed images automatically up to 4 times
  useEffect(() => {
    if (imgError && retryCount < 4) {
      const delay = Math.min(1200 * Math.pow(1.4, retryCount), 4000);
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1);
        setImgError(false);
        setImgLoaded(false);
        setReloadKey((k) => k + 1);
        fetchCinemeta();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [imgError, retryCount, fetchCinemeta]);

  // Initial Cinemeta fetch only if post has no image
  useEffect(() => {
    if (!directPoster) {
      fetchCinemeta();
    }
  }, [directPoster, fetchCinemeta]);

  const handleImageSuccess = () => {
    setImgLoaded(true);
    setImgError(false);
  };

  const handleImageFailure = () => {
    // Stage 1: Try backend image proxy for scraper domains blocked by browser shields
    if (directPoster && !useProxy) {
      setUseProxy(true);
      setImgLoaded(false);
      return;
    }
    // Stage 2: Try Cinemeta if not tried yet
    if (!cinemetaPoster) {
      fetchCinemeta();
    }
    // Stage 3: Dismiss skeleton and reveal clean title card fallback
    setImgError(true);
    setImgLoaded(true);
  };

  // Immediate cache check & safety timeout to permanently kill infinite skeletons
  useEffect(() => {
    if (!activePoster) {
      // If no poster is available, dismiss skeleton quickly to show clean card
      const t = setTimeout(() => {
        setImgLoaded(true);
      }, 1500);
      return () => clearTimeout(t);
    }

    // Check if browser already loaded image from disk/memory cache
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setImgLoaded(true);
      } else {
        handleImageFailure();
      }
      return;
    }

    // Hard safety guard: Never stay as an infinite skeleton past 2.8s
    const timer = setTimeout(() => {
      if (!imgLoaded) {
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
          setImgLoaded(true);
        } else {
          handleImageFailure();
        }
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [activePoster, useProxy, cinemetaPoster, imgLoaded]);

  // Extract season if present (e.g. S8, Season 7)
  const seasonMatch = post.title?.match(/\b(?:season\s*|s0*)(\d+)\b/i);
  const seasonTag = seasonMatch ? `S${seasonMatch[1]}` : null;

  // Extract rating from post.tag if numeric, e.g. "8.4" or "★ 8.4"
  const rawTag = post.tag ? post.tag.replace(/[★⭐]/g, "").trim() : "";
  const isNumericRating = /^\d+(\.\d+)?$/.test(rawTag);
  const rating = isNumericRating ? rawTag : null;
  const badgeTag = !isNumericRating && rawTag ? rawTag : null;

  // Language tag detection (e.g. Hindi, Dual Audio, Tamil)
  const detectedLang =
    post.title?.match(/\b(Hindi|Dual Audio|Multi Audio|Tamil|Telugu|Dubbed)\b/i)?.[1] ||
    extractedLang ||
    null;

  return (
    <div
      onClick={() => onClick(post)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "160px",
        margin: "0 auto",
        position: "relative",
        userSelect: "none",
      }}
    >
      <div
        className="poster-container"
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "2/3",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#0c0c0c",
          transform: isHovered ? "translateY(-6px)" : "translateY(0)",
          boxShadow: isHovered
            ? "0 18px 36px rgba(0, 0, 0, 0.8), 0 0 24px rgba(229, 9, 20, 0.2)"
            : "0 4px 14px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Skeleton Shimmer: ONLY shown while an active poster URL is currently pending */}
        {!imgLoaded && !imgError && activePoster && (
          <div
            className="skeleton-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
            }}
          />
        )}

        {/* Fallback Movie Card UI: Clean, legible title card with 1-click reload */}
        {(!activePoster || imgError) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(145deg, #18181c, #0d0d0f)",
              color: "rgba(255, 255, 255, 0.7)",
              padding: "14px 10px",
              textAlign: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255, 255, 255, 0.4)",
              }}
            >
              <FilmIcon size={22} />
            </div>

            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {cleanTitle || post.title}
            </div>

            {extractedYear && (
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)", fontWeight: 600 }}>
                {extractedYear}
              </span>
            )}

            {retryCount < 4 ? (
              <div
                style={{
                  marginTop: "6px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  background: "#e50914",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(229, 9, 20, 0.4)",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    border: "2px solid rgba(255, 255, 255, 0.35)",
                    borderTopColor: "#ffffff",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span>Auto-reloading...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRetryCount(0);
                  setReloadKey((k) => k + 1);
                }}
                style={{
                  marginTop: "4px",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  background: "#e50914",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 2px 8px rgba(229, 9, 20, 0.4)",
                }}
              >
                <span>↻ Reload</span>
              </button>
            )}
          </div>
        )}

        {/* Poster Image */}
        {!imgError && activePoster && (
          <img
            ref={imgRef}
            key={activePoster}
            src={activePoster}
            alt={cleanTitle || post.title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={handleImageSuccess}
            onError={handleImageFailure}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: imgLoaded ? 1 : 0,
              transform: isHovered ? "scale(1.10)" : "scale(1.0)",
              transition: "opacity 0.25s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "transform, opacity",
            }}
          />
        )}


        {/* Quality or custom tag if present (e.g. CAM, 4K) */}
        {badgeTag && (
          <div
            style={{
              position: "absolute",
              top: "9px",
              right: "9px",
              padding: "3px 8px",
              borderRadius: "999px",
              background: "rgba(229, 9, 20, 0.85)",
              backdropFilter: "blur(6px)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              zIndex: 2,
            }}
          >
            {badgeTag}
          </div>
        )}

        {/* Card bottom info overlay - visible so titles are easily readable, blooms & details expand on hover */}
        <div
          className="media-card-hover-overlay"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "42px 12px 12px 12px",
            background:
              "linear-gradient(to top, rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 0.65) 65%, transparent 100%)",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 2px 6px rgba(0,0,0,0.9)",
            }}
          >
            {post.title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {rating && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  color: "#ffd700",
                }}
              >
                <StarIcon size={12} fill="#ffd700" color="#ffd700" />
                <span>{rating}</span>
              </span>
            )}
            {extractedYear && (
              <span style={{ color: "#94a3b8" }}>{extractedYear}</span>
            )}
          </div>
        </div>
      </div>

      {/* Title & Metadata below card - directly displays what provider provides */}
      <div className="media-card-static-info" style={{ marginTop: "7px", padding: "0 2px" }}>
        <div
          title={post.title}
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#f1f5f9",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {post.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "3px",
            fontSize: "11px",
            color: "#94a3b8",
          }}
        >
          {extractedYear && <span>{extractedYear}</span>}
          {rating && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                color: "#ffd700",
                fontWeight: 700,
              }}
            >
              <StarIcon size={10} fill="#ffd700" color="#ffd700" />
              <span>{rating}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
