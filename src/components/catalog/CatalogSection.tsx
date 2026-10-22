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
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  title,
  filter,
  providerValue,
  initialPosts,
  onViewAll,
}) => {
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
    const scrollAmount = direction === "left" ? -550 : 550;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
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
            padding: "4px 24px 12px 24px",
          }}
        >
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="skeleton"
              style={{
                flex: "0 0 clamp(150px, 14vw, 180px)",
                aspectRatio: "2/3",
                borderRadius: "14px",
              }}
            />
          ))}
        </div>
        {showSlowLoadHint && (
          <div
            style={{
              padding: "0 24px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.65)",
            }}
          >
            <span>Taking longer to load.</span>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ↻ Reload
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      style={{
        width: "100%",
        maxWidth: "1440px",
        margin: "0 auto 34px auto",
        position: "relative",
      }}
      onMouseEnter={() => setShowArrows(true)}
      onMouseLeave={() => setShowArrows(false)}
    >
      {/* Header: Red vertical indicator line + Title + View All button */}
      <div
        className="catalog-section-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          padding: "0 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "3.5px",
              height: "18px",
              backgroundColor: "#e50914",
              borderRadius: "2px",
            }}
          />
          <ShadedHeading
            text={title}
            style={{
              fontSize: "19px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          />
        </div>

        {/* View All Pill Button (Matches Gram Cinema) */}
        <button
          onClick={() => onViewAll(filter, title)}
          onMouseEnter={() => setViewAllHover(true)}
          onMouseLeave={() => setViewAllHover(false)}
          style={{
            padding: "5px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            border: "none",
            background: viewAllHover ? "#e50914" : "rgba(229, 9, 20, 0.15)",
            color: viewAllHover ? "#ffffff" : "#ff4d5a",
            boxShadow: viewAllHover ? "0 2px 10px rgba(229, 9, 20, 0.4)" : "none",
          }}
        >
          <span>View All</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* Carousel Container */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Left Scroll Button */}
        {showArrows && (
          <button
            onClick={() => handleScroll("left")}
            style={{
              position: "absolute",
              left: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(12, 12, 12, 0.92)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ChevronLeftIcon size={18} />
          </button>
        )}

        {/* Right Scroll Button */}
        {showArrows && (
          <button
            onClick={() => handleScroll("right")}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(12, 12, 12, 0.92)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ChevronRightIcon size={18} />
          </button>
        )}

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="catalog-row-track"
          style={{
            display: "flex",
            gap: "14px",
            overflowX: "auto",
            padding: "4px 24px 12px 24px",
            scrollBehavior: "smooth",
            scrollbarWidth: "none",
          }}
        >
          {posts.slice(0, 20).map((post, idx) => (
            <div
              key={`${post.provider || ""}:${post.link}-${idx}`}
              className="catalog-row-item"
              style={{
                flex: "0 0 155px",
                width: "155px",
              }}
            >
              <MediaCard
                key={`${post.provider || ""}:${post.link}-${idx}`}
                post={post}
                onClick={onSelectPost}
                priority={idx < 8}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
