import React from "react";
import { CloseIcon, PlayIcon } from "./PlayerIcons";

interface PlayerEpisodesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSeason: number;
  currentEpisode: number;
  totalSeasonsCount: number;
  drawerSeason: number;
  setDrawerSeason: (s: number) => void;
  loadingDrawerEpisodes: boolean;
  drawerSeasonEpisodes: any[];
  allMovieBoxDubs: any[];
  switchEpisode: (season: number, epNum: number) => void;
  activeBackdrop?: string | null;
  poster?: string;
}

export const PlayerEpisodesDrawer: React.FC<PlayerEpisodesDrawerProps> = ({
  isOpen,
  onClose,
  currentSeason,
  currentEpisode,
  totalSeasonsCount,
  drawerSeason,
  setDrawerSeason,
  loadingDrawerEpisodes,
  drawerSeasonEpisodes,
  allMovieBoxDubs,
  switchEpisode,
  activeBackdrop,
  poster,
}) => {
  if (!isOpen) return null;

  const episodesToRender =
    drawerSeasonEpisodes.length > 0
      ? drawerSeasonEpisodes
      : (allMovieBoxDubs[0]?.directLinks || []).map((_: any, idx: number) => ({
          episode_number: idx + 1,
          name: `Episode ${idx + 1}`,
        }));

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(420px, 92vw)",
        background: "rgba(28, 34, 44, 0.82)",
        backdropFilter: "blur(36px) saturate(190%)",
        WebkitBackdropFilter: "blur(36px) saturate(190%)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.14)",
        boxShadow: "-16px 0 45px rgba(0, 0, 0, 0.65), inset 1px 0 1px 0 rgba(255, 255, 255, 0.18)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 22px 14px 22px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
            Episodes
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginTop: "2px" }}>
            Season {currentSeason} · Episode {currentEpisode}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "none",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      {/* Season Selector Tabs */}
      {totalSeasonsCount > 1 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "12px 20px",
            overflowX: "auto",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            scrollbarWidth: "none",
          }}
        >
          {Array.from({ length: totalSeasonsCount }, (_, i) => i + 1).map((sNum) => {
            const isSelected = drawerSeason === sNum;
            return (
              <button
                key={sNum}
                onClick={() => setDrawerSeason(sNum)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  background: isSelected ? "rgba(255, 255, 255, 0.20)" : "rgba(255, 255, 255, 0.08)",
                  border: isSelected ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isSelected ? "0 4px 12px rgba(0, 0, 0, 0.4)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Season {sNum}
              </button>
            );
          })}
        </div>
      )}

      {/* Episode List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {loadingDrawerEpisodes ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255, 255, 255, 0.5)", fontSize: "14px" }}>
            Loading episodes...
          </div>
        ) : (
          episodesToRender.map((ep: any, idx: number) => {
            const epNum = ep.episode_number || ep.episodeNumber || idx + 1;
            const isPlayingEp = drawerSeason === currentSeason && epNum === currentEpisode;
            const epTitle = ep.name || ep.title || `Episode ${epNum}`;
            const stillUrl = ep.still_path
              ? ep.still_path.startsWith("http")
                ? ep.still_path
                : `https://image.tmdb.org/t/p/w300${ep.still_path}`
              : ep.image || activeBackdrop || poster;

            return (
              <div
                key={ep.id || idx}
                onClick={() => {
                  switchEpisode(drawerSeason, epNum);
                }}
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "10px",
                  borderRadius: "14px",
                  background: isPlayingEp ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
                  border: isPlayingEp ? "1px solid rgba(255, 255, 255, 0.28)" : "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isPlayingEp) e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  if (!isPlayingEp) e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.transform = "translateY(0px)";
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    position: "relative",
                    width: "105px",
                    height: "60px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    flexShrink: 0,
                    backgroundColor: "#1e2430",
                  }}
                >
                  {stillUrl ? (
                    <img
                      src={stillUrl}
                      alt={epTitle}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        fontSize: "11px",
                      }}
                    >
                      EP {epNum}
                    </div>
                  )}
                  {isPlayingEp && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                      }}
                    >
                      <PlayIcon size={16} />
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: isPlayingEp ? "#ffffff" : "rgba(255, 255, 255, 0.55)",
                        letterSpacing: "0.5px",
                      }}
                    >
                      EPISODE {epNum}
                    </span>
                    {isPlayingEp && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 800,
                          background: "rgba(255, 255, 255, 0.16)",
                          border: "1px solid rgba(255, 255, 255, 0.24)",
                          color: "#ffffff",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          letterSpacing: "0.5px",
                        }}
                      >
                        NOW PLAYING
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: "2px",
                    }}
                  >
                    {epTitle}
                  </div>
                  {ep.runtime && (
                    <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", marginTop: "2px" }}>
                      {ep.runtime} min
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
