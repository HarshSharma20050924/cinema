import React, { useState, useEffect, useMemo } from "react";
import { FilmIcon } from "../../icons";
import { fetchTMDBPersonDetails, type TMDBPersonDetails, type TMDBPersonCreditItem } from "../../api/tmdb";
import { Navbar } from "../layout/Navbar";
import { optimizeImage } from "../../utils/imageOptimizer";
import type { Post, Provider } from "../../types";

interface PersonDetailsModalProps {
  personId: number | null;
  onClose: () => void;
  onSelectMedia: (post: Post) => void;
  activeProviderKey: string;
  activeProvider?: Provider | null;
  providers?: Provider[];
  onSelectProvider?: (provider: Provider) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isGlobalSearch?: boolean;
  onToggleGlobalSearch?: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
  onSelectCategoryNav?: (type: "home" | "movies" | "tv" | "categories") => void;
  activeNavTab?: string;
  onNavigateTab?: (type: "home" | "movies" | "tv" | "categories") => void;
}

// Portrait Media Card matching Home Page MediaCard exactly (Clean 3D tilt, pure artwork, no red border/glow)
const PersonCreditCard: React.FC<{
  item: TMDBPersonCreditItem;
  size?: "large" | "medium";
  showMetaBelow?: boolean;
  onClick: () => void;
}> = ({ item, size = "medium", showMetaBelow = false, onClick }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0, hover: false });

  const isLarge = size === "large";
  const cardWidth = isLarge ? 172 : 138;
  const posterHeight = isLarge ? 258 : 206;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / (rect.height / 2)) * -8,
      y: (x / (rect.width / 2)) * 8,
      hover: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, hover: false });
  };

  const year = item.release_date ? item.release_date.slice(0, 4) : "";
  const posterSrc = item.poster_path ? optimizeImage(item.poster_path, "card") : "";

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${cardWidth}px`,
        flexShrink: 0,
        cursor: "pointer",
        perspective: "1000px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        userSelect: "none",
        zIndex: tilt.hover ? 10 : 1,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${posterHeight}px`,
          borderRadius: "14px",
          overflow: "hidden",
          backgroundColor: "#0c0c0c",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: tilt.hover
            ? "0 22px 44px rgba(0, 0, 0, 0.95)"
            : "0 4px 14px rgba(0, 0, 0, 0.5)",
          transform: tilt.hover
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.035, 1.035, 1.035)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transformStyle: "preserve-3d",
          transition: tilt.hover
            ? "transform 0.08s ease-out, box-shadow 0.25s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease",
        }}
      >
        {posterSrc ? (
          <img
            src={posterSrc}
            alt={item.title}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: tilt.hover
                ? `scale(1.10) translate3d(${tilt.y * -0.5}px, ${tilt.x * 0.5}px, 0px)`
                : "scale(1.0) translate3d(0px, 0px, 0px)",
              transition: tilt.hover ? "transform 0.08s ease-out" : "transform 0.4s ease",
            }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            <FilmIcon size={32} />
          </div>
        )}

        {/* Portrait Card Overlay on Hover (Matching Home MediaCard) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            padding: "16px 14px",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0.92) 100%)",
            opacity: tilt.hover ? 1 : 0,
            transform: tilt.hover ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          {/* Movie Title */}
          <div
            style={{
              fontSize: "14px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.22,
              marginBottom: "4px",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.95)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {item.title}
          </div>

          {/* Year & Character */}
          {(year || item.character) && (
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#cbd5e1",
                letterSpacing: "0.3px",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
              }}
            >
              {year}{year && item.character ? ` • ${item.character}` : (item.character || "")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const PersonDetailsModal: React.FC<PersonDetailsModalProps> = ({
  personId,
  onClose,
  onSelectMedia,
  activeProviderKey,
  activeProvider,
  providers,
  onSelectProvider,
  searchQuery,
  onSearchChange,
  isGlobalSearch,
  onToggleGlobalSearch,
  onOpenSettings,
  onGoHome,
  onSelectCategoryNav,
  activeNavTab,
  onNavigateTab,
}) => {
  const [person, setPerson] = useState<TMDBPersonDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [filmographyFilter, setFilmographyFilter] = useState<"all" | "movie" | "tv">("all");
  const [showAllCredits, setShowAllCredits] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (personId) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [personId]);

  useEffect(() => {
    if (!personId) {
      setPerson(null);
      return;
    }

    setLoading(true);
    let isCurrent = true;

    fetchTMDBPersonDetails(personId)
      .then((data) => {
        if (isCurrent) {
          setPerson(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load person details:", err);
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [personId]);

  if (!personId) return null;

  // Format birth date e.g. "October 8, 1992"
  const formatBirthDateLong = (d?: string | null) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  // Calculate age from birthday
  const calculateAge = (birthday?: string | null, deathday?: string | null) => {
    if (!birthday) return null;
    try {
      const birth = new Date(birthday);
      const end = deathday ? new Date(deathday) : new Date();
      let age = end.getFullYear() - birth.getFullYear();
      const m = end.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
        age--;
      }
      return age > 0 ? age : null;
    } catch {
      return null;
    }
  };

  const age = calculateAge(person?.birthday, person?.deathday);
  const birthDateStr = formatBirthDateLong(person?.birthday);

  // Filter filmography credits
  const filteredCredits = useMemo(() => {
    if (!person?.allCredits) return [];
    if (filmographyFilter === "movie") {
      return person.allCredits.filter((c) => c.media_type === "movie");
    }
    if (filmographyFilter === "tv") {
      return person.allCredits.filter((c) => c.media_type === "tv");
    }
    return person.allCredits;
  }, [person?.allCredits, filmographyFilter]);

  const displayedCredits = showAllCredits ? filteredCredits : filteredCredits.slice(0, 16);

  const handleCardClick = (item: TMDBPersonCreditItem) => {
    onClose();
    onSelectMedia({
      title: item.title,
      link: "",
      image: item.poster_path || "",
      provider: activeProviderKey,
      tmdbId: item.id,
      mediaType: item.media_type,
      year: item.release_date ? item.release_date.slice(0, 4) : undefined,
    } as any);
  };

  // First movie from Known For or Credits (User Request: poster/backdrop of first Known For item as hero background & ambient blur)
  const firstKnownItem = person?.knownFor?.[0] || person?.allCredits?.[0];
  const heroBackdropSrc =
    firstKnownItem?.backdrop_path ||
    firstKnownItem?.poster_path ||
    person?.heroBackdrop ||
    null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#07090e",
        zIndex: 160,
        overflowY: "auto",
        overflowX: "hidden",
        display: "block",
        WebkitOverflowScrolling: "touch",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 0. Ambient Blurred Background (Matches Home slides & DetailsModal) */}
      {heroBackdropSrc && (
        <div
          style={{
            position: "fixed",
            top: "-15%",
            left: "-15%",
            width: "130%",
            height: "130%",
            backgroundImage: `url(${heroBackdropSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center 25%",
            filter: "blur(75px) saturate(2.2) brightness(0.68)",
            transform: "translate3d(0, 0, 0)",
            pointerEvents: "none",
            zIndex: 0,
            opacity: 1,
            transition: "opacity 0.6s ease",
          }}
        />
      )}

      {/* Atmospheric dark gradient so bio, text, and media cards stand out */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(7, 9, 14, 0.45) 0%, rgba(7, 9, 14, 0.65) 35%, rgba(7, 9, 14, 0.88) 75%, #07090e 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* 1. TOP NAVBAR */}
      <Navbar
        providers={providers || (activeProvider ? [activeProvider] : [])}
        activeProvider={activeProvider || null}
        onSelectProvider={(p) => {
          if (onSelectProvider) onSelectProvider(p);
          onClose();
        }}
        searchQuery={searchQuery || ""}
        onSearchChange={(q) => {
          if (onSearchChange) onSearchChange(q);
          if (q) onClose();
        }}
        isGlobalSearch={Boolean(isGlobalSearch)}
        onToggleGlobalSearch={onToggleGlobalSearch || (() => {})}
        onOpenSettings={onOpenSettings || (() => {})}
        onGoHome={() => {
          if (onGoHome) onGoHome();
          onClose();
        }}
        onSelectCategoryNav={(type) => {
          if (onSelectCategoryNav) onSelectCategoryNav(type);
          if (onNavigateTab) onNavigateTab(type);
          onClose();
        }}
        activeNavTab={activeNavTab || "home"}
        isModalNavbar={true}
        onClose={onClose}
      />

      {/* 3. LOADING SPINNER */}
      {loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "55vh",
            gap: "16px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border: "3px solid rgba(255, 255, 255, 0.15)",
              borderTopColor: "#ffffff",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      )}

      {/* Fallback if person details failed to load */}
      {!loading && !person && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "55vh",
            gap: "16px",
            position: "relative",
            zIndex: 1,
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: 700 }}>Unable to load person details</div>
          <button
            onClick={() => {
              setLoading(true);
              fetchTMDBPersonDetails(personId).then((data) => {
                setPerson(data);
                setLoading(false);
              });
            }}
            style={{
              padding: "8px 22px",
              borderRadius: "999px",
              background: "#e50914",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. PERSON BIO HERO (Cinematic Hero Banner with Smooth Bottom Mask Fade - No Divider Line) */}
      {!loading && person && (
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: "440px",
            marginTop: "-72px",
            padding: "115px 48px 40px 48px",
            overflow: "visible",
            backgroundColor: "transparent",
            zIndex: 1,
          }}
        >
          {/* Hero Cinematic Backdrop with Smooth Bottom Mask Fade (Eliminates divider completely) */}
          {heroBackdropSrc && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: "-80px",
                width: "100%",
                zIndex: 1,
                pointerEvents: "none",
                overflow: "hidden",
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, black 45%, rgba(0,0,0,0.5) 75%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, black 0%, black 45%, rgba(0,0,0,0.5) 75%, transparent 100%)",
              }}
            >
              <img
                src={heroBackdropSrc}
                alt={person.name}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 22%",
                  opacity: 0.82,
                  animation: "cinemaHeroKenBurns 25s ease-in-out infinite alternate",
                }}
              />
              {/* Radial vignette backing for crystal text clarity */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(ellipse at 20% 60%, rgba(6, 8, 12, 0.72) 0%, rgba(6, 8, 12, 0.32) 55%, transparent 85%)",
                  pointerEvents: "none",
                }}
              />
              {/* Top Navbar fade */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "72px",
                  background: "linear-gradient(180deg, rgba(6, 8, 12, 0.45) 0%, transparent 100%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}

          {/* Content Row: Headshot + Details */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              maxWidth: "1320px",
              margin: "0 auto",
              display: "flex",
              gap: "36px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* Left Circular Headshot */}
            <div
              style={{
                width: "148px",
                height: "148px",
                flexShrink: 0,
                borderRadius: "50%",
                overflow: "hidden",
                backgroundColor: "#161b26",
                border: "2px solid rgba(255, 255, 255, 0.18)",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9)",
              }}
            >
              {person.profile_path ? (
                <img
                  src={optimizeImage(person.profile_path, "avatar")}
                  alt={person.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  <FilmIcon size={44} />
                </div>
              )}
            </div>

            {/* Right Person Metadata & Bio */}
            <div
              style={{
                flex: 1,
                minWidth: "300px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {/* Department Tag */}
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                }}
              >
                {person.known_for_department || "ACTING"}
              </div>

              {/* Name */}
              <h1
                style={{
                  fontSize: "clamp(28px, 4vw, 42px)",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {person.name}
              </h1>

              {/* Born line with Age */}
              {(birthDateStr || person.place_of_birth) && (
                <div
                  style={{
                    fontSize: "13.5px",
                    color: "#cbd5e1",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    Born {birthDateStr || ""}
                    {person.place_of_birth ? ` in ${person.place_of_birth}` : ""}
                  </span>
                  {age !== null && (
                    <>
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
                      <span>Age {age}</span>
                    </>
                  )}
                </div>
              )}

              {/* Biography with expandable "... More" toggle */}
              {person.biography && (
                <div style={{ marginTop: "6px" }}>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.65,
                      color: "#94a3b8",
                      margin: 0,
                      maxWidth: "880px",
                      display: isBioExpanded ? "block" : "-webkit-box",
                      WebkitLineClamp: isBioExpanded ? "unset" : 3,
                      WebkitBoxOrient: "vertical",
                      overflow: isBioExpanded ? "visible" : "hidden",
                    }}
                  >
                    {person.biography}
                  </p>
                  {person.biography.length > 220 && (
                    <button
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: "4px 0",
                        marginTop: "4px",
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                      }}
                    >
                      {isBioExpanded ? "Less" : "More"}
                    </button>
                  )}
                </div>
              )}

              {/* Translucent Frosted IMDb Button (Screenshot 3: IMDb ↗) */}
              {person.imdb_id && (
                <div style={{ marginTop: "10px" }}>
                  <a
                    href={`https://www.imdb.com/name/${person.imdb_id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      borderRadius: "999px",
                      background: "rgba(255, 255, 255, 0.08)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 700,
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.28)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span>IMDb</span>
                    <span style={{ fontSize: "11px", opacity: 0.8 }}>↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. "KNOWN FOR" SECTION (Pure Portrait Poster Cards matching Screenshot 3) */}
      {!loading && person && person.knownFor && person.knownFor.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "24px 48px 36px 48px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Known For
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              gap: "20px",
              overflowX: "auto",
              paddingBottom: "16px",
              scrollbarWidth: "none",
            }}
          >
            {person.knownFor.map((item, idx) => (
              <PersonCreditCard
                key={`kf-${item.media_type || "m"}-${item.id}-${item.credit_id || idx}`}
                item={item}
                size="large"
                showMetaBelow={false}
                onClick={() => handleCardClick(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 6. "FILMOGRAPHY" SECTION (Portrait Cards with Title & Character/Role underneath) */}
      {!loading && person && person.allCredits && person.allCredits.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "16px 48px 80px 48px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "22px",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#ffffff" }}>
                Filmography
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    marginLeft: "8px",
                  }}
                >
                  {filteredCredits.length}
                </span>
              </h2>
            </div>

            {/* Filter Pills */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(14, 16, 22, 0.75)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                borderRadius: "999px",
                padding: "4px",
              }}
            >
              <button
                onClick={() => {
                  setFilmographyFilter("all");
                  setShowAllCredits(false);
                }}
                style={{
                  background: filmographyFilter === "all" ? "rgba(255, 255, 255, 0.18)" : "transparent",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                All ({person.allCredits.length})
              </button>
              <button
                onClick={() => {
                  setFilmographyFilter("movie");
                  setShowAllCredits(false);
                }}
                style={{
                  background: filmographyFilter === "movie" ? "rgba(255, 255, 255, 0.18)" : "transparent",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Movies ({person.movies.length})
              </button>
              <button
                onClick={() => {
                  setFilmographyFilter("tv");
                  setShowAllCredits(false);
                }}
                style={{
                  background: filmographyFilter === "tv" ? "rgba(255, 255, 255, 0.18)" : "transparent",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                TV Shows ({person.tvShows.length})
              </button>
            </div>
          </div>

          {/* Filmography Responsive Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(138px, 1fr))",
              gap: "20px 16px",
            }}
          >
            {displayedCredits.map((item, idx) => (
              <PersonCreditCard
                key={`filmo-${item.media_type || "m"}-${item.id}-${item.credit_id || idx}`}
                item={item}
                size="medium"
                showMetaBelow={true}
                onClick={() => handleCardClick(item)}
              />
            ))}
          </div>

          {/* "Show All" Expand / Collapse Button */}
          {filteredCredits.length > 16 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "36px",
              }}
            >
              <button
                onClick={() => setShowAllCredits(!showAllCredits)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  borderRadius: "999px",
                  padding: "12px 32px",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.28)";
                  e.currentTarget.style.transform = "scale(1.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {showAllCredits ? "Show Less" : `Show All ${filteredCredits.length}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
