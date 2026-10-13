import React, { useState, useEffect } from "react";
import { DownloadIcon, GithubIcon, GlobeIcon, CopyIcon, CheckIcon, ExternalLinkIcon } from "../../icons";
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

type TabType = "all" | "desktop" | "android" | "runner" | "web";

export const DownloadPage: React.FC<DownloadPageProps> = () => {
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [copiedUrl, setCopiedUrl] = useState(false);

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
    !/runner/i.test(name) &&
    !/web/i.test(name) &&
    (name.toLowerCase() === "cinema.apk" ||
      /vega.*\.apk$/i.test(name) ||
      /cinema-universal.*\.apk$/i.test(name));

  const isAppAndroidWeb = (name: string) =>
    /cinema-web.*\.apk$/i.test(name);

  const isRunnerAndroidApk = (name: string) =>
    /runner.*\.apk$/i.test(name);

  // Desktop Runner matchers
  const isRunnerWindowsSetup = (name: string) =>
    /runner/i.test(name) && /setup/i.test(name) && name.endsWith(".exe");

  const isRunnerWindowsPortable = (name: string) =>
    /runner/i.test(name) && !/setup/i.test(name) && name.endsWith(".exe");

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

  const handleCopyWebUrl = () => {
    const webUrl = "https://cinema-dwh.pages.dev";
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(webUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const currentVersion = release?.version || packageJson.version || "4.1.0";

  // Match Cinema Desktop App files
  const appWindowsSetup = getAsset(isAppWindowsSetup);
  const appWindowsPortable = getAsset(isAppWindowsPortable);
  const appLinuxDeb = getAsset(isAppLinuxDeb);
  const appLinuxAppImage = getAsset(isAppLinuxAppImage);
  const appMacDmg = getAsset(isAppMacDmg);

  // Match Android APK files
  const appAndroidVega = getAsset(isAppAndroidVega);
  const appAndroidWeb = getAsset(isAppAndroidWeb);
  const runnerAndroidApk = getAsset(isRunnerAndroidApk);

  // Match Desktop Runner App files
  const runnerWindowsSetup = getAsset(isRunnerWindowsSetup);
  const runnerWindowsPortable = getAsset(isRunnerWindowsPortable);
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
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#e50914",
                background: "rgba(229, 9, 20, 0.12)",
                padding: "3px 10px",
                borderRadius: "14px",
                border: "1px solid rgba(229, 9, 20, 0.25)",
              }}
            >
              Cinema Downloads
            </span>
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
            Select your platform below to download Cinema Desktop, standalone Android APKs, background Runner helper, or access Cinema Web.
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
              { id: "desktop", label: "Cinema Desktop" },
              { id: "android", label: "Android APKs" },
              { id: "runner", label: "Runner Apps" },
              { id: "web", label: "Web Version" },
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
        {/* SECTION 1: CINEMA DESKTOP (Windows, Linux, macOS)                         */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "desktop") && (
          <div style={{ marginBottom: "52px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <img
                src="/logo.png"
                alt="Cinema Desktop"
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
                    text="Cinema Desktop"
                    tag="h2"
                    style={{ fontSize: "21px", fontWeight: 800 }}
                  />
                  <div style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>
                    Full-featured desktop streaming player with direct VLC integration.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Card 1: Cinema Desktop for Windows */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      Windows Desktop
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#e50914",
                        background: "rgba(229, 9, 20, 0.12)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      Desktop Player
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Windows 10 and 11 (64-bit)
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <button
                    onClick={() => downloadFile(`Cinema.Setup.${currentVersion}.exe`, isAppWindowsSetup)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Portable Executable (.exe)</span>
                    </div>
                    {appWindowsPortable?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appWindowsPortable.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Card 2: Cinema Desktop for Linux */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      Linux Desktop
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#e50914",
                        background: "rgba(229, 9, 20, 0.12)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      Desktop Player
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Ubuntu, Debian, Fedora, Arch & all distros
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <button
                    onClick={() => downloadFile(`cinema-desktop_${currentVersion}_amd64.deb`, isAppLinuxDeb)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Universal AppImage</span>
                    </div>
                    {appLinuxAppImage?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appLinuxAppImage.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Card 3: Cinema Desktop for macOS */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      macOS Desktop
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#e50914",
                        background: "rgba(229, 9, 20, 0.12)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      Desktop Player
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Apple Silicon (M1/M2/M3) and Intel Mac
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <button
                    onClick={() => downloadFile(`Cinema-${currentVersion}-arm64.dmg`, isAppMacDmg)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Apple Silicon DMG (.dmg)</span>
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
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Universal / Intel DMG</span>
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
        {/* SECTION 2: ANDROID APKS (Completely Separate Cards)                      */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "android") && (
          <div style={{ marginBottom: "52px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <img
                src="/logo.png"
                alt="Cinema Android"
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
                    text="Android APKs"
                    tag="h2"
                    style={{ fontSize: "21px", fontWeight: 800 }}
                  />
                  <div style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>
                    Dedicated Android APK files separated by architecture and feature set.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Card 1: Cinema Alternative Client APK (Standalone APK) */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(229, 9, 20, 0.25)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(229, 9, 20, 0.15)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      Cinema Alternative APK
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#e50914",
                        background: "rgba(229, 9, 20, 0.15)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        border: "1px solid rgba(229, 9, 20, 0.3)",
                      }}
                    >
                      Native Player
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888", lineHeight: "1.4" }}>
                    Native high-performance Android player with hardware acceleration and offline downloading.
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "auto" }}>
                  <button
                    onClick={() => downloadFile("Cinema.apk", isAppAndroidVega)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#e50914",
                      border: "none",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Download Alternative APK</span>
                    </div>
                    {appAndroidVega?.size ? (
                      <span style={{ fontSize: "11px", opacity: 0.9 }}>{formatSize(appAndroidVega.size)}</span>
                    ) : null}
                  </button>

                  <div style={{ fontSize: "11px", color: "#666666", textAlign: "center" }}>
                    Phones, Tablets and Android TV
                  </div>
                </div>
              </div>

              {/* Card 2: Cinema Web APK (~3.2 MB WebView Wrapper) */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      Cinema Web APK
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#a3a3a3",
                        background: "rgba(255, 255, 255, 0.06)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      Lightweight (~3 MB)
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888", lineHeight: "1.4" }}>
                    Compact Android WebView client connecting directly to Cinema Web with fast cloud updates.
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "auto" }}>
                  <button
                    onClick={() => downloadFile("Cinema-Web.apk", isAppAndroidWeb)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Download Web APK</span>
                    </div>
                    {appAndroidWeb?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(appAndroidWeb.size)}</span>
                    ) : null}
                  </button>

                  <div style={{ fontSize: "11px", color: "#666666", textAlign: "center" }}>
                    Connects directly to cinema-dwh.pages.dev
                  </div>
                </div>
              </div>

              {/* Card 3: Cinema Runner APK (Android Background Scraper) */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      Cinema Runner APK
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#a3a3a3",
                        background: "rgba(255, 255, 255, 0.06)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      Background Helper
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888", lineHeight: "1.4" }}>
                    Dedicated background Node runtime and scraping proxy running locally on Android.
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "auto" }}>
                  <button
                    onClick={() => downloadFile("Cinema-Runner.apk", isRunnerAndroidApk)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Download Runner APK</span>
                    </div>
                    {runnerAndroidApk?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerAndroidApk.size)}</span>
                    ) : null}
                  </button>

                  <div style={{ fontSize: "11px", color: "#666666", textAlign: "center" }}>
                    Background proxy for mobile devices
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: CINEMA RUNNER (Windows, Linux, macOS)                          */}
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
                    Background local scraping engine and proxy helper daemon for desktop systems.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Card 1: Windows Runner */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      Windows Runner
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#888888",
                        background: "rgba(255, 255, 255, 0.06)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      Background Daemon
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Windows 10 & 11 background provider scraping engine
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner.Setup.2.2.0.exe", isRunnerWindowsSetup)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner Setup (.exe)</span>
                    </div>
                    {runnerWindowsSetup?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerWindowsSetup.size)}</span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner.2.2.0.exe", isRunnerWindowsPortable)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#111114",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#a3a3a3",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner Portable (.exe)</span>
                    </div>
                    {runnerWindowsPortable?.size ? (
                      <span style={{ fontSize: "11px", color: "#777777" }}>{formatSize(runnerWindowsPortable.size)}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Card 2: Linux Runner */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      Linux Runner
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#888888",
                        background: "rgba(255, 255, 255, 0.06)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      Background Daemon
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Servers and headless Linux distributions
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner-2.2.0.AppImage", isRunnerLinuxAppImage)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner AppImage</span>
                    </div>
                    {runnerLinuxAppImage?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerLinuxAppImage.size)}</span>
                    ) : null}
                  </button>

                  <div style={{ fontSize: "11px", color: "#666666", textAlign: "center" }}>
                    Runs headless via terminal or desktop
                  </div>
                </div>
              </div>

              {/* Card 3: macOS Runner */}
              <div
                style={{
                  background: "linear-gradient(180deg, #131318 0%, #0c0c0f 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff" }}>
                      macOS Runner
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#888888",
                        background: "rgba(255, 255, 255, 0.06)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      Background Daemon
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888888" }}>
                    Apple Silicon (M1/M2/M3) and Intel Mac
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <button
                    onClick={() => downloadFile("Cinema.Node.Runner-2.2.0-arm64.dmg", isRunnerMacDmg)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <DownloadIcon size={14} />
                      <span>Runner .dmg</span>
                    </div>
                    {runnerMacDmg?.size ? (
                      <span style={{ fontSize: "11px", color: "#a3a3a3" }}>{formatSize(runnerMacDmg.size)}</span>
                    ) : null}
                  </button>

                  <div style={{ fontSize: "11px", color: "#666666", textAlign: "center" }}>
                    Background proxy helper for macOS
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: WEBSITE / WEB VERSION (Completely Separate)                    */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "web") && (
          <div style={{ marginBottom: "52px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #e50914 0%, #ff2a3a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(229, 9, 20, 0.35)",
                }}
              >
                <GlobeIcon size={22} color="#ffffff" />
              </div>
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
                    text="Cinema Web"
                    tag="h2"
                    style={{ fontSize: "21px", fontWeight: 800 }}
                  />
                  <div style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>
                    Instant streaming directly inside any modern web browser without installation.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(180deg, #15151c 0%, #0d0d12 100%)",
                border: "1px solid rgba(229, 9, 20, 0.3)",
                borderRadius: "24px",
                padding: "32px",
                boxShadow: "0 12px 32px rgba(229, 9, 20, 0.12)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff" }}>
                      Official Web Application
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#e50914",
                        background: "rgba(229, 9, 20, 0.12)",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        border: "1px solid rgba(229, 9, 20, 0.25)",
                      }}
                    >
                      Zero Installation Required
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#a3a3a3",
                        background: "rgba(255, 255, 255, 0.05)",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      PWA Supported
                    </span>
                  </div>

                  <p style={{ fontSize: "14px", color: "#a3a3a3", margin: 0, maxWidth: "780px", lineHeight: "1.6" }}>
                    Stream movies and series directly in your web browser on any device (PC, Mac, Linux, iPhone, Android, or Smart TV). No download, installation, or setup required. Always updated with the latest releases and features.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href="https://cinema-dwh.pages.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#e50914",
                      color: "#ffffff",
                      padding: "13px 24px",
                      borderRadius: "14px",
                      fontSize: "13px",
                      fontWeight: 800,
                      textDecoration: "none",
                      boxShadow: "0 6px 18px rgba(229, 9, 20, 0.35)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <span>Open Cinema Web</span>
                    <ExternalLinkIcon size={15} />
                  </a>

                  <button
                    onClick={handleCopyWebUrl}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#18181c",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      padding: "13px 20px",
                      borderRadius: "14px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {copiedUrl ? <CheckIcon size={15} color="#e50914" /> : <CopyIcon size={15} />}
                    <span>{copiedUrl ? "URL Copied" : "Copy Web URL"}</span>
                  </button>

                  <span style={{ fontSize: "13px", color: "#666666", paddingLeft: "4px" }}>
                    cinema-dwh.pages.dev
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: ALL FILES DIRECT FROM GITHUB RELEASE                           */}
        {/* ========================================================================= */}
        <div
          style={{
            background: "#0a0a0c",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "22px",
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
