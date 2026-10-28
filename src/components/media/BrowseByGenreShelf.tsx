import React, { useRef, useState } from "react";

export interface GenreItem {
  id: string;
  name: string;
  tmdbId: number;
  image: string;
  color: string;
}

export const GENRE_ITEMS: GenreItem[] = [
  {
    id: "action",
    name: "Action",
    tmdbId: 28,
    image: "https://image.tmdb.org/t/p/w780/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg",
    color: "rgba(220, 38, 38, 0.32)",
  },
  {
    id: "adventure",
    name: "Adventure",
    tmdbId: 12,
    image: "https://image.tmdb.org/t/p/w780/kJsPVzdyBrYHLomuNv5SJDXUQ2f.jpg",
    color: "rgba(217, 119, 6, 0.32)",
  },
  {
    id: "animation",
    name: "Animation",
    tmdbId: 16,
    image: "https://image.tmdb.org/t/p/w780/p5ozvmdgsmbWe0H8Xk7Rc8SCwAB.jpg",
    color: "rgba(13, 148, 136, 0.32)",
  },
  {
    id: "comedy",
    name: "Comedy",
    tmdbId: 35,
    image: "https://image.tmdb.org/t/p/w780/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
    color: "rgba(202, 138, 4, 0.32)",
  },
  {
    id: "crime",
    name: "Crime",
    tmdbId: 80,
    image: "https://image.tmdb.org/t/p/w780/rvtdN5XkWAfGX6xDuPL6yYS2seK.jpg",
    color: "rgba(71, 85, 105, 0.32)",
  },
  {
    id: "documentary",
    name: "Documentary",
    tmdbId: 99,
    image: "https://image.tmdb.org/t/p/w780/qmRUwosX4BsCj6QanpBYScLl3Sp.jpg",
    color: "rgba(16, 185, 129, 0.32)",
  },
  {
    id: "drama",
    name: "Drama",
    tmdbId: 18,
    image: "https://image.tmdb.org/t/p/w780/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
    color: "rgba(124, 58, 237, 0.32)",
  },
  {
    id: "family",
    name: "Family",
    tmdbId: 10751,
    image: "https://image.tmdb.org/t/p/w780/vYqt6kb4lcF8wwqsMMaULkP9OEn.jpg",
    color: "rgba(34, 197, 94, 0.32)",
  },
  {
    id: "fantasy",
    name: "Fantasy",
    tmdbId: 14,
    image: "https://image.tmdb.org/t/p/w780/achmETPRJZc9QVXsMPgHwYEyNar.jpg",
    color: "rgba(99, 102, 241, 0.32)",
  },
  {
    id: "history",
    name: "History",
    tmdbId: 36,
    image: "https://image.tmdb.org/t/p/w780/tOqIwliWMovSIZ9DyvHcHI7p2im.jpg",
    color: "rgba(180, 83, 9, 0.32)",
  },
  {
    id: "horror",
    name: "Horror",
    tmdbId: 27,
    image: "https://image.tmdb.org/t/p/w780/nHRUtBwFNnNN70vcQ7lAsjc2T6S.jpg",
    color: "rgba(185, 28, 28, 0.35)",
  },
  {
    id: "music",
    name: "Music",
    tmdbId: 10402,
    image: "https://image.tmdb.org/t/p/w780/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg",
    color: "rgba(219, 39, 119, 0.32)",
  },
  {
    id: "mystery",
    name: "Mystery",
    tmdbId: 9648,
    image: "https://image.tmdb.org/t/p/w780/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg",
    color: "rgba(30, 58, 138, 0.35)",
  },
  {
    id: "romance",
    name: "Romance",
    tmdbId: 10749,
    image: "https://image.tmdb.org/t/p/w780/j9eOeLlTGoHoM8BNUJVNyWmIvCi.jpg",
    color: "rgba(225, 29, 72, 0.32)",
  },
  {
    id: "sci-fi",
    name: "Science Fiction",
    tmdbId: 878,
    image: "https://image.tmdb.org/t/p/w780/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
    color: "rgba(2, 132, 199, 0.32)",
  },
  {
    id: "thriller",
    name: "Thriller",
    tmdbId: 53,
    image: "https://image.tmdb.org/t/p/w780/rlay2M5QYvi6igbGcFjq8jxeusY.jpg",
    color: "rgba(20, 184, 166, 0.32)",
  },
  {
    id: "war",
    name: "War",
    tmdbId: 10752,
    image: "https://image.tmdb.org/t/p/w780/2lBOQK06tltt8SQaswgb8d657Mv.jpg",
    color: "rgba(101, 110, 46, 0.32)",
  },
  {
    id: "western",
    name: "Western",
    tmdbId: 37,
    image: "https://image.tmdb.org/t/p/w780/2oZklIzUbvZXXzIFzv7Hi68d6xf.jpg",
    color: "rgba(180, 83, 9, 0.32)",
  },
];

interface GenreCardProps {
  genre: GenreItem;
  onSelect: (name: string) => void;
}

const GenreCard: React.FC<GenreCardProps> = ({ genre, onSelect }) => {
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
        flexShrink: 0,
        zIndex: isHovered ? 10 : 1,
      }}
    >
      <div
        onClick={() => onSelect(genre.name)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          width: "330px",
          height: "185px",
          borderRadius: "14px",
          overflow: "hidden",
          cursor: "pointer",
          background: "#0c0c0c",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.045, 1.045, 1.045)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 22px 44px rgba(0, 0, 0, 0.95), 0 0 24px rgba(0, 0, 0, 0.6)"
            : "0 6px 20px rgba(0, 0, 0, 0.45)",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease"
            : "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Background Image with 3D Counter-Parallax Movement */}
        <img
          src={genre.image}
          alt={genre.name}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://image.tmdb.org/t/p/w780/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg";
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 25%",
            transform: isHovered
              ? `scale(1.12) translate3d(${tilt.y * -0.6}px, ${tilt.x * 0.6}px, 0px)`
              : "scale(1.0) translate3d(0px, 0px, 0px)",
            transition: isHovered
              ? "transform 0.08s ease-out"
              : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />

        {/* Subtle Natural Tint Gradient Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 45%, transparent 75%), linear-gradient(135deg, ${genre.color} 0%, transparent 60%)`,
            pointerEvents: "none",
          }}
        />

        {/* Normal Clean Text directly on card matching reference */}
        <div
          style={{
            position: "absolute",
            bottom: "18px",
            left: "20px",
            right: "16px",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: isHovered ? "#e50914" : "#ffffff",
              fontFamily: "var(--font-main)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              textShadow:
                "0 2px 8px rgba(0, 0, 0, 0.85), 0 4px 18px rgba(0, 0, 0, 0.95)",
              display: "block",
              transition: "color 0.2s ease",
            }}
          >
            {genre.name}
          </span>
        </div>
      </div>
    </div>
  );
};

export const BrowseByGenreShelf: React.FC<BrowseByGenreShelfProps> = ({
  onSelectGenre,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -520, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 520, behavior: "smooth" });
    }
  };

  return (
    <div
      className="browse-genre-shelf-container"
      style={{
        width: "100%",
        padding: "16px 0 28px 0",
        marginTop: "8px",
        position: "relative",
      }}
    >
      {/* Shelf Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px 18px 48px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-main)",
          }}
        >
          Browse by Genre
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
            background: "rgba(18, 18, 22, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "none",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.6)",
            transition: "transform 0.2s, background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            e.currentTarget.style.background = "rgba(35, 35, 42, 0.95)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            e.currentTarget.style.background = "rgba(18, 18, 22, 0.85)";
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Horizontal Genre Cards matching cno.to */}
        <div
          ref={scrollRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            overflowX: "auto",
            scrollBehavior: "smooth",
            padding: "0 48px 12px 48px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {GENRE_ITEMS.map((g) => (
            <GenreCard key={g.id} genre={g} onSelect={onSelectGenre} />
          ))}
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
            background: "rgba(18, 18, 22, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "none",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.6)",
            transition: "transform 0.2s, background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            e.currentTarget.style.background = "rgba(35, 35, 42, 0.95)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            e.currentTarget.style.background = "rgba(18, 18, 22, 0.85)";
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};
