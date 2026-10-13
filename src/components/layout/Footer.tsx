import React from "react";
import { GithubIcon, InstagramIcon } from "../../icons";

interface FooterProps {
  onNavigateTab?: (tab: "movies" | "tv" | "categories") => void;
  onExploreNiches?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateTab, onExploreNiches }) => {
  return (
    <footer
      style={{
        width: "100%",
        marginTop: "50px",
        position: "relative",
        zIndex: 10,
        background: "#000000",
        overflow: "hidden",
      }}
    >
      {/* Sleek, Balanced Photo Banner - Perfect Proportional Size */}
      <div
        style={{
          width: "100%",
          minHeight: "clamp(460px, 38vw, 520px)",
          position: "relative",
          backgroundImage: `
            linear-gradient(to bottom, #000000 0%, rgba(0, 0, 0, 0.25) 20%, rgba(0, 0, 0, 0.4) 75%, #000000 100%),
            url("https://i.postimg.cc/13xvsztV/cinema.jpg")
          `,
          backgroundPosition: "center 32%",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "36px 24px 0 24px",
        }}
      >
        {/* Top Fade Gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50px",
            background: "linear-gradient(to bottom, #000000 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Floating Controls & Info directly over artwork */}
        <div
          style={{
            maxWidth: "1200px",
            width: "100%",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            position: "relative",
            zIndex: 3,
          }}
        >
          {/* Navigation Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "28px",
              padding: "4px 8px",
              background: "transparent",
              border: "none",
              boxShadow: "none",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => {
                if (onNavigateTab) onNavigateTab("movies");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                cursor: "pointer",
                textTransform: "uppercase",
                textShadow: "0 0 10px rgba(229, 9, 20, 0.75), 0 0 20px rgba(229, 9, 20, 0.4), 0 2px 6px rgba(0, 0, 0, 0.9)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = "0 0 16px rgba(229, 9, 20, 1), 0 0 30px rgba(255, 50, 70, 0.8)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "0 0 10px rgba(229, 9, 20, 0.75), 0 0 20px rgba(229, 9, 20, 0.4), 0 2px 6px rgba(0, 0, 0, 0.9)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Movies
            </button>

            <button
              onClick={() => {
                if (onNavigateTab) onNavigateTab("tv");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                cursor: "pointer",
                textTransform: "uppercase",
                textShadow: "0 0 10px rgba(229, 9, 20, 0.75), 0 0 20px rgba(229, 9, 20, 0.4), 0 2px 6px rgba(0, 0, 0, 0.9)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = "0 0 16px rgba(229, 9, 20, 1), 0 0 30px rgba(255, 50, 70, 0.8)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "0 0 10px rgba(229, 9, 20, 0.75), 0 0 20px rgba(229, 9, 20, 0.4), 0 2px 6px rgba(0, 0, 0, 0.9)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              TV Shows
            </button>

            <button
              onClick={() => {
                if (onExploreNiches) onExploreNiches();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                cursor: "pointer",
                textTransform: "uppercase",
                textShadow: "0 0 10px rgba(229, 9, 20, 0.75), 0 0 20px rgba(229, 9, 20, 0.4), 0 2px 6px rgba(0, 0, 0, 0.9)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = "0 0 16px rgba(229, 9, 20, 1), 0 0 30px rgba(255, 50, 70, 0.8)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "0 0 10px rgba(229, 9, 20, 0.75), 0 0 20px rgba(229, 9, 20, 0.4), 0 2px 6px rgba(0, 0, 0, 0.9)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Anime
            </button>

            <button
              onClick={() => {
                if (onExploreNiches) onExploreNiches();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                cursor: "pointer",
                textTransform: "uppercase",
                textShadow: "0 0 10px rgba(229, 9, 20, 0.75), 0 0 20px rgba(229, 9, 20, 0.4), 0 2px 6px rgba(0, 0, 0, 0.9)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = "0 0 16px rgba(229, 9, 20, 1), 0 0 30px rgba(255, 50, 70, 0.8)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "0 0 10px rgba(229, 9, 20, 0.75), 0 0 20px rgba(229, 9, 20, 0.4), 0 2px 6px rgba(0, 0, 0, 0.9)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Categories
            </button>
          </div>

          {/* Shaded Red Tagline */}
          <div
            style={{
              fontSize: "clamp(12px, 1.4vw, 15px)",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              background: "linear-gradient(90deg, #d6131e 0%, #ff2040 45%, #ff5266 85%, #ff7888 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 12px rgba(229, 9, 20, 0.55))",
              textAlign: "center",
            }}
          >
            Cinema is cheaper than therapy
          </div>

          {/* Transparent Strip with Original Cinema Logo on left of Harsh Sharma */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              padding: "4px 8px",
              background: "transparent",
              border: "none",
            }}
          >
            {/* Previous Logo + Created by Harsh Sharma */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
              }}
            >
              <img
                src="/logo.png"
                alt="Cinema Logo"
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  objectFit: "cover",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.9)" }}>
                Created by{" "}
                <strong style={{ color: "#ffffff", fontWeight: 700 }}>Harsh</strong>
              </div>
            </div>

            {/* Email & Social Icons */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <a
                href="mailto:harsh20050924@gmail.com"
                style={{
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.8)",
                  textDecoration: "none",
                  fontWeight: 500,
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "rgba(0, 0, 0, 0.45)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  transition: "all 0.2s ease",
                  textShadow: "0 1px 4px rgba(0, 0, 0, 0.8)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.45)";
                }}
              >
                harsh20050924@gmail.com
              </a>

              <a
                href="https://github.com/HarshSharma20050924"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title="GitHub"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.45)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  transition: "all 0.2s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.45)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <GithubIcon size={14} />
              </a>

              <a
                href="https://www.instagram.com/harshsharma200509/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.45)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  transition: "all 0.2s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, rgba(225, 48, 108, 0.5), rgba(131, 58, 180, 0.5))";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.45)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <InstagramIcon size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Compact Typographic Cinema Watermark */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            marginTop: "10px",
            overflow: "hidden",
            userSelect: "none",
            pointerEvents: "none",
            position: "relative",
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: "clamp(68px, 14vw, 175px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 0.85,
              fontFamily: "Inter, Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              background: "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, #e50914 45%, #99000a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "inline-block",
              transform: "translateY(8%)",
              filter: "drop-shadow(0 12px 35px rgba(229, 9, 20, 0.45))",
            }}
          >
            Cinema
          </span>
        </div>
      </div>
    </footer>
  );
};
