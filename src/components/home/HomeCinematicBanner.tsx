import React, { useState, useEffect } from "react";
import { PlayIcon, ChevronRightIcon, PlusIcon, CheckIcon, InfoIcon, StarIcon } from "../../icons";
import type { Post } from "../../types";
import { fetchTMDBDetails, type TMDBDetails } from "../../api/tmdb";

interface ExploreBannerProps {
  type: "explore";
  eyebrow?: string;
  title: string;
  description: string;
  buttonText: string;
  backdropUrl: string;
  onExplore: () => void;
}

interface SpotlightBannerProps {
  type: "spotlight";
  post: Post;
  eyebrow?: string;
  genres?: string;
  seasons?: string;
  certification?: string;
  mediaType?: "movie" | "tv";
  actionLabel?: string;
  onPlay: (post: Post) => void;
  onInfo: (post: Post) => void;
}

export type HomeCinematicBannerProps = ExploreBannerProps | SpotlightBannerProps;

export const HomeCinematicBanner: React.FC<HomeCinematicBannerProps> = (props) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (props.type === "explore") {
    const { eyebrow, title, description, buttonText, backdropUrl, onExplore } = props;

    return (
      <div
        className="home-cinematic-banner explore-banner"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "relative",
          width: "100%",
          minHeight: "740px",
          overflow: "hidden",
          margin: "44px 0 60px 0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "72px 64px 84px 64px",
          userSelect: "none",
          background: "transparent",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 7%, black 93%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 7%, black 93%, transparent 100%)",
        }}
      >
        {/* Full-bleed Backdrop Image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            transform: isHovered ? "scale(1.03)" : "scale(1.0)",
            transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 1,
          }}
        />

        {/* Soft Vignette Overlay for Text Legibility (No hard borders, blends naturally) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.42) 50%, transparent 80%)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Content Box */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            maxWidth: "680px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          {eyebrow && (
            <span
              style={{
                fontSize: "12.5px",
                fontWeight: 800,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.75)",
              }}
            >
              {eyebrow}
            </span>
          )}

          <h2
            style={{
              fontSize: "clamp(64px, 8.5vw, 110px)",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              textShadow: "0 8px 40px rgba(0, 0, 0, 0.95)",
              margin: 0,
            }}
          >
            {title}
          </h2>

          <p
            style={{
              fontSize: "16px",
              lineHeight: 1.55,
              color: "rgba(255, 255, 255, 0.85)",
              maxWidth: "520px",
              margin: "2px 0 16px 0",
              textShadow: "0 2px 14px rgba(0, 0, 0, 0.9)",
            }}
          >
            {description}
          </p>

          <button
            onClick={onExplore}
            style={{
              height: "50px",
              padding: "0 32px",
              borderRadius: "999px",
              background: "#e50914",
              color: "#ffffff",
              fontSize: "15.5px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 6px 28px rgba(229, 9, 20, 0.55)",
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.background = "#f40612";
              e.currentTarget.style.boxShadow = "0 8px 34px rgba(229, 9, 20, 0.75)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "#e50914";
              e.currentTarget.style.boxShadow = "0 6px 28px rgba(229, 9, 20, 0.55)";
            }}
          >
            <span>{buttonText}</span>
            <ChevronRightIcon size={20} color="#ffffff" />
          </button>
        </div>
      </div>
    );
  }

  // Dynamic TMDB details state for spotlight banners
  const [liveDetails, setLiveDetails] = useState<TMDBDetails | null>(null);

  const post = props.type === "spotlight" ? props.post : null;

  useEffect(() => {
    let active = true;
    if (props.type === "spotlight" && props.post?.title) {
      fetchTMDBDetails(props.post.title, (props.post as any).imdbId, props.post.year)
        .then((data) => {
          if (active && data) {
            setLiveDetails(data);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [props.type, post?.title]);

  if (props.type !== "spotlight" || !post) return null;

  const {
    eyebrow,
    genres: propGenres,
    seasons: propSeasons,
    certification: propCert,
    mediaType: propMediaType,
    actionLabel,
    onPlay,
    onInfo,
  } = props;

  const resolvedMediaType =
    propMediaType || post.mediaType || liveDetails?.mediaType || "movie";
  const displayBackdrop =
    liveDetails?.backdropUrl || post.backdropUrl || post.image;
  const displayLogo = liveDetails?.logoUrl || post.logoUrl;
  const rating = liveDetails?.rating || post.rating || "8.0";
  const rawYear = liveDetails?.year || post.year || "2024";
  const year = rawYear.includes("-") ? rawYear : `${rawYear}`;
  const genres =
    propGenres ||
    (liveDetails?.genres && liveDetails.genres.length > 0
      ? liveDetails.genres.slice(0, 3).join(", ")
      : post.genres);
  const seasons =
    propSeasons ||
    post.seasons ||
    (resolvedMediaType === "tv"
      ? liveDetails?.seasonsCount
        ? `${liveDetails.seasonsCount} Season${liveDetails.seasonsCount > 1 ? "s" : ""}`
        : "2 Seasons"
      : undefined);
  const certification =
    propCert || post.certification || (resolvedMediaType === "tv" ? "TV-MA" : "PG-13");
  const description =
    post.description ||
    post.overview ||
    liveDetails?.overview ||
    "Follow the high-stakes journey as secrets unravel and thrilling revelations emerge in this cinematic masterpiece.";
  const buttonLabel =
    actionLabel || (resolvedMediaType === "tv" ? "Watch" : "Play");

  return (
    <div
      className="home-cinematic-banner spotlight-banner"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "720px",
        overflow: "hidden",
        margin: "40px 0 56px 0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "72px 64px 80px 64px",
        userSelect: "none",
        background: "transparent",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 7%, black 93%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 7%, black 93%, transparent 100%)",
      }}
    >
      {/* High-res backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${displayBackdrop})`,
          backgroundSize: "cover",
          backgroundPosition: "center 28%",
          transform: isHovered ? "scale(1.025)" : "scale(1.0)",
          transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 1,
        }}
      />

      {/* Cinematic Left vignette for crystal-clear readability (matching cno.to) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.55) 45%, rgba(0, 0, 0, 0.12) 75%, transparent 100%)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Content Container */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          maxWidth: "640px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        {eyebrow && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#38bdf8",
              textShadow: "0 2px 10px rgba(56, 189, 248, 0.4)",
            }}
          >
            {eyebrow}
          </span>
        )}

        {/* Title or Official PNG Logo Graphic (matching cno.to) */}
        {displayLogo ? (
          <img
            src={displayLogo}
            alt={post.title}
            onClick={() => onInfo(post)}
            title="View Details"
            style={{
              maxHeight: "clamp(64px, 8.5vw, 110px)",
              maxWidth: "min(440px, 85vw)",
              objectFit: "contain",
              objectPosition: "left bottom",
              marginBottom: "4px",
              filter: "drop-shadow(0 6px 20px rgba(0, 0, 0, 0.95))",
              cursor: "pointer",
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <h2
            onClick={() => onInfo(post)}
            title="View Details"
            style={{
              fontSize: "clamp(42px, 5.5vw, 70px)",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              textTransform: "uppercase",
              textShadow: "0 6px 32px rgba(0, 0, 0, 0.95)",
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
            {post.title}
          </h2>
        )}

        {/* Metadata row matching cno.to: Genre • Year • Seasons • [Certification] • ★ Rating */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            fontSize: "13.5px",
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.9)",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.95)",
            margin: "2px 0 2px 0",
          }}
        >
          {genres && <span>{genres}</span>}

          {genres && <span style={{ color: "rgba(255, 255, 255, 0.35)" }}>•</span>}
          <span>{year}</span>

          {seasons && (
            <>
              <span style={{ color: "rgba(255, 255, 255, 0.35)" }}>•</span>
              <span>{seasons}</span>
            </>
          )}

          {certification && (
            <span
              style={{
                border: "1px solid rgba(255, 255, 255, 0.4)",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                lineHeight: 1.3,
                color: "rgba(255, 255, 255, 0.95)",
              }}
            >
              {certification}
            </span>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#f59e0b",
              fontWeight: 800,
              marginLeft: "2px",
            }}
          >
            <StarIcon size={14} fill="#f59e0b" color="#f59e0b" />
            <span>{rating.replace("/10", "")}</span>
          </div>
        </div>

        {/* Clean 2-3 Line Synopsis */}
        <p
          style={{
            fontSize: "14.5px",
            lineHeight: 1.55,
            color: "rgba(255, 255, 255, 0.85)",
            maxWidth: "540px",
            margin: "2px 0 14px 0",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.85)",
          }}
        >
          {description}
        </p>

        {/* Action Buttons matching HeroSpotlight: [ ▶ Watch/Play ] [ + ] [ ⓘ ] */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
          {/* Primary Action Button: Red pill button matching HeroSpotlight slide */}
          <button
            onClick={() => onPlay(post)}
            style={{
              height: "46px",
              padding: "0 28px",
              borderRadius: "999px",
              background: "#e50914",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 6px 24px rgba(229, 9, 20, 0.55)",
              transition:
                "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.background = "#f40612";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "#e50914";
            }}
          >
            <PlayIcon size={18} fill="#ffffff" color="#ffffff" />
            <span>{buttonLabel}</span>
          </button>

          {/* Standalone Circular Glass Watchlist Button matching cno.to */}
          <button
            onClick={() => setIsSaved(!isSaved)}
            title={isSaved ? "Saved to Watchlist" : "Add to Watchlist"}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.16)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.24)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
              transition: "transform 0.15s ease, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.26)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
            }}
          >
            {isSaved ? <CheckIcon size={20} color="#4ade80" /> : <PlusIcon size={20} color="#ffffff" />}
          </button>

          {/* Standalone Circular Glass Info Button matching cno.to */}
          <button
            onClick={() => onInfo(post)}
            title="More Information"
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.16)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.24)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
              transition: "transform 0.15s ease, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.26)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
            }}
          >
            <InfoIcon size={20} color="#ffffff" />
          </button>
        </div>
      </div>
    </div>
  );
};
