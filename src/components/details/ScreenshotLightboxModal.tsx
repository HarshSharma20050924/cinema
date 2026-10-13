import React, { useEffect } from "react";
import { XIcon } from "../../icons";

export interface ScreenshotLightboxModalProps {
  screenshots: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const ScreenshotLightboxModal: React.FC<ScreenshotLightboxModalProps> = ({
  screenshots,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  useEffect(() => {
    if (currentIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        onNavigate(currentIndex > 0 ? currentIndex - 1 : screenshots.length - 1);
      } else if (e.key === "ArrowRight") {
        onNavigate(currentIndex < screenshots.length - 1 ? currentIndex + 1 : 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, screenshots.length, onClose, onNavigate]);

  if (currentIndex === null || currentIndex < 0 || currentIndex >= screenshots.length) {
    return null;
  }

  const currentImage = screenshots[currentIndex];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 13000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.94)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        padding: "20px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      {/* Top Bar with counter & close */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "24px",
          right: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#ffffff",
            padding: "6px 14px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(10px)",
          }}
        >
          Capture {currentIndex + 1} of {screenshots.length}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#ff2b38";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }}
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Previous Button */}
      {screenshots.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex > 0 ? currentIndex - 1 : screenshots.length - 1);
          }}
          style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(20, 20, 20, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            fontSize: "24px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#ff2b38";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(20, 20, 20, 0.8)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          ‹
        </button>
      )}

      {/* Main Large Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: "92vw",
          maxHeight: "85vh",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95)",
        }}
      >
        <img
          src={currentImage}
          alt={`Screenshot ${currentIndex + 1}`}
          style={{
            maxWidth: "92vw",
            maxHeight: "85vh",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* Next Button */}
      {screenshots.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex < screenshots.length - 1 ? currentIndex + 1 : 0);
          }}
          style={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(20, 20, 20, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            fontSize: "24px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#ff2b38";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(20, 20, 20, 0.8)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          ›
        </button>
      )}
    </div>
  );
};
