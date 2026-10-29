import React, { useRef, useState } from "react";
import { CINEMA_LANGUAGES, type LanguageItem } from "../../data/languagesData";

interface LanguageCardProps {
  language: LanguageItem;
  onSelect: (language: LanguageItem) => void;
  isSelected?: boolean;
}

const LanguageCard: React.FC<LanguageCardProps> = ({
  language,
  onSelect,
  isSelected,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -9;
    const rotateY = ((x - centerX) / centerX) * 9;
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
        onClick={() => onSelect(language)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          width: "330px",
          height: "205px",
          borderRadius: "16px",
          overflow: "hidden",
          cursor: "pointer",
          background: "#0c0c0c",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.045, 1.045, 1.045)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 22px 44px rgba(0, 0, 0, 0.95), 0 0 24px rgba(229, 9, 20, 0.4)"
            : isSelected
            ? "0 0 0 2px #e50914, 0 8px 24px rgba(229, 9, 20, 0.45)"
            : "0 6px 20px rgba(0, 0, 0, 0.45)",
          border: isSelected ? "2px solid #e50914" : "1px solid rgba(255, 255, 255, 0.12)",
          transition: isHovered
            ? "transform 0.08s ease-out, box-shadow 0.25s ease"
            : "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Background Image with 3D Counter-Parallax Movement */}
        <img
          src={language.image}
          alt={language.name}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://i.pinimg.com/736x/63/f0/90/63f090bfbdaa5867c2395aaac1d62a10.jpg";
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: language.objectPosition || "center center",
            transform: isHovered
              ? `scale(1.10) translate3d(${tilt.y * -0.5}px, ${tilt.x * 0.5}px, 0px)`
              : "scale(1.0) translate3d(0px, 0px, 0px)",
            transition: isHovered
              ? "transform 0.08s ease-out"
              : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />

        {/* Natural Tint Gradient Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.35) 100%), linear-gradient(135deg, ${language.color} 0%, transparent 65%)`,
            pointerEvents: "none",
          }}
        />

        {/* Top Header Row inside Card: Title on Left, Subtitle Badge on Right */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "18px",
            right: "18px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: "20px",
              fontWeight: 900,
              color: "#ffffff",
              fontFamily: "var(--font-main)",
              letterSpacing: "-0.01em",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.95)",
            }}
          >
            {language.name}
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.8)",
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(8px)",
              padding: "3px 9px",
              borderRadius: "999px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              textShadow: "0 1px 4px rgba(0, 0, 0, 0.8)",
            }}
          >
            {language.subtitle}
          </span>
        </div>

        {/* Bottom CTA: Explore Collection -> */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "18px",
            pointerEvents: "none",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: isHovered ? "#e50914" : "rgba(255, 255, 255, 0.85)",
            fontSize: "12.5px",
            fontWeight: 700,
            transition: "color 0.2s ease, transform 0.2s ease",
            transform: isHovered ? "translateX(3px)" : "translateX(0)",
          }}
        >
          <span>Explore Collection</span>
          <span style={{ fontSize: "14px" }}>→</span>
        </div>
      </div>
    </div>
  );
};

interface BrowseByLanguageShelfProps {
  onSelectLanguage: (language: LanguageItem) => void;
  selectedLanguageCode?: string;
}

export const BrowseByLanguageShelf: React.FC<BrowseByLanguageShelfProps> = ({
  onSelectLanguage,
  selectedLanguageCode,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -360, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 360, behavior: "smooth" });
    }
  };

  return (
    <div
      className="browse-language-shelf-container"
      style={{
        width: "100%",
        padding: "16px 0 32px 0",
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
            fontSize: "22px",
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-main)",
          }}
        >
          Browse by Language
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
            width: "40px",
            height: "40px",
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
            transition:
              "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, border-color 0.2s",
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

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            overflowX: "auto",
            scrollBehavior: "smooth",
            padding: "10px 48px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {CINEMA_LANGUAGES.map((lang) => (
            <LanguageCard
              key={lang.code}
              language={lang}
              isSelected={selectedLanguageCode === lang.code}
              onSelect={onSelectLanguage}
            />
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
            width: "40px",
            height: "40px",
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
            transition:
              "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, border-color 0.2s",
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
