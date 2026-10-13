import React from "react";
import { ShadedHeading } from "../common/ShadedHeading";

export interface DetailsTrailerProps {
  trailerEmbed: string | null;
  trailerUrl: string | null;
}

export const DetailsTrailer: React.FC<DetailsTrailerProps> = ({
  trailerEmbed,
  trailerUrl,
}) => {
  if (!trailerEmbed) return null;

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

        {trailerUrl && (
          <a
            href={trailerUrl}
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
        <iframe
          src={trailerEmbed}
          title="Official Trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
      </div>
    </div>
  );
};
