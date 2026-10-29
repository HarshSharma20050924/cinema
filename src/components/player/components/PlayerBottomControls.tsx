import React from "react";
import {
  PlayIcon,
  PauseIcon,
  Rewind10Icon,
  Forward10Icon,
  VolumeHighIcon,
  VolumeMuteIcon,
  EpisodesListIcon,
  SubtitlesIcon,
  SettingsGearIcon,
  FullscreenIcon,
  FullscreenExitIcon,
  ServerIcon,
  BookmarkIcon,
  PipIcon,
} from "./PlayerIcons";
import { formatTime, computeEstimatedEndTime } from "../utils/playerUtils";
import type { ActiveMenuType } from "./PlayerSettingsFlyout";

export interface PlayerBottomControlsProps {
  controlsVisible: boolean;
  isPlaying: boolean;
  togglePlay: () => void;
  duration: number;
  currentTime: number;
  isHoveringScrubber: boolean;
  isDraggingScrubber: boolean;
  setIsHoveringScrubber: (hovering: boolean) => void;
  arrowSeekPreviewTime: number | null;
  hoverPercent: number;
  hoverTime: number;
  scrubberRef: React.RefObject<HTMLDivElement | null>;
  bufferedPercent: number;
  handleScrubberMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleScrubberLeave: () => void;
  handleScrubberMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleScrubberSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleSkip: (delta: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isTvOrAnime: boolean;
  showEpisodesDrawer: boolean;
  setShowEpisodesDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  subtitlesEnabled: boolean;
  setSubtitlesEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  activeMenu: ActiveMenuType;
  setActiveMenu: (m: ActiveMenuType) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  title: string;
  season?: number;
  episode?: number;
  togglePip?: () => void;
  onBookmarkClick?: () => void;
  isBookmarked?: boolean;
}

export const PlayerBottomControls: React.FC<PlayerBottomControlsProps> = ({
  controlsVisible,
  isPlaying,
  togglePlay,
  duration,
  currentTime,
  isHoveringScrubber,
  isDraggingScrubber,
  setIsHoveringScrubber,
  arrowSeekPreviewTime,
  hoverPercent,
  hoverTime,
  scrubberRef,
  bufferedPercent,
  handleScrubberMouseMove,
  handleScrubberLeave,
  handleScrubberMouseDown,
  handleScrubberSeek,
  handleSkip,
  isMuted,
  toggleMute,
  volume,
  handleVolumeChange,
  isTvOrAnime,
  showEpisodesDrawer,
  setShowEpisodesDrawer,
  subtitlesEnabled,
  setSubtitlesEnabled,
  activeMenu,
  setActiveMenu,
  isFullscreen,
  toggleFullscreen,
  title,
  season,
  episode,
  togglePip,
  onBookmarkClick,
  isBookmarked = false,
}) => {
  const currentPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const remainingSeconds = Math.max(0, duration - currentTime);
  const estimatedEndTime = computeEstimatedEndTime(remainingSeconds);

  // Clean title display: e.g. "Drive - The Pretenders" or "No Country for Old Men"
  const episodeTag = season && episode ? `S${season} E${episode}` : "";

  return (
    <div
      className="cinema-player-controls-bottom"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 40,
        background: "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.35) 25%, rgba(0, 0, 0, 0.72) 65%, rgba(0, 0, 0, 0.95) 100%)",
        borderTop: "none",
        boxShadow: "none",
        padding: "0 24px 10px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        opacity: controlsVisible || !isPlaying ? 1 : 0,
        pointerEvents: controlsVisible || !isPlaying ? "auto" : "none",
        transform: controlsVisible || !isPlaying ? "translateY(0)" : "translateY(100%)",
        transition: "opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        userSelect: "none",
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .cinema-volume-slider {
            display: none !important;
          }
          .cinema-player-desktop-meta {
            display: none !important;
          }
          .cinema-player-controls-bottom {
            padding: 0 10px 8px 10px !important;
          }
          .cinema-ctrl-btn {
            width: 32px !important;
            height: 32px !important;
          }
        }
      `}</style>
      {/* Clean Hover Time Bubble */}
      {((isHoveringScrubber || isDraggingScrubber) || arrowSeekPreviewTime !== null) && duration > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "52px",
            left: `${arrowSeekPreviewTime !== null ? (currentTime / duration) * 100 : hoverPercent * 100}%`,
            transform: "translateX(-50%)",
            zIndex: 45,
            pointerEvents: "none",
            animation: "fadeIn 0.15s ease-out",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <div
            style={{
              background: "rgba(36, 42, 52, 0.88)",
              backdropFilter: "blur(24px) saturate(190%)",
              WebkitBackdropFilter: "blur(24px) saturate(190%)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: "10px",
              padding: "5px 12px",
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#ffffff",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.65), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)",
              whiteSpace: "nowrap",
            }}
          >
            {formatTime(arrowSeekPreviewTime !== null ? arrowSeekPreviewTime : hoverTime)}
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid rgba(255, 255, 255, 0.35)",
            }}
          />
        </div>
      )}

      {/* Full-width Scrubber / Timeline Bar spanning across top of bottom bar */}
      <div
        ref={scrubberRef}
        onClick={handleScrubberSeek}
        onMouseDown={handleScrubberMouseDown}
        onMouseMove={handleScrubberMouseMove}
        onMouseEnter={() => setIsHoveringScrubber(true)}
        onMouseLeave={handleScrubberLeave}
        style={{
          position: "relative",
          width: "100%",
          height: "24px",
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          padding: "4px 0",
        }}
      >
        {/* Track Base */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: isHoveringScrubber || isDraggingScrubber ? "6px" : "3.5px",
            backgroundColor: "rgba(255, 255, 255, 0.16)",
            borderRadius: "9999px",
            overflow: "hidden",
            transition: "height 0.15s ease",
          }}
        >
          {/* Buffered Bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${bufferedPercent}%`,
              backgroundColor: "rgba(255, 255, 255, 0.32)",
              transition: "width 0.2s linear",
            }}
          />
          {/* Hover Highlight Bar */}
          {isHoveringScrubber && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${hoverPercent * 100}%`,
                backgroundColor: "rgba(255, 255, 255, 0.22)",
              }}
            />
          )}
          {/* Played Progress Bar (Cinema Red) */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${currentPercent}%`,
              backgroundColor: "#e50914",
              boxShadow: "0 0 10px rgba(229, 9, 20, 0.8)",
              transition: isDraggingScrubber ? "none" : "width 0.1s linear",
            }}
          />
        </div>

        {/* Scrubber Playhead Handle */}
        <div
          style={{
            position: "absolute",
            left: `${currentPercent}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: isHoveringScrubber || isDraggingScrubber ? "14px" : "11px",
            height: isHoveringScrubber || isDraggingScrubber ? "14px" : "11px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            boxShadow: "0 0 10px rgba(0, 0, 0, 0.6), 0 0 8px rgba(229, 9, 20, 0.6)",
            border: "2.5px solid #e50914",
            opacity: isHoveringScrubber || isDraggingScrubber || !isPlaying ? 1 : 0.85,
            transition: "width 0.15s ease, height 0.15s ease, opacity 0.15s ease",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Controls Row - Matching Image 2 Reference Layout */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2px 2px",
        }}
      >
        {/* Left Controls: Rewind 10, Play/Pause, Forward 10, Volume, Time, Ends Time • Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Rewind 10s */}
          <button
            className="cinema-ctrl-btn"
            onClick={() => handleSkip(-10)}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            title="Rewind 10s (Left Arrow)"
          >
            <Rewind10Icon size={20} />
          </button>

          {/* Play / Pause */}
          <button
            className="cinema-ctrl-btn"
            onClick={togglePlay}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            title={isPlaying ? "Pause (Space/K)" : "Play (Space/K)"}
          >
            {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
          </button>

          {/* Forward 10s */}
          <button
            className="cinema-ctrl-btn"
            onClick={() => handleSkip(10)}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            title="Forward 10s (Right Arrow)"
          >
            <Forward10Icon size={20} />
          </button>

          {/* Volume Control */}
          <div
            className="cinema-volume-group"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <button
              className="cinema-ctrl-btn"
              onClick={toggleMute}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title={isMuted ? "Unmute (M)" : "Mute (M)"}
            >
              {isMuted || volume === 0 ? <VolumeMuteIcon size={20} /> : <VolumeHighIcon size={20} />}
            </button>
            <input
              type="range"
              className="cinema-volume-slider"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{
                width: "60px",
                height: "4px",
                accentColor: "#e50914",
                cursor: "pointer",
                borderRadius: "999px",
              }}
            />
          </div>

          {/* Timestamp & Ending Indicator & Movie Title (Matching Image 2 Reference) */}
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.9)",
              marginLeft: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span style={{ color: "rgba(255, 255, 255, 0.45)" }}>/</span>
            <span>{formatTime(duration)}</span>

            {/* Ending estimation */}
            {estimatedEndTime && (
              <span className="cinema-player-desktop-meta" style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", marginLeft: "4px" }}>
                {estimatedEndTime}
              </span>
            )}

            {/* Bullet and Title */}
            {title && (
              <span
                className="cinema-player-desktop-meta"
                style={{
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  maxWidth: "420px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span style={{ color: "rgba(255, 255, 255, 0.35)" }}>•</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {title} {episodeTag && `(${episodeTag})`}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right Controls Matching Image 2: Episodes, CC, Audio, Server, Bookmark, Settings, PiP, Fullscreen */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Episodes Drawer Toggle Button */}
          {isTvOrAnime && (
            <button
              className="cinema-ctrl-btn"
              onClick={() => setShowEpisodesDrawer((prev) => !prev)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: showEpisodesDrawer ? "#e50914" : "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Episodes"
            >
              <EpisodesListIcon size={19} />
            </button>
          )}

          {/* Subtitles CC Toggle - opens subtitles menu without red styling */}
          <button
            className="cinema-ctrl-btn"
            onClick={() => setActiveMenu(activeMenu === "subtitles" ? "none" : "subtitles")}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: activeMenu === "subtitles" ? "rgba(255, 255, 255, 0.16)" : "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Subtitles (C)"
          >
            <SubtitlesIcon size={19} />
          </button>

          {/* Server Switcher Button - opens servers menu */}
          <button
            className="cinema-ctrl-btn"
            onClick={() => setActiveMenu(activeMenu === "servers" ? "none" : "servers")}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: activeMenu === "servers" ? "rgba(255, 255, 255, 0.16)" : "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Servers"
          >
            <ServerIcon size={19} />
          </button>

          {/* Bookmark Button */}
          {onBookmarkClick && (
            <button
              className="cinema-ctrl-btn"
              onClick={onBookmarkClick}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: isBookmarked ? "rgba(229, 9, 20, 0.25)" : "transparent",
                border: "none",
                color: isBookmarked ? "#e50914" : "rgba(255, 255, 255, 0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Add to Watchlist"
            >
              <BookmarkIcon size={18} />
            </button>
          )}

          {/* Settings Button */}
          <button
            className="cinema-ctrl-btn"
            onClick={() => setActiveMenu(activeMenu === "none" ? "settings" : "none")}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: activeMenu !== "none" ? "rgba(255, 255, 255, 0.16)" : "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform 0.2s ease, background 0.15s ease",
              transform: activeMenu !== "none" ? "rotate(45deg)" : "rotate(0deg)",
            }}
            title="Settings"
          >
            <SettingsGearIcon size={19} />
          </button>

          {/* PiP Button */}
          {togglePip && (
            <button
              className="cinema-ctrl-btn"
              onClick={togglePip}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              title="Picture in Picture (P)"
            >
              <PipIcon size={19} />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            className="cinema-ctrl-btn"
            onClick={toggleFullscreen}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            title="Fullscreen (F)"
          >
            {isFullscreen ? <FullscreenExitIcon size={20} /> : <FullscreenIcon size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};
