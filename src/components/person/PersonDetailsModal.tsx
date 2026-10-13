import React, { useState, useEffect } from "react";
import { XIcon, FilmIcon, TvIcon } from "../../icons";
import { fetchTMDBPersonDetails, type TMDBPersonDetails } from "../../api/tmdb";
import { Navbar } from "../layout/Navbar";
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

  // Format birth date e.g. "1965-04-04" -> "Apr 4, 1965"
  const formatBirthDate = (d?: string | null) => {
    if (!d) return null;
    try {
      const [year, month, day] = d.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mName = months[parseInt(month, 10) - 1] || month;
      return `${mName} ${parseInt(day, 10)}, ${year}`;
    } catch {
      return d;
    }
  };

  const handleNav = (tab: "home" | "movies" | "tv" | "categories") => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

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
      {/* 1. TOP NAVBAR (Exact match to Home Navbar with Center Links, Search, Extension Selector & Close Button) */}
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

      {/* 2. LOADING SPINNER */}
      {loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "3px solid rgba(229, 9, 20, 0.2)",
              borderTopColor: "#e50914",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      )}

      {/* 3. PERSON BIO HEADER (Exact Screenshot 1 Layout) */}
      {!loading && person && (
        <div
          style={{
            width: "100%",
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "48px 48px 36px 48px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "40px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* Left Profile Photo */}
            <div
              style={{
                width: "160px",
                flexShrink: 0,
                aspectRatio: "2/3",
                borderRadius: "18px",
                overflow: "hidden",
                backgroundColor: "#161b26",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9)",
              }}
            >
              {person.profile_path ? (
                <img
                  src={person.profile_path}
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
                  <FilmIcon size={40} />
                </div>
              )}
            </div>

            {/* Right Person Metadata & Bio */}
            <div style={{ flex: 1, minWidth: "300px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Name with red vertical bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "4px",
                    height: "26px",
                    backgroundColor: "#e50914",
                    borderRadius: "2px",
                  }}
                />
                <h1
                  style={{
                    fontSize: "clamp(26px, 3.5vw, 36px)",
                    fontWeight: 900,
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  {person.name}
                </h1>
              </div>

              {/* Born line */}
              {person.birthday && (
                <div style={{ fontSize: "14px", color: "#cbd5e1", fontWeight: 600 }}>
                  Born: {formatBirthDate(person.birthday)}
                </div>
              )}

              {/* Birthplace */}
              {person.place_of_birth && (
                <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>
                  {person.place_of_birth}
                </div>
              )}

              {/* Biography */}
              {person.biography && (
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.65,
                    color: "#94a3b8",
                    marginTop: "8px",
                    maxWidth: "880px",
                  }}
                >
                  {person.biography}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MOVIES SECTION */}
      {!loading && person && person.movies.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "24px 48px 36px 48px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div
              style={{
                width: "4px",
                height: "20px",
                backgroundColor: "#e50914",
                borderRadius: "2px",
              }}
            />
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              Movies
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              gap: "18px",
              overflowX: "auto",
              paddingBottom: "14px",
              scrollbarWidth: "none",
            }}
          >
            {person.movies.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  onSelectMedia({
                    title: m.title,
                    link: "",
                    image: m.poster_path || "",
                    provider: activeProviderKey,
                  });
                }}
                style={{
                  width: "155px",
                  flexShrink: 0,
                  cursor: "pointer",
                  transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "2/3",
                    borderRadius: "14px",
                    overflow: "hidden",
                    backgroundColor: "#161b26",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7)",
                    marginBottom: "8px",
                  }}
                >
                  <img
                    src={m.poster_path || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400"}
                    alt={m.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#e2e8f0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={m.title}
                >
                  {m.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TV SHOWS SECTION */}
      {!loading && person && person.tvShows.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "16px 48px 80px 48px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div
              style={{
                width: "4px",
                height: "20px",
                backgroundColor: "#e50914",
                borderRadius: "2px",
              }}
            />
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#ffffff" }}>
              TV Shows
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              gap: "18px",
              overflowX: "auto",
              paddingBottom: "14px",
              scrollbarWidth: "none",
            }}
          >
            {person.tvShows.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectMedia({
                    title: t.title,
                    link: "",
                    image: t.poster_path || "",
                    provider: activeProviderKey,
                  });
                }}
                style={{
                  width: "155px",
                  flexShrink: 0,
                  cursor: "pointer",
                  transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "2/3",
                    borderRadius: "14px",
                    overflow: "hidden",
                    backgroundColor: "#161b26",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7)",
                    marginBottom: "8px",
                  }}
                >
                  <img
                    src={t.poster_path || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400"}
                    alt={t.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#e2e8f0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={t.title}
                >
                  {t.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
