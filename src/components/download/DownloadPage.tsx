import React, { useState, useEffect } from "react";
import {
  DownloadIcon,
  GithubIcon,
  ServerIcon,
  FilmIcon,
  CheckIcon,
} from "../../icons";
import packageJson from "../../../package.json";

interface ReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
}

interface ReleaseData {
  tagName: string;
  version: string;
  publishedAt: string;
  htmlUrl: string;
  assets: ReleaseAsset[];
}

interface DownloadPageProps {
  onBack: () => void;
}

export const DownloadPage: React.FC<DownloadPageProps> = () => {
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "app" | "runner">("all");

  // Fetch release dynamically from GitHub API
  useEffect(() => {
    let isMounted = true;
    const fetchLatestRelease = async () => {
      try {
        const res = await fetch(
          "https://api.github.com/repos/HarshSharma20050924/cinema/releases/latest",
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            const rawVer = (data.tag_name || packageJson.version || "").replace(/^v/i, "");
            setRelease({
              tagName: data.tag_name || `v${rawVer}`,
              version: rawVer,
              publishedAt: data.published_at
                ? new Date(data.published_at).toLocaleDateString()
                : "",
              htmlUrl: data.html_url || "https://github.com/HarshSharma20050924/cinema/releases/latest",
              assets: Array.isArray(data.assets)
                ? data.assets.map((a: any) => ({
                    name: a.name || "",
                    size: a.size || 0,
                    downloadUrl: a.browser_download_url || "",
                  }))
                : [],
            });
            return;
          }
        }
      } catch (_) {}

      if (isMounted) {
        const fallbackVer = (packageJson.version || "4.1.0").replace(/^v/i, "");
        setRelease({
          tagName: `v${fallbackVer}`,
          version: fallbackVer,
          publishedAt: "Latest",
          htmlUrl: "https://github.com/HarshSharma20050924/cinema/releases/latest",
          assets: [],
        });
      }
    };

    fetchLatestRelease();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const findMatchingAsset = (pattern: RegExp) => {
    if (!release?.assets) return null;
    return release.assets.find((a) => pattern.test(a.name));
  };

  const resolveDownloadUrl = (fileNameFallback: string, pattern: RegExp): string => {
    const match = findMatchingAsset(pattern);
    if (match && match.downloadUrl) return match.downloadUrl;
    return `https://github.com/HarshSharma20050924/cinema/releases/latest/download/${fileNameFallback}`;
  };

  const getAssetSize = (pattern: RegExp): string => {
    const match = findMatchingAsset(pattern);
    if (match && match.size > 0) return formatSize(match.size);
    return "";
  };

  const handleDirectDownload = (fileNameFallback: string, pattern: RegExp) => {
    const url = resolveDownloadUrl(fileNameFallback, pattern);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileNameFallback);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const currentVersion = release?.version || packageJson.version || "4.1.0";

  // Dynamic asset mapping
  const apkAppUrl = resolveDownloadUrl("Cinema-Web.apk", /cinema.*web.*\.apk$|^cinema.*\.apk$/i);
  const apkAppSize = getAssetSize(/cinema.*web.*\.apk$|^cinema.*\.apk$/i);

  const apkRunnerUrl = resolveDownloadUrl("Cinema-Runner.apk", /runner.*\.apk$/i);
  const apkRunnerSize = getAssetSize(/runner.*\.apk$/i);

  const debAppUrl = resolveDownloadUrl(`cinema-desktop_${currentVersion}_amd64.deb`, /cinema-desktop.*\.deb$/i);
  const debAppSize = getAssetSize(/cinema-desktop.*\.deb$/i);

  const appImageAppUrl = resolveDownloadUrl(`Cinema-${currentVersion}.AppImage`, /^cinema-[0-9].*\.appimage$/i);
  const appImageAppSize = getAssetSize(/^cinema-[0-9].*\.appimage$/i);

  const exeAppUrl = resolveDownloadUrl(`Cinema.Setup.${currentVersion}.exe`, /^cinema.*setup.*\.exe$|^cinema\.[0-9].*\.exe$/i);
  const exeAppSize = getAssetSize(/^cinema.*setup.*\.exe$|^cinema\.[0-9].*\.exe$/i);

  const dmgAppUrl = resolveDownloadUrl(`Cinema-${currentVersion}-arm64.dmg`, /^cinema-[0-9].*\.dmg$/i);
  const dmgAppSize = getAssetSize(/^cinema-[0-9].*\.dmg$/i);

  const runnerAppImageUrl = resolveDownloadUrl("Cinema.Node.Runner.AppImage", /runner.*\.appimage$/i);
  const runnerAppImageSize = getAssetSize(/runner.*\.appimage$/i);

  const runnerExeUrl = resolveDownloadUrl("Cinema.Node.Runner.Setup.exe", /runner.*\.exe$/i);
  const runnerExeSize = getAssetSize(/runner.*\.exe$/i);

  const runnerDmgUrl = resolveDownloadUrl("Cinema.Node.Runner.dmg", /runner.*\.dmg$/i);
  const runnerDmgSize = getAssetSize(/runner.*\.dmg$/i);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#ffffff",
        paddingTop: "90px",
        paddingBottom: "100px",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "360px",
          background: "radial-gradient(circle, rgba(229, 9, 20, 0.15) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header Title Section */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#e50914",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Releases & Downloads
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "#737373",
                fontWeight: 600,
              }}
            >
              • v{currentVersion}
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(30px, 4vw, 44px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 12px 0",
              color: "#ffffff",
            }}
          >
            Download Cinema
          </h1>

          <p
            style={{
              fontSize: "15px",
              color: "#a3a3a3",
              margin: "0 0 24px 0",
              maxWidth: "650px",
              lineHeight: 1.6,
            }}
          >
            Direct release binaries for streaming, local playback, and independent background nodes.
          </p>

          {/* Clean Section Navigation Filter */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#0d0d10",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "4px",
              borderRadius: "12px",
            }}
          >
            <button
              onClick={() => setActiveTab("all")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "all" ? "#e50914" : "transparent",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              All Releases
            </button>

            <button
              onClick={() => setActiveTab("app")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "app" ? "#e50914" : "transparent",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Cinema Application
            </button>

            <button
              onClick={() => setActiveTab("runner")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                background: activeTab === "runner" ? "#e50914" : "transparent",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Runner App
            </button>
          </div>
        </div>

        {/* SECTION 1: CINEMA APPLICATION */}
        {(activeTab === "all" || activeTab === "app") && (
          <div style={{ marginBottom: "60px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(229, 9, 20, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#e50914",
                }}
              >
                <FilmIcon size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
                  Cinema Application
                </h2>
                <span style={{ fontSize: "13px", color: "#737373" }}>
                  Client player for Android phones, TV boxes, Linux, Windows, and macOS.
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Android Client */}
              <div
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                    Android
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8a8a", marginBottom: "16px" }}>
                    Universal APK • Phones, Tablets & Android TV
                  </div>
                  <div style={{ fontSize: "13px", color: "#b3b3b3", lineHeight: 1.5, marginBottom: "20px" }}>
                    Native media player with subtitles, provider extensions, offline downloads, and external player support.
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
                    <span style={{ color: "#737373" }}>Cinema-Web.apk</span>
                    {apkAppSize && <span style={{ color: "#10b981", fontWeight: 600 }}>{apkAppSize}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleDirectDownload("Cinema-Web.apk", /cinema.*web.*\.apk$|^cinema.*\.apk$/i)}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#e50914",
                        border: "none",
                        color: "#ffffff",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f40612")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#e50914")}
                    >
                      <DownloadIcon size={15} />
                      <span>Download APK</span>
                    </button>

                    <button
                      onClick={() => handleCopy("apkApp", apkAppUrl)}
                      title="Copy Direct Link"
                      style={{
                        padding: "11px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: copiedLink === "apkApp" ? "#10b981" : "#a3a3a3",
                        cursor: "pointer",
                      }}
                    >
                      {copiedLink === "apkApp" ? <CheckIcon size={15} /> : <DownloadIcon size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Linux Client */}
              <div
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                    Linux
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8a8a", marginBottom: "16px" }}>
                    Debian, Ubuntu, Mint & Universal AppImage
                  </div>
                  <div style={{ fontSize: "13px", color: "#b3b3b3", lineHeight: 1.5, marginBottom: "20px" }}>
                    Desktop client with hardware GPU rendering, tray support, and multi-thread download management.
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
                    <span style={{ color: "#737373" }}>64-bit AMD64</span>
                    {debAppSize && <span style={{ color: "#10b981", fontWeight: 600 }}>{debAppSize}</span>}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <button
                      onClick={() => handleDirectDownload(`cinema-desktop_${currentVersion}_amd64.deb`, /cinema-desktop.*\.deb$/i)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#e50914",
                        border: "none",
                        color: "#ffffff",
                        padding: "11px 12px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <DownloadIcon size={14} />
                      <span>.deb</span>
                    </button>

                    <button
                      onClick={() => handleDirectDownload(`Cinema-${currentVersion}.AppImage`, /^cinema-[0-9].*\.appimage$/i)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#ffffff",
                        padding: "11px 12px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <DownloadIcon size={14} />
                      <span>.AppImage</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Windows Client */}
              <div
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                    Windows
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8a8a", marginBottom: "16px" }}>
                    Windows 10 / 11 (64-bit)
                  </div>
                  <div style={{ fontSize: "13px", color: "#b3b3b3", lineHeight: 1.5, marginBottom: "20px" }}>
                    Desktop executable installer with automatic update checking and high-speed streaming engine.
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
                    <span style={{ color: "#737373" }}>Installer (.exe)</span>
                    {exeAppSize && <span style={{ color: "#10b981", fontWeight: 600 }}>{exeAppSize}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleDirectDownload(`Cinema.Setup.${currentVersion}.exe`, /^cinema.*setup.*\.exe$|^cinema\.[0-9].*\.exe$/i)}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#e50914",
                        border: "none",
                        color: "#ffffff",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <DownloadIcon size={15} />
                      <span>Download .exe</span>
                    </button>

                    <button
                      onClick={() => handleCopy("exeApp", exeAppUrl)}
                      title="Copy Direct Link"
                      style={{
                        padding: "11px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: copiedLink === "exeApp" ? "#10b981" : "#a3a3a3",
                        cursor: "pointer",
                      }}
                    >
                      {copiedLink === "exeApp" ? <CheckIcon size={15} /> : <DownloadIcon size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* macOS Client */}
              <div
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                    macOS
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8a8a", marginBottom: "16px" }}>
                    Apple Silicon & Intel (macOS 11+)
                  </div>
                  <div style={{ fontSize: "13px", color: "#b3b3b3", lineHeight: 1.5, marginBottom: "20px" }}>
                    Native Metal hardware decoding, Picture-in-Picture playback, and macOS menu integration.
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
                    <span style={{ color: "#737373" }}>DMG Image</span>
                    {dmgAppSize && <span style={{ color: "#10b981", fontWeight: 600 }}>{dmgAppSize}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleDirectDownload(`Cinema-${currentVersion}-arm64.dmg`, /^cinema-[0-9].*\.dmg$/i)}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#e50914",
                        border: "none",
                        color: "#ffffff",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <DownloadIcon size={15} />
                      <span>Download .dmg</span>
                    </button>

                    <button
                      onClick={() => handleCopy("dmgApp", dmgAppUrl)}
                      title="Copy Direct Link"
                      style={{
                        padding: "11px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: copiedLink === "dmgApp" ? "#10b981" : "#a3a3a3",
                        cursor: "pointer",
                      }}
                    >
                      {copiedLink === "dmgApp" ? <CheckIcon size={15} /> : <DownloadIcon size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: RUNNER APP (SEPARATE THEME & CATEGORY) */}
        {(activeTab === "all" || activeTab === "runner") && (
          <div style={{ marginBottom: "60px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                }}
              >
                <ServerIcon size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
                  Cinema Runner
                </h2>
                <span style={{ fontSize: "13px", color: "#737373" }}>
                  Autonomous daemon for scrapers, background extraction, and local tunnel coordination.
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Android Runner APK */}
              <div
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                    Android Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8a8a", marginBottom: "16px" }}>
                    ARM64 Android 8.0+ Daemon
                  </div>
                  <div style={{ fontSize: "13px", color: "#b3b3b3", lineHeight: 1.5, marginBottom: "20px" }}>
                    Runs node scrapers and coordinator tunnels as a persistent foreground service on mobile hardware.
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
                    <span style={{ color: "#737373" }}>Cinema-Runner.apk</span>
                    {apkRunnerSize && <span style={{ color: "#10b981", fontWeight: 600 }}>{apkRunnerSize}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleDirectDownload("Cinema-Runner.apk", /runner.*\.apk$/i)}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#1f1f23",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)")}
                    >
                      <DownloadIcon size={15} />
                      <span>Download Runner APK</span>
                    </button>

                    <button
                      onClick={() => handleCopy("apkRunner", apkRunnerUrl)}
                      title="Copy Direct Link"
                      style={{
                        padding: "11px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: copiedLink === "apkRunner" ? "#10b981" : "#a3a3a3",
                        cursor: "pointer",
                      }}
                    >
                      {copiedLink === "apkRunner" ? <CheckIcon size={15} /> : <DownloadIcon size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Linux / Server Runner */}
              <div
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                    Linux Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8a8a", marginBottom: "16px" }}>
                    Headless Node Daemon • x64 AMD64
                  </div>
                  <div style={{ fontSize: "13px", color: "#b3b3b3", lineHeight: 1.5, marginBottom: "20px" }}>
                    Universal AppImage and headless executable for servers, NAS, and homelab workstations.
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
                    <span style={{ color: "#737373" }}>AppImage Build</span>
                    {runnerAppImageSize && <span style={{ color: "#10b981", fontWeight: 600 }}>{runnerAppImageSize}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleDirectDownload("Cinema.Node.Runner.AppImage", /runner.*\.appimage$/i)}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#1f1f23",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)")}
                    >
                      <DownloadIcon size={15} />
                      <span>Download AppImage</span>
                    </button>

                    <button
                      onClick={() => handleCopy("runnerAppImage", runnerAppImageUrl)}
                      title="Copy Direct Link"
                      style={{
                        padding: "11px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: copiedLink === "runnerAppImage" ? "#10b981" : "#a3a3a3",
                        cursor: "pointer",
                      }}
                    >
                      {copiedLink === "runnerAppImage" ? <CheckIcon size={15} /> : <DownloadIcon size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Windows Runner */}
              <div
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                    Windows Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8a8a", marginBottom: "16px" }}>
                    Background Service • Windows 10 & 11
                  </div>
                  <div style={{ fontSize: "13px", color: "#b3b3b3", lineHeight: 1.5, marginBottom: "20px" }}>
                    Standalone Windows daemon for background link scraping and proxy host dispatching.
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
                    <span style={{ color: "#737373" }}>Runner Installer (.exe)</span>
                    {runnerExeSize && <span style={{ color: "#10b981", fontWeight: 600 }}>{runnerExeSize}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleDirectDownload("Cinema.Node.Runner.Setup.exe", /runner.*\.exe$/i)}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#1f1f23",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)")}
                    >
                      <DownloadIcon size={15} />
                      <span>Download .exe</span>
                    </button>

                    <button
                      onClick={() => handleCopy("runnerExe", runnerExeUrl)}
                      title="Copy Direct Link"
                      style={{
                        padding: "11px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: copiedLink === "runnerExe" ? "#10b981" : "#a3a3a3",
                        cursor: "pointer",
                      }}
                    >
                      {copiedLink === "runnerExe" ? <CheckIcon size={15} /> : <DownloadIcon size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* macOS Runner */}
              <div
                style={{
                  background: "#0d0d10",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>
                    macOS Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#8a8a8a", marginBottom: "16px" }}>
                    Daemon Image • Apple Silicon & Intel
                  </div>
                  <div style={{ fontSize: "13px", color: "#b3b3b3", lineHeight: 1.5, marginBottom: "20px" }}>
                    macOS daemon binary packaged for automated continuous provider indexing.
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", fontSize: "12px" }}>
                    <span style={{ color: "#737373" }}>Runner DMG</span>
                    {runnerDmgSize && <span style={{ color: "#10b981", fontWeight: 600 }}>{runnerDmgSize}</span>}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleDirectDownload("Cinema.Node.Runner.dmg", /runner.*\.dmg$/i)}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#1f1f23",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)")}
                    >
                      <DownloadIcon size={15} />
                      <span>Download .dmg</span>
                    </button>

                    <button
                      onClick={() => handleCopy("runnerDmg", runnerDmgUrl)}
                      title="Copy Direct Link"
                      style={{
                        padding: "11px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: copiedLink === "runnerDmg" ? "#10b981" : "#a3a3a3",
                        cursor: "pointer",
                      }}
                    >
                      {copiedLink === "runnerDmg" ? <CheckIcon size={15} /> : <DownloadIcon size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: DIRECT RELEASE ASSET LINKS & SOURCE REPOSITORY */}
        <div
          style={{
            background: "#0a0a0c",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "18px",
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: release?.assets && release.assets.length > 0 ? "20px" : "0",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", margin: "0 0 4px 0" }}>
                Release Assets Archive
              </h3>
              <p style={{ fontSize: "13px", color: "#8a8a8a", margin: 0 }}>
                Direct URLs to all compiled binary assets for this release tag.
              </p>
            </div>

            <a
              href={release?.htmlUrl || "https://github.com/HarshSharma20050924/cinema/releases"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              <GithubIcon size={16} />
              <span>View on GitHub</span>
            </a>
          </div>

          {release?.assets && release.assets.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                paddingTop: "16px",
              }}
            >
              {release.assets.map((asset) => (
                <div
                  key={asset.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <span style={{ color: "#e50914" }}>•</span>
                    <span style={{ color: "#ffffff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {asset.name}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
                    <span style={{ color: "#737373", fontSize: "12px" }}>
                      {formatSize(asset.size)}
                    </span>
                    <a
                      href={asset.downloadUrl}
                      download={asset.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#e50914",
                        fontSize: "12px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
