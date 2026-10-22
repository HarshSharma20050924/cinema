import React from "react";
import { Globe } from "lucide-react";
import { StarIcon, PlayIcon, DownloadIcon, FilmIcon } from "../../icons";

export interface DetailsHeroProps {
  backdropImage: string;
  backdropLoaded: boolean;
  onBackdropLoaded: () => void;
  posterImage: string;
  heroPosterLoaded: boolean;
  onPosterLoaded: () => void;
  displayTitle: string;
  rating: string | null;
  year: string | null;
  runtime: string | null;
  isSeries: boolean;
  seasonNum: string | null;
  genres: string[];
  plot: string;
  hasAnyRealDetails: boolean;
  realRating: string | null;
  imdbUrl: string;
  resolvedImdbId: string | null;
  letterboxd: {
    letterboxdRating: string | null;
    letterboxdUrl: string | null;
  } | null;
  formattedGenres: string | null;
  starsNames: string | null;
  creatorOrDirector: { label: string; value: string } | null;
  episodesCount: number | null;
  realLanguage: string | null;
  realQuality: string | null;
  activeTab: "stream" | "download" | null;
  onToggleTab: (tab: "stream" | "download") => void;
  activeTrailerEmbed: string | null;
  onOpenInWeb?: () => void;
  children?: React.ReactNode;
}

export const DetailsHero: React.FC<DetailsHeroProps> = ({
  backdropImage,
  backdropLoaded,
  onBackdropLoaded,
  posterImage,
  heroPosterLoaded,
  onPosterLoaded,
  displayTitle,
  rating,
  year,
  runtime,
  isSeries,
  seasonNum,
  genres,
  plot,
  hasAnyRealDetails,
  realRating,
  imdbUrl,
  resolvedImdbId,
  letterboxd,
  formattedGenres,
  starsNames,
  creatorOrDirector,
  episodesCount,
  realLanguage,
  realQuality,
  activeTab,
  onToggleTab,
  activeTrailerEmbed,
  onOpenInWeb,
  children,
}) => {
  return (
    <div
      className="details-hero-banner"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "560px",
        display: "flex",
        alignItems: "center",
        padding: "50px 48px",
        overflow: "hidden",
      }}
    >
      {/* Full-bleed cinematic backdrop */}
      {!backdropLoaded && (
        <div
          className="skeleton-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
          }}
        />
      )}
      {backdropImage && (
        <img
          src={backdropImage}
          alt={displayTitle}
          onLoad={onBackdropLoaded}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 20%",
            filter: "brightness(0.85) contrast(1.05)",
            opacity: backdropLoaded ? 1 : 0,
            transition: "opacity 0.4s ease",
            zIndex: 1,
          }}
        />
      )}

      {/* Cinematic Vignette Gradients */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.5) 42%, rgba(0, 0, 0, 0.15) 75%, transparent 100%)",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0, 0, 0, 0.65) 0%, transparent 22%, transparent 60%, rgba(0, 0, 0, 0.7) 82%, #000000 100%)",
          zIndex: 2,
        }}
      />

      {/* Content Container: Floating Poster on Left + Details on Right */}
      <div
        className="details-hero-content"
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: "44px",
          width: "100%",
          maxWidth: "1320px",
          margin: "0 auto",
          flexWrap: "wrap",
        }}
      >
        {/* Floating Poster */}
        <div
          className="details-hero-poster"
          style={{
            width: "270px",
            flexShrink: 0,
            aspectRatio: "2/3",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95)",
            background: "#10141d",
            position: "relative",
          }}
        >
          {!heroPosterLoaded && (
            <div
              className="skeleton-shimmer"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
              }}
            />
          )}
          <img
            src={posterImage}
            alt={displayTitle}
            onLoad={onPosterLoaded}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: heroPosterLoaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
            onError={(e) => {
              onPosterLoaded();
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600";
            }}
          />
        </div>

        {/* Details & Actions */}
        <div
          className="details-hero-meta-col"
          style={{
            flex: 1,
            minWidth: "320px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Title */}
          <h1
            className="details-hero-title"
            style={{
              fontSize: "clamp(32px, 4.5vw, 50px)",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.12,
              letterSpacing: "-0.025em",
              margin: 0,
              textShadow: "0 4px 18px rgba(0,0,0,0.8)",
            }}
          >
            {displayTitle}
          </h1>

          {/* Meta Row: ★ 7.9   2026   2h 25m */}
          <div
            className="details-hero-meta-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "15px",
              fontWeight: 600,
              color: "#cbd5e1",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                color: "#ffd700",
              }}
            >
              <StarIcon size={16} fill="#ffd700" color="#ffd700" />
              <span style={{ fontWeight: 800 }}>{rating}</span>
            </div>

            <span>{year}</span>
            {runtime && <span>{runtime}</span>}
            {isSeries && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "6px",
                  background: "#e50914",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                TV Series
              </span>
            )}
            {seasonNum && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "6px",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                Season {seasonNum}
              </span>
            )}
          </div>

          {/* Genre Pills */}
          {genres.length > 0 && (
            <div className="details-hero-genres" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {genres.map((g, i) => (
                <span
                  key={i}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#f1f5f9",
                    fontSize: "12px",
                    fontWeight: 600,
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis Description */}
          <p
            className="details-hero-synopsis"
            style={{
              fontSize: "14.5px",
              lineHeight: 1.65,
              color: "#94a3b8",
              maxWidth: "760px",
              margin: "4px 0 10px 0",
            }}
          >
            {plot}
          </p>

          {/* Real Metadata Details Info Box (Strictly Authentic) */}
          {hasAnyRealDetails && (
            <div
              style={{
                margin: "10px 0 16px 0",
                padding: "13px 18px",
                borderRadius: "12px",
                background: "rgba(16, 17, 20, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(12px)",
                maxWidth: "760px",
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                fontSize: "13.5px",
                lineHeight: 1.5,
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
              }}
            >
              {/* 1. IMDb Rating */}
              {realRating && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff", minWidth: "115px" }}>
                    IMDb Rating:
                  </span>
                  <a
                    href={imdbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={resolvedImdbId ? "View on IMDb" : "Search on IMDb"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#f5c518",
                      fontWeight: 800,
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                      fontSize: "13.5px",
                    }}
                  >
                    <span
                      style={{
                        background: "#f5c518",
                        color: "#000000",
                        fontWeight: 900,
                        fontSize: "10px",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        textDecoration: "none",
                      }}
                    >
                      IMDb
                    </span>
                    <span>[{realRating}/10]</span>
                    <span style={{ fontSize: "11px" }}>↗</span>
                  </a>
                </div>
              )}

              {/* 1b. Letterboxd Rating */}
              {letterboxd?.letterboxdRating && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff", minWidth: "115px" }}>
                    Letterboxd:
                  </span>
                  <a
                    href={
                      letterboxd.letterboxdUrl ||
                      (resolvedImdbId
                        ? `https://letterboxd.com/imdb/${resolvedImdbId}/`
                        : `https://letterboxd.com/search/${encodeURIComponent(displayTitle)}/`)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on Letterboxd"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#00e054",
                      fontWeight: 800,
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                      fontSize: "13.5px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        background: "#14181c",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        textDecoration: "none",
                      }}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ff8000", display: "inline-block" }} />
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00e054", display: "inline-block" }} />
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#40bcf4", display: "inline-block" }} />
                      <span style={{ fontSize: "10px", fontWeight: 900, color: "#ffffff", marginLeft: "2px" }}>LB</span>
                    </span>
                    <span>[{letterboxd.letterboxdRating}]</span>
                    <span style={{ fontSize: "11px" }}>↗</span>
                  </a>
                </div>
              )}

              {/* 2. Genre */}
              {formattedGenres && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff", minWidth: "115px" }}>
                    Genre:
                  </span>
                  <span style={{ color: "#cbd5e1" }}>{formattedGenres}</span>
                </div>
              )}

              {/* 3. Stars */}
              {starsNames && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff", minWidth: "115px" }}>
                    Stars:
                  </span>
                  <span style={{ color: "#cbd5e1" }}>{starsNames}</span>
                </div>
              )}

              {/* 4. Creator / Director */}
              {creatorOrDirector && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff", minWidth: "115px" }}>
                    {creatorOrDirector.label}:
                  </span>
                  <span style={{ color: "#cbd5e1" }}>{creatorOrDirector.value}</span>
                </div>
              )}

              {/* 5. No. of Episodes */}
              {episodesCount && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff", minWidth: "115px" }}>
                    No. of Episodes:
                  </span>
                  <span style={{ color: "#cbd5e1" }}>{episodesCount}</span>
                </div>
              )}

              {/* 6. Language */}
              {realLanguage && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff", minWidth: "115px" }}>
                    Language:
                  </span>
                  <span style={{ color: "#cbd5e1" }}>{realLanguage}</span>
                </div>
              )}

              {/* 7. Quality */}
              {realQuality && (
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#ffffff", minWidth: "115px" }}>
                    Quality:
                  </span>
                  <span style={{ color: "#cbd5e1" }}>{realQuality}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons: Stream Now & Download */}
          <div className="details-action-buttons-row" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {/* Stream Now - Solid Red Fill */}
            <button
              className="details-action-btn details-stream-btn"
              onClick={() => onToggleTab("stream")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "13px 30px",
                borderRadius: "14px",
                background: activeTab === "stream" ? "#b80710" : "#e50914",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 800,
                cursor: "pointer",
                border: "none",
                boxShadow: "0 8px 26px rgba(229, 9, 20, 0.45)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.background = "#f40612";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = activeTab === "stream" ? "#b80710" : "#e50914";
              }}
            >
              <PlayIcon size={16} fill="#ffffff" color="#ffffff" />
              <span>Stream Now</span>
            </button>

            {/* Download - Solid Blue Fill */}
            <button
              className="details-action-btn details-download-btn"
              onClick={() => onToggleTab("download")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "13px 28px",
                borderRadius: "14px",
                background: activeTab === "download" ? "#1d4ed8" : "#2563eb",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                boxShadow: "0 8px 26px rgba(37, 99, 235, 0.4)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.background = "#1d4ed8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = activeTab === "download" ? "#1d4ed8" : "#2563eb";
              }}
            >
              <DownloadIcon size={16} color="#ffffff" />
              <span>Download</span>
            </button>

            {/* Watch Trailer Button */}
            {activeTrailerEmbed && (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("details-trailer-section");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "13px 24px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "0 4px 18px rgba(0, 0, 0, 0.4)",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                }}
              >
                <FilmIcon size={16} color="#ffffff" />
                <span>Trailer</span>
              </button>
            )}
          </div>

          {/* Dynamic Links Drawer Rendered Here as Children */}
          {children}
        </div>
      </div>
    </div>
  );
};
