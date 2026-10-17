import { useState, useEffect } from "react";
import type { UserSettings, ExternalPlayerType } from "../types";

const STORAGE_KEY = "cinema_user_settings_v2";

const DEFAULT_SETTINGS: UserSettings = {
  cinemaName: "Cinema",
  providerSource: "Cinema",
  installedExtensions: ["hdhub4u", "vega", "4khdhub", "mod", "movieBoxWeb", "1cinevood", "autoEmbed", "katmovies", "world4u"],
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
    streamUrl.includes("aoneroom") ||
    streamUrl.includes("sssrr.org");


  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const origin = typeof window !== "undefined" ? window.location.origin : "";


  // Convert raw magnet to internal WebTorrent stream URL
  let resolvedStreamUrl = streamUrl.trim();
  if (resolvedStreamUrl.startsWith("magnet:")) {
    const hashMatch = resolvedStreamUrl.match(/btih:([a-fA-F0-9]{32,40})/i);
    if (hashMatch) {
      resolvedStreamUrl = `/api/stream/torrent?hash=${hashMatch[1]}&name=${encodeURIComponent(cleanTitle)}`;
    }
  }

  // Clean direct stream URL for external players (VLC connects directly without CORS limits)
  let playableUrl = resolvedStreamUrl;
  if (playableUrl.startsWith("/api/")) {
    playableUrl = `${origin}${playableUrl}`;
  }

  // MovieBox streams require custom Referer headers; route through /api/proxy so VLC and external players never get "The location cannot be played"
  if (isMovieBox && !playableUrl.includes("/api/proxy") && origin) {
    playableUrl = `${origin}/api/proxy?url=${encodeURIComponent(playableUrl)}`;
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

  // Desktop (Windows / Mac / Linux):
  if (_player === "custom") {
    const scheme = customScheme.replace(/:\/\/$/, "");
    window.location.href = `${scheme}://${playableUrl}`;
    return;
  }

  // 1. Electron Desktop App context (Direct VLC process spawn)
  if (typeof window !== "undefined" && (window as any).CinemaDesktop?.playInVlc) {
    (window as any).CinemaDesktop.playInVlc({
      streamUrl: playableUrl,
      title: cleanTitle,
      isMovieBox,
    });
    return;
  }

  // 2. Try Local Companion / Engine endpoints (direct 127.0.0.1, localhost, and relative /api/play-vlc)
  const localEndpoints = [
    "http://127.0.0.1:3001/api/play-vlc",
    "http://localhost:3001/api/play-vlc",
    "/api/play-vlc",
  ];

  const payload = JSON.stringify({
    streamUrl: playableUrl,
    title: cleanTitle,
    isMovieBox,
  });

  const tryLocalSpawn = async () => {
    for (const endpoint of localEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          signal: AbortSignal.timeout(800),
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.launched) {
            return true;
          }
        }
      } catch (_) {
        // Try next endpoint
      }
    }
    return false;
  };

  tryLocalSpawn().then((launched) => {
    if (!launched) {
      // Direct OS Protocol Handoff to VLC without downloading files to disk
      const needsPlaylistWrapper =
        isMovieBox ||
        playableUrl.includes("mxplayer") ||
        playableUrl.includes("cloudfront.net/secim/");

      const vlcTarget = needsPlaylistWrapper
        ? `${origin}/api/playlist.m3u?url=${encodeURIComponent(playableUrl)}&title=${encodeURIComponent(cleanTitle)}`
        : playableUrl;

      window.location.href = `vlc://${vlcTarget}`;
    }
  });
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const installedExtensions: string[] = parsed.installedExtensions || DEFAULT_SETTINGS.installedExtensions;
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          defaultPlayer: parsed.defaultPlayer === "web" ? "vlc" : (parsed.defaultPlayer || "vlc"),
          installedExtensions,
          cinemaName: "Cinema",
          isConfigured: true,
        };
      }
    } catch (e) {
      console.warn("Failed to parse settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Sync with native Desktop settings file if available
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).CinemaDesktop?.getUserSettings) {
      (window as any).CinemaDesktop.getUserSettings().then((desktopSettings: any) => {
        if (desktopSettings) {
          setSettings((prev) => ({
            ...prev,
            ...desktopSettings,
            isConfigured: true,
            cinemaName: "Cinema",
          }));
        }
      });
    }
  }, []);

  const saveSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev: UserSettings) => {
      const updated: UserSettings = { ...prev, ...newSettings, isConfigured: true, cinemaName: "Cinema" };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
      if (typeof window !== "undefined" && (window as any).CinemaDesktop?.saveUserSettings) {
        (window as any).CinemaDesktop.saveUserSettings(updated);
      }
      return updated;
    });
  };

  const completeSetup = (_ignoredName: string, providerSource: string, installedExtensions: string[]) => {
    saveSettings({
      cinemaName: "Cinema",
      providerSource: providerSource.trim() || "Cinema",
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
