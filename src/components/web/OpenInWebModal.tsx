import React, { useState, useEffect } from "react";
import {
  Download,
  Play,
  Copy,
  Check,
  ExternalLink,
  Layers,
  HardDrive,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "../../api/client";
import type { MediaDetails, StreamItem } from "../../types";
import "./open-in-web.css";

interface OpenInWebModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  provider: string;
  link: string;
  type?: "movie" | "show" | "series";
  poster?: string;
  onPlayStream?: (streamUrl: string, title: string, fallbacks?: StreamItem[]) => void;
}

export const OpenInWebModal: React.FC<OpenInWebModalProps> = ({
  isOpen,
  onClose,
  title,
  provider,
  link,
  type = "movie",
  poster: initialPoster,
  onPlayStream,
}) => {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<MediaDetails | null>(null);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [activeProv, setActiveProv] = useState<string>(() => {
    let p = provider && provider !== "default" ? provider : "hdhub4u";
    if (p === "movieBox") return "movieBoxWeb";
    if (p.toLowerCase() === "prime" || p.toLowerCase() === "primemirror") return "primeMirror";
    if (p.toLowerCase() === "netflix" || p.toLowerCase() === "netflixmirror") return "netflixMirror";
    if (p.toLowerCase() === "disney" || p.toLowerCase() === "disneymirror") return "disneyMirror";
    return p;
  });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(0);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (provider && provider !== "default") {
      let p = provider;
      if (p === "movieBox") p = "movieBoxWeb";
      if (p.toLowerCase() === "prime" || p.toLowerCase() === "primemirror") p = "primeMirror";
      if (p.toLowerCase() === "netflix" || p.toLowerCase() === "netflixmirror") p = "netflixMirror";
      if (p.toLowerCase() === "disney" || p.toLowerCase() === "disneymirror") p = "disneyMirror";
      setActiveProv(p);
    }
  }, [provider]);

  useEffect(() => {
    if (!isOpen) return;
    if (!link && !title) return;

    let isMounted = true;
    setLoading(true);

    async function fetchData() {
      try {
        let initialStreams: StreamItem[] = [];
        let targetLink = link;
        let resolvedProv = activeProv;

        // 1. If link is already a direct playable/downloadable HTTP URL
        if (targetLink && (targetLink.startsWith("http://") || targetLink.startsWith("https://"))) {
          const isDirectMedia =
            targetLink.includes(".mp4") ||
            targetLink.includes(".mkv") ||
            targetLink.includes(".m3u8") ||
            targetLink.includes("pixeldrain.com") ||
            targetLink.includes("drive.google.com");

          if (isDirectMedia) {
            initialStreams.push({
              server: "Direct Stream Mirror",
              link: targetLink,
              quality: "1080p / Direct",
              type: targetLink.includes(".m3u8") ? "hls" : "mp4",
            });
            if (isMounted) setStreams(initialStreams);
          }
        }

        // 2. Attempt fetching meta from target provider
        let metaData: MediaDetails | null = null;
        let fetchedStreams: StreamItem[] = [];

        if (targetLink && !targetLink.startsWith("http://") && !targetLink.startsWith("https://")) {
          try {
            metaData = await api.getMeta(resolvedProv, targetLink);
            fetchedStreams = await api.getStreams(resolvedProv, targetLink, type, true);
          } catch (e) {
            console.warn(`Direct meta fetch on ${resolvedProv} failed, falling back to search:`, e);
          }
        }

        // 3. Fallback to title search if no streams/meta found yet
        if (!metaData && title) {
          const providersToTry = [
            resolvedProv,
            "hdhub4u",
            "vega",
            "movieBoxWeb",
            "moviesmod",
          ].filter((v, idx, arr) => arr.indexOf(v) === idx);

          for (const prov of providersToTry) {
            if (!isMounted) return;
            try {
              const results = await api.search(prov, title);
              if (results && results.length > 0) {
                const bestMatch = results[0];
                const matchedMeta = await api.getMeta(prov, bestMatch.link);
                const matchedStreams = await api.getStreams(prov, bestMatch.link, type, true);

                if (matchedMeta || (matchedStreams && matchedStreams.length > 0)) {
                  metaData = matchedMeta;
                  fetchedStreams = matchedStreams || [];
                  resolvedProv = prov;
                  break;
                }
              }
            } catch (err) {
              // Continue to next provider in fallback list
            }
          }
        }

        if (!isMounted) return;
        if (metaData) setMeta(metaData);
        setActiveProv(resolvedProv);

        const mergedStreams = [...initialStreams];
        fetchedStreams.forEach((s) => {
          if (!mergedStreams.some((existing) => existing.link === s.link)) {
            mergedStreams.push(s);
          }
        });
        setStreams(mergedStreams);
      } catch (err) {
        console.error("Failed to load web details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, provider, link, title, type, activeProv]);

  if (!isOpen) return null;

  const rawGroups = meta?.linkList || (meta as any)?.downloadLinks || (meta as any)?.episodes || [];
  const displayPoster = meta?.poster || meta?.image || initialPoster;
  const displayTitle = meta?.title || title;

  const handleModalClose = () => {
    try {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.get("open") === "web") {
          url.searchParams.delete("open");
          window.history.replaceState({}, "", url.toString());
        }
      }
    } catch (_) {}
    onClose();
  };

  const handleCopy = (url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCopyAll = () => {
    const allUrls: string[] = [];
    if (streams.length > 0) {
      streams.forEach((s) => allUrls.push(`${s.server} (${s.quality || "Default"}): ${s.link}`));
    } else if (rawGroups.length > 0) {
      rawGroups.forEach((g: any) => {
        if (g.directUrl) allUrls.push(`${g.title || displayTitle}: ${g.directUrl}`);
        if (g.url) allUrls.push(`${g.title || displayTitle}: ${g.url}`);
      });
    }
    navigator.clipboard?.writeText(allUrls.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2200);
  };

  const handlePlayDirect = (url: string, streamTitle: string) => {
    if (onPlayStream) {
      onPlayStream(url, streamTitle, streams);
    } else {
      window.open(url, "_blank");
    }
  };

  const getQualityBadgeClass = (q?: string) => {
    if (!q) return "cinema-quality-tag";
    const lower = q.toLowerCase();
    if (lower.includes("2160") || lower.includes("4k")) return "cinema-quality-tag res-4k";
    if (lower.includes("1080")) return "cinema-quality-tag res-1080";
    if (lower.includes("720")) return "cinema-quality-tag res-720";
    return "cinema-quality-tag";
  };

  return (
    <div className="cinema-open-web-backdrop" onClick={handleModalClose}>
      <div className="cinema-open-web-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Header Bar */}
        <div className="cinema-open-web-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="cinema-open-web-badge">C</span>
            <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "-0.3px" }}>
              Cinema Web Access
            </span>
            <span
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#94a3b8",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              {activeProv}
            </span>
          </div>

          <button className="cinema-open-web-close" onClick={handleModalClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="cinema-open-web-body">
          {/* Title Info Card */}
          <div className="cinema-open-web-info-card">
            {displayPoster && (
              <img
                src={displayPoster}
                alt={displayTitle}
                className="cinema-open-web-poster"
              />
            )}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                {displayTitle}
              </div>

              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "12px", color: "#94a3b8" }}>
                {meta?.year && (
                  <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.06)" }}>
                    {meta.year}
                  </span>
                )}
                {meta?.rating && (
                  <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.06)" }}>
                    Rating: {meta.rating}
                  </span>
                )}
                {meta?.runtime && (
                  <span style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.06)" }}>
                    {meta.runtime}
                  </span>
                )}
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(34, 197, 94, 0.12)",
                    color: "#4ade80",
                    fontWeight: 600,
                  }}
                >
                  Direct Stream & Download
                </span>
              </div>

              {meta?.synopsis && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#8e95a5",
                    lineHeight: 1.5,
                    margin: "4px 0 0 0",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {meta.synopsis}
                </p>
              )}

              {/* Action Toolbar */}
              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button className="cinema-action-btn-dark" onClick={handleCopyAll}>
                  {copiedAll ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                  <span>{copiedAll ? "Copied All Links" : "Copy All Links"}</span>
                </button>

                <a
                  href={`/vlc/?url=${encodeURIComponent(link)}&title=${encodeURIComponent(displayTitle)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cinema-action-btn-dark"
                >
                  <ExternalLink size={14} />
                  <span>Open in VLC</span>
                </a>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 0",
                gap: "12px",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              <Loader2 size={28} className="animate-spin" color="#ffffff" />
              <span>Fetching all download mirrors, qualities and stream links...</span>
            </div>
          )}

          {/* Qualities & Download Mirrors Section */}
          {!loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Layers size={16} color="#94a3b8" />
                  <span style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Available Qualities & Direct Mirrors
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  {streams.length > 0 ? `${streams.length} direct streams ready` : `${rawGroups.length} release packages`}
                </span>
              </div>

              {/* Streams List (Direct fast servers) */}
              {streams.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {streams.map((stream, idx) => (
                    <div key={idx} className="cinema-quality-item">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span className={getQualityBadgeClass(stream.quality)}>
                          {stream.quality || "HD"}
                        </span>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 600 }}>{stream.server}</div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            {stream.type?.toUpperCase()} • Direct High-Speed Cloud
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          className="cinema-action-btn-white"
                          onClick={() => handlePlayDirect(stream.link, `${displayTitle} (${stream.quality || "HD"})`)}
                        >
                          <Play size={13} fill="#000000" />
                          <span>Stream</span>
                        </button>

                        <a
                          href={stream.link}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="cinema-action-btn-dark"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </a>

                        <button
                          className="cinema-icon-btn-subtle"
                          onClick={() => handleCopy(stream.link)}
                          title="Copy direct link"
                        >
                          {copiedLink === stream.link ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw Release Groups (LinkList from scraper) */}
              {rawGroups.length > 0 && streams.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {rawGroups.map((group: any, idx: number) => {
                    const groupTitle = group.title || group.name || `Release ${idx + 1}`;
                    const isExpanded = expandedGroup === idx;
                    const items = group.items || group.links || (group.url ? [group] : []);

                    return (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: "12px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            cursor: "pointer",
                            background: isExpanded ? "rgba(255, 255, 255, 0.04)" : "transparent",
                          }}
                          onClick={() => setExpandedGroup(isExpanded ? null : idx)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <HardDrive size={16} color="#94a3b8" />
                            <span style={{ fontSize: "14px", fontWeight: 600 }}>{groupTitle}</span>
                            {group.size && (
                              <span style={{ fontSize: "11px", color: "#64748b", background: "rgba(255, 255, 255, 0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                                {group.size}
                              </span>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                        </div>

                        {isExpanded && items.length > 0 && (
                          <div style={{ padding: "10px 16px 14px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {items.map((item: any, iIdx: number) => {
                              const targetUrl = item.url || item.directUrl || item.link;
                              const label = item.title || item.name || `Mirror ${iIdx + 1}`;
                              if (!targetUrl) return null;

                              return (
                                <div
                                  key={iIdx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 12px",
                                    background: "rgba(255, 255, 255, 0.02)",
                                    borderRadius: "8px",
                                  }}
                                >
                                  <span style={{ fontSize: "13px", color: "#cbd5e1" }}>{label}</span>
                                  <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                      className="cinema-action-btn-white"
                                      style={{ padding: "4px 10px", fontSize: "11px" }}
                                      onClick={() => handlePlayDirect(targetUrl, `${displayTitle} - ${label}`)}
                                    >
                                      <Play size={11} fill="#000000" /> Play
                                    </button>

                                    <a
                                      href={targetUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="cinema-action-btn-dark"
                                      style={{ padding: "4px 10px", fontSize: "11px" }}
                                    >
                                      <Download size={11} /> Download
                                    </a>

                                    <button
                                      className="cinema-icon-btn-subtle"
                                      style={{ padding: "4px 8px" }}
                                      onClick={() => handleCopy(targetUrl)}
                                    >
                                      {copiedLink === targetUrl ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fallback if no streams found */}
              {!loading && streams.length === 0 && rawGroups.length === 0 && (
                <div
                  style={{
                    padding: "30px 20px",
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "#94a3b8",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={22} color="#64748b" />
                  <span style={{ fontSize: "14px" }}>
                    Direct links are being prepared on cluster nodes.
                  </span>
                  {link && link.startsWith("http") && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        marginTop: "6px",
                        color: "#ffffff",
                        fontSize: "12px",
                        textDecoration: "underline",
                      }}
                    >
                      Open Source Page Directly ↗
                    </a>
                  )}
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                    {["hdhub4u", "vega", "movieBoxWeb", "moviesmod"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setActiveProv(p)}
                        style={{
                          background: activeProv === p ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#ffffff",
                          fontSize: "11px",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        Try {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
