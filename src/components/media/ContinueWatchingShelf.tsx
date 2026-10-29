import React, { useState, useEffect, useRef } from "react";
import { PlayIcon, CloseIcon } from "../../icons";
import {
  getContinueWatchingList,
  removeContinueWatching,
  formatTimeRemaining,
  type ContinueWatchingItem,
} from "../../utils/continueWatchingService";
import { optimizeImage } from "../../utils/imageOptimizer";

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onResume: (item: ContinueWatchingItem) => void;
  onRemove: (id: string, e: React.MouseEvent) => void;
  width?: number;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({
  item,
  onResume,
  onRemove,
  width = 295,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / (rect.height / 2)) * -8,
      y: (x / (rect.width / 2)) * 8,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const rawImg = item.backdrop || item.poster || "";
  const displayImg = optimizeImage(rawImg, "backdrop");
  const timeRemaining = formatTimeRemaining(item.currentTime, item.duration);
  const episodeTag = item.season && item.episode ? `S${item.season} E${item.episode}` : null;

  return (
    <div
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "9px",
        cursor: "pointer",
        perspective: "1000px",
        userSelect: "none",
        zIndex: isHovered ? 12 : 1,
      }}
      onClick={() => onResume(item)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Landscape Card matching MediaCard exactly */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#0c0d12",
          border: isHovered ? "1px solid rgba(255, 255, 255, 0.22)" : "1px solid rgba(255, 255, 255, 0.08)",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.045, 1.045, 1.045)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 22px 44px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 0, 0, 0.5)"
            : "0 6px 18px rgba(0, 0, 0, 0.55)",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease, border-color 0.2s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease, border-color 0.3s ease",
        }}
      >
        {/* Backdrop Artwork */}
        {displayImg && !imgError ? (
          <img
            src={displayImg}
            alt={item.title}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.4s ease",
              transform: isHovered ? "scale(1.05)" : "scale(1)",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #181b24 0%, #0d0f14 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255, 255, 255, 0.6)" }}>
              {item.title}
            </span>
          </div>
        )}

        {/* Ambient Dark Bottom Vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.2) 50%, transparent 80%)",
            pointerEvents: "none",
          }}
        />

        {/* Dynamic 3D Glare Light */}
        {isHovered && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at ${50 + tilt.y * 3}% ${
                50 - tilt.x * 3
              }%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`,
              pointerEvents: "none",
              mixBlendMode: "overlay",
            }}
          />
        )}

        {/* Center Frosted Glass Play Icon on Hover */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "scale(1)" : "scale(0.85)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#e50914",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(229, 9, 20, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            <PlayIcon size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: "2px" }} />
          </div>
        </div>

        {/* Top-Right Remove/Dismiss Button */}
        <button
          onClick={(e) => onRemove(item.id, e)}
          title="Remove from Continue Watching"
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            zIndex: 6,
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "rgba(14, 16, 22, 0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.18s ease, transform 0.18s ease, background 0.18s ease",
            transform: isHovered ? "scale(1)" : "scale(0.8)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(14, 16, 22, 0.75)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
          }}
        >
          <CloseIcon size={14} color="#ffffff" />
        </button>

        {/* Bottom-Left Time Remaining Badge */}
        {timeRemaining && (
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "10px",
              zIndex: 4,
              padding: "3px 8px",
              borderRadius: "999px",
              background: "rgba(10, 12, 18, 0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              fontSize: "11px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.2px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
              pointerEvents: "none",
            }}
          >
            {timeRemaining}
          </div>
        )}

        {/* Episode Tag for Series */}
        {episodeTag && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "10px",
              zIndex: 4,
              padding: "3px 8px",
              borderRadius: "999px",
              background: "rgba(10, 12, 18, 0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "0.4px",
              pointerEvents: "none",
            }}
          >
            {episodeTag}
          </div>
        )}

        {/* STRICT REQUIREMENT: Red Progress Bar at the bottom showing exact watched progress */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: isHovered ? "5px" : "3.5px",
            background: "rgba(255, 255, 255, 0.22)",
            zIndex: 5,
            transition: "height 0.15s ease",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(3, item.progressPercent || 0))}%`,
              height: "100%",
              background: "#e50914",
              boxShadow: "0 0 10px rgba(229, 9, 20, 0.8)",
              borderRadius: "0 999px 999px 0",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Meta Below Card */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 2px" }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#ffffff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.5)",
            fontWeight: 500,
          }}
        >
          <span>{Math.round(item.progressPercent)}% watched</span>
          {item.year && <span>• {item.year}</span>}
          {item.episodeTitle && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>• {item.episodeTitle}</span>}
        </div>
      </div>
    </div>
  );
};

export interface ContinueWatchingShelfProps {
  onResume: (item: ContinueWatchingItem) => void;
  onOpenModal: () => void;
}

export const ContinueWatchingShelf: React.FC<ContinueWatchingShelfProps> = ({
  onResume,
  onOpenModal,
}) => {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const loadItems = () => {
    setItems(getContinueWatchingList());
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener("cinema:continue_watching_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("cinema:continue_watching_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
  }, [items]);

  const handleScroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = dir === "left" ? -640 : 640;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    setTimeout(updateScrollButtons, 350);
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeContinueWatching(id);
  };

  if (!items || items.length === 0) return null;

  return (
    <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#ffffff",
              margin: 0,
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>Continue Watching</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(229, 9, 20, 0.16)",
                border: "1px solid rgba(229, 9, 20, 0.4)",
                color: "#ff4d58",
                letterSpacing: "0.2px",
              }}
            >
              {items.length}
            </span>
          </h2>
        </div>

        <button
          onClick={onOpenModal}
          style={{
            padding: "5px 14px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(229, 9, 20, 0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          View All →
        </button>
      </div>

      {/* Relative Carousel Row */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Left Frosted Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll("left")}
            aria-label="Scroll Left"
            style={{
              position: "absolute",
              left: "-18px",
              top: "calc(50% - 16px)",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(18, 20, 26, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.65)",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e50914";
              e.currentTarget.style.borderColor = "#e50914";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(18, 20, 26, 0.65)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: "bold" }}>‹</span>
          </button>
        )}

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="cinema-no-scrollbar"
          style={{
            display: "flex",
            gap: "18px",
            overflowX: "auto",
            overflowY: "hidden",
            padding: "8px 4px 14px 4px",
            scrollBehavior: "smooth",
          }}
        >
          {items.map((item) => (
            <ContinueWatchingCard
              key={item.id}
              item={item}
              onResume={onResume}
              onRemove={handleRemove}
            />
          ))}
        </div>

        {/* Right Frosted Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll("right")}
            aria-label="Scroll Right"
            style={{
              position: "absolute",
              right: "-18px",
              top: "calc(50% - 16px)",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(18, 20, 26, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.65)",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e50914";
              e.currentTarget.style.borderColor = "#e50914";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(18, 20, 26, 0.65)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: "bold" }}>›</span>
          </button>
        )}
      </div>
    </div>
  );
};
