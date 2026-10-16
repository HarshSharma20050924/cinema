import React, { useState } from "react";
import { DownloadIcon, XIcon, LoaderIcon, PlayIcon } from "../../icons";

export interface MoreLinksModalData {
  title: string;
  subtitle?: string;
  links: Array<{ name: string; url: string }>;
  loading?: boolean;
  mode?: "stream" | "download";
}

export interface MoreLinksModalProps {
  data: MoreLinksModalData | null;
  onClose: () => void;
  onDownloadUrl: (url: string, serverName: string, label?: string) => void;
  onPlayStream?: (url: string, title?: string) => void;
}

export const MoreLinksModal: React.FC<MoreLinksModalProps> = ({
  data,
  onClose,
  onDownloadUrl,
  onPlayStream,
}) => {
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [streamingIdx, setStreamingIdx] = useState<number | null>(null);

  if (!data) return null;

  const isStreamMode = data.mode === "stream";

  const handleDownload = (idx: number, url: string, name: string, subtitle?: string) => {
    setDownloadingIdx(idx);
    try {
      onDownloadUrl(url, name, subtitle);
    } finally {
      setTimeout(() => {
        setDownloadingIdx((curr) => (curr === idx ? null : curr));
      }, 6500);
    }
  };

  const handleStream = (idx: number, url: string, name: string) => {
    setStreamingIdx(idx);
    try {
      if (onPlayStream) {
        onPlayStream(url, `${data.title} ${data.subtitle ? `• ${data.subtitle}` : ""}`);
      }
    } finally {
      setTimeout(() => {
        setStreamingIdx((curr) => (curr === idx ? null : curr));
      }, 4000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "86vh",
          backgroundColor: "#0d111a",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(37, 99, 235, 0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            background: "linear-gradient(180deg, rgba(37, 99, 235, 0.1), transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: isStreamMode ? "#e50914" : "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isStreamMode ? (
                <PlayIcon size={18} color="#ffffff" fill="#ffffff" />
              ) : (
                <DownloadIcon size={18} color="#ffffff" />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
                {isStreamMode ? "Stream Servers & Mirrors" : "Download Servers"}
              </h3>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12px",
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {data.subtitle ? `${data.title} • ${data.subtitle}` : data.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.color = "#94a3b8";
            }}
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Servers List */}
        <div
          style={{
            padding: "16px 20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxHeight: "60vh",
          }}
        >
          {data.loading ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                color: "#93c5fd",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "3px solid rgba(59, 130, 246, 0.25)",
                  borderTopColor: "#3b82f6",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontSize: "14px", fontWeight: 600 }}>
                Fetching links...
              </span>
            </div>
          ) : data.links.length === 0 ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              No direct download mirrors found for this item.
            </div>
          ) : (
            data.links.map((linkItem, idx) => {
              const isDownloading = downloadingIdx === idx;
              return (
                <div
                  key={idx}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#f1f5f9",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {linkItem.name}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {/* Stream Mode -> ONLY Stream Button */}
                    {isStreamMode && onPlayStream && (
                      <button
                        disabled={streamingIdx === idx}
                        onClick={() => handleStream(idx, linkItem.url, linkItem.name)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 18px",
                          borderRadius: "8px",
                          background: streamingIdx === idx ? "#991b1b" : "#e50914",
                          border: "none",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: streamingIdx === idx ? "wait" : "pointer",
                          opacity: streamingIdx === idx ? 0.85 : 1,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (streamingIdx !== idx) e.currentTarget.style.background = "#b91c1c";
                        }}
                        onMouseLeave={(e) => {
                          if (streamingIdx !== idx) e.currentTarget.style.background = "#e50914";
                        }}
                        title="Stream or play directly in VLC"
                      >
                        {streamingIdx === idx ? (
                          <>
                            <LoaderIcon size={13} color="#ffffff" />
                            <span>Opening...</span>
                          </>
                        ) : (
                          <>
                            <PlayIcon size={12} color="#ffffff" fill="#ffffff" />
                            <span>Stream</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Download Mode -> ONLY Download Button */}
                    {!isStreamMode && (
                      <button
                        disabled={isDownloading}
                        onClick={() =>
                          handleDownload(idx, linkItem.url, linkItem.name, data.subtitle)
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 18px",
                          borderRadius: "8px",
                          background: isDownloading ? "#1d4ed8" : "#2563eb",
                          border: "none",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: isDownloading ? "wait" : "pointer",
                          opacity: isDownloading ? 0.85 : 1,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isDownloading) e.currentTarget.style.background = "#1d4ed8";
                        }}
                        onMouseLeave={(e) => {
                          if (!isDownloading) e.currentTarget.style.background = "#2563eb";
                        }}
                        title="Download file"
                      >
                        {isDownloading ? (
                          <>
                            <LoaderIcon size={13} color="#ffffff" />
                            <span>Preparing...</span>
                          </>
                        ) : (
                          <>
                            <DownloadIcon size={13} color="#ffffff" />
                            <span>Download</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            background: "rgba(0, 0, 0, 0.25)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              borderRadius: "8px",
              background: "#334155",
              border: "none",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
