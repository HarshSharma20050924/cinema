import React, { useRef } from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import { CastCard } from "./CastCard";
import { ChevronLeftIcon, ChevronRightIcon } from "../../icons";
import type { TMDBCast } from "../../api/tmdb";

export interface DetailsCastProps {
  cast?: TMDBCast[];
  onSelectPerson?: (personId: number) => void;
}

export const DetailsCast: React.FC<DetailsCastProps> = ({
  cast,
  onSelectPerson,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!cast || cast.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div
      className="details-section-container"
      style={{
        width: "100%",
        padding: "24px 48px 36px 48px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
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
          Cast & Crew
        </h2>

        <span style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.45)", fontWeight: 600 }}>
          {cast.length} {cast.length === 1 ? "Person" : "Members"}
        </span>
      </div>

      {/* Horizontal Scrolling Row */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: "20px",
          overflowX: "auto",
          scrollBehavior: "smooth",
          paddingBottom: "12px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
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
