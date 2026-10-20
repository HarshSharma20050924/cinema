import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { launchExternalPlayer } from "../../hooks/useSettings";

export interface VideoPlayerModalProps {
  playbackUrl: string | null;
  title?: string;
  backdrop?: string;
  poster?: string;
  servers?: Array<{ server: string; link: string; quality?: string; type?: string }>;
  runtime?: string | number;
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

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  playbackUrl,
  title = "Cinema Stream",
  backdrop,
  poster,
  servers: initialServers,
  runtime,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverProbeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse candidate servers
  const serverList = useMemo(() => {
    if (initialServers && initialServers.length > 0) {
      return initialServers.map((s, idx) => ({
        id: idx,
        name: s.server || `Server ${idx + 1}`,
        link: s.link,
        type: s.type,
      }));
    }
    // Single primary stream server
    return [
      { id: 0, name: "Direct Stream", link: playbackUrl || "" },
    ];
  }, [initialServers, playbackUrl]);

  // Player State
  const [playerStatus, setPlayerStatus] = useState<"fetching" | "starting" | "ready" | "error">("fetching");
  const [currentServerIdx, setCurrentServerIdx] = useState<number>(0);
  const [serverStatuses, setServerStatuses] = useState<Record<number, "pending" | "trying" | "success" | "failed">>({
    0: "trying",
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // CNO.TO aesthetic controls & flyouts
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [cropBlackBars, setCropBlackBars] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volumeBoost, setVolumeBoost] = useState<number>(100);
  const [pictureFilter, setPictureFilter] = useState<"standard" | "vivid" | "warm" | "contrast">("standard");
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [activeMenu, setActiveMenu] = useState<"none" | "settings" | "speed" | "quality" | "audio" | "picture" | "sleep" | "servers">("none");
  const [qualityLevels, setQualityLevels] = useState<Array<{ id: number; height: number; name: string }>>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 2500);
  }, []);

  // Compute safe proxied URL so CDN doesn't block VLC or HLS with 403 Forbidden
  const getPlayableUrl = useCallback((rawUrl: string) => {
    if (!rawUrl) return "";
    const isDirectCors =
      rawUrl.includes("pixeldrain.dev") ||
      rawUrl.includes("pixeldrain.com") ||
      rawUrl.includes("gofile.io") ||
      rawUrl.includes("r2.dev");

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!isDirectCors && !rawUrl.includes("/api/proxy") && origin) {
      return `${origin}/api/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }, []);

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

  // Connect active server stream with HLS / HTML5 Video
  const connectToServer = useCallback((serverIdx: number) => {
    const target = serverList[serverIdx];
    if (!target || !target.link) {
      setPlayerStatus("error");
      return;
    }

    setCurrentServerIdx(serverIdx);
    setServerStatuses((prev) => ({
      ...prev,
      [serverIdx]: "trying",
    }));

    const safeUrl = getPlayableUrl(target.link);
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);

    // Auto failover timeout: Allow 16 seconds for initial CDN buffer / proxy negotiation
    serverProbeTimeoutRef.current = setTimeout(() => {
      setServerStatuses((prev) => ({ ...prev, [serverIdx]: "failed" }));
      if (serverIdx + 1 < serverList.length) {
        connectToServer(serverIdx + 1);
      } else {
        setPlayerStatus("error");
      }
    }, 16000);

    const isM3u8 = safeUrl.includes(".m3u8") || safeUrl.includes("/hls/") || safeUrl.includes("/stream/");

    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
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

        // Transition from "Fetching Media" -> "Starting" state
        setPlayerStatus("starting");
        video.play().catch(() => {});

        setTimeout(() => {
          setPlayerStatus("ready");
        }, 1100);
      });

      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (data.fatal) {
          if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);
          setServerStatuses((prev) => ({ ...prev, [serverIdx]: "failed" }));
          hls.destroy();

          if (serverIdx + 1 < serverList.length) {
            connectToServer(serverIdx + 1);
          } else {
            setPlayerStatus("error");
          }
        }
      });
    } else {
      // Direct MP4 / Native video tag
      video.src = safeUrl;
      const onLoaded = () => {
        if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);
        setServerStatuses((prev) => ({ ...prev, [serverIdx]: "success" }));
        setPlayerStatus("starting");
        video.play().catch(() => {});
        setTimeout(() => setPlayerStatus("ready"), 500);
      };
      const onError = () => {
        if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);
        setServerStatuses((prev) => ({ ...prev, [serverIdx]: "failed" }));
        if (serverIdx + 1 < serverList.length) {
          connectToServer(serverIdx + 1);
        } else {
          setPlayerStatus("error");
        }
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
  }, [serverList, getPlayableUrl]);

  // Initial stream mount
  useEffect(() => {
    connectToServer(0);
    return () => {
      if (serverProbeTimeoutRef.current) clearTimeout(serverProbeTimeoutRef.current);
      if (hlsRef.current) hlsRef.current.destroy();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [connectToServer]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedPercent(Math.min(100, (bufferedEnd / video.duration) * 100));
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
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

  // Keyboard Shortcuts (Space, Arrow keys, F, M, C, Esc)
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
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          showToast(`-10s (${formatTime(video.currentTime)})`);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          showToast(`+10s (${formatTime(video.currentTime)})`);
          break;
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
            onClose();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMenu, onClose, showToast, subtitlesEnabled]);

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

  const handleScrubberSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const video = videoRef.current;
    if (video && video.duration) {
      video.currentTime = percent * video.duration;
    }
  };

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
    switch (pictureFilter) {
      case "vivid":
        return "saturate(1.25) contrast(1.1) brightness(1.02)";
      case "warm":
        return "sepia(0.12) contrast(1.05) brightness(1.03)";
      case "contrast":
        return "contrast(1.22) brightness(0.98)";
      default:
        return "none";
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
        inset: 0,
        backgroundColor: "#000000",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. Backdrop (Active during Fetching, Starting, or Buffering)   */}
      {/* ------------------------------------------------------------- */}
      {(playerStatus === "fetching" || playerStatus === "starting" || !isPlaying) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: backdrop || poster ? `url(${backdrop || poster})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(18px) brightness(0.28)",
            transform: "scale(1.08)",
            transition: "opacity 0.8s ease-out",
            zIndex: 1,
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Primary Video Stream Element                               */}
      {/* ------------------------------------------------------------- */}
      <video
        ref={videoRef}
        playsInline
        muted={isMuted}
        style={{
          width: "100%",
          height: "100%",
          objectFit: cropBlackBars ? "cover" : "contain",
          filter: getFilterStyle(),
          backgroundColor: "#000",
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
      {/* 3. FETCHING MEDIA / TRYING STREAMING SERVERS (Screenshot 4)   */}
      {/* ------------------------------------------------------------- */}
      {playerStatus === "fetching" && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "20px",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              background: "rgba(12, 14, 20, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderRadius: "18px",
              padding: "28px 36px",
              minWidth: "320px",
              maxWidth: "420px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                margin: "0 0 4px 0",
              }}
            >
              Fetching Media
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#8b949e",
                margin: "0 0 20px 0",
              }}
            >
              Trying streaming servers...
            </p>

            {/* Server List with dynamic status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              {serverList.map((srv, idx) => {
                const status = serverStatuses[idx] || (idx === currentServerIdx ? "trying" : "pending");
                const isFailed = status === "failed";
                const isTrying = status === "trying";
                const isSuccess = status === "success";

                return (
                  <div
                    key={srv.id}
                    onClick={() => connectToServer(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: isTrying
                        ? "rgba(229, 9, 20, 0.12)"
                        : isFailed
                        ? "rgba(255, 255, 255, 0.02)"
                        : "rgba(255, 255, 255, 0.04)",
                      border: isTrying
                        ? "1px solid rgba(229, 9, 20, 0.4)"
                        : "1px solid rgba(255, 255, 255, 0.05)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {/* Icon */}
                      <span style={{ fontSize: "14px", display: "flex", alignItems: "center" }}>
                        {isFailed ? (
                          <span style={{ color: "#ef4444" }}>❌</span>
                        ) : isTrying ? (
                          <span
                            style={{
                              display: "inline-block",
                              width: "14px",
                              height: "14px",
                              border: "2px solid rgba(229,9,20,0.3)",
                              borderTopColor: "#e50914",
                              borderRadius: "50%",
                              animation: "spin 0.7s linear infinite",
                            }}
                          />
                        ) : isSuccess ? (
                          <span style={{ color: "#22c55e" }}>✓</span>
                        ) : (
                          <span style={{ color: "#64748b" }}>★</span>
                        )}
                      </span>

                      {/* Server Name */}
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: isFailed ? "#64748b" : isTrying ? "#ffffff" : "#cbd5e1",
                        }}
                      >
                        {srv.name}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: isFailed
                          ? "#ef4444"
                          : isTrying
                          ? "#e50914"
                          : isSuccess
                          ? "#22c55e"
                          : "#64748b",
                      }}
                    >
                      {isTrying ? "Trying..." : isFailed ? "Offline" : isSuccess ? "Connected" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
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
            style={{
              background: "rgba(16, 20, 28, 0.95)",
              border: "1px solid rgba(229, 9, 20, 0.3)",
              backdropFilter: "blur(20px)",
              borderRadius: "18px",
              padding: "32px",
              maxWidth: "440px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.9)",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(229, 9, 20, 0.15)",
                color: "#e50914",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                margin: "0 auto 16px",
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: "19px", fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
              Unable to Stream This Title
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 20px" }}>
              The current stream server is offline or blocking connections. Tap retry to re-probe mirrors, or launch in VLC Player.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => {
                  setPlayerStatus("fetching");
                  setServerStatuses({ 0: "trying" });
                  connectToServer(0);
                }}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  background: "#e50914",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  boxShadow: "0 4px 18px rgba(229, 9, 20, 0.4)",
                }}
              >
                🔄 Retry Streaming Servers
              </button>

              <button
                onClick={handleOpenVlc}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🎬 Play in VLC Media Player
              </button>

              <button
                onClick={onClose}
                style={{
                  padding: "10px 20px",
                  background: "none",
                  border: "none",
                  color: "#8b949e",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. STARTING STATE (Screenshot 1: Big title + Starting line)   */}
      {/* ------------------------------------------------------------- */}
      {playerStatus === "starting" && (
        <div
          style={{
            position: "absolute",
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            animation: "fadeIn 0.4s ease-out",
          }}
        >
          {/* Centered Large Movie Title: e.g. TENZING / JAILER */}
          <h1
            style={{
              fontSize: "clamp(30px, 6vw, 64px)",
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: "#ffffff",
              textTransform: "uppercase",
              margin: "0 0 16px 0",
              textShadow: "0 4px 30px rgba(0,0,0,0.9)",
              fontFamily: "'Space Grotesk', 'Inter', -apple-system, sans-serif",
            }}
          >
            {movieTitle}
          </h1>

          {/* Glowing Red Progress Loading Bar */}
          <div
            style={{
              width: "210px",
              height: "2.5px",
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: "9999px",
              overflow: "hidden",
              position: "relative",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "45%",
                background: "linear-gradient(90deg, #e50914, #ff4d5a)",
                borderRadius: "9999px",
                boxShadow: "0 0 12px #e50914",
                animation: "pulseProgress 1.4s ease-in-out infinite",
              }}
            />
          </div>

          {/* Subtext: Starting */}
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#94a3b8",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Starting
          </span>
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
              boxShadow: "0 0 20px rgba(229, 9, 20, 0.4)",
              animation: "spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite",
            }}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. FLOATING UNMUTE BADGE (Screenshots 1, 2, 3: bottom-left)  */}
      {/* ------------------------------------------------------------- */}
      {isMuted && (
        <button
          onClick={handleUnmuteClick}
          style={{
            position: "absolute",
            bottom: controlsVisible ? "80px" : "32px",
            left: "24px",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            borderRadius: "9999px",
            backgroundColor: "#ffffff",
            color: "#000000",
            border: "none",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <VolumeMuteIcon size={16} />
          <span>Unmute</span>
        </button>
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
          onClick={onClose}
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
      {/* 9. SETTINGS FLYOUT MENU (Screenshot 2: Crop, Speed, Quality..) */}
      {/* ------------------------------------------------------------- */}
      {activeMenu !== "none" && (
        <div
          style={{
            position: "absolute",
            bottom: "75px",
            right: "24px",
            width: "285px",
            backgroundColor: "rgba(14, 16, 22, 0.96)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "8px 0",
            zIndex: 40,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {/* Main Settings Menu */}
          {activeMenu === "settings" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Crop Black Bars Switch */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 18px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>Crop Black Bars</span>
                <div
                  onClick={() => setCropBlackBars(!cropBlackBars)}
                  style={{
                    width: "38px",
                    height: "22px",
                    borderRadius: "12px",
                    background: cropBlackBars ? "#e50914" : "rgba(255, 255, 255, 0.15)",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      position: "absolute",
                      top: "3px",
                      left: cropBlackBars ? "19px" : "3px",
                      transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
              </div>

              {/* Speed Item */}
              <button
                onClick={() => setActiveMenu("speed")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 18px",
                  background: "none",
                  border: "none",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>⏱️</span> Speed
                </span>
                <span style={{ fontSize: "12px", color: "#8b949e" }}>
                  {playbackRate === 1 ? "Normal" : `${playbackRate}x`} &gt;
                </span>
              </button>

              {/* Quality Item */}
              <button
                onClick={() => setActiveMenu("quality")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 18px",
                  background: "none",
                  border: "none",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>🎚️</span> Quality
                </span>
                <span style={{ fontSize: "12px", color: "#8b949e" }}>
                  {selectedQuality === -1 ? "Auto" : qualityLevels[selectedQuality]?.name || "Auto"} &gt;
                </span>
              </button>

              {/* Audio Boost Item */}
              <button
                onClick={() => setActiveMenu("audio")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 18px",
                  background: "none",
                  border: "none",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>🎵</span> Audio
                </span>
                <span style={{ fontSize: "12px", color: volumeBoost > 100 ? "#e50914" : "#8b949e", fontWeight: 700 }}>
                  {volumeBoost}% &gt;
                </span>
              </button>

              {/* Picture Mode */}
              <button
                onClick={() => setActiveMenu("picture")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 18px",
                  background: "none",
                  border: "none",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>🔆</span> Picture
                </span>
                <span style={{ fontSize: "12px", color: "#8b949e", textTransform: "capitalize" }}>
                  {pictureFilter} &gt;
                </span>
              </button>

              {/* Sleep Timer */}
              <button
                onClick={() => setActiveMenu("sleep")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 18px",
                  background: "none",
                  border: "none",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span>🌙</span> Sleep Timer
                </span>
                <span style={{ fontSize: "12px", color: "#8b949e" }}>
                  {sleepTimerMinutes ? `${sleepTimerMinutes}m` : "Off"} &gt;
                </span>
              </button>

              {/* Copy Link to This Moment */}
              <button
                onClick={handleCopyMomentLink}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "11px 18px",
                  background: "none",
                  border: "none",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <LinkChainIcon size={14} />
                <span>Copy Link to This Moment</span>
              </button>

              {/* Open in VLC */}
              <button
                onClick={handleOpenVlc}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "11px 18px",
                  background: "none",
                  border: "none",
                  color: "#ff4d5a",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>🎬</span>
                <span>Open in VLC Media Player</span>
              </button>
            </div>
          )}

          {/* Submenu: Speed */}
          {activeMenu === "speed" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                onClick={() => setActiveMenu("settings")}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  color: "#8b949e",
                  fontWeight: 700,
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                &larr; Playback Speed
              </div>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (videoRef.current) videoRef.current.playbackRate = rate;
                    setActiveMenu("settings");
                    showToast(`Speed: ${rate === 1 ? "Normal" : `${rate}x`}`);
                  }}
                  style={{
                    padding: "9px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: playbackRate === rate ? "#e50914" : "#fff",
                    fontSize: "13px",
                    fontWeight: playbackRate === rate ? 700 : 500,
                  }}
                >
                  <span>{rate === 1 ? "Normal (1.0x)" : `${rate}x`}</span>
                  {playbackRate === rate && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Submenu: Quality */}
          {activeMenu === "quality" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                onClick={() => setActiveMenu("settings")}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  color: "#8b949e",
                  fontWeight: 700,
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                &larr; Stream Quality
              </div>
              <button
                onClick={() => {
                  setSelectedQuality(-1);
                  if (hlsRef.current) hlsRef.current.currentLevel = -1;
                  setActiveMenu("settings");
                  showToast("Quality: Auto");
                }}
                style={{
                  padding: "9px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: selectedQuality === -1 ? "#e50914" : "#fff",
                  fontSize: "13px",
                  fontWeight: selectedQuality === -1 ? 700 : 500,
                }}
              >
                <span>Auto (Adaptive 1080p)</span>
                {selectedQuality === -1 && <span>✓</span>}
              </button>
              {qualityLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => {
                    setSelectedQuality(lvl.id);
                    if (hlsRef.current) hlsRef.current.currentLevel = lvl.id;
                    setActiveMenu("settings");
                    showToast(`Quality: ${lvl.name}`);
                  }}
                  style={{
                    padding: "9px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: selectedQuality === lvl.id ? "#e50914" : "#fff",
                    fontSize: "13px",
                    fontWeight: selectedQuality === lvl.id ? 700 : 500,
                  }}
                >
                  <span>{lvl.name}</span>
                  {selectedQuality === lvl.id && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Submenu: Audio Booster */}
          {activeMenu === "audio" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                onClick={() => setActiveMenu("settings")}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  color: "#8b949e",
                  fontWeight: 700,
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                &larr; Audio Booster
              </div>
              {[100, 150, 200, 300].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    handleBoostChange(b);
                    setActiveMenu("settings");
                  }}
                  style={{
                    padding: "9px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: volumeBoost === b ? "#e50914" : "#fff",
                    fontSize: "13px",
                    fontWeight: volumeBoost === b ? 700 : 500,
                  }}
                >
                  <span>{b === 100 ? "100% (Standard)" : `${b}% Booster`}</span>
                  {volumeBoost === b && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Submenu: Picture Filter */}
          {activeMenu === "picture" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                onClick={() => setActiveMenu("settings")}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  color: "#8b949e",
                  fontWeight: 700,
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                &larr; Picture Mode
              </div>
              {[
                { id: "standard", name: "Standard" },
                { id: "vivid", name: "Vivid" },
                { id: "warm", name: "Cinema Warm" },
                { id: "contrast", name: "High Contrast" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setPictureFilter(m.id as any);
                    setActiveMenu("settings");
                    showToast(`Picture: ${m.name}`);
                  }}
                  style={{
                    padding: "9px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: pictureFilter === m.id ? "#e50914" : "#fff",
                    fontSize: "13px",
                    fontWeight: pictureFilter === m.id ? 700 : 500,
                  }}
                >
                  <span>{m.name}</span>
                  {pictureFilter === m.id && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Submenu: Sleep Timer */}
          {activeMenu === "sleep" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                onClick={() => setActiveMenu("settings")}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  color: "#8b949e",
                  fontWeight: 700,
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                &larr; Sleep Timer
              </div>
              {[
                { val: null, label: "Off" },
                { val: 15, label: "15 Minutes" },
                { val: 30, label: "30 Minutes" },
                { val: 45, label: "45 Minutes" },
                { val: 60, label: "1 Hour" },
              ].map((s) => (
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
                    setActiveMenu("settings");
                    showToast(`Sleep Timer: ${s.label}`);
                  }}
                  style={{
                    padding: "9px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: sleepTimerMinutes === s.val ? "#e50914" : "#fff",
                    fontSize: "13px",
                    fontWeight: sleepTimerMinutes === s.val ? 700 : 500,
                  }}
                >
                  <span>{s.label}</span>
                  {sleepTimerMinutes === s.val && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Submenu: Server / Mirrors Selector */}
          {activeMenu === "servers" && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                onClick={() => setActiveMenu("none")}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  color: "#8b949e",
                  fontWeight: 700,
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                &larr; Switch Streaming Server
              </div>
              {serverList.map((srv, idx) => (
                <button
                  key={srv.id}
                  onClick={() => {
                    connectToServer(idx);
                    setActiveMenu("none");
                    showToast(`Switched to ${srv.name}`);
                  }}
                  style={{
                    padding: "9px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: currentServerIdx === idx ? "#e50914" : "#fff",
                    fontSize: "13px",
                    fontWeight: currentServerIdx === idx ? 700 : 500,
                  }}
                >
                  <span>★ {srv.name}</span>
                  {currentServerIdx === idx && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. BOTTOM CONTROLS BAR (Screenshots 1 & 2)                   */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 25,
          background: "linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0) 100%)",
          padding: "24px 20px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          opacity: controlsVisible || !isPlaying ? 1 : 0,
          pointerEvents: controlsVisible || !isPlaying ? "auto" : "none",
          transition: "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Full-width Scrubber / Timeline Bar */}
        <div
          onClick={handleScrubberSeek}
          style={{
            position: "relative",
            width: "100%",
            height: "18px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          {/* Track Base */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "3px",
              backgroundColor: "rgba(255, 255, 255, 0.22)",
              borderRadius: "9999px",
              overflow: "hidden",
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
            {/* Played Progress Bar (Cinema Red) */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                backgroundColor: "#e50914",
                boxShadow: "0 0 10px #e50914",
              }}
            />
          </div>

          {/* Scrubber Playhead Handle */}
          <div
            style={{
              position: "absolute",
              left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              transform: "translateX(-50%)",
              width: "13px",
              height: "13px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              boxShadow: "0 0 10px rgba(229, 9, 20, 0.8)",
              pointerEvents: "none",
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
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Play / Pause */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) videoRef.current.play();
                  else videoRef.current.pause();
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "4px",
              }}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
            </button>

            {/* Rewind 10s */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                  showToast("-10s");
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Rewind 10s (Left Arrow)"
            >
              <Rewind10Icon size={23} />
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
                  showToast("+10s");
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Forward 10s (Right Arrow)"
            >
              <Forward10Icon size={23} />
            </button>

            {/* Volume Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !videoRef.current.muted;
                    setIsMuted(videoRef.current.muted);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
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
                <span style={{ color: "#94a3b8", marginLeft: "6px" }}>
                  {estimatedEnd} • <span style={{ color: "#fff" }}>{movieTitle}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* CC (Subtitles) */}
            <button
              onClick={() => {
                setSubtitlesEnabled(!subtitlesEnabled);
                showToast(!subtitlesEnabled ? "Subtitles: Enabled" : "Subtitles: Disabled");
              }}
              style={{
                background: "none",
                border: "none",
                color: subtitlesEnabled ? "#e50914" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "color 0.2s ease",
              }}
              title="Closed Captions (C)"
            >
              <SubtitlesIcon size={20} />
            </button>

            {/* Server / Mirror Selector Drawer */}
            <button
              onClick={() => setActiveMenu(activeMenu === "servers" ? "none" : "servers")}
              style={{
                background: "none",
                border: "none",
                color: activeMenu === "servers" ? "#e50914" : "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
              title="Select Streaming Server"
            >
              <ServerIcon size={19} />
              <span style={{ display: "none" }}>Server</span>
            </button>

            {/* Crop Black Bars / Aspect Ratio */}
            <button
              onClick={() => {
                setCropBlackBars(!cropBlackBars);
                showToast(cropBlackBars ? "Standard Fit" : "Crop Black Bars (Fill Screen)");
              }}
              style={{
                background: "none",
                border: "none",
                color: cropBlackBars ? "#e50914" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Crop Black Bars (Aspect Ratio)"
            >
              <AspectRatioIcon size={20} />
            </button>

            {/* Bookmark / Moments */}
            <button
              onClick={() => {
                handleCopyMomentLink();
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Bookmark Current Moment"
            >
              <BookmarkIcon size={19} />
            </button>

            {/* Settings Gear */}
            <button
              onClick={() => setActiveMenu(activeMenu === "settings" ? "none" : "settings")}
              style={{
                background: "none",
                border: "none",
                color: activeMenu !== "none" ? "#e50914" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "transform 0.2s ease",
                transform: activeMenu !== "none" ? "rotate(45deg)" : "rotate(0deg)",
              }}
              title="Player Settings"
            >
              <SettingsGearIcon size={20} />
            </button>

            {/* Picture-in-Picture */}
            <button
              onClick={() => {
                if (document.pictureInPictureElement) {
                  document.exitPictureInPicture().catch(() => {});
                } else if (videoRef.current) {
                  videoRef.current.requestPictureInPicture?.().catch(() => {});
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Picture in Picture"
            >
              <PipIcon size={20} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Fullscreen (F)"
            >
              {isFullscreen ? <FullscreenExitIcon size={20} /> : <FullscreenIcon size={20} />}
            </button>
          </div>
        </div>
      </div>

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
            backgroundColor: "rgba(18, 20, 26, 0.94)",
            color: "#ffffff",
            border: "1px solid rgba(229, 9, 20, 0.4)",
            borderRadius: "30px",
            padding: "8px 22px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            boxShadow: "0 8px 30px rgba(0,0,0,0.8), 0 0 15px rgba(229, 9, 20, 0.2)",
            zIndex: 50,
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 12. Inline Styles & Keyframe Animations                       */}
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
      `}</style>
    </div>
  );
};
