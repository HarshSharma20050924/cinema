import React, { useRef, useState, useEffect } from "react";
import { MediaCard } from "./MediaCard";
import { ChevronLeftIcon, ChevronRightIcon } from "../../icons";
import type { Post } from "../../types";

interface GlobalSearchShelfProps {
  providerName: string;
  providerKey: string;
  posts: Post[];
  onSelectPost: (post: Post) => void;
}

export const GlobalSearchShelf: React.FC<GlobalSearchShelfProps> = ({
  providerName,
  posts,
  onSelectPost,
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [posts]);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 350);
    }
  };

  if (posts.length === 0) return null;

  return (
    <section
      className="global-search-shelf"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        width: "100%",
        marginBottom: "36px",
      }}
    >
      {/* Shelf Header - Title & Count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            {providerName}
          </h3>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            {posts.length} {posts.length === 1 ? "result" : "results"}
          </span>
        </div>
      </div>

      {/* Horizontal Carousel with Floating Overlay Arrows */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Floating Left Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll Left"
            style={{
              position: "absolute",
              left: "6px",
              top: "45%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(255, 255, 255, 0.20)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
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
            <ChevronLeftIcon size={20} />
          </button>
        )}

        {/* Floating Right Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll Right"
            style={{
              position: "absolute",
              right: "6px",
              top: "45%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(255, 255, 255, 0.20)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
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
            <ChevronRightIcon size={20} />
          </button>
        )}

        {/* Horizontal Scrollable Shelf */}
        <div
          ref={rowRef}
          onScroll={checkScroll}
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            padding: "6px 4px 16px 4px",
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {posts.map((post, idx) => (
            <div
              key={`${post.provider || ""}-${post.link}-${idx}`}
              style={{
                width: "170px",
                flexShrink: 0,
              }}
            >
              <MediaCard post={post} onClick={onSelectPost} hideProviderBadge={true} priority={idx < 8} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
