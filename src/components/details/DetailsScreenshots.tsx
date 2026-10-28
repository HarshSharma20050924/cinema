import React, { useState, useRef } from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import { ChevronLeftIcon, ChevronRightIcon } from "../../icons";

export interface DetailsScreenshotsProps {
  screenshots: string[];
  posters?: string[];
  onSelectScreenshot: (index: number) => void;
}

interface PhotoCardItemProps {
  src: string;
  index: number;
  isStills: boolean;
  onClick: () => void;
}

const PhotoCardItem: React.FC<PhotoCardItemProps> = ({ src, index, isStills, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = isStills ? 10 : 8;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ x: rotateX, y: rotateY });
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        flex: isStills ? "0 0 clamp(320px, 26vw, 420px)" : "0 0 clamp(200px, 16vw, 240px)",
        width: isStills ? "clamp(320px, 26vw, 420px)" : "clamp(200px, 16vw, 240px)",
        cursor: "pointer",
        userSelect: "none",
        perspective: "1000px",
        zIndex: isHovered ? 12 : 1,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: isStills ? "16 / 9" : "2 / 3",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#0c0e14",
          border: isHovered
            ? "1px solid rgba(255, 255, 255, 0.35)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isStills ? 1.045 : 1.035}, ${isStills ? 1.045 : 1.035}, ${isStills ? 1.045 : 1.035})`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? isStills
              ? "0 22px 44px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0,0,0,0.5)"
              : "0 18px 36px rgba(0, 0, 0, 0.9)"
            : "0 6px 18px rgba(0, 0, 0, 0.6)",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease, border-color 0.25s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.4s ease",
        }}
      >
        <img
          src={src}
          alt={`Photo ${index + 1}`}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: isHovered
              ? `scale(${isStills ? 1.12 : 1.08}) translate3d(${tilt.y * -0.6}px, ${tilt.x * 0.6}px, 0px)`
              : "scale(1.0) translate3d(0px, 0px, 0px)",
            transition: isHovered
              ? "transform 0.08s ease-out"
              : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
};

export const DetailsScreenshots: React.FC<DetailsScreenshotsProps> = ({
  screenshots = [],
  posters = [],
  onSelectScreenshot,
}) => {
  const [activeTab, setActiveTab] = useState<"stills" | "posters">("stills");

  const displayList = activeTab === "stills" ? screenshots : (posters.length > 0 ? posters : screenshots);

  if (!displayList || displayList.length === 0) return null;

  return (
    <div
      id="details-screenshots-section"
      className="details-section-container"
      style={{
        width: "100%",
        padding: "20px 48px 36px 48px",
        position: "relative",
      }}
    >
      {/* Header with [Stills] [Posters] toggle pills */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
            Photos
          </h2>

          {/* Stills / Posters Toggle Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "999px",
              padding: "3px",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <button
              onClick={() => setActiveTab("stills")}
              style={{
                padding: "5px 16px",
                borderRadius: "999px",
                background: activeTab === "stills" ? "#e50914" : "transparent",
                color: activeTab === "stills" ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                fontSize: "12.5px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: activeTab === "stills" ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                transition: "all 0.18s ease",
              }}
            >
              Stills
            </button>
            <button
              onClick={() => setActiveTab("posters")}
              style={{
                padding: "5px 16px",
                borderRadius: "999px",
                background: activeTab === "posters" ? "#e50914" : "transparent",
                color: activeTab === "posters" ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                fontSize: "12.5px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: activeTab === "posters" ? "0 4px 14px rgba(229, 9, 20, 0.45)" : "none",
                transition: "all 0.18s ease",
              }}
            >
              Posters
            </button>
          </div>
        </div>

        <span style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.45)", fontWeight: 600 }}>
          {displayList.length} {activeTab === "stills" ? "Stills" : "Posters"}
        </span>
      </div>

      {/* Horizontal Scroll Shelf with 3D Tilt Cards */}
      <div
        className="cinema-no-scrollbar"
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          paddingBottom: "12px",
        }}
      >
        {displayList.map((shot, sIdx) => (
          <PhotoCardItem
            key={`${shot}-${sIdx}`}
            src={shot}
            index={sIdx}
            isStills={activeTab === "stills"}
            onClick={() => onSelectScreenshot(sIdx)}
          />
        ))}
      </div>
    </div>
  );
};
