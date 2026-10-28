import React, { useState } from "react";

interface FooterProps {
  onNavigateTab?: (tab: "movies" | "tv" | "categories" | "downloads" | "terms" | "privacy" | "disclaimer") => void;
  onExploreNiches?: () => void;
}

const FooterNavButton: React.FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      onClick={() => {
        onClick();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: "none",
        border: "none",
        padding: "6px 14px",
        cursor: "pointer",
        position: "relative",
        outline: "none",
        transition: "transform 0.2s ease",
        transform: isHovered ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      <span
        style={{
          fontSize: "16px",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          textTransform: "none",
          color: isHovered ? "#e50914" : "rgba(255, 255, 255, 0.85)",
          transition: "color 0.2s ease",
          fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif)",
        }}
      >
        {text}
      </span>
    </button>
  );
};

export const Footer: React.FC<FooterProps> = ({ onNavigateTab, onExploreNiches }) => {
  return (
    <footer
      style={{
        width: "100%",
        marginTop: "48px",
        position: "relative",
        zIndex: 10,
        background: "transparent",
        padding: "36px 24px 44px 24px",
        border: "none",
        borderTop: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "28px",
        }}
      >
        {/* Navigation Links in Normal Case & Larger Font */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <FooterNavButton
            text="Movies"
            onClick={() => onNavigateTab && onNavigateTab("movies")}
          />
          <FooterNavButton
            text="TV Shows"
            onClick={() => onNavigateTab && onNavigateTab("tv")}
          />
          <FooterNavButton
            text="Anime"
            onClick={() => onNavigateTab && onNavigateTab("anime")}
          />
          <FooterNavButton
            text="Categories"
            onClick={() => onExploreNiches && onExploreNiches()}
          />
          <FooterNavButton
            text="Downloads"
            onClick={() => onNavigateTab && onNavigateTab("downloads")}
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "clamp(15px, 1.8vw, 18px)",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "none",
            color: "rgba(255, 255, 255, 0.55)",
            textAlign: "center",
          }}
        >
          Cinema is cheaper than therapy
        </div>

        {/* Legal Links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => {
              if (onNavigateTab) onNavigateTab("terms");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              padding: "0",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")}
          >
            Terms of Service
          </button>

          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

          <button
            onClick={() => {
              if (onNavigateTab) onNavigateTab("privacy");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              padding: "0",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")}
          >
            Privacy Policy
          </button>

          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

          <button
            onClick={() => {
              if (onNavigateTab) onNavigateTab("disclaimer");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              padding: "0",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)")}
          >
            DMCA Disclaimer
          </button>
        </div>

        {/* Brand Watermark in Sleek Dark Metallic Gradient */}
        <div
          style={{
            userSelect: "none",
            pointerEvents: "none",
            marginTop: "10px",
          }}
        >
          <span
            style={{
              fontSize: "clamp(48px, 10vw, 110px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              fontFamily: "Inter, Montserrat, -apple-system, BlinkMacSystemFont, sans-serif",
              background: "linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(229, 9, 20, 0.35) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "inline-block",
            }}
          >
            Cinema
          </span>
        </div>
      </div>
    </footer>
  );
};
