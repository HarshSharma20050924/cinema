import React from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import { RecommendationCard } from "./RecommendationCard";
import type { TMDBMediaItem } from "../../api/tmdb";
import type { Post } from "../../types";

export interface DetailsRecommendationsProps {
  recommendations?: TMDBMediaItem[];
  similar?: TMDBMediaItem[];
  targetProviderKey: string;
  onSelectRecommended?: (post: Post) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const DetailsRecommendations: React.FC<DetailsRecommendationsProps> = ({
  recommendations,
  similar,
  targetProviderKey,
  onSelectRecommended,
  containerRef,
}) => {
  return (
    <>
      {/* 1. RECOMMENDED ROW */}
      {recommendations && recommendations.length > 0 && (
        <div
          className="details-section-container"
          style={{
            width: "100%",
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "16px 48px 36px 48px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div
              style={{
                width: "4px",
                height: "20px",
                backgroundColor: "#e50914",
                borderRadius: "2px",
              }}
            />
            <ShadedHeading text="Recommended" tag="h2" style={{ fontSize: "20px" }} />
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              overflowX: "auto",
              paddingBottom: "12px",
              scrollbarWidth: "none",
            }}
          >
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                item={rec}
                targetProviderKey={targetProviderKey}
                onSelect={onSelectRecommended}
                containerRef={containerRef}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. SIMILAR MOVIES ROW */}
      {similar && similar.length > 0 && (
        <div
          className="details-section-container"
          style={{
            width: "100%",
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "16px 48px 80px 48px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div
              style={{
                width: "4px",
                height: "20px",
                backgroundColor: "#e50914",
                borderRadius: "2px",
              }}
            />
            <ShadedHeading text="Similar Movies" tag="h2" style={{ fontSize: "20px" }} />
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              overflowX: "auto",
              paddingBottom: "12px",
              scrollbarWidth: "none",
            }}
          >
            {similar.map((sim) => (
              <RecommendationCard
                key={sim.id}
                item={sim}
                targetProviderKey={targetProviderKey}
                onSelect={onSelectRecommended}
                containerRef={containerRef}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};
