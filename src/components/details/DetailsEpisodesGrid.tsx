import React, { useState, useEffect } from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import { PlayIcon, DownloadIcon, BarChartIcon, ArrowUpDownIcon, ShuffleIcon } from "../../icons";
import { fetchTMDBSeasonDetails } from "../../api/tmdb";

export interface DetailsEpisodesGridProps {
  tmdbId?: number;
  seasonsCount?: number;
  selectedSeason: number;
  onSelectSeason: (seasonNumber: number) => void;
  providerEpisodes?: any[];
  onPlayEpisode: (epNumber: number, episodeTitle?: string, directLink?: string) => void;
  onDownloadEpisode?: (epNumber: number, episodeTitle?: string, directLink?: string) => void;
  onToggleRatingsHeatmap?: () => void;
}

interface EpisodeItem {
  id: number;
  episodeNumber: number;
  title: string;
  overview: string;
  stillPath: string | null;
  runtime: number | null;
  voteAverage: number | null;
  airDate?: string | null;
  directLink?: string;
}

export const DetailsEpisodesGrid: React.FC<DetailsEpisodesGridProps> = ({
  tmdbId,
  seasonsCount = 1,
  selectedSeason,
  onSelectSeason,
  providerEpisodes = [],
  onPlayEpisode,
  onDownloadEpisode,
  onToggleRatingsHeatmap,
}) => {
  const [currentSeason, setCurrentSeason] = useState(selectedSeason || 1);
  const [tmdbEpisodes, setTmdbEpisodes] = useState<EpisodeItem[]>([]);
  const [seasonAirDate, setSeasonAirDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewestFirst, setIsNewestFirst] = useState(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (selectedSeason && selectedSeason !== currentSeason) {
      setCurrentSeason(selectedSeason);
      setLoading(true);
      setTmdbEpisodes([]);
    }
  }, [selectedSeason]);

  // Handle season selection
  const handleSeasonSelect = (num: number) => {
    setCurrentSeason(num);
    setIsSeasonDropdownOpen(false);
    setLoading(true);
    setTmdbEpisodes([]);
    onSelectSeason(num);
  };

  // Fetch TMDB season episodes whenever tmdbId or currentSeason changes
  useEffect(() => {
    let isCurrent = true;

    if (!tmdbId) {
      if (providerEpisodes && providerEpisodes.length > 0) {
        setLoading(false);
      } else {
        const timer = setTimeout(() => {
          if (isCurrent) setLoading(false);
        }, 2500);
        return () => clearTimeout(timer);
      }
      return () => {
        isCurrent = false;
      };
    }

    setLoading(true);
    setTmdbEpisodes([]); // Clear previous episodes immediately so realistic skeleton displays!

    fetchTMDBSeasonDetails(tmdbId, currentSeason)
      .then((data) => {
        if (!isCurrent) return;
        setSeasonAirDate(data?.air_date || null);
        if (data?.episodes && Array.isArray(data.episodes) && data.episodes.length > 0) {
          const mapped: EpisodeItem[] = data.episodes.map((ep: any) => ({
            id: ep.id,
            episodeNumber: ep.episode_number,
            title: ep.name || `Episode ${ep.episode_number}`,
            overview: ep.overview || "No episode description available.",
            stillPath: ep.still_path
              ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
              : null,
            runtime: ep.runtime || null,
            voteAverage: ep.vote_average || null,
            airDate: ep.air_date || null,
          }));
          setTmdbEpisodes(mapped);
        } else {
          setTmdbEpisodes([]);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch season episodes:", err);
        if (isCurrent) setTmdbEpisodes([]);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [tmdbId, currentSeason]);

  // Merge TMDB episodes with provider direct links
  const mergedEpisodes: EpisodeItem[] = (() => {
    if (tmdbEpisodes.length > 0) {
      return tmdbEpisodes.map((ep, idx) => {
        const matchingProvEp = providerEpisodes[idx] || providerEpisodes.find((p) => {
          const title = (p.title || p.name || "").toLowerCase();
          return title.includes(`e${ep.episodeNumber}`) || title.includes(`episode ${ep.episodeNumber}`);
        });
        return {
          ...ep,
          directLink: matchingProvEp?.link || matchingProvEp?.url || matchingProvEp?.file,
        };
      });
    }

    // Fallback: If no TMDB episodes, map provider episodes
    return providerEpisodes.map((p, idx) => {
      const epNum = idx + 1;
      return {
        id: idx,
        episodeNumber: epNum,
        title: p.title || p.name || `Episode ${epNum}`,
        overview: "Stream or download this episode directly.",
        stillPath: null,
        runtime: null,
        voteAverage: null,
        directLink: p.link || p.url || p.file,
      };
    });
  })();

  const sortedEpisodes = isNewestFirst
    ? [...mergedEpisodes].reverse()
    : mergedEpisodes;

  // Extract season year (e.g. "2023")
  const seasonYear = React.useMemo(() => {
    if (seasonAirDate) {
      const y = seasonAirDate.match(/\b(19\d{2}|20\d{2})\b/)?.[0];
      if (y) return y;
    }
    const firstEpDate = mergedEpisodes.find((e) => e.airDate)?.airDate;
    if (firstEpDate) {
      const y = firstEpDate.match(/\b(19\d{2}|20\d{2})\b/)?.[0];
      if (y) return y;
    }
    return null;
  }, [seasonAirDate, mergedEpisodes]);

  // Shuffle play
  const handleShufflePlay = () => {
    if (sortedEpisodes.length === 0) return;
    const randomIdx = Math.floor(Math.random() * sortedEpisodes.length);
    const chosen = sortedEpisodes[randomIdx];
    onPlayEpisode(chosen.episodeNumber, chosen.title, chosen.directLink);
  };

  const totalSeasons = Math.max(seasonsCount, 1);
  const seasonsArray = Array.from({ length: totalSeasons }, (_, i) => i + 1);

  if (mergedEpisodes.length === 0 && !loading && totalSeasons <= 1) {
    return null;
  }

  return (
    <div
      className="details-episodes-section"
      style={{
        width: "100%",
        padding: "24px 48px 36px 48px",
      }}
    >
      {/* Episodes Header Row matching Cno.to and Cinejoy */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Left: Title + Subtitle (Year · Episodes) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.01em",
              margin: 0,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Episodes
          </h2>

          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            {seasonYear ? `${seasonYear} · ` : ""}{mergedEpisodes.length} {mergedEpisodes.length === 1 ? "episode" : "episodes"}
          </span>
        </div>

        {/* Right: Controls (Season Dropdown first on left, then Ratings, Sort, Shuffle) */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Season Selector Dropdown Pill (First on Left) */}
          {totalSeasons > 1 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "11px 24px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 750,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              >
                <span>Season {currentSeason}</span>
                <span style={{ fontSize: "11px", opacity: 0.85 }}>▼</span>
              </button>

              {/* Season Dropdown Menu (Aligned Left) */}
              {isSeasonDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    zIndex: 100,
                    minWidth: "180px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    background: "rgba(18, 22, 32, 0.65)",
                    backdropFilter: "blur(24px) saturate(1.8)",
                    WebkitBackdropFilter: "blur(24px) saturate(1.8)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    borderRadius: "16px",
                    padding: "6px",
                    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.60), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
                  }}
                >
                  {seasonsArray.map((num) => {
                    const isActive = currentSeason === num;
                    return (
                      <button
                        key={num}
                        onClick={() => handleSeasonSelect(num)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "11px 16px",
                          borderRadius: "10px",
                          background: isActive ? "#e50914" : "transparent",
                          color: "#ffffff",
                          fontSize: "14.5px",
                          fontWeight: isActive ? 800 : 600,
                          border: "none",
                          cursor: "pointer",
                          boxShadow: isActive ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        Season {num}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Ratings Heatmap Toggle */}
          {onToggleRatingsHeatmap && (
            <button
              onClick={onToggleRatingsHeatmap}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 22px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 750,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e50914";
                e.currentTarget.style.borderColor = "#e50914";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
              }}
            >
              <BarChartIcon size={16} color="#ffffff" />
              <span>Ratings</span>
            </button>
          )}

          {/* Sort Order (Oldest / Newest) */}
          <button
            onClick={() => setIsNewestFirst(!isNewestFirst)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 22px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 750,
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
          >
            <ArrowUpDownIcon size={16} color="#ffffff" />
            <span>{isNewestFirst ? "Newest" : "Oldest"}</span>
          </button>

          {/* Shuffle Button (Cno.to Screenshot 3) */}
          <button
            onClick={handleShufflePlay}
            title="Play random episode"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 22px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 750,
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
          >
            <ShuffleIcon size={16} color="#ffffff" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Realistic Episode Card Loading Skeleton */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))",
            gap: "24px",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "18px",
                alignItems: "flex-start",
                padding: "16px 18px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* 16:9 Thumbnail Skeleton */}
              <div
                className="skeleton-shimmer"
                style={{
                  width: "220px",
                  aspectRatio: "16 / 9",
                  borderRadius: "12px",
                  flexShrink: 0,
                }}
              />
              {/* Text Metadata Skeleton */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  paddingTop: "6px",
                }}
              >
                <div
                  className="skeleton-shimmer"
                  style={{
                    height: "18px",
                    width: "75%",
                    borderRadius: "6px",
                  }}
                />
                <div
                  className="skeleton-shimmer"
                  style={{
                    height: "13px",
                    width: "95%",
                    borderRadius: "6px",
                  }}
                />
                <div
                  className="skeleton-shimmer"
                  style={{
                    height: "13px",
                    width: "60%",
                    borderRadius: "6px",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spacious Stretched Episodes Grid matching User Screenshot */}
      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))",
            gap: "24px",
          }}
        >
          {sortedEpisodes.map((ep) => (
            <EpisodeCard
              key={ep.id}
              episode={ep}
              onPlay={() => onPlayEpisode(ep.episodeNumber, ep.title, ep.directLink)}
              onDownload={() => onDownloadEpisode && onDownloadEpisode(ep.episodeNumber, ep.title, ep.directLink)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface EpisodeCardProps {
  episode: EpisodeItem;
  onPlay: () => void;
  onDownload: () => void;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, onPlay, onDownload }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const rafRef = React.useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = 8;
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

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onPlay}
      style={{
        display: "flex",
        gap: "18px",
        alignItems: "flex-start",
        padding: "16px 18px",
        borderRadius: "16px",
        cursor: "pointer",
        background: isHovered ? "rgba(255, 255, 255, 0.05)" : "transparent",
        border: isHovered ? "1px solid rgba(255, 255, 255, 0.18)" : "1px solid transparent",
        boxShadow: isHovered ? "0 12px 30px rgba(0, 0, 0, 0.65)" : "none",
        transform: isHovered ? "translateY(-3px) scale(1.015)" : "translateY(0) scale(1)",
        transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        userSelect: "none",
        perspective: "1000px",
      }}
    >
      {/* Left: 16:9 Landscape Still Thumbnail with 3D Tilt */}
      <div
        style={{
          position: "relative",
          width: "220px",
          aspectRatio: "16 / 9",
          borderRadius: "12px",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "#0e1118",
          border: isHovered ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: isHovered ? "0 14px 28px rgba(0, 0, 0, 0.85)" : "0 2px 10px rgba(0, 0, 0, 0.4)",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.04, 1.04, 1.04)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          transition: isHovered
            ? "transform 0.08s ease-out, border-color 0.2s ease, box-shadow 0.2s ease"
            : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease, box-shadow 0.35s ease",
        }}
      >
        {episode.stillPath && !imgError ? (
          <img
            src={episode.stillPath}
            alt={episode.title}
            loading="lazy"
            onError={() => setImgError(true)}
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
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #161b26 0%, #0c0f14 100%)",
              color: "rgba(255,255,255,0.35)",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            EP {episode.episodeNumber}
          </div>
        )}

        {/* Subtle center play icon on hover with ultra-translucent frosted glass */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isHovered ? "rgba(0, 0, 0, 0.35)" : "transparent",
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.2s ease",
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
              transform: isHovered ? "scale(1.10)" : "scale(0.95)",
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease",
            }}
          >
            <PlayIcon size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: "2px" }} />
          </div>
        </div>
      </div>

      {/* Right: Info Column */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {/* Top Line: EPISODE X · 23 min  +  Frosted [ Download ] Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "12.5px",
              fontWeight: 800,
              color: "#94a3b8",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            EPISODE {episode.episodeNumber}{episode.runtime ? ` · ${episode.runtime} min` : ""}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            title="Download episode"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e50914";
              e.currentTarget.style.borderColor = "#e50914";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
            }}
          >
            <DownloadIcon size={12} color="#ffffff" />
            <span>Download</span>
          </button>
        </div>

        {/* Middle Line: Episode Title in Bold White */}
        <h3
          style={{
            fontSize: "17.5px",
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {episode.title}
        </h3>

        {/* Bottom Line: Minimal Synopsis */}
        <p
          style={{
            fontSize: "13.5px",
            lineHeight: 1.55,
            color: "#cbd5e1",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {episode.overview}
        </p>
      </div>
    </div>
  );
};
