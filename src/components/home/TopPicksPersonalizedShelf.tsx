import React, { useState, useEffect, useRef } from "react";
import type { MediaPost } from "../../types";
import { MediaCard } from "../media/MediaCard";
import { getActiveProfile, getProfilePersonalization, isUserSignedIn } from "../../utils/profileService";

interface TopPicksPersonalizedShelfProps {
  onSelectPost: (post: MediaPost) => void;
  availablePosts?: MediaPost[];
}

export const TopPicksPersonalizedShelf: React.FC<TopPicksPersonalizedShelfProps> = ({
  onSelectPost,
  availablePosts = [],
}) => {
  const [signedIn, setSignedIn] = useState(() => isUserSignedIn());
  const [profile, setProfile] = useState(() => getActiveProfile());
  const [genres, setGenres] = useState<string[]>(() => getProfilePersonalization());
  const [topPicks, setTopPicks] = useState<MediaPost[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setSignedIn(isUserSignedIn());
      setProfile(getActiveProfile());
      setGenres(getProfilePersonalization());
    };
    window.addEventListener("cinema:profile_changed", handleUpdate);
    window.addEventListener("cinema:personalization_updated", handleUpdate);
    return () => {
      window.removeEventListener("cinema:profile_changed", handleUpdate);
      window.removeEventListener("cinema:personalization_updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    // Dynamic match against chosen genres or fallback to top quality items
    let matched: MediaPost[] = [];
    if (availablePosts.length > 0) {
      matched = availablePosts.filter((p) => {
        const itemGenres = Array.isArray(p.genre)
          ? p.genre.map((g) => g.toLowerCase())
          : typeof p.genre === "string"
          ? [p.genre.toLowerCase()]
          : [];

        return genres.some((g) =>
          itemGenres.some((ig) => ig.includes(g.toLowerCase()) || g.toLowerCase().includes(ig))
        );
      });

      // If matched is too small, fill with high-rating items
      if (matched.length < 8) {
        const remaining = availablePosts.filter((p) => !matched.includes(p));
        matched = [...matched, ...remaining.slice(0, 12 - matched.length)];
      }
    }

    setTopPicks(matched.slice(0, 16));
  }, [availablePosts, genres]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -480 : 480;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!signedIn || topPicks.length === 0) return null;

  return (
    <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Shelf Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.3px" }}>
            Top Picks for <span style={{ color: "#e50914", textTransform: "capitalize" }}>{profile.name}</span>
          </h2>
        </div>
      </div>

      {/* Shelf Scroll Container with Pure Crystal Floating Glass Arrows */}
      <div style={{ position: "relative" }}>
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          style={{
            position: "absolute",
            left: "-18px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.10)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.20)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.20)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Media Row: Landscape 16:9 cards */}
        <div
          ref={scrollRef}
          style={{
            display: "flex",
            gap: "20px",
            overflowX: "auto",
            scrollbarWidth: "none",
            padding: "8px 4px 14px 4px",
            scrollBehavior: "smooth",
          }}
        >
          {topPicks.map((post) => (
            <div
              key={post.id || post.tmdbId}
              style={{
                flex: "0 0 290px",
                width: "290px",
                maxWidth: "290px",
              }}
            >
              <MediaCard
                post={post}
                onSelect={onSelectPost}
                isLandscape={true}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          style={{
            position: "absolute",
            right: "-18px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.10)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.20)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
            e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.20)";
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
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
