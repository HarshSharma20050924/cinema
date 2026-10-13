import React, { useState } from "react";

export interface ScreenshotItemProps {
  shot: string;
  sIdx: number;
  onClick: () => void;
}

export const ScreenshotItem: React.FC<ScreenshotItemProps> = ({ shot, sIdx, onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <div
      onClick={onClick}
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: "14px",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        background: "#0c0c0c",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.75)",
        transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.04)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
        e.currentTarget.style.boxShadow =
          "0 14px 34px rgba(0, 0, 0, 0.9), 0 0 20px rgba(229, 9, 20, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.75)";
      }}
    >
      {!loaded && (
        <div
          className="skeleton-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
          }}
        />
      )}
      <img
        src={shot}
        alt={`Screenshot ${sIdx + 1}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        onError={() => setError(true)}
      />
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          right: "8px",
          padding: "3px 8px",
          borderRadius: "6px",
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: "10px",
          fontWeight: 700,
          zIndex: 2,
        }}
      >
        #{sIdx + 1}
      </div>
    </div>
  );
};
