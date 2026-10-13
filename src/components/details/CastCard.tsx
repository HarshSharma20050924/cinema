import React, { useState } from "react";
import { FilmIcon } from "../../icons";
import type { TMDBCast } from "../../api/tmdb";

export interface CastCardProps {
  actor: TMDBCast;
  onSelectPerson?: (personId: number) => void;
}

export const CastCard: React.FC<CastCardProps> = ({ actor, onSelectPerson }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      onClick={() => {
        if (onSelectPerson) onSelectPerson(actor.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "90px",
        flexShrink: 0,
        textAlign: "center",
        cursor: "pointer",
        position: "relative",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "86px",
          height: "86px",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "#161b26",
          boxShadow: isHovered
            ? "0 8px 24px rgba(229, 9, 20, 0.4)"
            : "0 6px 16px rgba(0, 0, 0, 0.6)",
          transform: isHovered ? "scale(1.08)" : "scale(1)",
          transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease",
        }}
      >
        {!imgLoaded && !imgError && actor.profile_path && (
          <div
            className="skeleton-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
            }}
          />
        )}
        {!imgError && actor.profile_path ? (
          <img
            src={actor.profile_path}
            alt={actor.name}
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
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.3)",
              background: "linear-gradient(145deg, #141414, #080808)",
            }}
          >
            <FilmIcon size={24} />
          </div>
        )}

        {/* Hover Overlay with Actor Name & Character */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "6px",
            background:
              "linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.75) 60%, rgba(0, 0, 0, 0.35) 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            textAlign: "center",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            }}
          >
            {actor.name}
          </span>
          {actor.character && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                color: "#e50914",
                lineHeight: 1.15,
                marginTop: "2px",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {actor.character}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
