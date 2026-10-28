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
        width: "110px",
        flexShrink: 0,
        textAlign: "center",
        cursor: "pointer",
        userSelect: "none",
        gap: "10px",
      }}
    >
      {/* Circular Avatar */}
      <div
        style={{
          position: "relative",
          width: "96px",
          height: "96px",
          borderRadius: "50%",
          overflow: "hidden",
          backgroundColor: "#161b26",
          border: isHovered
            ? "2px solid rgba(255, 255, 255, 0.45)"
            : "2px solid rgba(255, 255, 255, 0.12)",
          boxShadow: isHovered
            ? "0 8px 24px rgba(0, 0, 0, 0.7)"
            : "0 4px 16px rgba(0, 0, 0, 0.5)",
          transform: isHovered ? "scale(1.06)" : "scale(1)",
          transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease, box-shadow 0.22s ease",
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
              background: "linear-gradient(145deg, #181c26, #0e1118)",
            }}
          >
            <FilmIcon size={28} />
          </div>
        )}
      </div>

      {/* Name and Character Info */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%" }}>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: isHovered ? "#ffffff" : "#f1f5f9",
            lineHeight: 1.25,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            transition: "color 0.15s ease",
          }}
        >
          {actor.name}
        </span>
        {actor.character && (
          <span
            style={{
              fontSize: "11.5px",
              fontWeight: 500,
              color: "#94a3b8",
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {actor.character}
          </span>
        )}
      </div>
    </div>
  );
};
