import React, { useState, useEffect } from "react";
import { PlayIcon, DownloadIcon, FilmIcon, SearchIcon, LoaderIcon } from "../../icons";
import { isValidStreamUrl, isLandingPageUrl, isDirectMediaUrl } from "./linkHelpers";
import { getSeasonDisplayInfo } from "../../utils/seasonUtils";
import { SeasonDropdown } from "./SeasonDropdown";
import type { StreamItem, ExternalPlayerType, Provider } from "../../types";

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
  streamingKey?: string | null;
  downloadingKey: string | null;
  resolvingKeys: Record<string, boolean>;
  releaseServers: Record<string, StreamItem[]>;
  onPlayRelease: (key: string, primaryLink: string) => void;
  onDownloadRelease: (key: string, primaryLink: string, label: string) => void;
  onDownloadDirectUrl: (url: string, serverName: string, label?: string) => void;
  onPlayStream: (
    url: string,
    title?: string,
    servers?: StreamItem[],
    backdrop?: string,
    poster?: string
  ) => void;
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
  providers?: Provider[];
  onSelectProvider?: (provider: Provider) => void;
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
  streamingKey,
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
  providers,
  onSelectProvider,
}) => {
  const [showSlowLoadHint, setShowSlowLoadHint] = useState(false);
  const [activeDirectActionKey, setActiveDirectActionKey] = useState<string | null>(null);
  const [releasePage, setReleasePage] = useState(1);
  const RELEASES_PER_PAGE = 8;
  const [episodePage, setEpisodePage] = useState(1);
  const EPISODES_PER_PAGE = 20;

  useEffect(() => {
    setReleasePage(1);
  }, [displayTitle, linkList.length]);

  useEffect(() => {
    setEpisodePage(1);
  }, [displayTitle, validSeasonIdx, episodes.length]);

  const triggerDirectAction = (key: string, actionFn: () => void) => {
    setActiveDirectActionKey(key);
    try {
      actionFn();
    } finally {
      setTimeout(() => {
        setActiveDirectActionKey((curr) => (curr === key ? null : curr));
      }, 6500);
    }
  };

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
        if (!clean.startsWith("/api/")) {
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
      }

      if (isLandingPageUrl(finalUrl)) return;
      if (!isValidStreamUrl(finalUrl)) return;
      if (seenUrls.has(finalUrl)) return;
      seenUrls.add(finalUrl);

      let serverLabel = customName || "";
      const host = getCleanDomain(finalUrl).toLowerCase();

      if (!serverLabel || serverLabel === "Primary" || serverLabel.includes("Primary Hoster") || serverLabel.includes("Page Link") || serverLabel.startsWith("Server ")) {
        if (finalUrl.includes("/api/torrent/download")) serverLabel = "Cinema Direct Download";
        else if (finalUrl.includes("/api/stream/torrent")) serverLabel = "Cinema Fast Stream";
        else if (finalUrl.includes("cloudflarestorage")) serverLabel = "CF Storage";
        else if (finalUrl.includes("pixeldrain")) serverLabel = "Pixeldrain";
        else if (finalUrl.includes(".dev/") || finalUrl.includes(".buzz") || finalUrl.includes("workers.dev")) serverLabel = "CF Worker";
        else if (finalUrl.includes("storage.googleapis.com") || finalUrl.includes("googleusercontent")) serverLabel = "GDrive (download only)";
        else if (finalUrl.includes("fuckingfast.net") || finalUrl.includes("fastdl")) serverLabel = "FastDL";
        else if (finalUrl.includes("r2.dev") || finalUrl.includes("hubcdn")) serverLabel = "HubCDN";
        else if (finalUrl.includes("gofile.io")) serverLabel = "Gofile Direct";
        else if (host.includes("moviebox") || host.includes("hakunaymatata") || host.includes("aoneroom")) serverLabel = "MovieBox Server";
        else if (finalUrl.startsWith("magnet:")) serverLabel = "Torrent Magnet";
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

                {/* Custom Season Dropdown */}
                <SeasonDropdown
                  linkList={linkList}
                  validSeasonIdx={validSeasonIdx}
                  onSelectSeasonIdx={onSelectSeasonIdx}
                  activeSeason={activeSeason}
                />
              </div>

              {/* Audio / Language Dub Selector Pills for Multi-Dub Series */}
              {(() => {
                const dubMap = new Map<string, number[]>();
                linkList.forEach((item, idx) => {
                  const info = getSeasonDisplayInfo(item, idx);
                  if (info.dub) {
                    if (!dubMap.has(info.dub)) dubMap.set(info.dub, []);
                    dubMap.get(info.dub)!.push(idx);
                  }
                });

                const availableDubs = Array.from(dubMap.keys());
                if (availableDubs.length <= 1) return null;

                const currentInfo = getSeasonDisplayInfo(activeSeason, validSeasonIdx);
                const currentDub = currentInfo.dub;
                const currentSeasonNum = currentInfo.seasonNum;

                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", padding: "4px 0" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>Audio Track:</span>
                    {availableDubs.map((dubName) => {
                      const isSelected = currentDub.toLowerCase() === dubName.toLowerCase();
                      return (
                        <button
                          key={dubName}
                          type="button"
                          onClick={() => {
                            const indices = dubMap.get(dubName) || [];
                            // Try to find matching season number in this dub
                            const matchingSeasonIdx = indices.find((idx) => {
                              const info = getSeasonDisplayInfo(linkList[idx], idx);
                              return info.seasonNum === currentSeasonNum;
                            });
                            const targetIdx = matchingSeasonIdx !== undefined ? matchingSeasonIdx : indices[0];
                            if (targetIdx !== undefined) {
                              onSelectSeasonIdx(targetIdx);
                            }
                          }}
                          style={{
                            padding: "4px 14px",
                            borderRadius: "999px",
                            background: isSelected ? "#e50914" : "rgba(14, 14, 14, 0.8)",
                            color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                            fontSize: "12px",
                            fontWeight: isSelected ? 800 : 600,
                            border: isSelected ? "1px solid #ff2b38" : "1px solid rgba(255, 255, 255, 0.12)",
                            boxShadow: isSelected ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {dubName}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Episodes List & Pagination */}
              {(() => {
                const totalEpPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);
                const startEpIdx = (episodePage - 1) * EPISODES_PER_PAGE;
                const currentEpisodes = episodes.length > EPISODES_PER_PAGE
                  ? episodes.slice(startEpIdx, startEpIdx + EPISODES_PER_PAGE)
                  : episodes;

                return (
                  <>
                    {totalEpPages > 1 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                          Episodes ({episodes.length}) · Page {episodePage} of {totalEpPages}
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => setEpisodePage((p) => Math.max(1, p - 1))}
                            disabled={episodePage === 1}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: episodePage === 1 ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.12)",
                              color: episodePage === 1 ? "#475569" : "#ffffff",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: episodePage === 1 ? "not-allowed" : "pointer",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            ← Prev
                          </button>
                          <button
                            onClick={() => setEpisodePage((p) => Math.min(totalEpPages, p + 1))}
                            disabled={episodePage === totalEpPages}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: episodePage === totalEpPages ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.12)",
                              color: episodePage === totalEpPages ? "#475569" : "#ffffff",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: episodePage === totalEpPages ? "not-allowed" : "pointer",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                      {currentEpisodes.map((ep, relIdx) => {
                        const epIdx = episodes.length > EPISODES_PER_PAGE ? startEpIdx + relIdx : relIdx;
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
                              disabled={isResolving || streamingKey === epKey}
                              style={{
                                padding: "6px 16px",
                                borderRadius: "8px",
                                background: (streamingKey === epKey || (isResolving && resolvingKey === epKey)) ? "#b91c1c" : "#e50914",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: (isResolving || streamingKey === epKey) ? "wait" : "pointer",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                opacity: (streamingKey === epKey || (isResolving && resolvingKey === epKey)) ? 0.85 : 1,
                                transition: "all 0.15s ease",
                              }}
                            >
                              {streamingKey === epKey || (isResolving && resolvingKey === epKey) ? (
                                <>
                                  <LoaderIcon size={12} color="#ffffff" />
                                  <span>Loading Stream...</span>
                                </>
                              ) : (
                                <>
                                  <PlayIcon size={12} fill="#fff" />
                                  <span>Stream</span>
                                </>
                              )}
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
                                transition: "all 0.15s ease",
                              }}
                            >
                              {downloadingKey === epKey ? (
                                <>
                                  <LoaderIcon size={12} color="#ffffff" />
                                  <span>Preparing Download...</span>
                                </>
                              ) : (
                                <>
                                  <DownloadIcon size={12} />
                                  <span>Download</span>
                                </>
                              )}
                            </button>
                          )}

                          {(activeTab === "stream" || activeTab === "download") && (
                            <button
                              onClick={async () => {
                                onOpenMoreLinks({
                                  title: `${displayTitle}`,
                                  subtitle: `${ep.title || `Episode ${epIdx + 1}`}`,
                                  links: [],
                                  loading: true,
                                  mode: activeTab,
                                });
                                const sList = await onFetchServersForLink(epKey, ep.link, activeTab === "download");
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
                                  mode: activeTab,
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
                              title={activeTab === "stream" ? "Get more stream mirrors for this episode" : "Get download servers for this episode"}
                            >
                              {activeTab === "stream" ? (
                                <PlayIcon size={12} color="#f87171" fill="#f87171" />
                              ) : (
                                <DownloadIcon size={12} color="#93c5fd" />
                              )}
                              <span>More Links</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Direct Mirrors Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>Mirrors:</span>
                        {availableServers && availableServers.length > 0 ? (
                          availableServers.map((s: StreamItem, sIdx: number) => {
                            const mKey = `ep_mirror_${epKey}_${sIdx}`;
                            const isPending = activeDirectActionKey === mKey;
                            return (
                              <button
                                key={sIdx}
                                disabled={isPending}
                                onClick={() => {
                                  triggerDirectAction(mKey, () => {
                                    if (activeTab === "stream") {
                                      onPlayStream(
                                        s.link,
                                        `${displayTitle} - ${ep.title} (${s.server || "Stream"})`,
                                        availableServers
                                      );
                                    } else {
                                      onDownloadDirectUrl(s.link, s.server, ep.title);
                                    }
                                  });
                                }}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "7px",
                                  background: isPending
                                    ? (activeTab === "download" ? "#1d4ed8" : "#b91c1c")
                                    : "rgba(255, 255, 255, 0.08)",
                                  color: "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: isPending ? "wait" : "pointer",
                                  border: "1px solid rgba(255, 255, 255, 0.12)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isPending) {
                                    e.currentTarget.style.background = activeTab === "download" ? "#2563eb" : "#e50914";
                                    e.currentTarget.style.color = "#ffffff";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isPending) {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                                    e.currentTarget.style.color = "#cbd5e1";
                                  }
                                }}
                              >
                                {isPending ? (
                                  <>
                                    <LoaderIcon size={11} color="#ffffff" />
                                    <span>{activeTab === "stream" ? "Loading..." : "Preparing..."}</span>
                                  </>
                                ) : (
                                  s.server
                                )}
                              </button>
                            );
                          })
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
            </>
          );
        })()}
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
                              disabled={isResolving || streamingKey === pKey}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "7px",
                                padding: "8px 20px",
                                borderRadius: "10px",
                                background: (streamingKey === pKey || (isResolving && resolvingKey === pKey)) ? "#b91c1c" : "#e50914",
                                color: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: (isResolving || streamingKey === pKey) ? "wait" : "pointer",
                                border: "none",
                                opacity: (streamingKey === pKey || (isResolving && resolvingKey === pKey)) ? 0.85 : 1,
                                transition: "all 0.15s ease",
                              }}
                            >
                              {streamingKey === pKey || (isResolving && resolvingKey === pKey) ? (
                                <>
                                  <LoaderIcon size={13} color="#ffffff" />
                                  <span>Loading Stream...</span>
                                </>
                              ) : (
                                <>
                                  <PlayIcon size={13} fill="#fff" />
                                  <span>Stream</span>
                                </>
                              )}
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
                                opacity: downloadingKey === pKey ? 0.85 : 1,
                                transition: "all 0.15s ease",
                              }}
                            >
                              {downloadingKey === pKey ? (
                                <>
                                  <LoaderIcon size={13} color="#ffffff" />
                                  <span>Preparing Download...</span>
                                </>
                              ) : (
                                <>
                                  <DownloadIcon size={13} />
                                  <span>Download Pack</span>
                                </>
                              )}
                            </button>
                          )}

                          {(activeTab === "stream" || activeTab === "download") && (
                            <button
                              onClick={async () => {
                                onOpenMoreLinks({
                                  title: `${displayTitle}`,
                                  subtitle: `${pack.title || "Season Pack"}`,
                                  links: [],
                                  loading: true,
                                  mode: activeTab,
                                });
                                const sList = await onFetchServersForLink(pKey, primaryLink, activeTab === "download");
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
                                  mode: activeTab,
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
                              title={activeTab === "stream" ? "Get more stream mirrors for this pack" : "Get download servers for this pack"}
                            >
                              {activeTab === "stream" ? (
                                <PlayIcon size={13} color="#f87171" fill="#f87171" />
                              ) : (
                                <DownloadIcon size={13} color="#93c5fd" />
                              )}
                              <span>More Links</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mirrors Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>Mirrors:</span>
                        {servers && servers.length > 0 ? (
                          servers.map((s, sIdx) => {
                            const mKey = `pack_mirror_${pKey}_${sIdx}`;
                            const isPending = activeDirectActionKey === mKey;
                            return (
                              <button
                                key={sIdx}
                                disabled={isPending}
                                onClick={() => {
                                  triggerDirectAction(mKey, () => {
                                    if (activeTab === "stream") {
                                      onPlayStream(
                                        s.link,
                                        `${displayTitle} - ${pack.seasonName || pack.title} (${s.server || "Stream"})`,
                                        servers
                                      );
                                    } else {
                                      onDownloadDirectUrl(s.link, s.server, pack.quality || pack.title);
                                    }
                                  });
                                }}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "7px",
                                  background: isPending
                                    ? (activeTab === "download" ? "#1d4ed8" : "#b91c1c")
                                    : "rgba(255, 255, 255, 0.08)",
                                  color: "#cbd5e1",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: isPending ? "wait" : "pointer",
                                  border: "1px solid rgba(255, 255, 255, 0.12)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {isPending ? (
                                  <>
                                    <LoaderIcon size={11} color="#ffffff" />
                                    <span>{activeTab === "stream" ? "Loading..." : "Preparing..."}</span>
                                  </>
                                ) : (
                                  s.server
                                )}
                              </button>
                            );
                          })
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

      {/* Movie Releases List with Instant Filled Mirrors & Pagination */}
      {!loadingDetails && !isSeries && linkList.length > 0 && (() => {
        const totalReleasePages = Math.ceil(linkList.length / RELEASES_PER_PAGE);
        const startIndex = (releasePage - 1) * RELEASES_PER_PAGE;
        const currentReleases = linkList.slice(startIndex, startIndex + RELEASES_PER_PAGE);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Top Pagination & Stats Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>
                  Available Releases ({linkList.length})
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "rgba(37, 99, 235, 0.2)",
                    color: "#93c5fd",
                    fontWeight: 600,
                  }}
                >
                  Page {releasePage} of {totalReleasePages || 1}
                </span>
              </div>

              {totalReleasePages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={() => setReleasePage((p) => Math.max(1, p - 1))}
                    disabled={releasePage === 1}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: releasePage === 1 ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.12)",
                      color: releasePage === 1 ? "#475569" : "#ffffff",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: releasePage === 1 ? "not-allowed" : "pointer",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setReleasePage((p) => Math.min(totalReleasePages, p + 1))}
                    disabled={releasePage === totalReleasePages}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: releasePage === totalReleasePages ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.12)",
                      color: releasePage === totalReleasePages ? "#475569" : "#ffffff",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: releasePage === totalReleasePages ? "not-allowed" : "pointer",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {currentReleases.map((rel, relIdx) => {
              const actualIdx = startIndex + relIdx;
              const relKey = `rel-${rel.title}-${actualIdx}`;
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
                        disabled={isResolving || streamingKey === relKey}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "8px 20px",
                          borderRadius: "10px",
                          background: (streamingKey === relKey || (isResolving && resolvingKey === relKey)) ? "#b91c1c" : "#e50914",
                          color: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: (isResolving || streamingKey === relKey) ? "wait" : "pointer",
                          border: "none",
                          boxShadow: "0 4px 14px rgba(229, 9, 20, 0.35)",
                          opacity: (streamingKey === relKey || (isResolving && resolvingKey === relKey)) ? 0.85 : 1,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isResolving && streamingKey !== relKey) e.currentTarget.style.background = "#f40612";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = (streamingKey === relKey || (isResolving && resolvingKey === relKey)) ? "#b91c1c" : "#e50914";
                        }}
                      >
                        {streamingKey === relKey || (isResolving && resolvingKey === relKey) ? (
                          <>
                            <LoaderIcon size={13} color="#ffffff" />
                            <span>Loading Stream...</span>
                          </>
                        ) : (
                          <>
                            <PlayIcon size={13} fill="#fff" />
                            <span>Stream</span>
                          </>
                        )}
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
                        onMouseEnter={(e) => {
                          if (downloadingKey !== relKey) e.currentTarget.style.background = "#1d4ed8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = downloadingKey === relKey ? "#1d4ed8" : "#2563eb";
                        }}
                      >
                        {downloadingKey === relKey ? (
                          <>
                            <LoaderIcon size={13} color="#ffffff" />
                            <span>Preparing Download...</span>
                          </>
                        ) : (
                          <>
                            <DownloadIcon size={13} />
                            <span>Download</span>
                          </>
                        )}
                      </button>
                    )}

                    {(activeTab === "stream" || activeTab === "download") && (
                      <button
                        onClick={async () => {
                          onOpenMoreLinks({
                            title: `${displayTitle}`,
                            subtitle: `${rel.quality || rel.title}`,
                            links: [],
                            loading: true,
                            mode: activeTab,
                          });
                          const sList = await onFetchServersForLink(relKey, primaryLink, activeTab === "download");
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
                            mode: activeTab,
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
                        title={activeTab === "stream" ? "Get more stream mirrors for this quality" : "Get direct download mirrors for this quality"}
                      >
                        {activeTab === "stream" ? (
                          <PlayIcon size={13} color="#f87171" fill="#f87171" />
                        ) : (
                          <DownloadIcon size={13} color="#93c5fd" />
                        )}
                        <span>More Links</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Second Row: Mirrors */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>Mirrors:</span>
                  {servers && servers.length > 0 ? (
                    servers.map((s, sIdx) => {
                      const mKey = `movie_mirror_${relKey}_${sIdx}`;
                      const isPending = activeDirectActionKey === mKey;
                      return (
                        <button
                          key={sIdx}
                          disabled={isPending}
                          onClick={() => {
                            triggerDirectAction(mKey, () => {
                              if (activeTab === "stream") {
                                onPlayStream(
                                  s.link,
                                  `${displayTitle} - ${rel.title} (${s.server || "Stream"})`,
                                  servers
                                );
                              } else {
                                onDownloadDirectUrl(s.link, s.server, rel.quality || rel.title);
                              }
                            });
                          }}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "7px",
                            background: isPending
                              ? (activeTab === "download" ? "#1d4ed8" : "#b91c1c")
                              : "rgba(255, 255, 255, 0.08)",
                            color: "#cbd5e1",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: isPending ? "wait" : "pointer",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isPending) {
                              e.currentTarget.style.background = activeTab === "download" ? "#2563eb" : "#e50914";
                              e.currentTarget.style.color = "#ffffff";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isPending) {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                              e.currentTarget.style.color = "#cbd5e1";
                            }
                          }}
                        >
                          {isPending ? (
                            <>
                              <LoaderIcon size={11} color="#ffffff" />
                              <span>{activeTab === "stream" ? "Loading..." : "Preparing..."}</span>
                            </>
                          ) : (
                            s.server
                          )}
                        </button>
                      );
                    })
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

          {/* Bottom Numbered Pagination Bar */}
            {totalReleasePages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px 0 6px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setReleasePage((p) => Math.max(1, p - 1))}
                  disabled={releasePage === 1}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    background: releasePage === 1 ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.1)",
                    color: releasePage === 1 ? "#475569" : "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: releasePage === 1 ? "not-allowed" : "pointer",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  ← Previous
                </button>

                {Array.from({ length: totalReleasePages }).map((_, pIdx) => {
                  const pNum = pIdx + 1;
                  if (
                    pNum === 1 ||
                    pNum === totalReleasePages ||
                    (pNum >= releasePage - 1 && pNum <= releasePage + 1)
                  ) {
                    const isCurr = pNum === releasePage;
                    return (
                      <button
                        key={pNum}
                        onClick={() => setReleasePage(pNum)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: isCurr ? "#e50914" : "rgba(255, 255, 255, 0.06)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: isCurr ? 800 : 600,
                          cursor: "pointer",
                          border: isCurr ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                          boxShadow: isCurr ? "0 2px 8px rgba(229, 9, 20, 0.4)" : "none",
                        }}
                      >
                        {pNum}
                      </button>
                    );
                  }
                  if (pNum === releasePage - 2 || pNum === releasePage + 2) {
                    return <span key={pNum} style={{ color: "#64748b", fontSize: "12px" }}>...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setReleasePage((p) => Math.min(totalReleasePages, p + 1))}
                  disabled={releasePage === totalReleasePages}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    background: releasePage === totalReleasePages ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.1)",
                    color: releasePage === totalReleasePages ? "#475569" : "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: releasePage === totalReleasePages ? "not-allowed" : "pointer",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        );
      })()}

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
                  disabled={activeDirectActionKey === `stream_direct_${i}`}
                  onClick={() => {
                    triggerDirectAction(`stream_direct_${i}`, () => {
                      onPlayStream(s.link, `${displayTitle} (${s.server || "Stream"})`, streams);
                    });
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    background: activeDirectActionKey === `stream_direct_${i}` ? "#b91c1c" : "#e50914",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: activeDirectActionKey === `stream_direct_${i}` ? "wait" : "pointer",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: activeDirectActionKey === `stream_direct_${i}` ? 0.85 : 1,
                  }}
                >
                  {activeDirectActionKey === `stream_direct_${i}` ? (
                    <>
                      <LoaderIcon size={12} color="#ffffff" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon size={12} fill="#fff" />
                      <span>Stream</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled={activeDirectActionKey === `dl_direct_${i}`}
                  onClick={() => {
                    triggerDirectAction(`dl_direct_${i}`, () => {
                      onDownloadDirectUrl(s.link, s.server || "Direct Stream", "Stream");
                    });
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    background: activeDirectActionKey === `dl_direct_${i}` ? "#1d4ed8" : "#2563eb",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: activeDirectActionKey === `dl_direct_${i}` ? "wait" : "pointer",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: activeDirectActionKey === `dl_direct_${i}` ? 0.85 : 1,
                  }}
                >
                  {activeDirectActionKey === `dl_direct_${i}` ? (
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
            </div>
          ))}
        </div>
      )}

      {/* Empty State / Not available on current extension */}
      {!loadingDetails && !loadingStreams && linkList.length === 0 && streams.length === 0 && (
        <div
          style={{
            marginTop: "14px",
            padding: "18px 20px",
            borderRadius: "14px",
            background: "linear-gradient(145deg, rgba(229,9,20,0.06), rgba(20,20,25,0.85))",
            border: "1px solid rgba(229,9,20,0.22)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(229,9,20,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "#e50914",
              }}
            >
              <SearchIcon size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.01em" }}>
                Not available on {targetProviderKey || "this extension"}
              </div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", marginTop: "3px", lineHeight: 1.45 }}>
                No direct stream or download links found on <strong style={{ color: "#e2e8f0" }}>{targetProviderKey}</strong>. Switch the extension or click <strong style={{ color: "#e50914" }}>Search Globally</strong> to find links across all extensions.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", paddingTop: "2px" }}>
            {onSearchGlobal && (
              <button
                type="button"
                onClick={() => {
                  onSearchGlobal(displayTitle || "");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 18px",
                  borderRadius: "10px",
                  background: "#e50914",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  border: "none",
                  boxShadow: "0 4px 14px rgba(229,9,20,0.35)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.background = "#ff0f1a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "#e50914";
                }}
              >
                <SearchIcon size={14} />
                <span>Search Globally</span>
              </button>
            )}

            {providers && providers.length > 1 && onSelectProvider && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>
                  Switch extension:
                </span>
                {providers
                  .filter((p) => p.value !== targetProviderKey)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p.value}
                      onClick={() => onSelectProvider(p)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#e2e8f0",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
