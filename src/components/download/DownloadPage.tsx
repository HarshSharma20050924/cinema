import React, { useState, useEffect } from "react";
import { DownloadIcon, GithubIcon } from "../../icons";
import { ShadedHeading } from "../common/ShadedHeading";
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

type TabType = "all" | "streams" | "runner";

export const DownloadPage: React.FC<DownloadPageProps> = () => {
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Fetch latest release dynamically from GitHub API
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

  // Dedicated matchers ensuring complete separation across all platforms
  const isAppWindowsSetup = (name: string) =>
    /setup/i.test(name) && !/runner/i.test(name) && name.endsWith(".exe");

  const isAppWindowsPortable = (name: string) =>
    !/setup/i.test(name) && !/runner/i.test(name) && /^cinema/i.test(name) && name.endsWith(".exe");

  const isAppLinuxDeb = (name: string) =>
    !/runner/i.test(name) && name.endsWith(".deb");

  const isAppLinuxAppImage = (name: string) =>
    !/runner/i.test(name) && /^cinema/i.test(name) && name.endsWith(".AppImage");

  const isAppMacDmg = (name: string) =>
    !/runner/i.test(name) && /^cinema/i.test(name) && name.endsWith(".dmg");

  // Android APK matchers
  const isAppAndroidVega = (name: string) =>
    /vega/i.test(name) || /cinema-universal/i.test(name);

  const isAppAndroidCinema = (name: string) =>
    !/runner/i.test(name) && !/vega/i.test(name) && !/web/i.test(name) && name.endsWith(".apk");

  const isRunnerAndroidApk = (name: string) =>
    /runner.*\.apk$/i.test(name);

  // Desktop Runner matchers
  const isRunnerWindowsSetup = (name: string) =>
    /runner/i.test(name) && /setup/i.test(name) && name.endsWith(".exe");

  const isRunnerWindowsPortable = (name: string) =>
    /runner/i.test(name) && !/setup/i.test(name) && name.endsWith(".exe");

  const isRunnerLinuxDeb = (name: string) =>
    /runner/i.test(name) && name.endsWith(".deb");

  const isRunnerLinuxAppImage = (name: string) =>
    /runner/i.test(name) && (name.endsWith(".AppImage") || name.endsWith(".appimage"));

  const isRunnerMacDmg = (name: string) =>
    /runner/i.test(name) && name.endsWith(".dmg");

  const getAsset = (predicate: (name: string) => boolean) => {
    if (!release?.assets) return null;
    return release.assets.find((a) => predicate(a.name)) || null;
  };

  const downloadFile = (fallbackName: string, predicate: (name: string) => boolean) => {
    const matched = getAsset(predicate);
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
  const appWindowsSetup = getAsset(isAppWindowsSetup);
  const appWindowsPortable = getAsset(isAppWindowsPortable);
  const appAndroidVega = getAsset(isAppAndroidVega);
  const appAndroidCinema = getAsset(isAppAndroidCinema);
  const appLinuxDeb = getAsset(isAppLinuxDeb);
  const appLinuxAppImage = getAsset(isAppLinuxAppImage);
  const appMacDmg = getAsset(isAppMacDmg);

  // Match Cinema Runner App files
  const runnerWindowsSetup = getAsset(isRunnerWindowsSetup);
  const runnerWindowsPortable = getAsset(isRunnerWindowsPortable);
  const runnerAndroidApk = getAsset(isRunnerAndroidApk);
  const runnerLinuxDeb = getAsset(isRunnerLinuxDeb);
  const runnerLinuxAppImage = getAsset(isRunnerLinuxAppImage);
  const runnerMacDmg = getAsset(isRunnerMacDmg);

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
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        {/* Header Title Area */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "#888888" }}>
              Version {currentVersion}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0 0 10px 0" }}>
            <div
              style={{
                width: "4.5px",
                height: "34px",
                backgroundColor: "#e50914",
                borderRadius: "3px",
              }}
            />
            <ShadedHeading
              text="Download Cinema"
              tag="h1"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            />
          </div>

          <p style={{ fontSize: "15px", color: "#a3a3a3", margin: "0 0 24px 0", maxWidth: "680px" }}>
            Select your platform below to download Cinema App or Cinema Runner helper.
          </p>

          {/* Clean Curvy Tab Filter Switcher */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#111114",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "5px",
              borderRadius: "30px",
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "all", label: "All Downloads" },
              { id: "streams", label: "Cinema App" },
              { id: "runner", label: "Cinema Runner" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "24px",
                  border: "none",
                  background: activeTab === tab.id ? "#e50914" : "transparent",
                  color: activeTab === tab.id ? "#ffffff" : "#a3a3a3",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: CINEMA APP (Windows, Android, Linux, macOS)                    */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "streams") && (
          <div style={{ marginBottom: "52px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <img
                src="/logo.png"
                alt="Cinema App"
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "14px",
                  objectFit: "cover",
                  boxShadow: "0 4px 14px rgba(229, 9, 20, 0.35)",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "4px",
                    height: "22px",
                    backgroundColor: "#e50914",
                    borderRadius: "2px",
                  }}
                />
                <div>
                  <ShadedHeading
                    text="Cinema App"
                    tag="h2"
                    style={{ fontSize: "21px", fontWeight: 800 }}
                  />
                  <div style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>
                    Official applications for desktop and mobile.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Card 1: Windows Desktop */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                    Windows Desktop
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Windows 10 and 11
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`Cinema.Setup.${currentVersion}.exe`, isAppWindowsSetup)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Setup Installer (.exe)</span>
                    </div>
                    {appWindowsSetup?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(appWindowsSetup.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema.${currentVersion}.exe`, isAppWindowsPortable)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Portable (.exe)</span>
                    </div>
                    {appWindowsPortable?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appWindowsPortable.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Card 2: Android */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                    Android
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Phones, Tablets and Android TV
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile("Cinema-Vega.apk", isAppAndroidVega)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Cinema Vega APK</span>
                    </div>
                    {appAndroidVega?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(appAndroidVega.size)}</span>
                    ) : (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>28.5 MB</span>
                    )}
                  </button>

                  <button
                    onClick={() => downloadFile("Cinema.apk", isAppAndroidCinema)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Cinema APK</span>
                    </div>
                    {appAndroidCinema?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appAndroidCinema.size)}</span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>29.7 MB</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 3: Linux Desktop */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                    Linux Desktop
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Ubuntu, Debian, Mint & all distros
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`cinema-desktop_${currentVersion}_amd64.deb`, isAppLinuxDeb)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Debian Package (.deb)</span>
                    </div>
                    {appLinuxDeb?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(appLinuxDeb.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema-${currentVersion}.AppImage`, isAppLinuxAppImage)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Universal AppImage</span>
                    </div>
                    {appLinuxAppImage?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appLinuxAppImage.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Card 4: macOS Desktop */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                    macOS Desktop
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Apple Silicon and Intel
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`Cinema-${currentVersion}.dmg`, isAppMacDmg)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Apple Silicon (.dmg)</span>
                    </div>
                    {appMacDmg?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(appMacDmg.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema-${currentVersion}.dmg`, isAppMacDmg)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
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

        {/* ========================================================================= */}
        {/* SECTION 2: CINEMA RUNNER (Windows, Android, Linux, macOS)                 */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "runner") && (
          <div style={{ marginBottom: "52px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <img
                src="/runner-icon.png"
                alt="Cinema Runner"
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "14px",
                  objectFit: "cover",
                  boxShadow: "0 4px 14px rgba(255, 255, 255, 0.15)",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "4px",
                    height: "22px",
                    backgroundColor: "#e50914",
                    borderRadius: "2px",
                  }}
                />
                <div>
                  <ShadedHeading
                    text="Cinema Runner"
                    tag="h2"
                    style={{ fontSize: "21px", fontWeight: 800 }}
                  />
                  <div style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>
                    Background scraping engine and proxy helper daemon.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Card 1: Windows Runner */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                    Windows Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Windows 10 and 11
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`Cinema-Runner.Setup.${currentVersion}.exe`, isRunnerWindowsSetup)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner Setup (.exe)</span>
                    </div>
                    {runnerWindowsSetup?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(runnerWindowsSetup.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema-Runner.${currentVersion}.exe`, isRunnerWindowsPortable)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner Portable (.exe)</span>
                    </div>
                    {runnerWindowsPortable?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerWindowsPortable.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Card 2: Android Runner */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                    Android Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Runs in the background on your Android phone
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile("Cinema-Runner.apk", isRunnerAndroidApk)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Download Runner APK</span>
                    </div>
                    {runnerAndroidApk?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(runnerAndroidApk.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Card 3: Linux Runner */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                    Linux Runner
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`cinema-runner_${currentVersion}_amd64.deb`, isRunnerLinuxDeb)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner Debian (.deb)</span>
                    </div>
                    {runnerLinuxDeb?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(runnerLinuxDeb.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema-Runner-${currentVersion}.AppImage`, isRunnerLinuxAppImage)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner AppImage</span>
                    </div>
                    {runnerLinuxAppImage?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerLinuxAppImage.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Card 4: macOS Runner */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", marginBottom: "3px" }}>
                    macOS Runner
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Apple Silicon and Intel
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => downloadFile(`Cinema-Runner-${currentVersion}.dmg`, isRunnerMacDmg)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner .dmg</span>
                    </div>
                    {runnerMacDmg?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(runnerMacDmg.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile(`Cinema-Runner-${currentVersion}.dmg`, isRunnerMacDmg)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#ffffff",
                      padding: "11px 14px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <DownloadIcon size={14} />
                      <span>Direct .dmg Download</span>
                    </div>
                    {runnerMacDmg?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerMacDmg.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: ALL FILES DIRECT FROM GITHUB RELEASE                           */}
        {/* ========================================================================= */}
        <div
          style={{
            background: "#0a0a0c",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: release?.assets && release.assets.length > 0 ? "18px" : "0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "4px",
                  height: "22px",
                  backgroundColor: "#e50914",
                  borderRadius: "2px",
                }}
              />
              <div>
                <ShadedHeading
                  text="All Release Files"
                  tag="h3"
                  style={{ fontSize: "18px", fontWeight: 800 }}
                />
                <p style={{ fontSize: "12px", color: "#777777", margin: "2px 0 0 0" }}>
                  Every individual file published with GitHub Release {release?.tagName || `v${currentVersion}`}.
                </p>
              </div>
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
                padding: "8px 16px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.2s ease",
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
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "12px",
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
