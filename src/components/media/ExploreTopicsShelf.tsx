import React, { useRef, useState } from "react";

export interface TopicItem {
  id: string;
  name: string;
  image: string;
  color: string;
}

export const TOPIC_ITEMS: TopicItem[] = [
  {
    id: "artificial-intelligence",
    name: "Artificial Intelligence",
    image: "https://image.tmdb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    color: "rgba(13, 148, 136, 0.45)",
  },
  {
    id: "space-adventures",
    name: "Space Adventures",
    image: "https://image.tmdb.org/t/p/w780/70AV2Xx5FQYj20labp0EGdbGdUR.jpg",
    color: "rgba(2, 132, 199, 0.45)",
  },
  {
    id: "aliens",
    name: "Aliens",
    image: "https://image.tmdb.org/t/p/w780/b33nnKl1vAOM497Y3A6Wk9g29sm.jpg",
    color: "rgba(34, 197, 94, 0.45)",
  },
  {
    id: "zombies",
    name: "Zombies",
    image: "https://image.tmdb.org/t/p/w780/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
    color: "rgba(185, 28, 28, 0.45)",
  },
  {
    id: "coming-of-age",
    name: "Coming of Age",
    image: "https://image.tmdb.org/t/p/w780/hziiv1466EGvvvt5sAYNxmAgu97.jpg",
    color: "rgba(202, 138, 4, 0.45)",
  },
  {
    id: "heists",
    name: "Heists",
    image: "https://image.tmdb.org/t/p/w780/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    color: "rgba(217, 119, 6, 0.45)",
  },
  {
    id: "time-travel",
    name: "Time Travel",
    image: "https://image.tmdb.org/t/p/w780/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg",
    color: "rgba(99, 102, 241, 0.45)",
  },
  {
    id: "true-stories",
    name: "True Stories",
    image: "https://image.tmdb.org/t/p/w780/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg",
    color: "rgba(120, 113, 108, 0.45)",
  },
  {
    id: "superheroes",
    name: "Superheroes",
    image: "https://image.tmdb.org/t/p/w780/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg",
    color: "rgba(220, 38, 38, 0.45)",
  },
  {
    id: "dystopian-futures",
    name: "Dystopian Futures",
    image: "https://image.tmdb.org/t/p/w780/rvtdN5XkWAfGX6xDuPL6yYS2seK.jpg",
    color: "rgba(71, 85, 105, 0.45)",
  },
  {
    id: "road-trips",
    name: "Road Trips",
    image: "https://image.tmdb.org/t/p/w780/5rrGVmRUmiNZ0Y42z26P41y9f9E.jpg",
    color: "rgba(180, 83, 9, 0.45)",
  },
  {
    id: "survival",
    name: "Survival",
    image: "https://image.tmdb.org/t/p/w780/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
    color: "rgba(13, 148, 136, 0.45)",
  },
  {
    id: "post-apocalyptic",
    name: "Post-Apocalyptic",
    image: "https://image.tmdb.org/t/p/w780/mu8LRWT9GHkfiyHm7kgxT6YNvMW.jpg",
    color: "rgba(234, 88, 12, 0.45)",
  },
  {
    id: "martial-arts",
    name: "Martial Arts",
    image: "https://image.tmdb.org/t/p/w780/c15BtJxCXMrISLVmysdsnZUPQft.jpg",
    color: "rgba(185, 28, 28, 0.45)",
  },
  {
    id: "spies",
    name: "Spies",
    image: "https://image.tmdb.org/t/p/w780/p5ozvmdgsmbWe0H8Xk7Rc8SCwAB.jpg",
    color: "rgba(59, 130, 246, 0.45)",
  },
  {
    id: "film-noir",
    name: "Film Noir",
    image: "https://image.tmdb.org/t/p/w780/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg",
    color: "rgba(220, 38, 38, 0.45)",
  },
  {
    id: "musicals",
    name: "Musicals",
    image: "https://image.tmdb.org/t/p/w780/achmETPRJZc9QVXsMPgHwYEyNar.jpg",
    color: "rgba(147, 51, 234, 0.45)",
  },
  {
    id: "sports-stories",
    name: "Sports Stories",
    image: "https://image.tmdb.org/t/p/w780/pcPLnxCThCIo9JFQIMFX4kAE5Yz.jpg",
    color: "rgba(2, 132, 199, 0.45)",
  },
];

interface TopicCardProps {
  topic: TopicItem;
  onSelect: (name: string) => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, onSelect }) => {
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
        className="genre-topic-card"
        onClick={() => onSelect(topic.name)}
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
          src={topic.image}
          alt={topic.name}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://image.tmdb.org/t/p/w780/qmRUwosX4BsCj6QanpBYScLl3Sp.jpg";
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

        {/* Tint Overlay with Darker Bottom for readable text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 45%, transparent 75%), linear-gradient(135deg, ${topic.color} 0%, transparent 60%)`,
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
            {topic.name}
          </span>
        </div>
      </div>
    </div>
  );
};

interface ExploreTopicsShelfProps {
  onSelectTopic: (topicName: string) => void;
}

export const ExploreTopicsShelf: React.FC<ExploreTopicsShelfProps> = ({
  onSelectTopic,
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
      className="explore-topics-shelf-container"
      style={{
        width: "100%",
        padding: "16px 0 28px 0",
        position: "relative",
      }}
    >
      {/* Shelf Header */}
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
            fontSize: "22px",
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-main)",
          }}
        >
          Explore Topics
        </h2>
      </div>

      {/* Scroller Wrapper */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Left Arrow Button */}
        <button
          onClick={scrollLeft}
          title="Scroll Left"
          className="desktop-only"
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

        {/* Horizontal Topic Cards */}
        <div
          ref={scrollRef}
          className="genre-shelf-track"
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
          {TOPIC_ITEMS.map((t) => (
            <TopicCard key={t.id} topic={t} onSelect={onSelectTopic} />
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={scrollRight}
          title="Scroll Right"
          className="desktop-only"
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
