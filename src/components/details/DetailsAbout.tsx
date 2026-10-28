import React from "react";
import { ShadedHeading } from "../common/ShadedHeading";
import type { TMDBDetails } from "../../api/tmdb";

export interface DetailsAboutProps {
  tmdb?: TMDBDetails | null;
  displayTitle: string;
  isSeries: boolean;
  plot?: string;
  creatorOrDirector?: { label: string; value: string } | null;
  imdbUrl?: string;
  resolvedImdbId?: string | null;
  runtime?: string | null;
  genres?: string[];
  onSelectPerson?: (personId: number) => void;
}

export const DetailsAbout: React.FC<DetailsAboutProps> = ({
  tmdb,
  displayTitle,
  isSeries,
  plot,
  creatorOrDirector,
  imdbUrl,
  resolvedImdbId,
  runtime,
  genres = [],
  onSelectPerson,
}) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const endsTime = React.useMemo(() => {
    if (!runtime) return null;
    const matchH = runtime.match(/(\d+)\s*h/);
    const matchM = runtime.match(/(\d+)\s*m/);
    const hours = matchH ? parseInt(matchH[1], 10) : 0;
    const mins = matchM ? parseInt(matchM[1], 10) : 0;
    const totalMins = hours * 60 + mins;
    if (totalMins <= 0) return null;
    const now = new Date();
    now.setMinutes(now.getMinutes() + totalMins);
    return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, [runtime]);

  const isIndianMovie = React.useMemo(() => {
    return (
      tmdb?.countries?.some((c) => /india/i.test(c)) ||
      tmdb?.spokenLanguages?.some((l) => /hindi|tamil|telugu|malayalam|kannada|bengali|marathi|punjabi/i.test(l)) ||
      (tmdb as any)?.originCountry?.includes("IN")
    );
  }, [tmdb]);

  const formatCurrency = (amount?: number | null) => {
    if (!amount || amount <= 0) return null;
    if (isIndianMovie) {
      const inr = amount * 86;
      if (inr >= 10000000) {
        const cr = (inr / 10000000).toFixed(inr >= 100000000 ? 0 : 1);
        return `₹${cr} Cr`;
      }
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(inr);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const firstAired = formatDate(tmdb?.firstAirDate);
  const status = tmdb?.status || (isSeries ? "Returning Series" : "Released");
  const contentRating = tmdb?.contentRating || (isSeries ? "TV-14" : "PG-13");
  const networks = tmdb?.networks?.join(", ") || null;
  const studios = tmdb?.studios?.join(", ") || null;
  const countries = tmdb?.countries?.join(", ") || null;
  const originalLanguage = tmdb?.spokenLanguages?.[0] || "English";
  const budget = formatCurrency(tmdb?.budget);
  const revenue = formatCurrency(tmdb?.revenue);

  return (
    <div
      className="details-about-section"
      style={{
        width: "100%",
        padding: "24px 48px 48px 48px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            margin: 0,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          About
        </h2>
      </div>

      {/* Frosted Container Card matching Cno.to Screenshot 7 */}
      <div
        style={{
          background: "rgba(10, 13, 20, 0.38)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          padding: "36px 40px",
          display: "flex",
          gap: "56px",
          flexWrap: "wrap",
          boxShadow: "0 16px 44px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Left Column: Tagline, Overview, Creator, External Buttons */}
        <div
          style={{
            flex: "1 1 440px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {tmdb?.tagline && (
            <div
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              {tmdb.tagline}
            </div>
          )}

          <p
            style={{
              fontSize: "14.5px",
              lineHeight: 1.65,
              color: "#cbd5e1",
              margin: 0,
            }}
          >
            {tmdb?.overview || plot || "No additional description available."}
          </p>

          {(() => {
            const hasCreators = (tmdb?.creatorsList && tmdb.creatorsList.length > 0) || (tmdb?.creators && tmdb.creators.length > 0);
            const label = creatorOrDirector?.label || (hasCreators ? "Creator" : "Director");

            let list: Array<{ id?: number; name: string }> = [];
            if (tmdb?.creatorsList && tmdb.creatorsList.length > 0) {
              list = tmdb.creatorsList;
            } else if (tmdb?.directorsList && tmdb.directorsList.length > 0) {
              list = tmdb.directorsList;
            } else if (tmdb?.creators && tmdb.creators.length > 0) {
              list = tmdb.creators.map((name) => ({ name }));
            } else if (tmdb?.directors && tmdb.directors.length > 0) {
              list = tmdb.directors.map((name) => ({ name }));
            } else if (creatorOrDirector?.value) {
              list = creatorOrDirector.value
                .split(",")
                .map((s) => ({ name: s.trim() }))
                .filter((s) => s.name);
            }

            if (list.length === 0) return null;

            return (
              <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                <span style={{ color: "#ffffff", fontWeight: 700 }}>
                  {label}:{" "}
                </span>
                <span>
                  {list.map((d, idx) => (
                    <span
                      key={d.id || `${d.name}-${idx}`}
                      onClick={() => {
                        if (d.id && onSelectPerson) {
                          onSelectPerson(d.id);
                        }
                      }}
                      style={{
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor: "pointer",
                        textDecoration: "none",
                        transition: "color 0.15s ease, text-decoration 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#e50914";
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#ffffff";
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {d.name}{idx < list.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              </div>
            );
          })()}

          {/* External Links Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
            {/* IMDb Link */}
            {(resolvedImdbId || imdbUrl) && (
              <a
                href={
                  resolvedImdbId
                    ? `https://www.imdb.com/title/${resolvedImdbId}/`
                    : imdbUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f5c518";
                  e.currentTarget.style.borderColor = "#f5c518";
                  e.currentTarget.style.color = "#000000";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                  e.currentTarget.style.color = "#ffffff";
                }}
              >
                <span>IMDb</span>
                <span style={{ fontSize: "11px" }}>↗</span>
              </a>
            )}

            {/* TMDB Link */}
            {tmdb?.id && (
              <a
                href={`https://www.themoviedb.org/${isSeries ? "tv" : "movie"}/${tmdb.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#01b4e4";
                  e.currentTarget.style.borderColor = "#01b4e4";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                  e.currentTarget.style.color = "#ffffff";
                }}
              >
                <span>TMDB</span>
                <span style={{ fontSize: "11px" }}>↗</span>
              </a>
            )}

            {/* Official Site */}
            {tmdb?.homepage && (
              <a
                href={tmdb.homepage}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e50914";
                  e.currentTarget.style.borderColor = "#e50914";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                  e.currentTarget.style.color = "#ffffff";
                }}
              >
                <span>Official Site</span>
                <span style={{ fontSize: "11px" }}>↗</span>
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Technical Metadata 2-column Grid */}
        <div
          style={{
            flex: "1 1 380px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "20px 24px",
            alignContent: "start",
          }}
        >
          {firstAired && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>First Aired</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{firstAired}</div>
            </div>
          )}

          <div>
            <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Status</div>
            <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{status}</div>
          </div>

          {isSeries && tmdb?.seasonsCount && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Seasons</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{tmdb.seasonsCount}</div>
            </div>
          )}

          {isSeries && tmdb?.episodesCount && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Episodes</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{tmdb.episodesCount}</div>
            </div>
          )}

          {runtime && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>{isSeries ? "Episode Length" : "Runtime"}</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>
                {endsTime ? `${runtime} • Ends ${endsTime}` : runtime}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Rated</div>
            <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{contentRating}</div>
          </div>

          {genres.length > 0 && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Genres</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{genres.join(", ")}</div>
            </div>
          )}

          {networks && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Networks</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{networks}</div>
            </div>
          )}

          <div>
            <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Original Language</div>
            <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{originalLanguage}</div>
          </div>

          {countries && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Countries</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{countries}</div>
            </div>
          )}

          {studios && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Studios</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px", lineHeight: 1.4 }}>{studios}</div>
            </div>
          )}

          {budget && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Budget</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{budget}</div>
            </div>
          )}

          {revenue && (
            <div>
              <div style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Revenue</div>
              <div style={{ fontSize: "14px", color: "#ffffff", fontWeight: 700, marginTop: "3px" }}>{revenue}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
