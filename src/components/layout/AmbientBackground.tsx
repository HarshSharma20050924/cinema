import React from "react";

interface AmbientBackgroundProps {
  activeCustomPage: string | null;
  searchQuery: string;
  bgLayerA: string | null;
  bgLayerB: string | null;
  activeBgLayer: "A" | "B";
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  activeCustomPage,
  searchQuery,
  bgLayerA,
  bgLayerB,
  activeBgLayer,
}) => {
  if (activeCustomPage || searchQuery || (!bgLayerA && !bgLayerB)) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        backgroundColor: "#0a0c10",
      }}
    >
      {/* Layer A */}
      {bgLayerA && (
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "-15%",
            width: "130%",
            height: "130%",
            backgroundImage: `url(${bgLayerA})`,
            backgroundSize: "cover",
            backgroundPosition: "center 25%",
            filter: "blur(75px) saturate(2.2) brightness(0.68)",
            opacity: activeBgLayer === "A" ? 1 : 0,
            transition: "opacity 1.2s cubic-bezier(0.25, 1, 0.5, 1)",
            willChange: "opacity",
            transform: "translate3d(0, 0, 0)",
          }}
        />
      )}

      {/* Layer B */}
      {bgLayerB && (
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "-15%",
            width: "130%",
            height: "130%",
            backgroundImage: `url(${bgLayerB})`,
            backgroundSize: "cover",
            backgroundPosition: "center 25%",
            filter: "blur(75px) saturate(2.2) brightness(0.68)",
            opacity: activeBgLayer === "B" ? 1 : 0,
            transition: "opacity 1.2s cubic-bezier(0.25, 1, 0.5, 1)",
            willChange: "opacity",
            transform: "translate3d(0, 0, 0)",
          }}
        />
      )}

      {/* Atmospheric gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(10, 12, 16, 0.06) 0%, rgba(10, 12, 16, 0.16) 35%, rgba(10, 12, 16, 0.3) 70%, rgba(10, 12, 16, 0.45) 100%)",
        }}
      />
    </div>
  );
};
