import React, { useState } from "react";
import {
  Play,
  Plus,
  Check,
  ThumbsUp,
  MoreVertical,
  Volume2,
  VolumeX,
  Shuffle,
  Star,
  ExternalLink,
  ChevronLeft,
  Globe,
} from "lucide-react";
import type { CnoMedia, CnoEpisode } from "../types";

interface DetailsViewProps {
  media: CnoMedia;
  onBack: () => void;
  onPlay: (media: CnoMedia, episode?: CnoEpisode) => void;
  onToggleWatchlist: (media: CnoMedia) => void;
  isWatchlisted: boolean;
  onShowToast: (msg: string) => void;
}

export const DetailsView: React.FC<DetailsViewProps> = ({
  media,
  onBack,
  onPlay,
  onToggleWatchlist,
  isWatchlisted,
  onShowToast,
}) => {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [activePhotoTab, setActivePhotoTab] = useState<"stills" | "posters">("stills");
  const [isMuted, setIsMuted] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);

  const isShow = media.type === "show";

  // Heatmap color generator
  const getHeatmapColor = (score: number) => {
    if (score >= 8.5) return "#22c55e"; // green
    if (score >= 8.0) return "#84cc16"; // light green
    if (score >= 7.5) return "#a3e635"; // lime
    if (score >= 7.0) return "#facc15"; // yellow
    if (score >= 6.0) return "#fb923c"; // orange
    return "#f87171"; // red
  };

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    onShowToast("Comment posted");
    setCommentText("");
  };

  return (
    <div className="cno-details-root">
      {/* Top back navigation button */}
      <div style={{ padding: "16px 48px", position: "absolute", top: "70px", left: "0", zIndex: 10 }}>
        <button
          className="cno-btn-circle"
          onClick={onBack}
          title="Back"
          style={{ width: "38px", height: "38px" }}
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Hero Section */}
      <div className="cno-details-hero">
        <div
          className="cno-details-backdrop"
          style={{ backgroundImage: `url(${media.backdrop})` }}
        />
        <div className="cno-details-overlay" />

        <div className="cno-details-hero-grid">
          {/* Left Details Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h1 className="cno-hero-title">{media.title}</h1>

            <div className="cno-hero-meta">
              <span>{media.genres.join(", ")}</span>
              <span>•</span>
              <span>{media.year}</span>
              {media.runtime && (
                <>
                  <span>•</span>
                  <span>{media.runtime}</span>
                </>
              )}
              {media.rating && <span className="cno-badge-r">{media.rating}</span>}
              {media.score && (
                <span className="cno-badge-score">
                  <Star size={13} fill="#eab308" color="#eab308" />
                  {media.score.toFixed(1)}
                </span>
              )}
              {media.likedPercent && (
                <span className="cno-badge-liked">
                  <ThumbsUp size={13} />
                  {media.likedPercent}% liked
                </span>
              )}
            </div>

            <p className="cno-hero-synopsis" style={{ maxWidth: "680px" }}>
              {media.overview}
            </p>

            {/* Actions Bar */}
            <div className="cno-hero-actions">
              <button className="cno-btn-play" onClick={() => onPlay(media)}>
                <Play size={18} fill="#000000" color="#000000" />
                {isShow ? "Play S1 E1" : "Play"}
              </button>

              <button
                className="cno-btn-play"
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  backdropFilter: "blur(10px)",
                }}
                onClick={() => onShowToast("Playing official trailer")}
              >
                <Play size={16} /> Trailer
              </button>



              <button
                className="cno-btn-circle"
                title={isWatchlisted ? "In My List" : "Add to List"}
                onClick={() => onToggleWatchlist(media)}
              >
                {isWatchlisted ? <Check size={18} color="#4ade80" /> : <Plus size={18} />}
              </button>

              <button
                className="cno-btn-circle"
                title="Like"
                onClick={() => onShowToast("Added to Liked")}
              >
                <ThumbsUp size={18} />
              </button>

              <button
                className="cno-btn-circle"
                title="Audio preview toggle"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <button className="cno-btn-circle" title="More options">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* Right Credits Column */}
          <div className="cno-credits-col">
            {media.starring && (
              <div>
                <div className="cno-credits-label">Starring</div>
                <div className="cno-credits-names">{media.starring.join(", ")}</div>
              </div>
            )}
            {media.directors && (
              <div>
                <div className="cno-credits-label">Directors</div>
                <div className="cno-credits-names">{media.directors.join(", ")}</div>
              </div>
            )}
            {media.creators && (
              <div>
                <div className="cno-credits-label">Created by</div>
                <div className="cno-credits-names">{media.creators.join(", ")}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div style={{ padding: "0 48px", display: "flex", flexDirection: "column", gap: "40px", marginTop: "30px" }}>
        {/* TV SHOW: Episodes Section */}
        {isShow && media.episodes && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <h2 style={{ fontSize: "22px", fontWeight: "700" }}>Episodes</h2>
                <div className="cno-nav-pills" style={{ background: "rgba(255, 255, 255, 0.05)" }}>
                  <button
                    className={`cno-nav-pill-btn ${selectedSeason === 1 ? "active" : ""}`}
                    onClick={() => setSelectedSeason(1)}
                  >
                    Season 1
                  </button>
                  <button
                    className={`cno-nav-pill-btn ${selectedSeason === 2 ? "active" : ""}`}
                    onClick={() => setSelectedSeason(2)}
                  >
                    Season 2
                  </button>
                </div>
              </div>

              <button
                className="cno-nav-pill-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                }}
                onClick={() => onShowToast("Shuffling episode...")}
              >
                <Shuffle size={14} /> Shuffle
              </button>
            </div>

            <div style={{ fontSize: "12px", color: "#718096", marginTop: "6px" }}>
              2025 • {media.episodes.length} episodes
            </div>

            {/* 3-Column Episodes Grid */}
            <div className="cno-episodes-grid">
              {media.episodes.map((ep) => (
                <div
                  key={ep.episodeNumber}
                  className="cno-episode-card"
                  onClick={() => onPlay(media, ep)}
                >
                  <div className="cno-episode-thumb-wrap">
                    <img src={ep.thumbnail} alt={ep.title} className="cno-episode-thumb" />
                  </div>
                  <div className="cno-episode-info">
                    <div className="cno-episode-num-label">
                      Episode {ep.episodeNumber} • {ep.runtime}
                    </div>
                    <div className="cno-episode-title">{ep.title}</div>
                    <div className="cno-episode-desc">{ep.overview}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ratings by Episode Heatmap Table */}
            <div style={{ marginTop: "40px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "12px" }}>
                Ratings by Episode
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#718096", paddingLeft: "32px" }}>
                  <span style={{ width: "44px", textAlign: "center" }}>S1</span>
                  <span style={{ width: "44px", textAlign: "center" }}>S2</span>
                </div>
                {[
                  { ep: "E1", s1: 7.9, s2: 7.6 },
                  { ep: "E2", s1: 8.0, s2: 7.6 },
                  { ep: "E3", s1: 8.1, s2: 7.7 },
                  { ep: "E4", s1: 7.9, s2: 7.6 },
                  { ep: "E5", s1: 7.8, s2: 7.5 },
                  { ep: "E6", s1: 7.8, s2: 7.7 },
                  { ep: "E7", s1: 7.9, s2: 7.5 },
                  { ep: "E8", s1: 8.1, s2: 7.4 },
                  { ep: "E9", s1: 7.8, s2: 7.2 },
                  { ep: "E10", s1: 7.9, s2: 7.5 },
                  { ep: "E11", s1: 7.8, s2: 7.6 },
                  { ep: "E12", s1: 8.8, s2: 7.5 },
                  { ep: "E13", s1: 8.8, s2: 8.1 },
                  { ep: "E14", s1: 8.2, s2: 8.1 },
                  { ep: "E15", s1: 7.9, s2: 8.1 },
                ].map((row) => (
                  <div key={row.ep} className="cno-heatmap-row">
                    <span style={{ width: "24px", fontSize: "11px", color: "#718096" }}>{row.ep}</span>
                    <div className="cno-heatmap-cell" style={{ background: getHeatmapColor(row.s1) }}>
                      {row.s1}
                    </div>
                    <div className="cno-heatmap-cell" style={{ background: getHeatmapColor(row.s2) }}>
                      {row.s2}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cast & Crew Avatars Row */}
        {media.starring && (
          <section>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "14px" }}>Cast & Crew</h2>
            <div className="cno-cast-row">
              {media.starring.map((actor, idx) => (
                <div key={idx} className="cno-cast-item">
                  <img
                    src={`https://images.unsplash.com/photo-${1535713875002 + idx * 1000}?w=120&auto=format&fit=crop&q=80`}
                    alt={actor}
                    className="cno-cast-avatar"
                  />
                  <div className="cno-cast-name">{actor}</div>
                  <div className="cno-cast-role">Principal</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photos Tabbed Section */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Photos</h2>
            <div className="cno-nav-pills">
              <button
                className={`cno-nav-pill-btn ${activePhotoTab === "stills" ? "active" : ""}`}
                onClick={() => setActivePhotoTab("stills")}
              >
                Stills
              </button>
              <button
                className={`cno-nav-pill-btn ${activePhotoTab === "posters" ? "active" : ""}`}
                onClick={() => setActivePhotoTab("posters")}
              >
                Posters
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "10px" }}>
            {[1, 2, 3, 4].map((i) => (
              <img
                key={i}
                src={media.backdrop}
                alt="Still"
                style={{
                  width: "280px",
                  aspectRatio: "16/9",
                  borderRadius: "12px",
                  objectFit: "cover",
                }}
              />
            ))}
          </div>
        </section>

        {/* Topics Pill Tags */}
        {media.topics && (
          <section>
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Topics</h2>
            <div className="cno-topics-row">
              {media.topics.map((t, idx) => (
                <span key={idx} className="cno-topic-pill">
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Where to Watch */}
        {media.whereToWatch && (
          <section>
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Where to Watch</h2>
            <div style={{ display: "flex", gap: "24px", marginTop: "12px" }}>
              {media.whereToWatch.stream && (
                <div>
                  <div style={{ fontSize: "12px", color: "#718096", marginBottom: "8px" }}>Stream</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {media.whereToWatch.stream.map((srv, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          background: "#1e293b",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px" }}>
              Availability data synchronized.
            </div>
          </section>
        )}

        {/* Reviews */}
        {media.reviews && (
          <section>
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>
              Reviews ({media.reviews.length})
            </h2>
            <div className="cno-reviews-grid">
              {media.reviews.map((rev, idx) => (
                <div key={idx} className="cno-review-card">
                  <div className="cno-review-header">
                    <div className="cno-review-user">
                      <img src={rev.avatar} alt={rev.user} className="cno-review-avatar" />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600" }}>{rev.user}</div>
                        <div style={{ fontSize: "11px", color: "#718096" }}>{rev.date}</div>
                      </div>
                    </div>
                    <div className="cno-review-score-badge">
                      <Star size={12} fill="#eab308" color="#eab308" />
                      {rev.rating}
                    </div>
                  </div>
                  <p style={{ fontSize: "13.5px", color: "#cbd5e1", lineHeight: "1.5" }}>{rev.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Comments Box */}
        <section>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "14px" }}>Comments</h2>
          <div
            style={{
              background: "rgba(18, 22, 28, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <textarea
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontSize: "14px",
                minHeight: "70px",
                resize: "vertical",
              }}
              placeholder="Add a comment as Harsh..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                paddingTop: "12px",
                marginTop: "10px",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#94a3b8", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                />
                Spoiler
              </label>
              <button
                className="cno-nav-pill-btn active"
                style={{ padding: "6px 20px" }}
                onClick={handlePostComment}
              >
                Post
              </button>
            </div>
          </div>
        </section>

        {/* About Card */}
        {media.about && (
          <section>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "14px" }}>About</h2>
            <div
              style={{
                background: "rgba(18, 22, 28, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "24px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
                  "{media.about.tagline}"
                </h3>
                <p style={{ fontSize: "13.5px", color: "#a0aec0", lineHeight: "1.6" }}>
                  {media.overview}
                </p>
                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  {media.about.imdbId && (
                    <a
                      href={`https://www.imdb.com/title/${media.about.imdbId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="cno-nav-pill-btn"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      IMDb <ExternalLink size={13} />
                    </a>
                  )}
                  {media.about.tmdbId && (
                    <a
                      href={`https://www.themoviedb.org/movie/${media.about.tmdbId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="cno-nav-pill-btn"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      TMDB <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "12.5px" }}>
                <div>
                  <div style={{ color: "#718096" }}>Released</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>{media.about.released}</div>
                </div>
                <div>
                  <div style={{ color: "#718096" }}>Runtime</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>{media.runtime}</div>
                </div>
                <div>
                  <div style={{ color: "#718096" }}>Rated</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>{media.rating}</div>
                </div>
                <div>
                  <div style={{ color: "#718096" }}>Original Language</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>{media.about.language}</div>
                </div>
                <div>
                  <div style={{ color: "#718096" }}>Budget</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>{media.about.budget}</div>
                </div>
                <div>
                  <div style={{ color: "#718096" }}>Box Office</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>{media.about.boxOffice}</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
