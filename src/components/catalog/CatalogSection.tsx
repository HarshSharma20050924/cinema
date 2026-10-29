import React, { useEffect, useState, useRef } from "react";
import { MediaCard } from "../media/MediaCard";
import { ShadedHeading } from "../common/ShadedHeading";
import { ChevronLeftIcon, ChevronRightIcon } from "../../icons";
import { api } from "../../api/client";
import { appCache } from "../../utils/cache";
import type { Post } from "../../types";

interface CatalogSectionProps {
  title: string;
  filter: string;
  providerValue: string;
  initialPosts?: Post[];
  onViewAll: (filter: string, title: string) => void;
  onSelectPost: (post: Post) => void;
  layout?: "landscape" | "portrait";
  showRank?: boolean;
  showDateBadge?: boolean;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  title,
  filter,
  providerValue,
  initialPosts,
  onViewAll,
  onSelectPost,
  layout,
  showRank,
  showDateBadge,
}) => {
  const isTop10 = Boolean(showRank || title.toLowerCase().includes("top 10") || title.toLowerCase().includes("ranking"));
  const isComingSoon = Boolean(showDateBadge || title.toLowerCase().includes("coming soon"));
  const isLandscape = layout === "landscape";
  const getCachedPosts = (): Post[] => {
    if (initialPosts && initialPosts.length > 0) return initialPosts;
    if (!providerValue) return [];
    return appCache.get<Post[]>(`api:posts:${providerValue}:${filter || "default"}:p1`) || [];
  };

  const [posts, setPosts] = useState<Post[]>(getCachedPosts);
  const [loading, setLoading] = useState<boolean>(() => getCachedPosts().length === 0);
  const [viewAllHover, setViewAllHover] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);

  useEffect(() => {
    if (initialPosts && initialPosts.length > 0) {
      setPosts(initialPosts);
      setLoading(false);
      return;
    }

    if (!providerValue) return;

    let mounted = true;
    const cached = getCachedPosts();
    if (cached.length > 0) {
      setPosts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function loadSectionPosts() {
      try {
        const results = await api.getPosts(providerValue, filter, 1);
        if (mounted && Array.isArray(results) && results.length > 0) {
          setPosts(results);
        }
      } catch (err) {
        console.warn(`Failed loading section ${title}:`, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSectionPosts();
    return () => {
      mounted = false;
    };
  }, [providerValue, filter, initialPosts]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = Math.max(container.clientWidth * 0.82, 340);
    container.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const [showSlowLoadHint, setShowSlowLoadHint] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSlowLoadHint(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSlowLoadHint(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Don't render empty finished sections (prevents flash of header with empty cards)
  if (!loading && posts.length === 0) {
    return null;
  }

  // While loading, show minimal skeleton placeholder (no header yet)
  if (loading) {
    return (
      <section style={{ width: "100%", marginBottom: "34px" }}>
        <div
          style={{
            display: "flex",
            gap: "14px",
            overflowX: "hidden",
            padding: "4px 48px 12px 48px",
          }}
        >
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="skeleton"
              style={{
                flex: isLandscape
                  ? "0 0 clamp(300px, 24vw, 360px)"
                  : "0 0 clamp(185px, 15vw, 215px)",
                aspectRatio: isLandscape ? "16/9" : "2/3",
                borderRadius: "14px",
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        width: "100%",
        margin: "0 0 38px 0",
        position: "relative",
      }}
      onMouseEnter={() => setShowArrows(true)}
      onMouseLeave={() => setShowArrows(false)}
    >
      {/* Header: Cno.to style title with chevron that turns red on hover */}
      <div
        className="catalog-section-header"
        onClick={() => onViewAll(filter, title)}
        onMouseEnter={() => setViewAllHover(true)}
        onMouseLeave={() => setViewAllHover(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "14px",
          padding: "0 48px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <h2
          style={{
            fontSize: "21px",
            fontWeight: 800,
            color: viewAllHover ? "#e50914" : "#ffffff",
            letterSpacing: "-0.01em",
            margin: 0,
            transition: "color 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>{title}</span>
          <ChevronRightIcon
            size={18}
            color={viewAllHover ? "#e50914" : "rgba(255, 255, 255, 0.45)"}
            style={{
              transition: "all 0.2s ease",
              transform: viewAllHover ? "translateX(3px)" : "translateX(0)",
            }}
          />
        </h2>
      </div>

      {/* Carousel Container */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Left Scroll Button */}
        {/* Left Scroll Button (Translucent Frosted Glass Navbar UI) */}
        {showArrows && (
          <button
            onClick={() => handleScroll("left")}
            aria-label="Scroll Left"
            className="desktop-only catalog-arrow-left"
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.10)",
              border: "1px solid rgba(255, 255, 255, 0.20)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
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

        {/* Right Scroll Button (Translucent Frosted Glass Navbar UI) */}
        {showArrows && (
          <button
            onClick={() => handleScroll("right")}
            aria-label="Scroll Right"
            className="desktop-only catalog-arrow-right"
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.10)",
              border: "1px solid rgba(255, 255, 255, 0.20)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
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

        {/* Scrollable Track (Stretches full-width across screen, no gaps) */}
        <div
          ref={scrollRef}
          className="catalog-row-track"
          style={{
            display: "flex",
            gap: "14px",
            overflowX: "auto",
            padding: "4px 48px 16px 48px",
            scrollBehavior: "smooth",
            scrollbarWidth: "none",
          }}
        >
          {posts.slice(0, 20).map((post, idx) => (
            <div
              key={`${post.provider || ""}:${post.link}-${idx}`}
              className={`catalog-row-item ${isLandscape ? "catalog-row-item-landscape" : ""}`}
              style={{
                flex: isLandscape
                  ? "0 0 clamp(320px, 26vw, 400px)"
                  : "0 0 clamp(180px, 14vw, 210px)",
                width: isLandscape
                  ? "clamp(320px, 26vw, 400px)"
                  : "clamp(180px, 14vw, 210px)",
              }}
            >
              <MediaCard
                key={`${post.provider || ""}:${post.link}-${idx}`}
                post={post}
                onClick={onSelectPost}
                priority={idx < 8}
                layout={isLandscape ? "landscape" : "portrait"}
                rank={isTop10 && idx < 10 ? idx + 1 : undefined}
                badge={isComingSoon ? (post.tag || post.year || undefined) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
