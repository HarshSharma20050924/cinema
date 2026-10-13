import React from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import { ScreenshotItem } from "./ScreenshotItem";

export interface DetailsScreenshotsProps {
  screenshots: string[];
  onSelectScreenshot: (index: number) => void;
}

export const DetailsScreenshots: React.FC<DetailsScreenshotsProps> = ({
  screenshots,
  onSelectScreenshot,
}) => {
  if (!screenshots || screenshots.length === 0) return null;

  return (
    <div
      id="details-screenshots-section"
      className="details-section-container"
      style={{
        width: "100%",
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "20px 48px 36px 48px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "10px",
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
          <ShadedHeading text="Screenshots & Stills" tag="h2" style={{ fontSize: "20px" }} />
        </div>

        <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}>
          {screenshots.length} {screenshots.length === 1 ? "Still" : "Stills"} • Click to enlarge
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
          paddingBottom: "14px",
        }}
      >
        {screenshots.map((shot, sIdx) => (
          <ScreenshotItem
            key={`${shot}-${sIdx}`}
            shot={shot}
            sIdx={sIdx}
            onClick={() => onSelectScreenshot(sIdx)}
          />
        ))}
      </div>
    </div>
  );
};
