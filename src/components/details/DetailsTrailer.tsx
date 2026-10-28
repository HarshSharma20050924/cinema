import React, { useState, useRef } from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import { PlayIcon, XIcon, FilmIcon, ChevronLeftIcon, ChevronRightIcon } from "../../icons";

export interface TrailerItem {
  key: string;
  name: string;
  type: string;
}

export interface DetailsTrailerProps {
  trailerEmbed: string | null;
  trailerUrl: string | null;
  trailers?: TrailerItem[];
  backdrop?: string | null;
  title?: string;
}

interface TrailerCardItemProps {
  item: TrailerItem;
  backdrop?: string | null;
  onClick: () => void;
}

const TrailerCardItem: React.FC<TrailerCardItemProps> = ({ item, backdrop, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

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

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const thumbUrl = `https://img.youtube.com/vi/${item.key}/hqdefault.jpg`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        flex: "0 0 clamp(320px, 26vw, 420px)",
        width: "clamp(320px, 26vw, 420px)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        cursor: "pointer",
        userSelect: "none",
        perspective: "1000px",
        zIndex: isHovered ? 12 : 1,
      }}
    >
      {/* 16:9 Thumbnail Card with 3D Tilt */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#0c0e14",
          border: isHovered
            ? "1px solid rgba(255, 255, 255, 0.35)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.045, 1.045, 1.045)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 22px 44px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0,0,0,0.5)"
            : "0 6px 18px rgba(0, 0, 0, 0.6)",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease, border-color 0.25s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.4s ease",
        }}
      >
        <img
          src={thumbUrl}
          alt={item.name}
          loading="lazy"
          onError={(e) => {
            if (backdrop) (e.currentTarget as HTMLImageElement).src = backdrop;
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: isHovered
              ? `scale(1.12) translate3d(${tilt.y * -0.6}px, ${tilt.x * 0.6}px, 0px)`
              : "scale(1.0) translate3d(0px, 0px, 0px)",
            transition: isHovered
              ? "transform 0.08s ease-out"
              : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform",
          }}
        />

        {/* Dark Vignette Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
          }}
        />

        {/* Translucent Frosted Glass Center Play Button Circle */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              background: isHovered ? "rgba(255, 255, 255, 0.22)" : "rgba(10, 12, 18, 0.45)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.24)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
              transform: isHovered ? "scale(1.12)" : "scale(1)",
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease",
            }}
          >
            <PlayIcon size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: "2px" }} />
          </div>
        </div>
      </div>

      {/* Title & Type Labels */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <span
          style={{
            fontSize: "13.5px",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.name}
        </span>
        <span
          style={{
            fontSize: "11.5px",
            color: "rgba(255, 255, 255, 0.5)",
            fontWeight: 600,
          }}
        >
          {item.type || "Trailer"}
        </span>
      </div>
    </div>
  );
};

export const DetailsTrailer: React.FC<DetailsTrailerProps> = ({
  trailerEmbed,
  trailerUrl,
  trailers = [],
  backdrop,
  title,
}) => {
  // Active playing video modal
  const [playingVideo, setPlayingVideo] = useState<TrailerItem | null>(null);

  // Extract fallback main trailer key if trailers array is empty
  const fallbackKey =
    (trailerUrl?.match(/[?&]v=([^&]+)/)?.[1]) ||
    (trailerEmbed?.match(/embed\/([^?&]+)/)?.[1]) ||
    null;

  // Build full trailers & extras list
  const allTrailers: TrailerItem[] =
    trailers && trailers.length > 0
      ? trailers
      : fallbackKey
      ? [
          { key: fallbackKey, name: "Official Trailer", type: "Trailer" },
          { key: fallbackKey, name: `${title || "Movie"} Teaser`, type: "Teaser" },
        ]
      : [];

  if (allTrailers.length === 0 && !fallbackKey) return null;

  return (
    <div
      id="details-trailer-section"
      className="details-section-container"
      style={{
        width: "100%",
        padding: "24px 48px 36px 48px",
        position: "relative",
      }}
    >
      {/* Clean Home-style Shelf Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Trailers & Extras
        </h2>

        <span style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.45)", fontWeight: 600 }}>
          {allTrailers.length} {allTrailers.length === 1 ? "Video" : "Videos"}
        </span>
      </div>

      {/* 16:9 Video Cards Shelf matching Home Landscape Card sizing with 3D Tilt */}
      <div
        className="cinema-no-scrollbar"
        style={{
          display: "flex",
          gap: "18px",
          overflowX: "auto",
          scrollBehavior: "smooth",
          paddingBottom: "12px",
        }}
      >
        {allTrailers.map((item, idx) => (
          <TrailerCardItem
            key={`${item.key}-${idx}`}
            item={item}
            backdrop={backdrop}
            onClick={() => setPlayingVideo(item)}
          />
        ))}
      </div>

      {/* Direct Clean YouTube Embed Modal matching Screenshot 2 (No ugly top/bottom bars or borders) */}
      {playingVideo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => setPlayingVideo(null)}
        >
          {/* Top-Right Circular Frosted Close Button */}
          <button
            type="button"
            onClick={() => setPlayingVideo(null)}
            aria-label="Close Trailer"
            style={{
              position: "fixed",
              top: "24px",
              right: "28px",
              zIndex: 100000,
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e50914";
              e.currentTarget.style.borderColor = "#e50914";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <XIcon size={18} />
          </button>

          {/* Pure Direct Video Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "1080px",
              aspectRatio: "16 / 9",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 28px 80px rgba(0, 0, 0, 0.95)",
              background: "#000000",
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${playingVideo.key}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={playingVideo.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
