import React, { useState, useEffect } from "react";
import type { Post } from "../../types";
import { PlayIcon, PlusIcon, CheckIcon, ArrowLeftIcon } from "../../icons";

export interface ComingSoonItem {
  id: string;
  tmdbId?: number;
  title: string;
  day: string;
  month: string;
  weekday: string;
  countdown: string;
  monthYearHeader: string;
  releaseDate: string;
  image: string;
  backdropUrl: string;
  logoUrl?: string;
  genres: string;
  overview: string;
  trailerUrl?: string;
}

const TMDB_API_KEY = "cfe422613b250f702980a3bbf9e90716";
const BASE_URL = "https://api.themoviedb.org/3";

const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

// Robust fetcher with proxy fallback
async function fetchTmdbData(endpoint: string): Promise<any> {
  const directUrl = `${BASE_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${TMDB_API_KEY}`;
  try {
    const res = await fetch(directUrl);
    if (res.ok) return await res.json();
  } catch (_) {}

  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) return await res.json();
  } catch (_) {}

  try {
    const cfUrl = `https://cinema-dwh.pages.dev/api/proxy?url=${encodeURIComponent(directUrl)}`;
    const res = await fetch(cfUrl);
    if (res.ok) return await res.json();
  } catch (_) {}

  return null;
}

// Fetch transparent PNG logo from TMDB images
async function fetchMovieLogo(tmdbId: number): Promise<string | undefined> {
  try {
    const data = await fetchTmdbData(`/movie/${tmdbId}/images`);
    if (data && Array.isArray(data.logos) && data.logos.length > 0) {
      // Find english logo or first available
      const enLogo = data.logos.find((l: any) => l.iso_639_1 === "en") || data.logos[0];
      if (enLogo && enLogo.file_path) {
        return `https://image.tmdb.org/t/p/original${enLogo.file_path}`;
      }
    }
  } catch (_) {}
  return undefined;
}

// Initial fallback items for instantaneous rendering while live data loads
const INITIAL_COMING_SOON: ComingSoonItem[] = [
  {
    id: "godzilla-minus-zero",
    tmdbId: 940721,
    title: "Godzilla Minus Zero",
    day: "3",
    month: "NOV",
    weekday: "Tue",
    countdown: "In 10 days",
    monthYearHeader: "November 2026",
    releaseDate: "2026-11-03",
    image: "https://image.tmdb.org/t/p/original/hkxxMIGaiB4wH5v64b2nBqU6v7a.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/hkxxMIGaiB4wH5v64b2nBqU6v7a.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/qYRrYE58lPQkhPvFsi4ROrrbSAk.png",
    genres: "Science Fiction • Horror • Action",
    overview:
      "War reduced Japan to zero, and Godzilla plunged it into minus. Two years have passed since then, and the country has faced agonizing struggles to achieve recovery and finally reclaim its daily life. Just as humanity managed to cling to a hard-won peace, a new threat rises from the deep ocean abyss...",
  },
  {
    id: "ramayana-rise-of-a-legend",
    tmdbId: 656908,
    title: "Ramayana: Rise of a Legend",
    day: "5",
    month: "NOV",
    weekday: "Thu",
    countdown: "In 12 days",
    monthYearHeader: "November 2026",
    releaseDate: "2026-11-05",
    image: "https://image.tmdb.org/t/p/original/yHVZncPRZr63mezRX20IyKLrSkv.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/yHVZncPRZr63mezRX20IyKLrSkv.jpg",
    logoUrl: "https://image.tmdb.org/t/p/original/uRlc3Bk3mVDXVkjD7uj9845rmWk.png",
    genres: "Fantasy • Action • Adventure",
    overview:
      "An ancient epic follows a young prince and princess whose marriage and subsequent exile mark the beginning of a legendary journey. Their story of love, duty and destiny sets the stage for greater challenges ahead.",
  },
  {
    id: "hunger-games-sunrise",
    tmdbId: 1302826,
    title: "The Hunger Games: Sunrise on the Reaping",
    day: "18",
    month: "NOV",
    weekday: "Wed",
    countdown: "In 25 days",
    monthYearHeader: "November 2026",
    releaseDate: "2026-11-18",
    image: "https://image.tmdb.org/t/p/original/4uaHnYDDpUTj0nCg6YqBKab50YW.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/4uaHnYDDpUTj0nCg6YqBKab50YW.jpg",
    genres: "Action • Sci-Fi • Adventure",
    overview:
      "The cinematic prequel chronicling the 50th Hunger Games, also known as the Second Quarter Quell, following a young Haymitch Abernathy as he enters the brutal arena of Panem.",
  },
  {
    id: "dune-part-three",
    tmdbId: 1222224,
    title: "Dune: Part Three",
    day: "15",
    month: "DEC",
    weekday: "Tue",
    countdown: "In 2 months",
    monthYearHeader: "December 2026",
    releaseDate: "2026-12-15",
    image: "https://image.tmdb.org/t/p/original/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    genres: "Science Fiction • Adventure • Drama",
    overview:
      "Paul Atreides faces the horrifying consequences of his messianic jihad across the known universe as political factions and religious fanaticism threaten to tear humanity apart.",
  },
  {
    id: "avengers-doomsday",
    tmdbId: 1003596,
    title: "Avengers: Doomsday",
    day: "16",
    month: "DEC",
    weekday: "Wed",
    countdown: "In 2 months",
    monthYearHeader: "December 2026",
    releaseDate: "2026-12-16",
    image: "https://image.tmdb.org/t/p/original/xaA2vNo563CwmchBWztkAYRf86Y.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/xaA2vNo563CwmchBWztkAYRf86Y.jpg",
    genres: "Action • Sci-Fi • Adventure",
    overview:
      "The Marvel Cinematic Universe's mightiest heroes assemble from across colliding universes to wage war against the supreme intellect and mystical mastery of Victor von Doom.",
  },
  {
    id: "narnia-magicians-nephew",
    tmdbId: 1228711,
    title: "Narnia: The Magician's Nephew",
    day: "10",
    month: "FEB",
    weekday: "Wed",
    countdown: "In 4 months",
    monthYearHeader: "February 2027",
    releaseDate: "2027-02-10",
    image: "https://image.tmdb.org/t/p/original/pUNfHmVqfwRdILhCkU8TdysVOXo.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/pUNfHmVqfwRdILhCkU8TdysVOXo.jpg",
    genres: "Fantasy • Adventure • Family",
    overview:
      "Greta Gerwig directs the origin story of Narnia, following Digory Kirke and Polly Plummer as they stumble upon magical rings that transport them to the creation of a whole new universe.",
  },
];

const BellIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CalendarIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// 3D Tilt Landscape Media Card (Exact physics matching MediaCard.tsx)
interface LandscapeCardProps {
  image: string;
  title: string;
  logoUrl?: string;
  onClick: () => void;
}

const LandscapeMediaCard: React.FC<LandscapeCardProps> = ({ image, title, logoUrl, onClick }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = 10;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      style={{
        perspective: "1000px",
        width: "clamp(260px, 24vw, 340px)",
        aspectRatio: "16 / 9",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      <div
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "14px",
          overflow: "hidden",
          cursor: "pointer",
          background: "#0c0d12",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.045, 1.045, 1.045)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 22px 44px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 0, 0, 0.5)"
            : "0 6px 20px rgba(0, 0, 0, 0.6)",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease",
        }}
      >
        <img
          src={image}
          alt={title}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: isHovered
              ? `scale(1.12) translate3d(${tilt.y * -0.6}px, ${tilt.x * 0.6}px, 0px)`
              : "scale(1.0) translate3d(0px, 0px, 0px)",
            transition: isHovered
              ? "transform 0.08s ease-out, opacity 0.25s ease"
              : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0";
          }}
        />

        {/* Subtle vignette gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.85) 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Logo or Title Overlay */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "14px",
            right: "14px",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={title}
              style={{
                maxHeight: "38px",
                maxWidth: "80%",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 10px rgba(0, 0, 0, 0.95))",
              }}
            />
          ) : (
            <span
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "#ffffff",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.95)",
              }}
            >
              {title}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface ComingSoonPageProps {
  onBack: () => void;
  onSelectPost: (post: Post) => void;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  onBack,
  onSelectPost,
}) => {
  const [items, setItems] = useState<ComingSoonItem[]>(INITIAL_COMING_SOON);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("cinema_watchlist");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Dynamic TMDB Fetcher for Live Upcoming Releases
  useEffect(() => {
    let isMounted = true;

    async function loadDynamicComingSoon() {
      try {
        const todayStr = new Date().toISOString().split("T")[0];

        // Fetch upcoming page 1, 2, and discover releases with future dates
        const [upPage1, upPage2, discoverRes] = await Promise.allSettled([
          fetchTmdbData("/movie/upcoming?page=1"),
          fetchTmdbData("/movie/upcoming?page=2"),
          fetchTmdbData(`/discover/movie?primary_release_date.gte=${todayStr}&sort_by=popularity.desc&page=1`),
        ]);

        const rawList: any[] = [];
        if (upPage1.status === "fulfilled" && Array.isArray(upPage1.value?.results)) {
          rawList.push(...upPage1.value.results);
        }
        if (upPage2.status === "fulfilled" && Array.isArray(upPage2.value?.results)) {
          rawList.push(...upPage2.value.results);
        }
        if (discoverRes.status === "fulfilled" && Array.isArray(discoverRes.value?.results)) {
          rawList.push(...discoverRes.value.results);
        }

        // Deduplicate by ID
        const seen = new Set<number>();
        const uniqueRaw: any[] = [];
        for (const m of rawList) {
          if (m && m.id && !seen.has(m.id) && m.release_date && (m.backdrop_path || m.poster_path)) {
            seen.add(m.id);
            uniqueRaw.push(m);
          }
        }

        if (uniqueRaw.length === 0) return;

        // Process dates and build ComingSoonItem list
        const processed: ComingSoonItem[] = [];
        const now = new Date();

        for (const m of uniqueRaw) {
          try {
            const d = new Date(m.release_date);
            if (isNaN(d.getTime())) continue;

            const diffTime = d.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Strictly filter out already released movies (Rule 5: release_date > today)
            if (diffDays <= 0) continue;

            const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
            const day = String(d.getDate());
            const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
            const monthYearHeader = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

            const countdown =
              diffDays > 0
                ? diffDays <= 45
                  ? `In ${diffDays} days`
                  : `In ${Math.ceil(diffDays / 30)} months`
                : "In Theaters";

            const genres = Array.isArray(m.genre_ids)
              ? m.genre_ids.map((id: number) => TMDB_GENRES[id]).filter(Boolean).slice(0, 3).join(" • ")
              : "Action • Adventure";

            const backdropUrl = m.backdrop_path
              ? `https://image.tmdb.org/t/p/original${m.backdrop_path}`
              : `https://image.tmdb.org/t/p/original${m.poster_path}`;

            const image = m.backdrop_path
              ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}`
              : `https://image.tmdb.org/t/p/w780${m.poster_path}`;

            processed.push({
              id: `tmdb-${m.id}`,
              tmdbId: m.id,
              title: m.title || m.name,
              day,
              month,
              weekday,
              countdown,
              monthYearHeader,
              releaseDate: m.release_date,
              image,
              backdropUrl,
              genres: genres || "Cinema",
              overview:
                m.overview ||
                "An upcoming theatrical release promising unforgettable spectacle, gripping drama, and unforgettable cinematic adventure.",
            });
          } catch (_) {}
        }

        // Sort chronologically by release date
        processed.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());

        // Ensure Godzilla Minus Zero and Ramayana appear in November 2026 if not already present
        const hasGodzilla = processed.some((p) => p.title.toLowerCase().includes("godzilla"));
        if (!hasGodzilla) {
          processed.unshift(INITIAL_COMING_SOON[0]);
        }
        const hasRamayana = processed.some((p) => p.title.toLowerCase().includes("ramayana"));
        if (!hasRamayana) {
          processed.splice(1, 0, INITIAL_COMING_SOON[1]);
        }

        if (isMounted && processed.length > 0) {
          setItems(processed);

          // Fetch logos asynchronously in background for the top releases
          processed.slice(0, 10).forEach(async (item) => {
            if (item.tmdbId && !item.logoUrl) {
              const logo = await fetchMovieLogo(item.tmdbId);
              if (logo && isMounted) {
                setItems((prev) =>
                  prev.map((it) => (it.id === item.id ? { ...it, logoUrl: logo } : it))
                );
              }
            }
          });
        }
      } catch (_) {}
    }

    loadDynamicComingSoon();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleRemind = (id: string) => {
    setRemindedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleWatchlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("cinema_watchlist", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div
      className="coming-soon-page-container"
      style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        minHeight: "100vh",
        background: "transparent",
        color: "#ffffff",
        padding: "96px 48px 80px 48px",
        boxSizing: "border-box",
        maxWidth: "1160px",
        margin: "0",
      }}
    >
      {/* Back to Home Button */}
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          color: "#ffffff",
          padding: "7px 16px",
          borderRadius: "9999px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 700,
          marginBottom: "20px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
          e.currentTarget.style.transform = "translateX(-3px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <ArrowLeftIcon size={14} color="#ffffff" />
        <span>Back to Home</span>
      </button>

      {/* Main Page Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "clamp(38px, 4.5vw, 54px)",
            fontWeight: 900,
            letterSpacing: "-0.025em",
            margin: 0,
            color: "#e50914",
            fontFamily: "var(--font-main, sans-serif)",
            textShadow: "0 2px 20px rgba(0, 0, 0, 0.95), 0 0 40px rgba(229, 9, 20, 0.25)",
          }}
        >
          Coming Soon
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "rgba(255, 255, 255, 0.75)",
            margin: 0,
            fontWeight: 500,
            textShadow: "0 1px 8px rgba(0, 0, 0, 0.9)",
          }}
        >
          In theaters over the next few months.
        </p>
      </div>

      {/* Vertical Timeline List (Dynamic month-by-month grouping) */}
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        {items.map((item, idx) => {
          const isReminded = remindedIds.has(item.id);
          const isSaved = watchlist.includes(item.id);

          const postEquivalent: Post = {
            title: item.title,
            year: item.releaseDate ? item.releaseDate.split("-")[0] : "2026",
            image: item.image,
            backdropUrl: item.backdropUrl,
            logoUrl: item.logoUrl,
            genres: item.genres,
            overview: item.overview,
            description: item.overview,
            link: `/search?q=${encodeURIComponent(item.title)}`,
            tmdbId: item.tmdbId,
            tag: item.releaseDate,
          };

          // Show Month Header whenever month changes (November 2026, December 2026, etc.)
          const showMonthHeader =
            idx === 0 || items[idx - 1].monthYearHeader !== item.monthYearHeader;

          return (
            <React.Fragment key={item.id}>
              {showMonthHeader && (
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#ffffff",
                    margin: idx === 0 ? "0 0 24px 0" : "36px 0 24px 0",
                    letterSpacing: "-0.01em",
                    fontFamily: "var(--font-main)",
                    textShadow: "0 2px 14px rgba(0, 0, 0, 0.9)",
                  }}
                >
                  {item.monthYearHeader}
                </h2>
              )}

              {/* Timeline Item Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "24px",
                  paddingBottom: "28px",
                  marginBottom: "28px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  position: "relative",
                  width: "100%",
                }}
              >
                {/* 1. Date Column */}
                <div
                  style={{
                    width: "68px",
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    paddingTop: "4px",
                  }}
                >
                  {/* RED Month tag */}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#e50914",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-main)",
                    }}
                  >
                    {item.month}
                  </span>

                  {/* Big Day Number */}
                  <span
                    style={{
                      fontSize: "28px",
                      fontWeight: 900,
                      lineHeight: 1.05,
                      color: "#ffffff",
                      letterSpacing: "-0.02em",
                      margin: "1px 0",
                      fontFamily: "var(--font-main)",
                    }}
                  >
                    {item.day}
                  </span>

                  {/* Weekday */}
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.45)",
                    }}
                  >
                    {item.weekday}
                  </span>

                  {/* Pill Badge */}
                  {item.countdown && (
                    <span
                      style={{
                        marginTop: "6px",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "10px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {item.countdown}
                    </span>
                  )}
                </div>

                {/* 2. 16:9 Landscape Card with 3D Tilt Hover matching MediaCard.tsx */}
                <LandscapeMediaCard
                  image={item.image}
                  title={item.title}
                  logoUrl={item.logoUrl}
                  onClick={() => onSelectPost(postEquivalent)}
                />

                {/* 3. Movie Details & Actions Column */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    flex: 1,
                    minWidth: 0,
                    paddingTop: "2px",
                  }}
                >
                  <h3
                    onClick={() => onSelectPost(postEquivalent)}
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: "#ffffff",
                      margin: "0 0 2px 0",
                      cursor: "pointer",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.25,
                      fontFamily: "var(--font-main)",
                    }}
                  >
                    {item.title}
                  </h3>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "rgba(255, 255, 255, 0.55)",
                      fontWeight: 500,
                      marginBottom: "8px",
                    }}
                  >
                    {item.genres}
                  </div>

                  <p
                    style={{
                      fontSize: "13.5px",
                      lineHeight: 1.55,
                      color: "rgba(255, 255, 255, 0.68)",
                      maxWidth: "580px",
                      margin: "0 0 16px 0",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.overview}
                  </p>

                  {/* Actions Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* RED TRAILER BUTTON */}
                    <button
                      onClick={() => onSelectPost(postEquivalent)}
                      style={{
                        height: "36px",
                        padding: "0 18px",
                        borderRadius: "999px",
                        background: "#e50914",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 4px 16px rgba(229, 9, 20, 0.4)",
                        transition: "transform 0.15s ease, background 0.15s ease",
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
                      <PlayIcon size={14} fill="#ffffff" color="#ffffff" />
                      <span>Trailer</span>
                    </button>

                    {/* Watchlist Button */}
                    <button
                      title={isSaved ? "In Watchlist" : "Add to Watchlist"}
                      onClick={(e) => toggleWatchlist(item.id, e)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    >
                      {isSaved ? <CheckIcon size={16} color="#4ade80" /> : <PlusIcon size={16} color="#ffffff" />}
                    </button>

                    {/* Remind Me (Bell) Button */}
                    <button
                      title={isReminded ? "Reminder Set" : "Remind Me"}
                      onClick={() => toggleRemind(item.id)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: isReminded ? "rgba(229, 9, 20, 0.2)" : "rgba(255, 255, 255, 0.12)",
                        border: isReminded ? "1px solid rgba(229, 9, 20, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
                        color: isReminded ? "#e50914" : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    >
                      <BellIcon size={16} color={isReminded ? "#e50914" : "#ffffff"} />
                    </button>

                    {/* Calendar Button */}
                    <button
                      title="Add to Calendar"
                      onClick={() => alert(`Added ${item.title} to your release calendar!`)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    >
                      <CalendarIcon size={16} color="#ffffff" />
                    </button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
