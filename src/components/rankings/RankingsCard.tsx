import React from "react";
import { StarIcon } from "../../icons";
import { RankingPoster } from "./RankingPoster";
import { getEffectiveRatings } from "./constants";
import type { RankedItem, PlatformMode, PageMode } from "./types";

export interface RankingsCardProps {
  item: RankedItem;
  idx: number;
  mode: PlatformMode;
  pageMode: PageMode;
  isHov: boolean;
  onHover: (id: string | null) => void;
  onClick: (item: RankedItem) => void;
}

export const RankingsCard: React.FC<RankingsCardProps> = ({
  item,
  idx,
  mode,
  pageMode,
  isHov,
  onHover,
  onClick,
}) => {
  const isImdb = mode === "imdb";
  const dispRank = isImdb ? (item.rank || idx + 1) : (item.letterboxdRank || item.rank || idx + 1);
  const { imdbRatingStr, letterboxdRatingStr } = getEffectiveRatings(item);

  return (
    <div
      className="rankings-card-container"
      onClick={() => onClick(item)}
      onMouseEnter={() => onHover(item.id || item.title)}
      onMouseLeave={() => onHover(null)}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        userSelect: "none",
      }}
    >
      {/* Poster container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "2/3",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#0c0c0c",
          transform: isHov ? "translateY(-6px)" : "translateY(0)",
          boxShadow: isHov
            ? "0 18px 36px rgba(0,0,0,0.8), 0 0 20px rgba(229,9,20,0.15)"
            : "0 4px 14px rgba(0,0,0,0.5)",
          transition:
            "transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <RankingPoster
          src={item.poster}
          imdbId={item.imdbId}
          title={item.title}
          year={item.year}
          isHov={isHov}
          mode={mode}
        />

        {/* Top-left Badge */}
        {pageMode === "top250" ? (
          <div
            className="rankings-hover-badge"
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              background:
                dispRank <= 3 ? (mode === "imdb" ? "#f5c518" : "#00e054") : "rgba(0,0,0,0.72)",
              color: dispRank <= 3 ? "#000" : "#fff",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              padding: "2px 7px",
              borderRadius: "999px",
              fontSize: "10.5px",
              fontWeight: 900,
              zIndex: 2,
              letterSpacing: "0.01em",
            }}
          >
            #{dispRank}
          </div>
        ) : mode === "imdb" ? (
          <div
            className="rankings-hover-badge"
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              background: "#f5c518",
              color: "#000000",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              padding: "2px 7px",
              borderRadius: "999px",
              fontSize: "10.5px",
              fontWeight: 900,
              zIndex: 2,
              letterSpacing: "0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <StarIcon size={10} fill="#000" color="#000" />
            <span>{imdbRatingStr}</span>
          </div>
        ) : (
          <div
            className="rankings-hover-badge"
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              background: "#00e054",
              color: "#000000",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              padding: "2px 7px",
              borderRadius: "999px",
              fontSize: "10.5px",
              fontWeight: 900,
              zIndex: 2,
              letterSpacing: "0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <StarIcon size={10} fill="#000" color="#000" />
            <span>{letterboxdRatingStr}</span>
          </div>
        )}

        {/* Type badge — top right (Hover only on desktop, static on mobile) */}
        <div
          className="rankings-hover-badge"
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            color: "rgba(255,255,255,0.7)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            zIndex: 2,
          }}
        >
          {item.type === "tv" ? "TV" : "Film"}
        </div>

        {/* Bottom hover overlay */}
        <div
          className="media-card-hover-overlay"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "42px 12px 12px 12px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.65) 65%, transparent 100%)",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            opacity: isHov ? 1 : 0,
            transform: isHov ? "translateY(0)" : "translateY(8px)",
            transition:
              "opacity 0.28s cubic-bezier(0.16,1,0.3,1), transform 0.28s cubic-bezier(0.16,1,0.3,1)",
            zIndex: 3,
            pointerEvents: isHov ? "auto" : "none",
          }}
        >
          {/* Title */}
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
              textShadow: "0 2px 6px rgba(0,0,0,0.9)",
            }}
          >
            {item.title}
          </div>

          {/* Distinct Platform Rating */}
          {mode === "imdb" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  background: "#f5c518",
                  color: "#000",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "10.5px",
                  fontWeight: 900,
                }}
              >
                <StarIcon size={9} fill="#000" color="#000" />
                {imdbRatingStr}
              </span>
              {item.imdbVotes && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.55)",
                    fontWeight: 600,
                  }}
                >
                  {item.imdbVotes}
                </span>
              )}
              <span
                style={{
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                }}
              >
                {item.year}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  background: "#00e054",
                  color: "#000",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "10.5px",
                  fontWeight: 900,
                }}
              >
                <StarIcon size={9} fill="#000" color="#000" />
                {letterboxdRatingStr} / 5.0
              </span>
              {item.runtime && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.55)",
                    fontWeight: 600,
                  }}
                >
                  {item.runtime}
                </span>
              )}
              <span
                style={{
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                }}
              >
                {item.year}
              </span>
            </div>
          )}

          {/* Direct External Link (IMDb / Letterboxd) */}
          {(isImdb ? item.imdbId : (item.link || item.slug || item.imdbId)) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "3px",
              }}
            >
              <a
                href={
                  isImdb
                    ? `https://www.imdb.com/title/${item.imdbId}`
                    : item.link
                    ? (item.link.startsWith("http") ? item.link : `https://letterboxd.com${item.link}`)
                    : item.slug
                    ? `https://letterboxd.com/film/${item.slug}/`
                    : `https://letterboxd.com/imdb/${item.imdbId}`
                }
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.11)",
                  color: "rgba(255,255,255,0.85)",
                  padding: "4px 9px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isImdb ? "#f5c518" : "#00e054";
                  e.currentTarget.style.color = "#000";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.11)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                }}
              >
                {isImdb ? "IMDb" : "LB"} &rarr;
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
