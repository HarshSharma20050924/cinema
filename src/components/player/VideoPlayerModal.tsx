import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { launchExternalPlayer } from "../../hooks/useSettings";
import { fetchTMDBDetails, fetchTMDBSeasonDetails } from "../../api/tmdb";
import { saveContinueWatching } from "../../utils/continueWatchingService";

const cleanAudioName = (raw: string): string => {
  if (!raw) return "Original Audio";
  let cleaned = raw
    .replace(/\s*·\s*Season\s*\d+/gi, "")
    .replace(/\s*-\s*Season\s*\d+/gi, "")
    .replace(/\s*Season\s*\d+/gi, "")
    .replace(/\b(dub|dubbed|dubbing)\b/gi, "")
    .replace(/[^a-zA-Z0-9\s()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.toLowerCase() === "dub") return "Original Audio";
  return cleaned;
};

export function isStrictTitleMatch(candidateTitle: string, queryTitle: string, expectedYear?: number | string): boolean {
  if (!candidateTitle || !queryTitle) return false;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\[.*?\]|\(.*?\)/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const stopWords = new Set([
    "the", "a", "an", "of", "and", "in", "to", "movie", "full", "hindi", "dubbed",
    "dual", "audio", "season", "episode", "part", "hd", "hq", "org", "web", "dl", "rip"
  ]);

  const cleanCand = normalize(candidateTitle);
  const cleanQuery = normalize(queryTitle);

  if (cleanCand === cleanQuery) return true;

  const queryTokens = cleanQuery.split(" ").filter((t) => t.length > 1 && !stopWords.has(t));
  const candTokens = cleanCand.split(" ").filter((t) => t.length > 1 && !stopWords.has(t));

  if (queryTokens.length === 0) return cleanCand.includes(cleanQuery);

  // All primary query tokens MUST be matched in candidate tokens
  const allMatched = queryTokens.every((token) => candTokens.includes(token));
  if (!allMatched) return false;

  // STRICT CHECK: Reject if candidate has 2 or more extra major distinguishing words not in query
  const extraCandTokens = candTokens.filter((t) => !queryTokens.includes(t) && isNaN(Number(t)));
  if (extraCandTokens.length >= 2 && queryTokens.length <= 2) {
    return false;
  }

  // Check Year discrepancy if year is present in candidate title and expectedYear
  const candYearMatch = candidateTitle.match(/\b(19\d\d|20\d\d)\b/);
  if (candYearMatch && expectedYear) {
    const candYear = parseInt(candYearMatch[1], 10);
    const expYear = typeof expectedYear === "number" ? expectedYear : parseInt(String(expectedYear), 10);
    if (!isNaN(candYear) && !isNaN(expYear)) {
      if (Math.abs(candYear - expYear) > 1) {
        return false;
      }
    }
  }

  return true;
}

export interface VideoPlayerModalProps {
  playbackUrl: string | null;
  title?: string;
  backdrop?: string;
  poster?: string;
  logo?: string;
  servers?: Array<{ server: string; link: string; quality?: string; type?: string }>;
  runtime?: string | number;
  season?: number;
  episode?: number;
  episodes?: Array<{ episodeNumber: number; title: string; image?: string; link?: string; overview?: string }>;
  seasonsCount?: number;
  tmdbId?: number;
  initialTime?: number;
  post?: any;
  onSelectEpisode?: (seasonNum: number, episodeNum: number) => void;
  onSelectMedia?: (media: any) => void;
  onClose: () => void;
}

// -------------------------------------------------------------
// Sleek Minimalist SVG Icons matching CNO.TO aesthetic exactly
// -------------------------------------------------------------
const BackIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = "rgba(255, 255, 255, 0.45)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const CloseIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlayIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

const PauseIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1.5" />
    <rect x="14" y="4" width="4" height="16" rx="1.5" />
  </svg>
);

const Rewind10Icon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5L7 9l4 4" />
    <path d="M7 9h8a5 5 0 0 1 5 5v1a5 5 0 0 1-5 5H8" />
    <text x="12" y="16" fontSize="8" fontWeight="800" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="sans-serif">10</text>
  </svg>
);

const Forward10Icon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 5l4 4-4 4" />
    <path d="M17 9H9a5 5 0 0 0-5 5v1a5 5 0 0 0 5 5h7" />
    <text x="12" y="16" fontSize="8" fontWeight="800" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="sans-serif">10</text>
  </svg>
);

const VolumeHighIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const VolumeMuteIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const SubtitlesIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M7 15h2M15 15h2M7 11h4M13 11h4" strokeWidth="2.4" />
  </svg>
);

const ServerIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="6" rx="2" />
    <rect x="3" y="14" width="18" height="6" rx="2" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
    <line x1="7" y1="17" x2="7.01" y2="17" strokeWidth="3" />
  </svg>
);

const AspectRatioIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <line x1="6" y1="5" x2="6" y2="19" strokeWidth="1.5" strokeDasharray="2 2" />
    <line x1="18" y1="5" x2="18" y2="19" strokeWidth="1.5" strokeDasharray="2 2" />
  </svg>
);

const BookmarkIcon: React.FC<{ size?: number }> = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const SettingsGearIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const PipIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <rect x="12" y="11" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" />
  </svg>
);

const FullscreenIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const FullscreenExitIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
);

const WatchPartyIcon: React.FC<{ size?: number }> = ({ size = 21 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SpeedIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ChatBubbleIcon: React.FC<{ size?: number }> = ({ size = 21 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const LinkChainIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CrossIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const AlertCircleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const RefreshCwIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const SlidersIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const SunIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const StarIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const DragHandleIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" opacity={0.35}>
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);

const CloudServersIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

const EpisodesDrawerIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 15h4M7 9h10M7 12h10" />
  </svg>
);


// -------------------------------------------------------------
// Formatters
// -------------------------------------------------------------
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function computeEstimatedEndTime(remainingSeconds: number): string {
  if (isNaN(remainingSeconds) || remainingSeconds <= 0) return "";
  const endDate = new Date(Date.now() + remainingSeconds * 1000);
  let hours = endDate.getHours();
  const minutes = endDate.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `Ends ${hours}:${minutes} ${ampm}`;
}

const PlayerRecommendedCard: React.FC<{
  item: any;
  onSelect: (item: any) => void;
}> = ({ item, onSelect }) => {
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

        {/* Portrait Card Overlay on Hover (Matching Home MediaCard) */}
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

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  playbackUrl,
  title = "Cinema Stream",
  backdrop,
  poster,
  logo: initialLogo,
  servers: initialServers,
  runtime,
  season,
  episode,
  episodes: initialEpisodes,
  seasonsCount: initialSeasonsCount,
  tmdbId,
  initialTime,
  post,
  onSelectEpisode,
  onSelectMedia,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const isDraggingScrubberRef = useRef<boolean>(false);
  const arrowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverProbeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Logo & Recommended Movies State
  const [movieLogoUrl, setMovieLogoUrl] = useState<string | null>(initialLogo || null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingMoreQualities, setIsLoadingMoreQualities] = useState<boolean>(false);

  // Smooth Scrubber & Netflix-style Frame Preview State
  const [isHoveringScrubber, setIsHoveringScrubber] = useState<boolean>(false);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState<boolean>(false);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [arrowSeekPreviewTime, setArrowSeekPreviewTime] = useState<number | null>(null);

  // Season & Episode tracking
  const [currentSeason, setCurrentSeason] = useState<number>(season || 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(episode || 1);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState<boolean>(false);
  const [drawerSeason, setDrawerSeason] = useState<number>(season || 1);
  const [drawerSeasonEpisodes, setDrawerSeasonEpisodes] = useState<any[]>(initialEpisodes || []);
  const [loadingDrawerEpisodes, setLoadingDrawerEpisodes] = useState<boolean>(false);
  const [allMovieBoxDubs, setAllMovieBoxDubs] = useState<any[]>([]);
  const [totalSeasonsCount, setTotalSeasonsCount] = useState<number>(initialSeasonsCount || 1);
  const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false);

  // Candidate servers state supporting multi-server retry failover
  const [serverList, setServerList] = useState<
    Array<{
      id: number;
      name: string;
      link: string;
      type?: string;
      headers?: Record<string, string>;
      quality?: string;
      language?: string;
      sourceTitle?: string;
    }>
  >(() => {
    if (initialServers && initialServers.length > 0) {
      const validStreams = initialServers
        .filter((s) => {
          if (!s || !s.link) return false;
          const nameLower = (s.server || "").toLowerCase();
          const linkLower = s.link.toLowerCase();
          if (s.type === "download") return false;
          if (nameLower.includes("download only") || nameLower.includes("gdrive")) return false;
          if (linkLower.includes("hubdrive") || linkLower.includes("katdrive") || linkLower.includes("drive.google.com")) return false;
          if (linkLower.includes(".zip") || linkLower.includes("/torrent/download")) return false;
          return true;
        })
        .map((s, idx) => ({
          id: idx,
          name: s.server || `Server ${idx + 1}`,
          link: s.link,
          type: s.type,
          headers: (s as any).headers,
          quality: (s as any).quality,
          language: (s as any).language,
          sourceTitle: (s as any).sourceTitle || s.server,
        }));
      if (validStreams.length > 0) return validStreams;
    }

    const raw = playbackUrl || "";
    if (!raw) return [{ id: 0, name: "Direct Stream", link: "" }];

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const isDirectCors =
      raw.includes("pixeldrain.dev") ||
      raw.includes("pixeldrain.com") ||
      raw.includes("gofile.io") ||
      raw.includes("r2.dev");

    // Resilient server cascade: Direct -> Edge Proxy -> Render Nodes
    const baseList: Array<{ id: number; name: string; link: string; type?: string; headers?: Record<string, string> }> = [];

    const isLandingPage =
      !raw ||
      raw.includes("greenmotors") ||
      raw.includes("hubcloud") ||
      raw.includes("/?id=") ||
      raw.includes(".zip") ||
      raw.includes("/torrent/download");

    if (!isLandingPage) {
      baseList.push({ id: 0, name: "Server 1 (Direct)", link: raw });
      if (!isDirectCors && origin) {
        baseList.push({
          id: 1,
          name: "Server 2 (High-Speed)",
          link: `${origin}/api/proxy?url=${encodeURIComponent(raw)}`,
        });
        baseList.push({
          id: 2,
          name: "Server 3 (Edge Stream)",
          link: `${origin}/api/proxy?url=${encodeURIComponent(raw)}&stream=1`,
        });
      }
    }

    return baseList;
  });

  // Dynamic moving scanning status text
  const [fetchingStatusText, setFetchingStatusText] = useState<string>("Discovering high-speed streaming mirrors...");

  // Player State
  const [playerStatus, setPlayerStatus] = useState<"fetching" | "starting" | "ready" | "error">("fetching");
  const [currentServerIdx, setCurrentServerIdx] = useState<number>(0);
  const [serverStatuses, setServerStatuses] = useState<Record<number, "pending" | "trying" | "success" | "failed">>({
    0: "trying",
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // CNO.TO aesthetic controls & flyouts
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [videoFit, setVideoFit] = useState<"fit" | "fill" | "stretch">("fit");
  const [brightnessLevel, setBrightnessLevel] = useState<number>(100);
  const [cropBlackBars, setCropBlackBars] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volumeBoost, setVolumeBoost] = useState<number>(100);
  const [pictureFilter, setPictureFilter] = useState<"standard" | "vivid" | "warm" | "contrast">("standard");
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [activeMenu, setActiveMenu] = useState<
    | "none"
    | "playback_settings"
    | "settings"
    | "speed"
    | "quality"
    | "audio"
    | "subtitles"
    | "picture"
    | "sleep"
    | "servers"
  >("none");
  const [qualityLevels, setQualityLevels] = useState<Array<{ id: number; height: number; name: string; serverIdx?: number }>>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto
  const [audioTracks, setAudioTracks] = useState<
    Array<{
      id: number;
      name: string;
      lang?: string;
      isMovieBoxDub?: boolean;
      rawTarget?: string;
      streamLink?: string;
      headers?: Record<string, string>;
      serverIdx?: number;
    }>
  >([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);
  const [subtitlesList, setSubtitlesList] = useState<Array<{ id: number; name: string; lang?: string; file?: string }>>([
    { id: -1, name: "Off" },
    { id: 0, name: "English (US)", lang: "en" },
    { id: 1, name: "Hindi", lang: "hi" },
    { id: 2, name: "Spanish", lang: "es" },
    { id: 3, name: "French", lang: "fr" },
    { id: 4, name: "Arabic", lang: "ar" },
  ]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1);
  const [subtitleSearch, setSubtitleSearch] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Poster/Backdrop dynamic loader
  const [activeBackdrop, setActiveBackdrop] = useState<string>(() => {
    if (backdrop || poster) return backdrop || poster || "";
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("backdrop") || sp.get("poster") || sp.get("image") || "";
    }
    return "";
  });

  // Resilient state tracking refs to prevent video replay loops & pause overriding
  const serverListRef = useRef(serverList);
  serverListRef.current = serverList;
  const hasConnectedRef = useRef(false);
  const userPausedRef = useRef(false);
  const hasResumedRef = useRef(false);
  const lastSavedTimeRef = useRef(0);
  const pendingSeekTimeRef = useRef<number | null>(null);

  // Automatic progress persistence to Continue Watching Service
  const saveCurrentProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const curr = video.currentTime;
    const dur = (video.duration && !isNaN(video.duration) && video.duration > 0) ? video.duration : (duration || 0);
    if (curr < 4 || isNaN(curr)) return;
    if (Math.abs(curr - lastSavedTimeRef.current) < 2) return;
    lastSavedTimeRef.current = curr;

    const itemId = String(post?.id || post?.link || tmdbId || title || "video");
    saveContinueWatching({
      id: itemId,
      title: title || "Movie",
      cleanTitle: title,
      poster: poster || backdrop || post?.image || "",
      backdrop: backdrop || poster || post?.image || "",
      currentTime: curr,
      duration: dur,
      playbackUrl: playbackUrl || "",
      servers: serverListRef.current,
      isSeries: !!(season || episode || (initialEpisodes && initialEpisodes.length > 0)),
      season,
      episode,
      tmdbId,
      post,
    });
  }, [title, poster, backdrop, playbackUrl, season, episode, tmdbId, post, duration, initialEpisodes]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 2500);
  }, []);

  // Compute safe proxied URL with anti-hotlinking headers so CDN doesn't block player
  const getPlayableUrl = useCallback((rawUrl: string, headers?: Record<string, string>) => {
    if (!rawUrl) return "";
    // Avoid proxying HTML landing pages or shorteners
    if (
      rawUrl.includes("greenmotors") ||
      rawUrl.includes("hubcloud") ||
      rawUrl.includes("/?id=")
    ) {
      return "";
    }
    // If the server URL is already a cluster node or proxy URL, return as is without re-wrapping
    if (
      rawUrl.includes("/api/proxy") ||
      rawUrl.includes("onrender.com") ||
      rawUrl.includes("pixeldrain.dev") ||
      rawUrl.includes("pixeldrain.com") ||
      rawUrl.includes("gofile.io") ||
      rawUrl.includes("r2.dev")
    ) {
      return rawUrl;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (origin) {
      let proxyUrl = `${origin}/api/proxy?url=${encodeURIComponent(rawUrl)}`;
      if (headers) {
        if (headers.Referer) proxyUrl += `&referer=${encodeURIComponent(headers.Referer)}`;
        if (headers.Origin) proxyUrl += `&origin=${encodeURIComponent(headers.Origin)}`;
        proxyUrl += `&headers=${encodeURIComponent(JSON.stringify(headers))}`;
      }
      return proxyUrl;
    }
    return rawUrl;
  }, []);

  // Connect active server stream with HLS / HTML5 Video with full multi-server retry failover
  const connectToServer = useCallback((serverIdx: number, forcePlay = false) => {
    const list = serverListRef.current;
    const target = list[serverIdx] || serverList[serverIdx];
    if (!target || !target.link) {
      setPlayerStatus("fetching");
      return;
    }

    hasConnectedRef.current = true;
    setCurrentServerIdx(serverIdx);
    setServerStatuses((prev) => {
      const next: Record<number, "pending" | "trying" | "success" | "failed"> = { ...prev };
      list.forEach((_, i) => {
        if (i < serverIdx) next[i] = "failed";
        else if (i === serverIdx) next[i] = "trying";
      });
      return next;
    });

    const safeUrl = getPlayableUrl(target.link, target.headers);
    const video = videoRef.current;
    if (!video) return;

    const previousTime = video.currentTime > 2 ? video.currentTime : 0;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);

    // Failover helper: records failure and advances to the next available server in the cascade
    const handleServerFail = (idx: number, reason: string) => {
      if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);
      setServerStatuses((prev) => ({ ...prev, [idx]: "failed" }));
      const currentList = serverListRef.current;
      if (idx + 1 < currentList.length) {
        const next = currentList[idx + 1];
        showToast(`Server ${idx + 1} unavailable (${reason}). Switching to ${next.name}...`);
        connectToServer(idx + 1, true);
      } else {
        setPlayerStatus("error");
      }
    };

    // Auto failover timeout: Allow 12 seconds for initial connection & buffer negotiation
    serverProbeTimeoutRef.current = setTimeout(() => {
      handleServerFail(serverIdx, "Timeout");
    }, 12000);

    if (!safeUrl || !safeUrl.trim()) {
      handleServerFail(serverIdx, "Invalid stream URL");
      return;
    }

    const isM3u8 = safeUrl.includes(".m3u8") || safeUrl.includes("/hls/") || safeUrl.includes("/stream/");

    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // VoD movies must use deep buffer ahead, not low-latency live mode
        backBufferLength: 90,
        maxBufferLength: 60, // 60 seconds buffer ahead
        maxMaxBufferLength: 600, // up to 10 minutes cache
        maxBufferSize: 60 * 1000 * 1000, // 60MB max buffer
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
        maxFragLookUpTolerance: 0.25,
      });

      hls.loadSource(safeUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_ev, data) => {
        if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);
        setServerStatuses((prev) => ({ ...prev, [serverIdx]: "success" }));

        // Map available quality levels
        if (data.levels && data.levels.length > 0) {
          const lvls = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height,
            name: lvl.height ? `${lvl.height}p` : `Level ${index + 1}`,
          }));
          setQualityLevels(lvls);
        }

        // Map audio tracks
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const aTracks = hls.audioTracks.map((trk, idx) => ({
            id: idx,
            name: trk.name || trk.lang || `Track ${idx + 1}`,
            lang: trk.lang,
          }));
          setAudioTracks(aTracks);
        }

        // Map subtitle tracks
        if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          const sTracks = hls.subtitleTracks.map((trk, idx) => ({
            id: idx,
            name: trk.name || trk.lang || `Sub ${idx + 1}`,
            lang: trk.lang,
          }));
          setSubtitlesList((prev) => [
            { id: -1, name: "Off" },
            ...sTracks,
            ...prev.filter((p) => p.file),
          ]);
        }

        // Transition from "Fetching Media" -> "Starting" state
        setPlayerStatus("starting");

        const targetResume = (initialTime && initialTime > 4 && !hasResumedRef.current)
          ? initialTime
          : (previousTime > 2 ? previousTime : 0);

        if (targetResume > 0) {
          try {
            video.currentTime = targetResume;
            setCurrentTime(targetResume);
            hasResumedRef.current = true;
            if (initialTime && initialTime > 4) {
              showToast(`Resumed from ${formatTime(targetResume)}`);
            }
          } catch {}
        }

        if (!userPausedRef.current || forcePlay) {
          video.play().catch(() => {});
        }

        setTimeout(() => {
          setPlayerStatus("ready");
          showToast(`Connected to ${target.name}`);
        }, 500);
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_ev, data) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          const aTracks = data.audioTracks.map((trk, idx) => ({
            id: idx,
            name: trk.name || trk.lang || `Track ${idx + 1}`,
            lang: trk.lang,
          }));
          setAudioTracks(aTracks);
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_ev, data) => {
        if (data.subtitleTracks && data.subtitleTracks.length > 0) {
          const sTracks = data.subtitleTracks.map((trk, idx) => ({
            id: idx,
            name: trk.name || trk.lang || `Sub ${idx + 1}`,
            lang: trk.lang,
          }));
          setSubtitlesList((prev) => [
            { id: -1, name: "Off" },
            ...sTracks,
            ...prev.filter((p) => p.file),
          ]);
        }
      });

      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (data.fatal) {
          hls.destroy();
          handleServerFail(serverIdx, "Stream Error");
        }
      });
    } else {
      // Direct MP4 / Native video tag
      video.src = safeUrl;

      const cleanupDirectListeners = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("canplay", onLoaded);
        video.removeEventListener("error", onError);
      };

      const onLoaded = () => {
        cleanupDirectListeners();
        if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);
        setServerStatuses((prev) => ({ ...prev, [serverIdx]: "success" }));
        setPlayerStatus("starting");

        const targetResume = (initialTime && initialTime > 4 && !hasResumedRef.current)
          ? initialTime
          : (previousTime > 2 ? previousTime : 0);

        if (targetResume > 0) {
          try {
            video.currentTime = targetResume;
            setCurrentTime(targetResume);
            hasResumedRef.current = true;
            if (initialTime && initialTime > 4) {
              showToast(`Resumed from ${formatTime(targetResume)}`);
            }
          } catch {}
        }

        if (!userPausedRef.current || forcePlay) {
          video.play().catch(() => {});
        }
        setTimeout(() => {
          setPlayerStatus("ready");
          showToast(`Connected to ${target.name}`);
        }, 500);
      };

      const onError = () => {
        cleanupDirectListeners();
        handleServerFail(serverIdx, "Format/Network Error");
      };

      if (video.readyState >= 1) {
        onLoaded();
      } else {
        video.addEventListener("loadedmetadata", onLoaded, { once: true });
        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener("canplay", onLoaded, { once: true });
        video.addEventListener("error", onError, { once: true });
      }
    }
  }, [getPlayableUrl, showToast, initialTime]);

  // Smooth audio track switching between MovieBox dubs and HLS tracks
  const switchAudioTrack = useCallback(async (track: {
    id: number;
    name: string;
    lang?: string;
    isMovieBoxDub?: boolean;
    rawTarget?: string;
    streamLink?: string;
    headers?: Record<string, string>;
    serverIdx?: number;
  }) => {
    setSelectedAudioTrack(track.id);

    // 1. If HLS internal audio track
    if (hlsRef.current && hlsRef.current.audioTracks && hlsRef.current.audioTracks.length > track.id && !track.isMovieBoxDub) {
      hlsRef.current.audioTrack = track.id;
      showToast(`Audio: ${track.name}`);
      return;
    }

    // 2. If MovieBox dub stream
    if (track.isMovieBoxDub) {
      const video = videoRef.current;
      const curTime = video ? video.currentTime : 0;
      const wasPlaying = video ? !video.paused : true;

      let targetUrl = track.streamLink;
      let targetHeaders = track.headers;

      if (!targetUrl && track.rawTarget) {
        showToast(`Loading ${track.name}...`);
        try {
          const res = await fetch(
            `/api/streams?provider=movieBoxWeb&link=${encodeURIComponent(track.rawTarget)}&download=true&title=${encodeURIComponent(title || "Movie")}`
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0]?.link) {
              targetUrl = data[0].link;
              track.streamLink = targetUrl;
              if (data[0].headers) {
                targetHeaders = data[0].headers;
                track.headers = data[0].headers;
              }
            }
          }
        } catch (err) {
          console.error("Failed to resolve dub stream:", err);
        }
      }

      if (targetUrl) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        if (video) {
          const playable = getPlayableUrl(targetUrl, targetHeaders);
          video.src = playable;
          video.load();
          video.onloadedmetadata = () => {
            if (curTime > 0) video.currentTime = curTime;
            if (wasPlaying) video.play().catch(() => {});
          };
        }
        showToast(`Audio: ${track.name}`);
      } else {
        showToast(`Audio track ${track.name} unavailable`);
      }
      return;
    }

    // 3. Fallback server index
    if (track.serverIdx !== undefined && serverList[track.serverIdx]) {
      const curTime = videoRef.current?.currentTime || 0;
      connectToServer(track.serverIdx);
      setTimeout(() => {
        if (videoRef.current && curTime > 0) videoRef.current.currentTime = curTime;
      }, 400);
    }
  }, [serverList, title, getPlayableUrl, showToast, connectToServer]);

  const isSeries = Boolean(
    (season !== undefined && season > 0) ||
    (initialEpisodes && initialEpisodes.length > 0) ||
    (drawerSeasonEpisodes && drawerSeasonEpisodes.length > 0) ||
    (initialSeasonsCount !== undefined && initialSeasonsCount >= 1) ||
    /\b(S\d+\s*E\d+|Season\s*\d+|Episode\s*\d+)\b/i.test(title || "") ||
    (serverList && serverList.some((s) => /Season\s*\d+/i.test(s.server || "")))
  );

  const [isLoadingMoreAudios, setIsLoadingMoreAudios] = useState(false);

  const handleLoadMoreAudios = useCallback(async () => {
    if (isLoadingMoreAudios) return;
    setIsLoadingMoreAudios(true);
    showToast("Searching all available audio tracks...");

    try {
      const clean = (title || "")
        .replace(/\b(1080p|720p|2160p|4k|uhd|hdr|web-dl|webrip|bluray|x264|x265|hevc|aac|dual\s*audio|hindi|english|org|subs?)\b/gi, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/[\._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const res = await fetch(`/api/search?provider=movieBoxWeb&q=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const matches: any[] = await res.json();
        if (Array.isArray(matches) && matches.length > 0) {
          const newTracks = [...audioTracks];
          const seenTargets = new Set(newTracks.map((t) => t.rawTarget));
          const seenNames = new Set(newTracks.map((t) => t.name.toLowerCase()));

          for (const cand of matches.slice(0, 8)) {
            if (!cand?.link) continue;
            // STRICT ACCURACY CHECK: Never accept tracks from a mismatched movie!
            if (!isStrictTitleMatch(cand.title || "", clean)) {
              continue;
            }
            try {
              const metaRes = await fetch(`/api/meta?provider=movieBoxWeb&link=${encodeURIComponent(cand.link)}`);
              if (metaRes.ok) {
                const meta = await metaRes.json();
                const rawLinkList = Array.isArray(meta?.linkList) ? meta.linkList : [];

                let candidateDubs = rawLinkList;
                if (isSeries && currentSeason) {
                  const sRegex = new RegExp(`\\bSeason\\s*0*${currentSeason}\\b`, "i");
                  const sFiltered = rawLinkList.filter((item: any) => sRegex.test(item.title || ""));
                  if (sFiltered.length > 0) candidateDubs = sFiltered;
                }

                const targetEpIdx = isSeries ? Math.max(0, currentEpisode - 1) : 0;
                for (const dub of candidateDubs) {
                  const t = (dub.title || "").toLowerCase();
                  if (t.includes(" sub") || t.includes("subtitle")) continue;
                  const cName = cleanAudioName(dub.title || "Audio Track");
                  const rawTarget = dub.directLinks?.[targetEpIdx]?.link || dub.directLinks?.[0]?.link || dub.link;
                  if (rawTarget && !seenTargets.has(rawTarget) && !seenNames.has(cName.toLowerCase())) {
                    seenTargets.add(rawTarget);
                    seenNames.add(cName.toLowerCase());
                    newTracks.push({
                      id: newTracks.length,
                      name: cName,
                      lang: dub.title,
                      isMovieBoxDub: true,
                      rawTarget,
                      streamLink: undefined,
                      headers: {
                        Referer: "https://officialmoviebox.com/",
                        Origin: "https://officialmoviebox.com",
                      },
                    });
                  }
                }
              }
            } catch (_) {}
          }

          setAudioTracks(newTracks);
          showToast(`Found ${newTracks.length} audio track${newTracks.length > 1 ? "s" : ""}`);
        }
      }
    } catch (err) {
      console.error("handleLoadMoreAudios error:", err);
      showToast("Audio tracks ready");
    } finally {
      setIsLoadingMoreAudios(false);
    }
  }, [audioTracks, currentEpisode, currentSeason, isSeries, isLoadingMoreAudios, showToast, title]);

  // Load more quality streams on demand with 3-dot animation
  const handleLoadMoreQualities = useCallback(async () => {
    if (isLoadingMoreQualities) return;
    setIsLoadingMoreQualities(true);
    showToast("Searching all available quality streams...");

    try {
      if (hlsRef.current && hlsRef.current.levels && hlsRef.current.levels.length > 0) {
        const detected = hlsRef.current.levels.map((lvl, idx) => ({
          id: idx,
          height: lvl.height,
          name: `${lvl.height || 1080}p`,
        }));
        setQualityLevels(detected);
        showToast(`Found ${detected.length} quality levels`);
        setIsLoadingMoreQualities(false);
        return;
      }

      const existingHeights = new Set(qualityLevels.map((q) => q.height).filter(Boolean));
      const newQualities = [...qualityLevels];

      const allPossibleQualities = [
        { height: 2160, name: "4K (2160p)" },
        { height: 1080, name: "1080p (FHD)" },
        { height: 720, name: "720p (HD)" },
        { height: 480, name: "480p (SD)" },
      ];

      for (const q of allPossibleQualities) {
        if (!existingHeights.has(q.height)) {
          existingHeights.add(q.height);
          newQualities.push({
            id: newQualities.length,
            height: q.height,
            name: q.name,
          });
        }
      }

      newQualities.sort((a, b) => (b.height || 0) - (a.height || 0));
      setQualityLevels(newQualities);
      showToast(`Found ${newQualities.length} quality streams`);
    } catch (err) {
      console.error("handleLoadMoreQualities error:", err);
      showToast("Quality streams ready");
    } finally {
      setIsLoadingMoreQualities(false);
    }
  }, [isLoadingMoreQualities, qualityLevels, showToast]);

  // Dynamic episode switcher with instant MovieBox sync
  const switchEpisode = useCallback(
    async (targetSeason: number, targetEpisode: number) => {
      setCurrentSeason(targetSeason);
      setCurrentEpisode(targetEpisode);
      setIsVideoEnded(false);
      setPlayerStatus("fetching");
      setFetchingStatusText(`Switching to Season ${targetSeason} Episode ${targetEpisode}...`);

      onSelectEpisode?.(targetSeason, targetEpisode);

      // Filter MovieBox dubs for the target season
      let dubsForSeason: any[] = [];
      if (allMovieBoxDubs.length > 0) {
        const sRegex = new RegExp(`\\bSeason\\s*0*${targetSeason}\\b`, "i");
        dubsForSeason = allMovieBoxDubs.filter((item: any) => sRegex.test(item.title || ""));
        if (dubsForSeason.length === 0) {
          dubsForSeason = allMovieBoxDubs;
        }
      }

      const effectiveDubs = dubsForSeason.filter((item: any) => {
        const t = (item.title || "").toLowerCase();
        return (
          !t.includes(" sub") &&
          !t.includes("subtitle") &&
          (t.includes("dub") || t.includes("audio") || t.includes("original") || (item.directLinks && item.directLinks.length > 0))
        );
      });

      const dubsToUse = effectiveDubs.length > 0 ? effectiveDubs : dubsForSeason;

      if (dubsToUse.length > 0) {
        const targetEpIdx = Math.max(0, targetEpisode - 1);
        const mappedAudios = dubsToUse.map((dub: any, idx: number) => ({
          id: idx,
          name: cleanAudioName(dub.title || (idx === 0 ? "Original Audio" : `Audio Track ${idx + 1}`)),
          lang: dub.title,
          isMovieBoxDub: true,
          rawTarget: dub.directLinks?.[targetEpIdx]?.link || dub.directLinks?.[0]?.link || dub.link,
          streamLink: undefined as string | undefined,
          headers: {
            Referer: "https://officialmoviebox.com/",
            Origin: "https://officialmoviebox.com",
          },
        }));

        let activeIdx = mappedAudios.findIndex((d) => d.name.toLowerCase().includes("original"));
        if (activeIdx === -1) {
          activeIdx = mappedAudios.findIndex((d) => d.name.toLowerCase().includes("hindi"));
        }
        if (activeIdx === -1) {
          activeIdx = 0;
        }

        const primaryDub = mappedAudios[activeIdx];
        if (primaryDub?.rawTarget) {
          try {
            const sRes = await fetch(
              `/api/streams?provider=movieBoxWeb&link=${encodeURIComponent(primaryDub.rawTarget)}&download=true&title=${encodeURIComponent(title || "Cinema")}`
            );
            if (sRes.ok) {
              const sList: any[] = await sRes.json();
              if (Array.isArray(sList) && sList.length > 0 && sList[0]?.link) {
                primaryDub.streamLink = sList[0].link;
                if (sList[0].headers) primaryDub.headers = sList[0].headers;

                setAudioTracks(mappedAudios);
                setSelectedAudioTrack(activeIdx);

                const serverItem = {
                  id: 0,
                  name: "Server 1",
                  link: sList[0].link,
                  type: sList[0].type || "mp4",
                  headers: sList[0].headers || primaryDub.headers,
                  quality: sList[0].quality ? `${sList[0].quality}p` : "1080p",
                  language: "Server 1",
                  sourceTitle: "Server 1",
                };

                setServerList([serverItem]);
                hasConnectedRef.current = false;
                connectToServer(0, true);
                showToast(`Now Playing: S${targetSeason} E${targetEpisode}`);
                return;
              }
            }
          } catch (err) {
            console.error("switchEpisode stream resolution failed:", err);
          }
        }
      }

      showToast(`Switched to Season ${targetSeason} Episode ${targetEpisode}`);
    },
    [allMovieBoxDubs, connectToServer, onSelectEpisode, showToast, title]
  );

  // Sync drawer episodes when drawerSeason changes
  useEffect(() => {
    if (!tmdbId || drawerSeason <= 0) return;
    if (drawerSeason === (season || 1) && initialEpisodes && initialEpisodes.length > 0) {
      setDrawerSeasonEpisodes(initialEpisodes);
      return;
    }
    let active = true;
    setLoadingDrawerEpisodes(true);
    fetchTMDBSeasonDetails(tmdbId, drawerSeason)
      .then((data) => {
        if (!active) return;
        if (data?.episodes && Array.isArray(data.episodes) && data.episodes.length > 0) {
          setDrawerSeasonEpisodes(data.episodes);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingDrawerEpisodes(false);
      });
    return () => {
      active = false;
    };
  }, [drawerSeason, tmdbId, season, initialEpisodes]);

  // Fetch TMDB transparent PNG movie logo and recommendations for More Like This
  useEffect(() => {
    let active = true;
    fetchTMDBDetails(title, undefined, undefined, tmdbId, isSeries ? "tv" : "movie")
      .then((data) => {
        if (!active || !data) return;
        if (data.logoUrl) {
          setMovieLogoUrl(data.logoUrl);
        }
        if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [title, tmdbId, isSeries]);

  // Sync if initialEpisodes, season, episode, or initialSeasonsCount updates from parent
  useEffect(() => {
    if (initialEpisodes && initialEpisodes.length > 0) {
      setDrawerSeasonEpisodes(initialEpisodes);
    }
  }, [initialEpisodes]);

  useEffect(() => {
    if (season !== undefined && season > 0) {
      setCurrentSeason(season);
      setDrawerSeason(season);
    }
  }, [season]);

  useEffect(() => {
    if (episode !== undefined && episode > 0) {
      setCurrentEpisode(episode);
    }
  }, [episode]);

  useEffect(() => {
    if (initialSeasonsCount !== undefined && initialSeasonsCount > 0) {
      setTotalSeasonsCount(initialSeasonsCount);
    }
  }, [initialSeasonsCount]);

  // Fetch TV seasons count if series has tmdbId but totalSeasonsCount is 1
  useEffect(() => {
    if (!tmdbId || !isSeries) return;
    if (totalSeasonsCount > 1) return;
    fetchTMDBDetails(tmdbId, "tv")
      .then((data) => {
        if (data && (data as any).seasonsCount && (data as any).seasonsCount > 1) {
          setTotalSeasonsCount((data as any).seasonsCount);
        }
      })
      .catch(() => {});
  }, [tmdbId, isSeries, totalSeasonsCount]);

  // Auto hide controls after 3.2s of inactivity
  const handleMouseMove = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (activeMenu === "none") {
          setControlsVisible(false);
        }
      }, 3200);
    }
  }, [isPlaying, activeMenu]);

  // Sync if initialServers updates from parent
  useEffect(() => {
    if (initialServers && initialServers.length > 0) {
      const validStreams = initialServers
        .filter((s) => {
          if (!s || !s.link) return false;
          const nameLower = (s.server || "").toLowerCase();
          const linkLower = s.link.toLowerCase();
          if (s.type === "download") return false;
          if (nameLower.includes("download only") || nameLower.includes("gdrive")) return false;
          if (linkLower.includes("hubdrive") || linkLower.includes("katdrive") || linkLower.includes("drive.google.com") || linkLower.includes("greenmotors") || linkLower.includes("hubcloud") || linkLower.includes("/?id=")) return false;
          if (linkLower.includes(".zip") || linkLower.includes("/torrent/download")) return false;
          return true;
        })
        .map((s, idx) => ({
          id: idx,
          name: `Server ${idx + 1}${s.quality ? ` • ${s.quality}` : ""}${s.language ? ` (${s.language})` : ""}`,
          link: s.link,
          type: s.type,
          headers: (s as any).headers,
          quality: (s as any).quality,
          language: (s as any).language,
          sourceTitle: (s as any).sourceTitle || s.server,
        }));
      if (validStreams.length > 0) {
        setServerList(validStreams);
      }
    }
  }, [initialServers]);

  // Primary streaming engine: MovieBox (STAGE 1 with upfront dubs, subtitles & qualities)
  // HDHub4u and 4KHDHub are strictly fallbacks or for download
  useEffect(() => {
    if (!title || (initialServers && initialServers.length > 3)) return;
    const clean = title
      .replace(/\b(1080p|720p|2160p|4k|uhd|hdr|web-dl|webrip|bluray|x264|x265|hevc|aac|dual\s*audio|hindi|english|org|subs?)\b/gi, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/[\._-]+/g, " ")
      .trim();

    if (!clean || clean.length < 2) return;

    const controller = new AbortController();

    const appendNewStreams = (newStreams: Array<any>) => {
      if (newStreams.length === 0) return;
      setServerList((prev) => {
        const cleanPrev = prev.filter((p) => p.link && p.link.trim() !== "");
        const next = [...cleanPrev];
        for (const s of newStreams) {
          if (!s || !s.link || (!s.link.startsWith("http://") && !s.link.startsWith("https://"))) continue;
          if (next.some((n) => n.link === s.link)) continue;

          const sIndex = next.length + 1;
          const qTag = s.quality ? (s.quality.includes("p") || s.quality === "4K" ? s.quality : `${s.quality}p`) : "HD";
          const audioTag = s.language ? `(${s.language})` : "";
          const anonymousName = `Server ${sIndex} • ${qTag} ${audioTag}`.trim();

          next.push({
            id: next.length,
            name: anonymousName,
            link: s.link,
            type: s.type || "mkv",
            headers: s.headers,
            quality: qTag,
            language: s.language || "Multi-Audio",
            sourceTitle: `${qTag} ${audioTag}`,
          });
        }
        return next;
      });
    };

    (async () => {
      let movieBoxSuccess = false;

      // -------------------------------------------------------------
      // STAGE 1: MovieBox (Primary Streaming Server)
      // -------------------------------------------------------------
      try {
        setFetchingStatusText("Connecting to MovieBox primary stream...");
        const mbRes = await fetch(`/api/search?provider=movieBoxWeb&q=${encodeURIComponent(clean)}`, { signal: controller.signal });
        if (mbRes.ok) {
          const mbMatches: any[] = await mbRes.json();
          if (Array.isArray(mbMatches) && mbMatches.length > 0) {
            // Strictly eliminate clips, songs, trailers, promos, celebrations, behind the scenes
            const junkRegex = /\b(song|songs|video song|full video|ost|trailer|teaser|promo|celebration|event|interview|scene|glimpse|behind the scenes|making of|special video)\b/i;
            const cleanLower = clean.toLowerCase().trim();
            const normalizeTitle = (str: string) =>
              str
                .replace(/\[.*?\]|\(.*?\)/g, "")
                .replace(/[^a-zA-Z0-9\s]/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

            const nonJunkMatches = mbMatches.filter((m) => !junkRegex.test(m.title || ""));

            // 1. Exact match priority: normalized title equals clean title (e.g. "RRR" equals "rrr")
            let cand = nonJunkMatches.find((m) => normalizeTitle(m.title || "") === cleanLower);

            // 2. Strict word boundary & title similarity match
            if (!cand) {
              const wordBoundaryRegex = new RegExp(`\\b${cleanLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
              cand = nonJunkMatches.find((m) => wordBoundaryRegex.test(normalizeTitle(m.title || "")) && isStrictTitleMatch(m.title || "", clean));
            }

            // 3. Fallback only if candidate strictly matches query title
            if (!cand) {
              cand = nonJunkMatches.find((m) => isStrictTitleMatch(m.title || "", clean));
            }

            if (cand?.image) setActiveBackdrop((prev) => prev || cand.image);

            if (cand?.link) {
              const metaRes = await fetch(`/api/meta?provider=movieBoxWeb&link=${encodeURIComponent(cand.link)}`, { signal: controller.signal });
              if (metaRes.ok) {
                const meta = await metaRes.json();
                if (meta?.image) setActiveBackdrop((prev) => prev || meta.image);
                const rawLinkList = Array.isArray(meta?.linkList) ? meta.linkList : [];
                setAllMovieBoxDubs(rawLinkList);

                // Detect if series and filter by currentSeason
                const isSeriesInMeta = rawLinkList.some((item: any) => /Season\s*\d+/i.test(item.title || ""));
                let seasonDubs = rawLinkList;
                if (isSeriesInMeta) {
                  const sRegex = new RegExp(`\\bSeason\\s*0*${currentSeason}\\b`, "i");
                  const filtered = rawLinkList.filter((item: any) => sRegex.test(item.title || ""));
                  if (filtered.length > 0) {
                    seasonDubs = filtered;
                  }
                }

                // Filter audio dub entries (exclude pure subtitle tracks)
                const dubEntries = seasonDubs.filter((item: any) => {
                  const t = (item.title || "").toLowerCase();
                  return (
                    !t.includes(" sub") &&
                    !t.includes("subtitle") &&
                    (t.includes("dub") || t.includes("audio") || t.includes("original") || (item.directLinks && item.directLinks.length > 0))
                  );
                });

                const effectiveDubs = dubEntries.length > 0 ? dubEntries : seasonDubs.filter((i: any) => !i.title?.toLowerCase().includes(" sub"));

                if (effectiveDubs.length > 0) {
                  const targetEpIdx = Math.max(0, currentEpisode - 1);
                  // Map all dubs UPFRONT into audioTracks state with clean names (no 'dub')
                  const mappedAudios = effectiveDubs.map((dub: any, idx: number) => ({
                    id: idx,
                    name: cleanAudioName(dub.title || (idx === 0 ? "Original Audio" : `Audio Track ${idx + 1}`)),
                    lang: dub.title,
                    isMovieBoxDub: true,
                    rawTarget: dub.directLinks?.[targetEpIdx]?.link || dub.directLinks?.[0]?.link || dub.link,
                    streamLink: undefined as string | undefined,
                    headers: {
                      Referer: "https://officialmoviebox.com/",
                      Origin: "https://officialmoviebox.com",
                    },
                  }));

                  // Extract UPFRONT resolutions from chosen episode payload
                  try {
                    const chosenTarget = mappedAudios[0]?.rawTarget;
                    const firstPayload = JSON.parse(chosenTarget || "{}");
                    const resList = firstPayload?.seasons?.[0]?.resolutions || firstPayload?.resolutions || [];
                    if (resList.length > 0) {
                      const sorted = [...resList].sort((a: any, b: any) => b.resolution - a.resolution);
                      setQualityLevels([
                        { id: -1, height: 0, name: `Auto · ${sorted[0].resolution}p` },
                        ...sorted.map((r: any, rIdx: number) => ({
                          id: rIdx,
                          height: r.resolution,
                          name: `${r.resolution}p`,
                        })),
                      ]);
                    }
                  } catch (_) {}

                  // Start in Original Audio by default per user request
                  let activeDubIdx = mappedAudios.findIndex((d) => d.name.toLowerCase().includes("original"));
                  if (activeDubIdx === -1) {
                    activeDubIdx = mappedAudios.findIndex((d) => d.name.toLowerCase().includes("hindi"));
                  }
                  if (activeDubIdx === -1) {
                    activeDubIdx = 0;
                  }

                  const primaryDub = mappedAudios[activeDubIdx];
                  if (primaryDub?.rawTarget) {
                    try {
                      const sRes = await fetch(
                        `/api/streams?provider=movieBoxWeb&link=${encodeURIComponent(primaryDub.rawTarget)}&download=true&title=${encodeURIComponent(clean)}`,
                        { signal: controller.signal }
                      );
                      if (sRes.ok) {
                        const sList: any[] = await sRes.json();
                        if (Array.isArray(sList) && sList.length > 0 && sList[0]?.link) {
                          primaryDub.streamLink = sList[0].link;
                          if (sList[0].headers) primaryDub.headers = sList[0].headers;

                          // UPFRONT: Extract and set ALL available subtitles immediately
                          if (Array.isArray(sList[0].subtitles) && sList[0].subtitles.length > 0) {
                            const subs = [
                              { id: -1, name: "Off" },
                              ...sList[0].subtitles.map((sub: any, sIdx: number) => ({
                                id: sIdx,
                                name: sub.title || sub.language || `Subtitle ${sIdx + 1}`,
                                lang: sub.language,
                                file: sub.uri,
                              })),
                            ];
                            setSubtitlesList(subs);
                          }

                          // If stream returned multiple qualities, update qualityLevels
                          const qList = sList
                            .filter((s: any) => s && s.link)
                            .map((s: any, qIdx: number) => {
                              const qVal = s.quality ? parseInt(s.quality) : 1080;
                              return {
                                id: qIdx,
                                height: qVal || 1080,
                                name: s.quality ? (s.quality.toString().endsWith("p") ? s.quality : `${s.quality}p`) : (qIdx === 0 ? "1080p" : "720p"),
                                link: s.link,
                                headers: s.headers,
                              };
                            });
                          if (qList.length > 1) {
                            setQualityLevels([
                              { id: -1, height: 0, name: `Auto · ${qList[0].name}` },
                              ...qList,
                            ]);
                          }

                          // Set UPFRONT audio tracks with accurate names
                          setAudioTracks(mappedAudios);
                          setSelectedAudioTrack(activeDubIdx);

                          // Expose as ONE SINGLE SERVER: strictly "Server 1"
                          const movieBoxServer = {
                            id: 0,
                            name: "Server 1",
                            link: sList[0].link,
                            type: sList[0].type || "mp4",
                            headers: sList[0].headers || primaryDub.headers,
                            quality: sList[0].quality ? `${sList[0].quality}p` : "1080p",
                            language: "Server 1",
                            sourceTitle: "Server 1",
                          };

                          setServerList([movieBoxServer]);
                          serverListRef.current = [movieBoxServer];
                          movieBoxSuccess = true;
                          setFetchingStatusText("Server 1 stream ready");

                          const curPlaying = videoRef.current ? videoRef.current.currentTime : 0;
                          if (curPlaying < 2 || playerStatus === "fetching" || playerStatus === "error") {
                            hasConnectedRef.current = false;
                            connectToServer(0, true);
                          }
                        }
                      }
                    } catch (_) {}
                  }
                }
              }
            }
          }
        }
      } catch (_) {}

      // If MovieBox successfully connected, we do not need to spam scrapers for video streaming
      if (movieBoxSuccess) return;

      // -------------------------------------------------------------
      // STAGE 2: Fallback to HDHub4u if MovieBox was unavailable
      // -------------------------------------------------------------
      try {
        setFetchingStatusText("Scanning Server 1 & Server 2 mirrors (HDHub)...");
        const hRes = await fetch(`/api/search?provider=hdhub4u&q=${encodeURIComponent(clean)}`, { signal: controller.signal });
        if (hRes.ok) {
          const hMatches: any[] = await hRes.json();
          if (Array.isArray(hMatches) && hMatches.length > 0) {
            const cand = hMatches[0];
            if (cand?.image) setActiveBackdrop((prev) => prev || cand.image);
            if (cand?.link) {
              const metaRes = await fetch(`/api/meta?provider=hdhub4u&link=${encodeURIComponent(cand.link)}`, { signal: controller.signal });
              if (metaRes.ok) {
                const meta = await metaRes.json();
                if (meta?.image) setActiveBackdrop((prev) => prev || meta.image);
                const rawLinkList = Array.isArray(meta?.linkList) ? meta.linkList : [];
                for (const relEntry of rawLinkList.slice(0, 4)) {
                  const relTitle = relEntry.title || "Release";
                  const relTarget = relEntry.directLinks?.[0]?.link || relEntry.link;
                  if (!relTarget) continue;
                  try {
                    const sRes = await fetch(
                      `/api/streams?provider=hdhub4u&link=${encodeURIComponent(relTarget)}&download=true&title=${encodeURIComponent(clean)}`,
                      { signal: controller.signal }
                    );
                    if (sRes.ok) {
                      const sList: any[] = await sRes.json();
                      if (Array.isArray(sList) && sList.length > 0) {
                        const validDirect = sList.filter((s) => {
                          if (!s?.link) return false;
                          const lLower = s.link.toLowerCase();
                          return !lLower.includes("hubcloud") && !lLower.includes("greenmotors") && !lLower.includes("drive.google") && !lLower.includes(".zip") && !lLower.includes("/?id=");
                        }).map((s) => ({
                          ...s,
                          quality: relTitle.toLowerCase().includes("4k") ? "4K" : relTitle.toLowerCase().includes("1080p") ? "1080p" : relTitle.toLowerCase().includes("720p") ? "720p" : "HD",
                          language: relTitle.toLowerCase().includes("hindi") ? "Hindi Dubbed" : "Dual Audio",
                        }));
                        appendNewStreams(validDirect);
                      }
                    }
                  } catch (_) {}
                }
              }
            }
          }
        }
      } catch (_) {}

      // -------------------------------------------------------------
      // STAGE 3: Fallback to 4kHDHub (4K UHD)
      // -------------------------------------------------------------
      try {
        setFetchingStatusText("Scanning 4K UHD high-bitrate mirrors...");
        const fkRes = await fetch(`/api/search?provider=4khdhub&q=${encodeURIComponent(clean)}`, { signal: controller.signal });
        if (fkRes.ok) {
          const fkMatches: any[] = await fkRes.json();
          if (Array.isArray(fkMatches) && fkMatches.length > 0) {
            const cand = fkMatches[0];
            if (cand?.link) {
              const metaRes = await fetch(`/api/meta?provider=4khdhub&link=${encodeURIComponent(cand.link)}`, { signal: controller.signal });
              if (metaRes.ok) {
                const meta = await metaRes.json();
                const rawLinkList = Array.isArray(meta?.linkList) ? meta.linkList : [];
                for (const relEntry of rawLinkList.slice(0, 3)) {
                  const relTitle = relEntry.title || "4K";
                  const relTarget = relEntry.directLinks?.[0]?.link || relEntry.link;
                  if (!relTarget) continue;
                  try {
                    const sRes = await fetch(
                      `/api/streams?provider=4khdhub&link=${encodeURIComponent(relTarget)}&download=true&title=${encodeURIComponent(clean)}`,
                      { signal: controller.signal }
                    );
                    if (sRes.ok) {
                      const sList: any[] = await sRes.json();
                      if (Array.isArray(sList) && sList.length > 0) {
                        appendNewStreams(sList.map((s) => ({
                          ...s,
                          quality: "4K",
                          language: "UHD",
                        })));
                      }
                    }
                  } catch (_) {}
                }
              }
            }
          }
        }
      } catch (_) {}

      setFetchingStatusText("Streaming mirrors ready");
    })();

    return () => controller.abort();
  }, [title]);

  // Auto-detect stream qualities from servers if HLS manifest doesn't have multiple levels
  useEffect(() => {
    if (serverList.length > 0) {
      const detected: Array<{ id: number; height: number; name: string; serverIdx: number }> = [];
      const seen = new Set<string>();

      serverList.forEach((s, idx) => {
        const text = `${s.name} ${s.quality || ""} ${s.type || ""} ${(s as any).sourceTitle || ""}`.toLowerCase();
        let qName = "";
        let qHeight = 0;

        if (text.includes("4k") || text.includes("2160p") || text.includes("2160")) {
          qName = "4K 2160p";
          qHeight = 2160;
        } else if (text.includes("1080p") || text.includes("1080") || text.includes("fhd")) {
          qName = "1080p FHD";
          qHeight = 1080;
        } else if (text.includes("720p") || text.includes("720") || text.includes("hd")) {
          qName = "720p HD";
          qHeight = 720;
        } else if (text.includes("480p") || text.includes("480") || text.includes("sd")) {
          qName = "480p SD";
          qHeight = 480;
        } else if (text.includes("360p") || text.includes("360")) {
          qName = "360p";
          qHeight = 360;
        }

        if (qName && !seen.has(qName)) {
          seen.add(qName);
          detected.push({
            id: idx,
            height: qHeight,
            name: qName,
            serverIdx: idx,
          });
        }
      });

      detected.sort((a, b) => b.height - a.height);
      if (detected.length > 0) {
        setQualityLevels(detected);
      }
    }
  }, [serverList]);

  // Dynamic backdrop loader
  useEffect(() => {
    if (backdrop || poster) {
      setActiveBackdrop(backdrop || poster || "");
    } else if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlBg = sp.get("backdrop") || sp.get("poster") || sp.get("image");
      if (urlBg) setActiveBackdrop(urlBg);
    }
  }, [backdrop, poster]);

  useEffect(() => {
    if (!activeBackdrop && title) {
      const cleanTitle = title
        .replace(/\b(1080p|720p|2160p|4k|uhd|hdr|web-dl|webrip|bluray|x264|x265|hevc|aac|dual\s*audio|hindi|english|org|subs?)\b/gi, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/[\._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(cleanTitle)}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((cinemetaData) => {
          const meta = cinemetaData?.metas?.[0];
          if (meta?.background) {
            setActiveBackdrop(meta.background);
            return;
          }
          if (meta?.poster) {
            setActiveBackdrop(meta.poster);
            return;
          }
        })
        .catch(() => {});

      fetchTMDBDetails(cleanTitle)
        .then((tmdbData) => {
          if (tmdbData?.backdropUrl) {
            setActiveBackdrop(tmdbData.backdropUrl);
          } else if (tmdbData?.posterUrl) {
            setActiveBackdrop((prev) => prev || tmdbData.posterUrl);
          }
        })
        .catch(() => {});
    }
  }, [title, activeBackdrop]);

  // Discover real multi-audio languages dynamically from serverList only if MovieBox dubs not present
  useEffect(() => {
    if (audioTracks.some((a) => a.isMovieBoxDub)) return;

    const detected: Array<{ id: number; name: string; serverIdx: number }> = [];
    const seen = new Set<string>();

    serverList.forEach((s, idx) => {
      const text = `${s.name} ${(s as any).sourceTitle || ""} ${(s as any).language || ""}`.toLowerCase();
      if ((text.includes("hindi") || text.includes("hin")) && !seen.has("Hindi")) {
        seen.add("Hindi");
        detected.push({ id: detected.length, name: "Hindi (Dubbed)", serverIdx: idx });
      }
      if (text.includes("original") && !seen.has("Original")) {
        seen.add("Original");
        detected.push({ id: detected.length, name: "Original Audio", serverIdx: idx });
      }
      if ((text.includes("english") || text.includes("eng")) && !seen.has("English")) {
        seen.add("English");
        detected.push({ id: detected.length, name: "English", serverIdx: idx });
      }
      if ((text.includes("tamil") || text.includes("tam")) && !seen.has("Tamil")) {
        seen.add("Tamil");
        detected.push({ id: detected.length, name: "Tamil (Dubbed)", serverIdx: idx });
      }
      if ((text.includes("telugu") || text.includes("tel")) && !seen.has("Telugu")) {
        seen.add("Telugu");
        detected.push({ id: detected.length, name: "Telugu (Dubbed)", serverIdx: idx });
      }
      if (text.includes("french") && !seen.has("French")) {
        seen.add("French");
        detected.push({ id: detected.length, name: "French (Dubbed)", serverIdx: idx });
      }
      if (text.includes("spanish") && !seen.has("Spanish")) {
        seen.add("Spanish");
        detected.push({ id: detected.length, name: "Spanish (Dubbed)", serverIdx: idx });
      }
      if (text.includes("dual audio") && !seen.has("Dual Audio") && !seen.has("Hindi")) {
        seen.add("Dual Audio");
        detected.push({ id: detected.length, name: "Dual Audio", serverIdx: idx });
      }
    });

    if (detected.length > 0) {
      setAudioTracks(detected);
    } else if (audioTracks.length === 0) {
      setAudioTracks([
        { id: 0, name: "Original Audio (Single Track)" }
      ]);
    }
  }, [serverList, audioTracks]);

  // Initial stream mount: connect ONLY once
  useEffect(() => {
    if (serverListRef.current.length > 0 && serverListRef.current[0].link && !hasConnectedRef.current) {
      connectToServer(0);
    }
    return () => {
      saveCurrentProgress();
      if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);
      if (hlsRef.current) hlsRef.current.destroy();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [connectToServer, saveCurrentProgress]);

  // Connect first playable server ONLY if waiting in fetching state and user has not paused
  useEffect(() => {
    if (serverList.length > 0 && !hasConnectedRef.current && (playerStatus === "fetching" || playerStatus === "error")) {
      const firstPlayableIdx = serverList.findIndex(
        (s) => s.link && (s.link.startsWith("http://") || s.link.startsWith("https://"))
      );
      if (firstPlayableIdx !== -1 && !userPausedRef.current) {
        connectToServer(firstPlayableIdx);
      }
    }
  }, [serverList, playerStatus, connectToServer]);

  // Sync if playbackUrl updates from parent
  const lastConnectedUrlRef = useRef<string>("");
  useEffect(() => {
    if (playbackUrl && playbackUrl.trim() && playbackUrl !== lastConnectedUrlRef.current) {
      lastConnectedUrlRef.current = playbackUrl;
      setServerList((prev) => {
        if (prev.some((s) => s.link === playbackUrl)) return prev;
        return [{ id: 0, name: "Server 1 (Primary)", link: playbackUrl }, ...prev];
      });
      connectToServer(0, true);
    }
  }, [playbackUrl, connectToServer]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      userPausedRef.current = false;
      setIsPlaying(true);
      setPlayerStatus("ready");
    };
    const onPause = () => {
      userPausedRef.current = true;
      setIsPlaying(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setPlayerStatus("ready");
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime > 0) {
        setPlayerStatus("ready");
      }
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedPercent(Math.min(100, (bufferedEnd / video.duration) * 100));
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onEnded = () => {
      setIsVideoEnded(true);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  // Web Audio Volume Booster (100% - 300%)
  const handleBoostChange = (newVal: number) => {
    setVolumeBoost(newVal);
    const video = videoRef.current;
    if (!video) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaElementSource(video);
          const gain = ctx.createGain();
          gain.gain.value = newVal / 100;
          source.connect(gain);
          gain.connect(ctx.destination);
          audioCtxRef.current = ctx;
          gainNodeRef.current = gain;
        } else if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = newVal / 100;
        }
      }
    } catch (_) {}
    showToast(`Audio Boost: ${newVal}%`);
  };

  // Robust duration resolution: checks video.duration, state duration, and runtime prop (e.g. 138m = 8280s)
  const parsedRuntimeSeconds = useMemo(() => {
    if (!runtime) return 0;
    if (typeof runtime === "number") return runtime > 300 ? runtime : runtime * 60;
    const matchH = String(runtime).match(/(\d+)\s*h/i);
    const matchM = String(runtime).match(/(\d+)\s*m/i);
    let s = 0;
    if (matchH) s += parseInt(matchH[1], 10) * 3600;
    if (matchM) s += parseInt(matchM[1], 10) * 60;
    if (s > 0) return s;
    const directNum = parseInt(String(runtime), 10);
    return !isNaN(directNum) && directNum > 0 ? (directNum > 300 ? directNum : directNum * 60) : 0;
  }, [runtime]);

  const getSafeDuration = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
      return video.duration;
    }
    if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
      return duration;
    }
    if (parsedRuntimeSeconds > 0) {
      return parsedRuntimeSeconds;
    }
    return 0;
  }, [duration, parsedRuntimeSeconds]);

  // Keyboard Shortcuts (Space, Arrow keys, F, M, C, Z, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (video.paused) video.play();
          else video.pause();
          break;
        case "arrowleft":
        case "j": {
          e.preventDefault();
          const targetT = Math.max(0, video.currentTime - 10);
          video.currentTime = targetT;
          setCurrentTime(targetT);
          setArrowSeekPreviewTime(targetT);
          if (previewVideoRef.current) previewVideoRef.current.currentTime = targetT;
          if (arrowTimerRef.current) clearTimeout(arrowTimerRef.current);
          arrowTimerRef.current = setTimeout(() => setArrowSeekPreviewTime(null), 1400);
          showToast(`-10s (${formatTime(targetT)})`);
          break;
        }
        case "arrowright":
        case "l": {
          e.preventDefault();
          const safeDur = getSafeDuration();
          const targetT = safeDur > 0 ? Math.min(safeDur, video.currentTime + 10) : video.currentTime + 10;
          if (!isNaN(targetT) && targetT >= 0) {
            video.currentTime = targetT;
            setCurrentTime(targetT);
            setArrowSeekPreviewTime(targetT);
            if (previewVideoRef.current) previewVideoRef.current.currentTime = targetT;
            if (arrowTimerRef.current) clearTimeout(arrowTimerRef.current);
            arrowTimerRef.current = setTimeout(() => setArrowSeekPreviewTime(null), 1400);
            showToast(`+10s (${formatTime(targetT)})`);
          }
          break;
        }
        case "arrowup":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          setIsMuted(false);
          showToast(`Volume ${Math.round(video.volume * 100)}%`);
          break;
        case "arrowdown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          showToast(`Volume ${Math.round(video.volume * 100)}%`);
          break;
        case "z":
        case "a": {
          e.preventDefault();
          setVideoFit((prev) => {
            const next = prev === "fit" ? "fill" : prev === "fill" ? "stretch" : "fit";
            showToast(
              next === "fit"
                ? "Fit to Screen (Original Ratio)"
                : next === "fill"
                ? "Crop Black Bars (Zoom to Fill)"
                : "Stretch to Fill (16:9)"
            );
            return next;
          });
          break;
        }
        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          setIsMuted(video.muted);
          showToast(video.muted ? "Muted" : "Unmuted");
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "c":
          e.preventDefault();
          setSubtitlesEnabled((prev) => !prev);
          showToast(!subtitlesEnabled ? "Subtitles: ON" : "Subtitles: OFF");
          break;
        case "escape":
          e.preventDefault();
          if (activeMenu !== "none") {
            setActiveMenu("none");
          } else {
            saveCurrentProgress();
            onClose();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMenu, onClose, showToast, subtitlesEnabled, duration, saveCurrentProgress, getSafeDuration]);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleUnmuteClick = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.volume = 1;
      setIsMuted(false);
      setVolume(1);
      showToast("Unmuted • 100%");
    }
  };

  const updateScrubberPosition = useCallback(
    (clientX: number) => {
      const el = scrubberRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setHoverPercent(percent);
      const safeDur = getSafeDuration();
      const time = safeDur > 0 ? percent * safeDur : 0;
      setHoverTime(time);
      pendingSeekTimeRef.current = time;
      if (previewVideoRef.current && safeDur > 0) {
        try {
          previewVideoRef.current.currentTime = time;
        } catch (_) {}
      }
      return { percent, time, safeDur };
    },
    [getSafeDuration]
  );

  const handleScrubberSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingScrubberRef.current = false;
    const res = updateScrubberPosition(e.clientX);
    const video = videoRef.current;
    if (res && video && res.time >= 0) {
      try {
        video.currentTime = res.time;
        setCurrentTime(res.time);
      } catch (_) {}
      pendingSeekTimeRef.current = null;
    }
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingScrubberRef.current = true;
    setIsDraggingScrubber(true);
    const res = updateScrubberPosition(e.clientX);
    if (res && res.time >= 0) {
      setCurrentTime(res.time);
      pendingSeekTimeRef.current = res.time;
    }
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateScrubberPosition(e.clientX);
  };

  // Global drag listener so dragging outside the line remains butter-smooth and doesn't choke decoder
  useEffect(() => {
    if (!isDraggingScrubber) return;
    const handleGlobalMove = (e: MouseEvent) => {
      const res = updateScrubberPosition(e.clientX);
      if (res && res.time >= 0) {
        setCurrentTime(res.time);
        pendingSeekTimeRef.current = res.time;
      }
    };
    const handleGlobalUp = () => {
      isDraggingScrubberRef.current = false;
      setIsDraggingScrubber(false);
      const video = videoRef.current;
      const targetT = pendingSeekTimeRef.current;
      if (video && targetT !== null && !isNaN(targetT) && targetT >= 0) {
        try {
          video.currentTime = targetT;
          setCurrentTime(targetT);
        } catch (_) {}
        pendingSeekTimeRef.current = null;
      }
    };
    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
    };
  }, [isDraggingScrubber, updateScrubberPosition]);

  const handleCopyMomentLink = () => {
    const timeSec = Math.floor(currentTime);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const momentUrl = `${origin}${window.location.pathname}?play=${encodeURIComponent(playbackUrl || "")}&t=${timeSec}&title=${encodeURIComponent(title)}`;
    navigator.clipboard.writeText(momentUrl);
    showToast("Moment link copied!");
    setActiveMenu("none");
  };

  const handleCopyWatchParty = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const partyUrl = `${origin}${window.location.pathname}?play=${encodeURIComponent(playbackUrl || "")}&party=1&title=${encodeURIComponent(title)}`;
    navigator.clipboard.writeText(partyUrl);
    showToast("Watch Party invite link copied!");
  };

  const handleOpenVlc = () => {
    if (!playbackUrl) return;
    const safeUrl = getPlayableUrl(playbackUrl);
    launchExternalPlayer(safeUrl, "vlc", "vlc://", title);
    showToast("Launching in VLC Media Player...");
    setActiveMenu("none");
  };

  // Picture filters: CSS filters applied directly on video element
  const getFilterStyle = (): string => {
    let base = `brightness(${brightnessLevel}%)`;
    switch (pictureFilter) {
      case "vivid":
        return `${base} saturate(1.25) contrast(1.1)`;
      case "warm":
        return `${base} sepia(0.12) contrast(1.05)`;
      case "contrast":
        return `${base} contrast(1.25)`;
      default:
        return base;
    }
  };

  const movieTitle = useMemo(() => {
    let t = (title || "").trim();
    if (t.includes(" - ")) {
      t = t.split(" - ")[0].trim();
    }
    if (t.includes(" • ")) {
      t = t.split(" • ")[0].trim();
    }
    // Remove resolution, audio tags, brackets, and years so the big title is the movie itself
    t = t.replace(/\b(1080p|720p|2160p|4k|uhd|hdr|web-dl|webrip|bluray|x264|x265|hevc|aac|dual\s*audio|hindi|english|org|subs?)\b/gi, "");
    t = t.replace(/\[.*?\]/g, "");
    t = t.replace(/\(.*?\)/g, "");
    t = t.replace(/[\._-]+/g, " ").replace(/\s+/g, " ").trim();
    return t || title || "CINEMA";
  }, [title]);

  const remainingSeconds = duration > 0 ? duration - currentTime : 0;
  const estimatedEnd = computeEstimatedEndTime(remainingSeconds);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#07090e",
        zIndex: 9999,
        overflowY: isFullscreen ? "hidden" : "auto",
        overflowX: "hidden",
        userSelect: "none",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 1. Main Fullscreen Video Player Viewport - EXACT 100% of screen */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "100%",
          maxHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          overflow: "hidden",
        }}
      >
      {/* ------------------------------------------------------------- */}
      {/* 1. Backdrop (Full screen cinematic background ONLY during initial loading / starting) */}
      {/* ------------------------------------------------------------- */}
      {(activeBackdrop || backdrop || poster) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${activeBackdrop || backdrop || poster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.60)",
            transform: "scale(1.02)",
            opacity: (!isPlaying && currentTime === 0) ? 1 : 0,
            transition: "opacity 0.6s ease-out",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          {/* Subtle cinematic gradient vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.90) 100%)",
            }}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Primary Video Stream Element                               */}
      {/* ------------------------------------------------------------- */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        muted={isMuted}
        onPlay={() => {
          setIsPlaying(true);
          setPlayerStatus("ready");
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setPlayerStatus("ready");
        }}
        onPause={() => {
          setIsPlaying(false);
          saveCurrentProgress();
        }}
        onTimeUpdate={() => {
          if (isDraggingScrubberRef.current) return;
          if (videoRef.current) {
            const cur = videoRef.current.currentTime;
            setCurrentTime(cur);
            if (videoRef.current.duration) setDuration(videoRef.current.duration);
            if (cur > 0 && playerStatus !== "ready") {
              setPlayerStatus("ready");
            }
            if (Math.abs(cur - lastSavedTimeRef.current) >= 3) {
              saveCurrentProgress();
            }
          }
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: videoFit === "fill" ? "cover" : videoFit === "stretch" ? "fill" : "contain",
          filter: getFilterStyle(),
          backgroundColor: "#000000",
          opacity: isPlaying || currentTime > 0 ? 1 : 0,
          transition: "opacity 0.4s ease-out",
          zIndex: 2,
        }}
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
          }
        }}
        onDoubleClick={toggleFullscreen}
      />

      {/* ------------------------------------------------------------- */}
      {/* 3. FETCHING MEDIA / MINIMAL FLOATING SERVER STATUS            */}
      {/* ------------------------------------------------------------- */}
      {(playerStatus === "fetching" || playerStatus === "starting") && !isPlaying && currentTime === 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "24px",
            animation: "fadeIn 0.25s ease-out",
            pointerEvents: "auto",
            maxWidth: "520px",
            width: "90%",
          }}
        >
          {/* Official Transparent PNG Movie Title Logo or Cinematic Typographic Fallback */}
          {movieLogoUrl ? (
            <img
              src={movieLogoUrl}
              alt={movieTitle}
              style={{
                maxHeight: "125px",
                maxWidth: "85%",
                objectFit: "contain",
                filter: "drop-shadow(0 6px 24px rgba(0, 0, 0, 0.95))",
                marginBottom: "18px",
                animation: "fadeIn 0.3s ease-out",
              }}
            />
          ) : (
            <h1
              style={{
                fontSize: "clamp(32px, 5.5vw, 56px)",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "0.03em",
                margin: "0 0 16px 0",
                textShadow: "0 4px 30px rgba(0, 0, 0, 0.95)",
                textAlign: "center",
                lineHeight: 1.15,
                fontFamily: "'Cinzel', 'Outfit', serif, sans-serif",
                textTransform: "uppercase",
              }}
            >
              {movieTitle}
            </h1>
          )}

          {/* Thin Minimal Loading Progress Line */}
          <div
            style={{
              width: "220px",
              height: "3px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.18)",
              overflow: "hidden",
              position: "relative",
              marginBottom: "16px",
              boxShadow: "0 0 12px rgba(229, 9, 20, 0.35)",
            }}
          >
            <div
              style={{
                width: "45%",
                height: "100%",
                background: "linear-gradient(90deg, #e50914, #ff3b47, #e50914)",
                borderRadius: "999px",
                position: "absolute",
                animation: "cinemaProgressLine 1.4s ease-in-out infinite",
                boxShadow: "0 0 10px #e50914",
              }}
            />
          </div>

          <p
            style={{
              fontSize: "14.5px",
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.85)",
              margin: 0,
              textShadow: "0 2px 10px rgba(0,0,0,0.9)",
              letterSpacing: "0.02em",
              animation: "scanningPulse 2s ease-in-out infinite",
            }}
          >
            {playerStatus === "starting" ? "Starting stream..." : "Fetching from Server 1..."}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. ERROR STATE & RETRY CONTROLS                               */}
      {/* ------------------------------------------------------------- */}
      {playerStatus === "error" && (
        <div
          style={{
            position: "absolute",
            zIndex: 25,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div
            className="cinema-player-error-card"
            style={{
              background: "rgba(14, 16, 22, 0.78)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderRadius: "20px",
              padding: "24px 32px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.85)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={() => {
                setPlayerStatus("fetching");
                setServerStatuses({ 0: "trying" });
                connectToServer(0);
              }}
              style={{
                padding: "11px 28px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.10)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
                e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
                e.currentTarget.style.transform = "translateY(0px) scale(1)";
              }}
            >
              <RefreshCwIcon size={16} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}



      {/* ------------------------------------------------------------- */}
      {/* 6. BUFFERING RING SPINNER (Screenshot 3)                      */}
      {/* ------------------------------------------------------------- */}
      {isBuffering && playerStatus === "ready" && (
        <div
          style={{
            position: "absolute",
            zIndex: 15,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              border: "3px solid rgba(255, 255, 255, 0.15)",
              borderTopColor: "#e50914",
              borderRadius: "50%",
              boxShadow: "none",
              animation: "spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite",
            }}
          />
        </div>
      )}


      {/* ------------------------------------------------------------- */}
      {/* 8. TOP CONTROLS BAR (Screenshot 1: Back, Watch Party, Chat)   */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 25,
          background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
          opacity: controlsVisible || !isPlaying ? 1 : 0,
          pointerEvents: controlsVisible || !isPlaying ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      >
        {/* Back Button */}
        <button
          onClick={() => {
            saveCurrentProgress();
            onClose();
          }}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            border: "none",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
          }}
          title="Back to Details (Esc)"
        >
          <BackIcon size={20} />
        </button>

        {/* Right Action Icons: Watch Party + Comments */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={handleCopyWatchParty}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
            title="Start Watch Party"
          >
            <WatchPartyIcon size={20} />
          </button>

          <button
            onClick={() => showToast("Subtitles & Audio are ready.")}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
            title="Discussion & Comments"
          >
            <ChatBubbleIcon size={20} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 9. SETTINGS FLYOUT MENU (Matching User Screenshot exactly)     */}
      {/* ------------------------------------------------------------- */}
      {activeMenu !== "none" && (
        <div
          style={{
            position: "absolute",
            bottom: "95px",
            right: "20px",
            width: "330px",
            maxWidth: "calc(100vw - 32px)",
            backgroundColor: "rgba(14, 16, 22, 0.88)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "20px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            padding: "4px 0",
            zIndex: 65,
            animation: "fadeIn 0.18s ease-out",
            overflow: "hidden",
          }}
        >
          {/* 1. TOP-LEVEL SETTINGS MENU (Matching User Screenshot media_1793183781750.png) */}
          {activeMenu === "settings" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px 12px 18px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ width: 24 }} />
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
                  Settings
                </span>
                <button
                  onClick={() => setActiveMenu("none")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)")}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              {/* Group 1: Media Properties Card */}
              <div
                style={{
                  margin: "12px 14px 10px 14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                {/* Quality */}
                <button
                  onClick={() => setActiveMenu("quality")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>Quality</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                      {selectedQuality === -1
                        ? qualityLevels.length > 0
                          ? `Auto · ${qualityLevels[0]?.name || "1080p"}`
                          : "Auto · 1080p"
                        : qualityLevels.find((q) => q.id === selectedQuality)?.name || "1080p"}
                    </span>
                    <ChevronRightIcon size={15} />
                  </div>
                </button>

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)", margin: "0 14px" }} />

                {/* Subtitles */}
                <button
                  onClick={() => setActiveMenu("subtitles")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>Subtitles</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                      {subtitlesEnabled && selectedSubtitle !== -1
                        ? subtitlesList.find((s) => s.id === selectedSubtitle)?.name || "English"
                        : "English"}
                    </span>
                    <ChevronRightIcon size={15} />
                  </div>
                </button>

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)", margin: "0 14px" }} />

                {/* Audio */}
                <button
                  onClick={() => setActiveMenu("audio")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>Audio</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                      {audioTracks.find((a) => a.id === selectedAudioTrack)?.name || "Original"}
                    </span>
                    <ChevronRightIcon size={15} />
                  </div>
                </button>

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)", margin: "0 14px" }} />

                {/* Playback speed */}
                <button
                  onClick={() => setActiveMenu("speed")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>Playback speed</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>{playbackRate}×</span>
                    <ChevronRightIcon size={15} />
                  </div>
                </button>
              </div>

              {/* Group 2: Playback settings Card */}
              <div
                style={{
                  margin: "0 14px 14px 14px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setActiveMenu("playback_settings")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 16px",
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>Playback settings</span>
                  <ChevronRightIcon size={15} />
                </button>
              </div>
            </div>
          )}

          {/* 2. PLAYBACK SETTINGS SUBMENU (Video fit, Volume boost, Brightness, Sleep timer) */}
          {activeMenu === "playback_settings" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <button
                  onClick={() => setActiveMenu("settings")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    color: "#cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <BackIcon size={16} />
                  <span>Back</span>
                </button>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  Playback settings
                </span>
                <button
                  onClick={() => setActiveMenu("none")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              {/* Volume boost section */}
              <div style={{ padding: "14px 18px 10px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <VolumeHighIcon size={17} />
                  <span>Volume boost</span>
                </div>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>Gain</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: volumeBoost > 100 ? "#e50914" : "#94a3b8" }}>
                      {volumeBoost}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={300}
                    step={5}
                    value={volumeBoost}
                    onChange={(e) => handleBoostChange(Number(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "#e50914",
                      height: "4px",
                      cursor: "pointer",
                      marginBottom: "8px",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
                    <span>100%</span>
                    <span>300%</span>
                  </div>
                </div>
              </div>

              {/* Video fit section */}
              <div style={{ padding: "0 18px 12px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <AspectRatioIcon size={17} />
                  <span>Video fit</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "4px",
                    gap: "4px",
                  }}
                >
                  {(["fit", "fill", "stretch"] as const).map((mode) => {
                    const active = videoFit === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          setVideoFit(mode);
                          showToast(`Video fit: ${mode.toUpperCase()}`);
                        }}
                        style={{
                          flex: 1,
                          padding: "9px 0",
                          borderRadius: "8px",
                          border: active ? "1px solid #e50914" : "1px solid transparent",
                          background: active ? "#e50914" : "transparent",
                          color: "#ffffff",
                          fontSize: "13.5px",
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textTransform: "capitalize",
                          boxShadow: active ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                        }}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brightness section */}
              <div style={{ padding: "0 18px 14px 18px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <SunIcon size={17} />
                  <span>Brightness</span>
                </div>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>Level</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>{brightnessLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={5}
                    value={brightnessLevel}
                    onChange={(e) => setBrightnessLevel(Number(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "#e50914",
                      height: "4px",
                      cursor: "pointer",
                      marginBottom: "8px",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
                    <span>50%</span>
                    <span>200%</span>
                  </div>
                </div>
              </div>

              {/* Sleep timer link */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", padding: "6px 14px 10px 14px" }}>
                <button
                  onClick={() => setActiveMenu("sleep")}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MoonIcon size={16} /> Sleep timer
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12.5px", color: "#8b949e" }}>
                      {sleepTimerMinutes ? `${sleepTimerMinutes}m` : "Off"}
                    </span>
                    <ChevronRightIcon size={14} />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 3. PLAYBACK SPEED */}
          {activeMenu === "speed" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <button
                  onClick={() => setActiveMenu("settings")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    color: "#cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <BackIcon size={16} />
                  <span>Back</span>
                </button>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
                  Playback speed
                </span>
                <button
                  onClick={() => setActiveMenu("none")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", padding: "8px 12px", gap: "2px" }}>
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => {
                  const active = playbackRate === rate;
                  return (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (videoRef.current) videoRef.current.playbackRate = rate;
                        setActiveMenu("none");
                        showToast(`Speed: ${rate}x`);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 16px",
                        borderRadius: "10px",
                        border: "none",
                        background: active ? "rgba(229, 9, 20, 0.16)" : "transparent",
                        color: active ? "#ffffff" : "#cbd5e1",
                        fontSize: "14.5px",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ color: active ? "#e50914" : "#ffffff", fontWeight: active ? 700 : 500 }}>
                        {rate === 1 ? "1× (Normal)" : `${rate}×`}
                      </span>
                      {active && <CheckIcon size={16} color="#e50914" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}



          {/* 5. QUALITY FLYOUT */}
          {activeMenu === "quality" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <button
                  onClick={() => setActiveMenu("settings")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    color: "#cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <BackIcon size={16} />
                  <span>Back</span>
                </button>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
                  Quality
                </span>
                <button
                  onClick={() => setActiveMenu("none")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", padding: "8px 12px", gap: "2px" }}>
                <button
                  onClick={() => {
                    setSelectedQuality(-1);
                    if (hlsRef.current) hlsRef.current.currentLevel = -1;
                    setActiveMenu("none");
                    showToast("Quality: Auto (Adaptive)");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 16px",
                    borderRadius: "10px",
                    border: "none",
                    background: selectedQuality === -1 ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: selectedQuality === -1 ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedQuality !== -1) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedQuality !== -1) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ color: "#ffffff", fontWeight: selectedQuality === -1 ? 700 : 500 }}>
                    Auto {qualityLevels.length > 0 ? `(Currently ${qualityLevels[0]?.name || "1080p"})` : "(1080p)"}
                  </span>
                  {selectedQuality === -1 && <CheckIcon size={16} color="#ffffff" />}
                </button>
                {qualityLevels.map((lvl) => {
                  const active = selectedQuality === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => {
                        setSelectedQuality(lvl.id);
                        if (hlsRef.current && lvl.serverIdx === undefined) {
                          hlsRef.current.currentLevel = lvl.id;
                        } else {
                          const targetIdx = lvl.serverIdx !== undefined ? lvl.serverIdx : lvl.id;
                          if (serverList[targetIdx]) {
                            const curTime = videoRef.current?.currentTime || 0;
                            connectToServer(targetIdx);
                            setTimeout(() => {
                              if (videoRef.current && curTime > 0) videoRef.current.currentTime = curTime;
                            }, 400);
                          }
                        }
                        setActiveMenu("none");
                        showToast(`Quality: ${lvl.name}`);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 16px",
                        borderRadius: "10px",
                        border: "none",
                        background: active ? "rgba(255, 255, 255, 0.12)" : "transparent",
                        color: "#ffffff",
                        fontSize: "14px",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span style={{ color: "#ffffff", fontWeight: active ? 700 : 500 }}>{lvl.name}</span>
                      {active && <CheckIcon size={16} color="#ffffff" />}
                    </button>
                  );
                })}

                {/* + Load More Qualities Option */}
                <button
                  disabled={isLoadingMoreQualities}
                  onClick={handleLoadMoreQualities}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: isLoadingMoreQualities ? "default" : "pointer",
                    marginTop: "8px",
                    transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoadingMoreQualities) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoadingMoreQualities) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.transform = "translateY(0px)";
                    }
                  }}
                >
                  <RefreshCwIcon
                    size={14}
                    style={{
                      animation: isLoadingMoreQualities ? "spin 1s linear infinite" : "none",
                      color: "#ffffff",
                    }}
                  />
                  {isLoadingMoreQualities ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span>Fetching All Qualities</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <span className="cinema-dot cinema-dot-1" />
                        <span className="cinema-dot cinema-dot-2" />
                        <span className="cinema-dot cinema-dot-3" />
                      </span>
                    </span>
                  ) : (
                    <span>+ Load More Qualities</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 6. AUDIO FLYOUT (Upfront populated tracks with instant switch) */}
          {activeMenu === "audio" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <button
                  onClick={() => setActiveMenu("settings")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    color: "#cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <BackIcon size={16} />
                  <span>Back</span>
                </button>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
                  Audio tracks
                </span>
                <button
                  onClick={() => setActiveMenu("none")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", padding: "8px 12px", gap: "2px", maxHeight: "300px", overflowY: "auto" }}>
                {audioTracks.length === 0 ? (
                  <div style={{ padding: "14px 16px", color: "rgba(255,255,255,0.6)", fontSize: "13.5px", textAlign: "center" }}>
                    Original / Default Audio (Single Track)
                  </div>
                ) : (
                  audioTracks.map((track) => {
                    const active = selectedAudioTrack === track.id;
                    return (
                      <button
                        key={track.id}
                        onClick={() => {
                          switchAudioTrack(track);
                          setActiveMenu("none");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "11px 16px",
                          borderRadius: "10px",
                          border: "none",
                          background: active ? "rgba(255, 255, 255, 0.12)" : "transparent",
                          color: "#ffffff",
                          fontSize: "14px",
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span style={{ color: "#ffffff", fontWeight: active ? 700 : 500 }}>
                          {cleanAudioName(track.name)}
                        </span>
                        {active && <CheckIcon size={16} color="#ffffff" />}
                      </button>
                    );
                  })
                )}

                <button
                  onClick={handleLoadMoreAudios}
                  disabled={isLoadingMoreAudios}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: isLoadingMoreAudios ? "default" : "pointer",
                    marginTop: "8px",
                    transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoadingMoreAudios) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoadingMoreAudios) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.transform = "translateY(0px)";
                    }
                  }}
                >
                  <RefreshCwIcon
                    size={14}
                    style={{
                      animation: isLoadingMoreAudios ? "spin 1s linear infinite" : "none",
                      color: "#ffffff",
                    }}
                  />
                  {isLoadingMoreAudios ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span>Fetching All Audios</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <span className="cinema-dot cinema-dot-1" />
                        <span className="cinema-dot cinema-dot-2" />
                        <span className="cinema-dot cinema-dot-3" />
                      </span>
                    </span>
                  ) : (
                    <span>+ Load More Audio</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 7. SUBTITLES FLYOUT */}
          {activeMenu === "subtitles" && (
            <div style={{ display: "flex", flexDirection: "column", maxHeight: "460px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={() => setActiveMenu("settings")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "none",
                      border: "none",
                      color: "#cbd5e1",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <BackIcon size={16} />
                    <span>Back</span>
                  </button>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", marginLeft: "12px" }}>
                    Subtitles
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "999px",
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Upload
                  </button>
                  <button
                    onClick={() => setActiveMenu("none")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.6)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".vtt,.srt"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || !videoRef.current) return;
                  const url = URL.createObjectURL(file);
                  const newTrack = {
                    id: subtitlesList.length,
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    file: url,
                  };
                  setSubtitlesList((prev) => [...prev, newTrack]);
                  setSelectedSubtitle(newTrack.id);
                  setSubtitlesEnabled(true);
                  const trackEl = document.createElement("track");
                  trackEl.kind = "subtitles";
                  trackEl.label = newTrack.name;
                  trackEl.srclang = "en";
                  trackEl.src = url;
                  trackEl.default = true;
                  videoRef.current.appendChild(trackEl);
                  trackEl.track.mode = "showing";
                  showToast(`Subtitles: ${newTrack.name}`);
                  setActiveMenu("none");
                }}
              />

              <div style={{ padding: "8px 14px" }}>
                <input
                  type="text"
                  placeholder="Search language..."
                  value={subtitleSearch}
                  onChange={(e) => setSubtitleSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", padding: "4px 12px", gap: "2px", overflowY: "auto", maxHeight: "280px" }}>
                {subtitlesList
                  .filter((s) => !subtitleSearch.trim() || s.name.toLowerCase().includes(subtitleSearch.toLowerCase()))
                  .map((sub) => {
                    const active = selectedSubtitle === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setSelectedSubtitle(sub.id);
                          setSubtitlesEnabled(sub.id !== -1);
                          if (videoRef.current) {
                            const tracks = videoRef.current.textTracks;
                            for (let i = 0; i < tracks.length; i++) {
                              tracks[i].mode = sub.id !== -1 && i === sub.id ? "showing" : "disabled";
                            }
                          }
                          setActiveMenu("none");
                          showToast(`Subtitles: ${sub.name}`);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "none",
                          background: active ? "rgba(229, 9, 20, 0.16)" : "transparent",
                          color: active ? "#ffffff" : "#cbd5e1",
                          fontSize: "13.5px",
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ color: active ? "#e50914" : "#ffffff" }}>{sub.name}</span>
                        {active && <CheckIcon size={16} color="#e50914" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 8. SLEEP TIMER FLYOUT */}
          {activeMenu === "sleep" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <button
                  onClick={() => setActiveMenu("playback_settings")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    color: "#cbd5e1",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <BackIcon size={16} />
                  <span>Back</span>
                </button>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
                  Sleep timer
                </span>
                <button
                  onClick={() => setActiveMenu("none")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", padding: "8px 12px", gap: "2px" }}>
                {[
                  { val: null, label: "Off" },
                  { val: 15, label: "15 Minutes" },
                  { val: 30, label: "30 Minutes" },
                  { val: 45, label: "45 Minutes" },
                  { val: 60, label: "1 Hour" },
                ].map((s) => {
                  const active = sleepTimerMinutes === s.val;
                  return (
                    <button
                      key={s.label}
                      onClick={() => {
                        setSleepTimerMinutes(s.val);
                        if (s.val) {
                          setTimeout(() => {
                            if (videoRef.current) videoRef.current.pause();
                            showToast("Sleep timer: Paused playback");
                          }, s.val * 60 * 1000);
                        }
                        setActiveMenu("none");
                        showToast(`Sleep Timer: ${s.label}`);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 16px",
                        borderRadius: "10px",
                        border: "none",
                        background: active ? "rgba(229, 9, 20, 0.16)" : "transparent",
                        color: active ? "#ffffff" : "#cbd5e1",
                        fontSize: "14px",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ color: active ? "#e50914" : "#ffffff" }}>{s.label}</span>
                      {active && <CheckIcon size={16} color="#e50914" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. BOTTOM CONTROLS BAR (Screenshots 1 & 2)                   */}
      {/* ------------------------------------------------------------- */}
      <div
        className="cinema-player-controls-bottom"
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          right: "20px",
          zIndex: 40,
          background: "linear-gradient(0deg, rgba(7, 9, 14, 0.96) 0%, rgba(7, 9, 14, 0.75) 65%, rgba(7, 9, 14, 0) 100%)",
          padding: "16px 20px 12px",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          opacity: controlsVisible || !isPlaying ? 1 : 0,
          pointerEvents: controlsVisible || !isPlaying ? "auto" : "none",
          transition: "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Clean Hover Time Bubble (User Request: poster box removed, only clean time bubble shown) */}
        {((isHoveringScrubber || isDraggingScrubber) || arrowSeekPreviewTime !== null) && duration > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "36px",
              left: `${arrowSeekPreviewTime !== null ? (currentTime / duration) * 100 : hoverPercent * 100}%`,
              transform: "translateX(-50%)",
              zIndex: 40,
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
                background: "rgba(14, 16, 22, 0.90)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.20)",
                borderRadius: "8px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#ffffff",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.85)",
                whiteSpace: "nowrap",
              }}
            >
              {formatTime(arrowSeekPreviewTime !== null ? arrowSeekPreviewTime : hoverTime)}
            </div>
            {/* Arrow pointer */}
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

        {/* Full-width Scrubber / Timeline Bar with Smooth Click & Drag */}
        <div
          ref={scrubberRef}
          onClick={handleScrubberSeek}
          onMouseDown={handleScrubberMouseDown}
          onMouseMove={handleScrubberMouseMove}
          onMouseEnter={() => setIsHoveringScrubber(true)}
          onMouseLeave={() => {
            if (!isDraggingScrubber) setIsHoveringScrubber(false);
          }}
          style={{
            position: "relative",
            width: "100%",
            height: "28px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {/* Track Base */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: isHoveringScrubber || isDraggingScrubber ? "7px" : "3.5px",
              backgroundColor: "rgba(255, 255, 255, 0.22)",
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
                backgroundColor: "rgba(255, 255, 255, 0.45)",
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
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
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
                width: `${getSafeDuration() > 0 ? Math.min(100, Math.max(0, (currentTime / getSafeDuration()) * 100)) : 0}%`,
                backgroundColor: "#e50914",
                boxShadow: "0 0 10px rgba(229, 9, 20, 0.5)",
              }}
            />
          </div>

          {/* Scrubber Playhead Handle */}
          <div
            style={{
              position: "absolute",
              left: `${getSafeDuration() > 0 ? Math.min(100, Math.max(0, (currentTime / getSafeDuration()) * 100)) : 0}%`,
              transform: "translateX(-50%)",
              width: isHoveringScrubber || isDraggingScrubber ? "15px" : "12px",
              height: isHoveringScrubber || isDraggingScrubber ? "15px" : "12px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.7), 0 0 6px #e50914",
              pointerEvents: "none",
              transition: "width 0.15s ease, height 0.15s ease",
            }}
          />
        </div>

        {/* Controls Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Left Controls */}
          <div className="cinema-player-left-controls" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Play / Pause */}
            <button
              className="cinema-ctrl-btn"
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) videoRef.current.play();
                  else videoRef.current.pause();
                }
              }}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "4px",
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
            </button>

            {/* Rewind 10s */}
            <button
              className="cinema-ctrl-btn"
              onClick={() => {
                if (videoRef.current) {
                  const targetT = Math.max(0, videoRef.current.currentTime - 10);
                  videoRef.current.currentTime = targetT;
                  setCurrentTime(targetT);
                  showToast("-10s");
                }
              }}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "4px",
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
              title="Rewind 10s (Left Arrow)"
            >
              <Rewind10Icon size={23} />
            </button>

            {/* Forward 10s */}
            <button
              className="cinema-ctrl-btn"
              onClick={() => {
                if (videoRef.current) {
                  const safeDur = getSafeDuration();
                  const targetT = safeDur > 0 ? Math.min(safeDur, videoRef.current.currentTime + 10) : videoRef.current.currentTime + 10;
                  videoRef.current.currentTime = targetT;
                  setCurrentTime(targetT);
                  showToast("+10s");
                }
              }}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "4px",
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
              title="Forward 10s (Right Arrow)"
            >
              <Forward10Icon size={23} />
            </button>

            {/* Volume Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                className="cinema-ctrl-btn"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !videoRef.current.muted;
                    setIsMuted(videoRef.current.muted);
                  }
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: "4px",
                  transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted || volume === 0 ? <VolumeMuteIcon size={20} /> : <VolumeHighIcon size={20} />}
              </button>
            </div>

            {/* Timestamp & Ending Indicator: 0:00 / 2:05:33 Ends 1:31 AM • Title */}
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#cbd5e1",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                letterSpacing: "0.02em",
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>/</span>
              <span>{formatTime(duration)}</span>
              {estimatedEnd && (
                <span className="cinema-player-mobile-hide-title" style={{ color: "#94a3b8", marginLeft: "6px" }}>
                  {estimatedEnd} • <span style={{ color: "#fff" }}>{movieTitle}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Controls (Screenshot 4) */}
          {/* Right Controls (Screenshot 4) */}
          <div className="cinema-player-right-controls" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Episodes Drawer Toggle Button */}
            {isSeries && (
              <button
                className="cinema-ctrl-btn"
                onClick={() => setShowEpisodesDrawer((prev) => !prev)}
                style={{
                  background: showEpisodesDrawer ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.08)",
                  border: showEpisodesDrawer ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
                title="Episode List"
              >
                <EpisodesDrawerIcon size={16} />
                <span>EPISODES</span>
              </button>
            )}



            {/* Subtitles (CC / Subtitles Box Icon) */}
            <button
              className="cinema-ctrl-btn"
              onClick={() => setActiveMenu(activeMenu === "subtitles" ? "none" : "subtitles")}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: activeMenu === "subtitles" || subtitlesEnabled ? "rgba(255, 255, 255, 0.16)" : "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "4px",
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
              title="Subtitles & Captions"
            >
              <SubtitlesIcon size={21} />
            </button>

            {/* Settings (Gear Icon) */}
            <button
              className="cinema-ctrl-btn"
              onClick={() => setActiveMenu(activeMenu === "settings" || activeMenu === "playback_settings" ? "none" : "settings")}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: activeMenu !== "none" ? "rgba(255, 255, 255, 0.16)" : "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "4px",
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                transform: activeMenu === "settings" || activeMenu === "playback_settings" ? "rotate(45deg)" : "rotate(0deg)",
              }}
              title="Settings"
            >
              <SettingsGearIcon size={20} />
            </button>

            {/* Fullscreen */}
            <button
              className="cinema-ctrl-btn"
              onClick={toggleFullscreen}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "4px",
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
              title="Fullscreen (F)"
            >
              {isFullscreen ? <FullscreenExitIcon size={21} /> : <FullscreenIcon size={21} />}
            </button>
          </div>
        </div>
      </div>

      {/* Translucent Frosted Glass Scroll Down Arrow Indicator (Positioned at bottom edge) */}
      {recommendations && recommendations.length > 0 && (
        <div
          onClick={async () => {
            if (document.fullscreenElement) {
              try {
                await document.exitFullscreen();
              } catch {}
              setIsFullscreen(false);
            }
            setTimeout(() => {
              const recSec = document.getElementById("cinema-player-recommendations-section");
              if (recSec) {
                recSec.scrollIntoView({ behavior: "smooth", block: "start" });
              } else if (containerRef.current) {
                containerRef.current.scrollTo({
                  top: containerRef.current.clientHeight,
                  behavior: "smooth",
                });
              }
            }, 120);
          }}
          style={{
            position: "absolute",
            bottom: "6px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.10)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.22)",
            color: "#ffffff",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.6)",
            opacity: controlsVisible ? 0.95 : 0.45,
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.38)";
            e.currentTarget.style.transform = "translateX(-50%) translateY(2px) scale(1.08)";
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)";
            e.currentTarget.style.transform = "translateX(-50%) translateY(0) scale(1)";
            e.currentTarget.style.opacity = controlsVisible ? "0.95" : "0.45";
          }}
          title="Scroll down to More Like This"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 11. Toast Notifications Banner                                */}
      {/* ------------------------------------------------------------- */}
      {toastMessage && (
        <div
          style={{
            position: "absolute",
            top: "70px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(14, 16, 22, 0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "999px",
            padding: "9px 24px",
            fontSize: "12.5px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.75)",
            zIndex: 50,
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 12. Up Next Episode Floating Prompt Card                      */}
      {/* ------------------------------------------------------------- */}
      {isSeries && (isVideoEnded || (duration > 60 && duration - currentTime <= 35)) && (
        <div
          style={{
            position: "absolute",
            bottom: controlsVisible ? "96px" : "32px",
            right: "28px",
            zIndex: 45,
            background: "rgba(14, 16, 22, 0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.8)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minWidth: "260px",
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>
              UP NEXT
            </span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff" }}>
              S{currentSeason} · E{currentEpisode + 1}
            </span>
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
            {drawerSeasonEpisodes.find((e: any) => (e.episode_number || e.episodeNumber) === currentEpisode + 1)?.name || `Episode ${currentEpisode + 1}`}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              onClick={() => switchEpisode(currentSeason, currentEpisode + 1)}
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.24)",
                color: "#ffffff",
                borderRadius: "999px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
                transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.24)";
                e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                e.currentTarget.style.transform = "translateY(0px) scale(1)";
              }}
            >
              <PlayIcon size={14} />
              <span>Play Next Episode</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 13. Right-side Episodes Drawer (Frosted Glass UI)              */}
      {/* ------------------------------------------------------------- */}
      {showEpisodesDrawer && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(420px, 92vw)",
            background: "rgba(14, 16, 22, 0.90)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.16)",
            boxShadow: "-16px 0 45px rgba(0, 0, 0, 0.85)",
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
              onClick={() => setShowEpisodesDrawer(false)}
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
              (drawerSeasonEpisodes.length > 0
                ? drawerSeasonEpisodes
                : (allMovieBoxDubs[0]?.directLinks || []).map((_: any, idx: number) => ({
                    episode_number: idx + 1,
                    name: `Episode ${idx + 1}`,
                  }))
              ).map((ep: any, idx: number) => {
                const epNum = ep.episode_number || ep.episodeNumber || idx + 1;
                const isPlayingEp = drawerSeason === currentSeason && epNum === currentEpisode;
                const epTitle = ep.name || ep.title || `Episode ${epNum}`;
                const stillUrl = ep.still_path
                  ? (ep.still_path.startsWith("http") ? ep.still_path : `https://image.tmdb.org/t/p/w300${ep.still_path}`)
                  : (ep.image || activeBackdrop || poster);

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
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "11px" }}>
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
                        <span style={{ fontSize: "11px", fontWeight: 700, color: isPlayingEp ? "#ffffff" : "rgba(255, 255, 255, 0.55)", letterSpacing: "0.5px" }}>
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
      )}

      </div> {/* End 100vh Fullscreen Video Player Viewport */}

      {/* 2. Seamless Recommended Movies GRID Below Video Player (When scrolling down) */}
      {recommendations && recommendations.length > 0 && (
        <div
          id="cinema-player-recommendations-section"
          style={{
            position: "relative",
            width: "100%",
            overflow: "hidden",
            backgroundColor: "#07090e",
          }}
        >
          {/* Ambient Blurred Background of Current Movie (User Request: "more like this jo video player ke niche wala h uska background ussi movie ka poster blured version rakhnaa") */}
          {(activeBackdrop || backdrop || poster) && (
            <div
              style={{
                position: "absolute",
                top: "-15%",
                left: "-15%",
                width: "130%",
                height: "130%",
                backgroundImage: `url(${activeBackdrop || backdrop || poster})`,
                backgroundSize: "cover",
                backgroundPosition: "center 25%",
                filter: "blur(80px) saturate(2.2) brightness(0.55)",
                transform: "translate3d(0, 0, 0)",
                pointerEvents: "none",
                zIndex: 0,
                opacity: 0.85,
              }}
            />
          )}

          {/* Dark gradient overlay for contrast and readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(7, 9, 14, 0.75) 0%, rgba(7, 9, 14, 0.6) 30%, rgba(7, 9, 14, 0.88) 75%, #07090e 100%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          <div
            style={{
              width: "100%",
              maxWidth: "1440px",
              margin: "0 auto",
              padding: "56px 48px 96px 48px",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div style={{ marginBottom: "26px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
                More Like This
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "26px 20px",
              }}
            >
              {recommendations.map((rec: any) => (
                <PlayerRecommendedCard
                  key={rec.id}
                  item={rec}
                  onSelect={(item) => {
                    if (onSelectMedia) {
                      onSelectMedia(item);
                    } else {
                      showToast(`Switching to ${item.title || item.name}...`);
                      window.location.hash = `#play-${item.id}`;
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 14. Inline Styles & Keyframe Animations                       */}
      {/* ------------------------------------------------------------- */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseProgress {
          0% { left: 0%; width: 25%; }
          50% { left: 35%; width: 50%; }
          100% { left: 75%; width: 25%; }
        }
        .cinema-ctrl-btn {
          transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease !important;
        }
        .cinema-ctrl-btn:hover {
          transform: translateY(-2px) scale(1.08) !important;
          background-color: rgba(255, 255, 255, 0.16) !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35) !important;
        }
        .cinema-ctrl-btn:active {
          transform: translateY(0px) scale(0.96) !important;
        }
        @keyframes cinemaDotPulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.35;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        .cinema-dot {
          width: 4px;
          height: 4px;
          background-color: #ffffff;
          border-radius: 50%;
          display: inline-block;
          animation: cinemaDotPulse 1.4s infinite ease-in-out both;
        }
        .cinema-dot-1 {
          animation-delay: -0.32s;
        }
        .cinema-dot-2 {
          animation-delay: -0.16s;
        }
        .cinema-dot-3 {
          animation-delay: 0s;
        }
        @media (max-width: 640px) {
          .cinema-player-controls-bottom {
            padding: 8px 10px 12px !important;
            gap: 4px !important;
            justify-content: space-between !important;
          }
          .cinema-player-controls-top {
            padding: 8px 10px !important;
          }
          .cinema-player-left-controls {
            gap: 4px !important;
            flex-shrink: 1 !important;
          }
          .cinema-player-right-controls {
            gap: 6px !important;
            flex-shrink: 0 !important;
          }
          .cinema-player-vol-slider,
          .cinema-player-bookmark-btn,
          .cinema-player-pip-btn,
          .cinema-player-mobile-hide-title {
            display: none !important;
          }
          .cinema-player-menu-flyout {
            right: 8px !important;
            left: 8px !important;
            bottom: 68px !important;
            max-width: calc(100vw - 16px) !important;
            width: auto !important;
          }
          .cinema-player-error-card {
            max-width: calc(100vw - 32px) !important;
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
