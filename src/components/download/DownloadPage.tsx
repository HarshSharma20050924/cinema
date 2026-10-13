import React, { useState, useEffect } from "react";
import { DownloadIcon, GithubIcon, ServerIcon, FilmIcon } from "../../icons";
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
  const [activeTab, setActiveTab] = useState<"all" | "app" | "runner">("all");

  // Always fetch latest release dynamically from GitHub API
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

  const getAsset = (pattern: RegExp) => {
    if (!release?.assets) return null;
    return release.assets.find((a) => pattern.test(a.name)) || null;
  };

  const downloadFile = (fallbackName: string, pattern: RegExp) => {
    const matched = getAsset(pattern);
    const url = matched?.downloadUrl || `https://github.com/HarshSharma20050924/cinema/releases/latest/download/${fallbackName}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", matched?.name || fallbackName);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentVersion = release?.version || packageJson.version || "4.1.0";

  // Match Cinema App files
  const appWindowsSetup = getAsset(/cinema.*setup.*\.exe/i);
  const appWindowsPortable = getAsset(/^cinema\.[0-9].*\.exe$/i);
  const appLinuxDeb = getAsset(/cinema.*\.deb$/i);
  const appLinuxAppImage = getAsset(/^cinema-[0-9].*\.appimage$/i);
  const appMacDmg = getAsset(/^cinema-[0-9].*\.dmg$/i);
  const appAndroidWeb = getAsset(/cinema-web\.apk$/i);
  const appAndroidUniversal = getAsset(/^cinema\.apk$/i);

  // Match Runner App files
  const runnerWindowsSetup = getAsset(/runner.*setup.*\.exe/i);
  const runnerWindowsPortable = getAsset(/runner\.[0-9].*\.exe/i);
  const runnerLinuxAppImage = getAsset(/runner.*\.appimage$/i);
  const runnerMacDmg = getAsset(/runner.*\.dmg$/i);
  const runnerAndroidApk = getAsset(/runner.*\.apk$/i);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "#ffffff",
        paddingTop: "84px",
        paddingBottom: "100px",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        {/* Header Title Area */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#e50914" }}>
              Cinema Downloads
            </span>
            <span style={{ fontSize: "12px", color: "#666666" }}>
              Version {currentVersion}
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: "0 0 10px 0",
              color: "#ffffff",
            }}
          >
            Download Cinema
          </h1>

          <p style={{ fontSize: "15px", color: "#a3a3a3", margin: "0 0 22px 0", maxWidth: "600px" }}>
            Choose your device to download the app.
          </p>

          {/* Clean Tab Switcher */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#111114",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "4px",
              borderRadius: "10px",
            }}
          >
            <button
              onClick={() => setActiveTab("all")}
              style={{
                padding: "8px 18px",
                borderRadius: "7px",
                border: "none",
                background: activeTab === "all" ? "#e50914" : "transparent",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              All Downloads
            </button>

            <button
              onClick={() => setActiveTab("app")}
              style={{
                padding: "8px 18px",
                borderRadius: "7px",
                border: "none",
                background: activeTab === "app" ? "#e50914" : "transparent",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cinema App
            </button>

            <button
              onClick={() => setActiveTab("runner")}
              style={{
                padding: "8px 18px",
                borderRadius: "7px",
                border: "none",
                background: activeTab === "runner" ? "#e50914" : "transparent",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Runner App
            </button>
          </div>
        </div>

        {/* SECTION 1: CINEMA APPLICATION */}
        {(activeTab === "all" || activeTab === "app") && (
          <div style={{ marginBottom: "50px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <img
                src="/logo.png"
                alt="Cinema App"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "9px",
                  objectFit: "cover",
                  boxShadow: "0 2px 10px rgba(229, 9, 20, 0.35)",
                }}
              />
              <div>
                <h2 style={{ fontSize: "19px", fontWeight: 800, margin: 0 }}>
                  Cinema App
                </h2>
                <span style={{ fontSize: "12px", color: "#888888" }}>
                  Watch movies and series on your phone, TV, or computer.
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
                gap: "16px",
              }}
            >
              {/* Windows Card (Shows Setup & Portable) */}
              <div
                style={{
                  background: "#0e0e11",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                    Windows
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Windows 10 and 11
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`Cinema.Setup.${currentVersion}.exe`, /cinema.*setup.*\.exe/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Setup Installer (.exe)</span>
                    </div>
                    {appWindowsSetup?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.85 }}>{formatSize(appWindowsSetup.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema.${currentVersion}.exe`, /^cinema\.[0-9].*\.exe$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Portable (.exe)</span>
                    </div>
                    {appWindowsPortable?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appWindowsPortable.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Android Card (Shows Cinema APK 30MB Primary & Cinema Web APK 3.2MB Secondary) */}
              <div
                style={{
                  background: "#0e0e11",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                    Android
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Phones, Tablets and Android TV
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile("Cinema.apk", /^cinema\.apk$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Cinema APK</span>
                    </div>
                    {appAndroidUniversal?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.85 }}>{formatSize(appAndroidUniversal.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile("Cinema-Web.apk", /cinema-web\.apk$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Cinema Web APK</span>
                    </div>
                    {appAndroidWeb?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appAndroidWeb.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Linux Card (Shows .deb & .AppImage) */}
              <div
                style={{
                  background: "#0e0e11",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                    Linux
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Ubuntu, Debian, Mint & all distros
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`cinema-desktop_${currentVersion}_amd64.deb`, /cinema.*\.deb$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Debian Package (.deb)</span>
                    </div>
                    {appLinuxDeb?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.85 }}>{formatSize(appLinuxDeb.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema-${currentVersion}.AppImage`, /^cinema-[0-9].*\.appimage$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Universal AppImage</span>
                    </div>
                    {appLinuxAppImage?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appLinuxAppImage.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* macOS Card (Shows Apple Silicon & Universal DMG) */}
              <div
                style={{
                  background: "#0e0e11",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                    macOS
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Apple Silicon and Intel
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`Cinema-${currentVersion}-arm64.dmg`, /^cinema-[0-9].*\.dmg$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Apple Silicon (.dmg)</span>
                    </div>
                    {appMacDmg?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.85 }}>{formatSize(appMacDmg.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema-${currentVersion}-arm64.dmg`, /^cinema-[0-9].*\.dmg$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Universal / Intel (.dmg)</span>
                    </div>
                    {appMacDmg?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appMacDmg.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: RUNNER APP */}
        {(activeTab === "all" || activeTab === "runner") && (
          <div style={{ marginBottom: "50px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <img
                src="/runner-icon.png"
                alt="Runner App"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "9px",
                  objectFit: "cover",
                  boxShadow: "0 2px 10px rgba(255, 255, 255, 0.15)",
                }}
              />
              <div>
                <h2 style={{ fontSize: "19px", fontWeight: 800, margin: 0 }}>
                  Runner App
                </h2>
                <span style={{ fontSize: "12px", color: "#888888" }}>
                  A background helper that scrapes links and sources.
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
                gap: "16px",
              }}
            >
              {/* Android Runner */}
              <div
                style={{
                  background: "#0e0e11",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                    Android Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Runs in the background on your Android phone
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile("Cinema-Runner.apk", /runner.*\.apk$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Download Runner APK</span>
                    </div>
                    {runnerAndroidApk?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerAndroidApk.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile("Cinema-Runner.apk", /runner.*\.apk$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#111114",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#a3a3a3",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#a3a3a3";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Direct APK Download</span>
                    </div>
                    {runnerAndroidApk?.size ? (
                      <span style={{ fontSize: "11px", color: "#777777" }}>{formatSize(runnerAndroidApk.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Windows Runner (Shows Setup & Portable) */}
              <div
                style={{
                  background: "#0e0e11",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                    Windows Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Windows 10 and 11
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner.Setup.exe", /runner.*setup.*\.exe/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner Setup (.exe)</span>
                    </div>
                    {runnerWindowsSetup?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerWindowsSetup.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner.exe", /runner\.[0-9].*\.exe/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner Portable (.exe)</span>
                    </div>
                    {runnerWindowsPortable?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerWindowsPortable.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Linux Runner */}
              <div
                style={{
                  background: "#0e0e11",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                    Linux Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Servers and desktops
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner.AppImage", /runner.*\.appimage$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner AppImage</span>
                    </div>
                    {runnerLinuxAppImage?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerLinuxAppImage.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner.AppImage", /runner.*\.appimage$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#111114",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#a3a3a3",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#a3a3a3";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Direct AppImage Download</span>
                    </div>
                    {runnerLinuxAppImage?.size ? (
                      <span style={{ fontSize: "11px", color: "#777777" }}>{formatSize(runnerLinuxAppImage.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* macOS Runner */}
              <div
                style={{
                  background: "#0e0e11",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                    macOS Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Apple Silicon and Intel
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner.dmg", /runner.*\.dmg$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#e50914")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner .dmg</span>
                    </div>
                    {runnerMacDmg?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerMacDmg.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner.dmg", /runner.*\.dmg$/i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#111114",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#a3a3a3",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#a3a3a3";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DownloadIcon size={14} />
                      <span>Direct .dmg Download</span>
                    </div>
                    {runnerMacDmg?.size ? (
                      <span style={{ fontSize: "11px", color: "#777777" }}>{formatSize(runnerMacDmg.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: ALL FILES LIST FROM GITHUB */}
        <div
          style={{
            background: "#0a0a0c",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "22px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: release?.assets && release.assets.length > 0 ? "16px" : "0",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", margin: "0 0 2px 0" }}>
                All Release Files
              </h3>
              <p style={{ fontSize: "12px", color: "#777777", margin: 0 }}>
                Every file published with the latest release.
              </p>
            </div>

            <a
              href={release?.htmlUrl || "https://github.com/HarshSharma20050924/cinema/releases/latest"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <GithubIcon size={15} />
              <span>GitHub Release</span>
            </a>
          </div>

          {release?.assets && release.assets.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                paddingTop: "14px",
              }}
            >
              {release.assets.map((asset) => (
                <div
                  key={asset.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#ffffff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {asset.name}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                    <span style={{ color: "#777777", fontSize: "12px" }}>
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
