import React, { useState, useEffect } from "react";
import packageJson from "../../../package.json";

declare global {
  interface Window {
    CinemaDesktop?: {
      isDesktop: boolean;
      platform: string;
      version: string;
      checkForUpdates: () => Promise<any>;
      downloadUpdate: (url: string) => Promise<any>;
      applyUpdate: () => Promise<any>;
      onUpdateProgress: (cb: (data: any) => void) => () => void;
      onUpdateDownloaded: (cb: (data: any) => void) => () => void;
    };
    Capacitor?: any;
  }
}

export const UpdateModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    notes?: string;
    downloadUrl?: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [isReadyToApply, setIsReadyToApply] = useState(false);

  const currentAppVersion = (window.CinemaDesktop?.version || packageJson?.version || "").replace(/^v/i, "").trim();

  const isNewerVersion = (remote: string, current: string): boolean => {
    const r = remote.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
    const c = current.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(r.length, c.length); i++) {
      const rPart = r[i] || 0;
      const cPart = c[i] || 0;
      if (rPart > cPart) return true;
      if (rPart < cPart) return false;
    }
    return false;
  };

  // Check for updates on startup
  useEffect(() => {
    let unbindProgress: (() => void) | undefined;
    let unbindDownloaded: (() => void) | undefined;

    const checkUpdates = async () => {
      // Prevent repeated prompts if update was applied or dismissed during this session
      if (
        sessionStorage.getItem("cinema_update_applied") ||
        sessionStorage.getItem("cinema_dismissed_update")
      ) {
        return;
      }

      // 1. Electron Desktop Mode
      if (window.CinemaDesktop?.checkForUpdates) {
        try {
          const res = await window.CinemaDesktop.checkForUpdates();
          if (res && res.updateAvailable && res.downloadUrl) {
            setUpdateInfo({
              version: res.version,
              notes: res.notes,
              downloadUrl: res.downloadUrl,
            });
            setIsOpen(true);
          }
        } catch (_) {}

        unbindProgress = window.CinemaDesktop.onUpdateProgress((data) => {
          setIsDownloading(true);
          setProgress(data.percent || 0);
          setStatusText(
            data.totalMB
              ? `Downloading: ${data.receivedMB} / ${data.totalMB} MB (${data.speedMB || ""})`
              : `Downloading... ${data.percent}%`
          );
        });

        unbindDownloaded = window.CinemaDesktop.onUpdateDownloaded(() => {
          setIsDownloading(false);
          setIsReadyToApply(true);
          setProgress(100);
          setStatusText("Download complete! Ready to restart and apply.");
        });
      } else {
        // 2. Mobile (Capacitor) and Web Environments
        try {
          const endpoints = [
            "https://api.github.com/repos/HarshSharma20050924/cinema/releases/latest",
            "https://raw.githubusercontent.com/HarshSharma20050924/cinema/main/package.json"
          ];
          for (const ep of endpoints) {
            try {
              const res = await fetch(ep, { cache: "no-store" });
              if (!res.ok) continue;
              const data = await res.json();
              const tag = data.tag_name || data.version || "";
              const remoteVer = tag.replace(/^v/i, "").trim();
              if (remoteVer && isNewerVersion(remoteVer, currentAppVersion)) {
                let downloadUrl = "https://github.com/HarshSharma20050924/cinema/releases/latest";
                if (data.assets && Array.isArray(data.assets)) {
                  const webApk = data.assets.find((a: any) => a.name?.toLowerCase() === "cinema-web.apk");
                  const runnerApk = data.assets.find((a: any) => a.name?.toLowerCase() === "cinema-runner.apk");
                  const anyApk = data.assets.find((a: any) => a.name?.toLowerCase().endsWith(".apk"));
                  if (webApk) {
                    downloadUrl = webApk.browser_download_url;
                  } else if (runnerApk) {
                    downloadUrl = runnerApk.browser_download_url;
                  } else if (anyApk) {
                    downloadUrl = anyApk.browser_download_url;
                  }
                }
                setUpdateInfo({
                  version: remoteVer,
                  notes: data.body || "A new update for Cinema is available.",
                  downloadUrl,
                });
                setIsOpen(true);
                break;
              }
            } catch (_) {}
          }
        } catch (_) {}
      }
    };

    const timer = setTimeout(checkUpdates, 2000);
    return () => {
      clearTimeout(timer);
      if (unbindProgress) unbindProgress();
      if (unbindDownloaded) unbindDownloaded();
    };
  }, []);

  const handleStartUpdate = async () => {
    if (isReadyToApply) {
      if (window.CinemaDesktop?.applyUpdate) {
        sessionStorage.setItem("cinema_update_applied", updateInfo?.version || "true");
        setStatusText("Applying update and relaunching Cinema...");
        await window.CinemaDesktop.applyUpdate();
      }
      return;
    }

    if (!updateInfo?.downloadUrl) return;

    if (window.CinemaDesktop?.downloadUpdate) {
      setIsDownloading(true);
      setProgress(2);
      setStatusText("Connecting to release servers...");
      try {
        await window.CinemaDesktop.downloadUpdate(updateInfo.downloadUrl);
      } catch (e: any) {
        setIsDownloading(false);
        setStatusText("Download failed. Please try again.");
      }
    } else {
      // Mobile / Web: Open download link directly
      window.open(updateInfo.downloadUrl, "_blank");
      setIsOpen(false);
    }
  };

  if (!isOpen || !updateInfo) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(12px)",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#0d0e15",
          border: "1px solid rgba(229, 9, 20, 0.4)",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(229, 9, 20, 0.2)",
          padding: "28px",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        {/* App Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
          <img
            src="./logo.png"
            alt="Cinema"
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "14px",
              boxShadow: "0 4px 18px rgba(229, 9, 20, 0.5)",
            }}
          />
        </div>

        <div
          style={{
            display: "inline-block",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "#e50914",
            background: "rgba(229, 9, 20, 0.12)",
            border: "1px solid rgba(229, 9, 20, 0.3)",
            padding: "4px 12px",
            borderRadius: "999px",
            marginBottom: "12px",
          }}
        >
          Update Ready
        </div>

        <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px 0" }}>
          Cinema Version {updateInfo.version}
        </h3>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 20px 0", lineHeight: "1.5" }}>
          A new version of Cinema with updated streaming sources and UI enhancements is available.
        </p>

        {/* Progress Bar Container */}
        {isDownloading || isReadyToApply ? (
          <div style={{ marginBottom: "20px", textAlign: "left" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: "6px",
              }}
            >
              <span>{isReadyToApply ? "Ready to Install" : "Downloading Update"}</span>
              <span>{progress}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: isReadyToApply
                    ? "linear-gradient(90deg, #10b981, #059669)"
                    : "linear-gradient(90deg, #e50914, #ff3b30)",
                  borderRadius: "999px",
                  transition: "width 0.25s ease",
                }}
              />
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
              {statusText}
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          {!isDownloading && !isReadyToApply && (
            <button
              onClick={() => {
                sessionStorage.setItem("cinema_dismissed_update", updateInfo?.version || "true");
                setIsOpen(false);
              }}
              style={{
                flex: 1,
                padding: "12px 18px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Later
            </button>
          )}

          <button
            disabled={isDownloading}
            onClick={handleStartUpdate}
            style={{
              flex: 2,
              padding: "12px 20px",
              borderRadius: "12px",
              background: isReadyToApply
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "linear-gradient(135deg, #e50914, #b80710)",
              border: "none",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
              cursor: isDownloading ? "not-allowed" : "pointer",
              boxShadow: isReadyToApply
                ? "0 4px 18px rgba(16, 185, 129, 0.4)"
                : "0 4px 18px rgba(229, 9, 20, 0.4)",
              transition: "all 0.2s ease",
              opacity: isDownloading ? 0.7 : 1,
            }}
          >
            {isReadyToApply ? "Restart & Apply Update" : isDownloading ? "Downloading..." : "Update Now"}
          </button>
        </div>
      </div>
    </div>
  );
};
