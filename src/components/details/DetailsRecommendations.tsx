import React, { useRef } from "react";
import { MediaCard } from "../media/MediaCard";
import { ChevronLeftIcon, ChevronRightIcon } from "../../icons";
import type { TMDBMediaItem } from "../../api/tmdb";
import type { Post } from "../../types";

export interface DetailsRecommendationsProps {
  recommendations?: TMDBMediaItem[];
  similar?: TMDBMediaItem[];
  targetProviderKey: string;
  onSelectRecommended?: (post: Post) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const DetailsRecommendations: React.FC<DetailsRecommendationsProps> = ({
  recommendations = [],
  similar = [],
  targetProviderKey,
  onSelectRecommended,
  containerRef,
}) => {
  const moreLikeScrollRef = useRef<HTMLDivElement>(null);
  const recScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    const amount = direction === "left" ? -520 : 520;
    ref.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const mapToPost = (item: TMDBMediaItem): Post => ({
    title: item.title,
    link: "",
    image: item.poster_path || item.backdrop_path || "",
    backdropUrl: item.backdrop_path || undefined,
    rating: item.vote_average && item.vote_average > 0 ? item.vote_average.toFixed(1) : undefined,
    year: item.release_date ? item.release_date.split("-")[0] : undefined,
    provider: targetProviderKey || "server",
  });

  const moreLikePosts = (similar.length > 0 ? similar : recommendations).map(mapToPost);
  const recommendedPosts = recommendations.map(mapToPost);

  return (
    <>
      {/* 1. MORE LIKE THIS SHELF (Landscape Cards matching Home page landscape shelves) */}
      {moreLikePosts.length > 0 && (
        <div
          className="details-section-container"
          style={{
            width: "100%",
            padding: "24px 48px 36px 48px",
            position: "relative",
          }}
        >
          {/* Clean Home-style Section Heading */}
          <div style={{ marginBottom: "16px" }}>
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
              More Like This
            </h2>
          </div>

          {/* Carousel Track without arrow buttons */}
          <div style={{ position: "relative", width: "100%" }}>

            <div
              ref={moreLikeScrollRef}
              className="cinema-no-scrollbar"
              style={{
                display: "flex",
                gap: "18px",
                overflowX: "auto",
                scrollBehavior: "smooth",
                paddingBottom: "12px",
              }}
            >
              {moreLikePosts.map((p, idx) => (
                <div
                  key={`more-${p.title}-${idx}`}
                  style={{
                    flex: "0 0 clamp(320px, 26vw, 420px)",
                    width: "clamp(320px, 26vw, 420px)",
                  }}
                >
                  <MediaCard
                    post={p}
                    onClick={(selected) => {
                      if (containerRef.current) {
                        containerRef.current.scrollTo({ top: 0, behavior: "instant" });
                        containerRef.current.scrollTop = 0;
                      }
                      onSelectRecommended?.(selected);
                    }}
                    layout="landscape"
                    hideProviderBadge={true}
                    priority={idx < 6}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. RECOMMENDED FOR YOU SHELF (Portrait MediaCards) */}
      {recommendedPosts.length > 0 && (
        <div
          className="details-section-container"
          style={{
            width: "100%",
            padding: "20px 48px 48px 48px",
            position: "relative",
          }}
        >
          {/* Clean Home-style Section Heading */}
          <div style={{ marginBottom: "16px" }}>
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
              Recommended For You
            </h2>
          </div>

          {/* Carousel Track without arrow buttons */}
          <div style={{ position: "relative", width: "100%" }}>

            <div
              ref={recScrollRef}
              className="cinema-no-scrollbar"
              style={{
                display: "flex",
                gap: "16px",
                overflowX: "auto",
                scrollBehavior: "smooth",
                paddingBottom: "12px",
              }}
            >
              {recommendedPosts.map((p, idx) => (
                <div
                  key={`rec-${p.title}-${idx}`}
                  style={{
                    flex: "0 0 clamp(200px, 16vw, 240px)",
                    width: "clamp(200px, 16vw, 240px)",
                  }}
                >
                  <MediaCard
                    post={p}
                    onClick={(selected) => {
                      if (containerRef.current) {
                        containerRef.current.scrollTo({ top: 0, behavior: "instant" });
                        containerRef.current.scrollTop = 0;
                      }
                      onSelectRecommended?.(selected);
                    }}
                    layout="portrait"
                    hideProviderBadge={true}
                    priority={idx < 8}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
