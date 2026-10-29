import React, { useState } from "react";
import { FilmIcon } from "./PlayerIcons";

export interface PlayerRecommendedCardProps {
  item: any;
  onSelect: (item: any) => void;
}

export const PlayerRecommendedCard: React.FC<PlayerRecommendedCardProps> = ({ item, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / (rect.height / 2)) * -8,
      y: (x / (rect.width / 2)) * 8,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const posterImg = item.poster_path || item.backdrop_path || item.image;
  const releaseYear = (item.release_date || item.first_air_date || "").slice(0, 4);
  const title = item.title || item.name || "Movie";

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        cursor: "pointer",
        perspective: "1000px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        userSelect: "none",
        zIndex: isHovered ? 10 : 1,
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
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: isHovered
            ? "0 22px 44px rgba(0, 0, 0, 0.95)"
            : "0 4px 14px rgba(0, 0, 0, 0.5)",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.035, 1.035, 1.035)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease",
        }}
      >
        {posterImg ? (
          <img
            src={posterImg}
            alt={title}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: isHovered
                ? `scale(1.10) translate3d(${tilt.y * -0.5}px, ${tilt.x * 0.5}px, 0px)`
                : "scale(1.0) translate3d(0px, 0px, 0px)",
              transition: isHovered ? "transform 0.08s ease-out" : "transform 0.4s ease",
            }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            <FilmIcon size={32} />
          </div>
        )}

        {/* Portrait Card Overlay on Hover */}
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
              fontSize: "14px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.22,
              marginBottom: "4px",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.95)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>

          {/* Year */}
          {releaseYear && (
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#cbd5e1",
                letterSpacing: "0.3px",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
              }}
            >
              {releaseYear}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
