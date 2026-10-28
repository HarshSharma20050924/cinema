import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Post } from "../../types";
import { CatalogSection } from "./CatalogSection";
import {
  ArrowLeftIcon,
  PlayIcon,
  PlusIcon,
  CheckIcon,
  InfoIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../icons";
import { fetchTMDBDetails, type TMDBDetails } from "../../api/tmdb";
import { cleanHeroTitle } from "../hero/HeroSpotlight";

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_W500 = "https://image.tmdb.org/t/p/w500";
const IMG_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";

export interface CuratedShowcasePageProps {
  type: "language" | "provider";
  title: string;
  subtitle?: string;
  code?: string; // language code e.g. "ml", "hi"
  providerId?: number; // TMDB watch provider ID
  onBack: () => void;
  onSelectPost: (post: Post) => void;
  onOpenFilterBrowse: (title: string, filter?: string) => void;
  onPlayPost?: (post: Post) => void;
}

export const CuratedShowcasePage: React.FC<CuratedShowcasePageProps> = ({
  type,
  title,
  subtitle,
  code,
  providerId,
  onBack,
  onSelectPost,
  onOpenFilterBrowse,
  onPlayPost,
}) => {
  const [trending, setTrending] = useState<Post[]>([]);
  const [topRated, setTopRated] = useState<Post[]>([]);
  const [shelf3, setShelf3] = useState<Post[]>([]);
  const [shelf4, setShelf4] = useState<Post[]>([]);
  const [shelf5, setShelf5] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Spotlight carousel slides state
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TMDBDetails>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to top on mount or key change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [type, title, code, providerId]);

  // Fetch real TMDB items for this Language or Provider
  useEffect(() => {
    let mounted = true;
    const today = new Date().toISOString().split("T")[0];

    async function fetchCuratedShelves() {
      setLoading(true);
      try {
        const cacheKey = `cinema_curated_${type}_${code || providerId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - (parsed.savedAt || 0) < 6 * 60 * 60 * 1000) {
              if (mounted) {
                setTrending(parsed.trending || []);
                setTopRated(parsed.topRated || []);
                setShelf3(parsed.shelf3 || []);
                setShelf4(parsed.shelf4 || []);
                setShelf5(parsed.shelf5 || []);
                setLoading(false);
                return;
              }
            }
          } catch {}
        }

        const mapResults = (items: any[]): Post[] => {
          if (!Array.isArray(items)) return [];
          return items
            .filter((m) => m && (m.poster_path || m.backdrop_path) && (m.title || m.name))
            .map((m) => ({
              title: m.title || m.name,
              year: (m.release_date || m.first_air_date || "").split("-")[0] || "",
              rating: m.vote_average ? m.vote_average.toFixed(1) : "7.5",
              image: m.poster_path ? `${IMG_BASE_W500}${m.poster_path}` : `${IMG_BASE_ORIGINAL}${m.backdrop_path}`,
              backdropUrl: m.backdrop_path ? `${IMG_BASE_ORIGINAL}${m.backdrop_path}` : `${IMG_BASE_W500}${m.poster_path}`,
              genres: title,
              tag: m.release_date ? m.release_date.split("-")[0] : "",
              description: m.overview || "",
              link: `/search?q=${encodeURIComponent(m.title || m.name)}`,
              tmdbId: m.id,
            }));
        };

        let url1 = "";
        let url2 = "";
        let url3 = "";
        let url4 = "";
        let url5 = "";

        if (type === "language" && code) {
          url1 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${code}&sort_by=popularity.desc&page=1`;
          url2 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${code}&sort_by=vote_average.desc&vote_count.gte=30&page=1`;
          url3 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${code}&with_genres=28,53&sort_by=popularity.desc&page=1`;
          url4 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${code}&with_genres=35,10751&sort_by=popularity.desc&page=1`;
          url5 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${code}&primary_release_date.lte=${today}&sort_by=primary_release_date.desc&vote_count.gte=5&page=1`;
        } else if (type === "provider" && providerId) {
          url1 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=IN&sort_by=popularity.desc&page=1`;
          url2 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=IN&sort_by=vote_average.desc&vote_count.gte=60&page=1`;
          url3 = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=IN&sort_by=popularity.desc&page=1`;
          url4 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=IN&with_genres=28,878&sort_by=popularity.desc&page=1`;
          url5 = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=IN&primary_release_date.lte=${today}&sort_by=primary_release_date.desc&page=1`;
        }

        const [res1, res2, res3, res4, res5] = await Promise.allSettled([
          fetch(url1).then((r) => r.json()),
          fetch(url2).then((r) => r.json()),
          fetch(url3).then((r) => r.json()),
          fetch(url4).then((r) => r.json()),
          fetch(url5).then((r) => r.json()),
        ]);

        const list1 = res1.status === "fulfilled" ? mapResults(res1.value?.results) : [];
        const list2 = res2.status === "fulfilled" ? mapResults(res2.value?.results) : [];
        const list3 = res3.status === "fulfilled" ? mapResults(res3.value?.results) : [];
        const list4 = res4.status === "fulfilled" ? mapResults(res4.value?.results) : [];
        const list5 = res5.status === "fulfilled" ? mapResults(res5.value?.results) : [];

        if (mounted) {
          setTrending(list1);
          setTopRated(list2);
          setShelf3(list3);
          setShelf4(list4);
          setShelf5(list5);
          setLoading(false);

          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              savedAt: Date.now(),
              trending: list1,
              topRated: list2,
              shelf3: list3,
              shelf4: list4,
              shelf5: list5,
            })
          );
        }
      } catch (err) {
        console.error("fetchCuratedShelves error:", err);
        if (mounted) setLoading(false);
      }
    }

    fetchCuratedShelves();
    return () => {
      mounted = false;
    };
  }, [type, title, code, providerId]);

  // Spotlight slides from trending items
  const spotlightSlides = useMemo(() => {
    return trending.slice(0, 5);
  }, [trending]);

  const activePost = spotlightSlides[activeSlideIdx] || spotlightSlides[0] || null;

  // Auto-advance spotlight slides
  useEffect(() => {
    if (spotlightSlides.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setActiveSlideIdx((prev) => (prev + 1) % spotlightSlides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [spotlightSlides.length, isHovered]);

  // Fetch TMDB rich metadata for active slide
  useEffect(() => {
    if (!activePost) return;
    const clean = cleanHeroTitle(activePost.title);
    if (!clean || tmdbMap[clean.toLowerCase()]) return;

    let mounted = true;
    fetchTMDBDetails(clean, undefined, activePost.year, (activePost as any).tmdbId).then((data) => {
      if (mounted && data) {
        setTmdbMap((prev) => ({ ...prev, [clean.toLowerCase()]: data }));
      }
    });

    return () => {
      mounted = false;
    };
  }, [activePost, tmdbMap]);

  const currentTmdb = activePost ? tmdbMap[cleanHeroTitle(activePost.title).toLowerCase()] : null;
  const currentBackdrop = currentTmdb?.backdropUrl || activePost?.backdropUrl || activePost?.image || "";
  const currentLogo = currentTmdb?.logoUrl || (activePost as any)?.logoUrl || null;
  const currentRating = currentTmdb?.rating || activePost?.rating || "8.1";
  const currentYear = currentTmdb?.year || activePost?.year || "2024";
  const currentPlot = currentTmdb?.overview || activePost?.description || `Discover the finest ${title} entertainment now streaming.`;

  return (
    <div
      ref={containerRef}
      className="curated-showcase-page cinema-no-scrollbar"
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#07090e",
        color: "#ffffff",
        position: "relative",
        paddingBottom: "80px",
      }}
    >
      {/* Back Button */}
      <div
        style={{
          position: "sticky",
          top: "84px",
          zIndex: 40,
          padding: "16px 48px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          pointerEvents: "none",
        }}
      >
        <button
          onClick={onBack}
          style={{
            pointerEvents: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 20px",
            borderRadius: "999px",
            background: "rgba(14, 16, 22, 0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            color: "#ffffff",
            fontSize: "13.5px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(14, 16, 22, 0.75)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <ArrowLeftIcon size={16} color="#ffffff" />
          <span>Back</span>
        </button>

        <div
          style={{
            pointerEvents: "auto",
            padding: "8px 18px",
            borderRadius: "999px",
            background: "rgba(14, 16, 22, 0.65)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", fontWeight: 600 }}>
              • {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Hero Spotlight Banner */}
      {activePost && (
        <div
          className="curated-hero-spotlight"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: "relative",
            width: "100%",
            minHeight: "560px",
            display: "flex",
            alignItems: "center",
            padding: "0 48px 50px 48px",
            marginTop: "-72px",
            overflow: "hidden",
          }}
        >
          {/* Backdrop Image */}
          {currentBackdrop && (
            <img
              src={currentBackdrop}
              alt={activePost.title}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 20%",
                filter: "brightness(0.82) contrast(1.05)",
                zIndex: 1,
                transition: "opacity 0.6s ease",
              }}
            />
          )}

          {/* Vignettes */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to right, rgba(7, 9, 14, 0.95) 0%, rgba(7, 9, 14, 0.6) 45%, rgba(7, 9, 14, 0.15) 75%, transparent 100%)",
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(7, 9, 14, 0.5) 0%, transparent 25%, transparent 60%, rgba(7, 9, 14, 0.85) 85%, #07090e 100%)",
              zIndex: 2,
            }}
          />

          {/* Hero Content */}
          <div
            style={{
              position: "relative",
              zIndex: 3,
              maxWidth: "680px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              paddingTop: "60px",
            }}
          >
            {/* Title / Logo */}
            {currentLogo ? (
              <img
                src={currentLogo}
                alt={activePost.title}
                style={{
                  maxHeight: "95px",
                  maxWidth: "340px",
                  objectFit: "contain",
                  filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.8))",
                }}
              />
            ) : (
              <h1
                style={{
                  fontSize: "44px",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  margin: 0,
                  textShadow: "0 4px 20px rgba(0,0,0,0.8)",
                  lineHeight: 1.15,
                }}
              >
                {activePost.title}
              </h1>
            )}

            {/* Metadata Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "rgba(245, 197, 24, 0.2)",
                  color: "#f5c518",
                  fontSize: "12px",
                  fontWeight: 800,
                  border: "1px solid rgba(245, 197, 24, 0.35)",
                }}
              >
                <StarIcon size={12} color="#f5c518" fill="#f5c518" />
                <span>{currentRating}</span>
              </span>

              {currentYear && (
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {currentYear}
                </span>
              )}

              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  background: "rgba(229, 9, 20, 0.2)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "1px solid rgba(229, 9, 20, 0.4)",
                }}
              >
                {title}
              </span>
            </div>

            {/* Synopsis */}
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "rgba(255, 255, 255, 0.8)",
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                maxWidth: "600px",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
              }}
            >
              {currentPlot}
            </p>

            {/* Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "10px" }}>
              <button
                onClick={() => (onPlayPost ? onPlayPost(activePost) : onSelectPost(activePost))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 28px",
                  borderRadius: "999px",
                  background: "#e50914",
                  color: "#ffffff",
                  fontSize: "14.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  border: "1px solid #e50914",
                  boxShadow: "0 4px 18px rgba(229, 9, 20, 0.45)",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.background = "#f40612";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = "#e50914";
                }}
              >
                <PlayIcon size={15} fill="#ffffff" color="#ffffff" />
                <span>Play Now</span>
              </button>

              <button
                onClick={() => onSelectPost(activePost)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 22px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.20)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                }}
              >
                <InfoIcon size={15} color="#ffffff" />
                <span>Details</span>
              </button>
            </div>
          </div>

          {/* Slide Indicator Dots */}
          {spotlightSlides.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: "28px",
                right: "48px",
                zIndex: 4,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {spotlightSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlideIdx(idx)}
                  style={{
                    width: activeSlideIdx === idx ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "999px",
                    background: activeSlideIdx === idx ? "#e50914" : "rgba(255, 255, 255, 0.3)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shelves Container */}
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", marginTop: "16px" }}>
        {/* 1. Trending (Landscape) */}
        {trending.length > 0 && (
          <CatalogSection
            title={`Trending in ${title}`}
            filter={`/${type}/${code || providerId}-trending`}
            initialPosts={trending}
            layout="landscape"
            onSelectPost={onSelectPost}
            onViewAll={() => onOpenFilterBrowse(title, `/${type}/${code || providerId}`)}
          />
        )}

        {/* 2. Top Rated Masterpieces (Portrait) */}
        {topRated.length > 0 && (
          <CatalogSection
            title={`Top Rated ${title} Masterpieces`}
            filter={`/${type}/${code || providerId}-top-rated`}
            initialPosts={topRated}
            layout="portrait"
            onSelectPost={onSelectPost}
            onViewAll={() => onOpenFilterBrowse(title, `/${type}/${code || providerId}`)}
          />
        )}

        {/* 3. Shelf 3: Action / TV Shows (Landscape) */}
        {shelf3.length > 0 && (
          <CatalogSection
            title={type === "provider" ? "Popular Shows & Series" : "Blockbuster Action & Thrillers"}
            filter={`/${type}/${code || providerId}-shelf3`}
            initialPosts={shelf3}
            layout="landscape"
            onSelectPost={onSelectPost}
            onViewAll={() => onOpenFilterBrowse(title, `/${type}/${code || providerId}`)}
          />
        )}

        {/* 4. Shelf 4: Comedies & Drama (Portrait) */}
        {shelf4.length > 0 && (
          <CatalogSection
            title={type === "provider" ? "Sci-Fi & Action Hits" : "Superhit Comedies & Family Drama"}
            filter={`/${type}/${code || providerId}-shelf4`}
            initialPosts={shelf4}
            layout="portrait"
            onSelectPost={onSelectPost}
            onViewAll={() => onOpenFilterBrowse(title, `/${type}/${code || providerId}`)}
          />
        )}

        {/* 5. Shelf 5: Recent Releases (Landscape) */}
        {shelf5.length > 0 && (
          <CatalogSection
            title="Recent Releases"
            filter={`/${type}/${code || providerId}-recent`}
            initialPosts={shelf5}
            layout="landscape"
            onSelectPost={onSelectPost}
            onViewAll={() => onOpenFilterBrowse(title, `/${type}/${code || providerId}`)}
          />
        )}
      </div>

      {/* Bottom Action Button: Discover All on [Title] → */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "48px", padding: "0 24px" }}>
        <button
          onClick={() => onOpenFilterBrowse(title, `/${type}/${code || providerId}`)}
          style={{
            padding: "13px 36px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.10)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            color: "#ffffff",
            fontSize: "14.5px",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.6)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e50914";
            e.currentTarget.style.borderColor = "#e50914";
            e.currentTarget.style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.10)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span>Discover All on {title}</span>
          <span style={{ fontSize: "16px" }}>&rarr;</span>
        </button>
      </div>
    </div>
  );
};
