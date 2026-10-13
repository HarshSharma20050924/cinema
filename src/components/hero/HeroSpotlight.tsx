import React, { useEffect, useState } from "react";
import { PlayIcon, DownloadIcon, StarIcon } from "../../icons";
import { fetchTMDBDetails, type TMDBDetails } from "../../api/tmdb";
import { parseTitleAndYear } from "../media/MediaCard";
import type { Post, Provider } from "../../types";

interface HeroSpotlightProps {
  post: Post | null;
  provider: Provider | null;
  onStream: (post: Post) => void;
  onDownload: (post: Post) => void;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  post,
  provider,
  onStream,
  onDownload,
}) => {
  const [tmdb, setTmdb] = useState<TMDBDetails | null>(null);

  const { title: cleanTitle, year: extractedYear } = parseTitleAndYear(post?.title || "");

  useEffect(() => {
    if (!cleanTitle) {
      setTmdb(null);
      return;
    }

    let isCurrent = true;

    fetchTMDBDetails(cleanTitle)
      .then((data) => {
        if (isCurrent && data) {
          setTmdb(data);
        }
      })
      .catch((err) => console.warn("Hero TMDB fetch failed:", err));

    return () => {
      isCurrent = false;
    };
  }, [cleanTitle]);

  if (!post) return null;

  // Rating resolution: TMDB rating or post.tag
  const rating =
    tmdb?.rating ||
    (post.tag ? post.tag.replace(/[★⭐]/g, "").trim() : "7.8");

  // Year resolution: TMDB year or extracted year
  const year =
    tmdb?.year || extractedYear || "2025";

  // Media type resolution
  const mediaType =
    tmdb?.genres && tmdb.genres.length > 0
      ? "Movie"
      : "Movie";

  // Plot description: TMDB Overview or fallback
  const plot =
    tmdb?.overview ||
    "As war and plague devastate the land, a humble commoner ignites a rebellion, uniting an army to defy the powers that be in a desperate fight for survival.";

  // High-res backdrop from TMDB or original post image
  const heroImage =
    (tmdb?.backdropUrl && tmdb.backdropUrl.trim()) ||
    (post.image && post.image.trim()) ||
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600";

  return (
    <div
      className="hero-spotlight-root"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "560px",
        maxHeight: "640px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 24px 60px 24px",
        paddingTop: "140px",
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
          <img
            src={heroImage}
            alt={cleanTitle}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 15%",
              filter: "brightness(0.9) contrast(1.05)",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600";
            }}
          />
          {/* Top dark shade for navbar readability + bottom fade to page bg */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 25%, transparent 50%, rgba(0,0,0,0.65) 72%, #000000 100%)",
            }}
          />
        </div>
      )}

      {/* Hero Content (Centered, exactly matching reference) */}
      <div
        className="hero-spotlight-content"
        style={{
          position: "relative",
          zIndex: 3,
          maxWidth: "720px",
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
          {cleanTitle}
        </h1>

        {/* Meta Line: ★ 7.9  2026  Movie */}
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
