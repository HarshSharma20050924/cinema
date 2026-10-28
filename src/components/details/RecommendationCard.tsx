import React, { useState } from "react";
import { StarIcon, FilmIcon } from "../../icons";
import type { TMDBMediaItem } from "../../api/tmdb";
import type { Post } from "../../types";

export interface RecommendationCardProps {
  item: TMDBMediaItem;
  targetProviderKey: string;
  onSelect?: (post: Post) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLandscape?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  targetProviderKey,
  onSelect,
  containerRef,
  isLandscape = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const formattedRating =
    item.vote_average && Number(item.vote_average) > 0
      ? Number(item.vote_average).toFixed(1)
      : null;
  const year = item.release_date ? item.release_date.split("-")[0] : null;

  const handleClick = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "instant" });
      containerRef.current.scrollTop = 0;
    }
    const container = document.getElementById("cinema-details-scroll-container");
    if (container) {
      container.scrollTo({ top: 0, behavior: "instant" });
      container.scrollTop = 0;
    }

    if (onSelect) {
      onSelect({
        title: item.title,
        link: "",
        image: item.poster_path || item.backdrop_path || "",
        provider: targetProviderKey,
      });
    }
  };

  const imageSrc = isLandscape
    ? item.backdrop_path || item.poster_path
    : item.poster_path || item.backdrop_path;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isLandscape ? "290px" : "154px",
        flexShrink: 0,
        cursor: "pointer",
        position: "relative",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: isLandscape ? "16 / 9" : "2 / 3",
          borderRadius: "14px",
          overflow: "hidden",
          backgroundColor: "#0c0e14",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: isHovered
            ? "0 14px 35px rgba(0, 0, 0, 0.85), 0 0 20px rgba(229, 9, 20, 0.25)"
            : "0 8px 20px rgba(0, 0, 0, 0.6)",
          transform: isHovered ? "scale(1.04)" : "scale(1)",
          transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, border-color 0.22s ease",
          borderColor: isHovered ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.12)",
        }}
      >
        {!imgLoaded && !imgError && imageSrc && (
          <div
            className="skeleton-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
            }}
          />
        )}
        {!imgError && imageSrc ? (
          <img
            src={imageSrc}
            alt={item.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
            onError={() => {
              setImgError(true);
              setImgLoaded(true);
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(145deg, #141414, #080808)",
              color: "rgba(255, 255, 255, 0.3)",
            }}
          >
            <FilmIcon size={28} />
          </div>
        )}

        {/* Gradient Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isLandscape
              ? "linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.2) 50%, transparent 100%)"
              : "linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.4) 40%, transparent 100%)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Cno.to Landscape Title (Matches Screenshot 5) */}
        {isLandscape ? (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "14px 16px",
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontFamily: "'Impact', 'Outfit', 'Cinzel', system-ui, sans-serif",
                fontSize: "17px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.95), 0 0 12px rgba(0, 0, 0, 0.8)",
                lineHeight: 1.15,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.title}
            </span>

            {year && (
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.65)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span>{year}</span>
                {formattedRating && (
                  <>
                    <span>•</span>
                    <StarIcon size={11} fill="#ffd700" color="#ffd700" />
                    <span>{formattedRating}</span>
                  </>
                )}
              </span>
            )}
          </div>
        ) : (
          /* Portrait Card Info */
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "36px 10px 10px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              zIndex: 3,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.25,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 1px 4px rgba(0, 0, 0, 0.9)",
              }}
            >
              {item.title}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#9ca3af" }}>
              {year && <span>{year}</span>}
              {formattedRating && (
                <div style={{ display: "flex", alignItems: "center", gap: "2px", color: "#ffd700" }}>
                  <StarIcon size={10} fill="#ffd700" color="#ffd700" />
                  <span style={{ fontWeight: 800 }}>{formattedRating}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
