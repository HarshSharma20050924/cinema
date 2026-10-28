import React from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import type { TMDBProvider } from "../../api/tmdb";

export interface DetailsWhereToWatchProps {
  watchProviders?: {
    stream?: TMDBProvider[];
    free?: TMDBProvider[];
    buy?: TMDBProvider[];
  };
}

export const DetailsWhereToWatch: React.FC<DetailsWhereToWatchProps> = ({ watchProviders }) => {
  if (
    !watchProviders ||
    (!watchProviders.stream?.length &&
      !watchProviders.free?.length &&
      !watchProviders.buy?.length)
  ) {
    return null;
  }

  const renderSection = (title: string, list?: TMDBProvider[]) => {
    if (!list || list.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
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
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#161b26",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
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
      className="details-watch-providers-section"
      style={{
        width: "100%",
        padding: "24px 48px 36px 48px",
      }}
    >
      <div style={{ marginBottom: "18px" }}>
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
        {renderSection("Stream", watchProviders.stream)}
        {renderSection("Free", watchProviders.free)}
        {renderSection("Buy", watchProviders.buy)}
      </div>

      <div
        style={{
          fontSize: "11px",
          color: "#64748b",
          marginTop: "10px",
        }}
      >
        Availability data by JustWatch.
      </div>
    </div>
  );
};
