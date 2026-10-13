import React, { useState } from "react";
import { StarIcon, FilmIcon } from "../../icons";
import type { TMDBMediaItem } from "../../api/tmdb";
import type { Post } from "../../types";

export interface RecommendationCardProps {
  item: TMDBMediaItem;
  targetProviderKey: string;
  onSelect?: (post: Post) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  targetProviderKey,
  onSelect,
  containerRef,
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
        image: item.poster_path || "",
        provider: targetProviderKey,
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: "150px",
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
          aspectRatio: "2/3",
          borderRadius: "14px",
          overflow: "hidden",
          backgroundColor: "#0c0c0c",
          boxShadow: isHovered
            ? "0 12px 28px rgba(0, 0, 0, 0.85)"
            : "0 6px 18px rgba(0, 0, 0, 0.6)",
          transform: isHovered ? "scale(1.05)" : "scale(1)",
          transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease",
        }}
      >
        {!imgLoaded && !imgError && item.poster_path && (
          <div
            className="skeleton-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
            }}
          />
        )}
        {!imgError && item.poster_path ? (
          <img
            src={item.poster_path}
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

        {/* Hover Overlay with movie title, star rating, and year */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "36px 10px 10px 10px",
            background:
              "linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.65) 60%, transparent 100%)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            {item.title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "10px",
              fontWeight: 600,
            }}
          >
            {formattedRating && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  color: "#ffd700",
                }}
              >
                <StarIcon size={11} fill="#ffd700" color="#ffd700" />
                <span>{formattedRating}</span>
              </span>
            )}
            {year && <span style={{ color: "#94a3b8" }}>{year}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
