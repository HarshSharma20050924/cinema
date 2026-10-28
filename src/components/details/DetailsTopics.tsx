import React from "react";
import type { TMDBProvider } from "../../api/tmdb";

export interface DetailsTopicsProps {
  topics?: string[];
  watchProviders?: {
    stream?: TMDBProvider[];
    free?: TMDBProvider[];
    buy?: TMDBProvider[];
  };
  onSelectTopic?: (topic: string) => void;
}

export const DetailsTopics: React.FC<DetailsTopicsProps> = ({
  topics = [],
  watchProviders,
  onSelectTopic,
}) => {
  const hasTopics = Boolean(topics && topics.length > 0);
  const hasStream = Boolean(watchProviders?.stream && watchProviders.stream.length > 0);
  const hasFree = Boolean(watchProviders?.free && watchProviders.free.length > 0);
  const hasBuy = Boolean(watchProviders?.buy && watchProviders.buy.length > 0);
  const hasProviders = hasStream || hasFree || hasBuy;

  if (!hasTopics && !hasProviders) return null;

  const renderProviderSection = (title: string, list?: TMDBProvider[]) => {
    if (!list || list.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#94a3b8",
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {list.map((provider, i) => (
            <div
              key={i}
              title={provider.name}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#121620",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                transition: "transform 0.18s ease, border-color 0.18s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
              }}
            >
              <img
                src={provider.logo}
                alt={provider.name}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="details-topics-and-watch-section"
      style={{
        width: "100%",
        padding: "24px 48px 36px 48px",
      }}
    >
      {/* 1. TOPICS */}
      {hasTopics && (
        <>
          <div style={{ marginBottom: "16px" }}>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                margin: 0,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Topics
            </h2>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {topics.map((topic, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectTopic && onSelectTopic(topic)}
                style={{
                  padding: "7px 18px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: onSelectTopic ? "pointer" : "default",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  if (onSelectTopic) {
                    e.currentTarget.style.background = "#e50914";
                    e.currentTarget.style.borderColor = "#e50914";
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "scale(1.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (onSelectTopic) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
                    e.currentTarget.style.color = "#cbd5e1";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 2. WHERE TO WATCH (Placed directly under Topics matching Screenshot 2) */}
      {hasProviders && (
        <div style={{ marginTop: hasTopics ? "32px" : "0" }}>
          <div style={{ marginBottom: "16px" }}>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.01em",
                margin: 0,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Where to Watch
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              gap: "40px",
              flexWrap: "wrap",
              alignItems: "flex-start",
              marginBottom: "12px",
            }}
          >
            {renderProviderSection("Stream", watchProviders?.stream)}
            {renderProviderSection("Free", watchProviders?.free)}
            {renderProviderSection("Buy", watchProviders?.buy)}
          </div>

          <div
            style={{
              fontSize: "11.5px",
              color: "#64748b",
              marginTop: "12px",
            }}
          >
            Availability data by JustWatch.
          </div>
        </div>
      )}
    </div>
  );
};
