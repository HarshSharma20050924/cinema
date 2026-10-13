import React, { useState, useEffect } from "react";
import {
  DownloadIcon,
  GithubIcon,
  ServerIcon,
  FilmIcon,
  ArrowLeftIcon,
  CheckIcon,
} from "../../icons";
import packageJson from "../../../package.json";

interface DownloadAsset {
  name: string;
  size: number;
  downloadUrl: string;
}

interface ReleaseData {
  tagName: string;
  version: string;
  publishedAt: string;
  htmlUrl: string;
  assets: DownloadAsset[];
}

interface DownloadPageProps {
  onBack: () => void;
}

export const DownloadPage: React.FC<DownloadPageProps> = ({ onBack }) => {
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detectedOs, setDetectedOs] = useState<string>("Android");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Auto-detect visitor operating system
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android")) {
      setDetectedOs("Android");
    } else if (ua.includes("win")) {
      setDetectedOs("Windows");
    } else if (ua.includes("linux")) {
      setDetectedOs("Linux");
    } else if (ua.includes("mac")) {
      setDetectedOs("macOS");
    } else if (/iphone|ipad|ipod/.test(ua)) {
      setDetectedOs("iOS");
    }
  }, []);

  // Fetch release assets dynamically from GitHub API without hardcoding versions
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
              htmlUrl:
                data.html_url ||
                "https://github.com/HarshSharma20050924/cinema/releases/latest",
              assets: Array.isArray(data.assets)
                ? data.assets.map((a: any) => ({
                    name: a.name || "",
                    size: a.size || 0,
                    downloadUrl: a.browser_download_url || "",
                  }))
                : [],
            });
            setLoading(false);
            return;
          }
        }
      } catch (_) {}

      // Fallback release metadata derived from package.json
      if (isMounted) {
        const fallbackVer = (packageJson.version || "4.1.0").replace(/^v/i, "");
        setRelease({
          tagName: `v${fallbackVer}`,
          version: fallbackVer,
          publishedAt: "Latest",
          htmlUrl: "https://github.com/HarshSharma20050924/cinema/releases/latest",
          assets: [],
        });
        setLoading(false);
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

  // Find dynamic download URL matching filename, or fall back to GitHub direct release raw download
  const resolveDownloadUrl = (fileName: string): string => {
    if (release && release.assets && release.assets.length > 0) {
      const matched = release.assets.find(
        (a) => a.name.toLowerCase() === fileName.toLowerCase()
      );
      if (matched && matched.downloadUrl) return matched.downloadUrl;

      // Partial pattern match (e.g. *.deb, *.AppImage, *.exe)
      const ext = fileName.split(".").pop()?.toLowerCase();
      if (ext) {
        const patternMatch = release.assets.find(
          (a) =>
            a.name.toLowerCase().endsWith(`.${ext}`) &&
            (fileName.toLowerCase().includes("runner")
              ? a.name.toLowerCase().includes("runner")
              : !a.name.toLowerCase().includes("runner"))
        );
        if (patternMatch && patternMatch.downloadUrl) {
          return patternMatch.downloadUrl;
        }
      }
    }
    return `https://github.com/HarshSharma20050924/cinema/releases/latest/download/${fileName}`;
  };

  const getAssetSize = (fileName: string): string => {
    if (release && release.assets && release.assets.length > 0) {
      const matched = release.assets.find(
        (a) => a.name.toLowerCase() === fileName.toLowerCase()
      );
      if (matched && matched.size > 0) return formatSize(matched.size);

      const ext = fileName.split(".").pop()?.toLowerCase();
      if (ext) {
        const patternMatch = release.assets.find(
          (a) =>
            a.name.toLowerCase().endsWith(`.${ext}`) &&
            (fileName.toLowerCase().includes("runner")
              ? a.name.toLowerCase().includes("runner")
              : !a.name.toLowerCase().includes("runner"))
        );
        if (patternMatch && patternMatch.size > 0) {
          return formatSize(patternMatch.size);
        }
      }
    }
    return "";
  };

  // Trigger direct browser download without redirecting the page
  const handleDirectDownload = (fileName: string) => {
    const url = resolveDownloadUrl(fileName);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = (fileName: string) => {
    const url = resolveDownloadUrl(fileName);
    navigator.clipboard.writeText(url);
    setCopiedLink(fileName);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const currentVersion = release?.version || packageJson.version || "4.1.0";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#090c13",
        color: "#f8fafc",
        paddingBottom: "80px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Top Navigation Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(9, 12, 19, 0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#e2e8f0",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
          }}
        >
          <ArrowLeftIcon size={16} />
          <span>Back to Cinema</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Latest Version:
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#e50914",
              background: "rgba(229, 9, 20, 0.12)",
              border: "1px solid rgba(229, 9, 20, 0.3)",
              padding: "3px 10px",
              borderRadius: "999px",
            }}
          >
            v{currentVersion}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "36px 20px 0 20px",
        }}
      >
        {/* Hero Header */}
        <div style={{ textAlign: "center", marginBottom: "44px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 14px",
              borderRadius: "999px",
              background: "rgba(229, 9, 20, 0.15)",
              border: "1px solid rgba(229, 9, 20, 0.35)",
              color: "#e50914",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "16px",
            }}
          >
            <span>Cinema Multi-Platform Ecosystem</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 4.5vw, 44px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 14px 0",
              lineHeight: 1.15,
            }}
          >
            Download Cinema for Any Device
          </h1>

          <p
            style={{
              maxWidth: "680px",
              margin: "0 auto",
              fontSize: "clamp(14px, 1.6vw, 16px)",
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            Decentralized media aggregation, local multi-threaded downloads, and
            distributed scraper nodes. Experience true zero-redirect streaming with
            complete privacy on your terms.
          </p>

          {/* OS Detection Banner */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "20px",
              padding: "7px 16px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.09)",
              fontSize: "12px",
              color: "#cbd5e1",
            }}
          >
            <span style={{ color: "#10b981", fontWeight: 700 }}>Active Platform:</span>
            <span>Detected {detectedOs}</span>
          </div>
        </div>

        {/* Downloads Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "22px",
            marginBottom: "50px",
          }}
        >
          {/* 1. Android Mobile App Card */}
          <div
            style={{
              background: "rgba(18, 23, 34, 0.75)",
              border:
                detectedOs === "Android"
                  ? "1px solid rgba(229, 9, 20, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow:
                detectedOs === "Android"
                  ? "0 10px 30px rgba(229, 9, 20, 0.15)"
                  : "0 10px 25px rgba(0, 0, 0, 0.4)",
              position: "relative",
            }}
          >
            {detectedOs === "Android" && (
              <span
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "#e50914",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  letterSpacing: "0.05em",
                }}
              >
                Recommended
              </span>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "12px",
                  background: "rgba(229, 9, 20, 0.15)",
                  border: "1px solid rgba(229, 9, 20, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#e50914",
                  flexShrink: 0,
                }}
              >
                <FilmIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 3px 0" }}>
                  Cinema Android App
                </h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Mobile & Tablet Streaming Client
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, flexGrow: 1, margin: "0 0 18px 0" }}>
              The flagship Cinema mobile experience for Android phones and TV devices. Includes
              integrated player with subtitles, multi-provider extensions, offline file downloads,
              and external player support (VLC, MPV, MX Player).
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "18px",
                fontSize: "11px",
              }}
            >
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                Android 7.0+
              </span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                APK Package
              </span>
              {getAssetSize("Cinema-Web.apk") && (
                <span style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981", padding: "3px 8px", borderRadius: "6px", fontWeight: 700 }}>
                  {getAssetSize("Cinema-Web.apk")}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleDirectDownload("Cinema-Web.apk")}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, #e50914, #b80710)",
                  border: "none",
                  color: "#ffffff",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(229, 9, 20, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                <DownloadIcon size={16} />
                <span>Direct Download APK</span>
              </button>

              <button
                onClick={() => handleCopyLink("Cinema-Web.apk")}
                title="Copy Direct Download Link"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: copiedLink === "Cinema-Web.apk" ? "#10b981" : "#94a3b8",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {copiedLink === "Cinema-Web.apk" ? <CheckIcon size={16} /> : <DownloadIcon size={16} />}
              </button>
            </div>
          </div>

          {/* 2. Android Node Runner App Card */}
          <div
            style={{
              background: "rgba(18, 23, 34, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "12px",
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#60a5fa",
                  flexShrink: 0,
                }}
              >
                <ServerIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 3px 0" }}>
                  Cinema Node Runner
                </h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Android Scraper & Daemon Node
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, flexGrow: 1, margin: "0 0 18px 0" }}>
              Automated background daemon for Android. Turns your spare phone into a high-speed
              scraping node with native Node.js runtime, zero root requirement, automatic
              Cloudflare tunnels, and coordinator sync.
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "18px",
                fontSize: "11px",
              }}
            >
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                ARM64 Android
              </span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                Daemon Service
              </span>
              {getAssetSize("Cinema-Runner.apk") && (
                <span style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981", padding: "3px 8px", borderRadius: "6px", fontWeight: 700 }}>
                  {getAssetSize("Cinema-Runner.apk")}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleDirectDownload("Cinema-Runner.apk")}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  border: "none",
                  color: "#ffffff",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(37, 99, 235, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                <DownloadIcon size={16} />
                <span>Direct Download Runner APK</span>
              </button>

              <button
                onClick={() => handleCopyLink("Cinema-Runner.apk")}
                title="Copy Direct Download Link"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: copiedLink === "Cinema-Runner.apk" ? "#10b981" : "#94a3b8",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {copiedLink === "Cinema-Runner.apk" ? <CheckIcon size={16} /> : <DownloadIcon size={16} />}
              </button>
            </div>
          </div>

          {/* 3. Linux Desktop App Card */}
          <div
            style={{
              background: "rgba(18, 23, 34, 0.75)",
              border:
                detectedOs === "Linux"
                  ? "1px solid rgba(229, 9, 20, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow:
                detectedOs === "Linux"
                  ? "0 10px 30px rgba(229, 9, 20, 0.15)"
                  : "0 10px 25px rgba(0, 0, 0, 0.4)",
              position: "relative",
            }}
          >
            {detectedOs === "Linux" && (
              <span
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "#e50914",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  letterSpacing: "0.05em",
                }}
              >
                Recommended
              </span>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "12px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fbbf24",
                  flexShrink: 0,
                }}
              >
                <ServerIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 3px 0" }}>
                  Cinema Desktop (Linux)
                </h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Debian / Ubuntu (.deb) & Universal (.AppImage)
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, flexGrow: 1, margin: "0 0 18px 0" }}>
              Direct installation for Linux workstations. Native performance with GPU hardware
              acceleration, integrated multi-threaded aria2-compatible downloader, and background
              runner.
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "18px",
                fontSize: "11px",
              }}
            >
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                64-bit AMD64
              </span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                Debian / Ubuntu / Mint / Arch
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleDirectDownload(`cinema-desktop_${currentVersion}_amd64.deb`)}
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "#ffffff",
                    padding: "11px 14px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  <DownloadIcon size={15} />
                  <span>Download .deb Package</span>
                </button>

                <button
                  onClick={() => handleDirectDownload(`Cinema-${currentVersion}.AppImage`)}
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "#ffffff",
                    padding: "11px 14px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  <DownloadIcon size={15} />
                  <span>Download .AppImage</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Windows Desktop App Card */}
          <div
            style={{
              background: "rgba(18, 23, 34, 0.75)",
              border:
                detectedOs === "Windows"
                  ? "1px solid rgba(229, 9, 20, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow:
                detectedOs === "Windows"
                  ? "0 10px 30px rgba(229, 9, 20, 0.15)"
                  : "0 10px 25px rgba(0, 0, 0, 0.4)",
              position: "relative",
            }}
          >
            {detectedOs === "Windows" && (
              <span
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "#e50914",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  letterSpacing: "0.05em",
                }}
              >
                Recommended
              </span>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "12px",
                  background: "rgba(14, 165, 233, 0.15)",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38bdf8",
                  flexShrink: 0,
                }}
              >
                <FilmIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 3px 0" }}>
                  Cinema Desktop (Windows)
                </h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Windows 10 / 11 Installer (.exe)
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, flexGrow: 1, margin: "0 0 18px 0" }}>
              Native 64-bit Windows setup package with automatic system integration, custom
              window frame, auto-updater daemon, and hardware playback engine.
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "18px",
                fontSize: "11px",
              }}
            >
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                Windows 10 / 11 (x64)
              </span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                EXE Setup
              </span>
            </div>

            <button
              onClick={() => handleDirectDownload(`Cinema-Setup-${currentVersion}.exe`)}
              style={{
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                border: "none",
                color: "#ffffff",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(2, 132, 199, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              <DownloadIcon size={16} />
              <span>Direct Download for Windows</span>
            </button>
          </div>

          {/* 5. macOS Desktop App Card */}
          <div
            style={{
              background: "rgba(18, 23, 34, 0.75)",
              border:
                detectedOs === "macOS"
                  ? "1px solid rgba(229, 9, 20, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow:
                detectedOs === "macOS"
                  ? "0 10px 30px rgba(229, 9, 20, 0.15)"
                  : "0 10px 25px rgba(0, 0, 0, 0.4)",
              position: "relative",
            }}
          >
            {detectedOs === "macOS" && (
              <span
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "#e50914",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  letterSpacing: "0.05em",
                }}
              >
                Recommended
              </span>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "12px",
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#c084fc",
                  flexShrink: 0,
                }}
              >
                <FilmIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 3px 0" }}>
                  Cinema Desktop (macOS)
                </h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Apple Silicon & Intel (.dmg)
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, flexGrow: 1, margin: "0 0 18px 0" }}>
              Optimized for macOS with native metal acceleration, smooth gestures, Picture in
              Picture support, and system media key controls.
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "18px",
                fontSize: "11px",
              }}
            >
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                macOS 11.0+
              </span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                DMG Disk Image
              </span>
            </div>

            <button
              onClick={() => handleDirectDownload(`Cinema-${currentVersion}.dmg`)}
              style={{
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                border: "none",
                color: "#ffffff",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(124, 58, 237, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              <DownloadIcon size={16} />
              <span>Direct Download for macOS</span>
            </button>
          </div>

          {/* 6. Cinema Desktop Runner (Daemon) Card */}
          <div
            style={{
              background: "rgba(18, 23, 34, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#34d399",
                  flexShrink: 0,
                }}
              >
                <ServerIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 3px 0" }}>
                  Cinema Desktop Runner
                </h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Server & Headless Daemon
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, flexGrow: 1, margin: "0 0 18px 0" }}>
              Standalone daemon binary for home servers, NAS, and headless Linux/Windows
              workstations. Provides dedicated scraper pipelines without opening full GUI.
            </p>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "18px",
                fontSize: "11px",
              }}
            >
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                Headless Mode
              </span>
              <span style={{ background: "rgba(255, 255, 255, 0.06)", padding: "3px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                Auto-Reconnect
              </span>
            </div>

            <button
              onClick={() => handleDirectDownload(`cinema-desktop-runner_${currentVersion}_amd64.deb`)}
              style={{
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #059669, #047857)",
                border: "none",
                color: "#ffffff",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(5, 150, 105, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              <DownloadIcon size={16} />
              <span>Direct Download Desktop Runner</span>
            </button>
          </div>
        </div>

        {/* GitHub Releases Transparency Section */}
        <div
          style={{
            background: "rgba(18, 23, 34, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: 800, margin: "0 0 6px 0" }}>
              GitHub Releases & Source Code
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, maxWidth: "600px", lineHeight: 1.5 }}>
              All builds are compiled via automated GitHub Actions CI/CD with public checksums.
              You can verify source code, download raw build artifacts, or view changelogs
              directly on GitHub.
            </p>
          </div>

          <a
            href={release?.htmlUrl || "https://github.com/HarshSharma20050924/cinema/releases"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
            }}
          >
            <GithubIcon size={18} />
            <span>View GitHub Releases & Checksums</span>
          </a>
        </div>
      </div>
    </div>
  );
};
