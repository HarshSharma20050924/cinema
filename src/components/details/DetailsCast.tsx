import React from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import { CastCard } from "./CastCard";
import type { TMDBCast } from "../../api/tmdb";

export interface DetailsCastProps {
  cast?: TMDBCast[];
  onSelectPerson?: (personId: number) => void;
}

export const DetailsCast: React.FC<DetailsCastProps> = ({
  cast,
  onSelectPerson,
}) => {
  if (!cast || cast.length === 0) return null;

  return (
    <div
      className="details-section-container"
      style={{
        width: "100%",
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "24px 48px 36px 48px",
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
        <ShadedHeading text="Cast" tag="h2" style={{ fontSize: "20px" }} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))",
          justifyItems: "center",
          gap: "20px 14px",
          paddingBottom: "12px",
        }}
      >
        {cast.map((actor) => (
          <CastCard
            key={actor.id}
            actor={actor}
            onSelectPerson={onSelectPerson}
          />
        ))}
      </div>
    </div>
  );
};
