import React, { useState, useEffect } from "react";
import { fetchTMDBSeasonDetails } from "../../api/tmdb";
import { StarIcon } from "../../icons";

export interface SeriesRatingsHeatmapProps {
  tmdbId: number | string;
  seasonsCount: number;
  onPlayEpisode?: (seasonNumber: number, episodeNumber: number, title?: string) => void;
}

interface EpisodeRatingItem {
  season: number;
  episode: number;
  name: string;
  rating: number;
}

export const SeriesRatingsHeatmap: React.FC<SeriesRatingsHeatmapProps> = ({
  tmdbId,
  seasonsCount,
  onPlayEpisode,
}) => {
  const [ratingsGrid, setRatingsGrid] = useState<Record<number, EpisodeRatingItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredEp, setHoveredEp] = useState<EpisodeRatingItem | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadEpisodeRatings() {
      if (!tmdbId) return;
      setLoading(true);
      const grid: Record<number, EpisodeRatingItem[]> = {};

      const maxSeasonsToFetch = Math.min(Number(seasonsCount) || 1, 15);
      const seasonNumbers = Array.from({ length: maxSeasonsToFetch }, (_, i) => i + 1);

      await Promise.allSettled(
        seasonNumbers.map(async (sNum) => {
          try {
            const seasonData = await fetchTMDBSeasonDetails(tmdbId, sNum);
            if (seasonData && Array.isArray(seasonData.episodes)) {
              grid[sNum] = seasonData.episodes.map((ep: any) => ({
                season: sNum,
                episode: ep.episode_number,
                name: ep.name || `Episode ${ep.episode_number}`,
                rating: ep.vote_average ? Math.round(ep.vote_average * 10) / 10 : 7.5,
              }));
            }
          } catch {
            // Silently skip
          }
        })
      );

      if (mounted) {
        setRatingsGrid(grid);
        setLoading(false);
      }
    }

    loadEpisodeRatings();
    return () => {
      mounted = false;
    };
  }, [tmdbId, seasonsCount]);

  const seasonsList = Object.keys(ratingsGrid)
    .map(Number)
    .sort((a, b) => a - b);

  if (loading && seasonsList.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          margin: "24px 0 32px 0",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "36px" }}>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#ffffff",
              margin: 0,
              letterSpacing: "-0.01em",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Ratings by Episode
          </h3>
        </div>
        <div
          className="skeleton-shimmer"
          style={{
            width: "100%",
            height: "190px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        />
      </div>
    );
  }

  if (seasonsList.length === 0) {
    return null;
  }

  // Find max episodes across all seasons
  const maxEpisodes = Math.max(
    ...seasonsList.map((s) => (ratingsGrid[s] ? ratingsGrid[s].length : 0)),
    0
  );

  if (maxEpisodes === 0) return null;

  const getColorForRating = (rating: number): string => {
    if (rating >= 9.0) return "#168846"; // 9+ (Deep forest green)
    if (rating >= 8.5) return "#38a752"; // 8.5 (Emerald green)
    if (rating >= 8.0) return "#6ec45b"; // 8 (Leaf green)
    if (rating >= 7.5) return "#bdda5b"; // 7.5 (Lime yellow-green)
    if (rating >= 7.0) return "#f7d054"; // 7 (Golden yellow)
    if (rating >= 6.0) return "#f39c51"; // 6 (Warm orange)
    return "#e0564c"; // <6 (Warm red / coral)
  };

  return (
    <div
      style={{
        width: "100%",
        margin: "24px 0 32px 0",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            letterSpacing: "-0.01em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Ratings by Episode
        </h3>
      </div>

      {/* Heatmap Grid Container: Columns = Seasons, Rows = Episodes */}
      <div
        className="cinema-no-scrollbar"
        style={{
          overflowX: "auto",
          padding: "6px 0",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "fit-content" }}>
          {/* Header Row: Season Columns */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "2px" }}>
            <span style={{ width: "36px", fontSize: "13px", color: "#94a3b8", fontWeight: 700 }}>
              {/* Corner spacer */}
            </span>
            {seasonsList.map((sNum) => (
              <span
                key={sNum}
                style={{
                  width: "50px",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#94a3b8",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                S{sNum}
              </span>
            ))}
          </div>

          {/* Episode Rows: E1, E2, E3... */}
          {Array.from({ length: maxEpisodes }).map((_, epIdx) => {
            const epNum = epIdx + 1;
            return (
              <div key={epNum} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Row Label: E1, E2... */}
                <span
                  style={{
                    width: "36px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#94a3b8",
                  }}
                >
                  E{epNum}
                </span>

                {/* Season Cells */}
                {seasonsList.map((sNum) => {
                  const eps = ratingsGrid[sNum] || [];
                  const ep = eps[epIdx];
                  if (!ep) {
                    return (
                      <div
                        key={sNum}
                        style={{
                          width: "50px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "transparent",
                        }}
                      />
                    );
                  }

                  const bgColor = getColorForRating(ep.rating);
                  const isHovered = hoveredEp?.season === sNum && hoveredEp?.episode === ep.episode;

                  return (
                    <div
                      key={sNum}
                      onClick={() => onPlayEpisode && onPlayEpisode(sNum, ep.episode, ep.name)}
                      onMouseEnter={() => setHoveredEp(ep)}
                      onMouseLeave={() => setHoveredEp(null)}
                      title={`Play S${sNum} E${ep.episode}: ${ep.name} (${ep.rating.toFixed(1)})`}
                      style={{
                        width: "50px",
                        height: "36px",
                        borderRadius: "10px",
                        background: bgColor,
                        color: "#111111",
                        fontSize: "14px",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: onPlayEpisode ? "pointer" : "default",
                        border: isHovered ? "2.5px solid #ffffff" : "2.5px solid transparent",
                        boxShadow: isHovered
                          ? "0 0 14px rgba(255, 255, 255, 0.45)"
                          : "0 2px 6px rgba(0, 0, 0, 0.3)",
                        transform: isHovered ? "scale(1.06)" : "scale(1)",
                        transition: "all 0.15s ease",
                        userSelect: "none",
                      }}
                    >
                      {ep.rating.toFixed(1)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend with 7 color shades matching Image 3 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          fontSize: "12.5px",
          color: "#94a3b8",
          fontWeight: 600,
          marginTop: "4px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#e0564c" }} />
          <span>&lt;6</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#f39c51" }} />
          <span>6</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#f7d054" }} />
          <span>7</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#bdda5b" }} />
          <span>7.5</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#6ec45b" }} />
          <span>8</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#38a752" }} />
          <span>8.5</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "14px", borderRadius: "4px", background: "#168846" }} />
          <span>9+</span>
        </div>
      </div>
    </div>
  );
};
