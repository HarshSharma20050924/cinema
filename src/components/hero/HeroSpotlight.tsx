import React, { useEffect, useState } from "react";
import { PlayIcon, DownloadIcon, StarIcon } from "../../icons";
import { fetchTMDBDetails, type TMDBDetails } from "../../api/tmdb";
import { parseTitleAndYear } from "../media/MediaCard";
import type { Post, Provider } from "../../types";

interface HeroSpotlightProps {
  post: Post | null;
  candidatePosts?: Post[];
  provider: Provider | null;
  onStream: (post: Post) => void;
  onDownload: (post: Post) => void;
}

// Clean release tags, rips, resolutions, etc. for clear title display and backdrop search
function cleanHeroTitle(raw: string): string {
  if (!raw) return "";
  const { title } = parseTitleAndYear(raw);
  return title
    .replace(/\b(ds4k|ds\s*4k|full\s*movie|hq|hdtc|cam|camrip|predvd|pre-dvd|dvdrip|v2|untouched)\b/gi, "")
    .replace(/[-_.:|&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// High-res image helper: upgrades low-res thumbnails to uncompressed 1080p / 4K
export const upgradeToHighRes = (url: string | null | undefined): string => {
  if (!url) return "";
  let clean = url.trim();
  // TMDB resolution upgrade
  if (clean.includes("image.tmdb.org/t/p/")) {
    return clean.replace(/\/w\d+\//, "/original/");
  }
  // Metahub / Cinemeta resolution upgrade
  if (clean.includes("images.metahub.space/")) {
    return clean
      .replace(/\/poster\/(?:small|medium)\//, "/poster/large/")
      .replace(/\/background\/(?:small|medium)\//, "/background/large/");
  }
  // Amazon / IMDb uncompressed full-res upgrade
  if (clean.includes("media-amazon.com/images/M/")) {
    return clean.replace(/\._V1_.*?\.(jpg|jpeg|png)$/i, "._V1_FMjpg_UX1920_.$1");
  }
  // WordPress scaled thumbnails
  if (clean.includes("/wp-content/uploads/")) {
    return clean.replace(/-\d+x\d+(\.(?:webp|jpg|jpeg|png))$/i, "$1");
  }
  return clean;
};

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  post: initialPost,
  candidatePosts = [],
  provider,
  onStream,
  onDownload,
}) => {
  const [activePost, setActivePost] = useState<Post | null>(initialPost);
  const [tmdb, setTmdb] = useState<TMDBDetails | null>(null);
  const [cinemetaBg, setCinemetaBg] = useState<string | null>(null);

  // Sync activePost when initialPost changes
  useEffect(() => {
    setActivePost(initialPost);
  }, [initialPost]);

  const post = activePost || initialPost;
  const cleanTitle = cleanHeroTitle(post?.title || "");
  const { year: extractedYear } = parseTitleAndYear(post?.title || "");

  // 1. Fetch TMDB details & backdrop
  useEffect(() => {
    if (!cleanTitle) {
      setTmdb(null);
      setCinemetaBg(null);
      return;
    }

    let isCurrent = true;

    // A. Query TMDB for 4K backdrop
    fetchTMDBDetails(cleanTitle, undefined, extractedYear)
      .then((data) => {
        if (!isCurrent) return;
        if (data && data.backdropUrl) {
          setTmdb(data);
        } else {
          setTmdb(data || null);
          // B. Fallback: Query Cinemeta for high-resolution background artwork
          fetch(`/api/poster?query=${encodeURIComponent(cleanTitle)}`)
            .then((r) => r.json())
            .then((json) => {
              if (!isCurrent) return;
              let bg = json?.background;
              if (!bg && json?.poster && json.poster.includes("/poster/")) {
                bg = json.poster.replace("/poster/", "/background/");
              }
              if (bg) {
                setCinemetaBg(upgradeToHighRes(bg));
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.warn("Hero TMDB fetch failed:", err);
      });

    return () => {
      isCurrent = false;
    };
  }, [cleanTitle, extractedYear]);

  // 2. Intelligent hero selection: If current post has only a low-res vertical card and no backdrop,
  // check if any candidate in the top posts has a verified 4K backdrop to showcase
  useEffect(() => {
    if (!activePost && initialPost) {
      setActivePost(initialPost);
      return;
    }
    // If active post has no TMDB backdrop and candidatePosts are available, search for a top item with backdrop
    if (activePost === initialPost && candidatePosts.length > 1 && !tmdb?.backdropUrl && !cinemetaBg) {
      let cancelled = false;
      const checkCandidates = async () => {
        for (const candidate of candidatePosts.slice(1, 6)) {
          const candidateTitle = cleanHeroTitle(candidate.title || "");
          if (!candidateTitle) continue;
          try {
            const data = await fetchTMDBDetails(candidateTitle);
            if (!cancelled && data && data.backdropUrl) {
              setActivePost(candidate);
              setTmdb(data);
              return;
            }
          } catch (_) {}
        }
      };
      checkCandidates();
      return () => {
        cancelled = true;
      };
    }
  }, [initialPost, candidatePosts, tmdb?.backdropUrl, cinemetaBg, activePost]);

  if (!post) return null;

  // Rating resolution: TMDB rating or post.tag
  const rating =
    tmdb?.rating ||
    (post.tag ? post.tag.replace(/[★⭐]/g, "").trim() : "7.8");

  // Year resolution: TMDB year or extracted year
  const year = tmdb?.year || extractedYear || "2026";

  // Media type resolution
  const mediaType =
    tmdb?.genres && tmdb.genres.length > 0 ? tmdb.genres[0] : "Movie";

  // Plot description: TMDB Overview or fallback
  const plot =
    tmdb?.overview ||
    "As conflict and intrigue unfold, unexpected heroes rise to unite allies and fight for survival in a gripping, high-stakes cinematic journey.";

  const hasTrueBackdrop = Boolean(tmdb?.backdropUrl || cinemetaBg);

  // High-res backdrop from TMDB, Cinemeta, or upgraded original post image
  const heroImage =
    (tmdb?.backdropUrl && tmdb.backdropUrl.trim()) ||
    cinemetaBg ||
    upgradeToHighRes(post.image) ||
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600";

  return (
    <div
      className="hero-spotlight-root"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "580px",
        maxHeight: "660px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 24px 44px 24px",
        paddingTop: "120px",
        marginBottom: "20px",
        overflow: "hidden",
        backgroundColor: "#000000",
      }}
    >
      {/* Full-width, crystal clear Hero Image */}
      {heroImage && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            zIndex: 1,
          }}
        >
          {/* Ambient blurred glow layer if using vertical card fallback to prevent any pixelation */}
          {!hasTrueBackdrop && (
            <div
              style={{
                position: "absolute",
                inset: "-30px",
                backgroundImage: `url(${heroImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center 30%",
                filter: "blur(42px) brightness(0.28) saturate(1.4)",
                transform: "scale(1.15)",
                zIndex: 1,
              }}
            />
          )}

          {/* Crisp, properly framed Hero Backdrop */}
          <img
            src={heroImage}
            alt={cleanTitle}
            style={{
              position: "absolute",
              top: "-4px",
              left: 0,
              width: "100%",
              height: "calc(100% + 28px)",
              objectFit: "cover",
              objectPosition: "center 28%",
              transform: "translateY(22px) scale(1.03)",
              filter: hasTrueBackdrop
                ? "brightness(0.92) contrast(1.05)"
                : "brightness(0.85) contrast(1.1)",
              zIndex: 2,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600";
            }}
          />

          {/* Optimized vertical framing gradient: gentle top shade + bottom black fade pushed down */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 20%, transparent 40%, transparent 72%, rgba(0,0,0,0.45) 86%, rgba(0,0,0,0.92) 96%, #000000 100%)",
              zIndex: 3,
            }}
          />
        </div>
      )}

      {/* Hero Content (Centered, elegant cinematic typography) */}
      <div
        className="hero-spotlight-content"
        style={{
          position: "relative",
          zIndex: 4,
          maxWidth: "760px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "12px",
        }}
      >
        {/* Title */}
        <h1
          className="hero-spotlight-title"
          style={{
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            textShadow: "0 4px 20px rgba(0, 0, 0, 0.9)",
            margin: 0,
          }}
        >
          {tmdb?.title || cleanTitle || post.title}
        </h1>

        {/* Meta Line: ★ 7.9 • 2026 • Movie */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#cbd5e1",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#ffd700",
            }}
          >
            <StarIcon size={14} fill="#ffd700" color="#ffd700" />
            <span>{rating}</span>
          </div>

          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

          <span>{year}</span>

          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

          <span style={{ color: "#94a3b8" }}>{mediaType}</span>
        </div>

        {/* Synopsis / Plot */}
        <p
          className="hero-spotlight-synopsis"
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#94a3b8",
            maxWidth: "600px",
            margin: "4px 0 10px 0",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          }}
        >
          {plot}
        </p>

        {/* CTA Buttons Row: Stream Now + Download */}
        <div
          className="hero-spotlight-actions"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            marginTop: "6px",
            flexWrap: "wrap",
          }}
        >
          {/* Stream Now Button (Solid Red, Glow) */}
          <button
            className="hero-btn-primary"
            onClick={() => onStream(post)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "12px 28px",
              borderRadius: "12px",
              background: "#e50914",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 6px 24px rgba(229, 9, 20, 0.5)",
              border: "none",
              transition: "transform 0.2s, background 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.background = "#f40612";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "#e50914";
            }}
          >
            <PlayIcon size={16} fill="#ffffff" color="#ffffff" />
            <span>Stream Now</span>
          </button>

          {/* Download Button (Dark Glass matching reference) */}
          <button
            className="hero-btn-secondary"
            onClick={() => onDownload(post)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "12px 26px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(8px)",
              border: "none",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "transform 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            }}
          >
            <DownloadIcon size={16} color="#ffffff" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
