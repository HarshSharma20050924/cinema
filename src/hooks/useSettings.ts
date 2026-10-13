import { useState } from "react";
import type { UserSettings, ExternalPlayerType } from "../types";

const STORAGE_KEY = "cinema_user_settings_v2";

const DEFAULT_SETTINGS: UserSettings = {
  cinemaName: "Cinema",
  providerSource: "harsh cinema",
  installedExtensions: ["hdhub4u", "vega", "4khdhub", "olamovies", "gramcinema", "drive", "mod", "movieBoxWeb", "1cinevood", "autoEmbed", "katmovies", "world4u"],
  defaultPlayer: "vlc",
  customPlayerScheme: "vlc://",
  isConfigured: false,
};

export const launchExternalPlayer = (
  streamUrl: string,
  _player: ExternalPlayerType = "vlc",
  customScheme: string = "vlc://",
  title: string = "video"
) => {
  if (!streamUrl) return;

  const cleanTitle = (title || "video").replace(/[\r\n]/g, " ").trim() || "stream";

  const isMovieBox =
    streamUrl.includes("hakunaymatata") ||
    streamUrl.includes("moviebox") ||
    streamUrl.includes("inmoviebox") ||
    streamUrl.includes("aoneroom");

  // 1. Desktop Electron Native VLC Launcher (Zero Location Error / Direct Process Spawn)
  if (typeof window !== "undefined" && (window as any).CinemaDesktop?.playInVlc) {
    (window as any).CinemaDesktop.playInVlc({
      streamUrl,
      title: cleanTitle,
      isMovieBox,
    });
    return;
  }

  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const isDirectCors =
    streamUrl.includes("pixeldrain.dev") ||
    streamUrl.includes("pixeldrain.com") ||
    streamUrl.includes("gofile.io") ||
    streamUrl.includes("r2.dev");

  // Route through proxy so external players (VLC/MPV) receive proper Referer/Origin headers
  let playableUrl = streamUrl.trim();
  if (!isDirectCors && origin && !streamUrl.includes("/api/proxy")) {
    playableUrl = `${origin}/api/proxy?url=${encodeURIComponent(streamUrl)}`;
    if (isMovieBox) {
      playableUrl += `&referer=${encodeURIComponent("https://officialmoviebox.com/")}`;
      playableUrl += `&origin=${encodeURIComponent("https://officialmoviebox.com")}`;
    }
  }

  // Ensure the URL ends in a media extension (.mkv / .mp4) so media players recognize it
  if (!/\.(mkv|mp4|m3u8|webm|avi|mov|flv|ts)(\?|$)/i.test(playableUrl)) {
    playableUrl += playableUrl.includes("?") ? "&file=video.mp4" : "?file=video.mp4";
  }

  // Auto-copy link to clipboard so user can instantly paste into VLC's Stream box if needed
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(playableUrl);
    }
  } catch (_) {}

  if (isAndroid) {
    const scheme = playableUrl.startsWith("https") ? "https" : "http";
    const noScheme = playableUrl.replace(/^https?:\/\//i, "");

    const safeTitle = cleanTitle.replace(/[^a-zA-Z0-9 _-]/g, "");
    
    // Explicit VLC Package targeting ensures Android never redirects to Chrome or external browser
    const pkgExtra = _player === "vlc" ? ";package=org.videolan.vlc" : "";
    const headersExtra = isMovieBox
      ? `;S.extra_headers=${encodeURIComponent("Referer: https://officialmoviebox.com/\r\n")}`
      : "";

    const intentUrl = `intent://${noScheme}#Intent;scheme=${scheme}${pkgExtra};type=video/*;action=android.intent.action.VIEW;S.title=${encodeURIComponent(safeTitle)};S.android.intent.extra.TITLE=${encodeURIComponent(safeTitle)};S.android.intent.extra.TEXT=${encodeURIComponent(playableUrl)};S.url=${encodeURIComponent(playableUrl)}${headersExtra};B.from_start=true;end`;

    const a = document.createElement("a");
    a.href = intentUrl;
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (isIOS) {
    window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(playableUrl)}`;
    return;
  }

  // Desktop (Windows / Mac / Linux Browser):
  if (_player === "custom") {
    const scheme = customScheme.replace(/:\/\/$/, "");
    window.location.href = `${scheme}://${playableUrl}`;
    return;
  }

  // On desktop browser, downloading a .m3u file launches VLC directly without location error:
  const safeFileName = cleanTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "stream";
  let m3uContent = `#EXTM3U\n#EXTINF:-1,${cleanTitle}\n`;
  if (isMovieBox) {
    m3uContent += "#EXTVLCOPT:http-referrer=https://officialmoviebox.com/\n";
    m3uContent += "#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n";
  }
  m3uContent += `${playableUrl}\n`;

  const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safeFileName}.m3u`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const existing: string[] = parsed.installedExtensions || [];
        const installedExtensions = [...existing];
        if (!installedExtensions.includes("olamovies")) {
          installedExtensions.push("olamovies");
        }
        if (!installedExtensions.includes("gramcinema")) {
          installedExtensions.push("gramcinema");
        }
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          defaultPlayer: parsed.defaultPlayer === "web" ? "vlc" : (parsed.defaultPlayer || "vlc"),
          installedExtensions,
          cinemaName: "Cinema",
        };
      }
    } catch (e) {
      console.warn("Failed to parse settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  const saveSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev: UserSettings) => {
      const updated: UserSettings = { ...prev, ...newSettings, cinemaName: "Cinema" };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
      return updated;
    });
  };

  const completeSetup = (_ignoredName: string, providerSource: string, installedExtensions: string[]) => {
    saveSettings({
      cinemaName: "Cinema",
      providerSource: providerSource.trim() || "harsh cinema",
      installedExtensions,
      isConfigured: true,
    });
  };

  const toggleExtension = (providerValue: string) => {
    setSettings((prev: UserSettings) => {
      const current = prev.installedExtensions || [];
      const updated = current.includes(providerValue)
        ? current.filter((v: string) => v !== providerValue)
        : [...current, providerValue];
      const nextSettings: UserSettings = { ...prev, installedExtensions: updated, cinemaName: "Cinema" };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
      } catch (e) {
        console.error(e);
      }
      return nextSettings;
    });
  };

  return {
    settings,
    saveSettings,
    completeSetup,
    toggleExtension,
  };
}
