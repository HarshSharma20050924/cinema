import React, { useRef } from "react";
import { WATCH_PROVIDERS, type WatchProviderItem } from "../../data/watchProvidersData";
import type { Provider } from "../../types";

interface BrowseByProviderShelfProps {
  providers?: Provider[];
  activeProviderKey?: string;
  onSelectProvider?: (provider: Provider) => void;
  onSelectWatchProvider?: (provider: WatchProviderItem) => void;
  selectedWatchProviderId?: number;
}

export const BrowseByProviderShelf: React.FC<BrowseByProviderShelfProps> = ({
  onSelectWatchProvider,
  selectedWatchProviderId,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -380, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 380, behavior: "smooth" });
    }
  };

  return (
    <div
      className="browse-provider-shelf-container"
      style={{
        width: "100%",
        padding: "12px 0 24px 0",
        background: "transparent",
        position: "relative",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px 16px 48px",
        }}
      >
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-main)",
          }}
        >
          Browse by Provider-(Under Development but all movies and series still available of this provider you can browse )
        </h2>
      </div>

      {/* Scroller Wrapper */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Left Arrow Button */}
        <button
          onClick={scrollLeft}
          title="Scroll Left"
          style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.10)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.20)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.6)",
            transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1.12)";
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.20)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Scrollable Track (Matches User Screenshot) */}
        <div
          ref={scrollRef}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "22px",
            overflowX: "auto",
            scrollBehavior: "smooth",
            padding: "8px 48px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {WATCH_PROVIDERS.map((wp) => {
            const isActive = selectedWatchProviderId === wp.id;

            return (
              <button
                key={wp.id}
                onClick={() => onSelectWatchProvider?.(wp)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "9px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                  flexShrink: 0,
                  width: "84px",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {/* OTT Provider Square Icon Box (Direct Original Icon) */}
                <div
                  style={{
                    width: "74px",
                    height: "74px",
                    borderRadius: "18px",
                    background: "transparent",
                    border: isActive
                      ? "2px solid #e50914"
                      : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    boxShadow: isActive
                      ? "0 0 0 2.5px #e50914, 0 10px 28px rgba(229, 9, 20, 0.55)"
                      : "0 6px 18px rgba(0, 0, 0, 0.45)",
                    transition: "all 0.2s ease",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={wp.logo}
                    alt={wp.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "18px",
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                {/* Clear Label Underneath (Screenshot Style) */}
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
                    textAlign: "center",
                    whiteSpace: "normal",
                    lineHeight: 1.25,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "88px",
                    transition: "color 0.2s",
                  }}
                >
                  {wp.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={scrollRight}
          title="Scroll Right"
          style={{
            position: "absolute",
            right: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.10)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.20)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.6)",
            transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1.12)";
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.20)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};