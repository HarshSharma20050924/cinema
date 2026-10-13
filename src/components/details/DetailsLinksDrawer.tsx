import React, { useState, useEffect } from "react";
import { PlayIcon, DownloadIcon, FilmIcon, SearchIcon, LoaderIcon } from "../../icons";
import { isValidStreamUrl, isLandingPageUrl, isDirectMediaUrl } from "./linkHelpers";
import type { StreamItem, ExternalPlayerType } from "../../types";

export interface DetailsLinksDrawerProps {
  activeTab: "stream" | "download" | null;
  onCloseTab: () => void;
  isScanningMirrors: boolean;
  loadingDetails: boolean;
  loadingStreams: boolean;
  isSeries: boolean;
  episodes: any[];
  seasonPacks: any[];
  linkList: any[];
  streams: StreamItem[];
  validSeasonIdx: number;
  onSelectSeasonIdx: (idx: number) => void;
  activeSeason: any;
  targetProviderKey: string;
  displayTitle: string;
  resolvingKey: string | null;
  downloadingKey: string | null;
  resolvingKeys: Record<string, boolean>;
  releaseServers: Record<string, StreamItem[]>;
  onPlayRelease: (key: string, primaryLink: string) => void;
  onDownloadRelease: (key: string, primaryLink: string, label: string) => void;
  onDownloadDirectUrl: (url: string, serverName: string, label?: string) => void;
  onPlayStream: (url: string, title?: string) => void;
  onOpenMoreLinks: (data: {
    title: string;
    subtitle?: string;
    links: Array<{ name: string; url: string }>;
    loading?: boolean;
  }) => void;
  onFetchServersForLink: (key: string, link: string, forceRefresh?: boolean) => Promise<StreamItem[]>;
  onPlayExternal?: (url: string, player: ExternalPlayerType) => void;
  onSearchGlobal?: (title: string) => void;
  onCloseModal?: () => void;
}

export const DetailsLinksDrawer: React.FC<DetailsLinksDrawerProps> = ({
  activeTab,
  onCloseTab,
  isScanningMirrors,
  loadingDetails,
  loadingStreams,
  isSeries,
  episodes,
  seasonPacks,
  linkList,
  streams,
  validSeasonIdx,
  onSelectSeasonIdx,
  activeSeason,
  targetProviderKey,
  displayTitle,
  resolvingKey,
  downloadingKey,
  resolvingKeys,
  releaseServers,
  onPlayRelease,
  onDownloadRelease,
  onDownloadDirectUrl,
  onPlayStream,
  onOpenMoreLinks,
  onFetchServersForLink,
  onSearchGlobal,
  onCloseModal,
}) => {
  const [showSlowLoadHint, setShowSlowLoadHint] = useState(false);

  useEffect(() => {
    const isLoading = loadingDetails || (linkList.length === 0 && loadingStreams);
    if (!isLoading) {
      setShowSlowLoadHint(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSlowLoadHint(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [loadingDetails, loadingStreams, linkList.length]);

  if (!activeTab) return null;

  const extractAllMirrorsForItem = (
    _itemTitle: string,
    primaryLink: string,
    itemObj?: any,
    serversList?: StreamItem[]
  ) => {
    const result: Array<{ name: string; url: string }> = [];
    const seenUrls = new Set<string>();

    const getCleanDomain = (linkUrl: string): string => {
      try {
        const u = new URL(linkUrl);
        return u.hostname.replace(/^www\./, "");
      } catch (_) {
        return "";
      }
    };

    const addLink = (url: string, customName?: string) => {
      if (!url || typeof url !== "string") return;
      const clean = url.trim();
      if (!clean) return;

      if (clean.startsWith("{") && clean.includes("detailPath")) {
        try {
          const parsed = JSON.parse(clean);
          if (parsed.url) {
            addLink(parsed.url, "MovieBox Server");
          }
        } catch (_) {}
        return;
      }

      let finalUrl = clean;
      if (clean.startsWith("/")) {
        const providerDomain =
          targetProviderKey === "4khdhub"
            ? "https://4khdhub.dad"
            : targetProviderKey === "hdhub4u"
            ? "https://hdhub4u.dad"
            : targetProviderKey === "movieBoxWeb"
            ? "https://officialmoviebox.com"
            : "";
        if (providerDomain) {
          finalUrl = `${providerDomain}${clean}`;
        }
      }

      if (isLandingPageUrl(finalUrl)) return;
      if (!isValidStreamUrl(finalUrl)) return;
      if (seenUrls.has(finalUrl)) return;
      seenUrls.add(finalUrl);

      let serverLabel = customName || "";
      const host = getCleanDomain(finalUrl).toLowerCase();

      if (!serverLabel || serverLabel === "Primary" || serverLabel.includes("Primary Hoster") || serverLabel.includes("Page Link") || serverLabel.startsWith("Server ")) {
        if (finalUrl.includes("cloudflarestorage")) serverLabel = "CF Storage";
        else if (finalUrl.includes("pixeldrain")) serverLabel = "Pixeldrain";
        else if (finalUrl.includes(".dev/") || finalUrl.includes(".buzz") || finalUrl.includes("workers.dev")) serverLabel = "CF Worker";
        else if (finalUrl.includes("storage.googleapis.com") || finalUrl.includes("googleusercontent")) serverLabel = "GDrive (download only)";
        else if (finalUrl.includes("fuckingfast.net") || finalUrl.includes("fastdl")) serverLabel = "FastDL";
        else if (finalUrl.includes("r2.dev") || finalUrl.includes("hubcdn")) serverLabel = "HubCDN";
        else if (finalUrl.includes("gofile.io")) serverLabel = "Gofile Direct";
        else if (host.includes("moviebox") || host.includes("hakunaymatata") || host.includes("aoneroom")) serverLabel = "MovieBox Server";
        else if (finalUrl.startsWith("magnet:")) serverLabel = "Torrent";
        else if (isDirectMediaUrl(finalUrl)) serverLabel = "Direct Mirror";
        else serverLabel = `Mirror ${result.length + 1}`;
      }

      result.push({
        name: serverLabel,
        url: finalUrl,
      });
    };

    if (Array.isArray(serversList)) {
      serversList.forEach((s) => {
        if (s?.link && !isLandingPageUrl(s.link)) {
          addLink(s.link, s.server);
        }
      });
    }

    if (itemObj?.directLinks && Array.isArray(itemObj.directLinks)) {
      itemObj.directLinks.forEach((dl: any, idx: number) => {
        const link = typeof dl === "string" ? dl : dl?.link;
        const title = typeof dl === "object" ? dl?.title : undefined;
        if (link && isDirectMediaUrl(link)) {
          addLink(link, title || `Mirror ${idx + 1}`);
        }
      });
    }

    if (primaryLink && isDirectMediaUrl(primaryLink)) {
      addLink(primaryLink, "Direct Stream");
    }

    return result;
  };

  return (
    <div
      className="details-drawer"
      style={{
        marginTop: "16px",
        padding: "22px 24px",
        borderRadius: "16px",
        background: "#0c1017",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        maxWidth: "780px",
        boxShadow: "0 20px 48px rgba(0, 0, 0, 0.8)",
        animation: "fadeIn 0.25s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              width: "4px",
              height: "16px",
              backgroundColor: activeTab === "stream" ? "#e50914" : "#2563eb",
              borderRadius: "2px",
            }}
          />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
            {activeTab === "stream"
              ? "Available Stream Links & Mirrors:"
              : "Available Download Links & Mirrors:"}
          </span>

          {isScanningMirrors && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 14px",
                borderRadius: "999px",
                background: activeTab === "stream" ? "#e50914" : "#2563eb",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.2px",
                boxShadow: activeTab === "stream" ? "0 2px 10px rgba(229, 9, 20, 0.45)" : "0 2px 10px rgba(37, 99, 235, 0.45)",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255, 255, 255, 0.35)",
                  borderTopColor: "#ffffff",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              <span>Loading more mirror links...</span>
            </div>
          )}
        </div>
        <button
          onClick={onCloseTab}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: "12px",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Visual Loader */}
      {(loadingDetails || (linkList.length === 0 && loadingStreams)) && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "24px 0", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "3px solid rgba(229, 9, 20, 0.2)",
              borderTopColor: "#e50914",
              animation: "spin 0.8s linear infinite",
            }}
          />
          {showSlowLoadHint && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Taking longer to load links.</span>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "linear-gradient(135deg, #e50914, #ff334b)",
                  border: "none",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "6px 14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                ↻ Reload
              </button>
            </div>
          )}
        </div>
      )}

      {/* TV Series: Single Episodes FIRST, then Complete Season Packs */}
      {!loadingDetails && isSeries && (episodes.length > 0 || seasonPacks.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* 1. Single Episodes List (Shown First!) */}
          {episodes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e" }}>
                    📺 Single Episodes ({episodes.length} Episodes Available)
                  </span>
                  {activeSeason?.quality && (
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: "6px",
                        background: "rgba(34, 197, 94, 0.15)",
                        color: "#22c55e",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {activeSeason.quality}
                    </span>
                  )}
                </div>

                {/* Season Dropdown */}
                {linkList.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <label htmlFor="season-group-select" style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>
                      Season:
                    </label>
                    <select
                      id="season-group-select"
                      value={validSeasonIdx}
                      onChange={(e) => onSelectSeasonIdx(Number(e.target.value))}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "#121722",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {linkList.map((season, sIdx) => (
                        <option key={sIdx} value={sIdx} style={{ background: "#0c1017", color: "#ffffff" }}>
                          {season.title || `Season ${season.season || sIdx + 1}`} ({season.directLinks?.length || 0} Eps)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Episodes List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                {episodes.map((ep, epIdx) => {
                  const epKey = `ep-${activeSeason?.title || "ep"}-${ep.title}-${epIdx}`;
                  const isResolving = resolvingKey === epKey;
                  const availableServers = (ep.servers && ep.servers.length > 0) ? ep.servers : releaseServers[epKey];

                  return (
                    <div
                      key={epIdx}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: "#121722",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                          {ep.title || `Episode ${epIdx + 1}`}
                        </span>

                        <div style={{ display: "flex", gap: "8px" }}>
                          {activeTab === "stream" ? (
                            <button
                              onClick={() => onPlayRelease(epKey, ep.link)}
                              disabled={isResolving}
                              style={{
                                padding: "6px 16px",
                                borderRadius: "8px",
                                background: "#e50914",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: isResolving ? "wait" : "pointer",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <PlayIcon size={12} fill="#fff" />
                              <span>Stream</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onDownloadRelease(epKey, ep.link, ep.title || `Episode ${epIdx + 1}`)}
                              disabled={isResolving || downloadingKey === epKey}
                              style={{
                                padding: "6px 16px",
                                borderRadius: "8px",
                                background: downloadingKey === epKey ? "#1d4ed8" : "#2563eb",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: isResolving || downloadingKey === epKey ? "wait" : "pointer",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                opacity: downloadingKey === epKey ? 0.85 : 1,
                              }}
                            >
                              {downloadingKey === epKey ? (
                                <>
                                  <LoaderIcon size={12} color="#ffffff" />
                                  <span>Preparing...</span>
                                </>
                              ) : (
                                <>
                                  <DownloadIcon size={12} />
                                  <span>Download</span>
                                </>
                              )}
                            </button>
                          )}

                          {activeTab === "download" && (
                            <button
                              onClick={async () => {
                                onOpenMoreLinks({
                                  title: `${displayTitle}`,
                                  subtitle: `${ep.title || `Episode ${epIdx + 1}`}`,
                                  links: [],
                                  loading: true,
                                });
                                const sList = await onFetchServersForLink(epKey, ep.link, true);
                                const epLinks = extractAllMirrorsForItem(
                                  `${displayTitle} - ${ep.title || `Episode ${epIdx + 1}`}`,
                                  ep.link,
                                  ep,
                                  sList
                                );
                                onOpenMoreLinks({
                                  title: `${displayTitle}`,
                                  subtitle: `${ep.title || `Episode ${epIdx + 1}`}`,
                                  links: epLinks,
                                  loading: false,
                                });
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#cbd5e1",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px solid rgba(255, 255, 255, 0.12)",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                                e.currentTarget.style.color = "#ffffff";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                                e.currentTarget.style.color = "#cbd5e1";
                              }}
                              title="Get download servers for this episode"
                            >
                              <DownloadIcon size={12} color="#93c5fd" />
                              <span>More Links</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Direct Mirrors Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>Mirrors:</span>
                        {availableServers && availableServers.length > 0 ? (
                          availableServers.map((s: StreamItem, sIdx: number) => (
                            <button
                              key={sIdx}
                              onClick={() => {
                                if (activeTab === "stream") {
                                  onPlayStream(s.link, `${displayTitle} - ${ep.title} (${s.server || "Stream"})`);
                                } else {
                                  onDownloadDirectUrl(s.link, s.server, ep.title);
                                }
                              }}
                              style={{
                                padding: "5px 12px",
                                borderRadius: "7px",
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#cbd5e1",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px solid rgba(255, 255, 255, 0.12)",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = activeTab === "download" ? "#2563eb" : "#e50914";
                                e.currentTarget.style.color = "#ffffff";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                                e.currentTarget.style.color = "#cbd5e1";
                              }}
                            >
                              {s.server}
                            </button>
                          ))
                        ) : isResolving ? (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Searching mirrors...</span>
                        ) : (
                          <button
                            onClick={() => onFetchServersForLink(epKey, ep.link, true)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "#64748b",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            + Load Mirrors
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Complete Season Packs */}
          {seasonPacks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: episodes.length > 0 ? "1px solid rgba(255, 255, 255, 0.08)" : "none", paddingTop: episodes.length > 0 ? "16px" : "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8" }}>
                  📦 Complete Season Packs (Download Full Season as Batch / Zip)
                </span>
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: "6px",
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {seasonPacks.length} {seasonPacks.length === 1 ? "Pack" : "Packs"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {seasonPacks.map((pack, pIdx) => {
                  const pKey = `seasonpack-${pack.title}-${pIdx}`;
                  const isResolving = resolvingKey === pKey;
                  const primaryLink = pack.directLinks?.[0]?.link || (pack as any).link || "";
                  const servers = releaseServers[pKey];

                  return (
                    <div
                      key={pIdx}
                      style={{
                        padding: "14px 18px",
                        borderRadius: "14px",
                        background: "#121722",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        border: "1px solid rgba(56, 189, 248, 0.15)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: "#0284c7",
                              color: "#ffffff",
                              fontSize: "11px",
                              fontWeight: 800,
                            }}
                          >
                            {pack.quality || "Season Pack"}
                          </span>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
                            {pack.title}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          {activeTab === "stream" ? (
                            <button
                              onClick={() => onPlayRelease(pKey, primaryLink)}
                              disabled={isResolving}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "7px",
                                padding: "8px 20px",
                                borderRadius: "10px",
                                background: "#e50914",
                                color: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: isResolving ? "wait" : "pointer",
                                border: "none",
                              }}
                            >
                              <PlayIcon size={13} fill="#fff" />
                              <span>Stream</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onDownloadRelease(pKey, primaryLink, pack.quality || pack.title)}
                              disabled={isResolving || downloadingKey === pKey}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "7px",
                                padding: "8px 20px",
                                borderRadius: "10px",
                                background: downloadingKey === pKey ? "#1d4ed8" : "#2563eb",
                                color: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: isResolving || downloadingKey === pKey ? "wait" : "pointer",
                                border: "none",
                              }}
                            >
                              {downloadingKey === pKey ? (
                                <>
                                  <LoaderIcon size={13} color="#ffffff" />
                                  <span>Resolving...</span>
                                </>
                              ) : (
                                <>
                                  <DownloadIcon size={13} />
                                  <span>Download Pack</span>
                                </>
                              )}
                            </button>
                          )}

                          {activeTab === "download" && (
                            <button
                              onClick={async () => {
                                onOpenMoreLinks({
                                  title: `${displayTitle}`,
                                  subtitle: `${pack.title || "Season Pack"}`,
                                  links: [],
                                  loading: true,
                                });
                                const sList = await onFetchServersForLink(pKey, primaryLink, true);
                                const packLinks = extractAllMirrorsForItem(
                                  `${displayTitle} - ${pack.title || "Season Pack"}`,
                                  primaryLink,
                                  pack,
                                  sList
                                );
                                onOpenMoreLinks({
                                  title: `${displayTitle}`,
                                  subtitle: `${pack.title || "Season Pack"}`,
                                  links: packLinks,
                                  loading: false,
                                });
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                borderRadius: "10px",
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#cbd5e1",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px solid rgba(255, 255, 255, 0.14)",
                              }}
                            >
                              <DownloadIcon size={13} color="#93c5fd" />
                              <span>More Links</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mirrors Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>Mirrors:</span>
                        {servers && servers.length > 0 ? (
                          servers.map((s, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => {
                                if (activeTab === "stream") {
                                  onPlayStream(s.link, `${displayTitle} - ${pack.seasonName || pack.title} (${s.server || "Stream"})`);
                                } else {
                                  onDownloadDirectUrl(s.link, s.server, pack.quality || pack.title);
                                }
                              }}
                              style={{
                                padding: "5px 12px",
                                borderRadius: "7px",
                                background: "rgba(255, 255, 255, 0.08)",
                                color: "#cbd5e1",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px solid rgba(255, 255, 255, 0.12)",
                              }}
                            >
                              {s.server}
                            </button>
                          ))
                        ) : isResolving ? (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Searching mirrors...</span>
                        ) : (
                          <button
                            onClick={() => onFetchServersForLink(pKey, primaryLink, true)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "#64748b",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            + Load Mirrors
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Movie Releases List with Instant Filled Mirrors */}
      {!loadingDetails && !isSeries && linkList.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {linkList.map((rel, relIdx) => {
            const relKey = `rel-${rel.title}-${relIdx}`;
            const isResolving = !!resolvingKeys[relKey] || resolvingKey === relKey;
            const primaryLink = rel.directLinks?.[0]?.link || "";
            const servers = releaseServers[relKey];

            return (
              <div
                key={relIdx}
                style={{
                  padding: "14px 18px",
                  borderRadius: "14px",
                  background: "#121722",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  animation: "fadeIn 0.25s ease-out both",
                  animationDelay: `${relIdx * 45}ms`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: activeTab === "download" ? "#2563eb" : "#e50914",
                        color: "#ffffff",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {rel.quality || "HD"}
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
                      {rel.title}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {activeTab === "stream" ? (
                      <button
                        onClick={() => onPlayRelease(relKey, primaryLink)}
                        disabled={isResolving}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "8px 20px",
                          borderRadius: "10px",
                          background: "#e50914",
                          color: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: isResolving ? "wait" : "pointer",
                          border: "none",
                          boxShadow: "0 4px 14px rgba(229, 9, 20, 0.35)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f40612")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#e50914")}
                      >
                        <PlayIcon size={13} fill="#fff" />
                        <span>Stream</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onDownloadRelease(relKey, primaryLink, rel.quality || rel.title)}
                        disabled={isResolving || downloadingKey === relKey}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "8px 20px",
                          borderRadius: "10px",
                          background: downloadingKey === relKey ? "#1d4ed8" : "#2563eb",
                          color: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: isResolving || downloadingKey === relKey ? "wait" : "pointer",
                          border: "none",
                          boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                          transition: "all 0.2s",
                          opacity: downloadingKey === relKey ? 0.85 : 1,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = downloadingKey === relKey ? "#1d4ed8" : "#2563eb")}
                      >
                        {downloadingKey === relKey ? (
                          <>
                            <LoaderIcon size={13} color="#ffffff" />
                            <span>Resolving...</span>
                          </>
                        ) : (
                          <>
                            <DownloadIcon size={13} />
                            <span>Download</span>
                          </>
                        )}
                      </button>
                    )}

                    {activeTab === "download" && (
                      <button
                        onClick={async () => {
                          onOpenMoreLinks({
                            title: `${displayTitle}`,
                            subtitle: `${rel.quality || rel.title}`,
                            links: [],
                            loading: true,
                          });
                          const sList = await onFetchServersForLink(relKey, primaryLink, true);
                          const relLinks = extractAllMirrorsForItem(
                            `${displayTitle} - ${rel.quality || rel.title}`,
                            primaryLink,
                            rel,
                            sList
                          );
                          onOpenMoreLinks({
                            title: `${displayTitle}`,
                            subtitle: `${rel.quality || rel.title}`,
                            links: relLinks,
                            loading: false,
                          });
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "#cbd5e1",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                          e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                          e.currentTarget.style.color = "#cbd5e1";
                        }}
                        title="Get direct download mirrors for this quality"
                      >
                        <DownloadIcon size={13} color="#93c5fd" />
                        <span>More Links</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Second Row: Mirrors */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>Mirrors:</span>
                  {servers && servers.length > 0 ? (
                    servers.map((s, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => {
                          if (activeTab === "stream") {
                            onPlayStream(s.link, `${displayTitle} - ${rel.title} (${s.server || "Stream"})`);
                          } else {
                            onDownloadDirectUrl(s.link, s.server, rel.quality || rel.title);
                          }
                        }}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "7px",
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "#cbd5e1",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = activeTab === "download" ? "#2563eb" : "#e50914";
                          e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                          e.currentTarget.style.color = "#cbd5e1";
                        }}
                      >
                        {s.server}
                      </button>
                    ))
                  ) : isResolving ? (
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Searching mirrors...</span>
                  ) : (
                    <button
                      onClick={() => onFetchServersForLink(relKey, primaryLink, true)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "#64748b",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      + Load Mirrors
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Streams List */}
      {!loadingDetails && !loadingStreams && linkList.length === 0 && streams.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {streams.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "#121722",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FilmIcon size={16} color="#ff4d5a" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                  {s.server || `Server ${i + 1}`}
                </span>
                {s.quality && (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "#e50914",
                      color: "#ffffff",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {s.quality}
                  </span>
                )}
              </div>

              {activeTab === "stream" ? (
                <button
                  onClick={() => onPlayStream(s.link, `${displayTitle} (${s.server || "Stream"})`)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    background: "#e50914",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  Stream
                </button>
              ) : (
                <button
                  onClick={() => onDownloadDirectUrl(s.link, s.server || "Direct Stream", "Stream")}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  Download
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loadingDetails && !loadingStreams && linkList.length === 0 && streams.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", padding: "10px 0" }}>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            No direct releases found on {targetProviderKey}.
          </span>
          {onSearchGlobal && (
            <button
              onClick={() => {
                onSearchGlobal(displayTitle);
                if (onCloseModal) onCloseModal();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                background: "#e50914",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
              }}
            >
              <SearchIcon size={13} />
              <span>Search Everywhere</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
