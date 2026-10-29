import React, { useRef } from "react";
import {
  CloseIcon,
  ChevronRightIcon,
  BackIcon,
  CheckIcon,
  RefreshCwIcon,
  VolumeHighIcon,
  AspectRatioIcon,
  SunIcon,
  MoonIcon,
  ServerIcon,
} from "./PlayerIcons";
import { cleanAudioName } from "../utils/playerUtils";

export type ActiveMenuType = "none" | "settings" | "playback_settings" | "speed" | "quality" | "audio" | "subtitles" | "sleep" | "servers";

export interface PlayerSettingsFlyoutProps {
  activeMenu: ActiveMenuType;
  setActiveMenu: (menu: ActiveMenuType) => void;
  selectedQuality: number;
  setSelectedQuality: (q: number) => void;
  qualityLevels: Array<{ id: number; name: string }>;
  subtitlesEnabled: boolean;
  setSubtitlesEnabled: (enabled: boolean) => void;
  subtitlesList: Array<{ id: number; name: string; url?: string; language?: string }>;
  setSubtitlesList: React.Dispatch<React.SetStateAction<Array<{ id: number; name: string; url?: string; language?: string }>>>;
  selectedSubtitle: number;
  setSelectedSubtitle: (s: number) => void;
  audioTracks: Array<{ id: string; name: string; language?: string }>;
  selectedAudioTrack: string;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  videoFit: "contain" | "cover" | "fill";
  setVideoFit: (fit: "contain" | "cover" | "fill") => void;
  volumeBoost: number;
  handleBoostChange: (val: number) => void;
  brightnessLevel: number;
  setBrightnessLevel: (val: number) => void;
  sleepTimerMinutes: number | null;
  setSleepTimerMinutes: (m: number | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef: React.MutableRefObject<any>;
  serverList: any[];
  connectToServer: (idx: number) => void;
  currentServerIdx?: number;
  switchAudioTrack: (trackId: string) => void;
  subtitleSearch: string;
  setSubtitleSearch: (s: string) => void;
  isLoadingMoreQualities: boolean;
  handleLoadMoreQualities: () => void;
  isLoadingMoreAudios: boolean;
  handleLoadMoreAudios: () => void;
  showToast: (msg: string) => void;
}

export const PlayerSettingsFlyout: React.FC<PlayerSettingsFlyoutProps> = ({
  activeMenu,
  setActiveMenu,
  selectedQuality,
  setSelectedQuality,
  qualityLevels,
  subtitlesEnabled,
  setSubtitlesEnabled,
  subtitlesList,
  setSubtitlesList,
  selectedSubtitle,
  setSelectedSubtitle,
  audioTracks,
  selectedAudioTrack,
  playbackRate,
  setPlaybackRate,
  videoFit,
  setVideoFit,
  volumeBoost,
  handleBoostChange,
  brightnessLevel,
  setBrightnessLevel,
  sleepTimerMinutes,
  setSleepTimerMinutes,
  videoRef,
  hlsRef,
  serverList,
  connectToServer,
  currentServerIdx = 0,
  switchAudioTrack,
  subtitleSearch,
  setSubtitleSearch,
  isLoadingMoreQualities,
  handleLoadMoreQualities,
  isLoadingMoreAudios,
  handleLoadMoreAudios,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (activeMenu === "none") return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "64px",
        right: "24px",
        width: "330px",
        maxWidth: "calc(100vw - 32px)",
        background: "rgba(36, 42, 52, 0.68)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: "24px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22)",
        backdropFilter: "blur(36px) saturate(190%)",
        WebkitBackdropFilter: "blur(36px) saturate(190%)",
        padding: "8px 0",
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

                <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)", margin: "0 14px" }} />

                {/* Servers */}
                <button
                  onClick={() => setActiveMenu("servers")}
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
                  <span>Servers & Mirrors</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                      {serverList[currentServerIdx]?.name || "Server 1"}
                    </span>
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

          {/* 9. SERVERS FLYOUT */}
          {activeMenu === "servers" && (
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
                  Servers
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

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px 12px",
                  gap: "3px",
                  maxHeight: "340px",
                  overflowY: "auto",
                }}
              >
                {serverList && serverList.length > 0 ? (
                  serverList.map((srv, idx) => {
                    const isCurrent = idx === currentServerIdx;
                    return (
                      <button
                        key={srv.id || idx}
                        onClick={() => {
                          connectToServer(idx);
                          setActiveMenu("none");
                          showToast(`Switching to ${srv.name || `Server ${idx + 1}`}...`);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "11px 16px",
                          borderRadius: "10px",
                          border: "none",
                          background: isCurrent ? "rgba(255, 255, 255, 0.12)" : "transparent",
                          color: "#ffffff",
                          fontSize: "14px",
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                          <span style={{ color: "#ffffff", fontWeight: isCurrent ? 700 : 500 }}>
                            {srv.name || `Server ${idx + 1}`}
                          </span>
                          {srv.quality && (
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{srv.quality}</span>
                          )}
                        </div>
                        {isCurrent && <CheckIcon size={16} color="#e50914" />}
                      </button>
                    );
                  })
                ) : (
                  <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    No alternate servers available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
  );
};
