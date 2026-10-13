import React from "react";
import { ShadedHeading } from "../common/ShadedHeading";

export interface CreativeCategory {
  id: string;
  name: string;
  backdropImage: string;
  accentColor: string;
  accentGlow: string;
  countBadge: string;
  filterMatch: string[];
}

export const CREATIVE_CATEGORIES: CreativeCategory[] = [
  {
    id: "bollywood",
    name: "Bollywood",
    backdropImage:
      "https://i.pinimg.com/736x/63/f0/90/63f090bfbdaa5867c2395aaac1d62a10.jpg",
    accentColor: "#ff3366",
    accentGlow: "rgba(255, 51, 102, 0.4)",
    countBadge: "Hindi Cinema",
    filterMatch: ["bollywood", "bollywood-movies"],
  },
  {
    id: "hollywood",
    name: "Hollywood",
    backdropImage:
      "https://i.pinimg.com/736x/ad/8b/86/ad8b8621446269c57dbebfbf9e0009ad.jpg",
    accentColor: "#3b82f6",
    accentGlow: "rgba(59, 130, 246, 0.4)",
    countBadge: "English Cinema",
    filterMatch: ["hollywood", "english"],
  },
  {
    id: "tollywood",
    name: "Tollywood",
    backdropImage:
      "https://i.pinimg.com/736x/4b/dd/ed/4bdded71528c3e85dd824133ec23beac.jpg",
    accentColor: "#f59e0b",
    accentGlow: "rgba(245, 158, 11, 0.4)",
    countBadge: "Telugu Cinema",
    filterMatch: ["telugu", "tollywood"],
  },
  {
    id: "kollywood",
    name: "Kollywood",
    backdropImage:
      "https://i.pinimg.com/736x/99/29/27/992927ee26cb576fa828db1157f69782.jpg",
    accentColor: "#ef4444",
    accentGlow: "rgba(239, 68, 68, 0.4)",
    countBadge: "Tamil Cinema",
    filterMatch: ["tamil", "kollywood"],
  },
  {
    id: "mollywood",
    name: "Mollywood",
    backdropImage:
      "https://i.ibb.co/rf3LmMgV/a6ca8eb255b2852a57d7511196ca20e6-1.jpg",
    accentColor: "#10b981",
    accentGlow: "rgba(16, 185, 129, 0.4)",
    countBadge: "Malayalam Cinema",
    filterMatch: ["malayalam", "mollywood"],
  },
  {
    id: "sandalwood",
    name: "Sandalwood",
    backdropImage:
      "https://i.ibb.co/3mLTV8Jd/1282f7d2e181ee9f45064404d211299b.jpg",
    accentColor: "#8b5cf6",
    accentGlow: "rgba(139, 92, 246, 0.4)",
    countBadge: "Kannada Cinema",
    filterMatch: ["kannada", "sandalwood"],
  },
  {
    id: "south-movies",
    name: "South Indian Movies",
    backdropImage:
      "https://i.postimg.cc/y8VsxLg4/839b37b9-78ec-43ef-8876-f70b3d8e5266.jpg",
    accentColor: "#f97316",
    accentGlow: "rgba(249, 115, 22, 0.4)",
    countBadge: "All South Cinema",
    filterMatch: ["south-hindi-movies", "south-movies", "south"],
  },
  {
    id: "web-series",
    name: "Web Series",
    backdropImage:
      "https://i.postimg.cc/PJdxzTVr/784239c2d583ba8bf7cd0d505c073f84.jpg",
    accentColor: "#a855f7",
    accentGlow: "rgba(168, 85, 247, 0.4)",
    countBadge: "Series & Shows",
    filterMatch: ["web-series", "series", "tv"],
  },
  {
    id: "hindi-dubbed",
    name: "Hindi Dubbed",
    backdropImage:
      "https://i.pinimg.com/736x/90/7d/39/907d39a12319a4e4796fce034e1e8fee.jpg",
    accentColor: "#06b6d4",
    accentGlow: "rgba(6, 182, 211, 0.4)",
    countBadge: "Dual Audio",
    filterMatch: ["hindi-dubbed", "dual audio"],
  },
  {
    id: "punjabi",
    name: "Pollywood",
    backdropImage:
      "https://i.pinimg.com/1200x/5a/e3/60/5ae360e6dba1a1c1b4bcabd57c6cd7ba.jpg",
    accentColor: "#eab308",
    accentGlow: "rgba(234, 179, 8, 0.4)",
    countBadge: "Punjabi Cinema",
    filterMatch: ["punjabi", "pollywood"],
  },
  {
    id: "anime",
    name: "Anime",
    backdropImage:
      "https://i.pinimg.com/1200x/10/58/2d/10582d6830ddbe3324d558396b7e1f71.jpg",
    accentColor: "#ec4899",
    accentGlow: "rgba(236, 72, 153, 0.4)",
    countBadge: "Anime & Animation",
    filterMatch: ["anime", "animation"],
  },
  {
    id: "korean",
    name: "K-Drama",
    backdropImage:
      "https://i.pinimg.com/736x/ad/3e/77/ad3e7738bcf5b1087b1149160545c4cf.jpg",
    accentColor: "#14b8a6",
    accentGlow: "rgba(20, 184, 166, 0.4)",
    countBadge: "Korean Drama",
    filterMatch: ["korean", "k-drama"],
  },
  {
    id: "action",
    name: "Action & Thriller",
    backdropImage:
      "https://i.pinimg.com/736x/c2/b9/8b/c2b98ba3090350dd01b181164ac4b7b4.jpg",
    accentColor: "#f43f5e",
    accentGlow: "rgba(244, 63, 94, 0.4)",
    countBadge: "High Octane",
    filterMatch: ["action", "thriller", "triller"],
  },
  {
    id: "comedy",
    name: "Comedy & Family",
    backdropImage:
      "https://i.pinimg.com/1200x/45/be/c6/45bec6aa89095dc31ce4fef10e5b59c4.jpg",
    accentColor: "#eab308",
    accentGlow: "rgba(234, 179, 8, 0.4)",
    countBadge: "Feel Good",
    filterMatch: ["comedy", "family"],
  },
  {
    id: "horror",
    name: "Horror & Mystery",
    backdropImage:
      "https://i.pinimg.com/1200x/0f/30/5c/0f305c84c8ce9258bd2278a2e105fdc6.jpg",
    accentColor: "#8b5cf6",
    accentGlow: "rgba(139, 92, 246, 0.4)",
    countBadge: "Supernatural",
    filterMatch: ["horror", "mystery"],
  },
  {
    id: "sci-fi",
    name: "Sci-Fi & Fantasy",
    backdropImage:
      "https://i.pinimg.com/736x/30/bf/2a/30bf2a1eee3747a3c17d7ccab2c5d5b6.jpg",
    accentColor: "#0ea5e9",
    accentGlow: "rgba(14, 165, 233, 0.4)",
    countBadge: "Futuristic",
    filterMatch: ["sifi", "sci-fi", "fantasy"],
  },
  {
    id: "romance",
    name: "Romance & Drama",
    backdropImage:
      "https://i.postimg.cc/rpBH0pnt/d8d75854-4567-43aa-9c5c-9f84e6d23306.jpg",
    accentColor: "#ec4899",
    accentGlow: "rgba(236, 72, 153, 0.4)",
    countBadge: "Love & Life",
    filterMatch: ["romance", "drama"],
  },
];

export const CREATIVE_INDUSTRIES = CREATIVE_CATEGORIES.slice(0, 12);
export const CREATIVE_GENRES = CREATIVE_CATEGORIES.slice(12);

interface BrowseCategoriesGridProps {
  onSelectCategory: (category: CreativeCategory) => void;
}

export const BrowseCategoriesGrid: React.FC<BrowseCategoriesGridProps> = ({
  onSelectCategory,
}) => {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "36px 24px 80px 24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "4px",
              height: "26px",
              backgroundColor: "#e50914",
              borderRadius: "2px",
            }}
          />
          <div>
            <ShadedHeading
              text="Browse by Category"
              tag="h1"
              style={{
                fontSize: "26px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            />
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "3px 0 0 0" }}>
              Explore handpicked movies and series collections
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "24px",
        }}
      >
        {CREATIVE_CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory(cat)}
            style={{
              height: "155px",
              borderRadius: "16px",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
              backgroundColor: "#0d0d0d",
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.6)",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.45)";
              const img = e.currentTarget.querySelector("img");
              if (img) img.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
              const img = e.currentTarget.querySelector("img");
              if (img) img.style.transform = "scale(1)";
            }}
          >
            {/* Clear Image (Filters Removed for Better Visibility) */}
            <img
              src={cat.backdropImage}
              alt={cat.name}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.4s ease",
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />

            {/* Softer Gradient Overlay (Only darkens the edges where text sits) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.7) 100%)",
              }}
            />

            {/* Foreground Content */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                height: "100%",
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              {/* Header inside Card */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: 600, // Changed from 800 for a more "normal" look
                    color: "#ffffff",
                    margin: 0,
                    textShadow: "0 2px 4px rgba(0, 0, 0, 0.6)", // Softened text shadow
                  }}
                >
                  {cat.name}
                </h3>

                <span
                  style={{
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    textShadow: "0 1px 3px rgba(0, 0, 0, 0.6)",
                    whiteSpace: "nowrap",
                    opacity: 0.9,
                  }}
                >
                  {cat.countBadge}
                </span>
              </div>

              {/* Bottom Action */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  textShadow: "0 1px 3px rgba(0, 0, 0, 0.6)",
                }}
              >
                <span>Explore Collection</span>
                <span
                  style={{
                    display: "inline-block",
                    transition: "transform 0.2s",
                    color: "#ffffff", // Removed category-specific accent color
                  }}
                >
                  &rarr;
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};