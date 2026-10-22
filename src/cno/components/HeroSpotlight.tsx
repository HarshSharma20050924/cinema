import React, { useState, useEffect } from "react";
import { Play, Plus, Check, Info, ChevronLeft, ChevronRight, Star, ThumbsUp } from "lucide-react";
import type { CnoMedia } from "../types";

interface HeroSpotlightProps {
  slides: CnoMedia[];
  onPlay: (media: CnoMedia) => void;
  onOpenDetails: (media: CnoMedia) => void;
  onToggleWatchlist: (media: CnoMedia) => void;
  watchlist: string[];
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  slides,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  watchlist,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [slides.length]);

  if (!slides || slides.length === 0) return null;
  const current = slides[currentIndex];
  const isSaved = watchlist.includes(current.id);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="cno-hero-container">
      {/* Background Image */}
      <div
        className="cno-hero-backdrop"
        style={{ backgroundImage: `url(${current.backdrop})` }}
      />
      {/* Cinematic Gradient Overlays */}
      <div className="cno-hero-overlay" />

      {/* Hero Left Content */}
      <div className="cno-hero-content">
        <h1 className="cno-hero-title">{current.title}</h1>

        <div className="cno-hero-meta">
          <span>{current.genres.join(", ")}</span>
          <span>•</span>
          <span>{current.year}</span>
          {current.runtime && (
            <>
              <span>•</span>
              <span>{current.runtime}</span>
            </>
          )}
          {current.rating && <span className="cno-badge-r">{current.rating}</span>}
          {current.score && (
            <span className="cno-badge-score">
              <Star size={13} fill="#eab308" color="#eab308" />
              {current.score.toFixed(1)}
            </span>
          )}
          {current.likedPercent && (
            <span className="cno-badge-liked">
              <ThumbsUp size={13} />
              {current.likedPercent}% liked
            </span>
          )}
        </div>

        <p className="cno-hero-synopsis">{current.overview}</p>

        <div className="cno-hero-actions">
          <button className="cno-btn-play" onClick={() => onPlay(current)}>
            <Play size={18} fill="#000000" color="#000000" />
            {current.type === "show" ? "Play S1 E1" : "Play"}
          </button>

          <button
            className="cno-btn-circle"
            title={isSaved ? "Remove from List" : "Add to My List"}
            onClick={() => onToggleWatchlist(current)}
          >
            {isSaved ? <Check size={19} color="#4ade80" /> : <Plus size={19} />}
          </button>

          <button
            className="cno-btn-circle"
            title="Details"
            onClick={() => onOpenDetails(current)}
          >
            <Info size={19} />
          </button>
        </div>
      </div>

      {/* Left and Right Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button className="cno-hero-arrow left" onClick={prevSlide} aria-label="Previous slide">
            <ChevronLeft size={22} />
          </button>
          <button className="cno-hero-arrow right" onClick={nextSlide} aria-label="Next slide">
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Bottom Right Pagination Dots */}
      {slides.length > 1 && (
        <div className="cno-hero-dots">
          {slides.map((_, idx) => (
            <button
              key={idx}
              className={`cno-hero-dot ${idx === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
