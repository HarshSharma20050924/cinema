import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { launchExternalPlayer } from "../../hooks/useSettings";
import { fetchTMDBDetails, fetchTMDBSeasonDetails } from "../../api/tmdb";
import { saveContinueWatching, getContinueWatchingList } from "../../utils/continueWatchingService";
import {
  formatTime,
  computeEstimatedEndTime,
  cleanAudioName,
  isStrictTitleMatch,
} from "./utils/playerUtils";
import {
  BackIcon,
  ChevronRightIcon,
  CloseIcon,
  PlayIcon,
  PauseIcon,
  Rewind10Icon,
  Forward10Icon,
  VolumeHighIcon,
  VolumeMuteIcon,
  SubtitlesIcon,
  ServerIcon,
  AspectRatioIcon,
  BookmarkIcon,
  SettingsGearIcon,
  PipIcon,
  FullscreenIcon,
  FullscreenExitIcon,
  WatchPartyIcon,
  SpeedIcon,
  ChatBubbleIcon,
  LinkChainIcon,
  CheckIcon,
  CrossIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  SlidersIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  DragHandleIcon,
  CloudServersIcon,
  EpisodesDrawerIcon,
  FilmIcon,
} from "./components/PlayerIcons";
import { PlayerRecommendedCard } from "./components/PlayerRecommendedCard";
import { PlayerSettingsFlyout, type ActiveMenuType } from "./components/PlayerSettingsFlyout";
import { PlayerBottomControls } from "./components/PlayerBottomControls";
import { PlayerEpisodesDrawer } from "./components/PlayerEpisodesDrawer";

export { isStrictTitleMatch, formatTime, computeEstimatedEndTime, cleanAudioName };

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
  const isSeekingRef = useRef<boolean>(false);
  const targetSeekTimeRef = useRef<number | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Resolve saved continue watching progress if not explicitly provided as prop
  const effectiveInitialTime = useMemo(() => {
    if (initialTime && initialTime > 4) return initialTime;
    try {
      const cwList = getContinueWatchingList();
      const match = cwList.find(
        (c) =>
          (tmdbId && c.tmdbId === tmdbId && c.season === season && c.episode === episode) ||
          (c.title && title && c.title.toLowerCase().trim() === title.toLowerCase().trim() && c.season === season && c.episode === episode)
      );
      if (match && match.currentTime > 4) {
        return match.currentTime;
      }
    } catch (_) {}
    return 0;
  }, [initialTime, tmdbId, title, season, episode]);

  const pendingResumeRef = useRef<number>(effectiveInitialTime);
  useEffect(() => {
    if (effectiveInitialTime > 4) {
      pendingResumeRef.current = effectiveInitialTime;
      hasResumedRef.current = false;
    }
  }, [effectiveInitialTime]);

  // Automatic progress persistence to Continue Watching Service
  const saveCurrentProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const curr = video.currentTime;
    const dur = (video.duration && !isNaN(video.duration) && video.duration > 0) ? video.duration : (duration || 0);
    if (curr < 4 || isNaN(curr)) return;
    // Do not overwrite saved progress with initial 0 frame before resume completes!
    if (!hasResumedRef.current && (pendingResumeRef.current > 4 || effectiveInitialTime > 4)) return;
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
  }, [title, poster, backdrop, playbackUrl, season, episode, tmdbId, post, duration, initialEpisodes, effectiveInitialTime]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 2500);
  }, []);

  // Reliable resume execution that waits until video is buffered to seek
  const attemptResume = useCallback(() => {
    if (hasResumedRef.current) return;
    const target = pendingResumeRef.current > 4 ? pendingResumeRef.current : (effectiveInitialTime > 4 ? effectiveInitialTime : 0);
    if (target <= 4) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.readyState >= 1) {
      try {
        isSeekingRef.current = true;
        video.currentTime = target;
        setCurrentTime(target);
        hasResumedRef.current = true;
        pendingResumeRef.current = 0;
        showToast(`Resumed from ${formatTime(target)}`);
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 400);
      } catch (e) {
        console.warn("[Player] Resume seek error:", e);
      }
    }
  }, [effectiveInitialTime, showToast]);

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
      // If video has already buffered or is currently playing, ignore transient fail
      if (video && (video.readyState >= 2 || video.currentTime > 1 || !video.paused)) {
        setPlayerStatus("ready");
        return;
      }
      setServerStatuses((prev) => ({ ...prev, [idx]: "failed" }));
      const currentList = serverListRef.current;
      if (idx + 1 < currentList.length) {
        const next = currentList[idx + 1];
        showToast(`Connecting to ${next.name}...`);
        connectToServer(idx + 1, true);
      } else {
        // If discovery might still be ongoing, wait a brief moment before showing error
        setTimeout(() => {
          if (video && (video.readyState >= 2 || video.currentTime > 1 || !video.paused)) {
            setPlayerStatus("ready");
          } else {
            const updatedList = serverListRef.current;
            if (idx + 1 < updatedList.length) {
              connectToServer(idx + 1, true);
            } else {
              setPlayerStatus("error");
            }
          }
        }, 3500);
      }
    };

    // Auto failover timeout: Allow 25 seconds for initial connection, cold-start proxy & buffer negotiation
    serverProbeTimeoutRef.current = setTimeout(() => {
      handleServerFail(serverIdx, "Timeout");
    }, 25000);

    if (!safeUrl || !safeUrl.trim()) {
      handleServerFail(serverIdx, "Invalid stream URL");
      return;
    }

    const isM3u8 = safeUrl.includes(".m3u8") || safeUrl.includes("/hls/") || safeUrl.includes("/stream/");

    const targetResume = (effectiveInitialTime > 4 && !hasResumedRef.current)
      ? effectiveInitialTime
      : (previousTime > 2 ? previousTime : 0);

    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        startPosition: targetResume > 0 ? targetResume : -1,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120,
        maxBufferLength: 60,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 3.0, // Allow buffer gaps during seeks without triggering stall errors
        highBufferWatchdogPeriod: 0, // Disable watchdog so seeks to unbuffered chunks don't cause fatal stalls
        nudgeOffset: 0.2,
        nudgeMaxRetry: 10,
        maxFragLookUpTolerance: 0.5,
        liveDurationInfinity: false,
        fragLoadingTimeOut: 30000,
        manifestLoadingTimeOut: 25000,
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

        if (targetResume > 0) {
          attemptResume();
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
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR: {
              const cur = video.currentTime;
              console.warn("[HLS] Recovering media error at time:", cur);
              hls.recoverMediaError();
              if (cur > 1) {
                setTimeout(() => {
                  if (videoRef.current) {
                    try {
                      videoRef.current.currentTime = cur;
                    } catch (_) {}
                  }
                }, 150);
              }
              break;
            }
            default:
              hls.destroy();
              handleServerFail(serverIdx, "Stream Error");
              break;
          }
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

        if (targetResume > 0) {
          attemptResume();
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
  }, [getPlayableUrl, showToast, effectiveInitialTime]);

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

  // Core high-accuracy seek dispatcher supporting instant timeline jumping
  const performSeek = useCallback((targetTime: number) => {
    const video = videoRef.current;
    if (!video || isNaN(targetTime) || targetTime < 0) return;

    isSeekingRef.current = true;
    targetSeekTimeRef.current = targetTime;
    setIsBuffering(true);
    setCurrentTime(targetTime);
    lastSavedTimeRef.current = targetTime;

    try {
      video.currentTime = targetTime;
    } catch (_) {}

    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    // Generous fallback timeout: onSeeked will clear this earlier upon stream arrival
    seekTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
      targetSeekTimeRef.current = null;
      setIsBuffering(false);
    }, 4000);
  }, []);

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
      if (isSeekingRef.current || isDraggingScrubberRef.current) return;
      userPausedRef.current = true;
      setIsPlaying(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setPlayerStatus("ready");
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false;
      }, 350);
    };
    const onSeeking = () => {
      setIsBuffering(true);
    };
    const onSeeked = () => {
      setIsBuffering(false);
      if (video) {
        const cur = video.currentTime;
        if (cur > 0.5) {
          setCurrentTime(cur);
        }
      }
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false;
        targetSeekTimeRef.current = null;
      }, 150);
    };
    const onTimeUpdate = () => {
      if (isDraggingScrubberRef.current || isSeekingRef.current) return;
      if (video) {
        const cur = video.currentTime;
        // Emergency fallback: If video started playback from 0:00 despite pending resume, force seek immediately!
        if (!hasResumedRef.current && (pendingResumeRef.current > 4 || effectiveInitialTime > 4) && cur < 3) {
          attemptResume();
          return;
        }

        // Ignore stale pre-seek frame updates until seeked completes
        if (targetSeekTimeRef.current !== null && Math.abs(cur - targetSeekTimeRef.current) > 8) {
          return;
        }
        setCurrentTime(cur);
        if (cur > 0) {
          setPlayerStatus("ready");
        }
        if (video.buffered.length > 0 && video.duration > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          setBufferedPercent(Math.min(100, (bufferedEnd / video.duration) * 100));
        }
        if (Math.abs(cur - lastSavedTimeRef.current) >= 3) {
          saveCurrentProgress();
        }
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onEnded = () => {
      setIsVideoEnded(true);
    };

    video.addEventListener("loadedmetadata", attemptResume);
    video.addEventListener("loadeddata", attemptResume);
    video.addEventListener("canplay", attemptResume);
    video.addEventListener("playing", attemptResume);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", attemptResume);
      video.removeEventListener("loadeddata", attemptResume);
      video.removeEventListener("canplay", attemptResume);
      video.removeEventListener("playing", attemptResume);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("seeked", onSeeked);
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
          performSeek(targetT);
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
            performSeek(targetT);
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

  const handleScrubberSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingScrubberRef.current = false;
    setIsDraggingScrubber(false);
    const res = updateScrubberPosition(e.clientX);
    if (res && res.time >= 0) {
      performSeek(res.time);
    }
  }, [updateScrubberPosition, performSeek]);

  const handleScrubberMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingScrubberRef.current = true;
    setIsDraggingScrubber(true);
    const res = updateScrubberPosition(e.clientX);
    if (res && res.time >= 0) {
      setCurrentTime(res.time);
      pendingSeekTimeRef.current = res.time;
    }
  }, [updateScrubberPosition]);

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
      const targetT = pendingSeekTimeRef.current;
      if (targetT !== null && !isNaN(targetT) && targetT >= 0) {
        performSeek(targetT);
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

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !isMuted;
    video.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && video.volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (video) {
      video.volume = val;
      video.muted = val === 0;
      setIsMuted(val === 0);
    }
  }, []);

  const handleSkip = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const safeDur = getSafeDuration();
    const cur = isSeekingRef.current ? currentTime : video.currentTime;
    const targetT = safeDur > 0 ? Math.max(0, Math.min(safeDur, cur + delta)) : Math.max(0, cur + delta);
    performSeek(targetT);
    showToast(`${delta > 0 ? "+" : ""}${delta}s (${formatTime(targetT)})`);
  }, [getSafeDuration, currentTime, performSeek, showToast]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (_) {}
  }, []);

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
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.24)",
              backdropFilter: "blur(32px) saturate(200%)",
              WebkitBackdropFilter: "blur(32px) saturate(200%)",
              borderRadius: "24px",
              padding: "24px 32px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45), inset 0 1px 1.5px rgba(255, 255, 255, 0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={() => {
                setPlayerStatus("fetching");
                setServerStatuses({});
                showToast("Reconnecting to stream...");
                connectToServer(0, false);
              }}
              style={{
                padding: "11px 28px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.14)",
                border: "1px solid rgba(255, 255, 255, 0.28)",
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
        {/* Back Button with Exact Reference Transparent Frosted Glass */}
        <button
          onClick={() => {
            saveCurrentProgress();
            onClose();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            borderRadius: "9999px",
            background: "rgba(36, 42, 52, 0.68)",
            backdropFilter: "blur(36px) saturate(190%)",
            WebkitBackdropFilter: "blur(36px) saturate(190%)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(48, 56, 70, 0.85)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.28)";
            e.currentTarget.style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(36, 42, 52, 0.68)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Back to Details (Esc)"
        >
          <BackIcon size={18} />
          <span style={{ fontSize: "13px", fontWeight: 600 }}>Back</span>
        </button>

        {/* Center Floating Title Pill with Exact Reference Transparent Frosted Glass */}
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 22px",
              borderRadius: "9999px",
              background: "rgba(36, 42, 52, 0.68)",
              backdropFilter: "blur(36px) saturate(190%)",
              WebkitBackdropFilter: "blur(36px) saturate(190%)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)",
              maxWidth: "50%",
            }}
          >
            <span
              style={{
                fontSize: "13.5px",
                fontWeight: 700,
                color: "#ffffff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </span>
            {season && episode && (
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "rgba(255, 255, 255, 0.16)",
                  padding: "2px 9px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.24)",
                  boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                S{season} E{episode}
              </span>
            )}
          </div>
        )}

        {/* Right Action Spacer (Maintains center title alignment) */}
        <div style={{ width: "40px" }} />
      </div>
      {/* 9. SETTINGS FLYOUT MENU */}
      <PlayerSettingsFlyout
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        selectedQuality={selectedQuality}
        setSelectedQuality={setSelectedQuality}
        qualityLevels={qualityLevels}
        subtitlesEnabled={subtitlesEnabled}
        setSubtitlesEnabled={setSubtitlesEnabled}
        subtitlesList={subtitlesList}
        setSubtitlesList={setSubtitlesList}
        selectedSubtitle={selectedSubtitle}
        setSelectedSubtitle={setSelectedSubtitle}
        audioTracks={audioTracks}
        selectedAudioTrack={selectedAudioTrack}
        playbackRate={playbackRate}
        setPlaybackRate={setPlaybackRate}
        videoFit={videoFit}
        setVideoFit={setVideoFit}
        volumeBoost={volumeBoost}
        handleBoostChange={handleBoostChange}
        brightnessLevel={brightnessLevel}
        setBrightnessLevel={setBrightnessLevel}
        sleepTimerMinutes={sleepTimerMinutes}
        setSleepTimerMinutes={setSleepTimerMinutes}
        videoRef={videoRef}
        hlsRef={hlsRef}
        serverList={serverList}
        connectToServer={connectToServer}
        currentServerIdx={currentServerIdx}
        switchAudioTrack={switchAudioTrack}
        subtitleSearch={subtitleSearch}
        setSubtitleSearch={setSubtitleSearch}
        isLoadingMoreQualities={isLoadingMoreQualities}
        handleLoadMoreQualities={handleLoadMoreQualities}
        isLoadingMoreAudios={isLoadingMoreAudios}
        handleLoadMoreAudios={handleLoadMoreAudios}
        showToast={showToast}
      />
      {/* 10. BOTTOM CONTROLS BAR */}
      <PlayerBottomControls
        controlsVisible={controlsVisible}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        duration={duration}
        currentTime={currentTime}
        isHoveringScrubber={isHoveringScrubber}
        isDraggingScrubber={isDraggingScrubber}
        setIsHoveringScrubber={setIsHoveringScrubber}
        arrowSeekPreviewTime={arrowSeekPreviewTime}
        hoverPercent={hoverPercent}
        hoverTime={hoverTime}
        scrubberRef={scrubberRef}
        bufferedPercent={bufferedPercent}
        handleScrubberMouseMove={handleScrubberMouseMove}
        handleScrubberLeave={() => {
          if (!isDraggingScrubber) setIsHoveringScrubber(false);
        }}
        handleScrubberMouseDown={handleScrubberMouseDown}
        handleScrubberSeek={handleScrubberSeek}
        handleSkip={handleSkip}
        isMuted={isMuted}
        toggleMute={toggleMute}
        volume={volume}
        handleVolumeChange={handleVolumeChange}
        isTvOrAnime={isSeries}
        showEpisodesDrawer={showEpisodesDrawer}
        setShowEpisodesDrawer={setShowEpisodesDrawer}
        subtitlesEnabled={subtitlesEnabled}
        setSubtitlesEnabled={setSubtitlesEnabled}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        title={title}
        season={currentSeason}
        episode={currentEpisode}
        togglePip={togglePip}
        onBookmarkClick={() => showToast("Saved to Watchlist")}
      />

      {/* Translucent Frosted Glass Scroll Down Arrow Indicator (Positioned at bottom edge, only when controls hidden) */}
      {recommendations && recommendations.length > 0 && !(controlsVisible || !isPlaying) && (
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
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
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
      {/* 13. Episodes Drawer */}
      <PlayerEpisodesDrawer
        isOpen={showEpisodesDrawer}
        onClose={() => setShowEpisodesDrawer(false)}
        currentSeason={currentSeason}
        currentEpisode={currentEpisode}
        totalSeasonsCount={totalSeasonsCount}
        drawerSeason={drawerSeason}
        setDrawerSeason={setDrawerSeason}
        loadingDrawerEpisodes={loadingDrawerEpisodes}
        drawerSeasonEpisodes={drawerSeasonEpisodes}
        allMovieBoxDubs={allMovieBoxDubs}
        switchEpisode={switchEpisode}
        activeBackdrop={activeBackdrop}
        poster={poster}
      />
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
