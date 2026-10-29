import React, { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { StarIcon, FilmIcon } from "../../icons";
import { fetchTMDBDetails } from "../../api/tmdb";
import { MediaContextMenu } from "./MediaContextMenu";
import type { Post } from "../../types";

export const posterCache = new Map<string, string>();

const BACKDROP_CACHE_STORAGE_KEY = "cinema_backdrop_cache";

const initBackdropCache = (): Map<string, string> => {
  const map = new Map<string, string>();
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(BACKDROP_CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string" && v) map.set(k.toLowerCase().trim(), v);
        }
      }
    } catch (_) {}
  }
  return map;
};

export const backdropCache = initBackdropCache();

export const persistBackdrop = (key: string, url: string) => {
  if (!key || !url) return;
  const k = key.toLowerCase().trim();
  backdropCache.set(k, url);
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(BACKDROP_CACHE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[k] = url;
      const keys = Object.keys(parsed);
      if (keys.length > 350) {
        delete parsed[keys[0]];
      }
      localStorage.setItem(BACKDROP_CACHE_STORAGE_KEY, JSON.stringify(parsed));
    } catch (_) {}
  }
};

export const genreCache = new Map<string, string>();
export const logoCache = new Map<string, string>();
export const trailerCache = new Map<string, string>();
export const ratingCache = new Map<string, string>();

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
  layout?: "landscape" | "portrait";
  rank?: number;
  badge?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  post,
  onClick,
  hideProviderBadge = false,
  priority = false,
  layout = "portrait",
  rank,
  badge,
}) => {
  const isLandscape = layout === "landscape";
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [proxyStep, setProxyStep] = useState(0);
  const [logoProxyStep, setLogoProxyStep] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const [cinemetaPoster, setCinemetaPoster] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | undefined>(undefined);
  const rafRef = React.useRef<number | null>(null);
  const hoverTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasAttemptedFallbackRef = React.useRef(false);

  const { title: cleanTitle, year: extractedYear, language: extractedLang } = parseTitleAndYear(post.title);

  const [trailerKey, setTrailerKey] = useState<string | null>(() => {
    if (!cleanTitle) return null;
    return trailerCache.get(cleanTitle.toLowerCase()) || null;
  });
  const [showHoverTrailer, setShowHoverTrailer] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (isLandscape) {
      hoverTimerRef.current = setTimeout(() => {
        setShowHoverTrailer(true);
      }, 3500);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = isLandscape ? 10 : 8;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ x: rotateX, y: rotateY });
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsHovered(false);
    setShowHoverTrailer(false);
    setTilt({ x: 0, y: 0 });
  };

  // Extract initial genre from post, genres field, or cache (NEVER fake "Action")
  const getInitialGenre = (): string => {
    if (post.genres) {
      const first = post.genres.split(/[,/|•]/)[0].trim();
      if (first) return first;
    }
    if ((post as any).genre) {
      const first = String((post as any).genre).split(/[,/|•]/)[0].trim();
      if (first) return first;
    }
    if (cleanTitle && genreCache.has(cleanTitle.toLowerCase())) {
      return genreCache.get(cleanTitle.toLowerCase()) || "";
    }
    return "";
  };

  const [tmdbBackdrop, setTmdbBackdrop] = useState<string | null>(() => {
    if (!isLandscape) return null;
    if (post.backdropUrl) return post.backdropUrl;
    if (!cleanTitle) return null;
    return backdropCache.get(cleanTitle.toLowerCase()) || null;
  });
  const [tmdbLogo, setTmdbLogo] = useState<string | null>(() => {
    if (post.logoUrl) return post.logoUrl;
    if (!cleanTitle) return null;
    return logoCache.get(cleanTitle.toLowerCase()) || null;
  });
  const [cardGenre, setCardGenre] = useState<string>(getInitialGenre);

  // Direct poster from post prop (enforce https to prevent mixed content)
  const rawPoster =
    post.image && typeof post.image === "string" && post.image.trim() !== ""
      ? post.image.trim()
      : null;
  const directPoster = rawPoster
    ? rawPoster.replace(/^http:\/\/image\.tmdb\.org\//i, "https://image.tmdb.org/").replace(/^http:\/\//i, "https://")
    : null;

  const isBogusUrl = (u: string | null | undefined): boolean => {
    if (!u) return true;
    return /image\.tmdb\.org\/t\/p\/.*\/([a-z0-9_]{1,6}\.jpg|a0a1a2|b0b1|4u\.jpg|7c\.jpg)/i.test(u);
  };

  // Multi-tier candidate poster with automatic proxying
  // For landscape cards, STRICTLY prioritize landscape backdrops so portraits never get cropped
  const validBackdrop = !isBogusUrl(post.backdropUrl) ? post.backdropUrl : null;
  const validTmdbBackdrop = !isBogusUrl(tmdbBackdrop) ? tmdbBackdrop : null;
  const landscapeCandidate = validBackdrop || validTmdbBackdrop;
  const candidatePoster = isLandscape
    ? (landscapeCandidate || (post.image && post.image.includes("/background/") && !isBogusUrl(post.image) ? post.image : null) || directPoster)
    : (cinemetaPoster || directPoster || validBackdrop || (post.image && !isBogusUrl(post.image) ? post.image.replace(/^http:\/\//i, "https://") : null));

  const activePoster = candidatePoster ? getProxiedUrl(candidatePoster, proxyStep) : null;

  // Active extracted logo with proxying
  const rawLogo = tmdbLogo || post.logoUrl;
  const activeLogo = rawLogo ? getProxiedUrl(rawLogo, logoProxyStep) : null;

  // Fetch wide backdrop, logo, and accurate genre from TMDB for cards
  useEffect(() => {
    if (!cleanTitle) return;
    const cacheKey = cleanTitle.toLowerCase();

    // Check memory caches first
    if (genreCache.has(cacheKey)) {
      const cachedG = genreCache.get(cacheKey);
      if (cachedG) setCardGenre(cachedG);
    }
    // Always resolve backdrop from cache so click opens instant landscape full-screen hero
    if (backdropCache.has(cacheKey)) {
      setTmdbBackdrop(backdropCache.get(cacheKey) || null);
    }
    if (isLandscape && logoCache.has(cacheKey)) {
      setTmdbLogo(logoCache.get(cacheKey) || null);
    }

    const hasBackdrop = backdropCache.has(cacheKey);
    const hasLogo = logoCache.has(cacheKey);
    const hasGenre = genreCache.has(cacheKey);

    if (hasBackdrop && hasGenre && (!isLandscape || hasLogo)) {
      return;
    }

    const imdbId = (post as any).imdbId || (post as any).imdb_id;
    fetchTMDBDetails(cleanTitle, imdbId, extractedYear, post.tmdbId)
      .then((d) => {
        if (d) {
          if (d.backdropUrl) {
            persistBackdrop(cacheKey, d.backdropUrl);
            setTmdbBackdrop(d.backdropUrl);
          } else {
            backdropCache.set(cacheKey, "");
          }
          if (d.logoUrl) {
            logoCache.set(cacheKey, d.logoUrl);
            if (isLandscape) setTmdbLogo(d.logoUrl);
          } else {
            logoCache.set(cacheKey, "");
          }
          if (d.genres && d.genres.length > 0) {
            genreCache.set(cacheKey, d.genres[0]);
            setCardGenre(d.genres[0]);
          }
          if (d.rating) {
            ratingCache.set(cacheKey, d.rating);
          }
          const tKey = d.trailers?.[0]?.key || (d.trailerEmbed?.match(/embed\/([a-zA-Z0-9_-]+)/)?.[1]);
          if (tKey) {
            trailerCache.set(cleanTitle.toLowerCase(), tKey);
            setTrailerKey(tKey);
          }
        }
      })
      .catch(() => {});
  }, [isLandscape, cleanTitle, extractedYear, post]);

  // Reset state on post change or manual reload
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
    setProxyStep(0);
    setLogoProxyStep(0);
    setLogoFailed(false);
    setCinemetaPoster(null);
    setRetryCount(0);
  }, [post.link, post.image, reloadKey]);

  // Ultimate poster lookup helper with multi-tier fallback (TMDB + Cinemeta)
  const fetchUltimatePoster = React.useCallback(async () => {
    if (!cleanTitle) return;
    const cacheKey = cleanTitle.toLowerCase();
    if (posterCache.has(cacheKey)) {
      const cached = posterCache.get(cacheKey);
      if (cached) {
        setCinemetaPoster(cached);
        setImgError(false);
      }
      return;
    }

    try {
      // Tier 1: High-res TMDB details & multi-search
      const tmdbData = await fetchTMDBDetails(cleanTitle, undefined, extractedYear);
      if (tmdbData?.posterUrl) {
        posterCache.set(cacheKey, tmdbData.posterUrl);
        setCinemetaPoster(tmdbData.posterUrl);
        setImgError(false);
        return;
      }
    } catch (_) {}

    try {
      // Tier 2: /api/poster (Backend Cinemeta)
      const res = await fetch(`/api/poster?query=${encodeURIComponent(cleanTitle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.poster) {
          posterCache.set(cacheKey, data.poster);
          setCinemetaPoster(data.poster);
          setImgError(false);
          return;
        }
      }
    } catch (_) {}

    try {
      // Tier 3: Direct Cinemeta catalog
      const cineRes = await fetch(
        `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(cleanTitle)}.json`
      );
      if (cineRes.ok) {
        const json = await cineRes.json();
        const poster = json?.metas?.[0]?.poster;
        if (poster) {
          posterCache.set(cacheKey, poster);
          setCinemetaPoster(poster);
          setImgError(false);
          return;
        }
      }
    } catch (_) {}
  }, [cleanTitle, extractedYear]);

  // Auto-reload failed images automatically up to 4 times
  useEffect(() => {
    if (imgError && retryCount < 4) {
      const delay = Math.min(1000 * Math.pow(1.3, retryCount), 3000);
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1);
        setImgError(false);
        setImgLoaded(false);
        setReloadKey((k) => k + 1);
        fetchUltimatePoster();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [imgError, retryCount, fetchUltimatePoster]);

  // Initial poster fetch only if post has no image
  useEffect(() => {
    if (!directPoster) {
      fetchUltimatePoster();
    }
  }, [directPoster, fetchUltimatePoster]);

  const handleImageSuccess = () => {
    setImgLoaded(true);
    setImgError(false);
  };

  const handleImageFailure = () => {
    // Stage 1: Try local backend/vite proxy (bypasses ISP blocks and CORS)
    if (proxyStep === 0) {
      setProxyStep(1);
      return;
    }
    // Stage 2: Try Cloudflare Pages edge proxy
    if (proxyStep === 1) {
      setProxyStep(2);
      return;
    }
    // Stage 3: Try ultimate poster source (TMDB + Cinemeta) once only
    if (!cinemetaPoster && !hasAttemptedFallbackRef.current) {
      hasAttemptedFallbackRef.current = true;
      fetchUltimatePoster();
      return;
    }
    // Stage 4: Terminate retries and mark clean fallback
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

    // Safety guard: Allow up to 6.5s before fallback so slow networks never glitch reload
    const timer = setTimeout(() => {
      if (!imgLoaded) {
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
          setImgLoaded(true);
        } else {
          handleImageFailure();
        }
      }
    }, 6500);

    return () => clearTimeout(timer);
  }, [activePoster, proxyStep, cinemetaPoster, imgLoaded]);

  // Extract season if present (e.g. S8, Season 7)
  const seasonMatch = post.title?.match(/\b(?:season\s*|s0*)(\d+)\b/i);
  const seasonTag = seasonMatch ? `S${seasonMatch[1]}` : null;

  // Extract rating from post.tag if numeric, e.g. "8.4" or "★ 8.4", or fallback to TMDB/cache
  const rawTag = post.tag ? post.tag.replace(/[★⭐]/g, "").trim() : "";
  const isNumericRating = /^(?:10(?:\.0)?|[1-9](?:\.\d)?)$/.test(rawTag);
  const postRatingVal = (post as any).rating || (post as any).vote_average || (post as any).imdbRating;
  const rating = isNumericRating
    ? rawTag
    : (postRatingVal && Number(postRatingVal) > 0
        ? Number(postRatingVal).toFixed(1)
        : (cleanTitle ? ratingCache.get(cleanTitle.toLowerCase()) : null));
  // Never show dates as right-hand red pills; only true technical quality tags (CAM, 4K, etc.)
  const isDateTag = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\b/i.test(rawTag);
  const badgeTag = (!badge && !isNumericRating && rawTag && !isDateTag) ? rawTag : null;

  // Language tag detection (e.g. Hindi, Dual Audio, Tamil)
  const detectedLang =
    post.title?.match(/\b(Hindi|Dual Audio|Multi Audio|Tamil|Telugu|Dubbed)\b/i)?.[1] ||
    extractedLang ||
    null;

  // Handler that passes resolved backdrop and logo to ensure instant seamless full-screen hero transition
  const handleCardClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const resolvedBackdrop =
      post.backdropUrl ||
      tmdbBackdrop ||
      (cleanTitle ? backdropCache.get(cleanTitle.toLowerCase()) : undefined) ||
      undefined;
    const resolvedLogo =
      post.logoUrl ||
      tmdbLogo ||
      (cleanTitle ? logoCache.get(cleanTitle.toLowerCase()) : undefined) ||
      undefined;
    const augmented: Post = {
      ...post,
      backdropUrl: resolvedBackdrop,
      logoUrl: resolvedLogo,
    };
    onClick(augmented);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "100%",
        margin: "0 auto",
        position: "relative",
        userSelect: "none",
        perspective: "1000px",
        zIndex: isHovered ? 12 : 1,
      }}
    >
      <div
        className="poster-container"
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: isLandscape ? "16/9" : "2/3",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#0c0c0c",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isLandscape ? 1.045 : 1.035}, ${isLandscape ? 1.045 : 1.035}, ${isLandscape ? 1.045 : 1.035})`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? isLandscape
              ? "0 22px 44px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0,0,0,0.5)"
              : "0 18px 36px rgba(0, 0, 0, 0.9)"
            : "0 4px 14px rgba(0, 0, 0, 0.5)",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease",
        }}
      >
        {/* Top 10 Big Bold Rank Number */}
        {typeof rank === "number" && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "10px",
              zIndex: 4,
              minWidth: "28px",
              height: "28px",
              padding: "0 7px",
              borderRadius: "8px",
              background: "rgba(8, 10, 16, 0.82)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13.5px",
              fontWeight: 900,
              lineHeight: 1,
              color: "#ffffff",
              fontFamily: "var(--font-display, 'Space Grotesk', -apple-system, sans-serif)",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.7)",
              pointerEvents: "none",
            }}
          >
            {rank}
          </div>
        )}

        {/* Date / Status Tag (e.g. 'Oct 23' for Coming Soon) styled with Navbar Frosted Glass UI */}
        {badge && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              zIndex: 4,
              padding: "4px 11px",
              borderRadius: "999px",
              background: "rgba(14, 16, 24, 0.65)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              fontSize: "11px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.3px",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
              pointerEvents: "none",
            }}
          >
            {badge}
          </div>
        )}

        {/* Hover Trailer Teaser (Landscape preview after ~850ms hover) */}
        {isLandscape && showHoverTrailer && trailerKey && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              background: "#000000",
              overflow: "hidden",
              borderRadius: "14px",
              pointerEvents: "none",
            }}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&start=10&modestbranding=1&rel=0`}
              title={cleanTitle}
              allow="autoplay; encrypted-media"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                pointerEvents: "none",
              }}
            />
          </div>
        )}

        {/* Landscape card: pure artwork with no text overlay */}

        {/* Top-Right 3-Dots Button on Hover matching Reference Image */}
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPos({ x: rect.right, y: rect.bottom + 6 });
              setContextMenuOpen(true);
            }}
            title="Options"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 4,
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "rgba(28, 30, 36, 0.8)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
              transition: "transform 0.2s ease, background 0.2s ease",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        )}
        {/* Skeleton Shimmer: Shown normally whenever the image is loading, fetching, or retrying */}
        {(!imgLoaded || (!activePoster && retryCount < 4)) && (
          <div
            className="skeleton-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background: "linear-gradient(110deg, #14171f 8%, #1f232e 18%, #14171f 33%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite linear",
            }}
          />
        )}

        {/* Fallback Movie Card UI: Clean title card only shown if all retries exhausted */}
        {imgError && retryCount >= 4 && !activePoster && (
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
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255, 255, 255, 0.4)",
              }}
            >
              <FilmIcon size={20} />
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
          </div>
        )}

        {/* Poster Image */}
        {!imgError && activePoster && (
          <img
            ref={imgRef}
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
              transform: isHovered
                ? `scale(1.12) translate3d(${tilt.y * -0.6}px, ${tilt.x * 0.6}px, 0px)`
                : "scale(1.0) translate3d(0px, 0px, 0px)",
              transition: isHovered
                ? "transform 0.08s ease-out, opacity 0.25s ease"
                : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
              willChange: "transform, opacity",
            }}
          />
        )}

        {/* Landscape Overlay: Extracted Movie Title Logo (matching banner reference like Whalefall) */}
        {isLandscape && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              padding: "14px 16px",
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.85) 100%)",
              pointerEvents: "none",
              zIndex: 3,
            }}
          >
            {/* Extracted Title Logo from TMDB poster/backdrop images (matching banner reference like Whalefall) */}
            {activeLogo && !logoFailed ? (
              <img
                src={activeLogo}
                alt={cleanTitle || post.title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                style={{
                  maxHeight: "48px",
                  maxWidth: "76%",
                  objectFit: "contain",
                  objectPosition: "left bottom",
                  filter: "drop-shadow(0 4px 16px rgba(0, 0, 0, 0.95))",
                  marginBottom: "6px",
                  display: "block",
                  transform: isHovered ? "translateY(-5px) scale(1.08)" : "translateY(0) scale(1)",
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
                  fontSize: "16px",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "0.2px",
                  textTransform: "uppercase",
                  textShadow: "0 2px 14px rgba(0, 0, 0, 0.95)",
                  lineHeight: 1.15,
                  maxWidth: "85%",
                  marginBottom: "6px",
                  transform: isHovered ? "translateY(-4px) scale(1.05)" : "translateY(0) scale(1)",
                  transformOrigin: "left bottom",
                  transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {cleanTitle || post.title}
              </div>
            )}

            {/* Genre Pill + Year (revealed smoothly on hover) */}
            {(() => {
              const displayGenre =
                cardGenre ||
                (post.genres ? post.genres.split(/[,/|•]/)[0].trim() : "") ||
                ((post as any).genre ? String((post as any).genre).split(/[,/|•]/)[0].trim() : "") ||
                (post.mediaType === "tv" ? "Series" : "");

              return (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? "translateY(0)" : "translateY(4px)",
                    transition: "opacity 0.25s ease, transform 0.25s ease",
                  }}
                >
                  {displayGenre && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.22)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.28)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#ffffff",
                        textTransform: "capitalize",
                        letterSpacing: "0.2px",
                      }}
                    >
                      {displayGenre}
                    </span>
                  )}

                  {(extractedYear || post.year) && (
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: "#ffffff",
                        letterSpacing: "0.3px",
                        textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
                      }}
                    >
                      {extractedYear || post.year}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Portrait Card Overlay on Hover (Matching Toy Story 5 reference image) */}
        {!isLandscape && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              padding: "16px 14px",
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0.92) 100%)",
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
              pointerEvents: "none",
              zIndex: 3,
            }}
          >
            {/* Movie Title */}
            <div
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.22,
                marginBottom: "6px",
                textShadow: "0 2px 10px rgba(0, 0, 0, 0.95)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {cleanTitle || post.title}
            </div>

            {/* Genre Pill + Year (Matching Reference) */}
            {(() => {
              const displayGenre =
                cardGenre ||
                (post.genres ? post.genres.split(/[,/|•]/)[0].trim() : "") ||
                ((post as any).genre ? String((post as any).genre).split(/[,/|•]/)[0].trim() : "") ||
                (post.mediaType === "tv" ? "Series" : "");

              return (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {displayGenre && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.22)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.28)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#ffffff",
                        textTransform: "capitalize",
                        letterSpacing: "0.2px",
                      }}
                    >
                      {displayGenre}
                    </span>
                  )}

                  {(extractedYear || post.year) && (
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#ffffff",
                        letterSpacing: "0.3px",
                        textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
                      }}
                    >
                      {extractedYear || post.year}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Top 10 Rank Number if present */}
        {typeof rank === "number" && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "10px",
              zIndex: 4,
              minWidth: "26px",
              height: "26px",
              padding: "0 6px",
              borderRadius: "7px",
              background: "rgba(8, 10, 16, 0.82)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12.5px",
              fontWeight: 900,
              lineHeight: 1,
              color: "#ffffff",
              fontFamily: "var(--font-display, 'Space Grotesk', -apple-system, sans-serif)",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.7)",
              pointerEvents: "none",
            }}
          >
            {rank}
          </div>
        )}

        {/* Badge tag (e.g. Diwali 2026, Dec 2025 in Coming Soon) */}
        {badge && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgba(12, 14, 20, 0.8)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.02em",
              zIndex: 4,
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.6)",
            }}
          >
            {badge}
          </div>
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
              zIndex: 4,
            }}
          >
            {badgeTag}
          </div>
        )}

      </div>

      {/* Title & Metadata below card - only shown for vertical portrait cards (hidden on landscape) */}
      {!isLandscape && (
        <div className="media-card-static-info" style={{ marginTop: "8px", padding: "0 2px" }}>
          <div
            title={cleanTitle || post.title}
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {cleanTitle || post.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "4px",
              fontSize: "11px",
              color: "rgba(255, 255, 255, 0.6)",
              fontWeight: 600,
            }}
          >
            {extractedYear && <span>{extractedYear}</span>}
            {rating && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  color: "#ffd700",
                  fontWeight: 700,
                }}
              >
                <StarIcon size={11} fill="#ffd700" color="#ffd700" />
                <span>{rating}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {contextMenuOpen && (
        <MediaContextMenu
          post={augmented}
          isOpen={contextMenuOpen}
          onClose={() => setContextMenuOpen(false)}
          onPlay={() => {
            setContextMenuOpen(false);
            onClick(augmented);
          }}
          onOpenDetails={() => {
            setContextMenuOpen(false);
            onClick(augmented);
          }}
          position={menuPos}
        />
      )}
    </div>
  );
};
