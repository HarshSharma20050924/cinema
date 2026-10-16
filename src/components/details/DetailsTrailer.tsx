import React, { useState, useEffect } from "react";
import { ShadedHeading } from "../common/ShadedHeading";

export interface DetailsTrailerProps {
  trailerEmbed: string | null;
  trailerUrl: string | null;
  trailers?: Array<{ key: string; name: string; type: string }>;
  backdrop?: string | null;
  title?: string;
}

export const DetailsTrailer: React.FC<DetailsTrailerProps> = ({
  trailerEmbed,
  trailerUrl,
  trailers = [],
  backdrop,
  title,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Available videos list
  const validTrailers = trailers && trailers.length > 0 ? trailers : [];
  const currentTrailer = validTrailers[activeIndex] || null;

  // Resolved key & URLs
  const currentKey = currentTrailer?.key || (trailerUrl?.match(/[?&]v=([^&]+)/)?.[1]) || (trailerEmbed?.match(/embed\/([^?&]+)/)?.[1]) || null;
  const currentEmbedUrl = currentKey
    ? `https://www.youtube-nocookie.com/embed/${currentKey}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
    : trailerEmbed?.replace("www.youtube.com", "www.youtube-nocookie.com") || null;
  const currentWatchUrl = currentKey
    ? `https://www.youtube.com/watch?v=${currentKey}`
    : trailerUrl || null;

  // Reset error when switching trailer
  useEffect(() => {
    setHasError(false);
  }, [currentKey]);

  // Listen to YouTube Iframe API error messages (Code 150 / 101 = Owner disabled external embedding)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (
          data?.event === "onError" &&
          (data.info === 150 || data.info === 101 || data.info === 100 || data.info === 2)
        ) {
          setHasError(true);
        }
      } catch (_) {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentKey]);

  if (!currentEmbedUrl && !currentWatchUrl) return null;

  return (
    <div
      id="details-trailer-section"
      className="details-section-container"
      style={{
        width: "100%",
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "24px 48px 36px 48px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "4px",
              height: "20px",
              backgroundColor: "#e50914",
              borderRadius: "2px",
            }}
          />
          <ShadedHeading text="Official Trailer" tag="h2" style={{ fontSize: "20px" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Trailer selector pills if multiple available */}
          {validTrailers.length > 1 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {validTrailers.slice(0, 4).map((t, idx) => (
                <button
                  key={t.key || idx}
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    background: activeIndex === idx ? "#e50914" : "rgba(255, 255, 255, 0.08)",
                    border: activeIndex === idx ? "none" : "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: "999px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {t.type || `Trailer ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          {currentWatchUrl && (
            <a
              href={currentWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#cbd5e1",
                textDecoration: "none",
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#cbd5e1";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
              }}
            >
              <span>Watch on YouTube</span>
              <span>↗</span>
            </a>
          )}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "960px",
          margin: "0 auto",
          paddingBottom: "56.25%",
          height: 0,
          borderRadius: "18px",
          overflow: "hidden",
          background: "#080808",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(229, 9, 20, 0.18)",
        }}
      >
        {hasError ? (
          /* Graceful Cinema Fallback Card when studio disables 3rd party embedding */
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: backdrop ? `linear-gradient(rgba(10, 10, 15, 0.82), rgba(10, 10, 15, 0.92)), url(${backdrop})` : "linear-gradient(135deg, #160a1c 0%, #0a0612 100%)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(229, 9, 20, 0.2)",
                border: "1px solid rgba(229, 9, 20, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                boxShadow: "0 0 24px rgba(229, 9, 20, 0.35)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#e50914">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>

            <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", marginBottom: "6px" }}>
              Studio Playback Restricted
            </div>
            <div style={{ fontSize: "13px", color: "#9ca3af", maxWidth: "440px", marginBottom: "20px", lineHeight: "1.5" }}>
              The video owner restricts playback on third-party websites. You can watch the full official trailer directly on YouTube.
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              {currentWatchUrl && (
                <a
                  href={currentWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#e50914",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13px",
                    padding: "10px 20px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(229, 9, 20, 0.4)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <span>Watch on YouTube</span>
                  <span>↗</span>
                </a>
              )}

              {validTrailers.length > 1 && (
                <button
                  onClick={() => {
                    const nextIdx = (activeIndex + 1) % validTrailers.length;
                    setActiveIndex(nextIdx);
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "13px",
                    padding: "10px 18px",
                    borderRadius: "12px",
                    cursor: "pointer",
                  }}
                >
                  Try Alternative Video
                </button>
              )}
            </div>
          </div>
        ) : (
          currentEmbedUrl && (
            <iframe
              key={currentKey}
              src={currentEmbedUrl}
              title={title ? `${title} Trailer` : "Official Trailer"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          )
        )}
      </div>
    </div>
  );
};
